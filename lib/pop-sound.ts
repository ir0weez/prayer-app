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
