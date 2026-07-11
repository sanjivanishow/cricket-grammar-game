// ============================================================
// Grammar Cricket — Question Display Component
// Shows grammar question with answer options
// ============================================================

import React, { useEffect, useCallback } from 'react';
import { GeneratedQuestion } from '../engine/QuestionGenerator';

interface QuestionDisplayProps {
  question: GeneratedQuestion;
  selectedOption: string | null;
  onSelectOption: (value: string) => void;
  submitted: boolean;
  revealed: boolean; // After submission, show correct/wrong
}

// ─────────────────────────────────────────────────────────────
// Question type labels
// ─────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<number, string> = {
  1: 'Complete the be form',
  2: 'Complete have or has',
  3: 'Complete the action verb',
  4: 'Fill in two blanks',
  5: 'Choose the correct family',
  6: 'Find the incorrect sentence',
  7: 'Identify the grammar family',
  8: 'Repair the family',
};

// ─────────────────────────────────────────────────────────────
// Render sentences with blanks highlighted
// ─────────────────────────────────────────────────────────────

function renderSentence(sentence: string, hasBlank: boolean, revealed: boolean, correctAnswer: string): React.ReactNode {
  if (!hasBlank) {
    return (
      <span className="text-gray-200">{sentence}</span>
    );
  }

  // Split on _____ to find blank position
  const parts = sentence.split('_____');
  if (parts.length < 2) {
    return <span className="text-gray-200">{sentence}</span>;
  }

  // The blank answer may have multiple parts (e.g. "has / walks")
  const answerParts = correctAnswer.split(' / ');
  const blankText = revealed ? (
    <span className="inline-block bg-emerald-500 text-white font-bold px-2 py-0.5 rounded mx-1 text-base">
      {answerParts[0]}
    </span>
  ) : (
    <span className="inline-block border-b-4 border-amber-400 bg-amber-400/10 min-w-[60px] text-center px-2 py-0 mx-1 font-bold text-amber-300">
      ___
    </span>
  );

  // Handle two blanks (_____ appearing twice in sentence)
  if (parts.length === 3) {
    const blank2Text = revealed ? (
      <span className="inline-block bg-emerald-500 text-white font-bold px-2 py-0.5 rounded mx-1 text-base">
        {answerParts[1] || ''}
      </span>
    ) : (
      <span className="inline-block border-b-4 border-amber-400 bg-amber-400/10 min-w-[60px] text-center px-2 py-0 mx-1 font-bold text-amber-300">
        ___
      </span>
    );
    return (
      <span className="text-gray-200">
        {parts[0]}{blankText}{parts[1]}{blank2Text}{parts[2]}
      </span>
    );
  }

  return (
    <span className="text-gray-200">
      {parts[0]}{blankText}{parts[1]}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────

const QuestionDisplay: React.FC<QuestionDisplayProps> = ({
  question,
  selectedOption,
  onSelectOption,
  submitted,
  revealed,
}) => {
  const { type, sentences, blankIndices, options, correctAnswer, subject } = question;

  // Keyboard: 1-4 to select options
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (submitted) return;
    const keyMap: Record<string, number> = { '1': 0, '2': 1, '3': 2, '4': 3 };
    if (e.key in keyMap) {
      const idx = keyMap[e.key];
      if (options[idx]) {
        onSelectOption(options[idx].value);
      }
    }
  }, [submitted, options, onSelectOption]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);



  // For type 6: sentences are shown as numbered items with one being wrong
  // For type 5: options ARE the sentence sets
  // For type 7: single subject identity question

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Type label */}
      <div className="flex items-center gap-2">
        <span className="bg-indigo-900/60 text-indigo-300 text-xs font-semibold px-2 py-1 rounded-full border border-indigo-700/50">
          {TYPE_LABELS[type] || 'Grammar Question'}
        </span>
        <span className="text-gray-500 text-xs">
          Subject: <span className="text-gray-300 font-medium">{subject.text}</span>
          {subject.displayHint && (
            <span className="text-amber-400 ml-1">({subject.displayHint})</span>
          )}
        </span>
      </div>

      {/* Question sentences */}
      {type === 5 ? (
        // Type 5: Show a prompt, options are the full sentence sets
        <div className="bg-gray-800/60 rounded-xl p-5 border border-gray-700/50">
          <p className="text-white text-xl font-semibold text-center">
            {sentences[0]}
          </p>
          <p className="text-gray-400 text-sm text-center mt-2">
            All three sentences must use the correct grammar family.
          </p>
        </div>
      ) : type === 7 ? (
        // Type 7: Identity question
        <div className="bg-gray-800/60 rounded-xl p-5 border border-gray-700/50">
          <p className="text-white text-xl font-semibold text-center">
            {sentences[0]}
          </p>
          <p className="text-gray-400 text-sm text-center mt-2">
            Choose: <em>be form – have/has – verb form</em>
          </p>
        </div>
      ) : type === 6 ? (
        // Type 6: Numbered sentences, find the wrong one
        <div className="bg-gray-800/60 rounded-xl p-5 border border-gray-700/50 space-y-3">
          <p className="text-gray-400 text-sm font-medium mb-1">Which sentence contains a grammar error?</p>
          {sentences.map((s, i) => {
            const isWrong = revealed && question.correctAnswer === `Sentence ${i + 1}`;
            return (
              <div
                key={i}
                className={`flex items-start gap-3 p-2 rounded-lg transition-colors ${isWrong ? 'bg-red-900/30 border border-red-500/50' : 'bg-gray-700/30'}`}
              >
                <span className="text-gray-500 font-bold text-sm w-6 flex-shrink-0">{i + 1}.</span>
                <span className={`text-lg ${isWrong ? 'text-red-300 line-through decoration-red-400' : 'text-gray-200'}`}>
                  {s}
                </span>
              </div>
            );
          })}
        </div>
      ) : type === 8 ? (
        // Type 8: Repair - show sentences with one error
        <div className="bg-gray-800/60 rounded-xl p-5 border border-gray-700/50 space-y-3">
          <p className="text-gray-400 text-sm font-medium mb-1">One word is wrong. Which word must be changed?</p>
          {sentences.map((s, i) => (
            <div key={i} className="flex items-start gap-3 p-2 rounded-lg bg-gray-700/30">
              <span className="text-gray-500 font-bold text-sm w-6 flex-shrink-0">{i + 1}.</span>
              <span className="text-gray-200 text-lg">{s}</span>
            </div>
          ))}
        </div>
      ) : (
        // Types 1-4: Three-sentence family with blanks
        <div className="bg-gray-800/60 rounded-xl p-5 border border-gray-700/50">
          <div className="space-y-0">
            {sentences.map((sentence, i) => {
              const hasBlank = blankIndices.includes(i);
              // For two-blank questions (Type 4), split correctAnswer by ' / '
              const answerParts = correctAnswer.split(' / ');
              const blankIdx = blankIndices.indexOf(i);
              const thisAnswer = blankIdx >= 0 ? (answerParts[blankIdx] || answerParts[0]) : correctAnswer;

              return (
                <div key={i} className="relative">
                  <div className={`text-xl py-2 leading-relaxed ${hasBlank ? 'font-medium' : ''}`}>
                    {renderSentence(sentence, hasBlank, revealed && hasBlank, thisAnswer)}
                  </div>
                  {/* Arrow operator alignment */}
                  {i < sentences.length - 1 && (
                    <div className="flex items-center gap-1 my-0 ml-4">
                      <div className="w-px h-3 bg-gray-600" />
                      <span className="text-gray-600 text-xs">↓</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Answer options */}
      <div
        className={`grid gap-3 ${options.length <= 3 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'}`}
        role="radiogroup"
        aria-label="Answer options"
      >
        {options.map((opt, idx) => {
          const isSelected = selectedOption === opt.value;
          const showResult = submitted && revealed;
          const isCorrectOpt = opt.isCorrect;

          let optionClass = 'border-2 ';
          let statusIcon = null;

          if (showResult) {
            if (isCorrectOpt) {
              optionClass += 'border-emerald-500 bg-emerald-900/40 text-emerald-100';
              statusIcon = <span className="text-emerald-400 text-lg">✓</span>;
            } else if (isSelected && !isCorrectOpt) {
              optionClass += 'border-red-500 bg-red-900/40 text-red-200';
              statusIcon = <span className="text-red-400 text-lg">✗</span>;
            } else {
              optionClass += 'border-gray-700 bg-gray-800/40 text-gray-500';
            }
          } else if (isSelected) {
            optionClass += 'border-amber-400 bg-amber-900/30 text-amber-100 shadow-amber-400/20 shadow-lg';
          } else {
            optionClass += 'border-gray-700 bg-gray-800/50 text-gray-200 hover:border-indigo-500 hover:bg-indigo-900/20 hover:text-white';
          }

          return (
            <button
              key={idx}
              role="radio"
              aria-checked={isSelected}
              aria-label={`Option ${opt.label}: ${opt.value}`}
              disabled={submitted}
              onClick={() => !submitted && onSelectOption(opt.value)}
              className={`relative flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-150 text-left min-h-[52px] touch-manipulation ${optionClass} ${submitted ? 'cursor-not-allowed' : 'cursor-pointer'}`}
            >
              {/* Option label */}
              <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border-2 ${
                showResult && isCorrectOpt ? 'border-emerald-400 bg-emerald-800 text-emerald-200' :
                showResult && isSelected && !isCorrectOpt ? 'border-red-400 bg-red-800 text-red-200' :
                isSelected ? 'border-amber-400 bg-amber-800 text-amber-200' :
                'border-gray-600 bg-gray-700 text-gray-300'
              }`}>
                {opt.label}
              </span>

              {/* Option text */}
              <span className={`flex-1 text-base font-medium leading-tight ${type === 5 ? 'text-sm' : ''}`}>
                {type === 5 ? (
                  // Type 5: Show formatted sentence set
                  <span className="whitespace-pre-line text-xs">{opt.value}</span>
                ) : (
                  opt.value
                )}
              </span>

              {/* Keyboard shortcut */}
              {!submitted && (
                <span className="flex-shrink-0 text-gray-600 text-xs hidden sm:block">
                  [{idx + 1}]
                </span>
              )}

              {/* Status icon */}
              {statusIcon && (
                <span className="flex-shrink-0">{statusIcon}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default QuestionDisplay;
