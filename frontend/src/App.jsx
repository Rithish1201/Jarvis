import { useState, useEffect, useRef } from "react";
import { Toaster, toast } from 'react-hot-toast';
import { useWebSocket } from "./hooks/useWebSocket";
import { useNotifications, useInstallPrompt } from "./hooks/useNotifications";
import { getAlerts, askJarvis, getMachineHistory } from "./services/api";
import AnalyticsDashboard from "./AnalyticsDashboard";
import Factory3D from "./Factory3D";
import SimulationPanel from "./SimulationPanel";
import MaintenancePanel from "./MaintenancePanel";
import IoTPanel from "./IoTPanel";
import CommandCenter from "./CommandCenter";
import LeaderboardPanel from "./LeaderboardPanel";
import HandoverPanel from "./HandoverPanel";
import CommissioningPanel from "./CommissioningPanel";
import "./index.css";

const API_BASE = 'http://127.0.0.1:8000';

// Audio Context for sound effects
let audioCtx = null;
const getAudioContext = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
};

// Generate beep sound
const playBeep = (frequency = 800, duration = 0.1, type = 'sine') => {
  try {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = type;
    gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  } catch (e) {
    console.log('Audio not available');
  }
};

// Sound effects
const sounds = {
  click: () => playBeep(1200, 0.05, 'sine'),
  success: () => {
    playBeep(523, 0.1);
    setTimeout(() => playBeep(659, 0.1), 100);
    setTimeout(() => playBeep(784, 0.15), 200);
  },
  warning: () => {
    playBeep(400, 0.2, 'square');
    setTimeout(() => playBeep(300, 0.3, 'square'), 200);
  },
  startup: () => {
    playBeep(200, 0.1);
    setTimeout(() => playBeep(400, 0.1), 100);
    setTimeout(() => playBeep(600, 0.1), 200);
    setTimeout(() => playBeep(800, 0.2), 300);
  },
  listening: () => playBeep(1000, 0.15, 'sine'),
  processing: () => {
    playBeep(600, 0.1);
    setTimeout(() => playBeep(800, 0.1), 150);
  }
};

// Multi-language voice function
let currentLanguage = 'en'; // 'en', 'ta', 'tanglish'

const setLanguage = (lang) => {
  currentLanguage = lang;
};

const speak = (text, onEnd = null, forceLang = null) => {
  if ('speechSynthesis' in window) {
    speechSynthesis.cancel();
    const lang = forceLang || currentLanguage;
    const u = new SpeechSynthesisUtterance(text);

    const voices = speechSynthesis.getVoices();

    if (lang === 'ta') {
      // Tamil voice - improved settings for clarity
      u.lang = 'ta-IN';
      u.rate = 0.8; // Slower for clarity
      u.pitch = 1.1;
      u.volume = 1.0;
      // Prefer Google Tamil voice for better quality
      const tamilVoice = voices.find(v =>
        v.name.includes('Google') && v.lang.startsWith('ta')
      ) || voices.find(v =>
        v.name.includes('Tamil') || v.lang === 'ta-IN' || v.lang.startsWith('ta')
      );
      if (tamilVoice) u.voice = tamilVoice;
    } else if (lang === 'tanglish') {
      // Tanglish - use Indian English voice for better pronunciation
      u.lang = 'en-IN';
      u.rate = 0.95;
      u.pitch = 1.0;
      const indianVoice = voices.find(v =>
        v.lang === 'en-IN' ||
        v.name.includes('India') ||
        v.name.includes('Ravi')
      ) || voices.find(v => v.lang.startsWith('en'));
      if (indianVoice) u.voice = indianVoice;
    } else {
      // English
      u.lang = 'en-US';
      u.rate = 1.0;
      u.pitch = 0.9;
      const englishVoice = voices.find(v =>
        v.name.includes('Google UK English Male') ||
        v.name.includes('Daniel') ||
        v.name.includes('Microsoft David') ||
        v.lang === 'en-GB'
      ) || voices.find(v => v.lang.startsWith('en'));
      if (englishVoice) u.voice = englishVoice;
    }

    if (onEnd) u.onend = onEnd;
    speechSynthesis.speak(u);
  }
};

