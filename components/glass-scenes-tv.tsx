// v201 — the Stained Glass TV scenes: every show rebuilt as jewel-tone panes in dark lead, hero art held in the right zone clear of the cream label pane.

import {
  GlassSceneRoot,
  GP,
  GC,
  GR,
  GPoly,
  GLine,
  GDot,
  GFigure,
  GLASS_LEAD,
  GLASS_CREAM,
  GLASS_CREAM_LT,
  GLASS_AMBER,
  GLASS_AMBER_LT,
  GLASS_AMBER_PALE,
  GLASS_AMBER_INK,
  GLASS_SAPPHIRE,
  GLASS_SAPPHIRE_LT,
  GLASS_RUBY,
  GLASS_EMERALD,
  GLASS_VIOLET,
  GLASS_VIOLET_LT,
  GLASS_INK,
  GLASS_INK_SOFT,
  GLASS_PANEL,
  GLASS_BAR,
} from "@/components/glass-kit";

export function GlassTvSopranosScene() {
  return (
    <GlassSceneRoot bg="#1E2A3A">
      <GR x={122} y={14} width={70} height={40} fill={GLASS_CREAM} />
      <GPoly points="118,14 157,2 196,14" fill={GLASS_RUBY} />
      <GR x={132} y={24} width={12} height={12} fill={GLASS_AMBER} />
      <GR x={168} y={24} width={12} height={12} fill={GLASS_AMBER_LT} />
      <GR x={150} y={34} width={12} height={20} fill={GLASS_VIOLET} />
      <GR x={108} y={54} width={88} height={8} fill={GLASS_EMERALD} />
      <GP d="M 112 108 L 112 72 Q 112 62 124 62 L 184 62 Q 196 62 196 72 L 196 108 Q 196 112 188 112 L 120 112 Q 112 112 112 108 Z" fill={GLASS_SAPPHIRE} />
      <GP d="M 116 78 L 192 78" fill={GLASS_SAPPHIRE_LT} />
      <GLine x1={120} y1={92} x2={146} y2={92} c={GLASS_SAPPHIRE_LT} w={2} />
      <GLine x1={164} y1={100} x2={190} y2={100} c={GLASS_SAPPHIRE_LT} w={2} />
      <GP d="M 124 88 Q 124 80 134 80 L 142 80 Q 150 80 150 88 Q 150 93 142 93 L 132 93 Q 124 93 124 88 Z" fill={GLASS_CREAM_LT} />
      <GC cx={149} cy={77} r={5} fill={GLASS_CREAM_LT} />
      <GPoly points="154,75 162,78 154,81" fill={GLASS_AMBER} />
      <GP d="M 158 96 Q 158 89 167 89 L 174 89 Q 181 89 181 96 Q 181 100 174 100 L 165 100 Q 158 100 158 96 Z" fill={GLASS_CREAM} />
      <GC cx={180} cy={86} r={4.5} fill={GLASS_CREAM} />
      <GPoly points="184,84 191,87 184,89" fill={GLASS_AMBER_LT} />
      <GP d="M 132 102 Q 132 97 138 97 L 143 97 Q 148 97 148 102 Q 148 105 143 105 L 137 105 Q 132 105 132 102 Z" fill={GLASS_AMBER} />
      <GC cx={147} cy={95} r={3.4} fill={GLASS_AMBER_LT} />
      <GPoly points="150,94 155,96 150,98" fill={GLASS_RUBY} />
    </GlassSceneRoot>
  );
}

export function GlassTvGenericScene() {
  return (
    <GlassSceneRoot bg="#221D2E">
      <GLine x1={146} y1={30} x2={132} y2={10} c={GLASS_LEAD} w={2.2} />
      <GLine x1={152} y1={30} x2={170} y2={12} c={GLASS_LEAD} w={2.2} />
      <GDot cx={132} cy={10} r={2.2} fill={GLASS_AMBER} />
      <GDot cx={170} cy={12} r={2.2} fill={GLASS_AMBER} />
      <GR x={112} y={28} width={80} height={52} rx={5} fill={GLASS_PANEL} />
      <GR x={119} y={35} width={52} height={38} rx={3} fill={GLASS_SAPPHIRE} />
      <GP d="M 124 64 Q 136 50 148 56 Q 158 48 166 40 L 166 73 L 124 73 Z" fill={GLASS_SAPPHIRE_LT} />
      <GC cx={180} cy={44} r={3.6} fill={GLASS_RUBY} />
      <GC cx={180} cy={56} r={3.6} fill={GLASS_EMERALD} />
      <GLine x1={126} y1={80} x2={122} y2={92} c={GLASS_LEAD} w={2.4} />
      <GLine x1={178} y1={80} x2={182} y2={92} c={GLASS_LEAD} w={2.4} />
      <GP d="M 108 112 L 108 100 Q 108 94 116 94 L 120 94 Q 124 94 124 100 L 172 100 Q 172 94 176 94 L 180 94 Q 188 94 188 100 L 188 112 Z" fill={GLASS_VIOLET} />
      <GLine x1={124} y1={102} x2={172} y2={102} c={GLASS_LEAD} w={2} />
    </GlassSceneRoot>
  );
}

export function GlassTvDexterScene() {
  return (
    <GlassSceneRoot bg="#2A1218">
      <GR x={126} y={18} width={52} height={72} rx={4} fill={GLASS_CREAM} />
      <GR x={132} y={24} width={40} height={60} rx={2} fill={GLASS_CREAM_LT} />
      <GP d="M 152 34 Q 160 48 160 60 Q 160 72 152 72 Q 144 72 144 60 Q 144 48 152 34 Z" fill={GLASS_RUBY} />
      <GDot cx={152} cy={78} r={2.4} fill={GLASS_RUBY} />
      <GLine x1={116} y1={96} x2={188} y2={84} c={GLASS_SAPPHIRE_LT} w={2.6} />
      <GPoly points="182,80 192,82 186,90" fill={GLASS_SAPPHIRE_LT} />
      <GLine x1={122} y1={100} x2={172} y2={94} c={GLASS_LEAD} w={2} />
      <GC cx={118} cy={30} r={6} fill={GLASS_AMBER} />
    </GlassSceneRoot>
  );
}

