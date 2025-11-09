import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Sparkles } from 'lucide-react';
import api from '@/lib/api';
import XimiConsentModal from '@/components/XimiConsentModal';

interface XimiDockProps {
  onCrisis: () => void;
}

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

export default function XimiDock({ onCrisis }: XimiDockProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hi! I'm Ximi, your AI companion. I can help you find programs, answer questions about mental health resources, or just chat. What's on your mind?",
      isUser: false,
      timestamp: new Date(),
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Load conversation history on component mount
  useEffect(() => {
    const loadConversationHistory = async () => {
      try {
        const { data, error } = await api.ximi.getConversations();
        
        if (error) {
          console.error('Failed to load conversation history:', error);
          return;
        }

        if (data && data.length > 0) {
          // Convert API conversations to Message format
          const historyMessages: Message[] = [];
          
          data.forEach((conv: any) => {
            // Add user message
            historyMessages.push({
              id: `${conv.id}-user`,
              text: conv.userMessage,
              isUser: true,
              timestamp: new Date(conv.createdAt),
            });
            
            // Add Ximi response
            historyMessages.push({
              id: `${conv.id}-ximi`,
              text: conv.ximiResponse,
              isUser: false,
              timestamp: new Date(conv.createdAt),
            });
          });
          
          // Update messages with history, keeping the initial greeting first
          setMessages(prev => [prev[0], ...historyMessages]);
        }
      } catch (error) {
        console.error('Error loading conversation history:', error);
      }
    };

    loadConversationHistory();
  }, []);

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
      // Call the real Ximi AI API
      const { data, error } = await api.ximi.chat({ message: messageText });
      
      if (error) {
        // Handle consent required error
        if (error === 'Ximi consent required') {
          setPendingMessage(messageText);
          setShowConsentModal(true);
          setIsTyping(false);
          return;
        }
        
        // Handle other API errors
        const errorResponse: Message = {
          id: (Date.now() + 1).toString(),
          text: "I'm having trouble processing that right now. Please try again, or feel free to explore the app on your own!",
          isUser: false,
          timestamp: new Date(),
        };
        
        setMessages(prev => [...prev, errorResponse]);
        setIsTyping(false);
        return;
      }
      
      // Clear pending message on successful send
      setPendingMessage(null);

      // Check if crisis was detected
      if (data.crisisDetected) {
        const crisisResponse: Message = {
          id: data.id.toString(),
          text: data.ximiResponse,
          isUser: false,
          timestamp: new Date(data.createdAt),
        };
        
        setMessages(prev => [...prev, crisisResponse]);
        setIsTyping(false);
        
        // Trigger crisis support sheet
        setTimeout(() => {
          onCrisis();
        }, 1000);
        return;
      }

      // Add AI response to messages
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
        text: "I'm having trouble processing that right now. Please try again, or feel free to explore the app on your own!",
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

  const handleConsentGranted = async () => {
    setShowConsentModal(false);
    
    // Retry sending the pending message if there was one
    if (pendingMessage) {
      setIsTyping(true);
      
      try {
        // Call the real Ximi AI API with the pending message
        const { data, error } = await api.ximi.chat({ message: pendingMessage });
        
        if (error) {
          // Handle API errors
          const errorResponse: Message = {
            id: (Date.now() + 1).toString(),
            text: "I'm having trouble processing that right now. Please try again, or feel free to explore the app on your own!",
            isUser: false,
            timestamp: new Date(),
          };
          
          setMessages(prev => [...prev, errorResponse]);
          setIsTyping(false);
          setPendingMessage(null);
          return;
        }

        // Check if crisis was detected
        if (data.crisisDetected) {
          const crisisResponse: Message = {
            id: data.id.toString(),
            text: data.ximiResponse,
            isUser: false,
            timestamp: new Date(data.createdAt),
          };
          
          setMessages(prev => [...prev, crisisResponse]);
          setIsTyping(false);
          setPendingMessage(null);
          
          // Trigger crisis support sheet
          setTimeout(() => {
            onCrisis();
          }, 1000);
          return;
        }

        // Add AI response to messages
        const aiResponse: Message = {
          id: data.id.toString(),
          text: data.ximiResponse,
          isUser: false,
          timestamp: new Date(data.createdAt),
        };
        
        setMessages(prev => [...prev, aiResponse]);
        setIsTyping(false);
        setPendingMessage(null);

      } catch (error) {
        console.error('Error processing message:', error);
        
        const errorResponse: Message = {
          id: (Date.now() + 1).toString(),
          text: "I'm having trouble processing that right now. Please try again, or feel free to explore the app on your own!",
          isUser: false,
          timestamp: new Date(),
        };
        
        setMessages(prev => [...prev, errorResponse]);
        setIsTyping(false);
        setPendingMessage(null);
      }
    }
  };

  return (
    <>
      {/* Ximi Consent Modal */}
      <XimiConsentModal
        isOpen={showConsentModal}
        onClose={() => setShowConsentModal(false)}
        onConsentGranted={handleConsentGranted}
      />

      {/* Floating Action Button */}
      <motion.button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-24 right-4 w-14 h-14 bg-cosmic-gradient rounded-full shadow-cosmic flex items-center justify-center z-40 ${
          isOpen ? 'hidden' : ''
        }`}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, delay: 1 }}
      >
        <MessageCircle className="w-6 h-6 text-deepSage" />
        
        {/* Floating particles around the button */}
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-teal rounded-full"
              style={{
                top: `${20 + (i * 20)}%`,
                left: `${20 + (i * 20)}%`,
              }}
              animate={{
                y: [-5, 5, -5],
                x: [-3, 3, -3],
                opacity: [0.3, 0.8, 0.3],
              }}
              transition={{
                duration: 3 + (i * 0.5),
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.5,
              }}
            />
          ))}
        </div>
      </motion.button>

      {/* Chat Interface */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Backdrop */}
            <div 
              className="absolute inset-0 bg-navy/20 backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
            />
            
            {/* Chat Panel */}
            <motion.div
              className="absolute bottom-0 left-0 right-0 bg-surface rounded-t-3xl shadow-2xl border-t border-borderMutedLight max-h-[80vh] flex flex-col"
              initial={{ transform: 'translateY(100%)' }}
              animate={{ transform: 'translateY(0)' }}
              exit={{ transform: 'translateY(100%)' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-borderMutedLight">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-cosmic-gradient rounded-full flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-deepSage" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-deepSage">Ximi</h3>
                    <p className="text-xs text-textSecondaryLight">AI Companion</p>
                  </div>
                </div>
                
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-lg hover:bg-sage/10 transition-colors"
                >
                  <X className="w-5 h-5 text-textSecondaryLight" />
                </button>
              </div>
              
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-64 max-h-96">
                {messages.map(message => (
                  <motion.div
                    key={message.id}
                    className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div
                      className={`max-w-xs px-4 py-2 rounded-2xl ${
                        message.isUser
                          ? 'bg-teal text-white'
                          : 'bg-sage/10 text-deepSage'
                      }`}
                    >
                      <p className="text-sm">{message.text}</p>
                    </div>
                  </motion.div>
                ))}
                
                {/* Typing Indicator */}
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
              
              {/* Input */}
              <div className="p-4 border-t border-borderMutedLight">
                <div className="flex space-x-3">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask me anything..."
                    className="flex-1 cosmic-input"
                    disabled={isTyping}
                  />
                  
                  <motion.button
                    onClick={handleSendMessage}
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
                  Ximi is your AI companion in Little Sibling mode
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
