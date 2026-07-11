import React, { useEffect, useRef } from 'react';
import { CricketOutcome } from '../engine/GameState';

interface CricketCanvasProps {
  outcome: CricketOutcome | null;
  onAnimationComplete: () => void;
  reducedMotion?: boolean;
  teamColors?: [string, string];
}

type Vec2 = { x: number; y: number };

type PlayerKind =
  | 'batsman'
  | 'bowler'
  | 'keeper'
  | 'fielder'
  | 'umpire';

interface Palette {
  batting: string;
  battingDark: string;
  fielding: string;
  fieldingDark: string;
  skin: string;
  skinDark: string;
  white: string;
  shadow: string;
  bat: string;
  batDark: string;
  ball: string;
  ballDark: string;
  stump: string;
  stumpDark: string;
  bail: string;
  umpire: string;
  umpireDark: string;
}

interface PixelParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  gravity: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  kind: 'spark' | 'dust' | 'confetti';
}

interface FlyingBail {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  spin: number;
  life: number;
  scale: number;
}

interface FielderDefinition {
  role: string;
  position: Vec2;
  scale: number;
  flip: boolean;
}

interface RuntimeState {
  particles: PixelParticle[];
  bails: FlyingBail[];
  events: Set<string>;
  shake: number;
}

const LOGICAL_W = 480;
const LOGICAL_H = 270;
const DEFAULT_TEAM_COLORS: [string, string] = ['#10b981', '#3b82f6'];

const STRIKER_WICKET: Vec2 = { x: 142, y: 206 };
const BOWLER_WICKET: Vec2 = { x: 326, y: 158 };
const STRIKER_GUARD: Vec2 = { x: 158, y: 201 };
const NON_STRIKER_GUARD: Vec2 = { x: 311, y: 157 };
const KEEPER_POSITION: Vec2 = { x: 108, y: 214 };
const BOWLER_START: Vec2 = { x: 414, y: 133 };
const BOWLER_RELEASE: Vec2 = { x: 349, y: 151 };
const UMPIRE_BOWLER_END: Vec2 = { x: 351, y: 151 };
const UMPIRE_SQUARE_LEG: Vec2 = { x: 173, y: 232 };

const DELIVERY_END = 0.88;

const FIELDERS: FielderDefinition[] = [
  { role: 'slip', position: { x: 83, y: 191 }, scale: 0.92, flip: false },
  { role: 'point', position: { x: 155, y: 150 }, scale: 0.83, flip: true },
  { role: 'cover', position: { x: 236, y: 128 }, scale: 0.76, flip: false },
  { role: 'mid-off', position: { x: 299, y: 123 }, scale: 0.72, flip: true },
  { role: 'mid-on', position: { x: 333, y: 193 }, scale: 0.84, flip: false },
  { role: 'square-leg', position: { x: 183, y: 238 }, scale: 0.96, flip: true },
  { role: 'fine-leg', position: { x: 83, y: 237 }, scale: 0.78, flip: false },
  { role: 'deep-cover', position: { x: 265, y: 83 }, scale: 0.58, flip: true },
  { role: 'deep-midwicket', position: { x: 399, y: 211 }, scale: 0.65, flip: false },
];

const DURATIONS: Record<string, number> = {
  six: 4.7,
  four: 4.0,
  three: 4.6,
  two: 4.0,
  one: 3.2,
  run_out: 4.6,
  bowled: 3.7,
  dot: 2.8,
};

function clamp(value: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, value));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpPoint(a: Vec2, b: Vec2, t: number): Vec2 {
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) };
}

function easeOutCubic(t: number): number {
  const p = 1 - clamp(t);
  return 1 - p * p * p;
}

function easeInOutCubic(t: number): number {
  const p = clamp(t);
  return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
}

function pingPong(value: number): number {
  const wrapped = ((value % 2) + 2) % 2;
  return wrapped <= 1 ? wrapped : 2 - wrapped;
}

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function normaliseHex(hex: string): string {
  const value = hex.trim();
  if (/^#[0-9a-f]{6}$/i.test(value)) return value;
  if (/^#[0-9a-f]{3}$/i.test(value)) {
    return `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`;
  }
  return '#10b981';
}

function shade(hex: string, amount: number): string {
  const safe = normaliseHex(hex).slice(1);
  const r = parseInt(safe.slice(0, 2), 16);
  const g = parseInt(safe.slice(2, 4), 16);
  const b = parseInt(safe.slice(4, 6), 16);
  const target = amount < 0 ? 0 : 255;
  const factor = Math.abs(amount);
  const mix = (channel: number) => Math.round(channel + (target - channel) * factor);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

function buildPalette(teamColors: [string, string]): Palette {
  const batting = normaliseHex(teamColors[0]);
  const fielding = normaliseHex(teamColors[1]);
  return {
    batting,
    battingDark: shade(batting, -0.45),
    fielding,
    fieldingDark: shade(fielding, -0.45),
    skin: '#f2ad77',
    skinDark: '#b86d49',
    white: '#f8fafc',
    shadow: '#0b1220',
    bat: '#f6c453',
    batDark: '#8b4f1f',
    ball: '#ef315a',
    ballDark: '#80152f',
    stump: '#f4dc8b',
    stumpDark: '#8a5b25',
    bail: '#ff795f',
    umpire: '#e8edf4',
    umpireDark: '#65758b',
  };
}

function drawPixelRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
): void {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(width), Math.round(height));
}

function drawPixelPolygon(
  ctx: CanvasRenderingContext2D,
  points: Vec2[],
  color: string,
): void {
  if (points.length === 0) return;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(Math.round(points[0].x), Math.round(points[0].y));
  for (let i = 1; i < points.length; i += 1) {
    ctx.lineTo(Math.round(points[i].x), Math.round(points[i].y));
  }
  ctx.closePath();
  ctx.fill();
}

function drawPixelLine(
  ctx: CanvasRenderingContext2D,
  a: Vec2,
  b: Vec2,
  color: string,
  width = 1,
): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(Math.round(a.x) + 0.5, Math.round(a.y) + 0.5);
  ctx.lineTo(Math.round(b.x) + 0.5, Math.round(b.y) + 0.5);
  ctx.stroke();
}

