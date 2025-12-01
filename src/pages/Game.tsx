import { useState, useEffect } from 'react';
import { Trophy, Grid, MessageSquare, Music, AlertCircle, BookOpen, MessageCircle } from 'lucide-react';
import SpeedMatch from '../components/games/SpeedMatch';
import SentenceBuilder from '../components/games/SentenceBuilder';
import ToneSurfer from '../components/games/ToneSurfer';
import StoryReader from '../components/games/StoryReader';
import AIChat from '../components/games/AIChat';
import { storage } from '../utils/storage';

type GameType = 'menu' | 'match' | 'sentence' | 'tone' | 'reader' | 'chat';

export default function GameHub() {
  const [activeGame, setActiveGame] = useState<GameType>('menu');
  const [hasCards, setHasCards] = useState(true);

  useEffect(() => {
    const cards = storage.getCards();
    setHasCards(cards.length >= 6);
  }, []);

  const games = [
    {
      id: 'chat',
      title: 'AI Chat Tutor',
      description: 'Roleplay real scenarios with instant correction.',
      icon: <MessageCircle className="w-8 h-8 text-pink-600" />,
      color: 'bg-pink-50 border-pink-200 hover:border-pink-500'
    },
    {
      id: 'reader',
      title: 'Story Reader',
      description: 'Read AI-generated stories using your vocab.',
      icon: <BookOpen className="w-8 h-8 text-indigo-600" />,
      color: 'bg-indigo-50 border-indigo-200 hover:border-indigo-500'
    },
    {
      id: 'match',
      title: 'Speed Match',
      description: 'Match Hanzi to meanings against the clock.',
      icon: <Grid className="w-8 h-8 text-emerald-600" />,
      color: 'bg-emerald-50 border-emerald-200 hover:border-emerald-500'
    },
    {
      id: 'sentence',
      title: 'Sentence Builder',
      description: 'Reconstruct sentences from scrambled Hanzi.',
      icon: <MessageSquare className="w-8 h-8 text-blue-600" />,
      color: 'bg-blue-50 border-blue-200 hover:border-blue-500'
    },
    {
      id: 'tone',
      title: 'Tone Surfer',
      description: 'Listen and identify the correct Pinyin tone.',
      icon: <Music className="w-8 h-8 text-purple-600" />,
      color: 'bg-purple-50 border-purple-200 hover:border-purple-500'
    }
  ];

  if (activeGame === 'menu') {
    return (
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold text-gray-800 flex items-center justify-center gap-2">
            <Trophy className="text-yellow-500 w-8 h-8" />
            Training Arcade
          </h2>
          <p className="text-gray-500">Choose a challenge to sharpen your skills!</p>
        </div>

        {!hasCards && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-800 flex items-center gap-3">
            <AlertCircle className="w-5 h-5" />
            <p className="text-sm">You need at least 6 words to play games. Please import some vocabulary first.</p>
          </div>
        )}

        <div className="grid gap-4">
          {games.map((game) => (
            <button
              key={game.id}
              disabled={!hasCards}
              onClick={() => setActiveGame(game.id as GameType)}
              className={`flex items-center p-6 rounded-xl border-2 text-left transition-all transform hover:scale-[1.02] shadow-sm ${game.color} ${!hasCards ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
            >
              <div className="p-4 bg-white rounded-full shadow-sm mr-6">
                {game.icon}
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800">{game.title}</h3>
                <p className="text-gray-600 mt-1">{game.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <button 
        onClick={() => setActiveGame('menu')}
        className="mb-6 text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1"
      >
        ← Back to Arcade
      </button>

      {activeGame === 'match' && <SpeedMatch />}
      {activeGame === 'sentence' && <SentenceBuilder />}
      {activeGame === 'tone' && <ToneSurfer />}
      {activeGame === 'reader' && <StoryReader />}
      {activeGame === 'chat' && <AIChat />}
    </div>
  );
}
