export const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));

function lineWidth(glyphs){return glyphs.reduce((n,g)=>n+g.width+1,0)-(glyphs.length?1:0);}

// Whole Latin words wrap together; CJK wraps between glyphs. A long token
// breaks at glyph boundaries. Geometry is never compressed to fit a row.
export function wrapGlyphs(glyphs,maxColumns){
  const rows=[];let row=[];
  const push=()=>{while(row.length&&/^\s$/.test(row.at(-1).char))row.pop();rows.push(row);row=[];};
  for(let i=0;i<glyphs.length;){
    const g=glyphs[i];
    if(g.newline){push();i++;continue;}
    if(g.width>maxColumns)throw new Error('\u5b54\u5f84\u592a\u5927\uff0c\u5355\u4e2a\u5b57\u7b26\u4e5f\u8d85\u51fa\u6587\u5b57\u533a\u57df\u3002\u8bf7\u51cf\u5c0f\u5b54\u5f84\u6216\u589e\u52a0\u533a\u57df\u5bbd\u5ea6\u3002');
    if(/^\s$/.test(g.char)){if(row.length)row.push(g);i++;continue;}
    const token=[];
    if(/^[\x21-\x7e]$/.test(g.char)){
      while(i<glyphs.length&&!glyphs[i].newline&&/^[\x21-\x7e]$/.test(glyphs[i].char))token.push(glyphs[i++]);
    }else token.push(glyphs[i++]);
    if(lineWidth(token)<=maxColumns){
      if(row.length&&lineWidth([...row,...token])>maxColumns)push();
      row.push(...token);
    }else{
      if(row.length)push();
      for(const part of token){
        if(part.width>maxColumns)throw new Error('\u5b54\u5f84\u592a\u5927\uff0c\u5355\u4e2a\u5b57\u7b26\u8d85\u51fa\u6587\u5b57\u533a\u57df\u3002');
        if(row.length&&lineWidth([...row,part])>maxColumns)push();
        row.push(part);
      }
    }
  }
  if(row.length||glyphs.at(-1)?.newline)push();
  return rows;
}

function layout(glyphs,areaWidth,diameter,fill){
  const pitch=diameter/fill;
  // Last hole occupies diameter, not a whole pitch. Blank glyph edges retain
  // their grid allocation, preventing accidental loss of side bearings.
  const maxColumns=1+(areaWidth-diameter)/pitch;
  const rows=wrapGlyphs(glyphs,maxColumns);let unitsY=0;const points=[];const lines=[];
  const blockWidth=Math.max(0,...rows.map(row=>row.length?(lineWidth(row)-1)*pitch+diameter:0));
  rows.forEach((row,index)=>{
    const height=Math.max(7,...row.map(g=>g.height));const unitsW=lineWidth(row);
    const occupiedWidth=row.length?(unitsW-1)*pitch+diameter:0;
    const xOffset=(blockWidth-occupiedWidth)/2;let unitsX=0;
    row.forEach(g=>{
      for(const p of g.points)points.push({x:xOffset+(unitsX+p.x)*pitch,y:(unitsY+p.y+height-g.height)*pitch});
      unitsX+=g.width+1;
    });
    lines.push({text:row.map(g=>g.char).join(''),width:occupiedWidth,height});
    unitsY+=height+(index<rows.length-1?3:0);
  });
  const height=rows.length?(unitsY-1)*pitch+diameter:0;
  return {points,lines,width:blockWidth,height,pitch,diameter};
}

