// ============================================================
// Grammar Cricket - Authentic Google Doodle Graphics
// Powered by the original svg-sprite.svg and cricket17.js coordinates
// ============================================================
import React, { useRef, useEffect, useCallback } from 'react';
import { CricketOutcome } from '../engine/GameState';

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
  
  const animRef = useRef<number>(0);
  const virtualTimeRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const completedRef = useRef<boolean>(false);

  const W = 800;
  const H = 480;
  const PITCH_Y = H * 0.65;
  const BATTING_X = W * 0.25;
  const BOWLING_X = W * 0.75;

  // ============================================================
  // AUTHENTIC SPRITE MAP (Extracted directly from cricket17.js)
  // Format: { x, y, w, h } mapped from the original arrays
  // ============================================================
  const SPRITES = {
    // Grasshopper (Wc)
    batter_idle: { x: 20, y: 146, w: 116, h: 193 },
    // Snail Bowler (cd, ed, fd)
    bowler_idle: { x: 20, y: 1262, w: 49, h: 81 },
    bowler_windup: { x: 20, y: 1550, w: 130, h: 212 },
    bowler_throw: { x: 20, y: 1783, w: 130, h: 225 },
    // Stumps (Dd) & Bails (ge)
    stump: { x: 20, y: 5705, w: 3, h: 21 },
    bails: { x: 20, y: 9914, w: 38, h: 31 },
    // Score Numbers (jd and Lf array from original source)
    num_4: { x: 20, y: 2781, w: 65, h: 72 },
    num_6: { x: 20, y: 2970, w: 53, h: 80 },
  };

  // Load the authentic SVG Sprite
  useEffect(() => {
    const img = new Image();
    img.src = '/svg-sprite.svg'; // Must be in your public folder!
    img.onload = () => {
      spriteRef.current = img;
      // Force an initial draw once the image loads
      if (!outcome) animate(performance.now()); 
    };
  }, []);

  const drawSprite = (
    ctx: CanvasRenderingContext2D, 
    spriteName: keyof typeof SPRITES, 
    dx: number, 
    dy: number, 
    scale: number = 1,
    flip: boolean = false
  ) => {
    if (!spriteRef.current) return;
    
    const s = SPRITES[spriteName];
    ctx.save();
    ctx.translate(dx, dy);
    if (flip) ctx.scale(-1, 1);
    
    // Original JS adds a 5px offset to handle bleeding/padding
    ctx.drawImage(
      spriteRef.current, 
      s.x - 5, s.y - 5, s.w + 10, s.h + 10,
      (-s.w / 2) * scale, (-s.h) * scale, (s.w + 10) * scale, (s.h + 10) * scale
    );
    ctx.restore();
  };

  const drawEnvironment = (ctx: CanvasRenderingContext2D) => {
    // Exact colors from the original Doodle
    ctx.fillStyle = '#8bc34a'; // Grass background
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#c5a365'; // Dirt Pitch
    ctx.beginPath();
    ctx.ellipse(W / 2, PITCH_Y, 280, 50, 0, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'; // Creases
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(BATTING_X, PITCH_Y - 40); ctx.lineTo(BATTING_X, PITCH_Y + 40); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(BOWLING_X, PITCH_Y - 40); ctx.lineTo(BOWLING_X, PITCH_Y + 40); ctx.stroke();
  };

  const drawOriginalBall = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    // The original JS draws the ball programmatically using Canvas arcs (M.call(this, ... "#b22"))
    ctx.fillStyle = '#bb2222';
    ctx.beginPath();
    ctx.arc(x, y - 5, 8, 0, Math.PI * 2);
    ctx.fill();
  };

  // ============================================================
  // ANIMATION LOOP
  // ============================================================
  const animate = useCallback((timestamp: number) => {
    const canvas = canvasRef.current;
    if (!canvas || !spriteRef.current) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (lastTimeRef.current === 0) lastTimeRef.current = timestamp;
    const dt = Math.min(timestamp - lastTimeRef.current, 50);
    lastTimeRef.current = timestamp;
    virtualTimeRef.current += dt;
    const vTime = virtualTimeRef.current;

    drawEnvironment(ctx);

    // State Configuration
    let bowlerSprite: keyof typeof SPRITES = 'bowler_idle';
    let ballX = BOWLING_X - 20;
    let ballY = PITCH_Y - 40;
    let showBall = false;
    let drawBanner = '';
    const IMPACT = 600;

    if (outcome) {
      // 1. Bowler Windup & Throw
      if (vTime > 100 && vTime < 300) bowlerSprite = 'bowler_windup';
      else if (vTime >= 300 && vTime < IMPACT) {
        bowlerSprite = 'bowler_throw';
        showBall = true;
        const t = (vTime - 300) / (IMPACT - 300);
        ballX = BOWLING_X - 20 - t * (BOWLING_X - BATTING_X);
        ballY = PITCH_Y - 40 - Math.sin(t * Math.PI) * 40;
      }
      
      // 2. Post-Impact Logic
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

    // Render Stumps (Non-Striker)
    for(let i=-10; i<=10; i+=10) drawSprite(ctx, 'stump', BOWLING_X + 25 + i, PITCH_Y, 2.5);
    drawSprite(ctx, 'bails', BOWLING_X + 25, PITCH_Y - 45, 1.2);

    // Render Characters
    drawSprite(ctx, bowlerSprite, BOWLING_X, PITCH_Y + 10, 0.9, true); // Bowler
    
    // Batter shake logic
    const batterShake = (outcome && vTime > IMPACT && vTime < IMPACT + 200) ? Math.sin(vTime) * 3 : 0;
    drawSprite(ctx, 'batter_idle', BATTING_X + batterShake, PITCH_Y + 15, 0.7); 

    // Render Stumps (Striker)
    if (outcome === 'bowled' && vTime >= IMPACT) {
      drawSprite(ctx, 'stump', BATTING_X - 20, PITCH_Y, 2.5, true); // Leaning over
    } else {
      for(let i=-10; i<=10; i+=10) drawSprite(ctx, 'stump', BATTING_X - 25 + i, PITCH_Y, 2.5);
      drawSprite(ctx, 'bails', BATTING_X - 25, PITCH_Y - 45, 1.2);
    }

    if (showBall) drawOriginalBall(ctx, ballX, ballY);

    // Draw Google's original authentic score graphic for boundaries!
    if (drawBanner && vTime > IMPACT + 300) {
      drawSprite(ctx, drawBanner as keyof typeof SPRITES, W / 2, H / 2 + 30, 2);
    }

    if (vTime > 2000) completedRef.current = true;
    if (completedRef.current) {
      onAnimationComplete();
      return;
    }
    animRef.current = requestAnimationFrame(animate);
  }, [outcome, onAnimationComplete]);

  useEffect(() => {
    completedRef.current = false;
    virtualTimeRef.current = 0;
    lastTimeRef.current = 0;
    
    if (reducedMotion && outcome) {
      setTimeout(() => onAnimationComplete(), 1000);
      return;
    }
    
    if (outcome) {
      animRef.current = requestAnimationFrame(animate);
    }
    return () => cancelAnimationFrame(animRef.current);
  }, [outcome, reducedMotion, onAnimationComplete, animate]);

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
