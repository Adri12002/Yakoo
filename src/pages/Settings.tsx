import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Key, BookOpen, Wrench, Trash2, AlertTriangle } from 'lucide-react';
import { storage } from '../utils/storage';
import { useAuth } from '../contexts/AuthContext';

interface UserSettings {
  newCardsPerDay: number;
  reviewLimit: number;
  mistralApiKey: string;
}

const DEFAULT_SETTINGS: UserSettings = {
  newCardsPerDay: 10,
  reviewLimit: 100,
  mistralApiKey: '',
};

const SETTINGS_KEY = 'mandarin-anki-settings';

export const getSettings = (): UserSettings => {
  try {
    const json = localStorage.getItem(SETTINGS_KEY);
    if (!json) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(json) };
  } catch {
    return DEFAULT_SETTINGS;
  }
};

export default function Settings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSettings(getSettings());
  }, []);

  const saveSettings = () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    setSaved(true);
    
    // Trigger cloud sync if user is logged in to backup settings (API Key)
    if (user) {
        storage.syncToCloud(storage.getCards(), user.uid);
    }

    setTimeout(() => setSaved(false), 2000);
  };

  const handleRepair = () => {
    if (confirm("This will reset '0-repetition' cards to be treated as Brand New (clearing bad due dates). Continue?")) {
      storage.repairDeck(user?.uid);
    }
  };

  return (
    <div className="max-w-lg mx-auto bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-8">
      <div className="flex items-center gap-3 border-b pb-4">
        <SettingsIcon className="w-6 h-6 text-gray-700" />
        <h2 className="text-xl font-bold text-gray-800">Learning Settings</h2>
      </div>

      {/* Learning Pace */}
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-700 flex items-center gap-2">
          <BookOpen className="w-4 h-4" />
          Pacing
        </h3>
        
        <div className="space-y-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-600">New cards per day</label>
            <input 
              type="number" 
              min="0"
              max="100"
              value={settings.newCardsPerDay}
              onChange={e => setSettings({...settings, newCardsPerDay: parseInt(e.target.value) || 0})}
              className="p-2 border rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            />
            <p className="text-xs text-gray-400">Limit how many completely new words you see daily.</p>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-600">Maximum daily reviews</label>
            <input 
              type="number" 
              min="0"
              max="500"
              value={settings.reviewLimit}
              onChange={e => setSettings({...settings, reviewLimit: parseInt(e.target.value) || 0})}
              className="p-2 border rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            />
            <p className="text-xs text-gray-400">Cap your total workload to avoid burnout.</p>
          </div>
        </div>
      </div>

      {/* AI Settings */}
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-700 flex items-center gap-2">
          <Key className="w-4 h-4" />
          AI Tutor (Mistral AI)
        </h3>
        
        <div className="flex flex-col gap-1">
          <label className="text-sm text-gray-600">API Key</label>
          <input 
            type="password" 
            placeholder="Mistral API Key..." 
            value={settings.mistralApiKey}
            onChange={e => setSettings({...settings, mistralApiKey: e.target.value})}
            className={`p-2 border rounded-md focus:ring-2 outline-none font-mono text-sm
              ${!settings.mistralApiKey ? 'border-red-300 focus:ring-red-200 focus:border-red-500' : 'border-gray-200 focus:ring-purple-500 focus:border-purple-500'}
            `}
          />
          {!settings.mistralApiKey && (
            <p className="text-xs text-red-500 font-medium">API Key is missing! AI features won't work.</p>
          )}
          <p className="text-xs text-gray-400">
            Required for "Explain this Card". Get it from console.mistral.ai
          </p>
        </div>
      </div>

      {/* Maintenance */}
      <div className="space-y-4 pt-4 border-t">
        <h3 className="font-semibold text-gray-700 flex items-center gap-2">
          <Wrench className="w-4 h-4" />
          Maintenance
        </h3>
        <button 
          onClick={handleRepair}
          className="w-full py-2 border-2 border-amber-500 text-amber-600 font-bold rounded-lg hover:bg-amber-50 transition-colors"
        >
          Repair "New Cards" Issues
        </button>
        <p className="text-xs text-gray-400">
          Use this if new words are showing up as "Overdue" reviews.
        </p>
      </div>

      {/* Danger Zone */}
      <div className="space-y-4 pt-4 border-t border-red-100">
        <h3 className="font-semibold text-red-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          Danger Zone
        </h3>
        <button 
          onClick={() => {
            if (confirm("ARE YOU SURE? This will delete ALL cards, stories, and settings forever.")) {
              if (confirm("Really? There is no undo.")) {
                storage.clearDatabase(user?.uid);
              }
            }
          }}
          className="w-full py-2 bg-red-50 text-red-600 border border-red-200 font-bold rounded-lg hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
        >
          <Trash2 className="w-4 h-4" />
          Reset Database
        </button>
        <p className="text-xs text-red-400">
          This will wipe all local and cloud data for your account.
        </p>
      </div>

      <button 
        onClick={saveSettings}
        className={`w-full py-3 font-bold rounded-lg transition-all flex items-center justify-center gap-2
          ${saved 
            ? 'bg-green-600 text-white' 
            : 'bg-gray-900 text-white hover:bg-gray-800'
          }`}
      >
        {saved ? 'Settings Saved!' : 'Save Changes'}
      </button>
    </div>
  );
}

