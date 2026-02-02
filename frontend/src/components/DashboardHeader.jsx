import { useState } from 'react';
import { Bell, Sun, Moon, Mic, MicOff, Volume2, Loader, Download, FileText, FileSpreadsheet } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import axios from 'axios';
import toast from 'react-hot-toast';

// Inlined voice functions
const speakText = (text) => {
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US";
  speechSynthesis.speak(u);
};

export default function DashboardHeader({ machines, isConnected, alertCount, onAlertsClick, setChat }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const [voiceState, setVoiceState] = useState('idle');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exporting, setExporting] = useState(false);

  const criticalCount = machines.filter(m => m.status === 'Critical').length;
  const warningCount = machines.filter(m => m.status === 'Warning').length;

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

        if (setChat) setChat(prev => [...prev, { question: cmd, answer: null }]);

        try {
          const res = await axios.post('http://127.0.0.1:8000/jarvis/ask', { prompt: cmd }, { timeout: 120000 });
          if (setChat) setChat(prev => prev.map((m, i) => i === prev.length - 1 ? { ...m, answer: res.data.answer } : m));
          setVoiceState('speaking');
          speakText(res.data.answer);
          setTimeout(() => setVoiceState('idle'), 5000);
        } catch {
          if (setChat) setChat(prev => prev.map((m, i) => i === prev.length - 1 ? { ...m, answer: 'Request failed' } : m));
          setVoiceState('idle');
        }
      };
      rec.onerror = () => { rec.stop(); setVoiceState('idle'); toast.error('Mic error'); };
      rec.start();
    }, 600);
  };

  const handleExport = async (type) => {
    setExporting(true);
    setShowExportMenu(false);

    try {
      let url = '';
      let filename = '';

      switch (type) {
        case 'pdf':
          url = 'http://127.0.0.1:8000/reports/summary/pdf';
          filename = `jarvis_report_${new Date().toISOString().slice(0, 10)}.pdf`;
          break;
        case 'maintenance':
          url = 'http://127.0.0.1:8000/reports/maintenance/pdf';
          filename = `maintenance_report_${new Date().toISOString().slice(0, 10)}.pdf`;
          break;
        case 'csv':
          url = 'http://127.0.0.1:8000/reports/history/csv?hours=24';
          filename = `machine_history_${new Date().toISOString().slice(0, 10)}.csv`;
          break;
        default:
          return;
      }

      const response = await axios.get(url, { responseType: 'blob' });

      // Create download link
      const blob = new Blob([response.data], {
        type: type === 'csv' ? 'text/csv' : 'application/pdf'
      });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = filename;
      link.click();

      toast.success(`Downloaded ${filename}`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  const voiceColors = {
    idle: '#3b82f6',
    listening: '#ef4444',
    processing: '#8b5cf6',
    speaking: '#22c55e'
  };

  return (
    <div
      className="rounded-2xl p-5 backdrop-blur-xl border transition-all duration-300"
      style={{
        backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.8)',
        borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
      }}
    >
      <div className="flex items-center justify-between flex-wrap gap-4">
        {/* Title */}
        <div>
          <h1 className="text-2xl font-bold tracking-wide" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
            🤖 Jarvis — AI Command Center
          </h1>
          <p className="text-sm mt-1" style={{ color: isDark ? '#9ca3af' : '#475569' }}>
            {criticalCount > 0
              ? `⚠️ ${criticalCount} critical, ${warningCount} warning`
              : warningCount > 0
                ? `${warningCount} warning alert${warningCount > 1 ? 's' : ''}`
                : '✓ All systems operational'
            }
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          {/* Voice button */}
          <button
            onClick={handleVoice}
            className={`p-3 rounded-xl transition-all hover:scale-105 ${voiceState !== 'idle' ? 'animate-pulse ring-2' : ''}`}
            style={{ backgroundColor: voiceColors[voiceState] }}
            title={voiceState === 'idle' ? 'Click to speak' : voiceState}
          >
            {voiceState === 'idle' && <Mic className="w-5 h-5 text-white" />}
            {voiceState === 'listening' && <MicOff className="w-5 h-5 text-white" />}
            {voiceState === 'processing' && <Loader className="w-5 h-5 text-white animate-spin" />}
            {voiceState === 'speaking' && <Volume2 className="w-5 h-5 text-white" />}
          </button>

          {/* Export dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              disabled={exporting}
              className="p-2.5 rounded-xl transition-all hover:scale-105"
              style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }}
              title="Export reports"
            >
              {exporting ? (
                <Loader className="w-5 h-5 animate-spin" style={{ color: isDark ? '#9ca3af' : '#475569' }} />
              ) : (
                <Download className="w-5 h-5" style={{ color: isDark ? '#9ca3af' : '#475569' }} />
              )}
            </button>

            {showExportMenu && (
              <div
                className="absolute right-0 top-12 rounded-xl shadow-xl border z-50 min-w-48"
                style={{
                  backgroundColor: isDark ? '#1f2937' : '#ffffff',
                  borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                }}
              >
                <button
                  onClick={() => handleExport('pdf')}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-blue-500/10 transition-colors rounded-t-xl"
                  style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                >
                  <FileText className="w-5 h-5 text-red-500" />
                  Summary Report (PDF)
                </button>
                <button
                  onClick={() => handleExport('maintenance')}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-blue-500/10 transition-colors"
                  style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                >
                  <FileText className="w-5 h-5 text-orange-500" />
                  Maintenance Report (PDF)
                </button>
                <button
                  onClick={() => handleExport('csv')}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-blue-500/10 transition-colors rounded-b-xl"
                  style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                >
                  <FileSpreadsheet className="w-5 h-5 text-green-500" />
                  History Data (CSV)
                </button>
              </div>
            )}
          </div>

          {/* Connection status */}
          <div
            className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-full"
            style={{
              backgroundColor: isConnected ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
              color: isConnected ? '#22c55e' : '#ef4444'
            }}
          >
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'animate-pulse' : ''}`}
              style={{ backgroundColor: isConnected ? '#22c55e' : '#ef4444' }} />
            {isConnected ? 'LIVE' : 'OFFLINE'}
          </div>

          {/* Machine count */}
          <div className="text-sm px-3 py-1.5 rounded-full"
            style={{
              backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
              color: isDark ? '#9ca3af' : '#475569'
            }}>
            {machines.length} Machines
          </div>

          {/* Alerts */}
          <button onClick={onAlertsClick}
            className="relative p-2.5 rounded-xl transition-all hover:scale-105"
            style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }}>
            <Bell className="w-5 h-5" style={{ color: isDark ? '#9ca3af' : '#475569' }} />
            {alertCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center
                             text-xs font-bold rounded-full bg-red-500 text-white animate-pulse">
                {alertCount > 9 ? '9+' : alertCount}
              </span>
            )}
          </button>

          {/* Theme toggle */}
          <button onClick={toggleTheme}
            className="p-2.5 rounded-xl transition-all hover:scale-105"
            style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }}>
            {isDark ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-indigo-600" />}
          </button>
        </div>
      </div>
    </div>
  );
}
