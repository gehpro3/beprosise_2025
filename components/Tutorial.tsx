import React, { useState, useEffect } from 'react';
import { speak } from '../utils/speech';

interface TutorialProps {
    onExit: () => void;
    isSpeechEnabled: boolean;
}

const tutorialSteps = [
    {
        title: "Welcome to Ginia's Blackjack Trainer!",
        content: "This quick tutorial will walk you through the basics of Blackjack and how to use this trainer to sharpen your skills. Let's get started!",
        speech: "Welcome to Ginia's Blackjack Trainer! This quick tutorial will walk you through the basics of Blackjack and how to use this trainer to sharpen your skills. Let's get started!",
    },
    {
        title: "The Goal of Blackjack",
        content: "Your goal is simple: get a hand value closer to 21 than the dealer's, without going over 21. Going over 21 is called a 'Bust', and it's an automatic loss.",
        speech: "The Goal of Blackjack. Your goal is simple: get a hand value closer to 21 than the dealer's, without going over 21. Going over 21 is called a 'Bust', and it's an automatic loss.",
    },
    {
        title: "Card Values",
        content: () => (
            <ul className="list-disc list-inside space-y-2 text-left">
                <li>Cards <strong>2 through 10</strong> are worth their face value.</li>
                <li><strong>Jack, Queen, and King</strong> are each worth 10.</li>
                <li><strong>Aces</strong> are special: they can be worth 1 or 11, whichever value gives you the best hand.</li>
            </ul>
        ),
        speech: "Card Values. Cards 2 through 10 are worth their face value. Jack, Queen, and King are each worth 10. Aces are special: they can be worth 1 or 11, whichever value gives you the best hand.",
    },
    {
        title: "Understanding the Trainer",
        content: "The main screen shows the dealer's hand at the top and your hand(s) at the bottom. Your bet, hand total, and available actions are clearly displayed for each of your hands.",
        speech: "Understanding the Trainer. The main screen shows the dealer's hand at the top and your hand(s) at the bottom. Your bet, hand total, and available actions are clearly displayed for each of your hands.",
    },
    {
        title: "Your Main Actions: Hit & Stand",
        content: () => (
            <div className="text-left space-y-3">
                <p><strong className="text-green-400">Hit:</strong> Take another card. You can hit as many times as you want, but be careful not to bust!</p>
                <p><strong className="text-red-400">Stand:</strong> Keep your current hand and end your turn. This is the right move when you have a strong hand or think hitting is too risky.</p>
            </div>
        ),
        speech: "Your Main Actions: Hit and Stand. Hit means to take another card. You can hit as many times as you want, but be careful not to bust! Stand means to keep your current hand and end your turn. This is the right move when you have a strong hand or think hitting is too risky.",
    },
    {
        title: "Meet Ginia, Your AI Mentor",
        content: "This is a training tool! After you choose an action, Ginia will give you instant feedback. She'll tell you if your move was correct according to perfect Basic Strategy and explain why. This is the key to learning fast.",
        speech: "Meet Ginia, Your AI Mentor. This is a training tool! After you choose an action, Ginia will give you instant feedback. She'll tell you if your move was correct according to perfect Basic Strategy and explain why. This is the key to learning fast.",
    },
    {
        title: "Advanced Moves & Levels",
        content: "As you progress through the Challenge Levels, you'll practice more advanced situations like Doubling Down, Splitting Pairs, and taking Insurance. Each level is designed to focus on a specific skill.",
        speech: "Advanced Moves and Levels. As you progress through the Challenge Levels, you'll practice more advanced situations like Doubling Down, Splitting Pairs, and taking Insurance. Each level is designed to focus on a specific skill.",
    },
    {
        title: "Other Practice Modes",
        content: "Use the tabs at the top of the screen to access other specialized drills. You can practice Card Counting, Chip Payouts, and even learn what to say at the table with the 'Dealer Talk' mode.",
        speech: "Other Practice Modes. Use the tabs at the top of the screen to access other specialized drills. You can practice Card Counting, Chip Payouts, and even learn what to say at the table with the 'Dealer Talk' mode.",
    },
    {
        title: "You're Ready to Train!",
        content: "You've got the basics! Click 'Finish' to exit this tutorial and select Level 1 to start your first challenge. Good luck!",
        speech: "You're Ready to Train! You've got the basics! Click 'Finish' to exit this tutorial and select Level 1 to start your first challenge. Good luck!",
    }
];

const Tutorial: React.FC<TutorialProps> = ({ onExit, isSpeechEnabled }) => {
    const [currentStep, setCurrentStep] = useState(0);

    useEffect(() => {
        const step = tutorialSteps[currentStep];
        if (step.speech) {
            speak(step.speech, isSpeechEnabled);
        }
    }, [currentStep, isSpeechEnabled]);

    const handleNext = () => {
        if (currentStep < tutorialSteps.length - 1) {
            setCurrentStep(currentStep + 1);
        }
    };

    const handlePrev = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const step = tutorialSteps[currentStep];
    const content = step.content;
    const ContentComponent = typeof content === 'function' ? content : () => <p>{content}</p>;

    return (
        <div 
            className="w-full max-w-2xl mx-auto bg-gray-800 p-8 rounded-lg shadow-2xl border-2 border-gray-600 animate-fade-in"
            role="dialog"
            aria-modal="true"
            aria-labelledby="tutorial-title"
        >
            <div className="flex justify-between items-center mb-4">
                <h2 id="tutorial-title" className="text-3xl font-bold text-gray-200">{step.title}</h2>
                <span className="text-gray-400 font-semibold">
                    Step {currentStep + 1} / {tutorialSteps.length}
                </span>
            </div>
            
            <div className="w-full bg-gray-700 h-1 rounded-full mb-6">
                <div 
                    className="bg-blue-400 h-1 rounded-full transition-all duration-300" 
                    style={{ width: `${((currentStep + 1) / tutorialSteps.length) * 100}%` }}
                ></div>
            </div>

            <div className="text-gray-300 text-lg leading-relaxed min-h-[150px] flex items-center">
                <ContentComponent />
            </div>

            <div className="mt-8 flex justify-between items-center">
                <button 
                    onClick={handlePrev}
                    disabled={currentStep === 0}
                    className="px-6 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    Previous
                </button>
                
                {currentStep === tutorialSteps.length - 1 ? (
                    <button 
                        onClick={onExit}
                        className="px-8 py-3 bg-green-600 hover:bg-green-500 rounded-lg font-bold text-xl transition-colors shadow-lg"
                        aria-label="Finish tutorial"
                    >
                        Finish
                    </button>
                ) : (
                    <button 
                        onClick={handleNext}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-semibold transition-colors"
                    >
                        Next
                    </button>
                )}
            </div>
        </div>
    );
};

export default Tutorial;
