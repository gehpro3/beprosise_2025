
import { Card, Suit } from '../types';

/**
 * Calculates the value of a hand in Blackjack.
 * Aces are counted as 11 unless that would cause a bust, in which case they are 1.
 * @param hand An array of Card objects.
 * @param options Optional settings.
 * @param options.countFaceDown If true, includes face-down cards in the calculation. Defaults to false.
 * @returns The numeric value of the hand.
 */
export const getHandValue = (hand: Card[], { countFaceDown = false } = {}): number => {
    let value = 0;
    let aces = 0;
    for (const card of hand) {
        if (card.isFaceDown && !countFaceDown) continue;
        
        if (['J', 'Q', 'K'].includes(card.rank)) {
            value += 10;
        } else if (card.rank === 'A') {
            aces += 1;
            value += 11;
        } else {
            value += parseInt(card.rank, 10);
        }
    }
    while (value > 21 && aces > 0) {
        value -= 10;
        aces -= 1;
    }
    return value;
};

/**
 * Calculates the value of a hand and determines if it's a "soft" hand (an Ace is counted as 11).
 * @param hand An array of Card objects.
 * @param options Optional settings.
 * @param options.countFaceDown If true, includes face-down cards in the calculation. Defaults to false.
 * @returns An object with the hand's value and an isSoft boolean.
 */
export const getHandDetails = (hand: Card[], { countFaceDown = false } = {}): { value: number; isSoft: boolean } => {
    let value = 0;
    let aces = 0;
    for (const card of hand) {
        if (card.isFaceDown && !countFaceDown) continue;
        
        if (['J', 'Q', 'K'].includes(card.rank)) {
            value += 10;
        } else if (card.rank === 'A') {
            aces += 1;
            value += 11;
        } else {
            value += parseInt(card.rank, 10);
        }
    }
    
    let usableAces = aces;
    while (value > 21 && usableAces > 0) {
        value -= 10;
        usableAces -= 1;
    }

    const isSoft = usableAces > 0;
    return { value, isSoft };
};

// --- SIDE BET LOGIC ---

const PERFECT_PAIRS_PAYOUTS = {
    perfect: 25, // Same suit, same rank
    colored: 12, // Same color, different suit, same rank
    mixed: 6,    // Different color, same rank
};

const TWENTY_ONE_PLUS_THREE_PAYOUTS = {
    straightFlush: 40,
    threeOfAKind: 30,
    straight: 10,
    flush: 5,
};

export const checkPerfectPairs = (hand: Card[]): { type: string; payoutMultiplier: number } | null => {
    if (hand.length !== 2) return null;
    const [card1, card2] = hand;

    if (card1.rank !== card2.rank) return null;

    const isSameSuit = card1.suit === card2.suit;
    if (isSameSuit) {
        return { type: 'Perfect Pair', payoutMultiplier: PERFECT_PAIRS_PAYOUTS.perfect };
    }

    const card1IsRed = card1.suit === Suit.HEARTS || card1.suit === Suit.DIAMONDS;
    const card2IsRed = card2.suit === Suit.HEARTS || card2.suit === Suit.DIAMONDS;
    if (card1IsRed === card2IsRed) {
        return { type: 'Colored Pair', payoutMultiplier: PERFECT_PAIRS_PAYOUTS.colored };
    }

    return { type: 'Mixed Pair', payoutMultiplier: PERFECT_PAIRS_PAYOUTS.mixed };
};

const getCardValueForPoker = (rank: string): number => {
    switch (rank) {
        case 'A': return 14; // Can also be 1 for A-2-3 straight
        case 'K': return 13;
        case 'Q': return 12;
        case 'J': return 11;
        default: return parseInt(rank, 10);
    }
};

export const check21plus3 = (playerHand: Card[], dealerUpCard: Card): { handName: string; payoutMultiplier: number } | null => {
    const threeCards = [...playerHand, dealerUpCard];
    if (threeCards.length !== 3) return null;

    const suits = threeCards.map(c => c.suit);
    const values = threeCards.map(c => getCardValueForPoker(c.rank)).sort((a, b) => a - b);
    
    const isFlush = suits.every(s => s === suits[0]);
    
    const isStraight = (values[2] - values[1] === 1 && values[1] - values[0] === 1) || 
                       // Ace-low straight (A, 2, 3)
                       (values[0] === 2 && values[1] === 3 && values[2] === 14);

    if (isFlush && isStraight) {
        return { handName: 'Straight Flush', payoutMultiplier: TWENTY_ONE_PLUS_THREE_PAYOUTS.straightFlush };
    }

    const isThreeOfAKind = values[0] === values[1] && values[1] === values[2];
    if (isThreeOfAKind) {
        return { handName: 'Three of a Kind', payoutMultiplier: TWENTY_ONE_PLUS_THREE_PAYOUTS.threeOfAKind };
    }

    if (isStraight) {
        return { handName: 'Straight', payoutMultiplier: TWENTY_ONE_PLUS_THREE_PAYOUTS.straight };
    }
    
    if (isFlush) {
        return { handName: 'Flush', payoutMultiplier: TWENTY_ONE_PLUS_THREE_PAYOUTS.flush };
    }

    return null;
};
