// ─────────────────────────────────────────────────────────────────────────────
// v337 — KEYWORD TODO CHECK-OFF FLOURISHES (Jonathan's pick, Oct 29,
// from todo-keyword-animations-v1.html: he loved the caffeine round's
// Fizz Burst + Jolt and asked for the same treatment across his real
// todos — "each with their own custom animation", under his standing
// performance guard: the app must not get laggy or glitchy).
//
// When a todo is checked off on the schedule day page, its row plays
// ONE one-shot flourish (~2.4s since v360, native driver, ≤ a dozen moving
// pieces), then settles into its existing completed state exactly as
// before. Unchecking plays nothing. Detection is title-based, in the
// same lowercase-includes style as getIconForTodo (the app's existing
// todo keyword matching), tuned to his mined real todos.
//
// Quiet by design — NO flourish, ever, for his devotional / therapy /
// medication todos: Pray, Internal Permission, External Permission,
// Sleep, Stitch Journal. They are checked first and return null even
// if a later rule would have matched.
//
// The flourish is keyed to the TOGGLE EVENT, not to row identity:
// checking a todo moves it out of the timed flow into the completed
// section, so the row component may remount mid-animation. The
// toggle handlers emit an event on this bus with the checkbox's
// measured window position; components/todo-flourish-overlay.tsx (mounted once at
// the app root, beside the XP floater) renders the burst there,
// independent of what the list does. The row's own settle
// (sink / crumple) rides a local wrapper in the row.
//
// v338 sequencing: for mapped todos the completion WRITE itself is
// held for TODO_FLOURISH_DURATION_MS (see todoCompletionShouldDefer
// and ScheduleTab's pending writes), so the burst AND the settle
// play on the row still sitting in its flow slot; the row drops to
// the completed section only when the held write lands.
// ─────────────────────────────────────────────────────────────────────────────

export type TodoFlourishId =
  | "feed"
  | "duolingo"
  | "break"
  | "caffeine"
  | "brush-teeth"
  | "photo"
  | "app-update"
  | "trash"
  | "read";

/** How the row itself settles after the burst. "none" = burst only.
    v364: the "jolt" settle — the little side-to-side "no" shake at
    the end of the checkoff — is gone at Jonathan's word (Oct 30),
    removed from this union, the map below and the settle view.
    Break's sink and Trash's crumple are untouched. */
export type TodoSettleKind = "sink" | "crumple" | "none";

/** One burst, start to finish. v360 (Jonathan, Oct 30: the
    flourishes "show up now... They are just so freaking quick"):
    900ms blinked past — the whole set ran 2400ms (2.67×),
    and because every particle span, the row settle and the
    deferred write are fractions of / keyed to this one constant,
    the whole performance slows together and particles live
    through the full span.
    v368 (Jonathan, Oct 30, with a recording of a Duolingo
    check-off): at 2400ms the completed row "hangs around...
    feels like forever" after the burst lands — "I understand
    for a second or two". The performance now runs 1500ms;
    the deferred write still waits for the full flourish
    (v338 semantics unchanged), so tap-to-gone lands at
    ~1.5s plus the row's existing exit beat. */
export const TODO_FLOURISH_DURATION_MS = 1500;

export const TODO_FLOURISH_SETTLE: Record<TodoFlourishId, TodoSettleKind> = {
  // v364 (Jonathan, Oct 30): every flourish that used to end in the
  // little "no" jolt is burst-only now — feed, duolingo, caffeine,
  // brush-teeth, app-update and read all settle "none".
  feed: "none",
  duolingo: "none",
  // Deliberate exception: a break settles like a sigh.
  break: "sink",
  caffeine: "none",
  "brush-teeth": "none",
  photo: "none",
  "app-update": "none",
  trash: "crumple",
  read: "none",
};

/**
 * Titles that must never flourish. Matched against the lowercased
 * title before every flourish rule.
 */
export function isQuietTodoTitle(title: string): boolean {
  const t = title.toLowerCase();
  if (t.includes("pray")) return true; // Pray / Prayer — devotional
  if (t.includes("permission")) return true; // Internal / External Permission — therapy
  if (t.includes("sleep")) return true; // Sleep — his sleep-pill reminder
  if (t.includes("stitch")) return true; // Stitch Journal — reflective journaling
  return false;
}

