import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card as CardType, Rank, Suit } from '../types';
import Card from './Card';
import { evaluateDealerTalkCue } from '../services/geminiService';
import ActionFeedback from './ActionFeedback';
import { getHandValue } from '../utils/handCalculator';
import BasicStrategyChart from './BasicStrategyChart';
import { createShuffledDeck } from '../utils/deck';
import Chip from './Chip';
import { calculateChips } from '../utils/chipCalculator';
import { speak } from '../utils/speech';

type AuditionState = 'idle' | 'running' | 'finished';
type ScenarioType = 'strategy' | 'math' | 'talk' | 'rules';
type Difficulty = 'easy' | 'medium' | 'hard';


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
        problemTypes: ['strategy', 'math', 'rules', 'talk'] as ScenarioType[],
        title: "High-Stakes Audition",
        description: "The ultimate test. All categories, including complex situational and etiquette questions, at a rapid pace."
    }
};


const MicrophoneIcon: React.FC<{isListening: boolean}> = ({ isListening }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" 
         className={`w-8 h-8 transition-colors ${isListening ? 'text-red-500 animate-pulse' : 'text-slate-400'}`} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5a6 6 0 0 0-12 0v1.5a6 6 0 0 0 6 6Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 14.25v4.5m0-12.75v-1.5m0 12.75a3 3 0 0 1-3-3v-1.5a3 3 0 0 1 6 0v1.5a3 3 0 0 1-3 3Z" />
    </svg>
);

const createCard = (rank: Rank, suit: Suit = Suit.SPADES): CardType => ({ rank, suit, isFaceDown: false });

const strategyScenarios: {q: string, p: Rank[], d: Rank, a: string}[] = [
    { q: 'Hard 16 vs. a Dealer 10. What is the correct play?', p: [Rank.TEN, Rank.SIX], d: Rank.TEN, a: 'hit' },
    { q: 'Hard 12 vs. a Dealer 3. What is the correct play?', p: [Rank.TEN, Rank.TWO], d: Rank.THREE, a: 'stand' },
    { q: 'A pair of 8s vs. a Dealer 10. What is the correct play?', p: [Rank.EIGHT, Rank.EIGHT], d: Rank.TEN, a: 'split' },
    { q: 'A pair of 5s vs. a Dealer 6. What is the correct play?', p: [Rank.FIVE, Rank.FIVE], d: Rank.SIX, a: 'double' },
    { q: 'Your hand total is 11 vs. a Dealer 5. What is the correct play?', p: [Rank.SIX, Rank.FIVE], d: Rank.FIVE, a: 'double' },
    { q: 'Soft 18 (Ace, 7) vs. a Dealer 8. What is the correct play?', p: [Rank.ACE, Rank.SEVEN], d: Rank.EIGHT, a: 'stand' },
    { q: 'Soft 18 (Ace, 7) vs. a Dealer 9. What is the correct play?', p: [Rank.ACE, Rank.SEVEN], d: Rank.NINE, a: 'hit' },
    { q: 'Hard 15 vs. a Dealer 10. What is the correct play?', p: [Rank.TEN, Rank.FIVE], d: Rank.TEN, a: 'surrender' },
];

const mathScenarios = [
    { q: 'Player bets $15 and gets Blackjack. What is the 3:2 payout?', bet: 15, type: '3:2', a: 22.5 },
    { q: 'Player bets $20 and gets Blackjack. What is the 6:5 payout?', bet: 20, type: '6:5', a: 24 },
    { q: 'Player bets $12.50 on a 3:2 table and gets Blackjack. What is the payout?', bet: 12.50, type: '3:2', a: 18.75 },
    { q: 'Player bets $35 on a 6:5 table and gets Blackjack. What is the payout?', bet: 35, type: '6:5', a: 42 },
];

const talkScenarios = [
    { q: 'The table is starting a new round. What do you say to the players?', a: "Place your bets", context: "Bets Open" },
    { q: 'You have just completed a payout. What do you say while clearing your hands?', a: "Hands clear", context: "Procedure" },
    { q: 'A player has Blackjack. What do you say when paying them?', a: "Blackjack pays...", context: "Payout" },
];

const rulesScenarios = [
    { q: 'Does the dealer hit or stand on a soft 17?', a: 'hit' },
    { q: 'What is the maximum number of times a player can split a single hand?', a: '3' },
    { q: 'Can a player double down after splitting?', a: 'no' },
];

