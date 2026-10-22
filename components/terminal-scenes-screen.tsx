// Terminal keyword scenes (v186) - Pip-Boy line art for the
// Terminal skin. Each scene is its own bespoke outline drawing of
// its subject, drawn in phosphor strokes on the panel green using
// only the terminal kit: bright for the subject, mid for structure,
// dim for ground and distance. Subjects sit in the right half of
// the canvas, where the card text does not overlay them. Static
// art only - no text, no glyphs, no animation.
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

export function TermChurchScene() {
  return (
    <TermSceneRoot>
      <LL x1={0} y1={104} x2={200} y2={104} c={TERM_DIM} w={1.8} />
      <LP d="M8 104 L52 104" c={TERM_MID} w={1.6} dash="3 4" />
      <LC cx={178} cy={20} r={9} c={TERM_SOFT} w={1.8} />
      <LP d="M160 20 L148 20 M196 20 L190 20 M178 2 L178 8" c={TERM_MID} w={1.6} />
      <LPoly points="96,104 96,62 118,62 118,104" c={TERM_PHOS} w={2.1} />
      <LPoly points="90,62 124,62 107,44" close c={TERM_PHOS} w={2.1} />
      <LR x={128} y={52} width={34} height={52} c={TERM_PHOS} w={2.1} />
      <LPoly points="122,52 168,52 145,34" close c={TERM_PHOS} w={2.1} />
      <LR x={141} y={14} width={14} height={24} c={TERM_PHOS} w={2} />
      <LPoly points="139,14 157,14 148,4" close c={TERM_PHOS} w={2} />
      <LP d="M144 22 L152 22 M148 18 L148 27" c={TERM_SOFT} w={1.8} />
      <LP d="M140 104 L140 82 Q140 72 145 72 Q150 72 150 82 L150 104" c={TERM_SOFT} w={1.9} />
      <LP d="M103 88 L103 76 Q103 68 107 68 Q111 68 111 76 L111 88 Z" c={TERM_SOFT} w={1.7} />
      <LC cx={107} cy={94} r={2} c={TERM_MID} w={1.5} />
      <LP d="M92 104 Q84 92 88 84 M168 104 Q176 94 172 84" c={TERM_MID} w={1.7} />
      <LDot cx={88} cy={82} r={1.8} c={TERM_MID} />
      <LDot cx={172} cy={82} r={1.8} c={TERM_MID} />
    </TermSceneRoot>
  );
}

export function TermPhotoScene() {
  return (
    <TermSceneRoot>
      <LL x1={0} y1={106} x2={200} y2={106} c={TERM_DIM} w={1.8} />
      <LR x={108} y={26} width={72} height={46} rx={5} c={TERM_PHOS} w={2.2} />
      <LPoly points="126,26 134,16 156,16 162,26" c={TERM_PHOS} w={2} />
      <LC cx={144} cy={49} r={16} c={TERM_PHOS} w={2.2} />
      <LC cx={144} cy={49} r={9} c={TERM_SOFT} w={1.8} />
      <LC cx={140} cy={45} r={3} c={TERM_SOFT} w={1.5} />
      <LR x={114} y={32} width={10} height={6} rx={1} c={TERM_MID} w={1.6} />
      <LDot cx={172} cy={35} r={2.4} c={TERM_SOFT} />
      <LP d="M168 14 L168 20 M162 17 L174 17" c={TERM_SOFT} w={1.6} />
      <LPoly points="94,106 100,76 124,80 118,106" close c={TERM_MID} w={1.8} />
      <LPoly points="99,96 102,84 116,87 113,96" close c={TERM_DIM} w={1.5} />
      <LPoly points="128,106 134,72 160,76 154,106" close c={TERM_PHOS} w={1.9} />
      <LP d="M137 94 L144 82 L150 90 L153 86 L156 94" c={TERM_SOFT} w={1.6} />
      <LC cx={148} cy={80} r={2.2} c={TERM_SOFT} w={1.4} />
      <LPoly points="162,106 168,78 192,82 186,106" close c={TERM_MID} w={1.8} />
      <LP d="M171 97 Q177 88 183 97" c={TERM_MID} w={1.5} />
    </TermSceneRoot>
  );
}

export function TermTravelScene() {
  return (
    <TermSceneRoot>
      <LP d="M0 98 L44 78 L76 92 L112 66 L150 88 L200 70" c={TERM_DIM} w={1.8} />
      <LP d="M0 106 L60 88 L118 102 L200 84" c={TERM_DIM} w={1.5} />
      <LC cx={182} cy={18} r={8} c={TERM_SOFT} w={1.8} />
      <LP d="M96 30 Q104 22 114 28 Q122 20 132 26 Q140 22 144 30 Z" c={TERM_MID} w={1.7} />
      <LP d="M20 22 Q28 15 36 20 Q44 14 52 20 Q58 17 60 24 L18 24 Q16 18 20 22 Z" c={TERM_DIM} w={1.5} />
      <LP d="M104 62 L158 44 L172 42 L150 56 L138 70 L132 70 L140 54 L122 60 L112 72 L106 72 L114 58 L102 64 Z" c={TERM_PHOS} w={2} />
      <LDot cx={146} cy={52} r={1.6} c={TERM_SOFT} />
      <LDot cx={154} cy={49} r={1.6} c={TERM_SOFT} />
      <LP d="M86 78 Q104 72 122 76" c={TERM_MID} w={1.6} dash="4 4" />
      <LP d="M70 88 Q92 82 116 86" c={TERM_DIM} w={1.5} dash="4 5" />
      <LR x={150} y={86} width={22} height={18} rx={3} c={TERM_MID} w={1.7} />
      <LP d="M156 86 L156 80 Q156 76 161 76 Q166 76 166 80 L166 86" c={TERM_MID} w={1.7} />
      <LL x1={150} y1={95} x2={172} y2={95} c={TERM_MID} w={1.4} />
    </TermSceneRoot>
  );
}

export function TermBreakfastScene() {
  return (
    <TermSceneRoot>
      <LL x1={0} y1={102} x2={200} y2={102} c={TERM_DIM} w={1.8} />
      <LP d="M96 102 Q100 62 140 58 Q184 62 190 102" c={TERM_MID} w={1.7} />
      <LC cx={143} cy={66} r={20} c={TERM_SOFT} w={1.7} />
      <LP d="M123 66 L106 66 M163 66 L178 66 M143 46 L143 34 M130 52 L122 44 M156 52 L164 44" c={TERM_MID} w={1.5} />
      <LC cx={126} cy={90} r={17} c={TERM_PHOS} w={2} />
      <LC cx={122} cy={88} r={7} c={TERM_PHOS} w={1.8} />
      <LC cx={122} cy={88} r={3} c={TERM_SOFT} w={1.5} fill={TERM_DIM} />
      <LP d="M136 84 Q142 80 146 85 Q152 81 154 87 Q158 91 152 94 Q146 98 140 94 Q134 90 136 84 Z" c={TERM_PHOS} w={1.8} />
      <LC cx={148} cy={89} r={3.2} c={TERM_SOFT} w={1.4} fill={TERM_DIM} />
      <LP d="M102 74 Q108 70 114 74 Q120 78 126 74" c={TERM_MID} w={1.6} />
      <LR x={166} y={68} width={18} height={24} rx={2} c={TERM_PHOS} w={1.9} />
      <LP d="M184 74 Q192 76 190 83 Q188 89 184 88" c={TERM_PHOS} w={1.8} />
      <LP d="M170 60 Q168 54 172 50 M178 60 Q176 54 180 50" c={TERM_SOFT} w={1.5} />
      <LP d="M112 34 Q118 26 128 30" c={TERM_DIM} w={1.5} />
    </TermSceneRoot>
  );
}

