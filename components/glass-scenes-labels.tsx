// v201 — the Stained Glass label scenes: jewel-tone panes in dark
// lead, the cathedral window dialect. Every label picture is a small
// leaded window — flat panes of sapphire, ruby, amber, emerald and
// violet held in came lines over a deep jewel ground, with the cream
// label pane under the card's words and the hero art set in the
// right pane field. Each scene is bespoke: its own composition,
// drawn only from the glass kit.

import {
  GlassSceneRoot,
  GP,
  GC,
  GR,
  GPoly,
  GLine,
  GDot,
  GFigure,
  GLASS_AMBER,
  GLASS_AMBER_LT,
  GLASS_AMBER_PALE,
  GLASS_CREAM,
  GLASS_CREAM_LT,
  GLASS_EMERALD,
  GLASS_RUBY,
  GLASS_SAPPHIRE,
  GLASS_SAPPHIRE_LT,
  GLASS_VIOLET,
  GLASS_VIOLET_LT,
  GLASS_LEAD,
} from "@/components/glass-kit";

export function GlassBBQScene() {
  return (
    <GlassSceneRoot bg="#33161D">
      <GLine x1={120} y1={102} x2={196} y2={102} c={GLASS_LEAD} w={2.4} />
      <GDot cx={134} cy={18} r={2.6} fill={GLASS_CREAM} o={0.7} />
      <GDot cx={150} cy={12} r={2.2} fill={GLASS_CREAM} o={0.5} />
      <GDot cx={166} cy={20} r={2.6} fill={GLASS_CREAM} o={0.7} />
      <GP d="M 122 62 A 32 24 0 0 1 186 62 Z" fill={GLASS_RUBY} />
      <GLine x1={138} y1={44} x2={142} y2={62} c={GLASS_LEAD} w={2} />
      <GLine x1={166} y1={44} x2={162} y2={62} c={GLASS_LEAD} w={2} />
      <GP d="M 146 34 C 150 30 158 30 162 34 L 160 38 L 148 38 Z" fill={GLASS_LEAD} />
      <GR x={118} y={62} width={72} height={7} rx={2} fill={GLASS_AMBER} />
      <GLine x1={128} y1={76} x2={180} y2={76} c={GLASS_LEAD} w={1.8} />
      <GLine x1={128} y1={82} x2={180} y2={82} c={GLASS_LEAD} w={1.8} />
      <GLine x1={126} y1={69} x2={120} y2={100} c={GLASS_LEAD} w={2.6} />
      <GLine x1={182} y1={69} x2={188} y2={100} c={GLASS_LEAD} w={2.6} />
      <GLine x1={154} y1={69} x2={154} y2={88} c={GLASS_LEAD} w={2.4} />
      <GDot cx={140} cy={94} r={3} fill={GLASS_AMBER} />
      <GDot cx={154} cy={96} r={3.4} fill={GLASS_AMBER_LT} />
      <GDot cx={168} cy={94} r={3} fill={GLASS_AMBER} />
    </GlassSceneRoot>
  );
}

export function GlassFastScene() {
  return (
    <GlassSceneRoot bg="#241A38">
      <GLine x1={120} y1={102} x2={196} y2={102} c={GLASS_LEAD} w={2.4} />
      <GP d="M 120 80 A 34 30 0 0 1 188 80 Z" fill={GLASS_SAPPHIRE_LT} />
      <GLine x1={136} y1={56} x2={140} y2={80} c={GLASS_LEAD} w={1.8} />
      <GLine x1={168} y1={56} x2={164} y2={80} c={GLASS_LEAD} w={1.8} />
      <GC cx={154} cy={48} r={5} fill={GLASS_AMBER} />
      <GR x={112} y={80} width={84} height={6} rx={2} fill={GLASS_CREAM} />
      <GR x={124} y={90} width={60} height={5} rx={2} fill={GLASS_VIOLET} />
      <GDot cx={128} cy={30} r={2} fill={GLASS_AMBER_PALE} o={0.8} />
      <GDot cx={182} cy={26} r={2} fill={GLASS_AMBER_PALE} o={0.8} />
    </GlassSceneRoot>
  );
}

export function GlassWorshipScene() {
  return (
    <GlassSceneRoot bg="#241A38">
      <GLine x1={120} y1={104} x2={196} y2={104} c={GLASS_LEAD} w={2.4} />
      <GP d="M 126 44 A 28 28 0 0 1 182 44 L 182 52 L 126 52 Z" fill={GLASS_AMBER} />
      <GLine x1={154} y1={16} x2={154} y2={52} c={GLASS_LEAD} w={1.8} />
      <GLine x1={140} y1={24} x2={140} y2={52} c={GLASS_LEAD} w={1.8} />
      <GLine x1={168} y1={24} x2={168} y2={52} c={GLASS_LEAD} w={1.8} />
      <GFigure x={132} y={102} s={0.95} fill={GLASS_RUBY} pose="armsUp" />
      <GFigure x={156} y={104} s={1.1} fill={GLASS_VIOLET_LT} pose="armsUp" />
      <GFigure x={180} y={102} s={0.95} fill={GLASS_EMERALD} pose="armsUp" />
      <GDot cx={122} cy={64} r={2.6} fill={GLASS_AMBER_PALE} />
      <GLine x1={124} y1={64} x2={124} y2={52} c={GLASS_AMBER_PALE} w={1.8} />
      <GDot cx={190} cy={58} r={2.4} fill={GLASS_SAPPHIRE_LT} />
      <GLine x1={192} y1={58} x2={192} y2={47} c={GLASS_SAPPHIRE_LT} w={1.8} />
    </GlassSceneRoot>
  );
}

export function GlassBibleStudyScene() {
  return (
    <GlassSceneRoot bg="#1D2A4A">
      <GLine x1={120} y1={102} x2={196} y2={102} c={GLASS_LEAD} w={2.4} />
      <GP d="M 152 62 C 142 54 130 52 120 56 L 120 90 C 130 86 142 88 152 96 C 162 88 174 86 184 90 L 184 56 C 174 52 162 54 152 62 Z" fill={GLASS_CREAM} />
      <GLine x1={152} y1={62} x2={152} y2={96} c={GLASS_LEAD} w={2.2} />
      <GLine x1={128} y1={64} x2={144} y2={62} c={GLASS_LEAD} w={1.6} />
      <GLine x1={128} y1={74} x2={144} y2={72} c={GLASS_LEAD} w={1.6} />
      <GLine x1={160} y1={62} x2={176} y2={64} c={GLASS_LEAD} w={1.6} />
      <GLine x1={160} y1={72} x2={176} y2={74} c={GLASS_LEAD} w={1.6} />
      <GLine x1={186} y1={90} x2={186} y2={60} c={GLASS_LEAD} w={2.2} />
      <GPoly points="176,60 196,60 191,46 181,46" fill={GLASS_AMBER} />
      <GDot cx={154} cy={34} r={3} fill={GLASS_AMBER_PALE} />
      <GDot cx={132} cy={28} r={2.2} fill={GLASS_SAPPHIRE_LT} />
      <GDot cx={176} cy={28} r={2.2} fill={GLASS_SAPPHIRE_LT} />
    </GlassSceneRoot>
  );
}

export function GlassTherapyScene() {
  return (
    <GlassSceneRoot bg="#14291F">
      <GLine x1={120} y1={102} x2={196} y2={102} c={GLASS_LEAD} w={2.4} />
      <GP d="M 138 34 C 138 24 148 18 158 20 C 168 18 178 26 176 36 C 174 44 166 48 158 46 L 146 50 L 149 42 C 142 40 138 38 138 34 Z" fill={GLASS_CREAM_LT} />
      <GDot cx={150} cy={32} r={2} fill={GLASS_VIOLET} />
      <GDot cx={159} cy={32} r={2} fill={GLASS_RUBY} />
      <GDot cx={168} cy={32} r={2} fill={GLASS_EMERALD} />
      <GR x={120} y={62} width={26} height={28} rx={4} fill={GLASS_SAPPHIRE} />
      <GLine x1={124} y1={90} x2={124} y2={100} c={GLASS_LEAD} w={2.2} />
      <GLine x1={142} y1={90} x2={142} y2={100} c={GLASS_LEAD} w={2.2} />
      <GR x={162} y={62} width={26} height={28} rx={4} fill={GLASS_VIOLET} />
      <GLine x1={166} y1={90} x2={166} y2={100} c={GLASS_LEAD} w={2.2} />
      <GLine x1={184} y1={90} x2={184} y2={100} c={GLASS_LEAD} w={2.2} />
      <GC cx={133} cy={54} r={7} fill={GLASS_CREAM} />
      <GC cx={175} cy={54} r={7} fill={GLASS_CREAM} />
    </GlassSceneRoot>
  );
}

export function GlassDoctorScene() {
  return (
    <GlassSceneRoot bg="#1D2A4A">
      <GLine x1={120} y1={104} x2={196} y2={104} c={GLASS_LEAD} w={2.4} />
      <GR x={128} y={20} width={50} height={76} rx={3} fill={GLASS_CREAM} />
      <GR x={142} y={12} width={22} height={12} rx={3} fill={GLASS_SAPPHIRE} />
      <GP d="M 147 34 L 159 34 L 159 44 L 169 44 L 169 56 L 159 56 L 159 66 L 147 66 L 147 56 L 137 56 L 137 44 L 147 44 Z" fill={GLASS_RUBY} />
      <GPoly points="134,80 144,80 148,72 154,86 158,80 170,80" fill={GLASS_EMERALD} />
      <GLine x1={136} y1={88} x2={162} y2={88} c={GLASS_LEAD} w={1.6} />
      <GC cx={188} cy={28} r={8} fill={GLASS_AMBER_PALE} />
      <GLine x1={188} y1={23} x2={188} y2={28} c={GLASS_LEAD} w={1.8} />
      <GLine x1={188} y1={28} x2={192} y2={31} c={GLASS_LEAD} w={1.8} />
    </GlassSceneRoot>
  );
}

