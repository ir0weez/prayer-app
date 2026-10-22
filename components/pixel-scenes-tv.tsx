// Pixel renditions of the TV keyword scenes for the 8-bit skin (v183),
// mirroring the paper scenes' compositions in chunky squares, stepped motion only.
import { View } from "react-native";
import { PixelSceneRoot, Px, StepIn, StepBob, StepBlink, PxSun, PxCloud, PxFigure } from "@/components/pixel-kit";

export function PixelTvGenericScene() {
  return (
    <PixelSceneRoot base="#2A2A4E">
      <Px style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "30%", backgroundColor: "#23233E" }} />
      <StepIn delay={40} style={{ position: "absolute", left: "50%", bottom: 24, width: 108, height: 96 }}>
        <Px style={{ position: "absolute", left: 44, bottom: 76, width: 4, height: 24, backgroundColor: "#9E9E9E" }} />
        <Px style={{ position: "absolute", left: 60, bottom: 76, width: 4, height: 24, backgroundColor: "#9E9E9E" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 12, width: 108, height: 68, backgroundColor: "#4A4A6A" }} />
        <Px style={{ position: "absolute", left: 8, bottom: 20, width: 72, height: 48, backgroundColor: "#E8721C" }} />
        <Px style={{ position: "absolute", left: 8, bottom: 20, width: 72, height: 24, backgroundColor: "#F48FB1" }} />
        <Px style={{ position: "absolute", left: 8, bottom: 20, width: 72, height: 12, backgroundColor: "#0E1428" }} />
        <Px style={{ position: "absolute", left: 88, bottom: 52, width: 12, height: 12, backgroundColor: "#9E9E9E" }} />
        <Px style={{ position: "absolute", left: 88, bottom: 32, width: 12, height: 12, backgroundColor: "#9E9E9E" }} />
        <Px style={{ position: "absolute", left: 12, bottom: 0, width: 12, height: 12, backgroundColor: "#4A4A6A" }} />
        <Px style={{ position: "absolute", left: 84, bottom: 0, width: 12, height: 12, backgroundColor: "#4A4A6A" }} />
        <Px style={{ position: "absolute", left: 28, bottom: 36, width: 20, height: 20, backgroundColor: "#F5E6A8" }} />
      </StepIn>
      <StepIn delay={200} style={{ position: "absolute", left: "40%", bottom: 8, width: 40, height: 32 }}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 40, height: 24, backgroundColor: "#6A5A8E" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 24, width: 40, height: 8, backgroundColor: "#4A4A6A" }} />
      </StepIn>
      <Px style={{ position: "absolute", left: "88%", bottom: 8, width: 32, height: 20, backgroundColor: "#6A5A8E" }} />
    </PixelSceneRoot>
  );
}

export function PixelTvDexterScene() {
  return (
    <PixelSceneRoot base="#7FDBE8">
      <PxSun left="76%" bottom={92} size={32} color="#FFD54F" core="#FFE98A" ray="#FFC531" />
      <Px style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "36%", backgroundColor: "#26A69A" }} />
      <Px style={{ position: "absolute", left: 0, right: 0, bottom: "36%", height: 8, backgroundColor: "#4DD0E1" }} />
      <Px style={{ position: "absolute", left: "52%", bottom: 24, width: 40, height: 4, backgroundColor: "#B2EBF2" }} />
      <Px style={{ position: "absolute", left: "70%", bottom: 12, width: 52, height: 4, backgroundColor: "#B2EBF2" }} />
      <StepIn delay={60} style={{ position: "absolute", left: "42%", bottom: 32, width: 48, height: 92 }}>
        <Px style={{ position: "absolute", left: 20, bottom: 0, width: 8, height: 60, backgroundColor: "#6D4C41" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 56, width: 40, height: 8, backgroundColor: "#2E7D32" }} />
        <Px style={{ position: "absolute", left: 8, bottom: 64, width: 36, height: 8, backgroundColor: "#388E3C" }} />
        <Px style={{ position: "absolute", left: 16, bottom: 72, width: 24, height: 8, backgroundColor: "#2E7D32" }} />
      </StepIn>
      <StepIn delay={180} style={{ position: "absolute", left: "86%", bottom: 36, width: 32, height: 68 }}>
        <Px style={{ position: "absolute", left: 12, bottom: 0, width: 8, height: 44, backgroundColor: "#6D4C41" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 40, width: 28, height: 8, backgroundColor: "#2E7D32" }} />
        <Px style={{ position: "absolute", left: 4, bottom: 48, width: 24, height: 8, backgroundColor: "#388E3C" }} />
      </StepIn>
    </PixelSceneRoot>
  );
}

export function PixelTvDexterNewBloodScene() {
  return (
    <PixelSceneRoot base="#2C3E50">
      <Px style={{ position: "absolute", left: "80%", bottom: 100, width: 32, height: 32, backgroundColor: "#ECEFF1" }} />
      <Px style={{ position: "absolute", left: "80%", bottom: 100, width: 8, height: 8, backgroundColor: "#B0BEC5" }} />
      <Px style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "30%", backgroundColor: "#90A4AE" }} />
      <Px style={{ position: "absolute", left: "52%", bottom: 20, width: 60, height: 4, backgroundColor: "#ECEFF1" }} />
      <Px style={{ position: "absolute", left: "74%", bottom: 8, width: 44, height: 4, backgroundColor: "#ECEFF1" }} />
      <StepIn delay={90} style={{ position: "absolute", left: "42%", bottom: 36, width: 68, height: 56 }}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 64, height: 36, backgroundColor: "#4E342E" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 36, width: 68, height: 12, backgroundColor: "#5D4037" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 48, width: 68, height: 8, backgroundColor: "#ECEFF1" }} />
        <Px style={{ position: "absolute", left: 24, bottom: 8, width: 16, height: 16, backgroundColor: "#FFB74D" }} />
      </StepIn>
      <StepIn delay={170} style={{ position: "absolute", left: "68%", bottom: 36, width: 40, height: 84 }}>
        <Px style={{ position: "absolute", left: 16, bottom: 0, width: 8, height: 20, backgroundColor: "#3E2723" }} />
        <Px style={{ position: "absolute", left: 4, bottom: 16, width: 32, height: 20, backgroundColor: "#1B5E20" }} />
        <Px style={{ position: "absolute", left: 8, bottom: 36, width: 24, height: 20, backgroundColor: "#1B5E20" }} />
        <Px style={{ position: "absolute", left: 12, bottom: 56, width: 16, height: 16, backgroundColor: "#1B5E20" }} />
        <Px style={{ position: "absolute", left: 8, bottom: 52, width: 24, height: 4, backgroundColor: "#ECEFF1" }} />
      </StepIn>
      <StepIn delay={250} style={{ position: "absolute", left: "88%", bottom: 36, width: 28, height: 60 }}>
        <Px style={{ position: "absolute", left: 12, bottom: 0, width: 8, height: 16, backgroundColor: "#3E2723" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 12, width: 28, height: 20, backgroundColor: "#1B5E20" }} />
        <Px style={{ position: "absolute", left: 4, bottom: 32, width: 20, height: 16, backgroundColor: "#1B5E20" }} />
      </StepIn>
      <Px style={{ position: "absolute", left: "48%", bottom: 108, width: 4, height: 4, backgroundColor: "#FFFFFF" }} />
      <Px style={{ position: "absolute", left: "60%", bottom: 88, width: 4, height: 4, backgroundColor: "#FFFFFF" }} />
      <Px style={{ position: "absolute", left: "72%", bottom: 118, width: 8, height: 8, backgroundColor: "#FFFFFF" }} />
    </PixelSceneRoot>
  );
}

export function PixelTvDexterOriginalSinScene() {
  return (
    <PixelSceneRoot base="#1A0B2E">
      <Px style={{ position: "absolute", left: "40%", right: 0, bottom: 40, height: 4, backgroundColor: "#E040FB" }} />
      <Px style={{ position: "absolute", left: "58%", bottom: 0, width: 4, height: 40, backgroundColor: "#E040FB" }} />
      <Px style={{ position: "absolute", left: "76%", bottom: 0, width: 4, height: 40, backgroundColor: "#E040FB" }} />
      <Px style={{ position: "absolute", left: "92%", bottom: 0, width: 4, height: 40, backgroundColor: "#E040FB" }} />
      <StepIn delay={70} style={{ position: "absolute", left: "58%", bottom: 48, width: 72, height: 72 }}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 72, height: 72, backgroundColor: "#FF6E40" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 8, width: 72, height: 12, backgroundColor: "#1A0B2E" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 28, width: 72, height: 8, backgroundColor: "#1A0B2E" }} />
        <Px style={{ position: "absolute", left: 16, bottom: 44, width: 40, height: 16, backgroundColor: "#FF8A65" }} />
      </StepIn>
      <StepIn delay={160} style={{ position: "absolute", left: "42%", bottom: 32, width: 48, height: 92 }}>
        <Px style={{ position: "absolute", left: 20, bottom: 0, width: 8, height: 60, backgroundColor: "#0D0518" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 56, width: 40, height: 8, backgroundColor: "#00E5FF" }} />
        <Px style={{ position: "absolute", left: 8, bottom: 68, width: 36, height: 8, backgroundColor: "#E040FB" }} />
        <Px style={{ position: "absolute", left: 16, bottom: 80, width: 24, height: 8, backgroundColor: "#00E5FF" }} />
      </StepIn>
      <StepBob left="84%" bottom={84} width={16} height={24} distance={4} period={1100} delay={0}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 16, height: 16, backgroundColor: "#E53935" }} />
        <Px style={{ position: "absolute", left: 4, bottom: 16, width: 8, height: 8, backgroundColor: "#E53935" }} />
      </StepBob>
    </PixelSceneRoot>
  );
}

export function PixelTvDexterResurrectionScene() {
  return (
    <PixelSceneRoot base="#33121B">
      <Px style={{ position: "absolute", left: "46%", right: 0, bottom: 0, height: "20%", backgroundColor: "#241016" }} />
      <StepIn delay={80} style={{ position: "absolute", left: "62%", bottom: 24, width: 60, height: 68 }}>
        <Px style={{ position: "absolute", left: 20, bottom: 0, width: 16, height: 12, backgroundColor: "#160A0E" }} />
        <Px style={{ position: "absolute", left: 4, bottom: 8, width: 48, height: 8, backgroundColor: "#160A0E" }} />
        <Px style={{ position: "absolute", left: 28, bottom: 12, width: 8, height: 32, backgroundColor: "#160A0E" }} />
        <Px style={{ position: "absolute", left: 12, bottom: 44, width: 28, height: 12, backgroundColor: "#160A0E" }} />
        <Px style={{ position: "absolute", left: 4, bottom: 52, width: 12, height: 12, backgroundColor: "#0E0609" }} />
        <Px style={{ position: "absolute", left: 8, bottom: 56, width: 4, height: 4, backgroundColor: "#E53935" }} />
      </StepIn>
      <StepIn delay={180} style={{ position: "absolute", left: "48%", bottom: 28, width: 36, height: 16 }}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 36, height: 12, backgroundColor: "#7B1E1E" }} />
        <Px style={{ position: "absolute", left: 8, bottom: 4, width: 20, height: 4, backgroundColor: "#E53935" }} />
      </StepIn>
      <StepBob left="86%" bottom={68} width={16} height={20} distance={4} period={1000} delay={200}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 16, height: 12, backgroundColor: "#E53935" }} />
        <Px style={{ position: "absolute", left: 4, bottom: 12, width: 8, height: 8, backgroundColor: "#E53935" }} />
      </StepBob>
      <Px style={{ position: "absolute", left: "92%", bottom: 96, width: 8, height: 8, backgroundColor: "#C62828" }} />
      <Px style={{ position: "absolute", left: "56%", bottom: 104, width: 8, height: 8, backgroundColor: "#FF8A80" }} />
    </PixelSceneRoot>
  );
}

