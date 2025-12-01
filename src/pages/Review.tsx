import { useEffect, useState, useCallback } from 'react';
import { Settings, RefreshCw, CheckCircle } from 'lucide-react';
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
  const [completedCount, setCompletedCount] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [direction, setDirection] = useState<ReviewDirection>('zh-fr');
  const [activeDirection, setActiveDirection] = useState<'zh-fr' | 'fr-zh'>('zh-fr');
  const [isLoading, setIsLoading] = useState(true);

  // Initialize Queue
  useEffect(() => {
    const loadQueue = () => {
      const allCards = storage.getCards();
      const settings = getSettings();
      
      // 1. Due cards (Review Queue)
      const dueCards = allCards
        .filter(c => c.srsState === 'review' && isCardDue(c)) // Strictly Review phase
        .sort((a, b) => new Date(a.srsDue).getTime() - new Date(b.srsDue).getTime());

      // 2. Learning / Relearning Cards (Priority Queue)
      // Cards that are in 'learning' or 'relearning' state and due
      const activeLearningCards = allCards
        .filter(c => (c.srsState === 'learning' || c.srsState === 'relearning') && isCardDue(c));

      // 3. New cards (limit based on settings)
      const dailyLimit = settings.newCardsPerDay;
      const reviewedToday = storage.getDailyCount();
      const remainingQuota = Math.max(0, dailyLimit - reviewedToday);

      // Allows override if user insists on more reviews
      // We'll handle the override logic in the UI (adding more to queue)
      // For initial load, respect the limit.
      const newCards = allCards
        .filter(c => c.srsState === 'new') // Strictly New phase
        .slice(0, remainingQuota);

      // Combine: Learning > Due > New
      let finalQueue = [...activeLearningCards, ...dueCards, ...newCards];
      
      // Apply total review limit
      if (settings.reviewLimit > 0) {
        finalQueue = finalQueue.slice(0, settings.reviewLimit);
      }

      // Remove duplicates
      finalQueue = Array.from(new Set(finalQueue.map(c => c.id)))
        .map(id => allCards.find(c => c.id === id)!);

      setQueue(finalQueue);
      setInitialQueueLength(finalQueue.length);
      setIsLoading(false);
    };

    loadQueue();
  }, []);

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

    // AI Coach Logic (Optional): If "Again", trigger a mini-quiz
    if (rating === 'again') {
       console.log('User struggled with:', currentCard.hanzi);
    }

    // 1. Calculate new stats
    const updates = fsrs.review(currentCard, rating);
    const updatedCard = { ...currentCard, ...updates };

    // 2. Update storage
    const allCards = storage.getCards();
    const cardIndex = allCards.findIndex(c => c.id === currentCard.id);
    if (cardIndex !== -1) {
      allCards[cardIndex] = updatedCard;
      storage.saveCards(allCards, user?.uid);
      
      // Track daily progress if it was a new card (0 reps before)
      if (currentCard.srsState === 'new') {
        storage.incrementDailyCount();
      }
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
    const reviewedToday = storage.getDailyCount();
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
            // Important: We don't reset completedCount, just append work.
        }
    };

    return (
      <div className="text-center py-16 space-y-6">
        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800">
          {hasMoreNewCards ? "Daily Limit Reached" : "All Caught Up!"}
        </h2>
        <p className="text-gray-600">
          You've reviewed {completedCount} cards this session.
          {hasMoreNewCards && <br/>}
          {hasMoreNewCards && <span className="text-amber-600 text-sm mt-2 block">You've learned {dailyLimit} new words today!</span>}
        </p>
        
        {hasMoreNewCards && (
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={loadMoreNewCards}
                className="px-6 py-2 bg-amber-100 text-amber-700 font-medium rounded-lg hover:bg-amber-200 transition-colors"
              >
                Study 10 More New Words
              </button>
              <span className="text-xs text-gray-400">or change the limit in Settings</span>
            </div>
        )}

        <button 
          onClick={() => onExit ? onExit() : window.location.reload()} 
          className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
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
