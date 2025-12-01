import { useEffect, useState, useCallback, useRef } from 'react';
import { Settings, RefreshCw, CheckCircle, Clock, BarChart } from 'lucide-react';
import { Card, ReviewDirection, ReviewRating } from '../types';
import { storage } from '../utils/storage';
import { isCardDue } from '../utils/srs';
import { fsrs } from '../utils/fsrs';
import CardDisplay from '../components/CardDisplay';

import { getSettings } from './Settings';
import { useAuth } from '../contexts/AuthContext';

export default function Review({ onExit }: { onExit?: () => void }) {
  const { user } = useAuth();
  const [queue, setQueue] = useState<Card[]>([]);
  const [initialQueueLength, setInitialQueueLength] = useState(0);
  const [completedCount, setCompletedCount] = useState(0); // Session count
  const [isFlipped, setIsFlipped] = useState(false);
  const [direction, setDirection] = useState<ReviewDirection>('zh-fr');
  const [activeDirection, setActiveDirection] = useState<'zh-fr' | 'fr-zh'>('zh-fr');
  const [isLoading, setIsLoading] = useState(true);
  
  const startTimeRef = useRef<number>(Date.now());

  // Initialize Queue
  useEffect(() => {
    const loadQueue = () => {
      const allCards = storage.getCards();
      const settings = getSettings();

      let restoredQueue: Card[] = [];
      let restoredLength = 0;
      let restoredCount = 0;

      // 1. Try to load persisted active session from localStorage
      try {
        const savedSession = localStorage.getItem('mandarin-anki-session');
        if (savedSession) {
          const session = JSON.parse(savedSession);
          // Validate if session is still valid (e.g. not empty)
          if (session.queue && session.queue.length > 0) {
            restoredQueue = session.queue;
            restoredLength = session.initialQueueLength || session.queue.length;
            restoredCount = session.completedCount || 0;
          }
        }
      } catch (e) {
        console.error("Failed to load session", e);
      }

      // 2. Calculate FRESH due cards (what *should* be in the deck now)
      
      // Due cards (Review Queue)
      const dueCards = allCards
        .filter(c => c.srsState === 'review' && isCardDue(c))
        .sort((a, b) => new Date(a.srsDue).getTime() - new Date(b.srsDue).getTime());

      // Learning / Relearning Cards (Priority Queue)
      const activeLearningCards = allCards
        .filter(c => (c.srsState === 'learning' || c.srsState === 'relearning') && isCardDue(c));

      // New cards (limit based on settings)
      const dailyLimit = settings.newCardsPerDay;
      const reviewedToday = storage.getDailyCount();
      const remainingQuota = Math.max(0, dailyLimit - reviewedToday);

      const newCards = allCards
        .filter(c => c.srsState === 'new') 
        .slice(0, remainingQuota);

      // Combined FRESH candidate list
      let freshCandidates = [...activeLearningCards, ...dueCards, ...newCards];
      
      // Apply limit to fresh candidates if needed (though usually we want all review cards)
      if (settings.reviewLimit > 0) {
         // If we already have a restored queue, we might exceed the limit, but that's okay,
         // the user wants "Resume" behavior.
         freshCandidates = freshCandidates.slice(0, settings.reviewLimit);
      }

      // 3. MERGE: Add any fresh candidates that are NOT in the restored queue
      // We identify cards by ID.
      const restoredIds = new Set(restoredQueue.map(c => c.id));
      const newToAdd = freshCandidates.filter(c => !restoredIds.has(c.id));
      
      // If we have new cards to add
      let finalQueue = [...restoredQueue];
      if (newToAdd.length > 0) {
          // Append them to the end, or shuffle them into the remaining pile?
          // User said: "new words to learn again just queue up and are mixed"
          // Let's shuffle them into the *remaining* cards to keep it dynamic, 
          // BUT safeguard the *very first* card if the user is mid-review? 
          // Actually, simplest is to append them to ensure we don't disrupt the immediate flow,
          // OR shuffle them properly if the user wants "mixed".
          
          // Let's append new Learning/Due cards to the FRONT (priority) and New cards to the BACK?
          // No, simplest is just append and let user work through.
          // If we want "mixed", we can shuffle the whole thing, but that disrupts "Resume exactly where I left off".
          
          // COMPROMISE: Append to end to preserve current order, but allow "new" due cards to be seen.
          finalQueue = [...restoredQueue, ...newToAdd];
          
          // Update length to reflect expanded deck
          restoredLength += newToAdd.length;
      }
      
      // If we had no restored queue, finalQueue is just freshCandidates
      if (restoredQueue.length === 0) {
          finalQueue = freshCandidates;
          restoredLength = finalQueue.length;
          restoredCount = 0;
      }

      // Remove duplicates (sanity check) and ensure we have full card objects
      finalQueue = Array.from(new Set(finalQueue.map(c => c.id)))
        .map(id => allCards.find(c => c.id === id)!);

      setQueue(finalQueue);
      setInitialQueueLength(restoredLength);
      setCompletedCount(restoredCount);
      setIsLoading(false);
      
      // Reset timer for first card
      startTimeRef.current = Date.now();

      // SAVE SESSION (Initial or Merged)
      if (finalQueue.length > 0) {
        localStorage.setItem('mandarin-anki-session', JSON.stringify({
          queue: finalQueue,
          initialQueueLength: restoredLength,
          completedCount: restoredCount
        }));
      } else {
         // If empty after all that, clear it
         localStorage.removeItem('mandarin-anki-session');
      }
    };

    loadQueue();
  }, []);

  // Save session on queue update
  useEffect(() => {
    // Always save state if we have a queue or have done some work
    if (queue.length > 0 || completedCount > 0) {
       if (queue.length > 0) {
         localStorage.setItem('mandarin-anki-session', JSON.stringify({
           queue,
           initialQueueLength,
           completedCount
         }));
       } else {
         // Clear session when done
         localStorage.removeItem('mandarin-anki-session');
       }
    }
  }, [queue, initialQueueLength, completedCount]);

  // Determine direction for current card
  useEffect(() => {
    if (direction === 'mixed') {
      setActiveDirection(Math.random() > 0.5 ? 'zh-fr' : 'fr-zh');
    } else {
      setActiveDirection(direction);
    }
  }, [completedCount, direction]);

  const handleRate = useCallback((rating: ReviewRating) => {
    const currentCard = queue[0];
    if (!currentCard) return;

    const endTime = Date.now();
    const duration = endTime - startTimeRef.current;
    startTimeRef.current = endTime; // Reset for next card

    // AI Coach Logic (Optional): If "Again", trigger a mini-quiz
    if (rating === 'again') {
       // Could track this for "Focus" mode later
    }

    // 1. Calculate new stats
    const updates = fsrs.review(currentCard, rating);
    const updatedCard = { ...currentCard, ...updates };

    // 2. Update storage & Logs
    const allCards = storage.getCards();
    const cardIndex = allCards.findIndex(c => c.id === currentCard.id);
    if (cardIndex !== -1) {
      allCards[cardIndex] = updatedCard;
      storage.saveCards(allCards, user?.uid);
      
      // LOGGING: Update daily stats
      const isNew = currentCard.srsState === 'new';
      storage.logReview(isNew, duration);
    }

    // 3. Queue Management (Interleaving)
    setIsFlipped(false);

    if (rating === 'again') {
        // Re-insert into queue soon (e.g., 3rd position or end if short)
        setQueue(prev => {
            const next = [...prev];
            next.shift(); // Remove current
            // Insert back at index 3 or end
            const insertIndex = Math.min(next.length, 3);
            next.splice(insertIndex, 0, updatedCard);
            return next;
        });
        // Don't increment completedCount if we failed it, we'll see it again
    } else {
        // Move to next
        setQueue(prev => {
            const next = [...prev];
            next.shift();
            return next;
        });
        setCompletedCount(prev => prev + 1);
    }
  }, [queue, user]);

  // ... Keyboard shortcuts ...
  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      // Space to flip
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault(); // Prevent scrolling
        if (!isFlipped) {
          setIsFlipped(true);
        }
        return;
      }

      // Numbers for rating (only if flipped)
      if (isFlipped) {
        switch (e.key) {
          case '1': handleRate('again'); break;
          case '2': handleRate('hard'); break;
          case '3': handleRate('good'); break;
          case '4': handleRate('easy'); break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFlipped, handleRate]);

  // ...
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  // Empty State (Initial)
  if (queue.length === 0 && completedCount === 0) {
    // Empty State if no cards at all
    const allCards = storage.getCards();
    if (allCards.length === 0) {
      return (
        <div className="text-center py-16 space-y-6">
          <div className="w-20 h-20 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto">
            <Settings className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800">Deck is Empty</h2>
          <p className="text-gray-600">Import some words to start learning!</p>
          <button 
            onClick={() => onExit ? onExit() : window.location.reload()} 
            className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            Go to Import
          </button>
        </div>
      );
    }
  }

  // Finished State
  if (queue.length === 0) {
    const settings = getSettings();
    const dailyLimit = settings.newCardsPerDay;
    const reviewedToday = storage.getDailyCount(); // This is actually 'newCardsCount'
    const dailyLog = storage.getDailyLog();
    const allCards = storage.getCards();
    
    // Check if we hit the new card limit
    const hasMoreNewCards = allCards.some(c => c.srsState === 'new') && reviewedToday >= dailyLimit;

    const loadMoreNewCards = () => {
        // Override limit: Add 10 more new cards
        const moreCards = allCards
            .filter(c => c.srsState === 'new')
            .slice(0, 10);
        
        if (moreCards.length > 0) {
            setQueue(moreCards);
            setInitialQueueLength(prev => prev + moreCards.length);
            startTimeRef.current = Date.now(); // Restart timer
        }
    };

    // Format time
    const minutes = Math.floor((dailyLog.timeSpent || 0) / 60000);
    
    return (
      <div className="text-center py-8 sm:py-16 space-y-6 max-w-md mx-auto">
        <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm animate-bounce-in">
          <CheckCircle className="w-12 h-12" />
        </div>
        
        <h2 className="text-3xl font-bold text-gray-800">
          {hasMoreNewCards ? "Daily Limit Reached" : "All Caught Up!"}
        </h2>
        
        <div className="bg-gray-50 rounded-xl p-6 border border-gray-100 space-y-4">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Today's Progress</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 text-indigo-600 mb-1">
                <BarChart className="w-4 h-4" />
                <span className="text-xs font-bold uppercase">Reviews</span>
              </div>
              <div className="text-2xl font-bold text-gray-800">{dailyLog.totalReviews}</div>
            </div>
            
            <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 text-amber-600 mb-1">
                <Clock className="w-4 h-4" />
                <span className="text-xs font-bold uppercase">Time</span>
              </div>
              <div className="text-2xl font-bold text-gray-800">{minutes}m</div>
            </div>
          </div>

          {dailyLog.newCardsCount > 0 && (
             <p className="text-sm text-emerald-600 font-medium pt-2 border-t border-gray-200">
               You learned {dailyLog.newCardsCount} new words!
             </p>
          )}
        </div>

        {hasMoreNewCards && (
            <div className="flex flex-col items-center gap-3 pt-4">
              <button
                onClick={loadMoreNewCards}
                className="w-full py-3 bg-amber-100 text-amber-800 font-bold rounded-lg hover:bg-amber-200 transition-colors"
              >
                Study 10 More New Words
              </button>
              <span className="text-xs text-gray-400">You can change the daily limit in Settings</span>
            </div>
        )}

        <button 
          onClick={() => onExit ? onExit() : window.location.reload()} 
          className="w-full py-3 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  const currentCard = queue[0];

  return (
    <div className="max-w-md mx-auto space-y-6 pb-20 sm:pb-0">
      {/* Header / Controls */}
      <div className="flex items-center justify-between text-sm text-gray-500 bg-white p-3 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-700">
            Card {completedCount + 1} / {initialQueueLength}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4" />
          <select 
            value={direction}
            onChange={(e) => setDirection(e.target.value as ReviewDirection)}
            className="bg-transparent border-none focus:ring-0 font-medium text-gray-700 cursor-pointer"
          >
            <option value="zh-fr">ZH → FR</option>
            <option value="fr-zh">FR → ZH</option>
            <option value="mixed">Mixed</option>
          </select>
        </div>
      </div>

      {/* Card */}
      <CardDisplay
        key={currentCard.id} // Force re-mount on card change to reset internal state if any
        card={currentCard}
        direction={activeDirection}
        isFlipped={isFlipped}
        onFlip={() => setIsFlipped(true)}
        onRate={handleRate}
      />
    </div>
  );
}
