// Pixel renditions of the meal-generic, park, and movie keyword scenes for the 8-bit skin (v183), mirroring the paper scenes' compositions in chunky squares, stepped motion only.
import { View } from "react-native";
import { PixelSceneRoot, Px, StepIn, StepBob, StepBlink, PxSun, PxCloud, PxFigure } from "@/components/pixel-kit";

export function PixelLunchScene() {
  return (
    <PixelSceneRoot base="#C98A2E">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "45%", backgroundColor: "#9A6420" }} />
      <StepIn delay={40} style={{ position: "absolute", left: "52%", bottom: 12, width: 128, height: 116 }}>
        <Px style={{ position: "absolute", left: 8, bottom: 0, width: 112, height: 20, backgroundColor: "#E8A94E" }} />
        <Px style={{ position: "absolute", left: 8, bottom: 20, width: 112, height: 16, backgroundColor: "#4E342E" }} />
        <Px style={{ position: "absolute", left: 4, bottom: 36, width: 120, height: 12, backgroundColor: "#FFD54F" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 48, width: 128, height: 16, backgroundColor: "#7CB342" }} />
        <Px style={{ position: "absolute", left: 12, bottom: 48, width: 104, height: 12, backgroundColor: "#E53935" }} />
        <Px style={{ position: "absolute", left: 8, bottom: 64, width: 112, height: 36, backgroundColor: "#F0BE6A" }} />
        <Px style={{ position: "absolute", left: 8, bottom: 100, width: 112, height: 12, backgroundColor: "#F0BE6A" }} />
        <Px style={{ position: "absolute", left: 32, bottom: 88, width: 8, height: 8, backgroundColor: "#FFF8E1" }} />
        <Px style={{ position: "absolute", left: 60, bottom: 92, width: 8, height: 8, backgroundColor: "#FFF8E1" }} />
        <Px style={{ position: "absolute", left: 84, bottom: 84, width: 8, height: 8, backgroundColor: "#FFF8E1" }} />
      </StepIn>
      <StepIn delay={140} style={{ position: "absolute", left: "68%", bottom: 12, width: 64, height: 88 }}>
        <Px style={{ position: "absolute", left: 12, bottom: 36, width: 12, height: 48, backgroundColor: "#FFD54F" }} />
        <Px style={{ position: "absolute", left: 28, bottom: 36, width: 12, height: 48, backgroundColor: "#FFD54F" }} />
        <Px style={{ position: "absolute", left: 44, bottom: 36, width: 12, height: 48, backgroundColor: "#FFCA28" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 64, height: 40, backgroundColor: "#D32F2F" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 20, width: 64, height: 8, backgroundColor: "#FFFFFF" }} />
      </StepIn>
      <StepBob left="77%" bottom={12} width={52} height={84} distance={4} period={1100}>
        <Px style={{ position: "absolute", left: 20, bottom: 64, width: 8, height: 20, backgroundColor: "#E53935" }} />
        <Px style={{ position: "absolute", left: 8, bottom: 0, width: 40, height: 68, backgroundColor: "#F8BBD0" }} />
        <Px style={{ position: "absolute", left: 8, bottom: 60, width: 40, height: 12, backgroundColor: "#FCE4EC" }} />
        <Px style={{ position: "absolute", left: 16, bottom: 68, width: 24, height: 16, backgroundColor: "#FFFFFF" }} />
      </StepBob>
    </PixelSceneRoot>
  );
}

export function PixelBurgerScene() {
  return (
    <PixelSceneRoot base="#6B4A3A">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "42%", backgroundColor: "#54382A" }} />
      <StepIn delay={30} style={{ position: "absolute", left: "54%", bottom: 4, width: 176, height: 176 }}>
        <Px style={{ position: "absolute", left: 24, bottom: 24, width: 128, height: 128, backgroundColor: "#EDE6D8" }} />
        <Px style={{ position: "absolute", left: 36, bottom: 36, width: 104, height: 104, backgroundColor: "#D8CBB2" }} />
        <Px style={{ position: "absolute", left: 48, bottom: 48, width: 80, height: 80, backgroundColor: "#EDE6D8" }} />
      </StepIn>
      <StepIn delay={130} style={{ position: "absolute", left: "58%", bottom: 60, width: 120, height: 104 }}>
        <Px style={{ position: "absolute", left: 12, bottom: 0, width: 96, height: 24, backgroundColor: "#E8B96A" }} shadow />
        <Px style={{ position: "absolute", left: 16, bottom: 24, width: 88, height: 16, backgroundColor: "#6B4226" }} />
        <Px style={{ position: "absolute", left: 12, bottom: 40, width: 96, height: 12, backgroundColor: "#F5D742" }} />
        <Px style={{ position: "absolute", left: 16, bottom: 52, width: 88, height: 12, backgroundColor: "#7BC043" }} />
        <Px style={{ position: "absolute", left: 20, bottom: 64, width: 80, height: 8, backgroundColor: "#E74C3C" }} />
        <Px style={{ position: "absolute", left: 12, bottom: 72, width: 96, height: 24, backgroundColor: "#F0C987" }} />
        <Px style={{ position: "absolute", left: 32, bottom: 84, width: 8, height: 8, backgroundColor: "#FFF8E7" }} />
        <Px style={{ position: "absolute", left: 56, bottom: 88, width: 8, height: 8, backgroundColor: "#FFF8E7" }} />
        <Px style={{ position: "absolute", left: 76, bottom: 84, width: 8, height: 8, backgroundColor: "#FFF8E7" }} />
      </StepIn>
      <StepIn delay={210} style={{ position: "absolute", left: "78%", bottom: 24, width: 52, height: 64 }}>
        <Px style={{ position: "absolute", left: 4, bottom: 12, width: 8, height: 48, backgroundColor: "#F2C14E" }} />
        <Px style={{ position: "absolute", left: 20, bottom: 12, width: 8, height: 52, backgroundColor: "#F2C14E" }} />
        <Px style={{ position: "absolute", left: 36, bottom: 12, width: 8, height: 44, backgroundColor: "#EFB93E" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 52, height: 12, backgroundColor: "#C0392B" }} />
      </StepIn>
    </PixelSceneRoot>
  );
}

export function PixelBreakfastScene() {
  return (
    <PixelSceneRoot base="#B85C1E">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "42%", backgroundColor: "#7A3E12" }} />
      <PxSun left="71%" bottom={60} size={32} color="#FFD54F" core="#FFE98A" ray="#FFC531" />
      <StepIn delay={60} style={{ position: "absolute", left: "64%", bottom: 12, width: 96, height: 80 }}>
        <Px style={{ position: "absolute", left: 12, bottom: 16, width: 60, height: 52, backgroundColor: "#FFF8E1" }} shadow />
        <Px style={{ position: "absolute", left: 20, bottom: 56, width: 44, height: 16, backgroundColor: "#4E342E" }} />
        <Px style={{ position: "absolute", left: 72, bottom: 32, width: 16, height: 20, backgroundColor: "#FFF8E1" }} />
        <Px style={{ position: "absolute", left: 76, bottom: 36, width: 8, height: 12, backgroundColor: "#B85C1E" }} />
        <Px style={{ position: "absolute", left: 4, bottom: 0, width: 84, height: 16, backgroundColor: "#F5EBD0" }} />
      </StepIn>
      <StepIn delay={150} style={{ position: "absolute", left: "50%", bottom: 8, width: 140, height: 72 }}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 140, height: 24, backgroundColor: "#FFF8E1" }} />
        <Px style={{ position: "absolute", left: 16, bottom: 16, width: 40, height: 40, backgroundColor: "#FFFFFF" }} />
        <Px style={{ position: "absolute", left: 28, bottom: 28, width: 16, height: 16, backgroundColor: "#FFB300" }} />
        <Px style={{ position: "absolute", left: 60, bottom: 16, width: 40, height: 40, backgroundColor: "#FFFFFF" }} />
        <Px style={{ position: "absolute", left: 72, bottom: 28, width: 16, height: 16, backgroundColor: "#FFB300" }} />
        <Px style={{ position: "absolute", left: 104, bottom: 20, width: 16, height: 44, backgroundColor: "#A93226" }} />
        <Px style={{ position: "absolute", left: 120, bottom: 20, width: 12, height: 44, backgroundColor: "#C0392B" }} />
      </StepIn>
    </PixelSceneRoot>
  );
}

export function PixelDinnerScene() {
  return (
    <PixelSceneRoot base="#4A2C17">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "40%", backgroundColor: "#2E1A0E" }} />
      <StepIn delay={50} style={{ position: "absolute", left: "42%", bottom: 16, width: 32, height: 88 }}>
        <Px style={{ position: "absolute", left: 4, bottom: 0, width: 24, height: 68, backgroundColor: "#FFF8E1" }} />
        <Px style={{ position: "absolute", left: 8, bottom: 68, width: 16, height: 20, backgroundColor: "#FFB300" }} />
      </StepIn>
      <StepIn delay={140} style={{ position: "absolute", left: "54%", bottom: 12, width: 156, height: 80 }}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 156, height: 28, backgroundColor: "#FFF8E1" }} shadow />
        <Px style={{ position: "absolute", left: 8, bottom: 20, width: 96, height: 52, backgroundColor: "#6D4C41" }} />
        <Px style={{ position: "absolute", left: 28, bottom: 28, width: 8, height: 36, backgroundColor: "#3E2723" }} />
        <Px style={{ position: "absolute", left: 52, bottom: 28, width: 8, height: 36, backgroundColor: "#3E2723" }} />
        <Px style={{ position: "absolute", left: 76, bottom: 28, width: 8, height: 36, backgroundColor: "#3E2723" }} />
        <Px style={{ position: "absolute", left: 104, bottom: 20, width: 44, height: 40, backgroundColor: "#C89B6A" }} />
        <Px style={{ position: "absolute", left: 116, bottom: 44, width: 16, height: 16, backgroundColor: "#FFD54F" }} />
        <Px style={{ position: "absolute", left: 132, bottom: 48, width: 12, height: 12, backgroundColor: "#FFFFFF" }} />
      </StepIn>
      <StepIn delay={220} style={{ position: "absolute", left: "73%", bottom: 16, width: 40, height: 80 }}>
        <Px style={{ position: "absolute", left: 8, bottom: 48, width: 24, height: 32, backgroundColor: "#F3E5F5" }} />
        <Px style={{ position: "absolute", left: 8, bottom: 52, width: 24, height: 20, backgroundColor: "#8E1F2F" }} />
        <Px style={{ position: "absolute", left: 16, bottom: 0, width: 8, height: 48, backgroundColor: "#F3E5F5" }} />
        <Px style={{ position: "absolute", left: 4, bottom: 0, width: 32, height: 8, backgroundColor: "#F3E5F5" }} />
      </StepIn>
    </PixelSceneRoot>
  );
}

