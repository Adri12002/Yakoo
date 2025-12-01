import { Card, ReviewRating } from '../types';

// FSRS v4.5 Parameters (Default Optimization)
const P = {
  request_retention: 0.9, // 90% retention target
  maximum_interval: 36500,
  w: [
    0.4, 0.6, 2.4, 5.8, // Initial Stability for Again, Hard, Good, Easy
    4.93, 0.94, 0.86, 0.01, // Difficulty Factors
    1.49, 0.14, 0.94, // Stability Factors
    2.18, 0.05, 0.34, 1.26, // Retrievability Factors
    0.29, 2.61 // Hard Penalty & Easy Bonus
  ]
};

/**
 * FSRS v4.5 Implementation
 * Reference: https://github.com/open-spaced-repetition/fsrs4anki
 */

export const fsrs = {
  /**
   * Calculates the next state of the card based on the rating.
   */
  review: (card: Card, rating: ReviewRating, now: Date = new Date()): Partial<Card> => {
    const lastReview = card.srsLastReview ? new Date(card.srsLastReview) : now;
    const elapsedDays = Math.max(0, (now.getTime() - lastReview.getTime()) / (1000 * 60 * 60 * 24));
    
    let S = card.srsStability || 0;
    let D = card.srsDifficulty || 0;
    const retrievability = Math.pow(1 + elapsedDays / (9 * S), -1); // Forgetting Curve

    // 1. Determine Grade
    let grade = 0;
    switch(rating) {
      case 'again': grade = 1; break;
      case 'hard': grade = 2; break;
      case 'good': grade = 3; break;
      case 'easy': grade = 4; break;
    }

    // 2. Update State & Stability/Difficulty
    if (card.srsState === 'new') {
      // Initial Review
      D = initDifficulty(grade);
      S = initStability(grade);
      
      // If 'again' on new card -> Learning
      const nextState = rating === 'again' ? 'learning' : 'review';
      return {
        srsState: nextState,
        srsStability: parseFloat(S.toFixed(2)),
        srsDifficulty: parseFloat(D.toFixed(2)),
        srsDue: nextInterval(S, now, nextState === 'learning'),
        srsLastReview: now.toISOString()
      };
    } 
    
    // D' = D - w6 * (grade - 3)
    // D_new = w5 * D0 + (1 - w5) * D'
    const nextD = nextDifficulty(D, grade);

    // Update Stability
    let nextS = S;
    if (rating === 'again') {
        nextS = nextForgetStability(D, S, retrievability);
    } else {
        nextS = nextRecallStability(D, S, retrievability, grade);
    }

    // State Transition
    let nextState = card.srsState;
    if (rating === 'again') {
        nextState = 'relearning';
    } else if (rating === 'easy' || rating === 'good') {
        nextState = 'review';
    }

    return {
        srsState: nextState,
        srsStability: parseFloat(nextS.toFixed(2)),
        srsDifficulty: parseFloat(nextD.toFixed(2)),
        srsDue: nextInterval(nextS, now, nextState === 'relearning'),
        srsLastReview: now.toISOString()
    };
  },

  /**
   * Returns formatted intervals for all possible ratings for a given card.
   */
  preview: (card: Card): Record<ReviewRating, string> => {
     const now = new Date();
     const ratings: ReviewRating[] = ['again', 'hard', 'good', 'easy'];
     const result = {} as Record<ReviewRating, string>;
     
     ratings.forEach(r => {
         const next = fsrs.review(card, r, now);
         if (next.srsDue) {
             const dueDate = new Date(next.srsDue);
             const diffMinutes = (dueDate.getTime() - now.getTime()) / (1000 * 60);
             result[r] = formatTime(diffMinutes);
         } else {
             result[r] = '?';
         }
     });
     return result;
  }
};

// --- Helper for Time Formatting ---
function formatTime(minutes: number): string {
    if (minutes < 1) return '< 1m';
    if (minutes < 60) return `${Math.round(minutes)}m`;
    const hours = minutes / 60;
    if (hours < 24) return `${Math.round(hours)}h`;
    const days = hours / 24;
    if (days < 30) return `${Math.round(days)}d`;
    if (days < 365) return `${Math.round(days / 30)}mo`;
    return `${(days / 365).toFixed(1)}y`;
}

// --- Core Formulas ---

function initStability(grade: number): number {
  return Math.max(0.1, P.w[grade - 1]);
}

function initDifficulty(grade: number): number {
  const d = P.w[4] - (grade - 3) * P.w[5];
  return Math.min(10, Math.max(1, d));
}

function nextDifficulty(D: number, grade: number): number {
  const next_d = D - P.w[6] * (grade - 3);
  const new_d = P.w[7] * initDifficulty(4) + (1 - P.w[7]) * next_d;
  return Math.min(10, Math.max(1, new_d));
}

function nextRecallStability(D: number, S: number, R: number, grade: number): number {
  const hardPenalty = grade === 2 ? P.w[15] : 1;
  const easyBonus = grade === 4 ? P.w[16] : 1;
  
  const exp_w8 = Math.exp(P.w[8]);
  const pow_S_w9 = Math.pow(S, -P.w[9]);
  const exp_w10_R = Math.exp(P.w[10] * (1 - R)) - 1;
  
  const newS = S * (1 + exp_w8 * (11 - D) * pow_S_w9 * exp_w10_R * hardPenalty * easyBonus);
  return Math.min(P.maximum_interval, newS);
}

function nextForgetStability(D: number, S: number, R: number): number {
  const newS = P.w[11] * Math.pow(D, -P.w[12]) * (Math.pow(S + 1, P.w[13]) - 1) * Math.exp(P.w[14] * (1 - R));
  return Math.max(0.1, newS);
}

function nextInterval(S: number, now: Date, isShortTerm: boolean = false): string {
  const factor = 9 * (1 / P.request_retention - 1);
  // For short term (learning/relearning), we don't enforce min 1 day
  // We can allow fractional days or smaller intervals based on stability
  
  let days = S * factor;
  if (!isShortTerm) {
      days = Math.max(1, Math.round(days)); // Normal review: min 1 day, integer days
  } else {
      // Learning/Relearning: Allow fractional days down to minutes?
      // Stability is usually < 1 for these steps.
      // E.g. S=0.1 -> Interval ~ 0.1 days ~ 2.4 hours
      // Let's enforce a minimum of 5 minutes for sanity
      days = Math.max(0.0035, days); // ~5 mins
  }
  
  const dueDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  return dueDate.toISOString();
}

