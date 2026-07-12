// ============================================================
// Grammar Cricket - Question Generator
// Procedurally generates grammar questions from data pools
// ============================================================

import {
  SUBJECTS,
  VERBS,
  ADJECTIVES,
  POSSESSIONS,
  FAMILY_RULES,
  SubjectEntry,
  VerbEntry,
  GrammarFamily,
} from '../data/grammarData';

export type { Difficulty } from '../data/grammarData';

export type QuestionType = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface AnswerOption {
  label: string; // A, B, C, D
  value: string;
  isCorrect: boolean;
}

export interface GeneratedQuestion {
  id: string;
  type: QuestionType;
  difficulty: 'moderate' | 'difficult';
  subject: SubjectEntry;
  sentences: string[]; // The three sentences, with ___ for blanks
  blankIndices: number[]; // Which sentences have blanks (0,1,2)
  options: AnswerOption[];
  correctAnswer: string;
  explanation: string;
  grammarFamily: GrammarFamily;
  signature: string; // For deduplication
}

// Recent question signatures (prevent repeats)
const recentSignatures: string[] = [];
const MAX_HISTORY = 30; // Kept generous so unlimited variations can cycle comfortably

function recordSignature(sig: string) {
  recentSignatures.push(sig);
  if (recentSignatures.length > MAX_HISTORY) {
    recentSignatures.shift();
  }
}

function isRecent(sig: string): boolean {
  return recentSignatures.includes(sig);
}

// Random helpers
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function makeLabel(idx: number): string {
  return ['A', 'B', 'C', 'D'][idx];
}

// Subject filtering
function getSubjectsForDifficulty(difficulty: 'moderate' | 'difficult'): SubjectEntry[] {
  if (difficulty === 'moderate') {
    return SUBJECTS.filter(s => s.difficulty === 'moderate');
  }
  // Difficult: include all subjects
  return SUBJECTS;
}

// Build a complete three-sentence family for a subject
interface FamilySentences {
  beSentence: string;
  haveSentence: string;
  actionSentence: string;
  beForm: string;
  haveForm: string;
  actionVerb: string; // verb in correct form
  actionVerbBase: string;
  actionEnding: string;
  adjective: string;
  possession: string;
}

function buildFamily(subject: SubjectEntry, verbEntry: VerbEntry): FamilySentences {
  const rules = FAMILY_RULES[subject.family];

  // Pick semantic-matching traits to prevent "The box of footballs plays"
  const validAdjs = ADJECTIVES.filter(a => a.tags.some(t => subject.tags.includes(t)));
  const adjective = pick(validAdjs).text;

  const validPossessions = POSSESSIONS.filter(p => p.tags.some(t => subject.tags.includes(t)));
  const possession = pick(validPossessions).text;

  const actionEnding = pick(verbEntry.endings);
  const actionVerb = subject.family === 'B' ? verbEntry.thirdPerson : verbEntry.base;

  const beSentence = `${subject.text} ${rules.beForm} ${adjective}.`;
  const haveSentence = `${subject.text} ${rules.haveForm} ${possession}.`;
  const actionSentence = `${subject.text} ${actionVerb} ${actionEnding}.`;

  return {
    beSentence,
    haveSentence,
    actionSentence,
    beForm: rules.beForm,
    haveForm: rules.haveForm,
    actionVerb,
    actionVerbBase: verbEntry.base,
    actionEnding,
    adjective,
    possession,
  };
}

// Generate wrong forms
function wrongBeForms(correct: string): string[] {
  const all = ['am', 'is', 'are'];
  return all.filter(f => f !== correct);
}

function wrongHaveForms(correct: string): string[] {
  const all = ['have', 'has'];
  return all.filter(f => f !== correct);
}

function wrongVerbForms(base: string, correct: string): string[] {
  const verb = VERBS.find(v => v.base === base);
  if (!verb) return [];
  const forms = [verb.base, verb.thirdPerson].filter(f => f !== correct);
  return forms;
}