export function PixelTvWalkingDeadScene() {
  return (
    <PixelSceneRoot base="#5E5E5C">
      <Px style={{ position: "absolute", left: 0, right: 0, top: 0, height: "45%", backgroundColor: "#6E6E6C" }} />
      <Px style={{ position: "absolute", left: "40%", right: 0, bottom: 0, height: 28, backgroundColor: "#3E3E3C" }} />
      <Px style={{ position: "absolute", left: "54%", bottom: 12, width: 56, height: 4, backgroundColor: "#8E8E8A" }} />
      <Px style={{ position: "absolute", left: "80%", bottom: 12, width: 36, height: 4, backgroundColor: "#8E8E8A" }} />
      <StepIn delay={70} style={{ position: "absolute", left: "52%", bottom: 20, width: 76, height: 48 }}>
        <Px style={{ position: "absolute", left: 0, bottom: 12, width: 76, height: 20, backgroundColor: "#2E2E2C" }} />
        <Px style={{ position: "absolute", left: 12, bottom: 28, width: 52, height: 16, backgroundColor: "#2E2E2C" }} />
        <Px style={{ position: "absolute", left: 20, bottom: 32, width: 36, height: 8, backgroundColor: "#4E5E6E" }} />
        <Px style={{ position: "absolute", left: 8, bottom: 0, width: 16, height: 16, backgroundColor: "#1E1E1C" }} />
        <Px style={{ position: "absolute", left: 52, bottom: 0, width: 16, height: 16, backgroundColor: "#1E1E1C" }} />
      </StepIn>
      <StepIn delay={180} style={{ position: "absolute", left: "88%", bottom: 20, width: 32, height: 72 }}>
        <Px style={{ position: "absolute", left: 12, bottom: 0, width: 8, height: 56, backgroundColor: "#2A2522" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 40, width: 16, height: 4, backgroundColor: "#2A2522" }} />
        <Px style={{ position: "absolute", left: 16, bottom: 48, width: 16, height: 4, backgroundColor: "#2A2522" }} />
        <Px style={{ position: "absolute", left: 4, bottom: 56, width: 12, height: 4, backgroundColor: "#2A2522" }} />
      </StepIn>
      <Px style={{ position: "absolute", left: "66%", bottom: 96, width: 8, height: 8, backgroundColor: "#9E9E9A" }} />
      <Px style={{ position: "absolute", left: "46%", bottom: 72, width: 8, height: 8, backgroundColor: "#9E9E9A" }} />
    </PixelSceneRoot>
  );
}

export function PixelTvChosenScene() {
  return (
    <PixelSceneRoot base="#3A6E9E">
      <Px style={{ position: "absolute", left: 0, right: 0, top: 0, height: "38%", backgroundColor: "#F4A259" }} />
      <Px style={{ position: "absolute", left: 0, right: 0, top: "30%", height: "14%", backgroundColor: "#E88B4A" }} />
      <PxSun left="74%" bottom={60} size={28} color="#FFD9A0" core="#FFE8B0" ray="#F4A259" />
      <Px style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "42%", backgroundColor: "#2E5A7E" }} />
      <Px style={{ position: "absolute", left: "46%", right: 0, bottom: 40, height: 4, backgroundColor: "#5E8EAE" }} />
      <Px style={{ position: "absolute", left: "60%", right: 0, bottom: 24, height: 4, backgroundColor: "#5E8EAE" }} />
      <StepBob left="56%" bottom={16} width={92} height={56} distance={4} period={1200} delay={0}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 92, height: 24, backgroundColor: "#6E4E2E" }} />
        <Px style={{ position: "absolute", left: 4, bottom: 24, width: 84, height: 8, backgroundColor: "#5A3E24" }} />
        <Px style={{ position: "absolute", left: 44, bottom: 32, width: 8, height: 24, backgroundColor: "#4E3420" }} />
        <Px style={{ position: "absolute", left: 24, bottom: 36, width: 44, height: 16, backgroundColor: "#E8DCC0" }} />
      </StepBob>
    </PixelSceneRoot>
  );
}

export function PixelTvBearScene() {
  return (
    <PixelSceneRoot base="#4A2E1C">
      <StepIn delay={40} style={{ position: "absolute", left: "50%", bottom: 108, width: 172, height: 36 }}>
        <Px style={{ position: "absolute", left: 0, bottom: 28, width: 172, height: 8, backgroundColor: "#8E8E8E" }} />
        <Px style={{ position: "absolute", left: 8, bottom: 0, width: 20, height: 24, backgroundColor: "#F5F5F5" }} />
        <Px style={{ position: "absolute", left: 64, bottom: 0, width: 20, height: 24, backgroundColor: "#F5F5F5" }} />
        <Px style={{ position: "absolute", left: 120, bottom: 0, width: 20, height: 24, backgroundColor: "#F5F5F5" }} />
      </StepIn>
      <StepBob left="58%" bottom={48} width={32} height={48} distance={4} period={1100} delay={0}>
        <Px style={{ position: "absolute", left: 12, bottom: 32, width: 8, height: 16, backgroundColor: "#9E9E9E" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 32, height: 32, backgroundColor: "#3E3E3E" }} />
        <Px style={{ position: "absolute", left: 8, bottom: 8, width: 16, height: 16, backgroundColor: "#2A2A2A" }} />
      </StepBob>
      <StepBob left="76%" bottom={48} width={28} height={44} distance={4} period={1300} delay={300}>
        <Px style={{ position: "absolute", left: 12, bottom: 28, width: 4, height: 16, backgroundColor: "#9E9E9E" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 12, width: 28, height: 16, backgroundColor: "#5E5E5E" }} />
        <Px style={{ position: "absolute", left: 4, bottom: 0, width: 20, height: 12, backgroundColor: "#5E5E5E" }} />
      </StepBob>
      <Px style={{ position: "absolute", left: "64%", bottom: 36, width: 8, height: 12, backgroundColor: "#FFFFFF" }} />
      <Px style={{ position: "absolute", left: "72%", bottom: 40, width: 8, height: 8, backgroundColor: "#FFFFFF" }} />
      <Px style={{ position: "absolute", left: "48%", right: 0, bottom: 0, height: 24, backgroundColor: "#33200F" }} />
    </PixelSceneRoot>
  );
}

export function PixelTvSopranosScene() {
  return (
    <PixelSceneRoot base="#8EC9E8">
      <PxSun left="88%" bottom={108} size={24} color="#FFD54F" core="#FFE98A" ray="#FFC531" />
      <PxCloud left="58%" top={8} width={68} color="#EAF4FF" shade="#C9DDF2" />
      <StepIn delay={50} style={{ position: "absolute", left: "42%", bottom: 52, width: 148, height: 92 }}>
        <Px style={{ position: "absolute", left: 16, bottom: 0, width: 108, height: 56, backgroundColor: "#FFF3E0" }} shadow />
        <Px style={{ position: "absolute", left: 8, bottom: 56, width: 124, height: 12, backgroundColor: "#8D4000" }} />
        <Px style={{ position: "absolute", left: 24, bottom: 68, width: 92, height: 12, backgroundColor: "#8D4000" }} />
        <Px style={{ position: "absolute", left: 40, bottom: 80, width: 60, height: 12, backgroundColor: "#A85A1A" }} />
        <Px style={{ position: "absolute", left: 104, bottom: 60, width: 12, height: 24, backgroundColor: "#A1887F" }} />
        <Px style={{ position: "absolute", left: 28, bottom: 24, width: 16, height: 20, backgroundColor: "#FFD54F" }} />
        <Px style={{ position: "absolute", left: 84, bottom: 24, width: 16, height: 20, backgroundColor: "#7FB3D5" }} />
        <Px style={{ position: "absolute", left: 56, bottom: 0, width: 20, height: 32, backgroundColor: "#5D4037" }} />
      </StepIn>
      <Px style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "36%", backgroundColor: "#4E9A51" }} />
      <Px style={{ position: "absolute", left: "38%", right: 0, bottom: 52, height: 4, backgroundColor: "#F5F0E6" }} />
      <Px style={{ position: "absolute", left: "38%", right: 0, bottom: 64, height: 4, backgroundColor: "#F5F0E6" }} />
      <StepIn delay={130} style={{ position: "absolute", left: "34%", bottom: 40, width: 40, height: 68 }}>
        <Px style={{ position: "absolute", left: 16, bottom: 0, width: 8, height: 32, backgroundColor: "#6D4C41" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 28, width: 40, height: 32, backgroundColor: "#2E7D32" }} />
        <Px style={{ position: "absolute", left: 8, bottom: 44, width: 24, height: 20, backgroundColor: "#388E3C" }} />
      </StepIn>
      <StepIn delay={190} style={{ position: "absolute", left: "50%", bottom: 4, width: 180, height: 52 }}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 180, height: 52, backgroundColor: "#E8DCC0" }} shadow />
        <Px style={{ position: "absolute", left: 8, bottom: 8, width: 164, height: 36, backgroundColor: "#29B6F6" }} />
        <Px style={{ position: "absolute", left: 20, bottom: 12, width: 88, height: 16, backgroundColor: "#4FC3F7" }} />
        <Px style={{ position: "absolute", left: 120, bottom: 12, width: 32, height: 16, backgroundColor: "#29B6F6" }} />
        <Px style={{ position: "absolute", left: 124, bottom: 16, width: 24, height: 8, backgroundColor: "#B3E5FC" }} />
      </StepIn>
      <StepBob left="57%" bottom={24} width={48} height={32} distance={4} period={1000} delay={0}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 36, height: 20, backgroundColor: "#FFFFFF" }} />
        <Px style={{ position: "absolute", left: 28, bottom: 16, width: 16, height: 16, backgroundColor: "#FFFFFF" }} />
        <Px style={{ position: "absolute", left: 44, bottom: 20, width: 8, height: 4, backgroundColor: "#F5A623" }} />
        <Px style={{ position: "absolute", left: 36, bottom: 24, width: 4, height: 4, backgroundColor: "#263238" }} />
      </StepBob>
      <StepBob left="52%" bottom={12} width={24} height={20} distance={4} period={800} delay={300}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 20, height: 12, backgroundColor: "#FFF9C4" }} />
        <Px style={{ position: "absolute", left: 12, bottom: 8, width: 12, height: 12, backgroundColor: "#FFF9C4" }} />
        <Px style={{ position: "absolute", left: 20, bottom: 12, width: 4, height: 4, backgroundColor: "#F5A623" }} />
      </StepBob>
      <StepBob left="76%" bottom={20} width={44} height={28} distance={4} period={1400} delay={600}>
        <Px style={{ position: "absolute", left: 8, bottom: 0, width: 36, height: 20, backgroundColor: "#FFFFFF" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 12, width: 16, height: 16, backgroundColor: "#FFFFFF" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 4, width: 4, height: 4, backgroundColor: "#F5A623" }} />
        <Px style={{ position: "absolute", left: 4, bottom: 20, width: 4, height: 4, backgroundColor: "#263238" }} />
      </StepBob>
    </PixelSceneRoot>
  );
}

export function PixelTvSkinsScene() {
  return (
    <PixelSceneRoot base="#2A2440">
      <StepIn delay={30} style={{ position: "absolute", left: "50%", bottom: 0, width: 44, height: 52 }}>
        <Px style={{ width: 44, height: 52, backgroundColor: "#1E1A30" }} />
      </StepIn>
      <StepIn delay={90} style={{ position: "absolute", left: "63%", bottom: 0, width: 56, height: 72 }}>
        <Px style={{ width: 56, height: 72, backgroundColor: "#221E36" }} />
      </StepIn>
      <StepIn delay={150} style={{ position: "absolute", left: "82%", bottom: 0, width: 48, height: 60 }}>
        <Px style={{ width: 48, height: 60, backgroundColor: "#1E1A30" }} />
      </StepIn>
      <Px style={{ position: "absolute", left: "67%", bottom: 44, width: 8, height: 8, backgroundColor: "#FFD54F" }} />
      <Px style={{ position: "absolute", left: "76%", bottom: 56, width: 8, height: 8, backgroundColor: "#FFD54F" }} />
      <Px style={{ position: "absolute", left: "88%", bottom: 32, width: 8, height: 8, backgroundColor: "#FFD54F" }} />
      <Px style={{ position: "absolute", left: "56%", bottom: 24, width: 8, height: 8, backgroundColor: "#FFD54F" }} />
      <Px style={{ position: "absolute", left: "50%", bottom: 104, width: 180, height: 4, backgroundColor: "#14121E" }} />
      <StepBlink period={900} style={{ position: "absolute", left: "53%", bottom: 92, width: 8, height: 8 }}><Px style={{ width: 8, height: 8, backgroundColor: "#FFD54F" }} /></StepBlink>
      <Px style={{ position: "absolute", left: "60%", bottom: 84, width: 8, height: 8, backgroundColor: "#FF8A80" }} />
      <Px style={{ position: "absolute", left: "67%", bottom: 80, width: 8, height: 8, backgroundColor: "#82B1FF" }} />
      <Px style={{ position: "absolute", left: "74%", bottom: 84, width: 8, height: 8, backgroundColor: "#FFD54F" }} />
      <Px style={{ position: "absolute", left: "81%", bottom: 92, width: 8, height: 8, backgroundColor: "#B388FF" }} />
    </PixelSceneRoot>
  );
}

