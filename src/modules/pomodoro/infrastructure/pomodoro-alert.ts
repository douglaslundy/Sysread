let audioContext: AudioContext | null = null;

function context() {
  if (typeof window === "undefined") return null;
  const AudioContextClass = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return null;
  audioContext ??= new AudioContextClass();
  return audioContext;
}

export async function unlockPomodoroSound() {
  const audio = context();
  if (audio?.state === "suspended") await audio.resume().catch(() => undefined);
}

export async function playPomodoroAlert() {
  const audio = context();
  if (!audio) return false;
  try {
    if (audio.state === "suspended") await audio.resume();
    const start = audio.currentTime;
    [0, 0.24, 0.48].forEach((offset, index) => {
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.frequency.value = index === 2 ? 880 : 660;
      gain.gain.setValueAtTime(0.0001, start + offset);
      gain.gain.exponentialRampToValueAtTime(0.12, start + offset + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + offset + 0.16);
      oscillator.connect(gain).connect(audio.destination);
      oscillator.start(start + offset);
      oscillator.stop(start + offset + 0.18);
    });
    return true;
  } catch {
    return false;
  }
}
