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
  'genesis_2_3': [
    {
      id: 'genesis_2_3_para1',
      book: 'Genesis',
      chapter: 2,
      verse: 3,
      author: 'Tried By Fire',
      authorHandle: '@TriedByFire',
      profileImageUrl: undefined,
      text: `We can sometimes view the Sabbath in an improper light. There are many today who have the idea that when we (as mere human beings) keep the Sabbath holy (as the Lord commands in Exodus), we are not to do any work in that day that may subtract from the Lord's work. It's as if to say that cooking a meal, watching TV, spending time with family and friends, going to the park, taking a holiday getaway, or simply walking too far of a distance would be a sin on the Lord's Day. They misunderstand the purpose and point of it.`,
      likes: 0,
      isLikedByUser: false,
      isBookmarkedByUser: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'genesis_2_3_para2',
      book: 'Genesis',
      chapter: 2,
      verse: 3,
      author: 'Tried By Fire',
      authorHandle: '@TriedByFire',
      profileImageUrl: undefined,
      text: `God does not need rest. In fact, in these verses here, it does not say that God rested because of His work on the seventh day. It says He rested, FROM His work. In other words, He was done with His work. There was no more work to be had. We are not supposed to take a break for the week because we are "done" with work. The idea of the Sabbath is to refocus your week to prepare you for more work. That's the way to keep it holy. We are to go to church and learn how to take the message of the Lord into the world for the week.`,
      likes: 0,
      isLikedByUser: false,
      isBookmarkedByUser: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'genesis_2_3_para3',
      book: 'Genesis',
      chapter: 2,
      verse: 3,
      author: 'Tried By Fire',
      authorHandle: '@TriedByFire',
      profileImageUrl: undefined,
      text: `"And he said unto them, The sabbath was made for man, and not man for the sabbath: Therefore the Son of man is Lord also of the sabbath." Mark 2:27-28`,
      likes: 0,
      isLikedByUser: false,
      isBookmarkedByUser: false,
      createdAt: new Date().toISOString(),
    },
  ],
  'genesis_2_4': [
    {
      id: 'genesis_2_4_para1',
      book: 'Genesis',
      chapter: 2,
      verse: 4,
      author: 'Tried By Fire',
      authorHandle: '@TriedByFire',
      profileImageUrl: undefined,
      text: `There are many who believe that there were billions of years present before the world actually started on these seven days because it starts with it being void and formless, with nothing but darkness ruling over it. If this is the case, I cannot claim truth to it, because I was not there, and I am not God. It is sufficient to say that the days in which God created everything give homage to the fact that God didn't just leave the Earth in disorder and darkness. He obviously had a timing and a plan for this Earth that far surpasses even our understanding.`,
      likes: 0,
      isLikedByUser: false,
      isBookmarkedByUser: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'genesis_2_4_para2',
      book: 'Genesis',
      chapter: 2,
      verse: 4,
      author: 'Tried By Fire',
      authorHandle: '@TriedByFire',
      profileImageUrl: undefined,
      text: `See, when we form ideas or plans, we sometimes sit, think, and work out the details before even initiating the start of a plan. God doesn't work that way though. He just knows. It's hard to wrap our brains around, but everything was planned to a "t" within an instant. That's how God works! He thought of everything before a single thing was created. This includes Heaven, angels, Satan, humans, and even animals! He has a purpose for it all, and it boggles my mind that He created everything, yet He stands outside of our concepts and thoughts of creation and motives. He also uses the term "generations" in this verse here. He gives the picture that these beginning days were the start of "families." That's what "generations" means, it means "families."`,
      likes: 0,
      isLikedByUser: false,
      isBookmarkedByUser: false,
      createdAt: new Date().toISOString(),
    },
  ],
  'genesis_2_6': [
    {
      id: 'genesis_2_6_para1',
      book: 'Genesis',
      chapter: 2,
      verse: 6,
      author: 'Tried By Fire',
      authorHandle: '@TriedByFire',
      profileImageUrl: undefined,
      text: `Take this into consideration when thinking about the creation of all things. We know that God created light. He creates the sun, moon, and stars. He creates fish, birds, and animals. He creates plant life, trees, and dry ground. He creates a sky that's made out of the water of the Earth. But what's it all for? Is it for Him to find a place to dwell? Is it an experiment for Him to see how life can grow and be without Him? No. All the things we see that are created were created with US in mind! He created all things for His pleasure, sure, but they were all created so we can have dominion and rule over them. He created US to be like Him in character, and to love life and love creation. These things exist for man! And that is where the Lord is leading us in the remainder of this book.`,
      likes: 0,
      isLikedByUser: false,
      isBookmarkedByUser: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'genesis_2_6_para2',
      book: 'Genesis',
      chapter: 2,
      verse: 6,
      author: 'Tried By Fire',
      authorHandle: '@TriedByFire',
      profileImageUrl: undefined,
      text: `The whole rest of the Bible, from this point forward, focuses on man. It will focus on the creation that was built around him, and for him, and then it will focus on the fall and sin of man, all leading to the redemption of man. The ultimate purpose of this story is to show God's constant grace and mercy towards a people who is constantly working against Him.`,
      likes: 0,
      isLikedByUser: false,
      isBookmarkedByUser: false,
      createdAt: new Date().toISOString(),
    },
  ],
  'genesis_2_7': [
    {
      id: 'genesis_2_7_para1',
      book: 'Genesis',
      chapter: 2,
      verse: 7,
      author: 'Tried By Fire',
      authorHandle: '@TriedByFire',
      profileImageUrl: undefined,
      text: `I LOVE this particular verse. There's so much source here that we could dive into. Firstly, evolutionists claim we come from stardust. We certainly come from dust, but it's not the dust they think it is. Honestly, if we were to take the idea that we are made from dust (not even dirt specifically, but the "dust" of the ground, which means we are made of just the leftover residue of falling particles) then we amount to nothing more than "space dust," or leftover space residue. But God took that dust, molded it into a human being, and breathed literal LIFE into it, and man became a living soul.`,
      likes: 0,
      isLikedByUser: false,
      isBookmarkedByUser: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'genesis_2_7_para2',
      book: 'Genesis',
      chapter: 2,
      verse: 7,
      author: 'Tried By Fire',
      authorHandle: '@TriedByFire',
      profileImageUrl: undefined,
      text: `What's even more fascinating to me, is if we did an exam of our bodies to see what we were truly made out of, even today throughout generations since Genesis started, we would find these elements (the four main elements) are: Oxygen, Carbon, Hydrogen, and Nitrogen. We also consist of smaller amounts of calcium, phosphorus, potassium, sodium, chlorine, magnesium, sulfur, and a few others. These are all elements that are literally found in the ground. With inflation, we are probably worth around the range of $8.50. My math is not precise, and I don't want to pretend it is, but doing some basic addition and division, I was able to divide the cost per element into one percentage, and then add them together into total cost per percentage, and it rounds to about that much.`,
      likes: 0,
      isLikedByUser: false,
      isBookmarkedByUser: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'genesis_2_7_para3',
      book: 'Genesis',
      chapter: 2,
      verse: 7,
      author: 'Tried By Fire',
      authorHandle: '@TriedByFire',
      profileImageUrl: undefined,
      text: `Though, there are a lot of these elements that are worth more today, like Oxygen. With insurance, it would cost about $35 for a tank of oxygen. An oxygen TANK is worth more than a human's body... That's getting away from the overall purpose of this passage, however. It's not about the value we are on the outside, because we obviously aren't worth much. God puts extreme value on the "living soul" that He breathed into man. It's the life that has real value. This is why it's integral that Jesus died on the cross. He gave His life for mine, because my life (given by God) has the most value. It is worth more than all the elements this world can muster up.`,
      likes: 0,
      isLikedByUser: false,
      isBookmarkedByUser: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'genesis_2_7_para4',
      book: 'Genesis',
      chapter: 2,
      verse: 7,
      author: 'Tried By Fire',
      authorHandle: '@TriedByFire',
      profileImageUrl: undefined,
      text: `God could have made us with gold dust, or the dust of the finest diamonds. He could have given our physical bodies real value, and it still wouldn't have been nearly as valuable as the soul He has placed into each and every one of us.`,
      likes: 0,
      isLikedByUser: false,
      isBookmarkedByUser: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'genesis_2_7_para5',
      book: 'Genesis',
      chapter: 2,
      verse: 7,
      author: 'Tried By Fire',
      authorHandle: '@TriedByFire',
      profileImageUrl: undefined,
      text: `"For the life of the flesh is in the blood: and I have given it to you upon the altar to make an atonement for your souls: for it is the blood that maketh an atonement for the soul." Leviticus 17:11`,
      likes: 0,
      isLikedByUser: false,
      isBookmarkedByUser: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'genesis_2_7_para6',
      book: 'Genesis',
      chapter: 2,
      verse: 7,
      author: 'Tried By Fire',
      authorHandle: '@TriedByFire',
      profileImageUrl: undefined,
      text: `When Jesus shed His blood for us on the cross, He was not only demonstrating the value of our lives over His, but also demonstrating the real importance that God has placed on each and every one of us to live FOR Him. A living soul is worth an eternal value (or an everlasting, never-ending value). A body is only worth a few dollars. Even our caskets will be worth more than our physical bodies. This is why we must find the necessity to increase our knowledge of eternity, because that's where the real value is placed. He could have just told us to breathe, but rather He breathed His own life into us. It's His breath that we breathe, and that's why it's so valuable. We have the breath of God in our living souls, and when we accept Christ, He breathes new life into us again.`,
      likes: 0,
      isLikedByUser: false,
      isBookmarkedByUser: false,
      createdAt: new Date().toISOString(),
    },
  ],
  'genesis_2_8': [
    {
      id: 'genesis_2_8_para1',
      book: 'Genesis',
      chapter: 2,
      verse: 8,
      author: 'Tried By Fire',
      authorHandle: '@TriedByFire',
      profileImageUrl: undefined,
      text: `The Garden of Eden, at this point, was the center of the Earth. Where that is, scholars disagree. I like this idea from one scholar saying that it could have been in the Tigris-Euphrates valley, and they come off of that conclusion because of some of the locational language that is used here (which we will see in a moment), and because it is known as the "Fertile Crescent." Apparently, the land was so fertile (and still is) to the point that people wouldn't even plant their own grain there; they simply just harvested it because it grew by itself! That's pretty miraculous! Of course, once we see the fall of man, this garden disappears, and access to it is cut off. A good belief is that it now dwells with the Lord until the time of the New Jerusalem. More on that later.`,
      likes: 0,
      isLikedByUser: false,
      isBookmarkedByUser: false,
      createdAt: new Date().toISOString(),
    },
  ],
  'genesis_2_9': [
    {
      id: 'genesis_2_9_para1',
      book: 'Genesis',
      chapter: 2,
      verse: 9,
      author: 'Tried By Fire',
      authorHandle: '@TriedByFire',
      profileImageUrl: undefined,
      text: `This is when we are first introduced to the tree of life. This same tree is found in the New Jerusalem. The tree of the knowledge of good and evil seems to disappear forever. It seemed to have served its purpose, but I'm getting ahead of myself. What I find interesting in this verse is that ALL the trees were "pleasant to the sight." There wasn't a single tree that looked bad to eat from. Honestly, Adam and Eve should have been content with the fruit they knew they could eat... but they weren't...`,
      likes: 0,
      isLikedByUser: false,
      isBookmarkedByUser: false,
      createdAt: new Date().toISOString(),
    },
  ],
  'genesis_2_14': [
    {
      id: 'genesis_2_14_para1',
      book: 'Genesis',
      chapter: 2,
      verse: 14,
      author: 'Tried By Fire',
      authorHandle: '@TriedByFire',
      profileImageUrl: undefined,
      text: `The river in Ethiopia would be the Nile, and the Hiddekel would be the Tigris, which is where the assumption that this garden was in the Tigris-Euphrates valley.`,
      likes: 0,
      isLikedByUser: false,
      isBookmarkedByUser: false,
      createdAt: new Date().toISOString(),
    },
  ],
  'genesis_2_15': [
    {
      id: 'genesis_2_15_para1',
      book: 'Genesis',
      chapter: 2,
      verse: 15,
      author: 'Tried By Fire',
      authorHandle: '@TriedByFire',
      profileImageUrl: undefined,
      text: `Man had the good life. He was not to grow the garden. He was not to work the garden, though his job was still to work in "dressing and keeping" the garden clean and tidy. It, honestly, was a simple job. There was no back aching, no leg cramping, no physical exertions yet. The first job on Earth was tending to a garden. This is a very important symbol of what the Lord will be doing for the rest of time. WE (that is, saved Christians) are a part of the Lord's garden. He will always be working on us, and He will give reminders of that throughout the rest of Scripture. Everything was quite simple, and man was good for the work, knowing it was pleasing to God, and God only gave him one rule:`,
      likes: 0,
      isLikedByUser: false,
      isBookmarkedByUser: false,
      createdAt: new Date().toISOString(),
    },
  ],
  'genesis_2_17': [
    {
      id: 'genesis_2_17_para1',
      book: 'Genesis',
      chapter: 2,
      verse: 17,
      author: 'Tried By Fire',
      authorHandle: '@TriedByFire',
      profileImageUrl: undefined,
      text: `This tree of "the knowledge of good and evil" was only there for this one particular purpose. All we knew was good. We knew God, and God created everything good, but we didn't understand what evil even meant. Adam didn't really care to know, honestly. He was "commanded" to stay away from that one fruit. Maybe there was something in the back of his mind that wondered, "Why did God put it in the garden then if He doesn't want me to eat from it? What is its purpose?" The purpose has yet to be revealed, and I won't jump the gun quite yet.`,
      likes: 0,
      isLikedByUser: false,
      isBookmarkedByUser: false,
      createdAt: new Date().toISOString(),
    },
  ],
  'genesis_2_18': [
    {
      id: 'genesis_2_18_para1',
      book: 'Genesis',
      chapter: 2,
      verse: 18,
      author: 'Tried By Fire',
      authorHandle: '@TriedByFire',
      profileImageUrl: undefined,
      text: `This is our first "not good" sentence from the Lord. Everything was good up until this point. God didn't want man to be alone. But God also knew that the creation of woman would ultimately lead to mankind's downfall. Not because women, in themselves, are inherently bad (as we are all sinners, for man took a bite of the fruit as well), but because He knew that she would be enticed easily. But Adam, himself, didn't even know that it wasn't good for him to be alone. He was just taking God's word for it. That's how much trust man had in God in the beginning. No matter what God said, even if we didn't know the full nature of it, it must be absolutely true. If only we were this trusting in the Lord today.`,
      likes: 0,
      isLikedByUser: false,
      isBookmarkedByUser: false,
      createdAt: new Date().toISOString(),
    },
  ],
  'genesis_2_20': [
    {
      id: 'genesis_2_20_para1',
      book: 'Genesis',
      chapter: 2,
      verse: 20,
      author: 'Tried By Fire',
      authorHandle: '@TriedByFire',
      profileImageUrl: undefined,
      text: `Adam must have thought that the animals were there to keep him company, but none of them seemed right to help him in his life. God already knew that Adam wouldn't find the right helper there. It was Adam that took it upon himself to try and find a helper from God's current creation. God needed to form a helper that would be closer related to Adam. Male birds had female birds. Male animals had female animals. Male fish had female fish. Male plants had female plants. Male humans had... well, they didn't have anything, yet. But God was planning that.`,
      likes: 0,
      isLikedByUser: false,
      isBookmarkedByUser: false,
      createdAt: new Date().toISOString(),
    },
  ],
  'genesis_2_22': [
    {
      id: 'genesis_2_22_para1',
      book: 'Genesis',
      chapter: 2,
      verse: 22,
      author: 'Tried By Fire',
      authorHandle: '@TriedByFire',
      profileImageUrl: undefined,
      text: `We understand that woman was taken from man. She is equal with man because of that purpose. The perfection of man was now the perfection of woman! What is still a mystery to me is why God would wait to make woman? Maybe He knew that she would take the fruit from the tree and would eat from it, and there would be a disconnect, so He tried to prolong it. But even the snake (which will be the one that causes the temptation to begin with) had a specific timing that God prepared for. Maybe God needed the rest of creation to have names before creating woman? But Adam still could have named the animals while Eve was there.`,
      likes: 0,
      isLikedByUser: false,
      isBookmarkedByUser: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'genesis_2_22_para2',
      book: 'Genesis',
      chapter: 2,
      verse: 22,
      author: 'Tried By Fire',
      authorHandle: '@TriedByFire',
      profileImageUrl: undefined,
      text: `I do find it interesting, though, that God says, "it's not good for man to be alone" when man was not alone. Man had God. God knew something that man didn't, I believe that is likely the reason why He is creating woman here. He is anticipating that the man will be alone soon. However, it's the creation of woman that forces man to disconnect from God. That's a spoiler though. I suppose we won't ever fully know, but God certainly had a plan for this the whole time, and nothing is ever off timing with the Lord. There were some things that needed to be worked out with Adam, perhaps, before he could really appreciate having a helper in his life. Woman is the other half of man.`,
      likes: 0,
      isLikedByUser: false,
      isBookmarkedByUser: false,
      createdAt: new Date().toISOString(),
    },
  ],
  'genesis_2_23': [
    {
      id: 'genesis_2_23_para1',
      book: 'Genesis',
      chapter: 2,
      verse: 23,
      author: 'Tried By Fire',
      authorHandle: '@TriedByFire',
      profileImageUrl: undefined,
      text: `The Hebrew word for "man" is "ish," and the Hebrew word for "woman" is "ishshah." In the Hebrew tongue, it is almost as if the word "ish" isn't quite complete. The "shah" part is what completes the word, and it's woman that completes man.`,
      likes: 0,
      isLikedByUser: false,
      isBookmarkedByUser: false,
      createdAt: new Date().toISOString(),
    },
  ],
  'genesis_2_24': [
    {
      id: 'genesis_2_24_para1',
      book: 'Genesis',
      chapter: 2,
      verse: 24,
      author: 'Tried By Fire',
      authorHandle: '@TriedByFire',
      profileImageUrl: undefined,
      text: `This is an indication that the man is now responsible for the woman, and is not dictated on how to treat his marriage or his life based on control or concepts from his father and mother.`,
      likes: 0,
      isLikedByUser: false,
      isBookmarkedByUser: false,
      createdAt: new Date().toISOString(),
    },
  ],
  'genesis_2_25': [
    {
      id: 'genesis_2_25_para1',
      book: 'Genesis',
      chapter: 2,
      verse: 25,
      author: 'Tried By Fire',
      authorHandle: '@TriedByFire',
      profileImageUrl: undefined,
      text: `To completely throw off the whole concept of superiority in culture today (race, gender, "science," and many more...) marriage was meant for man and woman for a reason, and it's the most beautiful picture of oneness and uniqueness ever created. God created this with the intention and image of unity with His church, which will be displayed through the life and death of Jesus Christ. Right here (in the book of Genesis) is the first time someone is giving His life for the sake of others. It's the first time true love is shown, and it's the first time that unity is displayed without a fork or wrench thrown into the picture to get them off track. But of course... this won't last forever.`,
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
