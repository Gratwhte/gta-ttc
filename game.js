// ===== CHARACTER SELECTION UI =====
let selectedCharIndex = -1;
const charGrid = document.getElementById('charGrid');
const startBtn = document.getElementById('startBtn');

CHARACTERS.forEach((char, i) => {
  const card = document.createElement('div');
  card.className = 'charCard';
  card.dataset.index = i;

  const isPlaceholder = char.src.startsWith('Placeholder');
  const imgContent = isPlaceholder
    ? `<div class="placeholder" style="width:140px;height:140px;background:${char.color}33;border:2px dashed ${char.color};">${char.src}</div>`
    : `<img src="${char.src}" alt="${char.name}">`;

  card.innerHTML = `
    ${imgContent}
    <h3>${char.name}</h3>
    <p>${char.description}</p>
  `;

  card.addEventListener('click', () => {
    document.querySelectorAll('.charCard').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    selectedCharIndex = i;
    startBtn.classList.add('active');
  });

  charGrid.appendChild(card);
});

// Preload images
const loadedImages = {};
CHARACTERS.forEach((char, i) => {
  if (!char.src.startsWith('Placeholder')) {
    const img = new Image();
    img.src = char.src;
    loadedImages[i] = img;
  }
});

startBtn.addEventListener('click', () => {
  if (selectedCharIndex < 0) return;
  document.getElementById('characterSelect').style.display = 'none';
  startGame(selectedCharIndex);
});

// ===== CHEAT CODE SYSTEM =====
// Activation: Ctrl + Shift + C (not a default browser shortcut in most browsers)
// Cheats:
//   "wanker" -> +$100
//   "twat"   -> +$1000
const cheatBox = document.getElementById('cheatBox');
const cheatInput = document.getElementById('cheatInput');
const cheatMsg = document.getElementById('cheatMsg');

const CHEATS = {
  'wanker': { money: 100,  msg: '💰 +$100 you scoundrel!' },
  'twat':   { money: 1000, msg: '💎 +$1000 big spender!' }
};

function openCheatBox() {
  cheatBox.style.display = 'block';
  cheatInput.value = '';
  cheatMsg.textContent = '';
  cheatInput.focus();
}

function closeCheatBox() {
  cheatBox.style.display = 'none';
  cheatInput.blur();
}

function applyCheat(code) {
  const cheat = CHEATS[code.toLowerCase().trim()];
  if (cheat) {
    player.money += cheat.money;
    cheatMsg.style.color = '#0f0';
    cheatMsg.textContent = cheat.msg;
    setTimeout(closeCheatBox, 1200);
  } else {
    cheatMsg.style.color = '#f55';
    cheatMsg.textContent = '❌ Invalid cheat';
  }
}

// Ctrl+Shift+C toggles the cheat box
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'c') {
    e.preventDefault();
    if (cheatBox.style.display === 'block') {
      closeCheatBox();
    } else {
      openCheatBox();
    }
  }
  // ESC to close
  if (e.key === 'Escape' && cheatBox.style.display === 'block') {
    closeCheatBox();
  }
});

cheatInput.addEventListener('keydown', (e) => {
  // Prevent game keys from firing while typing in the cheat box
  e.stopPropagation();
  if (e.key === 'Enter') {
    applyCheat(cheatInput.value);
  }
});

// ===== GAME =====
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let W, H;
function resize() { W = canvas.width = innerWidth; H = canvas.height = innerHeight; }
resize();
window.addEventListener('resize', resize);

const WORLD = 4000;
const keys = {};
const mouse = { x: 0, y: 0, worldX: 0, worldY: 0, down: false };

