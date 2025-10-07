// utils/speech.ts

let americanVoice: SpeechSynthesisVoice | null = null;

// Heuristic scoring to find the best available voice
const getVoiceScore = (voice: SpeechSynthesisVoice): number => {
    if (voice.lang !== 'en-US') return -1;

    let score = 0;
    const name = voice.name.toLowerCase();

    // Highest preference for known high-quality voices
    if (name.includes('google')) score += 10;
    if (name.includes('zira') || name.includes('david')) score += 8; // Windows high quality
    if (name === 'alex' || name === 'samantha') score += 10; // macOS high quality

    // Prefer network-based voices as they are often higher quality
    if (voice.localService === false) score += 5;
    
    // Slight preference for female/neutral voices for the "Ginia" persona
    if (!name.includes('male')) score += 2;

    // Default voice is often a good choice
    if (voice.default) score += 1;

    return score;
};


// Function to load voices and find the best US English one.
const loadVoices = () => {
    try {
        if (!('speechSynthesis' in window)) return;
        const voices = window.speechSynthesis.getVoices();
        if (!voices || voices.length === 0) {
            // Voices may load asynchronously. If they are not ready, we'll try again when speak() is called.
            return;
        }

        const scoredVoices = voices
            .map(v => ({ voice: v, score: getVoiceScore(v) }))
            .filter(v => v.score >= 0)
            .sort((a, b) => b.score - a.score);

        if (scoredVoices.length > 0) {
            americanVoice = scoredVoices[0].voice;
        } else {
            // Fallback if no en-US voice was found after scoring
            americanVoice = voices.find(voice => voice.lang === 'en-US') || null;
        }
    } catch (error) {
        console.error("Error loading speech synthesis voices:", error);
    }
};

// Load voices initially and on the 'voiceschanged' event.
if ('speechSynthesis' in window && typeof window.speechSynthesis.onvoiceschanged !== 'undefined') {
    window.speechSynthesis.onvoiceschanged = loadVoices;
}
loadVoices(); // Initial attempt to load

/**
 * Speaks the given text using the browser's Speech Synthesis API.
 * @param text The text to be spoken.
 * @param isEnabled A boolean flag to enable or disable speech.
 * @param rate The speed of the speech (0.1 to 10). Defaults to a slightly slower rate for clarity.
 * @param pitch The pitch of the speech (0 to 2). Defaults to a natural-sounding pitch.
 */
export const speak = (text: string, isEnabled: boolean, rate = 0.95, pitch = 1.05) => {
    if (!isEnabled || !('speechSynthesis' in window) || !text) {
        return;
    }

    try {
        // Clean up any potential HTML tags and extra whitespace from the input text
        const cleanText = text.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();

        if (!cleanText) return;

        const utterance = new SpeechSynthesisUtterance(cleanText);

        // If voices weren't loaded yet, try again.
        if (!americanVoice && window.speechSynthesis.getVoices().length > 0) {
            loadVoices();
        }
        
        if (americanVoice) {
            utterance.voice = americanVoice;
        }
        
        utterance.rate = rate;
        utterance.pitch = pitch;
        
        // Cancel any ongoing speech before starting a new one to prevent overlap.
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
    } catch (error) {
        console.error("Speech synthesis failed:", error);
    }
};
