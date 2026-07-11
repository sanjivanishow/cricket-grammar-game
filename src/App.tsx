// ============================================================
// Grammar Cricket — Main Application
// Orchestrates all game phases and state
// ============================================================

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  GameState,
  GamePhase,
  createInitialState,
  createInitialTeam,
  determineOutcome,
  getRunsFromOutcome,
  isWicket,
  getPointsFromOutcome,
  updateMixedMode,
  MatchResult,
  InningsStats,
  TeamState,
} from './engine/GameState';
import { generateQuestion } from './engine/QuestionGenerator';
import { audioManager } from './engine/AudioManager';

// Screens
import StartScreen from './components/StartScreen';
import TossScreen from './components/TossScreen';
import MatchOverScreen from './components/MatchOverScreen';
import HowToPlay from './components/HowToPlay';
import InningsEndScreen from './components/InningsEndScreen';
import PauseScreen from './components/PauseScreen';

// Game UI components
import Scoreboard from './components/Scoreboard';
import QuestionDisplay from './components/QuestionDisplay';
import TeacherPanel from './components/TeacherPanel';
import ResultPanel from './components/ResultPanel';
import CricketCanvas from './components/CricketCanvas';

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function getEffectiveDifficulty(state: GameState): 'moderate' | 'difficult' {
  const d = state.settings.difficulty;
  if (d === 'mixed') return state.mixedModeLevel;
  return d as 'moderate' | 'difficult';
}

// ─────────────────────────────────────────────────────────────
// Main App
// ─────────────────────────────────────────────────────────────