// Only listen for game keys when cheat box is closed
addEventListener('keydown', e => {
  if (cheatBox.style.display === 'block') return;
  keys[e.key.toLowerCase()] = true;
});
addEventListener('keyup', e => {
  if (cheatBox.style.display === 'block') return;
  keys[e.key.toLowerCase()] = false;
  if (e.key.toLowerCase() === 'e' && gameStarted) tryEnterExit();
});
canvas.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
canvas.addEventListener('mousedown', () => { if (cheatBox.style.display !== 'block') mouse.down = true; });
canvas.addEventListener('mouseup', () => mouse.down = false);
canvas.addEventListener('contextmenu', e => e.preventDefault());

const cam = { x: 0, y: 0 };
const roads = [];
for (let i = 0; i <= WORLD; i += 400) {
  roads.push({ x: 0, y: i - 30, w: WORLD, h: 60, horizontal: true });
  roads.push({ x: i - 30, y: 0, w: 60, h: WORLD, horizontal: false });
}

const buildings = [];
function generateBuildings() {
  for (let bx = 0; bx < WORLD; bx += 400) {
    for (let by = 0; by < WORLD; by += 400) {
      const blockX = bx + 40, blockY = by + 40;
      const blockSize = 320;
      const cols = 2 + Math.floor(Math.random() * 2);
      const rows = 2 + Math.floor(Math.random() * 2);
      const bw = blockSize / cols;
      const bh = blockSize / rows;
      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          if (Math.random() < 0.85) {
            const pad = 10;
            buildings.push({
              x: blockX + c * bw + pad,
              y: blockY + r * bh + pad,
              w: bw - pad * 2,
              h: bh - pad * 2,
              color: `hsl(${Math.random()*60 + 20}, 20%, ${25 + Math.random()*25}%)`
            });
          }
        }
      }
    }
  }
}
generateBuildings();

function hitsBuilding(x, y, r) {
  for (const b of buildings) {
    if (x + r > b.x && x - r < b.x + b.w && y + r > b.y && y - r < b.y + b.h) {
      return b;
    }
  }
  return null;
}

function findSafeSpot(x, y, r) {
  if (!hitsBuilding(x, y, r)) return { x, y };
  for (let radius = 20; radius < 300; radius += 15) {
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
      const tx = x + Math.cos(angle) * radius;
      const ty = y + Math.sin(angle) * radius;
      if (tx > 20 && tx < WORLD - 20 && ty > 20 && ty < WORLD - 20 && !hitsBuilding(tx, ty, r)) {
        return { x: tx, y: ty };
      }
    }
  }
  return { x: 200, y: 200 };
}

const player = {
  x: 400, y: 400, r: 12, angle: 0,
  health: 100, money: 0, ammo: 50, inVehicle: null,
  color: '#4af', shootCooldown: 0, charIndex: 0
};

const vehicles = [];
const pedestrians = [];
const police = [];
const bullets = [];
const particles = [];
const pickups = [];

function spawnVehicle(x, y, type = 'car') {
  const colors = ['#e44', '#4e4', '#ee4', '#4ee', '#e4e', '#fff', '#222', '#f80'];
  vehicles.push({
    x, y, angle: Math.random() * Math.PI * 2,
    w: 40, h: 22, speed: 0, maxSpeed: 8,
    health: 100, color: colors[Math.floor(Math.random()*colors.length)],
    driver: null, isPolice: type === 'police'
  });
}

let npcCharIndexes = [];

function spawnPed(x, y) {
  const npcChar = npcCharIndexes[Math.floor(Math.random() * npcCharIndexes.length)];
  pedestrians.push({
    x, y, r: 10, angle: Math.random() * Math.PI * 2,
    health: 30, speed: 1 + Math.random(),
    color: CHARACTERS[npcChar].color,
    charIndex: npcChar,
    target: null, fleeing: false, money: 10 + Math.floor(Math.random() * 40),
    dead: false, walkTimer: Math.random() * 200
  });
}

let wanted = 0;

