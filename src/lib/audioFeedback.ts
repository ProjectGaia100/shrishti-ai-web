// Global Audio Feedback Utility
// Plays a subtle "click" sound on button interactions

type HapticType = "light" | "heavy" | "none";

let audioContext: AudioContext | null = null;

// Lazy-initialize AudioContext (must be triggered by user interaction)
const getAudioContext = (): AudioContext | null => {
  if (typeof window === "undefined") return null;
  
  if (!audioContext) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioContext = new AudioContextClass();
    }
  }
  
  // Resume if suspended (browsers require user interaction)
  if (audioContext?.state === "suspended") {
    audioContext.resume();
  }
  
  return audioContext;
};

export const playClickSound = (type: HapticType = "light") => {
  if (type === "none") return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    const now = ctx.currentTime;

    if (type === "heavy") {
      // Heavy "thud" sound
      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(180, now);
      oscillator.frequency.exponentialRampToValueAtTime(40, now + 0.15);
      
      gainNode.gain.setValueAtTime(0.4, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
      
      oscillator.start(now);
      oscillator.stop(now + 0.15);
    } else {
      // Light "click" sound - the one you liked
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(800, now);
      
      gainNode.gain.setValueAtTime(0.15, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
      
      oscillator.start(now);
      oscillator.stop(now + 0.08);
    }
  } catch (e) {
    // Silently fail - audio is non-critical
    console.debug("Audio feedback unavailable:", e);
  }
};

// Hook for easy integration with React components
export const useClickSound = (type: HapticType = "light") => {
  return () => playClickSound(type);
};
