// ============================================================
// Grammar Cricket — Match Over Screen
// Final score, result, and full session statistics
// ============================================================

import React, { useEffect } from 'react';
import { MatchResult } from '../engine/GameState';

interface MatchOverScreenProps {
  result: MatchResult;
  team1Name: string;
  team2Name: string;
  team1Emoji: string;
  team2Emoji: string;
  onPlayAgain: () => void;
  onNewTeams: () => void;
  onMainMenu: () => void;
}

const StatBox: React.FC<{ label: string; value: string | number; highlight?: boolean }> = ({ label, value, highlight }) => (
  <div className={`bg-gray-800/60 border rounded-xl p-3 text-center ${highlight ? 'border-amber-500/50' : 'border-gray-700/50'}`}>
    <div className={`text-2xl font-black ${highlight ? 'text-amber-400' : 'text-white'}`}>{value}</div>
    <div className="text-gray-400 text-xs mt-0.5">{label}</div>
  </div>
);

const MatchOverScreen: React.FC<MatchOverScreenProps> = ({
  result,
  team1Name,
  team2Name,
  team1Emoji,
  team2Emoji,
  onPlayAgain,
  onNewTeams,
  onMainMenu,
}) => {
  const { winner, team1Innings, team2Innings, stats } = result;

  const winnerName = winner === 'team1' ? team1Name
    : winner === 'team2' ? team2Name
    : null;

  const winnerEmoji = winner === 'team1' ? team1Emoji
    : winner === 'team2' ? team2Emoji
    : '🤝';

  const accuracy = stats.totalQuestions > 0
    ? Math.round((stats.correctAnswers / stats.totalQuestions) * 100)
    : 0;

  const avgTime = stats.correctAnswers > 0
    ? Math.round(stats.totalResponseTime / stats.correctAnswers / 1000)
    : 0;

  // Keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'r' || e.key === 'R') {
        onPlayAgain();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onPlayAgain]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-indigo-950 to-gray-950 flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-2xl py-6">

        {/* Result banner */}
        <div className={`text-center mb-6 p-6 rounded-2xl border ${
          winner === 'tie' ? 'border-amber-500/40 bg-amber-900/20' : 'border-emerald-500/40 bg-emerald-900/20'
        }`}>
          <div className="text-6xl mb-3">{winnerEmoji}</div>
          {winner === 'tie' ? (
            <>
              <h1 className="text-4xl font-black text-amber-400 mb-1">IT'S A TIE!</h1>
              <p className="text-gray-300 text-lg">An incredible match — honours shared!</p>
            </>
          ) : (
            <>
              <h1 className="text-4xl font-black text-emerald-400 mb-1">
                {winnerName} WIN!
              </h1>
              <p className="text-gray-300 text-lg">Congratulations on a fantastic match!</p>
            </>
          )}
        </div>

        {/* Cricket scorecard */}
        <div className="bg-gray-900/80 border border-gray-700/60 rounded-2xl p-5 mb-5">
          <h2 className="text-gray-400 text-sm font-semibold uppercase tracking-wider mb-4">🏏 Final Scorecard</h2>

          <div className="grid grid-cols-2 gap-4">
            {/* Team 1 */}
            <div className={`p-4 rounded-xl border ${winner === 'team1' ? 'border-emerald-500/50 bg-emerald-900/20' : 'border-gray-700/50 bg-gray-800/40'}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{team1Emoji}</span>
                <span className="text-white font-bold">{team1Name}</span>
                {winner === 'team1' && <span className="text-emerald-400 text-sm">🏆</span>}
              </div>
              <div className="text-3xl font-black text-white">
                {team1Innings.runs}/{team1Innings.wickets}
              </div>
              <div className="text-gray-500 text-sm">
                {team1Innings.balls} ball{team1Innings.balls !== 1 ? 's' : ''}
              </div>
            </div>

            {/* Team 2 */}
            <div className={`p-4 rounded-xl border ${winner === 'team2' ? 'border-emerald-500/50 bg-emerald-900/20' : 'border-gray-700/50 bg-gray-800/40'}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{team2Emoji}</span>
                <span className="text-white font-bold">{team2Name}</span>
                {winner === 'team2' && <span className="text-emerald-400 text-sm">🏆</span>}
              </div>
              <div className="text-3xl font-black text-white">
                {team2Innings.runs}/{team2Innings.wickets}
              </div>
              <div className="text-gray-500 text-sm">
                {team2Innings.balls} ball{team2Innings.balls !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
        </div>

        {/* Session statistics */}
        <div className="bg-gray-900/80 border border-gray-700/60 rounded-2xl p-5 mb-5">
          <h2 className="text-gray-400 text-sm font-semibold uppercase tracking-wider mb-4">📊 Session Statistics</h2>

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-4">
            <StatBox label="Questions" value={stats.totalQuestions} />
            <StatBox label="Correct" value={stats.correctAnswers} highlight />
            <StatBox label="Wrong" value={stats.incorrectAnswers} />
            <StatBox label="Accuracy" value={`${accuracy}%`} highlight />
            <StatBox label="Sixes" value={stats.sixes} highlight />
            <StatBox label="Fours" value={stats.fours} />
            <StatBox label="Wickets" value={stats.wicketsTaken} />
            <StatBox label="Dot Balls" value={stats.dotBalls} />
            <StatBox label="Best Streak" value={stats.longestStreak} highlight />
            <StatBox label="Avg Time" value={`${avgTime}s`} />
            <StatBox label="Moderate" value={stats.moderateAnswered} />
            <StatBox label="Difficult" value={stats.difficultAnswered} />
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={onPlayAgain}
            className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-lg py-3.5 px-6 rounded-xl transition-all active:scale-95 shadow-lg shadow-indigo-900/40"
          >
            🔁 Play Again (Same Teams)
          </button>
          <button
            onClick={onNewTeams}
            className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-bold py-3.5 px-6 rounded-xl border border-gray-700 transition-all active:scale-95"
          >
            👥 New Teams
          </button>
          <button
            onClick={onMainMenu}
            className="bg-gray-800 hover:bg-gray-700 text-gray-400 font-semibold py-3.5 px-5 rounded-xl border border-gray-700 transition-all active:scale-95"
          >
            🏠 Menu
          </button>
        </div>

        <p className="text-center text-gray-600 text-sm mt-3">
          Press <kbd className="bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded border border-gray-700 text-xs">Enter</kbd> or{' '}
          <kbd className="bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded border border-gray-700 text-xs">R</kbd> to play again
        </p>
      </div>
    </div>
  );
};

export default MatchOverScreen;
