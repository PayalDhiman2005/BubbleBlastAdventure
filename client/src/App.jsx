import React,{useEffect,useMemo,useRef,useState} from 'react';
import Auth from './auth/Auth';
import {GAME_NAME} from './config/gameConfig';
import {LEVELS,COLORS} from './game/levels';
import {R,STEP,ROW,W,H,center,connected,floating,attach} from './game/engine';
import {Play, Trophy, Star, Target, Pause, RotateCcw, Lightbulb, Bomb, Rainbow, Volume2, VolumeX, Music, Lock, Home, ChevronRight, X, Heart, Sparkles, Medal} from 'lucide-react';


const pick=a=>a[Math.floor(Math.random()*a.length)];
const freshBoard=l=>l.board.map(r=>[...r]);
const colorHex={coral:'#ff647c',blue:'#4d9dff',mint:'#4de0ad',sun:'#ffd45c',violet:'#b68aff',orange:'#ff9b52'};
function App(){
    const [authUser, setAuthUser] = useState(() => {
    try {
        const token = localStorage.getItem('token');
        const user = localStorage.getItem('user');

        return token && user ? JSON.parse(user) : null;
    } catch {
        return null;
    }
});
 const [screen,setScreen]=useState('home'),[level,setLevel]=useState(1),[board,setBoard]=useState(()=>freshBoard(LEVELS[0]));
 const [shots,setShots]=useState(LEVELS[0].shots),[score,setScore]=useState(0),[combo,setCombo]=useState(0),[popped,setPopped]=useState(0);
 const [current,setCurrent]=useState('coral'),[next,setNext]=useState('blue'),[aim,setAim]=useState({x:160,y:100}),[projectile,setProjectile]=useState(null);
 const [status,setStatus]=useState('ready'),[paused,setPaused]=useState(false),[stars,setStars]=useState({}),[unlocked,setUnlocked]=useState(+(localStorage.unlocked||1));
 const [sound,setSound]=useState(localStorage.sound!=='false'),[music,setMusic]=useState(localStorage.music!=='false'),[booster,setBooster]=useState(''),[hint,setHint]=useState(false),[undo,setUndo]=useState(null),[toast,setToast]=useState('Welcome, adventurer!');
 const canvas=useRef(null),anim=useRef(null),audio=useRef(null),aimRef=useRef(null);
 const cfg=LEVELS[level-1]||LEVELS[0];
 const say=t=>{setToast(t);setTimeout(()=>setToast(''),2200)};
 const beep=(f=520,d=.08,type='sine')=>{if(!sound)return;try{const C=window.AudioContext||window.webkitAudioContext;audio.current ||= new C();const o=audio.current.createOscillator(),g=audio.current.createGain();o.type=type;o.frequency.value=f;g.gain.setValueAtTime(.06,audio.current.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.current.currentTime+d);o.connect(g);g.connect(audio.current.destination);o.start();o.stop(audio.current.currentTime+d);}catch{}};
 function start(n){const l=LEVELS[n-1];setLevel(n);setBoard(freshBoard(l));setShots(l.shots);setScore(0);setCombo(0);setPopped(0);setCurrent(pick(l.colors));setNext(pick(l.colors));setStatus('ready');setPaused(false);setBooster('');setHint(false);setUndo(null);setScreen('game');}
 const draw=()=>{
  const cv=canvas.current;if(!cv)return;const ctx=cv.getContext('2d');ctx.clearRect(0,0,W,H);
  // gentle starfield
  for(let i=0;i<32;i++){ctx.fillStyle='rgba(255,255,255,.25)';ctx.beginPath();ctx.arc((i*83)%W,(i*47)%H,1.2,0,Math.PI*2);ctx.fill();}
  board.forEach((row,r)=>row.forEach((v,c)=>{if(!v)return;const p=center(r,c);bubble(ctx,p.x,p.y,v);}));
  if(cfg.rescue && board.flat().filter(Boolean).length<13){ctx.font='26px sans-serif';ctx.fillText('🦊',W/2-13,330);}
  const angle=aimRef.current||aim; if(status==='ready'&&!paused){let dx=angle.x-W/2,dy=angle.y-445;let len=Math.hypot(dx,dy)||1;dx/=len;dy/=len;if(dy>-.15)dy=-.15;let x=W/2,y=445;ctx.setLineDash([4,8]);ctx.strokeStyle='rgba(255,255,255,.62)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x,y);for(let i=0;i<38;i++){x+=dx*9;y+=dy*9;if(x<15||x>W-15){dx*=-1;x=Math.max(15,Math.min(W-15,x));}if(y<20)break;ctx.lineTo(x,y);}ctx.stroke();ctx.setLineDash([]);}
  ctx.fillStyle='rgba(10,20,45,.8)';ctx.beginPath();ctx.arc(W/2,457,28,0,Math.PI*2);ctx.fill();bubble(ctx,W/2,435,current,.88);
  ctx.fillStyle='rgba(255,255,255,.55)';ctx.font='11px sans-serif';ctx.fillText('NEXT',W/2+48,460);bubble(ctx,W/2+68,445,next,.55);
  if(projectile){bubble(ctx,projectile.x,projectile.y,projectile.color);}
 };
 function bubble(ctx,x,y,color,scale=1){const rad=R*scale;ctx.save();ctx.shadowColor=colorHex[color];ctx.shadowBlur=13;const g=ctx.createRadialGradient(x-rad*.35,y-rad*.4,2,x,y,rad);g.addColorStop(0,'#ffffff');g.addColorStop(.18,colorHex[color]);g.addColorStop(1,colorHex[color]);ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,rad,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.strokeStyle='rgba(255,255,255,.65)';ctx.lineWidth=1.5;ctx.stroke();ctx.restore();}
 useEffect(()=>{draw();},[board,aim,current,next,status,paused,projectile,screen]);
 function finish(win){setStatus(win?'won':'lost');if(win){const remaining=shots;const s=remaining>cfg.shots*.55?3:remaining>cfg.shots*.25?2:1;setStars(p=>({...p,[level]:Math.max(p[level]||0,s)}));const u=Math.max(unlocked,Math.min(40,level+1));setUnlocked(u);localStorage.unlocked=u;localStorage.stars=JSON.stringify({...stars,[level]:Math.max(stars[level]||0,s)});beep(780,.3);say(`Level cleared! ${'⭐'.repeat(s)}`);}else{beep(140,.4,'sawtooth');say('Out of shots! Try another strategy.');}}
 function shoot(){
  if(status!=='ready'||paused||shots<=0)return;
  setUndo({board:board.map(r=>[...r]),shots,score,combo,popped,current,next});
  const dx=aim.x-W/2,dy=aim.y-435;let vx=dx/(Math.hypot(dx,dy)||1),vy=dy/(Math.hypot(dx,dy)||1);if(vy>-.15)vy=-.15;
  let x=W/2,y=435,steps=0;while(y>28&&steps++<500){x+=vx*5;y+=vy*5;if(x<18||x>W-18){vx*=-1;x=Math.max(18,Math.min(W-18,x));}let hit=false;for(let r=0;r<board.length&&!hit;r++)for(let c=0;c<8;c++)if(board[r][c]){const p=center(r,c);if(Math.hypot(p.x-x,p.y-y)<R*1.85){hit=true;break;}}if(hit)break;}
  let b=board.map(r=>[...r]);const spot=attach(b,x,y,booster==='rainbow'?'rainbow':booster==='bomb'?'bomb':current);
  if(!spot){say('No room!');return;}
  setStatus('resolving');setShots(v=>v-1);setProjectile({x,y,color:current});
  setTimeout(()=>{
   let gone=[];if(booster==='bomb'){const [r,c]=spot;for(let rr=0;rr<b.length;rr++)for(let cc=0;cc<8;cc++)if(b[rr][cc]&&Math.hypot(center(rr,cc).x-center(r,c).x,center(rr,cc).y-center(r,c).y)<STEP*1.65){gone.push([rr,cc]);b[rr][cc]=null;}}
   else {const color=booster==='rainbow'?current:current;const group=connected(b,...spot,color);if(group.length>=3){gone=group;group.forEach(([r,c])=>b[r][c]=null);}}
   const dropped=floating(b);dropped.forEach(([r,c])=>b[r][c]=null);
   const count=gone.length+dropped.length;setBoard(b);setPopped(p=>p+count);setScore(s=>s+gone.length*20+dropped.length*35+(count>=5?100:0));setCombo(c=>count>=3?c+1:0);setProjectile(null);setCurrent(next);setNext(pick(cfg.colors));setBooster('');
   beep(count>=3?700:360,.12);if(dropped.length)beep(220,.2,'triangle');
   const rescued=cfg.rescue&&b.flat().filter(Boolean).length<8;
   const clear=b.flat().every(v=>!v);
   if(clear||rescued||score+count*20>=cfg.targetScore&&cfg.id%4===0){finish(true);}
   else if(shots-1<=0){finish(false);}else setStatus('ready');
  },360);
 }
 function pointer(e){const rect=canvas.current.getBoundingClientRect();const x=(e.clientX-rect.left)*W/rect.width,y=(e.clientY-rect.top)*H/rect.height;aimRef.current={x,y};setAim({x,y});}
 function doUndo(){if(!undo)return;setBoard(undo.board);setShots(undo.shots);setScore(undo.score);setCombo(undo.combo);setPopped(undo.popped);setCurrent(undo.current);setNext(undo.next);setUndo(null);setStatus('ready');say('Last shot undone');}
 function hintShot(){setHint(true);setAim({x:W/2,y:90});say('Aim for a cluster of matching colors!');setTimeout(()=>setHint(false),2500);}
 const totalStars=Object.values(stars).reduce((a,b)=>a+b,0);
//  return <div className="app-shell">
if (!authUser) {
    return <Auth onAuthenticated={setAuthUser} />;
}

return <div className="app-shell">
  <header className="topbar"><div className="brand" onClick={()=>setScreen('home')}><span className="brand-icon">🫧</span><span>{GAME_NAME}</span></div><nav><button onClick={()=>setScreen('levels')}>Levels</button><button onClick={()=>setScreen('leaderboard')}>Leaderboard</button><button onClick={()=>setScreen('achievements')}>Awards</button></nav><div className="top-stats"><span>⭐ {totalStars}</span><span>🏆 {unlocked-1}/40</span></div></header>
  {screen==='home'&&<main className="hero"><div className="hero-copy"><div className="eyebrow"><Sparkles size={15}/> A POP-TASTIC ADVENTURE</div><h1>Aim. Match.<br/><em>Pop & Rescue.</em></h1><p>Set your sights, connect colorful bubbles and free the little forest friends. Your next big combo is one shot away!</p><div className="hero-actions"><button className="primary" onClick={()=>start(unlocked)}><Play fill="currentColor"/> Play now</button><button className="secondary" onClick={()=>setScreen('levels')}>Choose level <ChevronRight/></button></div><div className="mini-proof"><span>🟣 6 bubble colors</span><span>🌟 40 levels</span><span>🦊 Rescue missions</span></div></div><div className="hero-art"><div className="orbit orbit1"></div><div className="orbit orbit2"></div><div className="mascot">🦊<span>✦</span></div>{['coral','blue','mint','sun','violet','orange','blue','coral','sun'].map((c,i)=><i key={i} className="float-bubble" style={{'--i':i,'--bubble':colorHex[c]}}/>)}<div className="speech">Psst... aim for the big clusters!</div></div></main>}
  {screen==='levels'&&<main className="page"><div className="page-heading"><div><div className="eyebrow">YOUR JOURNEY</div><h1>Pick a level</h1><p>Every pop brings you closer to the next adventure.</p></div><div className="progress-card"><Star/> <b>{totalStars}</b><small>stars collected</small></div></div><div className="level-grid">{LEVELS.map(l=><button key={l.id} disabled={l.id>unlocked} className={`level-tile ${l.id>unlocked?'locked':''}`} onClick={()=>start(l.id)}><span className="level-star">{stars[l.id]?'⭐'.repeat(stars[l.id]):l.id>unlocked?<Lock size={17}/>: '✦'}</span><b>{String(l.id).padStart(2,'0')}</b><small>{l.difficulty}</small></button>)}</div></main>}
  {screen==='game'&&<main className="game-page"><div className="game-side"><button className="back-btn" onClick={()=>setScreen('levels')}><Home size={16}/> Levels</button><div className="level-title"><div className="eyebrow">ADVENTURE {String(level).padStart(2,'0')}</div><h1>Level {level}</h1><span className="difficulty">{cfg.difficulty}</span></div><div className="stat-card"><div><small>YOUR SCORE</small><b>{score.toLocaleString()}</b></div><div><small>SHOTS LEFT</small><b>{shots} <Target size={17}/></b></div><div><small>COMBO</small><b>x{combo}</b></div></div><div className="objective"><span>🎯</span><div><small>MISSION</small><b>{cfg.objective}</b></div></div><div className="booster-box"><h3>Power-ups</h3><div className="boosters"><button className={booster==='bomb'?'selected':''} onClick={()=>{setBooster(booster==='bomb'?'':'bomb');say('Bomb clears nearby bubbles');}}><Bomb/><b>Bomb</b><small>×2</small></button><button className={booster==='rainbow'?'selected':''} onClick={()=>{setBooster(booster==='rainbow'?'':'rainbow');say('Rainbow matches any color');}}><Rainbow/><b>Rainbow</b><small>×1</small></button></div></div><div className="utility"><button onClick={hintShot}><Lightbulb/> Hint</button><button disabled={!undo} onClick={doUndo}><RotateCcw/> Undo</button><button onClick={()=>setPaused(true)}><Pause/> Pause</button></div></div><div className="board-wrap"><div className="board-top"><span>🫧 Match 3 or more</span><span>⭐ {score}</span></div><canvas ref={canvas} width={W} height={H} onPointerMove={pointer} onPointerDown={e=>{pointer(e);if(status==='ready')shoot();}} onTouchMove={pointer}/><div className="board-bottom"><span>DRAG TO AIM · TAP TO SHOOT</span><div className="audio-controls"><button onClick={()=>{setSound(v=>{localStorage.sound=String(!v);return !v})}}>{sound?<Volume2/>:<VolumeX/>}</button><button onClick={()=>{setMusic(v=>{localStorage.music=String(!v);return !v})}}><Music className={!music?'muted':''}/></button></div></div>{toast&&<div className="toast">{toast}</div>}
   {paused&&<div className="overlay"><div className="modal"><button className="close" onClick={()=>setPaused(false)}><X/></button><div className="modal-emoji">⏸️</div><h2>Adventure paused</h2><p>Take a breather, bubble champion.</p><button className="primary full" onClick={()=>setPaused(false)}>Resume</button><button className="secondary full" onClick={()=>start(level)}>Restart level</button><button className="text-btn" onClick={()=>setScreen('levels')}>Exit to levels</button></div></div>}
   {(status==='won'||status==='lost')&&<div className="overlay"><div className="modal"><div className="modal-emoji">{status==='won'?'🎉':'💫'}</div><div className="eyebrow">{status==='won'?'MISSION ACCOMPLISHED':'ONE MORE TRY'}</div><h2>{status==='won'?'Level complete!':'Level failed'}</h2><p>{status==='won'?'You made the forest a little brighter.':'You ran out of shots. You’ve got this!'}</p><div className="result-stats"><span>Score <b>{score}</b></span><span>Popped <b>{popped}</b></span><span>Shots left <b>{Math.max(0,shots-1)}</b></span></div>{status==='won'&&<div className="big-stars">{'⭐'.repeat(Math.max(1,stars[level]||1))}</div>}<button className="primary full" onClick={()=>status==='won'?start(Math.min(40,level+1)):start(level)}>{status==='won'?'Next level':'Try again'} <ChevronRight/></button><button className="secondary full" onClick={()=>setScreen('levels')}>Level select</button></div></div>}
  </div></main>}
  {screen==='leaderboard'&&<main className="page narrow"><div className="eyebrow">THE HALL OF FAME</div><h1>Leaderboard</h1><p>Local adventure rankings. Connect the API to enable global scores.</p><div className="leader-list">{['BubbleFox','PopWizard','StarCatcher','You'].map((n,i)=><div><span>{['🥇','🥈','🥉','🏅'][i]}</span><b>{n}</b><small>{[982450,914820,882100,score][i].toLocaleString()} pts</small></div>)}</div></main>}
  {screen==='achievements'&&<main className="page narrow"><div className="eyebrow">COLLECT THEM ALL</div><h1>Achievements</h1><p>Little milestones on your way to bubble legend status.</p><div className="achievement-grid">{[['First Pop','Pop your first bubble','🫧',popped>0],['Level Explorer','Unlock 5 levels','🧭',unlocked>=5],['Star Collector','Earn 10 stars','⭐',totalStars>=10],['Combo Spark','Make a combo','🔥',combo>=2],['Rescue Ranger','Play a rescue mission','🦊',level%5===0]].map(a=><div className={a[3]?'earned':'locked'}><span>{a[2]}</span><b>{a[0]}</b><small>{a[1]}</small></div>)}</div></main>}
  <footer><span>© 2026 {GAME_NAME}</span><span>Made for curious minds & happy pops ✨</span></footer>
 </div>
}
export default App;
