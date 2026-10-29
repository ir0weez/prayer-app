// Terminal skin label scenes (v186) — Pip-Boy line art dialect.
// Monochrome phosphor-green outline drawings on the dark panel:
// clean single-color strokes, thin outlines, little or no fill.
// Each scene is a bespoke composition modeled on the pixel label
// scenes, translated from blocks into Vault-Tec style line art,
// with the main subject biased to the right half of the canvas.

import { TermSceneRoot, LP, LC, LR, LL, LPoly, LDot, TFigure, TERM_PHOS, TERM_SOFT, TERM_MID, TERM_DIM } from "@/components/terminal-kit";

export function TermBBQScene() {
  return (
    <TermSceneRoot>
      <LL x1={8} y1={102} x2={192} y2={102} c={TERM_DIM} w={1.8} />
      <LP d="M 112 62 A 34 22 0 0 1 180 62" c={TERM_PHOS} w={2.2} />
      <LL x1={108} y1={62} x2={184} y2={62} c={TERM_PHOS} w={2.2} />
      <LL x1={118} y1={70} x2={174} y2={70} c={TERM_MID} w={1.6} />
      <LL x1={120} y1={62} x2={114} y2={100} c={TERM_PHOS} w={2} />
      <LL x1={172} y1={62} x2={178} y2={100} c={TERM_PHOS} w={2} />
      <LL x1={146} y1={62} x2={146} y2={82} c={TERM_MID} w={1.6} />
      <LP d="M 132 52 C 128 46 136 42 132 36" c={TERM_SOFT} w={1.8} />
      <LP d="M 148 54 C 144 48 152 44 148 38" c={TERM_SOFT} w={1.8} />
      <LP d="M 162 52 C 158 46 166 42 162 36" c={TERM_SOFT} w={1.8} />
      <LP d="M 138 20 C 142 16 150 16 154 20" c={TERM_MID} w={1.6} />
    </TermSceneRoot>
  );
}

export function TermFastScene() {
  return (
    <TermSceneRoot>
      <LL x1={8} y1={102} x2={192} y2={102} c={TERM_DIM} w={1.8} />
      <LP d="M 118 78 A 30 24 0 0 1 178 78" c={TERM_PHOS} w={2.2} />
      <LL x1={112} y1={78} x2={184} y2={78} c={TERM_PHOS} w={2.2} />
      <LC cx={148} cy={52} r={3.5} c={TERM_SOFT} w={1.8} />
      <LL x1={104} y1={92} x2={192} y2={92} c={TERM_MID} w={1.8} />
      <LR x={182} y={62} width={10} height={28} c={TERM_MID} w={1.8} />
      <LP d="M 187 62 C 184 56 190 52 187 46 C 184 52 190 56 187 62" c={TERM_SOFT} w={1.6} />
      <LDot cx={122} cy={34} r={1.8} c={TERM_SOFT} />
      <LDot cx={172} cy={28} r={1.8} c={TERM_SOFT} />
      <LP d="M 128 88 L 168 88" c={TERM_DIM} w={1.6} dash="3 4" />
    </TermSceneRoot>
  );
}

export function TermWorshipScene() {
  return (
    <TermSceneRoot>
      <LL x1={8} y1={104} x2={192} y2={104} c={TERM_DIM} w={1.8} />
      <LL x1={118} y1={10} x2={132} y2={52} c={TERM_DIM} w={1.6} />
      <LL x1={172} y1={10} x2={160} y2={52} c={TERM_DIM} w={1.6} />
      <TFigure x={126} y={102} s={1.05} pose="armsUp" />
      <TFigure x={152} y={104} s={1.15} pose="armsUp" />
      <TFigure x={178} y={102} s={1.0} pose="armsUp" c={TERM_SOFT} />
      <LDot cx={106} cy={30} r={2.2} c={TERM_PHOS} />
      <LL x1={108} y1={30} x2={108} y2={18} c={TERM_PHOS} w={1.8} />
      <LP d="M 108 18 C 112 16 116 18 118 14" c={TERM_PHOS} w={1.6} />
      <LDot cx={188} cy={22} r={2} c={TERM_SOFT} />
      <LL x1={190} y1={22} x2={190} y2={12} c={TERM_SOFT} w={1.6} />
    </TermSceneRoot>
  );
}

export function TermBibleStudyScene() {
  return (
    <TermSceneRoot>
      <LL x1={8} y1={102} x2={192} y2={102} c={TERM_DIM} w={1.8} />
      <LP d="M 146 58 C 136 50 124 48 114 52 L 114 88 C 124 84 136 86 146 94 C 156 86 168 84 178 88 L 178 52 C 168 48 156 50 146 58 Z" c={TERM_PHOS} w={2.1} />
      <LL x1={146} y1={58} x2={146} y2={94} c={TERM_MID} w={1.6} />
      <LL x1={122} y1={62} x2={138} y2={60} c={TERM_SOFT} w={1.5} />
      <LL x1={122} y1={72} x2={138} y2={70} c={TERM_SOFT} w={1.5} />
      <LL x1={154} y1={60} x2={170} y2={62} c={TERM_SOFT} w={1.5} />
      <LL x1={154} y1={70} x2={170} y2={72} c={TERM_SOFT} w={1.5} />
      <LL x1={182} y1={88} x2={182} y2={58} c={TERM_MID} w={1.8} />
      <LP d="M 172 58 L 192 58 L 187 44 L 177 44 Z" c={TERM_PHOS} w={1.9} />
      <LL x1={176} y1={38} x2={172} y2={30} c={TERM_SOFT} w={1.5} />
      <LL x1={188} y1={38} x2={192} y2={30} c={TERM_SOFT} w={1.5} />
      <TFigure x={102} y={100} s={0.85} pose="sit" c={TERM_MID} />
    </TermSceneRoot>
  );
}

export function TermTherapyScene() {
  return (
    <TermSceneRoot>
      <LL x1={8} y1={102} x2={192} y2={102} c={TERM_DIM} w={1.8} />
      <LR x={112} y={58} width={26} height={30} rx={4} c={TERM_PHOS} w={2} />
      <LL x1={116} y1={88} x2={116} y2={100} c={TERM_PHOS} w={1.8} />
      <LL x1={134} y1={88} x2={134} y2={100} c={TERM_PHOS} w={1.8} />
      <LR x={158} y={58} width={26} height={30} rx={4} c={TERM_SOFT} w={2} />
      <LL x1={162} y1={88} x2={162} y2={100} c={TERM_SOFT} w={1.8} />
      <LL x1={180} y1={88} x2={180} y2={100} c={TERM_SOFT} w={1.8} />
      <LC cx={125} cy={48} r={7} c={TERM_PHOS} w={1.9} />
      <LC cx={171} cy={48} r={7} c={TERM_SOFT} w={1.9} />
      <LP d="M 138 30 C 138 20 148 14 158 16 C 168 14 176 22 174 32 C 172 40 164 44 156 42 L 146 46 L 148 38 C 142 36 138 34 138 30 Z" c={TERM_MID} w={1.7} />
      <LDot cx={148} cy={28} r={1.7} c={TERM_MID} />
      <LDot cx={157} cy={28} r={1.7} c={TERM_MID} />
      <LDot cx={166} cy={28} r={1.7} c={TERM_MID} />
    </TermSceneRoot>
  );
}

export function TermDoctorScene() {
  return (
    <TermSceneRoot>
      <LL x1={8} y1={104} x2={192} y2={104} c={TERM_DIM} w={1.8} />
      <LR x={124} y={22} width={48} height={72} rx={3} c={TERM_PHOS} w={2.2} />
      <LR x={138} y={14} width={20} height={12} rx={3} c={TERM_MID} w={1.8} />
      <LL x1={148} y1={36} x2={148} y2={56} c={TERM_PHOS} w={2.4} />
      <LL x1={138} y1={46} x2={158} y2={46} c={TERM_PHOS} w={2.4} />
      <LP d="M 132 72 L 142 72 L 146 62 L 152 80 L 156 72 L 164 72" c={TERM_SOFT} w={1.8} />
      <LL x1={132} y1={84} x2={158} y2={84} c={TERM_MID} w={1.5} />
      <TFigure x={106} y={102} s={0.9} c={TERM_MID} />
      <LC cx={184} cy={30} r={8} c={TERM_MID} w={1.6} />
      <LL x1={184} y1={25} x2={184} y2={30} c={TERM_MID} w={1.6} />
      <LL x1={184} y1={30} x2={188} y2={33} c={TERM_MID} w={1.6} />
    </TermSceneRoot>
  );
}

export function TermHaircutScene() {
  return (
    <TermSceneRoot>
      <LL x1={8} y1={104} x2={192} y2={104} c={TERM_DIM} w={1.8} />
      <LR x={126} y={16} width={52} height={62} rx={4} c={TERM_PHOS} w={2.1} />
      <LC cx={152} cy={44} r={13} c={TERM_SOFT} w={2} />
      <LP d="M 139 38 C 142 28 162 28 165 38 C 158 34 146 34 139 38 Z" c={TERM_PHOS} w={1.9} />
      <LL x1={134} y1={70} x2={146} y2={58} c={TERM_MID} w={1.4} />
      <LC cx={112} cy={84} r={5} c={TERM_PHOS} w={1.8} />
      <LC cx={112} cy={98} r={5} c={TERM_PHOS} w={1.8} />
      <LL x1={116} y1={87} x2={132} y2={100} c={TERM_PHOS} w={1.8} />
      <LL x1={116} y1={95} x2={132} y2={82} c={TERM_PHOS} w={1.8} />
      <LDot cx={138} cy={96} r={1.6} c={TERM_MID} />
      <LDot cx={152} cy={100} r={1.6} c={TERM_MID} />
      <LDot cx={166} cy={95} r={1.6} c={TERM_MID} />
      <LL x1={126} y1={84} x2={178} y2={84} c={TERM_DIM} w={1.6} />
    </TermSceneRoot>
  );
}

