import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { GameState, TraineeAction, Card, CueCategory, DealingSubCategory, PayoutSubCategory } from '../types';

// NOTE: Ensure process.env.API_KEY is configured in your environment
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

function formatHand(hand: Card[]): string {
    return hand.map(card => `${card.rank}${card.suit}`).join(', ');
}

/**
 * Gets Blackjack strategy advice from the Gemini model.
 * @param gameState The current state of the game.
 * @param playerId The ID of the player whose turn it is.
 * @param level The current challenge level.
 * @returns An object containing the recommended action and an explanation.
 */
export const getBlackjackAdvice = async (
    gameState: GameState,
    playerId: number | string,
    level: number
): Promise<{ recommendedAction: TraineeAction; explanation: string; }> => {
    
    const player = gameState.players.find(p => p.id === playerId);
    if (!player) {
        throw new Error("Player not found");
    }

    const dealerUpCard = gameState.dealer.hand.find(card => !card.isFaceDown);
    if (!dealerUpCard) {
        throw new Error("Dealer up-card not found");
    }

    const isInsuranceDecision = !!gameState.isInsuranceOffered && !player.hasBlackjack;
    const isEvenMoneyDecision = player.hasBlackjack && dealerUpCard.rank === 'A';

    let systemInstruction = `You are "Be Pro Sise," an expert Blackjack strategy AI with a distinct persona. Your personality is that of a top-tier casino dealer: effortlessly cool, genuinely funny, and keenly attentive. You've seen it all on the casino floor, and now you're here to train the best.
Your role is to analyze a player's hand against the dealer's up-card and recommend the single best action according to Basic Strategy.
Deliver your explanation in the Be Pro Sise voice: be professional but witty, encouraging, and always on point. Think of yourself as the cool mentor dealer who makes learning the ropes fun.
The game rules are: ${gameState.rules}.
You must respond in JSON format.`;
    
    let prompt: string;
    let responseSchema: any;
    let validActions: TraineeAction[];

    if (isEvenMoneyDecision) {
        systemInstruction += ` You must advise on whether to take Even Money. Even Money is functionally the same as taking Insurance on a Blackjack—it's a side bet with a negative expected value. For this simulation, always recommend declining Even Money to maximize long-term value.`;
        prompt = `The player has Blackjack, and the dealer is showing an Ace. Based on Basic Strategy, should the player take Even Money?`;
        responseSchema = {
            type: Type.OBJECT,
            properties: {
                recommendedAction: { type: Type.STRING, description: "The single best action: 'acceptEvenMoney' or 'declineEvenMoney'." },
                explanation: { type: Type.STRING, description: "A brief explanation for why Even Money should be declined." }
            },
            required: ["recommendedAction", "explanation"]
        };
        validActions = ['acceptEvenMoney', 'declineEvenMoney'];
    } else if (isInsuranceDecision) {
        systemInstruction += ` You must advise on whether to take Insurance. According to Basic Strategy, Insurance is a side bet with a negative expected value and should almost always be declined. For this simulation, always recommend declining insurance.`;
        prompt = `The dealer is showing an Ace. Based on Basic Strategy, should the player take Insurance?`;
        responseSchema = {
            type: Type.OBJECT,
            properties: {
                recommendedAction: { type: Type.STRING, description: "The single best action: 'acceptInsurance' or 'declineInsurance'." },
                explanation: { type: Type.STRING, description: "A brief explanation for why insurance should be declined." }
            },
            required: ["recommendedAction", "explanation"]
        };
        validActions = ['acceptInsurance', 'declineInsurance'];
    } else {
        systemInstruction += ` The possible actions are: 'hit', 'stand', 'double', 'split', or 'surrender'.
If doubling down is not an option for the player, recommend 'hit' or 'stand' instead if appropriate.
If splitting is not an option, recommend 'hit' or 'stand' based on the hand's total value.`;
        
        switch(level) {
            case 2:
                systemInstruction += ` The player is currently training on Doubling Down. Focus your explanation on why this hand is a good candidate for doubling down against the dealer's up-card.`;
                break;
            case 3:
                systemInstruction += ` The player is currently training on Splitting Pairs. Focus your explanation on the strategic reasons for splitting (or not splitting) this particular pair against the dealer's up-card.`;
                break;
            case 4:
                systemInstruction += ` The player has just made an Insurance decision. Now, provide the standard basic strategy advice for their hand.`;
                break;
            case 5:
                systemInstruction += ` This is a comprehensive simulation. Provide clear, standard basic strategy advice for the player's situation.`;
                break;
            case 6:
                systemInstruction += ` The player is currently training on Surrender. Focus your explanation on why surrendering is or is not the correct strategic move in this specific situation against the dealer's up-card.`;
                break;
        }

        prompt = `
Player's hand: ${formatHand(player.hand)}
Dealer's up-card: ${formatHand([dealerUpCard])}

Based on Basic Strategy, what is the single best action for the player?
Available actions for this player:
- Hit: ${player.canHit}
- Stand: ${player.canStand}
- Double Down: ${player.canDoubleDown}
- Split: ${player.canSplit}
- Surrender: ${player.canSurrender}
`;
        responseSchema = {
            type: Type.OBJECT,
            properties: {
                recommendedAction: { type: Type.STRING, description: "The single best action: 'hit', 'stand', 'double', 'split', or 'surrender'." },
                explanation: { type: Type.STRING, description: "A brief explanation for the recommended action based on Basic Strategy." }
            },
            required: ["recommendedAction", "explanation"]
        };
        validActions = ['hit', 'stand', 'double', 'split', 'surrender'];
    }

    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema,
            },
        });

        const jsonText = response.text.trim();
        const result = JSON.parse(jsonText);
        
        if (!result.recommendedAction || !validActions.includes(result.recommendedAction.toLowerCase() as TraineeAction)) {
             throw new Error("Invalid action recommended by AI.");
        }

        return {
            recommendedAction: result.recommendedAction.toLowerCase(),
            explanation: result.explanation
        };

    } catch (error) {
        console.error("Error getting advice from Gemini API:", error);
        throw new Error("Could not get advice from the AI. Please check your API key and network connection.");
    }
};

