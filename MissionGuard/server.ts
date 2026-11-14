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

// NASA PSI Live Catalog Proxy (fetches official psi.nasa.gov investigation metadata)
app.get('/api/nasa/psi/catalog', async (_req, res) => {
  const accessions = ['PSI-100', 'PSI-98', 'PSI-25', 'PSI-10', 'PSI-159'];
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);

    const results = await Promise.all(
      accessions.map(async (acc) => {
        const resp = await fetch(`https://psi.nasa.gov/geode-py/ws/repo/investigations/${acc}`, {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        });
        if (!resp.ok) throw new Error(`PSI API ${acc} returned HTTP ${resp.status}`);
        const raw: any = await resp.json();
        return {
          accession: acc,
          acronym: raw.acronym || acc,
          title: raw.title || acc,
          doi: raw.doi || '',
          licenseName: raw.license?.name || 'Creative Commons Zero v1.0 Universal',
          licenseIdentifier: raw.license?.identifier || 'CC0-1.0',
          managingNasaCenter: raw.managingNasaCenter?.annotationValue || 'Glenn Research Center (GRC)',
          flightProgram: raw.flightProgram?.annotationValue || 'International Space Station (ISS)',
          experimentHardware: raw.experimentHardware || '',
          experimentHardwareLink: raw.experimentHardwareLink || '',
          researchArea: raw.researchArea || 'Combustion Science',
          subResearchArea: raw.subResearchArea || 'Spacecraft Fire Safety',
          investigationStartDate: raw.investigationStartDate || '',
          releaseDate: raw.releaseDate || '',
          objective: raw.objective || '',
          approach: raw.approach || '',
          hypothesis: raw.hypothesis || '',
          researchImpacts: raw.researchImpacts || '',
          contacts: raw.contacts || [],
          publications: raw.publications || [],
          portalUrl: `https://psi.nasa.gov/physci/repo/data/investigations/${acc}`,
          apiUrl: `https://psi.nasa.gov/geode-py/ws/repo/investigations/${acc}`,
          totalFilesCount: Array.isArray(raw.files) ? raw.files.length : 0,
          csvFiles: [],
        };
      })
    );
    clearTimeout(timer);
    return res.json({ source: 'live-nasa-psi', studies: results });
  } catch (err: any) {
    return res.status(502).json({
      error: `Unable to reach live NASA PSI API: ${err?.message || 'Unknown error'}`,
    });
  }
});

// NASA PSI-100 SAFFIRE-III Live CSV Stream Proxy (returns header + active combustion window rows)
app.get('/api/nasa/psi/saffire3', async (_req, res) => {
  const nasaUrl =
    'https://psi.nasa.gov/geode-py/ws/studies/PSI-100/download?file=PSI-100_Raw%20Data_Saffire_Data_Table2017.161.00.42.03-EU.csv';
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 14000);
    const resp = await fetch(nasaUrl, { signal: controller.signal });
    clearTimeout(timer);

    if (!resp.ok) {
      return res.status(502).json({ error: `NASA PSI CSV download returned HTTP ${resp.status}` });
    }

    const fullCsv = await resp.text();
    const lines = fullCsv.split(/\r?\n/);
    if (lines.length < 2) {
      return res.status(502).json({ error: 'NASA PSI CSV response was empty' });
    }

    const header = lines[0];
    const headers = header.split(',').map((h) => h.trim().toLowerCase());
    const relIdx = headers.indexOf('relativeseconds');

    const activeRows = lines.slice(1).filter((line) => {
      if (!line.trim()) return false;
      if (relIdx === -1) return true;
      const cols = line.split(',');
      const relMs = parseFloat(cols[relIdx] || '0');
      return !isNaN(relMs) && relMs >= 5525000;
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    return res.send([header, ...activeRows].join('\n'));
  } catch (err: any) {
    return res.status(502).json({
      error: `Live NASA PSI CSV download failed: ${err?.message || 'Timeout'}`,
    });
  }
});

// AI Telemetry Diagnosis Endpoint (Synthetic Spacecraft Demo)
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
Analyze the following detected spacecraft telemetry anomaly (note: this is synthetic spacecraft demonstration telemetry):

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
        anomaly.suggestedActions.map((a: string) => `• ${a}`).join('\n') +
        `\n\n*Confidence Assessment: Telemetry snapshot is consistent with transient orbital perturbation. Ground station telemetry cross-check recommended.*`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// AI Microgravity Combustion Diagnosis Endpoint (Real NASA PSI-100 SAFFIRE-III)
