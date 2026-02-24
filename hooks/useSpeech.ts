import { useCallback } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

export function useSpeech(isAudioEnabled: boolean) {
  const { language } = useLanguage();

  const speak = useCallback(
    (text: string) => {
      if (!isAudioEnabled) return;
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = language === 'vi' ? 'vi-VN' : 'en-US';
        utterance.rate = 1.0;
        window.speechSynthesis.speak(utterance);
      }
    },
    [isAudioEnabled, language]
  );

  const playShutterSound = useCallback(() => {
    if (!isAudioEnabled) return;
    const audio = new AudioContext();
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.connect(gain);
    gain.connect(audio.destination);
    osc.frequency.setValueAtTime(800, audio.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, audio.currentTime + 0.1);
    gain.gain.setValueAtTime(0.5, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audio.currentTime + 0.1);
    osc.start();
    osc.stop(audio.currentTime + 0.1);
  }, [isAudioEnabled]);

  return { speak, playShutterSound };
}
