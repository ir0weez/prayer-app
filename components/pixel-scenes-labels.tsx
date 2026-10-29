// Pixel renditions of the label keyword scenes for the 8-bit skin (v183),
// mirroring the paper scenes' compositions in chunky squares, stepped motion only.

import { View } from "react-native";
import { PixelSceneRoot, Px, StepIn, StepBob, StepBlink, PxSun, PxCloud, PxFigure } from "@/components/pixel-kit";

export function PixelGardeningScene() {
  return (
    <PixelSceneRoot base="#8FC7E8">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "46%", backgroundColor: "#6FA84F" }} />
      <PxSun left="84%" bottom={104} size={28} />
      <PxCloud left="56%" top={12} width={64} />
      <StepIn delay={60} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        <Px style={{ position: "absolute", left: "52%", bottom: 8, width: 148, height: 28, backgroundColor: "#5D4037" }} />
        {[0, 1, 2].map((i) => (
          <View key={i} style={{ position: "absolute", left: `${58 + i * 11}%` as `${number}%`, bottom: 32, width: 20, height: 28 }}>
            <Px style={{ position: "absolute", left: 8, bottom: 0, width: 4, height: 16, backgroundColor: "#3E7C43" }} />
            <Px style={{ position: "absolute", left: 0, bottom: 12, width: 8, height: 8, backgroundColor: "#58A05C" }} />
            <Px style={{ position: "absolute", left: 12, bottom: 16, width: 8, height: 8, backgroundColor: "#6FBF73" }} />
          </View>
        ))}
        <Px style={{ position: "absolute", left: "45%", bottom: 28, width: 28, height: 20, backgroundColor: "#4E9AAB" }} />
        <Px style={{ position: "absolute", left: "42%", bottom: 40, width: 16, height: 4, backgroundColor: "#4E9AAB" }} />
        <Px style={{ position: "absolute", left: "50%", bottom: 44, width: 16, height: 8, backgroundColor: "#3E7C8A" }} />
        <Px style={{ position: "absolute", left: "44%", bottom: 16, width: 4, height: 8, backgroundColor: "#BFE6F5" }} />
        <Px style={{ position: "absolute", left: "88%", bottom: 12, width: 12, height: 12, backgroundColor: "#E86A92" }} />
        <Px style={{ position: "absolute", left: "91%", bottom: 24, width: 8, height: 8, backgroundColor: "#FFC531" }} />
      </StepIn>
    </PixelSceneRoot>
  );
}

export function PixelMowLawnScene() {
  return (
    <PixelSceneRoot base="#69A84F">
      <View style={{ position: "absolute", left: "52%", top: 0, bottom: 0, width: "12%", backgroundColor: "#7CB95F" }} />
      <View style={{ position: "absolute", left: "76%", top: 0, bottom: 0, width: "12%", backgroundColor: "#7CB95F" }} />
      <PxSun left="88%" bottom={112} size={24} />
      <StepIn delay={60} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        <Px style={{ position: "absolute", left: "58%", bottom: 28, width: 64, height: 24, backgroundColor: "#C0392B" }} shadow />
        <Px style={{ position: "absolute", left: "60%", bottom: 52, width: 40, height: 12, backgroundColor: "#922B21" }} />
        <Px style={{ position: "absolute", left: "55%", bottom: 48, width: 4, height: 40, backgroundColor: "#3A3A42" }} />
        <Px style={{ position: "absolute", left: "59%", bottom: 12, width: 16, height: 16, backgroundColor: "#2C2C33" }} />
        <Px style={{ position: "absolute", left: "71%", bottom: 12, width: 16, height: 16, backgroundColor: "#2C2C33" }} />
        {[0, 1, 2, 3].map((i) => (
          <Px key={i} style={{ position: "absolute", left: `${50 + i * 6}%` as `${number}%`, bottom: 8 + (i % 2) * 8, width: 8, height: 4, backgroundColor: "#4E7D3A" }} />
        ))}
      </StepIn>
      <PxFigure left="47%" bottom={10} body="#3E7CB1" scale={0.95} />
    </PixelSceneRoot>
  );
}

export function PixelPruneScene() {
  return (
    <PixelSceneRoot base="#A8C686">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "30%", backgroundColor: "#7D9B57" }} />
      <StepIn delay={60} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        <Px style={{ position: "absolute", left: "56%", bottom: 24, width: 108, height: 72, backgroundColor: "#4E7D3A" }} shadow />
        <Px style={{ position: "absolute", left: "62%", bottom: 72, width: 64, height: 44, backgroundColor: "#5D8F47" }} />
        <Px style={{ position: "absolute", left: "52%", bottom: 52, width: 44, height: 40, backgroundColor: "#5D8F47" }} />
        <Px style={{ position: "absolute", left: "50%", bottom: 88, width: 28, height: 4, backgroundColor: "#6B4423" }} />
        <Px style={{ position: "absolute", left: "46%", bottom: 96, width: 24, height: 4, backgroundColor: "#C0C6CE" }} />
        <Px style={{ position: "absolute", left: "46%", bottom: 80, width: 24, height: 4, backgroundColor: "#AEB6BF" }} />
      </StepIn>
      <StepBob left="60%" bottom={36} width={8} height={8} distance={4} period={1300}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 8, height: 8, backgroundColor: "#6FBF73" }} />
      </StepBob>
      <StepBob left="74%" bottom={20} width={8} height={8} distance={4} period={1500} delay={300}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 8, height: 8, backgroundColor: "#58A05C" }} />
      </StepBob>
      <PxFigure left="42%" bottom={8} body="#8A6D3B" scale={0.95} />
    </PixelSceneRoot>
  );
}

export function PixelHarvestScene() {
  return (
    <PixelSceneRoot base="#E8B34B">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "38%", backgroundColor: "#C98A2E" }} />
      <PxSun left="86%" bottom={108} size={28} />
      <StepIn delay={60} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <View key={i} style={{ position: "absolute", left: `${52 + i * 7}%` as `${number}%`, bottom: 16, width: 12, height: 72 }}>
            <Px style={{ position: "absolute", left: 4, bottom: 0, width: 4, height: 56, backgroundColor: "#B57F24" }} />
            <Px style={{ position: "absolute", left: 0, bottom: 52, width: 12, height: 20, backgroundColor: "#F2C14E" }} />
            <Px style={{ position: "absolute", left: 0, bottom: 40, width: 12, height: 12, backgroundColor: "#E8B34B" }} />
          </View>
        ))}
        <Px style={{ position: "absolute", left: "82%", bottom: 8, width: 64, height: 32, backgroundColor: "#8A5A2B" }} />
        <Px style={{ position: "absolute", left: "81%", bottom: 40, width: 68, height: 8, backgroundColor: "#6B4423" }} />
        <Px style={{ position: "absolute", left: "84%", bottom: 44, width: 16, height: 16, backgroundColor: "#C0392B" }} />
        <Px style={{ position: "absolute", left: "89%", bottom: 44, width: 16, height: 16, backgroundColor: "#A93226" }} />
        <Px style={{ position: "absolute", left: "86%", bottom: 56, width: 16, height: 16, backgroundColor: "#CD6155" }} />
      </StepIn>
    </PixelSceneRoot>
  );
}

export function PixelBibleStudyScene() {
  return (
    <PixelSceneRoot base="#7A5230">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "40%", backgroundColor: "#5D3D22" }} />
      <StepIn delay={60} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        <Px style={{ position: "absolute", left: "52%", bottom: 28, width: 60, height: 44, backgroundColor: "#FFF8E1" }} shadow />
        <Px style={{ position: "absolute", left: "66%", bottom: 28, width: 60, height: 44, backgroundColor: "#FBF3DE" }} />
        <Px style={{ position: "absolute", left: "56%", bottom: 56, width: 44, height: 4, backgroundColor: "#D8CBB2" }} />
        <Px style={{ position: "absolute", left: "56%", bottom: 44, width: 44, height: 4, backgroundColor: "#D8CBB2" }} />
        <Px style={{ position: "absolute", left: "70%", bottom: 56, width: 44, height: 4, backgroundColor: "#D8CBB2" }} />
        <Px style={{ position: "absolute", left: "70%", bottom: 44, width: 44, height: 4, backgroundColor: "#D8CBB2" }} />
        <Px style={{ position: "absolute", left: "88%", bottom: 84, width: 28, height: 28, backgroundColor: "#FFE9A8" }} />
        <Px style={{ position: "absolute", left: "89%", bottom: 64, width: 20, height: 20, backgroundColor: "#F5A623" }} />
        <Px style={{ position: "absolute", left: "92%", bottom: 20, width: 4, height: 44, backgroundColor: "#3A3A42" }} />
        <Px style={{ position: "absolute", left: "47%", bottom: 24, width: 20, height: 16, backgroundColor: "#7C4DFF" }} />
      </StepIn>
      <PxFigure left="42%" bottom={8} body="#5E35D6" scale={0.9} />
    </PixelSceneRoot>
  );
}

export function PixelWorshipScene() {
  return (
    <PixelSceneRoot base="#5E35D6">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "34%", backgroundColor: "#45259E" }} />
      <View style={{ position: "absolute", left: "58%", top: 0, width: 24, height: 120, backgroundColor: "#FFFFFF", opacity: 0.1 }} />
      <View style={{ position: "absolute", left: "78%", top: 0, width: 20, height: 120, backgroundColor: "#FFFFFF", opacity: 0.08 }} />
      <StepIn delay={60} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        <PxFigure left="52%" bottom={10} body="#FFC531" skin="#8D5A33" hair="#2C1A0E" armsUp scale={1.05} />
        <PxFigure left="66%" bottom={8} body="#F6F0FF" armsUp scale={0.95} />
        <PxFigure left="79%" bottom={10} body="#7FB3D5" skin="#6B4423" hair="#14100C" armsUp scale={1} />
      </StepIn>
      <StepBob left="58%" bottom={104} width={12} height={20} distance={4} period={1200}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 8, height: 8, backgroundColor: "#FFC531" }} />
        <Px style={{ position: "absolute", left: 8, bottom: 8, width: 4, height: 12, backgroundColor: "#FFC531" }} />
      </StepBob>
      <StepBob left="76%" bottom={116} width={12} height={20} distance={4} period={1400} delay={300}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 8, height: 8, backgroundColor: "#FFFFFF" }} />
        <Px style={{ position: "absolute", left: 8, bottom: 8, width: 4, height: 12, backgroundColor: "#FFFFFF" }} />
      </StepBob>
    </PixelSceneRoot>
  );
}

export function PixelPrayerScene() {
  return (
    <PixelSceneRoot base="#4A3A6B">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "32%", backgroundColor: "#372A52" }} />
      <View style={{ position: "absolute", left: "62%", top: 0, width: 32, height: 128, backgroundColor: "#FFE9A8", opacity: 0.14 }} />
      <StepIn delay={60} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        <Px style={{ position: "absolute", left: "58%", bottom: 12, width: 44, height: 20, backgroundColor: "#7C4DFF" }} shadow />
        <Px style={{ position: "absolute", left: "63%", bottom: 28, width: 16, height: 24, backgroundColor: "#7C4DFF" }} />
        <Px style={{ position: "absolute", left: "69%", bottom: 44, width: 16, height: 16, backgroundColor: "#F2C79B" }} />
        <Px style={{ position: "absolute", left: "69%", bottom: 56, width: 16, height: 4, backgroundColor: "#4A3220" }} />
        <Px style={{ position: "absolute", left: "84%", bottom: 12, width: 12, height: 20, backgroundColor: "#FFF8E1" }} />
        <Px style={{ position: "absolute", left: "84%", bottom: 32, width: 12, height: 12, backgroundColor: "#FFB300" }} />
      </StepIn>
      <StepBob left="66%" bottom={88} width={8} height={8} distance={4} period={1600}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 8, height: 8, backgroundColor: "#FFE9A8" }} />
      </StepBob>
      <StepBob left="72%" bottom={104} width={4} height={4} distance={4} period={1800} delay={400}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 4, height: 4, backgroundColor: "#FFE9A8" }} />
      </StepBob>
    </PixelSceneRoot>
  );
}

