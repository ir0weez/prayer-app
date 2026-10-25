// v241: declarations for the two modules only the component-render
// tests touch. react-dom/server ships without bundled types in this
// tree (no @types/react-dom) and react-native-web is untyped; both
// are render-harness stand-ins for the native runtime, so the loose
// shapes here are deliberate — the pins assert on rendered output,
// not on these modules' own type surfaces.
declare module 'react-dom/server' {
  import type { ReactNode } from 'react';
  export function renderToString(node: ReactNode): string;
}

declare module 'react-native-web' {
  const anything: any;
  export = anything;
}
