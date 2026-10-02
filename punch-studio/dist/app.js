import {PixelLibrary} from './font.js';
import {createPlan,renderArt,analyzeColors,exportSvg,clamp} from './core.js';

const $=id=>document.getElementById(id);
const library=new PixelLibrary();
const defaults={mode:'punch',shape:'square',autoSize:true,holeSize:16,autoColor:true,paperColor:'#e8f2e9',spacing:32,position:82,positionY:82,positionX:50,areaWidth:84,fontStyle:'classic',depth:true,split:'auto',imageDensity:3.5,imageShape:'square',imageHoleSize:28,imageHoleColor:null};
let options={...defaults};let source=null,plan=null,colors=null,currentName='绿野 · 示例原画';
let original=false,renderFrame=0,imageRequest=0,imageBusy=false,valid=false,imageNote='';
let viewZoom=1,zoomSensitivity=1;

function status(text='',error=false){$('status').textContent=text;$('status').classList.toggle('error',error);}
function allowExport(yes){valid=yes;document.querySelectorAll('.export-trigger').forEach(b=>b.disabled=!yes);}
function syncButtons(){
  document.querySelectorAll('[data-mode]').forEach(b=>{const active=b.dataset.mode===options.mode;b.classList.toggle('active',active);b.setAttribute('aria-pressed',active);});
  document.querySelectorAll('[data-shape]').forEach(b=>{const active=b.dataset.shape===options.shape;b.classList.toggle('active',active);b.setAttribute('aria-pressed',active);});
  for(const [attribute,key] of [['data-split','split'],['data-image-shape','imageShape']])document.querySelectorAll(`[${attribute}]`).forEach(b=>{const active=b.getAttribute(attribute)===options[key];b.classList.toggle('active',active);b.setAttribute('aria-pressed',active);});
  ['auto-size','auto-color'].forEach(id=>{const yes=id==='auto-size'?options.autoSize:options.autoColor;$(id).classList.toggle('selected',yes);$(id).setAttribute('aria-pressed',yes);});
  $('paper-color').value=options.paperColor;$('color-hex').textContent=options.paperColor.toUpperCase();
  $('color-description').textContent=options.autoColor?(colors?.description||'从原画取色，选择柔和的纸张色。'):'已使用自定义底色。可以随时恢复智能配色。';
  $('position-value').textContent=options.positionY+'%';$('position-x-value').textContent=options.positionX+'%';
  $('density-value').textContent=options.spacing+'%';$('width-value').textContent=options.areaWidth+'%';
  $('composition-hint').textContent=options.mode==='punch'?'保留原画的色彩与纹理，在文字的位置打孔。':'原画散孔与图块文字分别调节，图块保留原画的色彩与纹理。';
  const transfer=options.mode==='transfer';$('split-controls').hidden=!transfer;$('split-hint').hidden=!transfer;$('image-settings').hidden=!transfer;
  $('position').disabled=false;$('position-x').disabled=false;
  $('image-density-value').textContent=options.imageDensity+'%';
  const imageColor=options.imageHoleColor||options.paperColor;$('image-color').value=imageColor;$('image-color-hex').textContent=imageColor.toUpperCase();
  const follows=!options.imageHoleColor;$('link-image-color').classList.toggle('selected',follows);$('link-image-color').setAttribute('aria-pressed',follows);
  const hasText=!!$('letters').value.trim();
  $('image-settings-hint').textContent=hasText?'独立调整原画区，不改变文字点阵。':'输入文字后可调整原画散孔。';
  $('image-settings').querySelectorAll('input,button').forEach(c=>c.disabled=!hasText);
}
function updateSwatches(){
  $('swatches').replaceChildren();
  for(const [i,color] of colors.swatches.entries()){
    const b=document.createElement('button');b.className='swatch';b.style.background=color;b.setAttribute('aria-label',['浅纸色','互补浅色','暖白纸色','深纸色'][i]+' '+color);b.title=color;
    b.addEventListener('click',()=>{options.paperColor=color;options.autoColor=false;scheduleRender();});$('swatches').append(b);
  }
}
function fitPreview(){
  const canvas=$('artwork');if(!canvas.width||!canvas.height)return;
  const stage=$('stage');const gutter=window.innerWidth<=720?40:68;
  const ratio=Math.min((stage.clientWidth-gutter)/canvas.width,(stage.clientHeight-gutter)/canvas.height);
  const zoom=viewZoom;
  canvas.style.width=Math.max(1,canvas.width*ratio*zoom)+'px';canvas.style.height=Math.max(1,canvas.height*ratio*zoom)+'px';
  $('zoom-value').textContent=Math.round(zoom*100)+'%';
}
function render(){
  renderFrame=0;syncButtons();if(!source||imageBusy)return;
  const count=Array.from($('letters').value.normalize('NFC')).length;$('char-count').textContent=count+' / 120';
  try{
    const glyphs=library.text($('letters').value,options.fontStyle);
    const next=createPlan(source.width,source.height,glyphs,options);
    if(next.width*next.height>32_000_000||Math.max(next.width,next.height)>16384)throw new Error('当前画布过大。请减小孔径或缩短文字，再导出完整作品。');
    plan=next;
    const previewScale=Math.min(1,1600/plan.width,1600/plan.height);
    renderArt($('artwork'),source,plan,options,{scale:previewScale,original});
    $('loading').hidden=true;
    $('dimensions').textContent=`${Math.round(plan.width)} × ${Math.round(plan.height)} px`;
    $('hole-count').textContent=`${options.mode==='transfer'?plan.imageHoles.length:plan.points.length} 个孔`;$('line-count').textContent=`${plan.lines.length} 行文字`;
    $('text-count').hidden=options.mode!=='transfer';$('text-count').textContent=`· ${plan.points.length} 个图块`;
    $('split-hint').textContent=options.split==='auto'?`按原画比例自动选择${plan.split==='horizontal'?'左右':'上下'}布局。`:`原画在${plan.split==='horizontal'?'左侧，文字在右侧':'上方，文字在下方'}。`;
    $('image-hole-value').textContent=plan.imageDiameter?`${plan.imageDiameter.toFixed(1)} px`:'—';
    $('hole-value').textContent=plan.diameter?`${plan.diameter.toFixed(1)} px`:'—';
    if(options.autoSize&&plan.diameter)$('hole-size').value=clamp(plan.diameter/plan.imageWidth*1200,3,60);
    $('size-hint').textContent=options.autoSize?'根据文字点数与可用区域估算孔径。':'放大孔径会自动换行；原画空间不足时会提示调整。';
    let note=imageNote;
    if(plan.diameter&&plan.diameter<2)note+=(note?' ':'')+'文字较多，孔径已小于 2 px，建议缩短文字提升辨识度。';
    status(note);allowExport(true);fitPreview();
  }catch(error){
    $('loading').textContent='预览未更新 · 请调整左侧设置';$('loading').hidden=false;
    status(error.message,true);allowExport(false);
  }
}
function scheduleRender(){allowExport(false);if(!renderFrame)renderFrame=requestAnimationFrame(render);}

