import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { BookOpen, Sparkles, Send } from 'lucide-react';
import { motion } from 'framer-motion';

interface JournalEntry {
  id: string;
  mood: number;
  content: string;
  prompt?: string;
  ximi_conversation: boolean;
  ximi_summary?: string;
  created_at: string;
}

const MOOD_OPTIONS = [
  { value: 1, label: 'Struggling', emoji: '😔' },
  { value: 2, label: 'Not Great', emoji: '😕' },
  { value: 3, label: 'Okay', emoji: '😐' },
  { value: 4, label: 'Good', emoji: '🙂' },
  { value: 5, label: 'Great', emoji: '😊' }
];

const PROMPTS = [
  "What's one thing that made you smile today?",
  "What's on your mind right now?",
  "What's something you're looking forward to?",
  "How are you really feeling?",
  "What's something you're proud of today?",
  "What's challenging you right now?",
  "What would make tomorrow better?"
];

export default function Journal() {
  const [mode, setMode] = useState<'list' | 'write' | 'ximi'>('list');
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [mood, setMood] = useState<number>(3);
  const [content, setContent] = useState('');
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadEntries();
    // Set random prompt
    setPrompt(PROMPTS[Math.floor(Math.random() * PROMPTS.length)]);
  }, []);

  async function loadEntries() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('youth_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (data) setEntries(data);
  }

  async function saveEntry() {
    if (!content.trim()) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('journal_entries')
        .insert({
          youth_id: user.id,
          mood,
          content: content.trim(),
          prompt: mode === 'write' ? prompt : null,
          ximi_conversation: mode === 'ximi'
        });

      if (error) throw error;

      setContent('');
      setMood(3);
      setMode('list');
      loadEntries();
    } catch (error) {
      console.error('Error saving entry:', error);
      alert('Failed to save entry. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (mode === 'list') {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-cosmic-midnight flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-cosmic-teal" />
            Living Journal
          </h1>
        </div>

        {/* Entry Mode Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setMode('write')}
            className="p-6 bg-gradient-to-br from-cosmic-teal to-cosmic-purple text-white rounded-2xl shadow-lg text-left"
            style={{
              backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'paper\'%3E%3CfeTurbulence baseFrequency=\'0.04\' numOctaves=\'5\' /%3E%3CfeColorMatrix values=\'0 0 0 0 0.9, 0 0 0 0 0.9, 0 0 0 0 0.9, 0 0 0 0.05 0\'/%3E%3C/filter%3E%3Crect width=\'100\' height=\'100\' filter=\'url(%23paper)\' /%3E%3C/svg%3E")'
            }}
          >
            <BookOpen className="w-10 h-10 mb-3" />
            <h2 className="text-2xl font-bold mb-2">Write Alone</h2>
            <p className="text-white/90">Private reflection, just for you</p>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setMode('ximi')}
            className="p-6 bg-gradient-to-br from-cosmic-purple to-cosmic-rose text-white rounded-2xl shadow-lg text-left relative overflow-hidden"
          >
            <Sparkles className="w-10 h-10 mb-3 relative z-10" />
            <h2 className="text-2xl font-bold mb-2 relative z-10">Talk with Ximi</h2>
            <p className="text-white/90 relative z-10">Your AI companion listens</p>
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-50"></div>
          </motion.button>
        </div>

        {/* Past Entries */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-cosmic-midnight mb-4">Past Entries</h2>
          {entries.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl">
              <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No entries yet. Start writing!</p>
            </div>
          ) : (
            entries.map(entry => (
              <EntryCard key={entry.id} entry={entry} />
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="bg-white rounded-2xl shadow-xl p-8"
        style={{
          backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'paper\'%3E%3CfeTurbulence baseFrequency=\'0.04\' numOctaves=\'5\' /%3E%3CfeColorMatrix values=\'0 0 0 0 0.98, 0 0 0 0 0.98, 0 0 0 0 0.98, 0 0 0 0.02 0\'/%3E%3C/filter%3E%3Crect width=\'100\' height=\'100\' filter=\'url(%23paper)\' /%3E%3C/svg%3E")',
          backgroundSize: '200px 200px'
        }}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-cosmic-midnight flex items-center gap-2">
            {mode === 'ximi' ? (
              <>
                <Sparkles className="w-6 h-6 text-cosmic-purple" />
                Talk with Ximi
              </>
            ) : (
              <>
                <BookOpen className="w-6 h-6 text-cosmic-teal" />
                Write Alone
              </>
            )}
          </h2>
          <button
            onClick={() => setMode('list')}
            className="text-gray-500 hover:text-gray-700"
          >
            Cancel
          </button>
        </div>

        {/* Prompt */}
        {mode === 'write' && (
          <div className="mb-6 p-4 bg-cosmic-teal/10 rounded-lg border-l-4 border-cosmic-teal">
            <p className="text-cosmic-midnight italic">{prompt}</p>
          </div>
        )}

        {/* Mood Selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            How are you feeling?
          </label>
          <div className="flex gap-2 justify-between">
            {MOOD_OPTIONS.map(option => (
              <button
                key={option.value}
                onClick={() => setMood(option.value)}
                className={`flex-1 p-3 rounded-xl border-2 transition ${
                  mood === option.value
                    ? 'border-cosmic-teal bg-cosmic-teal/10'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-2xl mb-1">{option.emoji}</div>
                <div className="text-xs text-gray-600">{option.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Text Area */}
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={mode === 'ximi' ? "Start chatting with Ximi..." : "Start writing..."}
          className="w-full h-64 p-4 border-2 border-gray-200 rounded-xl resize-none focus:outline-none focus:border-cosmic-teal font-serif text-lg"
          style={{ fontFamily: "'Merriweather', serif" }}
        />

        {/* Character Count */}
        <div className="flex items-center justify-between mt-4">
          <span className="text-sm text-gray-500">
            {content.length} / 5000 characters
          </span>
          <button
            onClick={saveEntry}
            disabled={loading || !content.trim()}
            className="px-6 py-3 bg-cosmic-teal text-white rounded-xl hover:bg-cosmic-teal/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            {loading ? 'Saving...' : 'Save Entry'}
          </button>
        </div>
      </div>
    </div>
  );
}

function EntryCard({ entry }: { entry: JournalEntry }) {
  const moodOption = MOOD_OPTIONS.find(m => m.value === entry.mood);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          {entry.ximi_conversation && (
            <Sparkles className="w-5 h-5 text-cosmic-purple" />
          )}
          <span className="text-2xl">{moodOption?.emoji}</span>
          <span className="text-sm text-gray-500">
            {new Date(entry.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            })}
          </span>
        </div>
      </div>
      {entry.prompt && (
        <p className="text-sm text-gray-600 italic mb-2">{entry.prompt}</p>
      )}
      <p className="text-gray-800 whitespace-pre-wrap">{entry.content}</p>
      {entry.ximi_summary && (
        <div className="mt-4 p-3 bg-cosmic-purple/10 rounded-lg">
          <p className="text-sm text-cosmic-purple font-medium">Ximi's reflection:</p>
          <p className="text-sm text-gray-700 mt-1">{entry.ximi_summary}</p>
        </div>
      )}
    </motion.div>
  );
}

