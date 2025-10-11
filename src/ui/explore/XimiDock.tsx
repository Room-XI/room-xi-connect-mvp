import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Sparkles } from 'lucide-react';
import { analyzeMessage } from '@/ximi/heuristic';

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

  const handleSendMessage = async () => {
    if (!inputText.trim() || isTyping) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);

    try {
      // Analyze the message using our local heuristic
      const analysis = analyzeMessage(inputText.trim());
      
      // If crisis keywords detected, trigger crisis support
      if (analysis.isCrisis) {
        const crisisResponse: Message = {
          id: (Date.now() + 1).toString(),
          text: "I'm concerned about what you've shared. Let me connect you with immediate support resources that can help.",
          isUser: false,
          timestamp: new Date(),
        };
        
        setMessages(prev => [...prev, crisisResponse]);
        setIsTyping(false);
        
        // Trigger crisis support sheet
        setTimeout(() => {
          onCrisis();
        }, 1000);
        return;
      }

      // Generate response based on analysis
      let responseText = '';
      
      if (analysis.category === 'programs') {
        responseText = "I can help you find programs! Based on what you're looking for, I'd recommend checking out the Programs tab where you can filter by your interests. Would you like me to suggest some specific categories?";
      } else if (analysis.category === 'mood') {
        responseText = "It sounds like you're thinking about your mood or feelings. The mood check-in feature on the Home tab is a great way to track how you're doing. Have you tried checking in today?";
      } else if (analysis.category === 'support') {
        responseText = "I'm here to support you. If you're looking for resources or someone to talk to, there are several options available. Would you like me to share some support resources?";
      } else if (analysis.category === 'greeting') {
        responseText = "Hello! It's great to meet you. I'm here to help you navigate the app and find what you need. Is there something specific you'd like to explore?";
      } else {
        responseText = "That's interesting! I'm still learning, but I'm here to help however I can. You might find what you're looking for in the Explore section, or feel free to ask me anything else.";
      }

      // Add a small delay to simulate thinking
      setTimeout(() => {
        const aiResponse: Message = {
          id: (Date.now() + 1).toString(),
          text: responseText,
          isUser: false,
          timestamp: new Date(),
        };
        
        setMessages(prev => [...prev, aiResponse]);
        setIsTyping(false);
      }, 1000 + Math.random() * 1000); // 1-2 second delay

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

  return (
    <>
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
                  Ximi uses local AI and doesn't store your conversations
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
