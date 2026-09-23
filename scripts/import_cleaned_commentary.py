from __future__ import annotations

import json
import re
from pathlib import Path

SOURCE = Path('/home/ubuntu/upload/Genesis_cleaned.txt')
OUTPUT = Path('/home/ubuntu/recreated-prayer-app/lib/commentary-cleaned-genesis.ts')

CHAPTER_RE = re.compile(r'^Chapter\s+(\d+)\s*$')
SUBSECTION_RE = re.compile(r'^Ver\.?\s+(\d+)(?:-(\d+))?:\s*(.*?)\s*$')
VERSE_RE = re.compile(r'^(?P<book>.+?)\s+(?P<chapter>\d+):(?P<start>\d+)(?:-(?P<end>\d+))?:\s*$')
COMMENT_RE = re.compile(r'^Comment\s+(\d+):\s*$')
INTRO_RE = re.compile(r'^Introduction:\s*$')


def text_line(line: str) -> str:
    # The source uses one tab only for paragraph indentation; retain all actual
    # words, punctuation, and line breaks while removing that presentation indent.
    return line[1:] if line.startswith('\t') else line


def clean_lines(lines: list[str]) -> str:
    while lines and lines[0] == '':
        lines.pop(0)
    while lines and lines[-1] == '':
        lines.pop()
    return '\n'.join(text_line(line) for line in lines)


def attribution(text: str) -> str:
    # The source may put the attribution at the end of a quote. Use only what
    # is present; never infer a speaker.
    last_line = text.split('\n')[-1].strip()
    if last_line and not last_line.endswith(('"', '”', '’')):
        match = re.search(r'\b((?:[1-3]\s+)?[A-Z][A-Za-z]+(?:\s+[A-Za-z]+){0,5}\s+\d+(?::\d+(?:-\d+)?)?|(?:[A-Z][A-Za-z.]+)(?:\s+[A-Z][A-Za-z.]+){1,4})$', last_line)
        if match:
            return match.group(1)
    return 'Someone'


def make_note(note_id: str, book: str, chapter: int, verse_start: int, verse_end: int, text: str, kind: str, section_id: str, section_title: str, intro: bool) -> dict:
    speaker = 'Tried By Fire' if kind == 'comment' else attribution(text)
    handle = '@TriedByFire' if kind == 'comment' else ('@' + speaker if speaker != 'Someone' else '@Someone')
    return {
        'id': note_id,
        'book': book,
        'chapter': chapter,
        'verse': verse_start,
        'startVerse': verse_start,
        'endVerse': verse_end,
        'author': speaker,
        'authorHandle': handle,
        'text': text,
        'likes': 0,
        'isLikedByUser': False,
        'isBookmarkedByUser': False,
        'createdAt': '2026-09-23T00:00:00.000Z',
        'kind': kind,
        'sectionId': section_id,
        'sectionTitle': section_title,
        'isIntroduction': intro,
        'verseLabel': f'{verse_start}' if verse_start == verse_end else f'{verse_start}-{verse_end}',
    }


