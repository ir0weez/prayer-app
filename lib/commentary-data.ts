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
    text: `Because of the way in which verse two is structured, we have the notion to believe that either God created the Heaven and the Earth without form and void on purpose, leaving it in darkness (meaning His presence was not there, for the Lord is light), and He had still a purpose for building what was there, OR (as many scholars believe) there was some sort of catastrophe that took place between verses 1&2.

Though not a surprise by God, the fact that the earth was without form and void gives credence to the idea that maybe God allowed a catastrophe to take place so He could start the Earth with something new. There are a lot of theories that can go into this (that I won't get into), but I think it's safe to say that the creation of the Earth that will be taking place in the next few verses will display the importance that God took to create a universe that is self-sustaining yet reliant upon Him.`,
    likes: 0,
    isLikedByUser: false,
    isBookmarkedByUser: false,
    createdAt: new Date().toISOString(),
  },
  'genesis_1_5_para1': {
    id: 'genesis_1_5_para1',
    book: 'Genesis',
    chapter: 1,
    verse: 5,
    author: 'Tried By Fire',
    authorHandle: '@TriedByFire',
    profileImageUrl: undefined,
    text: `God is now finishing His creation with the fulfilling things that it needs from the last three days, and He starts by fulfilling day one on day four, day two on day five, and day three on day six. He starts by making two large lights that will give source to the light that was already there on Earth. Of course, these sources may have already been here since day one if scholars are correct, but they will not be positioned into their proper places to give off their proper purposes of light. One for day, and one for night. The moon itself not even giving off its own light! I believe the sources of these lights were created on this day. I think light was existing without a source before, and God gave that source right here on this day to COMPLETE His creation for it. That is what we will see in these six accounts. God is going to complete His creation.`,
    likes: 0,
    isLikedByUser: false,
    isBookmarkedByUser: false,
    createdAt: new Date().toISOString(),
  },
  'genesis_1_8_para1': {
    id: 'genesis_1_8_para1',
    book: 'Genesis',
    chapter: 1,
    verse: 8,
    author: 'Tried By Fire',
    authorHandle: '@TriedByFire',
    profileImageUrl: undefined,
    text: `The waters are now being separated. The waters above and the waters below. The waters below are the oceans, seas, and lakes that we know today. The waters above are what we now know as the atmosphere. It was gathered together into the sky and is now a source of dew, rain, and providence. The scripture speaks of three heavens. When verse 8 speaks about the "heaven" it is speaking about the sky we see here. There is then the heaven above the sky (where the stars and planets dwell) and then there's a third Heaven where God dwells. The Heaven spoken about here is the first layer, the one in which the waters (clouds or otherwise) are layered.`,
    likes: 0,
    isLikedByUser: false,
    isBookmarkedByUser: false,
    createdAt: new Date().toISOString(),
  },
  'genesis_1_8_para2': {
    id: 'genesis_1_8_para2',
    book: 'Genesis',
    chapter: 1,
    verse: 8,
    author: 'Tried By Fire',
    authorHandle: '@TriedByFire',
    profileImageUrl: undefined,
    text: `It was gathered together into the sky and is now a source of dew, rain, and providence. The scripture speaks of three heavens. When verse 8 speaks about the "heaven" it is speaking about the sky we see here. There is then the heaven above the sky (where the stars and planets dwell) and then there's a third Heaven where God dwells. The Heaven spoken about here is the first layer, the one in which the waters (clouds or otherwise) are layered.`,
    likes: 0,
    isLikedByUser: false,
    isBookmarkedByUser: false,
    createdAt: new Date().toISOString(),
  },
  'genesis_1_13': {
    id: 'genesis_1_13',
    book: 'Genesis',
    chapter: 1,
    verse: 13,
    author: 'Tried By Fire',
    authorHandle: '@TriedByFire',
    profileImageUrl: undefined,
    text: `God is now finishing His creation with the fulfilling things that it needs from the last three days, and He starts by fulfilling day one on day four, day two on day five, and day three on day six. He starts by making two large lights that will give source to the light that was already there on Earth. Of course, these sources may have already been here since day one if scholars are correct, but they will not be positioned into their proper places to give off their proper purposes of light. One for day, and one for night. The moon itself not even giving off its own light! I believe the sources of these lights were created on this day. I think light was existing without a source before, and God gave that source right here on this day to COMPLETE His creation for it. That is what we will see in these six accounts. God is going to complete His creation.`,
    likes: 0,
    isLikedByUser: false,
    isBookmarkedByUser: false,
    createdAt: new Date().toISOString(),
  },
  'genesis_1_19': {
    id: 'genesis_1_19',
    book: 'Genesis',
    chapter: 1,
    verse: 19,
    author: 'Tried By Fire',
    authorHandle: '@TriedByFire',
    profileImageUrl: undefined,
    text: `God is now finishing His creation with the fulfilling things that it needs from the last three days, and He starts by fulfilling day one on day four, day two on day five, and day three on day six. He starts by making two large lights that will give source to the light that was already there on Earth. Of course, these sources may have already been here since day one if scholars are correct, but they will not be positioned into their proper places to give off their proper purposes of light. One for day, and one for night. The moon itself not even giving off its own light! I believe the sources of these lights were created on this day. I think light was existing without a source before, and God gave that source right here on this day to COMPLETE His creation for it. That is what we will see in these six accounts. God is going to complete His creation.`,
    likes: 0,
    isLikedByUser: false,
    isBookmarkedByUser: false,
    createdAt: new Date().toISOString(),
  },
  'genesis_1_23_para1': {
    id: 'genesis_1_23_para1',
    book: 'Genesis',
    chapter: 1,
    verse: 23,
    author: 'Tried By Fire',
    authorHandle: '@TriedByFire',
    profileImageUrl: undefined,
    text: `"Let the waters bring forth abundantly the moving creature that hath life..." is this an indication of evolution? Did the waters just create life? Did God just give that authority to water? Did the sky just produce birds? No... Of course not, the language here is that God is using those things that are already present to create those things to fill those spaces. The purpose of the sky is for the birds. The purpose of the water is for the fish. The purpose for the land is for the animals and man. All three of these things work together for one common purpose, and that's for glorifying God.`,
    likes: 0,
    isLikedByUser: false,
    isBookmarkedByUser: false,
    createdAt: new Date().toISOString(),
  },
  'genesis_1_23_para2': {
    id: 'genesis_1_23_para2',
    book: 'Genesis',
    chapter: 1,
    verse: 23,
    author: 'Tried By Fire',
    authorHandle: '@TriedByFire',
    profileImageUrl: undefined,
    text: `Also, notice that they are created to breed with their own kind. There is no ape-fish. No bird-fish. That is impossible to do, even if you forced it. This continues to give further credence to the falsities of evolution…`,
    likes: 0,
    isLikedByUser: false,
    isBookmarkedByUser: false,
    createdAt: new Date().toISOString(),
  },
  'genesis_1_25': {
    id: 'genesis_1_25',
    book: 'Genesis',
    chapter: 1,
    verse: 25,
    author: 'Tried By Fire',
    authorHandle: '@TriedByFire',
    profileImageUrl: undefined,
    text: `Here God makes animals and seems to finish off creation... But there was one thing missing that God knew needed to be on Earth. He could have finished it with animals. In fact, He could have made evolution legitimate, but that's not what He wanted in His creation. He wanted people that would reflect His image, just like the Moon reflects the Sun.`,
    likes: 0,
    isLikedByUser: false,
    isBookmarkedByUser: false,
    createdAt: new Date().toISOString(),
  },
  'genesis_1_27': {
    id: 'genesis_1_27',
    book: 'Genesis',
    chapter: 1,
    verse: 27,
    author: 'Tried By Fire',
    authorHandle: '@TriedByFire',
    profileImageUrl: undefined,
    text: `God creates man here, and this was the most important part of his creation. He will be using and focusing on man for the remainder of this book. We will get glimpses and looks at the rest of His creation, but man was the thing that needed the most help. Actually, God will have an easy time using every other part of creation to help man get along. It will be man that the Lord will have a difficult time using.`,
    likes: 0,
    isLikedByUser: false,
    isBookmarkedByUser: false,
    createdAt: new Date().toISOString(),
  },
  'genesis_1_31_para1': {
    id: 'genesis_1_31_para1',
    book: 'Genesis',
    chapter: 1,
    verse: 31,
    author: 'Tried By Fire',
    authorHandle: '@TriedByFire',
    profileImageUrl: undefined,
    text: `Multiplying was the main focus that God had for His creation. There are four main ways in which God proved creation and produced life:

By direct creation, which produced Adam.
By indirect creation, which produced Eve.
By virgin birth, and this was how Jesus came into the human family.
By natural generation, and that is what is common creation in our day.`,
    likes: 0,
    isLikedByUser: false,
    isBookmarkedByUser: false,
    createdAt: new Date().toISOString(),
  },
  'genesis_1_31_para2': {
    id: 'genesis_1_31_para2',
    book: 'Genesis',
    chapter: 1,
    verse: 31,
    author: 'Tried By Fire',
    authorHandle: '@TriedByFire',
    profileImageUrl: undefined,
    text: `God made everything at this point and looked at it, understanding that everything that was made was "very good." Not just "good" but "very" good. It was perfect. It couldn't be better! But this will be the last time for a long time that the Earth and everything in it was perfect... And we see the start of the downfall of perfection right in the very next chapter…`,
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
      const userCommentary = JSON.parse(stored);
      if (userCommentary[key]) {
        return userCommentary[key];
      }
    }

    return null;
  } catch (error) {
    console.error('Error loading commentary:', error);
    return null;
  }
}

