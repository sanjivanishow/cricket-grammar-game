// ============================================================
// Grammar Cricket — Google Doodle-style canvas renderer
// Uses the original SVG sprite sheet at its native coordinate size.
// ============================================================
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CricketOutcome } from '../engine/GameState';

// Vite returns the SVG source as a string. Keeping the SVG at its native
// 596.4 × 9965 coordinate system is essential because every crop below uses
// those original coordinates.
// @ts-ignore — Vite raw asset import
import rawSvgString from '../assets/svg-sprite.svg?raw';

interface CricketCanvasProps {
  outcome: CricketOutcome | null;
  onAnimationComplete: () => void;
  reducedMotion?: boolean;
}

type SpriteRect = readonly [number, number, number, number];

const W = 800;
const H = 480;
const GROUND_Y = 422;
const BATTER_X = 265;
const BOWLER_X = 610;
const STRIKER_WICKET_X = 205;
const NON_STRIKER_WICKET_X = 660;
const IMPACT_TIME = 760;

const SPRITES = {
  bat: [20, 61, 65.02, 64.57],
  batter: [20, 146, 116, 193],
  cloudLarge: [20, 667, 193.82, 55.34],
  cloudSmall: [20, 743, 166.51, 46.29],
  wheat: [20, 810, 66, 432],
  crowdFront: [20, 2168, 556.4, 67.71],
  crowdBack: [20, 2256, 504.75, 119.95],
  snail: [20, 5209, 195.7, 190.95],
  stadium: [20, 5420, 245.36, 172.2],
  outSign: [20, 5746, 485.47, 469.67],
  trophy: [20, 6650, 169.51, 163.5],
} as const satisfies Record<string, SpriteRect>;

// Exact frame order used by the original Doodle for the dirt burst.
const DUST_FRAMES: readonly SpriteRect[] = [
  [20, 3370, 254, 89],
  [20, 3479, 254, 89],
  [20, 3806, 254, 89],
  [20, 3915, 254, 89],
  [20, 4024, 254, 89],
  [20, 4133, 254, 89],
  [20, 4242, 254, 89],
  [20, 4351, 254, 89],
  [20, 4460, 254, 89],
  [20, 4569, 254, 89],
  [20, 3588, 254, 89],
  [20, 3697, 254, 89],
];

// Original wicket-breaking sequence. The final pose is held for the
// duplicated tail frames instead of repeatedly flashing back to the start.
const WICKET_FRAMES: readonly SpriteRect[] = [
  [20, 7058, 124, 184],
  [20, 7262, 124, 184],
  [20, 7466, 124, 184],
  [20, 7670, 124, 184],
  [20, 7874, 124, 184],
  [20, 8078, 124, 184],
  [20, 8282, 124, 184],
  [20, 8690, 124, 184],
  [20, 8894, 124, 184],
  [20, 9098, 124, 184],
  [20, 9302, 124, 184],
  [20, 9506, 124, 184],
  [20, 9710, 124, 184],
];

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function easeOutCubic(value: number): number {
  const t = clamp(value, 0, 1);
  return 1 - Math.pow(1 - t, 3);
}

function drawSprite(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  rect: SpriteRect,
  x: number,
  y: number,
  scale = 1,
  flip = false,
  rotation = 0,
  alpha = 1,
): void {
  const [sx, sy, sw, sh] = rect;
  const sourceWidth = sw + 10;
  const sourceHeight = sh + 10;
  const drawWidth = sourceWidth * scale;
  const drawHeight = sourceHeight * scale;

  ctx.save();
  ctx.translate(x, y);
  if (flip) ctx.scale(-1, 1);
  if (rotation) ctx.rotate(rotation);
  ctx.globalAlpha = alpha;
  ctx.drawImage(
    image,
    sx - 5,
    sy - 5,
    sourceWidth,
    sourceHeight,
    -drawWidth / 2,
    -drawHeight,
    drawWidth,
    drawHeight,
  );
  ctx.restore();
}

function resultLabel(outcome: CricketOutcome): string {
  switch (outcome) {
    case 'six': return 'SIX!';
    case 'four': return 'FOUR!';
    case 'three': return '3 RUNS';
    case 'two': return '2 RUNS';
    case 'one': return '1 RUN';
    case 'run_out': return 'RUN OUT!';
    case 'bowled': return 'BOWLED!';
    case 'dot': return 'DOT BALL';
  }
}

