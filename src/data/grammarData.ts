// ============================================================
// Grammar Cricket - Grammar Data
// All grammar families, subjects, verbs, and sentence data
// Fully separated from game logic and animation
// ============================================================

export type GrammarFamily = 'A' | 'B' | 'C';
export type Difficulty = 'moderate' | 'difficult' | 'mixed';
export type Animacy = 'human' | 'animal';

export interface SubjectEntry {
  text: string;
  family: GrammarFamily;
  difficulty: 'moderate' | 'difficult';
  displayHint?: string; // For tricky subjects like "the captain of the team"
  tags: Animacy[];
}

export interface VerbEntry {
  base: string;
  thirdPerson: string; // -s / -es / -ies form
  difficulty: 'moderate' | 'difficult';
  tags: Animacy[];
  endings: string[]; // Specific endings that make sense for this verb
}

export interface AdjEntry {
  text: string;
  tags: Animacy[];
}

export interface PossessionEntry {
  text: string;
  plural?: boolean;
  tags: Animacy[];
}

// SUBJECTS
export const SUBJECTS: SubjectEntry[] = [
  // Family A (I)
  { text: 'I', family: 'A', difficulty: 'moderate', tags: ['human'] },

  // Family B - Moderate (he, she, it, simple singular nouns)
  { text: 'He', family: 'B', difficulty: 'moderate', tags: ['human'] },
  { text: 'She', family: 'B', difficulty: 'moderate', tags: ['human'] },
  { text: 'It', family: 'B', difficulty: 'moderate', tags: ['animal'] },
  { text: 'Riya', family: 'B', difficulty: 'moderate', tags: ['human'] },
  { text: 'Rahul', family: 'B', difficulty: 'moderate', tags: ['human'] },
  { text: 'The boy', family: 'B', difficulty: 'moderate', tags: ['human'] },
  { text: 'The girl', family: 'B', difficulty: 'moderate', tags: ['human'] },
  { text: 'My mother', family: 'B', difficulty: 'moderate', tags: ['human'] },
  { text: 'My father', family: 'B', difficulty: 'moderate', tags: ['human'] },
  { text: 'My sister', family: 'B', difficulty: 'moderate', tags: ['human'] },
  { text: 'My brother', family: 'B', difficulty: 'moderate', tags: ['human'] },
  { text: 'The cat', family: 'B', difficulty: 'moderate', tags: ['animal'] },
  { text: 'The dog', family: 'B', difficulty: 'moderate', tags: ['animal'] },
  { text: 'My friend', family: 'B', difficulty: 'moderate', tags: ['human'] },
  { text: 'The teacher', family: 'B', difficulty: 'moderate', tags: ['human'] },

  // Family B - Difficult (complex singular subjects)
  { text: 'The boy in the blue shirt', family: 'B', difficulty: 'difficult', displayHint: 'boy (singular)', tags: ['human'] },
  { text: 'My teacher', family: 'B', difficulty: 'difficult', tags: ['human'] },
  { text: 'Each child', family: 'B', difficulty: 'difficult', displayHint: '"Each" = singular', tags: ['human'] },
  { text: 'Every player', family: 'B', difficulty: 'difficult', displayHint: '"Every" = singular', tags: ['human'] },
  { text: 'The captain of the team', family: 'B', difficulty: 'difficult', displayHint: 'captain (singular)', tags: ['human'] },
  { text: 'One of the boys', family: 'B', difficulty: 'difficult', displayHint: '"One" = singular', tags: ['human'] },

  // Family C - Moderate (you, we, they, simple plural nouns)
  { text: 'You', family: 'C', difficulty: 'moderate', tags: ['human'] },
  { text: 'We', family: 'C', difficulty: 'moderate', tags: ['human'] },
  { text: 'They', family: 'C', difficulty: 'moderate', tags: ['human', 'animal'] },
  { text: 'The boys', family: 'C', difficulty: 'moderate', tags: ['human'] },
  { text: 'The girls', family: 'C', difficulty: 'moderate', tags: ['human'] },
  { text: 'My parents', family: 'C', difficulty: 'moderate', tags: ['human'] },
  { text: 'The children', family: 'C', difficulty: 'moderate', tags: ['human'] },
  { text: 'My friends', family: 'C', difficulty: 'moderate', tags: ['human'] },
  { text: 'The dogs', family: 'C', difficulty: 'moderate', tags: ['animal'] },

  // Family C - Difficult (compound and complex plural subjects)
  { text: 'My brother and I', family: 'C', difficulty: 'difficult', tags: ['human'] },
  { text: 'Riya and Tina', family: 'C', difficulty: 'difficult', displayHint: 'two people = plural', tags: ['human'] },
  { text: 'Rahul and his friends', family: 'C', difficulty: 'difficult', displayHint: 'plural', tags: ['human'] },
  { text: 'The girls in our class', family: 'C', difficulty: 'difficult', displayHint: 'girls (plural)', tags: ['human'] },
  { text: 'My brother and sister', family: 'C', difficulty: 'difficult', displayHint: 'two people = plural', tags: ['human'] },
  { text: 'The children near the goal', family: 'C', difficulty: 'difficult', displayHint: 'children (plural)', tags: ['human'] },
  { text: 'The players from our school', family: 'C', difficulty: 'difficult', displayHint: 'players (plural)', tags: ['human'] },
];

