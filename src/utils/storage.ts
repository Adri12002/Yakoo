import { Card } from '../types';
import { getSettings } from '../pages/Settings';
import { db } from './firebase';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';

const STORAGE_KEY = 'mandarin-anki-cards';
const REVIEW_LOG_KEY = 'mandarin-anki-review-log';
const STORIES_KEY = 'mandarin-anki-stories';
const COLLECTION_NAME = 'anki_users';

interface DailyLog {
  date: string; // ISO date YYYY-MM-DD
  newCardsCount: number;
  totalReviews: number;
  timeSpent: number; // milliseconds
}

// Interfaces for Story structure
export interface StoryWord {
  hanzi: string;
  pinyin: string;
  translation: string;
  type: 'known' | 'struggle' | 'new';
}

export interface StorySentence {
  id: string;
  text: string;
  translation: string;
  words: StoryWord[];
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

export interface StoryData {
  title: string;
  sentences: StorySentence[];
  quiz: QuizQuestion[];
}

export interface SavedStory {
  id: string;
  date: string;
  title: string;
  data: StoryData; // Typed story object
}

export const storage = {
  /**
   * Retrieves all cards from local storage and migrates them to FSRS format if necessary.
   */
  getCards: (): Card[] => {
    try {
      const json = localStorage.getItem(STORAGE_KEY);
      if (!json) return [];
      const cards: Card[] = JSON.parse(json);
      return storage.migrateToFsrs(cards);
    } catch (e) {
      console.error('Failed to load cards', e);
      return [];
    }
  },

  /**
   * Migration: Convert old SM-2 cards to FSRS format on the fly.
   */
  migrateToFsrs: (cards: Card[]): Card[] => {
    let changed = false;
    const migrated = cards.map(c => {
      if (c.srsStability !== undefined) return c;

      changed = true;
      const s = c.srsInterval || 0;
      const d = c.srsEaseFactor ? Math.max(1, Math.min(10, 11 - (c.srsEaseFactor * 2))) : 5;
      
      return {
        ...c,
        srsState: (c.srsRepetitions === 0 ? 'new' : 'review') as 'new' | 'review',
        srsStability: s,
        srsDifficulty: d,
        srsDue: c.srsRepetitions === 0 ? '' : (c.srsDue || new Date().toISOString())
      };
    });

    if (changed) {
      storage.saveCards(migrated as Card[]);
    }
    return migrated as Card[];
  },

  /**
   * Fixes data integrity issues.
   */
  repairDeck: (userId?: string) => {
    const cards = storage.getCards();
    let fixed = 0;
    const repaired = cards.map(c => {
      let needsFix = false;
      let fixedCard = { ...c };

      if (c.srsRepetitions === 0 && c.srsState !== 'new') {
        fixedCard.srsState = 'new';
        fixedCard.srsDue = '';
        needsFix = true;
      }
      else if (c.srsState === 'new' && c.srsDue) {
        fixedCard.srsDue = '';
        needsFix = true;
      }
      else if (c.srsRepetitions === undefined) {
        fixedCard.srsRepetitions = 0;
        fixedCard.srsState = 'new';
        fixedCard.srsDue = '';
        needsFix = true;
      }

      if (needsFix) {
        fixed++;
        return fixedCard as Card;
      }
      return c;
    });

    if (fixed > 0) {
      console.log(`Repaired ${fixed} cards.`);
      storage.saveCards(repaired, userId);
      alert(`Repaired ${fixed} cards. Reloading...`);
      window.location.reload();
    } else {
      alert('Deck looks healthy! No repairs needed.');
    }
  },

  clearDatabase: async (userId?: string) => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(REVIEW_LOG_KEY);
    localStorage.removeItem(STORIES_KEY);
    localStorage.removeItem('mandarin-anki-settings');
    
    if (userId) {
      try {
        await deleteDoc(doc(db, COLLECTION_NAME, userId));
      } catch (e) {
        console.error('Failed to delete cloud data', e);
        alert('Failed to delete cloud data, but local data was cleared.');
      }
    }
    window.location.reload();
  },

  // --- Backup System ---

  createBackup: (cards: Card[]) => {
    try {
      const timestamp = new Date().toISOString();
      const backup = { timestamp, cards };
      
      // Get existing backups
      const backupsStr = localStorage.getItem('mandarin-anki-backups');
      const backups = backupsStr ? JSON.parse(backupsStr) : [];
      
      // Add new backup to start
      backups.unshift(backup);
      
      // Keep only last 3
      if (backups.length > 3) {
        backups.length = 3;
      }
      
      localStorage.setItem('mandarin-anki-backups', JSON.stringify(backups));
    } catch (e) {
      console.error("Backup failed", e);
    }
  },

  getBackups: (): { timestamp: string; cards: Card[] }[] => {
    try {
      const str = localStorage.getItem('mandarin-anki-backups');
      return str ? JSON.parse(str) : [];
    } catch {
      return [];
    }
  },