export function TermGardeningScene() {
  return (
    <TermSceneRoot>
      <LL x1={8} y1={100} x2={192} y2={100} c={TERM_DIM} w={1.8} />
      <LP d="M 104 100 C 120 96 176 96 192 100" c={TERM_MID} w={1.6} />
      <LL x1={126} y1={100} x2={126} y2={72} c={TERM_PHOS} w={2} />
      <LP d="M 126 82 C 116 82 110 76 110 68 C 118 68 124 74 126 82" c={TERM_PHOS} w={1.9} />
      <LP d="M 126 76 C 126 68 132 62 140 62 C 140 70 134 76 126 76" c={TERM_SOFT} w={1.9} />
      <LL x1={152} y1={100} x2={152} y2={80} c={TERM_PHOS} w={2} />
      <LP d="M 152 88 C 144 88 140 84 140 78 C 146 78 150 82 152 88" c={TERM_SOFT} w={1.7} />
      <LP d="M 152 84 C 154 78 158 74 164 74 C 164 80 158 84 152 84" c={TERM_PHOS} w={1.7} />
      <LL x1={174} y1={100} x2={174} y2={86} c={TERM_MID} w={1.8} />
      <LC cx={174} cy={80} r={5} c={TERM_MID} w={1.7} />
      <LP d="M 84 86 L 100 86 L 96 100 L 88 100 Z" c={TERM_MID} w={1.8} />
      <LP d="M 92 86 C 92 74 98 68 106 66" c={TERM_MID} w={1.8} />
      <LDot cx={108} cy={72} r={1.7} c={TERM_SOFT} />
      <LDot cx={112} cy={80} r={1.7} c={TERM_SOFT} />
      <LDot cx={106} cy={88} r={1.7} c={TERM_SOFT} />
    </TermSceneRoot>
  );
}

export function TermMowLawnScene() {
  return (
    <TermSceneRoot>
      <LL x1={8} y1={102} x2={192} y2={102} c={TERM_DIM} w={1.8} />
      <LL x1={108} y1={102} x2={116} y2={102} c={TERM_MID} w={1.6} />
      <LP d="M 122 84 L 172 84 L 178 96 L 128 96 Z" c={TERM_PHOS} w={2.1} />
      <LP d="M 134 84 C 134 74 142 68 152 68 C 162 68 168 74 168 84" c={TERM_PHOS} w={2} />
      <LC cx={132} cy={98} r={7} c={TERM_PHOS} w={2} />
      <LC cx={168} cy={98} r={7} c={TERM_PHOS} w={2} />
      <LL x1={124} y1={86} x2={102} y2={58} c={TERM_MID} w={2} />
      <LL x1={102} y1={58} x2={114} y2={54} c={TERM_MID} w={2} />
      <LC cx={184} cy={22} r={9} c={TERM_SOFT} w={1.8} />
      <LP d="M 104 106 L 106 98 L 108 106 M 186 106 L 188 98 L 190 106" c={TERM_MID} w={1.5} />
      <LP d="M 60 102 L 96 102" c={TERM_DIM} w={1.6} dash="4 5" />
    </TermSceneRoot>
  );
}

export function TermPruneScene() {
  return (
    <TermSceneRoot>
      <LL x1={8} y1={104} x2={192} y2={104} c={TERM_DIM} w={1.8} />
      <LL x1={148} y1={104} x2={148} y2={72} c={TERM_MID} w={2.4} />
      <LP d="M 148 84 C 138 78 132 70 130 60" c={TERM_MID} w={1.8} />
      <LP d="M 148 78 C 158 72 164 64 166 54" c={TERM_MID} w={1.8} />
      <LC cx={132} cy={46} r={17} c={TERM_PHOS} w={2} />
      <LC cx={156} cy={36} r={19} c={TERM_PHOS} w={2} />
      <LC cx={176} cy={50} r={14} c={TERM_SOFT} w={1.9} />
      <LC cx={106} cy={62} r={4.5} c={TERM_PHOS} w={1.7} />
      <LC cx={106} cy={74} r={4.5} c={TERM_PHOS} w={1.7} />
      <LL x1={109} y1={65} x2={122} y2={76} c={TERM_PHOS} w={1.7} />
      <LL x1={109} y1={71} x2={122} y2={60} c={TERM_PHOS} w={1.7} />
      <LP d="M 128 92 C 124 96 120 96 118 100" c={TERM_SOFT} w={1.6} />
      <LP d="M 172 88 C 168 92 164 92 162 96" c={TERM_SOFT} w={1.6} />
      <TFigure x={96} y={102} s={0.85} c={TERM_MID} />
    </TermSceneRoot>
  );
}

export function TermHarvestScene() {
  return (
    <TermSceneRoot>
      <LL x1={8} y1={102} x2={192} y2={102} c={TERM_DIM} w={1.8} />
      <LC cx={182} cy={20} r={9} c={TERM_SOFT} w={1.8} />
      <LL x1={122} y1={100} x2={122} y2={48} c={TERM_PHOS} w={2} />
      <LP d="M 122 62 C 114 58 112 50 114 44 C 120 46 122 52 122 62 M 122 62 C 130 58 132 50 130 44 C 124 46 122 52 122 62" c={TERM_SOFT} w={1.6} />
      <LL x1={140} y1={100} x2={140} y2={54} c={TERM_PHOS} w={2} />
      <LP d="M 140 68 C 132 64 130 56 132 50 C 138 52 140 58 140 68 M 140 68 C 148 64 150 56 148 50 C 142 52 140 58 140 68" c={TERM_SOFT} w={1.6} />
      <LL x1={158} y1={100} x2={158} y2={48} c={TERM_PHOS} w={2} />
      <LP d="M 158 62 C 150 58 148 50 150 44 C 156 46 158 52 158 62 M 158 62 C 166 58 168 50 166 44 C 160 46 158 52 158 62" c={TERM_SOFT} w={1.6} />
      <LP d="M 108 84 L 186 84 L 180 102 L 114 102 Z" c={TERM_MID} w={1.9} />
      <LL x1={112} y1={93} x2={182} y2={93} c={TERM_MID} w={1.5} />
    </TermSceneRoot>
  );
}

export function TermParkScene() {
  return (
    <TermSceneRoot>
      <LL x1={8} y1={102} x2={192} y2={102} c={TERM_DIM} w={1.8} />
      <LC cx={108} cy={22} r={8} c={TERM_SOFT} w={1.7} />
      <LP d="M 118 20 C 124 14 134 14 138 20 C 146 16 154 22 152 30 L 116 30 C 112 26 114 20 118 20 Z" c={TERM_MID} w={1.6} />
      <LL x1={146} y1={100} x2={146} y2={62} c={TERM_MID} w={2.4} />
      <LC cx={132} cy={44} r={16} c={TERM_PHOS} w={2} />
      <LC cx={154} cy={34} r={18} c={TERM_PHOS} w={2} />
      <LC cx={172} cy={46} r={13} c={TERM_SOFT} w={1.8} />
      <LL x1={104} y1={88} x2={140} y2={88} c={TERM_PHOS} w={2} />
      <LL x1={106} y1={78} x2={138} y2={78} c={TERM_PHOS} w={1.8} />
      <LL x1={110} y1={88} x2={110} y2={100} c={TERM_PHOS} w={1.8} />
      <LL x1={134} y1={88} x2={134} y2={100} c={TERM_PHOS} w={1.8} />
      <LP d="M 60 104 L 96 104 L 88 92" c={TERM_DIM} w={1.6} />
    </TermSceneRoot>
  );
}

export function TermPartyScene() {
  return (
    <TermSceneRoot>
      <LL x1={8} y1={104} x2={192} y2={104} c={TERM_DIM} w={1.8} />
      <LP d="M 96 12 C 124 26 164 26 194 12" c={TERM_MID} w={1.8} />
      <LPoly points="108,19 118,19 113,30" close c={TERM_PHOS} w={1.7} />
      <LPoly points="132,23 142,23 137,34" close c={TERM_SOFT} w={1.7} />
      <LPoly points="156,23 166,23 161,34" close c={TERM_PHOS} w={1.7} />
      <LPoly points="178,19 188,19 183,30" close c={TERM_SOFT} w={1.7} />
      <LC cx={124} cy={58} r={11} c={TERM_PHOS} w={2} />
      <LP d="M 124 69 C 122 76 126 78 124 84 C 122 88 126 90 124 94" c={TERM_MID} w={1.5} />
      <LC cx={156} cy={52} r={13} c={TERM_SOFT} w={2} />
      <LP d="M 156 65 C 154 72 158 74 156 80" c={TERM_MID} w={1.5} />
      <LC cx={184} cy={60} r={10} c={TERM_PHOS} w={2} />
      <LDot cx={104} cy={84} r={1.8} c={TERM_PHOS} />
      <LDot cx={140} cy={92} r={1.8} c={TERM_SOFT} />
      <LDot cx={172} cy={88} r={1.8} c={TERM_PHOS} />
    </TermSceneRoot>
  );
}