export function PixelTvGotScene() {
  return (
    <PixelSceneRoot base="#2E3A4E">
      <StepIn delay={50} style={{ position: "absolute", left: "48%", bottom: 0, width: 116, height: 104 }}>
        <Px style={{ position: "absolute", left: 32, bottom: 0, width: 52, height: 60, backgroundColor: "#3A4A5E" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 28, height: 80, backgroundColor: "#33415A" }} />
        <Px style={{ position: "absolute", left: 88, bottom: 0, width: 28, height: 80, backgroundColor: "#33415A" }} />
        <Px style={{ position: "absolute", left: 36, bottom: 60, width: 8, height: 8, backgroundColor: "#3A4A5E" }} />
        <Px style={{ position: "absolute", left: 56, bottom: 60, width: 8, height: 8, backgroundColor: "#3A4A5E" }} />
        <Px style={{ position: "absolute", left: 72, bottom: 60, width: 8, height: 8, backgroundColor: "#3A4A5E" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 76, width: 32, height: 8, backgroundColor: "#E8EDF2" }} />
        <Px style={{ position: "absolute", left: 84, bottom: 76, width: 32, height: 8, backgroundColor: "#E8EDF2" }} />
        <Px style={{ position: "absolute", left: 32, bottom: 56, width: 52, height: 4, backgroundColor: "#E8EDF2" }} />
        <Px style={{ position: "absolute", left: 52, bottom: 20, width: 8, height: 12, backgroundColor: "#FFD54F" }} />
        <Px style={{ position: "absolute", left: 12, bottom: 40, width: 8, height: 8, backgroundColor: "#FFD54F" }} />
      </StepIn>
      <StepIn delay={220} style={{ position: "absolute", left: "86%", bottom: 0, width: 44, height: 64 }}>
        <Px style={{ position: "absolute", left: 8, bottom: 0, width: 28, height: 16, backgroundColor: "#1E2A3A" }} />
        <Px style={{ position: "absolute", left: 8, bottom: 16, width: 28, height: 32, backgroundColor: "#24344A" }} />
        <Px style={{ position: "absolute", left: 4, bottom: 48, width: 8, height: 16, backgroundColor: "#24344A" }} />
        <Px style={{ position: "absolute", left: 18, bottom: 48, width: 8, height: 16, backgroundColor: "#24344A" }} />
        <Px style={{ position: "absolute", left: 32, bottom: 48, width: 8, height: 16, backgroundColor: "#24344A" }} />
      </StepIn>
      <Px style={{ position: "absolute", left: "46%", bottom: 116, width: 4, height: 4, backgroundColor: "#FFFFFF" }} />
      <Px style={{ position: "absolute", left: "58%", bottom: 96, width: 4, height: 4, backgroundColor: "#FFFFFF" }} />
      <Px style={{ position: "absolute", left: "70%", bottom: 120, width: 8, height: 8, backgroundColor: "#FFFFFF" }} />
      <Px style={{ position: "absolute", left: "82%", bottom: 104, width: 4, height: 4, backgroundColor: "#FFFFFF" }} />
    </PixelSceneRoot>
  );
}

export function PixelTvDbzScene() {
  return (
    <PixelSceneRoot base="#C25E1E">
      <Px style={{ position: "absolute", left: 0, right: 0, top: 0, height: "40%", backgroundColor: "#E8823A" }} />
      <StepIn delay={60} style={{ position: "absolute", left: "56%", bottom: 12, width: 96, height: 96 }}>
        <Px style={{ position: "absolute", left: 8, bottom: 8, width: 80, height: 80, backgroundColor: "#FFE082" }} />
        <Px style={{ position: "absolute", left: 16, bottom: 16, width: 64, height: 64, backgroundColor: "#C25E1E" }} />
      </StepIn>
      <StepIn delay={120} style={{ position: "absolute", left: "63%", bottom: 20, width: 52, height: 84 }}>
        <Px style={{ position: "absolute", left: 4, bottom: 56, width: 8, height: 24, backgroundColor: "#2A1E12" }} />
        <Px style={{ position: "absolute", left: 16, bottom: 60, width: 8, height: 24, backgroundColor: "#2A1E12" }} />
        <Px style={{ position: "absolute", left: 28, bottom: 60, width: 8, height: 24, backgroundColor: "#2A1E12" }} />
        <Px style={{ position: "absolute", left: 40, bottom: 56, width: 8, height: 24, backgroundColor: "#2A1E12" }} />
        <Px style={{ position: "absolute", left: 16, bottom: 40, width: 20, height: 16, backgroundColor: "#2A1E12" }} />
        <Px style={{ position: "absolute", left: 12, bottom: 0, width: 28, height: 40, backgroundColor: "#2A1E12" }} />
      </StepIn>
      <StepBob left="46%" bottom={44} width={16} height={16} distance={8} period={1000} delay={0}>
        <Px style={{ width: 16, height: 16, backgroundColor: "#6E4E30" }} />
      </StepBob>
      <StepBob left="86%" bottom={56} width={16} height={16} distance={8} period={1200} delay={400}>
        <Px style={{ width: 16, height: 16, backgroundColor: "#6E4E30" }} />
      </StepBob>
      <StepBob left="92%" bottom={24} width={12} height={12} distance={4} period={900} delay={700}>
        <Px style={{ width: 12, height: 12, backgroundColor: "#7A5636" }} />
      </StepBob>
    </PixelSceneRoot>
  );
}

export function PixelTvSoaScene() {
  return (
    <PixelSceneRoot base="#5E3A52">
      <Px style={{ position: "absolute", left: 0, right: 0, top: 0, height: "36%", backgroundColor: "#8E5A72" }} />
      <Px style={{ position: "absolute", left: "72%", bottom: 64, width: 36, height: 36, backgroundColor: "#E8A05C" }} />
      <Px style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "38%", backgroundColor: "#3E2A3E" }} />
      <Px style={{ position: "absolute", left: "44%", right: 0, bottom: 8, height: 28, backgroundColor: "#2A2430" }} />
      <Px style={{ position: "absolute", left: "56%", bottom: 20, width: 48, height: 4, backgroundColor: "#C9B458" }} />
      <Px style={{ position: "absolute", left: "80%", bottom: 20, width: 44, height: 4, backgroundColor: "#C9B458" }} />
      <StepIn delay={120} style={{ position: "absolute", left: "56%", bottom: 28, width: 88, height: 52 }}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 24, height: 24, backgroundColor: "#16121E" }} />
        <Px style={{ position: "absolute", left: 8, bottom: 8, width: 8, height: 8, backgroundColor: "#5E3A52" }} />
        <Px style={{ position: "absolute", left: 64, bottom: 0, width: 24, height: 24, backgroundColor: "#16121E" }} />
        <Px style={{ position: "absolute", left: 72, bottom: 8, width: 8, height: 8, backgroundColor: "#5E3A52" }} />
        <Px style={{ position: "absolute", left: 12, bottom: 16, width: 60, height: 8, backgroundColor: "#16121E" }} />
        <Px style={{ position: "absolute", left: 64, bottom: 20, width: 8, height: 16, backgroundColor: "#16121E" }} />
        <Px style={{ position: "absolute", left: 28, bottom: 20, width: 24, height: 16, backgroundColor: "#16121E" }} />
        <Px style={{ position: "absolute", left: 36, bottom: 36, width: 12, height: 12, backgroundColor: "#16121E" }} />
      </StepIn>
      <Px style={{ position: "absolute", left: "76%", bottom: 40, width: 12, height: 12, backgroundColor: "#FFE082" }} />
      <StepBob left="64%" bottom={96} width={40} height={16} distance={4} period={1200} delay={0}>
        <Px style={{ position: "absolute", left: 0, bottom: 4, width: 16, height: 4, backgroundColor: "#14101A" }} />
        <Px style={{ position: "absolute", left: 24, bottom: 4, width: 16, height: 4, backgroundColor: "#14101A" }} />
        <Px style={{ position: "absolute", left: 16, bottom: 0, width: 8, height: 8, backgroundColor: "#14101A" }} />
      </StepBob>
    </PixelSceneRoot>
  );
}

export function PixelTvReacherScene() {
  return (
    <PixelSceneRoot base="#7A5230">
      <Px style={{ position: "absolute", left: 0, right: 0, top: 0, height: "42%", backgroundColor: "#D88A4A" }} />
      <PxSun left="68%" bottom={56} size={32} color="#FFD9A0" core="#FFE8B0" ray="#D88A4A" />
      <Px style={{ position: "absolute", left: "46%", right: 0, bottom: 0, height: 44, backgroundColor: "#4A3826" }} />
      <Px style={{ position: "absolute", left: "60%", bottom: 20, width: 64, height: 4, backgroundColor: "#D8C090" }} />
      <Px style={{ position: "absolute", left: "84%", bottom: 20, width: 44, height: 4, backgroundColor: "#D8C090" }} />
      <StepIn delay={140} style={{ position: "absolute", left: "57%", bottom: 36, width: 32, height: 20 }}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 32, height: 16, backgroundColor: "#3A2E22" }} />
        <Px style={{ position: "absolute", left: 4, bottom: 16, width: 24, height: 4, backgroundColor: "#2A211A" }} />
      </StepIn>
      <PxFigure left="71%" bottom={32} body="#241A12" skin="#241A12" hair="#241A12" scale={1.4} />
    </PixelSceneRoot>
  );
}

export function PixelTvFromScene() {
  return (
    <PixelSceneRoot base="#14141F">
      <Px style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "16%", backgroundColor: "#0C0C14" }} />
      <StepIn delay={50} style={{ position: "absolute", left: "48%", bottom: 20, width: 48, height: 60 }}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 48, height: 44, backgroundColor: "#0E0E16" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 44, width: 48, height: 12, backgroundColor: "#0E0E16" }} />
        <Px style={{ position: "absolute", left: 8, bottom: 16, width: 8, height: 8, backgroundColor: "#FFE082" }} />
      </StepIn>
      <StepIn delay={130} style={{ position: "absolute", left: "68%", bottom: 20, width: 40, height: 40 }}>
        <Px style={{ width: 40, height: 40, backgroundColor: "#0E0E16" }} />
      </StepIn>
      <StepIn delay={200} style={{ position: "absolute", left: "86%", bottom: 20, width: 32, height: 76 }}>
        <Px style={{ position: "absolute", left: 12, bottom: 0, width: 8, height: 28, backgroundColor: "#0A0F0A" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 24, width: 32, height: 28, backgroundColor: "#0A0F0A" }} />
        <Px style={{ position: "absolute", left: 4, bottom: 48, width: 24, height: 20, backgroundColor: "#0C120C" }} />
      </StepIn>
      <StepIn delay={100} style={{ position: "absolute", left: "59%", bottom: 20, width: 20, height: 88 }}>
        <Px style={{ position: "absolute", left: 8, bottom: 0, width: 4, height: 72, backgroundColor: "#08080E" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 72, width: 20, height: 12, backgroundColor: "#08080E" }} />
      </StepIn>
      <StepBlink period={1000} style={{ position: "absolute", left: "60%", bottom: 92, width: 12, height: 8 }}><Px style={{ width: 12, height: 8, backgroundColor: "#FFE082" }} /></StepBlink>
      <StepBob left="76%" bottom={84} width={16} height={28} distance={4} period={1200} delay={0}>
        <Px style={{ position: "absolute", left: 8, bottom: 16, width: 4, height: 12, backgroundColor: "#5E5E6E" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 16, height: 16, backgroundColor: "#8E8E9E" }} />
      </StepBob>
      <StepBob left="52%" bottom={92} width={12} height={24} distance={4} period={1400} delay={500}>
        <Px style={{ position: "absolute", left: 4, bottom: 12, width: 4, height: 12, backgroundColor: "#5E5E6E" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 12, height: 12, backgroundColor: "#7E7E8E" }} />
      </StepBob>
    </PixelSceneRoot>
  );
}