function spawnPolice() {
  let x, y, tries = 0;
  do {
    const ang = Math.random() * Math.PI * 2;
    const dist = 800;
    x = player.x + Math.cos(ang) * dist;
    y = player.y + Math.sin(ang) * dist;
    tries++;
  } while (hitsBuilding(x, y, 15) && tries < 20);
  police.push({
    x, y, r: 11, angle: 0, health: 50, speed: 2.2,
    color: '#00f', shootCooldown: 0, dead: false
  });
}

function dist(a, b) {
  const dx = a.x - b.x, dy = a.y - b.y;
  return Math.sqrt(dx*dx + dy*dy);
}

function tryEnterExit() {
  if (player.inVehicle) {
    const v = player.inVehicle;
    const tryPositions = [
      { x: v.x + Math.cos(v.angle + Math.PI/2) * 30, y: v.y + Math.sin(v.angle + Math.PI/2) * 30 },
      { x: v.x + Math.cos(v.angle - Math.PI/2) * 30, y: v.y + Math.sin(v.angle - Math.PI/2) * 30 },
      { x: v.x + Math.cos(v.angle) * 30, y: v.y + Math.sin(v.angle) * 30 },
      { x: v.x + Math.cos(v.angle + Math.PI) * 30, y: v.y + Math.sin(v.angle + Math.PI) * 30 },
    ];
    let safe = null;
    for (const pos of tryPositions) {
      if (!hitsBuilding(pos.x, pos.y, player.r)) { safe = pos; break; }
    }
    if (!safe) safe = findSafeSpot(v.x, v.y, player.r);
    player.x = safe.x;
    player.y = safe.y;
    v.driver = null;
    player.inVehicle = null;
  } else {
    let nearest = null, nd = 60;
    for (const v of vehicles) {
      const d = dist(player, v);
      if (d < nd && !v.driver) { nd = d; nearest = v; }
    }
    if (nearest) {
      player.inVehicle = nearest;
      nearest.driver = player;
      if (nearest.isPolice && wanted < 1) addWanted(1);
    }
  }
}

function addWanted(amount) {
  wanted = Math.min(5, wanted + amount);
}

function shoot(fromX, fromY, angle, owner, damage = 20, speed = 15) {
  bullets.push({
    x: fromX, y: fromY,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    life: 60, owner, damage
  });
}

function addParticles(x, y, color, count = 10) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 6,
      vy: (Math.random() - 0.5) * 6,
      life: 30 + Math.random() * 20,
      color, size: 2 + Math.random() * 3
    });
  }
}

let gameStarted = false;
let lastWantedSpawn = 0;

function startGame(charIndex) {
  player.charIndex = charIndex;
  player.color = CHARACTERS[charIndex].color;

  npcCharIndexes = [];
  for (let i = 0; i < CHARACTERS.length; i++) {
    if (i !== charIndex) npcCharIndexes.push(i);
  }

  for (let i = 0; i < 40; i++) {
    let x, y, tries = 0;
    do {
      x = Math.random() * WORLD;
      y = Math.random() * WORLD;
      tries++;
    } while (hitsBuilding(x, y, 25) && tries < 20);
    spawnVehicle(x, y);
  }

  for (let i = 0; i < 60; i++) {
    let x, y, tries = 0;
    do {
      x = Math.random() * WORLD;
      y = Math.random() * WORLD;
      tries++;
    } while (hitsBuilding(x, y, 15) && tries < 20);
    spawnPed(x, y);
  }

  const safe = findSafeSpot(400, 400, player.r);
  player.x = safe.x;
  player.y = safe.y;

  gameStarted = true;
  loop();
}

