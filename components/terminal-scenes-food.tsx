// Terminal food scenes (v186) — Pip-Boy line-art renditions of the
// food keyword scenes: each dish drawn bespoke in phosphor strokes
// on the 200x120 canvas, subject biased right (card text sits left).
// Hot dishes get dim steam wisps; no text, no animation, kit only.

import {
  TermSceneRoot,
  LP,
  LC,
  LR,
  LL,
  LPoly,
  LDot,
  TERM_PHOS,
  TERM_SOFT,
  TERM_MID,
  TERM_DIM,
} from "@/components/terminal-kit";

export function TermTdTvDinnerScene() {
  // Foil tray dinner on a folding stand, remote beside it.
  return (
    <TermSceneRoot>
      <LL x1={16} y1={106} x2={194} y2={106} c={TERM_DIM} w={1.6} />
      <LL x1={110} y1={86} x2={98} y2={106} c={TERM_MID} w={1.8} />
      <LL x1={176} y1={86} x2={188} y2={106} c={TERM_MID} w={1.8} />
      <LL x1={104} y1={96} x2={182} y2={96} c={TERM_MID} w={1.4} />
      <LR x={102} y={34} width={84} height={52} rx={5} c={TERM_PHOS} w={2.2} />
      <LL x1={144} y1={34} x2={144} y2={86} c={TERM_MID} w={1.6} />
      <LL x1={102} y1={60} x2={186} y2={60} c={TERM_MID} w={1.6} />
      <LC cx={123} cy={47} r={8} c={TERM_SOFT} w={1.8} />
      <LP d="M 152 44 C 160 40 172 42 178 47 C 172 52 160 54 152 50 C 150 47 150 46 152 44 Z" c={TERM_PHOS} w={1.9} />
      <LDot cx={114} cy={73} r={2.2} c={TERM_SOFT} />
      <LDot cx={126} cy={77} r={2.2} c={TERM_PHOS} />
      <LDot cx={136} cy={71} r={2.2} c={TERM_SOFT} />
      <LC cx={165} cy={73} r={7} c={TERM_MID} w={1.8} />
      <LR x={88} y={52} width={9} height={26} rx={3} c={TERM_MID} w={1.7} />
    </TermSceneRoot>
  );
}

export function TermTdBurritoScene() {
  // Burrito on a wooden board, rice and beans in small bowls.
  return (
    <TermSceneRoot>
      <LL x1={16} y1={108} x2={194} y2={108} c={TERM_DIM} w={1.6} />
      <LP d="M 138 14 C 134 20 138 24 135 30" c={TERM_DIM} w={1.7} />
      <LP d="M 158 12 C 154 18 158 22 155 28" c={TERM_DIM} w={1.7} />
      <LR x={98} y={84} width={92} height={10} rx={3} c={TERM_MID} w={1.9} />
      <LP d="M 104 62 C 104 50 114 43 129 43 L 163 43 C 178 43 187 51 187 62 C 187 73 178 81 163 81 L 129 81 C 114 81 104 74 104 62 Z" c={TERM_PHOS} w={2.3} />
      <LC cx={121} cy={62} r={10} c={TERM_SOFT} w={1.8} />
      <LC cx={121} cy={62} r={4.5} c={TERM_MID} w={1.6} />
      <LL x1={140} y1={46} x2={146} y2={78} c={TERM_MID} w={1.5} />
      <LL x1={158} y1={44} x2={164} y2={79} c={TERM_MID} w={1.5} />
      <LL x1={174} y1={48} x2={179} y2={75} c={TERM_MID} w={1.5} />
      <LP d="M 102 96 L 130 96 C 128 104 122 108 116 108 C 110 108 104 104 102 96 Z" c={TERM_SOFT} w={1.8} />
      <LL x1={100} y1={96} x2={132} y2={96} c={TERM_SOFT} w={1.8} />
      <LP d="M 158 96 L 186 96 C 184 104 178 108 172 108 C 166 108 160 104 158 96 Z" c={TERM_MID} w={1.8} />
      <LL x1={156} y1={96} x2={188} y2={96} c={TERM_MID} w={1.8} />
    </TermSceneRoot>
  );
}

export function TermTdTostadasScene() {
  // Two tostadas on a round platter, toppings piled high.
  return (
    <TermSceneRoot>
      <LP d="M 100 62 C 100 39 121 27 146 27 C 171 27 192 39 192 62 C 192 85 171 97 146 97 C 121 97 100 85 100 62 Z" c={TERM_MID} w={2} />
      <LC cx={131} cy={55} r={19} c={TERM_PHOS} w={2.2} />
      <LC cx={163} cy={73} r={19} c={TERM_PHOS} w={2.2} />
      <LP d="M 118 50 C 124 44 132 44 138 50 C 132 54 124 54 118 50 Z" c={TERM_SOFT} w={1.6} />
      <LP d="M 151 68 C 157 62 165 62 171 68 C 165 72 157 72 151 68 Z" c={TERM_SOFT} w={1.6} />
      <LDot cx={128} cy={60} r={2.3} c={TERM_PHOS} />
      <LDot cx={140} cy={48} r={2} c={TERM_MID} />
      <LDot cx={160} cy={80} r={2.3} c={TERM_PHOS} />
      <LDot cx={172} cy={66} r={2} c={TERM_MID} />
      <LDot cx={146} cy={66} r={1.9} c={TERM_SOFT} />
      <LPoly points="178,30 190,34 180,42" close c={TERM_SOFT} w={1.7} />
      <LL x1={16} y1={108} x2={194} y2={108} c={TERM_DIM} w={1.6} />
    </TermSceneRoot>
  );
}

export function TermTdTacosScene() {
  // Three tacos standing in a rack on a board.
  return (
    <TermSceneRoot>
      <LL x1={16} y1={106} x2={194} y2={106} c={TERM_DIM} w={1.6} />
      <LL x1={100} y1={90} x2={192} y2={90} c={TERM_MID} w={2} />
      <LP d="M 104 84 L 104 62 C 104 49 111 42 119 42 C 127 42 134 49 134 62 L 134 84" c={TERM_PHOS} w={2.1} />
      <LP d="M 106 52 C 111 46 116 50 119 45 C 123 50 128 46 132 52" c={TERM_SOFT} w={1.7} />
      <LP d="M 133 84 L 133 62 C 133 49 140 42 148 42 C 156 42 163 49 163 62 L 163 84" c={TERM_PHOS} w={2.1} />
      <LP d="M 135 52 C 140 46 145 50 148 45 C 152 50 157 46 161 52" c={TERM_SOFT} w={1.7} />
      <LP d="M 162 84 L 162 62 C 162 49 169 42 177 42 C 185 42 190 49 190 62 L 190 84" c={TERM_PHOS} w={2.1} />
      <LP d="M 164 52 C 169 46 174 50 177 45 C 181 50 185 46 188 52" c={TERM_SOFT} w={1.7} />
      <LP d="M 106 100 L 128 100 C 126 105 121 107 118 107 C 113 107 108 105 106 100 Z" c={TERM_MID} w={1.7} />
      <LL x1={104} y1={100} x2={130} y2={100} c={TERM_MID} w={1.7} />
    </TermSceneRoot>
  );
}

export function TermTdPizzaScene() {
  // Whole pie on a wooden peel, one slice pulling away.
  return (
    <TermSceneRoot>
      <LL x1={16} y1={108} x2={194} y2={108} c={TERM_DIM} w={1.6} />
      <LL x1={176} y1={80} x2={194} y2={98} c={TERM_MID} w={2.2} />
      <LC cx={146} cy={60} r={37} c={TERM_PHOS} w={2.3} />
      <LC cx={146} cy={60} r={29} c={TERM_MID} w={1.6} />
      <LL x1={146} y1={60} x2={146} y2={26} c={TERM_MID} w={1.4} />
      <LL x1={146} y1={60} x2={176} y2={78} c={TERM_MID} w={1.4} />
      <LL x1={146} y1={60} x2={118} y2={80} c={TERM_MID} w={1.4} />
      <LC cx={132} cy={44} r={4.5} c={TERM_SOFT} w={1.7} />
      <LC cx={160} cy={50} r={4.5} c={TERM_SOFT} w={1.7} />
      <LC cx={140} cy={68} r={4.5} c={TERM_SOFT} w={1.7} />
      <LC cx={122} cy={62} r={4} c={TERM_SOFT} w={1.7} />
      <LC cx={162} cy={76} r={4} c={TERM_SOFT} w={1.7} />
      <LPoly points="170,84 190,96 160,98" close c={TERM_PHOS} w={2} />
      <LP d="M 176 92 C 174 98 178 100 176 106" c={TERM_SOFT} w={1.7} />
    </TermSceneRoot>
  );
}