// UI translations for all languages
const translations = {
  en: {
    startup: ["Initializing systems...", "Loading neural networks...", "Connecting to factory sensors...", "All systems online."],
    hello: "Hey buddy! I'm Jarvis, your AI factory assistant. How can I help you today?",
    listening: "Listening",
    clickToStart: "Click anywhere to start",
    clickToActivate: "CLICK TO ACTIVATE",
    dashboard: "DASHBOARD",
    subtitle: "FUTURISTIC HUD in jarvis style",
    healthy: "HEALTHY",
    warning: "WARNING",
    critical: "CRITICAL",
    online: "ONLINE",
    offline: "OFFLINE",
    hud: "HUD",
    machines: "MACHINES",
    alerts: "ALERTS",
    quickCommands: "QUICK COMMANDS",
    export: "EXPORT",
    temp: "TEMP",
    health: "HEALTH",
    vibration: "VIBRATION",
    units: "UNITS",
    clickToSpeak: "CLICK TO SPEAK",
    awaitingVoice: "AWAITING VOICE COMMAND...",
    processing: "Processing...",
    allSystemsNormal: "All systems normal",
    error: "Error: Could not get response",
    keyboard: "Keyboard: V=Voice H=HUD M=Machines A=Alerts S=Sound F=Fullscreen",
    back: "BACK",
    commands: {
      showMachines: "Show all machines",
      temperature: "What's the temperature?",
      criticalAlerts: "Any critical alerts?",
      systemStatus: "System status",
      generateReport: "Generate report",
      predictMaintenance: "Predict maintenance"
    }
  },
  ta: {
    startup: ["கணினிகளை துவக்குகிறது...", "நரம்பு வலையமைப்புகளை ஏற்றுகிறது...", "தொழிற்சாலை சென்சார்களை இணைக்கிறது...", "அனைத்து அமைப்புகளும் ஆன்லைன்."],
    hello: "வணக்கம் நண்பா! நான் ஜார்விஸ், உங்கள் AI தொழிற்சாலை உதவியாளர். நான் உங்களுக்கு எப்படி உதவ முடியும்?",
    listening: "கேட்கிறேன்",
    clickToStart: "தொடங்க எங்கும் கிளிக் செய்யவும்",
    clickToActivate: "செயல்படுத்த கிளிக் செய்க",
    dashboard: "டாஷ்போர்டு",
    subtitle: "எதிர்கால HUD ஜார்விஸ் பாணியில்",
    healthy: "ஆரோக்கியம்",
    warning: "எச்சரிக்கை",
    critical: "அவசரம்",
    online: "ஆன்லைன்",
    offline: "ஆஃப்லைன்",
    hud: "HUD",
    machines: "இயந்திரங்கள்",
    alerts: "எச்சரிக்கைகள்",
    quickCommands: "விரைவு கட்டளைகள்",
    export: "ஏற்றுமதி",
    temp: "வெப்பநிலை",
    health: "ஆரோக்கியம்",
    vibration: "அதிர்வு",
    units: "அலகுகள்",
    clickToSpeak: "பேச கிளிக் செய்க",
    awaitingVoice: "குரல் கட்டளைக்காக காத்திருக்கிறது...",
    processing: "செயலாக்குகிறது...",
    allSystemsNormal: "அனைத்து அமைப்புகளும் சரி",
    error: "பிழை: பதில் பெற முடியவில்லை",
    keyboard: "விசைப்பலகை: V=குரல் H=HUD M=இயந்திரங்கள் A=எச்சரிக்கை S=ஒலி F=முழுத்திரை",
    back: "பின்",
    commands: {
      showMachines: "அனைத்து இயந்திரங்களையும் காட்டு",
      temperature: "வெப்பநிலை என்ன?",
      criticalAlerts: "அவசர எச்சரிக்கைகள் உள்ளதா?",
      systemStatus: "அமைப்பு நிலை",
      generateReport: "அறிக்கை உருவாக்கு",
      predictMaintenance: "பராமரிப்பை கணிக்கவும்"
    }
  },
  tanglish: {
    startup: ["Systems-a initialize pannuren...", "Neural networks load aagudhu...", "Factory sensors connect aagudhu...", "Ellaa systems-um online."],
    hello: "Hey nanba! Naan Jarvis, unga AI factory assistant. Inniki enakku enna help vennum?",
    listening: "Kekkuren",
    clickToStart: "Start panna enga vena click pannunga",
    clickToActivate: "ACTIVATE PANNA CLICK PANNUNGA",
    dashboard: "DASHBOARD",
    subtitle: "FUTURISTIC HUD jarvis style-la",
    healthy: "HEALTHY",
    warning: "WARNING",
    critical: "CRITICAL",
    online: "ONLINE",
    offline: "OFFLINE",
    hud: "HUD",
    machines: "MACHINES",
    alerts: "ALERTS",
    quickCommands: "QUICK COMMANDS",
    export: "EXPORT",
    temp: "TEMP",
    health: "HEALTH",
    vibration: "VIBRATION",
    units: "UNITS",
    clickToSpeak: "SPEAK PANNA CLICK PANNUNGA",
    awaitingVoice: "VOICE COMMAND-KU WAIT PANNUREN...",
    processing: "Process aagudhu...",
    allSystemsNormal: "Ellaa systems-um OK",
    error: "Error: Response varale",
    keyboard: "Keyboard: V=Voice H=HUD M=Machines A=Alerts S=Sound F=Fullscreen",
    back: "BACK",
    commands: {
      showMachines: "Ellaa machines-um kaattu",
      temperature: "Temperature enna?",
      criticalAlerts: "Critical alerts irukkaa?",
      systemStatus: "System status enna?",
      generateReport: "Report generate pannu",
      predictMaintenance: "Maintenance predict pannu"
    }
  }
};

// For backward compatibility
const greetings = translations;