export function PixelPhotoScene() {
  return (
    <PixelSceneRoot base="#4A3423">
      <View style={{ position: "absolute", left: "46%", right: 0, top: 0, bottom: 0, backgroundColor: "#5D4037" }} />
      <StepIn delay={40} style={{ position: "absolute", left: "62%", bottom: 72, width: 92, height: 64 }}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 92, height: 56, backgroundColor: "#3E2723" }} shadow />
        <Px style={{ position: "absolute", left: 0, bottom: 40, width: 92, height: 16, backgroundColor: "#4E342E" }} />
        <Px style={{ position: "absolute", left: 28, bottom: 52, width: 36, height: 12, backgroundColor: "#3E2723" }} />
        <Px style={{ position: "absolute", left: 28, bottom: 12, width: 36, height: 36, backgroundColor: "#212121" }} />
        <Px style={{ position: "absolute", left: 36, bottom: 20, width: 20, height: 20, backgroundColor: "#37474F" }} />
        <Px style={{ position: "absolute", left: 40, bottom: 24, width: 12, height: 12, backgroundColor: "#4FC3F7" }} />
        <Px style={{ position: "absolute", left: 72, bottom: 52, width: 8, height: 12, backgroundColor: "#6D4C41" }} />
      </StepIn>
      <StepBlink style={{ position: "absolute", left: "82%", bottom: 128, width: 16, height: 16 }} period={1100}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 16, height: 16, backgroundColor: "#FFFFFF" }} />
      </StepBlink>
      <StepIn delay={120} style={{ position: "absolute", left: "48%", bottom: 12, width: 52, height: 64 }}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 52, height: 64, backgroundColor: "#FAFAF5" }} />
        <Px style={{ position: "absolute", left: 8, bottom: 20, width: 36, height: 36, backgroundColor: "#81D4FA" }} />
      </StepIn>
      <StepIn delay={240} style={{ position: "absolute", left: "60%", bottom: 16, width: 52, height: 64 }}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 52, height: 64, backgroundColor: "#FAFAF5" }} />
        <Px style={{ position: "absolute", left: 8, bottom: 20, width: 36, height: 36, backgroundColor: "#A5D6A7" }} />
      </StepIn>
      <StepIn delay={360} style={{ position: "absolute", left: "72%", bottom: 12, width: 52, height: 64 }}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 52, height: 64, backgroundColor: "#FAFAF5" }} />
        <Px style={{ position: "absolute", left: 8, bottom: 20, width: 36, height: 36, backgroundColor: "#FFCC80" }} />
      </StepIn>
    </PixelSceneRoot>
  );
}

export function PixelTravelScene() {
  return (
    <PixelSceneRoot base="#3E8EBA">
      <PxSun left="82%" bottom={88} size={32} color="#FFD54F" core="#FFE98A" ray="#FFC531" />
      <Px style={{ position: "absolute", left: "58%", bottom: 0, width: 72, height: 36, backgroundColor: "#2C6E9E" }} />
      <Px style={{ position: "absolute", left: "58%", bottom: 36, width: 36, height: 20, backgroundColor: "#2C6E9E" }} />
      <Px style={{ position: "absolute", left: "74%", bottom: 0, width: 60, height: 28, backgroundColor: "#245E88" }} />
      <Px style={{ position: "absolute", left: "74%", bottom: 28, width: 28, height: 16, backgroundColor: "#245E88" }} />
      <PxCloud left="48%" top={16} width={68} color="#EAF4FF" shade="#C9DDF2" />
      <PxCloud left="70%" top={36} width={52} color="#EAF4FF" shade="#C9DDF2" />
      <StepBob left="56%" bottom={64} width={88} height={44} distance={4} period={1200}>
        <Px style={{ position: "absolute", left: 8, bottom: 16, width: 72, height: 8, backgroundColor: "#FFF8E1" }} shadow />
        <Px style={{ position: "absolute", left: 32, bottom: 24, width: 32, height: 16, backgroundColor: "#F5EBD0" }} />
        <Px style={{ position: "absolute", left: 4, bottom: 24, width: 16, height: 12, backgroundColor: "#F5EBD0" }} />
        <Px style={{ position: "absolute", left: 44, bottom: 16, width: 8, height: 8, backgroundColor: "#4FC3F7" }} />
        <Px style={{ position: "absolute", left: 56, bottom: 16, width: 8, height: 8, backgroundColor: "#4FC3F7" }} />
      </StepBob>
    </PixelSceneRoot>
  );
}

export function PixelChurchScene() {
  return (
    <PixelSceneRoot base="#3E6B8E">
      <PxSun left="76%" bottom={64} size={36} color="#FFD54F" core="#FFE98A" ray="#FFC531" />
      <PxCloud left="44%" top={12} width={68} color="#EAF4FF" shade="#C9DDF2" />
      <PxCloud left="66%" top={28} width={52} color="#EAF4FF" shade="#C9DDF2" />
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 36, backgroundColor: "#3E7A4E" }} />
      <StepIn delay={80} style={{ position: "absolute", left: "42%", bottom: 24, width: 108, height: 104 }}>
        <Px style={{ position: "absolute", left: 16, bottom: 64, width: 44, height: 20, backgroundColor: "#8D4000" }} />
        <Px style={{ position: "absolute", left: 24, bottom: 84, width: 28, height: 12, backgroundColor: "#8D4000" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 76, height: 48, backgroundColor: "#FFF8E1" }} shadow />
        <Px style={{ position: "absolute", left: 64, bottom: 68, width: 28, height: 16, backgroundColor: "#8D4000" }} />
        <Px style={{ position: "absolute", left: 64, bottom: 0, width: 28, height: 68, backgroundColor: "#FFF3E0" }} />
        <Px style={{ position: "absolute", left: 76, bottom: 84, width: 4, height: 20, backgroundColor: "#FFD54F" }} />
        <Px style={{ position: "absolute", left: 68, bottom: 92, width: 20, height: 4, backgroundColor: "#FFD54F" }} />
        <Px style={{ position: "absolute", left: 28, bottom: 0, width: 20, height: 32, backgroundColor: "#5D4037" }} />
        <Px style={{ position: "absolute", left: 8, bottom: 16, width: 12, height: 20, backgroundColor: "#7FB3D5" }} />
        <Px style={{ position: "absolute", left: 52, bottom: 16, width: 12, height: 20, backgroundColor: "#7FB3D5" }} />
        <Px style={{ position: "absolute", left: 72, bottom: 36, width: 12, height: 16, backgroundColor: "#7FB3D5" }} />
      </StepIn>
      <Px style={{ position: "absolute", left: "30%", bottom: 20, width: 40, height: 8, backgroundColor: "#D7CCC8" }} />
    </PixelSceneRoot>
  );
}

export function PixelParkGenericScene() {
  return (
    <PixelSceneRoot base="#7FB3D5">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "24%", backgroundColor: "#58A05C" }} />
      <PxSun left="46%" bottom={116} size={24} color="#FFD94D" core="#FFE98A" ray="#FFC531" />
      <StepIn delay={60} style={{ position: "absolute", left: "56%", bottom: 12, width: 100, height: 100 }}>
        <Px style={{ position: "absolute", left: 44, bottom: 0, width: 12, height: 100, backgroundColor: "#3A3A42" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 44, width: 100, height: 12, backgroundColor: "#3A3A42" }} />
        <Px style={{ position: "absolute", left: 12, bottom: 12, width: 76, height: 76, backgroundColor: "#7FB3D5" }} />
        <Px style={{ position: "absolute", left: 20, bottom: 20, width: 60, height: 60, backgroundColor: "#5B8FBF" }} />
        <Px style={{ position: "absolute", left: 44, bottom: 44, width: 12, height: 12, backgroundColor: "#FFC531" }} />
        <Px style={{ position: "absolute", left: 40, bottom: 84, width: 20, height: 16, backgroundColor: "#D64545" }} />
        <Px style={{ position: "absolute", left: 4, bottom: 44, width: 16, height: 12, backgroundColor: "#FFC531" }} />
        <Px style={{ position: "absolute", left: 80, bottom: 44, width: 16, height: 12, backgroundColor: "#58A05C" }} />
        <Px style={{ position: "absolute", left: 40, bottom: 4, width: 20, height: 16, backgroundColor: "#E86A92" }} />
      </StepIn>
      <StepIn delay={120} style={{ position: "absolute", left: "46%", bottom: 8, width: 28, height: 28 }}>
        <Px style={{ position: "absolute", left: 0, bottom: 8, width: 28, height: 20, backgroundColor: "#D64545" }} />
        <Px style={{ position: "absolute", left: 4, bottom: 20, width: 20, height: 8, backgroundColor: "#FFFFFF" }} />
      </StepIn>
    </PixelSceneRoot>
  );
}

export function PixelParkDisneyScene() {
  return (
    <PixelSceneRoot base="#5B7FB8">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "22%", backgroundColor: "#47648F" }} />
      <StepIn delay={40} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        <Px style={{ position: "absolute", left: "58%", bottom: 20, width: 84, height: 56, backgroundColor: "#DCE6F2" }} shadow />
        <Px style={{ position: "absolute", left: "55%", bottom: 20, width: 20, height: 76, backgroundColor: "#C9D8EA" }} />
        <Px style={{ position: "absolute", left: "81%", bottom: 20, width: 20, height: 76, backgroundColor: "#C9D8EA" }} />
        <Px style={{ position: "absolute", left: "66%", bottom: 20, width: 28, height: 92, backgroundColor: "#E8EFF7" }} />
        <Px style={{ position: "absolute", left: "55%", bottom: 96, width: 20, height: 16, backgroundColor: "#3E5C8A" }} />
        <Px style={{ position: "absolute", left: "81%", bottom: 96, width: 20, height: 16, backgroundColor: "#3E5C8A" }} />
        <Px style={{ position: "absolute", left: "66%", bottom: 112, width: 28, height: 20, backgroundColor: "#3E5C8A" }} />
        <Px style={{ position: "absolute", left: "70%", bottom: 20, width: 20, height: 32, backgroundColor: "#47648F" }} />
        <Px style={{ position: "absolute", left: "61%", bottom: 60, width: 12, height: 12, backgroundColor: "#FFD98A" }} />
        <Px style={{ position: "absolute", left: "76%", bottom: 60, width: 12, height: 12, backgroundColor: "#FFD98A" }} />
      </StepIn>
      <StepBlink style={{ position: "absolute", left: "48%", bottom: 118, width: 8, height: 8 }} period={1100}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 8, height: 8, backgroundColor: "#FFC531" }} />
      </StepBlink>
      <StepBlink style={{ position: "absolute", left: "90%", bottom: 124, width: 8, height: 8 }} period={1400}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 8, height: 8, backgroundColor: "#E86A92" }} />
      </StepBlink>
    </PixelSceneRoot>
  );
}