export function GlassHaircutScene() {
  return (
    <GlassSceneRoot bg="#33161D">
      <GLine x1={120} y1={104} x2={196} y2={104} c={GLASS_LEAD} w={2.4} />
      <GR x={130} y={14} width={54} height={64} rx={4} fill={GLASS_SAPPHIRE_LT} />
      <GC cx={157} cy={46} r={13} fill={GLASS_CREAM} />
      <GP d="M 144 40 C 147 30 167 30 170 40 C 163 35 151 35 144 40 Z" fill={GLASS_VIOLET} />
      <GLine x1={138} y1={70} x2={150} y2={58} c={GLASS_LEAD} w={1.6} />
      <GC cx={122} cy={84} r={5} fill={GLASS_AMBER} />
      <GC cx={122} cy={98} r={5} fill={GLASS_AMBER} />
      <GLine x1={126} y1={87} x2={140} y2={100} c={GLASS_LEAD} w={2.2} />
      <GLine x1={126} y1={95} x2={140} y2={82} c={GLASS_LEAD} w={2.2} />
      <GDot cx={146} cy={96} r={2} fill={GLASS_RUBY} />
      <GDot cx={158} cy={100} r={2} fill={GLASS_VIOLET_LT} />
      <GDot cx={170} cy={95} r={2} fill={GLASS_EMERALD} />
      <GLine x1={130} y1={86} x2={184} y2={86} c={GLASS_LEAD} w={1.8} />
    </GlassSceneRoot>
  );
}

export function GlassGardeningScene() {
  return (
    <GlassSceneRoot bg="#14291F">
      <GLine x1={120} y1={100} x2={196} y2={100} c={GLASS_LEAD} w={2.4} />
      <GP d="M 120 100 C 136 95 178 95 194 100 L 194 106 L 120 106 Z" fill="#6B3F1D" />
      <GLine x1={134} y1={98} x2={134} y2={70} c={GLASS_EMERALD} w={3} />
      <GPoly points="134,80 120,80 122,66 134,72" fill={GLASS_EMERALD} />
      <GPoly points="134,74 148,62 148,76 136,82" fill={GLASS_EMERALD} />
      <GLine x1={160} y1={98} x2={160} y2={78} c={GLASS_EMERALD} w={3} />
      <GPoly points="160,86 148,84 150,74 160,80" fill={GLASS_EMERALD} />
      <GPoly points="160,82 170,72 172,84 162,88" fill={GLASS_EMERALD} />
      <GC cx={180} cy={80} r={6} fill={GLASS_RUBY} />
      <GLine x1={180} y1={86} x2={180} y2={98} c={GLASS_EMERALD} w={2.6} />
      <GPoly points="122,84 138,84 134,98 126,98" fill={GLASS_SAPPHIRE} />
      <GDot cx={186} cy={58} r={2.2} fill={GLASS_SAPPHIRE_LT} />
      <GDot cx={176} cy={66} r={2.2} fill={GLASS_SAPPHIRE_LT} />
      <GDot cx={190} cy={70} r={2.2} fill={GLASS_SAPPHIRE_LT} />
    </GlassSceneRoot>
  );
}

export function GlassMowLawnScene() {
  return (
    <GlassSceneRoot bg="#14291F">
      <GLine x1={120} y1={102} x2={196} y2={102} c={GLASS_LEAD} w={2.4} />
      <GC cx={186} cy={22} r={9} fill={GLASS_AMBER} />
      <GLine x1={186} y1={8} x2={186} y2={12} c={GLASS_AMBER} w={2.2} />
      <GLine x1={174} y1={22} x2={178} y2={22} c={GLASS_AMBER} w={2.2} />
      <GP d="M 126 84 L 176 84 L 182 96 L 132 96 Z" fill={GLASS_RUBY} />
      <GP d="M 138 84 C 138 74 146 68 156 68 C 166 68 172 74 172 84 Z" fill={GLASS_RUBY} />
      <GLine x1={150} y1={70} x2={150} y2={84} c={GLASS_LEAD} w={1.8} />
      <GC cx={136} cy={98} r={7} fill={GLASS_LEAD} />
      <GC cx={172} cy={98} r={7} fill={GLASS_LEAD} />
      <GLine x1={128} y1={86} x2={122} y2={58} c={GLASS_LEAD} w={2.6} />
      <GLine x1={122} y1={58} x2={134} y2={54} c={GLASS_LEAD} w={2.6} />
      <GPoly points="122,106 124,98 126,106" fill={GLASS_EMERALD} />
      <GPoly points="188,106 190,98 192,106" fill={GLASS_EMERALD} />
    </GlassSceneRoot>
  );
}

export function GlassPruneScene() {
  return (
    <GlassSceneRoot bg="#14291F">
      <GLine x1={120} y1={104} x2={196} y2={104} c={GLASS_LEAD} w={2.4} />
      <GR x={152} y={70} width={7} height={34} rx={2} fill="#6B3F1D" />
      <GC cx={140} cy={46} r={17} fill={GLASS_EMERALD} />
      <GC cx={164} cy={36} r={19} fill={GLASS_EMERALD} />
      <GC cx={182} cy={50} r={14} fill={GLASS_EMERALD} />
      <GLine x1={140} y1={30} x2={146} y2={60} c={GLASS_LEAD} w={1.6} />
      <GLine x1={168} y1={20} x2={162} y2={52} c={GLASS_LEAD} w={1.6} />
      <GC cx={122} cy={62} r={5} fill={GLASS_AMBER} />
      <GC cx={122} cy={74} r={5} fill={GLASS_AMBER} />
      <GLine x1={125} y1={65} x2={138} y2={76} c={GLASS_LEAD} w={2.2} />
      <GLine x1={125} y1={71} x2={138} y2={60} c={GLASS_LEAD} w={2.2} />
      <GPoly points="134,92 140,96 134,100 130,94" fill={GLASS_EMERALD} />
      <GPoly points="178,88 184,92 178,96 174,90" fill={GLASS_EMERALD} />
    </GlassSceneRoot>
  );
}

export function GlassHarvestScene() {
  return (
    <GlassSceneRoot bg="#2E2008">
      <GLine x1={120} y1={102} x2={196} y2={102} c={GLASS_LEAD} w={2.4} />
      <GC cx={184} cy={20} r={9} fill={GLASS_AMBER} />
      <GLine x1={130} y1={100} x2={130} y2={48} c={GLASS_AMBER} w={3} />
      <GPoly points="130,62 120,52 122,40 130,50" fill={GLASS_AMBER_LT} />
      <GPoly points="130,62 140,52 138,40 130,50" fill={GLASS_AMBER_PALE} />
      <GLine x1={150} y1={100} x2={150} y2={54} c={GLASS_AMBER} w={3} />
      <GPoly points="150,68 140,58 142,46 150,56" fill={GLASS_AMBER_LT} />
      <GPoly points="150,68 160,58 158,46 150,56" fill={GLASS_AMBER_PALE} />
      <GLine x1={168} y1={100} x2={168} y2={48} c={GLASS_AMBER} w={3} />
      <GPoly points="168,62 158,52 160,40 168,50" fill={GLASS_AMBER_LT} />
      <GPoly points="168,62 178,52 176,40 168,50" fill={GLASS_AMBER_PALE} />
      <GP d="M 118 84 L 192 84 L 186 102 L 124 102 Z" fill="#8A5A2B" />
      <GLine x1={121} y1={93} x2={189} y2={93} c={GLASS_LEAD} w={1.8} />
    </GlassSceneRoot>
  );
}

export function GlassParkScene() {
  return (
    <GlassSceneRoot bg="#14291F">
      <GLine x1={120} y1={102} x2={196} y2={102} c={GLASS_LEAD} w={2.4} />
      <GC cx={124} cy={22} r={8} fill={GLASS_AMBER} />
      <GR x={148} y={58} width={7} height={44} rx={2} fill="#6B3F1D" />
      <GC cx={136} cy={42} r={16} fill={GLASS_EMERALD} />
      <GC cx={158} cy={32} r={18} fill={GLASS_EMERALD} />
      <GC cx={176} cy={44} r={13} fill={GLASS_EMERALD} />
      <GLine x1={140} y1={28} x2={144} y2={54} c={GLASS_LEAD} w={1.6} />
      <GR x={118} y={86} width={52} height={6} rx={2} fill="#8A5A2B" />
      <GR x={120} y={76} width={48} height={6} rx={2} fill="#8A5A2B" />
      <GLine x1={124} y1={92} x2={124} y2={102} c={GLASS_LEAD} w={2.4} />
      <GLine x1={164} y1={92} x2={164} y2={102} c={GLASS_LEAD} w={2.4} />
    </GlassSceneRoot>
  );
}

