import { useCallback, useMemo, useRef } from "react";

function beep(
  context: AudioContext,
  frequency: number,
  duration: number,
  type: OscillatorType,
  gainValue: number,
  delay = 0,
) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const start = context.currentTime + delay;
  const end = start + duration;

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(gainValue, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, end);

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(start);
  oscillator.stop(end);
}

export function usePixelAudio() {
  const contextRef = useRef<AudioContext | null>(null);
  const lastHitRef = useRef(0);

  const getContext = useCallback(() => {
    if (typeof window === "undefined") {
      return null;
    }

    if (!contextRef.current) {
      const AudioCtor = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtor) {
        return null;
      }
      contextRef.current = new AudioCtor();
    }

    if (contextRef.current.state === "suspended") {
      void contextRef.current.resume();
    }

    return contextRef.current;
  }, []);

  const playMineTick = useCallback(() => {
    const now = performance.now();
    if (now - lastHitRef.current < 110) {
      return;
    }
    lastHitRef.current = now;

    const context = getContext();
    if (!context) {
      return;
    }

    beep(context, 260, 0.06, "square", 0.04);
    beep(context, 180, 0.09, "triangle", 0.03, 0.01);
  }, [getContext]);

  const playBreak = useCallback(() => {
    const context = getContext();
    if (!context) {
      return;
    }

    beep(context, 220, 0.07, "square", 0.05);
    beep(context, 160, 0.08, "square", 0.04, 0.03);
    beep(context, 110, 0.12, "sawtooth", 0.03, 0.06);
  }, [getContext]);

  const playPlace = useCallback(() => {
    const context = getContext();
    if (!context) {
      return;
    }

    beep(context, 190, 0.05, "square", 0.035);
    beep(context, 260, 0.05, "triangle", 0.03, 0.02);
  }, [getContext]);

  return useMemo(
    () => ({
      playMineTick,
      playBreak,
      playPlace,
    }),
    [playBreak, playMineTick, playPlace],
  );
}
