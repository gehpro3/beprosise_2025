import React, { useState, useCallback, useEffect, useRef } from 'react';
import ActionFeedback from './ActionFeedback';
import Chip from './Chip';
import { calculateChips } from '../utils/chipCalculator';

const availableChips = [500, 100, 25, 5, 1, 0.5];
type PayoutMode = '6:5' | '3:2' | 'change' | 'color';
type SessionState = 'idle' | 'running' | 'finished';
type Difficulty = 'easy' | 'medium' | 'hard';

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

const DIFFICULTY_CONFIG = {
    easy: {
        duration: 120,
        getProblemDuration: () => 10,
        betRange: { min: 5, max: 100 },
        problemTypes: ['6:5', '3:2'] as PayoutMode[],
        title: "Easy Groove",
        description: "A relaxed pace. Focus on 3:2 and 6:5 payouts with smaller bets and a generous 10-second timer per problem."
    },
    medium: {
        duration: 90,
        getProblemDuration: (score: number) => {
            if (score >= 15) return 5;
            if (score >= 10) return 6;
            if (score >= 5) return 7;
            return 8;
        },
        betRange: { min: 5, max: 500 },
        problemTypes: ['6:5', '3:2', 'change', 'color'] as PayoutMode[],
        title: "Medium Groove",
        description: "The standard challenge. All problem types, with a timer that speeds up as you improve."
    },
    hard: {
        duration: 75,
        getProblemDuration: (score: number) => {
            if (score >= 15) return 4;
            if (score >= 10) return 4.5;
            if (score >= 5) return 5;
            return 6;
        },
        betRange: { min: 5, max: 500 },
        problemTypes: ['6:5', '3:2', 'change', 'color'] as PayoutMode[],
        title: "Hard Groove",
        description: "For pros. A shorter session, a fast-paced timer, and the full range of complex problems."
    }
};