export function TermLunchScene() {
  return (
    <TermSceneRoot>
      <LL x1={0} y1={104} x2={200} y2={104} c={TERM_DIM} w={1.8} />
      <LP d="M92 92 Q144 84 196 92" c={TERM_MID} w={1.7} />
      <LPoly points="104,82 168,82 160,66 112,66" close c={TERM_PHOS} w={2.1} />
      <LP d="M108 66 Q112 52 136 50 Q160 52 164 66" c={TERM_PHOS} w={2.1} />
      <LP d="M110 58 Q118 54 124 59 Q132 53 140 58 Q148 53 154 58 Q160 55 162 60" c={TERM_SOFT} w={1.6} />
      <LDot cx={126} cy={54} r={1.4} c={TERM_SOFT} />
      <LDot cx={144} cy={53} r={1.4} c={TERM_SOFT} />
      <LL x1={112} y1={74} x2={160} y2={74} c={TERM_MID} w={1.5} dash="3 3" />
      <LPoly points="172,104 176,64 194,64 196,104" close c={TERM_PHOS} w={1.9} />
      <LL x1={175} y1={76} x2={195} y2={76} c={TERM_MID} w={1.5} />
      <LP d="M184 64 L192 38" c={TERM_SOFT} w={1.9} />
      <LP d="M192 38 L198 38" c={TERM_SOFT} w={1.9} />
      <LPoly points="94,104 98,84 116,84 118,104" close c={TERM_MID} w={1.8} />
      <LL x1={102} y1={84} x2={102} y2={66} c={TERM_PHOS} w={1.8} />
      <LL x1={108} y1={84} x2={109} y2={62} c={TERM_PHOS} w={1.8} />
      <LL x1={114} y1={84} x2={116} y2={68} c={TERM_PHOS} w={1.8} />
    </TermSceneRoot>
  );
}

export function TermDinnerScene() {
  return (
    <TermSceneRoot>
      <LL x1={0} y1={104} x2={200} y2={104} c={TERM_DIM} w={1.8} />
      <LP d="M88 96 L196 96" c={TERM_MID} w={1.7} />
      <LP d="M108 84 Q108 58 138 56 Q168 58 168 84" c={TERM_PHOS} w={2.1} />
      <LL x1={100} y1={84} x2={176} y2={84} c={TERM_PHOS} w={2.1} />
      <LL x1={96} y1={92} x2={180} y2={92} c={TERM_PHOS} w={1.8} />
      <LC cx={138} cy={52} r={4} c={TERM_SOFT} w={1.7} />
      <LP d="M126 44 Q122 36 128 32 M138 42 Q136 34 141 29 M150 44 Q154 36 149 32" c={TERM_MID} w={1.5} />
      <LR x={94} y={34} width={7} height={34} rx={2} c={TERM_MID} w={1.7} />
      <LP d="M97 34 Q93 26 97 18 Q101 26 97 34 Z" c={TERM_SOFT} w={1.6} />
      <LDot cx={97} cy={27} r={1.6} c={TERM_SOFT} />
      <LP d="M182 62 Q182 76 174 76 Q166 76 166 62 Z" c={TERM_PHOS} w={1.8} />
      <LL x1={174} y1={76} x2={174} y2={92} c={TERM_PHOS} w={1.8} />
      <LL x1={166} y1={92} x2={182} y2={92} c={TERM_PHOS} w={1.8} />
      <LP d="M167 66 Q174 69 181 66" c={TERM_MID} w={1.4} />
      <LC cx={112} cy={98} r={1.6} c={TERM_DIM} />
      <LC cx={164} cy={98} r={1.6} c={TERM_DIM} />
    </TermSceneRoot>
  );
}

export function TermTdBurgerScene() {
  return (
    <TermSceneRoot>
      <LL x1={0} y1={106} x2={200} y2={106} c={TERM_DIM} w={1.8} />
      <LP d="M84 98 Q136 90 192 98 Q136 106 84 98 Z" c={TERM_MID} w={1.7} />
      <LP d="M104 62 Q106 38 134 36 Q162 38 164 62" c={TERM_PHOS} w={2.3} />
      <LDot cx={120} cy={47} r={1.6} c={TERM_SOFT} />
      <LDot cx={134} cy={43} r={1.6} c={TERM_SOFT} />
      <LDot cx={148} cy={47} r={1.6} c={TERM_SOFT} />
      <LP d="M102 62 Q110 68 118 62 Q126 69 134 62 Q142 69 150 62 Q158 68 166 62" c={TERM_SOFT} w={1.8} />
      <LR x={104} y={68} width={60} height={7} rx={3} c={TERM_PHOS} w={1.9} />
      <LP d="M106 78 L162 78 L158 86 L110 86 Z" c={TERM_PHOS} w={2} />
      <LP d="M108 86 Q134 92 160 86 L160 92 Q134 97 108 92 Z" c={TERM_PHOS} w={1.9} />
      <LPoly points="172,98 176,72 192,72 194,98" close c={TERM_MID} w={1.8} />
      <LL x1={180} y1={72} x2={181} y2={56} c={TERM_PHOS} w={1.8} />
      <LL x1={186} y1={72} x2={187} y2={54} c={TERM_PHOS} w={1.8} />
      <LL x1={191} y1={72} x2={193} y2={58} c={TERM_PHOS} w={1.8} />
      <LP d="M92 30 Q100 24 108 28" c={TERM_DIM} w={1.5} />
    </TermSceneRoot>
  );
}

export function TermParkKnottsScene() {
  return (
    <TermSceneRoot>
      <LP d="M0 34 L52 22 L104 32 L156 20 L200 30 L200 104 L0 104 Z" c={TERM_DIM} w={1.6} fill="none" />
      <LL x1={0} y1={104} x2={200} y2={104} c={TERM_DIM} w={1.8} />
      <LR x={104} y={56} width={56} height={48} c={TERM_PHOS} w={2} />
      <LPoly points="98,56 166,56 132,40" close c={TERM_PHOS} w={2} />
      <LR x={122} y={76} width={18} height={28} c={TERM_MID} w={1.8} />
      <LR x={110} y={63} width={12} height={10} c={TERM_SOFT} w={1.5} />
      <LR x={144} y={63} width={10} height={10} c={TERM_SOFT} w={1.5} />
      <LL x1={104} y1={66} x2={160} y2={66} c={TERM_MID} w={1.4} dash="4 3" />
      <LPoly points="168,104 170,36 186,36 188,104" c={TERM_MID} w={1.8} />
      <LPoly points="164,36 192,36 178,24" close c={TERM_MID} w={1.8} />
      <LL x1={170} y1={52} x2={186} y2={52} c={TERM_MID} w={1.4} />
      <LL x1={170} y1={72} x2={186} y2={72} c={TERM_MID} w={1.4} />
      <LP d="M88 104 L88 76 M88 84 Q78 82 80 72 M88 78 Q98 76 96 66" c={TERM_PHOS} w={2} />
      <LP d="M60 104 Q66 96 74 100" c={TERM_MID} w={1.5} />
      <LDot cx={52} cy={98} r={1.8} c={TERM_DIM} />
      <LDot cx={196} cy={14} r={1.6} c={TERM_MID} />
    </TermSceneRoot>
  );
}

export function TermParkSixFlagsScene() {
  return (
    <TermSceneRoot>
      <LL x1={0} y1={104} x2={200} y2={104} c={TERM_DIM} w={1.8} />
      <LP d="M84 104 L108 30 Q112 18 124 22 Q138 27 142 52" c={TERM_PHOS} w={2.2} />
      <LC cx={162} cy={72} r={22} c={TERM_PHOS} w={2.2} />
      <LP d="M142 52 Q150 66 140 78 Q128 92 132 104" c={TERM_PHOS} w={2.2} />
      <LL x1={108} y1={42} x2={146} y2={88} c={TERM_MID} w={1.5} />
      <LL x1={118} y1={30} x2={140} y2={98} c={TERM_MID} w={1.5} />
      <LL x1={96} y1={70} x2={136} y2={70} c={TERM_MID} w={1.3} dash="3 3" />
      <LL x1={150} y1={58} x2={176} y2={86} c={TERM_MID} w={1.3} dash="3 3" />
      <LR x={112} y={14} width={16} height={9} rx={2} c={TERM_SOFT} w={1.7} />
      <LL x1={188} y1={104} x2={188} y2={18} c={TERM_MID} w={1.8} />
      <LPoly points="188,18 200,22 188,27" close c={TERM_SOFT} w={1.6} />
      <LP d="M20 96 Q60 88 84 96" c={TERM_DIM} w={1.5} />
      <LDot cx={40} cy={30} r={1.6} c={TERM_DIM} />
      <LDot cx={66} cy={18} r={1.6} c={TERM_DIM} />
    </TermSceneRoot>
  );
}