export function GlassTvDexterNewBloodScene() {
  return (
    <GlassSceneRoot bg="#1E2A3A">
      <GC cx={180} cy={18} r={8} fill={GLASS_CREAM_LT} />
      <GDot cx={122} cy={16} r={1.8} fill={GLASS_CREAM} />
      <GDot cx={146} cy={30} r={1.8} fill={GLASS_CREAM} />
      <GP d="M 104 108 L 104 84 Q 150 76 196 84 L 196 108 Z" fill={GLASS_CREAM} />
      <GR x={126} y={48} width={52} height={32} fill="#5A3A2A" />
      <GPoly points="120,48 152,32 184,48" fill={GLASS_CREAM_LT} />
      <GR x={146} y={62} width={12} height={18} fill={GLASS_INK} />
      <GR x={132} y={56} width={9} height={9} fill={GLASS_AMBER} />
      <GPoly points="188,84 194,58 200,84" fill={GLASS_EMERALD} />
      <GP d="M 152 92 Q 158 102 158 106 Q 158 110 152 110 Q 146 110 146 106 Q 146 102 152 92 Z" fill={GLASS_RUBY} />
    </GlassSceneRoot>
  );
}

export function GlassTvDexterOriginalSinScene() {
  return (
    <GlassSceneRoot bg="#3A1E3A">
      <GC cx={164} cy={34} r={17} fill={GLASS_AMBER} />
      <GLine x1={147} y1={34} x2={181} y2={34} c={GLASS_LEAD} w={2} />
      <GLine x1={149} y1={42} x2={179} y2={42} c={GLASS_LEAD} w={2} />
      <GR x={108} y={56} width={14} height={26} fill={GLASS_SAPPHIRE} />
      <GR x={124} y={48} width={16} height={34} fill={GLASS_RUBY} />
      <GR x={172} y={52} width={14} height={30} fill={GLASS_VIOLET} />
      <GLine x1={100} y1={82} x2={196} y2={82} c={GLASS_LEAD} w={2.4} />
      <GP d="M 118 84 C 116 66 112 54 104 44" fill={GLASS_EMERALD} />
      <GPoly points="136,94 178,94 170,104 144,104" fill={GLASS_CREAM} />
      <GLine x1={157} y1={94} x2={157} y2={84} c={GLASS_LEAD} w={2} />
      <GPoly points="157,84 168,90 157,90" fill={GLASS_AMBER_PALE} />
      <GLine x1={120} y1={102} x2={146} y2={102} c={GLASS_SAPPHIRE_LT} w={2} />
    </GlassSceneRoot>
  );
}

export function GlassTvDexterResurrectionScene() {
  return (
    <GlassSceneRoot bg="#1B1726">
      <GP d="M 122 62 Q 122 38 152 38 Q 182 38 182 62 Z" fill={GLASS_RUBY} />
      <GLine x1={152} y1={40} x2={152} y2={20} c={GLASS_AMBER} w={2.2} />
      <GLine x1={132} y1={46} x2={120} y2={34} c={GLASS_AMBER} w={2.2} />
      <GLine x1={172} y1={46} x2={184} y2={34} c={GLASS_AMBER} w={2.2} />
      <GR x={108} y={62} width={88} height={46} fill={GLASS_SAPPHIRE} />
      <GP d="M 108 62 L 196 62 L 196 76 L 108 76 Z" fill={GLASS_SAPPHIRE_LT} />
      <GLine x1={124} y1={84} x2={146} y2={88} c={GLASS_CREAM_LT} w={2} />
      <GLine x1={146} y1={88} x2={138} y2={96} c={GLASS_CREAM_LT} w={2} />
      <GLine x1={160} y1={82} x2={178} y2={92} c={GLASS_CREAM_LT} w={2} />
      <GC cx={152} cy={104} r={3} fill={GLASS_RUBY} />
    </GlassSceneRoot>
  );
}

export function GlassTvWalkingDeadScene() {
  return (
    <GlassSceneRoot bg="#2B2438">
      <GR x={112} y={52} width={62} height={20} rx={6} fill={GLASS_RUBY} />
      <GP d="M 122 52 Q 128 40 144 40 Q 158 40 164 52 Z" fill={GLASS_SAPPHIRE} />
      <GC cx={122} cy={74} r={7} fill={GLASS_INK} />
      <GC cx={162} cy={74} r={7} fill={GLASS_INK} />
      <GLine x1={108} y1={86} x2={196} y2={86} c={GLASS_LEAD} w={2.2} />
      <GLine x1={116} y1={62} x2={196} y2={62} c={GLASS_AMBER_INK} w={2} />
      <GLine x1={186} y1={84} x2={186} y2={34} c={GLASS_LEAD} w={2.6} />
      <GLine x1={186} y1={48} x2={170} y2={38} c={GLASS_LEAD} w={2.2} />
      <GLine x1={186} y1={40} x2={196} y2={28} c={GLASS_LEAD} w={2.2} />
      <GP d="M 118 96 L 138 88 L 150 98 L 168 90 L 172 100 L 118 100 Z" fill={GLASS_PANEL} />
    </GlassSceneRoot>
  );
}

export function GlassTvChosenScene() {
  return (
    <GlassSceneRoot bg="#1E3048">
      <GC cx={176} cy={24} r={10} fill={GLASS_AMBER_PALE} />
      <GP d="M 108 84 L 192 84 L 180 100 L 120 100 Z" fill="#6B4A2A" />
      <GLine x1={150} y1={84} x2={150} y2={38} c={GLASS_LEAD} w={2.4} />
      <GPoly points="150,40 150,68 176,68" fill={GLASS_CREAM} />
      <GP d="M 122 58 Q 132 50 142 58 Q 132 66 122 58 Z" fill={GLASS_SAPPHIRE_LT} />
      <GPoly points="142,58 150,52 150,64" fill={GLASS_SAPPHIRE} />
      <GDot cx={128} cy={57} r={1.6} fill={GLASS_INK} />
      <GP d="M 158 74 Q 166 68 174 74 Q 166 80 158 74 Z" fill={GLASS_AMBER} />
      <GLine x1={104} y1={106} x2={132} y2={106} c={GLASS_SAPPHIRE_LT} w={2.2} />
      <GLine x1={146} y1={110} x2={186} y2={110} c={GLASS_SAPPHIRE_LT} w={2.2} />
      <GLine x1={108} y1={92} x2={196} y2={92} c={GLASS_SAPPHIRE_LT} w={1.6} />
    </GlassSceneRoot>
  );
}

