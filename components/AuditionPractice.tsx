import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card as CardType, Rank, Suit } from '../types';
import { createShuffledDeck } from '../utils/deck';
import Card from './Card';
import { evaluateDealerTalkCue } from '../services/geminiService';
import ActionFeedback from './ActionFeedback';
import { getHandValue } from '../utils/handCalculator';
import PayoutChart from './PayoutChart';
import BasicStrategyChart from './BasicStrategyChart';

type AuditionState = 'idle' | 'running' | 'finished';
type ScenarioType = 'strategy' | 'math' | 'talk' | 'rules' | 'situational';

interface Scenario {
    type: ScenarioType;
    question: string;
    context: any;
    correctAnswer: string | number;
}

const AUDITION_DIFFICULTY_CONFIG = {
    easy: {
        duration: 120,
        problemTypes: ['strategy', 'math'] as ScenarioType[],
        title: "Cadet Audition",
        description: "Focus on the fundamentals: core skills (basic strategy) and math (standard payouts)."
    },
    medium: {
        duration: 90,
        problemTypes: ['strategy', 'math', 'rules', 'talk'] as ScenarioType[],
        title: "House Audition",
        description: "A standard audition adding rules, procedures, and verbal communication tests."
    },
    hard: {
        duration: 75,
        problemTypes: ['strategy', 'math', 'rules', 'talk', 'situational'] as ScenarioType[],
        title: "High-Stakes Audition",
        description: "The ultimate test. All categories, including complex situational and etiquette questions, at a rapid pace."
    }
};


const MicrophoneIcon: React.FC<{isListening: boolean}> = ({ isListening }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" 
         className={`w-8 h-8 transition-colors ${isListening ? 'text-red-500 animate-pulse' : 'text-slate-400'}`}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5a6 6 0 0 0-12 0v1.5a6 6 0 0 0 6 6Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 14.25v4.5m0-12.75v-1.5m0 12.75a3 3 0 0 1-3-3v-1.5a3 3 0 0 1 6 0v1.5a3 3 0 0 1-3 3Z" />
    </svg>
);

const createCard = (rank: Rank, suit: Suit = Suit.SPADES): CardType => ({ rank, suit, isFaceDown: false });

// --- SCENARIO DATA ---

const strategyScenarios = [
    { q: 'Hard 16 vs. a Dealer 10. What is the correct play?', p: [Rank.TEN, Rank.SIX], d: Rank.TEN, a: 'hit' },
    { q: 'Hard 12 vs. a Dealer 3. What is the correct play?', p: [Rank.TEN, Rank.TWO], d: Rank.THREE, a: 'stand' },
    { q: 'A pair of 8s vs. a Dealer 10. What is the correct play?', p: [Rank.EIGHT, Rank.EIGHT], d: Rank.TEN, a: 'split' },
    { q: 'A pair of 5s vs. a Dealer 6. What is the correct play?', p: [Rank.FIVE, Rank.FIVE], d: Rank.SIX, a: 'double' },
    { q: 'Your hand total is 11 vs. a Dealer 5. What is the correct play?', p: [Rank.SIX, Rank.FIVE], d: Rank.FIVE, a: 'double' },
    { q: 'Soft 18 (Ace, 7) vs. a Dealer 8. What is the correct play?', p: [Rank.ACE, Rank.SEVEN], d: Rank.EIGHT, a: 'stand' },
    { q: 'Soft 18 (Ace, 7) vs. a Dealer 9. What is the correct play?', p: [Rank.ACE, Rank.SEVEN], d: Rank.NINE, a: 'hit' },
    { q: 'Hard 15 vs. a Dealer 10. What is the correct play?', p: [Rank.TEN, Rank.FIVE], d: Rank.TEN, a: 'surrender' },
    { q: 'Hard 13 vs. a Dealer 2. What is the correct play?', p: [Rank.TEN, Rank.THREE], d: Rank.TWO, a: 'stand' },
    { q: 'A pair of 2s vs. a Dealer 4. What is the correct play?', p: [Rank.TWO, Rank.TWO], d: Rank.FOUR, a: 'split' },
    { q: 'A pair of 9s vs. a Dealer 7. What is the correct play?', p: [Rank.NINE, Rank.NINE], d: Rank.SEVEN, a: 'stand' },
    { q: 'Your hand total is 10 vs. a Dealer 9. What is the correct play?', p: [Rank.SIX, Rank.FOUR], d: Rank.NINE, a: 'hit' },
    { q: 'Soft 19 (Ace, 8) vs. a Dealer 6. What is the correct play?', p: [Rank.ACE, Rank.EIGHT], d: Rank.SIX, a: 'double' },
    { q: 'A pair of Aces vs. any Dealer card. What is the correct play?', p: [Rank.ACE, Rank.ACE], d: Rank.SIX, a: 'split' },
    { q: 'Hard 12 vs. a Dealer 6. What is the correct play?', p: [Rank.SEVEN, Rank.FIVE], d: Rank.SIX, a: 'stand' },
    { q: 'Hard 14 vs. a Dealer 2. What is the correct play?', p: [Rank.NINE, Rank.FIVE], d: Rank.TWO, a: 'stand' },
    { q: 'Hard 10 vs. a Dealer 10. What is the correct play?', p: [Rank.EIGHT, Rank.TWO], d: Rank.TEN, a: 'hit' },
    { q: 'Soft 15 (Ace, 4) vs. a Dealer 4. What is the correct play?', p: [Rank.ACE, Rank.FOUR], d: Rank.FOUR, a: 'hit' },
    { q: 'A pair of 4s vs. a Dealer 5. What is the correct play?', p: [Rank.FOUR, Rank.FOUR], d: Rank.FIVE, a: 'split' },
    { q: 'A pair of 6s vs. a Dealer 2. What is the correct play?', p: [Rank.SIX, Rank.SIX], d: Rank.TWO, a: 'split' },
    { q: 'Hard 16 vs. a Dealer 9. What is the correct play?', p: [Rank.TEN, Rank.SIX], d: Rank.NINE, a: 'surrender' },
    { q: 'Hard 9 vs. a Dealer 3. What is the correct play?', p: [Rank.FIVE, Rank.FOUR], d: Rank.THREE, a: 'double' },
    { q: 'Soft 13 (Ace, 2) vs. a Dealer 5. What is the correct play?', p: [Rank.ACE, Rank.TWO], d: Rank.FIVE, a: 'double' },
    { q: 'A pair of 7s vs. a Dealer 7. What is the correct play?', p: [Rank.SEVEN, Rank.SEVEN], d: Rank.SEVEN, a: 'split' },
    { q: 'Hard 17 vs. a Dealer Ace. What is the correct play?', p: [Rank.TEN, Rank.SEVEN], d: Rank.ACE, a: 'stand' },
    { q: 'Hard 12 vs. a Dealer 2. What is the correct play?', p: [Rank.TEN, Rank.TWO], d: Rank.TWO, a: 'hit' },
    { q: 'Hard 13 vs. a Dealer 6. What is the correct play?', p: [Rank.SEVEN, Rank.SIX], d: Rank.SIX, a: 'stand' },
    { q: 'Hard 14 vs. a Dealer 7. What is the correct play?', p: [Rank.NINE, Rank.FIVE], d: Rank.SEVEN, a: 'hit' },
    { q: 'Hard 15 vs. a Dealer 2. What is the correct play?', p: [Rank.TEN, Rank.FIVE], d: Rank.TWO, a: 'stand' },
    { q: 'Hard 16 vs. a Dealer 7. What is the correct play?', p: [Rank.NINE, Rank.SEVEN], d: Rank.SEVEN, a: 'hit' },
    { q: 'Hard 9 vs. a Dealer 2. What is the correct play?', p: [Rank.SIX, Rank.THREE], d: Rank.TWO, a: 'hit' },
    { q: 'Hard 10 vs. a Dealer Ace. What is the correct play?', p: [Rank.EIGHT, Rank.TWO], d: Rank.ACE, a: 'hit' },
    { q: 'Soft 13 (Ace, 2) vs. a Dealer 4. What is the correct play?', p: [Rank.ACE, Rank.TWO], d: Rank.FOUR, a: 'hit' },
    { q: 'Soft 14 (Ace, 3) vs. a Dealer 6. What is the correct play?', p: [Rank.ACE, Rank.THREE], d: Rank.SIX, a: 'double' },
    { q: 'Soft 15 (Ace, 4) vs. a Dealer 5. What is the correct play?', p: [Rank.ACE, Rank.FOUR], d: Rank.FIVE, a: 'double' },
    { q: 'Soft 16 (Ace, 5) vs. a Dealer 6. What is the correct play?', p: [Rank.ACE, Rank.FIVE], d: Rank.SIX, a: 'double' },
    { q: 'Soft 17 (Ace, 6) vs. a Dealer 2. What is the correct play?', p: [Rank.ACE, Rank.SIX], d: Rank.TWO, a: 'hit' },
    { q: 'Soft 19 (Ace, 8) vs. a Dealer 5. What is the correct play?', p: [Rank.ACE, Rank.EIGHT], d: Rank.FIVE, a: 'stand' },
    { q: 'A pair of 2s vs. a Dealer 8. What is the correct play?', p: [Rank.TWO, Rank.TWO], d: Rank.EIGHT, a: 'hit' },
    { q: 'A pair of 3s vs. a Dealer 8. What is the correct play?', p: [Rank.THREE, Rank.THREE], d: Rank.EIGHT, a: 'hit' },
    { q: 'A pair of 4s vs. a Dealer 4. What is the correct play?', p: [Rank.FOUR, Rank.FOUR], d: Rank.FOUR, a: 'hit' },
    { q: 'A pair of 6s vs. a Dealer 7. What is the correct play?', p: [Rank.SIX, Rank.SIX], d: Rank.SEVEN, a: 'hit' },
    { q: 'A pair of 7s vs. a Dealer 8. What is the correct play?', p: [Rank.SEVEN, Rank.SEVEN], d: Rank.EIGHT, a: 'hit' },
    { q: 'A pair of 9s vs. a Dealer Ace. What is the correct play?', p: [Rank.NINE, Rank.NINE], d: Rank.ACE, a: 'stand' },
    { q: 'A pair of 10s vs. a Dealer 6. What is the correct play?', p: [Rank.TEN, Rank.TEN], d: Rank.SIX, a: 'stand' },
    { q: 'Hard 16 vs. a Dealer Ace. What is the correct play?', p: [Rank.TEN, Rank.SIX], d: Rank.ACE, a: 'surrender' },
    { q: 'Hard 8 vs. a Dealer 6. What is the correct play?', p: [Rank.FIVE, Rank.THREE], d: Rank.SIX, a: 'hit' },
    { q: 'Soft 20 (Ace, 9) vs. a Dealer 6. What is the correct play?', p: [Rank.ACE, Rank.NINE], d: Rank.SIX, a: 'stand' },
    { q: 'Hard 17 vs. a Dealer 8. What is the correct play?', p: [Rank.TEN, Rank.SEVEN], d: Rank.EIGHT, a: 'stand' },
];