async function loadImage(blob,name,request=++imageRequest){
  imageBusy=true;allowExport(false);$('loading').textContent='正在读取原画…';$('loading').hidden=false;
  let image;
  try{
    image=await createImageBitmap(blob,{imageOrientation:'from-image'});
    if(request!==imageRequest)return;
    const factor=Math.min(1,6000/image.width,6000/image.height,Math.sqrt(16_000_000/(image.width*image.height)));
    const next=document.createElement('canvas');next.width=Math.max(1,Math.round(image.width*factor));next.height=Math.max(1,Math.round(image.height*factor));
    next.getContext('2d').drawImage(image,0,0,next.width,next.height);
    source=next;currentName=name;$('image-name').textContent=name;
    imageNote=factor<1?`原画较大，工作尺寸调整为 ${next.width} × ${next.height} px，保持长宽比。`:'';
    const sample=document.createElement('canvas');const s=Math.min(1,128/next.width,128/next.height);sample.width=Math.max(1,Math.round(next.width*s));sample.height=Math.max(1,Math.round(next.height*s));
    const ctx=sample.getContext('2d',{willReadFrequently:true});ctx.drawImage(next,0,0,sample.width,sample.height);
    $('thumb').src=sample.toDataURL('image/png');
    colors=analyzeColors(ctx.getImageData(0,0,sample.width,sample.height).data);
    if(options.autoColor)options.paperColor=colors.preferred;updateSwatches();
    imageBusy=false;render();
  }catch(error){
    if(request!==imageRequest)return;
    imageBusy=false;$('loading').hidden=!!source;status('无法读取这张图片，请选择有效的 PNG、JPG 或 WebP。',true);
    if(source){render();status('图片读取失败，已保留上一张原画。',true);}
  }finally{image?.close();}
}
async function useDemo(){
  const request=++imageRequest;
  try{const response=await fetch('./assets/sample.png');if(!response.ok)throw new Error();const blob=await response.blob();if(request!==imageRequest)return;await loadImage(blob,'绿野 · 示例原画',request);}
  catch{if(request!==imageRequest)return;imageBusy=false;if(source)render();status('示例图片读取失败，请上传你自己的原画。',true);if(!source)$('loading').textContent='请选择一张原画';}
}
function receiveFile(file){
  if(!file)return;
  if(!['image/png','image/jpeg','image/webp'].includes(file.type)){status('请选择 PNG、JPG 或 WebP 图片。',true);return;}
  if(file.size>30*1024*1024){status('图片大于 30 MB，请压缩后再选择。',true);return;}
  loadImage(file,file.name);
}

