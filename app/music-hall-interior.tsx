// Music Hall interior: song rises from the stage. Villagers play fiddles,
// pipes, and drums, a choir sings in rows, and the pawn listens from the
// front seats — or joins the song.
// "Join the Song" grants XP on a 1-hour cooldown (no coins — music is its
// own reward).
// L1: small stage, two players. L2: bigger stage, choir risers, curtains.
// L3: grand concert hall — full band, choir, organ pipes, chandelier.
// No emojis — SVG art and MaterialIcons only. Gentle sine-ease motion.

import { useEffect, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialIcons } from "@expo/vector-icons";
import Svg, { Circle, Ellipse, Line, Path, Rect, G } from "react-native-svg";
import {
  InteriorActions,
  InteriorBanner,
  InteriorHeader,
  useInteriorData,
} from "@/components/interior-shell";
import { GentleBob, SingingFigure, SoftPulse, WatchingFigure, FigureName, pickPeople } from "@/components/activity-figures";
import { PawnPreview } from "@/components/pawn-preview";
import { formatCooldown } from "@/lib/gathering-places";
import { scaledXP } from "@/lib/hometown";
import { awardCustomXP } from "@/lib/xp-engine";
import { InteriorAtmosphere } from "@/components/interior-atmosphere";
import { getHolidaySeason, getSeason } from "@/lib/seasons";
import { EchoGame } from "@/components/echo-game";
import { PlayCard } from "@/components/mini-game-scene";
import { useMiniGameHost } from "@/components/mini-game-host";

const BG = "#F7ECEC";
const CURTAIN = "#A31621";
const CURTAIN_DARK = "#7A1020";
const TEXT_DIM = "#A08787";
const ACCENT = "#B4232F";
const GOLD = "#C9963C";

const SONG_XP: Record<number, number> = { 1: 8, 2: 14, 3: 24 };
const COOLDOWN_MS = 60 * 60 * 1000;
const SONG_KEY = "prayercircle.interior.musichall.song.v1";

/** A stage: wooden platform, footlights, backdrop. */
function Stage({ level }: { level: number }) {
  const W = level >= 3 ? 300 : 250;
  return (
    <View style={{ alignItems: "center", marginTop: 8 }}>
      <Svg width={W} height={120} viewBox={`0 0 ${W} 120`}>
        {/* backdrop */}
        <Rect x={8} y={6} width={W - 16} height={66} rx={8} fill={level >= 3 ? "#2B2118" : "#3F2D1C"} stroke={level >= 3 ? GOLD : "#5E3D22"} strokeWidth={2.5} />
        {level >= 3 && (
          <>
            {/* organ pipes */}
            {[0, 1, 2, 3, 4].map((i) => (
              <Rect key={i} x={W / 2 - 52 + i * 22} y={18} width={14} height={44 - Math.abs(i - 2) * 7} rx={6} fill="#C0C8D2" stroke="#8A94A0" strokeWidth={1.5} />
            ))}
          </>
        )}
        {level >= 2 && (
          <>
            {/* curtains */}
            <Path d={`M8 6 q26 30 10 66 L8 72 Z`} fill={CURTAIN} stroke={CURTAIN_DARK} strokeWidth={1.5} />
            <Path d={`M${W - 8} 6 q-26 30 -10 66 L${W - 8} 72 Z`} fill={CURTAIN} stroke={CURTAIN_DARK} strokeWidth={1.5} />
            <Rect x={8} y={6} width={W - 16} height={10} rx={5} fill={CURTAIN_DARK} />
          </>
        )}
        {/* platform */}
        <Rect x={4} y={72} width={W - 8} height={14} rx={4} fill="#8A5A2B" stroke="#5E3D22" strokeWidth={2} />
        <Rect x={4} y={86} width={W - 8} height={10} rx={4} fill="#5E3D22" />
        {/* footlights */}
        {[0, 1, 2, 3, 4].map((i) => (
          <G key={i}>
            <Circle cx={30 + i * ((W - 60) / 4)} cy={72} r={5} fill="#FDE68A" stroke="#8A6D1C" strokeWidth={1.5} />
          </G>
        ))}
      </Svg>
    </View>
  );
}

