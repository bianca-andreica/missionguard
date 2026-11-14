import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));

// Initialize GoogleGenAI SDK if key is provided
let aiClient: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  try {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  } catch (err) {
    console.warn('Could not initialize GoogleGenAI client:', err);
  }
}

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'online',
    appName: 'MissionGuard',
    event: 'NASA Space Apps Challenge 2026',
    geminiEnabled: Boolean(aiClient),
    timestamp: new Date().toISOString(),
  });
});

// AI Telemetry Diagnosis Endpoint
app.post('/api/ai/diagnose', async (req, res) => {
  try {
    const { anomaly, contextTelemetry } = req.body;

    if (!anomaly) {
      return res.status(400).json({ error: 'Anomaly object is required' });
    }

    if (aiClient) {
      try {
        const prompt = `
You are the Chief Flight Director and Spacecraft Diagnostics Officer for NASA Space Apps Challenge 2026.
Analyze the following detected spacecraft telemetry anomaly:

ANOMALY DETAILS:
- Subsystem: ${anomaly.subsystem}
- Metric: ${anomaly.metricName} (${anomaly.metricKey})
- Observed Value: ${anomaly.observedValue}
- Nominal Range: ${anomaly.expectedRange ? anomaly.expectedRange.join(' to ') : 'N/A'}
- Severity: ${anomaly.severity}
- Detection Method: ${anomaly.detectionMethod}
- Timestamp: ${anomaly.timestamp} (MET: ${anomaly.metString})
- Z-Score: ${anomaly.zScore || 'N/A'}
- Rate of Change: ${anomaly.rateOfChange || 'N/A'}

TELEMETRY CONTEXT SNAPSHOT:
${JSON.stringify(contextTelemetry || {}, null, 2)}

Provide a flight controller diagnostic briefing in markdown:
1. **Telemetry Anomaly Summary**: State observed deviation objectively.
2. **Scientific Hypotheses**: Provide 2-3 prioritized physical mechanisms (rank by probability, clearly labeled as hypotheses).
3. **Engineering Contingency Procedure**: 3-4 concrete operational steps.
4. **Confidence & Uncertainty**: State telemetry limitations honestly.
Keep the tone professional, concise, and scientifically rigorous.
        `;

        const geminiPromise = aiClient.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            systemInstruction:
              'You are MissionGuard AI, an aerospace systems engineer. Never claim certainty for unverified hypotheses. Adhere strictly to orbital mechanics and satellite power/thermal principles.',
          },
        });

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Gemini API timeout')), 6500)
        );

        const response: any = await Promise.race([geminiPromise, timeoutPromise]);

        return res.json({
          source: 'gemini',
          diagnosis: response.text,
        });
      } catch (geminiError: any) {
        console.warn('Gemini API call timed out or failed, falling back to rule-based engine:', geminiError?.message);
      }
    }

    // Fallback to structured aerospace rule-based output
    return res.json({
      source: 'rule-based-fallback',
      diagnosis: `### Diagnostic Briefing: ${anomaly.metricName} (${anomaly.subsystem})\n\n` +
        `**Observed Reading:** ${anomaly.observedValue} (Nominal Envelope: ${anomaly.expectedRange ? anomaly.expectedRange.join(' - ') : 'Nominal'})\n` +
        `**Severity Level:** ${anomaly.severity} (Triggered via ${anomaly.detectionMethod})\n\n` +
        `**Working Hypotheses:**\n` +
        anomaly.hypotheses.map((h: string, i: number) => `${i + 1}. ${h}`).join('\n') +
        `\n\n**Contingency Flight Procedures:**\n` +
        anomaly.suggestedActions.map((a: string, i: number) => `• ${a}`).join('\n') +
        `\n\n*Confidence Assessment: Telemetry snapshot is consistent with transient orbital perturbation. Ground station telemetry cross-check recommended.*`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// AI Mission Assistant Chat Endpoint
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { message, activeAnomalies, missionStats, recentTelemetry } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (aiClient) {
      try {
        const prompt = `
You are MissionGuard AI, the lead flight dynamics and systems specialist assisting flight operators for NASA Space Apps Challenge 2026.
The user is asking: "${message}"

CURRENT MISSION STATUS:
- Health Score: ${missionStats?.healthScore ?? 100}%
- Current Orbit: Orbit ${missionStats?.currentOrbit ?? 1} (${missionStats?.orbitalPhase ?? 'SUNLIGHT'})
- Active Anomalies (${activeAnomalies?.length ?? 0}):
${(activeAnomalies || []).map((a: any) => `- [${a.severity}] ${a.subsystem} ${a.metricName}: ${a.observedValue} (MET ${a.metString})`).join('\n') || 'None active'}

LATEST TELEMETRY SAMPLES:
${JSON.stringify((recentTelemetry || []).slice(-5), null, 2)}

Respond with aerospace engineering rigor. State possible causes as hypotheses, not confirmed facts. Suggest clear investigation steps. Format with clean Markdown headers and bullet points.
        `;

        const geminiPromise = aiClient.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            systemInstruction:
              'You are MissionGuard AI for NASA Space Apps Challenge 2026. Deliver professional, data-grounded spacecraft engineering insights. Never hallucinate sensor channels not in telemetry.',
          },
        });

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Gemini API timeout')), 6500)
        );

        const response: any = await Promise.race([geminiPromise, timeoutPromise]);

        return res.json({
          source: 'gemini',
          reply: response.text,
        });
      } catch (geminiError: any) {
        console.warn('Gemini chat timed out or failed, using rule-based response:', geminiError?.message);
      }
    }

    // Rule-based fallback response handled directly
    return res.json({
      source: 'rule-based-fallback',
      reply: null, // Signals frontend to invoke high-fidelity local generator
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Setup Vite middleware in development or static serving in production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, () => {
    console.log(`MissionGuard server listening on http://localhost:${port}`);
  });
}

startServer();