export function PixelParkSixFlagsScene() {
  return (
    <PixelSceneRoot base="#E8862D">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "22%", backgroundColor: "#C96A1F" }} />
      <StepIn delay={40} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        <Px style={{ position: "absolute", left: "48%", bottom: 24, width: 8, height: 92, backgroundColor: "#5B3A1E" }} />
        <Px style={{ position: "absolute", left: "56%", bottom: 100, width: 88, height: 8, backgroundColor: "#3A3A42" }} />
        <Px style={{ position: "absolute", left: "62%", bottom: 84, width: 64, height: 8, backgroundColor: "#3A3A42" }} />
        <Px style={{ position: "absolute", left: "76%", bottom: 28, width: 52, height: 52, backgroundColor: "#E8862D" }} />
        <Px style={{ position: "absolute", left: "76%", bottom: 28, width: 52, height: 8, backgroundColor: "#3A3A42" }} />
        <Px style={{ position: "absolute", left: "76%", bottom: 72, width: 52, height: 8, backgroundColor: "#3A3A42" }} />
        <Px style={{ position: "absolute", left: "76%", bottom: 28, width: 8, height: 52, backgroundColor: "#3A3A42" }} />
        <Px style={{ position: "absolute", left: "88%", bottom: 24, width: 8, height: 60, backgroundColor: "#5B3A1E" }} />
        <Px style={{ position: "absolute", left: "63%", bottom: 100, width: 20, height: 12, backgroundColor: "#D64545" }} />
        <Px style={{ position: "absolute", left: "68%", bottom: 92, width: 20, height: 12, backgroundColor: "#FFC531" }} />
        <Px style={{ position: "absolute", left: "49%", bottom: 112, width: 4, height: 24, backgroundColor: "#3A3A42" }} />
        <Px style={{ position: "absolute", left: "50%", bottom: 124, width: 20, height: 12, backgroundColor: "#D64545" }} />
      </StepIn>
    </PixelSceneRoot>
  );
}

export function PixelParkKnottsScene() {
  return (
    <PixelSceneRoot base="#C98A4B">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "26%", backgroundColor: "#A8713A" }} />
      <StepIn delay={40} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        <Px style={{ position: "absolute", left: "56%", bottom: 24, width: 92, height: 60, backgroundColor: "#8A5A2B" }} shadow />
        <Px style={{ position: "absolute", left: "54%", bottom: 84, width: 100, height: 12, backgroundColor: "#6B4423" }} />
        <Px style={{ position: "absolute", left: "60%", bottom: 60, width: 32, height: 12, backgroundColor: "#FFF3D6" }} />
        <Px style={{ position: "absolute", left: "66%", bottom: 24, width: 20, height: 32, backgroundColor: "#54382A" }} />
        <Px style={{ position: "absolute", left: "80%", bottom: 48, width: 16, height: 16, backgroundColor: "#FFE9A8" }} />
        <Px style={{ position: "absolute", left: "86%", bottom: 60, width: 32, height: 28, backgroundColor: "#7A6A55" }} />
        <Px style={{ position: "absolute", left: "88%", bottom: 32, width: 4, height: 28, backgroundColor: "#5D4E3A" }} />
        <Px style={{ position: "absolute", left: "94%", bottom: 32, width: 4, height: 28, backgroundColor: "#5D4E3A" }} />
        <Px style={{ position: "absolute", left: "47%", bottom: 12, width: 12, height: 36, backgroundColor: "#4C8A50" }} />
        <Px style={{ position: "absolute", left: "44%", bottom: 28, width: 8, height: 16, backgroundColor: "#4C8A50" }} />
        <Px style={{ position: "absolute", left: "50%", bottom: 36, width: 8, height: 12, backgroundColor: "#4C8A50" }} />
        <Px style={{ position: "absolute", left: "52%", bottom: 12, width: 8, height: 8, backgroundColor: "#5E35D6" }} />
        <Px style={{ position: "absolute", left: "55%", bottom: 16, width: 8, height: 8, backgroundColor: "#7C4DFF" }} />
      </StepIn>
    </PixelSceneRoot>
  );
}

export function PixelParkUniversalScene() {
  return (
    <PixelSceneRoot base="#3E5C8A">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "22%", backgroundColor: "#2F476B" }} />
      <StepBob left="58%" bottom={36} width={84} height={84} distance={4} period={1200}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 84, height: 84, backgroundColor: "#4E9AB5" }} shadow />
        <Px style={{ position: "absolute", left: 12, bottom: 52, width: 28, height: 20, backgroundColor: "#58A05C" }} />
        <Px style={{ position: "absolute", left: 44, bottom: 24, width: 32, height: 24, backgroundColor: "#58A05C" }} />
        <Px style={{ position: "absolute", left: 16, bottom: 16, width: 20, height: 16, backgroundColor: "#6FBF73" }} />
      </StepBob>
      <Px style={{ position: "absolute", left: "64%", bottom: 16, width: 44, height: 12, backgroundColor: "#2C2C33" }} />
      <StepIn delay={80} style={{ position: "absolute", left: "46%", bottom: 28, width: 24, height: 88 }}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 24, height: 88, backgroundColor: "#1E1B26" }} />
        <Px style={{ position: "absolute", left: 6, bottom: 8, width: 12, height: 12, backgroundColor: "#DCE6F2" }} />
        <Px style={{ position: "absolute", left: 6, bottom: 28, width: 12, height: 12, backgroundColor: "#DCE6F2" }} />
        <Px style={{ position: "absolute", left: 6, bottom: 48, width: 12, height: 12, backgroundColor: "#DCE6F2" }} />
        <Px style={{ position: "absolute", left: 6, bottom: 68, width: 12, height: 12, backgroundColor: "#DCE6F2" }} />
      </StepIn>
      <Px style={{ position: "absolute", left: "88%", bottom: 120, width: 8, height: 8, backgroundColor: "#FFFFFF" }} />
      <Px style={{ position: "absolute", left: "52%", bottom: 128, width: 8, height: 8, backgroundColor: "#FFC531" }} />
    </PixelSceneRoot>
  );
}

export function PixelParkLegolandScene() {
  return (
    <PixelSceneRoot base="#F2C14E">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "24%", backgroundColor: "#D9A93B" }} />
      <StepIn delay={40} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        <Px style={{ position: "absolute", left: "56%", bottom: 16, width: 36, height: 24, backgroundColor: "#D64545" }} shadow />
        <Px style={{ position: "absolute", left: "66%", bottom: 16, width: 36, height: 24, backgroundColor: "#3E7CB1" }} />
        <Px style={{ position: "absolute", left: "61%", bottom: 40, width: 36, height: 24, backgroundColor: "#58A05C" }} />
        <Px style={{ position: "absolute", left: "56%", bottom: 64, width: 24, height: 20, backgroundColor: "#FF8A5C" }} />
        <Px style={{ position: "absolute", left: "72%", bottom: 64, width: 24, height: 20, backgroundColor: "#7C4DFF" }} />
        <Px style={{ position: "absolute", left: "64%", bottom: 84, width: 28, height: 20, backgroundColor: "#D64545" }} />
        <Px style={{ position: "absolute", left: "59%", bottom: 40, width: 8, height: 4, backgroundColor: "#E86A7A" }} />
        <Px style={{ position: "absolute", left: "69%", bottom: 40, width: 8, height: 4, backgroundColor: "#5E97C4" }} />
        <Px style={{ position: "absolute", left: "64%", bottom: 64, width: 8, height: 4, backgroundColor: "#7FB069" }} />
        <Px style={{ position: "absolute", left: "67%", bottom: 104, width: 8, height: 4, backgroundColor: "#E86A7A" }} />
        <Px style={{ position: "absolute", left: "46%", bottom: 12, width: 24, height: 16, backgroundColor: "#3E7CB1" }} />
        <Px style={{ position: "absolute", left: "88%", bottom: 12, width: 24, height: 16, backgroundColor: "#58A05C" }} />
      </StepIn>
    </PixelSceneRoot>
  );
}

export function PixelParkSeaworldScene() {
  return (
    <PixelSceneRoot base="#2E7DA8">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "34%", backgroundColor: "#57B8D6" }} />
      <StepBob left="58%" bottom={64} width={76} height={40} distance={4} period={1100}>
        <Px style={{ position: "absolute", left: 8, bottom: 12, width: 56, height: 24, backgroundColor: "#7FA8B5" }} shadow />
        <Px style={{ position: "absolute", left: 0, bottom: 24, width: 20, height: 12, backgroundColor: "#7FA8B5" }} />
        <Px style={{ position: "absolute", left: 56, bottom: 24, width: 16, height: 8, backgroundColor: "#678B99" }} />
        <Px style={{ position: "absolute", left: 52, bottom: 4, width: 16, height: 8, backgroundColor: "#678B99" }} />
        <Px style={{ position: "absolute", left: 16, bottom: 24, width: 8, height: 8, backgroundColor: "#1E3A45" }} />
      </StepBob>
      <StepIn delay={80} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        <Px style={{ position: "absolute", left: "62%", bottom: 40, width: 12, height: 12, backgroundColor: "#FFFFFF" }} />
        <Px style={{ position: "absolute", left: "56%", bottom: 28, width: 52, height: 12, backgroundColor: "#57B8D6" }} />
        <Px style={{ position: "absolute", left: "56%", bottom: 28, width: 52, height: 4, backgroundColor: "#FFFFFF" }} />
        <View style={{ position: "absolute", left: "42%", right: 0, bottom: 16, height: 4, backgroundColor: "#FFFFFF", opacity: 0.5 }} />
        <View style={{ position: "absolute", left: "42%", right: 0, bottom: 24, height: 4, backgroundColor: "#FFFFFF", opacity: 0.35 }} />
      </StepIn>
    </PixelSceneRoot>
  );
}

export function PixelMovieGenericScene() {
  return (
    <PixelSceneRoot base="#1D1B2E">
      <View style={{ position: "absolute", left: "40%", right: 0, top: 0, bottom: 0, backgroundColor: "#241F3A" }} />
      <StepIn delay={60} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        <Px style={{ position: "absolute", left: "44%", bottom: 44, width: 196, height: 100, backgroundColor: "#0E0E14" }} shadow />
        <Px style={{ position: "absolute", left: "46%", bottom: 52, width: 180, height: 88, backgroundColor: "#37415C" }} />
        <Px style={{ position: "absolute", left: "58%", bottom: 52, width: 120, height: 32, backgroundColor: "#2C2C33" }} />
        <Px style={{ position: "absolute", left: "76%", bottom: 52, width: 88, height: 24, backgroundColor: "#23232B" }} />
        <Px style={{ position: "absolute", left: "64%", bottom: 84, width: 32, height: 32, backgroundColor: "#F5A623" }} />
        <Px style={{ position: "absolute", left: "41%", bottom: 32, width: 20, height: 120, backgroundColor: "#8E2323" }} />
        <Px style={{ position: "absolute", left: "94%", bottom: 32, width: 20, height: 120, backgroundColor: "#8E2323" }} />
        <Px style={{ position: "absolute", left: "41%", bottom: 140, width: 232, height: 16, backgroundColor: "#7A1D1D" }} />
        <Px style={{ position: "absolute", left: "47%", bottom: 0, width: 40, height: 16, backgroundColor: "#14121F" }} />
        <Px style={{ position: "absolute", left: "60%", bottom: 0, width: 40, height: 16, backgroundColor: "#14121F" }} />
        <Px style={{ position: "absolute", left: "73%", bottom: 0, width: 40, height: 16, backgroundColor: "#14121F" }} />
        <Px style={{ position: "absolute", left: "86%", bottom: 0, width: 40, height: 16, backgroundColor: "#14121F" }} />
      </StepIn>
      <StepBob left="47%" bottom={20} width={28} height={32} distance={4} period={1100}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 28, height: 24, backgroundColor: "#D64545" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 20, width: 12, height: 12, backgroundColor: "#FFF3C9" }} />
        <Px style={{ position: "absolute", left: 8, bottom: 24, width: 12, height: 8, backgroundColor: "#FFF3C9" }} />
        <Px style={{ position: "absolute", left: 16, bottom: 20, width: 12, height: 12, backgroundColor: "#FFF3C9" }} />
      </StepBob>
    </PixelSceneRoot>
  );
}