function update() {
  mouse.worldX = mouse.x + cam.x;
  mouse.worldY = mouse.y + cam.y;

  if (player.inVehicle) {
    const v = player.inVehicle;
    let accel = 0;
    if (keys['w'] || keys['arrowup']) accel = 0.3;
    if (keys['s'] || keys['arrowdown']) accel = -0.2;
    v.speed += accel;
    v.speed *= 0.96;
    v.speed = Math.max(-4, Math.min(v.maxSpeed, v.speed));

    const turnRate = Math.min(Math.abs(v.speed) / 5, 1) * 0.05;
    if (keys['a'] || keys['arrowleft']) v.angle -= turnRate * Math.sign(v.speed || 1);
    if (keys['d'] || keys['arrowright']) v.angle += turnRate * Math.sign(v.speed || 1);

    const nx = v.x + Math.cos(v.angle) * v.speed;
    const ny = v.y + Math.sin(v.angle) * v.speed;

    if (!hitsBuilding(nx, ny, 20)) {
      v.x = nx; v.y = ny;
    } else {
      if (Math.abs(v.speed) > 3) {
        v.health -= Math.abs(v.speed) * 2;
        addParticles(v.x, v.y, '#fa0', 5);
      }
      v.speed *= -0.3;
    }

    for (const p of pedestrians) {
      if (!p.dead && dist(v, p) < 20 && Math.abs(v.speed) > 2) {
        p.health -= Math.abs(v.speed) * 5;
        addParticles(p.x, p.y, '#a00', 15);
        if (p.health <= 0 && !p.dead) {
          p.dead = true;
          pickups.push({ x: p.x, y: p.y, amount: p.money, type: 'money' });
          addWanted(1);
        }
      }
    }

    for (const c of police) {
      if (!c.dead && dist(v, c) < 20 && Math.abs(v.speed) > 2) {
        c.health -= Math.abs(v.speed) * 5;
        addParticles(c.x, c.y, '#a00', 15);
        if (c.health <= 0) c.dead = true;
      }
    }

    player.x = v.x;
    player.y = v.y;
    player.angle = v.angle;

    if (v.health <= 0) {
      addParticles(v.x, v.y, '#f80', 40);
      player.health -= 30;
      const safe = findSafeSpot(v.x, v.y, player.r);
      player.x = safe.x;
      player.y = safe.y;
      player.inVehicle = null;
      vehicles.splice(vehicles.indexOf(v), 1);
    }
  } else {
    if (hitsBuilding(player.x, player.y, player.r)) {
      const safe = findSafeSpot(player.x, player.y, player.r);
      player.x = safe.x;
      player.y = safe.y;
    }

    const speed = keys['shift'] ? 4 : 2.5;
    let dx = 0, dy = 0;
    if (keys['w'] || keys['arrowup']) dy -= 1;
    if (keys['s'] || keys['arrowdown']) dy += 1;
    if (keys['a'] || keys['arrowleft']) dx -= 1;
    if (keys['d'] || keys['arrowright']) dx += 1;
    const len = Math.sqrt(dx*dx + dy*dy);
    if (len > 0) { dx /= len; dy /= len; }

    const nx = player.x + dx * speed;
    const ny = player.y + dy * speed;
    if (!hitsBuilding(nx, player.y, player.r)) player.x = nx;
    if (!hitsBuilding(player.x, ny, player.r)) player.y = ny;

    player.angle = Math.atan2(mouse.worldY - player.y, mouse.worldX - player.x);

    if (mouse.down && player.shootCooldown <= 0 && player.ammo > 0) {
      shoot(player.x + Math.cos(player.angle) * 15, player.y + Math.sin(player.angle) * 15, player.angle, 'player');
      player.shootCooldown = 8;
      player.ammo--;
      addParticles(player.x + Math.cos(player.angle) * 20, player.y + Math.sin(player.angle) * 20, '#ff0', 3);
    }
    player.shootCooldown--;
  }

  player.x = Math.max(20, Math.min(WORLD - 20, player.x));
  player.y = Math.max(20, Math.min(WORLD - 20, player.y));

  cam.x = player.x - W/2;
  cam.y = player.y - H/2;

  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.x += b.vx; b.y += b.vy;
    b.life--;

    if (b.life <= 0 || hitsBuilding(b.x, b.y, 2)) {
      bullets.splice(i, 1);
      continue;
    }

    if (b.owner !== 'player' && !player.inVehicle && dist(b, player) < player.r) {
      player.health -= b.damage;
      addParticles(b.x, b.y, '#f00', 8);
      bullets.splice(i, 1);
      continue;
    }

    if (b.owner !== 'player' && player.inVehicle && dist(b, player.inVehicle) < 25) {
      player.inVehicle.health -= b.damage;
      addParticles(b.x, b.y, '#fa0', 5);
      bullets.splice(i, 1);
      continue;
    }

    if (b.owner === 'player') {
      let hit = false;
      for (const p of pedestrians) {
        if (!p.dead && dist(b, p) < p.r) {
          p.health -= b.damage;
          p.fleeing = true;
          addParticles(b.x, b.y, '#a00', 8);
          if (p.health <= 0) {
            p.dead = true;
            pickups.push({ x: p.x, y: p.y, amount: p.money, type: 'money' });
            addWanted(1);
          }
          hit = true;
          break;
        }
      }
      if (hit) { bullets.splice(i, 1); continue; }

      for (const c of police) {
        if (!c.dead && dist(b, c) < c.r) {
          c.health -= b.damage;
          addParticles(b.x, b.y, '#a00', 8);
          if (c.health <= 0) {
            c.dead = true;
            addWanted(1);
          }
          hit = true;
          break;
        }
      }
      if (hit) { bullets.splice(i, 1); continue; }

      for (const v of vehicles) {
        if (v !== player.inVehicle && dist(b, v) < 22) {
          v.health -= b.damage;
          addParticles(b.x, b.y, '#fa0', 5);
          if (v.health <= 0) {
            addParticles(v.x, v.y, '#f80', 30);
            vehicles.splice(vehicles.indexOf(v), 1);
          }
          hit = true;
          break;
        }
      }
      if (hit) { bullets.splice(i, 1); continue; }
    }
  }

  for (const p of pedestrians) {
    if (p.dead) continue;
    const d = dist(p, player);

    if (p.fleeing || d < 100) {
      const fleeAngle = Math.atan2(p.y - player.y, p.x - player.x);
      p.angle = fleeAngle;
      const nx = p.x + Math.cos(fleeAngle) * p.speed * 1.5;
      const ny = p.y + Math.sin(fleeAngle) * p.speed * 1.5;
      if (!hitsBuilding(nx, p.y, p.r)) p.x = nx;
      if (!hitsBuilding(p.x, ny, p.r)) p.y = ny;
    } else {
      p.walkTimer--;
      if (p.walkTimer <= 0) {
        p.angle = Math.random() * Math.PI * 2;
        p.walkTimer = 100 + Math.random() * 200;
      }
      const nx = p.x + Math.cos(p.angle) * p.speed * 0.5;
      const ny = p.y + Math.sin(p.angle) * p.speed * 0.5;
      if (!hitsBuilding(nx, p.y, p.r)) p.x = nx; else p.walkTimer = 0;
      if (!hitsBuilding(p.x, ny, p.r)) p.y = ny; else p.walkTimer = 0;
    }
  }

  if (wanted > 0) {
    lastWantedSpawn++;
    const spawnRate = Math.max(30, 200 - wanted * 30);
    if (lastWantedSpawn > spawnRate && police.filter(c => !c.dead).length < wanted * 2) {
      spawnPolice();
      lastWantedSpawn = 0;
    }
  }

  for (const c of police) {
    if (c.dead) continue;
    const d = dist(c, player);
    const targetAngle = Math.atan2(player.y - c.y, player.x - c.x);
    c.angle = targetAngle;

    if (d > 200) {
      const nx = c.x + Math.cos(targetAngle) * c.speed;
      const ny = c.y + Math.sin(targetAngle) * c.speed;
      if (!hitsBuilding(nx, c.y, c.r)) c.x = nx;
      if (!hitsBuilding(c.x, ny, c.r)) c.y = ny;
    } else if (d < 150) {
      const nx = c.x - Math.cos(targetAngle) * c.speed * 0.5;
      const ny = c.y - Math.sin(targetAngle) * c.speed * 0.5;
      if (!hitsBuilding(nx, c.y, c.r)) c.x = nx;
      if (!hitsBuilding(c.x, ny, c.r)) c.y = ny;
    }

    c.shootCooldown--;
    if (c.shootCooldown <= 0 && d < 400) {
      shoot(c.x + Math.cos(targetAngle) * 12, c.y + Math.sin(targetAngle) * 12, targetAngle + (Math.random()-0.5)*0.2, 'cop', 10, 10);
      c.shootCooldown = 40 - wanted * 3;
    }
  }

  for (let i = pickups.length - 1; i >= 0; i--) {
    const p = pickups[i];
    if (dist(p, player) < 30) {
      if (p.type === 'money') {
        player.money += p.amount;
      }
      pickups.splice(i, 1);
    }
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx; p.y += p.vy;
    p.vx *= 0.9; p.vy *= 0.9;
    p.life--;
    if (p.life <= 0) particles.splice(i, 1);
  }

  if (Math.random() < 0.001) wanted = Math.max(0, wanted - 0.01);
  if (player.ammo < 10) player.ammo += 0.05;

  if (player.health <= 0) {
    document.getElementById('gameOver').style.display = 'block';
  }

  document.getElementById('health').textContent = Math.max(0, Math.floor(player.health));
  document.getElementById('money').textContent = player.money;
  document.getElementById('ammo').textContent = Math.floor(player.ammo);
  document.getElementById('wanted').textContent = '★'.repeat(Math.floor(wanted)) + '☆'.repeat(5 - Math.floor(wanted));
  document.getElementById('vehStatus').textContent = player.inVehicle ? `🚗 In vehicle (HP: ${Math.max(0,Math.floor(player.inVehicle.health))})` : '🚶 On foot';
}

