// v201 — the Stained Glass food scenes: homecooked dishes and
// restaurant plates rebuilt as jewel panes in lead, heroes on the
// right over deep grounds, each dish its own composition.

import {
  GlassSceneRoot,
  GP,
  GC,
  GR,
  GPoly,
  GLine,
  GDot,
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

export function GlassTdTvDinnerScene() {
  return (
    <GlassSceneRoot bg="#241A38">
      <GLine x1={112} y1={86} x2={100} y2={106} c={GLASS_LEAD} w={2.4} />
      <GLine x1={182} y1={86} x2={194} y2={106} c={GLASS_LEAD} w={2.4} />
      <GLine x1={106} y1={96} x2={188} y2={96} c={GLASS_LEAD} w={1.6} />
      <GR x={104} y={32} width={88} height={54} rx={6} fill={GLASS_SAPPHIRE_LT} />
      <GLine x1={148} y1={32} x2={148} y2={86} c={GLASS_LEAD} w={2.2} />
      <GLine x1={104} y1={59} x2={192} y2={59} c={GLASS_LEAD} w={2.2} />
      <GC cx={126} cy={45} r={9} fill={GLASS_CREAM} />
      <GPoly points="156,38 178,40 182,52 158,54 152,46" fill="#6B3A1F" />
      <GDot cx={118} cy={72} r={2.6} fill={GLASS_EMERALD} />
      <GDot cx={130} cy={76} r={2.6} fill={GLASS_EMERALD} />
      <GDot cx={140} cy={70} r={2.6} fill={GLASS_EMERALD} />
      <GDot cx={162} cy={72} r={2.4} fill={GLASS_AMBER} />
      <GDot cx={174} cy={76} r={2.4} fill={GLASS_AMBER_LT} />
      <GDot cx={182} cy={70} r={2.4} fill={GLASS_AMBER} />
      <GR x={104} y={90} width={22} height={9} rx={3} fill={GLASS_VIOLET} />
      <GDot cx={110} cy={94} r={1.6} fill={GLASS_RUBY} />
      <GDot cx={118} cy={94} r={1.6} fill={GLASS_CREAM} />
    </GlassSceneRoot>
  );
}

export function GlassTdBurritoScene() {
  return (
    <GlassSceneRoot bg="#2E2008">
      <GLine x1={140} y1={16} x2={138} y2={30} c={GLASS_CREAM} w={1.8} />
      <GLine x1={160} y1={14} x2={158} y2={28} c={GLASS_CREAM} w={1.8} />
      <GR x={100} y={84} width={94} height={10} rx={3} fill="#6B3A1F" />
      <GP d="M106 62 C106 50 116 42 131 42 L165 42 C180 42 189 50 189 62 C189 74 180 82 165 82 L131 82 C116 82 106 74 106 62 Z" fill={GLASS_AMBER_PALE} />
      <GC cx={123} cy={62} r={11} fill={GLASS_CREAM} />
      <GC cx={123} cy={62} r={5} fill={GLASS_RUBY} />
      <GLine x1={144} y1={44} x2={150} y2={80} c={GLASS_LEAD} w={1.8} />
      <GLine x1={162} y1={43} x2={168} y2={80} c={GLASS_LEAD} w={1.8} />
      <GLine x1={176} y1={47} x2={181} y2={76} c={GLASS_LEAD} w={1.8} />
      <GP d="M104 96 L132 96 C130 104 124 108 118 108 C112 108 106 104 104 96 Z" fill={GLASS_CREAM} />
      <GDot cx={112} cy={99} r={2} fill={GLASS_AMBER} />
      <GDot cx={122} cy={99} r={2} fill={GLASS_AMBER_LT} />
      <GP d="M160 96 L188 96 C186 104 180 108 174 108 C168 108 162 104 160 96 Z" fill="#6B3A1F" />
      <GDot cx={168} cy={99} r={2} fill="#3A2010" />
      <GDot cx={178} cy={99} r={2} fill="#3A2010" />
    </GlassSceneRoot>
  );
}

export function GlassTdTostadasScene() {
  return (
    <GlassSceneRoot bg="#33161D">
      <GC cx={148} cy={62} r={38} fill={GLASS_SAPPHIRE} />
      <GC cx={148} cy={62} r={32} fill={GLASS_CREAM_LT} />
      <GC cx={132} cy={54} r={20} fill={GLASS_AMBER} />
      <GC cx={166} cy={72} r={20} fill={GLASS_AMBER_LT} />
      <GP d="M120 50 C126 44 134 44 140 50 C134 55 126 55 120 50 Z" fill="#6B3A1F" />
      <GP d="M154 68 C160 62 168 62 174 68 C168 73 160 73 154 68 Z" fill="#6B3A1F" />
      <GDot cx={128} cy={60} r={2.6} fill={GLASS_RUBY} />
      <GDot cx={140} cy={47} r={2.2} fill={GLASS_EMERALD} />
      <GDot cx={162} cy={80} r={2.6} fill={GLASS_RUBY} />
      <GDot cx={174} cy={66} r={2.2} fill={GLASS_EMERALD} />
      <GDot cx={148} cy={64} r={2.2} fill={GLASS_CREAM} />
      <GPoly points="180,28 192,33 182,42" fill={GLASS_EMERALD} />
      <GDot cx={120} cy={42} r={2} fill={GLASS_CREAM} />
      <GDot cx={176} cy={84} r={2} fill={GLASS_CREAM} />
    </GlassSceneRoot>
  );
}

export function GlassTdTacosScene() {
  return (
    <GlassSceneRoot bg="#14291F">
      <GR x={100} y={88} width={94} height={8} rx={3} fill="#6B3A1F" />
      <GP d="M106 86 L106 62 C106 48 113 41 120 41 C127 41 134 48 134 62 L134 86 Z" fill={GLASS_AMBER} />
      <GP d="M135 86 L135 62 C135 48 142 41 149 41 C156 41 163 48 163 62 L163 86 Z" fill={GLASS_AMBER_LT} />
      <GP d="M164 86 L164 62 C164 48 171 41 178 41 C185 41 191 48 191 62 L191 86 Z" fill={GLASS_AMBER} />
      <GP d="M108 52 C113 45 117 50 120 44 C124 50 128 45 132 52 L132 58 L108 58 Z" fill={GLASS_EMERALD} />
      <GP d="M137 52 C142 45 146 50 149 44 C153 50 157 45 161 52 L161 58 L137 58 Z" fill={GLASS_EMERALD} />
      <GP d="M166 52 C171 45 175 50 178 44 C182 50 186 45 189 52 L189 58 L166 58 Z" fill={GLASS_EMERALD} />
      <GDot cx={120} cy={66} r={2.4} fill={GLASS_RUBY} />
      <GDot cx={149} cy={66} r={2.4} fill={GLASS_RUBY} />
      <GDot cx={178} cy={66} r={2.4} fill={GLASS_RUBY} />
      <GP d="M108 100 L130 100 C128 105 123 108 119 108 C114 108 110 105 108 100 Z" fill={GLASS_RUBY} />
    </GlassSceneRoot>
  );
}

export function GlassTdPizzaScene() {
  return (
    <GlassSceneRoot bg="#2E2008">
      <GLine x1={176} y1={80} x2={194} y2={98} c="#6B3A1F" w={5} />
      <GC cx={146} cy={60} r={38} fill={GLASS_AMBER} />
      <GC cx={146} cy={60} r={30} fill={GLASS_RUBY} />
      <GC cx={146} cy={60} r={28} fill={GLASS_AMBER_LT} />
      <GLine x1={146} y1={60} x2={146} y2={32} c={GLASS_LEAD} w={1.8} />
      <GLine x1={146} y1={60} x2={172} y2={78} c={GLASS_LEAD} w={1.8} />
      <GLine x1={146} y1={60} x2={120} y2={78} c={GLASS_LEAD} w={1.8} />
      <GC cx={132} cy={44} r={5} fill={GLASS_RUBY} />
      <GC cx={161} cy={50} r={5} fill={GLASS_RUBY} />
      <GC cx={140} cy={69} r={5} fill={GLASS_RUBY} />
      <GC cx={123} cy={62} r={4.4} fill="#6B3A1F" />
      <GC cx={163} cy={76} r={4.4} fill="#6B3A1F" />
      <GPoly points="170,84 192,97 162,99" fill={GLASS_AMBER_LT} />
      <GDot cx={176} cy={92} r={2.2} fill={GLASS_RUBY} />
      <GP d="M178 94 C176 100 180 102 178 108" fill={GLASS_AMBER_PALE} />
    </GlassSceneRoot>
  );
}

export function GlassTdSandwichScene() {
  return (
    <GlassSceneRoot bg="#14291F">
      <GP d="M102 92 C124 84 172 84 194 92 C172 101 124 101 102 92 Z" fill={GLASS_SAPPHIRE_LT} />
      <GP d="M109 77 C109 62 120 52 131 52 C142 52 153 62 153 77 Z" fill={GLASS_AMBER_PALE} />
      <GP d="M107 77 C115 70 121 79 129 72 C137 79 145 70 153 77 L153 82 L107 82 Z" fill={GLASS_EMERALD} />
      <GP d="M109 84 C121 79 141 79 151 84 C141 90 121 90 109 84 Z" fill={GLASS_RUBY} />
      <GP d="M149 51 C149 38 158 30 167 30 C176 30 185 38 185 51 Z" fill={GLASS_AMBER_PALE} />
      <GP d="M147 53 C155 46 161 55 167 48 C174 55 180 46 187 53 L187 58 L147 58 Z" fill={GLASS_EMERALD} />
      <GP d="M150 60 C160 55 176 55 184 60 C176 65 160 65 150 60 Z" fill="#6B3A1F" />
      <GC cx={120} cy={100} r={6} fill={GLASS_EMERALD} />
      <GPoly points="164,92 177,88 175,101" fill={GLASS_AMBER} />
      <GPoly points="179,98 191,94 189,105" fill={GLASS_AMBER_LT} />
    </GlassSceneRoot>
  );
}

export function GlassTdSaladScene() {
  return (
    <GlassSceneRoot bg="#14291F">
      <GP d="M102 56 L196 56 C194 83 176 101 149 101 C122 101 104 83 102 56 Z" fill={GLASS_SAPPHIRE} />
      <GR x={98} y={52} width={102} height={8} rx={3} fill={GLASS_SAPPHIRE_LT} />
      <GP d="M113 54 C109 41 120 33 130 38 C134 46 126 55 113 54 Z" fill={GLASS_EMERALD} />
      <GP d="M137 54 C135 40 148 31 158 38 C160 48 150 56 137 54 Z" fill="#3FA46A" />
      <GP d="M163 54 C161 42 172 35 181 41 C184 49 176 56 163 54 Z" fill={GLASS_EMERALD} />
      <GC cx={127} cy={73} r={6.5} fill={GLASS_RUBY} />
      <GC cx={169} cy={79} r={6.5} fill={GLASS_RUBY} />
      <GC cx={149} cy={85} r={5.5} fill={GLASS_AMBER} />
      <GDot cx={138} cy={68} r={2.2} fill={GLASS_CREAM} />
      <GDot cx={160} cy={66} r={2.2} fill={GLASS_CREAM} />
      <GLine x1={182} y1={20} x2={190} y2={46} c={GLASS_LEAD} w={2.4} />
      <GLine x1={190} y1={46} x2={185} y2={40} c={GLASS_LEAD} w={1.8} />
      <GLine x1={190} y1={46} x2={195} y2={41} c={GLASS_LEAD} w={1.8} />
    </GlassSceneRoot>
  );
}

export function GlassTdPastaScene() {
  return (
    <GlassSceneRoot bg="#33161D">
      <GLine x1={138} y1={18} x2={136} y2={32} c={GLASS_CREAM} w={1.8} />
      <GLine x1={160} y1={16} x2={158} y2={30} c={GLASS_CREAM} w={1.8} />
      <GP d="M104 58 L194 58 C192 83 174 99 149 99 C124 99 106 83 104 58 Z" fill={GLASS_VIOLET} />
      <GR x={100} y={54} width={98} height={8} rx={3} fill={GLASS_VIOLET_LT} />
      <GP d="M114 53 C122 42 135 46 133 53 C139 42 151 42 153 53 Z" fill={GLASS_AMBER_PALE} />
      <GP d="M143 53 C147 40 161 40 165 53 C171 42 183 44 185 53 Z" fill={GLASS_AMBER} />
      <GC cx={149} cy={49} r={10} fill={GLASS_RUBY} />
      <GPoly points="147,37 157,44 147,48 139,43" fill={GLASS_EMERALD} />
      <GDot cx={127} cy={73} r={2.2} fill={GLASS_AMBER_LT} />
      <GDot cx={167} cy={77} r={2.2} fill={GLASS_AMBER_LT} />
      <GDot cx={149} cy={80} r={2.2} fill={GLASS_RUBY} />
      <GLine x1={188} y1={28} x2={180} y2={54} c={GLASS_LEAD} w={2.2} />
    </GlassSceneRoot>
  );
}

export function GlassTdPancakesScene() {
  return (
    <GlassSceneRoot bg="#2E2008">
      <GP d="M100 96 C122 86 176 86 196 96 C176 107 122 107 100 96 Z" fill={GLASS_SAPPHIRE_LT} />
      <GP d="M111 81 C111 72 129 66 149 66 C169 66 187 72 187 81 C187 89 169 95 149 95 C129 95 111 89 111 81 Z" fill={GLASS_AMBER_PALE} />
      <GP d="M115 67 C115 58 131 52 149 52 C167 52 183 58 183 67 C183 75 167 80 149 80 C131 80 115 75 115 67 Z" fill={GLASS_AMBER_LT} />
      <GP d="M121 53 C121 45 135 40 149 40 C163 40 177 45 177 53 C177 60 163 65 149 65 C135 65 121 60 121 53 Z" fill={GLASS_AMBER} />
      <GP d="M129 42 C139 36 159 36 169 42 C163 46 159 50 161 57 C151 53 141 55 137 48 C131 51 127 47 129 42 Z" fill="#6B3A1F" />
      <GR x={141} y={27} width={17} height={11} rx={2} fill={GLASS_CREAM} />
      <GC cx={118} cy={92} r={4.8} fill={GLASS_VIOLET} />
      <GC cx={181} cy={90} r={4.8} fill={GLASS_RUBY} />
      <GDot cx={130} cy={88} r={2.2} fill={GLASS_RUBY} />
      <GDot cx={168} cy={88} r={2.2} fill={GLASS_VIOLET} />
      <GLine x1={192} y1={62} x2={192} y2={94} c={GLASS_LEAD} w={2} />
    </GlassSceneRoot>
  );
}

export function GlassTdSoupScene() {
  return (
    <GlassSceneRoot bg="#241A38">
      <GLine x1={138} y1={16} x2={136} y2={30} c={GLASS_CREAM} w={1.8} />
      <GLine x1={156} y1={14} x2={154} y2={28} c={GLASS_CREAM} w={1.8} />
      <GP d="M100 94 C126 86 174 86 198 94 C174 103 126 103 100 94 Z" fill={GLASS_SAPPHIRE_LT} />
      <GR x={121} y={43} width={52} height={46} rx={7} fill={GLASS_RUBY} />
      <GP d="M173 54 C185 52 189 62 185 71 C182 77 176 77 173 75 Z" fill={GLASS_RUBY} />
      <GP d="M123 46 C135 40 159 40 171 46 C159 52 135 52 123 46 Z" fill={GLASS_AMBER} />
      <GDot cx={140} cy={46} r={2.2} fill={GLASS_EMERALD} />
      <GDot cx={156} cy={47} r={2.2} fill={GLASS_EMERALD} />
      <GLine x1={134} y1={27} x2={148} y2={44} c={GLASS_LEAD} w={2.2} />
      <GR x={104} y={70} width={14} height={14} rx={2} fill={GLASS_AMBER_PALE} />
      <GR x={108} y={56} width={13} height={13} rx={2} fill={GLASS_AMBER_LT} />
    </GlassSceneRoot>
  );
}

export function GlassTdEggsScene() {
  return (
    <GlassSceneRoot bg="#2E2008">
      <GC cx={149} cy={62} r={40} fill={GLASS_CREAM} />
      <GC cx={149} cy={62} r={32} fill={GLASS_CREAM_LT} />
      <GP d="M119 47 C125 36 141 36 145 47 C149 57 139 67 129 65 C119 63 114 56 119 47 Z" fill={GLASS_CREAM} />
      <GC cx={132} cy={51} r={8} fill={GLASS_AMBER} />
      <GP d="M153 67 C159 58 173 58 177 69 C180 79 169 87 159 84 C150 81 148 75 153 67 Z" fill={GLASS_CREAM} />
      <GC cx={165} cy={72} r={7.5} fill={GLASS_AMBER_LT} />
      <GP d="M117 85 C125 79 131 89 139 83 C145 89 151 83 155 87 L155 92 L117 92 Z" fill={GLASS_RUBY} />
      <GP d="M119 93 C127 87 133 97 141 91 L143 96 L121 98 Z" fill="#8C2F3A" />
      <GPoly points="167,29 186,36 173,51" fill={GLASS_AMBER_PALE} />
      <GDot cx={176} cy={38} r={1.8} fill={GLASS_AMBER} />
    </GlassSceneRoot>
  );
}

export function GlassTdMexicanPizzaScene() {
  return (
    <GlassSceneRoot bg="#33161D">
      <GLine x1={180} y1={42} x2={198} y2={25} c={GLASS_LEAD} w={5} />
      <GC cx={145} cy={62} r={38} fill={GLASS_LEAD} />
      <GC cx={145} cy={62} r={31} fill={GLASS_AMBER} />
      <GC cx={145} cy={62} r={24} fill="#7A1F2B" />
      <GC cx={145} cy={62} r={18} fill={GLASS_AMBER_LT} />
      <GDot cx={131} cy={48} r={2.8} fill={GLASS_LEAD} />
      <GDot cx={157} cy={44} r={2.8} fill={GLASS_LEAD} />
      <GDot cx={165} cy={64} r={2.8} fill={GLASS_LEAD} />
      <GDot cx={135} cy={75} r={2.8} fill={GLASS_LEAD} />
      <GDot cx={149} cy={58} r={2.6} fill={GLASS_RUBY} />
      <GDot cx={141} cy={68} r={2.4} fill={GLASS_EMERALD} />
      <GDot cx={158} cy={72} r={2.4} fill={GLASS_EMERALD} />
      <GDot cx={128} cy={62} r={2.4} fill={GLASS_RUBY} />
      <GP d="M123 60 C129 56 135 58 137 63 L131 66 C128 64 125 62 123 60 Z" fill={GLASS_EMERALD} />
      <GP d="M155 79 C161 75 167 77 169 81 L163 84 C160 82 157 81 155 79 Z" fill={GLASS_EMERALD} />
    </GlassSceneRoot>
  );
}

export function GlassTdPupusasScene() {
  return (
    <GlassSceneRoot bg="#2E2008">
      <GC cx={145} cy={55} r={40} fill="#3A3A3A" />
      <GC cx={145} cy={55} r={33} fill="#5A4A3A" />
      <GP d="M113 44 C113 35 123 30 131 30 C139 30 147 35 147 44 C147 52 139 57 131 57 C123 57 113 52 113 44 Z" fill={GLASS_AMBER_PALE} />
      <GP d="M145 62 C145 53 155 48 163 48 C171 48 179 53 179 62 C179 70 171 75 163 75 C155 75 145 70 145 62 Z" fill={GLASS_AMBER_LT} />
      <GP d="M119 72 C119 64 128 60 135 60 C143 60 150 64 150 72 C150 80 143 84 135 84 C128 84 119 80 119 72 Z" fill={GLASS_AMBER} />
      <GDot cx={131} cy={43} r={2.2} fill="#6B3A1F" />
      <GDot cx={163} cy={61} r={2.2} fill="#6B3A1F" />
      <GDot cx={135} cy={71} r={2.2} fill="#6B3A1F" />
      <GP d="M102 98 L132 98 C130 105 124 109 118 109 C112 109 104 105 102 98 Z" fill={GLASS_EMERALD} />
      <GDot cx={112} cy={100} r={1.8} fill={GLASS_CREAM} />
      <GDot cx={122} cy={100} r={1.8} fill={GLASS_AMBER} />
      <GP d="M160 98 L188 98 C186 105 180 109 174 109 C168 109 162 105 160 98 Z" fill={GLASS_RUBY} />
    </GlassSceneRoot>
  );
}

export function GlassTdSteakScene() {
  return (
    <GlassSceneRoot bg="#33161D">
      <GLine x1={144} y1={14} x2={142} y2={28} c={GLASS_CREAM} w={1.8} />
      <GR x={97} y={92} width={98} height={10} rx={3} fill="#6B3A1F" />
      <GP d="M101 68 C101 51 123 41 149 41 C175 41 195 51 195 68 C195 84 175 93 149 93 C123 93 101 84 101 68 Z" fill="#2B2B2B" />
      <GP d="M115 67 C113 54 127 47 143 48 C161 49 177 55 176 67 C175 80 159 86 142 85 C126 84 116 79 115 67 Z" fill="#7A2E1F" />
      <GP d="M115 67 C113 54 127 47 143 48 C150 48 157 49 163 51 C160 62 150 72 138 78 C126 76 116 74 115 67 Z" fill="#8C3A22" />
      <GLine x1={127} y1={56} x2={137} y2={78} c={GLASS_LEAD} w={1.6} />
      <GLine x1={143} y1={53} x2={153} y2={80} c={GLASS_LEAD} w={1.6} />
      <GLine x1={159} y1={56} x2={167} y2={76} c={GLASS_LEAD} w={1.6} />
      <GR x={139} y={58} width={15} height={10} rx={2} fill={GLASS_CREAM} />
      <GP d="M113 85 C119 79 125 85 131 80 C137 85 143 81 147 85 L147 89 L113 89 Z" fill={GLASS_EMERALD} />
      <GLine x1={190} y1={28} x2={178} y2={52} c={GLASS_LEAD} w={2.2} />
    </GlassSceneRoot>
  );
}

export function GlassTdRoastChickenScene() {
  return (
    <GlassSceneRoot bg="#2E2008">
      <GP d="M98 88 C120 78 178 78 198 88 C178 100 120 100 98 88 Z" fill={GLASS_SAPPHIRE_LT} />
      <GP d="M117 70 C115 47 131 33 150 33 C169 33 183 47 182 68 C181 83 166 89 149 89 C132 89 118 84 117 70 Z" fill={GLASS_AMBER} />
      <GP d="M117 70 C115 47 131 33 150 33 C158 33 165 36 171 41 C165 55 155 68 142 78 C129 76 118 75 117 70 Z" fill={GLASS_AMBER_LT} />
      <GP d="M133 44 C141 54 141 68 135 81 L128 78 C132 66 132 54 133 44 Z" fill="#6B3A1F" />
      <GP d="M121 62 C111 58 105 62 103 70 L117 74 Z" fill={GLASS_AMBER_LT} />
      <GC cx={101} cy={75} r={4.4} fill={GLASS_CREAM} />
      <GP d="M177 62 C187 58 193 62 195 70 L182 74 Z" fill={GLASS_AMBER_LT} />
      <GC cx={197} cy={75} r={4.4} fill={GLASS_CREAM} />
      <GDot cx={143} cy={58} r={2} fill="#6B3A1F" />
      <GDot cx={157} cy={66} r={2} fill="#6B3A1F" />
      <GP d="M105 100 C111 92 125 92 129 99 C131 94 137 94 139 99 C133 105 111 107 105 100 Z" fill={GLASS_CREAM} />
      <GC cx={185} cy={97} r={6.5} fill={GLASS_AMBER_PALE} />
    </GlassSceneRoot>
  );
}

export function GlassTdMeatloafScene() {
  return (
    <GlassSceneRoot bg="#33161D">
      <GR x={113} y={27} width={68} height={37} rx={5} fill={GLASS_SAPPHIRE} />
      <GP d="M117 35 C131 26 161 26 175 35 C161 41 131 41 117 35 Z" fill="#6B3A1F" />
      <GP d="M117 35 C131 26 161 26 175 35 C168 37 160 38 152 38 C140 38 128 37 117 35 Z" fill={GLASS_RUBY} />
      <GP d="M123 31 C135 27 157 27 169 31 L169 34 L123 34 Z" fill="#A63A2A" />
      <GPoly points="109,70 141,70 137,95 105,95" fill="#7A4426" />
      <GLine x1={107} y1={78} x2={139} y2={78} c={GLASS_RUBY} w={2.4} />
      <GPoly points="143,70 173,70 177,95 147,95" fill="#6B3A1F" />
      <GLine x1={145} y1={78} x2={175} y2={78} c={GLASS_RUBY} w={2.4} />
      <GP d="M173 93 C173 80 183 74 189 81 C195 74 197 85 195 93 C189 97 179 97 173 93 Z" fill={GLASS_CREAM} />
      <GP d="M179 85 C183 80 189 80 191 85 L191 88 L179 88 Z" fill={GLASS_CREAM_LT} />
      <GDot cx={129} cy={52} r={2} fill={GLASS_EMERALD} />
      <GDot cx={147} cy={54} r={2} fill={GLASS_EMERALD} />
    </GlassSceneRoot>
  );
}

export function GlassTdPotRoastScene() {
  return (
    <GlassSceneRoot bg="#241A38">
      <GLine x1={142} y1={10} x2={140} y2={24} c={GLASS_CREAM} w={1.8} />
      <GLine x1={164} y1={8} x2={162} y2={22} c={GLASS_CREAM} w={1.8} />
      <GP d="M111 40 C129 27 165 27 185 38 L185 46 L111 46 Z" fill={GLASS_SAPPHIRE_LT} />
      <GC cx={148} cy={27} r={4.4} fill={GLASS_LEAD} />
      <GR x={103} y={52} width={92} height={42} rx={7} fill={GLASS_VIOLET} />
      <GR x={99} y={50} width={100} height={8} rx={3} fill={GLASS_VIOLET_LT} />
      <GP d="M118 72 C118 62 132 56 149 56 C166 56 180 62 180 72 C180 82 166 87 149 87 C132 87 118 82 118 72 Z" fill="#5C2E14" />
      <GP d="M118 72 C118 62 132 56 149 56 C156 56 163 57 169 60 C163 69 152 76 140 79 C129 77 118 75 118 72 Z" fill="#6B3A1F" />
      <GDot cx={128} cy={66} r={3} fill={GLASS_AMBER} />
      <GDot cx={170} cy={68} r={3} fill={GLASS_AMBER_LT} />
      <GDot cx={149} cy={78} r={3} fill={GLASS_AMBER} />
      <GC cx={136} cy={76} r={4} fill={GLASS_CREAM} />
      <GC cx={162} cy={62} r={4} fill={GLASS_CREAM} />
      <GLine x1={103} y1={66} x2={93} y2={62} c={GLASS_LEAD} w={2.6} />
      <GLine x1={195} y1={66} x2={203} y2={62} c={GLASS_LEAD} w={2.6} />
    </GlassSceneRoot>
  );
}

export function GlassTdCasseroleScene() {
  return (
    <GlassSceneRoot bg="#14291F">
      <GLine x1={146} y1={14} x2={144} y2={28} c={GLASS_CREAM} w={1.8} />
      <GR x={105} y={41} width={90} height={50} rx={6} fill={GLASS_RUBY} />
      <GPoly points="105,55 92,60 92,73 105,75" fill={GLASS_RUBY} />
      <GPoly points="195,55 204,60 204,73 195,75" fill={GLASS_RUBY} />
      <GR x={105} y={41} width={90} height={14} rx={4} fill={GLASS_AMBER} />
      <GP d="M113 48 C123 41 133 50 143 43 C153 50 163 41 173 48 C179 43 187 45 191 50 L191 54 L113 54 Z" fill={GLASS_AMBER_LT} />
      <GC cx={127} cy={68} r={5.4} fill={GLASS_AMBER_PALE} />
      <GC cx={163} cy={75} r={5.4} fill={GLASS_AMBER_PALE} />
      <GC cx={148} cy={66} r={4.4} fill={GLASS_AMBER_PALE} />
      <GDot cx={147} cy={64} r={2.2} fill={GLASS_EMERALD} />
      <GDot cx={177} cy={62} r={2.2} fill={GLASS_EMERALD} />
      <GDot cx={118} cy={78} r={2.2} fill={GLASS_RUBY} />
      <GLine x1={115} y1={99} x2={185} y2={99} c={GLASS_LEAD} w={2.4} />
      <GLine x1={125} y1={91} x2={119} y2={103} c={GLASS_LEAD} w={2} />
      <GLine x1={175} y1={91} x2={181} y2={103} c={GLASS_LEAD} w={2} />
    </GlassSceneRoot>
  );
}

export function GlassTdHotDogScene() {
  return (
    <GlassSceneRoot bg="#241A38">
      <GPoly points="101,43 197,43 187,99 111,99" fill={GLASS_SAPPHIRE} />
      <GLine x1={105} y1={84} x2={193} y2={84} c={GLASS_CREAM} w={2.4} />
      <GP d="M109 52 C109 43 117 39 129 39 L173 39 C185 39 191 43 191 52 C191 60 185 64 173 64 L129 64 C117 64 109 60 109 52 Z" fill={GLASS_AMBER_PALE} />
      <GP d="M113 52 C121 46 129 46 137 51 C145 46 153 46 161 51 C169 46 177 46 186 51 L186 56 L113 56 Z" fill="#8C2F1F" />
      <GP d="M119 51 C127 45 133 58 141 51 C149 45 155 58 163 51 C171 45 177 56 183 51" fill={GLASS_AMBER} />
      <GP d="M111 75 C111 67 119 63 129 63 L169 63 C181 63 187 67 187 75 C187 81 181 85 169 85 L129 85 C119 85 111 81 111 75 Z" fill={GLASS_AMBER_PALE} />
      <GP d="M115 75 C123 69 131 69 139 74 C147 69 155 69 163 74 C171 69 179 69 184 74 L184 79 L115 79 Z" fill="#8C2F1F" />
      <GLine x1={121} y1={74} x2={177} y2={74} c={GLASS_AMBER} w={2.2} />
      <GDot cx={127} cy={68} r={2} fill={GLASS_EMERALD} />
      <GDot cx={149} cy={81} r={2} fill={GLASS_EMERALD} />
      <GDot cx={169} cy={68} r={2} fill={GLASS_EMERALD} />
    </GlassSceneRoot>
  );
}

export function GlassTdNachosScene() {
  return (
    <GlassSceneRoot bg="#2E2008">
      <GR x={99} y={27} width={96} height={68} rx={5} fill={GLASS_SAPPHIRE_LT} />
      <GPoly points="113,79 129,62 137,81" fill={GLASS_AMBER} />
      <GPoly points="135,85 149,66 161,85" fill={GLASS_AMBER_LT} />
      <GPoly points="159,81 175,64 185,83" fill={GLASS_AMBER} />
      <GPoly points="119,57 135,42 145,59" fill={GLASS_AMBER_LT} />
      <GPoly points="151,55 165,40 177,57" fill={GLASS_AMBER} />
      <GP d="M115 70 C129 60 143 72 157 62 C169 70 179 62 187 68 L187 74 L115 74 Z" fill={GLASS_AMBER_PALE} />
      <GP d="M119 50 C133 42 149 52 163 44 L163 50 L119 50 Z" fill={GLASS_AMBER_PALE} />
      <GC cx={121} cy={40} r={4.4} fill={GLASS_RUBY} />
      <GC cx={183} cy={44} r={4.4} fill={GLASS_RUBY} />
      <GC cx={147} cy={72} r={11} fill={GLASS_CREAM} />
      <GC cx={147} cy={72} r={5.5} fill={GLASS_EMERALD} />
      <GDot cx={130} cy={52} r={2} fill={GLASS_RUBY} />
      <GDot cx={170} cy={52} r={2} fill={GLASS_EMERALD} />
    </GlassSceneRoot>
  );
}

export function GlassTdQuesadillaScene() {
  return (
    <GlassSceneRoot bg="#14291F">
      <GC cx={143} cy={58} r={39} fill="#6B3A1F" />
      <GC cx={143} cy={58} r={31} fill={GLASS_AMBER_PALE} />
      <GLine x1={143} y1={58} x2={143} y2={29} c={GLASS_LEAD} w={2} />
      <GLine x1={143} y1={58} x2={119} y2={77} c={GLASS_LEAD} w={2} />
      <GLine x1={143} y1={58} x2={167} y2={42} c={GLASS_LEAD} w={2} />
      <GDot cx={131} cy={42} r={2.2} fill="#6B3A1F" />
      <GDot cx={156} cy={70} r={2.2} fill="#6B3A1F" />
      <GDot cx={128} cy={68} r={2.2} fill="#6B3A1F" />
      <GPoly points="169,78 194,89 169,101" fill={GLASS_AMBER_LT} />
      <GP d="M171 89 C163 87 159 91 153 89 L153 94 L171 94 Z" fill={GLASS_AMBER_PALE} />
      <GP d="M104 100 C108 94 121 94 125 100 C121 106 108 106 104 100 Z" fill={GLASS_EMERALD} />
      <GP d="M129 102 C133 96 145 96 149 102 C145 108 133 108 129 102 Z" fill={GLASS_RUBY} />
    </GlassSceneRoot>
  );
}

export function GlassTdHotWingsScene() {
  return (
    <GlassSceneRoot bg="#33161D">
      <GPoly points="103,57 195,57 185,101 113,101" fill={GLASS_AMBER} />
      <GR x={100} y={53} width={98} height={8} rx={3} fill={GLASS_AMBER_LT} />
      <GP d="M113 45 C107 32 117 23 127 27 C135 30 135 42 129 47 C123 51 115 50 113 45 Z" fill={GLASS_RUBY} />
      <GLine x1={127} y1={29} x2={139} y2={21} c={GLASS_CREAM} w={3} />
      <GP d="M143 47 C139 34 149 25 159 29 C166 33 165 44 159 49 C152 52 145 52 143 47 Z" fill="#C0392B" />
      <GLine x1={157} y1={31} x2={167} y2={22} c={GLASS_CREAM} w={3} />
      <GP d="M127 57 C122 46 131 38 140 41 C147 44 146 54 141 58 C135 61 129 61 127 57 Z" fill={GLASS_RUBY} />
      <GLine x1={139} y1={43} x2={149} y2={35} c={GLASS_CREAM} w={3} />
      <GR x={170} y={27} width={7} height={28} rx={3} fill={GLASS_EMERALD} />
      <GR x={182} y={29} width={7} height={27} rx={3} fill="#3FA46A" />
      <GC cx={123} cy={85} r={10} fill={GLASS_CREAM} />
      <GC cx={123} cy={85} r={5} fill={GLASS_CREAM_LT} />
      <GC cx={169} cy={85} r={10} fill={GLASS_CREAM} />
      <GDot cx={149} cy={71} r={2.2} fill={GLASS_RUBY} />
      <GDot cx={158} cy={80} r={2.2} fill={GLASS_AMBER} />
    </GlassSceneRoot>
  );
}

export function GlassTdRamenScene() {
  return (
    <GlassSceneRoot bg="#241A38">
      <GLine x1={134} y1={16} x2={132} y2={30} c={GLASS_CREAM} w={1.8} />
      <GLine x1={158} y1={14} x2={156} y2={28} c={GLASS_CREAM} w={1.8} />
      <GP d="M103 52 L195 52 C193 79 173 97 149 97 C125 97 105 79 103 52 Z" fill={GLASS_RUBY} />
      <GR x={99} y={48} width={100} height={8} rx={3} fill="#C0392B" />
      <GR x={135} y={97} width={28} height={8} rx={2} fill={GLASS_RUBY} />
      <GP d="M113 47 C121 36 133 42 131 48 C139 37 151 38 153 47 Z" fill={GLASS_AMBER_PALE} />
      <GP d="M149 47 C155 35 169 36 173 46 C179 37 189 39 191 48 Z" fill={GLASS_AMBER} />
      <GC cx={125} cy={44} r={8.5} fill={GLASS_CREAM} />
      <GDot cx={125} cy={44} r={3.2} fill={GLASS_AMBER} />
      <GLine x1={160} y1={17} x2={184} y2={48} c="#6B3A1F" w={2.6} />
      <GLine x1={170} y1={15} x2={192} y2={46} c="#6B3A1F" w={2.6} />
      <GDot cx={149} cy={70} r={2.4} fill={GLASS_EMERALD} />
      <GDot cx={165} cy={78} r={2.4} fill={GLASS_EMERALD} />
    </GlassSceneRoot>
  );
}

export function GlassTdStirFryScene() {
  return (
    <GlassSceneRoot bg="#14291F">
      <GLine x1={140} y1={12} x2={138} y2={26} c={GLASS_CREAM} w={1.8} />
      <GLine x1={162} y1={10} x2={160} y2={24} c={GLASS_CREAM} w={1.8} />
      <GP d="M101 48 L197 48 C195 75 173 93 149 93 C125 93 103 75 101 48 Z" fill="#2B2B2B" />
      <GLine x1={101} y1={48} x2={88} y2={43} c={GLASS_LEAD} w={3.4} />
      <GLine x1={197} y1={48} x2={202} y2={42} c={GLASS_LEAD} w={3.4} />
      <GP d="M119 45 C127 34 139 40 137 46 C145 35 157 35 161 45 Z" fill={GLASS_RUBY} />
      <GP d="M157 45 C163 33 177 34 181 44 L181 48 L157 48 Z" fill={GLASS_EMERALD} />
      <GC cx={127} cy={61} r={5.4} fill={GLASS_AMBER} />
      <GC cx={165} cy={64} r={5.4} fill="#3FA46A" />
      <GDot cx={144} cy={68} r={2.4} fill={GLASS_RUBY} />
      <GDot cx={176} cy={74} r={2.4} fill={GLASS_AMBER} />
      <GP d="M123 103 C137 97 161 97 175 103 C161 108 137 108 123 103 Z" fill={GLASS_SAPPHIRE} />
      <GC cx={149} cy={101} r={4} fill={GLASS_RUBY} />
      <GLine x1={186} y1={21} x2={172} y2={45} c={GLASS_LEAD} w={2.4} />
    </GlassSceneRoot>
  );
}

export function GlassTdFriedRiceScene() {
  return (
    <GlassSceneRoot bg="#2E2008">
      <GP d="M100 90 C124 80 176 80 198 90 C176 102 124 102 100 90 Z" fill={GLASS_SAPPHIRE_LT} />
      <GP d="M115 89 C117 62 131 45 150 45 C169 45 183 62 185 89 C163 95 137 95 115 89 Z" fill={GLASS_AMBER_PALE} />
      <GP d="M115 89 C117 62 131 45 150 45 C158 45 165 48 171 53 C163 68 150 80 134 86 C126 87 118 88 115 89 Z" fill={GLASS_AMBER_LT} />
      <GP d="M129 60 C139 52 149 60 157 53 C165 59 173 54 177 61 L177 66 L129 66 Z" fill={GLASS_CREAM} />
      <GDot cx={129} cy={75} r={2.4} fill={GLASS_EMERALD} />
      <GDot cx={147} cy={67} r={2.4} fill={GLASS_RUBY} />
      <GDot cx={165} cy={77} r={2.4} fill={GLASS_EMERALD} />
      <GDot cx={153} cy={83} r={2.4} fill={GLASS_AMBER} />
      <GDot cx={137} cy={85} r={2.2} fill={GLASS_RUBY} />
      <GPoly points="141,49 159,49 153,58 145,58" fill={GLASS_RUBY} />
      <GP d="M105 99 C101 92 107 86 113 90 C118 93 115 101 109 102 C106 102 105 101 105 99 Z" fill={GLASS_SAPPHIRE_LT} />
      <GLine x1={111} y1={97} x2={123} y2={105} c={GLASS_LEAD} w={2} />
      <GR x={185} y={62} width={13} height={27} rx={3} fill="#3A2010" />
      <GLine x1={188} y1={62} x2={188} y2={53} c={GLASS_LEAD} w={2.2} />
    </GlassSceneRoot>
  );
}

export function GlassTdOatmealScene() {
  return (
    <GlassSceneRoot bg="#241A38">
      <GLine x1={144} y1={14} x2={142} y2={28} c={GLASS_CREAM} w={1.8} />
      <GP d="M105 54 L193 54 C191 79 173 95 149 95 C125 95 107 79 105 54 Z" fill={GLASS_SAPPHIRE} />
      <GR x={101} y={50} width={96} height={8} rx={3} fill={GLASS_SAPPHIRE_LT} />
      <GP d="M115 51 C131 43 167 43 183 51 C167 57 131 57 115 51 Z" fill="#D9C7A5" />
      <GP d="M125 49 C133 43 141 51 149 45 C157 51 165 43 173 48 L173 52 L125 52 Z" fill={GLASS_AMBER} />
      <GC cx={133} cy={46} r={4.8} fill={GLASS_VIOLET} />
      <GC cx={159} cy={44} r={4.8} fill={GLASS_RUBY} />
      <GC cx={147} cy={50} r={4.2} fill={GLASS_VIOLET_LT} />
      <GLine x1={174} y1={21} x2={164} y2={49} c={GLASS_LEAD} w={2.4} />
      <GC cx={162} cy={54} r={4.2} fill={GLASS_AMBER_LT} />
      <GP d="M113 101 C133 95 165 95 185 101 C165 106 133 106 113 101 Z" fill={GLASS_SAPPHIRE_LT} />
    </GlassSceneRoot>
  );
}

export function GlassTdCerealScene() {
  return (
    <GlassSceneRoot bg="#2E2008">
      <GP d="M101 54 L185 54 C183 79 167 95 145 95 C121 95 103 79 101 54 Z" fill={GLASS_RUBY} />
      <GR x={97} y={50} width={92} height={8} rx={3} fill="#C0392B" />
      <GP d="M109 51 C125 43 161 43 177 51 C161 57 125 57 109 51 Z" fill={GLASS_CREAM} />
      <GC cx={123} cy={47} r={4.4} fill={GLASS_AMBER} />
      <GC cx={141} cy={44} r={4.4} fill={GLASS_AMBER_LT} />
      <GC cx={157} cy={47} r={4.4} fill={GLASS_AMBER} />
      <GC cx={133} cy={51} r={3.8} fill={GLASS_AMBER_PALE} />
      <GC cx={167} cy={50} r={3.8} fill={GLASS_AMBER_LT} />
      <GLine x1={113} y1={29} x2={127} y2={51} c={GLASS_LEAD} w={2.2} />
      <GR x={187} y={37} width={14} height={48} rx={3} fill={GLASS_CREAM} />
      <GR x={187} y={37} width={14} height={10} rx={2} fill={GLASS_SAPPHIRE_LT} />
      <GLine x1={190} y1={29} x2={198} y2={29} c={GLASS_LEAD} w={2.4} />
    </GlassSceneRoot>
  );
}

export function GlassRestTacoScene() {
  return (
    <GlassSceneRoot bg="#14291F">
      <GP d="M102 94 C126 86 174 86 196 94 C174 103 126 103 102 94 Z" fill={GLASS_SAPPHIRE_LT} />
      <GP d="M109 89 L109 62 C109 41 127 27 149 27 C171 27 189 41 189 62 L189 89 Z" fill={GLASS_AMBER} />
      <GP d="M111 45 C119 34 129 45 137 33 C145 44 155 33 163 44 C171 34 181 40 187 47 L187 56 L111 56 Z" fill={GLASS_EMERALD} />
      <GPoly points="123,53 133,45 137,55" fill={GLASS_RUBY} />
      <GPoly points="149,55 159,47 163,57" fill={GLASS_RUBY} />
      <GDot cx={149} cy={38} r={2.6} fill={GLASS_CREAM} />
      <GPoly points="96,71 109,78 99,89" fill="#7AB648" />
      <GP d="M169 98 L193 98 C191 105 185 108 180 108 C174 108 170 105 169 98 Z" fill={GLASS_RUBY} />
      <GDot cx={180} cy={101} r={2} fill={GLASS_EMERALD} />
    </GlassSceneRoot>
  );
}

export function GlassRestSandwichScene() {
  return (
    <GlassSceneRoot bg="#33161D">
      <GP d="M98 92 C122 84 176 84 198 92 C176 101 122 101 98 92 Z" fill={GLASS_SAPPHIRE_LT} />
      <GP d="M107 79 C107 70 115 65 129 65 L171 65 C185 65 191 70 191 79 C177 85 121 85 107 79 Z" fill={GLASS_CREAM} />
      <GP d="M109 66 C119 58 129 68 139 60 C149 68 159 58 169 66 C177 59 185 62 189 67 L189 71 L109 71 Z" fill={GLASS_EMERALD} />
      <GP d="M111 58 C119 49 133 58 143 50 C153 58 165 49 175 57 L175 62 L111 62 Z" fill={GLASS_RUBY} />
      <GP d="M109 54 C109 39 123 31 149 31 C175 31 189 39 189 54 C169 47 129 47 109 54 Z" fill={GLASS_AMBER_PALE} />
      <GDot cx={129} cy={40} r={2} fill={GLASS_CREAM} />
      <GDot cx={149} cy={37} r={2} fill={GLASS_CREAM} />
      <GDot cx={169} cy={40} r={2} fill={GLASS_CREAM} />
      <GPoly points="113,97 127,91 125,103" fill={GLASS_AMBER} />
      <GPoly points="167,99 183,93 183,103" fill={GLASS_EMERALD} />
    </GlassSceneRoot>
  );
}

export function GlassRestPizzaScene() {
  return (
    <GlassSceneRoot bg="#2E2008">
      <GC cx={149} cy={62} r={40} fill={GLASS_CREAM} />
      <GC cx={149} cy={62} r={32} fill={GLASS_CREAM_LT} />
      <GPoly points="149,99 123,37 175,37" fill={GLASS_AMBER_LT} />
      <GPoly points="149,99 123,37 175,37" fill={GLASS_RUBY} />
      <GPoly points="149,92 128,42 170,42" fill={GLASS_AMBER_LT} />
      <GP d="M123 37 C135 29 163 29 175 37 C163 44 135 44 123 37 Z" fill={GLASS_AMBER} />
      <GC cx={141} cy={56} r={5.4} fill={GLASS_RUBY} />
      <GC cx={157} cy={68} r={5.4} fill={GLASS_RUBY} />
      <GP d="M149 99 C145 105 147 109 149 113 C152 108 153 104 149 99 Z" fill={GLASS_AMBER_PALE} />
      <GP d="M155 93 C153 98 155 101 157 104 L161 102 C159 99 157 96 155 93 Z" fill={GLASS_AMBER_PALE} />
      <GPoly points="133,74 143,78 135,85" fill={GLASS_EMERALD} />
    </GlassSceneRoot>
  );
}

export function GlassRestChickenScene() {
  return (
    <GlassSceneRoot bg="#33161D">
      <GPoly points="117,47 185,47 177,103 125,103" fill={GLASS_RUBY} />
      <GR x={114} y={43} width={74} height={8} rx={3} fill={GLASS_CREAM} />
      <GLine x1={120} y1={68} x2={182} y2={68} c={GLASS_CREAM} w={2.2} />
      <GLine x1={123} y1={86} x2={179} y2={86} c={GLASS_CREAM} w={2.2} />
      <GP d="M123 46 C117 31 125 21 135 23 C144 25 145 38 139 44 Z" fill={GLASS_AMBER} />
      <GLine x1={134} y1={25} x2={129} y2={15} c={GLASS_CREAM} w={3.4} />
      <GP d="M147 44 C143 29 151 19 161 22 C169 25 169 38 163 43 Z" fill={GLASS_AMBER_LT} />
      <GLine x1={159} y1={24} x2={157} y2={13} c={GLASS_CREAM} w={3.4} />
      <GP d="M165 46 C163 33 171 25 179 28 C187 31 186 42 181 47 Z" fill={GLASS_AMBER} />
      <GLine x1={178} y1={30} x2={183} y2={21} c={GLASS_CREAM} w={3.4} />
      <GP d="M96 92 L119 92 C117 99 111 103 107 103 C102 103 97 99 96 92 Z" fill={GLASS_EMERALD} />
      <GDot cx={107} cy={95} r={2} fill={GLASS_CREAM} />
      <GR x={183} y={88} width={14} height={13} rx={2} fill={GLASS_AMBER_PALE} />
    </GlassSceneRoot>
  );
}

export function GlassRestDonutScene() {
  return (
    <GlassSceneRoot bg="#241A38">
      <GC cx={149} cy={43} r={27} fill={GLASS_AMBER_PALE} />
      <GP d="M131 31 C139 23 153 25 159 31 C167 27 173 36 169 44 C175 52 165 61 157 56 C149 63 135 58 137 50 C127 48 125 38 131 31 Z" fill={GLASS_RUBY} />
      <GC cx={149} cy={43} r={9.5} fill="#241A38" />
      <GC cx={149} cy={43} r={9.5} fill={GLASS_CREAM} />
      <GLine x1={135} y1={27} x2={141} y2={32} c={GLASS_EMERALD} w={2.4} />
      <GLine x1={163} y1={29} x2={167} y2={36} c={GLASS_AMBER} w={2.4} />
      <GLine x1={129} y1={48} x2={135} y2={50} c={GLASS_SAPPHIRE_LT} w={2.4} />
      <GLine x1={161} y1={54} x2={167} y2={52} c={GLASS_EMERALD} w={2.4} />
      <GLine x1={147} y1={23} x2={151} y2={28} c={GLASS_CREAM} w={2.4} />
      <GR x={103} y={81} width={96} height={21} rx={4} fill={GLASS_VIOLET} />
      <GLine x1={103} y1={81} x2={199} y2={81} c={GLASS_LEAD} w={2.2} />
      <GC cx={127} cy={81} r={10} fill={GLASS_AMBER} />
      <GC cx={127} cy={81} r={3.6} fill="#241A38" />
      <GC cx={169} cy={81} r={10} fill={GLASS_EMERALD} />
      <GC cx={169} cy={81} r={3.6} fill="#241A38" />
    </GlassSceneRoot>
  );
}

export function GlassRestCoffeeScene() {
  return (
    <GlassSceneRoot bg="#2E2008">
      <GLine x1={140} y1={14} x2={138} y2={28} c={GLASS_CREAM} w={1.8} />
      <GLine x1={158} y1={12} x2={156} y2={26} c={GLASS_CREAM} w={1.8} />
      <GP d="M104 94 C128 85 176 85 198 94 C176 104 128 104 104 94 Z" fill={GLASS_SAPPHIRE_LT} />
      <GR x={121} y={43} width={52} height={44} rx={7} fill={GLASS_CREAM} />
      <GP d="M173 53 C186 51 191 61 187 71 C184 77 178 78 173 76 Z" fill={GLASS_CREAM} />
      <GP d="M123 46 C135 40 159 40 171 46 C159 52 135 52 123 46 Z" fill="#3A2010" />
      <GP d="M130 46 C138 42 148 42 154 45 C148 48 138 48 130 46 Z" fill="#6B3A1F" />
      <GC cx={109} cy={100} r={5.4} fill="#6B3A1F" />
      <GC cx={124} cy={104} r={5.4} fill="#6B3A1F" />
      <GC cx={184} cy={101} r={5.4} fill="#6B3A1F" />
      <GLine x1={178} y1={90} x2={194} y2={84} c={GLASS_LEAD} w={2.2} />
    </GlassSceneRoot>
  );
}

export function GlassRestSushiScene() {
  return (
    <GlassSceneRoot bg="#14291F">
      <GR x={99} y={71} width={98} height={15} rx={3} fill="#6B3A1F" />
      <GC cx={119} cy={57} r={13} fill="#1E2B24" />
      <GC cx={119} cy={57} r={8} fill={GLASS_CREAM} />
      <GDot cx={119} cy={57} r={4.4} fill={GLASS_RUBY} />
      <GC cx={147} cy={57} r={13} fill="#1E2B24" />
      <GC cx={147} cy={57} r={8} fill={GLASS_CREAM} />
      <GDot cx={147} cy={57} r={4.4} fill={GLASS_AMBER} />
      <GC cx={175} cy={57} r={13} fill="#1E2B24" />
      <GC cx={175} cy={57} r={8} fill={GLASS_CREAM} />
      <GDot cx={175} cy={57} r={4.4} fill={GLASS_EMERALD} />
      <GPoly points="103,37 127,37 123,46 107,46" fill={GLASS_CREAM} />
      <GP d="M105 37 C111 31 121 31 125 37 L125 40 L105 40 Z" fill="#E88A6A" />
      <GLine x1={139} y1={23} x2={193} y2={40} c="#6B3A1F" w={2.6} />
      <GLine x1={135} y1={33} x2={189} y2={50} c="#6B3A1F" w={2.6} />
      <GC cx={107} cy={97} r={5.4} fill={GLASS_EMERALD} />
    </GlassSceneRoot>
  );
}

export function GlassRestChineseScene() {
  return (
    <GlassSceneRoot bg="#33161D">
      <GLine x1={146} y1={10} x2={144} y2={24} c={GLASS_CREAM} w={1.8} />
      <GPoly points="123,49 179,49 171,103 131,103" fill={GLASS_CREAM} />
      <GP d="M123 49 L109 35 L133 33 Z" fill={GLASS_CREAM_LT} />
      <GP d="M179 49 L191 35 L169 33 Z" fill={GLASS_CREAM_LT} />
      <GPoly points="151,65 163,78 151,91 139,78" fill={GLASS_RUBY} />
      <GP d="M127 44 C135 33 145 40 143 46 C151 34 163 35 165 44 Z" fill={GLASS_AMBER_PALE} />
      <GP d="M149 42 C155 32 167 33 171 42 L171 46 L149 46 Z" fill={GLASS_AMBER} />
      <GLine x1={162} y1={13} x2={184} y2={40} c="#6B3A1F" w={2.6} />
      <GLine x1={172} y1={11} x2={192} y2={38} c="#6B3A1F" w={2.6} />
      <GP d="M100 96 C106 85 123 85 127 94 C119 101 106 103 100 96 Z" fill={GLASS_AMBER_PALE} />
      <GLine x1={125} y1={92} x2={137} y2={90} c={GLASS_CREAM} w={2.2} />
    </GlassSceneRoot>
  );
}

export function GlassRestDinerScene() {
  return (
    <GlassSceneRoot bg="#241A38">
      <GR x={109} y={9} width={78} height={19} rx={9} fill={GLASS_RUBY} />
      <GDot cx={127} cy={18} r={2.4} fill={GLASS_AMBER_PALE} />
      <GDot cx={148} cy={18} r={2.4} fill={GLASS_CREAM} />
      <GDot cx={167} cy={18} r={2.4} fill={GLASS_AMBER_PALE} />
      <GP d="M100 92 C118 85 154 85 170 92 C154 100 118 100 100 92 Z" fill={GLASS_SAPPHIRE_LT} />
      <GP d="M113 84 C113 78 121 75 135 75 C149 75 157 78 157 84 C145 89 125 89 113 84 Z" fill={GLASS_AMBER_PALE} />
      <GR x={115} y={70} width={40} height={7} rx={2} fill="#6B3A1F" />
      <GP d="M113 68 C121 61 129 69 135 62 C142 69 149 61 157 68 L157 71 L113 71 Z" fill={GLASS_EMERALD} />
      <GP d="M113 62 C113 49 123 43 135 43 C147 43 157 49 157 62 C143 56 127 56 113 62 Z" fill={GLASS_AMBER} />
      <GDot cx={127} cy={50} r={2} fill={GLASS_CREAM} />
      <GDot cx={143} cy={50} r={2} fill={GLASS_CREAM} />
      <GPoly points="173,57 193,57 189,93 177,93" fill={GLASS_SAPPHIRE_LT} />
      <GLine x1={187} y1={35} x2={183} y2={57} c={GLASS_RUBY} w={2.6} />
      <GC cx={183} cy={51} r={4.4} fill={GLASS_RUBY} />
    </GlassSceneRoot>
  );
}

export function GlassRestDessertScene() {
  return (
    <GlassSceneRoot bg="#241A38">
      <GP d="M121 61 L177 61 C175 78 165 89 149 89 C133 89 123 78 121 61 Z" fill={GLASS_SAPPHIRE_LT} />
      <GPoly points="149,89 149,100 133,105 165,105" fill={GLASS_SAPPHIRE} />
      <GC cx={133} cy={51} r={14} fill={GLASS_CREAM} />
      <GC cx={163} cy={51} r={14} fill={GLASS_RUBY} />
      <GC cx={148} cy={35} r={14} fill={GLASS_AMBER_PALE} />
      <GP d="M137 29 C143 23 153 23 159 29 L159 33 L137 33 Z" fill="#6B3A1F" />
      <GC cx={148} cy={19} r={5.4} fill={GLASS_RUBY} />
      <GP d="M151 15 C155 9 161 7 165 9 L163 13 L151 15 Z" fill={GLASS_EMERALD} />
      <GPoly points="169,21 179,26 163,52 155,47" fill={GLASS_AMBER} />
      <GLine x1={187} y1={43} x2={179} y2={77} c={GLASS_LEAD} w={2.4} />
      <GDot cx={138} cy={70} r={2.2} fill={GLASS_RUBY} />
      <GDot cx={160} cy={74} r={2.2} fill={GLASS_VIOLET} />
    </GlassSceneRoot>
  );
}

export function GlassRestItalianScene() {
  return (
    <GlassSceneRoot bg="#14291F">
      <GP d="M101 56 L189 56 C187 79 169 95 145 95 C121 95 103 79 101 56 Z" fill={GLASS_CREAM} />
      <GR x={97} y={52} width={96} height={8} rx={3} fill={GLASS_CREAM_LT} />
      <GP d="M113 51 C121 40 133 44 131 51 C139 40 151 40 153 51 Z" fill={GLASS_AMBER_PALE} />
      <GP d="M141 51 C147 39 161 39 165 50 C171 41 183 42 185 51 Z" fill={GLASS_AMBER} />
      <GC cx={129} cy={67} r={6.4} fill={GLASS_RUBY} />
      <GC cx={163} cy={71} r={6.4} fill={GLASS_RUBY} />
      <GPoly points="147,29 155,38 147,42 140,35" fill={GLASS_EMERALD} />
      <GPoly points="177,17 187,22 163,53 155,48" fill={GLASS_AMBER_PALE} />
      <GLine x1={169} y1={29} x2={177} y2={34} c={GLASS_LEAD} w={1.6} />
      <GDot cx={119} cy={81} r={2} fill={GLASS_CREAM} />
      <GDot cx={149} cy={85} r={2} fill={GLASS_CREAM} />
      <GLine x1={109} y1={29} x2={121} y2={51} c={GLASS_LEAD} w={2.2} />
    </GlassSceneRoot>
  );
}

export function GlassRestSeafoodScene() {
  return (
    <GlassSceneRoot bg="#14291F">
      <GP d="M96 102 C112 96 128 108 144 102 C160 96 176 108 194 102 L194 110 L96 110 Z" fill={GLASS_SAPPHIRE} />
      <GP d="M98 84 C122 76 176 76 198 84 C176 94 122 94 98 84 Z" fill={GLASS_SAPPHIRE_LT} />
      <GP d="M109 68 C123 51 153 47 173 60 C177 63 177 67 173 70 C153 81 123 83 109 68 Z" fill={GLASS_SAPPHIRE_LT} />
      <GP d="M109 68 C123 51 153 47 173 60 C166 68 150 74 134 75 C123 74 114 72 109 68 Z" fill={GLASS_CREAM_LT} />
      <GPoly points="173,60 191,49 189,68 191,81 173,70" fill={GLASS_SAPPHIRE} />
      <GP d="M139 54 C145 58 145 67 139 73 L134 70 C138 64 138 59 139 54 Z" fill={GLASS_VIOLET_LT} />
      <GP d="M127 58 C131 62 131 67 127 72 L122 69 C125 65 125 61 127 58 Z" fill={GLASS_VIOLET} />
      <GDot cx={121} cy={62} r={2.6} fill={GLASS_LEAD} />
      <GC cx={183} cy={90} r={8.5} fill={GLASS_AMBER} />
      <GLine x1={176} y1={90} x2={190} y2={90} c={GLASS_LEAD} w={1.6} />
      <GP d="M107 93 C101 86 107 78 115 83 C121 86 119 95 111 96 C109 95 108 94 107 93 Z" fill="#E88A6A" />
      <GP d="M149 42 C153 37 159 37 163 42 L163 46 L149 46 Z" fill={GLASS_EMERALD} />
    </GlassSceneRoot>
  );
}

export function GlassRestHealthyScene() {
  return (
    <GlassSceneRoot bg="#14291F">
      <GC cx={185} cy={19} r={10} fill={GLASS_AMBER} />
      <GLine x1={185} y1={5} x2={185} y2={9} c={GLASS_AMBER} w={2.2} />
      <GLine x1={197} y1={11} x2={194} y2={14} c={GLASS_AMBER} w={2.2} />
      <GLine x1={173} y1={11} x2={176} y2={14} c={GLASS_AMBER} w={2.2} />
      <GP d="M99 58 L169 58 C167 81 153 95 134 95 C115 95 101 81 99 58 Z" fill={GLASS_EMERALD} />
      <GR x={95} y={54} width={78} height={8} rx={3} fill="#3FA46A" />
      <GP d="M109 56 C105 43 115 35 125 40 C129 48 121 57 109 56 Z" fill="#7AB648" />
      <GP d="M133 56 C131 42 143 34 153 41 C155 50 145 57 133 56 Z" fill={GLASS_EMERALD} />
      <GC cx={119} cy={73} r={6} fill={GLASS_RUBY} />
      <GC cx={147} cy={79} r={6} fill={GLASS_AMBER} />
      <GDot cx={134} cy={68} r={2.2} fill={GLASS_CREAM} />
      <GPoly points="175,51 195,51 191,95 179,95" fill={GLASS_RUBY} />
      <GLine x1={176} y1={64} x2={194} y2={64} c={GLASS_CREAM} w={2} />
      <GLine x1={189} y1={29} x2={185} y2={51} c={GLASS_EMERALD} w={2.6} />
    </GlassSceneRoot>
  );
}

export function GlassRestIndianScene() {
  return (
    <GlassSceneRoot bg="#33161D">
      <GLine x1={138} y1={14} x2={136} y2={28} c={GLASS_CREAM} w={1.8} />
      <GP d="M102 94 C126 86 170 86 192 94 C170 103 126 103 102 94 Z" fill={GLASS_SAPPHIRE_LT} />
      <GP d="M107 56 L183 56 C181 77 165 91 145 91 C125 91 109 77 107 56 Z" fill="#6B3A1F" />
      <GR x={103} y={52} width={84} height={8} rx={3} fill={GLASS_AMBER} />
      <GP d="M115 53 C131 45 159 45 175 53 C159 59 131 59 115 53 Z" fill="#D94F30" />
      <GP d="M133 51 C139 46 149 46 153 51 C147 55 139 55 133 51 Z" fill={GLASS_AMBER_LT} />
      <GPoly points="179,19 195,28 187,59 173,52" fill={GLASS_AMBER_PALE} />
      <GDot cx={183} cy={36} r={2} fill="#6B3A1F" />
      <GDot cx={181} cy={47} r={2} fill="#6B3A1F" />
      <GP d="M109 89 C111 78 121 74 127 79 C133 74 139 81 139 89 C129 93 117 93 109 89 Z" fill={GLASS_CREAM} />
      <GDot cx={157} cy={99} r={2.2} fill={GLASS_RUBY} />
      <GDot cx={168} cy={97} r={2.2} fill={GLASS_AMBER} />
      <GDot cx={146} cy={70} r={2.4} fill={GLASS_EMERALD} />
      <GDot cx={160} cy={76} r={2.4} fill={GLASS_CREAM} />
    </GlassSceneRoot>
  );
}