export function PixelTheaterGenericScene() {
  return (
    <PixelSceneRoot base="#241A2E">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "24%", backgroundColor: "#4A3220" }} />
      <View style={{ position: "absolute", left: 0, right: 0, bottom: "24%", height: 4, backgroundColor: "#6B4A2E" }} />
      <Px style={{ position: "absolute", left: "63%", top: 0, width: 28, height: 120, backgroundColor: "#FFE9A8", opacity: 0.13 }} />
      <StepIn delay={60} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        <Px style={{ position: "absolute", left: "41%", bottom: 20, width: 32, height: 128, backgroundColor: "#8E2323" }} />
        <Px style={{ position: "absolute", left: "92%", bottom: 20, width: 32, height: 128, backgroundColor: "#8E2323" }} />
        <Px style={{ position: "absolute", left: "47%", bottom: 128, width: 56, height: 24, backgroundColor: "#7A1D1D" }} />
        <Px style={{ position: "absolute", left: "64%", bottom: 128, width: 56, height: 24, backgroundColor: "#7A1D1D" }} />
        <Px style={{ position: "absolute", left: "81%", bottom: 128, width: 56, height: 24, backgroundColor: "#7A1D1D" }} />
        <Px style={{ position: "absolute", left: "55%", bottom: 64, width: 36, height: 44, backgroundColor: "#E8D8C8" }} shadow />
        <Px style={{ position: "absolute", left: "58%", bottom: 88, width: 8, height: 8, backgroundColor: "#241A2E" }} />
        <Px style={{ position: "absolute", left: "64%", bottom: 88, width: 8, height: 8, backgroundColor: "#241A2E" }} />
        <Px style={{ position: "absolute", left: "59%", bottom: 68, width: 16, height: 8, backgroundColor: "#241A2E" }} />
        <Px style={{ position: "absolute", left: "50%", bottom: 28, width: 8, height: 8, backgroundColor: "#FFD98A" }} />
        <Px style={{ position: "absolute", left: "61%", bottom: 28, width: 8, height: 8, backgroundColor: "#FFD98A" }} />
        <Px style={{ position: "absolute", left: "72%", bottom: 28, width: 8, height: 8, backgroundColor: "#FFD98A" }} />
        <Px style={{ position: "absolute", left: "83%", bottom: 28, width: 8, height: 8, backgroundColor: "#FFD98A" }} />
        <Px style={{ position: "absolute", left: "94%", bottom: 28, width: 8, height: 8, backgroundColor: "#FFD98A" }} />
      </StepIn>
      <StepBob left="76%" bottom={68} width={36} height={44} distance={4} period={1200}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 36, height: 44, backgroundColor: "#F4F1EA" }} />
        <Px style={{ position: "absolute", left: 8, bottom: 28, width: 8, height: 8, backgroundColor: "#241A2E" }} />
        <Px style={{ position: "absolute", left: 20, bottom: 28, width: 8, height: 8, backgroundColor: "#241A2E" }} />
        <Px style={{ position: "absolute", left: 8, bottom: 8, width: 20, height: 8, backgroundColor: "#241A2E" }} />
      </StepBob>
    </PixelSceneRoot>
  );
}

export function PixelMvResidentEvilScene() {
  return (
    <PixelSceneRoot base="#1E2226">
      <View style={{ position: "absolute", left: "40%", top: 0, bottom: 0, width: "14%", backgroundColor: "#26262B" }} />
      <View style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "10%", backgroundColor: "#26262B" }} />
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "18%", backgroundColor: "#17191D" }} />
      <StepIn delay={60} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        <Px style={{ position: "absolute", left: "66%", bottom: 24, width: 44, height: 92, backgroundColor: "#3A3A42" }} shadow />
        <Px style={{ position: "absolute", left: "68%", bottom: 24, width: 32, height: 92, backgroundColor: "#121216" }} />
        <Px style={{ position: "absolute", left: "72%", bottom: 24, width: 4, height: 92, backgroundColor: "#F5A623" }} />
        <Px style={{ position: "absolute", left: "47%", bottom: 84, width: 32, height: 40, backgroundColor: "#54382A" }} />
        <Px style={{ position: "absolute", left: "49%", bottom: 92, width: 20, height: 24, backgroundColor: "#6E4A33" }} />
        <Px style={{ position: "absolute", left: "84%", bottom: 36, width: 40, height: 8, backgroundColor: "#3A2A1E" }} />
        <Px style={{ position: "absolute", left: "86%", bottom: 12, width: 4, height: 24, backgroundColor: "#2C2016" }} />
        <Px style={{ position: "absolute", left: "92%", bottom: 12, width: 4, height: 24, backgroundColor: "#2C2016" }} />
        <Px style={{ position: "absolute", left: "89%", bottom: 44, width: 8, height: 20, backgroundColor: "#58A05C" }} />
        <Px style={{ position: "absolute", left: "89%", bottom: 64, width: 8, height: 4, backgroundColor: "#C0C6CE" }} />
        <Px style={{ position: "absolute", left: "52%", bottom: 12, width: 12, height: 16, backgroundColor: "#F4F1EA" }} />
        <Px style={{ position: "absolute", left: "52%", bottom: 28, width: 12, height: 12, backgroundColor: "#FFB300" }} />
      </StepIn>
      <StepBlink style={{ position: "absolute", left: "87%", bottom: 36, width: 20, height: 24 }} period={1600}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 20, height: 24, backgroundColor: "#7FB069", opacity: 0.25 }} />
      </StepBlink>
    </PixelSceneRoot>
  );
}

export function PixelMvBuddyScene() {
  return (
    <PixelSceneRoot base="#7A6A42">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "30%", backgroundColor: "#5D4E2E" }} />
      <Px style={{ position: "absolute", left: "55%", bottom: 0, width: 132, height: 44, backgroundColor: "#3A3222" }} />
      <Px style={{ position: "absolute", left: "63%", bottom: 36, width: 64, height: 64, backgroundColor: "#F2C14E" }} />
      <StepIn delay={60} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        <Px style={{ position: "absolute", left: "71%", bottom: 4, width: 12, height: 4, backgroundColor: "#E8D8A8" }} />
        <Px style={{ position: "absolute", left: "72%", bottom: 16, width: 8, height: 4, backgroundColor: "#E8D8A8" }} />
        <Px style={{ position: "absolute", left: "74%", bottom: 28, width: 8, height: 4, backgroundColor: "#E8D8A8" }} />
        <Px style={{ position: "absolute", left: "46%", bottom: 8, width: 20, height: 12, backgroundColor: "#4A3F24" }} />
        <Px style={{ position: "absolute", left: "90%", bottom: 16, width: 24, height: 16, backgroundColor: "#4A3F24" }} />
      </StepIn>
      <PxFigure left="63%" bottom={16} body="#2E2A1E" skin="#2E2A1E" hair="#2E2A1E" scale={1} />
      <PxFigure left="71%" bottom={14} body="#26221A" skin="#26221A" hair="#26221A" scale={0.9} />
    </PixelSceneRoot>
  );
}

export function PixelMvBlackPhoneScene() {
  return (
    <PixelSceneRoot base="#1A1A1E">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "20%", backgroundColor: "#121216" }} />
      <View style={{ position: "absolute", left: "40%", right: 0, bottom: "58%", height: 4, backgroundColor: "#232329" }} />
      <StepIn delay={60} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        <Px style={{ position: "absolute", left: "62%", bottom: 64, width: 40, height: 52, backgroundColor: "#232329" }} shadow />
        <Px style={{ position: "absolute", left: "60%", bottom: 108, width: 48, height: 12, backgroundColor: "#0C0C0F" }} />
        <Px style={{ position: "absolute", left: "60%", bottom: 104, width: 12, height: 16, backgroundColor: "#0C0C0F" }} />
        <Px style={{ position: "absolute", left: "72%", bottom: 104, width: 12, height: 16, backgroundColor: "#0C0C0F" }} />
        <Px style={{ position: "absolute", left: "74%", bottom: 84, width: 12, height: 8, backgroundColor: "#0C0C0F" }} />
        <Px style={{ position: "absolute", left: "72%", bottom: 72, width: 12, height: 8, backgroundColor: "#0C0C0F" }} />
        <Px style={{ position: "absolute", left: "66%", bottom: 80, width: 8, height: 8, backgroundColor: "#D64545" }} />
        <Px style={{ position: "absolute", left: "86%", bottom: 108, width: 32, height: 24, backgroundColor: "#2C3038" }} />
        <Px style={{ position: "absolute", left: "90%", bottom: 108, width: 4, height: 24, backgroundColor: "#1A1A1E" }} />
        <Px style={{ position: "absolute", left: "44%", bottom: 8, width: 64, height: 16, backgroundColor: "#2A2A30" }} />
        <Px style={{ position: "absolute", left: "52%", bottom: 128, width: 4, height: 28, backgroundColor: "#0C0C0F" }} />
        <Px style={{ position: "absolute", left: "50%", bottom: 104, width: 24, height: 24, backgroundColor: "#FFE9A8" }} />
      </StepIn>
    </PixelSceneRoot>
  );
}

export function PixelMvBackroomsScene() {
  return (
    <PixelSceneRoot base="#C9B458">
      <View style={{ position: "absolute", left: 0, right: 0, top: 0, height: "16%", backgroundColor: "#D8C26A" }} />
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "22%", backgroundColor: "#8A7A34" }} />
      <StepIn delay={60} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        <Px style={{ position: "absolute", left: "48%", bottom: 128, width: 64, height: 8, backgroundColor: "#FFF8DC" }} />
        <Px style={{ position: "absolute", left: "76%", bottom: 128, width: 64, height: 8, backgroundColor: "#FFF8DC", opacity: 0.55 }} />
        <Px style={{ position: "absolute", left: "44%", bottom: 32, width: 52, height: 92, backgroundColor: "#BFA94E" }} />
        <Px style={{ position: "absolute", left: "58%", bottom: 32, width: 52, height: 92, backgroundColor: "#B8A44E" }} />
        <Px style={{ position: "absolute", left: "72%", bottom: 32, width: 52, height: 92, backgroundColor: "#B09F45" }} />
        <Px style={{ position: "absolute", left: "87%", bottom: 32, width: 32, height: 68, backgroundColor: "#6E5F27" }} />
        <Px style={{ position: "absolute", left: "89%", bottom: 36, width: 20, height: 56, backgroundColor: "#57491F" }} />
        <View style={{ position: "absolute", left: "40%", right: 0, bottom: 28, height: 4, backgroundColor: "#A8943F" }} />
        <Px style={{ position: "absolute", left: "52%", bottom: 40, width: 8, height: 12, backgroundColor: "#E8D894" }} />
        <Px style={{ position: "absolute", left: "59%", bottom: 32, width: 32, height: 16, backgroundColor: "#9A8638", opacity: 0.8 }} />
      </StepIn>
    </PixelSceneRoot>
  );
}

