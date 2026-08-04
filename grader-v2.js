(function(global){
'use strict';
const STOP=new Set('a an and are as at be been being by did do does for from had has have he her hers him his how i if in into is it its me my of on or our ours she than that the their theirs them then there these they this those through to was we were what when where which who why will with you your name describe explain define list identify state give called'.split(' '));
const GENERIC=new Set('type types method methods way ways system systems part parts component components item items root roots section sections unit units device devices assembly assemblies mechanism mechanisms different common typical basic main major'.split(' '));
const CRITICAL=new Set('normal autorotation upward downward increase decrease open closed close on off left right clockwise counterclockwise positive negative before after above below greater less more fewer high low hot cold rich lean forward reverse inboard outboard pressure vacuum series parallel ac dc input output inlet outlet primary secondary'.split(' '));
const OPP={upward:'downward',downward:'upward',increase:'decrease',decrease:'increase',open:'closed',closed:'open',on:'off',off:'on',left:'right',right:'left',clockwise:'counterclockwise',counterclockwise:'clockwise',positive:'negative',negative:'positive',before:'after',after:'before',above:'below',below:'above',greater:'less',less:'greater',more:'fewer',fewer:'more',high:'low',low:'high',hot:'cold',cold:'hot',rich:'lean',lean:'rich',forward:'reverse',reverse:'forward',inboard:'outboard',outboard:'inboard',pressure:'vacuum',vacuum:'pressure',series:'parallel',parallel:'series',ac:'dc',dc:'ac',input:'output',output:'input',inlet:'outlet',outlet:'inlet',primary:'secondary',secondary:'primary'};
const NUM={one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10};
function normalize(s){
 let x=(s||'').toLowerCase().replace(/[’']/g,"'")
  .replace(/\bauto[\s-]+rotation\b/g,'autorotation')
  .replace(/\bdove[\s-]+tail\b/g,'dovetail')
  .replace(/\bfir[\s-]+tree\b|\bfur[\s-]+tree\b/g,'firtree')
  .replace(/\bp[\s-]+lead\b|\bpea lead\b/g,'pleadterm')
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
  .replace(/\bmain rotor blades?\b|\brotor blades?\b|\bmain rotor\b/g,'blade')
  .replace(/\bair\s*flow\b/g,'airflow')
  .replace(/\b(upwards?|up|ascend\w*|rise\w*)\b/g,'upward')
  .replace(/\b(downwards?|down|descend\w*|drop\w*)\b/g,'downward')
  .replace(/\b(increases?|increasing|raises?|raising|higher)\b/g,'increase')
  .replace(/\b(decreases?|decreasing|reduces?|reducing|lowers?|lowering)\b/g,'decrease')
  .replace(/\b(go|goes|going|went|flow|flows|flowing|flowed|travel\w*|pass\w*|move\w*)\b/g,'move')
  .replace(/\b(rotates?|rotating|turns?|turning|spins?|spinning)\b/g,'rotate')
  .replace(/\b(inspects?|inspected|inspecting|examines?|examined|examining|checks?|checked|checking)\b/g,'inspect')
  .replace(/\b(prevents?|prevented|preventing|stops?|stopped|stopping)\b/g,'prevent')
  .replace(/\b(allows?|allowed|allowing|permits?|permitted|permitting)\b/g,'allow')
  .replace(/\b(indicates?|indicated|indicating|shows?|showed|showing|displays?|displayed|displaying)\b/g,'indicate')
  .replace(/\b(resists? corrosion|resistant to corrosion|does not corrode|do not corrode|will not corrode|won't corrode)\b/g,'corrosionresistant')
  .replace(/\b(lightweight|light weight)\b/g,'lowweight')
  .replace(/\b(de-?energizes?|de-?energized|turns? off|shuts? off)\b/g,'off')
  .replace(/\b(energizes?|energized|turns? on|powers? up)\b/g,'on')
  .replace(/\bclosed?\b/g,'closed')
  .replace(/\bblades?\b/g,'blade').replace(/\bbearings?\b/g,'bearing').replace(/\bvalves?\b/g,'valve').replace(/\bmanuals?\b/g,'manual');
 return x.replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
}
function stem(w){if(w.length>5&&w.endsWith('ies'))return w.slice(0,-3)+'y';if(w.length>6&&w.endsWith('ing'))return w.slice(0,-3);if(w.length>5&&w.endsWith('ed'))return w.slice(0,-2);if(w.length>4&&w.endsWith('es'))return w.slice(0,-2);if(w.length>3&&w.endsWith('s')&&!w.endsWith('ss'))return w.slice(0,-1);return w;}
function tokens(s){return normalize(s).split(' ').filter(Boolean).map(stem)}
function tokenSet(s){return new Set(tokens(s))}
function explicitIgnored(q){return new Set(((q.grading&&q.grading.ignoreTerms)||[]).flatMap(tokens))}
function questionTokens(q){return new Set(tokens(q.question).filter(x=>!STOP.has(x)&&!GENERIC.has(x)))}
function coreTokens(term,q){
 let ts=tokens(term).filter(x=>!STOP.has(x));
 const explicit=explicitIgnored(q); ts=ts.filter(x=>!explicit.has(x));
 const qt=questionTokens(q); let withoutQuestion=ts.filter(x=>!qt.has(x)||CRITICAL.has(x)||/^\d/.test(x));
 if(withoutQuestion.length)ts=withoutQuestion;
 let withoutGeneric=ts.filter(x=>!GENERIC.has(x)||CRITICAL.has(x));
 if(withoutGeneric.length)ts=withoutGeneric;
 return [...new Set(ts)];
}
function distance(a,b){if(a===b)return 0;if(Math.abs(a.length-b.length)>2)return 99;let p=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){let c=[i];for(let j=1;j<=b.length;j++)c[j]=Math.min(c[j-1]+1,p[j]+1,p[j-1]+(a[i-1]===b[j-1]?0:1));p=c}return p[b.length]}
function tokenEquals(a,b){if(a===b)return true;if(a.length>=5&&b.length>=5&&a[0]===b[0])return distance(a,b)<=1;if(Math.max(a.length,b.length)>=10&&a[0]===b[0])return distance(a,b)<=2;return false}
function hasToken(actual,t){return actual.some(a=>tokenEquals(a,t))}
function clauses(s){let x=(s||'').toLowerCase().replace(/\band then\b|\bthen\b|\bbut\b|\bwhereas\b|\bhowever\b|\bwhile\b|[;,.!?]/g,'|').replace(/\band\s+(?=(?:in\s+)?(?:normal|normally|autorotation|before|after|when|during)\b)/g,'|');let p=x.split('|').map(normalize).filter(Boolean);return p.length?p:[normalize(s)]}
function contradiction(expected,actual){for(const t of expected){const opposite=OPP[t];if(opposite&&hasToken(actual,opposite)&&!hasToken(actual,t))return true}return false}
function matchTerm(q,answer,term){
 const expected=coreTokens(term,q); if(!expected.length)return false;
 const relation=expected.some(t=>CRITICAL.has(t))||expected.length>=4;
 const candidates=relation?clauses(answer):[normalize(answer)];
 return candidates.some(candidate=>{
   const actual=tokens(candidate);
   if(contradiction(expected,actual))return false;
   const matched=expected.filter(t=>hasToken(actual,t)).length;
   const critical=expected.filter(t=>CRITICAL.has(t)||/^\d/.test(t));
   if(critical.some(t=>!hasToken(actual,t)))return false;
   if(expected.length===1)return matched===1;
   if(expected.length===2)return matched===2;
   if(expected.length===3)return matched>=2;
   return matched>=Math.max(2,Math.ceil(expected.length*.55));
 });
}
function requestedCount(q,total,current){
 const text=normalize(q.question);let n=null;
 for(const [word,val] of Object.entries(NUM)){if(new RegExp('\\b(?:name|list|give|identify|what are|what were)\\s+(?:the\\s+)?'+word+'\\b').test(text)){n=val;break}}
 const digit=text.match(/\b(?:name|list|give|identify)\s+(\d+)\b/);if(digit)n=Number(digit[1]);
 if(/\bname some\b|\blist some\b|\bwhat are some\b/.test(text))n=Math.min(2,total);
 return Math.max(1,Math.min(total,n||current||1));
}
function blueprint(q){
 let groups=(q.grading&&Array.isArray(q.grading.conceptGroups))?q.grading.conceptGroups:(q.concepts||[]).map(x=>({label:x.label,acceptedTerms:x.terms||[]}));
 groups=groups.map(g=>({label:g.label||'Required concept',acceptedTerms:[...new Set([...(g.acceptedTerms||[]),g.label].filter(Boolean))]}));
 let required=requestedCount(q,groups.length,(q.grading&&q.grading.requiredGroups)||q.required||1);
 return{groups,required};
}
function grade(q,answer){
 const b=blueprint(q);let details=b.groups.map(g=>{let matchedTerm=null;for(const t of g.acceptedTerms){if(matchTerm(q,answer,t)){matchedTerm=t;break}}return{label:g.label,met:!!matchedTerm,matchedTerm}});
 const count=details.filter(x=>x.met).length;const passed=count>=b.required;let level=passed?'pass':(count>0&&count>=b.required-1?'almost':'fail');
 return{source:'local',level,passed,count,total:details.length,required:b.required,concepts:details,confidence:passed?.92:(level==='almost'?.68:.45),feedback:passed?'Required concepts recognized.':level==='almost'?'You are close. Add the missing concept and resubmit.':'The key required concepts were not recognized yet.'};
}
global.FAA_GRADER={version:'2.1',normalize,grade,blueprint,coreTokens};
})(window);