// VERBS
export const VERBS: VerbEntry[] = [
  // Moderate - simple +s
  { base: 'play', thirdPerson: 'plays', difficulty: 'moderate', tags: ['human', 'animal'], endings: ['football every evening', 'games after school', 'with friends', 'in the park'] },
  { base: 'read', thirdPerson: 'reads', difficulty: 'moderate', tags: ['human'], endings: ['books after school', 'a storybook every night', 'the newspaper loudly'] },
  { base: 'write', thirdPerson: 'writes', difficulty: 'moderate', tags: ['human'], endings: ['letters to friends', 'stories in a notebook', 'neatly in class'] },
  { base: 'sing', thirdPerson: 'sings', difficulty: 'moderate', tags: ['human'], endings: ['songs during class', 'beautifully in the choir', 'loudly in the morning'] },
  { base: 'dance', thirdPerson: 'dances', difficulty: 'moderate', tags: ['human', 'animal'], endings: ['gracefully on stage', 'to the music', 'at the party'] },
  { base: 'walk', thirdPerson: 'walks', difficulty: 'moderate', tags: ['human', 'animal'], endings: ['to school every day', 'in the park', 'slowly on the grass'] },
  { base: 'run', thirdPerson: 'runs', difficulty: 'moderate', tags: ['human', 'animal'], endings: ['fast in the playground', 'around the field', 'quickly outside'] },
  { base: 'jump', thirdPerson: 'jumps', difficulty: 'moderate', tags: ['human', 'animal'], endings: ['high in the air', 'over the fence', 'on the bed'] },
  { base: 'help', thirdPerson: 'helps', difficulty: 'moderate', tags: ['human'], endings: ['the family at home', 'friends with homework', 'others in need'] },
  { base: 'clean', thirdPerson: 'cleans', difficulty: 'moderate', tags: ['human'], endings: ['the room every morning', 'the dishes after dinner', 'the house on weekends'] },
  { base: 'eat', thirdPerson: 'eats', difficulty: 'moderate', tags: ['human', 'animal'], endings: ['healthy food', 'lunch in the cafeteria', 'a big breakfast'] },
  { base: 'drink', thirdPerson: 'drinks', difficulty: 'moderate', tags: ['human', 'animal'], endings: ['water after playing', 'milk every morning', 'juice with breakfast'] },
  { base: 'sleep', thirdPerson: 'sleeps', difficulty: 'moderate', tags: ['human', 'animal'], endings: ['soundly all night', 'on the comfortable bed', 'in the afternoon'] },
  { base: 'learn', thirdPerson: 'learns', difficulty: 'moderate', tags: ['human'], endings: ['English at school', 'new things quickly', 'maths with the teacher'] },
  { base: 'draw', thirdPerson: 'draws', difficulty: 'moderate', tags: ['human'], endings: ['pictures in the classroom', 'beautiful scenery', 'colorful paintings'] },
  { base: 'cook', thirdPerson: 'cooks', difficulty: 'moderate', tags: ['human'], endings: ['dinner for the family', 'tasty meals', 'food in the kitchen'] },
  { base: 'swim', thirdPerson: 'swims', difficulty: 'moderate', tags: ['human', 'animal'], endings: ['in the pool', 'fast in the water', 'every Sunday'] },
  { base: 'wear', thirdPerson: 'wears', difficulty: 'moderate', tags: ['human'], endings: ['a blue jersey', 'a school uniform', 'warm clothes in winter'] },

  // Difficult - spelling change verbs
  { base: 'watch', thirdPerson: 'watches', difficulty: 'difficult', tags: ['human', 'animal'], endings: ['the match on television', 'movies on weekends', 'birds in the sky'] },
  { base: 'wash', thirdPerson: 'washes', difficulty: 'difficult', tags: ['human'], endings: ['the dishes after dinner', 'clothes on Sunday', 'hands before eating'] },
  { base: 'catch', thirdPerson: 'catches', difficulty: 'difficult', tags: ['human', 'animal'], endings: ['the ball easily', 'butterflies in the garden', 'the bus to school'] },
  { base: 'fix', thirdPerson: 'fixes', difficulty: 'difficult', tags: ['human'], endings: ['broken toys', 'the bicycle', 'things around the house'] },
  { base: 'go', thirdPerson: 'goes', difficulty: 'difficult', tags: ['human', 'animal'], endings: ['to school by bus', 'to the park every evening', 'home after practice'] },
  { base: 'carry', thirdPerson: 'carries', difficulty: 'difficult', tags: ['human'], endings: ['a heavy bag', 'books to the library', 'water bottles to the field'] },
  { base: 'study', thirdPerson: 'studies', difficulty: 'difficult', tags: ['human'], endings: ['hard every day', 'for the upcoming exams', 'science at the library'] },
  { base: 'fly', thirdPerson: 'flies', difficulty: 'difficult', tags: ['human'], endings: ['kites in the sky', 'in an airplane', 'to different countries'] },
  { base: 'practise', thirdPerson: 'practises', difficulty: 'difficult', tags: ['human'], endings: ['cricket at the ground', 'maths every evening', 'the guitar'] },
  { base: 'teach', thirdPerson: 'teaches', difficulty: 'difficult', tags: ['human'], endings: ['English to students', 'new skills', 'important lessons'] },
  { base: 'push', thirdPerson: 'pushes', difficulty: 'difficult', tags: ['human'], endings: ['the heavy door', 'the cart in the shop', 'the swing in the park'] },
  { base: 'reach', thirdPerson: 'reaches', difficulty: 'difficult', tags: ['human', 'animal'], endings: ['the top shelf', 'school on time', 'the finish line first'] },
  { base: 'brush', thirdPerson: 'brushes', difficulty: 'difficult', tags: ['human'], endings: ['teeth every morning', 'hair neatly', 'the dog\'s fur'] },
  { base: 'miss', thirdPerson: 'misses', difficulty: 'difficult', tags: ['human'], endings: ['the school bus sometimes', 'friends from the old school', 'the target'] },
  { base: 'enjoy', thirdPerson: 'enjoys', difficulty: 'difficult', tags: ['human', 'animal'], endings: ['playing outside', 'reading good books', 'listening to music'] },
  { base: 'copy', thirdPerson: 'copies', difficulty: 'difficult', tags: ['human'], endings: ['notes from the board', 'the drawing carefully', 'the teacher\'s examples'] }
];