// Techy Animated Background
function FloatingBackground() {
  const techColors = ['#00f0ff', '#00ff88', '#ff00ff', '#ffaa00'];

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      overflow: 'hidden',
      pointerEvents: 'none',
      zIndex: 0
    }}>
      {/* Circuit Board Pattern */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.15 }}>
        <defs>
          <pattern id="circuit" width="100" height="100" patternUnits="userSpaceOnUse">
            <path d="M 0 50 H 30 V 30 H 50 V 0" fill="none" stroke="#00f0ff" strokeWidth="0.5" />
            <path d="M 100 50 H 70 V 70 H 50 V 100" fill="none" stroke="#00f0ff" strokeWidth="0.5" />
            <circle cx="30" cy="50" r="2" fill="#00f0ff" />
            <circle cx="50" cy="30" r="2" fill="#00f0ff" />
            <circle cx="70" cy="50" r="2" fill="#00f0ff" />
            <circle cx="50" cy="70" r="2" fill="#00f0ff" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#circuit)" />
      </svg>

      {/* Data Stream Lines - Vertical */}
      {[...Array(12)].map((_, i) => (
        <div
          key={`stream-${i}`}
          style={{
            position: 'absolute',
            left: `${8 + i * 8}%`,
            top: 0,
            width: '1px',
            height: '100%',
            background: `linear-gradient(180deg, transparent 0%, ${techColors[i % 4]}40 50%, transparent 100%)`,
            animation: `dataStream ${3 + Math.random() * 4}s linear infinite`,
            animationDelay: `${-Math.random() * 5}s`
          }}
        />
      ))}

      {/* Binary/Hex Data Rain */}
      {[...Array(15)].map((_, i) => (
        <div
          key={`binary-${i}`}
          style={{
            position: 'absolute',
            left: `${Math.random() * 100}%`,
            top: '-50px',
            fontFamily: 'monospace',
            fontSize: '10px',
            color: '#00f0ff',
            opacity: 0.3,
            animation: `dataRain ${8 + Math.random() * 10}s linear infinite`,
            animationDelay: `${-Math.random() * 10}s`,
            whiteSpace: 'nowrap',
            writingMode: 'vertical-rl'
          }}
        >
          {Array(20).fill(0).map(() => Math.random() > 0.5 ? '1' : '0').join('')}
        </div>
      ))}

      {/* Glowing Tech Nodes */}
      {[...Array(8)].map((_, i) => {
        const x = 10 + (i % 4) * 25;
        const y = 20 + Math.floor(i / 4) * 60;
        return (
          <div
            key={`node-${i}`}
            style={{
              position: 'absolute',
              left: `${x}%`,
              top: `${y}%`,
              width: '10px',
              height: '10px',
              backgroundColor: techColors[i % 4],
              borderRadius: '50%',
              boxShadow: `0 0 30px ${techColors[i % 4]}, 0 0 60px ${techColors[i % 4]}`,
              animation: `nodePulse ${2 + Math.random()}s ease-in-out infinite`,
              animationDelay: `${i * 0.3}s`
            }}
          />
        );
      })}

      {/* Connection Lines between nodes */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.25 }}>
        <line x1="10%" y1="20%" x2="35%" y2="20%" stroke="#00f0ff" strokeWidth="1" strokeDasharray="5,5">
          <animate attributeName="stroke-dashoffset" from="0" to="10" dur="1s" repeatCount="indefinite" />
        </line>
        <line x1="35%" y1="20%" x2="60%" y2="80%" stroke="#00ff88" strokeWidth="1" strokeDasharray="5,5">
          <animate attributeName="stroke-dashoffset" from="0" to="10" dur="1.5s" repeatCount="indefinite" />
        </line>
        <line x1="60%" y1="80%" x2="85%" y2="80%" stroke="#ff00ff" strokeWidth="1" strokeDasharray="5,5">
          <animate attributeName="stroke-dashoffset" from="0" to="10" dur="2s" repeatCount="indefinite" />
        </line>
      </svg>

      {/* Scanning Radar Effect */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: '600px',
        height: '600px',
        marginLeft: '-300px',
        marginTop: '-300px',
        borderRadius: '50%',
        border: '1px solid rgba(0,240,255,0.1)',
        opacity: 0.5
      }}>
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: '50%',
          height: '2px',
          background: 'linear-gradient(90deg, #00f0ff, transparent)',
          transformOrigin: 'left center',
          animation: 'radarSweep 6s linear infinite'
        }} />
      </div>

      {/* Tech Corner Brackets */}
      {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map(pos => {
        const isTop = pos.includes('top');
        const isLeft = pos.includes('left');
        return (
          <div
            key={pos}
            style={{
              position: 'absolute',
              [isTop ? 'top' : 'bottom']: '20px',
              [isLeft ? 'left' : 'right']: '20px',
              width: '80px',
              height: '80px',
              borderTop: isTop ? '2px solid #00f0ff' : 'none',
              borderBottom: !isTop ? '2px solid #00f0ff' : 'none',
              borderLeft: isLeft ? '2px solid #00f0ff' : 'none',
              borderRight: !isLeft ? '2px solid #00f0ff' : 'none',
              opacity: 0.3
            }}
          >
            <div style={{
              position: 'absolute',
              [isTop ? 'top' : 'bottom']: '10px',
              [isLeft ? 'left' : 'right']: '10px',
              width: '4px',
              height: '4px',
              backgroundColor: '#00f0ff',
              borderRadius: '50%',
              boxShadow: '0 0 10px #00f0ff',
              animation: 'nodePulse 2s ease-in-out infinite'
            }} />
          </div>
        );
      })}

      {/* HUD Status Text */}
      <div style={{
        position: 'absolute',
        top: '60px',
        right: '30px',
        fontFamily: 'monospace',
        fontSize: '9px',
        color: '#00f0ff',
        opacity: 0.2,
        textAlign: 'right',
        lineHeight: '1.8'
      }}>
        <div>SYS.STATUS: ACTIVE</div>
        <div>NETWORK: CONNECTED</div>
        <div>AI.CORE: ONLINE</div>
        <div>SENSORS: 12/12</div>
      </div>

      {/* Radial gradient overlay */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse at center, transparent 0%, #0a0e17 80%)',
        pointerEvents: 'none'
      }} />
    </div>
  );
}


// Startup Greeting Component - Click to Start
function StartupGreeting({ onComplete, lang = 'en' }) {
  const t = translations[lang] || translations.en;
  const [started, setStarted] = useState(false);
  const [text, setText] = useState(t.clickToStart);

  const handleStart = () => {
    if (started) return;
    setStarted(true);

    // Play startup sound
    sounds.startup();

    const messages = greetings[lang]?.startup || greetings.en.startup;
    const helloMsg = greetings[lang]?.hello || greetings.en.hello;

    let i = 0;
    const showNext = () => {
      if (i < messages.length) {
        setText(messages[i]);
        sounds.click();
        i++;
        setTimeout(showNext, 500);
      } else {
        setText(helloMsg);
        speak(helloMsg);
        sounds.success();
        setTimeout(onComplete, 3000);
      }
    };

    setTimeout(showNext, 300);
  };

  return (
    <div
      onClick={handleStart}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: '#0a0e17',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        cursor: started ? 'default' : 'pointer'
      }}
    >
      <div style={{
        width: '200px',
        height: '200px',
        borderRadius: '50%',
        background: 'radial-gradient(circle at 30% 30%, rgba(0,240,255,0.3), transparent 60%), radial-gradient(circle, rgba(0,240,255,0.15), #0a0e17 70%)',
        border: '2px solid #00f0ff',
        boxShadow: '0 0 60px rgba(0,240,255,0.5), inset 0 0 40px rgba(0,240,255,0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        animation: 'pulse 2s infinite'
      }}>
        <span style={{
          fontFamily: 'Orbitron',
          fontSize: '28px',
          fontWeight: 'bold',
          color: '#00f0ff',
          textShadow: '0 0 20px #00f0ff'
        }}>JARVIS</span>
      </div>
      <div style={{
        marginTop: '40px',
        fontFamily: 'Rajdhani',
        fontSize: '18px',
        color: '#00f0ff',
        textAlign: 'center',
        maxWidth: '500px',
        minHeight: '60px'
      }}>
        {text}
      </div>
      <div style={{ marginTop: '20px', display: 'flex', gap: '8px' }}>
        {started ? (
          [0, 1, 2].map(i => (
            <div key={i} style={{
              width: '8px', height: '8px', borderRadius: '50%',
              backgroundColor: '#00f0ff',
              animation: `pulse 1s infinite ${i * 0.2}s`
            }} />
          ))
        ) : (
          <span style={{ color: '#4a7c80', fontSize: '14px', letterSpacing: '2px' }}>
            🖱️ CLICK TO ACTIVATE
          </span>
        )}
      </div>
    </div>
  );
}