export function GlassPartyScene() {
  return (
    <GlassSceneRoot bg="#241A38">
      <GLine x1={120} y1={104} x2={196} y2={104} c={GLASS_LEAD} w={2.4} />
      <GP d="M 118 12 C 146 26 172 26 196 12 L 196 20 C 172 32 146 32 118 20 Z" fill={GLASS_VIOLET} />
      <GPoly points="128,20 138,21 133,32" fill={GLASS_RUBY} />
      <GPoly points="150,23 160,23 155,34" fill={GLASS_AMBER} />
      <GPoly points="172,21 182,20 177,32" fill={GLASS_EMERALD} />
      <GC cx={134} cy={60} r={11} fill={GLASS_RUBY} />
      <GLine x1={134} y1={71} x2={132} y2={92} c={GLASS_LEAD} w={1.6} />
      <GC cx={162} cy={54} r={13} fill={GLASS_AMBER} />
      <GLine x1={162} y1={67} x2={164} y2={86} c={GLASS_LEAD} w={1.6} />
      <GC cx={186} cy={62} r={10} fill={GLASS_SAPPHIRE} />
      <GLine x1={186} y1={72} x2={184} y2={90} c={GLASS_LEAD} w={1.6} />
      <GDot cx={122} cy={86} r={2.2} fill={GLASS_AMBER_PALE} />
      <GDot cx={148} cy={94} r={2.2} fill={GLASS_RUBY} />
      <GDot cx={176} cy={90} r={2.2} fill={GLASS_EMERALD} />
    </GlassSceneRoot>
  );
}

export function GlassSchoolScene() {
  return (
    <GlassSceneRoot bg="#1D2A4A">
      <GLine x1={120} y1={104} x2={196} y2={104} c={GLASS_LEAD} w={2.4} />
      <GR x={120} y={48} width={76} height={54} rx={2} fill={GLASS_RUBY} />
      <GPoly points="112,48 158,26 196,48" fill={GLASS_AMBER} />
      <GLine x1={158} y1={26} x2={158} y2={12} c={GLASS_LEAD} w={2.4} />
      <GPoly points="158,12 172,15 158,19" fill={GLASS_EMERALD} />
      <GR x={150} y={76} width={16} height={26} rx={1} fill="#6B3F1D" />
      <GR x={128} y={58} width={14} height={14} rx={1} fill={GLASS_SAPPHIRE_LT} />
      <GR x={174} y={58} width={14} height={14} rx={1} fill={GLASS_SAPPHIRE_LT} />
      <GC cx={158} cy={40} r={5} fill={GLASS_CREAM} />
      <GLine x1={158} y1={36} x2={158} y2={40} c={GLASS_LEAD} w={1.6} />
      <GLine x1={158} y1={40} x2={161} y2={42} c={GLASS_LEAD} w={1.6} />
    </GlassSceneRoot>
  );
}

export function GlassWaterParkScene() {
  return (
    <GlassSceneRoot bg="#1D2A4A">
      <GP d="M 118 104 C 140 99 176 106 196 102 L 196 110 L 118 110 Z" fill={GLASS_SAPPHIRE} />
      <GR x={124} y={28} width={8} height={72} rx={1} fill={GLASS_VIOLET} />
      <GR x={142} y={28} width={8} height={72} rx={1} fill={GLASS_VIOLET} />
      <GR x={118} y={20} width={54} height={10} rx={2} fill={GLASS_RUBY} />
      <GP d="M 144 30 C 176 34 192 48 188 66 C 185 80 170 84 158 78 L 162 68 C 170 72 178 68 179 60 C 180 48 166 40 144 38 Z" fill={GLASS_AMBER} />
      <GC cx={152} cy={94} r={11} fill={GLASS_RUBY} />
      <GC cx={152} cy={94} r={5} fill={GLASS_CREAM} />
      <GDot cx={182} cy={86} r={2.2} fill={GLASS_SAPPHIRE_LT} />
      <GDot cx={190} cy={92} r={2.2} fill={GLASS_SAPPHIRE_LT} />
      <GDot cx={172} cy={94} r={2.2} fill={GLASS_SAPPHIRE_LT} />
      <GC cx={122} cy={14} r={6} fill={GLASS_AMBER} />
    </GlassSceneRoot>
  );
}

export function GlassBeachScene() {
  return (
    <GlassSceneRoot bg="#1D2A4A">
      <GP d="M 118 102 C 140 96 176 96 196 102 L 196 110 L 118 110 Z" fill={GLASS_AMBER_PALE} />
      <GC cx={122} cy={20} r={8} fill={GLASS_AMBER} />
      <GLine x1={156} y1={102} x2={156} y2={52} c={GLASS_LEAD} w={2.6} />
      <GP d="M 118 54 C 132 38 180 38 194 54 C 180 47 168 49 156 54 C 144 49 130 47 118 54 Z" fill={GLASS_RUBY} />
      <GLine x1={156} y1={52} x2={136} y2={40} c={GLASS_LEAD} w={1.6} />
      <GLine x1={156} y1={52} x2={176} y2={40} c={GLASS_LEAD} w={1.6} />
      <GLine x1={156} y1={52} x2={156} y2={38} c={GLASS_LEAD} w={1.6} />
      <GR x={128} y={88} width={46} height={10} rx={2} fill={GLASS_SAPPHIRE} />
      <GLine x1={143} y1={88} x2={143} y2={98} c={GLASS_LEAD} w={1.6} />
      <GLine x1={159} y1={88} x2={159} y2={98} c={GLASS_LEAD} w={1.6} />
      <GC cx={186} cy={88} r={9} fill={GLASS_EMERALD} />
      <GP d="M 178 83 C 183 88 189 88 194 83 L 192 92 L 180 92 Z" fill={GLASS_VIOLET} />
    </GlassSceneRoot>
  );
}

export function GlassBabyShowerScene() {
  return (
    <GlassSceneRoot bg="#33161D">
      <GLine x1={120} y1={104} x2={196} y2={104} c={GLASS_LEAD} w={2.4} />
      <GP d="M 120 66 C 120 84 136 94 156 94 C 176 94 192 84 192 66 Z" fill={GLASS_VIOLET_LT} />
      <GLine x1={140} y1={72} x2={140} y2={90} c={GLASS_LEAD} w={1.6} />
      <GLine x1={172} y1={72} x2={172} y2={90} c={GLASS_LEAD} w={1.6} />
      <GR x={116} y={62} width={80} height={6} rx={2} fill={GLASS_CREAM} />
      <GP d="M 126 66 C 126 52 138 44 150 48" fill={GLASS_SAPPHIRE} />
      <GP d="M 186 66 C 186 52 174 44 162 48" fill={GLASS_SAPPHIRE} />
      <GC cx={128} cy={100} r={4} fill={GLASS_LEAD} />
      <GC cx={184} cy={100} r={4} fill={GLASS_LEAD} />
      <GP d="M 156 36 C 152 28 142 30 142 38 C 142 44 148 48 156 54 C 164 48 170 44 170 38 C 170 30 160 28 156 36 Z" fill={GLASS_RUBY} />
      <GC cx={124} cy={30} r={8} fill={GLASS_AMBER_PALE} />
      <GC cx={190} cy={26} r={6} fill={GLASS_SAPPHIRE_LT} />
    </GlassSceneRoot>
  );
}

export function GlassBirthdayScene() {
  return (
    <GlassSceneRoot bg="#241A38">
      <GLine x1={120} y1={104} x2={196} y2={104} c={GLASS_LEAD} w={2.4} />
      <GR x={122} y={78} width={68} height={18} rx={2} fill={GLASS_SAPPHIRE} />
      <GR x={132} y={60} width={48} height={18} rx={2} fill={GLASS_RUBY} />
      <GP d="M 122 78 C 130 72 138 78 146 72 C 154 78 162 72 170 78 C 178 72 184 76 190 72 L 190 78 L 122 78 Z" fill={GLASS_CREAM} />
      <GLine x1={140} y1={60} x2={140} y2={46} c={GLASS_AMBER} w={2.6} />
      <GLine x1={156} y1={60} x2={156} y2={44} c={GLASS_AMBER} w={2.6} />
      <GLine x1={172} y1={60} x2={172} y2={46} c={GLASS_AMBER} w={2.6} />
      <GPoly points="140,46 136,38 140,32 144,38" fill={GLASS_AMBER_PALE} />
      <GPoly points="156,44 152,36 156,30 160,36" fill={GLASS_AMBER_PALE} />
      <GPoly points="172,46 168,38 172,32 176,38" fill={GLASS_AMBER_PALE} />
      <GC cx={122} cy={40} r={9} fill={GLASS_VIOLET_LT} />
      <GC cx={192} cy={36} r={7} fill={GLASS_EMERALD} />
      <GR x={118} y={98} width={76} height={4} rx={1} fill={GLASS_AMBER} />
    </GlassSceneRoot>
  );
}

export function GlassChristmasScene() {
  return (
    <GlassSceneRoot bg="#14291F">
      <GLine x1={120} y1={104} x2={196} y2={104} c={GLASS_LEAD} w={2.4} />
      <GPoly points="156,14 140,42 172,42" fill={GLASS_EMERALD} />
      <GPoly points="156,34 134,66 178,66" fill={GLASS_EMERALD} />
      <GPoly points="156,56 128,90 184,90" fill={GLASS_EMERALD} />
      <GLine x1={156} y1={42} x2={146} y2={66} c={GLASS_LEAD} w={1.6} />
      <GLine x1={156} y1={42} x2={166} y2={66} c={GLASS_LEAD} w={1.6} />
      <GR x={150} y={90} width={12} height={12} rx={1} fill="#6B3F1D" />
      <GPoly points="156,4 158,9 163,9 159,12 161,17 156,14 151,17 153,12 149,9 154,9" fill={GLASS_AMBER} />
      <GDot cx={146} cy={52} r={2.6} fill={GLASS_RUBY} />
      <GDot cx={166} cy={58} r={2.6} fill={GLASS_AMBER} />
      <GDot cx={154} cy={74} r={2.6} fill={GLASS_SAPPHIRE_LT} />
      <GDot cx={170} cy={80} r={2.6} fill={GLASS_RUBY} />
      <GDot cx={140} cy={82} r={2.6} fill={GLASS_AMBER} />
      <GR x={118} y={90} width={16} height={12} rx={1} fill={GLASS_RUBY} />
      <GLine x1={126} y1={90} x2={126} y2={102} c={GLASS_AMBER} w={2} />
      <GR x={180} y={92} width={14} height={10} rx={1} fill={GLASS_VIOLET} />
      <GLine x1={187} y1={92} x2={187} y2={102} c={GLASS_AMBER} w={2} />
    </GlassSceneRoot>
  );
}