export function TermParkDisneyScene() {
  return (
    <TermSceneRoot>
      <LL x1={0} y1={104} x2={200} y2={104} c={TERM_DIM} w={1.8} />
      <LDot cx={30} cy={18} r={1.7} c={TERM_MID} />
      <LDot cx={62} cy={10} r={1.5} c={TERM_DIM} />
      <LDot cx={188} cy={16} r={1.7} c={TERM_MID} />
      <LP d="M24 26 Q28 18 34 26 Q28 30 24 26 M172 30 Q176 22 182 30 Q176 34 172 30" c={TERM_MID} w={1.4} />
      <LR x={112} y={64} width={68} height={40} c={TERM_PHOS} w={2} />
      <LR x={100} y={76} width={16} height={28} c={TERM_PHOS} w={1.9} />
      <LR x={176} y={76} width={16} height={28} c={TERM_PHOS} w={1.9} />
      <LR x={136} y={44} width={20} height={60} c={TERM_PHOS} w={2.1} />
      <LPoly points="98,76 118,76 108,58" close c={TERM_SOFT} w={1.9} />
      <LPoly points="174,76 194,76 184,58" close c={TERM_SOFT} w={1.9} />
      <LPoly points="132,44 160,44 146,22" close c={TERM_SOFT} w={2} />
      <LL x1={146} y1={22} x2={146} y2={12} c={TERM_SOFT} w={1.7} />
      <LPoly points="146,12 154,15 146,18" close c={TERM_SOFT} w={1.5} />
      <LP d="M139 104 L139 86 Q139 76 146 76 Q153 76 153 86 L153 104" c={TERM_SOFT} w={1.8} />
      <LC cx={146} cy={58} r={4.5} c={TERM_SOFT} w={1.6} />
      <LR x={120} y={82} width={8} height={10} c={TERM_MID} w={1.4} />
      <LR x={164} y={82} width={8} height={10} c={TERM_MID} w={1.4} />
      <LL x1={112} y1={64} x2={180} y2={64} c={TERM_MID} w={1.4} />
    </TermSceneRoot>
  );
}

export function TermParkUniversalScene() {
  return (
    <TermSceneRoot>
      <LL x1={0} y1={104} x2={200} y2={104} c={TERM_DIM} w={1.8} />
      <LDot cx={104} cy={14} r={1.6} c={TERM_MID} />
      <LDot cx={186} cy={10} r={1.6} c={TERM_MID} />
      <LDot cx={92} cy={34} r={1.4} c={TERM_DIM} />
      <LC cx={146} cy={52} r={30} c={TERM_PHOS} w={2.2} />
      <LP d="M118 40 Q146 52 174 40 M118 64 Q146 52 174 64" c={TERM_MID} w={1.6} />
      <LP d="M146 22 Q132 52 146 82 M146 22 Q160 52 146 82" c={TERM_MID} w={1.6} />
      <LL x1={146} y1={22} x2={146} y2={82} c={TERM_DIM} w={1.3} />
      <LP d="M124 34 Q132 26 142 30 Q134 38 124 34 M158 66 Q168 62 172 70 Q162 74 158 66" c={TERM_SOFT} w={1.6} />
      <LPoly points="122,92 170,92 178,104 114,104" close c={TERM_PHOS} w={1.9} />
      <LL x1={128} y1={92} x2={128} y2={84} c={TERM_MID} w={1.6} />
      <LL x1={164} y1={92} x2={164} y2={84} c={TERM_MID} w={1.6} />
      <LP d="M96 104 Q100 88 108 84" c={TERM_DIM} w={1.5} />
      <LP d="M190 104 Q186 90 180 86" c={TERM_DIM} w={1.5} />
    </TermSceneRoot>
  );
}

export function TermParkLegolandScene() {
  return (
    <TermSceneRoot>
      <LL x1={0} y1={104} x2={200} y2={104} c={TERM_DIM} w={1.8} />
      <LR x={118} y={78} width={44} height={26} c={TERM_PHOS} w={2.1} />
      <LDot cx={128} cy={84} r={1.7} c={TERM_SOFT} />
      <LDot cx={140} cy={84} r={1.7} c={TERM_SOFT} />
      <LDot cx={152} cy={84} r={1.7} c={TERM_SOFT} />
      <LR x={124} y={54} width={44} height={24} c={TERM_PHOS} w={2.1} />
      <LDot cx={134} cy={60} r={1.7} c={TERM_SOFT} />
      <LDot cx={146} cy={60} r={1.7} c={TERM_SOFT} />
      <LDot cx={158} cy={60} r={1.7} c={TERM_SOFT} />
      <LR x={118} y={30} width={38} height={24} c={TERM_PHOS} w={2.1} />
      <LDot cx={128} cy={36} r={1.7} c={TERM_SOFT} />
      <LDot cx={140} cy={36} r={1.7} c={TERM_SOFT} />
      <LR x={130} y={10} width={26} height={20} c={TERM_SOFT} w={2} />
      <LDot cx={138} cy={15} r={1.5} c={TERM_PHOS} />
      <LDot cx={148} cy={15} r={1.5} c={TERM_PHOS} />
      <LR x={94} y={88} width={22} height={16} c={TERM_MID} w={1.8} />
      <LDot cx={101} cy={93} r={1.4} c={TERM_MID} />
      <LDot cx={109} cy={93} r={1.4} c={TERM_MID} />
      <LR x={166} y={88} width={22} height={16} c={TERM_MID} w={1.8} />
      <LDot cx={173} cy={93} r={1.4} c={TERM_MID} />
      <LDot cx={181} cy={93} r={1.4} c={TERM_MID} />
      <LR x={162} y={54} width={18} height={14} c={TERM_DIM} w={1.6} />
    </TermSceneRoot>
  );
}

export function TermParkSeaworldScene() {
  return (
    <TermSceneRoot>
      <LP d="M0 88 Q20 82 40 88 Q60 94 80 88 Q100 82 120 88 Q140 94 160 88 Q180 82 200 88" c={TERM_MID} w={1.8} />
      <LP d="M0 98 Q25 92 50 98 Q75 104 100 98 Q125 92 150 98 Q175 104 200 98" c={TERM_DIM} w={1.6} />
      <LP d="M96 70 Q104 34 138 28 Q168 24 182 44 Q168 40 158 44 Q164 56 158 68 Q146 50 124 54 Q102 58 96 70 Z" c={TERM_PHOS} w={2.2} />
      <LDot cx={133} cy={39} r={1.8} c={TERM_SOFT} />
      <LP d="M104 64 Q118 58 130 60" c={TERM_SOFT} w={1.6} />
      <LP d="M88 78 Q92 70 98 76 M108 80 Q112 72 118 78 M172 78 Q176 70 182 76" c={TERM_SOFT} w={1.6} />
      <LDot cx={92} cy={66} r={1.5} c={TERM_SOFT} />
      <LDot cx={104} cy={60} r={1.4} c={TERM_MID} />
      <LDot cx={182} cy={64} r={1.5} c={TERM_SOFT} />
      <LC cx={52} cy={26} r={10} c={TERM_DIM} w={1.6} />
      <LP d="M20 44 Q44 34 70 42" c={TERM_DIM} w={1.5} />
    </TermSceneRoot>
  );
}

