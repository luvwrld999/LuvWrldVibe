import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Ghost, Heart, Play, RotateCcw, Trophy, Calendar } from 'lucide-react';

// --- Constants & Types ---

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 450;
const PLAYER_SIZE = 32;
const ENEMY_TYPES = ['bat', 'demon', 'skeleton', 'hunter', 'dodger'] as const;
type EnemyType = (typeof ENEMY_TYPES)[number];

type WorldType = 'graveyard' | 'forest' | 'crypt' | 'disco' | 'gold_mine' | 'gg' | 'halloween' | 'christmas' | 'new_year' | 'valentines' | 'easter' | 'out_of_this_world';

interface Objective {
  text: string;
  target: number;
  current: number;
  type: 'wisps' | 'boss' | 'score' | 'enemies';
}

interface LeaderboardEntry {
  score: number;
  date: string;
  name: string;
}

interface FloatingText {
  x: number;
  y: number;
  text: string;
  life: number;
  color: string;
}

interface Boss {
  x: number;
  y: number;
  health: number;
  maxHealth: number;
  active: boolean;
  phase: number;
  lastAttack: number;
  attackPattern: number;
  telegraphing: boolean;
}

interface Point {
  x: number;
  y: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
  type?: 'fiery' | 'wispy' | 'normal';
}

// --- Game Classes ---

class Bullet {
  x: number;
  y: number;
  radius = 4;
  speed = 7;
  active = true;
  damage: number;

  constructor(x: number, y: number, damage = 1) {
    this.x = x;
    this.y = y;
    this.damage = damage;
  }

  update() {
    this.x += this.speed;
    if (this.x > CANVAS_WIDTH) this.active = false;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    // Glow
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#a855f7';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
}

class Wisp {
  x: number;
  y: number;
  radius = 8;
  speed = 2;
  active = true;
  angle = 0;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  update() {
    this.x -= this.speed;
    this.y += Math.sin(this.angle) * 1;
    this.angle += 0.1;
    if (this.x < -this.radius) this.active = false;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.x, this.y);
    
    // Draw small coin
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Inner circle
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius - 3, 0, Math.PI * 2);
    ctx.stroke();
    
    // Glow
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#facc15';
    ctx.stroke();
    
    ctx.restore();
  }
}

class Enemy {
  x: number;
  y: number;
  type: EnemyType;
  width = 40;
  height = 40;
  speed: number;
  active = true;
  health: number;
  maxHealth: number;
  lastHit = 0;
  sinModifier = 0;
  sinSpeed = 0;
  passed = false;

  constructor(x: number, y: number, type: EnemyType, difficulty: number) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.speed = (2 + Math.random() * 2) * (1 + difficulty * 0.1);
    
    switch (type) {
      case 'bat':
        this.health = 1;
        break;
      case 'demon':
        this.health = 2;
        this.speed *= 1.2;
        break;
      case 'skeleton':
        this.health = 1;
        this.speed *= 0.8;
        break;
      case 'hunter':
        this.health = 2;
        this.speed *= 0.7;
        break;
      case 'dodger':
        this.health = 1;
        this.speed *= 1.1;
        break;
    }
    this.maxHealth = this.health;
  }

  update(playerY: number, bullets: Bullet[], slowTime: boolean) {
    const timeMultiplier = slowTime ? 0.3 : 1;
    this.x -= this.speed * timeMultiplier;
    
    if (this.type === 'bat') {
      this.y += Math.sin(Date.now() * 0.01) * this.sinModifier * timeMultiplier;
    } else if (this.type === 'hunter') {
      // Pursue player
      const dy = playerY - this.y;
      this.y += Math.sign(dy) * 1.5 * timeMultiplier;
    } else if (this.type === 'dodger') {
      // Dodge bullets
      bullets.forEach(b => {
        const dx = b.x - this.x;
        const dy = b.y - this.y;
        if (dx > -100 && dx < 0 && Math.abs(dy) < 50) {
          this.y += Math.sign(dy) * -3 * timeMultiplier;
        }
      });
    }

    if (this.x < -this.width) this.active = false;
  }

  draw(ctx: CanvasRenderingContext2D, world: WorldType) {
    ctx.save();
    ctx.translate(this.x, this.y);
    
    // Hit Flash
    const now = Date.now();
    const time = now * 0.01;
    if (now - this.lastHit < 100) {
      ctx.fillStyle = '#fff';
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#fff';
      ctx.beginPath();
      ctx.roundRect(0, 0, this.width, this.height, 8);
      ctx.fill();
      ctx.restore();
      return;
    }
    const flap = Math.sin(time * 2) * 10;

    if (world === 'gg') {
      if (this.type === 'bat') {
        // Detailed Chinese Carryout Box
        // Noodles hanging out
        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(15, 5);
        ctx.quadraticCurveTo(10, -5, 5, 10);
        ctx.moveTo(25, 5);
        ctx.quadraticCurveTo(30, -5, 35, 10);
        ctx.stroke();

        // Box body
        ctx.fillStyle = '#f3f4f6';
        ctx.beginPath();
        ctx.moveTo(5, 5);
        ctx.lineTo(35, 5);
        ctx.lineTo(30, 35);
        ctx.lineTo(10, 35);
        ctx.closePath();
        ctx.fill();
        
        // Flaps
        ctx.fillStyle = '#e5e7eb';
        ctx.beginPath();
        ctx.moveTo(5, 5);
        ctx.lineTo(20, -5);
        ctx.lineTo(35, 5);
        ctx.closePath();
        ctx.fill();

        // Box outlines
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Fold lines
        ctx.beginPath();
        ctx.moveTo(10, 35);
        ctx.lineTo(15, 5);
        ctx.moveTo(30, 35);
        ctx.lineTo(25, 5);
        ctx.stroke();

        // Handle
        ctx.strokeStyle = '#9ca3af';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(8, 10);
        ctx.quadraticCurveTo(20, -15, 32, 10);
        ctx.stroke();
        
        // Logo (Pagoda instead of text)
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(17, 15, 6, 2);
        ctx.fillRect(16, 18, 8, 2);
        ctx.fillRect(15, 21, 10, 2);
        ctx.fillRect(18, 23, 4, 6);
        ctx.fillRect(14, 29, 12, 2);
      } else if (this.type === 'demon') {
        // Mug of Coffee
        const hover = Math.sin(time) * 3;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.roundRect(10, 10 + hover, 20, 25, 4);
        ctx.fill();
        // Handle
        ctx.beginPath();
        ctx.arc(30, 22 + hover, 6, -Math.PI/2, Math.PI/2);
        ctx.stroke();
        // Coffee
        ctx.fillStyle = '#451a03';
        ctx.fillRect(12, 12 + hover, 16, 4);
        // Steam
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.beginPath();
        ctx.moveTo(15, 8 + hover);
        ctx.quadraticCurveTo(12, 4 + hover, 15, 0 + hover);
        ctx.moveTo(25, 8 + hover);
        ctx.quadraticCurveTo(22, 4 + hover, 25, 0 + hover);
        ctx.stroke();
      } else if (this.type === 'skeleton') {
        // Cowgirl Boots
        ctx.fillStyle = '#78350f';
        ctx.beginPath();
        ctx.moveTo(10, 5);
        ctx.lineTo(25, 5);
        ctx.lineTo(25, 25);
        ctx.lineTo(35, 35);
        ctx.lineTo(10, 35);
        ctx.closePath();
        ctx.fill();
        // Heel
        ctx.fillStyle = '#451a03';
        ctx.fillRect(10, 35, 5, 5);
        // Detail
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(15, 10);
        ctx.lineTo(20, 20);
        ctx.stroke();
      } else {
        // Default for other types in GG
        ctx.fillStyle = '#facc15';
        ctx.fillRect(0, 0, this.width, this.height);
      }
      ctx.restore();
      this.drawHealth(ctx);
      return;
    }
    
    if (this.type === 'bat') {
      // Pixel Bat
      ctx.fillStyle = '#1e293b';
      // Body
      ctx.fillRect(12, 12, 16, 16);
      // Ears
      ctx.fillRect(12, 8, 4, 4);
      ctx.fillRect(24, 8, 4, 4);
      // Wings
      ctx.fillRect(4, 16 + flap, 8, 8);
      ctx.fillRect(0, 12 + flap, 4, 4);
      ctx.fillRect(28, 16 + flap, 8, 8);
      ctx.fillRect(36, 12 + flap, 4, 4);
      // Eyes
      ctx.fillStyle = '#ef4444';
      ctx.shadowBlur = 5;
      ctx.shadowColor = '#ef4444';
      ctx.fillRect(16, 16, 2, 2);
      ctx.fillRect(22, 16, 2, 2);
      ctx.shadowBlur = 0;
    } else if (this.type === 'demon') {
      // Pixel Demon
      const hover = Math.sin(time) * 3;
      ctx.fillStyle = '#991b1b';
      // Body
      ctx.fillRect(8, 10 + hover, 24, 24);
      // Horns
      ctx.fillStyle = '#450a0a';
      ctx.fillRect(8, 6 + hover, 4, 4);
      ctx.fillRect(4, 2 + hover, 4, 4);
      ctx.fillRect(28, 6 + hover, 4, 4);
      ctx.fillRect(32, 2 + hover, 4, 4);
      // Eyes
      ctx.fillStyle = '#facc15';
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#facc15';
      ctx.fillRect(12, 16 + hover, 4, 4);
      ctx.fillRect(24, 16 + hover, 4, 4);
      ctx.shadowBlur = 0;
      // Mouth
      ctx.fillStyle = '#450a0a';
      ctx.fillRect(16, 26 + hover, 8, 4);
    } else if (this.type === 'skeleton') {
      // Pixel Skeleton
      ctx.fillStyle = '#f3f4f6';
      // Skull
      ctx.fillRect(10, 4, 20, 16);
      // Jaw
      ctx.fillRect(14, 20, 12, 6);
      // Eyes
      ctx.fillStyle = '#111827';
      ctx.fillRect(14, 10, 4, 4);
      ctx.fillRect(22, 10, 4, 4);
      // Nose
      ctx.fillRect(18, 16, 4, 2);
      // Teeth
      ctx.fillStyle = '#9ca3af';
      ctx.fillRect(16, 22, 2, 4);
      ctx.fillRect(22, 22, 2, 4);
    } else if (this.type === 'hunter') {
      // Pixel Hunter
      ctx.fillStyle = '#1e1b4b';
      // Cloak
      ctx.fillRect(10, 10, 20, 24);
      ctx.fillRect(6, 14, 4, 16);
      ctx.fillRect(30, 14, 4, 16);
      ctx.fillRect(8, 34, 24, 4);
      // Hood opening
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(14, 14, 12, 10);
      // Eyes
      ctx.fillStyle = '#22c55e';
      ctx.shadowBlur = 5;
      ctx.shadowColor = '#22c55e';
      ctx.fillRect(16, 18, 2, 2);
      ctx.fillRect(22, 18, 2, 2);
      ctx.shadowBlur = 0;
    } else if (this.type === 'dodger') {
      // Pixel Dodger
      ctx.fillStyle = '#06b6d4';
      // Body
      ctx.fillRect(12, 12, 16, 16);
      ctx.fillRect(16, 8, 8, 4);
      ctx.fillRect(16, 28, 8, 4);
      ctx.fillRect(8, 16, 4, 8);
      ctx.fillRect(28, 16, 4, 8);
      // Core
      ctx.fillStyle = '#fff';
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#06b6d4';
      ctx.fillRect(16, 16, 8, 8);
      ctx.shadowBlur = 0;
    }
    
    ctx.restore();
    this.drawHealth(ctx);
  }

  private drawHealth(ctx: CanvasRenderingContext2D) {
    // Health Bar
    if (this.health < this.maxHealth) {
      const barWidth = 30;
      const barHeight = 4;
      ctx.fillStyle = '#334155';
      ctx.fillRect(this.x + (this.width - barWidth) / 2, this.y - 10, barWidth, barHeight);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(this.x + (this.width - barWidth) / 2, this.y - 10, (this.health / this.maxHealth) * barWidth, barHeight);
    }
  }
}

class PowerUp {
  x: number;
  y: number;
  type: 'upgrade' | 'shield' | 'life' | 'invincible' | 'magnet' | 'coin' | 'spread' | 'rapid' | 'power' | 'slow_time' | 'energy_drink';
  upgradeType?: 'speed' | 'damage' | 'maxLives';
  radius = 15;
  speed = 3;
  active = true;

  constructor(x: number, y: number, type: 'upgrade' | 'shield' | 'life' | 'invincible' | 'magnet' | 'coin' | 'spread' | 'rapid' | 'power' | 'slow_time' | 'energy_drink', upgradeType?: 'speed' | 'damage' | 'maxLives') {
    this.x = x;
    this.y = y;
    this.type = type;
    this.upgradeType = upgradeType;
  }