export function PixelMvExit8Scene() {
  return (
    <PixelSceneRoot base="#DCE6F2">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "20%", backgroundColor: "#B9CBD8" }} />
      <View style={{ position: "absolute", left: "40%", right: 0, top: 0, height: "12%", backgroundColor: "#C9D6E4" }} />
      <StepIn delay={60} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        <Px style={{ position: "absolute", left: "46%", bottom: 28, width: 36, height: 76, backgroundColor: "#EDF2F8" }} />
        <Px style={{ position: "absolute", left: "46%", bottom: 28, width: 36, height: 76, backgroundColor: "#8FA6B8", opacity: 0.35 }} />
        <Px style={{ position: "absolute", left: "63%", bottom: 28, width: 28, height: 68, backgroundColor: "#EDF2F8" }} />
        <Px style={{ position: "absolute", left: "80%", bottom: 28, width: 24, height: 60, backgroundColor: "#EDF2F8" }} />
        <Px style={{ position: "absolute", left: "90%", bottom: 76, width: 24, height: 32, backgroundColor: "#FFFFFF" }} />
        <Px style={{ position: "absolute", left: "92%", bottom: 92, width: 16, height: 4, backgroundColor: "#B9CBD8" }} />
        <Px style={{ position: "absolute", left: "92%", bottom: 84, width: 16, height: 4, backgroundColor: "#B9CBD8" }} />
        <View style={{ position: "absolute", left: "42%", right: 0, bottom: 12, height: 4, backgroundColor: "#F2C14E", opacity: 0.8 }} />
      </StepIn>
      <StepIn delay={160} style={{ position: "absolute", left: "60%", bottom: 112, width: 76, height: 32 }}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 76, height: 32, backgroundColor: "#2C7A4B" }} shadow />
        <Px style={{ position: "absolute", left: 8, bottom: 12, width: 16, height: 8, backgroundColor: "#FFFFFF" }} />
        <Px style={{ position: "absolute", left: 12, bottom: 4, width: 12, height: 12, backgroundColor: "#FFFFFF" }} />
        <Px style={{ position: "absolute", left: 44, bottom: 16, width: 16, height: 12, backgroundColor: "#FFFFFF" }} />
        <Px style={{ position: "absolute", left: 48, bottom: 20, width: 8, height: 4, backgroundColor: "#2C7A4B" }} />
        <Px style={{ position: "absolute", left: 44, bottom: 4, width: 16, height: 12, backgroundColor: "#FFFFFF" }} />
        <Px style={{ position: "absolute", left: 48, bottom: 8, width: 8, height: 4, backgroundColor: "#2C7A4B" }} />
      </StepIn>
    </PixelSceneRoot>
  );
}

export function PixelMvDeadpoolScene() {
  return (
    <PixelSceneRoot base="#261A1E">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "24%", backgroundColor: "#7A1D1D" }} />
      <StepIn delay={60} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        <Px style={{ position: "absolute", left: "59%", bottom: 44, width: 84, height: 84, backgroundColor: "#C0272D" }} shadow />
        <Px style={{ position: "absolute", left: "62%", bottom: 84, width: 24, height: 32, backgroundColor: "#FFFFFF" }} />
        <Px style={{ position: "absolute", left: "74%", bottom: 84, width: 24, height: 32, backgroundColor: "#FFFFFF" }} />
        <Px style={{ position: "absolute", left: "66%", bottom: 92, width: 8, height: 8, backgroundColor: "#261A1E" }} />
        <Px style={{ position: "absolute", left: "78%", bottom: 92, width: 8, height: 8, backgroundColor: "#261A1E" }} />
        <Px style={{ position: "absolute", left: "54%", bottom: 72, width: 92, height: 8, backgroundColor: "#C0C6CE" }} />
        <Px style={{ position: "absolute", left: "54%", bottom: 60, width: 92, height: 8, backgroundColor: "#AEB6BF" }} />
        <Px style={{ position: "absolute", left: "53%", bottom: 36, width: 20, height: 8, backgroundColor: "#1E1B26" }} />
        <Px style={{ position: "absolute", left: "83%", bottom: 36, width: 20, height: 8, backgroundColor: "#1E1B26" }} />
        <Px style={{ position: "absolute", left: "58%", bottom: 12, width: 92, height: 16, backgroundColor: "#EDE6D8" }} />
        <Px style={{ position: "absolute", left: "62%", bottom: 24, width: 68, height: 24, backgroundColor: "#E8C87A" }} />
        <Px style={{ position: "absolute", left: "64%", bottom: 32, width: 20, height: 4, backgroundColor: "#C9A24E" }} />
        <Px style={{ position: "absolute", left: "60%", bottom: 24, width: 12, height: 20, backgroundColor: "#D8D2C4" }} />
      </StepIn>
    </PixelSceneRoot>
  );
}

export function PixelMvFnafScene() {
  return (
    <PixelSceneRoot base="#1E1A26">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "18%", backgroundColor: "#262033" }} />
      <Px style={{ position: "absolute", left: "42%", bottom: 12, width: 40, height: 12, backgroundColor: "#17131F" }} />
      <Px style={{ position: "absolute", left: "62%", bottom: 0, width: 40, height: 12, backgroundColor: "#17131F" }} />
      <Px style={{ position: "absolute", left: "82%", bottom: 12, width: 40, height: 12, backgroundColor: "#17131F" }} />
      <StepIn delay={60} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        <Px style={{ position: "absolute", left: "56%", bottom: 28, width: 24, height: 96, backgroundColor: "#4A2E4F" }} />
        <Px style={{ position: "absolute", left: "82%", bottom: 28, width: 24, height: 96, backgroundColor: "#4A2E4F" }} />
        <Px style={{ position: "absolute", left: "54%", bottom: 116, width: 116, height: 16, backgroundColor: "#3E2742" }} />
        <Px style={{ position: "absolute", left: "54%", bottom: 24, width: 116, height: 8, backgroundColor: "#2C1E33" }} />
        <Px style={{ position: "absolute", left: "64%", bottom: 100, width: 16, height: 16, backgroundColor: "#8A5A33" }} />
        <Px style={{ position: "absolute", left: "76%", bottom: 100, width: 16, height: 16, backgroundColor: "#8A5A33" }} />
        <Px style={{ position: "absolute", left: "63%", bottom: 60, width: 56, height: 52, backgroundColor: "#96613A" }} shadow />
        <Px style={{ position: "absolute", left: "68%", bottom: 104, width: 28, height: 12, backgroundColor: "#1E1A26" }} />
        <Px style={{ position: "absolute", left: "66%", bottom: 112, width: 36, height: 8, backgroundColor: "#1E1A26" }} />
        <Px style={{ position: "absolute", left: "68%", bottom: 64, width: 24, height: 16, backgroundColor: "#C89B6A" }} />
        <Px style={{ position: "absolute", left: "72%", bottom: 72, width: 8, height: 8, backgroundColor: "#1E1A26" }} />
        <Px style={{ position: "absolute", left: "44%", bottom: 24, width: 28, height: 52, backgroundColor: "#2C2440" }} />
        <Px style={{ position: "absolute", left: "46%", bottom: 52, width: 20, height: 16, backgroundColor: "#3E7CB1" }} />
        <Px style={{ position: "absolute", left: "90%", bottom: 24, width: 28, height: 52, backgroundColor: "#2C2440" }} />
        <Px style={{ position: "absolute", left: "92%", bottom: 52, width: 20, height: 16, backgroundColor: "#E86A92" }} />
      </StepIn>
      <StepBlink style={{ position: "absolute", left: "67%", bottom: 84, width: 8, height: 8 }} period={1200}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 8, height: 8, backgroundColor: "#F4F1EA" }} />
      </StepBlink>
      <StepBlink style={{ position: "absolute", left: "75%", bottom: 84, width: 8, height: 8 }} period={1200}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 8, height: 8, backgroundColor: "#F4F1EA" }} />
      </StepBlink>
    </PixelSceneRoot>
  );
}

export function PixelMvIronLungScene() {
  return (
    <PixelSceneRoot base="#260F12">
      <View style={{ position: "absolute", left: "56%", top: 0, bottom: 0, width: 4, backgroundColor: "#33090D" }} />
      <View style={{ position: "absolute", left: "90%", top: 0, bottom: 0, width: 4, backgroundColor: "#33090D" }} />
      <StepIn delay={60} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        <Px style={{ position: "absolute", left: "42%", bottom: 132, width: 192, height: 12, backgroundColor: "#3D2A2E" }} />
        <Px style={{ position: "absolute", left: "46%", bottom: 116, width: 12, height: 16, backgroundColor: "#332327" }} />
        <Px style={{ position: "absolute", left: "60%", bottom: 44, width: 84, height: 84, backgroundColor: "#5B6B7A" }} shadow />
        <Px style={{ position: "absolute", left: "64%", bottom: 48, width: 76, height: 76, backgroundColor: "#0D0507" }} />
        <Px style={{ position: "absolute", left: "70%", bottom: 68, width: 28, height: 36, backgroundColor: "#4A1216", opacity: 0.9 }} />
        <Px style={{ position: "absolute", left: "68%", bottom: 120, width: 8, height: 8, backgroundColor: "#8E9AAF" }} />
        <Px style={{ position: "absolute", left: "80%", bottom: 120, width: 8, height: 8, backgroundColor: "#8E9AAF" }} />
        <Px style={{ position: "absolute", left: "86%", bottom: 96, width: 28, height: 28, backgroundColor: "#E8D8C8" }} />
        <Px style={{ position: "absolute", left: "88%", bottom: 100, width: 24, height: 20, backgroundColor: "#5B6B7A" }} />
        <Px style={{ position: "absolute", left: "90%", bottom: 108, width: 4, height: 12, backgroundColor: "#D64545" }} />
        <Px style={{ position: "absolute", left: "46%", bottom: 32, width: 36, height: 24, backgroundColor: "#33090D" }} />
        <Px style={{ position: "absolute", left: "48%", bottom: 44, width: 8, height: 8, backgroundColor: "#7FB069" }} />
        <Px style={{ position: "absolute", left: "52%", bottom: 44, width: 8, height: 8, backgroundColor: "#5B6B7A" }} />
        <Px style={{ position: "absolute", left: "47%", bottom: 120, width: 12, height: 12, backgroundColor: "#D64545" }} />
      </StepIn>
      <StepBob left="66%" bottom={52} width={8} height={8} distance={8} period={1300}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 8, height: 8, backgroundColor: "#7FB3D5", opacity: 0.8 }} />
      </StepBob>
      <StepBob left="76%" bottom={48} width={8} height={8} distance={8} period={1500} delay={300}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 8, height: 8, backgroundColor: "#7FB3D5", opacity: 0.6 }} />
      </StepBob>
    </PixelSceneRoot>
  );
}