export function TermSchoolScene() {
  return (
    <TermSceneRoot>
      <LL x1={8} y1={104} x2={192} y2={104} c={TERM_DIM} w={1.8} />
      <LR x={112} y={48} width={76} height={54} c={TERM_PHOS} w={2.1} />
      <LPoly points="104,48 150,26 196,48" close={false} c={TERM_PHOS} w={2.2} />
      <LL x1={150} y1={26} x2={150} y2={12} c={TERM_MID} w={1.8} />
      <LPoly points="150,12 164,15 150,19" close c={TERM_SOFT} w={1.6} />
      <LR x={142} y={76} width={16} height={26} c={TERM_MID} w={1.9} />
      <LR x={120} y={58} width={14} height={14} c={TERM_SOFT} w={1.6} />
      <LR x={166} y={58} width={14} height={14} c={TERM_SOFT} w={1.6} />
      <LC cx={150} cy={40} r={5} c={TERM_MID} w={1.6} />
      <LP d="M 94 96 L 108 96 L 106 84 L 96 84 Z M 96 90 L 107 90" c={TERM_MID} w={1.6} />
    </TermSceneRoot>
  );
}

export function TermWaterParkScene() {
  return (
    <TermSceneRoot>
      <LP d="M 8 104 C 40 100 80 106 120 102 C 150 100 175 104 192 102" c={TERM_DIM} w={1.8} dash="5 4" />
      <LL x1={118} y1={100} x2={118} y2={28} c={TERM_MID} w={2.2} />
      <LL x1={136} y1={100} x2={136} y2={28} c={TERM_MID} w={2.2} />
      <LR x={112} y={20} width={52} height={10} c={TERM_PHOS} w={2} />
      <LP d="M 138 30 C 170 34 186 48 182 66 C 179 80 164 84 152 78" c={TERM_PHOS} w={2.4} />
      <LP d="M 142 40 C 162 44 172 52 170 62" c={TERM_SOFT} w={1.7} />
      <LC cx={146} cy={94} r={11} c={TERM_PHOS} w={2} />
      <LC cx={146} cy={94} r={5} c={TERM_SOFT} w={1.6} />
      <LDot cx={176} cy={86} r={1.8} c={TERM_SOFT} />
      <LDot cx={186} cy={92} r={1.8} c={TERM_SOFT} />
      <LDot cx={168} cy={94} r={1.8} c={TERM_SOFT} />
      <LC cx={104} cy={18} r={7} c={TERM_SOFT} w={1.6} />
    </TermSceneRoot>
  );
}

export function TermBeachScene() {
  return (
    <TermSceneRoot>
      <LP d="M 8 58 C 30 54 50 60 76 56" c={TERM_DIM} w={1.6} dash="5 4" />
      <LP d="M 8 68 C 30 64 52 70 78 66" c={TERM_DIM} w={1.6} dash="5 4" />
      <LL x1={8} y1={102} x2={192} y2={102} c={TERM_DIM} w={1.8} />
      <LL x1={148} y1={102} x2={148} y2={52} c={TERM_MID} w={2} />
      <LP d="M 110 54 C 124 38 172 38 186 54 C 172 48 160 50 148 54 C 136 50 122 48 110 54 Z" c={TERM_PHOS} w={2.1} />
      <LL x1={148} y1={52} x2={128} y2={40} c={TERM_MID} w={1.5} />
      <LL x1={148} y1={52} x2={168} y2={40} c={TERM_MID} w={1.5} />
      <LR x={122} y={88} width={46} height={10} rx={2} c={TERM_SOFT} w={1.8} />
      <LC cx={182} cy={88} r={9} c={TERM_PHOS} w={1.9} />
      <LP d="M 175 82 C 180 88 184 88 189 82" c={TERM_MID} w={1.5} />
      <LC cx={106} cy={20} r={8} c={TERM_SOFT} w={1.7} />
    </TermSceneRoot>
  );
}

export function TermBabyShowerScene() {
  return (
    <TermSceneRoot>
      <LL x1={8} y1={104} x2={192} y2={104} c={TERM_DIM} w={1.8} />
      <LP d="M 112 66 C 112 84 128 94 148 94 C 168 94 184 84 184 66" c={TERM_PHOS} w={2.2} />
      <LL x1={108} y1={66} x2={188} y2={66} c={TERM_PHOS} w={2} />
      <LP d="M 118 66 C 118 52 130 44 142 48" c={TERM_MID} w={1.8} />
      <LP d="M 178 66 C 178 52 166 44 154 48" c={TERM_MID} w={1.8} />
      <LC cx={120} cy={100} r={4} c={TERM_MID} w={1.7} />
      <LC cx={176} cy={100} r={4} c={TERM_MID} w={1.7} />
      <LP d="M 148 36 C 144 28 134 30 134 38 C 134 44 140 48 148 54 C 156 48 162 44 162 38 C 162 30 152 28 148 36 Z" c={TERM_SOFT} w={1.9} />
      <LC cx={104} cy={30} r={8} c={TERM_MID} w={1.7} />
      <LC cx={188} cy={26} r={6} c={TERM_MID} w={1.7} />
      <LR x={92} y={78} width={18} height={16} c={TERM_MID} w={1.7} />
      <LL x1={92} y1={86} x2={110} y2={86} c={TERM_MID} w={1.5} />
    </TermSceneRoot>
  );
}

export function TermBirthdayScene() {
  return (
    <TermSceneRoot>
      <LL x1={8} y1={104} x2={192} y2={104} c={TERM_DIM} w={1.8} />
      <LR x={116} y={78} width={64} height={18} rx={2} c={TERM_PHOS} w={2.1} />
      <LR x={126} y={60} width={44} height={18} rx={2} c={TERM_SOFT} w={2} />
      <LP d="M 116 78 C 124 72 132 78 140 72 C 148 78 156 72 164 78 C 170 72 176 76 180 72" c={TERM_MID} w={1.6} />
      <LL x1={134} y1={60} x2={134} y2={46} c={TERM_PHOS} w={1.8} />
      <LL x1={148} y1={60} x2={148} y2={44} c={TERM_PHOS} w={1.8} />
      <LL x1={162} y1={60} x2={162} y2={46} c={TERM_PHOS} w={1.8} />
      <LP d="M 134 46 C 131 40 137 36 134 32 C 131 36 137 40 134 46 Z" c={TERM_SOFT} w={1.6} />
      <LP d="M 148 44 C 145 38 151 34 148 30 C 145 34 151 38 148 44 Z" c={TERM_SOFT} w={1.6} />
      <LP d="M 162 46 C 159 40 165 36 162 32 C 159 36 165 40 162 46 Z" c={TERM_SOFT} w={1.6} />
      <LC cx={102} cy={40} r={9} c={TERM_MID} w={1.7} />
      <LC cx={190} cy={36} r={7} c={TERM_MID} w={1.7} />
      <LL x1={104} y1={98} x2={192} y2={98} c={TERM_DIM} w={1.5} />
    </TermSceneRoot>
  );
}

export function TermChristmasScene() {
  return (
    <TermSceneRoot>
      <LL x1={8} y1={104} x2={192} y2={104} c={TERM_DIM} w={1.8} />
      <LPoly points="148,14 132,42 164,42" close={false} c={TERM_PHOS} w={2} />
      <LPoly points="148,34 126,66 170,66" close={false} c={TERM_PHOS} w={2} />
      <LPoly points="148,56 120,90 176,90" close={false} c={TERM_PHOS} w={2.1} />
      <LL x1={148} y1={90} x2={148} y2={102} c={TERM_MID} w={2.2} />
      <LP d="M 148 6 L 150 11 L 155 11 L 151 14 L 153 19 L 148 16 L 143 19 L 145 14 L 141 11 L 146 11 Z" c={TERM_SOFT} w={1.5} />
      <LDot cx={138} cy={52} r={2} c={TERM_SOFT} />
      <LDot cx={158} cy={58} r={2} c={TERM_PHOS} />
      <LDot cx={146} cy={74} r={2} c={TERM_SOFT} />
      <LDot cx={162} cy={80} r={2} c={TERM_PHOS} />
      <LDot cx={132} cy={82} r={2} c={TERM_PHOS} />
      <LR x={106} y={88} width={16} height={13} c={TERM_MID} w={1.7} />
      <LR x={176} y={90} width={14} height={11} c={TERM_MID} w={1.7} />
      <LDot cx={100} cy={24} r={1.6} c={TERM_SOFT} />
      <LDot cx={188} cy={30} r={1.6} c={TERM_SOFT} />
    </TermSceneRoot>
  );
}

export function TermEasterScene() {
  return (
    <TermSceneRoot>
      <LL x1={8} y1={104} x2={192} y2={104} c={TERM_DIM} w={1.8} />
      <LP d="M 138 34 C 134 20 138 10 144 10 C 149 10 150 22 146 34 M 158 34 C 156 20 160 10 165 11 C 170 12 169 24 164 34" c={TERM_PHOS} w={1.9} />
      <LC cx={151} cy={48} r={15} c={TERM_PHOS} w={2.1} />
      <LDot cx={146} cy={46} r={1.8} c={TERM_DIM} />
      <LDot cx={157} cy={46} r={1.8} c={TERM_DIM} />
      <LP d="M 147 54 C 149 52 153 52 155 54" c={TERM_SOFT} w={1.6} />
      <LP d="M 132 96 C 132 84 140 78 148 78 C 156 78 164 84 164 96 C 156 100 140 100 132 96 Z" c={TERM_SOFT} w={1.9} />
      <LP d="M 136 88 C 142 85 154 85 160 88" c={TERM_MID} w={1.5} dash="3 3" />
      <LP d="M 104 100 C 104 90 110 85 116 85 C 122 85 128 90 128 100 C 120 103 112 103 104 100 Z" c={TERM_MID} w={1.8} />
      <LP d="M 172 100 C 172 92 177 88 182 88 C 187 88 192 92 192 100 C 186 102 178 102 172 100 Z" c={TERM_MID} w={1.8} />
      <LC cx={188} cy={20} r={8} c={TERM_SOFT} w={1.6} />
    </TermSceneRoot>
  );
}

