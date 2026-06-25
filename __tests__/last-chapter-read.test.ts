import { describe, it, expect } from 'vitest';
import { ScheduleMinistry, BibleStudySession } from '@/lib/schedule-data';

// Replicate the getLastChapterRead function for testing
const getLastChapterRead = (ministriesList: ScheduleMinistry[], bibleStudiesList: BibleStudySession[]): string => {
  const allReadItems: Array<{ book: string; chapter: string; date: string; completedAt?: string }> = [];
  
  const readMinistries = ministriesList.filter(
    (m) => m.isCompleted && m.type === 'Read' && m.bibleBook && m.bibleChapter
  );
  readMinistries.forEach(m => {
    allReadItems.push({
      book: m.bibleBook!,
      chapter: m.bibleChapter!,
      date: m.date,
      completedAt: m.completedAt
    });
  });
  
  const completedStudies = bibleStudiesList.filter((s) => s.isCompleted);
  completedStudies.forEach(s => {
    allReadItems.push({
      book: s.book,
      chapter: s.chapter.toString(),
      date: s.date,
      completedAt: s.completedAt
    });
  });
  
  if (allReadItems.length === 0) return 'No chapters read';
  
  const sorted = allReadItems.sort((a, b) => {
    const timeA = a.completedAt ? new Date(a.completedAt).getTime() : new Date(a.date).getTime();
    const timeB = b.completedAt ? new Date(b.completedAt).getTime() : new Date(b.date).getTime();
    return timeB - timeA;
  });
  
  const latest = sorted[0];
  return `${latest.book} ${latest.chapter}`;
};

describe('getLastChapterRead', () => {
  it('should return the most recently completed Bible Study session', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    const today = new Date().toISOString().split('T')[0];
    
    const bibleStudies: BibleStudySession[] = [
      {
        id: '1',
        book: '1 Corinthians',
        chapter: 1,
        date: yesterdayStr,
        isCompleted: true,
        completedAt: new Date(yesterday.getTime() + 1000).toISOString()
      },
      {
        id: '2',
        book: 'Lamentations',
        chapter: 2,
        date: today,
        isCompleted: false
      }
    ];
    
    const ministries: ScheduleMinistry[] = [
      {
        id: '3',
        title: 'Read',
        type: 'Read',
        date: yesterdayStr,
        startTime: '10:00',
        endTime: '11:00',
        isCompleted: true,
        completedAt: yesterday.toISOString(),
        bibleBook: '2 Timothy',
        bibleChapter: '2',
        color: '#000000',
        linkedPeopleIds: []
      }
    ];
    
    const result = getLastChapterRead(ministries, bibleStudies);
    
    // 1 Corinthians 1 was completed more recently than 2 Timothy
    // (completedAt: yesterday + 1s vs yesterday)
    expect(result).toBe('1 Corinthians 1');
  });

  it('should return empty message when no chapters are completed', () => {
    const result = getLastChapterRead([], []);
    expect(result).toBe('No chapters read');
  });

  it('should handle Bible Study sessions without completedAt timestamp', () => {
    const today = new Date().toISOString().split('T')[0];
    
    const bibleStudies: BibleStudySession[] = [
      {
        id: '1',
        book: '1 Corinthians',
        chapter: 1,
        date: today,
        isCompleted: true
      }
    ];
    
    const result = getLastChapterRead([], bibleStudies);
    expect(result).toBe('1 Corinthians 1');
  });
});