export function TermParkGenericScene() {
  return (
    <TermSceneRoot>
      <LL x1={0} y1={104} x2={200} y2={104} c={TERM_DIM} w={1.8} />
      <LC cx={142} cy={50} r={36} c={TERM_PHOS} w={2.1} />
      <LC cx={142} cy={50} r={6} c={TERM_SOFT} w={1.8} />
      <LL x1={142} y1={14} x2={142} y2={86} c={TERM_MID} w={1.4} />
      <LL x1={106} y1={50} x2={178} y2={50} c={TERM_MID} w={1.4} />
      <LL x1={117} y1={25} x2={167} y2={75} c={TERM_MID} w={1.3} />
      <LL x1={167} y1={25} x2={117} y2={75} c={TERM_MID} w={1.3} />
      <LR x={136} y={6} width={12} height={9} rx={2} c={TERM_SOFT} w={1.6} />
      <LR x={102} y={44} width={11} height={9} rx={2} c={TERM_SOFT} w={1.6} />
      <LR x={171} y={44} width={11} height={9} rx={2} c={TERM_SOFT} w={1.6} />
      <LR x={136} y={84} width={12} height={9} rx={2} c={TERM_SOFT} w={1.6} />
      <LL x1={142} y1={86} x2={128} y2={104} c={TERM_PHOS} w={1.9} />
      <LL x1={142} y1={86} x2={156} y2={104} c={TERM_PHOS} w={1.9} />
      <LPoly points="84,104 88,78 104,78 108,104" close c={TERM_MID} w={1.7} />
      <LPoly points="84,78 108,78 96,64" close c={TERM_MID} w={1.7} />
      <LL x1={96} y1={64} x2={96} y2={56} c={TERM_MID} w={1.5} />
      <LDot cx={40} cy={20} r={1.6} c={TERM_DIM} />
      <LDot cx={70} cy={12} r={1.5} c={TERM_DIM} />
    </TermSceneRoot>
  );
}

export function TermMovieGenericScene() {
  return (
    <TermSceneRoot>
      <LR x={96} y={14} width={92} height={58} rx={2} c={TERM_PHOS} w={2.2} />
      <LP d="M108 58 L128 34 L144 52 L158 38 L176 58" c={TERM_MID} w={1.7} />
      <LC cx={168} cy={26} r={3.5} c={TERM_SOFT} w={1.5} />
      <LL x1={96} y1={14} x2={88} y2={8} c={TERM_DIM} w={1.4} />
      <LL x1={188} y1={14} x2={196} y2={8} c={TERM_DIM} w={1.4} />
      <LPoly points="102,104 106,88 124,88 126,104" close c={TERM_MID} w={1.8} />
      <LC cx={115} cy={82} r={6} c={TERM_MID} w={1.7} />
      <LPoly points="132,104 136,88 154,88 156,104" close c={TERM_PHOS} w={1.8} />
      <LC cx={145} cy={82} r={6} c={TERM_PHOS} w={1.7} />
      <LPoly points="162,104 166,88 184,88 186,104" close c={TERM_MID} w={1.8} />
      <LC cx={175} cy={82} r={6} c={TERM_MID} w={1.7} />
      <LPoly points="86,96 90,78 102,78 104,96" close c={TERM_SOFT} w={1.6} />
      <LL x1={88} y1={84} x2={103} y2={84} c={TERM_MID} w={1.3} />
      <LDot cx={92} cy={74} r={1.6} c={TERM_SOFT} />
      <LDot cx={98} cy={72} r={1.5} c={TERM_SOFT} />
      <LDot cx={95} cy={68} r={1.4} c={TERM_SOFT} />
    </TermSceneRoot>
  );
}

export function TermTheaterGenericScene() {
  return (
    <TermSceneRoot>
      <LL x1={0} y1={102} x2={200} y2={102} c={TERM_DIM} w={1.8} />
      <LP d="M92 10 Q88 50 94 92" c={TERM_PHOS} w={2.2} />
      <LP d="M102 10 Q99 50 104 92" c={TERM_MID} w={1.7} />
      <LP d="M192 10 Q196 50 190 92" c={TERM_PHOS} w={2.2} />
      <LP d="M182 10 Q185 50 180 92" c={TERM_MID} w={1.7} />
      <LL x1={88} y1={10} x2={196} y2={10} c={TERM_PHOS} w={2.2} />
      <LP d="M94 18 Q142 30 190 18" c={TERM_MID} w={1.6} />
      <LL x1={142} y1={24} x2={142} y2={72} c={TERM_DIM} w={1.5} />
      <LC cx={142} cy={78} r={5} c={TERM_SOFT} w={1.8} />
      <LP d="M128 62 Q124 48 132 42 Q142 36 148 46 Q154 38 160 46 Q166 54 158 62 Q146 68 134 64 Z" c={TERM_SOFT} w={1.7} />
      <LDot cx={112} cy={96} r={1.9} c={TERM_SOFT} />
      <LDot cx={128} cy={97} r={1.9} c={TERM_SOFT} />
      <LDot cx={144} cy={97} r={1.9} c={TERM_SOFT} />
      <LDot cx={160} cy={97} r={1.9} c={TERM_SOFT} />
      <LDot cx={176} cy={96} r={1.9} c={TERM_SOFT} />
      <LP d="M108 92 L180 92" c={TERM_MID} w={1.5} />
    </TermSceneRoot>
  );
}

export function TermMvResidentEvilScene() {
  return (
    <TermSceneRoot>
      <LL x1={0} y1={104} x2={200} y2={104} c={TERM_DIM} w={1.8} />
      <LR x={108} y={22} width={66} height={82} c={TERM_PHOS} w={2.1} />
      <LP d="M118 104 L118 58 Q118 44 141 44 Q164 44 164 58 L164 104" c={TERM_MID} w={1.8} />
      <LC cx={158} cy={76} r={2.2} c={TERM_SOFT} w={1.5} />
      <LL x1={108} y1={36} x2={174} y2={36} c={TERM_MID} w={1.5} />
      <LP d="M122 22 L128 10 L136 20 L144 8 L152 20 L160 12 L166 22" c={TERM_DIM} w={1.6} />
      <LR x={88} y={40} width={14} height={22} c={TERM_MID} w={1.6} />
      <LP d="M90 62 L100 42 M90 42 L100 60" c={TERM_DIM} w={1.3} />
      <LP d="M182 104 L182 84 M176 84 L188 84" c={TERM_MID} w={1.7} />
      <LP d="M182 84 Q174 70 180 62 Q186 70 182 84 Q190 68 196 76 Q192 84 182 84 Z" c={TERM_SOFT} w={1.6} />
      <LL x1={141} y1={22} x2={141} y2={14} c={TERM_SOFT} w={1.5} />
      <LDot cx={141} cy={11} r={2} c={TERM_SOFT} />
      <LP d="M96 104 Q104 92 100 84" c={TERM_DIM} w={1.4} />
    </TermSceneRoot>
  );
}

export function TermMvBuddyScene() {
  return (
    <TermSceneRoot>
      <LP d="M0 72 L54 58 L104 68 L154 52 L200 62 L200 104 L0 104 Z" c={TERM_DIM} w={1.6} />
      <LL x1={0} y1={104} x2={200} y2={104} c={TERM_DIM} w={1.7} />
      <LP d="M104 104 Q124 88 142 84 Q168 78 196 82" c={TERM_MID} w={1.8} />
      <LP d="M118 98 Q124 94 130 97 M142 90 Q148 87 154 89 M168 85 Q174 82 180 84" c={TERM_DIM} w={1.4} dash="3 3" />
      <LC cx={182} cy={18} r={9} c={TERM_SOFT} w={1.7} />
      <TFigure x={128} y={82} s={0.92} pose="stand" />
      <TFigure x={156} y={84} s={0.82} c={TERM_SOFT} pose="stand" />
      <LP d="M176 82 L176 52 M176 60 Q164 56 166 46 M176 62 Q188 58 186 48" c={TERM_MID} w={1.8} />
      <LC cx={166} cy={44} r={3} c={TERM_MID} w={1.4} />
      <LC cx={186} cy={46} r={3} c={TERM_MID} w={1.4} />
      <LP d="M92 52 Q100 44 110 50" c={TERM_DIM} w={1.5} />
    </TermSceneRoot>
  );
}

