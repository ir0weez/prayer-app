// Terminal TV keyword scenes (v186) — Pip-Boy line art for the
// Terminal skin. Every scene is a bespoke outline drawing of its
// show's world on the 200x120 tube: phosphor green for the subject,
// soft green for highlights, mid and dim for structure and distance.
// Subjects sit in the right half; card text overlays the left.
// Static strokes only, no lettering anywhere — logos are shapes.
// Sopranos leads: it is this skin's signature scene.

import {
  TermSceneRoot,
  LP,
  LC,
  LR,
  LL,
  LPoly,
  LDot,
  TFigure,
  TERM_PHOS,
  TERM_SOFT,
  TERM_MID,
  TERM_DIM,
} from "@/components/terminal-kit";

// The Sopranos — the New Jersey backyard: house and fence behind,
// the pool in front, and the ducks that came to stay.
export function TermTvSopranosScene() {
  return (
    <TermSceneRoot>
      <LL x1={0} y1={86} x2={200} y2={86} c={TERM_DIM} w={1.6} />
      <LR x={104} y={30} width={76} height={42} c={TERM_MID} w={1.8} />
      <LP d="M 98 31 L 142 12 L 186 31" c={TERM_MID} w={2} />
      <LL x1={142} y1={12} x2={142} y2={22} c={TERM_MID} w={1.6} />
      <LR x={114} y={42} width={13} height={13} c={TERM_MID} w={1.6} />
      <LR x={156} y={42} width={13} height={13} c={TERM_MID} w={1.6} />
      <LR x={136} y={48} width={12} height={24} c={TERM_MID} w={1.6} />
      <LDot cx={145} cy={61} r={1.4} c={TERM_SOFT} />
      <LL x1={86} y1={72} x2={196} y2={72} c={TERM_MID} w={1.6} />
      <LL x1={92} y1={64} x2={92} y2={80} c={TERM_DIM} w={1.4} />
      <LL x1={106} y1={64} x2={106} y2={80} c={TERM_DIM} w={1.4} />
      <LL x1={178} y1={64} x2={178} y2={80} c={TERM_DIM} w={1.4} />
      <LL x1={192} y1={64} x2={192} y2={80} c={TERM_DIM} w={1.4} />
      <LR x={88} y={84} width={106} height={27} rx={13} c={TERM_PHOS} w={2.2} />
      <LR x={95} y={89} width={92} height={17} rx={8} c={TERM_MID} w={1.4} />
      <LP d="M 104 97 L 126 97" c={TERM_MID} w={1.6} dash="5 4" />
      <LP d="M 150 102 L 172 102" c={TERM_MID} w={1.6} dash="5 4" />
      <LP d="M 118 92 C 126 86, 138 86, 142 92 C 138 96, 124 96, 118 92 Z" c={TERM_PHOS} w={2.1} />
      <LC cx={145} cy={86} r={4.5} c={TERM_SOFT} w={1.9} />
      <LPoly points="149,85 156,87 149,89" close c={TERM_PHOS} w={1.7} />
      <LDot cx={146} cy={85} r={1.1} c={TERM_PHOS} />
      <LP d="M 124 90 C 128 93, 134 93, 138 91" c={TERM_SOFT} w={1.5} />
      <LP d="M 158 96 C 164 91, 173 91, 176 96 C 172 99, 162 99, 158 96 Z" c={TERM_PHOS} w={2} />
      <LC cx={178} cy={91} r={3.8} c={TERM_SOFT} w={1.8} />
      <LPoly points="181,90 187,92 181,93" close c={TERM_PHOS} w={1.6} />
      <LP d="M 128 103 C 132 99, 139 99, 141 102 C 138 105, 131 105, 128 103 Z" c={TERM_SOFT} w={1.7} />
      <LC cx={143} cy={99} r={3} c={TERM_SOFT} w={1.6} />
      <LPoly points="146,98 151,100 146,101" close c={TERM_SOFT} w={1.4} />
    </TermSceneRoot>
  );
}

// Generic TV — a living room set: big set on its stand, rabbit-ear
// aerial, and the couch that faces it.
export function TermTvGenericScene() {
  return (
    <TermSceneRoot>
      <LL x1={0} y1={102} x2={200} y2={102} c={TERM_DIM} w={1.6} />
      <LP d="M 148 34 L 134 12" c={TERM_MID} w={1.7} />
      <LP d="M 152 34 L 168 14" c={TERM_MID} w={1.7} />
      <LDot cx={134} cy={12} r={1.6} c={TERM_SOFT} />
      <LDot cx={168} cy={14} r={1.6} c={TERM_SOFT} />
      <LR x={112} y={32} width={78} height={52} rx={5} c={TERM_PHOS} w={2.2} />
      <LR x={119} y={39} width={50} height={38} rx={3} c={TERM_SOFT} w={1.7} />
      <LP d="M 124 70 C 134 58, 146 64, 156 50" c={TERM_MID} w={1.6} />
      <LC cx={179} cy={47} r={3.4} c={TERM_PHOS} w={1.7} />
      <LC cx={179} cy={59} r={3.4} c={TERM_MID} w={1.7} />
      <LL x1={126} y1={84} x2={122} y2={94} c={TERM_MID} w={1.8} />
      <LL x1={176} y1={84} x2={180} y2={94} c={TERM_MID} w={1.8} />
      <LL x1={112} y1={94} x2={190} y2={94} c={TERM_MID} w={1.8} />
      <LP d="M 106 112 L 106 100 C 106 95, 114 95, 114 100 L 114 106 L 158 106 L 158 100 C 158 95, 166 95, 166 100 L 166 112" c={TERM_PHOS} w={2} />
      <LL x1={114} y1={106} x2={158} y2={106} c={TERM_MID} w={1.5} />
    </TermSceneRoot>
  );
}

// Dexter — Miami: sun over the bay, one palm leaning in, and a
// quiet boat wake crossing flat water.
export function TermTvDexterScene() {
  return (
    <TermSceneRoot>
      <LC cx={168} cy={26} r={11} c={TERM_SOFT} w={2} />
      <LL x1={0} y1={72} x2={200} y2={72} c={TERM_MID} w={1.7} />
      <LP d="M 104 92 L 138 92" c={TERM_MID} w={1.6} dash="6 4" />
      <LP d="M 142 102 L 184 102" c={TERM_DIM} w={1.6} dash="6 4" />
      <LP d="M 132 72 C 130 52, 126 38, 116 28" c={TERM_PHOS} w={2.2} />
      <LP d="M 116 28 C 106 20, 96 20, 90 26" c={TERM_PHOS} w={1.9} />
      <LP d="M 116 28 C 118 18, 126 12, 134 14" c={TERM_PHOS} w={1.9} />
      <LP d="M 116 28 C 124 24, 134 26, 138 32" c={TERM_SOFT} w={1.7} />
      <LP d="M 116 28 C 108 26, 102 30, 100 36" c={TERM_SOFT} w={1.7} />
      <LP d="M 150 84 L 188 84 L 182 92 L 156 92 Z" c={TERM_PHOS} w={2} />
      <LL x1={169} y1={84} x2={169} y2={74} c={TERM_MID} w={1.7} />
      <LPoly points="169,74 180,80 169,80" close c={TERM_SOFT} w={1.6} />
    </TermSceneRoot>
  );
}

// Dexter: New Blood — Iron Lake in winter: a snow-roofed cabin
// between dark pines under a cold moon.
export function TermTvDexterNewBloodScene() {
  return (
    <TermSceneRoot>
      <LC cx={178} cy={20} r={9} c={TERM_SOFT} w={1.9} />
      <LP d="M 0 92 C 50 86, 150 86, 200 92" c={TERM_DIM} w={1.7} />
      <LDot cx={112} cy={18} r={1.3} c={TERM_MID} />
      <LDot cx={136} cy={34} r={1.3} c={TERM_MID} />
      <LDot cx={96} cy={44} r={1.3} c={TERM_MID} />
      <LDot cx={158} cy={48} r={1.3} c={TERM_MID} />
      <LR x={108} y={56} width={58} height={34} c={TERM_PHOS} w={2.1} />
      <LP d="M 102 57 L 137 40 L 172 57" c={TERM_PHOS} w={2.2} />
      <LP d="M 106 52 L 137 37 L 168 52" c={TERM_SOFT} w={1.7} />
      <LR x={130} y={68} width={13} height={22} c={TERM_MID} w={1.7} />
      <LR x={114} y={64} width={10} height={10} c={TERM_SOFT} w={1.6} />
      <LL x1={154} y1={56} x2={154} y2={44} c={TERM_MID} w={1.7} />
      <LP d="M 148 46 C 152 42, 156 42, 158 46" c={TERM_DIM} w={1.5} />
      <LPoly points="182,90 190,58 198,90" close c={TERM_MID} w={1.8} />
      <LPoly points="184,72 196,72" c={TERM_MID} w={1.5} />
      <LL x1={190} y1={90} x2={190} y2={98} c={TERM_MID} w={1.8} />
      <LPoly points="88,94 94,70 100,94" close c={TERM_DIM} w={1.7} />
    </TermSceneRoot>
  );
}

