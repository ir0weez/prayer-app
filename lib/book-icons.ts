// Mapping of Bible books to MaterialIcons for the Stories bar
export const BOOK_ICONS: { [key: string]: string } = {
  // Old Testament - Books of Moses
  'Genesis': 'public',
  'Exodus': 'directions-walk',
  'Leviticus': 'menu-book',
  'Numbers': 'numbers',
  'Deuteronomy': 'gavel',

  // Historical Books
  'Joshua': 'flag',
  'Judges': 'shield',
  'Ruth': 'favorite',
  '1 Samuel': 'person',
  '2 Samuel': 'person',
  '1 Kings': 'castle',
  '2 Kings': 'castle',
  '1 Chronicles': 'history',
  '2 Chronicles': 'history',
  'Ezra': 'description',
  'Nehemiah': 'construction',
  'Esther': 'star',

  // Poetry & Wisdom
  'Job': 'help',
  'Psalms': 'music-note',
  'Proverbs': 'lightbulb',
  'Ecclesiastes': 'question-mark',
  'Song of Solomon': 'favorite',

  // Major Prophets
  'Isaiah': 'visibility',
  'Jeremiah': 'warning',
  'Lamentations': 'sentiment-very-dissatisfied',
  'Ezekiel': 'visibility',
  'Daniel': 'school',

  // Minor Prophets
  'Hosea': 'favorite-border',
  'Joel': 'cloud',
  'Amos': 'agriculture',
  'Obadiah': 'mountain',
  'Jonah': 'water',
  'Micah': 'balance',
  'Nahum': 'flash-on',
  'Habakkuk': 'question-answer',
  'Zephaniah': 'dark-mode',
  'Haggai': 'construction',
  'Zechariah': 'visibility',
  'Malachi': 'mail',

  // New Testament - Gospels
  'Matthew': 'person',
  'Mark': 'person',
  'Luke': 'person',
  'John': 'favorite',

  // Acts
  'Acts': 'directions-run',

  // Paul's Epistles
  'Romans': 'mail',
  '1 Corinthians': 'mail',
  '2 Corinthians': 'mail',
  'Galatians': 'mail',
  'Ephesians': 'mail',
  'Philippians': 'mail',
  'Colossians': 'mail',
  '1 Thessalonians': 'mail',
  '2 Thessalonians': 'mail',
  '1 Timothy': 'mail',
  '2 Timothy': 'mail',
  'Titus': 'mail',
  'Philemon': 'mail',

  // Hebrews
  'Hebrews': 'school',

  // James & Peter
  'James': 'work',
  '1 Peter': 'shield',
  '2 Peter': 'shield',

  // John's Epistles
  '1 John': 'favorite',
  '2 John': 'favorite',
  '3 John': 'favorite',

  // Jude
  'Jude': 'gavel',

  // Revelation
  'Revelation': 'auto-awesome',
};

// Default icon if book not found
export const DEFAULT_ICON = 'menu-book';

export function getBookIcon(bookName: string): string {
  return BOOK_ICONS[bookName] || DEFAULT_ICON;
}