export function TermTdSandwichScene() {
  // Deli halves stacked on a sheet, pickle and chips.
  return (
    <TermSceneRoot>
      <LL x1={16} y1={106} x2={194} y2={106} c={TERM_DIM} w={1.6} />
      <LP d="M 102 92 C 122 84 172 84 192 92 C 172 100 122 100 102 92 Z" c={TERM_MID} w={1.9} />
      <LP d="M 108 76 C 108 62 119 53 130 53 C 141 53 152 62 152 76" c={TERM_PHOS} w={2.2} />
      <LP d="M 106 76 C 114 70 120 78 128 72 C 136 78 144 70 152 76" c={TERM_SOFT} w={1.7} />
      <LP d="M 108 84 C 120 79 140 79 150 84 C 140 90 120 90 108 84 Z" c={TERM_PHOS} w={2} />
      <LP d="M 148 50 C 148 38 157 31 166 31 C 175 31 184 38 184 50" c={TERM_PHOS} w={2.2} />
      <LP d="M 146 52 C 154 46 160 54 166 48 C 173 54 179 46 186 52" c={TERM_SOFT} w={1.7} />
      <LP d="M 149 59 C 159 54 175 54 183 59 C 175 64 159 64 149 59 Z" c={TERM_MID} w={1.8} />
      <LC cx={120} cy={100} r={6} c={TERM_SOFT} w={1.7} />
      <LPoly points="164,92 176,88 174,100" close c={TERM_MID} w={1.7} />
      <LPoly points="178,98 190,94 188,104" close c={TERM_MID} w={1.7} />
    </TermSceneRoot>
  );
}

export function TermTdPapaJoeScene() {
  // Focaccia halves in line art: pesto seam, roasted tomato rounds,
  // melted cheese — pickle and chips beside, steam off the toast.
  return (
    <TermSceneRoot>
      <LL x1={16} y1={106} x2={194} y2={106} c={TERM_DIM} w={1.6} />
      <LP d="M 124 16 C 120 22 124 26 121 32" c={TERM_DIM} w={1.7} />
      <LP d="M 168 14 C 164 20 168 24 165 30" c={TERM_DIM} w={1.7} />
      <LR x={102} y={48} width={45} height={44} rx={6} c={TERM_PHOS} w={2.2} />
      <LP d="M 106 62 C 114 57 122 65 130 60 C 136 65 141 59 145 62" c={TERM_SOFT} w={1.7} />
      <LC cx={116} cy={76} r={6.5} c={TERM_PHOS} w={1.8} />
      <LC cx={133} cy={76} r={6.5} c={TERM_SOFT} w={1.8} />
      <LP d="M 107 88 C 116 84 134 84 143 88 C 134 92 116 92 107 88 Z" c={TERM_MID} w={1.7} />
      <LR x={151} y={48} width={43} height={44} rx={6} c={TERM_PHOS} w={2.2} />
      <LP d="M 155 62 C 162 57 170 65 177 60 C 183 65 188 59 192 62" c={TERM_SOFT} w={1.7} />
      <LC cx={172} cy={76} r={6.5} c={TERM_PHOS} w={1.8} />
      <LP d="M 156 88 C 164 84 182 84 190 88 C 182 92 164 92 156 88 Z" c={TERM_MID} w={1.7} />
      <LC cx={118} cy={100} r={5.5} c={TERM_SOFT} w={1.7} />
      <LPoly points="160,94 172,90 170,102" close c={TERM_MID} w={1.7} />
      <LPoly points="176,98 188,94 186,104" close c={TERM_MID} w={1.7} />
    </TermSceneRoot>
  );
}

export function TermTdSaladScene() {
  // Big bowl of salad, fork resting on the rim.
  return (
    <TermSceneRoot>
      <LL x1={16} y1={108} x2={194} y2={108} c={TERM_DIM} w={1.6} />
      <LP d="M 102 56 L 194 56 C 192 82 174 100 148 100 C 122 100 104 82 102 56 Z" c={TERM_PHOS} w={2.3} />
      <LL x1={98} y1={56} x2={198} y2={56} c={TERM_MID} w={2} />
      <LP d="M 112 54 C 108 42 118 34 128 38 C 132 46 124 54 112 54 Z" c={TERM_SOFT} w={1.8} />
      <LP d="M 136 54 C 134 40 146 32 156 38 C 158 48 148 55 136 54 Z" c={TERM_PHOS} w={1.8} />
      <LP d="M 162 54 C 160 43 170 36 179 41 C 182 49 174 55 162 54 Z" c={TERM_SOFT} w={1.8} />
      <LC cx={126} cy={72} r={6} c={TERM_PHOS} w={1.8} />
      <LC cx={168} cy={78} r={6} c={TERM_PHOS} w={1.8} />
      <LC cx={148} cy={84} r={5} c={TERM_SOFT} w={1.7} />
      <LP d="M 178 22 L 188 44 M 188 44 L 184 40 M 188 44 L 190 39 M 188 44 L 194 41" c={TERM_MID} w={1.7} />
    </TermSceneRoot>
  );
}

export function TermTdPastaScene() {
  // Deep bowl of red-sauce pasta, steam rising.
  return (
    <TermSceneRoot>
      <LL x1={16} y1={108} x2={194} y2={108} c={TERM_DIM} w={1.6} />
      <LP d="M 136 18 C 132 24 136 28 133 34" c={TERM_DIM} w={1.7} />
      <LP d="M 158 16 C 154 22 158 26 155 32" c={TERM_DIM} w={1.7} />
      <LP d="M 104 58 L 192 58 C 190 82 172 98 148 98 C 124 98 106 82 104 58 Z" c={TERM_PHOS} w={2.3} />
      <LL x1={100} y1={58} x2={196} y2={58} c={TERM_MID} w={2} />
      <LP d="M 114 52 C 122 42 134 46 132 52 C 138 42 150 42 152 52" c={TERM_SOFT} w={1.8} />
      <LP d="M 142 52 C 146 40 160 40 164 52 C 170 42 182 44 184 52" c={TERM_PHOS} w={1.8} />
      <LC cx={148} cy={50} r={9} c={TERM_MID} w={1.7} />
      <LPoly points="146,38 156,44 146,48 138,43" close c={TERM_SOFT} w={1.6} />
      <LL x1={186} y1={30} x2={178} y2={54} c={TERM_MID} w={1.7} />
      <LDot cx={126} cy={72} r={2} c={TERM_SOFT} />
      <LDot cx={166} cy={76} r={2} c={TERM_SOFT} />
    </TermSceneRoot>
  );
}

export function TermTdPancakesScene() {
  // Tall stack with syrup, butter and berries.
  return (
    <TermSceneRoot>
      <LL x1={16} y1={108} x2={194} y2={108} c={TERM_DIM} w={1.6} />
      <LP d="M 100 96 C 120 86 176 86 196 96 C 176 106 120 106 100 96 Z" c={TERM_MID} w={1.9} />
      <LP d="M 110 80 C 110 72 128 66 148 66 C 168 66 186 72 186 80 C 186 88 168 94 148 94 C 128 94 110 88 110 80 Z" c={TERM_PHOS} w={2.1} />
      <LP d="M 114 66 C 114 58 130 53 148 53 C 166 53 182 58 182 66 C 182 74 166 79 148 79 C 130 79 114 74 114 66 Z" c={TERM_PHOS} w={2.1} />
      <LP d="M 120 52 C 120 45 134 40 148 40 C 162 40 176 45 176 52 C 176 59 162 64 148 64 C 134 64 120 59 120 52 Z" c={TERM_PHOS} w={2.1} />
      <LP d="M 128 42 C 138 36 158 36 168 42 C 162 46 158 50 160 56 C 150 52 140 54 136 48 C 130 50 126 46 128 42 Z" c={TERM_SOFT} w={1.7} />
      <LR x={140} y={28} width={16} height={10} rx={2} c={TERM_SOFT} w={1.8} />
      <LC cx={118} cy={92} r={4.5} c={TERM_MID} w={1.7} />
      <LC cx={180} cy={90} r={4.5} c={TERM_MID} w={1.7} />
      <LL x1={192} y1={62} x2={192} y2={94} c={TERM_MID} w={1.7} />
    </TermSceneRoot>
  );
}

export function TermTdSoupScene() {
  // Steaming mug of soup on a saucer, crackers and a spoon.
  return (
    <TermSceneRoot>
      <LL x1={16} y1={108} x2={194} y2={108} c={TERM_DIM} w={1.6} />
      <LP d="M 136 16 C 132 22 136 26 133 32" c={TERM_DIM} w={1.7} />
      <LP d="M 154 14 C 150 20 154 24 151 30" c={TERM_DIM} w={1.7} />
      <LP d="M 100 94 C 124 86 172 86 196 94 C 172 102 124 102 100 94 Z" c={TERM_MID} w={1.9} />
      <LR x={120} y={44} width={50} height={44} rx={6} c={TERM_PHOS} w={2.3} />
      <LP d="M 170 54 C 182 52 186 62 182 70 C 179 76 174 76 170 74" c={TERM_PHOS} w={2.1} />
      <LP d="M 122 46 C 134 40 156 40 168 46 C 156 51 134 51 122 46 Z" c={TERM_SOFT} w={1.8} />
      <LL x1={132} y1={28} x2={146} y2={44} c={TERM_MID} w={1.8} />
      <LR x={104} y={70} width={13} height={13} rx={2} c={TERM_SOFT} w={1.7} />
      <LR x={108} y={56} width={12} height={12} rx={2} c={TERM_MID} w={1.7} />
      <LDot cx={138} cy={46} r={1.9} c={TERM_PHOS} />
      <LDot cx={154} cy={47} r={1.9} c={TERM_PHOS} />
    </TermSceneRoot>
  );
}