// Dexter: Original Sin — young Miami: a striped setting sun, a
// palm, and the pastel skyline of the early nineties.
export function TermTvDexterOriginalSinScene() {
  return (
    <TermSceneRoot>
      <LC cx={150} cy={44} r={20} c={TERM_SOFT} w={2} />
      <LP d="M 130 44 L 170 44" c={TERM_MID} w={1.7} />
      <LP d="M 132 52 L 168 52" c={TERM_MID} w={1.7} />
      <LL x1={0} y1={82} x2={200} y2={82} c={TERM_MID} w={1.7} />
      <LR x={98} y={56} width={16} height={26} c={TERM_DIM} w={1.6} />
      <LR x={118} y={48} width={18} height={34} c={TERM_DIM} w={1.6} />
      <LR x={164} y={52} width={15} height={30} c={TERM_DIM} w={1.6} />
      <LR x={182} y={60} width={12} height={22} c={TERM_DIM} w={1.6} />
      <LP d="M 88 98 C 86 76, 82 60, 74 48" c={TERM_PHOS} w={2.1} />
      <LP d="M 74 48 C 64 40, 54 40, 48 46" c={TERM_PHOS} w={1.8} />
      <LP d="M 74 48 C 76 38, 84 32, 92 34" c={TERM_PHOS} w={1.8} />
      <LP d="M 74 48 C 82 44, 90 46, 94 52" c={TERM_SOFT} w={1.6} />
      <LP d="M 108 94 L 140 94" c={TERM_MID} w={1.5} dash="5 4" />
      <LP d="M 148 102 L 186 102" c={TERM_DIM} w={1.5} dash="5 4" />
    </TermSceneRoot>
  );
}

// Dexter: Resurrection — the city that never sleeps: a hard
// skyline, a water tower, and one small evidence slide below.
export function TermTvDexterResurrectionScene() {
  return (
    <TermSceneRoot>
      <LC cx={112} cy={18} r={7} c={TERM_SOFT} w={1.8} />
      <LR x={96} y={38} width={18} height={58} c={TERM_MID} w={1.8} />
      <LR x={118} y={26} width={22} height={70} c={TERM_PHOS} w={2} />
      <LR x={144} y={44} width={16} height={52} c={TERM_MID} w={1.8} />
      <LR x={164} y={32} width={20} height={64} c={TERM_MID} w={1.8} />
      <LDot cx={129} cy={40} r={1.5} c={TERM_SOFT} />
      <LDot cx={129} cy={56} r={1.5} c={TERM_MID} />
      <LDot cx={105} cy={54} r={1.5} c={TERM_MID} />
      <LDot cx={174} cy={50} r={1.5} c={TERM_SOFT} />
      <LDot cx={152} cy={64} r={1.5} c={TERM_MID} />
      <LL x1={174} y1={32} x2={174} y2={18} c={TERM_MID} w={1.6} />
      <LPoly points="166,18 182,18 179,28 169,28" close c={TERM_MID} w={1.6} />
      <LL x1={0} y1={96} x2={200} y2={96} c={TERM_DIM} w={1.6} />
      <LR x={122} y={102} width={34} height={11} rx={2} c={TERM_PHOS} w={1.8} />
      <LP d="M 139 105 C 142 107, 142 110, 139 111 C 136 110, 136 107, 139 105 Z" c={TERM_SOFT} w={1.6} />
    </TermSceneRoot>
  );
}

// The Walking Dead — a dead road: wrecked car, split fence, and
// a bare tree reaching over cracked tarmac.
export function TermTvWalkingDeadScene() {
  return (
    <TermSceneRoot>
      <LP d="M 84 104 L 128 78 L 200 78" c={TERM_DIM} w={1.7} />
      <LP d="M 120 110 L 152 84" c={TERM_DIM} w={1.5} dash="6 5" />
      <LR x={104} y={54} width={66} height={20} rx={6} c={TERM_PHOS} w={2.1} />
      <LP d="M 116 54 C 120 44, 132 40, 146 40 C 156 40, 162 46, 164 54" c={TERM_PHOS} w={2} />
      <LL x1={136} y1={41} x2={136} y2={54} c={TERM_MID} w={1.6} />
      <LC cx={118} cy={76} r={7} c={TERM_PHOS} w={2} />
      <LC cx={156} cy={76} r={7} c={TERM_PHOS} w={2} />
      <LP d="M 122 60 L 130 66 L 124 70" c={TERM_SOFT} w={1.5} />
      <LL x1={88} y1={62} x2={98} y2={62} c={TERM_MID} w={1.7} />
      <LL x1={90} y1={52} x2={96} y2={72} c={TERM_MID} w={1.5} />
      <LL x1={176} y1={62} x2={188} y2={62} c={TERM_MID} w={1.7} />
      <LP d="M 186 78 L 186 34" c={TERM_MID} w={2} />
      <LP d="M 186 48 C 178 42, 170 42, 164 36" c={TERM_MID} w={1.7} />
      <LP d="M 186 40 C 192 34, 196 30, 198 24" c={TERM_MID} w={1.7} />
      <LP d="M 186 56 C 180 54, 176 50, 174 46" c={TERM_DIM} w={1.5} />
    </TermSceneRoot>
  );
}

// The Chosen — a fishing boat at first light on the water:
// low sun, a lateen sail, and a net drawn in over the side.
export function TermTvChosenScene() {
  return (
    <TermSceneRoot>
      <LC cx={172} cy={30} r={10} c={TERM_SOFT} w={2} />
      <LP d="M 120 24 C 140 16, 164 14, 188 20" c={TERM_DIM} w={1.5} />
      <LL x1={0} y1={78} x2={200} y2={78} c={TERM_MID} w={1.7} />
      <LP d="M 96 92 L 128 92" c={TERM_MID} w={1.5} dash="6 4" />
      <LP d="M 140 102 L 182 102" c={TERM_DIM} w={1.5} dash="6 4" />
      <LP d="M 104 78 L 184 78 L 172 92 L 116 92 Z" c={TERM_PHOS} w={2.1} />
      <LL x1={144} y1={78} x2={144} y2={34} c={TERM_PHOS} w={2} />
      <LPoly points="144,36 144,66 172,66" close c={TERM_SOFT} w={1.8} />
      <LP d="M 144 42 C 130 50, 122 60, 120 70" c={TERM_MID} w={1.6} />
      <LP d="M 118 78 C 124 88, 138 92, 148 90" c={TERM_MID} w={1.5} dash="3 3" />
      <LP d="M 164 78 C 170 86, 178 88, 184 84" c={TERM_MID} w={1.5} dash="3 3" />
      <TFigure x={128} y={77} s={0.62} c={TERM_SOFT} />
    </TermSceneRoot>
  );
}

// The Bear — the kitchen pass: rail of pans overhead, a burner
// and a steaming pot on the counter line.
export function TermTvBearScene() {
  return (
    <TermSceneRoot>
      <LL x1={92} y1={22} x2={196} y2={22} c={TERM_MID} w={1.9} />
      <LL x1={106} y1={22} x2={106} y2={30} c={TERM_MID} w={1.5} />
      <LC cx={106} cy={40} r={9} c={TERM_PHOS} w={1.9} />
      <LL x1={134} y1={22} x2={134} y2={28} c={TERM_MID} w={1.5} />
      <LC cx={134} cy={36} r={7} c={TERM_SOFT} w={1.8} />
      <LL x1={162} y1={22} x2={162} y2={30} c={TERM_MID} w={1.5} />
      <LR x={154} y={30} width={16} height={20} rx={2} c={TERM_PHOS} w={1.8} />
      <LL x1={88} y1={88} x2={198} y2={88} c={TERM_PHOS} w={2.1} />
      <LL x1={92} y1={88} x2={92} y2={106} c={TERM_MID} w={1.7} />
      <LL x1={194} y1={88} x2={194} y2={106} c={TERM_MID} w={1.7} />
      <LP d="M 116 74 L 152 74 L 148 88 L 120 88 Z" c={TERM_PHOS} w={2} />
      <LL x1={112} y1={74} x2={156} y2={74} c={TERM_SOFT} w={1.9} />
      <LP d="M 126 66 C 122 60, 130 56, 126 50" c={TERM_SOFT} w={1.6} />
      <LP d="M 140 66 C 136 60, 144 56, 140 50" c={TERM_SOFT} w={1.6} />
      <LC cx={176} cy={80} r={7} c={TERM_MID} w={1.7} />
      <LC cx={176} cy={80} r={3} c={TERM_MID} w={1.4} />
    </TermSceneRoot>
  );
}

