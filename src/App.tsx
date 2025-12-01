import { useState } from 'react';
import { BookOpen, PlusCircle, Home as HomeIcon, LogIn, LogOut, Cloud, RefreshCw, CloudOff, Calendar, Settings as SettingsIcon, Gamepad2 } from 'lucide-react';
import Home from './pages/Home';
import AddCards from './pages/AddCards';
import Review from './pages/Review';
import Deck from './pages/Deck';
import Settings from './pages/Settings';
import Game from './pages/Game';
import EndlessMode from './pages/EndlessMode';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SyncProvider, useSync } from './contexts/SyncContext';

export type View = 'home' | 'add' | 'review' | 'deck' | 'settings' | 'game' | 'endless';

function AppContent() {
  const [view, setView] = useState<View>('home');
  const { user, signIn, logout } = useAuth();
  const { isSyncing, isOnline, pendingSync } = useSync();

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900 font-sans">
      {/* Navigation Header (Desktop) */}
      <header className="bg-white border-b border-gray-200 shadow-sm hidden md:block">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <h1 
            onClick={() => setView('home')} 
            className="text-xl font-bold text-emerald-700 cursor-pointer flex items-center gap-2"
          >
            <BookOpen className="w-6 h-6" />
            Mandarin Anki
          </h1>
          
          <nav className="flex items-center gap-2">
            <button onClick={() => setView('home')} className={`p-2 rounded-md transition-colors ${view === 'home' ? 'bg-emerald-50 text-emerald-700' : 'hover:bg-gray-100'}`} title="Home"><HomeIcon size={20} /></button>
            <button onClick={() => setView('review')} className={`p-2 rounded-md transition-colors ${view === 'review' ? 'bg-emerald-50 text-emerald-700' : 'hover:bg-gray-100'}`} title="Review"><BookOpen size={20} /></button>
            <button onClick={() => setView('deck')} className={`p-2 rounded-md transition-colors ${view === 'deck' ? 'bg-emerald-50 text-emerald-700' : 'hover:bg-gray-100'}`} title="Deck"><Calendar size={20} /></button>
            <button onClick={() => setView('game')} className={`p-2 rounded-md transition-colors ${view === 'game' ? 'bg-emerald-50 text-emerald-700' : 'hover:bg-gray-100'}`} title="Game"><Gamepad2 size={20} /></button>
            <button onClick={() => setView('add')} className={`p-2 rounded-md transition-colors ${view === 'add' ? 'bg-emerald-50 text-emerald-700' : 'hover:bg-gray-100'}`} title="Add Cards"><PlusCircle size={20} /></button>
            <button onClick={() => setView('settings')} className={`p-2 rounded-md transition-colors ${view === 'settings' ? 'bg-emerald-50 text-emerald-700' : 'hover:bg-gray-100'}`} title="Settings"><SettingsIcon size={20} /></button>

            <div className="w-px h-6 bg-gray-200 mx-1"></div>

            {user ? (
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex flex-col items-end text-xs">
                  <span className="font-medium text-gray-700">{user.displayName?.split(' ')[0]}</span>
                  <span className="flex items-center gap-1">
                    {isSyncing ? (
                      <>
                        <RefreshCw className="w-3 h-3 animate-spin text-blue-500" />
                        <span className="text-blue-600">Syncing...</span>
                      </>
                    ) : !isOnline ? (
                      <>
                        <CloudOff className="w-3 h-3 text-gray-400" />
                        <span className="text-gray-500">Offline</span>
                      </>
                    ) : pendingSync ? (
                      <>
                        <Cloud className="w-3 h-3 text-amber-500" />
                        <span className="text-amber-600">Pending</span>
                      </>
                    ) : (
                      <>
                        <Cloud className="w-3 h-3 text-emerald-500" />
                        <span className="text-emerald-600">Synced</span>
                      </>
                    )}
                  </span>
                </div>
                <button onClick={logout} className="p-2 text-gray-500 hover:bg-gray-100 rounded-md" title="Sign Out"><LogOut size={20} /></button>
              </div>
            ) : (
              <button onClick={signIn} className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 text-white text-sm rounded-md hover:bg-gray-900 transition-colors">
                <LogIn size={16} />
                <span className="hidden sm:inline">Sign In</span>
              </button>
            )}
          </nav>
        </div>
      </header>

      {/* Mobile Header (Minimal) */}
      <header className="bg-white border-b border-gray-200 shadow-sm md:hidden h-14 flex items-center justify-between px-4 sticky top-0 z-10">
         <h1 onClick={() => setView('home')} className="text-lg font-bold text-emerald-700 flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Mandarin Anki
         </h1>
         <div className="flex items-center gap-3">
           {/* Mobile Sync Status Indicator */}
           {user && (
             <div className="flex items-center justify-center w-8 h-8">
               {isSyncing ? (
                 <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
               ) : !isOnline ? (
                 <CloudOff className="w-4 h-4 text-gray-300" />
               ) : pendingSync ? (
                 <Cloud className="w-4 h-4 text-amber-500" />
               ) : (
                 <div className="w-2 h-2 bg-emerald-500 rounded-full" /> // Subtle green dot for synced
               )}
             </div>
           )}
           
           <button onClick={() => setView('add')} className="text-gray-500" title="Add Cards">
             <PlusCircle size={20} />
           </button>
           <button onClick={() => setView('settings')} className="text-gray-500" title="Settings">
             <SettingsIcon size={20} />
           </button>
           {user ? (
              <button onClick={logout} className="text-gray-500"><LogOut size={20} /></button>
           ) : (
              <button onClick={signIn} className="text-emerald-700 font-bold text-sm">Sign In</button>
           )}
         </div>
      </header>

      {/* Main Content (Padding for bottom nav) */}
      <main className="flex-1 max-w-3xl mx-auto w-full p-4 pb-24 sm:p-6">
        {view === 'home' && <Home setView={setView} />}
        {view === 'add' && <AddCards />}
        {view === 'deck' && <Deck />}
        {view === 'settings' && <Settings />}
        {view === 'game' && <Game />}
        {view === 'review' && <Review onExit={() => setView('home')} />}
        {view === 'endless' && <EndlessMode onExit={() => setView('home')} />}
      </main>

      {/* Bottom Navigation (Mobile Only) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center h-16 z-20 pb-safe">
        <button onClick={() => setView('home')} className={`flex flex-col items-center gap-1 p-2 ${view === 'home' ? 'text-emerald-600' : 'text-gray-400'}`}>
          <HomeIcon size={20} />
          <span className="text-[10px] font-medium">Home</span>
        </button>
        <button onClick={() => setView('review')} className={`flex flex-col items-center gap-1 p-2 ${view === 'review' ? 'text-emerald-600' : 'text-gray-400'}`}>
          <BookOpen size={20} />
          <span className="text-[10px] font-medium">Review</span>
        </button>
        <button onClick={() => setView('game')} className={`flex flex-col items-center gap-1 p-2 ${view === 'game' ? 'text-emerald-600' : 'text-gray-400'}`}>
          <Gamepad2 size={20} />
          <span className="text-[10px] font-medium">Play</span>
        </button>
        <button onClick={() => setView('deck')} className={`flex flex-col items-center gap-1 p-2 ${view === 'deck' ? 'text-emerald-600' : 'text-gray-400'}`}>
          <Calendar size={20} />
          <span className="text-[10px] font-medium">Deck</span>
        </button>
        {/* Removed Settings from bottom nav to make room, moved to top right */}
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SyncProvider>
        <AppContent />
      </SyncProvider>
    </AuthProvider>
  );
}