const mathScenarios = [
    {
        q: "A player bets $20 and gets a Blackjack on a 3:2 table. What is the correct payout?",
        options: ["$20", "$25", "$30", "$40"],
        a: "$30",
        explanation: "A 3:2 payout is 1.5 times the bet. $20 x 1.5 = $30."
    },
    {
        q: "A player bets $15 and gets a Blackjack on a 6:5 table. What is the correct payout?",
        options: ["$18", "$20", "$22.50", "$15"],
        a: "$18",
        explanation: "A 6:5 payout is 1.2 times the bet. $15 x 1.2 = $18."
    },
    {
        q: "A player bets $40, doubles down, and wins. What is the winning payout amount you push to them?",
        options: ["$40", "$80", "$120", "$160"],
        a: "$80",
        explanation: "The player's total bet becomes $80 ($40 original + $40 double). A winning bet pays 1:1, so the payout is $80."
    },
     {
        q: "A player bets $35. They surrender their hand. How much of their bet do they lose?",
        options: ["$35", "$17.50", "$0", "$52.50"],
        a: "$17.50",
        explanation: "Surrendering forfeits half of the original bet. $35 / 2 = $17.50."
    },
    {
        q: "A player bets $25 and gets a Blackjack on a 3:2 table. What is the correct payout?",
        options: ["$30", "$37.50", "$50", "$25"],
        a: "$37.50",
        explanation: "A 3:2 payout is 1.5 times the bet. $25 x 1.5 = $37.50."
    },
    {
        q: "A player has a $50 bet and takes insurance for $25. The dealer has a Blackjack. What is the net result for the player's round?",
        options: ["They lose $50", "They lose $25", "It's a push (no win/loss)", "They win $25"],
        a: "It's a push (no win/loss)",
        explanation: "The main $50 bet loses to the dealer's Blackjack, but the $25 insurance bet pays 2:1 ($50). The net result is zero."
    },
    {
        q: "A player bets $10, splits a pair of 8s, and wins on one hand and loses on the other. What is the net result?",
        options: ["They win $10", "It's a push (no win/loss)", "They lose $10", "They lose $20"],
        a: "It's a push (no win/loss)",
        explanation: "The player wins $10 on one hand and loses $10 on the other, resulting in a net zero gain or loss."
    },
    {
        q: "A player bets $75 and gets a Blackjack on a 3:2 table. What is the correct payout?",
        options: ["$100", "$112.50", "$150", "$75"],
        a: "$112.50",
        explanation: "A 3:2 payout is 1.5 times the bet. $75 x 1.5 = $112.50."
    },
    {
        q: "A player bets $25 and gets a Blackjack on a 6:5 table. What is the correct payout?",
        options: ["$30", "$27.50", "$31.25", "$35"],
        a: "$30",
        explanation: "A 6:5 payout is 1.2 times the bet. $25 x 1.2 = $30."
    },
    {
        q: "A player bets $125 and wins the hand. What is the correct payout?",
        options: ["$125", "$187.50", "$250", "$150"],
        a: "$125",
        explanation: "A standard win pays 1:1. The payout matches the bet."
    },
    {
        q: "A player bets $60, doubles down, and wins. What is the total amount you give back to the player (original bet + winnings)?",
        options: ["$60", "$120", "$180", "$240"],
        a: "$240",
        explanation: "The total bet is $120 ($60 original + $60 double). The win is $120. The total returned is the $120 bet plus the $120 win, equaling $240."
    },
    {
        q: "A player has a $15 bet. They take insurance for $7.50. The dealer does NOT have a Blackjack. What is the result of the insurance bet?",
        options: ["The insurance bet is returned.", "The insurance bet pays $15.", "The insurance bet loses.", "It depends on the player's hand."],
        a: "The insurance bet loses.",
        explanation: "Insurance is a side bet that only wins if the dealer has Blackjack. If they don't, the insurance bet is lost."
    },
    {
        q: "A player bets $5 and gets a Blackjack on a 6:5 table. What is the payout?",
        options: ["$5", "$6", "$7.50", "$10"],
        a: "$6",
        explanation: "A 6:5 payout is 1.2 times the bet. $5 x 1.2 = $6."
    },
    {
        q: "A player bets $10 on two separate hands. Hand 1 wins, Hand 2 loses. What is the net result?",
        options: ["Win $10", "Push (no win/loss)", "Lose $10", "Lose $20"],
        a: "Push (no win/loss)",
        explanation: "The player wins $10 on the first hand and loses $10 on the second. The net result is zero."
    },
    {
        q: "A player bets $150, and the dealer gets a Blackjack. The player does not have Blackjack. What is the result?",
        options: ["Player loses $150", "Player loses $75", "It's a push", "Player loses $225"],
        a: "Player loses $150",
        explanation: "If the dealer has a Blackjack, all player bets lose unless the player also has a Blackjack (which would be a push)."
    },
    {
        q: "A player bets $12.50 and gets a Blackjack on a 3:2 table. What is the payout?",
        options: ["$15", "$18.75", "$25", "$17.50"],
        a: "$18.75",
        explanation: "A 3:2 payout is 1.5 times the bet. $12.50 x 1.5 = $18.75."
    },
    {
        q: "A player has a $100 bet and gets a Blackjack. The dealer also has a Blackjack. The player did not take even money or insurance. What is the outcome?",
        options: ["Player wins $150", "Player wins $100", "Push", "Player loses $100"],
        a: "Push",
        explanation: "When both the player and dealer have a natural Blackjack, the result is a push. The player's bet is returned with no win or loss."
    },
    {
        q: "A player makes a $25 bet and gets a Blackjack. The dealer shows an Ace. The player takes 'Even Money'. What is the total payout they receive?",
        options: ["$25", "$37.50", "$50", "$0"],
        a: "$25",
        explanation: "'Even Money' is an option for a player with Blackjack when the dealer has an Ace. It guarantees a 1:1 payout ($25) immediately, regardless of the dealer's final hand."
    },
    {
        q: "A player splits a pair of 7s for $25 each. The first hand gets a total of 20 and wins. The second hand gets a total of 19 and pushes. What is the net win?",
        options: ["$25", "$50", "Push", "$12.50"],
        a: "$25",
        explanation: "The first hand wins $25. The second hand pushes, so the $25 bet is returned. The total net win for the round is $25."
    },
    {
        q: "What is the total amount you give back to a player who bet $50 and won (including their original bet)?",
        options: ["$50", "$75", "$100", "$150"],
        a: "$100",
        explanation: "A standard win pays 1:1. You pay them $50 for their win and return their original $50 bet, for a total of $100."
    },
    {
        q: "A player bets $25, splits 8s. First hand wins, second hand loses. What is the net result?",
        options: ["Win $25", "Lose $25", "Push", "Win $50"],
        a: "Push",
        explanation: "The player wins $25 on one hand and loses their $25 bet on the other, resulting in a net outcome of zero (a push)."
    },
    {
        q: "A player has two hands of $50. Hand 1 gets a Blackjack (3:2). Hand 2 loses. What is the player's net win?",
        options: ["$75", "$50", "$25", "$125"],
        a: "$25",
        explanation: "Hand 1 wins $75 ($50 x 1.5). Hand 2 loses $50. The net result is a win of $25 ($75 - $50)."
    },
    {
        q: "A player bets $10, splits 3s. They double down on the first hand (total bet $20) and win. The second hand ($10 bet) pushes. What's the net win?",
        options: ["$10", "$20", "$30", "Push"],
        a: "$20",
        explanation: "The first hand wins $20. The second hand is a push (bet returned). The total net win is $20."
    },
    {
        q: "A player gives you three $25 (green) chips and five $5 (red) chips for a color-up. What single chip do you give them back?",
        options: ["One $100 chip (black)", "Four $25 chips (green)", "Two $50 chips (custom)", "One $500 chip (purple)"],
        a: "One $100 chip (black)",
        explanation: "(3 x $25) + (5 x $5) = $75 + $25 = $100. The most efficient exchange is a single $100 black chip."
    },
    {
        q: "A player makes a $45 bet and gives you a $500 (purple) chip. What is the correct amount of change?",
        options: ["$450", "$455", "$545", "$500"],
        a: "$455",
        explanation: "The correct procedure is to take the bet from the payment. $500 - $45 = $455 change."
    },
    {
        q: "A player has a main bet of $100 and a $25 'back line' bet from another player. The hand gets a Blackjack (3:2). How much do you pay the back line bettor?",
        options: ["$25", "$37.50", "$150", "$187.50"],
        a: "$37.50",
        explanation: "The back line bettor's wager is treated independently. A $25 bet on a 3:2 Blackjack pays $37.50 ($25 x 1.5)."
    },
    {
        q: "A player splits Aces for $50 each. The first hand receives a 10 and wins. The second hand receives a 4 and loses. What is the net result?",
        options: ["Push", "Win $50", "Lose $50", "Win $25"],
        a: "Push",
        explanation: "A 21 after splitting pays 1:1. The first hand wins $50. The second hand loses $50. The net result is a push."
    }
];

