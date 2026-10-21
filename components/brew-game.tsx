// Brew the Tonic — Apothecary mini-game.
// Untimed and gentle: each tonic names its recipe as a short ordered
// run of ingredients, and the player taps the jars in that order.
// A wrong jar fizzes the tonic and the recipe starts over — no
// punishment beyond beginning that one tonic again. Four tonics
// make a round; once at least one tonic is brewed the player can
// serve what they have and finish early. Taps land on onPressIn
// (finger DOWN) per the timing standard, and state changes only
// on events — a tap, a tonic landing, the round ending.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import Svg, { Rect } from "react-native-svg";
import { BREW_INGREDIENTS, BREW_TONIC_NAMES, brewReward, type BrewIngredient } from "@/lib/mini-games";
import { GameCard, GameResults, type MiniGameProps, type MiniGameReward } from "@/components/mini-game-scene";

const TONICS_PER_ROUND = 4;
const ADVANCE_MS = 800;

type Tonic = { name: string; recipe: BrewIngredient[] };

function shuffled<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** One recipe: 3–5 ingredients, repeats allowed, never the same
 *  ingredient twice in a row. */
function makeRecipe(): BrewIngredient[] {
  const len = 3 + Math.floor(Math.random() * 3);
  const recipe: BrewIngredient[] = [];
  for (let i = 0; i < len; i++) {
    let pick = BREW_INGREDIENTS[Math.floor(Math.random() * BREW_INGREDIENTS.length)];
    while (i > 0 && pick.id === recipe[i - 1].id) {
      pick = BREW_INGREDIENTS[Math.floor(Math.random() * BREW_INGREDIENTS.length)];
    }
    recipe.push(pick);
  }
  return recipe;
}

/** One ingredient jar: a rounded jar with a lid, its contents filled
 *  to 65% in the ingredient's own color. */
function JarArt({ color, size = 52 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size * 1.15} viewBox="0 0 60 69">
      {/* lid */}
      <Rect x={14} y={3} width={32} height={8} rx={3} fill="#A8A29E" stroke="#78716C" strokeWidth={2} />
      {/* jar outline */}
      <Rect x={11} y={11} width={38} height={54} rx={9} fill="#FFFFFF" stroke="#78716C" strokeWidth={2} />
      {/* contents at 65% of the jar body */}
      <Rect x={15} y={28.1} width={30} height={32.9} rx={6} fill={color} opacity={0.9} />
    </Svg>
  );
}

