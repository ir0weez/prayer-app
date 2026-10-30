/**
 * v375 — the recipe pick hand-off (Jonathan's selector flow,
 * approved Oct 30). The event editor is a Modal, not a route, so
 * the pick can't ride route params back: the editor registers a
 * pick REQUEST here (a snapshot of its in-memory form state —
 * title, date, notes — for a saved event or a brand-new one
 * alike), navigates to the Food page, and when the tab regains
 * focus it CONSUMES the result slot.
 *
 * The pattern is the app's own pending-request pattern (the
 * prayer-end request the layout consumes): a module-level slot,
 * a token so a stale hand-off can never be consumed twice or by
 * the wrong editor, and consume-once semantics.
 *
 * Nothing here touches storage: for an unsaved event the chosen
 * dish rides back into the editor's in-memory notes state, and
 * the editor's own Save is what persists it. No half-saved event
 * is ever written behind the user's back.
 */
import type { DishKey } from "@/lib/food-recipes";
import type { ScheduleEvent } from "@/lib/schedule-data";

/**
 * The pick request as the Food page's host event — an in-memory
 * snapshot only. It is never written to the events store; for a
 * saved event the stored copy stays exactly as it was until the
 * editor's own Save lands.
 */
export function recipePickEventSnapshot(request: RecipePickRequest): ScheduleEvent {
  return {
    id: request.eventId ?? "recipe-pick",
    title: request.title,
    date: request.date,
    startTime: request.startTime,
    notes: request.notes || undefined,
    isCompleted: false,
  };
}

export interface RecipePickRequest {
  token: number;
  /** The event being edited, or null for a not-yet-saved event. */
  eventId: string | null;
  title: string;
  date: string;
  startTime?: string;
  /** The editor's current (possibly unsaved) notes text. */
  notes: string;
}

export interface RecipePickResult {
  token: number;
  dish: DishKey;
  /** The notes with the dish named — the editor adopts these. */
  notes: string;
}

let pendingRequest: RecipePickRequest | null = null;
let pendingResult: RecipePickResult | null = null;
let tokenCounter = 0;

/** Register a pick and return its token. A new pick supersedes
 * any earlier unfinished one. */
export function beginRecipePick(
  request: Omit<RecipePickRequest, "token">,
): number {
  tokenCounter += 1;
  pendingRequest = { ...request, token: tokenCounter };
  pendingResult = null;
  return tokenCounter;
}

/** The Food page's view of the pick it was opened for. A token
 * that doesn't match the live request reads as no pick. */
export function peekRecipePickRequest(
  token: number | undefined | null,
): RecipePickRequest | null {
  if (token == null || !Number.isFinite(token)) return null;
  return pendingRequest?.token === token ? pendingRequest : null;
}

/** The Food page records the choice ("Add to event"). */
export function completeRecipePick(
  token: number,
  dish: DishKey,
  notes: string,
): void {
  if (pendingRequest?.token !== token) return;
  pendingResult = { token, dish, notes };
}

/** The editor takes the result — once. A second consume, or a
 * consume under a different token, returns null. */
export function consumeRecipePickResult(
  token: number,
): RecipePickResult | null {
  if (pendingResult?.token !== token) return null;
  const result = pendingResult;
  pendingResult = null;
  pendingRequest = null;
  return result;
}

/** Abandon a pick (the Food page unmounts without completing).
 * A completed result is never cancelled away. */
export function cancelRecipePick(token: number): void {
  if (pendingResult?.token === token) return;
  if (pendingRequest?.token === token) pendingRequest = null;
}

/** Test seam: clear both slots and rewind the token counter. */
export function resetRecipePickForTests(): void {
  pendingRequest = null;
  pendingResult = null;
  tokenCounter = 0;
}
