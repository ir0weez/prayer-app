/**
 * v308 — SHOW TITLE FONTS (his ask, Oct 28 11:58–12:03).
 *
 * "It would be really cool if you could match the Header font to the
 * shows Title font on their posters" — refined by him minutes later:
 * NOT the card header (that's his own title for the event). The show
 * NAME inside the card's sub-line ("S1 E6 · The Bear") wears the
 * show's title lettering, at the same small size; the season/episode
 * read and everything else stay in the app's font.
 *
 * The literal poster fonts are mostly custom/trademarked lettering,
 * so each show gets a FREE lookalike (Google Fonts), subsetted to the
 * Latin alphabet + digits + show-name punctuation and bundled in
 * assets/fonts/show-*.ttf (29 files, 573,872 bytes total), registered
 * in app/_layout.tsx the way the skin fonts are. A show with no
 * mapped font renders byte-identical to before — the segmented
 * sub-line path only engages when a font AND the name both match.
 *
 * Detection mirrors detectTVShowScene (components/schedule-tab.tsx)
 * branch for branch, in its order — the same text that summons a
 * show's scene summons its font. Keep the two in step.
 *
 * SHOW → LOOKALIKE FONT (all Google Fonts):
 *   Dexter: New Blood      Oswald Medium            SIL OFL 1.1
 *   Dexter: Original Sin   Oswald Medium            SIL OFL 1.1
 *   Dexter: Resurrection   Oswald Medium            SIL OFL 1.1
 *   Dexter                 Oswald Medium            SIL OFL 1.1
 *   The Walking Dead       Anton                    SIL OFL 1.1
 *   The Chosen             Cinzel Bold              SIL OFL 1.1
 *   The Bear               Archivo ExtraBold        SIL OFL 1.1
 *   The Sopranos           Archivo Narrow Bold      SIL OFL 1.1
 *   Skins                  Nunito ExtraBold         SIL OFL 1.1
 *   Game of Thrones        Cinzel Decorative Bold   SIL OFL 1.1
 *   Dragon Ball Z          Passion One Black        SIL OFL 1.1
 *   Sons of Anarchy        Zilla Slab Bold          SIL OFL 1.1
 *   Reacher                Barlow Condensed SemiBold SIL OFL 1.1
 *   From                   Marcellus                SIL OFL 1.1
 *   Daredevil              Bebas Neue               SIL OFL 1.1
 *   Pluribus               Poppins SemiBold         SIL OFL 1.1
 *   Breaking Bad           Archivo Black            SIL OFL 1.1
 *   Better Call Saul       Archivo ExtraBold Italic SIL OFL 1.1
 *   Fallout                Yellowtail               Apache 2.0
 *   Ted Lasso              Graduate                 SIL OFL 1.1
 *   One Piece              Pirata One               SIL OFL 1.1
 *   Stranger Things        Playfair Display Bold    SIL OFL 1.1
 *   Bluey                  Baloo 2 ExtraBold        SIL OFL 1.1
 *   Hey Duggee             Fredoka SemiBold         SIL OFL 1.1
 *   Avatar: The Last Airbender  Cinzel Bold         SIL OFL 1.1
 *   Yellowstone            Alfa Slab One            SIL OFL 1.1
 *   The Boys               Anton                    SIL OFL 1.1
 *   You                    Cormorant Garamond SemiBold SIL OFL 1.1
 *   Chucky                 Gochi Hand               SIL OFL 1.1
 *   Lost                   Oswald Light             SIL OFL 1.1
 *   Prison Break           Black Ops One            SIL OFL 1.1
 *   IT: Welcome to Derry   Playfair Display Black   SIL OFL 1.1
 *   Carrie                 Cormorant Garamond SemiBold SIL OFL 1.1
 *   Harry Potter           IM Fell English          SIL OFL 1.1
 *   Wednesday              Grenze Gotisch Bold      SIL OFL 1.1
 *   The Vampire Diaries    Cinzel Bold              SIL OFL 1.1
 *   The Originals          Cinzel Bold              SIL OFL 1.1
 *   Legacies               Cinzel Bold              SIL OFL 1.1
 */