export function PixelFastScene() {
  return (
    <PixelSceneRoot base="#EFE7D3">
      <StepIn delay={60} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        <Px style={{ position: "absolute", left: "55%", bottom: 32, width: 104, height: 100, backgroundColor: "#FFFFFF" }} shadow />
        <Px style={{ position: "absolute", left: "60%", bottom: 44, width: 80, height: 76, backgroundColor: "#FFFFFF" }} />
        <Px style={{ position: "absolute", left: "62%", bottom: 48, width: 72, height: 68, backgroundColor: "#D8CBB2" }} />
        <Px style={{ position: "absolute", left: "64%", bottom: 52, width: 64, height: 60, backgroundColor: "#FFFFFF" }} />
        <Px style={{ position: "absolute", left: "48%", bottom: 48, width: 4, height: 64, backgroundColor: "#9AA3AD" }} />
        <Px style={{ position: "absolute", left: "90%", bottom: 48, width: 4, height: 64, backgroundColor: "#9AA3AD" }} />
        <Px style={{ position: "absolute", left: "86%", bottom: 12, width: 12, height: 20, backgroundColor: "#FFF8E1" }} />
        <Px style={{ position: "absolute", left: "86%", bottom: 32, width: 12, height: 12, backgroundColor: "#FFB300" }} />
      </StepIn>
    </PixelSceneRoot>
  );
}

export function PixelBBQScene() {
  return (
    <PixelSceneRoot base="#B4552D">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "30%", backgroundColor: "#8A3E1F" }} />
      <StepIn delay={60} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        <Px style={{ position: "absolute", left: "56%", bottom: 44, width: 96, height: 32, backgroundColor: "#2C2C33" }} shadow />
        <Px style={{ position: "absolute", left: "56%", bottom: 76, width: 96, height: 16, backgroundColor: "#3A3A42" }} />
        <Px style={{ position: "absolute", left: "60%", bottom: 84, width: 24, height: 8, backgroundColor: "#A93226" }} />
        <Px style={{ position: "absolute", left: "68%", bottom: 84, width: 24, height: 8, backgroundColor: "#922B21" }} />
        <Px style={{ position: "absolute", left: "60%", bottom: 12, width: 4, height: 32, backgroundColor: "#2C2C33" }} />
        <Px style={{ position: "absolute", left: "72%", bottom: 12, width: 4, height: 32, backgroundColor: "#2C2C33" }} />
        <Px style={{ position: "absolute", left: "66%", bottom: 28, width: 16, height: 20, backgroundColor: "#F5A623" }} />
      </StepIn>
      <StepBob left="64%" bottom={112} width={12} height={12} distance={4} period={1500}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 12, height: 12, backgroundColor: "#FFFFFF", opacity: 0.75 }} />
      </StepBob>
      <StepBob left="70%" bottom={124} width={8} height={8} distance={4} period={1700} delay={300}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 8, height: 8, backgroundColor: "#FFFFFF", opacity: 0.6 }} />
      </StepBob>
    </PixelSceneRoot>
  );
}

export function PixelTherapyScene() {
  return (
    <PixelSceneRoot base="#A8C3A0">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "28%", backgroundColor: "#87A87D" }} />
      <StepIn style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        <Px style={{ position: "absolute", left: "52%", bottom: 20, width: 32, height: 40, backgroundColor: "#7C4DFF" }} shadow />
        <Px style={{ position: "absolute", left: "52%", bottom: 56, width: 32, height: 16, backgroundColor: "#9575E8" }} />
        <Px style={{ position: "absolute", left: "76%", bottom: 20, width: 32, height: 40, backgroundColor: "#E8A94E" }} />
        <Px style={{ position: "absolute", left: "76%", bottom: 56, width: 32, height: 16, backgroundColor: "#F0BE6A" }} />
        <Px style={{ position: "absolute", left: "66%", bottom: 12, width: 16, height: 12, backgroundColor: "#A93226" }} />
        <Px style={{ position: "absolute", left: "64%", bottom: 24, width: 8, height: 8, backgroundColor: "#3E7C43" }} />
        <Px style={{ position: "absolute", left: "69%", bottom: 28, width: 8, height: 8, backgroundColor: "#58A05C" }} />
        <Px style={{ position: "absolute", left: "58%", bottom: 104, width: 52, height: 28, backgroundColor: "#FFFFFF" }} />
        <Px style={{ position: "absolute", left: "62%", bottom: 96, width: 8, height: 8, backgroundColor: "#FFFFFF" }} />
        <Px style={{ position: "absolute", left: "61%", bottom: 116, width: 8, height: 8, backgroundColor: "#A8C3A0" }} />
        <Px style={{ position: "absolute", left: "65%", bottom: 116, width: 8, height: 8, backgroundColor: "#A8C3A0" }} />
        <Px style={{ position: "absolute", left: "69%", bottom: 116, width: 8, height: 8, backgroundColor: "#A8C3A0" }} />
      </StepIn>
    </PixelSceneRoot>
  );
}

export function PixelDoctorScene() {
  return (
    <PixelSceneRoot base="#DCE9F2">
      <StepIn style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        <Px style={{ position: "absolute", left: "58%", bottom: 16, width: 76, height: 104, backgroundColor: "#8A6D4B" }} shadow />
        <Px style={{ position: "absolute", left: "60%", bottom: 20, width: 64, height: 92, backgroundColor: "#FFFFFF" }} />
        <Px style={{ position: "absolute", left: "66%", bottom: 108, width: 28, height: 8, backgroundColor: "#C0C6CE" }} />
        <Px style={{ position: "absolute", left: "68%", bottom: 68, width: 12, height: 36, backgroundColor: "#D64545" }} />
        <Px style={{ position: "absolute", left: "64%", bottom: 80, width: 36, height: 12, backgroundColor: "#D64545" }} />
        <Px style={{ position: "absolute", left: "63%", bottom: 52, width: 48, height: 4, backgroundColor: "#B9CBD8" }} />
        <Px style={{ position: "absolute", left: "63%", bottom: 40, width: 36, height: 4, backgroundColor: "#B9CBD8" }} />
      </StepIn>
      <StepBob left="46%" bottom={88} width={24} height={20} distance={4} period={1200}>
        <Px style={{ position: "absolute", left: 0, bottom: 8, width: 12, height: 12, backgroundColor: "#E86A92" }} />
        <Px style={{ position: "absolute", left: 12, bottom: 8, width: 12, height: 12, backgroundColor: "#E86A92" }} />
        <Px style={{ position: "absolute", left: 6, bottom: 0, width: 12, height: 12, backgroundColor: "#E86A92" }} />
      </StepBob>
    </PixelSceneRoot>
  );
}

export function PixelHaircutScene() {
  return (
    <PixelSceneRoot base="#8EC9D8">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "26%", backgroundColor: "#6FAEC2" }} />
      <StepIn style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        <Px style={{ position: "absolute", left: "56%", bottom: 44, width: 76, height: 92, backgroundColor: "#5B87A0" }} shadow />
        <Px style={{ position: "absolute", left: "58%", bottom: 52, width: 60, height: 76, backgroundColor: "#DFF3F9" }} />
        <Px style={{ position: "absolute", left: "64%", bottom: 68, width: 32, height: 32, backgroundColor: "#F2C79B" }} />
        <Px style={{ position: "absolute", left: "64%", bottom: 92, width: 32, height: 8, backgroundColor: "#4A3220" }} />
        <Px style={{ position: "absolute", left: "82%", bottom: 108, width: 28, height: 4, backgroundColor: "#5B6B7A" }} />
        <Px style={{ position: "absolute", left: "82%", bottom: 96, width: 28, height: 4, backgroundColor: "#43525F" }} />
        <Px style={{ position: "absolute", left: "92%", bottom: 104, width: 8, height: 8, backgroundColor: "#5B6B7A" }} />
        <Px style={{ position: "absolute", left: "92%", bottom: 92, width: 8, height: 8, backgroundColor: "#43525F" }} />
        {[0, 1, 2].map((i) => (
          <Px key={i} style={{ position: "absolute", left: `${58 + i * 9}%` as `${number}%`, bottom: 12 + (i % 2) * 4, width: 12, height: 4, backgroundColor: "#4A3220" }} />
        ))}
        <Px style={{ position: "absolute", left: "60%", bottom: 20, width: 44, height: 24, backgroundColor: "#7C4DFF" }} />
      </StepIn>
    </PixelSceneRoot>
  );
}

export function PixelParkScene() {
  return (
    <PixelSceneRoot base="#9ED1F2">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "42%", backgroundColor: "#69A84F" }} />
      <PxSun left="86%" bottom={108} size={28} />
      <PxCloud left="52%" top={14} width={68} />
      <StepIn delay={60} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        <Px style={{ position: "absolute", left: "62%", bottom: 32, width: 8, height: 52, backgroundColor: "#6B4423" }} />
        <Px style={{ position: "absolute", left: "50%", bottom: 68, width: 76, height: 60, backgroundColor: "#3E7C43" }} shadow />
        <Px style={{ position: "absolute", left: "58%", bottom: 96, width: 48, height: 40, backgroundColor: "#58A05C" }} />
        <Px style={{ position: "absolute", left: "76%", bottom: 32, width: 52, height: 8, backgroundColor: "#8A5A2B" }} />
        <Px style={{ position: "absolute", left: "76%", bottom: 44, width: 52, height: 8, backgroundColor: "#8A5A2B" }} />
        <Px style={{ position: "absolute", left: "78%", bottom: 16, width: 4, height: 16, backgroundColor: "#6B4423" }} />
        <Px style={{ position: "absolute", left: "87%", bottom: 16, width: 4, height: 16, backgroundColor: "#6B4423" }} />
        <Px style={{ position: "absolute", left: "44%", bottom: 0, width: 32, height: 16, backgroundColor: "#D7CCC8" }} />
      </StepIn>
    </PixelSceneRoot>
  );
}


export function PixelPartyScene() {
  return (
    <PixelSceneRoot base="#7C4DFF">
      <StepIn style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        <View style={{ position: "absolute", left: "42%", bottom: 140, width: "58%", height: 4, backgroundColor: "#5E35D6" }} />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Px key={i} style={{ position: "absolute", left: `${44 + i * 9.5}%` as `${number}%`, bottom: 124 - (i % 2) * 4, width: 16, height: 12, backgroundColor: ["#FFC531", "#E86A92", "#7FB3D5", "#58A05C", "#FF8A5C", "#F6F0FF"][i] }} />
        ))}
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <Px key={i} style={{ position: "absolute", left: `${48 + i * 7}%` as `${number}%`, bottom: 16 + (i % 3) * 8, width: 8, height: 4, backgroundColor: ["#FFC531", "#E86A92", "#7FB3D5", "#58A05C"][i % 4] }} />
        ))}
      </StepIn>
      <StepBob left="52%" bottom={48} width={28} height={40} distance={4} period={1400}>
        <Px style={{ position: "absolute", left: 0, bottom: 8, width: 28, height: 32, backgroundColor: "#E86A92" }} />
        <Px style={{ position: "absolute", left: 12, bottom: 0, width: 4, height: 8, backgroundColor: "#C94F6D" }} />
      </StepBob>
      <StepBob left="66%" bottom={56} width={28} height={40} distance={4} period={1600} delay={300}>
        <Px style={{ position: "absolute", left: 0, bottom: 8, width: 28, height: 32, backgroundColor: "#FFC531" }} />
        <Px style={{ position: "absolute", left: 12, bottom: 0, width: 4, height: 8, backgroundColor: "#F5A623" }} />
      </StepBob>
      <StepBob left="80%" bottom={48} width={28} height={40} distance={4} period={1500} delay={600}>
        <Px style={{ position: "absolute", left: 0, bottom: 8, width: 28, height: 32, backgroundColor: "#7FB3D5" }} />
        <Px style={{ position: "absolute", left: 12, bottom: 0, width: 4, height: 8, backgroundColor: "#5B9BD5" }} />
      </StepBob>
    </PixelSceneRoot>
  );
}