/** Floating music notes drifting over the stage. */
function DriftingNotes() {
  const notes = [
    { fx: 0.12, y: 26, d: 200 },
    { fx: 0.30, y: 12, d: 500 },
    { fx: 0.55, y: 22, d: 800 },
    { fx: 0.74, y: 10, d: 350 },
    { fx: 0.88, y: 28, d: 650 },
  ];
  return (
    <>
      {notes.map((n, i) => (
        <View key={i} style={{ position: "absolute", left: n.fx * 300, top: n.y }}>
          <GentleBob delay={n.d} amount={5}>
            <Svg width={22} height={22} viewBox="0 0 24 24">
              <Path d="M9 18 V6 L20 3.5 V15.5" fill="none" stroke={ACCENT} strokeWidth={2.2} strokeLinecap="round" />
              <Ellipse cx={6.5} cy={18} rx={3.4} ry={2.6} fill={ACCENT} />
              <Ellipse cx={17.5} cy={15.5} rx={3.4} ry={2.6} fill={ACCENT} />
            </Svg>
          </GentleBob>
        </View>
      ))}
    </>
  );
}

/** Choir risers — stepped rows (L2+). */
function ChoirRisers() {
  return (
    <View style={{ alignItems: "center", marginTop: -6 }}>
      <Svg width={220} height={44} viewBox="0 0 220 44">
        <Rect x={20} y={28} width={180} height={12} rx={3} fill="#8A5A2B" stroke="#5E3D22" strokeWidth={1.5} />
        <Rect x={40} y={14} width={140} height={12} rx={3} fill="#9A6B35" stroke="#5E3D22" strokeWidth={1.5} />
        <Rect x={60} y={0} width={100} height={12} rx={3} fill="#A9713F" stroke="#5E3D22" strokeWidth={1.5} />
      </Svg>
    </View>
  );
}

/** Grand chandelier (L3). */
function HallChandelier() {
  return (
    <View style={{ alignItems: "center" }}>
      <SoftPulse duration={2600}>
        <Svg width={130} height={80} viewBox="0 0 130 80">
          <Ellipse cx={65} cy={44} rx={56} ry={30} fill="#FFE9A8" opacity={0.28} />
          <Line x1={65} y1={0} x2={65} y2={10} stroke="#8A6D1C" strokeWidth={4} />
          <Ellipse cx={65} cy={46} rx={40} ry={10} fill="none" stroke={GOLD} strokeWidth={4} />
          {[25, 45, 65, 85, 105].map((cx) => (
            <G key={cx}>
              <Line x1={65} y1={12} x2={cx} y2={46} stroke={GOLD} strokeWidth={2.5} />
              <Circle cx={cx} cy={42} r={4} fill="#FFF7D6" />
              <Line x1={cx} y1={56} x2={cx} y2={64} stroke="#BFDCEF" strokeWidth={1.5} />
              <Circle cx={cx} cy={68} r={3.5} fill="#DFF2FD" stroke="#9FB3C8" strokeWidth={1} />
            </G>
          ))}
        </Svg>
      </SoftPulse>
    </View>
  );
}

