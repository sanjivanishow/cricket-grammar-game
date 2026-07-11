// ============================================================
// Grammar Cricket - Authentic Google Doodle Graphics
// Includes the Auto-Patching SVG Loader for Canvas Dimensions
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
  
  // State
  const [spriteLoaded, setSpriteLoaded] = useState(false);
  const [imageError, setImageError] = useState("");
  
  // Timers
  const animRef = useRef<number>(0);
  const virtualTimeRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const completedRef = useRef<boolean>(false);

  const W = 800;
  const H = 480;
  const PITCH_Y = H * 0.65;
  const BATTING_X = W * 0.25;
  const BOWLING_X = W * 0.75;

  const SPRITES = {
    batter_idle: { x: 20, y: 146, w: 116, h: 193 },
    bowler_idle: { x: 20, y: 1262, w: 49, h: 81 },
    bowler_windup: { x: 20, y: 1550, w: 130, h: 212 },
    bowler_throw: { x: 20, y: 1783, w: 130, h: 225 },
    stump: { x: 20, y: 5705, w: 3, h: 21 },
    bails: { x: 20, y: 9914, w: 38, h: 31 },
    num_4: { x: 20, y: 2781, w: 65, h: 72 },
    num_6: { x: 20, y: 2970, w: 53, h: 80 },
  };

  // ============================================================
  // 1. THE BULLETPROOF SVG LOADER
  // ============================================================
  useEffect(() => {
    let active = true;

    const loadAndPatchSprite = async () => {
      try {
        let svgText = "";
        
        // Handle Vite inlined data URIs vs normal paths
        if (spriteUrl.startsWith('data:image/svg+xml')) {
          const [header, data] = spriteUrl.split(',');
          svgText = header.includes('base64') ? atob(data) : decodeURIComponent(data);
        } else {
          const res = await fetch(spriteUrl);
          if (!res.ok) throw new Error("Failed to fetch SVG");
          svgText = await res.text();
        }

        // MAGIC FIX: Inject massive width and height so Canvas crop works!
        if (!svgText.includes('width=')) {
          svgText = svgText.replace('<svg', '<svg width="10000" height="10000"');
        }

        // Convert back to a Blob URL
        const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        
        const img = new Image();
        img.onload = () => {
          if (active) {
            spriteRef.current = img;
            setSpriteLoaded(true);
          }
        };
        img.onerror = () => { if (active) setImageError("Failed to decode patched SVG."); };
        img.src = url;

      } catch (err) {
        console.error(err);
        if (active) setImageError("Error loading SVG file.");
      }
    };

    loadAndPatchSprite();
    return () => { active = false; };
  }, []);

  // ============================================================
  // 2. THE RENDER ENGINE
  // ============================================================
  const drawSprite = (
    ctx: CanvasRenderingContext2D, 
    spriteName: keyof typeof SPRITES, 
    dx: number, dy: number, 
    scale: number = 1, flip: boolean = false
  ) => {
    if (!spriteRef.current) return;
    const s = SPRITES[spriteName];
    ctx.save();
    ctx.translate(dx, dy);
    if (flip) ctx.scale(-1, 1);
    
    // The -5 and +10 handles the exact padding Google used in their sheet
    ctx.drawImage(
      spriteRef.current, 
      s.x - 5, s.y - 5, s.w + 10, s.h + 10,
      (-s.w / 2) * scale, (-s.h) * scale, (s.w + 10) * scale, (s.h + 10) * scale
    );
    ctx.restore();
  };

  const drawEnvironment = (ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = '#8bc34a';
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#c5a365';
    ctx.beginPath();
    ctx.ellipse(W / 2, PITCH_Y, 280, 50, 0, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(BATTING_X, PITCH_Y - 40); ctx.lineTo(BATTING_X, PITCH_Y + 40); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(BOWLING_X, PITCH_Y - 40); ctx.lineTo(BOWLING_X, PITCH_Y + 40); ctx.stroke();
  };

  const drawOriginalBall = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    ctx.fillStyle = '#bb2222';
    ctx.beginPath(); ctx.arc(x, y - 5, 8, 0, Math.PI * 2); ctx.fill();
  };

  const renderFrame = useCallback((timestamp: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (lastTimeRef.current === 0) lastTimeRef.current = timestamp;
    const dt = Math.min(timestamp - lastTimeRef.current, 50);
    lastTimeRef.current = timestamp;

    // Only advance virtual time if an action is playing
    if (outcome) virtualTimeRef.current += dt;
    const vTime = virtualTimeRef.current;

    drawEnvironment(ctx);

    // Show explicit error if fetching failed
    if (imageError) {
      ctx.fillStyle = 'white';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`⚠️ ${imageError}`, W / 2, H / 2);
      ctx.fillText(`Make sure svg-sprite.svg is in src/assets/`, W / 2, H / 2 + 40);
      return;
    }

    if (!spriteLoaded) return; // Wait for image

    // Default Scene Setup
    let bowlerSprite: keyof typeof SPRITES = 'bowler_idle';
    let ballX = BOWLING_X - 20;
    let ballY = PITCH_Y - 40;
    let showBall = false;
    let drawBanner = '';
    const IMPACT = 600;

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
        if (outcome === 'six') {
          ballX = BATTING_X + t * W * 1.5;
          ballY = PITCH_Y - 40 - t * 300;
          drawBanner = 'num_6';
        } else if (outcome === 'four') {
          ballX = BATTING_X + t * W;
          ballY = PITCH_Y - 10 - Math.abs(Math.sin(vTime * 0.02) * 15);
          drawBanner = 'num_4';
        } else if (outcome === 'bowled') {
          ballX = BATTING_X - 50;
          ballY = PITCH_Y - 5;
        } else {
          ballX = BATTING_X + t * W * 0.4;
          ballY = PITCH_Y - 5;
        }
      }
    }

    // Draw Non-Striker Wickets
    for(let i=-10; i<=10; i+=10) drawSprite(ctx, 'stump', BOWLING_X + 25 + i, PITCH_Y, 2.5);
    drawSprite(ctx, 'bails', BOWLING_X + 25, PITCH_Y - 45, 1.2);

    // Draw Bowler
    drawSprite(ctx, bowlerSprite, BOWLING_X, PITCH_Y + 10, 0.9, true);
    
    // Draw Batter (Shakes on impact, bobs up and down gently when idle)
    const batterShake = (outcome && vTime > IMPACT && vTime < IMPACT + 200) ? Math.sin(vTime) * 3 : 0;
    const idleBob = (!outcome) ? Math.sin(timestamp * 0.003) * 3 : 0;
    drawSprite(ctx, 'batter_idle', BATTING_X + batterShake, PITCH_Y + 15 + idleBob, 0.7); 

    // Draw Striker Wickets
    if (outcome === 'bowled' && vTime >= IMPACT) {
      drawSprite(ctx, 'stump', BATTING_X - 20, PITCH_Y, 2.5, true); // Leaning out of the ground
    } else {
      for(let i=-10; i<=10; i+=10) drawSprite(ctx, 'stump', BATTING_X - 25 + i, PITCH_Y, 2.5);
      drawSprite(ctx, 'bails', BATTING_X - 25, PITCH_Y - 45, 1.2);
    }

    if (showBall) drawOriginalBall(ctx, ballX, ballY);

    if (drawBanner && vTime > IMPACT + 300) {
      drawSprite(ctx, drawBanner as keyof typeof SPRITES, W / 2, H / 2 + 30, 2);
    }

    if (outcome && vTime > 2000) {
      completedRef.current = true;
      onAnimationComplete();
    }
  }, [outcome, spriteLoaded, imageError, onAnimationComplete]);

  // ============================================================
  // 3. THE GAME LOOP
  // ============================================================
  useEffect(() => {
    if (!spriteLoaded && !imageError) return;
    
    // Reset state whenever outcome changes
    completedRef.current = false;
    lastTimeRef.current = 0;
    if (outcome) virtualTimeRef.current = 0;

    // Check for reduced motion
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
        className="w-full h-full object-contain bg-[#8bc34a]"
      />
    </div>
  );
};

export default CricketCanvas;