export function GlassTvBearScene() {
  return (
    <GlassSceneRoot bg="#241D33">
      <GLine x1={110} y1={18} x2={194} y2={18} c={GLASS_LEAD} w={2.4} />
      <GC cx={122} cy={34} r={8} fill={GLASS_SAPPHIRE} />
      <GC cx={146} cy={32} r={6.5} fill={GLASS_RUBY} />
      <GR x={118} y={82} width={72} height={8} fill={GLASS_INK_SOFT} />
      <GP d="M 128 82 Q 128 62 154 62 Q 180 62 180 82 Z" fill={GLASS_SAPPHIRE_LT} />
      <GC cx={154} cy={60} r={4} fill={GLASS_CREAM} />
      <GLine x1={128} y1={82} x2={180} y2={82} c={GLASS_LEAD} w={2.4} />
      <GPoly points="146,96 152,86 158,96" fill={GLASS_AMBER} />
      <GPoly points="160,98 166,88 172,98" fill={GLASS_RUBY} />
      <GPoly points="134,98 139,90 144,98" fill={GLASS_AMBER_LT} />
      <GR x={118} y={100} width={72} height={10} fill={GLASS_PANEL} />
    </GlassSceneRoot>
  );
}

export function GlassTvSkinsScene() {
  return (
    <GlassSceneRoot bg="#1E2A3A">
      <GR x={116} y={18} width={76} height={84} rx={4} fill={GLASS_CREAM} />
      <GP d="M 116 18 L 192 18 L 192 42 L 116 42 Z" fill={GLASS_SAPPHIRE} />
      <GP d="M 116 78 L 192 78 L 192 102 L 116 102 Z" fill={GLASS_SAPPHIRE} />
      <GLine x1={116} y1={60} x2={192} y2={60} c={GLASS_RUBY} w={10} />
      <GLine x1={154} y1={18} x2={154} y2={102} c={GLASS_RUBY} w={10} />
      <GLine x1={116} y1={18} x2={192} y2={102} c={GLASS_RUBY} w={3} />
      <GLine x1={192} y1={18} x2={116} y2={102} c={GLASS_RUBY} w={3} />
      <GLine x1={116} y1={60} x2={192} y2={60} c={GLASS_LEAD} w={1.4} />
      <GLine x1={154} y1={18} x2={154} y2={102} c={GLASS_LEAD} w={1.4} />
    </GlassSceneRoot>
  );
}

export function GlassTvGotScene() {
  return (
    <GlassSceneRoot bg="#141E33">
      <GDot cx={124} cy={16} r={2} fill={GLASS_CREAM} />
      <GDot cx={154} cy={10} r={2} fill={GLASS_CREAM} />
      <GDot cx={184} cy={22} r={2} fill={GLASS_CREAM} />
      <GC cx={178} cy={34} r={9} fill={GLASS_SAPPHIRE_LT} />
      <GP d="M 112 78 Q 130 40 168 34 Q 158 52 164 62 Q 146 58 138 70 Q 126 84 112 78 Z" fill={GLASS_EMERALD} />
      <GLine x1={130} y1={58} x2={156} y2={48} c={GLASS_LEAD} w={2} />
      <GLine x1={136} y1={68} x2={158} y2={58} c={GLASS_LEAD} w={2} />
      <GR x={124} y={84} width={56} height={24} fill={GLASS_PANEL} />
      <GPoly points="120,84 138,70 156,84" fill={GLASS_INK} />
      <GPoly points="148,84 166,70 184,84" fill={GLASS_INK} />
      <GDot cx={140} cy={94} r={2.2} fill={GLASS_AMBER} />
      <GDot cx={164} cy={94} r={2.2} fill={GLASS_AMBER} />
    </GlassSceneRoot>
  );
}

export function GlassTvDbzScene() {
  return (
    <GlassSceneRoot bg="#2E1E3A">
      <GC cx={158} cy={50} r={27} fill={GLASS_AMBER} />
      <GC cx={158} cy={50} r={20} fill={GLASS_AMBER_LT} />
      <GDot cx={150} cy={42} r={2.8} fill={GLASS_RUBY} />
      <GDot cx={166} cy={42} r={2.8} fill={GLASS_RUBY} />
      <GDot cx={150} cy={58} r={2.8} fill={GLASS_RUBY} />
      <GDot cx={166} cy={58} r={2.8} fill={GLASS_RUBY} />
      <GPoly points="108,82 112,58 116,72 122,52 127,70 134,56 136,82" fill={GLASS_INK} />
      <GFigure x={122} y={106} s={0.72} fill={GLASS_SAPPHIRE} />
      <GPoly points="182,92 190,84 194,94 186,100" fill={GLASS_VIOLET} />
      <GLine x1={100} y1={108} x2={196} y2={108} c={GLASS_LEAD} w={2.2} />
    </GlassSceneRoot>
  );
}

export function GlassTvSoaScene() {
  return (
    <GlassSceneRoot bg="#3A2418">
      <GC cx={180} cy={28} r={12} fill={GLASS_AMBER} />
      <GC cx={120} cy={88} r={13} fill={GLASS_INK} />
      <GC cx={176} cy={88} r={13} fill={GLASS_INK} />
      <GC cx={120} cy={88} r={4} fill={GLASS_SAPPHIRE_LT} />
      <GC cx={176} cy={88} r={4} fill={GLASS_SAPPHIRE_LT} />
      <GP d="M 120 88 L 142 62 L 164 62 L 176 88 L 164 88 L 156 72 L 132 72 L 128 88 Z" fill={GLASS_RUBY} />
      <GLine x1={142} y1={62} x2={132} y2={50} c={GLASS_LEAD} w={2.4} />
      <GLine x1={164} y1={62} x2={174} y2={48} c={GLASS_LEAD} w={2.4} />
      <GR x={130} y={54} width={18} height={6} rx={3} fill={GLASS_INK} />
      <GLine x1={100} y1={102} x2={196} y2={102} c={GLASS_LEAD} w={2.2} />
    </GlassSceneRoot>
  );
}

