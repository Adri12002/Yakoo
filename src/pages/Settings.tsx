import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Key, BookOpen, Wrench, Trash2, AlertTriangle, Bell, CheckCircle, RotateCcw } from 'lucide-react';
import { storage } from '../utils/storage';
import { useAuth } from '../contexts/AuthContext';
import { requestNotificationPermission } from '../utils/firebase';
import { Card } from '../types';

interface UserSettings {
  newCardsPerDay: number;
  reviewLimit: number;
  mistralApiKey: string;
  preferTraditional: boolean;
  enableHandwriting: boolean;
}

const DEFAULT_SETTINGS: UserSettings = {
  newCardsPerDay: 10,
  reviewLimit: 100,
  mistralApiKey: '',
  preferTraditional: false,
  enableHandwriting: false,
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
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [backups, setBackups] = useState<{ timestamp: string; cards: Card[] }[]>([]);

  useEffect(() => {
    setSettings(getSettings());
    setBackups(storage.getBackups());
    // Check if we already have permission and log it
    if (Notification.permission === 'granted') {
      requestNotificationPermission().then(token => {
        if (token) {
          console.log('FCM Registration Token:', token);
          setFcmToken(token);
        }
      });
    }
  }, []);

  const handleEnableNotifications = async () => {
    const token = await requestNotificationPermission();
    if (token) {
      console.log('FCM Registration Token:', token);
      setFcmToken(token);
      alert('Notifications enabled! You will now receive daily reminders.');
      // Ideally, send this token to your backend here to subscribe the user.
      // For now, we just log it and confirm to the user.
    } else {
      alert('Could not enable notifications. Please check your browser permissions.');
    }
  };

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

  const handleRestore = (index: number, timestamp: string) => {
    if (confirm(`Restore backup from ${new Date(timestamp).toLocaleString()}? Current data will be overwritten.`)) {
      storage.restoreBackup(index);
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

      {/* Language Preferences */}
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-700 flex items-center gap-2">
          <BookOpen className="w-4 h-4" />
          Language Preferences
        </h3>
        
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-gray-700">Traditional Chinese</label>
            <p className="text-xs text-gray-400">Display cards in Traditional (繁體) instead of Simplified.</p>
          </div>
          <button
            onClick={() => setSettings({...settings, preferTraditional: !settings.preferTraditional})}
            className={`w-12 h-6 rounded-full transition-colors relative ${settings.preferTraditional ? 'bg-emerald-500' : 'bg-gray-200'}`}
          >
            <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.preferTraditional ? 'translate-x-6' : ''}`} />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-gray-700">Handwriting Practice</label>
            <p className="text-xs text-gray-400">Enable drawing canvas for French to Chinese reviews.</p>
          </div>
          <button
            onClick={() => setSettings({...settings, enableHandwriting: !settings.enableHandwriting})}
            className={`w-12 h-6 rounded-full transition-colors relative ${settings.enableHandwriting ? 'bg-emerald-500' : 'bg-gray-200'}`}
          >
            <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.enableHandwriting ? 'translate-x-6' : ''}`} />
          </button>
        </div>
      </div>

      {/* Notifications */}
      <div className="space-y-4 pt-4 border-t">
        <h3 className="font-semibold text-gray-700 flex items-center gap-2">
          <Bell className="w-4 h-4" />
          Notifications
        </h3>
        <button 
          onClick={handleEnableNotifications}
          disabled={!!fcmToken}
          className={`w-full py-2 border-2 font-bold rounded-lg transition-colors flex items-center justify-center gap-2
            ${fcmToken 
              ? 'border-green-200 bg-green-50 text-green-700 cursor-default' 
              : 'border-indigo-100 text-indigo-600 hover:bg-indigo-50'
            }`}
        >
          {fcmToken ? (
            <>
              <CheckCircle className="w-4 h-4" />
              Notifications Active
            </>
          ) : (
            "Enable Daily Reminders"
          )}
        </button>
        <p className="text-xs text-gray-400">
          Get reminded to review your cards every day.
        </p>
      </div>

      {/* Maintenance */}
      <div className="space-y-4 pt-4 border-t">
        <h3 className="font-semibold text-gray-700 flex items-center gap-2">
          <Wrench className="w-4 h-4" />
          Maintenance & Backups
        </h3>
        
        <div className="space-y-3">
            {backups.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 space-y-2">
                    <h4 className="text-xs font-bold text-gray-500 uppercase">Available Backups</h4>
                    {backups.map((b, i) => (
                        <div key={i} className="flex items-center justify-between text-sm bg-white p-2 rounded border border-gray-100">
                            <span className="text-gray-600">{new Date(b.timestamp).toLocaleDateString()} {new Date(b.timestamp).toLocaleTimeString()}</span>
                            <button 
                                onClick={() => handleRestore(i, b.timestamp)}
                                className="text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                            >
                                <RotateCcw className="w-3 h-3" /> Restore
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <button 
            onClick={handleRepair}
            className="w-full py-2 border-2 border-amber-500 text-amber-600 font-bold rounded-lg hover:bg-amber-50 transition-colors"
            >
            Repair "New Cards" Issues
            </button>
        </div>
        <p className="text-xs text-gray-400">
          Backups are created automatically every hour when you make changes.
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