export function donorGrid(width,height,n,diameter,seed=37){
  if(!n)return [];
  const gap=diameter*.25;
  const nxMax=Math.floor(width/(diameter+gap));const nyMax=Math.floor(height/(diameter+gap));
  if(nxMax*nyMax<n)throw new Error('\u539f\u753b\u65e0\u6cd5\u5bb9\u7eb3\u8fd9\u4e48\u591a\u5b54\u3002\u8bf7\u51cf\u5c0f\u5b54\u5f84\u6216\u7f29\u77ed\u6587\u5b57\u3002');
  let nx=clamp(Math.ceil(Math.sqrt(n*width/height)),Math.ceil(n/nyMax),nxMax);
  let ny=Math.ceil(n/nx);const cw=width/nx,ch=height/ny;
  let t=seed>>>0;
  const rand=()=>{t+=0x6D2B79F5;let a=t;a=Math.imul(a^a>>>15,a|1);a^=a+Math.imul(a^a>>>7,a|61);return((a^a>>>14)>>>0)/4294967296;};
  const cells=Array.from({length:nx*ny},(_,i)=>i);
  for(let i=cells.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[cells[i],cells[j]]=[cells[j],cells[i]];}
  return cells.slice(0,n).map(i=>({x:(i%nx)*cw+gap/2+rand()*Math.max(0,cw-diameter-gap),y:Math.floor(i/nx)*ch+gap/2+rand()*Math.max(0,ch-diameter-gap)}));
}

// A source sampler is independent of the decorative holes. If manual text
// cells outgrow the source, sample a smaller intact patch and scale that patch
// into its cell; text never squeezes or loses glyphs to satisfy donor capacity.
function sourceSamplers(width,height,n,diameter){
  try{return {donors:donorGrid(width,height,n,diameter),sourceDiameter:diameter};}catch{}
  let lo=0,hi=Math.min(diameter,width,height),donors=[];
  for(let i=0;i<30;i++){
    const mid=(lo+hi)/2;
    try{donors=donorGrid(width,height,n,mid);lo=mid;}catch{hi=mid;}
  }
  return {donors,sourceDiameter:lo};
}

const numeric=(value,fallback)=>Number.isFinite(Number(value))?Number(value):fallback;
const percent=(value,fallback)=>clamp(numeric(value,fallback),0,100);
const holeArea=(diameter,shape)=>diameter*diameter*(shape==='circle'?Math.PI/4:1);