export function GlassTvReacherScene() {
  return (
    <GlassSceneRoot bg="#2B2438">
      <GC cx={118} cy={22} r={8} fill={GLASS_AMBER_PALE} />
      <GR x={156} y={48} width={38} height={46} fill={GLASS_PANEL} />
      <GPoly points="152,48 198,48 190,60 160,60" fill={GLASS_RUBY} />
      <GR x={168} y={72} width={10} height={22} fill={GLASS_INK} />
      <GFigure x={134} y={102} s={1.15} fill={GLASS_SAPPHIRE} />
      <GR x={146} y={76} width={14} height={12} rx={2} fill={GLASS_EMERALD} />
      <GLine x1={100} y1={102} x2={196} y2={102} c={GLASS_LEAD} w={2.2} />
    </GlassSceneRoot>
  );
}

export function GlassTvFromScene() {
  return (
    <GlassSceneRoot bg="#1B1726">
      <GC cx={184} cy={16} r={8} fill={GLASS_CREAM_LT} />
      <GR x={110} y={56} width={30} height={40} fill={GLASS_VIOLET} />
      <GPoly points="108,56 125,44 142,56" fill={GLASS_INK} />
      <GR x={119} y={66} width={8} height={8} fill={GLASS_AMBER} />
      <GR x={146} y={64} width={24} height={32} fill={GLASS_PANEL} />
      <GLine x1={182} y1={100} x2={182} y2={40} c={GLASS_LEAD} w={2.6} />
      <GLine x1={182} y1={56} x2={164} y2={48} c={GLASS_LEAD} w={2.2} />
      <GP d="M 158 46 Q 162 40 166 44 L 171 42 L 167 48 Q 162 50 158 46 Z" fill={GLASS_INK} />
      <GC cx={122} cy={60} r={4} fill={GLASS_AMBER_PALE} />
      <GLine x1={100} y1={100} x2={196} y2={100} c={GLASS_LEAD} w={2} />
    </GlassSceneRoot>
  );
}

export function GlassTvDaredevilScene() {
  return (
    <GlassSceneRoot bg="#2A1218">
      <GR x={108} y={36} width={20} height={62} fill={GLASS_PANEL} />
      <GR x={166} y={28} width={24} height={70} fill={GLASS_PANEL} />
      <GDot cx={174} cy={44} r={2} fill={GLASS_AMBER} />
      <GDot cx={116} cy={54} r={2} fill={GLASS_AMBER} />
      <GPoly points="128,32 152,32 148,50 132,50" fill={GLASS_VIOLET} />
      <GLine x1={108} y1={98} x2={196} y2={98} c={GLASS_LEAD} w={2.6} />
      <GFigure x={136} y={98} s={0.9} fill={GLASS_RUBY} />
      <GLine x1={144} y1={76} x2={158} y2={68} c={GLASS_CREAM} w={2.2} />
    </GlassSceneRoot>
  );
}

export function GlassTvPluribusScene() {
  return (
    <GlassSceneRoot bg="#221D2E">
      <GR x={148} y={30} width={42} height={30} fill={GLASS_PANEL} />
      <GPoly points="146,30 169,18 192,30" fill={GLASS_INK} />
      <GFigure x={152} y={104} s={0.95} fill={GLASS_CREAM} />
      <GDot cx={124} cy={36} r={2.6} fill={GLASS_AMBER} />
      <GDot cx={138} cy={26} r={2.6} fill={GLASS_RUBY} />
      <GDot cx={152} cy={20} r={2.6} fill={GLASS_SAPPHIRE_LT} />
      <GDot cx={166} cy={26} r={2.6} fill={GLASS_EMERALD} />
      <GDot cx={180} cy={36} r={2.6} fill={GLASS_VIOLET_LT} />
      <GDot cx={128} cy={54} r={2.4} fill={GLASS_SAPPHIRE} />
      <GDot cx={176} cy={54} r={2.4} fill={GLASS_AMBER_LT} />
      <GDot cx={138} cy={68} r={2.4} fill={GLASS_VIOLET} />
      <GDot cx={166} cy={68} r={2.4} fill={GLASS_RUBY} />
      <GLine x1={100} y1={104} x2={196} y2={104} c={GLASS_LEAD} w={2.2} />
    </GlassSceneRoot>
  );
}

export function GlassTvBreakingBadScene() {
  return (
    <GlassSceneRoot bg="#1E2E28">
      <GC cx={118} cy={20} r={8} fill={GLASS_AMBER_PALE} />
      <GPoly points="126,66 140,44 152,66" fill={GLASS_EMERALD} />
      <GPoly points="146,72 162,50 176,72" fill="#3FA67A" />
      <GPoly points="132,78 144,62 156,78" fill={GLASS_SAPPHIRE_LT} />
      <GPoly points="160,84 172,68 184,84" fill={GLASS_EMERALD} />
      <GR x={108} y={84} width={84} height={8} fill={GLASS_INK} />
      <GDot cx={136} cy={96} r={2.4} fill={GLASS_EMERALD} />
      <GDot cx={158} cy={100} r={2.4} fill="#3FA67A" />
      <GDot cx={178} cy={96} r={2.4} fill={GLASS_EMERALD} />
      <GLine x1={100} y1={108} x2={196} y2={108} c={GLASS_LEAD} w={2} />
    </GlassSceneRoot>
  );
}

export function GlassTvBetterCallSaulScene() {
  return (
    <GlassSceneRoot bg="#1B1726">
      <GDot cx={120} cy={12} r={2} fill={GLASS_CREAM} />
      <GDot cx={164} cy={10} r={2} fill={GLASS_CREAM} />
      <GR x={108} y={56} width={84} height={44} fill={GLASS_SAPPHIRE} />
      <GR x={114} y={66} width={20} height={24} fill={GLASS_SAPPHIRE_LT} />
      <GR x={140} y={66} width={16} height={34} fill={GLASS_INK} />
      <GR x={162} y={66} width={18} height={24} fill={GLASS_AMBER_PALE} />
      <GFigure x={172} y={56} s={0.62} fill={GLASS_RUBY} pose="armsUp" />
      <GLine x1={100} y1={102} x2={196} y2={102} c={GLASS_LEAD} w={2} />
      <GR x={112} y={86} width={8} height={14} fill={GLASS_PANEL} />
    </GlassSceneRoot>
  );
}

