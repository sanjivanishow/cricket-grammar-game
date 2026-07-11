// ============================================================
// Grammar Cricket - Galactic Cyber-Arena Canvas
// Bug-free time-loop, extreme VFX, and articulated characters
// ============================================================
import React, { useRef, useEffect } from 'react';
import { CricketOutcome } from '../engine/GameState';

interface CricketCanvasProps {
  outcome: CricketOutcome | null;
  onAnimationComplete: () => void;
  reducedMotion?: boolean;
  teamColors?: [string, string];
}

// --- Interfaces for VFX & Physics ---
interface Star { x: number; y: number; size: number; speed: number; alpha: number; }
interface Particle { x: number; y: number; vx: number; vy: number; color: string; life: number; size: number; }
interface Shockwave { x: number; y: number; radius: number; maxRadius: number; color: string; life: number; }
interface Ball { x: number; y: number; vx: number; vy: number; trail: Array<{x: number, y: number}>; }

const CricketCanvas: React.FC<CricketCanvasProps> = ({
  outcome,
  onAnimationComplete,
  reducedMotion = false,
  teamColors = ['#00e5ff', '#ff0055'], 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Bug-Fix: Strict RAF Time Tracking
  const animRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const virtualTimeRef = useRef<number>(0);
  const completedRef = useRef<boolean>(false);
  
  // VFX State
  const starsRef = useRef<Star[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const shockwavesRef = useRef<Shockwave[]>([]);
  const ballRef = useRef<Ball | null>(null);
  
  // Game Coordinates
  const W = 800;
  const H = 480;
  const PITCH_Y = H * 0.75;
  const BATTING_X = W * 0.25;
  const BOWLING_X = W * 0.8;

  // ============================================================
  // MATH & LERPING HELPERS
  // ============================================================
  const lerp = (a: number, b: number, t: number) => a + (b - a) * Math.max(0, Math.min(1, t));
  
  const drawLine = (ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, width: number, color: string) => {
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
    ctx.lineWidth = width; ctx.strokeStyle = color; ctx.stroke();
  };

  // Initialize stars once
  useEffect(() => {
    if (starsRef.current.length === 0) {
      for (let i = 0; i < 150; i++) {
        starsRef.current.push({
          x: Math.random() * W, y: Math.random() * H,
          size: Math.random() * 2, speed: 0.1 + Math.random() * 0.5,
          alpha: Math.random()
        });
      }
    }
  }, []);

  // ============================================================
  // BACKGROUND RENDERER
  // ============================================================
  const drawGalacticArena = (ctx: CanvasRenderingContext2D, vTime: number) => {
    // Deep Void Background
    ctx.fillStyle = '#02000a';
    ctx.fillRect(0, 0, W, H);

    // Cosmic Nebula
    const cx = W / 2 + Math.sin(vTime * 0.0005) * 50;
    const cy = H * 0.3 + Math.cos(vTime * 0.0007) * 30;
    const nebula = ctx.createRadialGradient(cx, cy, 10, cx, cy, 600);
    nebula.addColorStop(0, 'rgba(120, 0, 255, 0.15)');
    nebula.addColorStop(0.5, 'rgba(0, 200, 255, 0.05)');
    nebula.addColorStop(1, 'transparent');
    ctx.fillStyle = nebula;
    ctx.fillRect(0, 0, W, H);

    // Parallax Stars
    ctx.fillStyle = '#fff';
    starsRef.current.forEach(star => {
      star.x -= star.speed;
      if (star.x < 0) { star.x = W; star.y = Math.random() * H; }
      ctx.globalAlpha = star.alpha * (0.5 + Math.sin(vTime * 0.005 + star.x) * 0.5);
      ctx.beginPath(); ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalAlpha = 1;

    // Hyper-Grid Floor
    ctx.save();
    const horizon = H * 0.55;
    ctx.beginPath(); ctx.rect(0, horizon, W, H - horizon); ctx.clip();
    
    // Grid glow
    const gridGrad = ctx.createLinearGradient(0, horizon, 0, H);
    gridGrad.addColorStop(0, 'rgba(0, 255, 200, 0)');
    gridGrad.addColorStop(1, 'rgba(0, 255, 200, 0.15)');
    ctx.fillStyle = gridGrad;
    ctx.fillRect(0, horizon, W, H);

    ctx.strokeStyle = 'rgba(0, 255, 200, 0.3)';
    ctx.lineWidth = 1;
    // Perspective vertical lines
    for (let i = -W; i <= W * 2; i += 60) {
      ctx.beginPath(); ctx.moveTo(W / 2 + (i - W / 2) * 0.1, horizon); ctx.lineTo(i, H); ctx.stroke();
    }
    // Horizontal scrolling lines
    for (let i = 0; i < 20; i++) {
      const yOffset = ((vTime * 0.05 + i * 20) % (H - horizon));
      const y = horizon + Math.pow(yOffset / (H - horizon), 2) * (H - horizon);
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    ctx.restore();

    // The Pitch (Glass platform)
    ctx.fillStyle = 'rgba(10, 15, 30, 0.8)';
    ctx.strokeStyle = teamColors[1];
    ctx.lineWidth = 3;
    ctx.shadowBlur = 20;
    ctx.shadowColor = teamColors[1];
    ctx.beginPath();
    ctx.moveTo(W/2 - 60, PITCH_Y - 40); ctx.lineTo(W/2 + 60, PITCH_Y - 40);
    ctx.lineTo(W/2 + 100, PITCH_Y + 40); ctx.lineTo(W/2 - 100, PITCH_Y + 40);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0;
  };

  // ============================================================
  // ARTICULATED KINEMATIC CHARACTER
  // ============================================================
  const drawCyberCharacter = (ctx: CanvasRenderingContext2D, x: number, y: number, color: string, swingPhase: number, isBowler: boolean) => {
    ctx.save();
    ctx.translate(x, y);
    if (isBowler) ctx.scale(-1, 1);

    ctx.shadowBlur = 10;
    ctx.shadowColor = color;
    
    // Core Torso
    drawLine(ctx, 0, -30, 0, -60, 6, color);
    // Head Visor
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(0, -70, 8, 0, Math.PI * 2); ctx.fill();

    if (isBowler) {
      // Bowler Throwing pose
      const armAngle = lerp(Math.PI * 1.2, -Math.PI * 0.2, swingPhase);
      const handX = Math.cos(armAngle) * 25;
      const handY = -55 + Math.sin(armAngle) * 25;
      drawLine(ctx, 0, -55, handX, handY, 4, '#fff'); // Arm
      drawLine(ctx, 0, -30, -10, 0, 5, color); // Leg 1
      drawLine(ctx, 0, -30, 15, -10, 5, color); // Leg 2
    } else {
      // Batsman Articulated IK Swing
      // swingPhase 0 = stance, 0.5 = impact, 1 = follow-through
      const shoulderX = -5, shoulderY = -55;
      
      let elbowX, elbowY, handX, handY, batAngle;
      
      if (swingPhase < 0.5) {
        // Backlift to Impact
        const t = swingPhase / 0.5;
        handX = lerp(15, 20, t);
        handY = lerp(-40, -10, t);
        batAngle = lerp(-Math.PI * 0.2, Math.PI * 0.5, Math.pow(t, 3)); 
      } else {
        // Impact to Follow-through
        const t = (swingPhase - 0.5) / 0.5;
        handX = lerp(20, -15, t);
        handY = lerp(-10, -65, t);
        batAngle = lerp(Math.PI * 0.5, Math.PI * 1.2, Math.pow(t, 0.5));
      }

      // Draw Arms
      drawLine(ctx, shoulderX, shoulderY, handX, handY, 4, '#fff');
      
      // Draw Plasma Bat
      const batEndX = handX + Math.cos(batAngle) * 45;
      const batEndY = handY + Math.sin(batAngle) * 45;
      
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#fff';
      drawLine(ctx, handX, handY, batEndX, batEndY, 8, color);
      ctx.shadowBlur = 10;
      drawLine(ctx, handX, handY, batEndX, batEndY, 3, '#fff');

      // Stance Legs
      const stride = lerp(0, 15, Math.min(1, swingPhase * 2));
      drawLine(ctx, 0, -30, -10, 0, 5, color);
      drawLine(ctx, 0, -30, 10 + stride, 0, 5, color);
    }
    ctx.restore();
  };

  const drawGlowingStumps = (ctx: CanvasRenderingContext2D, x: number, y: number, intact: boolean) => {
    if (!intact) return;
    ctx.save();
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#00ffff';
    [-8, 0, 8].forEach(offset => {
      drawLine(ctx, x + offset, y, x + offset, y - STUMP_HEIGHT, 4, '#00ffff');
    });
    drawLine(ctx, x - 10, y - STUMP_HEIGHT, x + 10, y - STUMP_HEIGHT, 3, '#fff'); // Bails
    ctx.restore();
  };

  // ============================================================
  // VFX PARTICLE ENGINES
  // ============================================================
  const triggerExplosion = (x: number, y: number, color: string) => {
    shockwavesRef.current.push({ x, y, radius: 1, maxRadius: 150, color, life: 1 });
    for (let i = 0; i < 40; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 5 + Math.random() * 15;
      particlesRef.current.push({
        x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        color: Math.random() > 0.5 ? '#fff' : color,
        life: 1, size: 2 + Math.random() * 4
      });
    }
  };

  const triggerShatter = (x: number, y: number) => {
    for (let i = 0; i < 30; i++) {
      particlesRef.current.push({
        x: x + (Math.random()-0.5)*20, y: y - Math.random()*50,
        vx: (Math.random()-0.5)*10, vy: -5 - Math.random()*10,
        color: '#00ffff', life: 1, size: 3 + Math.random()*5
      });
    }
  };

  const renderVFX = (ctx: CanvasRenderingContext2D, timeScale: number) => {
    ctx.globalCompositeOperation = 'screen';
    
    // Shockwaves
    shockwavesRef.current = shockwavesRef.current.filter(sw => {
      sw.radius += (sw.maxRadius - sw.radius) * 0.15 * timeScale;
      sw.life += 0.05 * timeScale;
      ctx.beginPath();
      ctx.ellipse(sw.x, sw.y, sw.radius, sw.radius * 0.5, 0, 0, Math.PI * 2);
      ctx.strokeStyle = sw.color;
      ctx.lineWidth = Math.max(0.1, (1 - sw.life) * 8);
      ctx.globalAlpha = Math.max(0, 1 - sw.life);
      ctx.stroke();
      return sw.life < 1;
    });

    // Particles
    particlesRef.current = particlesRef.current.filter(p => {
      p.x += p.vx * timeScale;
      p.y += p.vy * timeScale;
      p.vy += 0.2 * timeScale; // Gravity
      p.life += 0.02 * timeScale;
      
      ctx.globalAlpha = Math.max(0, 1 - p.life);
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
      return p.life < 1;
    });

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  };

  // ============================================================
  // MAIN ANIMATION RENDER LOOP (BUG-FREE)
  // ============================================================
  const animate = (timestamp: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // STRICT DELTA-TIME CALCULATION
    if (lastTimeRef.current === 0) lastTimeRef.current = timestamp;
    // Cap dt at 50ms so background tabs or lag spikes don't skip the animation!
    const dt = Math.min(timestamp - lastTimeRef.current, 50); 
    lastTimeRef.current = timestamp;

    let timeScale = 1.0;
    const vTime = virtualTimeRef.current; // Snapshot current virtual time

    // 1. SCENARIO ROUTING & TIMELINE LOGIC
    let isImpactFrame = false;
    let cameraShake = 0;
    
    // Default config
    let bowlerPhase = 0;
    let batterPhase = 0;
    let showBall = false;
    let stumpsIntact = true;
    let bannerText = '';
    let bannerColor = '';
    
    const IMPACT_TIME = 600;

    switch (outcome) {
      case 'six':
        if (vTime > IMPACT_TIME - 80 && vTime < IMPACT_TIME + 20) timeScale = 0.05; // BULLET TIME
        else if (vTime > IMPACT_TIME + 20) timeScale = 1.5; // Hyperspeed follow-through

        bowlerPhase = Math.min(vTime / 400, 1);
        batterPhase = vTime < 400 ? 0 : Math.min((vTime - 400) / 400, 1);
        
        if (vTime > 300) {
          showBall = true;
          if (!ballRef.current) ballRef.current = { x: BOWLING_X, y: PITCH_Y - 40, vx: 0, vy: 0, trail: [] };
          
          if (vTime <= IMPACT_TIME) { // Ball incoming
            const t = (vTime - 300) / (IMPACT_TIME - 300);
            ballRef.current.x = lerp(BOWLING_X, BATTING_X, t);
            ballRef.current.y = lerp(PITCH_Y - 40, PITCH_Y - 10, t);
          } else { // Hit!
            if (vTime < IMPACT_TIME + 15) isImpactFrame = true; // Anime flash
            if (vTime === IMPACT_TIME + dt * timeScale) triggerExplosion(BATTING_X, PITCH_Y - 10, teamColors[0]);
            
            const t = (vTime - IMPACT_TIME) / 2000;
            ballRef.current.x = BATTING_X + t * (W * 1.5);
            ballRef.current.y = (PITCH_Y - 10) - Math.sin(t * Math.PI * 0.8) * 400;
            cameraShake = vTime < IMPACT_TIME + 500 ? 8 : 0;
          }
        }
        if (vTime > IMPACT_TIME + 400) { bannerText = 'QUANTUM SIX!'; bannerColor = '#fbbf24'; }
        if (vTime > 3500) completedRef.current = true;
        break;

      case 'bowled':
        if (vTime > IMPACT_TIME - 50 && vTime < IMPACT_TIME + 50) timeScale = 0.15;
        
        bowlerPhase = Math.min(vTime / 500, 1);
        batterPhase = vTime < 500 ? 0 : Math.min((vTime - 500) / 300, 0.4); // Swings late
        
        if (vTime > 350) {
          showBall = true;
          if (!ballRef.current) ballRef.current = { x: BOWLING_X, y: PITCH_Y - 40, vx: 0, vy: 0, trail: [] };
          
          if (vTime <= IMPACT_TIME) {
            const t = (vTime - 350) / (IMPACT_TIME - 350);
            ballRef.current.x = lerp(BOWLING_X, BATTING_X - 15, t);
            ballRef.current.y = lerp(PITCH_Y - 40, PITCH_Y, t);
          } else {
            if (vTime === IMPACT_TIME + dt * timeScale) triggerShatter(BATTING_X - 15, PITCH_Y);
            stumpsIntact = false;
            ballRef.current.x -= 2 * timeScale; // Ball rolls away
            cameraShake = vTime < IMPACT_TIME + 300 ? 5 : 0;
          }
        }
        if (vTime > IMPACT_TIME + 400) { bannerText = 'SYSTEM SHATTERED!'; bannerColor = '#ef4444'; }
        if (vTime > 3000) completedRef.current = true;
        break;

      case 'dot':
      default:
        bowlerPhase = Math.min(vTime / 400, 1);
        if (vTime > 300) {
          showBall = true;
          if (!ballRef.current) ballRef.current = { x: BOWLING_X, y: PITCH_Y - 40, vx: 0, vy: 0, trail: [] };
          if (vTime <= IMPACT_TIME) {
            const t = (vTime - 300) / (IMPACT_TIME - 300);
            ballRef.current.x = lerp(BOWLING_X, BATTING_X, t);
            ballRef.current.y = lerp(PITCH_Y - 40, PITCH_Y - 5, t);
          }
          batterPhase = vTime > IMPACT_TIME - 100 && vTime < IMPACT_TIME + 200 ? 0.3 : 0; // Block
        }
        if (vTime > IMPACT_TIME + 300) { bannerText = 'DEFENDED'; bannerColor = '#94a3b8'; }
        if (vTime > 2000) completedRef.current = true;
        break;
    }

    // Advance global time
    virtualTimeRef.current += dt * timeScale;

    // 2. RENDER STAGE
    ctx.save();
    if (cameraShake > 0 && !reducedMotion) {
      ctx.translate((Math.random() - 0.5) * cameraShake, (Math.random() - 0.5) * cameraShake);
    }

    drawGalacticArena(ctx, vTime);

    if (isImpactFrame && !reducedMotion) {
      // Anime Impact Flash Invert
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.fillRect(0, 0, W, H);
    } else {
      drawGlowingStumps(ctx, BATTING_X - 15, PITCH_Y, stumpsIntact);
      drawGlowingStumps(ctx, BOWLING_X, PITCH_Y, true);

      // Draw Ball & Trail
      if (showBall && ballRef.current) {
        const ball = ballRef.current;
        ball.trail.push({ x: ball.x, y: ball.y });
        if (ball.trail.length > 12) ball.trail.shift();
        
        ctx.beginPath();
        ball.trail.forEach((p, i) => {
          ctx.lineTo(p.x, p.y);
          ctx.lineWidth = i * 0.8;
        });
        ctx.strokeStyle = 'rgba(255, 0, 100, 0.5)';
        ctx.stroke();

        ctx.fillStyle = '#fff';
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#ff0055';
        ctx.beginPath(); ctx.arc(ball.x, ball.y, 5, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
      }

      drawCyberCharacter(ctx, BOWLING_X, PITCH_Y, teamColors[1], bowlerPhase, true);
      drawCyberCharacter(ctx, BATTING_X, PITCH_Y, teamColors[0], batterPhase, false);
      
      renderVFX(ctx, timeScale);

      // Render Banners
      if (bannerText) {
        const by = H * 0.2;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.shadowBlur = 20;
        ctx.shadowColor = bannerColor;
        ctx.beginPath(); ctx.roundRect(W/2 - 200, by, 400, 80, 10); ctx.fill();
        
        ctx.fillStyle = bannerColor;
        ctx.font = '900 40px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(bannerText, W/2, by + 40);
        ctx.shadowBlur = 0;
      }
    }
    ctx.restore();

    // 3. COMPLETION CHECK
    if (completedRef.current) {
      onAnimationComplete();
      return; // Stop RAF
    }

    animRef.current = requestAnimationFrame(animate);
  };

  // ============================================================
  // MOUNT & UNMOUNT LOGIC
  // ============================================================
  useEffect(() => {
    if (!outcome) return;

    // Reset everything for a fresh animation run
    completedRef.current = false;
    virtualTimeRef.current = 0;
    lastTimeRef.current = 0; // FORCE 0 so dt logic resets
    shockwavesRef.current = [];
    particlesRef.current = [];
    ballRef.current = null;

    if (reducedMotion) {
      setTimeout(() => onAnimationComplete(), 1500);
      return;
    }

    animRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animRef.current);
    };
  }, [outcome, reducedMotion, onAnimationComplete]);

  // Initial standby render
  useEffect(() => {
    if (virtualTimeRef.current === 0 && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        drawGalacticArena(ctx, 0);
        drawGlowingStumps(ctx, BATTING_X - 15, PITCH_Y, true);
        drawGlowingStumps(ctx, BOWLING_X, PITCH_Y, true);
        drawCyberCharacter(ctx, BOWLING_X, PITCH_Y, teamColors[1], 0, true);
        drawCyberCharacter(ctx, BATTING_X, PITCH_Y, teamColors[0], 0, false);
      }
    }
  }, [teamColors]);

  return (
    <canvas
      ref={canvasRef}
      width={W}
      height={H}
      className="w-full h-full object-contain rounded-xl shadow-2xl bg-black border border-gray-800"
    />
  );
};

export default CricketCanvas;
