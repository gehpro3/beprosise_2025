import React, { useState, useEffect } from 'react';
import { Card as CardType, Suit } from '../types';

interface CardProps {
    card: CardType;
}

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

const Card: React.FC<CardProps> = ({ card }) => {
    const [isFaceUp, setIsFaceUp] = useState(!card.isFaceDown);

    useEffect(() => {
        const isNowFaceUp = !card.isFaceDown;

        // Use functional update to safely compare previous state
        setIsFaceUp(prevIsFaceUp => {
            // Play sound only when flipping from face-down to face-up
            if (!prevIsFaceUp && isNowFaceUp) {
                playSound('card-reveal-sound');
            }
            return isNowFaceUp;
        });
    }, [card.isFaceDown]);
    
    const color = card.suit === Suit.HEARTS || card.suit === Suit.DIAMONDS ? 'text-red-500' : 'text-black';

    return (
        <div className={`w-14 h-20 sm:w-16 sm:h-24 card-container ${isFaceUp ? 'is-flipped' : ''}`}>
            <div className="card-flipper">
                {/* Back of the card (visible when not flipped) */}
                <div className="card-back">
                    <div className="w-full h-full bg-red-800 rounded-lg border-2 border-white flex items-center justify-center shadow-lg">
                        <div className="w-11 h-[70px] sm:w-12 sm:h-20 rounded-md border-2 border-gray-400 flex items-center justify-center bg-red-700">
                            <div className="text-2xl sm:text-3xl text-white font-bold opacity-50">?</div>
                        </div>
                    </div>
                </div>

                {/* Front of the card (visible when flipped) */}
                <div className="card-front">
                    <div className="w-full h-full bg-white rounded-lg p-1 sm:p-2 flex flex-col justify-between shadow-xl border border-gray-200">
                        <div className={`text-left font-bold text-base sm:text-lg ${color}`}>
                            <div>{card.rank}</div>
                            <div>{card.suit}</div>
                        </div>
                        <div className={`text-center font-bold text-xl sm:text-2xl ${color}`}>
                            {card.suit}
                        </div>
                        <div className={`text-right font-bold text-base sm:text-lg ${color} transform rotate-180`}>
                            <div>{card.rank}</div>
                            <div>{card.suit}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Card;