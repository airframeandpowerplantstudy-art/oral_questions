(function(global){
'use strict';

const STOP=new Set('a an and are as at be been being by did do does for from had has have he her hers him his how i if in into is it its me my of on or our ours she than that the their theirs them then there these they this those through to was we were what when where which who why will with you your name describe explain define list identify state give called during used use using generally usually also some any all may can could should would purpose function functions result results type types kind kinds method methods way ways system systems part parts component components item items unit units device devices assembly assemblies mechanism mechanisms different common typical basic main major aircraft airplane engine engines'.split(' '));
const GENERIC=new Set('type types method methods way ways system systems part parts component components item items root roots section sections unit units device devices assembly assemblies mechanism mechanisms different common typical basic main major purpose function functions result results process procedure procedures condition conditions amount point area areas thing things means necessary proper required generally usually used use using'.split(' '));
const CRITICAL=new Set('normal autorotation upward downward increase decrease open closed on off left right clockwise counterclockwise positive negative before after above below greater less more fewer high low hot cold rich lean forward reverse inboard outboard pressure vacuum series parallel ac dc input output inlet outlet primary secondary powered unpowered locked unlocked engaged disengaged connected disconnected'.split(' '));
const ACTION=new Set('prevent separate rotate airflow unpowered powered increase decrease open close supply direct indicate cool inspect allow remove reduce create cause determine measure regulate protect produce operate compress convert ignite discharge seal lubricate preserve disrupt'.split(' '));
const CANON=new Set([...CRITICAL,...ACTION,'dovetail','firtree','plead','egap','fadec','apu','tcds','faa','ndt','psi','egt','tit','oat','aoa','rpm','rotor','thermocouple','tachometer','carburetor','magneto','propeller','venturi','corrosionresistant','lowweight','rollcontrol','preserve','disrupt']);
const OPP={upward:'downward',downward:'upward',increase:'decrease',decrease:'increase',open:'closed',closed:'open',on:'off',off:'on',left:'right',right:'left',clockwise:'counterclockwise',counterclockwise:'clockwise',positive:'negative',negative:'positive',before:'after',after:'before',above:'below',below:'above',greater:'less',less:'greater',more:'fewer',fewer:'more',high:'low',low:'high',hot:'cold',cold:'hot',rich:'lean',lean:'rich',forward:'reverse',reverse:'forward',inboard:'outboard',outboard:'inboard',pressure:'vacuum',vacuum:'pressure',series:'parallel',parallel:'series',ac:'dc',dc:'ac',input:'output',output:'input',inlet:'outlet',outlet:'inlet',primary:'secondary',secondary:'primary',powered:'unpowered',unpowered:'powered',engaged:'disengaged',disengaged:'engaged',connected:'disconnected',disconnected:'connected'};


function formulaDefinition(q){
 const id=(q&&q.id)||'', text=((q&&q.question)||'').toLowerCase();
 if(id==='GEN-M-016'||/formula.*area of a rectangle/.test(text))
  return {label:'Area = length × width',kind:'rectangleArea'};
 if(id==='GEN-M-017'||/formula.*area of a triangle/.test(text))
  return {label:'Area = ½ × base × height',kind:'triangleArea'};
 if(id==='GEN-M-019'||/formula.*area of a circle/.test(text))
  return {label:'Area = π × radius²',kind:'circleArea'};
 if(id==='GEN-M-027'||/formula.*circumference of a circle/.test(text))
  return {label:'Circumference = π × diameter (or 2 × π × radius)',kind:'circumference'};
 if(id==='GEN-M-029'||/formula.*volume of a rectangular solid/.test(text))
  return {label:'Volume = length × width × height',kind:'rectangularVolume'};
 if(id==='GEN-M-030'||/formula.*volume of a cylinder/.test(text))
  return {label:'Volume = π × radius² × height (or π ÷ 4 × diameter² × height)',kind:'cylinderVolume'};
 if(id==='GEN-P-040'||/relationship between force, pressure and area/.test(text))
  return {label:'Force = pressure × area',kind:'forcePressureArea'};
 if(id==='GEN-BE-004'||id==='AF-AES-022'||/ohm.?s law.*equation/.test(text))
  return {label:'Ohm’s law: voltage = current × resistance',kind:'ohmsLaw'};
 if(id==='GEN-WAB-026'||/moment.*obtained/.test(text))
  return {label:'Moment = weight × arm (distance from datum)',kind:'moment'};
 return null;
}

function mathText(s){
 let x=(s||'').toLowerCase().replace(/[’]/g,"'");
 x=x
  .replace(/[π𝛑]/g,' pi ')
  .replace(/\bpie\b/g,' pi ')
  .replace(/½/g,' half ')
  .replace(/¼/g,' quarter ')
  .replace(/²/g,' square ')
  .replace(/³/g,' cube ')
  .replace(/\^\s*2\b/g,' square ')
  .replace(/\^\s*3\b/g,' cube ')
  .replace(/\b(?:to the )?(?:second|2nd) power\b/g,' square ')
  .replace(/\b(?:to the )?(?:third|3rd) power\b/g,' cube ')
  .replace(/\bsquared\b|\bsquare of\b/g,' square ')
  .replace(/\bcubed\b|\bcube of\b/g,' cube ')
  .replace(/\bone[\s-]+half\b|\ba half\b|\b1\s*\/\s*2\b|\b0\.5\b/g,' half ')
  .replace(/\bone[\s-]+(?:fourth|quarter)\b|\ba quarter\b|\b1\s*\/\s*4\b|\b0\.25\b/g,' quarter ')
  .replace(/\bmultiplied by\b|\bmultiply by\b|\btimes\b|[×*]/g,' multiply ')
  .replace(/\bdivided by\b|\bdivide by\b|\bover\b|[÷/]/g,' divide ')
  .replace(/\bequals?\b|=/g,' equal ')
  .replace(/\bl\s*x\s*w\s*x\s*h\b|\blxwxh\b/g,' length multiply width multiply height ')
  .replace(/\bl\s*x\s*w\b|\blxw\b/g,' length multiply width ')
  .replace(/\bb\s*x\s*h\b|\bbxh\b/g,' base multiply height ')
  .replace(/\bpi\s*r\b/g,' pi radius ')
  .replace(/\bpi\s*d\b/g,' pi diameter ')
  .replace(/\br\s*square\b/g,' radius square ')
  .replace(/\bd\s*square\b/g,' diameter square ')
  .replace(/\bvolts?\b|\bvoltage\b|\belectromotive force\b|\bemf\b/g,' voltage ')
  .replace(/\bamps?\b|\bamperage\b|\bcurrent\b/g,' current ')
  .replace(/\bohms?\b|\bresistance\b/g,' resistance ')
  .replace(/\bweight\b/g,' weight ')
  .replace(/\barm\b|\bdistance from (?:the )?datum\b/g,' arm ')
  .replace(/\bpressure\b/g,' pressure ')
  .replace(/\bforce\b/g,' force ')
  .replace(/\barea\b/g,' area ')
  .replace(/\bcircumference\b/g,' circumference ')
  .replace(/\bdiameter\b/g,' diameter ')
  .replace(/\bradius\b/g,' radius ')
  .replace(/\bheight\b/g,' height ')
  .replace(/\blength\b/g,' length ')
  .replace(/\bwidth\b/g,' width ')
  .replace(/\bbase\b/g,' base ')
  .replace(/\bvolume\b/g,' volume ')
  .replace(/\btwo\b/g,' 2 ')
  .replace(/\bfour\b/g,' 4 ')
  .replace(/\br\b/g,' radius ')
  .replace(/\bd\b/g,' diameter ')
  .replace(/\bh\b/g,' height ')
  .replace(/\bl\b/g,' length ')
  .replace(/\bw\b/g,' width ')
  .replace(/\bb\b/g,' base ');
 return x.replace(/[^a-z0-9\s.-]/g,' ').replace(/\s+/g,' ').trim();
}

function rawOhmsMatch(s){
 const x=(s||'').toLowerCase().replace(/[’]/g,"'");
 return /\be\s*(?:=|equals?)\s*i\s*(?:x|×|\*|times|multiplied by)\s*r\b/.test(x)||
        /\bi\s*(?:=|equals?)\s*e\s*(?:\/|÷|over|divided by)\s*r\b/.test(x)||
        /\br\s*(?:=|equals?)\s*e\s*(?:\/|÷|over|divided by)\s*i\b/.test(x);
}

function formulaScore(kind,answer){
 const t=mathText(answer), has=w=>new RegExp('(?:^|\\s)'+w+'(?:$|\\s)').test(t);
 const all=(...w)=>w.every(has), any=(...w)=>w.some(has);
 if(kind==='rectangleArea') return all('length','width')?1:0;
 if(kind==='triangleArea'){
   const core=all('base','height'), half=has('half')||(has('divide')&&has('2'));
   return core&&half?1:core?.55:0;
 }
 if(kind==='circleArea') return all('pi','radius','square')?1:0;
 if(kind==='circumference'){
   if(all('pi','diameter'))return 1;
   if(all('pi','radius')&&(has('2')||has('two')))return 1;
   return 0;
 }
 if(kind==='rectangularVolume') return all('length','width','height')?1:0;
 if(kind==='cylinderVolume'){
   if(all('pi','radius','square','height'))return 1;
   const diameterCore=all('pi','diameter','square','height');
   const quarter=has('quarter')||(has('divide')&&has('4'))||(has('4')&&has('multiply'));
   return diameterCore&&quarter?1:diameterCore?.65:0;
 }
 if(kind==='forcePressureArea') return all('pressure','area')?1:0;
 if(kind==='ohmsLaw'){
   if(rawOhmsMatch(answer))return 1;
   if(all('voltage','current','resistance'))return 1;
   return 0;
 }
 if(kind==='moment') return all('weight','arm')?1:0;
 return 0;
}

function formulaResult(q,answer){
 const def=formulaDefinition(q);if(!def)return null;
 const score=formulaScore(def.kind,answer);
 return {def,score,met:score>=.95};
}

function normalize(s){
 let x=(s||'').toLowerCase().replace(/[’]/g,"'")
  .replace(/\bauto[\s-]+rotation\b/g,'autorotation')
  .replace(/\bdove[\s-]+tail\b/g,'dovetail')
  .replace(/\bfir[\s-]+tree\b|\bfur[\s-]+tree\b/g,'firtree')
  .replace(/\bp[\s-]+lead\b|\bpea lead\b/g,'plead')
  .replace(/\be[\s-]+gap\b/g,'egap')
  .replace(/\br\.?\s*p\.?\s*m\.?\b|\brevolutions? per minute\b/g,'rpm')
  .replace(/\bfull authority digital engine controls?\b/g,'fadec')
  .replace(/\bauxiliary power units?\b/g,'apu')
  .replace(/\btype certificate data sheets?\b/g,'tcds')
  .replace(/\bairworthiness directives?\b/g,'ad')
  .replace(/\bfederal aviation administration\b/g,'faa')
  .replace(/\bnondestructive (inspection|testing|test)\b/g,'ndt')
  .replace(/\bpounds? per square inch\b/g,'psi')
  .replace(/\balternating current\b/g,'ac')
  .replace(/\bdirect current\b/g,'dc')
  .replace(/\bexhaust gas temperature\b/g,'egt')
  .replace(/\bturbine inlet temperature\b/g,'tit')
  .replace(/\boutside air temperature\b/g,'oat')
  .replace(/\bangle of attack\b/g,'aoa')
  .replace(/\b(?:wing )?roots?\b|\broot areas?\b|\binboard (?:section|portion|part|area)s?\b/g,'inboard')
  .replace(/\b(?:wing )?tips?\b|\btip areas?\b|\boutboard (?:section|portion|part|area)s?\b/g,'outboard')
  .replace(/\b(?:ailerons?|lateral control|roll control)\b/g,'rollcontrol')
  .replace(/\b(?:keeps?|kept|maintains?|maintained|retains?|retained|preserves?|preserved|still (?:has|have))\b/g,'preserve')
  .replace(/\b(?:disrupts?|disrupted|disrupting|disturbs?|disturbed|disturbing|spoils?|spoiled|spoiling)\b/g,'disrupt')
  .replace(/\binboard(?:\s+\w+){0,4}\s+first\b/g,'inboard before')
  .replace(/\boutboard(?:\s+\w+){0,4}\s+first\b/g,'outboard before')
  .replace(/\bmain rotor blades?\b|\brotor blades?\b|\bmain rotor\b/g,'rotor')
  .replace(/\bboundary layer(?: of air)?\b|\bboundary layer air\b/g,'airflow')
  .replace(/\bair\s*flow\b/g,'airflow')
  .replace(/\bkeeps? (?:the )?(?:airflow )?from separating\b|\bkeeps? (?:the )?(?:airflow|boundary layer) attached\b/g,'prevent separate airflow')
  .replace(/\b(?:prevents?|delays?|inhibits?|avoids?|stops?) (?:the )?(?:airflow )?separation\b/g,'prevent separate airflow')
  .replace(/\b(?:prevents?|delays?|inhibits?|avoids?|stops?)\b/g,'prevent')
  .replace(/\b(?:separates?|separation|separating|detaches?|detachment|stalling)\b/g,'separate')
  .replace(/\b(?:attached|adheres?|adhering)\b/g,'attach')
  .replace(/\bwithout (?:any )?engine power\b|\bno engine power\b|\bengine (?:is )?(?:disengaged|disconnected)\b|\bdisengages? (?:the )?(?:engine|rotor)\b|\bdisconnects? (?:the )?(?:engine|rotor)\b|\bfreewheels?\b|\bfreewheeling\b/g,'unpowered')
  .replace(/\bwith engine power\b|\bengine (?:drives?|powers?)\b/g,'powered')
  .replace(/\b(upwards?|up|ascend\w*|rise\w*)\b/g,'upward')
  .replace(/\b(downwards?|down|descend\w*|drop\w*)\b/g,'downward')
  .replace(/\b(increases?|increasing|raises?|raising|higher|boosts?|boosting)\b/g,'increase')
  .replace(/\b(decreases?|decreasing|reduces?|reducing|lowers?|lowering|lessens?|diminishes?)\b/g,'decrease')
  .replace(/\b(go|goes|going|went|flow|flows|flowing|flowed|travel\w*|pass\w*|move\w*)\b/g,'move')
  .replace(/\bair move\b/g,'airflow')
  .replace(/\b(rotates?|rotating|turns?|turning|spins?|spinning)\b/g,'rotate')
  .replace(/\b(inspects?|inspected|inspecting|examines?|examined|examining|checks?|checked|checking)\b/g,'inspect')
  .replace(/\b(causes?|caused|causing|creates?|created|creating|produces?|produced|producing)\b/g,'cause')
  .replace(/\b(allows?|allowed|allowing|permits?|permitted|permitting)\b/g,'allow')
  .replace(/\b(provides?|provided|providing|supplies?|supplied|supplying|delivers?|delivered)\b/g,'supply')
  .replace(/\b(routes?|routed|routing|directs?|directed|directing|sends?|sent)\b/g,'direct')
  .replace(/\b(indicates?|indicated|indicating|shows?|showed|showing|displays?|displayed|displaying)\b/g,'indicate')
  .replace(/\b(cools?|cooled|cooling|removes? heat|dissipates? heat)\b/g,'cool')
  .replace(/\b(resists? corrosion|resistant to corrosion|does not corrode|do not corrode|will not corrode|won't corrode)\b/g,'corrosionresistant')
  .replace(/\b(lightweight|light weight)\b/g,'lowweight')
  .replace(/\b(de-?energizes?|de-?energized|turns? off|shuts? off)\b/g,'off')
  .replace(/\b(energizes?|energized|turns? on|powers? up)\b/g,'on')
  .replace(/\bengages?|engaged\b/g,'engaged')
  .replace(/\bdisengages?|disengaged\b/g,'disengaged')
  .replace(/\bconnects?|connected\b/g,'connected')
  .replace(/\bdisconnects?|disconnected\b/g,'disconnected')
  .replace(/\bclosed?\b/g,'closed')
  .replace(/\bblades?\b/g,'blade').replace(/\bbearings?\b/g,'bearing').replace(/\bvalves?\b/g,'valve').replace(/\bmanuals?\b/g,'manual')
  .replace(/\bcarburett?ors?\b|\bcarbs?\b/g,'carburetor')
  .replace(/\bmagnetos?\b|\bmagnitos?\b/g,'magneto')
  .replace(/\bthermo[\s-]?couples?\b|\bthermal couples?\b/g,'thermocouple')
  .replace(/\btachometers?\b|\btackometers?\b/g,'tachometer')
  .replace(/\bpropellers?\b|\bprops?\b/g,'propeller')
  .replace(/\bventuris?\b|\bventures?\b/g,'venturi')
  .replace(/[π𝛑]|\bpie\b/g,' pi ')
  .replace(/½|\bone[\s-]+half\b|\ba half\b/g,' half ')
  .replace(/¼|\bone[\s-]+(?:fourth|quarter)\b|\ba quarter\b/g,' quarter ')
  .replace(/²|\^\s*2\b|\bsquared\b|\b(?:to the )?(?:second|2nd) power\b/g,' square ')
  .replace(/³|\^\s*3\b|\bcubed\b|\b(?:to the )?(?:third|3rd) power\b/g,' cube ')
  .replace(/\bmultiplied by\b|\btimes\b|[×*]/g,' multiply ')
  .replace(/\bdivided by\b|\bover\b|[÷/]/g,' divide ');
 return x.replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
}

function stem(w){
 if(CANON.has(w))return w;
 if(w.length>5&&w.endsWith('ies'))return w.slice(0,-3)+'y';
 if(w.length>6&&w.endsWith('ing'))return w.slice(0,-3);
 if(w.length>5&&w.endsWith('ed'))return w.slice(0,-2);
 if(w.length>4&&w.endsWith('es'))return w.slice(0,-2);
 if(w.length>3&&w.endsWith('s')&&!w.endsWith('ss'))return w.slice(0,-1);
 return w;
}
function tokens(s){return normalize(s).split(' ').filter(Boolean).map(stem)}
function tokenSet(s){return new Set(tokens(s))}
function weight(t){if(CRITICAL.has(t))return 2;if(ACTION.has(t))return 1.5;if(/^\d/.test(t)||t.length<=4&&['rpm','egt','tit','oat','apu','faa','tcds','ad','ac','dc'].includes(t))return 1.8;if(GENERIC.has(t)||STOP.has(t))return .45;return 1}
function distance(a,b){if(a===b)return 0;if(Math.abs(a.length-b.length)>2)return 99;let p=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){let c=[i];for(let j=1;j<=b.length;j++)c[j]=Math.min(c[j-1]+1,p[j]+1,p[j-1]+(a[i-1]===b[j-1]?0:1));p=c}return p[b.length]}
function tokenEquals(a,b){if(a===b)return true;if(a.length>=5&&b.length>=5&&a[0]===b[0])return distance(a,b)<=1;if(Math.max(a.length,b.length)>=10&&a[0]===b[0])return distance(a,b)<=2;return false}
function hasToken(actual,t){return actual.some(a=>tokenEquals(a,t))}
function phraseIncluded(answer,phrase){const a=' '+normalize(answer)+' ',p=' '+normalize(phrase)+' ';return p.trim().length>1&&a.includes(p)}
function contradiction(expected,actual){
 for(const t of expected){const o=OPP[t];if(o&&hasToken(actual,o)&&!hasToken(actual,t))return true}
 if(expected.includes('prevent')&&expected.includes('separate')&&(hasToken(actual,'allow')||hasToken(actual,'increase')||hasToken(actual,'cause'))&&hasToken(actual,'separate')&&!hasToken(actual,'prevent'))return true;
 return false;
}
function coreFromPhrase(phrase,q){
 let ts=tokens(phrase).filter(t=>!STOP.has(t));
 const qt=new Set(tokens(q.question).filter(t=>!STOP.has(t)&&!GENERIC.has(t)));
 let reduced=ts.filter(t=>!qt.has(t)||CRITICAL.has(t)||/^\d/.test(t));if(reduced.length)ts=reduced;
 reduced=ts.filter(t=>!GENERIC.has(t)||CRITICAL.has(t));if(reduced.length)ts=reduced;
 return [...new Set(ts)].slice(0,10);
}
function clauses(s){
 let x=(s||'').toLowerCase()
  .replace(/\band then\b|\bthen\b|\bbut\b|\bwhereas\b|\bhowever\b|\bwhile\b|[;,.!?]/g,'|')
  .replace(/\band\s+(?=(?:in\s+)?(?:normal|normally|autorotation|auto[ -]?rotation|before|after|when|during)\b)/g,'|');
 const parts=x.split('|').map(normalize).filter(Boolean);
 return parts.length?parts:[normalize(s)];
}
function scoreTokens(expected,actual){
 if(!expected.length)return {score:0,matched:0,total:0};
 let got=0,total=0,matched=0;
 expected.forEach(t=>{const w=weight(t);total+=w;if(hasToken(actual,t)){got+=w;matched++}});
 return {score:total?got/total:0,matched,total:expected.length};
}
function matchGroup(q,answer,g){
 const accepted=(g.acceptedTerms||[]).filter(Boolean);
 const anchors=(g.anchors&&g.anchors.length?g.anchors:coreFromPhrase(accepted[0]||g.label,q)).map(stem);
 const relational=anchors.filter(t=>CRITICAL.has(t)).length>=2||/\b(normal|autorotation|before|after|upward|downward|increase|decrease|open|closed)\b/i.test(g.label||'');
 const candidates=relational?clauses(answer):[normalize(answer)];
 let overallBest={met:false,score:0,matchedTerm:null,matchedTokens:[]};
 for(const candidate of candidates){
   const actual=tokens(candidate);
   if(contradiction(anchors,actual))continue;
   for(const phrase of accepted){
     if(phraseIncluded(candidate,phrase))return {met:true,score:1,matchedTerm:phrase,matchedTokens:coreFromPhrase(phrase,q)};
   }
   let base=scoreTokens(anchors,actual);
   const anchorMin=g.minMatches||Math.max(1,Math.ceil(anchors.length*.4));
   const minScore=typeof g.minScore==='number'?g.minScore:.42;
   let candidateBest={met:base.matched>=anchorMin&&base.score>=minScore,score:base.score,matchedTerm:null,matchedTokens:anchors.filter(t=>hasToken(actual,t))};
   for(const phrase of accepted){
     const core=coreFromPhrase(phrase,q);if(!core.length||contradiction(core,actual))continue;
     const ps=scoreTokens(core,actual);
     const phraseMin=Math.min(anchorMin,Math.max(1,core.length));
     const ok=ps.matched>=phraseMin&&ps.score>=minScore;
     if(ok&&(!candidateBest.met||ps.score>=candidateBest.score))candidateBest={met:true,score:ps.score,matchedTerm:phrase,matchedTokens:core.filter(t=>hasToken(actual,t))};
     else if(!candidateBest.met&&ps.score>candidateBest.score)candidateBest={met:false,score:ps.score,matchedTerm:null,matchedTokens:core.filter(t=>hasToken(actual,t))};
   }
   if(candidateBest.met)return candidateBest;
   if(candidateBest.score>overallBest.score)overallBest=candidateBest;
 }
 return overallBest;
}
function blueprint(q){
 const old=q.grading||{};
 let groups=(old.conceptGroups||[]).map(g=>({label:g.label||'Required idea',acceptedTerms:[...new Set([...(g.acceptedTerms||[]),g.label].filter(Boolean))],anchors:g.anchors||[],minMatches:g.minMatches,minScore:g.minScore}));
 if(!groups.length){groups=[{label:q.idealAnswer,acceptedTerms:[q.idealAnswer],anchors:coreFromPhrase(q.idealAnswer,q),minMatches:2,minScore:.42}]}
 let required=Math.max(1,Math.min(groups.length,old.requiredGroups||q.required||1));
 const singularPurpose=/^(?:what is|what's) the (?:purpose|function) of|^what function does|^why (?:is|are|do|does|should|must)/i.test(q.question||'');
 const explicitlyPlural=/(?:purposes|functions)|name (?:two|three|four|five|six)/i.test(q.question||'');
 if(old.autoGenerated!==false&&singularPurpose&&!explicitlyPlural)required=1;
 return {groups,required};
}
function grade(q,answer){
 const f=formulaResult(q,answer);
 if(f&&f.met){
   return {source:'local-v3.2',level:'pass',passed:true,count:1,total:1,required:1,
    concepts:[{label:f.def.label,met:true,score:f.score,matchedTerm:f.def.kind,matchedTokens:[]}],
    confidence:.98,feedback:'The formula was recognized, including spoken mathematical wording.'};
 }
 if(f&&!f.met){
   const level=f.score>=.5?'almost':'fail';
   return {source:'local-v3.2',level,passed:false,count:0,total:1,required:1,
    concepts:[{label:f.def.label,met:false,score:f.score,matchedTerm:null,matchedTokens:[]}],
    confidence:level==='almost'?.62:.4,
    feedback:level==='almost'?'The main formula pieces were recognized, but one required part is missing.':'The required formula was not recognized yet.'};
 }
 const b=blueprint(q);
 const concepts=b.groups.map(g=>{const m=matchGroup(q,answer,g);return {label:g.label,met:m.met,score:m.score,matchedTerm:m.matchedTerm,matchedTokens:m.matchedTokens}});
 const count=concepts.filter(c=>c.met).length;
 const passed=count>=b.required;
 const bestMissing=Math.max(0,...concepts.filter(c=>!c.met).map(c=>c.score));
 let level=passed?'pass':(count>=Math.max(1,b.required-1)||bestMissing>=.34?'almost':'fail');
 const confidence=passed?Math.min(.99,.78+concepts.filter(c=>c.met).reduce((n,c)=>n+c.score,0)/(Math.max(1,count)*5)):(level==='almost'?.62:.38);
 return {source:'local-v3',level,passed,count,total:concepts.length,required:b.required,concepts,confidence,feedback:passed?'The required ideas were recognized.':level==='almost'?'Your answer is close. Add the missing idea or make the wording a little clearer.':'The key idea was not clear enough yet. Review the expected answer and try again.'};
}

global.FAA_GRADER={version:'3.2',normalize,tokens,grade,blueprint,matchGroup,mathText,formulaDefinition,formulaScore};
})(window);