function drawSkyAndStadium(
  ctx: CanvasRenderingContext2D,
  elapsed: number,
): void {
  drawPixelRect(ctx, 0, 0, LOGICAL_W, 82, '#07101f');
  drawPixelRect(ctx, 0, 28, LOGICAL_W, 54, '#101c35');

  const stars = [
    [26, 17], [55, 10], [95, 24], [141, 13], [185, 31], [228, 11],
    [271, 21], [319, 9], [364, 28], [412, 14], [453, 25],
  ];
  stars.forEach(([x, y], index) => {
    const blink = Math.sin(elapsed * 2 + index) > 0.2;
    drawPixelRect(ctx, x, y, blink ? 2 : 1, blink ? 2 : 1, '#dbeafe');
  });

  drawPixelRect(ctx, 0, 54, LOGICAL_W, 48, '#0a1222');
  drawPixelPolygon(
    ctx,
    [
      { x: 0, y: 82 },
      { x: 42, y: 67 },
      { x: 106, y: 60 },
      { x: 180, y: 66 },
      { x: 250, y: 58 },
      { x: 328, y: 63 },
      { x: 404, y: 57 },
      { x: 480, y: 76 },
      { x: 480, y: 111 },
      { x: 0, y: 111 },
    ],
    '#111c31',
  );

  const rand = seededRandom(91);
  const crowdColors = ['#f43f5e', '#38bdf8', '#fbbf24', '#4ade80', '#c084fc', '#f8fafc'];
  for (let row = 0; row < 4; row += 1) {
    for (let i = 0; i < 92; i += 1) {
      const x = i * 5.4 + (row % 2) * 2;
      const y = 72 + row * 8 + Math.floor(rand() * 4);
      const wave = Math.sin(elapsed * 3.2 + i * 0.45 + row) > 0.72 ? -2 : 0;
      drawPixelRect(
        ctx,
        x,
        y + wave,
        2,
        3,
        crowdColors[Math.floor(rand() * crowdColors.length)],
      );
    }
  }

  drawPixelRect(ctx, 0, 103, LOGICAL_W, 12, '#13233c');
  for (let x = 8; x < LOGICAL_W; x += 44) {
    drawPixelRect(ctx, x, 105, 35, 7, x % 88 === 8 ? '#f43f5e' : '#2563eb');
    drawPixelRect(ctx, x + 4, 107, 27, 2, '#f8fafc');
  }

  // Floodlight towers.
  [37, 443].forEach((x, index) => {
    drawPixelRect(ctx, x, 25, 4, 72, '#516078');
    drawPixelRect(ctx, x - 11, 22, 26, 7, '#9fb2c8');
    for (let lamp = 0; lamp < 5; lamp += 1) {
      drawPixelRect(ctx, x - 8 + lamp * 5, 24, 3, 3, '#fff4b8');
    }
    drawPixelPolygon(
      ctx,
      index === 0
        ? [
            { x: x - 12, y: 29 },
            { x: 128, y: 120 },
            { x: 184, y: 120 },
            { x: x + 15, y: 29 },
          ]
        : [
            { x: x - 12, y: 29 },
            { x: 296, y: 120 },
            { x: 352, y: 120 },
            { x: x + 15, y: 29 },
          ],
      'rgba(255, 250, 220, 0.035)',
    );
  });
}