// Type 1: Complete the Be Form
function generateType1(subject: SubjectEntry, verbEntry: VerbEntry, diff: 'moderate' | 'difficult'): GeneratedQuestion | null {
  const family = buildFamily(subject, verbEntry);
  const correct = family.beForm;
  
  const wrong = Array.from(new Set(wrongBeForms(correct)));
  const optionValues = shuffle([correct, ...shuffle(wrong).slice(0, 2)]);
  const options: AnswerOption[] = optionValues.map((v, i) => ({
    label: makeLabel(i),
    value: v,
    isCorrect: v === correct,
  }));

  const sentences = [
    `${subject.text} _____ ${family.adjective}.`,
    family.haveSentence,
    family.actionSentence,
  ];

  const rules = FAMILY_RULES[subject.family];
  const explanation = buildExplanation(subject, rules, 'be');

  const sig = `T1:${subject.text}:${family.adjective}:${family.possession}:${verbEntry.base}:${family.actionEnding}`;
  if (isRecent(sig)) return null;

  return {
    id: Math.random().toString(36).slice(2),
    type: 1,
    difficulty: diff,
    subject,
    sentences,
    blankIndices: [0],
    options,
    correctAnswer: correct,
    explanation,
    grammarFamily: subject.family,
    signature: sig,
  };
}

// Type 2: Complete Have or Has
function generateType2(subject: SubjectEntry, verbEntry: VerbEntry, diff: 'moderate' | 'difficult'): GeneratedQuestion | null {
  const family = buildFamily(subject, verbEntry);
  const correct = family.haveForm;
  
  const wrong = wrongHaveForms(correct);
  const distractors = Array.from(new Set(['having', ...wrong]));
  const optionValues = shuffle([correct, ...shuffle(distractors).slice(0, 2)]);

  const options: AnswerOption[] = optionValues.map((v, i) => ({
    label: makeLabel(i),
    value: v,
    isCorrect: v === correct,
  }));

  const sentences = [
    family.beSentence,
    `${subject.text} _____ ${family.possession}.`,
    family.actionSentence,
  ];

  const rules = FAMILY_RULES[subject.family];
  const explanation = buildExplanation(subject, rules, 'have');

  const sig = `T2:${subject.text}:${family.adjective}:${family.possession}:${verbEntry.base}:${family.actionEnding}`;
  if (isRecent(sig)) return null;

  return {
    id: Math.random().toString(36).slice(2),
    type: 2,
    difficulty: diff,
    subject,
    sentences,
    blankIndices: [1],
    options,
    correctAnswer: correct,
    explanation,
    grammarFamily: subject.family,
    signature: sig,
  };
}

// Type 3: Complete the Action Verb
function generateType3(subject: SubjectEntry, verbEntry: VerbEntry, diff: 'moderate' | 'difficult'): GeneratedQuestion | null {
  const family = buildFamily(subject, verbEntry);
  const correct = family.actionVerb;
  
  const wrongForms = wrongVerbForms(verbEntry.base, correct);
  const progressive = verbEntry.base.endsWith('e')
    ? verbEntry.base.slice(0, -1) + 'ing'
    : verbEntry.base + 'ing';
    
  const dists = Array.from(new Set([...wrongForms, progressive].filter(f => f !== correct)));
  const optionValues = shuffle([correct, ...shuffle(dists).slice(0, 2)]);

  const options: AnswerOption[] = optionValues.map((v, i) => ({
    label: makeLabel(i),
    value: v,
    isCorrect: v === correct,
  }));

  const sentences = [
    family.beSentence,
    family.haveSentence,
    `${subject.text} _____ ${family.actionEnding}.`,
  ];

  const rules = FAMILY_RULES[subject.family];
  const explanation = buildExplanation(subject, rules, 'verb');

  const sig = `T3:${subject.text}:${family.adjective}:${family.possession}:${verbEntry.base}:${family.actionEnding}`;
  if (isRecent(sig)) return null;

  return {
    id: Math.random().toString(36).slice(2),
    type: 3,
    difficulty: diff,
    subject,
    sentences,
    blankIndices: [2],
    options,
    correctAnswer: correct,
    explanation,
    grammarFamily: subject.family,
    signature: sig,
  };
}

