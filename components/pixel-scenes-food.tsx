// Pixel food scenes for the 8-bit skin (v183): pixel renditions of the
// food keyword scenes, mirroring the paper scenes' compositions and
// colors in chunky squares — flat palette, axis-aligned pieces only,
// stepped motion only.

import { View } from "react-native";
import { PixelSceneRoot, Px, PxSun, StepBlink, StepBob, StepIn } from "@/components/pixel-kit";

export function PixelTdTvDinnerScene() {
  // Foil tray dinner on a folding stand, remote on top.
  return (
    <PixelSceneRoot base="#4A4A55">
      <View style={{ position: "absolute", left: "40%", right: 0, bottom: 0, height: "18%", backgroundColor: "#3C3C46" }} />
      <StepIn delay={120} style={{ position: "absolute", left: "54%", bottom: 2, width: 120, height: 44 }}>
        <Px style={{ position: "absolute", left: 16, bottom: 0, width: 8, height: 44, backgroundColor: "#6E6E78" }} />
        <Px style={{ position: "absolute", left: 96, bottom: 0, width: 8, height: 44, backgroundColor: "#6E6E78" }} />
        <Px style={{ position: "absolute", left: 56, bottom: 0, width: 8, height: 44, backgroundColor: "#5A5A64" }} />
      </StepIn>
      <StepIn delay={50} style={{ position: "absolute", left: "48%", bottom: 44, width: 148, height: 88 }}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 148, height: 88, backgroundColor: "#B9CBD8" }} shadow />
        <Px style={{ position: "absolute", left: 8, bottom: 48, width: 64, height: 32, backgroundColor: "#E8E2D4" }} />
        <Px style={{ position: "absolute", left: 16, bottom: 56, width: 48, height: 16, backgroundColor: "#FFF8E1" }} />
        <Px style={{ position: "absolute", left: 76, bottom: 48, width: 64, height: 32, backgroundColor: "#7A4A2B" }} />
        <Px style={{ position: "absolute", left: 88, bottom: 56, width: 40, height: 16, backgroundColor: "#8A5A33" }} />
        <Px style={{ position: "absolute", left: 8, bottom: 8, width: 64, height: 32, backgroundColor: "#58A05C" }} />
        <Px style={{ position: "absolute", left: 16, bottom: 16, width: 8, height: 8, backgroundColor: "#FFC531" }} />
        <Px style={{ position: "absolute", left: 32, bottom: 16, width: 8, height: 8, backgroundColor: "#6FBF73" }} />
        <Px style={{ position: "absolute", left: 48, bottom: 24, width: 8, height: 8, backgroundColor: "#FFC531" }} />
        <Px style={{ position: "absolute", left: 76, bottom: 8, width: 64, height: 32, backgroundColor: "#5D3A1A" }} />
        <Px style={{ position: "absolute", left: 88, bottom: 16, width: 40, height: 16, backgroundColor: "#6E4525" }} />
      </StepIn>
      <StepIn delay={240} style={{ position: "absolute", left: "44%", bottom: 100, width: 12, height: 28 }}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 12, height: 28, backgroundColor: "#2C2C33" }} />
        <StepBlink period={1100} style={{ position: "absolute", left: 0, bottom: 0, width: 12, height: 28 }}><Px style={{ position: "absolute", left: 4, bottom: 20, width: 4, height: 4, backgroundColor: "#D64545" }} /></StepBlink>
      </StepIn>
    </PixelSceneRoot>
  );
}

export function PixelTdBurritoScene() {
  // Burrito on a wooden board, rice and beans in small bowls.
  return (
    <PixelSceneRoot base="#8A4A2B">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "30%", backgroundColor: "#74401F" }} />
      <StepIn delay={50} style={{ position: "absolute", left: "46%", bottom: 12, width: 168, height: 100 }}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 168, height: 100, backgroundColor: "#B07D4F" }} shadow />
        <Px style={{ position: "absolute", left: 8, bottom: 8, width: 152, height: 84, backgroundColor: "#96613A" }} />
      </StepIn>
      <StepBob left="50%" bottom={60} width={128} height={48} distance={4}>
        <Px style={{ position: "absolute", left: 0, bottom: 8, width: 128, height: 32, backgroundColor: "#F2D8A7" }} />
        <Px style={{ position: "absolute", left: 8, bottom: 0, width: 112, height: 8, backgroundColor: "#E3C184" }} />
        <Px style={{ position: "absolute", left: 8, bottom: 40, width: 112, height: 8, backgroundColor: "#E3C184" }} />
        <Px style={{ position: "absolute", left: 24, bottom: 20, width: 64, height: 8, backgroundColor: "#D64545" }} />
      </StepBob>
      <StepIn delay={210} style={{ position: "absolute", left: "50%", bottom: 16, width: 40, height: 24 }}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 40, height: 16, backgroundColor: "#EDE6D8" }} />
        <Px style={{ position: "absolute", left: 4, bottom: 16, width: 32, height: 8, backgroundColor: "#FFF8E1" }} />
      </StepIn>
      <StepIn delay={270} style={{ position: "absolute", left: "76%", bottom: 16, width: 40, height: 24 }}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 40, height: 16, backgroundColor: "#54382A" }} />
        <Px style={{ position: "absolute", left: 4, bottom: 16, width: 32, height: 8, backgroundColor: "#6E4525" }} />
      </StepIn>
      <Px style={{ position: "absolute", left: "86%", bottom: 92, width: 12, height: 12, backgroundColor: "#58A05C" }} />
      <Px style={{ position: "absolute", left: "89%", bottom: 80, width: 12, height: 12, backgroundColor: "#7FB069" }} />
    </PixelSceneRoot>
  );
}

export function PixelTdTostadasScene() {
  // Two tostadas on a terracotta platter, toppings piled high.
  return (
    <PixelSceneRoot base="#7A3B2E">
      <StepIn delay={50} style={{ position: "absolute", left: "45%", bottom: 8, width: 172, height: 120 }}>
        <Px style={{ position: "absolute", left: 8, bottom: 0, width: 156, height: 120, backgroundColor: "#C96A2B" }} shadow />
        <Px style={{ position: "absolute", left: 0, bottom: 12, width: 172, height: 96, backgroundColor: "#C96A2B" }} />
        <Px style={{ position: "absolute", left: 16, bottom: 16, width: 140, height: 88, backgroundColor: "#A8541F" }} />
      </StepIn>
      <StepIn delay={140} style={{ position: "absolute", left: "49%", bottom: 60, width: 68, height: 60 }}>
        <Px style={{ position: "absolute", left: 4, bottom: 0, width: 60, height: 60, backgroundColor: "#EFC477" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 8, width: 68, height: 44, backgroundColor: "#EFC477" }} />
        <Px style={{ position: "absolute", left: 12, bottom: 12, width: 44, height: 36, backgroundColor: "#C96A2B" }} />
        <Px style={{ position: "absolute", left: 16, bottom: 16, width: 12, height: 12, backgroundColor: "#D64545" }} />
        <Px style={{ position: "absolute", left: 36, bottom: 16, width: 12, height: 12, backgroundColor: "#FFF8E1" }} />
        <Px style={{ position: "absolute", left: 24, bottom: 32, width: 16, height: 8, backgroundColor: "#58A05C" }} />
      </StepIn>
      <StepIn delay={230} style={{ position: "absolute", left: "66%", bottom: 16, width: 68, height: 60 }}>
        <Px style={{ position: "absolute", left: 4, bottom: 0, width: 60, height: 60, backgroundColor: "#EFC477" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 8, width: 68, height: 44, backgroundColor: "#EFC477" }} />
        <Px style={{ position: "absolute", left: 12, bottom: 12, width: 44, height: 36, backgroundColor: "#A93226" }} />
        <Px style={{ position: "absolute", left: 16, bottom: 16, width: 12, height: 12, backgroundColor: "#FFF8E1" }} />
        <Px style={{ position: "absolute", left: 36, bottom: 28, width: 12, height: 12, backgroundColor: "#58A05C" }} />
      </StepIn>
    </PixelSceneRoot>
  );
}

export function PixelTdTacosScene() {
  // Three tacos standing in a rack on a board.
  return (
    <PixelSceneRoot base="#A8541F">
      <StepIn delay={50} style={{ position: "absolute", left: "47%", bottom: 12, width: 160, height: 104 }}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 160, height: 104, backgroundColor: "#8A5A2B" }} shadow />
        <Px style={{ position: "absolute", left: 8, bottom: 8, width: 144, height: 88, backgroundColor: "#96613A" }} />
      </StepIn>
      {[0, 1, 2].map((i) => (
        <StepIn key={i} delay={140 + i * 90} style={{ position: "absolute", left: `${50 + i * 13}%` as `${number}%`, bottom: 36 + (i % 2) * 20, width: 52, height: 52 }}>
          <Px style={{ position: "absolute", left: 8, bottom: 0, width: 36, height: 8, backgroundColor: "#F2C14E" }} />
          <Px style={{ position: "absolute", left: 4, bottom: 8, width: 44, height: 12, backgroundColor: "#F2C14E" }} />
          <Px style={{ position: "absolute", left: 0, bottom: 20, width: 52, height: 20, backgroundColor: "#F2C14E" }} />
          <Px style={{ position: "absolute", left: 8, bottom: 32, width: 12, height: 12, backgroundColor: "#7A4A2B" }} />
          <Px style={{ position: "absolute", left: 24, bottom: 36, width: 12, height: 12, backgroundColor: "#58A05C" }} />
          <Px style={{ position: "absolute", left: 36, bottom: 28, width: 8, height: 8, backgroundColor: "#D64545" }} />
        </StepIn>
      ))}
      <StepIn delay={440} style={{ position: "absolute", left: "49%", bottom: 20, width: 148, height: 12 }}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 148, height: 8, backgroundColor: "#C0C6CE" }} />
      </StepIn>
    </PixelSceneRoot>
  );
}

export function PixelTdPizzaScene() {
  // Whole pie on a wooden peel, one slice pulling away.
  return (
    <PixelSceneRoot base="#7A2E2E">
      <StepIn delay={50} style={{ position: "absolute", left: "46%", bottom: 8, width: 176, height: 120 }}>
        <Px style={{ position: "absolute", left: 8, bottom: 8, width: 132, height: 104, backgroundColor: "#B07D4F" }} shadow />
        <Px style={{ position: "absolute", left: 0, bottom: 20, width: 148, height: 80, backgroundColor: "#B07D4F" }} />
        <Px style={{ position: "absolute", left: 140, bottom: 48, width: 36, height: 16, backgroundColor: "#96613A" }} />
      </StepIn>
      <StepIn delay={140} style={{ position: "absolute", left: "48%", bottom: 16, width: 132, height: 108 }}>
        <Px style={{ position: "absolute", left: 8, bottom: 0, width: 116, height: 108, backgroundColor: "#E8A94E" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 12, width: 132, height: 84, backgroundColor: "#E8A94E" }} />
        <Px style={{ position: "absolute", left: 16, bottom: 12, width: 100, height: 84, backgroundColor: "#F2B53A" }} />
        <Px style={{ position: "absolute", left: 24, bottom: 24, width: 16, height: 16, backgroundColor: "#B03A2E" }} />
        <Px style={{ position: "absolute", left: 56, bottom: 20, width: 16, height: 16, backgroundColor: "#B03A2E" }} />
        <Px style={{ position: "absolute", left: 88, bottom: 28, width: 16, height: 16, backgroundColor: "#B03A2E" }} />
        <Px style={{ position: "absolute", left: 36, bottom: 56, width: 16, height: 16, backgroundColor: "#B03A2E" }} />
        <Px style={{ position: "absolute", left: 72, bottom: 60, width: 16, height: 16, backgroundColor: "#B03A2E" }} />
        <Px style={{ position: "absolute", left: 48, bottom: 40, width: 8, height: 8, backgroundColor: "#3E7C43" }} />
        <Px style={{ position: "absolute", left: 96, bottom: 52, width: 8, height: 8, backgroundColor: "#3E7C43" }} />
      </StepIn>
      <StepIn delay={280} style={{ position: "absolute", left: "82%", bottom: 12, width: 40, height: 48 }}>
        <Px style={{ position: "absolute", left: 12, bottom: 0, width: 16, height: 12, backgroundColor: "#F2B53A" }} />
        <Px style={{ position: "absolute", left: 8, bottom: 12, width: 24, height: 12, backgroundColor: "#F2B53A" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 24, width: 40, height: 12, backgroundColor: "#F2B53A" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 36, width: 40, height: 8, backgroundColor: "#E8A94E" }} />
        <Px style={{ position: "absolute", left: 16, bottom: 16, width: 12, height: 12, backgroundColor: "#B03A2E" }} />
        <Px style={{ position: "absolute", left: 16, bottom: 0, width: 8, height: 8, backgroundColor: "#F5C86B" }} />
      </StepIn>
    </PixelSceneRoot>
  );
}

