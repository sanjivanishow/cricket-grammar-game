// ============================================================
// Grammar Cricket — How To Play Screen
// ============================================================

import React from 'react';

interface HowToPlayProps {
  onClose: () => void;
}

const HowToPlay: React.FC<HowToPlayProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl my-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-800">
          <div>
            <h2 className="text-2xl font-black text-white">❓ How to Play</h2>
            <p className="text-gray-400 text-sm">Grammar Cricket — Teacher's Guide</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-800 transition-colors"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="p-5 space-y-5 overflow-y-auto max-h-[80vh]">

          {/* Game Loop */}
          <section>
            <h3 className="text-lg font-bold text-indigo-400 mb-2">🔄 The Game Loop</h3>
            <ol className="space-y-1.5 text-gray-300 text-sm">
              <li className="flex gap-2"><span className="text-indigo-400 font-bold">1.</span> A grammar question appears on screen.</li>
              <li className="flex gap-2"><span className="text-indigo-400 font-bold">2.</span> Students discuss and choose an answer as a class.</li>
              <li className="flex gap-2"><span className="text-indigo-400 font-bold">3.</span> The teacher selects the answer and presses <strong className="text-white">Submit</strong>.</li>
              <li className="flex gap-2"><span className="text-indigo-400 font-bold">4.</span> A cricket animation plays — runs or a wicket!</li>
              <li className="flex gap-2"><span className="text-indigo-400 font-bold">5.</span> The teacher presses <strong className="text-white">Next Question</strong> to continue.</li>
            </ol>
          </section>

          {/* Answer outcomes */}
          <section>
            <h3 className="text-lg font-bold text-amber-400 mb-2">🏏 Cricket Outcomes</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              <div className="bg-gray-800/60 rounded-xl p-3 border border-emerald-700/40">
                <div className="font-bold text-emerald-400">⭐ SIX — under 8 seconds</div>
                <div className="text-gray-400">Maximum! Ball clears the boundary.</div>
              </div>
              <div className="bg-gray-800/60 rounded-xl p-3 border border-emerald-700/40">
                <div className="font-bold text-emerald-300">🏏 FOUR — 8-15 seconds</div>
                <div className="text-gray-400">Boundary hit. Great timing!</div>
              </div>
              <div className="bg-gray-800/60 rounded-xl p-3 border border-blue-700/40">
                <div className="font-bold text-blue-300">🏃 3 RUNS — 15-30 seconds</div>
                <div className="text-gray-400">Running between wickets.</div>
              </div>
              <div className="bg-gray-800/60 rounded-xl p-3 border border-blue-700/40">
                <div className="font-bold text-blue-300">🏃 2 RUNS — 30-45 seconds</div>
                <div className="text-gray-400">Safe but slower running.</div>
              </div>
              <div className="bg-gray-800/60 rounded-xl p-3 border border-gray-600">
                <div className="font-bold text-gray-300">• 1 RUN — over 45 seconds</div>
                <div className="text-gray-400">Scrambled single.</div>
              </div>
              <div className="bg-gray-800/60 rounded-xl p-3 border border-red-700/40">
                <div className="font-bold text-red-400">🎯 BOWLED — wrong answer</div>
                <div className="text-gray-400">Ball hits the stumps. Wicket!</div>
              </div>
              <div className="bg-gray-800/60 rounded-xl p-3 border border-orange-700/40">
                <div className="font-bold text-orange-400">🚨 RUN OUT — half right</div>
                <div className="text-gray-400">1 run + wicket. One blank correct.</div>
              </div>
              <div className="bg-gray-800/60 rounded-xl p-3 border border-gray-600">
                <div className="font-bold text-gray-400">• DOT BALL — teacher skips</div>
                <div className="text-gray-400">No run, no wicket.</div>
              </div>
            </div>
          </section>

          {/* Grammar */}
          <section>
            <h3 className="text-lg font-bold text-purple-400 mb-2">📚 The Three Grammar Families</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
              <div className="bg-gray-800/60 rounded-xl p-3 border border-purple-700/40">
                <div className="font-bold text-purple-300 mb-1">Family A — "I"</div>
                <div className="text-gray-300">I <strong>am</strong> happy.</div>
                <div className="text-gray-300">I <strong>have</strong> a ball.</div>
                <div className="text-gray-300">I <strong>play</strong> cricket.</div>
                <div className="text-gray-500 text-xs mt-1">am / have / base verb</div>
              </div>
              <div className="bg-gray-800/60 rounded-xl p-3 border border-blue-700/40">
                <div className="font-bold text-blue-300 mb-1">Family B — He/She/It</div>
                <div className="text-gray-300">He <strong>is</strong> happy.</div>
                <div className="text-gray-300">He <strong>has</strong> a ball.</div>
                <div className="text-gray-300">He <strong>plays</strong> cricket.</div>
                <div className="text-gray-500 text-xs mt-1">is / has / verb+s</div>
              </div>
              <div className="bg-gray-800/60 rounded-xl p-3 border border-emerald-700/40">
                <div className="font-bold text-emerald-300 mb-1">Family C — They/We/You</div>
                <div className="text-gray-300">They <strong>are</strong> happy.</div>
                <div className="text-gray-300">They <strong>have</strong> balls.</div>
                <div className="text-gray-300">They <strong>play</strong> cricket.</div>
                <div className="text-gray-500 text-xs mt-1">are / have / base verb</div>
              </div>
            </div>
          </section>

          {/* Keyboard shortcuts */}
          <section>
            <h3 className="text-lg font-bold text-gray-300 mb-2">⌨️ Keyboard Shortcuts</h3>
            <div className="grid grid-cols-2 gap-1 text-sm text-gray-400">
              <div><kbd className="bg-gray-800 border border-gray-700 rounded px-1.5 py-0.5 text-gray-300 text-xs">1-4</kbd> Select answer</div>
              <div><kbd className="bg-gray-800 border border-gray-700 rounded px-1.5 py-0.5 text-gray-300 text-xs">Enter</kbd> Submit</div>
              <div><kbd className="bg-gray-800 border border-gray-700 rounded px-1.5 py-0.5 text-gray-300 text-xs">N</kbd> Next question</div>
              <div><kbd className="bg-gray-800 border border-gray-700 rounded px-1.5 py-0.5 text-gray-300 text-xs">R</kbd> Replay animation</div>
              <div><kbd className="bg-gray-800 border border-gray-700 rounded px-1.5 py-0.5 text-gray-300 text-xs">P / Esc</kbd> Pause</div>
              <div><kbd className="bg-gray-800 border border-gray-700 rounded px-1.5 py-0.5 text-gray-300 text-xs">D</kbd> Change difficulty</div>
            </div>
          </section>

          {/* Teacher tips */}
          <section>
            <h3 className="text-lg font-bold text-amber-400 mb-2">💡 Teacher Tips</h3>
            <ul className="space-y-1.5 text-gray-300 text-sm">
              <li className="flex gap-2"><span className="text-amber-400">•</span> Project on a screen — font sizes are optimised for classroom viewing.</li>
              <li className="flex gap-2"><span className="text-amber-400">•</span> Use <strong>Mixed</strong> difficulty to keep all students engaged.</li>
              <li className="flex gap-2"><span className="text-amber-400">•</span> The timer runs silently — faster answers earn more runs!</li>
              <li className="flex gap-2"><span className="text-amber-400">•</span> Use <strong>Dot Ball</strong> to skip a question without penalty.</li>
              <li className="flex gap-2"><span className="text-amber-400">•</span> Use <strong>Manual Controls</strong> to correct any scoring errors.</li>
              <li className="flex gap-2"><span className="text-amber-400">•</span> Each correct answer includes an explanation for learning reinforcement.</li>
            </ul>
          </section>
        </div>

        <div className="p-5 border-t border-gray-800">
          <button
            onClick={onClose}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition-all active:scale-95"
          >
            Got it! Let's Play 🏏
          </button>
        </div>
      </div>
    </div>
  );
};

export default HowToPlay;