// Skins — Bristol rooftops at night: terraced houses, lit
// windows, and a string of party lights strung between roofs.
export function TermTvSkinsScene() {
  return (
    <TermSceneRoot>
      <LC cx={184} cy={18} r={7} c={TERM_SOFT} w={1.8} />
      <LR x={96} y={52} width={30} height={52} c={TERM_MID} w={1.8} />
      <LR x={130} y={38} width={34} height={66} c={TERM_PHOS} w={2} />
      <LR x={168} y={58} width={26} height={46} c={TERM_MID} w={1.8} />
      <LP d="M 126 38 L 147 26 L 168 38" c={TERM_MID} w={1.7} />
      <LR x={138} y={50} width={8} height={8} c={TERM_SOFT} w={1.5} />
      <LR x={150} y={70} width={8} height={8} c={TERM_MID} w={1.5} />
      <LR x={104} y={64} width={7} height={7} c={TERM_MID} w={1.4} />
      <LR x={176} y={70} width={7} height={7} c={TERM_SOFT} w={1.4} />
      <LP d="M 92 30 C 124 44, 164 44, 198 28" c={TERM_DIM} w={1.5} />
      <LDot cx={112} cy={36} r={2} c={TERM_PHOS} />
      <LDot cx={132} cy={40} r={2} c={TERM_SOFT} />
      <LDot cx={152} cy={40} r={2} c={TERM_PHOS} />
      <LDot cx={172} cy={36} r={2} c={TERM_SOFT} />
      <LDot cx={188} cy={30} r={2} c={TERM_PHOS} />
      <LL x1={0} y1={104} x2={200} y2={104} c={TERM_DIM} w={1.6} />
    </TermSceneRoot>
  );
}

// Game of Thrones — a snowbound northern castle: twin towers,
// a lit gate, and one dragon crossing far overhead.
export function TermTvGotScene() {
  return (
    <TermSceneRoot>
      <LDot cx={104} cy={20} r={1.4} c={TERM_SOFT} />
      <LDot cx={132} cy={12} r={1.4} c={TERM_MID} />
      <LDot cx={160} cy={28} r={1.4} c={TERM_SOFT} />
      <LDot cx={92} cy={44} r={1.4} c={TERM_MID} />
      <LP d="M 108 30 C 116 24, 124 24, 130 29 C 136 24, 144 24, 150 30" c={TERM_MID} w={1.7} />
      <LP d="M 124 29 L 129 36 L 134 29" c={TERM_MID} w={1.5} />
      <LR x={118} y={58} width={52} height={48} c={TERM_PHOS} w={2.1} />
      <LR x={100} y={44} width={18} height={62} c={TERM_MID} w={1.9} />
      <LR x={170} y={44} width={18} height={62} c={TERM_MID} w={1.9} />
      <LPoly points="98,44 109,32 120,44" close c={TERM_MID} w={1.8} />
      <LPoly points="168,44 179,32 190,44" close c={TERM_MID} w={1.8} />
      <LL x1={118} y1={58} x2={170} y2={58} c={TERM_MID} w={1.6} />
      <LP d="M 98 46 L 120 46 M 168 46 L 190 46" c={TERM_SOFT} w={1.6} />
      <LP d="M 136 106 L 136 88 C 136 80, 152 80, 152 88 L 152 106" c={TERM_SOFT} w={1.9} />
      <LR x={142} y={64} width={6} height={8} c={TERM_SOFT} w={1.4} />
      <LL x1={0} y1={106} x2={200} y2={106} c={TERM_DIM} w={1.6} />
    </TermSceneRoot>
  );
}

// Dragon Ball Z — a four-star ball held large, a spiky-haired
// fighter in stance, and Namek rocks adrift behind.
export function TermTvDbzScene() {
  return (
    <TermSceneRoot>
      <LC cx={152} cy={48} r={26} c={TERM_PHOS} w={2.3} />
      <LC cx={152} cy={48} r={19} c={TERM_MID} w={1.5} />
      <LDot cx={144} cy={40} r={2.6} c={TERM_SOFT} />
      <LDot cx={160} cy={40} r={2.6} c={TERM_SOFT} />
      <LDot cx={144} cy={56} r={2.6} c={TERM_SOFT} />
      <LDot cx={160} cy={56} r={2.6} c={TERM_SOFT} />
      <LP d="M 132 26 C 138 20, 148 18, 154 20" c={TERM_SOFT} w={1.7} />
      <LPoly points="100,84 106,58 110,74 116,52 121,72 128,56 130,84" close c={TERM_PHOS} w={1.9} />
      <LP d="M 108 84 L 104 106 M 122 84 L 128 106" c={TERM_PHOS} w={1.9} />
      <LP d="M 106 92 L 92 86 M 126 92 L 140 84" c={TERM_PHOS} w={1.9} />
      <LPoly points="176,88 184,80 190,90 182,96" close c={TERM_DIM} w={1.6} />
      <LPoly points="92,30 98,24 103,31 97,36" close c={TERM_DIM} w={1.5} />
      <LL x1={0} y1={108} x2={200} y2={108} c={TERM_DIM} w={1.6} />
    </TermSceneRoot>
  );
}

// Sons of Anarchy — a cruiser in profile on a dusk highway:
// two wheels, low frame, and the sun going down behind it.
export function TermTvSoaScene() {
  return (
    <TermSceneRoot>
      <LC cx={176} cy={30} r={12} c={TERM_SOFT} w={2} />
      <LP d="M 96 34 C 130 24, 164 22, 196 28" c={TERM_DIM} w={1.5} />
      <LL x1={0} y1={98} x2={200} y2={98} c={TERM_MID} w={1.8} />
      <LP d="M 100 106 L 132 106" c={TERM_DIM} w={1.5} dash="6 4" />
      <LC cx={118} cy={86} r={12} c={TERM_PHOS} w={2.2} />
      <LC cx={174} cy={86} r={12} c={TERM_PHOS} w={2.2} />
      <LC cx={118} cy={86} r={3} c={TERM_MID} w={1.6} />
      <LC cx={174} cy={86} r={3} c={TERM_MID} w={1.6} />
      <LP d="M 118 86 L 140 62 L 162 62 L 174 86" c={TERM_PHOS} w={2.1} />
      <LP d="M 140 62 L 132 50 L 120 52" c={TERM_MID} w={1.8} />
      <LP d="M 162 62 L 170 48 L 182 46" c={TERM_PHOS} w={2} />
      <LP d="M 134 68 C 144 64, 154 64, 160 68" c={TERM_SOFT} w={1.8} />
      <LL x1={128} y1={56} x2={146} y2={56} c={TERM_PHOS} w={2} />
    </TermSceneRoot>
  );
}

// Reacher — a small-town road at dusk: one very large traveller
// with a duffel, a diner awning, and a long empty highway.
export function TermTvReacherScene() {
  return (
    <TermSceneRoot>
      <LC cx={112} cy={24} r={9} c={TERM_SOFT} w={1.9} />
      <LL x1={0} y1={96} x2={200} y2={96} c={TERM_MID} w={1.8} />
      <LP d="M 96 108 L 140 108" c={TERM_DIM} w={1.5} dash="7 5" />
      <LR x={156} y={50} width={38} height={46} c={TERM_MID} w={1.8} />
      <LP d="M 154 50 L 196 50 L 190 60 L 160 60 Z" c={TERM_MID} w={1.7} />
      <LR x={166} y={72} width={10} height={24} c={TERM_DIM} w={1.5} />
      <LR x={182} y={64} width={8} height={8} c={TERM_DIM} w={1.4} />
      <TFigure x={132} y={96} s={1.18} c={TERM_PHOS} />
      <LP d="M 146 78 C 152 76, 156 80, 155 86 L 144 86 C 143 82, 144 79, 146 78 Z" c={TERM_SOFT} w={1.8} />
      <LL x1={140} y1={72} x2={147} y2={79} c={TERM_PHOS} w={1.8} />
    </TermSceneRoot>
  );
}

// From — a town you cannot leave: thin houses, thinner trees,
// a street lamp, and a raven watching from a branch.
export function TermTvFromScene() {
  return (
    <TermSceneRoot>
      <LC cx={182} cy={18} r={8} c={TERM_SOFT} w={1.8} />
      <LR x={96} y={58} width={30} height={40} c={TERM_MID} w={1.8} />
      <LP d="M 94 58 L 111 46 L 128 58" c={TERM_MID} w={1.7} />
      <LR x={104} y={68} width={7} height={7} c={TERM_SOFT} w={1.4} />
      <LR x={136} y={66} width={24} height={32} c={TERM_DIM} w={1.7} />
      <LL x1={0} y1={98} x2={200} y2={98} c={TERM_DIM} w={1.6} />
      <LL x1={176} y1={98} x2={176} y2={40} c={TERM_PHOS} w={2} />
      <LP d="M 176 58 C 168 50, 158 48, 150 52" c={TERM_MID} w={1.7} />
      <LP d="M 176 48 C 182 42, 188 40, 194 42" c={TERM_MID} w={1.7} />
      <LP d="M 156 50 C 158 46, 162 46, 164 49 L 168 48 L 164 52 C 161 54, 158 53, 156 50 Z" c={TERM_PHOS} w={1.6} />
      <LL x1={118} y1={98} x2={118} y2={64} c={TERM_MID} w={1.7} />
      <LC cx={118} cy={60} r={4} c={TERM_SOFT} w={1.7} />
      <LP d="M 110 68 C 114 74, 122 74, 126 68" c={TERM_DIM} w={1.4} />
    </TermSceneRoot>
  );
}

