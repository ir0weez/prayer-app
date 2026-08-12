import fs from 'node:fs';

const inputPath = '/home/ubuntu/upload/Deuteronomy1-10.txt';
const commentaryPath = '/home/ubuntu/recreated-prayer-app/lib/commentary-data.ts';
const input = fs.readFileSync(inputPath, 'utf8').replace(/\r/g, '');
const source = fs.readFileSync(commentaryPath, 'utf8');

const DEFAULT_AUTHOR = { author: 'Tried By Fire', authorHandle: '@TriedByFire' };
const notes = [];
let activeReference = null;
let activeAuthor = DEFAULT_AUTHOR;
let buffer = [];

function flushComment() {
  if (!activeReference) return;
  const text = buffer.join('\n').trim();
  if (text) {
    notes.push({ ...activeReference, ...activeAuthor, text });
  }
  buffer = [];
}

for (const rawLine of input.split('\n')) {
  const referenceMatch = rawLine.match(/^Deuteronomy\s+(\d+):(\d+):\s*$/i);
  const commentMatch = rawLine.match(/^Comment\s+\d+:\s*(.*)$/i);
  const namedAuthorMatch = rawLine.match(/^@([\w.-]+)\s+\(Name:\s*(.+?)\):\s*(.*)$/i);
  const describedAuthorMatch = rawLine.match(/^(.+?)\s+\(@([\w.-]+)\s+Name:\s*(.+?)\)\s+said:\s*(.*)$/i);
  const simpleAuthorMatch = rawLine.match(/^([A-Z][A-Za-z .'-]+)\s+said:\s*(.*)$/);

  if (/^Deuteronomy\s+\d+\s+Bible Stories sections:/i.test(rawLine) || /^V\.\s*/i.test(rawLine)) {
    continue;
  }
  if (referenceMatch) {
    flushComment();
    activeReference = { chapter: Number(referenceMatch[1]), verse: Number(referenceMatch[2]) };
    activeAuthor = DEFAULT_AUTHOR;
    continue;
  }
  if (commentMatch && activeReference) {
    flushComment();
    activeAuthor = DEFAULT_AUTHOR;
    if (commentMatch[1]) buffer.push(commentMatch[1]);
    continue;
  }
  if (namedAuthorMatch && activeReference) {
    flushComment();
    activeAuthor = { author: namedAuthorMatch[2].trim(), authorHandle: `@${namedAuthorMatch[1]}` };
    if (namedAuthorMatch[3]) buffer.push(namedAuthorMatch[3]);
    continue;
  }
  if (describedAuthorMatch && activeReference) {
    flushComment();
    activeAuthor = { author: describedAuthorMatch[3].trim(), authorHandle: `@${describedAuthorMatch[2]}` };
    if (describedAuthorMatch[4]) buffer.push(describedAuthorMatch[4]);
    continue;
  }
  if (simpleAuthorMatch && activeReference) {
    flushComment();
    activeAuthor = { author: simpleAuthorMatch[1].trim(), authorHandle: `@${simpleAuthorMatch[1].replace(/[^A-Za-z0-9]/g, '')}` };
    if (simpleAuthorMatch[2]) buffer.push(simpleAuthorMatch[2]);
    continue;
  }
  if (activeReference) buffer.push(rawLine.replace(/^\t+/, '').trimEnd());
}
flushComment();

const importedNotes = notes.filter((note) => note.chapter >= 1 && note.chapter <= 10);
if (importedNotes.length === 0) throw new Error('No Deuteronomy 1–10 comments were parsed.');

const grouped = new Map();
for (const note of importedNotes) {
  const key = `deuteronomy_${note.chapter}_${note.verse}`;
  const current = grouped.get(key) ?? [];
  current.push(note);
  grouped.set(key, current);
}

const output = [...grouped.entries()].map(([key, entries]) => {
  const [, chapterText, verseText] = key.split('_');
  const chapter = Number(chapterText);
  const verse = Number(verseText);
  const bodies = entries.map((entry, index) => `    {
      id: '${key}_para${index + 1}',
      book: 'Deuteronomy',
      chapter: ${chapter},
      verse: ${verse},
      author: ${JSON.stringify(entry.author)},
      authorHandle: ${JSON.stringify(entry.authorHandle)},
      profileImageUrl: undefined,
      text: ${JSON.stringify(entry.text)},
      likes: 0,
      isLikedByUser: false,
      isBookmarkedByUser: false,
      createdAt: new Date().toISOString(),
    },`).join('\n');
  return `  '${key}': [\n${bodies}\n  ],`;
}).join('\n');

const lines = source.split('\n');
const retainedLines = [];
let skippingEntry = false;
for (const line of lines) {
  if (/^  'deuteronomy_(?:[1-9]|10)_\d+': \[$/.test(line)) {
    skippingEntry = true;
    continue;
  }
  if (skippingEntry) {
    if (line === '  ],') skippingEntry = false;
    continue;
  }
  retainedLines.push(line);
}
if (skippingEntry) throw new Error('Could not safely finish removing an existing Deuteronomy 1–10 entry.');

const retainedSource = retainedLines.join('\n');
const objectEndMarker = '\n};\n\n// Export the default commentary data';
const objectEnd = retainedSource.indexOf(objectEndMarker);
if (objectEnd === -1) throw new Error('Could not find the end of DEFAULT_COMMENTARY.');

const beforeObjectEnd = retainedSource.slice(0, objectEnd).trimEnd();
const afterObjectEnd = retainedSource.slice(objectEnd);
const separator = beforeObjectEnd.endsWith(',') ? '\n' : ',\n';
fs.writeFileSync(commentaryPath, `${beforeObjectEnd}${separator}${output}${afterObjectEnd}`);

const chapters = [...new Set(importedNotes.map((note) => note.chapter))].sort((a, b) => a - b);
const attributedAuthors = [...new Set(importedNotes.filter((note) => note.author !== DEFAULT_AUTHOR.author).map((note) => note.author))];
console.log(JSON.stringify({ importedParagraphs: importedNotes.length, importedVerses: grouped.size, chapters, attributedAuthors }, null, 2));
