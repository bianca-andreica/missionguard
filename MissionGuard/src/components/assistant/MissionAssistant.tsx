import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Bot,
  User,
  Sparkles,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Copy,
  Check,
  ShieldAlert,
} from 'lucide-react';
import { useMission } from '../../context/MissionContext';
import {
  generateRuleBasedResponse,
  AssistantMessage,
} from '../../utils/ruleBasedAssistant';

export const MissionAssistant: React.FC = () => {
  const { anomalies, currentTelemetry, missionStats, selectedAnomaly } = useMission();

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initial welcome message
  const [messages, setMessages] = useState<AssistantMessage[]>(() => {
    const activeCritical = anomalies.filter(
      (a) => a.severity === 'CRITICAL' && a.status === 'ACTIVE'
    );
    const activeWarning = anomalies.filter(
      (a) => a.severity === 'WARNING' && a.status === 'ACTIVE'
    );

    return [
      {
        id: 'init-msg',
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString(),
        text: `### MissionGuard Autonomous Flight Assistant Initialized\n\n` +
          `Spacecraft telemetry audit is synchronized with **AURA-SAT-4** in Low Earth Orbit.\n\n` +
          `**Current Telemetry Summary:**\n` +
          `• **Mission Health:** ${missionStats.healthScore}%\n` +
          `• **Orbit:** Orbit ${missionStats.currentOrbit} (${missionStats.orbitalPhase})\n` +
          `• **Active Anomalies:** ${activeCritical.length} Critical, ${activeWarning.length} Warning\n\n` +
          `Select a quick diagnostic prompt below or ask any telemetry inquiry.`,
        uncertaintyRating: 'LOW',
        suggestedPrompts: [
          'Diagnose active battery temperature surge',
          'Evaluate ADCS angular rate disturbance',
          'Explain solar array power generation curve',
          'Generate contingency procedure for TT&C loss',
        ],
      },
    ];
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // If selectedAnomaly was set from Anomaly Center, auto-suggest prompt
  useEffect(() => {
    if (selectedAnomaly) {
      setInput(`Diagnose anomaly for ${selectedAnomaly.metricName} in ${selectedAnomaly.subsystem}`);
    }
  }, [selectedAnomaly]);

  const handleSend = async (queryText?: string) => {
    const query = queryText || input.trim();
    if (!query || isLoading) return;

    const userMsg: AssistantMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString(),
      text: query,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      // Call server-side proxy endpoint
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          activeAnomalies: anomalies.filter((a) => a.status === 'ACTIVE'),
          missionStats,
          recentTelemetry: currentTelemetry.slice(-10),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.reply) {
          // Live Gemini API response
          const botMsg: AssistantMessage = {
            id: `bot-${Date.now()}`,
            sender: 'assistant',
            timestamp: new Date().toLocaleTimeString(),
            text: data.reply,
            uncertaintyRating: 'MEDIUM',
            suggestedPrompts: [
              'What are the next ground commanding steps?',
              'Inspect related telemetry in Explorer',
              'Run a fault simulation for this scenario',
            ],
          };
          setMessages((prev) => [...prev, botMsg]);
          setIsLoading(false);
          return;
        }
      }
    } catch (err) {
      console.warn('API call failed, using rule-based diagnostic engine fallback:', err);
    }

    // High-fidelity aerospace rule-based fallback
    const fallback = generateRuleBasedResponse(
      query,
      anomalies,
      currentTelemetry,
      missionStats
    );

    const botMsg: AssistantMessage = {
      id: `bot-${Date.now()}`,
      sender: 'assistant',
      timestamp: new Date().toLocaleTimeString(),
      text: fallback.text,
      uncertaintyRating: fallback.uncertaintyRating,
      diagnosticData: fallback.diagnosticData,
      suggestedPrompts: fallback.suggestedPrompts,
    };

    setMessages((prev) => [...prev, botMsg]);
    setIsLoading(false);
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClear = () => {
    setMessages([
      {
        id: `init-${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString(),
        text: 'Telemetry conversation reset. Ready for flight controller queries.',
        uncertaintyRating: 'LOW',
        suggestedPrompts: [
          'Diagnose active battery temperature surge',
          'Evaluate ADCS angular rate disturbance',
          'Review mission health summary',
        ],
      },
    ]);
  };

  return (
    <div className="p-6 max-w-[1400px] mx-auto h-[calc(100vh-140px)] flex flex-col gap-4">
      {/* Assistant Header */}
      <div className="bg-[#0b1328] border border-slate-800 rounded-xl p-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white tracking-tight">
                MissionGuard AI Diagnostics Assistant
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                ENGINE ONLINE
              </span>
            </div>
            <p className="text-xs text-slate-400">
              NASA Space Apps 2026 · Scientific Telemetry Reasoner & Contingency Planner
            </p>
          </div>
        </div>

        <button
          onClick={handleClear}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0e162d] hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-lg text-xs font-medium transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Clear Chat</span>
        </button>
      </div>

      {/* Messages Stream Container */}
      <div className="flex-1 bg-[#0b1328] border border-slate-800 rounded-xl p-6 overflow-y-auto space-y-6">
        {messages.map((msg) => {
          const isBot = msg.sender === 'assistant';

          return (
            <div
              key={msg.id}
              className={`flex gap-3 max-w-4xl ${isBot ? 'mr-auto' : 'ml-auto flex-row-reverse'}`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  isBot
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                {isBot ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
              </div>

              {/* Message Content */}
              <div
                className={`rounded-xl p-4 space-y-3 ${
                  isBot
                    ? 'bg-[#0e162d] border border-slate-800/80 text-slate-200 shadow-sm'
                    : 'bg-cyan-600 text-white shadow-sm'
                }`}
              >
                {/* Meta header */}
                <div className="flex items-center justify-between gap-4 text-[11px] font-mono opacity-75 border-b border-white/10 pb-2">
                  <span className="font-semibold">
                    {isBot ? 'MISSIONGUARD FLIGHT AI' : 'FLIGHT CONTROLLER'}
                  </span>
                  <div className="flex items-center gap-2">
                    {isBot && msg.uncertaintyRating && (
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] border ${
                          msg.uncertaintyRating === 'LOW'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : msg.uncertaintyRating === 'MEDIUM'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        }`}
                      >
                        Uncertainty: {msg.uncertaintyRating}
                      </span>
                    )}
                    <span>{msg.timestamp}</span>
                    {isBot && (
                      <button
                        onClick={() => handleCopy(msg.id, msg.text)}
                        className="hover:text-white p-0.5 rounded transition-colors"
                        title="Copy message"
                      >
                        {copiedId === msg.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 text-slate-400" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Text Body */}
                <div className="text-xs leading-relaxed space-y-2 whitespace-pre-wrap font-sans">
                  {msg.text}
                </div>

                {/* Diagnostic Hypotheses & Contingency Cards (if present) */}
                {msg.diagnosticData && (
                  <div className="pt-2 space-y-3 border-t border-slate-800">
                    <div className="space-y-1.5">
                      <div className="text-[11px] font-bold text-amber-300 uppercase tracking-wide font-mono">
                        Working Hypotheses Breakdown:
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {msg.diagnosticData.hypotheses.map((h, i) => (
                          <div
                            key={i}
                            className="bg-[#0b1328] p-2.5 rounded border border-slate-800 text-[11px] space-y-1"
                          >
                            <div className="font-semibold text-cyan-300 flex justify-between">
                              <span>{h.title}</span>
                              <span className="text-[10px] text-amber-400 font-mono">
                                {h.likelihood}
                              </span>
                            </div>
                            <p className="text-slate-400 text-[10px] leading-tight">
                              {h.rationale}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="text-[11px] font-bold text-cyan-300 uppercase tracking-wide font-mono">
                        Immediate Ground Procedures:
                      </div>
                      <div className="space-y-1 bg-[#0b1328] p-2.5 rounded border border-slate-800 text-[11px]">
                        {msg.diagnosticData.contingencyPlan.map((step, idx) => (
                          <div key={idx} className="flex items-start gap-1.5 text-slate-300">
                            <span className="text-cyan-400 font-mono">{idx + 1}.</span>
                            <span>{step}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Suggested Prompts */}
                {msg.suggestedPrompts && msg.suggestedPrompts.length > 0 && (
                  <div className="pt-3 border-t border-slate-800/80 flex flex-wrap gap-1.5">
                    {msg.suggestedPrompts.map((p, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSend(p)}
                        className="px-2.5 py-1 bg-[#0b1328] hover:bg-cyan-500/10 text-cyan-300 hover:text-cyan-200 border border-slate-800 hover:border-cyan-500/30 rounded text-[11px] font-mono transition-colors text-left"
                      >
                        → {p}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex gap-3 max-w-4xl mr-auto">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 animate-spin" />
            </div>
            <div className="bg-[#0e162d] border border-slate-800 rounded-xl p-4 text-xs text-cyan-300 font-mono flex items-center gap-2">
              <div className="w-3 h-3 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
              <span>Synthesizing multi-subsystem telemetry context & hypotheses...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="bg-[#0b1328] border border-slate-800 rounded-xl p-3 flex items-center gap-3 shrink-0">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask flight controller AI (e.g. 'Explain reaction wheel anomaly', 'Check thermal margin')..."
          className="flex-1 bg-[#0e162d] border border-slate-800 rounded-lg px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
        />
        <button
          onClick={() => handleSend()}
          disabled={!input.trim() || isLoading}
          className="px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold rounded-lg text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <span>Send</span>
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
