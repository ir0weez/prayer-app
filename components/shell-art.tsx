// Shell silhouettes for the Tide Pools game and the collections book.
// Simple, readable SVG shapes — one per shell kind, tinted by the
// species color. The starfish is a tide-pool bonus, not a book entry.

import Svg, { Circle, Ellipse, Path } from "react-native-svg";

export function ShellArt({
  icon,
  color,
  size = 30,
}: {
  /** clam | scallop | cowrie | sanddollar | whelk | conch | starfish | crab */
  icon: string;
  color: string;
  size?: number;
}) {
  const s = size;
  return (
    <Svg width={s} height={s} viewBox="0 0 40 40">
      {icon === "clam" && (
        <>
          <Path d="M5 27 A15 13 0 0 1 35 27 Z" fill={color} />
          <Path d="M9 26 A11 9 0 0 1 31 26" fill="none" stroke="#FFFFFF" strokeWidth={1.6} opacity={0.5} />
          <Path d="M14 26 A6 5 0 0 1 26 26" fill="none" stroke="#FFFFFF" strokeWidth={1.4} opacity={0.45} />
          <Path d="M6 29 h28" stroke={color} strokeWidth={3} strokeLinecap="round" />
        </>
      )}
      {icon === "scallop" && (
        <>
          <Path d="M20 34 L7 15 A15 15 0 0 1 33 15 Z" fill={color} />
          <Path d="M20 33 L13 12 M20 33 L20 10 M20 33 L27 12" stroke="#FFFFFF" strokeWidth={1.5} opacity={0.5} />
          <Path d="M15 35 h10 l-1.6 -3.4 h-6.8 Z" fill={color} />
        </>
      )}
      {icon === "cowrie" && (
        <>
          <Ellipse cx={20} cy={20} rx={10} ry={14} fill={color} />
          <Ellipse cx={16.5} cy={14} rx={3.4} ry={5.5} fill="#FFFFFF" opacity={0.4} />
          <Path d="M20 8 v24" stroke="#7C2D12" strokeWidth={2} strokeDasharray="3 2.6" />
          <Circle cx={13} cy={12} r={1.6} fill="#7C2D12" opacity={0.55} />
          <Circle cx={27.5} cy={18} r={1.6} fill="#7C2D12" opacity={0.55} />
          <Circle cx={12.5} cy={26} r={1.6} fill="#7C2D12" opacity={0.55} />
        </>
      )}
      {icon === "sanddollar" && (
        <>
          <Circle cx={20} cy={20} r={14.5} fill={color} />
          <Circle cx={20} cy={20} r={14.5} fill="none" stroke="#A8A29E" strokeWidth={1.4} />
          {[0, 72, 144, 216, 288].map((deg) => (
            <Ellipse
              key={deg}
              cx={20 + 7.4 * Math.sin((deg * Math.PI) / 180)}
              cy={20 - 7.4 * Math.cos((deg * Math.PI) / 180)}
              rx={2}
              ry={3.6}
              fill="#A8A29E"
              opacity={0.75}
              transform={`rotate(${deg} ${20 + 7.4 * Math.sin((deg * Math.PI) / 180)} ${20 - 7.4 * Math.cos((deg * Math.PI) / 180)})`}
            />
          ))}
          <Circle cx={20} cy={20} r={2.1} fill="#A8A29E" opacity={0.8} />
        </>
      )}
      {icon === "whelk" && (
        <>
          <Path d="M14 35 C6 28 8 16 16 12 C15 6 21 3 25 6 C32 7 35 14 32 20 C35 26 31 33 24 33 C22 36 17 37 14 35 Z" fill={color} />
          <Path d="M16 12 C20 18 27 20 32 20 M14.5 21 C20 25 27 26 31.5 25" fill="none" stroke="#FFFFFF" strokeWidth={1.5} opacity={0.45} />
          <Path d="M24 33 l-2 4 M28 32 l0 4.6" stroke={color} strokeWidth={2.6} strokeLinecap="round" />
        </>
      )}
      {icon === "conch" && (
        <>
          <Path d="M8 30 C4 22 10 12 19 11 L34 6 C36 5.4 37.4 7 36.8 8.8 L33 20 C36 26 32 33 24 33 L12 33 C10 33 8.6 31.8 8 30 Z" fill={color} />
          <Path d="M33 20 C29 23 24 24 19 23" fill="none" stroke="#FFFFFF" strokeWidth={1.7} opacity={0.55} />
          <Path d="M12 16 l-3.4 -3.4 M19 12.4 l-1.6 -4.4 M26 9.6 l0.6 -4.6" stroke={color} strokeWidth={2.6} strokeLinecap="round" />
          <Ellipse cx={14} cy={27} rx={4.4} ry={3} fill="#FDF2F8" opacity={0.85} />
        </>
      )}
      {icon === "starfish" && (
        <>
          <Path
            d="M20 4 L24 15.4 L36 15.8 L26.4 23.2 L29.6 35 L20 28.2 L10.4 35 L13.6 23.2 L4 15.8 L16 15.4 Z"
            fill={color}
            stroke="#EA580C"
            strokeWidth={1.4}
            strokeLinejoin="round"
          />
          <Circle cx={20} cy={19} r={1.7} fill="#FFEDD5" />
          <Circle cx={20} cy={24} r={1.3} fill="#FFEDD5" />
          <Circle cx={15.5} cy={21.5} r={1.2} fill="#FFEDD5" />
          <Circle cx={24.5} cy={21.5} r={1.2} fill="#FFEDD5" />
        </>
      )}
      {icon === "crab" && (
        <>
          <Ellipse cx={20} cy={23} rx={11} ry={7.6} fill={color} />
          <Circle cx={15.5} cy={15.4} r={2.1} fill="#1F2937" />
          <Circle cx={24.5} cy={15.4} r={2.1} fill="#1F2937" />
          <Path d="M17 17.6 v3 M23 17.6 v3" stroke={color} strokeWidth={2} />
          <Path d="M9.6 17 C5 14.6 4.4 9.6 7.6 7.4 C10 5.8 12.6 8 12.2 11 Z" fill={color} />
          <Path d="M30.4 17 C35 14.6 35.6 9.6 32.4 7.4 C30 5.8 27.4 8 27.8 11 Z" fill={color} />
          <Path d="M10 27 l-4.6 3.4 M11.6 30.4 L7.4 34.6 M30 27 l4.6 3.4 M28.4 30.4 l4.2 4.2" stroke={color} strokeWidth={2.2} strokeLinecap="round" />
        </>
      )}
    </Svg>
  );
}
