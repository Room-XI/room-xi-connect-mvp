import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Send, Sparkles, MapPin, ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import api, { type ProgramRecommendation } from '@/lib/api';
import XimiConsentModal from '@/components/XimiConsentModal';
import VoiceControls from '@/components/VoiceControls';

interface XimiDockProps {
  onCrisis: () => void;
}

interface StructuredProgram {
  eventId: string;
  programId: string;
  title: string;
  dayOfWeek?: string;
  startTime?: string;
  endTime?: string;
  venue?: string;
  cost?: string;
  free?: boolean;
  isDropIn?: boolean;
  distance?: number | null;
  registrationUrl?: string | null;
}

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  type?: 'text' | 'programs' | 'crisis' | 'redirect';
  programs?: StructuredProgram[];
}

const SUGGESTION_CHIPS = [
  { label: 'Art today', query: 'Art programs happening today' },
  { label: 'Free drop-in today', query: 'Free drop-in programs today' },
  { label: 'Sports this week', query: 'Sports and recreation programs this week' },
  { label: 'My next game', query: 'When is my next sports or recreation session?' },
  { label: 'Something chill', query: 'Something relaxing or low-key I can do this week' },
];

function formatTime(time: string | undefined): string {
  if (!time) return '';
  try {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  } catch {
    return time;
  }
}

