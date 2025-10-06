import { Suit, Rank, Card } from '../types';

/**
 * Creates a standard 52-card deck.
 * @returns An array of Card objects representing a full deck.
 */
export const createDeck = (): Card[] => {
    const suits = Object.values(Suit);
    const ranks = Object.values(Rank);
    const deck: Card[] = [];

    for (const suit of suits) {
        for (const rank of ranks) {
            deck.push({ suit, rank });
        }
    }
    return deck;
};

/**
 * Shuffles a deck of cards using the Fisher-Yates algorithm.
 * @param deck The array of cards to be shuffled.
 * @returns A new array with the cards in a random order.
 */
export const shuffleDeck = (deck: Card[]): Card[] => {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
};

/**
 * Creates and shuffles a new 52-card deck.
 * @returns A shuffled array of Card objects.
 */
export const createShuffledDeck = (): Card[] => {
    return shuffleDeck(createDeck());
};


/**
 * Removes cards that are already in play from the main deck.
 * @param deck The full deck of cards.
 * @param dealtCards The cards currently in players' or the dealer's hands.
 * @returns A new deck with the dealt cards removed.
 */
export const removeDealtCards = (deck: Card[], dealtCards: Card[]): Card[] => {
    const dealtCardSet = new Set(dealtCards.map(c => `${c.rank}-${c.suit}`));
    return deck.filter(card => !dealtCardSet.has(`${card.rank}-${card.suit}`));
};
