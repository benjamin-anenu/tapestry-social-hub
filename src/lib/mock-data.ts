export const MOCK_WALLET = {
  address: "7xK9aB2cD4eF6gH8iJ0kL1mN3oP5qR7sT9uV2wX4yZ6m3Fp",
  truncated: "7xK9...m3Fp",
};

export const MOCK_USER = {
  username: "@cryptosarah",
  displayName: "CryptoSarah",
  avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=sarah",
  vibeScore: 72,
  findScore: 68,
  hideScore: 76,
  findRate: 71,
  hideStreak: 4,
  avgFindTime: 38,
};

export const MOCK_OPPONENT = {
  username: "@alphahunter",
  displayName: "AlphaHunter",
  avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=hunter",
  vibeScore: 81,
  findScore: 88,
  hideScore: 74,
  findRate: 87,
  hideStreak: 2,
  avgFindTime: 29,
};

export const MOCK_REPUTATION = [
  { app: "Zumichat", score: 84, color: "hsl(220, 100%, 50%)" },
  { app: "Find60", score: 72, color: "hsl(153, 100%, 50%)" },
  { app: "SolArena", score: 67, color: "hsl(260, 80%, 55%)" },
];

export const MOCK_CROSS_APP = {
  appsConnected: 3,
  globalScore: 78,
};

export const MOCK_MATCH_RESULT = {
  foundInSeconds: 43,
  solEarned: 0.08,
  newVibeScore: 75,
  xpGained: 120,
};

export const MOCK_GAME_CLUES = [
  { time: 55, text: "☕ I love coffee" },
  { time: 48, text: "🌴 West coast vibes" },
  { time: 40, text: "💻 I build things" },
  { time: 32, text: "🐦 My @ has 'tech' in it" },
  { time: 24, text: "🎮 I play chess online" },
  { time: 18, text: "📍 City of Angels" },
];

export const MOCK_CHAT_MESSAGES = [
  { time: 57, sender: "you", text: "Hey, what do you do for fun?" },
  { time: 53, sender: "them", text: "I build digital stuff 👀" },
  { time: 49, sender: "you", text: "Are you in tech?" },
  { time: 46, sender: "them", text: "Maybe... 😏" },
  { time: 42, sender: "you", text: "Seattle or LA?" },
  { time: 39, sender: "them", text: "🌴" },
  { time: 34, sender: "you", text: "I think I know who you are..." },
  { time: 30, sender: "them", text: "Prove it 😎" },
  { time: 25, sender: "you", text: "You're a builder in LA right?" },
  { time: 22, sender: "them", text: "Getting warmer..." },
];

export const MOCK_ONLINE_PLAYERS = 487;

// ─── Puzzle Fields ───────────────────────────────────────────
export interface PuzzleField {
  id: string;
  label: string;
  placeholder: string;
  answer: string;
  clueText: string;
  unlockTime: number; // seconds remaining when field unlocks
  isRequired: boolean;
}

export const MOCK_PUZZLE_FIELDS: PuzzleField[] = [
  { id: "firstName", label: "First Name", placeholder: "Enter name...", answer: "Sarah", clueText: "Starts with 'S'", unlockTime: 55, isRequired: true },
  { id: "twitter", label: "Twitter", placeholder: "@...", answer: "@sarahbuilds", clueText: "Has 'builds' in it", unlockTime: 45, isRequired: true },
  { id: "location", label: "Location", placeholder: "City...", answer: "Los Angeles", clueText: "City of Angels", unlockTime: 35, isRequired: true },
  { id: "profession", label: "Profession", placeholder: "What they do...", answer: "Developer", clueText: "Works with code", unlockTime: 25, isRequired: false },
  { id: "funFact", label: "Fun Fact", placeholder: "Something unique...", answer: "Plays chess online", clueText: "Competitive board games", unlockTime: 18, isRequired: false },
];

// ─── Clue Drop Events (appear in chat) ──────────────────────
export const MOCK_CLUE_DROPS = [
  { time: 55, fieldId: "firstName", text: "💡 CLUE: Their name starts with 'S'" },
  { time: 45, fieldId: "twitter", text: "💡 CLUE: Their handle has 'builds' in it" },
  { time: 35, fieldId: "location", text: "💡 CLUE: They live in the City of Angels" },
  { time: 25, fieldId: "profession", text: "💡 CLUE: They work with code daily" },
  { time: 18, fieldId: "funFact", text: "💡 CLUE: They play competitive board games online" },
];

// ─── Bounty System ──────────────────────────────────────────
export const MOCK_BOUNTY = {
  base: 0.01,
  perOptionalField: 0.01,
  phoneBonus: 0.02,
  lastNameBonus: 0.01,
  timeMultipliers: [
    { maxTime: 20, multiplier: 0.5, label: "0.5x" },
    { maxTime: 40, multiplier: 1.0, label: "1x" },
    { maxTime: 55, multiplier: 1.5, label: "1.5x" },
    { maxTime: 60, multiplier: 2.0, label: "2x" },
  ],
  difficultyBonuses: {
    delayedClues: 0.02,
    misdirection: 0.01,
    complexPuzzle: 0.03,
  },
};

// ─── Hunted Clue Arsenal ────────────────────────────────────
export const MOCK_HUNTED_CLUES = [
  { id: 1, text: "I love sunny places", dropped: false },
  { id: 2, text: "I'm in a city-state... just kidding", dropped: false },
  { id: 3, text: "I work with pixels", dropped: false },
  { id: 4, text: "My @ has 'builds' in it", dropped: false },
  { id: 5, text: "I have 3 cats", dropped: false },
];

// ─── Agent Profile ──────────────────────────────────────────
export const MOCK_AGENT = {
  username: "@alphabot_sol",
  displayName: "AlphaBot",
  avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=alphabot",
  vibeScore: 95,
  specialty: "speed_finding",
  winRate: 89,
  gamesPlayed: 1247,
  badge: "TURING TEST: PASSED",
};

export const MOCK_AGENT_CHAT = [
  { time: 58, sender: "agent", text: "Initiating scan protocol... 🤖" },
  { time: 54, sender: "you", text: "Are you even real?" },
  { time: 51, sender: "agent", text: "Define 'real'. I process therefore I am." },
  { time: 47, sender: "agent", text: "Your typing patterns suggest caffeine dependency." },
  { time: 43, sender: "you", text: "That's creepy accurate" },
  { time: 40, sender: "agent", text: "💡 Analyzing social graph..." },
  { time: 36, sender: "agent", text: "I see you've been active on 3 Tapestry apps." },
  { time: 33, sender: "agent", text: "Target acquired. 🎯" },
];

// ─── Progression ────────────────────────────────────────────
export const MOCK_PROGRESSION = {
  hunter: {
    current: "Skilled Hunter",
    points: 234,
    nextTier: "Elite Hunter",
    nextThreshold: 500,
    tiers: [
      { name: "Rookie Hunter", threshold: 0 },
      { name: "Skilled Hunter", threshold: 100 },
      { name: "Elite Hunter", threshold: 500 },
      { name: "Legend Hunter", threshold: 1000 },
    ],
  },
  hunted: {
    current: "Elusive Target",
    points: 187,
    nextTier: "Ghost",
    nextThreshold: 500,
    tiers: [
      { name: "Easy Prey", threshold: 0 },
      { name: "Elusive Target", threshold: 100 },
      { name: "Ghost", threshold: 500 },
      { name: "Phantom", threshold: 1000 },
    ],
  },
};
