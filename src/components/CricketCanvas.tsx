// ============================================================
// Grammar Cricket - Enhanced Cricket Animation Canvas
// Premium vector-style graphics using pure HTML5 Canvas
// ============================================================
import React, { useRef, useEffect, useCallback } from 'react';
import { CricketOutcome } from '../engine/GameState';

interface CricketCanvasProps {
  outcome: CricketOutcome | null;
  onAnimationComplete: () => void;
  reducedMotion?: boolean;
  teamColors?: [string, string];
}

// Helpers
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
  type: 'spark' | 'dust' | 'flare';
  alphaDecay?: number;
}

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  trail: Array<{ x: number; y: number; alpha: number }>;
  bounced: boolean;
  rotation: number;
}

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
  const hasHitRef = useRef<boolean>(false);
  
  // Dimensions and Positioning
  const CANVAS_W = 800;
  const CANVAS_H = 480;
  const PITCH_Y = CANVAS_H * 0.65;
  const BATTING_X = CANVAS_W * 0.25;
  const BOWLING_X = CANVAS_W * 0.75;
  const STUMP_HEIGHT = 56;
  const STUMP_W = 6;
  const STUMP_SPACING = 9;

  // Premium Palette
  const COLORS = {
    skyTop: '#1a1c2c',
    skyBottom: '#4a3b52',
    floodlight: 'rgba(255, 252, 230, 0.15)',
    grassDark: '#1d8a44',
    grassLight: '#23a352',
    pitch: '#e3c988',
    pitchDark: '#c7ae6f',
    stump: '#fde08b',
    bail: '#d97706',
    ball: '#dc2626',
    bat: '#facc15',
    batHandle: '#333333',
    pad: '#f8fafc',
  };

  // ============================================================
  // ENVIRONMENT DRAWING
  // ============================================================
  const drawField = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number, elapsed: number) => {
    // 1. Evening Sky Gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.5);
    skyGrad.addColorStop(0, COLORS.skyTop);
    skyGrad.addColorStop(1, COLORS.skyBottom);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h * 0.5);

    // 2. Stars
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    for (let i = 0; i < 20; i++) {
      const sx = (i * 97) % w;
      const sy = (i * 43) % (h * 0.3);
      ctx.beginPath();
      ctx.arc(sx, sy, 1 + Math.sin(elapsed / 500 + i), 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. Floodlights
    ctx.save();
    ctx.fillStyle = COLORS.floodlight;
    ctx.beginPath();
    ctx.moveTo(w * 0.1, 0); ctx.lineTo(w * 0.3, h * 0.5); ctx.lineTo(w * 0.7, h * 0.5); ctx.lineTo(w * 0.9, 0);
    ctx.fill();
    ctx.restore();

    // 4. Stadium Stands
    const standsGrad = ctx.createLinearGradient(0, h * 0.35, 0, h * 0.5);
    standsGrad.addColorStop(0, '#0f172a');
    standsGrad.addColorStop(1, '#1e293b');
    ctx.fillStyle = standsGrad;
    ctx.beginPath();
    ctx.ellipse(w / 2, h * 0.45, w * 0.6, h * 0.15, 0, Math.PI, 0);
    ctx.fill();

    // 5. Crowd
    drawCrowd(ctx, w, h, elapsed);

    // 6. Striped Grass
    ctx.fillStyle = COLORS.grassDark;
    ctx.fillRect(0, h * 0.5, w, h * 0.5);
    ctx.fillStyle = COLORS.grassLight;
    for (let i = -w; i < w * 2; i += 60) {
      ctx.beginPath();
      ctx.moveTo(i, h * 0.5);
      ctx.lineTo(i + 30, h * 0.5);
      ctx.lineTo(i - 60, h);
      ctx.lineTo(i - 90, h);
      ctx.fill();
    }

    // 7. Inner Circle (30-yard)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(w / 2, h * 0.75, w * 0.45, h * 0.2, 0, 0, Math.PI * 2);
    ctx.stroke();

    // 8. The Pitch
    const pitchW = 80;
    const pitchH = 140;
    const pitchX = w / 2 - pitchW / 2;
    const pitchYTop = PITCH_Y - pitchH / 2;
    
    // Pitch shadow/depth
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath();
    ctx.ellipse(w / 2, PITCH_Y, pitchW * 0.6, pitchH * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();

    const pitchGrad = ctx.createLinearGradient(pitchX, pitchYTop, pitchX + pitchW, pitchYTop);
    pitchGrad.addColorStop(0, COLORS.pitchDark);
    pitchGrad.addColorStop(0.5, COLORS.pitch);
    pitchGrad.addColorStop(1, COLORS.pitchDark);
    ctx.fillStyle = pitchGrad;
    ctx.beginPath();
    ctx.roundRect(pitchX, pitchYTop, pitchW, pitchH, 6);
    ctx.fill();

    // Crease marks
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(pitchX - 10, pitchYTop + 20); ctx.lineTo(pitchX + pitchW + 10, pitchYTop + 20);
    ctx.moveTo(pitchX - 10, pitchYTop + pitchH - 20); ctx.lineTo(pitchX + pitchW + 10, pitchYTop + pitchH - 20);
    // Return creases
    ctx.moveTo(pitchX + 10, pitchYTop); ctx.lineTo(pitchX + 10, pitchYTop + 25);
    ctx.moveTo(pitchX + pitchW - 10, pitchYTop); ctx.lineTo(pitchX + pitchW - 10, pitchYTop + 25);
    ctx.stroke();

  }, [PITCH_Y]);

  function drawCrowd(ctx: CanvasRenderingContext2D, w: number, h: number, elapsed: number) {
    const crowdColors = ['#ef4444', '#3b82f6', '#facc15', '#10b981', '#f472b6', '#c084fc'];
    ctx.save();
    for (let tier = 0; tier < 3; tier++) {
      const tierY = h * 0.45 - tier * 15;
      for (let i = 0; i < 60; i++) {
        const x = (w / 60) * i;
        // Crowd wave effect
        const wave = Math.sin(elapsed / 200 + x * 0.05) * 4;
        const y = tierY - Math.sin((i / 60) * Math.PI) * 20 + wave;
        
        ctx.fillStyle = crowdColors[(i + tier) % crowdColors.length];
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
        // Heads
        ctx.fillStyle = '#fca5a5';
        ctx.beginPath();
        ctx.arc(x, y - 5, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // ============================================================
  // CHARACTER & EQUIPMENT DRAWING
  // ============================================================
  function drawStumps(ctx: CanvasRenderingContext2D, cx: number, y: number, intact: boolean = true) {
    const stumpsX = [cx - STUMP_SPACING, cx, cx + STUMP_SPACING];
    
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(cx + 4, y + 2, STUMP_SPACING * 2, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Stumps
    stumpsX.forEach(sx => {
      const grad = ctx.createLinearGradient(sx - STUMP_W/2, 0, sx + STUMP_W/2, 0);
      grad.addColorStop(0, '#eab308');
      grad.addColorStop(0.5, COLORS.stump);
      grad.addColorStop(1, '#ca8a04');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(sx - STUMP_W / 2, y - STUMP_HEIGHT, STUMP_W, STUMP_HEIGHT, 3);
      ctx.fill();
    });

    // Bails
    if (intact) {
      ctx.fillStyle = COLORS.bail;
      ctx.beginPath();
      ctx.roundRect(cx - STUMP_SPACING - 3, y - STUMP_HEIGHT - 4, STUMP_SPACING + 4, 4, 2);
      ctx.roundRect(cx - 1, y - STUMP_HEIGHT - 4, STUMP_SPACING + 4, 4, 2);
      ctx.fill();
    }
  }

  function drawBatsman(ctx: CanvasRenderingContext2D, x: number, y: number, swingAngle: number = 0, color: string) {
    ctx.save();
    ctx.translate(x, y);

    // Dynamic drop shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(5, 5, 22, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Back Leg & Pad
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(-12, -26, 9, 26);
    ctx.fillStyle = COLORS.pad;
    ctx.beginPath(); ctx.roundRect(-14, -28, 11, 22, 4); ctx.fill();
    ctx.fillStyle = '#94a3b8'; // Straps
    ctx.fillRect(-14, -20, 11, 2); ctx.fillRect(-14, -12, 11, 2);

    // Front Leg & Pad
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(4, -26, 9, 26);
    ctx.fillStyle = COLORS.pad;
    ctx.beginPath(); ctx.roundRect(2, -28, 12, 22, 4); ctx.fill();
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(2, -20, 12, 2); ctx.fillRect(2, -12, 12, 2);

    // Torso (Jersey)
    const jerseyGrad = ctx.createLinearGradient(-12, -50, 12, -20);
    jerseyGrad.addColorStop(0, color);
    jerseyGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = jerseyGrad;
    ctx.beginPath();
    ctx.roundRect(-14, -52, 24, 30, 6);
    ctx.fill();

    // Head / Helmet
    ctx.fillStyle = color; // Helmet shell
    ctx.beginPath();
    ctx.arc(0, -60, 11, Math.PI, 0);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(-13, -60, 18, 12, 4);
    ctx.fill();
    // Face/Skin
    ctx.fillStyle = '#fca5a5';
    ctx.beginPath(); ctx.arc(-2, -54, 7, 0, Math.PI * 2); ctx.fill();
    // Grille
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -58); ctx.lineTo(10, -58);
    ctx.moveTo(0, -54); ctx.lineTo(10, -54);
    ctx.stroke();

    // Bat & Arms System
    ctx.save();
    ctx.translate(6, -42); // Shoulder pivot
    ctx.rotate(swingAngle);
    
    // Front Arm
    ctx.fillStyle = '#fca5a5';
    ctx.beginPath(); ctx.roundRect(-3, 0, 7, 18, 3); ctx.fill();
    // Gloves
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath(); ctx.arc(0, 20, 6, 0, Math.PI * 2); ctx.fill();
    
    // Bat
    ctx.save();
    ctx.translate(0, 15);
    ctx.fillStyle = COLORS.batHandle;
    ctx.fillRect(-3, 0, 6, 18);
    
    const batGrad = ctx.createLinearGradient(-6, 18, 6, 18);
    batGrad.addColorStop(0, '#fde047');
    batGrad.addColorStop(0.5, '#ca8a04');
    batGrad.addColorStop(1, '#a16207');
    ctx.fillStyle = batGrad;
    ctx.beginPath();
    ctx.roundRect(-7, 18, 14, 45, 4);
    ctx.fill();
    ctx.restore();
    ctx.restore();

    ctx.restore();
  }

  function drawBowler(ctx: CanvasRenderingContext2D, x: number, y: number, runUpProgress: number = 0, color: string) {
    ctx.save();
    ctx.translate(x - runUpProgress * 40, y);
    ctx.scale(-1, 1); 

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.ellipse(5, 5, 20, 5, 0, 0, Math.PI * 2); ctx.fill();

    const legAngle = Math.sin(runUpProgress * Math.PI * 6) * 0.6;
    
    // Back leg
    ctx.save(); ctx.rotate(legAngle);
    ctx.fillStyle = '#f8fafc'; ctx.roundRect(-4, -25, 8, 25, 3); ctx.fill();
    // Shoe
    ctx.fillStyle = '#333'; ctx.roundRect(-6, -2, 12, 6, 2); ctx.fill();
    ctx.restore();

    // Front leg
    ctx.save(); ctx.rotate(-legAngle);
    ctx.fillStyle = '#cbd5e1'; ctx.roundRect(-4, -25, 8, 25, 3); ctx.fill();
    // Shoe
    ctx.fillStyle = '#222'; ctx.roundRect(-6, -2, 12, 6, 2); ctx.fill();
    ctx.restore();

    // Torso
    const jerseyGrad = ctx.createLinearGradient(-10, -50, 10, -20);
    jerseyGrad.addColorStop(0, color);
    jerseyGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = jerseyGrad;
    ctx.beginPath(); ctx.roundRect(-10, -48, 20, 28, 6); ctx.fill();

    // Head & Cap
    ctx.fillStyle = '#fca5a5';
    ctx.beginPath(); ctx.arc(0, -56, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(0, -59, 9, Math.PI, 0); ctx.fill(); // Cap dome
    ctx.fillRect(5, -60, 10, 3); // Brim

    // Bowling Arm
    const armAngle = runUpProgress > 0.8 ? (runUpProgress - 0.8) * Math.PI * 3 : -0.5;
    ctx.save();
    ctx.translate(5, -42);
    ctx.rotate(armAngle);
    ctx.fillStyle = '#fca5a5';
    ctx.roundRect(-4, -20, 8, 24, 4); ctx.fill();
    ctx.restore();

    ctx.restore();
  }

  function drawBall(ctx: CanvasRenderingContext2D, ball: Ball) {
    // Elegant fading trail
    if (ball.trail.length > 0) {
      ctx.beginPath();
      ctx.moveTo(ball.trail[0].x, ball.trail[0].y);
      for (let i = 1; i < ball.trail.length; i++) {
        ctx.lineTo(ball.trail[i].x, ball.trail[i].y);
      }
      ctx.strokeStyle = 'rgba(220, 38, 38, 0.4)';
      ctx.lineWidth = ball.radius * 1.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    }

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(ball.x + 3, ball.y + 4, ball.radius, ball.radius * 0.5, 0, 0, Math.PI * 2); ctx.fill();

    // Ball 3D effect
    ctx.save();
    ctx.translate(ball.x, ball.y);
    ctx.rotate(ball.rotation);
    
    const grad = ctx.createRadialGradient(-3, -3, 2, 0, 0, ball.radius);
    grad.addColorStop(0, '#f87171');
    grad.addColorStop(0.5, COLORS.ball);
    grad.addColorStop(1, '#7f1d1d');
    
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(0, 0, ball.radius, 0, Math.PI * 2); ctx.fill();

    // Seam
    ctx.strokeStyle = '#fca5a5';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, ball.radius * 0.3, ball.radius * 0.9, 0, 0, Math.PI * 2);
    ctx.stroke();
    
    ctx.restore();
  }

  // ============================================================
  // VFX (PARTICLES & FLARES)
  // ============================================================
  function spawnFireworks(x: number, y: number, count: number = 40) {
    const colors = ['#fde047', '#38bdf8', '#4ade80', '#fb923c', '#e879f9', '#ffffff'];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 6;
      particlesRef.current.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 100, maxLife: 100,
        size: 3 + Math.random() * 3,
        gravity: 0.15,
        type: 'spark'
      });
    }
  }

  function spawnDust(x: number, y: number) {
    for (let i = 0; i < 8; i++) {
      particlesRef.current.push({
        x: x + (Math.random() - 0.5) * 10,
        y: y + (Math.random() - 0.5) * 5,
        vx: (Math.random() - 0.5) * 2,
        vy: -Math.random() * 2,
        color: '#d4d4d8',
        life: 30, maxLife: 30,
        size: 6 + Math.random() * 8,
        gravity: 0,
        type: 'dust'
      });
    }
  }

  function spawnImpactFlare(x: number, y: number) {
    particlesRef.current.push({
      x, y, vx: 0, vy: 0,
      color: '#ffffff',
      life: 15, maxLife: 15,
      size: 40, gravity: 0, type: 'flare'
    });
  }

  function updateAndDrawParticles(ctx: CanvasRenderingContext2D) {
    particlesRef.current = particlesRef.current.filter(p => {
      p.life--;
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.vx *= 0.96; // friction

      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      
      if (p.type === 'spark') {
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2); ctx.fill();
      } else if (p.type === 'dust') {
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2); ctx.fill();
      } else if (p.type === 'flare') {
        const flareGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * alpha);
        flareGrad.addColorStop(0, 'rgba(255, 255, 255, 1)');
        flareGrad.addColorStop(0.4, 'rgba(253, 224, 71, 0.8)');
        flareGrad.addColorStop(1, 'rgba(253, 224, 71, 0)');
        ctx.fillStyle = flareGrad;
        ctx.globalCompositeOperation = 'screen';
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2); ctx.fill();
      }
      
      ctx.restore();
      return p.life > 0;
    });
  }

  function spawnBails(cx: number, y: number) {
    bailsRef.current = [
      { x: cx - STUMP_SPACING, y: y - STUMP_HEIGHT, vx: -3 - Math.random()*3, vy: -6 - Math.random()*4, angle: 0, spin: 0.2 + Math.random()*0.3 },
      { x: cx + STUMP_SPACING, y: y - STUMP_HEIGHT, vx: 3 + Math.random()*3, vy: -5 - Math.random()*4, angle: 0, spin: -(0.2 + Math.random()*0.3) }
    ];
  }

  function updateAndDrawBails(ctx: CanvasRenderingContext2D) {
    bailsRef.current = bailsRef.current.filter(b => {
      b.x += b.vx;
      b.y += b.vy;
      b.vy += 0.4; // heavy gravity
      b.angle += b.spin;
      
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.angle);
      ctx.fillStyle = COLORS.bail;
      ctx.beginPath(); ctx.roundRect(-8, -2, 16, 4, 2); ctx.fill();
      ctx.restore();
      
      return b.y < CANVAS_H + 50;
    });
  }

  function drawBanner(ctx: CanvasRenderingContext2D, text: string, subtext: string, w: number, h: number, color: string, alpha: number) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, alpha);
    const bw = 500;
    const bh = 100;
    const bx = w / 2 - bw / 2;
    const by = h * 0.18;
    
    // Glassmorphism background
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 20;
    ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 16); ctx.fill();
    ctx.shadowBlur = 0; // reset

    // Neon Border
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 16); ctx.stroke();
    
    // Inner Glow
    const innerGrad = ctx.createLinearGradient(bx, by, bx, by + bh);
    innerGrad.addColorStop(0, 'rgba(255,255,255,0.1)');
    innerGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = innerGrad;
    ctx.fill();

    // Main Text
    ctx.fillStyle = color;
    ctx.font = `900 48px 'Arial', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = color;
    ctx.shadowBlur = 15;
    ctx.fillText(text, w / 2, by + bh * 0.4);

    // Subtext
    ctx.fillStyle = '#cbd5e1';
    ctx.font = `600 20px 'Arial', sans-serif`;
    ctx.shadowBlur = 0;
    ctx.fillText(subtext, w / 2, by + bh * 0.75);

    ctx.restore();
  }

  // ============================================================
  // ANIMATION LOOP & LOGIC
  // ============================================================
  let shakeDecay = 0;
  function startShake(intensity: number) {
    if (!reducedMotion) shakeDecay = intensity;
  }

  const animate = useCallback((timestamp: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const w = canvas.width;
    const h = canvas.height;
    const elapsed = timestamp - startTimeRef.current;

    // Screen Shake
    let shakeX = 0, shakeY = 0;
    if (shakeDecay > 0.1) {
      shakeX = (Math.random() - 0.5) * shakeDecay;
      shakeY = (Math.random() - 0.5) * shakeDecay;
      shakeDecay *= 0.85;
    }

    ctx.save();
    ctx.translate(shakeX, shakeY);
    ctx.clearRect(-20, -20, w + 40, h + 40);

    // Render static environment
    drawField(ctx, w, h, elapsed);

    // Physics Update
    if (ballRef.current) {
      const ball = ballRef.current;
      ball.trail.push({ x: ball.x, y: ball.y, alpha: 1 });
      if (ball.trail.length > 10) ball.trail.shift();
      ball.trail.forEach((t, i) => t.alpha = i / ball.trail.length);

      ball.x += ball.vx;
      ball.y += ball.vy;
      ball.vy += 0.2; // Gravity
      ball.rotation += ball.vx * 0.05;

      // Bounce Logic
      if (ball.y > PITCH_Y - ball.radius && !ball.bounced && ball.vy > 0) {
        ball.vy = -ball.vy * 0.6;
        ball.vx *= 0.95;
        ball.bounced = true;
        spawnDust(ball.x, PITCH_Y);
      }
    }

    // Sequence Routers
    switch (outcome) {
      case 'six': renderSix(ctx, w, h, elapsed); break;
      case 'four': renderFour(ctx, w, h, elapsed); break;
      case 'three': renderThreeRuns(ctx, w, h, elapsed); break;
      case 'two': renderTwoRuns(ctx, w, h, elapsed); break;
      case 'one': renderOneRun(ctx, w, h, elapsed); break;
      case 'run_out': renderRunOut(ctx, w, h, elapsed); break;
      case 'bowled': renderBowled(ctx, w, h, elapsed); break;
      case 'dot': renderDot(ctx, w, h, elapsed); break;
    }

    updateAndDrawParticles(ctx);
    updateAndDrawBails(ctx);

    ctx.restore();

    const durations: Record<string, number> = {
      six: 4500, four: 3500, three: 3000, two: 2500, one: 2000,
      run_out: 4000, bowled: 3500, dot: 1800
    };
    
    if (elapsed >= (durations[outcome || 'one'] || 2000) && !completedRef.current) {
      completedRef.current = true;
      onAnimationComplete();
      return;
    }
    
    animRef.current = requestAnimationFrame(animate);
  }, [outcome, reducedMotion, onAnimationComplete, drawField]);

  // ============================================================
  // OUTCOME SEQUENCES
  // ============================================================
  function renderSix(ctx: CanvasRenderingContext2D, w: number, h: number, elapsed: number) {
    const phase1 = Math.min(elapsed / 500, 1);
    const phase2 = Math.max(0, (elapsed - 300) / 4200);

    drawBowler(ctx, BOWLING_X, PITCH_Y, 1.0, teamColors[1]);

    if (phase2 > 0 && ballRef.current) {
      const bx = BATTING_X + phase2 * (w * 0.8);
      const arc = -Math.sin(phase2 * Math.PI) * h * 0.6;
      ballRef.current.x = bx;
      ballRef.current.y = PITCH_Y + arc;
      ballRef.current.bounced = false; // prevents bounce logic while flying
      drawBall(ctx, ballRef.current);
      
      if (phase2 > 0.8 && elapsed % 150 < 20) {
        spawnFireworks(bx, ballRef.current.y, 5);
      }
    }

    const swingAngle = phase1 < 0.5 ? phase1 * -1.8 : (1 - phase1) * -0.8;
    drawBatsman(ctx, BATTING_X, PITCH_Y, swingAngle, teamColors[0]);

    if (elapsed > 280 && !hasHitRef.current) {
      spawnImpactFlare(BATTING_X + 15, PITCH_Y - 20);
      startShake(8);
      hasHitRef.current = true;
    }

    if (elapsed > 1000 && elapsed < 3500 && elapsed % 300 < 20) {
      spawnFireworks(w * 0.2 + Math.random() * w * 0.6, h * 0.1 + Math.random() * h * 0.3, 30);
    }

    if (elapsed > 500) {
      drawBanner(ctx, 'SIX!', 'Maximum! Into the crowd!', w, h, '#fbbf24', Math.min(1, (elapsed - 500) / 300));
    }
  }

  function renderFour(ctx: CanvasRenderingContext2D, w: number, h: number, elapsed: number) {
    drawBowler(ctx, BOWLING_X, PITCH_Y, 1.0, teamColors[1]);
    
    if (elapsed > 250 && ballRef.current) {
      // Manual override for fast ground boundary
      ballRef.current.x = BATTING_X + ((elapsed - 250) / 2000) * w;
      ballRef.current.y = PITCH_Y - Math.abs(Math.sin(elapsed / 100) * 15);
      ballRef.current.bounced = true;
      drawBall(ctx, ballRef.current);
    }

    const phase1 = Math.min(elapsed / 400, 1);
    drawBatsman(ctx, BATTING_X, PITCH_Y, phase1 < 0.5 ? phase1 * -1.2 : (1 - phase1) * -0.4, teamColors[0]);

    if (elapsed > 250 && !hasHitRef.current) {
      spawnImpactFlare(BATTING_X + 15, PITCH_Y - 10);
      startShake(5);
      hasHitRef.current = true;
    }

    if (elapsed > 400) {
      drawBanner(ctx, 'FOUR!', 'Races away to the boundary!', w, h, '#34d399', Math.min(1, (elapsed - 400) / 300));
    }
  }

  function renderThreeRuns(ctx: CanvasRenderingContext2D, w: number, h: number, elapsed: number) {
    drawBowler(ctx, BOWLING_X, PITCH_Y, 1.0, teamColors[1]);
    if (elapsed > 300 && ballRef.current) {
      ballRef.current.x = BATTING_X + Math.min((elapsed - 300) / 800, 1) * w * 0.4;
      ballRef.current.y = PITCH_Y;
      drawBall(ctx, ballRef.current);
    }
    const runCycle = elapsed > 400 ? Math.sin(elapsed / 80) * 10 : 0;
    drawBatsman(ctx, BATTING_X + (elapsed > 400 ? ((elapsed - 400) % 300) * 0.1 : 0), PITCH_Y + runCycle, elapsed > 400 ? -0.3 : 0, teamColors[0]);
    if (elapsed > 500) drawBanner(ctx, '3 RUNS', 'Excellent running!', w, h, '#38bdf8', Math.min(1, (elapsed - 500) / 300));
  }

  function renderTwoRuns(ctx: CanvasRenderingContext2D, w: number, h: number, elapsed: number) {
    drawBowler(ctx, BOWLING_X, PITCH_Y, 1.0, teamColors[1]);
    if (elapsed > 250 && ballRef.current) {
      ballRef.current.x = BATTING_X + Math.min((elapsed - 250) / 700, 1) * w * 0.3;
      ballRef.current.y = PITCH_Y;
      drawBall(ctx, ballRef.current);
    }
    drawBatsman(ctx, BATTING_X, PITCH_Y, elapsed < 400 ? -0.5 : 0, teamColors[0]);
    if (elapsed > 450) drawBanner(ctx, '2 RUNS', 'Pushed into the gap.', w, h, '#c084fc', Math.min(1, (elapsed - 450) / 300));
  }

  function renderOneRun(ctx: CanvasRenderingContext2D, w: number, h: number, elapsed: number) {
    drawBowler(ctx, BOWLING_X, PITCH_Y, 1.0, teamColors[1]);
    if (elapsed > 200 && ballRef.current) {
      ballRef.current.x = BATTING_X + Math.min((elapsed - 200) / 500, 1) * w * 0.2;
      ballRef.current.y = PITCH_Y;
      drawBall(ctx, ballRef.current);
    }
    drawBatsman(ctx, BATTING_X, PITCH_Y, elapsed < 350 ? -0.3 : 0, teamColors[0]);
    if (elapsed > 400) drawBanner(ctx, '1 RUN', 'Quick single.', w, h, '#94a3b8', Math.min(1, (elapsed - 400) / 300));
  }

  function renderRunOut(ctx: CanvasRenderingContext2D, w: number, h: number, elapsed: number) {
    drawBowler(ctx, BOWLING_X, PITCH_Y, 1.0, teamColors[1]);
    const runProgress = elapsed > 600 ? Math.min((elapsed - 600) / 1400, 1) : 0;
    drawBatsman(ctx, BATTING_X + runProgress * 120, PITCH_Y, elapsed < 500 ? -0.8 : -0.2, teamColors[0]);

    if (elapsed > 2200 && ballRef.current) {
      const throwProgress = Math.min((elapsed - 2200) / 700, 1);
      ballRef.current.x = BATTING_X + 150 + throwProgress * (BOWLING_X - BATTING_X - 150);
      ballRef.current.y = PITCH_Y - Math.sin(throwProgress * Math.PI) * 40;
      ballRef.current.bounced = true;
      drawBall(ctx, ballRef.current);
    } else if (elapsed > 350 && ballRef.current) {
      ballRef.current.x = BATTING_X + Math.min((elapsed - 350) / 400, 1) * w * 0.25;
      ballRef.current.y = PITCH_Y;
      drawBall(ctx, ballRef.current);
    }

    if (elapsed > 2900) {
      drawStumps(ctx, w / 2 - 30, PITCH_Y, false);
      drawStumps(ctx, BOWLING_X, PITCH_Y, false);
      if (!hasHitRef.current) {
        spawnBails(BATTING_X, PITCH_Y);
        startShake(6);
        hasHitRef.current = true;
      }
    } else {
      drawStumps(ctx, w / 2 - 30, PITCH_Y, true);
      drawStumps(ctx, BOWLING_X, PITCH_Y, true);
    }

    if (elapsed > 400 && elapsed < 2600) drawBanner(ctx, '1 RUN', 'Going for the second...', w, h, '#94a3b8', 1);
    if (elapsed > 3100) drawBanner(ctx, 'RUN OUT!', 'Direct hit!', w, h, '#ef4444', Math.min(1, (elapsed - 3100) / 200));
  }

  function renderBowled(ctx: CanvasRenderingContext2D, w: number, h: number, elapsed: number) {
    const delivery = Math.min(elapsed / 600, 1);
    drawBowler(ctx, BOWLING_X, PITCH_Y, delivery, teamColors[1]);

    if (elapsed < 750 && ballRef.current) {
      drawBall(ctx, ballRef.current); // Use physics
    }

    drawBatsman(ctx, BATTING_X, PITCH_Y, elapsed > 750 ? 0.4 : -0.2, teamColors[0]);

    if (elapsed > 750) {
      drawStumps(ctx, BATTING_X, PITCH_Y, false);
      if (!hasHitRef.current) {
        spawnBails(BATTING_X, PITCH_Y);
        spawnDust(BATTING_X, PITCH_Y);
        startShake(10);
        hasHitRef.current = true;
      }
    } else {
      drawStumps(ctx, BATTING_X, PITCH_Y, true);
    }
    drawStumps(ctx, BOWLING_X, PITCH_Y, true);

    if (elapsed > 1000) drawBanner(ctx, 'BOWLED!', 'Through the gate!', w, h, '#ef4444', Math.min(1, (elapsed - 1000) / 300));
  }

  function renderDot(ctx: CanvasRenderingContext2D, w: number, h: number, elapsed: number) {
    const delivery = Math.min(elapsed / 600, 1);
    drawBowler(ctx, BOWLING_X, PITCH_Y, delivery * 0.8, teamColors[1]);
    
    if (elapsed < 700 && ballRef.current) drawBall(ctx, ballRef.current);

    drawBatsman(ctx, BATTING_X, PITCH_Y, elapsed > 300 && elapsed < 700 ? 0.15 : 0, teamColors[0]);
    drawStumps(ctx, BATTING_X, PITCH_Y, true);
    drawStumps(ctx, BOWLING_X, PITCH_Y, true);

    if (elapsed > 800) drawBanner(ctx, 'DOT BALL', 'Safely defended.', w, h, '#94a3b8', Math.min(1, (elapsed - 800) / 300));
  }

  // ============================================================
  // MOUNT / INITIALIZATION
  // ============================================================
  useEffect(() => {
    if (!outcome) return;
    
    completedRef.current = false;
    hasHitRef.current = false;
    particlesRef.current = [];
    bailsRef.current = [];
    
    ballRef.current = {
      x: BOWLING_X - 10,
      y: PITCH_Y - 40,
      vx: -11,
      vy: 1.5,
      radius: 6,
      trail: [],
      bounced: false,
      rotation: 0
    };
    
    startTimeRef.current = performance.now();
    
    if (reducedMotion) {
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
    
    return () => cancelAnimationFrame(animRef.current);
  }, [outcome, reducedMotion, onAnimationComplete, animate]);

  // Initial draw before animation triggers
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawField(ctx, canvas.width, canvas.height, 0);
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
      className="w-full h-full object-contain rounded-xl shadow-2xl shadow-black/50"
      style={{ maxHeight: '100%', maxWidth: '100%' }}
      aria-label="Cricket animation canvas"
    />
  );
};

export default CricketCanvas;