app.post('/api/ai/diagnose-combustion', async (req, res) => {
  try {
    const { combustionAnomaly, combustionSummary } = req.body;
    if (!combustionAnomaly) {
      return res.status(400).json({ error: 'combustionAnomaly object is required' });
    }

    if (aiClient) {
      try {
        const prompt = `
You are a NASA Microgravity Combustion & Spacecraft Fire Safety Engineer supporting NASA Space Apps Challenge 2026 ("Flame in Freefall").
Analyze this measured event from REAL NASA experimental data (NASA PSI-100, SAFFIRE-III aboard Cygnus OA-7, DOI 10.60555/040q-4h36):

MEASURED NASA EVENT:
- Channel: ${combustionAnomaly.channelName} (${combustionAnomaly.channelKey})
- Elapsed Time: ${combustionAnomaly.elapsedLabel}
- Observed Value: ${combustionAnomaly.observedValue}
- Baseline Context: ${combustionAnomaly.baselineContext}
- Detection Method: ${combustionAnomaly.method}
- Z-Score: ${combustionAnomaly.zScore ?? 'N/A'}
- Measured Fact: ${combustionAnomaly.measuredFact}

EXPERIMENT SUMMARY:
${JSON.stringify(combustionSummary || {}, null, 2)}

Structure your response with these exact Markdown sections:
1. **Measured NASA Observation**: Cite only the exact recorded NASA values and timestamps.
2. **AI-Generated Physical Hypotheses**: Clearly label plausible microgravity combustion mechanisms (buoyancy-free forced convection, soot radiation, aerosol dispersion) as hypotheses, NOT confirmed conclusions.
3. **Spacecraft Fire Safety Implications**: Explain relevance to crewed habitat fire detection, ventilation shutdown, and material flammability screening.
4. **Uncertainty & Sensor Limitations**: Explicitly note missing measurements (e.g., local O2/CO2 gas composition, camera imagery, thermocouple arrays not present in this EU table).
        `;

        const geminiPromise = aiClient.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            systemInstruction:
              'You are MissionGuard Fire Safety AI. Strictly distinguish real NASA experimental measurements from AI-generated hypotheses. Never invent sensor readings or claim unverified causal proof.',
          },
        });

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Gemini API timeout')), 6500)
        );

        const response: any = await Promise.race([geminiPromise, timeoutPromise]);
        return res.json({ source: 'gemini', diagnosis: response.text });
      } catch (geminiError: any) {
        console.warn('Gemini combustion diagnosis fallback:', geminiError?.message);
      }
    }

    return res.json({
      source: 'rule-based-fallback',
      diagnosis:
        `### NASA PSI-100 SAFFIRE-III Fire Safety Briefing: ${combustionAnomaly.channelName}\n\n` +
        `**1. Measured NASA Observation (Real Experimental Data):**\n` +
        `${combustionAnomaly.measuredFact} (Baseline: ${combustionAnomaly.baselineContext}).\n\n` +
        `**2. AI / Engineering Hypotheses (Not Confirmed Root Cause):**\n` +
        (combustionAnomaly.aiHypotheses || []).map((h: string, i: number) => `${i + 1}. ${h}`).join('\n') +
        `\n\n**3. Spacecraft Fire Safety Implications:**\n` +
        (combustionAnomaly.fireSafetyImplications || []).map((s: string) => `• ${s}`).join('\n') +
        `\n\n**4. Uncertainty & Limitations:**\n${combustionAnomaly.uncertaintyNote}`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// AI Mission Assistant Chat Endpoint (Supports both Real NASA PSI-100 Combustion & Synthetic Demo Telemetry)
app.post('/api/ai/chat', async (req, res) => {
  try {
    const {
      message,
      activeAnomalies,
      missionStats,
      recentTelemetry,
      combustionAnomalies,
      combustionSummary,
    } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (aiClient) {
      try {
        const prompt = `
You are MissionGuard AI, assisting flight controllers and microgravity fire-safety researchers for NASA Space Apps Challenge 2026 ("Flame in Freefall: SI-Powered Fire Safety Insights from Microgravity Combustion Data").
The user is asking: "${message}"

=== DATA SOURCE 1: REAL NASA EXPERIMENTAL DATA (PSI-100 SAFFIRE-III, DOI: 10.60555/040q-4h36) ===
Summary Stats: ${JSON.stringify(combustionSummary || {}, null, 2)}
Detected Combustion Events (${(combustionAnomalies || []).length}):
${(combustionAnomalies || [])
  .slice(0, 12)
  .map((c: any) => `- [${c.severity}] t=${c.elapsedLabel} ${c.channelName}: ${c.observedValue} (${c.method}) — ${c.measuredFact}`)
  .join('\n') || 'None loaded'}

=== DATA SOURCE 2: SYNTHETIC SPACECRAFT DEMO DATA (AURA-SAT-4 LEO Simulation) ===
- Health Score: ${missionStats?.healthScore ?? 100}%
- Current Orbit: Orbit ${missionStats?.currentOrbit ?? 1} (${missionStats?.orbitalPhase ?? 'SUNLIGHT'})
- Active Synthetic Anomalies (${activeAnomalies?.length ?? 0}):
${(activeAnomalies || []).map((a: any) => `- [${a.severity}] ${a.subsystem} ${a.metricName}: ${a.observedValue} (MET ${a.metString})`).join('\n') || 'None active'}

LATEST SYNTHETIC TELEMETRY SAMPLES:
${JSON.stringify((recentTelemetry || []).slice(-5), null, 2)}

CRITICAL SCIENTIFIC HONESTY RULES:
1. Always clearly distinguish **Real NASA PSI-100 Experimental Measurements** from **Synthetic AURA-SAT-4 Demo Telemetry** and **AI-Generated Hypotheses**.
2. Never apply spacecraft battery/RSSI thresholds to NASA combustion telemetry, and never present hypotheses as confirmed root causes.
3. Explicitly note uncertainty and sensor limitations when interpreting SAFFIRE-III data.
        `;

        const geminiPromise = aiClient.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            systemInstruction:
              'You are MissionGuard AI for NASA Space Apps Challenge 2026. Deliver rigorous, data-grounded spacecraft and microgravity combustion insights. Never hallucinate sensor channels or invent measurements.',
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
