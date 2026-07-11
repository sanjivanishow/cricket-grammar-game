// ============================================================
// Grammar Cricket — Innings End Screen
// Summary between innings
// ============================================================

import React from 'react';
import { TeamState } from '../engine/GameState';

interface InningsEndScreenProps {
  inningsNumber: 1 | 2;
  battingTeam: TeamState;
  fieldingTeam: TeamState;
  target: number | null;
  onContinue: () => void;
}

const InningsEndScreen: React.FC<InningsEndScreenProps> = ({
  inningsNumber,
  battingTeam,
  fieldingTeam,
  target,
  onContinue,
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-indigo-950 to-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-lg text-center">

        <div className="text-5xl mb-4">
          {inningsNumber === 1 ? '🏁' : '🏆'}
        </div>

        <h2 className="text-3xl font-black text-white mb-2">
          {inningsNumber === 1 ? 'End of First Innings' : 'End of Second Innings'}
        </h2>

        {/* Batting team result */}
        <div className="bg-gray-900/80 border border-gray-700/60 rounded-2xl p-6 mb-5 mt-4">
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="text-4xl">{battingTeam.emoji}</span>
            <div>
              <div className="text-white font-bold text-xl">{battingTeam.name}</div>
              <div className="text-gray-400 text-sm">Batting Team</div>
            </div>
          </div>

          <div className="text-5xl font-black text-white mb-1">
            {battingTeam.runs}/{battingTeam.wickets}
          </div>
          <div className="text-gray-400 text-sm">
            {battingTeam.balls} ball{battingTeam.balls !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Target for second innings */}
        {inningsNumber === 1 && target !== null && (
          <div className="bg-amber-900/30 border border-amber-500/40 rounded-2xl p-5 mb-5">
            <div className="text-amber-300 text-sm font-semibold uppercase tracking-wider mb-1">Target</div>
            <div className="text-4xl font-black text-amber-400 mb-1">{target}</div>
            <div className="text-gray-300 text-base">
              <span className="font-bold">{fieldingTeam.name}</span> needs{' '}
              <strong>{target} runs</strong> to win
            </div>
            <div className="text-gray-500 text-sm mt-1">
              Now it's {fieldingTeam.name}'s turn to bat!
            </div>
          </div>
        )}

        {inningsNumber === 2 && (
          <div className="bg-gray-800/60 border border-gray-700/50 rounded-2xl p-5 mb-5">
            <div className="text-gray-300 text-base">
              {fieldingTeam.runs > battingTeam.runs ? (
                <>
                  <span className="font-bold text-emerald-400">{fieldingTeam.name}</span> scored {fieldingTeam.runs} in the first innings.
                </>
              ) : fieldingTeam.runs < battingTeam.runs ? (
                <>
                  <span className="font-bold text-emerald-400">{battingTeam.name}</span> successfully chased the target!
                </>
              ) : (
                <>It's a tie! Both teams scored {battingTeam.runs}.</>
              )}
            </div>
          </div>
        )}

        <button
          onClick={onContinue}
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xl py-4 px-8 rounded-2xl transition-all active:scale-95 shadow-xl shadow-indigo-900/40"
        >
          {inningsNumber === 1
            ? `🏏 Start 2nd Innings — ${fieldingTeam.name} to bat`
            : '🏆 See Final Result'}
        </button>
      </div>
    </div>
  );
};

export default InningsEndScreen;
