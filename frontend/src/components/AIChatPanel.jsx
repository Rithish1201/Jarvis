import { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Loader2, Volume2, Mic, MicOff } from 'lucide-react';
import { askJarvis } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import toast from 'react-hot-toast';

// Inlined voice functions
const speakText = (text) => {
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US";
  speechSynthesis.speak(u);
};

export default function AIChatPanel({ chat, setChat }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [speakingIndex, setSpeakingIndex] = useState(null);
  const [voiceState, setVoiceState] = useState('idle'); // idle, listening, processing
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    await sendMessage(input.trim());
    setInput('');
  };

  const sendMessage = async (question) => {
    setLoading(true);
    setChat(prev => [...prev, { question, answer: null, isVoice: false }]);

    try {
      const res = await askJarvis(question);
      const answer = res.data.answer;
      setChat(prev => prev.map((m, i) => i === prev.length - 1 ? { ...m, answer } : m));
      speakText(answer); // Auto-speak response
    } catch (error) {
      const errorMsg = 'Sorry, request failed. Try again.';
      setChat(prev => prev.map((m, i) => i === prev.length - 1 ? { ...m, answer: errorMsg } : m));
    } finally {
      setLoading(false);
    }
  };

  const handleVoice = () => {
    if (voiceState !== 'idle') {
      speechSynthesis.cancel();
      setVoiceState('idle');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('Speech not supported. Use Chrome.');
      return;
    }

    setVoiceState('listening');
    speakText("Listening");

    setTimeout(() => {
      const rec = new SpeechRecognition();
      rec.lang = "en-US";
      rec.onresult = async (e) => {
        const cmd = e.results[0][0].transcript;
        rec.stop();
        setVoiceState('processing');
        toast.success(`Heard: "${cmd}"`);

        setChat(prev => [...prev, { question: cmd, answer: null, isVoice: true }]);

        try {
          const res = await askJarvis(cmd);
          const answer = res.data.answer;
          setChat(prev => prev.map((m, i) => i === prev.length - 1 ? { ...m, answer } : m));
          speakText(answer);
        } catch {
          setChat(prev => prev.map((m, i) => i === prev.length - 1 ? { ...m, answer: 'Request failed' } : m));
        } finally {
          setVoiceState('idle');
        }
      };
      rec.onerror = () => { rec.stop(); setVoiceState('idle'); };
      rec.start();
    }, 600);
  };

  const handleSpeak = (text, index) => {
    setSpeakingIndex(index);
    speakText(text);
    setTimeout(() => setSpeakingIndex(null), 5000);
  };

  const voiceColors = { idle: '#3b82f6', listening: '#ef4444', processing: '#8b5cf6' };

  return (
    <div
      className="rounded-2xl p-5 h-[500px] flex flex-col border backdrop-blur-xl"
      style={{
        backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.8)',
        borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
      }}
    >
      {/* Header with Mic */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(59,130,246,0.2)' }}>
            <Bot className="w-5 h-5 text-blue-500" />
          </div>
          <h3 className="font-semibold text-lg" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
            Jarvis AI
          </h3>
        </div>

        {/* Mic button in header */}
        <button
          onClick={handleVoice}
          className={`p-2.5 rounded-xl transition-all hover:scale-105 ${voiceState !== 'idle' ? 'animate-pulse' : ''}`}
          style={{ backgroundColor: voiceColors[voiceState] }}
          title={voiceState === 'idle' ? 'Click to speak' : voiceState}
        >
          {voiceState === 'listening' ? (
            <MicOff className="w-5 h-5 text-white" />
          ) : voiceState === 'processing' ? (
            <Loader2 className="w-5 h-5 text-white animate-spin" />
          ) : (
            <Mic className="w-5 h-5 text-white" />
          )}
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {chat.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center" style={{ color: isDark ? '#6b7280' : '#94a3b8' }}>
            <Bot className="w-12 h-12 mb-3 opacity-50" />
            <p className="text-center text-sm">
              Ask Jarvis about your factory...<br />
              <span className="text-xs">Try: "How is MILL-01?"</span>
            </p>
            <p className="text-xs mt-3 opacity-70">🎤 Click mic above or type below</p>
          </div>
        ) : (
          chat.map((m, i) => (
            <div key={i} className="space-y-3 animate-fade-in">
              {/* User message */}
              <div className="flex items-start gap-2">
                <div className="p-1.5 rounded-lg shrink-0" style={{ backgroundColor: 'rgba(59,130,246,0.2)' }}>
                  {m.isVoice ? <Mic className="w-4 h-4 text-blue-400" /> : <User className="w-4 h-4 text-blue-400" />}
                </div>
                <div className="flex-1 rounded-lg rounded-tl-none p-3" style={{ backgroundColor: 'rgba(59,130,246,0.1)' }}>
                  <p className="text-sm" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                    {m.isVoice && <span className="text-xs opacity-60 mr-1">🎤</span>}
                    {m.question}
                  </p>
                </div>
              </div>

              {/* Jarvis response */}
              <div className="flex items-start gap-2">
                <div className="p-1.5 rounded-lg shrink-0" style={{ backgroundColor: 'rgba(34,197,94,0.2)' }}>
                  <Bot className="w-4 h-4 text-green-400" />
                </div>
                <div className="flex-1 rounded-lg rounded-tl-none p-3 relative group" style={{ backgroundColor: 'rgba(34,197,94,0.1)' }}>
                  {m.answer ? (
                    <>
                      <p className="text-sm whitespace-pre-wrap pr-8" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                        {m.answer}
                      </p>
                      <button
                        onClick={() => handleSpeak(m.answer, i)}
                        className={`absolute top-2 right-2 p-1.5 rounded-lg transition-all
                          ${speakingIndex === i ? 'bg-green-500 text-white' : 'opacity-0 group-hover:opacity-100 bg-green-500/20 text-green-500'}`}
                        title="Speak"
                      >
                        <Volume2 className={`w-4 h-4 ${speakingIndex === i ? 'animate-pulse' : ''}`} />
                      </button>
                    </>
                  ) : (
                    <div className="flex items-center gap-2 text-sm" style={{ color: isDark ? '#6b7280' : '#94a3b8' }}>
                      <Loader2 className="w-4 h-4 animate-spin text-green-500" />
                      Processing...
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input with Mic */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={loading ? "Waiting..." : "Type or click 🎤"}
          className="flex-1 px-4 py-2.5 rounded-lg border transition-colors outline-none"
          style={{
            backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.03)',
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
            color: isDark ? '#ffffff' : '#0f172a',
          }}
          disabled={loading || voiceState !== 'idle'}
        />

        {/* Mic button next to input */}
        <button
          type="button"
          onClick={handleVoice}
          disabled={loading}
          className={`p-2.5 rounded-lg transition-all ${voiceState !== 'idle' ? 'animate-pulse' : ''}`}
          style={{ backgroundColor: voiceColors[voiceState] }}
        >
          {voiceState === 'listening' ? (
            <MicOff className="w-5 h-5 text-white" />
          ) : (
            <Mic className="w-5 h-5 text-white" />
          )}
        </button>

        <button
          type="submit"
          disabled={loading || !input.trim() || voiceState !== 'idle'}
          className="p-2.5 rounded-lg bg-blue-500 text-white hover:bg-blue-600 
                   disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
        </button>
      </form>
    </div>
  );
}
