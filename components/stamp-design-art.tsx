import { useId } from "react";
import {
  Circle,
  Defs,
  Ellipse,
  G,
  Line,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
  Text as SvgText,
  TextPath,
} from "react-native-svg";

import { formatIsoDateForDisplay } from "@/lib/prayercircle-data";
import type { ReachedStamp } from "@/lib/reached-stamps";
import { darkenHex, getStampDesignId, postagePerforationPath, type StampDesignId } from "@/lib/stamp-designs";

/* ------------------------------------------------------------------ */
/* Stamp designs (2026-10-21): the POSTAGE sticker and the COIN carry */
/* a real Christian emblem, assigned per PERSON (lib/stamp-designs).  */
/* One emblem renderer, drawn in a 64×64 box, parameterized by tone:  */
/* the postage prints it in colour on a warm sky panel; the coin      */
/* strikes it three times in gold relief tones. No emojis, no rings   */
/* borrowed from the passport artwork — a picture, not a circle.      */
/* ------------------------------------------------------------------ */

export type EmblemTones = { main: string; deep: string; pale: string };

export function StampEmblem({ design, tones }: { design: StampDesignId; tones: EmblemTones }) {
  const { main, deep, pale } = tones;
  switch (design) {
    case "sunrise-cross":
      return (
        <G>
          <G stroke={pale} strokeWidth={2.2} strokeLinecap="round">
            <Line x1="32" y1="13" x2="32" y2="18" />
            <Line x1="17" y1="18" x2="20.5" y2="21.5" />
            <Line x1="47" y1="18" x2="43.5" y2="21.5" />
            <Line x1="12" y1="33" x2="17" y2="33" />
            <Line x1="52" y1="33" x2="47" y2="33" />
          </G>
          <Circle cx="32" cy="33" r="12" fill={pale} />
          <Path d="M 2 64 L 2 52 Q 18 42 32 48 Q 46 42 62 52 L 62 64 Z" fill={deep} />
          <Rect x="30.7" y="19" width="2.6" height="29" fill={deep} />
          <Rect x="25.7" y="27" width="12.6" height="2.6" fill={deep} />
        </G>
      );
    case "ichthys":
      return (
        <G>
          <G stroke={pale} strokeWidth={2} strokeLinecap="round">
            <Line x1="20" y1="7" x2="22" y2="11.5" />
            <Line x1="32" y1="5" x2="32" y2="10.5" />
            <Line x1="44" y1="7" x2="42" y2="11.5" />
          </G>
          <Path
            fill={main}
            fillRule="evenodd"
            d="M 6 32 Q 26 13 45 25 L 58 15 Q 54.5 32 58 47 L 45 37 Q 26 51 6 32 Z M 15.7 29 a 2.3 2.3 0 1 0 4.6 0 a 2.3 2.3 0 1 0 -4.6 0"
          />
          <G fill="none" stroke={main} strokeWidth={1.7} strokeLinecap="round">
            <Path d="M 4 55 Q 10 51 16 55 T 28 55 T 40 55 T 52 55 T 60 55" />
            <Path d="M 12 60.5 Q 18 57 24 60.5 T 36 60.5 T 48 60.5" />
          </G>
        </G>
      );
    case "dove":
      return (
        <G>
          <G stroke={pale} strokeWidth={2} strokeLinecap="round">
            <Line x1="32" y1="3" x2="32" y2="9" />
            <Line x1="18" y1="6" x2="20.5" y2="11" />
            <Line x1="46" y1="6" x2="43.5" y2="11" />
            <Line x1="10" y1="13" x2="15" y2="16.5" />
            <Line x1="54" y1="13" x2="49" y2="16.5" />
          </G>
          <Ellipse cx="29" cy="31" rx="13" ry="6" transform="rotate(-18 29 31)" fill={pale} />
          <Path d="M 22 29 L 9 12 L 30 21.5 Z" fill={pale} />
          <Path d="M 19 35.5 L 8 43.5 L 17 44.5 L 13 49.5 L 25 39.5 Z" fill={pale} />
          <Circle cx="41" cy="25" r="3.8" fill={pale} />
          <Path d="M 44.4 23.8 L 49.6 25.4 L 44.4 27 Z" fill={deep} />
          <Path d="M 44 46.5 Q 51 42.5 58 45.5" fill="none" stroke={main} strokeWidth={1.6} strokeLinecap="round" />
          <G fill={main}>
            <Ellipse cx="48" cy="43.5" rx="3.2" ry="1.6" transform="rotate(-30 48 43.5)" />
            <Ellipse cx="54" cy="43.5" rx="3.2" ry="1.6" transform="rotate(20 54 43.5)" />
            <Ellipse cx="51" cy="48" rx="3" ry="1.5" transform="rotate(-8 51 48)" />
          </G>
          <Path d="M 4 58 Q 10 54.5 16 58 T 28 58 T 40 58 T 52 58 T 60 58" fill="none" stroke={deep} strokeWidth={1.6} strokeLinecap="round" />
        </G>
      );
    case "anchor":
      return (
        <G>
          <Circle cx="32" cy="10" r="4.2" fill="none" stroke={main} strokeWidth={2.4} />
          <Rect x="30.5" y="14" width="3" height="36" fill={main} />
          <Rect x="19" y="21" width="26" height="3.2" rx="1.2" fill={main} />
          <Path d="M 35.5 13.5 Q 48.5 20.5 42.5 33" fill="none" stroke={main} strokeWidth={1.8} strokeLinecap="round" opacity={0.8} />
          <Path d="M 8 33 C 8 46 17 54 29 55.5 L 29 50.5 C 21 49.5 13.5 44 11.5 36.5 Z" fill={main} />
          <Path d="M 8 33 L 4.5 40.5 L 12.5 41.5 Z" fill={main} />
          <Path d="M 56 33 C 56 46 47 54 35 55.5 L 35 50.5 C 43 49.5 50.5 44 52.5 36.5 Z" fill={main} />
          <Path d="M 56 33 L 59.5 40.5 L 51.5 41.5 Z" fill={main} />
          <Path d="M 6 61.5 Q 12 58.5 18 61.5 T 30 61.5 T 42 61.5 T 54 61.5" fill="none" stroke={deep} strokeWidth={1.6} strokeLinecap="round" />
        </G>
      );
    case "lighthouse":
      return (
        <G>
          <G fill={pale} opacity={0.45}>
            <Path d="M 26.5 16.5 L 3 8.5 L 3 25 Z" />
            <Path d="M 37.5 16.5 L 61 8.5 L 61 25 Z" />
          </G>
          <Path d="M 25.5 13 L 38.5 13 L 32 5.5 Z" fill={deep} />
          <Rect x="27.5" y="13" width="9" height="8" fill={deep} />
          <Circle cx="32" cy="17" r="2.7" fill={pale} />
          <Rect x="25.5" y="21" width="13" height="2.2" fill={deep} />
          <Path d="M 27.8 23.2 L 36.2 23.2 L 37 33 L 27 33 Z" fill={pale} />
          <Path d="M 27 33 L 37 33 L 37.8 43 L 26.2 43 Z" fill={main} />
          <Path d="M 26.2 43 L 37.8 43 L 38.6 53 L 25.4 53 Z" fill={pale} />
          <Path d="M 3 64 L 3 57 Q 13 51 24 56 L 40 56 Q 51 51 61 57 L 61 64 Z" fill={deep} />
          <Path d="M 8 61 Q 13 58.5 18 61 T 28 61" fill="none" stroke={pale} strokeWidth={1.4} strokeLinecap="round" opacity={0.6} />
        </G>
      );
    case "loaves-fishes":
      return (
        <G>
          <G fill={main}>
            <Path d="M 6 29 Q 13 21 20 25.5 L 25 21 Q 23.8 28.5 25 36 L 20 31.5 Q 13 37 6 29 Z" />
            <Path d="M 58 29 Q 51 21 44 25.5 L 39 21 Q 40.2 28.5 39 36 L 44 31.5 Q 51 37 58 29 Z" />
          </G>
          <G fill={main}>
            <Ellipse cx="20" cy="37" rx="6" ry="3.6" transform="rotate(-14 20 37)" />
            <Ellipse cx="32" cy="34.5" rx="6.6" ry="4" />
            <Ellipse cx="44" cy="37" rx="6" ry="3.6" transform="rotate(14 44 37)" />
          </G>
          <G stroke={deep} strokeWidth={1} strokeLinecap="round">
            <Line x1="29.5" y1="32.8" x2="31.5" y2="35.4" />
            <Line x1="33.5" y1="32.6" x2="35.5" y2="35.2" />
          </G>
          <Rect x="13" y="41" width="38" height="4.6" rx="2" fill={deep} />
          <Path d="M 16 45.6 L 48 45.6 L 44.5 60 Q 32 63 19.5 60 Z" fill={deep} />
          <G stroke={pale} strokeWidth={1} opacity={0.5} strokeLinecap="round">
            <Line x1="18.5" y1="51.5" x2="45.5" y2="51.5" />
            <Line x1="24" y1="46" x2="23.2" y2="59" />
            <Line x1="32" y1="46" x2="32" y2="60.5" />
            <Line x1="40" y1="46" x2="40.8" y2="59" />
          </G>
        </G>
      );
    case "empty-tomb":
      return (
        <G>
          <G stroke={pale} strokeWidth={2} strokeLinecap="round">
            <Line x1="32" y1="2.5" x2="32" y2="7.5" />
            <Line x1="16" y1="5.5" x2="19" y2="10" />
            <Line x1="48" y1="5.5" x2="45" y2="10" />
          </G>
          <Path
            fill={deep}
            fillRule="evenodd"
            d="M 5 62 L 5 35 Q 5 13 32 13 Q 59 13 59 35 L 59 62 Z M 24 62 L 24 41 Q 24 31 32 31 Q 40 31 40 41 L 40 62 Z"
          />
          <Circle cx="49.5" cy="52" r="7.5" fill={main} />
          <Rect x="2" y="61.5" width="60" height="2" fill={deep} />
        </G>
      );
    case "mustard-tree":
      return (
        <G>
          <G stroke={deep} strokeWidth={2.2} strokeLinecap="round" fill="none">
            <Path d="M 31 41 Q 24 34.5 17.5 33.5" />
            <Path d="M 33 41 Q 40 33.5 47 32.5" />
            <Path d="M 32 38 Q 31.5 29.5 26.5 24.5" />
            <Path d="M 32.5 38 Q 36.5 29.5 42 25.5" />
          </G>
          <Path d="M 30.2 62 C 31 52 31 46 29.8 38 L 34.2 38 C 33 46 33 52 33.8 62 Z" fill={deep} />
          <G fill={main}>
            <Circle cx="21" cy="25" r="9.5" />
            <Circle cx="32" cy="17" r="11.5" />
            <Circle cx="43" cy="25" r="9.5" />
            <Circle cx="26" cy="29.5" r="8.5" />
            <Circle cx="38" cy="29.5" r="8.5" />
          </G>
          <G stroke={deep} strokeWidth={1.3} strokeLinecap="round" fill="none">
            <Path d="M 13.5 18.5 q 2.6 -2.6 5.2 0 q 2.6 -2.6 5.2 0" />
            <Path d="M 41 11.5 q 2.4 -2.4 4.8 0 q 2.4 -2.4 4.8 0" />
          </G>
          <Path d="M 4 64 L 4 61 Q 20 57 32 60 Q 44 57 60 61 L 60 64 Z" fill={deep} />
          <G fill={pale}>
            <Circle cx="14" cy="59.5" r="1.1" />
            <Circle cx="50" cy="59.8" r="1.1" />
          </G>
        </G>
      );
  }
}

