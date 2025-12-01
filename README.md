# Mandarin Anki Web App

A simple, elegant spaced-repetition (SRS) flashcard app optimized for learning Mandarin Chinese.

## Features

- **Import CSV**: Easily import your vocabulary list.
- **Spaced Repetition**: Uses a simplified SM-2 algorithm to schedule reviews efficiently.
- **Bi-directional Review**: Practice Hanzi → French or French → Hanzi (or mixed).
- **Local Storage**: All data stays in your browser. No server required.

## Tech Stack

- **Vite**: Fast build tool and dev server.
- **React**: UI library.
- **TypeScript**: Type safety.
- **Tailwind CSS**: Styling.
- **PapaParse**: CSV parsing.

## Setup & Run

1.  **Install Dependencies**
    Open your terminal in this folder and run:
    ```bash
    npm install
    ```

2.  **Start Development Server**
    ```bash
    npm run dev
    ```
    Then open the URL shown (usually `http://localhost:5173`).

## CSV Format

The app expects a CSV file with the following headers (case-sensitive):

```csv
Hanzi,Pinyin,Translation,Hint
你好,nǐ hǎo,Bonjour,Greeting
```

- **Hanzi**: The Chinese characters.
- **Pinyin**: The pronunciation.
- **Translation**: The meaning (French).
- **Hint**: Optional hint.

## Project Structure

- `src/main.tsx`: Entry point.
- `src/App.tsx`: Main layout and navigation.
- `src/pages/`: Feature pages (Home, Import, Review).
- `src/components/`: Reusable UI components.
- `src/utils/`: Logic for SRS, Storage, and CSV parsing.
- `src/types.ts`: TypeScript definitions.

