// games.js
(() => {
  const cvs = document.getElementById('arc');
  const ctx = cvs.getContext('2d', { alpha: true });

  // Render tajam: scale ke devicePixelRatio
  const DPR = Math.max(1, Math.floor(window.devicePixelRatio || 1));
  function resizeCanvas() {
    const rect = cvs.getBoundingClientRect();
    cvs.width = Math.floor(rect.width * DPR);
    cvs.height = Math.floor(rect.height * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  // Saat pertama kali, set tinggi sesuai aspect 16:9
  const baseW = cvs.width, baseH = cvs.height;
  function enforceAspect() {
    const rect = cvs.getBoundingClientRect();
    const targetH = rect.width * (baseH / baseW);
    cvs.style.height = `${targetH}px`;
    resizeCanvas();
  }
  window.addEventListener('resize', enforceAspect);
  enforceAspect();

  // Utils visual RTX-style
  function clearBG() {
    // sky gradient
    const g = ctx.createLinearGradient(0, 0, 0, cvs.height / DPR);
    g.addColorStop(0, '#0b1220');
    g.addColorStop(1, '#0a0f1a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, cvs.width / DPR, cvs.height / DPR);

    // scanlines neon
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(255,123,240,0.06)';
    for (let y = 0; y < cvs.height / DPR; y += 22) {
      ctx.fillRect(0, y, cvs.width / DPR, 1);
    }
    ctx.globalCompositeOperation = 'source-over';
  }
  function neonRect(x, y, w, h, cGlow='rgba(90,240,255,0.8)', cFill='rgba(90,240,255,0.85)') {
    ctx.save();
    ctx.shadowColor = cGlow; ctx.shadowBlur = 14;
    ctx.fillStyle = cFill; ctx.fillRect(Math.floor(x)+0.5, Math.floor(y)+0.5, Math.floor(w), Math.floor(h));
    ctx.restore();
  }
  function neonText(txt, x, y, size=18) {
    ctx.save();
    ctx.font = `bold ${size}px Orbitron, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(90,240,255,0.8)'; ctx.shadowBlur = 16;
    ctx.fillStyle = '#e6f6ff';
    ctx.fillText(txt, Math.floor(x)+0.5, Math.floor(y)+0.5);
    ctx.restore();
  }
  // crisp line
  function line(x1,y1,x2,y2,c='rgba(90,240,255,0.6)'){
    ctx.strokeStyle=c; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(Math.floor(x1)+0.5,Math.floor(y1)+0.5);
    ctx.lineTo(Math.floor(x2)+0.5,Math.floor(y2)+0.5); ctx.stroke();
  }

  // Input
  const keys = new Set();
  window.addEventListener('keydown', e => {
    keys.add(e.code);
    if (e.code === 'KeyP') togglePause();
    if (e.code === 'Space') action();
  });
  window.addEventListener('keyup', e => keys.delete(e.code));

  // HUD
  const scoreEl = document.getElementById('score');
  const bestEl = document.getElementById('best');
  const statusEl = document.getElementById('status');
  const restartBtn = document.getElementById('restartBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const picker = document.getElementById('gamePicker');

  restartBtn.addEventListener('click', () => current.reset());
  pauseBtn.addEventListener('click', () => togglePause());
  picker.addEventListener('change', () => switchGame(picker.value));

  let paused = false;
  function togglePause(){ paused = !paused; statusEl.textContent = paused ? 'Pause' : 'Main'; }
  function action(){ if(current && current.action) current.action(); }

  // Game base
  function makeBase() {
    return {
      score: 0, bestKey: 'arc_best',
      reset(){ this.score = 0; if (this.init) this.init(); statusEl.textContent='Main'; paused=false; },
      update(dt){}, draw(){}, action(){},
      best(){ return parseInt(localStorage.getItem(this.bestKey)||'0',10) },
      setBest(v){ localStorage.setItem(this.bestKey, String(v)) }
    };
  }

  // 1) Snake
  const snake = (() => {
    const g = makeBase(); g.bestKey='best_snake';
    let grid=24, cols, rows, dir, tail, food, timeAcc=0, step=0.08;
    g.init = () => {
      cols = Math.floor((cvs.width/DPR)/grid); rows = Math.floor((cvs.height/DPR)/grid);
      const cx = Math.floor(cols/2), cy = Math.floor(rows/2);
      tail = [{x:cx,y:cy},{x:cx-1,y:cy},{x:cx-2,y:cy}]; dir={x:1,y:0};
      spawnFood();
    };
    function spawnFood(){
      food = { x: Math.floor(Math.random()*cols), y: Math.floor(Math.random()*rows) };
    }
    g.update = (dt) => {
      timeAcc += dt; if (timeAcc < step || paused) return;
      timeAcc = 0;
      // input
      if(keys.has('ArrowUp')||keys.has('KeyW')) if(dir.y!==1) dir={x:0,y:-1};
      if(keys.has('ArrowDown')||keys.has('KeyS')) if(dir.y!==-1) dir={x:0,y:1};
      if(keys.has('ArrowLeft')||keys.has('KeyA')) if(dir.x!==1) dir={x:-1,y:0};
      if(keys.has('ArrowRight')||keys.has('KeyD')) if(dir.x!==-1) dir={x:1,y:0};

      const head = { x:(tail[0].x+dir.x+cols)%cols, y:(tail[0].y+dir.y+rows)%rows };
      // collision with self
      if (tail.some(s => s.x===head.x && s.y===head.y)) { gameOver(); return; }
      tail.unshift(head);
      if (head.x===food.x && head.y===food.y) { g.score+=10; spawnFood(); }
      else tail.pop();
    };
    function gameOver(){
      paused=true; statusEl.textContent='Game Over';
      g.setBest(Math.max(g.best(), g.score));
    }
    g.draw = () => {
      clearBG();
      // 3D neon grid
      for(let x=0;x<cols;x++){
        for(let y=0;y<rows;y++){
          if((x+y)%2===0) line(x*grid,y*grid,(x+1)*grid,y*grid,'rgba(90,240,255,0.15)');
        }
      }
      // food glow
      neonRect(food.x*grid, food.y*grid, grid, grid, 'rgba(255,123,240,0.8)', 'rgba(255,123,240,0.85)');
      // snake body pseudo-3D
      tail.forEach((s,i)=>{
        const glow = i===0 ? 'rgba(90,240,255,1)' : 'rgba(90,240,255,0.7)';
        const fill = i===0 ? 'rgba(230,246,255,0.95)' : 'rgba(90,240,255,0.85)';
        neonRect(s.x*grid, s.y*grid, grid, grid, glow, fill);
      });
      neonText('SNAKE — Ultra 3D RTX', (cvs.width/DPR)/2, 24, 18);
    };
    g.action = () => { paused=false; };
    return g;
  })();

  // 2) Breakout
  const breakout = (() => {
    const g = makeBase(); g.bestKey='best_breakout';
    let paddle, ball, bricks=[], cols=12, rows=6, margin=50;
    g.init = () => {
      const W = cvs.width/DPR, H = cvs.height/DPR;
      paddle = { x: W/2-50, y: H-36, w: 100, h: 12, s: 6 };
      ball = { x: W/2, y: H/2, r: 7, vx: 3.6, vy: -3.8 };
      bricks = [];
      for(let y=0;y<rows;y++){
        for(let x=0;x<cols;x++){
          bricks.push({ x: margin + x*((W-2*margin)/cols), y: 70 + y*26, w: (W-2*margin)/cols-6, h: 18, alive:true });
        }
      }
    };
    g.update = (dt) => {
      if(paused) return;
      const W = cvs.width/DPR, H = cvs.height/DPR;
      if(keys.has('ArrowLeft')||keys.has('KeyA')) paddle.x -= paddle.s;
      if(keys.has('ArrowRight')||keys.has('KeyD')) paddle.x += paddle.s;
      paddle.x = Math.max(8, Math.min(W-paddle.w-8, paddle.x));

      ball.x += ball.vx; ball.y += ball.vy;
      if(ball.x<8||ball.x>W-8) ball.vx*=-1;
      if(ball.y<8) ball.vy*=-1;
      if(ball.y>H+20){ // lose
        paused=true; statusEl.textContent='Game Over';
        g.setBest(Math.max(g.best(), g.score));
      }
      // paddle
      if(ball.x>paddle.x && ball.x<paddle.x+paddle.w && ball.y>paddle.y && ball.y<paddle.y+paddle.h){
        ball.vy = -Math.abs(ball.vy);
        const off = (ball.x-(paddle.x+paddle.w/2))/paddle.w;
        ball.vx += off*3;
      }
      // bricks
      bricks.forEach(b=>{
        if(!b.alive) return;
        if(ball.x>b.x && ball.x<b.x+b.w && ball.y>b.y && ball.y<b.y+b.h){
          b.alive=false; ball.vy*=-1; g.score+=5;
        }
      });
    };
    g.draw = () => {
      clearBG(); neonText('BREAKOUT — Ultra 3D RTX', (cvs.width/DPR)/2, 24, 18);
      // paddle 3D
      neonRect(paddle.x, paddle.y, paddle.w, paddle.h);
      // ball glow
      ctx.save(); ctx.shadowColor='rgba(255,123,240,0.9)'; ctx.shadowBlur=16;
      ctx.fillStyle='rgba(255,123,240,0.95)';
      ctx.beginPath(); ctx.arc(Math.floor(ball.x)+0.5, Math.floor(ball.y)+0.5, ball.r, 0, Math.PI*2); ctx.fill();
      ctx.restore();
      // bricks
      bricks.forEach(b=>{
        if(!b.alive) return;
        neonRect(b.x, b.y, b.w, b.h, 'rgba(90,240,255,0.75)', 'rgba(90,240,255,0.85)');
        line(b.x, b.y, b.x+b.w, b.y, 'rgba(230,246,255,0.55)');
      });
    };
    g.action = () => { paused=false; };
    return g;
  })();

  // 3) Space Invaders
  const invaders = (() => {
    const g = makeBase(); g.bestKey='best_invaders';
    let ship, bullets=[], enemies=[], eDir=1, cooldown=0;
    g.init = () => {
      const W = cvs.width/DPR, H = cvs.height/DPR;
      ship = { x: W/2-18, y: H-50, w:36, h:14, s:5 };
      bullets = []; enemies = []; eDir=1;
      for(let y=0;y<4;y++){
        for(let x=0;x<10;x++){
          enemies.push({ x: 60 + x*56, y: 90 + y*36, w:36, h:22, alive:true });
        }
      }
    };
    g.update = (dt) => {
      if(paused) return;
      const W = cvs.width/DPR;
      if(keys.has('ArrowLeft')||keys.has('KeyA')) ship.x -= ship.s;
      if(keys.has('ArrowRight')||keys.has('KeyD')) ship.x += ship.s;
      ship.x = Math.max(10, Math.min(W-ship.w-10, ship.x));

      cooldown=Math.max(0,cooldown-dt);
      if((keys.has('Space')||keys.has('KeyW')||keys.has('ArrowUp'))&&cooldown===0){
        bullets.push({ x: ship.x+ship.w/2, y: ship.y, vy:-8 });
        cooldown=0.15;
      }
      bullets.forEach(b=>b.y+=b.vy);
      bullets = bullets.filter(b=>b.y>-20);

      // enemies movement
      let hitEdge=false;
      enemies.forEach(e=>{
        if(!e.alive) return;
        e.x += eDir*0.8;
        if(e.x<20 || e.x>W-56) hitEdge=true;
      });
      if(hitEdge){ eDir*=-1; enemies.forEach(e=>e.y+=6); }

      // collisions
      bullets.forEach(b=>{
        enemies.forEach(e=>{
          if(!e.alive) return;
          if(b.x>e.x && b.x<e.x+e.w && b.y>e.y && b.y<e.y+e.h){
            e.alive=false; b.y=-999; g.score+=10;
          }
        });
      });

      // lose if any enemy reaches bottom
      if(enemies.some(e=>e.alive && e.y>ship.y-10)){
        paused=true; statusEl.textContent='Game Over';
        g.setBest(Math.max(g.best(), g.score));
      }
    };
    g.draw = () => {
      clearBG(); neonText('SPACE INVADERS — Ultra 3D RTX', (cvs.width/DPR)/2, 24, 18);
      // ship
      neonRect(ship.x, ship.y, ship.w, ship.h, 'rgba(255,123,240,0.85)','rgba(255,123,240,0.95)');
      // bullets
      bullets.forEach(b=> neonRect(b.x-2, b.y-6, 4, 12, 'rgba(230,246,255,0.9)','rgba(230,246,255,0.95)'));
      // enemies: 3D blocks
      enemies.forEach(e=>{
        if(!e.alive) return;
        neonRect(e.x, e.y, e.w, e.h, 'rgba(90,240,255,0.8)','rgba(90,240,255,0.9)');
        line(e.x, e.y, e.x+e.w, e.y, 'rgba(230,246,255,0.6)');
      });
    };
    g.action = () => { paused=false; };
    return g;
  })();

  // 4) Pong (vs. CPU) 
  const pong = (() => {
    const g = makeBase(); g.bestKey='best_pong';
    let W,H,p1,p2,ball;
    g.init = () => {
      W = cvs.width/DPR; H = cvs.height/DPR;
      p1 = { x: 24, y: H/2-40, w: 12, h: 80, s: 6, score:0 };
      p2 = { x: W-36, y: H/2-40, w: 12, h: 80, s: 5.2, score:0 };
      ball = { x: W/2, y: H/2, r: 7, vx: 4.6, vy: 3.6 };
    };
    g.update = (dt) => {
      if(paused) return;
      // player control
      if(keys.has('ArrowUp')||keys.has('KeyW')) p1.y -= p1.s;
      if(keys.has('ArrowDown')||keys.has('KeyS')) p1.y += p1.s;
      p1.y = Math.max(10, Math.min(H-p1.h-10, p1.y));
      // CPU follows ball
      const target = ball.y - p2.h/2; p2.y += Math.sign(target - p2.y) * p2.s;
      p2.y = Math.max(10, Math.min(H-p2.h-10, p2.y));

      ball.x += ball.vx; ball.y += ball.vy;
      if(ball.y<8 || ball.y>H-8) ball.vy*=-1;

      // paddle collide
      function hit(p){
        return ball.x>p.x && ball.x<p.x+p.w && ball.y>p.y && ball.y<p.y+p.h;
      }
      if(hit(p1)){ ball.vx = Math.abs(ball.vx); ball.vy += ((ball.y - (p1.y+p1.h/2))/p1.h)*6; }
      if(hit(p2)){ ball.vx = -Math.abs(ball.vx); ball.vy += ((ball.y - (p2.y+p2.h/2))/p2.h)*6; }

      // score
      if(ball.x<0){ p2.score++; resetBall(-1); }
      if(ball.x>W){ p1.score++; resetBall(1); }
      g.score = Math.max(p1.score, p2.score);
      function resetBall(dir){
        ball.x=W/2; ball.y=H/2; ball.vx=dir*4.6; ball.vy=(Math.random()<0.5?1:-1)*3.4;
      }
    };
    g.draw = () => {
      clearBG(); neonText('PONG (vs. CPU) — Ultra 3D RTX', (cvs.width/DPR)/2, 24, 18);
      // mid line
      for(let y=40;y<H;y+=24) line(W/2, y, W/2, y+12, 'rgba(90,240,255,0.25)');
      // paddles
      neonRect(p1.x, p1.y, p1.w, p1.h, 'rgba(255,123,240,0.9)','rgba(255,123,240,0.95)');
      neonRect(p2.x, p2.y, p2.w, p2.h, 'rgba(90,240,255,0.9)','rgba(90,240,255,0.95)');
      // ball
      ctx.save(); ctx.shadowColor='rgba(230,246,255,0.95)'; ctx.shadowBlur=16;
      ctx.fillStyle='rgba(230,246,255,0.95)';
      ctx.beginPath(); ctx.arc(Math.floor(ball.x)+0.5, Math.floor(ball.y)+0.5, ball.r, 0, Math.PI*2); ctx.fill(); ctx.restore();
      neonText(`${p1.score} : ${p2.score}`, W/2, 60, 22);
    };
    g.action=()=>{ paused=false; };
    return g;
  })();

  // 5) Flappy Bird
  const flappy = (() => {
    const g = makeBase(); g.bestKey='best_flappy';
    let bird, pipes=[], gravity=0.5, jump=-7.6, gap=120, speed=2.8, W,H;
    g.init = () => {
      W = cvs.width/DPR; H = cvs.height/DPR;
      bird = { x: 120, y: H/2, vy:0 };
      pipes = []; for(let i=0;i<5;i++) spawn(W + i*220);
    };
    function spawn(x){ 
      const top = 40 + Math.random()*(H-160-gap);
      pipes.push({ x, w:38, top, bottom: top+gap });
    }
    g.update = (dt) => {
      if(paused) return;
      // input
      if(keys.has('Space')||keys.has('ArrowUp')||keys.has('KeyW')) bird.vy = jump;
      bird.vy += gravity; bird.y += bird.vy;

      // pipes
      for(let i=pipes.length-1;i>=0;i--){
        pipes[i].x -= speed;
        if(pipes[i].x+pipes[i].w<0){ pipes.splice(i,1); spawn(W+220); g.score++; }
      }

      // collision
      if(bird.y<0 || bird.y>H) lose();
      pipes.forEach(p=>{
        const inX = bird.x > p.x && bird.x < p.x+p.w;
        const hit = (bird.y < p.top) || (bird.y > p.bottom);
        if(inX && hit) lose();
      });
    };
    function lose(){ paused=true; statusEl.textContent='Game Over'; g.setBest(Math.max(g.best(), g.score)); }
    g.draw = () => {
      clearBG(); neonText('FLAPPY BIRD — Ultra 3D RTX', (cvs.width/DPR)/2, 24, 18);
      // pipes neon
      pipes.forEach(p=>{
        neonRect(p.x, 0, p.w, p.top, 'rgba(90,240,255,0.85)','rgba(90,240,255,0.95)');
        neonRect(p.x, p.bottom, p.w, H-p.bottom, 'rgba(90,240,255,0.85)','rgba(90,240,255,0.95)');
      });
      // bird glow
      neonRect(bird.x-10, bird.y-8, 20, 16, 'rgba(255,123,240,0.9)','rgba(255,123,240,0.95)');
    };
    g.action=()=>{ paused=false; };
    return g;
  })();

  // 6) Google Dinosaur Runner
  const dino = (() => {
    const g = makeBase(); g.bestKey='best_dino';
    let ground, player, obs=[], gravity=0.6, jump=-12, speed=4;
    g.init = () => {
      const H = cvs.height/DPR;
      ground = H-60; player = { x:120, y:ground-40, w:36, h:40, vy:0 };
      obs = []; for(let i=0;i<4;i++) spawn( i*240 + 420 );
    };
    function spawn(x){ const h = 24+Math.random()*28; const w = 22+Math.random()*26; obs.push({ x, y: (cvs.height/DPR)-60 - h, w, h }); }
    g.update = (dt) => {
      if(paused) return;
      // input
      if(keys.has('Space')||keys.has('ArrowUp')||keys.has('KeyW')){
        if(player.y >= (cvs.height/DPR)-60 - player.h - 0.5) player.vy = jump;
      }
      player.vy += gravity; player.y += player.vy;
      if(player.y > (cvs.height/DPR)-60 - player.h){ player.y = (cvs.height/DPR)-60 - player.h; player.vy = 0; }

      obs.forEach(o=> o.x -= speed);
      if(obs.length && obs[0].x+obs[0].w < 0){ obs.shift(); spawn((cvs.width/DPR) + 240); g.score++; }

      // collisions
      const p = player;
      obs.forEach(o=>{
        const hit = !(p.x+p.w<o.x || p.x>o.x+o.w || p.y+p.h<o.y || p.y>o.y+o.h);
        if(hit){ paused=true; statusEl.textContent='Game Over'; g.setBest(Math.max(g.best(), g.score)); }
      });
    };
    g.draw = () => {
      clearBG(); neonText('DINO RUNNER — Ultra 3D RTX', (cvs.width/DPR)/2, 24, 18);
      // ground grid
      for(let x=0;x<(cvs.width/DPR);x+=20) line(x, ground, x, cvs.height/DPR, 'rgba(90,240,255,0.18)');
      // player
      neonRect(player.x, player.y, player.w, player.h, 'rgba(255,123,240,0.9)','rgba(255,123,240,0.95)');
      // obstacles
      obs.forEach(o=> neonRect(o.x, o.y, o.w, o.h));
    };
    g.action=()=>{ paused=false; };
    return g;
  })();

  // 7) Doodle Jump
  const doodle = (() => {
    const g = makeBase(); g.bestKey='best_doodle';
    let W,H, dude, plats=[], gravity=0.5, jump=-9, scroll=0;
    g.init = () => {
      W = cvs.width/DPR; H = cvs.height/DPR;
      dude = { x: W/2, y: H-80, vy:0, w:24, h:28 };
      plats = [];
      for(let y=H-20;y>0;y-=60){
        plats.push({ x: Math.random()*(W-80), y, w:80, h:10 });
      }
    };
    g.update = (dt) => {
      if(paused) return;
      // input
      if(keys.has('ArrowLeft')||keys.has('KeyA')) dude.x -= 4.2;
      if(keys.has('ArrowRight')||keys.has('KeyD')) dude.x += 4.2;
      dude.x = (dude.x+W)%W;

      dude.vy += gravity; dude.y += dude.vy;

      // collide with platforms (landing)
      plats.forEach(p=>{
        const withinX = dude.x+dude.w>p.x && dude.x<p.x+p.w;
        const landing = (dude.y+dude.h>=p.y && dude.y+dude.h<=p.y+10 && dude.vy>0);
        if(withinX && landing){ dude.vy = jump; g.score++; }
      });

      // scroll when going up
      if(dude.y < H*0.4){ const dy = H*0.4 - dude.y; dude.y += dy; scroll += dy; plats.forEach(p=> p.y += dy); }

      // recycle platforms
      for(let i=plats.length-1;i>=0;i--){
        if(plats[i].y>H){ plats.splice(i,1); plats.push({ x: Math.random()*(W-80), y: -20, w:80, h:10 }); }
      }

      // lose when fall
      if(dude.y>H+40){ paused=true; statusEl.textContent='Game Over'; g.setBest(Math.max(g.best(), g.score)); }
    };
    g.draw = () => {
      clearBG(); neonText('DOODLE JUMP — Ultra 3D RTX', (cvs.width/DPR)/2, 24, 18);
      // platforms
      plats.forEach(p=> neonRect(p.x, p.y, p.w, p.h, 'rgba(90,240,255,0.85)','rgba(90,240,255,0.95)'));
      // player
      neonRect(dude.x, dude.y, dude.w, dude.h, 'rgba(255,123,240,0.9)','rgba(255,123,240,0.95)');
    };
    g.action=()=>{ paused=false; };
    return g;
  })();

  // ===== 8) Pac-Man =====
  const pacman = (() => {
    const g = makeBase(); g.bestKey = 'best_pacman';
    let W,H, player, ghosts = [], pellets = [], speed = 3;
    g.init = () => {
      W = cvs.width/DPR; H = cvs.height/DPR;
      player = { x: W/2, y: H/2, r: 10, vx:0, vy:0 };
      pellets = [];
      for(let x=40;x<W-40;x+=24){ for(let y=40;y<H-40;y+=24){ pellets.push({x,y,eaten:false}); } }
      // 4 hantu sederhana
      ghosts = [
        { x: 100, y: 100, vx: 2, vy: 2, color: 'rgba(255,123,240,0.9)' },
        { x: W-100, y: 100, vx: -2, vy: 2, color: 'rgba(90,240,255,0.9)' },
        { x: 100, y: H-100, vx: 2, vy: -2, color: 'rgba(230,246,255,0.95)' },
        { x: W-100, y: H-100, vx: -2, vy: -2, color: 'rgba(255,180,80,0.9)' }
      ];
    };
    g.update = dt => {
      if (paused) return;
      player.vx = (keys.has('ArrowLeft')||keys.has('KeyA')) ? -speed : (keys.has('ArrowRight')||keys.has('KeyD')) ? speed : 0;
      player.vy = (keys.has('ArrowUp')||keys.has('KeyW')) ? -speed : (keys.has('ArrowDown')||keys.has('KeyS')) ? speed : 0;
      player.x = Math.max(20, Math.min(W-20, player.x + player.vx));
      player.y = Math.max(20, Math.min(H-20, player.y + player.vy));
      pellets.forEach(p=>{
        if(!p.eaten && Math.hypot(player.x-p.x, player.y-p.y) < 12){ p.eaten = true; g.score += 1; }
      });
      ghosts.forEach(gh=>{
        gh.x += gh.vx; gh.y += gh.vy;
        if (gh.x < 20 || gh.x > W-20) gh.vx *= -1;
        if (gh.y < 20 || gh.y > H-20) gh.vy *= -1;
        if (Math.hypot(player.x - gh.x, player.y - gh.y) < 18){
          paused = true; statusEl.textContent='Game Over'; g.setBest(Math.max(g.best(), g.score));
        }
      });
    };
    g.draw = () => {
      clearBG();
      neonText('PAC-MAN — Ultra 3D RTX', W/2, 24, 18);
      pellets.forEach(p=>{
        if(!p.eaten){
          ctx.save(); ctx.shadowColor='rgba(90,240,255,0.8)'; ctx.shadowBlur=8;
          ctx.fillStyle='rgba(230,246,255,0.95)'; ctx.beginPath();
          ctx.arc(Math.floor(p.x)+0.5, Math.floor(p.y)+0.5, 3, 0, Math.PI*2); ctx.fill(); ctx.restore();
        }
      });
      ctx.save(); ctx.shadowColor='rgba(255,255,0,0.9)'; ctx.shadowBlur=16;
      ctx.fillStyle='yellow'; ctx.beginPath();
      ctx.arc(Math.floor(player.x)+0.5, Math.floor(player.y)+0.5, player.r, 0, Math.PI*2); ctx.fill(); ctx.restore();
      ghosts.forEach(gh=>{
        ctx.save(); ctx.shadowColor=gh.color; ctx.shadowBlur=16;
        ctx.fillStyle=gh.color; ctx.beginPath();
        ctx.arc(Math.floor(gh.x)+0.5, Math.floor(gh.y)+0.5, 12, 0, Math.PI*2); ctx.fill(); ctx.restore();
      });
    };
    g.action = () => { paused = false; };
    return g;
  })();
  
  // ===== 9) Ocean Commander (side-scrolling shooter) =====
  const commander = (() => {
    const g = makeBase(); g.bestKey='best_commander';
    let W,H, ship, bullets=[], foes=[], speed=2.4, cooldown=0, spawnT=0;
    g.init = () => {
      W = cvs.width/DPR; H = cvs.height/DPR;
      ship = { x: 80, y: H/2, w: 28, h: 16, vy:0 };
      bullets=[]; foes=[]; cooldown=0; spawnT=0;
    };
    g.update = dt => {
      if (paused) return;
      ship.vy = (keys.has('ArrowUp')||keys.has('KeyW')) ? -4 : (keys.has('ArrowDown')||keys.has('KeyS')) ? 4 : 0;
      ship.y = Math.max(20, Math.min(H-20, ship.y + ship.vy));

      cooldown = Math.max(0, cooldown - dt);
      if ((keys.has('Space')||keys.has('KeyX')) && cooldown === 0){
        bullets.push({ x: ship.x + ship.w, y: ship.y, vx: 8 });
        cooldown = 0.12;
      }
      bullets.forEach(b=> b.x += b.vx);
      bullets = bullets.filter(b => b.x < W + 20);

      spawnT += dt;
      if (spawnT > 0.6){ spawnT = 0; foes.push({ x: W + 20, y: 40 + Math.random()*(H-80), w: 24, h: 18, vx: -speed }); }
      foes.forEach(f=> f.x += f.vx);
      foes = foes.filter(f=> f.x > -30);

      bullets.forEach(b=>{
        foes.forEach(f=>{
          if (b.x > f.x && b.x < f.x + f.w && b.y > f.y && b.y < f.y + f.h){
            f.x = -999; b.x = W + 999; g.score += 5;
          }
        });
      });

      foes.forEach(f=>{
        if (ship.x < f.x + f.w && ship.x + ship.w > f.x && ship.y < f.y + f.h && ship.y + ship.h > f.y){
          paused = true; statusEl.textContent = 'Game Over'; g.setBest(Math.max(g.best(), g.score));
        }
      });
    };
    g.draw = () => {
      clearBG();
      neonText('OCEAN COMMANDER — Ultra 3D RTX', W/2, 24, 18);
      neonRect(ship.x, ship.y - ship.h/2, ship.w, ship.h, 'rgba(255,123,240,0.9)','rgba(255,123,240,0.95)');
      bullets.forEach(b=> neonRect(b.x-3, b.y-2, 6, 4, 'rgba(230,246,255,0.9)','rgba(230,246,255,0.95)'));
      foes.forEach(f=> neonRect(f.x, f.y, f.w, f.h, 'rgba(90,240,255,0.85)','rgba(90,240,255,0.95)'));
    };
    g.action = () => { paused = false; };
    return g;
  })();

  // ===== 10) Mario Bros. Arcade (single-screen platformer) =====
  const mario = (() => {
    const g = makeBase(); g.bestKey='best_mario';
    let W,H, player, platforms=[], enemies=[];
    g.init = () => {
      W = cvs.width/DPR; H = cvs.height/DPR;
      player = { x: W/2, y: H-60, w: 18, h: 22, vy:0, onGround:false };
      platforms = [
        { x: 40, y: H-40, w: W-80, h: 10 },
        { x: 60, y: H-120, w: W-120, h: 10 },
        { x: 80, y: H-200, w: W-160, h: 10 }
      ];
      enemies = [{ x: 80, y: H-60, w: 18, h: 18, vx: 1.2 }];
    };
    g.update = dt => {
      if (paused) return;
      const left = keys.has('ArrowLeft')||keys.has('KeyA');
      const right = keys.has('ArrowRight')||keys.has('KeyD');
      const jump = (keys.has('Space')||keys.has('ArrowUp')||keys.has('KeyW')) && player.onGround;
      if (left) player.x -= 2.6;
      if (right) player.x += 2.6;
      if (jump) player.vy = -7.8;
      player.vy += 0.45; player.y += player.vy;
      player.onGround = false;

      platforms.forEach(p=>{
        if (player.x + player.w > p.x && player.x < p.x + p.w && player.y + player.h > p.y && player.y + player.h < p.y + 12 && player.vy > 0){
          player.y = p.y - player.h; player.vy = 0; player.onGround = true;
        }
      });
      player.x = Math.max(20, Math.min(W-20, player.x));
      if (player.y > H+60){ paused=true; statusEl.textContent='Game Over'; g.setBest(Math.max(g.best(), g.score)); }

      enemies.forEach(e=>{
        e.x += e.vx; if (e.x < 40 || e.x > W-40) e.vx *= -1;
        const hit = !(player.x + player.w < e.x || player.x > e.x + e.w || player.y + player.h < e.y || player.y > e.y + e.h);
        if (hit){ paused=true; statusEl.textContent='Game Over'; g.setBest(Math.max(g.best(), g.score)); }
      });
      g.score += dt * 10;
    };
    g.draw = () => {
      clearBG(); neonText('MARIO BROS. ARCADE — Ultra 3D RTX', W/2, 24, 18);
      platforms.forEach(p=> neonRect(p.x, p.y, p.w, p.h, 'rgba(90,240,255,0.85)','rgba(90,240,255,0.95)'));
      neonRect(player.x, player.y, player.w, player.h, 'rgba(255,123,240,0.9)','rgba(255,123,240,0.95)');
      enemies.forEach(e=> neonRect(e.x, e.y, e.w, e.h));
    };
    g.action = () => { paused = false; };
    return g;
  })();

  // ===== 11) Excitecar (endless car runner) =====
  const excitecar = (() => {
    const g = makeBase(); g.bestKey='best_excitecar';
    let W,H, car, obs=[], speed=4, laneW;
    g.init = () => {
      W = cvs.width/DPR; H = cvs.height/DPR; laneW = W/4;
      car = { lane: 2, y: H-90, w: laneW*0.5, h: 28 };
      obs = [];
      for(let i=0;i<4;i++) spawn(W + i*220);
    };
    function spawn(x){
      obs.push({ x, lane: 1 + Math.floor(Math.random()*3), w: laneW*0.5, h: 26, y: 80 });
    }
    g.update = dt => {
      if (paused) return;
      if ((keys.has('ArrowLeft')||keys.has('KeyA')) && car.lane > 1) car.lane--;
      if ((keys.has('ArrowRight')||keys.has('KeyD')) && car.lane < 3) car.lane++;
      const carX = car.lane * laneW - laneW/2 - car.w/2;

      obs.forEach(o=> o.x -= speed);
      if (obs.length && obs[0].x + car.w < 0){ obs.shift(); spawn(W + 240); g.score++; }

      obs.forEach(o=>{
        const ox = o.lane * laneW - laneW/2 - o.w/2;
        const collide = !(carX + car.w < o.x || carX > o.x + o.w || car.y + car.h < o.y || car.y > o.y + o.h);
        if (collide){ paused=true; statusEl.textContent='Game Over'; g.setBest(Math.max(g.best(), g.score)); }
      });

      car._x = carX;
    };
    g.draw = () => {
      clearBG(); neonText('EXCITECAR — Ultra 3D RTX', W/2, 24, 18);
      for(let i=1;i<4;i++) line(i*laneW, 60, i*laneW, H, 'rgba(90,240,255,0.25)');
      neonRect(car._x, car.y, car.w, car.h, 'rgba(255,123,240,0.9)','rgba(255,123,240,0.95)');
      obs.forEach(o=>{
        const ox = o.lane * laneW - laneW/2 - o.w/2;
        neonRect(ox, o.y, o.w, o.h);
      });
    };
    g.action = () => { paused = false; };
    return g;
  })();

  // ===== 12) Donkey Kong =====
  const dkong = (() => {
    const g = makeBase(); g.bestKey='best_dkong';
    let W,H, p, platforms=[], barrels=[];
    g.init = () => {
      W = cvs.width/DPR; H = cvs.height/DPR;
      p = { x: 60, y: H-80, w: 18, h: 20, vy:0, on:false };
      platforms = [
        { x: 30, y: H-40, w: W-60, h: 8 },
        { x: 50, y: H-120, w: W-100, h: 8 },
        { x: 30, y: H-200, w: W-60, h: 8 }
      ];
      barrels = [];
    };
    g.update = dt => {
      if (paused) return;
      if (Math.random() < 0.02) barrels.push({ x: W - 60, y: H-200, r: 10, vx: -2.2, vy: 0.3 });
      const left = keys.has('ArrowLeft')||keys.has('KeyA');
      const right = keys.has('ArrowRight')||keys.has('KeyD');
      const jump = (keys.has('Space')||keys.has('ArrowUp')||keys.has('KeyW')) && p.on;
      if (left) p.x -= 2.4;
      if (right) p.x += 2.4;
      if (jump) p.vy = -7.8;
      p.vy += 0.46; p.y += p.vy; p.on = false;
      platforms.forEach(pl=>{
        if (p.x + p.w > pl.x && p.x < pl.x + pl.w && p.y + p.h > pl.y && p.y + p.h <= pl.y + 12 && p.vy > 0){
          p.y = pl.y - p.h; p.vy = 0; p.on = true;
        }
      });
      barrels.forEach(b=>{ b.x += b.vx; b.y += b.vy; });
      barrels = barrels.filter(b=> b.x > -20 && b.y < H+20);
      barrels.forEach(b=>{
        const hit = !(p.x + p.w < b.x - b.r || p.x > b.x + b.r || p.y + p.h < b.y - b.r || p.y > b.y + b.r);
        if (hit){ paused=true; statusEl.textContent='Game Over'; g.setBest(Math.max(g.best(), g.score)); }
      });
      g.score += dt * 8;
    };
    g.draw = () => {
      clearBG(); neonText('DONKEY KONG — Ultra 3D RTX', W/2, 24, 18);
      platforms.forEach(pl=> neonRect(pl.x, pl.y, pl.w, pl.h, 'rgba(90,240,255,0.85)','rgba(90,240,255,0.95)'));
      neonRect(p.x, p.y, p.w, p.h, 'rgba(255,123,240,0.9)','rgba(255,123,240,0.95)');
      barrels.forEach(b=>{
        ctx.save(); ctx.shadowColor='rgba(230,246,255,0.95)'; ctx.shadowBlur=14;
        ctx.fillStyle='rgba(230,246,255,0.95)'; ctx.beginPath();
        ctx.arc(Math.floor(b.x)+0.5, Math.floor(b.y)+0.5, b.r, 0, Math.PI*2); ctx.fill(); ctx.restore();
      });
    };
    g.action = () => { paused = false; };
    return g;
  })();

  // ===== 13) Donkey Kong Jr. =====
  const dkjr = (() => {
    const g = makeBase(); g.bestKey='best_dkjr';
    let W,H, p, vines=[], foes=[];
    g.init = () => {
      W = cvs.width/DPR; H = cvs.height/DPR;
      p = { x: W/2, y: H-80, w: 18, h: 20, vy:0 };
      vines = [{ x: W/3, y: 80, h: H-160 }, { x: 2*W/3, y: 60, h: H-140 }];
      foes = [];
    };
    g.update = dt => {
      if (paused) return;
      if (keys.has('ArrowLeft')||keys.has('KeyA')) p.x -= 2.2;
      if (keys.has('ArrowRight')||keys.has('KeyD')) p.x += 2.2;
      if (keys.has('ArrowUp')||keys.has('KeyW')) p.y -= 2.2;
      if (keys.has('ArrowDown')||keys.has('KeyS')) p.y += 2.2;
      p.x = Math.max(20, Math.min(W-20, p.x)); p.y = Math.max(40, Math.min(H-40, p.y));
      if (Math.random() < 0.02) foes.push({ x: Math.random()*W, y: 80, vy: 2.4 });
      foes.forEach(f=> f.y += f.vy);
      foes = foes.filter(f=> f.y < H+20);
      foes.forEach(f=>{
        const hit = !(p.x + p.w < f.x || p.x > f.x + 10 || p.y + p.h < f.y || p.y > f.y + 10);
        if (hit){ paused=true; statusEl.textContent='Game Over'; g.setBest(Math.max(g.best(), g.score)); }
      });
      g.score += dt * 9;
    };
    g.draw = () => {
      clearBG(); neonText('DONKEY KONG JR — Ultra 3D RTX', W/2, 24, 18);
      vines.forEach(v=> line(v.x, v.y, v.x, v.y + v.h, 'rgba(90,240,255,0.6)'));
      neonRect(p.x, p.y, p.w, p.h, 'rgba(255,123,240,0.9)','rgba(255,123,240,0.95)');
      foes.forEach(f=> neonRect(f.x, f.y, 10, 10));
    };
    g.action = () => { paused = false; };
    return g;
  })();

  // ===== 14) Donkey Kong 3 (bug spray arena) =====
  const dk3 = (() => {
    const g = makeBase(); g.bestKey='best_dk3';
    let W,H, player, bugs=[];
    g.init = () => {
      W = cvs.width/DPR; H = cvs.height/DPR;
      player = { x: W/2 - 16, y: H - 50, w: 32, h: 12 };
      bugs = [];
    };
    g.update = dt => {
      if (paused) return;
      if (keys.has('ArrowLeft')||keys.has('KeyA')) player.x -= 3.2;
      if (keys.has('ArrowRight')||keys.has('KeyD')) player.x += 3.2;
      player.x = Math.max(20, Math.min(W-52, player.x));
      if (Math.random() < 0.04) bugs.push({ x: Math.random()*W, y: 40, vy: 2 + Math.random()*1.2 });
      bugs.forEach(b=> b.y += b.vy);
      bugs.forEach(b=>{
        const hit = !(player.x + player.w < b.x || player.x > b.x + 14 || player.y + player.h < b.y || player.y > b.y + 14);
        if (hit){ paused=true; statusEl.textContent='Game Over'; g.setBest(Math.max(g.best(), g.score)); }
      });
      bugs = bugs.filter(b=> b.y < H+20);
      g.score += dt * 12;
    };
    g.draw = () => {
      clearBG(); neonText('DONKEY KONG 3 — Ultra 3D RTX', W/2, 24, 18);
      neonRect(player.x, player.y, player.w, player.h, 'rgba(255,123,240,0.9)','rgba(255,123,240,0.95)');
      bugs.forEach(b=> neonRect(b.x, b.y, 14, 14));
    };
    g.action = () => { paused = false; };
    return g;
  })();

  // ===== 15) Wrecking Crew (block puzzle) =====
  const wrecking = (() => {
    const g = makeBase(); g.bestKey='best_wrecking';
    let W,H, hammer, blocks=[];
    g.init = () => {
      W = cvs.width/DPR; H = cvs.height/DPR;
      hammer = { x: W/2, y: H-80, w: 18, h: 18 };
      blocks = [];
      for(let x=40;x<W-40;x+=60){ for(let y=60;y<H-140;y+=40){ blocks.push({ x, y, w: 40, h: 20, alive:true }); } }
    };
    g.update = dt => {
      if (paused) return;
      if (keys.has('ArrowLeft')||keys.has('KeyA')) hammer.x -= 3;
      if (keys.has('ArrowRight')||keys.has('KeyD')) hammer.x += 3;
      if (keys.has('ArrowUp')||keys.has('KeyW')) hammer.y -= 3;
      if (keys.has('ArrowDown')||keys.has('KeyS')) hammer.y += 3;
      hammer.x = Math.max(20, Math.min(W-20, hammer.x));
      hammer.y = Math.max(40, Math.min(H-40, hammer.y));
      blocks.forEach(b=>{
        if(b.alive && hammer.x > b.x && hammer.x < b.x + b.w && hammer.y > b.y && hammer.y < b.y + b.h){
          b.alive = false; g.score += 2;
        }
      });
    };
    g.draw = () => {
      clearBG(); neonText('WRECKING CREW — Ultra 3D RTX', W/2, 24, 18);
      neonRect(hammer.x - hammer.w/2, hammer.y - hammer.h/2, hammer.w, hammer.h, 'rgba(255,123,240,0.9)','rgba(255,123,240,0.95)');
      blocks.forEach(b=>{ if(b.alive) neonRect(b.x, b.y, b.w, b.h); });
    };
    g.action = () => { paused = false; };
    return g;
  })();

  // ===== 16) Tetris =====
  const tetris = (() => {
    const g = makeBase(); g.bestKey='best_tetris';
    let W,H, grid=[], cols=10, rows=20, cell=22, piece=null, fall=0, speed=0.6;
    const shapes = [
      [[1,1,1,1]], // I
      [[1,1],[1,1]], // O
      [[0,1,0],[1,1,1]], // T
      [[1,1,0],[0,1,1]], // S
      [[0,1,1],[1,1,0]], // Z
      [[1,0,0],[1,1,1]], // J
      [[0,0,1],[1,1,1]]  // L
    ];
    function newPiece(){
      const s = shapes[Math.floor(Math.random()*shapes.length)];
      piece = { x: Math.floor(cols/2)-1, y: 0, shape: s };
    }
    g.init = () => {
      W = cvs.width/DPR; H = cvs.height/DPR;
      grid = Array.from({length: rows}, () => Array(cols).fill(0));
      newPiece(); fall = 0;
    };
    function collide(px,py,shape){
      for(let y=0;y<shape.length;y++){
        for(let x=0;x<shape[y].length;x++){
          if(shape[y][x] && (py+y>=rows || px+x<0 || px+x>=cols || grid[py+y][px+x])) return true;
        }
      }
      return false;
    }
    function merge(px,py,shape){
      for(let y=0;y<shape.length;y++) for(let x=0;x<shape[y].length;x++){
        if(shape[y][x]) grid[py+y][px+x] = 1;
      }
    }
    g.update = dt => {
      if (paused) return;
      fall += dt;
      const left = keys.has('ArrowLeft')||keys.has('KeyA');
      const right = keys.has('ArrowRight')||keys.has('KeyD');
      const down = keys.has('ArrowDown')||keys.has('KeyS');
      if (left && !collide(piece.x-1, piece.y, piece.shape)) piece.x--;
      if (right && !collide(piece.x+1, piece.y, piece.shape)) piece.x++;
      if (down) fall += 0.2;

      if (fall > speed){
        fall = 0;
        if (!collide(piece.x, piece.y+1, piece.shape)) piece.y++;
        else {
          merge(piece.x, piece.y, piece.shape);
          // clear lines
          for(let y=rows-1;y>=0;y--){
            if(grid[y].every(v => v)){
              grid.splice(y,1); grid.unshift(Array(cols).fill(0)); g.score += 10;
              y++;
            }
          }
          newPiece();
          if (collide(piece.x, piece.y, piece.shape)){
            paused=true; statusEl.textContent='Game Over'; g.setBest(Math.max(g.best(), g.score));
          }
        }
      }
    };
    g.draw = () => {
      clearBG(); neonText('TETRIS — Ultra 3D RTX', W/2, 24, 18);
      const ox = (W - cols*cell)/2, oy = 50;
      for(let y=0;y<rows;y++) for(let x=0;x<cols;x++){
        if(grid[y][x]) neonRect(ox + x*cell, oy + y*cell, cell-2, cell-2);
      }
      for(let y=0;y<piece.shape.length;y++) for(let x=0;x<piece.shape[y].length;x++){
        if(piece.shape[y][x]) neonRect(ox + (piece.x+x)*cell, oy + (piece.y+y)*cell, cell-2, cell-2, 'rgba(255,123,240,0.9)','rgba(255,123,240,0.95)');
      }
    };
    g.action = () => { paused = false; };
    return g;
  })();

  // ===== 17) Dr. Mario (capsule match) =====
  const drmario = (() => {
    const g = makeBase(); g.bestKey='best_drmario';
    let W,H, grid=[], cols=8, rows=16, cell=24, capsule=null, fall=0, speed=0.7;
    function newCapsule(){ capsule = { x: Math.floor(cols/2)-1, y: 0, parts: [[1,1]] }; }
    g.init = () => {
      W = cvs.width/DPR; H = cvs.height/DPR;
      grid = Array.from({length: rows}, () => Array(cols).fill(0));
      newCapsule(); fall = 0;
    };
    function collide(px,py,parts){
      for(let y=0;y<parts.length;y++) for(let x=0;x<parts[y].length;x++){
        if(parts[y][x] && (py+y>=rows || px+x<0 || px+x>=cols || grid[py+y][px+x])) return true;
      }
      return false;
    }
    function merge(px,py,parts){
      for(let y=0;y<parts.length;y++) for(let x=0;x<parts[y].length;x++){
        if(parts[y][x]) grid[py+y][px+x] = 1;
      }
    }
    g.update = dt => {
      if (paused) return;
      fall += dt;
      if ((keys.has('ArrowLeft')||keys.has('KeyA')) && !collide(capsule.x-1, capsule.y, capsule.parts)) capsule.x--;
      if ((keys.has('ArrowRight')||keys.has('KeyD')) && !collide(capsule.x+1, capsule.y, capsule.parts)) capsule.x++;
      if (keys.has('ArrowUp')||keys.has('KeyW')) capsule.parts = [[1],[1]]; // rotate simple
      if (keys.has('ArrowDown')||keys.has('KeyS')) fall += 0.25;

      if (fall > speed){
        fall = 0;
        if (!collide(capsule.x, capsule.y+1, capsule.parts)) capsule.y++;
        else {
          merge(capsule.x, capsule.y, capsule.parts);
          // simple clear: remove any 3 in a row (demo)
          for(let y=0;y<rows;y++){
            for(let x=0;x<cols-2;x++){
              if(grid[y][x]&&grid[y][x+1]&&grid[y][x+2]){ grid[y][x]=grid[y][x+1]=grid[y][x+2]=0; g.score+=6; }
            }
          }
          newCapsule();
          if (collide(capsule.x, capsule.y, capsule.parts)){
            paused=true; statusEl.textContent='Game Over'; g.setBest(Math.max(g.best(), g.score));
          }
        }
      }
    };
    g.draw = () => {
      clearBG(); neonText('DR. MARIO — Ultra 3D RTX', W/2, 24, 18);
      const ox = (W - cols*cell)/2, oy = 50;
      for(let y=0;y<rows;y++) for(let x=0;x<cols;x++){
        if(grid[y][x]) neonRect(ox + x*cell, oy + y*cell, cell-3, cell-3);
      }
      for(let y=0;y<capsule.parts.length;y++) for(let x=0;x<capsule.parts[y].length;x++){
        if(capsule.parts[y][x]) neonRect(ox + (capsule.x+x)*cell, oy + (capsule.y+y)*cell, cell-3, cell-3, 'rgba(255,123,240,0.9)','rgba(255,123,240,0.95)');
      }
    };
    g.action = () => { paused = false; };
    return g;
  })();

  // ===== 18) Mario Yoshi (simple match) =====
  const yoshi = (() => {
    const g = makeBase(); g.bestKey='best_yoshi';
    let W,H, grid=[], cols=6, rows=8, cell=28;
    g.init = () => {
      W = cvs.width/DPR; H = cvs.height/DPR;
      grid = Array.from({length: rows}, () => Array.from({length: cols}, () => Math.random()<0.5?1:0));
    };
    g.update = dt => {
      if (paused) return;
      // click-like with keyboard: toggle random row per Space (demo logic)
      if (keys.has('Space')) {
        const r = Math.floor(Math.random()*rows);
        for(let c=0;c<cols;c++){ grid[r][c] = 1 - grid[r][c]; }
        // score when full row
        if (grid[r].every(v=>v===1)){ g.score += 8; grid[r] = Array(cols).fill(0); }
      }
    };
    g.draw = () => {
      clearBG(); neonText('MARIO YOSHI — Ultra 3D RTX', W/2, 24, 18);
      const ox = (W - cols*cell)/2, oy = 50;
      for(let y=0;y<rows;y++) for(let x=0;x<cols;x++){
        if(grid[y][x]) neonRect(ox + x*cell, oy + y*cell, cell-4, cell-4, 'rgba(255,123,240,0.9)','rgba(255,123,240,0.95)');
        else neonRect(ox + x*cell, oy + y*cell, cell-4, cell-4, 'rgba(90,240,255,0.3)','rgba(90,240,255,0.35)');
      }
    };
    g.action = () => { paused = false; };
    return g;
  })();

  // ===== 19) Yoshi Cookie (swap match) =====
  const ycookie = (() => {
    const g = makeBase(); g.bestKey='best_ycookie';
    let W,H, grid=[], cols=7, rows=7, cell=36, cursor={x:3,y:3};
    g.init = () => {
      W = cvs.width/DPR; H = cvs.height/DPR;
      grid = Array.from({length: rows}, () => Array.from({length: cols}, () => 1 + Math.floor(Math.random()*3)));
    };
    function swap(ax,ay,bx,by){ const t=grid[ay][ax]; grid[ay][ax]=grid[by][bx]; grid[by][bx]=t; }
    function clearMatches(){
      let cleared = 0;
      // horizontal
      for(let y=0;y<rows;y++){
        for(let x=0;x<cols-2;x++){
          if(grid[y][x]===grid[y][x+1] && grid[y][x]===grid[y][x+2]){
            grid[y][x]=grid[y][x+1]=grid[y][x+2]=0; cleared += 3;
          }
        }
      }
      // gravity
      for(let x=0;x<cols;x++){
        let col = [];
        for(let y=0;y<rows;y++) if(grid[y][x]) col.push(grid[y][x]);
        while(col.length<rows) col.unshift(0);
        for(let y=0;y<rows;y++) grid[y][x] = col[y] || (1 + Math.floor(Math.random()*3));
      }
      if(cleared) g.score += cleared;
    }
    g.update = dt => {
      if (paused) return;
      if ((keys.has('ArrowLeft')||keys.has('KeyA')) && cursor.x>0) cursor.x--;
      if ((keys.has('ArrowRight')||keys.has('KeyD')) && cursor.x<cols-1) cursor.x++;
      if ((keys.has('ArrowUp')||keys.has('KeyW')) && cursor.y>0) cursor.y--;
      if ((keys.has('ArrowDown')||keys.has('KeyS')) && cursor.y<rows-1) cursor.y++;
      if (keys.has('Space')){
        const bx = Math.min(cols-1, cursor.x+1), by = cursor.y;
        swap(cursor.x, cursor.y, bx, by);
        clearMatches();
      }
    };
    g.draw = () => {
      clearBG(); neonText('YOSHI COOKIE — Ultra 3D RTX', W/2, 24, 18);
      const ox = (W - cols*cell)/2, oy = 60;
      for(let y=0;y<rows;y++) for(let x=0;x<cols;x++){
        const c = grid[y][x] ? 'rgba(90,240,255,0.85)' : 'rgba(90,240,255,0.25)';
        neonRect(ox + x*cell, oy + y*cell, cell-6, cell-6, c, c);
      }
      // cursor highlight
      line(ox + cursor.x*cell, oy + cursor.y*cell, ox + (cursor.x+1)*cell, oy + cursor.y*cell, 'rgba(255,123,240,0.9)');
      line(ox + cursor.x*cell, oy + (cursor.y+1)*cell, ox + (cursor.x+1)*cell, oy + (cursor.y+1)*cell, 'rgba(255,123,240,0.9)');
      line(ox + cursor.x*cell, oy + cursor.y*cell, ox + cursor.x*cell, oy + (cursor.y+1)*cell, 'rgba(255,123,240,0.9)');
      line(ox + (cursor.x+1)*cell, oy + cursor.y*cell, ox + (cursor.x+1)*cell, oy + (cursor.y+1)*cell, 'rgba(255,123,240,0.9)');
    };
    g.action = () => { paused = false; };
    return g;
  })();
  
  // ===== 20) Bubble Shooter =====
  const bubbleshooter = (() => {
    const g = makeBase(); g.bestKey = 'best_bubbleshooter';
    let W,H, grid=[], rows=10, cols=12, cell=34, shooter, bubble=null, colors, topOffset=70, speed=9;
    function newBubble(){ bubble = { x: W/2, y: H-80, r: 12, vx: 0, vy: 0, color: colors[Math.floor(Math.random()*colors.length)] }; }
    function gridPos(x,y){ const gx = Math.floor((x - (W - cols*cell)/2)/cell), gy = Math.floor((y - topOffset)/cell); return {gx,gy}; }
    function snapBubble(b){
      const {gx,gy} = gridPos(b.x,b.y);
      if (gx>=0 && gx<cols && gy>=0 && gy<rows){
        if(!grid[gy][gx]){ grid[gy][gx] = b.color; bubble = null; checkMatches(gx,gy); }
      }
    }
    function neighbors(x,y){
      const ns = [[1,0],[-1,0],[0,1],[0,-1]];
      return ns.map(([dx,dy]) => ({x:x+dx,y:y+dy})).filter(p => p.x>=0 && p.x<cols && p.y>=0 && p.y<rows);
    }
    function checkMatches(x,y){
      const color = grid[y][x]; if(!color) return;
      const stack=[{x,y}], seen=new Set([`${x},${y}`]), group=[];
      while(stack.length){
        const p=stack.pop(); group.push(p);
        neighbors(p.x,p.y).forEach(n=>{
          if(!seen.has(`${n.x},${n.y}`)&&grid[n.y][n.x]===color){seen.add(`${n.x},${n.y}`);stack.push(n);}
        });
      }
      if(group.length>=3){ group.forEach(p=> grid[p.y][p.x]=0); g.score += group.length; dropFloating(); }
    }
    function dropFloating(){
      // mark connected to top
      const visited = Array.from({length: rows}, () => Array(cols).fill(false));
      const stack = [];
      for(let x=0;x<cols;x++){ if(grid[0][x]){ stack.push({x,y:0}); visited[0][x]=true; } }
      while(stack.length){
        const p = stack.pop();
        neighbors(p.x,p.y).forEach(n=>{
          if(grid[n.y][n.x] && !visited[n.y][n.x]){ visited[n.y][n.x]=true; stack.push(n); }
        });
      }
      // drop not visited
      for(let y=0;y<rows;y++) for(let x=0;x<cols;x++){ if(grid[y][x] && !visited[y][x]){ grid[y][x]=0; } }
    }
    g.init = () => {
      W = cvs.width/DPR; H = cvs.height/DPR;
      colors = ['rgba(90,240,255,0.95)','rgba(255,123,240,0.95)','rgba(230,246,255,0.95)','rgba(255,180,80,0.95)'];
      grid = Array.from({length: rows}, (_,r) => Array.from({length: cols}, () => r<3 ? colors[Math.floor(Math.random()*colors.length)] : 0));
      shooter = { angle: 0 };
      newBubble();
    };
    g.update = dt => {
      if (paused) return;
      // aim
      const left = keys.has('ArrowLeft')||keys.has('KeyA');
      const right = keys.has('ArrowRight')||keys.has('KeyD');
      if (left) shooter.angle -= 0.06;
      if (right) shooter.angle += 0.06;
      shooter.angle = Math.max(-1.2, Math.min(1.2, shooter.angle));
      // shoot
      if (keys.has('Space') && bubble && bubble.vx===0 && bubble.vy===0){
        bubble.vx = Math.cos(shooter.angle) * speed;
        bubble.vy = -Math.sin(-shooter.angle) * speed; // angle up
      }
      if (bubble){
        bubble.x += bubble.vx; bubble.y += bubble.vy;
        const leftWall = (W - cols*cell)/2, rightWall = leftWall + cols*cell;
        if (bubble.x - bubble.r < leftWall || bubble.x + bubble.r > rightWall) bubble.vx *= -1;
        if (bubble.y - bubble.r < topOffset) { snapBubble(bubble); newBubble(); }
        // collision with existing bubbles
        for(let y=0;y<rows;y++){
          for(let x=0;x<cols;x++){
            if(grid[y][x]){
              const cx = (W - cols*cell)/2 + x*cell + cell/2;
              const cy = topOffset + y*cell + cell/2;
              if (Math.hypot(bubble.x - cx, bubble.y - cy) < bubble.r + cell*0.45){
                snapBubble(bubble); newBubble(); y=rows; break;
              }
            }
          }
        }
      }
      g.score += dt * 2;
    };
    g.draw = () => {
      clearBG();
      neonText('BUBBLE SHOOTER — Ultra 3D RTX', W/2, 24, 18);
      const ox = (W - cols*cell)/2;
      for(let y=0;y<rows;y++){
        for(let x=0;x<cols;x++){
          const c = grid[y][x];
          if(c){
            ctx.save(); ctx.shadowColor=c; ctx.shadowBlur=14; ctx.fillStyle=c;
            const cx = ox + x*cell + cell/2, cy = topOffset + y*cell + cell/2;
            ctx.beginPath(); ctx.arc(Math.floor(cx)+0.5, Math.floor(cy)+0.5, cell*0.42, 0, Math.PI*2); ctx.fill(); ctx.restore();
          }
        }
      }
      // shooter
      const sx = W/2, sy = H-80;
      line(sx, sy, sx + Math.cos(shooter.angle)*40, sy - Math.sin(-shooter.angle)*40, 'rgba(255,123,240,0.9)');
      if (bubble){
        ctx.save(); ctx.shadowColor=bubble.color; ctx.shadowBlur=16; ctx.fillStyle=bubble.color;
        ctx.beginPath(); ctx.arc(Math.floor(bubble.x)+0.5, Math.floor(bubble.y)+0.5, bubble.r, 0, Math.PI*2); ctx.fill(); ctx.restore();
      }
    };
    g.action = () => { paused = false; };
    return g;
  })();

  // ===== 21) Block Puzzle (drag-drop pieces ke grid) =====
  const blockpuzzle = (() => {
    const g = makeBase(); g.bestKey='best_blockpuzzle';
    let W,H, cols=10, rows=10, cell=30, grid=[], bank=[], holding=null, ox, oy;
    function newBank(){
      bank = [
        [[1,1,1]], [[1],[1],[1]], [[1,1],[1,1]], [[1,1,1],[0,1,0]], [[1,1,0],[0,1,1]]
      ];
    }
    g.init = () => {
      W = cvs.width/DPR; H = cvs.height/DPR;
      grid = Array.from({length: rows}, () => Array(cols).fill(0));
      newBank(); holding=null; ox=(W - cols*cell)/2; oy=60;
    };
    function canPlace(px,py,shape){
      for(let y=0;y<shape.length;y++) for(let x=0;x<shape[y].length;x++){
        if(shape[y][x]){
          const gx=px+x, gy=py+y;
          if(gx<0||gy<0||gx>=cols||gy>=rows||grid[gy][gx]) return false;
        }
      }
      return true;
    }
    function place(px,py,shape){
      for(let y=0;y<shape.length;y++) for(let x=0;x<shape[y].length;x++){
        if(shape[y][x]) grid[py+y][px+x]=1;
      }
      // clear lines
      for(let y=rows-1;y>=0;y--){
        if(grid[y].every(v=>v)){ grid.splice(y,1); grid.unshift(Array(cols).fill(0)); g.score+=10; y++; }
      }
    }
    g.update = dt => {
      if (paused) return;
      // pick piece
      if (!holding && keys.has('Space')) holding = bank[Math.floor(Math.random()*bank.length)];
      // rotate
      if (holding && keys.has('ArrowUp')) holding = holding[0].map((_,i)=>holding.map(r=>r[i])).reverse();
      // move cursor with arrows (simulate drag)
      const cx = Math.floor((cols/2) + (keys.has('ArrowRight') - keys.has('ArrowLeft')));
      const cy = Math.floor(rows/2 + (keys.has('ArrowDown') - keys.has('ArrowUp')));
      // place with X
      if (holding && keys.has('KeyX')){
        const px = cx, py = cy;
        if (canPlace(px,py,holding)){ place(px,py,holding); holding=null; g.score+=3; }
      }
    };
    g.draw = () => {
      clearBG(); neonText('BLOCK PUZZLE — Ultra 3D RTX', W/2, 24, 18);
      // grid
      for(let y=0;y<rows;y++) for(let x=0;x<cols;x++){
        const c = grid[y][x] ? 'rgba(90,240,255,0.85)' : 'rgba(90,240,255,0.25)';
        neonRect(ox + x*cell, oy + y*cell, cell-2, cell-2, c, c);
      }
      // holding
      if (holding){
        const cx = Math.floor(cols/2), cy = Math.floor(rows/2);
        for(let y=0;y<holding.length;y++) for(let x=0;x<holding[y].length;x++){
          if(holding[y][x]) neonRect(ox + (cx+x)*cell, oy + (cy+y)*cell, cell-2, cell-2, 'rgba(255,123,240,0.9)','rgba(255,123,240,0.95)');
        }
      }
    };
    g.action = () => { paused = false; };
    return g;
  })();

  // ===== 22) Endless Match (match-3 tanpa batas) =====
  const endlessmatch = (() => {
    const g = makeBase(); g.bestKey='best_endlessmatch';
    let W,H, cols=8, rows=8, cell=36, grid=[], cursor={x:3,y:3};
    g.init = () => {
      W = cvs.width/DPR; H = cvs.height/DPR;
      grid = Array.from({length: rows}, () => Array.from({length: cols}, () => 1 + Math.floor(Math.random()*4)));
    };
    function swap(ax,ay,bx,by){ const t=grid[ay][ax]; grid[ay][ax]=grid[by][bx]; grid[by][bx]=t; }
    function clearMatches(){
      let cleared=0;
      // horizontal
      for(let y=0;y<rows;y++) for(let x=0;x<cols-2;x++){
        const v=grid[y][x]; if(v&&grid[y][x+1]===v&&grid[y][x+2]===v){ grid[y][x]=grid[y][x+1]=grid[y][x+2]=0; cleared+=3; }
      }
      // vertical
      for(let x=0;x<cols;x++) for(let y=0;y<rows-2;y++){
        const v=grid[y][x]; if(v&&grid[y+1][x]===v&&grid[y+2][x]===v){ grid[y][x]=grid[y+1][x]=grid[y+2][x]=0; cleared+=3; }
      }
      // gravity + refill
      for(let x=0;x<cols;x++){
        const col=[]; for(let y=0;y<rows;y++) if(grid[y][x]) col.push(grid[y][x]);
        while(col.length<rows) col.unshift(0);
        for(let y=0;y<rows;y++) grid[y][x] = col[y] || (1 + Math.floor(Math.random()*4));
      }
      if (cleared) g.score += cleared;
    }
    g.update = dt => {
      if (paused) return;
      if ((keys.has('ArrowLeft')||keys.has('KeyA')) && cursor.x>0) cursor.x--;
      if ((keys.has('ArrowRight')||keys.has('KeyD')) && cursor.x<cols-1) cursor.x++;
      if ((keys.has('ArrowUp')||keys.has('KeyW')) && cursor.y>0) cursor.y--;
      if ((keys.has('ArrowDown')||keys.has('KeyS')) && cursor.y<rows-1) cursor.y++;
      if (keys.has('Space')){ const bx = Math.min(cols-1, cursor.x+1), by = cursor.y; swap(cursor.x,cursor.y,bx,by); clearMatches(); }
      g.score += dt * 2;
    };
    g.draw = () => {
      clearBG(); neonText('ENDLESS MATCH — Ultra 3D RTX', W/2, 24, 18);
      const ox = (W - cols*cell)/2, oy = 60;
      for(let y=0;y<rows;y++) for(let x=0;x<cols;x++){
        const color = ['rgba(90,240,255,0.85)','rgba(255,123,240,0.85)','rgba(230,246,255,0.95)','rgba(255,180,80,0.85)'][grid[y][x]-1];
        neonRect(ox + x*cell, oy + y*cell, cell-6, cell-6, color, color);
      }
      // cursor
      line(ox + cursor.x*cell, oy + cursor.y*cell, ox + (cursor.x+1)*cell, oy + cursor.y*cell, 'rgba(255,123,240,0.9)');
      line(ox + cursor.x*cell, oy + (cursor.y+1)*cell, ox + (cursor.x+1)*cell, oy + (cursor.y+1)*cell, 'rgba(255,123,240,0.9)');
      line(ox + cursor.x*cell, oy + cursor.y*cell, ox + cursor.x*cell, oy + (cursor.y+1)*cell, 'rgba(255,123,240,0.9)');
      line(ox + (cursor.x+1)*cell, oy + cursor.y*cell, ox + (cursor.x+1)*cell, oy + (cursor.y+1)*cell, 'rgba(255,123,240,0.9)');
    };
    g.action = () => { paused = false; };
    return g;
  })();

  // ===== 23) Memory Sounds (Simon-like dengan audio) =====
  const memorysounds = (() => {
    const g = makeBase(); g.bestKey='best_memorysounds';
    let W,H, pads=[], seq=[], input=[], playing=false, t=0, pointer=0;
    // WebAudio untuk suara tajam
    const ctxAudio = new (window.AudioContext || window.webkitAudioContext)();
    function beep(freq, dur=0.25){
      const osc = ctxAudio.createOscillator();
      const gain = ctxAudio.createGain();
      osc.type = 'sine'; osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, ctxAudio.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.15, ctxAudio.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctxAudio.currentTime + dur);
      osc.connect(gain); gain.connect(ctxAudio.destination);
      osc.start(); osc.stop(ctxAudio.currentTime + dur);
    }
    function addStep(){ seq.push(Math.floor(Math.random()*4)); }
    g.init = () => {
      W = cvs.width/DPR; H = cvs.height/DPR;
      pads = [
        { x: W/2 - 140, y: 120, w: 120, h: 120, color:'rgba(90,240,255,0.9)', freq: 440 },
        { x: W/2 + 20,  y: 120, w: 120, h: 120, color:'rgba(255,123,240,0.9)', freq: 550 },
        { x: W/2 - 140, y: 260, w: 120, h: 120, color:'rgba(230,246,255,0.95)', freq: 660 },
        { x: W/2 + 20,  y: 260, w: 120, h: 120, color:'rgba(255,180,80,0.9)', freq: 770 },
      ];
      seq=[]; input=[]; addStep(); playing=true; t=0; pointer=0;
    };
    g.update = dt => {
      if (paused) return;
      if (playing){
        t += dt;
        // play sequence dengan interval
        if (t > 0.6){
          t = 0;
          const idx = seq[pointer];
          const p = pads[idx];
          beep(p.freq, 0.22);
          pointer++;
          if (pointer >= seq.length){ playing=false; pointer=0; }
        }
      } else {
        // user input: WASD/Arrow keys untuk pilih pad, Space untuk submit satu tone
        let sel = -1;
        if (keys.has('ArrowUp')||keys.has('KeyW')) sel = 0;
        else if (keys.has('ArrowRight')||keys.has('KeyD')) sel = 1;
        else if (keys.has('ArrowLeft')||keys.has('KeyA')) sel = 2;
        else if (keys.has('ArrowDown')||keys.has('KeyS')) sel = 3;
        if (sel>=0 && keys.has('Space')){
          input.push(sel);
          beep(pads[sel].freq, 0.18);
          const i = input.length - 1;
          if (input[i] !== seq[i]){
            paused = true; statusEl.textContent='Game Over'; g.setBest(Math.max(g.best(), g.score));
          } else if (input.length === seq.length){
            g.score += seq.length;
            addStep(); input=[]; playing=true; t=0; pointer=0;
          }
        }
      }
    };
    g.draw = () => {
      clearBG(); neonText('MEMORY SOUNDS — Ultra 3D RTX', W/2, 24, 18);
      pads.forEach((p,i)=>{
        const glow = playing && i===seq[Math.min(pointer,seq.length-1)] ? 'rgba(255,255,255,0.9)' : p.color;
        neonRect(p.x, p.y, p.w, p.h, glow, p.color);
      });
      neonText(playing ? 'Dengarkan dan hafalkan nada' : 'Masukkan urutan dengan Space', W/2, H-40, 16);
    };
    g.action = () => { paused = false; };
    return g;
  })();
  
  // ===== 24) Endless Memory Match =====
  const endlessmemory = (() => {
    const g = makeBase(); g.bestKey='best_endlessmemory';
    let W,H, cards=[], flipped=[], matched=0;
    const ctxAudio = new (window.AudioContext||window.webkitAudioContext)();
    function flipSound(){
      const osc=ctxAudio.createOscillator(); const gain=ctxAudio.createGain();
      osc.type='square'; osc.frequency.value=600;
      gain.gain.setValueAtTime(0.0001, ctxAudio.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.2, ctxAudio.currentTime+0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctxAudio.currentTime+0.25);
      osc.connect(gain); gain.connect(ctxAudio.destination);
      osc.start(); osc.stop(ctxAudio.currentTime+0.25);
    }
    function newDeck(){
      const values=[]; for(let i=0;i<8;i++){ values.push(i,i); }
      values.sort(()=>Math.random()-0.5);
      cards=values.map((v,i)=>({val:v,flip:false,match:false,x:0,y:0}));
      const cols=4, rows=4, cell=80;
      W=cvs.width/DPR; H=cvs.height/DPR;
      const ox=(W-cols*cell)/2, oy=80;
      cards.forEach((c,i)=>{ c.x=ox+(i%cols)*cell; c.y=oy+Math.floor(i/cols)*cell; });
      flipped=[]; matched=0;
    }
    g.init=()=>{ newDeck(); };
    g.update=dt=>{
      if(paused) return;
      // kontrol: panah untuk pilih index, Space untuk flip
      if(keys.has('Space')){
        const idx=Math.floor(Math.random()*cards.length);
        const c=cards[idx];
        if(!c.flip&&!c.match){
          c.flip=true; flipped.push(c); flipSound();
          if(flipped.length===2){
            if(flipped[0].val===flipped[1].val){
              flipped[0].match=flipped[1].match=true; g.score+=5; matched+=2;
            } else {
              flipped[0].flip=flipped[1].flip=false;
            }
            flipped=[];
          }
        }
      }
      if(matched===cards.length){ newDeck(); }
    };
    g.draw=()=>{
      clearBG(); neonText('ENDLESS MEMORY MATCH — Ultra 3D RTX', W/2, 24, 18);
      cards.forEach(c=>{
        if(c.match){ neonRect(c.x,c.y,70,70,'rgba(90,240,255,0.9)','rgba(90,240,255,0.95)'); }
        else if(c.flip){ neonText(String(c.val),c.x+35,c.y+35,20); }
        else { neonRect(c.x,c.y,70,70,'rgba(255,123,240,0.9)','rgba(255,123,240,0.95)'); }
      });
    };
    g.action=()=>{paused=false;};
    return g;
  })();

  // ===== 25) Galaxy Shooter =====
  const galaxy = (() => {
    const g=makeBase(); g.bestKey='best_galaxy';
    let W,H, ship, bullets=[], foes=[], cooldown=0, spawnT=0;
    g.init=()=>{
      W=cvs.width/DPR; H=cvs.height/DPR;
      ship={x:W/2,y:H-60,w:30,h:20};
      bullets=[]; foes=[]; cooldown=0; spawnT=0;
    };
    g.update=dt=>{
      if(paused) return;
      if(keys.has('ArrowLeft')||keys.has('KeyA')) ship.x-=4;
      if(keys.has('ArrowRight')||keys.has('KeyD')) ship.x+=4;
      ship.x=Math.max(20,Math.min(W-20,ship.x));
      cooldown=Math.max(0,cooldown-dt);
      if(keys.has('Space')&&cooldown===0){
        bullets.push({x:ship.x,y:ship.y-10,v: -6});
        cooldown=0.2;
      }
      bullets.forEach(b=>b.y+=b.v);
      bullets=bullets.filter(b=>b.y>-20);
      spawnT+=dt;
      if(spawnT>0.8){ spawnT=0; foes.push({x:Math.random()*W,y:40,v:2}); }
      foes.forEach(f=>f.y+=f.v);
      foes=foes.filter(f=>f.y<H+20);
      bullets.forEach(b=>{
        foes.forEach(f=>{
          if(Math.abs(b.x-f.x)<20&&Math.abs(b.y-f.y)<20){ f.y=H+999; b.y=-999; g.score+=2; }
        });
      });
      foes.forEach(f=>{
        if(Math.abs(ship.x-f.x)<20&&Math.abs(ship.y-f.y)<20){
          paused=true; statusEl.textContent='Game Over'; g.setBest(Math.max(g.best(),g.score));
        }
      });
    };
    g.draw=()=>{
      clearBG(); neonText('GALAXY SHOOTER — Ultra 3D RTX',W/2,24,18);
      neonRect(ship.x-15,ship.y-10,30,20,'rgba(255,123,240,0.9)','rgba(255,123,240,0.95)');
      bullets.forEach(b=>neonRect(b.x-3,b.y-6,6,12,'rgba(230,246,255,0.95)','rgba(230,246,255,0.95)'));
      foes.forEach(f=>neonRect(f.x-12,f.y-12,24,24,'rgba(90,240,255,0.85)','rgba(90,240,255,0.95)'));
    };
    g.action=()=>{paused=false;};
    return g;
  })();
  
  // ===== 26) Endless Dots Connect =====
  const dotsconnect = (() => {
    const g = makeBase(); g.bestKey='best_dotsconnect';
    let W,H, dots=[], cursor={x:0,y:0}, path=[];
    g.init=()=>{
      W=cvs.width/DPR; H=cvs.height/DPR;
      dots=[]; for(let i=0;i<20;i++){ dots.push({x:Math.random()*W,y:Math.random()*H,used:false}); }
      cursor={x:W/2,y:H/2}; path=[];
    };
    g.update=dt=>{
      if(paused) return;
      if(keys.has('ArrowLeft')||keys.has('KeyA')) cursor.x-=4;
      if(keys.has('ArrowRight')||keys.has('KeyD')) cursor.x+=4;
      if(keys.has('ArrowUp')||keys.has('KeyW')) cursor.y-=4;
      if(keys.has('ArrowDown')||keys.has('KeyS')) cursor.y+=4;
      cursor.x=Math.max(20,Math.min(W-20,cursor.x));
      cursor.y=Math.max(20,Math.min(H-20,cursor.y));
      dots.forEach(d=>{
        if(!d.used && Math.hypot(cursor.x-d.x,cursor.y-d.y)<16){
          d.used=true; path.push({x:d.x,y:d.y}); g.score+=2;
        }
      });
      if(path.length===dots.length){ // reset deck
        g.score+=10; g.init();
      }
    };
    g.draw=()=>{
      clearBG(); neonText('ENDLESS DOTS CONNECT — Ultra 3D RTX',W/2,24,18);
      dots.forEach(d=>{
        const c=d.used?'rgba(255,123,240,0.9)':'rgba(90,240,255,0.9)';
        ctx.save(); ctx.shadowColor=c; ctx.shadowBlur=12; ctx.fillStyle=c;
        ctx.beginPath(); ctx.arc(Math.floor(d.x)+0.5,Math.floor(d.y)+0.5,8,0,Math.PI*2); ctx.fill(); ctx.restore();
      });
      if(path.length>1){
        ctx.strokeStyle='rgba(230,246,255,0.95)'; ctx.lineWidth=3; ctx.beginPath();
        ctx.moveTo(path[0].x,path[0].y); for(let i=1;i<path.length;i++) ctx.lineTo(path[i].x,path[i].y);
        ctx.stroke();
      }
      neonRect(cursor.x-6,cursor.y-6,12,12,'rgba(255,255,0,0.9)','yellow');
    };
    g.action=()=>{paused=false;};
    return g;
  })();

  // ===== 27) Endless Pipe Mania =====
  const pipemania = (() => {
    const g=makeBase(); g.bestKey='best_pipemania';
    let W,H, grid=[], cols=8, rows=8, cell=50, flow=[], pointer=0;
    function newGrid(){
      grid=Array.from({length:rows},()=>Array.from({length:cols},()=>Math.floor(Math.random()*4)));
      flow=[{x:0,y:Math.floor(rows/2)}]; pointer=0;
    }
    g.init=()=>{ W=cvs.width/DPR; H=cvs.height/DPR; newGrid(); };
    g.update=dt=>{
      if(paused) return;
      // rotate pipe at cursor with Space
      const cx=Math.floor(cols/2), cy=Math.floor(rows/2);
      if(keys.has('Space')) grid[cy][cx]=(grid[cy][cx]+1)%4;
      // simulate flow
      pointer+=dt*2;
      if(pointer>=1){
        pointer=0;
        const head=flow[flow.length-1];
        let dir=grid[head.y][head.x];
        let nx=head.x, ny=head.y;
        if(dir===0) nx++; else if(dir===1) ny++; else if(dir===2) nx--; else if(dir===3) ny--;
        if(nx<0||ny<0||nx>=cols||ny>=rows){ paused=true; statusEl.textContent='Game Over'; g.setBest(Math.max(g.best(),g.score)); }
        else { flow.push({x:nx,y:ny}); g.score+=1; }
      }
    };
    g.draw=()=>{
      clearBG(); neonText('ENDLESS PIPE MANIA — Ultra 3D RTX',W/2,24,18);
      const ox=(W-cols*cell)/2, oy=60;
      for(let y=0;y<rows;y++) for(let x=0;x<cols;x++){
        const dir=grid[y][x]; const cx=ox+x*cell, cy=oy+y*cell;
        neonRect(cx,cy,cell-4,cell-4,'rgba(90,240,255,0.6)','rgba(90,240,255,0.3)');
        ctx.save(); ctx.strokeStyle='rgba(255,123,240,0.9)'; ctx.lineWidth=4;
        ctx.beginPath(); ctx.moveTo(cx+cell/2,cy+cell/2);
        if(dir===0) ctx.lineTo(cx+cell,cy+cell/2);
        if(dir===1) ctx.lineTo(cx+cell/2,cy+cell);
        if(dir===2) ctx.lineTo(cx,cy+cell/2);
        if(dir===3) ctx.lineTo(cx+cell/2,cy);
        ctx.stroke(); ctx.restore();
      }
      flow.forEach(f=>{
        neonRect(ox+f.x*cell+cell/4,oy+f.y*cell+cell/4,cell/2,cell/2,'rgba(255,255,0,0.9)','yellow');
      });
    };
    g.action=()=>{paused=false;};
    return g;
  })();
  
  // Switcher
  const games = { snake, breakout, invaders, pong, flappy, dino, doodle, pacman, commander, mario, excitecar, dkong, dkjr, dk3,
     wrecking, tetris, drmario, yoshi, ycookie, bubbleshooter, blockpuzzle, endlessmatch, memorysounds, endlessmemory, galaxy, dotsconnect, pipemania };
  let current = games[document.getElementById('gamePicker').value];
  function switchGame(name){
    current = games[name]; current.reset(); updateHUD();
  }
  function updateHUD(){
    scoreEl.textContent = current.score|0;
    bestEl.textContent = current.best();
  }

  // Loop
  let last = performance.now();
  function loop(now){
    const dt = Math.min(0.033, (now-last)/1000); last = now;
    current.update(dt);
    current.draw();
    current.score = current.score||0;
    scoreEl.textContent = current.score|0;
    bestEl.textContent = current.best();
    requestAnimationFrame(loop);
  }
  Object.values(games).forEach(g=>g.reset());
  current.reset();
  requestAnimationFrame(loop);
})();
