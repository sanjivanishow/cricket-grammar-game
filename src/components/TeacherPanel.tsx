// ============================================================
// Grammar Cricket — Teacher Control Panel
// All teacher-facing controls, always accessible
// ============================================================

import React, { useState } from 'react';
import { GamePhase, GameSettings } from '../engine/GameState';

interface TeacherPanelProps {
  phase: GamePhase;
  settings: GameSettings;
  selectedOption: string | null;
  hasQuestion: boolean;
  onSubmitAnswer: () => void;
  onDotBall: () => void;
  onNextQuestion: () => void;
  onRepeatAnimation: () => void;
  onPause: () => void;
  onResume: () => void;
  onEndInnings: () => void;
  onChangeDifficulty: (d: 'moderate' | 'difficult' | 'mixed') => void;
  onAddRuns: (n: number) => void;
  onSubtractRuns: (n: number) => void;
  onAddWicket: () => void;
  onToggleSound: () => void;
  onCrowdVolume: (v: number) => void;
  onEffectsVolume: (v: number) => void;
  onToggleReducedMotion: () => void;
  onToggleFullscreen: () => void;
  onQuitToMenu: () => void;
}

const Btn: React.FC<{
  onClick: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'danger' | 'warning' | 'ghost' | 'success';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  className?: string;
  title?: string;
}> = ({ onClick, disabled, variant = 'ghost', size = 'sm', children, className = '', title }) => {
  const variantClasses = {
    primary: 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-500',
    danger: 'bg-red-700 hover:bg-red-600 text-white border-red-600',
    warning: 'bg-amber-600 hover:bg-amber-500 text-white border-amber-500',
    ghost: 'bg-gray-700 hover:bg-gray-600 text-gray-200 border-gray-600',
    success: 'bg-emerald-700 hover:bg-emerald-600 text-white border-emerald-600',
  };

  const sizeClasses = {
    sm: 'text-xs px-2.5 py-1.5 min-h-[36px]',
    md: 'text-sm px-3 py-2 min-h-[42px]',
    lg: 'text-base px-4 py-2.5 min-h-[48px]',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`
        border rounded-lg font-semibold transition-all duration-100 
        touch-manipulation select-none
        disabled:opacity-40 disabled:cursor-not-allowed
        active:scale-95
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${className}
      `}
    >
      {children}
    </button>
  );
};