function ProgramCard({ program }: { program: StructuredProgram }) {
  return (
    <Link to={`/program/${program.programId}`} className="block">
      <motion.div
        className="bg-surface border border-borderMutedLight rounded-xl p-3 hover:shadow-md transition-all space-y-2"
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-semibold text-deepSage text-sm leading-tight flex-1">
            {program.title}
          </h4>
          {program.isDropIn && (
            <span className="text-xs px-1.5 py-0.5 bg-teal/10 text-teal rounded-full flex-shrink-0">
              Drop-in
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-textSecondaryLight">
          {program.dayOfWeek && program.startTime && (
            <span>
              {program.dayOfWeek}, {formatTime(program.startTime)}
              {program.endTime ? ` – ${formatTime(program.endTime)}` : ''}
            </span>
          )}
          {program.venue && (
            <span className="flex items-center gap-0.5">
              <MapPin className="w-3 h-3" />
              {program.venue}
            </span>
          )}
          {program.distance != null && (
            <span>{program.distance.toFixed(1)} km</span>
          )}
        </div>

        <div className="flex items-center justify-between">
          <span className={`text-xs font-medium ${program.free ? 'text-teal' : 'text-textSecondaryLight'}`}>
            {program.free ? 'Free' : program.cost || 'Cost varies'}
          </span>

          <div className="flex items-center gap-1 text-teal text-xs font-medium">
            <span>View</span>
            <ExternalLink className="w-3 h-3" />
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

export default function XimiDock({ onCrisis }: XimiDockProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: t('explore.ximi.greeting'),
      isUser: false,
      timestamp: new Date(),
      type: 'text',
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [recommendations, setRecommendations] = useState<ProgramRecommendation[]>([]);
  const [hasNewRecommendations, setHasNewRecommendations] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [, setLocationPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');

  useEffect(() => {
    const cachedLocation = sessionStorage.getItem('userLocation');
    if (cachedLocation) {
      const { lat, lng } = JSON.parse(cachedLocation);
      setUserLocation({ lat, lng });
      setLocationPermission('granted');
    }
  }, []);

  useEffect(() => {
    loadRecommendations();
  }, [userLocation]);

  const loadRecommendations = async () => {
    try {
      const requestData: {
        includeTrends: boolean;
        userLat?: number;
        userLng?: number;
        prioritizeNearby?: boolean;
      } = { includeTrends: true };

      if (userLocation) {
        requestData.userLat = userLocation.lat;
        requestData.userLng = userLocation.lng;
        requestData.prioritizeNearby = true;
      }

      const { data, error } = await api.ximi.getRecommendations(requestData);
      
      if (error) return;

      if (data?.recommendations && data.recommendations.length > 0) {
        setRecommendations(data.recommendations);
        setHasNewRecommendations(true);
      }
    } catch (error) {
      console.error('[Ximi] Exception while loading recommendations:', error);
    }
  };

  const handleAppendTranscript = (text: string) => {
    setInputText(prev => prev + text);
  };

  const parseResponseToPrograms = (_responseText: string, recData?: ProgramRecommendation[]): StructuredProgram[] => {
    if (recData && recData.length > 0) {
      return recData.map(rec => ({
        eventId: rec.eventId,
        programId: rec.programId,
        title: rec.programTitle || rec.title,
        dayOfWeek: rec.dayOfWeek || undefined,
        startTime: rec.startTime || undefined,
        endTime: rec.endTime || undefined,
        venue: rec.locationName || undefined,
        cost: rec.cost || undefined,
        free: rec.free,
        isDropIn: rec.isDropIn,
        distance: rec.distance,
        registrationUrl: rec.registrationUrl,
      }));
    }
    return [];
  };

  const handleSendMessage = async (messageOverride?: string) => {
    const messageText = (messageOverride || inputText).trim();
    if (!messageText || isTyping) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: messageText,
      isUser: true,
      timestamp: new Date(),
      type: 'text',
    };

    setMessages(prev => [...prev, userMessage]);
    if (!messageOverride) setInputText('');
    setIsTyping(true);

    try {
      const { data, error } = await api.ximi.chat({ message: messageText });
      
      if (error) {
        if (error === 'Ximi consent required') {
          setPendingMessage(messageText);
          setShowConsentModal(true);
          setIsTyping(false);
          return;
        }
        
        const errorResponse: Message = {
          id: (Date.now() + 1).toString(),
          text: "I couldn't find programs right now. Try browsing the Explore page, or rephrase your request.",
          isUser: false,
          timestamp: new Date(),
          type: 'text',
        };
        
        setMessages(prev => [...prev, errorResponse]);
        setIsTyping(false);
        return;
      }
      
      setPendingMessage(null);

      if (data.crisisDetected) {
        const crisisResponse: Message = {
          id: data.id.toString(),
          text: data.ximiResponse,
          isUser: false,
          timestamp: new Date(data.createdAt),
          type: 'crisis',
        };
        
        setMessages(prev => [...prev, crisisResponse]);
        setIsTyping(false);
        
        setTimeout(() => {
          onCrisis();
        }, 1000);
        return;
      }

      const programs = parseResponseToPrograms(data.ximiResponse, recommendations);

      const aiResponse: Message = {
        id: data.id.toString(),
        text: data.ximiResponse,
        isUser: false,
        timestamp: new Date(data.createdAt),
        type: programs.length > 0 ? 'programs' : 'text',
        programs: programs.length > 0 ? programs : undefined,
      };
      
      setMessages(prev => [...prev, aiResponse]);
      setIsTyping(false);

    } catch (error) {
      console.error('[Ximi] Chat request exception:', error);
      
      const errorResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: "Something went wrong. Please try again or browse programs in Explore.",
        isUser: false,
        timestamp: new Date(),
        type: 'text',
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

  const handleChipClick = (query: string) => {
    handleSendMessage(query);
  };

  const handleConsentGranted = async () => {
    setShowConsentModal(false);
    
    if (pendingMessage) {
      setIsTyping(true);
      
      try {
        const { data, error } = await api.ximi.chat({ message: pendingMessage });
        
        if (error) {
          const errorResponse: Message = {
            id: (Date.now() + 1).toString(),
            text: "I couldn't process that. Please try again.",
            isUser: false,
            timestamp: new Date(),
            type: 'text',
          };
          
          setMessages(prev => [...prev, errorResponse]);
          setIsTyping(false);
          setPendingMessage(null);
          return;
        }

        if (data.crisisDetected) {
          const crisisResponse: Message = {
            id: data.id.toString(),
            text: data.ximiResponse,
            isUser: false,
            timestamp: new Date(data.createdAt),
            type: 'crisis',
          };
          
          setMessages(prev => [...prev, crisisResponse]);
          setIsTyping(false);
          setPendingMessage(null);
          
          setTimeout(() => {
            onCrisis();
          }, 1000);
          return;
        }

        const programs = parseResponseToPrograms(data.ximiResponse, recommendations);

        const aiResponse: Message = {
          id: data.id.toString(),
          text: data.ximiResponse,
          isUser: false,
          timestamp: new Date(data.createdAt),
          type: programs.length > 0 ? 'programs' : 'text',
          programs: programs.length > 0 ? programs : undefined,
        };
        
        setMessages(prev => [...prev, aiResponse]);
        setIsTyping(false);
        setPendingMessage(null);

      } catch (error) {
        console.error('[Ximi] Retry after consent exception:', error);
        
        const errorResponse: Message = {
          id: (Date.now() + 1).toString(),
          text: "Something went wrong. Please try again.",
          isUser: false,
          timestamp: new Date(),
          type: 'text',
        };
        
        setMessages(prev => [...prev, errorResponse]);
        setIsTyping(false);
        setPendingMessage(null);
      }
    }
  };

  return (
    <>
      <XimiConsentModal
        isOpen={showConsentModal}
        onClose={() => setShowConsentModal(false)}
        onConsentGranted={handleConsentGranted}
      />

      <motion.button
        onClick={() => {
          setIsOpen(true);
          setHasNewRecommendations(false);
        }}
        className={`fixed bottom-24 right-4 w-14 h-14 bg-cosmic-gradient rounded-full shadow-cosmic flex items-center justify-center z-40 ${
          isOpen ? 'hidden' : ''
        }`}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, delay: 1 }}
        aria-label={hasNewRecommendations ? t('explore.ximi.openChatNewRecs') : t('explore.ximi.openChat')}
      >
        <Search className="w-6 h-6 text-deepSage" />
        
        {hasNewRecommendations && recommendations.length > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-5 h-5 bg-purple-500 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-md"
          >
            {recommendations.length > 9 ? '9+' : recommendations.length}
          </motion.div>
        )}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div 
              className="absolute inset-0 bg-navy/20 backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
            />
            
            <motion.div
              className="absolute bottom-0 left-0 right-0 bg-surface rounded-t-3xl shadow-2xl border-t border-borderMutedLight max-h-[80vh] flex flex-col"
              initial={{ transform: 'translateY(100%)' }}
              animate={{ transform: 'translateY(0)' }}
              exit={{ transform: 'translateY(100%)' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            >
              <div className="border-b border-borderMutedLight">
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-cosmic-gradient rounded-full flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-deepSage" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-deepSage">{t('explore.ximi.name')}</h3>
                      <p className="text-xs text-textSecondaryLight">{t('explore.ximi.subtitle')}</p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-2 rounded-lg hover:bg-sage/10 transition-colors"
                  >
                    <X className="w-5 h-5 text-textSecondaryLight" />
                  </button>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-64 max-h-96">
                {recommendations.length > 0 && messages.length <= 1 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="mb-4 space-y-3"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="w-5 h-5 text-purple-500" />
                      <h3 className="font-display font-semibold text-deepSage text-base">
                        {t('explore.ximi.programsForYou')}
                      </h3>
                    </div>
                    <div className="space-y-2">
                      {recommendations.slice(0, 3).map((rec, index) => (
                        <motion.div
                          key={rec.eventId}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1, duration: 0.3 }}
                        >
                          <ProgramCard
                            program={{
                              eventId: rec.eventId,
                              programId: rec.programId,
                              title: rec.programTitle || rec.title,
                              dayOfWeek: rec.dayOfWeek || undefined,
                              startTime: rec.startTime || undefined,
                              endTime: rec.endTime || undefined,
                              venue: rec.locationName || undefined,
                              cost: rec.cost,
                              free: rec.free,
                              isDropIn: rec.isDropIn,
                              distance: rec.distance,
                              registrationUrl: rec.registrationUrl,
                            }}
                          />
                        </motion.div>
                      ))}
                    </div>
                    {recommendations.length > 3 && (
                      <p className="text-xs text-textSecondaryLight text-center italic mt-2">
                        {t('explore.ximi.showingRecommendations', { count: recommendations.length })}
                      </p>
                    )}
                  </motion.div>
                )}
                
                {messages.map(message => (
                  <motion.div
                    key={message.id}
                    className={`flex ${message.isUser ? 'justify-end' : 'justify-start items-start gap-2'}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    {message.isUser ? (
                      <div className="max-w-xs px-4 py-2 rounded-2xl bg-teal text-white">
                        <p className="text-sm">{message.text}</p>
                      </div>
                    ) : message.type === 'programs' && message.programs ? (
                      <div className="max-w-sm space-y-2 w-full">
                        <p className="text-sm text-deepSage px-1">{message.text}</p>
                        {message.programs.map(prog => (
                          <ProgramCard key={prog.eventId} program={prog} />
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-start gap-2">
                        <div className="max-w-xs px-4 py-2 rounded-2xl bg-sage/10 text-deepSage">
                          <p className="text-sm">{message.text}</p>
                        </div>
                        <VoiceControls
                          mode="playback"
                          getTextToSpeak={() => message.text}
                          className="flex-shrink-0 mt-1"
                        />
                      </div>
                    )}
                  </motion.div>
                ))}
                
                {isTyping && (
                  <motion.div
                    className="flex justify-start"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div className="bg-sage/10 text-deepSage px-4 py-2 rounded-2xl">
                      <div className="flex space-x-1">
                        {[...Array(3)].map((_, i) => (
                          <motion.div
                            key={i}
                            className="w-2 h-2 bg-sage rounded-full"
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
              </div>

              {messages.length <= 1 && !isTyping && (
                <div className="px-4 pb-2">
                  <div className="flex flex-wrap gap-2">
                    {SUGGESTION_CHIPS.map((chip) => (
                      <motion.button
                        key={chip.label}
                        onClick={() => handleChipClick(chip.query)}
                        className="px-3 py-1.5 text-xs font-medium bg-sage/10 text-deepSage rounded-full hover:bg-sage/20 transition-colors"
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                      >
                        {chip.label}
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="p-4 border-t border-borderMutedLight">
                <div className="mb-3">
                  <VoiceControls
                    mode="input"
                    onAppendTranscript={handleAppendTranscript}
                    className="mb-2"
                  />
                </div>
                <div className="flex space-x-3">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={t('explore.ximi.inputPlaceholder')}
                    className="flex-1 cosmic-input"
                    disabled={isTyping}
                  />
                  
                  <motion.button
                    onClick={() => handleSendMessage()}
                    disabled={!inputText.trim() || isTyping}
                    className={`p-3 rounded-xl transition-all duration-200 ${
                      inputText.trim() && !isTyping
                        ? 'bg-teal text-white hover:bg-teal/90'
                        : 'bg-sage/10 text-sage/50 cursor-not-allowed'
                    }`}
                    whileHover={inputText.trim() && !isTyping ? { scale: 1.05 } : {}}
                    whileTap={inputText.trim() && !isTyping ? { scale: 0.95 } : {}}
                  >
                    <Send className="w-5 h-5" />
                  </motion.button>
                </div>
                
                <p className="text-xs text-textSecondaryLight mt-2 text-center">
                  {t('explore.ximi.subtitle')}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
