import { useState, useMemo } from 'react';
import { Search, Calendar, Edit2, Trash2, Filter, ArrowUp, ArrowDown, Clock, GraduationCap } from 'lucide-react';
import { Card } from '../types';
import { storage } from '../utils/storage';
import { useAuth } from '../contexts/AuthContext';

type SortOption = 'due' | 'newest' | 'difficulty' | 'alpha';

export default function Deck() {
  const { user } = useAuth();
  const [cards, setCards] = useState<Card[]>(storage.getCards());
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortOption>('due');
  const [sortAsc, setSortAsc] = useState(true);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Card>>({});

  // Filter & Sort
  const filteredCards = useMemo(() => {
    let result = cards.filter(c => 
      c.hanzi.includes(search) || 
      c.pinyin.includes(search) || 
      c.translation.toLowerCase().includes(search.toLowerCase())
    );

    return result.sort((a, b) => {
      let valA, valB;
      switch(sort) {
        case 'newest':
          // Assuming newer cards are at the end of the list originally or rely on ID if timestamp not avail
          // Using index in array as proxy for creation time if no date field
          return sortAsc ? 0 : 0; // TODO: Add createdAt to Card type for proper sort
        case 'difficulty':
          valA = a.srsDifficulty || 0;
          valB = b.srsDifficulty || 0;
          break;
        case 'alpha':
          valA = a.pinyin;
          valB = b.pinyin;
          break;
        case 'due':
        default:
           // Handle empty dates (New cards) -> Put them at the end for 'due' sort usually
           valA = a.srsDue ? new Date(a.srsDue).getTime() : 8640000000000000;
           valB = b.srsDue ? new Date(b.srsDue).getTime() : 8640000000000000;
      }

      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [cards, search, sort, sortAsc]);

  const formatDue = (isoString: string) => {
    if (!isoString) return <span className="text-blue-500 font-bold text-xs uppercase bg-blue-50 px-2 py-1 rounded">New</span>;
    
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return <span className="text-gray-400">Invalid</span>;

    const now = new Date();
    const diffHours = (date.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (diffHours < 0) return <span className="text-red-600 font-bold bg-red-50 px-2 py-1 rounded text-xs">Overdue</span>;
    if (diffHours < 24) return <span className="text-amber-600 font-medium">Today</span>;
    const days = Math.ceil(diffHours / 24);
    return <span className="text-emerald-600 font-medium">{days}d</span>;
  };

  const deleteCard = (id: string) => {
    if (confirm('Are you sure you want to delete this card?')) {
        const updated = cards.filter(c => c.id !== id);
        setCards(updated);
        storage.saveCards(updated, user?.uid);
    }
  };

  const startEdit = (card: Card) => {
    setEditingId(card.id);
    setEditForm(card);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = () => {
    if (!editingId) return;

    const updatedCards = cards.map(c => {
      if (c.id === editingId) {
        return { ...c, ...editForm };
      }
      return c;
    });

    setCards(updatedCards);
    storage.saveCards(updatedCards, user?.uid);
    setEditingId(null);
  };


  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-20">
      {/* Header & Controls */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-emerald-600" />
            My Deck <span className="text-gray-400 text-sm font-normal bg-gray-100 px-2 py-0.5 rounded-full">{filteredCards.length}</span>
            </h2>
            
            <div className="flex gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                        type="text" 
                        placeholder="Search Hanzi, Pinyin..." 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    />
                </div>
                
                {/* Mobile Sort Toggle (could be expanded) */}
                <button 
                    onClick={() => setSortAsc(!sortAsc)}
                    className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600"
                >
                    {sortAsc ? <ArrowUp size={20} /> : <ArrowDown size={20} />}
                </button>
            </div>
        </div>

        {/* Filter Chips */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {(['due', 'difficulty', 'alpha'] as SortOption[]).map(option => (
                <button
                    key={option}
                    onClick={() => setSort(option)}
                    className={`
                        px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide whitespace-nowrap transition-colors flex items-center gap-1
                        ${sort === option ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}
                    `}
                >
                    {option === 'due' && <Clock size={12} />}
                    {option === 'difficulty' && <GraduationCap size={12} />}
                    {option === 'alpha' && <Filter size={12} />}
                    {option === 'due' ? 'Due Date' : option}
                </button>
            ))}
        </div>
      </div>

      {/* Cards List (Mobile Optimized) */}
      <div className="space-y-3">
        {filteredCards.map(card => (
            <div key={card.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:border-emerald-300 transition-all group relative">
                {editingId === card.id ? (
                    // Edit Mode
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-xs text-gray-400">Hanzi</label>
                                <input 
                                    className="w-full p-2 border rounded bg-gray-50 font-bold"
                                    value={editForm.hanzi}
                                    onChange={e => setEditForm({...editForm, hanzi: e.target.value})} 
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-gray-400">Pinyin</label>
                                <input 
                                    className="w-full p-2 border rounded bg-gray-50"
                                    value={editForm.pinyin}
                                    onChange={e => setEditForm({...editForm, pinyin: e.target.value})} 
                                />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-gray-400">Translation</label>
                            <input 
                                className="w-full p-2 border rounded bg-gray-50"
                                value={editForm.translation}
                                onChange={e => setEditForm({...editForm, translation: e.target.value})} 
                            />
                        </div>
                        <div className="flex justify-end gap-3 pt-2">
                            <button onClick={cancelEdit} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-bold">Cancel</button>
                            <button onClick={saveEdit} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-bold shadow-sm">Save Changes</button>
                        </div>
                    </div>
                ) : (
                    // View Mode
                    <div className="flex justify-between items-start">
                        <div className="flex-1">
                            <div className="flex items-baseline gap-3 mb-1">
                                <h3 className="text-2xl font-bold text-gray-800">{card.hanzi}</h3>
                                <span className="text-gray-500 font-medium">{card.pinyin}</span>
                            </div>
                            <p className="text-gray-600 text-sm">{card.translation}</p>
                            
                            <div className="flex items-center gap-4 mt-3">
                                <div className="text-xs flex items-center gap-1 text-gray-400">
                                    <Clock size={12} />
                                    {formatDue(card.srsDue)}
                                </div>
                                {card.srsDifficulty > 0 && (
                                    <div className="text-xs flex items-center gap-1 text-gray-400">
                                        <GraduationCap size={12} />
                                        Diff: {card.srsDifficulty.toFixed(1)}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Action Buttons (Always visible on mobile, hover on desktop) */}
                        <div className="flex flex-col gap-1 pl-4 border-l border-gray-100 ml-4">
                            <button 
                                onClick={() => startEdit(card)}
                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                                <Edit2 size={18} />
                            </button>
                            <button 
                                onClick={() => deleteCard(card.id)}
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        ))}

        {filteredCards.length === 0 && (
            <div className="text-center py-12 text-gray-400 bg-white rounded-xl border border-dashed border-gray-300">
                <Search className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No cards found matching "{search}"</p>
            </div>
        )}
      </div>
    </div>
  );
}