export interface ShowFontEntry {
  /** Stable key — also the detectShowFont return identity. */
  key: string;
  /** The show's name as it appears in his notes / detail lines. */
  displayName: string;
  /** Other written forms the name may take (colonless, shortened). */
  aliases?: string[];
  /** The registered font family (app/_layout.tsx useFonts key). */
  fontFamily: string;
  /** The bundled file, for the audit trail. */
  file: string;
  /** The Google Fonts lookalike + license. */
  lookalike: string;
  license: "SIL OFL 1.1" | "Apache 2.0";
}

export const SHOW_FONTS: Record<string, ShowFontEntry> = {
  "dexter-new-blood": { key: "dexter-new-blood", displayName: "Dexter: New Blood", aliases: ["Dexter New Blood"], fontFamily: "ShowOswaldMedium", file: "show-oswald-medium.ttf", lookalike: "Oswald Medium", license: "SIL OFL 1.1" },
  "dexter-original-sin": { key: "dexter-original-sin", displayName: "Dexter: Original Sin", aliases: ["Dexter Original Sin"], fontFamily: "ShowOswaldMedium", file: "show-oswald-medium.ttf", lookalike: "Oswald Medium", license: "SIL OFL 1.1" },
  "dexter-resurrection": { key: "dexter-resurrection", displayName: "Dexter: Resurrection", aliases: ["Dexter Resurrection"], fontFamily: "ShowOswaldMedium", file: "show-oswald-medium.ttf", lookalike: "Oswald Medium", license: "SIL OFL 1.1" },
  dexter: { key: "dexter", displayName: "Dexter", fontFamily: "ShowOswaldMedium", file: "show-oswald-medium.ttf", lookalike: "Oswald Medium", license: "SIL OFL 1.1" },
  "walking-dead": { key: "walking-dead", displayName: "The Walking Dead", aliases: ["Walking Dead"], fontFamily: "ShowAnton", file: "show-anton.ttf", lookalike: "Anton", license: "SIL OFL 1.1" },
  "the-chosen": { key: "the-chosen", displayName: "The Chosen", aliases: ["Chosen"], fontFamily: "ShowCinzel", file: "show-cinzel.ttf", lookalike: "Cinzel Bold", license: "SIL OFL 1.1" },
  "the-bear": { key: "the-bear", displayName: "The Bear", fontFamily: "ShowArchivo", file: "show-archivo.ttf", lookalike: "Archivo ExtraBold", license: "SIL OFL 1.1" },
  sopranos: { key: "sopranos", displayName: "The Sopranos", aliases: ["Sopranos"], fontFamily: "ShowArchivoNarrow", file: "show-archivo-narrow.ttf", lookalike: "Archivo Narrow Bold", license: "SIL OFL 1.1" },
  skins: { key: "skins", displayName: "Skins", fontFamily: "ShowNunito", file: "show-nunito.ttf", lookalike: "Nunito ExtraBold", license: "SIL OFL 1.1" },
  "game-of-thrones": { key: "game-of-thrones", displayName: "Game of Thrones", fontFamily: "ShowCinzelDecorative", file: "show-cinzel-decorative.ttf", lookalike: "Cinzel Decorative Bold", license: "SIL OFL 1.1" },
  "dragon-ball-z": { key: "dragon-ball-z", displayName: "Dragon Ball Z", aliases: ["Dragon Ball"], fontFamily: "ShowPassionOne", file: "show-passion-one.ttf", lookalike: "Passion One Black", license: "SIL OFL 1.1" },
  "sons-of-anarchy": { key: "sons-of-anarchy", displayName: "Sons of Anarchy", fontFamily: "ShowZillaSlab", file: "show-zilla-slab.ttf", lookalike: "Zilla Slab Bold", license: "SIL OFL 1.1" },
  reacher: { key: "reacher", displayName: "Reacher", fontFamily: "ShowBarlowCondensed", file: "show-barlow-condensed.ttf", lookalike: "Barlow Condensed SemiBold", license: "SIL OFL 1.1" },
  from: { key: "from", displayName: "From", fontFamily: "ShowMarcellus", file: "show-marcellus.ttf", lookalike: "Marcellus", license: "SIL OFL 1.1" },
  daredevil: { key: "daredevil", displayName: "Daredevil", fontFamily: "ShowBebasNeue", file: "show-bebas-neue.ttf", lookalike: "Bebas Neue", license: "SIL OFL 1.1" },
  pluribus: { key: "pluribus", displayName: "Pluribus", fontFamily: "ShowPoppins", file: "show-poppins.ttf", lookalike: "Poppins SemiBold", license: "SIL OFL 1.1" },
  "breaking-bad": { key: "breaking-bad", displayName: "Breaking Bad", fontFamily: "ShowArchivoBlack", file: "show-archivo-black.ttf", lookalike: "Archivo Black", license: "SIL OFL 1.1" },
  "better-call-saul": { key: "better-call-saul", displayName: "Better Call Saul", fontFamily: "ShowArchivoItalic", file: "show-archivo-italic.ttf", lookalike: "Archivo ExtraBold Italic", license: "SIL OFL 1.1" },
  fallout: { key: "fallout", displayName: "Fallout", fontFamily: "ShowYellowtail", file: "show-yellowtail.ttf", lookalike: "Yellowtail", license: "Apache 2.0" },
  "ted-lasso": { key: "ted-lasso", displayName: "Ted Lasso", fontFamily: "ShowGraduate", file: "show-graduate.ttf", lookalike: "Graduate", license: "SIL OFL 1.1" },
  "one-piece": { key: "one-piece", displayName: "One Piece", fontFamily: "ShowPirataOne", file: "show-pirata-one.ttf", lookalike: "Pirata One", license: "SIL OFL 1.1" },
  "stranger-things": { key: "stranger-things", displayName: "Stranger Things", fontFamily: "ShowPlayfair", file: "show-playfair.ttf", lookalike: "Playfair Display Bold", license: "SIL OFL 1.1" },
  bluey: { key: "bluey", displayName: "Bluey", fontFamily: "ShowBaloo2", file: "show-baloo2.ttf", lookalike: "Baloo 2 ExtraBold", license: "SIL OFL 1.1" },
  "hey-duggee": { key: "hey-duggee", displayName: "Hey Duggee", aliases: ["Duggee"], fontFamily: "ShowFredoka", file: "show-fredoka.ttf", lookalike: "Fredoka SemiBold", license: "SIL OFL 1.1" },
  avatar: { key: "avatar", displayName: "Avatar: The Last Airbender", aliases: ["Avatar The Last Airbender", "The Last Airbender", "Avatar"], fontFamily: "ShowCinzel", file: "show-cinzel.ttf", lookalike: "Cinzel Bold", license: "SIL OFL 1.1" },
  yellowstone: { key: "yellowstone", displayName: "Yellowstone", fontFamily: "ShowAlfaSlab", file: "show-alfa-slab.ttf", lookalike: "Alfa Slab One", license: "SIL OFL 1.1" },
  "the-boys": { key: "the-boys", displayName: "The Boys", aliases: ["Boys"], fontFamily: "ShowAnton", file: "show-anton.ttf", lookalike: "Anton", license: "SIL OFL 1.1" },
  you: { key: "you", displayName: "You", fontFamily: "ShowCormorant", file: "show-cormorant.ttf", lookalike: "Cormorant Garamond SemiBold", license: "SIL OFL 1.1" },
  chucky: { key: "chucky", displayName: "Chucky", fontFamily: "ShowGochiHand", file: "show-gochi-hand.ttf", lookalike: "Gochi Hand", license: "SIL OFL 1.1" },
  lost: { key: "lost", displayName: "Lost", fontFamily: "ShowOswaldLight", file: "show-oswald-light.ttf", lookalike: "Oswald Light", license: "SIL OFL 1.1" },
  "prison-break": { key: "prison-break", displayName: "Prison Break", fontFamily: "ShowBlackOps", file: "show-black-ops.ttf", lookalike: "Black Ops One", license: "SIL OFL 1.1" },
  "it-welcome-to-derry": { key: "it-welcome-to-derry", displayName: "IT: Welcome to Derry", aliases: ["Welcome to Derry"], fontFamily: "ShowPlayfairBlack", file: "show-playfair-black.ttf", lookalike: "Playfair Display Black", license: "SIL OFL 1.1" },
  carrie: { key: "carrie", displayName: "Carrie", fontFamily: "ShowCormorant", file: "show-cormorant.ttf", lookalike: "Cormorant Garamond SemiBold", license: "SIL OFL 1.1" },
  "harry-potter": { key: "harry-potter", displayName: "Harry Potter", fontFamily: "ShowImFell", file: "show-im-fell.ttf", lookalike: "IM Fell English", license: "SIL OFL 1.1" },
  wednesday: { key: "wednesday", displayName: "Wednesday", fontFamily: "ShowGrenzeGotisch", file: "show-grenze-gotisch.ttf", lookalike: "Grenze Gotisch Bold", license: "SIL OFL 1.1" },
  "vampire-diaries": { key: "vampire-diaries", displayName: "The Vampire Diaries", aliases: ["Vampire Diaries"], fontFamily: "ShowCinzel", file: "show-cinzel.ttf", lookalike: "Cinzel Bold", license: "SIL OFL 1.1" },
  "the-originals": { key: "the-originals", displayName: "The Originals", aliases: ["Originals"], fontFamily: "ShowCinzel", file: "show-cinzel.ttf", lookalike: "Cinzel Bold", license: "SIL OFL 1.1" },
  legacies: { key: "legacies", displayName: "Legacies", fontFamily: "ShowCinzel", file: "show-cinzel.ttf", lookalike: "Cinzel Bold", license: "SIL OFL 1.1" },
};