export function GlassTvFalloutScene() {
  return (
    <GlassSceneRoot bg="#2A2010">
      <GPoly points="152,8 158,28 152,24 146,28" fill={GLASS_AMBER} />
      <GPoly points="186,22 172,38 176,30 168,28" fill={GLASS_AMBER_LT} />
      <GPoly points="118,22 132,38 128,30 136,28" fill={GLASS_AMBER_LT} />
      <GPoly points="196,58 176,58 182,52 182,64" fill={GLASS_AMBER} />
      <GPoly points="108,58 128,58 122,52 122,64" fill={GLASS_AMBER} />
      <GC cx={152} cy={58} r={34} fill={GLASS_AMBER} />
      <GC cx={152} cy={58} r={25} fill={GLASS_PANEL} />
      <GC cx={152} cy={58} r={10} fill={GLASS_AMBER_PALE} />
      <GLine x1={142} y1={58} x2={162} y2={58} c={GLASS_LEAD} w={2.2} />
      <GLine x1={152} y1={48} x2={152} y2={68} c={GLASS_LEAD} w={2.2} />
      <GLine x1={104} y1={108} x2={196} y2={108} c={GLASS_LEAD} w={2} />
    </GlassSceneRoot>
  );
}

export function GlassTvTedLassoScene() {
  return (
    <GlassSceneRoot bg="#1E3048">
      <GPoly points="136,36 150,32 164,36 170,44 162,48 162,70 138,70 138,48 130,44" fill={GLASS_RUBY} />
      <GLine x1={110} y1={84} x2={194} y2={84} c={GLASS_LEAD} w={2.4} />
      <GLine x1={116} y1={84} x2={116} y2={100} c={GLASS_LEAD} w={2.2} />
      <GLine x1={188} y1={84} x2={188} y2={100} c={GLASS_LEAD} w={2.2} />
      <GC cx={122} cy={98} r={10} fill={GLASS_CREAM} />
      <GPoly points="122,90 127,96 124,103 116,103 115,95" fill={GLASS_INK} />
      <GDot cx={150} cy={20} r={2.2} fill={GLASS_AMBER} />
      <GDot cx={176} cy={20} r={2.2} fill={GLASS_AMBER} />
      <GLine x1={100} y1={108} x2={196} y2={108} c={GLASS_LEAD} w={2} />
    </GlassSceneRoot>
  );
}

export function GlassTvOnePieceScene() {
  return (
    <GlassSceneRoot bg="#1E3048">
      <GLine x1={150} y1={12} x2={150} y2={82} c={GLASS_LEAD} w={2.6} />
      <GP d="M 150 16 Q 172 20 174 44 L 150 44 Z" fill={GLASS_CREAM} />
      <GC cx={160} cy={30} r={5} fill={GLASS_INK} />
      <GDot cx={158} cy={29} r={1.2} fill={GLASS_CREAM} />
      <GDot cx={163} cy={29} r={1.2} fill={GLASS_CREAM} />
      <GP d="M 150 48 Q 134 52 126 68 L 150 68 Z" fill={GLASS_RUBY} />
      <GP d="M 108 82 L 188 82 L 176 100 L 120 100 Z" fill="#6B4A2A" />
      <GLine x1={104} y1={106} x2={196} y2={106} c={GLASS_SAPPHIRE_LT} w={2.4} />
      <GLine x1={116} y1={112} x2={184} y2={112} c={GLASS_SAPPHIRE} w={2.4} />
      <GC cx={186} cy={16} r={6} fill={GLASS_AMBER_PALE} />
    </GlassSceneRoot>
  );
}

export function GlassTvStrangerThingsScene() {
  return (
    <GlassSceneRoot bg="#2A1218">
      <GC cx={152} cy={52} r={30} fill={GLASS_RUBY} />
      <GC cx={152} cy={52} r={22} fill="#7A1F2E" />
      <GLine x1={152} y1={108} x2={152} y2={74} c={GLASS_INK} w={4} />
      <GLine x1={152} y1={88} x2={132} y2={74} c={GLASS_INK} w={3} />
      <GLine x1={152} y1={88} x2={172} y2={74} c={GLASS_INK} w={3} />
      <GLine x1={140} y1={108} x2={132} y2={96} c={GLASS_INK} w={2.6} />
      <GLine x1={164} y1={108} x2={172} y2={96} c={GLASS_INK} w={2.6} />
      <GLine x1={152} y1={74} x2={142} y2={60} c={GLASS_INK} w={2.6} />
      <GLine x1={152} y1={74} x2={164} y2={58} c={GLASS_INK} w={2.6} />
      <GDot cx={120} cy={24} r={2.2} fill={GLASS_AMBER} />
      <GDot cx={184} cy={20} r={2.2} fill={GLASS_SAPPHIRE_LT} />
      <GLine x1={100} y1={108} x2={196} y2={108} c={GLASS_LEAD} w={2} />
    </GlassSceneRoot>
  );
}

export function GlassTvBlueyScene() {
  return (
    <GlassSceneRoot bg="#2B4C6B">
      <GC cx={120} cy={18} r={8} fill={GLASS_AMBER_PALE} />
      <GR x={120} y={38} width={68} height={34} fill={GLASS_CREAM} />
      <GPoly points="146,38 146,22 158,30 170,22 170,38" fill={GLASS_SAPPHIRE} />
      <GPoly points="114,38 154,22 194,38" fill={GLASS_AMBER} />
      <GR x={146} y={52} width={14} height={20} fill={GLASS_SAPPHIRE} />
      <GR x={128} y={46} width={10} height={10} fill={GLASS_SAPPHIRE_LT} />
      <GR x={168} y={46} width={10} height={10} fill={GLASS_RUBY} />
      <GLine x1={126} y1={72} x2={126} y2={94} c={GLASS_LEAD} w={2.4} />
      <GLine x1={182} y1={72} x2={182} y2={94} c={GLASS_LEAD} w={2.4} />
      <GC cx={134} cy={90} r={5} fill={GLASS_SAPPHIRE} />
      <GPoly points="130,84 126,76 134,80" fill={GLASS_SAPPHIRE} />
      <GPoly points="138,84 142,76 140,82" fill={GLASS_SAPPHIRE} />
      <GLine x1={100} y1={102} x2={196} y2={102} c={GLASS_EMERALD} w={2.6} />
    </GlassSceneRoot>
  );
}

