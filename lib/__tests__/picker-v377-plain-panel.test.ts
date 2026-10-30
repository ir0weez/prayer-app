// ─── v377 — the panel is a plain View ─────────────────────────────────────
// Jonathan, Oct 30 16:46, on v376 (which carries the v374 fix),
// with a screenshot of the New Event editor: the START TIME field
// sits in its pink open tint with NO panel under it — "selecting
// times and dates still doesn't work..." The v374 cap fix is
// device-disconfirmed, exactly as v366's definite-height window
// was before it (his recording, Oct 30 14:24).
//
// STEP 1 — WHAT ACTUALLY SHIPPED IN v374 (verified at origin/main
// 49e8c7a before this build began): the cap code was really there.
// components/date-time-picker.tsx carried PickerUnfurlWindow with
// `maxHeight: windowCap` on an Animated.Value(0), heightLocked
// state, and handlePanelContentLayout gating the open on the
// in-flow child's onLayout. The rebase dropped nothing; the model
// itself failed on his phone, the same way the v275 cap model
// failed on the People roster before v282 deleted the window.
//
// THE REAL RENDER PATH (traced end to end — the chain the v366
// and v374 suites never modeled; they modeled the panel alone):
//   event-edit-form: <Modal transparent> → PaperSettle/BitSettle
//     → <ScrollView> → section card (borderRadius 22, NO overflow
//     hidden — the card does not clip)
//       → DateTimePicker root View (zIndex 40 while open)
//         → field Pressable (open tint = primaryContainer)
//         → seating View
//           → THE WINDOW (v366: Animated.View, overflow hidden,
//             definite height 0 at birth; v374: same window, an
//             animated maxHeight cap at 0 at birth)
//             → inner View onLayout → panel body
// The field's tint proved the tap and the phase fired — his
// screenshot shows it pink. Every ancestor above the window is
// innocent (no clipping card, no list, no removeClippedSubviews
// around the panel). The one node whose visibility depended on a
// measurement callback inside a zero-born animated window was
// the window itself, and it is the node both failures share.
//
// THE FIX (the v282/v367 ruling, applied a third time): the
// window is GONE. Phase "open" mounts the panel as a plain View
// in normal layout flow — its height is its children's layout
// height in the same pass as the rest of the form — and phase
// "closed" unmounts it in the same pass. No Animated height or
// maxHeight, no onLayout gating visibility, no "closing" fold,
// no sweep timer. The calendar, the dial, the derived tones, the
// open tint, the stage/OK-commit/Cancel-discard contract and the
// one-picker-at-a-time seat-keeping are untouched. Only his
// phone can say whether this works; these pins hold the SHAPE
// so the window cannot silently return.
//
// THE MODEL BELOW works at the integration level the device
// exercises: it extracts the panel's gate factors AND the
// ancestor chain's clipping facts from the shipped sources, and
// resolves panel visibility through the whole chain. Fed the
// v366 chain or the v374 chain it resolves NOT visible — the
// discrimination the v374 isolation model (visibility = the
// cap's resolved target > 0) could not make. Fed the shipped
// chain, it resolves visible.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (rel: string) =>
  readFileSync(join(__dirname, "..", "..", rel), "utf8");

const picker = read("components/date-time-picker.tsx");
const eventForm = read("components/event-edit-form.tsx");

// ─── The gate chain ───────────────────────────────────────────────

type PanelChain = {
  /** The panel mounts conditionally on the open phase. */
  mountsWhenOpen: boolean;
  /** An Animated.View / Animated.Value drives a height or
   *  maxHeight around the panel. */
  animatedWindow: boolean;
  /** Visibility waits on an onLayout measurement inside the
   *  panel path flipping state (openedRef / setLocked / a
   *  layout handler that discards non-positive reports). */
  measurementGate: boolean;
  /** The panel's own frame clips its content while it opens. */
  clipWindow: boolean;
  /** A "closing" phase (or a timer) stands between the close
   *  request and the unmount. */
  foldBeforeUnmount: boolean;
  /** An ancestor between the editor root and the panel clips
   *  (the section card carrying overflow: hidden). */
  ancestorClips: boolean;
};