export function TermSunriseServiceScene() {
  return (
    <TermSceneRoot>
      <LP d="M 8 102 C 50 88 90 84 130 88 C 160 90 180 96 192 100" c={TERM_DIM} w={1.8} />
      <LP d="M 118 84 A 30 30 0 0 1 178 84" c={TERM_PHOS} w={2.2} />
      <LL x1={106} y1={84} x2={190} y2={84} c={TERM_MID} w={1.8} />
      <LL x1={128} y1={44} x2={122} y2={36} c={TERM_SOFT} w={1.7} />
      <LL x1={148} y1={38} x2={148} y2={28} c={TERM_SOFT} w={1.7} />
      <LL x1={168} y1={44} x2={174} y2={36} c={TERM_SOFT} w={1.7} />
      <LL x1={92} y1={88} x2={92} y2={56} c={TERM_PHOS} w={2.2} />
      <LL x1={82} y1={66} x2={102} y2={66} c={TERM_PHOS} w={2.2} />
      <TFigure x={122} y={102} s={0.8} c={TERM_MID} />
      <TFigure x={176} y={102} s={0.8} c={TERM_MID} />
    </TermSceneRoot>
  );
}

export function TermThanksgivingScene() {
  return (
    <TermSceneRoot>
      <LL x1={8} y1={102} x2={192} y2={102} c={TERM_DIM} w={1.8} />
      <LP d="M 146 78 C 130 70 124 52 132 36 M 146 78 C 146 62 146 44 152 30 M 146 78 C 160 70 172 54 170 38" c={TERM_MID} w={1.8} />
      <LP d="M 138 44 C 128 48 122 40 126 32 C 134 32 138 36 138 44 M 164 42 C 172 38 178 44 174 50 C 168 50 164 48 164 42" c={TERM_MID} w={1.6} />
      <LC cx={148} cy={84} r={16} c={TERM_PHOS} w={2.2} />
      <LC cx={164} cy={74} r={7} c={TERM_PHOS} w={2} />
      <LPoly points="171,72 180,74 171,77" close c={TERM_SOFT} w={1.6} />
      <LDot cx={162} cy={72} r={1.6} c={TERM_DIM} />
      <LP d="M 104 100 C 104 90 112 84 120 84 C 128 84 136 90 136 100 C 126 103 114 103 104 100 Z" c={TERM_MID} w={1.8} />
      <LL x1={120} y1={84} x2={120} y2={78} c={TERM_MID} w={1.7} />
      <LP d="M 120 78 C 116 74 118 70 122 72 C 126 70 128 74 124 78 Z" c={TERM_SOFT} w={1.5} />
      <LL x1={100} y1={94} x2={192} y2={94} c={TERM_DIM} w={1.4} />
    </TermSceneRoot>
  );
}

export function TermWeddingScene() {
  return (
    <TermSceneRoot>
      <LL x1={8} y1={104} x2={192} y2={104} c={TERM_DIM} w={1.8} />
      <LL x1={112} y1={102} x2={112} y2={36} c={TERM_MID} w={2} />
      <LL x1={188} y1={102} x2={188} y2={36} c={TERM_MID} w={2} />
      <LP d="M 112 36 C 130 20 170 20 188 36" c={TERM_PHOS} w={2.1} />
      <LDot cx={130} cy={26} r={1.8} c={TERM_SOFT} />
      <LDot cx={150} cy={22} r={1.8} c={TERM_SOFT} />
      <LDot cx={170} cy={26} r={1.8} c={TERM_SOFT} />
      <TFigure x={140} y={102} s={1.0} />
      <TFigure x={162} y={102} s={1.0} c={TERM_SOFT} />
      <LC cx={122} cy={52} r={8} c={TERM_SOFT} w={1.7} />
      <LC cx={132} cy={52} r={8} c={TERM_SOFT} w={1.7} />
      <LDot cx={118} cy={96} r={1.6} c={TERM_MID} />
      <LDot cx={182} cy={96} r={1.6} c={TERM_MID} />
    </TermSceneRoot>
  );
}

export function TermMemorialScene() {
  return (
    <TermSceneRoot>
      <LL x1={8} y1={104} x2={192} y2={104} c={TERM_DIM} w={1.8} />
      <LC cx={148} cy={54} r={26} c={TERM_PHOS} w={2.1} />
      <LC cx={148} cy={54} r={19} c={TERM_MID} w={1.5} />
      <LDot cx={148} cy={28} r={2.2} c={TERM_SOFT} />
      <LDot cx={126} cy={40} r={2.2} c={TERM_SOFT} />
      <LDot cx={170} cy={40} r={2.2} c={TERM_SOFT} />
      <LDot cx={124} cy={64} r={2.2} c={TERM_SOFT} />
      <LDot cx={172} cy={64} r={2.2} c={TERM_SOFT} />
      <LDot cx={148} cy={80} r={2.2} c={TERM_SOFT} />
      <LP d="M 138 84 L 148 96 L 158 84" c={TERM_MID} w={1.7} />
      <LR x={100} y={76} width={10} height={24} c={TERM_MID} w={1.7} />
      <LP d="M 105 76 C 102 70 108 66 105 60 C 102 66 108 70 105 76 Z" c={TERM_SOFT} w={1.6} />
      <LL x1={116} y1={100} x2={180} y2={100} c={TERM_DIM} w={1.5} />
    </TermSceneRoot>
  );
}

export function TermMeetingScene() {
  return (
    <TermSceneRoot>
      <LL x1={8} y1={104} x2={192} y2={104} c={TERM_DIM} w={1.8} />
      <LR x={108} y={68} width={76} height={10} rx={2} c={TERM_PHOS} w={2} />
      <LL x1={116} y1={78} x2={116} y2={100} c={TERM_MID} w={1.8} />
      <LL x1={176} y1={78} x2={176} y2={100} c={TERM_MID} w={1.8} />
      <TFigure x={124} y={68} s={0.8} pose="sit" />
      <TFigure x={148} y={68} s={0.8} pose="sit" c={TERM_SOFT} />
      <TFigure x={170} y={68} s={0.8} pose="sit" />
      <LC cx={182} cy={24} r={11} c={TERM_MID} w={1.8} />
      <LL x1={182} y1={24} x2={182} y2={17} c={TERM_MID} w={1.6} />
      <LL x1={182} y1={24} x2={187} y2={27} c={TERM_MID} w={1.6} />
      <LP d="M 106 22 C 106 14 114 10 122 12 C 130 10 136 16 134 24 C 132 30 126 32 120 30 L 112 34 L 114 27 C 109 26 106 25 106 22 Z" c={TERM_MID} w={1.6} />
      <LR x={132} y={52} width={22} height={12} c={TERM_MID} w={1.5} />
    </TermSceneRoot>
  );
}

export function TermWorkoutScene() {
  return (
    <TermSceneRoot>
      <LL x1={8} y1={104} x2={192} y2={104} c={TERM_DIM} w={1.8} />
      <LL x1={104} y1={92} x2={192} y2={92} c={TERM_MID} w={1.6} />
      <LL x1={110} y1={52} x2={182} y2={52} c={TERM_PHOS} w={2.2} />
      <LR x={102} y={38} width={10} height={28} c={TERM_PHOS} w={2} />
      <LR x={114} y={43} width={7} height={18} c={TERM_MID} w={1.7} />
      <LR x={180} y={38} width={10} height={28} c={TERM_PHOS} w={2} />
      <LR x={171} y={43} width={7} height={18} c={TERM_MID} w={1.7} />
      <TFigure x={146} y={90} s={0.9} pose="armsUp" />
      <LC cx={118} cy={80} r={9} c={TERM_SOFT} w={1.9} />
      <LP d="M 112 74 C 114 68 122 68 124 74" c={TERM_SOFT} w={1.7} />
      <LP d="M 168 84 C 174 78 182 78 186 84" c={TERM_MID} w={1.6} />
      <LDot cx={100} cy={28} r={1.7} c={TERM_SOFT} />
    </TermSceneRoot>
  );
}

export function TermBasketballScene() {
  return (
    <TermSceneRoot>
      <LL x1={8} y1={104} x2={192} y2={104} c={TERM_DIM} w={1.8} />
      <LL x1={40} y1={88} x2={192} y2={88} c={TERM_DIM} w={1.4} />
      <LR x={136} y={18} width={48} height={34} c={TERM_PHOS} w={2.1} />
      <LR x={150} y={28} width={20} height={16} c={TERM_MID} w={1.7} />
      <LP d="M 150 52 C 154 58 166 58 170 52" c={TERM_PHOS} w={2} />
      <LL x1={153} y1={55} x2={153} y2={64} c={TERM_MID} w={1.4} />
      <LL x1={160} y1={56} x2={160} y2={65} c={TERM_MID} w={1.4} />
      <LL x1={167} y1={55} x2={167} y2={64} c={TERM_MID} w={1.4} />
      <LC cx={126} cy={62} r={11} c={TERM_SOFT} w={2} />
      <LL x1={115} y1={62} x2={137} y2={62} c={TERM_MID} w={1.4} />
      <LP d="M 120 53 C 124 60 124 64 120 71 M 132 53 C 128 60 128 64 132 71" c={TERM_MID} w={1.4} />
      <TFigure x={104} y={102} s={0.95} pose="armsUp" c={TERM_MID} />
    </TermSceneRoot>
  );
}