export function PixelSchoolScene() {
  return (
    <PixelSceneRoot base="#4A6FA5">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "30%", backgroundColor: "#38567F" }} />
      <StepIn style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        <Px style={{ position: "absolute", left: "54%", bottom: 24, width: 112, height: 60, backgroundColor: "#F2D8A7" }} shadow />
        <Px style={{ position: "absolute", left: "51%", bottom: 84, width: 128, height: 16, backgroundColor: "#A93226" }} />
        <Px style={{ position: "absolute", left: "66%", bottom: 84, width: 36, height: 28, backgroundColor: "#C9A86A" }} />
        <Px style={{ position: "absolute", left: "73%", bottom: 108, width: 4, height: 28, backgroundColor: "#3A3A42" }} />
        <Px style={{ position: "absolute", left: "74%", bottom: 124, width: 20, height: 12, backgroundColor: "#D64545" }} />
        <Px style={{ position: "absolute", left: "70%", bottom: 24, width: 20, height: 32, backgroundColor: "#5D4037" }} />
        <Px style={{ position: "absolute", left: "57%", bottom: 52, width: 16, height: 16, backgroundColor: "#BFE6F5" }} />
        <Px style={{ position: "absolute", left: "84%", bottom: 52, width: 16, height: 16, backgroundColor: "#BFE6F5" }} />
        <Px style={{ position: "absolute", left: "45%", bottom: 12, width: 28, height: 8, backgroundColor: "#3E7CB1" }} />
        <Px style={{ position: "absolute", left: "46%", bottom: 20, width: 24, height: 8, backgroundColor: "#C0392B" }} />
        <Px style={{ position: "absolute", left: "47%", bottom: 28, width: 20, height: 8, backgroundColor: "#58A05C" }} />
      </StepIn>
    </PixelSceneRoot>
  );
}

export function PixelWaterParkScene() {
  return (
    <PixelSceneRoot base="#4FB3D9">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "30%", backgroundColor: "#7ED0E8" }} />
      <PxSun left="46%" bottom={112} size={24} />
      <StepIn delay={60} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        <Px style={{ position: "absolute", left: "56%", bottom: 40, width: 12, height: 72, backgroundColor: "#5B6B7A" }} />
        <Px style={{ position: "absolute", left: "56%", bottom: 108, width: 44, height: 12, backgroundColor: "#E86A92" }} />
        <Px style={{ position: "absolute", left: "64%", bottom: 76, width: 56, height: 16, backgroundColor: "#FFC531" }} />
        <Px style={{ position: "absolute", left: "76%", bottom: 52, width: 48, height: 16, backgroundColor: "#FFC531" }} />
        <Px style={{ position: "absolute", left: "82%", bottom: 36, width: 40, height: 12, backgroundColor: "#FFC531" }} />
        <Px style={{ position: "absolute", left: "86%", bottom: 28, width: 12, height: 12, backgroundColor: "#FFFFFF" }} />
        <Px style={{ position: "absolute", left: "92%", bottom: 32, width: 8, height: 8, backgroundColor: "#FFFFFF" }} />
      </StepIn>
      <StepBob left="48%" bottom={12} width={44} height={16} distance={4} period={1400}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 44, height: 16, backgroundColor: "#E86A92" }} />
        <Px style={{ position: "absolute", left: 16, bottom: 4, width: 12, height: 8, backgroundColor: "#7ED0E8" }} />
      </StepBob>
    </PixelSceneRoot>
  );
}

export function PixelBeachScene() {
  return (
    <PixelSceneRoot base="#57B8D6">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "40%", backgroundColor: "#E8C87A" }} />
      <PxSun left="86%" bottom={110} size={28} />
      <StepIn delay={60} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        <View style={{ position: "absolute", left: "40%", right: 0, bottom: 60, height: 4, backgroundColor: "#FFFFFF", opacity: 0.65 }} />
        <Px style={{ position: "absolute", left: "60%", bottom: 28, width: 4, height: 52, backgroundColor: "#8A5A2B" }} />
        <Px style={{ position: "absolute", left: "48%", bottom: 76, width: 76, height: 28, backgroundColor: "#E86A92" }} shadow />
        <Px style={{ position: "absolute", left: "58%", bottom: 76, width: 20, height: 28, backgroundColor: "#F2F2F2" }} />
        <Px style={{ position: "absolute", left: "72%", bottom: 12, width: 52, height: 16, backgroundColor: "#7FB3D5" }} />
        <Px style={{ position: "absolute", left: "88%", bottom: 16, width: 16, height: 16, backgroundColor: "#FFC531" }} />
        <Px style={{ position: "absolute", left: "50%", bottom: 16, width: 12, height: 8, backgroundColor: "#F6C6D8" }} />
        <Px style={{ position: "absolute", left: "55%", bottom: 28, width: 8, height: 8, backgroundColor: "#FFFFFF" }} />
      </StepIn>
    </PixelSceneRoot>
  );
}

export function PixelBabyShowerScene() {
  return (
    <PixelSceneRoot base="#F6C6D8">
      <StepIn style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <Px key={i} style={{ position: "absolute", left: `${46 + i * 11}%` as `${number}%`, bottom: 128 - (i % 2) * 4, width: 12, height: 12, backgroundColor: ["#FFFFFF", "#A8D8EA", "#FFE9A8", "#FFFFFF", "#A8D8EA"][i] }} />
        ))}
        <Px style={{ position: "absolute", left: "58%", bottom: 32, width: 56, height: 60, backgroundColor: "#FFFFFF" }} shadow />
        <Px style={{ position: "absolute", left: "54%", bottom: 76, width: 16, height: 20, backgroundColor: "#FFFFFF" }} />
        <Px style={{ position: "absolute", left: "74%", bottom: 76, width: 16, height: 20, backgroundColor: "#FFFFFF" }} />
        <Px style={{ position: "absolute", left: "64%", bottom: 56, width: 12, height: 12, backgroundColor: "#E86A92" }} />
        <Px style={{ position: "absolute", left: "70%", bottom: 56, width: 12, height: 12, backgroundColor: "#E86A92" }} />
        <Px style={{ position: "absolute", left: "67%", bottom: 48, width: 12, height: 12, backgroundColor: "#E86A92" }} />
        <Px style={{ position: "absolute", left: "84%", bottom: 24, width: 16, height: 32, backgroundColor: "#DFF3F9" }} />
        <Px style={{ position: "absolute", left: "85%", bottom: 56, width: 12, height: 8, backgroundColor: "#FFC531" }} />
        <Px style={{ position: "absolute", left: "44%", bottom: 12, width: 28, height: 24, backgroundColor: "#A8D8EA" }} />
        <Px style={{ position: "absolute", left: "47%", bottom: 12, width: 4, height: 24, backgroundColor: "#FFFFFF" }} />
      </StepIn>
    </PixelSceneRoot>
  );
}

export function PixelBirthdayScene() {
  return (
    <PixelSceneRoot base="#FF8A5C">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "26%", backgroundColor: "#E06F3C" }} />
      <StepIn style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        <Px style={{ position: "absolute", left: "54%", bottom: 16, width: 104, height: 24, backgroundColor: "#7A4A2B" }} shadow />
        <Px style={{ position: "absolute", left: "58%", bottom: 40, width: 84, height: 24, backgroundColor: "#F6C6D8" }} />
        <Px style={{ position: "absolute", left: "62%", bottom: 64, width: 64, height: 20, backgroundColor: "#FFF3E0" }} />
        {[0, 1, 2].map((i) => (
          <View key={i} style={{ position: "absolute", left: `${66 + i * 7}%` as `${number}%`, bottom: 84, width: 8, height: 28 }}>
            <Px style={{ position: "absolute", left: 0, bottom: 0, width: 4, height: 16, backgroundColor: "#7FB3D5" }} />
            <Px style={{ position: "absolute", left: 0, bottom: 16, width: 8, height: 12, backgroundColor: "#FFC531" }} />
          </View>
        ))}
      </StepIn>
      <StepBob left="44%" bottom={72} width={24} height={36} distance={4} period={1500}>
        <Px style={{ position: "absolute", left: 0, bottom: 8, width: 24, height: 28, backgroundColor: "#7C4DFF" }} />
      </StepBob>
      <StepBob left="88%" bottom={76} width={24} height={36} distance={4} period={1600} delay={300}>
        <Px style={{ position: "absolute", left: 0, bottom: 8, width: 24, height: 28, backgroundColor: "#58A05C" }} />
      </StepBob>
    </PixelSceneRoot>
  );
}

export function PixelChristmasScene() {
  return (
    <PixelSceneRoot base="#2E5E3F">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "24%", backgroundColor: "#F4F7F2" }} />
      <StepIn delay={60} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        <Px style={{ position: "absolute", left: "64%", bottom: 24, width: 12, height: 16, backgroundColor: "#6B4423" }} />
        <Px style={{ position: "absolute", left: "55%", bottom: 36, width: 76, height: 32, backgroundColor: "#3E7C43" }} shadow />
        <Px style={{ position: "absolute", left: "58%", bottom: 64, width: 60, height: 28, backgroundColor: "#4C8A50" }} />
        <Px style={{ position: "absolute", left: "62%", bottom: 88, width: 40, height: 24, backgroundColor: "#58A05C" }} />
        {[{ l: "59%", b: 44, c: "#D64545" }, { l: "67%", b: 52, c: "#FFC531" }, { l: "70%", b: 40, c: "#7FB3D5" }, { l: "63%", b: 72, c: "#FFC531" }, { l: "68%", b: 80, c: "#D64545" }, { l: "65%", b: 96, c: "#FFFFFF" }].map((o, i) => (
          <Px key={i} style={{ position: "absolute", left: o.l as `${number}%`, bottom: o.b, width: 8, height: 8, backgroundColor: o.c }} />
        ))}
        <Px style={{ position: "absolute", left: "50%", bottom: 12, width: 24, height: 16, backgroundColor: "#D64545" }} />
        <Px style={{ position: "absolute", left: "52%", bottom: 12, width: 4, height: 16, backgroundColor: "#FFC531" }} />
        <Px style={{ position: "absolute", left: "80%", bottom: 12, width: 20, height: 16, backgroundColor: "#3E7CB1" }} />
        <Px style={{ position: "absolute", left: "82%", bottom: 12, width: 4, height: 16, backgroundColor: "#FFFFFF" }} />
      </StepIn>
      <StepBlink style={{ position: "absolute", left: "66%", bottom: 112, width: 12, height: 12 }} period={1000}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 12, height: 12, backgroundColor: "#FFC531" }} />
      </StepBlink>
      {[0, 1, 2, 3, 4].map((i) => (
        <Px key={i} style={{ position: "absolute", left: `${48 + i * 11}%` as `${number}%`, bottom: 96 - (i % 3) * 20, width: 4, height: 4, backgroundColor: "#FFFFFF", opacity: 0.85 }} />
      ))}
    </PixelSceneRoot>
  );
}

export function PixelEasterScene() {
  return (
    <PixelSceneRoot base="#B8E0C8">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "36%", backgroundColor: "#7FBF8F" }} />
      <PxSun left="86%" bottom={108} size={28} />
      <StepIn delay={60} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        <Px style={{ position: "absolute", left: "60%", bottom: 56, width: 12, height: 32, backgroundColor: "#F4F1EA" }} />
        <Px style={{ position: "absolute", left: "66%", bottom: 56, width: 12, height: 32, backgroundColor: "#F4F1EA" }} />
        <Px style={{ position: "absolute", left: "58%", bottom: 32, width: 40, height: 36, backgroundColor: "#FFFFFF" }} shadow />
        <Px style={{ position: "absolute", left: "62%", bottom: 48, width: 8, height: 8, backgroundColor: "#2C2C33" }} />
        <Px style={{ position: "absolute", left: "68%", bottom: 48, width: 8, height: 8, backgroundColor: "#2C2C33" }} />
        <Px style={{ position: "absolute", left: "65%", bottom: 40, width: 8, height: 4, backgroundColor: "#E86A92" }} />
        {[{ l: "48%", b: 12, c: "#E86A92" }, { l: "76%", b: 12, c: "#7FB3D5" }, { l: "84%", b: 16, c: "#FFC531" }, { l: "54%", b: 24, c: "#B39DDB" }].map((e, i) => (
          <Px key={i} style={{ position: "absolute", left: e.l as `${number}%`, bottom: e.b, width: 16, height: 20, backgroundColor: e.c }} />
        ))}
        {[0, 1, 2].map((i) => (
          <Px key={i} style={{ position: "absolute", left: `${44 + i * 19}%` as `${number}%`, bottom: 32 + (i % 2) * 8, width: 8, height: 8, backgroundColor: ["#E86A92", "#FFC531", "#FFFFFF"][i] }} />
        ))}
      </StepIn>
    </PixelSceneRoot>
  );
}