declare global {
    interface Window {
        SpeechRecognition: any;
        webkitSpeechRecognition: any;
    }
}
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

const AuditionPractice: React.FC<{ isSpeechEnabled: boolean }> = ({ isSpeechEnabled }) => {
    const [auditionState, setAuditionState] = useState<AuditionState>('idle');
    const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(0);
    const [currentScenario, setCurrentScenario] = useState<Scenario | null>(null);
    const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [userAnswer, setUserAnswer] = useState('');
    const [isAnswered, setIsAnswered] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [showStrategyChart, setShowStrategyChart] = useState(false);
    
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef<any>(null);

    const generateScenario = useCallback((selectedDifficulty: Difficulty) => {
        setIsAnswered(false);
        setUserAnswer('');
        setFeedback(null);

        const config = AUDITION_DIFFICULTY_CONFIG[selectedDifficulty];
        const type = config.problemTypes[Math.floor(Math.random() * config.problemTypes.length)];
        let scenario: Scenario | null = null;
        
        switch (type) {
            case 'strategy': {
                const s = strategyScenarios[Math.floor(Math.random() * strategyScenarios.length)];
                scenario = { type, question: s.q, context: { playerHand: s.p.map(rank => createCard(rank)), dealerUpCard: createCard(s.d) }, correctAnswer: s.a };
                break;
            }
            case 'math': {
                const s = mathScenarios[Math.floor(Math.random() * mathScenarios.length)];
                scenario = { type, question: s.q, context: { bet: s.bet, type: s.type }, correctAnswer: s.a };
                break;
            }
            case 'talk': {
                const s = talkScenarios[Math.floor(Math.random() * talkScenarios.length)];
                scenario = { type, question: s.q, context: { subType: s.context }, correctAnswer: s.a };
                break;
            }
            case 'rules': {
                const s = rulesScenarios[Math.floor(Math.random() * rulesScenarios.length)];
                scenario = { type, question: s.q, context: {}, correctAnswer: s.a };
                break;
            }
        }
        setCurrentScenario(scenario);
        if (scenario) {
            // Use a deliberate, clear rate and neutral pitch for a professional "examiner" voice.
            speak(scenario.question, isSpeechEnabled, 0.95, 1.0);
        }
    }, [isSpeechEnabled]);

    const endAudition = useCallback(() => {
        setAuditionState('finished');
        if (recognitionRef.current && isListening) {
           recognitionRef.current.stop();
        }
        setIsListening(false);
    }, [isListening]);
    
    const startAudition = (selectedDifficulty: Difficulty) => {
        const config = AUDITION_DIFFICULTY_CONFIG[selectedDifficulty];
        setDifficulty(selectedDifficulty);
        setScore(0);
        setTimeLeft(config.duration);
        setAuditionState('running');
        generateScenario(selectedDifficulty);
    };

    useEffect(() => {
        if (auditionState !== 'running') return;
        if (timeLeft <= 0) {
            endAudition();
            return;
        }
        const timer = setTimeout(() => setTimeLeft(t => t - 1), 1000);
        return () => clearTimeout(timer);
    }, [auditionState, timeLeft, endAudition]);
    
    const handleAnswer = useCallback(async (answer: string) => {
        if (isAnswered || !currentScenario || !difficulty) return;
        
        setIsAnswered(true);
        setIsLoading(true);

        let isCorrect = false;
        let explanation = '';

        try {
            if (currentScenario.type === 'talk') {
                const result = await evaluateDealerTalkCue(currentScenario.question, answer);
                isCorrect = result.isCorrect;
                explanation = result.explanation;
            } else {
                const formattedAnswer = answer.toString().trim().toLowerCase();
                const formattedCorrectAnswer = currentScenario.correctAnswer.toString().trim().toLowerCase();
                isCorrect = formattedAnswer === formattedCorrectAnswer;
            }

            if (isCorrect) {
                setFeedback({ message: 'Correct!', type: 'success' });
                setScore(s => s + 1);
            } else {
                const message = currentScenario.type === 'talk' 
                    ? `Not quite. ${explanation}`
                    : `Incorrect. The correct answer is: ${currentScenario.correctAnswer}`;
                setFeedback({ message, type: 'error' });
            }
        } catch (error) {
            setFeedback({ message: 'Could not evaluate answer.', type: 'error' });
        } finally {
            setIsLoading(false);
            setTimeout(() => generateScenario(difficulty), 2200);
        }
    }, [isAnswered, currentScenario, difficulty, generateScenario]);


    useEffect(() => {
        if (!SpeechRecognition) return;
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.lang = 'en-US';
        recognition.interimResults = false;

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        recognition.onerror = (event: any) => console.error('Speech recognition error:', event.error);
        
        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            setUserAnswer(transcript);
            handleAnswer(transcript);
        };
        recognitionRef.current = recognition;
    }, [handleAnswer]);
    
    const handleMicToggle = useCallback(() => {
        if (!SpeechRecognition) {
            alert("Sorry, your browser doesn't support speech recognition.");
            return;
        }
        if (isListening) {
            recognitionRef.current?.stop();
        } else {
            recognitionRef.current?.start();
        }
    }, [isListening]);

    const renderIdleState = () => (
        <div className="text-center">
            <h2 className="text-4xl font-bold mb-2 text-slate-200">Dealer Audition</h2>
            <p className="text-slate-400 mb-8">Test your skills under pressure. Choose your audition level.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {Object.entries(AUDITION_DIFFICULTY_CONFIG).map(([key, config]) => (
                    <button type="button" key={key} onClick={() => startAudition(key as Difficulty)} className="bg-slate-700 rounded-lg p-6 text-center shadow-lg border-2 border-transparent hover:border-slate-400 transition-all transform hover:-translate-y-1 flex flex-col justify-between">
                        <div>
                            <h3 className="text-2xl font-bold text-slate-200">{config.title}</h3>
                            <p className="text-slate-400 mt-2 text-sm">{config.description}</p>
                        </div>
                        <span className="mt-6 w-full bg-slate-600 group-hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-lg text-lg transition-transform transform group-hover:scale-105 shadow-md">
                            Start Audition
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );

    const renderFinishedState = () => (
         <div className="text-center bg-slate-800 p-8 rounded-lg shadow-2xl">
            <h2 className="text-5xl font-bold mb-4 text-slate-400">Audition Complete!</h2>
            <p className="text-2xl text-slate-300 mb-2">You completed the {difficulty} audition!</p>
            <p className="text-6xl font-bold text-amber-400 my-6">{score}</p>
            <p className="text-2xl text-slate-300 mb-8">Correct Answers</p>
            <div className="flex justify-center gap-4">
                <button onClick={() => difficulty && startAudition(difficulty)} className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-3 px-10 rounded-lg text-xl transition-transform transform hover:scale-105 shadow-lg">
                    Retry
                </button>
                <button onClick={() => setAuditionState('idle')} className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-3 px-10 rounded-lg text-xl transition-transform transform hover:scale-105 shadow-lg">
                    Change Audition
                </button>
            </div>
        </div>
    );

    const renderRunningState = () => (
         <div className="w-full max-w-4xl flex flex-col items-center">
            {showStrategyChart && <BasicStrategyChart onClose={() => setShowStrategyChart(false)} />}
             <div className="w-full mb-4 grid grid-cols-2 gap-4 text-center">
                 <div className="bg-slate-800 p-4 rounded-lg shadow-lg border border-slate-700">
                    <div className="text-sm font-medium text-slate-400 uppercase tracking-wider">Time Left</div>
                    <div className="text-3xl font-bold text-sky-400">{timeLeft}s</div>
                 </div>
                 <div className="bg-slate-800 p-4 rounded-lg shadow-lg border border-slate-700">
                    <div className="text-sm font-medium text-slate-400 uppercase tracking-wider">Score</div>
                    <div className="text-3xl font-bold text-emerald-400">{score}</div>
                 </div>
            </div>
            <div className="w-full bg-emerald-800 border-4 border-amber-600 rounded-3xl shadow-2xl p-4 sm:p-8 min-h-[400px] flex flex-col justify-between" style={{background: 'radial-gradient(ellipse at center, #047857 0%, #064e3b 100%)'}}>
                 {!currentScenario ? (
                     <div className="flex justify-center items-center h-full">
                        <div className="w-12 h-12 border-4 border-t-transparent border-emerald-400 border-solid rounded-full animate-spin"></div>
                     </div>
                 ) : (
                     <div className="animate-fade-in">
                        <div className="text-center mb-6">
                             <span className="bg-slate-900/50 text-amber-300 font-bold py-2 px-4 rounded-full text-lg uppercase tracking-wider border-2 border-slate-600">{currentScenario.type}</span>
                        </div>
                        <p className="text-center text-2xl font-semibold text-slate-200 mb-6">{currentScenario.question}</p>

                        {currentScenario.type === 'strategy' && (
                            <div className="flex flex-col sm:flex-row justify-center items-center gap-8 mb-6">
                                <div className="text-center">
                                    <h4 className="font-bold text-slate-300">Player Hand ({getHandValue(currentScenario.context.playerHand)})</h4>
                                    <div className="flex gap-2 mt-2">
                                        {currentScenario.context.playerHand.map((c: CardType, i: number) => <Card key={i} card={c}/>)}
                                    </div>
                                </div>
                                 <div className="text-center">
                                    <h4 className="font-bold text-slate-300">Dealer Shows</h4>
                                    <div className="flex gap-2 mt-2">
                                        <Card card={currentScenario.context.dealerUpCard} />
                                    </div>
                                </div>
                            </div>
                        )}
                        {currentScenario.type === 'math' && (
                             <div className="flex flex-col justify-center items-center gap-4 mb-6">
                                 <div className="text-center bg-black/20 p-4 rounded-lg">
                                    <h4 className="font-bold text-slate-300">Player Bet (${currentScenario.context.bet})</h4>
                                    <div className="flex gap-2 mt-2 justify-center">
                                        {calculateChips(currentScenario.context.bet).map((chip, i) => (
                                            <div key={i} style={{transform: 'scale(0.8)'}}><Chip value={chip} /></div>
                                        ))}
                                    </div>
                                </div>
                             </div>
                        )}

                        <div className="flex flex-col items-center justify-center gap-3">
                            {currentScenario.type === 'strategy' ? (
                                <div className="grid grid-cols-3 gap-3">
                                    {(['hit', 'stand', 'double', 'split', 'surrender'] as const).map(action => (
                                        <button key={action} onClick={() => handleAnswer(action)} disabled={isAnswered || isLoading} className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-3 px-6 rounded-lg text-lg capitalize disabled:opacity-50">
                                            {action}
                                        </button>
                                    ))}
                                    <button onClick={() => setShowStrategyChart(true)} className="bg-sky-700 hover:bg-sky-600 col-span-3 text-white font-bold py-2 px-6 rounded-lg text-base">View Strategy Chart</button>
                                </div>
                            ) : currentScenario.type === 'talk' ? (
                                <div className="flex flex-col items-center gap-4">
                                    <button onClick={handleMicToggle} disabled={isAnswered || isLoading} className="bg-slate-800 p-4 rounded-full disabled:opacity-50" aria-label={isListening ? 'Stop voice recognition' : 'Start voice recognition'}>
                                        <MicrophoneIcon isListening={isListening} />
                                    </button>
                                    <p className="text-slate-300 h-6">{isListening ? "Listening..." : (userAnswer || "Click mic to answer")}</p>
                                </div>
                            ) : (
                                 <form onSubmit={(e) => { e.preventDefault(); handleAnswer(userAnswer); }} className="flex gap-3">
                                     <input
                                        type={currentScenario.type === 'math' ? 'number' : 'text'}
                                        step="0.01"
                                        value={userAnswer}
                                        onChange={(e) => setUserAnswer(e.target.value)}
                                        className="bg-slate-900 border-2 border-slate-600 rounded-lg text-white text-center text-xl font-bold w-48 h-14 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                                        disabled={isAnswered || isLoading}
                                        placeholder={currentScenario.type === 'math' ? '$0.00' : 'Your answer'}
                                        aria-label={currentScenario.type === 'math' ? 'Enter payout amount' : 'Enter your answer'}
                                     />
                                     <button type="submit" disabled={isAnswered || isLoading || !userAnswer} className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-3 px-6 rounded-lg text-lg disabled:opacity-50">Submit</button>
                                 </form>
                            )}
                        </div>
                     </div>
                 )}
                 <div className="mt-6 text-center h-20 flex flex-col items-center justify-center">
                    {isLoading && <div className="w-8 h-8 border-4 border-t-transparent border-slate-400 border-solid rounded-full animate-spin"></div>}
                    <ActionFeedback feedback={feedback} isSpeechEnabled={isSpeechEnabled} />
                </div>
            </div>
        </div>
    );


    switch(auditionState) {
        case 'running': return renderRunningState();
        case 'finished': return renderFinishedState();
        case 'idle':
        default:
            return renderIdleState();
    }
};

export default AuditionPractice;