const TeacherPanel: React.FC<TeacherPanelProps> = ({
  phase,
  settings,
  selectedOption,
  hasQuestion: _hasQuestion,
  onSubmitAnswer,
  onDotBall,
  onNextQuestion,
  onRepeatAnimation,
  onPause,
  onResume,
  onEndInnings,
  onChangeDifficulty,
  onAddRuns,
  onSubtractRuns,
  onAddWicket,
  onToggleSound,
  onCrowdVolume,
  onEffectsVolume,
  onToggleReducedMotion,
  onToggleFullscreen,
  onQuitToMenu,
}) => {
  const [showDifficultyMenu, setShowDifficultyMenu] = useState(false);
  const [showManualControls, setShowManualControls] = useState(false);
  const [showSoundControls, setShowSoundControls] = useState(false);

  const isQuestion = phase === 'question';
  const isResult = phase === 'result';
  const isAnimation = phase === 'animation';
  const isPaused = phase === 'paused';

  return (
    <div className="bg-gray-900 border-t border-gray-700 p-3">
      {/* Primary action row */}
      <div className="flex flex-wrap gap-2 items-center justify-center mb-2">

        {/* Question phase controls */}
        {isQuestion && (
          <>
            <Btn
              onClick={onSubmitAnswer}
              disabled={!selectedOption}
              variant="primary"
              size="md"
              title="Submit the selected answer (Enter)"
            >
              ✅ Submit Answer
            </Btn>
            <Btn
              onClick={onDotBall}
              variant="ghost"
              size="md"
              title="Register as dot ball — no runs, no wicket"
            >
              • Dot Ball
            </Btn>
          </>
        )}

        {/* Result/animation phase controls */}
        {(isResult || isAnimation) && (
          <>
            <Btn
              onClick={onNextQuestion}
              disabled={isAnimation}
              variant="primary"
              size="md"
              title="Load next question (N)"
            >
              ➡️ Next Question
            </Btn>
            <Btn
              onClick={onRepeatAnimation}
              variant="ghost"
              size="md"
              title="Replay the last cricket animation (R)"
            >
              🔄 Replay
            </Btn>
          </>
        )}

        {/* Pause / Resume */}
        {isPaused ? (
          <Btn onClick={onResume} variant="success" size="md" title="Resume game">
            ▶️ Resume
          </Btn>
        ) : (
          <Btn
            onClick={onPause}
            variant="ghost"
            size="sm"
            title="Pause game (P or Escape)"
          >
            ⏸ Pause
          </Btn>
        )}

        {/* End Innings */}
        {!isPaused && (
          <Btn
            onClick={onEndInnings}
            variant="warning"
            size="sm"
            title="End the current innings"
          >
            🏁 End Innings
          </Btn>
        )}

        {/* Difficulty */}
        <div className="relative">
          <Btn
            onClick={() => setShowDifficultyMenu(v => !v)}
            variant="ghost"
            size="sm"
            title="Change difficulty level (D)"
          >
            📊 Difficulty: {settings.difficulty.charAt(0).toUpperCase() + settings.difficulty.slice(1)}
          </Btn>
          {showDifficultyMenu && (
            <div className="absolute bottom-full mb-1 left-0 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl z-50 p-2 min-w-[150px]">
              {(['moderate', 'difficult', 'mixed'] as const).map(d => (
                <button
                  key={d}
                  onClick={() => { onChangeDifficulty(d); setShowDifficultyMenu(false); }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    settings.difficulty === d
                      ? 'bg-indigo-600 text-white'
                      : 'text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {d === 'moderate' && '🟢 '}
                  {d === 'difficult' && '🔴 '}
                  {d === 'mixed' && '🟡 '}
                  {d.charAt(0).toUpperCase() + d.slice(1)}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Secondary controls */}
      <div className="flex flex-wrap gap-2 items-center justify-center">
        {/* Manual adjustments (for corrections) */}
        <div className="relative">
          <Btn
            onClick={() => setShowManualControls(v => !v)}
            variant="ghost"
            size="sm"
          >
            🔧 Manual
          </Btn>
          {showManualControls && (
            <div className="absolute bottom-full mb-1 left-0 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl z-50 p-3 min-w-[200px]">
              <p className="text-gray-400 text-xs mb-2 font-semibold uppercase tracking-wider">Manual Corrections</p>
              <div className="flex flex-col gap-1.5">
                <button
                  onClick={() => { onAddRuns(1); setShowManualControls(false); }}
                  className="text-left px-3 py-1.5 rounded-lg text-sm text-gray-300 hover:bg-gray-700 transition-colors"
                >
                  ➕ Add 1 Run
                </button>
                <button
                  onClick={() => { onAddRuns(4); setShowManualControls(false); }}
                  className="text-left px-3 py-1.5 rounded-lg text-sm text-gray-300 hover:bg-gray-700 transition-colors"
                >
                  ➕ Add 4 Runs
                </button>
                <button
                  onClick={() => { onAddRuns(6); setShowManualControls(false); }}
                  className="text-left px-3 py-1.5 rounded-lg text-sm text-gray-300 hover:bg-gray-700 transition-colors"
                >
                  ➕ Add 6 Runs
                </button>
                <button
                  onClick={() => { onSubtractRuns(1); setShowManualControls(false); }}
                  className="text-left px-3 py-1.5 rounded-lg text-sm text-gray-300 hover:bg-gray-700 transition-colors"
                >
                  ➖ Subtract 1 Run
                </button>
                <button
                  onClick={() => { onSubtractRuns(4); setShowManualControls(false); }}
                  className="text-left px-3 py-1.5 rounded-lg text-sm text-gray-300 hover:bg-gray-700 transition-colors"
                >
                  ➖ Subtract 4 Runs
                </button>
                <hr className="border-gray-700 my-1" />
                <button
                  onClick={() => { onAddWicket(); setShowManualControls(false); }}
                  className="text-left px-3 py-1.5 rounded-lg text-sm text-red-400 hover:bg-gray-700 transition-colors"
                >
                  ❌ Add Wicket
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sound controls */}
        <div className="relative">
          <Btn
            onClick={() => setShowSoundControls(v => !v)}
            variant="ghost"
            size="sm"
            title="Sound settings"
          >
            {settings.soundEnabled ? '🔊' : '🔇'} Sound
          </Btn>
          {showSoundControls && (
            <div className="absolute bottom-full mb-1 left-0 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl z-50 p-3 min-w-[220px]">
              <p className="text-gray-400 text-xs mb-3 font-semibold uppercase tracking-wider">Sound Settings</p>
              <div className="space-y-3">
                <button
                  onClick={onToggleSound}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    settings.soundEnabled ? 'bg-emerald-800 text-emerald-200' : 'bg-gray-700 text-gray-400'
                  }`}
                >
                  {settings.soundEnabled ? '🔊 Sound ON' : '🔇 Sound OFF'}
                </button>

                <div>
                  <label className="flex items-center justify-between text-gray-400 text-xs mb-1">
                    <span>Crowd</span>
                    <span>{Math.round(settings.crowdVolume * 100)}%</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={settings.crowdVolume}
                    onChange={e => onCrowdVolume(parseFloat(e.target.value))}
                    className="w-full accent-indigo-500"
                    aria-label="Crowd volume"
                  />
                </div>

                <div>
                  <label className="flex items-center justify-between text-gray-400 text-xs mb-1">
                    <span>Effects</span>
                    <span>{Math.round(settings.effectsVolume * 100)}%</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={settings.effectsVolume}
                    onChange={e => onEffectsVolume(parseFloat(e.target.value))}
                    className="w-full accent-indigo-500"
                    aria-label="Effects volume"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Accessibility */}
        <Btn
          onClick={onToggleReducedMotion}
          variant={settings.reducedMotion ? 'warning' : 'ghost'}
          size="sm"
          title="Toggle reduced motion"
        >
          {settings.reducedMotion ? '🐢 Reduced' : '✨ Animations'}
        </Btn>

        {/* Fullscreen */}
        <Btn
          onClick={onToggleFullscreen}
          variant="ghost"
          size="sm"
          title="Toggle fullscreen"
        >
          {settings.fullscreen ? '🔲 Exit FS' : '⛶ Fullscreen'}
        </Btn>

        {/* Quit */}
        {isPaused && (
          <Btn onClick={onQuitToMenu} variant="danger" size="sm">
            🏠 Main Menu
          </Btn>
        )}
      </div>
    </div>
  );
};

export default TeacherPanel;