export function PixelSunriseServiceScene() {
  return (
    <PixelSceneRoot base="#F2A65A">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "34%", backgroundColor: "#8A5A3B" }} />
      <StepBob left="60%" bottom={28} width={64} height={56} distance={4} period={3000}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 64, height: 56, backgroundColor: "#FFE1A8" }} />
      </StepBob>
      <StepIn delay={60} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        <Px style={{ position: "absolute", left: "44%", bottom: 20, width: 192, height: 52, backgroundColor: "#77502F" }} />
        <Px style={{ position: "absolute", left: "66%", bottom: 76, width: 8, height: 44, backgroundColor: "#3A2718" }} />
        <Px style={{ position: "absolute", left: "63%", bottom: 100, width: 28, height: 8, backgroundColor: "#3A2718" }} />
        <PxFigure left="52%" bottom={16} body="#4A3A6B" scale={0.8} />
        <PxFigure left="82%" bottom={16} body="#7A2E2E" scale={0.8} />
      </StepIn>
    </PixelSceneRoot>
  );
}

export function PixelThanksgivingScene() {
  return (
    <PixelSceneRoot base="#B4622D">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "30%", backgroundColor: "#8A4A20" }} />
      <StepIn style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <Px key={i} style={{ position: "absolute", left: `${58 + i * 6.5}%` as `${number}%`, bottom: 64, width: 12, height: 44, backgroundColor: ["#8A5A2B", "#C97B2D", "#A93226", "#C97B2D", "#8A5A2B"][i] }} />
        ))}
        <Px style={{ position: "absolute", left: "62%", bottom: 32, width: 52, height: 44, backgroundColor: "#6B4423" }} shadow />
        <Px style={{ position: "absolute", left: "68%", bottom: 68, width: 20, height: 20, backgroundColor: "#7A5230" }} />
        <Px style={{ position: "absolute", left: "71%", bottom: 64, width: 8, height: 8, backgroundColor: "#F5A623" }} />
        <Px style={{ position: "absolute", left: "71%", bottom: 52, width: 4, height: 12, backgroundColor: "#D64545" }} />
        <Px style={{ position: "absolute", left: "46%", bottom: 12, width: 28, height: 24, backgroundColor: "#E8862D" }} />
        <Px style={{ position: "absolute", left: "49%", bottom: 36, width: 4, height: 8, backgroundColor: "#3E7C43" }} />
        <Px style={{ position: "absolute", left: "84%", bottom: 12, width: 32, height: 12, backgroundColor: "#E8C87A" }} />
        <Px style={{ position: "absolute", left: "86%", bottom: 24, width: 28, height: 8, backgroundColor: "#C98A2E" }} />
      </StepIn>
    </PixelSceneRoot>
  );
}

export function PixelWeddingScene() {
  return (
    <PixelSceneRoot base="#F3E9F5">
      <StepIn style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        <Px style={{ position: "absolute", left: "52%", bottom: 28, width: 8, height: 92, backgroundColor: "#C9A86A" }} />
        <Px style={{ position: "absolute", left: "52%", bottom: 112, width: 132, height: 8, backgroundColor: "#C9A86A" }} />
        <Px style={{ position: "absolute", left: "86%", bottom: 28, width: 8, height: 92, backgroundColor: "#C9A86A" }} />
        <PxFigure left="62%" bottom={14} body="#2C2C33" scale={0.95} />
        <PxFigure left="71%" bottom={14} body="#FFFFFF" skin="#F2C79B" hair="#8A5A2B" scale={0.95} />
        <Px style={{ position: "absolute", left: "74%", bottom: 28, width: 12, height: 12, backgroundColor: "#E86A92" }} />
        <Px style={{ position: "absolute", left: "76%", bottom: 36, width: 8, height: 8, backgroundColor: "#F6C6D8" }} />
        {[0, 1, 2, 3].map((i) => (
          <Px key={i} style={{ position: "absolute", left: `${56 + i * 10}%` as `${number}%`, bottom: 8, width: 8, height: 4, backgroundColor: "#F6C6D8" }} />
        ))}
      </StepIn>
      <StepBob left="46%" bottom={96} width={20} height={20} distance={4} period={1400}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 20, height: 4, backgroundColor: "#FFC531" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 16, width: 20, height: 4, backgroundColor: "#FFC531" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 4, width: 4, height: 12, backgroundColor: "#FFC531" }} />
        <Px style={{ position: "absolute", left: 16, bottom: 4, width: 4, height: 12, backgroundColor: "#FFC531" }} />
      </StepBob>
      <StepBob left="50%" bottom={84} width={20} height={20} distance={4} period={1600} delay={300}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 20, height: 4, backgroundColor: "#E8B34B" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 16, width: 20, height: 4, backgroundColor: "#E8B34B" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 4, width: 4, height: 12, backgroundColor: "#E8B34B" }} />
        <Px style={{ position: "absolute", left: 16, bottom: 4, width: 4, height: 12, backgroundColor: "#E8B34B" }} />
      </StepBob>
    </PixelSceneRoot>
  );
}

export function PixelMemorialScene() {
  return (
    <PixelSceneRoot base="#6B7A90">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "28%", backgroundColor: "#525F70" }} />
      <StepIn style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        {[{ l: "58%", b: 92 }, { l: "64%", b: 104 }, { l: "71%", b: 104 }, { l: "77%", b: 92 }, { l: "77%", b: 76 }, { l: "71%", b: 64 }, { l: "64%", b: 64 }, { l: "58%", b: 76 }].map((p, i) => (
          <Px key={i} style={{ position: "absolute", left: p.l as `${number}%`, bottom: p.b, width: 12, height: 12, backgroundColor: i % 3 === 0 ? "#F4F1EA" : "#4C7A57" }} />
        ))}
        <Px style={{ position: "absolute", left: "46%", bottom: 16, width: 12, height: 28, backgroundColor: "#FFF8E1" }} />
        <Px style={{ position: "absolute", left: "46%", bottom: 44, width: 12, height: 12, backgroundColor: "#FFB300" }} />
        <Px style={{ position: "absolute", left: "84%", bottom: 16, width: 32, height: 20, backgroundColor: "#3E4A6B" }} />
        <Px style={{ position: "absolute", left: "85%", bottom: 24, width: 4, height: 4, backgroundColor: "#FFFFFF" }} />
        <Px style={{ position: "absolute", left: "89%", bottom: 28, width: 4, height: 4, backgroundColor: "#FFFFFF" }} />
      </StepIn>
    </PixelSceneRoot>
  );
}

export function PixelMeetingScene() {
  return (
    <PixelSceneRoot base="#5B7C99">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "30%", backgroundColor: "#47637C" }} />
      <StepIn style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        <Px style={{ position: "absolute", left: "86%", bottom: 108, width: 28, height: 28, backgroundColor: "#FFFFFF" }} />
        <Px style={{ position: "absolute", left: "89%", bottom: 120, width: 4, height: 8, backgroundColor: "#2C2C33" }} />
        <Px style={{ position: "absolute", left: "88%", bottom: 116, width: 8, height: 4, backgroundColor: "#2C2C33" }} />
        <Px style={{ position: "absolute", left: "52%", bottom: 32, width: 140, height: 24, backgroundColor: "#6B4423" }} shadow />
        <PxFigure left="56%" bottom={54} body="#7C4DFF" scale={0.8} />
        <PxFigure left="70%" bottom={54} body="#3E7CB1" scale={0.8} />
        <PxFigure left="84%" bottom={54} body="#58A05C" scale={0.8} />
        <PxFigure left="63%" bottom={2} body="#C96A2B" scale={0.8} />
        <PxFigure left="77%" bottom={2} body="#8A6D3B" scale={0.8} />
        <Px style={{ position: "absolute", left: "47%", bottom: 108, width: 40, height: 24, backgroundColor: "#FFFFFF" }} />
        <Px style={{ position: "absolute", left: "50%", bottom: 100, width: 8, height: 8, backgroundColor: "#FFFFFF" }} />
      </StepIn>
    </PixelSceneRoot>
  );
}

export function PixelWorkoutScene() {
  return (
    <PixelSceneRoot base="#455A75">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "26%", backgroundColor: "#33445A" }} />
      <StepIn style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        <Px style={{ position: "absolute", left: "50%", bottom: 12, width: 148, height: 12, backgroundColor: "#7C4DFF" }} />
        <Px style={{ position: "absolute", left: "56%", bottom: 44, width: 64, height: 8, backgroundColor: "#C0C6CE" }} />
        <Px style={{ position: "absolute", left: "54%", bottom: 32, width: 12, height: 32, backgroundColor: "#2C2C33" }} />
        <Px style={{ position: "absolute", left: "71%", bottom: 32, width: 12, height: 32, backgroundColor: "#2C2C33" }} />
        <Px style={{ position: "absolute", left: "52%", bottom: 40, width: 8, height: 20, backgroundColor: "#3A3A42" }} />
        <Px style={{ position: "absolute", left: "75%", bottom: 40, width: 8, height: 20, backgroundColor: "#3A3A42" }} />
        <Px style={{ position: "absolute", left: "84%", bottom: 16, width: 28, height: 28, backgroundColor: "#E8862D" }} />
        <Px style={{ position: "absolute", left: "87%", bottom: 44, width: 16, height: 12, backgroundColor: "#E8862D" }} />
        <PxFigure left="45%" bottom={20} body="#FFC531" scale={0.9} />
        <Px style={{ position: "absolute", left: "49%", bottom: 76, width: 4, height: 8, backgroundColor: "#BFE6F5" }} />
      </StepIn>
    </PixelSceneRoot>
  );
}

export function PixelBasketballScene() {
  return (
    <PixelSceneRoot base="#C96A2B">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "30%", backgroundColor: "#A8541F" }} />
      <View style={{ position: "absolute", left: "40%", right: 0, bottom: 44, height: 4, backgroundColor: "#FFFFFF", opacity: 0.5 }} />
      <StepIn style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        <Px style={{ position: "absolute", left: "62%", bottom: 88, width: 72, height: 48, backgroundColor: "#E8E2D4" }} shadow />
        <Px style={{ position: "absolute", left: "68%", bottom: 100, width: 28, height: 24, backgroundColor: "#D64545" }} />
        <Px style={{ position: "absolute", left: "69%", bottom: 104, width: 20, height: 16, backgroundColor: "#E8E2D4" }} />
        <Px style={{ position: "absolute", left: "69%", bottom: 84, width: 28, height: 4, backgroundColor: "#D64545" }} />
        <Px style={{ position: "absolute", left: "71%", bottom: 64, width: 4, height: 20, backgroundColor: "#FFFFFF" }} />
        <Px style={{ position: "absolute", left: "75%", bottom: 64, width: 4, height: 20, backgroundColor: "#FFFFFF" }} />
        <Px style={{ position: "absolute", left: "79%", bottom: 64, width: 4, height: 20, backgroundColor: "#FFFFFF" }} />
        <PxFigure left="46%" bottom={8} body="#F6F0FF" armsUp scale={0.95} />
      </StepIn>
      <StepBob left="52%" bottom={88} width={28} height={28} distance={4} period={1100}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 28, height: 28, backgroundColor: "#E8862D" }} />
        <Px style={{ position: "absolute", left: 12, bottom: 0, width: 4, height: 28, backgroundColor: "#8A4A20" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 12, width: 28, height: 4, backgroundColor: "#8A4A20" }} />
      </StepBob>
    </PixelSceneRoot>
  );
}

