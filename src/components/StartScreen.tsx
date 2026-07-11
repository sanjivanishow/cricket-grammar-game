// ============================================================
// Grammar Cricket — Start Screen
// Team entry, difficulty selection, and game settings
// ============================================================

import React, { useState } from 'react';
import { GameSettings } from '../engine/GameState';

interface StartScreenProps {
  onStartMatch: (team1Name: string, team2Name: string, settings: Partial<GameSettings>) => void;
  onHowToPlay: () => void;
}


const PRESET_TEAMS = [
  { name: 'India', emoji: '🇮🇳' },
  { name: 'Australia', emoji: '🇦🇺' },
  { name: 'England', emoji: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { name: 'New Zealand', emoji: '🇳🇿' },
  { name: 'South Africa', emoji: '🇿🇦' },
  { name: 'West Indies', emoji: '🏝️' },
  { name: 'Pakistan', emoji: '🇵🇰' },
  { name: 'Sri Lanka', emoji: '🇱🇰' },
];

const StartScreen: React.FC<StartScreenProps> = ({ onStartMatch, onHowToPlay }) => {
  const [team1Name, setTeam1Name] = useState('Team 1');
  const [team2Name, setTeam2Name] = useState('Team 2');
  const [_team1Emoji, setTeam1Emoji] = useState('🏏');
  const [_team2Emoji, setTeam2Emoji] = useState('🏆');
  const [difficulty, setDifficulty] = useState<'moderate' | 'difficult' | 'mixed'>('mixed');
  const [wickets, setWickets] = useState(10);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const handleStart = () => {
    if (!team1Name.trim() || !team2Name.trim()) return;
    onStartMatch(team1Name.trim(), team2Name.trim(), {
      difficulty,
      wicketsPerInnings: wickets,
      soundEnabled,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleStart();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-indigo-950 to-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-3" aria-hidden="true">🏏</div>
          <h1 className="text-5xl font-black text-white tracking-tight mb-1">
            Grammar Cricket
          </h1>
          <p className="text-indigo-300 text-lg">
            A classroom grammar game — where English meets cricket!
          </p>
        </div>

        {/* Card */}
        <div className="bg-gray-900/80 backdrop-blur-sm border border-gray-700/60 rounded-2xl p-6 shadow-2xl">

          {/* Team Entry */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
            {/* Team 1 */}
            <div className="space-y-2">
              <label className="text-gray-300 text-sm font-semibold uppercase tracking-wider block">
                🏠 Team 1 (Batting First)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={team1Name}
                  onChange={e => setTeam1Name(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter team name..."
                  maxLength={20}
                  className="flex-1 bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2.5 text-base focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 placeholder-gray-600"
                  aria-label="Team 1 name"
                />
              </div>
              <div className="flex gap-1 flex-wrap">
                {PRESET_TEAMS.slice(0, 4).map(t => (
                  <button
                    key={t.name}
                    onClick={() => { setTeam1Name(t.name); setTeam1Emoji(t.emoji); }}
                    className="text-xs px-2 py-1 bg-gray-800 hover:bg-indigo-800 text-gray-400 hover:text-white rounded-lg border border-gray-700 transition-colors"
                  >
                    {t.emoji} {t.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Team 2 */}
            <div className="space-y-2">
              <label className="text-gray-300 text-sm font-semibold uppercase tracking-wider block">
                ✈️ Team 2 (Batting Second)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={team2Name}
                  onChange={e => setTeam2Name(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter team name..."
                  maxLength={20}
                  className="flex-1 bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2.5 text-base focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 placeholder-gray-600"
                  aria-label="Team 2 name"
                />
              </div>
              <div className="flex gap-1 flex-wrap">
                {PRESET_TEAMS.slice(4, 8).map(t => (
                  <button
                    key={t.name}
                    onClick={() => { setTeam2Name(t.name); setTeam2Emoji(t.emoji); }}
                    className="text-xs px-2 py-1 bg-gray-800 hover:bg-indigo-800 text-gray-400 hover:text-white rounded-lg border border-gray-700 transition-colors"
                  >
                    {t.emoji} {t.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <hr className="border-gray-800 my-4" />

          {/* Difficulty */}
          <div className="mb-4">
            <label className="text-gray-300 text-sm font-semibold uppercase tracking-wider block mb-2">
              📊 Difficulty
            </label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { value: 'moderate', label: '🟢 Moderate', desc: 'Common pronouns & simple verbs' },
                { value: 'difficult', label: '🔴 Difficult', desc: 'Complex subjects & spelling changes' },
                { value: 'mixed', label: '🟡 Mixed', desc: 'Adapts to student performance' },
              ] as const).map(d => (
                <button
                  key={d.value}
                  onClick={() => setDifficulty(d.value)}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${
                    difficulty === d.value
                      ? 'border-indigo-500 bg-indigo-900/50 text-white'
                      : 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-600 hover:text-gray-300'
                  }`}
                  aria-pressed={difficulty === d.value}
                >
                  <div className="font-semibold text-sm">{d.label}</div>
                  <div className="text-xs mt-0.5 opacity-70">{d.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Options row */}
          <div className="flex flex-wrap gap-4 items-center mb-6">
            {/* Wickets */}
            <div className="flex items-center gap-2">
              <label className="text-gray-400 text-sm">⚡ Wickets per innings:</label>
              <select
                value={wickets}
                onChange={e => setWickets(parseInt(e.target.value))}
                className="bg-gray-800 border border-gray-700 text-white rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-indigo-500"
                aria-label="Wickets per innings"
              >
                {[3, 5, 7, 10].map(n => (
                  <option key={n} value={n}>{n} wickets</option>
                ))}
              </select>
            </div>

            {/* Sound */}
            <button
              onClick={() => setSoundEnabled(v => !v)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                soundEnabled
                  ? 'border-emerald-700 bg-emerald-900/30 text-emerald-300'
                  : 'border-gray-700 bg-gray-800 text-gray-500'
              }`}
              aria-pressed={soundEnabled}
            >
              {soundEnabled ? '🔊 Sound ON' : '🔇 Sound OFF'}
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={handleStart}
              disabled={!team1Name.trim() || !team2Name.trim()}
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-lg py-3 px-6 rounded-xl transition-all active:scale-95 shadow-lg shadow-indigo-900/40"
            >
              🏏 Start Match
            </button>
            <button
              onClick={onHowToPlay}
              className="bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold py-3 px-4 rounded-xl border border-gray-700 transition-all active:scale-95"
            >
              ❓ How to Play
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-600 text-sm mt-4">
          Press <kbd className="bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded border border-gray-700 text-xs">Enter</kbd> to start
        </p>
      </div>
    </div>
  );
};

export default StartScreen;