export function GlassEasterScene() {
  return (
    <GlassSceneRoot bg="#241A38">
      <GLine x1={120} y1={104} x2={196} y2={104} c={GLASS_LEAD} w={2.4} />
      <GPoly points="144,34 140,12 146,10 150,30" fill={GLASS_CREAM} />
      <GPoly points="164,34 166,12 172,13 170,32" fill={GLASS_CREAM} />
      <GPoly points="144,30 143,16 146,15 148,28" fill="#E88AA0" />
      <GPoly points="166,30 168,16 170,17 169,30" fill="#E88AA0" />
      <GC cx={157} cy={48} r={15} fill={GLASS_CREAM} />
      <GDot cx={152} cy={46} r={1.8} fill={GLASS_LEAD} />
      <GDot cx={163} cy={46} r={1.8} fill={GLASS_LEAD} />
      <GPoly points="154,52 160,52 157,55" fill={GLASS_RUBY} />
      <GP d="M 140 96 C 140 84 148 78 156 78 C 164 78 172 84 172 96 C 164 100 148 100 140 96 Z" fill={GLASS_VIOLET_LT} />
      <GLine x1={144} y1={88} x2={168} y2={88} c={GLASS_LEAD} w={1.6} dash="3 3" />
      <GP d="M 120 100 C 120 90 126 85 132 85 C 138 85 144 90 144 100 C 136 103 128 103 120 100 Z" fill={GLASS_AMBER} />
      <GP d="M 176 100 C 176 92 181 88 186 88 C 191 88 196 92 196 100 C 190 102 182 102 176 100 Z" fill={GLASS_RUBY} />
      <GC cx={190} cy={20} r={8} fill={GLASS_AMBER} />
    </GlassSceneRoot>
  );
}

export function GlassSunriseServiceScene() {
  return (
    <GlassSceneRoot bg="#2E2008">
      <GP d="M 118 102 C 140 88 176 84 196 100 L 196 110 L 118 110 Z" fill={GLASS_EMERALD} />
      <GP d="M 124 84 A 32 32 0 0 1 188 84 Z" fill={GLASS_AMBER} />
      <GLine x1={140} y1={60} x2={140} y2={84} c={GLASS_LEAD} w={1.8} />
      <GLine x1={156} y1={52} x2={156} y2={84} c={GLASS_LEAD} w={1.8} />
      <GLine x1={172} y1={60} x2={172} y2={84} c={GLASS_LEAD} w={1.8} />
      <GLine x1={116} y1={84} x2={196} y2={84} c={GLASS_LEAD} w={2.2} />
      <GLine x1={134} y1={44} x2={128} y2={36} c={GLASS_AMBER_PALE} w={2.2} />
      <GLine x1={156} y1={38} x2={156} y2={28} c={GLASS_AMBER_PALE} w={2.2} />
      <GLine x1={178} y1={44} x2={184} y2={36} c={GLASS_AMBER_PALE} w={2.2} />
      <GLine x1={124} y1={88} x2={124} y2={56} c={GLASS_CREAM} w={3} />
      <GLine x1={114} y1={66} x2={134} y2={66} c={GLASS_CREAM} w={3} />
    </GlassSceneRoot>
  );
}

export function GlassThanksgivingScene() {
  return (
    <GlassSceneRoot bg="#2E2008">
      <GLine x1={120} y1={102} x2={196} y2={102} c={GLASS_LEAD} w={2.4} />
      <GPoly points="154,78 132,36 146,30 154,58" fill={GLASS_RUBY} />
      <GPoly points="156,78 154,30 166,28 162,58" fill={GLASS_AMBER} />
      <GPoly points="158,78 178,38 186,46 168,66" fill={GLASS_VIOLET} />
      <GPoly points="152,78 126,50 134,42 148,62" fill={GLASS_EMERALD} />
      <GC cx={156} cy={84} r={16} fill="#8A5A2B" />
      <GC cx={172} cy={74} r={7} fill="#8A5A2B" />
      <GPoly points="179,72 188,74 179,77" fill={GLASS_AMBER} />
      <GDot cx={170} cy={72} r={1.8} fill={GLASS_LEAD} />
      <GLine x1={150} y1={76} x2={150} y2={92} c={GLASS_LEAD} w={1.6} />
      <GP d="M 118 100 C 118 90 126 84 134 84 C 142 84 150 90 150 100 C 140 103 128 103 118 100 Z" fill={GLASS_AMBER} />
      <GLine x1={134} y1={84} x2={134} y2={78} c={GLASS_EMERALD} w={2.4} />
      <GPoly points="134,78 128,72 134,68 140,74" fill={GLASS_EMERALD} />
    </GlassSceneRoot>
  );
}

export function GlassWeddingScene() {
  return (
    <GlassSceneRoot bg="#241A38">
      <GLine x1={120} y1={104} x2={196} y2={104} c={GLASS_LEAD} w={2.4} />
      <GR x={120} y={36} width={5} height={66} rx={1} fill={GLASS_AMBER} />
      <GR x={187} y={36} width={5} height={66} rx={1} fill={GLASS_AMBER} />
      <GP d="M 120 36 C 138 20 174 20 192 36 L 192 44 C 174 30 138 30 120 44 Z" fill={GLASS_VIOLET_LT} />
      <GDot cx={138} cy={26} r={2.4} fill={GLASS_RUBY} />
      <GDot cx={156} cy={22} r={2.4} fill={GLASS_CREAM} />
      <GDot cx={174} cy={26} r={2.4} fill={GLASS_RUBY} />
      <GFigure x={148} y={102} s={1.0} fill={GLASS_SAPPHIRE} pose="stand" />
      <GFigure x={168} y={102} s={1.0} fill={GLASS_CREAM} pose="stand" />
      <GC cx={130} cy={54} r={8} fill={GLASS_AMBER_PALE} />
      <GC cx={140} cy={54} r={8} fill={GLASS_AMBER} />
    </GlassSceneRoot>
  );
}

export function GlassMemorialScene() {
  return (
    <GlassSceneRoot bg="#1D2A4A">
      <GLine x1={120} y1={104} x2={196} y2={104} c={GLASS_LEAD} w={2.4} />
      <GC cx={156} cy={54} r={27} fill={GLASS_EMERALD} />
      <GC cx={156} cy={54} r={19} fill="#1D2A4A" />
      <GDot cx={156} cy={28} r={2.8} fill={GLASS_RUBY} />
      <GDot cx={134} cy={40} r={2.8} fill={GLASS_CREAM} />
      <GDot cx={178} cy={40} r={2.8} fill={GLASS_RUBY} />
      <GDot cx={132} cy={64} r={2.8} fill={GLASS_CREAM} />
      <GDot cx={180} cy={64} r={2.8} fill={GLASS_CREAM} />
      <GDot cx={156} cy={80} r={2.8} fill={GLASS_RUBY} />
      <GPoly points="146,84 156,96 166,84 160,82 156,90 152,82" fill={GLASS_VIOLET_LT} />
      <GR x={118} y={76} width={10} height={24} rx={1} fill={GLASS_CREAM} />
      <GPoly points="123,76 119,68 123,60 127,68" fill={GLASS_AMBER_PALE} />
      <GLine x1={124} y1={100} x2={188} y2={100} c={GLASS_LEAD} w={1.6} />
    </GlassSceneRoot>
  );
}

export function GlassMeetingScene() {
  return (
    <GlassSceneRoot bg="#1D2A4A">
      <GLine x1={120} y1={104} x2={196} y2={104} c={GLASS_LEAD} w={2.4} />
      <GR x={116} y={68} width={80} height={10} rx={2} fill="#8A5A2B" />
      <GLine x1={124} y1={78} x2={124} y2={100} c={GLASS_LEAD} w={2.4} />
      <GLine x1={188} y1={78} x2={188} y2={100} c={GLASS_LEAD} w={2.4} />
      <GFigure x={132} y={68} s={0.8} fill={GLASS_SAPPHIRE} pose="sit" />
      <GFigure x={156} y={68} s={0.8} fill={GLASS_RUBY} pose="sit" />
      <GFigure x={178} y={68} s={0.8} fill={GLASS_EMERALD} pose="sit" />
      <GC cx={188} cy={24} r={11} fill={GLASS_CREAM} />
      <GLine x1={188} y1={24} x2={188} y2={17} c={GLASS_LEAD} w={1.8} />
      <GLine x1={188} y1={24} x2={193} y2={27} c={GLASS_LEAD} w={1.8} />
      <GR x={140} y={52} width={22} height={12} rx={1} fill={GLASS_SAPPHIRE_LT} />
      <GP d="M 122 24 C 122 16 130 12 136 15 L 134 24 L 124 28 Z" fill={GLASS_AMBER_PALE} />
    </GlassSceneRoot>
  );
}