export function PixelSoccerScene() {
  return (
    <PixelSceneRoot base="#4E9A51">
      <View style={{ position: "absolute", left: "64%", top: 0, bottom: 0, width: 4, backgroundColor: "#FFFFFF", opacity: 0.45 }} />
      <StepIn style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        <Px style={{ position: "absolute", left: "76%", bottom: 32, width: 8, height: 72, backgroundColor: "#FFFFFF" }} />
        <Px style={{ position: "absolute", left: "76%", bottom: 100, width: 64, height: 8, backgroundColor: "#FFFFFF" }} />
        <Px style={{ position: "absolute", left: "92%", bottom: 32, width: 8, height: 72, backgroundColor: "#FFFFFF" }} />
        <Px style={{ position: "absolute", left: "78%", bottom: 36, width: 56, height: 60, backgroundColor: "#FFFFFF", opacity: 0.2 }} />
        <PxFigure left="45%" bottom={10} body="#D64545" scale={0.95} />
      </StepIn>
      <StepBob left="56%" bottom={20} width={32} height={32} distance={4} period={1100}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 32, height: 32, backgroundColor: "#FFFFFF" }} />
        <Px style={{ position: "absolute", left: 12, bottom: 12, width: 8, height: 8, backgroundColor: "#2C2C33" }} />
        <Px style={{ position: "absolute", left: 4, bottom: 24, width: 8, height: 8, backgroundColor: "#2C2C33" }} />
        <Px style={{ position: "absolute", left: 24, bottom: 4, width: 8, height: 8, backgroundColor: "#2C2C33" }} />
      </StepBob>
    </PixelSceneRoot>
  );
}

export function PixelGameScene() {
  return (
    <PixelSceneRoot base="#37415C">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "28%", backgroundColor: "#28304A" }} />
      <StepIn style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        <Px style={{ position: "absolute", left: "52%", bottom: 36, width: 128, height: 60, backgroundColor: "#2C2C33" }} shadow />
        <Px style={{ position: "absolute", left: "57%", bottom: 60, width: 8, height: 24, backgroundColor: "#F6F0FF" }} />
        <Px style={{ position: "absolute", left: "55%", bottom: 68, width: 24, height: 8, backgroundColor: "#F6F0FF" }} />
        <Px style={{ position: "absolute", left: "79%", bottom: 76, width: 12, height: 12, backgroundColor: "#D64545" }} />
        <Px style={{ position: "absolute", left: "84%", bottom: 60, width: 12, height: 12, backgroundColor: "#FFC531" }} />
        <Px style={{ position: "absolute", left: "74%", bottom: 56, width: 12, height: 12, backgroundColor: "#58A05C" }} />
        <Px style={{ position: "absolute", left: "81%", bottom: 44, width: 8, height: 8, backgroundColor: "#7FB3D5" }} />
        <Px style={{ position: "absolute", left: "60%", bottom: 112, width: 68, height: 16, backgroundColor: "#7FB3D5", opacity: 0.7 }} />
        <PxFigure left="44%" bottom={10} body="#5E35D6" scale={0.9} />
      </StepIn>
    </PixelSceneRoot>
  );
}

export function PixelScaryMovieScene() {
  return (
    <PixelSceneRoot base="#1E1B33">
      <StepIn delay={60} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        <Px style={{ position: "absolute", left: "76%", bottom: 24, width: 56, height: 52, backgroundColor: "#12101F" }} />
        <Px style={{ position: "absolute", left: "73%", bottom: 76, width: 64, height: 12, backgroundColor: "#12101F" }} />
        <Px style={{ position: "absolute", left: "82%", bottom: 76, width: 20, height: 28, backgroundColor: "#12101F" }} />
        <Px style={{ position: "absolute", left: "79%", bottom: 44, width: 8, height: 12, backgroundColor: "#FFC531" }} />
        <Px style={{ position: "absolute", left: "88%", bottom: 32, width: 8, height: 8, backgroundColor: "#F5A623" }} />
        <Px style={{ position: "absolute", left: "48%", bottom: 104, width: 28, height: 28, backgroundColor: "#F5EFD8" }} />
        <Px style={{ position: "absolute", left: "50%", bottom: 108, width: 24, height: 24, backgroundColor: "#1E1B33" }} />
        <Px style={{ position: "absolute", left: "86%", bottom: 8, width: 24, height: 20, backgroundColor: "#D64545" }} />
        <Px style={{ position: "absolute", left: "85%", bottom: 28, width: 8, height: 8, backgroundColor: "#FFF3C9" }} />
        <Px style={{ position: "absolute", left: "89%", bottom: 28, width: 8, height: 8, backgroundColor: "#FFF3C9" }} />
        <Px style={{ position: "absolute", left: "92%", bottom: 28, width: 8, height: 8, backgroundColor: "#FFF3C9" }} />
      </StepIn>
      <StepBob left="56%" bottom={32} width={40} height={52} distance={4} period={1600}>
        <Px style={{ position: "absolute", left: 0, bottom: 8, width: 40, height: 44, backgroundColor: "#F4F1EA" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 12, height: 8, backgroundColor: "#F4F1EA" }} />
        <Px style={{ position: "absolute", left: 14, bottom: 0, width: 12, height: 8, backgroundColor: "#F4F1EA" }} />
        <Px style={{ position: "absolute", left: 28, bottom: 0, width: 12, height: 8, backgroundColor: "#F4F1EA" }} />
        <Px style={{ position: "absolute", left: 8, bottom: 32, width: 8, height: 8, backgroundColor: "#1E1B33" }} />
        <Px style={{ position: "absolute", left: 24, bottom: 32, width: 8, height: 8, backgroundColor: "#1E1B33" }} />
        <Px style={{ position: "absolute", left: 16, bottom: 16, width: 8, height: 8, backgroundColor: "#1E1B33" }} />
      </StepBob>
    </PixelSceneRoot>
  );
}

export function PixelChristmasMovieScene() {
  return (
    <PixelSceneRoot base="#31572C">
      <StepIn delay={60} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        <Px style={{ position: "absolute", left: "50%", bottom: 40, width: 120, height: 76, backgroundColor: "#14141C" }} shadow />
        <Px style={{ position: "absolute", left: "53%", bottom: 48, width: 100, height: 60, backgroundColor: "#BFE6F5" }} />
        <Px style={{ position: "absolute", left: "66%", bottom: 48, width: 44, height: 20, backgroundColor: "#FFFFFF" }} />
        <Px style={{ position: "absolute", left: "72%", bottom: 64, width: 16, height: 20, backgroundColor: "#3E7C43" }} />
        <Px style={{ position: "absolute", left: "84%", bottom: 20, width: 32, height: 20, backgroundColor: "#3E7C43" }} />
        <Px style={{ position: "absolute", left: "86%", bottom: 40, width: 24, height: 16, backgroundColor: "#58A05C" }} />
        <Px style={{ position: "absolute", left: "89%", bottom: 56, width: 8, height: 8, backgroundColor: "#FFC531" }} />
        <Px style={{ position: "absolute", left: "44%", bottom: 16, width: 20, height: 16, backgroundColor: "#D64545" }} />
        <Px style={{ position: "absolute", left: "46%", bottom: 28, width: 12, height: 4, backgroundColor: "#FFF3C9" }} />
      </StepIn>
      {[0, 1, 2, 3].map((i) => (
        <Px key={i} style={{ position: "absolute", left: `${46 + i * 13}%` as `${number}%`, bottom: 104 - (i % 2) * 24, width: 4, height: 4, backgroundColor: "#FFFFFF", opacity: 0.8 }} />
      ))}
    </PixelSceneRoot>
  );
}

export function PixelChristmasBreakfastScene() {
  return (
    <PixelSceneRoot base="#A63D2E">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "36%", backgroundColor: "#7E2D21" }} />
      <StepIn style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        <Px style={{ position: "absolute", left: "52%", bottom: 24, width: 92, height: 12, backgroundColor: "#FFF8E1" }} shadow />
        <Px style={{ position: "absolute", left: "55%", bottom: 36, width: 76, height: 12, backgroundColor: "#EFC477" }} />
        <Px style={{ position: "absolute", left: "56%", bottom: 48, width: 68, height: 12, backgroundColor: "#F2C14E" }} />
        <Px style={{ position: "absolute", left: "58%", bottom: 60, width: 56, height: 12, backgroundColor: "#EFC477" }} />
        <Px style={{ position: "absolute", left: "64%", bottom: 72, width: 12, height: 8, backgroundColor: "#FFE9A8" }} />
        <Px style={{ position: "absolute", left: "80%", bottom: 32, width: 12, height: 12, backgroundColor: "#3E7C43" }} />
        <Px style={{ position: "absolute", left: "83%", bottom: 40, width: 12, height: 12, backgroundColor: "#58A05C" }} />
        <Px style={{ position: "absolute", left: "81%", bottom: 36, width: 8, height: 8, backgroundColor: "#D64545" }} />
        <Px style={{ position: "absolute", left: "88%", bottom: 16, width: 20, height: 16, backgroundColor: "#3E7C43" }} />
        <Px style={{ position: "absolute", left: "46%", bottom: 104, width: 4, height: 4, backgroundColor: "#FFFFFF", opacity: 0.85 }} />
        <Px style={{ position: "absolute", left: "52%", bottom: 116, width: 4, height: 4, backgroundColor: "#FFFFFF", opacity: 0.7 }} />
      </StepIn>
    </PixelSceneRoot>
  );
}

export function PixelChristmasDinnerScene() {
  return (
    <PixelSceneRoot base="#7A2E2E">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "34%", backgroundColor: "#5C2121" }} />
      <StepIn style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Px key={i} style={{ position: "absolute", left: `${45 + i * 9}%` as `${number}%`, bottom: 124 - (i % 2) * 4, width: 12, height: 12, backgroundColor: i % 2 ? "#58A05C" : "#3E7C43" }} />
        ))}
        <Px style={{ position: "absolute", left: "66%", bottom: 132, width: 8, height: 8, backgroundColor: "#D64545" }} />
        <Px style={{ position: "absolute", left: "52%", bottom: 20, width: 116, height: 16, backgroundColor: "#EDE6D8" }} />
        <Px style={{ position: "absolute", left: "58%", bottom: 36, width: 76, height: 40, backgroundColor: "#A85B2A" }} shadow />
        <Px style={{ position: "absolute", left: "57%", bottom: 60, width: 12, height: 8, backgroundColor: "#FFF8E1" }} />
        <Px style={{ position: "absolute", left: "76%", bottom: 60, width: 12, height: 8, backgroundColor: "#FFF8E1" }} />
        <Px style={{ position: "absolute", left: "47%", bottom: 20, width: 8, height: 24, backgroundColor: "#FFF8E1" }} />
        <Px style={{ position: "absolute", left: "47%", bottom: 44, width: 8, height: 12, backgroundColor: "#FFB300" }} />
        <Px style={{ position: "absolute", left: "90%", bottom: 20, width: 8, height: 24, backgroundColor: "#FFF8E1" }} />
        <Px style={{ position: "absolute", left: "90%", bottom: 44, width: 8, height: 12, backgroundColor: "#FFB300" }} />
        <Px style={{ position: "absolute", left: "83%", bottom: 12, width: 24, height: 12, backgroundColor: "#3E7C43" }} />
      </StepIn>
    </PixelSceneRoot>
  );
}