export function TermSoccerScene() {
  return (
    <TermSceneRoot>
      <LL x1={8} y1={104} x2={192} y2={104} c={TERM_DIM} w={1.8} />
      <LL x1={140} y1={104} x2={140} y2={30} c={TERM_PHOS} w={2.1} />
      <LL x1={188} y1={104} x2={188} y2={30} c={TERM_PHOS} w={2.1} />
      <LL x1={140} y1={30} x2={188} y2={30} c={TERM_PHOS} w={2.1} />
      <LL x1={140} y1={52} x2={188} y2={52} c={TERM_MID} w={1.2} />
      <LL x1={152} y1={30} x2={152} y2={104} c={TERM_MID} w={1.2} />
      <LL x1={164} y1={30} x2={164} y2={104} c={TERM_MID} w={1.2} />
      <LL x1={176} y1={30} x2={176} y2={104} c={TERM_MID} w={1.2} />
      <LC cx={122} cy={90} r={11} c={TERM_PHOS} w={2} />
      <LPoly points="122,84 127,88 125,94 119,94 117,88" close c={TERM_MID} w={1.5} />
      <TFigure x={98} y={102} s={0.95} c={TERM_MID} />
      <LL x1={104} y1={104} x2={104} y2={104} c={TERM_DIM} w={1.5} />
    </TermSceneRoot>
  );
}

export function TermGameScene() {
  return (
    <TermSceneRoot>
      <LL x1={8} y1={104} x2={192} y2={104} c={TERM_DIM} w={1.8} />
      <LR x={110} y={22} width={72} height={44} rx={3} c={TERM_MID} w={2} />
      <LP d="M 120 56 L 132 44 L 140 50 L 152 34 L 162 44 L 172 38" c={TERM_SOFT} w={1.7} />
      <LDot cx={124} cy={32} r={1.8} c={TERM_SOFT} />
      <LP d="M 108 84 C 108 74 118 70 126 74 L 134 78 L 158 78 L 166 74 C 174 70 184 74 184 84 C 184 92 176 96 168 92 L 160 86 L 132 86 L 124 92 C 116 96 108 92 108 84 Z" c={TERM_PHOS} w={2.1} />
      <LL x1={122} y1={80} x2={122} y2={88} c={TERM_PHOS} w={1.8} />
      <LL x1={118} y1={84} x2={126} y2={84} c={TERM_PHOS} w={1.8} />
      <LDot cx={166} cy={81} r={2.2} c={TERM_SOFT} />
      <LDot cx={174} cy={85} r={2.2} c={TERM_PHOS} />
      <LDot cx={158} cy={85} r={2.2} c={TERM_MID} />
      <TFigure x={94} y={102} s={0.85} pose="sit" c={TERM_MID} />
    </TermSceneRoot>
  );
}

export function TermScaryMovieScene() {
  return (
    <TermSceneRoot>
      <LL x1={8} y1={104} x2={192} y2={104} c={TERM_DIM} w={1.8} />
      <LP d="M 124 100 L 124 52 L 148 34 L 172 52 L 172 100" c={TERM_PHOS} w={2.1} />
      <LPoly points="116,54 148,28 180,54" close={false} c={TERM_PHOS} w={2.2} />
      <LR x={140} y={72} width={16} height={28} c={TERM_MID} w={1.8} />
      <LDot cx={152} cy={86} r={1.7} c={TERM_SOFT} />
      <LR x={130} y={58} width={10} height={12} c={TERM_SOFT} w={1.5} />
      <LP d="M 104 34 C 98 22 106 12 114 16 C 110 20 110 26 114 29 C 110 30 106 32 104 34 Z" c={TERM_SOFT} w={1.7} />
      <LP d="M 84 88 C 84 76 92 70 98 74 C 104 70 112 76 112 88 L 108 84 L 104 89 L 100 84 L 96 89 L 92 84 L 88 88 Z" c={TERM_SOFT} w={1.8} />
      <LDot cx={94} cy={79} r={1.6} c={TERM_DIM} />
      <LDot cx={102} cy={79} r={1.6} c={TERM_DIM} />
      <LP d="M 182 84 C 180 78 186 74 190 78" c={TERM_MID} w={1.5} />
      <LDot cx={120} cy={20} r={1.6} c={TERM_MID} />
    </TermSceneRoot>
  );
}

export function TermChristmasMovieScene() {
  return (
    <TermSceneRoot>
      <LL x1={8} y1={104} x2={192} y2={104} c={TERM_DIM} w={1.8} />
      <LR x={106} y={24} width={84} height={56} rx={3} c={TERM_PHOS} w={2.2} />
      <LL x1={128} y1={80} x2={122} y2={92} c={TERM_MID} w={1.9} />
      <LL x1={168} y1={80} x2={174} y2={92} c={TERM_MID} w={1.9} />
      <LPoly points="148,36 140,50 156,50" close={false} c={TERM_SOFT} w={1.7} />
      <LPoly points="148,46 138,62 158,62" close={false} c={TERM_SOFT} w={1.7} />
      <LL x1={148} y1={62} x2={148} y2={68} c={TERM_MID} w={1.7} />
      <LDot cx={118} cy={34} r={1.6} c={TERM_SOFT} />
      <LDot cx={178} cy={36} r={1.6} c={TERM_SOFT} />
      <LDot cx={170} cy={66} r={1.6} c={TERM_SOFT} />
      <LP d="M 92 100 L 96 80 L 112 80 L 116 100 Z" c={TERM_MID} w={1.8} />
      <LP d="M 94 80 C 96 74 100 76 102 72 C 106 76 110 72 112 78" c={TERM_SOFT} w={1.5} />
      <LL x1={118} y1={98} x2={178} y2={98} c={TERM_DIM} w={1.4} />
    </TermSceneRoot>
  );
}

export function TermChristmasBreakfastScene() {
  return (
    <TermSceneRoot>
      <LL x1={8} y1={102} x2={192} y2={102} c={TERM_DIM} w={1.8} />
      <LP d="M 112 88 C 130 82 166 82 184 88 C 166 96 130 96 112 88 Z" c={TERM_MID} w={1.8} />
      <LP d="M 122 78 C 134 72 162 72 174 78 C 162 84 134 84 122 78 Z" c={TERM_PHOS} w={2} />
      <LP d="M 126 66 C 138 60 158 60 170 66 C 158 72 138 72 126 66 Z" c={TERM_SOFT} w={2} />
      <LP d="M 130 54 C 140 49 156 49 166 54 C 156 59 140 59 130 54 Z" c={TERM_PHOS} w={1.9} />
      <LR x={138} y={40} width={20} height={9} rx={2} c={TERM_MID} w={1.6} />
      <LP d="M 148 28 C 144 22 138 24 138 18 M 156 28 C 154 22 160 20 158 14" c={TERM_MID} w={1.5} />
      <LC cx={102} cy={82} r={10} c={TERM_MID} w={1.8} />
      <LP d="M 112 80 C 120 76 120 88 112 86" c={TERM_MID} w={1.7} />
      <LP d="M 184 58 C 180 52 186 48 184 44 C 190 46 190 54 184 58 M 184 58 C 178 56 178 48 184 44" c={TERM_SOFT} w={1.5} />
      <LDot cx={148} cy={34} r={1.7} c={TERM_SOFT} />
    </TermSceneRoot>
  );
}

export function TermChristmasDinnerScene() {
  return (
    <TermSceneRoot>
      <LL x1={8} y1={102} x2={192} y2={102} c={TERM_DIM} w={1.8} />
      <LP d="M 96 18 C 124 30 168 30 194 16" c={TERM_MID} w={1.7} />
      <LDot cx={118} cy={24} r={2} c={TERM_SOFT} />
      <LDot cx={144} cy={27} r={2} c={TERM_PHOS} />
      <LDot cx={170} cy={24} r={2} c={TERM_SOFT} />
      <LP d="M 108 90 C 128 84 168 84 188 90 C 168 98 128 98 108 90 Z" c={TERM_MID} w={1.8} />
      <LP d="M 124 84 C 128 66 140 58 148 58 C 156 58 168 66 172 84 C 156 89 140 89 124 84 Z" c={TERM_PHOS} w={2.1} />
      <LP d="M 132 64 C 128 58 130 52 136 54 C 134 58 136 61 132 64 M 164 64 C 168 58 166 52 160 54 C 162 58 160 61 164 64" c={TERM_SOFT} w={1.6} />
      <LR x={104} y={62} width={7} height={22} c={TERM_MID} w={1.6} />
      <LP d="M 107 62 C 104 56 110 52 107 46 C 104 52 110 56 107 62 Z" c={TERM_SOFT} w={1.5} />
      <LR x={185} y={62} width={7} height={22} c={TERM_MID} w={1.6} />
      <LP d="M 188 62 C 185 56 191 52 188 46 C 185 52 191 56 188 62 Z" c={TERM_SOFT} w={1.5} />
    </TermSceneRoot>
  );
}