export function createPlan(width,height,glyphs,options={}){
  if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)throw new Error('\u56fe\u7247\u5c3a\u5bf8\u65e0\u6548\u3002');
  const transfer=options.mode==='transfer';
  const split=options.split==='vertical'||options.split==='horizontal'?options.split:width<height?'horizontal':'vertical';
  const imageShape=options.imageShape==='circle'?'circle':'square';
  const imageHoleColor=options.imageHoleColor||options.paperColor||'#e8f2e9';
  const n=glyphs.reduce((a,g)=>a+g.points.length,0);
  if(!n)return {width,height,imageWidth:width,imageHeight:height,split,captionRect:null,diameter:0,sourceDiameter:0,imageDiameter:0,imageShape,imageHoleColor,pitch:0,points:[],donors:[],imageHoles:[],lines:[],removedFraction:0};
  // The text region always leaves horizontal slack, including at 100% area
  // width, so the horizontal position control has useful room to move.
  const regionWidth=transfer&&split==='horizontal'?width*.9:width;
  const pad=transfer?regionWidth*.05:Math.min(width*.04,height*.05);
  const areaWidth=Math.min(regionWidth*clamp(numeric(options.areaWidth,84),10,100)/100,regionWidth-2*pad-regionWidth*.04);
  const fill=clamp(1-numeric(options.spacing,32)/100,.15,1);
  const targetHeight=height*(transfer?(split==='horizontal'?.7:.42):.32);
  let diameter;
  const tryLayout=d=>layout(glyphs,areaWidth,d,fill);
  if(options.autoSize!==false){
    const targetArea=transfer?.035:.07;
    const cap=Math.min(width*.035,Math.sqrt(targetArea*width*height/n));
    let lo=0,hi=cap;
    for(let i=0;i<28;i++){
      const mid=(lo+hi)/2;let fits=false;
      try{const l=tryLayout(mid);fits=l.height<=targetHeight;}catch{}
      if(fits)lo=mid;else hi=mid;
    }
    diameter=lo;
  }else diameter=numeric(options.holeSize,16)/1200*width;
  if(!Number.isFinite(diameter)||diameter<=0)throw new Error('\u5b54\u5f84\u5fc5\u987b\u5927\u4e8e\u96f6\u3002');
  const result=tryLayout(diameter);
  const positionX=percent(options.positionX,50),positionY=percent(options.positionY??options.position,82);
  let regionX=0,regionY=0,regionHeight=height,fullWidth=width,fullHeight=height,captionRect=null,donors=[],sourceDiameter=diameter,imageHoles=[],imageDiameter=0;
  if(!transfer){
    if(result.height>height-2*pad)throw new Error('\u5f53\u524d\u5b54\u5f84\u9700\u8981\u66f4\u591a\u884c\uff0c\u539f\u753b\u9ad8\u5ea6\u4e0d\u8db3\u3002\u8bf7\u51cf\u5c0f\u5b54\u5f84\u3001\u7f29\u77ed\u6587\u5b57\u6216\u5207\u6362\u300c\u788e\u7247\u62fc\u5b57\u300d\u3002');
  }else{
    ({donors,sourceDiameter}=sourceSamplers(width,height,n,diameter));
    // Caption height grows rather than shrinking type. The extra space also
    // keeps vertical placement meaningful when large manual type fills rows.
    const slackY=Math.max(regionWidth*.08,result.height*.2);
    regionHeight=Math.max(split==='horizontal'?height:height*.48,result.height+2*pad+slackY);
    if(split==='horizontal'){regionX=width;fullWidth=Math.ceil(width+regionWidth);fullHeight=Math.ceil(regionHeight);}
    else{regionY=height;fullHeight=Math.ceil(height+regionHeight);}
    captionRect={x:regionX,y:regionY,width:regionWidth,height:regionHeight};
    imageDiameter=Math.min(numeric(options.imageHoleSize,28)/1200*width,Math.min(width,height)/1.25);
    if(imageDiameter<=0)throw new Error('\u539f\u753b\u5b54\u5f84\u5fc5\u987b\u5927\u4e8e\u96f6\u3002');
    const density=clamp(numeric(options.imageDensity,3.5),0,45);
    const capacity=Math.floor(width/(imageDiameter*1.25))*Math.floor(height/(imageDiameter*1.25));
    const holeCount=Math.min(capacity,Math.round(width*height*density/100/holeArea(imageDiameter,imageShape)));
    imageHoles=donorGrid(width,height,holeCount,imageDiameter,907);
  }
  const offsetX=regionX+pad+Math.max(0,regionWidth-2*pad-result.width)*positionX/100;
  const offsetY=regionY+pad+Math.max(0,regionHeight-2*pad-result.height)*positionY/100;
  const points=result.points.map(p=>({x:p.x+offsetX,y:p.y+offsetY}));
  const removedFraction=transfer?imageHoles.length*holeArea(imageDiameter,imageShape)/(width*height):n*holeArea(diameter,options.shape)/(width*height);
  return {width:fullWidth,height:fullHeight,imageWidth:width,imageHeight:height,split,captionRect,diameter,sourceDiameter,imageDiameter,imageShape,imageHoleColor,pitch:result.pitch,points,donors,imageHoles,lines:result.lines,removedFraction};
}