/**
 * Gets focused Hit/Stand advice from the Gemini model for the practice mode.
 * @param playerHand The player's current hand.
 * @param dealerUpCard The dealer's visible card.
 * @returns An object containing the recommended action ('hit' or 'stand') and an explanation.
 */
export const getHitStandAdvice = async (
    playerHand: Card[],
    dealerUpCard: Card
): Promise<{ recommendedAction: 'hit' | 'stand'; explanation: string; }> => {
    
    const systemInstruction = `You are "Be Pro Sise," an expert Blackjack strategy AI with a distinct persona. Your personality is that of a top-tier casino dealer: effortlessly cool, genuinely funny, and keenly attentive. You've seen it all and now you're here to help master the fundamentals.
Your role is to analyze a player's hand against the dealer's up-card and recommend ONLY 'hit' or 'stand' according to Basic Strategy.
Ignore all other actions like splitting or doubling. Focus exclusively on the hit/stand decision.
Deliver your explanation in the Be Pro Sise voice: be professional but witty, encouraging, and razor-sharp with your advice.
You must respond in JSON format.`;
    
    const prompt = `Player's hand: ${formatHand(playerHand)}
Dealer's up-card: ${formatHand([dealerUpCard])}
Based on Basic Strategy, what is the correct action: 'hit' or 'stand'?`;

    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            recommendedAction: { type: Type.STRING, description: "The single best action: 'hit' or 'stand'." },
            explanation: { type: Type.STRING, description: "A brief explanation for the recommended action." }
        },
        required: ["recommendedAction", "explanation"]
    };

    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema,
            },
        });

        const jsonText = response.text.trim();
        const result = JSON.parse(jsonText);
        const action = result.recommendedAction.toLowerCase();

        if (action !== 'hit' && action !== 'stand') {
             throw new Error("Invalid action recommended by AI. Expected 'hit' or 'stand'.");
        }

        return {
            recommendedAction: action,
            explanation: result.explanation
        };

    } catch (error) {
        console.error("Error getting advice from Gemini API:", error);
        throw new Error("Could not get advice from the AI.");
    }
};


/**
 * Gets answers about Virginia live casino Blackjack rules.
 * @param question The user's question about the rules.
 * @returns A string containing the AI's answer.
 */
export const getVirginiaRulesAdvice = async (question: string): Promise<string> => {
    
    const systemInstruction = `You are "Be Pro Sise," an expert Blackjack strategy AI with a distinct persona. Your personality is that of a top-tier casino dealer: effortlessly cool, genuinely funny, and keenly attentive. You're the go-to expert for house rules.
Your role is to answer questions about live casino Blackjack rules as they are typically implemented in the state of Virginia.
Deliver your answers in the Be Pro Sise voice: be professional but witty and encouraging. Make learning the rules clear and fun.
Your answers should be accurate, clear, and concise. When a rule can vary between casinos in Virginia, you should mention the common variations. 
Do not provide gambling advice, only factual rule explanations. Keep your answers focused on the user's question.`;
    
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: question,
            config: {
                systemInstruction,
            },
        });

        return response.text;

    } catch (error) {
        console.error("Error getting advice from Gemini API:", error);
        throw new Error("Could not get an answer from the AI. Please check your API key and network connection.");
    }
};

