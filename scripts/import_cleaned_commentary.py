from __future__ import annotations

import json
import re
import sys
from pathlib import Path

SOURCE = Path(sys.argv[1]) if len(sys.argv) > 1 else Path('/home/ubuntu/upload/Genesis_cleaned.txt')
OUT_DIR = Path('/home/ubuntu/recreated-prayer-app/lib')
CHAPTER_RE = re.compile(r'^Chapter\s+(\d+)\s*$')
SUBSECTION_RE = re.compile(r'^Ver\.?\s+(\d+)(?:-(\d+))?:\s*(.*?)\s*$')
VERSE_RE = re.compile(r'^(?P<book>.+?)\s+(?P<chapter>\d+):(?P<start>\d+)(?:-(?P<end>\d+))?:\s*$')
COMMENT_RE = re.compile(r'^Comment\s+(\d+):\s*$')
SCRIPTURE_ATTRIBUTION_RE = re.compile(r'^(?:[1-3]\s+)?[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)*\s+\d+:\d+(?:-\d+)?$')


def slug(book: str) -> str:
    return book.lower().replace(' ', '')


def const(book_slug: str) -> str:
    return re.sub(r'[^A-Z0-9]+', '_', book_slug.upper()).strip('_')


def clean(lines: list[str]) -> str:
    while lines and lines[0] == '': lines.pop(0)
    while lines and lines[-1] == '': lines.pop()
    return '\n'.join(line[1:] if line.startswith('\t') else line for line in lines)


def attribution(text: str) -> str:
    last = text.split('\n')[-1].strip()
    if last and not last.endswith(('"', '”', '’')):
        match = re.search(r'\b((?:[1-3]\s+)?[A-Z][A-Za-z]+(?:\s+[A-Za-z]+){0,5}\s+\d+(?::\d+(?:-\d+)?)?|(?:[A-Z][A-Za-z.]+)(?:\s+[A-Z][A-Za-z.]+){1,4})$', last)
        if match: return match.group(1)
    return 'Someone'


def note(book_slug: str, book: str, chapter: int, verse_start: int, verse_end: int, range_start: int, range_end: int, text: str, kind: str, section: dict, seq: int) -> dict:
    speaker = 'Tried By Fire' if kind == 'comment' else attribution(text)
    scripture = kind == 'quote' and bool(SCRIPTURE_ATTRIBUTION_RE.fullmatch(speaker))
    return {
        'id': f"{book_slug}_{chapter}_{verse_start}_{'intro' if section['intro'] else section['id']}_{seq}",
        'book': book, 'chapter': chapter, 'verse': verse_start, 'startVerse': range_start, 'endVerse': range_end,
        'author': speaker, 'authorHandle': '@TriedByFire' if kind == 'comment' else ('' if scripture else ('@' + speaker if speaker != 'Someone' else '@Someone')),
        'text': text, 'likes': 0, 'isLikedByUser': False, 'isBookmarkedByUser': False,
        'createdAt': '2026-09-23T00:00:00.000Z', 'kind': kind,
        'quoteStyle': 'inline' if scripture else ('profile' if kind == 'quote' else None),
        'sectionId': section['id'], 'sectionTitle': section['title'], 'isIntroduction': section['intro'],
        'verseLabel': str(verse_start) if verse_start == verse_end else f'{verse_start}-{verse_end}',
    }