// Jarvis Orb Component
function JarvisOrb({ onClick, state, size = 220 }) {
  const colors = {
    idle: '#00f0ff',
    listening: '#ff4444',
    processing: '#aa44ff',
    speaking: '#00ff88'
  };
  const color = colors[state] || colors.idle;

  const handleClick = () => {
    sounds.click();
    onClick();
  };

  return (
    <div
      onClick={handleClick}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        background: `radial-gradient(circle at 30% 30%, ${color}30, transparent 60%), radial-gradient(circle, ${color}15, #0a0e17 70%)`,
        border: `2px solid ${color}`,
        boxShadow: `0 0 60px ${color}50, inset 0 0 40px ${color}20`,
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        transition: 'all 0.3s ease'
      }}
    >
      <div style={{
        position: 'absolute',
        inset: '-15px',
        border: `1px dashed ${color}50`,
        borderRadius: '50%',
        animation: 'spin 15s linear infinite'
      }} />
      <div style={{
        position: 'absolute',
        inset: '15px',
        border: `1px solid ${color}30`,
        borderRadius: '50%'
      }} />
      {(state === 'listening' || state === 'speaking') && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: '50%',
          height: '2px',
          background: `linear-gradient(90deg, ${color}, transparent)`,
          transformOrigin: 'left center',
          animation: 'sweep 2s linear infinite'
        }} />
      )}
      <span style={{
        fontFamily: 'Orbitron',
        fontSize: size > 150 ? '24px' : '16px',
        fontWeight: 'bold',
        color: color,
        textShadow: `0 0 20px ${color}`,
        letterSpacing: '4px'
      }}>
        JARVIS
      </span>
      <span style={{
        fontSize: '11px',
        color: '#4a7c80',
        marginTop: '8px',
        letterSpacing: '3px'
      }}>
        {state === 'idle' ? 'CLICK TO SPEAK' : state.toUpperCase() + '...'}
      </span>
    </div>
  );
}

// Machine Card
function MachineCard({ machine, onClick }) {
  const statusColors = { Healthy: '#00ff88', Warning: '#ff9500', Critical: '#ff3b3b' };
  const color = statusColors[machine.status] || '#00f0ff';

  return (
    <div
      onClick={() => { sounds.click(); onClick(); }}
      className="hud-panel"
      style={{ padding: '12px', cursor: 'pointer', transition: 'all 0.2s' }}
      onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(0,240,255,0.1)'}
      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: color, boxShadow: `0 0 10px ${color}` }} />
          <span style={{ fontFamily: 'Orbitron', fontSize: '14px', fontWeight: 'bold' }}>{machine.machine_id}</span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'Orbitron', fontSize: '16px', color }}>{machine.health_score}%</div>
          <div style={{ fontSize: '11px', color: '#4a7c80' }}>{machine.temperature}°C • {machine.vibration?.toFixed(2)}g</div>
        </div>
      </div>
    </div>
  );
}