export function PixelFullMoonScene() {
  return (
    <PixelSceneRoot base="#232946">
      <StepIn delay={60} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        <Px style={{ position: "absolute", left: "40%", bottom: 0, width: 200, height: 48, backgroundColor: "#1A1F38" }} />
        <Px style={{ position: "absolute", left: "44%", bottom: 76, width: 88, height: 4, backgroundColor: "#141830" }} />
        <Px style={{ position: "absolute", left: "52%", bottom: 80, width: 20, height: 28, backgroundColor: "#8A6D4B" }} />
        <Px style={{ position: "absolute", left: "53%", bottom: 100, width: 4, height: 4, backgroundColor: "#141830" }} />
        <Px style={{ position: "absolute", left: "57%", bottom: 100, width: 4, height: 4, backgroundColor: "#141830" }} />
        <Px style={{ position: "absolute", left: "55%", bottom: 92, width: 4, height: 4, backgroundColor: "#F5A623" }} />
      </StepIn>
      <StepBob left="70%" bottom={72} width={56} height={56} distance={4} period={2600}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 56, height: 56, backgroundColor: "#F5EFD8" }} shadow />
        <Px style={{ position: "absolute", left: 12, bottom: 36, width: 8, height: 8, backgroundColor: "#E3D9BC" }} />
        <Px style={{ position: "absolute", left: 36, bottom: 16, width: 8, height: 8, backgroundColor: "#E3D9BC" }} />
      </StepBob>
      {[0, 1, 2, 3].map((i) => (
        <StepBlink key={i} style={{ position: "absolute", left: `${46 + i * 12}%` as `${number}%`, bottom: 124 - (i % 2) * 12, width: 4, height: 4 }} period={1100 + i * 200}>
          <Px style={{ position: "absolute", left: 0, bottom: 0, width: 4, height: 4, backgroundColor: "#FFFFFF" }} />
        </StepBlink>
      ))}
    </PixelSceneRoot>
  );
}

export function PixelOutreachScene() {
  return (
    <PixelSceneRoot base="#3E7CB1">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "30%", backgroundColor: "#2F6391" }} />
      <PxSun left="88%" bottom={112} size={24} />
      <StepIn style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        <PxFigure left="50%" bottom={12} body="#FFC531" scale={1} />
        <PxFigure left="82%" bottom={12} body="#F6F0FF" scale={1} />
        <Px style={{ position: "absolute", left: "60%", bottom: 12, width: 32, height: 24, backgroundColor: "#B07D4F" }} />
        <Px style={{ position: "absolute", left: "60%", bottom: 32, width: 32, height: 4, backgroundColor: "#8A5A2B" }} />
        <Px style={{ position: "absolute", left: "63%", bottom: 36, width: 8, height: 12, backgroundColor: "#D64545" }} />
        <Px style={{ position: "absolute", left: "68%", bottom: 36, width: 12, height: 8, backgroundColor: "#58A05C" }} />
      </StepIn>
      <StepBob left="64%" bottom={56} width={32} height={28} distance={4} period={1400}>
        <Px style={{ position: "absolute", left: 0, bottom: 8, width: 16, height: 16, backgroundColor: "#E86A92" }} />
        <Px style={{ position: "absolute", left: 16, bottom: 8, width: 16, height: 16, backgroundColor: "#E86A92" }} />
        <Px style={{ position: "absolute", left: 8, bottom: 0, width: 16, height: 16, backgroundColor: "#E86A92" }} />
      </StepBob>
    </PixelSceneRoot>
  );
}

export function PixelConcertScene() {
  return (
    <PixelSceneRoot base="#2D1B4E">
      <View style={{ position: "absolute", left: "52%", top: 0, width: 20, height: 108, backgroundColor: "#FFC531", opacity: 0.16 }} />
      <View style={{ position: "absolute", left: "70%", top: 0, width: 20, height: 108, backgroundColor: "#E86A92", opacity: 0.16 }} />
      <View style={{ position: "absolute", left: "86%", top: 0, width: 20, height: 108, backgroundColor: "#7FB3D5", opacity: 0.16 }} />
      <StepIn delay={60} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        <Px style={{ position: "absolute", left: "46%", bottom: 24, width: 168, height: 8, backgroundColor: "#1D1233" }} />
        <PxFigure left="64%" bottom={32} body="#12101F" skin="#12101F" hair="#12101F" scale={1.05} />
        <Px style={{ position: "absolute", left: "69%", bottom: 36, width: 28, height: 24, backgroundColor: "#12101F" }} />
        <Px style={{ position: "absolute", left: "74%", bottom: 56, width: 4, height: 28, backgroundColor: "#12101F" }} />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Px key={i} style={{ position: "absolute", left: `${46 + i * 9}%` as `${number}%`, bottom: 4, width: 16, height: 16, backgroundColor: "#1D1233" }} />
        ))}
      </StepIn>
      <StepBob left="56%" bottom={100} width={12} height={16} distance={4} period={1400}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 8, height: 8, backgroundColor: "#FFC531" }} />
        <Px style={{ position: "absolute", left: 8, bottom: 4, width: 4, height: 12, backgroundColor: "#FFC531" }} />
      </StepBob>
      <StepBob left="82%" bottom={112} width={12} height={16} distance={4} period={1600} delay={300}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 8, height: 8, backgroundColor: "#FFFFFF" }} />
        <Px style={{ position: "absolute", left: 8, bottom: 4, width: 4, height: 12, backgroundColor: "#FFFFFF" }} />
      </StepBob>
    </PixelSceneRoot>
  );
}

export function PixelHotelScene() {
  return (
    <PixelSceneRoot base="#33415C">
      <StepIn delay={60} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        <Px style={{ position: "absolute", left: "56%", bottom: 12, width: 84, height: 120, backgroundColor: "#46536E" }} shadow />
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <Px key={i} style={{ position: "absolute", left: `${60 + (i % 3) * 9}%` as `${number}%`, bottom: 104 - Math.floor(i / 3) * 24, width: 12, height: 16, backgroundColor: i % 4 === 3 ? "#2C3648" : "#FFD98A" }} />
        ))}
        <Px style={{ position: "absolute", left: "63%", bottom: 28, width: 32, height: 8, backgroundColor: "#D64545" }} />
        <Px style={{ position: "absolute", left: "67%", bottom: 0, width: 20, height: 28, backgroundColor: "#2C3648" }} />
        <Px style={{ position: "absolute", left: "46%", bottom: 108, width: 24, height: 24, backgroundColor: "#F5EFD8" }} />
        <Px style={{ position: "absolute", left: "48%", bottom: 112, width: 20, height: 20, backgroundColor: "#33415C" }} />
      </StepIn>
      <StepBlink style={{ position: "absolute", left: "70%", bottom: 136, width: 12, height: 12 }} period={1200}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 12, height: 12, backgroundColor: "#FFC531" }} />
      </StepBlink>
    </PixelSceneRoot>
  );
}

export function PixelShowerScene() {
  return (
    <PixelSceneRoot base="#BFE3EA">
      <StepIn delay={60} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        <Px style={{ position: "absolute", left: "58%", bottom: 96, width: 4, height: 44, backgroundColor: "#7FA8B5" }} />
        <Px style={{ position: "absolute", left: "58%", bottom: 136, width: 44, height: 4, backgroundColor: "#7FA8B5" }} />
        <Px style={{ position: "absolute", left: "72%", bottom: 124, width: 24, height: 12, backgroundColor: "#5B87A0" }} />
        <Px style={{ position: "absolute", left: "48%", bottom: 8, width: 140, height: 28, backgroundColor: "#FFFFFF" }} shadow />
        <Px style={{ position: "absolute", left: "48%", bottom: 32, width: 140, height: 8, backgroundColor: "#DFF3F9" }} />
        {[0, 1, 2, 3].map((i) => (
          <Px key={i} style={{ position: "absolute", left: `${72 + i * 4}%` as `${number}%`, bottom: 88 - (i % 2) * 20, width: 4, height: 8, backgroundColor: "#4FB3D9" }} />
        ))}
      </StepIn>
      <StepBob left="52%" bottom={52} width={16} height={16} distance={4} period={1800}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 16, height: 16, backgroundColor: "#FFFFFF", opacity: 0.55 }} />
      </StepBob>
      <StepBob left="60%" bottom={68} width={12} height={12} distance={4} period={2000} delay={300}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 12, height: 12, backgroundColor: "#FFFFFF", opacity: 0.45 }} />
      </StepBob>
    </PixelSceneRoot>
  );
}

export function PixelStudyScene() {
  return (
    <PixelSceneRoot base="#6B4F2E">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "36%", backgroundColor: "#4E3820" }} />
      <StepIn style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        <Px style={{ position: "absolute", left: "86%", bottom: 24, width: 4, height: 52, backgroundColor: "#2C2C33" }} />
        <Px style={{ position: "absolute", left: "78%", bottom: 72, width: 24, height: 16, backgroundColor: "#F5A623" }} />
        <Px style={{ position: "absolute", left: "74%", bottom: 56, width: 36, height: 36, backgroundColor: "#FFE9A8", opacity: 0.5 }} />
        <Px style={{ position: "absolute", left: "52%", bottom: 28, width: 52, height: 36, backgroundColor: "#FFF8E1" }} shadow />
        <Px style={{ position: "absolute", left: "64%", bottom: 28, width: 52, height: 36, backgroundColor: "#FBF3DE" }} />
        <Px style={{ position: "absolute", left: "55%", bottom: 48, width: 36, height: 4, backgroundColor: "#D8CBB2" }} />
        <Px style={{ position: "absolute", left: "55%", bottom: 40, width: 36, height: 4, backgroundColor: "#D8CBB2" }} />
        <Px style={{ position: "absolute", left: "67%", bottom: 48, width: 36, height: 4, backgroundColor: "#D8CBB2" }} />
        <Px style={{ position: "absolute", left: "44%", bottom: 16, width: 28, height: 8, backgroundColor: "#3E7CB1" }} />
        <Px style={{ position: "absolute", left: "45%", bottom: 24, width: 24, height: 8, backgroundColor: "#A93226" }} />
        <Px style={{ position: "absolute", left: "58%", bottom: 16, width: 24, height: 4, backgroundColor: "#FFC531" }} />
        <PxFigure left="42%" bottom={6} body="#5E35D6" scale={0.85} />
      </StepIn>
    </PixelSceneRoot>
  );
}

export function PixelGraduationScene() {
  return (
    <PixelSceneRoot base="#2F3E5C">
      <StepIn style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        <Px style={{ position: "absolute", left: "56%", bottom: 88, width: 84, height: 12, backgroundColor: "#1E1B26" }} shadow />
        <Px style={{ position: "absolute", left: "62%", bottom: 68, width: 56, height: 20, backgroundColor: "#2A2735" }} />
        <Px style={{ position: "absolute", left: "76%", bottom: 64, width: 4, height: 24, backgroundColor: "#FFC531" }} />
        <Px style={{ position: "absolute", left: "75%", bottom: 52, width: 8, height: 12, backgroundColor: "#FFC531" }} />
        <Px style={{ position: "absolute", left: "58%", bottom: 24, width: 60, height: 16, backgroundColor: "#FFF8E1" }} />
        <Px style={{ position: "absolute", left: "68%", bottom: 24, width: 8, height: 16, backgroundColor: "#D64545" }} />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Px key={i} style={{ position: "absolute", left: `${46 + i * 9}%` as `${number}%`, bottom: 112 - (i % 3) * 16, width: 8, height: 4, backgroundColor: ["#FFC531", "#E86A92", "#7FB3D5", "#58A05C"][i % 4] }} />
        ))}
        <PxFigure left="46%" bottom={8} body="#F6F0FF" scale={0.9} />
      </StepIn>
    </PixelSceneRoot>
  );
}

