// ============================================================
// Grammar Cricket - Google-Style Raw Array Engine
// Uses exact coordinate arrays from cricket17.js
// ============================================================
import React, { useRef, useEffect, useCallback, useState } from 'react';
import { CricketOutcome } from '../engine/GameState';

// @ts-ignore - Tells TypeScript to allow the SVG import
import spriteUrl from '../assets/svg-sprite.svg';

interface CricketCanvasProps {
  outcome: CricketOutcome | null;
  onAnimationComplete: () => void;
  reducedMotion?: boolean;
}

const CricketCanvas: React.FC<CricketCanvasProps> = ({
  outcome,
  onAnimationComplete,
  reducedMotion = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const spriteRef = useRef<HTMLImageElement | null>(null);
  const [spriteLoaded, setSpriteLoaded] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  
  const engineState = useRef({
    animFrame: 0,
    virtualTime: 0,
    lastTime: 0,
    completed: false
  });

  const W = 800;
  const H = 480;
  const PITCH_Y = H * 0.70;
  const BATTING_X = W * 0.25;
  const BOWLING_X = W * 0.75;

  // ============================================================
  // EXACT GOOGLE ARRAYS [X, Y, Width, Height] 
  // From cricket17.js (Uc, Vc, Wc, etc.)
  // ============================================================
  const G_SPRITES = {
    batter_idle: [20, 146, 116, 193],     // Wc
    bowler_idle: [20, 1262, 49, 81],      // cd
    bowler_windup: [20, 1550, 130, 212],  // ed
    bowler_throw: [20, 1783, 130, 225],   // fd
    stump: [20, 5705, 3, 21],             // Dd
    bails: [20, 9914, 38, 31],            // ge
    crowd_1: [20, 7058, 124, 184],
    crowd_2: [20, 7262, 124, 184],
    tree: [20, 810, 66, 432],
    num_4: [20, 2781, 65, 72],
    num_6: [20, 2970, 53, 80]
  };

  const crowdData = useRef(
    Array.from({ length: 12 }).map((_, i) => ({
      x: 50 + i * 65,
      y: H * 0.35,
      offset: Math.random() * 1000,
      scale: 0.25 + Math.random() * 0.1,
    }))
  );

  // Load and patch the SVG to prevent blank screens in Vite
  useEffect(() => {
    let active = true;
    const loadSprite = async () => {
      try {
        let svgText = "";
        if (spriteUrl.startsWith('data:')) {
          const parts = spriteUrl.split(',');
          const dataContent = parts.slice(1).join(',');
          svgText = parts[0].includes('base64') ? atob(dataContent) : decodeURIComponent(dataContent);
        } else {
          const res = await fetch(spriteUrl);
          if (!res.ok) throw new Error("Fetch failed");
          svgText = await res.text();
        }

        // Fix Canvas blank screen bug by forcing dimensions
        if (!svgText.includes('width=')) {
          svgText = svgText.replace('<svg', '<svg width="10000" height="10000"');
        }

        const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        
        const img = new Image();
        img.onload = () => {
          if (active) {
            spriteRef.current = img;
            setSpriteLoaded(true);
            URL.revokeObjectURL(url);
          }
        };
        img.onerror = () => { if (active) setErrorMsg("Corrupt SVG Data"); };
        img.src = url;
      } catch (err) {
        if (active) setErrorMsg("SVG missing from src/assets/");
      }
    };
    loadSprite();
    return () => { active = false; };
  }, []);

  // Google's specific draw style using the exact arrays
  const drawGraphic = (
    ctx: CanvasRenderingContext2D, 
    key: keyof typeof G_SPRITES, 
    dx: number, dy: number, 
    scale = 1, flip = false, rotate = 0
  ) => {
    if (!spriteRef.current) return;
    const [sx, sy, sw, sh] = G_SPRITES[key];
    
    ctx.save();
    ctx.translate(dx, dy);
    if (flip) ctx.scale(-1, 1);
    if (rotate) ctx.rotate(rotate);
    
    // Google includes a 5px bleed buffer in their math
    ctx.drawImage(
      spriteRef.current, 
      sx - 5, sy - 5, sw + 10, sh + 10,
      (-sw / 2) * scale, (-sh) * scale, (sw + 10) * scale, (sh + 10) * scale
    );
    ctx.restore();
  };

  const drawScene = (ctx: CanvasRenderingContext2D, vTime: number) => {
    // 1. Background
    ctx.fillStyle = '#689f38'; 
    ctx.fillRect(0, 0, W, H);

    // 2. Trees
    drawGraphic(ctx, 'tree', W * 0.1, H * 0.35, 0.5);
    drawGraphic(ctx, 'tree', W * 0.85, H * 0.4, 0.6);

    // 3. Stadium Curve
    ctx.fillStyle = '#8bc34a';
    ctx.beginPath();
    ctx.ellipse(W / 2, H * 0.8, W * 0.9, H * 0.5, 0, Math.PI, 0);
    ctx.fill();

    // 4. Bouncing Crowd
    crowdData.current.forEach((bug, index) => {
      const intensity = outcome ? 4 : 1; 
      const jump = Math.abs(Math.sin((vTime + bug.offset) * 0.005 * intensity)) * 25 * intensity;
      const key = (Math.floor(vTime / 200) + index) % 2 === 0 ? 'crowd_1' : 'crowd_2';
      drawGraphic(ctx, key, bug.x, bug.y - jump, bug.scale);
    });

    // 5. Pitch & Creases
    ctx.fillStyle = '#c5a365';
    ctx.beginPath(); ctx.ellipse(W / 2, PITCH_Y, 280, 50, 0, 0, Math.PI * 2); ctx.fill();
    
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(BATTING_X, PITCH_Y - 40); ctx.lineTo(BATTING_X, PITCH_Y + 40); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(BOWLING_X, PITCH_Y - 40); ctx.lineTo(BOWLING_X, PITCH_Y + 40); ctx.stroke();
  };

  // Main Engine Loop
  const renderEngine = useCallback((timestamp: number) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    const state = engineState.current;
    if (state.lastTime === 0) state.lastTime = timestamp;
    const dt = Math.min(timestamp - state.lastTime, 50);
    state.lastTime = timestamp;

    if (outcome) state.virtualTime += dt;
    const vt = state.virtualTime;

    drawScene(ctx, timestamp); // Pass absolute time to keep crowd moving

    if (errorMsg) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'white'; ctx.font = 'bold 24px Arial'; ctx.textAlign = 'center';
      ctx.fillText(`⚠️ ${errorMsg}`, W / 2, H / 2);
      return;
    }

    if (!spriteLoaded) return;

    // Default Object States
    let bowlerKey: keyof typeof G_SPRITES = 'bowler_idle';
    let ballX = BOWLING_X - 20;
    let ballY = PITCH_Y - 40;
    let showBall = false;
    let drawBannerText = '';
    const IMPACT = 600;

    let shakeX = 0, shakeY = 0;

    // Timeline Routing
    if (outcome) {
      if (vt > 100 && vt < 300) bowlerKey = 'bowler_windup';
      else if (vt >= 300 && vt < IMPACT) {
        bowlerKey = 'bowler_throw';
        showBall = true;
        const t = (vt - 300) / (IMPACT - 300);
        ballX = BOWLING_X - 20 - t * (BOWLING_X - BATTING_X);
        ballY = PITCH_Y - 40 - Math.sin(t * Math.PI) * 40;
      }
      
      if (vt >= IMPACT) {
        showBall = true;
        const t = (vt - IMPACT) / 1000;
        
        if (vt < IMPACT + 200) {
          shakeX = (Math.random() - 0.5) * 10;
          shakeY = (Math.random() - 0.5) * 10;
        }

        if (outcome === 'six') {
          ballX = BATTING_X + t * W * 1.5; ballY = PITCH_Y - 40 - t * 400; drawBannerText = 'SIX!';
        } else if (outcome === 'four') {
          ballX = BATTING_X + t * W; ballY = PITCH_Y - 10 - Math.abs(Math.sin(vt * 0.02) * 15); drawBannerText = 'FOUR!';
        } else if (outcome === 'bowled') {
          ballX = BATTING_X - 50; ballY = PITCH_Y - 5; drawBannerText = 'OUT!';
        } else {
          ballX = BATTING_X + t * W * 0.4; ballY = PITCH_Y - 5; drawBannerText = outcome === 'dot' ? 'DOT BALL' : `${outcome.toUpperCase()} RUN`;
        }
      }
    }

    ctx.save();
    ctx.translate(shakeX, shakeY);

    // Non-Striker Wickets
    for(let i=-10; i<=10; i+=10) drawGraphic(ctx, 'stump', BOWLING_X + 25 + i, PITCH_Y, 2.5);
    drawGraphic(ctx, 'bails', BOWLING_X + 25, PITCH_Y - 45, 1.2);

    // Snail
    drawGraphic(ctx, bowlerKey, BOWLING_X, PITCH_Y + 10, 0.9, true);
    
    // Grasshopper
    const idleBob = (!outcome) ? Math.sin(timestamp * 0.003) * 3 : 0;
    const swingRotation = (outcome && vt > IMPACT - 100 && vt < IMPACT + 300) ? -0.3 : 0;
    drawGraphic(ctx, 'batter_idle', BATTING_X, PITCH_Y + 15 + idleBob, 0.7, false, swingRotation); 

    // Striker Wickets
    if (outcome === 'bowled' && vt >= IMPACT) {
      drawGraphic(ctx, 'stump', BATTING_X - 20, PITCH_Y, 2.5, true, -0.4); 
    } else {
      for(let i=-10; i<=10; i+=10) drawGraphic(ctx, 'stump', BATTING_X - 25 + i, PITCH_Y, 2.5);
      drawGraphic(ctx, 'bails', BATTING_X - 25, PITCH_Y - 45, 1.2);
    }

    // Ball
    if (showBall) {
      ctx.fillStyle = '#bb2222';
      ctx.beginPath(); ctx.arc(ballX, ballY - 5, 8, 0, Math.PI * 2); ctx.fill();
    }

    ctx.restore(); 

    // UI Banner
    if (drawBannerText && vt > IMPACT + 300) {
      const by = H / 2 - 50;
      ctx.fillStyle = '#795548'; ctx.beginPath(); ctx.roundRect(W/2 - 150, by, 300, 80, 10); ctx.fill();
      ctx.strokeStyle = '#5d4037'; ctx.lineWidth = 3; ctx.beginPath(); ctx.roundRect(W/2 - 145, by + 5, 290, 70, 8); ctx.stroke();
      ctx.fillStyle = '#ffeb3b'; ctx.font = '900 36px "Chalkboard SE", "Comic Sans MS", sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(drawBannerText, W / 2, by + 40);
    }

    if (outcome && vt > 2500) {
      state.completed = true;
      onAnimationComplete();
    }
  }, [outcome, spriteLoaded, errorMsg, onAnimationComplete]);

  // Boot the Engine Loop
  useEffect(() => {
    if (!spriteLoaded && !errorMsg) return;
    
    const state = engineState.current;
    state.completed = false;
    state.lastTime = 0;
    if (outcome) state.virtualTime = 0;

    if (reducedMotion && outcome) {
      setTimeout(() => onAnimationComplete(), 1000);
      return;
    }

    const loop = (timestamp: number) => {
      renderEngine(timestamp);
      if (!engineState.current.completed) {
        engineState.current.animFrame = requestAnimationFrame(loop);
      }
    };

    engineState.current.animFrame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(engineState.current.animFrame);
  }, [outcome, spriteLoaded, errorMsg, reducedMotion, renderEngine]);

  return (
    <div className="w-full h-full rounded-xl overflow-hidden shadow-2xl border-4 border-[#558b2f]">
      <canvas ref={canvasRef} width={W} height={H} className="w-full h-full object-contain bg-[#689f38]" />
    </div>
  );
};

export default CricketCanvas;
