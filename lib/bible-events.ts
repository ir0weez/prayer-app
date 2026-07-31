// Simple event emitter for Bible state changes
type BibleEventListener = (event: BibleEvent) => void;

export interface BibleEvent {
  type: 'chapter-marked-read' | 'chapter-marked-unread';
  book: string;
  chapter: number;
}

class BibleEventEmitter {
  private listeners: Set<BibleEventListener> = new Set();

  subscribe(listener: BibleEventListener): () => void {
    this.listeners.add(listener);
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  emit(event: BibleEvent) {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in Bible event listener:', error);
      }
    });
  }
}

export const bibleEventEmitter = new BibleEventEmitter();
