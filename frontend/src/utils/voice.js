let recognition = null;
let currentUtterance = null;

// Check if speech synthesis is supported
export const isSpeechSupported = () => {
  return 'speechSynthesis' in window;
};

// Check if speech recognition is supported
export const isRecognitionSupported = () => {
  return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
};

export const speak = (text) => {
  if (!isSpeechSupported()) {
    console.warn('Speech synthesis not supported in this browser');
    return;
  }

  // Cancel any ongoing speech
  speechSynthesis.cancel();

  if (recognition) {
    recognition.stop(); // Stop listening while speaking
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = 1;
  utterance.pitch = 1;
  utterance.volume = 1;

  // Get available voices and try to use a good English voice
  const voices = speechSynthesis.getVoices();
  const englishVoice = voices.find(v => v.lang.startsWith('en-') && v.name.includes('Google'))
    || voices.find(v => v.lang.startsWith('en-'));
  if (englishVoice) {
    utterance.voice = englishVoice;
  }

  currentUtterance = utterance;
  speechSynthesis.speak(utterance);
};

export const stopSpeaking = () => {
  if (isSpeechSupported()) {
    speechSynthesis.cancel();
  }
};

export const listen = (callback, onError) => {
  if (!isRecognitionSupported()) {
    console.warn('Speech recognition not supported in this browser');
    if (onError) onError('Speech recognition not supported in this browser');
    return;
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.continuous = false;

  recognition.onstart = () => {
    console.log('[Voice] Listening started');
  };

  recognition.onresult = (event) => {
    const command = event.results[0][0].transcript;
    console.log('[Voice] Heard:', command);
    recognition.stop();
    callback(command);
  };

  recognition.onerror = (event) => {
    console.error('[Voice] Error:', event.error);
    recognition.stop();
    if (onError) {
      if (event.error === 'not-allowed') {
        onError('Microphone access denied. Please allow microphone access.');
      } else if (event.error === 'no-speech') {
        onError('No speech detected. Please try again.');
      } else {
        onError(`Speech error: ${event.error}`);
      }
    }
  };

  recognition.onend = () => {
    console.log('[Voice] Listening ended');
  };

  try {
    recognition.start();
  } catch (e) {
    console.error('[Voice] Failed to start:', e);
    if (onError) onError('Failed to start speech recognition');
  }
};

export const stopListening = () => {
  if (recognition) {
    try {
      recognition.stop();
    } catch (e) {
      // Already stopped
    }
  }
};