/* ------------------------------------------------------------------ */
/* POSTAGE — the sticker as a commemorative mail stamp: perforated    */
/* white body, a framed picture (the person's design), and the name / */
/* date printed in the margin the way real stamps print them.         */
/* ------------------------------------------------------------------ */

const POSTAGE_SKY_TOP = "#FDE68A";
const POSTAGE_SKY_BOTTOM = "#FDBA74";
const POSTAGE_PALE = "#FFF7E0";

export function PostageStampArt({ stamp, ink }: { stamp: ReachedStamp; ink: string }) {
  const rawId = useId().replace(/[^a-zA-Z0-9]/g, "");
  const skyId = `postageSky${rawId}`;
  const design = getStampDesignId(stamp.personId, stamp.personName);
  const dark = darkenHex(ink, 0.55);
  const shortName = stamp.personName.length > 11 ? `${stamp.personName.slice(0, 10)}…` : stamp.personName;
  return (
    <G>
      <Defs>
        <LinearGradient id={skyId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={POSTAGE_SKY_TOP} />
          <Stop offset="1" stopColor={POSTAGE_SKY_BOTTOM} />
        </LinearGradient>
      </Defs>
      <Path d={postagePerforationPath(6, 6, 112, 112, 2.8, 6.2)} fill="#FFFFFF" stroke="#D8D2C4" strokeWidth={0.8} />
      <Rect x="16" y="14" width="92" height="72" fill={`url(#${skyId})`} />
      <G transform="translate(30 18)">
        <StampEmblem design={design} tones={{ main: ink, deep: dark, pale: POSTAGE_PALE }} />
      </G>
      <Rect x="16" y="14" width="92" height="72" fill="none" stroke={dark} strokeWidth={1.2} opacity={0.5} />
      {/* A small drawn cross printed in the picture's corner, like a
          denomination mark on a real commemorative issue. */}
      <G fill={dark} opacity={0.85}>
        <Rect x="100.1" y="16.5" width="1.8" height="9" />
        <Rect x="97.5" y="19.6" width="7" height="1.8" />
      </G>
      <SvgText x="62" y="98" textAnchor="middle" fill={dark} fontSize="7.5" fontWeight="800" letterSpacing="0.3">
        {`${shortName.toUpperCase()} · REACHED`}
      </SvgText>
      <SvgText x="62" y="108.5" textAnchor="middle" fill={dark} fontSize="6.2" fontWeight="700" letterSpacing="0.3">
        {`${formatIsoDateForDisplay(stamp.date)} · PRAYERCIRCLE`}
      </SvgText>
    </G>
  );
}

/* ------------------------------------------------------------------ */
/* COIN — the stamp struck as a gold coin: radial gold disc, reeded   */
/* rim, the person's emblem in relief on the face, and the rim        */
/* legend — name curved along the top, REACHED · year along the       */
/* bottom — that makes it read as a coin.                             */
/* ------------------------------------------------------------------ */

const COIN_GOLD_LIGHT = "#F6D67C";
const COIN_GOLD_MID = "#D9A83E";
const COIN_GOLD_EDGE = "#A87B1F";
const COIN_GOLD_DEEP = "#8A6414";
const COIN_GOLD_PALE = "#FBE9B7";
const COIN_GOLD_MAIN = "#B8860B";

const COIN_REEDS = Array.from({ length: 72 }, (_, i) => {
  const angle = (i / 72) * Math.PI * 2;
  return {
    x1: 62 + Math.cos(angle) * 56,
    y1: 62 + Math.sin(angle) * 56,
    x2: 62 + Math.cos(angle) * 59,
    y2: 62 + Math.sin(angle) * 59,
  };
});

const COIN_SHADOW_TONES: EmblemTones = { main: COIN_GOLD_DEEP, deep: COIN_GOLD_DEEP, pale: COIN_GOLD_DEEP };
const COIN_HIGHLIGHT_TONES: EmblemTones = { main: COIN_GOLD_PALE, deep: COIN_GOLD_PALE, pale: COIN_GOLD_PALE };
const COIN_MAIN_TONES: EmblemTones = { main: COIN_GOLD_MAIN, deep: COIN_GOLD_MAIN, pale: COIN_GOLD_MAIN };

export function CoinStampArt({ stamp }: { stamp: ReachedStamp }) {
  const rawId = useId().replace(/[^a-zA-Z0-9]/g, "");
  const goldId = `coinGold${rawId}`;
  const topLegendId = `coinTop${rawId}`;
  const bottomLegendId = `coinBottom${rawId}`;
  const design = getStampDesignId(stamp.personId, stamp.personName);
  const shortName = stamp.personName.length > 18 ? `${stamp.personName.slice(0, 17)}…` : stamp.personName;
  const year = stamp.date.slice(0, 4);
  return (
    <G>
      <Defs>
        <RadialGradient id={goldId} cx="38%" cy="34%" r="95%">
          <Stop offset="0" stopColor={COIN_GOLD_LIGHT} />
          <Stop offset="0.55" stopColor={COIN_GOLD_MID} />
          <Stop offset="1" stopColor={COIN_GOLD_EDGE} />
        </RadialGradient>
        {/* Legend paths: the name rides the TOP arc (baseline r 41.5,
            letters rising toward the rim); REACHED · year rides the
            BOTTOM arc the other way round, so it reads upright like
            the date legend on a real coin. */}
        <Path id={topLegendId} d="M 20.5 62 A 41.5 41.5 0 0 1 103.5 62" />
        <Path id={bottomLegendId} d="M 12 62 A 50 50 0 0 0 112 62" />
      </Defs>
      <Circle cx="62" cy="62" r="59" fill={`url(#${goldId})`} />
      <G stroke={COIN_GOLD_DEEP} strokeWidth={1.5} opacity={0.75}>
        {COIN_REEDS.map((reed, index) => (
          <Line key={index} x1={reed.x1} y1={reed.y1} x2={reed.x2} y2={reed.y2} />
        ))}
      </G>
      <Circle cx="62" cy="62" r="55" fill="none" stroke={COIN_GOLD_DEEP} strokeWidth={1.1} opacity={0.7} />
      <Circle cx="62" cy="62" r="38" fill="none" stroke={COIN_GOLD_PALE} strokeWidth={1} opacity={0.5} />
      {/* The struck emblem: shadow pass down-right, highlight pass
          up-left, the main strike on top — relief, in gold only. */}
      <G transform="translate(1 1.1)" opacity={0.45}>
        <G transform="translate(30 30)">
          <StampEmblem design={design} tones={COIN_SHADOW_TONES} />
        </G>
      </G>
      <G transform="translate(-0.9 -0.9)" opacity={0.7}>
        <G transform="translate(30 30)">
          <StampEmblem design={design} tones={COIN_HIGHLIGHT_TONES} />
        </G>
      </G>
      <G transform="translate(30 30)">
        <StampEmblem design={design} tones={COIN_MAIN_TONES} />
      </G>
      <SvgText textAnchor="middle" fontSize="10.5" fontWeight="900" letterSpacing="2.5" fill={COIN_GOLD_DEEP}>
        <TextPath href={`#${topLegendId}`} startOffset="50%">
          {shortName.toUpperCase()}
        </TextPath>
      </SvgText>
      <SvgText textAnchor="middle" fontSize="7.5" fontWeight="800" letterSpacing="1.6" fill={COIN_GOLD_DEEP}>
        <TextPath href={`#${bottomLegendId}`} startOffset="50%">
          {`REACHED · ${year}`}
        </TextPath>
      </SvgText>
    </G>
  );
}
