const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb } = require('pdf-lib');
const fontkit = require('@pdf-lib/fontkit');
const { badRequest } = require('./AppError');
const BLACK = rgb(0.07,0.1,0.13), MUTED = rgb(.3,.35,.4), GREEN = rgb(.08,.48,.28), LINE = rgb(.85,.87,.89), PALE = rgb(.94,.96,.97);
const fontBytes = ['regular','bold'].map(name=>fs.readFileSync(path.join(__dirname,`report-${name}.ttf`)));

/** Bounded vector report layout, independent of viewport, themes and UI pagination. */
async function createReport({title,generatedAt,period,landscape=false}) {
  const pdf=await PDFDocument.create();pdf.registerFontkit(fontkit);
  const fonts=await Promise.all(fontBytes.map(bytes=>pdf.embedFont(bytes,{subset:true})));
  const widths = [new Map(),new Map()];
  const measure = (text, size, bold = false) => {
    const cache = widths[bold ? 1 : 0]; let value = cache.get(text);
    if (value === undefined) { value = fonts[bold ? 1 : 0].widthOfTextAtSize(text, 1); if (cache.size < 4096 && text.length < 1000) cache.set(text, value); }
    return value * size;
  };
  const supported=new Set(fonts[0].getCharacterSet());let substituted=false;
  const width=landscape?792:612,height=landscape?612:792,margin=44,usable=width-2*margin,bottom=48;
  let page,y;
  const clean=value=>Array.from(String(value ?? 'No data').normalize('NFC').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g,'')).map(char=>{
    if(char==='\n'||supported.has(char.codePointAt(0)))return char;
    substituted=true;return `[U+${char.codePointAt(0).toString(16).toUpperCase()}]`;
  }).join('');
  const newPage=()=>{
    if(pdf.getPageCount()>=250)throw badRequest('This PDF is too long. Narrow the report filters and try again.');
    page=pdf.addPage([width,height]);y=height-margin;
    page.drawText('TRACE  |  Registrar Reports',{x:margin,y:y-9,size:9,font:fonts[1],color:MUTED});y-=25;
  };
  const ensure=space=>{if(y-space<bottom)newPage();};
  function wrap(value,maxWidth,size=10,bold=false) {
    const lines=[];
    for(const paragraph of clean(value).split('\n')){
      let current='';
      for(const word of paragraph.split(/\s+/)){
        if(!word)continue;
        if(current && measure(current+' '+word,size,bold)>maxWidth){lines.push(current);current='';}
        let part='';
        for(const char of word){if(part && measure(part+char,size,bold)>maxWidth){if(current){lines.push(current);current='';}lines.push(part);part='';}part+=char;}
        current=current?current+' '+part:part;
      }
      lines.push(current);
    }
    return lines;
  }
  function text(value,{size=10,bold=false,color=BLACK,gap=8}={}) {
    for(const line of wrap(value,usable,size,bold)){ensure(size*1.35);page.drawText(line,{x:margin,y:y-size,size,font:fonts[bold?1:0],color});y-=size*1.35;}
    y-=gap;
  }
  const heading=value=>{ensure(100);text(value,{size:13,bold:true,gap:8});};
  function table(headers,rows,widths,{size=9.2,empty='No recorded data in this report.'}={}) {
    const columns=widths.map(value=>usable*value/widths.reduce((a,b)=>a+b,0)),lineHeight=size*1.3,pad=6;
    const paint=(cells,header=false)=>{
      const lines=cells.map((cell,i)=>wrap(cell,columns[i]-2*pad,size,header));
      let offset=0,remaining=Math.max(...lines.map(l=>l.length));
      while(offset<remaining){
        let fit=Math.floor((y-bottom-2*pad)/lineHeight);
        if(fit<1){newPage();if(!header)drawHeader();fit=Math.floor((y-bottom-2*pad)/lineHeight);}
        const count=Math.min(remaining-offset,fit),rowHeight=count*lineHeight+2*pad;
        let x=margin;
        for(let i=0;i<cells.length;i++){
          page.drawRectangle({x,y:y-rowHeight,width:columns[i],height:rowHeight,borderWidth:.5,borderColor:LINE,color:header?PALE:rgb(1,1,1)});
          lines[i].slice(offset,offset+count).forEach((line,index)=>page.drawText(line,{x:x+pad,y:y-pad-size-index*lineHeight,size,font:fonts[header?1:0],color:BLACK}));x+=columns[i];
        }
        y-=rowHeight;offset+=count;
        if(offset<remaining){newPage();if(!header)drawHeader();}
      }
    };
    const drawHeader=()=>paint(headers,true);
    ensure(55);drawHeader();
    if(!rows.length)paint(headers.map((_,i)=>i===0?empty:''));
    for(const row of rows){
      const needed=Math.max(...row.map((cell,i)=>wrap(cell,columns[i]-2*pad,size).length))*lineHeight+2*pad;
      if(y-Math.min(needed,140)<bottom){newPage();drawHeader();}
      paint(row);
    }
    y-=16;
  }
  function bars(title,entries,{unit='documents',max=12,note}={}) {
    heading(title);
    if(!entries.length){text('No measured data available.');return;}
    const measured=entries.filter(row=>Number.isFinite(row.value) && row.value>=0),shown=measured.slice(0,max),ceiling=Math.max(1,...shown.map(row=>row.value));
    if(!shown.length){text('No measured data available.');return;}
    if(note)text(note,{size:9,color:MUTED});
    for(const row of shown){
      const caption=`${row.label}   ${row.value.toLocaleString('en-PH')} ${unit}`;
      ensure(wrap(caption,usable,9).length*12.15+24);
      text(caption,{size:9,gap:3});
      page.drawRectangle({x:margin,y:y-7,width:usable,height:7,color:PALE});
      if(row.value>0)page.drawRectangle({x:margin,y:y-7,width:usable*row.value/ceiling,height:7,color:GREEN});
      y-=18;
    }
    if(measured.length>shown.length)text(`Chart shows ${shown.length} of ${measured.length} groups. Complete values follow in the tables.`,{size:9,color:MUTED});
    y-=6;
  }
  function series(title,rows) {
    ensure(rows.length?205:100);heading(title);
    if(!rows.length){text('No recorded releases in this period.');return;}
    ensure(155);const chartHeight=92,chartWidth=usable-30,startX=margin+25,base=y-105,maximum=Math.max(1,...rows.map(row=>row.value));
    page.drawLine({start:{x:startX,y:base},end:{x:startX+chartWidth,y:base},thickness:.6,color:MUTED});
    page.drawText(String(maximum),{x:margin,y:base+chartHeight-4,size:8,font:fonts[0],color:MUTED});
    page.drawText('0',{x:margin,y:base-3,size:8,font:fonts[0],color:MUTED});
    const points=rows.map((row,i)=>({x:startX+(rows.length===1?chartWidth/2:chartWidth*i/(rows.length-1)),y:base+chartHeight*row.value/maximum}));
    points.forEach((point,i)=>{if(i)page.drawLine({start:points[i-1],end:point,thickness:1.4,color:GREEN});if(rows.length<=45)page.drawCircle({...point,size:2,color:GREEN});});
    page.drawText(clean(rows[0].label),{x:startX,y:base-15,size:8,font:fonts[0],color:MUTED});
    if(rows.length>1){const last=clean(rows.at(-1).label);page.drawText(last,{x:startX+chartWidth-fonts[0].widthOfTextAtSize(last,8),y:base-15,size:8,font:fonts[0],color:MUTED});}
    y=base-32;text('Recorded release dates only; absent dates are not filled with invented measurements.',{size:9,color:MUTED});
  }
  function advice(analysis){
    ensure(150);heading('Analysis');
    text(analysis?.source==='ai_engine_aggregate_rules'?'AI service analysis from the report aggregates. Descriptive advice is separate from measured results.':'AI analysis unavailable. No conclusion is inferred from the missing analysis.');
    for(const row of analysis?.insights || []){ensure(95);text(row.title,{bold:true,gap:3});text(row.message);if(Number.isFinite(row.sample_size))text(`${row.sample_size} recorded observations`,{size:9,color:MUTED});}
  }
  async function save(){
    if(substituted)text('Text note: characters outside the embedded font are written as explicit Unicode code points.',{size:9,color:MUTED});
    for(const [i,p] of pdf.getPages().entries()){
      const footer=`${i+1} / ${pdf.getPageCount()}   |   Generated ${generatedAt}`;
      p.drawText(footer,{x:margin,y:25,size:8,font:fonts[0],color:MUTED});
    }
    pdf.setTitle(title);pdf.setAuthor('Project TRACE');pdf.setSubject('Authorized registrar report');pdf.setCreationDate(new Date());
    return Buffer.from(await pdf.save());
  }
  newPage();text(title,{size:20,bold:true,gap:10});text(`Generated ${generatedAt} (Asia/Manila)`,{size:9,color:MUTED});text(period,{size:10});
  return{text,heading,table,bars,series,advice,save};
}
module.exports={createReport};
