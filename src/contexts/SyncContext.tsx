import React, { createContext, useContext, useEffect, useState } from 'react';
import { storage } from '../utils/storage';
import { useAuth } from './AuthContext';

interface SyncContextType {
  isOnline: boolean;
  isSyncing: boolean;
  pendingSync: boolean;
  triggerSync: () => Promise<void>;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingSync, setPendingSync] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check for pending sync on load
    if (localStorage.getItem('mandarin-anki-sync-pending')) {
      setPendingSync(true);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const performSync = async () => {
    if (!user || !isOnline) return;
    setIsSyncing(true);
    
    try {
      const cards = storage.getCards();
      await storage.syncToCloud(cards, user.uid);
      
      // Check if it cleared the flag (meaning success)
      if (!localStorage.getItem('mandarin-anki-sync-pending')) {
          setPendingSync(false);
      }
    } catch (e) {
      console.error("Sync failed", e);
    } finally {
      setIsSyncing(false);
    }
  };

  // Auto-sync when coming online
  useEffect(() => {
    if (isOnline && pendingSync && user) {
      performSync();
    }
  }, [isOnline, pendingSync, user]);

  return (
    <SyncContext.Provider value={{ isOnline, isSyncing, pendingSync, triggerSync: performSync }}>
      {children}
    </SyncContext.Provider>
  );
}

export function useSync() {
  const context = useContext(SyncContext);
  if (context === undefined) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return context;
}

