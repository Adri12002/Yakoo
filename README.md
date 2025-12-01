# Mandarin Anki App - Project White Paper

## 1. Project Overview
**Mission:** To build a minimal, elegant, and effective web-based Spaced Repetition System (SRS) optimized specifically for learning Mandarin Chinese. The app prioritizes clean UX, mobile-first design, and AI-assisted learning.

**Key Philosophy:**
- **Minimalism:** No bloat. Just what is needed to learn efficiently.
- **Offline-First:** Works locally with `localStorage`, syncs to Firebase when online.
- **AI-Enhanced:** Uses Generative AI (Mistral) via a secure backend proxy to generate context, stories, and games.
- **PWA Ready:** Installable as a native-like app on iOS/Android.

## 2. Tech Stack
- **Frontend:** React 18, TypeScript, Vite.
- **Styling:** Tailwind CSS (Mobile-first, bottom navigation layout).
- **State/Storage:** LocalStorage (primary), Firebase Firestore (cloud backup/sync).
- **Auth:** Firebase Auth (Google Sign-In).
- **AI:** Mistral AI API (via Netlify Functions proxy).
- **Deployment:** Netlify (SPA + Serverless Functions).
- **Speech:** Web Speech API (Native Browser TTS).

## 3. Architecture & Core Logic

### 3.1 Spaced Repetition (SRS)
We use a custom implementation of **FSRS v4.5 (Free Spaced Repetition Scheduler)** instead of the older SM-2 algorithm.
- **Location:** `src/utils/fsrs.ts`
- **Target Retention:** 0.9 (90%).
- **Logic:**
    - **Intervals:** Can be fractional (e.g., `0.0035` days ≈ 5 mins) for immediate relearning.
    - **Queue Priority:** Learning (Again/Hard) > Overdue Reviews > New Cards.
    - **Daily Limits:** Configurable cap on new cards/day (default 10). Soft limit allows override.
    - **Due Definition:** "Due" includes all cards scheduled before 23:59:59 local time.

### 3.2 Data Persistence (Sync Strategy)
- **Source of Truth:** LocalStorage (`mandarin-anki-cards`).
- **Sync:** Triggers on every save if user is logged in. Merges cloud data on login.
- **Maintenance:** `storage.repairDeck()` fixes data inconsistencies (e.g., legacy SM-2 fields).
- **Reset:** "Danger Zone" in Settings allows full account wipe (Local + Cloud).

### 3.3 AI Integration (Mistral Proxy)
- **Proxy Path:** `/.netlify/functions/chat` -> `api.mistral.ai`
- **Security:** API Key is sent from client Settings -> Netlify Function -> Mistral. Never hardcoded.
- **Error Handling:** Explicitly handles `401 Unauthorized` to prompt user for key.

## 4. Data Models

### Card Interface (`src/types.ts`)
```typescript
export interface Card {
  id: string;
  hanzi: string;
  pinyin: string;
  translation: string;
  hint?: string;

  // FSRS Fields
  srsState: 'new' | 'learning' | 'review' | 'relearning';
  srsStability: number;   // Days until retention drops to 90%
  srsDifficulty: number;  // 1-10 scale
  srsDue: string;         // ISO Timestamp (Empty string if 'new')
  srsLastReview?: string; // ISO Timestamp
}
```

### CSV Import Format
The app expects a CSV file with the following exact headers (case-sensitive):
- `Hanzi` (Required)
- `Pinyin` (Optional but recommended)
- `Translation` (Required)
- `Hint` (Optional)

## 5. Key Features

### Review Mode
- **Interleaved Learning:** Failed cards re-appear within the same session (~5 mins).
- **Soft Limits:** "Daily Limit Reached" screen allows explicit override ("Study 10 More").
- **Touch Optimized:** Large tap targets, visual feedback, bottom navigation bar.

### Game Hub
1.  **Speed Match:** Grid memory game (Hanzi ↔ Translation).
2.  **Tone Surfer:** Audio listening practice (Listen -> Pick Pinyin).
3.  **Sentence Builder:** AI generates a sentence; user reconstructs it from blocks.
4.  **Story Reader:** AI generates stories using your "Struggle Words". Tap to translate, double-tap sentence to translate.

## 6. Installation as iPhone App (Free)
This app is a **Progressive Web App (PWA)**. You do not need the App Store.

1.  Deploy to Netlify (see below).
2.  Open the URL in **Safari** on iPhone.
3.  Tap the **Share** icon (bottom center box with arrow).
4.  Scroll down and tap **"Add to Home Screen"**.
5.  Result: Full-screen experience, no browser bars, offline capable.

## 7. Deployment Guide

**Deploy to Netlify (CLI):**
1.  Navigate to project root: `cd ANKI`
2.  Build: `npm run build`
3.  Deploy Prod: `npx netlify deploy --prod`
    - **Publish Directory:** `dist`

**Environment Variables:**
- No server-side env vars needed for basic use.
- Mistral API Key is stored in the user's browser (Settings page).

## 8. Project Structure
```
ANKI/
├── netlify/functions/   # Serverless proxies (chat.ts)
├── public/              # Static assets (manifest.json, icons)
├── src/
│   ├── components/      # Reusable UI (CardDisplay, etc.)
│   │   └── games/       # Game logic components
│   ├── contexts/        # React Context (AuthContext)
│   ├── pages/           # Views (Home, Review, Deck, etc.)
│   ├── utils/           # Logic Core
│   │   ├── ai.ts        # AI wrapper
│   │   ├── fsrs.ts      # SRS Algorithm
│   │   ├── storage.ts   # Local+Cloud Storage manager
│   │   └── srs.ts       # Due date checkers
│   ├── App.tsx          # Router & Layout (Bottom Nav)
│   └── types.ts         # TypeScript Interfaces
├── netlify.toml         # Netlify Config
└── index.html           # Entry HTML (PWA meta tags)
```