export function PixelVisitScene() {
  return (
    <PixelSceneRoot base="#7FB069">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "30%", backgroundColor: "#639551" }} />
      <PxSun left="46%" bottom={112} size={24} />
      <StepIn style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        <Px style={{ position: "absolute", left: "62%", bottom: 28, width: 76, height: 52, backgroundColor: "#FFF3E0" }} shadow />
        <Px style={{ position: "absolute", left: "59%", bottom: 80, width: 88, height: 12, backgroundColor: "#A93226" }} />
        <Px style={{ position: "absolute", left: "71%", bottom: 28, width: 16, height: 32, backgroundColor: "#5D4037" }} />
        <Px style={{ position: "absolute", left: "65%", bottom: 56, width: 12, height: 12, backgroundColor: "#BFE6F5" }} />
        <PxFigure left="52%" bottom={10} body="#7C4DFF" scale={0.95} />
        <PxFigure left="84%" bottom={10} body="#3E7CB1" scale={0.95} />
      </StepIn>
      <StepBob left="72%" bottom={96} width={20} height={16} distance={4} period={1400}>
        <Px style={{ position: "absolute", left: 0, bottom: 4, width: 8, height: 8, backgroundColor: "#E86A92" }} />
        <Px style={{ position: "absolute", left: 12, bottom: 4, width: 8, height: 8, backgroundColor: "#E86A92" }} />
        <Px style={{ position: "absolute", left: 6, bottom: 0, width: 8, height: 8, backgroundColor: "#E86A92" }} />
      </StepBob>
    </PixelSceneRoot>
  );
}

export function PixelReachOutScene() {
  return (
    <PixelSceneRoot base="#E8875B">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "28%", backgroundColor: "#C96A3B" }} />
      <StepIn style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        <PxFigure left="50%" bottom={12} body="#5E35D6" scale={1} />
        <PxFigure left="84%" bottom={12} body="#F6F0FF" scale={1} />
        <Px style={{ position: "absolute", left: "57%", bottom: 20, width: 8, height: 16, backgroundColor: "#2C2C33" }} />
      </StepIn>
      <StepBob left="62%" bottom={80} width={64} height={44} distance={4} period={1500}>
        <Px style={{ position: "absolute", left: 0, bottom: 12, width: 64, height: 32, backgroundColor: "#FFFFFF" }} />
        <Px style={{ position: "absolute", left: 8, bottom: 4, width: 8, height: 8, backgroundColor: "#FFFFFF" }} />
        <Px style={{ position: "absolute", left: 20, bottom: 24, width: 12, height: 12, backgroundColor: "#E86A92" }} />
        <Px style={{ position: "absolute", left: 32, bottom: 24, width: 12, height: 12, backgroundColor: "#E86A92" }} />
        <Px style={{ position: "absolute", left: 26, bottom: 16, width: 12, height: 12, backgroundColor: "#E86A92" }} />
      </StepBob>
    </PixelSceneRoot>
  );
}

export function PixelCleanScene() {
  return (
    <PixelSceneRoot base="#AEE1F0">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "24%", backgroundColor: "#8AC6DA" }} />
      <StepIn style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        <Px style={{ position: "absolute", left: "58%", bottom: 12, width: 40, height: 32, backgroundColor: "#FFC531" }} shadow />
        <Px style={{ position: "absolute", left: "57%", bottom: 40, width: 44, height: 8, backgroundColor: "#F5A623" }} />
        <Px style={{ position: "absolute", left: "73%", bottom: 44, width: 4, height: 76, backgroundColor: "#8A5A2B" }} />
        <Px style={{ position: "absolute", left: "72%", bottom: 24, width: 20, height: 20, backgroundColor: "#F4F1EA" }} />
        <Px style={{ position: "absolute", left: "86%", bottom: 12, width: 16, height: 28, backgroundColor: "#58A05C" }} />
        <Px style={{ position: "absolute", left: "87%", bottom: 40, width: 12, height: 8, backgroundColor: "#3E7C43" }} />
        <Px style={{ position: "absolute", left: "48%", bottom: 108, width: 8, height: 8, backgroundColor: "#FFFFFF" }} />
      </StepIn>
      {[0, 1, 2].map((i) => (
        <StepBob key={i} left={`${52 + i * 8}%` as `${number}%`} bottom={76 + (i % 2) * 16} width={12 - i * 4} height={12 - i * 4} distance={4} period={1400 + i * 200} delay={i * 200}>
          <Px style={{ position: "absolute", left: 0, bottom: 0, width: 12 - i * 4, height: 12 - i * 4, backgroundColor: "#FFFFFF", opacity: 0.85 }} />
        </StepBob>
      ))}
    </PixelSceneRoot>
  );
}

export function PixelWashCarScene() {
  return (
    <PixelSceneRoot base="#5DA9C4">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "26%", backgroundColor: "#478BA3" }} />
      <StepIn style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        <Px style={{ position: "absolute", left: "52%", bottom: 28, width: 128, height: 28, backgroundColor: "#D64545" }} shadow />
        <Px style={{ position: "absolute", left: "60%", bottom: 52, width: 64, height: 24, backgroundColor: "#C23B3B" }} />
        <Px style={{ position: "absolute", left: "63%", bottom: 56, width: 24, height: 16, backgroundColor: "#BFE6F5" }} />
        <Px style={{ position: "absolute", left: "71%", bottom: 56, width: 20, height: 16, backgroundColor: "#BFE6F5" }} />
        <Px style={{ position: "absolute", left: "56%", bottom: 12, width: 20, height: 20, backgroundColor: "#2C2C33" }} />
        <Px style={{ position: "absolute", left: "80%", bottom: 12, width: 20, height: 20, backgroundColor: "#2C2C33" }} />
        {[0, 1, 2, 3].map((i) => (
          <Px key={i} style={{ position: "absolute", left: `${58 + i * 10}%` as `${number}%`, bottom: 76 - (i % 2) * 8, width: 12, height: 12, backgroundColor: "#FFFFFF", opacity: 0.95 }} />
        ))}
        <Px style={{ position: "absolute", left: "66%", bottom: 44, width: 8, height: 8, backgroundColor: "#FFFFFF", opacity: 0.9 }} />
        <Px style={{ position: "absolute", left: "44%", bottom: 12, width: 16, height: 16, backgroundColor: "#3E7C43" }} />
      </StepIn>
    </PixelSceneRoot>
  );
}

export function PixelGetGasScene() {
  return (
    <PixelSceneRoot base="#8A6FA8">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "26%", backgroundColor: "#6E5689" }} />
      <StepIn style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        <Px style={{ position: "absolute", left: "60%", bottom: 16, width: 52, height: 96, backgroundColor: "#D64545" }} shadow />
        <Px style={{ position: "absolute", left: "63%", bottom: 80, width: 36, height: 24, backgroundColor: "#DFF3F9" }} />
        <Px style={{ position: "absolute", left: "65%", bottom: 92, width: 20, height: 4, backgroundColor: "#5B87A0" }} />
        <Px style={{ position: "absolute", left: "65%", bottom: 84, width: 16, height: 4, backgroundColor: "#5B87A0" }} />
        <Px style={{ position: "absolute", left: "64%", bottom: 44, width: 28, height: 28, backgroundColor: "#F6F0FF" }} />
        <Px style={{ position: "absolute", left: "67%", bottom: 48, width: 20, height: 20, backgroundColor: "#8A6FA8" }} />
        <Px style={{ position: "absolute", left: "73%", bottom: 32, width: 4, height: 52, backgroundColor: "#2C2C33" }} />
        <Px style={{ position: "absolute", left: "76%", bottom: 76, width: 12, height: 16, backgroundColor: "#2C2C33" }} />
        <Px style={{ position: "absolute", left: "84%", bottom: 96, width: 40, height: 24, backgroundColor: "#F6F0FF" }} />
        <Px style={{ position: "absolute", left: "86%", bottom: 108, width: 20, height: 4, backgroundColor: "#D64545" }} />
        <Px style={{ position: "absolute", left: "89%", bottom: 76, width: 4, height: 20, backgroundColor: "#2C2C33" }} />
      </StepIn>
      <StepBob left="46%" bottom={72} width={16} height={20} distance={4} period={1300}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 16, height: 16, backgroundColor: "#FFC531" }} />
        <Px style={{ position: "absolute", left: 4, bottom: 16, width: 8, height: 4, backgroundColor: "#FFC531" }} />
      </StepBob>
    </PixelSceneRoot>
  );
}

export function PixelGroceryScene() {
  return (
    <PixelSceneRoot base="#58A05C">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "26%", backgroundColor: "#47854B" }} />
      <StepIn style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <Px key={i} style={{ position: "absolute", left: `${48 + i * 11}%` as `${number}%`, bottom: 124, width: 28, height: 12, backgroundColor: i % 2 ? "#FFFFFF" : "#D64545" }} />
        ))}
        <Px style={{ position: "absolute", left: "56%", bottom: 36, width: 72, height: 40, backgroundColor: "#C0C6CE" }} shadow />
        <Px style={{ position: "absolute", left: "58%", bottom: 44, width: 60, height: 4, backgroundColor: "#58A05C" }} />
        <Px style={{ position: "absolute", left: "58%", bottom: 56, width: 60, height: 4, backgroundColor: "#58A05C" }} />
        <Px style={{ position: "absolute", left: "58%", bottom: 68, width: 60, height: 4, backgroundColor: "#58A05C" }} />
        <Px style={{ position: "absolute", left: "52%", bottom: 64, width: 16, height: 4, backgroundColor: "#9AA3AD" }} />
        <Px style={{ position: "absolute", left: "58%", bottom: 16, width: 12, height: 12, backgroundColor: "#2C2C33" }} />
        <Px style={{ position: "absolute", left: "76%", bottom: 16, width: 12, height: 12, backgroundColor: "#2C2C33" }} />
        <Px style={{ position: "absolute", left: "60%", bottom: 76, width: 8, height: 24, backgroundColor: "#EFC477" }} />
        <Px style={{ position: "absolute", left: "66%", bottom: 76, width: 16, height: 16, backgroundColor: "#D64545" }} />
        <Px style={{ position: "absolute", left: "72%", bottom: 76, width: 12, height: 12, backgroundColor: "#7FB069" }} />
        <PxFigure left="45%" bottom={10} body="#FFC531" scale={0.95} />
      </StepIn>
    </PixelSceneRoot>
  );
}

export function PixelNewYearScene() {
  return (
    <PixelSceneRoot base="#1F2545">
      <View style={{ position: "absolute", left: "40%", bottom: 0, width: "16%", height: 44, backgroundColor: "#141830" }} />
      <View style={{ position: "absolute", left: "58%", bottom: 0, width: "13%", height: 60, backgroundColor: "#141830" }} />
      <View style={{ position: "absolute", left: "73%", bottom: 0, width: "15%", height: 36, backgroundColor: "#141830" }} />
      <View style={{ position: "absolute", left: "90%", bottom: 0, width: "12%", height: 52, backgroundColor: "#141830" }} />
      <StepIn style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        {[{ l: "52%", b: 100, c: "#FFC531" }, { l: "70%", b: 116, c: "#E86A92" }, { l: "86%", b: 96, c: "#7FB3D5" }].map((f, i) => (
          <View key={i} style={{ position: "absolute", left: f.l as `${number}%`, bottom: f.b, width: 28, height: 28 }}>
            <Px style={{ position: "absolute", left: 12, bottom: 0, width: 4, height: 28, backgroundColor: f.c }} />
            <Px style={{ position: "absolute", left: 0, bottom: 12, width: 28, height: 4, backgroundColor: f.c }} />
            <Px style={{ position: "absolute", left: 4, bottom: 4, width: 4, height: 4, backgroundColor: f.c }} />
            <Px style={{ position: "absolute", left: 20, bottom: 4, width: 4, height: 4, backgroundColor: f.c }} />
            <Px style={{ position: "absolute", left: 4, bottom: 20, width: 4, height: 4, backgroundColor: f.c }} />
            <Px style={{ position: "absolute", left: 20, bottom: 20, width: 4, height: 4, backgroundColor: f.c }} />
            <Px style={{ position: "absolute", left: 12, bottom: 12, width: 4, height: 4, backgroundColor: "#FFFFFF" }} />
          </View>
        ))}
        {[0, 1, 2, 3, 4].map((i) => (
          <Px key={i} style={{ position: "absolute", left: `${62 + (i % 3) * 11}%` as `${number}%`, bottom: 12 + Math.floor(i / 3) * 16, width: 4, height: 8, backgroundColor: "#FFD98A" }} />
        ))}
      </StepIn>
    </PixelSceneRoot>
  );
}