export function PixelTdSandwichScene() {
  // Deli halves on butcher paper, pickles and chips alongside.
  return (
    <PixelSceneRoot base="#5D7A4A">
      <StepIn delay={40} style={{ position: "absolute", left: "47%", bottom: 12, width: 160, height: 112 }}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 160, height: 112, backgroundColor: "#F7F2E4" }} shadow />
      </StepIn>
      <StepIn delay={130} style={{ position: "absolute", left: "50%", bottom: 28, width: 72, height: 64 }}>
        <Px style={{ position: "absolute", left: 8, bottom: 0, width: 56, height: 12, backgroundColor: "#F2D8A7" }} />
        <Px style={{ position: "absolute", left: 4, bottom: 12, width: 64, height: 12, backgroundColor: "#58A05C" }} />
        <Px style={{ position: "absolute", left: 8, bottom: 24, width: 56, height: 12, backgroundColor: "#D64545" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 36, width: 72, height: 12, backgroundColor: "#F2D8A7" }} />
        <Px style={{ position: "absolute", left: 8, bottom: 48, width: 56, height: 12, backgroundColor: "#EFC477" }} />
      </StepIn>
      <StepIn delay={210} style={{ position: "absolute", left: "66%", bottom: 60, width: 72, height: 52 }}>
        <Px style={{ position: "absolute", left: 8, bottom: 0, width: 56, height: 12, backgroundColor: "#EFC477" }} />
        <Px style={{ position: "absolute", left: 4, bottom: 12, width: 64, height: 8, backgroundColor: "#D64545" }} />
        <Px style={{ position: "absolute", left: 8, bottom: 20, width: 56, height: 12, backgroundColor: "#58A05C" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 32, width: 72, height: 16, backgroundColor: "#EFC477" }} />
      </StepIn>
      <Px style={{ position: "absolute", left: "52%", bottom: 96, width: 16, height: 12, backgroundColor: "#8FBC7A" }} />
      <Px style={{ position: "absolute", left: "56%", bottom: 88, width: 16, height: 12, backgroundColor: "#7FB069" }} />
      <Px style={{ position: "absolute", left: "78%", bottom: 20, width: 16, height: 12, backgroundColor: "#F2C14E" }} />
      <Px style={{ position: "absolute", left: "82%", bottom: 32, width: 16, height: 12, backgroundColor: "#F2C14E" }} />
      <Px style={{ position: "absolute", left: "76%", bottom: 32, width: 16, height: 12, backgroundColor: "#E8B34B" }} />
    </PixelSceneRoot>
  );
}

export function PixelTdPapaJoeScene() {
  // Focaccia halves on butcher paper: pesto, turkey, melted Asiago,
  // roasted tomato — chips and a pickle alongside.
  return (
    <PixelSceneRoot base="#5D7A4A">
      <StepIn delay={40} style={{ position: "absolute", left: "47%", bottom: 12, width: 160, height: 112 }}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 160, height: 112, backgroundColor: "#F7F2E4" }} shadow />
      </StepIn>
      <StepIn delay={130} style={{ position: "absolute", left: "50%", bottom: 28, width: 72, height: 64 }}>
        <Px style={{ position: "absolute", left: 8, bottom: 0, width: 56, height: 12, backgroundColor: "#F2D8A7" }} />
        <Px style={{ position: "absolute", left: 4, bottom: 12, width: 64, height: 8, backgroundColor: "#58A05C" }} />
        <Px style={{ position: "absolute", left: 8, bottom: 20, width: 56, height: 12, backgroundColor: "#F5E9D2" }} />
        <Px style={{ position: "absolute", left: 4, bottom: 32, width: 64, height: 12, backgroundColor: "#FFF6DC" }} />
        <Px style={{ position: "absolute", left: 12, bottom: 44, width: 16, height: 12, backgroundColor: "#D64545" }} />
        <Px style={{ position: "absolute", left: 36, bottom: 44, width: 16, height: 12, backgroundColor: "#C93B3B" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 56, width: 72, height: 8, backgroundColor: "#EFC477" }} />
      </StepIn>
      <StepIn delay={210} style={{ position: "absolute", left: "66%", bottom: 60, width: 72, height: 52 }}>
        <Px style={{ position: "absolute", left: 8, bottom: 0, width: 56, height: 12, backgroundColor: "#EFC477" }} />
        <Px style={{ position: "absolute", left: 4, bottom: 12, width: 64, height: 8, backgroundColor: "#58A05C" }} />
        <Px style={{ position: "absolute", left: 8, bottom: 20, width: 56, height: 12, backgroundColor: "#FFF6DC" }} />
        <Px style={{ position: "absolute", left: 24, bottom: 32, width: 16, height: 12, backgroundColor: "#D64545" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 44, width: 72, height: 8, backgroundColor: "#EFC477" }} />
      </StepIn>
      <Px style={{ position: "absolute", left: "52%", bottom: 96, width: 16, height: 12, backgroundColor: "#8FBC7A" }} />
      <Px style={{ position: "absolute", left: "56%", bottom: 88, width: 16, height: 12, backgroundColor: "#7FB069" }} />
      <Px style={{ position: "absolute", left: "78%", bottom: 20, width: 16, height: 12, backgroundColor: "#F2C14E" }} />
      <Px style={{ position: "absolute", left: "82%", bottom: 32, width: 16, height: 12, backgroundColor: "#F2C14E" }} />
      <Px style={{ position: "absolute", left: "76%", bottom: 32, width: 16, height: 12, backgroundColor: "#E8B34B" }} />
    </PixelSceneRoot>
  );
}

export function PixelTdSaladScene() {
  // Big wooden bowl of salad, fork resting on the rim.
  return (
    <PixelSceneRoot base="#7A9A5B">
      <StepIn delay={50} style={{ position: "absolute", left: "46%", bottom: 12, width: 156, height: 84 }}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 156, height: 12, backgroundColor: "#8A5A2B" }} />
        <Px style={{ position: "absolute", left: 8, bottom: 12, width: 140, height: 20, backgroundColor: "#8A5A2B" }} />
        <Px style={{ position: "absolute", left: 16, bottom: 32, width: 124, height: 20, backgroundColor: "#8A5A2B" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 52, width: 156, height: 16, backgroundColor: "#A8711F" }} />
        <Px style={{ position: "absolute", left: 8, bottom: 60, width: 140, height: 12, backgroundColor: "#5D3A1A" }} />
      </StepIn>
      <StepIn delay={140} style={{ position: "absolute", left: "50%", bottom: 76, width: 132, height: 40 }}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 24, height: 16, backgroundColor: "#6FBF73" }} />
        <Px style={{ position: "absolute", left: 28, bottom: 4, width: 24, height: 16, backgroundColor: "#58A05C" }} />
        <Px style={{ position: "absolute", left: 56, bottom: 0, width: 24, height: 16, backgroundColor: "#6FBF73" }} />
        <Px style={{ position: "absolute", left: 84, bottom: 8, width: 24, height: 16, backgroundColor: "#58A05C" }} />
        <Px style={{ position: "absolute", left: 108, bottom: 0, width: 24, height: 16, backgroundColor: "#6FBF73" }} />
        <Px style={{ position: "absolute", left: 36, bottom: 20, width: 24, height: 16, backgroundColor: "#58A05C" }} />
        <Px style={{ position: "absolute", left: 76, bottom: 24, width: 24, height: 16, backgroundColor: "#6FBF73" }} />
      </StepIn>
      <Px style={{ position: "absolute", left: "60%", bottom: 92, width: 16, height: 16, backgroundColor: "#D64545" }} />
      <Px style={{ position: "absolute", left: "72%", bottom: 84, width: 16, height: 16, backgroundColor: "#E86A5C" }} />
      <Px style={{ position: "absolute", left: "66%", bottom: 104, width: 16, height: 16, backgroundColor: "#F2F7E8" }} />
      <Px style={{ position: "absolute", left: "68%", bottom: 108, width: 8, height: 8, backgroundColor: "#A8C686" }} />
      <Px style={{ position: "absolute", left: "86%", bottom: 64, width: 8, height: 56, backgroundColor: "#C0C6CE" }} />
    </PixelSceneRoot>
  );
}

export function PixelTdPastaScene() {
  // Deep bowl of red-sauce pasta, steam rising.
  return (
    <PixelSceneRoot base="#8A3324">
      <StepIn delay={50} style={{ position: "absolute", left: "47%", bottom: 12, width: 152, height: 88 }}>
        <Px style={{ position: "absolute", left: 4, bottom: 0, width: 144, height: 12, backgroundColor: "#EDE6D8" }} />
        <Px style={{ position: "absolute", left: 12, bottom: 12, width: 128, height: 20, backgroundColor: "#FFFFFF" }} />
        <Px style={{ position: "absolute", left: 20, bottom: 32, width: 112, height: 20, backgroundColor: "#FFFFFF" }} />
        <Px style={{ position: "absolute", left: 12, bottom: 52, width: 128, height: 16, backgroundColor: "#F4EFE4" }} />
        <Px style={{ position: "absolute", left: 20, bottom: 60, width: 112, height: 16, backgroundColor: "#C0392B" }} />
      </StepIn>
      <StepIn delay={140} style={{ position: "absolute", left: "53%", bottom: 68, width: 108, height: 36 }}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 24, height: 24, backgroundColor: "#EFC95C" }} />
        <Px style={{ position: "absolute", left: 4, bottom: 4, width: 16, height: 16, backgroundColor: "#F7DC6F" }} />
        <Px style={{ position: "absolute", left: 32, bottom: 8, width: 24, height: 24, backgroundColor: "#EFC95C" }} />
        <Px style={{ position: "absolute", left: 36, bottom: 12, width: 16, height: 16, backgroundColor: "#F7DC6F" }} />
        <Px style={{ position: "absolute", left: 64, bottom: 0, width: 24, height: 24, backgroundColor: "#EFC95C" }} />
        <Px style={{ position: "absolute", left: 84, bottom: 12, width: 24, height: 24, backgroundColor: "#F7DC6F" }} />
      </StepIn>
      <Px style={{ position: "absolute", left: "64%", bottom: 96, width: 12, height: 12, backgroundColor: "#3E7C43" }} />
      <Px style={{ position: "absolute", left: "76%", bottom: 88, width: 12, height: 12, backgroundColor: "#478A4E" }} />
      <Px style={{ position: "absolute", left: "58%", bottom: 100, width: 8, height: 8, backgroundColor: "#FFF8E1" }} />
      <StepBob left="62%" bottom={108} width={12} height={16} distance={4}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 12, height: 16, backgroundColor: "#FFFFFF", opacity: 0.45 }} />
      </StepBob>
      <StepBob left="72%" bottom={112} width={8} height={12} distance={4} delay={300}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 8, height: 12, backgroundColor: "#FFFFFF", opacity: 0.35 }} />
      </StepBob>
    </PixelSceneRoot>
  );
}

export function PixelTdPancakesScene() {
  // Tall stack with syrup, butter and berries.
  return (
    <PixelSceneRoot base="#7A4A21">
      <StepIn delay={40} style={{ position: "absolute", left: "46%", bottom: 8, width: 160, height: 112 }}>
        <Px style={{ position: "absolute", left: 8, bottom: 0, width: 144, height: 112, backgroundColor: "#EDE6D8" }} shadow />
        <Px style={{ position: "absolute", left: 0, bottom: 12, width: 160, height: 88, backgroundColor: "#EDE6D8" }} />
        <Px style={{ position: "absolute", left: 16, bottom: 16, width: 128, height: 80, backgroundColor: "#D8CBB2" }} />
        <Px style={{ position: "absolute", left: 20, bottom: 20, width: 120, height: 72, backgroundColor: "#EDE6D8" }} />
      </StepIn>
      <StepBob left="51%" bottom={24} width={120} height={80} distance={4}>
        <Px style={{ position: "absolute", left: 4, bottom: 0, width: 112, height: 20, backgroundColor: "#EFC477" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 20, width: 120, height: 20, backgroundColor: "#F2C979" }} />
        <Px style={{ position: "absolute", left: 4, bottom: 40, width: 112, height: 20, backgroundColor: "#EFC477" }} />
        <Px style={{ position: "absolute", left: 16, bottom: 56, width: 88, height: 12, backgroundColor: "#B57F24" }} />
        <Px style={{ position: "absolute", left: 44, bottom: 64, width: 32, height: 16, backgroundColor: "#FFE9A8" }} />
      </StepBob>
      <Px style={{ position: "absolute", left: "52%", bottom: 104, width: 12, height: 12, backgroundColor: "#3E5C8A" }} />
      <Px style={{ position: "absolute", left: "80%", bottom: 100, width: 12, height: 12, backgroundColor: "#5B7FB8" }} />
      <Px style={{ position: "absolute", left: "84%", bottom: 32, width: 12, height: 12, backgroundColor: "#A93226" }} />
      <Px style={{ position: "absolute", left: "88%", bottom: 44, width: 8, height: 52, backgroundColor: "#C0C6CE" }} />
    </PixelSceneRoot>
  );
}

export function PixelTdSoupScene() {
  // Steaming mug of soup on a board, crackers and a spoon.
  return (
    <PixelSceneRoot base="#5B4A68">
      <StepIn delay={40} style={{ position: "absolute", left: "46%", bottom: 8, width: 164, height: 104 }}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 164, height: 104, backgroundColor: "#8A5A2B" }} shadow />
        <Px style={{ position: "absolute", left: 8, bottom: 8, width: 148, height: 88, backgroundColor: "#96613A" }} />
      </StepIn>
      <StepIn delay={130} style={{ position: "absolute", left: "52%", bottom: 28, width: 112, height: 68 }}>
        <Px style={{ position: "absolute", left: 8, bottom: 0, width: 80, height: 16, backgroundColor: "#EDE6D8" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 16, width: 96, height: 24, backgroundColor: "#EDE6D8" }} />
        <Px style={{ position: "absolute", left: 96, bottom: 24, width: 16, height: 16, backgroundColor: "#EDE6D8" }} />
        <Px style={{ position: "absolute", left: 8, bottom: 40, width: 80, height: 16, backgroundColor: "#D97B2E" }} />
        <Px style={{ position: "absolute", left: 28, bottom: 44, width: 36, height: 8, backgroundColor: "#F7C873" }} />
      </StepIn>
      <Px style={{ position: "absolute", left: "50%", bottom: 100, width: 16, height: 16, backgroundColor: "#EFC477" }} />
      <Px style={{ position: "absolute", left: "56%", bottom: 108, width: 16, height: 16, backgroundColor: "#E8B34B" }} />
      <Px style={{ position: "absolute", left: "82%", bottom: 20, width: 24, height: 8, backgroundColor: "#C0C6CE" }} />
      <Px style={{ position: "absolute", left: "84%", bottom: 28, width: 16, height: 4, backgroundColor: "#C0C6CE" }} />
      <StepBob left="62%" bottom={100} width={12} height={16} distance={4}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 12, height: 16, backgroundColor: "#FFFFFF", opacity: 0.45 }} />
      </StepBob>
    </PixelSceneRoot>
  );
}

