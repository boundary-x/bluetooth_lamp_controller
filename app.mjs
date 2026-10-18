import {clamp,rgb,packet,mix,scale,fromHex,toHex,hsv,effect,flowFrame,validateFlow,LatestWriter} from './core.mjs';
const $=id=>document.getElementById(id);
let mode='manual',base=[255,128,0],current=scale(base,.5),effectName='breath',state='stopped',elapsed=0,last=performance.now(),initial=base.slice(),active=-1;
let steps=[{color:'#ff0000',fade:0,hold:2},{color:'#0000ff',fade:3,hold:1},{color:'#00ff80',fade:2,hold:2}];
let device=null,writer=null,connecting=false,lastPacket='',lastSend=0,generation=0;
const names={breath:['숨쉬기','천천히 밝아졌다 어두워져요'],candle:['촛불','따뜻하고 불규칙한 빛'],lava:['용암','빨강과 주황의 느린 변화'],ocean:['바다','파랑과 청록의 물결'],rainbow:['무지개','색상이 부드럽게 순환해요'],firefly:['반딧불','잠깐 빛났다 사라져요']};
function notice(s='',error=false){$('notice').textContent=s;$('notice').classList.toggle('error',error);}
function connection(s,cls=''){$('connection').textContent=s;$('connection').className=cls;}
function status(){const phase=mode==='manual'?'직접 조절':state==='playing'?'재생 중':state==='paused'?'일시정지':'재생 대기';$('playState').textContent=(mode==='effects'?names[effectName][0]+' · ':'')+phase+(writer?' · 기기 연결됨':' · 미리보기');$('play').textContent=state==='paused'?'이어서 재생':writer?'재생':'미리보기 재생';$('play').disabled=state==='playing';$('pause').disabled=state!=='playing';$('effectSelection').textContent=names[effectName][0]+' · '+(state==='playing'?'재생 중':state==='paused'?'일시정지':'선택됨 — 재생을 눌러주세요');}
function show(color){if(mode==='manual')lastBase=base.slice();current=rgb(color);const hex=toHex(current);$('light').style.background=hex;$('light').style.boxShadow=`0 0 24px ${hex}66`;$('rgbText').textContent=`R ${current[0]} · G ${current[1]} · B ${current[2]}`;}
function unhighlight(){document.querySelectorAll('.step.active').forEach(e=>e.classList.remove('active'));active=-1;}
function stop(){state='stopped';elapsed=0;unhighlight();status();}
function pause(){if(state==='playing'){state='paused';status();}}
function manualInputs(){['red','green','blue'].forEach((id,i)=>$(id).value=base[i]);const max=Math.max(...base),min=Math.min(...base),d=max-min;let h=0;if(d){h=max===base[0]?((base[1]-base[2])/d)%6:max===base[1]?(base[2]-base[0])/d+2:(base[0]-base[1])/d+4;h*=Math.PI/3;}const s=max?d/max:0;$('cursor').style.left=(50+49*s*Math.cos(h))+'%';$('cursor').style.top=(50+49*s*Math.sin(h))+'%';}
function setMode(next){stop();mode=next;for(const x of ['manual','flow','effects']){$(x).hidden=x!==next;$('tab-'+x).setAttribute('aria-selected',x===next);$('tab-'+x).tabIndex=x===next?0:-1;}$('transport').hidden=next==='manual';$('stopHint').hidden=next==='manual';$('effectSelection').hidden=next!=='effects';if(next==='manual'){base=rgb(lastBase);manualInputs();}status();notice();}
document.querySelectorAll('[data-mode]').forEach((b,i)=>{b.onclick=()=>setMode(b.dataset.mode);b.onkeydown=e=>{const tabs=[...document.querySelectorAll('[data-mode]')];let n;if(e.key==='ArrowRight')n=(i+1)%tabs.length;else if(e.key==='ArrowLeft')n=(i+tabs.length-1)%tabs.length;else if(e.key==='Home')n=0;else if(e.key==='End')n=tabs.length-1;else return;e.preventDefault();setMode(tabs[n].dataset.mode);tabs[n].focus();};});
const ctx=$('wheel').getContext('2d'),image=ctx.createImageData(320,320);
for(let y=0;y<320;y++)for(let x=0;x<320;x++){const dx=x-159.5,dy=y-159.5,r=Math.hypot(dx,dy)/159.5,i=(y*320+x)*4;if(r<=1){const a=hsv(Math.atan2(dy,dx)*180/Math.PI,r);image.data.set([...a,255],i);}}
ctx.putImageData(image,0,0);
function pick(e){const rect=$('wheel').getBoundingClientRect(),x=(e.clientX-rect.left)/rect.width*2-1,y=(e.clientY-rect.top)/rect.height*2-1;base=hsv(Math.atan2(y,x)*180/Math.PI,Math.min(1,Math.hypot(x,y)));manualInputs();show(scale(base,$('brightness').value/100));}
let pointer=null;$('wheel').onpointerdown=e=>{if(e.button!==0)return;pointer=e.pointerId;$('wheel').setPointerCapture(pointer);pick(e);};$('wheel').onpointermove=e=>{if(pointer===e.pointerId)pick(e);};$('wheel').onpointerup=e=>{if(pointer===e.pointerId){pick(e);pointer=null;}};$('wheel').onpointercancel=()=>pointer=null;
['red','green','blue'].forEach(id=>$(id).onchange=()=>{base=rgb(['red','green','blue'].map(x=>$(x).value));manualInputs();show(scale(base,$('brightness').value/100));});
for(const [hex,label] of [['#ff0000','빨강'],['#ff8000','주황'],['#ffff00','노랑'],['#00ff00','초록'],['#00ffff','청록'],['#0000ff','파랑'],['#a000ff','보라'],['#ffffff','흰색']]){const b=document.createElement('button');b.style.background=hex;b.setAttribute('aria-label',label);b.onclick=()=>{base=fromHex(hex);manualInputs();show(scale(base,$('brightness').value/100));};$('swatches').append(b);}
function updateEffect(){document.querySelectorAll('[data-effect]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.effect===effectName));$('effectColorLabel').hidden=!['breath','firefly'].includes(effectName);}
for(const [key,[name,description]] of Object.entries(names)){const b=document.createElement('button');b.dataset.effect=key;b.innerHTML=`<img class="effect-icon" src="icons/${key}-3d.png" alt="" width="56" height="56"><span class="effect-copy"><strong>${name}</strong><small>${description}</small></span><span class="effect-check" aria-hidden="true">✓</span>`;b.onclick=()=>{effectName=key;elapsed=0;updateEffect();status();};$('effectCards').append(b);}updateEffect();
$('speed').oninput=()=>{$('speedText').textContent=Number($('speed').value).toFixed(2).replace(/0+$/,'').replace(/\.$/,'')+'×';};
$('brightness').oninput=()=>{$('brightnessText').textContent=$('brightness').value+'%';if(mode==='manual')show(scale(base,$('brightness').value/100));else if(state!=='playing'){show(scale(lastBase,$('brightness').value/100));}};
let lastBase=base.slice();
function renderSteps(){
  $('steps').replaceChildren();steps.forEach((s,i)=>{const div=document.createElement('div');div.className='step';div.innerHTML=`<div class="step-heading"><strong>단계 ${i+1}</strong><div class="step-tools"><button data-action="up" aria-label="단계 ${i+1} 위로">↑</button><button data-action="down" aria-label="단계 ${i+1} 아래로">↓</button><button data-action="copy" aria-label="단계 ${i+1} 복제">복제</button><button data-action="delete" aria-label="단계 ${i+1} 삭제">삭제</button></div></div><div class="step-fields"><label>색상<input type="color" value="${s.color}" data-field="color"></label><label>전환 (초)<input type="number" min="0" max="60" step="0.1" value="${s.fade}" data-field="fade"></label><label>유지 (초)<input type="number" min="0" max="60" step="0.1" value="${s.hold}" data-field="hold"></label></div>`;
    div.querySelector('[data-action=up]').disabled=i===0;div.querySelector('[data-action=down]').disabled=i===steps.length-1;div.querySelector('[data-action=delete]').disabled=steps.length===1;div.querySelector('[data-action=copy]').disabled=steps.length>=30;
    div.querySelectorAll('[data-field]').forEach(el=>el.onchange=()=>{stop();const f=el.dataset.field;s[f]=f==='color'?el.value:clamp(el.value,0,60);if(s.fade+s.hold<.1)s.hold=.1;renderSteps();});
    div.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>{stop();const a=b.dataset.action;if(a==='up'||a==='down'){const j=i+(a==='up'?-1:1);[steps[i],steps[j]]=[steps[j],steps[i]];}if(a==='copy'&&steps.length<30)steps.splice(i+1,0,{...s});if(a==='delete'&&steps.length>1)steps.splice(i,1);renderSteps();});$('steps').append(div);
  });$('addStep').disabled=steps.length>=30;
}
$('addStep').onclick=()=>{if(steps.length>=30)return;stop();steps.push({color:toHex(current),fade:1,hold:2});renderSteps();};$('loop').onchange=stop;
$('play').onclick=()=>{if(mode==='manual')return;if(state!=='paused'){elapsed=0;initial=current.map(v=>clamp(v/Math.max(.01,$('brightness').value/100)));}last=performance.now();state='playing';status();notice();};$('pause').onclick=pause;$('stop').onclick=stop;
$('off').onclick=()=>{stop();base=[0,0,0];lastBase=[0,0,0];show(base);manualInputs();if(writer){lastPacket=packet(base);writer.send(lastPacket);}notice(writer?'조명 끄기 데이터를 전송합니다.':'연결 전입니다. 화면 미리보기만 꺼졌습니다.');};
$('save').onclick=()=>{const blob=new Blob([JSON.stringify({format:'boundaryx-color-flow',version:1,steps,loop:$('loop').checked},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='boundaryx-color-flow.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notice('색상 흐름 파일을 저장했습니다.');};
$('load').onclick=()=>$('file').click();$('file').onchange=async()=>{const f=$('file').files[0];if(!f)return;try{if(f.size>100000)throw Error('파일이 너무 큽니다.');const data=validateFlow(JSON.parse(await f.text()));stop();steps=data.steps;$('loop').checked=data.loop;renderSteps();notice('색상 흐름을 불러왔습니다. 재생을 눌러 확인하세요.');}catch(e){notice(e.message,true);}finally{$('file').value='';}};
function clearConnection(message,cls=''){writer?.close();writer=null;device=null;lastPacket='';stop();$('connect').disabled=false;$('disconnect').disabled=true;connection(message,cls);$('sent').textContent='연결 대기 중';status();}
$('connect').onclick=async()=>{
  if(connecting||writer)return;if(!navigator.bluetooth){connection('이 브라우저는 블루투스를 지원하지 않습니다. 아이폰은 Bluefy를 사용하세요.','error');return;}
  connecting=true;$('connect').disabled=true;connection('기기를 선택하고 연결하는 중…');const id=++generation;let chosen;
  try{chosen=await navigator.bluetooth.requestDevice({filters:[{namePrefix:'BBC micro:bit'}],optionalServices:['6e400001-b5a3-f393-e0a9-e50e24dcca9e']});device=chosen;chosen.addEventListener('gattserverdisconnected',()=>{if(device===chosen){generation++;clearConnection('연결이 끊겼습니다. 재생을 중지했습니다.','error');}});const server=await chosen.gatt.connect();const service=await server.getPrimaryService('6e400001-b5a3-f393-e0a9-e50e24dcca9e');const characteristic=await service.getCharacteristic('6e400003-b5a3-f393-e0a9-e50e24dcca9e');if(id!==generation||!chosen.gatt.connected)throw Error('연결이 중단되었습니다.');
    writer=new LatestWriter(async p=>{const bytes=new TextEncoder().encode(p);if(characteristic.properties.write&&characteristic.writeValueWithResponse)await characteristic.writeValueWithResponse(bytes);else if(characteristic.properties.writeWithoutResponse&&characteristic.writeValueWithoutResponse)await characteristic.writeValueWithoutResponse(bytes);else await characteristic.writeValue(bytes);},p=>{$('sent').textContent=p.trim();},e=>{const d=device;generation++;clearConnection('전송 실패: '+e.message,'error');d?.gatt.disconnect();});stop();connection((chosen.name||'micro:bit')+' 연결됨','connected');$('connect').disabled=true;$('disconnect').disabled=false;lastPacket='';status();
  }catch(e){if(device===chosen)device=null;chosen?.gatt?.disconnect();clearConnection(e.name==='NotFoundError'?'기기 선택을 취소했습니다.':'연결 실패: '+e.message,e.name==='NotFoundError'?'':'error');}finally{connecting=false;}
};
$('disconnect').onclick=()=>{const d=device;generation++;clearConnection('연결 해제됨');d?.gatt.disconnect();};
document.addEventListener('visibilitychange',()=>{if(document.hidden){pause();if(writer)writer.pending=null;notice('화면을 벗어나 재생을 일시정지했습니다. 조명은 마지막 색을 유지합니다.');}});
setInterval(()=>{
  const now=performance.now(),dt=Math.min((now-last)/1000,.25);last=now;if(document.hidden)return;
  if(state==='playing'){
    elapsed+=dt*(mode==='effects'?Number($('speed').value):1);
    if(mode==='effects')lastBase=effect(effectName,elapsed,fromHex($('effectColor').value));
    else{const f=flowFrame(steps,elapsed,initial,$('loop').checked);lastBase=f.color;if(active!==f.index){unhighlight();active=f.index;$('steps').children[active]?.classList.add('active');}if(f.done){state='stopped';status();notice('색상 흐름 재생을 완료했습니다.');}}
    show(scale(lastBase,$('brightness').value/100));
  }
  if(writer&&now-lastSend>=100){const p=packet(current);if(p!==lastPacket){lastPacket=p;lastSend=now;writer.send(p);}}
},33);
manualInputs();renderSteps();status();show(current);

$('tab-flow').tabIndex=-1;$('tab-effects').tabIndex=-1;document.querySelector('.help-button').addEventListener('click',()=>{$('support').open=true;});