const rulesScenarios = [
    {
        q: "In Virginia, what is the standard rule for a dealer's hand of 17?",
        options: ["Dealer always stands on 17.", "Dealer hits on soft 17, stands on hard 17.", "Dealer always hits on 17.", "Dealer's action depends on the player's hand."],
        a: "Dealer hits on soft 17, stands on hard 17.",
        explanation: "This rule (H17) is standard in most Virginia casinos and slightly increases the house edge."
    },
    {
        q: "After splitting Aces, how many cards is the player allowed to take per hand?",
        options: ["As many as they want.", "Only one card.", "Two cards.", "It depends on the dealer's up-card."],
        a: "Only one card.",
        explanation: "Splitting Aces is a powerful move, so it's restricted to receiving only one additional card per Ace."
    },
    {
        q: "When is a player typically allowed to 'double down'?",
        options: ["On any hand.", "Only on a hand totaling 9, 10, or 11.", "On their initial two cards.", "After they have already hit once."],
        a: "On their initial two cards.",
        explanation: "Doubling down is an option available only on a player's starting two-card hand, before any hits."
    },
    {
        q: "What does 'late surrender' mean?",
        options: ["You can surrender at any time.", "You can surrender after the dealer checks for Blackjack.", "You can surrender after taking a hit.", "Only the last player to act can surrender."],
        a: "You can surrender after the dealer checks for Blackjack.",
        explanation: "Late surrender means the player loses their full bet if the dealer has a Blackjack. The option is only offered after the dealer confirms they do not."
    },
    {
        q: "What is the maximum number of hands a player can usually form by re-splitting pairs?",
        options: ["Two hands", "Three hands", "Four hands", "Unlimited"],
        a: "Four hands",
        explanation: "Most casinos allow a player to split up to three times, resulting in a maximum of four separate hands."
    },
    {
        q: "A hand consisting of an Ace and a 6 is called what?",
        options: ["Hard 7", "Soft 17", "Hard 17", "A blackjack"],
        a: "Soft 17",
        explanation: "A 'soft' hand is any hand containing an Ace that can be counted as 11 without busting."
    },
    {
        q: "A player splits a pair of 10s and gets an Ace on the first hand. Is this a Blackjack?",
        options: ["Yes, it pays 3:2.", "Yes, but it only pays 1:1.", "No, it is a hand total of 21.", "The hand is a push."],
        a: "No, it is a hand total of 21.",
        explanation: "A true Blackjack can only be achieved on the first two cards dealt. A 21 made after splitting pays 1:1."
    },
    {
        q: "What is the result when both the player and the dealer have a Blackjack?",
        options: ["Player wins", "Dealer wins", "Push", "The bet is replayed"],
        a: "Push",
        explanation: "When both parties have a natural Blackjack, the result is a push, and the player's bet is returned."
    },
    {
        q: "What is the standard payout for a winning Insurance bet?",
        options: ["1:1", "3:2", "2:1", "6:5"],
        a: "2:1",
        explanation: "Insurance pays 2 to 1 on the side bet amount, which is typically half of the original wager."
    },
    {
        q: "In a standard multi-deck shoe game, are players generally allowed to touch their cards?",
        options: ["Yes, at any time.", "Yes, but only with one hand.", "No, cards should not be touched.", "Only to place them for a split."],
        a: "No, cards should not be touched.",
        explanation: "In games dealt from a shoe, players are not permitted to touch their cards for security reasons."
    },
    {
        q: "What is the correct hand signal for 'Hit'?",
        options: ["Waving a hand horizontally over the cards.", "Tapping the felt with a finger.", "Placing additional chips next to the bet.", "Making a 'come here' motion."],
        a: "Tapping the felt with a finger.",
        explanation: "Tapping or scratching the felt is the universal non-verbal signal to request another card."
    },
    {
        q: "Can a player double down on a hand of three or more cards?",
        options: ["Yes, if their total is 9, 10, or 11.", "No, doubling down is only allowed on the initial two cards.", "Yes, but only if the casino allows it.", "Only if they have not yet split."],
        a: "No, doubling down is only allowed on the initial two cards.",
        explanation: "The option to double the bet is only available immediately after the first two cards are dealt."
    },
    {
        q: "A player wants to place a $500 bet with one purple chip. What is the procedure?",
        options: ["Accept the bet as is.", "Announce 'check play' and get supervisor approval.", "The bet must be made with smaller denomination chips.", "There is no special procedure."],
        a: "Announce 'check play' and get supervisor approval.",
        explanation: "High-value single chip bets ('lammer checks') often require supervisor approval for game security and accounting."
    },
    {
        q: "What is the primary purpose of the 'cut card' in a shoe game?",
        options: ["To mark the dealer's hand.", "To indicate when the shoe needs to be shuffled.", "To separate different decks.", "To hide the bottom card from view."],
        a: "To indicate when the shoe needs to be shuffled.",
        explanation: "The cut card is placed in the deck after a shuffle to determine the approximate point at which the dealer will shuffle again, ensuring deck penetration is consistent."
    },
    {
        q: "If a player's hand total is the same as the dealer's (e.g., both have 19), what is the outcome?",
        options: ["Player wins", "Dealer wins", "Push", "Player loses half the bet"],
        a: "Push",
        explanation: "When the final hand totals are equal, it's a push (a tie), and the player's bet is returned."
    },
    {
        q: "A player places $200 in cash in the betting circle and says 'Play two hundred.' What is the correct procedure?",
        options: ["Announce 'Money Plays,' accept the bet for one hand, and provide change in chips after the round.", "Refuse the bet and ask for it in chips.", "Provide chips first, then let them bet.", "Split the cash into two $100 bets."],
        a: "Announce 'Money Plays,' accept the bet for one hand, and provide change in chips after the round.",
        explanation: "'Money Plays' is the standard call. You accept the cash bet for a single round, and the transaction to chips is completed after. You do not provide change first."
    },
    {
        q: "During the deal, a card accidentally flies off the table and lands on the floor. What is the proper procedure?",
        options: ["Pick it up, show it to the players, and place it in the discard tray.", "Pick it up and deal it to the intended player.", "Pick it up and place it back in the shoe.", "Call your floor supervisor; the card is typically considered dead."],
        a: "Call your floor supervisor; the card is typically considered dead.",
        explanation: "A card leaving the table is an irregularity. The floor supervisor must be called to make a ruling. Usually, the card is shown and then discarded."
    },
    {
        q: "A player has five $5 chips and wants to exchange them for one $25 chip. What is this procedure called and what do you say?",
        options: ["Changing up. Five for twenty-five.", "Coloring up. Five for twenty-five.", "Cashing out. Five for twenty-five.", "Making change. Five for twenty-five."],
        a: "Coloring up. Five for twenty-five.",
        explanation: "Exchanging smaller denomination chips for larger ones is called 'coloring up.' The dealer should announce the transaction clearly for surveillance."
    },
    {
        q: "A player wants to bet a $5 chip for the dealer as a tip. Where should this bet be placed?",
        options: ["On top of the player's own bet.", "In the dealer's chip tray.", "On the felt just outside the player's betting spot.", "The dealer holds it until the hand is over."],
        a: "On the felt just outside the player's betting spot.",
        explanation: "Dealer bets are placed separate from the player's bet to avoid confusion, typically in front of the player's bet. This ensures it's clear whose bet it is."
    },
    {
        q: "The correct hand signal for 'stand' or 'stay' in a face-up shoe game is:",
        options: ["Tapping the table.", "Making no signal at all.", "Pushing the cards forward.", "Waving a flat hand horizontally over the cards."],
        a: "Waving a flat hand horizontally over the cards.",
        explanation: "A horizontal wave is the universal, unambiguous signal to stand, ensuring there is no confusion for the dealer or surveillance."
    },
    {
        q: "What is the rule regarding players placing personal items like wallets or phones on the blackjack table?",
        options: ["They are allowed as long as they don't touch the cards.", "They are only allowed if the player is not betting.", "They are generally not allowed on the felt; designated areas should be used.", "They are allowed anywhere except in the betting circles."],
        a: "They are generally not allowed on the felt; designated areas should be used.",
        explanation: "To maintain game security and prevent damage to the layout, personal items are typically prohibited from being placed on the felt."
    },
    {
        q: "If you burn a card by accident (exposing the top card of the deck before it's time to deal), what is the procedure?",
        options: ["Announce the error and call the floor supervisor for a decision.", "Put the card in the discard tray and continue.", "Show the card to all players and then deal it as the next card.", "Shuffle the deck again immediately."],
        a: "Announce the error and call the floor supervisor for a decision.",
        explanation: "Any deviation from standard dealing procedure, especially an exposed card, is an irregularity that requires a supervisor's ruling to maintain game integrity."
    },
    {
        q: "A player claims they bet $25, but only a $5 chip is in the betting circle. What should you do?",
        options: ["Pay them for a $25 bet to avoid confrontation.", "Pay them for the $5 bet because that's what is there.", "Ask other players what they saw.", "Do not argue; call the floor supervisor to resolve the dispute."],
        a: "Do not argue; call the floor supervisor to resolve the dispute.",
        explanation: "Dealers never resolve monetary disputes themselves. The supervisor will investigate, possibly with the help of surveillance, to make a final decision."
    },
    {
        q: "What does it mean to 'prove your hand'?",
        options: ["Asking the pit boss to verify your hand total.", "Counting your cards aloud and pointing to them to clearly show your final total, especially when you bust.", "Showing the players your hole card before you act.", "Proving you followed basic strategy."],
        a: "Counting your cards aloud and pointing to them to clearly show your final total, especially when you bust.",
        explanation: "This is a key procedure for clarity and security. By audibly and visually confirming your hand total, you prevent any confusion or disputes about the outcome."
    },
    {
        q: "If a player has a Blackjack and you have a 10 showing, what is the FIRST thing you must do before paying them?",
        options: ["Pay the player immediately 3:2.", "Offer the player Insurance.", "Check your hole card to see if you also have a Blackjack.", "Ask the player if they want 'even money'."],
        a: "Check your hole card to see if you also have a Blackjack.",
        explanation: "The dealer must always check for a Blackjack if their upcard is a 10 or an Ace before any payouts or further play. A dealer Blackjack results in a push."
    }
];