// Daredevil — Hell's Kitchen rooftops: a water tower, a pigeon
// ledge of towers, and a lone figure keeping watch at the edge.
export function TermTvDaredevilScene() {
  return (
    <TermSceneRoot>
      <LR x={92} y={36} width={22} height={62} c={TERM_DIM} w={1.7} />
      <LR x={160} y={28} width={26} height={70} c={TERM_DIM} w={1.7} />
      <LDot cx={172} cy={44} r={1.5} c={TERM_MID} />
      <LDot cx={103} cy={56} r={1.5} c={TERM_MID} />
      <LDot cx={172} cy={66} r={1.5} c={TERM_SOFT} />
      <LL x1={84} y1={98} x2={200} y2={98} c={TERM_PHOS} w={2.1} />
      <LL x1={84} y1={98} x2={84} y2={108} c={TERM_MID} w={1.7} />
      <LL x1={196} y1={98} x2={196} y2={108} c={TERM_MID} w={1.7} />
      <LPoly points="122,34 146,34 142,52 126,52" close c={TERM_MID} w={1.8} />
      <LL x1={126} y1={52} x2={126} y2={70} c={TERM_MID} w={1.6} />
      <LL x1={142} y1={52} x2={142} y2={70} c={TERM_MID} w={1.6} />
      <LL x1={120} y1={70} x2={148} y2={70} c={TERM_MID} w={1.6} />
      <TFigure x={104} y={98} s={0.92} c={TERM_PHOS} />
      <LL x1={112} y1={76} x2={124} y2={70} c={TERM_SOFT} w={1.7} />
      <LL x1={124} y1={70} x2={132} y2={74} c={TERM_SOFT} w={1.7} />
    </TermSceneRoot>
  );
}

// Pluribus — the joined: four identical neighbours in a row on
// a quiet street, linked by the same signal overhead.
export function TermTvPluribusScene() {
  return (
    <TermSceneRoot>
      <LR x={150} y={34} width={42} height={32} c={TERM_DIM} w={1.7} />
      <LP d="M 148 34 L 171 22 L 194 34" c={TERM_DIM} w={1.6} />
      <LL x1={0} y1={100} x2={200} y2={100} c={TERM_MID} w={1.7} />
      <LP d="M 104 22 C 124 10, 168 10, 190 24" c={TERM_MID} w={1.6} />
      <LP d="M 116 30 C 132 20, 162 20, 178 30" c={TERM_DIM} w={1.4} />
      <LDot cx={147} cy={12} r={2} c={TERM_SOFT} />
      <TFigure x={108} y={100} s={0.94} c={TERM_PHOS} />
      <TFigure x={132} y={100} s={0.94} c={TERM_PHOS} />
      <TFigure x={156} y={100} s={0.94} c={TERM_SOFT} />
      <TFigure x={180} y={100} s={0.94} c={TERM_PHOS} />
    </TermSceneRoot>
  );
}

// Breaking Bad — the RV out in the desert: scrub, a saguaro,
// flat mesas, and heat over an empty road.
export function TermTvBreakingBadScene() {
  return (
    <TermSceneRoot>
      <LC cx={104} cy={22} r={9} c={TERM_SOFT} w={1.9} />
      <LP d="M 92 52 L 128 40 L 158 48 L 198 38" c={TERM_DIM} w={1.7} />
      <LL x1={0} y1={92} x2={200} y2={92} c={TERM_MID} w={1.8} />
      <LR x={108} y={54} width={72} height={30} rx={4} c={TERM_PHOS} w={2.2} />
      <LP d="M 108 66 L 180 66" c={TERM_SOFT} w={1.8} />
      <LR x={116} y={57} width={16} height={8} c={TERM_MID} w={1.5} />
      <LR x={140} y={57} width={14} height={8} c={TERM_MID} w={1.5} />
      <LR x={162} y={57} width={10} height={16} c={TERM_MID} w={1.5} />
      <LC cx={122} cy={88} r={6} c={TERM_PHOS} w={2} />
      <LC cx={164} cy={88} r={6} c={TERM_PHOS} w={2} />
      <LL x1={188} y1={92} x2={188} y2={52} c={TERM_MID} w={2} />
      <LP d="M 188 66 C 180 66, 178 60, 179 54" c={TERM_MID} w={1.8} />
      <LP d="M 188 58 C 195 58, 197 52, 196 47" c={TERM_MID} w={1.8} />
      <LP d="M 96 100 L 112 100" c={TERM_DIM} w={1.5} dash="5 4" />
    </TermSceneRoot>
  );
}

// Better Call Saul — a strip-mall storefront at night under a
// wavy inflatable figure, with a payphone standing by.
export function TermTvBetterCallSaulScene() {
  return (
    <TermSceneRoot>
      <LDot cx={104} cy={14} r={1.4} c={TERM_MID} />
      <LDot cx={150} cy={10} r={1.4} c={TERM_SOFT} />
      <LDot cx={188} cy={20} r={1.4} c={TERM_MID} />
      <LR x={96} y={58} width={90} height={44} c={TERM_PHOS} w={2.1} />
      <LL x1={92} y1={58} x2={190} y2={58} c={TERM_SOFT} w={2} />
      <LR x={104} y={68} width={22} height={24} c={TERM_MID} w={1.6} />
      <LR x={134} y={68} width={18} height={34} c={TERM_MID} w={1.6} />
      <LR x={160} y={68} width={18} height={24} c={TERM_MID} w={1.6} />
      <LP d="M 168 58 C 164 48, 176 44, 170 34 C 166 27, 174 22, 178 28" c={TERM_PHOS} w={2} />
      <LP d="M 170 34 L 158 26 M 176 38 L 186 32" c={TERM_PHOS} w={1.8} />
      <LL x1={0} y1={102} x2={200} y2={102} c={TERM_DIM} w={1.6} />
      <LR x={86} y={70} width={9} height={24} c={TERM_MID} w={1.6} />
      <LP d="M 88 76 L 93 76 L 93 84 L 88 84" c={TERM_DIM} w={1.3} />
    </TermSceneRoot>
  );
}

// Fallout — the vault door: a great cogged circle set in rock,
// its hub lit, rubble and a snapped signpost at its feet.
export function TermTvFalloutScene() {
  return (
    <TermSceneRoot>
      <LP d="M 84 108 C 92 60, 96 30, 104 10" c={TERM_DIM} w={1.7} />
      <LP d="M 196 108 C 192 64, 190 34, 186 12" c={TERM_DIM} w={1.7} />
      <LC cx={146} cy={58} r={36} c={TERM_PHOS} w={2.4} />
      <LC cx={146} cy={58} r={27} c={TERM_MID} w={1.8} />
      <LC cx={146} cy={58} r={10} c={TERM_SOFT} w={2} />
      <LL x1={146} y1={22} x2={146} y2={14} c={TERM_PHOS} w={2.4} />
      <LL x1={146} y1={94} x2={146} y2={102} c={TERM_PHOS} w={2.4} />
      <LL x1={110} y1={58} x2={102} y2={58} c={TERM_PHOS} w={2.4} />
      <LL x1={182} y1={58} x2={190} y2={58} c={TERM_PHOS} w={2.4} />
      <LL x1={121} y1={33} x2={115} y2={27} c={TERM_PHOS} w={2.2} />
      <LL x1={171} y1={33} x2={177} y2={27} c={TERM_PHOS} w={2.2} />
      <LL x1={121} y1={83} x2={115} y2={89} c={TERM_PHOS} w={2.2} />
      <LL x1={171} y1={83} x2={177} y2={89} c={TERM_PHOS} w={2.2} />
      <LL x1={136} y1={58} x2={156} y2={58} c={TERM_SOFT} w={1.8} />
      <LL x1={146} y1={48} x2={146} y2={68} c={TERM_SOFT} w={1.8} />
      <LL x1={0} y1={108} x2={200} y2={108} c={TERM_DIM} w={1.6} />
      <LPoly points="92,108 100,100 108,108" close c={TERM_DIM} w={1.5} />
      <LL x1={94} y1={108} x2={90} y2={92} c={TERM_MID} w={1.7} />
      <LP d="M 90 92 L 102 96" c={TERM_MID} w={1.7} />
    </TermSceneRoot>
  );
}

// Ted Lasso — the locker room: a long bench, pegs along both
// walls, a shirt hung up to dry, and a ball waiting by the door.
export function TermTvTedLassoScene() {
  return (
    <TermSceneRoot>
      <LL x1={96} y1={30} x2={128} y2={30} c={TERM_MID} w={1.7} />
      <LL x1={168} y1={30} x2={196} y2={30} c={TERM_MID} w={1.7} />
      <LDot cx={104} cy={34} r={1.5} c={TERM_MID} />
      <LDot cx={120} cy={34} r={1.5} c={TERM_MID} />
      <LDot cx={176} cy={34} r={1.5} c={TERM_MID} />
      <LDot cx={190} cy={34} r={1.5} c={TERM_MID} />
      <LL x1={92} y1={86} x2={198} y2={86} c={TERM_PHOS} w={2} />
      <LL x1={100} y1={86} x2={100} y2={100} c={TERM_MID} w={1.7} />
      <LL x1={188} y1={86} x2={188} y2={100} c={TERM_MID} w={1.7} />
      <LPoly points="138,38 150,34 162,38 168,46 160,50 160,72 140,72 140,50 132,46" close c={TERM_SOFT} w={1.9} />
      <LP d="M 141 58 C 146 62, 154 62, 159 58" c={TERM_MID} w={1.5} />
      <LC cx={106} cy={98} r={10} c={TERM_PHOS} w={2} />
      <LPoly points="106,90 111,96 108,103 100,103 99,95" close c={TERM_MID} w={1.5} />
      <LL x1={0} y1={108} x2={200} y2={108} c={TERM_DIM} w={1.6} />
    </TermSceneRoot>
  );
}

