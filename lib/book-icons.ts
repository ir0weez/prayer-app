/**
 * Map Bible books to relevant MaterialIcons icon names
 */

export const BOOK_ICONS: Record<string, { icon: string; description: string }> = {
  // Pentateuch
  Genesis: { icon: 'public', description: 'Creation' },
  Exodus: { icon: 'lightbulb', description: 'Liberation' },
  Leviticus: { icon: 'menu-book', description: 'Law' },
  Numbers: { icon: 'landscape', description: 'Wilderness' },
  Deuteronomy: { icon: 'description', description: 'Covenant' },

  // Historical Books
  Joshua: { icon: 'shield', description: 'Conquest' },
  Judges: { icon: 'gavel', description: 'Judges' },
  Ruth: { icon: 'agriculture', description: 'Redemption' },
  '1 Samuel': { icon: 'crown', description: 'Kingdom' },
  '2 Samuel': { icon: 'crown', description: 'Kingdom' },
  '1 Kings': { icon: 'castle', description: 'Kings' },
  '2 Kings': { icon: 'castle', description: 'Kings' },
  '1 Chronicles': { icon: 'book', description: 'History' },
  '2 Chronicles': { icon: 'book', description: 'History' },
  Ezra: { icon: 'construction', description: 'Restoration' },
  Nehemiah: { icon: 'build', description: 'Rebuilding' },
  Esther: { icon: 'person', description: 'Deliverance' },

  // Wisdom Books
  Job: { icon: 'help', description: 'Suffering' },
  Psalms: { icon: 'music-note', description: 'Praise' },
  Proverbs: { icon: 'lightbulb', description: 'Wisdom' },
  Ecclesiastes: { icon: 'schedule', description: 'Vanity' },
  'Song of Solomon': { icon: 'favorite', description: 'Love' },

  // Major Prophets
  Isaiah: { icon: 'local-fire-department', description: 'Salvation' },
  Jeremiah: { icon: 'sentiment-very-dissatisfied', description: 'Lament' },
  Lamentations: { icon: 'broken-image', description: 'Mourning' },
  Ezekiel: { icon: 'visibility', description: 'Visions' },
  Daniel: { icon: 'pets', description: 'Prophecy' },

  // Minor Prophets
  Hosea: { icon: 'broken-image', description: 'Unfaithful' },
  Joel: { icon: 'cloud', description: 'Judgment' },
  Amos: { icon: 'balance', description: 'Justice' },
  Obadiah: { icon: 'shield', description: 'Edom' },
  Jonah: { icon: 'pets', description: 'Repentance' },
  Micah: { icon: 'terrain', description: 'Bethlehem' },
  Nahum: { icon: 'build', description: 'Vengeance' },
  Habakkuk: { icon: 'help', description: 'Faith' },
  Zephaniah: { icon: 'flash-on', description: 'Day' },
  Haggai: { icon: 'construction', description: 'Temple' },
  Zechariah: { icon: 'lightbulb', description: 'Restoration' },
  Malachi: { icon: 'mail', description: 'Message' },

  // Gospels
  Matthew: { icon: 'book', description: 'King' },
  Mark: { icon: 'book', description: 'Servant' },
  Luke: { icon: 'book', description: 'Physician' },
  John: { icon: 'book', description: 'Word' },

  // Acts and Paul's Letters
  Acts: { icon: 'local-fire-department', description: 'Spirit' },
  Romans: { icon: 'favorite', description: 'Gospel' },
  '1 Corinthians': { icon: 'menu-book', description: 'Church' },
  '2 Corinthians': { icon: 'fitness-center', description: 'Strength' },
  Galatians: { icon: 'air', description: 'Freedom' },
  Ephesians: { icon: 'public', description: 'Unity' },
  Philippians: { icon: 'sentiment-satisfied', description: 'Joy' },
  Colossians: { icon: 'crown', description: 'Christ' },
  '1 Thessalonians': { icon: 'schedule', description: 'Hope' },
  '2 Thessalonians': { icon: 'flash-on', description: 'Judgment' },
  '1 Timothy': { icon: 'library-books', description: 'Doctrine' },
  '2 Timothy': { icon: 'fitness-center', description: 'Endurance' },
  Titus: { icon: 'target', description: 'Conduct' },
  Philemon: { icon: 'handshake', description: 'Forgiveness' },

  // Hebrews and James
  Hebrews: { icon: 'domain', description: 'Priest' },
  James: { icon: 'settings', description: 'Works' },

  // Peter, John, Jude
  '1 Peter': { icon: 'terrain', description: 'Suffering' },
  '2 Peter': { icon: 'warning', description: 'Warning' },
  '1 John': { icon: 'favorite', description: 'Love' },
  '2 John': { icon: 'mail', description: 'Truth' },
  '3 John': { icon: 'handshake', description: 'Hospitality' },
  Jude: { icon: 'shield', description: 'Contend' },

  // Revelation
  Revelation: { icon: 'star', description: 'Apocalypse' },
};


export function getBookIcon(book: string): string {
  return BOOK_ICONS[book]?.icon || 'book';
}
