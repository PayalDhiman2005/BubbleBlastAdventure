export const COLORS = ['coral','blue','mint','sun','violet','orange'];
const patterns = [
  ['..RBR..','.BRYRB.','RBYGRBR','.GYBYG.','..RGR..'],
  ['..BGB..','.BYGYB.','GYBRYBG','.RBYBR.','..YGY..'],
  ['..VOV..','.VYOVV.','OVYBOVO','.BYOVB.','..VOV..']
];
const colorMap={R:'coral',B:'blue',G:'mint',Y:'sun',V:'violet',O:'orange','.' : null};
export function makeLevel(n){
  const difficulty=n<=5?'Tutorial':n<=10?'Beginner':n<=20?'Easy':n<=30?'Medium':n<=35?'Hard':'Expert';
  const rows=Math.min(5+Math.floor((n-1)/8),9), cols=8;
  const palette=COLORS.slice(0,Math.min(3+Math.floor((n-1)/7),6));
  const board=[];
  for(let r=0;r<rows;r++){const row=[];for(let c=0;c<cols;c++){
    const edge=(r+c+n)%7, keep=(r*3+c*5+n)%11;
    row.push((r<2 || keep < Math.max(3,9-Math.floor(n/7))) && edge!==0 ? palette[(r*2+c+n)%palette.length] : null);
  } board.push(row);}
  // Ensure a small intentional matchable cluster in the opening rows.
  board[0][2]=palette[0];board[0][3]=palette[0];board[0][4]=palette[1];board[1][2]=palette[0];
  const rescue=n%5===0;
  return {id:n,difficulty,shots:Math.max(13,25-Math.floor(n/4)),colors:palette,board,
    objective:rescue?'Rescue the little buddy':'Clear the bubble field',
    rescue, targetScore:250+n*95, stars:[Math.max(120,220+n*55),Math.max(180,300+n*75),Math.max(250,390+n*95)]};
}
export const LEVELS=Array.from({length:40},(_,i)=>makeLevel(i+1));
