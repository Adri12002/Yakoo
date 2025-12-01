import { Eye, Volume2, Sparkles } from 'lucide-react';
import { Card, ReviewRating } from '../types';
import { useState } from 'react';
import { ai } from '../utils/ai';
import { convertHanzi } from '../utils/text';
import { getSettings } from '../pages/Settings';
import HandwritingCanvas from './HandwritingCanvas';

interface CardDisplayProps {
  card: Card;
  direction: 'zh-fr' | 'fr-zh';
  isFlipped: boolean;
  onFlip: () => void;
  onRate?: (rating: ReviewRating) => void;
  showActions?: boolean;
}

export default function CardDisplay({ 
  card, 
  direction, 
  isFlipped, 
  onFlip, 
  onRate,
  showActions = true
}: CardDisplayProps) {
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  // const [showCanvas, setShowCanvas] = useState(false); // Unused
  
  const settings = getSettings();
  const isTraditional = settings.preferTraditional;
  const displayHanzi = convertHanzi(card.hanzi, isTraditional);
  
  const isZhToFr = direction === 'zh-fr';
  // Enable handwriting if setting is on AND we are doing FR -> ZH
  const enableHandwriting = settings.enableHandwriting && !isZhToFr;

  const speak = (e: React.MouseEvent) => {
    e.stopPropagation();
    const utterance = new SpeechSynthesisUtterance(card.hanzi); // Speak original hanzi for audio accuracy
    utterance.lang = 'zh-CN';
    window.speechSynthesis.speak(utterance);
  };

  const explain = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    setLoadingAi(true);
    
    const prompt = `Act as an expert Mandarin teacher. The student is learning the word "${displayHanzi}" (${card.pinyin}) meaning "${card.translation}".
              
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
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden min-h-[400px] flex flex-col relative transition-all">
        
        {/* Content Area */}
        <div 
          className="flex-1 flex flex-col items-center justify-center p-6 sm:p-8 text-center cursor-pointer hover:bg-gray-50 transition-colors relative tap-highlight-transparent"
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
          <div className="space-y-4 w-full relative z-0">
            <div className="text-xs uppercase tracking-wider text-gray-400 font-semibold">
              {isZhToFr ? (isTraditional ? 'Traditional Hanzi' : 'Simplified Hanzi') : 'Translation'}
            </div>
            
            <div className={`font-bold text-gray-800 break-words ${isZhToFr ? 'text-5xl font-serif' : 'text-3xl'}`}>
              {isZhToFr ? displayHanzi : card.translation}
            </div>

            {/* Handwriting Canvas (Front Side) */}
            {enableHandwriting && !isFlipped && (
              <div className="mt-6 w-full" onClick={(e) => e.stopPropagation()}>
                <HandwritingCanvas height={200} />
              </div>
            )}
          </div>

          {/* Back Content (Revealed) */}
          {isFlipped && (
            <div className="mt-8 pt-8 border-t border-gray-100 w-full space-y-4 animate-fade-in">
              <div className="text-xs uppercase tracking-wider text-gray-400 font-semibold">
                Answer
              </div>
              
              {isZhToFr ? (
                <>
                  <div className="text-xl text-emerald-600 font-medium">{card.pinyin}</div>
                  <div className="text-2xl text-gray-700 break-words">{card.translation}</div>
                </>
              ) : (
                <>
                  <div className="text-4xl font-serif text-gray-800">{displayHanzi}</div>
                  <div className="text-xl text-emerald-600 font-medium">{card.pinyin}</div>
                </>
              )}
              
              {card.hint && (
                <div className="text-sm text-gray-400 italic mt-4 bg-gray-50 p-2 rounded inline-block max-w-full break-words">
                  Hint: {card.hint}
                </div>
              )}

              {/* AI Explanation Section */}
              <div className="mt-4">
                {!aiExplanation ? (
                  <button 
                    onClick={explain}
                    disabled={loadingAi}
                    className="text-sm sm:text-xs font-bold text-purple-600 flex items-center gap-1 mx-auto hover:underline disabled:opacity-50 p-2"
                  >
                    <Sparkles className="w-4 h-4 sm:w-3 sm:h-3" />
                    {loadingAi ? 'Asking AI...' : 'Explain this Card'}
                  </button>
                ) : (
                  <div className="mt-4 text-left text-sm text-gray-600 bg-purple-50 p-4 rounded-lg border border-purple-100 whitespace-pre-wrap break-words">
                    <h4 className="font-bold text-purple-800 mb-2 flex items-center gap-2">
                      <Sparkles className="w-3 h-3" /> AI Explanation
                    </h4>
                    {aiExplanation}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Action Area */}
        {showActions && (
          <div className="p-4 bg-gray-50 border-t border-gray-100">
            {!isFlipped ? (
              <button 
                onClick={onFlip}
                className="w-full py-4 sm:py-3 bg-emerald-600 text-white font-bold rounded-lg shadow-sm active:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
              >
                <Eye className="w-5 h-5" />
                Show Answer
              </button>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                <button onClick={() => onRate?.('again')} className="flex flex-col items-center p-3 rounded active:bg-red-100 bg-white border border-gray-200 sm:border-transparent sm:bg-transparent text-red-700 transition-colors touch-manipulation">
                  <span className="font-bold text-sm sm:text-base">Again</span>
                </button>
                <button onClick={() => onRate?.('hard')} className="flex flex-col items-center p-3 rounded active:bg-orange-100 bg-white border border-gray-200 sm:border-transparent sm:bg-transparent text-orange-700 transition-colors touch-manipulation">
                  <span className="font-bold text-sm sm:text-base">Hard</span>
                </button>
                <button onClick={() => onRate?.('good')} className="flex flex-col items-center p-3 rounded active:bg-green-100 bg-white border border-gray-200 sm:border-transparent sm:bg-transparent text-green-700 transition-colors touch-manipulation">
                  <span className="font-bold text-sm sm:text-base">Good</span>
                </button>
                <button onClick={() => onRate?.('easy')} className="flex flex-col items-center p-3 rounded active:bg-blue-100 bg-white border border-gray-200 sm:border-transparent sm:bg-transparent text-blue-700 transition-colors touch-manipulation">
                  <span className="font-bold text-sm sm:text-base">Easy</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
