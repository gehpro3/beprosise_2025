
import React from 'react';

interface StatsTrackerProps {
    stats: {
        correct: number;
        incorrect: number;
    };
}

const StatsTracker: React.FC<StatsTrackerProps> = ({ stats }) => {
    const total = stats.correct + stats.incorrect;
    const accuracy = total > 0 ? ((stats.correct / total) * 100).toFixed(1) : '100.0';

    return (
        <div className="bg-gray-800 bg-opacity-70 p-4 rounded-lg shadow-lg border border-gray-700 flex justify-around items-center text-center">
            <div className="px-4">
                <div className="text-sm font-medium text-gray-400 uppercase tracking-wider">Correct Actions</div>
                <div className="text-3xl font-bold text-green-400">{stats.correct}</div>
            </div>
            <div className="px-4 border-l border-r border-gray-600">
                <div className="text-sm font-medium text-gray-400 uppercase tracking-wider">Incorrect Actions</div>
                <div className="text-3xl font-bold text-red-400">{stats.incorrect}</div>
            </div>
            <div className="px-4">
                <div className="text-sm font-medium text-gray-400 uppercase tracking-wider">Accuracy</div>
                <div className="text-3xl font-bold text-blue-400">{accuracy}%</div>
            </div>
        </div>
    );
};

export default StatsTracker;