const talkScenarios = [
    {
        q: "A player places $100 cash on the felt. What is the first procedure call you make?",
        a: "Changing one hundred"
    },
    {
        q: "You've dealt the cards. Your up-card is a Jack. What do you announce to the table?",
        a: "Dealer shows a ten"
    },
    {
        q: "The player in seat 3 has been thinking for a while and the game has stalled. How do you politely prompt them for a decision?",
        a: "Prompt for action (e.g., 'Your decision, sir?')"
    },
    {
        q: "You've just called 'No more bets' and started dealing. A player pushes a late bet forward. What do you say while returning the bet?",
        a: "No more bets"
    },
    {
        q: "You hit your hand and receive a card that brings your total to 23. What do you announce as you bust?",
        a: "Dealer busts"
    },
    {
        q: "A player has a $25 bet and gets a Blackjack. As you pay them $37.50, what do you announce?",
        a: "Blackjack pays..."
    },
    {
        q: "You have just cleared all bets and cards from the previous round. What do you say to begin the next hand?",
        a: "Place your bets"
    },
    {
        q: "Your up-card is an Ace. What side bet do you offer to the players?",
        a: "Insurance is open"
    },
    {
        q: "A player pushes forward five $5 chips and wants to exchange them. What do you say while giving them a $25 chip?",
        a: "Coloring up"
    },
    {
        q: "A player hits their hand and their total is now 24. What do you announce as you take their cards and bet?",
        a: "Player busts"
    },
    {
        q: "At the end of the hand, both you and a player have a total of 19. What do you announce for that hand?",
        a: "Push nineteen"
    },
    {
        q: "A player signals to surrender their hand. What do you say as you take half their bet?",
        a: "Player surrenders"
    },
    {
        q: "You have completed drawing cards to your hand and have a total of 18. What do you announce?",
        a: "Dealer has eighteen"
    },
    {
        q: "A player wins with a hand total of 20. What do you say as you pay their bet?",
        a: "Player has twenty"
    },
    {
        q: "A player puts a $20 bill on the table but does not place a bet. They just want chips. What do you announce?",
        a: "Check change twenty"
    },
    {
        q: "A player wants to double down on their hand. What is the verbal announcement?",
        a: "Player doubles"
    },
    {
        q: "A player is splitting a pair of 7s. What do you announce?",
        a: "Splitting sevens"
    },
    {
        q: "You pay a winning bet of $125. What do you say?",
        a: "Pays one twenty-five"
    },
    {
        q: "A player has 14 and hits, receiving an 8. What do you announce as you take their cards?",
        a: "Player busts, twenty-two"
    },
    {
        q: "You are proving your count after busting with a 10, 6, and 8. What would you announce?",
        a: "Sixteen, twenty-four. Dealer busts."
    },
    {
        q: "A player puts cash directly on their bet. What is the standard dealer response?",
        a: "Money plays"
    },
    {
        q: "After all players have acted, you reveal your hole card. Your hand is a 10 and a 4. What do you announce?",
        a: "Dealer has fourteen"
    },
    {
        q: "You draw a 7 to your 14, making your total 21. What do you announce?",
        a: "Dealer has twenty-one"
    },
    {
        q: "A player puts a $100 chip in the betting circle for a $25 bet. What is the procedure call for the change?",
        a: "Change seventy-five"
    },
    {
        q: "The dealer has 19, and a player has 20. What is the verbal call when paying the winning hand?",
        a: "Twenty is a winner"
    },
    {
        q: "A player places a $5 chip for you as a tip, and the hand wins. What's a professional announcement as you pay it?",
        a: "Dealer's bet pays five"
    },
    {
        q: "A player places a $1 chip for you as a tip, and the hand loses. How do you professionally acknowledge it?",
        a: "Thank you for the bet"
    },
    {
        q: "A player gives a vague hand signal. How do you verbally clarify their intention?",
        a: "Hit or stand?"
    },
    {
        q: "A new player wants to join the game in the middle of a shoe. What must you tell them?",
        a: "You can play on the next shuffle"
    },
    {
        q: "After offering insurance, you check your hole card and do not have a Blackjack. What do you announce?",
        a: "Insurance is closed"
    },
    {
        q: "The main hand wins. A player betting behind them also has a winning bet. What do you announce for the back bet?",
        a: "Paying the back line"
    },
    {
        q: "A player tries to bet with a chip from another casino. What's the correct response?",
        a: "I can't accept these chips"
    },
    {
        q: "A player pushes forward ten $100 chips and asks for higher denomination chips. What's the call?",
        a: "Coloring up one thousand"
    },
    {
        q: "You have 18. Player 1 (to your right) has 20 and Player 2 has 17. What are the two main calls you would make in order?",
        a: "Twenty wins, seventeen loses"
    },
    {
        q: "A player puts down $5 cash and says 'bet it all' when the table minimum is $10. What do you politely say?",
        a: "The table minimum is ten dollars"
    },
    {
        q: "A player has a Blackjack, and you are showing an Ace. What specific payout option do you offer them?",
        a: "Even money?"
    },
    {
        q: "A player wants to bet with foreign currency instead of dollars. Where do you direct them?",
        a: "Please visit the cashier's cage"
    }
];


