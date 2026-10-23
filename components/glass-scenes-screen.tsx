// v201 — the Stained Glass screen scenes: the schedule's screen
// keyword pictures (church, photo, travel, the meal cards, the
// burger, the parks and the movie posters) rebuilt as jewel-tone
// panes in lead. Every scene is bespoke — its own composition in
// the right-hand zone of the canvas, clear of the cream label
// pane — drawn only with the glass kit's filled panes.
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
  GLASS_SAPPHIRE,
  GLASS_SAPPHIRE_LT,
  GLASS_RUBY,
  GLASS_EMERALD,
  GLASS_VIOLET,
  GLASS_VIOLET_LT,
} from "@/components/glass-kit";

export function GlassChurchScene() {
  return (
    <GlassSceneRoot bg="#1E1830">
      <GC cx={182} cy={18} r={9} fill={GLASS_AMBER} />
      <GLine x1={182} y1={4} x2={182} y2={8} c={GLASS_AMBER} w={2} />
      <GLine x1={168} y1={18} x2={172} y2={18} c={GLASS_AMBER} w={2} />
      <GLine x1={192} y1={18} x2={196} y2={18} c={GLASS_AMBER} w={2} />
      <GLine x1={104} y1={104} x2={200} y2={104} c={GLASS_LEAD} w={2.4} />
      <GR x={112} y={62} width={30} height={42} fill={GLASS_SAPPHIRE} />
      <GPoly points="108,62 146,62 127,46" fill={GLASS_RUBY} />
      <GR x={142} y={50} width={42} height={54} fill={GLASS_VIOLET} />
      <GPoly points="138,50 188,50 163,32" fill={GLASS_RUBY} />
      <GR x={156} y={12} width={13} height={22} fill={GLASS_SAPPHIRE} />
      <GPoly points="154,12 171,12 162,3" fill={GLASS_RUBY} />
      <GR x={160} y={16} width={4} height={11} fill={GLASS_AMBER} />
      <GR x={157} y={19} width={10} height={4} fill={GLASS_AMBER} />
      <GP d="M 156 104 L 156 84 Q 156 74 163 74 Q 170 74 170 84 L 170 104 Z" fill={GLASS_CREAM} />
      <GP d="M 120 88 L 120 76 Q 120 69 124 69 Q 128 69 128 76 L 128 88 Z" fill={GLASS_AMBER} />
      <GP d="M 176 88 L 176 76 Q 176 69 180 69 Q 184 69 184 76 L 184 88 Z" fill={GLASS_AMBER_PALE} />
      <GPoly points="102,104 106,84 112,104" fill={GLASS_EMERALD} />
      <GPoly points="186,104 191,82 196,104" fill={GLASS_EMERALD} />
      <GDot cx={106} cy={82} r={2.2} fill={GLASS_RUBY} />
      <GDot cx={191} cy={80} r={2.2} fill={GLASS_RUBY} />
    </GlassSceneRoot>
  );
}

export function GlassPhotoScene() {
  return (
    <GlassSceneRoot bg="#141C2E">
      <GPoly points="106,20 150,14 154,52 110,58" fill={GLASS_CREAM} />
      <GPoly points="114,48 126,30 136,42 142,34 148,50" fill={GLASS_SAPPHIRE} />
      <GC cx={120} cy={24} r={4.5} fill={GLASS_AMBER} />
      <GPoly points="148,30 188,26 190,58 152,60" fill={GLASS_CREAM_LT} />
      <GPoly points="156,54 166,38 174,48 180,42 186,55" fill={GLASS_VIOLET} />
      <GC cx={182} cy={33} r={3.6} fill={GLASS_AMBER_LT} />
      <GR x={122} y={66} width={62} height={38} rx={5} fill={GLASS_VIOLET} />
      <GR x={138} y={58} width={30} height={10} rx={3} fill={GLASS_VIOLET_LT} />
      <GC cx={153} cy={85} r={14} fill={GLASS_SAPPHIRE} />
      <GC cx={153} cy={85} r={8} fill={GLASS_SAPPHIRE_LT} />
      <GC cx={150} cy={82} r={2.8} fill={GLASS_CREAM} w={1.4} />
      <GR x={128} y={72} width={10} height={6} fill={GLASS_AMBER} />
      <GDot cx={177} cy={73} r={2.4} fill={GLASS_RUBY} />
      <GLine x1={100} y1={106} x2={200} y2={106} c={GLASS_LEAD} w={2.4} />
    </GlassSceneRoot>
  );
}

export function GlassTravelScene() {
  return (
    <GlassSceneRoot bg="#101E33">
      <GC cx={184} cy={16} r={8} fill={GLASS_AMBER} />
      <GPoly points="104,38 122,32 128,38 120,44 106,44" fill={GLASS_CREAM} />
      <GPoly points="150,22 168,17 174,22 166,27 152,27" fill={GLASS_CREAM_LT} />
      <GLine x1={108} y1={72} x2={150} y2={58} c={GLASS_SAPPHIRE_LT} w={2} dash="4 4" />
      <GP d="M 118 62 L 168 44 L 182 42 L 158 56 L 146 70 L 140 70 L 148 54 L 130 61 L 120 73 L 114 73 L 122 58 L 112 65 Z" fill={GLASS_CREAM} />
      <GDot cx={156} cy={50} r={1.8} fill={GLASS_SAPPHIRE} />
      <GDot cx={164} cy={47} r={1.8} fill={GLASS_SAPPHIRE} />
      <GPoly points="100,106 130,84 158,106" fill={GLASS_EMERALD} />
      <GPoly points="140,106 172,80 198,106" fill={GLASS_SAPPHIRE} />
      <GR x={156} y={86} width={24} height={18} rx={3} fill={GLASS_RUBY} />
      <GP d="M 162 86 L 162 80 Q 162 75 168 75 Q 174 75 174 80 L 174 86" fill={GLASS_AMBER} />
      <GLine x1={156} y1={95} x2={180} y2={95} c={GLASS_AMBER} w={2} />
    </GlassSceneRoot>
  );
}

export function GlassBreakfastScene() {
  return (
    <GlassSceneRoot bg="#2A1A2E">
      <GC cx={168} cy={30} r={13} fill={GLASS_AMBER} />
      <GPoly points="168,6 172,14 164,14" fill={GLASS_AMBER_LT} />
      <GPoly points="144,16 152,20 147,26" fill={GLASS_AMBER_LT} />
      <GPoly points="192,16 187,26 180,20" fill={GLASS_AMBER_LT} />
      <GPoly points="140,42 150,40 148,48" fill={GLASS_AMBER_PALE} />
      <GPoly points="196,42 188,48 186,40" fill={GLASS_AMBER_PALE} />
      <GR x={106} y={92} width={90} height={8} fill="#5A3A22" />
      <GLine x1={104} y1={106} x2={200} y2={106} c={GLASS_LEAD} w={2.4} />
      <GC cx={132} cy={86} r={17} fill={GLASS_CREAM} />
      <GC cx={129} cy={84} r={7} fill={GLASS_AMBER} />
      <GP d="M 140 78 Q 147 73 151 79 Q 157 75 158 82 Q 160 88 153 90 Q 145 93 141 88 Q 137 83 140 78 Z" fill={GLASS_CREAM_LT} />
      <GR x={164} y={66} width={19} height={24} rx={2} fill={GLASS_RUBY} />
      <GP d="M 183 72 Q 191 74 189 81 Q 187 87 183 86" fill={GLASS_RUBY} />
      <GLine x1={169} y1={60} x2={169} y2={52} c={GLASS_SAPPHIRE_LT} w={1.8} />
      <GLine x1={177} y1={60} x2={177} y2={52} c={GLASS_SAPPHIRE_LT} w={1.8} />
      <GDot cx={120} cy={90} r={2} fill={GLASS_EMERALD} />
      <GDot cx={142} cy={92} r={2} fill={GLASS_RUBY} />
    </GlassSceneRoot>
  );
}

