import Svg, { Circle, Ellipse, Line, Path, Rect } from "react-native-svg";
import { BIBLE_GENRE_LABELS, type BibleBookGenre } from "@/lib/bible-genres";

/**
 * Small flat-vector genre motif for the Personal Study card header.
 * Line-icon style, single color — tucked into the card's corner, never loud.
 */
export function BibleGenreMotif({
  genre,
  color,
  size = 20,
}: {
  genre: BibleBookGenre;
  color: string;
  size?: number;
}) {
  const s = { stroke: color, strokeWidth: 1.7, fill: "none", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityLabel={`${BIBLE_GENRE_LABELS[genre]} motif`}>
      {genre === "law" && (
        <>
          <Rect x={3.5} y={5} width={7.5} height={14} rx={2} {...s} />
          <Rect x={13} y={5} width={7.5} height={14} rx={2} {...s} />
          <Line x1={6} y1={9.5} x2={8.5} y2={9.5} {...s} />
          <Line x1={6} y1={12.5} x2={8.5} y2={12.5} {...s} />
          <Line x1={15.5} y1={9.5} x2={18} y2={9.5} {...s} />
          <Line x1={15.5} y1={12.5} x2={18} y2={12.5} {...s} />
        </>
      )}
      {genre === "history" && (
        <>
          <Rect x={6} y={8} width={12} height={8} rx={1} {...s} />
          <Circle cx={6} cy={12} r={3} {...s} />
          <Circle cx={18} cy={12} r={3} {...s} />
          <Line x1={9.5} y1={11} x2={14.5} y2={11} {...s} />
          <Line x1={9.5} y1={13.5} x2={14.5} y2={13.5} {...s} />
        </>
      )}
      {genre === "poetry" && (
        <>
          <Path d="M7 19.5 V5.5 L17.5 19.5 H7" {...s} />
          <Line x1={10.2} y1={9.5} x2={10.2} y2={17.5} {...s} />
          <Line x1={12.8} y1={12} x2={12.8} y2={17.5} {...s} />
        </>
      )}
      {genre === "major-prophets" && (
        <>
          <Rect x={8} y={4.5} width={8} height={15} rx={1} {...s} />
          <Line x1={6.5} y1={4.5} x2={17.5} y2={4.5} {...s} />
          <Line x1={6.5} y1={19.5} x2={17.5} y2={19.5} {...s} />
          <Circle cx={16.5} cy={12} r={2.6} fill={color} />
        </>
      )}
      {genre === "minor-prophets" && (
        <>
          <Ellipse cx={10.5} cy={15} rx={6} ry={3.2} {...s} />
          <Path d="M16.5 14.5 L20 12.5" {...s} />
          <Path d="M12 11.5 C12.8 10 12.4 8.8 12 7.5 C11.6 8.8 11.2 10 12 11.5 Z" fill={color} />
        </>
      )}
      {genre === "gospels" && (
        <>
          <Path d="M7.5 15.5 A4.5 4.5 0 0 1 16.5 15.5" {...s} />
          <Line x1={4} y1={15.5} x2={20} y2={15.5} {...s} />
          <Line x1={12} y1={5} x2={12} y2={7.5} {...s} />
          <Line x1={6.8} y1={7} x2={8.2} y2={8.8} {...s} />
          <Line x1={17.2} y1={7} x2={15.8} y2={8.8} {...s} />
        </>
      )}
      {genre === "acts" && (
        <Path
          d="M12 3.5 C13.8 7.5 16.5 9.8 16.5 14 A4.5 4.5 0 0 1 7.5 14 C7.5 9.8 10.2 7.5 12 3.5 Z"
          {...s}
        />
      )}
      {genre === "epistles" && (
        <>
          <Rect x={4} y={6.5} width={16} height={11} rx={2} {...s} />
          <Path d="M4.8 8.5 L12 13.5 L19.2 8.5" {...s} />
        </>
      )}
      {genre === "revelation" && (
        <>
          <Path d="M5 17 L4 9.5 L8.8 12.5 L12 6.5 L15.2 12.5 L20 9.5 L19 17 Z" {...s} />
          <Circle cx={7} cy={5.5} r={1.1} fill={color} />
          <Circle cx={12} cy={4} r={1.1} fill={color} />
          <Circle cx={17} cy={5.5} r={1.1} fill={color} />
        </>
      )}
    </Svg>
  );
}