// Type 4: Complete Two Missing Forms
function generateType4(subject: SubjectEntry, verbEntry: VerbEntry, diff: 'moderate' | 'difficult'): GeneratedQuestion | null {
  const family = buildFamily(subject, verbEntry);
  const rules = FAMILY_RULES[subject.family];

  const blankChoices: [number, number][] = [[0, 1], [0, 2], [1, 2]];
  const [blank1, blank2] = pick(blankChoices);

  let correctPair: string;
  let sentences: string[];
  let distractorPairs: string[];

  if (blank1 === 0 && blank2 === 1) {
    correctPair = `${family.beForm} / ${family.haveForm}`;
    sentences = [
      `${subject.text} _____ ${family.adjective}.`,
      `${subject.text} _____ ${family.possession}.`,
      family.actionSentence,
    ];
    const otherBe = wrongBeForms(family.beForm);
    const otherHave = wrongHaveForms(family.haveForm);
    distractorPairs = Array.from(new Set([
      `${otherBe[0]} / ${family.haveForm}`,
      `${family.beForm} / ${otherHave[0] || 'having'}`,
      `${otherBe[1] || otherBe[0]} / ${otherHave[0] || 'having'}`,
    ]));
  } else if (blank1 === 0 && blank2 === 2) {
    correctPair = `${family.beForm} / ${family.actionVerb}`;
    sentences = [
      `${subject.text} _____ ${family.adjective}.`,
      family.haveSentence,
      `${subject.text} _____ ${family.actionEnding}.`,
    ];
    const otherBe = wrongBeForms(family.beForm);
    const wrongVerb = wrongVerbForms(verbEntry.base, family.actionVerb);
    distractorPairs = Array.from(new Set([
      `${otherBe[0]} / ${family.actionVerb}`,
      `${family.beForm} / ${wrongVerb[0] || verbEntry.base + 'ing'}`,
      `${otherBe[1] || otherBe[0]} / ${wrongVerb[0] || verbEntry.base + 'ing'}`,
    ]));
  } else {
    correctPair = `${family.haveForm} / ${family.actionVerb}`;
    sentences = [
      family.beSentence,
      `${subject.text} _____ ${family.possession}.`,
      `${subject.text} _____ ${family.actionEnding}.`,
    ];
    const otherHave = wrongHaveForms(family.haveForm);
    const wrongVerb = wrongVerbForms(verbEntry.base, family.actionVerb);
    distractorPairs = Array.from(new Set([
      `${otherHave[0] || 'having'} / ${family.actionVerb}`,
      `${family.haveForm} / ${wrongVerb[0] || verbEntry.base + 'ing'}`,
      `${otherHave[0] || 'having'} / ${wrongVerb[0] || verbEntry.base + 'ing'}`,
    ]));
  }

  const safeDistractors = distractorPairs.filter(d => d !== correctPair);
  const allOptions = shuffle([correctPair, ...safeDistractors.slice(0, 3)]);

  const options: AnswerOption[] = allOptions.map((v, i) => ({
    label: makeLabel(i),
    value: v,
    isCorrect: v === correctPair,
  }));

  const explanation = buildExplanation(subject, rules, 'double');
  const sig = `T4:${subject.text}:${family.adjective}:${family.possession}:${verbEntry.base}:${family.actionEnding}:${blank1}${blank2}`;
  if (isRecent(sig)) return null;

  return {
    id: Math.random().toString(36).slice(2),
    type: 4,
    difficulty: diff,
    subject,
    sentences,
    blankIndices: [blank1, blank2],
    options,
    correctAnswer: correctPair,
    explanation,
    grammarFamily: subject.family,
    signature: sig,
  };
}

// Type 5: Choose the Correct Complete Family
function generateType5(subject: SubjectEntry, verbEntry: VerbEntry, diff: 'moderate' | 'difficult'): GeneratedQuestion | null {
  const family = buildFamily(subject, verbEntry);
  const rules = FAMILY_RULES[subject.family];

  const correctSetStr = `${family.beSentence}\n${family.haveSentence}\n${family.actionSentence}`;
  const wrongFamilies: GrammarFamily[] = (['A', 'B', 'C'] as GrammarFamily[]).filter(f => f !== subject.family);
  
  const wrongSets: string[] = wrongFamilies.map(wf => {
    const wr = FAMILY_RULES[wf];
    const wv = wf === 'B' ? verbEntry.thirdPerson : verbEntry.base;
    return `${subject.text} ${wr.beForm} ${family.adjective}.\n${subject.text} ${wr.haveForm} ${family.possession}.\n${subject.text} ${wv} ${family.actionEnding}.`;
  });

  const mixedBe = wrongBeForms(rules.beForm)[0];
  const mixedSet = `${subject.text} ${mixedBe} ${family.adjective}.\n${family.haveSentence}\n${family.actionSentence}`;

  const dists = Array.from(new Set([wrongSets[0], wrongSets[1], mixedSet])).filter(d => d !== correctSetStr);

  const allSets = shuffle([
    { text: correctSetStr, isCorrect: true },
    ...dists.slice(0, 2).map(text => ({ text, isCorrect: false }))
  ]);

  const options: AnswerOption[] = allSets.map((s, i) => ({
    label: makeLabel(i),
    value: s.text,
    isCorrect: s.isCorrect,
  }));

  const correctLabel = options.find(o => o.isCorrect)!.label;
  const explanation = `Option ${correctLabel} uses the correct forms: ${rules.beForm} / ${rules.haveForm} / ${verbEntry.base === family.actionVerb ? verbEntry.base : verbEntry.thirdPerson}.`;
  
  const sig = `T5:${subject.text}:${family.adjective}:${family.possession}:${verbEntry.base}:${family.actionEnding}`;
  if (isRecent(sig)) return null;

  const sentences = [
    `Which set is correct for "${subject.text}"?`,
    '',
    '',
  ];

  return {
    id: Math.random().toString(36).slice(2),
    type: 5,
    difficulty: diff,
    subject,
    sentences,
    blankIndices: [],
    options,
    correctAnswer: correctSetStr,
    explanation,
    grammarFamily: subject.family,
    signature: sig,
  };
}

