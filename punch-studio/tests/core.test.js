import test from 'node:test';
import assert from 'node:assert/strict';
import {bitmapGlyph,CLASSIC} from '../dist/font.js';
import {createPlan,wrapGlyphs,donorGrid,analyzeColors,exportSvg,renderArt} from '../dist/core.js';

const defaults={mode:'punch',autoSize:true,holeSize:16,spacing:32,position:82,areaWidth:84,shape:'square',paperColor:'#e8f2e9',depth:false};
const glyphs=text=>Array.from(text).map(c=>c==='\n'?{char:c,newline:true,width:0,height:0,points:[]}:c===' '?{char:c,width:3,height:7,points:[]}:bitmapGlyph(c,CLASSIC[c]));
const assertInside=plan=>{
  for(const p of plan.points){assert.ok(p.x>=0&&p.y>=0);assert.ok(p.x+plan.diameter<=plan.width+.0001);assert.ok(p.y+plan.diameter<=plan.height+.0001);}
};
const assertCaption=plan=>{
  const r=plan.captionRect;
  for(const p of plan.points){assert.ok(p.x>=r.x&&p.y>=r.y);assert.ok(p.x+plan.diameter<=r.x+r.width+.0001);assert.ok(p.y+plan.diameter<=r.y+r.height+.0001);}
};
const assertNoOverlap=(points,d)=>{
  for(let i=0;i<points.length;i++)for(let j=i+1;j<points.length;j++){
    const a=points[i],b=points[j];assert.ok(Math.abs(a.x-b.x)>=d-.0001||Math.abs(a.y-b.y)>=d-.0001);
  }
};

test('word wrapping, long-token breaks and explicit line breaks retain glyphs',()=>{
  const input=glyphs('ALIVE ART\nABCDEFGHIJK');
  const rows=wrapGlyphs(input,29);
  assert.deepEqual(rows.map(row=>row.map(g=>g.char).join('')),['ALIVE','ART','ABCDE','FGHIJ','K']);
  assert.equal(rows.flat().filter(g=>g.points.length).length,19);
});

test('automatic layout keeps every hole inside portrait, landscape and extreme images',()=>{
  for(const [w,h] of [[1280,960],[600,1200],[3000,300],[300,3000],[64,64],[1200,20]]){
    const gs=glyphs('ALIVE ART '.repeat(12).trim());
    const plan=createPlan(w,h,gs,defaults);assertInside(plan);
    assert.equal(plan.points.length,gs.reduce((n,g)=>n+g.points.length,0));
    assert.ok(plan.height===h&&plan.diameter>0);
  }
});

test('manual larger holes increase actual line count without compressing pitch',()=>{
  const gs=glyphs('ALIVE ART ALIVE ART');
  const smaller=createPlan(1200,1800,gs,{...defaults,autoSize:false,holeSize:10});
  const larger=createPlan(1200,1800,gs,{...defaults,autoSize:false,holeSize:24});
  assert.ok(larger.lines.length>smaller.lines.length);
  assert.equal(larger.diameter,24);assert.ok(Math.abs(larger.pitch-24/.68)<.0001);assertInside(larger);
});

test('oversized manual type fails visibly instead of hiding or overlapping glyphs',()=>{
  assert.throws(()=>createPlan(1200,200,glyphs('ART '.repeat(30)),{...defaults,autoSize:false,holeSize:30}),/\u539f\u753b\u9ad8\u5ea6\u4e0d\u8db3/);
  const wideGlyph={char:'\u4e2d',width:12,height:12,points:[{x:0,y:0}]};
  assert.throws(()=>createPlan(1200,960,[wideGlyph],{...defaults,areaWidth:35,autoSize:false,holeSize:60}),/\u5355\u4e2a\u5b57\u7b26/);
});

