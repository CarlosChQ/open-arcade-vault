export type AsteroidsPhase = "ready" | "playing" | "dead" | "gameover";

export interface AsteroidsSnapshot {
  phase: AsteroidsPhase;
  paused: boolean;
  score: number;
  lives: number;
  level: number;
  tripleShot: number; // segundos restantes, 0 = inactivo
}

export interface AsteroidsEngineOptions {
  canvas: HTMLCanvasElement;
  onSnapshot: (snapshot: AsteroidsSnapshot) => void;
}

export interface AsteroidsEngine {
  start(): void;
  pause(): void;
  resume(): void;
  restart(): void;
  gameOver(): void;
  destroy(): void;
  setKey(code: string, down: boolean): void;
  press(code: string): void;
  getSnapshot(): AsteroidsSnapshot;
}

const W = 800;
const H = 600;

const POWERUP_DROP_CHANCE = 0.15;
const POWERUP_DURATION = 5;
const POWERUP_TTL = 12;
const TRIPLE_SPREAD = 0.18;

const BULLET_SPEED = 520;
const BULLET_TTL = 1.1;
const BULLET_RADIUS = 2;

const SHIP_RADIUS = 12;
const SHIP_ROTATION = 3.5;
const SHIP_THRUST = 260;
const SHIP_DRAG = 0.987;
const SHIP_INVINCIBLE = 3;
const SHIP_SHOOT_COOLDOWN = 0.2;
const SHIP_NOSE = 21;

const RESPAWN_DELAY = 2;
const MAX_DT = 0.05;

type AsteroidSize = 1 | 2 | 3;

const ASTEROID_RADII = [0, 16, 30, 50] as const;
const ASTEROID_SPEEDS = [0, 85, 55, 32] as const;
const ASTEROID_POINTS = [0, 100, 50, 20] as const;

const wrap = (value: number, max: number): number =>
  ((value % max) + max) % max;

const dist = (
  a: { x: number; y: number },
  b: { x: number; y: number },
): number => Math.hypot(a.x - b.x, a.y - b.y);

const rand = (min: number, max: number): number =>
  min + Math.random() * (max - min);

const randInt = (min: number, max: number): number =>
  Math.floor(rand(min, max + 1));

class Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ttl = BULLET_TTL;
  radius = BULLET_RADIUS;
  dead = false;

  constructor(x: number, y: number, angle: number) {
    this.x = x;
    this.y = y;
    this.vx = Math.cos(angle) * BULLET_SPEED;
    this.vy = Math.sin(angle) * BULLET_SPEED;
  }

  update(dt: number): void {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

class Asteroid {
  x: number;
  y: number;
  size: AsteroidSize;
  radius: number;
  vx: number;
  vy: number;
  rot: number;
  rotSpeed: number;
  verts: Array<[number, number]>;
  dead = false;

  constructor(x: number, y: number, size: AsteroidSize = 3) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.radius = ASTEROID_RADII[size];

    const angle = rand(0, Math.PI * 2);
    const speed = ASTEROID_SPEEDS[size] + rand(-15, 15);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rotSpeed = rand(-1.2, 1.2);
    this.rot = rand(0, Math.PI * 2);

    const n = randInt(8, 13);
    this.verts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = this.radius * rand(0.6, 1);
      this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
  }

  update(dt: number): void {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
  }

  split(): Asteroid[] {
    if (this.size <= 1) return [];
    const childSize = (this.size - 1) as AsteroidSize;
    return [
      new Asteroid(this.x, this.y, childSize),
      new Asteroid(this.x, this.y, childSize),
    ];
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1.5;
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++) {
      ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

class PowerUp {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius = 12;
  ttl = POWERUP_TTL;
  age = 0;
  dead = false;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(20, 40);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
  }

  update(dt: number): void {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    this.age += dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (this.ttl < 2 && Math.floor(this.ttl * 8) % 2 === 0) return;
    const pulse = 0.85 + Math.sin(this.age * ((Math.PI * 2) / 1.5)) * 0.15;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(Math.PI / 4);
    ctx.strokeStyle = "#0ff";
    ctx.lineWidth = 2;
    const r = this.radius * pulse;
    ctx.strokeRect(-r, -r, r * 2, r * 2);
    ctx.restore();
    ctx.fillStyle = "#0ff";
    ctx.font = "bold 12px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("3x", this.x, this.y);
  }
}

class Ship {
  x = W / 2;
  y = H / 2;
  angle = -Math.PI / 2;
  vx = 0;
  vy = 0;
  radius = SHIP_RADIUS;
  thrusting = false;
  invincible = SHIP_INVINCIBLE;
  shootCooldown = 0;
  tripleShot = 0;
  dead = false;

  reset(): void {
    this.x = W / 2;
    this.y = H / 2;
    this.angle = -Math.PI / 2;
    this.vx = 0;
    this.vy = 0;
    this.radius = SHIP_RADIUS;
    this.thrusting = false;
    this.invincible = SHIP_INVINCIBLE;
    this.shootCooldown = 0;
    this.dead = false;
  }

  update(dt: number, keys: Set<string>): void {
    if (this.dead) return;
    if (this.invincible > 0) this.invincible -= dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;
    if (this.tripleShot > 0) this.tripleShot -= dt;

    if (keys.has("ArrowLeft")) this.angle -= SHIP_ROTATION * dt;
    if (keys.has("ArrowRight")) this.angle += SHIP_ROTATION * dt;

    this.thrusting = keys.has("ArrowUp");
    if (this.thrusting) {
      this.vx += Math.cos(this.angle) * SHIP_THRUST * dt;
      this.vy += Math.sin(this.angle) * SHIP_THRUST * dt;
    }

    this.vx *= SHIP_DRAG;
    this.vy *= SHIP_DRAG;
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
  }

  tryShoot(): Bullet[] {
    if (this.shootCooldown > 0 || this.dead) return [];
    this.shootCooldown = SHIP_SHOOT_COOLDOWN;
    const ox = this.x + Math.cos(this.angle) * SHIP_NOSE;
    const oy = this.y + Math.sin(this.angle) * SHIP_NOSE;
    if (this.tripleShot > 0) {
      return [
        new Bullet(ox, oy, this.angle - TRIPLE_SPREAD),
        new Bullet(ox, oy, this.angle),
        new Bullet(ox, oy, this.angle + TRIPLE_SPREAD),
      ];
    }
    return [new Bullet(ox, oy, this.angle)];
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (this.dead) return;
    if (this.invincible > 0 && Math.floor(this.invincible * 8) % 2 === 0) {
      return;
    }

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1.5;
    ctx.lineJoin = "round";

    ctx.beginPath();
    ctx.moveTo(20, 0);
    ctx.lineTo(-12, -9);
    ctx.lineTo(-7, 0);
    ctx.lineTo(-12, 9);
    ctx.closePath();
    ctx.stroke();

    if (this.thrusting && Math.random() > 0.35) {
      ctx.beginPath();
      ctx.moveTo(-8, -4);
      ctx.lineTo(-8 - rand(6, 14), 0);
      ctx.lineTo(-8, 4);
      ctx.strokeStyle = "rgba(255, 130, 0, 0.85)";
      ctx.stroke();
    }

    ctx.restore();
  }
}

class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  ttl: number;
  dead = false;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(30, 130);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.life = rand(0.4, 1.1);
    this.ttl = this.life;
  }

  update(dt: number): void {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const alpha = this.ttl / this.life;
    ctx.strokeStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 0.05, this.y - this.vy * 0.05);
    ctx.stroke();
  }
}