export function GlassLunchScene() {
  return (
    <GlassSceneRoot bg="#14243F">
      <GR x={104} y={8} width={94} height={26} fill={GLASS_SAPPHIRE} />
      <GC cx={150} cy={21} r={8} fill={GLASS_CREAM_LT} />
      <GDot cx={122} cy={16} r={2.2} fill={GLASS_AMBER} />
      <GDot cx={182} cy={26} r={2.2} fill={GLASS_AMBER_PALE} />
      <GR x={104} y={96} width={92} height={8} fill="#4A3423" />
      <GLine x1={104} y1={108} x2={200} y2={108} c={GLASS_LEAD} w={2.4} />
      <GPoly points="110,84 156,84 148,68 118,68" fill={GLASS_AMBER_PALE} />
      <GP d="M 114 68 Q 118 54 133 52 Q 148 54 152 68 Q 140 62 133 66 Q 126 62 114 68 Z" fill={GLASS_EMERALD} />
      <GPoly points="116,58 122,52 128,58 134,51 140,58 146,52 150,59 148,63 118,63" fill={GLASS_RUBY} />
      <GC cx={133} cy={88} r={3} fill={GLASS_CREAM} w={1.4} />
      <GR x={166} y={58} width={16} height={38} fill={GLASS_SAPPHIRE_LT} />
      <GLine x1={174} y1={58} x2={182} y2={34} c={GLASS_RUBY} w={2.6} />
      <GLine x1={166} y1={70} x2={182} y2={70} c={GLASS_SAPPHIRE} w={1.6} />
      <GPoly points="102,96 106,80 116,80 118,96" fill={GLASS_VIOLET} />
      <GLine x1={107} y1={80} x2={107} y2={66} c={GLASS_AMBER} w={2.2} />
      <GLine x1={111} y1={80} x2={112} y2={64} c={GLASS_AMBER} w={2.2} />
      <GLine x1={115} y1={80} x2={117} y2={68} c={GLASS_AMBER} w={2.2} />
    </GlassSceneRoot>
  );
}

export function GlassDinnerScene() {
  return (
    <GlassSceneRoot bg="#241430">
      <GP d="M 178 10 Q 186 20 180 32 Q 192 26 194 14 Q 194 6 186 4 Q 180 6 178 10 Z" fill={GLASS_CREAM_LT} />
      <GDot cx={120} cy={14} r={2} fill={GLASS_AMBER_PALE} />
      <GDot cx={140} cy={8} r={1.7} fill={GLASS_SAPPHIRE_LT} />
      <GR x={104} y={94} width={94} height={8} fill="#3A2440" />
      <GLine x1={104} y1={106} x2={200} y2={106} c={GLASS_LEAD} w={2.4} />
      <GP d="M 112 84 Q 112 58 138 56 Q 164 58 164 84 Z" fill={GLASS_AMBER_PALE} />
      <GR x={104} y={84} width={68} height={6} fill={GLASS_AMBER} />
      <GC cx={138} cy={52} r={4} fill={GLASS_CREAM} w={1.8} />
      <GR x={180} y={34} width={7} height={34} rx={2} fill={GLASS_CREAM} />
      <GP d="M 183 34 Q 179 25 183 16 Q 188 25 183 34 Z" fill={GLASS_AMBER} />
      <GC cx={183} cy={26} r={1.8} fill={GLASS_AMBER_PALE} w={1} />
      <GP d="M 108 62 Q 108 76 116 76 Q 124 76 124 62 Z" fill={GLASS_VIOLET_LT} />
      <GLine x1={116} y1={76} x2={116} y2={92} c={GLASS_VIOLET_LT} w={2.4} />
      <GLine x1={108} y1={92} x2={124} y2={92} c={GLASS_VIOLET_LT} w={2.4} />
      <GC cx={150} cy={98} r={1.8} fill={GLASS_RUBY} w={1.2} />
      <GC cx={126} cy={98} r={1.8} fill={GLASS_RUBY} w={1.2} />
    </GlassSceneRoot>
  );
}

export function GlassTdBurgerScene() {
  return (
    <GlassSceneRoot bg="#2A140F">
      <GLine x1={104} y1={106} x2={200} y2={106} c={GLASS_LEAD} w={2.4} />
      <GP d="M 106 98 Q 134 90 162 98 Q 134 105 106 98 Z" fill={GLASS_VIOLET} />
      <GP d="M 108 62 Q 110 38 134 36 Q 158 38 160 62 Z" fill={GLASS_AMBER_PALE} />
      <GDot cx={121} cy={48} r={1.7} fill={GLASS_CREAM} />
      <GDot cx={134} cy={44} r={1.7} fill={GLASS_CREAM} />
      <GDot cx={147} cy={48} r={1.7} fill={GLASS_CREAM} />
      <GP d="M 106 62 Q 112 69 119 62 Q 126 70 134 62 Q 142 70 149 62 Q 156 68 162 62 L 162 67 L 106 67 Z" fill={GLASS_EMERALD} />
      <GPoly points="108,69 160,69 152,78 116,78" fill={GLASS_AMBER} />
      <GR x={108} y={78} width={52} height={8} rx={3} fill="#4A2C17" />
      <GP d="M 108 86 Q 134 93 160 86 L 160 92 Q 134 98 108 92 Z" fill={GLASS_AMBER_LT} />
      <GR x={170} y={74} width={24} height={24} fill={GLASS_RUBY} />
      <GR x={172} y={52} width={5} height={24} fill={GLASS_AMBER} />
      <GR x={179} y={48} width={5} height={28} fill={GLASS_AMBER_LT} />
      <GR x={186} y={54} width={5} height={22} fill={GLASS_AMBER_PALE} />
      <GDot cx={182} cy={84} r={2.4} fill={GLASS_CREAM} />
    </GlassSceneRoot>
  );
}

export function GlassParkKnottsScene() {
  return (
    <GlassSceneRoot bg="#33151F">
      <GLine x1={100} y1={104} x2={200} y2={104} c={GLASS_LEAD} w={2.4} />
      <GR x={106} y={58} width={52} height={46} fill={GLASS_RUBY} />
      <GPoly points="102,58 162,58 132,42" fill="#5A3A22" />
      <GR x={122} y={78} width={18} height={26} fill="#3A2317" />
      <GR x={111} y={64} width={11} height={10} fill={GLASS_AMBER_PALE} />
      <GR x={142} y={64} width={10} height={10} fill={GLASS_AMBER_PALE} />
      <GR x={170} y={30} width={6} height={74} fill="#5A3A22" />
      <GR x={156} y={22} width={36} height={15} rx={2} fill={GLASS_AMBER} />
      <GDot cx={164} cy={29} r={2.2} fill={GLASS_RUBY} />
      <GDot cx={174} cy={29} r={2.2} fill={GLASS_CREAM} />
      <GDot cx={184} cy={29} r={2.2} fill={GLASS_RUBY} />
      <GC cx={112} cy={92} r={4} fill={GLASS_RUBY} />
      <GC cx={120} cy={96} r={3.4} fill="#C2455A" />
      <GC cx={108} cy={98} r={3} fill="#7E1F2E" />
      <GDot cx={118} cy={88} r={1.8} fill={GLASS_EMERALD} />
      <GPoly points="188,104 190,84 194,104" fill={GLASS_EMERALD} />
      <GLine x1={192} y1={92} x2={186} y2={86} c={GLASS_EMERALD} w={2.2} />
      <GLine x1={192} y1={88} x2={198} y2={82} c={GLASS_EMERALD} w={2.2} />
    </GlassSceneRoot>
  );
}

export function GlassParkSixFlagsScene() {
  return (
    <GlassSceneRoot bg="#101E33">
      <GLine x1={100} y1={104} x2={200} y2={104} c={GLASS_LEAD} w={2.4} />
      <GP d="M 104 104 L 124 30 Q 128 18 139 22 Q 151 27 153 50 L 149 50 Q 147 32 138 29 Q 131 27 128 38 L 112 104 Z" fill={GLASS_SAPPHIRE} />
      <GC cx={168} cy={72} r={21} fill="#101E33" w={3.2} />
      <GC cx={168} cy={72} r={21} fill={GLASS_SAPPHIRE} o={0.001} w={3.2} />
      <GP d="M 153 50 Q 160 62 151 76 Q 141 91 144 104 L 152 104 Q 149 92 157 79 Q 165 65 160 50 Z" fill={GLASS_SAPPHIRE_LT} />
      <GR x={122} y={12} width={17} height={10} rx={2} fill={GLASS_RUBY} />
      <GDot cx={130} cy={17} r={2} fill={GLASS_CREAM} />
      <GLine x1={190} y1={104} x2={190} y2={20} c={GLASS_AMBER} w={2.4} />
      <GPoly points="190,20 200,24 190,29" fill={GLASS_RUBY} />
      <GLine x1={112} y1={70} x2={142} y2={70} c={GLASS_SAPPHIRE_LT} w={1.6} dash="3 3" />
      <GDot cx={108} cy={26} r={1.7} fill={GLASS_CREAM} />
      <GDot cx={182} cy={12} r={1.7} fill={GLASS_AMBER_PALE} />
    </GlassSceneRoot>
  );
}

