import React from 'react';

interface BasicStrategyChartProps {
    onClose: () => void;
}

const dealerCards = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'A'];
const hardTotals = {
    '17-21': ['S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S'],
    '16':    ['S', 'S', 'S', 'S', 'S', 'H', 'H', 'Sr', 'Sr', 'Sr'],
    '15':    ['S', 'S', 'S', 'S', 'S', 'H', 'H', 'H', 'Sr', 'H'],
    '14':    ['S', 'S', 'S', 'S', 'S', 'H', 'H', 'H', 'H', 'H'],
    '13':    ['S', 'S', 'S', 'S', 'S', 'H', 'H', 'H', 'H', 'H'],
    '12':    ['H', 'H', 'S', 'S', 'S', 'H', 'H', 'H', 'H', 'H'],
    '11':    ['D', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'D'],
    '10':    ['D', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'H', 'H'],
    '9':     ['H', 'D', 'D', 'D', 'D', 'H', 'H', 'H', 'H', 'H'],
    '5-8':   ['H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H'],
};
const softTotals = {
    'A,9':   ['S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S'],
    'A,8':   ['S', 'S', 'S', 'S', 'Ds', 'S', 'S', 'S', 'S', 'S'],
    'A,7':   ['Ds', 'Ds', 'Ds', 'Ds', 'Ds', 'S', 'S', 'H', 'H', 'H'],
    'A,6':   ['H', 'D', 'D', 'D', 'D', 'H', 'H', 'H', 'H', 'H'],
    'A,5':   ['H', 'H', 'D', 'D', 'D', 'H', 'H', 'H', 'H', 'H'],
    'A,4':   ['H', 'H', 'D', 'D', 'D', 'H', 'H', 'H', 'H', 'H'],
    'A,2-A,3':['H', 'H', 'H', 'D', 'D', 'H', 'H', 'H', 'H', 'H'],
};
const pairs = {
    'A,A':   ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
    '10,10': ['S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S'],
    '9,9':   ['P', 'P', 'P', 'P', 'P', 'S', 'P', 'P', 'S', 'S'],
    '8,8':   ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
    '7,7':   ['P', 'P', 'P', 'P', 'P', 'P', 'H', 'H', 'H', 'H'],
    '6,6':   ['P', 'P', 'P', 'P', 'P', 'H', 'H', 'H', 'H', 'H'],
    '5,5':   ['D', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'H', 'H'],
    '4,4':   ['H', 'H', 'H', 'P', 'P', 'H', 'H', 'H', 'H', 'H'],
    '2,2-3,3':['P', 'P', 'P', 'P', 'P', 'P', 'H', 'H', 'H', 'H'],
};

const getCellStyle = (action: string) => {
    switch (action) {
        case 'H': return 'bg-emerald-600 text-white';
        case 'S': return 'bg-rose-600 text-white';
        case 'D': case 'Ds': return 'bg-sky-600 text-white';
        case 'P': return 'bg-amber-500 text-black';
        case 'Sr': return 'bg-slate-500 text-white';
        default: return 'bg-slate-800 text-slate-300';
    }
};

const ChartSection: React.FC<{ title: string, data: Record<string, string[]> }> = ({ title, data }) => (
    <>
        <tr>
            <th colSpan={11} className="text-center text-xl font-bold text-slate-200 p-3 bg-slate-900 border-b-2 border-slate-600">{title}</th>
        </tr>
        {Object.entries(data).map(([hand, actions]) => {
            return (
                <tr key={hand} className="border-b border-slate-700">
                    <td className="p-2 font-bold text-center bg-slate-800 text-amber-300">{hand}</td>
                    {/* Fix: Added an Array.isArray check to ensure `actions.map` is only called on an array, preventing a potential runtime error. */}
                    {Array.isArray(actions) && actions.map((action, index) => (
                        <td key={index} className={`p-2 font-bold text-center ${getCellStyle(action)}`}>
                            {action}
                        </td>
                    ))}
                </tr>
            );
        })}
    </>
);


const BasicStrategyChart: React.FC<BasicStrategyChartProps> = ({ onClose }) => {
    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50 p-4"
            onClick={onClose}
        >
            <div 
                className="bg-slate-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 relative border-2 border-slate-500"
                onClick={(e) => e.stopPropagation()}
            >
                 <button
                    onClick={onClose}
                    className="absolute top-2 right-2 text-slate-400 hover:text-white text-4xl font-bold"
                    aria-label="Close chart"
                >&times;</button>
                <h2 className="text-3xl font-bold text-slate-200 mb-4 text-center">Blackjack Basic Strategy</h2>
                <p className="text-center text-slate-400 mb-6">Dealer Hits Soft 17 | Surrender Offered</p>
                
                <table className="w-full text-left text-white border-collapse">
                    <thead>
                        <tr className="border-b-2 border-slate-500">
                            <th className="p-2 text-lg text-amber-300 bg-slate-900 text-center">Player</th>
                            {dealerCards.map(card => (
                                <th key={card} className="p-2 text-lg text-amber-300 bg-slate-900 text-center">Dealer {card}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        <ChartSection title="Hard Totals" data={hardTotals} />
                        <ChartSection title="Soft Totals" data={softTotals} />
                        <ChartSection title="Pairs" data={pairs} />
                    </tbody>
                </table>

                <div className="mt-6 flex justify-center flex-wrap gap-x-6 gap-y-2 text-sm">
                    <span className="font-bold"><span className="text-emerald-400">H</span> = Hit</span>
                    <span className="font-bold"><span className="text-rose-400">S</span> = Stand</span>
                    <span className="font-bold"><span className="text-sky-400">D</span> = Double if allowed, else Hit</span>
                    <span className="font-bold"><span className="text-sky-400">Ds</span> = Double if allowed, else Stand</span>
                    <span className="font-bold"><span className="text-amber-400">P</span> = Split</span>
                    <span className="font-bold"><span className="text-slate-400">Sr</span> = Surrender if allowed, else Hit</span>
                </div>
            </div>
        </div>
    );
};

export default BasicStrategyChart;