export function TermTdEggsScene() {
  // Two fried eggs, bacon and toast on a plate, top-down.
  return (
    <TermSceneRoot>
      <LL x1={16} y1={108} x2={194} y2={108} c={TERM_DIM} w={1.6} />
      <LC cx={148} cy={62} r={39} c={TERM_PHOS} w={2.3} />
      <LC cx={148} cy={62} r={31} c={TERM_MID} w={1.5} />
      <LP d="M 118 46 C 124 36 140 36 144 46 C 148 56 138 66 128 64 C 118 62 113 55 118 46 Z" c={TERM_SOFT} w={1.9} />
      <LC cx={131} cy={50} r={7.5} c={TERM_PHOS} w={1.9} />
      <LP d="M 152 66 C 158 58 172 58 176 68 C 179 78 168 86 158 83 C 149 80 147 74 152 66 Z" c={TERM_SOFT} w={1.9} />
      <LC cx={164} cy={71} r={7} c={TERM_PHOS} w={1.9} />
      <LP d="M 116 84 C 124 78 130 88 138 82 C 144 88 150 82 154 86" c={TERM_MID} w={1.9} />
      <LP d="M 118 92 C 126 86 132 96 140 90" c={TERM_MID} w={1.9} />
      <LPoly points="166,30 184,36 172,50" close c={TERM_PHOS} w={1.9} />
    </TermSceneRoot>
  );
}

export function TermTdMexicanPizzaScene() {
  // Baked in its skillet, olives and peppers on top.
  return (
    <TermSceneRoot>
      <LL x1={16} y1={108} x2={194} y2={108} c={TERM_DIM} w={1.6} />
      <LL x1={178} y1={42} x2={196} y2={26} c={TERM_MID} w={2.4} />
      <LC cx={144} cy={62} r={37} c={TERM_MID} w={2.2} />
      <LC cx={144} cy={62} r={30} c={TERM_PHOS} w={2.2} />
      <LC cx={144} cy={62} r={22} c={TERM_SOFT} w={1.5} />
      <LDot cx={130} cy={48} r={2.6} c={TERM_PHOS} />
      <LDot cx={156} cy={44} r={2.6} c={TERM_PHOS} />
      <LDot cx={164} cy={64} r={2.6} c={TERM_PHOS} />
      <LDot cx={134} cy={74} r={2.6} c={TERM_PHOS} />
      <LDot cx={148} cy={58} r={2.4} c={TERM_MID} />
      <LP d="M 122 60 C 128 56 134 58 136 62" c={TERM_MID} w={1.7} />
      <LP d="M 154 78 C 160 74 166 76 168 80" c={TERM_MID} w={1.7} />
      <LP d="M 136 34 C 142 30 150 31 154 35" c={TERM_DIM} w={1.6} />
    </TermSceneRoot>
  );
}

export function TermTdPupusasScene() {
  // Pupusas on the comal, curtido and salsa bowls beside.
  return (
    <TermSceneRoot>
      <LC cx={144} cy={56} r={39} c={TERM_MID} w={2.2} />
      <LC cx={144} cy={56} r={32} c={TERM_DIM} w={1.5} />
      <LP d="M 112 44 C 112 36 122 31 130 31 C 138 31 146 36 146 44 C 146 51 138 56 130 56 C 122 56 112 51 112 44 Z" c={TERM_PHOS} w={2} />
      <LP d="M 144 62 C 144 54 154 49 162 49 C 170 49 178 54 178 62 C 178 69 170 74 162 74 C 154 74 144 69 144 62 Z" c={TERM_PHOS} w={2} />
      <LP d="M 118 72 C 118 65 127 61 134 61 C 142 61 149 65 149 72 C 149 79 142 83 134 83 C 127 83 118 79 118 72 Z" c={TERM_PHOS} w={2} />
      <LDot cx={130} cy={43} r={2} c={TERM_SOFT} />
      <LDot cx={162} cy={61} r={2} c={TERM_SOFT} />
      <LDot cx={134} cy={71} r={2} c={TERM_SOFT} />
      <LP d="M 102 98 L 130 98 C 128 105 122 109 116 109 C 110 109 104 105 102 98 Z" c={TERM_SOFT} w={1.7} />
      <LL x1={100} y1={98} x2={132} y2={98} c={TERM_SOFT} w={1.7} />
      <LP d="M 158 98 L 186 98 C 184 105 178 109 172 109 C 166 109 160 105 158 98 Z" c={TERM_MID} w={1.7} />
      <LL x1={156} y1={98} x2={188} y2={98} c={TERM_MID} w={1.7} />
    </TermSceneRoot>
  );
}

export function TermTdSteakScene() {
  // Steak on its iron over a board, butter melting.
  return (
    <TermSceneRoot>
      <LP d="M 142 14 C 138 20 142 24 139 30" c={TERM_DIM} w={1.7} />
      <LR x={96} y={92} width={96} height={10} rx={3} c={TERM_MID} w={1.9} />
      <LP d="M 100 68 C 100 52 122 42 148 42 C 174 42 196 52 196 68 C 196 84 174 92 148 92 C 122 92 100 84 100 68 Z" c={TERM_MID} w={2.1} />
      <LP d="M 114 67 C 112 55 126 48 142 49 C 160 50 176 55 175 67 C 174 79 158 85 141 84 C 125 83 115 78 114 67 Z" c={TERM_PHOS} w={2.3} />
      <LL x1={126} y1={56} x2={136} y2={78} c={TERM_MID} w={1.5} />
      <LL x1={142} y1={53} x2={152} y2={80} c={TERM_MID} w={1.5} />
      <LL x1={158} y1={56} x2={166} y2={76} c={TERM_MID} w={1.5} />
      <LR x={138} y={58} width={14} height={9} rx={2} c={TERM_SOFT} w={1.8} />
      <LP d="M 112 84 C 118 78 124 84 130 79 C 136 84 142 80 146 84" c={TERM_SOFT} w={1.6} />
      <LL x1={188} y1={30} x2={176} y2={52} c={TERM_MID} w={1.8} />
    </TermSceneRoot>
  );
}

export function TermTdShawarmaRiceBarScene() {
  // A family-style shawarma board in line art: chicken platter,
  // rice and pepper bowls, salad, hummus and crema around.
  return (
    <TermSceneRoot>
      <LL x1={16} y1={108} x2={194} y2={108} c={TERM_DIM} w={1.6} />
      <LP d="M 132 10 C 128 16 132 20 129 26" c={TERM_DIM} w={1.7} />
      <LP d="M 154 8 C 150 14 154 18 151 24" c={TERM_DIM} w={1.7} />
      <LR x={98} y={34} width={100} height={74} rx={6} c={TERM_MID} w={1.8} />
      <LP d="M 104 52 C 120 40 160 40 178 52 C 160 64 120 64 104 52 Z" c={TERM_PHOS} w={2.2} />
      <LL x1={116} y1={45} x2={126} y2={58} c={TERM_MID} w={1.5} />
      <LL x1={136} y1={43} x2={144} y2={59} c={TERM_MID} w={1.5} />
      <LL x1={156} y1={45} x2={162} y2={58} c={TERM_MID} w={1.5} />
      <LDot cx={124} cy={50} r={1.7} c={TERM_SOFT} />
      <LDot cx={148} cy={54} r={1.7} c={TERM_SOFT} />
      <LDot cx={168} cy={49} r={1.7} c={TERM_SOFT} />
      <LP d="M 104 24 L 132 24 C 130 34 124 38 117 38 C 110 38 105 34 104 24 Z" c={TERM_SOFT} w={1.7} />
      <LP d="M 110 29 C 115 25 122 25 127 29" c={TERM_MID} w={1.4} />
      <LP d="M 164 22 L 196 22 C 194 34 188 40 180 40 C 172 40 166 34 164 22 Z" c={TERM_PHOS} w={1.8} />
      <LC cx={174} cy={29} r={3.5} c={TERM_SOFT} w={1.4} />
      <LC cx={186} cy={29} r={3.5} c={TERM_MID} w={1.4} />
      <LDot cx={180} cy={34} r={1.8} c={TERM_PHOS} />
      <LP d="M 104 82 L 144 82 C 141 96 132 102 124 102 C 116 102 107 96 104 82 Z" c={TERM_PHOS} w={2} />
      <LP d="M 108 82 C 116 74 134 74 140 82 C 132 87 116 87 108 82 Z" c={TERM_SOFT} w={1.6} />
      <LP d="M 150 82 L 194 82 C 191 96 182 102 172 102 C 162 102 153 96 150 82 Z" c={TERM_PHOS} w={2} />
      <LL x1={160} y1={76} x2={163} y2={88} c={TERM_SOFT} w={1.5} />
      <LL x1={172} y1={74} x2={173} y2={89} c={TERM_MID} w={1.5} />
      <LL x1={183} y1={76} x2={181} y2={88} c={TERM_SOFT} w={1.5} />
      <LC cx={188} cy={68} r={6} c={TERM_MID} w={1.6} />
      <LL x1={184} y1={64} x2={192} y2={72} c={TERM_MID} w={1.3} />
      <LDot cx={112} cy={68} r={1.8} c={TERM_MID} />
      <LDot cx={188} cy={50} r={1.8} c={TERM_MID} />
    </TermSceneRoot>
  );
}