export function GlassWorkoutScene() {
  return (
    <GlassSceneRoot bg="#33161D">
      <GLine x1={120} y1={104} x2={196} y2={104} c={GLASS_LEAD} w={2.4} />
      <GLine x1={118} y1={92} x2={196} y2={92} c={GLASS_LEAD} w={1.8} />
      <GLine x1={118} y1={52} x2={196} y2={52} c={GLASS_LEAD} w={3} />
      <GR x={118} y={38} width={10} height={28} rx={1} fill={GLASS_SAPPHIRE} />
      <GR x={130} y={43} width={7} height={18} rx={1} fill={GLASS_VIOLET} />
      <GR x={186} y={38} width={10} height={28} rx={1} fill={GLASS_SAPPHIRE} />
      <GR x={177} y={43} width={7} height={18} rx={1} fill={GLASS_VIOLET} />
      <GFigure x={156} y={90} s={0.9} fill={GLASS_RUBY} pose="armsUp" />
      <GC cx={128} cy={80} r={9} fill={GLASS_AMBER} />
      <GLine x1={122} y1={74} x2={134} y2={74} c={GLASS_LEAD} w={1.6} />
      <GPoly points="176,84 184,76 192,84 188,88 180,88" fill={GLASS_EMERALD} />
      <GDot cx={120} cy={28} r={2.2} fill={GLASS_AMBER_PALE} />
    </GlassSceneRoot>
  );
}

export function GlassBasketballScene() {
  return (
    <GlassSceneRoot bg="#2E2008">
      <GLine x1={120} y1={104} x2={196} y2={104} c={GLASS_LEAD} w={2.4} />
      <GLine x1={120} y1={88} x2={196} y2={88} c={GLASS_LEAD} w={1.6} />
      <GR x={142} y={18} width={48} height={34} rx={2} fill={GLASS_CREAM} />
      <GR x={156} y={28} width={20} height={16} rx={1} fill={GLASS_RUBY} />
      <GP d="M 156 52 C 160 58 172 58 176 52 L 174 58 L 158 58 Z" fill={GLASS_AMBER} />
      <GLine x1={160} y1={55} x2={160} y2={64} c={GLASS_LEAD} w={1.6} />
      <GLine x1={166} y1={56} x2={166} y2={65} c={GLASS_LEAD} w={1.6} />
      <GLine x1={172} y1={55} x2={172} y2={64} c={GLASS_LEAD} w={1.6} />
      <GC cx={132} cy={62} r={11} fill="#D96C33" />
      <GLine x1={121} y1={62} x2={143} y2={62} c={GLASS_LEAD} w={1.6} />
      <GP d="M 126 53 C 130 60 130 64 126 71" fill="#D96C33" />
      <GP d="M 138 53 C 134 60 134 64 138 71" fill="#D96C33" />
    </GlassSceneRoot>
  );
}

export function GlassSoccerScene() {
  return (
    <GlassSceneRoot bg="#14291F">
      <GLine x1={120} y1={104} x2={196} y2={104} c={GLASS_LEAD} w={2.4} />
      <GR x={146} y={30} width={50} height={74} rx={1} fill={GLASS_CREAM_LT} />
      <GLine x1={146} y1={52} x2={196} y2={52} c={GLASS_LEAD} w={1.4} />
      <GLine x1={158} y1={30} x2={158} y2={104} c={GLASS_LEAD} w={1.4} />
      <GLine x1={171} y1={30} x2={171} y2={104} c={GLASS_LEAD} w={1.4} />
      <GLine x1={183} y1={30} x2={183} y2={104} c={GLASS_LEAD} w={1.4} />
      <GC cx={130} cy={90} r={11} fill={GLASS_CREAM} />
      <GPoly points="130,84 135,88 133,94 127,94 125,88" fill={GLASS_LEAD} />
      <GLine x1={130} y1={79} x2={130} y2={84} c={GLASS_LEAD} w={1.6} />
      <GLine x1={141} y1={90} x2={135} y2={88} c={GLASS_LEAD} w={1.6} />
      <GLine x1={119} y1={90} x2={125} y2={88} c={GLASS_LEAD} w={1.6} />
    </GlassSceneRoot>
  );
}

export function GlassGameScene() {
  return (
    <GlassSceneRoot bg="#241A38">
      <GLine x1={120} y1={104} x2={196} y2={104} c={GLASS_LEAD} w={2.4} />
      <GR x={118} y={22} width={76} height={44} rx={3} fill={GLASS_SAPPHIRE} />
      <GPoly points="128,56 140,44 148,50 160,34 170,44 180,38 184,56" fill={GLASS_EMERALD} />
      <GDot cx={132} cy={32} r={2.4} fill={GLASS_AMBER_PALE} />
      <GDot cx={182} cy={30} r={2.2} fill={GLASS_RUBY} />
      <GP d="M 116 84 C 116 74 126 70 134 74 L 142 78 L 170 78 L 178 74 C 186 70 194 74 194 84 C 194 92 186 96 178 92 L 170 86 L 142 86 L 134 92 C 126 96 116 92 116 84 Z" fill={GLASS_VIOLET} />
      <GLine x1={130} y1={80} x2={130} y2={88} c={GLASS_CREAM} w={2.2} />
      <GLine x1={126} y1={84} x2={134} y2={84} c={GLASS_CREAM} w={2.2} />
      <GDot cx={176} cy={81} r={2.6} fill={GLASS_RUBY} />
      <GDot cx={184} cy={85} r={2.6} fill={GLASS_AMBER} />
      <GDot cx={168} cy={85} r={2.6} fill={GLASS_EMERALD} />
    </GlassSceneRoot>
  );
}

export function GlassScaryMovieScene() {
  return (
    <GlassSceneRoot bg="#1B1726">
      <GLine x1={120} y1={104} x2={196} y2={104} c={GLASS_LEAD} w={2.4} />
      <GC cx={186} cy={20} r={9} fill={GLASS_CREAM_LT} />
      <GP d="M 130 100 L 130 52 L 154 34 L 178 52 L 178 100 Z" fill={GLASS_VIOLET} />
      <GPoly points="122,54 154,28 186,54" fill={GLASS_LEAD} />
      <GR x={146} y={72} width={16} height={28} rx={1} fill="#3A2410" />
      <GDot cx={159} cy={86} r={1.8} fill={GLASS_AMBER} />
      <GR x={136} y={58} width={10} height={12} rx={1} fill={GLASS_AMBER_PALE} />
      <GLine x1={141} y1={58} x2={141} y2={70} c={GLASS_LEAD} w={1.4} />
      <GP d="M 118 88 C 118 76 126 70 132 74 C 138 70 146 76 146 88 L 142 84 138 89 134 84 130 89 126 84 122 88 Z" fill={GLASS_CREAM_LT} />
      <GDot cx={128} cy={79} r={1.8} fill={GLASS_LEAD} />
      <GDot cx={136} cy={79} r={1.8} fill={GLASS_LEAD} />
    </GlassSceneRoot>
  );
}

export function GlassChristmasMovieScene() {
  return (
    <GlassSceneRoot bg="#33161D">
      <GLine x1={120} y1={104} x2={196} y2={104} c={GLASS_LEAD} w={2.4} />
      <GR x={114} y={24} width={86} height={56} rx={3} fill={GLASS_SAPPHIRE} />
      <GPoly points="156,36 148,50 164,50" fill={GLASS_EMERALD} />
      <GPoly points="156,46 146,62 166,62" fill={GLASS_EMERALD} />
      <GLine x1={156} y1={62} x2={156} y2={68} c={GLASS_LEAD} w={2} />
      <GDot cx={126} cy={34} r={2} fill={GLASS_CREAM} />
      <GDot cx={186} cy={36} r={2} fill={GLASS_CREAM} />
      <GDot cx={178} cy={66} r={2} fill={GLASS_RUBY} />
      <GDot cx={134} cy={66} r={2} fill={GLASS_AMBER} />
      <GLine x1={136} y1={80} x2={130} y2={92} c={GLASS_LEAD} w={2.4} />
      <GLine x1={176} y1={80} x2={182} y2={92} c={GLASS_LEAD} w={2.4} />
      <GPoly points="120,100 124,82 138,82 142,100" fill={GLASS_RUBY} />
      <GP d="M 122 82 C 124 74 130 78 132 72 C 136 76 140 72 142 78 L 140 82 Z" fill={GLASS_CREAM} />
    </GlassSceneRoot>
  );
}

export function GlassChristmasBreakfastScene() {
  return (
    <GlassSceneRoot bg="#2E2008">
      <GLine x1={120} y1={102} x2={196} y2={102} c={GLASS_LEAD} w={2.4} />
      <GC cx={186} cy={22} r={10} fill={GLASS_AMBER} />
      <GLine x1={172} y1={14} x2={175} y2={18} c={GLASS_AMBER} w={2.2} />
      <GLine x1={196} y1={12} x2={194} y2={17} c={GLASS_AMBER} w={2.2} />
      <GP d="M 120 88 C 138 82 174 82 192 88 C 174 96 138 96 120 88 Z" fill={GLASS_CREAM} />
      <GP d="M 128 78 C 142 72 170 72 184 78 C 170 84 142 84 128 78 Z" fill={GLASS_AMBER_LT} />
      <GP d="M 132 66 C 144 60 168 60 180 66 C 168 72 144 72 132 66 Z" fill={GLASS_AMBER_PALE} />
      <GP d="M 136 54 C 146 49 166 49 176 54 C 166 59 146 59 136 54 Z" fill={GLASS_AMBER_LT} />
      <GR x={146} y={40} width={20} height={9} rx={2} fill={GLASS_RUBY} />
      <GC cx={126} cy={66} r={10} fill={GLASS_CREAM} />
      <GC cx={126} cy={66} r={5} fill={GLASS_AMBER} />
      <GDot cx={156} cy={32} r={2.2} fill={GLASS_RUBY} />
    </GlassSceneRoot>
  );
}

