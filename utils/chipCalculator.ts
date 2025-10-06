const denominations = [500, 100, 25, 5, 1, 0.5];

/**
 * Calculates the chip denominations for a given amount.
 * @param amount The total amount to be broken down into chips.
 * @returns An array of numbers, where each number is a chip denomination.
 */
export const calculateChips = (amount: number): number[] => {
    const chips: number[] = [];
    // Work with cents to avoid floating point issues
    let remainingAmountInCents = Math.round(amount * 100);

    if (remainingAmountInCents <= 0) {
        return [];
    }
    
    const denominationsInCents = denominations.map(d => Math.round(d * 100));

    for (let i = 0; i < denominationsInCents.length; i++) {
        const denomInCents = denominationsInCents[i];
        const originalDenom = denominations[i];
        
        while (remainingAmountInCents >= denomInCents) {
            chips.push(originalDenom);
            remainingAmountInCents -= denomInCents;
        }
    }
    
    // Sort to ensure smaller chips are on top when stacked visually
    return chips.sort((a, b) => b - a);
};
