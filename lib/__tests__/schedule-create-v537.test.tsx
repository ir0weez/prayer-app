/**
 * v537 — the create page lag, and the ministry creator crashes.
 *
 * Jonathan (Nov 15, on v534): "My app crashes when I try to make a
 * ministry event. Mostly when I try to select a ministry type, or
 * when I try to open the clock or date boxes." Widened the same
 * morning: "It happens to anything I try to create on that page.
 * It gets slow and laggy, or it just crashes." And the
 * discriminator: "The only thing that works well to create is the
 * time off stuff."
 *
 * THE DIFF (the audit, from the code):
 * - Time Off — the working control — keeps ALL of its form state
 *   inside its own component (TimeOffExperience), in a plain Modal
 *   with a ScrollView body. An interaction there re-renders that
 *   one small tree.
 * - Every ScheduleTab creator (event / todo / ministry /
 *   bible-study / worship) keeps its form state in ScheduleTab
 *   itself (~35 useState fields at the top of a ~17,800-line
 *   component whose render output is the entire schedule page).
 *   Every keystroke and pill tap re-renders the whole page plus
 *   the whole form. That is the lag, and it is structural.
 * - Three of the creators (event / ministry / bible-study) also
 *   wrapped the form in a FlatList carrying a single fake item,
 *   `data={[{ key: "form" }]}` — a FRESH array identity on every
 *   render, so VirtualizedList treated the data as changed and
 *   re-rendered its one giant cell (the entire form) on every
 *   ScheduleTab render, and the picker panels mounted inside a
 *   VirtualizedList cell. The todo and worship creators already
 *   used a plain ScrollView; Time Off does too.
 * - The ministry creator — the named crash form — additionally
 *   mounts AvatarPeopleSelector, which renders every person
 *   (~117 Pressable + avatar subtrees on his phone) and was NOT
 *   memoized: it re-rendered in full on every form interaction.
 *   Its onToggle was an inline closure, so even a memo could not
 *   have held.
 * - Every DateTimePicker in a form re-rendered on every form
 *   interaction too, re-deriving its Material tones each time.
 *
 * THE CRASH AUDIT (the classes from the brief, checked one by
 * one): no @react-native-community/datetimepicker exists in the
 * app — the picker is in-house and string-valued, its parsers
 * null-guarded, and the form state is always a string, so the
 * Invalid-Date native crash has no carrier here (NON-FINDING).
 * The v517 react-native-svg string-transform class is absent
 * from this path — the forms and the picker render no SVG, and
 * the app's only useAnimatedProps lives in the FAB glyph,
 * already fixed in v517 and not mounted by these forms
 * (NON-FINDING). PaperSettle/BitSettle and AnchoredSheet audit
 * clean as crash causes (NON-FINDING). The three named triggers
 * are exactly the heaviest operations the old structure
 * performed — a type tap was a full ScheduleTab re-render, a
 * picker open mounted a ~250-view panel inside a VirtualizedList
 * cell on that hot thread — so the fix removes the proven
 * weights; no speculative hardening was sprayed anywhere else.
 *
 * THE FIX (the Time Off pattern, applied at the forms' own
 * surface):
 * 1. The three single-cell FlatLists are ScrollViews now — the
 *    same body the todo/worship creators and Time Off already
 *    used. VirtualizedList is out of the creator path entirely.
 * 2. AvatarPeopleSelector is React.memo'd, and its one call site
 *    passes a useCallback-stable onToggle
 *    (handleToggleFormLinkedPerson), so the people grid renders
 *    once per actual selection change, not per keystroke.
 * 3. DateTimePicker is React.memo'd; every onChange it receives
 *    is a raw setState or a useCallback (the two start-time
 *    handlers that read the end time were wrapped:
 *    handleFormStartTimeChange in schedule-tab,
 *    handleStartTimeChange in event-edit-form), so a form
 *    interaction no longer re-renders the untouched pickers.
 *    The picker's internals — the v377 plain-View panel, the
 *    seat-keeping, the stage/commit contract — are untouched.
 *
 * The interactive pins below mount the REAL selector and the
 * REAL picker under react-test-renderer with counting stubs:
 * re-rendering a parent with unchanged props must not re-render
 * them (both counts grow on the pre-fix code), and a real prop
 * change must still get through (the memo is not a freeze).
 */
import React, { useCallback, useState } from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const rig = vi.hoisted(() => ({
  avatarRenders: 0,
  iconRenders: 0,
  bump: () => {},
  bumpPicker: () => {},
}));

vi.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  ScrollView: 'ScrollView',
  Pressable: 'Pressable',
  TextInput: 'TextInput',
  Modal: 'Modal',
  PanResponder: { create: () => ({ panHandlers: {} }) },
  useWindowDimensions: () => ({ width: 400, height: 800, scale: 2, fontScale: 1 }),
  StyleSheet: {
    create: (styles: Record<string, unknown>) => styles,
    hairlineWidth: 0.5,
    absoluteFill: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
    absoluteFillObject: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  },
  Platform: { OS: 'android', select: (o: any) => o.android ?? o.default },
}));

vi.mock('@expo/vector-icons/MaterialIcons', () => ({
  default: (props: Record<string, unknown>) => {
    rig.iconRenders++;
    return React.createElement('MaterialIcons', props);
  },
}));

vi.mock('@/hooks/use-colors', () => ({
  useColors: () => ({
    primary: '#7C5CFF',
    surface: '#FFFFFF',
    background: '#FFFFFF',
    foreground: '#111111',
    muted: '#777777',
    border: '#DDDDDD',
  }),
}));