export function GlassTvDuggeeScene() {
  return (
    <GlassSceneRoot bg="#1E3A2A">
      <GC cx={122} cy={22} r={15} fill={GLASS_EMERALD} />
      <GLine x1={122} y1={96} x2={118} y2={36} c={GLASS_LEAD} w={2.6} />
      <GR x={130} y={54} width={56} height={40} fill={GLASS_AMBER} />
      <GPoly points="124,54 158,38 192,54" fill={GLASS_RUBY} />
      <GR x={151} y={70} width={13} height={24} fill={GLASS_INK} />
      <GC cx={174} cy={64} r={5} fill={GLASS_CREAM} />
      <GDot cx={126} cy={102} r={3} fill={GLASS_RUBY} />
      <GDot cx={146} cy={104} r={3} fill={GLASS_SAPPHIRE_LT} />
      <GDot cx={168} cy={102} r={3} fill={GLASS_AMBER_PALE} />
      <GLine x1={104} y1={106} x2={196} y2={106} c={GLASS_LEAD} w={2} />
    </GlassSceneRoot>
  );
}

export function GlassTvAvatarScene() {
  return (
    <GlassSceneRoot bg="#2B4C6B">
      <GP d="M 122 44 Q 136 32 152 34 Q 168 32 178 42 Q 172 54 158 54 L 132 54 Q 118 54 122 44 Z" fill={GLASS_CREAM} />
      <GLine x1={132} y1={54} x2={130} y2={62} c={GLASS_LEAD} w={2.2} />
      <GLine x1={168} y1={54} x2={170} y2={62} c={GLASS_LEAD} w={2.2} />
      <GR x={122} y={80} width={52} height={14} fill={GLASS_RUBY} />
      <GPoly points="116,80 148,66 180,80" fill={GLASS_AMBER} />
      <GPoly points="128,106 168,106 148,118" fill={GLASS_VIOLET} />
      <GC cx={118} cy={26} r={7} fill={GLASS_SAPPHIRE_LT} />
      <GC cx={186} cy={96} r={6} fill={GLASS_SAPPHIRE_LT} />
      <GDot cx={148} cy={72} r={2.2} fill={GLASS_AMBER} />
    </GlassSceneRoot>
  );
}

export function GlassTvYellowstoneScene() {
  return (
    <GlassSceneRoot bg="#2B2438">
      <GC cx={118} cy={18} r={8} fill={GLASS_AMBER_PALE} />
      <GPoly points="104,60 130,28 146,46 162,26 196,60" fill={GLASS_SAPPHIRE} />
      <GPoly points="154,36 162,26 170,36 166,40 162,34 158,40" fill={GLASS_CREAM} />
      <GR x={108} y={62} width={32} height={26} fill={GLASS_RUBY} />
      <GPoly points="106,62 124,50 142,62" fill={GLASS_INK} />
      <GLine x1={146} y1={76} x2={196} y2={76} c={GLASS_LEAD} w={2.2} />
      <GP d="M 148 102 Q 148 88 162 88 L 176 88 Q 188 88 188 100 L 182 100 Q 182 94 174 94 L 158 94 Q 152 94 152 102 Z" fill="#6B4A2A" />
      <GLine x1={152} y1={100} x2={150} y2={110} c={GLASS_LEAD} w={2.2} />
      <GLine x1={182} y1={100} x2={184} y2={110} c={GLASS_LEAD} w={2.2} />
      <GLine x1={100} y1={102} x2={196} y2={102} c={GLASS_LEAD} w={2} />
    </GlassSceneRoot>
  );
}

export function GlassTvBoysScene() {
  return (
    <GlassSceneRoot bg="#141E33">
      <GDot cx={118} cy={14} r={2} fill={GLASS_CREAM} />
      <GDot cx={186} cy={12} r={2} fill={GLASS_CREAM} />
      <GR x={144} y={28} width={36} height={78} fill={GLASS_SAPPHIRE} />
      <GPoly points="144,28 162,14 180,28" fill={GLASS_INK} />
      <GR x={152} y={40} width={8} height={8} fill={GLASS_AMBER} />
      <GR x={164} y={58} width={8} height={8} fill={GLASS_AMBER_LT} />
      <GR x={152} y={74} width={8} height={8} fill={GLASS_CREAM} />
      <GFigure x={128} y={72} s={0.66} fill={GLASS_RUBY} />
      <GPoly points="122,52 106,64 120,66 112,78 130,62" fill={GLASS_RUBY} />
      <GLine x1={104} y1={62} x2={122} y2={50} c={GLASS_CREAM_LT} w={1.8} />
      <GLine x1={100} y1={106} x2={196} y2={106} c={GLASS_LEAD} w={2} />
    </GlassSceneRoot>
  );
}

export function GlassTvYouScene() {
  return (
    <GlassSceneRoot bg="#221D2E">
      <GR x={108} y={16} width={84} height={90} fill={GLASS_PANEL} />
      <GR x={114} y={22} width={7} height={20} fill={GLASS_RUBY} />
      <GR x={124} y={22} width={7} height={20} fill={GLASS_SAPPHIRE} />
      <GR x={168} y={22} width={7} height={20} fill={GLASS_EMERALD} />
      <GR x={178} y={22} width={7} height={20} fill={GLASS_VIOLET} />
      <GR x={122} y={50} width={56} height={50} fill={GLASS_SAPPHIRE_LT} />
      <GLine x1={122} y1={62} x2={178} y2={62} c={GLASS_LEAD} w={2} />
      <GFigure x={142} y={98} s={0.78} fill={GLASS_INK} pose="sit" />
      <GR x={154} y={80} width={12} height={10} fill={GLASS_CREAM} />
      <GDot cx={172} cy={84} r={2} fill={GLASS_AMBER} />
    </GlassSceneRoot>
  );
}