// Type 6: Find the Incorrect Sentence
function generateType6(subject: SubjectEntry, verbEntry: VerbEntry, diff: 'moderate' | 'difficult'): GeneratedQuestion | null {
  const family = buildFamily(subject, verbEntry);
  const rules = FAMILY_RULES[subject.family];

  const allCorrect = [family.beSentence, family.haveSentence, family.actionSentence];
  const errorIdx = Math.floor(Math.random() * 3);
  const erroredSentences = [...allCorrect];
  let errorExplanation = '';

  if (errorIdx === 0) {
    const wrongBe = wrongBeForms(rules.beForm)[0];
    erroredSentences[0] = `${subject.text} ${wrongBe} ${family.adjective}.`;
    errorExplanation = `Sentence 1 is wrong. "${subject.text}" takes "${rules.beForm}", not "${wrongBe}".`;
  } else if (errorIdx === 1) {
    const wrongHave = wrongHaveForms(rules.haveForm)[0];
    erroredSentences[1] = `${subject.text} ${wrongHave} ${family.possession}.`;
    errorExplanation = `Sentence 2 is wrong. "${subject.text}" takes "${rules.haveForm}", not "${wrongHave}".`;
  } else {
    const wrongVerb = wrongVerbForms(verbEntry.base, family.actionVerb)[0] || verbEntry.base + 'ing';
    erroredSentences[2] = `${subject.text} ${wrongVerb} ${family.actionEnding}.`;
    errorExplanation = `Sentence 3 is wrong. "${subject.text}" takes "${family.actionVerb}", not "${wrongVerb}".`;
  }

  const errorSentenceNum = errorIdx + 1;
  const options: AnswerOption[] = [
    { label: 'A', value: 'Sentence 1', isCorrect: errorIdx === 0 },
    { label: 'B', value: 'Sentence 2', isCorrect: errorIdx === 1 },
    { label: 'C', value: 'Sentence 3', isCorrect: errorIdx === 2 },
  ];

  const sig = `T6:${subject.text}:${family.adjective}:${family.possession}:${verbEntry.base}:${family.actionEnding}:err${errorIdx}`;
  if (isRecent(sig)) return null;

  return {
    id: Math.random().toString(36).slice(2),
    type: 6,
    difficulty: diff,
    subject,
    sentences: erroredSentences,
    blankIndices: [],
    options,
    correctAnswer: `Sentence ${errorSentenceNum}`,
    explanation: errorExplanation,
    grammarFamily: subject.family,
    signature: sig,
  };
}