export function GlassParkDisneyScene() {
  return (
    <GlassSceneRoot bg="#181233">
      <GDot cx={112} cy={14} r={1.8} fill={GLASS_CREAM} />
      <GDot cx={188} cy={10} r={1.8} fill={GLASS_AMBER_PALE} />
      <GDot cx={196} cy={30} r={1.6} fill={GLASS_CREAM} />
      <GLine x1={100} y1={104} x2={200} y2={104} c={GLASS_LEAD} w={2.4} />
      <GR x={114} y={64} width={68} height={40} fill={GLASS_SAPPHIRE} />
      <GR x={104} y={78} width={15} height={26} fill={GLASS_SAPPHIRE_LT} />
      <GR x={177} y={78} width={15} height={26} fill={GLASS_SAPPHIRE_LT} />
      <GPoly points="102,78 121,78 111,60" fill={GLASS_VIOLET} />
      <GPoly points="175,78 194,78 184,60" fill={GLASS_VIOLET} />
      <GR x={138} y={44} width={20} height={60} fill={GLASS_SAPPHIRE_LT} />
      <GPoly points="134,44 162,44 148,20" fill={GLASS_SAPPHIRE} />
      <GLine x1={148} y1={20} x2={148} y2={11} c={GLASS_AMBER} w={2} />
      <GPoly points="148,11 156,14 148,17" fill={GLASS_RUBY} />
      <GP d="M 141 104 L 141 86 Q 141 77 148 77 Q 155 77 155 86 L 155 104 Z" fill={GLASS_CREAM} />
      <GC cx={148} cy={58} r={4.5} fill={GLASS_AMBER} />
      <GR x={122} y={82} width={8} height={10} fill={GLASS_AMBER_PALE} />
      <GR x={166} y={82} width={8} height={10} fill={GLASS_AMBER_PALE} />
      <GPoly points="128,64 134,52 140,64" fill={GLASS_VIOLET_LT} />
      <GPoly points="156,64 162,52 168,64" fill={GLASS_VIOLET_LT} />
    </GlassSceneRoot>
  );
}

export function GlassParkUniversalScene() {
  return (
    <GlassSceneRoot bg="#0F1B2E">
      <GDot cx={110} cy={12} r={1.7} fill={GLASS_CREAM} />
      <GDot cx={190} cy={16} r={1.7} fill={GLASS_AMBER_PALE} />
      <GLine x1={100} y1={104} x2={200} y2={104} c={GLASS_LEAD} w={2.4} />
      <GC cx={148} cy={50} r={30} fill={GLASS_SAPPHIRE} />
      <GPoly points="124,36 138,30 142,40 130,46 122,42" fill={GLASS_EMERALD} />
      <GPoly points="156,62 170,58 174,68 162,74 154,68" fill={GLASS_EMERALD} />
      <GPoly points="160,28 172,32 166,40 156,36" fill={GLASS_EMERALD} />
      <GLine x1={120} y1={40} x2={176} y2={40} c={GLASS_SAPPHIRE_LT} w={1.6} />
      <GLine x1={120} y1={62} x2={176} y2={62} c={GLASS_SAPPHIRE_LT} w={1.6} />
      <GLine x1={148} y1={20} x2={148} y2={80} c={GLASS_SAPPHIRE_LT} w={1.4} />
      <GPoly points="124,90 172,90 180,104 116,104" fill={GLASS_AMBER} />
      <GLine x1={130} y1={90} x2={130} y2={82} c={GLASS_LEAD} w={2} />
      <GLine x1={166} y1={90} x2={166} y2={82} c={GLASS_LEAD} w={2} />
      <GDot cx={148} cy={97} r={2.4} fill={GLASS_RUBY} />
    </GlassSceneRoot>
  );
}

export function GlassParkLegolandScene() {
  return (
    <GlassSceneRoot bg="#1B2A1B">
      <GLine x1={100} y1={104} x2={200} y2={104} c={GLASS_LEAD} w={2.4} />
      <GR x={120} y={78} width={46} height={26} fill={GLASS_RUBY} />
      <GDot cx={130} cy={84} r={2} fill={GLASS_CREAM} />
      <GDot cx={143} cy={84} r={2} fill={GLASS_CREAM} />
      <GDot cx={156} cy={84} r={2} fill={GLASS_CREAM} />
      <GR x={126} y={54} width={46} height={24} fill={GLASS_AMBER} />
      <GDot cx={136} cy={60} r={2} fill={GLASS_CREAM} />
      <GDot cx={149} cy={60} r={2} fill={GLASS_CREAM} />
      <GDot cx={162} cy={60} r={2} fill={GLASS_CREAM} />
      <GR x={120} y={30} width={40} height={24} fill={GLASS_SAPPHIRE} />
      <GDot cx={130} cy={36} r={2} fill={GLASS_CREAM} />
      <GDot cx={142} cy={36} r={2} fill={GLASS_CREAM} />
      <GR x={132} y={10} width={28} height={20} fill={GLASS_EMERALD} />
      <GDot cx={140} cy={15} r={1.8} fill={GLASS_CREAM} />
      <GDot cx={152} cy={15} r={1.8} fill={GLASS_CREAM} />
      <GR x={96} y={88} width={22} height={16} fill={GLASS_SAPPHIRE_LT} />
      <GDot cx={103} cy={93} r={1.5} fill={GLASS_LEAD} />
      <GDot cx={111} cy={93} r={1.5} fill={GLASS_LEAD} />
      <GR x={170} y={88} width={22} height={16} fill={GLASS_VIOLET_LT} />
      <GDot cx={177} cy={93} r={1.5} fill={GLASS_CREAM} />
      <GDot cx={185} cy={93} r={1.5} fill={GLASS_CREAM} />
      <GR x={168} y={56} width={18} height={14} fill={GLASS_RUBY} />
      <GDot cx={177} cy={61} r={1.5} fill={GLASS_CREAM} />
    </GlassSceneRoot>
  );
}

export function GlassParkSeaworldScene() {
  return (
    <GlassSceneRoot bg="#0D2438">
      <GC cx={184} cy={16} r={8} fill={GLASS_AMBER_PALE} />
      <GPoly points="100,88 130,80 160,88 200,80 200,120 100,120" fill={GLASS_SAPPHIRE} />
      <GPoly points="100,98 135,92 170,98 200,92 200,120 100,120" fill={GLASS_SAPPHIRE_LT} />
      <GP d="M 108 68 Q 116 34 148 27 Q 178 22 192 42 Q 180 38 170 43 Q 176 55 170 67 Q 156 50 132 54 Q 114 57 108 68 Z" fill={GLASS_LEAD} />
      <GP d="M 112 66 Q 128 56 148 58 Q 138 66 124 68 Q 115 69 112 66 Z" fill={GLASS_CREAM} />
      <GDot cx={142} cy={38} r={2} fill={GLASS_CREAM} />
      <GLine x1={112} y1={78} x2={118} y2={70} c={GLASS_SAPPHIRE_LT} w={2} />
      <GLine x1={172} y1={78} x2={178} y2={70} c={GLASS_SAPPHIRE_LT} w={2} />
      <GDot cx={114} cy={80} r={1.8} fill={GLASS_SAPPHIRE_LT} />
      <GDot cx={124} cy={76} r={1.5} fill={GLASS_CREAM} />
      <GDot cx={178} cy={80} r={1.8} fill={GLASS_SAPPHIRE_LT} />
    </GlassSceneRoot>
  );
}

