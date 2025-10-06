import React, { useState, useEffect, useCallback } from 'react';
import { GameState, Card, Player, TraineeAction, Rank } from './types';
import { createShuffledDeck, shuffleDeck } from './utils/deck';
import { getHandValue, getHandDetails, checkPerfectPairs, check21plus3 } from './utils/handCalculator';
import { getBlackjackAdvice } from './services/geminiService';
import GameBoard from './components/GameBoard';
import ActionFeedback from './components/ActionFeedback';
import StatsTracker from './components/StatsTracker';
import CardCountingPractice from './components/CardCountingPractice';
import ChipPayoutPractice from './components/ChipPayoutPractice';
import BeProSiseGroove from './components/GiniasGroove';
import HitStandPractice from './components/HitStandPractice';
import VirginiaRules from './components/VirginiaRules';
import DealerTalkPractice from './components/DealerTalkPractice';
import AuditionPractice from './components/AuditionPractice';
import Tutorial from './components/Tutorial';
import GameRules from './components/GameRules';
import Sidebar from './components/Sidebar';

const initialPlayer: Omit<Player, 'id'> = {
    hand: [],
    bet: 10,
    tip: 0,
    betError: undefined,
    isBusted: false,
    hasBlackjack: false,
    canHit: false,
    canStand: false,
    canDoubleDown: false,
    canSplit: false,
    canSurrender: false,
    isFinished: false,
    outcome: undefined,
    hasDoubledDown: false,
    hasInsurance: false,
    payoutRule: '3:2',
    hasSplit: false,
    isAuto: false,
    sideBets: {},
    sideBetOutcomes: {},
    canTakeEvenMoney: false,
    hasTakenEvenMoney: false,
};

type PayoutConfig = '3:2' | '6:5' | 'mixed';
type GamePhase = 'level_select' | 'payout_config' | 'side_bet_config' | 'betting' | 'playing' | 'tutorial';

const TutorialIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" /></svg>);