/**
 * Which show's font (if any) a notes/title pair calls for — the
 * detectTVShowScene chain, branch for branch, in its order, common
 * words ("from", "you", "lost", "it", "carrie", "wednesday") behind
 * the same TV-context guards the scene dispatch uses.
 */
export function detectShowFont(notes: string | undefined | null, title: string | undefined | null): ShowFontEntry | null {
  const text = `${title ?? ""} ${notes ?? ""}`.toLowerCase();
  if (!text.trim()) return null;
  const has = (...names: string[]) => names.some((n) => text.includes(n));
  if (has("new blood")) return SHOW_FONTS["dexter-new-blood"];
  if (has("original sin")) return SHOW_FONTS["dexter-original-sin"];
  if (has("resurrection")) return SHOW_FONTS["dexter-resurrection"];
  if (has("dexter")) return SHOW_FONTS["dexter"];
  if (has("walking dead")) return SHOW_FONTS["walking-dead"];
  if (has("the chosen")) return SHOW_FONTS["the-chosen"];
  if (has("the bear", "yes chef")) return SHOW_FONTS["the-bear"];
  if (has("sopranos")) return SHOW_FONTS["sopranos"];
  if (has("skins")) return SHOW_FONTS["skins"];
  if (has("game of thrones", "winterfell", "westeros") || /\bgot\b/.test(text)) return SHOW_FONTS["game-of-thrones"];
  if (has("dragon ball", "dbz")) return SHOW_FONTS["dragon-ball-z"];
  if (has("sons of anarchy") || /\bsoa\b/.test(text)) return SHOW_FONTS["sons-of-anarchy"];
  if (has("reacher")) return SHOW_FONTS["reacher"];
  if (/\bfrom\b/.test(text) && /\b(tv|series|show|episode|season|mgm)\b/.test(text)) return SHOW_FONTS["from"];
  if (has("daredevil")) return SHOW_FONTS["daredevil"];
  if (has("pluribus")) return SHOW_FONTS["pluribus"];
  if (has("breaking bad")) return SHOW_FONTS["breaking-bad"];
  if (has("better call saul", "saul goodman")) return SHOW_FONTS["better-call-saul"];
  if (has("fallout")) return SHOW_FONTS["fallout"];
  if (has("ted lasso")) return SHOW_FONTS["ted-lasso"];
  if (has("one piece")) return SHOW_FONTS["one-piece"];
  if (has("stranger things")) return SHOW_FONTS["stranger-things"];
  if (has("bluey")) return SHOW_FONTS["bluey"];
  if (has("duggee", "hey duggee")) return SHOW_FONTS["hey-duggee"];
  if (has("avatar the last airbender", "last airbender", "airbender", "avatar live action")) return SHOW_FONTS["avatar"];
  if (has("yellowstone")) return SHOW_FONTS["yellowstone"];
  if (has("the boys")) return SHOW_FONTS["the-boys"];
  if (/\byou\b/.test(text) && /\b(tv|series|show|episode|season|netflix)\b/.test(text)) return SHOW_FONTS["you"];
  if (has("chucky")) return SHOW_FONTS["chucky"];
  if (/\blost\b/.test(text) && /\b(tv|series|show|episode|season|island|oceanic)\b/.test(text)) return SHOW_FONTS["lost"];
  if (has("prison break")) return SHOW_FONTS["prison-break"];
  if (has("it welcome to derry", "welcome to derry") || (/\bit\b/.test(text) && /\b(tv|series|show)\b/.test(text))) return SHOW_FONTS["it-welcome-to-derry"];
  if (/\bcarrie\b/.test(text) && /\b(tv|series|show)\b/.test(text)) return SHOW_FONTS["carrie"];
  if (has("harry potter", "hogwarts")) return SHOW_FONTS["harry-potter"];
  if (has("wednesday addams", "nevermore") || (/\bwednesday\b/.test(text) && /\b(tv|series|show|episode|season|netflix)\b/.test(text))) return SHOW_FONTS["wednesday"];
  if (has("vampire diaries", "mystic falls")) return SHOW_FONTS["vampire-diaries"];
  if (has("the originals")) return SHOW_FONTS["the-originals"];
  if (has("legacies")) return SHOW_FONTS["legacies"];
  return null;
}