export function PixelTvDaredevilScene() {
  return (
    <PixelSceneRoot base="#471A1A">
      <StepIn delay={60} style={{ position: "absolute", left: "48%", bottom: 24, width: 28, height: 64 }}>
        <Px style={{ width: 28, height: 64, backgroundColor: "#2A1010" }} />
      </StepIn>
      <StepIn delay={60} style={{ position: "absolute", left: "59%", bottom: 24, width: 36, height: 88 }}>
        <Px style={{ width: 36, height: 88, backgroundColor: "#331414" }} />
      </StepIn>
      <StepIn delay={60} style={{ position: "absolute", left: "72%", bottom: 24, width: 28, height: 56 }}>
        <Px style={{ width: 28, height: 56, backgroundColor: "#2A1010" }} />
      </StepIn>
      <StepIn delay={60} style={{ position: "absolute", left: "82%", bottom: 24, width: 32, height: 76 }}>
        <Px style={{ width: 32, height: 76, backgroundColor: "#331414" }} />
      </StepIn>
      <Px style={{ position: "absolute", left: "63%", bottom: 72, width: 8, height: 8, backgroundColor: "#FF8A65" }} />
      <Px style={{ position: "absolute", left: "69%", bottom: 56, width: 8, height: 8, backgroundColor: "#FF8A65" }} />
      <Px style={{ position: "absolute", left: "86%", bottom: 60, width: 8, height: 8, backgroundColor: "#FF8A65" }} />
      <Px style={{ position: "absolute", left: "52%", bottom: 48, width: 8, height: 8, backgroundColor: "#FF8A65" }} />
      <Px style={{ position: "absolute", left: "77%", bottom: 40, width: 8, height: 8, backgroundColor: "#FF8A65" }} />
      <Px style={{ position: "absolute", left: "44%", right: 0, bottom: 0, height: 24, backgroundColor: "#1E0C0C" }} />
      <Px style={{ position: "absolute", left: "75%", bottom: 24, width: 4, height: 32, backgroundColor: "#1E0C0C" }} />
      <StepBlink period={1100} style={{ position: "absolute", left: "74%", bottom: 56, width: 8, height: 8 }}><Px style={{ width: 8, height: 8, backgroundColor: "#E53935" }} /></StepBlink>
    </PixelSceneRoot>
  );
}

export function PixelTvPluribusScene() {
  return (
    <PixelSceneRoot base="#B89AB0">
      <Px style={{ position: "absolute", left: 0, right: 0, top: 0, height: "30%", backgroundColor: "#D8BFD0" }} />
      <Px style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 28, backgroundColor: "#8E7488" }} />
      <Px style={{ position: "absolute", left: "46%", right: 0, bottom: 12, height: 4, backgroundColor: "#D8C8D2" }} />
      <StepIn delay={120} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        <PxFigure left="53%" bottom={24} body="#4A3A44" skin="#4A3A44" hair="#4A3A44" scale={1.1} />
        <PxFigure left="63%" bottom={24} body="#4A3A44" skin="#4A3A44" hair="#4A3A44" scale={1.1} />
        <PxFigure left="73%" bottom={24} body="#4A3A44" skin="#4A3A44" hair="#4A3A44" scale={1.1} />
        <PxFigure left="83%" bottom={24} body="#4A3A44" skin="#4A3A44" hair="#4A3A44" scale={1.1} />
      </StepIn>
    </PixelSceneRoot>
  );
}

export function PixelTvBreakingBadScene() {
  return (
    <PixelSceneRoot base="#A85E28">
      <Px style={{ position: "absolute", left: 0, right: 0, top: 0, height: "42%", backgroundColor: "#E8913F" }} />
      <Px style={{ position: "absolute", left: 0, right: 0, top: "32%", height: "16%", backgroundColor: "#D97A2E" }} />
      <PxSun left="71%" bottom={60} size={28} color="#FFD9A0" core="#FFE8B0" ray="#E8913F" />
      <Px style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "34%", backgroundColor: "#8A4E20" }} />
      <StepBob left="50%" bottom={20} width={100} height={56} distance={4} period={1400} delay={0}>
        <Px style={{ position: "absolute", left: 0, bottom: 12, width: 100, height: 36, backgroundColor: "#E8DCC0" }} shadow />
        <Px style={{ position: "absolute", left: 4, bottom: 28, width: 32, height: 16, backgroundColor: "#5E7A8A" }} />
        <Px style={{ position: "absolute", left: 44, bottom: 28, width: 24, height: 16, backgroundColor: "#5E7A8A" }} />
        <Px style={{ position: "absolute", left: 72, bottom: 20, width: 20, height: 24, backgroundColor: "#C9B896" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 20, width: 100, height: 4, backgroundColor: "#E8C547" }} />
        <Px style={{ position: "absolute", left: 12, bottom: 0, width: 16, height: 16, backgroundColor: "#2E2E2E" }} />
        <Px style={{ position: "absolute", left: 68, bottom: 0, width: 16, height: 16, backgroundColor: "#2E2E2E" }} />
      </StepBob>
      <StepIn delay={240} style={{ position: "absolute", left: "88%", bottom: 24, width: 24, height: 60 }}>
        <Px style={{ position: "absolute", left: 8, bottom: 0, width: 8, height: 60, backgroundColor: "#3E6E2E" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 24, width: 8, height: 20, backgroundColor: "#3E6E2E" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 40, width: 16, height: 8, backgroundColor: "#3E6E2E" }} />
        <Px style={{ position: "absolute", left: 16, bottom: 32, width: 8, height: 16, backgroundColor: "#3E6E2E" }} />
        <Px style={{ position: "absolute", left: 8, bottom: 44, width: 16, height: 8, backgroundColor: "#3E6E2E" }} />
      </StepIn>
    </PixelSceneRoot>
  );
}

export function PixelTvBetterCallSaulScene() {
  return (
    <PixelSceneRoot base="#1F2A44">
      <Px style={{ position: "absolute", left: "48%", bottom: 116, width: 4, height: 4, backgroundColor: "#FFFFFF" }} />
      <Px style={{ position: "absolute", left: "60%", bottom: 124, width: 4, height: 4, backgroundColor: "#FFFFFF" }} />
      <Px style={{ position: "absolute", left: "88%", bottom: 120, width: 4, height: 4, backgroundColor: "#FFFFFF" }} />
      <Px style={{ position: "absolute", left: "95%", bottom: 108, width: 4, height: 4, backgroundColor: "#FFFFFF" }} />
      <StepIn delay={50} style={{ position: "absolute", left: "48%", bottom: 0, width: 176, height: 96 }}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 176, height: 80, backgroundColor: "#2E3A58" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 80, width: 176, height: 16, backgroundColor: "#8A2E3E" }} />
        <Px style={{ position: "absolute", left: 16, bottom: 24, width: 36, height: 32, backgroundColor: "#FFE8A0" }} />
        <Px style={{ position: "absolute", left: 96, bottom: 24, width: 28, height: 32, backgroundColor: "#FFE8A0" }} />
        <Px style={{ position: "absolute", left: 60, bottom: 0, width: 20, height: 48, backgroundColor: "#1A2236" }} />
      </StepIn>
      <StepIn delay={220} style={{ position: "absolute", left: "57%", bottom: 96, width: 68, height: 20 }}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 68, height: 20, backgroundColor: "#2A1420" }} />
        <Px style={{ position: "absolute", left: 4, bottom: 4, width: 60, height: 12, backgroundColor: "#FF5E7A" }} />
        <Px style={{ position: "absolute", left: 12, bottom: 8, width: 44, height: 4, backgroundColor: "#FFB0BE" }} />
      </StepIn>
      <StepIn delay={300} style={{ position: "absolute", left: "91%", bottom: 0, width: 20, height: 56 }}>
        <Px style={{ position: "absolute", left: 8, bottom: 0, width: 4, height: 28, backgroundColor: "#3E4A66" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 28, width: 20, height: 24, backgroundColor: "#2E3A58" }} />
        <Px style={{ position: "absolute", left: 4, bottom: 44, width: 12, height: 4, backgroundColor: "#5EFA8A" }} />
      </StepIn>
    </PixelSceneRoot>
  );
}

export function PixelTvFalloutScene() {
  return (
    <PixelSceneRoot base="#8A7B5C">
      <Px style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "36%", backgroundColor: "#6E6248" }} />
      <StepIn delay={60} style={{ position: "absolute", left: "55%", bottom: 12, width: 92, height: 92 }}>
        <Px style={{ position: "absolute", left: 36, bottom: 0, width: 20, height: 12, backgroundColor: "#5E6E8E" }} />
        <Px style={{ position: "absolute", left: 36, bottom: 80, width: 20, height: 12, backgroundColor: "#5E6E8E" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 36, width: 12, height: 20, backgroundColor: "#5E6E8E" }} />
        <Px style={{ position: "absolute", left: 80, bottom: 36, width: 12, height: 20, backgroundColor: "#5E6E8E" }} />
        <Px style={{ position: "absolute", left: 8, bottom: 8, width: 12, height: 12, backgroundColor: "#5E6E8E" }} />
        <Px style={{ position: "absolute", left: 72, bottom: 8, width: 12, height: 12, backgroundColor: "#5E6E8E" }} />
        <Px style={{ position: "absolute", left: 8, bottom: 72, width: 12, height: 12, backgroundColor: "#5E6E8E" }} />
        <Px style={{ position: "absolute", left: 72, bottom: 72, width: 12, height: 12, backgroundColor: "#5E6E8E" }} />
        <Px style={{ position: "absolute", left: 12, bottom: 12, width: 68, height: 68, backgroundColor: "#5E6E8E" }} shadow />
        <Px style={{ position: "absolute", left: 20, bottom: 20, width: 52, height: 52, backgroundColor: "#2E5A7E" }} />
        <Px style={{ position: "absolute", left: 32, bottom: 32, width: 28, height: 28, backgroundColor: "#E8C547" }} />
        <Px style={{ position: "absolute", left: 40, bottom: 24, width: 12, height: 44, backgroundColor: "#2E5A7E" }} />
      </StepIn>
      <Px style={{ position: "absolute", left: "86%", bottom: 4, width: 32, height: 12, backgroundColor: "#5E5340" }} />
      <Px style={{ position: "absolute", left: "46%", bottom: 4, width: 28, height: 12, backgroundColor: "#5E5340" }} />
    </PixelSceneRoot>
  );
}