// One Piece — a pirate ship at full sail: skull-and-crossbones
// drawn as shapes on the canvas, waves rolling underneath.
export function TermTvOnePieceScene() {
  return (
    <TermSceneRoot>
      <LC cx={186} cy={18} r={7} c={TERM_SOFT} w={1.8} />
      <LL x1={138} y1={14} x2={138} y2={84} c={TERM_PHOS} w={2.1} />
      <LP d="M 138 18 C 156 22, 168 32, 170 46 L 138 46" c={TERM_SOFT} w={1.9} />
      <LC cx={152} cy={31} r={5} c={TERM_PHOS} w={1.7} />
      <LDot cx={150} cy={30} r={1.1} c={TERM_PHOS} />
      <LDot cx={155} cy={30} r={1.1} c={TERM_PHOS} />
      <LL x1={146} y1={40} x2={158} y2={44} c={TERM_PHOS} w={1.5} />
      <LL x1={158} y1={40} x2={146} y2={44} c={TERM_PHOS} w={1.5} />
      <LP d="M 138 50 C 124 54, 114 62, 112 72 L 138 72" c={TERM_MID} w={1.7} />
      <LP d="M 100 84 L 182 84 L 170 100 L 112 100 Z" c={TERM_PHOS} w={2.1} />
      <LP d="M 112 100 C 122 94, 132 106, 142 100 C 152 94, 162 106, 172 100" c={TERM_MID} w={1.6} />
      <LP d="M 96 108 C 108 102, 118 114, 130 108 C 144 102, 154 114, 168 108 C 178 103, 186 112, 194 108" c={TERM_DIM} w={1.6} />
      <LP d="M 172 84 C 178 76, 186 74, 192 78" c={TERM_MID} w={1.6} />
    </TermSceneRoot>
  );
}

// Stranger Things — the Byers house: a sagging string of lights
// over the porch, a bike below, and vines creeping in from above.
export function TermTvStrangerThingsScene() {
  return (
    <TermSceneRoot>
      <LP d="M 96 4 C 100 14, 98 22, 104 30" c={TERM_DIM} w={1.6} />
      <LP d="M 150 4 C 146 12, 152 20, 148 28" c={TERM_DIM} w={1.6} />
      <LP d="M 188 4 C 190 10, 186 16, 190 24" c={TERM_DIM} w={1.5} />
      <LR x={104} y={56} width={72} height={44} c={TERM_PHOS} w={2} />
      <LP d="M 100 56 L 140 40 L 180 56" c={TERM_MID} w={1.9} />
      <LR x={132} y={76} width={14} height={24} c={TERM_MID} w={1.6} />
      <LR x={112} y={64} width={10} height={10} c={TERM_MID} w={1.5} />
      <LP d="M 102 48 C 128 60, 154 60, 182 46" c={TERM_MID} w={1.5} />
      <LDot cx={114} cy={52} r={2.1} c={TERM_PHOS} />
      <LDot cx={128} cy={55} r={2.1} c={TERM_SOFT} />
      <LDot cx={142} cy={55} r={2.1} c={TERM_PHOS} />
      <LDot cx={156} cy={53} r={2.1} c={TERM_SOFT} />
      <LDot cx={170} cy={49} r={2.1} c={TERM_PHOS} />
      <LC cx={122} cy={106} r={6} c={TERM_SOFT} w={1.8} />
      <LC cx={148} cy={106} r={6} c={TERM_SOFT} w={1.8} />
      <LP d="M 122 106 L 134 94 L 148 106 M 134 94 L 142 94" c={TERM_SOFT} w={1.7} />
      <LL x1={0} y1={112} x2={200} y2={112} c={TERM_DIM} w={1.5} />
    </TermSceneRoot>
  );
}

// Bluey — a Queenslander on stilts with its veranda, and the
// rotary clothesline out back doing slow duty in the yard.
export function TermTvBlueyScene() {
  return (
    <TermSceneRoot>
      <LC cx={104} cy={18} r={8} c={TERM_SOFT} w={1.9} />
      <LP d="M 118 18 C 126 12, 136 12, 142 17" c={TERM_DIM} w={1.5} />
      <LR x={118} y={38} width={70} height={34} c={TERM_PHOS} w={2.1} />
      <LP d="M 112 38 L 153 24 L 194 38" c={TERM_PHOS} w={2.1} />
      <LL x1={118} y1={52} x2={188} y2={52} c={TERM_MID} w={1.6} />
      <LL x1={126} y1={38} x2={126} y2={72} c={TERM_MID} w={1.4} />
      <LL x1={144} y1={38} x2={144} y2={72} c={TERM_MID} w={1.4} />
      <LL x1={162} y1={38} x2={162} y2={72} c={TERM_MID} w={1.4} />
      <LL x1={180} y1={38} x2={180} y2={72} c={TERM_MID} w={1.4} />
      <LL x1={124} y1={72} x2={124} y2={94} c={TERM_MID} w={1.8} />
      <LL x1={182} y1={72} x2={182} y2={94} c={TERM_MID} w={1.8} />
      <LL x1={100} y1={100} x2={100} y2={76} c={TERM_SOFT} w={1.9} />
      <LL x1={88} y1={76} x2={112} y2={76} c={TERM_SOFT} w={1.8} />
      <LL x1={92} y1={76} x2={90} y2={86} c={TERM_MID} w={1.5} />
      <LL x1={108} y1={76} x2={110} y2={86} c={TERM_MID} w={1.5} />
      <LR x={90} y={76} width={6} height={9} c={TERM_MID} w={1.4} />
      <LL x1={0} y1={102} x2={200} y2={102} c={TERM_DIM} w={1.6} />
    </TermSceneRoot>
  );
}

// Hey Duggee — the clubhouse under its tree, bunting overhead,
// and a row of well-earned badge shapes along the fence.
export function TermTvDuggeeScene() {
  return (
    <TermSceneRoot>
      <LP d="M 100 96 C 98 66, 94 44, 84 30" c={TERM_MID} w={2} />
      <LC cx={82} cy={24} r={16} c={TERM_MID} w={1.8} />
      <LC cx={98} cy={16} r={11} c={TERM_DIM} w={1.6} />
      <LR x={118} y={56} width={58} height={40} c={TERM_PHOS} w={2.1} />
      <LP d="M 112 56 L 147 40 L 182 56" c={TERM_PHOS} w={2.1} />
      <LR x={140} y={72} width={14} height={24} c={TERM_MID} w={1.6} />
      <LC cx={164} cy={66} r={5} c={TERM_SOFT} w={1.6} />
      <LP d="M 108 28 C 136 40, 164 40, 194 26" c={TERM_DIM} w={1.5} />
      <LPoly points="124,34 132,34 128,42" close c={TERM_SOFT} w={1.4} />
      <LPoly points="148,36 156,36 152,44" close c={TERM_PHOS} w={1.4} />
      <LPoly points="172,32 180,32 176,40" close c={TERM_SOFT} w={1.4} />
      <LL x1={96} y1={104} x2={196} y2={104} c={TERM_MID} w={1.7} />
      <LC cx={118} cy={98} r={4} c={TERM_SOFT} w={1.5} />
      <LPoly points="146,92 149,97 154,97 150,100 152,105 146,102 141,105 143,100 139,97 144,97" close c={TERM_SOFT} w={1.3} />
      <LP d="M 172 96 C 170 92, 176 90, 178 94 C 180 90, 186 92, 184 96 C 182 100, 178 101, 175 104 C 174 101, 170 100, 172 96 Z" c={TERM_SOFT} w={1.3} />
    </TermSceneRoot>
  );
}

