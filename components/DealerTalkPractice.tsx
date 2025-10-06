import React, { useState, useCallback } from 'react';
import { getDealerTalkCue } from '../services/geminiService';
import { CueCategory, DealingSubCategory, PayoutSubCategory } from '../types';

const DealerTalkPractice: React.FC = () => {
    const [category, setCategory] = useState<CueCategory>('dealing');
    const [dealingSubCategory, setDealingSubCategory] = useState<DealingSubCategory>('initial_deal');
    const [payoutSubCategory, setPayoutSubCategory] = useState<PayoutSubCategory>('win');
    const [cue, setCue] = useState<string | null>(null);
    const [context, setContext] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const generateCue = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        setCue(null);
        setContext(null);

        try {
            let generatedContext: any = {};
            let contextString = '';

            if (category === 'dealing') {
                generatedContext.dealingSubCategory = dealingSubCategory;
                switch (dealingSubCategory) {
                    case 'initial_deal': contextString = 'The dealer is dealing the initial two cards to all players.'; break;
                    case 'announce_bets': contextString = 'The dealer is announcing that betting is now closed.'; break;
                    case 'announce_bets_open': contextString = 'The dealer is announcing the start of a new betting round.'; break;
                    case 'check_actions': contextString = 'The dealer is politely prompting a player for their decision.'; break;
                    case 'announce_upcard': contextString = "The dealer is announcing their own up-card to the table."; break;
                }
            } else if (category === 'payout') {
                const outcome = payoutSubCategory;
                const bet = Math.floor(Math.random() * 96) + 5; // $5 to $100
                const payout = outcome === 'blackjack' ? bet * 1.5 : bet;
                generatedContext = { bet, payout, payoutSubCategory: outcome };
                contextString = `Player bet $${bet} and got a ${outcome}. Payout is $${payout.toFixed(2)}.`;
            } else if (category === 'change') {
                const paidWithOptions = [25, 100, 500];
                const paidWith = paidWithOptions[Math.floor(Math.random() * paidWithOptions.length)];
                const changeBet = Math.floor(Math.random() * (paidWith - 5)) + 1;
                generatedContext = { bet: changeBet, paidWith };
                contextString = `Player bet $${changeBet} and paid with a $${paidWith} chip.`;
            }

            const response = await getDealerTalkCue(category, generatedContext);
            setContext(contextString);
            setCue(response);

        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred.');
        } finally {
            setIsLoading(false);
        }
    }, [category, dealingSubCategory, payoutSubCategory]);

    const getTabClass = (tabCategory: CueCategory) => {
        const base = "flex-1 text-center py-3 text-lg font-bold transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-slate-400";
        if (category === tabCategory) {
            return `${base} bg-slate-700 text-white border-b-4 border-slate-500`;
        }
        return `${base} bg-slate-900 text-slate-400 hover:bg-slate-800`;
    };

    const getDealingSubCategoryButtonClass = (subCat: DealingSubCategory) => {
        const base = "text-sm bg-slate-700 hover:bg-slate-600 text-slate-300 font-semibold py-2 px-4 rounded-lg transition-colors";
        if (dealingSubCategory === subCat) {
            return `${base} bg-slate-500 ring-2 ring-slate-400`;
        }
        return base;
    }

    const getPayoutSubCategoryButtonClass = (subCat: PayoutSubCategory) => {
        const base = "text-sm bg-slate-700 hover:bg-slate-600 text-slate-300 font-semibold py-2 px-4 rounded-lg transition-colors";
        if (payoutSubCategory === subCat) {
            return `${base} bg-slate-500 ring-2 ring-slate-400`;
        }
        return base;
    }


    return (
        <div className="w-full max-w-4xl flex flex-col items-center">
            <h2 className="text-3xl font-bold mb-2 text-slate-200">Dealer Talk Practice</h2>
            <p className="text-slate-400 mb-6 text-center">Master what to say and when to say it. Get a new cue for different scenarios.</p>

            <div className="w-full bg-slate-800 border-4 border-slate-600 rounded-3xl shadow-2xl p-4 sm:p-8">
                <div className="flex mb-6">
                    <button onClick={() => setCategory('dealing')} className={`${getTabClass('dealing')} rounded-tl-2xl`}>Dealing Cues</button>
                    <button onClick={() => setCategory('payout')} className={`${getTabClass('payout')}`}>Payout Cues</button>
                    <button onClick={() => setCategory('change')} className={`${getTabClass('change')} rounded-tr-2xl`}>Change Cues</button>
                </div>

                {category === 'dealing' && (
                    <div className="flex justify-center flex-wrap gap-2 mb-6 animate-fade-in">
                        <button onClick={() => setDealingSubCategory('announce_bets_open')} className={getDealingSubCategoryButtonClass('announce_bets_open')}>Bets Open</button>
                        <button onClick={() => setDealingSubCategory('announce_bets')} className={getDealingSubCategoryButtonClass('announce_bets')}>Bets Closed</button>
                        <button onClick={() => setDealingSubCategory('initial_deal')} className={getDealingSubCategoryButtonClass('initial_deal')}>Initial Deal</button>
                        <button onClick={() => setDealingSubCategory('announce_upcard')} className={getDealingSubCategoryButtonClass('announce_upcard')}>Announce Up-Card</button>
                        <button onClick={() => setDealingSubCategory('check_actions')} className={getDealingSubCategoryButtonClass('check_actions')}>Check Player Action</button>
                    </div>
                )}

                {category === 'payout' && (
                    <div className="flex justify-center flex-wrap gap-2 mb-6 animate-fade-in">
                        <button onClick={() => setPayoutSubCategory('win')} className={getPayoutSubCategoryButtonClass('win')}>Standard Win</button>
                        <button onClick={() => setPayoutSubCategory('blackjack')} className={getPayoutSubCategoryButtonClass('blackjack')}>Blackjack Win</button>
                    </div>
                )}


                <div className="text-center">
                    <button
                        onClick={generateCue}
                        disabled={isLoading}
                        className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-3 px-10 rounded-lg text-xl transition-transform transform hover:scale-105 shadow-lg disabled:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? 'Getting Cue...' : 'Get New Cue'}
                    </button>
                </div>

                <div className="mt-6 w-full min-h-[200px] bg-black/30 rounded-lg p-6 border-2 border-slate-700 flex flex-col justify-center items-center">
                    {isLoading && <div className="w-12 h-12 border-4 border-t-transparent border-slate-400 border-solid rounded-full animate-spin"></div>}
                    {error && <div className="text-red-400 text-center"><p className="font-bold">Error:</p><p>{error}</p></div>}
                    
                    {cue && !isLoading && (
                        <div className="text-center animate-fade-in">
                            <p className="text-sm font-semibold text-slate-400 mb-2">SCENARIO:</p>
                            <p className="text-lg text-slate-300 mb-6 font-medium">{context}</p>
                            <p className="text-sm font-semibold text-slate-400 mb-3">DEALER CUE:</p>
                            <blockquote className="text-2xl sm:text-3xl text-amber-300 font-bold italic p-4 border-l-4 border-amber-400 bg-amber-400/10 rounded-r-lg">
                                "{cue}"
                            </blockquote>
                        </div>
                    )}

                    {!cue && !isLoading && !error && (
                         <div className="text-center text-slate-500">
                             <p>Click "Get New Cue" to start practicing.</p>
                         </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DealerTalkPractice;