// Type 7: Identify the Grammar Family
function generateType7(subject: SubjectEntry, _verbEntry: VerbEntry, diff: 'moderate' | 'difficult'): GeneratedQuestion | null {
  const rules = FAMILY_RULES[subject.family];
  const correctFull = `${rules.beForm} + ${rules.haveForm} + ${rules.verbForm === 'base' ? 'play' : 'plays'}`;
  
  const allFamilies: GrammarFamily[] = ['A', 'B', 'C'];
  const otherFamilies = allFamilies.filter(f => f !== subject.family);

  const buildPattern = (f: GrammarFamily) => {
    const r = FAMILY_RULES[f];
    return `${r.beForm} + ${r.haveForm} + ${r.verbForm === 'base' ? 'play' : 'plays'}`;
  };

  const optionValues = shuffle([
    { text: correctFull, isCorrect: true },
    { text: buildPattern(otherFamilies[0]), isCorrect: false },
    { text: buildPattern(otherFamilies[1]), isCorrect: false },
  ]);

  const options: AnswerOption[] = optionValues.map((v, i) => ({
    label: makeLabel(i),
    value: v.text,
    isCorrect: v.isCorrect,
  }));

  const explanation = `"${subject.text}" belongs to the ${rules.name}. Use: ${rules.beForm} / ${rules.haveForm} / ${rules.verbForm === 'base' ? 'base verb' : 'verb+s'}.`;

  const sentences = [
    `Which grammar family does "${subject.text}" belong to?`,
    '',
    '',
  ];

  const sig = `T7:${subject.text}`;
  if (isRecent(sig)) return null;

  return {
    id: Math.random().toString(36).slice(2),
    type: 7,
    difficulty: diff,
    subject,
    sentences,
    blankIndices: [],
    options,
    correctAnswer: correctFull,
    explanation,
    grammarFamily: subject.family,
    signature: sig,
  };
}

// Type 8: Repair the Family
function generateType8(subject: SubjectEntry, verbEntry: VerbEntry, diff: 'moderate' | 'difficult'): GeneratedQuestion | null {
  const family = buildFamily(subject, verbEntry);
  const rules = FAMILY_RULES[subject.family];

  const errorIdx = Math.floor(Math.random() * 3);
  const displaySentences = [family.beSentence, family.haveSentence, family.actionSentence];

  let correctRepair: string;
  let options: AnswerOption[];

  if (errorIdx === 0) {
    const wrongBe = wrongBeForms(rules.beForm)[Math.floor(Math.random() * 2)];
    displaySentences[0] = `${subject.text} ${wrongBe} ${family.adjective}.`;
    correctRepair = `${wrongBe} → ${rules.beForm}`;
    
    const wrongHave = wrongHaveForms(rules.haveForm)[0];
    const wrongVerb = wrongVerbForms(verbEntry.base, family.actionVerb)[0] || verbEntry.base + 'ing';
    
    const dists = Array.from(new Set([
      `${rules.haveForm} → ${wrongHave || 'having'}`,
      `${family.actionVerb} → ${wrongVerb}`,
      `${subject.text} → (no change needed)`
    ])).filter(d => d !== correctRepair);

    options = shuffle([
      { label: '', value: correctRepair, isCorrect: true },
      ...dists.slice(0, 3).map(d => ({ label: '', value: d, isCorrect: false }))
    ]).map((o, i) => ({ ...o, label: makeLabel(i) }));
  } else if (errorIdx === 1) {
    const wrongHave = wrongHaveForms(rules.haveForm)[0];
    displaySentences[1] = `${subject.text} ${wrongHave} ${family.possession}.`;
    correctRepair = `${wrongHave} → ${rules.haveForm}`;
    
    const wrongBe = wrongBeForms(rules.beForm)[0];
    const wrongVerb = wrongVerbForms(verbEntry.base, family.actionVerb)[0] || verbEntry.base + 'ing';

    const dists = Array.from(new Set([
      `${rules.beForm} → ${wrongBe}`,
      `${family.actionVerb} → ${wrongVerb}`,
      `Nothing → all correct`
    ])).filter(d => d !== correctRepair);

    options = shuffle([
      { label: '', value: correctRepair, isCorrect: true },
      ...dists.slice(0, 3).map(d => ({ label: '', value: d, isCorrect: false }))
    ]).map((o, i) => ({ ...o, label: makeLabel(i) }));
  } else {
    const wrongVerb = wrongVerbForms(verbEntry.base, family.actionVerb)[0] || (family.actionVerb + 'ing');
    displaySentences[2] = `${subject.text} ${wrongVerb} ${family.actionEnding}.`;
    correctRepair = `${wrongVerb} → ${family.actionVerb}`;
    
    const wrongBe = wrongBeForms(rules.beForm)[0];
    const wrongHave = wrongHaveForms(rules.haveForm)[0];

    const dists = Array.from(new Set([
      `${rules.beForm} → ${wrongBe}`,
      `${rules.haveForm} → ${wrongHave || 'having'}`,
      `Nothing → all correct`
    ])).filter(d => d !== correctRepair);

    options = shuffle([
      { label: '', value: correctRepair, isCorrect: true },
      ...dists.slice(0, 3).map(d => ({ label: '', value: d, isCorrect: false }))
    ]).map((o, i) => ({ ...o, label: makeLabel(i) }));
  }

  const explanation = `The correct form is: ${rules.beForm} / ${rules.haveForm} / ${family.actionVerb}. ${correctRepair}.`;
  
  const sig = `T8:${subject.text}:${family.adjective}:${family.possession}:${verbEntry.base}:${family.actionEnding}:err${errorIdx}`;
  if (isRecent(sig)) return null;

  return {
    id: Math.random().toString(36).slice(2),
    type: 8,
    difficulty: diff,
    subject,
    sentences: displaySentences,
    blankIndices: [],
    options,
    correctAnswer: correctRepair,
    explanation,
    grammarFamily: subject.family,
    signature: sig,
  };
}