// Avatar — a sky temple: stepped roofs on a floating rock, a
// bison drifting past, and air itself drawn as slow spirals.
export function TermTvAvatarScene() {
  return (
    <TermSceneRoot>
      <LP d="M 102 30 C 108 22, 118 22, 122 28 C 118 34, 110 36, 104 32" c={TERM_MID} w={1.6} />
      <LP d="M 180 92 C 186 86, 194 88, 196 94 C 192 100, 184 100, 180 96" c={TERM_MID} w={1.6} />
      <LP d="M 114 44 C 128 34, 150 32, 162 40 C 166 46, 160 52, 150 52 L 122 52 C 112 52, 108 50, 114 44 Z" c={TERM_PHOS} w={2} />
      <LP d="M 122 40 C 118 34, 120 30, 124 28 L 128 36" c={TERM_SOFT} w={1.7} />
      <LP d="M 158 40 C 164 36, 168 38, 170 42" c={TERM_SOFT} w={1.6} />
      <LL x1={124} y1={52} x2={122} y2={60} c={TERM_MID} w={1.5} />
      <LL x1={136} y1={52} x2={136} y2={60} c={TERM_MID} w={1.5} />
      <LL x1={150} y1={52} x2={152} y2={60} c={TERM_MID} w={1.5} />
      <LP d="M 162 46 C 170 44, 176 46, 180 50" c={TERM_MID} w={1.6} />
      <LR x={118} y={82} width={52} height={14} c={TERM_MID} w={1.8} />
      <LP d="M 112 82 L 144 68 L 176 82" c={TERM_PHOS} w={2} />
      <LR x={128} y={94} width={32} height={12} c={TERM_DIM} w={1.6} />
      <LP d="M 122 94 L 144 84 L 166 94" c={TERM_MID} w={1.7} />
      <LPoly points="126,106 162,106 146,118" close c={TERM_DIM} w={1.6} />
      <LDot cx={144} cy={74} r={2} c={TERM_SOFT} />
    </TermSceneRoot>
  );
}

// Yellowstone — the ranch: snow-capped range behind, a red-barn
// outline, split-rail fence, and a horse at rest in the field.
export function TermTvYellowstoneScene() {
  return (
    <TermSceneRoot>
      <LC cx={106} cy={18} r={8} c={TERM_SOFT} w={1.8} />
      <LP d="M 88 62 L 122 30 L 142 48 L 160 28 L 196 62" c={TERM_MID} w={1.9} />
      <LP d="M 152 38 L 160 28 L 168 38 L 164 42 L 160 36 L 156 42 Z" c={TERM_SOFT} w={1.4} />
      <LP d="M 116 40 L 122 30 L 128 40 L 125 43 L 122 38 L 119 43 Z" c={TERM_SOFT} w={1.4} />
      <LL x1={0} y1={86} x2={200} y2={86} c={TERM_MID} w={1.7} />
      <LR x={96} y={58} width={34} height={28} c={TERM_DIM} w={1.7} />
      <LP d="M 94 58 L 113 46 L 132 58" c={TERM_DIM} w={1.7} />
      <LP d="M 102 86 L 124 64 M 124 86 L 102 64" c={TERM_DIM} w={1.4} />
      <LL x1={138} y1={78} x2={196} y2={78} c={TERM_MID} w={1.6} />
      <LL x1={144} y1={70} x2={144} y2={88} c={TERM_MID} w={1.6} />
      <LL x1={168} y1={70} x2={168} y2={88} c={TERM_MID} w={1.6} />
      <LP d="M 142 104 C 142 92, 152 86, 166 86 L 176 86 C 184 86, 188 92, 188 100" c={TERM_PHOS} w={2} />
      <LP d="M 176 86 C 180 78, 188 74, 194 78 L 196 88 C 190 90, 184 90, 180 94" c={TERM_PHOS} w={1.9} />
      <LL x1={146} y1={102} x2={144} y2={112} c={TERM_PHOS} w={1.9} />
      <LL x1={158} y1={100} x2={158} y2={112} c={TERM_PHOS} w={1.9} />
      <LL x1={180} y1={100} x2={182} y2={112} c={TERM_PHOS} w={1.9} />
      <LP d="M 142 90 C 136 92, 134 98, 136 104" c={TERM_SOFT} w={1.7} />
      <LDot cx={192} cy={82} r={1.2} c={TERM_PHOS} />
    </TermSceneRoot>
  );
}

// The Boys — a hero tower over the city and a caped figure
// cutting diagonally across its face, contrail and all.
export function TermTvBoysScene() {
  return (
    <TermSceneRoot>
      <LDot cx={98} cy={16} r={1.4} c={TERM_MID} />
      <LDot cx={124} cy={10} r={1.4} c={TERM_SOFT} />
      <LDot cx={188} cy={14} r={1.4} c={TERM_MID} />
      <LR x={142} y={30} width={36} height={76} c={TERM_PHOS} w={2.1} />
      <LP d="M 142 30 L 160 16 L 178 30" c={TERM_MID} w={1.8} />
      <LL x1={160} y1={16} x2={160} y2={8} c={TERM_MID} w={1.6} />
      <LR x={150} y={42} width={8} height={8} c={TERM_MID} w={1.4} />
      <LR x={164} y={58} width={8} height={8} c={TERM_SOFT} w={1.4} />
      <LR x={150} y={74} width={8} height={8} c={TERM_MID} w={1.4} />
      <LR x={96} y={66} width={22} height={40} c={TERM_DIM} w={1.7} />
      <LR x={184} y={58} width={14} height={48} c={TERM_DIM} w={1.7} />
      <LP d="M 100 62 C 112 50, 124 44, 136 42" c={TERM_SOFT} w={1.8} />
      <LC cx={140} cy={41} r={4} c={TERM_PHOS} w={1.8} />
      <LP d="M 136 45 L 126 52 L 132 54 L 124 62 L 140 52 L 146 54" c={TERM_PHOS} w={1.8} />
      <LP d="M 126 52 L 112 58 L 124 62" c={TERM_MID} w={1.6} />
      <LL x1={0} y1={106} x2={200} y2={106} c={TERM_DIM} w={1.6} />
    </TermSceneRoot>
  );
}

// You — the bookstore vault: shelves of spines behind glass,
// and one reader seated inside the cage with a book.
export function TermTvYouScene() {
  return (
    <TermSceneRoot>
      <LR x={94} y={18} width={100} height={88} c={TERM_MID} w={1.9} />
      <LL x1={94} y1={48} x2={194} y2={48} c={TERM_DIM} w={1.5} />
      <LL x1={94} y1={78} x2={194} y2={78} c={TERM_DIM} w={1.5} />
      <LR x={100} y={26} width={7} height={20} c={TERM_DIM} w={1.4} />
      <LR x={112} y={24} width={7} height={22} c={TERM_DIM} w={1.4} />
      <LR x={124} y={27} width={7} height={19} c={TERM_DIM} w={1.4} />
      <LR x={168} y={25} width={7} height={21} c={TERM_DIM} w={1.4} />
      <LR x={180} y={27} width={7} height={19} c={TERM_DIM} w={1.4} />
      <LR x={102} y={84} width={7} height={20} c={TERM_DIM} w={1.4} />
      <LR x={178} y={84} width={7} height={20} c={TERM_DIM} w={1.4} />
      <LR x={112} y={52} width={64} height={50} c={TERM_PHOS} w={2} />
      <LL x1={112} y1={64} x2={176} y2={64} c={TERM_MID} w={1.4} />
      <LDot cx={170} cy={84} r={1.8} c={TERM_SOFT} />
      <TFigure x={138} y={100} s={0.8} c={TERM_SOFT} pose="sit" />
      <LP d="M 146 84 L 156 81 L 156 90 L 146 92 Z" c={TERM_PHOS} w={1.6} />
    </TermSceneRoot>
  );
}

// Chucky — a playroom after hours: blind-slat window, an open
// toy box, scattered playthings, and a small seated doll.
export function TermTvChuckyScene() {
  return (
    <TermSceneRoot>
      <LR x={150} y={14} width={38} height={38} c={TERM_MID} w={1.8} />
      <LL x1={150} y1={24} x2={188} y2={24} c={TERM_DIM} w={1.4} />
      <LL x1={150} y1={33} x2={188} y2={33} c={TERM_DIM} w={1.4} />
      <LL x1={150} y1={42} x2={188} y2={42} c={TERM_DIM} w={1.4} />
      <LL x1={0} y1={100} x2={200} y2={100} c={TERM_DIM} w={1.6} />
      <LP d="M 104 100 L 108 76 L 156 76 L 160 100 Z" c={TERM_PHOS} w={2} />
      <LP d="M 108 76 L 96 62 L 154 62 L 156 76" c={TERM_MID} w={1.8} />
      <LC cx={132} cy={52} r={8} c={TERM_PHOS} w={2} />
      <LP d="M 124 46 C 122 40, 128 36, 132 40 C 136 36, 142 40, 140 46" c={TERM_SOFT} w={1.6} />
      <LP d="M 124 58 L 118 70 M 140 58 L 148 68" c={TERM_PHOS} w={1.8} />
      <LL x1={148} y1={68} x2={158} y2={60} c={TERM_SOFT} w={1.7} />
      <LPoly points="158,60 164,58 159,64" close c={TERM_SOFT} w={1.4} />
      <LR x={168} y={90} width={10} height={10} c={TERM_MID} w={1.6} />
      <LC cx={96} cy={94} r={5} c={TERM_MID} w={1.6} />
      <LR x={182} y={92} width={8} height={8} c={TERM_DIM} w={1.5} />
    </TermSceneRoot>
  );
}

