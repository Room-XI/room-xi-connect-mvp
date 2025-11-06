import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
  BookOpen, 
  Lock, 
  Calendar, 
  TrendingUp, 
  Heart,
  Edit3,
  Plus,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Shield
} from 'lucide-react';
// Use native Date formatting instead of date-fns
import { api } from '../lib/api';

interface JournalEntry {
  id: string;
  date: string;
  title?: string;
  content: string;
  mood?: string;
  moodLevel?: number;
  tags?: string[];
  encrypted: boolean;
  wordCount: number;
  createdAt: string;
  updatedAt: string;
}

interface JournalStats {
  totalEntries: number;
  currentStreak: number;
  longestStreak: number;
  totalWords: number;
  avgMoodWithJournal: number;
  avgMoodWithoutJournal: number;
}

export function LivingJournal() {
  const { t } = useTranslation();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [isWriting, setIsWriting] = useState(false);
  const [newEntry, setNewEntry] = useState({ title: '', content: '', tags: [] as string[] });
  const [stats, setStats] = useState<JournalStats | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMood, setFilterMood] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [encryptionEnabled, setEncryptionEnabled] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const entriesPerPage = 10;

  // Load journal entries
  useEffect(() => {
    loadJournalData();
  }, []);

  const loadJournalData = async () => {
    try {
      setLoading(true);
      // Fetch journal entries
      const entriesResponse = await fetch('/api/journal/entries', {
        credentials: 'include'
      });
      
      if (entriesResponse.ok) {
        const data = await entriesResponse.json();
        setEntries(data.entries || []);
      }

      // Fetch journal stats
      const statsResponse = await fetch('/api/journal/stats', {
        credentials: 'include'
      });
      
      if (statsResponse.ok) {
        const data = await statsResponse.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error loading journal data:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveEntry = async () => {
    if (!newEntry.content.trim()) return;
    
    setSaving(true);
    try {
      const response = await fetch('/api/journal/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...newEntry,
          encrypted: encryptionEnabled
        })
      });

      if (response.ok) {
        const savedEntry = await response.json();
        setEntries(prev => [savedEntry, ...prev]);
        setNewEntry({ title: '', content: '', tags: [] });
        setIsWriting(false);
        await loadJournalData(); // Refresh stats
      }
    } catch (error) {
      console.error('Error saving journal entry:', error);
    } finally {
      setSaving(false);
    }
  };

  // Filter entries based on search and mood
  const filteredEntries = entries.filter(entry => {
    const matchesSearch = !searchTerm || 
      entry.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.title?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesMood = !filterMood || entry.mood === filterMood;
    
    return matchesSearch && matchesMood;
  });

  // Paginate entries
  const paginatedEntries = filteredEntries.slice(
    (currentPage - 1) * entriesPerPage,
    currentPage * entriesPerPage
  );
  const totalPages = Math.ceil(filteredEntries.length / entriesPerPage);

  // Word count for new entry
  const wordCount = newEntry.content.split(/\s+/).filter(word => word.length > 0).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      {/* Header with Stats */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <BookOpen className="w-8 h-8 text-purple-600" />
            <h1 className="text-3xl font-bold">{t('journal.title')}</h1>
          </div>
          
          <motion.button
            onClick={() => setIsWriting(!isWriting)}
            className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Plus className="w-5 h-5" />
            <span>{t('journal.newEntry')}</span>
          </motion.button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-md">
              <div className="flex items-center justify-between">
                <Calendar className="w-6 h-6 text-blue-600" />
                <span className="text-2xl font-bold">{stats.totalEntries}</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                {t('journal.totalEntries')}
              </p>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-md">
              <div className="flex items-center justify-between">
                <TrendingUp className="w-6 h-6 text-green-600" />
                <span className="text-2xl font-bold">{stats.currentStreak}</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                {t('journal.currentStreak')}
              </p>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-md">
              <div className="flex items-center justify-between">
                <Edit3 className="w-6 h-6 text-purple-600" />
                <span className="text-2xl font-bold">
                  {Math.floor(stats.totalWords / 1000)}k
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                {t('journal.totalWords')}
              </p>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-md">
              <div className="flex items-center justify-between">
                <Heart className="w-6 h-6 text-red-600" />
                <div className="text-right">
                  <span className="text-lg font-bold text-green-600">
                    +{((stats.avgMoodWithJournal - stats.avgMoodWithoutJournal) * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                {t('journal.moodBoost')}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* New Entry Form */}
      <AnimatePresence>
        {isWriting && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6"
          >
            <div className="mb-4">
              <input
                type="text"
                value={newEntry.title}
                onChange={(e) => setNewEntry(prev => ({ ...prev, title: e.target.value }))}
                placeholder={t('journal.entryTitle')}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              />
            </div>
            
            <div className="mb-4">
              <textarea
                value={newEntry.content}
                onChange={(e) => setNewEntry(prev => ({ ...prev, content: e.target.value }))}
                placeholder={t('journal.writeYourThoughts')}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 min-h-[200px] resize-none"
              />
              <div className="flex items-center justify-between mt-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {t('journal.wordCount', { count: wordCount })}
                </span>
                <div className="flex items-center space-x-2">
                  <Shield className={`w-4 h-4 ${encryptionEnabled ? 'text-green-600' : 'text-gray-400'}`} />
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={encryptionEnabled}
                      onChange={(e) => setEncryptionEnabled(e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm">{t('journal.encrypt')}</span>
                  </label>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setIsWriting(false);
                  setNewEntry({ title: '', content: '', tags: [] });
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={saveEntry}
                disabled={!newEntry.content.trim() || saving}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {saving ? t('common.saving') : t('common.save')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search and Filters */}
      <div className="mb-6 flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('journal.searchEntries')}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
          />
        </div>
        
        <div className="flex items-center space-x-2">
          <Filter className="w-5 h-5 text-gray-600" />
          <select
            value={filterMood || ''}
            onChange={(e) => setFilterMood(e.target.value || null)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
          >
            <option value="">{t('journal.allMoods')}</option>
            <option value="cold">{t('mood.cold')}</option>
            <option value="stormy">{t('mood.stormy')}</option>
            <option value="foggy">{t('mood.foggy')}</option>
            <option value="clear">{t('mood.clear')}</option>
            <option value="breezy">{t('mood.breezy')}</option>
            <option value="aurora">{t('mood.aurora')}</option>
          </select>
        </div>
      </div>

      {/* Journal Entries */}
      <div className="space-y-4">
        {paginatedEntries.map((entry, index) => (
          <motion.div
            key={entry.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => setSelectedEntry(entry)}
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="text-lg font-semibold">
                  {entry.title || new Date(entry.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {new Date(entry.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                {entry.encrypted && <Lock className="w-4 h-4 text-green-600" />}
                {entry.mood && (
                  <span className="px-2 py-1 text-xs rounded-full bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300">
                    {t(`mood.${entry.mood}`)}
                  </span>
                )}
              </div>
            </div>
            <p className="text-gray-700 dark:text-gray-300 line-clamp-3">
              {entry.content}
            </p>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {entry.wordCount} {t('journal.words')}
              </span>
              {entry.tags && entry.tags.length > 0 && (
                <div className="flex space-x-2">
                  {entry.tags.map(tag => (
                    <span key={tag} className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center space-x-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <span className="px-4 py-2">
            {t('common.pageOf', { current: currentPage, total: totalPages })}
          </span>
          
          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}