export function GlassChristmasDinnerScene() {
  return (
    <GlassSceneRoot bg="#33161D">
      <GLine x1={120} y1={102} x2={196} y2={102} c={GLASS_LEAD} w={2.4} />
      <GP d="M 118 18 C 146 30 174 30 196 16 L 196 24 C 174 36 146 36 118 26 Z" fill={GLASS_EMERALD} />
      <GDot cx={136} cy={24} r={2.6} fill={GLASS_RUBY} />
      <GDot cx={158} cy={27} r={2.6} fill={GLASS_AMBER} />
      <GDot cx={180} cy={24} r={2.6} fill={GLASS_RUBY} />
      <GP d="M 116 90 C 136 84 176 84 196 90 C 176 98 136 98 116 90 Z" fill={GLASS_CREAM} />
      <GP d="M 130 84 C 134 66 146 58 156 58 C 166 58 178 66 182 84 C 164 89 148 89 130 84 Z" fill="#B06A2E" />
      <GLine x1={156} y1={60} x2={156} y2={86} c={GLASS_LEAD} w={1.6} />
      <GPoly points="138,64 132,56 140,54 142,62" fill={GLASS_CREAM_LT} />
      <GPoly points="174,64 180,56 172,54 170,62" fill={GLASS_CREAM_LT} />
      <GR x={118} y={62} width={7} height={22} rx={1} fill={GLASS_CREAM} />
      <GPoly points="121,62 118,54 121,46 124,54" fill={GLASS_AMBER_PALE} />
      <GR x={187} y={62} width={7} height={22} rx={1} fill={GLASS_CREAM} />
      <GPoly points="190,62 187,54 190,46 193,54" fill={GLASS_AMBER_PALE} />
    </GlassSceneRoot>
  );
}

export function GlassFullMoonScene() {
  return (
    <GlassSceneRoot bg="#0F1E3D" pane={false}>
      <GP d="M 8 104 C 50 94 120 98 196 103 L 200 110 L 0 110 Z" fill="#14291F" />
      <GC cx={156} cy={46} r={28} fill={GLASS_CREAM_LT} />
      <GC cx={144} cy={36} r={5} fill={GLASS_AMBER_PALE} />
      <GC cx={168} cy={54} r={7} fill={GLASS_AMBER_PALE} />
      <GC cx={150} cy={60} r={3.5} fill={GLASS_AMBER_PALE} />
      <GLine x1={132} y1={30} x2={180} y2={62} c={GLASS_LEAD} w={1.4} o={0.35} />
      <GDot cx={30} cy={20} r={2.2} fill={GLASS_CREAM} />
      <GDot cx={52} cy={38} r={1.8} fill={GLASS_CREAM} />
      <GDot cx={22} cy={52} r={1.8} fill={GLASS_SAPPHIRE_LT} />
      <GDot cx={84} cy={18} r={2} fill={GLASS_CREAM} />
      <GDot cx={188} cy={86} r={1.8} fill={GLASS_CREAM} />
      <GLine x1={60} y1={86} x2={104} y2={78} c={GLASS_LEAD} w={3} />
      <GC cx={82} cy={72} r={6} fill={GLASS_VIOLET} />
      <GPoly points="78,68 74,62 80,64" fill={GLASS_VIOLET} />
      <GPoly points="86,68 90,62 84,64" fill={GLASS_VIOLET} />
      <GDot cx={80} cy={72} r={1.4} fill={GLASS_AMBER} />
      <GDot cx={85} cy={72} r={1.4} fill={GLASS_AMBER} />
    </GlassSceneRoot>
  );
}

export function GlassPrayerScene() {
  return (
    <GlassSceneRoot bg="#241A38">
      <GLine x1={120} y1={104} x2={196} y2={104} c={GLASS_LEAD} w={2.4} />
      <GLine x1={156} y1={12} x2={156} y2={38} c={GLASS_AMBER} w={3.4} />
      <GLine x1={145} y1={21} x2={167} y2={21} c={GLASS_AMBER} w={3.4} />
      <GLine x1={134} y1={32} x2={144} y2={46} c={GLASS_AMBER_PALE} w={2} />
      <GLine x1={178} y1={32} x2={168} y2={46} c={GLASS_AMBER_PALE} w={2} />
      <GLine x1={156} y1={42} x2={156} y2={52} c={GLASS_AMBER_PALE} w={2} />
      <GFigure x={152} y={102} s={1.1} fill={GLASS_VIOLET_LT} pose="kneel" />
      <GR x={182} y={78} width={9} height={22} rx={1} fill={GLASS_CREAM} />
      <GPoly points="186,78 183,70 186,62 189,70" fill={GLASS_AMBER_PALE} />
      <GDot cx={124} cy={52} r={2} fill={GLASS_SAPPHIRE_LT} />
      <GDot cx={188} cy={44} r={2} fill={GLASS_SAPPHIRE_LT} />
    </GlassSceneRoot>
  );
}

export function GlassOutreachScene() {
  return (
    <GlassSceneRoot bg="#1D2A4A">
      <GLine x1={120} y1={104} x2={196} y2={104} c={GLASS_LEAD} w={2.4} />
      <GFigure x={128} y={102} s={1.0} fill={GLASS_SAPPHIRE} pose="stand" />
      <GFigure x={186} y={102} s={1.0} fill={GLASS_EMERALD} pose="stand" />
      <GR x={140} y={76} width={32} height={24} rx={2} fill="#8A5A2B" />
      <GLine x1={140} y1={84} x2={172} y2={84} c={GLASS_LEAD} w={1.8} />
      <GLine x1={156} y1={76} x2={156} y2={100} c={GLASS_LEAD} w={1.8} />
      <GP d="M 156 58 C 153 51 144 53 144 59 C 144 64 149 67 156 72 C 163 67 168 64 168 59 C 168 53 159 51 156 58 Z" fill={GLASS_RUBY} />
      <GC cx={190} cy={20} r={7} fill={GLASS_AMBER} />
    </GlassSceneRoot>
  );
}

export function GlassConcertScene() {
  return (
    <GlassSceneRoot bg="#241A38">
      <GLine x1={120} y1={104} x2={196} y2={104} c={GLASS_LEAD} w={2.4} />
      <GPoly points="124,12 140,58 128,58" fill={GLASS_AMBER_PALE} o={0.35} />
      <GPoly points="192,12 172,58 184,58" fill={GLASS_SAPPHIRE_LT} o={0.35} />
      <GR x={118} y={84} width={78} height={6} rx={1} fill={GLASS_VIOLET} />
      <GFigure x={150} y={84} s={1.05} fill={GLASS_RUBY} pose="armsUp" />
      <GP d="M 164 62 C 174 58 182 64 180 74 C 178 84 168 88 162 82 C 157 77 158 66 164 62 Z" fill="#8A5A2B" />
      <GC cx={168} cy={76} r={4} fill={GLASS_LEAD} />
      <GLine x1={176} y1={64} x2={184} y2={50} c="#8A5A2B" w={3} />
      <GDot cx={124} cy={96} r={2.8} fill={GLASS_VIOLET_LT} />
      <GDot cx={140} cy={98} r={2.8} fill={GLASS_VIOLET_LT} />
      <GDot cx={176} cy={98} r={2.8} fill={GLASS_VIOLET_LT} />
      <GDot cx={190} cy={96} r={2.8} fill={GLASS_VIOLET_LT} />
      <GDot cx={132} cy={28} r={2.4} fill={GLASS_AMBER_PALE} />
      <GLine x1={134} y1={28} x2={134} y2={18} c={GLASS_AMBER_PALE} w={1.8} />
    </GlassSceneRoot>
  );
}

export function GlassHotelScene() {
  return (
    <GlassSceneRoot bg="#1D2A4A">
      <GLine x1={120} y1={104} x2={196} y2={104} c={GLASS_LEAD} w={2.4} />
      <GR x={128} y={14} width={56} height={88} rx={2} fill={GLASS_VIOLET} />
      <GR x={138} y={24} width={10} height={12} rx={1} fill={GLASS_AMBER_PALE} />
      <GR x={164} y={24} width={10} height={12} rx={1} fill={GLASS_SAPPHIRE_LT} />
      <GR x={138} y={44} width={10} height={12} rx={1} fill={GLASS_SAPPHIRE_LT} />
      <GR x={164} y={44} width={10} height={12} rx={1} fill={GLASS_AMBER_PALE} />
      <GR x={138} y={64} width={10} height={12} rx={1} fill={GLASS_AMBER} />
      <GR x={164} y={64} width={10} height={12} rx={1} fill={GLASS_SAPPHIRE_LT} />
      <GR x={149} y={84} width={14} height={18} rx={1} fill="#3A2410" />
      <GP d="M 122 102 L 128 88 L 184 88 L 190 102 Z" fill={GLASS_RUBY} />
      <GC cx={122} cy={22} r={8} fill={GLASS_AMBER_PALE} />
      <GDot cx={192} cy={30} r={2} fill={GLASS_CREAM} />
    </GlassSceneRoot>
  );
}

export function GlassShowerScene() {
  return (
    <GlassSceneRoot bg="#1D2A4A">
      <GLine x1={120} y1={104} x2={196} y2={104} c={GLASS_LEAD} w={2.4} />
      <GR x={130} y={28} width={6} height={72} rx={1} fill={GLASS_SAPPHIRE_LT} />
      <GP d="M 130 28 C 142 22 156 22 166 28 L 166 34 L 130 34 Z" fill={GLASS_SAPPHIRE} />
      <GPoly points="138,34 162,34 168,42 132,42" fill={GLASS_SAPPHIRE_LT} />
      <GLine x1={142} y1={50} x2={140} y2={62} c={GLASS_SAPPHIRE_LT} w={2} dash="3 4" />
      <GLine x1={150} y1={52} x2={150} y2={66} c={GLASS_SAPPHIRE_LT} w={2} dash="3 4" />
      <GLine x1={158} y1={50} x2={160} y2={62} c={GLASS_SAPPHIRE_LT} w={2} dash="3 4" />
      <GP d="M 120 84 C 120 96 132 102 152 102 C 172 102 184 96 184 84 L 178 84 C 176 92 168 96 152 96 C 136 96 128 92 126 84 Z" fill={GLASS_CREAM} />
      <GLine x1={126} y1={102} x2={124} y2={106} c={GLASS_LEAD} w={2.2} />
      <GLine x1={178} y1={102} x2={180} y2={106} c={GLASS_LEAD} w={2.2} />
      <GC cx={188} cy={62} r={5} fill={GLASS_SAPPHIRE_LT} />
      <GC cx={122} cy={56} r={4} fill={GLASS_SAPPHIRE_LT} />
    </GlassSceneRoot>
  );
}