const etiquetteScenarios = [
    {
        q: "A player wants to place a bet after you've called 'No more bets.' What is the correct action?",
        options: [
            "Allow the bet since the cards aren't out yet.",
            "Politely state that no more bets can be placed and return their chips.",
            "Tell the player they need to be faster next time.",
            "Ask the floor supervisor for permission to accept the bet."
        ],
        a: "Politely state that no more bets can be placed and return their chips.",
        explanation: "This maintains game integrity and fairness. Once 'No more bets' is called, the betting round is officially closed."
    },
    {
        q: "A player at your table appears to be intoxicated and is disrupting other players. What should you do?",
        options: [
            "Ignore them and continue dealing.",
            "Tell them to be quiet or they will have to leave.",
            "Subtly signal your floor supervisor to handle the situation.",
            "Deal them out of the next hand."
        ],
        a: "Subtly signal your floor supervisor to handle the situation.",
        explanation: "Dealers should not confront disruptive players. Your floor supervisor is trained in de-escalation and has the authority to handle these situations safely."
    },
    {
        q: "You mispay a player, giving them too much money, and they don't say anything. You only realize after the next hand starts. What do you do?",
        options: [
            "Take the money back from their stack on the next round.",
            "Inform your floor supervisor immediately about the error.",
            "Say nothing to avoid a conflict with the player.",
            "Pay the next player short to make up for the loss."
        ],
        a: "Inform your floor supervisor immediately about the error.",
        explanation: "Transparency is key. Supervisors must be aware of all payment errors for accounting and surveillance. They will determine the correct procedure."
    },
    {
        q: "A player tries to hand you cash. What is the correct procedure?",
        options: [
            "Take the cash and give them chips from your tray.",
            "Have them place the cash on the table, state 'Changing money', count it, and then provide chips.",
            "Tell them to go to the cashier's cage.",
            "Tuck the cash under a chip in your tray until the hand is over."
        ],
        a: "Have them place the cash on the table, state 'Changing money', count it, and then provide chips.",
        explanation: "This is a critical security procedure. Placing cash on the felt ensures it's visible to cameras, and announcing the transaction prevents disputes."
    },
    {
        q: "A player is upset about losing a hand and blames you. What is the most professional response?",
        options: [
            "Tell them it's just bad luck.",
            "Remain calm, professional, and do not engage in an argument.",
            "Explain to them they made a bad strategy decision.",
            "Ignore their comment and start the next hand immediately."
        ],
        a: "Remain calm, professional, and do not engage in an argument.",
        explanation: "A dealer's job is to maintain a professional and courteous table environment. Do not argue or offer unsolicited advice. If the behavior persists, notify your supervisor."
    },
    {
        q: "When coloring up a large amount of small denomination chips for a player, what is a crucial part of the procedure?",
        options: [
            "Do it as quickly as possible to not hold up the game.",
            "Count the chips in stacks of 20 and announce the total before making the exchange.",
            "Ask the player to count their own chips first.",
            "Exchange the chips under the table for security."
        ],
        a: "Count the chips in stacks of 20 and announce the total before making the exchange.",
        explanation: "This procedure ensures accuracy and transparency for both the player and casino surveillance. Clear announcements are mandatory."
    },
    {
        q: "A player asks for your advice on how to play their hand. What is the correct response?",
        options: [
            "Tell them what Basic Strategy recommends.",
            "Politely state that you are not allowed to give advice.",
            "Suggest that they stand to be safe.",
            "Ignore the question and wait for their signal."
        ],
        a: "Politely state that you are not allowed to give advice.",
        explanation: "Dealers must remain impartial and cannot influence a player's decision, as this could make the casino liable for the outcome of the hand."
    },
    {
        q: "A player wants to join the game in the middle of a shoe. What should you tell them?",
        options: [
            "Welcome them and deal them in on the next hand.",
            "Tell them they must wait until the next shuffle to begin playing.",
            "Ask the other players at the table if they mind.",
            "Deal them in, but they can only bet the table minimum."
        ],
        a: "Tell them they must wait until the next shuffle to begin playing.",
        explanation: "This rule, known as 'No Mid-Shoe Entry', is a common game protection measure to deter card counters."
    },
    {
        q: "You accidentally expose your hole card while dealing. What is the correct procedure?",
        options: [
            "Quickly turn it back over and continue the hand.",
            "Leave the card exposed and continue the hand as normal.",
            "Announce the card to the table and apologize.",
            "Stop the game and call your floor supervisor immediately."
        ],
        a: "Stop the game and call your floor supervisor immediately.",
        explanation: "An exposed hole card is a serious game irregularity. The supervisor must be notified to make a ruling, which could involve voiding the hand."
    },
    {
        q: "A player is using their phone at the table while a hand is in progress. What is the professional way to handle this?",
        options: [
            "Ignore it, as it's not your concern.",
            "Tell them to put their phone away immediately.",
            "Politely remind them of the casino's policy against phone use during play.",
            "Deal them out of the next hand as a warning."
        ],
        a: "Politely remind them of the casino's policy against phone use during play.",
        explanation: "A polite reminder is the first step. If they persist, you would then notify your floor supervisor. It's important to enforce rules while maintaining a good atmosphere."
    },
    {
        q: "A player places their drink on the green felt, inside the betting line. What should you do?",
        options: [
            "Move the drink for them to the designated drink holder.",
            "Politely ask the player to move their drink off the layout to prevent spills.",
            "Say nothing, as it could upset the player.",
            "Call the floor supervisor to handle the issue."
        ],
        a: "Politely ask the player to move their drink off the layout to prevent spills.",
        explanation: "It is your responsibility to protect the equipment. A polite request is the standard and most effective first action."
    },
    {
        q: "Another player at the table is loudly criticizing a new player's decisions. What is your role in this situation?",
        options: [
            "Agree with the critical player to show you know the strategy.",
            "Tell the critical player to mind their own business.",
            "Subtly signal your floor supervisor while maintaining a neutral demeanor.",
            "Explain the correct strategy to both players."
        ],
        a: "Subtly signal your floor supervisor while maintaining a neutral demeanor.",
        explanation: "Player disputes should be handled by the floor supervisor. Your role is to run the game and discreetly alert management to issues that disrupt the table."
    },
    {
        q: "A player uses an ambiguous hand signal, like a slight, indecisive wave over their cards. What should you do?",
        options: [
            "Assume they mean to stand, as it's the safer option.",
            "Assume they mean to hit, as waving is a common hit signal.",
            "Verbally clarify their intention before proceeding (e.g., 'Stand, sir?').",
            "Look to the floor supervisor to interpret the signal."
        ],
        a: "Verbally clarify their intention before proceeding (e.g., 'Stand, sir?').",
        explanation: "Never assume a player's intention from an unclear signal. Always get verbal confirmation to prevent disputes about the action taken."
    },
    {
        q: "A player wants to color up $300 in red ($5) chips right as you're about to deal a new hand. What is the best practice?",
        options: [
            "Stop everything and make the change immediately.",
            "Tell them they must wait until the shuffle.",
            "Acknowledge them, deal the hand, and then make the change after the round.",
            "Refuse the color up as it's too large for the table."
        ],
        a: "Acknowledge them, deal the hand, and then make the change after the round.",
        explanation: "This balances customer service with game speed. Acknowledging the request lets the player know you'll help them, while waiting until after the hand keeps the game moving for everyone else."
    },
];