// Explanation builder
function buildExplanation(subject: SubjectEntry, rules: typeof FAMILY_RULES[GrammarFamily], focus: 'be' | 'have' | 'verb' | 'double'): string {
  const subjectText = subject.text;
  const hint = subject.displayHint ? ` (${subject.displayHint})` : '';
  
  if (focus === 'be') {
    return `"${subjectText}"${hint} → use "${rules.beForm}". ${rules.explanation}`;
  } else if (focus === 'have') {
    return `"${subjectText}"${hint} → use "${rules.haveForm}". ${rules.explanation}`;
  } else if (focus === 'verb') {
    return `"${subjectText}"${hint} → use ${rules.verbForm === 'third' ? 'verb+s/es/ies' : 'base verb'}. ${rules.explanation}`;
  } else {
    return `"${subjectText}"${hint} → ${rules.beForm} / ${rules.haveForm} / ${rules.verbForm === 'base' ? 'base verb' : 'verb+s'}. ${rules.explanation}`;
  }
}

// Main Question Generator
const TYPE_WEIGHTS_MODERATE: QuestionType[] = [1, 1, 2, 2, 3, 3, 4, 4, 6, 7];
const TYPE_WEIGHTS_DIFFICULT: QuestionType[] = [1, 2, 3, 4, 4, 5, 6, 7, 8, 8];

export function generateQuestion(difficulty: 'moderate' | 'difficult'): GeneratedQuestion {
  const effectiveDiff = difficulty;
  const subjects = getSubjectsForDifficulty(effectiveDiff);
  const typePool = effectiveDiff === 'moderate' ? TYPE_WEIGHTS_MODERATE : TYPE_WEIGHTS_DIFFICULT;

  let attempts = 0;
  // Increased loop limits to vastly improve uniqueness checking capability
  while (attempts < 200) {
    attempts++;
    const subject = pick(subjects);
    
    // Semantic constraint matching: match Verbs to Subject's animacy
    let validVerbs = VERBS.filter(v =>
      (v.difficulty === effectiveDiff || effectiveDiff === 'difficult') &&
      v.tags.some(t => subject.tags.includes(t))
    );

    // If moderate, stick to moderate verb list, fallback to any valid if pool gets strangely constrained
    if (effectiveDiff === 'moderate') {
      const moderateVerbs = validVerbs.filter(v => v.difficulty === 'moderate');
      if (moderateVerbs.length > 0) validVerbs = moderateVerbs;
    }
    // Deep fallback ensuring zero breaking constraints
    if (validVerbs.length === 0) validVerbs = VERBS.filter(v => v.tags.some(t => subject.tags.includes(t)));

    const verbEntry = pick(validVerbs);
    const qType = pick(typePool);

    let q: GeneratedQuestion | null = null;
    switch (qType) {
      case 1: q = generateType1(subject, verbEntry, effectiveDiff); break;
      case 2: q = generateType2(subject, verbEntry, effectiveDiff); break;
      case 3: q = generateType3(subject, verbEntry, effectiveDiff); break;
      case 4: q = generateType4(subject, verbEntry, effectiveDiff); break;
      case 5: q = generateType5(subject, verbEntry, effectiveDiff); break;
      case 6: q = generateType6(subject, verbEntry, effectiveDiff); break;
      case 7: q = generateType7(subject, verbEntry, effectiveDiff); break;
      case 8: q = generateType8(subject, verbEntry, effectiveDiff); break;
    }

    if (q !== null && validateQuestion(q)) {
      recordSignature(q.signature);
      return q;
    }
  }

  // Safe fallback guarantees no crashing. "The captain of the team" avoids any inanimate issues.
  const fallbackSubject = SUBJECTS.find(s => s.text === 'The captain of the team')!;
  const fallbackVerb = VERBS.find(v => v.base === 'play')!;
  return generateType1(fallbackSubject, fallbackVerb, 'moderate')!;
}