vi.mock('@/hooks/use-skin', () => ({
  useSkin: () => ({ isSkinned: false, isPaper: false, isEightBit: false, tokens: {} }),
}));

vi.mock('@/lib/utils', () => ({
  format12HourTime: (v: string) => v,
}));

vi.mock('@/lib/color-themes', () => ({
  mix: (a: string) => a,
}));

vi.mock('@/lib/skin-themes', () => ({
  hexLuminance: () => 0.9,
}));

vi.mock('@/lib/schedule-material', () => ({
  scheduleMaterialTones: () => ({ primaryDeep: '#33215C', primaryContainer: '#E4DEFA' }),
  schedulePaperSurface: () => '#FFFFFF',
}));

vi.mock('@/lib/prayercircle-data', () => ({}));

vi.mock('@/components/stacked-avatar', () => ({
  StackedAvatar: (props: Record<string, unknown>) => {
    rig.avatarRenders++;
    return React.createElement('StackedAvatar', props);
  },
}));

import { AvatarPeopleSelector } from '@/components/avatar-people-selector';
import { DateTimePicker } from '@/components/date-time-picker';

const PEOPLE = [
  { id: 'p1', name: 'Anna Gutierrez', relationship: 'Family' },
  { id: 'p2', name: 'Cody Pattee', relationship: 'Friends' },
  { id: 'p3', name: 'William Frenn', relationship: 'Ministry' },
] as any[];
const STABLE_TOGGLE = (_personId: string) => {};
const STABLE_ONCHANGE = (_value: string) => {};

function SelectorHarness({ selectedIds }: { selectedIds: string[] }) {
  const [, setN] = useState(0);
  rig.bump = () => setN((x) => x + 1);
  const onToggle = useCallback(STABLE_TOGGLE, []);
  return <AvatarPeopleSelector people={PEOPLE} selectedIds={selectedIds} onToggle={onToggle} />;
}

function PickerHarness({ value }: { value: string }) {
  const [, setN] = useState(0);
  rig.bumpPicker = () => setN((x) => x + 1);
  return <DateTimePicker value={value} onChange={STABLE_ONCHANGE} mode="date" label="Select Date" />;
}

describe('v537 — the memoized form subtrees', () => {
  it('the people grid does not re-render when its parent re-renders with unchanged props', () => {
    rig.avatarRenders = 0;
    let renderer: ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(<SelectorHarness selectedIds={[]} />);
    });
    expect(rig.avatarRenders).toBe(PEOPLE.length);
    act(() => rig.bump());
    act(() => rig.bump());
    act(() => rig.bump());
    // Pre-fix (no memo): every parent render re-rendered the whole
    // grid — the count would now be 4× the people count.
    expect(rig.avatarRenders).toBe(PEOPLE.length);
    // A real selection change still gets through.
    act(() => {
      renderer!.update(<SelectorHarness selectedIds={['p1']} />);
    });
    expect(rig.avatarRenders).toBe(PEOPLE.length * 2);
  });

  it('a picker does not re-render when its parent re-renders with unchanged props', () => {
    rig.iconRenders = 0;
    let renderer: ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(<PickerHarness value="2026-11-15" />);
    });
    const afterMount = rig.iconRenders;
    expect(afterMount).toBeGreaterThan(0);
    act(() => rig.bumpPicker());
    act(() => rig.bumpPicker());
    act(() => rig.bumpPicker());
    // Pre-fix (no memo): each parent render re-rendered the
    // picker and its field icon with it.
    expect(rig.iconRenders).toBe(afterMount);
    // A real value change still gets through.
    act(() => {
      renderer!.update(<PickerHarness value="2026-11-16" />);
    });
    expect(rig.iconRenders).toBeGreaterThan(afterMount);
  });
});

describe('v537 — source pins', () => {
  const scheduleTab = readFileSync(join(process.cwd(), 'components/schedule-tab.tsx'), 'utf8');
  const picker = readFileSync(join(process.cwd(), 'components/date-time-picker.tsx'), 'utf8');
  const selector = readFileSync(join(process.cwd(), 'components/avatar-people-selector.tsx'), 'utf8');
  const eventEditForm = readFileSync(join(process.cwd(), 'components/event-edit-form.tsx'), 'utf8');

  it('no creator form body is a single-cell FlatList any more', () => {
    expect(scheduleTab).not.toContain('data={[{ key: "form" }]}');
    expect(scheduleTab).not.toContain('keyExtractor={(item) => item.key}');
  });

  it('the people selector is memoized and its call site passes the stable toggle', () => {
    expect(selector).toContain('React.memo(function AvatarPeopleSelector');
    expect(scheduleTab).toContain('const handleToggleFormLinkedPerson = useCallback(');
    expect(scheduleTab).toContain('onToggle={handleToggleFormLinkedPerson}');
  });

  it('the picker is memoized and the start-time handlers it depends on are useCallbacks', () => {
    expect(picker).toContain('React.memo(function DateTimePicker');
    expect(scheduleTab).toContain('const handleFormStartTimeChange = useCallback(');
    expect(eventEditForm).toContain('const handleStartTimeChange = useCallback(');
  });

  it('the v377 picker internals are untouched by the memo (no animated window crept back)', () => {
    expect(picker).not.toContain('PickerUnfurlWindow');
    expect(picker).toContain('phase === "open"');
  });
});
