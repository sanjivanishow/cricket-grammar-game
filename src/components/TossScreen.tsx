// ============================================================
// Grammar Cricket — Toss Animation Screen
// Virtual coin toss with animation
// ============================================================

import React, { useState } from 'react';

interface TossScreenProps {
  team1Name: string;
  team2Name: string;
  team1Emoji: string;
  team2Emoji: string;
  onTossComplete: (winnerIndex: 0 | 1, choice: 'bat' | 'field') => void;
}

type TossState = 'ready' | 'flipping' | 'result';

const TossScreen: React.FC<TossScreenProps> = ({
  team1Name,
  team2Name,
  team1Emoji,
  team2Emoji,
  onTossComplete,
}) => {
  const [tossState, setTossState] = useState<TossState>('ready');
  const [winner, setWinner] = useState<0 | 1 | null>(null);
  const [coinRotation, setCoinRotation] = useState(0);
  const [coinFace, setCoinFace] = useState<'heads' | 'tails'>('heads');

  const handleToss = () => {
    if (tossState !== 'ready') return;
    setTossState('flipping');

    // Animate coin
    let frames = 0;
    const totalFrames = 30;
    const interval = setInterval(() => {
      frames++;
      setCoinRotation(prev => prev + 24);
      setCoinFace(frames % 2 === 0 ? 'heads' : 'tails');

      if (frames >= totalFrames) {
        clearInterval(interval);
        const winnerIdx = Math.random() < 0.5 ? 0 : 1;
        const finalFace = Math.random() < 0.5 ? 'heads' : 'tails';
        setWinner(winnerIdx as 0 | 1);
        setCoinFace(finalFace);
        setTossState('result');
      }
    }, 50);
  };

  const handleChoice = (choice: 'bat' | 'field') => {
    if (winner !== null) {
      onTossComplete(winner, choice);
    }
  };

  const winnerName = winner === 0 ? team1Name : winner === 1 ? team2Name : '';
  const winnerEmoji = winner === 0 ? team1Emoji : winner === 1 ? team2Emoji : '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-indigo-950 to-gray-950 flex items-center justify-center p-4">
      <div className="text-center max-w-lg w-full">
        <h1 className="text-4xl font-black text-white mb-2">🏏 Grammar Cricket</h1>
        <h2 className="text-2xl font-bold text-indigo-300 mb-8">The Toss</h2>

        {/* Teams */}
        <div className="flex items-center justify-center gap-6 mb-8">
          <div className="text-center">
            <div className="text-4xl mb-1">{team1Emoji}</div>
            <div className="text-white font-bold text-lg">{team1Name}</div>
          </div>
          <div className="text-gray-500 text-2xl font-bold">vs</div>
          <div className="text-center">
            <div className="text-4xl mb-1">{team2Emoji}</div>
            <div className="text-white font-bold text-lg">{team2Name}</div>
          </div>
        </div>

        {/* Coin */}
        <div className="flex justify-center mb-8">
          <div
            className="relative w-32 h-32 flex items-center justify-center"
            style={{
              perspective: '600px',
            }}
          >
            <div
              className={`w-32 h-32 rounded-full flex items-center justify-center text-5xl font-black shadow-2xl transition-transform`}
              style={{
                transform: `rotateY(${coinRotation}deg)`,
                background: coinFace === 'heads'
                  ? 'linear-gradient(135deg, #f59e0b, #d97706, #b45309)'
                  : 'linear-gradient(135deg, #6b7280, #9ca3af, #6b7280)',
                boxShadow: '0 0 40px rgba(245, 158, 11, 0.3), inset 0 2px 4px rgba(255,255,255,0.2)',
                transition: tossState === 'flipping' ? 'transform 0.05s linear' : 'transform 0.3s ease-out',
              }}
            >
              <span className="select-none">
                {coinFace === 'heads' ? '🏏' : '🦁'}
              </span>
            </div>
          </div>
        </div>

        {/* State: Ready */}
        {tossState === 'ready' && (
          <div className="space-y-4">
            <p className="text-gray-400 text-base">
              Click to flip the coin!
            </p>
            <button
              onClick={handleToss}
              className="bg-amber-500 hover:bg-amber-400 text-gray-900 font-black text-xl py-4 px-10 rounded-2xl transition-all active:scale-95 shadow-xl shadow-amber-900/40"
            >
              🪙 Flip the Coin!
            </button>
          </div>
        )}

        {/* State: Flipping */}
        {tossState === 'flipping' && (
          <div>
            <p className="text-amber-400 text-xl font-bold animate-pulse">
              ✨ Flipping...
            </p>
          </div>
        )}

        {/* State: Result */}
        {tossState === 'result' && winner !== null && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-gray-800/80 border border-amber-500/40 rounded-2xl p-5">
              <div className="text-3xl mb-2">{winnerEmoji}</div>
              <h3 className="text-2xl font-black text-amber-400 mb-1">
                {winnerName} wins the toss!
              </h3>
              <p className="text-gray-400 text-base">
                Choose to bat or field first:
              </p>
            </div>

            <div className="flex gap-4 justify-center">
              <button
                onClick={() => handleChoice('bat')}
                className="flex-1 max-w-[160px] bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-lg py-4 px-6 rounded-xl transition-all active:scale-95 shadow-lg"
              >
                🏏 Bat First
              </button>
              <button
                onClick={() => handleChoice('field')}
                className="flex-1 max-w-[160px] bg-blue-700 hover:bg-blue-600 text-white font-bold text-lg py-4 px-6 rounded-xl transition-all active:scale-95 shadow-lg"
              >
                🏃 Field First
              </button>
            </div>

            <p className="text-gray-600 text-sm">
              The other team will bat second and chase the target.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TossScreen;