const AuditionPractice: React.FC = () => {
    const [auditionState, setAuditionState] = useState<AuditionState>('idle');
    const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | null>(null);
    const [score, setScore] = useState(0);
    const [sessionTimeLeft, setSessionTimeLeft] = useState(90);
    const [currentScenario, setCurrentScenario] = useState<Scenario | null>(null);
    const [isListening, setIsListening] = useState(false);
    const [userTranscript, setUserTranscript] = useState('');
    const [textInputAnswer, setTextInputAnswer] = useState('');
    const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [micStatusMessage, setMicStatusMessage] = useState<string | null>(null);
    const [showStrategyChart, setShowStrategyChart] = useState(false);
    const [showPayoutChart, setShowPayoutChart] = useState<'3:2' | '6:5' | null>(null);

    const recognitionRef = useRef<any>(null);
    const sessionTimerRef = useRef<number | undefined>();

    const generateProblem = useCallback((difficulty: 'easy' | 'medium' | 'hard') => {
        if (!difficulty) return;

        setIsLoading(true);
        setFeedback(null);
        setUserTranscript('');
        setTextInputAnswer('');
        
        const config = AUDITION_DIFFICULTY_CONFIG[difficulty];
        const problemTypes: ScenarioType[] = config.problemTypes;
        const type = problemTypes[Math.floor(Math.random() * problemTypes.length)];

        let scenario: Scenario | null = null;
        
        if (type === 'strategy') {
            const strat = strategyScenarios[Math.floor(Math.random() * strategyScenarios.length)];
            scenario = {
                type: 'strategy',
                question: strat.q,
                context: { 
                    playerHand: strat.p.map(rank => createCard(rank)), 
                    dealerUpCard: createCard(strat.d) 
                },
                correctAnswer: strat.a,
            };
        } else if (type === 'math') {
            const math = mathScenarios[Math.floor(Math.random() * mathScenarios.length)];
            scenario = {
                type: 'math',
                question: math.q,
                context: { options: math.options, explanation: math.explanation },
                correctAnswer: math.a,
            };
        } else if (type === 'rules') {
            const rule = rulesScenarios[Math.floor(Math.random() * rulesScenarios.length)];
            scenario = {
                type: 'rules',
                question: rule.q,
                context: { options: rule.options, explanation: rule.explanation },
                correctAnswer: rule.a,
            };
        } else if (type === 'talk') {
            const talk = talkScenarios[Math.floor(Math.random() * talkScenarios.length)];
            scenario = {
                type: 'talk',
                question: talk.q,
                context: { scenarioText: talk.q },
                correctAnswer: talk.a,
            };
        } else if (type === 'situational') {
            const sit = etiquetteScenarios[Math.floor(Math.random() * etiquetteScenarios.length)];
            scenario = {
                type: 'situational',
                question: sit.q,
                context: { options: sit.options, explanation: sit.explanation },
                correctAnswer: sit.a,
            };
        }
        
        setCurrentScenario(scenario);
        setIsLoading(false);

    }, []);

    const handleMultipleChoiceAnswer = (selectedAnswer: string) => {
        if (!currentScenario || isLoading || feedback) return;
        
        setIsLoading(true); // Prevents multiple clicks
        const isCorrect = selectedAnswer === currentScenario.correctAnswer;
        const explanation = currentScenario.context.explanation;

        if (isCorrect) {
            setScore(prev => prev + 1);
            let feedbackMessage = `Correct!`;
            if (explanation) {
                feedbackMessage += `<br/><br/><strong>Reason:</strong> ${explanation}`;
            }
            setFeedback({ message: feedbackMessage, type: 'success' });
        } else {
            let feedbackMessage = `Incorrect. The correct action is: "${currentScenario.correctAnswer}"`;
             if (explanation) {
                feedbackMessage += `<br/><br/><strong>Reason:</strong> ${explanation}`;
            }
            setFeedback({ message: feedbackMessage, type: 'error' });
        }
        
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
        setIsLoading(false);
    };

    const evaluateAnswer = useCallback(async (transcript: string) => {
        if (!currentScenario || currentScenario.type === 'situational' || currentScenario.type === 'math' || currentScenario.type === 'rules') return;
        setIsLoading(true);

        try {
            if (currentScenario.type === 'strategy') {
                const isCorrect = transcript.toLowerCase().includes(currentScenario.correctAnswer as string);
                const playerHandValue = getHandValue(currentScenario.context.playerHand);
                const dealerCardValue = getHandValue([currentScenario.context.dealerUpCard]);
                const correctAnswerText = `<strong>${(currentScenario.correctAnswer as string).toUpperCase()}</strong>`;

                if (isCorrect) {
                    setScore(prev => prev + 1);
                    setFeedback({ message: `Correct! For your hand (${playerHandValue}) vs the dealer's ${dealerCardValue}, the play is indeed ${correctAnswerText}.`, type: 'success' });
                } else {
                    setFeedback({ message: `Incorrect. For your hand (${playerHandValue}) vs the dealer's ${dealerCardValue}, the correct play was to ${correctAnswerText}.`, type: 'error' });
                }
            } else if (currentScenario.type === 'talk') {
                const result = await evaluateDealerTalkCue(currentScenario.context.scenarioText, transcript);
                if (result.isCorrect) {
                    setScore(prev => prev + 1);
                    setFeedback({ message: `Correct! ${result.explanation}`, type: 'success' });
                } else {
                    setFeedback({ message: `Incorrect. ${result.explanation}`, type: 'error' });
                }
            }
        } catch(e) {
            setFeedback({ message: 'There was an error evaluating your answer.', type: 'error' });
        }

        setIsLoading(false);

    }, [currentScenario]);
    
    const handleTextSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!textInputAnswer.trim() || isLoading || feedback) return;
    
        if (recognitionRef.current && isListening) {
            recognitionRef.current.stop();
        }
        
        evaluateAnswer(textInputAnswer);
        setTextInputAnswer('');
    };

    const evaluateAnswerRef = useRef(evaluateAnswer);
    useEffect(() => {
        evaluateAnswerRef.current = evaluateAnswer;
    }, [evaluateAnswer]);


    // Effect for initializing speech recognition ONCE.
    useEffect(() => {
        const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognitionAPI) {
            console.error("Speech recognition not supported in this browser.");
            setFeedback({ message: "Speech recognition not supported. Please use Chrome or Safari.", type: 'error' });
            return;
        }

        const recognition = new SpeechRecognitionAPI();
        recognition.continuous = false;
        recognition.lang = 'en-US';
        recognition.interimResults = false;
        recognitionRef.current = recognition;

        recognition.onstart = () => {
            setIsListening(true);
            setMicStatusMessage(null);
            setUserTranscript('');
        };

        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            setUserTranscript(transcript);
            evaluateAnswerRef.current(transcript);
        };

        recognition.onerror = (event: any) => {
            // 'aborted' is a normal event when recognition is stopped programmatically.
            // Don't log it as a console error or show it to the user.
            if (event.error === 'aborted') {
                return;
            }

            console.error('Speech recognition error', event.error);

            if (event.error === 'no-speech') {
                setMicStatusMessage("Didn't catch that. Please speak now.");
            } else if (event.error === 'not-allowed' || event.error === 'audio-capture') {
                setFeedback({ message: "Microphone access denied. Please allow microphone access in your browser settings to continue.", type: 'error' });
            } else {
                setFeedback({ message: `An unexpected microphone error occurred: ${event.error}`, type: 'error' });
            }
        };
        
        recognition.onend = () => {
            setIsListening(false);
        };

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.onstart = null;
                recognitionRef.current.onresult = null;
                recognitionRef.current.onerror = null;
                recognitionRef.current.onend = null;
                recognitionRef.current.stop();
            }
        };
    }, []); // Empty dependency array ensures this runs only once on mount.


    // Effect for starting the recognition when conditions are right.
    useEffect(() => {
        const recognition = recognitionRef.current;
        const isSpokenScenario = currentScenario?.type === 'strategy' || currentScenario?.type === 'talk';
        if (
            auditionState === 'running' && 
            !isLoading && 
            !feedback && 
            recognition && 
            !isListening && 
            isSpokenScenario
        ) {
            try {
                recognition.start();
            } catch (error) {
                console.error("Error starting speech recognition:", error);
                setIsListening(false);
            }
        }
    }, [auditionState, isLoading, feedback, isListening, currentScenario]);

    const endAudition = useCallback(() => {
        if (recognitionRef.current && isListening) {
            recognitionRef.current.stop();
        }
        if (sessionTimerRef.current) window.clearTimeout(sessionTimerRef.current);
        setAuditionState('finished');
        setIsListening(false);
    // Fix: Added isListening to the dependency array to ensure the callback has the current state.
    }, [isListening]);

    const exitAudition = () => {
        // FIX: Added a check for `isListening` before stopping recognition to prevent errors.
        if (recognitionRef.current && isListening) {
            recognitionRef.current.stop();
        }
        if (sessionTimerRef.current) {
            window.clearTimeout(sessionTimerRef.current);
        }
        setIsListening(false);
        setAuditionState('idle');
    };

    const startAudition = (selectedDifficulty: 'easy' | 'medium' | 'hard') => {
        setDifficulty(selectedDifficulty);
        setScore(0);
        const config = AUDITION_DIFFICULTY_CONFIG[selectedDifficulty];
        setSessionTimeLeft(config.duration);
        setAuditionState('running');
        setCurrentScenario(null);
    };
    
    useEffect(() => {
        if (auditionState === 'running' && !currentScenario && difficulty) {
            generateProblem(difficulty);
        }
    }, [auditionState, currentScenario, difficulty, generateProblem]);

    // Session Timer
    useEffect(() => {
        if (auditionState === 'running' && sessionTimeLeft > 0) {
            sessionTimerRef.current = window.setTimeout(() => {
                setSessionTimeLeft(sessionTimeLeft - 1);
            }, 1000);
        } else if (auditionState === 'running' && sessionTimeLeft <= 0) {
            endAudition();
        }

        return () => {
            if (sessionTimerRef.current) {
                window.clearTimeout(sessionTimerRef.current);
            }
        };
    }, [auditionState, sessionTimeLeft, endAudition]);
    
     if (auditionState === 'idle') {
        type DifficultyCardProps = { diff: 'easy' | 'medium' | 'hard' };
        const DifficultyCard: React.FC<DifficultyCardProps> = ({ diff }) => {
            const config = AUDITION_DIFFICULTY_CONFIG[diff];
            return (
                 <div className="bg-slate-700 rounded-lg p-6 text-center shadow-lg border-2 border-transparent hover:border-slate-400 transition-all transform hover:-translate-y-1 flex flex-col justify-between">
                    <div>
                        <h3 className="text-2xl font-bold text-slate-200">{config.title}</h3>
                        <p className="text-slate-400 mt-2 text-sm">{config.description}</p>
                    </div>
                    <button onClick={() => startAudition(diff)} className="mt-6 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-lg text-lg transition-transform transform hover:scale-105 shadow-md">
                        Start Audition ({config.duration}s)
                    </button>
                </div>
            );
        }
        return (
            <div className="text-center">
                <h2 className="text-4xl font-bold mb-2 text-slate-100">The Dealer Audition</h2>
                <p className="text-slate-400 mb-8">This is your final exam. Choose your difficulty to begin.</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   <DifficultyCard diff="easy" />
                   <DifficultyCard diff="medium" />
                   <DifficultyCard diff="hard" />
                </div>
            </div>
        );
    }
    
    if (auditionState === 'finished') {
        return (
            <div className="text-center bg-slate-900/50 p-8 rounded-lg shadow-2xl">
                <h2 className="text-5xl font-bold mb-4 text-slate-400">Audition Complete!</h2>
                <p className="text-2xl text-slate-300 mb-2">You completed the {difficulty} audition:</p>
                <p className="text-7xl font-bold text-amber-400 my-6">{score}</p>
                <p className="text-2xl text-slate-300 mb-8">Correct Answers</p>
                <button onClick={() => setAuditionState('idle')} className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-3 px-10 rounded-lg text-xl transition-transform transform hover:scale-105 shadow-lg">
                    Back to Audition Menu
                </button>
            </div>
        )
    }
    
    const isMultipleChoice = currentScenario && ['math', 'rules', 'situational'].includes(currentScenario.type);

    return (
        <div className="w-full max-w-4xl flex flex-col items-center">
            {showStrategyChart && <BasicStrategyChart onClose={() => setShowStrategyChart(false)} />}
            {showPayoutChart && <PayoutChart mode={showPayoutChart} onClose={() => setShowPayoutChart(null)} />}

            <div className="w-full mb-4 flex justify-between items-center flex-wrap gap-4">
                <div className="flex items-center gap-4 text-center">
                    <div className="bg-slate-900/50 p-4 rounded-lg shadow-lg border border-slate-700">
                        <div className="text-sm font-medium text-slate-400 uppercase tracking-wider">Time Left</div>
                        <div className="text-3xl font-bold text-sky-400">{sessionTimeLeft}s</div>
                    </div>
                    <div className="bg-slate-900/50 p-4 rounded-lg shadow-lg border border-slate-700">
                        <div className="text-sm font-medium text-slate-400 uppercase tracking-wider">Score</div>
                        <div className="text-3xl font-bold text-emerald-400">{score}</div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setShowStrategyChart(true)} className="bg-slate-600 hover:bg-slate-500 text-white font-semibold py-2 px-3 rounded-lg text-sm transition-colors shadow-md">Strategy Chart</button>
                    <button onClick={() => setShowPayoutChart('3:2')} className="bg-slate-600 hover:bg-slate-500 text-white font-semibold py-2 px-3 rounded-lg text-sm transition-colors shadow-md">3:2 Payouts</button>
                    <button onClick={() => setShowPayoutChart('6:5')} className="bg-slate-600 hover:bg-slate-500 text-white font-semibold py-2 px-3 rounded-lg text-sm transition-colors shadow-md">6:5 Payouts</button>
                    <button onClick={exitAudition} className="bg-rose-700 hover:bg-rose-600 text-white font-semibold py-2 px-3 rounded-lg text-sm transition-colors shadow-md">Exit Audition</button>
                </div>
            </div>

            <div className="w-full bg-slate-900/50 rounded-3xl p-6 shadow-2xl min-h-[400px] flex flex-col justify-between border-2 border-slate-700">
                <div className="flex-grow flex flex-col items-center justify-center text-center">
                    {isLoading && !feedback && (
                        <div className="w-12 h-12 border-4 border-t-transparent border-slate-400 border-solid rounded-full animate-spin"></div>
                    )}

                    {!isLoading && currentScenario && !feedback && (
                        <div className="animate-fade-in w-full">
                            <p className="text-lg font-bold text-amber-400 uppercase tracking-wider mb-4">
                                {
                                    {
                                        strategy: 'Core Skills: Basic Strategy',
                                        math: 'Math & Payout Logic',
                                        rules: 'Rules & Procedures',
                                        talk: 'Communication & Presence',
                                        situational: 'Situational Etiquette'
                                    }[currentScenario.type]
                                }
                            </p>
                            <h3 className="text-3xl font-bold text-slate-200 mb-2">{currentScenario.question}</h3>
                            {currentScenario.type === 'strategy' && (
                                <div className="text-xl text-slate-400 mb-6">
                                    (Your Hand: <strong>{getHandValue(currentScenario.context.playerHand)}</strong> vs. Dealer: <strong>{getHandValue([currentScenario.context.dealerUpCard])}</strong>)
                                </div>
                            )}
                            {currentScenario.type === 'strategy' && (
                                <div className="flex flex-col items-center gap-6">
                                     <div>
                                        <h4 className="text-lg font-semibold text-slate-400 mb-2">Dealer Shows</h4>
                                        <Card card={currentScenario.context.dealerUpCard} />
                                    </div>
                                    <div>
                                        <h4 className="text-lg font-semibold text-slate-400 mb-2">Your Hand</h4>
                                        <div className="flex gap-2">
                                            {currentScenario.context.playerHand.map((c: CardType, i: number) => <Card key={i} card={c} />)}
                                        </div>
                                    </div>
                                </div>
                            )}
                            {isMultipleChoice && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto mt-6">
                                    {currentScenario.context.options.map((option: string, index: number) => (
                                        <button
                                            key={index}
                                            onClick={() => handleMultipleChoiceAnswer(option)}
                                            className="bg-slate-700 hover:bg-slate-600 text-white font-semibold py-4 px-6 rounded-lg text-lg text-left transition-colors duration-200 shadow-md border border-slate-600"
                                        >
                                            {option}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                     <div className="h-20 mt-4"><ActionFeedback feedback={feedback} /></div>
                </div>
                
                <div className="w-full p-4 bg-slate-900/50 rounded-lg mt-6 flex items-center justify-center gap-4 border-t-2 border-slate-700 min-h-[82px]">
                    {feedback ? (
                        <button
                            onClick={() => difficulty && generateProblem(difficulty)}
                            className="bg-sky-600 hover:bg-sky-700 text-white font-bold py-3 px-10 rounded-lg text-xl transition-transform transform hover:scale-105 shadow-lg"
                        >
                            Next Question
                        </button>
                    ) : !isMultipleChoice ? (
                        <div className="flex flex-col items-center gap-3 w-full max-w-lg">
                            <div className="flex items-center gap-4 w-full">
                                <MicrophoneIcon isListening={isListening} />
                                <div className="w-full bg-slate-800 rounded-lg p-3 text-center min-h-[50px]">
                                    <p className="text-lg text-slate-300 italic">
                                        {userTranscript || micStatusMessage || (isListening ? 'Listening...' : 'Speak your answer...')}
                                    </p>
                                </div>
                            </div>
                            <p className="text-slate-400 font-semibold my-1">OR</p>
                            <form onSubmit={handleTextSubmit} className="flex items-center gap-2 w-full">
                                <input
                                    type="text"
                                    value={textInputAnswer}
                                    onChange={(e) => setTextInputAnswer(e.target.value)}
                                    placeholder="Type your answer here"
                                    className="flex-grow bg-slate-800 border-2 border-slate-600 rounded-lg text-white p-3 text-lg focus:outline-none focus:ring-2 focus:ring-sky-400"
                                    disabled={isLoading}
                                />
                                <button
                                    type="submit"
                                    disabled={isLoading || !textInputAnswer.trim()}
                                    className="bg-sky-600 hover:bg-sky-700 text-white font-bold py-3 px-6 rounded-lg text-lg transition-colors shadow-md disabled:bg-slate-700 disabled:opacity-50"
                                >
                                    Submit
                                </button>
                            </form>
                        </div>
                    ) : (
                        <div className="text-center min-h-[50px] flex items-center justify-center">
                             <p className="text-lg text-slate-400 italic">Select the best option above.</p>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

export default AuditionPractice;