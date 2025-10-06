import React from 'react';

interface ActionFeedbackProps {
    feedback: { message: string; type: 'success' | 'error' } | null;
}

const ActionFeedback: React.FC<ActionFeedbackProps> = ({ feedback }) => {
    if (!feedback) return null;

    const baseStyle = "px-6 py-3 my-4 text-lg font-bold rounded-lg shadow-md transition-opacity duration-300";
    const successStyle = "bg-emerald-500 text-white";
    const errorStyle = "bg-rose-600 text-white";

    const style = feedback.type === 'success' ? `${baseStyle} ${successStyle}` : `${baseStyle} ${errorStyle}`;

    return (
        <div className={style} dangerouslySetInnerHTML={{ __html: feedback.message }} />
    );
};

export default ActionFeedback;