$('image-file').addEventListener('change',e=>{receiveFile(e.target.files[0]);e.target.value='';});
$('use-demo').addEventListener('click',useDemo);
const drop=$('dropzone');['dragenter','dragover'].forEach(event=>drop.addEventListener(event,e=>{e.preventDefault();drop.classList.add('dragover');}));
['dragleave','drop'].forEach(event=>drop.addEventListener(event,e=>{e.preventDefault();drop.classList.remove('dragover');if(event==='drop')receiveFile(e.dataTransfer.files[0]);}));
$('letters').addEventListener('input',scheduleRender);
document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>{options.mode=b.dataset.mode;scheduleRender();}));
document.querySelectorAll('[data-shape]').forEach(b=>b.addEventListener('click',()=>{options.shape=b.dataset.shape;scheduleRender();}));
document.querySelectorAll('[data-split]').forEach(b=>b.addEventListener('click',()=>{options.split=b.dataset.split;scheduleRender();}));
document.querySelectorAll('[data-image-shape]').forEach(b=>b.addEventListener('click',()=>{options.imageShape=b.dataset.imageShape;scheduleRender();}));
$('image-density').addEventListener('input',e=>{options.imageDensity=Number(e.target.value);scheduleRender();});
$('image-hole-size').addEventListener('input',e=>{options.imageHoleSize=Number(e.target.value);scheduleRender();});
$('image-color').addEventListener('input',e=>{options.imageHoleColor=e.target.value;scheduleRender();});
$('link-image-color').addEventListener('click',()=>{options.imageHoleColor=null;scheduleRender();});
$('paper-color').addEventListener('input',e=>{options.paperColor=e.target.value;options.autoColor=false;scheduleRender();});
$('auto-color').addEventListener('click',()=>{if(colors){options.paperColor=colors.preferred;options.autoColor=true;scheduleRender();}});
$('hole-size').addEventListener('input',e=>{options.holeSize=Number(e.target.value);options.autoSize=false;scheduleRender();});
$('auto-size').addEventListener('click',()=>{options.autoSize=true;scheduleRender();});
for(const [id,key] of [['density','spacing'],['position','positionY'],['position-x','positionX'],['area-width','areaWidth']])$(id).addEventListener('input',e=>{options[key]=Number(e.target.value);if(key==='positionY')options.position=options.positionY;scheduleRender();});
$('font-style').addEventListener('change',e=>{options.fontStyle=e.target.value;scheduleRender();});
$('depth').addEventListener('change',e=>{options.depth=e.target.checked;scheduleRender();});
$('reset').addEventListener('click',()=>{
  options={...defaults,mode:options.mode,paperColor:colors?.preferred||defaults.paperColor};
  $('density').value=options.spacing;$('position').value=options.positionY;$('position-x').value=options.positionX;$('area-width').value=options.areaWidth;$('font-style').value=options.fontStyle;$('depth').checked=options.depth;
  $('image-density').value=options.imageDensity;$('image-hole-size').value=options.imageHoleSize;viewZoom=1;$('zoom').value=100;zoomSensitivity=1;$('zoom-sensitivity').value=1;syncSensitivity();scheduleRender();
});
function setView(value){original=value;$('view-result').classList.toggle('active',!value);$('view-original').classList.toggle('active',value);$('view-result').setAttribute('aria-pressed',!value);$('view-original').setAttribute('aria-pressed',value);scheduleRender();}
$('view-result').addEventListener('click',()=>setView(false));$('view-original').addEventListener('click',()=>setView(true));
$('zoom').addEventListener('input',()=>{viewZoom=Number($('zoom').value)/100;fitPreview();});new ResizeObserver(fitPreview).observe($('stage'));
function syncSensitivity(){const label=zoomSensitivity.toFixed(1)+'×';$('sensitivity-value').textContent=label;$('sensitivity-summary').textContent=label;}
$('zoom-sensitivity').addEventListener('input',e=>{zoomSensitivity=Number(e.target.value);syncSensitivity();});
$('stage').addEventListener('wheel',event=>{
  if(!event.ctrlKey||!$('artwork').width)return;
  event.preventDefault();event.stopPropagation();
  const stage=$('stage'),canvas=$('artwork'),before=canvas.getBoundingClientRect();
  const fx=(event.clientX-before.left)/before.width,fy=(event.clientY-before.top)/before.height;
  const delta=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?stage.clientHeight:1);
  viewZoom=clamp(viewZoom*Math.exp(-delta*.0015*zoomSensitivity),.25,3);$('zoom').value=Math.round(viewZoom*100);fitPreview();
  const after=canvas.getBoundingClientRect();stage.scrollLeft+=after.left+fx*after.width-event.clientX;stage.scrollTop+=after.top+fy*after.height-event.clientY;
},{passive:false});

