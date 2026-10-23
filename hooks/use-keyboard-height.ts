import { useEffect, useState } from "react";
import { Keyboard, Platform } from "react-native";

/**
 * The software keyboard's current height in dp (0 when hidden).
 *
 * v196: the app's only keyboard pattern was KeyboardAvoidingView
 * with an iOS-only behavior — on Android it does nothing, and the
 * Journal's in-flow composer ended up UNDER the keyboard (Jonathan:
 * "I can't see what I'm typing…"). Screens that pin a bar above the
 * keyboard read this height and pad their container by it instead,
 * which works the same on both platforms.
 */
export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const onShow = Keyboard.addListener(showEvent, (event) => {
      setHeight(event.endCoordinates?.height ?? 0);
    });
    const onHide = Keyboard.addListener(hideEvent, () => setHeight(0));
    return () => {
      onShow.remove();
      onHide.remove();
    };
  }, []);

  return height;
}