function drawOutfield(ctx: CanvasRenderingContext2D): void {
  drawPixelRect(ctx, 0, 112, LOGICAL_W, LOGICAL_H - 112, '#0d6a35');

  for (let stripe = 0; stripe < 10; stripe += 1) {
    const y = 112 + stripe * 18;
    drawPixelPolygon(
      ctx,
      [
        { x: 0, y },
        { x: LOGICAL_W, y: y + 6 },
        { x: LOGICAL_W, y: y + 18 },
        { x: 0, y: y + 12 },
      ],
      stripe % 2 === 0 ? '#0d7138' : '#0a5f30',
    );
  }

  // Boundary rope.
  ctx.strokeStyle = '#f7e36f';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(240, 191, 221, 76, -0.03, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = '#c13f4f';
  ctx.lineWidth = 1;
  ctx.setLineDash([6, 5]);
  ctx.beginPath();
  ctx.ellipse(240, 191, 218, 73, -0.03, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // Scoreboard.
  drawPixelRect(ctx, 374, 82, 79, 35, '#050a12');
  drawPixelRect(ctx, 377, 85, 73, 29, '#172033');
  drawPixelRect(ctx, 384, 90, 25, 4, '#f8fafc');
  drawPixelRect(ctx, 384, 99, 58, 3, '#fbbf24');
  drawPixelRect(ctx, 384, 106, 42, 3, '#4ade80');
}

function drawPitch(ctx: CanvasRenderingContext2D): void {
  const nearLeft = { x: 112, y: 224 };
  const nearRight = { x: 174, y: 226 };
  const farRight = { x: 342, y: 167 };
  const farLeft = { x: 315, y: 150 };

  drawPixelPolygon(
    ctx,
    [
      { x: 108, y: 228 },
      { x: 178, y: 230 },
      { x: 347, y: 169 },
      { x: 312, y: 146 },
    ],
    'rgba(0,0,0,0.25)',
  );

  drawPixelPolygon(ctx, [nearLeft, nearRight, farRight, farLeft], '#c7ab6b');
  drawPixelPolygon(
    ctx,
    [
      { x: 118, y: 219 },
      { x: 168, y: 220 },
      { x: 337, y: 165 },
      { x: 318, y: 153 },
    ],
    '#d8c080',
  );

  // Mowing and wear bands on the pitch.
  drawPixelPolygon(
    ctx,
    [
      { x: 125, y: 216 },
      { x: 148, y: 218 },
      { x: 331, y: 161 },
      { x: 321, y: 156 },
    ],
    '#e3cf95',
  );
  drawPixelPolygon(
    ctx,
    [
      { x: 148, y: 218 },
      { x: 164, y: 218 },
      { x: 338, y: 164 },
      { x: 331, y: 161 },
    ],
    '#b89a5e',
  );

  // Crease helpers.
  const nearPerp = { x: -0.02, y: 1 };
  const farPerp = { x: -0.53, y: 0.85 };
  const nearCreaseCenter = { x: 144, y: 205 };
  const farCreaseCenter = { x: 326, y: 158 };

  drawPixelLine(
    ctx,
    { x: nearCreaseCenter.x - 36, y: nearCreaseCenter.y - 1 },
    { x: nearCreaseCenter.x + 36, y: nearCreaseCenter.y + 1 },
    '#f8fafc',
    2,
  );
  drawPixelLine(
    ctx,
    { x: nearCreaseCenter.x - 32, y: nearCreaseCenter.y + 14 },
    { x: nearCreaseCenter.x + 32, y: nearCreaseCenter.y + 15 },
    '#f8fafc',
    2,
  );
  drawPixelLine(
    ctx,
    {
      x: farCreaseCenter.x - farPerp.x * 22,
      y: farCreaseCenter.y - farPerp.y * 22,
    },
    {
      x: farCreaseCenter.x + farPerp.x * 22,
      y: farCreaseCenter.y + farPerp.y * 22,
    },
    '#f8fafc',
    2,
  );
  drawPixelLine(
    ctx,
    { x: 312, y: 151 },
    { x: 341, y: 168 },
    '#f8fafc',
    2,
  );

  // Return creases.
  drawPixelLine(
    ctx,
    { x: 113, y: 197 },
    { x: 111, y: 225 },
    '#f8fafc',
    1,
  );
  drawPixelLine(
    ctx,
    { x: 174, y: 199 },
    { x: 176, y: 226 },
    '#f8fafc',
    1,
  );
  drawPixelLine(
    ctx,
    { x: 312, y: 150 },
    { x: 320, y: 143 },
    '#f8fafc',
    1,
  );
  drawPixelLine(
    ctx,
    { x: 341, y: 167 },
    { x: 349, y: 161 },
    '#f8fafc',
    1,
  );

  // Worn spots and footmarks.
  drawPixelRect(ctx, 172, 195, 4, 2, '#9f7d43');
  drawPixelRect(ctx, 188, 191, 3, 2, '#9f7d43');
  drawPixelRect(ctx, 292, 165, 3, 2, '#9f7d43');
  drawPixelRect(ctx, 299, 162, 4, 2, '#9f7d43');

  void nearPerp;
}

function drawPlayerShadow(
  ctx: CanvasRenderingContext2D,
  position: Vec2,
  scale: number,
): void {
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath();
  ctx.ellipse(position.x + 1, position.y + 2, 12 * scale, 3.5 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawStandingPlayer(
  ctx: CanvasRenderingContext2D,
  position: Vec2,
  scale: number,
  color: string,
  darkColor: string,
  palette: Palette,
  options: {
    flip?: boolean;
    armRaise?: number;
    crouch?: number;
    lean?: number;
    runCycle?: number;
    cap?: boolean;
    kind?: PlayerKind;
  } = {},
): void {
  const {
    flip = false,
    armRaise = 0,
    crouch = 0,
    lean = 0,
    runCycle = 0,
    cap = true,
    kind = 'fielder',
  } = options;

  ctx.save();
  ctx.translate(Math.round(position.x), Math.round(position.y));
  ctx.scale(flip ? -scale : scale, scale);

  drawPlayerShadow(ctx, { x: 0, y: 0 }, 1);

  const bodyY = -34 + crouch * 7;
  const legSwing = Math.sin(runCycle * Math.PI * 2) * 5;

  // Rear leg.
  drawPixelRect(ctx, -8, -18 + legSwing * 0.25, 6, 18, darkColor);
  drawPixelRect(ctx, -10, -2 + legSwing * 0.25, 10, 4, palette.shadow);

  // Front leg.
  drawPixelRect(ctx, 3, -18 - legSwing * 0.25, 6, 18, color);
  drawPixelRect(ctx, 2, -2 - legSwing * 0.25, 11, 4, palette.shadow);

  // Torso.
  drawPixelPolygon(
    ctx,
    [
      { x: -10 + lean, y: bodyY + 2 },
      { x: 10 + lean, y: bodyY + 2 },
      { x: 8, y: -17 },
      { x: -8, y: -17 },
    ],
    color,
  );
  drawPixelRect(ctx, -10 + lean, bodyY + 2, 4, 17, darkColor);
  drawPixelRect(ctx, 6 + lean, bodyY + 3, 3, 14, shade(color, 0.35));

  // Head.
  drawPixelRect(ctx, -5 + lean, bodyY - 10, 10, 9, palette.skin);
  drawPixelRect(ctx, -5 + lean, bodyY - 10, 3, 9, palette.skinDark);

  if (cap) {
    drawPixelRect(ctx, -7 + lean, bodyY - 14, 13, 5, darkColor);
    drawPixelRect(ctx, 4 + lean, bodyY - 12, 7, 2, color);
  }

  // Arms.
  const raisedY = bodyY + 7 - armRaise * 16;
  drawPixelRect(ctx, -15 + lean, raisedY, 5, 15, palette.skinDark);
  drawPixelRect(ctx, 10 + lean, raisedY, 5, 15, palette.skin);

  if (kind === 'umpire') {
    drawPixelRect(ctx, -10, -18, 20, 3, palette.umpireDark);
  }

  ctx.restore();
}

function drawBatsman(
  ctx: CanvasRenderingContext2D,
  position: Vec2,
  scale: number,
  palette: Palette,
  options: {
    flip?: boolean;
    swing?: number;
    running?: boolean;
    runCycle?: number;
    dive?: number;
  } = {},
): void {
  const {
    flip = false,
    swing = 0,
    running = false,
    runCycle = 0,
    dive = 0,
  } = options;

  ctx.save();
  ctx.translate(Math.round(position.x), Math.round(position.y));
  ctx.scale(flip ? -scale : scale, scale);
  ctx.rotate(-dive * 0.35);

  drawPlayerShadow(ctx, { x: 0, y: 0 }, 1.1);

  const legSwing = running ? Math.sin(runCycle * Math.PI * 2) * 6 : 0;

  // Legs and pads.
  drawPixelRect(ctx, -9, -23 + legSwing * 0.25, 7, 22, '#d7dee8');
  drawPixelRect(ctx, -10, -20 + legSwing * 0.25, 3, 18, '#8997aa');
  drawPixelRect(ctx, 3, -23 - legSwing * 0.25, 7, 22, palette.white);
  drawPixelRect(ctx, 3, -20 - legSwing * 0.25, 3, 18, '#aeb9c7');
  drawPixelRect(ctx, -11, -2 + legSwing * 0.25, 12, 4, palette.shadow);
  drawPixelRect(ctx, 2, -2 - legSwing * 0.25, 12, 4, palette.shadow);

  // Torso and shirt highlights.
  drawPixelPolygon(
    ctx,
    [
      { x: -12, y: -48 },
      { x: 11, y: -48 },
      { x: 9, y: -22 },
      { x: -9, y: -22 },
    ],
    palette.batting,
  );
  drawPixelRect(ctx, -12, -47, 4, 24, palette.battingDark);
  drawPixelRect(ctx, 7, -46, 3, 20, shade(palette.batting, 0.35));

  // Head and helmet.
  drawPixelRect(ctx, -5, -59, 10, 9, palette.skin);
  drawPixelRect(ctx, -8, -65, 16, 7, palette.battingDark);
  drawPixelRect(ctx, -10, -61, 20, 4, palette.batting);
  drawPixelRect(ctx, 7, -59, 7, 2, '#d0b15d');
  drawPixelRect(ctx, 7, -55, 7, 2, '#d0b15d');

  // Arms and gloves.
  drawPixelRect(ctx, -5, -45, 5, 19, palette.skinDark);
  drawPixelRect(ctx, 2, -45, 5, 19, palette.skin);
  drawPixelRect(ctx, -7, -29, 8, 7, palette.white);
  drawPixelRect(ctx, 0, -29, 8, 7, '#dce3ec');

  // Bat. The bat pivots around the gloves.
  ctx.save();
  ctx.translate(2, -26);
  const batRotation = running ? -0.95 : -0.15 + swing * 2.25;
  ctx.rotate(batRotation);
  drawPixelRect(ctx, -2, 0, 4, 19, palette.batDark);
  drawPixelPolygon(
    ctx,
    [
      { x: -4, y: 18 },
      { x: 4, y: 18 },
      { x: 7, y: 49 },
      { x: 4, y: 54 },
      { x: -5, y: 54 },
      { x: -7, y: 49 },
    ],
    palette.bat,
  );
  drawPixelRect(ctx, -7, 20, 3, 31, palette.batDark);
  drawPixelRect(ctx, 3, 21, 2, 28, '#fff1a8');
  ctx.restore();

  ctx.restore();
}

function drawBowler(
  ctx: CanvasRenderingContext2D,
  progress: number,
  palette: Palette,
): void {
  const run = clamp(progress);
  const position = lerpPoint(BOWLER_START, BOWLER_RELEASE, easeInOutCubic(run));
  const stride = run * 3.5;
  const release = clamp((run - 0.68) / 0.32);

  ctx.save();
  ctx.translate(position.x, position.y);
  ctx.scale(-0.82, 0.82);

  drawPlayerShadow(ctx, { x: 0, y: 0 }, 1);

  const leg = Math.sin(stride * Math.PI * 2) * 6;
  drawPixelRect(ctx, -8, -22 + leg * 0.3, 7, 22, palette.fieldingDark);
  drawPixelRect(ctx, 2, -22 - leg * 0.3, 7, 22, palette.fielding);
  drawPixelRect(ctx, -10, -2 + leg * 0.3, 12, 4, palette.shadow);
  drawPixelRect(ctx, 1, -2 - leg * 0.3, 12, 4, palette.shadow);

  drawPixelPolygon(
    ctx,
    [
      { x: -11, y: -49 },
      { x: 11, y: -49 },
      { x: 8, y: -22 },
      { x: -8, y: -22 },
    ],
    palette.fielding,
  );
  drawPixelRect(ctx, -11, -48, 4, 24, palette.fieldingDark);
  drawPixelRect(ctx, -5, -60, 10, 9, palette.skin);
  drawPixelRect(ctx, -7, -64, 13, 5, palette.fieldingDark);
  drawPixelRect(ctx, 4, -62, 8, 2, palette.fielding);

  // Non-bowling arm.
  drawPixelRect(ctx, -15, -47 + Math.sin(stride * Math.PI * 2) * 4, 5, 20, palette.skinDark);

  // Bowling arm with overarm release.
  ctx.save();
  ctx.translate(8, -45);
  ctx.rotate(-0.9 + release * 4.4);
  drawPixelRect(ctx, -2, 0, 5, 25, palette.skin);
  drawPixelRect(ctx, -3, 22, 7, 6, palette.skinDark);
  if (release < 0.72) {
    drawPixelRect(ctx, -1, 27, 4, 4, palette.ball);
  }
  ctx.restore();

  ctx.restore();
}

function drawKeeper(
  ctx: CanvasRenderingContext2D,
  position: Vec2,
  palette: Palette,
  options: { rise?: number; moveX?: number; appeal?: number } = {},
): void {
  const rise = clamp(options.rise ?? 0);
  const appeal = clamp(options.appeal ?? 0);
  const moveX = options.moveX ?? 0;
  const scale = 1.02;

  ctx.save();
  ctx.translate(position.x + moveX, position.y - rise * 10);
  ctx.scale(scale, scale);

  drawPlayerShadow(ctx, { x: 0, y: 0 }, 1.05);

  // Bent legs and pads.
  drawPixelPolygon(
    ctx,
    [
      { x: -13, y: -18 },
      { x: -5, y: -21 },
      { x: -2, y: -2 },
      { x: -13, y: -2 },
    ],
    '#dbe3ee',
  );
  drawPixelPolygon(
    ctx,
    [
      { x: 5, y: -21 },
      { x: 13, y: -18 },
      { x: 13, y: -2 },
      { x: 2, y: -2 },
    ],
    palette.white,
  );

  drawPixelRect(ctx, -10, -41, 20, 22, palette.fielding);
  drawPixelRect(ctx, -10, -41, 4, 21, palette.fieldingDark);
  drawPixelRect(ctx, -5, -51, 10, 8, palette.skin);
  drawPixelRect(ctx, -8, -56, 16, 6, palette.fieldingDark);

  const handY = -20 - appeal * 22;
  drawPixelRect(ctx, -18, handY, 8, 9, '#f8fafc');
  drawPixelRect(ctx, 10, handY, 8, 9, '#dfe7f1');
  drawPixelRect(ctx, -13, -34, 5, Math.max(7, handY + 34), palette.skinDark);
  drawPixelRect(ctx, 8, -34, 5, Math.max(7, handY + 34), palette.skin);

  ctx.restore();
}

function drawUmpire(
  ctx: CanvasRenderingContext2D,
  position: Vec2,
  scale: number,
  palette: Palette,
  signal: 'none' | 'six' | 'four' | 'out' = 'none',
): void {
  ctx.save();
  ctx.translate(position.x, position.y);
  ctx.scale(scale, scale);

  drawPlayerShadow(ctx, { x: 0, y: 0 }, 1);
  drawPixelRect(ctx, -7, -19, 6, 19, '#27354a');
  drawPixelRect(ctx, 2, -19, 6, 19, '#34465d');
  drawPixelRect(ctx, -11, -45, 22, 27, palette.umpire);
  drawPixelRect(ctx, -11, -45, 4, 26, palette.umpireDark);
  drawPixelRect(ctx, -5, -55, 10, 9, palette.skin);
  drawPixelRect(ctx, -9, -59, 18, 5, '#f5f5f4');
  drawPixelRect(ctx, -7, -61, 14, 3, '#d6d3d1');

  if (signal === 'six') {
    drawPixelRect(ctx, -14, -72, 5, 29, palette.skinDark);
    drawPixelRect(ctx, 9, -72, 5, 29, palette.skin);
  } else if (signal === 'four') {
    drawPixelRect(ctx, -26, -43, 17, 5, palette.skinDark);
    drawPixelRect(ctx, 9, -43, 17, 5, palette.skin);
  } else if (signal === 'out') {
    drawPixelRect(ctx, 8, -76, 5, 35, palette.skin);
    drawPixelRect(ctx, 7, -80, 7, 5, palette.skinDark);
  } else {
    drawPixelRect(ctx, -15, -43, 5, 22, palette.skinDark);
    drawPixelRect(ctx, 10, -43, 5, 22, palette.skin);
  }

  ctx.restore();
}

function drawWicket(
  ctx: CanvasRenderingContext2D,
  position: Vec2,
  scale: number,
  palette: Palette,
  intact: boolean,
): void {
  const stumpHeight = 35 * scale;
  const stumpWidth = Math.max(3, 4 * scale);
  const spacing = 6 * scale;

  ctx.save();
  ctx.translate(position.x, position.y);

  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath();
  ctx.ellipse(0, 2, 15 * scale, 4 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  [-spacing, 0, spacing].forEach((offset) => {
    drawPixelRect(
      ctx,
      offset - stumpWidth / 2 - 1,
      -stumpHeight - 1,
      stumpWidth + 2,
      stumpHeight + 3,
      palette.stumpDark,
    );
    drawPixelRect(
      ctx,
      offset - stumpWidth / 2,
      -stumpHeight,
      stumpWidth,
      stumpHeight,
      palette.stump,
    );
    drawPixelRect(
      ctx,
      offset,
      -stumpHeight,
      Math.max(1, stumpWidth / 3),
      stumpHeight,
      '#fff0ad',
    );
  });

  if (intact) {
    drawPixelRect(
      ctx,
      -spacing - 2,
      -stumpHeight - 4 * scale,
      spacing + 4,
      Math.max(3, 4 * scale),
      palette.bail,
    );
    drawPixelRect(
      ctx,
      -1,
      -stumpHeight - 4 * scale,
      spacing + 4,
      Math.max(3, 4 * scale),
      palette.bail,
    );
  }

  ctx.restore();
}

function drawBall(
  ctx: CanvasRenderingContext2D,
  position: Vec2,
  scale: number,
  palette: Palette,
  trail: Vec2[] = [],
): void {
  trail.forEach((point, index) => {
    const alpha = (index + 1) / trail.length;
    ctx.globalAlpha = alpha * 0.32;
    drawPixelRect(ctx, point.x - 2, point.y - 2, 4, 4, palette.ball);
  });
  ctx.globalAlpha = 1;

  drawPixelRect(ctx, position.x - 4 * scale, position.y - 4 * scale, 8 * scale, 8 * scale, palette.ballDark);
  drawPixelRect(ctx, position.x - 3 * scale, position.y - 3 * scale, 6 * scale, 6 * scale, palette.ball);
  drawPixelRect(ctx, position.x - 1 * scale, position.y - 3 * scale, 1 * scale, 6 * scale, '#ffe4e6');
  drawPixelRect(ctx, position.x + 1 * scale, position.y - 2 * scale, 1 * scale, 5 * scale, '#ffe4e6');
}

function spawnParticles(
  runtime: RuntimeState,
  position: Vec2,
  kind: PixelParticle['kind'],
  count: number,
  colors: string[],
): void {
  const rand = seededRandom(Math.floor(position.x * 17 + position.y * 31 + count * 13 + runtime.particles.length));
  for (let i = 0; i < count; i += 1) {
    const angle = rand() * Math.PI * 2;
    const speed = kind === 'dust' ? 0.5 + rand() * 1.8 : 1.5 + rand() * 4.5;
    runtime.particles.push({
      x: position.x,
      y: position.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - (kind === 'dust' ? 0.9 : 1.5),
      gravity: kind === 'dust' ? 0.035 : 0.075,
      life: kind === 'dust' ? 28 : 52,
      maxLife: kind === 'dust' ? 28 : 52,
      size: kind === 'confetti' ? 3 : 2 + rand() * 2,
      color: colors[Math.floor(rand() * colors.length)],
      kind,
    });
  }
}

function spawnBails(runtime: RuntimeState, position: Vec2, scale: number): void {
  runtime.bails.push(
    {
      x: position.x - 6 * scale,
      y: position.y - 36 * scale,
      vx: -2.8,
      vy: -5.4,
      angle: 0,
      spin: -0.28,
      life: 90,
      scale,
    },
    {
      x: position.x + 5 * scale,
      y: position.y - 36 * scale,
      vx: 3.1,
      vy: -5.8,
      angle: 0,
      spin: 0.33,
      life: 90,
      scale,
    },
  );
}

function updateAndDrawParticles(
  ctx: CanvasRenderingContext2D,
  runtime: RuntimeState,
): void {
  runtime.particles = runtime.particles.filter((particle) => {
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.vy += particle.gravity;
    particle.vx *= 0.985;
    particle.life -= 1;

    const alpha = clamp(particle.life / particle.maxLife);
    ctx.globalAlpha = alpha;
    const size = Math.max(1, particle.size * alpha);
    drawPixelRect(ctx, particle.x, particle.y, size, size, particle.color);
    ctx.globalAlpha = 1;
    return particle.life > 0;
  });
}

function updateAndDrawBails(
  ctx: CanvasRenderingContext2D,
  runtime: RuntimeState,
  palette: Palette,
): void {
  runtime.bails = runtime.bails.filter((bail) => {
    bail.x += bail.vx;
    bail.y += bail.vy;
    bail.vy += 0.18;
    bail.angle += bail.spin;
    bail.life -= 1;

    ctx.save();
    ctx.translate(bail.x, bail.y);
    ctx.rotate(bail.angle);
    drawPixelRect(ctx, -7 * bail.scale, -2 * bail.scale, 14 * bail.scale, 4 * bail.scale, palette.stumpDark);
    drawPixelRect(ctx, -6 * bail.scale, -1 * bail.scale, 12 * bail.scale, 3 * bail.scale, palette.bail);
    ctx.restore();

    return bail.life > 0 && bail.y < LOGICAL_H + 20;
  });
}

function trigger(runtime: RuntimeState, key: string, action: () => void): void {
  if (runtime.events.has(key)) return;
  runtime.events.add(key);
  action();
}

function drawFielderSet(
  ctx: CanvasRenderingContext2D,
  elapsed: number,
  outcome: CricketOutcome | null,
  palette: Palette,
): void {
  FIELDERS.forEach((fielder, index) => {
    let position = { ...fielder.position };
    let runCycle = 0;
    let armRaise = 0;
    let crouch = 0;

    if (outcome === 'four' && ['cover', 'deep-cover'].includes(fielder.role) && elapsed > 1.0) {
      const chase = clamp((elapsed - 1.0) / 2.3);
      const target = { x: 436, y: 138 };
      position = lerpPoint(fielder.position, target, chase * (fielder.role === 'cover' ? 0.7 : 0.45));
      runCycle = elapsed * 4.8;
    }

    if ((outcome === 'one' || outcome === 'two' || outcome === 'three') && fielder.role === 'cover' && elapsed > 1.0) {
      const chase = clamp((elapsed - 1.0) / 1.4);
      position = lerpPoint(fielder.position, { x: 258, y: 164 }, chase);
      runCycle = elapsed * 5;
      crouch = elapsed > 1.8 ? 0.35 : 0;
    }

    if (outcome === 'run_out' && fielder.role === 'cover' && elapsed > 1.0) {
      if (elapsed < 1.9) {
        position = lerpPoint(fielder.position, { x: 252, y: 168 }, clamp((elapsed - 1.0) / 0.9));
        runCycle = elapsed * 5;
      } else {
        position = { x: 252, y: 168 };
        crouch = elapsed < 2.2 ? 0.5 : 0;
        armRaise = elapsed > 2.15 && elapsed < 2.55 ? 0.65 : 0;
      }
    }

    if (outcome === 'six' && elapsed > 1.15) {
      armRaise = 0.35 + 0.15 * Math.sin(elapsed * 4 + index);
    }

    if (outcome === 'bowled' && elapsed > 1.05) {
      armRaise = 0.7;
    }

    drawStandingPlayer(
      ctx,
      position,
      fielder.scale,
      palette.fielding,
      palette.fieldingDark,
      palette,
      {
        flip: fielder.flip,
        armRaise,
        crouch,
        runCycle,
        kind: 'fielder',
      },
    );
  });
}

function drawRunningBatsmen(
  ctx: CanvasRenderingContext2D,
  elapsed: number,
  runs: 1 | 2 | 3,
  palette: Palette,
): void {
  const runStart = 1.02;
  const runDuration = runs === 1 ? 1.45 : runs === 2 ? 2.45 : 3.0;
  const progress = clamp((elapsed - runStart) / runDuration);
  const crossings = progress * runs;
  const laneA = { x: -4, y: -8 };
  const laneB = { x: 5, y: 7 };

  const strikerT = pingPong(crossings);
  const nonStrikerT = 1 - strikerT;
  const strikerBase = lerpPoint(STRIKER_GUARD, NON_STRIKER_GUARD, strikerT);
  const nonStrikerBase = lerpPoint(STRIKER_GUARD, NON_STRIKER_GUARD, nonStrikerT);

  const striker = { x: strikerBase.x + laneA.x, y: strikerBase.y + laneA.y };
  const nonStriker = { x: nonStrikerBase.x + laneB.x, y: nonStrikerBase.y + laneB.y };

  const strikerScale = lerp(1.03, 0.8, strikerT);
  const nonStrikerScale = lerp(1.03, 0.8, nonStrikerT);
  const cycle = elapsed * 4.7;

  const ordered = [
    { position: striker, scale: strikerScale, flip: false, cycle },
    { position: nonStriker, scale: nonStrikerScale, flip: true, cycle: cycle + 0.5 },
  ].sort((a, b) => a.position.y - b.position.y);

  ordered.forEach((runner) => {
    drawBatsman(ctx, runner.position, runner.scale, palette, {
      flip: runner.flip,
      running: progress > 0 && progress < 1,
      runCycle: runner.cycle,
      swing: 0,
    });
  });
}

function deliveryBallPosition(elapsed: number): Vec2 {
  const p = clamp(elapsed / DELIVERY_END);
  const curved = easeInOutCubic(p);
  const base = lerpPoint({ x: 347, y: 132 }, { x: 160, y: 191 }, curved);
  const bounce = Math.sin(p * Math.PI) * -13;
  return { x: base.x, y: base.y + bounce + p * p * 10 };
}

function drawOutcomeBanner(
  ctx: CanvasRenderingContext2D,
  elapsed: number,
  showAt: number,
  title: string,
  subtitle: string,
  accent: string,
): void {
  const alpha = clamp((elapsed - showAt) / 0.25);
  if (alpha <= 0) return;

  const bounce = Math.sin(clamp((elapsed - showAt) / 0.35) * Math.PI) * 6;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(0, -bounce);

  drawPixelRect(ctx, 96, 18, 288, 60, '#050915');
  drawPixelRect(ctx, 99, 21, 282, 54, '#111a2c');
  drawPixelRect(ctx, 99, 21, 282, 4, accent);
  drawPixelRect(ctx, 99, 71, 282, 4, shade(accent, -0.35));

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = "900 28px 'Arial Black', Impact, sans-serif";
  ctx.fillStyle = '#020617';
  ctx.fillText(title, 242, 45);
  ctx.fillStyle = accent;
  ctx.fillText(title, 240, 43);

  ctx.font = "700 10px Inter, Arial, sans-serif";
  ctx.fillStyle = '#eef2ff';
  ctx.fillText(subtitle.toUpperCase(), 240, 64);
  ctx.restore();
}

function drawCommonScene(
  ctx: CanvasRenderingContext2D,
  elapsed: number,
  outcome: CricketOutcome | null,
  palette: Palette,
  nearWicketIntact: boolean,
  farWicketIntact: boolean,
): void {
  drawSkyAndStadium(ctx, elapsed);
  drawOutfield(ctx);
  drawPitch(ctx);

  drawFielderSet(ctx, elapsed, outcome, palette);

  // Far end is drawn before near-end players for natural depth.
  drawWicket(ctx, BOWLER_WICKET, 0.8, palette, farWicketIntact);
  drawUmpire(ctx, UMPIRE_BOWLER_END, 0.72, palette, 'none');
  drawUmpire(ctx, UMPIRE_SQUARE_LEG, 0.78, palette, 'none');

  drawWicket(ctx, STRIKER_WICKET, 1.04, palette, nearWicketIntact);
}

function drawStaticPlayersBeforeDelivery(
  ctx: CanvasRenderingContext2D,
  elapsed: number,
  palette: Palette,
  options: {
    strikerSwing?: number;
    keeperRise?: number;
    keeperAppeal?: number;
    keeperMove?: number;
    nonStrikerReact?: number;
    bowlerVisible?: boolean;
  } = {},
): void {
  const strikerSwing = options.strikerSwing ?? 0;
  const keeperRise = options.keeperRise ?? 0;
  const keeperAppeal = options.keeperAppeal ?? 0;
  const keeperMove = options.keeperMove ?? 0;
  const nonStrikerReact = options.nonStrikerReact ?? 0;

  drawKeeper(ctx, KEEPER_POSITION, palette, {
    rise: keeperRise,
    moveX: keeperMove,
    appeal: keeperAppeal,
  });

  drawBatsman(ctx, NON_STRIKER_GUARD, 0.79, palette, {
    flip: true,
    swing: -0.05,
    running: false,
  });

  drawBatsman(ctx, STRIKER_GUARD, 1.03, palette, {
    flip: false,
    swing: strikerSwing,
    running: false,
  });

  if (options.bowlerVisible !== false) {
    drawBowler(ctx, clamp(elapsed / DELIVERY_END), palette);
  }

  if (nonStrikerReact > 0) {
    drawStandingPlayer(
      ctx,
      { x: NON_STRIKER_GUARD.x + 10, y: NON_STRIKER_GUARD.y - 2 },
      0.35,
      palette.batting,
      palette.battingDark,
      palette,
      { armRaise: nonStrikerReact, flip: true },
    );
  }
}

function renderSix(
  ctx: CanvasRenderingContext2D,
  elapsed: number,
  palette: Palette,
  runtime: RuntimeState,
): void {
  drawCommonScene(ctx, elapsed, 'six', palette, true, true);

  const swing = elapsed < DELIVERY_END
    ? 0
    : clamp((elapsed - DELIVERY_END) / 0.42);
  drawStaticPlayersBeforeDelivery(ctx, elapsed, palette, {
    strikerSwing: swing,
    keeperRise: clamp((elapsed - 0.7) / 0.5),
    nonStrikerReact: clamp((elapsed - 1.05) / 0.45),
  });

  let ball: Vec2;
  const trail: Vec2[] = [];
  if (elapsed <= DELIVERY_END) {
    ball = deliveryBallPosition(elapsed);
  } else {
    const p = clamp((elapsed - DELIVERY_END) / 2.85);
    const start = { x: 164, y: 187 };
    const end = { x: 455, y: 74 };
    ball = lerpPoint(start, end, easeOutCubic(p));
    ball.y -= Math.sin(p * Math.PI) * 105;
    for (let i = 4; i >= 1; i -= 1) {
      const tp = clamp(p - i * 0.035);
      const point = lerpPoint(start, end, easeOutCubic(tp));
      point.y -= Math.sin(tp * Math.PI) * 105;
      trail.push(point);
    }
  }
  drawBall(ctx, ball, 0.82, palette, trail);

  if (elapsed > DELIVERY_END) {
    trigger(runtime, 'six-contact', () => {
      runtime.shake = 5;
      spawnParticles(runtime, { x: 165, y: 187 }, 'spark', 20, ['#fff7ae', '#ffffff', '#fbbf24']);
    });
  }

  if (elapsed > 1.65) {
    trigger(runtime, 'six-fireworks', () => {
      spawnParticles(runtime, { x: 82, y: 64 }, 'confetti', 36, ['#f43f5e', '#38bdf8', '#fbbf24', '#4ade80', '#e879f9']);
      spawnParticles(runtime, { x: 402, y: 58 }, 'confetti', 36, ['#f43f5e', '#38bdf8', '#fbbf24', '#4ade80', '#e879f9']);
    });
  }

  const umpireSignal = elapsed > 2.3 ? 'six' : 'none';
  drawUmpire(ctx, UMPIRE_BOWLER_END, 0.72, palette, umpireSignal);
  drawOutcomeBanner(ctx, elapsed, 1.25, 'SIX!', 'Massive hit into the stands', '#fbbf24');
}

function renderFour(
  ctx: CanvasRenderingContext2D,
  elapsed: number,
  palette: Palette,
  runtime: RuntimeState,
): void {
  drawCommonScene(ctx, elapsed, 'four', palette, true, true);

  const swing = elapsed < DELIVERY_END ? 0 : clamp((elapsed - DELIVERY_END) / 0.35);
  drawStaticPlayersBeforeDelivery(ctx, elapsed, palette, {
    strikerSwing: swing * 0.72,
    keeperRise: clamp((elapsed - 0.72) / 0.45),
  });

  let ball: Vec2;
  const trail: Vec2[] = [];
  if (elapsed <= DELIVERY_END) {
    ball = deliveryBallPosition(elapsed);
  } else {
    const p = clamp((elapsed - DELIVERY_END) / 2.25);
    const start = { x: 165, y: 190 };
    const end = { x: 462, y: 137 };
    ball = lerpPoint(start, end, easeOutCubic(p));
    ball.y -= Math.abs(Math.sin(p * Math.PI * 4)) * 5 * (1 - p);
    for (let i = 4; i >= 1; i -= 1) {
      const tp = clamp(p - i * 0.035);
      const point = lerpPoint(start, end, easeOutCubic(tp));
      point.y -= Math.abs(Math.sin(tp * Math.PI * 4)) * 5 * (1 - tp);
      trail.push(point);
    }
  }
  drawBall(ctx, ball, 0.78, palette, trail);

  if (elapsed > DELIVERY_END) {
    trigger(runtime, 'four-contact', () => {
      runtime.shake = 3.5;
      spawnParticles(runtime, { x: 165, y: 190 }, 'spark', 14, ['#ffffff', '#fbbf24']);
    });
  }

  if (elapsed > 2.95) {
    trigger(runtime, 'four-rope', () => {
      spawnParticles(runtime, { x: 454, y: 138 }, 'dust', 22, ['#dbbf73', '#8f7441', '#f5e6ae']);
    });
  }

  drawUmpire(ctx, UMPIRE_BOWLER_END, 0.72, palette, elapsed > 2.75 ? 'four' : 'none');
  drawOutcomeBanner(ctx, elapsed, 1.18, 'FOUR!', 'Pierces the gap and reaches the rope', '#34d399');
}

function renderRuns(
  ctx: CanvasRenderingContext2D,
  elapsed: number,
  runs: 1 | 2 | 3,
  palette: Palette,
  runtime: RuntimeState,
): void {
  const outcome: CricketOutcome = runs === 1 ? 'one' : runs === 2 ? 'two' : 'three';
  drawCommonScene(ctx, elapsed, outcome, palette, true, true);

  if (elapsed < 1.02) {
    drawStaticPlayersBeforeDelivery(ctx, elapsed, palette, {
      strikerSwing: elapsed > DELIVERY_END ? 0.45 : 0,
      keeperRise: clamp((elapsed - 0.72) / 0.4),
    });
  } else {
    drawKeeper(ctx, KEEPER_POSITION, palette, { rise: 1, moveX: 4 });
    drawBowler(ctx, 1, palette);
    drawRunningBatsmen(ctx, elapsed, runs, palette);
  }

  let ball: Vec2;
  if (elapsed <= DELIVERY_END) {
    ball = deliveryBallPosition(elapsed);
  } else if (elapsed < 1.72) {
    const p = clamp((elapsed - DELIVERY_END) / 0.84);
    ball = lerpPoint({ x: 165, y: 190 }, { x: 258, y: 164 }, easeOutCubic(p));
  } else if (elapsed < 2.25) {
    ball = { x: 258, y: 164 };
  } else {
    const returnP = clamp((elapsed - 2.25) / 0.85);
    ball = lerpPoint({ x: 258, y: 164 }, STRIKER_WICKET, easeInOutCubic(returnP));
  }
  drawBall(ctx, ball, 0.72, palette);

  if (elapsed > DELIVERY_END) {
    trigger(runtime, `${runs}-run-contact`, () => {
      spawnParticles(runtime, { x: 165, y: 190 }, 'spark', 9, ['#ffffff', '#fbbf24']);
    });
  }

  const title = runs === 1 ? '1 RUN' : `${runs} RUNS`;
  const subtitle = runs === 1
    ? 'Both batters exchange ends'
    : runs === 2
      ? 'Sharp running between the wickets'
      : 'Three complete crossings before the return';
  drawOutcomeBanner(ctx, elapsed, 1.22, title, subtitle, runs === 1 ? '#cbd5e1' : runs === 2 ? '#c084fc' : '#38bdf8');
}

function renderDot(
  ctx: CanvasRenderingContext2D,
  elapsed: number,
  palette: Palette,
): void {
  drawCommonScene(ctx, elapsed, 'dot', palette, true, true);

  const keeperRise = clamp((elapsed - 0.72) / 0.55);
  const keeperMove = elapsed > 0.9 ? -6 * clamp((elapsed - 0.9) / 0.3) : 0;
  drawStaticPlayersBeforeDelivery(ctx, elapsed, palette, {
    strikerSwing: elapsed > 0.7 ? 0.08 : 0,
    keeperRise,
    keeperMove,
  });

  let ball: Vec2;
  if (elapsed <= DELIVERY_END) {
    ball = deliveryBallPosition(elapsed);
  } else {
    const p = clamp((elapsed - DELIVERY_END) / 0.45);
    ball = lerpPoint({ x: 160, y: 191 }, { x: 111, y: 196 }, easeOutCubic(p));
  }
  if (elapsed < 1.4) drawBall(ctx, ball, 0.72, palette);

  drawOutcomeBanner(ctx, elapsed, 1.18, 'DOT BALL', 'Safely taken by the wicketkeeper', '#94a3b8');
}

function renderBowled(
  ctx: CanvasRenderingContext2D,
  elapsed: number,
  palette: Palette,
  runtime: RuntimeState,
): void {
  const wicketBroken = elapsed > 0.98;
  drawCommonScene(ctx, elapsed, 'bowled', palette, !wicketBroken, true);

  drawStaticPlayersBeforeDelivery(ctx, elapsed, palette, {
    strikerSwing: elapsed > 0.72 ? -0.16 : 0,
    keeperRise: clamp((elapsed - 0.8) / 0.45),
    keeperAppeal: clamp((elapsed - 1.15) / 0.5),
  });

  let ball: Vec2;
  if (elapsed <= 0.98) {
    const p = clamp(elapsed / 0.98);
    const base = lerpPoint({ x: 347, y: 132 }, { x: 143, y: 175 }, easeInOutCubic(p));
    base.y -= Math.sin(p * Math.PI) * 11;
    ball = base;
    drawBall(ctx, ball, 0.74, palette);
  }

  if (wicketBroken) {
    trigger(runtime, 'bowled-impact', () => {
      runtime.shake = 7;
      spawnBails(runtime, STRIKER_WICKET, 1.04);
      spawnParticles(runtime, { x: STRIKER_WICKET.x, y: STRIKER_WICKET.y - 8 }, 'dust', 22, ['#d6bf86', '#8f7441', '#f7e3a7']);
      spawnParticles(runtime, { x: STRIKER_WICKET.x, y: STRIKER_WICKET.y - 22 }, 'spark', 18, ['#ffffff', '#fb7185', '#fbbf24']);
    });
  }

  drawUmpire(ctx, UMPIRE_BOWLER_END, 0.72, palette, elapsed > 1.45 ? 'out' : 'none');
  drawOutcomeBanner(ctx, elapsed, 1.2, 'BOWLED!', 'The ball crashes into the striker’s wicket', '#fb7185');
}

function renderRunOut(
  ctx: CanvasRenderingContext2D,
  elapsed: number,
  palette: Palette,
  runtime: RuntimeState,
): void {
  const wicketBroken = elapsed > 2.85;
  drawCommonScene(ctx, elapsed, 'run_out', palette, true, !wicketBroken);

  if (elapsed < 1.0) {
    drawStaticPlayersBeforeDelivery(ctx, elapsed, palette, {
      strikerSwing: elapsed > DELIVERY_END ? 0.5 : 0,
      keeperRise: clamp((elapsed - 0.72) / 0.4),
    });
  } else {
    drawKeeper(ctx, KEEPER_POSITION, palette, { rise: 1 });
    drawBowler(ctx, 1, palette);

    const runStart = 1.0;
    const attemptDuration = 2.05;
    const crossing = clamp((elapsed - runStart) / attemptDuration) * 1.72;
    const strikerT = pingPong(crossing);
    const nonStrikerT = 1 - strikerT;

    let strikerBase = lerpPoint(STRIKER_GUARD, NON_STRIKER_GUARD, strikerT);
    const nonStrikerBase = lerpPoint(STRIKER_GUARD, NON_STRIKER_GUARD, nonStrikerT);

    const dive = clamp((elapsed - 2.45) / 0.45);
    if (elapsed > 2.45) {
      strikerBase = lerpPoint(strikerBase, { x: 307, y: 165 }, dive);
    }

    const runners = [
      {
        position: { x: strikerBase.x - 4, y: strikerBase.y - 7 },
        scale: lerp(1.03, 0.8, strikerT),
        flip: false,
        dive,
      },
      {
        position: { x: nonStrikerBase.x + 5, y: nonStrikerBase.y + 7 },
        scale: lerp(1.03, 0.8, nonStrikerT),
        flip: true,
        dive: 0,
      },
    ].sort((a, b) => a.position.y - b.position.y);

    runners.forEach((runner, index) => {
      drawBatsman(ctx, runner.position, runner.scale, palette, {
        flip: runner.flip,
        running: elapsed < 2.9,
        runCycle: elapsed * 4.8 + index * 0.4,
        dive: runner.dive,
      });
    });
  }

  let ball: Vec2;
  if (elapsed <= DELIVERY_END) {
    ball = deliveryBallPosition(elapsed);
  } else if (elapsed < 1.72) {
    const p = clamp((elapsed - DELIVERY_END) / 0.84);
    ball = lerpPoint({ x: 165, y: 190 }, { x: 252, y: 168 }, easeOutCubic(p));
  } else if (elapsed < 2.22) {
    ball = { x: 252, y: 168 };
  } else {
    const p = clamp((elapsed - 2.22) / 0.63);
    ball = lerpPoint({ x: 252, y: 168 }, { x: BOWLER_WICKET.x, y: BOWLER_WICKET.y - 16 }, easeInOutCubic(p));
    ball.y -= Math.sin(p * Math.PI) * 16;
  }
  if (elapsed < 2.9) drawBall(ctx, ball, 0.7, palette);

  if (wicketBroken) {
    trigger(runtime, 'runout-impact', () => {
      runtime.shake = 6;
      spawnBails(runtime, BOWLER_WICKET, 0.8);
      spawnParticles(runtime, { x: BOWLER_WICKET.x, y: BOWLER_WICKET.y - 8 }, 'dust', 18, ['#d6bf86', '#8f7441', '#f7e3a7']);
      spawnParticles(runtime, { x: BOWLER_WICKET.x, y: BOWLER_WICKET.y - 16 }, 'spark', 15, ['#ffffff', '#fb7185']);
    });
  }

  drawUmpire(ctx, UMPIRE_BOWLER_END, 0.72, palette, elapsed > 3.25 ? 'out' : 'none');
  if (elapsed > 1.05 && elapsed < 2.95) {
    drawOutcomeBanner(ctx, elapsed, 1.2, 'SECOND RUN?', 'The batters take on the fielder’s throw', '#cbd5e1');
  }
  if (elapsed >= 3.0) {
    drawOutcomeBanner(ctx, elapsed, 3.0, 'RUN OUT!', 'Direct hit before the bat reaches the crease', '#fb7185');
  }
}

function renderIdle(
  ctx: CanvasRenderingContext2D,
  elapsed: number,
  palette: Palette,
): void {
  drawCommonScene(ctx, elapsed, null, palette, true, true);
  drawKeeper(ctx, KEEPER_POSITION, palette, { rise: 0 });
  drawBatsman(ctx, NON_STRIKER_GUARD, 0.79, palette, { flip: true });
  drawBatsman(ctx, STRIKER_GUARD, 1.03, palette, { flip: false });
  drawBowler(ctx, 0, palette);
}

function drawFrame(
  ctx: CanvasRenderingContext2D,
  elapsed: number,
  outcome: CricketOutcome | null,
  palette: Palette,
  runtime: RuntimeState,
): void {
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, LOGICAL_W, LOGICAL_H);

  let shakeX = 0;
  let shakeY = 0;
  if (runtime.shake > 0.1) {
    shakeX = (Math.random() - 0.5) * runtime.shake;
    shakeY = (Math.random() - 0.5) * runtime.shake;
    runtime.shake *= 0.84;
  }

  ctx.save();
  ctx.translate(Math.round(shakeX), Math.round(shakeY));

  switch (outcome) {
    case 'six':
      renderSix(ctx, elapsed, palette, runtime);
      break;
    case 'four':
      renderFour(ctx, elapsed, palette, runtime);
      break;
    case 'three':
      renderRuns(ctx, elapsed, 3, palette, runtime);
      break;
    case 'two':
      renderRuns(ctx, elapsed, 2, palette, runtime);
      break;
    case 'one':
      renderRuns(ctx, elapsed, 1, palette, runtime);
      break;
    case 'run_out':
      renderRunOut(ctx, elapsed, palette, runtime);
      break;
    case 'bowled':
      renderBowled(ctx, elapsed, palette, runtime);
      break;
    case 'dot':
      renderDot(ctx, elapsed, palette);
      break;
    default:
      renderIdle(ctx, elapsed, palette);
      break;
  }

  updateAndDrawParticles(ctx, runtime);
  updateAndDrawBails(ctx, runtime, palette);
  ctx.restore();

  // Pixel-art frame.
  drawPixelRect(ctx, 0, 0, LOGICAL_W, 3, '#0f172a');
  drawPixelRect(ctx, 0, LOGICAL_H - 3, LOGICAL_W, 3, '#0f172a');
  drawPixelRect(ctx, 0, 0, 3, LOGICAL_H, '#0f172a');
  drawPixelRect(ctx, LOGICAL_W - 3, 0, 3, LOGICAL_H, '#0f172a');
}

const CricketCanvas: React.FC<CricketCanvasProps> = ({
  outcome,
  onAnimationComplete,
  reducedMotion = false,
  teamColors = DEFAULT_TEAM_COLORS,
}) => {
  const [battingTeamColor, fieldingTeamColor] = teamColors;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const completionRef = useRef(false);
  const completionCallbackRef = useRef(onAnimationComplete);
  const runtimeRef = useRef<RuntimeState>({
    particles: [],
    bails: [],
    events: new Set<string>(),
    shake: 0,
  });

  useEffect(() => {
    completionCallbackRef.current = onAnimationComplete;
  }, [onAnimationComplete]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    const palette = buildPalette([battingTeamColor, fieldingTeamColor]);
    const runtime = runtimeRef.current;
    runtime.particles = [];
    runtime.bails = [];
    runtime.events = new Set<string>();
    runtime.shake = 0;
    completionRef.current = false;

    const start = performance.now();
    const duration = outcome ? DURATIONS[outcome] ?? 3.2 : Infinity;

    const tick = (timestamp: number) => {
      const elapsed = (timestamp - start) / 1000;
      const renderTime = reducedMotion && outcome ? Math.min(elapsed * 2.2, duration * 0.78) : elapsed;

      drawFrame(ctx, renderTime, outcome, palette, runtime);

      if (outcome && elapsed >= (reducedMotion ? Math.min(1.35, duration) : duration)) {
        if (!completionRef.current) {
          completionRef.current = true;
          completionCallbackRef.current();
        }
        return;
      }

      animationRef.current = requestAnimationFrame(tick);
    };

    animationRef.current = requestAnimationFrame(tick);

    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [outcome, reducedMotion, battingTeamColor, fieldingTeamColor]);

  return (
    <canvas
      ref={canvasRef}
      width={LOGICAL_W}
      height={LOGICAL_H}
      className="h-full w-full rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl shadow-indigo-950/60"
      style={{
        maxWidth: '100%',
        maxHeight: '100%',
        objectFit: 'contain',
        imageRendering: 'pixelated',
      }}
      role="img"
      aria-label="Pixel-art cricket match animation with a full pitch, two batsmen, bowler, wicketkeeper, umpires and fielders"
    />
  );
};

export default CricketCanvas;