export function PixelTvTedLassoScene() {
  return (
    <PixelSceneRoot base="#6E4E2E">
      <StepIn delay={40} style={{ position: "absolute", left: "48%", bottom: 0, width: 28, height: 88 }}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 28, height: 88, backgroundColor: "#8A6238" }} />
        <Px style={{ position: "absolute", left: 4, bottom: 64, width: 20, height: 4, backgroundColor: "#5E4226" }} />
        <Px style={{ position: "absolute", left: 4, bottom: 56, width: 20, height: 4, backgroundColor: "#5E4226" }} />
      </StepIn>
      <StepIn delay={110} style={{ position: "absolute", left: "80%", bottom: 0, width: 28, height: 88 }}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 28, height: 88, backgroundColor: "#8A6238" }} />
        <Px style={{ position: "absolute", left: 4, bottom: 64, width: 20, height: 4, backgroundColor: "#5E4226" }} />
        <Px style={{ position: "absolute", left: 4, bottom: 56, width: 20, height: 4, backgroundColor: "#5E4226" }} />
      </StepIn>
      <Px style={{ position: "absolute", left: "48%", right: 0, bottom: 20, height: 8, backgroundColor: "#4E3620" }} />
      <StepIn delay={200} style={{ position: "absolute", left: "60%", bottom: 60, width: 60, height: 28 }}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 60, height: 24, backgroundColor: "#FFF8E8" }} shadow />
        <Px style={{ position: "absolute", left: 24, bottom: 20, width: 12, height: 8, backgroundColor: "#E8DCC0" }} />
        <Px style={{ position: "absolute", left: 12, bottom: 12, width: 36, height: 4, backgroundColor: "#2E5AA8" }} />
        <Px style={{ position: "absolute", left: 16, bottom: 4, width: 24, height: 4, backgroundColor: "#2E5AA8" }} />
      </StepIn>
      <StepIn delay={300} style={{ position: "absolute", left: "88%", bottom: 4, width: 24, height: 24 }}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 24, height: 24, backgroundColor: "#F5F5F5" }} />
        <Px style={{ position: "absolute", left: 8, bottom: 8, width: 8, height: 8, backgroundColor: "#2E2E2E" }} />
      </StepIn>
    </PixelSceneRoot>
  );
}

export function PixelTvOnePieceScene() {
  return (
    <PixelSceneRoot base="#3A8EAE">
      <PxSun left="78%" bottom={96} size={24} color="#FFE8A0" core="#FFF5D0" ray="#FFD94D" />
      <PxCloud left="52%" top={8} width={60} color="#EAF4FF" shade="#C9DDF2" />
      <Px style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "38%", backgroundColor: "#2E6E8E" }} />
      <Px style={{ position: "absolute", left: "46%", right: 0, bottom: 32, height: 4, backgroundColor: "#5EAECE" }} />
      <StepBob left="50%" bottom={16} width={116} height={84} distance={4} period={1200} delay={0}>
        <Px style={{ position: "absolute", left: 8, bottom: 0, width: 96, height: 28, backgroundColor: "#8A5A2E" }} shadow />
        <Px style={{ position: "absolute", left: 0, bottom: 16, width: 28, height: 28, backgroundColor: "#C98A2E" }} />
        <Px style={{ position: "absolute", left: 8, bottom: 24, width: 12, height: 12, backgroundColor: "#E8B85E" }} />
        <Px style={{ position: "absolute", left: 52, bottom: 28, width: 8, height: 52, backgroundColor: "#6E4A24" }} />
        <Px style={{ position: "absolute", left: 28, bottom: 52, width: 52, height: 24, backgroundColor: "#FFF5E0" }} />
        <Px style={{ position: "absolute", left: 84, bottom: 28, width: 4, height: 36, backgroundColor: "#6E4A24" }} />
        <Px style={{ position: "absolute", left: 68, bottom: 44, width: 36, height: 20, backgroundColor: "#F5E8D0" }} />
        <Px style={{ position: "absolute", left: 56, bottom: 76, width: 20, height: 8, backgroundColor: "#2E2E2E" }} />
      </StepBob>
    </PixelSceneRoot>
  );
}

export function PixelTvStrangerThingsScene() {
  return (
    <PixelSceneRoot base="#3A3A5E">
      <Px style={{ position: "absolute", left: 0, right: 0, top: 0, height: "40%", backgroundColor: "#5E4E7E" }} />
      <Px style={{ position: "absolute", left: "76%", bottom: 28, width: 64, height: 28, backgroundColor: "#8E1E1E" }} />
      <Px style={{ position: "absolute", left: "42%", right: 0, bottom: 0, height: 28, backgroundColor: "#2E2E3E" }} />
      <StepIn delay={60} style={{ position: "absolute", left: "48%", bottom: 24, width: 40, height: 40 }}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 40, height: 28, backgroundColor: "#2A2A44" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 28, width: 40, height: 12, backgroundColor: "#232338" }} />
      </StepIn>
      <Px style={{ position: "absolute", left: "48%", right: 0, bottom: 116, height: 4, backgroundColor: "#1E1E2E" }} />
      <Px style={{ position: "absolute", left: "56%", bottom: 104, width: 8, height: 8, backgroundColor: "#5EFF8A" }} />
      <Px style={{ position: "absolute", left: "72%", bottom: 108, width: 8, height: 8, backgroundColor: "#5EA8FF" }} />
      <Px style={{ position: "absolute", left: "86%", bottom: 100, width: 8, height: 8, backgroundColor: "#FFE85E" }} />
      <StepBlink period={800} style={{ position: "absolute", left: "63%", bottom: 104, width: 8, height: 8 }}><Px style={{ width: 8, height: 8, backgroundColor: "#FF5E5E" }} /></StepBlink>
      <StepIn delay={200} style={{ position: "absolute", left: "54%", bottom: 20, width: 44, height: 28 }}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 16, height: 16, backgroundColor: "#1A1A1A" }} />
        <Px style={{ position: "absolute", left: 4, bottom: 4, width: 8, height: 8, backgroundColor: "#3A3A5E" }} />
        <Px style={{ position: "absolute", left: 28, bottom: 0, width: 16, height: 16, backgroundColor: "#1A1A1A" }} />
        <Px style={{ position: "absolute", left: 32, bottom: 4, width: 8, height: 8, backgroundColor: "#3A3A5E" }} />
        <Px style={{ position: "absolute", left: 8, bottom: 12, width: 24, height: 4, backgroundColor: "#1A1A1A" }} />
        <Px style={{ position: "absolute", left: 28, bottom: 12, width: 4, height: 12, backgroundColor: "#1A1A1A" }} />
      </StepIn>
    </PixelSceneRoot>
  );
}

export function PixelTvBlueyScene() {
  return (
    <PixelSceneRoot base="#5EBAE8">
      <PxSun left="76%" bottom={92} size={24} color="#FFE8A0" core="#FFF5D0" ray="#FFD94D" />
      <Px style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "34%", backgroundColor: "#5EA84E" }} />
      <StepIn delay={40} style={{ position: "absolute", left: "54%", bottom: 0, width: 80, height: 80 }}>
        <Px style={{ position: "absolute", left: 4, bottom: 0, width: 8, height: 36, backgroundColor: "#6E5A44" }} />
        <Px style={{ position: "absolute", left: 64, bottom: 0, width: 8, height: 36, backgroundColor: "#6E5A44" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 36, width: 80, height: 40, backgroundColor: "#E8DCC8" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 76, width: 44, height: 8, backgroundColor: "#8A4E3E" }} />
        <Px style={{ position: "absolute", left: 36, bottom: 76, width: 44, height: 8, backgroundColor: "#8A4E3E" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 48, width: 80, height: 4, backgroundColor: "#8A6E54" }} />
        <Px style={{ position: "absolute", left: 28, bottom: 52, width: 20, height: 16, backgroundColor: "#7EB8E8" }} />
      </StepIn>
      <Px style={{ position: "absolute", left: "89%", bottom: 0, width: 8, height: 56, backgroundColor: "#9AA0A8" }} />
      <StepBob left="82%" bottom={44} width={44} height={20} distance={4} period={1600} delay={0}>
        <Px style={{ position: "absolute", left: 0, bottom: 16, width: 44, height: 4, backgroundColor: "#9AA0A8" }} />
        <Px style={{ position: "absolute", left: 4, bottom: 0, width: 12, height: 16, backgroundColor: "#7EB8E8" }} />
        <Px style={{ position: "absolute", left: 24, bottom: 0, width: 12, height: 16, backgroundColor: "#F5F5F5" }} />
      </StepBob>
    </PixelSceneRoot>
  );
}

export function PixelTvDuggeeScene() {
  return (
    <PixelSceneRoot base="#2E5E3A">
      <StepIn delay={30} style={{ position: "absolute", left: "44%", bottom: 0, width: 36, height: 92 }}>
        <Px style={{ position: "absolute", left: 16, bottom: 0, width: 8, height: 32, backgroundColor: "#4E3620" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 28, width: 36, height: 48, backgroundColor: "#24522E" }} />
        <Px style={{ position: "absolute", left: 8, bottom: 68, width: 20, height: 20, backgroundColor: "#24522E" }} />
      </StepIn>
      <StepIn delay={110} style={{ position: "absolute", left: "62%", bottom: 0, width: 64, height: 56 }}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 64, height: 44, backgroundColor: "#8A6238" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 44, width: 64, height: 12, backgroundColor: "#6E4E2E" }} />
        <Px style={{ position: "absolute", left: 24, bottom: 20, width: 16, height: 16, backgroundColor: "#E8C547" }} />
        <Px style={{ position: "absolute", left: 28, bottom: 24, width: 8, height: 8, backgroundColor: "#B8860B" }} />
      </StepIn>
      <Px style={{ position: "absolute", left: "86%", bottom: 0, width: 28, height: 8, backgroundColor: "#4E3620" }} />
      <Px style={{ position: "absolute", left: "86%", bottom: 8, width: 28, height: 8, backgroundColor: "#5E4226" }} />
      <StepBob left="88%" bottom={16} width={16} height={24} distance={4} period={900} delay={0}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 16, height: 20, backgroundColor: "#F58A2E" }} />
        <Px style={{ position: "absolute", left: 4, bottom: 0, width: 8, height: 12, backgroundColor: "#FFD95E" }} />
      </StepBob>
      <Px style={{ position: "absolute", left: "46%", right: 0, bottom: 120, height: 4, backgroundColor: "#1E3E26" }} />
      <Px style={{ position: "absolute", left: "56%", bottom: 104, width: 12, height: 12, backgroundColor: "#E85E5E" }} />
      <Px style={{ position: "absolute", left: "68%", bottom: 104, width: 12, height: 12, backgroundColor: "#5EA8E8" }} />
      <Px style={{ position: "absolute", left: "80%", bottom: 104, width: 12, height: 12, backgroundColor: "#E8C547" }} />
    </PixelSceneRoot>
  );
}

export function PixelTvAvatarScene() {
  return (
    <PixelSceneRoot base="#4A3E6E">
      <Px style={{ position: "absolute", left: 0, right: 0, top: 0, height: "36%", backgroundColor: "#5E4E8E" }} />
      <StepIn delay={60} style={{ position: "absolute", left: "58%", bottom: 0, width: 68, height: 60 }}>
        <Px style={{ position: "absolute", left: 12, bottom: 0, width: 44, height: 28, backgroundColor: "#8A6E4E" }} />
        <Px style={{ position: "absolute", left: 4, bottom: 28, width: 60, height: 8, backgroundColor: "#6E563E" }} />
        <Px style={{ position: "absolute", left: 12, bottom: 36, width: 44, height: 8, backgroundColor: "#6E563E" }} />
        <Px style={{ position: "absolute", left: 20, bottom: 44, width: 28, height: 8, backgroundColor: "#6E563E" }} />
        <Px style={{ position: "absolute", left: 28, bottom: 52, width: 12, height: 8, backgroundColor: "#E8C547" }} />
      </StepIn>
      <StepBob left="46%" bottom={56} width={24} height={24} distance={4} period={1200} delay={0}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 24, height: 24, backgroundColor: "#FFFFFF" }} />
        <Px style={{ position: "absolute", left: 4, bottom: 4, width: 16, height: 16, backgroundColor: "#4A3E6E" }} />
      </StepBob>
      <StepBob left="84%" bottom={40} width={28} height={16} distance={4} period={1000} delay={300}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 28, height: 8, backgroundColor: "#5EA8E8" }} />
        <Px style={{ position: "absolute", left: 4, bottom: 8, width: 20, height: 8, backgroundColor: "#7EC8F8" }} />
      </StepBob>
      <Px style={{ position: "absolute", left: "87%", bottom: 4, width: 28, height: 20, backgroundColor: "#7A6A4E" }} />
      <Px style={{ position: "absolute", left: "48%", bottom: 4, width: 12, height: 20, backgroundColor: "#F58A2E" }} />
      <Px style={{ position: "absolute", left: "48%", bottom: 4, width: 4, height: 12, backgroundColor: "#FFD95E" }} />
    </PixelSceneRoot>
  );
}