export function createAsteroidsEngine({
  canvas,
  onSnapshot,
}: AsteroidsEngineOptions): AsteroidsEngine {
  const ctx = canvas.getContext("2d");

  let destroyed = false;
  let frameId: number | null = null;
  let lastTime: number | null = null;

  let phase: AsteroidsPhase = "ready";
  let paused = false;
  let score = 0;
  let lives = 3;
  let level = 1;
  let deadTimer = 0;
  let powerUpSpawned = false;
  let killsSinceSpawn = 0;

  const keys = new Set<string>();
  const pressedKeys = new Set<string>();

  let ship = new Ship();
  let bullets: Bullet[] = [];
  let asteroids: Asteroid[] = [];
  let particles: Particle[] = [];
  let powerUps: PowerUp[] = [];

  let lastEmitted: AsteroidsSnapshot | null = null;

  const getSnapshot = (): AsteroidsSnapshot => ({
    phase,
    paused,
    score,
    lives,
    level,
    tripleShot: ship.tripleShot,
  });

  const emit = (): void => {
    if (destroyed) return;
    const next = getSnapshot();
    const roundedTriple = Math.round(next.tripleShot * 10) / 10;
    if (
      lastEmitted &&
      lastEmitted.phase === next.phase &&
      lastEmitted.paused === next.paused &&
      lastEmitted.score === next.score &&
      lastEmitted.lives === next.lives &&
      lastEmitted.level === next.level &&
      Math.round(lastEmitted.tripleShot * 10) / 10 === roundedTriple
    ) {
      return;
    }
    lastEmitted = { ...next, tripleShot: roundedTriple };
    onSnapshot(lastEmitted);
  };

  const pressed = (code: string): boolean => {
    if (!pressedKeys.has(code)) return false;
    pressedKeys.delete(code);
    return true;
  };

  const cancelFrame = (): void => {
    if (frameId !== null) cancelAnimationFrame(frameId);
    frameId = null;
  };

  const schedule = (): void => {
    if (destroyed || paused || frameId !== null || phase === "gameover") {
      return;
    }
    frameId = requestAnimationFrame(loop);
  };

  const spawnAsteroids = (count: number): void => {
    const SAFE_DIST = 130;
    for (let i = 0; i < count; i++) {
      let x: number;
      let y: number;
      do {
        x = rand(0, W);
        y = rand(0, H);
      } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
      asteroids.push(new Asteroid(x, y, 3));
    }
  };

  const resetState = (): void => {
    ship = new Ship();
    bullets = [];
    asteroids = [];
    particles = [];
    powerUps = [];
    powerUpSpawned = false;
    killsSinceSpawn = 0;
    score = 0;
    lives = 3;
    level = 1;
    deadTimer = 0;
    spawnAsteroids(4);
  };

  const nextLevel = (): void => {
    level++;
    bullets = [];
    particles = [];
    powerUps = [];
    powerUpSpawned = false;
    killsSinceSpawn = 0;
    ship.reset();
    spawnAsteroids(3 + level);
  };

  const explode = (x: number, y: number, count = 8): void => {
    for (let i = 0; i < count; i++) particles.push(new Particle(x, y));
  };

  const killShip = (): void => {
    explode(ship.x, ship.y, 14);
    ship.dead = true;
    lives--;
    if (lives <= 0) {
      phase = "gameover";
      cancelFrame();
    } else {
      phase = "dead";
      deadTimer = RESPAWN_DELAY;
    }
  };

  const update = (dt: number): void => {
    if (phase === "dead") {
      deadTimer -= dt;
      particles.forEach((particle) => particle.update(dt));
      particles = particles.filter((particle) => !particle.dead);
      asteroids.forEach((asteroid) => asteroid.update(dt));
      if (deadTimer <= 0) {
        phase = "playing";
        ship.reset();
      }
      return;
    }

    if (pressed("Space")) {
      bullets.push(...ship.tryShoot());
    }

    ship.update(dt, keys);
    bullets.forEach((bullet) => bullet.update(dt));
    asteroids.forEach((asteroid) => asteroid.update(dt));
    particles.forEach((particle) => particle.update(dt));
    powerUps.forEach((powerUp) => powerUp.update(dt));

    bullets = bullets.filter((bullet) => !bullet.dead);
    particles = particles.filter((particle) => !particle.dead);
    powerUps = powerUps.filter((powerUp) => !powerUp.dead);

    for (const powerUp of powerUps) {
      if (!powerUp.dead && dist(ship, powerUp) < ship.radius + powerUp.radius) {
        powerUp.dead = true;
        ship.tripleShot = POWERUP_DURATION;
      }
    }
    powerUps = powerUps.filter((powerUp) => !powerUp.dead);

    const newAsteroids: Asteroid[] = [];
    for (const bullet of bullets) {
      for (const asteroid of asteroids) {
        if (!asteroid.dead && !bullet.dead && dist(bullet, asteroid) < asteroid.radius) {
          bullet.dead = true;
          asteroid.dead = true;
          score += ASTEROID_POINTS[asteroid.size];
          explode(asteroid.x, asteroid.y, asteroid.size * 5);
          newAsteroids.push(...asteroid.split());
          if (!powerUpSpawned) {
            killsSinceSpawn++;
            const guaranteed = killsSinceSpawn >= 5;
            if (guaranteed || Math.random() < POWERUP_DROP_CHANCE) {
              powerUps.push(new PowerUp(asteroid.x, asteroid.y));
              powerUpSpawned = true;
            }
          }
        }
      }
    }
    asteroids = asteroids
      .filter((asteroid) => !asteroid.dead)
      .concat(newAsteroids);
    bullets = bullets.filter((bullet) => !bullet.dead);

    if (ship.invincible <= 0) {
      for (const asteroid of asteroids) {
        if (dist(ship, asteroid) < ship.radius + asteroid.radius * 0.82) {
          killShip();
          break;
        }
      }
    }

    if (asteroids.length === 0) nextLevel();
  };

  const draw = (): void => {
    if (!ctx) return;
    const width = canvas.width;
    const height = canvas.height;
    if (width === 0 || height === 0) return;

    ctx.setTransform(width / W, 0, 0, height / H, 0, 0);
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);

    particles.forEach((particle) => particle.draw(ctx));
    asteroids.forEach((asteroid) => asteroid.draw(ctx));
    powerUps.forEach((powerUp) => powerUp.draw(ctx));
    bullets.forEach((bullet) => bullet.draw(ctx));
    ship.draw(ctx);
  };

  const loop = (time: number): void => {
    frameId = null;
    if (destroyed) return;

    const dt =
      lastTime === null ? 0 : Math.min((time - lastTime) / 1000, MAX_DT);
    lastTime = time;

    if (!paused && (phase === "playing" || phase === "dead")) {
      update(dt);
      emit();
    }

    draw();

    if (!destroyed && !paused && phase !== "gameover") {
      frameId = requestAnimationFrame(loop);
    }
  };

  const engine: AsteroidsEngine = {
    start(): void {
      if (destroyed || phase !== "ready") return;
      ship.reset();
      phase = "playing";
      paused = false;
      lastTime = null;
      pressedKeys.clear();
      emit();
      schedule();
    },

    pause(): void {
      if (destroyed || paused) return;
      if (phase !== "playing" && phase !== "dead") return;
      paused = true;
      cancelFrame();
      emit();
    },

    resume(): void {
      if (destroyed || !paused) return;
      paused = false;
      lastTime = null;
      emit();
      schedule();
    },

    restart(): void {
      if (destroyed) return;
      resetState();
      phase = "playing";
      paused = false;
      lastTime = null;
      pressedKeys.clear();
      emit();
      schedule();
    },

    gameOver(): void {
      if (destroyed || phase === "gameover") return;
      phase = "gameover";
      paused = false;
      cancelFrame();
      emit();
    },

    destroy(): void {
      if (destroyed) return;
      destroyed = true;
      cancelFrame();
      keys.clear();
      pressedKeys.clear();
      bullets = [];
      asteroids = [];
      particles = [];
      powerUps = [];
    },

    setKey(code: string, down: boolean): void {
      if (destroyed) return;
      if (down) keys.add(code);
      else keys.delete(code);
    },

    press(code: string): void {
      if (destroyed) return;
      pressedKeys.add(code);
    },

    getSnapshot,
  };

  resetState();
  ship.invincible = 0;
  emit();
  schedule();

  return engine;
}
