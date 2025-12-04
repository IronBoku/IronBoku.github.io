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

  // 4) Pong vs CPU
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
      clearBG(); neonText('PONG vs CPU — Ultra 3D RTX', (cvs.width/DPR)/2, 24, 18);
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
      clearBG(); neonText('FLAPPY — Ultra 3D RTX', (cvs.width/DPR)/2, 24, 18);
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

  // Switcher
  const games = { snake, breakout, invaders, pong, flappy, dino, doodle };
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
