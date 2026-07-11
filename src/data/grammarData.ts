// ============================================================
// Grammar Cricket — Grammar Data
// All grammar families, subjects, verbs, and sentence data
// Fully separated from game logic and animation
// ============================================================

export type GrammarFamily = 'A' | 'B' | 'C';
export type Difficulty = 'moderate' | 'difficult' | 'mixed';

export interface SubjectEntry {
  text: string;
  family: GrammarFamily;
  difficulty: 'moderate' | 'difficult';
  displayHint?: string; // For tricky subjects like "the box of footballs"
}

export interface VerbEntry {
  base: string;
  thirdPerson: string; // -s / -es / -ies form
  difficulty: 'moderate' | 'difficult';
}

export interface AdjEntry {
  text: string;
}

export interface PossessionEntry {
  text: string;
  plural?: boolean;
}

export interface ActionEndingEntry {
  text: string;
}

// ─────────────────────────────────────────────────────────────
// SUBJECTS
// ─────────────────────────────────────────────────────────────

export const SUBJECTS: SubjectEntry[] = [
  // Family A (I)
  { text: 'I', family: 'A', difficulty: 'moderate' },

  // Family B - Moderate (he, she, it, simple singular nouns)
  { text: 'He', family: 'B', difficulty: 'moderate' },
  { text: 'She', family: 'B', difficulty: 'moderate' },
  { text: 'It', family: 'B', difficulty: 'moderate' },
  { text: 'Riya', family: 'B', difficulty: 'moderate' },
  { text: 'Rahul', family: 'B', difficulty: 'moderate' },
  { text: 'The boy', family: 'B', difficulty: 'moderate' },
  { text: 'The girl', family: 'B', difficulty: 'moderate' },
  { text: 'My mother', family: 'B', difficulty: 'moderate' },
  { text: 'My father', family: 'B', difficulty: 'moderate' },
  { text: 'My sister', family: 'B', difficulty: 'moderate' },
  { text: 'My brother', family: 'B', difficulty: 'moderate' },
  { text: 'The cat', family: 'B', difficulty: 'moderate' },
  { text: 'The dog', family: 'B', difficulty: 'moderate' },
  { text: 'My friend', family: 'B', difficulty: 'moderate' },
  { text: 'The teacher', family: 'B', difficulty: 'moderate' },

  // Family B - Difficult (complex singular subjects)
  { text: 'The boy in the blue shirt', family: 'B', difficulty: 'difficult', displayHint: 'boy (singular)' },
  { text: 'My teacher', family: 'B', difficulty: 'difficult' },
  { text: 'Each child', family: 'B', difficulty: 'difficult', displayHint: '"Each" = singular' },
  { text: 'Every player', family: 'B', difficulty: 'difficult', displayHint: '"Every" = singular' },
  { text: 'The box of footballs', family: 'B', difficulty: 'difficult', displayHint: 'box (singular)' },
  { text: 'One of the boys', family: 'B', difficulty: 'difficult', displayHint: '"One" = singular' },
  { text: 'My brother and I', family: 'B', difficulty: 'difficult' },

  // Family C - Moderate (you, we, they, simple plural nouns)
  { text: 'You', family: 'C', difficulty: 'moderate' },
  { text: 'We', family: 'C', difficulty: 'moderate' },
  { text: 'They', family: 'C', difficulty: 'moderate' },
  { text: 'The boys', family: 'C', difficulty: 'moderate' },
  { text: 'The girls', family: 'C', difficulty: 'moderate' },
  { text: 'My parents', family: 'C', difficulty: 'moderate' },
  { text: 'The children', family: 'C', difficulty: 'moderate' },
  { text: 'My friends', family: 'C', difficulty: 'moderate' },
  { text: 'The dogs', family: 'C', difficulty: 'moderate' },

  // Family C - Difficult (compound and complex plural subjects)
  { text: 'Riya and Tina', family: 'C', difficulty: 'difficult', displayHint: 'two people = plural' },
  { text: 'Rahul and his friends', family: 'C', difficulty: 'difficult', displayHint: 'plural' },
  { text: 'The girls in our class', family: 'C', difficulty: 'difficult', displayHint: 'girls (plural)' },
  { text: 'My brother and sister', family: 'C', difficulty: 'difficult', displayHint: 'two people = plural' },
  { text: 'The children near the goal', family: 'C', difficulty: 'difficult', displayHint: 'children (plural)' },
  { text: 'The players from our school', family: 'C', difficulty: 'difficult', displayHint: 'players (plural)' },
];