// Grammar Validator
export function validateQuestion(q: GeneratedQuestion): boolean {
  if (!q.options || q.options.length < 2) return false;
  
  const correctCount = q.options.filter(o => o.isCorrect).length;
  if (correctCount !== 1) return false;

  const correctOption = q.options.find(o => o.isCorrect);
  if (!correctOption) return false;

  if (!q.explanation) return false;
  if (!q.subject) return false;

  return true;
}

// Test Suite - Must Always Pass
export interface TestResult {
  name: string;
  passed: boolean;
  message: string;
}

export function runTestSuite(): TestResult[] {
  const results: TestResult[] = [];
  
  const testCases: Array<{ subject: string; expectedBe: string; expectedHave: string; expectedVerbForm: 'base' | 'third' }> = [
    { subject: 'I', expectedBe: 'am', expectedHave: 'have', expectedVerbForm: 'base' },
    { subject: 'He', expectedBe: 'is', expectedHave: 'has', expectedVerbForm: 'third' },
    { subject: 'She', expectedBe: 'is', expectedHave: 'has', expectedVerbForm: 'third' },
    { subject: 'It', expectedBe: 'is', expectedHave: 'has', expectedVerbForm: 'third' },
    { subject: 'You', expectedBe: 'are', expectedHave: 'have', expectedVerbForm: 'base' },
    { subject: 'We', expectedBe: 'are', expectedHave: 'have', expectedVerbForm: 'base' },
    { subject: 'They', expectedBe: 'are', expectedHave: 'have', expectedVerbForm: 'base' },
    { subject: 'The boy', expectedBe: 'is', expectedHave: 'has', expectedVerbForm: 'third' },
    { subject: 'The boys', expectedBe: 'are', expectedHave: 'have', expectedVerbForm: 'base' },
    { subject: 'Riya and Tina', expectedBe: 'are', expectedHave: 'have', expectedVerbForm: 'base' },
    { subject: 'Each child', expectedBe: 'is', expectedHave: 'has', expectedVerbForm: 'third' },
    { subject: 'The captain of the team', expectedBe: 'is', expectedHave: 'has', expectedVerbForm: 'third' }, // Updated logic
  ];

  for (const tc of testCases) {
    const subjectEntry = SUBJECTS.find(s => s.text === tc.subject);
    if (!subjectEntry) {
      results.push({ name: tc.subject, passed: false, message: `Subject not found: ${tc.subject}` });
      continue;
    }

    const rules = FAMILY_RULES[subjectEntry.family];
    const beOk = rules.beForm === tc.expectedBe;
    const haveOk = rules.haveForm === tc.expectedHave;
    const verbOk = rules.verbForm === tc.expectedVerbForm;
    const passed = beOk && haveOk && verbOk;

    results.push({
      name: tc.subject,
      passed,
      message: passed
        ? `✅ ${tc.subject}: ${rules.beForm} / ${rules.haveForm} / ${rules.verbForm}`
        : `❌ ${tc.subject}: got ${rules.beForm}/${rules.haveForm}/${rules.verbForm}, expected ${tc.expectedBe}/${tc.expectedHave}/${tc.expectedVerbForm}`,
    });
  }

  // Negative tests - must never produce
  const forbiddenCombos = [
    { subject: 'I', be: 'is' },
    { subject: 'I', be: 'are' },
    { subject: 'He', be: 'are' },
    { subject: 'They', be: 'is' },
  ];

  for (const fc of forbiddenCombos) {
    const subjectEntry = SUBJECTS.find(s => s.text === fc.subject);
    if (subjectEntry) {
      const rules = FAMILY_RULES[subjectEntry.family];
      const forbidden = rules.beForm === fc.be;
      results.push({
        name: `NEVER: ${fc.subject} ${fc.be}`,
        passed: !forbidden,
        message: forbidden ? `❌ FAIL: ${fc.subject} incorrectly maps to ${fc.be}` : `✅ Correctly blocked: ${fc.subject} ≠ ${fc.be}`,
      });
    }
  }

  return results;
}
