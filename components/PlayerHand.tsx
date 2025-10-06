import React, { useState, useEffect, useRef } from 'react';
import { Player } from '../types';
import Card from './Card';
import Chip from './Chip';
import { getHandValue } from '../utils/handCalculator';
import { calculateChips } from '../utils/chipCalculator';

const HitIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>;
const StandIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.042L15 21a2.25 2.25 0 0 0-2.25-2.25h-1.5a2.25 2.25 0 0 0-2.25 2.25c0 .355.116.684.31.958L10.5 21.042m4.542-.001a4.5 4.5 0 1 0-9.085 0M9 3.75a3 3 0 0 0-3 3v1.5a3 3 0 0 0 3 3v-6Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 3.75a3 3 0 0 0-3 3v1.5a3 3 0 0 0 3 3v-6Z" /></svg>;
const DoubleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-3h6" /></svg>;
const SplitIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 19.5v-15m0 0a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 12 19.5m0-15a2.25 2.25 0 0 1 2.25 2.25v10.5A2.25 2.25 0 0 1 12 19.5m-9-3.75h.008v.008H3v-.008Zm18 0h.008v.008h-.008v-.008Z" /></svg>;
const SurrenderIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 0 1-6.364 0M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9 9.75h.008v.008H9V9.75Zm4.5 0h.008v.008H13.5V9.75Z" /></svg>;
const InsuranceIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.286Z" /></svg>;
const EvenMoneyIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-3h6" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" /></svg>;


interface PlayerHandProps {
    player: Player;
    isSplitHand: boolean;
    splitHandIndex?: number;
    gamePhase: 'betting' | 'playing';
    isCurrentPlayer: boolean;
    isPayoutPhase: boolean;
    isInsuranceOffered: boolean;
    onHit: (playerId: number | string) => void;
    onStand: (playerId: number | string) => void;
    onDoubleDown: (playerId: number | string) => void;
    onSplit: (playerId: number | string) => void;
    onSurrender: (playerId: number | string) => void;
    onAcceptInsurance: (playerId: number | string) => void;
    onDeclineInsurance: (playerId: number | string) => void;
    onAcceptEvenMoney: (playerId: number | string) => void;
    onDeclineEvenMoney: (playerId: number | string) => void;
    onEndRound: (playerId: number | string) => void;
    onBetChange: (playerId: number | string, bet: string) => void;
    onSideBetChange: (playerId: number | string, betType: '21+3' | 'perfectPairs') => void;
    onTipChange: (playerId: number | string) => void;
    sideBetConfig: { '21+3': boolean; perfectPairs: boolean };
    animationBaseDelay?: number;
}