export function TermMvBlackPhoneScene() {
  return (
    <TermSceneRoot>
      <LL x1={0} y1={104} x2={200} y2={104} c={TERM_DIM} w={1.8} />
      <LL x1={150} y1={0} x2={150} y2={18} c={TERM_MID} w={1.7} />
      <LC cx={150} cy={26} r={8} c={TERM_SOFT} w={1.9} />
      <LP d="M142 22 Q138 30 142 34 M158 22 Q162 30 158 34" c={TERM_MID} w={1.4} />
      <LDot cx={150} cy={26} r={2} c={TERM_SOFT} />
      <LR x={102} y={30} width={40} height={56} rx={4} c={TERM_PHOS} w={2.2} />
      <LPoly points="100,30 106,20 138,20 144,30" close c={TERM_PHOS} w={2} />
      <LC cx={114} cy={25} r={3.4} c={TERM_SOFT} w={1.5} />
      <LC cx={130} cy={25} r={3.4} c={TERM_SOFT} w={1.5} />
      <LC cx={122} cy={54} r={11} c={TERM_MID} w={1.7} />
      <LDot cx={122} cy={43} r={1.5} c={TERM_SOFT} />
      <LDot cx={130} cy={48} r={1.5} c={TERM_SOFT} />
      <LDot cx={133} cy={56} r={1.5} c={TERM_SOFT} />
      <LDot cx={130} cy={64} r={1.5} c={TERM_SOFT} />
      <LDot cx={122} cy={67} r={1.5} c={TERM_SOFT} />
      <LDot cx={114} cy={64} r={1.5} c={TERM_SOFT} />
      <LDot cx={111} cy={56} r={1.5} c={TERM_SOFT} />
      <LDot cx={114} cy={48} r={1.5} c={TERM_SOFT} />
      <LC cx={122} cy={54} r={2.4} c={TERM_SOFT} w={1.4} />
      <LP d="M142 44 Q156 50 150 60 Q144 68 152 74 Q160 80 154 88 Q148 96 156 102" c={TERM_PHOS} w={1.9} />
      <LP d="M96 104 Q104 96 112 100" c={TERM_DIM} w={1.4} />
      <LR x={168} y={64} width={22} height={28} c={TERM_DIM} w={1.6} />
      <LP d="M172 78 L186 78 M172 84 L182 84" c={TERM_DIM} w={1.3} />
    </TermSceneRoot>
  );
}

export function TermMvBackroomsScene() {
  return (
    <TermSceneRoot>
      <LP d="M84 18 L200 10 M84 102 L200 110 M84 18 L84 102" c={TERM_DIM} w={1.6} />
      <LR x={96} y={24} width={34} height={66} c={TERM_PHOS} w={2} />
      <LR x={138} y={20} width={26} height={76} c={TERM_MID} w={1.8} />
      <LR x={170} y={17} width={20} height={82} c={TERM_DIM} w={1.6} />
      <LR x={104} y={8} width={28} height={10} c={TERM_MID} w={1.5} />
      <LR x={146} y={5} width={24} height={9} c={TERM_DIM} w={1.4} />
      <LL x1={96} y1={58} x2={200} y2={52} c={TERM_DIM} w={1.3} />
      <LP d="M96 90 L200 96" c={TERM_DIM} w={1.3} dash="5 4" />
      <LP d="M112 90 L112 66 Q112 58 118 58 Q124 58 124 66 L124 90" c={TERM_DIM} w={1.4} />
      <LP d="M148 78 Q156 70 164 76" c={TERM_DIM} w={1.3} />
      <LDot cx={40} cy={22} r={1.5} c={TERM_DIM} />
      <LP d="M20 104 L84 96" c={TERM_DIM} w={1.5} />
    </TermSceneRoot>
  );
}

export function TermMvExit8Scene() {
  return (
    <TermSceneRoot>
      <LP d="M86 14 L200 22 M86 106 L200 98 M86 14 L86 106" c={TERM_DIM} w={1.6} />
      <LR x={104} y={30} width={20} height={62} c={TERM_PHOS} w={1.9} />
      <LR x={132} y={28} width={18} height={66} c={TERM_MID} w={1.7} />
      <LR x={158} y={26} width={16} height={70} c={TERM_DIM} w={1.6} />
      <LL x1={104} y1={46} x2={124} y2={46} c={TERM_MID} w={1.3} />
      <LL x1={104} y1={62} x2={124} y2={62} c={TERM_MID} w={1.3} />
      <LR x={118} y={6} width={52} height={16} rx={2} c={TERM_SOFT} w={1.8} />
      <LP d="M128 14 L142 14 M150 9 L150 19 M156 14 L164 14" c={TERM_MID} w={1.5} />
      <LP d="M90 98 L198 90" c={TERM_SOFT} w={1.7} dash="6 4" />
      <LR x={180} y={44} width={16} height={24} c={TERM_MID} w={1.5} />
      <LL x1={183} y1={52} x2={193} y2={52} c={TERM_DIM} w={1.2} />
      <LL x1={183} y1={58} x2={193} y2={58} c={TERM_DIM} w={1.2} />
      <TFigure x={96} y={100} s={0.62} c={TERM_DIM} pose="stand" />
    </TermSceneRoot>
  );
}

export function TermMvDeadpoolScene() {
  return (
    <TermSceneRoot>
      <LL x1={0} y1={104} x2={200} y2={104} c={TERM_DIM} w={1.8} />
      <LP d="M104 22 L172 88 M176 20 L108 90" c={TERM_MID} w={2} />
      <LL x1={104} y1={22} x2={96} y2={12} c={TERM_MID} w={2.2} />
      <LL x1={176} y1={20} x2={184} y2={10} c={TERM_MID} w={2.2} />
      <LP d="M118 34 Q118 14 140 13 Q162 14 162 34 Q162 62 152 78 Q140 88 128 78 Q118 62 118 34 Z" c={TERM_PHOS} w={2.3} />
      <LP d="M124 38 Q124 30 132 30 Q139 30 139 39 Q139 47 132 47 Q125 47 124 38 Z" c={TERM_SOFT} w={1.8} fill={TERM_DIM} />
      <LP d="M141 39 Q141 30 148 30 Q156 30 156 38 Q155 47 148 47 Q141 47 141 39 Z" c={TERM_SOFT} w={1.8} fill={TERM_DIM} />
      <LDot cx={132} cy={39} r={1.7} c={TERM_PHOS} />
      <LDot cx={148} cy={39} r={1.7} c={TERM_PHOS} />
      <LP d="M128 68 Q140 73 152 68" c={TERM_MID} w={1.6} />
      <LP d="M140 13 L140 34 M126 18 Q140 26 154 18" c={TERM_MID} w={1.4} />
      <LC cx={112} cy={94} r={7} c={TERM_MID} w={1.6} />
      <LP d="M106 94 Q112 90 118 94" c={TERM_MID} w={1.4} />
      <LDot cx={182} cy={96} r={1.8} c={TERM_DIM} />
    </TermSceneRoot>
  );
}

export function TermMvFnafScene() {
  return (
    <TermSceneRoot>
      <LP d="M88 8 Q84 52 90 100 M196 8 Q198 52 194 100" c={TERM_DIM} w={1.7} />
      <LL x1={0} y1={104} x2={200} y2={104} c={TERM_DIM} w={1.8} />
      <LC cx={116} cy={28} r={10} c={TERM_PHOS} w={2} />
      <LC cx={164} cy={28} r={10} c={TERM_PHOS} w={2} />
      <LC cx={116} cy={28} r={4.5} c={TERM_MID} w={1.5} />
      <LC cx={164} cy={28} r={4.5} c={TERM_MID} w={1.5} />
      <LR x={126} y={4} width={28} height={12} rx={1} c={TERM_PHOS} w={2} />
      <LL x1={118} y1={16} x2={162} y2={16} c={TERM_PHOS} w={2.1} />
      <LP d="M112 52 Q112 26 140 25 Q168 26 168 52 Q168 78 154 86 Q140 91 126 86 Q112 78 112 52 Z" c={TERM_PHOS} w={2.2} />
      <LC cx={128} cy={48} r={3.2} c={TERM_SOFT} w={1.5} fill={TERM_DIM} />
      <LC cx={152} cy={48} r={3.2} c={TERM_SOFT} w={1.5} fill={TERM_DIM} />
      <LP d="M126 66 Q140 60 154 66 Q154 76 140 77 Q126 76 126 66 Z" c={TERM_SOFT} w={1.8} />
      <LC cx={140} cy={65} r={2.2} c={TERM_PHOS} w={1.4} />
      <LL x1={132} y1={74} x2={132} y2={70} c={TERM_MID} w={1.3} />
      <LL x1={140} y1={75} x2={140} y2={71} c={TERM_MID} w={1.3} />
      <LL x1={148} y1={74} x2={148} y2={70} c={TERM_MID} w={1.3} />
      <LPoly points="130,92 140,86 140,98" close c={TERM_MID} w={1.6} />
      <LPoly points="150,92 140,86 140,98" close c={TERM_MID} w={1.6} />
      <LDot cx={98} cy={30} r={1.6} c={TERM_MID} />
      <LDot cx={186} cy={30} r={1.6} c={TERM_MID} />
    </TermSceneRoot>
  );
}