function panelVisible(chain: PanelChain): boolean {
  return (
    chain.mountsWhenOpen &&
    !chain.animatedWindow &&
    !chain.measurementGate &&
    !chain.clipWindow &&
    !chain.foldBeforeUnmount &&
    !chain.ancestorClips
  );
}

/** The panel's render block in the shipped picker: from the
 *  open-phase mount to the end of that JSX block. */
function panelRenderSlice(src: string): string {
  const start = src.indexOf("{isOpen && (");
  if (start < 0) return "";
  return src.slice(start, start + 1400);
}

/** The event editor's section-card definition — the panel's
 *  closest card ancestor in the New Event chain. */
function sectionCardSlice(src: string): string {
  const start = src.indexOf("const sectionCard");
  if (start < 0) return "";
  return src.slice(start, src.indexOf("} as const;", start));
}

function chainFromSources(pickerSrc: string, formSrc: string): PanelChain {
  const panel = panelRenderSlice(pickerSrc);
  const card = sectionCardSlice(formSrc);
  return {
    mountsWhenOpen:
      pickerSrc.includes('const isOpen = phase === "open"') && panel.length > 0,
    animatedWindow:
      pickerSrc.includes("Animated.View") ||
      pickerSrc.includes("Animated.Value") ||
      pickerSrc.includes("PickerUnfurlWindow") ||
      /maxHeight:/.test(pickerSrc),
    measurementGate:
      pickerSrc.includes("handlePanelContentLayout") ||
      pickerSrc.includes("openedRef") ||
      pickerSrc.includes("setLocked"),
    clipWindow: panel.includes('overflow: "hidden"') || panel.includes("overflow: 'hidden'"),
    foldBeforeUnmount:
      pickerSrc.includes('"closing"') || pickerSrc.includes("closeTimerRef"),
    ancestorClips: card.includes("overflow"),
  };
}

/** The v366 chain, reconstructed from that build's shipped
 *  source (picker-v366.test.ts pins it): a definite-height
 *  Animated window, the measurement discard, the fold + sweep.
 *  The model must call this NOT visible — it is the shape his
 *  14:24 recording shows failing. */
const v366Chain: PanelChain = {
  mountsWhenOpen: true,
  animatedWindow: true, // height: windowHeight (Animated.Value 0)
  measurementGate: true, // handlePanelContentLayout + `height <= 0` discard
  clipWindow: true, // overflow: "hidden" on the window
  foldBeforeUnmount: true, // phase "closing" + 500ms sweep timer
  ancestorClips: false,
};

/** The v374 chain, reconstructed from that build's shipped
 *  source (picker-v374-unfurl-cap.test.ts pins it line by line):
 *  the SAME window with the definite height swapped for an
 *  animated maxHeight cap. The v374 isolation model resolved
 *  this shape VISIBLE (cap target = natural height) — and his
 *  phone resolved it invisible. The model must call this NOT
 *  visible: at the chain level the cap is still an animated
 *  window born at 0 whose panel waits on the same measurement. */
const v374Chain: PanelChain = {
  mountsWhenOpen: true,
  animatedWindow: true, // maxHeight: windowCap (Animated.Value 0)
  measurementGate: true, // handlePanelContentLayout still gates the open
  clipWindow: true, // overflow: "hidden" on the window
  foldBeforeUnmount: true, // phase "closing" + sweep timer
  ancestorClips: false,
};

describe("v377 — the chain model discriminates both failing shapes", () => {
  it("the v366 definite-height chain resolves NOT visible", () => {
    expect(panelVisible(v366Chain)).toBe(false);
  });

  it("the v374 cap chain resolves NOT visible — the call the isolation model missed", () => {
    expect(panelVisible(v374Chain)).toBe(false);
  });

  it("the shipped chain resolves VISIBLE through the whole ancestor chain", () => {
    const chain = chainFromSources(picker, eventForm);
    expect(chain).toEqual({
      mountsWhenOpen: true,
      animatedWindow: false,
      measurementGate: false,
      clipWindow: false,
      foldBeforeUnmount: false,
      ancestorClips: false,
    });
    expect(panelVisible(chain)).toBe(true);
  });
});

