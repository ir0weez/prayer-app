import { describe, it, expect } from 'vitest';
import { bibleEventEmitter, BibleEvent } from '../lib/bible-events';

describe('Bible Event Emitter', () => {
  it('should emit and receive chapter-marked-read events', () => {
    return new Promise<void>((resolve) => {
      const testEvent: BibleEvent = {
        type: 'chapter-marked-read',
        book: 'Genesis',
        chapter: 1,
      };

      const unsubscribe = bibleEventEmitter.subscribe((event) => {
        expect(event.type).toBe('chapter-marked-read');
        expect(event.book).toBe('Genesis');
        expect(event.chapter).toBe(1);
        unsubscribe();
        resolve();
      });

      bibleEventEmitter.emit(testEvent);
    });
  });

  it('should allow multiple listeners', () => {
    return new Promise<void>((resolve) => {
      let count = 0;
      const testEvent: BibleEvent = {
        type: 'chapter-marked-read',
        book: 'Exodus',
        chapter: 2,
      };

      const unsubscribe1 = bibleEventEmitter.subscribe(() => {
        count++;
      });

      const unsubscribe2 = bibleEventEmitter.subscribe(() => {
        count++;
        if (count === 2) {
          unsubscribe1();
          unsubscribe2();
          resolve();
        }
      });

      bibleEventEmitter.emit(testEvent);
    });
  });

  it('should unsubscribe listeners', () => {
    return new Promise<void>((resolve) => {
      let called = false;
      const testEvent: BibleEvent = {
        type: 'chapter-marked-read',
        book: 'Leviticus',
        chapter: 3,
      };

      const unsubscribe = bibleEventEmitter.subscribe(() => {
        called = true;
      });

      unsubscribe();
      bibleEventEmitter.emit(testEvent);

      // Give it a moment to ensure the listener wasn't called
      setTimeout(() => {
        expect(called).toBe(false);
        resolve();
      }, 100);
    });
  });
});