export function TermFullMoonScene() {
  return (
    <TermSceneRoot>
      <LP d="M 8 104 C 50 94 90 98 130 100 C 160 101 180 102 192 103" c={TERM_DIM} w={1.8} />
      <LC cx={152} cy={46} r={28} c={TERM_PHOS} w={2.2} />
      <LC cx={140} cy={36} r={5} c={TERM_MID} w={1.4} />
      <LC cx={162} cy={54} r={7} c={TERM_MID} w={1.4} />
      <LC cx={146} cy={60} r={3.5} c={TERM_MID} w={1.3} />
      <LDot cx={102} cy={20} r={1.8} c={TERM_SOFT} />
      <LDot cx={118} cy={38} r={1.5} c={TERM_SOFT} />
      <LDot cx={92} cy={52} r={1.5} c={TERM_MID} />
      <LDot cx={186} cy={18} r={1.8} c={TERM_SOFT} />
      <LL x1={96} y1={86} x2={132} y2={78} c={TERM_MID} w={2} />
      <LC cx={112} cy={72} r={5} c={TERM_PHOS} w={1.8} />
      <LPoly points="108,68 104,62 110,64 M 116,68 120,62 114,64" close={false} c={TERM_PHOS} w={1.5} />
      <LDot cx={110} cy={72} r={1.2} c={TERM_DIM} />
      <LDot cx={115} cy={72} r={1.2} c={TERM_DIM} />
    </TermSceneRoot>
  );
}

export function TermPrayerScene() {
  return (
    <TermSceneRoot>
      <LL x1={8} y1={104} x2={192} y2={104} c={TERM_DIM} w={1.8} />
      <LL x1={150} y1={14} x2={150} y2={38} c={TERM_PHOS} w={2.4} />
      <LL x1={139} y1={23} x2={161} y2={23} c={TERM_PHOS} w={2.4} />
      <LL x1={128} y1={34} x2={138} y2={46} c={TERM_MID} w={1.5} />
      <LL x1={172} y1={34} x2={162} y2={46} c={TERM_MID} w={1.5} />
      <LL x1={150} y1={42} x2={150} y2={52} c={TERM_MID} w={1.5} />
      <TFigure x={146} y={102} s={1.1} pose="kneel" />
      <LR x={178} y={78} width={9} height={22} c={TERM_MID} w={1.7} />
      <LP d="M 182 78 C 179 72 185 68 182 62 C 179 68 185 72 182 78 Z" c={TERM_SOFT} w={1.6} />
      <LP d="M 108 100 C 124 96 168 96 188 100" c={TERM_DIM} w={1.5} />
      <LDot cx={116} cy={52} r={1.6} c={TERM_SOFT} />
      <LDot cx={184} cy={44} r={1.6} c={TERM_SOFT} />
    </TermSceneRoot>
  );
}

export function TermOutreachScene() {
  return (
    <TermSceneRoot>
      <LL x1={8} y1={104} x2={192} y2={104} c={TERM_DIM} w={1.8} />
      <TFigure x={118} y={102} s={1.0} />
      <TFigure x={180} y={102} s={1.0} c={TERM_SOFT} />
      <LR x={132} y={76} width={32} height={24} c={TERM_MID} w={1.9} />
      <LL x1={132} y1={84} x2={164} y2={84} c={TERM_MID} w={1.5} />
      <LP d="M 148 58 C 145 51 136 53 136 59 C 136 64 141 67 148 72 C 155 67 160 64 160 59 C 160 53 151 51 148 58 Z" c={TERM_PHOS} w={1.9} />
      <LC cx={188} cy={20} r={7} c={TERM_SOFT} w={1.6} />
      <LP d="M 96 30 C 102 24 110 24 114 30" c={TERM_MID} w={1.5} />
      <LDot cx={100} cy={44} r={1.6} c={TERM_MID} />
    </TermSceneRoot>
  );
}

export function TermConcertScene() {
  return (
    <TermSceneRoot>
      <LL x1={8} y1={104} x2={192} y2={104} c={TERM_DIM} w={1.8} />
      <LL x1={112} y1={12} x2={132} y2={58} c={TERM_DIM} w={1.6} />
      <LL x1={184} y1={12} x2={164} y2={58} c={TERM_DIM} w={1.6} />
      <LL x1={100} y1={84} x2={192} y2={84} c={TERM_MID} w={2} />
      <TFigure x={148} y={84} s={1.05} pose="armsUp" />
      <LP d="M 162 62 C 172 58 180 64 178 74 C 176 84 166 88 160 82 C 155 77 156 66 162 62 Z" c={TERM_SOFT} w={1.8} />
      <LC cx={166} cy={76} r={4} c={TERM_DIM} w={1.4} />
      <LL x1={174} y1={64} x2={182} y2={50} c={TERM_SOFT} w={1.8} />
      <LDot cx={110} cy={96} r={2.4} c={TERM_MID} />
      <LDot cx={128} cy={98} r={2.4} c={TERM_MID} />
      <LDot cx={172} cy={98} r={2.4} c={TERM_MID} />
      <LDot cx={188} cy={96} r={2.4} c={TERM_MID} />
      <LDot cx={118} cy={28} r={2} c={TERM_PHOS} />
      <LL x1={120} y1={28} x2={120} y2={18} c={TERM_PHOS} w={1.6} />
    </TermSceneRoot>
  );
}

export function TermHotelScene() {
  return (
    <TermSceneRoot>
      <LL x1={8} y1={104} x2={192} y2={104} c={TERM_DIM} w={1.8} />
      <LR x={122} y={14} width={56} height={88} c={TERM_PHOS} w={2.1} />
      <LR x={132} y={24} width={10} height={12} c={TERM_SOFT} w={1.5} />
      <LR x={158} y={24} width={10} height={12} c={TERM_MID} w={1.5} />
      <LR x={132} y={44} width={10} height={12} c={TERM_MID} w={1.5} />
      <LR x={158} y={44} width={10} height={12} c={TERM_SOFT} w={1.5} />
      <LR x={132} y={64} width={10} height={12} c={TERM_SOFT} w={1.5} />
      <LR x={158} y={64} width={10} height={12} c={TERM_MID} w={1.5} />
      <LR x={143} y={84} width={14} height={18} c={TERM_MID} w={1.8} />
      <LP d="M 116 102 L 122 88 L 178 88 L 184 102" c={TERM_MID} w={1.7} />
      <LC cx={104} cy={22} r={8} c={TERM_SOFT} w={1.6} />
      <LDot cx={188} cy={30} r={1.7} c={TERM_SOFT} />
    </TermSceneRoot>
  );
}

export function TermShowerScene() {
  return (
    <TermSceneRoot>
      <LL x1={8} y1={104} x2={192} y2={104} c={TERM_DIM} w={1.8} />
      <LL x1={126} y1={100} x2={126} y2={28} c={TERM_MID} w={2.1} />
      <LP d="M 126 28 C 138 22 152 22 162 28" c={TERM_PHOS} w={2.1} />
      <LP d="M 134 30 L 154 30 L 160 40 L 128 40 Z" c={TERM_PHOS} w={2} />
      <LL x1={136} y1={48} x2={134} y2={60} c={TERM_SOFT} w={1.6} dash="3 4" />
      <LL x1={144} y1={50} x2={144} y2={64} c={TERM_SOFT} w={1.6} dash="3 4" />
      <LL x1={152} y1={48} x2={154} y2={60} c={TERM_SOFT} w={1.6} dash="3 4" />
      <LP d="M 112 84 C 112 96 124 102 144 102 C 164 102 176 96 176 84 L 170 84 C 168 92 160 96 144 96 C 128 96 120 92 118 84 Z" c={TERM_PHOS} w={2} />
      <LL x1={118} y1={102} x2={116} y2={106} c={TERM_MID} w={1.7} />
      <LL x1={170} y1={102} x2={172} y2={106} c={TERM_MID} w={1.7} />
      <LC cx={104} cy={62} r={6} c={TERM_MID} w={1.5} />
      <LC cx={186} cy={70} r={4} c={TERM_MID} w={1.4} />
    </TermSceneRoot>
  );
}

export function TermStudyScene() {
  return (
    <TermSceneRoot>
      <LL x1={8} y1={104} x2={192} y2={104} c={TERM_DIM} w={1.8} />
      <LL x1={106} y1={84} x2={186} y2={84} c={TERM_MID} w={2} />
      <LL x1={112} y1={84} x2={112} y2={102} c={TERM_MID} w={1.8} />
      <LL x1={180} y1={84} x2={180} y2={102} c={TERM_MID} w={1.8} />
      <LP d="M 146 62 C 138 56 128 54 120 57 L 120 80 C 128 77 138 79 146 84 C 154 79 164 77 172 80 L 172 57 C 164 54 154 56 146 62 Z" c={TERM_PHOS} w={2} />
      <LL x1={146} y1={62} x2={146} y2={84} c={TERM_MID} w={1.5} />
      <LL x1={182} y1={84} x2={176} y2={56} c={TERM_MID} w={1.9} />
      <LP d="M 164 56 L 188 56 L 182 42 L 170 42 Z" c={TERM_SOFT} w={1.8} />
      <LL x1={168} y1={36} x2={164} y2={28} c={TERM_SOFT} w={1.4} />
      <LL x1={184} y1={36} x2={188} y2={28} c={TERM_SOFT} w={1.4} />
      <TFigure x={102} y={102} s={0.85} pose="sit" c={TERM_MID} />
      <LL x1={124} y1={92} x2={140} y2={92} c={TERM_DIM} w={1.5} />
    </TermSceneRoot>
  );
}