export function PixelMvNimrodsScene() {
  return (
    <PixelSceneRoot base="#232946">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: "26%", height: 12, backgroundColor: "#C96A2B", opacity: 0.55 }} />
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "26%", backgroundColor: "#161A2E" }} />
      <Px style={{ position: "absolute", left: "42%", bottom: 8, width: 212, height: 4, backgroundColor: "#D8D2C4", opacity: 0.5 }} />
      <StepIn delay={60} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        <Px style={{ position: "absolute", left: "66%", bottom: 32, width: 8, height: 64, backgroundColor: "#5B4A33" }} />
        <Px style={{ position: "absolute", left: "76%", bottom: 32, width: 8, height: 64, backgroundColor: "#5B4A33" }} />
        <Px style={{ position: "absolute", left: "61%", bottom: 92, width: 76, height: 40, backgroundColor: "#DCE6F2" }} shadow />
        <Px style={{ position: "absolute", left: "70%", bottom: 96, width: 28, height: 28, backgroundColor: "#D64545" }} />
        <Px style={{ position: "absolute", left: "73%", bottom: 102, width: 16, height: 16, backgroundColor: "#F5A623" }} />
        <Px style={{ position: "absolute", left: "64%", bottom: 96, width: 24, height: 4, backgroundColor: "#7A8AA0" }} />
        <Px style={{ position: "absolute", left: "48%", bottom: 36, width: 12, height: 36, backgroundColor: "#2F6335" }} />
        <Px style={{ position: "absolute", left: "45%", bottom: 52, width: 8, height: 16, backgroundColor: "#2F6335" }} />
        <Px style={{ position: "absolute", left: "51%", bottom: 56, width: 8, height: 16, backgroundColor: "#2F6335" }} />
        <Px style={{ position: "absolute", left: "88%", bottom: 36, width: 20, height: 20, backgroundColor: "#8A6D3B" }} />
        <Px style={{ position: "absolute", left: "89%", bottom: 37, width: 18, height: 18, backgroundColor: "#232946" }} />
        <Px style={{ position: "absolute", left: "46%", bottom: 124, width: 4, height: 4, backgroundColor: "#FFFFFF", opacity: 0.85 }} />
        <Px style={{ position: "absolute", left: "59%", bottom: 112, width: 4, height: 4, backgroundColor: "#FFFFFF", opacity: 0.85 }} />
        <Px style={{ position: "absolute", left: "90%", bottom: 116, width: 24, height: 24, backgroundColor: "#F5EFD8" }} />
        <Px style={{ position: "absolute", left: "91%", bottom: 118, width: 20, height: 20, backgroundColor: "#232946" }} />
      </StepIn>
    </PixelSceneRoot>
  );
}

export function PixelMvIdiotsScene() {
  return (
    <PixelSceneRoot base="#8A7A4A">
      <PxSun left="88%" bottom={112} size={28} color="#FFD94D" core="#FFE98A" ray="#FFC531" />
      <PxCloud left="48%" top={8} width={52} color="#EAF4FF" shade="#C9DDF2" />
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "26%", backgroundColor: "#57492E" }} />
      <StepIn delay={60} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        <Px style={{ position: "absolute", left: "54%", bottom: 28, width: 128, height: 32, backgroundColor: "#F2C14E" }} shadow />
        <Px style={{ position: "absolute", left: "61%", bottom: 56, width: 64, height: 28, backgroundColor: "#E8B34B" }} />
        <Px style={{ position: "absolute", left: "64%", bottom: 60, width: 24, height: 16, backgroundColor: "#BFE6F5" }} />
        <Px style={{ position: "absolute", left: "72%", bottom: 60, width: 20, height: 16, backgroundColor: "#BFE6F5" }} />
        <Px style={{ position: "absolute", left: "69%", bottom: 28, width: 28, height: 32, backgroundColor: "#E8862D" }} />
        <Px style={{ position: "absolute", left: "57%", bottom: 12, width: 20, height: 20, backgroundColor: "#2C2C33" }} />
        <Px style={{ position: "absolute", left: "79%", bottom: 16, width: 16, height: 16, backgroundColor: "#2C2C33" }} />
        <Px style={{ position: "absolute", left: "64%", bottom: 84, width: 32, height: 12, backgroundColor: "#A93226" }} />
        <Px style={{ position: "absolute", left: "70%", bottom: 80, width: 4, height: 16, backgroundColor: "#5D4037" }} />
        <Px style={{ position: "absolute", left: "45%", bottom: 44, width: 24, height: 20, backgroundColor: "#FFF8E1" }} />
        <Px style={{ position: "absolute", left: "46%", bottom: 52, width: 16, height: 4, backgroundColor: "#7FB3D5" }} />
      </StepIn>
      <PxFigure left="43%" bottom={12} body="#D64545" skin="#F2C79B" hair="#4A3220" scale={1} />
      <PxFigure left="88%" bottom={12} body="#3E7CB1" skin="#F2C79B" hair="#4A3220" scale={0.8} />
      <StepBob left="51%" bottom={16} width={12} height={12} distance={4} period={1200}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 12, height: 12, backgroundColor: "#FFFFFF", opacity: 0.55 }} />
      </StepBob>
    </PixelSceneRoot>
  );
}

export function PixelMvNobodyScene() {
  return (
    <PixelSceneRoot base="#20242A">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "22%", backgroundColor: "#171A1F" }} />
      <StepIn delay={60} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        <Px style={{ position: "absolute", left: "56%", bottom: 28, width: 96, height: 56, backgroundColor: "#2C313A" }} shadow />
        <Px style={{ position: "absolute", left: "53%", bottom: 84, width: 108, height: 16, backgroundColor: "#22262E" }} />
        <Px style={{ position: "absolute", left: "60%", bottom: 52, width: 16, height: 16, backgroundColor: "#FFD98A" }} />
        <Px style={{ position: "absolute", left: "66%", bottom: 52, width: 16, height: 16, backgroundColor: "#39404C" }} />
        <Px style={{ position: "absolute", left: "76%", bottom: 52, width: 16, height: 16, backgroundColor: "#39404C" }} />
        <Px style={{ position: "absolute", left: "70%", bottom: 28, width: 16, height: 28, backgroundColor: "#22262E" }} />
        <Px style={{ position: "absolute", left: "88%", bottom: 28, width: 4, height: 76, backgroundColor: "#5B6B7A" }} />
        <Px style={{ position: "absolute", left: "85%", bottom: 92, width: 28, height: 16, backgroundColor: "#C9A86A" }} />
        <Px style={{ position: "absolute", left: "82%", bottom: 32, width: 52, height: 8, backgroundColor: "#4A4232" }} />
        <Px style={{ position: "absolute", left: "83%", bottom: 16, width: 4, height: 16, backgroundColor: "#39404C" }} />
        <Px style={{ position: "absolute", left: "93%", bottom: 16, width: 4, height: 16, backgroundColor: "#39404C" }} />
        <Px style={{ position: "absolute", left: "84%", bottom: 40, width: 24, height: 16, backgroundColor: "#6E4A33" }} />
        <Px style={{ position: "absolute", left: "46%", bottom: 32, width: 4, height: 84, backgroundColor: "#39404C" }} />
        <Px style={{ position: "absolute", left: "46%", bottom: 112, width: 20, height: 8, backgroundColor: "#39404C" }} />
        <Px style={{ position: "absolute", left: "47%", bottom: 96, width: 16, height: 16, backgroundColor: "#FFD98A" }} />
      </StepIn>
    </PixelSceneRoot>
  );
}

export function PixelMvMarioScene() {
  return (
    <PixelSceneRoot base="#4E9AD8">
      <PxCloud left="46%" top={8} width={60} color="#EAF4FF" shade="#C9DDF2" />
      <PxCloud left="70%" top={24} width={44} color="#EAF4FF" shade="#C9DDF2" />
      <Px style={{ position: "absolute", left: "44%", bottom: 28, width: 92, height: 36, backgroundColor: "#58A05C" }} />
      <Px style={{ position: "absolute", left: "86%", bottom: 28, width: 64, height: 24, backgroundColor: "#4C8A50" }} />
      <StepIn delay={60} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        <Px style={{ position: "absolute", left: "40%", bottom: 0, width: "62%", height: 28, backgroundColor: "#C6692E" }} />
        <Px style={{ position: "absolute", left: "40%", bottom: 24, width: "62%", height: 4, backgroundColor: "#58A05C" }} />
        <View style={{ position: "absolute", left: "40%", right: 0, bottom: 8, height: 4, backgroundColor: "#A8551F" }} />
        <View style={{ position: "absolute", left: "40%", right: 0, bottom: 16, height: 4, backgroundColor: "#A8551F" }} />
        <Px style={{ position: "absolute", left: "86%", bottom: 28, width: 32, height: 44, backgroundColor: "#3E8A3E" }} />
        <Px style={{ position: "absolute", left: "84%", bottom: 68, width: 40, height: 12, backgroundColor: "#4CAF50" }} />
        <Px style={{ position: "absolute", left: "50%", bottom: 36, width: 32, height: 16, backgroundColor: "#D64545" }} />
        <Px style={{ position: "absolute", left: "52%", bottom: 40, width: 8, height: 8, backgroundColor: "#FFFFFF" }} />
        <Px style={{ position: "absolute", left: "56%", bottom: 44, width: 8, height: 8, backgroundColor: "#FFFFFF" }} />
        <Px style={{ position: "absolute", left: "52%", bottom: 28, width: 16, height: 8, backgroundColor: "#FFF3D6" }} />
      </StepIn>
      <StepBob left="62%" bottom={72} width={24} height={24} distance={4} period={1200}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 24, height: 24, backgroundColor: "#FFB300" }} />
        <Px style={{ position: "absolute", left: 8, bottom: 8, width: 8, height: 8, backgroundColor: "#FFE082" }} />
      </StepBob>
      <StepBob left="76%" bottom={88} width={24} height={24} distance={4} period={1300} delay={300}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 24, height: 24, backgroundColor: "#FFB300" }} />
        <Px style={{ position: "absolute", left: 8, bottom: 8, width: 8, height: 8, backgroundColor: "#FFE082" }} />
      </StepBob>
      <StepBlink style={{ position: "absolute", left: "69%", bottom: 108, width: 12, height: 16 }} period={1000}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 12, height: 16, backgroundColor: "#FFD54F" }} />
      </StepBlink>
    </PixelSceneRoot>
  );
}

