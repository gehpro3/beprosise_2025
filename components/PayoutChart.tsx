import React from 'react';

export type PayoutChartMode = '6:5' | '3:2';

export const PayoutChart: React.FC<{ onClose: () => void; mode: PayoutChartMode }> = ({ onClose, mode }) => {
    const chartData: { bet: number; payout: number }[] = [];
    const payoutMultiplier = mode === '6:5' ? 1.2 : 1.5;
    const title = mode === '6:5' ? '6:5 Payout Reference Chart' : '3:2 Payout Reference Chart';

    // Generate a reasonable amount of data for the chart
    for (let i = 0; i < 100; i++) {
        const bet = 5 + (i * 5); // Bets like 5, 10, 15, ... 500
        chartData.push({ bet, payout: bet * payoutMultiplier });
    }

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50 p-4"
            onClick={onClose}
        >
            <div
                className="bg-gray-800 rounded-lg shadow-xl max-w-sm w-full max-h-[80vh] overflow-y-auto p-6 relative border-2 border-gray-500"
                onClick={(e) => e.stopPropagation()}
            >
                <h3 className="text-2xl font-bold text-gray-300 mb-4 text-center">{title}</h3>
                <button
                    onClick={onClose}
                    className="absolute top-2 right-2 text-gray-400 hover:text-white text-3xl font-bold"
                    aria-label="Close chart"
                >&times;</button>
                <table className="w-full text-left text-white">
                    <thead>
                        <tr className="border-b border-gray-600">
                            <th className="p-2 text-lg text-gray-300">Bet</th>
                            <th className="p-2 text-lg text-gray-300">Payout</th>
                        </tr>
                    </thead>
                    <tbody>
                        {chartData.map(({ bet, payout }) => (
                            <tr key={bet} className="border-b border-gray-700 hover:bg-gray-700/50">
                                <td className="p-2 font-mono">${bet}</td>
                                <td className="p-2 font-mono text-gray-300">${payout.toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default PayoutChart;
