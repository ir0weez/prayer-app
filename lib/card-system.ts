export type CardRarity = "common" | "rare" | "epic" | "legendary";
export type CardType = "Faith" | "Prayer" | "Endurance" | "Worship" | "Courage";

export type CardMove = {
  name: string;
  damage: number;
  effect?: string;
  cost: number;
};

export type PrayerCard = {
  id: string;
  achievementId: string;
  name: string;
  subtitle: string;
  rarity: CardRarity;
  type: CardType;
  hp: number;
  moves: [CardMove, CardMove];
  flavor: string;
  scripture: string;
  art: any;
};

export const CARD_RARITY_HP: Record<CardRarity, number> = {
  common: 60,
  rare: 90,
  epic: 130,
  legendary: 180,
};

export const PRAYER_CARDS: PrayerCard[] = [
  {
    id: "daniels-courage",
    achievementId: "first-task",
    name: "Daniel's Courage",
    subtitle: "First Task",
    rarity: "common",
    type: "Courage",
    hp: 60,
    moves: [
      { name: "Fervent Prayer", damage: 20, cost: 1 },
      { name: "Lion's Den", damage: 50, effect: "Your opponent's next attack does nothing.", cost: 3 },
    ],
    flavor: "He knelt and prayed, and the lions slept.",
    scripture: "Daniel 6:22",
    art: require("@/assets/cards/card-daniels-courage.webp"),
  },
  {
    id: "davids-song",
    achievementId: "curator",
    name: "David's Song",
    subtitle: "Curator",
    rarity: "common",
    type: "Worship",
    hp: 60,
    moves: [
      { name: "Harp Strings", damage: 20, cost: 1 },
      { name: "Psalm of Ascent", damage: 40, effect: "Heal 20 damage from this card.", cost: 2 },
    ],
    flavor: "He sang to the Lord under a sky full of stars.",
    scripture: "Psalm 8:3",
    art: require("@/assets/cards/card-davids-song.webp"),
  },
  {
    id: "three-in-one",
    achievementId: "full-set",
    name: "Three in One",
    subtitle: "Full Set",
    rarity: "common",
    type: "Faith",
    hp: 60,
    moves: [
      { name: "Unified Light", damage: 20, cost: 1 },
      { name: "Triune Radiance", damage: 60, effect: "This attack hits for 20 more for each of your benched cards.", cost: 3 },
    ],
    flavor: "Three streams, one river of light.",
    scripture: "Matthew 28:19",
    art: require("@/assets/cards/card-three-in-one.webp"),
  },
  {
    id: "samsons-torch",
    achievementId: "streak-7",
    name: "Samson's Torch",
    subtitle: "7-Day Streak",
    rarity: "rare",
    type: "Courage",
    hp: 90,
    moves: [
      { name: "Kindled Flame", damage: 30, cost: 1 },
      { name: "Field of Fire", damage: 70, effect: "Discard an energy from your opponent's active card.", cost: 3 },
    ],
    flavor: "Three hundred torches lit the night.",
    scripture: "Judges 15:5",
    art: require("@/assets/cards/card-samsons-torch.webp"),
  },
  {
    id: "pilgrims-path",
    achievementId: "fast-7",
    name: "Pilgrim's Path",
    subtitle: "7-Day Fast",
    rarity: "rare",
    type: "Endurance",
    hp: 90,
    moves: [
      { name: "Steady Steps", damage: 30, cost: 1 },
      { name: "Promised Horizon", damage: 60, effect: "Draw 2 cards.", cost: 2 },
    ],
    flavor: "He walked by faith toward a city he could not yet see.",
    scripture: "Hebrews 11:10",
    art: require("@/assets/cards/card-pilgrims-path.webp"),
  },
  {
    id: "eagles-wings",
    achievementId: "streak-21",
    name: "On Eagles' Wings",
    subtitle: "21-Day Streak",
    rarity: "rare",
    type: "Faith",
    hp: 90,
    moves: [
      { name: "Soaring Ascent", damage: 30, cost: 1 },
      { name: "Borne Aloft", damage: 80, effect: "This card takes 30 less damage next turn.", cost: 3 },
    ],
    flavor: "You will soar on wings like eagles.",
    scripture: "Isaiah 40:31",
    art: require("@/assets/cards/card-eagles-wings.webp"),
  },
  {
    id: "olive-branch",
    achievementId: "fast-21",
    name: "The Olive Branch",
    subtitle: "21-Day Fast",
    rarity: "rare",
    type: "Prayer",
    hp: 90,
    moves: [
      { name: "Gentle Return", damage: 30, cost: 1 },
      { name: "Waters Recede", damage: 60, effect: "Heal all damage from one of your benched cards.", cost: 2 },
    ],
    flavor: "The dove returned, and hope came with it.",
    scripture: "Genesis 8:11",
    art: require("@/assets/cards/card-olive-branch.webp"),
  },
  {
    id: "bread-from-heaven",
    achievementId: "fast-40",
    name: "Bread from Heaven",
    subtitle: "40-Day Fast",
    rarity: "epic",
    type: "Endurance",
    hp: 130,
    moves: [
      { name: "Morning Manna", damage: 40, cost: 2 },
      { name: "Heaven's Provision", damage: 90, effect: "Heal 40 damage from this card.", cost: 3 },
    ],
    flavor: "Every morning, grace fell like dew.",
    scripture: "Exodus 16:15",
    art: require("@/assets/cards/card-bread-from-heaven.webp"),
  },
  {
    id: "holy-ground",
    achievementId: "streak-50",
    name: "Holy Ground",
    subtitle: "50-Day Streak",
    rarity: "epic",
    type: "Faith",
    hp: 130,
    moves: [
      { name: "Burning Light", damage: 40, cost: 2 },
      { name: "Remove Your Sandals", damage: 100, effect: "Your opponent's active card cannot retreat next turn.", cost: 4 },
    ],
    flavor: "The bush burned, and was not consumed.",
    scripture: "Exodus 3:5",
    art: require("@/assets/cards/card-holy-ground.webp"),
  },
  {
    id: "full-armor",
    achievementId: "fast-100",
    name: "The Full Armor",
    subtitle: "100-Day Fast",
    rarity: "legendary",
    type: "Courage",
    hp: 180,
    moves: [
      { name: "Shield of Faith", damage: 50, effect: "Prevent 30 damage to this card next turn.", cost: 2 },
      { name: "Sword of the Spirit", damage: 140, cost: 4 },
    ],
    flavor: "Stand firm, fully armed in light.",
    scripture: "Ephesians 6:13",
    art: require("@/assets/cards/card-full-armor.webp"),
  },
  {
    id: "night-watch",
    achievementId: "streak-100",
    name: "The Night Watch",
    subtitle: "100-Day Streak",
    rarity: "legendary",
    type: "Prayer",
    hp: 180,
    moves: [
      { name: "Vigil", damage: 50, cost: 2 },
      { name: "Heavens Declare", damage: 120, effect: "Your opponent reveals their hand. Choose a card; they shuffle it into their deck.", cost: 4 },
    ],
    flavor: "I watch through the night, and the stars preach.",
    scripture: "Psalm 19:1",
    art: require("@/assets/cards/card-night-watch.webp"),
  },
  {
    id: "gethsemane",
    achievementId: "fast-365",
    name: "Gethsemane",
    subtitle: "365-Day Fast",
    rarity: "legendary",
    type: "Prayer",
    hp: 180,
    moves: [
      { name: "Not My Will", damage: 60, effect: "Heal 30 damage from this card.", cost: 2 },
      { name: "The Cup", damage: 180, effect: "This card takes 50 damage to itself.", cost: 5 },
    ],
    flavor: "He prayed more earnestly, and surrendered everything.",
    scripture: "Luke 22:42",
    art: require("@/assets/cards/card-gethsemane.webp"),
  },
  // --- 5-day milestone cards: Streak track ---
  {
    id: "upper-room",
    achievementId: "streak-5",
    name: "Upper Room",
    subtitle: "5-Day Streak",
    rarity: "common",
    type: "Prayer",
    hp: 60,
    moves: [
      { name: "United Prayer", damage: 20, cost: 1 },
      { name: "One Accord", damage: 40, cost: 2 },
    ],
    flavor: "They continued with one accord in prayer.",
    scripture: "Acts 1:14",
    art: require("@/assets/cards/card-upper-room.webp"),
  },
  {
    id: "carmels-fire",
    achievementId: "streak-10",
    name: "Carmel's Fire",
    subtitle: "10-Day Streak",
    rarity: "common",
    type: "Faith",
    hp: 60,
    moves: [
      { name: "Fervent Prayer", damage: 20, cost: 1 },
      { name: "Fire Falls", damage: 50, cost: 3 },
    ],
    flavor: "The fire of the Lord fell and consumed everything.",
    scripture: "1 Kings 18:38",
    art: require("@/assets/cards/card-carmels-fire.webp"),
  },
  {
    id: "nehemiahs-watch",
    achievementId: "streak-15",
    name: "Nehemiah's Watch",
    subtitle: "15-Day Streak",
    rarity: "rare",
    type: "Prayer",
    hp: 90,
    moves: [
      { name: "Night Watch", damage: 30, cost: 2 },
      { name: "Rebuild", damage: 60, cost: 3 },
    ],
    flavor: "He prayed to the God of heaven, then he rebuilt.",
    scripture: "Nehemiah 2:4",
    art: require("@/assets/cards/card-nehemiahs-watch.webp"),
  },
  {
    id: "midnight-hymn",
    achievementId: "streak-20",
    name: "Midnight Hymn",
    subtitle: "20-Day Streak",
    rarity: "rare",
    type: "Worship",
    hp: 90,
    moves: [
      { name: "Prison Praise", damage: 30, cost: 2 },
      { name: "Chains Break", damage: 70, cost: 3 },
    ],
    flavor: "At midnight they prayed and sang praises.",
    scripture: "Acts 16:25",
    art: require("@/assets/cards/card-midnight-hymn.webp"),
  },
  {
    id: "wilderness-prayer",
    achievementId: "streak-25",
    name: "Wilderness Prayer",
    subtitle: "25-Day Streak",
    rarity: "rare",
    type: "Prayer",
    hp: 90,
    moves: [
      { name: "Solitary Place", damage: 30, cost: 2 },
      { name: "Dawn Seeking", damage: 70, cost: 3 },
    ],
    flavor: "He withdrew to the wilderness and prayed.",
    scripture: "Luke 5:16",
    art: require("@/assets/cards/card-wilderness-prayer.webp"),
  },
  {
    id: "lords-prayer",
    achievementId: "streak-30",
    name: "The Lord's Prayer",
    subtitle: "30-Day Streak",
    rarity: "epic",
    type: "Prayer",
    hp: 130,
    moves: [
      { name: "Daily Bread", damage: 40, cost: 2 },
      { name: "Thy Kingdom", damage: 90, cost: 4 },
    ],
    flavor: "He taught them how to pray, and heaven listened.",
    scripture: "Matthew 6:9",
    art: require("@/assets/cards/card-lords-prayer.webp"),
  },
  {
    id: "cloud-witnesses",
    achievementId: "streak-75",
    name: "Cloud of Witnesses",
    subtitle: "75-Day Streak",
    rarity: "epic",
    type: "Endurance",
    hp: 130,
    moves: [
      { name: "Run the Race", damage: 40, cost: 2 },
      { name: "Great Cloud", damage: 100, cost: 4 },
    ],
    flavor: "Surrounded by witnesses, run with endurance.",
    scripture: "Hebrews 12:1",
    art: require("@/assets/cards/card-cloud-witnesses.webp"),
  },
  // --- 5-day milestone cards: Fast track ---
  {
    id: "esthers-courage",
    achievementId: "fast-5",
    name: "Esther's Courage",
    subtitle: "5-Day Fast",
    rarity: "common",
    type: "Courage",
    hp: 60,
    moves: [
      { name: "Three-Day Fast", damage: 20, cost: 1 },
      { name: "If I Perish", damage: 50, cost: 3 },
    ],
    flavor: "She fasted three days, then approached the king.",
    scripture: "Esther 4:16",
    art: require("@/assets/cards/card-esthers-courage.webp"),
  },
  {
    id: "daniels-resolve",
    achievementId: "fast-10",
    name: "Daniel's Resolve",
    subtitle: "10-Day Fast",
    rarity: "common",
    type: "Endurance",
    hp: 60,
    moves: [
      { name: "Simple Fare", damage: 20, cost: 1 },
      { name: "Purposed Heart", damage: 50, cost: 3 },
    ],
    flavor: "He purposed in his heart not to defile himself.",
    scripture: "Daniel 1:8",
    art: require("@/assets/cards/card-daniels-resolve.webp"),
  },
  {
    id: "ninevehs-mercy",
    achievementId: "fast-15",
    name: "Nineveh's Mercy",
    subtitle: "15-Day Fast",
    rarity: "rare",
    type: "Faith",
    hp: 90,
    moves: [
      { name: "Sackcloth", damage: 30, cost: 2 },
      { name: "God Relents", damage: 60, cost: 3 },
    ],
    flavor: "They fasted, and God saw their works.",
    scripture: "Jonah 3:10",
    art: require("@/assets/cards/card-ninevehs-mercy.webp"),
  },
  {
    id: "elijahs-strength",
    achievementId: "fast-20",
    name: "Elijah's Strength",
    subtitle: "20-Day Fast",
    rarity: "rare",
    type: "Endurance",
    hp: 90,
    moves: [
      { name: "Angel's Bread", damage: 30, cost: 2 },
      { name: "Forty Days", damage: 70, cost: 3 },
    ],
    flavor: "He went in the strength of that food forty days.",
    scripture: "1 Kings 19:8",
    art: require("@/assets/cards/card-elijahs-strength.webp"),
  },
  {
    id: "sinais-glory",
    achievementId: "fast-25",
    name: "Sinai's Glory",
    subtitle: "25-Day Fast",
    rarity: "rare",
    type: "Worship",
    hp: 90,
    moves: [
      { name: "Shining Face", damage: 30, cost: 2 },
      { name: "Tablets", damage: 70, cost: 3 },
    ],
    flavor: "His face shone from being with God.",
    scripture: "Exodus 34:29",
    art: require("@/assets/cards/card-sinais-glory.webp"),
  },
  {
    id: "temptations-end",
    achievementId: "fast-30",
    name: "Temptation's End",
    subtitle: "30-Day Fast",
    rarity: "epic",
    type: "Endurance",
    hp: 130,
    moves: [
      { name: "It Is Written", damage: 40, cost: 2 },
      { name: "Angels Minister", damage: 90, cost: 4 },
    ],
    flavor: "He was tempted, He overcame, angels came.",
    scripture: "Matthew 4:11",
    art: require("@/assets/cards/card-temptations-end.webp"),
  },
  {
    id: "intercession",
    achievementId: "fast-60",
    name: "Intercession",
    subtitle: "60-Day Fast",
    rarity: "epic",
    type: "Prayer",
    hp: 130,
    moves: [
      { name: "Arms Raised", damage: 40, cost: 2 },
      { name: "Prevailing", damage: 100, cost: 4 },
    ],
    flavor: "His hands held up until the battle was won.",
    scripture: "Exodus 17:12",
    art: require("@/assets/cards/card-intercession.webp"),
  },
];

export function getCardByAchievementId(achievementId: string): PrayerCard | undefined {
  return PRAYER_CARDS.find((card) => card.achievementId === achievementId);
}

export function getCardById(id: string): PrayerCard | undefined {
  return PRAYER_CARDS.find((card) => card.id === id);
}

export const RARITY_LABELS: Record<CardRarity, string> = {
  common: "Common",
  rare: "Rare",
  epic: "Epic",
  legendary: "Legendary",
};

export const RARITY_COLORS: Record<CardRarity, string> = {
  common: "#9E9E9E",
  rare: "#3B82F6",
  epic: "#8B5CF6",
  legendary: "#F59E0B",
};
