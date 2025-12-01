import { useState, useEffect } from 'react';
import { Trophy, X, ArrowRight, Flame } from 'lucide-react';
import { storage } from '../utils/storage';
import { Card } from '../types';
import CardDisplay from '../components/CardDisplay';

interface EndlessModeProps {
  onExit: () => void;
}

export default function EndlessMode({ onExit }: EndlessModeProps) {
  const [cards, setCards] = useState<Card[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Load and shuffle cards on mount
  useEffect(() => {
    const allCards = storage.getCards();
    if (allCards.length > 0) {
      // Fisher-Yates Shuffle
      const shuffled = [...allCards];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      setCards(shuffled);
    }
    setLoading(false);
  }, []);

  const handleResult = (isCorrect: boolean) => {
      if (isCorrect) {
          const newStreak = streak + 1;
          setStreak(newStreak);
          if (newStreak > bestStreak) setBestStreak(newStreak);
      } else {
          setStreak(0);
      }
  };

  const handleNext = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev + 1) % cards.length);
  };

  if (loading) return <div className="p-8 text-center">Loading deck...</div>;
  
  if (cards.length === 0) return (
    <div className="p-8 text-center">
      <p className="text-gray-500 mb-4">No cards found. Add some words first!</p>
      <button onClick={onExit} className="text-emerald-600 font-bold">Go Back</button>
    </div>
  );

  const currentCard = cards[currentIndex];

  return (
    <div className="flex flex-col items-center max-w-md mx-auto h-[calc(100vh-140px)]">
      {/* Header with Stats */}
      <div className="w-full flex justify-between items-center mb-4 px-2">
        <button onClick={onExit} className="text-gray-400 hover:text-gray-600">
          <X className="w-6 h-6" />
        </button>
        
        <div className="flex gap-6">
          <div className={`flex items-center gap-1 font-bold text-lg ${streak > 0 ? 'text-orange-500 animate-pulse' : 'text-gray-400'}`}>
            <Flame className="w-5 h-5" fill={streak > 0 ? "currentColor" : "none"} />
            {streak}
          </div>
          <div className="flex items-center gap-1 font-medium text-gray-500">
            <Trophy className="w-4 h-4" />
            {bestStreak}
          </div>
        </div>
        
        <div className="w-6" /> {/* Spacer for center alignment */}
      </div>

      {/* Card Area using enhanced CardDisplay */}
      <div className="w-full flex-1 flex flex-col justify-center relative perspective-1000">
        <div className="flex-1 flex flex-col">
          <CardDisplay 
            card={currentCard} 
            isFlipped={isFlipped} 
            onFlip={() => setIsFlipped(true)}
            direction="zh-fr"
            showRatingButtons={false}
            onResult={handleResult}
          />
        </div>
      </div>

      {/* Controls - Show NEXT button only when flipped */}
      <div className="w-full mt-6 pb-safe h-16">
        {isFlipped && (
           <button 
            onClick={handleNext}
            className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 animate-slide-up"
            autoFocus
          >
            Next Card <ArrowRight className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}
