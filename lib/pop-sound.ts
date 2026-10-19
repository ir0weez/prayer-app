import { createAudioPlayer } from "expo-audio";

let popPlayer: ReturnType<typeof createAudioPlayer> | null = null;

function getPopPlayer() {
  if (popPlayer) return popPlayer;
  try {
    popPlayer = createAudioPlayer(require("@/assets/sounds/pop.wav"));
    popPlayer.volume = 0.3;
    return popPlayer;
  } catch (e) {
    console.warn("Failed to load pop sound:", e);
    return null;
  }
}

export async function playPop() {
  try {
    const p = getPopPlayer();
    if (p) {
      p.seekTo(0);
      p.play();
    }
  } catch (e) {
    // Silent fail — sound is optional
  }
}

let tickPlayer: ReturnType<typeof createAudioPlayer> | null = null;

function getTickPlayer() {
  if (tickPlayer) return tickPlayer;
  try {
    tickPlayer = createAudioPlayer(require("@/assets/sounds/tick.wav"));
    tickPlayer.volume = 0.25;
    return tickPlayer;
  } catch (e) {
    console.warn("Failed to load tick sound:", e);
    return null;
  }
}

/** Subtle tick for hover/selection movement — e.g. sliding across options. */
export async function playTick() {
  try {
    const p = getTickPlayer();
    if (p) {
      p.seekTo(0);
      p.play();
    }
  } catch (e) {
    // Silent fail — sound is optional
  }
}