export function GlassParkGenericScene() {
  return (
    <GlassSceneRoot bg="#221335">
      <GLine x1={100} y1={104} x2={200} y2={104} c={GLASS_LEAD} w={2.4} />
      <GC cx={148} cy={48} r={35} fill="#221335" w={3.2} />
      <GLine x1={148} y1={13} x2={148} y2={83} c={GLASS_AMBER} w={1.8} />
      <GLine x1={113} y1={48} x2={183} y2={48} c={GLASS_AMBER} w={1.8} />
      <GLine x1={123} y1={23} x2={173} y2={73} c={GLASS_AMBER_LT} w={1.5} />
      <GLine x1={173} y1={23} x2={123} y2={73} c={GLASS_AMBER_LT} w={1.5} />
      <GR x={142} y={6} width={12} height={9} rx={2} fill={GLASS_RUBY} />
      <GR x={106} y={42} width={11} height={9} rx={2} fill={GLASS_EMERALD} />
      <GR x={179} y={42} width={11} height={9} rx={2} fill={GLASS_SAPPHIRE} />
      <GR x={142} y={81} width={12} height={9} rx={2} fill={GLASS_VIOLET_LT} />
      <GR x={120} y={14} width={10} height={8} rx={2} fill={GLASS_AMBER_PALE} />
      <GR x={166} y={74} width={10} height={8} rx={2} fill={GLASS_RUBY} />
      <GC cx={148} cy={48} r={6} fill={GLASS_AMBER} />
      <GLine x1={148} y1={83} x2={134} y2={104} c={GLASS_SAPPHIRE_LT} w={2.4} />
      <GLine x1={148} y1={83} x2={162} y2={104} c={GLASS_SAPPHIRE_LT} w={2.4} />
      <GPoly points="102,104 106,80 118,80 120,104" fill={GLASS_VIOLET} />
      <GPoly points="102,80 120,80 111,66" fill={GLASS_RUBY} />
    </GlassSceneRoot>
  );
}

export function GlassMovieGenericScene() {
  return (
    <GlassSceneRoot bg="#17102A">
      <GR x={104} y={12} width={90} height={56} rx={2} fill={GLASS_CREAM} />
      <GPoly points="110,58 128,32 142,48 154,36 186,58" fill={GLASS_SAPPHIRE} />
      <GC cx={176} cy={24} r={4} fill={GLASS_AMBER} />
      <GLine x1={100} y1={104} x2={200} y2={104} c={GLASS_LEAD} w={2.4} />
      <GR x={106} y={88} width={18} height={16} fill={GLASS_RUBY} />
      <GC cx={115} cy={83} r={6} fill={GLASS_VIOLET} />
      <GR x={136} y={88} width={20} height={16} fill={GLASS_RUBY} />
      <GC cx={146} cy={83} r={6} fill={GLASS_SAPPHIRE} />
      <GR x={168} y={88} width={18} height={16} fill={GLASS_RUBY} />
      <GC cx={177} cy={83} r={6} fill={GLASS_EMERALD} />
      <GR x={88} y={76} width={16} height={20} fill={GLASS_CREAM} />
      <GLine x1={88} y1={82} x2={104} y2={82} c={GLASS_RUBY} w={2} />
      <GDot cx={96} cy={72} r={2} fill={GLASS_AMBER_PALE} />
      <GDot cx={92} cy={68} r={1.7} fill={GLASS_CREAM} />
      <GDot cx={100} cy={69} r={1.7} fill={GLASS_AMBER} />
    </GlassSceneRoot>
  );
}

export function GlassTheaterGenericScene() {
  return (
    <GlassSceneRoot bg="#1C0F1E">
      <GLine x1={100} y1={102} x2={200} y2={102} c={GLASS_LEAD} w={2.4} />
      <GR x={104} y={8} width={92} height={8} fill={GLASS_AMBER} />
      <GP d="M 106 8 Q 102 50 108 94 L 126 94 Q 116 50 118 8 Z" fill={GLASS_RUBY} />
      <GP d="M 194 8 Q 198 50 192 94 L 174 94 Q 184 50 182 8 Z" fill={GLASS_RUBY} />
      <GP d="M 118 8 Q 122 50 128 94 L 136 94 Q 130 50 130 8 Z" fill="#7E1F2E" />
      <GP d="M 182 8 Q 178 50 172 94 L 164 94 Q 170 50 170 8 Z" fill="#7E1F2E" />
      <GPoly points="138,16 162,16 168,78 132,78" fill={GLASS_AMBER_PALE} o={0.4} />
      <GC cx={150} cy={66} r={11} fill={GLASS_CREAM} />
      <GDot cx={146} cy={63} r={1.6} fill={GLASS_LEAD} />
      <GDot cx={154} cy={63} r={1.6} fill={GLASS_LEAD} />
      <GP d="M 143 72 Q 150 76 157 72" fill={GLASS_LEAD} />
      <GDot cx={118} cy={98} r={2} fill={GLASS_AMBER} />
      <GDot cx={134} cy={99} r={2} fill={GLASS_AMBER} />
      <GDot cx={150} cy={99} r={2} fill={GLASS_AMBER} />
      <GDot cx={166} cy={99} r={2} fill={GLASS_AMBER} />
      <GDot cx={182} cy={98} r={2} fill={GLASS_AMBER} />
    </GlassSceneRoot>
  );
}

export function GlassMvResidentEvilScene() {
  return (
    <GlassSceneRoot bg="#12100E">
      <GLine x1={100} y1={104} x2={200} y2={104} c={GLASS_LEAD} w={2.4} />
      <GR x={110} y={24} width={64} height={80} fill="#2E2A33" />
      <GP d="M 116 24 L 123 12 L 131 21 L 139 10 L 147 21 L 156 13 L 164 24" fill={GLASS_LEAD} />
      <GP d="M 120 104 L 120 60 Q 120 46 142 46 Q 164 46 164 60 L 164 104 Z" fill="#1B1726" />
      <GR x={128} y={30} width={12} height={12} fill={GLASS_AMBER} />
      <GLine x1={128} y1={30} x2={140} y2={42} c={GLASS_LEAD} w={1.6} />
      <GLine x1={140} y1={30} x2={128} y2={42} c={GLASS_LEAD} w={1.6} />
      <GR x={146} y={30} width={12} height={12} fill={GLASS_AMBER_PALE} />
      <GLine x1={146} y1={36} x2={158} y2={36} c={GLASS_LEAD} w={1.6} />
      <GDot cx={158} cy={78} r={2.2} fill={GLASS_RUBY} />
      <GR x={180} y={66} width={14} height={38} fill={GLASS_EMERALD} />
      <GR x={180} y={60} width={14} height={7} fill="#3E2723" />
      <GDot cx={187} cy={80} r={2.4} fill={GLASS_AMBER_PALE} />
      <GLine x1={142} y1={24} x2={142} y2={15} c={GLASS_RUBY} w={2} />
      <GDot cx={142} cy={12} r={2.2} fill={GLASS_RUBY} />
      <GP d="M 102 104 Q 106 90 102 82" fill={GLASS_VIOLET} />
      <GLine x1={103} y1={90} x2={97} y2={84} c={GLASS_VIOLET} w={1.8} />
    </GlassSceneRoot>
  );
}

export function GlassMvBuddyScene() {
  return (
    <GlassSceneRoot bg="#17301F">
      <GC cx={184} cy={17} r={9} fill={GLASS_AMBER} />
      <GPoly points="100,104 132,84 168,80 200,86 200,104" fill={GLASS_EMERALD} />
      <GLine x1={100} y1={104} x2={200} y2={104} c={GLASS_LEAD} w={2.4} />
      <GP d="M 108 100 Q 132 86 156 83" fill={GLASS_AMBER_PALE} />
      <GFigure x={132} y={88} s={0.92} fill={GLASS_VIOLET} pose="stand" />
      <GFigure x={160} y={90} s={0.82} fill={GLASS_RUBY} pose="stand" />
      <GLine x1={182} y1={90} x2={182} y2={54} c="#5A3A22" w={3} />
      <GC cx={182} cy={46} r={11} fill={GLASS_EMERALD} />
      <GC cx={172} cy={52} r={8} fill={GLASS_EMERALD} />
      <GC cx={192} cy={52} r={8} fill={GLASS_EMERALD} />
      <GDot cx={178} cy={44} r={2} fill={GLASS_RUBY} />
      <GDot cx={188} cy={50} r={2} fill={GLASS_RUBY} />
      <GPoly points="104,52 118,46 124,52 112,58" fill={GLASS_CREAM} />
    </GlassSceneRoot>
  );
}