function exportScale(){return Number($('export-scale').value);}
function exportDimensions(){
  if(!plan)return;
  const scale=exportScale();const w=Math.round(plan.width*scale),h=Math.round(plan.height*scale);
  const okay=w<=16384&&h<=16384&&w*h<=48_000_000;
  $('export-dimensions').textContent=`${w} × ${h} px`+(okay?' · PNG 保留完整细节':' · 尺寸较大，请选择原始尺寸或减小画布');
  $('download-png').disabled=!okay;
}
document.querySelectorAll('.export-trigger').forEach(b=>b.addEventListener('click',()=>{if(!valid)return;exportDimensions();$('export-dialog').showModal();}));
$('export-scale').addEventListener('change',exportDimensions);
function saveBlob(blob,ext){
  if(!blob)throw new Error('导出失败，请选择较小的尺寸。');
  const name=$('letters').value.trim().replace(/[<>:"/\\|?*\n\r]/g,' ').slice(0,32)||'untitled';
  const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`alive-${name}.${ext}`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
$('download-png').addEventListener('click',async()=>{
  if(!valid)return;
  const button=$('download-png');button.disabled=true;button.textContent='正在生成…';
  try{
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    const scale=exportScale();if(plan.width*plan.height*scale*scale>48_000_000||Math.max(plan.width,plan.height)*scale>16384)throw new Error('导出尺寸过大，请选择原始尺寸。');
    const canvas=document.createElement('canvas');renderArt(canvas,source,plan,options,{scale});
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));saveBlob(blob,'png');canvas.width=canvas.height=1;
    $('export-dialog').close();status('作品已导出为 PNG。');
  }catch(error){status(error.message,true);}finally{button.textContent='下载 PNG ↓';button.disabled=false;}
});
$('download-svg').addEventListener('click',()=>{
  if(!valid)return;
  try{const svg=exportSvg(source.toDataURL('image/png'),plan,options);saveBlob(new Blob([svg],{type:'image/svg+xml;charset=utf-8'}),'svg');$('export-dialog').close();status('作品已导出为 SVG。');}catch(error){status(error.message||'SVG 导出失败。',true);}
});

// Optional WebMCP uses exactly the visible editor actions; no network service.
const context=document.modelContext;
if(context?.registerTool){
  const lifecycle=new AbortController();
  for(const tool of [
    {name:'read_punch_art',title:'读取打孔作品设置',description:'Read the current local punch art settings and result dimensions.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:true},execute:()=>({letters:$('letters').value,settings:{...options},valid,width:plan?.width,height:plan?.height,holes:plan?.points.length,lines:plan?.lines.map(l=>l.text)})},
    {name:'configure_punch_art',title:'修改打孔作品',description:'Update text, composition, hole shape and paper color in the local editor. Does not upload or download an image.',inputSchema:{type:'object',properties:{letters:{type:'string',maxLength:120},mode:{type:'string',enum:['punch','transfer']},shape:{type:'string',enum:['square','circle']},paperColor:{type:'string',pattern:'^#[0-9a-fA-F]{6}$'}},additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:true},execute(input){
      if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('Expected settings object');
      if(Object.keys(input).some(k=>!['letters','mode','shape','paperColor'].includes(k)))throw new Error('Unsupported setting');
      if('letters'in input&&(typeof input.letters!=='string'||Array.from(input.letters).length>120))throw new Error('Invalid letters');
      if('mode'in input&&!['punch','transfer'].includes(input.mode))throw new Error('Invalid mode');
      if('shape'in input&&!['square','circle'].includes(input.shape))throw new Error('Invalid shape');
      if('paperColor'in input&&!/^#[0-9a-fA-F]{6}$/.test(input.paperColor))throw new Error('Invalid paperColor');
      if('letters'in input)library.text(input.letters,options.fontStyle);
      const proposed={...options,...('mode'in input?{mode:input.mode}:{}),...('shape'in input?{shape:input.shape}:{}),...('paperColor'in input?{paperColor:input.paperColor,autoColor:false}:{})};
      if(source)createPlan(source.width,source.height,library.text(input.letters??$('letters').value,proposed.fontStyle),proposed);
      if('letters'in input)$('letters').value=input.letters;options=proposed;render();return {valid,width:plan?.width,height:plan?.height,holes:plan?.points.length};
    }}
  ]){
    try{Promise.resolve(context.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}
  }
  window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
}

async function start(){
  const initialRequest=imageRequest;
  try{await library.load();$('font-state').textContent='离线点阵字库';}
  catch{$('font-state').textContent='中文字库加载失败';status('中文字库未加载，英文经典点阵仍可使用。',true);}
  if(imageRequest===initialRequest)await useDemo();else render();
}
start();
