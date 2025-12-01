export interface Card {
  id: string;
  hanzi: string;
  pinyin: string;
  translation: string;
  hint?: string;

  // Legacy SM-2 Fields (Kept for migration/fallback)
  srsEaseFactor?: number;
  srsInterval?: number; // in days
  srsRepetitions?: number;

  // FSRS v4.5 Fields
  srsState: 'new' | 'learning' | 'review' | 'relearning';
  srsStability: number;   // S: Memory stability (days until R=90%)
  srsDifficulty: number;  // D: Difficulty (1-10)
  srsDue: string;         // ISO timestamp
  srsLastReview?: string; // ISO timestamp of last review
}

export type ReviewRating = 'again' | 'hard' | 'good' | 'easy';

export type ReviewDirection = 'zh-fr' | 'fr-zh' | 'mixed';