export function GlassStudyScene() {
  return (
    <GlassSceneRoot bg="#241A38">
      <GLine x1={120} y1={104} x2={196} y2={104} c={GLASS_LEAD} w={2.4} />
      <GR x={114} y={84} width={80} height={6} rx={1} fill="#8A5A2B" />
      <GLine x1={120} y1={90} x2={120} y2={102} c={GLASS_LEAD} w={2.4} />
      <GLine x1={188} y1={90} x2={188} y2={102} c={GLASS_LEAD} w={2.4} />
      <GP d="M 152 62 C 144 56 134 54 126 57 L 126 80 C 134 77 144 79 152 84 C 160 79 170 77 178 80 L 178 57 C 170 54 160 56 152 62 Z" fill={GLASS_CREAM} />
      <GLine x1={152} y1={62} x2={152} y2={84} c={GLASS_LEAD} w={1.8} />
      <GLine x1={132} y1={64} x2={146} y2={63} c={GLASS_LEAD} w={1.4} />
      <GLine x1={158} y1={63} x2={172} y2={64} c={GLASS_LEAD} w={1.4} />
      <GLine x1={188} y1={84} x2={182} y2={56} c={GLASS_LEAD} w={2.6} />
      <GPoly points="170,56 194,56 188,42 176,42" fill={GLASS_AMBER} />
      <GDot cx={178} cy={32} r={2.2} fill={GLASS_AMBER_PALE} />
      <GDot cx={188} cy={28} r={2.2} fill={GLASS_AMBER_PALE} />
    </GlassSceneRoot>
  );
}

export function GlassGraduationScene() {
  return (
    <GlassSceneRoot bg="#1D2A4A">
      <GLine x1={120} y1={104} x2={196} y2={104} c={GLASS_LEAD} w={2.4} />
      <GPoly points="156,30 124,44 156,56 188,44" fill={GLASS_LEAD} />
      <GP d="M 136 48 L 136 62 C 136 70 176 70 176 62 L 176 48 C 164 54 148 54 136 48 Z" fill={GLASS_VIOLET} />
      <GLine x1={188} y1={44} x2={188} y2={62} c={GLASS_AMBER} w={2.6} />
      <GC cx={188} cy={66} r={3.5} fill={GLASS_AMBER} />
      <GPoly points="128,96 132,78 152,82 148,98" fill={GLASS_CREAM} />
      <GLine x1={132} y1={82} x2={148} y2={86} c={GLASS_RUBY} w={2.4} />
      <GC cx={138} cy={88} r={4} fill={GLASS_RUBY} />
      <GDot cx={122} cy={24} r={2.2} fill={GLASS_AMBER_PALE} />
      <GDot cx={192} cy={20} r={2.2} fill={GLASS_CREAM} />
      <GDot cx={126} cy={62} r={2.2} fill={GLASS_SAPPHIRE_LT} />
      <GDot cx={190} cy={78} r={2.2} fill={GLASS_AMBER_PALE} />
    </GlassSceneRoot>
  );
}

export function GlassVisitScene() {
  return (
    <GlassSceneRoot bg="#14291F">
      <GLine x1={120} y1={104} x2={196} y2={104} c={GLASS_LEAD} w={2.4} />
      <GR x={124} y={48} width={64} height={54} rx={2} fill={GLASS_SAPPHIRE} />
      <GPoly points="116,48 156,28 196,48" fill={GLASS_RUBY} />
      <GR x={148} y={74} width={16} height={28} rx={1} fill="#6B3F1D" />
      <GDot cx={161} cy={88} r={1.8} fill={GLASS_AMBER} />
      <GR x={132} y={58} width={12} height={12} rx={1} fill={GLASS_AMBER_PALE} />
      <GR x={170} y={58} width={12} height={12} rx={1} fill={GLASS_AMBER_PALE} />
      <GP d="M 156 16 C 153 10 146 12 146 17 C 146 21 150 24 156 28 C 162 24 166 21 166 17 C 166 12 159 10 156 16 Z" fill={GLASS_RUBY} />
      <GFigure x={120} y={102} s={0.85} fill={GLASS_EMERALD} pose="stand" />
    </GlassSceneRoot>
  );
}

export function GlassReachOutScene() {
  return (
    <GlassSceneRoot bg="#241A38">
      <GLine x1={120} y1={104} x2={196} y2={104} c={GLASS_LEAD} w={2.4} />
      <GR x={128} y={52} width={52} height={32} rx={2} fill={GLASS_CREAM} />
      <GPoly points="128,54 154,72 180,54 180,58 154,76 128,58" fill={GLASS_SAPPHIRE_LT} />
      <GP d="M 154 62 C 152 57 145 58 145 63 C 145 66 148 68 154 72 C 160 68 163 66 163 63 C 163 58 156 57 154 62 Z" fill={GLASS_RUBY} />
      <GP d="M 130 34 C 130 26 138 22 146 24 C 154 22 160 28 158 36 C 156 42 150 44 144 42 L 136 46 L 138 38 C 134 37 130 36 130 34 Z" fill={GLASS_VIOLET_LT} />
      <GDot cx={139} cy={33} r={1.8} fill={GLASS_CREAM} />
      <GDot cx={147} cy={33} r={1.8} fill={GLASS_CREAM} />
      <GDot cx={155} cy={33} r={1.8} fill={GLASS_CREAM} />
      <GFigure x={122} y={102} s={0.8} fill={GLASS_EMERALD} pose="stand" />
      <GFigure x={190} y={102} s={0.8} fill={GLASS_AMBER} pose="stand" />
    </GlassSceneRoot>
  );
}

export function GlassCleanScene() {
  return (
    <GlassSceneRoot bg="#1D2A4A">
      <GLine x1={120} y1={104} x2={196} y2={104} c={GLASS_LEAD} w={2.4} />
      <GP d="M 124 76 L 156 76 L 152 100 L 128 100 Z" fill={GLASS_SAPPHIRE} />
      <GP d="M 124 76 C 130 68 150 68 156 76 Z" fill={GLASS_SAPPHIRE_LT} />
      <GLine x1={174} y1={100} x2={182} y2={44} c={GLASS_LEAD} w={2.8} />
      <GPoly points="182,44 192,58 178,62 172,50" fill={GLASS_AMBER_LT} />
      <GLine x1={176} y1={60} x2={174} y2={68} c={GLASS_LEAD} w={1.6} />
      <GLine x1={182} y1={59} x2={182} y2={68} c={GLASS_LEAD} w={1.6} />
      <GLine x1={188} y1={57} x2={190} y2={66} c={GLASS_LEAD} w={1.6} />
      <GC cx={122} cy={56} r={7} fill={GLASS_SAPPHIRE_LT} />
      <GC cx={134} cy={44} r={5} fill={GLASS_SAPPHIRE_LT} />
      <GC cx={162} cy={30} r={4} fill={GLASS_CREAM} />
      <GDot cx={112} cy={30} r={2.4} fill={GLASS_AMBER_PALE} />
      <GDot cx={192} cy={28} r={2.2} fill={GLASS_AMBER_PALE} />
    </GlassSceneRoot>
  );
}

export function GlassWashCarScene() {
  return (
    <GlassSceneRoot bg="#1D2A4A">
      <GLine x1={120} y1={104} x2={196} y2={104} c={GLASS_LEAD} w={2.4} />
      <GP d="M 118 88 L 122 72 C 123 66 128 64 136 63 L 146 46 C 148 42 152 40 158 40 L 176 40 C 182 40 186 42 188 46 L 194 62 L 196 76 L 196 88 Z" fill={GLASS_RUBY} />
      <GR x={150} y={44} width={14} height={14} rx={1} fill={GLASS_SAPPHIRE_LT} />
      <GR x={168} y={44} width={12} height={14} rx={1} fill={GLASS_SAPPHIRE_LT} />
      <GLine x1={118} y1={88} x2={196} y2={88} c={GLASS_LEAD} w={2.2} />
      <GC cx={134} cy={90} r={8} fill={GLASS_LEAD} />
      <GC cx={134} cy={90} r={3} fill={GLASS_CREAM} />
      <GC cx={182} cy={90} r={8} fill={GLASS_LEAD} />
      <GC cx={182} cy={90} r={3} fill={GLASS_CREAM} />
      <GC cx={140} cy={56} r={6} fill={GLASS_CREAM_LT} />
      <GC cx={176} cy={56} r={5} fill={GLASS_CREAM_LT} />
      <GC cx={158} cy={30} r={6} fill={GLASS_SAPPHIRE_LT} />
      <GC cx={190} cy={32} r={4} fill={GLASS_SAPPHIRE_LT} />
      <GDot cx={124} cy={34} r={2} fill={GLASS_CREAM} />
    </GlassSceneRoot>
  );
}

