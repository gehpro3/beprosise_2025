import React, { useEffect } from 'react';
import { speak } from '../utils/speech';

interface ActionFeedbackProps {
    feedback: { message: string; type: 'success' | 'error' } | null;
    isSpeechEnabled: boolean;
}

const ActionFeedback: React.FC<ActionFeedbackProps> = ({ feedback, isSpeechEnabled }) => {
    useEffect(() => {
        if (feedback?.message) {
            speak(feedback.message, isSpeechEnabled);
        }
    }, [feedback, isSpeechEnabled]);
    
    if (!feedback) return null;

    const baseStyle = "px-6 py-3 my-4 text-lg font-bold rounded-lg shadow-md transition-opacity duration-300";
    const successStyle = "bg-emerald-500 text-white";
    const errorStyle = "bg-rose-600 text-white";

    const style = feedback.type === 'success' ? `${baseStyle} ${successStyle}` : `${baseStyle} ${errorStyle}`;

    return (
        <div role="status" aria-live="polite" className={style} dangerouslySetInnerHTML={{ __html: feedback.message }} />
    );
};

export default ActionFeedback;