export function PixelTdEggsScene() {
  // Two fried eggs, bacon and toast on a plate.
  return (
    <PixelSceneRoot base="#8A6D3B">
      <StepIn delay={40} style={{ position: "absolute", left: "46%", bottom: 8, width: 160, height: 112 }}>
        <Px style={{ position: "absolute", left: 8, bottom: 0, width: 144, height: 112, backgroundColor: "#EDE6D8" }} shadow />
        <Px style={{ position: "absolute", left: 0, bottom: 12, width: 160, height: 88, backgroundColor: "#EDE6D8" }} />
        <Px style={{ position: "absolute", left: 16, bottom: 16, width: 128, height: 80, backgroundColor: "#D8CBB2" }} />
        <Px style={{ position: "absolute", left: 20, bottom: 20, width: 120, height: 72, backgroundColor: "#EDE6D8" }} />
      </StepIn>
      <StepIn delay={130} style={{ position: "absolute", left: "50%", bottom: 60, width: 60, height: 52 }}>
        <Px style={{ position: "absolute", left: 4, bottom: 0, width: 52, height: 52, backgroundColor: "#FFFFFF" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 8, width: 60, height: 36, backgroundColor: "#FFFFFF" }} />
        <Px style={{ position: "absolute", left: 16, bottom: 12, width: 28, height: 28, backgroundColor: "#FFB300" }} />
      </StepIn>
      <StepIn delay={200} style={{ position: "absolute", left: "66%", bottom: 20, width: 56, height: 48 }}>
        <Px style={{ position: "absolute", left: 4, bottom: 0, width: 48, height: 48, backgroundColor: "#FFFFFF" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 8, width: 56, height: 32, backgroundColor: "#FFFFFF" }} />
        <Px style={{ position: "absolute", left: 16, bottom: 12, width: 24, height: 24, backgroundColor: "#FFC531" }} />
      </StepIn>
      <Px style={{ position: "absolute", left: "50%", bottom: 24, width: 48, height: 12, backgroundColor: "#A93226" }} />
      <Px style={{ position: "absolute", left: "51%", bottom: 40, width: 48, height: 12, backgroundColor: "#922B21" }} />
      <StepIn delay={300} style={{ position: "absolute", left: "80%", bottom: 80, width: 36, height: 36 }}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 36, height: 36, backgroundColor: "#E8B34B" }} />
        <Px style={{ position: "absolute", left: 8, bottom: 8, width: 20, height: 20, backgroundColor: "#F7DC6F" }} />
      </StepIn>
    </PixelSceneRoot>
  );
}

export function PixelTdMexicanPizzaScene() {
  // Baked in its skillet, olives and peppers on top.
  return (
    <PixelSceneRoot base="#6E2F1F">
      <StepIn delay={50} style={{ position: "absolute", left: "45%", bottom: 12, width: 172, height: 108 }}>
        <Px style={{ position: "absolute", left: 120, bottom: 44, width: 52, height: 16, backgroundColor: "#2C2C33" }} />
        <Px style={{ position: "absolute", left: 8, bottom: 0, width: 116, height: 108, backgroundColor: "#2C2C33" }} shadow />
        <Px style={{ position: "absolute", left: 0, bottom: 12, width: 132, height: 84, backgroundColor: "#2C2C33" }} />
        <Px style={{ position: "absolute", left: 16, bottom: 12, width: 100, height: 84, backgroundColor: "#3A3A42" }} />
      </StepIn>
      <StepIn delay={150} style={{ position: "absolute", left: "48%", bottom: 24, width: 116, height: 84 }}>
        <Px style={{ position: "absolute", left: 8, bottom: 0, width: 100, height: 84, backgroundColor: "#E8A94E" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 8, width: 116, height: 68, backgroundColor: "#E8A94E" }} />
        <Px style={{ position: "absolute", left: 12, bottom: 12, width: 92, height: 60, backgroundColor: "#A93226" }} />
        <Px style={{ position: "absolute", left: 20, bottom: 20, width: 12, height: 12, backgroundColor: "#2C2C33" }} />
        <Px style={{ position: "absolute", left: 52, bottom: 16, width: 12, height: 12, backgroundColor: "#2C2C33" }} />
        <Px style={{ position: "absolute", left: 84, bottom: 24, width: 12, height: 12, backgroundColor: "#2C2C33" }} />
        <Px style={{ position: "absolute", left: 36, bottom: 44, width: 12, height: 12, backgroundColor: "#2C2C33" }} />
        <Px style={{ position: "absolute", left: 28, bottom: 32, width: 8, height: 4, backgroundColor: "#6FBF73" }} />
        <Px style={{ position: "absolute", left: 68, bottom: 48, width: 8, height: 4, backgroundColor: "#6FBF73" }} />
        <Px style={{ position: "absolute", left: 48, bottom: 32, width: 20, height: 20, backgroundColor: "#FFF8E1" }} />
      </StepIn>
    </PixelSceneRoot>
  );
}

export function PixelTdPupusasScene() {
  // Pupusas on the comal, curtido and salsa bowls beside.
  return (
    <PixelSceneRoot base="#96613A">
      <StepIn delay={50} style={{ position: "absolute", left: "45%", bottom: 8, width: 164, height: 112 }}>
        <Px style={{ position: "absolute", left: 8, bottom: 0, width: 148, height: 112, backgroundColor: "#3A3A42" }} shadow />
        <Px style={{ position: "absolute", left: 0, bottom: 12, width: 164, height: 88, backgroundColor: "#3A3A42" }} />
        <Px style={{ position: "absolute", left: 16, bottom: 12, width: 132, height: 88, backgroundColor: "#45454E" }} />
      </StepIn>
      {[
        { left: "50%", bottom: 60 },
        { left: "64%", bottom: 20 },
        { left: "52%", bottom: 16 },
      ].map((p, idx) => (
        <StepIn key={idx} delay={140 + idx * 80} style={{ position: "absolute", left: p.left as `${number}%`, bottom: p.bottom, width: 60, height: 52 }}>
          <Px style={{ position: "absolute", left: 4, bottom: 0, width: 52, height: 52, backgroundColor: "#F2D8A7" }} />
          <Px style={{ position: "absolute", left: 0, bottom: 8, width: 60, height: 36, backgroundColor: "#F2D8A7" }} />
          <Px style={{ position: "absolute", left: 8, bottom: 8, width: 44, height: 36, backgroundColor: "#EFC477" }} />
          <Px style={{ position: "absolute", left: 20, bottom: 20, width: 20, height: 12, backgroundColor: "#E8BE6E" }} />
        </StepIn>
      ))}
      <StepIn delay={380} style={{ position: "absolute", left: "78%", bottom: 80, width: 44, height: 24 }}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 44, height: 16, backgroundColor: "#EDE6D8" }} />
        <Px style={{ position: "absolute", left: 4, bottom: 16, width: 36, height: 8, backgroundColor: "#E8E2D4" }} />
        <Px style={{ position: "absolute", left: 12, bottom: 16, width: 20, height: 4, backgroundColor: "#B565A7" }} />
      </StepIn>
      <StepIn delay={440} style={{ position: "absolute", left: "84%", bottom: 24, width: 36, height: 20 }}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 36, height: 12, backgroundColor: "#54382A" }} />
        <Px style={{ position: "absolute", left: 4, bottom: 12, width: 28, height: 8, backgroundColor: "#C0392B" }} />
      </StepIn>
    </PixelSceneRoot>
  );
}

export function PixelTdSteakScene() {
  // Steak on its iron, butter melting, board underneath.
  return (
    <PixelSceneRoot base="#4A2C2C">
      <StepIn delay={40} style={{ position: "absolute", left: "45%", bottom: 8, width: 168, height: 108 }}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 168, height: 108, backgroundColor: "#8A5A2B" }} shadow />
      </StepIn>
      <StepIn delay={120} style={{ position: "absolute", left: "48%", bottom: 24, width: 148, height: 76 }}>
        <Px style={{ position: "absolute", left: 8, bottom: 0, width: 132, height: 76, backgroundColor: "#2C2C33" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 8, width: 148, height: 60, backgroundColor: "#2C2C33" }} />
        <Px style={{ position: "absolute", left: 16, bottom: 12, width: 116, height: 52, backgroundColor: "#3A3A42" }} />
      </StepIn>
      <StepBob left="52%" bottom={36} width={104} height={56} distance={4}>
        <Px style={{ position: "absolute", left: 8, bottom: 0, width: 88, height: 56, backgroundColor: "#8A3324" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 8, width: 104, height: 40, backgroundColor: "#8A3324" }} />
        <Px style={{ position: "absolute", left: 12, bottom: 12, width: 80, height: 32, backgroundColor: "#A8541F" }} />
        <Px style={{ position: "absolute", left: 20, bottom: 16, width: 32, height: 4, backgroundColor: "#5D2015" }} />
        <Px style={{ position: "absolute", left: 28, bottom: 28, width: 32, height: 4, backgroundColor: "#5D2015" }} />
        <Px style={{ position: "absolute", left: 44, bottom: 40, width: 16, height: 12, backgroundColor: "#FFE9A8" }} />
        <Px style={{ position: "absolute", left: 8, bottom: 44, width: 28, height: 8, backgroundColor: "#3E7C43" }} />
      </StepBob>
      <Px style={{ position: "absolute", left: "82%", bottom: 88, width: 16, height: 16, backgroundColor: "#F2C14E" }} />
      <Px style={{ position: "absolute", left: "86%", bottom: 72, width: 12, height: 12, backgroundColor: "#E8B34B" }} />
      <StepBob left="60%" bottom={104} width={8} height={12} distance={4}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 8, height: 12, backgroundColor: "#FFFFFF", opacity: 0.4 }} />
      </StepBob>
    </PixelSceneRoot>
  );
}

