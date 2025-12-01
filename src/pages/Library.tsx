import { useState, useEffect } from 'react';
import { Book, Plus, Check, Search, Library as LibraryIcon } from 'lucide-react';
import { HSK_DATA, HSKWord } from '../data/hsk';
import { storage } from '../utils/storage';
import { Card } from '../types';

export default function Library() {
  const [cards, setCards] = useState<Card[]>([]);
  const [filterLevel, setFilterLevel] = useState<number | 'all'>('all');
  const [search, setSearch] = useState('');
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadUserCards();
    window.addEventListener('storage', loadUserCards);
    return () => window.removeEventListener('storage', loadUserCards);
  }, []);

  const loadUserCards = () => {
    const userCards = storage.getCards();
    setCards(userCards);
    
    // Identify which HSK words are already in deck (by Hanzi)
    const existingHanzi = new Set(userCards.map(c => c.hanzi));
    const added = new Set<string>();
    HSK_DATA.forEach(word => {
      if (existingHanzi.has(word.hanzi)) {
        added.add(word.id);
      }
    });
    setAddedIds(added);
  };

  const handleAdd = (word: HSKWord) => {
    const newCard: Card = {
      id: crypto.randomUUID(),
      hanzi: word.hanzi,
      pinyin: word.pinyin,
      translation: word.translation,
      srsState: 'new',
      srsRepetitions: 0,
      srsEaseFactor: 2.5,
      srsInterval: 0,
      srsDue: new Date().toISOString(),
      srsStability: 0,
      srsDifficulty: 5
    };

    const updated = [...cards, newCard];
    storage.saveCards(updated); // This triggers storage event, updating UI
    
    // Visual feedback immediately
    const newSet = new Set(addedIds);
    newSet.add(word.id);
    setAddedIds(newSet);
  };

  const filteredWords = HSK_DATA.filter(word => {
    const matchesSearch = 
      word.hanzi.includes(search) || 
      word.pinyin.toLowerCase().includes(search.toLowerCase()) || 
      word.translation.toLowerCase().includes(search.toLowerCase());
    
    const matchesLevel = filterLevel === 'all' || word.level === filterLevel;

    return matchesSearch && matchesLevel;
  });

  return (
    <div className="pb-safe space-y-6">
       {/* Header */}
       <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                <LibraryIcon className="w-6 h-6" />
            </div>
            <div>
                <h2 className="text-2xl font-bold text-gray-800">Vocabulary Library</h2>
                <p className="text-sm text-gray-500">Browse and add standard HSK vocabulary.</p>
            </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                    type="text" 
                    placeholder="Search Hanzi, Pinyin or English..." 
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
                <button 
                    onClick={() => setFilterLevel('all')}
                    className={`px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${filterLevel === 'all' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                    All Levels
                </button>
                {[1, 2, 3, 4, 5, 6].map(lvl => (
                    <button 
                        key={lvl}
                        onClick={() => setFilterLevel(lvl)}
                        className={`px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${filterLevel === lvl ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    >
                        HSK {lvl}
                    </button>
                ))}
            </div>
        </div>
      </div>

      {/* List */}
      <div className="space-y-2">
        {filteredWords.length > 0 ? (
            filteredWords.map(word => {
                const isAdded = addedIds.has(word.id);
                return (
                    <div key={word.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex justify-between items-center hover:border-indigo-100 transition-all">
                        <div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-lg font-bold text-gray-800">{word.hanzi}</span>
                                <span className="text-sm text-gray-500 font-medium">{word.pinyin}</span>
                                <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded font-bold uppercase tracking-wide">HSK {word.level}</span>
                            </div>
                            <div className="text-sm text-gray-600 mt-0.5">{word.translation}</div>
                        </div>
                        
                        <button
                            onClick={() => !isAdded && handleAdd(word)}
                            disabled={isAdded}
                            className={`p-2 rounded-full transition-all ${
                                isAdded 
                                    ? 'bg-green-100 text-green-600 cursor-default' 
                                    : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:scale-110 active:scale-95'
                            }`}
                        >
                            {isAdded ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                        </button>
                    </div>
                );
            })
        ) : (
            <div className="text-center py-12 text-gray-400">
                <Book className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>No words found matching your criteria.</p>
            </div>
        )}
      </div>
    </div>
  );
}

