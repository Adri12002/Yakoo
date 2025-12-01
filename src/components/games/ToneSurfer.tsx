import { useState } from 'react';
import { Play, CheckCircle, Volume2, Music } from 'lucide-react';
import { storage } from '../../utils/storage';

interface Question {
  hanzi: string;
  correctPinyin: string;
  options: string[];
  translation: string;
}

export default function ToneSurfer() {
  const [status, setStatus] = useState<'start' | 'playing' | 'result'>('start');
  const [question, setQuestion] = useState<Question | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);

  const generateQuestion = () => {
    const allCards = storage.getCards();
    if (allCards.length < 4) {
      alert("Need at least 4 cards to play!");
      return;
    }

    // Pick 1 target card
    const target = allCards[Math.floor(Math.random() * allCards.length)];

    // Generate distractors (fake pinyins or other cards' pinyins)
    // For simplicity, we pick 3 other cards' pinyins
    const others = allCards
      .filter(c => c.id !== target.id)
      .sort(() => 0.5 - Math.random())
      .slice(0, 3)
      .map(c => c.pinyin);

    const options = [...others, target.pinyin].sort(() => 0.5 - Math.random());

    setQuestion({
      hanzi: target.hanzi,
      correctPinyin: target.pinyin,
      options,
      translation: target.translation
    });
    
    setStatus('playing');
    
    // Auto play audio
    setTimeout(() => playAudio(target.hanzi), 300);
  };

  const playAudio = (text: string) => {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'zh-CN';
    window.speechSynthesis.speak(u);
  };

  const handleAnswer = (pinyin: string) => {
    if (!question) return;

    if (pinyin === question.correctPinyin) {
      setScore(s => s + 10);
      setStreak(s => s + 1);
      // Next question automatically
      generateQuestion();
    } else {
      alert(`Wrong! Correct was: ${question.correctPinyin}`);
      setStreak(0);
      // Give another chance or next? Let's go next
      generateQuestion();
    }
  };

  return (
    <div className="max-w-lg mx-auto text-center space-y-8">
      <h2 className="text-2xl font-bold text-purple-600 flex items-center justify-center gap-2">
        <Music className="w-6 h-6" />
        Tone Surfer
      </h2>

      {status === 'start' && (
        <div className="py-12 bg-white rounded-xl border border-gray-200 shadow-sm">
          <p className="mb-6 text-gray-600">Listen to the word and pick the correct Pinyin tone.</p>
          <button onClick={generateQuestion} className="px-8 py-3 bg-purple-600 text-white font-bold rounded-full hover:bg-purple-700 shadow-lg">
            Start Surfing
          </button>
        </div>
      )}

      {status === 'playing' && question && (
        <div className="space-y-8">
          <div className="flex justify-between px-4 text-sm font-bold text-gray-500">
            <span>Score: {score}</span>
            <span className="text-orange-500">Streak: {streak} 🔥</span>
          </div>

          <div className="bg-purple-50 p-8 rounded-full w-32 h-32 mx-auto flex items-center justify-center cursor-pointer hover:bg-purple-100 transition-colors shadow-sm border-4 border-purple-100"
            onClick={() => playAudio(question.hanzi)}
          >
            <Volume2 className="w-12 h-12 text-purple-600" />
          </div>
          
          <p className="text-sm text-gray-400">Click icon to replay sound</p>

          <div className="grid grid-cols-2 gap-4">
            {question.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => handleAnswer(opt)}
                className="p-4 bg-white border-2 border-gray-100 rounded-xl font-medium text-lg hover:border-purple-500 hover:text-purple-600 transition-all shadow-sm"
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

