import React from 'react';
import { GameState, TraineeAction } from '../types';
import Card from './Card';
import PlayerHand from './PlayerHand';
import { getHandValue } from '../utils/handCalculator';

interface GameBoardProps {
    gameState: GameState;
    gamePhase: 'betting' | 'playing';
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
    onDeal: () => void;
    onBetChange: (playerId: number | string, bet: string) => void;
    onSideBetChange: (playerId: number | string, betType: '21+3' | 'perfectPairs') => void;
    onTipChange: (playerId: number | string) => void;
    sideBetConfig: { '21+3': boolean; perfectPairs: boolean };
    currentPlayerId: number | string | null;
    isPayoutPhase: boolean;
    isDealDisabled: boolean;
}

export const GameBoard: React.FC<GameBoardProps> = ({ 
    gameState, 
    gamePhase,
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
    onDeal,
    onBetChange,
    onSideBetChange,
    onTipChange,
    sideBetConfig,
    currentPlayerId,
    isPayoutPhase,
    isDealDisabled,
}) => {
    const dealerHandValue = getHandValue(gameState.dealer.hand);
    const primaryPlayers = gameState.players.filter(p => typeof p.id === 'number');

    return (
        <div 
            className="w-full bg-emerald-800 border-8 border-amber-600 rounded-3xl p-4 sm:p-8 shadow-2xl"
            style={{background: 'radial-gradient(ellipse at center, #047857 0%, #064e3b 100%)'}}
        >
            {/* Dealer's Hand */}
            <div className="text-center mb-8">
                <div className="flex justify-center items-center gap-4">
                    <h2 className="text-2xl font-bold mb-3 text-slate-200">Dealer's Hand</h2>
                    {gamePhase === 'playing' && gameState.totalTip && gameState.totalTip > 0 && (
                        <div className="mb-3 text-lg font-bold text-emerald-300 bg-emerald-900/50 px-3 py-1 rounded-full animate-fade-in">
                            Tips: ${gameState.totalTip}
                        </div>
                    )}
                </div>
                <div className="relative flex justify-center items-center min-h-[140px]">
                    {gameState.dealer.hand.map((card, index) => {
                        const totalCards = gameState.dealer.hand.length;
                        const offsetFromMid = index - (totalCards - 1) / 2;
                        
                        const angle = offsetFromMid * 6;
                        const translateY = Math.abs(offsetFromMid) * 5;
                        const translateX = offsetFromMid * 30;

                        return (
                            <div
                                key={index}
                                className="absolute transition-all duration-500 ease-out"
                                style={{
                                    transform: `translateX(${translateX}px) translateY(${translateY}px) rotate(${angle}deg)`,
                                    zIndex: index
                                }}
                            >
                                <Card card={card} />
                            </div>
                        );
                    })}
                </div>
                {dealerHandValue > 0 && !gameState.dealer.hand.some(c => c.isFaceDown) && (
                    <span className="text-xl font-bold mt-2 inline-block px-4 py-1 rounded-full bg-slate-800 text-amber-300">
                        {dealerHandValue}
                    </span>
                )}
            </div>

            {/* Prompt */}
            <div className="text-center my-6 p-4 bg-slate-900/50 rounded-lg border border-slate-600">
                <p className="text-lg font-semibold text-amber-300">{gameState.prompt}</p>
                {gamePhase === 'betting' ? (
                    <button 
                        onClick={onDeal} 
                        disabled={isDealDisabled}
                        className={`mt-4 px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xl shadow-lg transition-transform transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        Deal Cards
                    </button>
                ) : (
                    <p className="text-sm text-slate-300 mt-1">Rules: {gameState.rules}</p>
                )}
            </div>

            {/* Players' Hands */}
            <div className="flex flex-row flex-wrap justify-center items-start gap-x-2 gap-y-4">
                {primaryPlayers.map(player => {
                     // Find any split hands associated with this player
                    const splitHands = gameState.players.filter(p => typeof p.id === 'string' && p.id.startsWith(`${player.id}-`));
                    const allHandsForPlayer = [player, ...splitHands];

                    if (splitHands.length > 0) {
                        return (
                            <div key={`group-${player.id}`} className="w-full max-w-2xl p-4 rounded-xl bg-slate-900/50 border-2 border-slate-600/50 flex flex-col items-center gap-4 shadow-lg">
                                <h3 className="text-xl font-bold text-slate-200 tracking-wider border-b-2 border-slate-600 pb-2 mb-2 w-full text-center">Player {player.id}'s Hands</h3>
                                <div className="flex flex-row gap-4 items-start flex-wrap justify-center">
                                    {allHandsForPlayer.map((hand, index) => (
                                        <PlayerHand
                                            key={hand.id}
                                            player={hand}
                                            isSplitHand={true}
                                            splitHandIndex={index}
                                            gamePhase={gamePhase}
                                            isCurrentPlayer={hand.id === currentPlayerId}
                                            isPayoutPhase={isPayoutPhase}
                                            isInsuranceOffered={!!gameState.isInsuranceOffered}
                                            onHit={onHit}
                                            onStand={onStand}
                                            onDoubleDown={onDoubleDown}
                                            onSplit={onSplit}
                                            onSurrender={onSurrender}
                                            onAcceptInsurance={onAcceptInsurance}
                                            onDeclineInsurance={onDeclineInsurance}
                                            onAcceptEvenMoney={onAcceptEvenMoney}
                                            onDeclineEvenMoney={onDeclineEvenMoney}
                                            onEndRound={onEndRound}
                                            onBetChange={onBetChange}
                                            onSideBetChange={onSideBetChange}
                                            onTipChange={onTipChange}
                                            sideBetConfig={sideBetConfig}
                                        />
                                    ))}
                                </div>
                            </div>
                        )
                    }

                    return (
                        <PlayerHand
                            key={player.id}
                            player={player}
                            isSplitHand={false}
                            gamePhase={gamePhase}
                            isCurrentPlayer={player.id === currentPlayerId}
                            isPayoutPhase={isPayoutPhase}
                            isInsuranceOffered={!!gameState.isInsuranceOffered}
                            onHit={onHit}
                            onStand={onStand}
                            onDoubleDown={onDoubleDown}
                            onSplit={onSplit}
                            onSurrender={onSurrender}
                            onAcceptInsurance={onAcceptInsurance}
                            onDeclineInsurance={onDeclineInsurance}
                            onAcceptEvenMoney={onAcceptEvenMoney}
                            onDeclineEvenMoney={onDeclineEvenMoney}
                            onEndRound={onEndRound}
                            onBetChange={onBetChange}
                            onSideBetChange={onSideBetChange}
                            onTipChange={onTipChange}
                            sideBetConfig={sideBetConfig}
                        />
                    );
                })}
            </div>
        </div>
    );
};

export default GameBoard;