describe("v377 — the shipped ancestor chain, node by node", () => {
  it("the New Event editor really is Modal → ScrollView → section card → picker", () => {
    expect(eventForm).toContain("<Modal");
    expect(eventForm).toContain("<ScrollView");
    expect(sectionCardSlice(eventForm)).not.toContain("overflow");
    expect(eventForm).toContain("<DateTimePicker");
  });

  it("the panel mounts on the open phase as a plain View with the frame style", () => {
    const panel = panelRenderSlice(picker);
    expect(panel.length).toBeGreaterThan(0);
    expect(panel).toContain("<View style={panelFrameStyle}>");
    expect(panel).toContain('mode === "date" ? renderDateBody() : renderTimeBody()');
  });

  it("the seating View's onLayout only sizes the dial — it gates nothing", () => {
    // panelWidth feeds dialSize (with a 320 fallback before any
    // layout); visibility never reads it.
    expect(picker).toContain("onLayout={(event) => setPanelWidth(event.nativeEvent.layout.width)}");
    expect(picker).toContain("(panelWidth || 320)");
    expect(picker).not.toContain("panelWidth > 0");
  });
});

describe("v377 — no animated window can come back on the open path", () => {
  it("the component carries no Animated view or value at all", () => {
    expect(picker).not.toContain("Animated.View");
    expect(picker).not.toContain("Animated.Value");
    expect(picker).not.toContain("RnEasing");
    expect(picker).not.toContain("useNativeDriver");
  });

  it("no height or maxHeight style is driven anywhere in the component", () => {
    expect(picker).not.toMatch(/maxHeight:/);
    expect(picker).not.toContain("windowCap");
    expect(picker).not.toContain("windowHeight");
    expect(picker).not.toContain("heightLocked");
  });

  it("no measurement callback gates the panel's visibility", () => {
    expect(picker).not.toContain("handlePanelContentLayout");
    expect(picker).not.toContain("openedRef");
    expect(picker).not.toContain("naturalHeightRef");
  });

  it("the close is the unmount — no closing phase, no sweep timer", () => {
    expect(picker).not.toContain('"closing"');
    expect(picker).not.toContain("closeTimerRef");
    expect(picker).not.toContain("setTimeout");
    expect(picker).toContain('setPhaseBoth("closed")');
  });

  it("PickerUnfurlWindow is gone from the component entirely", () => {
    expect(picker).not.toContain("PickerUnfurlWindow");
  });
});

describe("v377 — what the fix must not touch, still standing", () => {
  it("the field still paints its open tint from the derived tones", () => {
    expect(picker).toContain("backgroundColor: isOpen");
    expect(picker).toContain("tones.primaryContainer");
  });

  it("the stage / OK-commit / Cancel-discard contract is intact", () => {
    expect(picker).toContain("onChange(draftRef.current)");
    expect(picker).toContain("requestCloseRef.current(true)");
    expect(picker).toContain("requestCloseRef.current(false)");
  });

  it("one picker open at a time per form — the seat-keeping stands", () => {
    expect(picker).toContain("activePickerClose");
  });

  it("the calendar and the dial are still the v366 bodies", () => {
    expect(picker).toContain("renderDateBody");
    expect(picker).toContain("renderTimeBody");
    expect(picker).toContain("PanResponder.create");
  });
});

describe("v377 — every editor rides the one fixed component", () => {
  const consumers = [
    "components/event-edit-form.tsx",
    "components/ministry-edit-form.tsx",
    "components/schedule-tab.tsx",
    "components/time-off-modal.tsx",
    "components/time-off-experience.tsx",
    "components/prayer-journal-tab.tsx",
  ];

  it("each consumer imports the shared DateTimePicker", () => {
    for (const file of consumers) {
      const src = read(file);
      expect(
        src.includes('from "./date-time-picker"') ||
          src.includes("from './date-time-picker'") ||
          src.includes('from "@/components/date-time-picker"'),
        file,
      ).toBe(true);
    }
  });

  it("no consumer keeps a private animated window or picker copy", () => {
    for (const file of consumers) {
      const src = read(file);
      expect(src, file).not.toContain("PickerUnfurlWindow");
      expect(src, file).not.toContain("windowCap");
    }
  });
});
