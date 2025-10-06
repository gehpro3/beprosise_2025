import React, { useState, useCallback, useEffect, useRef } from 'react';
import StatsTracker from './StatsTracker';
import ActionFeedback from './ActionFeedback';
import Chip from './Chip';
import { calculateChips } from '../utils/chipCalculator';
import PayoutChart from './PayoutChart';

const availableChips = [500, 100, 25, 5, 1, 0.5];
type PayoutMode = '6:5' | '3:2' | 'change' | 'color' | 'color_signal' | 'quiz' | 'count_up';
type QuizMode = '6:5' | '3:2';

const HandSignalIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 mr-2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.042L15 21a2.25 2.25 0 0 0-2.25-2.25h-1.5a2.25 2.25 0 0 0-2.25 2.25c0 .355.116.684.31.958L10.5 21.042m4.542-.001a4.5 4.5 0 1 0-9.085 0M9 3.75a3 3 0 0 0-3 3v1.5a3 3 0 0 0 3 3v-6Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 3.75a3 3 0 0 0-3 3v1.5a3 3 0 0 0 3 3v-6Z" />
    </svg>
);

const ChipPayoutPractice: React.FC = () => {
    const [payoutMode, setPayoutMode] = useState<PayoutMode>('6:5');
    const [quizMode, setQuizMode] = useState<QuizMode>('6:5');
    const [betAmount, setBetAmount] = useState(0); 
    const [playerChips, setPlayerChips] = useState<number[]>([]); 
    const [payoutAmount, setPayoutAmount] = useState(0); 
    const [paidWithAmount, setPaidWithAmount] = useState<number | null>(null);
    const [userPayout, setUserPayout] = useState<number[]>([]);
    const [guess, setGuess] = useState('');
    const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [isAnswered, setIsAnswered] = useState(false);
    const [stats, setStats] = useState({ correct: 0, incorrect: 0 });
    const [showChart, setShowChart] = useState(false);
    const [betError, setBetError] = useState<string | null>(null);
    const [animatedDenoms, setAnimatedDenoms] = useState<Set<number>>(new Set());
    const [isSignalPhase, setIsSignalPhase] = useState(false);

    const inputRef = useRef<HTMLInputElement>(null);

    const generateProblem = useCallback(() => {
        setFeedback(null);
        setUserPayout([]);
        setIsAnswered(false);
        setPlayerChips([]);
        setPaidWithAmount(null);
        setGuess('');
        setBetError(null);
        setIsSignalPhase(false);
        
        if (payoutMode === 'quiz') {
            const newBet = Math.floor(Math.random() * 496) + 5; // $5 to $500
            setBetAmount(newBet);
            const correctPayout = newBet * (quizMode === '6:5' ? 1.2 : 1.5);
            setPayoutAmount(correctPayout);
            setTimeout(() => inputRef.current?.focus(), 100);
            return;
        }

        if (payoutMode === 'change' || payoutMode === 'count_up') {
            const paymentChips = [25, 100, 500];
            const paidWith = paymentChips[Math.floor(Math.random() * paymentChips.length)];
            const minBet = 6;
            const maxBet = paidWith - 2;
            let newBet = Math.floor(Math.random() * (maxBet - minBet + 1)) + minBet;
             if (payoutMode === 'count_up' && Math.random() > 0.4) {
                 newBet += 0.5;
            }
            
            setBetAmount(newBet);
            setPaidWithAmount(paidWith);
            setPayoutAmount(paidWith - newBet);
            return;
        }

        if (payoutMode === 'color') {
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
        
        if (payoutMode === 'color_signal') {
            const highValueExchanges = [
                { from: [5, 5, 5, 5, 5], to: 25 },
                { from: [25, 25, 25, 25], to: 100 },
                { from: [100, 100, 100, 100, 100], to: 500 },
            ];
            const exchange = highValueExchanges[Math.floor(Math.random() * highValueExchanges.length)];
            const totalValue = exchange.from.reduce((a, b) => a + b, 0);

            setBetAmount(totalValue);
            setPlayerChips(exchange.from);
            setPayoutAmount(exchange.to);
            return;
        }


        const newBet = Math.floor(Math.random() * 496) + 5; // $5 to $500
        
        setBetAmount(newBet);
        const correctPayout = newBet * (payoutMode === '6:5' ? 1.2 : 1.5);
        setPayoutAmount(correctPayout);

    }, [payoutMode, quizMode]);

    useEffect(() => {
        // Reset stats when switching main modes
        setStats({ correct: 0, incorrect: 0 });
    }, [payoutMode]);
    
    useEffect(() => {
        // Reset stats when switching quiz modes
        if (payoutMode === 'quiz') {
            setStats({ correct: 0, incorrect: 0 });
        }
    }, [quizMode, payoutMode]);

    useEffect(() => {
        generateProblem();
    }, [generateProblem]);

    const handleAddChip = (value: number) => {
        if (isAnswered) return;
        setUserPayout(prev => [...prev, value].sort((a, b) => b - a));

        if (payoutMode === 'count_up') {
            setAnimatedDenoms(prev => new Set(prev).add(value));
            setTimeout(() => {
                setAnimatedDenoms(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(value);
                    return newSet;
                });
            }, 300);
        }
    };
    
    const handleRemoveChip = (value: number) => {
        if (isAnswered) return;
        setUserPayout(prev => {
            const newPayout = [...prev];
            const indexToRemove = newPayout.lastIndexOf(value);
            if (indexToRemove > -1) {
                newPayout.splice(indexToRemove, 1);
            }
            return newPayout;
        });
    }

    const checkChipAnswer = () => {
        if (isAnswered) return;

        const userTotal = userPayout.reduce((sum, val) => sum + val, 0);
        let isCorrect = false;

        if (payoutMode === 'color' || payoutMode === 'color_signal') {
            isCorrect = userTotal === payoutAmount && userPayout.length === 1;
        } else {
            // Use a small tolerance for floating point comparison
            isCorrect = Math.abs(userTotal - payoutAmount) < 0.01;
        }

        if (payoutMode === 'color_signal') {
            if (isCorrect) {
                setFeedback({ message: 'Correct exchange! Now signal the supervisor.', type: 'success' });
                setIsSignalPhase(true);
            } else {
                let incorrectMessage = `Incorrect. The correct exchange is a single $${payoutAmount} chip.`;
                if (userTotal === payoutAmount && userPayout.length !== 1) {
                    incorrectMessage = `Correct total, but the exchange must be one single chip.`;
                }
                setFeedback({ message: incorrectMessage, type: 'error' });
                setStats(prev => ({ ...prev, incorrect: prev.incorrect + 1 }));
                setIsAnswered(true);
                setTimeout(generateProblem, 2000);
            }
            return;
        }


        if (isCorrect) {
            setFeedback({ message: 'Correct!', type: 'success' });
            setStats(prev => ({ ...prev, correct: prev.correct + 1 }));
        } else {
            let incorrectMessage = `Incorrect. Correct amount is $${payoutAmount.toFixed(2)}.`; 
            if (payoutMode === 'color') {
                if (userTotal === payoutAmount && userPayout.length !== 1) {
                    incorrectMessage = `Correct total, but the exchange must be one single chip.`;
                } else {
                    incorrectMessage = `Incorrect. The correct exchange is a single $${payoutAmount} chip.`;
                }
            }
            setFeedback({ message: incorrectMessage, type: 'error' });
            setStats(prev => ({ ...prev, incorrect: prev.incorrect + 1 }));
        }
        setIsAnswered(true);

        setTimeout(() => {
            generateProblem();
        }, 2000);
    };
    
     const handleGuessChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const numericValue = e.target.value.replace(/[^0-9.]/g, '');
        setGuess(numericValue);
    };

    const handleBetAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
    
        if (value === '') {
            setBetAmount(0);
            setPayoutAmount(0);
            setBetError('Please enter a bet amount.');
            return;
        }
        
        // Regular expression to check for positive integers only
        if (!/^\d+$/.test(value)) {
            setBetAmount(0);
            setPayoutAmount(0);
            setBetError('Bet must be a positive whole number.');
            return;
        }
    
        const numValue = parseInt(value, 10);
        
        setBetAmount(numValue); // Set betAmount so user can see chips even if out of range
    
        if (numValue < 5 || numValue > 500) {
            setPayoutAmount(0);
            setBetError('Bet must be between $5 and $500.');
        } else {
            setBetError(null);
            const correctPayout = numValue * (quizMode === '6:5' ? 1.2 : 1.5);
            setPayoutAmount(correctPayout);
        }
    };
    
    const handleSignal = () => {
        if (!isSignalPhase || isAnswered) return;
        setFeedback({ message: 'Good signal! Transaction complete.', type: 'success' });
        setStats(prev => ({ ...prev, correct: prev.correct + 1 }));
        setIsAnswered(true);
        setTimeout(generateProblem, 1500);
    };

    const checkQuizAnswer = (e: React.FormEvent) => {
        e.preventDefault();
        if (!guess) {
            setFeedback({ message: 'Please enter a payout amount.', type: 'error' });
            return;
        }
        if (isAnswered) return;

        const userValue = parseFloat(guess);
        if (Math.abs(userValue - payoutAmount) < 0.01) {
            setFeedback({ message: 'Correct!', type: 'success' });
            setStats(prev => ({ ...prev, correct: prev.correct + 1 }));
        } else {
            const payoutMultiplier = quizMode === '6:5' ? 1.2 : 1.5;
            const tooltipText = `$${betAmount} &times; ${payoutMultiplier} (${quizMode}) = $${payoutAmount.toFixed(2)}`;

            const incorrectMessage = `
                Incorrect. The correct payout is&nbsp;
                <span class="relative group font-semibold cursor-help underline decoration-dotted">
                    $${payoutAmount.toFixed(2)}
                    <span class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-3 py-1.5 bg-slate-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none shadow-lg border border-slate-600 z-10">
                        ${tooltipText}
                        <svg class="absolute text-slate-900 h-2 w-full left-0 top-full" x="0px" y="0px" viewBox="0 0 255 255">
                            <polygon class="fill-current" points="0,0 127.5,127.5 255,0"/>
                        </svg>
                    </span>
                </span>.
            `;
            setFeedback({ message: incorrectMessage, type: 'error' });
            setStats(prev => ({ ...prev, incorrect: prev.incorrect + 1 }));
        }
        setIsAnswered(true);
        setTimeout(() => {
            generateProblem();
        }, 1500);
    };

    const userTotal = userPayout.reduce((sum, val) => sum + val, 0);
    const chartButtonText = `View ${payoutMode === 'quiz' ? quizMode : payoutMode} Chart`;

    const getTabClass = (mode: PayoutMode) => {
        const base = "flex-1 text-center py-3 text-base md:text-lg font-bold transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-slate-400";
        if (mode === payoutMode) {
            return `${base} bg-slate-700 text-white border-b-4 border-slate-500`;
        }
        return `${base} bg-slate-900 text-slate-400 hover:bg-slate-800`;
    };

    const renderChipStacks = (chips: number[], isInteractive: boolean) => {
        const groupedChips = new Map<number, number[]>();
        availableChips.forEach(denom => {
            const chipsOfDenom = chips.filter(c => c === denom);
            if (chipsOfDenom.length > 0) groupedChips.set(denom, chipsOfDenom);
        });

        return (
             Array.from(groupedChips.entries()).map(([denomination, chipsInStack]) => {
                const stackTotal = chipsInStack.length * denomination;
                const isAnimated = payoutMode === 'count_up' && animatedDenoms.has(denomination);
                return (
                    <div key={denomination} className={`flex flex-col items-center gap-2 transition-transform duration-300 ${isAnimated ? 'scale-110' : 'scale-100'}`}>
                        <div className="relative" style={{ width: '48px', height: `${(chipsInStack.length - 1) * 4 + 48}px` }}>
                            {chipsInStack.map((chipValue, index) => {
                                const chipElement = <Chip value={chipValue} />;
                                const wrapperStyle = { bottom: `${index * 4}px`, zIndex: index };

                                return (
                                    <div key={index} className="absolute left-0" style={wrapperStyle}>
                                        {isInteractive && index === chipsInStack.length - 1 ? (
                                            <button
                                                onClick={() => handleRemoveChip(chipValue)}
                                                className="transition-transform transform hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-full"
                                                aria-label={`Remove top $${chipValue} chip`}
                                            >
                                                {chipElement}
                                            </button>
                                        ) : (
                                            chipElement
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        <div className="text-sm font-bold text-slate-300 bg-slate-900/50 px-3 py-1 rounded-full border-2 border-slate-600 shadow-lg whitespace-nowrap -mt-2 z-10">
                           {chipsInStack.length} &times; {denomination === 0.5 ? '50¢' : `$${denomination}`} = ${stackTotal.toFixed(2)}
                        </div>
                    </div>
                );
             })
        );
    };
    
    const ExampleChipStack: React.FC<{chips: number[]}> = ({ chips }) => {
        const chipCounts = new Map<number, number>();
        for (const chipValue of chips) {
            chipCounts.set(chipValue, (chipCounts.get(chipValue) || 0) + 1);
        }

        const stacks = Array.from(chipCounts.entries()).map(([denomination, count]) => ({
            denomination,
            count,
            total: denomination * count,
        })).sort((a, b) => b.denomination - a.denomination);

        return (
            <div className="flex items-end gap-4">
                {stacks.map(({ denomination, count, total }) => (
                    <div key={denomination} className="flex flex-col items-center gap-1" style={{transform: 'scale(0.85)'}}>
                        <div className="relative" style={{ width: '48px', height: `${(count - 1) * 4 + 48}px` }}>
                            {Array.from({ length: count }).map((_, i) => (
                                <div key={i} className="absolute left-0" style={{ bottom: `${i * 4}px`, zIndex: i }}>
                                    <Chip value={denomination} />
                                </div>
                            ))}
                        </div>
                        <div className="text-xs font-bold text-slate-300 bg-slate-900/50 px-2 py-1 rounded-full border border-slate-600 shadow-md whitespace-nowrap -mt-2 z-10">
                            {count} &times; {denomination === 0.5 ? '50¢' : `$${denomination}`} = ${total.toFixed(2)}
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    const renderExample = () => {
        const arrow = <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>;
        
        const ExampleDiagram: React.FC<{ children: React.ReactNode }> = ({ children }) => (
            <div className="w-full flex justify-center items-center gap-4 bg-black/20 p-3 rounded-lg border border-slate-900 flex-wrap">
                {children}
            </div>
        );

        switch(payoutMode) {
            case '6:5':
                return (
                    <ExampleDiagram>
                        <div className="flex flex-col items-center text-center">
                            <span className="text-sm font-bold text-slate-300 uppercase tracking-wider">Bet</span>
                            <ExampleChipStack chips={[5]} />
                        </div>
                        {arrow}
                        <div className="flex flex-col items-center text-center">
                            <span className="text-sm font-bold text-slate-300 uppercase tracking-wider">Payout ($6)</span>
                            <ExampleChipStack chips={[5, 1]} />
                        </div>
                    </ExampleDiagram>
                );
            case '3:2':
                 return (
                    <ExampleDiagram>
                        <div className="flex flex-col items-center text-center">
                            <span className="text-sm font-bold text-slate-300 uppercase tracking-wider">Bet</span>
                            <ExampleChipStack chips={[5]} />
                        </div>
                        {arrow}
                        <div className="flex flex-col items-center text-center">
                            <span className="text-sm font-bold text-slate-300 uppercase tracking-wider">Payout ($7.50)</span>
                            <ExampleChipStack chips={[5, 1, 1, 0.5]} />
                        </div>
                    </ExampleDiagram>
                );
            case 'change':
                 return (
                    <ExampleDiagram>
                        <div className="flex flex-col items-center text-center">
                             <span className="text-sm font-bold text-slate-300 uppercase tracking-wider">Scenario</span>
                             <span className="text-xs text-slate-400 mb-1">Bet: $17, Paid with:</span>
                             <ExampleChipStack chips={[25]} />
                        </div>
                        {arrow}
                        <div className="flex flex-col items-center text-center">
                             <span className="text-sm font-bold text-slate-300 uppercase tracking-wider">Change ($8)</span>
                             <ExampleChipStack chips={[5, 1, 1, 1]} />
                        </div>
                    </ExampleDiagram>
                 );
            case 'color':
            case 'color_signal':
                return (
                    <ExampleDiagram>
                        <div className="flex flex-col items-center text-center">
                            <span className="text-sm font-bold text-slate-300 uppercase tracking-wider">Player Gives</span>
                            <ExampleChipStack chips={[5,5,5,5,5]} />
                        </div>
                        {arrow}
                        <div className="flex flex-col items-center text-center">
                            <span className="text-sm font-bold text-slate-300 uppercase tracking-wider">You Give Back</span>
                             <ExampleChipStack chips={[25]} />
                        </div>
                    </ExampleDiagram>
                );
            default:
                return null;
        }
    }

    const renderQuizMode = () => {
        const getQuizButtonClass = (mode: QuizMode) => {
            const base = "font-bold py-2 px-6 rounded-lg transition-colors text-lg";
            return quizMode === mode 
                ? `${base} bg-slate-500 text-white shadow-lg`
                : `${base} bg-slate-700 hover:bg-slate-600 text-white`;
        };
        const betChips = calculateChips(betAmount);

        return (
             <div className="w-full flex flex-col items-center">
                <h2 className="text-2xl font-bold text-center mb-4 text-slate-200">Payout Memorization Quiz</h2>
                <div className="flex justify-center items-center gap-4 mb-6">
                    <button onClick={() => setQuizMode('6:5')} className={getQuizButtonClass('6:5')}>Practice 6:5</button>
                    <button onClick={() => setQuizMode('3:2')} className={getQuizButtonClass('3:2')}>Practice 3:2</button>
                </div>
                 <div className="w-full text-center p-4 rounded-lg bg-black/20">
                    <h3 className="text-lg font-semibold tracking-wider text-slate-300 bg-black/30 p-3 rounded-t-lg border-b-2 border-slate-600">PLAYER'S BET</h3>
                    <div className="bg-black/20 p-4 rounded-b-lg">
                        <div className="relative mb-2">
                             <span className="absolute left-1/2 -translate-x-14 top-1/2 -translate-y-1/2 text-slate-400 text-3xl font-bold">$</span>
                             <input
                                type="text"
                                inputMode="numeric"
                                value={betAmount === 0 ? '' : betAmount}
                                onChange={handleBetAmountChange}
                                className={`bg-slate-900 border-2 ${betError ? 'border-red-500' : 'border-slate-600'} rounded-lg text-white text-center text-3xl font-bold w-48 h-16 pl-8 focus:outline-none focus:ring-2 ${betError ? 'focus:ring-red-500' : 'focus:ring-slate-400'}`}
                                placeholder="Enter Bet"
                                aria-label="Enter bet amount"
                            />
                        </div>
                        {betError && <p className="text-red-400 text-sm mt-1 -mb-1">{betError}</p>}
                        <div className="relative flex justify-center items-end h-24 w-full gap-4 mt-2">
                           {betAmount < 5 ? (
                                <div className="text-slate-500 self-center">Enter a valid bet to see chips</div>
                            ) : (
                                renderChipStacks(betChips, false)
                            )}
                        </div>
                    </div>
                </div>
                
                <form onSubmit={checkQuizAnswer} className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
                    <div className="relative">
                       <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl font-bold">$</span>
                        <input 
                            ref={inputRef}
                            type="text"
                            inputMode="decimal"
                            value={guess}
                            onChange={handleGuessChange}
                            disabled={isAnswered || !!betError || betAmount < 5}
                            className="bg-slate-900 border-2 border-slate-600 rounded-lg text-white text-center text-xl font-bold w-48 h-14 pl-8 focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:opacity-50"
                            placeholder="Enter payout"
                            aria-label={`Enter ${quizMode} payout`}
                        />
                    </div>
                    <button 
                        type="submit" 
                        disabled={isAnswered || !guess || !!betError || betAmount < 5} 
                        className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-8 rounded-lg text-lg transition-transform transform hover:scale-105 shadow-lg h-14 disabled:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Check Payout
                    </button>
                </form>
             </div>
        );
    };

    const renderCountUpMode = () => {
        const userChangeTotal = userPayout.reduce((sum, val) => sum + val, 0);
        const currentCount = betAmount + userChangeTotal;
        const isComplete = Math.abs(currentCount - (paidWithAmount || 0)) < 0.01;

        const checkButtonClasses = isComplete && !isAnswered
            ? 'bg-emerald-500 hover:bg-emerald-600 text-white animate-pulse'
            : 'bg-slate-600 hover:bg-slate-500 text-white';

        return (
            <div className="w-full flex flex-col items-center p-4">
                <h2 className="text-2xl font-bold text-center mb-4 text-slate-200">Count-Up Change Practice</h2>
                <p className="text-center text-slate-400 mb-6">
                    Count up from the bet amount to the amount paid by adding chips.
                </p>

                <div className="grid grid-cols-2 gap-4 w-full mb-6">
                    <div className="bg-black/20 p-4 rounded-lg text-center">
                        <h3 className="text-lg font-semibold tracking-wider text-slate-300">BET AMOUNT</h3>
                        <p className="text-4xl font-bold text-white mt-2">${betAmount.toFixed(2)}</p>
                    </div>
                    <div className="bg-black/20 p-4 rounded-lg text-center">
                        <h3 className="text-lg font-semibold tracking-wider text-slate-300">PAID WITH</h3>
                        <p className="text-4xl font-bold text-white mt-2">${(paidWithAmount || 0).toFixed(2)}</p>
                    </div>
                </div>

                <div className={`w-full p-4 rounded-lg text-center transition-colors duration-300 mb-6 ${isComplete ? 'bg-emerald-500/30 border-2 border-emerald-400' : 'bg-black/30'}`}>
                    <h3 className="text-lg font-semibold tracking-wider text-slate-300">YOUR CURRENT COUNT</h3>
                    <p className="text-5xl font-bold text-white mt-2">${currentCount.toFixed(2)}</p>
                </div>

                <div className="w-full bg-black bg-opacity-40 rounded-lg p-4 my-6 border-2 border-slate-500/50 shadow-lg">
                    <h3 className="text-lg font-semibold tracking-wider text-center text-slate-300 mb-2">YOUR CHANGE CHIPS</h3>
                    <p className="text-center text-slate-400 text-sm mb-4">Total Change: ${userChangeTotal.toFixed(2)}</p>
                    <div className="bg-slate-900/50 rounded-lg min-h-[120px] p-3 flex justify-center items-end flex-wrap gap-4 border-2 border-dashed border-slate-600">
                        {userPayout.length > 0 ? (
                            renderChipStacks(userPayout, true)
                        ) : (
                            <div className="flex items-center justify-center h-full min-h-[80px]">
                                <span className="text-slate-400 italic">Add chips to start counting up</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="text-center p-4 rounded-lg bg-black/20 w-full">
                    <h3 className="text-lg font-semibold tracking-wider text-slate-300 mb-4">AVAILABLE CHIPS</h3>
                    <div className="flex justify-center items-center gap-3 flex-wrap">
                        {availableChips.map(value => (
                            <button key={value} onClick={() => handleAddChip(value)} disabled={isAnswered} className="disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-amber-400 rounded-full" aria-label={`Add $${value} chip`}>
                                <Chip value={value} />
                            </button>
                        ))}
                    </div>
                </div>

                <div className="text-center mt-8 w-full flex justify-center">
                    <button 
                        onClick={checkChipAnswer}
                        disabled={isAnswered || !isComplete} 
                        className={`w-full max-w-xs font-bold py-3 px-10 rounded-lg text-xl transition-all transform hover:scale-105 shadow-lg ${checkButtonClasses} disabled:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:animate-none`}
                    >
                        Check Change
                    </button>
                </div>
            </div>
        );
    };


    return (
        <div className="w-full max-w-4xl flex flex-col items-center">
            {showChart && (payoutMode !== 'change' && payoutMode !== 'color' && payoutMode !== 'count_up' && payoutMode !== 'color_signal') && <PayoutChart mode={payoutMode === 'quiz' ? quizMode : payoutMode} onClose={() => setShowChart(false)} />}
            <div className="w-full mb-4">
                <StatsTracker stats={stats} />
            </div>

            <div className="w-full bg-slate-800 border-4 border-slate-600 rounded-3xl shadow-2xl relative" style={{background: 'radial-gradient(ellipse at center, #334155 0%, #1e293b 100%)'}}>
                 <div className="absolute top-4 right-4 z-10">
                    {(payoutMode !== 'change' && payoutMode !== 'color' && payoutMode !== 'count_up' && payoutMode !== 'color_signal') && (
                        <button
                            onClick={() => setShowChart(true)}
                            className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-lg text-sm transition-colors shadow-md flex items-center gap-2"
                            aria-label={`${chartButtonText}`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M9 4.804A7.968 7.968 0 0010 4c.85 0 1.673.134 2.45.385A9.967 9.967 0 0110 2c-2.43 0-4.63.849-6.32 2.259.032.025.064.05.097.075A7.97 7.97 0 009 4.804zM4.08 7.159c.032.026.064.05.097.075A7.967 7.967 0 004 10c0 .85.134 1.673.385 2.45a9.967 9.967 0 01-2.259-6.32c.025-.032.05-.064.075-.097zM10 16c-.85 0-1.673-.134-2.45-.385a9.967 9.967 0 016.32-2.259c-.025.032-.05.064-.075.097A7.967 7.967 0 0010 16zm4.804-9A7.968 7.968 0 0010 6c-.85 0-1.673.134-2.45.385A9.967 9.967 0 0116 10c0 2.43-.849 4.63-2.259 6.32a9.967 9.967 0 012.259-6.32c-.032-.026-.064-.05-.097-.075z" />
                            </svg>
                            {chartButtonText}
                        </button>
                    )}
                </div>
                <div className="flex">
                    <button onClick={() => setPayoutMode('6:5')} className={`${getTabClass('6:5')} rounded-tl-2xl`}>6:5 Payouts</button>
                    <button onClick={() => setPayoutMode('3:2')} className={`${getTabClass('3:2')}`}>3:2 Payouts</button>
                    <button onClick={() => setPayoutMode('change')} className={`${getTabClass('change')}`}>Make Change</button>
                    <button onClick={() => setPayoutMode('count_up')} className={`${getTabClass('count_up')}`}>Count-Up Change</button>
                    <button onClick={() => setPayoutMode('color')} className={`${getTabClass('color')}`}>Color Exchange</button>
                    <button onClick={() => setPayoutMode('color_signal')} className={`${getTabClass('color_signal')}`}>Color Up & Signal</button>
                    <button onClick={() => setPayoutMode('quiz')} className={`${getTabClass('quiz')} rounded-tr-2xl`}>Payout Quiz</button>
                </div>
                <div className="p-4 sm:p-8">
                    {payoutMode === 'quiz' ? (
                        renderQuizMode()
                    ) : payoutMode === 'count_up' ? (
                        renderCountUpMode()
                    ) : (
                        <>
                            <div className="text-center mb-6 rounded-lg bg-black/20">
                                <h3 className="text-lg font-semibold tracking-wider text-slate-300 bg-black/30 p-3 rounded-t-lg border-b-2 border-slate-600">1. {payoutMode === 'change' ? 'SCENARIO' : payoutMode === 'color' || payoutMode === 'color_signal' ? "PLAYER'S CHIPS TO EXCHANGE" : "PLAYER'S BET"}</h3>
                                <div className="p-4">
                                    {payoutMode === 'change' ? (
                                        <div className="text-3xl font-bold text-white mb-4">
                                            Bet: ${betAmount} <span className="text-slate-400 mx-2">|</span> Paid With: ${paidWithAmount}
                                        </div>
                                    ) : (
                                        <div className="text-3xl font-bold text-white mb-4">${betAmount}</div>
                                    )}
                                    <div className="relative flex justify-center items-end h-24 w-full gap-4">
                                       {renderChipStacks(calculateChips((payoutMode === 'color' || payoutMode === 'color_signal') ? 0 : betAmount), false)}
                                       {(payoutMode === 'color' || payoutMode === 'color_signal') && renderChipStacks(playerChips, false)}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="mb-6 px-4">
                                {renderExample()}
                            </div>

                            {isSignalPhase ? (
                                <div className="text-center bg-black/40 rounded-lg p-6 border-2 border-amber-500/50 shadow-lg animate-fade-in">
                                    <h3 className="text-2xl font-bold text-amber-300 mb-4">Step 2: Signal Supervisor</h3>
                                    <p className="text-slate-300 mb-6">Casino procedure requires signaling a floor supervisor for high-value color exchanges.</p>
                                    <button 
                                        onClick={handleSignal} 
                                        className="bg-amber-600 hover:bg-amber-500 text-black font-bold py-4 px-10 rounded-lg text-xl transition-transform transform hover:scale-105 shadow-lg flex items-center justify-center mx-auto"
                                    >
                                        <HandSignalIcon />
                                        <span>Signal Supervisor</span>
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div className="bg-black bg-opacity-40 rounded-lg p-4 my-6 border-2 border-slate-500/50 shadow-lg">
                                        <h3 className="text-lg font-semibold tracking-wider text-center text-slate-300 bg-black/30 p-3 rounded-t-lg border-b-2 border-slate-600 -m-4 mb-4">
                                        2. {payoutMode === 'change' ? 'YOUR CHANGE' : (payoutMode === 'color' || payoutMode === 'color_signal') ? 'YOUR EXCHANGE' : 'YOUR PAYOUT'} WORKSPACE
                                        </h3>
                                        <p className="text-center text-slate-300 mb-3">
                                            {payoutMode === 'change' 
                                                ? `Build the correct change for a $${betAmount} bet paid with a $${paidWithAmount} chip.`
                                                : (payoutMode === 'color' || payoutMode === 'color_signal')
                                                ? `Exchange the player's chips for the correct single higher-value chip.`
                                                : `Build the correct ${payoutMode} payout for a $${betAmount} bet.`
                                            }
                                        </p>
                                        <div className="text-center font-bold text-2xl text-white mb-4">
                                            Correct {payoutMode === 'change' ? 'Change' : (payoutMode === 'color' || payoutMode === 'color_signal') ? 'Exchange' : 'Payout'}: ${payoutAmount.toFixed(2)}
                                        </div>
                                        
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
                                        <h3 className="text-lg font-semibold tracking-wider text-slate-300 bg-black/30 p-3 rounded-t-lg border-b-2 border-slate-600 -m-4 mb-6">3. AVAILABLE CHIPS</h3>
                                        <div className="flex justify-center items-center gap-3 flex-wrap">
                                            {availableChips.map(value => (
                                                <button key={value} onClick={() => handleAddChip(value)} disabled={isAnswered} className="disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-amber-400 rounded-full" aria-label={`Add $${value} chip`}>
                                                    <Chip value={value} />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    
                                    <div className="text-center mt-8">
                                        <button 
                                            onClick={checkChipAnswer}
                                            disabled={isAnswered || userPayout.length === 0} 
                                            className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-3 px-10 rounded-lg text-xl transition-transform transform hover:scale-105 shadow-lg disabled:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {payoutMode === 'change' ? 'Check Change' : (payoutMode === 'color' || payoutMode === 'color_signal') ? 'Check Exchange' : 'Check Payout'}
                                        </button>
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </div>
            </div>
            
            <div className="mt-6 text-center h-20 flex flex-col items-center justify-center">
                <ActionFeedback feedback={feedback} />
            </div>
        </div>
    );
};

export default ChipPayoutPractice;