// Machine Detail View
function MachineDetail({ machine, onBack }) {
  const [history, setHistory] = useState([]);
  const statusColors = { Healthy: '#00ff88', Warning: '#ff9500', Critical: '#ff3b3b' };
  const color = statusColors[machine.status] || '#00f0ff';

  useEffect(() => {
    getMachineHistory(machine.machine_id, 20).then(res => setHistory(res.data.history || [])).catch(() => { });
  }, [machine.machine_id]);

  return (
    <div className="hud-panel" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <button onClick={() => { sounds.click(); onBack(); }} style={{
          background: 'transparent', border: '1px solid var(--hud-primary)', color: 'var(--hud-primary)',
          padding: '8px 16px', fontFamily: 'Orbitron', fontSize: '12px', cursor: 'pointer'
        }}>← BACK</button>
        <h2 style={{ fontFamily: 'Orbitron', fontSize: '24px', color: 'var(--hud-primary)' }}>{machine.machine_id}</h2>
        <span style={{ padding: '6px 14px', borderRadius: '4px', backgroundColor: `${color}20`, color, border: `1px solid ${color}`, fontFamily: 'Orbitron', fontSize: '12px' }}>{machine.status}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '20px' }}>
        <MetricBox label="HEALTH" value={machine.health_score} unit="%" color="#00ff88" />
        <MetricBox label="TEMPERATURE" value={machine.temperature} unit="°C" color="#ff3b3b" />
        <MetricBox label="VIBRATION" value={machine.vibration?.toFixed(2)} unit="g" color="#ff9500" />
        <MetricBox label="RPM" value={machine.rpm} unit="" color="#00f0ff" />
      </div>
      {history.length > 0 && (
        <div>
          <h3 style={{ fontSize: '12px', color: '#4a7c80', marginBottom: '10px', letterSpacing: '2px' }}>RECENT HISTORY</h3>
          <div style={{ display: 'flex', alignItems: 'end', gap: '4px', height: '60px' }}>
            {history.map((h, i) => (
              <div key={i} style={{ flex: 1, height: `${h.health_score || 50}%`, background: `linear-gradient(to top, ${statusColors[h.status] || '#00f0ff'}40, ${statusColors[h.status] || '#00f0ff'})`, borderRadius: '2px 2px 0 0' }} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MetricBox({ label, value, unit, color }) {
  return (
    <div className="hud-panel" style={{ padding: '16px', textAlign: 'center' }}>
      <div style={{ fontSize: '11px', color: '#4a7c80', letterSpacing: '2px', marginBottom: '8px' }}>{label}</div>
      <div style={{ fontFamily: 'Orbitron', fontSize: '28px', color, textShadow: `0 0 15px ${color}` }}>{value}<span style={{ fontSize: '14px', marginLeft: '4px' }}>{unit}</span></div>
    </div>
  );
}

// Chat Messages
function ChatMessages({ messages }) {
  const endRef = useRef(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  return (
    <div className="hud-panel" style={{ padding: '16px', maxHeight: '150px', overflowY: 'auto', width: '100%' }}>
      {messages.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#4a7c80', padding: '15px', fontSize: '13px' }}>&gt; AWAITING VOICE COMMAND...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {messages.map((m, i) => (
            <div key={i} style={{ fontSize: '13px' }}>
              <div style={{ color: '#ff9500' }}><span style={{ color: '#4a7c80' }}>[YOU]</span> {m.question}</div>
              {m.answer && <div style={{ color: '#00f0ff', marginTop: '4px', paddingLeft: '12px', borderLeft: '2px solid rgba(0,240,255,0.3)' }}><span style={{ color: '#4a7c80' }}>[JARVIS]</span> {m.answer}</div>}
            </div>
          ))}
          <div ref={endRef} />
        </div>
      )}
    </div>
  );
}

// Live Graph
function Graph({ value, label, color }) {
  const [history, setHistory] = useState(Array(40).fill(50));
  useEffect(() => { if (value !== undefined) setHistory(prev => [...prev.slice(1), Math.min(100, Math.max(0, value))]); }, [value]);
  const points = history.map((v, i) => `${(i / 39) * 100},${100 - v}`).join(' ');

  return (
    <div className="hud-panel" style={{ padding: '10px', flex: 1, minWidth: '120px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
        <span style={{ fontSize: '10px', color: '#4a7c80', letterSpacing: '1px' }}>{label}</span>
        <span style={{ fontFamily: 'Orbitron', fontSize: '12px', color }}>{value?.toFixed?.(1) || value || 0}</span>
      </div>
      <svg viewBox="0 0 100 100" style={{ width: '100%', height: '40px' }} preserveAspectRatio="none">
        <defs><linearGradient id={`g-${label}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.4" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient></defs>
        <polygon points={`0,100 ${points} 100,100`} fill={`url(#g-${label})`} />
        <polyline points={points} fill="none" stroke={color} strokeWidth="2" />
      </svg>
    </div>
  );
}

// Download Menu
function DownloadMenu({ onClose }) {
  const download = (url) => { sounds.success(); window.open(`${API_BASE}${url}`, '_blank'); onClose(); };
  return (
    <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '8px', zIndex: 100, minWidth: '200px' }} className="hud-panel">
      <div style={{ padding: '8px 0' }}>
        <MenuItem onClick={() => download('/reports/summary/pdf')} icon="📊">Summary PDF</MenuItem>
        <MenuItem onClick={() => download('/reports/maintenance/pdf')} icon="🔧">Maintenance PDF</MenuItem>
        <MenuItem onClick={() => download('/reports/history/csv')} icon="📁">Export CSV</MenuItem>
      </div>
    </div>
  );
}

function MenuItem({ onClick, icon, children }) {
  return (
    <div onClick={onClick} style={{ padding: '10px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}
      onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(0,240,255,0.1)'; sounds.click(); }}
      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
      <span>{icon}</span><span>{children}</span>
    </div>
  );
}

export default function App() {
  const { machines, isConnected } = useWebSocket();
  const [chat, setChat] = useState([]);
  const [voiceState, setVoiceState] = useState('idle');
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [showDownloads, setShowDownloads] = useState(false);
  const [view, setView] = useState('dashboard');

  // Startup: always show on page load
  const [showStartup, setShowStartup] = useState(true);

  const handleStartupComplete = () => {
    setShowStartup(false);
    sounds.success();
  };

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showAlerts, setShowAlerts] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [showQuickCommands, setShowQuickCommands] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSimulation, setShowSimulation] = useState(false);
  const [showMaintenance, setShowMaintenance] = useState(false);
  const [showIoT, setShowIoT] = useState(false);
  const [showCommandCenter, setShowCommandCenter] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showHandover, setShowHandover] = useState(false);
  const [showCommissioning, setShowCommissioning] = useState(false);
  const [language, setLanguageState] = useState('en'); // 'en', 'ta', 'tanglish'

  // PWA hooks
  const { supported: notifSupported, permission, requestPermission, showAlertNotification } = useNotifications();
  const { canInstall, isInstalled, promptInstall } = useInstallPrompt();

  // Send push notification for critical machines
  useEffect(() => {
    if (permission === 'granted') {
      const critical = machines.filter(m => m.status === 'Critical');
      critical.forEach(m => {
        showAlertNotification(m, 'critical');
      });
    }
  }, [machines, permission, showAlertNotification]);

  // Handle language change
  const changeLanguage = (lang) => {
    setLanguageState(lang);
    setLanguage(lang); // Update global speak function
    const langNames = { en: 'English', ta: 'தமிழ்', tanglish: 'Tanglish' };
    const confirmMsg = {
      en: `Language set to ${langNames[lang]}`,
      ta: 'மொழி தமிழாக அமைக்கப்பட்டது',
      tanglish: 'Language Tanglish-ku set aayiduchu!'
    };
    speak(confirmMsg[lang]);
  };

  // Get current translations
  const t = translations[language] || translations.en;

  // Quick voice commands - use translated text
  const quickCommands = [
    { text: t.commands.showMachines, icon: "🏭" },
    { text: t.commands.temperature, icon: "🌡️" },
    { text: t.commands.criticalAlerts, icon: "⚠️" },
    { text: t.commands.systemStatus, icon: "📊" },
    { text: t.commands.generateReport, icon: "📝" },
    { text: t.commands.predictMaintenance, icon: "🔧" }
  ];

  // Generate alerts from machine data
  useEffect(() => {
    const newAlerts = machines
      .filter(m => m.status === 'Warning' || m.status === 'Critical')
      .map(m => ({
        id: m.machine_id,
        type: m.status,
        message: `${m.machine_id}: ${m.status === 'Critical' ? 'Immediate attention required!' : 'Check recommended'}`,
        temp: m.temperature,
        time: new Date().toLocaleTimeString()
      }));
    setAlerts(newAlerts);
  }, [machines]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.target.tagName === 'INPUT') return;
      switch (e.key.toLowerCase()) {
        case 'v': handleVoice(); break;
        case 'm': setView('machines'); break;
        case 'h': setView('dashboard'); break;
        case 'a': setShowAlerts(prev => !prev); break;
        case 's': setSoundEnabled(prev => !prev); break;
        case 'f': toggleFullscreen(); break;
        case 'q': setShowQuickCommands(prev => !prev); break;
        case 'escape': setShowAlerts(false); setShowQuickCommands(false); break;
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Override sounds based on toggle
  const playSound = (fn) => { if (soundEnabled) fn(); };

  const avgTemp = machines.length ? machines.reduce((a, m) => a + m.temperature, 0) / machines.length : 0;
  const avgHealth = machines.length ? machines.reduce((a, m) => a + m.health_score, 0) / machines.length : 0;
  const avgVib = machines.length ? machines.reduce((a, m) => a + (m.vibration || 0), 0) / machines.length * 100 : 0;

  const handleVoice = async () => {
    if (voiceState !== 'idle') { speechSynthesis.cancel(); setVoiceState('idle'); return; }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { toast.error('Speech not supported'); return; }

    setVoiceState('listening');
    sounds.listening();

    // Say "Listening" in selected language
    const listeningMsg = greetings[language]?.listening || 'Listening';
    speak(listeningMsg);

    setTimeout(() => {
      const rec = new SR();
      // Set recognition language based on selected language
      if (language === 'ta') {
        rec.lang = 'ta-IN'; // Tamil
      } else if (language === 'tanglish') {
        rec.lang = 'en-IN'; // Indian English works best for Tanglish
      } else {
        rec.lang = 'en-US'; // Default English
      }
      rec.onresult = async (e) => {
        const q = e.results[0][0].transcript;
        rec.stop();
        setVoiceState('processing');
        sounds.processing();
        setChat(prev => [...prev, { question: q, answer: null }]);

        try {
          // Pass language so AI responds in Tamil/Tanglish
          const res = await askJarvis(q, 'default', language);
          const ans = res.data.answer;
          setChat(prev => prev.map((m, i) => i === prev.length - 1 ? { ...m, answer: ans } : m));
          setVoiceState('speaking');
          sounds.success();
          speak(ans, () => setVoiceState('idle'));
        } catch (err) {
          console.error('Jarvis API error:', err);
          sounds.warning();
          const errorMsg = err?.response?.data?.detail || t.error;
          setChat(prev => prev.map((m, i) => i === prev.length - 1 ? { ...m, answer: `❌ ${errorMsg}` } : m));
          setVoiceState('idle');
        }
      };
      rec.onerror = () => { rec.stop(); setVoiceState('idle'); sounds.warning(); };
      rec.start();
    }, 500);
  };

  // Startup screen
  if (showStartup) {
    return <StartupGreeting onComplete={handleStartupComplete} lang={language} />;
  }

  return (
    <div style={{ minHeight: '100vh', width: '100%', backgroundColor: '#0a0e17', display: 'flex', flexDirection: 'column', padding: '16px', position: 'relative' }}>
      <FloatingBackground />
      <Toaster position="top-center" />

      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', position: 'relative', zIndex: 10 }}>
        <div>
          <h1 className="hud-title" style={{ fontSize: '28px' }}>{t.dashboard}</h1>
          <p style={{ fontSize: '12px', color: '#4a7c80', letterSpacing: '2px' }}>{t.subtitle}</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* View Toggle */}
          <div style={{ display: 'flex', gap: '4px' }}>
            <button onClick={() => { playSound(sounds.click); setView('dashboard'); setSelectedMachine(null); }} style={{ background: view === 'dashboard' ? 'rgba(0,240,255,0.2)' : 'transparent', border: '1px solid var(--hud-border)', color: view === 'dashboard' ? 'var(--hud-primary)' : '#4a7c80', padding: '6px 12px', fontFamily: 'Orbitron', fontSize: '11px', cursor: 'pointer' }} title="Press H">{t.hud}</button>
            <button onClick={() => { playSound(sounds.click); setView('machines'); }} style={{ background: view === 'machines' ? 'rgba(0,240,255,0.2)' : 'transparent', border: '1px solid var(--hud-border)', color: view === 'machines' ? 'var(--hud-primary)' : '#4a7c80', padding: '6px 12px', fontFamily: 'Orbitron', fontSize: '11px', cursor: 'pointer' }} title="Press M">{t.machines}</button>
            <button onClick={() => { playSound(sounds.click); setView('analytics'); }} style={{ background: view === 'analytics' ? 'rgba(0,255,136,0.2)' : 'transparent', border: '1px solid var(--hud-border)', color: view === 'analytics' ? '#00ff88' : '#4a7c80', padding: '6px 12px', fontFamily: 'Orbitron', fontSize: '11px', cursor: 'pointer' }} title="Press Y">📊 ANALYTICS</button>
            <button onClick={() => { playSound(sounds.click); setView('3d'); }} style={{ background: view === '3d' ? 'rgba(168,85,247,0.2)' : 'transparent', border: '1px solid var(--hud-border)', color: view === '3d' ? '#a855f7' : '#4a7c80', padding: '6px 12px', fontFamily: 'Orbitron', fontSize: '11px', cursor: 'pointer' }} title="Press 3">🏭 3D</button>
            <button onClick={() => { playSound(sounds.click); setShowSimulation(true); }} style={{ background: 'transparent', border: '1px solid var(--hud-border)', color: '#ff00ff', padding: '6px 12px', fontFamily: 'Orbitron', fontSize: '11px', cursor: 'pointer' }} title="Digital Twin">🔮 SIMULATE</button>
            <button onClick={() => { playSound(sounds.click); setShowMaintenance(true); }} style={{ background: 'transparent', border: '1px solid var(--hud-border)', color: '#ff9500', padding: '6px 12px', fontFamily: 'Orbitron', fontSize: '11px', cursor: 'pointer' }} title="Maintenance">🔧 MAINT</button>
            <button onClick={() => { playSound(sounds.click); setShowIoT(true); }} style={{ background: 'transparent', border: '1px solid var(--hud-border)', color: '#00ddff', padding: '6px 12px', fontFamily: 'Orbitron', fontSize: '11px', cursor: 'pointer' }} title="IoT Sensors">📡 IOT</button>
            <button onClick={() => { playSound(sounds.click); setShowCommandCenter(true); }} style={{ background: 'linear-gradient(135deg, rgba(0,240,255,0.2), rgba(168,85,247,0.2))', border: '1px solid #a855f7', color: '#a855f7', padding: '6px 12px', fontFamily: 'Orbitron', fontSize: '11px', cursor: 'pointer' }} title="Command Center">🎮 CMD CTR</button>
            <button onClick={() => { playSound(sounds.click); setShowCommissioning(true); }} style={{ background: 'transparent', border: '1px solid var(--hud-border)', color: '#10b981', padding: '6px 12px', fontFamily: 'Orbitron', fontSize: '11px', cursor: 'pointer' }} title="New Machine Setup">🏭 NEW</button>
          </div>

          {/* Alerts Button */}
          <button onClick={() => { playSound(sounds.click); setShowAlerts(!showAlerts); }} style={{ position: 'relative', background: alerts.length > 0 ? 'rgba(255,59,59,0.2)' : 'transparent', border: `1px solid ${alerts.length > 0 ? '#ff3b3b' : 'var(--hud-border)'}`, color: alerts.length > 0 ? '#ff3b3b' : 'var(--hud-primary)', padding: '6px 12px', fontFamily: 'Orbitron', fontSize: '11px', cursor: 'pointer' }} title="Press A">
            🚨 {alerts.length}
          </button>

          {/* Quick Commands */}
          <button onClick={() => { playSound(sounds.click); setShowQuickCommands(!showQuickCommands); }} style={{ background: showQuickCommands ? 'rgba(0,240,255,0.2)' : 'transparent', border: '1px solid var(--hud-border)', color: 'var(--hud-primary)', padding: '6px 12px', fontFamily: 'Orbitron', fontSize: '11px', cursor: 'pointer' }} title="Press Q">
            ⚡ CMD
          </button>

          {/* Language Selector */}
          <div style={{ position: 'relative' }}>
            <select
              value={language}
              onChange={(e) => { playSound(sounds.click); changeLanguage(e.target.value); }}
              style={{
                background: 'rgba(0,240,255,0.1)',
                border: '1px solid var(--hud-border)',
                color: 'var(--hud-primary)',
                padding: '6px 8px',
                fontFamily: 'Orbitron',
                fontSize: '10px',
                cursor: 'pointer',
                appearance: 'none',
                paddingRight: '20px'
              }}
              title="Language"
            >
              <option value="en" style={{ background: '#0a0e17', color: '#00f0ff' }}>🇬🇧 EN</option>
              <option value="ta" style={{ background: '#0a0e17', color: '#00f0ff' }}>🇮🇳 தமிழ்</option>
              <option value="tanglish" style={{ background: '#0a0e17', color: '#00f0ff' }}>🔀 Tanglish</option>
            </select>
          </div>

          {/* Export */}
          <div style={{ position: 'relative' }}>
            <button onClick={() => { playSound(sounds.click); setShowDownloads(!showDownloads); }} style={{ background: 'transparent', border: '1px solid var(--hud-border)', color: 'var(--hud-primary)', padding: '6px 12px', fontFamily: 'Orbitron', fontSize: '11px', cursor: 'pointer' }}>⬇️</button>
            {showDownloads && <DownloadMenu onClose={() => setShowDownloads(false)} />}
          </div>

          {/* Sound Toggle */}
          <button onClick={() => { setSoundEnabled(!soundEnabled); }} style={{ background: 'transparent', border: '1px solid var(--hud-border)', color: soundEnabled ? '#00ff88' : '#ff3b3b', padding: '6px 12px', fontFamily: 'Orbitron', fontSize: '11px', cursor: 'pointer' }} title="Press S">
            {soundEnabled ? '🔊' : '🔇'}
          </button>

          {/* Fullscreen */}
          <button onClick={() => { playSound(sounds.click); toggleFullscreen(); }} style={{ background: 'transparent', border: '1px solid var(--hud-border)', color: 'var(--hud-primary)', padding: '6px 12px', fontFamily: 'Orbitron', fontSize: '11px', cursor: 'pointer' }} title="Press F">
            {isFullscreen ? '⬜' : '⛶'}
          </button>

          {/* Install App Button */}
          {canInstall && (
            <button onClick={() => { playSound(sounds.success); promptInstall(); }} style={{ background: 'rgba(168,85,247,0.2)', border: '1px solid #a855f7', color: '#a855f7', padding: '6px 12px', fontFamily: 'Orbitron', fontSize: '11px', cursor: 'pointer' }} title="Install App">
              📲 INSTALL
            </button>
          )}

          {/* Notification Permission */}
          {notifSupported && permission !== 'granted' && (
            <button onClick={() => { playSound(sounds.click); requestPermission(); }} style={{ background: 'rgba(255,149,0,0.2)', border: '1px solid #ff9500', color: '#ff9500', padding: '6px 12px', fontFamily: 'Orbitron', fontSize: '11px', cursor: 'pointer' }} title="Enable Notifications">
              🔔
            </button>
          )}

          {/* Status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '8px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: isConnected ? '#00ff88' : '#ff3b3b', boxShadow: `0 0 10px ${isConnected ? '#00ff88' : '#ff3b3b'}` }} />
            <span style={{ fontFamily: 'Orbitron', fontSize: '12px' }}>{isConnected ? t.online : t.offline}</span>
          </div>
          <span style={{ fontFamily: 'Orbitron', fontSize: '14px', color: '#00f0ff' }}>{new Date().toLocaleTimeString('en-US', { hour12: false })}</span>
        </div>
      </header>

      {/* Alerts Panel */}
      {showAlerts && (
        <div className="hud-panel" style={{ position: 'absolute', top: '70px', right: '20px', zIndex: 100, width: '350px', maxHeight: '400px', overflowY: 'auto' }}>
          <div style={{ padding: '12px', borderBottom: '1px solid var(--hud-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: 'Orbitron', fontSize: '14px', color: 'var(--hud-primary)' }}>🚨 {t.alerts}</span>
            <button onClick={() => setShowAlerts(false)} style={{ background: 'none', border: 'none', color: '#4a7c80', cursor: 'pointer' }}>✕</button>
          </div>
          {alerts.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#00ff88' }}>✓ {t.allSystemsNormal}</div>
          ) : (
            alerts.map((alert, i) => (
              <div key={i} style={{ padding: '12px', borderBottom: '1px solid rgba(0,240,255,0.1)', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', marginTop: '6px', backgroundColor: alert.type === 'Critical' ? '#ff3b3b' : '#ff9500', boxShadow: `0 0 10px ${alert.type === 'Critical' ? '#ff3b3b' : '#ff9500'}` }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', color: alert.type === 'Critical' ? '#ff3b3b' : '#ff9500' }}>{alert.message}</div>
                  <div style={{ fontSize: '11px', color: '#4a7c80', marginTop: '4px' }}>Temp: {alert.temp}°C • {alert.time}</div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Quick Commands Panel - Left Sidebar */}
      {showQuickCommands && (
        <div className="hud-panel" style={{ position: 'fixed', top: '120px', left: '20px', zIndex: 100, width: '220px' }}>
          <div style={{ padding: '12px', borderBottom: '1px solid var(--hud-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: 'Orbitron', fontSize: '14px', color: 'var(--hud-primary)' }}>⚡ {t.quickCommands}</span>
            <button onClick={() => setShowQuickCommands(false)} style={{ background: 'none', border: 'none', color: '#4a7c80', cursor: 'pointer' }}>✕</button>
          </div>
          <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {quickCommands.map((cmd, i) => (
              <button
                key={i}
                onClick={async () => {
                  playSound(sounds.click);
                  setShowQuickCommands(false);
                  const question = cmd.text;
                  setChat(prev => [...prev, { question, answer: `⏳ ${t.processing}` }]);
                  try {
                    // Pass language so AI responds in Tamil/Tanglish
                    const res = await askJarvis(question, 'default', language);
                    const answer = res.data.answer || t.error;
                    setChat(prev => {
                      const newChat = [...prev];
                      newChat[newChat.length - 1] = { question, answer };
                      return newChat;
                    });
                    speak(answer);
                    playSound(sounds.success);
                  } catch (error) {
                    setChat(prev => {
                      const newChat = [...prev];
                      newChat[newChat.length - 1] = { question, answer: '❌ Error: Could not get response' };
                      return newChat;
                    });
                    playSound(sounds.warning);
                  }
                }}
                style={{ background: 'rgba(0,240,255,0.05)', border: '1px solid var(--hud-border)', color: 'var(--hud-primary)', padding: '12px', fontFamily: 'Rajdhani', fontSize: '13px', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,240,255,0.15)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,240,255,0.05)'}
              >
                <span style={{ fontSize: '18px' }}>{cmd.icon}</span>
                <span>{cmd.text}</span>
              </button>
            ))}
          </div>
          <div style={{ padding: '8px 12px', borderTop: '1px solid var(--hud-border)', fontSize: '10px', color: '#4a7c80', textAlign: 'center' }}>
            Keyboard: V=Voice H=HUD M=Machines A=Alerts S=Sound F=Fullscreen
          </div>
        </div>
      )}

      {/* Main Content */}
      {view === '3d' ? (
        <Factory3D machines={machines} onMachineSelect={setSelectedMachine} selectedMachine={selectedMachine} onBack={() => setView('dashboard')} />
      ) : view === 'analytics' ? (
        <AnalyticsDashboard language={language} onBack={() => setView('dashboard')} />
      ) : selectedMachine ? (
        <MachineDetail machine={selectedMachine} onBack={() => setSelectedMachine(null)} />
      ) : view === 'machines' ? (
        <main style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px', position: 'relative', zIndex: 5 }}>
          {machines.map(m => <MachineCard key={m.machine_id} machine={m} onClick={() => setSelectedMachine(m)} />)}
        </main>
      ) : (
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px', position: 'relative', zIndex: 5 }}>
          <div style={{ display: 'flex', gap: '24px' }}>
            <StatusItem count={machines.filter(m => m.status === 'Healthy').length} label={t.healthy} color="#00ff88" />
            <StatusItem count={machines.filter(m => m.status === 'Warning').length} label={t.warning} color="#ff9500" />
            <StatusItem count={machines.filter(m => m.status === 'Critical').length} label={t.critical} color="#ff3b3b" />
          </div>
          <JarvisOrb onClick={handleVoice} state={voiceState} />
          <div style={{ width: '100%', maxWidth: '600px' }}><ChatMessages messages={chat} /></div>
        </main>
      )}

      {/* Footer */}
      <footer style={{ borderTop: '1px solid rgba(0,240,255,0.2)', paddingTop: '12px', marginTop: '12px', display: 'flex', gap: '10px', flexWrap: 'wrap', position: 'relative', zIndex: 5 }}>
        <Graph value={avgTemp} label="TEMP" color="#ff3b3b" />
        <Graph value={avgHealth} label="HEALTH" color="#00ff88" />
        <Graph value={avgVib} label="VIBRATION" color="#ff9500" />
        <Graph value={machines.length * 10} label="UNITS" color="#00f0ff" />
      </footer>


      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes sweep { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.8; transform: scale(1.02); } }
        @keyframes dataStream { 
          0% { opacity: 0; transform: scaleY(0); }
          10% { opacity: 1; transform: scaleY(1); }
          90% { opacity: 1; transform: scaleY(1); }
          100% { opacity: 0; transform: scaleY(0); }
        }
        @keyframes dataRain { 
          0% { transform: translateY(-100px); opacity: 0; }
          10% { opacity: 0.15; }
          90% { opacity: 0.15; }
          100% { transform: translateY(100vh); opacity: 0; }
        }
        @keyframes nodePulse { 
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.5); }
        }
        @keyframes radarSweep { 
          from { transform: rotate(0deg); } 
          to { transform: rotate(360deg); } 
        }
      `}</style>

      {/* Digital Twin Simulation Panel */}
      {showSimulation && (
        <SimulationPanel
          machines={machines}
          onClose={() => setShowSimulation(false)}
        />
      )}

      {/* Predictive Maintenance Panel */}
      {showMaintenance && (
        <MaintenancePanel onClose={() => setShowMaintenance(false)} />
      )}

      {/* IoT Sensor Dashboard */}
      {showIoT && (
        <IoTPanel onClose={() => setShowIoT(false)} />
      )}

      {/* Factory Command Center */}
      {showCommandCenter && (
        <CommandCenter
          machines={machines}
          alerts={alerts}
          onExit={() => setShowCommandCenter(false)}
        />
      )}

      {/* New Machine Commissioning Advisor */}
      {showCommissioning && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, overflow: 'auto' }}>
          <CommissioningPanel onBack={() => setShowCommissioning(false)} />
        </div>
      )}
    </div>
  );
}

function StatusItem({ count, label, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: color, boxShadow: `0 0 10px ${color}` }} />
      <span style={{ fontSize: '13px' }}><span style={{ fontFamily: 'Orbitron', fontWeight: 'bold', color }}>{count}</span> {label}</span>
    </div>
  );
}
