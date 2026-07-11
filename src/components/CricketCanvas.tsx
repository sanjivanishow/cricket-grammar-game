// ============================================================
// Grammar Cricket — Cricket Animation Canvas
// Canvas-based cricket field with animations inspired by
// the Google Doodle Cricket style
// ============================================================

import React, { useRef, useEffect, useCallback } from 'react';
import { CricketOutcome } from '../engine/GameState';

interface CricketCanvasProps {
  outcome: CricketOutcome | null;
  onAnimationComplete: () => void;
  reducedMotion?: boolean;
  teamColors?: [string, string];
}

// ─────────────────────────────────────────────────────────────
// Drawing helpers
// ─────────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [34, 197, 94];
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
  maxLife: number;
  size: number;
  gravity: number;
}

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  trail: Array<{ x: number; y: number; alpha: number }>;
  bounced: boolean;
}



// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────

const CricketCanvas: React.FC<CricketCanvasProps> = ({
  outcome,
  onAnimationComplete,
  reducedMotion = false,
  teamColors = ['#22c55e', '#3b82f6'],
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  const particlesRef = useRef<Particle[]>([]);
  const ballRef = useRef<Ball | null>(null);
  const completedRef = useRef<boolean>(false);
  const bailsRef = useRef<Array<{ x: number; y: number; vx: number; vy: number; angle: number; spin: number }>>([]);
  const shakeRef = useRef({ x: 0, y: 0, decay: 0 });

  // Stump positions (in canvas coords)
  const CANVAS_W = 800;
  const CANVAS_H = 480;
  const PITCH_Y = CANVAS_H * 0.62;
  const BATTING_X = CANVAS_W * 0.25;
  const BOWLING_X = CANVAS_W * 0.75;
  const STUMP_HEIGHT = 52;
  const STUMP_W = 6;
  const STUMP_SPACING = 9;

  const COLORS = {
    sky: '#87CEEB',
    skyBottom: '#B0E0FF',
    grass: '#4ade80',
    grassDark: '#22c55e',
    pitch: '#D4A853',
    pitchLight: '#E8C270',
    crowd: '#94a3b8',
    stump: '#F5DEB3',
    bail: '#D2691E',
    ball: '#CC2200',
    bat: '#8B6914',
    batHandle: '#5C3A00',
    boundaryRope: '#FFFFFF',
  };

  // ─────────────────────────────────────────────────────────
  // Draw static cricket field
  // ─────────────────────────────────────────────────────────

  const drawField = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number) => {
    // Sky gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.45);
    skyGrad.addColorStop(0, '#87CEEB');
    skyGrad.addColorStop(1, '#C8EEFF');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h * 0.45);

    // Clouds
    drawCloud(ctx, w * 0.2, h * 0.08, 50, 20);
    drawCloud(ctx, w * 0.55, h * 0.05, 70, 25);
    drawCloud(ctx, w * 0.8, h * 0.12, 45, 18);

    // Ground gradient
    const groundGrad = ctx.createLinearGradient(0, h * 0.45, 0, h);
    groundGrad.addColorStop(0, '#4ade80');
    groundGrad.addColorStop(0.3, '#22c55e');
    groundGrad.addColorStop(1, '#16a34a');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, h * 0.45, w, h * 0.55);

    // Crowd stands (simplified bleachers)
    drawCrowd(ctx, w, h);

    // Cricket oval markings
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(w / 2, h * 0.7, w * 0.42, h * 0.22, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Boundary rope
    ctx.save();
    ctx.strokeStyle = COLORS.boundaryRope;
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.ellipse(w / 2, h * 0.72, w * 0.44, h * 0.23, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // Pitch rectangle
    const pitchW = 60;
    const pitchH = 120;
    const pitchX = w / 2 - pitchW / 2;
    const pitchY_top = PITCH_Y - pitchH / 2;
    const pitchGrad = ctx.createLinearGradient(pitchX, pitchY_top, pitchX + pitchW, pitchY_top);
    pitchGrad.addColorStop(0, COLORS.pitchLight);
    pitchGrad.addColorStop(0.5, COLORS.pitch);
    pitchGrad.addColorStop(1, COLORS.pitchLight);
    ctx.fillStyle = pitchGrad;
    ctx.beginPath();
    ctx.roundRect(pitchX, pitchY_top, pitchW, pitchH, 4);
    ctx.fill();

    // Crease lines
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(pitchX - 8, pitchY_top + 15);
    ctx.lineTo(pitchX + pitchW + 8, pitchY_top + 15);
    ctx.moveTo(pitchX - 8, pitchY_top + pitchH - 15);
    ctx.lineTo(pitchX + pitchW + 8, pitchY_top + pitchH - 15);
    ctx.stroke();
  }, [PITCH_Y]);

  function drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.ellipse(x, y, w * 0.5, h * 0.5, 0, 0, Math.PI * 2);
    ctx.ellipse(x + w * 0.3, y - h * 0.1, w * 0.4, h * 0.45, 0, 0, Math.PI * 2);
    ctx.ellipse(x - w * 0.3, y - h * 0.05, w * 0.35, h * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawCrowd(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const crowdY = h * 0.44;
    const crowdColors = ['#ef4444', '#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899'];

    // Draw simplified crowd figures
    for (let i = 0; i < 40; i++) {
      const x = (w / 40) * i + Math.sin(i * 2.3) * 5;
      const y = crowdY - Math.sin(i * 1.7) * 5;
      const color = crowdColors[i % crowdColors.length];

      ctx.save();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFDAB9';
      ctx.beginPath();
      ctx.arc(x, y - 7, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // ─────────────────────────────────────────────────────────
  // Draw stumps
  // ─────────────────────────────────────────────────────────

  function drawStumps(ctx: CanvasRenderingContext2D, cx: number, y: number, intact: boolean = true) {
    const stumpsX = [cx - STUMP_SPACING, cx, cx + STUMP_SPACING];

    // Shadow
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(cx, y + 2, STUMP_SPACING * 2, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Stumps
    stumpsX.forEach(sx => {
      ctx.fillStyle = COLORS.stump;
      ctx.beginPath();
      ctx.roundRect(sx - STUMP_W / 2, y - STUMP_HEIGHT, STUMP_W, STUMP_HEIGHT, 2);
      ctx.fill();

      // Stump detail line
      ctx.strokeStyle = 'rgba(0,0,0,0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(sx, y - STUMP_HEIGHT + 2);
      ctx.lineTo(sx, y - 2);
      ctx.stroke();
    });

    // Bails (top cross pieces)
    if (intact) {
      ctx.fillStyle = COLORS.bail;
      ctx.beginPath();
      ctx.roundRect(cx - STUMP_SPACING - STUMP_W / 2 - 1, y - STUMP_HEIGHT - 5, STUMP_SPACING + STUMP_W, 5, 2);
      ctx.fill();
      ctx.beginPath();
      ctx.roundRect(cx + STUMP_W / 2 - 1, y - STUMP_HEIGHT - 5, STUMP_SPACING + STUMP_W, 5, 2);
      ctx.fill();
    }
  }

  // ─────────────────────────────────────────────────────────
  // Draw batsman
  // ─────────────────────────────────────────────────────────

  function drawBatsman(ctx: CanvasRenderingContext2D, x: number, y: number, swingAngle: number = 0, color: string = '#22c55e') {
    ctx.save();
    ctx.translate(x, y);

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath();
    ctx.ellipse(0, 5, 18, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Legs
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(-8, -20, 7, 20);
    ctx.fillRect(2, -20, 7, 20);

    // Body (jersey)
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(-10, -45, 20, 28, 4);
    ctx.fill();

    // Head
    ctx.fillStyle = '#FFDAB9';
    ctx.beginPath();
    ctx.arc(0, -52, 9, 0, Math.PI * 2);
    ctx.fill();

    // Helmet
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, -55, 9, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(-12, -56, 4, 6, 1);
    ctx.fill();

    // Bat (rotated based on swing)
    ctx.save();
    ctx.translate(12, -35);
    ctx.rotate(swingAngle);

    // Bat handle
    ctx.fillStyle = COLORS.batHandle;
    ctx.fillRect(-2, -30, 4, 20);

    // Bat blade
    ctx.fillStyle = COLORS.bat;
    ctx.beginPath();
    ctx.roundRect(-5, -12, 14, 40, 3);
    ctx.fill();

    // Bat grain lines
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(-4, -8 + i * 10);
      ctx.lineTo(8, -8 + i * 10);
      ctx.stroke();
    }
    ctx.restore();

    // Gloves
    ctx.fillStyle = '#DDDDDD';
    ctx.beginPath();
    ctx.arc(10, -36, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // ─────────────────────────────────────────────────────────
  // Draw bowler
  // ─────────────────────────────────────────────────────────

  function drawBowler(ctx: CanvasRenderingContext2D, x: number, y: number, runUpProgress: number = 0, color: string = '#3b82f6') {
    ctx.save();
    ctx.translate(x - runUpProgress * 30, y);
    ctx.scale(-1, 1); // Mirror to face left

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath();
    ctx.ellipse(0, 5, 15, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Running pose legs
    const legAngle = Math.sin(runUpProgress * Math.PI * 4) * 0.4;
    ctx.save();
    ctx.rotate(legAngle);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(-5, -20, 6, 22);
    ctx.restore();

    ctx.save();
    ctx.rotate(-legAngle);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, -20, 6, 22);
    ctx.restore();

    // Body
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(-8, -44, 17, 26, 4);
    ctx.fill();

    // Head
    ctx.fillStyle = '#FFDAB9';
    ctx.beginPath();
    ctx.arc(0, -50, 8, 0, Math.PI * 2);
    ctx.fill();

    // Cap
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, -53, 8, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(7, -54, 4, 5, 1);
    ctx.fill();

    // Bowling arm
    const armAngle = runUpProgress > 0.7 ? (runUpProgress - 0.7) * Math.PI * 2 : -0.3;
    ctx.save();
    ctx.translate(8, -38);
    ctx.rotate(armAngle);
    ctx.fillStyle = color;
    ctx.fillRect(-3, -18, 6, 22);
    ctx.restore();

    ctx.restore();
  }

  // ─────────────────────────────────────────────────────────
  // Draw cricket ball
  // ─────────────────────────────────────────────────────────

  function drawBall(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, trail: Array<{ x: number; y: number; alpha: number }>) {
    // Draw trail
    trail.forEach(t => {
      ctx.save();
      ctx.globalAlpha = t.alpha * 0.4;
      ctx.fillStyle = COLORS.ball;
      ctx.beginPath();
      ctx.arc(t.x, t.y, r * 0.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // Ball shadow
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(x + 2, y + 3, r, r * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Ball body
    const ballGrad = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
    ballGrad.addColorStop(0, '#FF4444');
    ballGrad.addColorStop(0.6, COLORS.ball);
    ballGrad.addColorStop(1, '#880000');
    ctx.fillStyle = ballGrad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    // Seam
    ctx.strokeStyle = 'rgba(255,200,200,0.6)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y, r * 0.7, -0.5, 0.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y, r * 0.7, Math.PI - 0.5, Math.PI + 0.5);
    ctx.stroke();
  }

  // ─────────────────────────────────────────────────────────
  // Draw particles (fireworks/celebrations)
  // ─────────────────────────────────────────────────────────

  function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]) {
    particles.forEach(p => {
      const alpha = p.life / p.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  function spawnFireworks(x: number, y: number, count: number = 30) {
    const colors = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff922b', '#cc5de8', '#ffffff'];
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
      const speed = 2 + Math.random() * 5;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 60 + Math.random() * 40,
        maxLife: 100,
        size: 3 + Math.random() * 4,
        gravity: 0.1,
      });
    }
  }

  function updateParticles() {
    particlesRef.current = particlesRef.current
      .map(p => ({
        ...p,
        x: p.x + p.vx,
        y: p.y + p.vy,
        vy: p.vy + p.gravity,
        vx: p.vx * 0.98,
        life: p.life - 1,
      }))
      .filter(p => p.life > 0);
  }

  // ─────────────────────────────────────────────────────────
  // Draw bails flying
  // ─────────────────────────────────────────────────────────

  function drawBails(ctx: CanvasRenderingContext2D) {
    bailsRef.current.forEach(b => {
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.angle);
      ctx.fillStyle = COLORS.bail;
      ctx.beginPath();
      ctx.roundRect(-8, -2, 16, 4, 2);
      ctx.fill();
      ctx.restore();
    });
  }

  function spawnBails(cx: number, y: number) {
    bailsRef.current = [
      {
        x: cx - STUMP_SPACING,
        y: y - STUMP_HEIGHT,
        vx: -2 - Math.random() * 2,
        vy: -6 - Math.random() * 3,
        angle: 0,
        spin: 0.15 + Math.random() * 0.2,
      },
      {
        x: cx + STUMP_SPACING,
        y: y - STUMP_HEIGHT,
        vx: 2 + Math.random() * 2,
        vy: -5 - Math.random() * 3,
        angle: 0,
        spin: -(0.15 + Math.random() * 0.2),
      },
    ];
  }

  function updateBails() {
    bailsRef.current = bailsRef.current
      .map(b => ({
        ...b,
        x: b.x + b.vx,
        y: b.y + b.vy,
        vy: b.vy + 0.3,
        angle: b.angle + b.spin,
      }))
      .filter(b => b.y < CANVAS_H + 30);
  }

  // ─────────────────────────────────────────────────────────
  // Draw result banner
  // ─────────────────────────────────────────────────────────

  function drawBanner(ctx: CanvasRenderingContext2D, text: string, subtext: string, w: number, h: number, color: string, alpha: number) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, alpha);

    // Banner background
    const bw = Math.min(w * 0.7, 500);
    const bh = 90;
    const bx = w / 2 - bw / 2;
    const by = h * 0.22;

    const [r, g, b2] = hexToRgb(color);

    const bannerGrad = ctx.createLinearGradient(bx, by, bx + bw, by + bh);
    bannerGrad.addColorStop(0, `rgba(${r},${g},${b2},0.95)`);
    bannerGrad.addColorStop(0.5, `rgba(${Math.min(255, r + 40)},${Math.min(255, g + 40)},${Math.min(255, b2 + 40)},0.95)`);
    bannerGrad.addColorStop(1, `rgba(${r},${g},${b2},0.95)`);

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.roundRect(bx + 4, by + 4, bw, bh, 12);
    ctx.fill();

    // Banner
    ctx.fillStyle = bannerGrad;
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, 12);
    ctx.fill();

    // Border
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, 12);
    ctx.stroke();

    // Main text
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold ${Math.min(48, bw * 0.12)}px 'Arial', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 8;
    ctx.fillText(text, w / 2, by + bh * 0.38);

    // Sub text
    ctx.font = `${Math.min(20, bw * 0.05)}px 'Arial', sans-serif`;
    ctx.shadowBlur = 4;
    ctx.fillText(subtext, w / 2, by + bh * 0.72);

    ctx.restore();
  }

  // ─────────────────────────────────────────────────────────
  // Screen shake
  // ─────────────────────────────────────────────────────────

  let shakeX = 0;
  let shakeY = 0;
  let shakeDecay = 0;

  function startShake(intensity: number) {
    if (reducedMotion) return;
    shakeDecay = intensity;
  }

  // ─────────────────────────────────────────────────────────
  // Main animation loop
  // ─────────────────────────────────────────────────────────

  const animate = useCallback((timestamp: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const elapsed = timestamp - startTimeRef.current;

    // Apply screen shake
    if (shakeDecay > 0) {
      shakeX = (Math.random() - 0.5) * shakeDecay;
      shakeY = (Math.random() - 0.5) * shakeDecay;
      shakeDecay *= 0.85;
      if (shakeDecay < 0.1) shakeDecay = 0;
    } else {
      shakeX = 0;
      shakeY = 0;
    }

    ctx.save();
    ctx.translate(shakeX, shakeY);

    // Clear
    ctx.clearRect(-10, -10, w + 20, h + 20);

    // Draw static field
    drawField(ctx, w, h);



    // Update ball physics
    if (ballRef.current) {
      const ball = ballRef.current;
      ball.trail.push({ x: ball.x, y: ball.y, alpha: 1 });
      if (ball.trail.length > 12) ball.trail.shift();
      ball.trail = ball.trail.map((t, i) => ({ ...t, alpha: (i / ball.trail.length) }));

      ball.x += ball.vx;
      ball.y += ball.vy;
      ball.vy += 0.18; // gravity

      // Bounce off ground
      if (ball.y > PITCH_Y - 5 && !ball.bounced) {
        ball.vy = -ball.vy * 0.5;
        ball.vx *= 0.9;
        ball.bounced = true;
      }
    }

    // Update particles and bails
    updateParticles();
    updateBails();

    // ── Render based on outcome ──
    switch (outcome) {
      case 'six':
        renderSix(ctx, w, h, elapsed);
        break;
      case 'four':
        renderFour(ctx, w, h, elapsed);
        break;
      case 'three':
        renderThreeRuns(ctx, w, h, elapsed);
        break;
      case 'two':
        renderTwoRuns(ctx, w, h, elapsed);
        break;
      case 'one':
        renderOneRun(ctx, w, h, elapsed);
        break;
      case 'run_out':
        renderRunOut(ctx, w, h, elapsed);
        break;
      case 'bowled':
        renderBowled(ctx, w, h, elapsed);
        break;
      case 'dot':
        renderDot(ctx, w, h, elapsed);
        break;
    }

    drawParticles(ctx, particlesRef.current);
    drawBails(ctx);

    ctx.restore();

    // Check completion
    const duration = getAnimationDuration(outcome);
    if (elapsed >= duration && !completedRef.current) {
      completedRef.current = true;
      onAnimationComplete();
      return;
    }

    animRef.current = requestAnimationFrame(animate);
  }, [outcome, reducedMotion, onAnimationComplete, drawField]);

  // ─────────────────────────────────────────────────────────
  // Outcome-specific renderers
  // ─────────────────────────────────────────────────────────

  function getAnimationDuration(o: CricketOutcome | null): number {
    if (reducedMotion) return 1500;
    switch (o) {
      case 'six': return 4500;
      case 'four': return 3500;
      case 'three': return 3000;
      case 'two': return 2500;
      case 'one': return 2000;
      case 'run_out': return 4000;
      case 'bowled': return 3500;
      case 'dot': return 1800;
      default: return 2000;
    }
  }

  function renderSix(ctx: CanvasRenderingContext2D, w: number, h: number, elapsed: number) {
    const phase1 = Math.min(elapsed / 600, 1); // bat swing
    const phase2 = Math.max(0, (elapsed - 300) / 4200); // ball flight

    // Bowler (static after delivery)
    drawBowler(ctx, BOWLING_X, h * 0.62, 1.0, teamColors[1]);

    // Ball arcing high
    if (phase2 > 0) {
      const bx = BATTING_X + phase2 * (w * 0.7);
      const arcHeight = -Math.sin(phase2 * Math.PI) * h * 0.55;
      const by = h * 0.6 + arcHeight;

      drawBall(ctx, bx, by, 10, ballRef.current?.trail || []);

      // Ball goes over boundary
      if (phase2 > 0.85) {
        spawnFireworks(w * 0.8, h * 0.3, 5);
        startShake(6);
      }
    }

    // Batsman with swing
    const swingAngle = phase1 < 0.5 ? phase1 * -1.2 : (1 - phase1) * -0.6;
    drawBatsman(ctx, BATTING_X, h * 0.62, swingAngle, teamColors[0]);

    // Fireworks after hit
    if (elapsed > 1000 && elapsed < 3000 && elapsed % 200 < 20) {
      spawnFireworks(Math.random() * w, Math.random() * h * 0.5, 20);
    }

    // Excited crowd arms up
    if (elapsed > 600) {
      drawExcitedCrowd(ctx, w, h, elapsed);
    }

    // Banner
    if (elapsed > 400) {
      const bannerAlpha = Math.min(1, (elapsed - 400) / 300);
      drawBanner(ctx, '⭐ SIX! ⭐', 'Maximum! The crowd goes wild!', w, h, '#f59e0b', bannerAlpha);
    }
  }

  function renderFour(ctx: CanvasRenderingContext2D, w: number, h: number, elapsed: number) {
    const phase1 = Math.min(elapsed / 500, 1);
    const phase2 = Math.max(0, (elapsed - 250) / 3250);

    drawBowler(ctx, BOWLING_X, h * 0.62, 1.0, teamColors[1]);

    if (phase2 > 0) {
      const bx = BATTING_X + phase2 * (w * 0.75);
      // Ground-level boundary shot
      const by = h * 0.64 - Math.sin(phase2 * Math.PI * 0.6) * 30;
      drawBall(ctx, bx, by, 10, []);
    }

    const swingAngle = phase1 < 0.5 ? phase1 * -0.9 : (1 - phase1) * -0.3;
    drawBatsman(ctx, BATTING_X, h * 0.62, swingAngle, teamColors[0]);

    if (elapsed > 800) {
      drawExcitedCrowd(ctx, w, h, elapsed);
    }

    if (elapsed > 350) {
      drawBanner(ctx, '🏏 FOUR!', 'Great boundary shot!', w, h, '#22c55e', Math.min(1, (elapsed - 350) / 250));
    }
  }

  function renderThreeRuns(ctx: CanvasRenderingContext2D, w: number, h: number, elapsed: number) {
    drawBowler(ctx, BOWLING_X, h * 0.62, 1.0, teamColors[1]);

    if (elapsed > 300) {
      const bx = BATTING_X + Math.min((elapsed - 300) / 800, 1) * w * 0.4;
      const by = h * 0.62;
      drawBall(ctx, bx, by, 10, []);
    }

    const running = elapsed > 400;
    const runOffset = running ? Math.sin(elapsed / 100) * 5 : 0;
    drawBatsman(ctx, BATTING_X + (running ? (elapsed - 400) % 200 * 0.3 : 0), h * 0.62 + runOffset, running ? -0.2 : 0, teamColors[0]);

    if (elapsed > 450) {
      drawBanner(ctx, '3 RUNS', 'Good running between wickets!', w, h, '#3b82f6', Math.min(1, (elapsed - 450) / 300));
    }
  }

  function renderTwoRuns(ctx: CanvasRenderingContext2D, w: number, h: number, elapsed: number) {
    drawBowler(ctx, BOWLING_X, h * 0.62, 1.0, teamColors[1]);

    if (elapsed > 250) {
      const bx = BATTING_X + Math.min((elapsed - 250) / 700, 1) * w * 0.3;
      const by = h * 0.63;
      drawBall(ctx, bx, by, 10, []);
    }

    drawBatsman(ctx, BATTING_X, h * 0.62, elapsed < 400 ? -0.4 : 0, teamColors[0]);

    if (elapsed > 400) {
      drawBanner(ctx, '2 RUNS', 'Safe running!', w, h, '#8b5cf6', Math.min(1, (elapsed - 400) / 250));
    }
  }

  function renderOneRun(ctx: CanvasRenderingContext2D, w: number, h: number, elapsed: number) {
    drawBowler(ctx, BOWLING_X, h * 0.62, 1.0, teamColors[1]);

    if (elapsed > 200) {
      const bx = BATTING_X + Math.min((elapsed - 200) / 500, 1) * w * 0.2;
      const by = h * 0.63;
      drawBall(ctx, bx, by, 10, []);
    }

    drawBatsman(ctx, BATTING_X, h * 0.62, elapsed < 350 ? -0.25 : 0, teamColors[0]);

    if (elapsed > 350) {
      drawBanner(ctx, '1 RUN', 'Scrambled single!', w, h, '#6b7280', Math.min(1, (elapsed - 350) / 200));
    }
  }

  function renderRunOut(ctx: CanvasRenderingContext2D, w: number, h: number, elapsed: number) {
    // Phase 1: hit (0-600ms), Phase 2: run (600-2000ms), Phase 3: throw (2000-3000ms), Phase 4: wicket (3000-4000ms)
    drawBowler(ctx, BOWLING_X, h * 0.62, 1.0, teamColors[1]);

    const batswingAngle = elapsed < 500 ? (elapsed / 500) * -0.8 : 0;
    const runProgress = elapsed > 600 ? Math.min((elapsed - 600) / 1400, 1) : 0;
    const batX = BATTING_X + runProgress * 80;

    drawBatsman(ctx, batX, h * 0.62, batswingAngle, teamColors[0]);

    if (elapsed > 350) {
      const bx = BATTING_X + Math.min((elapsed - 350) / 400, 1) * w * 0.25;
      const by = h * 0.63;
      drawBall(ctx, bx, by, 10, []);
    }

    // Fielder throws
    if (elapsed > 2200) {
      const throwProgress = Math.min((elapsed - 2200) / 800, 1);
      const bx = BATTING_X + 90 + throwProgress * (BOWLING_X - BATTING_X - 90);
      const by = h * 0.62 - Math.sin(throwProgress * Math.PI) * 60;
      drawBall(ctx, bx, by, 10, []);
    }

    // Stumps broken at 3000ms
    if (elapsed > 3000) {
      drawStumps(ctx, w / 2 - 30, PITCH_Y, false);
      drawStumps(ctx, BOWLING_X, PITCH_Y, false);
      spawnBails(BATTING_X, PITCH_Y);
      startShake(4);
    } else {
      drawStumps(ctx, w / 2 - 30, PITCH_Y, true);
      drawStumps(ctx, BOWLING_X, PITCH_Y, true);
    }

    // Banner
    if (elapsed > 400 && elapsed < 2500) {
      drawBanner(ctx, '1 RUN', 'Running...', w, h, '#6b7280', Math.min(1, (elapsed - 400) / 200));
    }
    if (elapsed > 3200) {
      drawBanner(ctx, '🚨 RUN OUT!', 'Brilliant direct hit!', w, h, '#ef4444', Math.min(1, (elapsed - 3200) / 200));
    }
  }

  function renderBowled(ctx: CanvasRenderingContext2D, w: number, h: number, elapsed: number) {
    // Phase 1: delivery (0-700ms), Phase 2: ball hits stumps (700-1200ms), Phase 3: bails fly (1200+)
    const deliveryProgress = Math.min(elapsed / 700, 1);

    drawBowler(ctx, BOWLING_X, h * 0.62, deliveryProgress, teamColors[1]);

    // Ball travels from bowler to batsman
    if (elapsed < 800) {
      const bx = BOWLING_X - deliveryProgress * (BOWLING_X - BATTING_X - 15);
      const by = h * 0.62 - Math.sin(deliveryProgress * Math.PI * 0.3) * 20;
      drawBall(ctx, bx, by, 10, ballRef.current?.trail || []);
    }

    // Batsman misses (shocked pose)
    const shockedAngle = elapsed > 800 ? 0.3 : elapsed < 400 ? -0.1 : 0;
    drawBatsman(ctx, BATTING_X, h * 0.62, shockedAngle, teamColors[0]);

    // Stumps
    if (elapsed > 800) {
      drawStumps(ctx, BATTING_X, PITCH_Y, false);
      if (elapsed > 850) {
        spawnBails(BATTING_X, PITCH_Y);
        startShake(8);
      }
    } else {
      drawStumps(ctx, BATTING_X, PITCH_Y, true);
    }
    drawStumps(ctx, BOWLING_X, PITCH_Y, true);

    if (elapsed > 1000) {
      drawBanner(ctx, '🎯 BOWLED!', 'Clean bowled! What a delivery!', w, h, '#ef4444', Math.min(1, (elapsed - 1000) / 300));
    }
  }

  function renderDot(ctx: CanvasRenderingContext2D, w: number, h: number, elapsed: number) {
    const deliveryProgress = Math.min(elapsed / 600, 1);

    drawBowler(ctx, BOWLING_X, h * 0.62, deliveryProgress * 0.8, teamColors[1]);

    if (elapsed < 700) {
      const bx = BOWLING_X - deliveryProgress * (BOWLING_X - BATTING_X - 20);
      const by = h * 0.62;
      drawBall(ctx, bx, by, 10, []);
    }

    // Batsman defends
    const defendAngle = elapsed > 300 && elapsed < 700 ? 0.2 : 0;
    drawBatsman(ctx, BATTING_X, h * 0.62, defendAngle, teamColors[0]);

    drawStumps(ctx, BATTING_X, PITCH_Y, true);
    drawStumps(ctx, BOWLING_X, PITCH_Y, true);

    if (elapsed > 700) {
      drawBanner(ctx, '• DOT BALL', 'Defended safely', w, h, '#6b7280', Math.min(1, (elapsed - 700) / 200));
    }
  }

  function drawExcitedCrowd(ctx: CanvasRenderingContext2D, w: number, h: number, elapsed: number) {
    const crowdY = h * 0.44;
    const waveOffset = Math.sin(elapsed / 150) * 8;
    const crowdColors = ['#ef4444', '#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899'];

    ctx.save();
    ctx.globalAlpha = 0.9;
    for (let i = 0; i < 40; i++) {
      const x = (w / 40) * i + Math.sin(i * 2.3) * 5;
      const armWave = Math.sin(elapsed / 120 + i * 0.5) * 12;
      const y = crowdY - Math.sin(i * 1.7) * 5 + waveOffset * 0.5;
      const color = crowdColors[i % crowdColors.length];

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFDAB9';
      ctx.beginPath();
      ctx.arc(x, y - 7, 4, 0, Math.PI * 2);
      ctx.fill();

      // Arms up
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - 4, y - 3);
      ctx.lineTo(x - 8, y - 3 - armWave);
      ctx.moveTo(x + 4, y - 3);
      ctx.lineTo(x + 8, y - 3 - armWave);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ─────────────────────────────────────────────────────────
  // Effect: start animation when outcome changes
  // ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!outcome) return;

    // Reset state
    completedRef.current = false;
    particlesRef.current = [];
    bailsRef.current = [];
    ballRef.current = {
      x: BOWLING_X,
      y: CANVAS_H * 0.62,
      vx: -4,
      vy: -1,
      radius: 10,
      trail: [],
      bounced: false,
    };
    startTimeRef.current = performance.now();

    if (reducedMotion) {
      // Skip to end immediately
      setTimeout(() => {
        if (!completedRef.current) {
          completedRef.current = true;
          onAnimationComplete();
        }
      }, 1500);
      return;
    }

    const frame = (ts: number) => {
      if (startTimeRef.current === 0) startTimeRef.current = ts;
      animate(ts);
    };

    animRef.current = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(animRef.current);
    };
  }, [outcome]);

  // Draw initial field on mount
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    drawField(ctx, canvas.width, canvas.height);
    drawStumps(ctx, BATTING_X, PITCH_Y, true);
    drawStumps(ctx, BOWLING_X, PITCH_Y, true);
    drawBatsman(ctx, BATTING_X, PITCH_Y, 0, teamColors[0]);
    drawBowler(ctx, BOWLING_X, PITCH_Y, 0, teamColors[1]);
  }, [drawField, teamColors]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_W}
      height={CANVAS_H}
      className="w-full h-full object-contain rounded-xl"
      style={{ maxHeight: '100%', maxWidth: '100%' }}
      aria-label="Cricket animation canvas"
    />
  );
};

export default CricketCanvas;