test('donor grid is deterministic, in bounds, and has no intersecting square holes',()=>{
  const d=18,points=donorGrid(1280,960,800,d);
  assert.deepEqual(points,donorGrid(1280,960,800,d));
  for(let i=0;i<points.length;i++){
    const p=points[i];assert.ok(p.x>=0&&p.y>=0&&p.x+d<=1280&&p.y+d<=960);
    for(let j=i+1;j<points.length;j++){const q=points[j];assert.ok(Math.abs(p.x-q.x)>=d||Math.abs(p.y-q.y)>=d);}
  }
  assert.throws(()=>donorGrid(200,100,100,20),/\u65e0\u6cd5\u5bb9\u7eb3/);
});

test('transfer has one immutable source patch for each text cell and a growing caption',()=>{
  const gs=glyphs('ALIVE ART ALIVE ART');
  const small=createPlan(1200,1200,gs,{...defaults,mode:'transfer',autoSize:false,holeSize:12});
  const large=createPlan(1200,1200,gs,{...defaults,mode:'transfer',autoSize:false,holeSize:27});
  assert.equal(large.donors.length,large.points.length);assertInside(large);
  assert.ok(large.points.every(p=>p.y>=1200));assert.ok(large.height>small.height);
});

test('blank text preserves original image dimensions',()=>{
  const p=createPlan(1280,960,glyphs('  \n'),{...defaults,mode:'transfer'});
  assert.deepEqual([p.width,p.height,p.points.length],[1280,960,0]);
});