export function PixelTdShawarmaRiceBarScene() {
  // A family-style shawarma board in pixels: sliced chicken on a
  // platter, rice and roasted peppers below, salad, hummus, crema,
  // feta and lemon set around for build-your-own bowls.
  return (
    <PixelSceneRoot base="#7A5230">
      <StepIn delay={40} style={{ position: "absolute", left: "44%", bottom: 8, width: 178, height: 108 }}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 178, height: 108, backgroundColor: "#96613A" }} shadow />
        <Px style={{ position: "absolute", left: 8, bottom: 8, width: 162, height: 92, backgroundColor: "#8A5A33" }} />
      </StepIn>
      <StepBob left="48%" bottom={68} width={126} height={48} distance={4}>
        <Px style={{ position: "absolute", left: 8, bottom: 0, width: 110, height: 44, backgroundColor: "#EDE6D8" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 8, width: 126, height: 28, backgroundColor: "#EDE6D8" }} />
        <Px style={{ position: "absolute", left: 12, bottom: 24, width: 28, height: 12, backgroundColor: "#B5713B" }} />
        <Px style={{ position: "absolute", left: 40, bottom: 28, width: 28, height: 12, backgroundColor: "#C07C42" }} />
        <Px style={{ position: "absolute", left: 68, bottom: 24, width: 28, height: 12, backgroundColor: "#B5713B" }} />
        <Px style={{ position: "absolute", left: 24, bottom: 8, width: 28, height: 12, backgroundColor: "#A96834" }} />
        <Px style={{ position: "absolute", left: 56, bottom: 8, width: 28, height: 12, backgroundColor: "#C07C42" }} />
        <Px style={{ position: "absolute", left: 20, bottom: 36, width: 8, height: 8, backgroundColor: "#FFFFFF" }} />
        <Px style={{ position: "absolute", left: 76, bottom: 36, width: 8, height: 8, backgroundColor: "#FFFFFF" }} />
        <Px style={{ position: "absolute", left: 100, bottom: 28, width: 8, height: 8, backgroundColor: "#FFFFFF" }} />
      </StepBob>
      <StepIn delay={220} style={{ position: "absolute", left: "49%", bottom: 16, width: 64, height: 44 }}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 64, height: 28, backgroundColor: "#4E342E" }} />
        <Px style={{ position: "absolute", left: 4, bottom: 24, width: 56, height: 16, backgroundColor: "#FFF8E1" }} />
        <Px style={{ position: "absolute", left: 16, bottom: 32, width: 8, height: 4, backgroundColor: "#E8C98A" }} />
        <Px style={{ position: "absolute", left: 32, bottom: 28, width: 8, height: 4, backgroundColor: "#E8C98A" }} />
        <Px style={{ position: "absolute", left: 44, bottom: 32, width: 8, height: 4, backgroundColor: "#E8C98A" }} />
      </StepIn>
      <StepIn delay={290} style={{ position: "absolute", left: "66%", bottom: 14, width: 60, height: 42 }}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 60, height: 28, backgroundColor: "#455A64" }} />
        <Px style={{ position: "absolute", left: 4, bottom: 24, width: 52, height: 16, backgroundColor: "#6D4C41" }} />
        <Px style={{ position: "absolute", left: 8, bottom: 24, width: 8, height: 20, backgroundColor: "#E53935" }} />
        <Px style={{ position: "absolute", left: 22, bottom: 24, width: 8, height: 20, backgroundColor: "#FB8C00" }} />
        <Px style={{ position: "absolute", left: 36, bottom: 24, width: 8, height: 20, backgroundColor: "#FDD835" }} />
        <Px style={{ position: "absolute", left: 48, bottom: 26, width: 6, height: 16, backgroundColor: "#B39DDB" }} />
      </StepIn>
      <StepIn delay={360} style={{ position: "absolute", left: "78%", bottom: 70, width: 56, height: 40 }}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 56, height: 24, backgroundColor: "#37474F" }} />
        <Px style={{ position: "absolute", left: 4, bottom: 20, width: 48, height: 16, backgroundColor: "#7CB342" }} />
        <Px style={{ position: "absolute", left: 8, bottom: 24, width: 12, height: 12, backgroundColor: "#A5D6A7" }} />
        <Px style={{ position: "absolute", left: 24, bottom: 26, width: 12, height: 12, backgroundColor: "#C5E1A5" }} />
        <Px style={{ position: "absolute", left: 40, bottom: 24, width: 10, height: 10, backgroundColor: "#A5D6A7" }} />
        <Px style={{ position: "absolute", left: 18, bottom: 20, width: 10, height: 10, backgroundColor: "#E53935" }} />
        <Px style={{ position: "absolute", left: 34, bottom: 20, width: 10, height: 10, backgroundColor: "#C62828" }} />
      </StepIn>
      <StepIn delay={420} style={{ position: "absolute", left: "45%", bottom: 76, width: 44, height: 34 }}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 44, height: 22, backgroundColor: "#8D6E63" }} />
        <Px style={{ position: "absolute", left: 4, bottom: 18, width: 36, height: 14, backgroundColor: "#E8D9B8" }} />
        <Px style={{ position: "absolute", left: 12, bottom: 22, width: 20, height: 8, backgroundColor: "#DCCBA6" }} />
      </StepIn>
      <StepIn delay={470} style={{ position: "absolute", left: "84%", bottom: 38, width: 36, height: 28 }}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 36, height: 18, backgroundColor: "#B0BEC5" }} />
        <Px style={{ position: "absolute", left: 4, bottom: 14, width: 28, height: 12, backgroundColor: "#FFFFFF" }} />
        <Px style={{ position: "absolute", left: 8, bottom: 20, width: 20, height: 4, backgroundColor: "#ECEFF1" }} />
      </StepIn>
      <Px style={{ position: "absolute", left: "90%", bottom: 14, width: 22, height: 22, backgroundColor: "#F7DC6F" }} />
      <Px style={{ position: "absolute", left: "91%", bottom: 17, width: 14, height: 14, backgroundColor: "#FBE98A" }} />
      <Px style={{ position: "absolute", left: "63%", bottom: 61, width: 7, height: 7, backgroundColor: "#FFFFFF" }} />
      <Px style={{ position: "absolute", left: "74%", bottom: 64, width: 7, height: 7, backgroundColor: "#FFFFFF" }} />
    </PixelSceneRoot>
  );
}

export function PixelTdRoastChickenScene() {
  // Golden bird on an oval platter, gravy boat standing by.
  return (
    <PixelSceneRoot base="#6E4A1F">
      <StepIn delay={40} style={{ position: "absolute", left: "45%", bottom: 8, width: 168, height: 108 }}>
        <Px style={{ position: "absolute", left: 8, bottom: 0, width: 152, height: 108, backgroundColor: "#EDE6D8" }} shadow />
        <Px style={{ position: "absolute", left: 0, bottom: 12, width: 168, height: 84, backgroundColor: "#EDE6D8" }} />
        <Px style={{ position: "absolute", left: 16, bottom: 16, width: 136, height: 76, backgroundColor: "#D8CBB2" }} />
        <Px style={{ position: "absolute", left: 20, bottom: 20, width: 128, height: 68, backgroundColor: "#EDE6D8" }} />
      </StepIn>
      <StepBob left="52%" bottom={28} width={104} height={80} distance={4}>
        <Px style={{ position: "absolute", left: 12, bottom: 0, width: 80, height: 68, backgroundColor: "#B57F24" }} />
        <Px style={{ position: "absolute", left: 4, bottom: 12, width: 96, height: 48, backgroundColor: "#B57F24" }} />
        <Px style={{ position: "absolute", left: 20, bottom: 12, width: 64, height: 44, backgroundColor: "#C98A2E" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 52, width: 16, height: 24, backgroundColor: "#A8711F" }} />
        <Px style={{ position: "absolute", left: 88, bottom: 52, width: 16, height: 24, backgroundColor: "#A8711F" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 72, width: 12, height: 8, backgroundColor: "#FFF8E1" }} />
        <Px style={{ position: "absolute", left: 92, bottom: 72, width: 12, height: 8, backgroundColor: "#FFF8E1" }} />
        <Px style={{ position: "absolute", left: 36, bottom: 28, width: 12, height: 4, backgroundColor: "#3E7C43" }} />
        <Px style={{ position: "absolute", left: 56, bottom: 40, width: 12, height: 4, backgroundColor: "#3E7C43" }} />
      </StepBob>
      <StepIn delay={280} style={{ position: "absolute", left: "46%", bottom: 20, width: 36, height: 24 }}>
        <Px style={{ position: "absolute", left: 4, bottom: 0, width: 28, height: 16, backgroundColor: "#FFFFFF" }} />
        <Px style={{ position: "absolute", left: 28, bottom: 8, width: 8, height: 8, backgroundColor: "#FFFFFF" }} />
        <Px style={{ position: "absolute", left: 8, bottom: 16, width: 20, height: 8, backgroundColor: "#8A5A33" }} />
      </StepIn>
      <Px style={{ position: "absolute", left: "84%", bottom: 28, width: 16, height: 16, backgroundColor: "#FFD54F" }} />
    </PixelSceneRoot>
  );
}

export function PixelTdMeatloafScene() {
  // Meatloaf out of its pan, slices fanned, mash on the side.
  return (
    <PixelSceneRoot base="#5D3A2E">
      <StepIn delay={40} style={{ position: "absolute", left: "46%", bottom: 12, width: 160, height: 104 }}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 160, height: 104, backgroundColor: "#96613A" }} shadow />
      </StepIn>
      <StepIn delay={130} style={{ position: "absolute", left: "50%", bottom: 48, width: 104, height: 56 }}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 104, height: 56, backgroundColor: "#8E8E9E" }} />
        <Px style={{ position: "absolute", left: 4, bottom: 8, width: 96, height: 28, backgroundColor: "#7A4A2B" }} />
        <Px style={{ position: "absolute", left: 4, bottom: 36, width: 96, height: 12, backgroundColor: "#B03A2E" }} />
        <Px style={{ position: "absolute", left: 4, bottom: 48, width: 96, height: 8, backgroundColor: "#7A4A2B" }} />
      </StepIn>
      {[0, 1].map((i) => (
        <StepIn key={i} delay={230 + i * 80} style={{ position: "absolute", left: `${52 + i * 13}%` as `${number}%`, bottom: 16, width: 56, height: 28 }}>
          <Px style={{ position: "absolute", left: 0, bottom: 0, width: 56, height: 28, backgroundColor: i ? "#96613A" : "#8A5A33" }} />
          <Px style={{ position: "absolute", left: 0, bottom: 20, width: 56, height: 8, backgroundColor: "#B03A2E" }} />
        </StepIn>
      ))}
      <StepIn delay={400} style={{ position: "absolute", left: "82%", bottom: 60, width: 40, height: 28 }}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 40, height: 16, backgroundColor: "#EDE6D8" }} />
        <Px style={{ position: "absolute", left: 4, bottom: 12, width: 32, height: 12, backgroundColor: "#FFF8E1" }} />
        <Px style={{ position: "absolute", left: 12, bottom: 20, width: 16, height: 8, backgroundColor: "#F4E9CE" }} />
      </StepIn>
      <Px style={{ position: "absolute", left: "58%", bottom: 108, width: 8, height: 8, backgroundColor: "#58A05C" }} />
      <Px style={{ position: "absolute", left: "66%", bottom: 108, width: 8, height: 8, backgroundColor: "#58A05C" }} />
      <Px style={{ position: "absolute", left: "74%", bottom: 108, width: 8, height: 8, backgroundColor: "#58A05C" }} />
    </PixelSceneRoot>
  );
}

export function PixelTdPotRoastScene() {
  // Pot roast in the Dutch oven, lid ajar, carrots and potatoes in.
  return (
    <PixelSceneRoot base="#54382A">
      <StepIn delay={130} style={{ position: "absolute", left: "44%", bottom: 96, width: 76, height: 32 }}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 76, height: 24, backgroundColor: "#22301F" }} />
        <Px style={{ position: "absolute", left: 28, bottom: 24, width: 20, height: 8, backgroundColor: "#14181E" }} />
      </StepIn>
      <StepIn delay={50} style={{ position: "absolute", left: "47%", bottom: 12, width: 148, height: 92 }}>
        <Px style={{ position: "absolute", left: 8, bottom: 0, width: 132, height: 12, backgroundColor: "#2C2C33" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 12, width: 148, height: 52, backgroundColor: "#2C2C33" }} shadow />
        <Px style={{ position: "absolute", left: 0, bottom: 64, width: 148, height: 16, backgroundColor: "#3A3A42" }} />
        <Px style={{ position: "absolute", left: 8, bottom: 56, width: 132, height: 16, backgroundColor: "#5D2015" }} />
      </StepIn>
      <Px style={{ position: "absolute", left: "53%", bottom: 76, width: 28, height: 20, backgroundColor: "#7A4A2B" }} />
      <Px style={{ position: "absolute", left: "66%", bottom: 80, width: 28, height: 20, backgroundColor: "#7A4A2B" }} />
      <Px style={{ position: "absolute", left: "58%", bottom: 92, width: 20, height: 8, backgroundColor: "#E8862D" }} />
      <Px style={{ position: "absolute", left: "72%", bottom: 92, width: 20, height: 16, backgroundColor: "#EFC477" }} />
      <Px style={{ position: "absolute", left: "56%", bottom: 88, width: 16, height: 16, backgroundColor: "#F2D8A7" }} />
      <StepBob left="64%" bottom={108} width={8} height={12} distance={4}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 8, height: 12, backgroundColor: "#FFFFFF", opacity: 0.4 }} />
      </StepBob>
    </PixelSceneRoot>
  );
}

export function PixelTdCasseroleScene() {
  // Casserole in its own dish on a trivet, cheese bubbling.
  return (
    <PixelSceneRoot base="#6B4A68">
      <Px style={{ position: "absolute", left: "52%", bottom: 12, width: 132, height: 8, backgroundColor: "#54382A" }} />
      <Px style={{ position: "absolute", left: "62%", bottom: 4, width: 8, height: 24, backgroundColor: "#54382A" }} />
      <StepIn delay={130} style={{ position: "absolute", left: "47%", bottom: 24, width: 152, height: 88 }}>
        <Px style={{ position: "absolute", left: 0, bottom: 28, width: 12, height: 20, backgroundColor: "#D8CBB2" }} />
        <Px style={{ position: "absolute", left: 140, bottom: 28, width: 12, height: 20, backgroundColor: "#D8CBB2" }} />
        <Px style={{ position: "absolute", left: 12, bottom: 0, width: 128, height: 88, backgroundColor: "#EDE6D8" }} shadow />
        <Px style={{ position: "absolute", left: 20, bottom: 8, width: 112, height: 72, backgroundColor: "#D98E32" }} />
        <Px style={{ position: "absolute", left: 28, bottom: 16, width: 96, height: 56, backgroundColor: "#E8A94E" }} />
        <Px style={{ position: "absolute", left: 36, bottom: 24, width: 16, height: 16, backgroundColor: "#F2C14E" }} />
        <Px style={{ position: "absolute", left: 68, bottom: 20, width: 16, height: 16, backgroundColor: "#C97B2D" }} />
        <Px style={{ position: "absolute", left: 96, bottom: 36, width: 16, height: 16, backgroundColor: "#F2C14E" }} />
        <Px style={{ position: "absolute", left: 52, bottom: 48, width: 12, height: 4, backgroundColor: "#8A5A2B" }} />
        <Px style={{ position: "absolute", left: 84, bottom: 56, width: 12, height: 4, backgroundColor: "#8A5A2B" }} />
      </StepIn>
      <StepBob left="60%" bottom={116} width={8} height={12} distance={4}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 8, height: 12, backgroundColor: "#FFFFFF", opacity: 0.4 }} />
      </StepBob>
    </PixelSceneRoot>
  );
}

