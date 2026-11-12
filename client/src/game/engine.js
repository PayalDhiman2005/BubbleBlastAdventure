export const R=18, STEP=36, ROW=31.2, W=320, H=510;
export const center=(r,c)=>({x:W/2-(7*STEP)/2+c*STEP+(r%2?STEP/2:0),y:34+r*ROW});
export const neighbors=(r,c)=> r%2===0?[[r,c-1],[r,c+1],[r-1,c-1],[r-1,c],[r+1,c-1],[r+1,c]]:[[r,c-1],[r,c+1],[r-1,c],[r-1,c+1],[r+1,c],[r+1,c+1]];
export function connected(board,r,c,color,seen=new Set()){
 const key=`${r},${c}`; if(seen.has(key)||!board[r]||board[r][c]!==color)return [];
 seen.add(key);let out=[[r,c]];for(const [nr,nc] of neighbors(r,c))out.push(...connected(board,nr,nc,color,seen));return out;
}
export function floating(board){
 const keep=new Set(), stack=[]; board[0]?.forEach((v,c)=>{if(v)stack.push([0,c])});
 while(stack.length){const [r,c]=stack.pop(),k=`${r},${c}`;if(keep.has(k))continue;keep.add(k);for(const [nr,nc] of neighbors(r,c))if(board[nr]?.[nc]&&!keep.has(`${nr},${nc}`))stack.push([nr,nc]);}
 const gone=[];board.forEach((row,r)=>row.forEach((v,c)=>{if(v&&!keep.has(`${r},${c}`))gone.push([r,c]);}));return gone;
}
export function attach(board,x,y,color){
 let best=null,dist=Infinity;
 board.forEach((row,r)=>row.forEach((v,c)=>{if(!v)return;const p=center(r,c),d=Math.hypot(p.x-x,p.y-y);if(d<dist){dist=d;best=[r,c];}}));
 let candidates=[];
 if(best){for(const [r,c] of neighbors(...best))if(r>=0&&r<12&&c>=0&&c<8&&!board[r]?.[c])candidates.push([r,c]);}
 if(!candidates.length){for(let c=0;c<8;c++)if(!board[0][c])candidates.push([0,c]);}
 let spot=candidates.sort((a,b)=>Math.hypot(center(...a).x-x,center(...a).y-y)-Math.hypot(center(...b).x-x,center(...b).y-y))[0];
 if(!spot)return null;const [r,c]=spot;while(board.length<=r)board.push(Array(8).fill(null));board[r][c]=color;return [r,c];
}