/**
 * The keyword → flourish mapping. Title-based, mirroring
 * getIconForTodo's matching style; ordered so the most specific
 * patterns win ("Coffee Break" reads as coffee; bare "break" is the
 * generic word and is matched last, on a word boundary so
 * "Breakfast" never fires it; "Feedback" never fires Feed).
 */
export function todoFlourishForTitle(title: string): TodoFlourishId | null {
  if (!title) return null;
  if (isQuietTodoTitle(title)) return null;
  const t = title.toLowerCase();

  // Feed (Aaron) — "Feed Aaron", "Feed (Aaron)", "Feed"
  if (/\bfeed\b/.test(t)) return "feed";

  // Duolingo
  if (t.includes("duolingo")) return "duolingo";

  // Coffee and Energy Drink share ONE flourish — his explicit ruling.
  if (t.includes("coffee") || t.includes("energy drink")) return "caffeine";

  // Brush Teeth
  if (t.includes("brush") && (t.includes("teeth") || t.includes("tooth") || t.includes("dental"))) {
    return "brush-teeth";
  }

  // Photo (of a kid) — "Photo (Melody)", "Take Picture"
  if (t.includes("photo") || t.includes("take picture") || t.includes("picture")) return "photo";

  // App Update / Update App
  if (t.includes("app update") || t.includes("update app")) return "app-update";

  // Trash / Take Out Trash
  if (t.includes("trash")) return "trash";

  // Read — word boundary, so "Ready" / "Reading" / "Bread" never
  // fire it (added in v338; Jonathan tapped Read expecting one).
  if (/\bread\b/.test(t)) return "read";

  // Break — word boundary: "Break", "Take a break"; never "Breakfast".
  if (/\bbreak\b/.test(t)) return "break";

  return null;
}

/**
 * v338 — the sequencing decision, kept pure so it can be pinned:
 * a flourish-MAPPED todo's completion write waits out its flourish
 * (the row stays in place, visually completing, until the hold
 * ends). Everything else — unchecking, quiet titles, unmatched
 * titles — writes instantly, exactly as before.
 */
export function todoCompletionShouldDefer(todo: { title: string; isCompleted: boolean }): boolean {
  if (todo.isCompleted) return false;
  return todoFlourishForTitle(todo.title) !== null;
}

// ─── The shared particle kit ────────────────────────────────────────────────
// Every flourish is a recombination of these few piece kinds — one
// kit, not eight bespoke engines. Offsets are px relative to the
// checkbox anchor (the burst origin); dx/dy are the travel end
// offset; delay/span are fractions of TODO_FLOURISH_DURATION_MS.

export type TodoFlourishParticleKind =
  | "bubble" // fizz up and fade (feed milk / coffee amber, by tone)
  | "tile" // letter tile: fly up, tumble, fade
  | "spark" // one thin green streak shooting up
  | "sigh-dot" // soft dot drifting DOWN, slow and faint
  | "foam" // pop in place: grow, swell, vanish
  | "flash-halo" // camera flash halo: bloom and gone
  | "flash-star" // camera flash starburst
  | "twinkle" // small late sparkle
  | "chevron" // up-chevron pip rocketing up
  | "paper-bit" // crumpled paper fluttering down with sway
  | "page-corner"; // a small paper page whose corner flips over

export type TodoFlourishTone =
  | "milk"
  | "amber"
  | "tile"
  | "tile-green"
  | "spark"
  | "sigh"
  | "mint"
  | "foam-white"
  | "flash"
  | "halo"
  | "twinkle"
  | "todo"
  | "paper";

export type TodoFlourishParticle = {
  kind: TodoFlourishParticleKind;
  tone: TodoFlourishTone;
  /** Origin offset from the anchor (px). */
  ox: number;
  oy: number;
  /** Travel end offset from the origin (px). */
  dx: number;
  dy: number;
  size: number;
  /** Start time / motion span, as fractions of the burst duration. */
  delay: number;
  span: number;
  /** End rotation (deg) for tiles / bits / twinkles. */
  rotate?: number;
  /** Mid-flight sideways offset (px) for fluttering paper bits. */
  sway?: number;
  /** Glyph for letter tiles. */
  letter?: string;
};