export function TermGraduationScene() {
  return (
    <TermSceneRoot>
      <LL x1={8} y1={104} x2={192} y2={104} c={TERM_DIM} w={1.8} />
      <LPoly points="148,30 118,44 148,56 178,44" close c={TERM_PHOS} w={2.1} />
      <LP d="M 130 48 L 130 62 C 130 70 166 70 166 62 L 166 48" c={TERM_PHOS} w={2} />
      <LL x1={178} y1={44} x2={178} y2={62} c={TERM_SOFT} w={1.9} />
      <LC cx={178} cy={66} r={3.5} c={TERM_SOFT} w={1.7} />
      <LP d="M 122 96 L 126 78 L 146 82 L 142 98 Z" c={TERM_MID} w={1.8} />
      <LC cx={132} cy={88} r={4} c={TERM_MID} w={1.5} />
      <LDot cx={104} cy={24} r={1.8} c={TERM_SOFT} />
      <LDot cx={188} cy={20} r={1.8} c={TERM_PHOS} />
      <LDot cx={112} cy={62} r={1.8} c={TERM_PHOS} />
      <LDot cx={186} cy={78} r={1.8} c={TERM_SOFT} />
      <LL x1={158} y1={88} x2={170} y2={80} c={TERM_MID} w={1.5} />
      <LL x1={162} y1={96} x2={176} y2={92} c={TERM_MID} w={1.5} />
    </TermSceneRoot>
  );
}

export function TermVisitScene() {
  return (
    <TermSceneRoot>
      <LL x1={8} y1={104} x2={192} y2={104} c={TERM_DIM} w={1.8} />
      <LR x={118} y={48} width={64} height={54} c={TERM_PHOS} w={2.1} />
      <LPoly points="110,48 150,28 190,48" close={false} c={TERM_PHOS} w={2.2} />
      <LR x={142} y={74} width={16} height={28} c={TERM_MID} w={1.9} />
      <LDot cx={155} cy={88} r={1.6} c={TERM_SOFT} />
      <LR x={126} y={58} width={12} height={12} c={TERM_SOFT} w={1.5} />
      <LR x={164} y={58} width={12} height={12} c={TERM_SOFT} w={1.5} />
      <LP d="M 150 16 C 147 10 140 12 140 17 C 140 21 144 24 150 28 C 156 24 160 21 160 17 C 160 12 153 10 150 16 Z" c={TERM_SOFT} w={1.6} />
      <TFigure x={104} y={102} s={0.9} c={TERM_MID} />
      <TFigure x={192} y={102} s={0.9} c={TERM_MID} />
    </TermSceneRoot>
  );
}

export function TermReachOutScene() {
  return (
    <TermSceneRoot>
      <LL x1={8} y1={104} x2={192} y2={104} c={TERM_DIM} w={1.8} />
      <TFigure x={106} y={102} s={0.95} c={TERM_MID} />
      <TFigure x={186} y={102} s={0.95} c={TERM_MID} />
      <LR x={124} y={52} width={48} height={32} rx={2} c={TERM_PHOS} w={2.1} />
      <LPoly points="124,54 148,72 172,54" close={false} c={TERM_MID} w={1.8} />
      <LP d="M 148 62 C 146 57 139 58 139 63 C 139 66 142 68 148 72 C 154 68 157 66 157 63 C 157 58 150 57 148 62 Z" c={TERM_SOFT} w={1.6} />
      <LP d="M 122 34 C 122 26 130 22 138 24 C 146 22 152 28 150 36 C 148 42 142 44 136 42 L 128 46 L 130 38 C 126 37 122 36 122 34 Z" c={TERM_MID} w={1.6} />
      <LDot cx={131} cy={33} r={1.6} c={TERM_MID} />
      <LDot cx={139} cy={33} r={1.6} c={TERM_MID} />
      <LDot cx={147} cy={33} r={1.6} c={TERM_MID} />
    </TermSceneRoot>
  );
}

export function TermCleanScene() {
  return (
    <TermSceneRoot>
      <LL x1={8} y1={104} x2={192} y2={104} c={TERM_DIM} w={1.8} />
      <LP d="M 118 76 L 150 76 L 146 100 L 122 100 Z" c={TERM_PHOS} w={2} />
      <LP d="M 118 76 C 124 68 144 68 150 76" c={TERM_MID} w={1.8} />
      <LL x1={168} y1={100} x2={176} y2={44} c={TERM_MID} w={2} />
      <LP d="M 176 44 L 186 58 L 172 62 L 166 50 Z" c={TERM_SOFT} w={1.8} />
      <LL x1={170} y1={60} x2={168} y2={68} c={TERM_MID} w={1.4} />
      <LL x1={176} y1={59} x2={176} y2={68} c={TERM_MID} w={1.4} />
      <LL x1={182} y1={57} x2={184} y2={66} c={TERM_MID} w={1.4} />
      <LC cx={108} cy={56} r={7} c={TERM_SOFT} w={1.6} />
      <LC cx={122} cy={44} r={5} c={TERM_SOFT} w={1.5} />
      <LC cx={156} cy={30} r={4} c={TERM_MID} w={1.4} />
      <LP d="M 96 30 L 96 38 M 92 34 L 100 34" c={TERM_PHOS} w={1.6} />
      <LP d="M 188 28 L 188 34 M 185 31 L 191 31" c={TERM_PHOS} w={1.5} />
    </TermSceneRoot>
  );
}

export function TermWashCarScene() {
  return (
    <TermSceneRoot>
      <LL x1={8} y1={104} x2={192} y2={104} c={TERM_DIM} w={1.8} />
      <LP d="M 104 88 L 108 72 C 109 66 114 64 122 63 L 132 46 C 134 42 138 40 144 40 L 162 40 C 168 40 172 42 174 46 L 182 62 C 190 64 194 68 194 76 L 194 88" c={TERM_PHOS} w={2.1} />
      <LL x1={104} y1={88} x2={194} y2={88} c={TERM_PHOS} w={2} />
      <LR x={138} y={44} width={16} height={14} c={TERM_SOFT} w={1.6} />
      <LR x={158} y={44} width={14} height={14} c={TERM_SOFT} w={1.6} />
      <LC cx={122} cy={90} r={8} c={TERM_PHOS} w={2} />
      <LC cx={176} cy={90} r={8} c={TERM_PHOS} w={2} />
      <LC cx={130} cy={56} r={6} c={TERM_SOFT} w={1.5} />
      <LC cx={168} cy={56} r={5} c={TERM_SOFT} w={1.5} />
      <LC cx={150} cy={30} r={6} c={TERM_MID} w={1.5} />
      <LC cx={184} cy={32} r={4} c={TERM_MID} w={1.4} />
      <LDot cx={112} cy={34} r={1.7} c={TERM_SOFT} />
    </TermSceneRoot>
  );
}

export function TermGetGasScene() {
  return (
    <TermSceneRoot>
      <LL x1={8} y1={104} x2={192} y2={104} c={TERM_DIM} w={1.8} />
      <LR x={128} y={22} width={44} height={80} rx={3} c={TERM_PHOS} w={2.2} />
      <LR x={136} y={30} width={28} height={18} c={TERM_SOFT} w={1.7} />
      <LL x1={140} y1={36} x2={160} y2={36} c={TERM_MID} w={1.4} />
      <LL x1={140} y1={42} x2={154} y2={42} c={TERM_MID} w={1.4} />
      <LC cx={150} cy={66} r={10} c={TERM_MID} w={1.8} />
      <LP d="M 150 60 C 147 64 146 66 150 72 C 154 66 153 64 150 60 Z" c={TERM_SOFT} w={1.5} />
      <LL x1={138} y1={88} x2={162} y2={88} c={TERM_MID} w={1.6} />
      <LP d="M 172 44 C 184 48 188 58 186 72 L 182 88" c={TERM_MID} w={1.9} />
      <LR x={178} y={34} width={10} height={16} rx={2} c={TERM_PHOS} w={1.8} />
      <LP d="M 104 44 C 101 52 100 56 104 62 C 108 56 107 52 104 44 Z" c={TERM_SOFT} w={1.6} />
      <TFigure x={108} y={102} s={0.8} c={TERM_MID} />
    </TermSceneRoot>
  );
}

export function TermGroceryScene() {
  return (
    <TermSceneRoot>
      <LL x1={8} y1={104} x2={192} y2={104} c={TERM_DIM} w={1.8} />
      <LP d="M 104 36 L 188 36 L 182 66 L 116 66 Z" c={TERM_MID} w={1.8} />
      <LL x1={122} y1={36} x2={120} y2={66} c={TERM_MID} w={1.3} />
      <LL x1={146} y1={36} x2={146} y2={66} c={TERM_MID} w={1.3} />
      <LL x1={170} y1={36} x2={172} y2={66} c={TERM_MID} w={1.3} />
      <LP d="M 98 52 L 112 52 L 118 78 L 176 78 L 182 58" c={TERM_PHOS} w={2.1} />
      <LL x1={120} y1={64} x2={178} y2={64} c={TERM_MID} w={1.4} />
      <LC cx={126} cy={90} r={5} c={TERM_PHOS} w={1.8} />
      <LC cx={170} cy={90} r={5} c={TERM_PHOS} w={1.8} />
      <LP d="M 130 52 L 132 36 L 142 36 L 144 52" c={TERM_SOFT} w={1.7} />
      <LC cx={156} cy={44} r={7} c={TERM_SOFT} w={1.7} />
      <LL x1={156} y1={37} x2={158} y2={32} c={TERM_MID} w={1.6} />
      <LP d="M 166 52 L 168 40 L 176 40 L 178 52" c={TERM_MID} w={1.6} />
    </TermSceneRoot>
  );
}