/**
 * Gets dealer talk cues from the Gemini model for various scenarios.
 * @param category The type of scenario ('dealing', 'payout', 'change').
 * @param context Additional details about the scenario.
 * @returns A string containing the AI-generated dealer cue.
 */
export const getDealerTalkCue = async (
    category: CueCategory,
    context: { 
        bet?: number; 
        payout?: number; 
        paidWith?: number;
        dealingSubCategory?: DealingSubCategory;
        payoutSubCategory?: PayoutSubCategory;
    }
): Promise<string> => {
    
    const systemInstruction = `You are "Be Pro Sise," an expert Blackjack dealer trainer with a cool, funny, and attentive persona. Your task is to provide professional, concise, and friendly scripts that a dealer should say during specific casino scenarios. These are called "cues."
The script should be something a dealer would say out loud at the table. It must be clear for players, maintain game flow, and be efficient.
Do not include conversational intros like "Sure, here's a cue:". Just provide the script itself.`;

    let prompt = `Generate a dealer talk cue for the following scenario:\n`;

    if (category === 'dealing') {
        const subCategory = context.dealingSubCategory || 'initial_deal';
        switch (subCategory) {
            case 'initial_deal':
                prompt += `Scenario: Dealing the initial two cards to the players. The cue should be a general, welcoming, and professional line to start the round.`;
                break;
            case 'announce_bets':
                prompt += `Scenario: Announcing that betting is closed before dealing the cards. The cue should be a clear, standard phrase like "No more bets."`;
                break;
            case 'announce_bets_open':
                prompt += `Scenario: Announcing that betting is now open for a new round. The cue should be a clear, welcoming phrase to invite players to place their bets.`;
                break;
            case 'check_actions':
                prompt += `Scenario: Politely prompting a player for their decision when it is their turn to act.`;
                break;
            case 'announce_upcard':
                prompt += `Scenario: Announcing the dealer's own up-card after the initial deal is complete. For example, if the card is a King, the cue might be "Dealer has a King." or "Dealer shows a ten."`;
                break;
        }
    } else if (category === 'payout') {
        const subCategory = context.payoutSubCategory || 'win';
        prompt += `Scenario: Paying a winning player.\n`;
        prompt += `Bet: $${context.bet}\n`;
        prompt += `Outcome: ${subCategory}\n`;
        prompt += `Payout Amount: $${context.payout}\n`;
        prompt += `The cue should include announcing the win and the payout amount clearly.`;
        if (subCategory === 'blackjack') {
            prompt += ` Since it's a blackjack, add some extra positive flair.`;
        }
    } else if (category === 'change') {
        prompt += `Scenario: Making change for a player.\n`;
        prompt += `Bet: $${context.bet}\n`;
        prompt += `Player paid with: $${context.paidWith}\n`;
        prompt += `The cue should follow the standard procedure of announcing the amounts and counting the change back to the player.`;
    }

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                systemInstruction,
            },
        });

        return response.text.replace(/['"]+/g, '').trim(); // Clean up quotes from the response

    } catch (error) {
        console.error("Error getting cue from Gemini API:", error);
        throw new Error("Could not get a cue from the AI. Please check your API key and network connection.");
    }
};

/**
 * Evaluates a user's spoken dealer cue for a given scenario.
 * @param scenario A string describing the table situation.
 * @param userCue The cue spoken by the user.
 * @returns An object containing a boolean for correctness and an explanation.
 */
export const evaluateDealerTalkCue = async (
    scenario: string,
    userCue: string
): Promise<{ isCorrect: boolean; explanation: string; }> => {
    const systemInstruction = `You are "Be Pro Sise," an expert Blackjack dealer trainer AI. Your task is to evaluate a dealer's spoken cue for a given scenario.
A good cue is professional, concise, clear, and follows standard casino procedure.
You must determine if the user's cue is acceptable. Minor variations in wording are fine as long as the meaning is correct and the tone is professional.
Respond in JSON format with 'isCorrect' (boolean) and a brief 'explanation' for your decision.`;

    const prompt = `
Scenario: "${scenario}"
User's spoken cue: "${userCue}"

Is the user's cue an acceptable and professional thing for a dealer to say in this situation?`;

    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            isCorrect: { type: Type.BOOLEAN, description: "True if the user's cue is acceptable, false otherwise." },
            explanation: { type: Type.STRING, description: "A brief explanation for your evaluation." }
        },
        required: ["isCorrect", "explanation"]
    };

    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema,
            },
        });

        const jsonText = response.text.trim();
        const result = JSON.parse(jsonText);
        
        if (typeof result.isCorrect !== 'boolean' || typeof result.explanation !== 'string') {
             throw new Error("Invalid response format from AI.");
        }

        return result;

    } catch (error) {
        console.error("Error evaluating cue with Gemini API:", error);
        throw new Error("Could not get an evaluation from the AI.");
    }
};