export function TermTdRoastChickenScene() {
  // Golden bird on an oval platter, gravy boat standing by.
  return (
    <TermSceneRoot>
      <LL x1={16} y1={108} x2={194} y2={108} c={TERM_DIM} w={1.6} />
      <LP d="M 98 88 C 118 78 178 78 198 88 C 178 99 118 99 98 88 Z" c={TERM_MID} w={2} />
      <LP d="M 116 70 C 114 48 130 34 149 34 C 168 34 182 48 181 68 C 180 82 165 88 148 88 C 131 88 117 83 116 70 Z" c={TERM_PHOS} w={2.3} />
      <LP d="M 132 44 C 140 54 140 68 134 80" c={TERM_SOFT} w={1.8} />
      <LP d="M 120 62 C 110 58 104 62 102 70" c={TERM_PHOS} w={2} />
      <LC cx={100} cy={74} r={4} c={TERM_SOFT} w={1.7} />
      <LP d="M 176 62 C 186 58 192 62 194 70" c={TERM_PHOS} w={2} />
      <LC cx={196} cy={74} r={4} c={TERM_SOFT} w={1.7} />
      <LDot cx={142} cy={58} r={1.9} c={TERM_MID} />
      <LDot cx={156} cy={66} r={1.9} c={TERM_MID} />
      <LP d="M 104 100 C 110 92 124 92 128 98 C 130 94 136 94 138 98 C 132 104 110 106 104 100 Z" c={TERM_SOFT} w={1.7} />
      <LC cx={184} cy={96} r={6} c={TERM_MID} w={1.7} />
    </TermSceneRoot>
  );
}

export function TermTdMeatloafScene() {
  // Meatloaf out of its pan, slices fanned, mash on the side.
  return (
    <TermSceneRoot>
      <LL x1={16} y1={106} x2={194} y2={106} c={TERM_DIM} w={1.6} />
      <LR x={112} y={28} width={66} height={36} rx={4} c={TERM_MID} w={2} />
      <LP d="M 116 34 C 130 26 160 26 174 34 C 160 40 130 40 116 34 Z" c={TERM_PHOS} w={2.1} />
      <LP d="M 122 31 C 134 27 156 27 168 31" c={TERM_SOFT} w={1.7} />
      <LPoly points="108,70 140,70 136,94 104,94" close c={TERM_PHOS} w={2} />
      <LL x1={106} y1={78} x2={138} y2={78} c={TERM_SOFT} w={1.6} />
      <LPoly points="142,70 172,70 176,94 146,94" close c={TERM_PHOS} w={2} />
      <LL x1={144} y1={78} x2={174} y2={78} c={TERM_SOFT} w={1.6} />
      <LP d="M 172 92 C 172 80 182 74 188 80 C 194 74 196 84 194 92 C 188 96 178 96 172 92 Z" c={TERM_SOFT} w={1.8} />
      <LP d="M 178 84 C 182 80 188 80 190 84" c={TERM_MID} w={1.5} />
      <LDot cx={128} cy={52} r={1.9} c={TERM_MID} />
      <LDot cx={146} cy={54} r={1.9} c={TERM_MID} />
    </TermSceneRoot>
  );
}

export function TermTdMississippiPotRoastScene() {
  // The crockpot in line art: the oval pot from above, shredded
  // beef in its juices, whole pepperoncini on top — steam off it.
  return (
    <TermSceneRoot>
      <LL x1={16} y1={108} x2={194} y2={108} c={TERM_DIM} w={1.6} />
      <LP d="M 126 14 C 122 20 126 24 123 30" c={TERM_DIM} w={1.7} />
      <LP d="M 168 12 C 164 18 168 22 165 28" c={TERM_DIM} w={1.7} />
      <LP d="M 98 68 C 98 48 122 38 149 38 C 176 38 200 48 200 68 C 200 88 176 98 149 98 C 122 98 98 88 98 68 Z" c={TERM_PHOS} w={2.3} />
      <LP d="M 108 68 C 108 54 126 46 149 46 C 172 46 190 54 190 68 C 190 82 172 90 149 90 C 126 90 108 82 108 68 Z" c={TERM_MID} w={1.8} />
      <LP d="M 118 62 C 126 56 134 62 142 57" c={TERM_SOFT} w={1.6} />
      <LP d="M 152 74 C 160 68 168 74 178 68" c={TERM_SOFT} w={1.6} />
      <LP d="M 124 80 C 132 75 140 80 148 76" c={TERM_MID} w={1.5} />
      <LC cx={130} cy={66} r={4.5} c={TERM_MID} w={1.6} />
      <LC cx={164} cy={58} r={4.5} c={TERM_SOFT} w={1.6} />
      <LC cx={158} cy={80} r={4.5} c={TERM_MID} w={1.6} />
      <LDot cx={146} cy={64} r={2} c={TERM_PHOS} />
    </TermSceneRoot>
  );
}

export function TermTdPotRoastScene() {
  // Pot roast in the Dutch oven, lid ajar, carrots and potatoes in.
  return (
    <TermSceneRoot>
      <LL x1={16} y1={108} x2={194} y2={108} c={TERM_DIM} w={1.6} />
      <LP d="M 140 10 C 136 16 140 20 137 26" c={TERM_DIM} w={1.7} />
      <LP d="M 162 8 C 158 14 162 18 159 24" c={TERM_DIM} w={1.7} />
      <LP d="M 110 40 C 128 28 164 28 184 38" c={TERM_MID} w={2} />
      <LC cx={148} cy={27} r={4} c={TERM_MID} w={1.7} />
      <LR x={102} y={54} width={90} height={40} rx={6} c={TERM_PHOS} w={2.3} />
      <LL x1={98} y1={54} x2={196} y2={54} c={TERM_MID} w={2} />
      <LL x1={102} y1={66} x2={92} y2={62} c={TERM_PHOS} w={2} />
      <LL x1={192} y1={66} x2={202} y2={62} c={TERM_PHOS} w={2} />
      <LPoly points="120,54 128,42 136,54" close c={TERM_SOFT} w={1.7} />
      <LC cx={160} cy={48} r={7} c={TERM_SOFT} w={1.7} />
      <LPoly points="172,54 180,44 186,54" close c={TERM_MID} w={1.7} />
      <LL x1={112} y1={80} x2={182} y2={80} c={TERM_MID} w={1.5} dash="4 4" />
    </TermSceneRoot>
  );
}

export function TermTdCasseroleScene() {
  // Casserole in its own dish on a trivet, cheese bubbling.
  return (
    <TermSceneRoot>
      <LL x1={16} y1={108} x2={194} y2={108} c={TERM_DIM} w={1.6} />
      <LP d="M 144 14 C 140 20 144 24 141 30" c={TERM_DIM} w={1.7} />
      <LR x={104} y={42} width={88} height={48} rx={5} c={TERM_PHOS} w={2.3} />
      <LPoly points="104,56 92,60 92,72 104,74" close c={TERM_MID} w={1.9} />
      <LPoly points="192,56 202,60 202,72 192,74" close c={TERM_MID} w={1.9} />
      <LL x1={104} y1={54} x2={192} y2={54} c={TERM_MID} w={1.8} />
      <LP d="M 112 48 C 122 42 132 50 142 44 C 152 50 162 42 172 48 C 178 44 186 46 190 50" c={TERM_SOFT} w={1.8} />
      <LC cx={126} cy={68} r={5} c={TERM_SOFT} w={1.6} />
      <LC cx={162} cy={74} r={5} c={TERM_SOFT} w={1.6} />
      <LDot cx={146} cy={64} r={2} c={TERM_MID} />
      <LDot cx={176} cy={62} r={2} c={TERM_MID} />
      <LL x1={114} y1={98} x2={182} y2={98} c={TERM_MID} w={1.8} />
      <LL x1={124} y1={90} x2={118} y2={102} c={TERM_MID} w={1.6} />
      <LL x1={172} y1={90} x2={178} y2={102} c={TERM_MID} w={1.6} />
    </TermSceneRoot>
  );
}