export function TermNewYearScene() {
  return (
    <TermSceneRoot>
      <LL x1={8} y1={104} x2={192} y2={104} c={TERM_DIM} w={1.8} />
      <LR x={104} y={78} width={18} height={26} c={TERM_DIM} w={1.7} />
      <LR x={128} y={68} width={20} height={36} c={TERM_DIM} w={1.7} />
      <LR x={154} y={82} width={16} height={22} c={TERM_DIM} w={1.7} />
      <LR x={176} y={72} width={18} height={32} c={TERM_DIM} w={1.7} />
      <LDot cx={124} cy={34} r={2.2} c={TERM_PHOS} />
      <LL x1={124} y1={20} x2={124} y2={48} c={TERM_PHOS} w={1.6} />
      <LL x1={110} y1={34} x2={138} y2={34} c={TERM_PHOS} w={1.6} />
      <LL x1={114} y1={24} x2={134} y2={44} c={TERM_SOFT} w={1.4} />
      <LL x1={134} y1={24} x2={114} y2={44} c={TERM_SOFT} w={1.4} />
      <LDot cx={168} cy={24} r={2} c={TERM_SOFT} />
      <LL x1={168} y1={12} x2={168} y2={36} c={TERM_SOFT} w={1.5} />
      <LL x1={156} y1={24} x2={180} y2={24} c={TERM_SOFT} w={1.5} />
      <LDot cx={148} cy={52} r={1.8} c={TERM_MID} />
      <LL x1={148} y1={42} x2={148} y2={62} c={TERM_MID} w={1.4} />
      <LL x1={138} y1={52} x2={158} y2={52} c={TERM_MID} w={1.4} />
    </TermSceneRoot>
  );
}

export function TermValentinesScene() {
  return (
    <TermSceneRoot>
      <LL x1={8} y1={104} x2={192} y2={104} c={TERM_DIM} w={1.8} />
      <LP d="M 148 88 C 128 72 118 58 118 44 C 118 32 128 26 138 28 C 144 29 147 33 148 38 C 149 33 152 29 158 28 C 168 26 178 32 178 44 C 178 58 168 72 148 88 Z" c={TERM_PHOS} w={2.3} />
      <LP d="M 132 44 C 130 38 134 34 138 36" c={TERM_SOFT} w={1.7} />
      <LP d="M 104 52 C 102 47 97 48 97 52 C 97 56 100 58 104 61 C 108 58 111 56 111 52 C 111 48 106 47 104 52 Z" c={TERM_MID} w={1.6} />
      <LP d="M 188 38 C 186 34 182 35 182 38 C 182 41 184 43 188 45 C 192 43 194 41 194 38 C 194 35 190 34 188 38 Z" c={TERM_MID} w={1.6} />
      <LR x={122} y={92} width={52} height={10} c={TERM_MID} w={1.6} />
      <LL x1={148} y1={92} x2={148} y2={102} c={TERM_MID} w={1.5} />
      <LDot cx={108} cy={84} r={1.7} c={TERM_SOFT} />
      <LDot cx={188} cy={72} r={1.7} c={TERM_SOFT} />
    </TermSceneRoot>
  );
}

export function TermHalloweenScene() {
  return (
    <TermSceneRoot>
      <LL x1={8} y1={104} x2={192} y2={104} c={TERM_DIM} w={1.8} />
      <LC cx={150} cy={72} r={26} c={TERM_PHOS} w={2.2} />
      <LP d="M 138 50 C 136 66 136 80 138 94 M 162 50 C 164 66 164 80 162 94" c={TERM_MID} w={1.5} />
      <LL x1={150} y1={46} x2={150} y2={38} c={TERM_MID} w={2.2} />
      <LP d="M 150 38 C 154 34 160 34 162 38" c={TERM_MID} w={1.7} />
      <LPoly points="136,66 142,66 139,72" close c={TERM_SOFT} w={1.6} />
      <LPoly points="158,66 164,66 161,72" close c={TERM_SOFT} w={1.6} />
      <LP d="M 134 82 L 140 78 L 146 83 L 152 78 L 158 83 L 164 78 L 166 82 C 156 88 144 88 134 82 Z" c={TERM_SOFT} w={1.7} />
      <LP d="M 106 22 C 102 16 108 12 112 16 C 116 12 122 16 118 22 C 114 19 110 19 106 22 Z" c={TERM_MID} w={1.6} />
      <LC cx={186} cy={20} r={8} c={TERM_SOFT} w={1.6} />
      <LP d="M 110 96 L 114 84 L 126 84 L 130 96 Z" c={TERM_MID} w={1.7} />
      <LDot cx={120} cy={90} r={1.8} c={TERM_SOFT} />
    </TermSceneRoot>
  );
}

export function TermStPatricksScene() {
  return (
    <TermSceneRoot>
      <LL x1={8} y1={104} x2={192} y2={104} c={TERM_DIM} w={1.8} />
      <LP d="M 104 84 A 44 44 0 0 1 192 84" c={TERM_PHOS} w={2} />
      <LP d="M 112 84 A 36 36 0 0 1 184 84" c={TERM_SOFT} w={1.8} />
      <LP d="M 120 84 A 28 28 0 0 1 176 84" c={TERM_MID} w={1.8} />
      <LP d="M 160 88 L 188 88 L 184 102 L 164 102 Z" c={TERM_PHOS} w={2} />
      <LL x1={158} y1={88} x2={190} y2={88} c={TERM_PHOS} w={2.1} />
      <LDot cx={168} cy={82} r={2.2} c={TERM_SOFT} />
      <LDot cx={176} cy={80} r={2.2} c={TERM_PHOS} />
      <LDot cx={182} cy={83} r={2} c={TERM_SOFT} />
      <LC cx={118} cy={62} r={6} c={TERM_PHOS} w={1.8} />
      <LC cx={128} cy={62} r={6} c={TERM_PHOS} w={1.8} />
      <LC cx={118} cy={72} r={6} c={TERM_SOFT} w={1.8} />
      <LC cx={128} cy={72} r={6} c={TERM_SOFT} w={1.8} />
      <LP d="M 123 74 C 123 82 120 88 116 92" c={TERM_MID} w={1.7} />
    </TermSceneRoot>
  );
}

export function TermNewsScene() {
  return (
    <TermSceneRoot>
      <LL x1={8} y1={104} x2={192} y2={104} c={TERM_DIM} w={1.8} />
      <LR x={52} y={22} width={96} height={76} rx={2} c={TERM_PHOS} w={2.1} />
      <LL x1={60} y1={34} x2={140} y2={34} c={TERM_PHOS} w={2.4} />
      <LL x1={60} y1={41} x2={140} y2={41} c={TERM_MID} w={1.5} />
      <LR x={60} y={48} width={34} height={26} c={TERM_MID} w={1.6} />
      <LR x={71} y={60} width={12} height={14} c={TERM_MID} w={1.4} />
      <LP d="M 69 60 L 77 52 L 85 60" c={TERM_MID} w={1.4} />
      <LL x1={77} y1={45} x2={77} y2={51} c={TERM_SOFT} w={1.4} />
      <LL x1={74} y1={48} x2={80} y2={48} c={TERM_SOFT} w={1.4} />
      <LL x1={102} y1={50} x2={140} y2={50} c={TERM_PHOS} w={2} />
      <LL x1={102} y1={58} x2={140} y2={58} c={TERM_MID} w={1.4} />
      <LL x1={102} y1={64} x2={134} y2={64} c={TERM_MID} w={1.4} />
      <LL x1={102} y1={70} x2={140} y2={70} c={TERM_MID} w={1.4} />
      <LL x1={60} y1={82} x2={140} y2={82} c={TERM_MID} w={1.4} />
      <LL x1={60} y1={88} x2={128} y2={88} c={TERM_MID} w={1.4} />
      <LR x={160} y={72} width={18} height={14} c={TERM_MID} w={1.6} />
      <LP d="M 178 76 C 184 76 184 82 178 82" c={TERM_MID} w={1.6} />
      <LL x1={156} y1={92} x2={182} y2={92} c={TERM_DIM} w={1.5} />
    </TermSceneRoot>
  );
}

export function TermEmailScene() {
  return (
    <TermSceneRoot>
      <LL x1={8} y1={104} x2={192} y2={104} c={TERM_DIM} w={1.8} />
      <LR x={66} y={16} width={72} height={52} rx={2} c={TERM_MID} w={1.7} />
      <LL x1={76} y1={28} x2={112} y2={28} c={TERM_PHOS} w={2} />
      <LL x1={76} y1={38} x2={128} y2={38} c={TERM_MID} w={1.4} />
      <LL x1={76} y1={45} x2={120} y2={45} c={TERM_MID} w={1.4} />
      <LL x1={76} y1={52} x2={126} y2={52} c={TERM_MID} w={1.4} />
      <LC cx={126} cy={26} r={5} c={TERM_SOFT} w={1.6} />
      <LR x={52} y={52} width={100} height={48} rx={2} c={TERM_PHOS} w={2.1} />
      <LP d="M 52 54 L 102 82 L 152 54" c={TERM_PHOS} w={2} />
      <LP d="M 52 98 L 88 70" c={TERM_MID} w={1.5} />
      <LP d="M 152 98 L 116 70" c={TERM_MID} w={1.5} />
      <LR x={158} y={66} width={30} height={22} rx={2} c={TERM_MID} w={1.5} />
      <LP d="M 158 68 L 173 78 L 188 68" c={TERM_MID} w={1.4} />
      <LDot cx={34} cy={30} r={1.8} c={TERM_SOFT} />
      <LDot cx={170} cy={24} r={1.8} c={TERM_SOFT} />
    </TermSceneRoot>
  );
}
