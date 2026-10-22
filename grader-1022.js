(function(global){
'use strict';

/*
  Oral grader follow-up tune
  Built from the October 7–22, 2026 answer-log batch.

  IMPORTANT:
  Load this AFTER grader-v5.js and AFTER the existing grader-log-tune.js.
  It intentionally wraps the currently installed tuned grader so previous
  fixes are preserved.
*/

const base = global.FAA_GRADER;
if(!base || typeof base.grade !== 'function'){
  console.warn('[oral grader] 2026-10-22 tune could not find FAA_GRADER');
  return;
}
if(base.__logTune20261022) return;

const priorGrade = base.grade.bind(base);
const RANK = {fail:0, almost:1, pass:2};

function norm(s){
  let x=String(s||'').toLowerCase()
    .replace(/[’]/g,"'")
    .replace(/[–—]/g,'-')
    .replace(/(?<=\d),(?=\d)/g,'')
    .replace(/π/g,' pi ')
    .replace(/[×*]/g,' x ')
    .replace(/[÷]/g,' / ')
    .replace(/²/g,' squared ')
    .replace(/³/g,' cubed ');

  x=x
    .replace(/\brefridgerant\b|\bregrigerant\b/g,'refrigerant')
    .replace(/\bassiatnce\b/g,'assistance')
    .replace(/\bmaintence\b|\bmaitenance\b/g,'maintenance')
    .replace(/\bballancing\b/g,'balancing')
    .replace(/\bexhuast\b|\bexhasut\b/g,'exhaust')
    .replace(/\bpnumatic\b/g,'pneumatic')
    .replace(/\bdegauss\b|\bdemagnatise\b|\bunmganatise\b/g,'demagnetize')
    .replace(/\bflahslight\b/g,'flashlight')
    .replace(/\bsingel\b/g,'single')
    .replace(/\bdeveolper\b/g,'developer');

  return x.replace(/[^a-z0-9.%/+^=\-\s]+/g,' ')
          .replace(/\s+/g,' ')
          .trim();
}

function any(n,terms){ return terms.some(t=>n.includes(t)); }
function nums(n){ return (n.match(/\d+(?:\.\d+)?/g)||[]).map(Number).filter(Number.isFinite); }
function check(label,met){ return {label,met:!!met}; }

function mk(kind,checks,required,levelOverride){
  const count=checks.filter(c=>c.met).length;
  let level=levelOverride || (count>=required ? 'pass' : count>=Math.max(1,required-1) ? 'almost' : 'fail');
  if(required===1 && count===0 && !levelOverride) level='fail';
  return {kind,level,checks,required,count};
}
function custom(kind,level,checks,required){
  return {kind,level,checks,required,count:checks.filter(c=>c.met).length};
}
function resultFrom(rule,baseResult){
  const passed=rule.level==='pass';
  return {
    ...(baseResult||{}),
    source:'log-tuned-rule-20261022',
    version:'5.7-log-tuned-20261022',
    orderOK:true,
    level:rule.level,
    passed,
    count:rule.count,
    total:rule.checks.length,
    required:rule.required,
    concepts:rule.checks.map(c=>({
      label:c.label,met:c.met,score:c.met?1:0,matchedTokens:[],matchedTerm:null
    })),
    confidence:passed?.96:(rule.level==='almost'?.72:.5),
    feedback:passed
      ? 'The required key ideas were recognized.'
      : rule.level==='almost'
        ? 'Your answer is close. Add or clarify the missing key idea.'
        : 'Review the expected answer and try again using the key technical ideas.',
    reviewRecommended:!passed,
    logTuned:true
  };
}

/*
  "hard" rules may correct either a false negative OR a false positive.
  "upgrade" rules only improve a result; they never turn a prior pass into a miss.
*/
function reviewedRule(q,answer){
  const id=q&&q.id||'';
  const n=norm(answer);
  const ns=nums(n);

  // ---------------------------------------------------------------------------
  // HARD GUARDS — clear false-positive / exact-value issues found in the log
  // ---------------------------------------------------------------------------

  if(id==='PP-CH02-Q022'){
    const throttle=any(n,['throttle','throtle']);
    const rpm=any(n,['rpm','r.p.m']);
    return custom('hard',throttle&&rpm?'pass':(throttle||rpm)?'almost':'fail',
      [check('Throttle opening',throttle),check('Engine RPM',rpm)],2);
  }

  if(id==='PP-CH04-Q008'){
    const rpm=any(n,['rpm','r.p.m','revolutions per minute','rotations per minute']);
    const percent=any(n,['percent','percentage','%']);
    return custom('hard',rpm&&percent?'pass':(rpm||percent)?'almost':'fail',
      [check('Percent RPM',rpm&&percent)],1);
  }

  if(id==='GEN-CH10-Q018'){
    const five=/\b5\b|\bfive\b/.test(n);
    const eight=/\b8\b|\beight\b/.test(n);
    const ten=/\b10\b|\bten\b/.test(n);
    if(five&&eight) return mk('hard',[check('5 to 8 percent',true)],1);
    if(ten) return custom('hard','fail',[check('5 to 8 percent',false)],1);
    if(five||eight) return custom('hard','almost',[check('5 to 8 percent range',false)],1);
    return null;
  }

  if(id==='GEN-CH14-Q020'){
    const no=/\bno\b|\bnot automatically\b/.test(n);
    const owner=n.includes('owner');
    return custom('hard',no&&owner?'pass':no?'almost':'fail',
      [check('No',no),check('Registered aircraft owner receives ADs',owner)],2);
  }

  if(id==='GEN-CH08-Q004'){
    const head=n.includes('head');
    const marking=any(n,['mark','stamp','code','asterisk','cross','dash','triangle','identification','identified']);
    return custom('hard',head&&marking?'pass':(head||marking)?'almost':'fail',
      [check('Code/identification marking on bolt head',head&&marking)],1);
  }

  if(id==='ASA-A-G-K-020'){
    const high=n.includes('high');
    const pressure=n.includes('pressure');
    const gas=any(n,['gas','vapor']);
    const liquid=n.includes('liquid');
    if(liquid&&!gas) return custom('hard','fail',[check('High-pressure gas',false)],1);
    return custom('hard',high&&pressure&&gas?'pass':(gas||(high&&pressure))?'almost':'fail',
      [check('High-pressure gas',high&&pressure&&gas)],1);
  }

  if(id==='AF-CH12-Q001'){
    const groups=[
      check('Microphone',any(n,['microphone',' mic '])),
      check('Transmitter',n.includes('transmitter')),
      check('Antenna(s)',n.includes('antenna')),
      check('Receiver',n.includes('receiver')),
      check('Speaker/headphones',any(n,['speaker','headphone','headset']))
    ];
    const c=groups.filter(x=>x.met).length;
    return custom('hard',c>=4?'pass':c>=2?'almost':'fail',groups,4);
  }

  if(id==='GEN-CH08-Q007'){
    if(any(n,['43.13-2b','43 13 2b'])) return custom('hard','fail',[check('Correct torque reference',false)],1);
    if(any(n,['43.13-1b','43 13 1b','43.13 1b','43 13-1b','torque table','torque chart','standard torque table','standard torque chart']))
      return mk('hard',[check('Standard torque table / AC 43.13-1B',true)],1);
    if(any(n,['43.13','43 13'])) return custom('hard','almost',[check('Specify AC 43.13-1B or a standard torque table',false)],1);
    return null;
  }

  if(id==='GEN-CH02-Q017'){
    const f59=ns.some(x=>Math.abs(x-59)<.2);
    const c15=ns.some(x=>Math.abs(x-15)<.2);
    if(f59||c15) return mk('hard',[check('59°F or 15°C',true)],1);
    if(ns.length) return custom('hard','fail',[check('59°F or 15°C',false)],1);
    return null;
  }

  if(id==='GEN-CH02-Q014'){
    const symbolic=/\bf\s*=\s*(?:p\s*x\s*a|a\s*x\s*p)\b/.test(n.replace(/\*/g,'x'));
    const words=n.includes('force')&&n.includes('pressure')&&n.includes('area')&&any(n,['times','multiplied']);
    if(symbolic||words) return mk('hard',[check('Force = pressure × area',true)],1);
    return null;
  }

  if(id==='GEN-CH03-Q001'){
    if(ns.some(x=>Math.abs(x-1000)<.1)||any(n,['one thousand','a thousand']))
      return mk('hard',[check('1,000 watts',true)],1);
    if(ns.length) return custom('hard','fail',[check('1,000 watts',false)],1);
    return null;
  }

  if(id==='GEN-CH14-Q032'){
    const inspection=n.includes('inspection');
    const extra=any(n,['337','major repair','major repairs','alteration','alterations']);
    if(inspection&&!extra) return mk('hard',[check('Inspection records',true)],1);
    if(inspection&&extra) return custom('hard','almost',[check('Only inspection records',false)],1);
    return null;
  }

  if(id==='GEN-CH14-Q028'){
    const record=any(n,['maintenance record','maintenance records','logbook','log book','aircraft record','engine logbook']);
    const extra=n.includes('337');
    if(record&&!extra) return mk('hard',[check('Appropriate maintenance record/logbook',true)],1);
    if(record&&extra) return custom('hard','almost',[check('Record the inspection in the maintenance record, not Form 337',false)],1);
    return null;
  }

  // ---------------------------------------------------------------------------
  // HIGH-CONFIDENCE FALSE-NEGATIVE FIXES
  // ---------------------------------------------------------------------------

  if(id==='GEN-CH15-Q018'){
    const ok=n.includes('faa')&&any(n,['contact','consult','call','ask','seek','help','assist','renew']);
    return ok?mk('upgrade',[check('Contact FAA for assistance',true)],1):null;
  }

  if(id==='GEN-CH10-Q017'){
    const connected=any(n,['connect','connected','coupled']);
    const disconnected=any(n,['disconnect','disconnected']);
    const openish=any(n,['open','flow']);
    const closeish=any(n,['close','closed','seal','sealed','shut']);
    const spring=n.includes('spring');
    if(connected&&disconnected&&openish&&closeish&&spring)
      return mk('upgrade',[check('Open when connected and spring-closed when disconnected',true)],1);
    if((connected&&openish)||(disconnected&&closeish))
      return custom('upgrade','almost',[check('Describe both coupled and disconnected operation',false)],1);
    return null;
  }

  if(id==='GEN-CH14-Q021'){
    return /\bbi\s*-?\s*weekly\b/.test(n)
      ? mk('upgrade',[check('Biweekly supplements',true)],1)
      : null;
  }

  if(id==='GEN-CH14-Q024'){
    const two=/\b2\b|\btwo\b/.test(n);
    const owner=n.includes('owner');
    const faa=any(n,['faa','fsdo','flight standards']);
    if(two&&owner&&faa) return mk('upgrade',[check('Two copies: owner and FAA/FSDO',true)],1);
    if(two&&(owner||faa)) return custom('upgrade','almost',[check('Two copies distributed to owner and FAA/FSDO',false)],1);
    return null;
  }

  if(id==='GEN-CH13-Q016'){
    const fuel=any(n,['correct fuel','proper fuel','approved fuel','right fuel','fuel grade','fuel type']);
    const ground=any(n,['ground','bond']);
    const protect=any(n,['damage','damaging'])&&any(n,['surface','structure','nozzle','hose','fuel line',' line']);
    const checks=[check('Correct fuel',fuel),check('Ground/bond aircraft and refueler',ground),check('Protect aircraft from hose/nozzle damage',protect)];
    const c=checks.filter(x=>x.met).length;
    return c>=3?custom('upgrade','pass',checks,3):c===2?custom('upgrade','almost',checks,3):null;
  }

  if(id==='GEN-CH01-Q003'){
    return (n.includes('lcd')||n.includes('common denominator'))
      ? mk('upgrade',[check('Common denominator',true)],1)
      : null;
  }

  if(id==='GEN-CH15-Q014'){
    const ia=/\bia\b/.test(n)||any(n,['inspection authorization','inspection authority']);
    return ia?mk('upgrade',[check('Inspection Authorization (IA)',true)],1):null;
  }

  if(id==='GEN-CH13-Q008'){
    const temperature=any(n,['egt','exhaust gas temperature','temperature','tit']);
    const excessive=any(n,['high','exceed','exceeds','exceeded','excessive','over limit','above limit','critical']);
    const start=any(n,['start','starting']);
    const rich=n.includes('rich');
    if(temperature&&excessive&&(start||rich))
      return mk('upgrade',[check('Excessive EGT/TIT during start',true)],1);
    if(temperature&&excessive)
      return custom('upgrade','almost',[check('Tie excessive temperature to engine start',false)],1);
    return null;
  }

  if(id==='GEN-CH06-Q021'){
    const cg=any(n,['cg','c.g','center of gravity']);
    const limit=any(n,['limit','range','acceptable','allowable','proper']);
    const load=any(n,['load','loading','distribute','distribution']);
    return cg&&(limit||load)
      ? mk('upgrade',[check('Distribute/load aircraft to keep CG within limits',true)],1)
      : null;
  }

  if(id==='GEN-CH01-Q013'){
    const ok=/\b10\b.{0,12}\b(?:5|fifth)\b/.test(n)||n.includes('10^5');
    return ok?mk('upgrade',[check('10 to the fifth power',true)],1):null;
  }

  if(id==='GEN-CH02-Q006'){
    const ok=/\b(?:class\s*)?(?:2|second)\b/.test(n);
    return ok?mk('upgrade',[check('Second-class lever',true)],1):null;
  }

  if(id==='GEN-CH14-Q025'){
    const transfer=any(n,['transfer','transferred','given','give']);
    const destination=any(n,['record','records','buyer','new owner','with aircraft','with the aircraft']);
    return transfer&&destination
      ? mk('upgrade',[check('Transfer AD-status records to buyer with aircraft',true)],1)
      : null;
  }

  if(id==='ASA-A-G-K-019'){
    return any(n,['freon','refrigerant 12','r 12','r12','134a','r-134a'])
      ? mk('upgrade',[check('Refrigerant 12/Freon/R-134a',true)],1)
      : null;
  }

  if(id==='GEN-CH12-Q002'){
    const protect=any(n,['avoid','protect']);
    const damage=any(n,['damage','damaged','contaminate','contaminated','moisture']);
    return protect&&damage
      ? mk('upgrade',[check('Avoid/protect areas susceptible to damage or contamination',true)],1)
      : null;
  }

  if(id==='GEN-CH13-Q012'){
    return any(n,['octane','lean mixture performance','performance number'])
      ? mk('upgrade',[check('Octane/lean-mixture performance number',true)],1)
      : null;
  }

  if(id==='GEN-CH14-Q034'){
    if(n.includes('manufacturer'))
      return mk('upgrade',[check('Engine manufacturer',true)],1);
    if(n.includes('overhaul')&&any(n,['facility','shop'])&&any(n,['approved','authorized']))
      return custom('upgrade','almost',[check('Overhaul facility must be approved by manufacturer',false)],1);
    return null;
  }

  if(id==='GEN-CH13-Q018'){
    return (/\baim\b/.test(n)||n.includes('aeronautical information manual'))
      ? mk('upgrade',[check('Aeronautical Information Manual (AIM)',true)],1)
      : null;
  }

  if(id==='GEN-CH12-Q016'){
    return any(n,['scotch brite','scotch-brite','nylon scrub','bristle brush','aluminum wool','aluminum wire brush'])
      ? mk('upgrade',[check('Approved non-steel corrosion-removal tool',true)],1)
      : null;
  }

  if(['GEN-CH14-Q013','GEN-CH14-Q014','ASA-G-C-K-019'].includes(id)){
    return any(n,['tcds','type certificate data','aircraft specifications','aircraft specs'])
      ? mk('upgrade',[check('Type Certificate Data Sheet / Aircraft Specifications',true)],1)
      : null;
  }

  if(id==='GEN-CH15-Q017'){
    return /\bone year\b|\b1 year\b|\b12 months?\b/.test(n)
      ? mk('upgrade',[check('One year',true)],1)
      : null;
  }

  if(id==='ASA-G-A-K-042'){
    return any(n,['thousandth','0.001','1/1000'])
      ? mk('upgrade',[check('One thousandth of an amp',true)],1)
      : null;
  }

  if(id==='ASA-G-B-K-004'){
    return n.includes('right')&&any(n,['bottom','lower'])
      ? mk('upgrade',[check('Lower/bottom right corner',true)],1)
      : null;
  }

  if(id==='ASA-G-B-K-014'){
    return n.includes('manual')&&any(n,['aircraft','maintenance','wiring'])
      ? mk('upgrade',[check('Aircraft maintenance/wiring manual',true)],1)
      : null;
  }

  if(id==='ASA-G-A-K-037'){
    return ns.some(x=>Math.abs(x-12)<.01)
      ? mk('upgrade',[check('12 volts',true)],1)
      : null;
  }

  if(id==='ASA-G-J-K-006'){
    return (n.includes('gear ratio')||(n.includes('ratio')&&n.includes('teeth')))
      ? mk('upgrade',[check('Gear ratio / ratio of teeth',true)],1)
      : null;
  }

  if(id==='GEN-CH05-Q001'){
    const ok=['3','three'].includes(n) ||
      /\bone\s*(?:to|-)\s*three\b|\b1\s*(?:to|-)\s*3\b/.test(n) ||
      any(n,['one two or three','one, two, or three','at most three','up to three']);
    return ok?mk('upgrade',[check('One, two, or three views / up to three',true)],1):null;
  }

  if(id==='ASA-G-B-K-002'){
    return (['3','three'].includes(n)||/\bthree views?\b/.test(n))
      ? mk('upgrade',[check('Three views',true)],1)
      : null;
  }

  if(id==='GEN-CH14-Q007'){
    return n.includes('ad')&&any(n,['compliance','time','timeframe','period','specified','listed','state'])
      ? mk('upgrade',[check('Compliance time/period is specified in the AD',true)],1)
      : null;
  }

  if(id==='GEN-CH10-Q020'){
    const quick=any(n,['quick','ease','easy'])&&any(n,['connect','disconnect','installation','removal']);
    const fluid=any(n,['fluid loss','fluid from escaping','prevent fluid loss','minimal fluid loss','loss of fluid']);
    const air=any(n,['air from entering','air getting in','air infiltration','air intrusion','entrance of air']);
    const checks=[check('Quick connection/disconnection',quick),check('Avoid fluid loss',fluid),check('Avoid air entry',air)];
    const c=checks.filter(x=>x.met).length;
    return c>=2?custom('upgrade','pass',checks,2):c===1?custom('upgrade','almost',checks,2):null;
  }

  if(id==='GEN-CH11-Q008'){
    const magnetize=any(n,['magnetize','magnetise','magnetized']);
    const particles=any(n,['magnetic particles','ferromagnetic','ferrous','magnetic solution','magnetic fluid']);
    const inspect=any(n,['inspect','defect','crack','indication','clump','deposit']);
    const checks=[check('Magnetize part',magnetize),check('Apply magnetic/ferromagnetic particles',particles),check('Inspect indications',inspect)];
    const c=checks.filter(x=>x.met).length;
    return c===3?custom('upgrade','pass',checks,3):c===2?custom('upgrade','almost',checks,3):null;
  }

  if(id==='GEN-CH11-Q001'){
    const clean=any(n,['clean','preclean','pre clean']);
    const penetrant=any(n,['penetrant','dye']);
    const dwell=any(n,['dwell','wait','soak','sit']);
    const remove=any(n,['remove excess','wipe','clean excess','remove the penetrant','remove penetrant']);
    const developer=any(n,['developer','blotter']);
    const inspect=any(n,['inspect','interpret','indication','defect','crack']);
    const checks=[
      check('Clean/preclean',clean),check('Apply penetrant',penetrant),check('Dwell',dwell),
      check('Remove excess penetrant',remove),check('Apply developer',developer),check('Inspect/interpret',inspect)
    ];
    const c=checks.filter(x=>x.met).length;
    if(penetrant&&c===6) return custom('upgrade','pass',checks,6);
    if(penetrant&&c>=4) return custom('upgrade','almost',checks,6);
    return null;
  }

  if(id==='GEN-CH12-Q011'){
    const corrosive=any(n,['corrosive','corrosion','corrosive elements']);
    const tensile=n.includes('tensile')&&n.includes('stress');
    const sustained=any(n,['sustained','prolonged','duration','constant','continuous'])||tensile;
    return corrosive&&tensile&&sustained
      ? mk('upgrade',[check('Corrosive environment + sustained tensile stress',true)],1)
      : null;
  }

  if(id==='GEN-CH12-Q015'){
    const concepts=[
      any(n,['clean']),any(n,['lubricat','lube']),
      any(n,['treat','coat','coating','paint','primer','alodine','anodize']),
      any(n,['seal']),any(n,['inspect']),any(n,['cover']),any(n,['drain'])
    ];
    return concepts.filter(Boolean).length>=4
      ? mk('upgrade',[check('At least four valid corrosion-prevention procedures',true)],1)
      : null;
  }

  if(id==='GEN-CH10-Q005'){
    return n.includes('single')&&n.includes('double')
      ? mk('upgrade',[check('Single and double flares',true)],1)
      : null;
  }

  if(id==='GEN-CH12-Q003'){
    const soap=any(n,['soap','detergent']);
    const water=n.includes('water');
    if(soap&&water) return mk('upgrade',[check('Soap/detergent and water',true)],1);
    if(soap) return custom('upgrade','almost',[check('Include water with soap/detergent',false)],1);
    return null;
  }

  if(id==='GEN-CH12-Q004'){
    const solvent=any(n,['solvent','solvents']);
    const emulsion=any(n,['emulsion','emulsions','emulsifier','emulsifiers']);
    if(solvent&&emulsion) return mk('upgrade',[check('Solvents and emulsions',true)],1);
    if(solvent||emulsion) return custom('upgrade','almost',[check('Solvents and emulsions',false)],1);
    return null;
  }

  if(id==='GEN-CH03-Q007'){
    const source=any(n,['source','battery','power source']);
    const conductors=any(n,['wire','wires','conductor']);
    const load=any(n,['load','bulb','lamp','resistance']);
    return source&&conductors&&load
      ? mk('upgrade',[check('Source, load, and conductors',true)],1)
      : null;
  }

  if(id==='GEN-CH03-Q013'){
    const sg=any(n,['specific gravity','gravity']);
    const change=any(n,['does not change',"doesn't change",'no significant change','not vary','does not vary',"doesn't vary",'not much']);
    const state=any(n,['charge','charged','discharge','discharged','charge states']);
    if(sg&&change&&state) return mk('upgrade',[check('Specific gravity does not significantly change with charge state',true)],1);
    if(sg&&change) return custom('upgrade','almost',[check('Relate unchanged specific gravity to charge/discharge',false)],1);
    return null;
  }

  if(id==='GEN-CH05-Q003'){
    const detail=any(n,['detail view','detailed view','detail drawing']);
    const scale=any(n,['larger scale','large scale','enlarged']);
    if(detail&&scale) return mk('upgrade',[check('Detail view drawn at larger scale',true)],1);
    if(detail) return custom('upgrade','almost',[check('Also state it is usually drawn at a larger scale',false)],1);
    return null;
  }

  if(id==='GEN-CH07-Q006'){
    const brittle=any(n,['brittle','brittleness']);
    const ductile=any(n,['lose ductility','loss of ductility','loose its ductile','lose its ductile','ductile strength']);
    return (brittle||ductile)
      ? mk('upgrade',[check('May become brittle / lose ductility near weld',true)],1)
      : null;
  }

  if(id==='GEN-CH11-Q005'){
    const width=/\b3\s*(?:to|-|through)\s*5\b|\bthree\s*(?:to|through)\s*five\b/.test(n);
    const penetration=(n.includes('100')&&n.includes('penetration'))||any(n,['full penetration','complete penetration']);
    const checks=[check('Bead width 3–5 × base-metal thickness',width),check('100% penetration',penetration)];
    const c=checks.filter(x=>x.met).length;
    return c===2?custom('upgrade','pass',checks,2):c===1?custom('upgrade','almost',checks,2):null;
  }

  if(id==='GEN-CH13-Q001'){
    const groups=[
      any(n,['fire']),
      any(n,['propeller','prop ','rotor','jet blast','prop wash','inlet','intake']),
      any(n,['aircraft','vehicle','car','people','person','obstacle','collision']),
      any(n,['fod','foreign object','rock','gravel','rag','loose hardware','debris']),
      any(n,['noise','hearing']),
      n.includes('hydraulic lock'),
      n.includes('weathervan')
    ];
    const c=groups.filter(Boolean).length;
    return c>=3
      ? mk('upgrade',[check('At least three valid ground-operation hazards',true)],1)
      : c===2
        ? custom('upgrade','almost',[check('Name at least three valid hazards',false)],1)
        : null;
  }

  if(id==='GEN-CH13-Q003'){
    const groups=[
      any(n,['manual','flight manual','instructions']),
      n.includes('clear')&&any(n,['prop','inlet','intake','area']),
      any(n,['stone','gravel','fod','foreign object','loose']),
      any(n,['blast','exhaust'])&&any(n,['clear','hangar','aircraft','area']),
      any(n,['fire guard','fireguard','fire extinguisher']),
      any(n,['trained crew','trained'])
    ];
    const c=groups.filter(Boolean).length;
    return c>=3
      ? mk('upgrade',[check('Multiple valid engine-start/run safety precautions',true)],1)
      : c===2
        ? custom('upgrade','almost',[check('Add another key engine-start/run precaution',false)],1)
        : null;
  }

  if(id==='GEN-CH13-Q021'){
    return any(n,['cloudy','hazy','foggy','milky','slug of water','water slug','water at bottom','water on bottom'])
      ? mk('upgrade',[check('Cloudy/hazy sample or visible water slug',true)],1)
      : null;
  }

  if(id==='GEN-CH15-Q010'){
    return any(n,['100 hour','100-hour'])
      ? mk('upgrade',[check('May perform/approve 100-hour inspections',true)],1)
      : null;
  }

  if(id==='GEN-CH14-Q041'){
    return any(n,['maintenance record','form 337','337'])
      ? mk('upgrade',[check('Return-to-service approval in maintenance record/Form 337',true)],1)
      : null;
  }

  // Carry forward the reviewed Oct. 7 follow-up rule for ordinary A&P RTS wording.
  if(id==='GEN-CH15-Q009'){
    const approve=any(n,['approve','sign off'])&&n.includes('service');
    const scope=any(n,['part 65','far 65','within rating','within authority','appropriate rating']) ||
      (n.includes('minor')&&n.includes('repair')&&n.includes('alteration')) ||
      any(n,['100 hour','100-hour']);
    return approve&&scope
      ? mk('upgrade',[check('Return-to-service authority within mechanic privileges',true)],1)
      : null;
  }

  if(id==='GEN-CH02-Q005'){
    const pivot=any(n,['fulcrum','pivot']);
    const bar=any(n,['bar','arm','lever arm']);
    const functional=any(n,['load','effort']);
    return pivot&&(bar||functional)
      ? mk('upgrade',[check('Lever includes fulcrum/pivot and rigid arm/bar',true)],1)
      : null;
  }

  // ---------------------------------------------------------------------------
  // POWERPLANT
  // ---------------------------------------------------------------------------

  if(id==='PP-CH04-Q007'){
    return any(n,['balance','balancing','weight and balance'])
      ? mk('upgrade',[check('Maintain turbine-wheel balance',true)],1)
      : null;
  }

  if(id==='PP-CH04-Q005'){
    return any(n,['negligible','not noticeable','no noticeable','little effect','minimal effect'])
      ? mk('upgrade',[check('Negligible effect',true)],1)
      : null;
  }

  if(id==='PP-CH05-Q013'){
    return n.includes('exhaust')&&any(n,['gas','gasses','gases','air'])
      ? mk('upgrade',[check('Engine exhaust gas',true)],1)
      : null;
  }

  if(id==='PP-CH03-Q015'){
    return any(n,['bleed air','pneumatic','air bleed'])
      ? mk('upgrade',[check('Supplying bleed/pneumatic air',true)],1)
      : null;
  }

  if(id==='PP-CH03-Q008'){
    return any(n,['cooling air','secondary air'])
      ? mk('upgrade',[check('Cooling/secondary air along liner',true)],1)
      : null;
  }

  if(id==='PP-CH02-Q004'){
    const valve=n.includes('valve');
    const ring=n.includes('ring');
    const seal=any(n,['seal','leak','blow by','blowby']);
    if(valve&&ring&&seal) return mk('upgrade',[check('Check valve and ring sealing',true)],1);
    if(seal&&(valve||ring)) return custom('upgrade','almost',[check('Include both valve and piston-ring sealing',false)],1);
    return null;
  }

  if(id==='PP-CH08-Q033'){
    return any(n,['high temperature','high heat','hot area','exhaust','heating duct','engine bay'])
      ? mk('upgrade',[check('High-temperature area',true)],1)
      : null;
  }

  if(id==='PP-CH08-Q006'){
    const redundancy=any(n,['redundan','safety','backup']);
    const efficiency=any(n,['efficien','combustion']);
    if(redundancy&&efficiency) return mk('upgrade',[check('Redundancy and combustion efficiency',true)],1);
    if(redundancy||efficiency) return custom('upgrade','almost',[check('Redundancy and combustion efficiency',false)],1);
    return null;
  }

  if(id==='PP-CH07-Q032'){
    const failure=n.includes('one')&&any(n,['fail','seize','failed','seized']);
    const shear=any(n,['shear','break','weakest point']);
    const remaining=any(n,['other','remaining'])&&any(n,['operate','work','function','continue']);
    if(failure&&shear&&remaining) return mk('upgrade',[check('Failed element shears so other element can continue',true)],1);
    if(shear&&remaining) return custom('upgrade','almost',[check('Tie shearing action to failure/seizure of one element',false)],1);
    return null;
  }

  if(id==='PP-CH07-Q016'){
    const electronic=any(n,['electronic control','electronic fuel control','ecu','computer']);
    const hydro=any(n,['hydromechanical','hydro mechanical'])&&n.includes('fuel');
    return electronic&&hydro
      ? mk('upgrade',[check('Electronic control + hydromechanical fuel control',true)],1)
      : null;
  }

  if(id==='PP-CH06-Q010'){
    return any(n,['loss of power','reduces engine performance','reduced engine performance','power loss','reduction in power'])
      ? mk('upgrade',[check('Loss/reduction of engine power',true)],1)
      : null;
  }

  if(id==='PP-CH01-Q010'){
    const volumetric=any(n,['volumetric efficien','thermal efficiency']);
    const cooling=any(n,['lower cylinder','reduce operating temp','lower operating temp','cooler cht','reduce cht','lower cht','dec cht']);
    if(volumetric&&cooling) return mk('upgrade',[check('Better volumetric efficiency and lower cylinder temperature',true)],1);
    if(volumetric||cooling) return custom('upgrade','almost',[check('Include both efficiency and lower cylinder temperature',false)],1);
    return null;
  }

  if(id==='PP-CH03-Q006'){
    const split=any(n,['split compressor','dual spool','twin spool','dual compressor']);
    const shafts=any(n,['two shafts','2 shafts','separate rotor shafts','one inside the other']);
    return (split||shafts)
      ? mk('upgrade',[check('Dual/split-spool compressor with separate/concentric shafts',true)],1)
      : null;
  }

  if(id==='PP-CH03-Q010'){
    const direct=any(n,['direct','directs']);
    const angle=any(n,['angle','proper angel','specific angle']);
    const turbine=any(n,['turbine','blade','rotor']);
    if(direct&&angle&&turbine) return mk('upgrade',[check('Direct airflow to turbine rotor/blades at proper angle',true)],1);
    if(direct&&turbine) return custom('upgrade','almost',[check('Include the proper/specific angle',false)],1);
    return null;
  }

  if(id==='PP-CH05-Q008'){
    return any(n,['rough idle','idle running rough','runs rough at low rpm','rough at low rpm'])
      ? mk('upgrade',[check('Rough running at idle/low RPM',true)],1)
      : null;
  }

  if(id==='PP-CH06-Q022'){
    const fod=any(n,['fod','foreign object','foreign objects']);
    const hot=any(n,['hot gas','hot exhaust','re-ingestion','reingestion']);
    if(fod&&hot) return mk('upgrade',[check('FOD ingestion + hot-gas reingestion',true)],1);
    if(fod||hot) return custom('upgrade','almost',[check('Include both FOD and hot-gas reingestion hazards',false)],1);
    return null;
  }

  if(id==='PP-CH12-Q014'){
    return n.includes('maintenance manual')&&any(n,['propeller','prop'])
      ? mk('upgrade',[check("Propeller manufacturer's maintenance instructions",true)],1)
      : null;
  }

  // ---------------------------------------------------------------------------
  // AIRFRAME / SECONDARY
  // ---------------------------------------------------------------------------

  if(id==='ASA-A-F-K-005'){
    return n.includes('standpipe')
      ? mk('upgrade',[check('Main pump draws from standpipe',true)],1)
      : null;
  }

  if(id==='ASA-A-F-K-004'){
    return n.includes('mineral')&&any(n,['phosphate','skydrol'])
      ? mk('upgrade',[check('Mineral-base and phosphate-ester/Skydrol',true)],1)
      : null;
  }

  if(id==='ASA-A-F-K-010'){
    return n.includes('maintenance manual')
      ? mk('upgrade',[check('Aircraft maintenance manual',true)],1)
      : null;
  }

  if(id==='ASA-A-I-K-009'){
    const static=n.includes('static');
    const dissipate=any(n,['dissipat','discharge','remove','bleed off']);
    const radio=any(n,['radio','interference','frequency']);
    return static&&dissipate&&radio
      ? mk('upgrade',[check('Dissipate static to reduce radio interference',true)],1)
      : null;
  }

  if(id==='ASA-A-I-K-044'){
    return any(n,['relieve the pilot','free the pilot','pilot of flying','pilot from flying'])
      ? mk('upgrade',[check('Relieve pilot from continuous manual flying',true)],1)
      : null;
  }

  if(id==='ASA-A-J-K-009'){
    return n.includes('leak')&&any(n,['check','test','inspect'])
      ? mk('upgrade',[check('Leak-check fuel system',true)],1)
      : null;
  }

  if(id==='ASA-A-J-K-010'){
    return any(n,['surging','surge','sloshing','slosh'])
      ? mk('upgrade',[check('Prevent fuel surging/sloshing',true)],1)
      : null;
  }

  if(id==='ASA-A-J-K-012'){
    const water=n.includes('water');
    const contam=any(n,['contamin','debris','dirt']);
    if(water&&contam) return mk('upgrade',[check('Collect water and contaminants/debris',true)],1);
    if(water||contam) return custom('upgrade','almost',[check('Collect both water and contaminants',false)],1);
    return null;
  }

  if(id==='ASA-A-K-K-033'){
    return n.includes('wire')&&n.includes('top')
      ? mk('upgrade',[check('Electrical wire bundle on top',true)],1)
      : null;
  }

  if(id==='ASA-A-L-K-003'){
    return n.includes('pitot')&&any(n,['electric','heated','heat'])
      ? mk('upgrade',[check('Electrically heated pitot tube',true)],1)
      : null;
  }

  if(id==='ASA-A-L-K-004'){
    return n.includes('windshield')&&any(n,['heat','heated','heater','electric'])
      ? mk('upgrade',[check('Electrically heated windshield',true)],1)
      : null;
  }

  if(id==='ASA-A-L-K-005'){
    const ok=['after','after ice forms','after it forms','after formed'].includes(n)||(n.includes('after')&&n.includes('ice'));
    return ok?mk('upgrade',[check('Operate after ice forms',true)],1):null;
  }

  if(id==='ASA-A-G-K-025'){
    return n.includes('meter')&&n.includes('refrigerant')
      ? mk('upgrade',[check('Meters refrigerant into evaporator',true)],1)
      : null;
  }

  if(id==='ASA-A-G-K-028'){
    return any(n,['electronic leak detector','electronic probe','leak detector','electronic detector'])
      ? mk('upgrade',[check('Electronic refrigerant leak detector/probe',true)],1)
      : null;
  }

  if(id==='AF-CH10-Q020'){
    return any(n,['alert','warn'])&&any(n,['pilot','crew'])&&any(n,['malfunction','discrep','problem','fault'])
      ? mk('upgrade',[check('Alert crew to a malfunction/discrepancy',true)],1)
      : null;
  }

  if(id==='AF-CH17-Q014'){
    return n==='faa'
      ? custom('upgrade','almost',[check('Specify local FAA Flight Standards District Office',false)],1)
      : null;
  }

  return null;
}

base.grade=function(q,answer){
  let oldResult;
  try{
    oldResult=priorGrade(q,answer);
  }catch(err){
    oldResult={
      level:'fail',passed:false,count:0,total:0,required:1,concepts:[],
      confidence:.2,feedback:'Unable to grade this response.',reviewRecommended:true
    };
  }

  const rule=reviewedRule(q,answer);
  if(!rule) return oldResult;

  if(rule.kind==='hard') return resultFrom(rule,oldResult);

  if((RANK[rule.level]||0)>(RANK[oldResult.level]||0))
    return resultFrom(rule,oldResult);

  return oldResult;
};

base.version='5.7-log-tuned-20261022';
base.__logTune20261022=true;
global.FAA_GRADER=base;

})(window);