const bubble = (
  tone: TodoFlourishTone,
  size: number,
  dx: number,
  dy: number,
  delay: number,
): TodoFlourishParticle => ({ kind: "bubble", tone, ox: 0, oy: 0, dx, dy, size, delay, span: 0.42 });

const AUTHORED_FLOURISH_PARTICLES: Record<TodoFlourishId, TodoFlourishParticle[]> = {
  // 1 · Feed — milky bottle bubbles fizz up off the checkbox.
  // v348: no bubble under 7px, and the overlay rims them in the
  // todo's colour at full strength — the smallest bubbles in a
  // light tint were white-on-white on the pale pair cards.
  feed: [
    bubble("milk", 9, -8, -44, 0),
    bubble("milk", 7, 5, -52, 0.03),
    bubble("milk", 11, 14, -38, 0.06),
    bubble("milk", 7, -16, -34, 0.02),
    bubble("milk", 7, 22, -48, 0.09),
    bubble("milk", 7, 0, -58, 0.12),
  ],

  // 2 · Duolingo — tiny letter tiles burst upward + one green spark.
  duolingo: [
    { kind: "tile", tone: "tile", ox: 0, oy: 0, dx: -14, dy: -42, size: 15, delay: 0, span: 0.4, rotate: -50, letter: "D" },
    { kind: "tile", tone: "tile-green", ox: 0, oy: 0, dx: 2, dy: -54, size: 15, delay: 0.02, span: 0.4, rotate: 30, letter: "U" },
    { kind: "tile", tone: "tile", ox: 0, oy: 0, dx: 16, dy: -40, size: 15, delay: 0.04, span: 0.4, rotate: 65, letter: "O" },
    { kind: "tile", tone: "tile", ox: 0, oy: 0, dx: -24, dy: -28, size: 15, delay: 0.06, span: 0.4, rotate: -90, letter: "A" },
    { kind: "tile", tone: "tile", ox: 0, oy: 0, dx: 26, dy: -30, size: 15, delay: 0.08, span: 0.4, rotate: 110, letter: "B" },
    { kind: "spark", tone: "spark", ox: 4, oy: 0, dx: 0, dy: -46, size: 18, delay: 0.02, span: 0.3 },
  ],

  // 3 · Break — soft dots exhale and drift down like a sigh.
  break: [
    { kind: "sigh-dot", tone: "sigh", ox: 0, oy: 0, dx: -10, dy: 28, size: 10, delay: 0, span: 0.55 },
    { kind: "sigh-dot", tone: "sigh", ox: 15, oy: 0, dx: 6, dy: 28, size: 7, delay: 0.05, span: 0.55 },
    { kind: "sigh-dot", tone: "sigh", ox: 29, oy: 0, dx: 16, dy: 28, size: 12, delay: 0.1, span: 0.55 },
    { kind: "sigh-dot", tone: "sigh", ox: 47, oy: 0, dx: -4, dy: 28, size: 6, delay: 0.15, span: 0.55 },
  ],

  // 4 · Coffee / Energy Drink — the caffeine round's Fizz Burst.
  caffeine: [
    bubble("amber", 8, -9, -42, 0),
    bubble("amber", 5, 4, -54, 0.03),
    bubble("amber", 10, 13, -36, 0.06),
    bubble("amber", 6, -17, -32, 0.02),
    bubble("amber", 7, 21, -46, 0.09),
    bubble("amber", 4, 8, -58, 0.12),
  ],

  // 5 · Brush Teeth — mint foam foams up in staggered waves across
  // the row and pops. ox spreads from the checkbox across the row.
  "brush-teeth": [
    { kind: "foam", tone: "mint", ox: 0, oy: -8, dx: 0, dy: 0, size: 11, delay: 0, span: 0.36 },
    { kind: "foam", tone: "foam-white", ox: 55, oy: -8, dx: 0, dy: 0, size: 8, delay: 0.08, span: 0.36 },
    { kind: "foam", tone: "mint", ox: 105, oy: -8, dx: 0, dy: 0, size: 12, delay: 0.16, span: 0.36 },
    { kind: "foam", tone: "foam-white", ox: 155, oy: -8, dx: 0, dy: 0, size: 7, delay: 0, span: 0.36 },
    { kind: "foam", tone: "mint", ox: 205, oy: -8, dx: 0, dy: 0, size: 10, delay: 0.08, span: 0.36 },
    { kind: "foam", tone: "foam-white", ox: 255, oy: -8, dx: 0, dy: 0, size: 8, delay: 0.16, span: 0.36 },
  ],

  // 6 · Photo — one camera-flash starburst at the checkbox + sparkles.
  photo: [
    { kind: "flash-halo", tone: "halo", ox: 0, oy: 0, dx: 0, dy: 0, size: 56, delay: 0, span: 0.3 },
    { kind: "flash-star", tone: "flash", ox: 0, oy: 0, dx: 0, dy: 0, size: 34, delay: 0, span: 0.3 },
    { kind: "twinkle", tone: "twinkle", ox: 27, oy: -20, dx: 0, dy: 0, size: 11, delay: 0.24, span: 0.26, rotate: 80 },
    { kind: "twinkle", tone: "twinkle", ox: -23, oy: 7, dx: 0, dy: 0, size: 11, delay: 0.27, span: 0.26, rotate: 80 },
    { kind: "twinkle", tone: "twinkle", ox: 33, oy: 10, dx: 0, dy: 0, size: 11, delay: 0.3, span: 0.26, rotate: 80 },
  ],

  // 7 · App Update — up-chevron pips rocket up in two waves.
  "app-update": [
    { kind: "chevron", tone: "todo", ox: 0, oy: 0, dx: -6, dy: -40, size: 14, delay: 0, span: 0.38 },
    { kind: "chevron", tone: "todo", ox: 16, oy: 0, dx: 6, dy: -40, size: 14, delay: 0, span: 0.38 },
    { kind: "chevron", tone: "todo", ox: 8, oy: 0, dx: 0, dy: -44, size: 14, delay: 0.12, span: 0.38 },
    { kind: "chevron", tone: "todo", ox: 26, oy: 0, dx: 12, dy: -44, size: 14, delay: 0.12, span: 0.38 },
  ],

  // 8 · Trash — crumpled-paper bits flutter down off the row.
  trash: [
    { kind: "paper-bit", tone: "paper", ox: 17, oy: -22, dx: 0, dy: 32, size: 13, delay: 0, span: 0.5, rotate: 120, sway: -12 },
    { kind: "paper-bit", tone: "paper", ox: 92, oy: -22, dx: 0, dy: 32, size: 10, delay: 0.03, span: 0.5, rotate: -140, sway: 10 },
    { kind: "paper-bit", tone: "paper", ox: 160, oy: -22, dx: 0, dy: 32, size: 14, delay: 0.06, span: 0.5, rotate: 200, sway: -8 },
    { kind: "paper-bit", tone: "paper", ox: 228, oy: -22, dx: 0, dy: 32, size: 9, delay: 0.09, span: 0.5, rotate: -90, sway: 14 },
  ],

  // 9 · Read (v338) — page-corner sparks: a small paper page-corner
  // flips at the checkbox while a few spark bits burst off it in
  // the todo's own colour — burst only, no row settle (see the
  // settle map; the row's old end-of-flourish jolt went in v364).
  read: [
    { kind: "page-corner", tone: "foam-white", ox: 0, oy: 0, dx: 0, dy: 0, size: 17, delay: 0, span: 0.5 },
    { kind: "spark", tone: "todo", ox: -6, oy: 0, dx: 0, dy: -34, size: 13, delay: 0.1, span: 0.3 },
    { kind: "spark", tone: "todo", ox: 5, oy: 0, dx: 0, dy: -42, size: 15, delay: 0.16, span: 0.3 },
    { kind: "spark", tone: "todo", ox: 13, oy: 0, dx: 0, dy: -30, size: 11, delay: 0.22, span: 0.3 },
    { kind: "twinkle", tone: "twinkle", ox: 20, oy: -18, dx: 0, dy: 0, size: 10, delay: 0.3, span: 0.26, rotate: 80 },
  ],
};

