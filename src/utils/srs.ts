import { Card } from '../types';

/**
 * Checks if a card is due for review.
 */
export function isCardDue(card: Card): boolean {
  // If no due date (New card), it's not "Due" in the sense of "Overdue Review"
  if (!card.srsDue) return false;
  
  // Use timestamps for strict comparison to avoid any object identity issues
  const now = Date.now(); 
  const dueDate = new Date(card.srsDue).getTime();
  
  // Invalid date check
  if (isNaN(dueDate)) return false;

  return dueDate <= now;
}

