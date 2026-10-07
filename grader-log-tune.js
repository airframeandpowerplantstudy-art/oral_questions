(function(global){
'use strict';

const base=global.FAA_GRADER;
if(!base || typeof base.grade!=='function'){
  console.warn('[oral grader] log tune patch could not find FAA_GRADER');
  return;
}
if(base.__logTune20261007)return;
// Reuse a previously retained underlying grader when available.
const priorGrade=base.__logTuneOriginalGrade||base.grade;

const originalGrade=priorGrade.bind(base);
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
    version:'5.5-log-tuned-20261007',
    orderOK:true,
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

// October 2026 review: explicit concepts for recurring logged grading errors.
// These rules override both false rejections and false passes; other questions
// continue to use the existing grader. No student answers are memorized here.
const REVIEW_RULES = Object.create(null);
const G = (label, test) => ({label, test});
function define(ids, groups, required=groups.length, deny=null){
  for(const id of ids.split(' ')) REVIEW_RULES[id]={groups,required,deny};
}
const rx = pattern => new RegExp(pattern, 'i');
const term = (label, pattern) => G(label, pattern);

define('GEN-CH01-Q003', [term('Find a common denominator', /\b(common|same|equal|matching)\b.{0,25}denominator|denominator.{0,25}\b(common|same|equal|match)/i)]);
define('GEN-CH01-Q004', [G('Multiply by the reciprocal of the divisor, or divide decimal equivalents', n =>
  (/multipl/.test(n)&&/reciprocal|invert|flip/.test(n)) || (/convert|change/.test(n)&&/decimal/.test(n)&&/divid/.test(n)))], 1,
  /^multiply.{0,20}numerator.{0,30}denominator(?!.*(?:reciprocal|invert|flip))/);
define('GEN-CH01-Q006', [term('Convert the fraction to a decimal', /convert.{0,30}decimal|decimal.{0,20}(convert|first)|divid.{0,40}(numerator|top).{0,40}(denominator|bottom)/i),
  term('Multiply by 100 or shift two places right', /(multipl|times| x ).{0,40}100|decimal.{0,30}(two|2).{0,15}right|(two|2) places (to the )?right/i)]);
define('GEN-CH01-Q008', [term('Fraction notation', /\bfraction/i), G('Colon notation', (n,a)=>/\bcolon\b/.test(n)||/\d\s*:\s*\d/.test(a)||a.includes(':')),
  G('Use the word to between values', (n,a)=>/\bword to\b|\buse to\b|\bor to$|\bto (in ?between|between)\b|\bto or (a )?colon\b/.test(n)||/["'“”]to["'“”]/i.test(a)||/\d\s+to\s+\d/.test(n))],2);
define('GEN-CH01-Q014', [G('Rectangle: length × width (or base × height)', n=>
  /rectangle.{0,25}(length (times|x|multiplied by) width|l\s*x\s*w|b\s*x?\s*h|base (times|x) height)/.test(n)||/length (times|x|multiplied by) width|\bl\s*x\s*w\b/.test(n)),
  G('Triangle: one-half base × height', n=> (/half|1\s*\/\s*2|divid.{0,12}(2|two)/.test(n)&&/base|\bb\b|\bbh\b|\bbxh\b/.test(n)&&/height|\bh\b|\bbh\b|\bbxh\b/.test(n)))],2,
  /triangle.{0,25}pi|length\s*(?:times|x|multiplied by)\s*width\s*(?:times|x|multiplied by)\s*height/);
define('GEN-CH02-Q005', [term('Rigid bar or lever arm', /\bbar\b|\barm\b/i),term('Fulcrum or pivot', /fulcrum|pivot/i)]);
define('GEN-CH02-Q007', [term('All states are affected', /\b(all|yes)\b/i),term('Gas is affected most', /gas.{0,30}(most|greatest|more)|most.{0,20}gas/i)],2,/^no\b/);
define('GEN-CH02-Q020', [term('Lift',/\blift\b/i),term('Drag',/\bdrag\b/i),term('Thrust',/\bthrust\b/i),term('Weight or gravity',/\b(weight|gravity)\b/i)]);
define('GEN-CH02-Q022', [G('Exceeds the critical angle of attack', n => /angle|aoa/.test(n)&&(
  /critical/.test(n)&&/exceed|beyond|greater|too high|above|reach|separat/.test(n)||/excessive|too high|exceed/.test(n)&&/airflow separat|air flow separat/.test(n)))],1,/below.{0,15}critical|not.{0,15}exceed/);
define('GEN-CH02-Q027', [term('Opposes motion between contacting surfaces', /(oppos|resist|against).{0,30}(motion|movement)|(motion|movement).{0,30}(oppos|resist)/i)]);
define('GEN-CH03-Q003 GEN-CH03-Q021', [term('Voltage (volts)',/\bvolt(?:age|s)?\b/i),term('Current (amps)',/\bcurrent\b|\bamp(?:s|erage|ere|eres)?\b/i),term('Resistance (ohms)',/\bresistance\b|\bohms?\b/i)]);
define('GEN-CH03-Q018', [G('Electrostatic field or charge between insulated plates', n=>
  /electrostatic|electric(?:al)? field/.test(n) || (/charg/.test(n)&&/plates?|conductors?/.test(n)&&/insulator|dielectric|separat/.test(n)))],1,/electromagnetic/);
define('GEN-CH05-Q003',[term('Detail view',/detail/i),term('Enlarged scale',/larger|enlarg|bigger/i)]);
define('GEN-CH05-Q004',[term('Troubleshooting or showing system operation',/trou?ble? ?shoot|system.{0,20}(function|operat)|(function|operat).{0,20}system/i)]);
define('GEN-CH05-Q005',[G('Multiple orthogonal views, such as top/front/side', n=>
  /right angle|orthogonal|perpendicular/.test(n)&&/view/.test(n) || ['top','front','side','bottom'].filter(t=>rx('\\b'+t+'\\b').test(n)).length>=2 || /multiple|different|several/.test(n)&&/view/.test(n))]);
define('GEN-CH05-Q006',[term('Shorthand communicates component characteristics',/shorthand|short ?hand|minimum.{0,15}draw|less.{0,15}draw|simpl.{0,25}(show|represent|draw|component)|(easier|quick).{0,30}(show|draw|represent)|convey.{0,25}characteristic/i)]);
define('GEN-CH05-Q008',[term('Drawing revision record',/revision|ruled column/i)]);
define('GEN-CH05-Q009',[term('Solid dimension lines broken for the measurement',/solid.{0,30}(line|broken)|dimension line.{0,35}(break|broken|measurement)|line.{0,35}broken.{0,25}(middle|mid|measure)/i),term('Shows object size or measurements',/size|dimension|measure/i)]);
define('GEN-CH05-Q011',[G('Allowed space between two parts',n=> /space|gap|clearance|distance|dimension/.test(n)&&/between|two|2/.test(n))]);
define('GEN-CH05-Q013',[G('Parts/materials needed to make the assembly',n=>
  /material|parts?|hardware|components?/.test(n)&&/list|inventory|needed|required|fabricat|assembl|manufactur|make|complete/.test(n))],1,/parts?.{0,15}(replacing|replace)/);
define('GEN-CH06-Q005',[term('Safe loading or maintaining allowable CG/weight limits',/saf|c[ .]*g.{0,30}(limit|range)|center of gravity.{0,30}(limit|range)|avoid.{0,40}(flight characteristic|excessive weight)|prevent.{0,30}(nose|tail)/i)]);
define('GEN-CH06-Q006',[term('Imaginary/reference datum plane',/imaginary|reference|zero point|point of zero|invisible/i),term('Origin for arm/horizontal measurements',/horizontal|measure|station|\barm\b/i)]);
define('GEN-CH06-Q008',[G('Measure distance from the datum',n=>/measur|distance/.test(n)&&/datum/.test(n)),term('Use manufacturer data',/manufactur|equipment list|tcds/i)]);
define('GEN-CH06-Q013',[term('Category changes permitted gross weight/useful load',/(different|differ|chang|limit|maximum|max).{0,40}(weight|load)|(weight|load).{0,40}(different|differ|limit|maximum|max)/i)]);
define('GEN-CH06-Q014',[term('Remove unlisted/nonpermanent equipment',/\bremov/i)],1,/do not remove|don t remove|keep|leave.*aboard/);
define('GEN-CH06-Q015',[term('Fuel remains after drainage',/(remain|left|residual).{0,80}(drain|empt)|(drain|empt).{0,80}(remain|left)/i)]);
define('GEN-CH06-Q017',[G('Drain usable fuel, or subtract usable fuel from full-tank weighing',n=>
  /drain|empt/.test(n)&&/unusable|un-usable|un usable/.test(n) || /fill|full/.test(n)&&/subtract|remove/.test(n)&&/usable|useable/.test(n)&&!/subtract.{0,15}unusable/.test(n))],1,/subtract.{0,15}unusable|fuel (isn t|is not) accounted/);
define('GEN-CH06-Q021',[term('Loading graph relates weight to moment or CG limits',/weight.{0,35}(moment|index)|moment.{0,30}weight|c[ .]*g.{0,30}(limit|range)|center of gravity.{0,30}(limit|range)/i)]);
define('GEN-CH07-Q001',[term('Cold work the metal',/cold work|hammer|bend|roll|peen|plastic deform|repeated.{0,20}(stress|deform)/i)]);
define('GEN-CH07-Q002',[G('Thermoset cannot remelt/reshape with heat',n=> /thermoset\w*.{0,65}(doesn t|does not|cannot|can t|will not|not).{0,25}(soft|melt|reshape|reset)|thermoset\w*.{0,55}(burn|char)/.test(n)),
 G('Thermoplastic softens/remelts/reshapes with heat',n=>/thermoplastic\w*.{0,65}(soft|pliable|reheat|reshape|melt|can.{0,12}mold)/.test(n))],2,/thermoplastic\w*.{0,25}(cannot|can t|does not|doesn t).{0,15}(soften|melt|reshape)/);
define('GEN-CH07-Q003',[G('Thermoplastic: windows/windshields',n=>/thermoplastic\w*.{0,65}(window|windshield|plexigla)/.test(n)),G('Thermoset: composite matrix',n=>/thermoset\w*.{0,65}(matrix|composite|structur)/.test(n))]);
define('GEN-CH07-Q007',[G('Correct resin quantity/ratio or uniform impregnation',n=>
  /resin|matrix|mixture|mix|hardener/.test(n)&&/correct|proper|right|uniform|even|consisten|optimal|proportion|ratio/.test(n))]);
define('GEN-CH08-Q001',[term('Rivet material or alloy identification',/material|alloy/i)]);
define('GEN-CH08-Q002',[term('Keep icebox rivets cold/frozen',/freez|frozen|refrigerat|cold storage/i)],1,/warm|heat them/);
define('GEN-CH08-Q003',[G('Length of the unthreaded shank',n=>/unthread|unthreat|unthreaed|unthred|non.?thread/.test(n)||/smooth.{0,15}(shank|portion|part)/.test(n))],1,/^threaded|length of (the )?threaded/);
define('GEN-CH08-Q005',[G('Closer machining tolerances/more precise fit',n=>
  /precis|accurat|tight|closer|fine|less (clearance|variation)|specific (size|measurement|dimension)/.test(n)&&/machin|dimension|toleranc|fit|measurement|size|shank/.test(n))]);
define('GEN-CH08-Q007',[term('Standard torque table or AC 43.13-1B',/torque.{0,20}(table|chart|list)|(table|chart).{0,25}torque|43[ .-]*13[ .-]*1b/i)]);
define('GEN-CH09-Q004',[G('Relieve spring tension or preserve calibration',n=>/reliev|releas|reduce|remove|no tension|no strain/.test(n)&&/tension|spring|strain/.test(n)||/calibration/.test(n)&&/maintain|preserve|retain|avoid|keep/.test(n))]);
define('GEN-CH10-Q010',[G('Damages the sealing surface or flare',n=> /damag|crack|cut|break|broken|weaken/.test(n)&&/flare|seal|fitting/.test(n))]);
define('GEN-CH10-Q011',[term('Electrically bond the tubing to structure',/\bbond/i)],1,/(not|don t|never|without).{0,20}bond/);
define('GEN-CH10-Q014',[term('Straight lay line indicates no twist',/(lay|ley).{0,8}line.{0,30}(straight|twist)|(straight|twist).{0,30}(lay|ley).{0,8}line/i)]);
define('GEN-CH10-Q019',[G('Sleeve cuts too deeply into/weakens the tube',n=>/tube|tubing|wall/.test(n)&&/weaken|cut|damag|deep/.test(n))]);
define('GEN-CH10-Q020',[term('Quick connection/disconnection',/quick|fast|rapid/i),term('Prevents fluid loss or air entry',/without.{0,20}(loss|fluid|leak)|no.{0,15}(loss|leak)|prevent.{0,20}(loss|leak|air)|not.{0,15}(losing|loosing|lose)|keep.{0,15}(fluid|air)/i)]);
define('GEN-CH11-Q001',[term('Preclean surface',/clean|wash/i),term('Apply penetrant',/penetrant|\bdye\b/i),term('Allow penetrant dwell',/dwell|soak|sit|wait/i),term('Remove excess penetrant',/(remove|clean|wash|wipe).{0,25}(excess|penetrant|again)|clean.*(dye|penetrant).*clean/i),term('Apply developer',/develop/i),term('Inspect and interpret indications',/inspect|interpret|defect|crack|indication/i)]);
define('GEN-CH11-Q002',[term('Magnifying glass',/magnif/i),term('Flashlight',/flash ?light|torch/i),term('Mirror',/mirror/i),term('Borescope',/bore ?scope/i)],2);
define('GEN-CH11-Q003',[term('Visual',/visual/i),term('Dye penetrant',/penetrant/i),term('Eddy current',/eddy/i),term('Ultrasonic',/ultraso/i),term('Radiography',/radiograph|x.?ray/i)],2,/magnetic particle/);
define('GEN-CH11-Q004',[G('Capillary action draws and retains penetrant in cracks',n=>/capillar|calipry/.test(n)||fuzzy(n,'capillary',2))]);
define('GEN-CH11-Q005',[G('Bead width: 3–5 times base-metal thickness',n=>/\b3\s*(?:to|-|through|and)\s*5\b|\bthree\s*(?:to|through|and)\s*five\b|\b3\s+5\b/.test(n)),term('100%/full penetration',/\b100\b|one hundred|full penetration|complete penetration/i)],2,/\b3\s*(to|-)\s*8\b|\b5\s*(to|-)\s*8\b|\b1\.5\b/);
define('GEN-CH11-Q007',[term('25–50 percent penetration',/\b25\s*(to|through|and)?\s*50\b|twenty five.{0,10}fifty/i)],1,/\b20\b|\b100\b/);
define('GEN-CH11-Q008',[term('Magnetize the part',/\bmagnetiz|\bmagnitiz|\bmagnetization/i),term('Apply magnetic/ferromagnetic particles',/(ferro)?magnetic.{0,15}(partic|particulate)|ferrous.{0,15}partic|mag part|particle application/i),term('Inspect particle indications for defects',/inspect|interpret|crack|defect|discontin|clusters|align|indication|pattern/i)]);
define('GEN-CH12-Q008',[term('Surface/oxidation',/surface|oxidation/i),term('Intergranular/exfoliation',/intergranular|exfoliation/i),term('Filiform',/filiform|filliform/i),term('Galvanic/dissimilar metal',/galvanic|dissimilar/i),term('Pitting',/pitting/i),term('Stress',/stress/i),term('Fretting',/fretting/i)],3);
define('GEN-CH12-Q009',[G('Incomplete primer curing or residual acidic contamination',n=>
  /primer/.test(n)&&/incomplete|improper|not.{0,25}(dry|cure)|uncured/.test(n)||/acid/.test(n)&&/contamin|residu|not.{0,15}wash/.test(n))]);
define('GEN-CH12-Q014 ASA-G-G-K-013',[term('Keep clean',/clean/i),term('Lubricate hinges',/lubricat|\blube[ds]?\b/i)]);
define('GEN-CH12-Q015',[term('Cleaning',/clean|wash/i),term('Lubrication',/lubric|\blube\b/i),term('Treatment/coatings',/treat|paint|primer|alodine|anodiz/i),term('Sealing',/seal/i),term('Inspection',/inspect/i),term('Protective covers',/cover/i),term('Clear drains',/drain/i)],4);
define('GEN-CH12-Q020',[G('Avoid material deterioration/damage',n=> /damage|deteriorat|degrad|attack|soften|destroy|harm/.test(n)&&/prevent|avoid|least|won t|will not|don t|does not|not|other cleaner/.test(n))]);
define('GEN-CH12-Q021',[term('Battery compartment',/batter/i),term('Exhaust trail areas',/exhaust/i),term('Bilge',/bilge|bill?age/i),term('Vents',/vent/i),term('Landing gear/wheel wells',/landing gear|wheel well/i),term('Fuel tanks',/fuel tank/i),term('Flap recesses',/flap/i),term('Galleys/lavatories',/galle|lavator|bathroom/i),term('Piano hinges',/piano|hinge/i),G('Water-trapping areas',n=>/trap|hold|collect/.test(n)&&/water|moisture/.test(n))],5);
define('GEN-CH13-Q010',[G('Communicate when a radio is unavailable/inoperative',n=>/radio/.test(n)&&/no |without|inop|unavail|not |fail|isn t/.test(n))]);
define('GEN-CH13-Q011',[term('Engine damage/destruction or detonation',/damag|destroy|detonat/i)]);
define('GEN-CH13-Q014',[term('Detonation',/detonat/i),term('Power loss',/(loss|less|lower|decreas|reduc).{0,20}(power|performance)/i),term('Overheating',/overheat/i)],2);
define('GEN-CH13-Q019',[term('Before starting a new/overhauled or stored engine',/new|overhaul|storage|stored/i)],1,/before.{0,20}storage/);

// Airframe and Powerplant: retain essential process/relationship information.
define('AF-CH01-Q014',[term('Ambient temperature',/temperat|ambient/i),term('Cable size',/size|diameter/i)]);
define('AF-CH01-Q015',[term('Maintains cable tension',/(keep|maintain|regulat|retain|adjust).{0,30}tension/i),term('Compensates for temperature/structural expansion',/temperat|expan|contract/i)]);
define('AF-CH01-Q016',[G('Changes the pitch of all rotor blades together',n=>/pitch/.test(n)&&/all|each|collective|same/.test(n))]);
define('AF-CH02-Q017',[term('Bend allowance',/bend allowance/i),term('Setback',/set ?back/i)]);
define('AF-CH02-Q020',[term('Reduce weight',/(reduc|decreas|less|lower|light).{0,20}weight|lighter/i),term('Increase stiffness/strength',/stiff|strong|strength/i)]);
define('AF-CH03-Q006',[G('Resorcinol glue',n=>fuzzy(n,'resorcinol',2)||/recesinol/.test(n)),term('Phenol-formaldehyde glue',/phenol.{0,8}formaldehyde/i),term('Epoxy resin glue',/epoxy/i)]);
define('AF-CH03-Q008',[G('Equalize wood moisture content',n=>/moist|water content/.test(n)&&/equal|same|balance/.test(n))]);
define('AF-CH03-Q009',[G('Glue starts curing before assembly and the joint may fail',n=>/glue|adhesive/.test(n)&&/set|cur|dry/.test(n)&&/fail|before|too quick/.test(n))]);
define('AF-CH03-Q023',[term('Waxed paper or vinyl separates patch and pressure plate',/wax(?:ed)? paper|vinyl/i)]);
define('AF-CH03-Q024',[term('Prevent crushing the wood',/crush|compress.{0,15}wood/i)]);
define('AF-CH03-Q025',[G('Distribute fastener pressure over a larger area',n=>/distribut|dispers|spread|bearing area/.test(n)&&/pressure|load|force|area/.test(n))]);
define('AF-CH04-Q007',[term('Flux cleans/removes oxides',/clean|remov.{0,20}oxid/i)]);
define('AF-CH06-Q011',[term('Respirator or appropriate mask',/respirat|mask/i)]);
define('AF-CH07-Q006',[term('Identification markings on the wire/insulation',/marking|identification|\bcode\b/i)]);
define('AF-CH07-Q018',[term('Protective device close to power source',/(close|near).{0,25}source|source.{0,25}(close|near)/i)]);
define('AF-CH08-Q018',[term('Relief valve',/relief valve/i),term('Vents excess pressure overboard',/overboard|vent.{0,20}(air|atmosphere)|ambient air/i)]);
define('AF-CH08-Q020',[term('Remove moisture',/moisture|water/i),term('Remove contaminants',/contamin|dirt/i)]);
define('AF-CH09-Q015',[G('Prevent wheel skid/lock during braking',n=>/prevent|not|keep|avoid|without/.test(n)&&/skid|lock/.test(n))]);
define('AF-CH12-Q018',[G('Move/actuate flight controls',n=>/mov|actuat|torque/.test(n)&&/control/.test(n))]);
define('AF-CH15-Q004',[G('Supply engines from other/any fuel tanks',n=>/engine/.test(n)&&/tank/.test(n)&&/any|other|multiple|either|all/.test(n))]);
define('AF-CH15-Q005',[term('ON',/\bon\b/i),term('OFF',/\boff\b/i),term('Crossfeed',/cross ?feed/i)]);
define('AF-CH15-Q006',[G('Prevent fuel surging/sloshing',n=>/resist|prevent|reduc|stop|limit/.test(n)&&/surg|slosh/.test(n))]);
define('AF-CH15-Q008',[G('Sealed wing structure forms the fuel tank',n=>/wing/.test(n)&&/seal|structure|itself|forms/.test(n)&&/fuel|tank/.test(n))]);
define('AF-CH15-Q010',[term('Monitor danger of fuel freezing/ice crystals',/freez|ice crystal/i)]);
define('AF-CH15-Q012',[term('Measures fuel mass/weight rather than volume',/mass|weight/i)],1,/measur.{0,15}volume(?!.*(rather|instead))/);
define('AF-CH15-Q014',[term('Valve is moving between positions',/mov|motion|in.transit|between position/i)]);
define('AF-CH15-Q017',[term('Internal leak, such as leakage through a valve',/internal|valve.{0,20}leak|leak.{0,25}(valve|other tank)|other tank/i)]);
define('AF-CH15-Q018',[term('Slightly pressurize tank',/pressur/i),term('Soap solution detects leaks',/soap/i)]);
define('AF-CH16-Q008',[term('Activate test switch',/test switch|press to test|push.{0,10}test/i)]);
define('AF-CH16-Q018',[term('Normal/commanded fire-extinguisher discharge',/normal|pilot|command/i)]);
define('PP-CH01-Q005',[term('Stagger gaps so they do not align',/stagger|not align|do not align|non.align/i),term('Prevent blow-by/leakage',/blow.?by|leak/i)]);
define('BAKER-P-A-009',[G('Avoid valve spring surge/resonance or valve float',n=>/spring/.test(n)&&/surge|resonan|float/.test(n))]);
define('BAKER-P-A-014',[G('Reduce crankshaft torsional vibration',n=>/torsion/.test(n)&&/vibrat/.test(n)&&/reduc|overcome|dampen|prevent/.test(n))]);
define('ASA-P-D-K-014',[G('Temperature bulb resistance changes with oil temperature',n=>/resistance/.test(n)&&/bulb|temperat/.test(n))]);
define('ASA-P-E-K-014',[G('Test current must not ignite squib/powder charge',n=>/current|power|electric|charge/.test(n)&&/not|low|insufficient/.test(n)&&/ignit|set off|fire/.test(n))]);
define('ASA-P-F-K-021',[G('Stranded wire withstands vibration/flexing better',n=>/vibrat|flex/.test(n)&&/withstand|resist|better|less|break|fragile|whist/.test(n))]);
define('ASA-P-F-K-026',[term('Starter motor circuit',/starter/i)]);
define('ASA-G-F-K-024',[term('Shadow boards/foam cutouts/tool inventory',/shadow|cutout|cut out|inventory/i)]);
define('ASA-G-G-K-010',[G('Sustained tensile stress',n=>/tensile/.test(n)&&/sustain|continual|constant|continuous/.test(n))]);
define('ASA-G-G-K-027',[term('Chemical conversion coating/Alodine',/conversion|alodine|chemical surface film/i)]);
define('ASA-A-O-K-004',[term('Closed/recirculating waste system',/closed|recirculat/i),term('Vacuum waste system',/vacuum/i)]);
define('AF-CH15-Q001',[G('Reduce weight to permitted landing weight',n=>/reduc|lower|decreas/.test(n)&&/landing weight|weight.{0,20}land/.test(n))]);
define('AF-CH15-Q007',[term('Integral/wet wing cells',/integral|wet wing/i),term('Bladder cells',/bladder/i)]);
define('AF-CH15-Q015',[term('Maintain lateral balance/stability',/lateral.{0,20}(balanc|stabil)|(balanc|stabil).{0,20}lateral/i)]);
define('ASA-G-F-K-001',[G('Respect nose-wheel turning limits or disconnect required torsion links',n=>
  /turn.{0,15}limit|past.{0,15}stop/.test(n)&&/never|not|don t|avoid|limit/.test(n)||/disconnect/.test(n)&&/torsion link|torque link/.test(n))]);
define('ASA-G-F-K-028',[G('FOD damages aircraft systems/engines',n=>/damag|failure|fail/.test(n)&&/engine|aircraft|system|tire|landing gear/.test(n))]);
define('ASA-G-F-R-010',[term('Checklist prevents omitted steps and promotes safe operation',/safe|never miss|not miss|don t miss|ensur.{0,35}(step|procedure)|prevent.{0,20}(omission|miss|error)/i)]);
define('ASA-G-F-R-003',[G('Supplemental type certificate',n=>/\bstc\b/.test(n)||(/type certificate/.test(n)&&fuzzy(n,'supplemental',3)))]);
define('ASA-G-F-R-009',[G('Tools must be free of oil and grease',n=>/oil|grease|greaae/.test(n)&&/no |not |free|clean|without/.test(n))]);
define('ASA-G-F-K-021',[term('Improves anti-knock/octane rating',/octane|detonat|anti.?knock|critical pressure/i),term('Lubricates valves',/lubric/i)]);
define('ASA-G-G-K-005',[G('Flush/rinse with clean water; avoid scratching',n=>/flush|rinse/.test(n)&&/clean water|water/.test(n))],1,/abrasive|steel wool/);
// FAA-H-8083-32B, Chapter 3: a start-time induction fire may be
// extinguished by continuing cranking; use the aircraft procedure if it persists.
define('ASA-G-F-K-015',[term('Continue cranking/start the engine, or keep it running',/(continue|keep).{0,25}(crank|running)|start.{0,15}engine/i)],1,/(not|don t|stop).{0,15}crank/);

function reviewedRule(q,answer){
  const rule=REVIEW_RULES[q && q.id];
  if(!rule)return null;
  // Preserve clauses and punctuation for list notation; limit spelling repairs
  // to recurring nonnumeric technical transcription errors.
  const raw=String(answer??'');
  let n=norm(raw).replace(/['’]/g,' ').replace(/-/g,' ').replace(/\s+/g,' ')
    .replace(/\bthermo plastic\b/g,'thermoplastic')
    .replace(/\b(?:thermostting|thermosatic|thermosettting)\b/g,'thermosetting')
    .replace(/\bdoesnt\b/g,'does not')
    .replace(/\b(?:cant|can not)\b/g,'cannot')
    .replace(/\brelive\b/g,'relieve')
    .replace(/\b(?:demension|deminsion|dimensino)\b/g,'dimension')
    .replace(/\bprts\b/g,'parts')
    .replace(/\b(?:winshild|winshield)\b/g,'windshield')
    .replace(/\bvoltae\b/g,'voltage').replace(/\bcurrentm\b/g,'current')
    .replace(/\bfrezzer\b/g,'freezer').replace(/\bcource\b/g,'source')
    .replace(/\bconver\b/g,'convert').replace(/\bfractin\b/g,'fraction')
    .replace(/\bbateries\b/g,'batteries').replace(/\bborascope\b/g,'borescope')
    .replace(/\bdimesion\b/g,'dimension').replace(/\bmortix\b/g,'matrix')
    .replace(/\brelief spring\b/g,'relieve spring')
    .replace(/\b(?:windhsield|whenshidle|windshiled)s?\b/g,'windshield')
    .replace(/\b(?:themoplastic|thermplastic)s?\b/g,'thermoplastic')
    .replace(/\b(?:temperatue|temperaut[e]?|temperaute)\b/g,'temperature');
  const checks=rule.groups.map(g=>check(g.label,typeof g.test==='function'?g.test(n,raw):g.test.test(n)));
  if(q.id==='ASA-G-G-K-027'&&/cladding/.test(n)){
    return custom('hard',checks.some(c=>c.met)?'almost':'fail',
      [...checks,check('Repair with conversion coating; cladding is not a repair for anodizing',false)],2);
  }
  // Explicit negation of an otherwise affirmative concept cannot earn a pass.
  // Negative concepts (e.g. prevent leaks, thermoset does not melt) own their
  // negation locally instead of using a global bag-of-keywords rejection.
  if(rule.deny&&rule.deny.test(n))return custom('hard','fail',checks.map(c=>check(c.label,false)),rule.required);
  // A penetrant inspection needs the preparation/application/removal/developer
  // sequence, not merely those words in a contradictory order.
  if(q.id==='GEN-CH11-Q001'&&checks.every(c=>c.met)){
    const clean=n.search(/clean|wash/), dye=n.search(/penetrant|\bdye\b/),
      dwell=n.search(/dwell|soak|sit|wait/), dev=n.search(/develop/),
      inspect=n.search(/inspect|interpret|defect|crack|indication/);
    const removal=n.slice(Math.max(0,dye)+1).search(/remove|clean|wash|wipe/);
    if(!(clean<dye&&dye<dwell&&removal>=0&&dye+1+removal<dev&&dev<inspect)){
      return custom('hard','almost',[...checks,check('Perform inspection steps in the correct sequence',false)],rule.required+1);
    }
  }
  return mk('hard',checks,rule.required);
}


function grade(q,answer){
  let baseResult;
  try{baseResult=originalGrade(q,answer)}catch(err){
    baseResult={level:'fail',passed:false,count:0,total:0,required:1,concepts:[],confidence:.2,feedback:'Unable to grade this response.',reviewRecommended:true};
  }

  const text=norm(answer);
  if((!text && !/[½¼¾]/.test(String(answer))) || text === norm(q && q.question)){
    return resultFrom(mk('hard',[check('Provide a substantive answer',false)],1),baseResult);
  }
  const reviewed=reviewedRule(q,answer);
  if(reviewed)return resultFrom(reviewed,baseResult);
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
base.version='5.5-log-tuned-20261007';
base.__logTuneOriginalGrade=priorGrade;
base.__logTune20261007=true;
base.reviewedQuestionCount=Object.keys(REVIEW_RULES).length;
global.FAA_GRADER=base;
})(window);