// v348 — the timing stretch. As authored above, the kit burned out
// before the row's settle began: every particle's opacity reached 0
// by ~0.55 of the 900ms (the longest-lived piece, Break's last
// sigh-dot, ended at 0.70) while every settle only STARTS at 0.5 —
// the eye got a faint puff, then the shake alone (Jonathan's
// invisible-burst report, Oct 29). Spans are stretched by one
// factor so the kit's last particle finishes at 0.9 of the burst:
// delays (the stagger) and the travel are untouched, and the
// stretch is applied once, here, so TODO_FLOURISH_PARTICLES always
// carries the final timing the overlay interpolates. The factor is
// set by that last sigh-dot: 0.15 delay + 0.55 span × 15/11 = 0.90.
export const TODO_FLOURISH_SPAN_STRETCH = 15 / 11;

export const TODO_FLOURISH_PARTICLES: Record<TodoFlourishId, TodoFlourishParticle[]> = (
  Object.keys(AUTHORED_FLOURISH_PARTICLES) as TodoFlourishId[]
).reduce<Record<TodoFlourishId, TodoFlourishParticle[]>>((kit, id) => {
  kit[id] = AUTHORED_FLOURISH_PARTICLES[id].map((p) => ({ ...p, span: p.span * TODO_FLOURISH_SPAN_STRETCH }));
  return kit;
}, {} as Record<TodoFlourishId, TodoFlourishParticle[]>);