export function TermTdHotDogScene() {
  // Two dogs in a striped boat tray, mustard zigzag on top.
  return (
    <TermSceneRoot>
      <LL x1={16} y1={106} x2={194} y2={106} c={TERM_DIM} w={1.6} />
      <LPoly points="100,44 196,44 186,98 110,98" close c={TERM_MID} w={2} />
      <LL x1={104} y1={84} x2={192} y2={84} c={TERM_MID} w={1.5} />
      <LP d="M 108 52 C 108 44 116 40 128 40 L 172 40 C 184 40 190 44 190 52 C 190 59 184 63 172 63 L 128 63 C 116 63 108 59 108 52 Z" c={TERM_PHOS} w={2.2} />
      <LP d="M 118 51 C 126 45 132 57 140 51 C 148 45 154 57 162 51 C 170 45 176 55 182 51" c={TERM_SOFT} w={1.8} />
      <LP d="M 110 74 C 110 67 118 64 128 64 L 168 64 C 180 64 186 67 186 74 C 186 80 180 84 168 84 L 128 84 C 118 84 110 80 110 74 Z" c={TERM_PHOS} w={2.2} />
      <LL x1={120} y1={74} x2={176} y2={74} c={TERM_SOFT} w={1.8} />
      <LDot cx={126} cy={68} r={1.8} c={TERM_MID} />
      <LDot cx={148} cy={80} r={1.8} c={TERM_MID} />
      <LDot cx={168} cy={68} r={1.8} c={TERM_MID} />
    </TermSceneRoot>
  );
}

export function TermTdNachosScene() {
  // Nachos mounded on a sheet pan, dip in the middle.
  return (
    <TermSceneRoot>
      <LL x1={16} y1={108} x2={194} y2={108} c={TERM_DIM} w={1.6} />
      <LR x={98} y={28} width={94} height={66} rx={4} c={TERM_MID} w={2} />
      <LPoly points="112,78 128,62 136,80" close c={TERM_PHOS} w={1.9} />
      <LPoly points="134,84 148,66 160,84" close c={TERM_PHOS} w={1.9} />
      <LPoly points="158,80 174,64 184,82" close c={TERM_PHOS} w={1.9} />
      <LPoly points="118,56 134,42 144,58" close c={TERM_PHOS} w={1.9} />
      <LPoly points="150,54 164,40 176,56" close c={TERM_PHOS} w={1.9} />
      <LP d="M 114 70 C 128 60 142 72 156 62 C 168 70 178 62 186 68" c={TERM_SOFT} w={1.7} />
      <LP d="M 118 50 C 132 42 148 52 162 44" c={TERM_SOFT} w={1.7} />
      <LC cx={120} cy={40} r={4} c={TERM_MID} w={1.6} />
      <LC cx={182} cy={44} r={4} c={TERM_MID} w={1.6} />
      <LC cx={146} cy={72} r={10} c={TERM_SOFT} w={1.9} />
      <LC cx={146} cy={72} r={5} c={TERM_MID} w={1.6} />
    </TermSceneRoot>
  );
}

export function TermTdQuesadillaScene() {
  // Wedges on a round board, one wedge pulling, dips beside.
  return (
    <TermSceneRoot>
      <LL x1={16} y1={108} x2={194} y2={108} c={TERM_DIM} w={1.6} />
      <LC cx={142} cy={58} r={38} c={TERM_MID} w={2.1} />
      <LC cx={142} cy={58} r={30} c={TERM_PHOS} w={2.2} />
      <LL x1={142} y1={58} x2={142} y2={30} c={TERM_MID} w={1.6} />
      <LL x1={142} y1={58} x2={118} y2={76} c={TERM_MID} w={1.6} />
      <LL x1={130} y1={42} x2={140} y2={52} c={TERM_MID} w={1.5} />
      <LL x1={152} y1={66} x2={162} y2={74} c={TERM_MID} w={1.5} />
      <LPoly points="168,78 192,88 168,100" close c={TERM_PHOS} w={2} />
      <LP d="M 170 88 C 162 86 158 90 152 88" c={TERM_SOFT} w={1.8} />
      <LP d="M 104 100 C 108 94 120 94 124 100 C 120 105 108 105 104 100 Z" c={TERM_SOFT} w={1.7} />
      <LP d="M 128 102 C 132 96 144 96 148 102 C 144 107 132 107 128 102 Z" c={TERM_MID} w={1.7} />
    </TermSceneRoot>
  );
}

export function TermTdHotWingsScene() {
  // Wings in a lined basket, celery sticks and ranch dip.
  return (
    <TermSceneRoot>
      <LL x1={16} y1={106} x2={194} y2={106} c={TERM_DIM} w={1.6} />
      <LPoly points="102,58 194,58 184,100 112,100" close c={TERM_PHOS} w={2.2} />
      <LL x1={100} y1={58} x2={196} y2={58} c={TERM_MID} w={2} />
      <LP d="M 112 44 C 106 32 116 24 126 28 C 134 31 134 42 128 46 C 122 50 114 49 112 44 Z M 126 30 L 138 22" c={TERM_PHOS} w={2} />
      <LP d="M 142 46 C 138 34 148 26 158 30 C 165 34 164 44 158 48 C 151 51 144 51 142 46 Z M 156 32 L 166 23" c={TERM_PHOS} w={2} />
      <LP d="M 126 56 C 121 46 130 39 139 42 C 146 45 145 54 140 57 C 134 60 128 60 126 56 Z M 138 44 L 148 36" c={TERM_SOFT} w={1.9} />
      <LL x1={168} y1={28} x2={176} y2={54} c={TERM_SOFT} w={1.9} />
      <LL x1={180} y1={30} x2={186} y2={54} c={TERM_SOFT} w={1.9} />
      <LC cx={122} cy={84} r={9} c={TERM_SOFT} w={1.8} />
      <LC cx={168} cy={84} r={9} c={TERM_MID} w={1.8} />
      <LDot cx={148} cy={70} r={2} c={TERM_MID} />
    </TermSceneRoot>
  );
}

export function TermTdRamenScene() {
  // Footed ramen bowl, chopsticks resting, steam up.
  return (
    <TermSceneRoot>
      <LL x1={16} y1={108} x2={194} y2={108} c={TERM_DIM} w={1.6} />
      <LP d="M 132 16 C 128 22 132 26 129 32" c={TERM_DIM} w={1.7} />
      <LP d="M 156 14 C 152 20 156 24 153 30" c={TERM_DIM} w={1.7} />
      <LP d="M 102 52 L 194 52 C 192 78 172 96 148 96 C 124 96 104 78 102 52 Z" c={TERM_PHOS} w={2.3} />
      <LL x1={98} y1={52} x2={198} y2={52} c={TERM_MID} w={2} />
      <LL x1={134} y1={104} x2={162} y2={104} c={TERM_MID} w={2} />
      <LP d="M 112 46 C 120 36 132 42 130 47 C 138 37 150 38 152 46" c={TERM_SOFT} w={1.8} />
      <LP d="M 148 46 C 154 35 168 36 172 45 C 178 37 188 39 190 47" c={TERM_PHOS} w={1.8} />
      <LC cx={124} cy={44} r={8} c={TERM_SOFT} w={1.8} />
      <LDot cx={124} cy={44} r={3} c={TERM_PHOS} />
      <LL x1={158} y1={18} x2={182} y2={48} c={TERM_MID} w={1.9} />
      <LL x1={168} y1={16} x2={190} y2={46} c={TERM_MID} w={1.9} />
    </TermSceneRoot>
  );
}

export function TermTdStirFryScene() {
  // Stir-fry in the wok, still on the burner ring.
  return (
    <TermSceneRoot>
      <LP d="M 138 12 C 134 18 138 22 135 28" c={TERM_DIM} w={1.7} />
      <LP d="M 160 10 C 156 16 160 20 157 26" c={TERM_DIM} w={1.7} />
      <LP d="M 100 48 L 196 48 C 194 74 172 92 148 92 C 124 92 102 74 100 48 Z" c={TERM_PHOS} w={2.3} />
      <LL x1={96} y1={48} x2={86} y2={44} c={TERM_PHOS} w={2.1} />
      <LL x1={194} y1={48} x2={199} y2={43} c={TERM_PHOS} w={2.1} />
      <LP d="M 118 44 C 126 34 138 40 136 45 C 144 35 156 35 160 44" c={TERM_SOFT} w={1.8} />
      <LP d="M 156 44 C 162 33 176 34 180 43" c={TERM_MID} w={1.8} />
      <LC cx={126} cy={60} r={5} c={TERM_MID} w={1.6} />
      <LL x1={150} y1={58} x2={168} y2={64} c={TERM_SOFT} w={1.7} />
      <LP d="M 122 102 C 136 96 160 96 174 102 C 160 107 136 107 122 102 Z" c={TERM_DIM} w={1.8} />
      <LP d="M 132 98 C 131 94 134 92 133 89 M 148 97 C 147 93 150 91 149 88 M 164 98 C 163 94 166 92 165 89" c={TERM_DIM} w={1.6} />
      <LL x1={184} y1={22} x2={170} y2={44} c={TERM_MID} w={1.8} />
    </TermSceneRoot>
  );
}