export function TermMvIronLungScene() {
  return (
    <TermSceneRoot>
      <LC cx={142} cy={52} r={34} c={TERM_PHOS} w={2.4} />
      <LC cx={142} cy={52} r={27} c={TERM_MID} w={1.6} />
      <LDot cx={142} cy={22} r={1.9} c={TERM_SOFT} />
      <LDot cx={163} cy={30} r={1.9} c={TERM_SOFT} />
      <LDot cx={171} cy={52} r={1.9} c={TERM_SOFT} />
      <LDot cx={163} cy={74} r={1.9} c={TERM_SOFT} />
      <LDot cx={142} cy={82} r={1.9} c={TERM_SOFT} />
      <LDot cx={121} cy={74} r={1.9} c={TERM_SOFT} />
      <LDot cx={113} cy={52} r={1.9} c={TERM_SOFT} />
      <LDot cx={121} cy={30} r={1.9} c={TERM_SOFT} />
      <LP d="M118 62 Q126 56 134 62 Q142 68 150 62 Q158 56 166 62" c={TERM_SOFT} w={1.8} />
      <LP d="M120 72 Q128 66 136 72 Q144 78 152 72 Q160 66 164 70" c={TERM_MID} w={1.6} />
      <LP d="M122 42 Q132 36 142 42 Q152 48 162 40" c={TERM_MID} w={1.5} dash="4 3" />
      <LC cx={98} cy={30} r={9} c={TERM_MID} w={1.7} />
      <LP d="M98 30 L104 24" c={TERM_SOFT} w={1.6} />
      <LDot cx={98} cy={30} r={1.5} c={TERM_SOFT} />
      <LR x={88} y={56} width={20} height={26} c={TERM_MID} w={1.6} />
      <LDot cx={94} cy={64} r={1.7} c={TERM_SOFT} />
      <LDot cx={102} cy={64} r={1.7} c={TERM_DIM} />
      <LP d="M90 104 Q120 98 150 102 Q175 105 198 100" c={TERM_DIM} w={1.6} />
      <LP d="M176 30 Q184 22 192 28" c={TERM_DIM} w={1.4} />
    </TermSceneRoot>
  );
}

export function TermMvNimrodsScene() {
  return (
    <TermSceneRoot>
      <LDot cx={102} cy={14} r={1.5} c={TERM_MID} />
      <LDot cx={128} cy={8} r={1.4} c={TERM_DIM} />
      <LDot cx={186} cy={30} r={1.5} c={TERM_MID} />
      <LP d="M182 8 Q172 16 182 26 Q162 24 160 14 Q162 4 182 8 Z" c={TERM_SOFT} w={1.7} />
      <LL x1={0} y1={104} x2={200} y2={104} c={TERM_DIM} w={1.8} />
      <LPoly points="118,104 124,52 156,52 162,104" close c={TERM_PHOS} w={2} />
      <LR x={112} y={36} width={56} height={16} c={TERM_PHOS} w={2} />
      <LC cx={140} cy={44} r={5} c={TERM_SOFT} w={1.6} />
      <LL x1={118} y1={66} x2={162} y2={66} c={TERM_MID} w={1.4} />
      <LL x1={120} y1={84} x2={160} y2={84} c={TERM_MID} w={1.4} />
      <LP d="M124 52 L104 104 M156 52 L176 104" c={TERM_MID} w={1.6} />
      <LP d="M112 78 L168 78" c={TERM_MID} w={1.3} dash="4 3" />
      <LP d="M140 36 L140 20" c={TERM_SOFT} w={1.6} />
      <LP d="M140 20 L176 34" c={TERM_SOFT} w={1.4} dash="3 3" />
      <LC cx={180} cy={36} r={3} c={TERM_SOFT} w={1.4} />
      <LP d="M88 104 Q94 88 104 84" c={TERM_DIM} w={1.5} />
    </TermSceneRoot>
  );
}

export function TermMvIdiotsScene() {
  return (
    <TermSceneRoot>
      <LC cx={184} cy={16} r={8} c={TERM_SOFT} w={1.7} />
      <LL x1={0} y1={104} x2={200} y2={104} c={TERM_DIM} w={1.8} />
      <LP d="M86 88 Q88 70 106 68 L162 68 Q178 68 182 82 L184 88" c={TERM_PHOS} w={2.1} />
      <LP d="M104 68 L112 54 L146 54 L156 68" c={TERM_PHOS} w={2} />
      <LL x1={129} y1={54} x2={129} y2={68} c={TERM_MID} w={1.5} />
      <LR x={116} y={58} width={10} height={8} c={TERM_MID} w={1.3} />
      <LR x={133} y={58} width={10} height={8} c={TERM_MID} w={1.3} />
      <LC cx={110} cy={90} r={8} c={TERM_PHOS} w={1.9} />
      <LC cx={164} cy={90} r={8} c={TERM_PHOS} w={1.9} />
      <LC cx={110} cy={90} r={3} c={TERM_MID} w={1.4} />
      <LC cx={164} cy={90} r={3} c={TERM_MID} w={1.4} />
      <LP d="M88 74 L66 62" c={TERM_MID} w={1.8} />
      <LP d="M66 62 Q58 64 60 72" c={TERM_MID} w={1.6} />
      <LR x={118} y={40} width={26} height={12} rx={2} c={TERM_MID} w={1.7} />
      <LL x1={118} y1={46} x2={144} y2={46} c={TERM_MID} w={1.3} />
      <TFigure x={94} y={104} s={0.72} c={TERM_MID} pose="stand" />
      <LP d="M176 52 Q182 44 190 50" c={TERM_DIM} w={1.4} />
      <LDot cx={150} cy={80} r={1.7} c={TERM_SOFT} />
    </TermSceneRoot>
  );
}

export function TermMvNobodyScene() {
  return (
    <TermSceneRoot>
      <LL x1={0} y1={104} x2={200} y2={104} c={TERM_DIM} w={1.8} />
      <LDot cx={112} cy={12} r={1.5} c={TERM_DIM} />
      <LDot cx={192} cy={10} r={1.5} c={TERM_MID} />
      <LP d="M30 20 Q36 12 44 18" c={TERM_DIM} w={1.4} />
      <LR x={118} y={54} width={62} height={50} c={TERM_PHOS} w={2} />
      <LPoly points="112,54 186,54 149,32" close c={TERM_PHOS} w={2} />
      <LR x={160} y={38} width={10} height={14} c={TERM_MID} w={1.6} />
      <LR x={126} y={64} width={12} height={12} c={TERM_SOFT} w={1.5} />
      <LL x1={132} y1={64} x2={132} y2={76} c={TERM_MID} w={1.2} />
      <LP d="M144 104 L144 78 Q144 70 149 70 Q154 70 154 78 L154 104" c={TERM_MID} w={1.7} />
      <LL x1={92} y1={104} x2={92} y2={48} c={TERM_MID} w={1.8} />
      <LP d="M92 48 Q92 40 100 40" c={TERM_MID} w={1.8} />
      <LC cx={103} cy={42} r={3.4} c={TERM_SOFT} w={1.6} />
      <LP d="M84 52 Q103 62 122 54" c={TERM_DIM} w={1.3} />
      <TFigure x={108} y={102} s={0.78} c={TERM_MID} pose="stand" />
      <LR x={172} y={86} width={16} height={10} c={TERM_DIM} w={1.5} />
      <LL x1={180} y1={96} x2={180} y2={104} c={TERM_DIM} w={1.5} />
    </TermSceneRoot>
  );
}