export function GlassTvChuckyScene() {
  return (
    <GlassSceneRoot bg="#2B2438">
      <GR x={152} y={12} width={36} height={36} fill={GLASS_SAPPHIRE} />
      <GLine x1={152} y1={22} x2={188} y2={22} c={GLASS_LEAD} w={2} />
      <GLine x1={152} y1={32} x2={188} y2={32} c={GLASS_LEAD} w={2} />
      <GP d="M 110 100 L 114 76 L 158 76 L 162 100 Z" fill={GLASS_RUBY} />
      <GFigure x={136} y={76} s={0.62} fill={GLASS_SAPPHIRE} pose="sit" />
      <GC cx={136} cy={40} r={7} fill={GLASS_CREAM} />
      <GPoly points="130,36 128,28 136,32 142,28 142,36" fill={GLASS_RUBY} />
      <GLine x1={144} y1={62} x2={158} y2={54} c={GLASS_CREAM} w={2.2} />
      <GC cx={118} cy={94} r={5} fill={GLASS_AMBER} />
      <GR x={170} y={90} width={10} height={10} fill={GLASS_EMERALD} />
      <GLine x1={100} y1={102} x2={196} y2={102} c={GLASS_LEAD} w={2} />
    </GlassSceneRoot>
  );
}

export function GlassTvLostScene() {
  return (
    <GlassSceneRoot bg="#1E3A2A">
      <GC cx={120} cy={18} r={8} fill={GLASS_AMBER_PALE} />
      <GP d="M 106 66 Q 124 54 146 56 L 160 60 L 158 72 Q 136 64 118 68 L 104 74 Z" fill={GLASS_SAPPHIRE_LT} />
      <GDot cx={122} cy={64} r={2} fill={GLASS_INK} />
      <GDot cx={134} cy={62} r={2} fill={GLASS_INK} />
      <GLine x1={100} y1={84} x2={196} y2={84} c={GLASS_AMBER} w={2.4} />
      <GLine x1={186} y1={84} x2={178} y2={48} c={GLASS_LEAD} w={2.4} />
      <GLine x1={178} y1={48} x2={162} y2={36} c={GLASS_EMERALD} w={2.4} />
      <GLine x1={178} y1={48} x2={190} y2={34} c={GLASS_EMERALD} w={2.4} />
      <GC cx={122} cy={100} r={7} fill={GLASS_INK_SOFT} />
      <GLine x1={115} y1={100} x2={129} y2={100} c={GLASS_CREAM} w={1.8} />
      <GLine x1={122} y1={93} x2={122} y2={107} c={GLASS_CREAM} w={1.8} />
    </GlassSceneRoot>
  );
}

export function GlassTvPrisonBreakScene() {
  return (
    <GlassSceneRoot bg="#141E33">
      <GC cx={184} cy={16} r={8} fill={GLASS_CREAM_LT} />
      <GR x={104} y={62} width={90} height={44} fill={GLASS_PANEL} />
      <GLine x1={104} y1={76} x2={194} y2={76} c={GLASS_LEAD} w={2} />
      <GLine x1={128} y1={62} x2={128} y2={106} c={GLASS_LEAD} w={1.8} />
      <GLine x1={160} y1={62} x2={160} y2={106} c={GLASS_LEAD} w={1.8} />
      <GR x={136} y={30} width={22} height={32} fill={GLASS_VIOLET} />
      <GPoly points="132,30 162,30 156,20 138,20" fill={GLASS_INK} />
      <GR x={143} y={36} width={8} height={8} fill={GLASS_AMBER} />
      <GPoly points="147,44 182,96 164,100" fill={GLASS_AMBER_PALE} />
      <GLine x1={104} y1={54} x2={194} y2={54} c={GLASS_RUBY} w={2} />
      <GLine x1={100} y1={106} x2={196} y2={106} c={GLASS_LEAD} w={2} />
    </GlassSceneRoot>
  );
}

export function GlassTvItDerryScene() {
  return (
    <GlassSceneRoot bg="#241D33">
      <GR x={108} y={40} width={30} height={34} fill={GLASS_PANEL} />
      <GPoly points="106,40 123,30 140,40" fill={GLASS_INK} />
      <GLine x1={100} y1={76} x2={196} y2={76} c={GLASS_LEAD} w={2.4} />
      <GR x={120} y={79} width={42} height={11} rx={3} fill={GLASS_INK} />
      <GLine x1={130} y1={80} x2={130} y2={89} c={GLASS_CREAM} w={1.8} />
      <GLine x1={141} y1={80} x2={141} y2={89} c={GLASS_CREAM} w={1.8} />
      <GPoly points="106,98 120,98 113,92" fill={GLASS_CREAM} />
      <GC cx={178} cy={26} r={11} fill={GLASS_RUBY} />
      <GPoly points="175,37 181,37 178,42" fill={GLASS_INK} />
      <GLine x1={178} y1={42} x2={174} y2={62} c={GLASS_CREAM} w={1.8} />
      <GDot cx={174} cy={22} r={1.8} fill={GLASS_CREAM_LT} />
    </GlassSceneRoot>
  );
}

export function GlassTvCarrieScene() {
  return (
    <GlassSceneRoot bg="#2A1218">
      <GC cx={150} cy={24} r={8} fill={GLASS_SAPPHIRE_LT} />
      <GDot cx={146} cy={22} r={1.6} fill={GLASS_CREAM} />
      <GDot cx={154} cy={27} r={1.6} fill={GLASS_CREAM} />
      <GFigure x={150} y={72} s={0.7} fill={GLASS_RUBY} />
      <GPoly points="138,72 162,72 170,102 130,102" fill={GLASS_RUBY} />
      <GPoly points="128,100 136,86 142,96 150,84 158,96 164,86 170,100" fill={GLASS_AMBER} />
      <GPoly points="164,28 184,28 180,42 168,42" fill={GLASS_SAPPHIRE} />
      <GLine x1={174} y1={28} x2={174} y2={18} c={GLASS_LEAD} w={2} />
      <GLine x1={172} y1={44} x2={172} y2={52} c={GLASS_RUBY} w={2.2} />
      <GLine x1={100} y1={104} x2={196} y2={104} c={GLASS_LEAD} w={2} />
    </GlassSceneRoot>
  );
}