export function PixelTdHotDogScene() {
  // Two dogs in a paper boat, mustard and ketchup on top.
  return (
    <PixelSceneRoot base="#3E6B8E">
      <StepIn delay={50} style={{ position: "absolute", left: "46%", bottom: 12, width: 160, height: 96 }}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 160, height: 96, backgroundColor: "#F7F2E4" }} shadow />
        <Px style={{ position: "absolute", left: 0, bottom: 76, width: 160, height: 20, backgroundColor: "#D64545" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 160, height: 16, backgroundColor: "#D64545" }} />
      </StepIn>
      <StepIn delay={150} style={{ position: "absolute", left: "49%", bottom: 56, width: 140, height: 36 }}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 140, height: 24, backgroundColor: "#F2D8A7" }} />
        <Px style={{ position: "absolute", left: 8, bottom: 8, width: 124, height: 12, backgroundColor: "#B03A2E" }} />
        <Px style={{ position: "absolute", left: 20, bottom: 16, width: 8, height: 4, backgroundColor: "#FFC531" }} />
        <Px style={{ position: "absolute", left: 44, bottom: 12, width: 8, height: 4, backgroundColor: "#FFC531" }} />
        <Px style={{ position: "absolute", left: 68, bottom: 16, width: 8, height: 4, backgroundColor: "#FFC531" }} />
        <Px style={{ position: "absolute", left: 92, bottom: 12, width: 8, height: 4, backgroundColor: "#FFC531" }} />
      </StepIn>
      <StepIn delay={240} style={{ position: "absolute", left: "49%", bottom: 20, width: 140, height: 36 }}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 140, height: 24, backgroundColor: "#F2D8A7" }} />
        <Px style={{ position: "absolute", left: 8, bottom: 8, width: 124, height: 12, backgroundColor: "#A93226" }} />
        <Px style={{ position: "absolute", left: 16, bottom: 16, width: 108, height: 4, backgroundColor: "#D64545" }} />
      </StepIn>
    </PixelSceneRoot>
  );
}

export function PixelTdNachosScene() {
  // Nachos mounded on a sheet pan, dips at the corners.
  return (
    <PixelSceneRoot base="#7A2E35">
      <StepIn delay={40} style={{ position: "absolute", left: "45%", bottom: 12, width: 168, height: 100 }}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 168, height: 100, backgroundColor: "#9AA0A8" }} shadow />
        <Px style={{ position: "absolute", left: 8, bottom: 8, width: 152, height: 84, backgroundColor: "#7E858D" }} />
      </StepIn>
      <StepIn delay={140} style={{ position: "absolute", left: "50%", bottom: 24, width: 128, height: 64 }}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 24, height: 20, backgroundColor: "#F2C14E" }} />
        <Px style={{ position: "absolute", left: 32, bottom: 4, width: 24, height: 20, backgroundColor: "#F2C14E" }} />
        <Px style={{ position: "absolute", left: 64, bottom: 0, width: 24, height: 20, backgroundColor: "#F2C14E" }} />
        <Px style={{ position: "absolute", left: 96, bottom: 8, width: 24, height: 20, backgroundColor: "#F2C14E" }} />
        <Px style={{ position: "absolute", left: 16, bottom: 28, width: 24, height: 20, backgroundColor: "#F2C14E" }} />
        <Px style={{ position: "absolute", left: 56, bottom: 32, width: 24, height: 20, backgroundColor: "#F2C14E" }} />
        <Px style={{ position: "absolute", left: 32, bottom: 16, width: 40, height: 28, backgroundColor: "#F5A623" }} />
        <Px style={{ position: "absolute", left: 52, bottom: 36, width: 24, height: 20, backgroundColor: "#FFC531" }} />
        <Px style={{ position: "absolute", left: 20, bottom: 20, width: 12, height: 12, backgroundColor: "#58A05C" }} />
        <Px style={{ position: "absolute", left: 88, bottom: 28, width: 12, height: 12, backgroundColor: "#3E7C43" }} />
      </StepIn>
      <StepIn delay={320} style={{ position: "absolute", left: "47%", bottom: 80, width: 32, height: 20 }}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 32, height: 12, backgroundColor: "#EDE6D8" }} />
        <Px style={{ position: "absolute", left: 4, bottom: 12, width: 24, height: 8, backgroundColor: "#D64545" }} />
      </StepIn>
      <StepIn delay={390} style={{ position: "absolute", left: "84%", bottom: 76, width: 32, height: 20 }}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 32, height: 12, backgroundColor: "#EDE6D8" }} />
        <Px style={{ position: "absolute", left: 4, bottom: 12, width: 24, height: 8, backgroundColor: "#FFF8E1" }} />
      </StepIn>
    </PixelSceneRoot>
  );
}

export function PixelTdQuesadillaScene() {
  // Wedges on a round board, cheese pulling, dips beside.
  return (
    <PixelSceneRoot base="#96613A">
      <StepIn delay={40} style={{ position: "absolute", left: "45%", bottom: 8, width: 160, height: 108 }}>
        <Px style={{ position: "absolute", left: 8, bottom: 0, width: 144, height: 108, backgroundColor: "#B07D4F" }} shadow />
        <Px style={{ position: "absolute", left: 0, bottom: 12, width: 160, height: 84, backgroundColor: "#B07D4F" }} />
        <Px style={{ position: "absolute", left: 16, bottom: 12, width: 128, height: 84, backgroundColor: "#96613A" }} />
      </StepIn>
      <StepIn delay={140} style={{ position: "absolute", left: "49%", bottom: 24, width: 112, height: 80 }}>
        <Px style={{ position: "absolute", left: 8, bottom: 0, width: 96, height: 80, backgroundColor: "#F2D8A7" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 8, width: 112, height: 64, backgroundColor: "#F2D8A7" }} />
        <Px style={{ position: "absolute", left: 8, bottom: 8, width: 48, height: 64, backgroundColor: "#EFC477" }} />
        <Px style={{ position: "absolute", left: 16, bottom: 16, width: 72, height: 4, backgroundColor: "#D9A93B" }} />
        <Px style={{ position: "absolute", left: 16, bottom: 36, width: 72, height: 4, backgroundColor: "#D9A93B" }} />
        <Px style={{ position: "absolute", left: 16, bottom: 56, width: 72, height: 4, backgroundColor: "#D9A93B" }} />
      </StepIn>
      <StepIn delay={240} style={{ position: "absolute", left: "68%", bottom: 12, width: 56, height: 40 }}>
        <Px style={{ position: "absolute", left: 4, bottom: 0, width: 48, height: 40, backgroundColor: "#F2D8A7" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 8, width: 56, height: 24, backgroundColor: "#F2D8A7" }} />
        <Px style={{ position: "absolute", left: 4, bottom: 28, width: 20, height: 8, backgroundColor: "#FFC531" }} />
      </StepIn>
      <StepIn delay={330} style={{ position: "absolute", left: "84%", bottom: 84, width: 32, height: 20 }}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 32, height: 12, backgroundColor: "#EDE6D8" }} />
        <Px style={{ position: "absolute", left: 4, bottom: 12, width: 24, height: 8, backgroundColor: "#58A05C" }} />
      </StepIn>
      <StepIn delay={390} style={{ position: "absolute", left: "47%", bottom: 88, width: 32, height: 20 }}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 32, height: 12, backgroundColor: "#EDE6D8" }} />
        <Px style={{ position: "absolute", left: 4, bottom: 12, width: 24, height: 8, backgroundColor: "#FFF8E1" }} />
      </StepIn>
    </PixelSceneRoot>
  );
}

export function PixelTdHotWingsScene() {
  // Wings in a lined basket, celery and carrots, ranch dip.
  return (
    <PixelSceneRoot base="#5D2015">
      <StepIn delay={130} style={{ position: "absolute", left: "49%", bottom: 64, width: 116, height: 32 }}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 28, height: 32, backgroundColor: "#FFFFFF" }} />
        <Px style={{ position: "absolute", left: 28, bottom: 0, width: 28, height: 32, backgroundColor: "#F7F2E4" }} />
        <Px style={{ position: "absolute", left: 56, bottom: 0, width: 28, height: 32, backgroundColor: "#FFFFFF" }} />
        <Px style={{ position: "absolute", left: 84, bottom: 0, width: 32, height: 32, backgroundColor: "#F7F2E4" }} />
      </StepIn>
      <StepIn delay={200} style={{ position: "absolute", left: "51%", bottom: 64, width: 116, height: 44 }}>
        <Px style={{ position: "absolute", left: 0, bottom: 20, width: 28, height: 16, backgroundColor: "#C0392B" }} />
        <Px style={{ position: "absolute", left: 36, bottom: 24, width: 28, height: 16, backgroundColor: "#A93226" }} />
        <Px style={{ position: "absolute", left: 72, bottom: 20, width: 28, height: 16, backgroundColor: "#C0392B" }} />
        <Px style={{ position: "absolute", left: 20, bottom: 0, width: 28, height: 16, backgroundColor: "#A93226" }} />
        <Px style={{ position: "absolute", left: 56, bottom: 4, width: 28, height: 16, backgroundColor: "#C0392B" }} />
      </StepIn>
      <StepIn delay={40} style={{ position: "absolute", left: "47%", bottom: 12, width: 124, height: 52 }}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 124, height: 44, backgroundColor: "#B03A2E" }} shadow />
        <Px style={{ position: "absolute", left: 0, bottom: 36, width: 124, height: 8, backgroundColor: "#8E2A20" }} />
        <Px style={{ position: "absolute", left: 12, bottom: 8, width: 8, height: 28, backgroundColor: "#8E2A20" }} />
        <Px style={{ position: "absolute", left: 36, bottom: 8, width: 8, height: 28, backgroundColor: "#8E2A20" }} />
        <Px style={{ position: "absolute", left: 60, bottom: 8, width: 8, height: 28, backgroundColor: "#8E2A20" }} />
        <Px style={{ position: "absolute", left: 84, bottom: 8, width: 8, height: 28, backgroundColor: "#8E2A20" }} />
        <Px style={{ position: "absolute", left: 104, bottom: 8, width: 8, height: 28, backgroundColor: "#8E2A20" }} />
      </StepIn>
      <Px style={{ position: "absolute", left: "50%", bottom: 76, width: 32, height: 8, backgroundColor: "#A8C686" }} />
      <Px style={{ position: "absolute", left: "58%", bottom: 88, width: 28, height: 8, backgroundColor: "#E8862D" }} />
      <StepIn delay={420} style={{ position: "absolute", left: "84%", bottom: 28, width: 32, height: 20 }}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 32, height: 12, backgroundColor: "#FFFFFF" }} />
        <Px style={{ position: "absolute", left: 4, bottom: 12, width: 24, height: 8, backgroundColor: "#F7E8C9" }} />
      </StepIn>
    </PixelSceneRoot>
  );
}

export function PixelTdRamenScene() {
  // Footed ramen bowl, chopsticks resting, steam up.
  return (
    <PixelSceneRoot base="#37424E">
      <StepIn delay={50} style={{ position: "absolute", left: "46%", bottom: 12, width: 152, height: 92 }}>
        <Px style={{ position: "absolute", left: 56, bottom: 0, width: 40, height: 8, backgroundColor: "#22301F" }} />
        <Px style={{ position: "absolute", left: 16, bottom: 8, width: 120, height: 16, backgroundColor: "#2C2C33" }} />
        <Px style={{ position: "absolute", left: 8, bottom: 24, width: 136, height: 28, backgroundColor: "#2C2C33" }} shadow />
        <Px style={{ position: "absolute", left: 8, bottom: 52, width: 136, height: 16, backgroundColor: "#A93226" }} />
        <Px style={{ position: "absolute", left: 16, bottom: 60, width: 120, height: 12, backgroundColor: "#F2C14E" }} />
      </StepIn>
      <StepIn delay={140} style={{ position: "absolute", left: "52%", bottom: 72, width: 120, height: 28 }}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 20, height: 20, backgroundColor: "#EFC95C" }} />
        <Px style={{ position: "absolute", left: 4, bottom: 4, width: 12, height: 12, backgroundColor: "#F7DC6F" }} />
        <Px style={{ position: "absolute", left: 32, bottom: 4, width: 20, height: 20, backgroundColor: "#EFC95C" }} />
        <Px style={{ position: "absolute", left: 64, bottom: 0, width: 20, height: 20, backgroundColor: "#F7DC6F" }} />
        <Px style={{ position: "absolute", left: 92, bottom: 4, width: 20, height: 20, backgroundColor: "#FFF8E1" }} />
        <Px style={{ position: "absolute", left: 96, bottom: 8, width: 12, height: 12, backgroundColor: "#FFB300" }} />
      </StepIn>
      <Px style={{ position: "absolute", left: "52%", bottom: 88, width: 16, height: 24, backgroundColor: "#22301F" }} />
      <Px style={{ position: "absolute", left: "80%", bottom: 72, width: 20, height: 8, backgroundColor: "#E86A92" }} />
      <StepIn delay={300} style={{ position: "absolute", left: "56%", bottom: 96, width: 84, height: 12 }}>
        <Px style={{ position: "absolute", left: 0, bottom: 8, width: 84, height: 4, backgroundColor: "#8A5A2B" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 84, height: 4, backgroundColor: "#96613A" }} />
      </StepIn>
      <StepBob left="63%" bottom={108} width={12} height={16} distance={4}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 12, height: 16, backgroundColor: "#FFFFFF", opacity: 0.45 }} />
      </StepBob>
    </PixelSceneRoot>
  );
}

