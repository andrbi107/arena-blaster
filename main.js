// Arena Blaster - main game
// Top-down wave-survival arena shooter. Vanilla JS, no dependencies.
'use strict';
(function () {

  // =====================================================================
  // Constants
  // =====================================================================
  const ARENA_W = 960;
  const ARENA_H = 600;
  const BEST_KEY = 'arenaBlaster.best';

  const PLAYER_SPEED = 232;        // px/s
  const PLAYER_RADIUS = 15;
  const PLAYER_FIRE_RATE = 0.17;   // s between shots
  const PLAYER_TURN_RATE = 3.4;    // rad/s (arrow-key aiming)
  const BULLET_SPEED = 640;        // px/s
  const BULLET_LIFE = 1.35;        // s
  const BULLET_LEN = 12;           // px (yellow streak length)
  const INVULN_TIME = 1.0;         // s after a hit
  const START_LIVES = 3;

  const PICKUP_DURATION = 8;       // s
  const PICKUP_DROP_CHANCE = 0.15; // per kill
  const PICKUP_RADIUS = 12;
  const PICKUP_LIFE = 9;           // s before a ground pickup despawns

  const SCORE_WALKER = 10;
  const SCORE_SPRINTER = 20;
  const SCORE_TANK = 50;
  const SCORE_BOSS = 500;

  const COLORS = {
    bg: '#0c130d',
    grid: 'rgba(120, 180, 130, 0.06)',
    gridMajor: 'rgba(120, 180, 130, 0.10)',
    player: '#29e6ff',
    playerCore: '#aef6ff',
    playerBarrel: '#073038',
    walker: '#8a9488',
    walkerEdge: '#c2cdbb',
    sprinter: '#ff7a1a',
    sprinterEdge: '#ffd23d',
    tank: '#e0364c',
    tankEdge: '#ff8a99',
    boss: '#9b59ff',
    bossEdge: '#cfa6ff',
    bullet: '#ffe14d',
    ebullet: '#ff4d4d',
    rapid: '#ffe14d',
    spread: '#4dff88',
    shield: '#4dd2ff',
    slow: '#b06bff',
    hpFull: '#7bd88a',
    hpEmpty: 'rgba(255,255,255,0.18)'
  };

  // =====================================================================
  // Canvas + DOM refs
  // =====================================================================
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  canvas.width = ARENA_W;
  canvas.height = ARENA_H;

  const elScore = document.getElementById('scoreVal');
  const elWave = document.getElementById('waveVal');
  const elLives = document.getElementById('livesIcons');
  const elHud = document.getElementById('hud');
  const elPickupBox = document.getElementById('pickupBox');
  const elPickupLabel = document.getElementById('pickupLabel');
  const elPickupFill = document.getElementById('pickupFill');
  const elBossBar = document.getElementById('bossBar');
  const elBossFill = document.getElementById('bossBarFill');
  const elPauseBtn = document.getElementById('pauseBtn');

  const elStart = document.getElementById('startScreen');
  const elPause = document.getElementById('pauseScreen');
  const elOver = document.getElementById('overScreen');
  const elStartBest = document.getElementById('startBest');
  const elFinalScore = document.getElementById('finalScore');
  const elFinalWave = document.getElementById('finalWave');
  const elFinalBest = document.getElementById('finalBest');
  const elPlayBtn = document.getElementById('playBtn');
  const elRetryBtn = document.getElementById('retryBtn');
  const elHomeBtn = document.getElementById('homeBtn');
  const elResumeBtn = document.getElementById('resumeBtn');
  const elQuitBtn = document.getElementById('quitBtn');

  // =====================================================================
  // State
  // =====================================================================
  let mode = 'start';   // start | playing | paused | over | intermission
  let score = 0;
  let wave = 0;
  let lives = START_LIVES;
  let best = 0;
  try { best = Number(localStorage.getItem(BEST_KEY)) || 0; } catch (e) { best = 0; }

  const player = {
    x: ARENA_W / 2, y: ARENA_H / 2,
    angle: -Math.PI / 2,
    radius: PLAYER_RADIUS,
    fireCd: 0,
    invuln: 0,
    alive: true
  };

  let bullets = [];     // player bullets
  let eBullets = [];    // enemy bullets
  let enemies = [];
  let pickups = [];     // ground pickups
  let explosions = [];
  let particles = [];

  let waveQueue = [];   // pending enemy spawns: [{type, t}]  t = seconds until spawn
  let intermissionTimer = 0;
  let waveActive = false;
  let bossRef = null;
  let activePickup = null;   // {type, time, consumed?}
  let lastTime = 0;

  const keys = {};
  const mouse = { x: ARENA_W / 2, y: ARENA_H / 2, down: false, active: false };
  let touchMode = false;        // once a touch is used, auto-fire at nearest enemy
  let touchTarget = null;       // {x,y} for tap/drag-to-move
  let touchId = null;

  // =====================================================================
  // Helpers
  // =====================================================================
  const clamp = (v, a, b) => (v < a ? a : (v > b ? b : v));
  const rand = (a, b) => a + Math.random() * (b - a);
  const randi = (a, b) => Math.floor(rand(a, b + 1));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const dist2 = (ax, ay, bx, by) => { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; };
  const TAU = Math.PI * 2;

  function clientToCanvas(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    const sx = ARENA_W / r.width;
    const sy = ARENA_H / r.height;
    return { x: (clientX - r.left) * sx, y: (clientY - r.top) * sy };
  }

  // =====================================================================
  // Difficulty scaling
  // =====================================================================
  function enemySpeedMul() { return Math.min(2.0, 1 + (wave - 1) * 0.045); }
  function ebulletSpeed() { return 150 + wave * 4.5; }

  // =====================================================================
  // Waves
  // =====================================================================
  // Each enemy has a "cost" that consumes the wave budget.
  //   walker 1, sprinter 2, tank 4, boss handled separately (every 10th wave).
  function buildWave(n) {
    if (n % 10 === 0) {
      return [{ type: 'boss', t: 0.4 }];
    }
    const budget = 4 + n * 2;            // wave 1 = 6, wave 2 = 8, ...
    const list = [];
    const allowSprinter = n >= 2;
    const allowTank = n >= 4;
    let spent = 0;
    let guard = 0;
    while (spent < budget && guard++ < 200) {
      const remaining = budget - spent;
      const choices = ['walker'];
      if (allowSprinter && remaining >= 2) choices.push('sprinter', 'sprinter');
      if (allowTank && remaining >= 4) choices.push('tank');
      const type = pick(choices);
      const cost = type === 'walker' ? 1 : (type === 'sprinter' ? 2 : 4);
      spent += cost;
      list.push(type);
    }
    // shuffle then assign spawn times
    for (let i = list.length - 1; i > 0; i--) {
      const j = randi(0, i);
      const tmp = list[i]; list[i] = list[j]; list[j] = tmp;
    }
    const gap = Math.max(0.32, 0.85 - n * 0.03);
    return list.map((type, i) => ({ type, t: 0.5 + i * gap }));
  }

  function startWave(n) {
    wave = n;
    waveQueue = buildWave(n);
    waveActive = true;
    bossRef = null;
    if (n % 10 === 0) {
      elWave.textContent = 'WAVE ' + n + ' - BOSS';
    } else {
      elWave.textContent = 'WAVE ' + n;
    }
  }

  function waveCleared() {
    // boss wave cleared when bossRef dead; normal wave when queue empty AND enemies empty
    return waveQueue.length === 0 && enemies.length === 0;
  }

  // =====================================================================
  // Spawning
  // =====================================================================
  function edgeSpawnPoint() {
    // spawn just outside a random edge, heading inward
    const side = randi(0, 3);
    const m = 30;
    if (side === 0) return { x: rand(0, ARENA_W), y: -m, side };
    if (side === 1) return { x: ARENA_W + m, y: rand(0, ARENA_H), side };
    if (side === 2) return { x: rand(0, ARENA_W), y: ARENA_H + m, side };
    return { x: -m, y: rand(0, ARENA_H), side };
  }

  function spawnEnemy(type) {
    const p = edgeSpawnPoint();
    const spd = enemySpeedMul();
    let e;
    if (type === 'walker') {
      e = {
        type, x: p.x, y: p.y, radius: 14, hp: 1, maxHp: 1,
        speed: 52 * spd, heading: Math.atan2(ARENA_H / 2 - p.y, ARENA_W / 2 - p.x),
        turn: rand(-0.7, 0.7), color: COLORS.walker, edge: COLORS.walkerEdge,
        score: SCORE_WALKER, fireTimer: 0, contact: true
      };
    } else if (type === 'sprinter') {
      e = {
        type, x: p.x, y: p.y, radius: 13, hp: 1, maxHp: 1,
        speed: 168 * spd, heading: 0, color: COLORS.sprinter, edge: COLORS.sprinterEdge,
        score: SCORE_SPRINTER, fireTimer: 0, contact: true
      };
    } else if (type === 'tank') {
      e = {
        type, x: p.x, y: p.y, radius: 22, hp: 4, maxHp: 4,
        speed: 46 * spd, heading: 0, color: COLORS.tank, edge: COLORS.tankEdge,
        score: SCORE_TANK, fireTimer: rand(1.0, 1.8), fireInterval: 2.1, contact: false
      };
    } else { // boss
      const hp = 28 + wave * 5;
      e = {
        type, x: ARENA_W / 2, y: 90, radius: 46, hp: hp, maxHp: hp,
        speed: 40 * spd, heading: 0, color: COLORS.boss, edge: COLORS.bossEdge,
        score: SCORE_BOSS, fireTimer: 1.6, fireInterval: 1.5, contact: false, burstPhase: 0
      };
      bossRef = e;
    }
    enemies.push(e);
  }

  function spawnPickup(x, y) {
    const type = pick(['rapid', 'spread', 'shield', 'slow']);   // v0.0.2 — added 'slow'
    pickups.push({ x, y, type, radius: PICKUP_RADIUS, rot: 0, life: PICKUP_LIFE });
  }

  function spawnExplosion(x, y, color, scale) {
    scale = scale || 1;
    explosions.push({ x, y, r: 4, maxR: 30 * scale, life: 0.45, maxLife: 0.45, color });
    // particles
    const n = Math.round(8 * scale);
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU);
      const s = rand(60, 220) * scale;
      particles.push({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        life: rand(0.25, 0.55), maxLife: 0.55, color, size: rand(1.5, 3.5)
      });
    }
  }

  // =====================================================================
  // Player + firing
  // =====================================================================
  function resetPlayer() {
    player.x = ARENA_W / 2;
    player.y = ARENA_H / 2;
    player.angle = -Math.PI / 2;
    player.fireCd = 0;
    player.invuln = 0;
    player.alive = true;
  }

  function fireRateNow() {
    return activePickup && activePickup.type === 'rapid'
      ? PLAYER_FIRE_RATE / 2
      : PLAYER_FIRE_RATE;
  }

  function firePlayer() {
    const a = player.angle;
    const shots = (activePickup && activePickup.type === 'spread') ? [-0.26, 0, 0.26] : [0];
    const muzzle = player.radius + 6;
    const mx = player.x + Math.cos(a) * muzzle;
    const my = player.y + Math.sin(a) * muzzle;
    for (let i = 0; i < shots.length; i++) {
      const ang = a + shots[i];
      bullets.push({
        x: mx, y: my,
        vx: Math.cos(ang) * BULLET_SPEED,
        vy: Math.sin(ang) * BULLET_SPEED,
        life: BULLET_LIFE, radius: 3
      });
    }
    player.fireCd = fireRateNow();
  }

  function activatePickup(type) {
    activePickup = { type: type, time: PICKUP_DURATION, consumed: false };
    if (window.MUX) MUX.bump();
  }

  function damagePlayer() {
    if (player.invuln > 0) return;
    if (activePickup && activePickup.type === 'shield' && !activePickup.consumed) {
      // shield absorbs one hit
      activePickup.consumed = true;
      activePickup = null;
      spawnExplosion(player.x, player.y, COLORS.shield, 1.1);
      player.invuln = 0.5;
      return;
    }
    lives -= 1;
    player.invuln = INVULN_TIME;
    spawnExplosion(player.x, player.y, COLORS.player, 1.1);
    if (lives <= 0) {
      lives = 0;
      gameOver();
    }
  }

  // =====================================================================
  // Enemy update
  // =====================================================================
  function updateEnemy(e, dt) {
    // v0.0.2 — time-slow pickup: enemies move and fire at 40% speed
    const edt = (activePickup && activePickup.type === 'slow') ? dt * 0.4 : dt;
    const toPlayerX = player.x - e.x;
    const toPlayerY = player.y - e.y;
    const dPlayer = Math.hypot(toPlayerX, toPlayerY) || 1;

    if (e.type === 'walker') {
      // slow curving path: turn gradually, drift generally toward center/player
      e.heading += e.turn * edt;
      const desired = Math.atan2(toPlayerY, toPlayerX);
      // bias heading slowly toward player
      let diff = ((desired - e.heading + Math.PI) % TAU + TAU) % TAU - Math.PI;
      e.heading += clamp(diff, -0.6 * edt, 0.6 * edt);
      e.x += Math.cos(e.heading) * e.speed * edt;
      e.y += Math.sin(e.heading) * e.speed * edt;
    } else if (e.type === 'sprinter') {
      e.heading = Math.atan2(toPlayerY, toPlayerX);
      e.x += Math.cos(e.heading) * e.speed * edt;
      e.y += Math.sin(e.heading) * e.speed * edt;
    } else if (e.type === 'tank') {
      e.heading = Math.atan2(toPlayerY, toPlayerX);
      // stop approaching once within firing range
      if (dPlayer > 230) {
        e.x += Math.cos(e.heading) * e.speed * edt;
        e.y += Math.sin(e.heading) * e.speed * edt;
      }
      e.fireTimer -= edt;
      if (e.fireTimer <= 0 && dPlayer < 460) {
        e.fireTimer = e.fireInterval;
        fireEnemyBullet(e.x, e.y, Math.atan2(toPlayerY, toPlayerX), ebulletSpeed());
      }
    } else if (e.type === 'boss') {
      // drift horizontally within an upper band, bob vertically
      e.heading += edt * 0.8;
      const targetY = 110 + Math.sin(e.heading) * 30;
      e.y += (targetY - e.y) * 0.8 * edt;
      e.x += Math.cos(e.heading * 0.5) * e.speed * edt;
      // keep boss on screen horizontally
      if (e.x < e.radius + 10) e.x = e.radius + 10;
      if (e.x > ARENA_W - e.radius - 10) e.x = ARENA_W - e.radius - 10;
      e.fireTimer -= edt;
      if (e.fireTimer <= 0) {
        e.fireTimer = e.fireInterval;
        e.burstPhase = (e.burstPhase + 1) % 2;
        if (e.burstPhase === 0) {
          // 8-way radial burst
          for (let k = 0; k < 8; k++) {
            fireEnemyBullet(e.x, e.y, (k / 8) * TAU, ebulletSpeed() * 0.9);
          }
        } else {
          // 3 aimed shots at player
          const base = Math.atan2(toPlayerY, toPlayerX);
          for (const off of [-0.25, 0, 0.25]) {
            fireEnemyBullet(e.x, e.y, base + off, ebulletSpeed());
          }
        }
      }
    }

    // keep enemies (except boss) loosely within a margin so they re-enter
    if (e.type !== 'boss') {
      // allow them onto the arena; soft clamp far outside
      e.x = clamp(e.x, -60, ARENA_W + 60);
      e.y = clamp(e.y, -60, ARENA_H + 60);
    }
  }

  function fireEnemyBullet(x, y, angle, speed) {
    eBullets.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 4.0, radius: 5
    });
  }

  // =====================================================================
  // Collision + kills
  // =====================================================================
  function killEnemy(e, index) {
    score += e.score;
    spawnExplosion(e.x, e.y, e.color, e.type === 'boss' ? 2.4 : (e.type === 'tank' ? 1.5 : 1));
    if (e.type === 'boss') {
      bossRef = null;
    }
    // pickup drop
    if (Math.random() < PICKUP_DROP_CHANCE) {
      spawnPickup(e.x, e.y);
    }
    enemies.splice(index, 1);
  }

  function handleCollisions() {
    // player bullets vs enemies
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      let hit = false;
      for (let j = enemies.length - 1; j >= 0; j--) {
        const e = enemies[j];
        const rr = (e.radius + b.radius);
        if (dist2(b.x, b.y, e.x, e.y) <= rr * rr) {
          e.hp -= 1;
          if (e.hp <= 0) {
            killEnemy(e, j);
          } else {
            spawnExplosion(b.x, b.y, e.edge, 0.4);
          }
          hit = true;
          break;
        }
      }
      if (hit) bullets.splice(i, 1);
    }

    if (!player.alive) return;

    // enemy bullets vs player
    for (let i = eBullets.length - 1; i >= 0; i--) {
      const b = eBullets[i];
      const rr = player.radius + b.radius;
      if (dist2(b.x, b.y, player.x, player.y) <= rr * rr) {
        eBullets.splice(i, 1);
        damagePlayer();
        if (!player.alive) return;
      }
    }

    // enemies vs player
    for (let j = enemies.length - 1; j >= 0; j--) {
      const e = enemies[j];
      const rr = player.radius + e.radius;
      if (dist2(e.x, e.y, player.x, player.y) <= rr * rr) {
        if (e.contact) {
          // kamikaze: dies on contact
          killEnemy(e, j);
        }
        damagePlayer();
        if (!player.alive) return;
      }
    }

    // pickups vs player
    for (let i = pickups.length - 1; i >= 0; i--) {
      const p = pickups[i];
      const rr = player.radius + p.radius;
      if (dist2(p.x, p.y, player.x, player.y) <= rr * rr) {
        activatePickup(p.type);
        pickups.splice(i, 1);
      }
    }
  }

  // =====================================================================
  // Update (per mode)
  // =====================================================================
  function updatePlaying(dt) {
    // ----- input: movement -----
    let mvx = 0, mvy = 0;
    if (keys['w'] || keys['W']) mvy -= 1;
    if (keys['s'] || keys['S']) mvy += 1;
    if (keys['a'] || keys['A']) mvx -= 1;
    if (keys['d'] || keys['D']) mvx += 1;

    if (mvx !== 0 || mvy !== 0) {
      const len = Math.hypot(mvx, mvy) || 1;
      player.x += (mvx / len) * PLAYER_SPEED * dt;
      player.y += (mvy / len) * PLAYER_SPEED * dt;
    }

    // arrow-key thrust along facing (keyboard aim fallback)
    if (keys['ArrowUp']) {
      player.x += Math.cos(player.angle) * PLAYER_SPEED * dt;
      player.y += Math.sin(player.angle) * PLAYER_SPEED * dt;
    }
    if (keys['ArrowDown']) {
      player.x -= Math.cos(player.angle) * PLAYER_SPEED * 0.6 * dt;
      player.y -= Math.sin(player.angle) * PLAYER_SPEED * 0.6 * dt;
    }

    // touch move toward target
    if (touchTarget) {
      const dx = touchTarget.x - player.x;
      const dy = touchTarget.y - player.y;
      const d = Math.hypot(dx, dy);
      if (d > 4) {
        player.x += (dx / d) * PLAYER_SPEED * dt;
        player.y += (dy / d) * PLAYER_SPEED * dt;
      }
    }

    // clamp to arena
    player.x = clamp(player.x, player.radius, ARENA_W - player.radius);
    player.y = clamp(player.y, player.radius, ARENA_H - player.radius);

    // ----- input: aiming -----
    if (mouse.active) {
      player.angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);
    } else if (keys['ArrowLeft'] || keys['ArrowRight']) {
      if (keys['ArrowLeft']) player.angle -= PLAYER_TURN_RATE * dt;
      if (keys['ArrowRight']) player.angle += PLAYER_TURN_RATE * dt;
    } else {
      // auto-face nearest enemy (helps WASD-only / touch players)
      const near = nearestEnemy();
      if (near) {
        player.angle = Math.atan2(near.y - player.y, near.x - player.x);
      }
    }

    // ----- firing -----
    player.fireCd -= dt;
    // v0.0.3 — auto-fire whenever enemies are present (no need to hold mouse/tap).
    // Manual fire (hold mouse / Space / touch) still works as a bonus.
    const wantFire = mouse.down || !!keys[' '] || !!keys['Space'] || touchMode || (enemies.length > 0);
    if (wantFire && player.fireCd <= 0) {
      firePlayer();
    }

    // invuln + pickup timers
    if (player.invuln > 0) player.invuln -= dt;
    if (activePickup) {
      activePickup.time -= dt;
      if (activePickup.time <= 0) activePickup = null;
    }

    // ----- wave spawns -----
    if (waveActive) {
      for (let i = waveQueue.length - 1; i >= 0; i--) {
        waveQueue[i].t -= dt;
        if (waveQueue[i].t <= 0) {
          spawnEnemy(waveQueue[i].type);
          waveQueue.splice(i, 1);
        }
      }
    }

    // ----- update enemies -----
    for (let i = 0; i < enemies.length; i++) updateEnemy(enemies[i], dt);

    // ----- bullets -----
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (b.life <= 0 || b.x < -20 || b.x > ARENA_W + 20 || b.y < -20 || b.y > ARENA_H + 20) {
        bullets.splice(i, 1);
      }
    }
    for (let i = eBullets.length - 1; i >= 0; i--) {
      const b = eBullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (b.life <= 0 || b.x < -20 || b.x > ARENA_W + 20 || b.y < -20 || b.y > ARENA_H + 20) {
        eBullets.splice(i, 1);
      }
    }

    // ----- pickups -----
    for (let i = pickups.length - 1; i >= 0; i--) {
      const p = pickups[i];
      p.rot += dt * 2.2;
      p.life -= dt;
      if (p.life <= 0) pickups.splice(i, 1);
    }

    // ----- explosions + particles -----
    for (let i = explosions.length - 1; i >= 0; i--) {
      const x = explosions[i];
      x.life -= dt;
      x.r = x.maxR * (1 - x.life / x.maxLife);
      if (x.life <= 0) explosions.splice(i, 1);
    }
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.92;
      p.vy *= 0.92;
      if (p.life <= 0) particles.splice(i, 1);
    }

    // ----- collisions -----
    handleCollisions();

    // ----- wave progression -----
    if (waveActive && waveCleared()) {
      waveActive = false;
      intermissionTimer = 2.2;
      mode = 'intermission';
    }
  }

  function updateIntermission(dt) {
    intermissionTimer -= dt;
    // still let particles/explosions settle, and allow movement + firing
    for (let i = explosions.length - 1; i >= 0; i--) {
      const x = explosions[i];
      x.life -= dt;
      x.r = x.maxR * (1 - x.life / x.maxLife);
      if (x.life <= 0) explosions.splice(i, 1);
    }
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.92;
      p.vy *= 0.92;
      if (p.life <= 0) particles.splice(i, 1);
    }
    // gentle player aim during intermission
    if (mouse.active) {
      player.angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);
    }
    if (intermissionTimer <= 0) {
      startWave(wave + 1);
      mode = 'playing';
    }
  }

  function nearestEnemy() {
    let bestE = null, bestD = Infinity;
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      const d = dist2(e.x, e.y, player.x, player.y);
      if (d < bestD) { bestD = d; bestE = e; }
    }
    return bestE;
  }

  // =====================================================================
  // Render
  // =====================================================================
  function render() {
    // background
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, ARENA_W, ARENA_H);
    drawGrid();

    // ground pickups (under entities)
    for (let i = 0; i < pickups.length; i++) drawPickup(pickups[i]);

    // particles
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      ctx.globalAlpha = clamp(p.life / p.maxLife, 0, 1);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;

    // enemies
    for (let i = 0; i < enemies.length; i++) drawEnemy(enemies[i]);

    // enemy bullets
    for (let i = 0; i < eBullets.length; i++) {
      const b = eBullets[i];
      ctx.fillStyle = COLORS.ebullet;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, TAU);
      ctx.fill();
    }

    // player bullets (streaks)
    ctx.strokeStyle = COLORS.bullet;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i < bullets.length; i++) {
      const b = bullets[i];
      const len = BULLET_LEN;
      const nx = b.vx / BULLET_SPEED;
      const ny = b.vy / BULLET_SPEED;
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(b.x - nx * len, b.y - ny * len);
    }
    ctx.stroke();

    // player
    if (player.alive) drawPlayer();

    // explosions (on top)
    for (let i = 0; i < explosions.length; i++) {
      const x = explosions[i];
      ctx.globalAlpha = clamp(x.life / x.maxLife, 0, 1);
      ctx.strokeStyle = x.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x.x, x.y, x.r, 0, TAU);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Boss HP bar is rendered as the crisp HTML HUD bar (#bossBar) at the top,
    // updated in updateHUD(); no canvas duplicate to avoid overlap.
  }

  function drawGrid() {
    const step = 40;
    ctx.lineWidth = 1;
    ctx.strokeStyle = COLORS.grid;
    ctx.beginPath();
    for (let x = 0; x <= ARENA_W; x += step) { ctx.moveTo(x, 0); ctx.lineTo(x, ARENA_H); }
    for (let y = 0; y <= ARENA_H; y += step) { ctx.moveTo(0, y); ctx.lineTo(ARENA_W, y); }
    ctx.stroke();
    // major grid every 160
    ctx.strokeStyle = COLORS.gridMajor;
    ctx.beginPath();
    for (let x = 0; x <= ARENA_W; x += 160) { ctx.moveTo(x, 0); ctx.lineTo(x, ARENA_H); }
    for (let y = 0; y <= ARENA_H; y += 160) { ctx.moveTo(0, y); ctx.lineTo(ARENA_W, y); }
    ctx.stroke();
  }

  function drawPlayer() {
    const blinking = player.invuln > 0 && Math.floor(player.invuln * 12) % 2 === 0;
    if (blinking) ctx.globalAlpha = 0.35;

    // shield ring if active & not consumed
    if (activePickup && activePickup.type === 'shield' && !activePickup.consumed) {
      ctx.strokeStyle = COLORS.shield;
      ctx.globalAlpha *= 0.9;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(player.x, player.y, player.radius + 8, 0, TAU);
      ctx.stroke();
      ctx.globalAlpha = blinking ? 0.35 : 1;
    }

    const a = player.angle;
    const r = player.radius;
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(a);

    // barrel
    ctx.fillStyle = COLORS.playerBarrel;
    ctx.fillRect(0, -3, r + 8, 6);
    // muzzle dot
    ctx.fillStyle = COLORS.bullet;
    ctx.beginPath();
    ctx.arc(r + 8, 0, 2.5, 0, TAU);
    ctx.fill();

    // body triangle (pointing +x after rotation)
    ctx.fillStyle = COLORS.player;
    ctx.strokeStyle = '#073038';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.lineTo(-r * 0.7, r * 0.8);
    ctx.lineTo(-r * 0.4, 0);
    ctx.lineTo(-r * 0.7, -r * 0.8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // core highlight
    ctx.fillStyle = COLORS.playerCore;
    ctx.beginPath();
    ctx.arc(0, 0, 3.5, 0, TAU);
    ctx.fill();

    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function drawEnemy(e) {
    if (e.type === 'walker') {
      ctx.fillStyle = e.color;
      ctx.strokeStyle = e.edge;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.radius, 0, TAU);
      ctx.fill();
      ctx.stroke();
      // small inner dot
      ctx.fillStyle = e.edge;
      ctx.beginPath();
      ctx.arc(e.x, e.y, 3, 0, TAU);
      ctx.fill();
    } else if (e.type === 'sprinter') {
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.rotate(e.heading);
      ctx.fillStyle = e.color;
      ctx.strokeStyle = e.edge;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(e.radius, 0);
      ctx.lineTo(-e.radius * 0.7, e.radius * 0.8);
      ctx.lineTo(-e.radius * 0.7, -e.radius * 0.8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    } else if (e.type === 'tank') {
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = e.color;
      ctx.strokeStyle = e.edge;
      ctx.lineWidth = 2;
      ctx.fillRect(-e.radius, -e.radius, e.radius * 2, e.radius * 2);
      ctx.strokeRect(-e.radius, -e.radius, e.radius * 2, e.radius * 2);
      ctx.restore();
      // turret dot
      ctx.fillStyle = e.edge;
      ctx.beginPath();
      ctx.arc(e.x, e.y, 5, 0, TAU);
      ctx.fill();
      drawHPBar(e);
    } else if (e.type === 'boss') {
      drawHex(e.x, e.y, e.radius, e.color, e.edge);
      // inner ring + core
      ctx.strokeStyle = e.edge;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.radius * 0.55, 0, TAU);
      ctx.stroke();
      ctx.fillStyle = e.edge;
      ctx.beginPath();
      ctx.arc(e.x, e.y, 6, 0, TAU);
      ctx.fill();
    }
  }

  function drawHex(cx, cy, r, fill, edge) {
    ctx.fillStyle = fill;
    ctx.strokeStyle = edge;
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * TAU - Math.PI / 2;
      const px = cx + Math.cos(ang) * r;
      const py = cy + Math.sin(ang) * r;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  function drawHPBar(e) {
    if (e.maxHp <= 1) return;
    const w = e.radius * 2;
    const h = 4;
    const bx = e.x - w / 2;
    const by = e.y - e.radius - 9;
    ctx.fillStyle = COLORS.hpEmpty;
    ctx.fillRect(bx, by, w, h);
    ctx.fillStyle = COLORS.hpFull;
    ctx.fillRect(bx, by, w * clamp(e.hp / e.maxHp, 0, 1), h);
  }

  function drawPickup(p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    // pulse alpha as it nears expiry
    const a = p.life < 2 ? (0.4 + 0.6 * Math.abs(Math.sin(p.life * 6))) : 1;
    ctx.globalAlpha = a;
    // base disc
    ctx.fillStyle = 'rgba(10,20,14,0.55)';
    ctx.strokeStyle = p.type === 'rapid' ? COLORS.rapid
      : p.type === 'spread' ? COLORS.spread : p.type === 'slow' ? COLORS.slow : COLORS.shield;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, p.radius, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.rotate(p.rot);
    ctx.lineWidth = 2;
    ctx.strokeStyle = p.type === 'rapid' ? COLORS.rapid
      : p.type === 'spread' ? COLORS.spread : p.type === 'slow' ? COLORS.slow : COLORS.shield;
    ctx.fillStyle = ctx.strokeStyle;
    if (p.type === 'rapid') {
      // lightning bolt
      ctx.beginPath();
      ctx.moveTo(2, -7);
      ctx.lineTo(-3, 1);
      ctx.lineTo(0, 1);
      ctx.lineTo(-2, 7);
      ctx.lineTo(3, -1);
      ctx.lineTo(0, -1);
      ctx.closePath();
      ctx.fill();
    } else if (p.type === 'spread') {
      // 3 diverging lines
      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.lineTo(7, -7);
      ctx.moveTo(0, 0); ctx.lineTo(8, 0);
      ctx.moveTo(0, 0); ctx.lineTo(7, 7);
      ctx.stroke();
    } else if (p.type === 'slow') {
      // clock (time-slow) — v0.0.2
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, TAU);
      ctx.moveTo(0, 0); ctx.lineTo(0, -3);
      ctx.moveTo(0, 0); ctx.lineTo(4, 1);
      ctx.stroke();
    } else {
      // ring
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  // =====================================================================
  // HUD update
  // =====================================================================
  function updateHUD() {
    elScore.textContent = String(score);
    elWave.textContent = (wave % 10 === 0 && bossRef)
      ? 'WAVE ' + wave + ' - BOSS'
      : 'WAVE ' + wave;
    elLives.textContent = '\u25B2'.repeat(Math.max(0, lives));

    // pickup indicator
    if (activePickup) {
      const label = activePickup.type === 'rapid' ? 'RAPID FIRE'
        : activePickup.type === 'spread' ? 'SPREAD SHOT'
        : activePickup.type === 'slow' ? 'TIME SLOW'
        : (activePickup.consumed ? '' : 'SHIELD');
      elPickupLabel.textContent = label;
      const frac = clamp(activePickup.time / PICKUP_DURATION, 0, 1);
      elPickupFill.style.width = (frac * 100) + '%';
      elPickupFill.style.background = activePickup.type === 'rapid'
        ? 'linear-gradient(90deg,#ffe14d,#ff9e1a)'
        : activePickup.type === 'spread'
          ? 'linear-gradient(90deg,#4dff88,#18a8c4)'
          : activePickup.type === 'slow'
            ? 'linear-gradient(90deg,#b06bff,#6a3aff)'
            : 'linear-gradient(90deg,#4dd2ff,#29e6ff)';
      elPickupLabel.style.color = activePickup.type === 'rapid' ? '#ffe14d'
        : activePickup.type === 'spread' ? '#4dff88'
        : activePickup.type === 'slow' ? '#b06bff' : '#4dd2ff';
      elPickupBox.classList.add('show');
    } else {
      elPickupBox.classList.remove('show');
    }

    // boss bar (top HTML bar mirrors the canvas one for crispness)
    if (bossRef) {
      elBossFill.style.width = (clamp(bossRef.hp / bossRef.maxHp, 0, 1) * 100) + '%';
      elBossBar.classList.add('show');
    } else {
      elBossBar.classList.remove('show');
    }
  }

  // =====================================================================
  // Screens / flow
  // =====================================================================
  function hideAllScreens() {
    elStart.classList.remove('active');
    elPause.classList.remove('active');
    elOver.classList.remove('active');
  }

  function showStart() {
    mode = 'start';
    hideAllScreens();
    elStart.classList.add('active');
    elStartBest.textContent = String(best);
    elHud.setAttribute('aria-hidden', 'true');
    elHud.style.display = 'none';
  }

  function startGame() {
    score = 0;
    lives = START_LIVES;
    wave = 0;
    bullets = []; eBullets = []; enemies = []; pickups = []; explosions = []; particles = [];
    waveQueue = [];
    waveActive = false;
    bossRef = null;
    activePickup = null;
    intermissionTimer = 0;
    resetPlayer();
    hideAllScreens();
    elHud.setAttribute('aria-hidden', 'false');
    elHud.style.display = 'flex';
    // brief intermission then wave 1
    intermissionTimer = 1.0;
    mode = 'intermission';
    updateHUD();
  }

  function pauseGame() {
    if (mode !== 'playing' && mode !== 'intermission') return;
    mode = 'paused';
    elPause.classList.add('active');
  }
  function resumeGame() {
    if (mode !== 'paused') return;
    elPause.classList.remove('active');
    mode = waveActive ? 'playing' : 'intermission';
    lastTime = performance.now();
  }

  function gameOver() {
    player.alive = false;
    mode = 'over';
    if (window.MUX) MUX.over();
    if (score > best) {
      best = score;
      try { localStorage.setItem(BEST_KEY, String(best)); } catch (e) {}
    }
    elFinalScore.textContent = String(score);
    elFinalWave.textContent = String(wave);
    elFinalBest.textContent = String(best);
    hideAllScreens();
    elOver.classList.add('active');
  }

  function quitToMenu() {
    mode = 'start';
    hideAllScreens();
    elStart.classList.add('active');
    elStartBest.textContent = String(best);
    elHud.setAttribute('aria-hidden', 'true');
    elHud.style.display = 'none';
    elBossBar.classList.remove('show');
    elPickupBox.classList.remove('show');
  }

  // =====================================================================
  // Main loop
  // =====================================================================
  function loop(t) {
    if (!lastTime) lastTime = t;
    let dt = (t - lastTime) / 1000;
    lastTime = t;
    if (dt > 0.05) dt = 0.05; // clamp big gaps (tab switches)

    if (mode === 'playing') {
      updatePlaying(dt);
    } else if (mode === 'intermission') {
      updateIntermission(dt);
    }
    // paused / start / over: skip simulation, still render last frame

    if (mode === 'playing' || mode === 'intermission' || mode === 'paused') {
      render();
      updateHUD();
    } else if (mode === 'start') {
      // ambient background render
      ctx.fillStyle = COLORS.bg;
      ctx.fillRect(0, 0, ARENA_W, ARENA_H);
      drawGrid();
    } else if (mode === 'over') {
      render();
    }

    requestAnimationFrame(loop);
  }

  // =====================================================================
  // Input wiring
  // =====================================================================
  // Keyboard
  window.addEventListener('keydown', (e) => {
    const k = e.key;
    if (k === ' ' || k === 'Spacebar') {
      keys[' '] = true;
      e.preventDefault();
    } else if (k === 'p' || k === 'P' || k === 'Escape') {
      if (mode === 'playing' || mode === 'intermission') pauseGame();
      else if (mode === 'paused') resumeGame();
      e.preventDefault();
    } else {
      keys[k] = true;
      // prevent arrow-key page scroll
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].indexOf(k) !== -1) {
        e.preventDefault();
      }
    }
  });
  window.addEventListener('keyup', (e) => {
    const k = e.key;
    if (k === ' ' || k === 'Spacebar') { keys[' '] = false; }
    else { keys[k] = false; }
  });
  // clear keys when window loses focus (avoids stuck movement)
  window.addEventListener('blur', () => {
    for (const k in keys) keys[k] = false;
    mouse.down = false;
    if (mode === 'playing' || mode === 'intermission') pauseGame();
  });

  // Mouse
  canvas.addEventListener('mousemove', (e) => {
    const p = clientToCanvas(e.clientX, e.clientY);
    mouse.x = p.x; mouse.y = p.y; mouse.active = true;
  });
  canvas.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    mouse.down = true;
    if (mode === 'start') { startGame(); }
  });
  window.addEventListener('mouseup', (e) => {
    if (e.button !== 0) return;
    mouse.down = false;
  });
  canvas.addEventListener('mouseleave', () => { mouse.down = false; });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  // Touch: drag-to-move + auto-fire at nearest enemy
  function onTouchStart(e) {
    e.preventDefault();
    if (mode === 'start') { startGame(); return; }
    if (mode === 'paused') { resumeGame(); return; }
    if (mode === 'over') return;
    touchMode = true;
    if (touchId === null && e.changedTouches.length) {
      const t = e.changedTouches[0];
      touchId = t.identifier;
      const p = clientToCanvas(t.clientX, t.clientY);
      touchTarget = p;
    }
  }
  function onTouchMove(e) {
    e.preventDefault();
    if (touchId === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier === touchId) {
        const p = clientToCanvas(t.clientX, t.clientY);
        touchTarget = p;
        break;
      }
    }
  }
  function onTouchEnd(e) {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === touchId) {
        touchId = null;
        touchTarget = null;
        break;
      }
    }
  }
  canvas.addEventListener('touchstart', onTouchStart, { passive: false });
  canvas.addEventListener('touchmove', onTouchMove, { passive: false });
  canvas.addEventListener('touchend', onTouchEnd, { passive: false });
  canvas.addEventListener('touchcancel', onTouchEnd, { passive: false });

  // Buttons
  elPlayBtn.addEventListener('click', () => { startGame(); });
  elRetryBtn.addEventListener('click', () => { startGame(); });
  elHomeBtn.addEventListener('click', () => { quitToMenu(); });
  elResumeBtn.addEventListener('click', () => { resumeGame(); });
  elQuitBtn.addEventListener('click', () => { quitToMenu(); });
  elPauseBtn.addEventListener('click', () => {
    if (mode === 'playing' || mode === 'intermission') pauseGame();
    else if (mode === 'paused') resumeGame();
  });

  // Visibility: auto-pause when tab hidden
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && (mode === 'playing' || mode === 'intermission')) {
      pauseGame();
    }
  });

  // Resize: nothing to do (canvas logical size fixed; CSS scales it)
  window.addEventListener('resize', () => { /* CSS handles scaling */ });

  // =====================================================================
  // Boot
  // =====================================================================
  showStart();
  requestAnimationFrame(loop);
})();
// ---- v0.0.5 gamekit wiring (splash + menu + stats + leaderboard + auto-update) ----
if (window.GK) {
  GK.boot({ title: "Arena Blaster", tagline: "Tactical wave survival", theme: "#0c130d" });
  GK.help({ title: "Arena Blaster", objective: "Survive tactical waves. A boss arrives every 10th wave. Grab pickups.", controls: ["Mouse: aim + hold to fire","WASD: move","Arrows: turn ship","Space: fire","Touch: drag to move, auto-fire","P: pause","F: fullscreen"], tips: "Pickups: rapid / spread / slow." });
  GK.exposeState(function () { try { return { score: (window.S && window.S.score) || window.score || 0, mode: (window.S && window.S.mode) || 'play', wave: (window.S && window.S.wave) || 0 }; } catch (e) { return {}; } });
  GK._manualRecord = false;
  setTimeout(function () { GK.ready(); }, 600);
}
