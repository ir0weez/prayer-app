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

// v483: react-test-renderer (a devDependency since v483) ships no
// bundled types in this tree either; the pour-seat lifecycle tests
// use only the small surface below — instances, props, traversal,
// update/unmount, and act.
declare module 'react-test-renderer' {
  import type { ReactElement } from 'react';
  export interface ReactTestInstance {
    type: any;
    props: { [key: string]: any };
    parent: ReactTestInstance | null;
    children: (ReactTestInstance | string)[];
    findAll(predicate: (node: ReactTestInstance) => boolean): ReactTestInstance[];
    find(predicate: (node: ReactTestInstance) => boolean): ReactTestInstance;
    findAllByType(type: any): ReactTestInstance[];
    findByType(type: any): ReactTestInstance;
  }
  export interface ReactTestRenderer {
    root: ReactTestInstance;
    update(node: ReactElement): void;
    unmount(): void;
    toJSON(): any;
  }
  export function create(node: ReactElement): ReactTestRenderer;
  export function act(callback: () => void): void;
  const TestRenderer: { create: typeof create; act: typeof act };
  export default TestRenderer;
}
