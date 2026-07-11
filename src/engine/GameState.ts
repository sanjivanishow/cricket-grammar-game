// ============================================================
// Grammar Cricket — Game State
// Central state types and interfaces for the entire game
// ============================================================

import { GeneratedQuestion } from './QuestionGenerator';

export type GamePhase =
  | 'start'       // Start screen / team entry
  | 'toss'        // Virtual coin toss
  | 'question'    // Grammar question displayed
  | 'animation'   // Cricket animation playing
  | 'result'      // Result shown, waiting for next question
  | 'paused'      // Game paused
  | 'innings_end' // Innings summary
  | 'match_over'; // Final match result

export type CricketOutcome =
  | 'six'
  | 'four'
  | 'three'
  | 'two'
  | 'one'
  | 'run_out'   // 1 run + wicket
  | 'bowled'    // 0 runs + wicket
  | 'dot';      // 0 runs, no wicket

export type AnimationState = 'idle' | 'playing' | 'complete';

export interface TeamState {
  name: string;
  emoji: string;
  color: string;
  runs: number;
  wickets: number;
  balls: number;
  overs: number;
  points: number; // classroom leaderboard points
  batting: boolean;
}

export interface InningsStats {
  teamName: string;
  runs: number;
  wickets: number;
  balls: number;
}

export interface SessionStats {
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  sixes: number;
  fours: number;
  wicketsTaken: number;
  longestStreak: number;
  currentStreak: number;
  totalResponseTime: number; // ms
  moderateAnswered: number;
  difficultAnswered: number;
  dotBalls: number;
}

export interface MatchResult {
  winner: 'team1' | 'team2' | 'tie' | null;
  team1Innings: InningsStats;
  team2Innings: InningsStats;
  stats: SessionStats;
}

export interface GameSettings {
  difficulty: 'moderate' | 'difficult' | 'mixed';
  wicketsPerInnings: number;
  soundEnabled: boolean;
  crowdVolume: number;  // 0-1
  effectsVolume: number; // 0-1
  reducedMotion: boolean;
  fullscreen: boolean;
}

export interface GameState {
  phase: GamePhase;
  currentInnings: 1 | 2;
  battingTeamIndex: 0 | 1; // which team is batting (0 = team1, 1 = team2)
  teams: [TeamState, TeamState];
  currentQuestion: GeneratedQuestion | null;
  selectedOption: string | null;
  lastOutcome: CricketOutcome | null;
  lastOutcomeTime: number | null; // ms taken to answer
  animationState: AnimationState;
  settings: GameSettings;
  stats: SessionStats;
  tossWinner: 0 | 1 | null; // which team won the toss
  tossChoice: 'bat' | 'field' | null;
  questionStartTime: number | null;
  lastQuestion: GeneratedQuestion | null;
  consecutiveCorrect: number; // for mixed mode
  target: number | null; // runs target for second innings
  matchResult: MatchResult | null;
  previousPhase: GamePhase | null; // for returning from pause
  mixedModeLevel: 'moderate' | 'difficult'; // current level in mixed mode
}

// ─────────────────────────────────────────────────────────────
// Initial state
// ─────────────────────────────────────────────────────────────

export function createInitialTeam(name: string, color: string, emoji: string): TeamState {
  return {
    name,
    emoji,
    color,
    runs: 0,
    wickets: 0,
    balls: 0,
    overs: 0,
    points: 0,
    batting: false,
  };
}

export function createInitialStats(): SessionStats {
  return {
    totalQuestions: 0,
    correctAnswers: 0,
    incorrectAnswers: 0,
    sixes: 0,
    fours: 0,
    wicketsTaken: 0,
    longestStreak: 0,
    currentStreak: 0,
    totalResponseTime: 0,
    moderateAnswered: 0,
    difficultAnswered: 0,
    dotBalls: 0,
  };
}

export function createInitialState(): GameState {
  return {
    phase: 'start',
    currentInnings: 1,
    battingTeamIndex: 0,
    teams: [
      createInitialTeam('Team 1', '#22c55e', '🏏'),
      createInitialTeam('Team 2', '#3b82f6', '🏆'),
    ],
    currentQuestion: null,
    selectedOption: null,
    lastOutcome: null,
    lastOutcomeTime: null,
    animationState: 'idle',
    settings: {
      difficulty: 'mixed',
      wicketsPerInnings: 10,
      soundEnabled: true,
      crowdVolume: 0.7,
      effectsVolume: 0.8,
      reducedMotion: false,
      fullscreen: false,
    },
    stats: createInitialStats(),
    tossWinner: null,
    tossChoice: null,
    questionStartTime: null,
    lastQuestion: null,
    consecutiveCorrect: 0,
    target: null,
    matchResult: null,
    previousPhase: null,
    mixedModeLevel: 'moderate',
  };
}

// ─────────────────────────────────────────────────────────────
// Outcome mapping
// ─────────────────────────────────────────────────────────────

export function determineOutcome(
  isCorrect: boolean,
  isPartiallyCorrect: boolean,
  elapsedMs: number
): CricketOutcome {
  if (!isCorrect && !isPartiallyCorrect) {
    return 'bowled';
  }
  if (isPartiallyCorrect) {
    return 'run_out'; // 1 run then out
  }
  // Correct — time-based
  const seconds = elapsedMs / 1000;
  if (seconds < 8) return 'six';
  if (seconds < 15) return 'four';
  if (seconds < 30) return 'three';
  if (seconds < 45) return 'two';
  return 'one';
}

export function getRunsFromOutcome(outcome: CricketOutcome): number {
  switch (outcome) {
    case 'six': return 6;
    case 'four': return 4;
    case 'three': return 3;
    case 'two': return 2;
    case 'one': return 1;
    case 'run_out': return 1;
    case 'bowled': return 0;
    case 'dot': return 0;
  }
}

export function isWicket(outcome: CricketOutcome): boolean {
  return outcome === 'bowled' || outcome === 'run_out';
}

export function getPointsFromOutcome(outcome: CricketOutcome): number {
  switch (outcome) {
    case 'six': return 160;
    case 'four': return 120;
    case 'three': return 80;
    case 'two': return 50;
    case 'one': return 20;
    case 'run_out': return 10;
    case 'bowled': return 0;
    case 'dot': return 0;
  }
}

export function formatOvers(balls: number): string {
  const overs = Math.floor(balls / 6);
  const rem = balls % 6;
  return `${overs}.${rem}`;
}

// ─────────────────────────────────────────────────────────────
// Mixed mode difficulty management
// ─────────────────────────────────────────────────────────────

export function updateMixedMode(state: GameState, wasCorrect: boolean): 'moderate' | 'difficult' {
  if (state.settings.difficulty !== 'mixed') {
    return state.settings.difficulty as 'moderate' | 'difficult';
  }

  let newStreak = wasCorrect ? state.consecutiveCorrect + 1 : 0;
  let newLevel = state.mixedModeLevel;

  if (wasCorrect) {
    if (newStreak >= 6) {
      newLevel = 'difficult';
    } else if (newStreak >= 3) {
      newLevel = 'difficult';
    }
  } else {
    // Step down one level after wrong answer
    newLevel = 'moderate';
  }

  return newLevel;
}
