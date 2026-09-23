from __future__ import annotations

import json
import re
from pathlib import Path

INPUTS = [
    Path('/home/ubuntu/upload/Joshua21-24.txt'),
    Path('/home/ubuntu/upload/Ruth1-4.txt'),
    Path('/home/ubuntu/upload/1Samuel1-10.txt'),
    Path('/home/ubuntu/upload/1Samuel11-20.txt'),
    Path('/home/ubuntu/upload/1Samuel21-30.txt'),
    Path('/home/ubuntu/upload/1Samuel31.txt'),
    Path('/home/ubuntu/upload/2Samuel1-10.txt'),
    Path('/home/ubuntu/upload/2Samuel11-20.txt'),
    Path('/home/ubuntu/upload/2Samuel21-24.txt'),
]
OUTPUT = Path('/home/ubuntu/recreated-prayer-app/lib/commentary-imported.ts')
VERSE_RE = re.compile(r'^(?P<book>.+?) (?P<chapter>\d+):(?P<verse>\d+):\s*$')
COMMENT_RE = re.compile(r'^Comment (?P<number>\d+):\s*$')


def clean_content(lines: list[str]) -> str:
    cleaned = []
    for line in lines:
        if line.startswith('\t'):
            line = line[1:]
        elif line.startswith('    '):
            line = line[4:]
        cleaned.append(line.rstrip())
    while cleaned and not cleaned[0].strip():
        cleaned.pop(0)
    while cleaned and not cleaned[-1].strip():
        cleaned.pop()
    return '\n'.join(cleaned)


def parse_file(path: Path) -> list[dict]:
    notes: list[dict] = []
    book = None
    chapter = None
    verse = None
    comment_number = None
    content: list[str] = []

    def flush() -> None:
        nonlocal content, comment_number
        if book is not None and chapter is not None and verse is not None and comment_number is not None:
            text = clean_content(content)
            if text:
                notes.append({
                    'id': f"{book.lower().replace(' ', '')}_{chapter}_{verse}_para{comment_number}",
                    'book': book,
                    'chapter': chapter,
                    'verse': verse,
                    'author': 'Tried By Fire',
                    'authorHandle': '@TriedByFire',
                    'text': text,
                    'likes': 0,
                    'isLikedByUser': False,
                    'isBookmarkedByUser': False,
                    'createdAt': '2026-09-23T00:00:00.000Z',
                })
        content = []
        comment_number = None

    for raw in path.read_text(encoding='utf-8').splitlines():
        line = raw.rstrip('\r')
        verse_match = VERSE_RE.match(line)
        if verse_match:
            flush()
            book = verse_match.group('book')
            chapter = int(verse_match.group('chapter'))
            verse = int(verse_match.group('verse'))
            continue
        comment_match = COMMENT_RE.match(line)
        if comment_match:
            flush()
            comment_number = int(comment_match.group('number'))
            continue
        if comment_number is not None:
            content.append(line)

    flush()
    return notes


all_notes: list[dict] = []
for input_path in INPUTS:
    all_notes.extend(parse_file(input_path))

ids = [note['id'] for note in all_notes]
if len(ids) != len(set(ids)):
    duplicates = sorted({item for item in ids if ids.count(item) > 1})
    raise SystemExit(f'Duplicate note IDs: {duplicates}')

by_key: dict[str, list[dict]] = {}
for note in all_notes:
    key = f"{note['book'].lower().replace(' ', '')}_{note['chapter']}_{note['verse']}"
    by_key.setdefault(key, []).append(note)

for notes in by_key.values():
    notes.sort(key=lambda note: int(note['id'].rsplit('para', 1)[1]))

output = "import type { CommentaryNote } from './commentary-data';\n\n"
output += "// Imported commentary supplied in the September 2026 continuation files.\n"
output += "export const IMPORTED_COMMENTARY: Record<string, CommentaryNote[]> = "
output += json.dumps(by_key, ensure_ascii=False, indent=2)
output += ";\n"
OUTPUT.write_text(output + '\n', encoding='utf-8')
print(f'Parsed {len(all_notes)} notes across {len(by_key)} verses into {OUTPUT}')
print('Books:', ', '.join(sorted({note['book'] for note in all_notes})))
