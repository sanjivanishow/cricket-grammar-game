// ============================================================
// Grammar Cricket — Result Panel
// Shows after animation: correct answer and explanation
// ============================================================

import React from 'react';
import { CricketOutcome, getRunsFromOutcome, isWicket } from '../engine/GameState';
import { GeneratedQuestion } from '../engine/QuestionGenerator';

interface ResultPanelProps {
  outcome: CricketOutcome;
  question: GeneratedQuestion;
  selectedOption: string | null;
  elapsedSeconds: number;
}

const OUTCOME_CONFIG: Record<CricketOutcome, { 
  emoji: string; 
  label: string; 
  color: string;
  bgColor: string;
  borderColor: string;
  message: string;
}> = {
  six: {
    emoji: '⭐',
    label: 'SIX!',
    color: 'text-amber-300',
    bgColor: 'bg-amber-900/30',
    borderColor: 'border-amber-500/50',
    message: 'Outstanding! Maximum runs!',
  },
  four: {
    emoji: '🏏',
    label: 'FOUR!',
    color: 'text-emerald-300',
    bgColor: 'bg-emerald-900/30',
    borderColor: 'border-emerald-500/50',
    message: 'Excellent! Boundary!',
  },
  three: {
    emoji: '🏃',
    label: '3 RUNS',
    color: 'text-blue-300',
    bgColor: 'bg-blue-900/20',
    borderColor: 'border-blue-500/40',
    message: 'Great! Three runs!',
  },
  two: {
    emoji: '🏃',
    label: '2 RUNS',
    color: 'text-blue-300',
    bgColor: 'bg-blue-900/20',
    borderColor: 'border-blue-500/40',
    message: 'Good! Two runs!',
  },
  one: {
    emoji: '•',
    label: '1 RUN',
    color: 'text-gray-300',
    bgColor: 'bg-gray-800/40',
    borderColor: 'border-gray-600/40',
    message: 'Single taken.',
  },
  run_out: {
    emoji: '🚨',
    label: 'RUN OUT!',
    color: 'text-orange-300',
    bgColor: 'bg-orange-900/20',
    borderColor: 'border-orange-500/40',
    message: 'One blank was correct — but wicket falls!',
  },
  bowled: {
    emoji: '🎯',
    label: 'BOWLED!',
    color: 'text-red-400',
    bgColor: 'bg-red-900/20',
    borderColor: 'border-red-500/40',
    message: 'Wrong answer — clean bowled!',
  },
  dot: {
    emoji: '•',
    label: 'DOT BALL',
    color: 'text-gray-400',
    bgColor: 'bg-gray-800/30',
    borderColor: 'border-gray-700/30',
    message: 'No run, no wicket.',
  },
};

const ResultPanel: React.FC<ResultPanelProps> = ({
  outcome,
  question,
  selectedOption,
  elapsedSeconds,
}) => {
  const config = OUTCOME_CONFIG[outcome];
  const runs = getRunsFromOutcome(outcome);
  const wicketFell = isWicket(outcome);
  const wasCorrect = outcome !== 'bowled' && outcome !== 'dot';
  const wasWrong = outcome === 'bowled';

  const correctOption = question.options.find(o => o.isCorrect);
  const selectedIsCorrect = selectedOption === correctOption?.value;

  return (
    <div className={`rounded-xl border p-4 ${config.bgColor} ${config.borderColor}`}>
      {/* Outcome header */}
      <div className="flex items-center gap-3 mb-3">
        <span className="text-3xl">{config.emoji}</span>
        <div>
          <div className={`text-2xl font-black ${config.color}`}>{config.label}</div>
          <div className="text-gray-400 text-sm">{config.message}</div>
        </div>
        <div className="ml-auto text-right">
          {runs > 0 && (
            <div className="text-emerald-400 font-bold text-lg">+{runs} run{runs !== 1 ? 's' : ''}</div>
          )}
          {wicketFell && (
            <div className="text-red-400 font-bold text-sm">Wicket! ❌</div>
          )}
          <div className="text-gray-600 text-xs">⏱ {elapsedSeconds}s</div>
        </div>
      </div>

      <hr className="border-gray-700/50 mb-3" />

      {/* Correct answer */}
      <div className="space-y-2">
        <div className="flex items-start gap-2">
          <span className={`text-sm font-semibold ${wasCorrect && !wicketFell ? 'text-emerald-400' : 'text-red-400'}`}>
            {wasCorrect && !wicketFell ? '✓ Correct!' : wasWrong ? '✗ Wrong:' : '⚠ Partial:'}
          </span>
          <span className="text-white font-bold text-sm">
            {correctOption?.value || question.correctAnswer}
          </span>
        </div>

        {/* Grammar explanation */}
        <div className={`text-sm p-2.5 rounded-lg ${wasCorrect && !wicketFell ? 'bg-emerald-950/40 text-emerald-300' : 'bg-gray-800/60 text-gray-300'}`}>
          <span className="font-semibold">💡 </span>
          {question.explanation}
        </div>

        {/* Encouragement for wrong answers */}
        {wasWrong && (
          <div className="text-gray-400 text-sm italic">
            Don't worry! Remember: <span className="text-amber-300">{question.explanation.split('→')[0]}</span>
          </div>
        )}

        {/* What they selected (if wrong) */}
        {selectedOption && !selectedIsCorrect && selectedOption !== '' && (
          <div className="text-gray-500 text-xs">
            You chose: <span className="text-red-400 line-through">{selectedOption}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResultPanel;
