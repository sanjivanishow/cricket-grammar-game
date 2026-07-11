// ============================================================
// Grammar Cricket - Grasshopper & Bugs Canvas
// Inspired by the 2017 Doodle macro-nature aesthetic
// ============================================================
import React, { useRef, useEffect, useCallback } from 'react';
import { CricketOutcome } from '../engine/GameState';

interface CricketCanvasProps {
  outcome: CricketOutcome | null;
  onAnimationComplete: () => void;
  reducedMotion?: boolean;
  teamColors?: [string, string];
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
  type: 'leaf' | 'dirt' | 'sparkle';
  rotation: number;
  spin: number;
}

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  rotation: number;
  trail: Array<{x: number, y: number}>;
  bounced: boolean;
}

const CricketCanvas: React.FC<CricketCanvasProps> = ({
  outcome,
  onAnimationComplete,
  reducedMotion = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Timing & State
  const animRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const virtualTimeRef = useRef<number>(0);
  const completedRef = useRef<boolean>(false);
  const hasTriggeredRef = useRef<boolean>(false);
  
  // Entities
  const particlesRef = useRef<Particle[]>([]);
  const ballRef = useRef<Ball | null>(null);
  const bailsRef = useRef<Array<{ x: number; y: number; vx: number; vy: number; angle: number; spin: number }>>([]);
  
  // Coordinates
  const W = 800;
  const H = 480;
  const PITCH_Y = H * 0.75;
  const BATTING_X = W * 0.25;
  const BOWLING_X = W * 0.8;
  const STUMP_H = 45;

  // Nature Palette
  const PALETTE = {
    grassBg: '#8bc34a',
    grassLight: '#9ccc65',
    dirtTop: '#d7ccc8',
    dirtPath: '#bcaaa4',
    dirtEdge: '#8d6e63',
    hopperBody: '#7cb342',
    hopperDark: '#558b2f',
    hopperBelly: '#c5e1a5',
    snailShell: '#8d6e63',
    snailBody: '#ffe082',
    twig: '#5d4037',
    berry: '#e53935',
    leaf: '#fdd835',
    woodSign: '#795548',
  };

  // ============================================================
  // ENVIRONMENT DRAWING
  // ============================================================
  const drawNatureBackground = (ctx: CanvasRenderingContext2D, vTime: number) => {
    // Soft blurred grass background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, H * 0.6);
    bgGrad.addColorStop(0, '#c8e6c9');
    bgGrad.addColorStop(1, PALETTE.grassBg);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // Out-of-focus background daisies (Bokeh effect)
    ctx.save();
    ctx.filter = 'blur(8px)';
    ctx.globalAlpha = 0.6;
    const drawBokehDaisy = (cx: number, cy: number, scale: number) => {
      ctx.fillStyle = '#ffffff';
      for(let i=0; i<8; i++) {
        ctx.beginPath();
        ctx.ellipse(cx + Math.cos(i*Math.PI/4)*25*scale, cy + Math.sin(i*Math.PI/4)*25*scale, 20*scale, 8*scale, i*Math.PI/4, 0, Math.PI*2);
        ctx.fill();
      }
      ctx.fillStyle = '#ffeb3b';
      ctx.beginPath(); ctx.arc(cx, cy, 15*scale, 0, Math.PI*2); ctx.fill();
    };
    drawBokehDaisy(W * 0.15, H * 0.3, 1.5);
    drawBokehDaisy(W * 0.8, H * 0.2, 1.2);
    drawBokehDaisy(W * 0.5, H * 0.4, 0.8);
    ctx.restore();

    // Foreground Grass Base
    ctx.fillStyle = PALETTE.grassLight;
    ctx.beginPath();
    ctx.moveTo(0, H * 0.55);
    ctx.quadraticCurveTo(W * 0.5, H * 0.5, W, H * 0.55);
    ctx.lineTo(W, H);
    ctx.lineTo(0, H);
    ctx.fill();

    // Wavy Dirt Pitch
    ctx.fillStyle = PALETTE.dirtPath;
    ctx.strokeStyle = PALETTE.dirtEdge;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(W * 0.1, H);
    ctx.quadraticCurveTo(W * 0.2, H * 0.7, W * 0.15, H * 0.6);
    ctx.quadraticCurveTo(W * 0.5, H * 0.58, W * 0.85, H * 0.6);
    ctx.quadraticCurveTo(W * 0.8, H * 0.7, W * 0.9, H);
    ctx.fill();
    ctx.stroke();

    // Foreground grass blades overlapping the pitch
    ctx.fillStyle = PALETTE.hopperDark;
    for (let i = 0; i < W; i += 30) {
      if (i > W * 0.15 && i < W * 0.85) continue; // skip middle of pitch
      const sway = Math.sin(vTime * 0.002 + i) * 5;
      ctx.beginPath();
      ctx.moveTo(i, H);
      ctx.quadraticCurveTo(i + sway, H - 20, i + 5 + sway, H - 40);
      ctx.quadraticCurveTo(i + 10, H - 20, i + 10, H);
      ctx.fill();
    }
  };

  // ============================================================
  // CHARACTER DRAWING
  // ============================================================
  const drawTwigs = (ctx: CanvasRenderingContext2D, cx: number, cy: number, intact: boolean) => {
    ctx.strokeStyle = PALETTE.twig;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 4;

    // Crooked lines for stumps
    const drawTwig = (x: number, h: number, bend: number) => {
      ctx.beginPath();
      ctx.moveTo(x, cy);
      ctx.lineTo(x + bend, cy - h * 0.5);
      ctx.lineTo(x, cy - h);
      ctx.stroke();
    };

    if (intact) {
      drawTwig(cx - 8, STUMP_H, 2);
      drawTwig(cx, STUMP_H + 5, -2);
      drawTwig(cx + 8, STUMP_H, 1);
      // Bails (leaves)
      ctx.fillStyle = PALETTE.grassLight;
      ctx.beginPath(); ctx.ellipse(cx - 4, cy - STUMP_H - 2, 6, 3, 0, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(cx + 4, cy - STUMP_H - 2, 6, 3, 0, 0, Math.PI*2); ctx.fill();
    } else {
      drawTwig(cx - 8, STUMP_H, 2);
      drawTwig(cx + 8, STUMP_H, 1);
    }
  };

  const drawGrasshopper = (ctx: CanvasRenderingContext2D, x: number, y: number, swingPhase: number) => {
    ctx.save();
    ctx.translate(x, y);

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath(); ctx.ellipse(0, 5, 25, 6, 0, 0, Math.PI*2); ctx.fill();

    // Big Hind Leg
    ctx.strokeStyle = PALETTE.hopperDark;
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(5, 0); // foot
    ctx.lineTo(-15, -25); // knee
    ctx.lineTo(0, -15); // hip attachment
    ctx.stroke();

    // Torso
    ctx.fillStyle = PALETTE.hopperBody;
    ctx.beginPath();
    ctx.ellipse(5, -22, 12, 18, Math.PI / 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.hopperBelly;
    ctx.beginPath();
    ctx.ellipse(8, -20, 6, 14, Math.PI / 6, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.fillStyle = PALETTE.hopperBody;
    ctx.beginPath(); ctx.arc(18, -35, 9, 0, Math.PI * 2); ctx.fill();
    
    // Huge Bug Eye
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(21, -38, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#000000';
    ctx.beginPath(); ctx.arc(23, -38, 2, 0, Math.PI * 2); ctx.fill();

    // Antennae
    ctx.strokeStyle = PALETTE.hopperDark;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(18, -42);
    ctx.quadraticCurveTo(10, -55, 0, -50);
    ctx.moveTo(20, -43);
    ctx.quadraticCurveTo(15, -60, 25, -65);
    ctx.stroke();

    // Articulated Arms and Leaf Bat
    ctx.save();
    ctx.translate(10, -25); // Shoulder pivot
    
    let batAngle = -Math.PI * 0.1;
    if (swingPhase > 0 && swingPhase < 0.5) batAngle = -Math.PI * 0.4; // backlift
    else if (swingPhase >= 0.5) batAngle = Math.PI * 0.8; // follow-through

    ctx.rotate(batAngle);
    
    // Arms
    ctx.strokeStyle = PALETTE.hopperDark;
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(0, 15); ctx.stroke();

    // Leaf Bat
    ctx.translate(0, 15); // hands
    ctx.fillStyle = PALETTE.twig;
    ctx.fillRect(-2, -5, 4, 15); // handle
    
    ctx.fillStyle = PALETTE.leaf;
    ctx.beginPath();
    ctx.ellipse(0, 25, 8, 20, 0, 0, Math.PI*2);
    ctx.fill();
    // Leaf vein
    ctx.strokeStyle = '#c0ca33';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, 5); ctx.lineTo(0, 40); ctx.stroke();
    ctx.restore();

    ctx.restore();
  };

  const drawSnailBowler = (ctx: CanvasRenderingContext2D, x: number, y: number, rollPhase: number) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(-1, 1); // Face left

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath(); ctx.ellipse(0, 5, 20, 5, 0, 0, Math.PI*2); ctx.fill();

    // Slime body
    ctx.fillStyle = PALETTE.snailBody;
    const squish = Math.sin(rollPhase * Math.PI) * 5;
    ctx.beginPath();
    ctx.ellipse(0, 0, 22 + squish, 6, 0, 0, Math.PI*2);
    ctx.fill();
    
    // Head / Eye stalks
    ctx.beginPath(); ctx.arc(18, -8, 7, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = PALETTE.snailBody;
    ctx.lineWidth = 3;
    const stalkDip = rollPhase > 0.5 ? 5 : 0;
    ctx.beginPath(); ctx.moveTo(20, -12); ctx.lineTo(15, -25 + stalkDip); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(22, -10); ctx.lineTo(28, -22 + stalkDip); ctx.stroke();
    // Eyes
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(15, -25 + stalkDip, 4, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(28, -22 + stalkDip, 4, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(16, -25 + stalkDip, 1.5, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(29, -22 + stalkDip, 1.5, 0, Math.PI*2); ctx.fill();

    // Spiral Shell
    ctx.save();
    ctx.translate(-5, -12);
    // Rotate shell as if winding up
    ctx.rotate(rollPhase * -0.5);
    ctx.fillStyle = PALETTE.snailShell;
    ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#5d4037';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI*1.5);
    ctx.arc(2, -2, 5, Math.PI*1.5, Math.PI*3);
    ctx.stroke();
    ctx.restore();

    ctx.restore();
  };

  const drawBerryBall = (ctx: CanvasRenderingContext2D, ball: Ball) => {
    ctx.save();
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath(); ctx.ellipse(ball.x, ball.y + ball.radius, ball.radius, ball.radius*0.4, 0, 0, Math.PI*2); ctx.fill();

    // Trail
    if (ball.trail.length > 0) {
      ctx.beginPath();
      ctx.moveTo(ball.trail[0].x, ball.trail[0].y);
      ball.trail.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.strokeStyle = 'rgba(229, 57, 53, 0.3)';
      ctx.lineWidth = ball.radius;
      ctx.lineCap = 'round';
      ctx.stroke();
    }

    ctx.translate(ball.x, ball.y);
    ctx.rotate(ball.rotation);
    
    // Berry Body
    ctx.fillStyle = PALETTE.berry;
    ctx.beginPath();
    // Slightly irregular circle
    ctx.ellipse(0, 0, ball.radius, ball.radius * 0.9, 0, 0, Math.PI*2);
    ctx.fill();

    // Berry dots/seeds
    ctx.fillStyle = '#b71c1c';
    ctx.beginPath(); ctx.arc(-2, -2, 1.5, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(3, 1, 1, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(-1, 3, 1, 0, Math.PI*2); ctx.fill();
    
    ctx.restore();
  };

  // ============================================================
  // VFX & PARTICLES
  // ============================================================
  const spawnDirt = (x: number, y: number) => {
    for (let i = 0; i < 8; i++) {
      particlesRef.current.push({
        x, y,
        vx: (Math.random() - 0.5) * 4,
        vy: -2 - Math.random() * 3,
        color: PALETTE.dirtEdge,
        life: 25, maxLife: 25, size: 2 + Math.random() * 3,
        type: 'dirt', rotation: 0, spin: 0
      });
    }
  };

  const spawnLeaves = (x: number, y: number) => {
    for (let i = 0; i < 15; i++) {
      particlesRef.current.push({
        x, y,
        vx: (Math.random() - 0.5) * 8,
        vy: -3 - Math.random() * 6,
        color: Math.random() > 0.5 ? PALETTE.grassLight : PALETTE.leaf,
        life: 40 + Math.random() * 20, maxLife: 60, size: 4 + Math.random() * 4,
        type: 'leaf', rotation: Math.random() * Math.PI, spin: (Math.random() - 0.5) * 0.4
      });
    }
  };

  const updateAndDrawParticles = (ctx: CanvasRenderingContext2D, dtScale: number) => {
    particlesRef.current = particlesRef.current.filter(p => {
      p.x += p.vx * dtScale;
      p.y += p.vy * dtScale;
      p.vy += 0.2 * dtScale; // gravity
      p.rotation += p.spin * dtScale;
      p.life -= dtScale;

      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;
      
      if (p.type === 'leaf') {
        ctx.beginPath(); ctx.ellipse(0, 0, p.size, p.size * 0.5, 0, 0, Math.PI*2); ctx.fill();
      } else {
        ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size);
      }
      ctx.restore();
      
      return p.life > 0;
    });

    // Bails flying
    bailsRef.current = bailsRef.current.filter(b => {
      b.x += b.vx * dtScale;
      b.y += b.vy * dtScale;
      b.vy += 0.25 * dtScale;
      b.angle += b.spin * dtScale;
      
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.angle);
      ctx.fillStyle = PALETTE.grassLight;
      ctx.beginPath(); ctx.ellipse(0, 0, 6, 3, 0, 0, Math.PI*2); ctx.fill();
      ctx.restore();
      return b.y < H + 20;
    });
  };

  // ============================================================
  // UI BANNERS (Wood Signs)
  // ============================================================
  const drawWoodBanner = (ctx: CanvasRenderingContext2D, text: string, subtext: string, alpha: number) => {
    ctx.save();
    ctx.globalAlpha = Math.min(1, alpha);
    
    const bw = 340;
    const bh = 100;
    const bx = W / 2 - bw / 2;
    const by = H * 0.15;

    // Vines holding the sign
    ctx.strokeStyle = PALETTE.hopperDark;
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(bx + 40, 0); ctx.lineTo(bx + 40, by); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(bx + bw - 40, 0); ctx.lineTo(bx + bw - 40, by); ctx.stroke();

    // Wooden Board
    ctx.fillStyle = PALETTE.woodSign;
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 5;
    ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 8); ctx.fill();
    ctx.shadowColor = 'transparent';

    // Wood Grain lines
    ctx.strokeStyle = '#5d4037';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(bx + 20, by + 20); ctx.lineTo(bx + bw - 20, by + 20);
    ctx.moveTo(bx + 10, by + 50); ctx.lineTo(bx + bw - 30, by + 50);
    ctx.moveTo(bx + 30, by + 80); ctx.lineTo(bx + bw - 10, by + 80);
    ctx.stroke();

    // Text
    ctx.fillStyle = '#ffffff';
    ctx.font = `900 42px 'Comic Sans MS', 'Chalkboard SE', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 4;
    ctx.fillText(text, W / 2, by + bh * 0.4);

    ctx.fillStyle = '#ffeb3b';
    ctx.font = `bold 18px 'Comic Sans MS', sans-serif`;
    ctx.fillText(subtext, W / 2, by + bh * 0.75);

    ctx.restore();
  };

  // ============================================================
  // ANIMATION LOOP (Strict Delta-Time)
  // ============================================================
  const animate = useCallback((timestamp: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (lastTimeRef.current === 0) lastTimeRef.current = timestamp;
    const dt = Math.min(timestamp - lastTimeRef.current, 50); // Cap at 50ms to prevent huge jumps
    lastTimeRef.current = timestamp;

    const timeScale = reducedMotion ? 2.0 : 1.0;
    virtualTimeRef.current += dt * timeScale;
    const vTime = virtualTimeRef.current;

    // Base Draw
    ctx.clearRect(0, 0, W, H);
    drawNatureBackground(ctx, vTime);

    // State Variables
    let bowlerPhase = 0;
    let batterPhase = 0;
    let stumpsIntact = true;
    let showBall = false;
    let bannerText = '';
    let bannerSub = '';

    const IMPACT = 600;

    switch (outcome) {
      case 'six':
        bowlerPhase = Math.min(vTime / 400, 1);
        batterPhase = vTime < 400 ? 0 : Math.min((vTime - 400) / 400, 1);
        
        if (vTime > 300) {
          showBall = true;
          if (!ballRef.current) ballRef.current = { x: BOWLING_X, y: PITCH_Y - 20, vx: 0, vy: 0, trail: [], rotation: 0, bounced: false };
          
          if (vTime <= IMPACT) {
            const t = (vTime - 300) / (IMPACT - 300);
            ballRef.current.x = BOWLING_X - t * (BOWLING_X - BATTING_X);
            ballRef.current.y = PITCH_Y - 20;
            ballRef.current.rotation -= 0.2;
          } else {
            if (!hasTriggeredRef.current) { spawnLeaves(BATTING_X, PITCH_Y - 20); hasTriggeredRef.current = true; }
            const t = (vTime - IMPACT) / 2000;
            ballRef.current.x = BATTING_X + t * W * 1.2;
            ballRef.current.y = (PITCH_Y - 20) - Math.sin(t * Math.PI * 0.9) * 350;
            ballRef.current.rotation += 0.4;
          }
        }
        if (vTime > IMPACT + 300) { bannerText = 'SIX!'; bannerSub = 'Right out of the garden!'; }
        if (vTime > 3500) completedRef.current = true;
        break;

      case 'four':
        bowlerPhase = Math.min(vTime / 400, 1);
        batterPhase = vTime < 400 ? 0 : Math.min((vTime - 400) / 400, 1);
        if (vTime > 300) {
          showBall = true;
          if (!ballRef.current) ballRef.current = { x: BOWLING_X, y: PITCH_Y - 20, vx: 0, vy: 0, trail: [], rotation: 0, bounced: false };
          if (vTime <= IMPACT) {
            const t = (vTime - 300) / (IMPACT - 300);
            ballRef.current.x = BOWLING_X - t * (BOWLING_X - BATTING_X);
            ballRef.current.y = PITCH_Y - 20;
          } else {
            if (!hasTriggeredRef.current) { spawnLeaves(BATTING_X, PITCH_Y - 10); hasTriggeredRef.current = true; }
            const t = (vTime - IMPACT) / 1500;
            ballRef.current.x = BATTING_X + t * W;
            ballRef.current.y = PITCH_Y - Math.abs(Math.sin(vTime * 0.02) * 10);
            ballRef.current.rotation += 0.3;
            if (ballRef.current.y > PITCH_Y - 5 && Math.random() > 0.7) spawnDirt(ballRef.current.x, PITCH_Y);
          }
        }
        if (vTime > IMPACT + 200) { bannerText = 'FOUR!'; bannerSub = 'Races through the grass!'; }
        if (vTime > 2800) completedRef.current = true;
        break;

      case 'three':
      case 'two':
      case 'one':
        bowlerPhase = Math.min(vTime / 400, 1);
        batterPhase = vTime < 400 ? 0 : Math.min((vTime - 400) / 400, 1);
        if (vTime > 300) {
          showBall = true;
          if (!ballRef.current) ballRef.current = { x: BOWLING_X, y: PITCH_Y - 20, vx: 0, vy: 0, trail: [], rotation: 0, bounced: false };
          if (vTime <= IMPACT) {
            const t = (vTime - 300) / (IMPACT - 300);
            ballRef.current.x = BOWLING_X - t * (BOWLING_X - BATTING_X);
            ballRef.current.y = PITCH_Y - 20;
          } else {
            if (!hasTriggeredRef.current) { spawnLeaves(BATTING_X, PITCH_Y - 10); hasTriggeredRef.current = true; }
            const t = Math.min((vTime - IMPACT) / 800, 1);
            ballRef.current.x = BATTING_X + t * W * 0.3;
            ballRef.current.y = PITCH_Y;
            ballRef.current.rotation += 0.1;
          }
        }
        if (vTime > IMPACT + 200) {
          const runStr = outcome === 'three' ? '3 RUNS' : outcome === 'two' ? '2 RUNS' : '1 RUN';
          bannerText = runStr; bannerSub = 'Good running!';
        }
        if (vTime > 2000) completedRef.current = true;
        break;

      case 'run_out':
        bowlerPhase = Math.min(vTime / 400, 1);
        batterPhase = vTime < 400 ? 0 : Math.min((vTime - 400) / 400, 1);
        if (vTime > 300) {
          showBall = true;
          if (!ballRef.current) ballRef.current = { x: BOWLING_X, y: PITCH_Y - 20, vx: 0, vy: 0, trail: [], rotation: 0, bounced: false };
          if (vTime <= IMPACT) {
            const t = (vTime - 300) / (IMPACT - 300);
            ballRef.current.x = BOWLING_X - t * (BOWLING_X - BATTING_X);
            ballRef.current.y = PITCH_Y - 20;
          } else if (vTime < 1800) {
            const t = Math.min((vTime - IMPACT) / 800, 1);
            ballRef.current.x = BATTING_X + t * W * 0.3;
            ballRef.current.y = PITCH_Y;
          } else {
            const t = Math.min((vTime - 1800) / 600, 1);
            ballRef.current.x = (BOWLING_X - 50) - t * ((BOWLING_X - 50) - BATTING_X);
            ballRef.current.y = PITCH_Y - 30 - Math.sin(t * Math.PI) * 40;
          }
        }
        if (vTime > 2400) {
          stumpsIntact = false;
          if (!hasTriggeredRef.current) {
            bailsRef.current.push({ x: BATTING_X - 4, y: PITCH_Y - STUMP_H, vx: -2, vy: -4, angle: 0, spin: 0.2 });
            bailsRef.current.push({ x: BATTING_X + 4, y: PITCH_Y - STUMP_H, vx: 2, vy: -5, angle: 0, spin: -0.2 });
            spawnDirt(BATTING_X, PITCH_Y);
            hasTriggeredRef.current = true;
          }
        }
        if (vTime > IMPACT && vTime < 2400) { bannerText = '1 RUN'; bannerSub = 'Going for the second...'; }
        else if (vTime > 2400) { bannerText = 'RUN OUT!'; bannerSub = 'Direct hit from the boundary!'; }
        if (vTime > 3500) completedRef.current = true;
        break;

      case 'bowled':
        bowlerPhase = Math.min(vTime / 400, 1);
        batterPhase = vTime < 500 ? 0 : Math.min((vTime - 500) / 200, 0.4); // late swing
        if (vTime > 300) {
          showBall = true;
          if (!ballRef.current) ballRef.current = { x: BOWLING_X, y: PITCH_Y - 20, vx: 0, vy: 0, trail: [], rotation: 0, bounced: false };
          if (vTime <= IMPACT) {
            const t = (vTime - 300) / (IMPACT - 300);
            ballRef.current.x = BOWLING_X - t * (BOWLING_X - BATTING_X);
            ballRef.current.y = PITCH_Y - 20;
          } else {
            stumpsIntact = false;
            ballRef.current.x -= 3;
            ballRef.current.y = PITCH_Y - 5;
            if (!hasTriggeredRef.current) {
              bailsRef.current.push({ x: BATTING_X - 4, y: PITCH_Y - STUMP_H, vx: -3, vy: -5, angle: 0, spin: 0.3 });
              bailsRef.current.push({ x: BATTING_X + 4, y: PITCH_Y - STUMP_H, vx: 3, vy: -4, angle: 0, spin: -0.3 });
              spawnDirt(BATTING_X, PITCH_Y);
              hasTriggeredRef.current = true;
            }
          }
        }
        if (vTime > IMPACT + 200) { bannerText = 'BOWLED!'; bannerSub = 'Cleaned up the twigs!'; }
        if (vTime > 2800) completedRef.current = true;
        break;

      case 'dot':
      default:
        bowlerPhase = Math.min(vTime / 400, 1);
        if (vTime > 300) {
          showBall = true;
          if (!ballRef.current) ballRef.current = { x: BOWLING_X, y: PITCH_Y - 20, vx: 0, vy: 0, trail: [], rotation: 0, bounced: false };
          if (vTime <= IMPACT) {
            const t = (vTime - 300) / (IMPACT - 300);
            ballRef.current.x = BOWLING_X - t * (BOWLING_X - BATTING_X);
            ballRef.current.y = PITCH_Y - 20;
          }
        }
        batterPhase = vTime > IMPACT - 100 && vTime < IMPACT + 200 ? 0.3 : 0;
        if (vTime > IMPACT + 200) { bannerText = 'DOT BALL'; bannerSub = 'Solid defense.'; }
        if (vTime > 1800) completedRef.current = true;
        break;
    }

    // Rendering Sequence
    drawTwigs(ctx, BOWLING_X, PITCH_Y, true); // Non-striker stumps
    drawSnailBowler(ctx, BOWLING_X, PITCH_Y, bowlerPhase);
    
    if (showBall && ballRef.current) {
      ballRef.current.trail.push({x: ballRef.current.x, y: ballRef.current.y});
      if (ballRef.current.trail.length > 6) ballRef.current.trail.shift();
      drawBerryBall(ctx, ballRef.current);
    }

    drawTwigs(ctx, BATTING_X, PITCH_Y, stumpsIntact);
    drawGrasshopper(ctx, BATTING_X, PITCH_Y, batterPhase);

    updateAndDrawParticles(ctx, dt * 0.06 * timeScale);

    if (bannerText) {
      drawWoodBanner(ctx, bannerText, bannerSub, Math.min(1, (vTime - IMPACT - 200) / 300));
    }

    if (completedRef.current) {
      onAnimationComplete();
      return;
    }

    animRef.current = requestAnimationFrame(animate);
  }, [outcome, reducedMotion, onAnimationComplete]);

  // ============================================================
  // MOUNT & LIFECYCLE
  // ============================================================
  useEffect(() => {
    if (!outcome) return;

    // Reset loop state
    completedRef.current = false;
    hasTriggeredRef.current = false;
    virtualTimeRef.current = 0;
    lastTimeRef.current = 0;
    particlesRef.current = [];
    bailsRef.current = [];
    ballRef.current = null;

    if (reducedMotion) {
      setTimeout(() => onAnimationComplete(), 1500);
      return;
    }

    animRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animRef.current);
    };
  }, [outcome, reducedMotion, onAnimationComplete, animate]);

  // Initial draw before action
  useEffect(() => {
    if (virtualTimeRef.current === 0 && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        drawNatureBackground(ctx, 0);
        drawTwigs(ctx, BOWLING_X, PITCH_Y, true);
        drawSnailBowler(ctx, BOWLING_X, PITCH_Y, 0);
        drawTwigs(ctx, BATTING_X, PITCH_Y, true);
        drawGrasshopper(ctx, BATTING_X, PITCH_Y, 0);
      }
    }
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={W}
      height={H}
      className="w-full h-full object-contain rounded-xl shadow-xl border border-lime-800/30 bg-lime-950"
      aria-label="Grasshopper Cricket Animation Canvas"
    />
  );
};

export default CricketCanvas;