export function PixelMvToyStoryScene() {
  return (
    <PixelSceneRoot base="#1E2A4E">
      <StepIn delay={60} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        <Px style={{ position: "absolute", left: "80%", bottom: 68, width: 52, height: 64, backgroundColor: "#27355C" }} shadow />
        <Px style={{ position: "absolute", left: "80%", bottom: 68, width: 52, height: 8, backgroundColor: "#3E4E7E" }} />
        <Px style={{ position: "absolute", left: "80%", bottom: 124, width: 52, height: 8, backgroundColor: "#3E4E7E" }} />
        <Px style={{ position: "absolute", left: "84%", bottom: 104, width: 20, height: 20, backgroundColor: "#F5E6A8" }} />
        <Px style={{ position: "absolute", left: "42%", bottom: 0, width: 128, height: 32, backgroundColor: "#3E5A9E" }} />
        <Px style={{ position: "absolute", left: "43%", bottom: 28, width: 44, height: 16, backgroundColor: "#E8EAF6" }} />
        <Px style={{ position: "absolute", left: "58%", bottom: 16, width: 68, height: 16, backgroundColor: "#4E6FB5" }} />
        <Px style={{ position: "absolute", left: "71%", bottom: 44, width: 32, height: 8, backgroundColor: "#8D6E63" }} />
        <Px style={{ position: "absolute", left: "73%", bottom: 48, width: 20, height: 12, backgroundColor: "#A1887F" }} />
        <Px style={{ position: "absolute", left: "47%", bottom: 32, width: 20, height: 20, backgroundColor: "#1E88E5" }} />
        <Px style={{ position: "absolute", left: "52%", bottom: 32, width: 20, height: 20, backgroundColor: "#58A05C" }} />
        <Px style={{ position: "absolute", left: "48%", bottom: 116, width: 8, height: 8, backgroundColor: "#FFE082", opacity: 0.9 }} />
        <Px style={{ position: "absolute", left: "59%", bottom: 104, width: 8, height: 8, backgroundColor: "#FFE082", opacity: 0.9 }} />
        <Px style={{ position: "absolute", left: "70%", bottom: 116, width: 8, height: 8, backgroundColor: "#FFE082", opacity: 0.9 }} />
      </StepIn>
      <StepBob left="56%" bottom={32} width={20} height={20} distance={4} period={1200}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 20, height: 20, backgroundColor: "#E53935" }} />
        <Px style={{ position: "absolute", left: 8, bottom: 4, width: 4, height: 12, backgroundColor: "#FFEBEE", opacity: 0.85 }} />
      </StepBob>
      <StepBob left="86%" bottom={36} width={20} height={36} distance={4} period={1300} delay={300}>
        <Px style={{ position: "absolute", left: 4, bottom: 8, width: 12, height: 20, backgroundColor: "#E0E0E0" }} />
        <Px style={{ position: "absolute", left: 4, bottom: 28, width: 12, height: 8, backgroundColor: "#E53935" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 8, height: 8, backgroundColor: "#FF8F00" }} />
        <Px style={{ position: "absolute", left: 12, bottom: 0, width: 8, height: 8, backgroundColor: "#FF8F00" }} />
      </StepBob>
    </PixelSceneRoot>
  );
}

export function PixelMvZootopiaScene() {
  return (
    <PixelSceneRoot base="#6FB9D9">
      <PxSun left="46%" bottom={112} size={24} color="#FFD94D" core="#FFE98A" ray="#FFC531" />
      <View style={{ position: "absolute", left: "40%", right: 0, top: 0, height: 20, backgroundColor: "#2E7D32", opacity: 0.9 }} />
      <Px style={{ position: "absolute", left: "46%", bottom: 124, width: 36, height: 16, backgroundColor: "#388E3C" }} />
      <Px style={{ position: "absolute", left: "60%", bottom: 124, width: 36, height: 16, backgroundColor: "#388E3C" }} />
      <Px style={{ position: "absolute", left: "74%", bottom: 124, width: 36, height: 16, backgroundColor: "#388E3C" }} />
      <Px style={{ position: "absolute", left: "88%", bottom: 124, width: 36, height: 16, backgroundColor: "#388E3C" }} />
      <StepIn delay={60} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        <Px style={{ position: "absolute", left: "56%", bottom: 28, width: 32, height: 68, backgroundColor: "#90A4AE" }} shadow />
        <Px style={{ position: "absolute", left: "66%", bottom: 28, width: 24, height: 88, backgroundColor: "#7E97A3" }} />
        <Px style={{ position: "absolute", left: "75%", bottom: 28, width: 36, height: 56, backgroundColor: "#9DB4BE" }} />
        <Px style={{ position: "absolute", left: "85%", bottom: 28, width: 24, height: 76, backgroundColor: "#7E97A3" }} />
        <Px style={{ position: "absolute", left: "59%", bottom: 48, width: 8, height: 8, backgroundColor: "#FFE9A8" }} />
        <Px style={{ position: "absolute", left: "70%", bottom: 48, width: 8, height: 8, backgroundColor: "#FFE9A8" }} />
        <Px style={{ position: "absolute", left: "81%", bottom: 48, width: 8, height: 8, backgroundColor: "#FFE9A8" }} />
        <Px style={{ position: "absolute", left: "42%", bottom: 0, width: 120, height: 28, backgroundColor: "#58A05C" }} />
        <Px style={{ position: "absolute", left: "47%", bottom: 0, width: 16, height: 16, backgroundColor: "#5D4037" }} />
        <Px style={{ position: "absolute", left: "54%", bottom: 0, width: 12, height: 12, backgroundColor: "#6B4423" }} />
        <Px style={{ position: "absolute", left: "76%", bottom: 8, width: 28, height: 12, backgroundColor: "#D64545" }} />
        <Px style={{ position: "absolute", left: "78%", bottom: 4, width: 8, height: 8, backgroundColor: "#2C2C33" }} />
        <Px style={{ position: "absolute", left: "84%", bottom: 4, width: 8, height: 8, backgroundColor: "#2C2C33" }} />
      </StepIn>
      <StepBob left="60%" bottom={4} width={32} height={20} distance={4} period={1200}>
        <Px style={{ position: "absolute", left: 0, bottom: 4, width: 32, height: 12, backgroundColor: "#3E7CB1" }} />
        <Px style={{ position: "absolute", left: 8, bottom: 16, width: 16, height: 4, backgroundColor: "#5E97C4" }} />
        <Px style={{ position: "absolute", left: 4, bottom: 0, width: 8, height: 8, backgroundColor: "#2C2C33" }} />
        <Px style={{ position: "absolute", left: 20, bottom: 0, width: 8, height: 8, backgroundColor: "#2C2C33" }} />
      </StepBob>
    </PixelSceneRoot>
  );
}

export function PixelMvSpidermanScene() {
  return (
    <PixelSceneRoot base="#2A1220">
      <View style={{ position: "absolute", left: "40%", bottom: 0, width: "18%", height: 60, backgroundColor: "#1C0D16" }} />
      <View style={{ position: "absolute", left: "60%", bottom: 0, width: "15%", height: 84, backgroundColor: "#22101B" }} />
      <View style={{ position: "absolute", left: "77%", bottom: 0, width: "20%", height: 68, backgroundColor: "#1C0D16" }} />
      <Px style={{ position: "absolute", left: "63%", bottom: 20, width: 8, height: 8, backgroundColor: "#FFD98A" }} />
      <Px style={{ position: "absolute", left: "71%", bottom: 20, width: 8, height: 8, backgroundColor: "#FFD98A" }} />
      <Px style={{ position: "absolute", left: "63%", bottom: 40, width: 8, height: 8, backgroundColor: "#3A2430" }} />
      <Px style={{ position: "absolute", left: "71%", bottom: 40, width: 8, height: 8, backgroundColor: "#FFD98A" }} />
      <StepIn delay={60} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        <Px style={{ position: "absolute", left: "88%", bottom: 96, width: 64, height: 8, backgroundColor: "#8E9AAF", opacity: 0.9 }} />
        <Px style={{ position: "absolute", left: "88%", bottom: 96, width: 8, height: 64, backgroundColor: "#8E9AAF", opacity: 0.9 }} />
        <Px style={{ position: "absolute", left: "88%", bottom: 112, width: 48, height: 8, backgroundColor: "#8E9AAF", opacity: 0.9 }} />
        <Px style={{ position: "absolute", left: "88%", bottom: 128, width: 32, height: 8, backgroundColor: "#8E9AAF", opacity: 0.9 }} />
        <Px style={{ position: "absolute", left: "46%", bottom: 108, width: 28, height: 28, backgroundColor: "#F5EFD8" }} />
        <Px style={{ position: "absolute", left: "48%", bottom: 112, width: 24, height: 24, backgroundColor: "#2A1220" }} />
      </StepIn>
      <StepBob left="56%" bottom={64} width={16} height={52} distance={4} period={1300}>
        <Px style={{ position: "absolute", left: 8, bottom: 16, width: 4, height: 36, backgroundColor: "#8E9AAF" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 16, height: 16, backgroundColor: "#1C0D16" }} />
        <Px style={{ position: "absolute", left: 4, bottom: 4, width: 4, height: 4, backgroundColor: "#C0272D" }} />
        <Px style={{ position: "absolute", left: 12, bottom: 4, width: 4, height: 4, backgroundColor: "#C0272D" }} />
      </StepBob>
    </PixelSceneRoot>
  );
}

export function PixelMvAvengersDoomsdayScene() {
  return (
    <PixelSceneRoot base="#14201A">
      <Px style={{ position: "absolute", left: "52%", bottom: 52, width: 152, height: 112, backgroundColor: "#2E4A38", opacity: 0.75 }} />
      <StepIn delay={60} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        <Px style={{ position: "absolute", left: "44%", bottom: 24, width: 36, height: 64, backgroundColor: "#0E1712" }} shadow />
        <Px style={{ position: "absolute", left: "56%", bottom: 24, width: 28, height: 88, backgroundColor: "#0C130F" }} />
        <Px style={{ position: "absolute", left: "66%", bottom: 24, width: 40, height: 72, backgroundColor: "#0E1712" }} />
        <Px style={{ position: "absolute", left: "79%", bottom: 24, width: 28, height: 96, backgroundColor: "#0C130F" }} />
        <Px style={{ position: "absolute", left: "89%", bottom: 24, width: 32, height: 56, backgroundColor: "#0E1712" }} />
        <Px style={{ position: "absolute", left: "59%", bottom: 48, width: 8, height: 8, backgroundColor: "#9BC49B", opacity: 0.85 }} />
        <Px style={{ position: "absolute", left: "82%", bottom: 48, width: 8, height: 8, backgroundColor: "#9BC49B", opacity: 0.85 }} />
        <Px style={{ position: "absolute", left: "67%", bottom: 112, width: 20, height: 28, backgroundColor: "#1E3325" }} />
        <Px style={{ position: "absolute", left: "68%", bottom: 120, width: 16, height: 16, backgroundColor: "#060A07" }} />
        <Px style={{ position: "absolute", left: "69%", bottom: 124, width: 12, height: 8, backgroundColor: "#9AA3AD" }} />
        <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 24, backgroundColor: "#0A0F0C" }} />
        <Px style={{ position: "absolute", left: "48%", bottom: 8, width: 44, height: 4, backgroundColor: "#58C96B" }} />
        <Px style={{ position: "absolute", left: "62%", bottom: 12, width: 32, height: 4, backgroundColor: "#58C96B" }} />
        <Px style={{ position: "absolute", left: "76%", bottom: 8, width: 40, height: 4, backgroundColor: "#3E9A4F" }} />
      </StepIn>
    </PixelSceneRoot>
  );
}

