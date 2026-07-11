// ============================================================
// Grammar Cricket - Enhanced Cricket Animation Canvas
// Premium vector-style graphics using pure HTML5 Canvas
// ============================================================
import React, { useRef, useEffect, useCallback } from 'react';
import { CricketOutcome } from '../engine/GameState'; // Ensure path matches your project

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
  type: 'spark' | 'dust' | 'flare' | 'shockwave';
  alphaDecay?: number;
}

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  trail: Array<{ x: number; y: number; alpha: number; size: number }>;
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
  
  // Adjusted stump proportions for realism
  const STUMP_HEIGHT = 65; 
  const STUMP_W = 4.5; 
  const STUMP_SPACING = 9;

  // Premium High-Contrast Palette
  const COLORS = {
    skyTop: '#090b14',
    skyBottom: '#231b38',
    floodlight: 'rgba(220, 240, 255, 0.05)',
    grassDark: '#0c5227',
    grassLight: '#116e35',
    pitch: '#e6d3a1',
    pitchDark: '#a8925b',
    stump: '#fce38a',
    bail: '#f38181',
    ball: '#ff2e63',
    bat: '#ffb900',
    batHandle: '#1a1a2e',
    pad: '#f1f5f9',
    goldGlow: 'rgba(251, 191, 36, 0.8)'
  };

  // ============================================================
  // ENVIRONMENT DRAWING
  // ============================================================
  const drawField = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number, elapsed: number) => {
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.5);
    skyGrad.addColorStop(0, COLORS.skyTop);
    skyGrad.addColorStop(1, COLORS.skyBottom);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h * 0.5);

    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    for (let i = 0; i < 30; i++) {
      const sx = ((i * 127) + elapsed * 0.01) % w;
      const sy = (i * 53) % (h * 0.4);
      const size = Math.abs(Math.sin(elapsed / 1000 + i)) * 1.5;
      ctx.beginPath();
      ctx.arc(sx, sy, size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const drawLightBeam = (x1: number, x2: number, x3: number, x4: number) => {
      const beamGrad = ctx.createLinearGradient(0, 0, 0, h * 0.5);
      beamGrad.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
      beamGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = beamGrad;
      ctx.beginPath();
      ctx.moveTo(x1, 0); ctx.lineTo(x2, h * 0.6); ctx.lineTo(x3, h * 0.6); ctx.lineTo(x4, 0);
      ctx.fill();
    };
    drawLightBeam(w * 0.05, -w * 0.2, w * 0.4, w * 0.2);
    drawLightBeam(w * 0.95, w * 0.6, w * 1.2, w * 0.8);
    ctx.restore();

    const standsGrad = ctx.createLinearGradient(0, h * 0.3, 0, h * 0.5);
    standsGrad.addColorStop(0, '#020617');
    standsGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = standsGrad;
    ctx.beginPath();
    ctx.ellipse(w / 2, h * 0.48, w * 0.65, h * 0.18, 0, Math.PI, 0);
    ctx.fill();
    drawCrowd(ctx, w, h, elapsed);

    for (let row = 0; row < 10; row++) {
      for (let col = 0; col < 20; col++) {
        ctx.fillStyle = (row + col) % 2 === 0 ? COLORS.grassDark : COLORS.grassLight;
        const tileW = (w / 15) + (row * 3);
        const tileH = (h * 0.5) / 10;
        const tx = col * tileW - (w * 0.2) - (row * 15);
        const ty = h * 0.5 + (row * tileH);
        ctx.fillRect(tx, ty, tileW * 2, tileH + 1);
      }
    }

    const grassVignette = ctx.createRadialGradient(w/2, PITCH_Y, 0, w/2, PITCH_Y, w * 0.6);
    grassVignette.addColorStop(0, 'rgba(0,0,0,0)');
    grassVignette.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = grassVignette;
    ctx.fillRect(0, h * 0.5, w, h * 0.5);

    const pitchW = 90;
    const pitchH = 150;
    const pitchX = w / 2 - pitchW / 2;
    const pitchYTop = PITCH_Y - pitchH / 2;
    
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(w / 2, PITCH_Y, pitchW * 0.55, pitchH * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();

    const pitchGrad = ctx.createLinearGradient(pitchX, pitchYTop, pitchX + pitchW, pitchYTop);
    pitchGrad.addColorStop(0, '#7c6533');
    pitchGrad.addColorStop(0.1, COLORS.pitchDark);
    pitchGrad.addColorStop(0.5, COLORS.pitch);
    pitchGrad.addColorStop(0.9, COLORS.pitchDark);
    pitchGrad.addColorStop(1, '#7c6533');
    ctx.fillStyle = pitchGrad;
    ctx.beginPath();
    ctx.roundRect(pitchX, pitchYTop, pitchW, pitchH, 8);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = 3;
    ctx.shadowColor = 'rgba(255, 255, 255, 0.6)';
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.moveTo(pitchX - 15, pitchYTop + 22); ctx.lineTo(pitchX + pitchW + 15, pitchYTop + 22);
    ctx.moveTo(pitchX - 15, pitchYTop + pitchH - 22); ctx.lineTo(pitchX + pitchW + 15, pitchYTop + pitchH - 22);
    ctx.moveTo(pitchX + 12, pitchYTop); ctx.lineTo(pitchX + 12, pitchYTop + 28);
    ctx.moveTo(pitchX + pitchW - 12, pitchYTop); ctx.lineTo(pitchX + pitchW - 12, pitchYTop + 28);
    ctx.stroke();
    ctx.shadowBlur = 0; 
  }, [PITCH_Y]);

  function drawCrowd(ctx: CanvasRenderingContext2D, w: number, h: number, elapsed: number) {
    const crowdColors = ['#f43f5e', '#3b82f6', '#fbbf24', '#10b981', '#a855f7', '#ffffff'];
    ctx.save();
    for (let tier = 0; tier < 4; tier++) {
      const tierY = h * 0.46 - tier * 12;
      for (let i = 0; i < 70; i++) {
        const x = (w / 70) * i;
        const wave = Math.sin(elapsed / 150 + x * 0.08) * (tier * 1.5 + 2);
        const y = tierY - Math.sin((i / 70) * Math.PI) * 15 + wave;
        
        ctx.fillStyle = crowdColors[(i + tier * 3) % crowdColors.length];
        ctx.globalAlpha = 0.8;
        ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
        if (Math.random() > 0.995) {
          ctx.fillStyle = '#ffffff';
          ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill();
        }
      }
    }
    ctx.restore();
  }

  // ============================================================
  // REFINED CHARACTER & EQUIPMENT DRAWING
  // ============================================================
  function drawStumps(ctx: CanvasRenderingContext2D, cx: number, y: number, intact: boolean = true) {
    const stumpsX = [cx - STUMP_SPACING, cx, cx + STUMP_SPACING];
    
    // Stump shadow
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath(); ctx.ellipse(cx + 4, y + 2, STUMP_SPACING * 2, 4, 0, 0, Math.PI * 2); ctx.fill();

    stumpsX.forEach(sx => {
      const grad = ctx.createLinearGradient(sx - STUMP_W/2, 0, sx + STUMP_W/2, 0);
      grad.addColorStop(0, '#b45309');
      grad.addColorStop(0.4, COLORS.stump);
      grad.addColorStop(0.8, '#fef08a');
      grad.addColorStop(1, '#92400e');
      ctx.fillStyle = grad;
      
      // Draw pointed stump
      ctx.beginPath();
      ctx.moveTo(sx - STUMP_W / 2, y);
      ctx.lineTo(sx - STUMP_W / 2, y - STUMP_HEIGHT + 4);
      ctx.lineTo(sx, y - STUMP_HEIGHT); // Point
      ctx.lineTo(sx + STUMP_W / 2, y - STUMP_HEIGHT + 4);
      ctx.lineTo(sx + STUMP_W / 2, y);
      ctx.closePath();
      ctx.fill();
    });

    if (intact) {
      // Improved Bails (Resting in the grooves)
      ctx.fillStyle = COLORS.bail;
      ctx.shadowColor = 'rgba(0,0,0,0.4)';
      ctx.shadowBlur = 2;
      
      const drawBail = (bx: number) => {
        ctx.beginPath();
        // Spigots (ends) and barrel (middle)
        ctx.roundRect(bx - 1, y - STUMP_HEIGHT - 3, STUMP_SPACING + 2, 4, 2);
        ctx.fill();
      };
      drawBail(cx - STUMP_SPACING);
      drawBail(cx);
      
      ctx.shadowBlur = 0;
    }
  }

  function drawBatsman(ctx: CanvasRenderingContext2D, x: number, y: number, swingAngle: number = 0, color: string) {
    ctx.save();
    ctx.translate(x, y);

    // Hard drop shadow
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath(); ctx.ellipse(0, 4, 18, 6, 0, 0, Math.PI * 2); ctx.fill();

    const drawShadedRect = (rx: number, ry: number, rw: number, rh: number, baseColor: string, radius: number) => {
      const grad = ctx.createLinearGradient(rx, 0, rx + rw, 0);
      grad.addColorStop(0, '#0f172a'); grad.addColorStop(0.5, baseColor); grad.addColorStop(0.9, '#ffffff'); grad.addColorStop(1, baseColor);
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.roundRect(rx, ry, rw, rh, radius); ctx.fill();
    }

    // Back Leg (Darker, recedes in perspective)
    ctx.fillStyle = '#475569'; ctx.fillRect(-10, -28, 7, 28); // Thigh/Knee
    drawShadedRect(-12, -30, 10, 24, '#cbd5e1', 3); // Back Pad

    // Torso (Angled stance)
    const jerseyGrad = ctx.createLinearGradient(-12, 0, 12, 0);
    jerseyGrad.addColorStop(0, '#020617'); jerseyGrad.addColorStop(0.4, color); jerseyGrad.addColorStop(0.85, color); jerseyGrad.addColorStop(1, '#ffffff');
    ctx.fillStyle = jerseyGrad;
    ctx.beginPath(); 
    // Hips to shoulders taper
    ctx.moveTo(-12, -26); ctx.lineTo(10, -26); ctx.lineTo(14, -54); ctx.lineTo(-14, -54);
    ctx.closePath(); ctx.fill();

    // Front Leg (Lighter, brings it forward)
    ctx.fillStyle = '#64748b'; ctx.fillRect(4, -28, 8, 28);
    drawShadedRect(2, -32, 12, 26, COLORS.pad, 4); // Front pad

    // Improved Helmet
    const helmetGrad = ctx.createLinearGradient(-13, -68, 5, -55);
    helmetGrad.addColorStop(0, '#0f172a'); helmetGrad.addColorStop(0.5, color); helmetGrad.addColorStop(1, '#94a3b8');
    ctx.fillStyle = helmetGrad;
    
    ctx.beginPath(); // Dome
    ctx.arc(0, -60, 11, Math.PI, 0); 
    ctx.fill();
    
    ctx.beginPath(); // Peak (Visor) and back shell
    ctx.moveTo(-13, -60);
    ctx.lineTo(14, -60); // Extended front peak
    ctx.lineTo(10, -53);
    ctx.lineTo(-13, -53);
    ctx.closePath();
    ctx.fill();
    
    // Face & Grille
    ctx.fillStyle = '#fca5a5';
    ctx.beginPath(); ctx.arc(-2, -55, 6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-2, -58); ctx.lineTo(8, -58); ctx.moveTo(-2, -54); ctx.lineTo(8, -54); ctx.stroke();

    // Bat & Arms
    ctx.save();
    ctx.translate(2, -45); // Accurate shoulder pivot
    ctx.rotate(swingAngle);
    
    // Front Arm (tapered)
    ctx.fillStyle = '#fca5a5';
    ctx.beginPath(); ctx.moveTo(-3, 0); ctx.lineTo(3, 0); ctx.lineTo(2, 20); ctx.lineTo(-2, 20); ctx.fill();
    
    // Gloves
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(0, 20, 6, 0, Math.PI * 2); ctx.fill();
    
    // Improved Bat Silhouette
    ctx.save();
    ctx.translate(0, 16); // Pivot at hands
    
    // Handle
    ctx.fillStyle = COLORS.batHandle;
    ctx.fillRect(-2, 0, 4, 16);
    
    // Blade (Tapered top, widened middle, curved toe)
    const batGrad = ctx.createLinearGradient(-6, 16, 6, 16);
    batGrad.addColorStop(0, '#b45309'); batGrad.addColorStop(0.4, '#fde047'); batGrad.addColorStop(0.8, '#fef08a'); batGrad.addColorStop(1, '#78350f');
    ctx.fillStyle = batGrad;
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 4;
    
    ctx.beginPath();
    ctx.moveTo(-4, 16); // Shoulder of bat
    ctx.lineTo(4, 16);
    ctx.lineTo(6, 48); // Sweet spot / widened base
    ctx.arc(0, 48, 6, 0, Math.PI); // Rounded toe
    ctx.lineTo(-6, 48);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    
    ctx.restore();
    ctx.restore();
    ctx.restore();
  }

  function drawBowler(ctx: CanvasRenderingContext2D, x: number, y: number, runUpProgress: number = 0, color: string) {
    ctx.save();
    ctx.translate(x - runUpProgress * 40, y);
    ctx.scale(-1, 1); 

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath(); ctx.ellipse(0, 4, 18, 5, 0, 0, Math.PI * 2); ctx.fill();

    // Athletic Stride Mechanics
    // Increased amplitude for a running look rather than walking
    const legAngle = Math.sin(runUpProgress * Math.PI * 8) * 0.8; 
    
    const drawLimb = (lx: number, ly: number, lw: number, lh: number, baseColor: string) => {
      const grad = ctx.createLinearGradient(lx, 0, lx + lw, 0);
      grad.addColorStop(0, '#0f172a'); grad.addColorStop(0.5, baseColor); grad.addColorStop(1, '#ffffff');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.roundRect(lx, ly, lw, lh, 3); ctx.fill();
    };
    
    // Back leg (Bent slightly at knee illusion)
    ctx.save(); 
    ctx.translate(0, -25); // Pivot from hip
    ctx.rotate(legAngle);
    drawLimb(-4, 0, 8, 25, '#cbd5e1'); // Trousers
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.roundRect(-6, 23, 13, 6, 2); ctx.fill(); // Shoe
    ctx.restore();

    // Front leg
    ctx.save(); 
    ctx.translate(0, -25);
    ctx.rotate(-legAngle);
    drawLimb(-4, 0, 8, 25, '#94a3b8');
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.roundRect(-6, 23, 13, 6, 2); ctx.fill();
    ctx.restore();

    // Torso (leaning slightly forward into the run)
    ctx.save();
    ctx.rotate(0.1); 
    const jerseyGrad = ctx.createLinearGradient(-10, 0, 10, 0);
    jerseyGrad.addColorStop(0, '#020617'); jerseyGrad.addColorStop(0.5, color); jerseyGrad.addColorStop(1, '#ffffff');
    ctx.fillStyle = jerseyGrad;
    ctx.beginPath(); 
    ctx.moveTo(-9, -25); ctx.lineTo(9, -25); ctx.lineTo(11, -52); ctx.lineTo(-11, -52);
    ctx.closePath(); ctx.fill();
    
    // Head & Cap
    ctx.fillStyle = '#fca5a5';
    ctx.beginPath(); ctx.arc(0, -58, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(0, -60, 8, Math.PI, 0); ctx.fill(); 
    ctx.fillRect(3, -62, 10, 3); // Cap brim pointing forward
    
    // Bowling Arm (Dynamic rotation)
    // Smooth delivery arc over the top
    let armAngle = -0.5;
    if (runUpProgress > 0.7) {
      armAngle = -0.5 + ((runUpProgress - 0.7) / 0.3) * Math.PI * 2;
    } else {
       // Pumping arm during runup
       armAngle = -legAngle * 1.5; 
    }
    
    ctx.save();
    ctx.translate(0, -48); // Shoulder
    ctx.rotate(armAngle);
    drawLimb(-3, 0, 6, 22, '#fca5a5');
    ctx.restore();

    ctx.restore(); // Restore torso lean
    ctx.restore(); // Restore bowler translation
  }

  function drawBall(ctx: CanvasRenderingContext2D, ball: Ball) {
    if (ball.trail.length > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      for (let i = 0; i < ball.trail.length; i++) {
        const point = ball.trail[i];
        ctx.beginPath();
        ctx.arc(point.x, point.y, point.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 50, 100, ${point.alpha * 0.5})`;
        ctx.fill();
      }
      ctx.restore();
    }

    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath(); ctx.ellipse(ball.x + 4, ball.y + 5, ball.radius * 1.2, ball.radius * 0.6, 0, 0, Math.PI * 2); ctx.fill();

    ctx.save();
    ctx.translate(ball.x, ball.y);
    ctx.rotate(ball.rotation);
    
    const grad = ctx.createRadialGradient(-2, -2, 1, 0, 0, ball.radius);
    grad.addColorStop(0, '#ffffff'); 
    grad.addColorStop(0.2, '#ff4d6d');
    grad.addColorStop(0.6, COLORS.ball);
    grad.addColorStop(1, '#590d22'); 
    
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(0, 0, ball.radius, 0, Math.PI * 2); ctx.fill();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([2, 2]); 
    ctx.beginPath();
    ctx.ellipse(0, 0, ball.radius * 0.3, ball.radius * 0.9, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    
    ctx.restore();
  }

  // ============================================================
  // VFX (PARTICLES, SHOCKWAVES & BLOOM)
  // ============================================================
  function spawnFireworks(x: number, y: number, count: number = 40) {
    const colors = ['#fef08a', '#38bdf8', '#4ade80', '#fb923c', '#e879f9', '#ffffff'];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 4 + Math.random() * 8;
      particlesRef.current.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 120, maxLife: 120,
        size: 3 + Math.random() * 4,
        gravity: 0.12,
        type: 'spark'
      });
    }
  }

  function spawnDust(x: number, y: number) {
    for (let i = 0; i < 12; i++) {
      particlesRef.current.push({
        x: x + (Math.random() - 0.5) * 15,
        y: y + (Math.random() - 0.5) * 8,
        vx: (Math.random() - 0.5) * 3,
        vy: -Math.random() * 3,
        color: '#bfa87a',
        life: 40, maxLife: 40,
        size: 8 + Math.random() * 12,
        gravity: 0,
        type: 'dust'
      });
    }
  }

  function spawnImpactFlare(x: number, y: number) {
    particlesRef.current.push({
      x, y, vx: 0, vy: 0,
      color: '#ffffff',
      life: 20, maxLife: 20,
      size: 50, gravity: 0, type: 'flare'
    });
    particlesRef.current.push({
      x, y, vx: 0, vy: 0,
      color: '#fbbf24',
      life: 25, maxLife: 25,
      size: 10, gravity: 0, type: 'shockwave'
    });
  }

  function updateAndDrawParticles(ctx: CanvasRenderingContext2D) {
    particlesRef.current = particlesRef.current.filter(p => {
      p.life--;
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.vx *= 0.95; 

      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.save();
      
      if (p.type === 'spark') {
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 15; 
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2); ctx.fill();
      } else if (p.type === 'dust') {
        ctx.globalAlpha = alpha * 0.5;
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2); ctx.fill();
      } else if (p.type === 'flare') {
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = alpha;
        const flareGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * alpha);
        flareGrad.addColorStop(0, 'rgba(255, 255, 255, 1)');
        flareGrad.addColorStop(0.3, 'rgba(253, 224, 71, 0.9)');
        flareGrad.addColorStop(1, 'rgba(253, 224, 71, 0)');
        ctx.fillStyle = flareGrad;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2); ctx.fill();
      } else if (p.type === 'shockwave') {
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 4 * alpha;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size + (p.maxLife - p.life) * 4, 0, Math.PI * 2); ctx.stroke();
      }
      
      ctx.restore();
      return p.life > 0;
    });
  }

  function spawnBails(cx: number, y: number) {
    bailsRef.current = [
      { x: cx - STUMP_SPACING, y: y - STUMP_HEIGHT, vx: -4 - Math.random()*4, vy: -8 - Math.random()*5, angle: 0, spin: 0.3 + Math.random()*0.4 },
      { x: cx + STUMP_SPACING, y: y - STUMP_HEIGHT, vx: 4 + Math.random()*4, vy: -7 - Math.random()*5, angle: 0, spin: -(0.3 + Math.random()*0.4) }
    ];
  }

  function updateAndDrawBails(ctx: CanvasRenderingContext2D) {
    bailsRef.current = bailsRef.current.filter(b => {
      b.x += b.vx;
      b.y += b.vy;
      b.vy += 0.5; 
      b.angle += b.spin;
      
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.angle);
      
      const bailGrad = ctx.createLinearGradient(-8, -2, 8, 2);
      bailGrad.addColorStop(0, '#78350f'); bailGrad.addColorStop(0.5, COLORS.bail); bailGrad.addColorStop(1, '#fde047');
      ctx.fillStyle = bailGrad;
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 3;
      ctx.beginPath(); ctx.roundRect(-8, -2, 16, 4, 2); ctx.fill();
      ctx.restore();
      
      return b.y < CANVAS_H + 50;
    });
  }

  function drawBanner(ctx: CanvasRenderingContext2D, text: string, subtext: string, w: number, h: number, color: string, alpha: number) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, alpha);
    const bw = 550;
    const bh = 110;
    const bx = w / 2 - bw / 2;
    const by = h * 0.15;
    
    ctx.fillStyle = 'rgba(10, 15, 30, 0.85)';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 10;
    ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 20); ctx.fill();
    ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.shadowColor = color;
    ctx.shadowBlur = 15;
    ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 20); ctx.stroke();
    
    const innerGrad = ctx.createLinearGradient(bx, by, bx, by + bh * 0.4);
    innerGrad.addColorStop(0, 'rgba(255,255,255,0.15)');
    innerGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = innerGrad;
    ctx.fill();

    ctx.font = `900 52px 'Montserrat', 'Arial Black', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#000';
    ctx.strokeText(text, w / 2, by + bh * 0.42);
    
    const textGrad = ctx.createLinearGradient(0, by, 0, by + bh);
    textGrad.addColorStop(0, '#ffffff');
    textGrad.addColorStop(0.5, color);
    textGrad.addColorStop(1, '#000000');
    ctx.fillStyle = textGrad;
    ctx.shadowBlur = 20;
    ctx.fillText(text, w / 2, by + bh * 0.42);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = `700 22px 'Inter', 'Segoe UI', sans-serif`;
    ctx.shadowBlur = 0;
    ctx.fillText(subtext.toUpperCase(), w / 2, by + bh * 0.8);

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

    let shakeX = 0, shakeY = 0;
    if (shakeDecay > 0.1) {
      shakeX = (Math.random() - 0.5) * shakeDecay;
      shakeY = (Math.random() - 0.5) * shakeDecay;
      shakeDecay *= 0.88; 
    }

    ctx.save();
    ctx.translate(shakeX, shakeY);
    ctx.clearRect(-20, -20, w + 40, h + 40);

    drawField(ctx, w, h, elapsed);

    if (ballRef.current) {
      const ball = ballRef.current;
      ball.trail.push({ x: ball.x, y: ball.y, alpha: 1, size: ball.radius * 1.5 });
      if (ball.trail.length > 15) ball.trail.shift(); 
      ball.trail.forEach((t, i) => {
        t.alpha = i / ball.trail.length;
        t.size = (i / ball.trail.length) * ball.radius * 1.5;
      });

      ball.x += ball.vx;
      ball.y += ball.vy;
      ball.vy += 0.25; 
      ball.rotation += ball.vx * 0.08;

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
  // OUTCOME SEQUENCES
  // ============================================================
  function renderSix(ctx: CanvasRenderingContext2D, w: number, h: number, elapsed: number) {
    const phase1 = Math.min(elapsed / 500, 1);
    const phase2 = Math.max(0, (elapsed - 300) / 4200);

    drawBowler(ctx, BOWLING_X, PITCH_Y, 1.0, teamColors[1]);

    if (phase2 > 0 && ballRef.current) {
      const bx = BATTING_X + phase2 * (w * 0.9);
      const arc = -Math.sin(phase2 * Math.PI) * h * 0.7;
      ballRef.current.x = bx;
      ballRef.current.y = PITCH_Y + arc;
      ballRef.current.bounced = false; 
      drawBall(ctx, ballRef.current);
      
      if (phase2 > 0.7 && elapsed % 120 < 20) {
        spawnFireworks(bx, ballRef.current.y, 8);
      }
    }

    const swingAngle = phase1 < 0.5 ? phase1 * -1.8 : (1 - phase1) * -0.8;
    drawBatsman(ctx, BATTING_X, PITCH_Y, swingAngle, teamColors[0]);

    if (elapsed > 280 && !hasHitRef.current) {
      spawnImpactFlare(BATTING_X + 20, PITCH_Y - 25);
      startShake(12); 
      hasHitRef.current = true;
    }

    if (elapsed > 1000 && elapsed < 3500 && elapsed % 250 < 20) {
      spawnFireworks(w * 0.1 + Math.random() * w * 0.8, h * 0.05 + Math.random() * h * 0.35, 40);
    }

    if (elapsed > 500) {
      drawBanner(ctx, 'SIX!', 'Massive Hit Into The Stands!', w, h, '#fbbf24', Math.min(1, (elapsed - 500) / 300));
    }
  }

  function renderFour(ctx: CanvasRenderingContext2D, w: number, h: number, elapsed: number) {
    drawBowler(ctx, BOWLING_X, PITCH_Y, 1.0, teamColors[1]);
    
    if (elapsed > 250 && ballRef.current) {
      ballRef.current.x = BATTING_X + ((elapsed - 250) / 2000) * w;
      ballRef.current.y = PITCH_Y - Math.abs(Math.sin(elapsed / 80) * 12);
      ballRef.current.bounced = true;
      drawBall(ctx, ballRef.current);
    }

    const phase1 = Math.min(elapsed / 400, 1);
    drawBatsman(ctx, BATTING_X, PITCH_Y, phase1 < 0.5 ? phase1 * -1.2 : (1 - phase1) * -0.4, teamColors[0]);

    if (elapsed > 250 && !hasHitRef.current) {
      spawnImpactFlare(BATTING_X + 18, PITCH_Y - 15);
      startShake(7);
      hasHitRef.current = true;
    }

    if (elapsed > 400) {
      drawBanner(ctx, 'FOUR!', 'Pierces The Gap!', w, h, '#10b981', Math.min(1, (elapsed - 400) / 300));
    }
  }

  function renderThreeRuns(ctx: CanvasRenderingContext2D, w: number, h: number, elapsed: number) {
    drawBowler(ctx, BOWLING_X, PITCH_Y, 1.0, teamColors[1]);
    if (elapsed > 300 && ballRef.current) {
      ballRef.current.x = BATTING_X + Math.min((elapsed - 300) / 800, 1) * w * 0.4;
      ballRef.current.y = PITCH_Y;
      drawBall(ctx, ballRef.current);
    }
    const runCycle = elapsed > 400 ? Math.sin(elapsed / 70) * 12 : 0;
    drawBatsman(ctx, BATTING_X + (elapsed > 400 ? ((elapsed - 400) % 300) * 0.12 : 0), PITCH_Y + runCycle, elapsed > 400 ? -0.4 : 0, teamColors[0]);
    if (elapsed > 500) drawBanner(ctx, '3 RUNS', 'Brilliant Running Between The Wickets!', w, h, '#38bdf8', Math.min(1, (elapsed - 500) / 300));
  }

  function renderTwoRuns(ctx: CanvasRenderingContext2D, w: number, h: number, elapsed: number) {
    drawBowler(ctx, BOWLING_X, PITCH_Y, 1.0, teamColors[1]);
    if (elapsed > 250 && ballRef.current) {
      ballRef.current.x = BATTING_X + Math.min((elapsed - 250) / 700, 1) * w * 0.3;
      ballRef.current.y = PITCH_Y;
      drawBall(ctx, ballRef.current);
    }
    drawBatsman(ctx, BATTING_X, PITCH_Y, elapsed < 400 ? -0.5 : 0, teamColors[0]);
    if (elapsed > 450) drawBanner(ctx, '2 RUNS', 'Comfortably Back For Two.', w, h, '#a855f7', Math.min(1, (elapsed - 450) / 300));
  }

  function renderOneRun(ctx: CanvasRenderingContext2D, w: number, h: number, elapsed: number) {
    drawBowler(ctx, BOWLING_X, PITCH_Y, 1.0, teamColors[1]);
    if (elapsed > 200 && ballRef.current) {
      ballRef.current.x = BATTING_X + Math.min((elapsed - 200) / 500, 1) * w * 0.2;
      ballRef.current.y = PITCH_Y;
      drawBall(ctx, ballRef.current);
    }
    drawBatsman(ctx, BATTING_X, PITCH_Y, elapsed < 350 ? -0.3 : 0, teamColors[0]);
    if (elapsed > 400) drawBanner(ctx, '1 RUN', 'Tapped Away For A Single.', w, h, '#cbd5e1', Math.min(1, (elapsed - 400) / 300));
  }

  function renderRunOut(ctx: CanvasRenderingContext2D, w: number, h: number, elapsed: number) {
    drawBowler(ctx, BOWLING_X, PITCH_Y, 1.0, teamColors[1]);
    const runProgress = elapsed > 600 ? Math.min((elapsed - 600) / 1400, 1) : 0;
    drawBatsman(ctx, BATTING_X + runProgress * 130, PITCH_Y, elapsed < 500 ? -0.8 : -0.3, teamColors[0]);

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
      drawStumps(ctx, w / 2 - 30, PITCH_Y, false);
      drawStumps(ctx, BOWLING_X, PITCH_Y, false);
      if (!hasHitRef.current) {
        spawnBails(BATTING_X, PITCH_Y);
        spawnDust(BOWLING_X, PITCH_Y);
        startShake(9);
        hasHitRef.current = true;
      }
    } else {
      drawStumps(ctx, w / 2 - 30, PITCH_Y, true);
      drawStumps(ctx, BOWLING_X, PITCH_Y, true);
    }

    if (elapsed > 400 && elapsed < 2500) drawBanner(ctx, '1 RUN', 'Pushing Hard For The Second...', w, h, '#94a3b8', 1);
    if (elapsed > 3000) drawBanner(ctx, 'RUN OUT!', 'Direct Hit Stuns The Crowd!', w, h, '#f43f5e', Math.min(1, (elapsed - 3000) / 200));
  }

  function renderBowled(ctx: CanvasRenderingContext2D, w: number, h: number, elapsed: number) {
    const delivery = Math.min(elapsed / 600, 1);
    drawBowler(ctx, BOWLING_X, PITCH_Y, delivery, teamColors[1]);

    if (elapsed < 750 && ballRef.current) {
      drawBall(ctx, ballRef.current); 
    }

    drawBatsman(ctx, BATTING_X, PITCH_Y, elapsed > 750 ? 0.4 : -0.2, teamColors[0]);

    if (elapsed > 750) {
      drawStumps(ctx, BATTING_X, PITCH_Y, false);
      if (!hasHitRef.current) {
        spawnBails(BATTING_X, PITCH_Y);
        spawnDust(BATTING_X, PITCH_Y);
        spawnImpactFlare(BATTING_X, PITCH_Y - 20); 
        startShake(14);
        hasHitRef.current = true;
      }
    } else {
      drawStumps(ctx, BATTING_X, PITCH_Y, true);
    }
    drawStumps(ctx, BOWLING_X, PITCH_Y, true);

    if (elapsed > 1000) drawBanner(ctx, 'BOWLED!', 'Cleaned Him Up!', w, h, '#f43f5e', Math.min(1, (elapsed - 1000) / 300));
  }

  function renderDot(ctx: CanvasRenderingContext2D, w: number, h: number, elapsed: number) {
    const delivery = Math.min(elapsed / 600, 1);
    drawBowler(ctx, BOWLING_X, PITCH_Y, delivery * 0.8, teamColors[1]);
    
    if (elapsed < 700 && ballRef.current) drawBall(ctx, ballRef.current);

    drawBatsman(ctx, BATTING_X, PITCH_Y, elapsed > 300 && elapsed < 700 ? 0.15 : 0, teamColors[0]);
    drawStumps(ctx, BATTING_X, PITCH_Y, true);
    drawStumps(ctx, BOWLING_X, PITCH_Y, true);

    if (elapsed > 800) drawBanner(ctx, 'DOT BALL', 'Solid Defensive Technique.', w, h, '#94a3b8', Math.min(1, (elapsed - 800) / 300));
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
      x: BOWLING_X - 12,
      y: PITCH_Y - 45,
      vx: -12.5,
      vy: 1.8,
      radius: 6.5,
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
      className="w-full h-full object-contain rounded-2xl shadow-2xl shadow-indigo-900/50 border border-slate-800"
      style={{ maxHeight: '100%', maxWidth: '100%', background: '#020617' }}
      aria-label="High fidelity cricket animation canvas"
    />
  );
};

export default CricketCanvas;