def parse() -> tuple[list[dict], dict[str, list[dict]]]:
    lines = SOURCE.read_text(encoding='utf-8').replace('\r', '').splitlines()
    book = lines[0].strip()
    chapter = 0
    chapter_sections: dict[str, list[dict]] = {}
    all_notes: list[dict] = []
    current_section: dict | None = None
    current_verse: tuple[int, int] | None = None
    current_mode: str | None = None
    current_comment_number: int | None = None
    buffer: list[str] = []
    note_counter = 0

    def flush() -> None:
        nonlocal buffer, current_comment_number, note_counter
        text = clean_lines(buffer[:])
        buffer = []
        if not text or current_section is None:
            current_comment_number = None
            return
        note_counter += 1
        verse_start, verse_end = current_verse or (current_section['startVerse'], current_section['endVerse'])
        kind = 'comment' if current_mode == 'comment' else 'quote'
        intro = current_section['id'].endswith('-intro')
        note = make_note(
            f"genesis_{chapter}_{verse_start}_{'intro' if intro else current_section['id']}_{note_counter}",
            book, chapter, verse_start, verse_end, text, kind,
            current_section['id'], current_section['title'], intro,
        )
        current_section['entries'].append(note)
        all_notes.append(note)
        current_comment_number = None

    def ensure_intro() -> dict:
        nonlocal current_section
        key = f'{book.lower()}-{chapter}-intro'
        if not current_section or current_section['id'] != key:
            entries = chapter_sections[key][0]['entries'] if key in chapter_sections else []
            current_section = {'id': key, 'title': 'Introduction', 'startVerse': 0, 'endVerse': 0, 'entries': entries}
            chapter_sections[key] = [current_section]
        return current_section

    for raw in lines[1:]:
        line = raw.rstrip('\n')
        chapter_match = CHAPTER_RE.match(line)
        if chapter_match:
            flush(); chapter = int(chapter_match.group(1)); current_section = None; current_verse = None; current_mode = None; continue
        if INTRO_RE.match(line):
            flush(); ensure_intro(); current_verse = None; current_mode = None; continue
        subsection_match = SUBSECTION_RE.match(line)
        if subsection_match:
            flush()
            start = int(subsection_match.group(1)); end = int(subsection_match.group(2) or subsection_match.group(1)); title = subsection_match.group(3)
            section_id = f'{book.lower()}-{chapter}-{start}-{end}'
            entries = []
            current_section = {'id': section_id, 'title': title, 'startVerse': start, 'endVerse': end, 'entries': entries}
            chapter_sections.setdefault(f'{book.lower()}-{chapter}', []).append(current_section)
            current_verse = None; current_mode = None; continue
        verse_match = VERSE_RE.match(line)
        if verse_match:
            flush(); current_verse = (int(verse_match.group('start')), int(verse_match.group('end') or verse_match.group('start'))); current_mode = None; continue
        comment_match = COMMENT_RE.match(line)
        if comment_match:
            flush(); current_comment_number = int(comment_match.group(1)); current_mode = 'comment'; continue
        if line.strip() == '':
            if buffer:
                buffer.append('')
            continue
        # A quote after a completed comment is a separate standalone entry,
        # even when the source does not repeat a blank/header marker.
        if current_comment_number is not None and line.lstrip().startswith(('"', '“')):
            flush()
            current_mode = 'quote'
            buffer.append(line)
            continue
        # Any non-header text outside a Comment block is a literal standalone quote.
        if current_comment_number is None:
            if current_mode != 'quote':
                flush(); current_mode = 'quote'
            buffer.append(line)
        else:
            buffer.append(line)
    flush()
    return all_notes, chapter_sections

notes, chapters = parse()
by_verse: dict[str, list[dict]] = {}
for note in notes:
    key = f"genesis_{note['chapter']}_{note['verse']}"
    by_verse.setdefault(key, []).append(note)

# TypeScript literals are generated as JSON because the source text must remain exact.
output = "import type { CommentaryNote } from './commentary-data';\n\nexport type CleanedCommentaryEntry = CommentaryNote & {\n  kind: 'comment' | 'quote';\n  sectionId: string;\n  sectionTitle: string;\n  isIntroduction: boolean;\n  verseLabel: string;\n};\n\nexport type CleanedCommentarySection = {\n  id: string;\n  title: string;\n  startVerse: number;\n  endVerse: number;\n  entries: CleanedCommentaryEntry[];\n};\n\nexport const CLEANED_GENESIS_BY_VERSE: Record<string, CleanedCommentaryEntry[]> = " + json.dumps(by_verse, ensure_ascii=False, indent=2) + ";\n\nexport const CLEANED_GENESIS_CHAPTERS: Record<number, CleanedCommentarySection[]> = " + json.dumps({int(k.split('-')[1]): v for k, v in chapters.items() if k.count('-') == 1}, ensure_ascii=False, indent=2) + ";\n"
# The chapter map above excludes intro keys; add all chapter sections in original order explicitly.
chapter_map: dict[int, list[dict]] = {}
for key, sections in chapters.items():
    if key.startswith('genesis-'):
        chapter_map.setdefault(int(key.split('-')[1]), []).extend(sections)
# ensure introductions are first, then the subsection sections already in source order
for chapter_num, sections in chapter_map.items():
    intros = [s for s in sections if s['id'].endswith('-intro')]
    regular = [s for s in sections if not s['id'].endswith('-intro')]
    chapter_map[chapter_num] = intros + regular
output = output.rsplit('export const CLEANED_GENESIS_CHAPTERS', 1)[0] + "export const CLEANED_GENESIS_CHAPTERS: Record<number, CleanedCommentarySection[]> = " + json.dumps(chapter_map, ensure_ascii=False, indent=2) + ';\n'
OUTPUT.write_text(output, encoding='utf-8')
print(json.dumps({'chapters': len(chapter_map), 'notes': len(notes), 'sections': sum(len(v) for v in chapter_map.values()), 'quotes': sum(1 for n in notes if n['kind'] == 'quote')}, indent=2))