def parse_book(book: str, lines: list[str]) -> tuple[list[dict], dict[int, list[dict]]]:
    bs = slug(book); chapter = 0; sections: dict[int, list[dict]] = {}; all_notes = []
    current = None; verse = None; mode = None; comment_number = None; buffer = []; seq = 0

    def ensure_intro():
        nonlocal current
        current = next((s for s in sections.setdefault(chapter, []) if s['intro']), None)
        if current is None:
            current = {'id': f'{bs}-{chapter}-intro', 'title': 'Introduction', 'startVerse': 0, 'endVerse': 0, 'entries': [], 'intro': True}
            sections[chapter].insert(0, current)

    def flush():
        nonlocal buffer, comment_number, seq
        text = clean(buffer[:]); buffer = []
        if not text or current is None:
            comment_number = None; return
        seq += 1
        verse_start, _verse_end = verse or (current['startVerse'], current['endVerse'])
        item = note(bs, book, chapter, verse_start, _verse_end, current['startVerse'], current['endVerse'], text, 'comment' if mode == 'comment' else 'quote', current, seq)
        current['entries'].append(item); all_notes.append(item); comment_number = None

    for raw in lines:
        line = raw.rstrip('\n')
        m = CHAPTER_RE.match(line)
        if m:
            flush(); chapter = int(m.group(1)); current = None; verse = None; mode = None; continue
        if line.strip() == 'Introduction:':
            flush(); ensure_intro(); verse = None; mode = None; continue
        m = SUBSECTION_RE.match(line)
        if m:
            flush(); start = int(m.group(1)); end = int(m.group(2) or m.group(1))
            current = {'id': f'{bs}-{chapter}-{start}-{end}', 'title': m.group(3), 'startVerse': start, 'endVerse': end, 'entries': [], 'intro': False}
            sections.setdefault(chapter, []).append(current); verse = None; mode = None; continue
        m = VERSE_RE.match(line)
        if m:
            flush(); verse = (int(m.group('start')), int(m.group('end') or m.group('start'))); mode = None; continue
        m = COMMENT_RE.match(line)
        if m:
            if chapter == 0: chapter = 1; ensure_intro()
            flush(); comment_number = int(m.group(1)); mode = 'comment'; continue
        if line.strip() == '':
            if buffer: buffer.append('')
            continue
        if comment_number is not None and not line.startswith('\t') and line.lstrip().startswith(('"', '“')):
            flush(); mode = 'quote'; buffer.append(line); continue
        if mode == 'quote' and buffer and line.lstrip().startswith(('"', '“')):
            flush(); mode = 'quote'; buffer.append(line); continue
        if comment_number is None:
            if mode != 'quote': flush(); mode = 'quote'
            buffer.append(line)
        else:
            buffer.append(line)
    flush()
    return all_notes, sections


def emit(book: str, notes: list[dict], sections: dict[int, list[dict]]):
    bs = slug(book); c = const(bs); by_verse: dict[str, list[dict]] = {}
    for item in notes: by_verse.setdefault(f'{bs}_{item["chapter"]}_{item["verse"]}', []).append(item)
    for groups in sections.values():
        for group in groups: group.pop('intro', None)
    header = "import type { CommentaryNote } from './commentary-data';\n\nexport type CleanedCommentaryEntry = CommentaryNote & { kind: 'comment' | 'quote'; sectionId: string; sectionTitle: string; isIntroduction: boolean; verseLabel: string; };\nexport type CleanedCommentarySection = { id: string; title: string; startVerse: number; endVerse: number; entries: CleanedCommentaryEntry[]; };\n\n"
    body = header + f'export const CLEANED_{c}_BY_VERSE: Record<string, CleanedCommentaryEntry[]> = ' + json.dumps(by_verse, ensure_ascii=False, indent=2) + ';\n\n'
    body += f'export const CLEANED_{c}_CHAPTERS: Record<number, CleanedCommentarySection[]> = ' + json.dumps(sections, ensure_ascii=False, indent=2) + ';\n'
    path = OUT_DIR / f'commentary-cleaned-{bs}.ts'; path.write_text(body, encoding='utf-8')
    print(json.dumps({'book': book, 'chapters': len(sections), 'sections': sum(map(len, sections.values())), 'notes': len(notes), 'quotes': sum(1 for n in notes if n['kind'] == 'quote'), 'output': str(path)}))


def main():
    lines = SOURCE.read_text(encoding='utf-8').replace('\r', '').replace('\f', '\n').splitlines()
    known = {'1 Samuel', '2 Samuel', '1 Kings', '2 Kings', 'Proverbs'}; books: dict[str, list[str]] = {}; current = None
    for raw in lines:
        stripped = raw.strip()
        if stripped in known:
            if stripped != current: current = stripped; books.setdefault(current, [])
            continue
        if current: books[current].append(raw)
    if not books: raise SystemExit('No supported book headers found')
    for book, book_lines in books.items(): emit(book, *parse_book(book, book_lines))


if __name__ == '__main__': main()
