import { useEffect, useState } from 'react';
import { Mic, MicOff, Volume2, VolumeX, AlertCircle, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSpeechControls } from '@/hooks/useSpeechControls';

interface VoiceControlsProps {
  mode: 'input' | 'playback';
  onAppendTranscript?: (text: string) => void;
  getTextToSpeak?: () => string;
  className?: string;
}

export default function VoiceControls({
  mode,
  onAppendTranscript,
  getTextToSpeak,
  className = '',
}: VoiceControlsProps) {
  const {
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
    cancelSpeaking,
  } = useSpeechControls();

  const [showTooltip, setShowTooltip] = useState(false);
  const [lastTranscript, setLastTranscript] = useState('');

  useEffect(() => {
    if (!transcript) {
      setLastTranscript('');
      return;
    }
    
    if (transcript !== lastTranscript && onAppendTranscript) {
      const newText = transcript.slice(lastTranscript.length);
      if (newText.trim()) {
        onAppendTranscript(newText);
        setLastTranscript(transcript);
      }
    }
  }, [transcript, lastTranscript, onAppendTranscript]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (mode !== 'input') return;

      if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault();
        if (isRecording) {
          stopDictation();
        } else {
          startDictation();
        }
      }

      if (e.code === 'Escape' && isRecording) {
        e.preventDefault();
        cancelDictation();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [mode, isRecording, startDictation, stopDictation, cancelDictation]);

  const handleMicClick = () => {
    if (isRecording) {
      stopDictation();
    } else {
      startDictation();
    }
  };

  const handleSpeakerClick = () => {
    if (isPlaying) {
      cancelSpeaking();
    } else {
      const text = getTextToSpeak?.();
      if (text) {
        speakText(text);
      }
    }
  };

  const isCurrentModeSupported = mode === 'input' ? isDictationSupported : isPlaybackSupported;
  
  if (!isCurrentModeSupported) {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg ${className}`}>
        <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
        <p className="text-xs text-amber-800">
          {mode === 'input' 
            ? 'Speech recognition not supported in your browser. Try Chrome or Edge.' 
            : 'Text-to-speech not supported in your browser.'}
        </p>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {mode === 'input' ? (
        <>
          <div className="relative">
            <motion.button
              onClick={handleMicClick}
              className={`relative p-3 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                isRecording
                  ? 'bg-red-500 text-white focus:ring-red-500'
                  : 'bg-cosmic-teal text-white hover:bg-cosmic-teal/90 focus:ring-cosmic-teal'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              aria-label={isRecording ? 'Stop recording' : 'Start recording'}
              aria-pressed={isRecording}
            >
              {isRecording ? (
                <>
                  <MicOff className="w-5 h-5" />
                  <motion.div
                    className="absolute inset-0 rounded-full bg-red-400"
                    animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                </>
              ) : (
                <Mic className="w-5 h-5" />
              )}
            </motion.button>

            <button
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              onClick={() => setShowTooltip(!showTooltip)}
              className="absolute -top-1 -right-1 w-5 h-5 bg-cosmic-purple text-white rounded-full flex items-center justify-center hover:bg-cosmic-purple/90 focus:outline-none focus:ring-2 focus:ring-cosmic-purple focus:ring-offset-1"
              aria-label="Privacy information"
            >
              <Info className="w-3 h-3" />
            </button>

            <AnimatePresence>
              {showTooltip && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-cosmic-midnight text-white text-xs rounded-lg shadow-xl z-50"
                >
                  <p className="leading-relaxed">
                    Your voice is processed by your browser. Chrome/Edge may use cloud services for speech recognition.
                  </p>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1">
                    <div className="border-8 border-transparent border-t-cosmic-midnight" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex-1 min-w-0">
            <AnimatePresence mode="wait">
              {isRecording && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="flex items-center gap-2"
                >
                  <div className="flex space-x-1">
                    {[...Array(3)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="w-1 h-4 bg-red-500 rounded-full"
                        animate={{ scaleY: [1, 1.5, 1] }}
                        transition={{
                          duration: 0.8,
                          repeat: Infinity,
                          delay: i * 0.15,
                        }}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-red-600 font-medium" role="status" aria-live="polite">
                    Listening...
                  </span>
                </motion.div>
              )}

              {error && !isRecording && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="flex items-center gap-2"
                  role="alert"
                  aria-live="assertive"
                >
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <span className="text-xs text-red-600">{error}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {isRecording && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={cancelDictation}
              className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400"
              aria-label="Cancel recording"
            >
              Cancel
            </motion.button>
          )}

          <div className="text-xs text-gray-500 hidden sm:block">
            Press <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs font-mono">Space</kbd> to toggle
          </div>
        </>
      ) : (
        <>
          <motion.button
            onClick={handleSpeakerClick}
            className={`p-3 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              isPlaying
                ? 'bg-cosmic-purple text-white focus:ring-cosmic-purple'
                : 'bg-cosmic-teal text-white hover:bg-cosmic-teal/90 focus:ring-cosmic-teal'
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            aria-label={isPlaying ? 'Stop speaking' : 'Read aloud'}
            aria-pressed={isPlaying}
          >
            {isPlaying ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </motion.button>

          <div className="flex-1 min-w-0">
            <AnimatePresence mode="wait">
              {isPlaying && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="flex items-center gap-2"
                >
                  <div className="flex space-x-1">
                    {[...Array(3)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="w-1 h-4 bg-cosmic-purple rounded-full"
                        animate={{ scaleY: [1, 1.5, 1] }}
                        transition={{
                          duration: 0.8,
                          repeat: Infinity,
                          delay: i * 0.15,
                        }}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-cosmic-purple font-medium" role="status" aria-live="polite">
                    Speaking...
                  </span>
                </motion.div>
              )}

              {error && !isPlaying && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="flex items-center gap-2"
                  role="alert"
                  aria-live="assertive"
                >
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <span className="text-xs text-red-600">{error}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </>
      )}
    </div>
  );
}