export function BrewGame({ accent, onComplete, onExit }: MiniGameProps) {
  // The whole round is brewed up front: tonic names sampled without
  // repeats, each with its own recipe, so a round never re-asks.
  const tonics = useMemo<Tonic[]>(
    () => shuffled(BREW_TONIC_NAMES).slice(0, TONICS_PER_ROUND).map((name) => ({ name, recipe: makeRecipe() })),
    []
  );
  const [idx, setIdx] = useState(0);
  const [step, setStep] = useState(0);
  const [brewed, setBrewed] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [granted, setGranted] = useState<MiniGameReward | null>(null);

  const tonicsRef = useRef(0);
  const mistakesRef = useRef(0);
  const busyRef = useRef(false);
  const advanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(
    () => () => {
      if (advanceRef.current) clearTimeout(advanceRef.current);
    },
    []
  );

  const finish = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    if (advanceRef.current) {
      clearTimeout(advanceRef.current);
      advanceRef.current = null;
    }
    setGranted(onCompleteRef.current(brewReward(tonicsRef.current, mistakesRef.current)));
  }, []);

  const tonic = tonics[idx];

  const tapJar = (ingredient: BrewIngredient) => {
    if (completedRef.current || busyRef.current || granted) return;
    if (!tonic) return;
    const expected = tonic.recipe[step];
    if (expected && ingredient.id === expected.id) {
      const nextStep = step + 1;
      if (nextStep >= tonic.recipe.length) {
        // This tonic is done.
        tonicsRef.current += 1;
        setBrewed(tonicsRef.current);
        setFeedback("The tonic glows just right.");
        busyRef.current = true;
        advanceRef.current = setTimeout(() => {
          advanceRef.current = null;
          busyRef.current = false;
          if (tonicsRef.current >= TONICS_PER_ROUND) {
            finish();
          } else {
            setStep(0);
            setFeedback(null);
            setIdx(idx + 1);
          }
        }, ADVANCE_MS);
      } else {
        setStep(nextStep);
        setFeedback(null);
      }
    } else {
      mistakesRef.current += 1;
      setStep(0);
      setFeedback("The tonic fizzes — begin this one again.");
    }
  };

  if (granted) {
    return (
      <GameCard title="Brew the Tonic" accent={accent}>
        <GameResults
          title="The shelf of tonics grows"
          flavor={
            brewed > 0
              ? `${brewed} tonic${brewed === 1 ? "" : "s"} brewed and bottled with care.${mistakesRef.current === 0 ? " Not a single fizzed batch — a steady hand at the jars." : ""}`
              : "The jars wait, clean and ready, for the next quiet brewing."
          }
          granted={granted}
          accent={accent}
          onDone={onExit}
        />
      </GameCard>
    );
  }

  return (
    <GameCard title="Brew the Tonic" accent={accent}>
      <View style={{ paddingHorizontal: 14, paddingBottom: 14, paddingTop: 8 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ color: "#78716C", fontSize: 12, fontWeight: "700" }}>
            Tonic {Math.min(idx + 1, TONICS_PER_ROUND)} of {TONICS_PER_ROUND}
          </Text>
          <Text style={{ color: "#78716C", fontSize: 12, fontWeight: "700" }}>Brewed: {brewed}</Text>
        </View>

        {/* the recipe card */}
        <View
          style={{
            marginTop: 12,
            backgroundColor: "#FBF7EA",
            borderWidth: 1,
            borderColor: "#E7DCC4",
            borderRadius: 14,
            padding: 12,
          }}
        >
          <Text style={{ color: accent, fontSize: 15, fontWeight: "900" }}>{tonic.name}</Text>
          <Text style={{ color: "#78716C", fontSize: 12, marginTop: 3 }}>
            Tap the jars in this order:
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 9 }}>
            {tonic.recipe.map((ingredient, i) => {
              const done = i < step;
              const current = i === step;
              return (
                <View
                  key={`${ingredient.id}-${i}`}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    borderWidth: current ? 2 : 1,
                    borderColor: current ? accent : "#E3D5AC",
                    borderRadius: 999,
                    paddingVertical: 5,
                    paddingHorizontal: 9,
                    backgroundColor: done ? "#DCF2E3" : "#FFFFFF",
                    opacity: i > step ? 0.55 : 1,
                  }}
                >
                  {done ? (
                    <MaterialIcons name="check" size={13} color="#2F9E5F" />
                  ) : (
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: ingredient.color }} />
                  )}
                  <Text style={{ marginLeft: 5, color: "#1C1917", fontSize: 12, fontWeight: "700" }}>
                    {ingredient.name}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={{ height: 24, marginTop: 10, alignItems: "center", justifyContent: "center" }}>
          {feedback && (
            <Text style={{ color: feedback.startsWith("The tonic glows") ? "#2F9E5F" : "#B45309", fontWeight: "700", fontSize: 13, textAlign: "center" }}>
              {feedback}
            </Text>
          )}
        </View>

        {/* the six jars, three by two */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 2 }}>
          {BREW_INGREDIENTS.map((ingredient) => (
            <Pressable
              key={ingredient.id}
              onPressIn={() => tapJar(ingredient)}
              style={{
                width: "31.8%",
                flexGrow: 1,
                alignItems: "center",
                backgroundColor: "#FDFAF1",
                borderWidth: 1,
                borderColor: "#E7DCC4",
                borderRadius: 14,
                paddingVertical: 10,
                paddingHorizontal: 4,
              }}
            >
              <JarArt color={ingredient.color} />
              <Text style={{ color: "#1C1917", fontWeight: "800", fontSize: 12.5, marginTop: 5, textAlign: "center" }}>
                {ingredient.name}
              </Text>
            </Pressable>
          ))}
        </View>

        {brewed >= 1 && (
          <Pressable
            onPressIn={finish}
            style={{
              marginTop: 14,
              alignSelf: "center",
              backgroundColor: accent,
              borderRadius: 12,
              paddingVertical: 11,
              paddingHorizontal: 26,
            }}
          >
            <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 14 }}>Serve what's brewed</Text>
          </Pressable>
        )}
        <Pressable onPressIn={onExit} style={{ alignSelf: "center", marginTop: 6, paddingVertical: 6, paddingHorizontal: 14 }}>
          <Text style={{ color: "#A08B7A", fontWeight: "700", fontSize: 13 }}>Leave early</Text>
        </Pressable>
      </View>
    </GameCard>
  );
}
