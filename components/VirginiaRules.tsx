import React, { useState } from 'react';
import { getVirginiaRulesAdvice } from '../services/geminiService';

const VirginiaRules: React.FC = () => {
    const [question, setQuestion] = useState('');
    const [answer, setAnswer] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const exampleQuestions = [
        "What is the rule for splitting Aces in Virginia?",
        "Can I surrender my hand in Virginia casinos?",
        "Does the dealer hit or stand on soft 17?",
        "What are the limits for doubling down?",
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!question.trim() || isLoading) return;

        setIsLoading(true);
        setAnswer(null);
        setError(null);

        try {
            const response = await getVirginiaRulesAdvice(question);
            setAnswer(response);
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleExampleClick = (example: string) => {
        setQuestion(example);
    };

    return (
        <div className="w-full max-w-4xl flex flex-col items-center">
            <h2 className="text-3xl font-bold mb-2 text-gray-200">Ask Be Pro Sise: Virginia Live Casino Rules</h2>
            <p className="text-gray-400 mb-6 text-center">Have a question about a specific rule at a Virginia casino? Ask away.</p>
            
            <div className="w-full bg-gray-900/50 p-6 rounded-lg border border-gray-700">
                <form onSubmit={handleSubmit}>
                    <label htmlFor="rule-question" className="block text-lg font-semibold text-gray-300 mb-2">
                        Your Question
                    </label>
                    <textarea
                        id="rule-question"
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        placeholder="e.g., What's the payout for a 5-card charlie?"
                        className="w-full bg-gray-800 border-2 border-gray-600 rounded-lg text-white p-3 text-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
                        rows={3}
                        disabled={isLoading}
                    />
                    <div className="mt-3 mb-4">
                        <p className="text-sm text-gray-400 mb-2">Or try an example:</p>
                        <div className="flex flex-wrap gap-2">
                            {exampleQuestions.map((ex, index) => (
                                <button
                                    key={index}
                                    type="button"
                                    onClick={() => handleExampleClick(ex)}
                                    className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 font-semibold py-1 px-3 rounded-full transition-colors"
                                >
                                    {ex}
                                </button>
                            ))}
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={isLoading || !question.trim()}
                        className="w-full bg-gray-600 hover:bg-gray-500 text-white font-bold py-3 px-8 rounded-lg text-xl transition-transform transform hover:scale-105 shadow-lg disabled:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? 'Be Pro Sise is Thinking...' : 'Ask Be Pro Sise'}
                    </button>
                </form>
            </div>

            <div className="w-full mt-6">
                {isLoading && (
                    <div className="flex justify-center items-center p-6">
                        <div className="w-12 h-12 border-4 border-t-transparent border-gray-400 border-solid rounded-full animate-spin"></div>
                    </div>
                )}
                {error && (
                    <div className="bg-red-500/20 border border-red-500 text-red-300 p-4 rounded-lg">
                        <p className="font-bold">Error:</p>
                        <p>{error}</p>
                    </div>
                )}
                {answer && (
                    <div className="bg-gray-700/50 p-6 rounded-lg border border-gray-600 animate-fade-in">
                        <h3 className="text-2xl font-bold text-gray-300 mb-3">Be Pro Sise's Answer:</h3>
                        <div className="prose prose-invert max-w-none text-gray-300" style={{ whiteSpace: 'pre-wrap' }}>
                            {answer}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VirginiaRules;