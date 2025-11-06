/**
 * QuoteCard Component
 * Displays daily reflective quotes for users who opt-in
 * Shows one quote per day with elegant design
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Quote, RefreshCw, Heart, Share2, X } from 'lucide-react';
import api from '@/lib/api';

interface DailyQuote {
  id: number;
  quote: string;
  author?: string;
  category?: string;
}

interface QuoteCardProps {
  className?: string;
  onClose?: () => void;
}

export default function QuoteCard({ className = '', onClose }: QuoteCardProps) {
  const [quote, setQuote] = useState<DailyQuote | null>(null);
  const [liked, setLiked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDailyQuote();
  }, []);

  const loadDailyQuote = async () => {
    try {
      setLoading(true);
      const response = await api.quotes.getDaily();
      if (response.data) {
        setQuote(response.data);
        // Check if user already liked this quote
        const likedQuotes = JSON.parse(localStorage.getItem('likedQuotes') || '[]');
        setLiked(likedQuotes.includes(response.data.id));
      }
    } catch (err) {
      setError('Unable to load today\'s quote');
      console.error('Error loading quote:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = () => {
    if (!quote) return;
    
    const likedQuotes = JSON.parse(localStorage.getItem('likedQuotes') || '[]');
    if (liked) {
      const filtered = likedQuotes.filter((id: number) => id !== quote.id);
      localStorage.setItem('likedQuotes', JSON.stringify(filtered));
    } else {
      likedQuotes.push(quote.id);
      localStorage.setItem('likedQuotes', JSON.stringify(likedQuotes));
    }
    setLiked(!liked);
  };

  const handleShare = async () => {
    if (!quote) return;
    
    const shareText = `"${quote.quote}"${quote.author ? ` — ${quote.author}` : ''}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          text: shareText,
          title: 'Daily Reflection'
        });
      } catch (err) {
        // User cancelled or error occurred
        console.log('Share cancelled or failed');
      }
    } else {
      // Fallback: Copy to clipboard
      navigator.clipboard.writeText(shareText);
      // You could show a toast notification here
    }
  };

  if (loading) {
    return (
      <motion.div
        className={`cosmic-card p-6 ${className}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-sage/10 rounded w-3/4"></div>
          <div className="h-4 bg-sage/10 rounded w-full"></div>
          <div className="h-4 bg-sage/10 rounded w-2/3"></div>
        </div>
      </motion.div>
    );
  }

  if (error || !quote) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        className={`relative cosmic-card overflow-hidden ${className}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.6 }}
      >
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-sage/5 via-teal/5 to-sage/5 pointer-events-none" />
        
        <div className="relative p-6 space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-sage/10 rounded-lg">
                <Quote className="w-4 h-4 text-sage" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-deepSage">Daily Reflection</h3>
                <p className="text-xs text-textSecondaryLight">
                  {new Date().toLocaleDateString('en-US', { 
                    weekday: 'long',
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
            </div>
            
            {onClose && (
              <button
                onClick={onClose}
                className="p-1 hover:bg-sage/10 rounded-lg transition-colors"
                aria-label="Dismiss quote"
              >
                <X className="w-4 h-4 text-textSecondaryLight" />
              </button>
            )}
          </div>

          {/* Quote Content */}
          <div className="space-y-3">
            <blockquote className="relative">
              {/* Opening quote mark */}
              <span className="absolute -top-2 -left-2 text-4xl text-sage/20 font-serif">
                "
              </span>
              
              <p className="relative text-base md:text-lg text-deepSage leading-relaxed pl-4">
                {quote.quote}
              </p>
              
              {/* Closing quote mark */}
              <span className="absolute -bottom-6 right-0 text-4xl text-sage/20 font-serif">
                "
              </span>
            </blockquote>
            
            {quote.author && (
              <p className="text-sm text-textSecondaryLight text-right italic">
                — {quote.author}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-2 border-t border-sage/10">
            <div className="flex items-center space-x-2">
              <motion.button
                onClick={handleLike}
                className={`
                  p-2 rounded-lg transition-all
                  ${liked 
                    ? 'bg-coral/10 text-coral' 
                    : 'hover:bg-sage/10 text-textSecondaryLight'}
                `}
                whileTap={{ scale: 0.95 }}
                aria-label={liked ? 'Unlike quote' : 'Like quote'}
              >
                <Heart 
                  className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} 
                />
              </motion.button>
              
              <motion.button
                onClick={handleShare}
                className="p-2 hover:bg-sage/10 rounded-lg text-textSecondaryLight transition-colors"
                whileTap={{ scale: 0.95 }}
                aria-label="Share quote"
              >
                <Share2 className="w-4 h-4" />
              </motion.button>
            </div>
            
            {quote.category && (
              <span className="text-xs px-2 py-1 bg-sage/10 text-sage rounded-full">
                #{quote.category.replace('_', ' ')}
              </span>
            )}
          </div>
        </div>

        {/* Subtle animation overlay */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.3, 0] }}
          transition={{ 
            duration: 3,
            repeat: Infinity,
            repeatDelay: 10
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}