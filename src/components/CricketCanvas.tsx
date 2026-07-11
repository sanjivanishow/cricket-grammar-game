// ============================================================
// Grammar Cricket - Cosmic Cyber-Spectacle Canvas
// Extreme vector graphics, slow-motion bullet time, and heavy VFX
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
  gravity: number;
  type: 'plasma' | 'shard' | 'stardust';
  angle?: number;
  spin?: number;
}

interface Shockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  life: number;
}

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  trail: Array<{ x: number; y: number; size: number }>;
}

const CricketCanvas: React.FC<CricketCanvasProps> = ({
  outcome,
  onAnimationComplete,
  reducedMotion = false,
  teamColors = ['#00ffcc', '#ff0055'], // Cyber defaults if not passed
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  
  // Custom Time-Dilation System Engine
  const lastTimeRef = useRef<number>(0);
  const virtualTimeRef = useRef<number>(0);
  const timeScaleRef = useRef<number>(1);
  
  const particlesRef = useRef<Particle[]>([]);
  const shockwavesRef = useRef<Shockwave[]>([]);
  const ballRef = useRef<Ball | null>(null);
  const bailsRef = useRef<Array<{ x: number; y: number; vx: number; vy: number; angle: number; spin: number }>>([]);
  
  const hasTriggeredImpactRef = useRef<boolean>(false);
  const completedRef = useRef<boolean>(false);

  const CANVAS_W = 800;
  const CANVAS_H = 480;
  const PITCH_Y = CANVAS_H * 0.68;
  const BATTING_X = CANVAS_W * 0.25;
  const BOWLING_X = CANVAS_W * 0.75;
  const STUMP_HEIGHT = 60;
  const STUMP_W = 5;
  const STUMP_SPACING = 10;

  // Hyper-Neon Palette
  const NET_COLORS = {
    spaceBg: '#05050f',
    gridLine: 'rgba(0, 255, 204, 0.08)',
    pitchLight: '#111827',
    stumpGlow: '#00ffcc',
    ballPlasma: '#ff0055',
    textGlow: '#00f0ff'
  };

  // ============================================================
  // PROCEDURAL VIRTUAL WORLD BACKGROUND
  // ============================================================
  const drawCyberWorld = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number, vTime: number) => {
    // 1. Deep Space Void
    ctx.fillStyle = NET_COLORS.spaceBg;
    ctx.fillRect(0, 0, w, h);

    // 2. Cosmic Nebula Glow
    const nebula = ctx.createRadialGradient(w/2, h*0.3, 10, w/2, h*0.3, w*0.6);
    nebula.addColorStop(0, 'rgba(76, 29, 149, 0.25)'); // Deep purple
    nebula.addColorStop(0.5, 'rgba(15, 23, 42, 0)');
    ctx.fillStyle = nebula;
    ctx.fillRect(0, 0, w, h);

    // 3. Cyber Grid Matrix (Perspective Simulation)
    ctx.strokeStyle = NET_COLORS.gridLine;
    ctx.lineWidth = 1.5;
    const horizonY = h * 0.45;
    
    // Vertical vanishing lines
    for (let i = -w; i <= w * 2; i += 40) {
      ctx.beginPath();
      ctx.moveTo(w / 2 + (i - w / 2) * 0.05, horizonY);
      ctx.lineTo(i, h);
      ctx.stroke();
    }
    // Horizontal pulsing grid lines
    for (let y = horizonY; y < h; y += 18) {
      const pulse = Math.sin(vTime * 0.005 + y * 0.1) * 0.3 + 0.7;
      ctx.strokeStyle = `rgba(0, 255, 204, ${0.04 * pulse})`;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // 4. Neon Boundary Ring
    ctx.save();
    ctx.shadowBlur = 15;
    ctx.shadowColor = teamColors[0];
    ctx.strokeStyle = `rgba(${hexToRgb(teamColors[0]).join(',')}, 0.3)`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(w / 2, h * 0.78, w * 0.46, h * 0.18, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // 5. The Light-Grid Pitch
    const pitchW = 90;
    const pitchH = 150;
    ctx.save();
    ctx.fillStyle = 'rgba(17, 24, 39, 0.85)';
    ctx.strokeStyle = teamColors[1];
    ctx.lineWidth = 2;
    ctx.shadowBlur = 20;
    ctx.shadowColor = teamColors[1];
    
    ctx.beginPath();
    ctx.moveTo(w/2 - pitchW/2, PITCH_Y - pitchH/2);
    ctx.lineTo(w/2 + pitchW/2, PITCH_Y - pitchH/2);
    ctx.lineTo(w/2 + pitchW*0.7, PITCH_Y + pitchH/2);
    ctx.lineTo(w/2 - pitchW*0.7, PITCH_Y + pitchH/2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

  }, [PITCH_Y, teamColors]);

  // ============================================================
  // CYBERNETIC ENTITY MODELS
  // ============================================================
  function drawCyberStumps(ctx: CanvasRenderingContext2D, cx: number, y: number, intact: boolean = true) {
    if (!intact) return;
    const stumpsX = [cx - STUMP_SPACING, cx, cx + STUMP_SPACING];
    
    ctx.save();
    ctx.shadowBlur = 10;
    ctx.shadowColor = NET_COLORS.stumpGlow;
    ctx.strokeStyle = NET_COLORS.stumpGlow;
    ctx.lineWidth = 3;

    stumpsX.forEach(sx => {
      ctx.beginPath();
      ctx.moveTo(sx, y);
      ctx.lineTo(sx, y - STUMP_HEIGHT);
      ctx.stroke();
      
      // Node endpoints
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(sx, y - STUMP_HEIGHT, 2.5, 0, Math.PI*2); ctx.fill();
    });

    // Neon Bails
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - STUMP_SPACING - 2, y - STUMP_HEIGHT - 3);
    ctx.lineTo(cx + STUMP_SPACING + 2, y - STUMP_HEIGHT - 3);
    ctx.stroke();
    ctx.restore();
  }

  function drawCyberPlayer(ctx: CanvasRenderingContext2D, x: number, y: number, swingAngle: number, color: string, isBatsman: boolean) {
    ctx.save();
    ctx.translate(x, y);
    if (!isBatsman) ctx.scale(-1, 1); // Bowler faces left

    ctx.shadowBlur = 12;
    ctx.shadowColor = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;

    // Energy wireframe joints & lines
    ctx.beginPath();
    // Spine / Torso
    ctx.moveTo(0, -25); ctx.lineTo(0, -48);
    // Legs
    ctx.moveTo(0, -25); ctx.lineTo(-8, 0);
    ctx.moveTo(0, -25); ctx.lineTo(8, 0);
    ctx.stroke();

    // Glowing energy core center
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(0, -38, 4, 0, Math.PI*2); ctx.fill();

    // Digital Visor Head
    ctx.strokeStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(0, -56, 8, 0, Math.PI*2); ctx.stroke();
    ctx.fillStyle = color;
    ctx.fillRect(-6, -58, 12, 4); // Laser Visor

    // Action Weapons (Arms & Bat)
    ctx.save();
    ctx.translate(0, -44);
    if (isBatsman) {
      ctx.rotate(swingAngle);
      // Arms pulling forward
      ctx.strokeStyle = '#ffffff';
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(10, 15); ctx.stroke();
      
      // Plasma Lightsaber Bat
      const bladeGrad = ctx.createLinearGradient(10, 15, 25, 65);
      bladeGrad.addColorStop(0, '#ffffff');
      bladeGrad.addColorStop(0.2, color);
      bladeGrad.addColorStop(1, 'transparent');
      
      ctx.strokeStyle = bladeGrad;
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(10, 15); ctx.lineTo(35, 65); ctx.stroke();
    } else {
      // Bowler dynamic arm sweep
      ctx.rotate(swingAngle);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 22); ctx.stroke();
    }
    ctx.restore();
    ctx.restore();
  }

  // ============================================================
  // VFX TRIGGER ENGINES
  // ============================================================
  function addPlasmaBurst(x: number, y: number, color: string) {
    // Spatial rings
    shockwavesRef.current.push({
      x, y, radius: 2, maxRadius: 90, color, life: 25
    });
    // Velocity cyber particles
    for (let i = 0; i < 45; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 4 + Math.random() * 9;
      particlesRef.current.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: Math.random() > 0.4 ? color : '#ffffff',
        life: 80, maxLife: 80,
        size: 2 + Math.random() * 3,
        gravity: 0.05,
        type: 'plasma'
      });
    }
  }

  function addDigitalShatter(x: number, y: number) {
    for (let i = 0; i < 25; i++) {
      particlesRef.current.push({
        x: x + (Math.random() - 0.5) * 20,
        y: y - Math.random() * STUMP_HEIGHT,
        vx: (Math.random() - 0.5) * 8,
        vy: -3 - Math.random() * 7,
        color: NET_COLORS.stumpGlow,
        life: 60, maxLife: 60,
        size: 4 + Math.random() * 5,
        gravity: 0.2,
        type: 'shard',
        angle: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 0.3
      });
    }
  }

  // ============================================================
  // CORE ADVANCED PHYS-ENGINE & RENDER LOOP
  // ============================================================
  const animate = useCallback((timestamp: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (!lastTimeRef.current) lastTimeRef.current = timestamp;
    const dt = timestamp - lastTimeRef.current;
    lastTimeRef.current = timestamp;

    // Apply Time-Dilation Multiplier dynamically
    virtualTimeRef.current += dt * timeScaleRef.current;
    const vTime = virtualTimeRef.current;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawCyberWorld(ctx, canvas.width, canvas.height, vTime);

    // Dynamic Ball Processing
    if (ballRef.current) {
      const ball = ballRef.current;
      ball.x += ball.vx * timeScaleRef.current;
      ball.y += ball.vy * timeScaleRef.current;
      ball.vy += 0.15 * timeScaleRef.current; // gravity drift

      ball.trail.push({ x: ball.x, y: ball.y, size: ball.radius });
      if (ball.trail.length > 15) ball.trail.shift();

      // Draw plasma particle tail
      ball.trail.forEach((pt, index) => {
        ctx.save();
        ctx.globalAlpha = index / ball.trail.length;
        ctx.fillStyle = NET_COLORS.ballPlasma;
        ctx.shadowBlur = 10;
        ctx.shadowColor = NET_COLORS.ballPlasma;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size * (index / ball.trail.length) * 1.5, 0, Math.PI*2);
        ctx.fill();
        ctx.restore();
      });

      // Standard render ball
      ctx.save();
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#ffffff';
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }

    // Process Active Shockwaves
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    shockwavesRef.current = shockwavesRef.current.filter(sw => {
      sw.radius += (sw.maxRadius - sw.radius) * 0.1;
      sw.life--;
      
      ctx.strokeStyle = sw.color;
      ctx.lineWidth = (sw.life / 25) * 5;
      ctx.beginPath();
      ctx.ellipse(sw.x, sw.y, sw.radius, sw.radius * 0.4, 0, 0, Math.PI*2);
      ctx.stroke();
      return sw.life > 0;
    });
    ctx.restore();

    // Process Active Particles System
    particlesRef.current = particlesRef.current.filter(p => {
      p.life--;
      p.x += p.vx * timeScaleRef.current;
      p.y += p.vy * timeScaleRef.current;
      p.vy += p.gravity * timeScaleRef.current;

      const alpha = p.life / p.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha;

      if (p.type === 'plasma') {
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 8;
        ctx.shadowColor = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill();
      } else if (p.type === 'shard' && p.angle !== undefined && p.spin !== undefined) {
        p.angle += p.spin * timeScaleRef.current;
        ctx.fillStyle = p.color;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size);
      }
      ctx.restore();
      return p.life > 0;
    });

    // Handle Scenarios Routing base on Virtual Timeline markers
    switch (outcome) {
      case 'six': handleSixFlow(ctx, vTime); break;
      case 'four': handleFourFlow(ctx, vTime); break;
      case 'bowled': handleBowledFlow(ctx, vTime); break;
      case 'run_out': handleRunOutFlow(ctx, vTime); break;
      case 'dot': handleDotFlow(ctx, vTime); break;
      default: handleDotFlow(ctx, vTime);
    }

    updateAndDrawBails(ctx);

    // End condition detection mapping
    const timelineLimit = getInningsTimelineLimit(outcome);
    if (vTime >= timelineLimit && !completedRef.current) {
      completedRef.current = true;
      onAnimationComplete();
      return;
    }

    animRef.current = requestAnimationFrame(animate);
  }, [outcome, drawCyberWorld, onAnimationComplete]);

  // ============================================================
  // PROCEDURAL SCENARIOS FLOW ROUTERS
  // ============================================================
  function getInningsTimelineLimit(o: CricketOutcome | null): number {
    switch (o) {
      case 'six': return 3200;
      case 'four': return 2800;
      case 'bowled': return 2500;
      case 'run_out': return 3500;
      default: return 2000;
    }
  }

  function handleSixFlow(ctx: CanvasRenderingContext2D, vt: number) {
    // Bowler positioning
    drawCyberPlayer(ctx, BOWLING_X, PITCH_Y, 1.0, teamColors[1], false);

    // BULLET-TIME MATRIX EFFECT: Slow down heavily right before hit point (300ms to 600ms)
    if (vt > 280 && vt < 650) {
      timeScaleRef.current = 0.12; // Drop flow to 12% slow-motion scale
    } else if (vt >= 650) {
      timeScaleRef.current = 1.4;  // Snap back into hyper-acceleration!
    }

    // Ball movement calculation
    if (ballRef.current) {
      if (vt < 350) {
        // incoming vector
        ballRef.current.x = BOWLING_X - (vt / 350) * (BOWLING_X - BATTING_X);
        ballRef.current.y = PITCH_Y - 30 - Math.sin((vt/350)*Math.PI)*40;
      } else {
        // Exploded outward trajectory
        const postT = (vt - 350) / 2500;
        ballRef.current.x = BATTING_X + postT * (CANVAS_W * 0.9);
        ballRef.current.y = (PITCH_Y - 20) - Math.sin(postT * Math.PI) * 320;
        ballRef.current.radius = 8;
      }
      drawBall(ctx, ballRef.current);
    }

    // Swing swing animation window
    const swing = vt < 350 ? (vt / 350) * -1.2 : -1.2 + ((vt - 350) / 400) * 2.5;
    drawCyberPlayer(ctx, BATTING_X, PITCH_Y, Math.min(swing, 1.2), teamColors[0], true);
    drawCyberStumps(ctx, BATTING_X - 15, PITCH_Y, true);

    // Connect moment explosion trigger
    if (vt >= 350 && !hasTriggeredImpactRef.current) {
      addPlasmaBurst(BATTING_X + 15, PITCH_Y - 30, teamColors[0]);
      hasTriggeredImpactRef.current = true;
    }

    if (vt > 500) {
      drawBanner(ctx, 'QUANTUM SIX!', 'Tore through the stratosphere!', CANVAS_W, CANVAS_H, '#00ffff', Math.min(1, (vt - 500)/300));
    }
  }

  function handleFourFlow(ctx: CanvasRenderingContext2D, vt: number) {
    drawCyberPlayer(ctx, BOWLING_X, PITCH_Y, 1.0, teamColors[1], false);

    if (vt > 250 && vt < 550) timeScaleRef.current = 0.15;
    else timeScaleRef.current = 1.6;

    if (ballRef.current) {
      if (vt < 320) {
        ballRef.current.x = BOWLING_X - (vt / 320) * (BOWLING_X - BATTING_X);
        ballRef.current.y = PITCH_Y - 20;
      } else {
        const postT = (vt - 320) / 2000;
        ballRef.current.x = BATTING_X + postT * CANVAS_W;
        ballRef.current.y = PITCH_Y - Math.abs(Math.sin(vt * 0.04) * 12);
      }
      drawBall(ctx, ballRef.current);
    }

    const swing = vt < 320 ? (vt / 320) * -0.9 : -0.9 + ((vt - 320) / 300) * 2.0;
    drawCyberPlayer(ctx, BATTING_X, PITCH_Y, Math.min(swing, 1.0), teamColors[0], true);
    drawCyberStumps(ctx, BATTING_X - 15, PITCH_Y, true);

    if (vt >= 320 && !hasTriggeredImpactRef.current) {
      addPlasmaBurst(BATTING_X + 10, PITCH_Y - 20, '#34d399');
      hasTriggeredImpactRef.current = true;
    }

    if (vt > 450) {
      drawBanner(ctx, 'LASER FOUR!', 'Searing velocity ray shot!', CANVAS_W, CANVAS_H, '#34d399', Math.min(1, (vt - 450)/300));
    }
  }

  function handleBowledFlow(ctx: CanvasRenderingContext2D, vt: number) {
    drawCyberPlayer(ctx, BOWLING_X, PITCH_Y, 1.0, teamColors[1], false);

    // Slow down right as the ball splits the stumps apart
    if (vt > 450 && vt < 850) timeScaleRef.current = 0.2;
    else timeScaleRef.current = 1.0;

    const targetStumpX = BATTING_X - 15;

    if (ballRef.current) {
      if (vt < 500) {
        ballRef.current.x = BOWLING_X - (vt / 500) * (BOWLING_X - targetStumpX);
        ballRef.current.y = PITCH_Y - 20 - Math.sin((vt/500)*Math.PI)*15;
        drawBall(ctx, ballRef.current);
      }
    }

    // Batsman freezes out completely shocked
    drawCyberPlayer(ctx, BATTING_X, PITCH_Y, -0.4, teamColors[0], true);

    if (vt >= 500) {
      // Stumps disintegration system activation
      if (!hasTriggeredImpactRef.current) {
        addDigitalShatter(targetStumpX, PITCH_Y);
        shockwavesRef.current.push({ x: targetStumpX, y: PITCH_Y, radius: 2, maxRadius: 60, color: '#ff0055', life: 20 });
        hasTriggeredImpactRef.current = true;
      }
    } else {
      drawCyberStumps(ctx, targetStumpX, PITCH_Y, true);
    }

    if (vt > 800) {
      drawBanner(ctx, 'MATRIX BOWLED!', 'Stumps completely dissolved!', CANVAS_W, CANVAS_H, '#ff0055', Math.min(1, (vt - 800)/300));
    }
  }

  function handleRunOutFlow(ctx: CanvasRenderingContext2D, vt: number) {
    drawCyberPlayer(ctx, BOWLING_X, PITCH_Y, 1.0, teamColors[1], false);
    
    // Smooth translation running animation vector
    const runRatio = Math.min(vt / 2500, 1);
    const runnerX = BATTING_X + runRatio * 160;
    drawCyberPlayer(ctx, runnerX, PITCH_Y, Math.sin(vt * 0.02) * 0.4, teamColors[0], true);

    if (vt > 1800 && vt < 2400) timeScaleRef.current = 0.25; // Dramatic dive slow-mo window
    else timeScaleRef.current = 1.2;

    if (ballRef.current) {
      if (vt > 1500) {
        const throwT = Math.min((vt - 1500) / 600, 1);
        ballRef.current.x = (BOWLING_X - 100) - throwT * ((BOWLING_X - 100) - BATTING_X);
        ballRef.current.y = PITCH_Y - 40 - Math.sin(throwT * Math.PI) * 50;
        drawBall(ctx, ballRef.current);
      }
    }

    if (vt >= 2100) {
      drawCyberStumps(ctx, BATTING_X, PITCH_Y, false);
      if (!hasTriggeredImpactRef.current) {
        addDigitalShatter(BATTING_X, PITCH_Y);
        hasTriggeredImpactRef.current = true;
      }
    } else {
      drawCyberStumps(ctx, BATTING_X, PITCH_Y, true);
    }

    if (vt > 2400) {
      drawBanner(ctx, 'CYBER RUN OUT!', 'Intercepted by precision beam!', CANVAS_W, CANVAS_H, '#ef4444', Math.min(1, (vt - 2400)/300));
    }
  }

  function handleDotFlow(ctx: CanvasRenderingContext2D, vt: number) {
    drawCyberPlayer(ctx, BOWLING_X, PITCH_Y, 1.0, teamColors[1], false);
    if (ballRef.current && vt < 600) {
      ballRef.current.x = BOWLING_X - (vt / 600) * (BOWLING_X - BATTING_X);
      ballRef.current.y = PITCH_Y - 10;
      drawBall(ctx, ballRef.current);
    }
    drawCyberPlayer(ctx, BATTING_X, PITCH_Y, vt > 300 && vt < 600 ? 0.3 : 0, teamColors[0], true);
    drawCyberStumps(ctx, BATTING_X - 15, PITCH_Y, true);

    if (vt > 700) {
      drawBanner(ctx, 'SECTOR SHIELDED', 'Defended inside perimeter parameters.', CANVAS_W, CANVAS_H, '#6b7280', Math.min(1, (vt - 700)/300));
    }
  }

  function updateAndDrawBails(ctx: CanvasRenderingContext2D) {
    bailsRef.current = bailsRef.current.filter(b => {
      b.x += b.vx * timeScaleRef.current;
      b.y += b.vy * timeScaleRef.current;
      b.vy += 0.3 * timeScaleRef.current;
      b.angle += b.spin * timeScaleRef.current;

      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.angle);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(8, 0); ctx.stroke();
      ctx.restore();
      return b.y < CANVAS_H + 20;
    });
  }

  // ============================================================
  // COMPONENT MOUNT ENGINE LINKING
  // ============================================================
  useEffect(() => {
    if (!outcome) return;

    completedRef.current = false;
    hasTriggeredImpactRef.current = false;
    particlesRef.current = [];
    shockwavesRef.current = [];
    bailsRef.current = [];
    
    virtualTimeRef.current = 0;
    lastTimeRef.current = performance.now();
    timeScaleRef.current = 1;

    ballRef.current = {
      x: BOWLING_X,
      y: PITCH_Y - 40,
      vx: -12,
      vy: 0.5,
      radius: 5,
      trail: []
    };

    if (reducedMotion) {
      setTimeout(() => {
        if (!completedRef.current) {
          completedRef.current = true;
          onAnimationComplete();
        }
      }, 1500);
      return;
    }

    let active = true;
    const frame = (ts: number) => {
      if (!active) return;
      animate(ts);
    };
    animRef.current = requestAnimationFrame(frame);

    return () => {
      active = false;
      cancelAnimationFrame(animRef.current);
    };
  }, [outcome, reducedMotion, onAnimationComplete, animate]);

  // Initial clean frame setup line
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawCyberWorld(ctx, canvas.width, canvas.height, 0);
    drawCyberStumps(ctx, BATTING_X - 15, PITCH_Y, true);
    drawCyberPlayer(ctx, BATTING_X, PITCH_Y, 0, teamColors[0], true);
    drawCyberPlayer(ctx, BOWLING_X, PITCH_Y, 0, teamColors[1], false);
  }, [drawCyberWorld, teamColors]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_W}
      height={CANVAS_H}
      className="w-full h-full object-contain rounded-xl shadow-2xl bg-black border border-indigo-500/30"
      aria-label="Quantum Space Cricket Display Canvas"
    />
  );
};

export default CricketCanvas;