export function TermMvMarioScene() {
  return (
    <TermSceneRoot>
      <LL x1={0} y1={104} x2={200} y2={104} c={TERM_DIM} w={1.8} />
      <LP d="M84 104 L84 98 L196 98 L196 104" c={TERM_MID} w={1.7} />
      <LP d="M92 22 Q98 14 108 20 Q116 12 126 19 Q134 15 136 23 L90 23 Q88 17 92 22 Z" c={TERM_DIM} w={1.5} />
      <LR x={142} y={62} width={38} height={42} c={TERM_PHOS} w={2.2} />
      <LR x={136} y={52} width={50} height={12} rx={2} c={TERM_PHOS} w={2.2} />
      <LP d="M148 76 Q161 82 174 76" c={TERM_MID} w={1.5} />
      <LR x={100} y={30} width={18} height={18} c={TERM_SOFT} w={1.9} />
      <LDot cx={109} cy={39} r={2} c={TERM_SOFT} />
      <LR x={126} y={22} width={18} height={18} c={TERM_MID} w={1.8} />
      <LDot cx={135} cy={31} r={1.8} c={TERM_MID} />
      <LC cx={162} cy={30} r={9} c={TERM_SOFT} w={1.9} />
      <LC cx={162} cy={30} r={4.5} c={TERM_MID} w={1.4} />
      <LP d="M94 88 Q100 74 110 82 Q118 88 112 98" c={TERM_MID} w={1.7} />
      <LC cx={103} cy={76} r={4} c={TERM_MID} w={1.5} />
      <LDot cx={188} cy={44} r={1.6} c={TERM_MID} />
      <LP d="M52 92 Q70 84 86 90" c={TERM_DIM} w={1.5} />
    </TermSceneRoot>
  );
}

export function TermMvToyStoryScene() {
  return (
    <TermSceneRoot>
      <LR x={128} y={10} width={56} height={44} c={TERM_MID} w={1.8} />
      <LL x1={156} y1={10} x2={156} y2={54} c={TERM_MID} w={1.4} />
      <LL x1={128} y1={32} x2={184} y2={32} c={TERM_MID} w={1.4} />
      <LDot cx={140} cy={20} r={1.6} c={TERM_SOFT} />
      <LDot cx={170} cy={42} r={1.5} c={TERM_SOFT} />
      <LP d="M172 12 Q166 18 172 24 Q164 22 164 16 Q164 10 172 12 Z" c={TERM_SOFT} w={1.5} />
      <LL x1={0} y1={104} x2={200} y2={104} c={TERM_DIM} w={1.8} />
      <LC cx={112} cy={84} r={13} c={TERM_PHOS} w={2} />
      <LPoly points="112,74 115,81 122,81 117,86 119,93 112,89 105,93 107,86 102,81 109,81" close c={TERM_SOFT} w={1.5} />
      <LPoly points="136,104 142,78 160,70 168,78 164,104" close c={TERM_MID} w={1.8} />
      <LP d="M142 78 Q152 72 160 78" c={TERM_MID} w={1.5} />
      <LDot cx={150} cy={88} r={1.7} c={TERM_SOFT} />
      <LDot cx={156} cy={94} r={1.7} c={TERM_MID} />
      <LR x={88} y={88} width={16} height={16} c={TERM_MID} w={1.7} />
      <LR x={170} y={90} width={14} height={14} c={TERM_DIM} w={1.6} />
      <LP d="M92 40 Q104 30 118 38" c={TERM_DIM} w={1.5} />
      <LP d="M118 38 L126 30 M118 38 L128 40" c={TERM_DIM} w={1.4} />
    </TermSceneRoot>
  );
}

export function TermMvZootopiaScene() {
  return (
    <TermSceneRoot>
      <LP d="M82 6 Q120 -2 200 8" c={TERM_MID} w={1.7} />
      <LDot cx={104} cy={6} r={1.6} c={TERM_MID} />
      <LDot cx={140} cy={3} r={1.6} c={TERM_MID} />
      <LDot cx={176} cy={6} r={1.6} c={TERM_MID} />
      <LL x1={0} y1={104} x2={200} y2={104} c={TERM_DIM} w={1.8} />
      <LR x={96} y={48} width={18} height={56} c={TERM_MID} w={1.8} />
      <LR x={118} y={30} width={22} height={74} c={TERM_PHOS} w={2} />
      <LPoly points="118,30 140,30 129,16" close c={TERM_PHOS} w={1.9} />
      <LR x={144} y={42} width={18} height={62} c={TERM_MID} w={1.8} />
      <LR x={166} y={22} width={20} height={82} c={TERM_PHOS} w={2} />
      <LC cx={176} cy={16} r={6} c={TERM_SOFT} w={1.6} />
      <LDot cx={104} cy={60} r={1.5} c={TERM_SOFT} />
      <LDot cx={104} cy={74} r={1.5} c={TERM_MID} />
      <LDot cx={128} cy={48} r={1.5} c={TERM_SOFT} />
      <LDot cx={128} cy={64} r={1.5} c={TERM_MID} />
      <LDot cx={152} cy={58} r={1.5} c={TERM_SOFT} />
      <LDot cx={176} cy={40} r={1.5} c={TERM_SOFT} />
      <LDot cx={176} cy={58} r={1.5} c={TERM_MID} />
      <LDot cx={176} cy={76} r={1.5} c={TERM_SOFT} />
      <LP d="M88 96 L196 96" c={TERM_DIM} w={1.4} dash="5 4" />
      <LPoly points="122,96 126,86 146,86 150,96" close c={TERM_SOFT} w={1.6} />
      <LC cx={128} cy={98} r={3} c={TERM_SOFT} w={1.4} />
      <LC cx={144} cy={98} r={3} c={TERM_SOFT} w={1.4} />
    </TermSceneRoot>
  );
}

export function TermMvSpidermanScene() {
  return (
    <TermSceneRoot>
      <LL x1={0} y1={104} x2={200} y2={104} c={TERM_DIM} w={1.8} />
      <LR x={88} y={56} width={28} height={48} c={TERM_DIM} w={1.7} />
      <LR x={168} y={48} width={30} height={56} c={TERM_DIM} w={1.7} />
      <LDot cx={98} cy={68} r={1.5} c={TERM_MID} />
      <LDot cx={106} cy={82} r={1.5} c={TERM_MID} />
      <LDot cx={180} cy={62} r={1.5} c={TERM_MID} />
      <LDot cx={188} cy={78} r={1.5} c={TERM_MID} />
      <LP d="M104 6 L142 44 M104 6 L128 50 M104 6 L160 38 M104 6 L116 54 M128 50 L160 38 M142 44 L128 50 M142 44 L160 38" c={TERM_MID} w={1.3} />
      <LC cx={104} cy={6} r={3} c={TERM_SOFT} w={1.6} />
      <LL x1={138} y1={46} x2={138} y2={62} c={TERM_SOFT} w={1.7} />
      <TFigure x={138} y={96} s={0.78} c={TERM_PHOS} pose="stand" />
      <LR x={124} y={66} width={18} height={26} c={TERM_MID} w={1.6} />
      <LDot cx={130} cy={74} r={1.4} c={TERM_MID} />
      <LP d="M152 104 L156 74 L172 74 L176 104" c={TERM_MID} w={1.7} />
      <LL x1={150} y1={74} x2={178} y2={74} c={TERM_MID} w={1.6} />
    </TermSceneRoot>
  );
}