// Lost — the island: a broken fuselage on the sand, a bent
// palm, drifting smoke, and the hatch wheel half-buried.
export function TermTvLostScene() {
  return (
    <TermSceneRoot>
      <LC cx={108} cy={18} r={8} c={TERM_SOFT} w={1.9} />
      <LL x1={0} y1={84} x2={200} y2={84} c={TERM_MID} w={1.7} />
      <LP d="M 96 96 L 128 96" c={TERM_MID} w={1.5} dash="6 4" />
      <LP d="M 100 66 C 118 56, 142 54, 158 60 L 156 72 C 138 66, 118 68, 104 74 Z" c={TERM_PHOS} w={2.1} />
      <LDot cx={116} cy={65} r={1.7} c={TERM_SOFT} />
      <LDot cx={128} cy={63} r={1.7} c={TERM_MID} />
      <LDot cx={140} cy={63} r={1.7} c={TERM_MID} />
      <LP d="M 156 60 L 172 48 L 174 58 L 162 66" c={TERM_MID} w={1.8} />
      <LP d="M 124 54 C 122 46, 128 42, 126 34 C 124 28, 130 24, 134 28" c={TERM_DIM} w={1.6} />
      <LP d="M 184 84 C 182 64, 178 48, 168 36" c={TERM_MID} w={2} />
      <LP d="M 168 36 C 158 28, 148 28, 142 34" c={TERM_MID} w={1.8} />
      <LP d="M 168 36 C 170 26, 178 20, 186 22" c={TERM_MID} w={1.8} />
      <LC cx={112} cy={102} r={7} c={TERM_SOFT} w={1.8} />
      <LL x1={105} y1={102} x2={119} y2={102} c={TERM_SOFT} w={1.5} />
      <LL x1={112} y1={95} x2={112} y2={109} c={TERM_SOFT} w={1.5} />
    </TermSceneRoot>
  );
}

// Prison Break — the yard at night: watchtower with a sweeping
// beam, a high wall, and fence wire curling along the top.
export function TermTvPrisonBreakScene() {
  return (
    <TermSceneRoot>
      <LC cx={182} cy={16} r={8} c={TERM_SOFT} w={1.8} />
      <LDot cx={102} cy={14} r={1.3} c={TERM_MID} />
      <LDot cx={130} cy={22} r={1.3} c={TERM_MID} />
      <LR x={94} y={62} width={102} height={44} c={TERM_MID} w={1.9} />
      <LL x1={94} y1={76} x2={196} y2={76} c={TERM_DIM} w={1.5} />
      <LL x1={120} y1={62} x2={120} y2={106} c={TERM_DIM} w={1.4} />
      <LL x1={152} y1={62} x2={152} y2={106} c={TERM_DIM} w={1.4} />
      <LR x={130} y={30} width={22} height={32} c={TERM_PHOS} w={2} />
      <LP d="M 126 30 L 156 30 L 150 20 L 132 20 Z" c={TERM_MID} w={1.8} />
      <LR x={137} y={36} width={8} height={8} c={TERM_SOFT} w={1.5} />
      <LPoly points="141,44 178,96 160,100" close c={TERM_SOFT} w={1.4} o={0.55} />
      <LP d="M 94 56 C 108 50, 122 60, 136 54 C 150 48, 164 58, 178 52 C 186 49, 192 52, 196 56" c={TERM_PHOS} w={1.7} />
      <LC cx={116} cy={55} r={3} c={TERM_MID} w={1.3} />
      <LC cx={158} cy={54} r={3} c={TERM_MID} w={1.3} />
      <LL x1={0} y1={106} x2={200} y2={106} c={TERM_DIM} w={1.6} />
    </TermSceneRoot>
  );
}

// IT / Derry — a quiet street, a storm drain in the curb, a
// paper boat in the gutter, and one balloon rising above it.
export function TermTvItDerryScene() {
  return (
    <TermSceneRoot>
      <LR x={100} y={42} width={32} height={34} c={TERM_DIM} w={1.7} />
      <LP d="M 98 42 L 116 32 L 134 42" c={TERM_DIM} w={1.6} />
      <LR x={152} y={50} width={26} height={26} c={TERM_DIM} w={1.6} />
      <LL x1={0} y1={76} x2={200} y2={76} c={TERM_MID} w={1.8} />
      <LL x1={0} y1={92} x2={200} y2={92} c={TERM_MID} w={1.8} />
      <LR x={118} y={79} width={42} height={11} rx={3} c={TERM_PHOS} w={2} />
      <LL x1={128} y1={80} x2={128} y2={89} c={TERM_MID} w={1.5} />
      <LL x1={139} y1={80} x2={139} y2={89} c={TERM_MID} w={1.5} />
      <LL x1={150} y1={80} x2={150} y2={89} c={TERM_MID} w={1.5} />
      <LPoly points="102,98 116,98 110,92" close c={TERM_SOFT} w={1.6} />
      <LP d="M 104 98 L 114 98 L 108 103 Z" c={TERM_MID} w={1.4} />
      <LC cx={176} cy={28} r={11} c={TERM_PHOS} w={2.1} />
      <LPoly points="173,39 179,39 176,44" close c={TERM_MID} w={1.5} />
      <LP d="M 176 44 C 172 52, 180 58, 176 66 C 173 71, 178 76, 175 82" c={TERM_SOFT} w={1.6} />
      <LDot cx={172} cy={24} r={1.6} c={TERM_SOFT} />
    </TermSceneRoot>
  );
}

// Carrie — prom night from above: a disco ball, stage drapes,
// a crown set down on the floor, and a bucket tipped on its rope.
export function TermTvCarrieScene() {
  return (
    <TermSceneRoot>
      <LL x1={146} y1={6} x2={146} y2={18} c={TERM_MID} w={1.6} />
      <LC cx={146} cy={27} r={9} c={TERM_PHOS} w={2} />
      <LP d="M 138 22 C 144 26, 150 26, 155 21 M 138 32 C 144 28, 150 28, 155 33" c={TERM_MID} w={1.4} />
      <LDot cx={143} cy={27} r={1.3} c={TERM_SOFT} />
      <LDot cx={150} cy={31} r={1.3} c={TERM_SOFT} />
      <LP d="M 96 10 C 100 30, 100 52, 96 76" c={TERM_MID} w={1.8} />
      <LP d="M 196 10 C 192 30, 192 52, 196 76" c={TERM_MID} w={1.8} />
      <LP d="M 108 14 C 130 24, 162 24, 184 14" c={TERM_DIM} w={1.5} />
      <LL x1={0} y1={96} x2={200} y2={96} c={TERM_DIM} w={1.7} />
      <LPoly points="112,92 116,80 122,88 128,78 134,88 140,80 144,92" close c={TERM_SOFT} w={1.8} />
      <LDot cx={128} cy={86} r={1.5} c={TERM_PHOS} />
      <LP d="M 162 30 L 180 30 L 176 42 L 166 42 Z" c={TERM_PHOS} w={1.9} />
      <LP d="M 171 30 C 171 22, 178 18, 184 22" c={TERM_MID} w={1.6} />
      <LP d="M 171 44 C 170 48, 172 50, 171 54" c={TERM_SOFT} w={1.5} />
      <LP d="M 168 44 C 167 47, 169 49, 168 51" c={TERM_MID} w={1.3} />
    </TermSceneRoot>
  );
}

// Harry Potter — the castle across the lake: many towers and
// lit windows, a full moon, and an owl crossing with a letter.
export function TermTvHarryPotterScene() {
  return (
    <TermSceneRoot>
      <LC cx={106} cy={16} r={8} c={TERM_SOFT} w={1.9} />
      <LDot cx={132} cy={12} r={1.3} c={TERM_MID} />
      <LDot cx={188} cy={22} r={1.3} c={TERM_MID} />
      <LR x={124} y={52} width={52} height={36} c={TERM_PHOS} w={2} />
      <LR x={112} y={36} width={14} height={52} c={TERM_MID} w={1.8} />
      <LPoly points="110,36 119,22 128,36" close c={TERM_MID} w={1.7} />
      <LR x={174} y={28} width={16} height={60} c={TERM_MID} w={1.8} />
      <LPoly points="172,28 182,12 192,28" close c={TERM_MID} w={1.7} />
      <LR x={140} y={40} width={12} height={48} c={TERM_MID} w={1.7} />
      <LPoly points="138,40 146,28 154,40" close c={TERM_MID} w={1.6} />
      <LR x={131} y={60} width={6} height={7} c={TERM_SOFT} w={1.3} />
      <LR x={158} y={66} width={6} height={7} c={TERM_SOFT} w={1.3} />
      <LR x={180} y={48} width={5} height={6} c={TERM_SOFT} w={1.3} />
      <LL x1={118} y1={88} x2={196} y2={88} c={TERM_MID} w={1.7} />
      <LP d="M 122 98 L 150 98" c={TERM_MID} w={1.5} dash="5 4" />
      <LP d="M 158 104 L 188 104" c={TERM_DIM} w={1.5} dash="5 4" />
      <LP d="M 92 44 C 98 38, 106 38, 110 43 L 116 38 C 120 42, 118 47, 112 48 L 108 52 L 104 48 C 98 49, 94 48, 92 44 Z" c={TERM_SOFT} w={1.6} />
      <LR x={103} y={50} width={7} height={5} c={TERM_MID} w={1.3} />
    </TermSceneRoot>
  );
}