// ADJECTIVE COMPLEMENTS
export const ADJECTIVES: AdjEntry[] = [
  { text: 'happy', tags: ['human', 'animal'] },
  { text: 'ready', tags: ['human', 'animal'] },
  { text: 'active', tags: ['human', 'animal'] },
  { text: 'tired', tags: ['human', 'animal'] },
  { text: 'cheerful', tags: ['human', 'animal'] },
  { text: 'helpful', tags: ['human', 'animal'] },
  { text: 'careful', tags: ['human', 'animal'] },
  { text: 'excited', tags: ['human', 'animal'] },
  { text: 'strong', tags: ['human', 'animal'] },
  { text: 'busy', tags: ['human', 'animal'] },
  { text: 'tall', tags: ['human', 'animal'] },
  { text: 'smart', tags: ['human', 'animal'] },
  { text: 'kind', tags: ['human', 'animal'] },
  { text: 'fast', tags: ['human', 'animal'] },
  { text: 'clever', tags: ['human', 'animal'] },
  { text: 'brave', tags: ['human', 'animal'] },
  { text: 'gentle', tags: ['human', 'animal'] },
  { text: 'quiet', tags: ['human', 'animal'] },
  { text: 'lively', tags: ['human', 'animal'] },
  { text: 'healthy', tags: ['human', 'animal'] },
];

// POSSESSION OBJECTS
export const POSSESSIONS: PossessionEntry[] = [
  { text: 'a football', tags: ['human', 'animal'] },
  { text: 'a blue jersey', tags: ['human'] },
  { text: 'new shoes', tags: ['human'] },
  { text: 'a storybook', tags: ['human'] },
  { text: 'a red bag', tags: ['human'] },
  { text: 'many toys', plural: true, tags: ['human', 'animal'] },
  { text: 'two pencils', plural: true, tags: ['human'] },
  { text: 'match tickets', plural: true, tags: ['human'] },
  { text: 'a water bottle', tags: ['human'] },
  { text: 'football boots', plural: true, tags: ['human'] },
  { text: 'a new pencil case', tags: ['human'] },
  { text: 'a cricket bat', tags: ['human'] },
  { text: 'a lunch box', tags: ['human'] },
  { text: 'many books', plural: true, tags: ['human'] },
  { text: 'a school bag', tags: ['human'] },
  { text: 'a favourite book', tags: ['human'] },
  { text: 'a bicycle', tags: ['human'] },
  { text: 'new cricket gloves', plural: true, tags: ['human'] },
  { text: 'a soft bed', tags: ['human', 'animal'] },
  { text: 'a shiny collar', tags: ['animal'] },
  { text: 'a big bone', tags: ['animal'] },
  { text: 'a warm blanket', tags: ['human', 'animal'] },
];

// GRAMMAR RULES
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

// VERB-GENERATION RULES (documented for teachers)
// Rule 1: Usually add -s: play -> plays, read -> reads
// Rule 2: Add -es after -s, -sh, -ch, -x, -z, or -o: wash -> washes, go -> goes
// Rule 3: Consonant + y -> -ies: carry -> carries, study -> studies
// Rule 4: Vowel + y -> add -s: play -> plays, enjoy -> enjoys

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
