import React from 'react';

interface GameRulesProps {
    onClose: () => void;
}

const GameRules: React.FC<GameRulesProps> = ({ onClose }) => {
    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50 p-4 animate-fade-in"
            onClick={onClose}
        >
            <div 
                className="bg-slate-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 relative border-2 border-slate-500"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    className="absolute top-2 right-2 text-slate-400 hover:text-white text-4xl font-bold"
                    aria-label="Close rules"
                >&times;</button>
                <h2 className="text-3xl font-bold text-slate-200 mb-6 text-center border-b-2 border-slate-600 pb-4">
                    Trainer Game Rules
                </h2>
                
                <div className="space-y-4 text-slate-300 text-lg">
                    <div>
                        <h3 className="font-bold text-xl text-amber-300 mb-2">Objective</h3>
                        <p>The goal is to have a hand value closer to 21 than the dealer's without going over 21 (busting).</p>
                    </div>
                    <div>
                        <h3 className="font-bold text-xl text-amber-300 mb-2">Card Values</h3>
                        <ul className="list-disc list-inside space-y-1 pl-4">
                            <li><strong>Cards 2-10:</strong> Face value.</li>
                            <li><strong>J, Q, K:</strong> 10 points.</li>
                            <li><strong>Ace (A):</strong> 1 or 11 points (whichever is more advantageous).</li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="font-bold text-xl text-amber-300 mb-2">Dealer's Play</h3>
                        <ul className="list-disc list-inside space-y-1 pl-4">
                            <li>The dealer must <strong>hit</strong> on a soft 17 (a hand totaling 17 that includes an Ace counted as 11).</li>
                            <li>The dealer must <strong>stand</strong> on a hard 17 or any total of 18 or more.</li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="font-bold text-xl text-amber-300 mb-2">Player Actions</h3>
                        <ul className="list-disc list-inside space-y-2 pl-4">
                            <li><strong>Blackjack:</strong> A hand of an Ace and a 10-value card on the initial deal. Payout is typically 3:2 or 6:5, as configured at the start of the training session.</li>
                            <li><strong>Double Down:</strong> You can double your initial bet on your first two cards. You will receive only one additional card. Doubling after a split is not permitted in this trainer.</li>
                            <li><strong>Splitting Pairs:</strong> If your first two cards are a pair, you can split them into two separate hands, placing an additional bet equal to your original bet. Each split hand is played independently.</li>
                            <li><strong>Splitting Aces:</strong> When you split Aces, you receive only one additional card for each Ace.</li>
                            <li><strong>Surrender:</strong> You can choose to surrender your initial two-card hand, forfeiting half of your bet and ending the round for that hand. This is known as "late surrender" (offered after the dealer checks for Blackjack).</li>
                            <li><strong>Insurance:</strong> If the dealer's up-card is an Ace, you can make a side bet called "insurance". This bet costs half of your original bet and pays 2:1 if the dealer has Blackjack.</li>
                        </ul>
                    </div>
                </div>
                <div className="text-center mt-8">
                    <button 
                        onClick={onClose}
                        className="px-8 py-3 bg-sky-600 hover:bg-sky-500 rounded-lg font-bold text-xl transition-colors shadow-lg"
                    >
                        Got It!
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GameRules;