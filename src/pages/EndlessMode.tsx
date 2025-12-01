import { useState, useEffect, useRef } from 'react';
import { Trophy, X, Check, Flame, ArrowRight } from 'lucide-react';
import { storage } from '../utils/storage';
import { Card } from '../types';
import CardDisplay from '../components/CardDisplay';

interface EndlessModeProps {
  onExit: () => void;
}

type AnswerMode = 'pinyin' | 'translation';

export default function EndlessMode({ onExit }: EndlessModeProps) {
  const [cards, setCards] = useState<Card[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  
  const [answerMode, setAnswerMode] = useState<AnswerMode>('pinyin');
  const [input, setInput] = useState('');
  const [feedback, setFeedback] = useState<'idle' | 'correct' | 'incorrect'>('idle');

  const inputRef = useRef<HTMLInputElement>(null);

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

  // Auto-focus input when card changes
  useEffect(() => {
    if (!isFlipped && inputRef.current) {
      inputRef.current.focus();
    }
  }, [currentIndex, isFlipped]);

  const normalize = (text: string) => text.toLowerCase().trim().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "").replace(/\s+/g, " ");

  const checkAnswer = () => {
    if (!input.trim()) return;

    const currentCard = cards[currentIndex];
    const userAnswer = normalize(input);
    let isCorrect = false;

    if (answerMode === 'pinyin') {
      // Compare with Pinyin
      // TODO: More robust tone handling? For now, simple string match.
      // Remove spaces for pinyin comparison usually helps
      const target = normalize(currentCard.pinyin).replace(/\s/g, "");
      const user = userAnswer.replace(/\s/g, "");
      isCorrect = target === user;
    } else {
      // Compare with Translation
      // Split by common separators
      const possibleAnswers = currentCard.translation.split(/[,/]/).map(normalize);
      isCorrect = possibleAnswers.some(ans => ans === userAnswer || userAnswer.includes(ans) || ans.includes(userAnswer));
    }

    setFeedback(isCorrect ? 'correct' : 'incorrect');
    setIsFlipped(true);

    if (isCorrect) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      if (newStreak > bestStreak) setBestStreak(newStreak);
      
      // Auto-advance after short delay if correct
      // setTimeout(() => handleNext(), 1500); 
    } else {
      setStreak(0);
    }
  };

  const handleNext = () => {
    setFeedback('idle');
    setInput('');
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev + 1) % cards.length);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
        if (!isFlipped) {
            checkAnswer();
        } else {
            handleNext();
        }
    }
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
      {/* Header with Stats & Mode Switch */}
      <div className="w-full flex flex-col gap-2 mb-4 px-2">
        <div className="flex justify-between items-center">
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
            
            <div className="w-6" /> 
        </div>
        
        {/* Mode Toggle */}
        <div className="flex justify-center">
            <div className="bg-gray-100 p-1 rounded-lg flex text-sm font-medium">
                <button 
                    onClick={() => { setAnswerMode('pinyin'); setInput(''); inputRef.current?.focus(); }}
                    className={`px-3 py-1.5 rounded-md transition-all ${answerMode === 'pinyin' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Pinyin
                </button>
                <button 
                    onClick={() => { setAnswerMode('translation'); setInput(''); inputRef.current?.focus(); }}
                    className={`px-3 py-1.5 rounded-md transition-all ${answerMode === 'translation' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Français
                </button>
            </div>
        </div>
      </div>

      {/* Card Area */}
      <div className="w-full flex-1 flex flex-col justify-center relative perspective-1000">
        <div className="flex-1 flex flex-col">
          <CardDisplay 
            card={currentCard} 
            isFlipped={isFlipped} 
            onFlip={() => {}} // Disable flip by click in this mode
            direction="zh-fr"
            showActions={false}
          />
        </div>
      </div>

      {/* Input & Feedback Area */}
      <div className="w-full mt-6 pb-safe space-y-4">
        
        {/* Feedback Message */}
        {feedback !== 'idle' && (
            <div className={`text-center p-2 rounded-lg font-bold animate-fade-in ${feedback === 'correct' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {feedback === 'correct' ? 'Correct! 🎉' : 'Incorrect'}
            </div>
        )}

        <div className="relative">
            <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isFlipped && feedback === 'correct'} // Lock input if correct
                placeholder={answerMode === 'pinyin' ? "Type Pinyin..." : "Type translation..."}
                className={`w-full p-4 pr-12 rounded-2xl border-2 outline-none transition-all shadow-sm text-lg
                    ${feedback === 'idle' ? 'border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100' : ''}
                    ${feedback === 'correct' ? 'border-green-500 bg-green-50 text-green-900' : ''}
                    ${feedback === 'incorrect' ? 'border-red-500 bg-red-50 text-red-900' : ''}
                `}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
            />
            
            {/* Action Button inside Input */}
            <button
                onClick={!isFlipped ? checkAnswer : handleNext}
                className={`absolute right-2 top-2 bottom-2 px-4 rounded-xl font-bold text-white transition-all active:scale-95 flex items-center justify-center
                    ${!isFlipped 
                        ? (input.trim() ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-gray-300 cursor-not-allowed')
                        : (feedback === 'correct' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600')
                    }
                `}
                disabled={!isFlipped && !input.trim()}
            >
                {!isFlipped ? <Check className="w-5 h-5" /> : <ArrowRight className="w-5 h-5" />}
            </button>
        </div>
        
        {/* Override option if user thinks they were right */}
        {feedback === 'incorrect' && (
             <button 
                onClick={() => { setFeedback('correct'); setStreak(streak + 1); if(streak + 1 > bestStreak) setBestStreak(streak + 1); setIsFlipped(true); }}
                className="w-full text-xs text-gray-400 hover:text-gray-600 underline text-center pb-2"
             >
                I was correct (Override)
             </button>
        )}
      </div>
    </div>
  );
}