export function GlassMvBlackPhoneScene() {
  return (
    <GlassSceneRoot bg="#3D0F18">
      <GLine x1={100} y1={104} x2={200} y2={104} c={GLASS_LEAD} w={2.4} />
      <GLine x1={156} y1={4} x2={156} y2={18} c={GLASS_LEAD} w={2.2} />
      <GC cx={156} cy={27} r={8} fill={GLASS_CREAM_LT} />
      <GDot cx={156} cy={27} r={2} fill={GLASS_LEAD} />
      <GR x={104} y={32} width={42} height={58} rx={4} fill={GLASS_LEAD} />
      <GPoly points="102,32 108,21 140,21 148,32" fill={GLASS_LEAD} />
      <GC cx={115} cy={26} r={3.4} fill="#3A3428" />
      <GC cx={133} cy={26} r={3.4} fill="#3A3428" />
      <GC cx={125} cy={58} r={12} fill={GLASS_CREAM} />
      <GDot cx={125} cy={48} r={1.6} fill={GLASS_LEAD} />
      <GDot cx={132} cy={52} r={1.6} fill={GLASS_LEAD} />
      <GDot cx={134} cy={59} r={1.6} fill={GLASS_LEAD} />
      <GDot cx={131} cy={66} r={1.6} fill={GLASS_LEAD} />
      <GDot cx={124} cy={68} r={1.6} fill={GLASS_LEAD} />
      <GDot cx={117} cy={65} r={1.6} fill={GLASS_LEAD} />
      <GDot cx={115} cy={58} r={1.6} fill={GLASS_LEAD} />
      <GDot cx={118} cy={51} r={1.6} fill={GLASS_LEAD} />
      <GC cx={125} cy={58} r={2.6} fill={GLASS_RUBY} w={1.2} />
      <GLine x1={146} y1={44} x2={158} y2={50} c={GLASS_LEAD} w={2.4} />
      <GLine x1={158} y1={50} x2={150} y2={60} c={GLASS_LEAD} w={2.4} />
      <GLine x1={150} y1={60} x2={160} y2={68} c={GLASS_LEAD} w={2.4} />
      <GLine x1={160} y1={68} x2={152} y2={78} c={GLASS_LEAD} w={2.4} />
      <GLine x1={152} y1={78} x2={162} y2={86} c={GLASS_LEAD} w={2.4} />
      <GLine x1={162} y1={86} x2={156} y2={96} c={GLASS_LEAD} w={2.4} />
      <GR x={172} y={66} width={22} height={28} fill={GLASS_LEAD} o={0.55} />
      <GLine x1={176} y1={76} x2={190} y2={76} c={GLASS_CREAM} w={1.4} />
      <GLine x1={176} y1={84} x2={186} y2={84} c={GLASS_CREAM} w={1.4} />
    </GlassSceneRoot>
  );
}

export function GlassMvBackroomsScene() {
  return (
    <GlassSceneRoot bg="#2E2410">
      <GPoly points="104,10 200,4 200,116 104,110" fill="#3A2C12" />
      <GR x={106} y={16} width={88} height={82} fill={GLASS_AMBER_PALE} />
      <GR x={116} y={24} width={68} height={66} fill={GLASS_AMBER} />
      <GR x={126} y={31} width={48} height={52} fill={GLASS_AMBER_PALE} />
      <GR x={136} y={38} width={28} height={38} fill={GLASS_CREAM} />
      <GR x={108} y={6} width={30} height={9} fill={GLASS_CREAM_LT} />
      <GR x={146} y={4} width={26} height={8} fill={GLASS_CREAM} />
      <GLine x1={106} y1={62} x2={194} y2={56} c={GLASS_LEAD} w={1.6} />
      <GP d="M 142 90 L 142 68 Q 142 61 148 61 Q 154 61 154 68 L 154 90 Z" fill={GLASS_LEAD} o={0.6} />
      <GLine x1={104} y1={104} x2={200} y2={104} c={GLASS_LEAD} w={2.4} />
    </GlassSceneRoot>
  );
}

export function GlassMvExit8Scene() {
  return (
    <GlassSceneRoot bg="#0E1A17">
      <GR x={102} y={12} width={94} height={92} fill="#17352C" />
      <GR x={112} y={22} width={74} height={72} fill="#1E4A3C" />
      <GR x={122} y={31} width={54} height={54} fill={GLASS_SAPPHIRE} />
      <GR x={132} y={40} width={34} height={36} fill="#12283F" />
      <GR x={120} y={4} width={56} height={15} rx={2} fill={GLASS_EMERALD} />
      <GDot cx={132} cy={11} r={2.6} fill={GLASS_CREAM} />
      <GPoly points="140,8 152,11 140,15" fill={GLASS_CREAM} />
      <GLine x1={158} y1={11} x2={168} y2={11} c={GLASS_CREAM} w={2.4} />
      <GLine x1={112} y1={52} x2={122} y2={52} c={GLASS_CREAM} w={1.4} />
      <GLine x1={112} y1={66} x2={122} y2={66} c={GLASS_CREAM} w={1.4} />
      <GLine x1={176} y1={52} x2={186} y2={52} c={GLASS_CREAM} w={1.4} />
      <GLine x1={176} y1={66} x2={186} y2={66} c={GLASS_CREAM} w={1.4} />
      <GR x={180} y={42} width={13} height={22} fill={GLASS_AMBER_PALE} />
      <GFigure x={108} y={100} s={0.6} fill={GLASS_VIOLET} pose="stand" />
      <GLine x1={104} y1={98} x2={196} y2={92} c={GLASS_AMBER} w={1.8} dash="6 4" />
    </GlassSceneRoot>
  );
}

export function GlassMvDeadpoolScene() {
  return (
    <GlassSceneRoot bg="#1B1B22">
      <GLine x1={100} y1={104} x2={200} y2={104} c={GLASS_LEAD} w={2.4} />
      <GLine x1={112} y1={26} x2={176} y2={88} c={GLASS_SAPPHIRE_LT} w={3} />
      <GLine x1={184} y1={24} x2={116} y2={90} c={GLASS_SAPPHIRE_LT} w={3} />
      <GLine x1={112} y1={26} x2={104} y2={15} c={GLASS_LEAD} w={3} />
      <GLine x1={184} y1={24} x2={192} y2={13} c={GLASS_LEAD} w={3} />
      <GP d="M 124 36 Q 124 14 148 13 Q 172 14 172 36 Q 172 64 160 80 Q 148 89 136 80 Q 124 64 124 36 Z" fill={GLASS_RUBY} />
      <GP d="M 129 38 Q 129 30 137 30 Q 144 30 144 39 Q 144 47 137 47 Q 130 47 129 38 Z" fill={GLASS_CREAM} />
      <GP d="M 152 39 Q 152 30 159 30 Q 167 30 167 38 Q 166 47 159 47 Q 152 47 152 39 Z" fill={GLASS_CREAM} />
      <GDot cx={137} cy={39} r={1.8} fill={GLASS_LEAD} />
      <GDot cx={159} cy={39} r={1.8} fill={GLASS_LEAD} />
      <GLine x1={148} y1={13} x2={148} y2={36} c={GLASS_LEAD} w={1.8} />
      <GP d="M 134 69 Q 148 74 162 69" fill={GLASS_LEAD} />
      <GC cx={116} cy={95} r={7} fill={GLASS_AMBER} />
      <GDot cx={116} cy={95} r={2.4} fill={GLASS_RUBY} />
      <GDot cx={186} cy={96} r={2} fill={GLASS_RUBY} />
    </GlassSceneRoot>
  );
}

export function GlassMvFnafScene() {
  return (
    <GlassSceneRoot bg="#191024">
      <GLine x1={100} y1={104} x2={200} y2={104} c={GLASS_LEAD} w={2.4} />
      <GC cx={118} cy={26} r={10} fill="#8A5A22" />
      <GC cx={172} cy={26} r={10} fill="#8A5A22" />
      <GC cx={118} cy={26} r={4.5} fill={GLASS_AMBER_PALE} w={1.4} />
      <GC cx={172} cy={26} r={4.5} fill={GLASS_AMBER_PALE} w={1.4} />
      <GR x={130} y={3} width={30} height={12} rx={1} fill={GLASS_LEAD} />
      <GR x={122} y={15} width={46} height={5} fill={GLASS_LEAD} />
      <GP d="M 114 54 Q 114 27 145 26 Q 176 27 176 54 Q 176 80 160 88 Q 145 93 130 88 Q 114 80 114 54 Z" fill="#A66A2A" />
      <GC cx={131} cy={49} r={4.6} fill={GLASS_AMBER} />
      <GC cx={159} cy={49} r={4.6} fill={GLASS_AMBER} />
      <GDot cx={131} cy={49} r={1.6} fill={GLASS_LEAD} />
      <GDot cx={159} cy={49} r={1.6} fill={GLASS_LEAD} />
      <GP d="M 128 67 Q 145 61 162 67 Q 162 78 145 79 Q 128 78 128 67 Z" fill={GLASS_AMBER_PALE} />
      <GC cx={145} cy={66} r={2.4} fill={GLASS_LEAD} w={1.2} />
      <GR x={134} y={73} width={4} height={5} fill={GLASS_CREAM} w={1} />
      <GR x={142} y={74} width={4} height={5} fill={GLASS_CREAM} w={1} />
      <GR x={150} y={73} width={4} height={5} fill={GLASS_CREAM} w={1} />
      <GPoly points="132,94 145,88 145,100" fill={GLASS_RUBY} />
      <GPoly points="158,94 145,88 145,100" fill={GLASS_RUBY} />
      <GDot cx={104} cy={34} r={1.8} fill={GLASS_VIOLET_LT} />
      <GDot cx={188} cy={34} r={1.8} fill={GLASS_VIOLET_LT} />
    </GlassSceneRoot>
  );
}