export function PixelMvShrekScene() {
  return (
    <PixelSceneRoot base="#C97B2D">
      <Px style={{ position: "absolute", left: "50%", bottom: 60, width: 44, height: 44, backgroundColor: "#F2C14E" }} />
      <View style={{ position: "absolute", left: "40%", right: 0, bottom: "34%", height: 12, backgroundColor: "#3E5C33" }} />
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "34%", backgroundColor: "#4C6B3C" }} />
      <Px style={{ position: "absolute", left: "44%", bottom: 8, width: 152, height: 32, backgroundColor: "#5D7A45" }} />
      <StepIn delay={60} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        <Px style={{ position: "absolute", left: "80%", bottom: 36, width: 44, height: 64, backgroundColor: "#6B4423" }} shadow />
        <Px style={{ position: "absolute", left: "78%", bottom: 96, width: 48, height: 8, backgroundColor: "#54382A" }} />
        <Px style={{ position: "absolute", left: "83%", bottom: 40, width: 24, height: 52, backgroundColor: "#7A5230" }} />
        <Px style={{ position: "absolute", left: "86%", bottom: 72, width: 12, height: 12, backgroundColor: "#C97B2D" }} />
        <Px style={{ position: "absolute", left: "46%", bottom: 20, width: 4, height: 28, backgroundColor: "#3E7C43" }} />
        <Px style={{ position: "absolute", left: "50%", bottom: 20, width: 4, height: 36, backgroundColor: "#3E7C43" }} />
        <Px style={{ position: "absolute", left: "54%", bottom: 20, width: 4, height: 28, backgroundColor: "#3E7C43" }} />
        <Px style={{ position: "absolute", left: "58%", bottom: 16, width: 24, height: 12, backgroundColor: "#3E7C43" }} />
        <Px style={{ position: "absolute", left: "72%", bottom: 12, width: 20, height: 8, backgroundColor: "#4C8A50" }} />
        <Px style={{ position: "absolute", left: "61%", bottom: 24, width: 8, height: 8, backgroundColor: "#E86A92" }} />
        <Px style={{ position: "absolute", left: "90%", bottom: 12, width: 24, height: 16, backgroundColor: "#5D4037" }} />
        <Px style={{ position: "absolute", left: "90%", bottom: 24, width: 24, height: 4, backgroundColor: "#8A6D4B" }} />
      </StepIn>
      <StepBlink style={{ position: "absolute", left: "52%", bottom: 68, width: 8, height: 8 }} period={1100}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 8, height: 8, backgroundColor: "#FFE082" }} />
      </StepBlink>
      <StepBlink style={{ position: "absolute", left: "68%", bottom: 84, width: 8, height: 8 }} period={1400}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 8, height: 8, backgroundColor: "#FFE082" }} />
      </StepBlink>
    </PixelSceneRoot>
  );
}

export function PixelMvHungerGamesScene() {
  return (
    <PixelSceneRoot base="#4A3423">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: "30%", height: 16, backgroundColor: "#E8B48F", opacity: 0.5 }} />
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "30%", backgroundColor: "#2E2015" }} />
      <Px style={{ position: "absolute", left: "84%", bottom: 44, width: 36, height: 36, backgroundColor: "#F2C14E" }} />
      <StepIn delay={60} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        <Px style={{ position: "absolute", left: "44%", bottom: 64, width: 24, height: 28, backgroundColor: "#22301F" }} />
        <Px style={{ position: "absolute", left: "44%", bottom: 40, width: 4, height: 28, backgroundColor: "#1A140E" }} />
        <Px style={{ position: "absolute", left: "53%", bottom: 64, width: 24, height: 28, backgroundColor: "#22301F" }} />
        <Px style={{ position: "absolute", left: "53%", bottom: 40, width: 4, height: 28, backgroundColor: "#1A140E" }} />
        <Px style={{ position: "absolute", left: "62%", bottom: 64, width: 24, height: 28, backgroundColor: "#22301F" }} />
        <Px style={{ position: "absolute", left: "86%", bottom: 68, width: 28, height: 32, backgroundColor: "#2C3A26" }} />
        <Px style={{ position: "absolute", left: "86%", bottom: 36, width: 4, height: 32, backgroundColor: "#1A140E" }} />
        <Px style={{ position: "absolute", left: "54%", bottom: 20, width: 132, height: 36, backgroundColor: "#3A2A1A" }} />
        <Px style={{ position: "absolute", left: "64%", bottom: 48, width: 44, height: 28, backgroundColor: "#C9A86A" }} shadow />
        <Px style={{ position: "absolute", left: "72%", bottom: 48, width: 24, height: 24, backgroundColor: "#2E2015" }} />
        <Px style={{ position: "absolute", left: "61%", bottom: 40, width: 20, height: 8, backgroundColor: "#A8894F" }} />
        <Px style={{ position: "absolute", left: "76%", bottom: 40, width: 12, height: 12, backgroundColor: "#7A5230" }} />
        <Px style={{ position: "absolute", left: "81%", bottom: 40, width: 12, height: 8, backgroundColor: "#5D6B57" }} />
      </StepIn>
      <StepBob left="52%" bottom={104} width={32} height={16} distance={4} period={1300}>
        <Px style={{ position: "absolute", left: 12, bottom: 4, width: 12, height: 8, backgroundColor: "#E8B34B" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 8, width: 12, height: 8, backgroundColor: "#C9A24E" }} />
        <Px style={{ position: "absolute", left: 20, bottom: 8, width: 12, height: 8, backgroundColor: "#C9A24E" }} />
        <Px style={{ position: "absolute", left: 12, bottom: 0, width: 8, height: 4, backgroundColor: "#C9A24E" }} />
      </StepBob>
    </PixelSceneRoot>
  );
}

export function PixelMvStreetFighterScene() {
  return (
    <PixelSceneRoot base="#7A2E4A">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: "30%", height: 12, backgroundColor: "#E8862D", opacity: 0.6 }} />
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "30%", backgroundColor: "#4A1E30" }} />
      <StepIn delay={60} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        <Px style={{ position: "absolute", left: "46%", bottom: 40, width: 172, height: 80, backgroundColor: "#5C2438" }} shadow />
        <Px style={{ position: "absolute", left: "43%", bottom: 120, width: 192, height: 12, backgroundColor: "#2C2C33" }} />
        <Px style={{ position: "absolute", left: "58%", bottom: 68, width: 44, height: 52, backgroundColor: "#6E2C44" }} />
        <Px style={{ position: "absolute", left: "44%", bottom: 136, width: 80, height: 12, backgroundColor: "#FFD54F" }} />
        <Px style={{ position: "absolute", left: "74%", bottom: 136, width: 80, height: 12, backgroundColor: "#D64545" }} />
        <Px style={{ position: "absolute", left: "66%", bottom: 136, width: 12, height: 12, backgroundColor: "#F4F1EA" }} />
        <Px style={{ position: "absolute", left: "66%", bottom: 64, width: 20, height: 20, backgroundColor: "#7FB3D5" }} />
      </StepIn>
      <PxFigure left="54%" bottom={36} body="#1E1B26" skin="#1E1B26" hair="#1E1B26" scale={1} />
      <PxFigure left="80%" bottom={36} body="#1E1B26" skin="#1E1B26" hair="#1E1B26" scale={1} />
      <StepBob left="50%" bottom={92} width={16} height={28} distance={4} period={1200}>
        <Px style={{ position: "absolute", left: 8, bottom: 20, width: 4, height: 8, backgroundColor: "#2C2C33" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 16, height: 20, backgroundColor: "#FFF3D6" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 8, width: 16, height: 4, backgroundColor: "#D64545" }} />
      </StepBob>
      <StepBob left="88%" bottom={92} width={16} height={28} distance={4} period={1400} delay={300}>
        <Px style={{ position: "absolute", left: 8, bottom: 20, width: 4, height: 8, backgroundColor: "#2C2C33" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 16, height: 20, backgroundColor: "#FFF3D6" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 8, width: 16, height: 4, backgroundColor: "#D64545" }} />
      </StepBob>
    </PixelSceneRoot>
  );
}

export function PixelMvWildwoodScene() {
  return (
    <PixelSceneRoot base="#16241C">
      <Px style={{ position: "absolute", left: "42%", bottom: 72, width: 32, height: 56, backgroundColor: "#1E3325" }} />
      <Px style={{ position: "absolute", left: "57%", bottom: 72, width: 32, height: 56, backgroundColor: "#1E3325" }} />
      <Px style={{ position: "absolute", left: "72%", bottom: 72, width: 32, height: 56, backgroundColor: "#1E3325" }} />
      <Px style={{ position: "absolute", left: "87%", bottom: 72, width: 32, height: 56, backgroundColor: "#1E3325" }} />
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "26%", backgroundColor: "#101A13" }} />
      <StepIn delay={60} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        <Px style={{ position: "absolute", left: "47%", bottom: 60, width: 36, height: 68, backgroundColor: "#24402E" }} shadow />
        <Px style={{ position: "absolute", left: "47%", bottom: 20, width: 4, height: 44, backgroundColor: "#0C120D" }} />
        <Px style={{ position: "absolute", left: "91%", bottom: 60, width: 36, height: 68, backgroundColor: "#24402E" }} />
        <Px style={{ position: "absolute", left: "91%", bottom: 20, width: 4, height: 44, backgroundColor: "#0C120D" }} />
        <Px style={{ position: "absolute", left: "62%", bottom: 0, width: 44, height: 24, backgroundColor: "#3A4A38" }} />
        <Px style={{ position: "absolute", left: "66%", bottom: 20, width: 32, height: 16, backgroundColor: "#33452F" }} />
        <Px style={{ position: "absolute", left: "58%", bottom: 8, width: 16, height: 8, backgroundColor: "#B565A7" }} />
        <Px style={{ position: "absolute", left: "60%", bottom: 0, width: 8, height: 8, backgroundColor: "#E8D8C8" }} />
        <Px style={{ position: "absolute", left: "80%", bottom: 16, width: 12, height: 8, backgroundColor: "#8A4A7A" }} />
        <Px style={{ position: "absolute", left: "68%", bottom: 96, width: 64, height: 8, backgroundColor: "#0C120D" }} />
        <Px style={{ position: "absolute", left: "86%", bottom: 120, width: 24, height: 24, backgroundColor: "#F5EFD8" }} />
      </StepIn>
      <StepBob left="74%" bottom={100} width={24} height={32} distance={4} period={1400}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 24, height: 24, backgroundColor: "#B07D4F" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 24, width: 8, height: 8, backgroundColor: "#96613A" }} />
        <Px style={{ position: "absolute", left: 16, bottom: 24, width: 8, height: 8, backgroundColor: "#96613A" }} />
        <Px style={{ position: "absolute", left: 4, bottom: 12, width: 8, height: 8, backgroundColor: "#F5EFD8" }} />
        <Px style={{ position: "absolute", left: 12, bottom: 12, width: 8, height: 8, backgroundColor: "#F5EFD8" }} />
        <Px style={{ position: "absolute", left: 4, bottom: 12, width: 4, height: 4, backgroundColor: "#16241C" }} />
        <Px style={{ position: "absolute", left: 16, bottom: 12, width: 4, height: 4, backgroundColor: "#16241C" }} />
      </StepBob>
    </PixelSceneRoot>
  );
}