export function PixelTvYellowstoneScene() {
  return (
    <PixelSceneRoot base="#D89A4E">
      <Px style={{ position: "absolute", left: 0, right: 0, top: 0, height: "40%", backgroundColor: "#F2C078" }} />
      <PxSun left="66%" bottom={96} size={28} color="#FFE0A0" core="#FFF0C0" ray="#F2C078" />
      <StepIn delay={30} style={{ position: "absolute", left: "44%", bottom: 48, width: 72, height: 60 }}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 72, height: 40, backgroundColor: "#8A7A8E" }} />
        <Px style={{ position: "absolute", left: 12, bottom: 20, width: 48, height: 28, backgroundColor: "#8A7A8E" }} />
        <Px style={{ position: "absolute", left: 28, bottom: 40, width: 16, height: 12, backgroundColor: "#F5F0E8" }} />
      </StepIn>
      <StepIn delay={90} style={{ position: "absolute", left: "76%", bottom: 52, width: 52, height: 44 }}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 52, height: 28, backgroundColor: "#7A6A7E" }} />
        <Px style={{ position: "absolute", left: 12, bottom: 16, width: 28, height: 20, backgroundColor: "#7A6A7E" }} />
      </StepIn>
      <Px style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "36%", backgroundColor: "#7A8A3E" }} />
      <StepIn delay={150} style={{ position: "absolute", left: "50%", bottom: 36, width: 56, height: 44 }}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 56, height: 32, backgroundColor: "#A83E2E" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 32, width: 28, height: 8, backgroundColor: "#8A3226" }} />
        <Px style={{ position: "absolute", left: 28, bottom: 32, width: 28, height: 8, backgroundColor: "#8A3226" }} />
        <Px style={{ position: "absolute", left: 36, bottom: 0, width: 12, height: 20, backgroundColor: "#6E2A20" }} />
        <Px style={{ position: "absolute", left: 8, bottom: 16, width: 12, height: 12, backgroundColor: "#F5F0E8" }} />
      </StepIn>
      <Px style={{ position: "absolute", left: "44%", right: 0, bottom: 32, height: 4, backgroundColor: "#5E4A2E" }} />
      <StepIn delay={240} style={{ position: "absolute", left: "82%", bottom: 12, width: 32, height: 20 }}>
        <Px style={{ position: "absolute", left: 0, bottom: 8, width: 24, height: 12, backgroundColor: "#3E2E1E" }} />
        <Px style={{ position: "absolute", left: 24, bottom: 12, width: 8, height: 8, backgroundColor: "#3E2E1E" }} />
        <Px style={{ position: "absolute", left: 4, bottom: 0, width: 4, height: 8, backgroundColor: "#3E2E1E" }} />
        <Px style={{ position: "absolute", left: 16, bottom: 0, width: 4, height: 8, backgroundColor: "#3E2E1E" }} />
      </StepIn>
      <StepIn delay={320} style={{ position: "absolute", left: "62%", bottom: 4, width: 28, height: 16 }}>
        <Px style={{ position: "absolute", left: 0, bottom: 4, width: 20, height: 12, backgroundColor: "#4E3A26" }} />
        <Px style={{ position: "absolute", left: 20, bottom: 8, width: 8, height: 8, backgroundColor: "#4E3A26" }} />
        <Px style={{ position: "absolute", left: 4, bottom: 0, width: 4, height: 8, backgroundColor: "#4E3A26" }} />
      </StepIn>
    </PixelSceneRoot>
  );
}

export function PixelTvBoysScene() {
  return (
    <PixelSceneRoot base="#23233E">
      <Px style={{ position: "absolute", left: "46%", bottom: 116, width: 4, height: 4, backgroundColor: "#FFFFFF" }} />
      <Px style={{ position: "absolute", left: "58%", bottom: 124, width: 4, height: 4, backgroundColor: "#FFFFFF" }} />
      <Px style={{ position: "absolute", left: "70%", bottom: 112, width: 4, height: 4, backgroundColor: "#FFFFFF" }} />
      <Px style={{ position: "absolute", left: "94%", bottom: 120, width: 4, height: 4, backgroundColor: "#FFFFFF" }} />
      <StepIn delay={50} style={{ position: "absolute", left: "47%", bottom: 0, width: 36, height: 96 }}>
        <Px style={{ width: 36, height: 96, backgroundColor: "#2E2E4E" }} />
      </StepIn>
      <StepIn delay={50} style={{ position: "absolute", left: "60%", bottom: 0, width: 32, height: 72 }}>
        <Px style={{ width: 32, height: 72, backgroundColor: "#2A2A46" }} />
      </StepIn>
      <StepIn delay={50} style={{ position: "absolute", left: "74%", bottom: 0, width: 40, height: 88 }}>
        <Px style={{ width: 40, height: 88, backgroundColor: "#2E2E4E" }} />
      </StepIn>
      <StepIn delay={50} style={{ position: "absolute", left: "87%", bottom: 0, width: 28, height: 64 }}>
        <Px style={{ width: 28, height: 64, backgroundColor: "#2A2A46" }} />
      </StepIn>
      <Px style={{ position: "absolute", left: "52%", bottom: 68, width: 8, height: 8, backgroundColor: "#FFE8A0" }} />
      <Px style={{ position: "absolute", left: "65%", bottom: 44, width: 8, height: 8, backgroundColor: "#FFE8A0" }} />
      <Px style={{ position: "absolute", left: "79%", bottom: 56, width: 8, height: 8, backgroundColor: "#FFE8A0" }} />
      <Px style={{ position: "absolute", left: "90%", bottom: 36, width: 8, height: 8, backgroundColor: "#FFE8A0" }} />
      <StepBob left="54%" bottom={88} width={48} height={28} distance={8} period={1000} delay={0}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 24, height: 16, backgroundColor: "#8A1E1E" }} />
        <Px style={{ position: "absolute", left: 16, bottom: 8, width: 20, height: 12, backgroundColor: "#1A1A2E" }} />
        <Px style={{ position: "absolute", left: 24, bottom: 16, width: 12, height: 12, backgroundColor: "#1A1A2E" }} />
      </StepBob>
      <StepBlink period={900} style={{ position: "absolute", left: "58%", bottom: 100, width: 4, height: 4 }}><Px style={{ width: 4, height: 4, backgroundColor: "#FF5E5E" }} /></StepBlink>
      <StepBlink period={900} style={{ position: "absolute", left: "61%", bottom: 100, width: 4, height: 4 }}><Px style={{ width: 4, height: 4, backgroundColor: "#FF5E5E" }} /></StepBlink>
    </PixelSceneRoot>
  );
}

export function PixelTvYouScene() {
  return (
    <PixelSceneRoot base="#1E2438">
      <StepIn delay={50} style={{ position: "absolute", left: "46%", bottom: 0, width: 64, height: 84 }}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 64, height: 84, backgroundColor: "#3E2E1E" }} />
        <Px style={{ position: "absolute", left: 4, bottom: 60, width: 56, height: 4, backgroundColor: "#2E2216" }} />
        <Px style={{ position: "absolute", left: 4, bottom: 40, width: 56, height: 4, backgroundColor: "#2E2216" }} />
        <Px style={{ position: "absolute", left: 4, bottom: 20, width: 56, height: 4, backgroundColor: "#2E2216" }} />
        <Px style={{ position: "absolute", left: 8, bottom: 64, width: 8, height: 12, backgroundColor: "#8A2E3E" }} />
        <Px style={{ position: "absolute", left: 20, bottom: 64, width: 8, height: 12, backgroundColor: "#2E5A8A" }} />
        <Px style={{ position: "absolute", left: 32, bottom: 64, width: 8, height: 12, backgroundColor: "#3E7A4E" }} />
        <Px style={{ position: "absolute", left: 12, bottom: 44, width: 8, height: 12, backgroundColor: "#8A6E2E" }} />
        <Px style={{ position: "absolute", left: 28, bottom: 44, width: 8, height: 12, backgroundColor: "#6E3E8A" }} />
        <Px style={{ position: "absolute", left: 8, bottom: 24, width: 8, height: 12, backgroundColor: "#2E5A8A" }} />
        <Px style={{ position: "absolute", left: 28, bottom: 24, width: 8, height: 12, backgroundColor: "#8A2E3E" }} />
      </StepIn>
      <StepIn delay={180} style={{ position: "absolute", left: "76%", bottom: 0, width: 36, height: 60 }}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 36, height: 60, backgroundColor: "#3E5A7E" }} />
        <Px style={{ position: "absolute", left: 4, bottom: 4, width: 28, height: 52, backgroundColor: "#1E2438" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 28, width: 36, height: 4, backgroundColor: "#5E7A9E" }} />
      </StepIn>
      <Px style={{ position: "absolute", left: "92%", bottom: 0, width: 8, height: 72, backgroundColor: "#2E3448" }} />
      <StepBlink period={1200} style={{ position: "absolute", left: "90%", bottom: 68, width: 16, height: 12 }}><Px style={{ width: 16, height: 12, backgroundColor: "#FFE8A0" }} /></StepBlink>
    </PixelSceneRoot>
  );
}

export function PixelTvChuckyScene() {
  return (
    <PixelSceneRoot base="#1A1A2E">
      <StepIn delay={40} style={{ position: "absolute", left: "48%", bottom: 84, width: 48, height: 44 }}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 48, height: 44, backgroundColor: "#2A3A5E" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 20, width: 48, height: 4, backgroundColor: "#1A1A2E" }} />
        <Px style={{ position: "absolute", left: 20, bottom: 0, width: 4, height: 44, backgroundColor: "#1A1A2E" }} />
      </StepIn>
      <Px style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "30%", backgroundColor: "#141422" }} />
      <StepBob left="60%" bottom={16} width={48} height={52} distance={4} period={900} delay={0}>
        <Px style={{ position: "absolute", left: 8, bottom: 16, width: 32, height: 28, backgroundColor: "#4E3626" }} />
        <Px style={{ position: "absolute", left: 8, bottom: 44, width: 32, height: 8, backgroundColor: "#5E422E" }} />
        <Px style={{ position: "absolute", left: 4, bottom: 4, width: 4, height: 12, backgroundColor: "#4E3626" }} />
        <Px style={{ position: "absolute", left: 40, bottom: 4, width: 4, height: 12, backgroundColor: "#4E3626" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 48, height: 4, backgroundColor: "#4E3626" }} />
      </StepBob>
      <Px style={{ position: "absolute", left: "84%", bottom: 8, width: 12, height: 12, backgroundColor: "#8A2E3E" }} />
      <Px style={{ position: "absolute", left: "91%", bottom: 4, width: 12, height: 12, backgroundColor: "#2E5A8A" }} />
      <Px style={{ position: "absolute", left: "50%", bottom: 4, width: 12, height: 12, backgroundColor: "#8A6E2E" }} />
      <StepBob left="76%" bottom={4} width={16} height={16} distance={4} period={1000} delay={400}>
        <Px style={{ width: 16, height: 16, backgroundColor: "#3E7A4E" }} />
      </StepBob>
    </PixelSceneRoot>
  );
}