// ─────────────────────────────────────────────────────────────
// VERBS
// ─────────────────────────────────────────────────────────────

export const VERBS: VerbEntry[] = [
  // Moderate - simple +s
  { base: 'play', thirdPerson: 'plays', difficulty: 'moderate' },
  { base: 'read', thirdPerson: 'reads', difficulty: 'moderate' },
  { base: 'write', thirdPerson: 'writes', difficulty: 'moderate' },
  { base: 'sing', thirdPerson: 'sings', difficulty: 'moderate' },
  { base: 'dance', thirdPerson: 'dances', difficulty: 'moderate' },
  { base: 'walk', thirdPerson: 'walks', difficulty: 'moderate' },
  { base: 'run', thirdPerson: 'runs', difficulty: 'moderate' },
  { base: 'jump', thirdPerson: 'jumps', difficulty: 'moderate' },
  { base: 'help', thirdPerson: 'helps', difficulty: 'moderate' },
  { base: 'clean', thirdPerson: 'cleans', difficulty: 'moderate' },
  { base: 'open', thirdPerson: 'opens', difficulty: 'moderate' },
  { base: 'close', thirdPerson: 'closes', difficulty: 'moderate' },
  { base: 'eat', thirdPerson: 'eats', difficulty: 'moderate' },
  { base: 'drink', thirdPerson: 'drinks', difficulty: 'moderate' },
  { base: 'sleep', thirdPerson: 'sleeps', difficulty: 'moderate' },
  { base: 'speak', thirdPerson: 'speaks', difficulty: 'moderate' },
  { base: 'learn', thirdPerson: 'learns', difficulty: 'moderate' },
  { base: 'draw', thirdPerson: 'draws', difficulty: 'moderate' },
  { base: 'cook', thirdPerson: 'cooks', difficulty: 'moderate' },
  { base: 'kick', thirdPerson: 'kicks', difficulty: 'moderate' },
  { base: 'paint', thirdPerson: 'paints', difficulty: 'moderate' },
  { base: 'swim', thirdPerson: 'swims', difficulty: 'moderate' },
  { base: 'wear', thirdPerson: 'wears', difficulty: 'moderate' },
  { base: 'like', thirdPerson: 'likes', difficulty: 'moderate' },
  { base: 'love', thirdPerson: 'loves', difficulty: 'moderate' },

  // Difficult - spelling change verbs
  { base: 'watch', thirdPerson: 'watches', difficulty: 'difficult' },
  { base: 'wash', thirdPerson: 'washes', difficulty: 'difficult' },
  { base: 'catch', thirdPerson: 'catches', difficulty: 'difficult' },
  { base: 'fix', thirdPerson: 'fixes', difficulty: 'difficult' },
  { base: 'go', thirdPerson: 'goes', difficulty: 'difficult' },
  { base: 'carry', thirdPerson: 'carries', difficulty: 'difficult' },
  { base: 'study', thirdPerson: 'studies', difficulty: 'difficult' },
  { base: 'try', thirdPerson: 'tries', difficulty: 'difficult' },
  { base: 'fly', thirdPerson: 'flies', difficulty: 'difficult' },
  { base: 'practise', thirdPerson: 'practises', difficulty: 'difficult' },
  { base: 'teach', thirdPerson: 'teaches', difficulty: 'difficult' },
  { base: 'push', thirdPerson: 'pushes', difficulty: 'difficult' },
  { base: 'reach', thirdPerson: 'reaches', difficulty: 'difficult' },
  { base: 'brush', thirdPerson: 'brushes', difficulty: 'difficult' },
  { base: 'miss', thirdPerson: 'misses', difficulty: 'difficult' },
  { base: 'enjoy', thirdPerson: 'enjoys', difficulty: 'difficult' },
  { base: 'copy', thirdPerson: 'copies', difficulty: 'difficult' },
  { base: 'reply', thirdPerson: 'replies', difficulty: 'difficult' },
];

// ─────────────────────────────────────────────────────────────
// ADJECTIVE COMPLEMENTS
// ─────────────────────────────────────────────────────────────

