export type FastTriviaQuestion = {
  question: string;
  options: string[];
  /** Index into options. */
  answer: number;
};

/** General Bible trivia for fasting board trivia spaces. */
export const FAST_TRIVIA_QUESTIONS: FastTriviaQuestion[] = [
  { question: "How many days did Jesus fast in the wilderness?", options: ["7", "21", "40", "12"], answer: 2 },
  { question: "Who interpreted Pharaoh's dreams after fasting and praying?", options: ["Moses", "Joseph", "Daniel", "Elijah"], answer: 1 },
  { question: "Which queen called a fast before approaching the king?", options: ["Ruth", "Esther", "Deborah", "Hannah"], answer: 1 },
  { question: "On which mountain did Moses fast 40 days and nights?", options: ["Carmel", "Sinai", "Zion", "Olivet"], answer: 1 },
  { question: "Who fasted while praying for his sick child?", options: ["David", "Solomon", "Hezekiah", "Josiah"], answer: 0 },
  { question: "What did Jesus say some breakthroughs only come by?", options: ["Fasting and prayer", "Alms and tithes", "Vows and oaths", "Pilgrimage"], answer: 0 },
  { question: "Which prophet was fed by ravens during a famine?", options: ["Elisha", "Isaiah", "Elijah", "Jeremiah"], answer: 2 },
  { question: "How many books are in the Bible?", options: ["60", "66", "72", "70"], answer: 1 },
  { question: "Who led Israel across the Jordan after Moses?", options: ["Caleb", "Joshua", "Gideon", "Othniel"], answer: 1 },
  { question: "Which disciple walked on water with Jesus?", options: ["John", "Peter", "Thomas", "Andrew"], answer: 1 },
  { question: "What was Paul's name before his conversion?", options: ["Silas", "Barnabas", "Saul", "Titus"], answer: 2 },
  { question: "Which city did Jonah warn of judgment?", options: ["Tarshish", "Nineveh", "Joppa", "Antioch"], answer: 1 },
  { question: "Who was sold into slavery by his brothers?", options: ["Benjamin", "Joseph", "Judah", "Reuben"], answer: 1 },
  { question: "What did David use to defeat Goliath?", options: ["Sword", "Spear", "Sling and stone", "Bow"], answer: 2 },
  { question: "Which woman judged Israel and led an army?", options: ["Jael", "Deborah", "Miriam", "Abigail"], answer: 1 },
  { question: "How many days did God take to create the world?", options: ["7", "6", "3", "40"], answer: 1 },
  { question: "Who built the ark?", options: ["Shem", "Noah", "Enoch", "Methuselah"], answer: 1 },
  { question: "Which king wrote most of the Proverbs?", options: ["David", "Solomon", "Rehoboam", "Asa"], answer: 1 },
  { question: "What river was Naaman told to wash in?", options: ["Nile", "Euphrates", "Jordan", "Tigris"], answer: 2 },
  { question: "Who was the first martyr of the church?", options: ["James", "Stephen", "Barnabas", "Philip"], answer: 1 },
  { question: "Which epistle is known as the letter of joy?", options: ["Ephesians", "Philippians", "Colossians", "Galatians"], answer: 1 },
  { question: "Who fasted 21 days seeking understanding from God?", options: ["Daniel", "Ezra", "Nehemiah", "Zechariah"], answer: 0 },
];
