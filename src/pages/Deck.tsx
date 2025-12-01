import { useState, useMemo } from 'react';
import { Search, Calendar, Edit2, Save, X } from 'lucide-react';
import { Card } from '../types';
import { storage } from '../utils/storage';
import { useAuth } from '../contexts/AuthContext';

export default function Deck() {
  const { user } = useAuth();
  const [cards, setCards] = useState<Card[]>(storage.getCards());
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Card>>({});

  // Filter & Sort
  const filteredCards = useMemo(() => {
    return cards
      .filter(c => 
        c.hanzi.includes(search) || 
        c.pinyin.includes(search) || 
        c.translation.toLowerCase().includes(search.toLowerCase())
      )
      .sort((a, b) => {
        // Handle empty dates (New cards) -> Put them at the end or start?
        // Let's put New cards (empty due) at the END of the due list
        const dateA = a.srsDue ? new Date(a.srsDue).getTime() : 8640000000000000; // Max date
        const dateB = b.srsDue ? new Date(b.srsDue).getTime() : 8640000000000000;
        return dateA - dateB;
      });
  }, [cards, search]);

  const formatDue = (isoString: string) => {
    if (!isoString) return <span className="text-blue-500 font-medium">New</span>;
    
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return <span className="text-gray-400">Invalid</span>;

    const now = new Date();
    const diffHours = (date.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (diffHours < 0) return <span className="text-red-600 font-bold">Overdue</span>;
    if (diffHours < 24) return <span className="text-amber-600">Today</span>;
    const days = Math.ceil(diffHours / 24);
    return <span className="text-emerald-600">{days} days</span>;
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

  const resetProgress = (card: Card) => {
    if (!confirm('Reset progress for this card? It will become "New".')) return;

    const updatedCards = cards.map(c => {
      if (c.id === card.id) {
        return {
          ...c,
          srsEaseFactor: 2.5,
          srsInterval: 1,
          srsRepetitions: 0,
          srsState: 'new',
          srsStability: 0,
          srsDifficulty: 0,
          srsDue: '' // Clear due date to make it truly New
        } as Card;
      }
      return c;
    });

    setCards(updatedCards);
    storage.saveCards(updatedCards, user?.uid);
  };

  return (
    <div className="space-y-6">
      {/* Header & Search */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-col sm:flex-row justify-between gap-4 items-center">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-emerald-600" />
          My Deck <span className="text-gray-400 text-sm font-normal">({cards.length})</span>
        </h2>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-600 font-medium uppercase tracking-wider text-xs">
              <tr>
                <th className="p-4 border-b">Hanzi</th>
                <th className="p-4 border-b">Pinyin</th>
                <th className="p-4 border-b">Translation</th>
                <th className="p-4 border-b">Next Review</th>
                <th className="p-4 border-b text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredCards.map(card => (
                <tr key={card.id} className="hover:bg-gray-50 transition-colors">
                  {editingId === card.id ? (
                    // Edit Mode
                    <>
                      <td className="p-3">
                        <input 
                          className="w-20 p-1 border rounded"
                          value={editForm.hanzi}
                          onChange={e => setEditForm({...editForm, hanzi: e.target.value})} 
                        />
                      </td>
                      <td className="p-3">
                        <input 
                          className="w-24 p-1 border rounded"
                          value={editForm.pinyin}
                          onChange={e => setEditForm({...editForm, pinyin: e.target.value})} 
                        />
                      </td>
                      <td className="p-3">
                        <input 
                          className="w-32 p-1 border rounded"
                          value={editForm.translation}
                          onChange={e => setEditForm({...editForm, translation: e.target.value})} 
                        />
                      </td>
                      <td className="p-3 text-gray-400 italic">
                        Editing...
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={saveEdit} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"><Save size={16} /></button>
                          <button onClick={cancelEdit} className="p-1 text-red-600 hover:bg-red-50 rounded"><X size={16} /></button>
                        </div>
                      </td>
                    </>
                  ) : (
                    // View Mode
                    <>
                      <td className="p-4 font-medium text-lg text-gray-800">{card.hanzi}</td>
                      <td className="p-4 text-gray-600">{card.pinyin}</td>
                      <td className="p-4 text-gray-800">{card.translation}</td>
                      <td className="p-4 font-medium">
                        {formatDue(card.srsDue)}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => startEdit(card)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Edit Card"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => resetProgress(card)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Reset Progress (Restart)"
                          >
                            <Calendar size={16} />
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
              
              {filteredCards.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-400">
                    No cards found matching "{search}"
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

