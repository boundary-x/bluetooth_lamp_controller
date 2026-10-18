export const clamp = (n, lo = 0, hi = 255) => Math.min(hi, Math.max(lo, Number(n) || 0));
export const rgb = a => a.map(n => Math.round(clamp(n)));
export const packet = a => rgb(a).map((n,i) => 'RGB'[i] + String(n).padStart(3,'0')).join('') + '\n';
export const mix = (a,b,t) => a.map((v,i) => v+(b[i]-v)*clamp(t,0,1));
export const scale = (a,v) => rgb(a.map(n=>n*v));
export const fromHex = h => [1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
export const toHex = a => '#' + rgb(a).map(n=>n.toString(16).padStart(2,'0')).join('');
export function hsv(h,s,v=1){
  h=((h%360)+360)%360/60;const c=v*s,x=c*(1-Math.abs(h%2-1)),m=v-c;
  const a=h<1?[c,x,0]:h<2?[x,c,0]:h<3?[0,c,x]:h<4?[0,x,c]:h<5?[x,0,c]:[c,0,x];return rgb(a.map(n=>(n+m)*255));
}
export function effect(name,t,color){
  const wave=(Math.sin(t*2*Math.PI)+1)/2;
  const noise=(Math.sin(t*7.31)+Math.sin(t*13.7+2)+Math.sin(t*3.19+1))/6+.5;
  switch(name){
    case 'breath':return scale(color,.04+.96*(.5-.5*Math.cos(t*2*Math.PI/4)));
    case 'candle':return scale(mix([255,65,0],[255,170,25],noise),.48+.52*noise);
    case 'lava':return rgb(mix([85,0,0],[255,110,0],(Math.sin(t*.7)+Math.sin(t*.31)+2)/4));
    case 'ocean':return scale(mix([0,30,180],[0,220,185],(Math.sin(t*.6)+1)/2),.35+.65*(Math.sin(t*1.4)+1)/2);
    case 'rainbow':return hsv(t*30,1);
    case 'firefly':return scale(color,Math.pow(wave,8));
    default:return color;
  }
}
export function flowFrame(steps,seconds,initial,loop){
  const total=steps.reduce((s,x)=>s+x.fade+x.hold,0);
  if(!steps.length||total<=0)return {color:initial,index:0,done:true};
  if(!loop&&seconds>=total)return {color:fromHex(steps.at(-1).color),index:steps.length-1,done:true};
  const cycle=Math.floor(seconds/total);let t=seconds%total,prev=cycle>0?fromHex(steps.at(-1).color):initial;
  for(let i=0;i<steps.length;i++){const s=steps[i],next=fromHex(s.color);if(t<s.fade+s.hold)return {color:t<s.fade?mix(prev,next,t/s.fade):next,index:i,done:false};t-=s.fade+s.hold;prev=next;}
  return {color:prev,index:steps.length-1,done:false};
}
export function validateFlow(data){
  if(data?.format!=='boundaryx-color-flow'||data.version!==1||!Array.isArray(data.steps)||!data.steps.length||data.steps.length>30||typeof data.loop!=='boolean')throw Error('지원하는 색상 흐름 파일이 아닙니다.');
  return {loop:data.loop,steps:data.steps.map(s=>{if(!/^#[0-9a-f]{6}$/i.test(s.color)||![s.fade,s.hold].every(n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=60)||s.fade+s.hold<.1)throw Error('색상 또는 시간 값이 올바르지 않습니다.');return {color:s.color,fade:s.fade,hold:s.hold};})};
}
// Single writer: replace obsolete frames rather than queueing an animation backlog.
export class LatestWriter {
  constructor(write,onSent,onError){this.write=write;this.onSent=onSent;this.onError=onError;this.pending=null;this.busy=false;this.closed=false;}
  close(){this.closed=true;this.pending=null;}
  async send(value){this.pending=value;if(this.busy||this.closed)return;this.busy=true;try{while(this.pending!==null&&!this.closed){const p=this.pending;this.pending=null;await this.write(p);if(!this.closed)this.onSent(p);}}catch(e){this.close();this.onError(e);}finally{this.busy=false;}}
}