export interface ShowNameSegment {
  text: string;
  /** True for the one segment that is the show's name. */
  show: boolean;
}

/**
 * Split a sub-line into segments around the show's name (display name
 * or an alias, whole-word, case-insensitive, longest name first).
 * Returns a single unmarked segment when the name doesn't appear —
 * callers render that exactly as the plain string they render today.
 */
export function splitShowName(text: string, entry: ShowFontEntry): ShowNameSegment[] {
  const candidates = [entry.displayName, ...(entry.aliases ?? [])].sort((a, b) => b.length - a.length);
  const lower = text.toLowerCase();
  for (const name of candidates) {
    const needle = name.toLowerCase();
    let idx = lower.indexOf(needle);
    while (idx >= 0) {
      const before = idx === 0 ? "" : lower[idx - 1];
      const afterIdx = idx + needle.length;
      const after = afterIdx >= lower.length ? "" : lower[afterIdx];
      if (!/[a-z0-9]/.test(before) && !/[a-z0-9]/.test(after)) {
        const segments: ShowNameSegment[] = [];
        if (idx > 0) segments.push({ text: text.slice(0, idx), show: false });
        segments.push({ text: text.slice(idx, afterIdx), show: true });
        if (afterIdx < text.length) segments.push({ text: text.slice(afterIdx), show: false });
        return segments;
      }
      idx = lower.indexOf(needle, idx + 1);
    }
  }
  return [{ text, show: false }];
}
