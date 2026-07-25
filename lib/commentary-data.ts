import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CommentaryNote {
  id: string;
  book: string;
  chapter: number;
  verse: number;
  author: string;
  authorHandle: string;
  profileImageUrl?: string;
  text: string;
  likes: number;
  isLikedByUser: boolean;
  isBookmarkedByUser: boolean;
  createdAt: string;
}

const COMMENTARY_STORAGE_KEY = 'prayer_circle_commentary';

// Default commentary data
const DEFAULT_COMMENTARY: Record<string, CommentaryNote> = {
  'genesis_1_1': {
    id: 'genesis_1_1',
    book: 'Genesis',
    chapter: 1,
    verse: 1,
    author: 'Tried By Fire',
    authorHandle: '@TriedByFire',
    profileImageUrl: undefined,
    text: `This single verse alone gives us all of the details we need about God. First it proves that GOD created. He didn't just dictate what needed to be done, He did it Himself. It also says "In the beginning" which doesn't insinuate God's beginning. One of the biggest questions that atheists ask about the existence of God is, "If God created everything, then who created God?" That question is so childish because it doesn't take into the fact that if God WAS created by something, then God would seize to be God, rather the one that created Him would be God. Because God doesn't stand in our definition of time (like this first verse suggests) than God is an eternal being that created creation.

Creation is a human concept, God invented it for us. This beginning isn't speaking about God's beginning, it is speaking about ours. The structure of time "in the beginning" was not meant for Him, but for us, which is why I believe that the Earth was completely in 6 literal days rather than thousands of years in between each day.

"But, beloved, be not ignorant of this one thing, that one day is with the Lord as a thousand years, and a thousand years as one day." 2 Peter 3:8

When we allow this verse to dictate the beginnings of creation, we do two things wrong. Firstly, we allow the evidence of creation outlined here in the book of Genesis to be completely wrong and void of any proof or validity by calling Moses a liar in his opening statements. Secondly, we are calling God stupid because He doesn't have the proper grasp of time in His creation, and therefore is late to every other circumstance in the pages to follow.

God was with His people every single second of every single day. If a thousand years was a day to the Lord, Adam would have one thousand years old by the time God got around to appropriating the next steps to create Eve. Or lets take it a step further, when Abraham was walking with God and God spoke to him (which we will get into later in this book) it would have taken one thousand years for Abraham to receive his first child, let alone for him to take his first child and offer him as a sacrifice to the Lord. Abraham only lived to be one hundred and seventy-five years old. The math doesn't add up. In fact, all the Bible's writings wouldn't historically add up if God was only able to talk to us every one thousand years... Let's take it a step further. If a day was one thousand years to the Lord, then our prayers would take one thousand years to be answered. Yet we see people's prayers answered all the time right in front of them. This concept of "one thousand years is like a day" doesn't mean that God has no grasp on time (I mean He invented it for crying out loud), it simply means He is able to be through all times, at once, and He has the patience to endure time because He knows the end and beginning of all things. He stands OUTSIDE of time. Time has no control on Him. That's the key thing we have to remember when we view God, and if we are going to view Him in the proper light. God is above time and space. God also starts His creation before the first day by making the heaven and the earth void...`,
    likes: 0,
    isLikedByUser: false,
    isBookmarkedByUser: false,
    createdAt: new Date().toISOString(),
  },
  'genesis_1_2': {
    id: 'genesis_1_2',
    book: 'Genesis',
    chapter: 1,
    verse: 2,
    author: 'Tried By Fire',
    authorHandle: '@TriedByFire',
    profileImageUrl: undefined,
    text: `Because of the way in which verse two is structured, we have the notion to believe that either God created the Heaven and the Earth without form and void on purpose, leaving it in darkness (meaning His presence was not there, for the Lord is light), and He had still a purpose for building what was there, OR (as many scholars believe) there was some sort of catastrophe that took place between verses 1&2.\n\nThough not a surprise by God, the fact that the earth was without form and void gives credence to the idea that maybe God allowed a catastrophe to take place so He could start the Earth with something new. There are a lot of theories that can go into this (that I won't get into), but I think it's safe to say that the creation of the Earth that will be taking place in the next few verses will display the importance that God took to create a universe that is self-sustaining yet reliant upon Him.`,
    likes: 0,
    isLikedByUser: false,
    isBookmarkedByUser: false,
    createdAt: new Date().toISOString(),
  },
};

/**
 * Get commentary for a specific verse
 */
export async function getCommentary(
  book: string,
  chapter: number,
  verse: number
): Promise<CommentaryNote | null> {
  try {
    const key = `${book.toLowerCase().replace(/\s+/g, '_')}_${chapter}_${verse}`;
    
    // Check default commentary first
    if (DEFAULT_COMMENTARY[key]) {
      return DEFAULT_COMMENTARY[key];
    }

    // Check AsyncStorage for user-added commentary
    const stored = await AsyncStorage.getItem(COMMENTARY_STORAGE_KEY);
    if (stored) {
      const commentary = JSON.parse(stored) as Record<string, CommentaryNote>;
      return commentary[key] || null;
    }

    return null;
  } catch (error) {
    console.error('Error getting commentary:', error);
    return null;
  }
}

/**
 * Save or update commentary
 */
export async function saveCommentary(note: CommentaryNote): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(COMMENTARY_STORAGE_KEY);
    const commentary = stored ? JSON.parse(stored) : {};
    commentary[note.id] = note;
    await AsyncStorage.setItem(COMMENTARY_STORAGE_KEY, JSON.stringify(commentary));
  } catch (error) {
    console.error('Error saving commentary:', error);
  }
}

/**
 * Toggle like on commentary
 */
export async function toggleCommentaryLike(
  book: string,
  chapter: number,
  verse: number
): Promise<boolean> {
  try {
    const commentary = await getCommentary(book, chapter, verse);
    if (commentary) {
      commentary.isLikedByUser = !commentary.isLikedByUser;
      commentary.likes += commentary.isLikedByUser ? 1 : -1;
      await saveCommentary(commentary);
      return commentary.isLikedByUser;
    }
    return false;
  } catch (error) {
    console.error('Error toggling like:', error);
    return false;
  }
}

/**
 * Toggle bookmark on commentary
 */
export async function toggleCommentaryBookmark(
  book: string,
  chapter: number,
  verse: number
): Promise<boolean> {
  try {
    const commentary = await getCommentary(book, chapter, verse);
    if (commentary) {
      commentary.isBookmarkedByUser = !commentary.isBookmarkedByUser;
      await saveCommentary(commentary);
      return commentary.isBookmarkedByUser;
    }
    return false;
  } catch (error) {
    console.error('Error toggling bookmark:', error);
    return false;
  }
}