export function TermMvAvengersDoomsdayScene() {
  return (
    <TermSceneRoot>
      <LL x1={0} y1={104} x2={200} y2={104} c={TERM_DIM} w={1.8} />
      <LP d="M84 104 L92 70 L100 84 L108 56 L118 76 L128 48" c={TERM_DIM} w={1.7} />
      <LP d="M176 104 L182 76 L188 88 L196 64 L200 78" c={TERM_DIM} w={1.7} />
      <LR x={126} y={42} width={44} height={62} c={TERM_PHOS} w={2} />
      <LPoly points="122,42 174,42 148,22" close c={TERM_PHOS} w={2} />
      <LR x={140} y={14} width={16} height={14} c={TERM_PHOS} w={1.9} />
      <LP d="M138 104 L138 76 Q138 64 148 64 Q158 64 158 76 L158 104" c={TERM_MID} w={1.7} />
      <LP d="M148 22 L148 6" c={TERM_SOFT} w={1.6} />
      <LP d="M118 30 L128 18 L124 30 L134 16" c={TERM_SOFT} w={1.6} />
      <TFigure x={148} y={104} s={0.62} c={TERM_SOFT} pose="stand" />
      <LP d="M132 88 Q148 80 164 88" c={TERM_DIM} w={1.4} />
      <LP d="M96 104 L108 92 L118 100" c={TERM_MID} w={1.5} />
      <LDot cx={188} cy={24} r={1.6} c={TERM_MID} />
      <LDot cx={104} cy={18} r={1.5} c={TERM_DIM} />
    </TermSceneRoot>
  );
}

export function TermMvShrekScene() {
  return (
    <TermSceneRoot>
      <LC cx={146} cy={34} r={17} c={TERM_SOFT} w={1.9} />
      <LP d="M112 52 L180 52" c={TERM_MID} w={1.6} />
      <LP d="M0 78 Q40 70 84 78 Q130 86 200 74" c={TERM_DIM} w={1.7} />
      <LP d="M0 92 Q50 84 104 92 Q154 100 200 90" c={TERM_DIM} w={1.6} />
      <LL x1={0} y1={106} x2={200} y2={106} c={TERM_DIM} w={1.7} />
      <LP d="M102 92 L102 62 M102 74 Q92 70 94 60 M102 68 Q112 64 110 54" c={TERM_PHOS} w={2} />
      <LP d="M124 94 L124 58 M124 72 Q114 66 118 56 M124 66 Q134 62 132 50" c={TERM_PHOS} w={2} />
      <LP d="M182 94 L182 56 M182 68 Q172 64 174 54" c={TERM_MID} w={1.9} />
      <LR x={148} y={60} width={26} height={34} c={TERM_MID} w={1.8} />
      <LPoly points="144,60 178,60 161,46" close c={TERM_MID} w={1.8} />
      <LC cx={168} cy={76} r={2} c={TERM_SOFT} w={1.4} />
      <LC cx={112} cy={86} r={3.4} c={TERM_MID} w={1.4} />
      <LC cx={136} cy={90} r={2.6} c={TERM_MID} w={1.3} />
      <LC cx={94} cy={88} r={2.2} c={TERM_DIM} w={1.2} />
      <LDot cx={70} cy={56} r={1.6} c={TERM_MID} />
      <LDot cx={188} cy={40} r={1.5} c={TERM_MID} />
    </TermSceneRoot>
  );
}

export function TermMvHungerGamesScene() {
  return (
    <TermSceneRoot>
      <LL x1={0} y1={104} x2={200} y2={104} c={TERM_DIM} w={1.8} />
      <LPoly points="92,104 98,54 104,104" close c={TERM_MID} w={1.7} />
      <LPoly points="90,68 106,68 98,48" close c={TERM_MID} w={1.6} />
      <LPoly points="182,104 189,46 196,104" close c={TERM_MID} w={1.7} />
      <LPoly points="180,62 198,62 189,40" close c={TERM_MID} w={1.6} />
      <LC cx={142} cy={38} r={20} c={TERM_PHOS} w={2.1} />
      <LP d="M128 44 Q134 28 146 30 Q140 34 142 38 Q150 32 156 38 Q150 40 152 46 Q144 50 136 48 Q130 47 128 44 Z" c={TERM_SOFT} w={1.7} />
      <LDot cx={146} cy={36} r={1.5} c={TERM_PHOS} />
      <LP d="M132 52 Q142 58 154 50" c={TERM_MID} w={1.4} />
      <LP d="M116 88 Q124 76 132 86 Q140 72 148 84 Q156 74 162 86" c={TERM_SOFT} w={1.7} />
      <LP d="M124 96 L160 96" c={TERM_MID} w={1.7} />
      <LL x1={128} y1={96} x2={134} y2={86} c={TERM_MID} w={1.5} />
      <LL x1={156} y1={96} x2={150} y2={86} c={TERM_MID} w={1.5} />
      <LP d="M108 30 Q118 22 128 28" c={TERM_DIM} w={1.4} />
      <LDot cx={112} cy={16} r={1.5} c={TERM_DIM} />
    </TermSceneRoot>
  );
}

export function TermMvStreetFighterScene() {
  return (
    <TermSceneRoot>
      <LL x1={0} y1={104} x2={200} y2={104} c={TERM_DIM} w={1.8} />
      <LPoly points="96,34 196,34 182,20 110,20" close c={TERM_MID} w={1.9} />
      <LL x1={104} y1={34} x2={104} y2={58} c={TERM_MID} w={1.6} />
      <LL x1={188} y1={34} x2={188} y2={58} c={TERM_MID} w={1.6} />
      <LP d="M122 44 L122 56 M170 44 L170 56" c={TERM_DIM} w={1.4} />
      <LR x={116} y={56} width={12} height={16} rx={3} c={TERM_SOFT} w={1.6} />
      <LR x={164} y={56} width={12} height={16} rx={3} c={TERM_SOFT} w={1.6} />
      <TFigure x={122} y={102} s={0.95} c={TERM_PHOS} pose="stand" />
      <TFigure x={172} y={102} s={0.95} c={TERM_SOFT} pose="stand" />
      <LP d="M132 74 Q147 66 162 74" c={TERM_PHOS} w={1.8} dash="4 3" />
      <LC cx={147} cy={70} r={4} c={TERM_SOFT} w={1.6} />
      <LP d="M88 88 L200 88" c={TERM_DIM} w={1.4} dash="6 5" />
      <LDot cx={146} cy={10} r={1.6} c={TERM_MID} />
    </TermSceneRoot>
  );
}

export function TermMvWildwoodScene() {
  return (
    <TermSceneRoot>
      <LP d="M172 10 Q164 18 172 28 Q156 26 154 16 Q156 6 172 10 Z" c={TERM_SOFT} w={1.6} />
      <LDot cx={104} cy={12} r={1.5} c={TERM_DIM} />
      <LDot cx={128} cy={20} r={1.4} c={TERM_DIM} />
      <LL x1={0} y1={104} x2={200} y2={104} c={TERM_DIM} w={1.8} />
      <LPoly points="86,104 94,44 102,104" close c={TERM_MID} w={1.8} />
      <LPoly points="84,62 104,62 94,34" close c={TERM_MID} w={1.7} />
      <LPoly points="176,104 185,38 194,104" close c={TERM_MID} w={1.8} />
      <LPoly points="174,58 196,58 185,28" close c={TERM_MID} w={1.7} />
      <LPoly points="118,104 129,30 140,104" close c={TERM_PHOS} w={2} />
      <LPoly points="115,54 143,54 129,18" close c={TERM_PHOS} w={1.9} />
      <LP d="M104 78 Q140 66 168 76" c={TERM_MID} w={1.8} />
      <LC cx={146} cy={64} r={7} c={TERM_SOFT} w={1.7} />
      <LDot cx={143} cy={62} r={1.6} c={TERM_PHOS} />
      <LDot cx={149} cy={62} r={1.6} c={TERM_PHOS} />
      <LP d="M146 71 L146 76 M142 78 L150 78" c={TERM_SOFT} w={1.4} />
      <LP d="M108 104 Q122 92 138 96 Q156 100 170 92" c={TERM_DIM} w={1.5} />
      <LC cx={112} cy={96} r={3.4} c={TERM_MID} w={1.4} />
      <LL x1={112} y1={93} x2={112} y2={88} c={TERM_MID} w={1.4} />
      <LC cx={164} cy={98} r={2.8} c={TERM_DIM} w={1.3} />
    </TermSceneRoot>
  );
}