export function TermTdRisottoScene() {
  // Bowl of risotto in line art: ladle swirl in the creamy
  // surface, bacon bits, mushroom slices — steam off the bowl.
  return (
    <TermSceneRoot>
      <LL x1={16} y1={108} x2={194} y2={108} c={TERM_DIM} w={1.6} />
      <LP d="M 122 18 C 118 24 122 28 119 34" c={TERM_DIM} w={1.7} />
      <LP d="M 166 16 C 162 22 166 26 163 32" c={TERM_DIM} w={1.7} />
      <LP d="M 100 90 C 122 80 176 80 198 90 C 176 101 122 101 100 90 Z" c={TERM_MID} w={2} />
      <LP d="M 114 88 C 116 62 130 46 149 46 C 168 46 182 62 184 88 C 162 94 136 94 114 88 Z" c={TERM_PHOS} w={2.3} />
      <LP d="M 128 62 C 134 54 144 62 150 55 C 157 61 166 56 172 61" c={TERM_SOFT} w={1.7} />
      <LP d="M 132 74 C 140 68 152 74 160 68" c={TERM_MID} w={1.6} />
      <LDot cx={128} cy={80} r={2.1} c={TERM_MID} />
      <LDot cx={146} cy={84} r={2.1} c={TERM_SOFT} />
      <LDot cx={166} cy={80} r={2.1} c={TERM_MID} />
      <LPoly points="122,52 134,52 130,59 124,59" close c={TERM_SOFT} w={1.6} />
      <LPoly points="160,50 172,50 168,57 162,57" close c={TERM_MID} w={1.6} />
      <LP d="M 104 98 C 100 92 106 86 112 89 C 117 92 114 100 108 101 C 105 101 104 100 104 98 Z M 110 96 L 122 104" c={TERM_MID} w={1.7} />
    </TermSceneRoot>
  );
}

export function TermTdFriedRiceScene() {
  // Dome of fried rice on a plate, spoon and soy at the side.
  return (
    <TermSceneRoot>
      <LL x1={16} y1={108} x2={194} y2={108} c={TERM_DIM} w={1.6} />
      <LP d="M 100 90 C 122 80 176 80 198 90 C 176 101 122 101 100 90 Z" c={TERM_MID} w={2} />
      <LP d="M 114 88 C 116 62 130 46 149 46 C 168 46 182 62 184 88 C 162 94 136 94 114 88 Z" c={TERM_PHOS} w={2.3} />
      <LP d="M 128 60 C 138 52 148 60 156 53 C 164 59 172 54 176 60" c={TERM_SOFT} w={1.7} />
      <LDot cx={128} cy={74} r={2.1} c={TERM_MID} />
      <LDot cx={146} cy={66} r={2.1} c={TERM_SOFT} />
      <LDot cx={164} cy={76} r={2.1} c={TERM_MID} />
      <LDot cx={152} cy={82} r={2.1} c={TERM_PHOS} />
      <LDot cx={136} cy={84} r={1.9} c={TERM_SOFT} />
      <LPoly points="140,50 158,50 152,58 144,58" close c={TERM_SOFT} w={1.6} />
      <LP d="M 104 98 C 100 92 106 86 112 89 C 117 92 114 100 108 101 C 105 101 104 100 104 98 Z M 110 96 L 122 104" c={TERM_MID} w={1.7} />
      <LR x={184} y={62} width={13} height={26} rx={3} c={TERM_MID} w={1.8} />
      <LL x1={187} y1={62} x2={187} y2={54} c={TERM_MID} w={1.8} />
    </TermSceneRoot>
  );
}

export function TermTdOatmealScene() {
  // Oatmeal in an enamel bowl, honey and berries, spoon in it.
  return (
    <TermSceneRoot>
      <LL x1={16} y1={108} x2={194} y2={108} c={TERM_DIM} w={1.6} />
      <LP d="M 142 14 C 138 20 142 24 139 30" c={TERM_DIM} w={1.7} />
      <LP d="M 104 54 L 192 54 C 190 78 172 94 148 94 C 124 94 106 78 104 54 Z" c={TERM_PHOS} w={2.3} />
      <LL x1={100} y1={54} x2={196} y2={54} c={TERM_MID} w={2} />
      <LP d="M 114 50 C 130 43 166 43 182 50 C 166 56 130 56 114 50 Z" c={TERM_SOFT} w={1.8} />
      <LP d="M 124 48 C 132 43 140 50 148 45 C 156 50 164 43 172 47" c={TERM_PHOS} w={1.6} />
      <LC cx={132} cy={46} r={4.5} c={TERM_MID} w={1.7} />
      <LC cx={158} cy={44} r={4.5} c={TERM_MID} w={1.7} />
      <LC cx={146} cy={50} r={4} c={TERM_PHOS} w={1.7} />
      <LL x1={172} y1={22} x2={162} y2={48} c={TERM_MID} w={1.9} />
      <LC cx={160} cy={53} r={4} c={TERM_MID} w={1.6} />
      <LP d="M 112 100 C 132 94 164 94 184 100 C 164 105 132 105 112 100 Z" c={TERM_MID} w={1.7} />
    </TermSceneRoot>
  );
}

export function TermTdCerealScene() {
  // Cereal in a bright bowl, milk bottle beside it.
  return (
    <TermSceneRoot>
      <LL x1={16} y1={108} x2={194} y2={108} c={TERM_DIM} w={1.6} />
      <LP d="M 100 54 L 184 54 C 182 78 166 94 144 94 C 120 94 102 78 100 54 Z" c={TERM_PHOS} w={2.3} />
      <LL x1={96} y1={54} x2={188} y2={54} c={TERM_MID} w={2} />
      <LP d="M 108 50 C 124 43 160 43 176 50 C 160 56 124 56 108 50 Z" c={TERM_SOFT} w={1.8} />
      <LC cx={122} cy={47} r={4} c={TERM_PHOS} w={1.6} />
      <LC cx={140} cy={44} r={4} c={TERM_MID} w={1.6} />
      <LC cx={156} cy={47} r={4} c={TERM_PHOS} w={1.6} />
      <LC cx={132} cy={51} r={3.5} c={TERM_SOFT} w={1.5} />
      <LC cx={166} cy={50} r={3.5} c={TERM_MID} w={1.5} />
      <LL x1={112} y1={30} x2={126} y2={50} c={TERM_MID} w={1.8} />
      <LR x={186} y={38} width={14} height={46} rx={3} c={TERM_MID} w={1.9} />
      <LL x1={186} y1={38} x2={200} y2={38} c={TERM_MID} w={1.9} />
      <LL x1={189} y1={30} x2={197} y2={30} c={TERM_SOFT} w={1.8} />
    </TermSceneRoot>
  );
}

export function TermRestTacoScene() {
  // One big taco, front view, lime and salsa alongside.
  return (
    <TermSceneRoot>
      <LL x1={16} y1={106} x2={194} y2={106} c={TERM_DIM} w={1.6} />
      <LP d="M 102 94 C 124 86 172 86 194 94 C 172 102 124 102 102 94 Z" c={TERM_MID} w={1.9} />
      <LP d="M 108 88 L 108 62 C 108 42 126 28 148 28 C 170 28 188 42 188 62 L 188 88" c={TERM_PHOS} w={2.4} />
      <LP d="M 110 44 C 118 34 128 44 136 33 C 144 43 154 33 162 43 C 170 34 180 40 186 46" c={TERM_SOFT} w={1.9} />
      <LPoly points="122,52 132,44 136,54" close c={TERM_MID} w={1.6} />
      <LPoly points="148,54 158,46 162,56" close c={TERM_MID} w={1.6} />
      <LDot cx={148} cy={38} r={2.4} c={TERM_PHOS} />
      <LPoly points="96,72 108,78 98,88" close c={TERM_SOFT} w={1.7} />
      <LP d="M 168 98 L 192 98 C 190 104 184 107 179 107 C 173 107 169 104 168 98 Z" c={TERM_MID} w={1.7} />
      <LL x1={166} y1={98} x2={194} y2={98} c={TERM_MID} w={1.7} />
    </TermSceneRoot>
  );
}

export function TermRestSandwichScene() {
  // Long sub on a plate, chips and a pickle spear.
  return (
    <TermSceneRoot>
      <LL x1={16} y1={106} x2={194} y2={106} c={TERM_DIM} w={1.6} />
      <LP d="M 98 92 C 120 84 176 84 198 92 C 176 100 120 100 98 92 Z" c={TERM_MID} w={1.9} />
      <LP d="M 106 78 C 106 70 114 66 128 66 L 170 66 C 184 66 190 70 190 78 C 176 84 120 84 106 78 Z" c={TERM_PHOS} w={2.2} />
      <LP d="M 108 66 C 118 59 128 68 138 61 C 148 68 158 59 168 66 C 176 60 184 63 188 67" c={TERM_SOFT} w={1.8} />
      <LP d="M 110 58 C 118 50 132 58 142 51 C 152 58 164 50 174 57" c={TERM_MID} w={1.7} />
      <LP d="M 108 54 C 108 40 122 32 148 32 C 174 32 188 40 188 54 C 168 48 128 48 108 54 Z" c={TERM_PHOS} w={2.3} />
      <LDot cx={128} cy={40} r={1.9} c={TERM_SOFT} />
      <LDot cx={148} cy={37} r={1.9} c={TERM_SOFT} />
      <LDot cx={168} cy={40} r={1.9} c={TERM_SOFT} />
      <LPoly points="112,96 126,90 124,102" close c={TERM_MID} w={1.6} />
      <LPoly points="166,98 182,92 182,102" close c={TERM_SOFT} w={1.6} />
    </TermSceneRoot>
  );
}

