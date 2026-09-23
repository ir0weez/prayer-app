from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path('/home/ubuntu/recreated-prayer-app')
UPLOAD = Path('/home/ubuntu/upload')
OUTPUT = ROOT / 'lib/commentary-imported-new.ts'
FILES = [
    'Genesis1-10.txt',
    '1Kings1-10.txt', '1Kings11-20.txt', '1Kings21-22.txt',
    '2Kings1-10.txt', '2Kings11-20.txt', '2Kings21-25.txt',
    'Proverbs1-10.txt', 'Proverbs11-20.txt', 'Proverbs21-30.txt', 'Proverbs31.txt',
]
CHAPTER_RE = re.compile(r'^(?P<book>.+?) (?P<chapter>\d+) Bible Stories (?:sections|structure):\s*$')
SECTION_RE = re.compile(r'^V\.\s*(?P<ranges>.+?)\s*\.?\s*$')
VERSE_RE = re.compile(r'^(?P<book>.+?) (?P<chapter>\d+):(?P<verse>\d+):\s*$')
CHAPTER_RANGE_RE = re.compile(r'^.+? \d+-\d+:\s*$')
COMMENT_RE = re.compile(r'^Comment (?P<number>\d+):\s*$')

def slug(book: str) -> str:
    return book.lower().replace(' ', '')

def clean(lines: list[str]) -> str:
    result = [line[1:] if line.startswith('\t') else line.rstrip() for line in lines]
    while result and not result[0].strip(): result.pop(0)
    while result and not result[-1].strip(): result.pop()
    return '\n'.join(result)

def parse_file(path: Path, ranges_by_chapter: dict[tuple[str, int], list[tuple[int, int]]], notes: list[dict], unmatched: list[str]) -> None:
    book = chapter = verse = comment_number = None
    active_ranges: list[tuple[int, int]] = []
    content: list[str] = []
    def flush() -> None:
        nonlocal content, comment_number
        text = clean(content)
        if book is not None and chapter is not None and verse is not None and comment_number is not None and text:
            matching = [r for r in ranges_by_chapter.get((book, chapter), []) if r[0] <= verse <= r[1]]
            if matching:
                start, end = matching[0]
            else:
                start = end = verse
                unmatched.append(f'{book} {chapter}:{verse} ({path.name})')
            notes.append({
                'id': f'{slug(book)}_{chapter}_{verse}_para{comment_number}',
                'book': book, 'chapter': chapter, 'verse': verse,
                'startVerse': start, 'endVerse': end,
                'author': 'Tried By Fire', 'authorHandle': '@TriedByFire',
                'text': text, 'likes': 0, 'isLikedByUser': False,
                'isBookmarkedByUser': False, 'createdAt': '2026-09-23T00:00:00.000Z',
            })
        content = []; comment_number = None
    lines = path.read_text(encoding='utf-8').replace('\r', '').splitlines()
    i = 0
    while i < len(lines):
        line = lines[i]
        chapter_match = CHAPTER_RE.match(line)
        if chapter_match:
            flush()
            header_book = chapter_match.group('book'); header_chapter = int(chapter_match.group('chapter'))
            i += 1
            if i < len(lines):
                section_match = SECTION_RE.match(lines[i])
                if section_match:
                    parsed = []
                    for part in section_match.group('ranges').split(','):
                        m = re.match(r'\s*(\d+)(?:-(\d+))?\s*$', part)
                        if m: parsed.append((int(m.group(1)), int(m.group(2) or m.group(1))))
                    ranges_by_chapter[(header_book, header_chapter)] = parsed
            i += 1; continue
        if CHAPTER_RANGE_RE.match(line):
            flush(); book = chapter = verse = None; i += 1; continue
        verse_match = VERSE_RE.match(line)
        if verse_match:
            flush(); book = verse_match.group('book'); chapter = int(verse_match.group('chapter')); verse = int(verse_match.group('verse')); i += 1; continue
        comment_match = COMMENT_RE.match(line)
        if comment_match:
            flush(); comment_number = int(comment_match.group('number')); i += 1; continue
        if comment_number is not None: content.append(line)
        i += 1
    flush()

ranges_by_chapter: dict[tuple[str, int], list[tuple[int, int]]] = {}
notes: list[dict] = []
unmatched: list[str] = []
for filename in FILES: parse_file(UPLOAD / filename, ranges_by_chapter, notes, unmatched)
notes = [note for note in notes if note['book'] != 'Genesis' or note['chapter'] <= 2]
counts: dict[tuple[str, int, int], int] = {}
for note in notes:
    identity = (note['book'], note['chapter'], note['verse'])
    counts[identity] = counts.get(identity, 0) + 1
    note['id'] = f"{slug(note['book'])}_{note['chapter']}_{note['verse']}_para{counts[identity]}"
by_key: dict[str, list[dict]] = {}
for note in notes:
    key = f"{slug(note['book'])}_{note['chapter']}_{note['verse']}"
    by_key.setdefault(key, []).append(note)
for entries in by_key.values(): entries.sort(key=lambda n: int(n['id'].rsplit('para', 1)[1]))
output = "import type { CommentaryNote } from './commentary-data';\n\n// Additive commentary imported from the replacement Genesis and new book source documents.\nexport const IMPORTED_COMMENTARY_NEW: Record<string, CommentaryNote[]> = "
output += json.dumps(by_key, ensure_ascii=False, indent=2) + ';\n'
OUTPUT.write_text(output, encoding='utf-8')
print(json.dumps({
    'notes': len(notes), 'verses': len(by_key), 'chapters': len(ranges_by_chapter),
    'books': sorted({n['book'] for n in notes}), 'unmatched': sorted(set(unmatched)),
    'totalsByBook': {book: sum(1 for n in notes if n['book'] == book) for book in sorted({n['book'] for n in notes})},
}, indent=2))