const BeProSiseGroove: React.FC = () => {
    const [sessionState, setSessionState] = useState<SessionState>('idle');
    const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
    const [score, setScore] = useState(0);
    const [sessionTimeLeft, setSessionTimeLeft] = useState(0);
    const [problemTimeLeft, setProblemTimeLeft] = useState(10);
    const [currentProblemDuration, setCurrentProblemDuration] = useState(10);
    
    // Problem state
    const [problemType, setProblemType] = useState<PayoutMode>('6:5');
    const [betAmount, setBetAmount] = useState(0);
    const [playerChips, setPlayerChips] = useState<number[]>([]);
    const [payoutAmount, setPayoutAmount] = useState(0);
    const [paidWithAmount, setPaidWithAmount] = useState<number | null>(null);
    const [userPayout, setUserPayout] = useState<number[]>([]);
    const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const musicElRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        musicElRef.current = document.getElementById('groove-music') as HTMLAudioElement;
    }, []);

    const generateProblem = useCallback((currentScore: number, selectedDifficulty: Difficulty) => {
        setFeedback(null);
        setUserPayout([]);
        setPlayerChips([]);
        setPaidWithAmount(null);
        
        const config = DIFFICULTY_CONFIG[selectedDifficulty];
        const newDuration = config.getProblemDuration(currentScore);
        setCurrentProblemDuration(newDuration);
        setProblemTimeLeft(newDuration);
        
        const problemTypes = config.problemTypes;
        const currentProblemType = problemTypes[Math.floor(Math.random() * problemTypes.length)];
        setProblemType(currentProblemType);
        
        const newBet = Math.floor(Math.random() * (config.betRange.max - config.betRange.min + 1)) + config.betRange.min;

        if (currentProblemType === 'change') {
            const paymentChips = [25, 100, 500].filter(c => c > newBet + 1);
            if (paymentChips.length === 0) { // Fallback if bet is too high for change
                generateProblem(currentScore, selectedDifficulty); // Reroll problem
                return;
            }
            const paidWith = paymentChips[Math.floor(Math.random() * paymentChips.length)];
            setBetAmount(newBet);
            setPaidWithAmount(paidWith);
            setPayoutAmount(paidWith - newBet);
            return;
        }

        if (currentProblemType === 'color') {
            const colorExchanges = [
                { from: [1, 1, 1, 1, 1], to: 5 },
                { from: [5, 5, 5, 5, 5], to: 25 },
                { from: [25, 25, 25, 25], to: 100 },
                { from: [100, 100, 100, 100, 100], to: 500 },
            ];
            const exchange = colorExchanges[Math.floor(Math.random() * colorExchanges.length)];
            const totalValue = exchange.from.reduce((a, b) => a + b, 0);
            setBetAmount(totalValue);
            setPlayerChips(exchange.from);
            setPayoutAmount(exchange.to);
            return;
        }

        setBetAmount(newBet);
        const correctPayout = newBet * (currentProblemType === '6:5' ? 1.2 : 1.5);
        setPayoutAmount(correctPayout);
    }, []);
    
    const startSession = (selectedDifficulty: Difficulty) => {
        const config = DIFFICULTY_CONFIG[selectedDifficulty];
        const newScore = 0;
        setDifficulty(selectedDifficulty);
        setScore(newScore);
        setSessionTimeLeft(config.duration);
        setSessionState('running');
        generateProblem(newScore, selectedDifficulty);
        const musicEl = musicElRef.current;
        if (musicEl) {
            musicEl.currentTime = 0;
            const playPromise = musicEl.play();
            if (playPromise !== undefined) {
                playPromise.catch(() => { /* Autoplay was prevented by browser */ });
            }
        }
    };

    const endSession = useCallback(() => {
        setSessionState('finished');
        const musicEl = musicElRef.current;
        if (musicEl) {
            musicEl.pause();
        }
    }, []);

    useEffect(() => {
        const musicEl = musicElRef.current;
        return () => { // Cleanup on unmount
            if (musicEl) {
                musicEl.pause();
                musicEl.currentTime = 0;
            }
        }
    }, []);

    // Session Timer
    useEffect(() => {
        if (sessionState === 'running' && sessionTimeLeft > 0) {
            const timer = setTimeout(() => setSessionTimeLeft(t => t - 1), 1000);
            return () => clearTimeout(timer);
        } else if (sessionState === 'running' && sessionTimeLeft === 0) {
            endSession();
        }
    }, [sessionState, sessionTimeLeft, endSession]);
    
    const handleTimeout = useCallback(() => {
        if (!difficulty) return;
        setFeedback({ message: `Time's up! The correct amount was $${payoutAmount.toFixed(2)}.`, type: 'error' });
        setTimeout(() => {
            if (sessionState === 'running') generateProblem(score, difficulty);
        }, 1500);
    }, [payoutAmount, generateProblem, sessionState, score, difficulty]);

    // Problem Timer
    useEffect(() => {
        if (sessionState === 'running' && problemTimeLeft > 0) {
            const timerId = setTimeout(() => setProblemTimeLeft(t => t - 0.02), 20);
            return () => clearTimeout(timerId);
        } else if (sessionState === 'running' && problemTimeLeft <= 0) {
            handleTimeout();
        }
    }, [sessionState, problemTimeLeft, handleTimeout]);

    const handleAddChip = (value: number) => {
        setUserPayout(prev => [...prev, value].sort((a, b) => b - a));
    };
    
    const handleRemoveChip = (value: number) => {
        setUserPayout(prev => {
            const newPayout = [...prev];
            const indexToRemove = newPayout.lastIndexOf(value);
            if (indexToRemove > -1) newPayout.splice(indexToRemove, 1);
            return newPayout;
        });
    }

    const checkAnswer = () => {
        if (!difficulty) return;
        const userTotal = userPayout.reduce((sum, val) => sum + val, 0);
        setProblemTimeLeft(-1); // Stop timer

        let newScore = score;
        if (Math.abs(userTotal - payoutAmount) < 0.01) {
            playSound('correct-sound');
            setFeedback({ message: 'Correct!', type: 'success' });
            newScore = score + 1;
            setScore(newScore);
        } else {
            setFeedback({ message: `Incorrect. Correct amount is $${payoutAmount.toFixed(2)}.`, type: 'error' });
        }
        
        setTimeout(() => {
            if (sessionState === 'running') generateProblem(newScore, difficulty);
        }, 1500);
    };
    
    const renderChipStacks = (chips: number[], isInteractive: boolean) => {
        const groupedChips = new Map<number, number[]>();
        availableChips.forEach(denom => {
            const chipsOfDenom = chips.filter(c => c === denom);
            if (chipsOfDenom.length > 0) groupedChips.set(denom, chipsOfDenom);
        });
        return Array.from(groupedChips.entries()).map(([denomination, chipsInStack]) => {
            const stackTotal = chipsInStack.length * denomination;
            return (
                <div key={denomination} className="flex flex-col items-center gap-2">
                    <div className="relative" style={{ width: '48px', height: `${(chipsInStack.length - 1) * 4 + 48}px` }}>
                        {chipsInStack.map((chipValue, index) => {
                            const chipElement = <Chip value={chipValue} />;
                            return (
                                <div key={index} className="absolute left-0" style={{ bottom: `${index * 4}px`, zIndex: index }}>
                                    {isInteractive && index === chipsInStack.length - 1 ? (
                                        <button onClick={() => handleRemoveChip(chipValue)} className="transition-transform transform hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-full">
                                            {chipElement}
                                        </button>
                                    ) : chipElement}
                                </div>
                            );
                        })}
                    </div>
                    <div className="text-sm font-bold text-amber-300 bg-slate-800/70 px-3 py-1 rounded-full border border-amber-700/50 shadow-md whitespace-nowrap">
                        {chipsInStack.length} &times; {denomination === 0.5 ? '50¢' : `$${denomination}`} = ${stackTotal.toFixed(2)}
                    </div>
                </div>
            );
        });
    };

    if (sessionState === 'idle') {
        const DifficultyCard: React.FC<{ difficulty: Difficulty }> = ({ difficulty }) => {
            const config = DIFFICULTY_CONFIG[difficulty];
            return (
                 <div className="bg-slate-700 rounded-lg p-6 text-center shadow-lg border-2 border-transparent hover:border-slate-400 transition-all transform hover:-translate-y-1 flex flex-col justify-between">
                    <div>
                        <h3 className="text-2xl font-bold text-slate-200">{config.title}</h3>
                        <p className="text-slate-400 mt-2 text-sm">{config.description}</p>
                    </div>
                    <button onClick={() => startSession(difficulty)} className="mt-6 w-full bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-lg text-lg transition-transform transform hover:scale-105 shadow-md">
                        Start
                    </button>
                </div>
            );
        }
        return (
            <div className="text-center">
                <h2 className="text-4xl font-bold mb-2 text-slate-200">Select Your Groove</h2>
                <p className="text-slate-400 mb-8">Choose your difficulty to test your speed and accuracy.</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   <DifficultyCard difficulty="easy" />
                   <DifficultyCard difficulty="medium" />
                   <DifficultyCard difficulty="hard" />
                </div>
            </div>
        )
    }

    if (sessionState === 'finished') {
        return (
            <div className="text-center bg-slate-800 p-8 rounded-lg shadow-2xl">
                <h2 className="text-5xl font-bold mb-4 text-slate-400">Time's Up!</h2>
                <p className="text-2xl text-slate-300 mb-2">You completed the {difficulty} groove!</p>
                <p className="text-6xl font-bold text-amber-400 my-6">{score}</p>
                <p className="text-2xl text-slate-300 mb-8">Correct Answers</p>
                <div className="flex justify-center gap-4">
                    <button onClick={() => difficulty && startSession(difficulty)} className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-3 px-10 rounded-lg text-xl transition-transform transform hover:scale-105 shadow-lg">
                        Play Again
                    </button>
                     <button onClick={() => setSessionState('idle')} className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-3 px-10 rounded-lg text-xl transition-transform transform hover:scale-105 shadow-lg">
                        Change Difficulty
                    </button>
                </div>
            </div>
        )
    }
    
    const problemTimePercentage = (problemTimeLeft / currentProblemDuration) * 100;
    const userTotal = userPayout.reduce((sum, val) => sum + val, 0);
    const problemTitle = {
        '6:5': '6:5 Payout', '3:2': '3:2 Payout', 'change': 'Make Change', 'color': 'Color for Color'
    }[problemType];

    return (
        <div className="w-full max-w-4xl flex flex-col items-center">
             <div className="w-full mb-4 grid grid-cols-2 gap-4 text-center">
                 <div className="bg-slate-800 p-4 rounded-lg shadow-lg border border-slate-700">
                    <div className="text-sm font-medium text-slate-400 uppercase tracking-wider">Time Left</div>
                    <div className="text-3xl font-bold text-sky-400">{sessionTimeLeft}s</div>
                 </div>
                 <div className="bg-slate-800 p-4 rounded-lg shadow-lg border border-slate-700">
                    <div className="text-sm font-medium text-slate-400 uppercase tracking-wider">Score</div>
                    <div className="text-3xl font-bold text-emerald-400">{score}</div>
                 </div>
            </div>
            
            <div className="w-full bg-emerald-800 border-4 border-amber-600 rounded-3xl shadow-2xl p-4 sm:p-8" style={{background: 'radial-gradient(ellipse at center, #047857 0%, #064e3b 100%)'}}>
                 <div className="w-full bg-slate-700 rounded-full h-4 mb-4 border border-slate-600">
                    <div
                        className="bg-rose-500 h-full rounded-full transition-all"
                        style={{ width: `${problemTimePercentage}%`, transitionTimingFunction: 'linear', transitionDuration: '0.02s' }}
                    ></div>
                </div>

                <div className="text-center mb-6 rounded-lg bg-black/20">
                    <h3 className="text-lg font-semibold tracking-wider text-slate-300 bg-black/30 p-3 rounded-t-lg border-b-2 border-slate-600">{problemTitle}</h3>
                    <div className="p-4">
                        {problemType === 'change' ? (
                            <div className="text-3xl font-bold text-white mb-4">
                                Bet: ${betAmount} <span className="text-slate-400 mx-2">|</span> Paid With: ${paidWithAmount}
                            </div>
                        ) : (
                            <div className="text-3xl font-bold text-white mb-4">${betAmount}</div>
                        )}
                        <div className="relative flex justify-center items-end h-24 w-full gap-4">
                            {renderChipStacks(calculateChips(problemType === 'color' ? 0 : betAmount), false)}
                            {problemType === 'color' && renderChipStacks(playerChips, false)}
                        </div>
                    </div>
                </div>

                <div className="bg-black bg-opacity-40 rounded-lg p-4 my-6 border-2 border-slate-500/50 shadow-lg">
                    <h3 className="text-lg font-semibold tracking-wider text-center text-slate-300 bg-black/30 p-3 rounded-t-lg border-b-2 border-slate-600 -m-4 mb-4">
                        YOUR PAYOUT WORKSPACE
                    </h3>
                    <div className="bg-slate-900/50 rounded-lg min-h-[120px] p-3 flex justify-center items-end flex-wrap gap-4 mb-4 border-2 border-dashed border-slate-600">
                        {userPayout.length > 0 ? (
                            renderChipStacks(userPayout, true)
                        ) : (
                            <div className="flex items-center justify-center h-full min-h-[80px]">
                                <span className="text-slate-400 italic">Use the chips below to build the correct amount</span>
                            </div>
                        )}
                    </div>
                    <div className="text-center font-bold text-xl text-white mb-4">
                        Your Total: ${userTotal.toFixed(2)}
                    </div>
                </div>

                <div className="text-center p-4 rounded-lg bg-black/20 mt-6">
                    <h3 className="text-lg font-semibold tracking-wider text-slate-300 bg-black/30 p-3 rounded-t-lg border-b-2 border-slate-600 -m-4 mb-6">AVAILABLE CHIPS</h3>
                    <div className="flex justify-center items-center gap-3 flex-wrap">
                        {availableChips.map(value => (
                            <button key={value} onClick={() => handleAddChip(value)} disabled={!!feedback} className="disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-amber-400 rounded-full" aria-label={`Add $${value} chip`}>
                                <Chip value={value} />
                            </button>
                        ))}
                    </div>
                </div>

                <div className="text-center mt-8">
                    <button 
                        onClick={checkAnswer}
                        disabled={userPayout.length === 0 || !!feedback} 
                        className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-3 px-10 rounded-lg text-xl transition-transform transform hover:scale-105 shadow-lg disabled:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Check Payout
                    </button>
                </div>
            </div>
            
            <div className="mt-6 text-center h-20 flex flex-col items-center justify-center">
                <ActionFeedback feedback={feedback} />
            </div>
        </div>
    );
};

export default BeProSiseGroove;