export function TermRestPizzaScene() {
  // One big slice on a plate, cheese dripping off the tip.
  return (
    <TermSceneRoot>
      <LL x1={16} y1={108} x2={194} y2={108} c={TERM_DIM} w={1.6} />
      <LC cx={148} cy={62} r={39} c={TERM_MID} w={2} />
      <LC cx={148} cy={62} r={31} c={TERM_DIM} w={1.4} />
      <LPoly points="148,98 122,38 174,38" close c={TERM_PHOS} w={2.3} />
      <LP d="M 122 38 C 134 30 162 30 174 38 C 162 44 134 44 122 38 Z" c={TERM_PHOS} w={2.2} />
      <LC cx={140} cy={56} r={5} c={TERM_SOFT} w={1.8} />
      <LC cx={156} cy={68} r={5} c={TERM_SOFT} w={1.8} />
      <LP d="M 148 98 C 144 104 146 108 148 112 C 151 107 152 103 148 98 Z" c={TERM_SOFT} w={1.8} />
      <LP d="M 154 92 C 152 97 154 100 156 103" c={TERM_SOFT} w={1.6} />
      <LPoly points="132,74 142,78 134,84" close c={TERM_MID} w={1.6} />
    </TermSceneRoot>
  );
}

export function TermRestChickenScene() {
  // Bucket of chicken, drumsticks peeking out, slaw beside.
  return (
    <TermSceneRoot>
      <LL x1={16} y1={106} x2={194} y2={106} c={TERM_DIM} w={1.6} />
      <LPoly points="116,48 184,48 176,102 124,102" close c={TERM_PHOS} w={2.3} />
      <LL x1={113} y1={48} x2={187} y2={48} c={TERM_MID} w={2} />
      <LL x1={119} y1={68} x2={181} y2={68} c={TERM_MID} w={1.6} />
      <LL x1={122} y1={86} x2={178} y2={86} c={TERM_MID} w={1.6} />
      <LP d="M 122 46 C 116 32 124 22 134 24 C 143 26 144 38 138 44 M 133 26 L 128 16" c={TERM_PHOS} w={2} />
      <LP d="M 146 44 C 142 30 150 20 160 23 C 168 26 168 38 162 43 M 158 25 L 156 14" c={TERM_SOFT} w={2} />
      <LP d="M 164 46 C 162 34 170 26 178 29 C 186 32 185 42 180 47 M 177 31 L 182 22" c={TERM_PHOS} w={2} />
      <LP d="M 96 92 L 118 92 C 116 99 110 102 106 102 C 101 102 97 99 96 92 Z" c={TERM_SOFT} w={1.7} />
      <LL x1={94} y1={92} x2={120} y2={92} c={TERM_SOFT} w={1.7} />
      <LR x={182} y={88} width={14} height={12} rx={2} c={TERM_MID} w={1.6} />
    </TermSceneRoot>
  );
}

export function TermRestDonutScene() {
  // Hero donut above an open box of two more.
  return (
    <TermSceneRoot>
      <LL x1={16} y1={108} x2={194} y2={108} c={TERM_DIM} w={1.6} />
      <LC cx={148} cy={44} r={26} c={TERM_PHOS} w={2.4} />
      <LC cx={148} cy={44} r={9} c={TERM_PHOS} w={2.1} />
      <LP d="M 130 32 C 138 24 152 26 158 32 C 166 28 172 36 168 44 C 174 52 164 60 156 56 C 148 63 134 58 136 50 C 126 48 124 38 130 32 Z" c={TERM_SOFT} w={1.7} />
      <LL x1={134} y1={28} x2={140} y2={32} c={TERM_MID} w={1.8} />
      <LL x1={162} y1={30} x2={166} y2={36} c={TERM_SOFT} w={1.8} />
      <LL x1={128} y1={48} x2={134} y2={50} c={TERM_PHOS} w={1.8} />
      <LL x1={160} y1={54} x2={166} y2={52} c={TERM_MID} w={1.8} />
      <LL x1={146} y1={24} x2={150} y2={28} c={TERM_SOFT} w={1.8} />
      <LR x={102} y={82} width={94} height={20} rx={3} c={TERM_MID} w={2} />
      <LL x1={102} y1={82} x2={196} y2={82} c={TERM_MID} w={1.7} />
      <LC cx={126} cy={82} r={9} c={TERM_PHOS} w={1.9} />
      <LC cx={168} cy={82} r={9} c={TERM_SOFT} w={1.9} />
    </TermSceneRoot>
  );
}

export function TermRestCoffeeScene() {
  // Mug of coffee on a saucer, beans scattered, steam up.
  return (
    <TermSceneRoot>
      <LL x1={16} y1={108} x2={194} y2={108} c={TERM_DIM} w={1.6} />
      <LP d="M 138 14 C 134 20 138 24 135 30" c={TERM_DIM} w={1.7} />
      <LP d="M 156 12 C 152 18 156 22 153 28" c={TERM_DIM} w={1.7} />
      <LP d="M 104 94 C 126 85 174 85 196 94 C 174 103 126 103 104 94 Z" c={TERM_MID} w={1.9} />
      <LR x={120} y={44} width={50} height={42} rx={6} c={TERM_PHOS} w={2.3} />
      <LP d="M 170 53 C 183 51 188 61 184 70 C 181 76 175 77 170 75" c={TERM_PHOS} w={2.1} />
      <LP d="M 122 46 C 134 40 156 40 168 46 C 156 51 134 51 122 46 Z" c={TERM_SOFT} w={1.8} />
      <LC cx={108} cy={100} r={5} c={TERM_MID} w={1.6} />
      <LC cx={122} cy={104} r={5} c={TERM_MID} w={1.6} />
      <LC cx={182} cy={101} r={5} c={TERM_MID} w={1.6} />
      <LL x1={176} y1={90} x2={192} y2={84} c={TERM_MID} w={1.7} />
    </TermSceneRoot>
  );
}

export function TermRestSushiScene() {
  // Maki and nigiri on a board, chopsticks above.
  return (
    <TermSceneRoot>
      <LL x1={16} y1={106} x2={194} y2={106} c={TERM_DIM} w={1.6} />
      <LR x={98} y={72} width={96} height={14} rx={3} c={TERM_MID} w={2} />
      <LC cx={118} cy={58} r={12} c={TERM_PHOS} w={2.1} />
      <LDot cx={118} cy={58} r={4.5} c={TERM_SOFT} />
      <LC cx={146} cy={58} r={12} c={TERM_PHOS} w={2.1} />
      <LDot cx={146} cy={58} r={4.5} c={TERM_MID} />
      <LC cx={174} cy={58} r={12} c={TERM_PHOS} w={2.1} />
      <LDot cx={174} cy={58} r={4.5} c={TERM_SOFT} />
      <LPoly points="102,38 126,38 122,46 106,46" close c={TERM_SOFT} w={1.8} />
      <LP d="M 104 38 C 110 32 120 32 124 38" c={TERM_PHOS} w={1.9} />
      <LL x1={138} y1={24} x2={192} y2={40} c={TERM_MID} w={1.9} />
      <LL x1={134} y1={34} x2={188} y2={50} c={TERM_MID} w={1.9} />
      <LC cx={106} cy={96} r={5} c={TERM_MID} w={1.6} />
    </TermSceneRoot>
  );
}

export function TermRestChineseScene() {
  // Takeout box with noodles, chopsticks, fortune cookie.
  return (
    <TermSceneRoot>
      <LL x1={16} y1={106} x2={194} y2={106} c={TERM_DIM} w={1.6} />
      <LP d="M 144 10 C 140 16 144 20 141 26" c={TERM_DIM} w={1.7} />
      <LPoly points="122,50 178,50 170,102 130,102" close c={TERM_PHOS} w={2.3} />
      <LP d="M 122 50 L 108 36 L 132 34" c={TERM_MID} w={1.9} />
      <LP d="M 178 50 L 190 36 L 168 34" c={TERM_MID} w={1.9} />
      <LPoly points="150,66 162,78 150,90 138,78" close c={TERM_MID} w={1.7} />
      <LP d="M 126 44 C 134 34 144 40 142 45 C 150 35 162 36 164 44" c={TERM_SOFT} w={1.8} />
      <LP d="M 148 42 C 154 33 166 34 170 42" c={TERM_PHOS} w={1.8} />
      <LL x1={160} y1={14} x2={182} y2={40} c={TERM_MID} w={1.9} />
      <LL x1={170} y1={12} x2={190} y2={38} c={TERM_MID} w={1.9} />
      <LP d="M 100 96 C 106 86 122 86 126 94 C 118 100 106 102 100 96 Z" c={TERM_SOFT} w={1.8} />
      <LL x1={124} y1={92} x2={136} y2={90} c={TERM_SOFT} w={1.7} />
    </TermSceneRoot>
  );
}

