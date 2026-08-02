import { describe, it, expect, beforeEach, vi } from 'vitest';

// Create a fresh mock storage for each test
let mockStorage: Record<string, string> = {};

vi.mock('@react-native-async-storage/async-storage', () => {
  return {
    default: {
      getItem: vi.fn(async (key: string) => mockStorage[key] || null),
      setItem: vi.fn(async (key: string, value: string) => {
        mockStorage[key] = value;
      }),
      removeItem: vi.fn(async (key: string) => {
        delete mockStorage[key];
      }),
      clear: vi.fn(async () => {
        mockStorage = {};
      }),
    },
  };
});

// Import after mocking
import {
  addHighlight,
  removeHighlight,
  isVerseHighlighted,
  getVerseHighlights,
  getChapterHighlights,
  getAllHighlights,
} from '../lib/bible-highlight';

describe('Bible Highlight System', () => {
  beforeEach(() => {
    mockStorage = {};
    vi.clearAllMocks();
  });

  it('should add a highlight to a verse', async () => {
    const highlight = await addHighlight('Genesis', 1, 1, 'In the beginning...', 'kjv', 'yellow');
    
    expect(highlight.book).toBe('Genesis');
    expect(highlight.chapter).toBe(1);
    expect(highlight.verse).toBe(1);
    expect(highlight.color).toBe('yellow');
  });

  it('should check if a verse is highlighted', async () => {
    await addHighlight('Genesis', 1, 1, 'In the beginning...', 'kjv', 'yellow');
    const isHighlighted = await isVerseHighlighted('Genesis', 1, 1, 'kjv');
    
    expect(isHighlighted).toBe(true);
  });

  it('should return false for non-highlighted verses', async () => {
    const isHighlighted = await isVerseHighlighted('Genesis', 1, 1, 'kjv');
    
    expect(isHighlighted).toBe(false);
  });

  it('should get all highlights for a verse', async () => {
    await addHighlight('Genesis', 1, 1, 'In the beginning...', 'kjv', 'yellow');
    await addHighlight('Genesis', 1, 1, 'In the beginning...', 'csb', 'green');
    
    const kjvHighlights = await getVerseHighlights('Genesis', 1, 1, 'kjv');
    const csbHighlights = await getVerseHighlights('Genesis', 1, 1, 'csb');
    
    expect(kjvHighlights).toHaveLength(1);
    expect(csbHighlights).toHaveLength(1);
  });

  it('should remove a highlight', async () => {
    await addHighlight('Genesis', 1, 1, 'In the beginning...', 'kjv', 'yellow');
    let isHighlighted = await isVerseHighlighted('Genesis', 1, 1, 'kjv');
    expect(isHighlighted).toBe(true);
    
    await removeHighlight('Genesis', 1, 1, 'kjv');
    isHighlighted = await isVerseHighlighted('Genesis', 1, 1, 'kjv');
    expect(isHighlighted).toBe(false);
  });

  it('should get all highlights for a chapter', async () => {
    await addHighlight('Genesis', 1, 1, 'In the beginning...', 'kjv', 'yellow');
    await addHighlight('Genesis', 1, 2, 'And the earth...', 'kjv', 'green');
    await addHighlight('Genesis', 2, 1, 'Thus the heavens...', 'kjv', 'pink');
    
    const chapterHighlights = await getChapterHighlights('Genesis', 1, 'kjv');
    
    expect(chapterHighlights).toHaveLength(2);
  });

  it('should get all highlights', async () => {
    await addHighlight('Genesis', 1, 1, 'In the beginning...', 'kjv', 'yellow');
    await addHighlight('Exodus', 1, 1, 'These are the names...', 'kjv', 'green');
    
    const allHighlights = await getAllHighlights();
    
    expect(allHighlights).toHaveLength(2);
  });
});
