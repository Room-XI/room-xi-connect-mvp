import { Router } from 'express';
import { eq, desc, and, gte, sql } from 'drizzle-orm';
import { db } from '../db.js';
import { users, checkins, journalEntries } from '../schema.js';
import crypto from 'crypto';

const router = Router();

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
  const serverSecret = process.env.ENCRYPTION_SECRET;
  if (!serverSecret) {
    throw new Error('ENCRYPTION_SECRET environment variable is required for journal encryption');
  }
  
  // Use HKDF to derive a 32-byte key for AES-256-GCM
  return crypto.hkdfSync(
    'sha256',
    Buffer.from(serverSecret),
    Buffer.alloc(0), // No salt
    Buffer.from(`room-xi-journal-${userId}`), // Info parameter includes userId
    32
  );
}

/**
 * Get all journal entries for the authenticated user
 */
router.get('/entries', async (req, res) => {
  if (!req.session?.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    // Fetch actual entries from database
    const entries = await db
      .select()
      .from(journalEntries)
      .where(eq(journalEntries.youthId, req.session.userId))
      .orderBy(desc(journalEntries.createdAt));

    // Decrypt encrypted entries
    const key = getUserKey(req.session.userId);
    const processedEntries = entries.map(entry => {
      if (entry.encrypted && entry.encryptedContent) {
        try {
          // Only decrypt if it's actually encrypted
          const decryptedContent = decrypt(entry.encryptedContent, key);
          return {
            ...entry,
            content: decryptedContent,
            date: entry.createdAt // Use createdAt as date
          };
        } catch (error) {
          console.error('Error decrypting entry:', error);
          return {
            ...entry,
            content: '[Decryption Error]',
            date: entry.createdAt
          };
        }
      }
      return {
        ...entry,
        date: entry.createdAt // Use createdAt as date
      };
    });

    res.json({ entries: processedEntries });
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

  const { title, content, tags, encrypted, mood: moodName } = req.body;

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
      processedContent = '[Encrypted]'; // Store placeholder in plain text field
    }

    // Get current mood from recent check-in
    const recentCheckin = await db
      .select()
      .from(checkins)
      .where(eq(checkins.userId, req.session.userId))
      .orderBy(desc(checkins.createdAt))
      .limit(1);

    const mood = recentCheckin[0]?.mood || null;
    const moodLevel = recentCheckin[0]?.moodLevel || null;

    // Map mood names to levels if needed
    const moodMap = { cold: 1, stormy: 2, foggy: 3, clear: 4, breezy: 5, aurora: 6 };
    const calculatedMoodLevel = moodName ? moodMap[moodName.toLowerCase()] : moodLevel;

    // Insert the new entry into database
    const [newEntry] = await db
      .insert(journalEntries)
      .values({
        youthId: req.session.userId,
        title: title || null,
        content: encrypted ? null : processedContent, // Store content only if not encrypted
        encrypted: encrypted || false,
        encryptedContent: encryptedData,
        mood: calculatedMoodLevel,
        moodName: moodName || mood,
        tags: tags || [],
        wordCount,
        ximiConversation: false,
        prompt: null
      })
      .returning();

    // Return the entry with decrypted content if it was encrypted
    res.json({
      ...newEntry,
      content: content, // Return the original content to the client
      date: newEntry.createdAt
    });
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
  const { title, content, tags, encrypted, mood: moodName } = req.body;

  try {
    // First check if the entry belongs to this user
    const [existingEntry] = await db
      .select()
      .from(journalEntries)
      .where(and(
        eq(journalEntries.id, id),
        eq(journalEntries.youthId, req.session.userId)
      ));

    if (!existingEntry) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    let processedContent = content;
    let encryptedData = null;
    let wordCount = existingEntry.wordCount;

    if (content) {
      wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
      
      // Handle encryption if needed
      if (encrypted) {
        const key = getUserKey(req.session.userId);
        encryptedData = encrypt(content, key);
        processedContent = null; // Don't store plain text if encrypted
      }
    }

    // Map mood names to levels if needed
    const moodMap = { cold: 1, stormy: 2, foggy: 3, clear: 4, breezy: 5, aurora: 6 };
    const calculatedMoodLevel = moodName ? moodMap[moodName.toLowerCase()] : existingEntry.mood;

    // Update the entry
    const [updatedEntry] = await db
      .update(journalEntries)
      .set({
        title: title !== undefined ? title : existingEntry.title,
        content: encrypted ? null : (processedContent !== undefined ? processedContent : existingEntry.content),
        encrypted: encrypted !== undefined ? encrypted : existingEntry.encrypted,
        encryptedContent: encryptedData || existingEntry.encryptedContent,
        mood: calculatedMoodLevel,
        moodName: moodName || existingEntry.moodName,
        tags: tags !== undefined ? tags : existingEntry.tags,
        wordCount: wordCount,
        updatedAt: new Date()
      })
      .where(eq(journalEntries.id, id))
      .returning();

    res.json({
      ...updatedEntry,
      content: content || updatedEntry.content, // Return the content
      date: updatedEntry.createdAt
    });
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
    // Check if the entry belongs to this user
    const [existingEntry] = await db
      .select()
      .from(journalEntries)
      .where(and(
        eq(journalEntries.id, id),
        eq(journalEntries.youthId, req.session.userId)
      ));

    if (!existingEntry) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    // Delete the entry
    await db
      .delete(journalEntries)
      .where(eq(journalEntries.id, id));

    res.json({ success: true, message: 'Entry deleted' });
  } catch (error) {
    console.error('Error deleting journal entry:', error);
    res.status(500).json({ error: 'Failed to delete journal entry' });
  }
});

export default router;