export function TermRestDinerScene() {
  // Diner plate with a mini burger and a shake, sign above.
  return (
    <TermSceneRoot>
      <LL x1={16} y1={104} x2={194} y2={104} c={TERM_DIM} w={1.6} />
      <LR x={108} y={10} width={76} height={18} rx={9} c={TERM_MID} w={1.9} />
      <LDot cx={126} cy={19} r={2.2} c={TERM_SOFT} />
      <LDot cx={166} cy={19} r={2.2} c={TERM_SOFT} />
      <LP d="M 100 92 C 116 85 152 85 168 92 C 152 99 116 99 100 92 Z" c={TERM_MID} w={1.9} />
      <LP d="M 112 84 C 112 79 120 76 134 76 C 148 76 156 79 156 84 C 144 88 124 88 112 84 Z" c={TERM_PHOS} w={2} />
      <LL x1={114} y1={72} x2={154} y2={72} c={TERM_MID} w={1.9} />
      <LP d="M 112 68 C 120 62 128 69 134 63 C 141 69 148 62 156 68" c={TERM_SOFT} w={1.7} />
      <LP d="M 112 62 C 112 50 122 44 134 44 C 146 44 156 50 156 62 C 142 57 126 57 112 62 Z" c={TERM_PHOS} w={2.2} />
      <LDot cx={126} cy={50} r={1.8} c={TERM_SOFT} />
      <LDot cx={142} cy={50} r={1.8} c={TERM_SOFT} />
      <LPoly points="172,58 192,58 188,92 176,92" close c={TERM_SOFT} w={2} />
      <LL x1={186} y1={36} x2={182} y2={58} c={TERM_MID} w={1.9} />
      <LC cx={182} cy={52} r={4} c={TERM_PHOS} w={1.7} />
    </TermSceneRoot>
  );
}

export function TermRestDessertScene() {
  // Sundae glass with three scoops, cherry, wafer and spoon.
  return (
    <TermSceneRoot>
      <LL x1={16} y1={108} x2={194} y2={108} c={TERM_DIM} w={1.6} />
      <LP d="M 120 62 L 176 62 C 174 78 164 88 148 88 C 132 88 122 78 120 62 Z" c={TERM_PHOS} w={2.2} />
      <LPoly points="148,88 148,100 132,104 164,104 148,100" c={TERM_MID} w={1.9} />
      <LC cx={132} cy={52} r={13} c={TERM_SOFT} w={2} />
      <LC cx={162} cy={52} r={13} c={TERM_PHOS} w={2} />
      <LC cx={147} cy={36} r={13} c={TERM_PHOS} w={2.1} />
      <LP d="M 136 30 C 142 24 152 24 158 30" c={TERM_MID} w={1.6} />
      <LC cx={147} cy={20} r={5} c={TERM_PHOS} w={1.9} />
      <LP d="M 150 16 C 154 10 160 8 164 10" c={TERM_MID} w={1.6} />
      <LPoly points="168,22 178,26 162,52 154,48" close c={TERM_MID} w={1.8} />
      <LL x1={186} y1={44} x2={178} y2={76} c={TERM_MID} w={1.8} />
    </TermSceneRoot>
  );
}

export function TermRestItalianScene() {
  // Wide bowl of pasta, breadstick leaning, parmesan dust.
  return (
    <TermSceneRoot>
      <LL x1={16} y1={106} x2={194} y2={106} c={TERM_DIM} w={1.6} />
      <LP d="M 100 56 L 188 56 C 186 78 168 94 144 94 C 120 94 102 78 100 56 Z" c={TERM_PHOS} w={2.3} />
      <LL x1={96} y1={56} x2={192} y2={56} c={TERM_MID} w={2} />
      <LP d="M 112 50 C 120 40 132 44 130 50 C 138 40 150 40 152 50" c={TERM_SOFT} w={1.8} />
      <LP d="M 140 50 C 146 39 160 39 164 49 C 170 41 182 42 184 50" c={TERM_PHOS} w={1.8} />
      <LC cx={128} cy={66} r={6} c={TERM_MID} w={1.7} />
      <LC cx={162} cy={70} r={6} c={TERM_MID} w={1.7} />
      <LPoly points="146,30 154,38 146,42 139,36" close c={TERM_SOFT} w={1.6} />
      <LPoly points="176,18 186,22 162,52 154,48" close c={TERM_MID} w={1.9} />
      <LL x1={168} y1={30} x2={176} y2={34} c={TERM_MID} w={1.5} />
      <LDot cx={118} cy={80} r={1.9} c={TERM_SOFT} />
      <LDot cx={148} cy={84} r={1.9} c={TERM_SOFT} />
      <LL x1={108} y1={30} x2={120} y2={50} c={TERM_MID} w={1.7} />
    </TermSceneRoot>
  );
}

export function TermRestSeafoodScene() {
  // Whole fish on a platter, lemon, shrimp curl, wave below.
  return (
    <TermSceneRoot>
      <LP d="M 96 102 C 112 96 128 108 144 102 C 160 96 176 108 194 102" c={TERM_DIM} w={1.8} />
      <LP d="M 98 84 C 120 76 176 76 198 84 C 176 93 120 93 98 84 Z" c={TERM_MID} w={2} />
      <LP d="M 108 68 C 122 52 152 48 172 60 C 176 63 176 66 172 69 C 152 80 122 82 108 68 Z" c={TERM_PHOS} w={2.3} />
      <LPoly points="172,60 190,50 188,68 190,80 172,69" close c={TERM_PHOS} w={2} />
      <LP d="M 138 54 C 144 58 144 66 138 72" c={TERM_SOFT} w={1.7} />
      <LP d="M 126 58 C 130 62 130 66 126 71" c={TERM_MID} w={1.6} />
      <LDot cx={120} cy={62} r={2.4} c={TERM_PHOS} />
      <LC cx={182} cy={90} r={8} c={TERM_SOFT} w={1.8} />
      <LL x1={174} y1={90} x2={190} y2={90} c={TERM_SOFT} w={1.4} />
      <LP d="M 106 92 C 100 86 106 78 114 82 C 120 85 118 94 110 95" c={TERM_SOFT} w={1.8} />
      <LP d="M 148 42 C 152 38 158 38 162 42" c={TERM_MID} w={1.6} />
    </TermSceneRoot>
  );
}

export function TermRestHealthyScene() {
  // Salad bowl and a smoothie, sun overhead.
  return (
    <TermSceneRoot>
      <LL x1={16} y1={106} x2={194} y2={106} c={TERM_DIM} w={1.6} />
      <LC cx={184} cy={20} r={9} c={TERM_SOFT} w={1.9} />
      <LL x1={184} y1={6} x2={184} y2={10} c={TERM_SOFT} w={1.7} />
      <LL x1={196} y1={12} x2={193} y2={15} c={TERM_SOFT} w={1.7} />
      <LP d="M 98 58 L 168 58 C 166 80 152 94 133 94 C 114 94 100 80 98 58 Z" c={TERM_PHOS} w={2.3} />
      <LL x1={94} y1={58} x2={172} y2={58} c={TERM_MID} w={2} />
      <LP d="M 108 56 C 104 44 114 36 124 40 C 128 48 120 56 108 56 Z" c={TERM_SOFT} w={1.8} />
      <LP d="M 132 56 C 130 43 142 35 152 41 C 154 50 144 57 132 56 Z" c={TERM_PHOS} w={1.8} />
      <LC cx={118} cy={72} r={5.5} c={TERM_PHOS} w={1.7} />
      <LC cx={146} cy={78} r={5.5} c={TERM_SOFT} w={1.7} />
      <LPoly points="174,52 194,52 190,94 178,94" close c={TERM_MID} w={2} />
      <LL x1={175} y1={64} x2={193} y2={64} c={TERM_SOFT} w={1.6} />
      <LL x1={188} y1={30} x2={184} y2={52} c={TERM_MID} w={1.9} />
    </TermSceneRoot>
  );
}

export function TermRestIndianScene() {
  // Curry bowl, naan leaning, rice mound and spice dots.
  return (
    <TermSceneRoot>
      <LL x1={16} y1={106} x2={194} y2={106} c={TERM_DIM} w={1.6} />
      <LP d="M 136 14 C 132 20 136 24 133 30" c={TERM_DIM} w={1.7} />
      <LP d="M 102 94 C 124 86 168 86 190 94 C 168 102 124 102 102 94 Z" c={TERM_MID} w={1.9} />
      <LP d="M 106 56 L 182 56 C 180 76 164 90 144 90 C 124 90 108 76 106 56 Z" c={TERM_PHOS} w={2.3} />
      <LL x1={102} y1={56} x2={186} y2={56} c={TERM_MID} w={2} />
      <LP d="M 114 52 C 130 45 158 45 174 52 C 158 58 130 58 114 52 Z" c={TERM_SOFT} w={1.8} />
      <LP d="M 132 51 C 138 46 148 46 152 50 C 146 54 138 54 132 51 Z" c={TERM_PHOS} w={1.6} />
      <LPoly points="178,20 194,28 186,58 172,52" close c={TERM_PHOS} w={2} />
      <LDot cx={182} cy={36} r={1.9} c={TERM_MID} />
      <LDot cx={180} cy={46} r={1.9} c={TERM_MID} />
      <LP d="M 108 88 C 110 78 120 74 126 78 C 132 74 138 80 138 88 C 128 92 116 92 108 88 Z" c={TERM_SOFT} w={1.7} />
      <LDot cx={156} cy={98} r={2} c={TERM_MID} />
    </TermSceneRoot>
  );
}