/**
 * Get all commentaries for a specific verse (including multi-paragraph entries)
 */
export async function getAllCommentariesForVerse(
  book: string,
  chapter: number,
  verse: number
): Promise<CommentaryNote[]> {
  try {
    const prefix = `${book.toLowerCase().replace(/\s+/g, '_')}_${chapter}_${verse}`;
    const results: CommentaryNote[] = [];

    // Check default commentary first
    for (const [key, comment] of Object.entries(DEFAULT_COMMENTARY)) {
      if (key === prefix || key.startsWith(prefix + '_')) {
        results.push(comment);
      }
    }

    // Check AsyncStorage for user-added commentary
    const stored = await AsyncStorage.getItem(COMMENTARY_STORAGE_KEY);
    if (stored) {
      const userCommentary = JSON.parse(stored);
      for (const [key, comment] of Object.entries(userCommentary)) {
        if ((key === prefix || key.startsWith(prefix + '_')) && !results.find(r => r.id === (comment as CommentaryNote).id)) {
          results.push(comment as CommentaryNote);
        }
      }
    }

    return results;
  } catch (error) {
    console.error('Error loading commentaries:', error);
    return [];
  }
}

/**
 * Toggle like on a commentary
 */
export async function toggleLikeCommentary(commentaryId: string): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(COMMENTARY_STORAGE_KEY);
    const userCommentary = stored ? JSON.parse(stored) : {};
    
    // Find and update the commentary
    for (const key in DEFAULT_COMMENTARY) {
      if (DEFAULT_COMMENTARY[key].id === commentaryId) {
        const comment = { ...DEFAULT_COMMENTARY[key] };
        comment.isLikedByUser = !comment.isLikedByUser;
        userCommentary[key] = comment;
        await AsyncStorage.setItem(COMMENTARY_STORAGE_KEY, JSON.stringify(userCommentary));
        return;
      }
    }
  } catch (error) {
    console.error('Error toggling like:', error);
  }
}

/**
 * Toggle bookmark on a commentary
 */
export async function toggleBookmarkCommentary(commentaryId: string): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(COMMENTARY_STORAGE_KEY);
    const userCommentary = stored ? JSON.parse(stored) : {};
    
    // Find and update the commentary
    for (const key in DEFAULT_COMMENTARY) {
      if (DEFAULT_COMMENTARY[key].id === commentaryId) {
        const comment = { ...DEFAULT_COMMENTARY[key] };
        comment.isBookmarkedByUser = !comment.isBookmarkedByUser;
        userCommentary[key] = comment;
        await AsyncStorage.setItem(COMMENTARY_STORAGE_KEY, JSON.stringify(userCommentary));
        return;
      }
    }
  } catch (error) {
    console.error('Error toggling bookmark:', error);
  }
}