export function PixelTdStirFryScene() {
  // Stir-fry in the wok, still on the burner ring.
  return (
    <PixelSceneRoot base="#4A3A2E">
      <StepIn delay={40} style={{ position: "absolute", left: "52%", bottom: 12, width: 104, height: 16 }}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 104, height: 4, backgroundColor: "#2C2C33" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 12, width: 104, height: 4, backgroundColor: "#2C2C33" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 4, height: 16, backgroundColor: "#2C2C33" }} />
        <Px style={{ position: "absolute", left: 100, bottom: 0, width: 4, height: 16, backgroundColor: "#2C2C33" }} />
      </StepIn>
      <StepIn delay={120} style={{ position: "absolute", left: "45%", bottom: 24, width: 156, height: 76 }}>
        <Px style={{ position: "absolute", left: 0, bottom: 36, width: 16, height: 8, backgroundColor: "#2C2C33" }} />
        <Px style={{ position: "absolute", left: 140, bottom: 36, width: 16, height: 8, backgroundColor: "#2C2C33" }} />
        <Px style={{ position: "absolute", left: 20, bottom: 0, width: 116, height: 12, backgroundColor: "#3A3A42" }} />
        <Px style={{ position: "absolute", left: 12, bottom: 12, width: 132, height: 24, backgroundColor: "#3A3A42" }} shadow />
        <Px style={{ position: "absolute", left: 12, bottom: 36, width: 132, height: 16, backgroundColor: "#54382A" }} />
      </StepIn>
      <StepIn delay={200} style={{ position: "absolute", left: "51%", bottom: 72, width: 124, height: 36 }}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 20, height: 8, backgroundColor: "#D64545" }} />
        <Px style={{ position: "absolute", left: 28, bottom: 4, width: 20, height: 8, backgroundColor: "#58A05C" }} />
        <Px style={{ position: "absolute", left: 56, bottom: 0, width: 20, height: 8, backgroundColor: "#E8862D" }} />
        <Px style={{ position: "absolute", left: 84, bottom: 8, width: 20, height: 8, backgroundColor: "#F2C14E" }} />
        <Px style={{ position: "absolute", left: 16, bottom: 16, width: 16, height: 8, backgroundColor: "#C9A06A" }} />
        <Px style={{ position: "absolute", left: 48, bottom: 20, width: 16, height: 8, backgroundColor: "#C9A06A" }} />
        <Px style={{ position: "absolute", left: 80, bottom: 20, width: 16, height: 8, backgroundColor: "#C9A06A" }} />
        <Px style={{ position: "absolute", left: 104, bottom: 16, width: 8, height: 8, backgroundColor: "#FFF8E1" }} />
      </StepIn>
      <StepBob left="62%" bottom={108} width={8} height={12} distance={4}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 8, height: 12, backgroundColor: "#FFFFFF", opacity: 0.4 }} />
      </StepBob>
    </PixelSceneRoot>
  );
}

export function PixelTdRisottoScene() {
  // Bowl of creamy risotto: ladle swirl, crispy bacon, roasted
  // mushrooms, scallion greens and Parmesan — spoon at the side.
  return (
    <PixelSceneRoot base="#7A5230">
      <StepIn delay={40} style={{ position: "absolute", left: "46%", bottom: 12, width: 152, height: 100 }}>
        <Px style={{ position: "absolute", left: 8, bottom: 0, width: 136, height: 100, backgroundColor: "#546E7A" }} shadow />
        <Px style={{ position: "absolute", left: 0, bottom: 12, width: 152, height: 76, backgroundColor: "#546E7A" }} />
        <Px style={{ position: "absolute", left: 16, bottom: 16, width: 120, height: 68, backgroundColor: "#78909C" }} />
        <Px style={{ position: "absolute", left: 20, bottom: 20, width: 112, height: 60, backgroundColor: "#546E7A" }} />
      </StepIn>
      <StepBob left="52%" bottom={32} width={108} height={64} distance={4}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 108, height: 20, backgroundColor: "#F2DCAC" }} />
        <Px style={{ position: "absolute", left: 8, bottom: 20, width: 92, height: 20, backgroundColor: "#F7E8C9" }} />
        <Px style={{ position: "absolute", left: 28, bottom: 40, width: 52, height: 20, backgroundColor: "#FCF2D8" }} />
        <Px style={{ position: "absolute", left: 16, bottom: 16, width: 16, height: 8, backgroundColor: "#B98A4E" }} />
        <Px style={{ position: "absolute", left: 76, bottom: 12, width: 16, height: 8, backgroundColor: "#B98A4E" }} />
        <Px style={{ position: "absolute", left: 44, bottom: 44, width: 12, height: 8, backgroundColor: "#B03A2E" }} />
        <Px style={{ position: "absolute", left: 84, bottom: 36, width: 12, height: 8, backgroundColor: "#A93226" }} />
        <Px style={{ position: "absolute", left: 24, bottom: 36, width: 8, height: 8, backgroundColor: "#58A05C" }} />
        <Px style={{ position: "absolute", left: 64, bottom: 24, width: 8, height: 8, backgroundColor: "#58A05C" }} />
        <Px style={{ position: "absolute", left: 52, bottom: 8, width: 16, height: 4, backgroundColor: "#FFFDF4" }} />
      </StepBob>
      <Px style={{ position: "absolute", left: "50%", bottom: 20, width: 20, height: 12, backgroundColor: "#C0C6CE" }} />
      <Px style={{ position: "absolute", left: "54%", bottom: 24, width: 20, height: 4, backgroundColor: "#C0C6CE" }} />
    </PixelSceneRoot>
  );
}

export function PixelTdFriedRiceScene() {
  // Dome of fried rice on a plate, spoon and soy at the side.
  return (
    <PixelSceneRoot base="#7A5230">
      <StepIn delay={40} style={{ position: "absolute", left: "46%", bottom: 12, width: 152, height: 100 }}>
        <Px style={{ position: "absolute", left: 8, bottom: 0, width: 136, height: 100, backgroundColor: "#EDE6D8" }} shadow />
        <Px style={{ position: "absolute", left: 0, bottom: 12, width: 152, height: 76, backgroundColor: "#EDE6D8" }} />
        <Px style={{ position: "absolute", left: 16, bottom: 16, width: 120, height: 68, backgroundColor: "#D8CBB2" }} />
        <Px style={{ position: "absolute", left: 20, bottom: 20, width: 112, height: 60, backgroundColor: "#EDE6D8" }} />
      </StepIn>
      <StepBob left="52%" bottom={32} width={108} height={64} distance={4}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 108, height: 20, backgroundColor: "#F7E8C9" }} />
        <Px style={{ position: "absolute", left: 8, bottom: 20, width: 92, height: 20, backgroundColor: "#F7E8C9" }} />
        <Px style={{ position: "absolute", left: 20, bottom: 40, width: 68, height: 20, backgroundColor: "#F2DCAC" }} />
        <Px style={{ position: "absolute", left: 16, bottom: 12, width: 8, height: 8, backgroundColor: "#58A05C" }} />
        <Px style={{ position: "absolute", left: 44, bottom: 8, width: 8, height: 8, backgroundColor: "#E8862D" }} />
        <Px style={{ position: "absolute", left: 72, bottom: 16, width: 8, height: 8, backgroundColor: "#F7DC6F" }} />
        <Px style={{ position: "absolute", left: 40, bottom: 32, width: 28, height: 16, backgroundColor: "#FFF3D6" }} />
      </StepBob>
      <Px style={{ position: "absolute", left: "50%", bottom: 20, width: 20, height: 12, backgroundColor: "#C0C6CE" }} />
      <Px style={{ position: "absolute", left: "54%", bottom: 24, width: 20, height: 4, backgroundColor: "#C0C6CE" }} />
      <StepIn delay={340} style={{ position: "absolute", left: "85%", bottom: 20, width: 28, height: 16 }}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 28, height: 12, backgroundColor: "#54382A" }} />
        <Px style={{ position: "absolute", left: 4, bottom: 8, width: 20, height: 8, backgroundColor: "#3A2415" }} />
      </StepIn>
    </PixelSceneRoot>
  );
}

export function PixelTdOatmealScene() {
  // Oatmeal in an enamel bowl, honey and berries, spoon in it.
  return (
    <PixelSceneRoot base="#8A7A5B">
      <StepIn delay={50} style={{ position: "absolute", left: "46%", bottom: 16, width: 148, height: 84 }}>
        <Px style={{ position: "absolute", left: 16, bottom: 0, width: 116, height: 12, backgroundColor: "#FFFFFF" }} />
        <Px style={{ position: "absolute", left: 8, bottom: 12, width: 132, height: 24, backgroundColor: "#FFFFFF" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 36, width: 148, height: 24, backgroundColor: "#FFFFFF" }} shadow />
        <Px style={{ position: "absolute", left: 0, bottom: 60, width: 148, height: 16, backgroundColor: "#3E5C8A" }} />
        <Px style={{ position: "absolute", left: 12, bottom: 48, width: 124, height: 16, backgroundColor: "#E8DCC2" }} />
        <Px style={{ position: "absolute", left: 20, bottom: 44, width: 108, height: 12, backgroundColor: "#DCCBA6" }} />
      </StepIn>
      <Px style={{ position: "absolute", left: "57%", bottom: 68, width: 16, height: 16, backgroundColor: "#3E5C8A" }} />
      <Px style={{ position: "absolute", left: "66%", bottom: 60, width: 16, height: 16, backgroundColor: "#5B7FB8" }} />
      <Px style={{ position: "absolute", left: "62%", bottom: 80, width: 12, height: 12, backgroundColor: "#A93226" }} />
      <Px style={{ position: "absolute", left: "74%", bottom: 72, width: 12, height: 12, backgroundColor: "#3E5C8A" }} />
      <Px style={{ position: "absolute", left: "55%", bottom: 60, width: 28, height: 8, backgroundColor: "#F5A623" }} />
      <Px style={{ position: "absolute", left: "78%", bottom: 64, width: 8, height: 52, backgroundColor: "#C0C6CE" }} />
    </PixelSceneRoot>
  );
}

export function PixelTdCerealScene() {
  // Cereal in a bright bowl, milk bottle beside it.
  return (
    <PixelSceneRoot base="#5B8A9A">
      <StepIn delay={50} style={{ position: "absolute", left: "47%", bottom: 16, width: 144, height: 84 }}>
        <Px style={{ position: "absolute", left: 16, bottom: 0, width: 112, height: 12, backgroundColor: "#E86A92" }} />
        <Px style={{ position: "absolute", left: 8, bottom: 12, width: 128, height: 24, backgroundColor: "#E86A92" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 36, width: 144, height: 24, backgroundColor: "#E86A92" }} shadow />
        <Px style={{ position: "absolute", left: 0, bottom: 60, width: 144, height: 16, backgroundColor: "#C94F78" }} />
        <Px style={{ position: "absolute", left: 8, bottom: 52, width: 128, height: 12, backgroundColor: "#FDFBF5" }} />
      </StepIn>
      <StepIn delay={140} style={{ position: "absolute", left: "52%", bottom: 68, width: 120, height: 28 }}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 12, height: 12, backgroundColor: "#C98A2E" }} />
        <Px style={{ position: "absolute", left: 4, bottom: 4, width: 4, height: 4, backgroundColor: "#E8B34B" }} />
        <Px style={{ position: "absolute", left: 28, bottom: 8, width: 12, height: 12, backgroundColor: "#C98A2E" }} />
        <Px style={{ position: "absolute", left: 56, bottom: 0, width: 12, height: 12, backgroundColor: "#E8B34B" }} />
        <Px style={{ position: "absolute", left: 84, bottom: 8, width: 12, height: 12, backgroundColor: "#C98A2E" }} />
        <Px style={{ position: "absolute", left: 40, bottom: 16, width: 12, height: 12, backgroundColor: "#E86A92" }} />
        <Px style={{ position: "absolute", left: 72, bottom: 16, width: 12, height: 12, backgroundColor: "#7FB3D5" }} />
      </StepIn>
      <StepIn delay={240} style={{ position: "absolute", left: "85%", bottom: 16, width: 32, height: 68 }}>
        <Px style={{ position: "absolute", left: 4, bottom: 0, width: 24, height: 44, backgroundColor: "#FDFBF5" }} />
        <Px style={{ position: "absolute", left: 8, bottom: 44, width: 16, height: 12, backgroundColor: "#FDFBF5" }} />
        <Px style={{ position: "absolute", left: 8, bottom: 56, width: 16, height: 8, backgroundColor: "#D64545" }} />
        <Px style={{ position: "absolute", left: 8, bottom: 16, width: 16, height: 20, backgroundColor: "#7FB3D5" }} />
      </StepIn>
      <Px style={{ position: "absolute", left: "50%", bottom: 24, width: 20, height: 12, backgroundColor: "#C0C6CE" }} />
      <Px style={{ position: "absolute", left: "54%", bottom: 28, width: 16, height: 4, backgroundColor: "#C0C6CE" }} />
    </PixelSceneRoot>
  );
}