const CricketCanvas: React.FC<CricketCanvasProps> = ({
  outcome,
  onAnimationComplete,
  reducedMotion = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const spriteRef = useRef<HTMLImageElement | null>(null);
  const completeRef = useRef(onAnimationComplete);
  const [spriteLoaded, setSpriteLoaded] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const engineState = useRef({
    animFrame: 0,
    virtualTime: 0,
    lastTime: 0,
    completed: false,
  });

  useEffect(() => {
    completeRef.current = onAnimationComplete;
  }, [onAnimationComplete]);

  useEffect(() => {
    let disposed = false;
    let objectUrl = '';

    try {
      if (!rawSvgString || !rawSvgString.includes('<svg')) {
        throw new Error('The Doodle sprite sheet is empty or invalid.');
      }

      // Do not rewrite width, height or viewBox. Stretching the SVG changes
      // the pixel coordinate system and makes every source crop incorrect.
      const blob = new Blob([rawSvgString], {
        type: 'image/svg+xml;charset=utf-8',
      });
      objectUrl = URL.createObjectURL(blob);

      const image = new Image();
      image.decoding = 'async';
      image.onload = () => {
        if (disposed) return;
        spriteRef.current = image;
        setSpriteLoaded(true);
        URL.revokeObjectURL(objectUrl);
        objectUrl = '';
      };
      image.onerror = () => {
        if (!disposed) {
          setErrorMsg('The browser could not decode svg-sprite.svg.');
        }
      };
      image.src = objectUrl;
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Unable to load the Doodle graphics.');
    }

    return () => {
      disposed = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, []);

  const renderEngine = useCallback((timestamp: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const state = engineState.current;
    if (state.lastTime === 0) state.lastTime = timestamp;
    const dt = Math.min(timestamp - state.lastTime, 50);
    state.lastTime = timestamp;

    if (outcome) state.virtualTime += reducedMotion ? dt * 5 : dt;
    const vt = state.virtualTime;
    const image = spriteRef.current;

    ctx.clearRect(0, 0, W, H);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Sky
    const sky = ctx.createLinearGradient(0, 0, 0, 285);
    sky.addColorStop(0, '#dff4f7');
    sky.addColorStop(1, '#f8fbda');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#fff3a0';
    ctx.beginPath();
    ctx.arc(680, 65, 34, 0, Math.PI * 2);
    ctx.fill();

    if (image) {
      drawSprite(ctx, image, SPRITES.cloudLarge, 180, 105, 0.8);
      drawSprite(ctx, image, SPRITES.cloudSmall, 620, 145, 0.72);
    }

    // Outfield
    ctx.fillStyle = '#8fbd49';
    ctx.fillRect(0, 190, W, H - 190);
    ctx.fillStyle = '#74a53a';
    ctx.beginPath();
    ctx.ellipse(W / 2, 390, 540, 220, 0, Math.PI, Math.PI * 2);
    ctx.fill();

    if (image) {
      drawSprite(ctx, image, SPRITES.stadium, W / 2, 278, 1.55);
      drawSprite(ctx, image, SPRITES.crowdBack, W / 2, 305, 1.12);

      const crowdBounce = Math.sin(timestamp * 0.008) * (outcome ? 3 : 1);
      drawSprite(ctx, image, SPRITES.crowdFront, W / 2, 322 + crowdBounce, 1.15);

      [45, 90, 710, 755].forEach((x) => {
        drawSprite(ctx, image, SPRITES.wheat, x, 345, 0.38, x > W / 2);
      });
    }

    // Pitch
    ctx.fillStyle = '#c9a56c';
    ctx.beginPath();
    ctx.moveTo(250, 310);
    ctx.lineTo(550, 310);
    ctx.lineTo(630, 455);
    ctx.lineTo(170, 455);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,0.78)';
    ctx.lineWidth = 3;
    ctx.strokeRect(220, 345, 360, 80);

    if (errorMsg) {
      ctx.fillStyle = 'rgba(36, 45, 22, 0.88)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#fff';
      ctx.font = '700 22px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Graphics could not be loaded', W / 2, H / 2 - 12);
      ctx.font = '16px Arial, sans-serif';
      ctx.fillText(errorMsg, W / 2, H / 2 + 20);
      return;
    }

    if (!spriteLoaded || !image) {
      ctx.fillStyle = 'rgba(64, 73, 31, 0.42)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#fff';
      ctx.font = '700 22px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Loading cricket graphics…', W / 2, H / 2);
      return;
    }

    const isWicketOutcome = outcome === 'bowled' || outcome === 'run_out';
    const breakStart = outcome === 'run_out' ? IMPACT_TIME + 760 : IMPACT_TIME;
    let wicketFrame = WICKET_FRAMES[0];
    if (isWicketOutcome && vt >= breakStart) {
      const frameIndex = clamp(
        Math.floor((vt - breakStart) / 58),
        0,
        WICKET_FRAMES.length - 1,
      );
      wicketFrame = WICKET_FRAMES[frameIndex];
    }

    drawSprite(ctx, image, wicketFrame, STRIKER_WICKET_X, GROUND_Y - 2, 0.56);
    drawSprite(ctx, image, WICKET_FRAMES[0], NON_STRIKER_WICKET_X, GROUND_Y - 2, 0.5, true, 0, 0.9);

    let ballX = BOWLER_X - 45;
    let ballY = 355;
    let showBall = false;
    let batRotation = -0.55;
    let batterRotation = 0;
    let bowlerRotation = Math.sin(timestamp * 0.004) * 0.025;

    if (outcome) {
      showBall = true;

      if (vt < 310) {
        bowlerRotation = -0.06 * easeOutCubic(vt / 310);
      } else if (vt < IMPACT_TIME) {
        const t = easeOutCubic((vt - 310) / (IMPACT_TIME - 310));
        ballX = BOWLER_X - 45 + (BATTER_X - BOWLER_X + 25) * t;
        ballY = 355 - Math.sin(t * Math.PI) * 52;
        bowlerRotation = 0.08 * (1 - t);
      } else {
        const post = vt - IMPACT_TIME;

        if (outcome === 'bowled') {
          ballX = STRIKER_WICKET_X + 8;
          ballY = GROUND_Y - 44 + Math.min(post / 12, 22);
        } else {
          const swing = clamp(post / 220, 0, 1);
          batRotation = -0.55 + Math.sin(swing * Math.PI) * 1.45;
          batterRotation = -Math.sin(swing * Math.PI) * 0.08;

          switch (outcome) {
            case 'six': {
              const t = post / 950;
              ballX = BATTER_X - 18 - t * 760;
              ballY = 342 - t * 365 - Math.sin(clamp(t, 0, 1) * Math.PI) * 90;
              break;
            }
            case 'four': {
              const t = post / 900;
              ballX = BATTER_X - 18 - t * 640;
              ballY = 385 - Math.abs(Math.sin(post * 0.018)) * 18;
              break;
            }
            case 'three':
            case 'two':
            case 'one':
            case 'dot': {
              const distance = outcome === 'three' ? 430 : outcome === 'two' ? 320 : outcome === 'one' ? 230 : 95;
              const t = easeOutCubic(post / 800);
              ballX = BATTER_X - 18 - distance * t;
              ballY = 383 - Math.sin(t * Math.PI) * (outcome === 'dot' ? 12 : 34);
              break;
            }
            case 'run_out': {
              const firstLeg = clamp(post / 620, 0, 1);
              ballX = BATTER_X - 18 - 260 * firstLeg;
              ballY = 382 - Math.sin(firstLeg * Math.PI) * 32;
              if (post > 620) {
                const returnLeg = clamp((post - 620) / 520, 0, 1);
                ballX = BATTER_X - 278 + 445 * returnLeg;
                ballY = 380 - Math.sin(returnLeg * Math.PI) * 48;
              }
              break;
            }
          }
        }
      }
    }

    const bowlerBob = outcome ? 0 : Math.sin(timestamp * 0.0035) * 2;
    drawSprite(ctx, image, SPRITES.snail, BOWLER_X, GROUND_Y + bowlerBob, 0.54, true, bowlerRotation);

    const batterBob = outcome ? 0 : Math.sin(timestamp * 0.003) * 2.5;
    drawSprite(ctx, image, SPRITES.batter, BATTER_X, GROUND_Y + batterBob, 0.62, false, batterRotation);
    drawSprite(ctx, image, SPRITES.bat, BATTER_X - 53, GROUND_Y - 57 + batterBob, 0.9, false, batRotation);

    if (outcome && vt >= IMPACT_TIME && outcome !== 'bowled') {
      const dustAge = vt - IMPACT_TIME;
      const dustIndex = Math.floor(dustAge / 55);
      if (dustIndex >= 0 && dustIndex < DUST_FRAMES.length) {
        drawSprite(ctx, image, DUST_FRAMES[dustIndex], BATTER_X - 12, GROUND_Y + 10, 0.72, true, 0, 0.85);
      }
    }

    if (showBall) {
      ctx.save();
      ctx.fillStyle = '#b52b2b';
      ctx.beginPath();
      ctx.arc(ballX, ballY, 7.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.78)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(ballX - 1.2, ballY, 4.2, -0.85, 0.85);
      ctx.stroke();
      ctx.restore();
    }

    if (outcome && vt > IMPACT_TIME + 180 && (outcome === 'six' || outcome === 'four')) {
      const intensity = outcome === 'six' ? 30 : 18;
      const age = (vt - IMPACT_TIME - 180) / 1000;
      const colours = ['#f9ec31', '#ffffff', '#ef6c43', '#63b646', '#55b7d9'];
      for (let i = 0; i < intensity; i += 1) {
        const angle = (i / intensity) * Math.PI * 2 + i * 0.71;
        const speed = 85 + (i % 7) * 19;
        const px = W / 2 + Math.cos(angle) * speed * age;
        const py = 190 + Math.sin(angle) * speed * age + 92 * age * age;
        const alpha = clamp(1 - age / 1.65, 0, 1);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = colours[i % colours.length];
        ctx.fillRect(px, py, 5 + (i % 3) * 2, 5 + ((i + 1) % 3) * 2);
      }
      ctx.globalAlpha = 1;
    }

    if (outcome && vt > IMPACT_TIME + 420) {
      if (isWicketOutcome) {
        drawSprite(ctx, image, SPRITES.outSign, W / 2, 360, 0.28, false, 0, clamp((vt - IMPACT_TIME - 420) / 220, 0, 1));
      } else {
        const badgeY = 78;
        ctx.save();
        ctx.fillStyle = '#6f4a24';
        ctx.beginPath();
        ctx.roundRect(W / 2 - 115, badgeY - 36, 230, 72, 16);
        ctx.fill();
        ctx.strokeStyle = '#f9ec31';
        ctx.lineWidth = 4;
        ctx.stroke();
        ctx.fillStyle = '#fff7c2';
        ctx.font = '900 31px "Trebuchet MS", Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(resultLabel(outcome), W / 2, badgeY + 1);
        ctx.restore();

        if (outcome === 'six') {
          drawSprite(ctx, image, SPRITES.trophy, W / 2 + 154, 156, 0.34, false, Math.sin(timestamp * 0.008) * 0.035);
        }
      }
    }

    if (outcome && vt > 2550 && !state.completed) {
      state.completed = true;
      completeRef.current();
    }
  }, [errorMsg, outcome, reducedMotion, spriteLoaded]);

  useEffect(() => {
    const state = engineState.current;
    state.completed = false;
    state.lastTime = 0;
    state.virtualTime = 0;

    const loop = (timestamp: number) => {
      renderEngine(timestamp);
      if (!engineState.current.completed) {
        engineState.current.animFrame = requestAnimationFrame(loop);
      }
    };

    state.animFrame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(state.animFrame);
  }, [outcome, renderEngine]);

  return (
    <div
      className="aspect-[5/3] w-full overflow-hidden rounded-xl border-4 border-[#558b2f] shadow-2xl"
      role="img"
      aria-label="Animated cricket match in a playful Doodle-inspired style"
    >
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        className="block h-full w-full bg-[#8fbd49]"
      />
    </div>
  );
};

export default CricketCanvas;
