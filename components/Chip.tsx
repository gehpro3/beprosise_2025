import React from 'react';

interface ChipProps {
    value: number;
}

const Chip: React.FC<ChipProps> = ({ value }) => {
    const chipStyles: { [key: string]: { bg: string; text: string; border: string } } = {
        '0.5': { bg: 'bg-pink-500', text: 'text-white', border: 'border-pink-300' },
        '1': { bg: 'bg-white', text: 'text-gray-700', border: 'border-gray-400' },
        '5': { bg: 'bg-red-600', text: 'text-white', border: 'border-red-400' },
        '25': { bg: 'bg-green-600', text: 'text-white', border: 'border-green-400' },
        '100': { bg: 'bg-black', text: 'text-white', border: 'border-gray-300' },
        '500': { bg: 'bg-purple-600', text: 'text-white', border: 'border-purple-400' },
    };
    
    const edgeColors: { [key: string]: string } = {
        '0.5': 'bg-pink-700',
        '1': 'bg-gray-300',
        '5': 'bg-red-800',
        '25': 'bg-green-800',
        '100': 'bg-gray-800',
        '500': 'bg-purple-800',
    };

    const style = chipStyles[String(value)] || { bg: 'bg-gray-500', text: 'text-white', border: 'border-gray-400' };
    const edgeColor = edgeColors[String(value)] || 'bg-gray-700';
    const text = value === 0.5 ? '50¢' : `$${value}`;

    return (
        <div className={`w-12 h-12 rounded-full p-0.5 transition-transform hover:scale-110 ${edgeColor} shadow-lg`}>
            <div className={`w-full h-full rounded-full flex items-center justify-center font-bold text-sm ${style.bg} ${style.text} border-2 ${style.border}`}>
                {text}
            </div>
        </div>
    );
};

export default Chip;