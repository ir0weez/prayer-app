// ─────────────────────────────────────────────────────────────────────────────
// v292 — the Wide Street's safety net.
//
// v291 crashed on device the moment Hometown opened: a render-time
// throw inside the new street subtree (a raw <g> element in the
// treeline art) had nowhere to land, so the whole app died. This
// boundary makes that class of failure structurally harmless: any
// throw while the street renders is caught here, the street subtree
// unmounts to nothing for that one commit, and the parent is told
// (onError) so it swaps in the pre-Part-2 town view — the same save,
// the grid presentation the town wore before the street — instead
// of the app dying. The street can fail; the town cannot.
// ─────────────────────────────────────────────────────────────────────────────

import { Component, type ReactNode } from "react";

export class StreetErrorBoundary extends Component<
  { onError: () => void; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  componentDidCatch(_error: Error, _info: { componentStack?: string | null }): void {
    this.props.onError();
  }

  render(): ReactNode {
    return this.state.failed ? null : this.props.children;
  }
}