export function GlassMvIronLungScene() {
  return (
    <GlassSceneRoot bg="#0C1420">
      <GC cx={148} cy={52} r={36} fill={GLASS_RUBY} />
      <GC cx={148} cy={52} r={29} fill="#0E2A3F" />
      <GDot cx={148} cy={19} r={2} fill={GLASS_CREAM} />
      <GDot cx={171} cy={28} r={2} fill={GLASS_CREAM} />
      <GDot cx={179} cy={52} r={2} fill={GLASS_CREAM} />
      <GDot cx={171} cy={76} r={2} fill={GLASS_CREAM} />
      <GDot cx={148} cy={85} r={2} fill={GLASS_CREAM} />
      <GDot cx={125} cy={76} r={2} fill={GLASS_CREAM} />
      <GDot cx={117} cy={52} r={2} fill={GLASS_CREAM} />
      <GDot cx={125} cy={28} r={2} fill={GLASS_CREAM} />
      <GP d="M 124 62 Q 132 55 140 62 Q 148 69 156 62 Q 164 55 172 62 L 172 78 L 124 78 Z" fill={GLASS_SAPPHIRE} />
      <GP d="M 126 44 Q 136 37 146 44 Q 156 50 168 41" fill={GLASS_SAPPHIRE_LT} />
      <GC cx={104} cy={28} r={9} fill="#2E2A33" />
      <GLine x1={104} y1={28} x2={110} y2={22} c={GLASS_AMBER} w={2} />
      <GDot cx={104} cy={28} r={1.6} fill={GLASS_AMBER} />
      <GR x={94} y={56} width={18} height={24} fill="#2E2A33" />
      <GDot cx={100} cy={64} r={1.8} fill={GLASS_EMERALD} />
      <GDot cx={107} cy={64} r={1.8} fill={GLASS_RUBY} />
      <GLine x1={104} y1={106} x2={200} y2={102} c={GLASS_LEAD} w={2.2} />
    </GlassSceneRoot>
  );
}

export function GlassMvNimrodsScene() {
  return (
    <GlassSceneRoot bg="#0F2417">
      <GP d="M 184 6 Q 175 15 184 27 Q 165 25 163 14 Q 165 3 184 6 Z" fill={GLASS_CREAM_LT} />
      <GDot cx={110} cy={12} r={1.6} fill={GLASS_CREAM} />
      <GDot cx={136} cy={7} r={1.5} fill={GLASS_AMBER_PALE} />
      <GLine x1={100} y1={104} x2={200} y2={104} c={GLASS_LEAD} w={2.4} />
      <GPoly points="126,104 131,54 155,54 160,104" fill={GLASS_EMERALD} />
      <GR x={120} y={38} width={46} height={16} fill="#1F5C3D" />
      <GC cx={143} cy={46} r={5} fill={GLASS_AMBER} />
      <GLine x1={128} y1={68} x2={158} y2={68} c={GLASS_LEAD} w={1.6} />
      <GLine x1={130} y1={86} x2={156} y2={86} c={GLASS_LEAD} w={1.6} />
      <GLine x1={143} y1={38} x2={143} y2={22} c={GLASS_AMBER} w={2} />
      <GLine x1={143} y1={22} x2={172} y2={34} c={GLASS_AMBER} w={1.6} dash="3 3" />
      <GDot cx={176} cy={36} r={2.6} fill={GLASS_RUBY} />
      <GPoly points="102,104 108,66 114,104" fill="#1F5C3D" />
      <GPoly points="100,78 116,78 108,56" fill={GLASS_EMERALD} />
      <GPoly points="172,104 179,60 186,104" fill="#1F5C3D" />
      <GPoly points="170,74 188,74 179,50" fill={GLASS_EMERALD} />
    </GlassSceneRoot>
  );
}

export function GlassMvIdiotsScene() {
  return (
    <GlassSceneRoot bg="#2B1E3F">
      <GC cx={186} cy={15} r={8} fill={GLASS_AMBER_PALE} />
      <GLine x1={100} y1={104} x2={200} y2={104} c={GLASS_LEAD} w={2.4} />
      <GPoly points="126,8 129,16 137,16 131,21 133,29 126,24 119,29 121,21 115,16 123,16" fill={GLASS_AMBER} />
      <GPoly points="168,30 171,37 178,37 173,42 175,49 168,45 162,49 163,42 158,37 165,37" fill={GLASS_RUBY} />
      <GPoly points="108,32 111,39 118,39 113,44 115,51 108,47 102,51 103,44 98,39 105,39" fill={GLASS_SAPPHIRE_LT} />
      <GFigure x={118} y={102} s={0.85} fill={GLASS_RUBY} pose="stand" />
      <GFigure x={146} y={104} s={0.95} fill={GLASS_VIOLET} pose="armsUp" />
      <GFigure x={174} y={102} s={0.85} fill={GLASS_EMERALD} pose="stand" />
      <GDot cx={132} cy={78} r={2} fill={GLASS_AMBER} />
      <GDot cx={160} cy={72} r={2} fill={GLASS_AMBER_PALE} />
    </GlassSceneRoot>
  );
}

export function GlassMvNobodyScene() {
  return (
    <GlassSceneRoot bg="#1E1B26">
      <GLine x1={100} y1={104} x2={200} y2={104} c={GLASS_LEAD} w={2.4} />
      <GR x={106} y={18} width={88} height={86} fill={GLASS_CREAM} />
      <GR x={114} y={26} width={72} height={70} fill={GLASS_CREAM_LT} />
      <GR x={168} y={34} width={12} height={18} fill={GLASS_SAPPHIRE_LT} />
      <GLine x1={174} y1={34} x2={174} y2={52} c={GLASS_LEAD} w={1.4} />
      <GLine x1={168} y1={43} x2={180} y2={43} c={GLASS_LEAD} w={1.4} />
      <GP d="M 118 96 L 118 66 Q 118 58 124 58 Q 130 58 130 66 L 130 96 Z" fill={GLASS_SAPPHIRE} o={0.35} />
      <GFigure x={150} y={100} s={0.9} fill={GLASS_VIOLET} pose="stand" />
      <GDot cx={150} cy={40} r={2.2} fill={GLASS_AMBER} />
      <GLine x1={150} y1={26} x2={150} y2={36} c={GLASS_LEAD} w={1.6} />
    </GlassSceneRoot>
  );
}

export function GlassMvMarioScene() {
  return (
    <GlassSceneRoot bg="#12294D">
      <GPoly points="106,24 114,16 124,22 132,14 142,21 148,17 150,25 104,25" fill={GLASS_CREAM} />
      <GLine x1={100} y1={104} x2={200} y2={104} c={GLASS_LEAD} w={2.4} />
      <GP d="M 112 52 Q 112 38 126 37 Q 140 38 140 52 L 144 52 L 144 57 L 108 57 L 108 52 Z" fill={GLASS_RUBY} />
      <GC cx={126} cy={47} r={5.5} fill={GLASS_CREAM} />
      <GDot cx={126} cy={47} r={2.2} fill={GLASS_RUBY} />
      <GC cx={119} cy={64} r={3} fill={GLASS_LEAD} w={1.2} />
      <GC cx={133} cy={64} r={3} fill={GLASS_LEAD} w={1.2} />
      <GP d="M 116 72 Q 126 77 136 72" fill={GLASS_LEAD} />
      <GR x={156} y={66} width={36} height={38} fill={GLASS_EMERALD} />
      <GR x={150} y={56} width={48} height={12} rx={2} fill="#3FA06B" />
      <GR x={104} y={30} width={17} height={17} fill={GLASS_AMBER} />
      <GDot cx={112} cy={38} r={2.2} fill={GLASS_CREAM} />
      <GR x={150} y={24} width={17} height={17} fill={GLASS_AMBER_LT} />
      <GDot cx={158} cy={32} r={2.2} fill={GLASS_CREAM} />
      <GC cx={180} cy={36} r={8} fill={GLASS_AMBER} />
      <GDot cx={180} cy={36} r={3} fill={GLASS_AMBER_PALE} />
      <GPoly points="102,104 108,86 116,92 122,84 126,104" fill={GLASS_EMERALD} />
    </GlassSceneRoot>
  );
}

