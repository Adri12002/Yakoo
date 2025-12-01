import { useEffect, useState } from 'react';
import { Play, Upload, RotateCw, Calendar, AlertCircle, Flame } from 'lucide-react';
import { View } from '../App';
import { storage } from '../utils/storage';
import { Card } from '../types';

interface HomeProps {
  setView: (view: View) => void;
}

interface Forecast {
  tomorrow: number;
  threeDays: number;
}

export default function Home({ setView }: HomeProps) {
  const [stats, setStats] = useState({ total: 0, due: 0, new: 0 });
  const [hardestWords, setHardestWords] = useState<Card[]>([]);
  const [forecast, setForecast] = useState<Forecast>({ tomorrow: 0, threeDays: 0 });

  useEffect(() => {
    const loadData = () => {
      const cards = storage.getCards();
      
      // 1. Basic Stats
      // Due Count: Should be everything due before end of today (local time)
      const now = new Date();
      const endOfToday = new Date(now);
      endOfToday.setHours(23, 59, 59, 999);

      const dueCount = cards.filter(c => {
          if (c.srsState === 'new' || !c.srsDue) return false;
          const due = new Date(c.srsDue);
          return !isNaN(due.getTime()) && due <= endOfToday;
      }).length;

      const newCount = cards.filter(c => c.srsState === 'new').length;
      setStats({
        total: cards.length,
        due: dueCount,
        new: newCount
      });

      // 2. Hardest Words (Top 15 by Difficulty, only active cards)
      const hard = cards
        .filter(c => c.srsState !== 'new')
        .sort((a, b) => (b.srsDifficulty || 0) - (a.srsDifficulty || 0))
        .slice(0, 15);
      setHardestWords(hard);

      // 3. Forecast
      const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1);
      const inThreeDays = new Date(now); inThreeDays.setDate(now.getDate() + 3);
      
      let countTom = 0;
      let count3d = 0;

      cards.forEach(c => {
        if (c.srsState === 'new' || !c.srsDue) return;
        const due = new Date(c.srsDue);
        if (isNaN(due.getTime())) return;
        
        if (due <= tomorrow && due > now) countTom++;
        if (due <= inThreeDays && due > now) count3d++;
      });

      setForecast({ tomorrow: countTom, threeDays: count3d });
    };

    loadData();
    window.addEventListener('storage', loadData);
    return () => window.removeEventListener('storage', loadData);
  }, []);

  return (
    <div className="flex flex-col gap-8 py-8">
      {/* Welcome Section */}
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold text-gray-800">Welcome Back!</h2>
        <p className="text-gray-600 max-w-md mx-auto">
          You have <span className="font-bold text-emerald-600">{stats.total}</span> cards.
          <br />
          <span className="font-bold text-amber-600">{stats.due}</span> reviews due & <span className="font-bold text-blue-600">{stats.new}</span> new words.
        </p>
      </div>

      {/* Main Action Buttons */}
      <div className="grid sm:grid-cols-2 gap-4 max-w-lg mx-auto w-full">
        <button
          onClick={() => setView('review')}
          className="flex flex-col items-center justify-center p-6 bg-white border-2 border-emerald-100 rounded-xl shadow-sm hover:border-emerald-500 hover:shadow-md transition-all active:scale-95 group"
        >
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
            <Play className="w-6 h-6 ml-1" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800">Start Review</h3>
          <p className="text-sm text-gray-500 mt-2">
            {stats.due > 0 ? `Review ${stats.due} due cards` : 'Study new words'}
          </p>
        </button>
        
        <button
          onClick={() => setView('add')}
          className="flex flex-col items-center justify-center p-6 bg-white border-2 border-blue-100 rounded-xl shadow-sm hover:border-blue-500 hover:shadow-md transition-all active:scale-95 group"
        >
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">
            <Upload className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800">Add / Import</h3>
          <p className="text-sm text-gray-500 mt-2">Scan, Paste or CSV</p>
        </button>

        {/* Endless Mode Button (Spans full width on mobile, col-span-2 on grid) */}
        <button
          onClick={() => setView('endless')}
          className="sm:col-span-2 flex flex-row items-center justify-center p-4 bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-100 rounded-xl shadow-sm hover:border-orange-400 hover:shadow-md transition-all active:scale-95 group gap-3"
        >
           <div className="p-2 bg-orange-100 text-orange-600 rounded-lg group-hover:bg-orange-500 group-hover:text-white transition-colors">
             <Flame className="w-5 h-5" />
           </div>
           <div className="text-left">
             <h3 className="font-bold text-gray-800 group-hover:text-orange-700 transition-colors">Endless Challenge</h3>
             <p className="text-xs text-gray-500">Test your streak with the entire deck!</p>
           </div>
        </button>
      </div>

      {/* Dashboard Widgets */}
      <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto w-full">
        
        {/* Left Column: Stats & Forecast */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <RotateCw className="w-4 h-4" />
              Statistics
            </h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-2 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-800">{stats.total}</div>
                <div className="text-[10px] text-gray-500 uppercase tracking-wide">Total</div>
              </div>
              <div className="p-2 bg-amber-50 rounded-lg">
                <div className="text-2xl font-bold text-amber-600">{stats.due}</div>
                <div className="text-[10px] text-amber-600 uppercase tracking-wide">Due</div>
              </div>
              <div className="p-2 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{stats.new}</div>
                <div className="text-[10px] text-blue-600 uppercase tracking-wide">New</div>
              </div>
            </div>
          </div>

          {/* Review Forecast */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Review Forecast
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-2 hover:bg-gray-50 rounded transition-colors">
                <span className="text-gray-600 text-sm">Due Tomorrow</span>
                <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded text-xs">
                  {forecast.tomorrow} cards
                </span>
              </div>
              <div className="flex justify-between items-center p-2 hover:bg-gray-50 rounded transition-colors">
                <span className="text-gray-600 text-sm">Due within 3 Days</span>
                <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded text-xs">
                  {forecast.threeDays} cards
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Hardest Words */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col">
          <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500" />
            Top Struggles
            <span className="text-xs font-normal text-gray-400 ml-auto">Hardest 15</span>
          </h3>
          
          {hardestWords.length > 0 ? (
            <div className="flex-1 overflow-y-auto max-h-[300px] pr-2 space-y-2">
              {hardestWords.map(card => (
                <div key={card.id} className="flex justify-between items-center p-2 bg-gray-50 rounded border border-gray-100 hover:border-red-200 transition-colors">
                  <div>
                    <div className="font-bold text-gray-800">{card.hanzi}</div>
                    <div className="text-xs text-gray-500">{card.pinyin}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-medium text-red-600">
                      Diff: {card.srsDifficulty?.toFixed(1)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm italic">
              No review history yet. Start learning to see your struggle words here!
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