test('background choice changes for white and dark artwork with valid sRGB colors',()=>{
  const white=analyzeColors(new Uint8ClampedArray([255,255,255,255]));
  const dark=analyzeColors(new Uint8ClampedArray([0,0,0,255]));
  assert.notEqual(white.preferred,dark.preferred);
  assert.ok(white.meanL>.83&&dark.meanL<.83);
  for(const c of [...white.swatches,...dark.swatches])assert.match(c,/^#[0-9a-f]{6}$/);
});

test('SVG embeds original raster and uses matched clips for transferred patches',()=>{
  const plan=createPlan(1200,960,glyphs('ART'),{...defaults,mode:'transfer'});
  const svg=exportSvg('data:image/png;base64,AAAA',plan,{...defaults,mode:'transfer'});
  assert.ok(svg.includes('data:image/png;base64,AAAA'));
  assert.equal((svg.match(/<clipPath /g)||[]).length,plan.points.length);
  assert.equal((svg.match(/<use /g)||[]).length,plan.points.length);
  assert.ok(svg.includes(`viewBox="0 0 ${plan.width} ${plan.height}"`));
});

test('both positioning controls move the whole text block in image and both split orientations',()=>{
  for(const [mode,split] of [['punch','vertical'],['transfer','vertical'],['transfer','horizontal']]){
    const options={...defaults,mode,split,autoSize:false,holeSize:18};
    const start=createPlan(1200,960,glyphs('ALIVE\nART'),{...options,positionX:0,positionY:0});
    const end=createPlan(1200,960,glyphs('ALIVE\nART'),{...options,positionX:100,positionY:100});
    const dx=end.points[0].x-start.points[0].x,dy=end.points[0].y-start.points[0].y;
    assert.ok(dx>0&&dy>0,`${mode}/${split} retains useful free space on both axes`);
    for(let i=0;i<start.points.length;i++){
      assert.ok(Math.abs(end.points[i].x-start.points[i].x-dx)<.0001);
      assert.ok(Math.abs(end.points[i].y-start.points[i].y-dy)<.0001);
    }
    assertInside(start);assertInside(end);assertNoOverlap(start.points,start.diameter);
    if(mode==='transfer'){assertCaption(start);assertCaption(end);assert.deepEqual(start.donors,end.donors);}
  }
  const legacy=createPlan(1200,960,glyphs('ART'),{...defaults,position:30});
  const explicit=createPlan(1200,960,glyphs('ART'),{...defaults,position:90,positionY:30});
  assert.deepEqual(legacy.points,explicit.points);
});

test('automatic orientation adapts to artwork proportions and preserves original dimensions',()=>{
  for(const [w,h,expected] of [[600,1200,'horizontal'],[1200,600,'vertical'],[800,800,'vertical']]){
    const p=createPlan(w,h,glyphs('ART'),{...defaults,mode:'transfer',split:'auto'});
    assert.equal(p.split,expected);assert.equal(p.imageWidth,w);assert.equal(p.imageHeight,h);assertCaption(p);
    if(expected==='horizontal'){assert.equal(p.captionRect.x,w);assert.equal(p.captionRect.y,0);assert.ok(p.width>w);assert.ok(p.height>=h);}
    else{assert.equal(p.captionRect.x,0);assert.equal(p.captionRect.y,h);assert.equal(p.width,w);assert.ok(p.height>h);}
  }
});

test('independent original density, color, shape and size never change text cells or source samplers',()=>{
  const gs=glyphs('ALIVE ART');const options={...defaults,mode:'transfer',split:'horizontal',imageDensity:3.5,imageHoleSize:28,imageShape:'square'};
  const reference=createPlan(1200,960,gs,options);
  for(const change of [{imageDensity:0},{imageDensity:18},{imageHoleColor:'#bd245c'},{imageShape:'circle'},{imageHoleSize:40}]){
    const p=createPlan(1200,960,gs,{...options,...change});
    assert.deepEqual(p.points,reference.points);assert.deepEqual(p.donors,reference.donors);
    assert.equal(p.diameter,reference.diameter);assert.equal(p.sourceDiameter,reference.sourceDiameter);
    assert.deepEqual(p.lines,reference.lines);assert.deepEqual(p.captionRect,reference.captionRect);
  }
  const empty=createPlan(1200,960,gs,{...options,imageDensity:0});
  assert.equal(empty.imageHoles.length,0);assert.equal(empty.removedFraction,0);assert.ok(empty.points.length>0);
  const dense=createPlan(1200,960,gs,{...options,imageDensity:18});
  assert.ok(dense.imageHoles.length>reference.imageHoles.length);
  assert.ok(Math.abs(reference.removedFraction-.035)<reference.imageDiameter**2/(1200*960));
  const circle=createPlan(1200,960,gs,{...options,imageShape:'circle'});
  assert.ok(Math.abs(circle.removedFraction-.035)<circle.imageDiameter**2/(1200*960));
  assertNoOverlap(dense.imageHoles,dense.imageDiameter);
  for(const p of dense.imageHoles)assert.ok(p.x>=0&&p.y>=0&&p.x+dense.imageDiameter<=dense.imageWidth&&p.y+dense.imageDiameter<=dense.imageHeight);
  assert.equal(createPlan(1200,960,gs,{...options,imageHoleColor:null}).imageHoleColor,options.paperColor);
});

test('manual side-by-side text wraps and grows without compressing or overlapping characters',()=>{
  const gs=glyphs('ALIVE ART ALIVE ART ALIVE ART ALIVE ART');
  const options={...defaults,mode:'transfer',split:'horizontal',autoSize:false};
  const small=createPlan(1200,500,gs,{...options,holeSize:12});
  const large=createPlan(1200,500,gs,{...options,holeSize:38});
  assert.ok(large.lines.length>small.lines.length);assert.ok(large.height>small.height);
  assert.equal(large.diameter,38);assert.ok(Math.abs(large.pitch-38/.68)<.0001);assert.equal(large.points.length,small.points.length);
  assertCaption(large);assertInside(large);assertNoOverlap(large.points,large.diameter);
});

test('large manual caption samples smaller source patches without changing requested text geometry',()=>{
  const p=createPlan(1200,100,glyphs('ART ART ART ART ART ART'),{...defaults,mode:'transfer',split:'horizontal',autoSize:false,holeSize:30,imageDensity:0});
  assert.equal(p.diameter,30);assert.ok(p.sourceDiameter<p.diameter);assert.equal(p.donors.length,p.points.length);
  assertNoOverlap(p.donors,p.sourceDiameter);assertNoOverlap(p.points,p.diameter);assertCaption(p);
  for(const q of p.donors)assert.ok(q.x+p.sourceDiameter<=p.imageWidth+.0001&&q.y+p.sourceDiameter<=p.imageHeight+.0001);
});

test('Canvas renderer preserves original-only preview dimensions and immutable sample inputs',()=>{
  const options={...defaults,mode:'transfer',split:'horizontal',autoSize:false,holeSize:30,imageDensity:5,imageShape:'circle',imageHoleColor:'#123456'};
  const p=createPlan(1200,100,glyphs('ART ART ART ART ART ART'),options);
  const source={width:1200,height:100};const draws=[],fills=[],arcs=[];
  const ctx={scale(){},drawImage(...args){draws.push(args);},fillRect(){},beginPath(){},rect(){},moveTo(){},arc(...args){arcs.push(args);},fill(){fills.push(this.fillStyle);},save(){},restore(){},clip(){},stroke(){}};
  const canvas={getContext(){return ctx;}};
  renderArt(canvas,source,p,options,{original:true});assert.equal(canvas.width,1200);assert.equal(canvas.height,100);assert.equal(draws.length,1);
  draws.length=0;renderArt(canvas,source,p,options);
  assert.equal(canvas.width,p.width);assert.equal(canvas.height,p.height);assert.equal(draws.length,1+p.points.length);
  assert.equal(fills[0],options.imageHoleColor);assert.equal(arcs.length,p.imageHoles.length);
  for(let i=1;i<draws.length;i++){
    const args=draws[i];assert.equal(args[0],source);assert.ok(Math.abs(args[3]-p.sourceDiameter)<.0001);assert.ok(Math.abs(args[4]-p.sourceDiameter)<.0001);assert.equal(args[7],p.diameter);assert.equal(args[8],p.diameter);
  }
  assert.deepEqual(source,{width:1200,height:100});
});

test('SVG matches independent original hole geometry, text shape, color and scaled source sampling',()=>{
  const options={...defaults,mode:'transfer',split:'horizontal',autoSize:false,holeSize:30,imageDensity:5,imageShape:'circle',imageHoleColor:'#123456',shape:'square'};
  const p=createPlan(1200,100,glyphs('ART ART ART ART ART ART'),options);
  const svg=exportSvg('data:image/png;base64,AAAA',p,options);
  assert.equal((svg.match(/<circle /g)||[]).length,p.imageHoles.length);
  assert.equal((svg.match(/fill="#123456"/g)||[]).length,p.imageHoles.length);
  assert.equal((svg.match(/<clipPath /g)||[]).length,p.points.length);
  assert.equal((svg.match(/<use /g)||[]).length,p.points.length);
  const rounded=x=>Math.round(x*10000)/10000;
  const q=p.imageHoles[0];assert.ok(svg.includes(`cx="${rounded(q.x+p.imageDiameter/2)}" cy="${rounded(q.y+p.imageDiameter/2)}" r="${rounded(p.imageDiameter/2)}"`));
  assert.ok(svg.includes(`scale(${rounded(p.diameter/p.sourceDiameter)})`));
  assert.ok(svg.includes(`width="${p.imageWidth}" height="${p.imageHeight}"`));
  assert.ok(svg.includes(`viewBox="0 0 ${p.width} ${p.height}"`));
  const noHoles=exportSvg('data:image/png;base64,AAAA',createPlan(1200,100,glyphs('ART'),{...options,imageDensity:0}),{...options,imageDensity:0});
  assert.equal((noHoles.match(/<circle /g)||[]).length,0);assert.ok(noHoles.includes('<clipPath '));
});
