import { Audio } from "expo-av";

let popSound: Audio.Sound | null = null;

async function loadPop() {
  if (popSound) return popSound;
  try {
    const { sound } = await Audio.Sound.createAsync(
      require("@/assets/sounds/pop.wav"),
      { shouldPlay: false, volume: 0.3 }
    );
    popSound = sound;
    return sound;
  } catch (e) {
    console.warn("Failed to load pop sound:", e);
    return null;
  }
}

export async function playPop() {
  try {
    const sound = await loadPop();
    if (sound) {
      await sound.replayAsync();
    }
  } catch (e) {
    // Silent fail — sound is optional
  }
}
