import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Card as CardType } from '../types';
import { createShuffledDeck } from '../utils/deck';
import { getHandValue } from '../utils/handCalculator';
import Card from './Card';
import StatsTracker from './StatsTracker';
import ActionFeedback from './ActionFeedback';

type CardCountSelection = 3 | 4 | 5 | 'random';
type PracticeMode = 'hand_total' | 'running_count';

const playSound = (soundId: string) => {
    const sound = document.getElementById(soundId) as HTMLAudioElement;
    if (sound) {
        sound.currentTime = 0;
        const playPromise = sound.play();
        if (playPromise !== undefined) {
            playPromise.catch(() => { /* Autoplay was prevented by browser */ });
        }
    }
};

const getRunningCount = (cards: CardType[]): number => {
    let count = 0;
    for (const card of cards) {
        const rank = card.rank;
        if (['2', '3', '4', '5', '6'].includes(rank)) {
            count++;
        } else if (['10', 'J', 'Q', 'K', 'A'].includes(rank)) {
            count--;
        }
    }
    return count;
};

const CardCountingPractice: React.FC = () => {
    const [mode, setMode] = useState<PracticeMode>('hand_total');
    const [hand, setHand] = useState<CardType[]>([]);
    const [revealedCards, setRevealedCards] = useState<CardType[]>([]);
    const [isRevealing, setIsRevealing] = useState(true);
    const [guess, setGuess] = useState('');
    const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [isAnswered, setIsAnswered] = useState(false);
    const [stats, setStats] = useState({ correct: 0, incorrect: 0 });
    const [cardCount, setCardCount] = useState<CardCountSelection>('random');
    const [runningCount, setRunningCount] = useState<number>(0);

    const inputRef = useRef<HTMLInputElement>(null);

    const generateProblem = useCallback(() => {
        setIsRevealing(true);
        setRevealedCards([]);
        setFeedback(null);
        setGuess('');
        setIsAnswered(false);

        setTimeout(() => {
            const deck = createShuffledDeck();
            if (mode === 'running_count') {
                const handSize = Math.floor(Math.random() * 4) + 5; // 5 to 8 cards
                const newHand = deck.slice(0, handSize).map(card => ({...card, isFaceDown: false}));
                setHand(newHand);
                setRunningCount(getRunningCount(newHand));
            } else { // hand_total
                let handSize: number;
                if (cardCount === 'random') {
                    handSize = Math.floor(Math.random() * 3) + 3; // 3 to 5 cards
                } else {
                    handSize = cardCount;
                }
                const newHand = deck.slice(0, handSize).map(card => ({...card, isFaceDown: false}));
                setHand(newHand);
            }
        }, 300);
    }, [cardCount, mode]);

    useEffect(() => {
        generateProblem();
    }, [generateProblem]);

    useEffect(() => {
        if (isRevealing && hand.length > 0) {
            if (revealedCards.length < hand.length) {
                const revealSpeed = mode === 'running_count' ? 400 : 500;
                const timer = setTimeout(() => {
                    setRevealedCards(prev => [...prev, hand[prev.length]]);
                }, revealSpeed);
                return () => clearTimeout(timer);
            } else {
                setIsRevealing(false);
            }
        }
    }, [isRevealing, hand, revealedCards, mode]);

    useEffect(() => {
        if (!isRevealing && !isAnswered && hand.length > 0) {
            inputRef.current?.focus();
        }
    }, [isRevealing, isAnswered, hand.length]);

    const handleGuessChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (mode === 'running_count') {
            // Allows an optional leading hyphen, followed by zero or more digits.
            if (/^-?\d*$/.test(value)) {
                setGuess(value);
            }
        } else { // hand_total mode
            const numericValue = value.replace(/[^0-9]/g, '');
            setGuess(numericValue);
        }
    };

    const checkAnswer = (e: React.FormEvent) => {
        e.preventDefault();
        if (!guess || guess === '-') {
            setFeedback(null);
            return;
        }
        if (isAnswered) return;

        let correctValue: number;
        if (mode === 'running_count') {
            correctValue = runningCount;
        } else {
            correctValue = getHandValue(hand);
        }
        
        const userValue = parseInt(guess, 10);

        if (userValue === correctValue) {
            playSound('correct-sound');
            setFeedback({ message: 'Correct!', type: 'success' });
            setStats(prev => ({ ...prev, correct: prev.correct + 1 }));
        } else {
            playSound('timeout-sound');
            setFeedback({ message: `Incorrect. The correct value is ${correctValue}.`, type: 'error' });
            setStats(prev => ({ ...prev, incorrect: prev.incorrect + 1 }));
        }
        setIsAnswered(true);
        setTimeout(() => {
            generateProblem();
        }, 1500);
    };
    
    const handleModeChange = (newMode: PracticeMode) => {
        if (mode !== newMode) {
            setMode(newMode);
            setStats({ correct: 0, incorrect: 0 });
        }
    };

    const getModeButtonClass = (buttonMode: PracticeMode) => {
        const base = "flex-1 text-center py-3 text-lg font-bold transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-slate-400";
        if (mode === buttonMode) {
            return `${base} bg-slate-700 text-white border-b-4 border-slate-500`;
        }
        return `${base} bg-slate-900 text-slate-400 hover:bg-slate-800`;
    };

    const getCardCountButtonClass = (count: CardCountSelection) => {
        const base = "font-bold py-2 px-4 rounded-lg transition-colors";
        return cardCount === count 
            ? `${base} bg-amber-500 text-black`
            : `${base} bg-slate-700 hover:bg-slate-600 text-white`;
    }
    
    const instructionText = mode === 'hand_total' ? 'Add the card values as they appear' : 'Keep the Running Count';
    const placeholderText = mode === 'hand_total' ? 'Enter total' : 'Enter count';
    const inputType = mode === 'hand_total' ? 'numeric' : 'text';


    return (
        <div className="w-full max-w-4xl flex flex-col items-center">
            <div className="w-full mb-4">
                <StatsTracker stats={stats} />
            </div>
            
             <div className="w-full flex mb-[-2px] z-10">
                <button onClick={() => handleModeChange('hand_total')} className={`${getModeButtonClass('hand_total')} rounded-tl-lg`}>Hand Total Practice</button>
                <button onClick={() => handleModeChange('running_count')} className={`${getModeButtonClass('running_count')} rounded-tr-lg`}>Running Count Practice</button>
            </div>

            <div className="w-full bg-emerald-800 border-4 border-amber-600 rounded-b-3xl rounded-tr-3xl p-4 sm:p-8 shadow-2xl" style={{background: 'radial-gradient(ellipse at center, #047857 0%, #064e3b 100%)'}}>
                {mode === 'hand_total' && (
                     <div className="flex justify-center items-center gap-4 mb-6 animate-fade-in">
                        <span className="text-slate-300 font-semibold">Number of cards:</span>
                        <button onClick={() => setCardCount(3)} className={getCardCountButtonClass(3)}>3</button>
                        <button onClick={() => setCardCount(4)} className={getCardCountButtonClass(4)}>4</button>
                        <button onClick={() => setCardCount(5)} className={getCardCountButtonClass(5)}>5</button>
                        <button onClick={() => setCardCount('random')} className={getCardCountButtonClass('random')}>Random</button>
                    </div>
                )}
                
                <h2 className="text-2xl font-bold text-center mb-6 text-slate-200">{instructionText}</h2>
                
                <div className="flex justify-center items-center space-x-2 min-h-[144px] sm:min-h-[160px]">
                    {hand.length === 0 && isRevealing ? (
                         <div className="w-12 h-12 border-4 border-t-transparent border-emerald-400 border-solid rounded-full animate-spin"></div>
                    ) : (
                        hand.map((card, index) => (
                            <div 
                                key={index} 
                                className={`transform transition-all duration-500 ease-out ${revealedCards.length > index ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}
                            >
                                <Card card={card} />
                            </div>
                        ))
                    )}
                </div>
                
                <form onSubmit={checkAnswer} className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                    <input 
                        ref={inputRef}
                        type={inputType}
                        inputMode={inputType}
                        value={guess}
                        onChange={handleGuessChange}
                        disabled={isAnswered || isRevealing || hand.length === 0}
                        className="bg-slate-900 border-2 border-slate-600 rounded-lg text-white text-center text-xl font-bold w-48 h-14 focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:opacity-50"
                        placeholder={placeholderText}
                        aria-label="Enter your count or total"
                    />
                    <button 
                        type="submit" 
                        disabled={isAnswered || isRevealing || !guess || guess === '-'} 
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-8 rounded-lg text-lg transition-transform transform hover:scale-105 shadow-lg h-14 disabled:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Check Answer
                    </button>
                </form>
            </div>
            
            <div className="mt-6 text-center h-20 flex flex-col items-center justify-center">
                <ActionFeedback feedback={feedback} />
            </div>
        </div>
    );
};

export default CardCountingPractice;