export function PixelTvLostScene() {
  return (
    <PixelSceneRoot base="#2E8E9E">
      <PxSun left="76%" bottom={92} size={24} color="#FFE8A0" core="#FFF5D0" ray="#FFD94D" />
      <Px style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "40%", backgroundColor: "#1E6E7E" }} />
      <Px style={{ position: "absolute", left: "42%", right: 0, bottom: 28, height: 16, backgroundColor: "#E8D8A8" }} />
      <StepIn delay={60} style={{ position: "absolute", left: "48%", bottom: 40, width: 56, height: 32 }}>
        <Px style={{ position: "absolute", left: 0, bottom: 4, width: 48, height: 16, backgroundColor: "#3A3A3A" }} />
        <Px style={{ position: "absolute", left: 36, bottom: 12, width: 8, height: 20, backgroundColor: "#3A3A3A" }} />
        <Px style={{ position: "absolute", left: 8, bottom: 8, width: 8, height: 8, backgroundColor: "#7FB3D5" }} />
        <Px style={{ position: "absolute", left: 20, bottom: 8, width: 8, height: 8, backgroundColor: "#7FB3D5" }} />
      </StepIn>
      <StepIn delay={170} style={{ position: "absolute", left: "87%", bottom: 28, width: 28, height: 72 }}>
        <Px style={{ position: "absolute", left: 12, bottom: 0, width: 8, height: 52, backgroundColor: "#6E4E2E" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 52, width: 28, height: 8, backgroundColor: "#3E7A3E" }} />
        <Px style={{ position: "absolute", left: 4, bottom: 60, width: 24, height: 8, backgroundColor: "#4E8A4E" }} />
      </StepIn>
      <StepBob left="63%" bottom={64} width={20} height={20} distance={4} period={1600} delay={0}>
        <Px style={{ width: 20, height: 20, backgroundColor: "#8A8A8A" }} />
      </StepBob>
      <StepBob left="70%" bottom={88} width={16} height={16} distance={4} period={1800} delay={600}>
        <Px style={{ width: 16, height: 16, backgroundColor: "#9A9A9A" }} />
      </StepBob>
    </PixelSceneRoot>
  );
}

export function PixelTvPrisonBreakScene() {
  return (
    <PixelSceneRoot base="#1E2A44">
      <Px style={{ position: "absolute", left: "78%", bottom: 96, width: 28, height: 28, backgroundColor: "#F0F2F8" }} />
      <Px style={{ position: "absolute", left: "48%", bottom: 112, width: 4, height: 4, backgroundColor: "#FFFFFF" }} />
      <Px style={{ position: "absolute", left: "58%", bottom: 120, width: 4, height: 4, backgroundColor: "#FFFFFF" }} />
      <Px style={{ position: "absolute", left: "92%", bottom: 116, width: 4, height: 4, backgroundColor: "#FFFFFF" }} />
      <Px style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "17%", backgroundColor: "#161E30" }} />
      <View style={{ position: "absolute", left: "55%", bottom: 44, width: 150, height: 8, backgroundColor: "#FFF5D0", opacity: 0.22 }} />
      <StepIn delay={80} style={{ position: "absolute", left: "50%", bottom: 20, width: 40, height: 76 }}>
        <Px style={{ position: "absolute", left: 4, bottom: 0, width: 8, height: 56, backgroundColor: "#3A3A3A" }} />
        <Px style={{ position: "absolute", left: 28, bottom: 0, width: 8, height: 56, backgroundColor: "#3A3A3A" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 56, width: 40, height: 20, backgroundColor: "#2E2E2E" }} />
        <Px style={{ position: "absolute", left: 8, bottom: 60, width: 24, height: 8, backgroundColor: "#FFE8A0" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 72, width: 40, height: 4, backgroundColor: "#2E2E2E" }} />
      </StepIn>
      <Px style={{ position: "absolute", left: "44%", right: 0, bottom: 24, height: 4, backgroundColor: "#4A4A4A" }} />
      <Px style={{ position: "absolute", left: "44%", right: 0, bottom: 16, height: 4, backgroundColor: "#4A4A4A" }} />
      <Px style={{ position: "absolute", left: "58%", bottom: 0, width: 4, height: 28, backgroundColor: "#3A3A3A" }} />
      <Px style={{ position: "absolute", left: "76%", bottom: 0, width: 4, height: 28, backgroundColor: "#3A3A3A" }} />
      <Px style={{ position: "absolute", left: "90%", bottom: 0, width: 4, height: 28, backgroundColor: "#3A3A3A" }} />
    </PixelSceneRoot>
  );
}

export function PixelTvItDerryScene() {
  return (
    <PixelSceneRoot base="#4E3E5E">
      <Px style={{ position: "absolute", left: 0, right: 0, top: 0, height: "38%", backgroundColor: "#6E4E7E" }} />
      <Px style={{ position: "absolute", left: "42%", right: 0, bottom: 0, height: 28, backgroundColor: "#2E2E3E" }} />
      <Px style={{ position: "absolute", left: "52%", bottom: 12, width: 48, height: 4, backgroundColor: "#8E8E8A" }} />
      <StepIn delay={50} style={{ position: "absolute", left: "52%", bottom: 24, width: 40, height: 36 }}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 40, height: 32, backgroundColor: "#3A304E" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 32, width: 40, height: 8, backgroundColor: "#2E2740" }} />
        <Px style={{ position: "absolute", left: 8, bottom: 12, width: 8, height: 8, backgroundColor: "#FFD98A" }} />
      </StepIn>
      <StepIn delay={120} style={{ position: "absolute", left: "80%", bottom: 24, width: 32, height: 28 }}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 32, height: 24, backgroundColor: "#342C48" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 24, width: 32, height: 8, backgroundColor: "#2A2340" }} />
      </StepIn>
      <StepIn delay={200} style={{ position: "absolute", left: "60%", bottom: 0, width: 28, height: 12 }}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 28, height: 12, backgroundColor: "#141414" }} />
        <Px style={{ position: "absolute", left: 4, bottom: 4, width: 20, height: 4, backgroundColor: "#3A3A3A" }} />
      </StepIn>
      <StepBob left="69%" bottom={8} width={24} height={16} distance={4} period={1100} delay={0}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 24, height: 8, backgroundColor: "#F5F0E0" }} />
        <Px style={{ position: "absolute", left: 8, bottom: 8, width: 8, height: 8, backgroundColor: "#E0D8C0" }} />
      </StepBob>
      <StepBob left="83%" bottom={56} width={28} height={52} distance={8} period={1400} delay={300}>
        <Px style={{ position: "absolute", left: 4, bottom: 24, width: 20, height: 24, backgroundColor: "#D81E1E" }} shadow />
        <Px style={{ position: "absolute", left: 8, bottom: 40, width: 8, height: 8, backgroundColor: "#E86A7A" }} />
        <Px style={{ position: "absolute", left: 12, bottom: 20, width: 4, height: 4, backgroundColor: "#A81818" }} />
        <Px style={{ position: "absolute", left: 12, bottom: 0, width: 4, height: 20, backgroundColor: "#8A8A8A" }} />
      </StepBob>
    </PixelSceneRoot>
  );
}

export function PixelTvCarrieScene() {
  return (
    <PixelSceneRoot base="#2E2A44">
      <StepIn delay={60} style={{ position: "absolute", left: "62%", bottom: 80, width: 28, height: 44 }}>
        <Px style={{ position: "absolute", left: 12, bottom: 28, width: 4, height: 16, backgroundColor: "#4A4A4A" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 28, height: 28, backgroundColor: "#B8C0D0" }} />
        <Px style={{ position: "absolute", left: 4, bottom: 16, width: 8, height: 8, backgroundColor: "#E8ECF5" }} />
        <Px style={{ position: "absolute", left: 16, bottom: 4, width: 8, height: 8, backgroundColor: "#E8ECF5" }} />
      </StepIn>
      <Px style={{ position: "absolute", left: "50%", bottom: 96, width: 4, height: 4, backgroundColor: "#D8B8FF" }} />
      <Px style={{ position: "absolute", left: "76%", bottom: 104, width: 4, height: 4, backgroundColor: "#D8B8FF" }} />
      <Px style={{ position: "absolute", left: "88%", bottom: 92, width: 4, height: 4, backgroundColor: "#D8B8FF" }} />
      <Px style={{ position: "absolute", left: "56%", bottom: 72, width: 4, height: 4, backgroundColor: "#D8B8FF" }} />
      <Px style={{ position: "absolute", left: "44%", right: 0, bottom: 0, height: 28, backgroundColor: "#3E3458" }} />
      <Px style={{ position: "absolute", left: "54%", bottom: 8, width: 24, height: 12, backgroundColor: "#8A5EB8" }} />
      <Px style={{ position: "absolute", left: "76%", bottom: 4, width: 28, height: 12, backgroundColor: "#5E8AB8" }} />
      <StepIn delay={240} style={{ position: "absolute", left: "83%", bottom: 64, width: 28, height: 20 }}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 24, height: 16, backgroundColor: "#8A8A8A" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 16, width: 24, height: 4, backgroundColor: "#6E6E6E" }} />
      </StepIn>
      <Px style={{ position: "absolute", left: "87%", bottom: 52, width: 8, height: 12, backgroundColor: "#C81E1E" }} />
      <Px style={{ position: "absolute", left: "90%", bottom: 40, width: 8, height: 8, backgroundColor: "#C81E1E" }} />
    </PixelSceneRoot>
  );
}

export function PixelTvHarryPotterScene() {
  return (
    <PixelSceneRoot base="#1E2A4E">
      <Px style={{ position: "absolute", left: "46%", bottom: 116, width: 4, height: 4, backgroundColor: "#FFFFFF" }} />
      <Px style={{ position: "absolute", left: "56%", bottom: 104, width: 4, height: 4, backgroundColor: "#FFFFFF" }} />
      <Px style={{ position: "absolute", left: "66%", bottom: 124, width: 4, height: 4, backgroundColor: "#FFFFFF" }} />
      <Px style={{ position: "absolute", left: "94%", bottom: 112, width: 4, height: 4, backgroundColor: "#FFFFFF" }} />
      <Px style={{ position: "absolute", left: "83%", bottom: 92, width: 28, height: 28, backgroundColor: "#F0F2F8" }} />
      <Px style={{ position: "absolute", left: "42%", right: 0, bottom: 0, height: 44, backgroundColor: "#2A3A2E" }} />
      <StepIn delay={90} style={{ position: "absolute", left: "56%", bottom: 32, width: 120, height: 88 }}>
        <Px style={{ position: "absolute", left: 36, bottom: 0, width: 48, height: 52, backgroundColor: "#3E3E5E" }} />
        <Px style={{ position: "absolute", left: 4, bottom: 0, width: 20, height: 68, backgroundColor: "#363652" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 68, width: 28, height: 12, backgroundColor: "#2E2E46" }} />
        <Px style={{ position: "absolute", left: 8, bottom: 80, width: 12, height: 8, backgroundColor: "#2E2E46" }} />
        <Px style={{ position: "absolute", left: 96, bottom: 0, width: 20, height: 60, backgroundColor: "#363652" }} />
        <Px style={{ position: "absolute", left: 92, bottom: 60, width: 28, height: 12, backgroundColor: "#2E2E46" }} />
        <Px style={{ position: "absolute", left: 52, bottom: 32, width: 8, height: 8, backgroundColor: "#FFE8A0" }} />
        <Px style={{ position: "absolute", left: 64, bottom: 20, width: 8, height: 8, backgroundColor: "#FFE8A0" }} />
        <Px style={{ position: "absolute", left: 8, bottom: 40, width: 8, height: 8, backgroundColor: "#FFE8A0" }} />
        <Px style={{ position: "absolute", left: 100, bottom: 28, width: 8, height: 8, backgroundColor: "#FFE8A0" }} />
      </StepIn>
      <StepBob left="47%" bottom={96} width={28} height={12} distance={4} period={1400} delay={0}>
        <Px style={{ position: "absolute", left: 0, bottom: 4, width: 28, height: 4, backgroundColor: "#1A1A2E" }} />
        <Px style={{ position: "absolute", left: 12, bottom: 0, width: 8, height: 8, backgroundColor: "#1A1A2E" }} />
      </StepBob>
      <StepBob left="70%" bottom={108} width={20} height={12} distance={4} period={1700} delay={600}>
        <Px style={{ position: "absolute", left: 0, bottom: 4, width: 20, height: 4, backgroundColor: "#1A1A2E" }} />
        <Px style={{ position: "absolute", left: 8, bottom: 0, width: 8, height: 8, backgroundColor: "#1A1A2E" }} />
      </StepBob>
    </PixelSceneRoot>
  );
}

