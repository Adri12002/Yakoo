import { Eye, Volume2, Sparkles, EyeOff, ArrowLeftRight } from 'lucide-react';
import { Card, ReviewRating } from '../types';
import { useState } from 'react';
import { ai } from '../utils/ai';
import HandwritingCanvas from './HandwritingCanvas';
import { getSettings } from '../pages/Settings';

interface CardDisplayProps {
  card: Card;
  direction: 'zh-fr' | 'fr-zh';
  isFlipped: boolean;
  onFlip: () => void;
  onHideAnswer?: () => void;
  onRate?: (rating: ReviewRating) => void;
  onResult?: (correct: boolean) => void; // For Endless Mode streak tracking
  showRatingButtons?: boolean; // To hide SRS buttons in Endless Mode
}

export default function CardDisplay({ 
  card, 
  direction, 
  isFlipped, 
  onFlip, 
  onHideAnswer,
  onRate,
  onResult,
  showRatingButtons = true
}: CardDisplayProps) {
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [userAnswer, setUserAnswer] = useState('');
  
  // Toggle for guessing mode (Pinyin vs Translation)
  const [guessMode, setGuessMode] = useState<'translation' | 'pinyin'>('translation');

  const [feedback, setFeedback] = useState<'idle' | 'correct' | 'incorrect'>('idle');

  const settings = getSettings();
  const isZhToFr = direction === 'zh-fr';
  
  // Enable handwriting if setting is on AND we are doing FR -> ZH (Standard Review only usually)
  // But logic here might conflict with input field. 
  // Let's keep handwriting ONLY if we are NOT showing the text input? 
  // Or maybe show both? For now, let's prioritize the new text input interface as requested.
  const enableHandwriting = settings.enableHandwriting && !isZhToFr && showRatingButtons;

  const checkAnswer = () => {
    if (!userAnswer.trim()) {
       onFlip(); 
       return;
    }

    // Helper to remove tones from Pinyin (e.g., "nǐ hǎo" -> "ni hao")
    const removeTones = (str: string) => {
      return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    };

    // Helper to clean text for comparison
    const normalize = (s: string) => {
      return s
        .toLowerCase()
        .replace(/\([^)]*\)|（[^）]*）/g, '') 
        .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g," ") // Replace punctuation with space
        .replace(/\s+/g, ' ') // Collapse spaces
        .trim();
    };

    const inputRaw = normalize(userAnswer);
    const inputNoTones = removeTones(inputRaw);
    
    let isCorrect = false;

    if (isZhToFr) {
      if (guessMode === 'pinyin') {
         // User is guessing Pinyin for the Hanzi
         const targetPinyin = normalize(card.pinyin);
         const targetPinyinNoTones = removeTones(targetPinyin);
         isCorrect = (inputRaw === targetPinyin || inputNoTones === targetPinyinNoTones);
      } else {
         // User is guessing Translation
         // Split by standard delimiters
         const possibilities = card.translation.split(/[,;，；\/]/).map(p => normalize(p));
         
         // Check each possibility
         isCorrect = possibilities.some(possibility => {
            // Exact match
            if (possibility === inputRaw) return true;
            
            // "to run" matches "run"
            const pNoTo = possibility.replace(/^to /, '');
            const iNoTo = inputRaw.replace(/^to /, '');
            if (pNoTo === iNoTo) return true;
   
            return false;
         });
      }
    } else {
      // Showing Translation, expecting Hanzi or Pinyin
      const targetHanzi = normalize(card.hanzi);
      const targetPinyin = normalize(card.pinyin);
      const targetPinyinNoTones = removeTones(targetPinyin);

      isCorrect = (
        inputRaw === targetHanzi || 
        inputRaw === targetPinyin || 
        inputNoTones === targetPinyinNoTones ||
        inputNoTones === targetPinyin // In case DB has non-standard pinyin
      );
    }

    // Notify parent of result (for Streak)
    if (onResult) {
        onResult(isCorrect);
    }

    if (isCorrect) {
      setFeedback('correct');
      // Show answer immediately on correct
      onFlip();
    } else {
      setFeedback('incorrect');
      // Optional: Auto-flip on incorrect too? Or let user try again?
      // User code had: setFeedback('idle'); onFlip(); after 600ms
      setTimeout(() => {
        setFeedback('idle');
        onFlip();
      }, 600);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && feedback === 'idle') {
      checkAnswer();
    }
  };

  const speak = (e: React.MouseEvent) => {
    e.stopPropagation();
    const utterance = new SpeechSynthesisUtterance(card.hanzi);
    utterance.lang = 'zh-CN';
    window.speechSynthesis.speak(utterance);
  };

  const explain = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    setLoadingAi(true);
    
    const prompt = `Act as an expert Mandarin teacher. The student is learning the word "${card.hanzi}" (${card.pinyin}) meaning "${card.translation}".
              
    Please provide a structured mini-lesson:
    1. **Etymology/Decomposition**: Break down the character components (radicals) and their meanings.
    2. **Mnemonic**: Create a memorable story or logic to connect the components to the meaning.
    3. **Context**: Provide 1 practical example sentence in Chinese (with Pinyin and English).
    4. **Nuance**: (Optional) Mention any common usage notes or similar words to avoid confusing it with.

    Keep it encouraging, concise, and easy to read.`;

    const response = await ai.chat([{ role: "user", content: prompt }]);

    if (response.success && response.data) {
      setAiExplanation(response.data);
    } else {
      setAiExplanation(response.error || 'Error connecting to AI.');
    }
    setLoadingAi(false);
  };

  return (
    <div className="w-full max-w-md mx-auto perspective-1000">
      <div className={`bg-white rounded-xl shadow-lg border overflow-hidden flex flex-col relative transition-all 
        ${feedback === 'correct' ? 'border-emerald-500 shadow-emerald-100 animate-success' : ''}
        ${feedback === 'incorrect' ? 'border-red-500 shadow-red-100 animate-shake' : 'border-gray-200'}
      `}>
        
        {/* Content Area */}
        <div 
          className="items-center justify-center p-6 sm:p-8 text-center cursor-pointer hover:bg-gray-50 transition-colors relative tap-highlight-transparent"
          onClick={!isFlipped ? onFlip : undefined}
        >
          {/* Audio Button (Always visible for convenience) */}
          <button 
            onClick={speak}
            className="absolute top-4 right-4 p-3 sm:p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors z-10"
            title="Listen"
          >
            <Volume2 className="w-6 h-6 sm:w-6 sm:h-6" />
          </button>

          {/* Front Content */}
          <div className="space-y-4 w-full" style={{marginTop: '5%', marginBottom: '5%'}}>
            <div className="text-xs uppercase tracking-wider text-gray-400 font-semibold">
              {isZhToFr ? 'Hanzi' : 'Translation'}
            </div>
            
            <div className={`font-bold text-gray-800 break-words relative inline-block ${isZhToFr ? 'text-5xl font-serif' : 'text-3xl'}`}>
              {isZhToFr ? card.hanzi : card.translation}
              {feedback === 'correct' && (
                <span className="absolute -right-8 -top-4 text-emerald-500 animate-success">
                   <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                     <polyline points="20 6 9 17 4 12"></polyline>
                   </svg>
                </span>
              )}
            </div>

            {/* Handwriting Canvas (Front Side) - Only if settings allow and not doing typing */}
            {enableHandwriting && !isFlipped && (
              <div className="mt-6 w-full" onClick={(e) => e.stopPropagation()}>
                <HandwritingCanvas height={200} />
              </div>
            )}
          </div>

          {/* Back Content (Revealed) */}
          {/* Answer displayed in control panel below */}
        </div>

        {/* Action Area */}
        <div className="p-4 bg-gray-50 border-t border-gray-100">
          {!isFlipped ? (
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1 ml-1">
                  <label className="block text-xs text-gray-500 font-bold">
                    {isZhToFr 
                      ? (guessMode === 'translation' ? "Answer in French" : "Answer in Pinyin")
                      : "Answer in Chinese (Hanzi or Pinyin)"}
                  </label>
                  
                  {isZhToFr && (
                    <button 
                      onClick={() => setGuessMode(prev => prev === 'translation' ? 'pinyin' : 'translation')}
                      className="text-xs flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded-full transition-colors"
                    >
                      <ArrowLeftRight className="w-3 h-3" />
                      Switch to {guessMode === 'translation' ? 'Pinyin' : 'Meaning'}
                    </button>
                  )}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={
                      isZhToFr 
                        ? (guessMode === 'translation' ? "Type meaning..." : "Type Pinyin...") 
                        : "Type Hanzi or Pinyin..."
                    }
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                    autoFocus
                  />
                <button
                  onClick={checkAnswer}
                  disabled={feedback !== 'idle'}
                  className={`px-6 py-3 font-bold rounded-lg shadow-sm transition-colors ${
                    feedback === 'correct' ? 'bg-emerald-500 text-white' :
                    feedback === 'incorrect' ? 'bg-red-500 text-white' :
                    'bg-emerald-600 text-white active:bg-emerald-700'
                  }`}
                >
                  {feedback === 'correct' ? 'Nice!' : feedback === 'incorrect' ? 'Oops' : 'Check'}
                </button>
              </div>
            </div>
              <button 
                onClick={onFlip}
                className="w-full py-3 text-gray-500 font-medium hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Eye className="w-4 h-4" />
                Show Answer
              </button>
            </div>
          ) : (
            <div className="space-y-3 animate-fade-in">
                {/* Compact Answer Display */}
                <div className="bg-white p-3 rounded-lg border border-gray-200 text-center shadow-sm">
                    <div className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-1">
                        Correct Answer
                    </div>
                    
                    {isZhToFr ? (
                        <>
                        <div className="text-base text-emerald-600 font-medium">{card.pinyin}</div>
                        <div className="text-lg text-gray-800 font-bold leading-tight">{card.translation}</div>
                        </>
                    ) : (
                        <>
                        <div className="text-2xl font-serif text-gray-800">{card.hanzi}</div>
                        <div className="text-base text-emerald-600 font-medium">{card.pinyin}</div>
                        </>
                    )}

                    {card.hint && (
                        <div className="text-xs text-gray-400 italic mt-1">
                        Hint: {card.hint}
                        </div>
                    )}
                    
                     {/* AI Explanation Toggle */}
                    <div className="mt-2 pt-2 border-t border-gray-50">
                        {!aiExplanation ? (
                        <button 
                            onClick={explain}
                            disabled={loadingAi}
                            className="text-xs font-bold text-purple-600 flex items-center gap-1 mx-auto hover:underline disabled:opacity-50"
                        >
                            <Sparkles className="w-3 h-3" />
                            {loadingAi ? 'Asking AI...' : 'Explain'}
                        </button>
                        ) : (
                        <div className="text-left text-xs text-gray-600 bg-purple-50 p-2 rounded border border-purple-100 whitespace-pre-wrap break-words">
                            <h4 className="font-bold text-purple-800 mb-1 flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> AI Explanation
                            </h4>
                            {aiExplanation}
                        </div>
                        )}
                    </div>
                </div>

                {/* Rating Buttons - Only if showRatingButtons is true */}
                {showRatingButtons && onRate && (
                  <div className="grid grid-cols-4 gap-2">
                    <button onClick={() => onRate('again')} className="flex flex-col items-center p-3 rounded active:bg-red-100 bg-white border border-gray-200 sm:border-transparent sm:bg-transparent text-red-700 transition-colors touch-manipulation">
                        <span className="font-bold text-sm sm:text-base">Again</span>
                    </button>
                    <button onClick={() => onRate('hard')} className="flex flex-col items-center p-3 rounded active:bg-orange-100 bg-white border border-gray-200 sm:border-transparent sm:bg-transparent text-orange-700 transition-colors touch-manipulation">
                        <span className="font-bold text-sm sm:text-base">Hard</span>
                    </button>
                    <button onClick={() => onRate('good')} className="flex flex-col items-center p-3 rounded active:bg-green-100 bg-white border border-gray-200 sm:border-transparent sm:bg-transparent text-green-700 transition-colors touch-manipulation">
                        <span className="font-bold text-sm sm:text-base">Good</span>
                    </button>
                    <button onClick={() => onRate('easy')} className="flex flex-col items-center p-3 rounded active:bg-blue-100 bg-white border border-gray-200 sm:border-transparent sm:bg-transparent text-blue-700 transition-colors touch-manipulation">
                        <span className="font-bold text-sm sm:text-base">Easy</span>
                    </button>
                  </div>
                )}
                
                {onHideAnswer && (
                    <button 
                        onClick={onHideAnswer}
                        className="w-full py-3 text-gray-500 font-medium hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                            <EyeOff className="w-4 h-4" />
                      Hide Answer
                    </button>
                )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
