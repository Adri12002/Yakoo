import Papa from 'papaparse';
import { v4 as uuidv4 } from 'uuid';
import { Card } from '../types';

interface CSVRow {
  Hanzi: string;
  Pinyin: string;
  Translation: string;
  Hint?: string;
}

export const parseCSV = (file: File): Promise<CSVRow[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          console.error('CSV Parse errors:', results.errors);
        }
        // Simple validation: check if we have at least Hanzi and Translation
        const validRows = (results.data as CSVRow[]).filter(
          row => row.Hanzi && row.Translation
        );
        resolve(validRows);
      },
      error: (error) => {
        reject(error);
      }
    });
  });
};

export const mergeCards = (existingCards: Card[], newRows: CSVRow[]): Card[] => {
  const cardsMap = new Map<string, Card>();

  // Index existing cards by a composite key (Hanzi + Translation) to find duplicates
  existingCards.forEach(card => {
    const key = `${card.hanzi.trim()}-${card.translation.trim()}`;
    cardsMap.set(key, card);
  });

  // Process new rows
  newRows.forEach(row => {
    const key = `${row.Hanzi.trim()}-${row.Translation.trim()}`;
    const existingCard = cardsMap.get(key);

    if (existingCard) {
      // Update content fields, preserve SRS data
      cardsMap.set(key, {
        ...existingCard,
        hanzi: row.Hanzi.trim(),
        pinyin: row.Pinyin.trim(),
        translation: row.Translation.trim(),
        hint: row.Hint?.trim(),
      });
    } else {
      // Create new card
      const newCard: Card = {
        id: uuidv4(),
        hanzi: row.Hanzi.trim(),
        pinyin: row.Pinyin.trim(),
        translation: row.Translation.trim(),
        hint: row.Hint?.trim(),
        // FSRS fields
        srsState: 'new',
        srsStability: 0,
        srsDifficulty: 0,
        srsDue: '', // No due date for new cards until they are studied
        srsRepetitions: 0,
      };
      cardsMap.set(key, newCard);
    }
  });

  return Array.from(cardsMap.values());
};