export function PixelTvWednesdayScene() {
  return (
    <PixelSceneRoot base="#1B1233">
      <Px style={{ position: "absolute", left: "79%", bottom: 92, width: 40, height: 40, backgroundColor: "#B9A7F2" }} />
      <Px style={{ position: "absolute", left: "80%", bottom: 96, width: 28, height: 28, backgroundColor: "#EDE8FF" }} />
      <StepIn delay={80} style={{ position: "absolute", left: "58%", bottom: 24, width: 64, height: 100 }}>
        <Px style={{ position: "absolute", left: 12, bottom: 0, width: 44, height: 72, backgroundColor: "#2A2145" }} />
        <Px style={{ position: "absolute", left: 16, bottom: 72, width: 36, height: 16, backgroundColor: "#241C3C" }} />
        <Px style={{ position: "absolute", left: 24, bottom: 88, width: 20, height: 12, backgroundColor: "#241C3C" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 16, height: 52, backgroundColor: "#241C3C" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 52, width: 16, height: 12, backgroundColor: "#1E1732" }} />
        <Px style={{ position: "absolute", left: 24, bottom: 48, width: 8, height: 8, backgroundColor: "#FFD98A" }} />
        <Px style={{ position: "absolute", left: 40, bottom: 32, width: 8, height: 8, backgroundColor: "#FFD98A" }} />
        <Px style={{ position: "absolute", left: 24, bottom: 20, width: 8, height: 8, backgroundColor: "#FFD98A" }} />
      </StepIn>
      <StepIn delay={180} style={{ position: "absolute", left: "87%", bottom: 24, width: 32, height: 60 }}>
        <Px style={{ position: "absolute", left: 12, bottom: 0, width: 8, height: 52, backgroundColor: "#141021" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 36, width: 8, height: 20, backgroundColor: "#141021" }} />
        <Px style={{ position: "absolute", left: 20, bottom: 40, width: 8, height: 20, backgroundColor: "#141021" }} />
      </StepIn>
      <StepBob left="83%" bottom={84} width={20} height={12} distance={4} period={1300} delay={0}>
        <Px style={{ position: "absolute", left: 4, bottom: 0, width: 12, height: 12, backgroundColor: "#0D0A18" }} />
        <Px style={{ position: "absolute", left: 12, bottom: 4, width: 8, height: 4, backgroundColor: "#0D0A18" }} />
      </StepBob>
      <StepIn delay={260} style={{ position: "absolute", left: "48%", bottom: 20, width: 192, height: 36 }}>
        <Px style={{ position: "absolute", left: 8, bottom: 0, width: 4, height: 28, backgroundColor: "#0F0B1D" }} />
        <Px style={{ position: "absolute", left: 40, bottom: 0, width: 4, height: 28, backgroundColor: "#0F0B1D" }} />
        <Px style={{ position: "absolute", left: 72, bottom: 0, width: 4, height: 28, backgroundColor: "#0F0B1D" }} />
        <Px style={{ position: "absolute", left: 104, bottom: 0, width: 4, height: 28, backgroundColor: "#0F0B1D" }} />
        <Px style={{ position: "absolute", left: 136, bottom: 0, width: 4, height: 28, backgroundColor: "#0F0B1D" }} />
        <Px style={{ position: "absolute", left: 168, bottom: 0, width: 4, height: 28, backgroundColor: "#0F0B1D" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 8, width: 192, height: 4, backgroundColor: "#0F0B1D" }} />
      </StepIn>
    </PixelSceneRoot>
  );
}

export function PixelTvVampireDiariesScene() {
  return (
    <PixelSceneRoot base="#141A33">
      <Px style={{ position: "absolute", left: "80%", bottom: 88, width: 40, height: 40, backgroundColor: "#DDE3F5" }} />
      <Px style={{ position: "absolute", left: "81%", bottom: 92, width: 28, height: 28, backgroundColor: "#F0F3FC" }} />
      <StepIn delay={90} style={{ position: "absolute", left: "48%", bottom: 24, width: 28, height: 48 }}>
        <Px style={{ width: 28, height: 48, backgroundColor: "#1C2340" }} />
        <Px style={{ position: "absolute", left: 8, bottom: 20, width: 8, height: 8, backgroundColor: "#FFD98A" }} />
      </StepIn>
      <StepIn delay={140} style={{ position: "absolute", left: "78%", bottom: 24, width: 32, height: 40 }}>
        <Px style={{ width: 32, height: 40, backgroundColor: "#1C2340" }} />
        <Px style={{ position: "absolute", left: 12, bottom: 16, width: 8, height: 8, backgroundColor: "#FFD98A" }} />
      </StepIn>
      <StepIn delay={180} style={{ position: "absolute", left: "59%", bottom: 24, width: 40, height: 92 }}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 40, height: 84, backgroundColor: "#232B4A" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 84, width: 40, height: 12, backgroundColor: "#1B2240" }} />
        <Px style={{ position: "absolute", left: 8, bottom: 56, width: 24, height: 24, backgroundColor: "#0F1430" }} />
        <Px style={{ position: "absolute", left: 12, bottom: 60, width: 16, height: 16, backgroundColor: "#8A93B8" }} />
        <Px style={{ position: "absolute", left: 16, bottom: 64, width: 8, height: 8, backgroundColor: "#0F1430" }} />
        <Px style={{ position: "absolute", left: 16, bottom: 36, width: 8, height: 8, backgroundColor: "#FFD98A" }} />
        <Px style={{ position: "absolute", left: 16, bottom: 16, width: 8, height: 8, backgroundColor: "#FFD98A" }} />
      </StepIn>
      <StepBob left="52%" bottom={100} width={24} height={12} distance={4} period={1100} delay={0}>
        <Px style={{ position: "absolute", left: 0, bottom: 4, width: 8, height: 4, backgroundColor: "#0D0F1E" }} />
        <Px style={{ position: "absolute", left: 16, bottom: 4, width: 8, height: 4, backgroundColor: "#0D0F1E" }} />
        <Px style={{ position: "absolute", left: 8, bottom: 0, width: 8, height: 8, backgroundColor: "#0D0F1E" }} />
      </StepBob>
      <StepBob left="72%" bottom={112} width={20} height={12} distance={4} period={1300} delay={500}>
        <Px style={{ position: "absolute", left: 0, bottom: 4, width: 8, height: 4, backgroundColor: "#0D0F1E" }} />
        <Px style={{ position: "absolute", left: 12, bottom: 4, width: 8, height: 4, backgroundColor: "#0D0F1E" }} />
        <Px style={{ position: "absolute", left: 8, bottom: 0, width: 4, height: 8, backgroundColor: "#0D0F1E" }} />
      </StepBob>
      <Px style={{ position: "absolute", left: "42%", right: 0, bottom: 0, height: "24%", backgroundColor: "#1E2645" }} />
      <Px style={{ position: "absolute", left: "54%", right: 0, bottom: 0, height: "14%", backgroundColor: "#283158" }} />
    </PixelSceneRoot>
  );
}

export function PixelTvOriginalsScene() {
  return (
    <PixelSceneRoot base="#1E1433">
      <Px style={{ position: "absolute", left: "84%", bottom: 96, width: 28, height: 28, backgroundColor: "#EFE8FA" }} />
      <StepIn delay={80} style={{ position: "absolute", left: "53%", bottom: 20, width: 56, height: 84 }}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 56, height: 84, backgroundColor: "#2A2044" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 40, width: 56, height: 4, backgroundColor: "#171126" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 60, width: 56, height: 4, backgroundColor: "#171126" }} />
        <Px style={{ position: "absolute", left: 4, bottom: 44, width: 4, height: 16, backgroundColor: "#0F0B1C" }} />
        <Px style={{ position: "absolute", left: 16, bottom: 44, width: 4, height: 16, backgroundColor: "#0F0B1C" }} />
        <Px style={{ position: "absolute", left: 28, bottom: 44, width: 4, height: 16, backgroundColor: "#0F0B1C" }} />
        <Px style={{ position: "absolute", left: 40, bottom: 44, width: 4, height: 16, backgroundColor: "#0F0B1C" }} />
        <Px style={{ position: "absolute", left: 8, bottom: 64, width: 12, height: 16, backgroundColor: "#171126" }} />
        <Px style={{ position: "absolute", left: 36, bottom: 64, width: 12, height: 16, backgroundColor: "#171126" }} />
        <Px style={{ position: "absolute", left: 16, bottom: 0, width: 20, height: 32, backgroundColor: "#3A2A1A" }} />
        <Px style={{ position: "absolute", left: 20, bottom: 4, width: 12, height: 24, backgroundColor: "#FFB46B" }} />
      </StepIn>
      <Px style={{ position: "absolute", left: "47%", bottom: 20, width: 4, height: 40, backgroundColor: "#0F0B1C" }} />
      <StepBlink period={1000} style={{ position: "absolute", left: "45%", bottom: 56, width: 8, height: 8 }}><Px style={{ width: 8, height: 8, backgroundColor: "#FFD98A" }} /></StepBlink>
      <Px style={{ position: "absolute", left: "89%", bottom: 20, width: 4, height: 40, backgroundColor: "#0F0B1C" }} />
      <StepBlink period={1100} style={{ position: "absolute", left: "87%", bottom: 56, width: 8, height: 8 }}><Px style={{ width: 8, height: 8, backgroundColor: "#FFD98A" }} /></StepBlink>
    </PixelSceneRoot>
  );
}

export function PixelTvLegaciesScene() {
  return (
    <PixelSceneRoot base="#16241F">
      <Px style={{ position: "absolute", left: "85%", bottom: 96, width: 24, height: 24, backgroundColor: "#EEF7F1" }} />
      <StepIn delay={80} style={{ position: "absolute", left: "53%", bottom: 24, width: 64, height: 72 }}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 64, height: 64, backgroundColor: "#22332B" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 64, width: 64, height: 8, backgroundColor: "#1A2822" }} />
        <Px style={{ position: "absolute", left: 4, bottom: 0, width: 8, height: 64, backgroundColor: "#1A2822" }} />
        <Px style={{ position: "absolute", left: 28, bottom: 0, width: 8, height: 64, backgroundColor: "#1A2822" }} />
        <Px style={{ position: "absolute", left: 52, bottom: 0, width: 8, height: 64, backgroundColor: "#1A2822" }} />
        <Px style={{ position: "absolute", left: 16, bottom: 44, width: 8, height: 8, backgroundColor: "#FFD98A" }} />
        <Px style={{ position: "absolute", left: 40, bottom: 44, width: 8, height: 8, backgroundColor: "#FFD98A" }} />
        <Px style={{ position: "absolute", left: 16, bottom: 24, width: 8, height: 8, backgroundColor: "#FFD98A" }} />
        <Px style={{ position: "absolute", left: 24, bottom: 0, width: 16, height: 24, backgroundColor: "#FFC46B" }} />
      </StepIn>
      <StepIn delay={180} style={{ position: "absolute", left: "45%", bottom: 16, width: 12, height: 36 }}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 12, height: 32, backgroundColor: "#2E4038" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 32, width: 12, height: 4, backgroundColor: "#24352D" }} />
      </StepIn>
      <StepIn delay={220} style={{ position: "absolute", left: "93%", bottom: 16, width: 12, height: 36 }}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 12, height: 32, backgroundColor: "#2E4038" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 32, width: 12, height: 4, backgroundColor: "#24352D" }} />
      </StepIn>
      <StepBlink period={900} style={{ position: "absolute", left: "56%", bottom: 36, width: 8, height: 8 }}><Px style={{ width: 8, height: 8, backgroundColor: "#B8F59B" }} /></StepBlink>
      <StepBlink period={1100} style={{ position: "absolute", left: "70%", bottom: 16, width: 8, height: 8 }}><Px style={{ width: 8, height: 8, backgroundColor: "#B8F59B" }} /></StepBlink>
      <StepBlink period={1000} style={{ position: "absolute", left: "88%", bottom: 32, width: 8, height: 8 }}><Px style={{ width: 8, height: 8, backgroundColor: "#B8F59B" }} /></StepBlink>
    </PixelSceneRoot>
  );
}