// Wednesday — Nevermore: a gothic tower with one great round
// window, a dead tree, iron railings, and a raven overhead.
export function TermTvWednesdayScene() {
  return (
    <TermSceneRoot>
      <LC cx={184} cy={16} r={8} c={TERM_SOFT} w={1.8} />
      <LR x={118} y={40} width={48} height={66} c={TERM_PHOS} w={2.1} />
      <LPoly points="114,40 142,18 170,40" close c={TERM_MID} w={1.9} />
      <LL x1={142} y1={18} x2={142} y2={10} c={TERM_MID} w={1.6} />
      <LC cx={142} cy={62} r={13} c={TERM_SOFT} w={2} />
      <LL x1={129} y1={62} x2={155} y2={62} c={TERM_MID} w={1.6} />
      <LL x1={142} y1={49} x2={142} y2={75} c={TERM_MID} w={1.6} />
      <LP d="M 134 52 C 138 58, 146 58, 150 52 M 134 72 C 138 66, 146 66, 150 72" c={TERM_DIM} w={1.3} />
      <LP d="M 136 106 L 136 90 C 136 84, 148 84, 148 90 L 148 106" c={TERM_MID} w={1.7} />
      <LL x1={186} y1={106} x2={186} y2={58} c={TERM_MID} w={1.9} />
      <LP d="M 186 72 C 178 64, 170 62, 164 64" c={TERM_MID} w={1.6} />
      <LP d="M 186 62 C 190 54, 195 50, 198 50" c={TERM_MID} w={1.6} />
      <LP d="M 96 28 C 100 24, 106 24, 109 27 L 114 24 C 116 27, 114 31, 109 31" c={TERM_PHOS} w={1.6} />
      <LL x1={92} y1={106} x2={200} y2={106} c={TERM_DIM} w={1.6} />
      <LL x1={98} y1={106} x2={98} y2={94} c={TERM_DIM} w={1.5} />
      <LL x1={108} y1={106} x2={108} y2={94} c={TERM_DIM} w={1.5} />
      <LL x1={176} y1={106} x2={176} y2={94} c={TERM_DIM} w={1.5} />
    </TermSceneRoot>
  );
}

// The Vampire Diaries — Mystic Falls at night: the clock tower
// over a gabled house, a low moon, and bats on the wing.
export function TermTvVampireDiariesScene() {
  return (
    <TermSceneRoot>
      <LC cx={104} cy={18} r={9} c={TERM_SOFT} w={1.9} />
      <LP d="M 118 34 C 122 30, 128 30, 131 33 L 136 30 C 138 34, 135 37, 130 37" c={TERM_MID} w={1.5} />
      <LP d="M 168 24 C 171 21, 176 21, 178 24 L 182 21 C 184 24, 182 27, 178 27" c={TERM_MID} w={1.5} />
      <LR x={132} y={34} width={26} height={72} c={TERM_PHOS} w={2.1} />
      <LPoly points="129,34 145,20 161,34" close c={TERM_MID} w={1.8} />
      <LC cx={145} cy={52} r={8} c={TERM_SOFT} w={1.8} />
      <LL x1={145} y1={52} x2={145} y2={45} c={TERM_PHOS} w={1.6} />
      <LL x1={145} y1={52} x2={151} y2={55} c={TERM_PHOS} w={1.6} />
      <LR x={139} y={72} width={12} height={12} c={TERM_MID} w={1.5} />
      <LP d="M 137 106 L 137 90 C 137 84, 153 84, 153 90 L 153 106" c={TERM_MID} w={1.7} />
      <LR x={96} y={70} width={30} height={36} c={TERM_MID} w={1.8} />
      <LP d="M 94 70 L 111 58 L 128 70" c={TERM_MID} w={1.7} />
      <LR x={106} y={82} width={9} height={9} c={TERM_SOFT} w={1.4} />
      <LR x={166} y={78} width={26} height={28} c={TERM_DIM} w={1.7} />
      <LP d="M 164 78 L 179 68 L 194 78" c={TERM_DIM} w={1.6} />
      <LL x1={0} y1={106} x2={200} y2={106} c={TERM_DIM} w={1.6} />
    </TermSceneRoot>
  );
}

// The Originals — a French Quarter house: stacked balconies
// with iron rails, tall shutters, and gas lanterns burning.
export function TermTvOriginalsScene() {
  return (
    <TermSceneRoot>
      <LC cx={182} cy={16} r={7} c={TERM_SOFT} w={1.8} />
      <LP d="M 184 10 C 180 14, 180 20, 184 24" c={TERM_DIM} w={1.4} />
      <LR x={104} y={24} width={72} height={82} c={TERM_PHOS} w={2.1} />
      <LL x1={100} y1={52} x2={180} y2={52} c={TERM_SOFT} w={1.9} />
      <LL x1={100} y1={80} x2={180} y2={80} c={TERM_SOFT} w={1.9} />
      <LL x1={108} y1={52} x2={108} y2={62} c={TERM_MID} w={1.4} />
      <LL x1={120} y1={52} x2={120} y2={62} c={TERM_MID} w={1.4} />
      <LL x1={132} y1={52} x2={132} y2={62} c={TERM_MID} w={1.4} />
      <LL x1={148} y1={52} x2={148} y2={62} c={TERM_MID} w={1.4} />
      <LL x1={160} y1={52} x2={160} y2={62} c={TERM_MID} w={1.4} />
      <LL x1={172} y1={52} x2={172} y2={62} c={TERM_MID} w={1.4} />
      <LL x1={108} y1={80} x2={108} y2={90} c={TERM_MID} w={1.4} />
      <LL x1={124} y1={80} x2={124} y2={90} c={TERM_MID} w={1.4} />
      <LL x1={156} y1={80} x2={156} y2={90} c={TERM_MID} w={1.4} />
      <LL x1={172} y1={80} x2={172} y2={90} c={TERM_MID} w={1.4} />
      <LR x={114} y={30} width={12} height={20} c={TERM_MID} w={1.5} />
      <LR x={154} y={30} width={12} height={20} c={TERM_MID} w={1.5} />
      <LP d="M 134 106 L 134 92 C 134 86, 146 86, 146 92 L 146 106" c={TERM_MID} w={1.7} />
      <LL x1={94} y1={106} x2={94} y2={72} c={TERM_MID} w={1.7} />
      <LR x={89} y={62} width={10} height={12} rx={2} c={TERM_SOFT} w={1.6} />
      <LDot cx={94} cy={68} r={1.7} c={TERM_PHOS} />
      <LL x1={188} y1={106} x2={188} y2={72} c={TERM_MID} w={1.7} />
      <LR x={183} y={62} width={10} height={12} rx={2} c={TERM_SOFT} w={1.6} />
      <LDot cx={188} cy={68} r={1.7} c={TERM_PHOS} />
    </TermSceneRoot>
  );
}

// Legacies — the Salvatore School: a columned mansion behind
// its gates, moonlit, with stray magic drifting in the grounds.
export function TermTvLegaciesScene() {
  return (
    <TermSceneRoot>
      <LC cx={108} cy={16} r={8} c={TERM_SOFT} w={1.8} />
      <LR x={112} y={46} width={72} height={44} c={TERM_PHOS} w={2.1} />
      <LP d="M 108 46 L 148 30 L 188 46" c={TERM_MID} w={1.9} />
      <LPoly points="140,38 148,30 156,38" close c={TERM_MID} w={1.5} />
      <LL x1={120} y1={52} x2={120} y2={84} c={TERM_MID} w={1.6} />
      <LL x1={136} y1={52} x2={136} y2={84} c={TERM_MID} w={1.6} />
      <LL x1={160} y1={52} x2={160} y2={84} c={TERM_MID} w={1.6} />
      <LL x1={176} y1={52} x2={176} y2={84} c={TERM_MID} w={1.6} />
      <LR x={142} y={64} width={12} height={26} c={TERM_SOFT} w={1.6} />
      <LR x={122} y={56} width={7} height={7} c={TERM_MID} w={1.3} />
      <LR x={167} y={56} width={7} height={7} c={TERM_MID} w={1.3} />
      <LL x1={0} y1={100} x2={200} y2={100} c={TERM_MID} w={1.7} />
      <LL x1={98} y1={100} x2={98} y2={82} c={TERM_MID} w={1.7} />
      <LL x1={192} y1={100} x2={192} y2={82} c={TERM_MID} w={1.7} />
      <LP d="M 98 88 C 124 82, 166 82, 192 88" c={TERM_DIM} w={1.5} />
      <LDot cx={118} cy={96} r={1.9} c={TERM_PHOS} />
      <LDot cx={148} cy={102} r={1.6} c={TERM_SOFT} o={0.8} />
      <LDot cx={176} cy={95} r={1.9} c={TERM_PHOS} />
      <LDot cx={132} cy={76} r={1.4} c={TERM_SOFT} o={0.7} />
      <LDot cx={164} cy={70} r={1.4} c={TERM_SOFT} o={0.7} />
    </TermSceneRoot>
  );
}
