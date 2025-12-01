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
  count: number;
}

// We need to import Story types or define a generic one here to avoid circular deps if types are in components
// Ideally types should be in types.ts. For now using 'any' or defining minimal interface
export interface SavedStory {
  id: string;
  date: string;
  title: string;
  data: any; // The full story object
}

export const storage = {
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

  // Migration: Convert old SM-2 cards to FSRS format on the fly
  migrateToFsrs: (cards: Card[]): Card[] => {
    let changed = false;
    const migrated = cards.map(c => {
      if (c.srsStability !== undefined) return c; // Already FSRS

      changed = true;
      // Heuristic conversion
      const s = c.srsInterval || 0;
      const d = c.srsEaseFactor ? Math.max(1, Math.min(10, 11 - (c.srsEaseFactor * 2))) : 5;
      
      return {
        ...c,
        srsState: (c.srsRepetitions === 0 ? 'new' : 'review') as 'new' | 'review',
        srsStability: s,
        srsDifficulty: d,
        // If it's new (0 reps), clear the due date to ensure it enters the "New Card" queue
        srsDue: c.srsRepetitions === 0 ? '' : (c.srsDue || new Date().toISOString())
      };
    });

    if (changed) {
      storage.saveCards(migrated as Card[]);
    }
    return migrated as Card[];
  },

  // Force reset of 0-rep cards to 'new' state if they were incorrectly migrated
  repairDeck: (userId?: string) => {
    const cards = storage.getCards();
    let fixed = 0;
    const repaired = cards.map(c => {
      // Condition 1: Should be new but marked as review (likely due to migration bug)
      if (c.srsRepetitions === 0 && c.srsState !== 'new') {
        fixed++;
        return { ...c, srsState: 'new', srsDue: '' } as Card;
      }
      // Condition 2: Is new, but has a due date (causing it to show as overdue in old Home logic)
      if (c.srsState === 'new' && c.srsDue) {
        fixed++;
        return { ...c, srsDue: '' } as Card;
      }
      // Condition 3: Undefined repetitions (from old imports?) -> assume new
      if (c.srsRepetitions === undefined) {
         fixed++;
         return { ...c, srsRepetitions: 0, srsState: 'new', srsDue: '' } as Card;
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
    localStorage.removeItem('mandarin-anki-settings'); // Also clear settings
    
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

  saveCards: (cards: Card[], userId?: string) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
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
    // Check if exists (update) or new
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
      // We sync EVERYTHING (cards + stories) in one doc for simplicity in this architecture
      // In a larger app, stories should be a subcollection.
      // But to keep it "simple" as requested, we piggyback on the existing sync function logic
      // by creating a dedicated syncStories function or merging data.
      // Let's merge data in syncToCloud to be safe.
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

  // --- Daily Limits Tracking ---

  getDailyCount: (): number => {
    try {
      const json = localStorage.getItem(REVIEW_LOG_KEY);
      if (!json) return 0;
      const log: DailyLog = JSON.parse(json);
      
      const today = new Date().toISOString().split('T')[0];
      if (log.date !== today) {
        return 0; // New day, reset count
      }
      return log.count;
    } catch {
      return 0;
    }
  },

  incrementDailyCount: () => {
    const today = new Date().toISOString().split('T')[0];
    const current = storage.getDailyCount();
    const newLog: DailyLog = { date: today, count: current + 1 };
    localStorage.setItem(REVIEW_LOG_KEY, JSON.stringify(newLog));
  },

  // --- Cloud Methods ---

  syncToCloud: async (cards: Card[], userId: string) => {
    if (!userId) return;
    try {
      // Get current stories and settings to include in sync
      const stories = storage.getStories();
      const settings = getSettings();
      
      await setDoc(doc(db, COLLECTION_NAME, userId), {
        cards,
        stories, 
        settings, // Sync settings (including API Key)
        lastUpdated: new Date().toISOString()
      });
    } catch (e) {
      console.error('Failed to sync to cloud', e);
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
        
        // Load stories
        if (data.stories) {
          localStorage.setItem(STORIES_KEY, JSON.stringify(data.stories));
        }

        // Load settings (if available)
        if (data.settings) {
           // Merge with existing local settings just in case, but cloud takes precedence for key
           const current = getSettings();
           const merged = { ...current, ...data.settings };
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
