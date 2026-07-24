/**
 * Map Bible books to relevant icons and descriptions
 */

export const BOOK_ICONS: Record<string, { icon: string; description: string }> = {
  // Pentateuch
  Genesis: { icon: '🌍', description: 'Creation' },
  Exodus: { icon: '🕯️', description: 'Liberation' },
  Leviticus: { icon: '⛪', description: 'Law' },
  Numbers: { icon: '🏜️', description: 'Wilderness' },
  Deuteronomy: { icon: '📜', description: 'Covenant' },

  // Historical Books
  Joshua: { icon: '⚔️', description: 'Conquest' },
  Judges: { icon: '🛡️', description: 'Judges' },
  Ruth: { icon: '🌾', description: 'Redemption' },
  '1 Samuel': { icon: '👑', description: 'Kingdom' },
  '2 Samuel': { icon: '👑', description: 'Kingdom' },
  '1 Kings': { icon: '🏰', description: 'Kings' },
  '2 Kings': { icon: '🏰', description: 'Kings' },
  '1 Chronicles': { icon: '📖', description: 'History' },
  '2 Chronicles': { icon: '📖', description: 'History' },
  Ezra: { icon: '🏗️', description: 'Restoration' },
  Nehemiah: { icon: '🧱', description: 'Rebuilding' },
  Esther: { icon: '👸', description: 'Deliverance' },

  // Wisdom Books
  Job: { icon: '❓', description: 'Suffering' },
  Psalms: { icon: '🎵', description: 'Praise' },
  Proverbs: { icon: '💡', description: 'Wisdom' },
  Ecclesiastes: { icon: '⏳', description: 'Vanity' },
  'Song of Solomon': { icon: '💕', description: 'Love' },

  // Major Prophets
  Isaiah: { icon: '🔥', description: 'Salvation' },
  Jeremiah: { icon: '😢', description: 'Lament' },
  Lamentations: { icon: '💔', description: 'Mourning' },
  Ezekiel: { icon: '👁️', description: 'Visions' },
  Daniel: { icon: '🦁', description: 'Prophecy' },

  // Minor Prophets
  Hosea: { icon: '💔', description: 'Unfaithful' },
  Joel: { icon: '🌪️', description: 'Judgment' },
  Amos: { icon: '⚖️', description: 'Justice' },
  Obadiah: { icon: '⚔️', description: 'Edom' },
  Jonah: { icon: '🐋', description: 'Repentance' },
  Micah: { icon: '⛰️', description: 'Bethlehem' },
  Nahum: { icon: '🔨', description: 'Vengeance' },
  Habakkuk: { icon: '❓', description: 'Faith' },
  Zephaniah: { icon: '⚡', description: 'Day' },
  Haggai: { icon: '🏗️', description: 'Temple' },
  Zechariah: { icon: '🕯️', description: 'Restoration' },
  Malachi: { icon: '✉️', description: 'Message' },

  // Gospels
  Matthew: { icon: '📖', description: 'King' },
  Mark: { icon: '📖', description: 'Servant' },
  Luke: { icon: '📖', description: 'Physician' },
  John: { icon: '📖', description: 'Word' },

  // Acts and Paul's Letters
  Acts: { icon: '🔥', description: 'Spirit' },
  Romans: { icon: '✝️', description: 'Gospel' },
  '1 Corinthians': { icon: '⛪', description: 'Church' },
  '2 Corinthians': { icon: '💪', description: 'Strength' },
  Galatians: { icon: '🕊️', description: 'Freedom' },
  Ephesians: { icon: '🌉', description: 'Unity' },
  Philippians: { icon: '😊', description: 'Joy' },
  Colossians: { icon: '👑', description: 'Christ' },
  '1 Thessalonians': { icon: '⏰', description: 'Hope' },
  '2 Thessalonians': { icon: '⚡', description: 'Judgment' },
  '1 Timothy': { icon: '📚', description: 'Doctrine' },
  '2 Timothy': { icon: '💪', description: 'Endurance' },
  Titus: { icon: '🎯', description: 'Conduct' },
  Philemon: { icon: '🤝', description: 'Forgiveness' },

  // Hebrews and James
  Hebrews: { icon: '🏛️', description: 'Priest' },
  James: { icon: '⚙️', description: 'Works' },

  // Peter, John, Jude
  '1 Peter': { icon: '🪨', description: 'Suffering' },
  '2 Peter': { icon: '⚠️', description: 'Warning' },
  '1 John': { icon: '💕', description: 'Love' },
  '2 John': { icon: '✉️', description: 'Truth' },
  '3 John': { icon: '🤝', description: 'Hospitality' },
  Jude: { icon: '⚔️', description: 'Contend' },

  // Revelation
  Revelation: { icon: '🌟', description: 'Apocalypse' },
};

/**
 * Get icon for a Bible book
 */
export function getBookIcon(book: string): string {
  return BOOK_ICONS[book]?.icon || '📖';
}

/**
 * Get description for a Bible book
 */
export function getBookDescription(book: string): string {
  return BOOK_ICONS[book]?.description || 'Scripture';
}