export function PixelRestTacoScene() {
  // Big taco front view, lime and salsa bowl, sun overhead.
  return (
    <PixelSceneRoot base="#E4572E">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "26%", backgroundColor: "#C2451F" }} />
      <StepIn delay={50} style={{ position: "absolute", left: "52%", bottom: 28, width: 124, height: 68 }}>
        <Px style={{ position: "absolute", left: 16, bottom: 0, width: 92, height: 12, backgroundColor: "#F2C14E" }} />
        <Px style={{ position: "absolute", left: 8, bottom: 12, width: 108, height: 16, backgroundColor: "#F2C14E" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 28, width: 124, height: 20, backgroundColor: "#F2C14E" }} shadow />
        <Px style={{ position: "absolute", left: 8, bottom: 48, width: 108, height: 12, backgroundColor: "#E8B34B" }} />
        <Px style={{ position: "absolute", left: 20, bottom: 52, width: 16, height: 16, backgroundColor: "#7A4A2B" }} />
        <Px style={{ position: "absolute", left: 48, bottom: 56, width: 16, height: 16, backgroundColor: "#58A05C" }} />
        <Px style={{ position: "absolute", left: 76, bottom: 52, width: 16, height: 16, backgroundColor: "#D64545" }} />
        <Px style={{ position: "absolute", left: 36, bottom: 60, width: 12, height: 8, backgroundColor: "#FFF8E1" }} />
      </StepIn>
      <Px style={{ position: "absolute", left: "46%", bottom: 16, width: 16, height: 16, backgroundColor: "#7FB069" }} />
      <Px style={{ position: "absolute", left: "88%", bottom: 16, width: 24, height: 16, backgroundColor: "#A93226" }} />
      <Px style={{ position: "absolute", left: "89%", bottom: 20, width: 16, height: 8, backgroundColor: "#C0392B" }} />
      <PxSun left="88%" bottom={112} size={24} color="#FFD94D" core="#FFE98A" ray="#FFC531" />
    </PixelSceneRoot>
  );
}

export function PixelRestSandwichScene() {
  // Stacked sub on a plate, chips and a pickle.
  return (
    <PixelSceneRoot base="#3E7CB1">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "26%", backgroundColor: "#2F6391" }} />
      <StepIn delay={50} style={{ position: "absolute", left: "50%", bottom: 20, width: 132, height: 84 }}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 132, height: 16, backgroundColor: "#FFF8E1" }} shadow />
        <Px style={{ position: "absolute", left: 8, bottom: 20, width: 116, height: 12, backgroundColor: "#EFC477" }} />
        <Px style={{ position: "absolute", left: 8, bottom: 32, width: 116, height: 8, backgroundColor: "#D64545" }} />
        <Px style={{ position: "absolute", left: 8, bottom: 40, width: 116, height: 8, backgroundColor: "#58A05C" }} />
        <Px style={{ position: "absolute", left: 8, bottom: 48, width: 116, height: 16, backgroundColor: "#F2D8A7" }} />
        <Px style={{ position: "absolute", left: 16, bottom: 64, width: 100, height: 12, backgroundColor: "#F2D8A7" }} />
      </StepIn>
      <Px style={{ position: "absolute", left: "48%", bottom: 56, width: 16, height: 12, backgroundColor: "#F2C14E" }} />
      <Px style={{ position: "absolute", left: "46%", bottom: 68, width: 16, height: 12, backgroundColor: "#E8B34B" }} />
      <Px style={{ position: "absolute", left: "90%", bottom: 48, width: 16, height: 16, backgroundColor: "#7FB069" }} />
    </PixelSceneRoot>
  );
}

export function PixelRestPizzaScene() {
  // One big slice on a plate, cheese pull below.
  return (
    <PixelSceneRoot base="#A93226">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "24%", backgroundColor: "#86281D" }} />
      <StepIn delay={50} style={{ position: "absolute", left: "50%", bottom: 12, width: 136, height: 112 }}>
        <Px style={{ position: "absolute", left: 8, bottom: 0, width: 120, height: 112, backgroundColor: "#EDE6D8" }} shadow />
        <Px style={{ position: "absolute", left: 0, bottom: 12, width: 136, height: 88, backgroundColor: "#EDE6D8" }} />
      </StepIn>
      <StepBob left="60%" bottom={28} width={68} height={84} distance={4}>
        <Px style={{ position: "absolute", left: 24, bottom: 0, width: 20, height: 16, backgroundColor: "#F2B53A" }} />
        <Px style={{ position: "absolute", left: 16, bottom: 16, width: 36, height: 20, backgroundColor: "#F2B53A" }} />
        <Px style={{ position: "absolute", left: 8, bottom: 36, width: 52, height: 20, backgroundColor: "#F2B53A" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 56, width: 68, height: 16, backgroundColor: "#E8A94E" }} />
        <Px style={{ position: "absolute", left: 28, bottom: 24, width: 16, height: 16, backgroundColor: "#B03A2E" }} />
        <Px style={{ position: "absolute", left: 16, bottom: 44, width: 16, height: 16, backgroundColor: "#B03A2E" }} />
        <Px style={{ position: "absolute", left: 44, bottom: 40, width: 8, height: 8, backgroundColor: "#3E7C43" }} />
      </StepBob>
      <Px style={{ position: "absolute", left: "66%", bottom: 16, width: 8, height: 20, backgroundColor: "#F5C86B" }} />
    </PixelSceneRoot>
  );
}

export function PixelRestChickenScene() {
  // Bucket of chicken, drumsticks peeking out, slaw beside.
  return (
    <PixelSceneRoot base="#D98E32">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "26%", backgroundColor: "#B56F1F" }} />
      <StepIn delay={50} style={{ position: "absolute", left: "56%", bottom: 16, width: 80, height: 88 }}>
        <Px style={{ position: "absolute", left: 8, bottom: 64, width: 16, height: 24, backgroundColor: "#B57F24" }} />
        <Px style={{ position: "absolute", left: 32, bottom: 68, width: 16, height: 24, backgroundColor: "#C98A2E" }} />
        <Px style={{ position: "absolute", left: 56, bottom: 64, width: 16, height: 24, backgroundColor: "#A8711F" }} />
        <Px style={{ position: "absolute", left: 12, bottom: 84, width: 8, height: 4, backgroundColor: "#FFF8E1" }} />
        <Px style={{ position: "absolute", left: 36, bottom: 88, width: 8, height: 4, backgroundColor: "#FFF8E1" }} />
        <Px style={{ position: "absolute", left: 60, bottom: 84, width: 8, height: 4, backgroundColor: "#FFF8E1" }} />
        <Px style={{ position: "absolute", left: 4, bottom: 0, width: 72, height: 64, backgroundColor: "#FFFFFF" }} shadow />
        <Px style={{ position: "absolute", left: 0, bottom: 8, width: 80, height: 48, backgroundColor: "#FFFFFF" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 44, width: 80, height: 8, backgroundColor: "#D64545" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 24, width: 80, height: 8, backgroundColor: "#D64545" }} />
      </StepIn>
      <Px style={{ position: "absolute", left: "46%", bottom: 16, width: 28, height: 20, backgroundColor: "#FFFFFF" }} />
      <Px style={{ position: "absolute", left: "47%", bottom: 24, width: 20, height: 12, backgroundColor: "#A8C686" }} />
      <Px style={{ position: "absolute", left: "88%", bottom: 16, width: 24, height: 16, backgroundColor: "#FFF8E1" }} />
    </PixelSceneRoot>
  );
}

export function PixelRestDonutScene() {
  // Open box of donuts, one hero donut floating above.
  return (
    <PixelSceneRoot base="#F2A7C3">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "24%", backgroundColor: "#D982A6" }} />
      <StepIn delay={50} style={{ position: "absolute", left: "48%", bottom: 16, width: 144, height: 60 }}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 144, height: 44, backgroundColor: "#FFFFFF" }} shadow />
        <Px style={{ position: "absolute", left: 0, bottom: 44, width: 144, height: 12, backgroundColor: "#F6C6D8" }} />
        <Px style={{ position: "absolute", left: 12, bottom: 12, width: 32, height: 32, backgroundColor: "#E8A94E" }} />
        <Px style={{ position: "absolute", left: 20, bottom: 20, width: 16, height: 16, backgroundColor: "#F2A7C3" }} />
        <Px style={{ position: "absolute", left: 56, bottom: 12, width: 32, height: 32, backgroundColor: "#7A4A2B" }} />
        <Px style={{ position: "absolute", left: 64, bottom: 20, width: 16, height: 16, backgroundColor: "#F2A7C3" }} />
        <Px style={{ position: "absolute", left: 60, bottom: 36, width: 8, height: 4, backgroundColor: "#FFC531" }} />
        <Px style={{ position: "absolute", left: 72, bottom: 28, width: 8, height: 4, backgroundColor: "#7FB3D5" }} />
        <Px style={{ position: "absolute", left: 100, bottom: 12, width: 32, height: 32, backgroundColor: "#F6C6D8" }} />
        <Px style={{ position: "absolute", left: 108, bottom: 20, width: 16, height: 16, backgroundColor: "#F2A7C3" }} />
      </StepIn>
      <StepBob left="62%" bottom={88} width={44} height={44} distance={4}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 44, height: 44, backgroundColor: "#E86A92" }} shadow />
        <Px style={{ position: "absolute", left: 16, bottom: 16, width: 12, height: 12, backgroundColor: "#F2A7C3" }} />
        <Px style={{ position: "absolute", left: 8, bottom: 32, width: 8, height: 4, backgroundColor: "#FFFFFF" }} />
        <Px style={{ position: "absolute", left: 28, bottom: 8, width: 8, height: 4, backgroundColor: "#FFC531" }} />
      </StepBob>
    </PixelSceneRoot>
  );
}

export function PixelRestCoffeeScene() {
  // Takeaway cup with sleeve, beans scattered, steam up.
  return (
    <PixelSceneRoot base="#6B4A3A">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "26%", backgroundColor: "#54382A" }} />
      <StepIn delay={50} style={{ position: "absolute", left: "58%", bottom: 20, width: 56, height: 92 }}>
        <Px style={{ position: "absolute", left: 4, bottom: 0, width: 48, height: 72, backgroundColor: "#FFFFFF" }} shadow />
        <Px style={{ position: "absolute", left: 0, bottom: 72, width: 56, height: 12, backgroundColor: "#3E7C43" }} />
        <Px style={{ position: "absolute", left: 4, bottom: 28, width: 48, height: 20, backgroundColor: "#3E7C43" }} />
        <Px style={{ position: "absolute", left: 20, bottom: 32, width: 16, height: 12, backgroundColor: "#FFFFFF" }} />
      </StepIn>
      <Px style={{ position: "absolute", left: "50%", bottom: 20, width: 12, height: 12, backgroundColor: "#4A3220" }} />
      <Px style={{ position: "absolute", left: "53%", bottom: 36, width: 12, height: 12, backgroundColor: "#5D4037" }} />
      <Px style={{ position: "absolute", left: "86%", bottom: 24, width: 12, height: 12, backgroundColor: "#4A3220" }} />
      <StepBob left="64%" bottom={116} width={12} height={16} distance={4}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 12, height: 16, backgroundColor: "#FFFFFF", opacity: 0.6 }} />
      </StepBob>
      <StepBob left="70%" bottom={120} width={8} height={12} distance={4} delay={300}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 8, height: 12, backgroundColor: "#FFFFFF", opacity: 0.45 }} />
      </StepBob>
    </PixelSceneRoot>
  );
}

export function PixelRestSushiScene() {
  // Maki and nigiri on a board, chopsticks above.
  return (
    <PixelSceneRoot base="#37424E">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "24%", backgroundColor: "#28313A" }} />
      <StepIn delay={50} style={{ position: "absolute", left: "48%", bottom: 20, width: 144, height: 60 }}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 144, height: 52, backgroundColor: "#B07D4F" }} shadow />
        <Px style={{ position: "absolute", left: 0, bottom: 44, width: 144, height: 8, backgroundColor: "#96613A" }} />
        {[0, 1, 2].map((i) => (
          <View key={i} style={{ position: "absolute", left: 0, bottom: 0, width: 144, height: 60 }}>
            <Px style={{ position: "absolute", left: 16 + i * 32, bottom: 12, width: 28, height: 28, backgroundColor: "#22301F" }} />
            <Px style={{ position: "absolute", left: 20 + i * 32, bottom: 16, width: 20, height: 20, backgroundColor: "#FFFFFF" }} />
            <Px style={{ position: "absolute", left: 26 + i * 32, bottom: 22, width: 8, height: 8, backgroundColor: i === 1 ? "#E8862D" : "#E86A5C" }} />
          </View>
        ))}
        <Px style={{ position: "absolute", left: 112, bottom: 12, width: 24, height: 12, backgroundColor: "#FFFFFF" }} />
        <Px style={{ position: "absolute", left: 112, bottom: 24, width: 24, height: 12, backgroundColor: "#E8862D" }} />
      </StepIn>
      <Px style={{ position: "absolute", left: "52%", bottom: 88, width: 76, height: 4, backgroundColor: "#8A5A2B" }} />
      <Px style={{ position: "absolute", left: "54%", bottom: 100, width: 76, height: 4, backgroundColor: "#96613A" }} />
      <Px style={{ position: "absolute", left: "90%", bottom: 80, width: 16, height: 12, backgroundColor: "#F6C6D8" }} />
      <Px style={{ position: "absolute", left: "46%", bottom: 28, width: 12, height: 12, backgroundColor: "#58A05C" }} />
    </PixelSceneRoot>
  );
}