export function PixelValentinesScene() {
  return (
    <PixelSceneRoot base="#C94F6D">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "26%", backgroundColor: "#A83A56" }} />
      <StepIn style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        <Px style={{ position: "absolute", left: "46%", bottom: 16, width: 44, height: 28, backgroundColor: "#FFF8E1" }} />
        <Px style={{ position: "absolute", left: "46%", bottom: 32, width: 44, height: 12, backgroundColor: "#F4E9CE" }} />
        <Px style={{ position: "absolute", left: "54%", bottom: 24, width: 8, height: 8, backgroundColor: "#D64545" }} />
      </StepIn>
      <StepBob left="58%" bottom={44} width={72} height={60} distance={4} period={1300}>
        <Px style={{ position: "absolute", left: 0, bottom: 20, width: 36, height: 36, backgroundColor: "#E86A92" }} shadow />
        <Px style={{ position: "absolute", left: 36, bottom: 20, width: 36, height: 36, backgroundColor: "#E86A92" }} />
        <Px style={{ position: "absolute", left: 18, bottom: 0, width: 36, height: 36, backgroundColor: "#E86A92" }} />
        <Px style={{ position: "absolute", left: 8, bottom: 40, width: 12, height: 12, backgroundColor: "#F6C6D8", opacity: 0.8 }} />
      </StepBob>
      <StepBob left="86%" bottom={100} width={16} height={12} distance={4} period={1500} delay={300}>
        <Px style={{ position: "absolute", left: 0, bottom: 4, width: 8, height: 8, backgroundColor: "#F6C6D8" }} />
        <Px style={{ position: "absolute", left: 8, bottom: 4, width: 8, height: 8, backgroundColor: "#F6C6D8" }} />
        <Px style={{ position: "absolute", left: 4, bottom: 0, width: 8, height: 8, backgroundColor: "#F6C6D8" }} />
      </StepBob>
      <StepBob left="50%" bottom={108} width={12} height={12} distance={4} period={1700} delay={600}>
        <Px style={{ position: "absolute", left: 0, bottom: 4, width: 8, height: 8, backgroundColor: "#FFFFFF" }} />
        <Px style={{ position: "absolute", left: 4, bottom: 0, width: 8, height: 8, backgroundColor: "#FFFFFF" }} />
      </StepBob>
    </PixelSceneRoot>
  );
}

export function PixelHalloweenScene() {
  return (
    <PixelSceneRoot base="#2A2140">
      <StepIn delay={60} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        <Px style={{ position: "absolute", left: "56%", bottom: 16, width: 84, height: 64, backgroundColor: "#E8862D" }} shadow />
        <Px style={{ position: "absolute", left: "64%", bottom: 16, width: 8, height: 64, backgroundColor: "#D1761F", opacity: 0.7 }} />
        <Px style={{ position: "absolute", left: "76%", bottom: 16, width: 8, height: 64, backgroundColor: "#D1761F", opacity: 0.7 }} />
        <Px style={{ position: "absolute", left: "68%", bottom: 80, width: 8, height: 12, backgroundColor: "#3E7C43" }} />
        <Px style={{ position: "absolute", left: "62%", bottom: 52, width: 12, height: 12, backgroundColor: "#FFD54F" }} />
        <Px style={{ position: "absolute", left: "72%", bottom: 52, width: 12, height: 12, backgroundColor: "#FFD54F" }} />
        <Px style={{ position: "absolute", left: "63%", bottom: 28, width: 32, height: 8, backgroundColor: "#FFD54F" }} />
        <Px style={{ position: "absolute", left: "86%", bottom: 12, width: 24, height: 20, backgroundColor: "#5E35D6" }} />
        <Px style={{ position: "absolute", left: "88%", bottom: 32, width: 8, height: 8, backgroundColor: "#E86A92" }} />
        <Px style={{ position: "absolute", left: "92%", bottom: 32, width: 8, height: 8, backgroundColor: "#FFC531" }} />
        <Px style={{ position: "absolute", left: "46%", bottom: 108, width: 24, height: 24, backgroundColor: "#F5EFD8" }} />
        <Px style={{ position: "absolute", left: "48%", bottom: 112, width: 20, height: 20, backgroundColor: "#2A2140" }} />
      </StepIn>
      {[0, 1].map((i) => (
        <StepBob key={i} left={`${54 + i * 12}%` as `${number}%`} bottom={116 - i * 12} width={20} height={8} distance={4} period={1200 + i * 200} delay={i * 300}>
          <Px style={{ position: "absolute", left: 0, bottom: 0, width: 8, height: 8, backgroundColor: "#14101F" }} />
          <Px style={{ position: "absolute", left: 12, bottom: 0, width: 8, height: 8, backgroundColor: "#14101F" }} />
        </StepBob>
      ))}
    </PixelSceneRoot>
  );
}

export function PixelStPatricksScene() {
  return (
    <PixelSceneRoot base="#2E7D46">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "28%", backgroundColor: "#256B3A" }} />
      <StepIn style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        <Px style={{ position: "absolute", left: "52%", bottom: 88, width: 148, height: 12, backgroundColor: "#D64545" }} />
        <Px style={{ position: "absolute", left: "52%", bottom: 76, width: 148, height: 12, backgroundColor: "#F5A623" }} />
        <Px style={{ position: "absolute", left: "52%", bottom: 64, width: 148, height: 12, backgroundColor: "#FFC531" }} />
        <Px style={{ position: "absolute", left: "52%", bottom: 52, width: 148, height: 12, backgroundColor: "#58A05C" }} />
        <Px style={{ position: "absolute", left: "52%", bottom: 28, width: 12, height: 24, backgroundColor: "#D64545" }} />
        <Px style={{ position: "absolute", left: "86%", bottom: 28, width: 12, height: 24, backgroundColor: "#58A05C" }} />
        <Px style={{ position: "absolute", left: "86%", bottom: 12, width: 32, height: 24, backgroundColor: "#2C2C33" }} shadow />
        <Px style={{ position: "absolute", left: "85%", bottom: 32, width: 36, height: 8, backgroundColor: "#FFC531" }} />
        <Px style={{ position: "absolute", left: "88%", bottom: 40, width: 8, height: 8, backgroundColor: "#FFD54F" }} />
        <Px style={{ position: "absolute", left: "91%", bottom: 40, width: 8, height: 8, backgroundColor: "#F5A623" }} />
      </StepIn>
      <StepBob left="47%" bottom={32} width={36} height={40} distance={4} period={1500}>
        <Px style={{ position: "absolute", left: 0, bottom: 20, width: 16, height: 16, backgroundColor: "#58A05C" }} />
        <Px style={{ position: "absolute", left: 20, bottom: 20, width: 16, height: 16, backgroundColor: "#58A05C" }} />
        <Px style={{ position: "absolute", left: 10, bottom: 28, width: 16, height: 12, backgroundColor: "#6FBF73" }} />
        <Px style={{ position: "absolute", left: 16, bottom: 0, width: 4, height: 20, backgroundColor: "#3E7C43" }} />
      </StepBob>
    </PixelSceneRoot>
  );
}

export function PixelNewsScene() {
  return (
    <PixelSceneRoot base="#31456B">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "26%", backgroundColor: "#22314E" }} />
      <StepIn style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        <Px style={{ position: "absolute", left: "30%", bottom: 24, width: 132, height: 96, backgroundColor: "#E4D8BC" }} />
        <Px style={{ position: "absolute", left: "33%", bottom: 32, width: 132, height: 96, backgroundColor: "#FBF6E9" }} shadow />
        <Px style={{ position: "absolute", left: "37%", bottom: 108, width: 108, height: 12, backgroundColor: "#31456B" }} />
        <Px style={{ position: "absolute", left: "37%", bottom: 100, width: 108, height: 4, backgroundColor: "#31456B" }} />
        <Px style={{ position: "absolute", left: "37%", bottom: 60, width: 44, height: 32, backgroundColor: "#B9CBDE" }} />
        <Px style={{ position: "absolute", left: "49%", bottom: 64, width: 16, height: 16, backgroundColor: "#FFF8E1" }} />
        <Px style={{ position: "absolute", left: "53%", bottom: 80, width: 8, height: 8, backgroundColor: "#8D4000" }} />
        <Px style={{ position: "absolute", left: "55%", bottom: 88, width: 4, height: 8, backgroundColor: "#FFD54F" }} />
        <Px style={{ position: "absolute", left: "66%", bottom: 84, width: 52, height: 8, backgroundColor: "#2E3D59" }} />
        <Px style={{ position: "absolute", left: "66%", bottom: 72, width: 52, height: 4, backgroundColor: "#9AA7BC" }} />
        <Px style={{ position: "absolute", left: "66%", bottom: 64, width: 44, height: 4, backgroundColor: "#9AA7BC" }} />
        <Px style={{ position: "absolute", left: "37%", bottom: 48, width: 108, height: 4, backgroundColor: "#9AA7BC" }} />
        <Px style={{ position: "absolute", left: "37%", bottom: 40, width: 92, height: 4, backgroundColor: "#9AA7BC" }} />
        <Px style={{ position: "absolute", left: "12%", bottom: 36, width: 28, height: 24, backgroundColor: "#FFFDF7" }} />
        <Px style={{ position: "absolute", left: "13%", bottom: 52, width: 24, height: 6, backgroundColor: "#6F4E37" }} />
        <Px style={{ position: "absolute", left: "10%", bottom: 28, width: 36, height: 6, backgroundColor: "#CBBFA4" }} />
      </StepIn>
    </PixelSceneRoot>
  );
}

export function PixelEmailScene() {
  return (
    <PixelSceneRoot base="#4C2E91">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "24%", backgroundColor: "#3A2270" }} />
      <StepIn style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        <Px style={{ position: "absolute", left: "14%", bottom: 104, width: 8, height: 8, backgroundColor: "#D9CCFF" }} />
        <Px style={{ position: "absolute", left: "84%", bottom: 84, width: 8, height: 8, backgroundColor: "#D9CCFF" }} />
        <Px style={{ position: "absolute", left: "36%", bottom: 68, width: 108, height: 72, backgroundColor: "#FFFDF7" }} shadow />
        <Px style={{ position: "absolute", left: "40%", bottom: 124, width: 56, height: 8, backgroundColor: "#4C2E91" }} />
        <Px style={{ position: "absolute", left: "40%", bottom: 108, width: 84, height: 4, backgroundColor: "#B9AEDD" }} />
        <Px style={{ position: "absolute", left: "40%", bottom: 96, width: 72, height: 4, backgroundColor: "#B9AEDD" }} />
        <Px style={{ position: "absolute", left: "40%", bottom: 84, width: 80, height: 4, backgroundColor: "#B9AEDD" }} />
        <Px style={{ position: "absolute", left: "82%", bottom: 120, width: 16, height: 16, backgroundColor: "#7C5CFF" }} />
        <Px style={{ position: "absolute", left: "31%", bottom: 20, width: 128, height: 56, backgroundColor: "#E9E2F7" }} shadow />
        <Px style={{ position: "absolute", left: "33%", bottom: 60, width: 32, height: 8, backgroundColor: "#CDBFF0" }} />
        <Px style={{ position: "absolute", left: "41%", bottom: 52, width: 32, height: 8, backgroundColor: "#CDBFF0" }} />
        <Px style={{ position: "absolute", left: "49%", bottom: 44, width: 24, height: 8, backgroundColor: "#CDBFF0" }} />
        <Px style={{ position: "absolute", left: "61%", bottom: 52, width: 32, height: 8, backgroundColor: "#CDBFF0" }} />
        <Px style={{ position: "absolute", left: "69%", bottom: 60, width: 32, height: 8, backgroundColor: "#CDBFF0" }} />
        <Px style={{ position: "absolute", left: "31%", bottom: 20, width: 128, height: 8, backgroundColor: "#D9CCFF" }} />
        <Px style={{ position: "absolute", left: "8%", bottom: 24, width: 48, height: 32, backgroundColor: "#B79CFF" }} />
        <Px style={{ position: "absolute", left: "12%", bottom: 44, width: 24, height: 6, backgroundColor: "#8F73E8" }} />
      </StepIn>
    </PixelSceneRoot>
  );
}
