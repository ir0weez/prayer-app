// Shelve the Stories — Bookstore mini-game.
// A returns cart of twelve books rolls up to the desk. Each book
// carries its section's mark — an icon in the section's color — but
// not its name: match the mark to the right wooden shelf. A wrong
// shelf just tells you where the book belongs (no punishment, the
// reading corner is patient). The pace is your own; the cart only
// asks to be done inside forty-five gentle seconds.

import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import Svg, { Line, Rect } from "react-native-svg";
import { SHELVE_BOOK_TITLES, SHELVE_SECTIONS, shelveReward, type ShelveSection } from "@/lib/mini-games";
import { GameCard, GameResults, type MiniGameProps, type MiniGameReward } from "@/components/mini-game-scene";

const DURATION_S = 45;
const TOTAL_BOOKS = 12;

type Book = { section: ShelveSection; title: string };

/** A cart of twelve: a random section and one of its titles each,
 *  never the exact same book twice in a row. */
function makeCart(): Book[] {
  const cart: Book[] = [];
  for (let i = 0; i < TOTAL_BOOKS; i++) {
    let book: Book;
    do {
      const section = SHELVE_SECTIONS[Math.floor(Math.random() * SHELVE_SECTIONS.length)];
      const titles = SHELVE_BOOK_TITLES[section.id] ?? [];
      const title = titles[Math.floor(Math.random() * titles.length)] ?? section.name;
      book = { section, title };
    } while (
      cart.length > 0 &&
      cart[cart.length - 1].section.id === book.section.id &&
      cart[cart.length - 1].title === book.title
    );
    cart.push(book);
  }
  return cart;
}

export function ShelveGame({ accent, onComplete, onExit }: MiniGameProps) {
  const [books] = useState<Book[]>(makeCart);
  const [idx, setIdx] = useState(0);
  const [shelved, setShelved] = useState(0);
  const [timeLeft, setTimeLeft] = useState(DURATION_S);
  const [hint, setHint] = useState<string | null>(null);
  const [allDone, setAllDone] = useState(false);
  const [granted, setGranted] = useState<MiniGameReward | null>(null);

  const shelvedRef = useRef(0);
  const deadlineRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const secondsRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const finish = useCallback((done: boolean) => {
    if (completedRef.current) return;
    completedRef.current = true;
    if (deadlineRef.current) clearTimeout(deadlineRef.current);
    if (secondsRef.current) clearTimeout(secondsRef.current);
    setAllDone(done);
    setGranted(onCompleteRef.current(shelveReward(shelvedRef.current, done)));
  }, []);

  useEffect(() => {
    deadlineRef.current = setTimeout(() => finish(false), DURATION_S * 1000);
    let remaining = DURATION_S;
    const tick = () => {
      secondsRef.current = setTimeout(() => {
        if (completedRef.current) return;
        remaining -= 1;
        setTimeLeft(Math.max(0, remaining));
        if (remaining > 0) tick();
      }, 1000);
    };
    tick();
    return () => {
      if (deadlineRef.current) clearTimeout(deadlineRef.current);
      if (secondsRef.current) clearTimeout(secondsRef.current);
    };
  }, [finish]);

  const book = books[Math.min(idx, TOTAL_BOOKS - 1)];

  const choose = (section: ShelveSection) => {
    if (completedRef.current || !book) return;
    if (section.id === book.section.id) {
      shelvedRef.current += 1;
      setShelved(shelvedRef.current);
      setHint(null);
      if (idx >= TOTAL_BOOKS - 1) {
        finish(true);
      } else {
        setIdx(idx + 1);
      }
    } else {
      setHint(`That one belongs with the ${book.section.name}.`);
    }
  };

  if (granted) {
    return (
      <GameCard title="Shelve the Stories" accent={accent}>
        <GameResults
          title={allDone ? "Every story home" : `${shelved} stories shelved`}
          flavor="Every book back in its place, spine out and waiting — the reading corner feels ready for the next quiet afternoon and the next reader who needs exactly that story."
          granted={granted}
          accent={accent}
          onDone={onExit}
        />
      </GameCard>
    );
  }

  return (
    <GameCard title="Shelve the Stories" accent={accent}>
      <View style={{ paddingHorizontal: 16, paddingBottom: 16, paddingTop: 8 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ color: "#78716C", fontSize: 12, fontWeight: "700" }}>
            Shelved: {shelved} of {TOTAL_BOOKS}
          </Text>
          <Text style={{ color: timeLeft <= 10 ? "#C4493B" : "#78716C", fontSize: 12, fontWeight: "800" }}>
            {Math.ceil(timeLeft)}s
          </Text>
        </View>
        <View style={{ height: 7, borderRadius: 4, backgroundColor: "#EFE6D8", marginTop: 7, overflow: "hidden" }}>
          <View
            style={{
              height: 7,
              borderRadius: 4,
              width: `${Math.max(0, (timeLeft / DURATION_S) * 100)}%`,
              backgroundColor: timeLeft <= 10 ? "#C4493B" : accent,
            }}
          />
        </View>

        {/* the front book on the returns cart */}
        {book && (
          <View style={{ alignItems: "center", marginTop: 14 }}>
            <View
              style={{
                backgroundColor: "#FDFAF1",
                borderWidth: 1,
                borderColor: "#E7DCC4",
                borderRadius: 16,
                paddingVertical: 12,
                paddingHorizontal: 22,
                alignItems: "center",
              }}
            >
              <Svg width={80} height={100} viewBox="0 0 80 100">
                <Rect x={10} y={6} width={60} height={88} rx={6} fill="#FDF6E9" stroke={book.section.color} strokeWidth={2} />
                <Rect x={10} y={6} width={15} height={88} fill={book.section.color} />
                <Line x1={34} y1={26} x2={62} y2={26} stroke="#D8C7B4" strokeWidth={2.4} strokeLinecap="round" />
                <Line x1={34} y1={38} x2={62} y2={38} stroke="#D8C7B4" strokeWidth={2.4} strokeLinecap="round" />
                <Line x1={34} y1={50} x2={56} y2={50} stroke="#D8C7B4" strokeWidth={2.4} strokeLinecap="round" />
              </Svg>
              <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}>
                <MaterialIcons
                  name={book.section.icon as keyof typeof MaterialIcons.glyphMap}
                  size={19}
                  color={book.section.color}
                />
                <Text style={{ color: "#1C1917", fontWeight: "800", fontSize: 15, marginLeft: 6 }}>{book.title}</Text>
              </View>
            </View>
            <Text style={{ color: hint ? "#C4493B" : "#A08B62", fontSize: 12.5, marginTop: 9, fontWeight: hint ? "700" : "400" }}>
              {hint ?? "Match the book's mark to its shelf."}
            </Text>
          </View>
        )}

        {/* the four wooden shelves */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 10 }}>
          {SHELVE_SECTIONS.map((section) => (
            <Pressable
              key={section.id}
              onPressIn={() => choose(section)}
              style={{
                width: "47.5%",
                flexGrow: 1,
                backgroundColor: "#E9CBA3",
                borderWidth: 1.5,
                borderColor: "#8B5E34",
                borderBottomWidth: 6,
                borderRadius: 12,
                paddingVertical: 12,
                alignItems: "center",
              }}
            >
              <MaterialIcons
                name={section.icon as keyof typeof MaterialIcons.glyphMap}
                size={22}
                color={section.color}
              />
              <Text style={{ color: "#1C1917", fontWeight: "800", fontSize: 14, marginTop: 3 }}>{section.name}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </GameCard>
  );
}
