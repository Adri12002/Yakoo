import { useState, useEffect } from 'react';
import { Trophy, Sparkles, RefreshCw, Play } from 'lucide-react';
import { Card } from '../../types';
import { storage } from '../../utils/storage';
import { getSettings } from '../../pages/Settings';

interface Tile {
  id: string;
  content: string;
  type: 'hanzi' | 'translation';
  cardId: string;
  matched: boolean;
  flipped: boolean;
}

export default function SpeedMatch() {
  const [cards, setCards] = useState<Card[]>([]);
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [matches, setMatches] = useState(0);
  const [moves, setMoves] = useState(0);
  const [gameStatus, setGameStatus] = useState<'start' | 'playing' | 'won'>('start');
  const [aiSentence, setAiSentence] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  // Setup Game
  const startGame = () => {
    const allCards = storage.getCards();
    if (allCards.length < 6) {
      alert("You need at least 6 cards to play!");
      return;
    }

    // Pick 6 random cards
    const shuffled = [...allCards].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 6);
    setCards(selected);

    // Create tiles (6 Hanzi + 6 Translations)
    const gameTiles: Tile[] = [];
    selected.forEach(card => {
      gameTiles.push({
        id: `h-${card.id}`,
        content: card.hanzi,
        type: 'hanzi',
        cardId: card.id,
        matched: false,
        flipped: false
      });
      gameTiles.push({
        id: `t-${card.id}`,
        content: card.translation,
        type: 'translation',
        cardId: card.id,
        matched: false,
        flipped: false
      });
    });

    // Shuffle tiles
    setTiles(gameTiles.sort(() => 0.5 - Math.random()));
    setMatches(0);
    setMoves(0);
    setGameStatus('playing');
    setAiSentence(null);
    setFlippedIndices([]);
  };

  // Handle Click
  const handleTileClick = (index: number) => {
    if (
      tiles[index].matched || 
      tiles[index].flipped || 
      flippedIndices.length >= 2
    ) return;

    // Flip logic
    const newTiles = [...tiles];
    newTiles[index].flipped = true;
    setTiles(newTiles);
    
    const newFlipped = [...flippedIndices, index];
    setFlippedIndices(newFlipped);

    // Check Match
    if (newFlipped.length === 2) {
      setMoves(m => m + 1);
      const [idx1, idx2] = newFlipped;
      const tile1 = newTiles[idx1];
      const tile2 = newTiles[idx2];

      if (tile1.cardId === tile2.cardId) {
        // Match!
        setTimeout(() => {
          const matchedTiles = [...tiles];
          matchedTiles[idx1].matched = true;
          matchedTiles[idx2].matched = true;
          matchedTiles[idx1].flipped = true; // Keep visible
          matchedTiles[idx2].flipped = true;
          setTiles(matchedTiles);
          setFlippedIndices([]);
          setMatches(m => {
            const newMatches = m + 1;
            if (newMatches === 6) endGame(cards); // Pass current cards
            return newMatches;
          });
        }, 300);
      } else {
        // No Match
        setTimeout(() => {
          const resetTiles = [...tiles];
          resetTiles[idx1].flipped = false;
          resetTiles[idx2].flipped = false;
          setTiles(resetTiles);
          setFlippedIndices([]);
        }, 1000);
      }
    }
  };

  const endGame = async (playedCards: Card[]) => {
    setGameStatus('won');
    generateAiSentence(playedCards);
  };

  const generateAiSentence = async (playedCards: Card[]) => {
    const settings = getSettings();
    if (!settings.mistralApiKey) return;

    setLoadingAi(true);
    try {
      // Pick 2 random words from the game
      const words = playedCards.slice(0, 3).map(c => c.hanzi).join(', ');

      const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${settings.mistralApiKey}`
        },
        body: JSON.stringify({
          model: "mistral-small",
          messages: [{
            role: "user",
            content: `Create a fun, simple Chinese sentence (with Pinyin and English) using these words: ${words}. Keep it short.`
          }]
        })
      });
      const data = await response.json();
      setAiSentence(data.choices?.[0]?.message?.content);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAi(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center justify-center gap-2">
          <Trophy className="text-yellow-500" />
          Speed Match
        </h2>
        <p className="text-gray-500">Match the Hanzi to its meaning!</p>
      </div>

      {gameStatus === 'start' && (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-200">
          <Play className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
          <button 
            onClick={startGame}
            className="px-8 py-3 bg-emerald-600 text-white font-bold rounded-full hover:bg-emerald-700 transition-transform hover:scale-105 shadow-lg"
          >
            Start Game
          </button>
        </div>
      )}

      {gameStatus === 'playing' && (
        <>
          <div className="flex justify-between items-center px-4">
            <div className="text-gray-600 font-medium">Moves: {moves}</div>
            <div className="text-emerald-600 font-bold">Matches: {matches}/6</div>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {tiles.map((tile, index) => (
              <button
                key={tile.id}
                onClick={() => handleTileClick(index)}
                disabled={tile.matched || tile.flipped}
                className={`
                  aspect-square rounded-xl font-bold text-lg flex items-center justify-center p-2 shadow-sm transition-all duration-300
                  ${tile.flipped || tile.matched 
                    ? 'bg-white border-2 border-emerald-500 text-gray-800 rotate-y-180' 
                    : 'bg-emerald-600 text-emerald-600 border-2 border-emerald-600 hover:bg-emerald-500'
                  }
                `}
              >
                {(tile.flipped || tile.matched) ? (
                  <span className={tile.type === 'hanzi' ? 'text-2xl font-serif' : 'text-sm'}>
                    {tile.content}
                  </span>
                ) : '?'}
              </button>
            ))}
          </div>
        </>
      )}

      {gameStatus === 'won' && (
        <div className="bg-white p-8 rounded-xl shadow-lg text-center space-y-6 border-2 border-yellow-100 animate-fade-in">
          <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto">
            <Trophy className="w-10 h-10 text-yellow-600" />
          </div>
          
          <div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">Victory!</h3>
            <p className="text-gray-600">You matched them all in {moves} moves.</p>
          </div>

          {loadingAi ? (
            <div className="flex items-center justify-center gap-2 text-purple-600 text-sm font-medium">
              <RefreshCw className="w-4 h-4 animate-spin" />
              Generating Bonus Sentence...
            </div>
          ) : aiSentence && (
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-100 text-left">
              <h4 className="font-bold text-purple-800 mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                AI Bonus Context
              </h4>
              <div className="text-sm text-gray-700 whitespace-pre-wrap">
                {aiSentence}
              </div>
            </div>
          )}

          <button 
            onClick={startGame}
            className="px-6 py-2 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700"
          >
            Play Again
          </button>
        </div>
      )}
    </div>
  );
}