export function GlassGetGasScene() {
  return (
    <GlassSceneRoot bg="#33161D">
      <GLine x1={120} y1={104} x2={196} y2={104} c={GLASS_LEAD} w={2.4} />
      <GR x={132} y={22} width={44} height={80} rx={3} fill={GLASS_RUBY} />
      <GR x={140} y={30} width={28} height={18} rx={1} fill={GLASS_CREAM} />
      <GLine x1={144} y1={36} x2={164} y2={36} c={GLASS_LEAD} w={1.6} />
      <GLine x1={144} y1={42} x2={158} y2={42} c={GLASS_LEAD} w={1.6} />
      <GC cx={154} cy={66} r={10} fill={GLASS_AMBER} />
      <GP d="M 154 60 C 151 64 150 66 154 72 C 158 66 157 64 154 60 Z" fill={GLASS_RUBY} />
      <GLine x1={142} y1={88} x2={166} y2={88} c={GLASS_LEAD} w={1.8} />
      <GP d="M 176 44 C 188 48 192 58 190 72 L 186 88" fill={GLASS_LEAD} />
      <GR x={182} y={34} width={10} height={16} rx={2} fill={GLASS_SAPPHIRE} />
      <GDot cx={124} cy={44} r={3} fill={GLASS_AMBER_PALE} />
    </GlassSceneRoot>
  );
}

export function GlassGroceryScene() {
  return (
    <GlassSceneRoot bg="#14291F">
      <GLine x1={120} y1={104} x2={196} y2={104} c={GLASS_LEAD} w={2.4} />
      <GP d="M 118 36 L 196 36 L 190 66 L 124 66 Z" fill={GLASS_SAPPHIRE} />
      <GLine x1={134} y1={36} x2={132} y2={66} c={GLASS_LEAD} w={1.6} />
      <GLine x1={157} y1={36} x2={157} y2={66} c={GLASS_LEAD} w={1.6} />
      <GLine x1={180} y1={36} x2={182} y2={66} c={GLASS_LEAD} w={1.6} />
      <GP d="M 112 52 L 126 52 L 132 78 L 184 78 L 190 58" fill={GLASS_AMBER} />
      <GLine x1={132} y1={64} x2={186} y2={64} c={GLASS_LEAD} w={1.6} />
      <GC cx={138} cy={90} r={5} fill={GLASS_LEAD} />
      <GC cx={178} cy={90} r={5} fill={GLASS_LEAD} />
      <GR x={140} y={36} width={10} height={16} rx={1} fill={GLASS_EMERALD} />
      <GC cx={164} cy={44} r={7} fill={GLASS_RUBY} />
      <GLine x1={164} y1={37} x2={166} y2={32} c={GLASS_EMERALD} w={2.2} />
      <GR x={176} y={40} width={10} height={12} rx={1} fill={GLASS_CREAM} />
    </GlassSceneRoot>
  );
}

export function GlassNewYearScene() {
  return (
    <GlassSceneRoot bg="#1D2A4A">
      <GR x={120} y={78} width={18} height={26} rx={1} fill={GLASS_VIOLET} />
      <GR x={142} y={68} width={20} height={36} rx={1} fill={GLASS_SAPPHIRE} />
      <GR x={166} y={82} width={16} height={22} rx={1} fill={GLASS_VIOLET} />
      <GR x={186} y={72} width={14} height={32} rx={1} fill={GLASS_SAPPHIRE} />
      <GDot cx={128} cy={88} r={1.8} fill={GLASS_AMBER_PALE} />
      <GDot cx={152} cy={80} r={1.8} fill={GLASS_AMBER_PALE} />
      <GDot cx={174} cy={90} r={1.8} fill={GLASS_AMBER_PALE} />
      <GDot cx={140} cy={34} r={2.6} fill={GLASS_RUBY} />
      <GLine x1={140} y1={20} x2={140} y2={48} c={GLASS_RUBY} w={2} />
      <GLine x1={126} y1={34} x2={154} y2={34} c={GLASS_RUBY} w={2} />
      <GLine x1={130} y1={24} x2={150} y2={44} c={GLASS_AMBER_PALE} w={1.6} />
      <GLine x1={150} y1={24} x2={130} y2={44} c={GLASS_AMBER_PALE} w={1.6} />
      <GDot cx={176} cy={24} r={2.4} fill={GLASS_AMBER} />
      <GLine x1={176} y1={12} x2={176} y2={36} c={GLASS_AMBER} w={1.8} />
      <GLine x1={164} y1={24} x2={188} y2={24} c={GLASS_AMBER} w={1.8} />
      <GDot cx={158} cy={52} r={2} fill={GLASS_EMERALD} />
      <GLine x1={158} y1={42} x2={158} y2={62} c={GLASS_EMERALD} w={1.6} />
      <GLine x1={148} y1={52} x2={168} y2={52} c={GLASS_EMERALD} w={1.6} />
    </GlassSceneRoot>
  );
}

export function GlassValentinesScene() {
  return (
    <GlassSceneRoot bg="#33161D">
      <GLine x1={120} y1={104} x2={196} y2={104} c={GLASS_LEAD} w={2.4} />
      <GP d="M 156 88 C 136 72 126 58 126 44 C 126 32 136 26 146 28 C 152 29 155 33 156 38 C 157 33 160 29 166 28 C 176 26 186 32 186 44 C 186 58 176 72 156 88 Z" fill={GLASS_RUBY} />
      <GLine x1={156} y1={38} x2={156} y2={82} c={GLASS_LEAD} w={1.6} />
      <GP d="M 140 44 C 138 38 142 34 146 36" fill={GLASS_RUBY} />
      <GP d="M 120 52 C 118 47 113 48 113 52 C 113 56 116 58 120 61 C 124 58 127 56 127 52 C 127 48 122 47 120 52 Z" fill="#E88AA0" />
      <GP d="M 190 38 C 188 34 184 35 184 38 C 184 41 186 43 190 45 C 194 43 196 41 196 38 C 196 35 192 34 190 38 Z" fill="#E88AA0" />
      <GR x={130} y={92} width={52} height={10} rx={1} fill={GLASS_VIOLET} />
      <GLine x1={156} y1={92} x2={156} y2={102} c={GLASS_AMBER} w={2.2} />
      <GDot cx={124} cy={84} r={2} fill={GLASS_AMBER_PALE} />
      <GDot cx={188} cy={72} r={2} fill={GLASS_AMBER_PALE} />
    </GlassSceneRoot>
  );
}

export function GlassHalloweenScene() {
  return (
    <GlassSceneRoot bg="#241A38">
      <GLine x1={120} y1={104} x2={196} y2={104} c={GLASS_LEAD} w={2.4} />
      <GC cx={158} cy={72} r={26} fill="#D96C33" />
      <GP d="M 146 50 C 144 66 144 80 146 94" fill="#D96C33" />
      <GP d="M 170 50 C 172 66 172 80 170 94" fill="#D96C33" />
      <GLine x1={146} y1={50} x2={146} y2={94} c={GLASS_LEAD} w={1.6} />
      <GLine x1={170} y1={50} x2={170} y2={94} c={GLASS_LEAD} w={1.6} />
      <GR x={152} y={38} width={12} height={10} rx={2} fill={GLASS_EMERALD} />
      <GPoly points="144,66 150,66 147,72" fill={GLASS_LEAD} />
      <GPoly points="166,66 172,66 169,72" fill={GLASS_LEAD} />
      <GP d="M 142 82 L 148 78 154 83 160 78 166 83 172 78 174 82 C 164 88 152 88 142 82 Z" fill={GLASS_LEAD} />
      <GP d="M 122 22 C 118 16 124 12 128 16 C 132 12 138 16 134 22 C 130 19 126 19 122 22 Z" fill={GLASS_LEAD} />
      <GC cx={188} cy={20} r={8} fill={GLASS_CREAM_LT} />
      <GPoly points="124,96 128,84 140,84 144,96" fill={GLASS_VIOLET} />
      <GDot cx={134} cy={90} r={2} fill={GLASS_AMBER_PALE} />
    </GlassSceneRoot>
  );
}

export function GlassStPatricksScene() {
  return (
    <GlassSceneRoot bg="#14291F">
      <GLine x1={120} y1={104} x2={196} y2={104} c={GLASS_LEAD} w={2.4} />
      <GP d="M 118 84 A 44 44 0 0 1 196 84 L 188 84 A 36 36 0 0 0 126 84 Z" fill={GLASS_RUBY} />
      <GP d="M 126 84 A 36 36 0 0 1 188 84 L 182 84 A 30 30 0 0 0 132 84 Z" fill={GLASS_AMBER} />
      <GP d="M 132 84 A 30 30 0 0 1 182 84 L 176 84 A 24 24 0 0 0 138 84 Z" fill={GLASS_EMERALD} />
      <GP d="M 164 88 L 192 88 L 188 102 L 168 102 Z" fill={GLASS_LEAD} />
      <GR x={162} y={86} width={32} height={5} rx={1} fill={GLASS_AMBER} />
      <GDot cx={172} cy={82} r={2.6} fill={GLASS_AMBER_PALE} />
      <GDot cx={180} cy={80} r={2.6} fill={GLASS_AMBER} />
      <GDot cx={186} cy={83} r={2.4} fill={GLASS_AMBER_PALE} />
      <GC cx={130} cy={62} r={6} fill={GLASS_EMERALD} />
      <GC cx={140} cy={62} r={6} fill={GLASS_EMERALD} />
      <GC cx={130} cy={72} r={6} fill={GLASS_EMERALD} />
      <GC cx={140} cy={72} r={6} fill={GLASS_EMERALD} />
      <GLine x1={135} y1={74} x2={131} y2={90} c={GLASS_EMERALD} w={2.4} />
    </GlassSceneRoot>
  );
}
