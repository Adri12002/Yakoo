import { useState } from 'react';
import { CheckCircle, RefreshCw, HelpCircle } from 'lucide-react';
import { storage } from '../../utils/storage';
import { ai } from '../../utils/ai';

interface Segment {
  id: string;
  text: string;
}

interface Challenge {
  french: string;
  pinyin: string;
  segments: Segment[];
  answer: string[];
}

export default function SentenceBuilder() {
  const [status, setStatus] = useState<'start' | 'loading' | 'playing' | 'won'>('start');
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [selectedSegments, setSelectedSegments] = useState<string[]>([]);
  const [availableSegments, setAvailableSegments] = useState<string[]>([]);

  const startGame = async () => {
    setStatus('loading');
    const allCards = storage.getCards();
    
    // Check for empty deck
    if (allCards.length < 5) {
        alert("You need at least 5 words in your deck to play!");
        setStatus('start');
        return;
    }
    
    // Pick 5 random words to form a sentence
    const shuffled = [...allCards].sort(() => 0.5 - Math.random()).slice(0, 5);
    const words = shuffled.map(c => c.hanzi).join(', ');

    // Ask AI to generate a sentence puzzle
    const prompt = `Create a simple Chinese sentence (SVO structure) using some of these words: [${words}]. 
    Return ONLY a JSON object with this format:
    {
      "french": "Translation in French",
      "pinyin": "Pinyin of the full sentence",
      "segments": ["Word1", "Word2", "Word3"] (Split the Chinese sentence into logical blocks/words)
    }`;

    const response = await ai.chat([{ role: "user", content: prompt }], true);

    if (!response.success || !response.data) {
        alert(response.error || "Failed to generate game.");
        setStatus('start');
        return;
    }

    try {
      // Parse JSON safely
      const content = response.data;
      const jsonStr = content.substring(content.indexOf('{'), content.lastIndexOf('}') + 1);
      const puzzle = JSON.parse(jsonStr);

      const segmentsWithIds: Segment[] = puzzle.segments.map((text: string, i: number) => ({
        id: `seg-${i}`,
        text
      }));

      setChallenge({
        french: puzzle.french,
        pinyin: puzzle.pinyin,
        segments: segmentsWithIds,
        answer: puzzle.segments
      });
      
      setAvailableSegments(segmentsWithIds.map((s) => s.id).sort(() => 0.5 - Math.random())); // Shuffle
      setSelectedSegments([]);
      setStatus('playing');

    } catch (e) {
      console.error("JSON Parse Error", e);
      alert("AI returned invalid data. Try again.");
      setStatus('start');
    }
  };

  const handleSelect = (id: string) => {
    setAvailableSegments(prev => prev.filter(pid => pid !== id));
    setSelectedSegments(prev => [...prev, id]);
  };

  const handleDeselect = (id: string) => {
    setSelectedSegments(prev => prev.filter(pid => pid !== id));
    setAvailableSegments(prev => [...prev, id]);
  };

  const checkAnswer = () => {
    if (!challenge) return;
    
    const currentSentence = selectedSegments.map(id => 
      challenge.segments.find(s => s.id === id)?.text
    ).join('');
    
    const targetSentence = challenge.answer.join('');

    if (currentSentence === targetSentence) {
      setStatus('won');
    } else {
      alert("Not quite! Try again.");
      // Reset
      setAvailableSegments([...availableSegments, ...selectedSegments].sort(() => 0.5 - Math.random()));
      setSelectedSegments([]);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-8 text-center">
      <h2 className="text-2xl font-bold text-blue-600 flex items-center justify-center gap-2">
        <HelpCircle className="w-6 h-6" />
        Sentence Builder
      </h2>

      {status === 'start' && (
        <div className="py-12 bg-white rounded-xl border border-gray-200 shadow-sm">
          <p className="mb-6 text-gray-600">Construct the Chinese sentence from the French translation.</p>
          <button onClick={startGame} className="px-8 py-3 bg-blue-600 text-white font-bold rounded-full hover:bg-blue-700 shadow-lg">
            Start Puzzle
          </button>
        </div>
      )}

      {status === 'loading' && (
        <div className="py-12 flex flex-col items-center gap-4 text-gray-500">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
          <p>AI is crafting your puzzle...</p>
        </div>
      )}

      {status === 'playing' && challenge && (
        <div className="space-y-8">
          <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
            <p className="text-sm text-blue-600 font-bold uppercase tracking-wide mb-2">Translate this</p>
            <h3 className="text-2xl text-gray-800 font-serif">{challenge.french}</h3>
          </div>

          {/* Drop Zone */}
          <div className="min-h-[60px] bg-gray-100 rounded-lg p-2 flex flex-wrap gap-2 justify-center items-center border-2 border-dashed border-gray-300">
            {selectedSegments.length === 0 && <span className="text-gray-400 text-sm">Click words below to build</span>}
            {selectedSegments.map(id => {
              const seg = challenge.segments.find(s => s.id === id);
              return (
                <button 
                  key={id}
                  onClick={() => handleDeselect(id)}
                  className="bg-white px-4 py-2 rounded shadow-sm border border-blue-200 font-bold text-lg hover:bg-red-50"
                >
                  {seg?.text}
                </button>
              );
            })}
          </div>

          {/* Word Bank */}
          <div className="flex flex-wrap gap-3 justify-center">
            {availableSegments.map(id => {
              const seg = challenge.segments.find(s => s.id === id);
              return (
                <button 
                  key={id}
                  onClick={() => handleSelect(id)}
                  className="bg-white px-4 py-2 rounded shadow-sm border border-gray-200 font-bold text-lg hover:bg-blue-50 hover:border-blue-300 transition-colors"
                >
                  {seg?.text}
                </button>
              );
            })}
          </div>

          <button 
            onClick={checkAnswer}
            disabled={availableSegments.length > 0}
            className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700"
          >
            Check Answer
          </button>

          <div className="text-center">
            <button 
              onClick={() => alert(`Hint: The Pinyin is "${challenge.pinyin}"`)}
              className="text-sm text-blue-400 hover:text-blue-600 font-medium underline"
            >
              Need a Hint?
            </button>
          </div>
        </div>
      )}

      {status === 'won' && challenge && (
        <div className="bg-green-50 p-8 rounded-xl border border-green-100 space-y-4 animate-fade-in">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
          <h3 className="text-2xl font-bold text-green-800">Correct!</h3>
          <div className="text-lg">
            <p className="font-serif text-2xl mb-1">{challenge.answer.join('')}</p>
            <p className="text-green-600">{challenge.pinyin}</p>
          </div>
          <button onClick={startGame} className="px-6 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700">
            Next Puzzle
          </button>
        </div>
      )}
    </div>
  );
}
