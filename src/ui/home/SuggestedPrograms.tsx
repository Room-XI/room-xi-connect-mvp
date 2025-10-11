import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { MapPin, Clock, DollarSign, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Program {
  id: string;
  title: string;
  description: string | null;
  tags: string[];
  free: boolean;
  location_name: string | null;
  organizer: string | null;
  next_start: string | null;
}

export default function SuggestedPrograms() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSuggestedPrograms();
  }, []);

  const loadSuggestedPrograms = async () => {
    try {
      // Load a few featured programs (Fix for R-06: limit query to prevent large fetches)
      const { data, error } = await supabase
        .from('programs')
        .select('id, title, description, tags, free, location_name, organizer, next_start')
        .limit(3)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading programs:', error);
        return;
      }

      setPrograms(data || []);
    } catch (error) {
      console.error('Unexpected error loading programs:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timestamp: string | null) => {
    if (!timestamp) return null;
    
    try {
      const date = new Date(timestamp);
      return date.toLocaleDateString('en-CA', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return null;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-deepSage">Suggested Programs</h2>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="cosmic-card p-4 animate-pulse">
              <div className="h-4 bg-sage/10 rounded mb-2" />
              <div className="h-3 bg-sage/10 rounded w-3/4 mb-2" />
              <div className="h-3 bg-sage/10 rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (programs.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-deepSage">Suggested Programs</h2>
        <div className="cosmic-card p-6 text-center">
          <p className="text-textSecondaryLight">
            No programs available right now. Check back later!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-deepSage">Suggested Programs</h2>
        <Link
          to="/explore"
          className="text-sm font-medium text-teal hover:text-teal/80 transition-colors flex items-center space-x-1"
        >
          <span>See all</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="space-y-3">
        {programs.map((program, index) => (
          <motion.div
            key={program.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1, duration: 0.5 }}
          >
            <Link to={`/program/${program.id}`}>
              <motion.div
                className="cosmic-card p-4 hover:shadow-soft transition-all duration-200"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="space-y-3">
                  {/* Header */}
                  <div className="space-y-1">
                    <h3 className="font-semibold text-deepSage line-clamp-2">
                      {program.title}
                    </h3>
                    {program.organizer && (
                      <p className="text-sm text-textSecondaryLight">
                        by {program.organizer}
                      </p>
                    )}
                  </div>

                  {/* Description */}
                  {program.description && (
                    <p className="text-sm text-textSecondaryLight line-clamp-2">
                      {program.description}
                    </p>
                  )}

                  {/* Meta info */}
                  <div className="flex items-center justify-between text-xs text-textSecondaryLight">
                    <div className="flex items-center space-x-4">
                      {program.location_name && (
                        <div className="flex items-center space-x-1">
                          <MapPin className="w-3 h-3" />
                          <span>{program.location_name}</span>
                        </div>
                      )}
                      
                      {program.next_start && (
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>{formatTime(program.next_start)}</span>
                        </div>
                      )}
                    </div>

                    {program.free && (
                      <div className="flex items-center space-x-1 text-teal">
                        <DollarSign className="w-3 h-3" />
                        <span className="font-medium">Free</span>
                      </div>
                    )}
                  </div>

                  {/* Tags */}
                  {program.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {program.tags.slice(0, 3).map(tag => (
                        <span
                          key={tag}
                          className="text-xs px-2 py-1 bg-sage/10 text-sage rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                      {program.tags.length > 3 && (
                        <span className="text-xs px-2 py-1 bg-sage/10 text-sage rounded-full">
                          +{program.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
