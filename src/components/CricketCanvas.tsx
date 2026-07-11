// ============================================================
// Grammar Cricket - The Authentic 2017 Google Doodle Experience
// Complete with Crowd Bugs, Trees, and Reliable SVG Decoding
// ============================================================
import React, { useRef, useEffect, useCallback, useState } from 'react';
import { CricketOutcome } from '../engine/GameState';

// @ts-ignore - Tells TypeScript to allow the SVG import from the root directory
import spriteUrl from '../../svg-sprite.svg';

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
  const [imageError, setImageError] = useState("");
  
  const animRef = useRef<number>(0);
  const virtualTimeRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const completedRef = useRef<boolean>(false);

  const W = 800;
  const H = 480;
  const PITCH_Y = H * 0.70;
  const BATTING_X = W * 0.25;
  const BOWLING_X = W * 0.75;

  // Authentic coordinate map extracted from cricket17.js
  const SPRITES = {
    batter_idle: { x: 20, y: 146, w: 116, h: 193 },
    bowler_idle: { x: 20, y: 1262, w: 49, h: 81 },
    bowler_windup: { x: 20, y: 1550, w: 130, h: 212 },
    bowler_throw: { x: 20, y: 1783, w: 130, h: 225 },
    stump: { x: 20, y: 5705, w: 3, h: 21 },
    bails: { x: 20, y: 9914, w: 38, h: 31 },
    crowd_1: { x: 20, y: 7058, w: 124, h: 184 },
    crowd_2: { x: 20, y: 7262, w: 124, h: 184 },
    tree: { x: 20, y: 810, w: 66, h: 432 },
  };

  // Crowd generation
  const CROWD_MEMBERS = useRef(
    Array.from({ length: 12 }).map((_, i) => ({
      x: 50 + i * 65,
      y: H * 0.35,
      offset: Math.random() * 1000,
      scale: 0.25 + Math.random() * 0.1,
    }))
  );

  // ============================================================
  // 1. THE BULLETPROOF SVG DECODER & LOADER
  // ============================================================
  useEffect(() => {
    let active = true;

    const loadAndPatchSprite = async () => {
      try {
        let svgText = "";
        
        // Handle Vite's Base64/URI inlining for vite-plugin-singlefile
        if (spriteUrl.startsWith('data:')) {
          const parts = spriteUrl.split(',');
          const dataContent = parts.slice(1).join(',');
          svgText = parts[0].includes('base64') ? atob(dataContent) : decodeURIComponent(dataContent);
        } else {
          // Fallback if not inlined
          const res = await fetch(spriteUrl);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          svgText = await res.text();
        }

        // MAGIC FIX: Inject explicit dimensions so Canvas crop doesn't return blank!
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
        img.onerror = () => { if (active) setImageError("Failed to decode patched SVG."); };
        img.src = url;
      } catch (err) {
        console.error(err);
        if (active) setImageError("Could not locate or parse svg-sprite.svg in root directory.");
      }
    };

    loadAndPatchSprite();
    return () => { active = false; };
  }, []);

  // ============================================================
  // 2. THE RENDERING ENGINE
  // ============================================================
  const drawSprite = (
    ctx: CanvasRenderingContext2D, 
    spriteName: keyof typeof SPRITES, 
    dx: number, dy: number, 
    scale: number = 1, flip: boolean = false, rotate: number = 0
  ) => {
    if (!spriteRef.current) return;
    const s = SPRITES[spriteName];
    ctx.save();
    ctx.translate(dx, dy);
    if (flip) ctx.scale(-1, 1);
    if (rotate) ctx.rotate(rotate);
    
    ctx.drawImage(
      spriteRef.current, 
      s.x - 5, s.y - 5, s.w + 10, s.h + 10,
      (-s.w / 2) * scale, (-s.h) * scale, (s.w + 10) * scale, (s.h + 10) * scale
    );
    ctx.restore();
  };

  const drawAuthenticEnvironment = (ctx: CanvasRenderingContext2D, vTime: number) => {
    // 1. Deep Background
    ctx.fillStyle = '#689f38'; 
    ctx.fillRect(0, 0, W, H);

    // 2. Background Trees
    drawSprite(ctx, 'tree', W * 0.1, H * 0.35, 0.5);
    drawSprite(ctx, 'tree', W * 0.85, H * 0.4, 0.6);

    // 3. The Curved Stadium Grass
    ctx.fillStyle = '#8bc34a';
    ctx.beginPath();
    ctx.ellipse(W / 2, H * 0.8, W * 0.9, H * 0.5, 0, Math.PI, 0);
    ctx.fill();

    // 4. The Jumping Bug Crowd!
    CROWD_MEMBERS.current.forEach((bug, index) => {
      // Crowd goes crazy during an outcome!
      const intensity = outcome ? 4 : 1; 
      const jumpY = Math.abs(Math.sin((vTime + bug.offset) * 0.005 * intensity)) * 25 * intensity;
      const sprite = (Math.floor(vTime / 200) + index) % 2 === 0 ? 'crowd_1' : 'crowd_2';
      drawSprite(ctx, sprite, bug.x, bug.y - jumpY, bug.scale);
    });

    // 5. The Dirt Pitch
    ctx.fillStyle = '#c5a365';
    ctx.beginPath();
    ctx.ellipse(W / 2, PITCH_Y, 280, 50, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // 6. Creases
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(BATTING_X, PITCH_Y - 40); ctx.lineTo(BATTING_X, PITCH_Y + 40); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(BOWLING_X, PITCH_Y - 40); ctx.lineTo(BOWLING_X, PITCH_Y + 40); ctx.stroke();
  };

  const renderFrame = useCallback((timestamp: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (lastTimeRef.current === 0) lastTimeRef.current = timestamp;
    const dt = Math.min(timestamp - lastTimeRef.current, 50);
    lastTimeRef.current = timestamp;

    if (outcome) virtualTimeRef.current += dt;
    const vTime = virtualTimeRef.current;
    const sysTime = timestamp; // Used for idle animations

    // Render Environment & Crowd
    drawAuthenticEnvironment(ctx, sysTime);

    // Error Overlay Fallback
    if (imageError) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'white'; ctx.font = 'bold 24px Arial'; ctx.textAlign = 'center';
      ctx.fillText(`⚠️ ${imageError}`, W / 2, H / 2);
      return;
    }

    if (!spriteLoaded) return;

    // Default Scene Setup
    let bowlerSprite: keyof typeof SPRITES = 'bowler_idle';
    let ballX = BOWLING_X - 20;
    let ballY = PITCH_Y - 40;
    let showBall = false;
    let drawBannerText = '';
    const IMPACT = 600;

    // Camera Shake Logic
    let shakeX = 0; let shakeY = 0;

    // Timeline Routing
    if (outcome) {
      if (vTime > 100 && vTime < 300) bowlerSprite = 'bowler_windup';
      else if (vTime >= 300 && vTime < IMPACT) {
        bowlerSprite = 'bowler_throw';
        showBall = true;
        const t = (vTime - 300) / (IMPACT - 300);
        ballX = BOWLING_X - 20 - t * (BOWLING_X - BATTING_X);
        ballY = PITCH_Y - 40 - Math.sin(t * Math.PI) * 40; // Arc throw
      }
      
      if (vTime >= IMPACT) {
        showBall = true;
        const t = (vTime - IMPACT) / 1000;
        
        if (vTime < IMPACT + 200) {
          shakeX = (Math.random() - 0.5) * 10;
          shakeY = (Math.random() - 0.5) * 10;
        }

        if (outcome === 'six') {
          ballX = BATTING_X + t * W * 1.5;
          ballY = PITCH_Y - 40 - t * 400;
          drawBannerText = 'SIX!';
        } else if (outcome === 'four') {
          ballX = BATTING_X + t * W;
          ballY = PITCH_Y - 10 - Math.abs(Math.sin(vTime * 0.02) * 15);
          drawBannerText = 'FOUR!';
        } else if (outcome === 'bowled') {
          ballX = BATTING_X - 50;
          ballY = PITCH_Y - 5;
          drawBannerText = 'OUT!';
        } else {
          ballX = BATTING_X + t * W * 0.4;
          ballY = PITCH_Y - 5;
          drawBannerText = outcome === 'dot' ? 'DOT BALL' : `${outcome.toUpperCase()} RUN`;
        }
      }
    }

    ctx.save();
    ctx.translate(shakeX, shakeY);

    // Draw Wickets
    for(let i=-10; i<=10; i+=10) drawSprite(ctx, 'stump', BOWLING_X + 25 + i, PITCH_Y, 2.5);
    drawSprite(ctx, 'bails', BOWLING_X + 25, PITCH_Y - 45, 1.2);

    // Draw Snail
    drawSprite(ctx, bowlerSprite, BOWLING_X, PITCH_Y + 10, 0.9, true);
    
    // Draw Grasshopper (Bobs when idle, leans back when swinging)
    const idleBob = (!outcome) ? Math.sin(sysTime * 0.003) * 3 : 0;
    const swingRotation = (outcome && vTime > IMPACT - 100 && vTime < IMPACT + 300) ? -0.3 : 0;
    drawSprite(ctx, 'batter_idle', BATTING_X, PITCH_Y + 15 + idleBob, 0.7, false, swingRotation); 

    if (outcome === 'bowled' && vTime >= IMPACT) {
      drawSprite(ctx, 'stump', BATTING_X - 20, PITCH_Y, 2.5, true, -0.4); // Stumps fly backward
    } else {
      for(let i=-10; i<=10; i+=10) drawSprite(ctx, 'stump', BATTING_X - 25 + i, PITCH_Y, 2.5);
      drawSprite(ctx, 'bails', BATTING_X - 25, PITCH_Y - 45, 1.2);
    }

    // Draw Original Red Berry Ball
    if (showBall) {
      ctx.fillStyle = '#bb2222';
      ctx.beginPath(); ctx.arc(ballX, ballY - 5, 8, 0, Math.PI * 2); ctx.fill();
    }

    ctx.restore(); // Restore shake

    // Draw Authentic Wood Sign Banner
    if (drawBannerText && vTime > IMPACT + 300) {
      const by = H / 2 - 50;
      ctx.fillStyle = '#795548'; // Wood color
      ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.roundRect(W/2 - 150, by, 300, 80, 10); ctx.fill();
      ctx.shadowBlur = 0;
      
      ctx.strokeStyle = '#5d4037'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.roundRect(W/2 - 145, by + 5, 290, 70, 8); ctx.stroke();

      ctx.fillStyle = '#ffeb3b'; // Doodle yellow
      ctx.font = '900 36px "Chalkboard SE", "Comic Sans MS", sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(drawBannerText, W / 2, by + 40);
    }

    if (outcome && vTime > 2500) {
      completedRef.current = true;
      onAnimationComplete();
    }
  }, [outcome, spriteLoaded, imageError, onAnimationComplete]);

  // ============================================================
  // 3. THE GAME LOOP
  // ============================================================
  useEffect(() => {
    if (!spriteLoaded && !imageError) return;
    
    // Reset virtual timer whenever outcome changes
    completedRef.current = false;
    lastTimeRef.current = 0;
    if (outcome) virtualTimeRef.current = 0;

    if (reducedMotion && outcome) {
      setTimeout(() => onAnimationComplete(), 1000);
      return;
    }

    const loop = (timestamp: number) => {
      renderFrame(timestamp);
      if (!completedRef.current) {
        animRef.current = requestAnimationFrame(loop);
      }
    };

    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [outcome, spriteLoaded, imageError, reducedMotion, renderFrame]);

  return (
    <div className="w-full h-full rounded-xl overflow-hidden shadow-2xl border-4 border-[#558b2f]">
      <canvas 
        ref={canvasRef} 
        width={W} 
        height={H} 
        className="w-full h-full object-contain bg-[#689f38]"
      />
    </div>
  );
};

export default CricketCanvas;