const PlayerHand: React.FC<PlayerHandProps> = ({ 
    player, 
    isSplitHand,
    splitHandIndex,
    gamePhase, 
    isCurrentPlayer, 
    isPayoutPhase,
    isInsuranceOffered,
    onHit, 
    onStand, 
    onDoubleDown, 
    onSplit,
    onSurrender,
    onAcceptInsurance,
    onDeclineInsurance,
    onAcceptEvenMoney,
    onDeclineEvenMoney,
    onEndRound,
    onBetChange,
    onSideBetChange,
    onTipChange,
    sideBetConfig,
    animationBaseDelay = 0
}) => {
    const handValue = getHandValue(player.hand);
    const betChips = calculateChips(player.bet);
    const [sideBetNotifications, setSideBetNotifications] = useState<{ id: string, message: string }[]>([]);
    const actionButtonContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Automatically focus the first available action button when it's the player's turn.
        if (isCurrentPlayer && !isPayoutPhase && actionButtonContainerRef.current) {
            const firstButton = actionButtonContainerRef.current.querySelector<HTMLButtonElement>('button:not([disabled])');
            if (firstButton) {
                firstButton.focus();
            }
        }
    }, [isCurrentPlayer, isPayoutPhase]);

    useEffect(() => {
        const notifications: { id: string, message: string }[] = [];
        if (player.sideBetOutcomes?.perfectPairs) {
            const outcome = player.sideBetOutcomes.perfectPairs;
            const message = outcome.outcome === 'win'
                ? `Perfect Pairs WIN: +$${outcome.payout} (${outcome.type})`
                : 'Perfect Pairs: Loss';
            notifications.push({ id: 'pp', message });
        }
        if (player.sideBetOutcomes?.['21+3']) {
            const outcome = player.sideBetOutcomes['21+3'];
            const message = outcome.outcome === 'win'
                ? `21+3 WIN: +$${outcome.payout} (${outcome.handName})`
                : '21+3: Loss';
            notifications.push({ id: '21+3', message });
        }

        if (notifications.length > 0) {
            setSideBetNotifications(notifications);
            const timer = setTimeout(() => {
                setSideBetNotifications([]);
            }, 4000); // Notification visible for 4 seconds
            return () => clearTimeout(timer);
        }
    }, [player.sideBetOutcomes]);


    const renderBettingArea = () => {
        return (
            <div className="flex flex-col items-center gap-2">
                {!player.isAuto && (
                    <div 
                        className="w-16 h-16 border-2 border-dashed border-yellow-400 rounded-full flex flex-col items-center justify-center text-center cursor-pointer hover:bg-yellow-700/30 mb-2"
                        onClick={() => onTipChange(player.id)}
                        title="Tip Dealer ($1)"
                    >
                        <span className="text-xs font-bold text-yellow-300">TIP</span>
                        {player.tip && player.tip > 0 && <Chip value={player.tip} />}
                    </div>
                )}
                <div className="flex items-center gap-2">
                    {sideBetConfig['21+3'] && !player.isAuto && (
                        <div 
                            className="w-20 h-20 border-2 border-dashed border-slate-400 rounded-full flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-700/50"
                            onClick={() => onSideBetChange(player.id, '21+3')}
                        >
                            <span className="text-xs font-bold text-slate-300">21+3</span>
                            {player.sideBets?.['21+3'] && <Chip value={player.sideBets['21+3']} />}
                        </div>
                    )}

                    <div className="flex flex-col items-center">
                        {player.isAuto ? (
                            <div className="w-32 h-16 bg-slate-800 rounded-lg flex items-center justify-center">
                                <span className="text-lg font-bold text-slate-300">AUTO BET</span>
                            </div>
                        ) : (
                            <>
                                <div className="relative">
                                    <label htmlFor={`bet-${player.id}`} className="sr-only">Bet amount for player {player.id}</label>
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg font-bold">$</span>
                                    <input
                                        id={`bet-${player.id}`}
                                        type="text"
                                        inputMode="numeric"
                                        value={player.bet}
                                        onChange={(e) => onBetChange(player.id, e.target.value)}
                                        className={`bg-slate-900 border-2 ${player.betError ? 'border-red-500' : 'border-slate-600'} rounded-lg text-white text-center text-xl font-bold w-32 h-12 pl-6 focus:outline-none focus:ring-2 ${player.betError ? 'focus:ring-red-500' : 'focus:ring-slate-400'}`}
                                    />
                                </div>
                                {player.betError && <p className="text-red-400 text-xs mt-1" role="alert">{player.betError}</p>}
                            </>
                        )}
                    </div>

                     {sideBetConfig.perfectPairs && !player.isAuto && (
                        <div 
                            className="w-20 h-20 border-2 border-dashed border-slate-400 rounded-full flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-700/50"
                            onClick={() => onSideBetChange(player.id, 'perfectPairs')}
                        >
                            <span className="text-xs font-bold text-slate-300">Perfect Pairs</span>
                            {player.sideBets?.perfectPairs && <Chip value={player.sideBets.perfectPairs} />}
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-400 bg-slate-900/50 px-2 py-1 rounded">BJ PAYS {player.payoutRule}</span>
                </div>
            </div>
        );
    };

    const renderActionButtons = () => {
        if (!isCurrentPlayer || player.isFinished || player.isAuto) return null;

        const buttonClass = (enabled: boolean) =>
            `flex-1 flex items-center justify-center gap-2 px-2 py-2 text-sm font-bold rounded-md shadow-md transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 
            ${enabled ? 'text-white' : 'text-slate-500 bg-slate-700 cursor-not-allowed opacity-60'}`;

        if (player.canTakeEvenMoney) {
            return (
                 <div ref={actionButtonContainerRef} className="w-full flex gap-2 mt-3 animate-fade-in">
                    <button onClick={() => onAcceptEvenMoney(player.id)} className={`${buttonClass(true)} bg-emerald-600 hover:bg-emerald-500`} aria-label="Accept even money and take a 1:1 payout">
                        <EvenMoneyIcon/> Accept Even Money
                    </button>
                    <button onClick={() => onDeclineEvenMoney(player.id)} className={`${buttonClass(true)} bg-rose-600 hover:bg-rose-500`} aria-label="Decline even money and play out the hand">
                        Decline
                    </button>
                </div>
            );
        }

        if (isInsuranceOffered) {
            return (
                 <div ref={actionButtonContainerRef} className="w-full flex gap-2 mt-3 animate-fade-in">
                    <button onClick={() => onAcceptInsurance(player.id)} className={`${buttonClass(true)} bg-emerald-600 hover:bg-emerald-500`} aria-label="Accept insurance side bet">
                        <InsuranceIcon/> Accept Insurance
                    </button>
                    <button onClick={() => onDeclineInsurance(player.id)} className={`${buttonClass(true)} bg-rose-600 hover:bg-rose-500`} aria-label="Decline insurance side bet">
                        Decline Insurance
                    </button>
                </div>
            );
        }

        return (
            <div ref={actionButtonContainerRef} className="w-full flex flex-col items-center gap-2 mt-3 animate-fade-in">
                <div className="w-full grid grid-cols-3 gap-2">
                    <button onClick={() => player.canHit && onHit(player.id)} disabled={!player.canHit} className={`${buttonClass(player.canHit)} bg-emerald-600`} aria-label="Hit and take another card">
                        <HitIcon /> Hit
                    </button>
                    <button onClick={() => player.canStand && onStand(player.id)} disabled={!player.canStand} className={`${buttonClass(player.canStand)} bg-rose-600`} aria-label="Stand and end your turn">
                        <StandIcon /> Stand
                    </button>
                    <button onClick={() => player.canDoubleDown && onDoubleDown(player.id)} disabled={!player.canDoubleDown} className={`${buttonClass(player.canDoubleDown)} bg-sky-600`} aria-label="Double down, double your bet and take one more card">
                        <DoubleIcon /> Double
                    </button>
                    <button onClick={() => player.canSplit && onSplit(player.id)} disabled={!player.canSplit} className={`${buttonClass(player.canSplit)} bg-amber-600`} aria-label="Split your pair into two separate hands">
                        <SplitIcon /> Split
                    </button>
                    <button onClick={() => player.canSurrender && onSurrender(player.id)} disabled={!player.canSurrender} className={`${buttonClass(player.canSurrender)} bg-slate-500 col-span-2`} aria-label="Surrender your hand and forfeit half your bet">
                        <SurrenderIcon /> Surrender
                    </button>
                </div>
                <button
                    onClick={() => onEndRound(player.id)}
                    className="w-full mt-1 px-4 py-2 text-sm font-semibold rounded-md shadow-md transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 bg-slate-600 hover:bg-slate-500 text-slate-200"
                    aria-label="End round and skip AI advice"
                >
                    End Round
                </button>
            </div>
        );
    };

    const outcomeTextAndColor = () => {
        switch (player.outcome) {
            case 'blackjack': return { text: `BLACKJACK! +$${player.payoutRule === '3:2' ? player.bet * 1.5 : player.bet * 1.2}`, color: 'bg-amber-500 text-black' };
            case 'win': return { text: `WIN! +$${player.bet}`, color: 'bg-emerald-500 text-white' };
            case 'evenMoney': return { text: `EVEN MONEY +$${player.bet}`, color: 'bg-emerald-500 text-white' };
            case 'loss': return { text: 'LOSS', color: 'bg-rose-600 text-white' };
            case 'push': return { text: 'PUSH', color: 'bg-slate-500 text-white' };
            case 'surrender': return { text: `SURRENDER -$${player.bet / 2}`, color: 'bg-slate-600 text-white' };
            default: return null;
        }
    };
    
    const outcomeStyle = outcomeTextAndColor();
    const isTrainee = !player.isAuto;
    let title: string;
    if (isSplitHand) {
        title = `Player ${player.id.toString().split('-')[0]} - Hand ${splitHandIndex! + 1}`;
    } else {
        title = isTrainee ? `Your Hand (Player ${player.id})` : `Player ${player.id}`;
    }

    return (
        <div className={`relative w-full max-w-xs p-3 rounded-xl transition-all duration-300 flex flex-col items-center gap-2
            ${isCurrentPlayer && !isPayoutPhase ? 'bg-slate-700/80 shadow-2xl scale-105 border-2 border-amber-400' : 'bg-slate-800/60 shadow-lg border-2 border-transparent'}
            ${player.isAuto ? 'opacity-80' : ''}`}
        >
            <h3 className="text-base font-bold text-slate-200 tracking-wider">
                {title}
            </h3>

            <div className="relative flex justify-center items-center min-h-[140px] w-full">
                {gamePhase === 'betting' && renderBettingArea()}
                
                {gamePhase === 'playing' && player.hand.map((card, index) => {
                    const totalCards = player.hand.length;
                    const offsetFromMid = index - (totalCards - 1) / 2;
                    const angle = offsetFromMid * 10;
                    const translateY = Math.abs(offsetFromMid) * 6;
                    const translateX = offsetFromMid * 35;
                    const animationDelay = card.isNew ? animationBaseDelay + (index * 80) : 0;
                    
                    return (
                         <div
                            key={index}
                            className="absolute transition-all duration-500 ease-out"
                            style={{ 
                                transform: `translateX(${translateX}px) translateY(${translateY}px) rotate(${angle}deg)`, 
                                zIndex: index
                            }}
                        >
                            <Card card={card} animationDelay={animationDelay} />
                        </div>
                    );
                })}
                
                {isPayoutPhase && outcomeStyle && (
                    <div className={`absolute inset-0 bg-black/70 flex items-center justify-center rounded-xl z-20 animate-fade-in`}>
                        <div className={`text-2xl font-bold px-4 py-2 rounded-lg ${outcomeStyle.color}`}>
                           {outcomeStyle.text}
                        </div>
                    </div>
                )}
                {sideBetNotifications.map((note, index) => {
                    const isWin = note.message.includes('WIN');
                    return (
                        <div key={note.id} 
                            className={`absolute -bottom-2 transform transition-all duration-500 ease-out z-30 animate-fade-in
                                px-3 py-1 rounded-full text-xs font-bold shadow-lg border-2
                                ${isWin ? 'bg-emerald-500 border-emerald-300 text-white' : 'bg-rose-600 border-rose-400 text-white'}`}
                             style={{ transform: `translateX(${(index === 0 ? -1 : 1) * (sideBetNotifications.length > 1 ? 50 : 0)}%)` }}
                        >
                           {note.message}
                        </div>
                    );
                })}
            </div>

            {gamePhase === 'playing' && (
                <div className="text-center w-full">
                    {handValue > 0 && (
                        <span className={`text-lg font-bold mt-2 inline-block px-3 py-1 rounded-full ${player.isBusted ? 'bg-rose-800 text-rose-300' : 'bg-slate-900 text-amber-300'}`}>
                            {player.isBusted ? `BUST (${handValue})` : handValue}
                        </span>
                    )}
                    <div className="flex justify-center items-end h-16 w-full gap-1 mt-2">
                        {betChips.map((chip, index) => (
                             <div key={index} className="relative w-10 h-10" style={{ transform: 'scale(0.8)' }}>
                                <div className="absolute left-0" style={{ bottom: `${Math.floor(index / 5) * 3}px`, left: `${(index % 5) * 12}px` }}>
                                     <Chip value={chip} />
                                 </div>
                             </div>
                        ))}
                    </div>
                    {renderActionButtons()}
                </div>
            )}
        </div>
    );
};

export default PlayerHand;