export const ADJECTIVES: AdjEntry[] = [
  { text: 'happy' },
  { text: 'ready' },
  { text: 'active' },
  { text: 'tired' },
  { text: 'cheerful' },
  { text: 'helpful' },
  { text: 'careful' },
  { text: 'excited' },
  { text: 'strong' },
  { text: 'busy' },
  { text: 'tall' },
  { text: 'smart' },
  { text: 'kind' },
  { text: 'fast' },
  { text: 'clever' },
  { text: 'brave' },
  { text: 'gentle' },
  { text: 'quiet' },
  { text: 'lively' },
  { text: 'healthy' },
];

// ─────────────────────────────────────────────────────────────
// POSSESSION OBJECTS
// ─────────────────────────────────────────────────────────────

export const POSSESSIONS: PossessionEntry[] = [
  { text: 'a football' },
  { text: 'a blue jersey' },
  { text: 'new shoes' },
  { text: 'a storybook' },
  { text: 'a red bag' },
  { text: 'many toys', plural: true },
  { text: 'two pencils', plural: true },
  { text: 'match tickets', plural: true },
  { text: 'a water bottle' },
  { text: 'football boots', plural: true },
  { text: 'a new pencil case' },
  { text: 'a cricket bat' },
  { text: 'a lunch box' },
  { text: 'many books', plural: true },
  { text: 'a school bag' },
  { text: 'a favourite book' },
  { text: 'a bicycle' },
  { text: 'new cricket gloves', plural: true },
];

// ─────────────────────────────────────────────────────────────
// ACTION ENDINGS (what follows the verb)
// ─────────────────────────────────────────────────────────────

export const ACTION_ENDINGS: ActionEndingEntry[] = [
  { text: 'football every evening' },
  { text: 'books after school' },
  { text: 'to school every day' },
  { text: 'the match on television' },
  { text: 'pictures in the classroom' },
  { text: 'English with friends' },
  { text: 'in the playground' },
  { text: 'the room every morning' },
  { text: 'dinner for the family' },
  { text: 'songs during class' },
  { text: 'cricket at the ground' },
  { text: 'together every day' },
  { text: 'to school by bus' },
  { text: 'hard every day' },
  { text: 'the dishes after dinner' },
  { text: 'outside every morning' },
];

// ─────────────────────────────────────────────────────────────
// GRAMMAR RULES
// ─────────────────────────────────────────────────────────────

export interface FamilyRules {
  beForm: string;
  haveForm: string;
  doForm: string;
  verbForm: 'base' | 'third';
  name: string;
  examples: string[];
  explanation: string;
}

export const FAMILY_RULES: Record<GrammarFamily, FamilyRules> = {
  A: {
    beForm: 'am',
    haveForm: 'have',
    doForm: 'do',
    verbForm: 'base',
    name: 'Family A (I)',
    examples: ['I am happy.', 'I have a ball.', 'I play cricket.'],
    explanation: '"I" takes am / have / base verb (play, not plays)',
  },
  B: {
    beForm: 'is',
    haveForm: 'has',
    doForm: 'does',
    verbForm: 'third',
    name: 'Family B (He/She/It/singular)',
    examples: ['He is happy.', 'He has a ball.', 'He plays cricket.'],
    explanation: 'Singular subjects take is / has / verb+s (plays, not play)',
  },
  C: {
    beForm: 'are',
    haveForm: 'have',
    doForm: 'do',
    verbForm: 'base',
    name: 'Family C (You/We/They/plural)',
    examples: ['They are happy.', 'They have balls.', 'They play cricket.'],
    explanation: 'Plural subjects take are / have / base verb (play, not plays)',
  },
};

// ─────────────────────────────────────────────────────────────
// VERB-GENERATION RULES (documented for teachers)
// ─────────────────────────────────────────────────────────────
// Rule 1: Usually add -s: play→plays, read→reads
// Rule 2: Add -es after -s, -sh, -ch, -x, -z, or -o: wash→washes, go→goes
// Rule 3: Consonant + y → -ies: carry→carries, study→studies
// Rule 4: Vowel + y → add -s: play→plays, enjoy→enjoys

export function getThirdPerson(base: string): string {
  // Already stored in VERBS, but this is for any dynamic generation
  const existing = VERBS.find(v => v.base === base);
  if (existing) return existing.thirdPerson;

  // Fallback rules
  if (/[sxz]$/.test(base) || /sh$/.test(base) || /ch$/.test(base)) {
    return base + 'es';
  }
  if (/o$/.test(base)) {
    return base + 'es';
  }
  if (/[^aeiou]y$/.test(base)) {
    return base.slice(0, -1) + 'ies';
  }
  return base + 's';
}