const BlackjackTrainer: React.FC = () => {
    // --- Core Game State ---
    // `level`: The selected difficulty level, determines which scenarios are generated.
    const [level, setLevel] = useState<number | null>(null);
    // `payoutConfig`: Defines the Blackjack payout rules (3:2, 6:5, or mixed) for the table.
    const [payoutConfig, setPayoutConfig] = useState<PayoutConfig | null>(null);
    // `sideBetConfig`: Toggles the availability of side bets for the trainee player.
    const [sideBetConfig, setSideBetConfig] = useState<{ '21+3': boolean; perfectPairs: boolean }>({ '21+3': false, perfectPairs: false });
    // `gameState`: The main object holding all players, the dealer, the deck, and game prompts. Null until setup is complete.
    const [gameState, setGameState] = useState<GameState | null>(null);
    // `gamePhase`: Controls the UI flow, from level selection to betting and active play.
    const [gamePhase, setGamePhase] = useState<GamePhase>('level_select');

    // --- In-Round State ---
    // `currentPlayerId`: Tracks which player's turn it is to act.
    const [currentPlayerId, setCurrentPlayerId] = useState<number | string | null>(null);
    // `isPayoutPhase`: A flag that is true when the dealer's turn is over and outcomes are being displayed.
    const [isPayoutPhase, setIsPayoutPhase] = useState(false);
    // `evaluatedHands`: A set to track which hands have already received AI feedback to prevent repeat API calls for the same hand.
    const [evaluatedHands, setEvaluatedHands] = useState<Set<number | string>>(new Set());

    // --- UI & Feedback State ---
    // `feedback`: Stores the message and type ('success' or 'error') from the Gemini AI to be displayed to the user.
    const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    // `stats`: Tracks the number of correct and incorrect strategy decisions made by the trainee.
    const [stats, setStats] = useState({ correct: 0, incorrect: 0 });
    // `isLoading`: Shows a loading indicator, primarily used while waiting for a response from the Gemini API.
    const [isLoading, setIsLoading] = useState(false);
    // `showDealerTurnBanner`: Controls the visibility of the "DEALER'S TURN" overlay.
    const [showDealerTurnBanner, setShowDealerTurnBanner] = useState(false);
    // `showRules`: Toggles the visibility of the game rules modal.
    const [showRules, setShowRules] = useState(false);
    
    const updatePlayerAbilities = useCallback((player: Player): Player => {
        const handValue = getHandValue(player.hand);
        const canAffordDouble = true; // Assuming player can always afford for training purposes
        const isInitialHand = player.hand.length === 2;

        return {
            ...player,
            isBusted: handValue > 21,
            canHit: !player.isBusted && handValue < 21 && !player.isFinished,
            canStand: !player.isBusted && !player.isFinished,
            canDoubleDown: isInitialHand && canAffordDouble && !player.isFinished && !player.hasSplit,
            canSplit: isInitialHand && player.hand[0].rank === player.hand[1].rank && !player.isFinished,
            canSurrender: isInitialHand && !player.isFinished,
        };
    }, []);

    const dealCard = (deck: Card[], toHand: Card[], isFaceDown = false): { newDeck: Card[], newHand: Card[] } => {
        if (deck.length === 0) {
            console.error("Deck is empty!");
            return { newDeck: [], newHand: toHand };
        }
        const card = { ...deck.pop()!, isFaceDown };
        return {
            newDeck: deck,
            newHand: [...toHand, card],
        };
    };
    
    const setupBettingPhase = useCallback((config: PayoutConfig) => {
        setIsPayoutPhase(false);
        setFeedback(null);
        setEvaluatedHands(new Set());
        setCurrentPlayerId(null);

        const numPlayers = 4;
        const autoPlayerId = Math.floor(Math.random() * numPlayers) + 1;

        const players: Player[] = Array.from({ length: numPlayers }, (_, i) => {
            let rule: '3:2' | '6:5';
            if (config === 'mixed') {
                rule = Math.random() < 0.7 ? '3:2' : '6:5';
            } else {
                rule = config;
            }
            return {
                ...initialPlayer,
                id: i + 1,
                bet: Math.floor(Math.random() * 46) + 5, // Bets from $5 to $50
                payoutRule: rule,
                isAuto: (i + 1) === autoPlayerId,
                sideBets: {},
                sideBetOutcomes: {},
                tip: 0,
            };
        });
        
        const newGameState: GameState = {
            dealer: { hand: [] },
            players: players,
            deck: createShuffledDeck(),
            prompt: "Place your bets, then press Deal.",
            rules: "Dealer hits soft 17. Payouts: BJ 3:2 | Win 1:1 | 6:5 available in practice",
            isPlayerTurn: false,
            totalTip: 0,
        };

        setGameState(newGameState);
    }, []);

    const handleDeal = useCallback(() => {
        if (!gameState || level === null) return;

        const hasErrors = gameState.players.some(p => !!p.betError || (!p.isAuto && p.bet < 5));
        if (hasErrors) {
            setFeedback({ message: "Please correct all bet errors before dealing.", type: 'error' });
            return;
        }
        
        const totalTip = gameState.players.reduce((sum, player) => sum + (player.tip || 0), 0);

        setIsLoading(true);
        setFeedback(null);
        setIsPayoutPhase(false);
        setEvaluatedHands(new Set());

        let deck = createShuffledDeck();
        let players = [...gameState.players];
        
        let forcedDealerUpCardRank: Rank | null = null;
        const traineePlayerForScenario = players.find(p => !p.isAuto);
        const traineePlayerIndexForScenario = traineePlayerForScenario ? players.indexOf(traineePlayerForScenario) : -1;

        // Level-specific scenario generation
        if (traineePlayerIndexForScenario !== -1) {
            if (level === 2) { // Focus on Double Down
                const doubleDownHands: [Rank, Rank][] = [
                    [Rank.TWO, Rank.SEVEN], [Rank.THREE, Rank.SIX], [Rank.FOUR, Rank.FIVE], // Total 9
                    [Rank.TWO, Rank.EIGHT], [Rank.THREE, Rank.SEVEN], [Rank.FOUR, Rank.SIX], // Total 10
                    [Rank.TWO, Rank.NINE], [Rank.THREE, Rank.EIGHT], [Rank.FOUR, Rank.SEVEN], [Rank.FIVE, Rank.SIX] // Total 11
                ];
                const [rank1, rank2] = doubleDownHands[Math.floor(Math.random() * doubleDownHands.length)];
                
                const handCards: Card[] = [];
                const remainingDeck: Card[] = [];
                let found1 = false;
                let found2 = false;

                for (const card of deck) {
                    if (!found1 && card.rank === rank1) {
                        handCards.push(card);
                        found1 = true;
                    } else if (!found2 && card.rank === rank2) {
                        handCards.push(card);
                        found2 = true;
                    } else {
                        remainingDeck.push(card);
                    }
                }
                
                if (handCards.length === 2) {
                    deck = shuffleDeck(remainingDeck);
                    players[traineePlayerIndexForScenario].hand = handCards;
                }
            }
            if (level === 3) {
                const pairRanks: Rank[] = [Rank.TWO, Rank.THREE, Rank.FOUR, Rank.FIVE, Rank.SIX, Rank.SEVEN, Rank.EIGHT, Rank.NINE, Rank.ACE, Rank.TEN, Rank.JACK, Rank.QUEEN, Rank.KING];
                const pairRank = pairRanks[Math.floor(Math.random() * pairRanks.length)];
                const pairCards: Card[] = [];
                const remainingDeck: Card[] = [];

                let found = 0;
                for (const card of deck) {
                    if (card.rank === pairRank && found < 2) {
                        pairCards.push(card);
                        found++;
                    } else {
                        remainingDeck.push(card);
                    }
                }
                deck = shuffleDeck(remainingDeck);
                
                if (pairCards.length === 2) {
                    players[traineePlayerIndexForScenario].hand = pairCards;
                }
            }
            if (level === 6) { // Focus on Surrender
                const surrenderScenarios: { pRanks: [Rank, Rank]; dRank: Rank }[] = [
                    { pRanks: [Rank.TEN, Rank.SIX], dRank: Rank.NINE },   // 16 vs 9
                    { pRanks: [Rank.NINE, Rank.SEVEN], dRank: Rank.TEN }, // 16 vs 10
                    { pRanks: [Rank.TEN, Rank.SIX], dRank: Rank.ACE },    // 16 vs A
                    { pRanks: [Rank.TEN, Rank.FIVE], dRank: Rank.TEN },   // 15 vs 10
                    { pRanks: [Rank.NINE, Rank.SIX], dRank: Rank.TEN },   // 15 vs 10
                ];
                const scenario = surrenderScenarios[Math.floor(Math.random() * surrenderScenarios.length)];
                forcedDealerUpCardRank = scenario.dRank;
                const [rank1, rank2] = scenario.pRanks;
                
                const handCards: Card[] = [];
                const remainingDeck: Card[] = [];
                let found1 = false;
                let found2 = false;

                for (const card of deck) {
                    if (!found1 && card.rank === rank1) { handCards.push(card); found1 = true; } 
                    else if (!found2 && card.rank === rank2) { handCards.push(card); found2 = true; } 
                    else { remainingDeck.push(card); }
                }
                 if (handCards.length === 2) {
                    deck = shuffleDeck(remainingDeck);
                    players[traineePlayerIndexForScenario].hand = handCards;
                }
            }
        }

        let dealerHand: Card[] = [];
        let updatedDeck = deck;

        // Deal to players who don't have cards yet
        for (let i = 0; i < players.length; i++) {
            if (players[i].hand.length === 0) {
                let pDeal1 = dealCard(updatedDeck, []);
                let pDeal2 = dealCard(pDeal1.newDeck, pDeal1.newHand);
                players[i].hand = pDeal2.newHand;
                updatedDeck = pDeal2.newDeck;
            }
        }
        
        if (level === 4) { // Focus on Insurance by forcing a dealer Ace
            forcedDealerUpCardRank = Rank.ACE;
        }

        if (forcedDealerUpCardRank) {
            const cardIndex = updatedDeck.findIndex(c => c.rank === forcedDealerUpCardRank);
            if (cardIndex > -1) {
                const forcedCard = updatedDeck.splice(cardIndex, 1)[0];
                updatedDeck.push(forcedCard); // Put at end, will be dealt as dealer's up-card
            }
        }

        let dDeal1 = dealCard(updatedDeck, []);
        let dDeal2 = dealCard(dDeal1.newDeck, dDeal1.newHand, true);
        dealerHand = dDeal2.newHand;
        deck = dDeal2.newDeck;
        
        const dealerUpCard = dealerHand.find(c => !c.isFaceDown);
        
        // --- SIDE BET RESOLUTION ---
        if (dealerUpCard) {
            players = players.map(player => {
                if (player.isAuto) return player;
                let newSideBetOutcomes = { ...player.sideBetOutcomes };

                // Check for Perfect Pairs
                if (player.sideBets?.perfectPairs && player.sideBets.perfectPairs > 0) {
                    const result = checkPerfectPairs(player.hand);
                    if (result) {
                        newSideBetOutcomes.perfectPairs = {
                            outcome: 'win',
                            payout: player.sideBets.perfectPairs * result.payoutMultiplier,
                            type: result.type,
                        };
                    } else {
                        newSideBetOutcomes.perfectPairs = { outcome: 'loss', payout: 0 };
                    }
                }

                // Check for 21+3
                if (player.sideBets?.['21+3'] && player.sideBets['21+3'] > 0) {
                    const result = check21plus3(player.hand, dealerUpCard);
                    if (result) {
                        newSideBetOutcomes['21+3'] = {
                            outcome: 'win',
                            payout: player.sideBets['21+3'] * result.payoutMultiplier,
                            handName: result.handName,
                        };
                    } else {
                        newSideBetOutcomes['21+3'] = { outcome: 'loss', payout: 0 };
                    }
                }
                return { ...player, sideBetOutcomes: newSideBetOutcomes };
            });
        }
        // --- END SIDE BET RESOLUTION ---
        
        const isInsuranceOffered = dealerUpCard?.rank === 'A' && level >= 4;
        const dealerHandValue = getHandValue(dealerHand, { countFaceDown: true });
        const dealerHasBlackjack = dealerHandValue === 21 && dealerHand.length === 2;

        players = players.map(p => {
            const playerHandValue = getHandValue(p.hand);
            const hasBlackjack = playerHandValue === 21 && p.hand.length === 2;
            const canTakeEvenMoney = hasBlackjack && isInsuranceOffered && !p.isAuto;
            
            const isFinished = !!p.isAuto || (hasBlackjack && !canTakeEvenMoney) || (dealerHasBlackjack && !isInsuranceOffered && !canTakeEvenMoney);
            
            let updatedPlayer: Player = { ...p, hasBlackjack, isFinished, canTakeEvenMoney };

            if (!p.isAuto && !isFinished && !isInsuranceOffered && !canTakeEvenMoney) {
                updatedPlayer = updatePlayerAbilities(updatedPlayer);
            }
            return updatedPlayer;
        });

        const firstPlayerToAct = players.find(p => !p.isAuto && !p.isFinished);
        
        if (firstPlayerToAct) {
             setCurrentPlayerId(firstPlayerToAct.id);
        } else {
             setCurrentPlayerId(null);
        }

        const newGameState: GameState = {
            ...gameState,
            dealer: { hand: dealerHand },
            players: players,
            deck: deck,
            prompt: firstPlayerToAct
                ? (firstPlayerToAct.canTakeEvenMoney
                    ? `Player ${firstPlayerToAct.id}, you have Blackjack vs an Ace. Accept Even Money?`
                    : isInsuranceOffered
                    ? `Player ${firstPlayerToAct.id}, dealer shows an Ace. Should you take Insurance?`
                    : `Player ${firstPlayerToAct.id}, what is the correct action based on Basic Strategy?`)
                : 'All player turns are complete.',
            isPlayerTurn: !!firstPlayerToAct,
            isInsuranceOffered,
            totalTip,
        };

        setGameState(newGameState);
        setGamePhase('playing');
        setIsLoading(false);
        
    }, [gameState, level, updatePlayerAbilities]);

    const handleLevelSelect = (selectedLevel: number) => {
        setLevel(selectedLevel);
        setGamePhase('payout_config');
    };

    const handleStartGame = (config: PayoutConfig) => {
        if (level === null) return;
        setPayoutConfig(config);
        setGamePhase('side_bet_config');
    };

    const handleSideBetsSelected = (sbc: { '21+3': boolean; perfectPairs: boolean }) => {
        if (level === null || payoutConfig === null) return;
        setSideBetConfig(sbc);
        setupBettingPhase(payoutConfig);
        setGamePhase('betting');
    };
    
    const handleBetChange = (playerId: string | number, betString: string) => {
        if (!gameState) return;

        let newBet = 0;
        let error: string | undefined = undefined;

        if (betString === '') {
            error = "Bet is required.";
        } else {
            const parsedValue = Number(betString);
            if (!Number.isInteger(parsedValue)) {
                error = "Must be a whole number.";
            } else if (parsedValue < 5) {
                error = "Min bet is $5.";
            } else if (parsedValue > 500) {
                error = "Max bet is $500.";
            }
            newBet = isNaN(parsedValue) ? 0 : parsedValue;
        }

        setGameState(prevState => {
            if (!prevState) return null;
            const newPlayers = prevState.players.map(p => 
                p.id === playerId ? { ...p, bet: newBet, betError: error } : p
            );
            return { ...prevState, players: newPlayers };
        });
    };

    const handleSideBetChange = (playerId: string | number, betType: '21+3' | 'perfectPairs') => {
        setGameState(prevState => {
            if (!prevState) return null;
            const newPlayers = prevState.players.map(p => {
                if (p.id === playerId) {
                    const newSideBets = { ...p.sideBets };
                    // Toggle a fixed $5 bet
                    if (newSideBets[betType]) {
                        delete newSideBets[betType];
                    } else {
                        newSideBets[betType] = 5;
                    }
                    return { ...p, sideBets: newSideBets };
                }
                return p;
            });
            return { ...prevState, players: newPlayers };
        });
    };

    const handleTipChange = (playerId: string | number) => {
        setGameState(prevState => {
            if (!prevState) return null;
            const newPlayers = prevState.players.map(p => {
                if (p.id === playerId) {
                    // Toggle a fixed $1 tip
                    const newTip = p.tip && p.tip > 0 ? 0 : 1;
                    return { ...p, tip: newTip };
                }
                return p;
            });
            return { ...prevState, players: newPlayers };
        });
    };

    const resetTraining = () => {
        setLevel(null);
        setPayoutConfig(null);
        setGameState(null);
        setStats({ correct: 0, incorrect: 0 });
        setGamePhase('level_select');
    };

    const handleEndRound = (playerId: string | number) => {
        // This action effectively stands the player's hand, ending their turn for that hand, but without getting AI advice.
        handlePlayerAction('stand', playerId, true);
    };

    const handlePlayerAction = async (action: TraineeAction, playerId: number | string, skipAdvice = false) => {
        if (!gameState || !currentPlayerId || isLoading || playerId !== currentPlayerId || !level) return;
        
        const isInsuranceAction = action === 'acceptInsurance' || action === 'declineInsurance';
        const isEvenMoneyAction = action === 'acceptEvenMoney' || action === 'declineEvenMoney';

        if (skipAdvice) {
            setFeedback(null);
        }

        if (!skipAdvice && (isInsuranceAction || isEvenMoneyAction || !evaluatedHands.has(playerId))) {
            setIsLoading(true);
            setFeedback(null);
            try {
                const advice = await getBlackjackAdvice(gameState, playerId, level);
                if (action === advice.recommendedAction) {
                    setFeedback({ message: `Correct! ${advice.explanation}`, type: 'success' });
                    setStats(prev => ({ ...prev, correct: prev.correct + 1 }));
                } else {
                    const incorrectMessage = `Incorrect. The best move was ${advice.recommendedAction.toUpperCase()}. ${advice.explanation}`;
                    setFeedback({ message: incorrectMessage, type: 'error' });
                    setStats(prev => ({ ...prev, incorrect: prev.incorrect + 1 }));
                }
                if (!isInsuranceAction && !isEvenMoneyAction) {
                    setEvaluatedHands(prev => new Set(prev).add(playerId));
                }
            } catch (error) {
                console.error(error);
                setFeedback({ message: 'Could not get AI advice. Please check your API key.', type: 'error' });
            } finally {
                setIsLoading(false);
            }
        }
        
        const nextPlayerLogic = (currentState: GameState): GameState => {
            const currentActor = currentState.players.find(p => p.id === currentPlayerId);
            if (currentActor && currentActor.isFinished) {
                const baseId = currentActor.id.toString().split('-')[0];
                const nextHandForSamePlayer = currentState.players.find(p => p.id.toString().split('-')[0] === baseId && !p.isFinished);
                
                if (nextHandForSamePlayer) {
                    setCurrentPlayerId(nextHandForSamePlayer.id);
                    currentState.prompt = `Player ${nextHandForSamePlayer.id}, what is the correct action based on Basic Strategy?`;
                } else {
                    const currentPlayerIndex = currentState.players.findIndex(p => p.id === currentPlayerId);
                    const nextPlayer = currentState.players.find((p, index) => index > currentPlayerIndex && !p.isAuto && !p.isFinished);
                    
                    if (nextPlayer) {
                       setCurrentPlayerId(nextPlayer.id);
                       currentState.prompt = `Player ${nextPlayer.id}, what is the correct action based on Basic Strategy?`;
                    } else {
                       setCurrentPlayerId(null);
                       currentState.isPlayerTurn = false;
                    }
                }
            }
            return currentState;
        };

        if (isEvenMoneyAction) {
            setGameState(prevState => {
                if (!prevState) return null;
                const newPlayers = prevState.players.map(p => {
                    if (p.id === playerId) {
                        return {
                            ...p,
                            hasTakenEvenMoney: action === 'acceptEvenMoney',
                            isFinished: true,
                            canTakeEvenMoney: false,
                        };
                    }
                    return p;
                });
                return nextPlayerLogic({ ...prevState, players: newPlayers });
            });
        } else if (isInsuranceAction) {
            setGameState(prevState => {
                if (!prevState) return null;
                const newPlayers = prevState.players.map(p => p.id === playerId ? { ...p, hasInsurance: action === 'acceptInsurance' } : p);
                const dealerHasBlackjack = getHandValue(prevState.dealer.hand, { countFaceDown: true }) === 21;
                
                if (dealerHasBlackjack) {
                    const revealedHand = prevState.dealer.hand.map(c => ({...c, isFaceDown: false}));
                    return { ...prevState, players: newPlayers, dealer: { hand: revealedHand }, isPlayerTurn: false, isInsuranceOffered: false };
                } else {
                    const updatedPlayer = newPlayers.find(p => p.id === playerId);
                    if (updatedPlayer) {
                       const playerIndex = newPlayers.findIndex(p => p.id === playerId);
                       newPlayers[playerIndex] = updatePlayerAbilities(updatedPlayer);
                    }
                    return {
                        ...prevState,
                        players: newPlayers,
                        isInsuranceOffered: false,
                        prompt: `Insurance closed. Player ${playerId}, what is your next move?`
                    };
                }
            });
        } else {
            setGameState(prevState => {
                if (!prevState) return null;

                let newDeck = [...prevState.deck];
                const newPlayers = [...prevState.players];
                const playerIndex = newPlayers.findIndex(p => p.id === playerId);
                if (playerIndex === -1) return prevState;

                let player = { ...newPlayers[playerIndex] };

                switch (action) {
                    case 'hit': {
                        const { newDeck: d, newHand: h } = dealCard(newDeck, player.hand);
                        player.hand = h;
                        newDeck = d;
                        player = updatePlayerAbilities(player);
                        if (player.isBusted || getHandValue(player.hand) === 21) player.isFinished = true;
                        break;
                    }
                    case 'stand': {
                        player.isFinished = true;
                        break;
                    }
                    case 'double': {
                        player.bet *= 2;
                        player.hasDoubledDown = true;
                        const { newDeck: d, newHand: h } = dealCard(newDeck, player.hand);
                        player.hand = h;
                        newDeck = d;
                        player = updatePlayerAbilities(player);
                        player.isFinished = true;
                        break;
                    }
                    case 'split': {
                        const originalCard1 = player.hand[0];
                        const originalCard2 = player.hand[1];
                        
                        const baseId = player.id.toString().split('-')[0];
                        const splitCount = newPlayers.filter(p => p.id.toString().startsWith(`${baseId}-split`)).length;
                        const splitPlayerId = `${baseId}-split-${splitCount + 1}`;
                        
                        const isAces = originalCard1.rank === Rank.ACE;
                        player.hasSplit = true;

                        const { newDeck: d1, newHand: h1 } = dealCard(newDeck, [originalCard1]);
                        player.hand = h1;
                        newDeck = d1;
                        
                        const { newDeck: d2, newHand: h2 } = dealCard(newDeck, [originalCard2]);
                        let splitPlayer: Player = { 
                            ...initialPlayer, 
                            id: splitPlayerId, 
                            bet: player.bet, 
                            hand: h2, 
                            payoutRule: player.payoutRule,
                            hasSplit: true,
                        };
                        newDeck = d2;

                        player = updatePlayerAbilities(player);
                        splitPlayer = updatePlayerAbilities(splitPlayer);

                        if (isAces) {
                            player.isFinished = true;
                            splitPlayer.isFinished = true;
                        }
                        
                        newPlayers.splice(playerIndex + 1, 0, splitPlayer);
                        break;
                    }
                    case 'surrender': {
                        player.isFinished = true;
                        player.outcome = 'surrender';
                        break;
                    }
                }
                newPlayers[playerIndex] = player;
                
                return nextPlayerLogic({ ...prevState, players: newPlayers, deck: newDeck });
            });
        }
    };
    
    const runDealerTurn = useCallback(() => {
        setGameState(prevState => {
            if (!prevState) return null;
            const revealedHand = prevState.dealer.hand.map(c => ({...c, isFaceDown: false}));
            const newState = {...prevState, dealer: { hand: revealedHand }};
            
            const nonBustedPlayers = newState.players.filter(p => !p.isBusted && p.outcome !== 'surrender' && !p.hasTakenEvenMoney);
            if(nonBustedPlayers.length === 0) {
                // This will be called from outside the effect to trigger payouts
                return newState;
            }

            return newState;
        });
    }, []);
    
    useEffect(() => {
        if (gameState && !isPayoutPhase && gamePhase === 'playing') {
            const allPlayersFinished = gameState.players.every(p => p.isFinished);
            if (allPlayersFinished && !gameState.isPlayerTurn && gameState.dealer.hand.some(c => c.isFaceDown)) {
                 runDealerTurn();
                 return;
            }

            const isReadyForDealerTurn = !gameState.isPlayerTurn && gameState.dealer.hand.some(c => c.isFaceDown) && !allPlayersFinished;
            if (isReadyForDealerTurn) {
                setShowDealerTurnBanner(true);
                const timer = setTimeout(() => {
                    setShowDealerTurnBanner(false);
                    runDealerTurn();
                }, 1200);
                return () => clearTimeout(timer);
            }

            const dealerHandRevealed = !gameState.dealer.hand.some(c => c.isFaceDown);
            const dealerHasBlackjack = getHandValue(gameState.dealer.hand) === 21 && gameState.dealer.hand.length === 2;
             if (dealerHandRevealed && dealerHasBlackjack) {
                calculatePayouts(gameState);
                return;
            }
             const nonBustedPlayers = gameState.players.filter(p => !p.isBusted && p.outcome !== 'surrender' && !p.hasTakenEvenMoney);
             if (dealerHandRevealed && nonBustedPlayers.length === 0) {
                calculatePayouts(gameState);
             }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gameState, isPayoutPhase, gamePhase, runDealerTurn]);

    useEffect(() => {
        if (!gameState || gameState.isPlayerTurn || isPayoutPhase || gamePhase !== 'playing' || gameState.dealer.hand.some(c => c.isFaceDown)) {
            return;
        }

        let currentHand = [...gameState.dealer.hand];
        let currentDeck = [...gameState.deck];
        const { value: handValue, isSoft } = getHandDetails(currentHand);

        if (handValue < 17 || (handValue === 17 && isSoft)) {
            const timer = setTimeout(() => {
                const { newDeck, newHand } = dealCard(currentDeck, currentHand);
                setGameState(prev => prev ? {...prev, dealer: {hand: newHand}, deck: newDeck} : null);
            }, 800);
            return () => clearTimeout(timer);
        } else {
            calculatePayouts(gameState);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gameState?.dealer.hand, gamePhase]);


    const calculatePayouts = useCallback((finalState: GameState) => {
        setIsPayoutPhase(true);
        const dealerValue = getHandValue(finalState.dealer.hand);
        const dealerIsBusted = dealerValue > 21;
        const dealerHasBlackjack = dealerValue === 21 && finalState.dealer.hand.length === 2;

        const updatedPlayers = finalState.players.map(player => {
            if (player.outcome) return player; 

            let outcome: Player['outcome'] = 'loss';
            const playerValue = getHandValue(player.hand);
            
            if (player.hasTakenEvenMoney) {
                outcome = 'evenMoney';
            } else if (player.hasBlackjack) {
                outcome = dealerHasBlackjack ? 'push' : 'blackjack';
            } else if (player.isBusted) {
                outcome = 'loss';
            } else if (dealerIsBusted) {
                outcome = 'win';
            } else if (playerValue > dealerValue) {
                outcome = 'win';
            } else if (playerValue === dealerValue) {
                outcome = 'push';
            }
            return { ...player, outcome };
        });

        setGameState(prev => prev ? {...prev, players: updatedPlayers} : null);
        setTimeout(() => {
            if (payoutConfig) {
                setupBettingPhase(payoutConfig);
                setGamePhase('betting');
            }
        }, 4000);
    }, [payoutConfig, setupBettingPhase]);

    if (gamePhase === 'level_select') {
        return (
            <div className="text-center">
                <h2 className="text-3xl font-bold mb-2 text-slate-100">Step 1: Select Challenge Level</h2>
                <p className="text-slate-400 mb-8">Choose your training focus. Each level introduces new strategic decisions.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div onClick={() => setGamePhase('tutorial')} className="bg-slate-700 rounded-lg p-6 text-center hover:bg-slate-600 transition-all transform hover:-translate-y-1 cursor-pointer shadow-lg border-2 border-transparent hover:border-sky-400 col-span-1 sm:col-span-2 lg:col-span-3">
                        <div className="flex justify-center items-center gap-3">
                            <TutorialIcon />
                            <h3 className="text-2xl font-bold text-sky-300">New? Start Here!</h3>
                        </div>
                        <p className="text-slate-400 mt-2 text-sm">Take a guided tour of the trainer and learn the basics of Blackjack.</p>
                    </div>
                    <div onClick={() => handleLevelSelect(1)} className="bg-slate-700 rounded-lg p-6 text-center hover:bg-slate-600 transition-all transform hover:-translate-y-1 cursor-pointer shadow-lg border-2 border-transparent hover:border-amber-400">
                        <h3 className="text-2xl font-bold text-amber-300">Level 1: Fundamentals</h3>
                        <p className="text-slate-400 mt-2 text-sm">Master the core decisions of Hit and Stand.</p>
                    </div>
                    <div onClick={() => handleLevelSelect(2)} className="bg-slate-700 rounded-lg p-6 text-center hover:bg-slate-600 transition-all transform hover:-translate-y-1 cursor-pointer shadow-lg border-2 border-transparent hover:border-amber-400">
                        <h3 className="text-2xl font-bold text-amber-300">Level 2: Doubling Down</h3>
                        <p className="text-slate-400 mt-2 text-sm">Learn the optimal moments to Double Down for maximum value.</p>
                    </div>
                    <div onClick={() => handleLevelSelect(3)} className="bg-slate-700 rounded-lg p-6 text-center hover:bg-slate-600 transition-all transform hover:-translate-y-1 cursor-pointer shadow-lg border-2 border-transparent hover:border-amber-400">
                        <h3 className="text-2xl font-bold text-amber-300">Level 3: Splitting Pairs</h3>
                        <p className="text-slate-400 mt-2 text-sm">Understand the strategic advantage of Splitting pairs.</p>
                    </div>
                    <div onClick={() => handleLevelSelect(4)} className="bg-slate-700 rounded-lg p-6 text-center hover:bg-slate-600 transition-all transform hover:-translate-y-1 cursor-pointer shadow-lg border-2 border-transparent hover:border-amber-400">
                        <h3 className="text-2xl font-bold text-amber-300">Level 4: Insurance & Even Money</h3>
                        <p className="text-slate-400 mt-2 text-sm">Practice making the correct call when the dealer shows an Ace.</p>
                    </div>
                    <div onClick={() => handleLevelSelect(5)} className="bg-slate-700 rounded-lg p-6 text-center hover:bg-slate-600 transition-all transform hover:-translate-y-1 cursor-pointer shadow-lg border-2 border-transparent hover:border-amber-400">
                        <h3 className="text-2xl font-bold text-amber-300">Level 5: Full Sim</h3>
                        <p className="text-slate-400 mt-2 text-sm">A full simulation handling any scenario: splits, doubles, and insurance.</p>
                    </div>
                    <div onClick={() => handleLevelSelect(6)} className="bg-slate-700 rounded-lg p-6 text-center hover:bg-slate-600 transition-all transform hover:-translate-y-1 cursor-pointer shadow-lg border-2 border-transparent hover:border-amber-400">
                        <h3 className="text-2xl font-bold text-amber-300">Level 6: Surrender</h3>
                        <p className="text-slate-400 mt-2 text-sm">Know when to fold 'em. Practice the strategic art of Surrender.</p>
                    </div>
                </div>
            </div>
        );
    }

    if (gamePhase === 'tutorial') {
        return <Tutorial onExit={() => setGamePhase('level_select')} />;
    }
    
    if (gamePhase === 'payout_config') {
         return (
            <div className="text-center">
                <h2 className="text-3xl font-bold mb-2 text-slate-100">Step 2: Configure Payout Rules</h2>
                <p className="text-slate-400 mb-8">Set the Blackjack payout rules for the table.</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div onClick={() => handleStartGame('3:2')} className="bg-slate-700 rounded-lg p-6 text-center hover:bg-slate-600 transition-all transform hover:-translate-y-1 cursor-pointer shadow-lg border-2 border-transparent hover:border-amber-400">
                        <h3 className="text-2xl font-bold text-amber-300">All 3:2</h3>
                        <p className="text-slate-400 mt-2 text-sm">All players receive the standard 3:2 payout for Blackjack.</p>
                    </div>
                    <div onClick={() => handleStartGame('6:5')} className="bg-slate-700 rounded-lg p-6 text-center hover:bg-slate-600 transition-all transform hover:-translate-y-1 cursor-pointer shadow-lg border-2 border-transparent hover:border-amber-400">
                        <h3 className="text-2xl font-bold text-amber-300">All 6:5</h3>
                        <p className="text-slate-400 mt-2 text-sm">All players receive a 6:5 payout for Blackjack.</p>
                    </div>
                    <div onClick={() => handleStartGame('mixed')} className="bg-slate-700 rounded-lg p-6 text-center hover:bg-slate-600 transition-all transform hover:-translate-y-1 cursor-pointer shadow-lg border-2 border-transparent hover:border-amber-400">
                        <h3 className="text-2xl font-bold text-amber-300">Mixed Table</h3>
                        <p className="text-slate-400 mt-2 text-sm">A random mix of 3:2 and 6:5 payouts at the table.</p>
                    </div>
                </div>
                <button onClick={() => setGamePhase('level_select')} className="mt-8 px-4 py-2 bg-slate-600 hover:bg-slate-500 rounded-lg font-semibold">Back to Level Select</button>
            </div>
        );
    }
    
    if (gamePhase === 'side_bet_config') {
        const SideBetToggleCard: React.FC<{
            title: string;
            description: string;
            payouts: string[];
            isActive: boolean;
            onToggle: () => void;
        }> = ({ title, description, payouts, isActive, onToggle }) => (
            <div 
                onClick={onToggle}
                className={`rounded-lg p-6 text-center transition-all transform hover:-translate-y-1 cursor-pointer shadow-lg border-2 ${isActive ? 'bg-slate-600 border-amber-400' : 'bg-slate-700 border-transparent hover:border-slate-500'}`}
            >
                <h3 className={`text-2xl font-bold ${isActive ? 'text-amber-300' : 'text-slate-200'}`}>{title}</h3>
                <p className="text-slate-400 mt-2 text-sm h-12">{description}</p>
                <div className="mt-4 text-left text-xs text-slate-300 bg-slate-800 p-2 rounded">
                    <p className="font-bold mb-1">PAYS ON:</p>
                    {payouts.map(p => <p key={p}>{p}</p>)}
                </div>
            </div>
        );

        return (
            <div className="text-center">
                <h2 className="text-3xl font-bold mb-2 text-slate-100">Step 3: Add Side Bets (Optional)</h2>
                <p className="text-slate-400 mb-8">Enable side bets for the trainee player's position.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                    <SideBetToggleCard 
                        title="21+3"
                        description="Bet on whether your first two cards and the dealer's up-card form a 3-card poker hand."
                        payouts={["Straight Flush - 40:1", "Three of a Kind - 30:1", "Straight - 10:1", "Flush - 5:1"]}
                        isActive={sideBetConfig['21+3']}
                        onToggle={() => setSideBetConfig(prev => ({ ...prev, '21+3': !prev['21+3'] }))}
                    />
                    <SideBetToggleCard 
                        title="Perfect Pairs"
                        description="Bet on whether your first two cards are a pair."
                        payouts={["Perfect Pair - 25:1", "Colored Pair - 12:1", "Mixed Pair - 6:1"]}
                        isActive={sideBetConfig.perfectPairs}
                        onToggle={() => setSideBetConfig(prev => ({ ...prev, perfectPairs: !prev.perfectPairs }))}
                    />
                </div>
                <div className="flex justify-center gap-4 mt-8">
                     <button onClick={() => setGamePhase('payout_config')} className="px-6 py-3 bg-slate-600 hover:bg-slate-500 rounded-lg font-semibold">Back</button>
                    <button onClick={() => handleSideBetsSelected(sideBetConfig)} className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-lg font-bold text-xl">
                        Continue to Betting
                    </button>
                </div>
            </div>
        );
    }

    if (!gameState) {
        return <div className="text-center text-2xl font-bold">Loading Trainer...</div>;
    }

    const isDealDisabled = gameState.players.some(p => !!p.betError || (!p.isAuto && p.bet < 5));
    
    return (
        <div className="w-full flex flex-col items-center">
            {showRules && <GameRules onClose={() => setShowRules(false)} />}
            <div className="w-full mb-4 flex justify-between items-center">
                <StatsTracker stats={stats} />
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => setShowRules(true)} 
                        className="flex items-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-500 rounded-lg font-semibold"
                        aria-label="View Game Rules"
                    >
                        <TutorialIcon />
                        <span>Game Rules</span>
                    </button>
                    <button 
                        onClick={resetTraining} 
                        className="px-4 py-2 bg-rose-700 hover:bg-rose-600 rounded-lg font-semibold"
                        aria-label="End Session"
                    >
                        End Session
                    </button>
                </div>
            </div>
            
            <div className="relative w-full">
                {showDealerTurnBanner && (
                    <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center z-20 rounded-3xl">
                        <div className="text-4xl font-bold text-white tracking-widest animate-pulse">
                            DEALER'S TURN
                        </div>
                    </div>
                )}
                <GameBoard 
                    gameState={gameState}
                    gamePhase={gamePhase}
                    onHit={(id) => handlePlayerAction('hit', id)}
                    onStand={(id) => handlePlayerAction('stand', id)}
                    onDoubleDown={(id) => handlePlayerAction('double', id)}
                    onSplit={(id) => handlePlayerAction('split', id)}
                    onSurrender={(id) => handlePlayerAction('surrender', id)}
                    onAcceptInsurance={(id) => handlePlayerAction('acceptInsurance', id)}
                    onDeclineInsurance={(id) => handlePlayerAction('declineInsurance', id)}
                    onAcceptEvenMoney={(id) => handlePlayerAction('acceptEvenMoney', id)}
                    onDeclineEvenMoney={(id) => handlePlayerAction('declineEvenMoney', id)}
                    onEndRound={handleEndRound}
                    onDeal={handleDeal}
                    onBetChange={handleBetChange}
                    onSideBetChange={handleSideBetChange}
                    onTipChange={handleTipChange}
                    sideBetConfig={sideBetConfig}
                    currentPlayerId={currentPlayerId}
                    isPayoutPhase={isPayoutPhase}
                    isDealDisabled={isDealDisabled}
                />
            </div>

            <div className="mt-6 text-center h-20 flex flex-col items-center justify-center">
                 {isLoading && !feedback && <div className="w-8 h-8 border-4 border-t-transparent border-slate-400 border-solid rounded-full animate-spin"></div>}
                 <ActionFeedback feedback={feedback} />
            </div>
        </div>
    );
};


type View = 'trainer' | 'counting' | 'payout' | 'groove' | 'hit_stand' | 'virginia_rules' | 'dealer_talk' | 'audition';

const OfflineBanner = () => (
    <div className="w-full bg-amber-600 text-center py-2 text-white font-semibold text-sm -mx-4 -mt-4 sm:-mx-6 sm:-mt-6 mb-4">
        You are currently offline. AI-powered features are unavailable.
    </div>
);

function App() {
  const [view, setView] = useState<View>('trainer');
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const renderView = () => {
    switch (view) {
      case 'trainer':
        return <BlackjackTrainer />;
      case 'counting':
        return <CardCountingPractice />;
      case 'hit_stand':
        return <HitStandPractice />;
      case 'payout':
        return <ChipPayoutPractice />;
      case 'groove':
        return <BeProSiseGroove />;
      case 'virginia_rules':
        return <VirginiaRules />;
      case 'dealer_talk':
        return <DealerTalkPractice />;
      case 'audition':
        return <AuditionPractice />;
      default:
        return <BlackjackTrainer />;
    }
  };

  return (
    <div className="bg-slate-900 text-white min-h-screen flex font-sans">
      <Sidebar currentView={view} setView={setView} />
      
      <div className="flex-grow flex flex-col p-4 sm:p-6 overflow-y-auto">
        {!isOnline && <OfflineBanner />}
        <header className="w-full max-w-7xl mb-6 text-center">
            <h1 className="text-4xl sm:text-5xl font-bold text-slate-200 tracking-wider" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
            Be Pro Sise Blackjack Trainer
            </h1>
            <p className="text-slate-400 mt-2 text-lg">Legacy-Grade Training for the Modern Dealer.</p>
        </header>
        
        <main className="w-full max-w-7xl flex flex-col items-center flex-grow">
            <div className="w-full bg-slate-800 p-4 sm:p-6 rounded-lg shadow-2xl border-4 border-slate-700 flex-grow">
            {renderView()}
            </div>
        </main>

        <footer className="w-full max-w-7xl mt-8 text-center text-slate-500 text-sm flex-shrink-0">
            <p>This application is for educational and training purposes only. Remember to gamble responsibly.</p>
            <p>&copy; 2024 Blackjack Trainer Pro. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}

export default App;
