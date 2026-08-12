import fs from 'node:fs';

const inputPath = '/home/ubuntu/upload/Deuteronomy21-30.txt';
const commentaryPath = '/home/ubuntu/recreated-prayer-app/lib/commentary-data.ts';
const input = fs.readFileSync(inputPath, 'utf8').replace(/\r/g, '');
const source = fs.readFileSync(commentaryPath, 'utf8');

const DEFAULT_AUTHOR = { author: 'Tried By Fire', authorHandle: '@TriedByFire' };
const AUTHOR_BY_HANDLE = {
  'D.L.Moody': 'D.L. Moody',
  'M.Luther': 'Martin Luther',
};

if (/['"]deuteronomy_(?:2[1-9]|30)_\d+['"]\s*:/.test(source)) {
  throw new Error('Deuteronomy 21–30 entries already exist; import stopped to avoid duplicates.');
}

const notes = [];
let activeReference = null;
let activeAuthor = DEFAULT_AUTHOR;
let buffer = [];

function flushComment() {
  if (!activeReference) return;
  const text = buffer.join('\n').trim();
  if (text) notes.push({ ...activeReference, ...activeAuthor, text });
  buffer = [];
}

for (const rawLine of input.split('\n')) {
  const referenceMatch = rawLine.match(/^Deuteronomy\s+(\d+):(\d+):\s*$/i);
  const attributedCommentMatch = rawLine.match(/^Comment\s+\d+\s+\(@([^)]+)\):\s*(.*)$/i);
  const commentMatch = rawLine.match(/^Comment\s+\d+:\s*(.*)$/i);

  if (/^Deuteronomy\s+\d+\s+Bible Stories sections:/i.test(rawLine) || /^V\.\s*/i.test(rawLine)) continue;
  if (referenceMatch) {
    flushComment();
    activeReference = { chapter: Number(referenceMatch[1]), verse: Number(referenceMatch[2]) };
    activeAuthor = DEFAULT_AUTHOR;
    continue;
  }
  if (attributedCommentMatch && activeReference) {
    flushComment();
    const handle = attributedCommentMatch[1].trim();
    activeAuthor = { author: AUTHOR_BY_HANDLE[handle] ?? handle, authorHandle: `@${handle}` };
    if (attributedCommentMatch[2]) buffer.push(attributedCommentMatch[2]);
    continue;
  }
  if (commentMatch && activeReference) {
    flushComment();
    activeAuthor = DEFAULT_AUTHOR;
    if (commentMatch[1]) buffer.push(commentMatch[1]);
    continue;
  }
  if (activeReference) buffer.push(rawLine.replace(/^\t+/, '').trimEnd());
}
flushComment();

const importedNotes = notes.filter((note) => note.chapter >= 21 && note.chapter <= 30);
if (importedNotes.length === 0) throw new Error('No Deuteronomy 21–30 comments were parsed.');

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

const objectEndMarker = '\n};\n\n// Export the default commentary data';
const objectEnd = source.indexOf(objectEndMarker);
if (objectEnd === -1) throw new Error('Could not find the end of DEFAULT_COMMENTARY.');

const beforeObjectEnd = source.slice(0, objectEnd).trimEnd();
const afterObjectEnd = source.slice(objectEnd);
const separator = beforeObjectEnd.endsWith(',') ? '\n' : ',\n';
fs.writeFileSync(commentaryPath, `${beforeObjectEnd}${separator}${output}${afterObjectEnd}`);

const chapters = [...new Set(importedNotes.map((note) => note.chapter))].sort((a, b) => a - b);
const attributedAuthors = [...new Set(importedNotes.filter((note) => note.author !== DEFAULT_AUTHOR.author).map((note) => note.author))];
console.log(JSON.stringify({ importedParagraphs: importedNotes.length, importedVerses: grouped.size, chapters, attributedAuthors }, null, 2));