export function GlassMvToyStoryScene() {
  return (
    <GlassSceneRoot bg="#20304D">
      <GR x={132} y={8} width={54} height={42} fill={GLASS_SAPPHIRE} />
      <GLine x1={159} y1={8} x2={159} y2={50} c={GLASS_LEAD} w={1.6} />
      <GLine x1={132} y1={29} x2={186} y2={29} c={GLASS_LEAD} w={1.6} />
      <GDot cx={144} cy={18} r={1.8} fill={GLASS_AMBER} />
      <GDot cx={172} cy={40} r={1.8} fill={GLASS_AMBER_PALE} />
      <GP d="M 168 10 Q 162 16 168 23 Q 161 21 161 15 Q 161 9 168 10 Z" fill={GLASS_CREAM_LT} />
      <GLine x1={100} y1={104} x2={200} y2={104} c={GLASS_LEAD} w={2.4} />
      <GC cx={124} cy={82} r={15} fill={GLASS_RUBY} />
      <GP d="M 112 74 Q 124 68 136 74 L 136 84 Q 124 78 112 84 Z" fill={GLASS_CREAM} />
      <GPoly points="124,76 126,81 131,81 127,84 129,89 124,86 119,89 121,84 117,81 122,81" fill={GLASS_AMBER} />
      <GP d="M 142 78 Q 142 66 156 65 Q 170 66 170 78 L 176 82 Q 178 86 172 86 L 140 86 Q 134 86 136 82 Z" fill="#8A5A22" />
      <GR x={146} y={76} width={20} height={5} fill={GLASS_RUBY} />
      <GR x={92} y={88} width={15} height={15} fill={GLASS_SAPPHIRE_LT} />
      <GDot cx={99} cy={95} r={2} fill={GLASS_RUBY} />
      <GR x={182} y={88} width={14} height={14} fill={GLASS_EMERALD} />
      <GDot cx={189} cy={95} r={2} fill={GLASS_AMBER} />
      <GPoly points="150,104 156,92 168,92 174,104" fill={GLASS_VIOLET} />
    </GlassSceneRoot>
  );
}

export function GlassMvZootopiaScene() {
  return (
    <GlassSceneRoot bg="#14213D">
      <GDot cx={112} cy={8} r={1.7} fill={GLASS_AMBER} />
      <GDot cx={150} cy={5} r={1.7} fill={GLASS_CREAM} />
      <GDot cx={186} cy={9} r={1.7} fill={GLASS_AMBER_PALE} />
      <GLine x1={100} y1={104} x2={200} y2={104} c={GLASS_LEAD} w={2.4} />
      <GR x={102} y={50} width={17} height={54} fill={GLASS_VIOLET} />
      <GR x={122} y={30} width={21} height={74} fill={GLASS_SAPPHIRE} />
      <GPoly points="122,30 143,30 132,16" fill={GLASS_SAPPHIRE_LT} />
      <GR x={146} y={44} width={17} height={60} fill={GLASS_VIOLET_LT} />
      <GR x={166} y={22} width={20} height={82} fill={GLASS_SAPPHIRE_LT} />
      <GC cx={176} cy={15} r={6} fill={GLASS_AMBER} />
      <GDot cx={110} cy={62} r={1.7} fill={GLASS_AMBER_PALE} />
      <GDot cx={110} cy={76} r={1.7} fill={GLASS_CREAM} />
      <GDot cx={132} cy={48} r={1.7} fill={GLASS_AMBER} />
      <GDot cx={132} cy={64} r={1.7} fill={GLASS_AMBER_PALE} />
      <GDot cx={154} cy={58} r={1.7} fill={GLASS_AMBER} />
      <GDot cx={176} cy={40} r={1.7} fill={GLASS_CREAM} />
      <GDot cx={176} cy={58} r={1.7} fill={GLASS_AMBER} />
      <GDot cx={176} cy={76} r={1.7} fill={GLASS_CREAM} />
      <GPoly points="126,34 128,20 132,32" fill={GLASS_CREAM} />
      <GPoly points="136,34 140,21 141,33" fill={GLASS_CREAM} />
      <GPoly points="188,96 196,82 198,96" fill={GLASS_AMBER} />
      <GPoly points="192,82 190,74 196,80" fill={GLASS_EMERALD} />
    </GlassSceneRoot>
  );
}

export function GlassMvSpidermanScene() {
  return (
    <GlassSceneRoot bg="#101A33">
      <GLine x1={100} y1={104} x2={200} y2={104} c={GLASS_LEAD} w={2.4} />
      <GR x={102} y={60} width={24} height={44} fill={GLASS_SAPPHIRE} o={0.55} />
      <GR x={174} y={54} width={24} height={50} fill={GLASS_SAPPHIRE} o={0.55} />
      <GDot cx={110} cy={70} r={1.6} fill={GLASS_AMBER_PALE} />
      <GDot cx={118} cy={84} r={1.6} fill={GLASS_AMBER} />
      <GDot cx={182} cy={66} r={1.6} fill={GLASS_AMBER_PALE} />
      <GDot cx={190} cy={80} r={1.6} fill={GLASS_AMBER} />
      <GLine x1={108} y1={6} x2={136} y2={38} c={GLASS_CREAM} w={1.2} />
      <GLine x1={108} y1={6} x2={122} y2={44} c={GLASS_CREAM} w={1.2} />
      <GLine x1={108} y1={6} x2={156} y2={32} c={GLASS_CREAM} w={1.2} />
      <GLine x1={108} y1={6} x2={114} y2={48} c={GLASS_CREAM} w={1.2} />
      <GLine x1={122} y1={44} x2={156} y2={32} c={GLASS_CREAM} w={1.2} />
      <GLine x1={136} y1={38} x2={156} y2={32} c={GLASS_CREAM} w={1.2} />
      <GC cx={108} cy={6} r={3} fill={GLASS_RUBY} w={1.6} />
      <GP d="M 128 34 Q 128 12 150 11 Q 172 12 172 34 Q 172 58 160 72 Q 150 79 140 72 Q 128 58 128 34 Z" fill={GLASS_RUBY} />
      <GP d="M 133 36 Q 133 27 141 27 Q 148 27 148 36 Q 148 44 141 44 Q 134 44 133 36 Z" fill={GLASS_CREAM} />
      <GP d="M 152 36 Q 152 27 159 27 Q 167 27 167 35 Q 166 44 159 44 Q 152 44 152 36 Z" fill={GLASS_CREAM} />
      <GLine x1={150} y1={11} x2={150} y2={30} c={GLASS_LEAD} w={1.5} />
      <GLine x1={134} y1={18} x2={166} y2={18} c={GLASS_LEAD} w={1.3} />
      <GLine x1={130} y1={50} x2={170} y2={50} c={GLASS_LEAD} w={1.3} />
      <GDot cx={150} cy={62} r={2.2} fill={GLASS_LEAD} />
    </GlassSceneRoot>
  );
}

export function GlassMvAvengersDoomsdayScene() {
  return (
    <GlassSceneRoot bg="#0E1F16">
      <GLine x1={100} y1={104} x2={200} y2={104} c={GLASS_LEAD} w={2.4} />
      <GPoly points="102,104 108,72 116,86 124,58 132,78" fill="#233026" />
      <GPoly points="176,104 182,78 188,90 196,66 200,80 200,104" fill="#233026" />
      <GR x={134} y={44} width={38} height={60} fill="#2E2A33" />
      <GPoly points="130,44 176,44 153,24" fill="#3A3542" />
      <GR x={146} y={15} width={14} height={13} fill="#2E2A33" />
      <GLine x1={153} y1={24} x2={153} y2={8} c={GLASS_EMERALD} w={2} />
      <GP d="M 132 104 L 136 62 Q 138 48 153 46 Q 168 48 170 62 L 174 104 Z" fill={GLASS_EMERALD} />
      <GP d="M 140 62 Q 140 46 153 45 Q 166 46 166 62 Q 166 74 153 75 Q 140 74 140 62 Z" fill={GLASS_SAPPHIRE_LT} />
      <GDot cx={147} cy={59} r={2} fill={GLASS_AMBER} />
      <GDot cx={159} cy={59} r={2} fill={GLASS_AMBER} />
      <GLine x1={146} y1={68} x2={160} y2={68} c={GLASS_LEAD} w={1.8} />
      <GLine x1={153} y1={75} x2={153} y2={88} c={GLASS_LEAD} w={1.8} />
      <GDot cx={153} cy={94} r={2.6} fill={GLASS_RUBY} />
      <GPoly points="116,30 122,18 124,30 132,16" fill={GLASS_AMBER} />
      <GDot cx={188} cy={22} r={1.8} fill={GLASS_CREAM} />
    </GlassSceneRoot>
  );
}

