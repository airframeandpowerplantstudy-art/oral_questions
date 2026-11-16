(function(global){
'use strict';

/*
  Oral grader consolidated follow-up tune
  Built from the October 7–November 16, 2026 answer-log batches.

  IMPORTANT:
  Load this AFTER grader-v5.js and AFTER the existing grader-log-tune.js.
  This file INCLUDES the October 22 follow-up rules, so grader-1022.js is
  no longer required. It wraps the currently installed tuned grader so
  previous base/tune fixes are preserved.
*/

const base = global.FAA_GRADER;
if(!base || typeof base.grade !== 'function'){
  console.warn('[oral grader] 2026-11-16 tune could not find FAA_GRADER');
  return;
}
if(base.__logTune20261116) return;

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
    .replace(/\bdeveolper\b/g,'developer')
    .replace(/\belctrostatic\b|\belectrostatc\b/g,'electrostatic')
    .replace(/\bfiel\b|\bfeild\b/g,'field')
    .replace(/\bperent\b|\bpercnet\b/g,'percent');

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
    source:'log-tuned-rule-20261116',
    version:'5.8-log-tuned-20261116',
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


  // Additional exact-value guards learned from false-positive entries in the November log.
  if(id==='GEN-CH15-Q020'){
    const vals=ns.map(x=>Math.round(x));
    const thirty=vals.includes(30)||n.includes('thirty');
    if(thirty) return mk('hard',[check('Notify FAA in writing within 30 days',true)],1);
    if(vals.length) return custom('hard','fail',[check('30 days',false)],1);
    return null;
  }

  if(id==='GEN-CH02-Q008'){
    const pound=(/\b1\b/.test(n)||n.includes('one'))&&n.includes('pound');
    const water=n.includes('water');
    const degree=(/\b1\b/.test(n)||n.includes('one'))&&n.includes('degree');
    const core=pound&&water&&degree;
    if(core) return mk('hard',[check('Heat required to change 1 lb of water by 1°F',true)],1);
    if(pound&&degree)
      return custom('hard','almost',[check('Specify that the 1 lb substance is water',false)],1);
    if(any(n,['btu','british thermal'])&&(water||degree))
      return custom('hard','almost',[check('Include 1 lb of water and 1°F',false)],1);
    return custom('hard','fail',[check('Heat required to change 1 lb of water by 1°F',false)],1);
  }

  if(id==='GEN-CH02-Q015'){
    const correct=ns.some(x=>Math.abs(x-661)<=3||Math.abs(x-340)<=3);
    if(correct) return mk('hard',[check('About 661 knots or 340 m/s',true)],1);
    if(ns.length) return custom('hard','fail',[check('About 661 knots or 340 m/s',false)],1);
    return null;
  }

  if(id==='GEN-CH14-Q008'||id==='GEN-CH14-Q022'||id==='ASA-P-C-K-001'){
    const p43=n.includes('43');
    const appD=any(n,['appendix d','appendix delta','app d']);
    const wrongSection=any(n,['43.9','43 9','43.11','43 11','43.13','43 13'])&&!appD;
    const wrongAppendix=/appendix\s+[a-ce-z]\b/.test(n);
    const wrongPart=(/\b13\b/.test(n)&&!p43);
    if(p43&&appD) return mk('hard',[check('14 CFR Part 43, Appendix D',true)],1);
    if(wrongSection||wrongAppendix||wrongPart) return custom('hard','fail',[check('14 CFR Part 43, Appendix D',false)],1);
    if(p43) return custom('hard','almost',[check('Specify Appendix D',false)],1);
    return null;
  }

  if(id==='ASA-G-A-K-024'){
    const correct=ns.some(x=>Math.abs(x-1000)<.01);
    if(correct) return mk('hard',[check('1,000 watts',true)],1);
    if(ns.length) return custom('hard','fail',[check('1,000 watts',false)],1);
    return null;
  }

  if(id==='ASA-G-A-K-072'){
    const lo=ns.some(x=>Math.abs(x-1.275)<=.003);
    const hi=ns.some(x=>Math.abs(x-1.300)<=.003);
    if(lo&&hi) return mk('hard',[check('1.275 to 1.300',true)],1);
    if(ns.length) return custom('hard','fail',[check('1.275 to 1.300',false)],1);
    return null;
  }

  if(id==='ASA-G-A-K-104'){
    const compact=n.replace(/\s+/g,'');
    const has120=/\b120\b/.test(n);
    const freq=any(n,['frequency','freq','hz']);
    const poles=any(n,['pole','poles']);
    const divide=any(n,['divide','divided','/','over']);
    if(has120&&freq&&poles&&(divide||compact.includes('/')))
      return mk('hard',[check('RPM = 120 × frequency ÷ number of poles',true)],1);
    if(ns.length||freq||poles)
      return custom('hard','fail',[check('RPM = 120 × frequency ÷ number of poles',false)],1);
    return null;
  }

  if(id==='BAKER-G-E-008'){
    const thirtySecond=any(n,['32nd','32nds','thirty second','thirty-second'])||(/\b32\b/.test(n)&&any(n,['inch','inches']));
    if(thirtySecond) return mk('hard',[check('32nds of an inch',true)],1);
    if(any(n,['1/16','sixteenth','16th'])) return custom('hard','fail',[check('32nds of an inch',false)],1);
    return null;
  }

  if(id==='ASA-G-F-K-011'){
    const correct=ns.some(x=>Math.abs(x-25)<.1);
    if(correct) return mk('hard',[check('25 feet',true)],1);
    if(ns.length) return custom('hard','fail',[check('25 feet',false)],1);
    return null;
  }

  if(id==='ASA-A-H-K-036'){
    const correct=ns.some(x=>Math.abs(x-125)<.1);
    if(correct) return mk('hard',[check('125 feet',true)],1);
    if(ns.length) return custom('hard','fail',[check('125 feet',false)],1);
    return null;
  }


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
    const values=ns.map(x=>x>0&&x<1?x*100:x);
    const inRange=values.some(x=>x>=5&&x<=8);
    if((five&&eight)||inRange) return mk('hard',[check('5 to 8 percent (or a valid value in that range)',true)],1);
    if(ten||values.some(x=>x>8)) return custom('hard','fail',[check('5 to 8 percent',false)],1);
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
    const marking=any(n,['mark','stamp','code','asterisk','cross','dash','triangle','identification','identified','number','numbers']);
    const shape=n.includes('shape')&&!marking;
    if(shape) return custom('hard','fail',[check('Use code/identification markings, not head shape alone',false)],1);
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
    const extra=any(n,['337','major repair','major repairs','alteration','alterations','airworthiness directive','ad log'])||/\bad\b/.test(n);
    if(inspection&&!extra) return mk('hard',[check('Only inspection records require total time',true)],1);
    if(inspection&&extra) return custom('hard','almost',[check('Only inspection records require total time',false)],1);
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
    const f337=n.includes('337');
    const record=any(n,['maintenance record','maintenance records','logbook','log book']);
    const approval=any(n,['approval for return to service','return to service','approved for return','approved for service','serviceable','release','signed off','sign off']);
    if(f337||(record&&approval))
      return mk('hard',[check('Return-to-service approval in maintenance record/Form 337',true)],1);
    if(record)
      return custom('hard','almost',[check('Look for an approval/release for return to service in the record',false)],1);
    return null;
  }

  // If a student explicitly cites Part 43 as the source of mechanic privileges,
  // recognize the authority concept but flag the regulation citation; Part 65 is the source.
  if(id==='GEN-CH15-Q009'&&any(n,['part 43','far 43','cfr 43'])&&!any(n,['part 65','far 65','cfr 65'])){
    const scope=any(n,['approve','return to service','airframe','powerplant','engine','propeller','appliance','minor repair','minor alteration','100 hour']);
    if(scope) return custom('hard','almost',[check('Mechanic RTS authority is under Part 65, not Part 43',false)],1);
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
    const staticCharge=n.includes('static');
    const dissipate=any(n,['dissipat','discharge','remove','bleed off']);
    const radio=any(n,['radio','interference','frequency']);
    return staticCharge&&dissipate&&radio
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


  // ---------------------------------------------------------------------------
  // NOVEMBER 16 FOLLOW-UP — high-confidence misses from 20,098 more attempts
  // ---------------------------------------------------------------------------

  // Clear false-positive guard: gas-welding heat is set by BOTH tip size and gas pressure.
  if(id==='AF-CH04-Q015'){
    const tip=any(n,['tip','orifice','opening','op ening']);
    const pressure=n.includes('pressure');
    return custom('hard',tip&&pressure?'pass':(tip||pressure)?'almost':'fail',
      [check('Torch-tip/orifice size',tip),check('Gas pressure',pressure)],2);
  }

  // Pre-oiling is done before starting a new/overhauled/stored engine, not simply "during overhaul."
  if(id==='GEN-CH13-Q019'){
    const before=any(n,['before','prior']);
    const start=any(n,['start','starting','initial startup']);
    const condition=any(n,['new engine','newly','overhaul','overhauled','stored','storage','preserved']);
    if(any(n,['during overhaul','during the overhaul','reassembling'])&&!before)
      return custom('hard','fail',[check('Before starting a new/overhauled/stored engine',false)],1);
    if(condition&&start)
      return mk('hard',[check('Before/when starting a new/overhauled/stored engine',true)],1);
    if(before&&condition)
      return custom('hard','almost',[check('Tie condition explicitly to engine startup',false)],1);
    return null;
  }

  if(id==='GEN-CH14-Q001'){
    const vals=ns.map(x=>Math.round(x));
    if(vals.includes(21)) return mk('hard',[check('FAR / 14 CFR Part 21',true)],1);
    if(vals.length) return custom('hard','fail',[check('FAR / 14 CFR Part 21',false)],1);
    return null;
  }

  if(id==='GEN-CH14-Q003'){
    const vals=ns.map(x=>Math.round(x));
    if(vals.includes(23)) return mk('hard',[check('FAR Part 23',true)],1);
    if(vals.length) return custom('hard','fail',[check('FAR Part 23',false)],1);
    return null;
  }

  if(id==='GEN-CH01-Q004'){
    const invert=any(n,['invert','inverse','reciprocal','flip'])&&any(n,['divisor','second fraction','second number','second']);
    const multiply=any(n,['multiply','times']);
    const decimals=any(n,['decimal','decimal equivalent'])&&any(n,['divide','dividing']);
    if((invert&&multiply)||decimals)
      return mk('upgrade',[check('Valid fraction-division method',true)],1);
    return null;
  }

  if(id==='GEN-CH01-Q010'){
    const equal=any(n,['equal','same']);
    const multiply=any(n,['multiply','times']);
    const itself=any(n,['itself','each other']);
    const result=any(n,['specified number','original number','number']);
    if(equal&&multiply&&(itself||result))
      return mk('upgrade',[check('Equal smaller values multiply to the specified number',true)],1);
    return null;
  }

  if(id==='GEN-CH03-Q018'){
    const electro=any(n,['electrostatic','static charge','electric field','electrical field']);
    const plates=any(n,['plate','plates','conductors']);
    const between=n.includes('between');
    if(electro&&plates&&between)
      return mk('upgrade',[check('Electrostatic charge/field between separated conductors',true)],1);
    if(electro&&plates)
      return custom('upgrade','almost',[check('State the field/charge exists between the conductors',false)],1);
    return null;
  }

  if(id==='GEN-CH05-Q005'){
    const drawing=any(n,['drawing','projection','view','views']);
    const right=any(n,['right angle','right angles','90 degree','90 degrees','perpendicular']);
    const multi=any(n,['top','front','side','different views','multiple views']);
    if(drawing&&right&&(multi||n.includes('orthographic')))
      return mk('upgrade',[check('Multiple views projected at right angles',true)],1);
    if(right&&drawing)
      return mk('upgrade',[check('Views at right angles',true)],1);
    return null;
  }

  if(id==='GEN-CH06-Q008'){
    const measured=n.includes('datum')&&any(n,['distance','measure','measuring']);
    const manufacturer=any(n,['manufacturer data','manufacture data','data supplied by the manufacturer','manufacturer manual']);
    const calculated=any(n,['moment divided by weight','divide moment by weight','moment / weight','moment over weight']);
    const checks=[
      check('Measure distance from datum',measured),
      check('Use manufacturer data',manufacturer),
      check('Calculate arm as moment ÷ weight',calculated)
    ];
    const c=checks.filter(x=>x.met).length;
    return c>=2?custom('upgrade','pass',checks,2):c===1?custom('upgrade','almost',checks,2):null;
  }

  if(id==='GEN-CH06-Q017'){
    const drain=any(n,['drain usable','drain the usable','drain fuel','drain the fuel'])&&
                any(n,['unusable','usable','residual','empty']);
    const fill=any(n,['fill','full'])&&any(n,['subtract','remove'])&&any(n,['usable','useable','fuel weight']);
    if(drain||fill)
      return mk('upgrade',[check('Drain to unusable fuel, or fill and subtract usable fuel',true)],1);
    return null;
  }

  if(id==='GEN-CH07-Q002'){
    const thermoset=any(n,['thermoset','thermosetting']);
    const thermoplastic=n.includes('thermoplastic');
    const setNoRemelt=thermoset&&any(n,['cannot be reheated','can not be reheated','cannot be reshaped','does not melt','doesn t melt','will burn','chars','char']);
    const plasticRemelt=thermoplastic&&any(n,['can be reheated','can be reshaped','melts','softens','pliable','reheat']);
    const reversed=thermoset&&thermoplastic&&
      /thermoset\w*.{0,45}(\bcan\b|soften|melts?|reshape).{0,55}thermoplastic\w*.{0,45}(cannot|can t|does not|burn)/.test(n);
    if(reversed) return custom('hard','fail',
      [check('Thermoset does not remelt',false),check('Thermoplastic softens/remelts',false)],2);
    if(setNoRemelt&&plasticRemelt)
      return mk('upgrade',[check('Thermoset does not remelt',true),check('Thermoplastic softens/remelts',true)],2);
    if(setNoRemelt||plasticRemelt)
      return custom('upgrade','almost',[check('State both sides of the comparison',false)],2);
    return null;
  }

  if(id==='GEN-CH08-Q002'){
    if(any(n,['freeze','frozen','freezer','cold','icebox','refrigerat']))
      return mk('upgrade',[check('Keep/store heat-treated rivets cold or frozen',true)],1);
    return null;
  }

  if(id==='GEN-CH08-Q003'){
    const unthreaded=any(n,['unthreaded','un threaded','smooth']);
    const shank=any(n,['shank','portion','part','length']);
    if(unthreaded&&shank)
      return mk('upgrade',[check('Length of the unthreaded shank/portion',true)],1);
    if(n.includes('threaded')&&!unthreaded)
      return custom('hard','fail',[check('Unthreaded portion, not threaded portion',false)],1);
    return null;
  }

  if(id==='GEN-CH10-Q002'){
    const wall=n.includes('wall')&&any(n,['thickness','thick']);
    const od=any(n,['outside diameter','outer diameter','od']);
    if(wall&&od)
      return mk('upgrade',[check('Wall thickness and outside diameter',true)],1);
    if(od||wall)
      return custom('upgrade','almost',[check('Include wall thickness and outside diameter',false)],1);
    return null;
  }

  if(id==='GEN-CH10-Q006'){
    const shoulder=n.includes('shoulder');
    const threads=n.includes('thread');
    if(shoulder&&(threads||any(n,['an fitting','an fittings','an has','ac does not'])))
      return mk('upgrade',[check('AN fitting has shoulder between flare cone and threads',true)],1);
    if(shoulder)
      return mk('upgrade',[check('AN fitting identified by shoulder at flare-cone/thread area',true)],1);
    return null;
  }

  if(id==='GEN-CH10-Q014'){
    const lay=any(n,['lay line','layline','lay lines']);
    const straight=any(n,['straight','not twisted','no twist']);
    const twist=any(n,['twist','twisted','rotated']);
    if(lay&&(straight||twist))
      return mk('upgrade',[check('Straight lay line = correct; twisted lay line = incorrect',true)],1);
    if(lay)
      return custom('upgrade','almost',[check('Explain what the lay line indicates',false)],1);
    return null;
  }

  if(id==='GEN-CH11-Q006'){
    const fusion=any(n,['not melted','not fused','lack of fusion','did not melt','not feathered','pulled up']);
    const base=any(n,['base metal','metal']);
    const rough=any(n,['rough','irregular']);
    if((fusion&&base)||rough)
      return mk('upgrade',[check('Cold weld shows poor fusion / rough irregular edges',true)],1);
    return null;
  }

  if(id==='GEN-CH12-Q001'){
    const legal=any(n,['legal requirement','required by law','required','requirement']);
    const far=any(n,['43 appendix d','43 apendix d','43 appendix','part 43','far 43']);
    if(legal&&far)
      return mk('upgrade',[check('Required by FAR Part 43, Appendix D',true)],1);
    if(legal)
      return mk('upgrade',[check('Cleaning before inspection is a legal requirement',true)],1);
    return null;
  }

  if(id==='GEN-CH13-Q017'){
    const oil=/\boil\b/.test(n);
    const grade=any(n,['grade','type','flight manual','afm']);
    if(oil&&grade)
      return mk('upgrade',[check('"OIL" plus permissible grade/type or AFM reference',true)],1);
    if(oil)
      return custom('upgrade','almost',[check('Also include permissible grade/type or AFM reference',false)],1);
    return null;
  }

  if(id==='GEN-CH14-Q016'){
    const sb=any(n,['service bulletin','bulletin']);
    const ad=any(n,['airworthiness directive',' ad ','ad ']);
    const incorporated=any(n,['incorporated','referenced','referred','included','in']);
    if(sb&&ad&&incorporated)
      return mk('upgrade',[check('Service bulletin becomes mandatory when incorporated/referenced by an AD',true)],1);
    return null;
  }

  if(id==='GEN-CH14-Q023'){
    const record=any(n,['maintenance record','maintenance log','logbook','log book','aircraft record']);
    const f337=n.includes('337');
    if(record&&f337)
      return mk('upgrade',[check('Maintenance record and FAA Form 337',true)],1);
    if(record||f337)
      return custom('upgrade','almost',[check('Include both maintenance record and Form 337',false)],2);
    return null;
  }

  if(id==='BAKER-G-A-020'){
    if(/\bwatt?s?\b/.test(n))
      return mk('upgrade',[check('Watt',true)],1);
    return null;
  }

  if(id==='BAKER-G-K-010'){
    if((n.includes('21')&&any(n,['far','cfr','part']))||n==='21')
      return mk('upgrade',[check('14 CFR Part 21',true)],1);
    return null;
  }

  // AIRFRAME
  if(id==='AF-CH03-Q020'){
    const skin=n.includes('skin');
    const gusset=any(n,['gusset','reinforcing plate','reinforcement plate']);
    if(skin&&gusset)
      return mk('upgrade',[check('Aircraft skin and gusset/reinforcing plate',true)],1);
    return null;
  }

  if(id==='AF-CH04-Q002'){
    const strong=any(n,['strong','stronger','strength']);
    const ductile=any(n,['ductile','ductility','not brittle','less brittle']);
    const corrosion=any(n,['corrosion resistant','corrosion resistance','resist corrosion']);
    const checks=[check('Stronger',strong),check('More ductile',ductile),check('More corrosion resistant',corrosion)];
    const c=checks.filter(x=>x.met).length;
    return c>=3?custom('upgrade','pass',checks,3):c>=2?custom('upgrade','almost',checks,3):null;
  }

  if(id==='AF-CH04-Q003'){
    if(any(n,['tig','arc welding','electric arc','gas tungsten']))
      return mk('upgrade',[check('Electric arc / TIG welding',true)],1);
    return null;
  }

  if(id==='AF-CH07-Q018'){
    const source=n.includes('source');
    const power=n.includes('power');
    const close=any(n,['close','near','at the']);
    if(power&&source&&(close||n.includes('power source')))
      return mk('upgrade',[check('As close to the power source as possible',true)],1);
    return null;
  }

  if(id==='AF-CH10-Q017'){
    if(/\bseries\b/.test(n))
      return mk('upgrade',[check('Series',true)],1);
    return null;
  }

  if(id==='AF-CH11-Q019'){
    if(any(n,['caution range','limited flight','limited operation','limited operations']))
      return mk('upgrade',[check('Caution / limited-flight-operations range',true)],1);
    return null;
  }

  if(id==='AF-CH16-Q009'){
    const photo=any(n,['photoelectric','light refraction','optical']);
    const ion=n.includes('ionization');
    if(photo&&ion)
      return mk('upgrade',[check('Photoelectric/light-refraction and ionization',true)],1);
    return null;
  }

  if(id==='AF-CH16-Q016'){
    if(any(n,['halon','freon','halogenated hydrocarbon']))
      return mk('upgrade',[check('Halon / halogenated hydrocarbon',true)],1);
    return null;
  }

  if(id==='ASA-A-I-K-055'){
    const transponder=n.includes('transponder');
    const identify=any(n,['identify','identification','positive identification','location','locate']);
    const radar=any(n,['radar','atc','monitor','screen']);
    if((transponder&&identify)||(identify&&radar))
      return mk('upgrade',[check('Transponder provides aircraft identification/location on ATC radar',true)],1);
    return null;
  }

  // POWERPLANT
  if(id==='PP-CH01-Q006'){
    const oil=any(n,['oil consumption','burn oil','burning oil','oil burning']);
    const blow=any(n,['blow by','blowby','leak','leakage','compression leak']);
    if(oil)
      return mk('upgrade',[check('Excessive oil consumption',true)],1);
    if(blow)
      return custom('upgrade','almost',[check('Ring leakage/blow-by is relevant; expected effect is excessive oil consumption',false)],1);
    return null;
  }

  if(id==='PP-CH01-Q007'){
    const film=any(n,['oil film','film thickness','thickness of oil']);
    const consumption=any(n,['oil consumption','control oil','regulate oil']);
    const chamber=any(n,['combustion chamber','burning oil','oil from entering','prevent oil entering']);
    if(film||consumption||chamber)
      return mk('upgrade',[check('Regulate cylinder-wall oil film / oil consumption',true)],1);
    return null;
  }

  if(id==='PP-CH02-Q001'){
    const idle=n.includes('idle');
    const poor=any(n,['not idle','won t idle','will not idle','cannot idle','rough','improper','poor','normally','normal']);
    if(idle&&poor)
      return mk('upgrade',[check('Engine will not idle properly',true)],1);
    return null;
  }

  if(id==='PP-CH02-Q004'){
    const seal=any(n,['seal','sealing','leak','leakage']);
    const components=[n.includes('valve'),n.includes('ring'),n.includes('piston')].filter(Boolean).length;
    if(seal&&components>=2)
      return mk('upgrade',[check('Check valve/piston-ring sealing',true)],1);
    if(seal)
      return custom('upgrade','almost',[check('Compression test checks sealing/leakage; identify valves/rings/piston',false)],1);
    return null;
  }

  if(id==='PP-CH02-Q009'){
    const within=any(n,['within limit','within limits','within manufacturer','serviceable']);
    const usable=any(n,['can be used','usable','does not require replacement','no replacement','not replace']);
    if(within||usable)
      return mk('upgrade',[check('Within manufacturer limits and usable without replacement',true)],1);
    return null;
  }

  if(id==='PP-CH02-Q014'){
    const metal=any(n,['metal','particle','particles','wear']);
    const condition=any(n,['condition','health','wear','internal']);
    if(metal&&condition)
      return mk('upgrade',[check('Oil particles indicate engine wear/internal condition',true)],1);
    if(condition)
      return custom('upgrade','almost',[check('Tie engine condition to metal particles/wear in the oil',false)],1);
    return null;
  }

  if(id==='PP-CH02-Q016'){
    const intake=any(n,['ram air','air intake','intake duct','carburetor inlet','airscoop','air scoop','inlet of the carburetor']);
    if(intake)
      return mk('upgrade',[check('Ram-air intake duct / carburetor inlet',true)],1);
    return null;
  }

  if(id==='PP-CH02-Q025'){
    const drop=any(n,['drop','loss','low'])&&n.includes('oil pressure');
    const temp=any(n,['temperature','temp'])&&any(n,['normal','same','unchanged']);
    const qty=any(n,['quantity','level','supply','full'])&&any(n,['normal','same','full','unchanged']);
    const checks=[check('Sudden/severe oil-pressure drop',drop),check('Oil temperature remains normal',temp),check('Oil quantity/supply remains normal/full',qty)];
    const c=checks.filter(x=>x.met).length;
    return c>=3?custom('upgrade','pass',checks,3):c>=2?custom('upgrade','almost',checks,3):null;
  }

  if(id==='PP-CH03-Q010'){
    const direct=any(n,['direct','angle','angles']);
    const air=any(n,['air','airflow','gas','exhaust']);
    const turbine=any(n,['turbine','blade','rotor']);
    const angle=any(n,['angle','specific angle','proper angle','desired angle']);
    if(direct&&air&&turbine&&angle)
      return mk('upgrade',[check('Direct airflow to turbine rotor/blades at the proper angle',true)],1);
    return null;
  }

  if(id==='PP-CH03-Q017'){
    const main=any(n,['main fuel','main tank','main fuel tank','main fuel supply','aircraft fuel supply']);
    if(main)
      return mk('upgrade',[check('Aircraft main fuel tank/supply',true)],1);
    return null;
  }

  if(id==='PP-CH03-Q019'){
    const namedValve=any(n,['load control valve','load-control valve','load controlvalve','load valve','load controller']);
    const control=any(n,['load control','load valve','controller','control valve','fadec']);
    const bleed=any(n,['bleed air','pneumatic','air load','load']);
    const limit=any(n,['limit','prevent','maintain','regulate','modulate']);
    if(namedValve)
      return mk('upgrade',[check('Load-control valve/controller',true)],1);
    if(control&&bleed&&limit)
      return mk('upgrade',[check('Load-control system modulates pneumatic/bleed-air load to limit EGT',true)],1);
    if(control&&bleed)
      return custom('upgrade','almost',[check('Explain that it regulates/modulates the load to limit EGT',false)],1);
    return null;
  }

  if(id==='PP-CH03-Q022'){
    const overlap=any(n,['overlap','overlapping','shingle','shingling']);
    const shroud=any(n,['midspan shroud','mid span shroud','shroud','shrouds']);
    const blade=any(n,['fan blade','blades']);
    if(overlap&&shroud)
      return mk('upgrade',[check('Overlapping midspan shrouds',true)],1);
    if(overlap&&blade)
      return custom('upgrade','almost',[check('Specify the midspan shrouds overlap',false)],1);
    return null;
  }

  if(id==='PP-CH03-Q023'){
    const noise=any(n,['noise','sound','sounds','rubbing','rub','grinding','dragging','friction','abnormal','unusual','weird']);
    if(noise)
      return mk('upgrade',[check('Listen for rubbing or other unusual noises during coastdown',true)],1);
    return null;
  }

  if(id==='PP-CH06-Q004'){
    const restrict=any(n,['restrict','restricted','decreased airflow','reduced airflow','blocked']);
    const power=any(n,['loss of power','power loss','reduced engine performance','decreased power','full power','reach its full power']);
    if((restrict&&power)||power)
      return mk('upgrade',[check('Exhaust restriction causing loss of engine power',true)],1);
    return null;
  }

  if(id==='PP-CH06-Q009'){
    const crack=any(n,['crack','cracks','cracking']);
    const heat=any(n,['heat','heated','temperature','hot']);
    const chemical=any(n,['molecular','chemical change','structure change']);
    if(crack&&(heat||chemical))
      return mk('upgrade',[check('Marks can alter material and cause cracking when heated',true)],1);
    return null;
  }

  if(id==='PP-CH06-Q020'){
    const cascade=n.includes('cascade');
    const clam=any(n,['clamshell','clam shell','mechanically blocked']);
    if(cascade&&clam)
      return mk('upgrade',[check('Cascade and clamshell types',true)],1);
    return null;
  }

  if(id==='PP-CH07-Q022'){
    const strainer=n.includes('strainer');
    const filter=n.includes('filter');
    if(strainer||any(n,['main fuel filter','fuel filter']))
      return mk('upgrade',[check('Main fuel strainer/filter',true)],1);
    if(filter)
      return custom('upgrade','almost',[check('Specify the main fuel strainer/filter',false)],1);
    return null;
  }

  if(id==='PP-CH07-Q023'){
    const excess=any(n,['excess','extra','not required']);
    const returnish=any(n,['return','route','reroute','divert','recirculate','dump']);
    const inlet=n.includes('inlet')&&any(n,['pump','fuel pump']);
    if(excess&&returnish&&inlet)
      return mk('upgrade',[check('Return excess fuel to the pump inlet',true)],1);
    return null;
  }

  if(id==='PP-CH07-Q025'){
    const positive=any(n,['positive pressure','positive flow','pressurized','boost pressure','boost the fuel pressure','pressure']);
    const pump=n.includes('pump');
    const cav=any(n,['cavitation','vapor lock','vapour lock']);
    if(positive&&pump&&cav)
      return mk('upgrade',[check('Pressurize fuel to main pump and prevent vapor lock/cavitation',true)],1);
    if(positive&&pump)
      return custom('upgrade','almost',[check('Also mention prevention of vapor lock/cavitation',false)],1);
    return null;
  }

  if(id==='PP-CH07-Q036'){
    const press=any(n,['pressuriz','pressure section','pressurized']);
    const nozzle=any(n,['nozzle','nozzles','primary','secondary']);
    const dump=any(n,['dump','drain','empty','clears']);
    const shutdown=any(n,['shutdown','shut down','shut off','engine off']);
    const manifold=n.includes('manifold');
    if(press&&nozzle&&dump&&(shutdown||manifold))
      return mk('upgrade',[check('Pressurize/feed duplex nozzles and drain manifold after shutdown',true)],1);
    return null;
  }

  if(id==='PP-CH08-Q015'){
    const timing=n.includes('timing');
    const internal=n.includes('internal');
    const engine=any(n,['engine','magneto to engine','mag to engine']);
    const points=any(n,['points open','breaker points','begin to open','points begin']);
    if(timing&&points&&(internal||engine))
      return mk('upgrade',[check('Used for magneto timing; indicates exact point opening',true)],1);
    return null;
  }

  if(id==='PP-CH08-Q022'){
    const field=n.includes('field');
    const current=n.includes('current');
    const vary=any(n,['vary','varying','control','controlling','strength']);
    if(field&&current&&vary)
      return mk('upgrade',[check('Vary/control field-current strength',true)],1);
    return null;
  }

  if(id==='PP-CH08-Q034'){
    if(/\bawg\b/.test(n)||n.includes('american wire gauge'))
      return mk('upgrade',[check('American Wire Gauge (AWG)',true)],1);
    return null;
  }

  if(id==='PP-CH09-Q010'){
    const foam=any(n,['foam','foaming']);
    const expansion=any(n,['expand','expansion','thermal']);
    const air=any(n,['return air','air in the return','air']);
    const checks=[check('Oil foaming',foam),check('Thermal expansion',expansion),check('Air in return oil',air)];
    const c=checks.filter(x=>x.met).length;
    return c>=2?custom('upgrade','pass',checks,2):c===1?custom('upgrade','almost',checks,2):null;
  }

  if(id==='PP-CH10-Q002'){
    const cooling=any(n,['cool','cooling']);
    const transfer=any(n,['transfer heat','remove heat','dissipate heat','heat transfer']);
    const cylinder=any(n,['cylinder','cylinder head','head']);
    const air=n.includes('air');
    if((transfer&&cylinder&&air)||(cooling&&cylinder))
      return mk('upgrade',[check('Increase cooling/heat-transfer area from cylinder head to air',true)],1);
    return null;
  }

  if(id==='PP-CH10-Q010'){
    const secondary=any(n,['secondary air','secondary airflow','incoming air','air passing through','airflow through','air flow through','compressor air']);
    const cooling=any(n,['cool','cooling']);
    const pct=ns.some(x=>Math.abs(x-75)<=1);
    if(secondary)
      return mk('upgrade',[check('Secondary/incoming airflow cools the turbine engine',true)],1);
    if(cooling&&pct)
      return mk('upgrade',[check('About 75% of engine airflow is used for cooling',true)],1);
    return null;
  }

  if(id==='PP-CH12-Q004'){
    if(any(n,['angle increases','blade angle increases','it increases','increase']))
      return mk('upgrade',[check('Blade angle increases',true)],1);
    return null;
  }

  if(id==='PP-CH12-Q016'){
    const extent=any(n,['extent','amount','degree','depth']);
    const location=any(n,['location','blade station','station']);
    if(extent&&location)
      return mk('upgrade',[check('Extent of bend and blade-station location',true)],1);
    return null;
  }

  if(id==='PP-CH13-Q003'){
    const power=any(n,['power','static rpm','idle rpm','rpm']);
    const mag=any(n,['magneto','mag check']);
    const fuel=any(n,['fuel pressure','fuel']);
    const oil=any(n,['oil pressure','oil temperature','oil']);
    const cyl=any(n,['cylinder temperature','cht','cylinder']);
    const runup=any(n,['run up','run-up','operational check','engine check']);
    const checks=[check('Power/static/idle RPM',power),check('Magnetos',mag),check('Fuel/oil pressures',fuel&&oil),check('Cylinder/oil temperatures',cyl&&oil)];
    const c=checks.filter(x=>x.met).length;
    if(c>=3) return custom('upgrade','pass',checks,3);
    if(c>=2||runup) return custom('upgrade','almost',checks,3);
    return null;
  }

  if(id==='PP-CH13-Q004'){
    const manual=any(n,['maintenance manual','manufacturer manual','engine manual','service instructions']);
    const tcds=any(n,['tcds','type certificate data']);
    const limits=any(n,['airworthiness limitations','limitations section','airworthiness limit']);
    const checks=[check('Engine maintenance manual',manual),check('TCDS',tcds),check('Airworthiness Limitations section',limits)];
    const c=checks.filter(x=>x.met).length;
    return c>=2?custom('upgrade','pass',checks,2):c===1?custom('upgrade','almost',checks,2):null;
  }

  if(id==='PP-CH13-Q009'){
    const stc=any(n,['stc','supplemental type certificate']);
    const field=any(n,['field approval','faa field approval']);
    if(stc||field)
      return mk('upgrade',[check('STC or FAA field approval',true)],1);
    return null;
  }

  if(id==='PP-CH14-Q002'){
    const verify=any(n,['verify','confirm','identify the issue','identify the problem']);
    const manual=any(n,['manufacturer','maintenance manual','troubleshooting information','troubleshoot']);
    const systematic=any(n,['systematic','systematically','proceed']);
    if(verify&&manual&&(systematic||n.includes('troubleshoot')))
      return mk('upgrade',[check('Verify complaint/symptom and troubleshoot systematically using manufacturer information',true)],1);
    if(verify&&manual)
      return custom('upgrade','almost',[check('Proceed systematically after verifying the symptom',false)],1);
    return null;
  }


  if(id==='GEN-CH01-Q011'){
    const method=any(n,['multiply the number by itself','multiply by itself','times itself']);
    const m=n.match(/\b(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)(?:\s*=\s*(\d+(?:\.\d+)?))?/);
    if(m){
      const a=Number(m[1]),b=Number(m[2]),c=m[3]===undefined?null:Number(m[3]);
      if(a!==b) return custom('hard','fail',[check('Square uses the same number twice',false)],1);
      if(c!==null&&Math.abs(c-a*b)>.001)
        return custom('hard','fail',[check('Correct square example',false)],1);
      return custom('upgrade','pass',[check('Correct square example',true)],1);
    }
    if(method) return mk('upgrade',[check('Multiply the number by itself',true)],1);
    return null;
  }

  if(id==='GEN-CH05-Q013'){
    const materials=n.includes('material');
    const parts=n.includes('part');
    if(materials&&parts)
      return mk('upgrade',[check('List of parts and materials',true)],1);
    return null;
  }

  if(id==='GEN-CH13-Q009'){
    if(any(n,['tow vehicle','tug','tractor']))
      return mk('upgrade',[check('Use tow-vehicle brakes except in an emergency',true)],1);
    return null;
  }

  if(id==='AF-CH04-Q011'){
    if(/\btig\b/.test(n)||n.includes('tungsten inert gas'))
      return mk('upgrade',[check('TIG welding',true)],1);
    return null;
  }

  if(id==='AF-CH09-Q002'){
    if(any(n,['nitrogen','dry air']))
      return mk('upgrade',[check('Nitrogen or dry air',true)],1);
    return null;
  }

  if(id==='AF-CH09-Q013'){
    if(any(n,['centering cam','centering cams','external track']))
      return mk('upgrade',[check('Centering cam(s) or external track',true)],1);
    return null;
  }

  if(id==='PP-CH05-Q013'){
    if(n.includes('exhaust')&&any(n,['gas','gases','air','velocity']))
      return mk('upgrade',[check('Engine exhaust gas drives the turbocharger turbine',true)],1);
    return null;
  }

  if(id==='PP-CH08-Q002'){
    const brush=n.includes('brush');
    const comm=n.includes('commutator');
    if(brush&&comm)
      return mk('upgrade',[check('Brushes and commutator',true)],1);
    return null;
  }

  if(id==='PP-CH08-Q022'){
    const field=n.includes('field');
    const current=n.includes('current');
    const vary=any(n,['vary','varying','control','controlling','regulate','strength']);
    if(field&&current&&vary)
      return mk('upgrade',[check('Vary/control the field current',true)],1);
    return null;
  }

  if(id==='ASA-G-D-K-005'){
    if(any(n,['inside diameter','internal diameter',' id ','i.d.'])||n==='id')
      return mk('upgrade',[check('Inside diameter',true)],1);
    return null;
  }

  if(id==='BAKER-G-A-023'){
    const twelve=ns.some(x=>Math.abs(x-12)<.01)||n.includes('twelve');
    if(twelve)
      return mk('upgrade',[check('12 cells',true)],1);
    return null;
  }

  if(id==='ASA-A-A-K-065'){
    if(/\bshear\b/.test(n))
      return mk('upgrade',[check('Riveted joint should fail in shear',true)],1);
    return null;
  }

  // SECONDARY / 10IC
  if(id==='ASA-P-A-K-020'){
    if(any(n,['tcds','type certificate data sheet','type certificate data sheets']))
      return mk('upgrade',[check('Type Certificate Data Sheet(s)',true)],1);
    return null;
  }

  if(id==='ASA-P-B-K-017'){
    if(any(n,['tailcone','tail cone','in the tail','tail end']))
      return mk('upgrade',[check('Tail cone of the fuselage',true)],1);
    return null;
  }

  if(id==='ASA-P-B-K-023'){
    if(n.includes('fadec'))
      return mk('upgrade',[check('FADEC monitors/regulates APU load/fuel',true)],1);
    return null;
  }

  if(id==='ASA-P-F-K-020'){
    const solder=any(n,['solder','soldering']);
    const crimp=any(n,['crimp','crimping']);
    if(solder&&crimp)
      return mk('upgrade',[check('Soldering or crimping',true)],1);
    return null;
  }

  if(id==='ASA-P-F-K-023'){
    if(n.includes('grommet'))
      return mk('upgrade',[check('Grommet',true)],1);
    return null;
  }

  if(id==='ASA-P-M-K-033'){
    if(n.includes('propeller protractor')||n==='protractor')
      return mk('upgrade',[check('Universal propeller protractor',true)],1);
    return null;
  }

  if(id==='ASA-G-A-K-070'){
    const acid=any(n,['sulfuric acid','sulphuric acid']);
    const water=n.includes('water');
    if(acid&&water)
      return mk('upgrade',[check('Sulfuric acid and water',true)],1);
    if(acid)
      return custom('upgrade','almost',[check('Include water with sulfuric acid',false)],1);
    return null;
  }

  if(id==='ASA-G-A-K-071'){
    if(any(n,['decrease','decreases','decreased','goes down','drops']))
      return mk('upgrade',[check('It decreases',true)],1);
    return null;
  }

  if(id==='ASA-G-A-K-077'){
    const indicator=any(n,['indicator','fill line','level line','line on the battery','line in the cell']);
    if(indicator)
      return mk('upgrade',[check('Fill only to the cell indicator/fill line',true)],1);
    return null;
  }

  if(id==='ASA-G-A-K-078'){
    const drop=any(n,['voltage drop','voltage is dropped','drops']);
    const resistance=any(n,['internal resistance','battery resistance']);
    if(drop&&resistance)
      return mk('upgrade',[check('Voltage drop across internal battery resistance',true)],1);
    if(drop)
      return custom('upgrade','almost',[check('Specify internal battery resistance causes the voltage drop',false)],1);
    return null;
  }

  if(id==='ASA-G-I-K-035'){
    if(any(n,['life of the aircraft','lifetime of the aircraft','for the life']))
      return mk('upgrade',[check('For the life of the aircraft',true)],1);
    return null;
  }

  if(id==='ASA-G-I-K-060'){
    if((n.includes('43')&&any(n,['far','cfr','part']))||n==='43')
      return mk('upgrade',[check('14 CFR Part 43',true)],1);
    return null;
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

base.version='5.8-log-tuned-20261116';
base.__logTune20261022=true;
base.__logTune20261116=true;
global.FAA_GRADER=base;

})(window);
