import { useState, useEffect, useRef } from 'react';
import { BookOpen, Sparkles, Send, CheckCircle, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useSession } from '@/lib/session';
import api from '@/lib/api';
import CrisisSheet from '@/ui/crisis/CrisisSheet';
import VoiceControls from '@/components/VoiceControls';
import { MOODS, type MoodKey } from '@/lib/moodConfig';

const PROMPTS = [
  "What's one thing that made you smile today?",
  "What's on your mind right now?",
  "What's something you're looking forward to?",
  "How are you really feeling?",
  "What's something you're proud of today?",
  "What's challenging you right now?",
  "What would make tomorrow better?"
];

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

export default function Journal() {
  const { user, needsGuardianVerification } = useSession();
  const [mode, setMode] = useState<'alone' | 'peer'>('alone');
  const [mood, setMood] = useState<MoodKey>('clear');
  const [content, setContent] = useState('');
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [crisisOpen, setCrisisOpen] = useState(false);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPrompt(PROMPTS[Math.floor(Math.random() * PROMPTS.length)]);
  }, []);

  useEffect(() => {
    if (mode === 'peer' && messages.length === 0) {
      setMessages([
        {
          id: '1',
          text: "Hey, I'm here to journal with you as your peer guide. What's been on your mind lately?",
          isUser: false,
          timestamp: new Date(),
        }
      ]);
    } else if (mode === 'alone') {
      setMessages([]);
    }
  }, [mode, messages.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleModeChange = async (newMode: 'alone' | 'peer') => {
    if (newMode === 'peer') {
      try {
        await api.ximi.toggleMode('peer');
      } catch (error) {
        console.error('Failed to set peer mode:', error);
      }
    } else {
      try {
        await api.ximi.toggleMode('sibling');
      } catch (error) {
        console.error('Failed to reset sibling mode:', error);
      }
    }
    setMode(newMode);
    setContent('');
    setInputText('');
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || isTyping) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const messageText = inputText.trim();
    setInputText('');
    setIsTyping(true);

    try {
      const { data, error } = await api.ximi.chat({ message: messageText });
      
      if (error) {
        const errorResponse: Message = {
          id: (Date.now() + 1).toString(),
          text: "I'm having trouble processing that right now. Please try again.",
          isUser: false,
          timestamp: new Date(),
        };
        
        setMessages(prev => [...prev, errorResponse]);
        setIsTyping(false);
        return;
      }

      if (data.crisisDetected) {
        const crisisResponse: Message = {
          id: data.id.toString(),
          text: data.ximiResponse,
          isUser: false,
          timestamp: new Date(data.createdAt),
        };
        
        setMessages(prev => [...prev, crisisResponse]);
        setIsTyping(false);
        
        setTimeout(() => {
          setCrisisOpen(true);
        }, 1000);
        return;
      }

      const aiResponse: Message = {
        id: data.id.toString(),
        text: data.ximiResponse,
        isUser: false,
        timestamp: new Date(data.createdAt),
      };
      
      setMessages(prev => [...prev, aiResponse]);
      setIsTyping(false);

    } catch (error) {
      console.error('Error processing message:', error);
      
      const errorResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: "I'm having trouble processing that right now. Please try again.",
        isUser: false,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, errorResponse]);
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  async function saveAloneEntry() {
    if (!content.trim()) return;
    if (!user) return;

    setLoading(true);
    try {
      alert('Entry saved! (Journal backend API coming soon)');
      setContent('');
      setMood('clear');
      setPrompt(PROMPTS[Math.floor(Math.random() * PROMPTS.length)]);
    } catch (error) {
      console.error('Error saving entry:', error);
      alert('Failed to save entry. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function finishPeerSession() {
    if (messages.length <= 1) return;
    
    setLoading(true);
    try {
      alert('Session saved! (Journal backend API coming soon)');
      await api.ximi.toggleMode('sibling');
      setMessages([]);
      setMode('alone');
      setMood('clear');
    } catch (error) {
      console.error('Error saving session:', error);
      alert('Failed to save session. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Guardian Verification Banner */}
        {needsGuardianVerification && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 mb-6"
          >
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-base font-semibold text-amber-900 mb-1">
                  Guardian Verification Required
                </h3>
                <p className="text-sm text-amber-800 leading-relaxed">
                  To use the journaling features, a parent or guardian needs to verify your account. 
                  They should have received a verification email. Journaling will be available once verified.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-cosmic-midnight flex items-center gap-3 mb-6">
            <BookOpen className="w-8 h-8 text-cosmic-teal" />
            Living Journal
          </h1>

          <div className="flex gap-2 bg-gray-100 p-1 rounded-xl mb-6">
            <button
              onClick={() => handleModeChange('alone')}
              disabled={needsGuardianVerification}
              className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${
                mode === 'alone'
                  ? 'bg-white text-cosmic-teal shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              } ${needsGuardianVerification ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="flex items-center justify-center gap-2">
                <BookOpen className="w-5 h-5" />
                <span>Write Alone</span>
              </div>
            </button>
            <button
              onClick={() => handleModeChange('peer')}
              disabled={needsGuardianVerification}
              className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${
                mode === 'peer'
                  ? 'bg-white text-cosmic-purple shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              } ${needsGuardianVerification ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="flex items-center justify-center gap-2">
                <Sparkles className="w-5 h-5" />
                <span>Peer Guide</span>
              </div>
            </button>
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            How are you feeling?
          </label>
          <div className="grid grid-cols-6 gap-2">
            {MOODS.map(moodOption => (
              <button
                key={moodOption.key}
                onClick={() => setMood(moodOption.key)}
                className={`p-3 rounded-xl border-2 transition ${
                  mood === moodOption.key
                    ? 'border-cosmic-teal bg-cosmic-teal/10'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                title={moodOption.desc}
              >
                <div className="text-2xl mb-1">{moodOption.emoji}</div>
                <div className="text-xs text-gray-600 font-medium">{moodOption.label}</div>
              </button>
            ))}
          </div>
        </div>

        {mode === 'alone' ? (
          <div className="bg-white rounded-2xl shadow-xl p-8"
            style={{
              backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'paper\'%3E%3CfeTurbulence baseFrequency=\'0.04\' numOctaves=\'5\' /%3E%3CfeColorMatrix values=\'0 0 0 0 0.98, 0 0 0 0 0.98, 0 0 0 0 0.98, 0 0 0 0.02 0\'/%3E%3C/filter%3E%3Crect width=\'100\' height=\'100\' filter=\'url(%23paper)\' /%3E%3C/svg%3E")',
              backgroundSize: '200px 200px'
            }}
          >
            <div className="mb-6 p-4 bg-cosmic-teal/10 rounded-lg border-l-4 border-cosmic-teal">
              <p className="text-cosmic-midnight italic">{prompt}</p>
            </div>

            <div className="mb-4">
              <VoiceControls
                mode="input"
                onAppendTranscript={(text) => setContent((prev) => prev + text)}
                className="mb-3"
              />
            </div>

            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Start writing or use voice input above..."
              className="w-full h-64 p-4 border-2 border-gray-200 rounded-xl resize-none focus:outline-none focus:border-cosmic-teal font-serif text-lg"
              style={{ fontFamily: "'Merriweather', serif" }}
              maxLength={5000}
            />

            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500">
                  {content.length} / 5000 characters
                </span>
                {content.trim() && (
                  <VoiceControls
                    mode="playback"
                    getTextToSpeak={() => content}
                  />
                )}
              </div>
              <button
                onClick={saveAloneEntry}
                disabled={loading || !content.trim()}
                className="px-6 py-3 bg-cosmic-teal text-white rounded-xl hover:bg-cosmic-teal/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
              >
                <Send className="w-4 h-4" />
                {loading ? 'Saving...' : 'Save Entry'}
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden"
            style={{
              backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'paper\'%3E%3CfeTurbulence baseFrequency=\'0.04\' numOctaves=\'5\' /%3E%3CfeColorMatrix values=\'0 0 0 0 0.98, 0 0 0 0 0.98, 0 0 0 0 0.98, 0 0 0 0.02 0\'/%3E%3C/filter%3E%3Crect width=\'100\' height=\'100\' filter=\'url(%23paper)\' /%3E%3C/svg%3E")',
              backgroundSize: '200px 200px'
            }}
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-cosmic-purple/5 to-cosmic-rose/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-cosmic-purple to-cosmic-rose rounded-full flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-cosmic-midnight">Ximi - Peer Guide</h3>
                  <p className="text-xs text-gray-600">Here to journal with you</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4 h-96 overflow-y-auto">
              {messages.map(message => (
                <motion.div
                  key={message.id}
                  className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className={`flex items-start gap-2 ${message.isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div
                      className={`max-w-[80%] px-4 py-3 rounded-2xl ${
                        message.isUser
                          ? 'bg-cosmic-teal text-white'
                          : 'bg-cosmic-purple/10 text-cosmic-midnight border border-cosmic-purple/20'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                    </div>
                    {!message.isUser && (
                      <VoiceControls
                        mode="playback"
                        getTextToSpeak={() => message.text}
                      />
                    )}
                  </div>
                </motion.div>
              ))}
              
              {isTyping && (
                <motion.div
                  className="flex justify-start"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="bg-cosmic-purple/10 text-cosmic-midnight px-4 py-3 rounded-2xl border border-cosmic-purple/20">
                    <div className="flex space-x-1">
                      {[...Array(3)].map((_, i) => (
                        <motion.div
                          key={i}
                          className="w-2 h-2 bg-cosmic-purple rounded-full"
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            delay: i * 0.2,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50/50">
              <div className="mb-3">
                <VoiceControls
                  mode="input"
                  onAppendTranscript={(text) => setInputText((prev) => prev + text)}
                />
              </div>
              
              <div className="flex space-x-3 mb-4">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Share what's on your mind or use voice above..."
                  className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-cosmic-purple transition-colors"
                  disabled={isTyping}
                  maxLength={500}
                />
                
                <motion.button
                  onClick={handleSendMessage}
                  disabled={!inputText.trim() || isTyping}
                  className={`px-4 py-3 rounded-xl transition-all duration-200 ${
                    inputText.trim() && !isTyping
                      ? 'bg-cosmic-purple text-white hover:bg-cosmic-purple/90'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                  whileHover={inputText.trim() && !isTyping ? { scale: 1.05 } : {}}
                  whileTap={inputText.trim() && !isTyping ? { scale: 0.95 } : {}}
                >
                  <Send className="w-5 h-5" />
                </motion.button>
              </div>
              
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500">
                  {inputText.length} / 500 characters
                </p>
                <button
                  onClick={finishPeerSession}
                  disabled={loading || messages.length <= 1}
                  className="px-4 py-2 bg-cosmic-teal text-white text-sm rounded-lg hover:bg-cosmic-teal/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
                >
                  <CheckCircle className="w-4 h-4" />
                  {loading ? 'Saving...' : 'Finish Session'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <CrisisSheet open={crisisOpen} onClose={() => setCrisisOpen(false)} />
    </>
  );
}