/**
 * The horizontal span the wide kits (Brush Teeth foam, Trash bits)
 * were authored across, measured from the checkbox anchor: foam's
 * furthest puff sits at ox 255 and is 8px wide (255 + 8 = 263).
 * From a pair rectangle — about half a row — those kits would
 * scatter onto the neighbouring card, so pair-anchored wide bursts
 * scale their ox to fit the card (see firePairFlourish in
 * components/schedule-tab.tsx).
 */
export const TODO_FLOURISH_WIDE_SPAN_PX = 263;

// ─── The toggle-event bus ───────────────────────────────────────────────────
// Mirrors lib/xp-engine's XP-gain bus: toggle handlers emit, the one
// root overlay subscribes. The anchor is a WINDOW position (the
// checkbox centre, computed at press time), so the burst lands where
// the row was even after the row itself moves to the completed stack.

/**
 * v351: a flourish press seat — everything a press handler knows
 * synchronously. `x`/`y` are the touch's window position (pageX/Y);
 * `locationX`/`locationY` are the touch's position inside the
 * pressed target, so the target's window origin is page − location
 * with no live measure; `frame` names which target was pressed (the
 * checkbox itself, or the row around it) so the caller can walk
 * from that origin to the checkbox via the layout rect the row
 * cached at layout time (onLayout). Emission is synchronous from
 * the press flow — v348's async Fabric measureInWindow callback
 * could silently never fire, and the pair path had no fallback.
 */
export type TodoFlourishPress = {
  x: number;
  y: number;
  locationX?: number;
  locationY?: number;
  frame?: "checkbox" | "row";
};

export type TodoFlourishEvent = {
  id: string;
  flourish: TodoFlourishId;
  /** The todo's own colour — the burst wears it where the kit asks. */
  color: string;
  anchor: { x: number; y: number };
  /**
   * v348: horizontal squeeze for a pair-anchored wide kit (Brush
   * Teeth / Trash fired from a pair rectangle): the overlay
   * multiplies each particle's ox by this so the authored full-row
   * spread fits inside the pair card. Absent (rows, subtasks, and
   * narrow kits) = the authored spread, untouched.
   */
  oxScale?: number;
};

type TodoFlourishListener = (event: TodoFlourishEvent) => void;
const todoFlourishListeners = new Set<TodoFlourishListener>();
let nextTodoFlourishId = 0;

export function subscribeTodoFlourish(listener: TodoFlourishListener): () => void {
  todoFlourishListeners.add(listener);
  return () => {
    todoFlourishListeners.delete(listener);
  };
}

export function emitTodoFlourish(input: {
  flourish: TodoFlourishId;
  color: string;
  anchor: { x: number; y: number };
  oxScale?: number;
}): void {
  const event: TodoFlourishEvent = {
    id: `todo-flourish-${Date.now()}-${nextTodoFlourishId++}`,
    ...input,
  };
  todoFlourishListeners.forEach((listener) => listener(event));
}
