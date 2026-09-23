from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path('/home/ubuntu/recreated-prayer-app')
UPLOAD = Path('/home/ubuntu/upload')
GENERATED = ROOT / 'lib/commentary-imported.ts'
DATA = ROOT / 'lib/commentary-data.ts'

FILES = [
    'Genesis3.txt', 'Genesis4-10.txt', 'Genesis21-30.txt', 'Genesis31-40.txt', 'Genesis41-50.txt',
    'Deuteronomy1-10.txt', 'Deuteronomy11-20.txt', 'Deuteronomy21-30.txt', 'Deuteronomy31-34.txt',
    'Joshua1-10.txt', 'Joshua11-20.txt', 'Joshua21-24.txt', 'Ruth1-4.txt',
    '1Samuel1-10.txt', '1Samuel11-20.txt', '1Samuel21-30.txt', '1Samuel31.txt',
    '2Samuel1-10.txt', '2Samuel11-20.txt', '2Samuel21-24.txt',
]

CHAPTER_RE = re.compile(r'^(?P<book>.+?) (?P<chapter>\d+) Bible Stories (?:sections|structure):\s*$')
SECTION_RE = re.compile(r'^V\.\s*(?P<ranges>.+?)\s*\.?\s*$')
VERSE_RE = re.compile(r'^(?P<book>.+?) (?P<chapter>\d+):(?P<verse>\d+):\s*$')
COMMENT_RE = re.compile(r'^Comment (?P<number>\d+):\s*$')


def slug(book: str) -> str:
    return book.lower().replace(' ', '')


def clean(lines: list[str]) -> str:
    result = []
    for line in lines:
        result.append(line[1:] if line.startswith('\t') else line.rstrip())
    while result and not result[0].strip(): result.pop(0)
    while result and not result[-1].strip(): result.pop()
    return '\n'.join(result)


def parse_source(path: Path, ranges_by_chapter: dict[tuple[str, int], list[tuple[int, int]]], notes: dict[str, tuple[int, int]], unmatched: list[str]) -> None:
    current_book = None
    current_chapter = None
    active_ranges: list[tuple[int, int]] = []
    book = chapter = verse = comment_number = None
    content: list[str] = []

    def flush() -> None:
        nonlocal content, comment_number
        if book is not None and chapter is not None and verse is not None and comment_number is not None and clean(content):
            key = f'{slug(book)}_{chapter}_{verse}_para{comment_number}'
            matching = [item for item in ranges_by_chapter.get((book, chapter), []) if item[0] <= verse <= item[1]]
            if not matching:
                unmatched.append(f'{book} {chapter}:{verse} ({path.name})')
                notes[key] = (verse, verse)
            else:
                notes[key] = matching[0]
        content = []
        comment_number = None

    lines = path.read_text(encoding='utf-8').replace('\r', '').splitlines()
    i = 0
    while i < len(lines):
        line = lines[i]
        chapter_match = CHAPTER_RE.match(line)
        if chapter_match:
            flush()
            current_book = chapter_match.group('book')
            current_chapter = int(chapter_match.group('chapter'))
            active_ranges = []
            i += 1
            if i < len(lines):
                section_match = SECTION_RE.match(lines[i])
                if section_match:
                    for part in section_match.group('ranges').split(','):
                        numbers = re.match(r'\s*(\d+)(?:-(\d+))?\s*$', part)
                        if not numbers:
                            raise ValueError(f'Bad subsection {part!r} in {path}')
                        start = int(numbers.group(1)); end = int(numbers.group(2) or start)
                        active_ranges.append((start, end))
                    ranges_by_chapter[(current_book, current_chapter)] = active_ranges
            i += 1
            continue
        verse_match = VERSE_RE.match(line)
        if verse_match:
            flush()
            book = verse_match.group('book'); chapter = int(verse_match.group('chapter')); verse = int(verse_match.group('verse'))
            i += 1
            continue
        comment_match = COMMENT_RE.match(line)
        if comment_match:
            flush(); comment_number = int(comment_match.group('number')); i += 1; continue
        if comment_number is not None:
            content.append(line)
        i += 1
    flush()


ranges_by_chapter: dict[tuple[str, int], list[tuple[int, int]]] = {}
ranges: dict[str, tuple[int, int]] = {}
unmatched: list[str] = []
for filename in FILES:
    parse_source(UPLOAD / filename, ranges_by_chapter, ranges, unmatched)

# Add fields to all statically defined note objects in commentary-data.ts.
source = DATA.read_text(encoding='utf-8')
current_id = None
updated_lines = []
for line in source.splitlines():
    id_match = re.search(r"\bid: '([^']+)'", line)
    if id_match:
        current_id = id_match.group(1)
    verse_match = re.match(r"(\s*)verse: (\d+),\s*$", line)
    updated_lines.append(line)
    if verse_match and current_id:
        start, end = ranges.get(current_id, (int(verse_match.group(2)), int(verse_match.group(2))))
        updated_lines.append(f'{verse_match.group(1)}startVerse: {start},')
        updated_lines.append(f'{verse_match.group(1)}endVerse: {end},')
DATA.write_text('\n'.join(updated_lines) + '\n', encoding='utf-8')

# Update the generated module fields from source ranges, preserving its generated JSON format.
generated = GENERATED.read_text(encoding='utf-8')
updated = []
current_id = None
for line in generated.splitlines():
    id_match = re.search(r'"id": "([^"]+)"', line)
    if id_match:
        current_id = id_match.group(1)
    updated.append(line)
    if re.match(r'\s*"verse": \d+,', line) and current_id:
        verse = int(re.search(r'"verse": (\d+)', line).group(1))
        start, end = ranges[current_id]
        indent = re.match(r'\s*', line).group(0)
        updated.append(f'{indent}"startVerse": {start},')
        updated.append(f'{indent}"endVerse": {end},')
GENERATED.write_text('\n'.join(updated) + '\n', encoding='utf-8')

print(json.dumps({
    'sourceNotesWithRanges': len(ranges),
    'chaptersWithRanges': len(ranges_by_chapter),
    'generatedNotes': sum(1 for line in updated if '"startVerse"' in line),
    'unmatchedSourceHeadings': unmatched,
    'missingGenesis1And2Source': True,
}, indent=2))