function drawCharacter(charIndex, x, y, angle, radius, fallbackColor) {
  const img = loadedImages[charIndex];
  if (img && img.complete && img.naturalWidth > 0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle + Math.PI/2);
    const size = radius * 2.5;
    ctx.drawImage(img, -size/2, -size/2, size, size);
    ctx.restore();
  } else {
    ctx.fillStyle = fallbackColor;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${radius}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(CHARACTERS[charIndex].name[0], x, y);
  }
}

function render() {
  ctx.fillStyle = '#2a4a2a';
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.translate(-cam.x, -cam.y);

  ctx.fillStyle = '#333';
  for (const r of roads) {
    if (r.x + r.w < cam.x || r.x > cam.x + W) continue;
    if (r.y + r.h < cam.y || r.y > cam.y + H) continue;
    ctx.fillRect(r.x, r.y, r.w, r.h);
  }

  ctx.strokeStyle = '#ff0';
  ctx.lineWidth = 2;
  ctx.setLineDash([20, 20]);
  for (const r of roads) {
    if (r.x + r.w < cam.x || r.x > cam.x + W) continue;
    if (r.y + r.h < cam.y || r.y > cam.y + H) continue;
    ctx.beginPath();
    if (r.horizontal) {
      ctx.moveTo(r.x, r.y + r.h/2);
      ctx.lineTo(r.x + r.w, r.y + r.h/2);
    } else {
      ctx.moveTo(r.x + r.w/2, r.y);
      ctx.lineTo(r.x + r.w/2, r.y + r.h);
    }
    ctx.stroke();
  }
  ctx.setLineDash([]);

  for (const b of buildings) {
    if (b.x + b.w < cam.x || b.x > cam.x + W) continue;
    if (b.y + b.h < cam.y || b.y > cam.y + H) continue;
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.strokeRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = 'rgba(255,255,150,0.3)';
    for (let wx = b.x + 8; wx < b.x + b.w - 8; wx += 15) {
      for (let wy = b.y + 8; wy < b.y + b.h - 8; wy += 15) {
        ctx.fillRect(wx, wy, 6, 6);
      }
    }
  }

  for (const p of pickups) {
    ctx.fillStyle = '#0f0';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('$', p.x, p.y + 3);
  }

  for (const p of pedestrians) {
    if (!p.dead) continue;
    ctx.fillStyle = '#600';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 12, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const v of vehicles) {
    if (v.x + 30 < cam.x || v.x - 30 > cam.x + W) continue;
    if (v.y + 30 < cam.y || v.y - 30 > cam.y + H) continue;
    ctx.save();
    ctx.translate(v.x, v.y);
    ctx.rotate(v.angle);
    ctx.fillStyle = v.color;
    ctx.fillRect(-v.w/2, -v.h/2, v.w, v.h);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.strokeRect(-v.w/2, -v.h/2, v.w, v.h);
    ctx.fillStyle = 'rgba(100,150,200,0.6)';
    ctx.fillRect(v.w/4, -v.h/2 + 2, 8, v.h - 4);
    ctx.restore();
  }

  for (const p of pedestrians) {
    if (p.dead) continue;
    drawCharacter(p.charIndex, p.x, p.y, p.angle, p.r, p.color);
  }

  for (const c of police) {
    if (c.dead) continue;
    ctx.fillStyle = '#00f';
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#000';
    ctx.fillRect(c.x - 4, c.y - 4, 8, 4);
  }

  if (!player.inVehicle) {
    drawCharacter(player.charIndex, player.x, player.y, player.angle, player.r, player.color);
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle);
    ctx.fillStyle = '#222';
    ctx.fillRect(8, -2, 12, 4);
    ctx.restore();
  } else {
    ctx.fillStyle = player.color;
    ctx.beginPath();
    ctx.arc(player.x, player.y, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const b of bullets) {
    ctx.fillStyle = b.owner === 'player' ? '#ff0' : '#f80';
    ctx.beginPath();
    ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const p of particles) {
    ctx.globalAlpha = p.life / 50;
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size/2, p.y - p.size/2, p.size, p.size);
  }
  ctx.globalAlpha = 1;

  ctx.restore();

  // Minimap
  const mapSize = 150;
  const mapX = W - mapSize - 10;
  const mapY = 10;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(mapX, mapY, mapSize, mapSize);
  ctx.strokeStyle = '#fff';
  ctx.strokeRect(mapX, mapY, mapSize, mapSize);

  const scale = mapSize / WORLD;
  ctx.fillStyle = '#555';
  for (const b of buildings) {
    ctx.fillRect(mapX + b.x * scale, mapY + b.y * scale, Math.max(1, b.w * scale), Math.max(1, b.h * scale));
  }
  ctx.fillStyle = '#4af';
  ctx.fillRect(mapX + player.x * scale - 2, mapY + player.y * scale - 2, 4, 4);
  for (const c of police) {
    if (c.dead) continue;
    ctx.fillStyle = '#f00';
    ctx.fillRect(mapX + c.x * scale - 2, mapY + c.y * scale - 2, 3, 3);
  }

  if (!player.inVehicle) {
    ctx.strokeStyle = '#f00';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(mouse.x, mouse.y, 8, 0, Math.PI * 2);
    ctx.moveTo(mouse.x - 12, mouse.y);
    ctx.lineTo(mouse.x + 12, mouse.y);
    ctx.moveTo(mouse.x, mouse.y - 12);
    ctx.lineTo(mouse.x, mouse.y + 12);
    ctx.stroke();
  }
}

function loop() {
  if (!gameStarted) return;
  update();
  render();
  requestAnimationFrame(loop);
}