(function(global){
'use strict';

const base=global.FAA_GRADER;
if(!base || typeof base.grade!=='function'){
  console.warn('[oral grader] log tune patch could not find FAA_GRADER');
  return;
}
if(base.__logTune20260821)return;

const originalGrade=base.grade.bind(base);
const RANK={fail:0,almost:1,pass:2};

function norm(s){
  let x=String(s||'').toLowerCase().replace(/[’]/g,"'");
  x=x.replace(/(?<=\d),(?=\d)/g,'');
  x=x
   .replace(/π/g,' pi ')
   .replace(/[×*]/g,' x ')
   .replace(/[÷]/g,' / ')
   .replace(/²/g,' squared ')
   .replace(/³/g,' cubed ')
   .replace(/\bohams?\b|\bohms?\b|\bohm s\b/g,'ohm')
   .replace(/\bgasses\b/g,'gases')
   .replace(/\bbeaings\b|\bbearins\b/g,'bearings')
   .replace(/\bthurst\b/g,'thrust')
   .replace(/\bwattas\b/g,'watts')
   .replace(/\bair worthiness\b/g,'airworthiness')
   .replace(/\bhelicpter\b/g,'helicopter')
   .replace(/\bman~al\b/g,'manual')
   .replace(/\bmoisutre\b/g,'moisture')
   .replace(/\bcontaminents\b/g,'contaminants')
   .replace(/\bnoticible\b/g,'noticeable')
   .replace(/\btempreture\b|\btemperture\b/g,'temperature')
   .replace(/\bfarenhight\b/g,'fahrenheit')
   .replace(/\bapendix\b|\bappendex\b/g,'appendix')
   .replace(/\bsqaured\b|\bsqured\b/g,'squared');
  return x.replace(/[^a-z0-9./^+=\-\s]+/g,' ').replace(/\s+/g,' ').trim();
}
function words(s){return norm(s).match(/[a-z0-9.]+/g)||[]}
function any(s,terms){const n=norm(s);return terms.some(t=>n.includes(norm(t)))}
function numValues(s){return (norm(s).match(/\d+(?:\.\d+)?/g)||[]).map(Number).filter(Number.isFinite)}
function lev(a,b){
  if(a===b)return 0;
  if(Math.abs(a.length-b.length)>3)return 99;
  let prev=Array.from({length:b.length+1},(_,i)=>i);
  for(let i=1;i<=a.length;i++){
    const cur=[i];
    for(let j=1;j<=b.length;j++)cur[j]=Math.min(cur[j-1]+1,prev[j]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1));
    prev=cur;
  }
  return prev[b.length];
}
function fuzzy(s,target,maxDist=1){
  const t=norm(target).replace(/[^a-z0-9]/g,'');
  if(!t)return false;
  return words(s).some(w=>{
    w=w.replace(/[^a-z0-9]/g,'');
    if(w===t)return true;
    if(w.length<4||t.length<4||Math.abs(w.length-t.length)>maxDist)return false;
    return lev(w,t)<=maxDist;
  });
}
function hasNum(s,v,tol=0.001){return numValues(s).some(x=>Math.abs(x-v)<=tol)}
function check(label,met){return {label,met:!!met}}
function mk(kind,checks,required,levelOverride){
  const count=checks.filter(c=>c.met).length;
  let level=levelOverride||((count>=required)?'pass':(count>=Math.max(1,required-1)?'almost':'fail'));
  if(required===1&&!count&&!levelOverride)level='fail';
  return {kind,level,checks,required,count};
}
function custom(kind,level,checks,required){return {kind,level,checks,required,count:checks.filter(c=>c.met).length}}
function resultFrom(rule,baseResult){
  const passed=rule.level==='pass';
  return {
    ...(baseResult||{}),
    source:'log-tuned-rule',
    level:rule.level,
    passed,
    count:rule.count,
    total:rule.checks.length,
    required:rule.required,
    concepts:rule.checks.map(c=>({label:c.label,met:c.met,score:c.met?1:0,matchedTokens:[],matchedTerm:null})),
    confidence:passed?.96:(rule.level==='almost'?.72:.5),
    feedback:passed?'The required key ideas were recognized.':rule.level==='almost'?'Your answer is close. Add or clarify the missing key idea.':'Review the expected answer and try again using the key technical ideas.',
    reviewRecommended:!passed,
    logTuned:true
  };
}
function nearExact(answer,expected){
  const a=norm(answer),e=norm(expected);
  if(!a||!e)return false;
  if(a===e)return true;
  const aw=words(a),ew=words(e);
  if(aw.length!==ew.length||aw.length>12)return false;
  return aw.every((w,i)=>w===ew[i]||(w.length>=5&&ew[i]&&lev(w,ew[i])<=1));
}

function special(q,a){
  const id=q&&q.id||'';
  const n=norm(a);
  const ns=numValues(a);

  // ---------- Hard guards learned from false-positive log entries ----------
  switch(id){

    case 'GEN-CH01-Q011': {
      // Only override the base grader when explicit exponent notation is given.
      // This catches the logged false positive "8^8 = 64" while preserving
      // concise spoken answers such as "multiply the number by itself."
      const m=n.match(/\b(\d+(?:\.\d+)?)\s*\^\s*(\d+(?:\.\d+)?)\s*(?:=|equals?|is)\s*(\d+(?:\.\d+)?)\b/);
      if(!m)return null;
      const x=Number(m[1]),exp=Number(m[2]),y=Number(m[3]);
      const correct=exp===2 && Math.abs(y-x*x)<.001;
      const method=(n.includes('multiply')||n.includes('times'))&&(fuzzy(n,'itself',2)||n.includes('it self'));
      return custom('hard',correct?'pass':method?'almost':'fail',[check('Correct square example',correct)],1);
    }
    case 'GEN-CH01-Q015': {
      const circ=fuzzy(n,'circumference',3)||n.includes('conference'); // common speech transcript
      const diam=fuzzy(n,'diameter',2);
      const relation=circ&&diam;
      const correctNum=ns.some(x=>Math.abs(x-3.1416)<=.01||Math.abs(x-3.14)<=.01);
      const suspiciousNum=ns.some(x=>x>10 && ![180,360].includes(x));
      if(suspiciousNum&&!correctNum)return custom('hard',relation?'almost':'fail',[check('Circumference-to-diameter relationship',relation),check('Pi is about 3.1416',false)],1);
      return mk('hard',[check('Defines pi by the circumference/diameter relationship or correct value',relation||correctNum)],1);
    }
    case 'GEN-CH01-Q017': {
      const compact=n.replace(/\s+/g,'');
      const pi=any(n,['pi','pie'])||compact.includes('pi')||ns.some(x=>Math.abs(x-3.1416)<=.01||Math.abs(x-3.14)<=.01);
      const radius=n.includes('radius')||/\br\b/.test(n)||compact.includes('pir');
      const squared=n.includes('squared')||n.includes('second power')||n.includes('power of 2')||/\br\s*\^\s*2\b/.test(n)||compact.includes('r^2')||/\br\s+x\s+r\b/.test(n)||n.includes('radius x radius');
      const wrongHalf=n.includes('half')||/(^|[^0-9])1\/2(?![0-9])/.test(n);
      const diameter=n.includes('diameter')&&!radius;
      if(wrongHalf||diameter)return custom('hard','fail',[check('π × radius squared',false)],1);
      const count=[pi,radius,squared].filter(Boolean).length;
      return custom('hard',count===3?'pass':count===2?'almost':'fail',[check('π × radius squared',count===3)],1);
    }
    case 'GEN-CH02-Q010': {
      const absolute=fuzzy(n,'absolute',2)&&fuzzy(n,'zero',1);
      const zero=fuzzy(n,'zero',1);
      return custom('hard',absolute?'pass':zero?'almost':'fail',[check('Absolute zero',absolute)],1);
    }
    case 'GEN-CH02-Q019': {
      const relative=fuzzy(n,'relative',2);
      const humidity=fuzzy(n,'humidity',2)||fuzzy(n,'humanity',2); // common speech-recognition substitution
      const absolute=fuzzy(n,'absolute',2)&&humidity;
      if(absolute&&!relative)return custom('hard','fail',[check('Relative humidity',false)],1);
      return custom('hard',(relative&&humidity)?'pass':humidity?'almost':'fail',[check('Relative humidity',relative&&humidity)],1);
    }
    case 'GEN-CH02-Q023': {
      const lift=n.includes('lift')&&any(n,['increase','increases','increased','more']);
      const drag=n.includes('drag')&&any(n,['increase','increases','increased','more']);
      const stall=n.includes('stall')&&(any(n,['decrease','decreases','decreased','lower','less'])||fuzzy(n,'decrease',2));
      return mk('hard',[check('Lift increases',lift),check('Drag increases',drag),check('Stall speed decreases',stall)],3);
    }
    case 'GEN-CH03-Q004': {
      const compact=n.replace(/\s+/g,'');
      const correctSymbolic=[
        /(?:e|v|voltage)=(?:i|current)x(?:r|resistance)/,
        /(?:e|v|voltage)=(?:r|resistance)x(?:i|current)/,
        /(?:r|resistance)=(?:e|v|voltage)\/(?:i|current)/,
        /(?:i|current)=(?:e|v|voltage)\/(?:r|resistance)/
      ].some(rx=>rx.test(compact));
      const correctWords=
        (n.includes('voltage')&&n.includes('current')&&n.includes('resistance')&&
         ((n.includes('voltage')&&any(n,['current x resistance','current times resistance','current multiplied by resistance']))||
          (n.includes('resistance')&&any(n,['voltage / current','voltage divided by current','voltage over current']))||
          (n.includes('current')&&any(n,['voltage / resistance','voltage divided by resistance','voltage over resistance']))));
      const hasEquation=/=/.test(n)||any(n,['equals','equal to','times','multiplied','divided','over']);
      const mentionsAll=any(n,['voltage',' e '])&&any(n,['current',' i '])&&any(n,['resistance',' r ']);
      if(correctSymbolic||correctWords)return mk('hard',[check('Correct Ohm-law relationship',true)],1);
      return custom('hard',hasEquation?'fail':mentionsAll?'almost':'fail',[check('Correct Ohm-law relationship',false)],1);
    }
    case 'GEN-CH03-Q020': {
      const faulty=(n.includes('faulty')||n.includes('bad')||n.includes('failed')||n.includes('weak')||n.includes('damaged'))&&n.includes('cell');
      const imbalance=n.includes('imbalance')||n.includes('unbalanced')||(n.includes('cell')&&n.includes('balance'));
      return mk('hard',[check('Faulty cells',faulty),check('Cell imbalance',imbalance)],2);
    }
    case 'GEN-CH03-Q021': {
      const v=fuzzy(n,'voltage',2)||fuzzy(n,'volt',1);
      const i=fuzzy(n,'current',2)||any(n,['amps','amperage','ampere']);
      const r=fuzzy(n,'resistance',2)||fuzzy(n,'ohm',2);
      return mk('hard',[check('Voltage',v),check('Current',i),check('Resistance',r)],3);
    }
    case 'GEN-CH06-Q009': return mk('hard',[check('Add weight',any(n,['add weight','add the weight','adding weight']))],1);
    case 'GEN-CH06-Q010': return mk('hard',[check('Remove weight',any(n,['remove weight','remove the weight','removing weight']))],1);
    case 'GEN-CH06-Q011': return mk('hard',[check('Remove weight',any(n,['remove weight','remove the weight','removing weight']))],1);
    case 'GEN-CH06-Q012': return mk('hard',[check('Add weight',any(n,['add weight','add the weight','adding weight']))],1);
    case 'GEN-CH08-Q008': {
      const seven=n.includes('7')||n.includes('seven');
      const nineteen=n.includes('19')||n.includes('nineteen');
      const extra=any(n,['extra flexible','flexible']);
      if(seven&&nineteen)return mk('hard',[check('7 × 19 extra-flexible cable',true)],1);
      if(seven||extra)return custom('hard','almost',[check('7 × 19 extra-flexible cable',false)],1);
      return custom('hard','fail',[check('7 × 19 extra-flexible cable',false)],1);
    }
    case 'GEN-CH10-Q015': {
      const id=any(n,['inside diameter','internal diameter',' i d ',' id '])||(n.includes('diameter')&&n.includes('inside'));
      const sixteenth=n.includes('1/16')||(n.includes('sixteenth')||n.includes('16th'));
      return mk('hard',[check('Inside diameter',id),check('In 1/16-inch increments',sixteenth)],2);
    }
    case 'GEN-CH12-Q004': {
      const solvent=fuzzy(n,'solvent',2);
      const emulsion=fuzzy(n,'emulsion',2);
      return mk('hard',[check('Solvents',solvent),check('Emulsions',emulsion)],2);
    }
    case 'GEN-CH12-Q018': {
      const cor=any(n,['corrosion','corrosion resistance','corrosion protection','protective film','protect aluminum']);
      const paint=any(n,['paint adhesion','paint adhere','paint stick','adhesion','primer adhere','paint application','paint bonding','paint bond']);
      return mk('hard',[check('Corrosion protection',cor),check('Promotes paint adhesion',paint)],2);
    }
    case 'GEN-CH14-Q023': {
      const records=any(n,['maintenance record','maintenance records','aircraft record','aircraft records','logbook','log book'])||((fuzzy(n,'maintenance',3)||fuzzy(n,'maintencnce',2))&&fuzzy(n,'record',2));
      const form337=n.includes('337')||any(n,['form three thirty seven','form three-thirty-seven']);
      const wrongForm=/\b331\b/.test(n);
      if(wrongForm&&!form337)return custom('hard','almost',[check('Aircraft maintenance records',records),check('FAA Form 337',false)],2);
      return mk('hard',[check('Aircraft maintenance records',records),check('FAA Form 337',form337)],2);
    }
    case 'GEN-CH15-Q001': {
      const p43=(n.includes('part 43')||n.includes('far 43')||n.includes('14 cfr 43')||n.includes('cfr 14 43'));
      const appA=n.includes('appendix a')||n.includes('appendix alpha')||(fuzzy(n,'appendix',2)&&/\ba\b/.test(n));
      return custom('hard',(p43&&appA)?'pass':p43?'almost':'fail',[check('14 CFR Part 43, Appendix A',p43&&appA)],1);
    }
    case 'PP-CH01-Q002': {
      const plain=fuzzy(n,'plain',1),ball=fuzzy(n,'ball',1),roller=fuzzy(n,'roller',2);
      return mk('hard',[check('Plain bearings',plain),check('Ball bearings',ball),check('Roller bearings',roller)],3);
    }
    case 'PP-CH02-Q026': {
      const rpm=n.includes('rpm')||n.includes('r.p.m');
      const percent=n.includes('percent')||n.includes('percentage');
      if(percent)return custom('hard','fail',[check('Engine RPM (not percent RPM)',false)],1);
      return mk('hard',[check('Engine RPM',rpm)],1);
    }
    case 'PP-CH07-Q030': {
      const constant=fuzzy(n,'constant',2);
      const positive=fuzzy(n,'positive',2)&&fuzzy(n,'displacement',2);
      return custom('hard',constant?'pass':positive?'almost':'fail',[check('Constant displacement',constant)],1);
    }
    case 'PP-CH13-Q001': {
      const manual=n.includes('maintenance')&&n.includes('manual');
      const part43=n.includes('43')&&(n.includes('far')||n.includes('part')||n.includes('cfr'));
      const appD=n.includes('appendix d')||n.includes('appendix delta');
      const exact43=part43&&appD;
      const count=(manual?1:0)+(exact43?1:0);
      if(count===2)return mk('hard',[check("Manufacturer's maintenance manual",true),check('FAR Part 43, Appendix D',true)],2);
      if(manual||part43)return custom('hard','almost',[check("Manufacturer's maintenance manual",manual),check('FAR Part 43, Appendix D',exact43)],2);
      return custom('hard','fail',[check("Manufacturer's maintenance manual",false),check('FAR Part 43, Appendix D',false)],2);
    }
    case 'ASA-P-G-K-005': {
      const cs=n.split(/\band\b|,|;|\bwhile\b|\bbut\b/).map(x=>x.trim()).filter(Boolean);
      const hot=c=>any(c,['hot','high temperature','higher temperature']);
      const cold=c=>any(c,['cold','low temperature','lower temperature']);
      const inc=c=>any(c,['increase','increases','increased','raises','raise','higher viscosity','thicker','thicken']);
      const dec=c=>any(c,['decrease','decreases','decreased','lowers','lower','lower viscosity','thinner','thin']);
      const hotInc=cs.some(c=>hot(c)&&inc(c));
      const coldDec=cs.some(c=>cold(c)&&dec(c));
      const hotDec=cs.some(c=>hot(c)&&dec(c));
      const coldInc=cs.some(c=>cold(c)&&inc(c));
      if((hotDec||coldInc)&&!(hotInc&&coldDec))return custom('hard','fail',[check('Viscosity increases when hot',hotInc),check('Viscosity decreases when cold',coldDec)],2);
      return mk('hard',[check('Viscosity increases when hot',hotInc),check('Viscosity decreases when cold',coldDec)],2);
    }
    case 'ASA-P-H-K-014': {
      const sg=n.includes('starter-generator')||n.includes('starter generator');
      const electric=n.includes('electric')&&n.includes('starter');
      return custom('hard',sg?'pass':electric?'almost':'fail',[check('Starter-generator',sg)],1);
    }

    case 'GEN-CH01-Q012': {
      const sci=(n.includes('scientific')||fuzzy(n,'scientific',3))&&(n.includes('notation')||fuzzy(n,'notation',3));
      const power=n.includes('power')&&(n.includes('10')||n.includes('ten'));
      return mk('hard',[check('Scientific notation',sci),check('Uses powers of 10',power)],2);
    }
    case 'GEN-CH02-Q001': {
      const space=any(n,['occupies space','take up space','takes up space','has volume'])||(n.includes('space')&&(fuzzy(n,'occupies',2)||fuzzy(n,'occupied',2)));
      const mass=any(n,['has mass','have mass'])||/\bmass\b/.test(n);
      return mk('hard',[check('Occupies space',space),check('Has mass',mass)],2);
    }
    case 'GEN-CH02-Q009': {
      return mk('hard',[check('Conduction',fuzzy(n,'conduction',2)),check('Convection',fuzzy(n,'convection',2)),check('Radiation',fuzzy(n,'radiation',2))],3);
    }
    case 'GEN-CH02-Q016': {
      const exact=ns.some(x=>Math.abs(x-29.92)<=.02||Math.abs(x-1013.2)<=.5);
      const rounded=ns.some(x=>Math.abs(x-30)<=.02);
      return custom('hard',exact?'pass':rounded?'almost':'fail',[check('29.92 inHg or 1013.2 mb',exact)],1);
    }
    case 'GEN-CH03-Q010': {
      const low=ns.some(x=>Math.abs(x-1.275)<=.002),high=ns.some(x=>Math.abs(x-1.3)<=.002);
      return mk('hard',[check('1.275',low),check('1.300',high)],2);
    }
    case 'GEN-CH03-Q011': {
      const low=(any(n,['less','below','lower','under'])&&n.includes('70'));
      const high=(any(n,['more','above','higher','over','greater'])&&n.includes('90'));
      const outside=n.includes('outside')&&n.includes('70')&&n.includes('90');
      const wrongBetween=n.includes('between')&&n.includes('70')&&n.includes('90');
      if(wrongBetween)return custom('hard','fail',[check('Below 70°F',false),check('Above 90°F',false)],2);
      if(outside)return mk('hard',[check('Below 70°F',true),check('Above 90°F',true)],2);
      if(!low&&!high&&n.includes('70')&&n.includes('90'))return custom('hard','almost',[check('Correct boundary values',true),check('Correct outside-the-range directions',false)],2);
      return mk('hard',[check('Below 70°F',low),check('Above 90°F',high)],2);
    }
    case 'GEN-CH05-Q007': {
      const hidden=n.includes('hidden')&&any(n,['short','evenly spaced','dash']);
      const phantom=n.includes('phantom')&&n.includes('long')&&any(n,['two short','2 short']);
      const center=any(n,['center','middle'])&&n.includes('long')&&n.includes('short');
      return mk('hard',[check('Hidden line: short evenly spaced dashes',hidden),check('Phantom line: long dash with two short dashes',phantom),check('Center line: alternating long and short dashes',center)],3);
    }
    case 'GEN-CH06-Q018': {
      const source=n.includes('tcds')||n.includes('type certificate data sheet');
      const method=(n.includes('spirit')&&n.includes('level'))||n.includes('plumb bob');
      return mk('hard',[check('Leveling instructions in TCDS',source),check('Describes a leveling method',method)],2);
    }
    case 'GEN-CH14-Q003': {
      const ok=n.includes('23')&&any(n,['far','part']);
      return mk('hard',[check('FAR Part 23',ok)],1);
    }
    case 'GEN-CH14-Q027': {
      const exact=n.includes('43.11')||n.includes('43 11');
      const broad=n.includes('part 43')||n.includes('far 43');
      return custom('hard',exact?'pass':broad?'almost':'fail',[check('FAR 43.11',exact)],1);
    }
    case 'GEN-CH14-Q031': {
      const entry=any(n,['maintenance entry','maintenance entries','maintenance record','record entry'])||(n.includes('entry')&&n.includes('record'));
      const disc=fuzzy(n,'discrepancy',2)||fuzzy(n,'discrepancies',2)||any(n,['unairworthy item','unairworthy items','defect list']);
      return mk('hard',[check('Maintenance record entry',entry),check('Discrepancy/unairworthy-item list',disc)],2);
    }
    case 'GEN-CH14-Q033': {
      const exact=n.includes('65.95')||n.includes('65 95');
      const broad=n.includes('part 65')||n.includes('far 65');
      return custom('hard',exact?'pass':broad?'almost':'fail',[check('FAR 65.95',exact)],1);
    }
    case 'GEN-CH14-Q035': {
      const tank=n.includes('fuel tank');
      const area=any(n,['passenger','baggage','cargo']);
      return mk('hard',[check('Fuel tank installation',tank),check('Passenger/baggage compartment',area)],2);
    }
    case 'GEN-CH15-Q016': {
      return mk('hard',[check('120 days',n.includes('120'))],1);
    }
    case 'PP-CH01-Q003': {
      const master=n.includes('master');
      const articul=any(n,['articulating','articulate']);
      return mk('hard',[check('Master rod',master),check('Articulating rods',articul)],2);
    }
    case 'PP-CH02-Q013': {
      return mk('hard',[check('Valves',/\bvalves?\b/.test(n)),check('Piston rings',n.includes('ring')),check('Cylinder wall',n.includes('cylinder wall')||/\bwall\b/.test(n)),check('Cylinder-head gasket',n.includes('head gasket')||n.includes('cylinder head gasket')||n.includes('gasket'))],4);
    }
    case 'PP-CH07-Q029': {
      const constant=fuzzy(n,'constant',2),variable=fuzzy(n,'variable',2);
      if(n.includes('positive')&&!constant)return custom('hard','fail',[check('Constant displacement',false),check('Variable displacement',variable)],2);
      return mk('hard',[check('Constant displacement',constant),check('Variable displacement',variable)],2);
    }
    case 'ASA-P-M-K-022': {
      const minor=n.includes('minor'),major=n.includes('major');
      if(major&&!minor)return custom('hard','fail',[check('Only minor repairs/alterations',false)],1);
      return mk('hard',[check('Only minor repairs/alterations',minor)],1);
    }
  }

  // ---------- High-confidence false-negative fixes from the log ----------
  switch(id){
    case 'GEN-CH01-Q006': {
      const divide=any(n,['divide','dividing'])&&any(n,['numerator','top'])&&any(n,['denominator','bottom']);
      const pct=any(n,['multiply by 100','times 100','move decimal two','two places right','2 places right']);
      return mk('upgrade',[check('Convert fraction to decimal',divide),check('Convert decimal to percent',pct)],2);
    }
    case 'GEN-CH01-Q007': {
      const sourceMethod=n.includes('multiply')&&n.includes('denominator')&&n.includes('numerator');
      const placeValue=any(n,['power of 10','place value','over 10','over 100','over 1000'])&&any(n,['reduce','simplify','lowest terms','fraction']);
      return mk('upgrade',[check('Valid decimal-to-fraction method',sourceMethod||placeValue)],1);
    }
    case 'GEN-CH01-Q009': {
      return mk('upgrade',[check('Equality',any(n,['equal','equality'])),check('Ratios',any(n,['ratio','ratios']))],2);
    }
    case 'GEN-CH01-Q013': {
      const ok=(n.includes('10')&&(n.includes('5')||n.includes('fifth'))&&n.includes('power'))||n.includes('10^5');
      return mk('upgrade',[check('10 to the fifth power',ok)],1);
    }
    case 'GEN-CH01-Q014': {
      const compact=n.replace(/\s+/g,'');
      const rect=((n.includes('length')||/\bl\b/.test(n))&&(n.includes('width')||/\bw\b/.test(n)))||/l(?:x|\*)w/.test(compact);
      const half=(n.includes('half')||/(^|[^0-9])1\/2(?![0-9])/.test(n)||any(n,['divide by 2','divided by 2']));
      const tri=(half&&((n.includes('base')||/\bb\b/.test(n))&&(n.includes('height')||/\bh\b/.test(n))))||/(?:^|[^0-9])1\/2b(?:x|\*)h/.test(compact);
      return mk('upgrade',[check('Rectangle: length × width',rect),check('Triangle: 1/2 base × height',tri)],2);
    }
    case 'GEN-CH01-Q016': {
      const four=any(n,['four side','four-sided','4 side','4-sided','quadrilateral']);
      const parallel=n.includes('parallel');
      return mk('upgrade',[check('Four-sided figure',four),check('One pair of parallel sides',parallel)],2);
    }
    case 'GEN-CH02-Q007': {
      const all3=any(n,['all three','all 3'])||(n.includes('three states')&&any(n,['affected','expand']));
      const gas=n.includes('gas')&&any(n,['most','greatest','more']);
      return mk('upgrade',[check('All three states are affected',all3),check('Gas is affected most',gas)],2);
    }
    case 'GEN-CH02-Q008': {
      const water=n.includes('water')&&any(n,['1 pound','one pound']);
      const degree=any(n,['1 degree','one degree']);
      return mk('upgrade',[check('One pound of water',water),check('One degree Fahrenheit',degree)],2);
    }
    case 'GEN-CH02-Q020': {
      return mk('upgrade',[check('Lift',fuzzy(n,'lift',2)),check('Drag',fuzzy(n,'drag',2)),check('Thrust',fuzzy(n,'thrust',2)),check('Gravity',fuzzy(n,'gravity',2))],4);
    }
    case 'GEN-CH02-Q024': {
      const sep=fuzzy(n,'separation',2)||fuzzy(n,'separate',2);
      const stop=any(n,['prevent','delay','keep','stop','reduce']);
      const airflow=any(n,['boundary layer','airflow','air flow']);
      return mk('upgrade',[check('Prevents/delays airflow separation',sep&&stop)],1);
    }
    case 'GEN-CH02-Q026': {
      function dirAfter(key,want,opposite){const i=n.indexOf(key);if(i<0)return false;const w=n.slice(i,i+90),a=w.indexOf(want),b=w.indexOf(opposite);return a>=0&&(b<0||a<b)}
      const normal=dirAfter('normal','down','up');
      const auto=dirAfter('autorotation','up','down');
      return mk('upgrade',[check('Normal flight: downward airflow',normal),check('Autorotation: upward airflow',auto)],2);
    }
    case 'GEN-CH03-Q001': return mk('upgrade',[check('1,000 watts',ns.some(x=>Math.abs(x-1000)<.1))],1);
    case 'GEN-CH03-Q002': return mk('upgrade',[check("Ohm's law",fuzzy(n,'ohm',2))],1);
    case 'GEN-CH03-Q003': return mk('upgrade',[check('Voltage',fuzzy(n,'voltage',2)),check('Current',fuzzy(n,'current',2)),check('Resistance',fuzzy(n,'resistance',2))],3);
    case 'GEN-CH03-Q005': return mk('upgrade',[check('Current doubles',fuzzy(n,'double',2)||n.includes('twice')||n.includes('2 times'))],1);
    case 'GEN-CH03-Q006': return mk('upgrade',[check('Watts',fuzzy(n,'watt',2))],1);
    case 'GEN-CH03-Q007': {
      const source=any(n,['source','battery','generator','electrical energy']);
      const load=any(n,['load','resistance','resistor']);
      const conductor=any(n,['wire','wires','conductor','wiring']);
      return mk('upgrade',[check('Source',source),check('Load/resistance',load),check('Conductors/wires',conductor)],3);
    }
    case 'GEN-CH03-Q009': return mk('upgrade',[check('12 cells',hasNum(n,12,.1)||n.includes('twelve'))],1);
    case 'GEN-CH03-Q012': {
      const contam=any(n,['contaminate','contamination','cross contamination']);
      const different=any(n,['chemically opposite','different electrolyte','different electrolytes','opposite electrolyte','opposite electrolytes']);
      return mk('upgrade',[check('Avoid electrolyte contamination',contam||different)],1);
    }
    case 'GEN-CH03-Q014': {
      const transformer=n.includes('transformer')||n.includes('transform');
      const voltage=any(n,['voltage','step up','step down','increased','decreased','change']);
      const efficiency=(n.includes('long distance')&&any(n,['efficient','efficiency']))||any(n,['smaller wire','smaller wires']);
      return mk('upgrade',[check('Voltage can be stepped up/down with a transformer',transformer&&voltage),check('Efficient long-distance transmission/smaller wire',efficiency)],1);
    }
    case 'GEN-CH03-Q015': {
      const res=fuzzy(n,'resistance',2),ind=fuzzy(n,'inductance',2)||(n.includes('inductive')&&n.includes('reactance')),cap=fuzzy(n,'capacitance',2)||(n.includes('capacitive')&&n.includes('reactance'));
      return mk('upgrade',[check('Resistance',res),check('Inductive reactance/inductance',ind),check('Capacitive reactance/capacitance',cap)],3);
    }
    case 'GEN-CH03-Q016': {
      const change=any(n,['oppose a change','opposes a change','opposition to change','oppose change'])&&n.includes('current');
      const induced=n.includes('induced')&&n.includes('voltage')&&any(n,['opposite','oppose']);
      return mk('upgrade',[check('Opposes a change in current / induced opposing voltage',change||induced)],1);
    }
    case 'GEN-CH03-Q018': return mk('upgrade',[check('Stores charge in an electrostatic/electric field',any(n,['electrostatic field','electric field','electrical field','stores charge','store charge','electric charge','electrical charge']))],1);
    case 'GEN-CH05-Q001': {
      const vals=new Set(ns.filter(Number.isInteger));
      const ok=(vals.has(1)&&vals.has(2)&&vals.has(3))||(n.includes('one')&&n.includes('two')&&n.includes('three'));
      return mk('upgrade',[check('One, two, or three views',ok)],1);
    }
    case 'GEN-CH05-Q006': {
      const ok=any(n,['shorthand','short hand','minimum drawing','minimize drawing','reduce drawing','simplify drawing'])||(n.includes('symbol')&&any(n,['information','characteristics','component']));
      return mk('upgrade',[check('Symbols communicate information with less drawing',ok)],1);
    }
    case 'GEN-CH05-Q008': return mk('upgrade',[check('Revision block/record',any(n,['revision block','revision record','revisions block','revision number']))],1);
    case 'GEN-CH06-Q002': return mk('upgrade',[check('Reweigh the aircraft',any(n,['reweigh','re weigh','weigh the aircraft','weigh the airplane','weigh it']))],1);
    case 'GEN-CH06-Q004': return mk('upgrade',[check('Calculate using weight/arm/moment',any(n,['calculate','compute','mathematically','math'])||(n.includes('weight')&&any(n,['arm','moment'])))],1);
    case 'GEN-CH06-Q016': return mk('upgrade',[check('Oil remaining after drainage',n.includes('oil')&&any(n,['remain','remaining','left','cannot drain','can not drain','after drain','after drainage']))],1);
    case 'GEN-CH06-Q024': return mk('upgrade',[check('Helicopter CG range is smaller/more limited',any(n,['smaller','limited','narrow','extremely limited','more critical']))],1);
    case 'GEN-CH07-Q002': {
      const set=n.includes('thermoset')&&any(n,['does not soften','will not soften','char','burn','not melt']);
      const plastic=n.includes('thermoplastic')&&any(n,['soften','soft','pliable','melt'])&&any(n,['heat','heated']);
      return mk('upgrade',[check('Thermoset does not soften/re-melt',set),check('Thermoplastic softens when heated',plastic)],2);
    }
    case 'GEN-CH07-Q006': return mk('upgrade',[check('Becomes brittle / loses ductility',any(n,['brittle','lose ductility','loses ductility','less ductile','loss of ductility']))],1);
    case 'GEN-CH08-Q004': return mk('upgrade',[check('Bolt-head code marking (cross/asterisk)',any(n,['cross','asterisk','code marking','head marking','marking'])&&any(n,['head','bolt']))],1);
    case 'GEN-CH09-Q001': return mk('upgrade',[check('Outside micrometer',n.includes('micrometer')),check('Vernier caliper',n.includes('caliper'))],2);
    case 'GEN-CH09-Q002': return mk('upgrade',[check('A valid reason calibration can be lost',any(n,['dropped','drop','overtighten','over tighten','sprung frame','wear','worn surface','accuracy','inaccurate']))],1);
    case 'GEN-CH11-Q006': return mk('upgrade',[check('Cold-weld evidence: rough/irregular/no feathering/poor penetration',any(n,['rough','irregular','not feather','does not feather','poor penetration','lack of penetration']))],1);
    case 'GEN-CH12-Q002': {
      const protect=any(n,['avoid','protect','cover']);
      const vulnerable=any(n,['pitot','static','hinge','bearing','sealed','contaminate','contamination','opening','vent']);
      return mk('upgrade',[check('Avoid/protect vulnerable areas',protect&&vulnerable)],1);
    }
    case 'GEN-CH12-Q013': {
      const dis=any(n,['dissimilar','different metals','steel pin','aluminum hinge']);
      const moist=any(n,['moisture','contaminant','contaminants','traps moisture','trap moisture']);
      return mk('upgrade',[check('Dissimilar metals',dis),check('Traps moisture/contaminants',moist)],2);
    }
    case 'GEN-CH12-Q015': {
      const checks=[check('Cleaning',any(n,['clean','cleaning'])),check('Lubrication',any(n,['lubricate','lubrication','lube'])),check('Treatment',any(n,['treat','treatment'])),check('Sealing',any(n,['seal','sealing'])),check('Inspection',any(n,['inspect','inspection'])),check('Protective covers',any(n,['protective cover','cover'])),check('Drain holes clear',any(n,['drain hole','drain holes','keep drains clear']))];
      return mk('upgrade',checks,4);
    }
    case 'GEN-CH12-Q016': return mk('upgrade',[check('Suitable non-steel abrasive/tool',any(n,['nylon pad','nylon pads','nylon scrub','scotch brite','scotchbrite','bristle brush','aluminum wool','aluminum wire brush','aluminum brush']))],1);
    case 'GEN-CH12-Q017': {
      const embed=any(n,['embed','embedded','particles','remnants','steel left']);
      const cor=any(n,['corrosion','corrode','dissimilar']);
      return mk('upgrade',[check('Steel particles can embed in aluminum',embed),check('Can cause corrosion',cor)],2);
    }
    case 'GEN-CH12-Q019': return mk('upgrade',[check('Polishing can remove the anodized/protective oxide coating',any(n,['remove anodized','removes anodized','anodized surface','protective oxide','oxide coating','protective coating']))],1);
    case 'GEN-CH13-Q002': return mk('upgrade',[check('Bowline',fuzzy(n,'bowline',2))],1);
    case 'GEN-CH14-Q006': return mk('upgrade',[check('Airworthiness Directive (AD)',(fuzzy(n,'airworthiness',2)&&fuzzy(n,'directive',2))||/\bads?\b/.test(n))],1);
    case 'GEN-CH14-Q012': return mk('upgrade',[check('TCDS / Aircraft Specifications',n.includes('tcds')||n.includes('type certificate data')||n.includes('aircraft spec'))],1);
    case 'GEN-CH15-Q008': {
      const time=(n.includes('6')||n.includes('six'))&&(n.includes('24')||n.includes('twenty four')||n.includes('twenty-four'));
      const work=any(n,['worked','work as mechanic','mechanic','supervised','technical supervision']);
      return mk('upgrade',[check('6 months out of the past 24',time),check('Worked as or supervised mechanics',work)],2);
    }
    case 'GEN-CH15-Q009': return mk('upgrade',[check('May approve/sign off return to service under Part 65',any(n,['return to service','sign off','approve'])&&n.includes('65'))],1);

    // Powerplant log fixes
    case 'PP-CH01-Q008': return mk('upgrade',[check('Two/multiple valve springs',fuzzy(n,'spring',2)&&any(n,['two','2','dual','multiple','more than one']))],1);
    case 'PP-CH02-Q015': return mk('upgrade',[check('Inspect for corrosion',fuzzy(n,'corrosion',2))],1);
    case 'PP-CH02-Q025': {
      if(n.includes('oil pressure')&&n.includes('high')&&!any(n,['drop','low','zero','decrease']))return null;
      const pressure=n.includes('oil pressure')&&any(n,['drop','low','zero','decrease']);
      const temp=n.includes('temperature')&&any(n,['normal','regular','proper']);
      const level=any(n,['oil level','oil supply','oil capacity'])&&any(n,['full','sufficient','proper','normal']);
      return mk('upgrade',[check('Oil pressure suddenly/abnormally low',pressure),check('Oil temperature remains normal',temp),check('Oil quantity/supply remains normal',level)],2);
    }
    case 'PP-CH03-Q006': {
      const spool=any(n,['split compressor','dual spool','twin spool','two spool','2 spool']);
      const shafts=any(n,['two shafts','2 shafts','two rotor shafts','one inside the other','coaxial']);
      const lpHp=any(n,['low pressure','high pressure','lp','hp']);
      return mk('upgrade',[check('Two-spool / concentric-shaft compressor arrangement',spool||shafts||lpHp)],1);
    }
    case 'PP-CH03-Q012': {
      const seal=any(n,['seal','seals']);
      const bearing=any(n,['bearing','bearings','rotor shaft']);
      return mk('upgrade',[check('Oil seal for rotor-shaft/turbine bearings',seal&&bearing)],1);
    }
    case 'PP-CH03-Q020': {
      const unload=any(n,['unload','closing bleed','close bleed','bleed air valve']);
      const cool=any(n,['cool down','cooldown','cool','stabilize','3 minutes','three minutes']);
      const shock=any(n,['thermal shock','prevent damage','avoid damage']);
      return mk('upgrade',[check('Unload APU / close bleed-air load',unload),check('Allow cooldown/stabilization',cool),check('Prevents thermal shock/damage',shock)],2);
    }
    case 'PP-CH04-Q002': {
      const egt=(n.includes('egt')||n.includes('exhaust gas temperature'))&&any(n,['high','maximum','max','limit']);
      const epr=(n.includes('epr')||n.includes('engine pressure ratio'))&&n.includes('takeoff');
      return mk('upgrade',[check('High/max EGT',egt),check('At/before target takeoff EPR',epr)],2);
    }
    case 'PP-CH05-Q001': return mk('upgrade',[check('Air scoop/inlet',any(n,['air scoop','scoop','air inlet'])),check('Carburetor/fuel control',any(n,['carburetor','fuel control'])),check('Intake manifold',any(n,['intake manifold','manifold']))],3);
    case 'PP-CH05-Q002': return mk('upgrade',[check('Power loss or inability to run',any(n,['loss of power','drop in power','decrease in power','reduction in power','reduced power','rated power','not run','does not run',"won't run",'engine stops','not at all']))],1);
    case 'PP-CH05-Q003': return mk('upgrade',[check('Reduced/erratic engine performance',any(n,['less power','decrease power','decreases power','decreased engine power','reduction in power','reduces performance','lower manifold pressure','loss of power','erratic','runs rough']))],1);
    case 'PP-CH05-Q005': return mk('upgrade',[check('Heat/preheat the induction air',any(n,['preheat','pre heat','preheater','carb heat','carburetor heat','carburetor air heat','heat the induction air','heating induction air','preheating the intake air']))],1);
    case 'PP-CH05-Q006': {
      const evap=any(n,['evaporation','evaporat','vaporization','vaporizing'])&&n.includes('fuel');
      const temp=any(n,['temperature drop','decrease in air temperature','cools','cooling']);
      return mk('upgrade',[check('Fuel evaporation/vaporization',evap),check('Causes an air-temperature drop',temp)],2);
    }
    case 'PP-CH05-Q007': {
      const power=((any(n,['low','lower','reduced'])&&n.includes('power'))||any(n,['partial throttle','partially closed']));
      const area=any(n,['more area','greater area','more surface','larger area']);
      return mk('upgrade',[check('More likely at lower power/partly closed throttle',power),check('More surface area for ice',area)],2);
    }
    case 'PP-CH05-Q009': return mk('upgrade',[check('Engine power drops/decreases',n.includes('power')&&any(n,['drop','decrease','reduce','loss']))],1);
    case 'PP-CH05-Q012': {
      const imp=n.includes('impeller');
      const location=any(n,['after carburetor','after the carburetor','intake manifold']);
      return mk('upgrade',[check('Impeller compresses the mixture after the carburetor',imp&&location)],1);
    }
    case 'PP-CH05-Q017': return mk('upgrade',[check('Mechanical/throttle linkage or separate control',any(n,['mechanical','mechanically','linkage','throttle linkage','separate control'])),check('Oil-pressure-driven actuator',any(n,['oil pressure','oil-pressure','actuator']))],2);
    case 'PP-CH06-Q012': return mk('upgrade',[check('Welded areas',any(n,['weld','welded'])),check('Clamped areas',any(n,['clamp','clamped'])),check('Flanges',any(n,['flange','flanges']))],2);
    case 'PP-CH09-Q002': return mk('upgrade',[check('Reduce friction',any(n,['friction','lubricate','lubrication'])),check('Remove/reduce heat',any(n,['heat','cool','temperature']))],2);
    case 'PP-CH09-Q018': return mk('upgrade',[check('Turbine bearing(s)',fuzzy(n,'bearing',2))],1);
    case 'PP-CH10-Q003': return mk('upgrade',[check('Streamline/reduce drag',any(n,['streamline','reduce drag','drag'])),check('Direct cooling airflow over cylinders',any(n,['cool','cooling','airflow over cylinders','direct airflow','direct cooling air']))],2);
    case 'PP-CH10-Q008': {
      const limits=any(n,['within limits','maintenance manual','manufacturer','repair limitations','allowable']);
      const repair=n.includes('repair');
      const replace=any(n,['replace cylinder','replace the cylinder','reject the cylinder']);
      return mk('upgrade',[check('Repair only within approved/manufacturer limits',limits&&repair),check('Replace cylinder if damage is excessive',replace)],1);
    }
    case 'PP-CH11-Q005': return mk('upgrade',[check('Slow overheat may produce no warning',any(n,['nothing','no warning','will not activate',"won't activate"])),check('System needs rapid temperature rise',any(n,['rapid','fast temperature rise','rate of rise','quick heating']))],2);
    case 'PP-CH11-Q006': return mk('upgrade',[check('Thermocouple-produced power',n.includes('thermocouple')),check('Aircraft electrical-system power',any(n,['aircraft electrical','electrical system','aircraft power','electrical power']))],2);
    case 'PP-CH11-Q011': return mk('upgrade',[check('Halon/Freon/CFC family',any(n,['halon','freon','cfc','chlorofluorocarbon']))],1);

    // Secondary source (internal ASA IDs)
    case 'ASA-P-C-K-010': {
      const ad=/\bads?\b/.test(n)||n.includes('airworthiness directive');
      const tcds=n.includes('tcds')||n.includes('type certificate data');
      const wrong=any(n,['service bulletin','service bulletins','service letter','service letters','instructions for continued airworthiness','ica']);
      if(wrong)return null; // do not teach the grader to accept extra incorrect choices
      return mk('upgrade',[check('ADs',ad),check('TCDSs',tcds)],2);
    }
    case 'ASA-G-C-K-023': return mk('upgrade',[check('Helicopter',fuzzy(n,'helicopter',2))],1);
    case 'ASA-G-C-K-024': return mk('upgrade',[check('CG is ahead/forward',any(n,['ahead','forward'])&&any(n,['cg','center of gravity'])),check('Relative to center of lift',n.includes('lift'))],2);
    case 'ASA-G-C-K-026': return mk('upgrade',[check('TCDS or aircraft equipment list',n.includes('tcds')||n.includes('type certificate data')||n.includes('equipment list'))],1);
    case 'ASA-G-D-K-002': return mk('upgrade',[check('Outside diameter',n.includes('outside')&&n.includes('diameter'))],1);
    case 'ASA-G-D-K-003': {if(n.includes('35')&&any(n,['aircraft','aviation']))return null;return mk('upgrade',[check('Aircraft fitting: 37°',n.includes('37')&&any(n,['aircraft','aviation'])),check('Automotive fitting: 45°',n.includes('45')&&any(n,['automotive','auto']))],2);}
    case 'ASA-P-G-K-017': return mk('upgrade',[check('Oil pressure',n.includes('pressure')),check('Oil temperature',any(n,['temperature','temp']))],2);
    case 'ASA-P-H-K-015': return mk('upgrade',[check('Lightweight',any(n,['light weight','lightweight','lighter','low weight'])),check('High torque',n.includes('torque'))],2);
    case 'ASA-P-H-K-018': return mk('upgrade',[check('Self-contained lubrication/oil system',any(n,['self contained','self-contained'])),check('Oil stored in starter housing',n.includes('housing')&&any(n,['oil','lubrication']))],2);
    case 'ASA-P-H-K-019': return mk('upgrade',[check('Magnetic chip detector',n.includes('chip')&&any(n,['detector','magnetic']))],1);
    case 'ASA-P-M-K-021': return mk('upgrade',[check('Propeller maintenance manual',n.includes('maintenance manual')&&n.includes('propeller'))],1);

    // 10IC source (internal BAKER IDs)
    case 'BAKER-G-A-001': return mk('upgrade',[check("Ohm's law",fuzzy(n,'ohm',2))],1);
    case 'BAKER-G-A-021': return mk('upgrade',[check('1,000 watts',ns.some(x=>Math.abs(x-1000)<.1))],1);
    case 'BAKER-G-D-009': {
      const an=any(n,['blue','black','37']),ac=any(n,['gray','grey','yellow','45']),detail=any(n,['shoulder','thread','flare','color','colour']);
      return mk('upgrade',[check('Correct AN-vs-AC fitting identification',an&&ac&&detail)],1);
    }
  }
  return null;
}

function grade(q,answer){
  let baseResult;
  try{baseResult=originalGrade(q,answer)}catch(err){
    baseResult={level:'fail',passed:false,count:0,total:0,required:1,concepts:[],confidence:.2,feedback:'Unable to grade this response.',reviewRecommended:true};
  }

  const rule=special(q,answer);
  if(rule){
    if(rule.kind==='hard')return resultFrom(rule,baseResult);
    if((RANK[rule.level]||0)>(RANK[baseResult.level]||0))return resultFrom(rule,baseResult);
  }

  // Safe global rescue: an answer that is effectively the expected answer with only
  // punctuation, singular/plural, or a one-character transcription typo should not fail.
  if(!baseResult.passed && q && q.idealAnswer && nearExact(answer,q.idealAnswer)){
    return resultFrom(mk('upgrade',[check('Expected answer meaning recognized',true)],1),baseResult);
  }
  return baseResult;
}

base.grade=grade;
base.version='5.4-log-tuned-20260821';
base.__logTune20260821=true;
global.FAA_GRADER=base;
})(window);