export function GlassTvHarryPotterScene() {
  return (
    <GlassSceneRoot bg="#141E33">
      <GC cx={118} cy={14} r={7} fill={GLASS_CREAM_LT} />
      <GR x={128} y={50} width={50} height={36} fill={GLASS_VIOLET} />
      <GR x={116} y={34} width={13} height={52} fill={GLASS_PANEL} />
      <GPoly points="114,34 122,20 130,34" fill={GLASS_INK} />
      <GR x={176} y={26} width={15} height={60} fill={GLASS_PANEL} />
      <GPoly points="174,26 183,10 192,26" fill={GLASS_INK} />
      <GR x={144} y={38} width={11} height={48} fill={GLASS_PANEL} />
      <GPoly points="142,38 149,26 156,38" fill={GLASS_INK} />
      <GDot cx={136} cy={62} r={2.2} fill={GLASS_AMBER} />
      <GDot cx={162} cy={66} r={2.2} fill={GLASS_AMBER} />
      <GDot cx={183} cy={46} r={2.2} fill={GLASS_AMBER} />
      <GPoly points="158,92 168,92 162,100 170,100 156,112 160,102 154,102" fill={GLASS_AMBER} />
      <GLine x1={120} y1={88} x2={196} y2={88} c={GLASS_SAPPHIRE_LT} w={2} />
    </GlassSceneRoot>
  );
}

export function GlassTvWednesdayScene() {
  return (
    <GlassSceneRoot bg="#1B1726">
      <GC cx={186} cy={14} r={7} fill={GLASS_CREAM_LT} />
      <GR x={120} y={38} width={48} height={68} fill={GLASS_PANEL} />
      <GPoly points="116,38 144,16 172,38" fill={GLASS_INK} />
      <GC cx={144} cy={62} r={14} fill={GLASS_VIOLET} />
      <GP d="M 144 48 L 144 76 L 130 62 Z" fill={GLASS_INK} />
      <GP d="M 144 48 L 158 62 L 144 76 Z" fill={GLASS_CREAM} />
      <GLine x1={130} y1={62} x2={158} y2={62} c={GLASS_LEAD} w={2} />
      <GP d="M 136 96 Q 136 90 142 90 L 146 90 Q 150 90 150 94 L 150 98 L 144 98 L 144 94 L 140 98 L 136 98 Z" fill={GLASS_CREAM} />
      <GDot cx={139} cy={93} r={1} fill={GLASS_INK} />
      <GLine x1={188} y1={106} x2={188} y2={58} c={GLASS_LEAD} w={2.4} />
      <GLine x1={100} y1={106} x2={196} y2={106} c={GLASS_LEAD} w={2} />
    </GlassSceneRoot>
  );
}

export function GlassTvVampireDiariesScene() {
  return (
    <GlassSceneRoot bg="#1B1726">
      <GC cx={116} cy={16} r={9} fill={GLASS_CREAM_LT} />
      <GP d="M 132 32 Q 136 27 140 31 L 145 28 Q 147 32 142 33 Q 136 35 132 32 Z" fill={GLASS_INK} />
      <GR x={136} y={32} width={26} height={74} fill={GLASS_RUBY} />
      <GPoly points="133,32 149,18 165,32" fill={GLASS_INK} />
      <GC cx={149} cy={50} r={8} fill={GLASS_CREAM} />
      <GLine x1={149} y1={50} x2={149} y2={43} c={GLASS_INK} w={1.8} />
      <GLine x1={149} y1={50} x2={155} y2={53} c={GLASS_INK} w={1.8} />
      <GR x={143} y={70} width={12} height={12} fill={GLASS_AMBER} />
      <GR x={106} y={68} width={28} height={38} fill={GLASS_PANEL} />
      <GPoly points="104,68 120,56 136,68" fill={GLASS_INK} />
      <GLine x1={100} y1={106} x2={196} y2={106} c={GLASS_LEAD} w={2} />
    </GlassSceneRoot>
  );
}

export function GlassTvOriginalsScene() {
  return (
    <GlassSceneRoot bg="#241D33">
      <GC cx={184} cy={14} r={7} fill={GLASS_CREAM_LT} />
      <GR x={110} y={22} width={70} height={84} fill={GLASS_VIOLET} />
      <GLine x1={106} y1={50} x2={184} y2={50} c={GLASS_LEAD} w={2.6} />
      <GLine x1={106} y1={78} x2={184} y2={78} c={GLASS_LEAD} w={2.6} />
      <GR x={118} y={28} width={11} height={18} fill={GLASS_AMBER_PALE} />
      <GR x={160} y={28} width={11} height={18} fill={GLASS_AMBER_PALE} />
      <GR x={138} y={86} width={14} height={20} fill={GLASS_INK} />
      <GC cx={108} cy={66} r={4} fill={GLASS_AMBER} />
      <GC cx={188} cy={66} r={4} fill={GLASS_AMBER} />
      <GLine x1={100} y1={106} x2={196} y2={106} c={GLASS_LEAD} w={2} />
    </GlassSceneRoot>
  );
}

export function GlassTvLegaciesScene() {
  return (
    <GlassSceneRoot bg="#1B2A26">
      <GC cx={118} cy={14} r={8} fill={GLASS_CREAM_LT} />
      <GR x={116} y={44} width={72} height={44} fill={GLASS_CREAM} />
      <GPoly points="112,44 152,28 192,44" fill={GLASS_RUBY} />
      <GLine x1={124} y1={50} x2={124} y2={82} c={GLASS_LEAD} w={2.2} />
      <GLine x1={140} y1={50} x2={140} y2={82} c={GLASS_LEAD} w={2.2} />
      <GLine x1={164} y1={50} x2={164} y2={82} c={GLASS_LEAD} w={2.2} />
      <GLine x1={180} y1={50} x2={180} y2={82} c={GLASS_LEAD} w={2.2} />
      <GR x={146} y={62} width={12} height={26} fill={GLASS_SAPPHIRE} />
      <GDot cx={126} cy={96} r={2.2} fill={GLASS_VIOLET_LT} />
      <GDot cx={152} cy={100} r={2.2} fill={GLASS_AMBER} />
      <GDot cx={178} cy={96} r={2.2} fill={GLASS_EMERALD} />
      <GLine x1={100} y1={100} x2={196} y2={100} c={GLASS_LEAD} w={2.2} />
    </GlassSceneRoot>
  );
}
