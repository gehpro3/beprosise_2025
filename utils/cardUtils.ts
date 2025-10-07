import { Card, Rank, Suit } from '../types';

const rankMap: { [key in Rank]: string } = {
    [Rank.ACE]: 'Ace',
    [Rank.TWO]: '2',
    [Rank.THREE]: '3',
    [Rank.FOUR]: '4',
    [Rank.FIVE]: '5',
    [Rank.SIX]: '6',
    [Rank.SEVEN]: '7',
    [Rank.EIGHT]: '8',
    [Rank.NINE]: '9',
    [Rank.TEN]: '10',
    [Rank.JACK]: 'Jack',
    [Rank.QUEEN]: 'Queen',
    [Rank.KING]: 'King',
};

const suitMap: { [key in Suit]: string } = {
    [Suit.HEARTS]: 'Hearts',
    [Suit.DIAMONDS]: 'Diamonds',
    [Suit.CLUBS]: 'Clubs',
    [Suit.SPADES]: 'Spades',
};

export const getCardAriaLabel = (card: Card): string => {
    if (card.isFaceDown) {
        return 'Face down card';
    }
    return `${rankMap[card.rank]} of ${suitMap[card.suit]}`;
};