// Original OKLab matrices by Björn Ottosson, used with linear sRGB.
const linear=x=>x<=.04045?x/12.92:Math.pow((x+.055)/1.055,2.4);
const gamma=x=>x<=.0031308?12.92*x:1.055*Math.pow(x,1/2.4)-.055;
export function rgbToLab(r,g,b){
  r=linear(r);g=linear(g);b=linear(b);
  const l=Math.cbrt(.4122214708*r+.5363325363*g+.0514459929*b),m=Math.cbrt(.2119034982*r+.6806995451*g+.1073969566*b),s=Math.cbrt(.0883024619*r+.2817188376*g+.6299787005*b);
  return [.2104542553*l+.793617785*m-.0040720468*s,1.9779984951*l-2.428592205*m+.4505937099*s,.0259040371*l+.7827717662*m-.808675766*s];
}
function labToRgb(L,a,b){
  const l=(L+.3963377774*a+.2158037573*b)**3,m=(L-.1055613458*a-.0638541728*b)**3,s=(L-.0894841775*a-1.291485548*b)**3;
  return [gamma(4.0767416621*l-3.3077115913*m+.2309699292*s),gamma(-1.2684380046*l+2.6097574011*m-.3413193965*s),gamma(-.0041960863*l-.7034186147*m+1.707614701*s)];
}
export function paperColor(L,C,h){
  let rgb;
  for(let i=0;i<40;i++){
    rgb=labToRgb(L,C*Math.cos(h),C*Math.sin(h));
    if(rgb.every(x=>x>=0&&x<=1))break;
    C*=.8;
  }
  return '#'+rgb.map(x=>Math.round(clamp(x,0,1)*255).toString(16).padStart(2,'0')).join('');
}
export function analyzeColors(data){
  let sumL=0,sumA=0,sumB=0,count=0,hueCount=0;
  for(let i=0;i<data.length;i+=4){
    if(data[i+3]<128)continue;
    const [L,a,b]=rgbToLab(data[i]/255,data[i+1]/255,data[i+2]/255);sumL+=L;count++;
    if(Math.hypot(a,b)>.025&&L>.15&&L<.95){sumA+=a;sumB+=b;hueCount++;}
  }
  const meanL=count?sumL/count:.6;
  const hue=hueCount&&Math.hypot(sumA,sumB)>.001?Math.atan2(sumB,sumA):Math.PI/2;
  const light=paperColor(.95,.025,hue),dark=paperColor(.27,.022,hue);
  const preferred=meanL>.92?dark:light;
  return {preferred,hue,meanL,swatches:[light,paperColor(.94,.025,hue+Math.PI),paperColor(.96,.018,Math.PI/2),dark],description:meanL>.92?'\u539f\u753b\u63a5\u8fd1\u767d\u8272\uff0c\u4f7f\u7528\u540c\u8272\u76f8\u7684\u6df1\u7eb8\u8272\u589e\u5f3a\u5b54\u6d1e\u8fa8\u8bc6\u3002':'\u5ef6\u7eed\u539f\u753b\u8272\u76f8\uff0c\u964d\u4f4e\u9971\u548c\u5ea6\uff0c\u5f97\u5230\u67d4\u548c\u7684\u6d45\u7eb8\u8272\u3002'};
}

export function holePath(ctx,x,y,d,shape){if(shape==='circle'){ctx.moveTo(x+d,y+d/2);ctx.arc(x+d/2,y+d/2,d/2,0,Math.PI*2);}else ctx.rect(x,y,d,d);}