export default function App() {
  const [gameState, setGameState] = useState<GameState>(createInitialState());
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [animationKey, setAnimationKey] = useState(0); // Force re-mount to replay

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const questionStartTimeRef = useRef<number>(Date.now());

  // ─────────────────────────────────────────────────────────────
  // Sync audio settings
  // ─────────────────────────────────────────────────────────────

  useEffect(() => {
    audioManager.setEnabled(gameState.settings.soundEnabled);
    audioManager.setCrowdVolume(gameState.settings.crowdVolume);
    audioManager.setEffectsVolume(gameState.settings.effectsVolume);
  }, [gameState.settings.soundEnabled, gameState.settings.crowdVolume, gameState.settings.effectsVolume]);

  // ─────────────────────────────────────────────────────────────
  // Fullscreen management
  // ─────────────────────────────────────────────────────────────

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setGameState(s => ({ ...s, settings: { ...s.settings, fullscreen: true } }));
    } else {
      document.exitFullscreen().catch(() => {});
      setGameState(s => ({ ...s, settings: { ...s.settings, fullscreen: false } }));
    }
  }, []);

  // ─────────────────────────────────────────────────────────────
  // Global keyboard shortcuts
  // ─────────────────────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const phase = gameState.phase;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;

      switch (e.key) {
        case 'Enter':
          if (phase === 'question' && gameState.selectedOption) {
            handleSubmitAnswer();
          }
          break;
        case 'n':
        case 'N':
          if (phase === 'result') handleNextQuestion();
          break;
        case 'r':
        case 'R':
          if (phase === 'result') handleRepeatAnimation();
          break;
        case 'p':
        case 'P':
        case 'Escape':
          if (phase === 'question' || phase === 'result') handlePause();
          break;
        case 'd':
        case 'D':
          // Toggle difficulty menu — handled in TeacherPanel
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [gameState.phase, gameState.selectedOption]);

  // ─────────────────────────────────────────────────────────────
  // START SCREEN
  // ─────────────────────────────────────────────────────────────

  const handleStartMatch = useCallback((team1Name: string, team2Name: string, settings: Partial<typeof gameState.settings>) => {
    audioManager.playClick();
    setGameState(prev => ({
      ...createInitialState(),
      phase: 'toss',
      teams: [
        createInitialTeam(team1Name, '#22c55e', '🏏'),
        createInitialTeam(team2Name, '#3b82f6', '🏆'),
      ],
      settings: { ...prev.settings, ...settings },
    }));
  }, []);

  // ─────────────────────────────────────────────────────────────
  // TOSS
  // ─────────────────────────────────────────────────────────────

  const handleTossComplete = useCallback((winnerIndex: 0 | 1, choice: 'bat' | 'field') => {
    audioManager.playToss();

    let battingTeamIndex: 0 | 1;
    if (choice === 'bat') {
      battingTeamIndex = winnerIndex;
    } else {
      battingTeamIndex = winnerIndex === 0 ? 1 : 0;
    }

    const initialQuestion = generateQuestion('moderate');

    setGameState(prev => ({
      ...prev,
      phase: 'question',
      tossWinner: winnerIndex,
      tossChoice: choice,
      battingTeamIndex,
      currentQuestion: initialQuestion,
      questionStartTime: Date.now(),
    }));
    questionStartTimeRef.current = Date.now();
    audioManager.playCrowdAmbience();
  }, []);

  // ─────────────────────────────────────────────────────────────
  // QUESTION PHASE
  // ─────────────────────────────────────────────────────────────

  const handleSelectOption = useCallback((value: string) => {
    audioManager.playClick();
    setGameState(prev => ({ ...prev, selectedOption: value }));
  }, []);

  const handleSubmitAnswer = useCallback(() => {
    setGameState(prev => {
      if (prev.phase !== 'question' || !prev.currentQuestion) return prev;
      if (!prev.selectedOption) return prev;

      const elapsed = Date.now() - (prev.questionStartTime || Date.now());
      const elapsedSec = Math.round(elapsed / 1000);
      setElapsedSeconds(elapsedSec);

      const question = prev.currentQuestion;
      const correctOption = question.options.find(o => o.isCorrect);

      // Determine correctness
      const isCorrect = prev.selectedOption === correctOption?.value;

      // For two-blank questions: check partial correctness
      let isPartiallyCorrect = false;
      if (!isCorrect && question.blankIndices.length === 2) {
        const selectedParts = prev.selectedOption.split(' / ');
        const correctParts = question.correctAnswer.split(' / ');
        if (selectedParts.length === 2 && correctParts.length === 2) {
          const oneRight = (selectedParts[0] === correctParts[0]) || (selectedParts[1] === correctParts[1]);
          isPartiallyCorrect = oneRight;
        }
      }

      const outcome = determineOutcome(isCorrect, isPartiallyCorrect, elapsed);
      const runs = getRunsFromOutcome(outcome);
      const wicket = isWicket(outcome);
      const points = getPointsFromOutcome(outcome);

      // Update stats
      const newStats = { ...prev.stats };
      newStats.totalQuestions++;
      if (question.difficulty === 'moderate') newStats.moderateAnswered++;
      else newStats.difficultAnswered++;
      newStats.totalResponseTime += elapsed;

      if (isCorrect) {
        newStats.correctAnswers++;
        newStats.currentStreak++;
        if (newStats.currentStreak > newStats.longestStreak) {
          newStats.longestStreak = newStats.currentStreak;
        }
      } else {
        newStats.incorrectAnswers++;
        newStats.currentStreak = 0;
      }

      if (outcome === 'six') newStats.sixes++;
      if (outcome === 'four') newStats.fours++;
      if (wicket) newStats.wicketsTaken++;

      // Update batting team score
      const newTeams: [TeamState, TeamState] = [{ ...prev.teams[0] }, { ...prev.teams[1] }];
      const battingIdx = prev.battingTeamIndex;
      newTeams[battingIdx] = {
        ...newTeams[battingIdx],
        runs: newTeams[battingIdx].runs + runs,
        wickets: newTeams[battingIdx].wickets + (wicket ? 1 : 0),
        balls: newTeams[battingIdx].balls + 1,
        points: newTeams[battingIdx].points + points,
      };

      // Mixed mode difficulty update
      const newMixedLevel = updateMixedMode(
        { ...prev, consecutiveCorrect: isCorrect ? prev.consecutiveCorrect + 1 : 0 },
        isCorrect
      );

      // Play sounds
      if (outcome === 'six') audioManager.playSixCelebration();
      else if (outcome === 'four') audioManager.playFourCelebration();
      else if (outcome === 'bowled' || outcome === 'run_out') {
        audioManager.playStumpsHit();
        audioManager.playWicketCelebration();
      } else if (runs > 0) {
        audioManager.playBatHitForOutcome(outcome);
        audioManager.playRunsSound(runs);
      }

      audioManager.playScoreboardTick();

      return {
        ...prev,
        phase: 'animation',
        lastOutcome: outcome,
        lastOutcomeTime: elapsed,
        animationState: 'playing',
        teams: newTeams,
        stats: newStats,
        consecutiveCorrect: isCorrect ? prev.consecutiveCorrect + 1 : 0,
        mixedModeLevel: newMixedLevel,
        lastQuestion: question,
      };
    });

    setAnimationKey(k => k + 1);
  }, []);

  // ─────────────────────────────────────────────────────────────
  // DOT BALL (teacher-initiated skip)
  // ─────────────────────────────────────────────────────────────

  const handleDotBall = useCallback(() => {
    audioManager.playClick();
    setGameState(prev => {
      if (prev.phase !== 'question') return prev;

      const newStats = { ...prev.stats };
      newStats.totalQuestions++;
      newStats.dotBalls++;
      newStats.currentStreak = 0;

      const newTeams: [TeamState, TeamState] = [{ ...prev.teams[0] }, { ...prev.teams[1] }];
      const battingIdx = prev.battingTeamIndex;
      newTeams[battingIdx] = {
        ...newTeams[battingIdx],
        balls: newTeams[battingIdx].balls + 1,
      };

      return {
        ...prev,
        phase: 'animation',
        lastOutcome: 'dot',
        animationState: 'playing',
        teams: newTeams,
        stats: newStats,
        lastQuestion: prev.currentQuestion,
      };
    });
    setAnimationKey(k => k + 1);
  }, []);

  // ─────────────────────────────────────────────────────────────
  // ANIMATION COMPLETE
  // ─────────────────────────────────────────────────────────────

  const handleAnimationComplete = useCallback(() => {
    setGameState(prev => {
      if (prev.phase !== 'animation') return prev;

      const battingTeam = prev.teams[prev.battingTeamIndex];
      const maxWickets = prev.settings.wicketsPerInnings;

      // Check if innings should end automatically
      const inningsOver = battingTeam.wickets >= maxWickets;

      // Check if chasing team has won
      let chaserWon = false;
      if (prev.currentInnings === 2 && prev.target !== null) {
        chaserWon = battingTeam.runs > prev.target;
      }

      if (chaserWon) {
        // Immediate win
        return {
          ...prev,
          phase: 'innings_end',
          animationState: 'complete',
        };
      }

      if (inningsOver) {
        return {
          ...prev,
          phase: 'innings_end',
          animationState: 'complete',
        };
      }

      return {
        ...prev,
        phase: 'result',
        animationState: 'complete',
      };
    });
  }, []);

  // ─────────────────────────────────────────────────────────────
  // NEXT QUESTION
  // ─────────────────────────────────────────────────────────────

  const handleNextQuestion = useCallback(() => {
    audioManager.playClick();
    setGameState(prev => {
      const diff = getEffectiveDifficulty(prev);
      const question = generateQuestion(diff);
      return {
        ...prev,
        phase: 'question',
        currentQuestion: question,
        selectedOption: null,
        questionStartTime: Date.now(),
        animationState: 'idle',
      };
    });
    questionStartTimeRef.current = Date.now();
  }, []);

  // ─────────────────────────────────────────────────────────────
  // REPEAT ANIMATION
  // ─────────────────────────────────────────────────────────────

  const handleRepeatAnimation = useCallback(() => {
    audioManager.playClick();
    setGameState(prev => {
      if (!prev.lastOutcome) return prev;
      return {
        ...prev,
        phase: 'animation',
        animationState: 'playing',
      };
    });
    setAnimationKey(k => k + 1);
  }, []);

  // ─────────────────────────────────────────────────────────────
  // PAUSE / RESUME
  // ─────────────────────────────────────────────────────────────

  const handlePause = useCallback(() => {
    audioManager.playClick();
    setGameState(prev => {
      if (prev.phase === 'paused') return prev;
      return { ...prev, phase: 'paused', previousPhase: prev.phase };
    });
  }, []);

  const handleResume = useCallback(() => {
    audioManager.playClick();
    setGameState(prev => {
      if (prev.phase !== 'paused') return prev;
      const returnPhase: GamePhase = prev.previousPhase || 'question';
      // Adjust question start time to account for pause duration
      return {
        ...prev,
        phase: returnPhase,
        previousPhase: null,
        questionStartTime: prev.questionStartTime ? Date.now() : null, // Reset timer on resume
      };
    });
  }, []);

  // ─────────────────────────────────────────────────────────────
  // END INNINGS
  // ─────────────────────────────────────────────────────────────

  const handleEndInnings = useCallback(() => {
    audioManager.playClick();
    setGameState(prev => ({ ...prev, phase: 'innings_end' }));
  }, []);

  const handleInningsContinue = useCallback(() => {
    audioManager.playClick();
    setGameState(prev => {
      if (prev.currentInnings === 1) {
        // Start second innings
        const firstInningsRuns = prev.teams[prev.battingTeamIndex].runs;
        const newTarget = firstInningsRuns + 1;
        const newBattingTeamIndex: 0 | 1 = prev.battingTeamIndex === 0 ? 1 : 0;

        const diff = getEffectiveDifficulty(prev);
        const question = generateQuestion(diff);

        return {
          ...prev,
          phase: 'question',
          currentInnings: 2,
          battingTeamIndex: newBattingTeamIndex,
          target: newTarget,
          currentQuestion: question,
          selectedOption: null,
          questionStartTime: Date.now(),
          animationState: 'idle',
        };
      } else {
        // Match over — calculate result
        const team1 = prev.teams[0];
        const team2 = prev.teams[1];

        let winner: 'team1' | 'team2' | 'tie' | null = null;
        if (team1.runs > team2.runs) winner = 'team1';
        else if (team2.runs > team1.runs) winner = 'team2';
        else winner = 'tie';

        const team1Innings: InningsStats = {
          teamName: team1.name,
          runs: team1.runs,
          wickets: team1.wickets,
          balls: team1.balls,
        };
        const team2Innings: InningsStats = {
          teamName: team2.name,
          runs: team2.runs,
          wickets: team2.wickets,
          balls: team2.balls,
        };

        const matchResult: MatchResult = {
          winner,
          team1Innings,
          team2Innings,
          stats: prev.stats,
        };

        audioManager.playMatchOver();

        return {
          ...prev,
          phase: 'match_over',
          matchResult,
        };
      }
    });
    questionStartTimeRef.current = Date.now();
  }, []);

  // ─────────────────────────────────────────────────────────────
  // SETTINGS HANDLERS
  // ─────────────────────────────────────────────────────────────

  const handleChangeDifficulty = useCallback((d: 'moderate' | 'difficult' | 'mixed') => {
    setGameState(prev => ({
      ...prev,
      settings: { ...prev.settings, difficulty: d },
      mixedModeLevel: d === 'mixed' ? 'moderate' : (d as 'moderate' | 'difficult'),
    }));
  }, []);

  const handleAddRuns = useCallback((n: number) => {
    setGameState(prev => {
      const newTeams: [TeamState, TeamState] = [{ ...prev.teams[0] }, { ...prev.teams[1] }];
      newTeams[prev.battingTeamIndex] = {
        ...newTeams[prev.battingTeamIndex],
        runs: Math.max(0, newTeams[prev.battingTeamIndex].runs + n),
      };
      return { ...prev, teams: newTeams };
    });
    audioManager.playScoreboardTick();
  }, []);

  const handleSubtractRuns = useCallback((n: number) => {
    handleAddRuns(-n);
  }, [handleAddRuns]);

  const handleAddWicket = useCallback(() => {
    setGameState(prev => {
      const newTeams: [TeamState, TeamState] = [{ ...prev.teams[0] }, { ...prev.teams[1] }];
      newTeams[prev.battingTeamIndex] = {
        ...newTeams[prev.battingTeamIndex],
        wickets: Math.min(prev.settings.wicketsPerInnings, newTeams[prev.battingTeamIndex].wickets + 1),
      };
      return { ...prev, teams: newTeams };
    });
  }, []);

  const handleToggleSound = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      settings: { ...prev.settings, soundEnabled: !prev.settings.soundEnabled },
    }));
  }, []);

  const handleCrowdVolume = useCallback((v: number) => {
    setGameState(prev => ({
      ...prev,
      settings: { ...prev.settings, crowdVolume: v },
    }));
    audioManager.setCrowdVolume(v);
  }, []);

  const handleEffectsVolume = useCallback((v: number) => {
    setGameState(prev => ({
      ...prev,
      settings: { ...prev.settings, effectsVolume: v },
    }));
    audioManager.setEffectsVolume(v);
  }, []);

  const handleToggleReducedMotion = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      settings: { ...prev.settings, reducedMotion: !prev.settings.reducedMotion },
    }));
  }, []);

  // ─────────────────────────────────────────────────────────────
  // MATCH OVER ACTIONS
  // ─────────────────────────────────────────────────────────────

  const handlePlayAgain = useCallback(() => {
    const { teams, settings } = gameState;
    setGameState({
      ...createInitialState(),
      phase: 'toss',
      teams: [
        createInitialTeam(teams[0].name, '#22c55e', '🏏'),
        createInitialTeam(teams[1].name, '#3b82f6', '🏆'),
      ],
      settings,
    });
  }, [gameState.teams, gameState.settings]);

  const handleNewTeams = useCallback(() => {
    setGameState(createInitialState());
  }, []);

  const handleMainMenu = useCallback(() => {
    setGameState(createInitialState());
  }, []);

  // ─────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────

  const { phase, teams, currentQuestion, selectedOption, lastOutcome, settings, stats } = gameState;

  // ── Start Screen ──
  if (phase === 'start') {
    return (
      <>
        <StartScreen
          onStartMatch={handleStartMatch}
          onHowToPlay={() => setShowHowToPlay(true)}
        />
        {showHowToPlay && <HowToPlay onClose={() => setShowHowToPlay(false)} />}
      </>
    );
  }

  // ── Toss Screen ──
  if (phase === 'toss') {
    return (
      <TossScreen
        team1Name={teams[0].name}
        team2Name={teams[1].name}
        team1Emoji={teams[0].emoji}
        team2Emoji={teams[1].emoji}
        onTossComplete={handleTossComplete}
      />
    );
  }

  // ── Innings End ──
  if (phase === 'innings_end') {
    const battingTeam = teams[gameState.battingTeamIndex];
    const fieldingTeamIdx = gameState.battingTeamIndex === 0 ? 1 : 0;
    const fieldingTeam = teams[fieldingTeamIdx];

    return (
      <InningsEndScreen
        inningsNumber={gameState.currentInnings}
        battingTeam={battingTeam}
        fieldingTeam={fieldingTeam}
        target={gameState.target}
        onContinue={handleInningsContinue}
      />
    );
  }

  // ── Match Over ──
  if (phase === 'match_over' && gameState.matchResult) {
    return (
      <MatchOverScreen
        result={gameState.matchResult}
        team1Name={teams[0].name}
        team2Name={teams[1].name}
        team1Emoji={teams[0].emoji}
        team2Emoji={teams[1].emoji}
        onPlayAgain={handlePlayAgain}
        onNewTeams={handleNewTeams}
        onMainMenu={handleMainMenu}
      />
    );
  }

  // ── Pause Screen (overlay) ──
  const showPause = phase === 'paused';

  // ── Main Game Screen (question / animation / result) ──
  const isAnimationPhase = phase === 'animation';
  const isResultPhase = phase === 'result';
  const isQuestionPhase = phase === 'question';

  const battingTeamColors: [string, string] = gameState.battingTeamIndex === 0
    ? ['#22c55e', '#3b82f6']
    : ['#3b82f6', '#22c55e'];

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col overflow-hidden">
      {/* Pause overlay */}
      {showPause && (
        <PauseScreen
          onResume={handleResume}
          onRepeatAnimation={handleRepeatAnimation}
          onChangeDifficulty={handleChangeDifficulty}
          onEndInnings={handleEndInnings}
          onQuitToMenu={handleMainMenu}
          currentDifficulty={settings.difficulty}
          canRepeat={lastOutcome !== null}
        />
      )}

      {/* Scoreboard — always visible */}
      <Scoreboard
        team1={teams[0]}
        team2={teams[1]}
        currentInnings={gameState.currentInnings}
        battingTeamIndex={gameState.battingTeamIndex}
        target={gameState.target}
        difficulty={settings.difficulty === 'mixed' ? gameState.mixedModeLevel : settings.difficulty}
        streak={stats.currentStreak}
        maxWickets={settings.wicketsPerInnings}
      />

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Cricket Animation Phase */}
        {(isAnimationPhase || (isResultPhase && gameState.lastOutcome)) && (
          <div className={`relative bg-gray-900 ${isAnimationPhase ? 'flex-1' : 'h-56 sm:h-64'}`}>
            <CricketCanvas
              key={animationKey}
              outcome={gameState.lastOutcome}
              onAnimationComplete={handleAnimationComplete}
              reducedMotion={settings.reducedMotion}
              teamColors={battingTeamColors}
            />
            {isAnimationPhase && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2">
                <div className="bg-black/50 text-gray-300 text-xs px-3 py-1.5 rounded-full backdrop-blur-sm animate-pulse">
                  Animation playing...
                </div>
              </div>
            )}
          </div>
        )}

        {/* Question Phase Content */}
        {(isQuestionPhase || showPause) && currentQuestion && (
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 max-w-3xl mx-auto w-full">
              <QuestionDisplay
                question={currentQuestion}
                selectedOption={selectedOption}
                onSelectOption={handleSelectOption}
                submitted={false}
                revealed={false}
              />
            </div>
          </div>
        )}

        {/* Result Phase Content */}
        {isResultPhase && (
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 max-w-3xl mx-auto w-full space-y-4">
              {/* Show answered question with revealed answer */}
              {gameState.lastQuestion && (
                <QuestionDisplay
                  question={gameState.lastQuestion}
                  selectedOption={selectedOption}
                  onSelectOption={() => {}}
                  submitted={true}
                  revealed={true}
                />
              )}

              {/* Result panel */}
              {lastOutcome && gameState.lastQuestion && (
                <ResultPanel
                  outcome={lastOutcome}
                  question={gameState.lastQuestion}
                  selectedOption={selectedOption}
                  elapsedSeconds={elapsedSeconds}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Teacher Control Panel — always visible at bottom */}
      <TeacherPanel
        phase={phase}
        settings={settings}
        selectedOption={selectedOption}
        hasQuestion={currentQuestion !== null}
        onSubmitAnswer={handleSubmitAnswer}
        onDotBall={handleDotBall}
        onNextQuestion={handleNextQuestion}
        onRepeatAnimation={handleRepeatAnimation}
        onPause={handlePause}
        onResume={handleResume}
        onEndInnings={handleEndInnings}
        onChangeDifficulty={handleChangeDifficulty}
        onAddRuns={handleAddRuns}
        onSubtractRuns={handleSubtractRuns}
        onAddWicket={handleAddWicket}
        onToggleSound={handleToggleSound}
        onCrowdVolume={handleCrowdVolume}
        onEffectsVolume={handleEffectsVolume}
        onToggleReducedMotion={handleToggleReducedMotion}
        onToggleFullscreen={toggleFullscreen}
        onQuitToMenu={handleMainMenu}
      />

      {/* How to Play modal */}
      {showHowToPlay && <HowToPlay onClose={() => setShowHowToPlay(false)} />}
    </div>
  );
}
