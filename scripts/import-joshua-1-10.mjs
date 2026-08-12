import fs from 'node:fs';

const inputPath = '/home/ubuntu/upload/Joshua1-10.txt';
const commentaryPath = '/home/ubuntu/recreated-prayer-app/lib/commentary-data.ts';
const input = fs.readFileSync(inputPath, 'utf8').replace(/\r/g, '');
const source = fs.readFileSync(commentaryPath, 'utf8');

if (/['"]joshua_(?:[1-9]|10)_\d+['"]\s*:/.test(source)) {
  throw new Error('Joshua 1–10 entries already exist; import stopped to avoid duplicates.');
}

const notes = [];
let activeReference = null;
let buffer = [];

function flushComment() {
  if (!activeReference) return;
  const text = buffer.join('\n').trim();
  if (text) notes.push({ ...activeReference, text });
  buffer = [];
}

for (const rawLine of input.split('\n')) {
  const referenceMatch = rawLine.match(/^Joshua\s+(\d+):(\d+):\s*$/i);
  const commentMatch = rawLine.match(/^Comment\s+\d+:?\s*(.*)$/i);

  if (/^Joshua\s+\d+\s+Bible Stories sections:/i.test(rawLine) || /^V\.\s*/i.test(rawLine)) continue;
  if (referenceMatch) {
    flushComment();
    activeReference = { chapter: Number(referenceMatch[1]), verse: Number(referenceMatch[2]) };
    continue;
  }
  if (commentMatch && activeReference) {
    flushComment();
    if (commentMatch[1]) buffer.push(commentMatch[1]);
    continue;
  }
  if (activeReference) buffer.push(rawLine.replace(/^\t+/, '').trimEnd());
}
flushComment();

const importedNotes = notes.filter((note) => note.chapter >= 1 && note.chapter <= 10);
if (importedNotes.length === 0) throw new Error('No Joshua 1–10 comments were parsed.');

const grouped = new Map();
for (const note of importedNotes) {
  const key = `joshua_${note.chapter}_${note.verse}`;
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
      book: 'Joshua',
      chapter: ${chapter},
      verse: ${verse},
      author: 'Tried By Fire',
      authorHandle: '@TriedByFire',
      profileImageUrl: undefined,
      text: ${JSON.stringify(entry.text)},
      likes: 0,
      isLikedByUser: false,
      isBookmarkedByUser: false,
      createdAt: new Date().toISOString(),
    },`).join('\n');
  return `  '${key}': [\n${bodies}\n  ],`;
}).join('\n');

const objectEndMarker = '\n};\n\n// Export the default commentary data';
const objectEnd = source.indexOf(objectEndMarker);
if (objectEnd === -1) throw new Error('Could not find the end of DEFAULT_COMMENTARY.');

const beforeObjectEnd = source.slice(0, objectEnd).trimEnd();
const afterObjectEnd = source.slice(objectEnd);
const separator = beforeObjectEnd.endsWith(',') ? '\n' : ',\n';
fs.writeFileSync(commentaryPath, `${beforeObjectEnd}${separator}${output}${afterObjectEnd}`);

const chapters = [...new Set(importedNotes.map((note) => note.chapter))].sort((a, b) => a - b);
console.log(JSON.stringify({ importedParagraphs: importedNotes.length, importedVerses: grouped.size, chapters }, null, 2));
