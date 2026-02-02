import { useState } from 'react';
import { Mic, MicOff, Volume2, Loader } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

// Simple voice utilities inlined to avoid import issues
const speakText = (text) => {
  if (!('speechSynthesis' in window)) {
    console.warn('Speech synthesis not supported');
    return;
  }
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = 1;
  speechSynthesis.speak(utterance);
};

const startListening = (onResult, onError) => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    onError('Speech recognition not supported. Please use Chrome.');
    return null;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.interimResults = false;

  recognition.onresult = (event) => {
    const text = event.results[0][0].transcript;
    recognition.stop();
    onResult(text);
  };

  recognition.onerror = (event) => {
    recognition.stop();
    onError(event.error === 'not-allowed' ? 'Mic access denied' : 'Speech error');
  };

  recognition.start();
  return recognition;
};

export default function VoiceButton({ setChat }) {
  const [state, setState] = useState('idle'); // idle, listening, processing, speaking
  const [recognition, setRecognition] = useState(null);

  const handleClick = async () => {
    // If already doing something, cancel it
    if (state !== 'idle') {
      if (recognition) recognition.stop();
      speechSynthesis.cancel();
      setState('idle');
      return;
    }

    setState('listening');
    speakText("Listening");

    // Wait a moment for the "Listening" speech to start
    setTimeout(() => {
      const rec = startListening(
        async (command) => {
          // Got speech input
          setState('processing');
          toast.success(`Heard: "${command}"`);

          // Add to chat immediately
          setChat(prev => [...prev, { question: command, answer: null }]);

          try {
            const res = await axios.post(
              'http://127.0.0.1:8000/jarvis/ask',
              { prompt: command },
              { timeout: 120000 }
            );
            const answer = res.data.answer;

            // Update chat with answer
            setChat(prev => prev.map((m, i) =>
              i === prev.length - 1 ? { ...m, answer } : m
            ));

            // Speak the answer
            setState('speaking');
            speakText(answer);

            // Return to idle after speaking
            const words = answer.split(' ').length;
            setTimeout(() => setState('idle'), Math.max(3000, words * 400));

          } catch (err) {
            console.error(err);
            setChat(prev => prev.map((m, i) =>
              i === prev.length - 1 ? { ...m, answer: 'Request failed. Try again.' } : m
            ));
            speakText("Sorry, request failed");
            setState('idle');
          }
        },
        (error) => {
          toast.error(error);
          setState('idle');
        }
      );
      setRecognition(rec);
    }, 500);
  };

  // Button colors based on state
  const colors = {
    idle: { bg: '#3b82f6', ring: '' },
    listening: { bg: '#ef4444', ring: 'ring-4 ring-red-400/50' },
    processing: { bg: '#8b5cf6', ring: '' },
    speaking: { bg: '#22c55e', ring: 'ring-4 ring-green-400/50' }
  };

  const { bg, ring } = colors[state];

  return (
    <button
      onClick={handleClick}
      className={`fixed bottom-6 right-6 w-16 h-16 rounded-full z-[9999]
                 text-white flex items-center justify-center shadow-2xl
                 transition-all duration-200 hover:scale-110 active:scale-95
                 ${ring} ${state === 'listening' || state === 'speaking' ? 'animate-pulse' : ''}`}
      style={{ backgroundColor: bg }}
      title={state === 'idle' ? 'Click to speak' : `${state}...`}
    >
      {state === 'idle' && <Mic className="w-7 h-7" />}
      {state === 'listening' && <MicOff className="w-7 h-7" />}
      {state === 'processing' && <Loader className="w-7 h-7 animate-spin" />}
      {state === 'speaking' && <Volume2 className="w-7 h-7" />}
    </button>
  );
}
