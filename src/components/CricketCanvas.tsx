// ============================================================
// Grammar Cricket - 16-Bit Retro Arcade Edition (Full Version)
// Chunky, pixel-perfect graphics using pure HTML5 Canvas
// ============================================================
import React, { useRef, useEffect, useCallback } from 'react';
import { CricketOutcome } from '../engine/GameState'; // Ensure path matches your project

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
  gravity: number;
  type: 'spark' | 'dust';
}

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number; // Used as block size in retro mode
  trail: Array<{ x: number; y: number; alpha: number }>;
  bounced: boolean;
  rotation: number;
}

const CricketCanvas: React.FC<CricketCanvasProps> = ({
  outcome,
  onAnimationComplete,
  reducedMotion = false,
  teamColors = ['#10b981', '#3b82f6'],
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
  
  // Retro Chunky Proportions
  const STUMP_HEIGHT = 45; 
  const STUMP_W = 6; 
  const STUMP_SPACING = 10;

  // 16-Bit Hard Palette (No gradients, pure hex)
  const COLORS = {
    sky: '#1e1b4b',
    grassDark: '#166534',
    grassLight: '#15803d',
    pitch: '#d4b872',
    pitchCrease: '#ffffff',
    stump: '#fde047',
    bail: '#ffffff',
    ball: '#e11d48',
    bat: '#b45309',
    batHandle: '#333333',
    pad: '#f1f5f9',
    skin: '#fca5a5',
    shoe: '#171717',
    shadow: 'rgba(0, 0, 0, 0.4)'
  };

  // ============================================================
  // ENVIRONMENT DRAWING (RETRO PIXEL STYLE)
  // ============================================================
  const drawField = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number, elapsed: number) => {
    // 1. Solid Sky
    ctx.fillStyle = COLORS.sky;
    ctx.fillRect(0, 0, w, h * 0.45);

    // 2. Blocky Stars
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 20; i++) {
      const sx = ((i * 143) + Math.floor(elapsed * 0.01)) % w;
      const sy = (i * 71) % (h * 0.35);
      if (Math.sin(elapsed / 500 + i) > 0) { // Twinkle
        ctx.fillRect(sx, sy, 4, 4);
      }
    }

    // 3. Pixel Crowd/Stands
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, h * 0.35, w, h * 0.1);
    const crowdColors = ['#ef4444', '#3b82f6', '#eab308', '#22c55e', '#a855f7', '#ffffff'];
    for(let r = 0; r < 4; r++) {
      for(let c = 0; c < 40; c++) {
        const x = c * 20 + (r % 2) * 10;
        const y = h * 0.36 + r * 10;
        const jump = Math.sin(elapsed / 150 + c) > 0.8 ? -4 : 0;
        ctx.fillStyle = crowdColors[(c + r) % crowdColors.length];
        ctx.fillRect(x, y + jump, 8, 8);
        ctx.fillStyle = COLORS.skin; // Little heads
        ctx.fillRect(x + 2, y - 6 + jump, 4, 4);
      }
    }

    // 4. Chunky Checkerboard Grass
    const tileSize = 40;
    for (let row = 0; row < Math.ceil((h * 0.55) / tileSize); row++) {
      for (let col = 0; col < Math.ceil(w / tileSize); col++) {
        ctx.fillStyle = (row + col) % 2 === 0 ? COLORS.grassDark : COLORS.grassLight;
        ctx.fillRect(col * tileSize, h * 0.45 + row * tileSize, tileSize, tileSize);
      }
    }

    // 5. Proper Full-Length Pitch
    const pitchH = 80;
    const pitchW = BOWLING_X - BATTING_X + 120; // Extends past wickets
    const pitchX = BATTING_X - 60;
    const pitchYTop = PITCH_Y - pitchH / 2;
    
    // Pitch Shadow
    ctx.fillStyle = COLORS.shadow;
    ctx.fillRect(pitchX, pitchYTop + 4, pitchW, pitchH);
    // Pitch Base
    ctx.fillStyle = COLORS.pitch;
    ctx.fillRect(pitchX, pitchYTop, pitchW, pitchH);

    // 6. Crisp Crease Lines (Blocky)
    ctx.fillStyle = COLORS.pitchCrease;
    // Batting side
    ctx.fillRect(BATTING_X, pitchYTop, 4, pitchH); // Bowling Crease (Wicket line)
    ctx.fillRect(BATTING_X + 48, pitchYTop, 4, pitchH); // Popping Crease
    ctx.fillRect(BATTING_X, pitchYTop, 48, 4); // Return crease top
    ctx.fillRect(BATTING_X, pitchYTop + pitchH - 4, 48, 4); // Return crease bottom
    // Bowling side
    ctx.fillRect(BOWLING_X, pitchYTop, 4, pitchH); // Bowling Crease
    ctx.fillRect(BOWLING_X - 48, pitchYTop, 4, pitchH); // Popping Crease
    ctx.fillRect(BOWLING_X - 48, pitchYTop, 48, 4); // Return
    ctx.fillRect(BOWLING_X - 48, pitchYTop + pitchH - 4, 48, 4); // Return
    
    // Static Fielders Scattered
    drawFielder(ctx, 120, 200, teamColors[1]); // Deep backward square
    drawFielder(ctx, 500, 160, teamColors[1]); // Point / Cover
    drawFielder(ctx, 650, 420, teamColors[1]); // Mid on
  }, [BATTING_X, BOWLING_X, PITCH_Y, teamColors]);

  // ============================================================
  // RETRO CHARACTER & EQUIPMENT DRAWING
  // ============================================================
  function drawStumps(ctx: CanvasRenderingContext2D, cx: number, y: number, intact: boolean = true) {
    // Shadow
    ctx.fillStyle = COLORS.shadow;
    ctx.fillRect(cx - STUMP_SPACING - 4, y, (STUMP_SPACING * 2) + STUMP_W + 8, 6);

    ctx.fillStyle = COLORS.stump;
    const stumpsX = [cx - STUMP_SPACING, cx, cx + STUMP_SPACING];
    stumpsX.forEach(sx => {
      ctx.fillRect(sx - STUMP_W/2, y - STUMP_HEIGHT, STUMP_W, STUMP_HEIGHT);
    });

    if (intact) {
      ctx.fillStyle = COLORS.bail;
      ctx.fillRect(cx - STUMP_SPACING - 2, y - STUMP_HEIGHT - 4, STUMP_SPACING + 4, 4);
      ctx.fillRect(cx - 2, y - STUMP_HEIGHT - 4, STUMP_SPACING + 4, 4);
    }
  }

  // Base Retro Sprite Renderer
  function drawPixelPlayer(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, config: any) {
    const { isBatting, isKeeper, facingRight } = config;
    ctx.save();
    ctx.translate(x, y);
    if (!facingRight) ctx.scale(-1, 1);

    // Shadow
    ctx.fillStyle = COLORS.shadow;
    ctx.fillRect(-16, 0, 32, 8);

    // Legs / Pants
    ctx.fillStyle = '#cbd5e1'; 
    ctx.fillRect(-10, -28, 8, 28); // Back leg
    ctx.fillRect(4, -28, 8, 28);   // Front leg
    
    // Shoes
    ctx.fillStyle = COLORS.shoe;
    ctx.fillRect(-12, -6, 12, 6);
    ctx.fillRect(4, -6, 12, 6);

    // Protective Pads
    if (isBatting || isKeeper) {
      ctx.fillStyle = COLORS.pad;
      ctx.fillRect(-12, -30, 10, 24);
      ctx.fillRect(2, -30, 10, 24);
    }

    // Torso (Jersey)
    ctx.fillStyle = color;
    if (isKeeper) {
      ctx.fillRect(-12, -45, 24, 20); // Crouched body
    } else {
      ctx.fillRect(-12, -54, 24, 28); // Standing body
    }

    // Head/Face
    const headY = isKeeper ? -62 : -72;
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(-6, headY, 14, 16);

    // Helmet or Cap
    if (isBatting || isKeeper) {
      ctx.fillStyle = '#0f172a'; // Helmet shell
      ctx.fillRect(-8, headY - 4, 18, 12);
      ctx.fillRect(0, headY + 2, 12, 4); // Peak
      ctx.fillStyle = '#fef08a'; // Grille
      ctx.fillRect(2, headY + 6, 10, 8);
    } else {
      ctx.fillStyle = color; // Cap
      ctx.fillRect(-8, headY - 4, 16, 8);
      ctx.fillRect(2, headY + 4, 12, 4); // Brim
    }

    ctx.restore();
  }

  function drawKeeper(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
    drawPixelPlayer(ctx, x, y, color, { isBatting: false, isKeeper: true, facingRight: true });
    // Huge Gloves
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + 10, y - 30, 12, 14);
    ctx.fillRect(x + 4, y - 24, 12, 14);
  }

  function drawFielder(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
    // Smaller background fielders
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(0.7, 0.7);
    drawPixelPlayer(ctx, 0, 0, color, { isBatting: false, isKeeper: false, facingRight: false });
    ctx.restore();
  }

  function drawBatsman(ctx: CanvasRenderingContext2D, x: number, y: number, swingAngle: number = 0, color: string) {
    drawPixelPlayer(ctx, x, y, color, { isBatting: true, isKeeper: false, facingRight: true });
    
    // Arms & Bat (Dynamic)
    ctx.save();
    ctx.translate(x + 2, y - 48); // Shoulder joint
    ctx.rotate(swingAngle);
    
    // Arms
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(-4, 0, 8, 24);
    // Gloves
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-6, 20, 12, 10);
    
    // Bat
    ctx.fillStyle = COLORS.batHandle;
    ctx.fillRect(-3, 28, 6, 16); // Handle
    ctx.fillStyle = COLORS.bat;
    ctx.fillRect(-5, 44, 10, 36); // Blade
    
    ctx.restore();
  }

  function drawNonStriker(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
    drawPixelPlayer(ctx, x, y, color, { isBatting: true, isKeeper: false, facingRight: false });
    // Grounded Bat
    ctx.fillStyle = COLORS.batHandle;
    ctx.fillRect(x - 20, y - 30, 6, 16);
    ctx.fillStyle = COLORS.bat;
    ctx.fillRect(x - 22, y - 14, 10, 14);
  }

  function drawBowler(ctx: CanvasRenderingContext2D, x: number, y: number, runUpProgress: number = 0, color: string) {
    ctx.save();
    ctx.translate(x - runUpProgress * 40, y);
    
    // Basic body
    drawPixelPlayer(ctx, 0, 0, color, { isBatting: false, isKeeper: false, facingRight: false });
    
    // Animated Bowling Arm
    const armAngle = runUpProgress > 0.7 ? (runUpProgress - 0.7) * Math.PI * 2 : -Math.PI/4;
    ctx.translate(-2, -50); // Shoulder
    ctx.rotate(armAngle);
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(-4, -20, 8, 24);
    
    ctx.restore();
  }

  function drawBall(ctx: CanvasRenderingContext2D, ball: Ball) {
    // Pixel Trail
    if (ball.trail.length > 0) {
      ball.trail.forEach((t) => {
        ctx.fillStyle = `rgba(225, 29, 72, ${t.alpha * 0.6})`;
        ctx.fillRect(t.x - ball.radius, t.y - ball.radius, ball.radius*2, ball.radius*2);
      });
    }

    // Shadow
    ctx.fillStyle = COLORS.shadow;
    ctx.fillRect(ball.x - ball.radius, ball.y + 8, ball.radius*2, 6);

    // Ball Block
    ctx.fillStyle = COLORS.ball;
    ctx.fillRect(ball.x - ball.radius, ball.y - ball.radius, ball.radius*2.5, ball.radius*2.5);
    // Pixel Seam
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(ball.x - 2, ball.y - ball.radius, 4, ball.radius*2.5);
  }

  // ============================================================
  // VFX (BLOCKY PARTICLES)
  // ============================================================
  function spawnFireworks(x: number, y: number, count: number = 30) {
    const colors = ['#fde047', '#38bdf8', '#4ade80', '#fb923c', '#ffffff'];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 4 + Math.random() * 8;
      particlesRef.current.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 60, maxLife: 60,
        size: 4 + Math.random() * 6,
        gravity: 0.15,
        type: 'spark'
      });
    }
  }

  function spawnDust(x: number, y: number) {
    for (let i = 0; i < 8; i++) {
      particlesRef.current.push({
        x: x + (Math.random() - 0.5) * 10, y: y + (Math.random() - 0.5) * 10,
        vx: (Math.random() - 0.5) * 2, vy: -Math.random() * 2,
        color: '#a68a56',
        life: 30, maxLife: 30, size: 6 + Math.random() * 8, gravity: 0, type: 'dust'
      });
    }
  }

  function updateAndDrawParticles(ctx: CanvasRenderingContext2D) {
    particlesRef.current = particlesRef.current.filter(p => {
      p.life--;
      p.x += p.vx; p.y += p.vy;
      p.vy += p.gravity;
      p.vx *= 0.95; 

      ctx.fillStyle = p.color;
      if (p.type === 'spark') {
        // Flickering block
        if(p.life % 4 > 1) ctx.fillRect(p.x, p.y, p.size, p.size);
      } else {
        ctx.fillRect(p.x, p.y, p.size, p.size);
      }
      return p.life > 0;
    });
  }

  function spawnBails(cx: number, y: number) {
    bailsRef.current = [
      { x: cx - STUMP_SPACING, y: y - STUMP_HEIGHT, vx: -3 - Math.random()*3, vy: -6 - Math.random()*4, angle: 0, spin: 0 },
      { x: cx + STUMP_SPACING, y: y - STUMP_HEIGHT, vx: 3 + Math.random()*3, vy: -5 - Math.random()*4, angle: 0, spin: 0 }
    ];
  }

  function updateAndDrawBails(ctx: CanvasRenderingContext2D) {
    bailsRef.current = bailsRef.current.filter(b => {
      b.x += b.vx; b.y += b.vy; b.vy += 0.5; 
      
      // Blocky flying bails
      ctx.fillStyle = COLORS.bail;
      ctx.fillRect(b.x - 6, b.y - 2, 12, 6);
      return b.y < CANVAS_H + 50;
    });
  }

  function drawBanner(ctx: CanvasRenderingContext2D, text: string, subtext: string, w: number, h: number, color: string, alpha: number) {
    if(alpha <= 0) return;
    const bw = 480; const bh = 100;
    const bx = w / 2 - bw / 2; const by = h * 0.15;
    
    // Retro Blocky Banner
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(bx, by, bw, bh);
    // Bright thick border
    ctx.fillStyle = color;
    ctx.fillRect(bx - 8, by - 8, bw + 16, 8); // Top
    ctx.fillRect(bx - 8, by + bh, bw + 16, 8); // Bottom
    ctx.fillRect(bx - 8, by - 8, 8, bh + 16); // Left
    ctx.fillRect(bx + bw, by - 8, 8, bh + 16); // Right

    // Pixel Font Fallback
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold 48px "Courier New", monospace`;
    ctx.fillText(text, w / 2, by + bh * 0.4);
    
    ctx.fillStyle = color;
    ctx.font = `bold 20px "Courier New", monospace`;
    ctx.fillText(subtext.toUpperCase(), w / 2, by + bh * 0.8);
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
    
    // Force Retro Pixel Rendering
    ctx.imageSmoothingEnabled = false;

    const w = canvas.width;
    const h = canvas.height;
    const elapsed = timestamp - startTimeRef.current;

    let shakeX = 0, shakeY = 0;
    if (shakeDecay > 0.5) {
      shakeX = Math.floor((Math.random() - 0.5) * shakeDecay);
      shakeY = Math.floor((Math.random() - 0.5) * shakeDecay);
      shakeDecay *= 0.85; 
    }

    ctx.save();
    ctx.translate(shakeX, shakeY);
    
    drawField(ctx, w, h, elapsed);

    if (ballRef.current) {
      const ball = ballRef.current;
      ball.trail.push({ x: ball.x, y: ball.y, alpha: 1 });
      if (ball.trail.length > 8) ball.trail.shift(); 
      ball.trail.forEach((t, i) => t.alpha = i / ball.trail.length);

      ball.x += ball.vx;
      ball.y += ball.vy;
      ball.vy += 0.25; 

      if (ball.y > PITCH_Y - ball.radius && !ball.bounced && ball.vy > 0) {
        ball.vy = -ball.vy * 0.65;
        ball.vx *= 0.96;
        ball.bounced = true;
        spawnDust(ball.x, PITCH_Y);
      }
    }

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
  // OUTCOME SEQUENCES & RUNNING LOGIC
  // ============================================================
  function renderSix(ctx: CanvasRenderingContext2D, w: number, h: number, elapsed: number) {
    const phase1 = Math.min(elapsed / 500, 1);
    const phase2 = Math.max(0, (elapsed - 300) / 4200);

    drawKeeper(ctx, BATTING_X - 60, PITCH_Y, teamColors[1]);
    drawNonStriker(ctx, BOWLING_X, PITCH_Y - 20, teamColors[0]);
    drawBowler(ctx, BOWLING_X, PITCH_Y, 1.0, teamColors[1]);

    if (phase2 > 0 && ballRef.current) {
      const bx = BATTING_X + phase2 * (w * 0.9);
      const arc = -Math.sin(phase2 * Math.PI) * h * 0.7;
      ballRef.current.x = bx;
      ballRef.current.y = PITCH_Y + arc;
      ballRef.current.bounced = false; 
      drawBall(ctx, ballRef.current);
    }

    const swingAngle = phase1 < 0.5 ? phase1 * -2.0 : (1 - phase1) * -1.0;
    drawStumps(ctx, BATTING_X, PITCH_Y, true);
    drawBatsman(ctx, BATTING_X, PITCH_Y, swingAngle, teamColors[0]);

    if (elapsed > 280 && !hasHitRef.current) {
      startShake(16); 
      hasHitRef.current = true;
    }

    if (elapsed > 1000 && elapsed < 3500 && elapsed % 250 < 20) {
      spawnFireworks(w * 0.1 + Math.random() * w * 0.8, h * 0.05 + Math.random() * h * 0.35, 10);
    }
    if (elapsed > 500) drawBanner(ctx, 'SIX!', 'Massive Hit!', w, h, '#eab308', 1);
  }

  function renderFour(ctx: CanvasRenderingContext2D, w: number, h: number, elapsed: number) {
    drawKeeper(ctx, BATTING_X - 60, PITCH_Y, teamColors[1]);
    drawNonStriker(ctx, BOWLING_X, PITCH_Y - 20, teamColors[0]);
    drawBowler(ctx, BOWLING_X, PITCH_Y, 1.0, teamColors[1]);
    
    if (elapsed > 250 && ballRef.current) {
      ballRef.current.x = BATTING_X + ((elapsed - 250) / 2000) * w;
      ballRef.current.y = PITCH_Y - Math.abs(Math.sin(elapsed / 60) * 16);
      ballRef.current.bounced = true;
      drawBall(ctx, ballRef.current);
    }

    const phase1 = Math.min(elapsed / 400, 1);
    drawStumps(ctx, BATTING_X, PITCH_Y, true);
    drawBatsman(ctx, BATTING_X, PITCH_Y, phase1 < 0.5 ? phase1 * -1.2 : (1 - phase1) * -0.4, teamColors[0]);

    if (elapsed > 250 && !hasHitRef.current) {
      startShake(10);
      hasHitRef.current = true;
    }
    if (elapsed > 400) drawBanner(ctx, 'FOUR!', 'Pierces The Gap!', w, h, '#22c55e', 1);
  }

  // Core Running Mechanics Function
  function drawRunners(ctx: CanvasRenderingContext2D, elapsed: number, runs: number) {
    const startDelay = 350;
    const timePerRun = 800;
    
    if (elapsed < startDelay) {
      // Players still at creases before setting off
      drawNonStriker(ctx, BOWLING_X, PITCH_Y - 20, teamColors[0]);
      drawBatsman(ctx, BATTING_X, PITCH_Y, -0.3, teamColors[0]);
      return;
    }

    const totalProgress = Math.min((elapsed - startDelay) / timePerRun, runs);
    const currentRun = Math.floor(totalProgress);
    const legProgress = totalProgress % 1; // 0 to 1 progress for the current leg of the run
    const isRunning = totalProgress < runs;
    
    // Retro arcade bounce effect while moving
    const bounce = isRunning ? -Math.abs(Math.sin(elapsed / 40) * 10) : 0;

    // Determine direction for this specific run (Run 1: Striker goes Right. Run 2: Left. etc)
    const strikerGoingRight = currentRun % 2 === 0;
    
    const startX = strikerGoingRight ? BATTING_X : BOWLING_X;
    const endX = strikerGoingRight ? BOWLING_X : BATTING_X;
    const strikerX = startX + legProgress * (endX - startX);
    
    const nonStartX = strikerGoingRight ? BOWLING_X : BATTING_X;
    const nonEndX = strikerGoingRight ? BATTING_X : BOWLING_X;
    const nonStrikerX = nonStartX + legProgress * (nonEndX - nonStartX);

    // Draw Non-Striker (slightly higher up/in background depth)
    drawPixelPlayer(ctx, nonStrikerX, PITCH_Y - 20 + bounce, teamColors[0], { 
      isBatting: true, isKeeper: false, facingRight: !strikerGoingRight 
    });
    
    // Draw Striker (foreground)
    drawPixelPlayer(ctx, strikerX, PITCH_Y + bounce, teamColors[0], { 
      isBatting: true, isKeeper: false, facingRight: strikerGoingRight 
    });
  }

  function renderThreeRuns(ctx: CanvasRenderingContext2D, w: number, h: number, elapsed: number) {
    drawKeeper(ctx, BATTING_X - 60, PITCH_Y, teamColors[1]);
    drawStumps(ctx, BOWLING_X, PITCH_Y, true);
    drawBowler(ctx, BOWLING_X, PITCH_Y - 40, 1.0, teamColors[1]); // Moved up/out of the way
    
    if (elapsed > 300 && ballRef.current) {
      ballRef.current.x = BATTING_X + Math.min((elapsed - 300) / 800, 1) * w * 0.4;
      ballRef.current.y = PITCH_Y;
      drawBall(ctx, ballRef.current);
    }
    
    drawStumps(ctx, BATTING_X, PITCH_Y, true);
    drawRunners(ctx, elapsed, 3);
    
    if (elapsed > 500) drawBanner(ctx, '3 RUNS', 'Great Running!', w, h, '#3b82f6', 1);
  }

  function renderTwoRuns(ctx: CanvasRenderingContext2D, w: number, h: number, elapsed: number) {
    drawKeeper(ctx, BATTING_X - 60, PITCH_Y, teamColors[1]);
    drawStumps(ctx, BOWLING_X, PITCH_Y, true);
    drawBowler(ctx, BOWLING_X, PITCH_Y - 40, 1.0, teamColors[1]); 
    
    if (elapsed > 250 && ballRef.current) {
      ballRef.current.x = BATTING_X + Math.min((elapsed - 250) / 700, 1) * w * 0.3;
      ballRef.current.y = PITCH_Y;
      drawBall(ctx, ballRef.current);
    }

    drawStumps(ctx, BATTING_X, PITCH_Y, true);
    drawRunners(ctx, elapsed, 2);

    if (elapsed > 450) drawBanner(ctx, '2 RUNS', 'Comfortably Back.', w, h, '#a855f7', 1);
  }

  function renderOneRun(ctx: CanvasRenderingContext2D, w: number, h: number, elapsed: number) {
    drawKeeper(ctx, BATTING_X - 60, PITCH_Y, teamColors[1]);
    drawStumps(ctx, BOWLING_X, PITCH_Y, true);
    drawBowler(ctx, BOWLING_X, PITCH_Y - 40, 1.0, teamColors[1]); 
    
    if (elapsed > 200 && ballRef.current) {
      ballRef.current.x = BATTING_X + Math.min((elapsed - 200) / 500, 1) * w * 0.2;
      ballRef.current.y = PITCH_Y;
      drawBall(ctx, ballRef.current);
    }
    
    drawStumps(ctx, BATTING_X, PITCH_Y, true);
    drawRunners(ctx, elapsed, 1);

    if (elapsed > 400) drawBanner(ctx, '1 RUN', 'Quick Single.', w, h, '#94a3b8', 1);
  }

  function renderRunOut(ctx: CanvasRenderingContext2D, w: number, h: number, elapsed: number) {
    drawKeeper(ctx, BATTING_X - 60, PITCH_Y, teamColors[1]);
    drawBowler(ctx, BOWLING_X, PITCH_Y - 40, 1.0, teamColors[1]);
    
    // They attempt to run two, but get cut off right before the crease (1.8 runs)
    drawRunners(ctx, elapsed, 1.8); 

    if (elapsed > 2200 && ballRef.current) {
      const throwProgress = Math.min((elapsed - 2200) / 600, 1);
      ballRef.current.x = BATTING_X + 160 + throwProgress * (BOWLING_X - BATTING_X - 160);
      ballRef.current.y = PITCH_Y - Math.sin(throwProgress * Math.PI) * 50;
      ballRef.current.bounced = true;
      drawBall(ctx, ballRef.current);
    } else if (elapsed > 350 && ballRef.current) {
      ballRef.current.x = BATTING_X + Math.min((elapsed - 350) / 400, 1) * w * 0.25;
      ballRef.current.y = PITCH_Y;
      drawBall(ctx, ballRef.current);
    }

    if (elapsed > 2800) {
      drawStumps(ctx, BATTING_X, PITCH_Y, false);
      drawStumps(ctx, BOWLING_X, PITCH_Y, false);
      if (!hasHitRef.current) {
        spawnBails(BATTING_X, PITCH_Y);
        spawnDust(BOWLING_X, PITCH_Y);
        startShake(12);
        hasHitRef.current = true;
      }
    } else {
      drawStumps(ctx, BATTING_X, PITCH_Y, true);
      drawStumps(ctx, BOWLING_X, PITCH_Y, true);
    }

    if (elapsed > 400 && elapsed < 2500) drawBanner(ctx, '1 RUN', 'Pushing For Two...', w, h, '#94a3b8', 1);
    if (elapsed > 3000) drawBanner(ctx, 'RUN OUT!', 'Direct Hit!', w, h, '#e11d48', 1);
  }

  function renderBowled(ctx: CanvasRenderingContext2D, w: number, h: number, elapsed: number) {
    drawKeeper(ctx, BATTING_X - 60, PITCH_Y, teamColors[1]);
    drawNonStriker(ctx, BOWLING_X, PITCH_Y - 20, teamColors[0]);
    
    const delivery = Math.min(elapsed / 600, 1);
    drawBowler(ctx, BOWLING_X, PITCH_Y, delivery, teamColors[1]);

    if (elapsed < 750 && ballRef.current) drawBall(ctx, ballRef.current); 

    drawBatsman(ctx, BATTING_X, PITCH_Y, elapsed > 750 ? 0.4 : -0.2, teamColors[0]);

    if (elapsed > 750) {
      drawStumps(ctx, BATTING_X, PITCH_Y, false);
      if (!hasHitRef.current) {
        spawnBails(BATTING_X, PITCH_Y);
        spawnDust(BATTING_X, PITCH_Y);
        startShake(16);
        hasHitRef.current = true;
      }
    } else {
      drawStumps(ctx, BATTING_X, PITCH_Y, true);
    }
    drawStumps(ctx, BOWLING_X, PITCH_Y, true);

    if (elapsed > 1000) drawBanner(ctx, 'BOWLED!', 'Cleaned Up!', w, h, '#e11d48', 1);
  }

  function renderDot(ctx: CanvasRenderingContext2D, w: number, h: number, elapsed: number) {
    drawKeeper(ctx, BATTING_X - 60, PITCH_Y, teamColors[1]);
    drawNonStriker(ctx, BOWLING_X, PITCH_Y - 20, teamColors[0]);
    
    const delivery = Math.min(elapsed / 600, 1);
    drawBowler(ctx, BOWLING_X, PITCH_Y, delivery * 0.8, teamColors[1]);
    
    if (elapsed < 700 && ballRef.current) drawBall(ctx, ballRef.current);

    drawStumps(ctx, BATTING_X, PITCH_Y, true);
    drawBatsman(ctx, BATTING_X, PITCH_Y, elapsed > 300 && elapsed < 700 ? 0.15 : 0, teamColors[0]);
    drawStumps(ctx, BOWLING_X, PITCH_Y, true);

    if (elapsed > 800) drawBanner(ctx, 'DOT BALL', 'Solid Defense.', w, h, '#94a3b8', 1);
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
      x: BOWLING_X - 12, y: PITCH_Y - 45,
      vx: -12.5, vy: 1.8,
      radius: 6, // Square radius
      trail: [], bounced: false, rotation: 0
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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false; // Force retro look
    
    drawField(ctx, canvas.width, canvas.height, 0);
    drawStumps(ctx, BATTING_X, PITCH_Y, true);
    drawStumps(ctx, BOWLING_X, PITCH_Y, true);
    drawKeeper(ctx, BATTING_X - 60, PITCH_Y, teamColors[1]);
    drawNonStriker(ctx, BOWLING_X, PITCH_Y - 20, teamColors[0]);
    drawBatsman(ctx, BATTING_X, PITCH_Y, 0, teamColors[0]);
    drawBowler(ctx, BOWLING_X, PITCH_Y, 0, teamColors[1]);
  }, [drawField, teamColors]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_W}
      height={CANVAS_H}
      className="w-full h-full object-contain rounded-2xl shadow-2xl shadow-indigo-900/50 border-4 border-slate-900"
      // CSS image-rendering ensures the canvas scales chunky without blurring
      style={{ maxHeight: '100%', maxWidth: '100%', background: '#0f172a', imageRendering: 'pixelated' }}
      aria-label="16-Bit Retro Cricket Animation"
    />
  );
};

export default CricketCanvas;
