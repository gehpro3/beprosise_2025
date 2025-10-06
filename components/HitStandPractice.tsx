
import React, { useState, useCallback, useEffect } from 'react';
import { Card as CardType, Rank, Suit } from '../types';
import { createShuffledDeck } from '../utils/deck';
import { getHandValue } from '../utils/handCalculator';
import { getHitStandAdvice } from '../services/geminiService';
import Card from './Card';
import StatsTracker from './StatsTracker';
import ActionFeedback from './ActionFeedback';

// Helper to find specific cards in a deck
const findAndRemoveCards = (deck: CardType[], ranks: Rank[]): { foundCards: CardType[], remainingDeck: CardType[] } => {
    const foundCards: CardType[] = [];
    const ranksToFind = [...ranks];
    const remainingDeck = deck.filter(card => {
        const rankIndex = ranksToFind.indexOf(card.rank);
        if (rankIndex !== -1) {
            foundCards.push(card);
            ranksToFind.splice(rankIndex, 1);
            return false;
        }
        return true;
    });
    return { foundCards, remainingDeck };
};

const HitStandPractice: React.FC = () => {
    const [dealerUpCard, setDealerUpCard] = useState<CardType | null>(null);
    const [playerHand, setPlayerHand] = useState<CardType[]>([]);
    const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [stats, setStats] = useState({ correct: 0, incorrect: 0 });
    const [isAnswered, setIsAnswered] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const generateProblem = useCallback(() => {
        setIsLoading(true);
        setIsAnswered(false);
        setFeedback(null);
        setPlayerHand([]);
        setDealerUpCard(null);

        setTimeout(() => {
            let deck = createShuffledDeck();

            // Scenarios: { playerRanks: Rank[], dealerRank: Rank }
            const scenarios = [
                // Stand Scenarios
                { p: [Rank.TEN, Rank.SEVEN], d: Rank.FIVE }, // Hard 17 vs 5
                { p: [Rank.NINE, Rank.NINE], d: Rank.SIX }, // Hard 18 vs 6
                { p: [Rank.TEN, Rank.THREE], d: Rank.FOUR }, // Hard 13 vs 4
                { p: [Rank.TEN, Rank.SIX], d: Rank.TWO }, // Hard 16 vs 2

                // Hit Scenarios
                { p: [Rank.TEN, Rank.FOUR], d: Rank.NINE }, // Hard 14 vs 9
                { p: [Rank.TEN, Rank.SIX], d: Rank.TEN }, // Hard 16 vs 10
                { p: [Rank.SIX, Rank.SIX], d: Rank.SEVEN }, // Hard 12 vs 7
                { p: [Rank.FIVE, Rank.FOUR], d: Rank.EIGHT }, // Hard 9 vs 8
                { p: [Rank.ACE, Rank.SIX], d: Rank.SEVEN }, // Soft 17 vs 7
                { p: [Rank.ACE, Rank.SEVEN], d: Rank.NINE }, // Soft 18 vs 9
            ];
            
            const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
            
            const { foundCards: playerCards, remainingDeck: deckAfterPlayer } = findAndRemoveCards(deck, scenario.p);
            const { foundCards: dealerCards, remainingDeck: finalDeck } = findAndRemoveCards(deckAfterPlayer, [scenario.d]);

            if (playerCards.length === scenario.p.length && dealerCards.length === 1) {
                setPlayerHand(playerCards);
                setDealerUpCard({ ...dealerCards[0], isFaceDown: false });
            } else {
                // Fallback to random if card generation fails
                console.warn("Scenario generation failed, dealing random hand.");
                const pHand = [deck.pop()!, deck.pop()!];
                const dCard = deck.pop()!;
                setPlayerHand(pHand);
                setDealerUpCard({ ...dCard, isFaceDown: false });
            }
            setIsLoading(false);

        }, 500);
    }, []);

    useEffect(() => {
        generateProblem();
    }, [generateProblem]);

    const handleAction = async (action: 'hit' | 'stand') => {
        if (isAnswered || isLoading || !playerHand.length || !dealerUpCard) return;

        setIsLoading(true);
        setIsAnswered(true);
        setFeedback(null);
        
        try {
            const advice = await getHitStandAdvice(playerHand, dealerUpCard);
            if (action === advice.recommendedAction) {
                setFeedback({ message: `Correct! ${advice.explanation}`, type: 'success' });
                setStats(prev => ({ ...prev, correct: prev.correct + 1 }));
            } else {
                const incorrectMessage = `Incorrect. The best move was ${advice.recommendedAction.toUpperCase()}. ${advice.explanation}`;
                setFeedback({ message: incorrectMessage, type: 'error' });
                setStats(prev => ({ ...prev, incorrect: prev.incorrect + 1 }));
            }
        } catch (error) {
            console.error(error);
            setFeedback({ message: 'Could not get AI advice.', type: 'error' });
        } finally {
            setIsLoading(false);
            setTimeout(generateProblem, 2500);
        }
    };

    const playerHandValue = getHandValue(playerHand);

    return (
        <div className="w-full max-w-4xl flex flex-col items-center">
            <div className="w-full mb-4">
                <StatsTracker stats={stats} />
            </div>

            <div className="w-full bg-green-800 border-4 border-yellow-700 rounded-3xl p-4 sm:p-8 shadow-2xl" style={{background: 'radial-gradient(ellipse at center, #166534 0%, #14532d 100%)'}}>
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold mb-3 text-gray-200">Dealer Shows</h2>
                    <div className="relative flex justify-center items-center min-h-[110px]">
                        {dealerUpCard ? <Card card={dealerUpCard} /> : <div className="text-gray-400">...</div>}
                    </div>
                </div>

                <div className="text-center my-8">
                    <h2 className="text-2xl font-bold mb-3 text-gray-200">Your Hand</h2>
                    <div className="relative flex justify-center items-center min-h-[110px]">
                        {playerHand.length > 0 ? (
                            playerHand.map((card, index) => (
                                <div key={index} className="mx-1">
                                    <Card card={card} />
                                </div>
                            ))
                        ) : (
                             <div className="w-8 h-8 border-4 border-t-transparent border-green-400 border-solid rounded-full animate-spin"></div>
                        )}
                    </div>
                     {playerHandValue > 0 && (
                        <span className="text-xl font-bold mt-2 inline-block px-4 py-1 rounded-full bg-gray-800 text-yellow-300">
                            Total: {playerHandValue}
                        </span>
                    )}
                </div>

                <div className="mt-8 grid grid-cols-2 gap-4 sm:gap-8 max-w-md mx-auto">
                    <button 
                        onClick={() => handleAction('hit')}
                        disabled={isAnswered || isLoading}
                        className="bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-6 rounded-lg text-2xl shadow-lg transition-transform transform hover:scale-105 disabled:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Hit
                    </button>
                    <button 
                        onClick={() => handleAction('stand')}
                        disabled={isAnswered || isLoading}
                        className="bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-6 rounded-lg text-2xl shadow-lg transition-transform transform hover:scale-105 disabled:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Stand
                    </button>
                </div>
            </div>

            <div className="mt-6 text-center h-20 flex flex-col items-center justify-center">
                 {isLoading && !isAnswered && <div className="w-8 h-8 border-4 border-t-transparent border-gray-400 border-solid rounded-full animate-spin"></div>}
                 <ActionFeedback feedback={feedback} />
            </div>
        </div>
    );
};

export default HitStandPractice;