export function renderArt(canvas,source,plan,options,{scale=1,original=false}={}){
  const w=original?plan.imageWidth:plan.width,h=original?plan.imageHeight:plan.height;
  canvas.width=Math.round(w*scale);canvas.height=Math.round(h*scale);
  const ctx=canvas.getContext('2d');ctx.scale(scale,scale);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  ctx.fillStyle=options.paperColor;ctx.fillRect(0,0,w,h);ctx.drawImage(source,0,0,plan.imageWidth,plan.imageHeight);
  if(original)return;
  const transfer=options.mode==='transfer';
  const holes=transfer?plan.imageHoles:plan.points;
  const d=plan.diameter;
  const holeDiameter=transfer?plan.imageDiameter:d;
  const holeShape=transfer?(options.imageShape||plan.imageShape||'square'):options.shape;
  const holeColor=transfer?(options.imageHoleColor||options.paperColor):options.paperColor;
  ctx.beginPath();for(const p of holes)holePath(ctx,p.x,p.y,holeDiameter,holeShape);ctx.fillStyle=holeColor;ctx.fill();
  if(options.depth&&holeDiameter){ctx.lineWidth=Math.max(.3,holeDiameter*.025);ctx.strokeStyle='rgba(32,45,30,.18)';ctx.stroke();}
  if(transfer){
    const sampleD=plan.sourceDiameter??d;
    plan.points.forEach((p,i)=>{
      const donor=plan.donors[i];ctx.save();ctx.beginPath();holePath(ctx,p.x,p.y,d,options.shape);ctx.clip();
      const sx=donor.x/plan.imageWidth*source.width,sy=donor.y/plan.imageHeight*source.height;
      ctx.drawImage(source,sx,sy,sampleD/plan.imageWidth*source.width,sampleD/plan.imageHeight*source.height,p.x,p.y,d,d);ctx.restore();
    });
    if(options.depth){ctx.beginPath();for(const p of plan.points)holePath(ctx,p.x,p.y,d,options.shape);ctx.lineWidth=Math.max(.3,d*.025);ctx.strokeStyle='rgba(32,45,30,.16)';ctx.stroke();}
  }
}

const xml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const num=x=>Math.round(x*10000)/10000;
const svgHole=(p,d,shape,attrs='')=>shape==='circle'?`<circle cx="${num(p.x+d/2)}" cy="${num(p.y+d/2)}" r="${num(d/2)}" ${attrs}/>`:`<rect x="${num(p.x)}" y="${num(p.y)}" width="${num(d)}" height="${num(d)}" ${attrs}/>`;
export function exportSvg(sourceData,plan,options){
  const {width:w,height:h,diameter:d}=plan;const transfer=options.mode==='transfer';
  const holes=transfer?plan.imageHoles:plan.points;
  const holeDiameter=transfer?plan.imageDiameter:d;
  const holeShape=transfer?(options.imageShape||plan.imageShape||'square'):options.shape;
  const holeColor=transfer?(options.imageHoleColor||options.paperColor):options.paperColor;
  const defs=[];
  const body=[`<title>Alive \u6253\u5b54\u827a\u672f</title><rect width="${w}" height="${h}" fill="${xml(options.paperColor)}"/>`,`<image id="original-image" href="${xml(sourceData)}" width="${plan.imageWidth}" height="${plan.imageHeight}"/>`,holes.map(p=>svgHole(p,holeDiameter,holeShape,`fill="${xml(holeColor)}"`)).join('')];
  if(transfer){
    const sampleScale=d/(plan.sourceDiameter||d||1);
    defs.push(`<image id="source" href="${xml(sourceData)}" width="${plan.imageWidth}" height="${plan.imageHeight}"/>`);
    plan.points.forEach((p,i)=>{const q=plan.donors[i];defs.push(`<clipPath id="piece-${i}">${svgHole(p,d,options.shape)}</clipPath>`);body.push(`<g clip-path="url(#piece-${i})"><use href="#source" transform="translate(${num(p.x-q.x*sampleScale)} ${num(p.y-q.y*sampleScale)}) scale(${num(sampleScale)})"/></g>`);});
  }
  if(options.depth){
    const attrs=`fill="none" stroke="#202d1e" stroke-opacity=".18" stroke-width="${num(Math.max(.3,holeDiameter*.025))}"`;
    body.push(holes.map(p=>svgHole(p,holeDiameter,holeShape,attrs)).join(''));
    if(transfer){const textAttrs=`fill="none" stroke="#202d1e" stroke-opacity=".16" stroke-width="${num(Math.max(.3,d*.025))}"`;body.push(plan.points.map(p=>svgHole(p,d,options.shape,textAttrs)).join(''));}
  }
  return `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs>${defs.join('')}</defs>${body.join('')}</svg>`;
}