  update() {
    this.x -= this.speed;
    if (this.x < -this.radius) this.active = false;
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (this.type === 'energy_drink') {
      // Draw Red Bull can
      ctx.fillStyle = '#cbd5e1'; // Silver
      ctx.fillRect(this.x - 8, this.y - 12, 16, 24);
      ctx.fillStyle = '#3b82f6'; // Blue
      ctx.fillRect(this.x - 8, this.y - 6, 16, 12);
      ctx.fillStyle = '#ef4444'; // Red logo
      ctx.beginPath();
      ctx.arc(this.x, this.y, 4, 0, Math.PI * 2);
      ctx.fill();
      // Can top
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.ellipse(this.x, this.y - 12, 8, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      // Can bottom
      ctx.beginPath();
      ctx.ellipse(this.x, this.y + 12, 8, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // Glow
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#3b82f6';
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.strokeRect(this.x - 8, this.y - 12, 16, 24);
      ctx.shadowBlur = 0;
      return;
    }

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();

    const colors = {
      upgrade: '#fbbf24',
      shield: '#3b82f6',
      life: '#ef4444',
      invincible: '#ffffff',
      magnet: '#a855f7',
      coin: '#facc15',
      spread: '#22c55e',
      rapid: '#06b6d4',
      power: '#f97316',
      slow_time: '#60a5fa'
    };

    ctx.fillStyle = colors[this.type as keyof typeof colors];
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    let icon = '';
    if (this.type === 'upgrade') {
      icon = this.upgradeType === 'speed' ? '⚡' : this.upgradeType === 'damage' ? '⚔️' : '❤️+';
    } else if (this.type === 'coin') {
      icon = '💰';
    } else if (this.type === 'spread') {
      icon = '🔱';
    } else if (this.type === 'rapid') {
      icon = '⏩';
    } else if (this.type === 'power') {
      icon = '💥';
    } else if (this.type === 'slow_time') {
      icon = '⏱️';
    } else {
      icon = this.type === 'invincible' ? '⭐' : this.type === 'magnet' ? '🧲' : this.type[0].toUpperCase();
    }
    ctx.fillText(icon, this.x, this.y);
  }
}

// --- Sound Manager ---

class SoundManager {
  ctx: AudioContext | null = null;
  musicGain: GainNode | null = null;
  musicInterval: any = null;
  beatCount = 0;

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  private playTone(freq: number, type: OscillatorType, duration: number, volume: number, slideTo?: number) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    if (slideTo) {
      osc.frequency.exponentialRampToValueAtTime(slideTo, this.ctx.currentTime + duration);
    }

    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  startMusic() {
    if (!this.ctx) return;
    this.stopMusic();
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.05;
    this.musicGain.connect(this.ctx.destination);
    this.updateMusic('normal');
  }

  stopMusic() {
    if (this.musicInterval) clearInterval(this.musicInterval);
  }

  updateMusic(intensity: 'normal' | 'boss') {
    if (!this.ctx) return;
    if (this.musicInterval) clearInterval(this.musicInterval);
    const tempo = intensity === 'boss' ? 300 : 500;
    this.musicInterval = setInterval(() => {
      this.playBeat(intensity);
    }, tempo);
  }

  private playBeat(intensity: 'normal' | 'boss' = 'normal') {
    if (!this.ctx || !this.musicGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    
    osc.type = intensity === 'boss' ? 'sawtooth' : 'sine';
    const freq = this.beatCount % 4 === 0 ? 110 : 82.41;
    osc.frequency.setValueAtTime(freq, t);
    
    g.gain.setValueAtTime(0.1, t);
    g.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
    
    osc.connect(g);
    g.connect(this.musicGain);
    
    osc.start(t);
    osc.stop(t + 0.2);
    this.beatCount++;
  }

  click() {
    this.playTone(440, 'sine', 0.05, 0.1, 220);
  }

  nav() {
    this.playTone(660, 'sine', 0.03, 0.05, 880);
  }

  costumeVibe() {
    this.playTone(880, 'sine', 0.2, 0.3, 440);
    setTimeout(() => this.playTone(1320, 'sine', 0.2, 0.3, 660), 100);
  }

  costumeDance() {
    this.playTone(220, 'square', 0.1, 0.2, 440);
    setTimeout(() => this.playTone(330, 'square', 0.1, 0.2, 660), 50);
  }

  shoot() {
    this.playTone(880, 'square', 0.1, 0.1, 110);
  }

  collect() {
    this.playTone(523.25, 'sine', 0.2, 0.2, 1046.5);
  }

  explosion() {
    this.playTone(150, 'sawtooth', 0.3, 0.1, 40);
  }

  powerup() {
    this.playTone(440, 'sine', 0.1, 0.2, 880);
    setTimeout(() => this.playTone(660, 'sine', 0.1, 0.2, 1320), 50);
  }

  slowTime() {
    this.playTone(880, 'sine', 0.5, 0.2, 220); // Pitch down effect
  }

  hit() {
    this.playTone(100, 'sawtooth', 0.2, 0.2, 10);
  }

  gameover() {
    this.playTone(440, 'sawtooth', 0.5, 0.2, 110);
  }
}

const HOLIDAYS = [
  { id: 'halloween', name: 'Hallowed Hollow', date: { month: 9, day: 31 }, icon: '🎃', desc: 'Play Oct 24 - Nov 7' },
  { id: 'christmas', name: 'Winter Wonderland', date: { month: 11, day: 25 }, icon: '🎄', desc: 'Play Dec 18 - Jan 1' },
  { id: 'new_year', name: 'Midnight Gala', date: { month: 0, day: 1 }, icon: '🎆', desc: 'Play Dec 25 - Jan 8' },
  { id: 'valentines', name: 'Love Labyrinth', date: { month: 1, day: 14 }, icon: '💝', desc: 'Play Feb 7 - Feb 21' },
  { id: 'easter', name: 'Easter Egg-stravaganza', date: { month: 3, day: 1 }, icon: '🐰', desc: 'Play Mar 25 - Apr 8' },
];

const soundManager = new SoundManager();

const PreviewCanvas = ({ customization }: { customization: any }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const trailRef = useRef<Point[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    const render = () => {
      const now = Date.now();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const ghostX = canvas.width / 2 + Math.sin(now * 0.005) * 50;
      const ghostY = canvas.height / 2 + Math.cos(now * 0.005) * 10;
      
      trailRef.current.unshift({ x: ghostX, y: ghostY });
      if (trailRef.current.length > 20) trailRef.current.pop();
      
      // Draw Trail
      trailRef.current.forEach((p, i) => {
        const alpha = 1 - i / 20;
        ctx.save();
        ctx.globalAlpha = alpha;
        
        if (customization.costume === 'vibe_coding') {
          const hue = (now * 0.1 + i * 10) % 360;
          ctx.fillStyle = `hsla(${hue}, 100%, 70%, ${alpha})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, (PLAYER_SIZE / 2) * alpha, 0, Math.PI * 2);
          ctx.fill();
        } else if (customization.trailPattern === 'ripple') {
          const r = (PLAYER_SIZE / 2) * alpha * (1 + Math.sin(now * 0.01 + i) * 0.5);
          ctx.beginPath();
          ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
          ctx.strokeStyle = customization.trailColor + Math.floor(alpha * 128).toString(16).padStart(2, '0');
          ctx.lineWidth = 2 * alpha;
          ctx.stroke();
        } else if (customization.costume === 'cosmic_wanderer') {
          const r = (PLAYER_SIZE / 1.5) * alpha;
          const hue = (now * 0.1 + i * 10) % 360;
          
          // Multiple offset gradients
          for (let k = 0; k < 3; k++) {
            const offset = k * 5;
            const grad = ctx.createRadialGradient(p.x + offset, p.y + offset, 0, p.x + offset, p.y + offset, r);
            grad.addColorStop(0, `hsla(${hue + k * 20}, 80%, 60%, ${alpha * (0.4 - k * 0.1)})`);
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(p.x + offset, p.y + offset, r, 0, Math.PI * 2);
            ctx.fill();
          }
        } else if (customization.trailPattern === 'starry') {
          const r = (PLAYER_SIZE / 2) * alpha * (0.8 + Math.sin(now * 0.01 + i) * 0.2);
          ctx.beginPath();
          for (let j = 0; j < 5; j++) {
            const angle = (j * 4 * Math.PI) / 5 - Math.PI / 2 + now * 0.002;
            ctx.lineTo(p.x + Math.cos(angle) * r, p.y + Math.sin(angle) * r);
          }
          ctx.closePath();
          ctx.fillStyle = customization.trailColor;
          ctx.fill();
        } else {
          ctx.fillStyle = customization.trailColor;
          ctx.beginPath();
          ctx.arc(p.x, p.y, (PLAYER_SIZE / 2) * alpha, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });

      // Draw Ghost
      ctx.save();
      ctx.translate(ghostX, ghostY);
      
      if (customization.costume === 'ghostly_dance') {
        const pulse = 1.0 + (Math.sin(now * 0.01) * 0.1);
        ctx.scale(pulse, pulse);
      }
      
      ctx.shadowBlur = 15;
      ctx.shadowColor = customization.ghostColor;
      
      if (customization.costume === 'vibe_coding') {
        const grad = ctx.createLinearGradient(-15, -15, 15, 15);
        grad.addColorStop(0, `hsl(${(now * 0.1) % 360}, 100%, 70%)`);
        grad.addColorStop(1, `hsl(${(now * 0.1 + 180) % 360}, 100%, 70%)`);
        ctx.fillStyle = grad;
      } else if (customization.costume === 'cosmic_wanderer') {
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, 15);
        grad.addColorStop(0, '#4c1d95');
        grad.addColorStop(1, '#1e1b4b');
        ctx.fillStyle = grad;
      } else {
        ctx.fillStyle = customization.ghostColor;
      }

      ctx.beginPath();
      ctx.arc(0, 0, 15, Math.PI, 0);
      ctx.lineTo(15, 15);
      ctx.lineTo(-15, 15);
      ctx.closePath();
      ctx.fill();
      
      if (customization.costume === 'cosmic_wanderer') {
        ctx.fillStyle = '#fff';
        for (let i = 0; i < 3; i++) {
          ctx.fillRect(Math.sin(now * 0.01 + i) * 8, Math.cos(now * 0.01 + i) * 8, 1, 1);
        }
      }

      ctx.restore();
      animationFrameId = requestAnimationFrame(render);
    };
    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [customization]);

  return <canvas ref={canvasRef} width={200} height={100} className="w-full h-full" />;
};

// --- Main Component ---

export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'start_menu' | 'leaderboard' | 'intro' | 'playing' | 'gameover' | 'shop' | 'settings' | 'customization' | 'holiday_craze'>('start_menu');
  const [isPaused, setIsPaused] = useState(false);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [lives, setLives] = useState(5);
  const [maxLives, setMaxLives] = useState(5);
  const [highScore, setHighScore] = useState(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([
    { name: 'GMI', score: 1999999999, date: new Date().toLocaleDateString() },
    { name: 'VBE', score: 1000000000, date: new Date().toLocaleDateString() },
    { name: 'LUV', score: 999999999, date: new Date().toLocaleDateString() }
  ]);
  const [screenShake, setScreenShake] = useState(0);
  const [lastExtraLifeScore, setLastExtraLifeScore] = useState(0);
  const [coins, setCoins] = useState(0);
  const [upgrades, setUpgrades] = useState({
    speed: 0,
    damage: 1,
    maxLives: 5
  });
  const [showInitialsPrompt, setShowInitialsPrompt] = useState(false);
  const [initials, setInitials] = useState('');
  const [tempScore, setTempScore] = useState(0);
  const [settings, setSettings] = useState({ invertControls: false, screenShakeIntensity: 100 });
  const [customization, setCustomization] = useState({ 
    ghostColor: '#a855f7', 
    trailColor: '#d8b4fe',
    costume: 'none' as 'none' | 'ghostly_dance' | 'vibe_coding' | 'cosmic_wanderer' | 'gameboy',
    trailPattern: 'standard' as 'standard' | 'starry' | 'glitch' | 'sparkle' | 'ripple' | 'fire'
  });
  const [unlockedWorlds, setUnlockedWorlds] = useState<WorldType[]>(['graveyard', 'gg']);
  const [selectedWorld, setSelectedWorld] = useState<WorldType>('graveyard');
  const [objective, setObjective] = useState<Objective | null>(null);
  const [tutorialStep, setTutorialStep] = useState<number | null>(null);
  const [hasCompletedTutorial, setHasCompletedTutorial] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [purchasedWorld, setPurchasedWorld] = useState<{ name: string, icon: string } | null>(null);
  const [unlockedCostumes, setUnlockedCostumes] = useState<string[]>(['none', 'ghostly_dance', 'gameboy']);

  useEffect(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentDay = now.getDate();
    
    const newUnlocked = [...unlockedWorlds];
    let changed = false;

    HOLIDAYS.forEach(holiday => {
      const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];
      let isUnlocked = false;
      years.forEach(year => {
        const holidayDate = new Date(year, holiday.date.month, holiday.date.day);
        const diffTime = Math.abs(now.getTime() - holidayDate.getTime());
        const diffDays = diffTime / (1000 * 60 * 60 * 24);
        if (diffDays <= 7) isUnlocked = true;
      });
      
      if (isUnlocked && !newUnlocked.includes(holiday.id as WorldType)) {
        newUnlocked.push(holiday.id as WorldType);
        changed = true;
      }
    });

    if (changed) {
      setUnlockedWorlds(newUnlocked);
    }
  }, []);

  // Game Engine Refs
  const playerRef = useRef({
    x: 100,
    y: 225,
    vy: 0,
    targetY: 225,
    trail: [] as Point[],
    bullets: [] as Bullet[],
    powerUpTimer: 0,
    powerUpType: null as 'shield' | 'invincible' | 'magnet' | null,
    slowTimeTimer: 0,
    shield: false,
    invincible: false,
    magnet: false,
    lastShot: 0,
    lastHit: 0,
    upgrades: {
      speed: 0,
      damage: 1,
      maxLives: 5,
      spread: 0,
      bulletSpeed: 0,
      bulletPower: 0
    },
    form: 'standard' as 'standard' | 'wide' | 'fast' | 'powerful'
  });

  const entitiesRef = useRef({
    enemies: [] as Enemy[],
    wisps: [] as Wisp[],
    powerups: [] as PowerUp[],
    particles: [] as Particle[],
    floatingTexts: [] as FloatingText[],
    respawnQueue: [] as { type: EnemyType, time: number }[],
    boss: null as Boss | null,
    difficulty: 1,
    lastSpawn: 0,
    lastWisp: 0,
    lastPowerup: 0,
    bgX: 0,
    nextBossScore: 1000,
    introTimer: 0,
    gameStartTime: 0
  });

  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        const scaleX = width / CANVAS_WIDTH;
        const scaleY = height / CANVAS_HEIGHT;
        setScale(Math.min(scaleX, scaleY));
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (purchasedWorld) {
      const timer = setTimeout(() => setPurchasedWorld(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [purchasedWorld]);

  const keysRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const savedLeaderboard = localStorage.getItem('ghost_shooter_leaderboard_v2');
    if (savedLeaderboard) {
      const parsed = JSON.parse(savedLeaderboard);
      setLeaderboard(parsed);
      if (parsed.length > 0) setHighScore(parsed[0].score);
    } else {
      const defaults = [
        { name: 'GMI', score: 1999999999, date: new Date().toLocaleDateString() },
        { name: 'VBE', score: 1000000000, date: new Date().toLocaleDateString() },
        { name: 'LUV', score: 999999999, date: new Date().toLocaleDateString() }
      ];
      setLeaderboard(defaults);
      setHighScore(defaults[0].score);
      localStorage.setItem('ghost_shooter_leaderboard_v2', JSON.stringify(defaults));
    }
    const savedCoins = localStorage.getItem('ghost_shooter_coins');
    if (savedCoins) setCoins(parseInt(savedCoins));
    const savedUpgrades = localStorage.getItem('ghost_shooter_upgrades');
    if (savedUpgrades) setUpgrades(JSON.parse(savedUpgrades));
    
    const savedSettings = localStorage.getItem('ghost_shooter_settings');
    if (savedSettings) setSettings(JSON.parse(savedSettings));
    
    const savedCustomization = localStorage.getItem('ghost_shooter_customization');
    if (savedCustomization) setCustomization(JSON.parse(savedCustomization));
    
    const savedUnlockedWorlds = localStorage.getItem('ghost_shooter_worlds');
    if (savedUnlockedWorlds) setUnlockedWorlds(JSON.parse(savedUnlockedWorlds));
    
    const savedUnlockedCostumes = localStorage.getItem('ghost_shooter_costumes');
    if (savedUnlockedCostumes) setUnlockedCostumes(JSON.parse(savedUnlockedCostumes));
    
    const savedTutorial = localStorage.getItem('ghost_shooter_tutorial');
    if (savedTutorial) setHasCompletedTutorial(JSON.parse(savedTutorial));
  }, []);

  useEffect(() => {
    localStorage.setItem('ghost_shooter_coins', coins.toString());
    localStorage.setItem('ghost_shooter_upgrades', JSON.stringify(upgrades));
    localStorage.setItem('ghost_shooter_settings', JSON.stringify(settings));
    localStorage.setItem('ghost_shooter_customization', JSON.stringify(customization));
    localStorage.setItem('ghost_shooter_worlds', JSON.stringify(unlockedWorlds));
    localStorage.setItem('ghost_shooter_costumes', JSON.stringify(unlockedCostumes));
    localStorage.setItem('ghost_shooter_tutorial', JSON.stringify(hasCompletedTutorial));
    playerRef.current.upgrades = upgrades;
  }, [coins, upgrades, settings, customization, unlockedWorlds, unlockedCostumes, hasCompletedTutorial]);

  const isHighScore = (newScore: number) => {
    if (newScore <= 0) return false;
    if (leaderboard.length < 20) return true;
    return newScore > leaderboard[leaderboard.length - 1].score;
  };

  const saveScore = (newScore: number, name: string) => {
    const newEntry: LeaderboardEntry = {
      score: newScore,
      date: new Date().toLocaleDateString(),
      name: name.toUpperCase() || 'GHO'
    };
    const newLeaderboard = [...leaderboard, newEntry]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
    setLeaderboard(newLeaderboard);
    setHighScore(newLeaderboard[0].score);
    localStorage.setItem('ghost_shooter_leaderboard_v2', JSON.stringify(newLeaderboard));
  };

  const resetHighScores = () => {
    const newLeaderboard = leaderboard.slice(0, 3);
    setLeaderboard(newLeaderboard);
    setHighScore(newLeaderboard[0].score);
    localStorage.setItem('ghost_shooter_leaderboard_v2', JSON.stringify(newLeaderboard));
    soundManager.click();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState === 'start_menu') {
        soundManager.init();
      }
      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (gameState === 'playing') setIsPaused(prev => !prev);
      }
      keysRef.current.add(e.code);
    };
    const handleKeyUp = (e: KeyboardEvent) => keysRef.current.delete(e.code);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState]);

  const setScreenShakeWithIntensity = (amount: number) => {
    setScreenShake(amount * (settings.screenShakeIntensity / 100));
  };

  const spawnExplosion = (x: number, y: number, color: string) => {
    for (let i = 0; i < 10; i++) {
      entitiesRef.current.particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10,
        life: 1,
        color,
        size: Math.random() * 4 + 2
      });
    }
  };

  const triggerGameOver = (finalScore: number) => {
    soundManager.stopMusic();
    if (isHighScore(finalScore)) {
      setTempScore(finalScore);
      setShowInitialsPrompt(true);
    } else {
      setGameState('gameover');
    }
    soundManager.gameover();
  };

  const resetGame = () => {
    soundManager.init();
    soundManager.startMusic();
    setScore(0);
    setCombo(0);
    setLives(upgrades.maxLives);
    setMaxLives(upgrades.maxLives);
    setLastExtraLifeScore(0);
    setIsPaused(false);
    setObjective(null);
    
    if (!hasCompletedTutorial) {
      setTutorialStep(0);
      setObjective({ text: 'Move with WASD or Arrows', target: 1, current: 0, type: 'score' });
    } else {
      setTutorialStep(null);
    }

    playerRef.current = {
      x: 100,
      y: 225,
      vy: 0,
      targetY: 225,
      trail: [],
      bullets: [],
      powerUpTimer: 0,
      powerUpType: null,
      shield: false,
      invincible: false,
      magnet: false,
      lastShot: 0,
      upgrades: upgrades
    };
    entitiesRef.current = {
      enemies: [],
      wisps: [],
      powerups: [],
      particles: [],
      floatingTexts: [],
      respawnQueue: [],
      boss: null,
      difficulty: 1,
      lastSpawn: 0,
      lastWisp: 0,
      lastPowerup: 0,
      bgX: 0,
      nextBossScore: 5000,
      introTimer: 180 // 3 seconds at 60fps
    };
    entitiesRef.current.gameStartTime = Date.now();
    setGameState('intro');
  };

  const spawnFloatingText = (x: number, y: number, text: string, color: string) => {
    entitiesRef.current.floatingTexts.push({ x, y, text, life: 1, color });
  };

  useEffect(() => {
    if (gameState === 'start' || isPaused || gameState === 'gameover') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const loop = () => {
      if (isPaused) return;
      const now = Date.now();
      
      // --- Update ---
      const entities = entitiesRef.current;
      const player = playerRef.current;

      if (gameState === 'intro') {
        entities.introTimer--;
        if (entities.introTimer <= 0) {
          setGameState('playing');
        }
      }

      if (gameState === 'playing') {
        // Check for holiday unlock
        const now = Date.now();
        const date = new Date();
        HOLIDAYS.forEach(h => {
          const holidayDate = new Date(date.getFullYear(), h.date.month, h.date.day);
          const diff = Math.abs(date.getTime() - holidayDate.getTime());
          const sevenDays = 7 * 24 * 60 * 60 * 1000;
          if (diff <= sevenDays) {
            setUnlockedWorlds(prev => prev.includes(h.id as WorldType) ? prev : [...prev, h.id as WorldType]);
            localStorage.setItem('played_holiday', h.id);
          }
        });
        
        // Player Movement
        const isShooting = keysRef.current.has('Space') || keysRef.current.has('KeyK');
        let moveSpeed = (isShooting ? 5 : 8) + player.upgrades.speed;
        if (player.powerUpType === 'energy_drink') {
          moveSpeed *= 1.5; // 50% speed boost
        }
        
        // Inverted Controls
        const upKey = settings.invertControls ? (keysRef.current.has('ArrowDown') || keysRef.current.has('KeyS')) : (keysRef.current.has('ArrowUp') || keysRef.current.has('KeyW'));
        const downKey = settings.invertControls ? (keysRef.current.has('ArrowUp') || keysRef.current.has('KeyW')) : (keysRef.current.has('ArrowDown') || keysRef.current.has('KeyS'));
        
        if (upKey) {
          player.y -= moveSpeed;
          if (tutorialStep === 0) {
            setTutorialStep(1);
            setObjective({ text: 'Shoot with SPACE or K', target: 1, current: 0, type: 'score' });
          }
        }
        if (downKey) {
          player.y += moveSpeed;
          if (tutorialStep === 0) {
            setTutorialStep(1);
            setObjective({ text: 'Shoot with SPACE or K', target: 1, current: 0, type: 'score' });
          }
        }
        
        // Clamp player
        player.y = Math.max(PLAYER_SIZE, Math.min(CANVAS_HEIGHT - PLAYER_SIZE, player.y));
        
        // Trail
        player.trail.unshift({ x: player.x, y: player.y });
        if (player.trail.length > 20) player.trail.pop();
        
        // Shooting
        const shotDelay = 100;
        if (isShooting && now - player.lastShot > shotDelay) {
          const bullet = new Bullet(player.x + 20, player.y, player.upgrades.damage);
          player.bullets.push(bullet);
          player.lastShot = now;
          soundManager.shoot();
          setScreenShake(2); // Small shake on shoot
          
          if (tutorialStep === 1) {
            setTutorialStep(2);
            setObjective({ text: 'Collect Wisps for Combo', target: 5, current: 0, type: 'wisps' });
          }
          
          // Muzzle flash particles
          for (let i = 0; i < 3; i++) {
            entitiesRef.current.particles.push({
              x: player.x + 25,
              y: player.y,
              vx: Math.random() * 5 + 2,
              vy: (Math.random() - 0.5) * 5,
              life: 0.5,
              color: '#fff',
              size: 2
            });
          }
        }

        // Spectral Coin & Extra Life Milestone
        if (score >= lastExtraLifeScore + 1000) {
          setCoins(c => c + 1);
          setLives(l => Math.min(maxLives, l + 1));
          setLastExtraLifeScore(s => s + 1000);
          spawnFloatingText(player.x, player.y - 20, "+1 COIN & EXTRA LIFE!", "#fbbf24");
          soundManager.powerup();
        }
        
        // Bullets
        player.bullets.forEach(b => b.update());
        player.bullets = player.bullets.filter(b => b.active);
        
        // Entities Spawning
        entities.difficulty += 0.0001;
        
        // Respawn Logic
        entities.respawnQueue.forEach((r, index) => {
          if (now >= r.time) {
            const spawnY = Math.random() * (CANVAS_HEIGHT - 100) + 50;
            entities.enemies.push(new Enemy(CANVAS_WIDTH + 50, spawnY, r.type, entities.difficulty));
            
            let particleColor = '#991b1b';
            let particleType: 'normal' | 'fiery' | 'wispy' = 'normal';
            if (r.type === 'bat') { particleColor = '#a855f7'; particleType = 'wispy'; }
            else if (r.type === 'demon') { particleColor = '#f97316'; particleType = 'fiery'; }
            else if (r.type === 'skeleton') { particleColor = '#f3f4f6'; particleType = 'normal'; }
            else if (r.type === 'hunter') { particleColor = '#22c55e'; particleType = 'wispy'; }
            else if (r.type === 'dodger') { particleColor = '#3b82f6'; particleType = 'fiery'; }

            for (let i = 0; i < 15; i++) {
              let vx = (Math.random() - 0.5) * 10;
              let vy = (Math.random() - 0.5) * 10;
              if (particleType === 'fiery') {
                vy = -Math.random() * 8 - 1; // Fire goes up
                vx *= 0.5;
              } else if (particleType === 'wispy') {
                vy *= 0.5; // Wisps float around
              }
              
              entities.particles.push({
                x: CANVAS_WIDTH + 50,
                y: spawnY,
                vx,
                vy,
                life: 1.0,
                color: particleColor,
                size: Math.random() * 4 + 2,
                type: particleType
              });
            }

            entities.respawnQueue.splice(index, 1);
          }
        });

        // Boss Logic
        if (score >= entities.nextBossScore && !entities.boss) {
          entities.boss = {
            x: CANVAS_WIDTH + 100,
            y: CANVAS_HEIGHT / 2,
            health: 50 * entities.difficulty,
            maxHealth: 50 * entities.difficulty,
            active: true,
            phase: 1,
            lastAttack: 0,
            attackPattern: 0,
            telegraphing: false
          };
          entities.nextBossScore += 1000;
          soundManager.updateMusic('boss');
        }

        if (entities.boss) {
          const b = entities.boss;
          const timeMultiplier = player.slowTimeTimer > 0 ? 0.3 : 1;
          if (b.x > CANVAS_WIDTH - 150) b.x -= 2 * timeMultiplier;
          b.y += Math.sin(now * 0.002) * 2 * timeMultiplier;

          if (now - b.lastAttack > 2000 / timeMultiplier) {
            if (!b.telegraphing) {
              b.telegraphing = true;
              b.lastAttack = now;
            } else if (now - b.lastAttack > 500 / timeMultiplier) {
              b.telegraphing = false;
              b.attackPattern = Math.floor(Math.random() * 3);
              b.lastAttack = now;
              
              if (b.attackPattern === 0) {
                // Burst
                for (let i = 0; i < 5; i++) {
                  entities.enemies.push(new Enemy(b.x, b.y + (i - 2) * 40, 'bat', entities.difficulty));
                }
              } else if (b.attackPattern === 1) {
                // Hunter
                entities.enemies.push(new Enemy(b.x, b.y, 'hunter', entities.difficulty));
              }
            }
          }
        }

        if (now - entities.lastSpawn > Math.max(500, 2000 - entities.difficulty * 50) && !entities.boss) {
          const type = ENEMY_TYPES[Math.floor(Math.random() * ENEMY_TYPES.length)];
          entities.enemies.push(new Enemy(CANVAS_WIDTH + 50, Math.random() * (CANVAS_HEIGHT - 100) + 50, type, entities.difficulty));
          entities.lastSpawn = now;
        }
        
        if (now - entities.lastWisp > 1500) {
          entities.wisps.push(new Wisp(CANVAS_WIDTH + 50, Math.random() * (CANVAS_HEIGHT - 100) + 50));
          entities.lastWisp = now;
        }
        
        // Increase spectral coin frequency over time (5% per 10 seconds)
        const timePlayedSeconds = (now - entities.gameStartTime) / 1000;
        const frequencyMultiplier = 1 + (Math.floor(timePlayedSeconds / 10) * 0.05);
        const powerupInterval = 8000 / frequencyMultiplier;

        if (now - entities.lastPowerup > powerupInterval) {
          const types: ('upgrade' | 'shield' | 'life' | 'invincible' | 'magnet' | 'coin' | 'slow_time' | 'energy_drink')[] = ['upgrade', 'shield', 'life', 'invincible', 'magnet', 'coin', 'coin', 'slow_time', 'energy_drink'];
          const type = types[Math.floor(Math.random() * types.length)];
          let upgradeType: 'speed' | 'damage' | 'maxLives' | undefined;
          if (type === 'upgrade') {
            const uTypes: ('speed' | 'damage' | 'maxLives')[] = ['speed', 'damage', 'maxLives'];
            upgradeType = uTypes[Math.floor(Math.random() * uTypes.length)];
          }
          entities.powerups.push(new PowerUp(CANVAS_WIDTH + 50, Math.random() * (CANVAS_HEIGHT - 100) + 50, type, upgradeType));
          entities.lastPowerup = now;
        }
        
        // Update Entities
        entities.enemies.forEach(e => {
          e.update(player.y, player.bullets, player.slowTimeTimer > 0);
          // Missed Enemy Penalty
          if (e.x < 0 && !e.passed) {
            e.passed = true;
            setLives(prev => {
              if (prev <= 1) {
                triggerGameOver(score);
                return 0;
              }
              soundManager.hit();
              setScreenShakeWithIntensity(15);
              spawnFloatingText(50, e.y, "MISSED!", "#ef4444");
              return prev - 1;
            });
            setCombo(0);
          }
        });
        entities.wisps.forEach(w => {
          if (player.magnet) {
            const dx = player.x - w.x;
            const dy = player.y - w.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 200) {
              w.x += (dx / dist) * 5;
              w.y += (dy / dist) * 5;
            }
          }
          w.update();
        });
        entities.powerups.forEach(p => p.update());
        entities.particles.forEach(p => {
          p.x += p.vx;
          p.y += p.vy;
          p.life -= 0.02;
        });
        entities.floatingTexts.forEach(t => {
          t.y -= 1;
          t.life -= 0.02;
        });
        
        entities.enemies = entities.enemies.filter(e => e.active);
        entities.wisps = entities.wisps.filter(w => w.active);
        entities.powerups = entities.powerups.filter(p => p.active);
        entities.particles = entities.particles.filter(p => p.life > 0);
        entities.floatingTexts = entities.floatingTexts.filter(t => t.life > 0);
        
        // Collisions
        // Player vs Enemy
        entities.enemies.forEach(e => {
          const dx = player.x - e.x;
          const dy = player.y - e.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 30) {
            if (player.invincible) {
              e.active = false;
              const points = Math.floor(100 * (1 + combo * 0.1));
              setScore(s => s + points);
              setCombo(c => c + 1);
              spawnFloatingText(e.x, e.y, `+${points}`, "#fff");
              spawnExplosion(e.x, e.y, '#991b1b');
              soundManager.explosion();
              setScreenShakeWithIntensity(5);
              entities.respawnQueue.push({ type: e.type, time: now + 5000 });
            } else if (player.shield) {
              player.shield = false;
              player.powerUpType = null;
              e.active = false;
              spawnExplosion(e.x, e.y, '#991b1b');
              soundManager.explosion();
              setScreenShakeWithIntensity(10);
              setCombo(0);
            } else {
              if (now - player.lastHit > 1000) {
                player.lastHit = now;
                player.y += 50; // Knockback
                setScreenShakeWithIntensity(10);
                soundManager.hit();
                // Player hit particles
                for (let i = 0; i < 5; i++) {
                  entities.particles.push({
                    x: player.x,
                    y: player.y,
                    vx: (Math.random() - 0.5) * 5,
                    vy: (Math.random() - 0.5) * 5,
                    life: 0.5,
                    color: '#ef4444',
                    size: 3
                  });
                }
                setLives(prev => {
                  if (prev <= 1) {
                    triggerGameOver(score);
                    return 0;
                  }
                  return prev - 1;
                });
                e.active = false;
                spawnExplosion(player.x, player.y, '#a855f7');
                setCombo(0);
              }
            }
          }
        });

        // Player vs Boss
        if (entities.boss) {
          const b = entities.boss;
          const dx = player.x - b.x;
          const dy = player.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 80 && !player.invincible) {
            setLives(prev => {
              if (prev <= 1) {
                triggerGameOver(score);
                return 0;
              }
              soundManager.hit();
              setScreenShakeWithIntensity(20);
              return prev - 1;
            });
            setCombo(0);
          }
        }
        
        // Bullet vs Enemy
        player.bullets.forEach(b => {
          entities.enemies.forEach(e => {
            const dx = b.x - e.x - e.width / 2;
            const dy = b.y - e.y - e.height / 2;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 25) {
              e.health -= b.damage;
              e.lastHit = Date.now();
              b.active = false;
              // Bullet hit effect
              for (let i = 0; i < 5; i++) {
                entities.particles.push({
                  x: b.x,
                  y: b.y,
                  vx: (Math.random() - 0.5) * 5,
                  vy: (Math.random() - 0.5) * 5,
                  life: 0.3,
                  color: '#fbbf24',
                  size: 2
                });
              }
              
              if (e.health <= 0) {
                e.active = false;
                const points = Math.floor(100 * (1 + combo * 0.1));
                setScore(s => s + points);
                setCombo(c => c + 1);
                spawnFloatingText(e.x, e.y, `+${points}`, "#fff");
                spawnExplosion(e.x, e.y, '#991b1b');
                soundManager.explosion();
                setScreenShakeWithIntensity(5);
                entities.respawnQueue.push({ type: e.type, time: now + 5000 });

                // Death particles
                let particleColor = '#991b1b';
                let particleType: 'normal' | 'fiery' | 'wispy' = 'normal';
                if (e.type === 'bat') { particleColor = '#a855f7'; particleType = 'wispy'; }
                else if (e.type === 'demon') { particleColor = '#f97316'; particleType = 'fiery'; }
                else if (e.type === 'skeleton') { particleColor = '#f3f4f6'; particleType = 'normal'; }
                else if (e.type === 'hunter') { particleColor = '#22c55e'; particleType = 'wispy'; }
                else if (e.type === 'dodger') { particleColor = '#3b82f6'; particleType = 'fiery'; }

                for (let i = 0; i < 15; i++) {
                  let vx = (Math.random() - 0.5) * 12;
                  let vy = (Math.random() - 0.5) * 12;
                  if (particleType === 'fiery') {
                    vy = -Math.random() * 10 - 2; // Fire goes up
                    vx *= 0.5;
                  } else if (particleType === 'wispy') {
                    vy *= 0.5; // Wisps float around
                  }
                  
                  entitiesRef.current.particles.push({
                    x: e.x + e.width / 2,
                    y: e.y + e.height / 2,
                    vx,
                    vy,
                    life: 1.0,
                    color: particleColor,
                    size: Math.random() * 5 + 2,
                    type: particleType
                  });
                }

                if (tutorialStep === 3 && objective) {
                  const newCurrent = objective.current + 1;
                  if (newCurrent >= objective.target) {
                    setTutorialStep(null);
                    setHasCompletedTutorial(true);
                    setObjective(null);
                    spawnFloatingText(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, "TUTORIAL COMPLETE!", "#22c55e");
                  } else {
                    setObjective({ ...objective, current: newCurrent });
                  }
                }
              } else {
                soundManager.hit();
              }
            }
          });

          if (entities.boss) {
            const boss = entities.boss;
            const dx = b.x - boss.x;
            const dy = b.y - boss.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 60) {
              boss.health -= b.damage;
              b.active = false;
              soundManager.hit();
              spawnExplosion(b.x, b.y, '#fff');
              if (boss.health <= 0) {
                setScore(s => s + 5000);
                spawnFloatingText(boss.x, boss.y, "+5000", "#fbbf24");
                spawnExplosion(boss.x, boss.y, '#fbbf24');
                soundManager.explosion();
                soundManager.updateMusic('normal');
                entities.boss = null;
                setScreenShakeWithIntensity(30);
              }
            }
          }
        });
        
        // Player vs Wisp (Spectral Soul Coin)
        entities.wisps.forEach(w => {
          const dx = player.x - w.x;
          const dy = player.y - w.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 25) {
            w.active = false;
            setCoins(c => c + 1);
            const points = Math.floor(50 * (1 + combo * 0.1));
            setScore(s => s + points);
            setCombo(c => c + 1);
            spawnFloatingText(w.x, w.y, "+1 COIN", "#facc15");
            spawnExplosion(w.x, w.y, '#facc15');
            soundManager.collect();

            if (tutorialStep === 2 && objective) {
              const newCurrent = objective.current + 1;
              if (newCurrent >= objective.target) {
                setTutorialStep(3);
                setObjective({ text: 'Defeat Enemies to Respawn', target: 3, current: 0, type: 'enemies' });
              } else {
                setObjective({ ...objective, current: newCurrent });
              }
            }
          }
        });
        
        // Player vs Powerup
        entities.powerups.forEach(p => {
          const dx = player.x - p.x;
          const dy = player.y - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 30) {
            p.active = false;
            if (p.type === 'life') {
              setLives(l => Math.min(maxLives, l + 1));
              spawnFloatingText(p.x, p.y, "LIFE UP!", "#ef4444");
            } else if (p.type === 'coin') {
              setCoins(c => c + 10);
              spawnFloatingText(p.x, p.y, "+10 COINS!", "#facc15");
            } else if (p.type === 'spread') {
              player.upgrades.spread += 1;
              player.form = 'wide';
              spawnFloatingText(p.x, p.y, "WIDE SHOT!", "#22c55e");
            } else if (p.type === 'rapid') {
              player.upgrades.bulletSpeed += 1;
              player.form = 'fast';
              spawnFloatingText(p.x, p.y, "RAPID FIRE!", "#06b6d4");
            } else if (p.type === 'power') {
              player.upgrades.bulletPower += 1;
              player.form = 'powerful';
              spawnFloatingText(p.x, p.y, "POWER SHOT!", "#f97316");
            } else if (p.type === 'upgrade') {
              if (p.upgradeType === 'speed') {
                player.upgrades.speed += 1;
                spawnFloatingText(p.x, p.y, "SPEED UP!", "#fbbf24");
              } else if (p.upgradeType === 'damage') {
                player.upgrades.damage += 1;
                spawnFloatingText(p.x, p.y, "DAMAGE UP!", "#fbbf24");
              } else if (p.upgradeType === 'maxLives') {
                setMaxLives(m => m + 1);
                setLives(l => l + 1);
                player.upgrades.maxLives += 1;
                spawnFloatingText(p.x, p.y, "MAX LIVES UP!", "#fbbf24");
              }
            } else if (p.type === 'slow_time') {
              player.slowTimeTimer = 300; // 5 seconds at 60fps
              spawnFloatingText(p.x, p.y, "SLOW TIME!", "#60a5fa");
              soundManager.slowTime();
            } else if (p.type === 'energy_drink') {
              player.powerUpType = 'energy_drink';
              player.powerUpTimer = 500;
              spawnFloatingText(p.x, p.y, "ENERGY DRINK!", "#3b82f6");
            } else {
              player.powerUpType = p.type;
              player.powerUpTimer = 500; // frames
              player.shield = p.type === 'shield';
              player.invincible = p.type === 'invincible';
              player.magnet = p.type === 'magnet';
              spawnFloatingText(p.x, p.y, p.type.toUpperCase(), "#fff");
            }
            spawnExplosion(p.x, p.y, '#fff');
            soundManager.powerup();
          }
        });
        
        if (player.powerUpTimer > 0) {
          player.powerUpTimer--;
          if (player.powerUpTimer === 0) {
            player.powerUpType = null;
            player.shield = false;
            player.invincible = false;
            player.magnet = false;
          }
        }
        
        if (player.slowTimeTimer > 0) {
          player.slowTimeTimer--;
        }
      }
      
      // Background scroll
      if (!entities.boss) {
        entities.bgX -= 1;
        if (entities.bgX <= -CANVAS_WIDTH) entities.bgX = 0;
      }
      
      // Screen Shake
      if (screenShake > 0) setScreenShake(s => s * 0.9);
      if (screenShake < 0.1) setScreenShake(0);
      
      // --- Draw ---
      ctx.save();
      const shakeX = (Math.random() - 0.5) * screenShake;
      const shakeY = (Math.random() - 0.5) * screenShake;
      ctx.translate(shakeX, shakeY);
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // 1. Sky
      const skyGradients = {
        graveyard: ['#020617', '#1e1b4b'],
        forest: ['#064e3b', '#022c22'],
        crypt: ['#450a0a', '#1a0505'],
        disco: ['#1e1b4b', '#4c1d95'],
        gold_mine: ['#451a03', '#78350f'],
        gg: ['#92400e', '#78350f'],
        easter: ['#0ea5e9', '#38bdf8'],
        halloween: ['#0c0a09', '#431407'],
        christmas: ['#064e3b', '#14532d'],
        new_year: ['#020617', '#1e1b4b'],
        valentines: ['#4c0519', '#831843'],
        out_of_this_world: ['#020617', '#1e1b4b']
      };
      const skyGradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
      skyGradient.addColorStop(0, skyGradients[selectedWorld]?.[0] || '#020617');
      skyGradient.addColorStop(1, skyGradients[selectedWorld]?.[1] || '#1e1b4b');
      ctx.fillStyle = skyGradient;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Parallax Clouds/Stars Detail
      ctx.save();
      if (selectedWorld === 'gg') {
        // Pixel style animated clouds for GG world
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        for (let i = 0; i < 15; i++) {
          const cloudSpeed = 0.3 + (i % 3) * 0.1;
          const cloudX = ((entities.bgX * cloudSpeed) + i * 250) % (CANVAS_WIDTH + 300) - 150;
          const cloudY = 20 + (i * 41) % (CANVAS_HEIGHT / 2.5);
          
          // Animate cloud shape slightly
          const animOffset = Math.sin(now * 0.001 + i) * 5;
          
          // Pixel cloud clusters
          ctx.fillRect(cloudX, cloudY, 40, 10);
          ctx.fillRect(cloudX + 10, cloudY - 10, 30 + animOffset, 10);
          ctx.fillRect(cloudX - 10, cloudY + 10, 50, 10);
          ctx.fillRect(cloudX + 20, cloudY - 20, 20, 10);
          
          // Shading
          ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
          ctx.fillRect(cloudX - 10, cloudY + 20, 40, 5);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.15)'; // reset
        }
      } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        for (let i = 0; i < 30; i++) {
          const cloudX = (entities.bgX * 0.2 + i * 200) % (CANVAS_WIDTH + 200) - 100;
          const cloudY = (i * 53) % (CANVAS_HEIGHT / 2);
          const cloudW = 60 + (i % 5) * 20;
          const cloudH = 20 + (i % 3) * 10;
          ctx.beginPath();
          ctx.ellipse(cloudX, cloudY, cloudW, cloudH, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // Add more distant scenery
      ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
      for (let i = 0; i < 50; i++) {
        const x = (i * 137 + entities.bgX * 0.05) % CANVAS_WIDTH;
        const y = (i * 71) % CANVAS_HEIGHT;
        ctx.beginPath();
        ctx.arc(x, y, 2 + (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // 2. Distant Stars/Particles
      if (selectedWorld === 'graveyard') {
        ctx.fillStyle = '#fff';
        for (let i = 0; i < 50; i++) {
          const x = (i * 137 + entities.bgX * 0.2) % CANVAS_WIDTH;
          const y = (i * 71) % CANVAS_HEIGHT;
          ctx.globalAlpha = 0.5 + Math.sin(now * 0.001 + i) * 0.5;
          ctx.fillRect(x, y, 1, 1);
        }
        ctx.globalAlpha = 1;
      } else if (selectedWorld === 'out_of_this_world') {
        // Space / Galaxy Background
        ctx.fillStyle = '#fff';
        for (let i = 0; i < 100; i++) {
          const x = (i * 137 + entities.bgX * 0.1) % CANVAS_WIDTH;
          const y = (i * 71) % CANVAS_HEIGHT;
          const size = Math.random() * 2;
          ctx.globalAlpha = 0.3 + Math.sin(now * 0.002 + i) * 0.7;
          ctx.fillRect(x, y, size, size);
        }
        // Nebulae
        for (let i = 0; i < 3; i++) {
          const x = (entities.bgX * 0.05 + i * 400) % (CANVAS_WIDTH + 400) - 200;
          const y = 100 + i * 100;
          const grad = ctx.createRadialGradient(x, y, 0, x, y, 200);
          const hue = (i * 120 + now * 0.01) % 360;
          grad.addColorStop(0, `hsla(${hue}, 70%, 50%, 0.1)`);
          grad.addColorStop(1, 'transparent');
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        }
        ctx.globalAlpha = 1;
      } else if (selectedWorld === 'crypt') {
        ctx.fillStyle = '#f87171';
        for (let i = 0; i < 30; i++) {
          const x = (i * 137 + entities.bgX * 0.3) % CANVAS_WIDTH;
          const y = (i * 71 - now * 0.05) % CANVAS_HEIGHT;
          ctx.globalAlpha = 0.3;
          ctx.beginPath();
          ctx.arc(x, y, 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      } else if (selectedWorld === 'disco') {
        const colors = ['#f472b6', '#60a5fa', '#34d399', '#fbbf24'];
        for (let i = 0; i < 20; i++) {
          ctx.fillStyle = colors[i % colors.length];
          const x = (i * 157 + now * 0.2) % CANVAS_WIDTH;
          const y = (i * 89) % CANVAS_HEIGHT;
          ctx.globalAlpha = 0.4;
          ctx.fillRect(x, y, 10, 10);
        }
        ctx.globalAlpha = 1;
      } else if (selectedWorld === 'gold_mine') {
        ctx.fillStyle = '#facc15';
        for (let i = 0; i < 40; i++) {
          const x = (i * 113 + entities.bgX * 0.4) % CANVAS_WIDTH;
          const y = (i * 67) % CANVAS_HEIGHT;
          ctx.globalAlpha = 0.2;
          ctx.beginPath();
          ctx.arc(x, y, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      } else if (selectedWorld === 'gg') {
        ctx.fillStyle = '#f97316';
        for (let i = 0; i < 30; i++) {
          const x = (i * 157 + entities.bgX * 0.3) % CANVAS_WIDTH;
          const y = (i * 97 + now * 0.05) % CANVAS_HEIGHT;
          ctx.globalAlpha = 0.4;
          ctx.beginPath();
          ctx.arc(x, y, 3, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      // 3. Moon/Sun/Orb
      ctx.save();
      ctx.translate(CANVAS_WIDTH - 150, 100);
      const orbColors = { 
        graveyard: '#f1f5f9', 
        forest: '#fbbf24', 
        crypt: '#ef4444', 
        disco: '#ec4899', 
        gold_mine: '#f59e0b', 
        gg: '#fbbf24',
        easter: '#fbbf24',
        halloween: '#f97316',
        christmas: '#ef4444',
        new_year: '#f1f5f9',
        valentines: '#f43f5e'
      };
      ctx.fillStyle = orbColors[selectedWorld];
      ctx.shadowBlur = 50;
      ctx.shadowColor = orbColors[selectedWorld];
      ctx.beginPath();
      ctx.arc(0, 0, 40, 0, Math.PI * 2);
      ctx.fill();
      if (selectedWorld === 'disco') {
        // Disco ball lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        for (let i = -40; i < 40; i += 10) {
          ctx.beginPath(); ctx.moveTo(i, -Math.sqrt(1600 - i * i)); ctx.lineTo(i, Math.sqrt(1600 - i * i)); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(-Math.sqrt(1600 - i * i), i); ctx.lineTo(Math.sqrt(1600 - i * i), i); ctx.stroke();
        }
      }
      ctx.restore();

      // 4. Far Background (Hills/Mountains)
      const hillColors = { 
        graveyard: '#0f172a', 
        forest: '#064e3b', 
        crypt: '#450a0a', 
        disco: '#312e81', 
        gold_mine: '#451a03', 
        gg: '#451a03',
        easter: '#16a34a',
        halloween: '#1c1917',
        christmas: '#064e3b',
        new_year: '#0f172a',
        valentines: '#701a75'
      };
      ctx.fillStyle = hillColors[selectedWorld];
      for (let i = 0; i < 3; i++) {
        const x = (entities.bgX * 0.5 + i * 400) % (CANVAS_WIDTH + 400);
        ctx.beginPath();
        ctx.moveTo(x - 200, CANVAS_HEIGHT);
        if (selectedWorld === 'gold_mine') {
          ctx.lineTo(x, CANVAS_HEIGHT - 200);
          ctx.lineTo(x + 200, CANVAS_HEIGHT);
        } else {
          ctx.quadraticCurveTo(x, CANVAS_HEIGHT - 150, x + 200, CANVAS_HEIGHT);
        }
        ctx.fill();
      }

      // 5. Mid Background (Trees/Pillars)
      const midColors = { 
        graveyard: '#020617', 
        forest: '#022c22', 
        crypt: '#1a0505', 
        disco: '#1e1b4b', 
        gold_mine: '#271709', 
        gg: '#271709',
        easter: '#15803d',
        halloween: '#0c0a09',
        christmas: '#052e16',
        new_year: '#020617',
        valentines: '#4c0519'
      };
      ctx.fillStyle = midColors[selectedWorld];
      for (let i = 0; i < 5; i++) {
        const x = (entities.bgX * 0.8 + i * 300) % (CANVAS_WIDTH + 300);
        const drawX = x - 150;
        if (selectedWorld === 'crypt') {
          ctx.fillRect(drawX, 0, 40, CANVAS_HEIGHT);
        } else if (selectedWorld === 'disco') {
          ctx.fillStyle = `hsl(${(now * 0.1 + i * 60) % 360}, 70%, 20%)`;
          ctx.fillRect(drawX, CANVAS_HEIGHT - 300, 30, 300);
          ctx.fillStyle = midColors[selectedWorld];
        } else if (selectedWorld === 'gold_mine') {
          ctx.fillRect(drawX, CANVAS_HEIGHT - 250, 60, 250);
        } else if (selectedWorld === 'gg') {
          // Autumn Trees (Pixel Style)
          ctx.fillStyle = '#451a03';
          ctx.fillRect(drawX, CANVAS_HEIGHT - 200, 20, 200);
          ctx.fillStyle = '#92400e';
          // Pixel leaves cluster
          ctx.fillRect(drawX - 20, CANVAS_HEIGHT - 220, 60, 40);
          ctx.fillRect(drawX - 10, CANVAS_HEIGHT - 250, 40, 30);
          ctx.fillRect(drawX - 40, CANVAS_HEIGHT - 200, 100, 20);
          ctx.fillStyle = '#78350f'; // Shading
          ctx.fillRect(drawX - 10, CANVAS_HEIGHT - 190, 20, 10);
          ctx.fillRect(drawX + 20, CANVAS_HEIGHT - 210, 20, 20);
          
          // Luke's Coffee Sign
          if (i % 2 === 0) {
            ctx.fillStyle = '#fef3c7';
            ctx.fillRect(drawX + 30, CANVAS_HEIGHT - 100, 60, 30);
            ctx.fillStyle = '#451a03';
            ctx.font = 'bold 8px sans-serif';
            ctx.fillText("LUKE'S", drawX + 35, CANVAS_HEIGHT - 88);
            ctx.fillText("COFFEE", drawX + 35, CANVAS_HEIGHT - 78);
          }
        } else {
          ctx.fillRect(drawX, CANVAS_HEIGHT - 200, 20, 200);
        }
      }

      // 6. Near Background
      ctx.fillStyle = '#000';
      if (selectedWorld === 'graveyard') {
        for (let i = 0; i < 4; i++) {
          const x = (entities.bgX + i * 400) % (CANVAS_WIDTH + 400);
          const drawX = x - 200;
          const baseY = CANVAS_HEIGHT - 20;
          
          // Dead tree
          ctx.fillStyle = '#000';
          ctx.fillRect(drawX, baseY - 150, 25, 150);
          ctx.fillRect(drawX - 40, baseY - 120, 50, 12);
          ctx.fillRect(drawX + 25, baseY - 100, 30, 10);
          ctx.fillRect(drawX - 20, baseY - 80, 20, 8);
          
          // Tombstones
          ctx.fillStyle = '#1e293b';
          ctx.beginPath();
          ctx.roundRect(drawX + 100, baseY - 40, 30, 40, [15, 15, 0, 0]);
          ctx.fill();
          ctx.fillStyle = '#334155';
          ctx.fillRect(drawX + 105, baseY - 30, 20, 4);
          ctx.fillRect(drawX + 105, baseY - 20, 15, 4);

          // Additional tombstone
          ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          ctx.roundRect(drawX + 180, baseY - 30, 25, 30, [10, 10, 0, 0]);
          ctx.fill();
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(drawX + 185, baseY - 20, 15, 3);
          
          // Cross tombstone
          if (i % 3 === 0) {
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(drawX + 250, baseY - 45, 10, 45);
            ctx.fillRect(drawX + 240, baseY - 30, 30, 10);
            ctx.fillStyle = '#334155';
            ctx.fillRect(drawX + 252, baseY - 40, 6, 35);
          }
          
          ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          ctx.roundRect(drawX - 100, baseY - 50, 40, 50, [20, 20, 0, 0]);
          ctx.fill();
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(drawX - 90, baseY - 35, 20, 5);
          ctx.fillRect(drawX - 90, baseY - 25, 20, 5);
          
          // Creepy glowing eyes in the dark
          if (i % 2 === 0) {
            ctx.fillStyle = '#ef4444';
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#ef4444';
            ctx.fillRect(drawX + 60, baseY - 20, 4, 4);
            ctx.fillRect(drawX + 70, baseY - 20, 4, 4);
            ctx.shadowBlur = 0;
          }
        }
      } else if (selectedWorld === 'forest') {
        ctx.fillStyle = '#064e3b';
        for (let i = 0; i < 6; i++) {
          const x = (entities.bgX * 1.1 + i * 200) % (CANVAS_WIDTH + 200);
          const drawX = x - 100;
          
          // Pixel Pine Tree
          ctx.fillStyle = '#064e3b';
          // Layers of leaves
          ctx.fillRect(drawX + 40, CANVAS_HEIGHT - 300, 20, 60);
          ctx.fillRect(drawX + 20, CANVAS_HEIGHT - 260, 60, 40);
          ctx.fillRect(drawX, CANVAS_HEIGHT - 220, 100, 40);
          ctx.fillRect(drawX - 20, CANVAS_HEIGHT - 180, 140, 40);
          ctx.fillRect(drawX - 40, CANVAS_HEIGHT - 140, 180, 140);
          
          // Shading
          ctx.fillStyle = '#022c22';
          ctx.fillRect(drawX + 50, CANVAS_HEIGHT - 290, 10, 50);
          ctx.fillRect(drawX + 50, CANVAS_HEIGHT - 250, 30, 30);
          ctx.fillRect(drawX + 50, CANVAS_HEIGHT - 210, 50, 30);
          ctx.fillRect(drawX + 50, CANVAS_HEIGHT - 170, 70, 30);
          ctx.fillRect(drawX + 50, CANVAS_HEIGHT - 130, 90, 130);
        }
      } else if (selectedWorld === 'gg') {
        for (let i = 0; i < 6; i++) {
          const x = (entities.bgX * 1.2 + i * 300) % (CANVAS_WIDTH + 300);
          const drawX = x - 150;

          // Street Lamp
          ctx.fillStyle = '#334155';
          ctx.fillRect(drawX, CANVAS_HEIGHT - 120, 5, 120);
          ctx.fillStyle = '#fef08a';
          ctx.beginPath();
          ctx.arc(drawX + 2.5, CANVAS_HEIGHT - 120, 15, 0, Math.PI * 2);
          ctx.fill();

          // Autumn Tree (Pixel Style Leaves)
          ctx.fillStyle = '#78350f';
          ctx.fillRect(drawX + 50, CANVAS_HEIGHT - 60, 10, 60);
          ctx.fillStyle = '#f59e0b';
          // Pixel leaves cluster
          ctx.fillRect(drawX + 35, CANVAS_HEIGHT - 80, 40, 20);
          ctx.fillRect(drawX + 45, CANVAS_HEIGHT - 100, 20, 20);
          ctx.fillRect(drawX + 25, CANVAS_HEIGHT - 70, 60, 10);
          ctx.fillStyle = '#d97706'; // Darker shading
          ctx.fillRect(drawX + 40, CANVAS_HEIGHT - 65, 10, 5);
          ctx.fillRect(drawX + 60, CANVAS_HEIGHT - 75, 10, 10);

          // Sign 1: Luke's Diner
          if (i % 2 === 0) {
            const signX = drawX + 100;
            const signY = CANVAS_HEIGHT - 200;
            // Mug
            ctx.fillStyle = '#facc15';
            ctx.beginPath();
            ctx.moveTo(signX, signY);
            ctx.lineTo(signX + 50, signY);
            ctx.lineTo(signX + 40, signY + 40);
            ctx.lineTo(signX + 10, signY + 40);
            ctx.closePath();
            ctx.fill();
            // Handle
            ctx.strokeStyle = '#facc15';
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.arc(signX + 50, signY + 20, 10, -Math.PI/2, Math.PI/2);
            ctx.stroke();
            // Steam
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(signX + 20, signY - 5);
            ctx.quadraticCurveTo(signX + 25, signY - 15, signX + 20, signY - 25);
            ctx.stroke();
            // Text
            ctx.fillStyle = '#451a03';
            ctx.font = 'bold 10px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText("Luke's", signX + 25, signY + 15);
            ctx.fillText("Diner", signX + 25, signY + 28);
            ctx.textAlign = 'left';
          }
        }
      } else if (selectedWorld === 'easter') {
        // Easter Eggs and Bunnies
        for (let i = 0; i < 5; i++) {
          const x = (entities.bgX * 1.1 + i * 250) % (CANVAS_WIDTH + 250) - 125;
          
          // Bunny
          ctx.fillStyle = '#f1f5f9';
          ctx.beginPath();
          ctx.ellipse(x, CANVAS_HEIGHT - 40, 15, 20, 0, 0, Math.PI * 2); // Body
          ctx.fill();
          ctx.beginPath();
          ctx.ellipse(x, CANVAS_HEIGHT - 70, 10, 12, 0, 0, Math.PI * 2); // Head
          ctx.fill();
          // Ears
          ctx.beginPath();
          ctx.ellipse(x - 5, CANVAS_HEIGHT - 90, 4, 15, 0, 0, Math.PI * 2);
          ctx.ellipse(x + 5, CANVAS_HEIGHT - 90, 4, 15, 0, 0, Math.PI * 2);
          ctx.fill();
          
          // Eggs
          const eggColors = ['#f87171', '#60a5fa', '#fbbf24', '#34d399', '#a78bfa'];
          for (let j = 0; j < 3; j++) {
            ctx.fillStyle = eggColors[(i + j) % eggColors.length];
            ctx.beginPath();
            ctx.ellipse(x + 40 + j * 30, CANVAS_HEIGHT - 20, 8, 12, 0, 0, Math.PI * 2);
            ctx.fill();
            // Egg Pattern
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x + 40 + j * 30 - 5, CANVAS_HEIGHT - 20);
            ctx.lineTo(x + 40 + j * 30 + 5, CANVAS_HEIGHT - 20);
            ctx.stroke();
          }
        }
      }
      ctx.fillStyle = midColors[selectedWorld];
      ctx.fillRect(0, CANVAS_HEIGHT - 25, CANVAS_WIDTH, 25);

      // Foreground Details (Grass/Rocks)
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      for (let i = 0; i < 10; i++) {
        const x = (entities.bgX * 1.5 + i * 120) % (CANVAS_WIDTH + 120) - 60;
        ctx.beginPath();
        ctx.moveTo(x, CANVAS_HEIGHT - 25);
        ctx.lineTo(x + 5, CANVAS_HEIGHT - 40);
        ctx.lineTo(x + 10, CANVAS_HEIGHT - 25);
        ctx.fill();
      }
      ctx.restore();

      // 8. Weather Effects
      if (selectedWorld === 'forest') {
        // Rain
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 20; i++) {
          const x = (i * 47 + now * 0.5) % CANVAS_WIDTH;
          const y = (i * 31 + now * 1.2) % CANVAS_HEIGHT;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x - 5, y + 15);
          ctx.stroke();
        }
      } else if (selectedWorld === 'graveyard') {
        // Fog
        const fogGradient = ctx.createLinearGradient(0, CANVAS_HEIGHT - 120, 0, CANVAS_HEIGHT);
        fogGradient.addColorStop(0, 'transparent');
        fogGradient.addColorStop(1, 'rgba(148, 163, 184, 0.25)');
        ctx.fillStyle = fogGradient;
        ctx.fillRect(0, CANVAS_HEIGHT - 120, CANVAS_WIDTH, 120);
        
        // Moving fog clouds
        ctx.fillStyle = 'rgba(148, 163, 184, 0.1)';
        for (let i = 0; i < 5; i++) {
          const fogX = (entities.bgX * 0.5 + now * 0.02 + i * 200) % (CANVAS_WIDTH + 200) - 100;
          ctx.beginPath();
          ctx.ellipse(fogX, CANVAS_HEIGHT - 40, 100, 30, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (selectedWorld === 'disco') {
        // Strobe
        if (Math.floor(now / 200) % 2 === 0) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
          ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        }
      } else if (selectedWorld === 'gold_mine') {
        // Gold Dust
        ctx.fillStyle = '#facc15';
        for (let i = 0; i < 15; i++) {
          const x = (i * 79 + now * 0.1) % CANVAS_WIDTH;
          const y = (i * 43 + now * 0.05) % CANVAS_HEIGHT;
          ctx.globalAlpha = 0.3;
          ctx.fillRect(x, y, 2, 2);
        }
        ctx.globalAlpha = 1;
      }

      // --- Intro Cinematic ---
      if (gameState === 'intro') {
        const timer = entities.introTimer;
        const manX = 100;
        const manY = player.y;
        
        ctx.save();
        if (timer > 60) {
          // Draw Man
          ctx.fillStyle = '#fecaca'; // Skin
          ctx.fillRect(manX - 5, manY - 25, 10, 10); // Head
          ctx.fillStyle = '#1e40af'; // Shirt
          ctx.fillRect(manX - 8, manY - 15, 16, 15); // Body
          ctx.fillStyle = '#1e293b'; // Pants
          ctx.fillRect(manX - 8, manY, 7, 10); // Leg L
          ctx.fillRect(manX + 1, manY, 7, 10); // Leg R
        } else {
          // Transformation Effect
          const alpha = timer / 60;
          const ghostAlpha = 1 - alpha;
          
          // Fading Man
          ctx.globalAlpha = alpha;
          ctx.fillStyle = '#fecaca';
          ctx.fillRect(manX - 5, manY - 25, 10, 10);
          ctx.fillStyle = '#1e40af';
          ctx.fillRect(manX - 8, manY - 15, 16, 15);
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(manX - 8, manY, 7, 10);
          ctx.fillRect(manX + 1, manY, 7, 10);
          
          // Appearing Ghost
          ctx.globalAlpha = ghostAlpha;
          ctx.fillStyle = '#a855f7';
          ctx.beginPath();
          ctx.arc(manX, manY, PLAYER_SIZE / 2, Math.PI, 0);
          ctx.lineTo(manX + PLAYER_SIZE / 2, manY + PLAYER_SIZE / 2);
          ctx.lineTo(manX - PLAYER_SIZE / 2, manY + PLAYER_SIZE / 2);
          ctx.fill();
          
          // Particles
          for (let i = 0; i < 2; i++) {
            entities.particles.push({
              x: manX + (Math.random() - 0.5) * 40,
              y: manY + (Math.random() - 0.5) * 40,
              vx: (Math.random() - 0.5) * 2,
              vy: (Math.random() - 0.5) * 2,
              life: 0.5,
              color: '#d8b4fe',
              size: 2
            });
          }
        }
        ctx.restore();
      }
      
      // Trail
      if (gameState === 'playing') {
        player.trail.forEach((p, i) => {
          const alpha = 1 - i / player.trail.length;
          let color = customization.trailColor;
          if (customization.costume === 'vibe_coding') {
            const hue = (now * 0.5 + i * 30) % 360;
            const distortion = Math.sin(now * 0.01 + i * 0.5) * 5;
            color = `hsla(${hue}, 100%, 70%, ${alpha})`;
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(p.x + distortion, p.y + distortion, (PLAYER_SIZE / 2) * alpha, 0, Math.PI * 2);
            ctx.fill();
          } else {
            color = customization.trailColor + Math.floor(alpha * 128).toString(16).padStart(2, '0');
            ctx.fillStyle = color;
            ctx.beginPath();
            if (customization.trailPattern === 'ripple') {
              const r = (PLAYER_SIZE / 2) * alpha * (1 + Math.sin(now * 0.01 + i) * 0.5);
              ctx.beginPath();
              ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
              ctx.strokeStyle = customization.trailColor + Math.floor(alpha * 128).toString(16).padStart(2, '0');
              ctx.lineWidth = 2 * alpha;
              ctx.stroke();
              return;
            } else if (customization.costume === 'cosmic_wanderer') {
              // Nebula Trail
              const r = (PLAYER_SIZE / 1.5) * alpha;
              const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
              const hue = (now * 0.1 + i * 10) % 360;
              grad.addColorStop(0, `hsla(${hue}, 70%, 50%, ${alpha * 0.3})`);
              grad.addColorStop(1, 'transparent');
              ctx.fillStyle = grad;
              ctx.beginPath();
              ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
              ctx.fill();
              return;
            } else if (customization.trailPattern === 'starry') {
              const r = (PLAYER_SIZE / 2) * alpha * (0.8 + Math.sin(now * 0.01 + i) * 0.2);
              ctx.beginPath();
              for (let j = 0; j < 5; j++) {
                const angle = (j * 4 * Math.PI) / 5 - Math.PI / 2 + now * 0.002;
                ctx.lineTo(p.x + Math.cos(angle) * r, p.y + Math.sin(angle) * r);
              }
              ctx.closePath();
              ctx.shadowBlur = 15 * alpha;
              ctx.shadowColor = customization.trailColor;
            } else if (customization.trailPattern === 'glitch') {
              const offset = Math.sin(now * 0.1 + i) * 8;
              const glitchX = p.x + (Math.random() - 0.5) * 10;
              const glitchY = p.y + (Math.random() - 0.5) * 10;
              ctx.fillStyle = customization.trailColor + '88';
              ctx.fillRect(glitchX - (PLAYER_SIZE / 4) * alpha, glitchY - (PLAYER_SIZE / 4) * alpha, (PLAYER_SIZE / 2) * alpha, (PLAYER_SIZE / 2) * alpha);
              if (Math.random() > 0.7) {
                ctx.fillStyle = '#ff00ff44';
                ctx.fillRect(glitchX + 5, glitchY, (PLAYER_SIZE / 4) * alpha, (PLAYER_SIZE / 4) * alpha);
                ctx.fillStyle = '#00ffff44';
                ctx.fillRect(glitchX - 5, glitchY, (PLAYER_SIZE / 4) * alpha, (PLAYER_SIZE / 4) * alpha);
              }
            } else if (customization.trailPattern === 'sparkle') {
              const sparkleSize = (Math.sin(now * 0.02 + i) * 2 + 3) * alpha;
              ctx.beginPath();
              ctx.arc(p.x + Math.sin(i) * 5, p.y + Math.cos(i) * 5, sparkleSize, 0, Math.PI * 2);
              ctx.fill();
              // Twinkle
              if (Math.random() > 0.8) {
                ctx.fillStyle = '#fff';
                ctx.fillRect(p.x + Math.sin(i) * 5 - 1, p.y + Math.cos(i) * 5 - 1, 2, 2);
              }
            } else if (customization.trailPattern === 'fire') {
              const fireSize = (PLAYER_SIZE / 1.5) * alpha;
              const flameOffset = Math.sin(now * 0.05 + i) * 5 * alpha;
              
              ctx.beginPath();
              ctx.moveTo(p.x, p.y - fireSize * 1.5 + flameOffset); // Top tip
              ctx.quadraticCurveTo(p.x + fireSize, p.y, p.x + fireSize/2, p.y + fireSize); // Right curve
              ctx.lineTo(p.x - fireSize/2, p.y + fireSize); // Bottom flat
              ctx.quadraticCurveTo(p.x - fireSize, p.y, p.x, p.y - fireSize * 1.5 + flameOffset); // Left curve
              
              const grad = ctx.createRadialGradient(p.x, p.y + fireSize/2, 0, p.x, p.y + fireSize/2, fireSize);
              grad.addColorStop(0, `rgba(255, 255, 0, ${alpha})`); // Yellow center
              grad.addColorStop(0.5, `rgba(255, 100, 0, ${alpha * 0.8})`); // Orange middle
              grad.addColorStop(1, `rgba(255, 0, 0, 0)`); // Red edge
              ctx.fillStyle = grad;
              ctx.fill();
              return;
            } else {
              ctx.arc(p.x, p.y, (PLAYER_SIZE / 2) * alpha, 0, Math.PI * 2);
            }
            ctx.fill();
          }
        });
      }
      
      // Player (Ghost)
      if (gameState === 'playing' || (gameState === 'intro' && entities.introTimer <= 60)) {
        ctx.save();
        let bob = Math.sin(now * 0.005) * 5;
        
        const drawX = player.x;
        const drawY = player.y + bob;
        
        if (gameState === 'intro') {
          ctx.globalAlpha = 1 - entities.introTimer / 60;
        }

        // Hit Flash
        if (now - player.lastHit < 200) {
          ctx.globalAlpha = Math.sin(now * 0.05) > 0 ? 0.5 : 1;
        }
        
        ctx.translate(drawX, drawY);

        if (customization.costume === 'ghostly_dance') {
          const beat = soundManager.beatCount;
          const pulse = 1.0 + (Math.sin(now * 0.01) * 0.05) + (beat % 2 === 0 ? 0.15 : 0);
          ctx.scale(pulse, pulse);
          const glowIntensity = 20 + (beat % 2 === 0 ? 30 : 0);
          ctx.shadowBlur = glowIntensity;
          ctx.shadowColor = customization.ghostColor;
        } else if (customization.costume === 'cosmic_wanderer') {
          ctx.shadowBlur = 25;
          ctx.shadowColor = '#a855f7';
          // Swirling galaxy pattern
          const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, PLAYER_SIZE / 2);
          grad.addColorStop(0, '#1e1b4b');
          grad.addColorStop(0.5, '#4c1d95');
          grad.addColorStop(1, '#020617');
          ctx.fillStyle = grad;
        } else {
          // Default subtle glow
          ctx.shadowBlur = 15;
          ctx.shadowColor = customization.ghostColor;
        }

        // Character Form Changes
        if (player.form === 'wide') {
          ctx.scale(1.3, 0.8);
        } else if (player.form === 'fast') {
          ctx.scale(0.8, 1.3);
        } else if (player.form === 'powerful') {
          ctx.scale(1.2, 1.2);
          ctx.shadowBlur += 20;
          ctx.shadowColor = '#f97316';
        }
      
      // Body Shading
      ctx.fillStyle = customization.ghostColor + '99'; // Semi-transparent shading
      ctx.beginPath();
      ctx.arc(0, 0, PLAYER_SIZE / 2, Math.PI, 0);
      ctx.lineTo(PLAYER_SIZE / 2, PLAYER_SIZE / 2);
      for (let i = 0; i < 3; i++) {
        const wx = PLAYER_SIZE / 2 - (i * PLAYER_SIZE) / 3;
        ctx.quadraticCurveTo(wx - PLAYER_SIZE / 6, PLAYER_SIZE / 2 + 5, wx - PLAYER_SIZE / 3, PLAYER_SIZE / 2);
      }
      ctx.lineTo(-PLAYER_SIZE / 2, 0);
      ctx.fill();

      // Main Body
      if (customization.costume === 'gameboy') {
        ctx.fillStyle = '#c4cfa1'; // Gameboy body color
      } else if (customization.costume === 'vibe_coding') {
        const gradient = ctx.createLinearGradient(-PLAYER_SIZE/2, -PLAYER_SIZE/2, PLAYER_SIZE/2, PLAYER_SIZE/2);
        gradient.addColorStop(0, `hsl(${(now * 0.1) % 360}, 100%, 70%)`);
        gradient.addColorStop(0.5, `hsl(${(now * 0.1 + 120) % 360}, 100%, 70%)`);
        gradient.addColorStop(1, `hsl(${(now * 0.1 + 240) % 360}, 100%, 70%)`);
        ctx.fillStyle = gradient;
      } else if (customization.costume === 'cosmic_wanderer') {
        // Galaxy pattern with stars
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, PLAYER_SIZE / 2);
        gradient.addColorStop(0, '#4c1d95');
        gradient.addColorStop(1, '#1e1b4b');
        ctx.fillStyle = gradient;
      } else {
        ctx.fillStyle = customization.ghostColor;
      }
      ctx.beginPath();
      ctx.arc(-2, -2, PLAYER_SIZE / 2 - 2, Math.PI, 0);
      ctx.lineTo(PLAYER_SIZE / 2 - 4, PLAYER_SIZE / 2 - 2);
      for (let i = 0; i < 3; i++) {
        const wx = (PLAYER_SIZE / 2 - 4) - (i * (PLAYER_SIZE - 8)) / 3;
        ctx.quadraticCurveTo(wx - (PLAYER_SIZE - 8) / 6, PLAYER_SIZE / 2 + 2, wx - (PLAYER_SIZE - 8) / 3, PLAYER_SIZE / 2 - 2);
      }
      ctx.lineTo(-PLAYER_SIZE / 2 + 2, -2);
      ctx.fill();

      if (customization.costume === 'cosmic_wanderer') {
        // Tiny stars inside
        ctx.fillStyle = '#fff';
        for (let i = 0; i < 5; i++) {
          const sx = Math.sin(now * 0.01 + i) * 10;
          const sy = Math.cos(now * 0.01 + i) * 10;
          ctx.fillRect(sx, sy, 1, 1);
        }
      } else if (customization.costume === 'gameboy') {
        // Gameboy details
        // Screen background
        ctx.fillStyle = '#8bac0f';
        ctx.fillRect(-12, -12, 24, 10);
        
        ctx.fillStyle = '#0f380f'; // Dark green
        // D-pad
        ctx.fillRect(-10, 2, 6, 2);
        ctx.fillRect(-8, 0, 2, 6);
        // Buttons
        ctx.beginPath();
        ctx.arc(6, 4, 1.5, 0, Math.PI * 2);
        ctx.arc(10, 2, 1.5, 0, Math.PI * 2);
        ctx.fill();
        // Screen lines
        ctx.strokeStyle = '#5c6b40';
        ctx.lineWidth = 1;
        ctx.strokeRect(-12, -12, 24, 10);
      }

      // Highlight
      ctx.fillStyle = '#ffffff44';
      ctx.fillRect(-10, -12, 6, 4);
      ctx.fillRect(-12, -10, 4, 6);
      
      // Face
      if (customization.costume === 'gameboy') {
        ctx.fillStyle = '#0f380f';
        // Eyes (Square pixel style, fit in screen)
        ctx.fillRect(-8, -10, 4, 4); // Eye L
        ctx.fillRect(4, -10, 4, 4);  // Eye R
        // Smile (Pixel style)
        ctx.fillRect(-4, -5, 8, 2);
        ctx.fillRect(-6, -7, 2, 2);
        ctx.fillRect(4, -7, 2, 2);
      } else {
        ctx.fillStyle = '#000';
        // Eyes (Square pixel style)
        ctx.fillRect(-8, -5, 5, 5); // Eye L
        ctx.fillRect(4, -5, 5, 5);  // Eye R
        // Smile
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 4, 8, 0, Math.PI);
        ctx.stroke();
        
        // Tongue (More detailed)
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(2, 8, 7, 10);
        ctx.fillStyle = '#b91c1c'; // Tongue shading
        ctx.fillRect(7, 8, 2, 10);
        ctx.fillStyle = '#f87171'; // Tongue highlight
        ctx.fillRect(3, 9, 2, 2);
      }
      
      // Shield or Invincible
      if (player.shield || player.invincible) {
        ctx.strokeStyle = player.invincible ? '#fff' : '#3b82f6';
        ctx.lineWidth = 3;
        if (player.invincible) {
          ctx.setLineDash([5, 5]);
          ctx.lineDashOffset = -Date.now() * 0.05;
        }
        ctx.beginPath();
        ctx.arc(0, 0, PLAYER_SIZE, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Magnet Field
      if (player.magnet) {
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 100 + Math.sin(Date.now() * 0.01) * 10, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }
      
    // Entities
      player.bullets.forEach(b => b.draw(ctx));
      entities.enemies.forEach(e => e.draw(ctx, selectedWorld));
      entities.wisps.forEach(w => w.draw(ctx));
      entities.powerups.forEach(p => p.draw(ctx));
      entities.particles.forEach(p => {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        if (p.type === 'wispy') {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.type === 'fiery') {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y - p.size);
          ctx.lineTo(p.x + p.size/2, p.y + p.size/2);
          ctx.lineTo(p.x - p.size/2, p.y + p.size/2);
          ctx.fill();
        } else {
          ctx.fillRect(p.x, p.y, p.size, p.size);
        }
        ctx.globalAlpha = 1;
      });
      entities.floatingTexts.forEach(t => {
        ctx.globalAlpha = t.life;
        ctx.fillStyle = t.color;
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(t.text, t.x, t.y);
        ctx.globalAlpha = 1;
      });

      // Boss
      if (entities.boss) {
        const b = entities.boss;
        ctx.save();
        ctx.translate(b.x, b.y);
        
        // Boss Body (Pixelated circle-ish)
        ctx.fillStyle = '#1e1b4b';
        ctx.fillRect(-60, -60, 120, 120);
        ctx.fillStyle = '#312e81';
        ctx.fillRect(-50, -50, 100, 100);
        
        // Eyes (Glow)
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#ef4444';
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(-35, -25, 20, 20);
        ctx.fillRect(15, -25, 20, 20);
        ctx.shadowBlur = 0;
        
        // Mouth
        ctx.fillStyle = '#000';
        ctx.fillRect(-20, 20, 40, 10);
        
        // Health Bar
        ctx.fillStyle = '#334155';
        ctx.fillRect(-60, -90, 120, 12);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(-60, -90, (b.health / b.maxHealth) * 120, 12);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(-60, -90, 120, 12);
        
        ctx.restore();
      }

      // Slow Time Visual Effect
      if (playerRef.current.slowTimeTimer > 0) {
        ctx.fillStyle = 'rgba(96, 165, 250, 0.15)';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        // Vignette
        const gradient = ctx.createRadialGradient(CANVAS_WIDTH/2, CANVAS_HEIGHT/2, CANVAS_HEIGHT/3, CANVAS_WIDTH/2, CANVAS_HEIGHT/2, CANVAS_WIDTH/2);
        gradient.addColorStop(0, 'rgba(96, 165, 250, 0)');
        gradient.addColorStop(1, 'rgba(96, 165, 250, 0.4)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      }
      
      ctx.restore();
      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [gameState, isPaused]);

  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
    }
  }, [score, highScore]);

  return (
    <div ref={containerRef} className="w-full h-screen bg-slate-950 flex items-center justify-center overflow-hidden font-sans text-white select-none">
      <div 
        className="relative shadow-[0_0_100px_rgba(0,0,0,0.5)] overflow-hidden bg-black"
        style={{ 
          width: CANVAS_WIDTH, 
          height: CANVAS_HEIGHT,
          transform: `scale(${scale})`,
          transformOrigin: 'center center'
        }}
      >
        {/* Initials Prompt */}
      <AnimatePresence>
        {showInitialsPrompt && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-xl"
          >
            <div className="text-center space-y-8 max-w-md w-full px-6">
              <div className="space-y-2">
                <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                <h2 className="text-4xl font-black tracking-tighter text-white italic">NEW HIGH SCORE!</h2>
                <p className="text-slate-400 font-bold tracking-widest uppercase text-sm">Enter your initials</p>
              </div>

              <div className="flex justify-center gap-4">
                <input 
                  type="text"
                  maxLength={3}
                  value={initials}
                  onChange={(e) => setInitials(e.target.value.toUpperCase())}
                  autoFocus
                  className="w-48 bg-slate-900 border-2 border-purple-500 rounded-2xl p-4 text-4xl font-black text-center tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-purple-400 transition-all"
                  placeholder="___"
                />
              </div>

              <button 
                onClick={() => {
                  saveScore(tempScore, initials || 'GHO');
                  setShowInitialsPrompt(false);
                  setInitials('');
                  setGameState('gameover');
                }}
                className="w-full py-4 bg-purple-600 hover:bg-purple-500 rounded-2xl font-black text-xl transition-all transform hover:scale-105 active:scale-95"
              >
                SAVE SCORE
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Start Menu */}
      {gameState === 'start_menu' && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-md p-4"
        >
          <div className="text-center space-y-4 max-w-md w-full px-6 overflow-y-auto max-h-full py-8 custom-scrollbar">
            <div className="space-y-1">
              <h1 className="text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-purple-500 drop-shadow-[0_5px_15px_rgba(168,85,247,0.5)] leading-tight">
                GOING, GOING,<br/>GHOST
              </h1>
              <p className="text-purple-400 font-bold tracking-widest uppercase text-[10px]">Spectral Shooter</p>
            </div>
            
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3">
                <button 
                  onClick={() => {
                    setGameState('holiday_craze');
                    soundManager.nav();
                  }}
                  className="px-3 py-3 bg-slate-800 hover:bg-slate-700 rounded-2xl font-bold text-sm transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2 border border-slate-700"
                >
                  <Calendar size={18} className="text-purple-400" /> HOLIDAY CRAZE
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3">
              <button 
                onClick={() => {
                  resetGame();
                  soundManager.click();
                }}
                className="group relative px-6 py-3 bg-purple-600 hover:bg-purple-500 rounded-2xl font-black text-lg transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(168,85,247,0.4)]"
              >
                <Play size={24} className="fill-white" /> START GAME
              </button>

              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => {
                    setGameState('shop');
                    soundManager.nav();
                  }}
                  className="px-3 py-3 bg-slate-800 hover:bg-slate-700 rounded-2xl font-bold text-sm transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2 border border-slate-700"
                >
                  <div className="w-5 h-5 rounded-full bg-yellow-500 flex items-center justify-center text-[9px] text-black font-black">$</div> SHOP
                </button>
                
                <button 
                  onClick={() => {
                    setGameState('customization');
                    soundManager.nav();
                  }}
                  className="px-3 py-3 bg-slate-800 hover:bg-slate-700 rounded-2xl font-bold text-sm transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2 border border-slate-700"
                >
                  <Ghost size={18} className="text-purple-400" /> CUSTOMIZE
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => {
                    setGameState('settings');
                    soundManager.nav();
                  }}
                  className="px-3 py-3 bg-slate-800 hover:bg-slate-700 rounded-2xl font-bold text-sm transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2 border border-slate-700"
                >
                  <RotateCcw size={18} className="text-slate-400" /> SETTINGS
                </button>
                
                <button 
                  onClick={() => {
                    setGameState('leaderboard');
                    soundManager.nav();
                  }}
                  className="px-3 py-3 bg-slate-800 hover:bg-slate-700 rounded-2xl font-bold text-sm transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2 border border-slate-700"
                >
                  <Trophy size={18} className="text-yellow-500" /> HALL OF FAME
                </button>
              </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 text-slate-500 text-[10px] font-medium space-y-1">
              <p>WASD / ARROWS to Move • SPACE / K to Shoot</p>
              <p>ESC / P to Pause</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Shop View */}
      {gameState === 'shop' && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-xl p-4"
        >
          <div className="max-w-2xl w-full bg-slate-900/50 p-6 rounded-3xl border border-slate-800 shadow-2xl flex flex-col max-h-[95%]">
            <div className="flex items-center justify-between mb-4 shrink-0">
              <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-yellow-500 flex items-center justify-center text-[10px] text-black font-black">$</div> SPECTRAL SHOP
              </h2>
              <div className="bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 flex items-center gap-2">
                <span className="text-yellow-500 font-black text-sm">{coins}</span>
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Coins</span>
              </div>
            </div>

            <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar mb-4 flex-grow">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Upgrades</h3>
              {[
                { id: 'speed', name: 'Ghost Speed', icon: '💨', cost: 50, current: upgrades.speed, desc: 'Move faster through the graveyard' },
                { id: 'damage', name: 'Spectral Power', icon: '🔥', cost: 100, current: upgrades.damage - 1, desc: 'Increase bullet damage' },
                { id: 'maxLives', name: 'Soul Resilience', icon: '❤️', cost: 150, current: upgrades.maxLives - 5, desc: 'Increase maximum lives' },
              ].map((item) => (
                <div key={item.id} className="p-3 bg-slate-800/50 rounded-2xl border border-slate-700/50 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{item.icon}</div>
                    <div>
                      <p className="font-bold text-base leading-none">{item.name}</p>
                      <p className="text-[9px] text-slate-500 uppercase font-bold tracking-wider mt-0.5">{item.desc}</p>
                      <p className="text-[10px] text-purple-400 font-bold mt-0.5">Level {item.current}</p>
                    </div>
                  </div>
                  <button 
                    disabled={coins < item.cost}
                    onClick={() => {
                      setCoins(c => c - item.cost);
                      setUpgrades(prev => ({
                        ...prev,
                        [item.id]: prev[item.id as keyof typeof prev] + 1
                      }));
                      soundManager.powerup();
                    }}
                    className={`px-3 py-1.5 rounded-xl font-black text-xs transition-all ${coins >= item.cost ? 'bg-yellow-500 text-black hover:scale-105 active:scale-95' : 'bg-slate-700 text-slate-500 cursor-not-allowed'}`}
                  >
                    {item.cost} $
                  </button>
                </div>
              ))}

              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-4">Special Costumes</h3>
              {[
                { id: 'vibe_coding', name: 'Vibe Coding, Gemini Style', icon: '🌈', cost: 1, desc: 'Trippy rainbow tie-dye trail' },
                { id: 'cosmic_wanderer', name: 'Cosmic Wanderer', icon: '🌌', cost: 150, desc: 'Swirling galaxy with nebula trail' },
                { id: 'gameboy', name: 'The Boy Who Cried Game', icon: '👾', cost: 0, desc: 'Retro 8-bit handheld style' },
              ].map((costume) => (
                <div key={costume.id} className="p-3 bg-slate-800/50 rounded-2xl border border-slate-700/50 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{costume.icon}</div>
                    <div>
                      <p className="font-bold text-base leading-none">{costume.name}</p>
                      <p className="text-[9px] text-slate-500 uppercase font-bold tracking-wider mt-0.5">{costume.desc}</p>
                      {unlockedCostumes.includes(costume.id) ? (
                        <p className="text-[10px] text-green-400 font-bold mt-0.5">UNLOCKED</p>
                      ) : (
                        <p className="text-[10px] text-slate-500 font-bold mt-0.5">LOCKED</p>
                      )}
                    </div>
                  </div>
                  {!unlockedCostumes.includes(costume.id) && (
                    <button 
                      disabled={coins < costume.cost}
                      onClick={() => {
                        setCoins(c => c - costume.cost);
                        setUnlockedCostumes(prev => [...prev, costume.id]);
                        soundManager.powerup();
                      }}
                      className={`px-3 py-1.5 rounded-xl font-black text-xs transition-all ${coins >= costume.cost ? 'bg-yellow-500 text-black hover:scale-105 active:scale-95' : 'bg-slate-700 text-slate-500 cursor-not-allowed'}`}
                    >
                      {costume.cost} $
                    </button>
                  )}
                </div>
              ))}

              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-4">Worlds</h3>
              {[
                { id: 'forest', name: 'Whispering Woods', icon: '🌲', cost: 500, desc: 'A rainy, dense forest full of spirits' },
                { id: 'crypt', name: 'Forgotten Crypt', icon: '💀', cost: 1000, desc: 'A dusty, ancient tomb with magical aura' },
                { id: 'disco', name: 'Disco Inferno', icon: '🕺', cost: 2500, desc: 'A neon-lit spectral dance floor' },
                { id: 'gold_mine', name: 'Gilded Grotto', icon: '⛏️', cost: 5000, desc: 'A mine filled with spectral gold' },
                { id: 'out_of_this_world', name: 'Out of this World', icon: '🌌', cost: 99, desc: 'A cosmic journey through the stars' },
              ].map((world) => (
                <div key={world.id} className="p-3 bg-slate-800/50 rounded-2xl border border-slate-700/50 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{world.icon}</div>
                    <div>
                      <p className="font-bold text-base leading-none">{world.name}</p>
                      <p className="text-[9px] text-slate-500 uppercase font-bold tracking-wider mt-0.5">{world.desc}</p>
                      {unlockedWorlds.includes(world.id as WorldType) ? (
                        <p className="text-[10px] text-green-400 font-bold mt-0.5">UNLOCKED</p>
                      ) : (
                        <p className="text-[10px] text-slate-500 font-bold mt-0.5">LOCKED</p>
                      )}
                    </div>
                  </div>
                  {!unlockedWorlds.includes(world.id as WorldType) && (
                    <button 
                      disabled={coins < world.cost}
                      onClick={() => {
                        setCoins(c => c - world.cost);
                        setUnlockedWorlds(prev => [...prev, world.id as WorldType]);
                        setPurchasedWorld({ name: world.name, icon: world.icon });
                        soundManager.powerup();
                      }}
                      className={`px-3 py-1.5 rounded-xl font-black text-xs transition-all ${coins >= world.cost ? 'bg-yellow-500 text-black hover:scale-105 active:scale-95' : 'bg-slate-700 text-slate-500 cursor-not-allowed'}`}
                    >
                      {world.cost} $
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-3 shrink-0">
              <button 
                onClick={() => {
                  setGameState('start_menu');
                  soundManager.nav();
                }}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 rounded-2xl font-bold transition-all text-sm"
              >
                BACK TO MENU
              </button>

              <button 
                onClick={() => {
                  setShowResetConfirm(true);
                  soundManager.click();
                }}
                className="w-full py-1.5 mt-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 border border-red-900/50 rounded-xl font-bold text-[10px] transition-all flex items-center justify-center gap-2"
              >
                <RotateCcw size={12} /> RESET ALL UPGRADES
              </button>
            </div>

            {showResetConfirm && (
              <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-6">
                <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl text-center space-y-6 max-w-xs">
                  <h3 className="text-xl font-black">REFUND UPGRADES?</h3>
                  <p className="text-slate-400 text-sm">You will get all your spent coins back and your stats will reset to default.</p>
                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={() => {
                        const refund = upgrades.speed * 50 + (upgrades.damage - 1) * 100 + (upgrades.maxLives - 5) * 150;
                        setCoins(c => c + refund);
                        setUpgrades({ speed: 0, damage: 1, maxLives: 5 });
                        setShowResetConfirm(false);
                        soundManager.powerup();
                      }}
                      className="py-3 bg-red-600 hover:bg-red-500 rounded-xl font-bold"
                    >
                      YES, RESET
                    </button>
                    <button 
                      onClick={() => setShowResetConfirm(false)}
                      className="py-3 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold"
                    >
                      CANCEL
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Settings View */}
      {gameState === 'settings' && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-xl p-4"
        >
          <div className="max-w-md w-full bg-slate-900/50 p-6 rounded-3xl border border-slate-800 shadow-2xl flex flex-col max-h-[95%]">
            <h2 className="text-2xl font-black tracking-tight mb-4 shrink-0">GAME SETTINGS</h2>
            
            <div className="space-y-4 mb-6 overflow-y-auto pr-2 custom-scrollbar flex-grow">
              <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-2xl border border-slate-700/50">
                <div>
                  <p className="font-bold text-sm">Invert Controls</p>
                  <p className="text-[10px] text-slate-500">Swap Up and Down keys</p>
                </div>
                <button 
                  onClick={() => {
                    setSettings(s => ({ ...s, invertControls: !s.invertControls }));
                    soundManager.click();
                  }}
                  className={`w-12 h-7 rounded-full transition-all relative ${settings.invertControls ? 'bg-purple-600' : 'bg-slate-700'}`}
                >
                  <motion.div 
                    animate={{ x: settings.invertControls ? 20 : 4 }}
                    className="absolute top-1 w-5 h-5 bg-white rounded-full shadow-lg"
                  />
                </button>
              </div>

              <div className="p-3 bg-slate-800/50 rounded-2xl border border-slate-700/50">
                <div className="flex justify-between mb-1">
                  <p className="font-bold text-sm">Screen Shake</p>
                  <p className="font-black text-purple-400 text-sm">{settings.screenShakeIntensity}%</p>
                </div>
                <input 
                  type="range"
                  min="0"
                  max="200"
                  value={settings.screenShakeIntensity}
                  onChange={(e) => setSettings(s => ({ ...s, screenShakeIntensity: parseInt(e.target.value) }))}
                  className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
              </div>

              <div className="p-3 bg-slate-800/50 rounded-2xl border border-slate-700/50">
                <p className="font-bold mb-3 text-sm">Select World</p>
                <div className="grid grid-cols-1 gap-2 max-h-[180px] overflow-y-auto pr-2 custom-scrollbar">
                  {unlockedWorlds.map(world => {
                    const worldInfo = {
                      graveyard: { name: 'Graveyard', icon: '🪦', colors: ['#020617', '#1e1b4b'] },
                      forest: { name: 'Whispering Woods', icon: '🌲', colors: ['#064e3b', '#022c22'] },
                      crypt: { name: 'Forgotten Crypt', icon: '💀', colors: ['#450a0a', '#1a0505'] },
                      disco: { name: 'Disco Inferno', icon: '🕺', colors: ['#1e1b4b', '#4c1d95'] },
                      gold_mine: { name: 'Gilded Grotto', icon: '⛏️', colors: ['#451a03', '#78350f'] },
                      gg: { name: 'GG', icon: '🍂', colors: ['#92400e', '#78350f'] },
                      halloween: { name: 'Hallowed Hollow', icon: '🎃', holiday: true, colors: ['#0c0a09', '#431407'] },
                      christmas: { name: 'Winter Wonderland', icon: '🎄', holiday: true, colors: ['#064e3b', '#14532d'] },
                      new_year: { name: 'Midnight Gala', icon: '🎆', holiday: true, colors: ['#020617', '#1e1b4b'] },
                      valentines: { name: 'Love Labyrinth', icon: '💝', holiday: true, colors: ['#4c0519', '#831843'] },
                      easter: { name: 'Easter Egg-stravaganza', icon: '🐰', holiday: true, colors: ['#0ea5e9', '#38bdf8'] },
                      out_of_this_world: { name: 'Out of this World', icon: '🌌', colors: ['#020617', '#1e1b4b'] }
                    }[world];
                    
                    if (!worldInfo) return null;

                    return (
                      <button 
                        key={world}
                        onClick={() => {
                          setSelectedWorld(world);
                          soundManager.click();
                        }}
                        className={`p-3 rounded-2xl font-bold text-xs transition-all border flex items-center justify-between gap-3 relative overflow-hidden ${selectedWorld === world ? 'border-purple-400' : 'border-slate-800 hover:border-slate-700'}`}
                      >
                        <div className="absolute inset-0 opacity-20" style={{ background: `linear-gradient(to right, ${worldInfo.colors[0]}, ${worldInfo.colors[1]})` }} />
                        <div className="flex items-center gap-3 relative z-10">
                          <span className="text-2xl">{worldInfo.icon}</span>
                          <span className="font-black tracking-tight">{worldInfo.name.toUpperCase()}</span>
                        </div>
                        {worldInfo.holiday && (
                          <span className="relative z-10 text-[8px] bg-purple-900/80 px-2 py-0.5 rounded-full text-purple-200 font-black tracking-widest border border-purple-500/30">HOLIDAY</span>
                        )}
                        {selectedWorld === world && (
                          <div className="relative z-10 w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <button 
              onClick={() => {
                setGameState('start_menu');
                soundManager.nav();
              }}
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 rounded-2xl font-bold transition-all text-sm"
            >
              BACK TO MENU
            </button>
          </div>
        </motion.div>
      )}

      {/* Customization View */}
      {gameState === 'customization' && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-xl p-4"
        >
          <div className="max-w-md w-full bg-slate-900/50 p-6 rounded-3xl border border-slate-800 shadow-2xl flex flex-col max-h-[95%]">
            <h2 className="text-2xl font-black tracking-tight mb-4 shrink-0">CUSTOMIZE GHOST</h2>
            
            <div className="flex justify-center mb-4 shrink-0 bg-slate-950/50 rounded-2xl p-4 border border-slate-800">
              <div className="relative w-48 h-24 flex items-center justify-center overflow-hidden">
                <PreviewCanvas customization={customization} />
              </div>
            </div>

            <div className="space-y-6 mb-6 overflow-y-auto pr-2 custom-scrollbar flex-grow">
              <div>
                <p className="font-bold mb-3 text-sm uppercase tracking-widest text-slate-500">Costume</p>
                <div className="grid grid-cols-1 gap-3">
                  {[
                    { id: 'none', name: 'Standard Ghost', desc: 'A classic spectral form' },
                    { id: 'ghostly_dance', name: 'Ghostly Dance', desc: 'Pulsates to the spectral beat' },
                    { id: 'vibe_coding', name: 'Vibe Coding, Gemini Style', desc: 'Trippy rainbow tie-dye trail' },
                    { id: 'cosmic_wanderer', name: 'Cosmic Wanderer', desc: 'Swirling galaxy with nebula trail' },
                    { id: 'gameboy', name: 'The Boy Who Cried Game', desc: 'Retro 8-bit handheld style' },
                  ].filter(c => unlockedCostumes.includes(c.id)).map(costume => (
                    <button 
                      key={costume.id}
                      onClick={() => {
                        setCustomization(c => ({ ...c, costume: costume.id as any }));
                        if (costume.id === 'vibe_coding') soundManager.costumeVibe();
                        else if (costume.id === 'ghostly_dance') soundManager.costumeDance();
                        else soundManager.click();
                      }}
                      className={`p-4 rounded-2xl border-2 text-left transition-all ${customization.costume === costume.id ? 'border-purple-500 bg-purple-500/10' : 'border-slate-800 bg-slate-800/30 hover:border-slate-700'}`}
                    >
                      <p className="font-bold">{costume.name}</p>
                      <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{costume.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="font-bold mb-3 text-sm uppercase tracking-widest text-slate-500">Trail Pattern</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'standard', name: 'Standard' },
                    { id: 'starry', name: 'Starry' },
                    { id: 'glitch', name: 'Glitch' },
                    { id: 'sparkle', name: 'Sparkle' },
                    { id: 'ripple', name: 'Ripple' },
                    { id: 'fire', name: 'Fire' }
                  ].map(pattern => (
                    <button 
                      key={pattern.id}
                      onClick={() => {
                        setCustomization(c => ({ ...c, trailPattern: pattern.id as any }));
                        soundManager.click();
                      }}
                      className={`py-2 rounded-xl border-2 text-xs font-bold transition-all ${customization.trailPattern === pattern.id ? 'border-purple-500 bg-purple-500/10' : 'border-slate-800 bg-slate-800/30 hover:border-slate-700'}`}
                    >
                      {pattern.name}
                    </button>
                  ))}
                  <button 
                    onClick={() => {
                      setCustomization(c => ({ ...c, trailPattern: 'standard' }));
                      soundManager.click();
                    }}
                    className="py-2 rounded-xl border-2 border-slate-800 bg-slate-800/30 hover:border-slate-700 text-[10px] font-black text-slate-400 uppercase tracking-tighter col-span-3"
                  >
                    RESET
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="font-bold text-sm uppercase tracking-widest text-slate-500">Ghost Color</p>
                  <input 
                    type="color" 
                    value={customization.ghostColor}
                    onChange={(e) => setCustomization(c => ({ ...c, ghostColor: e.target.value }))}
                    className="w-8 h-8 bg-transparent border-none cursor-pointer"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {['#a855f7', '#ef4444', '#3b82f6', '#22c55e', '#eab308', '#ec4899', '#ffffff', '#000000', '#f97316', '#06b6d4'].map(color => (
                    <button 
                      key={color}
                      onClick={() => {
                        setCustomization(c => ({ ...c, ghostColor: color }));
                        soundManager.click();
                      }}
                      className={`w-8 h-8 rounded-full border-2 transition-all transform hover:scale-110 ${customization.ghostColor === color ? 'border-white scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="font-bold text-sm uppercase tracking-widest text-slate-500">Trail Color</p>
                  <input 
                    type="color" 
                    value={customization.trailColor}
                    onChange={(e) => setCustomization(c => ({ ...c, trailColor: e.target.value }))}
                    className="w-8 h-8 bg-transparent border-none cursor-pointer"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {['#d8b4fe', '#fca5a5', '#93c5fd', '#86efac', '#fef08a', '#f9a8d4', '#ffffff', '#475569', '#fdba74', '#67e8f9'].map(color => (
                    <button 
                      key={color}
                      onClick={() => {
                        setCustomization(c => ({ ...c, trailColor: color }));
                        soundManager.click();
                      }}
                      className={`w-8 h-8 rounded-full border-2 transition-all transform hover:scale-110 ${customization.trailColor === color ? 'border-white scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <button 
              onClick={() => {
                setGameState('start_menu');
                soundManager.nav();
              }}
              className="w-full py-4 bg-slate-800 hover:bg-slate-700 rounded-2xl font-bold transition-all"
            >
              BACK TO MENU
            </button>
          </div>
        </motion.div>
      )}
      {gameState === 'leaderboard' && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-xl p-4"
        >
          <div className="max-w-md w-full bg-slate-900/50 p-6 rounded-3xl border border-slate-800 shadow-2xl flex flex-col max-h-[95%]">
            <div className="flex items-center justify-between mb-6 shrink-0">
              <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
                <Trophy className="text-yellow-500" /> HALL OF FAME
              </h2>
              <button 
                onClick={() => {
                  setGameState('start_menu');
                  soundManager.nav();
                }}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <RotateCcw size={20} />
              </button>
            </div>

            <div className="space-y-3 mb-6 overflow-y-auto pr-2 custom-scrollbar flex-grow">
              {leaderboard.length > 0 ? (
                leaderboard.map((entry, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                    <div className="flex items-center gap-4">
                      <span className={`w-6 text-center font-black ${i === 0 ? 'text-yellow-500' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-orange-500' : 'text-slate-600'}`}>
                        {i + 1}
                      </span>
                      <div>
                        <div className="flex items-center gap-3">
                          <p className="font-black text-xl text-purple-400 tracking-tighter">{entry.name}</p>
                          <p className="font-black text-2xl text-white">{entry.score.toLocaleString()}</p>
                        </div>
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mt-1">{entry.date}</p>
                      </div>
                    </div>
                    {i === 0 && <Trophy size={14} className="text-yellow-500" />}
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-slate-600 font-medium italic">
                  No souls have claimed glory yet...
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button 
                onClick={resetHighScores}
                className="flex-1 py-3 bg-red-900/50 hover:bg-red-800/50 text-red-200 rounded-2xl font-bold transition-all text-sm border border-red-800/50"
              >
                RESET SCORES
              </button>
              <button 
                onClick={() => {
                  setGameState('start_menu');
                  soundManager.nav();
                }}
                className="flex-[2] py-3 bg-slate-800 hover:bg-slate-700 rounded-2xl font-bold transition-all text-sm"
              >
                BACK TO MENU
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {gameState === 'holiday_craze' && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-xl p-4"
        >
          <div className="max-w-md w-full bg-slate-900/50 p-6 rounded-3xl border border-slate-800 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-black tracking-tight">HOLIDAY CRAZE</h2>
              <button onClick={() => { setGameState('start_menu'); soundManager.nav(); }} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
                <RotateCcw size={20} />
              </button>
            </div>
            <div className="space-y-2">
              {HOLIDAYS.map(h => (
                <div key={h.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                  <span className="text-slate-300 font-bold flex items-center gap-2">
                    {h.icon} {h.name}
                  </span>
                  <span className="text-slate-500 italic text-[10px]">{h.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Pause Overlay */}
      {isPaused && gameState === 'playing' && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-40"
        >
          <div className="bg-slate-900/80 p-8 rounded-2xl border-2 border-purple-500 shadow-[0_0_30px_rgba(168,85,247,0.3)] text-center max-w-xs w-full">
            <h2 className="text-4xl font-black mb-8 text-purple-400 tracking-widest uppercase italic">Paused</h2>
            <div className="space-y-4">
              <button 
                onClick={() => setIsPaused(false)}
                className="w-full px-8 py-4 bg-purple-600 hover:bg-purple-500 rounded-xl font-black transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
              >
                <Play size={24} className="fill-white" /> RESUME
              </button>
              <button 
                onClick={() => {
                  setIsPaused(false);
                  setGameState('start_menu');
                  soundManager.nav();
                }}
                className="w-full px-8 py-4 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold transition-all transform hover:scale-105 active:scale-95"
              >
                QUIT TO MENU
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Game Over Screen */}
      {gameState === 'gameover' && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-red-950/90 backdrop-blur-lg"
        >
          <div className="text-center space-y-8 max-w-md w-full px-6">
            <div className="space-y-2">
              <h2 className="text-6xl font-black tracking-tighter text-red-500 drop-shadow-lg italic">GAME OVER</h2>
              <p className="text-red-400 font-bold tracking-widest uppercase text-sm">Your soul has been claimed</p>
            </div>

            <div className="bg-black/40 p-6 rounded-3xl border border-red-900/50">
              <p className="text-slate-400 uppercase text-xs font-black tracking-widest mb-1">Final Score</p>
              <p className="text-5xl font-black text-white tracking-tight">{score.toLocaleString()}</p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <button 
                onClick={() => {
                  resetGame();
                  soundManager.click();
                }}
                className="w-full py-4 bg-white text-black hover:bg-slate-200 rounded-2xl font-black text-lg transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
              >
                <RotateCcw size={24} /> TRY AGAIN
              </button>
              <button 
                onClick={() => {
                  setGameState('leaderboard');
                  soundManager.nav();
                }}
                className="w-full py-4 bg-slate-800 hover:bg-slate-700 rounded-2xl font-bold transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
              >
                <Trophy size={20} className="text-yellow-500" /> VIEW HIGH SCORES
              </button>
              <button 
                onClick={() => {
                  setGameState('start_menu');
                  soundManager.nav();
                }}
                className="w-full py-4 bg-transparent hover:bg-white/5 rounded-2xl font-bold transition-all text-slate-400"
              >
                EXIT TO MENU
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* HUD */}
      {gameState === 'playing' && (
        <div className="absolute top-8 left-8 right-8 flex justify-between items-start z-10 pointer-events-none">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                {[...Array(maxLives)].map((_, i) => (
                  <Heart
                    key={i}
                    className={`w-8 h-8 ${i < lives ? 'text-red-500 fill-red-500' : 'text-slate-700'}`}
                  />
                ))}
              </div>
              <div className="flex items-center gap-4">
                <div className="text-4xl font-black tracking-tighter text-purple-400 drop-shadow-lg">
                  {score.toLocaleString()}
                </div>
                <div className="bg-slate-900/50 backdrop-blur-md px-3 py-1 rounded-full border border-yellow-500/30 flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-yellow-500 flex items-center justify-center text-[8px] text-black font-black">$</div>
                  <span className="text-yellow-500 font-black text-sm">{coins}</span>
                </div>
              </div>
            </div>
            
            {combo > 1 && (
              <motion.div 
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                key={combo}
                className="bg-yellow-500/80 backdrop-blur-md px-4 py-2 rounded-xl border border-yellow-400/50 shadow-lg self-start"
              >
                <p className="text-[10px] text-yellow-100 uppercase font-black tracking-widest">Combo Multiplier</p>
                <p className="text-2xl font-black text-white italic">x{(1 + combo * 0.1).toFixed(1)}</p>
              </motion.div>
            )}

            {/* Upgrades HUD */}
            <div className="flex gap-2">
              {playerRef.current.upgrades.speed > 0 && (
                <div className="bg-blue-500/20 border border-blue-500/50 px-2 py-1 rounded text-[10px] font-bold text-blue-400">
                  SPEED +{playerRef.current.upgrades.speed}
                </div>
              )}
              {playerRef.current.upgrades.damage > 1 && (
                <div className="bg-orange-500/20 border border-orange-500/50 px-2 py-1 rounded text-[10px] font-bold text-orange-400">
                  DAMAGE +{playerRef.current.upgrades.damage - 1}
                </div>
              )}
            </div>

            {/* Objective UI */}
            {objective && (
              <motion.div 
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="mt-4 bg-slate-900/80 backdrop-blur-md p-4 rounded-2xl border-l-4 border-purple-500 shadow-xl max-w-xs"
              >
                <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Current Objective</p>
                <p className="text-sm font-bold text-white">{objective.text}</p>
                {objective.target > 1 && (
                  <div className="mt-2 w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${(objective.current / objective.target) * 100}%` }}
                      className="h-full bg-purple-500"
                    />
                  </div>
                )}
              </motion.div>
            )}
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-widest text-slate-500 font-bold">High Score</div>
            <div className="text-2xl font-bold text-slate-300">{highScore.toLocaleString()}</div>
          </div>
        </div>
      )}

      {/* Game Canvas */}
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="block cursor-none"
      />

      <AnimatePresence>
        {purchasedWorld && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md"
          >
            <div className="bg-slate-900 border-2 border-yellow-500 p-10 rounded-3xl text-center space-y-6 shadow-[0_0_50px_rgba(234,179,8,0.3)]">
              <div className="text-6xl">{purchasedWorld.icon}</div>
              <h3 className="text-3xl font-black text-white">{purchasedWorld.name.toUpperCase()} UNLOCKED!</h3>
              <p className="text-yellow-500 font-bold tracking-widest">NEW WORLD DISCOVERED</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  </div>
);
}