export function PixelRestChineseScene() {
  // Takeout box with noodles, chopsticks, fortune cookie.
  return (
    <PixelSceneRoot base="#B03A2E">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "26%", backgroundColor: "#8E2A20" }} />
      <StepIn delay={50} style={{ position: "absolute", left: "56%", bottom: 16, width: 72, height: 84 }}>
        <Px style={{ position: "absolute", left: 24, bottom: 72, width: 12, height: 12, backgroundColor: "#F7DC6F" }} />
        <Px style={{ position: "absolute", left: 40, bottom: 76, width: 12, height: 12, backgroundColor: "#F2C14E" }} />
        <Px style={{ position: "absolute", left: 4, bottom: 0, width: 64, height: 56, backgroundColor: "#FFFFFF" }} shadow />
        <Px style={{ position: "absolute", left: 0, bottom: 56, width: 72, height: 12, backgroundColor: "#F4E9CE" }} />
        <Px style={{ position: "absolute", left: 20, bottom: 20, width: 32, height: 20, backgroundColor: "#D64545" }} />
      </StepIn>
      <Px style={{ position: "absolute", left: "64%", bottom: 92, width: 68, height: 4, backgroundColor: "#8A5A2B" }} />
      <Px style={{ position: "absolute", left: "66%", bottom: 104, width: 68, height: 4, backgroundColor: "#96613A" }} />
      <Px style={{ position: "absolute", left: "46%", bottom: 20, width: 24, height: 12, backgroundColor: "#EFC477" }} />
      <Px style={{ position: "absolute", left: "88%", bottom: 20, width: 16, height: 16, backgroundColor: "#F5A623" }} />
      <Px style={{ position: "absolute", left: "90%", bottom: 24, width: 8, height: 8, backgroundColor: "#FFC98A" }} />
      <StepBob left="64%" bottom={108} width={8} height={12} distance={4}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 8, height: 12, backgroundColor: "#FFFFFF", opacity: 0.55 }} />
      </StepBob>
    </PixelSceneRoot>
  );
}

export function PixelRestDinerScene() {
  // Retro sign, plate with mini burger and a shake.
  return (
    <PixelSceneRoot base="#5B87A0">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "26%", backgroundColor: "#476B80" }} />
      <StepIn delay={50} style={{ position: "absolute", left: "50%", bottom: 16, width: 124, height: 120 }}>
        <Px style={{ position: "absolute", left: 0, bottom: 92, width: 124, height: 28, backgroundColor: "#D64545" }} shadow />
        <Px style={{ position: "absolute", left: 16, bottom: 100, width: 92, height: 8, backgroundColor: "#FFFFFF" }} />
        <Px style={{ position: "absolute", left: 4, bottom: 0, width: 96, height: 84, backgroundColor: "#EDE6D8" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 8, width: 104, height: 68, backgroundColor: "#EDE6D8" }} />
      </StepIn>
      <StepIn delay={140} style={{ position: "absolute", left: "58%", bottom: 28, width: 48, height: 52 }}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 48, height: 12, backgroundColor: "#E8A94E" }} />
        <Px style={{ position: "absolute", left: 4, bottom: 12, width: 40, height: 8, backgroundColor: "#6B4226" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 20, width: 48, height: 12, backgroundColor: "#58A05C" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 32, width: 48, height: 16, backgroundColor: "#F0BE6A" }} />
      </StepIn>
      <Px style={{ position: "absolute", left: "82%", bottom: 24, width: 20, height: 36, backgroundColor: "#F6C6D8" }} />
      <Px style={{ position: "absolute", left: "82%", bottom: 60, width: 20, height: 8, backgroundColor: "#FFFFFF" }} />
      <Px style={{ position: "absolute", left: "85%", bottom: 68, width: 4, height: 20, backgroundColor: "#D64545" }} />
    </PixelSceneRoot>
  );
}

export function PixelRestDessertScene() {
  // Sundae glass with three scoops, cherry, wafer and spoon.
  return (
    <PixelSceneRoot base="#B565A7">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "24%", backgroundColor: "#96568C" }} />
      <StepIn delay={50} style={{ position: "absolute", left: "58%", bottom: 12, width: 64, height: 108 }}>
        <Px style={{ position: "absolute", left: 24, bottom: 8, width: 16, height: 24, backgroundColor: "#DFF3F9" }} />
        <Px style={{ position: "absolute", left: 4, bottom: 0, width: 56, height: 8, backgroundColor: "#C9D8EA" }} />
        <Px style={{ position: "absolute", left: 4, bottom: 32, width: 56, height: 32, backgroundColor: "#DFF3F9" }} shadow />
        <Px style={{ position: "absolute", left: 0, bottom: 40, width: 64, height: 20, backgroundColor: "#DFF3F9" }} />
        <Px style={{ position: "absolute", left: 4, bottom: 60, width: 28, height: 28, backgroundColor: "#F6C6D8" }} />
        <Px style={{ position: "absolute", left: 32, bottom: 64, width: 28, height: 28, backgroundColor: "#FFF8E1" }} />
        <Px style={{ position: "absolute", left: 16, bottom: 84, width: 28, height: 24, backgroundColor: "#7A4A2B" }} />
        <Px style={{ position: "absolute", left: 24, bottom: 104, width: 12, height: 12, backgroundColor: "#D64545" }} />
      </StepIn>
      <Px style={{ position: "absolute", left: "60%", bottom: 96, width: 8, height: 28, backgroundColor: "#EFC477" }} />
      <Px style={{ position: "absolute", left: "82%", bottom: 72, width: 4, height: 36, backgroundColor: "#C0C6CE" }} />
      <Px style={{ position: "absolute", left: "70%", bottom: 118, width: 4, height: 8, backgroundColor: "#3E7C43" }} />
    </PixelSceneRoot>
  );
}

export function PixelRestItalianScene() {
  // Bowl of pasta, breadstick and parmesan.
  return (
    <PixelSceneRoot base="#3E7C43">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "26%", backgroundColor: "#2F6335" }} />
      <StepIn delay={50} style={{ position: "absolute", left: "52%", bottom: 20, width: 116, height: 64 }}>
        <Px style={{ position: "absolute", left: 12, bottom: 0, width: 92, height: 12, backgroundColor: "#FFFFFF" }} />
        <Px style={{ position: "absolute", left: 4, bottom: 12, width: 108, height: 20, backgroundColor: "#FFFFFF" }} shadow />
        <Px style={{ position: "absolute", left: 0, bottom: 32, width: 116, height: 16, backgroundColor: "#FFFFFF" }} />
        <Px style={{ position: "absolute", left: 8, bottom: 40, width: 100, height: 16, backgroundColor: "#F7DC6F" }} />
        <Px style={{ position: "absolute", left: 24, bottom: 48, width: 24, height: 16, backgroundColor: "#F2C14E" }} />
        <Px style={{ position: "absolute", left: 56, bottom: 48, width: 24, height: 16, backgroundColor: "#F7DC6F" }} />
        <Px style={{ position: "absolute", left: 44, bottom: 52, width: 12, height: 12, backgroundColor: "#C0392B" }} />
        <Px style={{ position: "absolute", left: 84, bottom: 52, width: 8, height: 8, backgroundColor: "#2F6335" }} />
      </StepIn>
      <Px style={{ position: "absolute", left: "50%", bottom: 72, width: 4, height: 32, backgroundColor: "#C0C6CE" }} />
      <Px style={{ position: "absolute", left: "88%", bottom: 24, width: 12, height: 44, backgroundColor: "#EFC477" }} />
      <Px style={{ position: "absolute", left: "48%", bottom: 28, width: 8, height: 8, backgroundColor: "#FFF8E1" }} />
      <Px style={{ position: "absolute", left: "50%", bottom: 40, width: 8, height: 8, backgroundColor: "#FFF8E1" }} />
    </PixelSceneRoot>
  );
}

export function PixelRestSeafoodScene() {
  // Fish on a platter, lemon, shrimp and herbs, wave below.
  return (
    <PixelSceneRoot base="#3E7CB1">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "26%", backgroundColor: "#2F6391" }} />
      <StepIn delay={50} style={{ position: "absolute", left: "48%", bottom: 20, width: 144, height: 76 }}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 144, height: 20, backgroundColor: "#EDE6D8" }} shadow />
        <Px style={{ position: "absolute", left: 12, bottom: 28, width: 76, height: 28, backgroundColor: "#7FB3D5" }} />
        <Px style={{ position: "absolute", left: 4, bottom: 36, width: 92, height: 12, backgroundColor: "#7FB3D5" }} />
        <Px style={{ position: "absolute", left: 88, bottom: 32, width: 24, height: 20, backgroundColor: "#5B9BD5" }} />
        <Px style={{ position: "absolute", left: 20, bottom: 44, width: 8, height: 8, backgroundColor: "#1E3A45" }} />
        <Px style={{ position: "absolute", left: 32, bottom: 32, width: 40, height: 4, backgroundColor: "#FFFFFF" }} />
        <Px style={{ position: "absolute", left: 116, bottom: 28, width: 20, height: 20, backgroundColor: "#FFD54F" }} />
        <Px style={{ position: "absolute", left: 120, bottom: 32, width: 12, height: 12, backgroundColor: "#FFE9A8" }} />
      </StepIn>
      <Px style={{ position: "absolute", left: "52%", bottom: 64, width: 16, height: 12, backgroundColor: "#E86A5C" }} />
      <Px style={{ position: "absolute", left: "54%", bottom: 80, width: 16, height: 8, backgroundColor: "#3E7C43" }} />
      <View style={{ position: "absolute", left: "42%", right: 0, bottom: 6, height: 4, backgroundColor: "#FFFFFF", opacity: 0.4 }} />
    </PixelSceneRoot>
  );
}

export function PixelRestHealthyScene() {
  // Salad bowl and a smoothie, sun overhead.
  return (
    <PixelSceneRoot base="#7FB069">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "26%", backgroundColor: "#639551" }} />
      <StepIn delay={50} style={{ position: "absolute", left: "50%", bottom: 20, width: 104, height: 60 }}>
        <Px style={{ position: "absolute", left: 12, bottom: 0, width: 80, height: 12, backgroundColor: "#FFFFFF" }} />
        <Px style={{ position: "absolute", left: 4, bottom: 12, width: 96, height: 20, backgroundColor: "#FFFFFF" }} shadow />
        <Px style={{ position: "absolute", left: 0, bottom: 32, width: 104, height: 12, backgroundColor: "#FFFFFF" }} />
        <Px style={{ position: "absolute", left: 8, bottom: 40, width: 88, height: 12, backgroundColor: "#58A05C" }} />
        <Px style={{ position: "absolute", left: 20, bottom: 48, width: 12, height: 12, backgroundColor: "#D64545" }} />
        <Px style={{ position: "absolute", left: 48, bottom: 48, width: 12, height: 12, backgroundColor: "#E8862D" }} />
        <Px style={{ position: "absolute", left: 72, bottom: 48, width: 12, height: 12, backgroundColor: "#F2F7E8" }} />
      </StepIn>
      <StepIn delay={140} style={{ position: "absolute", left: "84%", bottom: 20, width: 24, height: 48 }}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 24, height: 40, backgroundColor: "#F6C6D8" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 36, width: 24, height: 8, backgroundColor: "#E86A92" }} />
        <Px style={{ position: "absolute", left: 12, bottom: 44, width: 4, height: 20, backgroundColor: "#58A05C" }} />
      </StepIn>
      <Px style={{ position: "absolute", left: "46%", bottom: 24, width: 16, height: 16, backgroundColor: "#FFD54F" }} />
      <PxSun left="46%" bottom={104} size={24} color="#FFD94D" core="#FFE98A" ray="#FFC531" />
    </PixelSceneRoot>
  );
}

export function PixelRestIndianScene() {
  // Curry bowl, naan, spice dots and rice.
  return (
    <PixelSceneRoot base="#C96A2B">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "26%", backgroundColor: "#A8541F" }} />
      <StepIn delay={50} style={{ position: "absolute", left: "52%", bottom: 20, width: 100, height: 60 }}>
        <Px style={{ position: "absolute", left: 12, bottom: 0, width: 76, height: 12, backgroundColor: "#8A6D4B" }} />
        <Px style={{ position: "absolute", left: 4, bottom: 12, width: 92, height: 20, backgroundColor: "#8A6D4B" }} shadow />
        <Px style={{ position: "absolute", left: 0, bottom: 32, width: 100, height: 12, backgroundColor: "#8A6D4B" }} />
        <Px style={{ position: "absolute", left: 8, bottom: 40, width: 84, height: 12, backgroundColor: "#E8862D" }} />
        <Px style={{ position: "absolute", left: 24, bottom: 44, width: 12, height: 12, backgroundColor: "#D97B2E" }} />
        <Px style={{ position: "absolute", left: 52, bottom: 44, width: 12, height: 12, backgroundColor: "#C96A2B" }} />
        <Px style={{ position: "absolute", left: 40, bottom: 52, width: 8, height: 8, backgroundColor: "#3E7C43" }} />
      </StepIn>
      <StepIn delay={140} style={{ position: "absolute", left: "80%", bottom: 24, width: 48, height: 36 }}>
        <Px style={{ position: "absolute", left: 4, bottom: 0, width: 40, height: 36, backgroundColor: "#F2D8A7" }} />
        <Px style={{ position: "absolute", left: 0, bottom: 8, width: 48, height: 20, backgroundColor: "#F2D8A7" }} />
        <Px style={{ position: "absolute", left: 12, bottom: 8, width: 24, height: 20, backgroundColor: "#EFC477" }} />
      </StepIn>
      <Px style={{ position: "absolute", left: "48%", bottom: 24, width: 8, height: 8, backgroundColor: "#D64545" }} />
      <Px style={{ position: "absolute", left: "50%", bottom: 40, width: 8, height: 8, backgroundColor: "#FFC531" }} />
      <Px style={{ position: "absolute", left: "47%", bottom: 52, width: 8, height: 8, backgroundColor: "#3E7C43" }} />
      <Px style={{ position: "absolute", left: "86%", bottom: 68, width: 20, height: 16, backgroundColor: "#FFF8E1" }} />
      <StepBob left="62%" bottom={84} width={8} height={12} distance={4}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 8, height: 12, backgroundColor: "#FFFFFF", opacity: 0.5 }} />
      </StepBob>
    </PixelSceneRoot>
  );
}
