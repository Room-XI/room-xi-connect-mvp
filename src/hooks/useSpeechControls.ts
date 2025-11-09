import { useState, useEffect, useRef, useCallback } from 'react';

interface SpeechControlsState {
  isRecording: boolean;
  isPlaying: boolean;
  isDictationSupported: boolean;
  isPlaybackSupported: boolean;
  error: string | null;
  transcript: string;
}

interface SpeechControlsReturn extends SpeechControlsState {
  startDictation: () => void;
  stopDictation: () => void;
  cancelDictation: () => void;
  speakText: (text: string) => void;
  pauseSpeaking: () => void;
  resumeSpeaking: () => void;
  cancelSpeaking: () => void;
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export function useSpeechControls(): SpeechControlsReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDictationSupported, setIsDictationSupported] = useState(false);
  const [isPlaybackSupported, setIsPlaybackSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState('');

  const recognitionRef = useRef<any>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const lastTranscriptRef = useRef('');

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const hasSpeechRecognition = !!SpeechRecognition;
    const hasSpeechSynthesis = !!window.speechSynthesis;

    setIsDictationSupported(hasSpeechRecognition);
    setIsPlaybackSupported(hasSpeechSynthesis);

    if (hasSpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcriptPiece = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcriptPiece + ' ';
          } else {
            interimTranscript += transcriptPiece;
          }
        }

        setTranscript((prev) => prev + finalTranscript);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        
        switch (event.error) {
          case 'no-speech':
            setError('No speech detected. Please try again.');
            break;
          case 'audio-capture':
            setError('No microphone detected. Please check your device.');
            break;
          case 'not-allowed':
            setError('Microphone permission denied. Please enable it in your browser settings.');
            break;
          case 'network':
            setError('Network error. Please check your connection.');
            break;
          case 'aborted':
            setError('Recording was aborted.');
            break;
          default:
            setError(`Error: ${event.error}`);
        }
        
        setIsRecording(false);
        lastTranscriptRef.current = '';
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
        lastTranscriptRef.current = '';
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const startDictation = useCallback(() => {
    if (!isDictationSupported) {
      setError('Speech recognition is not supported in your browser. Please use Chrome or Edge.');
      return;
    }

    setError(null);
    setTranscript('');
    lastTranscriptRef.current = '';
    
    try {
      recognitionRef.current?.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Error starting recognition:', err);
      setError('Failed to start recording. Please try again.');
    }
  }, [isDictationSupported]);

  const stopDictation = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
    lastTranscriptRef.current = '';
  }, []);

  const cancelDictation = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }
    setIsRecording(false);
    setTranscript('');
    lastTranscriptRef.current = '';
    setError(null);
  }, []);

  const speakText = useCallback((text: string) => {
    if (!isPlaybackSupported || !window.speechSynthesis) {
      setError('Text-to-speech is not supported in your browser.');
      return;
    }

    window.speechSynthesis.cancel();

    if (!text.trim()) {
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utteranceRef.current = utterance;

    utterance.onstart = () => {
      setIsPlaying(true);
      setError(null);
    };

    utterance.onend = () => {
      setIsPlaying(false);
      utteranceRef.current = null;
    };

    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      setError('Failed to read text aloud.');
      setIsPlaying(false);
      utteranceRef.current = null;
    };

    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    window.speechSynthesis.speak(utterance);
  }, [isPlaybackSupported]);

  const pauseSpeaking = useCallback(() => {
    if (window.speechSynthesis && window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
    }
  }, []);

  const resumeSpeaking = useCallback(() => {
    if (window.speechSynthesis && window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
  }, []);

  const cancelSpeaking = useCallback(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      utteranceRef.current = null;
    }
  }, []);

  return {
    isRecording,
    isPlaying,
    isDictationSupported,
    isPlaybackSupported,
    error,
    transcript,
    startDictation,
    stopDictation,
    cancelDictation,
    speakText,
    pauseSpeaking,
    resumeSpeaking,
    cancelSpeaking,
  };
}
