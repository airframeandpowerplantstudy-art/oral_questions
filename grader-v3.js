(function(global){
'use strict';

const STOP=new Set('a an and are as at be been being by did do does for from had has have he her hers him his how i if in into is it its me my of on or our ours she than that the their theirs them then there these they this those through to was we were what when where which who why will with you your name describe explain define list identify state give called during used use using generally usually also some any all may can could should would purpose function functions result results type types kind kinds method methods way ways system systems part parts component components item items unit units device devices assembly assemblies mechanism mechanisms different common typical basic main major aircraft airplane engine engines'.split(' '));
const GENERIC=new Set('type types method methods way ways system systems part parts component components item items root roots section sections unit units device devices assembly assemblies mechanism mechanisms different common typical basic main major purpose function functions result results process procedure procedures condition conditions amount point area areas thing things means necessary proper required generally usually used use using'.split(' '));
const CRITICAL=new Set('normal autorotation upward downward increase decrease open closed on off left right clockwise counterclockwise positive negative before after above below greater less more fewer high low hot cold rich lean forward reverse inboard outboard pressure vacuum series parallel ac dc input output inlet outlet primary secondary powered unpowered locked unlocked engaged disengaged connected disconnected'.split(' '));
const ACTION=new Set('prevent separate rotate airflow unpowered powered increase decrease open close supply direct indicate cool inspect allow remove reduce create cause determine measure regulate protect produce operate compress convert ignite discharge seal lubricate'.split(' '));
const CANON=new Set([...CRITICAL,...ACTION,'dovetail','firtree','plead','egap','fadec','apu','tcds','faa','ndt','psi','egt','tit','oat','aoa','rpm','rotor','thermocouple','tachometer','carburetor','magneto','propeller','venturi','corrosionresistant','lowweight']);
const OPP={upward:'downward',downward:'upward',increase:'decrease',decrease:'increase',open:'closed',closed:'open',on:'off',off:'on',left:'right',right:'left',clockwise:'counterclockwise',counterclockwise:'clockwise',positive:'negative',negative:'positive',before:'after',after:'before',above:'below',below:'above',greater:'less',less:'greater',more:'fewer',fewer:'more',high:'low',low:'high',hot:'cold',cold:'hot',rich:'lean',lean:'rich',forward:'reverse',reverse:'forward',inboard:'outboard',outboard:'inboard',pressure:'vacuum',vacuum:'pressure',series:'parallel',parallel:'series',ac:'dc',dc:'ac',input:'output',output:'input',inlet:'outlet',outlet:'inlet',primary:'secondary',secondary:'primary',powered:'unpowered',unpowered:'powered',engaged:'disengaged',disengaged:'engaged',connected:'disconnected',disconnected:'connected'};

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
  .replace(/\bventuris?\b|\bventures?\b/g,'venturi');
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
 return {groups,required:Math.max(1,Math.min(groups.length,old.requiredGroups||q.required||1))};
}
function grade(q,answer){
 const b=blueprint(q);
 const concepts=b.groups.map(g=>{const m=matchGroup(q,answer,g);return {label:g.label,met:m.met,score:m.score,matchedTerm:m.matchedTerm,matchedTokens:m.matchedTokens}});
 const count=concepts.filter(c=>c.met).length;
 const passed=count>=b.required;
 const bestMissing=Math.max(0,...concepts.filter(c=>!c.met).map(c=>c.score));
 let level=passed?'pass':(count>=Math.max(1,b.required-1)||bestMissing>=.34?'almost':'fail');
 const confidence=passed?Math.min(.99,.78+concepts.filter(c=>c.met).reduce((n,c)=>n+c.score,0)/(Math.max(1,count)*5)):(level==='almost'?.62:.38);
 return {source:'local-v3',level,passed,count,total:concepts.length,required:b.required,concepts,confidence,feedback:passed?'The required ideas were recognized.':level==='almost'?'Your answer is close. Add the missing idea or make the wording a little clearer.':'The key idea was not clear enough yet. Review the expected answer and try again.'};
}

global.FAA_GRADER={version:'3.0',normalize,tokens,grade,blueprint,matchGroup};
})(window);
