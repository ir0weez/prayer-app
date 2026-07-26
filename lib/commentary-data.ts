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

// Default commentary data - structured as arrays of notes per verse
const DEFAULT_COMMENTARY: Record<string, CommentaryNote[]> = {
  'genesis_1_1': [
    {
      id: 'genesis_1_1_para1',
      book: 'Genesis',
      chapter: 1,
      verse: 1,
      author: 'Tried By Fire',
      authorHandle: '@TriedByFire',
      profileImageUrl: undefined,
      text: `This single verse alone gives us all of the details we need about God. First, it proves that GOD created. He didn't just dictate what needed to be done; He did it Himself. It also says "In the beginning," which doesn't insinuate God's beginning. One of the biggest questions that atheists ask about the existence of God is, "If God created everything, then who created God?" That question is so childish because it doesn't take into account the fact that if God was created by something, then God would cease to be God, and rather the one that created Him would be God. Because God doesn't stand in our definition of time (like this first verse suggests), then God is an eternal being that created creation.`,
      likes: 0,
      isLikedByUser: false,
      isBookmarkedByUser: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'genesis_1_1_para2',
      book: 'Genesis',
      chapter: 1,
      verse: 1,
      author: 'Tried By Fire',
      authorHandle: '@TriedByFire',
      profileImageUrl: undefined,
      text: `Creation is a human concept; God invented it for us. This beginning isn't speaking about God's beginning; it is speaking about ours. The structure of time "in the beginning" was not meant for Him, but for us, which is why I believe that the Earth was completed in six literal days rather than thousands of years in between each day.`,
      likes: 0,
      isLikedByUser: false,
      isBookmarkedByUser: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'genesis_1_1_para3',
      book: 'Genesis',
      chapter: 1,
      verse: 1,
      author: 'Tried By Fire',
      authorHandle: '@TriedByFire',
      profileImageUrl: undefined,
      text: `"But, beloved, be not ignorant of this one thing, that one day is with the Lord as a thousand years, and a thousand years as one day." 2 Peter 3:8`,
      likes: 0,
      isLikedByUser: false,
      isBookmarkedByUser: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'genesis_1_1_para4',
      book: 'Genesis',
      chapter: 1,
      verse: 1,
      author: 'Tried By Fire',
      authorHandle: '@TriedByFire',
      profileImageUrl: undefined,
      text: `When we allow this verse to dictate the beginnings of creation, we do two things wrong. Firstly, we allow the evidence of creation outlined here in the book of Genesis to be completely wrong and void of any proof or validity by calling Moses a liar in his opening statements. Secondly, we are calling God stupid because He doesn't have the proper grasp of time in His creation, and therefore is late to every other circumstance in the pages to follow.`,
      likes: 0,
      isLikedByUser: false,
      isBookmarkedByUser: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'genesis_1_1_para5',
      book: 'Genesis',
      chapter: 1,
      verse: 1,
      author: 'Tried By Fire',
      authorHandle: '@TriedByFire',
      profileImageUrl: undefined,
      text: `God was with His people every single second of every single day. If a thousand years was a day to the Lord, Adam would have been one thousand years old by the time God got around to appropriating the next steps to create Eve. Or let's take it a step further, when Abraham was walking with God and God spoke to him (which we will get into later in this book) it would have taken one thousand years for Abraham to receive his first child, let alone for him to take his first child and offer him as a sacrifice to the Lord. Abraham only lived to be one hundred and seventy-five years old. The math doesn't add up. In fact, all the Bible's writings wouldn't historically add up if God was only able to talk to us every one thousand years...`,
      likes: 0,
      isLikedByUser: false,
      isBookmarkedByUser: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'genesis_1_1_para6',
      book: 'Genesis',
      chapter: 1,
      verse: 1,
      author: 'Tried By Fire',
      authorHandle: '@TriedByFire',
      profileImageUrl: undefined,
      text: `Let's take it a step further. If a day was one thousand years to the Lord, then our prayers would take one thousand years to be answered. Yet we see people's prayers answered all the time right in front of them. This concept of "one thousand years is like a day" doesn't mean that God has no grasp on time (I mean He invented it for crying out loud), it simply means He is able to be through all times, at once, and He has the patience to endure time because He knows the end and beginning of all things. He stands OUTSIDE of time. Time has no control over Him. That's the key thing we have to remember when we view God, and if we are going to view Him in the proper light.`,
      likes: 0,
      isLikedByUser: false,
      isBookmarkedByUser: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'genesis_1_1_para7',
      book: 'Genesis',
      chapter: 1,
      verse: 1,
      author: 'Tried By Fire',
      authorHandle: '@TriedByFire',
      profileImageUrl: undefined,
      text: `God is above time and space. God also starts His creation before the first day by making the heaven and the earth void:`,
      likes: 0,
      isLikedByUser: false,
      isBookmarkedByUser: false,
      createdAt: new Date().toISOString(),
    },
  ],
  'genesis_1_2': [
    {
      id: 'genesis_1_2_para1',
      book: 'Genesis',
      chapter: 1,
      verse: 2,
      author: 'Tried By Fire',
      authorHandle: '@TriedByFire',
      profileImageUrl: undefined,
      text: `Because of the way in which verse two is structured, we have the notion to believe that either God created the Heaven and the Earth without form and void on purpose, leaving it in darkness (meaning His presence was not there, for the Lord is light), and He had still a purpose for building what was there, OR (as many scholars believe) there was some sort of catastrophe that took place between verses 1&2.`,
      likes: 0,
      isLikedByUser: false,
      isBookmarkedByUser: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'genesis_1_2_para2',
      book: 'Genesis',
      chapter: 1,
      verse: 2,
      author: 'Tried By Fire',
      authorHandle: '@TriedByFire',
      profileImageUrl: undefined,
      text: `Though not a surprise by God, the fact that the earth was without form and void gives credence to the idea that maybe God allowed a catastrophe to take place so He could start the Earth with something new. There are a lot of theories that can go into this (that I won't get into), but I think it's safe to say that the creation of the Earth that will be taking place in the next few verses will display the importance that God took to create a universe that is self-sustaining yet reliant upon Him.`,
      likes: 0,
      isLikedByUser: false,
      isBookmarkedByUser: false,
      createdAt: new Date().toISOString(),
    },
  ],
  'genesis_1_5': [
    {
      id: 'genesis_1_5_para1',
      book: 'Genesis',
      chapter: 1,
      verse: 5,
      author: 'Tried By Fire',
      authorHandle: '@TriedByFire',
      profileImageUrl: undefined,
      text: `In the first day of creation, God starts with light. He spoke light into existence, and not only did He just speak it and it was so, He also allowed it by saying, "Let there be..." This indication suggests that all of the things in which we see here on Earth to this day prove that it was created and made available to us because of a divine authority who provided it and allowed it.`,
      likes: 0,
      isLikedByUser: false,
      isBookmarkedByUser: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'genesis_1_5_para2',
      book: 'Genesis',
      chapter: 1,
      verse: 5,
      author: 'Tried By Fire',
      authorHandle: '@TriedByFire',
      profileImageUrl: undefined,
      text: `The fact that the sun has not yet burned out, exploded, or gotten closer to the Earth gives acceptable proof that there is a divine creator holding it all together. Though, this scripture does not talk about the sun. This light is a self-sustaining light without a source. The light, here, was granted access to this Earth because of God's authority to allow light in a dark and void place. Though, some scholars are under the impression that this is speaking about the sun specifically, and it won't be in its proper place until a later day.`,
      likes: 0,
      isLikedByUser: false,
      isBookmarkedByUser: false,
      createdAt: new Date().toISOString(),
    },
  ],
  'genesis_1_8': [
    {
      id: 'genesis_1_8_para1',
      book: 'Genesis',
      chapter: 1,
      verse: 8,
      author: 'Tried By Fire',
      authorHandle: '@TriedByFire',
      profileImageUrl: undefined,
      text: `A "firmament" is an air space. It's what gave separation between the water and the sky. God allows the sky to be divided from the water, and the water from the sky. When God divides the waters by the waters, it is speaking about the water being taken into the sky, and being above the water of the earth. Then He makes the water that was above the sky into the sky, and the water that was on the earth was kept as the water of the Earth.`,
      likes: 0,
      isLikedByUser: false,
      isBookmarkedByUser: false,
      createdAt: new Date().toISOString(),
    },
    {
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
  ],
  'genesis_1_13': [
    {
      id: 'genesis_1_13_para1',
      book: 'Genesis',
      chapter: 1,
      verse: 13,
      author: 'Tried By Fire',
      authorHandle: '@TriedByFire',
      profileImageUrl: undefined,
      text: `On the third day, God created dry land, grass, and trees with all kinds of fruits. We need to take special note that Moses writes "after his kind" about every single part of multiplied creation. He speaks about this with fruits, stating that there is no way to cross-breed a banana with a potato, for instance. There's no way to have a potatnana, nor would that be something that you would want. The trees themselves cannot be turned into grass and thrive. Grass could never become a tree. They have to stick and repopulate with their own kind. Now, once we get to the third day, the Earth seems pretty complete. We have light, with no sun. Water and sky, with no fish and birds. Dry land and greenery with no animals or man. This is where it becomes interesting, and why so many people are divided on the actuality of the biblical creation.`,
      likes: 0,
      isLikedByUser: false,
      isBookmarkedByUser: false,
      createdAt: new Date().toISOString(),
    },
  ],
  'genesis_1_19': [
    {
      id: 'genesis_1_19_para1',
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
  ],
  'genesis_1_23': [
    {
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
    {
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
  ],
  'genesis_1_25': [
    {
      id: 'genesis_1_25_para1',
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
  ],
  'genesis_1_27': [
    {
      id: 'genesis_1_27_para1',
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
  ],
  'genesis_1_31': [
    {
      id: 'genesis_1_31_para1',
      book: 'Genesis',
      chapter: 1,
      verse: 31,
      author: 'Tried By Fire',
      authorHandle: '@TriedByFire',
      profileImageUrl: undefined,
      text: `Multiplying was the main focus that God had for His creation. There are four main ways in which God proved creation and produced life:`,
      likes: 0,
      isLikedByUser: false,
      isBookmarkedByUser: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'genesis_1_31_para2',
      book: 'Genesis',
      chapter: 1,
      verse: 31,
      author: 'Tried By Fire',
      authorHandle: '@TriedByFire',
      profileImageUrl: undefined,
      text: `1. By direct creation, which produced Adam.\n2. By indirect creation, which produced Eve.\n3. By virgin birth, and this was how Jesus came into the human family.\n4. By natural generation, and that is what is common creation in our day.`,
      likes: 0,
      isLikedByUser: false,
      isBookmarkedByUser: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'genesis_1_31_para3',
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
  ],
};

/**
 * Get all commentary notes for a specific verse
 */
export async function getAllCommentariesForVerse(
  book: string,
  chapter: number,
  verse: number
): Promise<CommentaryNote[]> {
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

    return [];
  } catch (error) {
    console.error('Error fetching commentaries:', error);
    return [];
  }
}

/**
 * Get single commentary for a specific verse (legacy support)
 */
export async function getCommentary(
  book: string,
  chapter: number,
  verse: number
): Promise<CommentaryNote | null> {
  const commentaries = await getAllCommentariesForVerse(book, chapter, verse);
  return commentaries.length > 0 ? commentaries[0] : null;
}

/**
 * Add or update a commentary note
 */
export async function addCommentary(note: CommentaryNote): Promise<void> {
  try {
    const key = `${note.book.toLowerCase().replace(/\s+/g, '_')}_${note.chapter}_${note.verse}`;
    
    // Get existing user commentary
    const stored = await AsyncStorage.getItem(COMMENTARY_STORAGE_KEY);
    const userCommentary = stored ? JSON.parse(stored) : {};
    
    // Initialize array if it doesn't exist
    if (!userCommentary[key]) {
      userCommentary[key] = [];
    }
    
    // Add or update the note
    const existingIndex = userCommentary[key].findIndex((n: CommentaryNote) => n.id === note.id);
    if (existingIndex >= 0) {
      userCommentary[key][existingIndex] = note;
    } else {
      userCommentary[key].push(note);
    }
    
    await AsyncStorage.setItem(COMMENTARY_STORAGE_KEY, JSON.stringify(userCommentary));
  } catch (error) {
    console.error('Error adding commentary:', error);
  }
}

/**
 * Toggle like status for a commentary note
 */
export async function toggleLike(noteId: string, book: string, chapter: number, verse: number): Promise<void> {
  try {
    const commentaries = await getAllCommentariesForVerse(book, chapter, verse);
    const note = commentaries.find(n => n.id === noteId);
    
    if (note) {
      note.isLikedByUser = !note.isLikedByUser;
      note.likes += note.isLikedByUser ? 1 : -1;
      await addCommentary(note);
    }
  } catch (error) {
    console.error('Error toggling like:', error);
  }
}

/**
 * Toggle bookmark status for a commentary note
 */
export async function toggleBookmark(noteId: string, book: string, chapter: number, verse: number): Promise<void> {
  try {
    const commentaries = await getAllCommentariesForVerse(book, chapter, verse);
    const note = commentaries.find(n => n.id === noteId);
    
    if (note) {
      note.isBookmarkedByUser = !note.isBookmarkedByUser;
      await addCommentary(note);
    }
  } catch (error) {
    console.error('Error toggling bookmark:', error);
  }
}
