// ============================================================
// Grammar Cricket — Scoreboard Component
// Always visible during gameplay
// ============================================================

import React from 'react';
import { TeamState, formatOvers } from '../engine/GameState';

interface ScoreboardProps {
  team1: TeamState;
  team2: TeamState;
  currentInnings: 1 | 2;
  battingTeamIndex: 0 | 1;
  target: number | null;
  difficulty: string;
  streak: number;
  maxWickets: number;
}

const Scoreboard: React.FC<ScoreboardProps> = ({
  team1,
  team2,
  currentInnings,
  battingTeamIndex,
  target,
  difficulty,
  streak,
  maxWickets,
}) => {
  const battingTeam = battingTeamIndex === 0 ? team1 : team2;

  const difficultyColor = {
    moderate: 'text-emerald-400',
    difficult: 'text-red-400',
    mixed: 'text-amber-400',
  }[difficulty] || 'text-gray-400';

  const difficultyLabel = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);

  const streakDots = Array.from({ length: Math.min(streak, 6) }, (_, i) => (
    <span
      key={i}
      className={`inline-block w-3 h-3 rounded-full ${i < streak ? 'bg-emerald-400' : 'bg-gray-600'}`}
      aria-hidden="true"
    />
  ));

  return (
    <div className="bg-gray-900 border-b border-gray-700 px-4 py-2">
      <div className="flex items-center justify-between gap-4 max-w-full">
        
        {/* Team 1 Score */}
        <div className={`flex items-center gap-2 min-w-0 flex-1 ${battingTeamIndex === 0 ? 'opacity-100' : 'opacity-70'}`}>
          <span className="text-2xl" aria-hidden="true">{team1.emoji}</span>
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              {battingTeamIndex === 0 && (
                <span className="text-amber-400 text-xs font-bold">🏏</span>
              )}
              <span className="text-white font-bold text-sm truncate">{team1.name}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className={`text-2xl font-black ${battingTeamIndex === 0 ? 'text-white' : 'text-gray-400'}`}>
                {team1.runs}/{team1.wickets}
              </span>
              {team1.balls > 0 && (
                <span className="text-gray-500 text-xs">({formatOvers(team1.balls)} ov)</span>
              )}
            </div>
          </div>
        </div>

        {/* Centre: vs / innings / difficulty / streak */}
        <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
          <div className="text-gray-500 text-xs font-semibold uppercase tracking-wider">
            {currentInnings === 1 ? '1st Innings' : '2nd Innings'}
          </div>
          <div className="text-gray-400 text-sm font-bold">vs</div>
          {target !== null && currentInnings === 2 && (
            <div className="text-amber-400 text-xs font-semibold">
              Target: {target}
            </div>
          )}
          <div className={`text-xs font-semibold ${difficultyColor}`}>
            {difficultyLabel}
          </div>
          {streak > 0 && (
            <div className="flex items-center gap-0.5" aria-label={`Streak: ${streak} correct answers`}>
              {streakDots}
            </div>
          )}
        </div>

        {/* Team 2 Score */}
        <div className={`flex items-center gap-2 min-w-0 flex-1 justify-end ${battingTeamIndex === 1 ? 'opacity-100' : 'opacity-70'}`}>
          <div className="min-w-0 text-right">
            <div className="flex items-center gap-1 justify-end">
              <span className="text-white font-bold text-sm truncate">{team2.name}</span>
              {battingTeamIndex === 1 && (
                <span className="text-amber-400 text-xs font-bold">🏏</span>
              )}
            </div>
            <div className="flex items-center gap-1 justify-end">
              {team2.balls > 0 && (
                <span className="text-gray-500 text-xs">({formatOvers(team2.balls)} ov)</span>
              )}
              <span className={`text-2xl font-black ${battingTeamIndex === 1 ? 'text-white' : 'text-gray-400'}`}>
                {battingTeamIndex === 1 || currentInnings === 2 ? `${team2.runs}/${team2.wickets}` : '—'}
              </span>
            </div>
          </div>
          <span className="text-2xl" aria-hidden="true">{team2.emoji}</span>
        </div>
      </div>

      {/* Run required for second innings */}
      {currentInnings === 2 && target !== null && (
        <div className="mt-1 text-center">
          {(() => {
            const runsNeeded = target - battingTeam.runs;
            if (runsNeeded <= 0) {
              return <span className="text-emerald-400 text-xs font-bold">🏆 {battingTeam.name} wins!</span>;
            }
            return (
              <span className="text-amber-300 text-xs">
                {battingTeam.name} needs {runsNeeded} more run{runsNeeded !== 1 ? 's' : ''} to win
                {' · '}{maxWickets - battingTeam.wickets} wicket{maxWickets - battingTeam.wickets !== 1 ? 's' : ''} remaining
              </span>
            );
          })()}
        </div>
      )}
    </div>
  );
};

export default Scoreboard;