  restoreBackup: (backupIndex: number) => {
    try {
      const backups = storage.getBackups();
      if (backups[backupIndex]) {
        const cards = backups[backupIndex].cards;
        storage.saveCards(cards); // Save will sync to cloud too
        alert(`Restored backup from ${new Date(backups[backupIndex].timestamp).toLocaleString()}`);
        window.location.reload();
      }
    } catch (e) {
      alert("Failed to restore backup.");
    }
  },

  saveCards: (cards: Card[], userId?: string) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
      
      // Auto-Backup Logic: Backup if > 1 hour since last
      const lastBackupTime = localStorage.getItem('mandarin-anki-last-backup-time');
      const now = Date.now();
      if (!lastBackupTime || now - parseInt(lastBackupTime) > 3600000) {
        storage.createBackup(cards);
        localStorage.setItem('mandarin-anki-last-backup-time', now.toString());
      }

    } catch (e) {
      console.error('Failed to save cards locally', e);
    }

    if (userId) {
      storage.syncToCloud(cards, userId);
    }
  },

  // --- Story Persistence ---

  getStories: (): SavedStory[] => {
    try {
      const json = localStorage.getItem(STORIES_KEY);
      if (!json) return [];
      return JSON.parse(json);
    } catch {
      return [];
    }
  },

  saveStory: (story: SavedStory, userId?: string) => {
    const stories = storage.getStories();
    const index = stories.findIndex(s => s.id === story.id);
    let newStories;
    if (index !== -1) {
      newStories = [...stories];
      newStories[index] = story;
    } else {
      newStories = [story, ...stories];
    }
    
    localStorage.setItem(STORIES_KEY, JSON.stringify(newStories));
    
    if (userId) {
      storage.syncToCloud(storage.getCards(), userId); 
    }
  },

  deleteStory: (id: string, userId?: string) => {
    const stories = storage.getStories().filter(s => s.id !== id);
    localStorage.setItem(STORIES_KEY, JSON.stringify(stories));
    if (userId) {
      storage.syncToCloud(storage.getCards(), userId);
    }
  },

  // --- Daily Limits & Stats Tracking ---

  getDailyLog: (): DailyLog => {
    try {
      const json = localStorage.getItem(REVIEW_LOG_KEY);
      const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD in local time
      
      if (json) {
        const log: DailyLog = JSON.parse(json);
        if (log.date === today) {
          return { 
            date: today, 
            newCardsCount: log.newCardsCount || 0, 
            totalReviews: log.totalReviews || 0,
            timeSpent: log.timeSpent || 0
          };
        }
      }
      return { date: today, newCardsCount: 0, totalReviews: 0, timeSpent: 0 };
    } catch {
      return { date: new Date().toLocaleDateString('en-CA'), newCardsCount: 0, totalReviews: 0, timeSpent: 0 };
    }
  },

  getDailyCount: (): number => {
    return storage.getDailyLog().newCardsCount;
  },

  incrementDailyCount: () => {
    const log = storage.getDailyLog();
    log.newCardsCount += 1;
    localStorage.setItem(REVIEW_LOG_KEY, JSON.stringify(log));
  },

  logReview: (isNewCard: boolean, timeElapsed: number = 0) => {
    const log = storage.getDailyLog();
    log.totalReviews += 1;
    if (isNewCard) log.newCardsCount += 1;
    log.timeSpent += timeElapsed;
    localStorage.setItem(REVIEW_LOG_KEY, JSON.stringify(log));
  },

  // --- Cloud Methods ---

  syncToCloud: async (cards: Card[], userId: string) => {
    if (!userId) return;
    
    // Offline Check
    if (!navigator.onLine) {
        console.log("Offline: Queuing sync for later.");
        localStorage.setItem('mandarin-anki-sync-pending', 'true');
        return;
    }

    try {
      const stories = storage.getStories();
      const settings = getSettings();
      
      await setDoc(doc(db, COLLECTION_NAME, userId), {
        cards,
        stories, 
        settings,
        lastUpdated: new Date().toISOString()
      });
      // Clear pending flag on success
      localStorage.removeItem('mandarin-anki-sync-pending');
    } catch (e) {
      console.error('Failed to sync to cloud', e);
      // Set pending flag on error too, to retry later
      localStorage.setItem('mandarin-anki-sync-pending', 'true');
    }
  },

  loadFromCloud: async (userId: string): Promise<Card[] | null> => {
    if (!userId) return null;
    try {
      const docRef = doc(db, COLLECTION_NAME, userId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        let cloudCards = data.cards as Card[];
        cloudCards = storage.migrateToFsrs(cloudCards);
        
        if (data.stories) {
          localStorage.setItem(STORIES_KEY, JSON.stringify(data.stories));
        }

        if (data.settings) {
           const current = getSettings();
           const merged = { 
             ...current, 
             ...data.settings,
             mistralApiKey: data.settings.mistralApiKey || current.mistralApiKey 
           };
           localStorage.setItem('mandarin-anki-settings', JSON.stringify(merged));
        }
        
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cloudCards));
        return cloudCards;
      }
    } catch (e) {
      console.error('Failed to load from cloud', e);
    }
    return null;
  }
};