export function GlassMvShrekScene() {
  return (
    <GlassSceneRoot bg="#1D3316">
      <GC cx={182} cy={20} r={11} fill={GLASS_AMBER_PALE} />
      <GPoly points="98,80 140,72 200,78 200,120 98,120" fill={GLASS_SAPPHIRE} />
      <GPoly points="98,94 150,88 200,92 200,120 98,120" fill={GLASS_SAPPHIRE_LT} />
      <GLine x1={100} y1={106} x2={200} y2={106} c={GLASS_LEAD} w={2.2} />
      <GC cx={140} cy={46} r={19} fill={GLASS_EMERALD} />
      <GPoly points="122,38 108,30 120,26 126,32" fill={GLASS_EMERALD} />
      <GPoly points="158,38 172,30 160,26 154,32" fill={GLASS_EMERALD} />
      <GC cx={111} cy={29} r={3} fill={GLASS_AMBER_PALE} w={1.2} />
      <GC cx={169} cy={29} r={3} fill={GLASS_AMBER_PALE} w={1.2} />
      <GC cx={133} cy={43} r={2.6} fill={GLASS_CREAM} w={1.2} />
      <GC cx={147} cy={43} r={2.6} fill={GLASS_CREAM} w={1.2} />
      <GDot cx={133} cy={43} r={1.2} fill={GLASS_LEAD} />
      <GDot cx={147} cy={43} r={1.2} fill={GLASS_LEAD} />
      <GP d="M 131 56 Q 140 60 149 56" fill={GLASS_LEAD} />
      <GC cx={140} cy={51} r={2.2} fill="#3FA06B" w={1.2} />
      <GR x={168} y={62} width={26} height={32} fill="#5A3A22" />
      <GPoly points="164,62 198,62 181,48" fill="#3A2317" />
      <GDot cx={186} cy={78} r={2} fill={GLASS_AMBER} />
      <GDot cx={118} cy={88} r={2.2} fill={GLASS_EMERALD} />
      <GDot cx={158} cy={98} r={2.2} fill={GLASS_EMERALD} />
      <GLine x1={106} y1={70} x2={106} y2={52} c={GLASS_EMERALD} w={2.4} />
      <GC cx={106} cy={48} r={5} fill={GLASS_EMERALD} />
    </GlassSceneRoot>
  );
}

export function GlassMvHungerGamesScene() {
  return (
    <GlassSceneRoot bg="#201410">
      <GLine x1={100} y1={104} x2={200} y2={104} c={GLASS_LEAD} w={2.4} />
      <GPoly points="102,104 108,56 114,104" fill={GLASS_EMERALD} />
      <GPoly points="100,70 116,70 108,50" fill="#1F5C3D" />
      <GPoly points="184,104 191,48 198,104" fill={GLASS_EMERALD} />
      <GPoly points="182,64 200,64 191,42" fill="#1F5C3D" />
      <GC cx={148} cy={38} r={21} fill={GLASS_AMBER} />
      <GC cx={148} cy={38} r={15} fill="#201410" w={2} />
      <GP d="M 134 44 Q 140 28 152 30 Q 146 34 148 39 Q 156 33 160 39 Q 154 41 155 47 Q 147 51 139 48 Q 135 47 134 44 Z" fill={GLASS_AMBER_PALE} />
      <GDot cx={152} cy={35} r={1.6} fill={GLASS_LEAD} />
      <GLine x1={128} y1={58} x2={168} y2={58} c={GLASS_SAPPHIRE_LT} w={2} />
      <GPoly points="168,58 162,54 162,62" fill={GLASS_SAPPHIRE_LT} />
      <GPoly points="128,88 140,72 148,84 156,70 168,88 164,96 132,96" fill={GLASS_RUBY} />
      <GPoly points="138,92 146,78 152,88 158,80 162,92 160,97 140,97" fill={GLASS_AMBER} />
      <GLine x1={130} y1={97} x2={166} y2={97} c={GLASS_LEAD} w={2} />
      <GDot cx={118} cy={16} r={1.7} fill={GLASS_AMBER_PALE} />
    </GlassSceneRoot>
  );
}

export function GlassMvStreetFighterScene() {
  return (
    <GlassSceneRoot bg="#2A1216">
      <GLine x1={100} y1={104} x2={200} y2={104} c={GLASS_LEAD} w={2.4} />
      <GPoly points="104,32 196,32 184,18 116,18" fill="#5A3A22" />
      <GLine x1={112} y1={32} x2={112} y2={56} c={GLASS_LEAD} w={2} />
      <GLine x1={188} y1={32} x2={188} y2={56} c={GLASS_LEAD} w={2} />
      <GR x={122} y={42} width={13} height={17} rx={3} fill={GLASS_AMBER_PALE} />
      <GR x={165} y={42} width={13} height={17} rx={3} fill={GLASS_AMBER_PALE} />
      <GFigure x={124} y={102} s={0.95} fill={GLASS_CREAM_LT} pose="stand" />
      <GR x={112} y={68} width={24} height={6} fill={GLASS_RUBY} />
      <GFigure x={176} y={102} s={0.95} fill={GLASS_SAPPHIRE_LT} pose="stand" />
      <GR x={164} y={68} width={24} height={6} fill={GLASS_SAPPHIRE} />
      <GPoly points="150,58 153,66 161,66 155,71 157,79 150,74 143,79 145,71 139,66 147,66" fill={GLASS_AMBER} />
      <GC cx={150} cy={69} r={3.4} fill={GLASS_AMBER_PALE} w={1.2} />
      <GLine x1={104} y1={88} x2={196} y2={88} c={GLASS_AMBER} w={1.4} dash="6 5" />
    </GlassSceneRoot>
  );
}

export function GlassMvWildwoodScene() {
  return (
    <GlassSceneRoot bg="#122B1E">
      <GP d="M 186 6 Q 178 15 186 27 Q 170 25 168 14 Q 170 3 186 6 Z" fill={GLASS_CREAM_LT} />
      <GDot cx={110} cy={12} r={1.6} fill={GLASS_CREAM} />
      <GDot cx={134} cy={20} r={1.5} fill={GLASS_AMBER_PALE} />
      <GPoly points="102,104 109,46 116,104" fill={GLASS_EMERALD} />
      <GPoly points="100,64 118,64 109,36" fill="#1F5C3D" />
      <GPoly points="180,104 188,40 196,104" fill={GLASS_EMERALD} />
      <GPoly points="178,60 198,60 188,30" fill="#1F5C3D" />
      <GR x={116} y={88} width={68} height={7} fill="#8A5A22" />
      <GR x={120} y={95} width={60} height={7} fill="#6E4520" />
      <GLine x1={116} y1={102} x2={184} y2={102} c={GLASS_LEAD} w={2.2} />
      <GLine x1={128} y1={88} x2={128} y2={102} c={GLASS_LEAD} w={1.6} />
      <GLine x1={150} y1={88} x2={150} y2={102} c={GLASS_LEAD} w={1.6} />
      <GLine x1={172} y1={88} x2={172} y2={102} c={GLASS_LEAD} w={1.6} />
      <GR x={126} y={58} width={44} height={30} rx={3} fill={GLASS_RUBY} />
      <GR x={122} y={50} width={52} height={10} rx={2} fill={GLASS_AMBER} />
      <GR x={132} y={64} width={10} height={10} fill={GLASS_SAPPHIRE_LT} />
      <GR x={148} y={64} width={10} height={10} fill={GLASS_SAPPHIRE_LT} />
      <GC cx={134} cy={90} r={4} fill={GLASS_LEAD} />
      <GC cx={162} cy={90} r={4} fill={GLASS_LEAD} />
      <GC cx={148} cy={42} r={7} fill={GLASS_AMBER_PALE} />
      <GDot cx={145} cy={40} r={1.6} fill={GLASS_LEAD} />
      <GDot cx={151} cy={40} r={1.6} fill={GLASS_LEAD} />
    </GlassSceneRoot>
  );
}
