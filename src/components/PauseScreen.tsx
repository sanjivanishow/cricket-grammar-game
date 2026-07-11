// ============================================================
// Grammar Cricket — Pause Screen
// Overlay shown when game is paused
// ============================================================

import React, { useEffect } from 'react';

interface PauseScreenProps {
  onResume: () => void;
  onRepeatAnimation: () => void;
  onChangeDifficulty: (d: 'moderate' | 'difficult' | 'mixed') => void;
  onEndInnings: () => void;
  onQuitToMenu: () => void;
  currentDifficulty: 'moderate' | 'difficult' | 'mixed';
  canRepeat: boolean;
}

const PauseScreen: React.FC<PauseScreenProps> = ({
  onResume,
  onRepeatAnimation,
  onChangeDifficulty,
  onEndInnings,
  onQuitToMenu,
  currentDifficulty,
  canRepeat,
}) => {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        onResume();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onResume]);

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-40 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl text-center">

        <div className="text-5xl mb-4">⏸</div>
        <h2 className="text-3xl font-black text-white mb-1">Game Paused</h2>
        <p className="text-gray-400 text-sm mb-6">The question is waiting. Correct answer is hidden.</p>

        <div className="space-y-2">
          <button
            onClick={onResume}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 px-6 rounded-xl transition-all active:scale-95 text-lg"
          >
            ▶️ Resume Game
          </button>

          {canRepeat && (
            <button
              onClick={onRepeatAnimation}
              className="w-full bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold py-3 px-6 rounded-xl border border-gray-700 transition-all active:scale-95"
            >
              🔄 Repeat Last Animation
            </button>
          )}

          <div className="pt-2">
            <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">Change Difficulty</p>
            <div className="flex gap-2">
              {(['moderate', 'difficult', 'mixed'] as const).map(d => (
                <button
                  key={d}
                  onClick={() => onChangeDifficulty(d)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all border ${
                    currentDifficulty === d
                      ? 'bg-indigo-600 border-indigo-500 text-white'
                      : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600 hover:text-gray-300'
                  }`}
                >
                  {d === 'moderate' ? '🟢' : d === 'difficult' ? '🔴' : '🟡'}{' '}
                  {d.charAt(0).toUpperCase() + d.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <hr className="border-gray-800 my-2" />

          <button
            onClick={onEndInnings}
            className="w-full bg-amber-700/60 hover:bg-amber-700 text-amber-200 font-semibold py-2.5 px-6 rounded-xl border border-amber-700/50 transition-all active:scale-95"
          >
            🏁 End Innings
          </button>

          <button
            onClick={onQuitToMenu}
            className="w-full bg-red-900/40 hover:bg-red-900/60 text-red-400 font-semibold py-2.5 px-6 rounded-xl border border-red-900/60 transition-all active:scale-95"
          >
            🏠 Quit to Main Menu
          </button>
        </div>

        <p className="text-gray-700 text-xs mt-4">
          Press <kbd className="bg-gray-800 text-gray-500 px-1 rounded text-xs">P</kbd> or{' '}
          <kbd className="bg-gray-800 text-gray-500 px-1 rounded text-xs">Esc</kbd> to resume
        </p>
      </div>
    </div>
  );
};

export default PauseScreen;
