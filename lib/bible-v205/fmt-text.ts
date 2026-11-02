// ─── v418 bold / italic in his own words — the phone half ───────────────────
// Jonathan has typed markdown-style emphasis in his notes for years
// (`**SIDE NOTE:**`, `*It's funny because…*`) and asked why he can't
// bold or italicize (Nov 2). The Studio half (pass -60) set the
// convention; this module is the SAME parser, ported exactly, so a
// marked note reads identically at the desk and on the phone:
//
//   ***x*** → bold+italic    **x** → bold    *x* → italic
//
// where x is non-empty, has no leading/trailing whitespace, and
// contains no newline; a bold span's x may contain single `*`
// characters (rendered literally), an italic span's closing scan
// skips over `**` pairs, and a bold+italic span's x contains no `*`
// at all. Anything unmatched or failing a guard renders as literal
// characters. The markers are stored as the very characters in his
// text — they ride every Studio pack untouched and no note's shape
// changes.
//
// THE MARKS CONTRACT: every offset into block/line text held by the
// marks layer (marks.ts blockHighlights, lineHighlights) is measured
// against the STRIPPED text — stripFmtText of the stored text —
// which is the text every surface renders after this build. Rendered
// text IS stripped text, so a selection made over rendered words
// lands in stripped coordinates naturally, and stored ranges slice
// the stripped string when they paint.

export type FmtKind = '' | 'b' | 'i' | 'bi';

export interface FmtToken {
  k: FmtKind;
  s: string;
}

/** Split a stored text into plain / bold / italic / bold+italic
 * runs. An exact port of the Studio's fmtTokens (pass -60) — the
 * desk's parser is the reference; the two must never drift. */
export function fmtTokens(text: string): FmtToken[] {
  const src = String(text == null ? '' : text);
  const out: FmtToken[] = [];
  let i = 0;
  let buf = '';
  const flush = () => {
    if (buf) {
      out.push({ k: '', s: buf });
      buf = '';
    }
  };
  while (i < src.length) {
    if (src.slice(i, i + 3) === '***') {
      const closeT = src.indexOf('***', i + 3);
      if (closeT > i + 3) {
        const innerT = src.slice(i + 3, closeT);
        if (innerT.trim() === innerT && innerT.indexOf('\n') < 0 && innerT.indexOf('*') < 0) {
          flush();
          out.push({ k: 'bi', s: innerT });
          i = closeT + 3;
          continue;
        }
      }
      buf += '*';
      i++;
      continue;
    }
    if (src.slice(i, i + 2) === '**') {
      const closeB = src.indexOf('**', i + 2);
      if (closeB > i + 2) {
        const innerB = src.slice(i + 2, closeB);
        if (innerB.trim() === innerB && innerB.indexOf('\n') < 0) {
          flush();
          out.push({ k: 'b', s: innerB });
          i = closeB + 2;
          continue;
        }
      }
      buf += '*';
      i++;
      continue;
    }
    if (src[i] === '*') {
      let j = i + 1;
      let closeI = -1;
      while (j < src.length) {
        if (src[j] === '*') {
          if (src.slice(j, j + 2) === '**') {
            j += 2;
            continue;
          }
          closeI = j;
          break;
        }
        j++;
      }
      if (closeI > i + 1) {
        const innerI = src.slice(i + 1, closeI);
        if (innerI.trim() === innerI && innerI.indexOf('\n') < 0) {
          flush();
          out.push({ k: 'i', s: innerI });
          i = closeI + 1;
          continue;
        }
      }
      buf += '*';
      i++;
      continue;
    }
    buf += src[i];
    i++;
  }
  flush();
  return out;
}

/** The text with every marker removed — the string every surface
 * renders, and the string every stored offset addresses. */
export function stripFmtText(text: string): string {
  return fmtTokens(text)
    .map((t) => t.s)
    .join('');
}

export interface FmtStyleRange {
  /** Start offset in STRIPPED coordinates. */
  start: number;
  /** End offset (exclusive) in STRIPPED coordinates. */
  end: number;
  k: 'b' | 'i' | 'bi';
}

/** The styled spans of a stored text, addressed in stripped
 * coordinates — the shape the selectable renderer needs to dress
 * the stripped string it paints (marks contract: one coordinate
 * space for highlights and emphasis alike). */
export function fmtStyleRanges(text: string): FmtStyleRange[] {
  const out: FmtStyleRange[] = [];
  let offset = 0;
  for (const t of fmtTokens(text)) {
    if (t.k !== '') {
      out.push({ start: offset, end: offset + t.s.length, k: t.k });
    }
    offset += t.s.length;
  }
  return out;
}
