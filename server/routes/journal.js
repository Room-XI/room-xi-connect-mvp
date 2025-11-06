import { Router } from 'express';
import { eq, desc, and, gte, sql } from 'drizzle-orm';
import { db } from '../db.js';
import { users, checkins } from '../schema.js';
import crypto from 'crypto';

const router = Router();

// Journal entries table (we'll add this to schema later)
const journalEntries = {
  id: 'id',
  userId: 'user_id',
  date: 'date',
  title: 'title',
  content: 'content',
  encrypted: 'encrypted',
  encryptedContent: 'encrypted_content',
  mood: 'mood',
  moodLevel: 'mood_level',
  tags: 'tags',
  wordCount: 'word_count',
  createdAt: 'created_at',
  updatedAt: 'updated_at'
};

// Encryption helper functions
function encrypt(text, key) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return {
    encrypted: encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex')
  };
}

function decrypt(encryptedData, key) {
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm', 
    key, 
    Buffer.from(encryptedData.iv, 'hex')
  );
  decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
  let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// Get user's encryption key (derived from user ID and a server secret)
function getUserKey(userId) {
  const serverSecret = process.env.ENCRYPTION_SECRET || 'default-secret-change-in-production';
  return crypto.scryptSync(userId, serverSecret, 32);
}

/**
 * Get all journal entries for the authenticated user
 */
router.get('/entries', async (req, res) => {
  if (!req.session?.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    // For now, return mock data since journal table isn't in schema yet
    const mockEntries = [
      {
        id: '1',
        date: new Date().toISOString(),
        title: 'Feeling Clear Today',
        content: 'Had a great day today. Spent time with friends at the park and felt really connected. The weather was perfect and I felt like myself again.',
        mood: 'clear',
        moodLevel: 4,
        encrypted: false,
        wordCount: 28,
        tags: ['friends', 'outdoors', 'positive'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: '2',
        date: new Date(Date.now() - 86400000).toISOString(),
        title: 'Stormy Thoughts',
        content: 'Feeling overwhelmed with schoolwork. Too many assignments and not enough time. Need to find better ways to manage stress.',
        mood: 'stormy',
        moodLevel: 2,
        encrypted: true,
        wordCount: 20,
        tags: ['school', 'stress'],
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 86400000).toISOString()
      }
    ];

    res.json({ entries: mockEntries });
  } catch (error) {
    console.error('Error fetching journal entries:', error);
    res.status(500).json({ error: 'Failed to fetch journal entries' });
  }
});

/**
 * Create a new journal entry
 */
router.post('/entries', async (req, res) => {
  if (!req.session?.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { title, content, tags, encrypted } = req.body;

  if (!content) {
    return res.status(400).json({ error: 'Content is required' });
  }

  try {
    const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
    let processedContent = content;
    let encryptedData = null;

    // Encrypt content if requested
    if (encrypted) {
      const key = getUserKey(req.session.userId);
      encryptedData = encrypt(content, key);
      processedContent = '[Encrypted]';
    }

    // Get current mood from recent check-in
    const recentCheckin = await db
      .select()
      .from(checkins)
      .where(eq(checkins.userId, req.session.userId))
      .orderBy(desc(checkins.createdAt))
      .limit(1);

    const mood = recentCheckin[0]?.mood || null;

    // For now, return mock saved entry
    const newEntry = {
      id: crypto.randomUUID(),
      userId: req.session.userId,
      date: new Date().toISOString(),
      title: title || null,
      content: processedContent,
      encrypted,
      encryptedData,
      mood,
      moodLevel: recentCheckin[0]?.moodLevel || null,
      tags: tags || [],
      wordCount,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    res.json(newEntry);
  } catch (error) {
    console.error('Error creating journal entry:', error);
    res.status(500).json({ error: 'Failed to create journal entry' });
  }
});

/**
 * Get journal statistics
 */
router.get('/stats', async (req, res) => {
  if (!req.session?.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    // Calculate stats based on check-ins and mock journal data
    const userCheckins = await db
      .select()
      .from(checkins)
      .where(eq(checkins.userId, req.session.userId))
      .orderBy(desc(checkins.createdAt));

    // Mock journal stats
    const stats = {
      totalEntries: 47,
      currentStreak: 5,
      longestStreak: 12,
      totalWords: 8543,
      avgMoodWithJournal: 4.2,
      avgMoodWithoutJournal: 3.5
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching journal stats:', error);
    res.status(500).json({ error: 'Failed to fetch journal statistics' });
  }
});

/**
 * Get journal entry by ID
 */
router.get('/entries/:id', async (req, res) => {
  if (!req.session?.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { id } = req.params;

  try {
    // Mock implementation
    const entry = {
      id,
      date: new Date().toISOString(),
      title: 'Sample Entry',
      content: 'This is a sample journal entry content.',
      mood: 'clear',
      encrypted: false,
      wordCount: 7,
      tags: ['sample'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    res.json(entry);
  } catch (error) {
    console.error('Error fetching journal entry:', error);
    res.status(500).json({ error: 'Failed to fetch journal entry' });
  }
});

/**
 * Update journal entry
 */
router.put('/entries/:id', async (req, res) => {
  if (!req.session?.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { id } = req.params;
  const { title, content, tags } = req.body;

  try {
    // Mock implementation
    const updatedEntry = {
      id,
      title,
      content,
      tags,
      updatedAt: new Date().toISOString()
    };

    res.json(updatedEntry);
  } catch (error) {
    console.error('Error updating journal entry:', error);
    res.status(500).json({ error: 'Failed to update journal entry' });
  }
});

/**
 * Delete journal entry
 */
router.delete('/entries/:id', async (req, res) => {
  if (!req.session?.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { id } = req.params;

  try {
    // Mock implementation
    res.json({ success: true, message: 'Entry deleted' });
  } catch (error) {
    console.error('Error deleting journal entry:', error);
    res.status(500).json({ error: 'Failed to delete journal entry' });
  }
});

export default router;