export default function MusicHallInteriorScreen() {
  const { coins, building, people, pawn, loaded, level, buildingName, addCoins, handleUpgrade } = useInteriorData();
  const echo = useMiniGameHost("echo", addCoins);
  const [lastSong, setLastSong] = useState(0);

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(SONG_KEY).catch(() => null);
      setLastSong(raw ? parseInt(raw, 10) || 0 : 0);
    })();
  }, []);

  const remaining = Math.max(0, lastSong + COOLDOWN_MS - Date.now());
  const players = pickPeople(people, `musichall|${building?.id ?? "musichall"}|play`, level >= 3 ? 3 : 2);
  const choir = pickPeople(people, `musichall|${building?.id ?? "musichall"}|choir`, level >= 2 ? 3 : 1);
  const seatmate = pickPeople(people, `musichall|${building?.id ?? "musichall"}|seat`, 1)[0];

  const levelBlurb =
    level >= 3
      ? "A grand concert hall — organ pipes, a chandelier, and a full band with choir."
      : level >= 2
        ? "A lively hall — a curtained stage, choir risers, and music in the air."
        : "A humble hall — a small stage, two players, and a song beginning.";

  const handleSong = async () => {
    if (remaining > 0) {
      Alert.alert("The song lingers", `The last hymn still echoes in the hall.\n\nJoin the next song in about ${formatCooldown(remaining)}.`);
      return;
    }
    const xp = scaledXP(SONG_XP[level] ?? 8);
    const t = Date.now();
    setLastSong(t);
    await AsyncStorage.setItem(SONG_KEY, String(t)).catch(() => undefined);
    addCoins(0);
    awardCustomXP(xp, `musichall-song-${t}`).catch(() => undefined);
    Alert.alert("You Join the Song", `Your voice rises with the villagers — harmony fills the hall.\n\n+${xp} XP.`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <InteriorHeader icon="music-note" iconColor={ACCENT} title={buildingName} coins={coins} />

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <InteriorBanner
          icon="piano"
          iconColor={ACCENT}
          title="Music Hall"
          blurb={`Song rises from the stage. ${levelBlurb}`}
          accent="#F3D9D9"
        />

        <View
          style={{
            marginHorizontal: 16,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: "#F3D9D9",
            overflow: "hidden",
            backgroundColor: level >= 3 ? "#FBF1F1" : "#F8EAEA",
            position: "relative",
          }}
        >
          {level >= 3 && <HallChandelier />}
          <InteriorAtmosphere holiday={getHolidaySeason()} season={getSeason()} building="music-hall" />
          <DriftingNotes />

          <Stage level={level} />

          {/* players on stage */}
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", marginTop: -34, minHeight: 90, zIndex: 2 }}>
            {players.map((p, i) => (
              <GentleBob key={p.id} delay={150 + i * 250}>
                <SingingFigure person={p} delay={150 + i * 250} showLabel={i === 0} />
              </GentleBob>
            ))}
          </View>

          {/* choir risers + choir */}
          {level >= 2 && <ChoirRisers />}
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", marginTop: level >= 2 ? -8 : 6, minHeight: 84 }}>
            {choir[0] && (
              <GentleBob delay={200}>
                <SingingFigure person={choir[0]} delay={200} />
              </GentleBob>
            )}
            {choir[1] && (
              <GentleBob delay={450}>
                <SingingFigure person={choir[1]} delay={450} />
              </GentleBob>
            )}
            {choir[2] && (
              <GentleBob delay={700}>
                <SingingFigure person={choir[2]} delay={700} />
              </GentleBob>
            )}
          </View>

          {/* pawn listening in the front seats */}
          {(pawn || seatmate) && (
            <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", marginTop: 6 }}>
              {pawn && (
                <GentleBob delay={300}>
                  <View style={{ alignItems: "center", marginHorizontal: 6 }}>
                    <SoftPulse duration={1800}>
                      <MaterialIcons name="headphones" size={15} color={ACCENT} style={{ marginBottom: 1 }} />
                    </SoftPulse>
                    <PawnPreview pawn={pawn} size={44} />
                    <FigureName name={pawn.name} color="#B4232F" />
                  </View>
                </GentleBob>
              )}
              {seatmate && <WatchingFigure person={seatmate} delay={500} />}
            </View>
          )}

          {/* seat rows */}
          <View style={{ alignItems: "center", marginTop: 4, marginBottom: 6 }}>
            {[0, 1].map((r) => (
              <View key={r} style={{ flexDirection: "row", marginTop: 3 }}>
                {[0, 1, 2, 3, 4, 5].map((c) => (
                  <View key={c} style={{ width: 26, height: 12, borderRadius: 4, backgroundColor: CURTAIN, borderWidth: 1, borderColor: CURTAIN_DARK, marginHorizontal: 2 }} />
                ))}
              </View>
            ))}
          </View>

          <View style={{ height: 26, backgroundColor: "#C89B8B" }}>
            <View style={{ height: 3, backgroundColor: "#B08070" }} />
          </View>
        </View>

        <InteriorActions
          primaryLabel={remaining > 0 ? `Ready in ${formatCooldown(remaining)}` : "Join the Song"}
          onPrimary={handleSong}
          primaryColor={ACCENT}
          level={level}
          onUpgrade={() =>
            handleUpgrade(
              level + 1 >= 3 ? "A grand concert hall — organ pipes, a chandelier, a full band and choir." : "A curtained stage, choir risers, and room for more voices."
            )
          }
        />
        <PlayCard
          icon="piano"
          title="Play: Encore Echo"
          blurb="The hall plays a melody — echo it back on the pads, note for note."
          playsLeft={echo.playsLeft}
          cap={echo.cap}
          accent={ACCENT}
          onPlay={() => echo.setPlaying(true)}
        />
        {echo.playing && <EchoGame accent={ACCENT} onComplete={echo.handleComplete} onExit={() => echo.setPlaying(false)} />}
        <Text style={{ color: TEXT_DIM, fontSize: 12, textAlign: "center", marginTop: 8, paddingHorizontal: 32 }}>
          Join the song once an hour. Music is its own reward — pure XP.
        </Text>

        {!loaded && <Text style={{ color: TEXT_DIM, textAlign: "center", marginTop: 20 }}>Tuning the instruments…</Text>}
      </ScrollView>
    </View>
  );
}
