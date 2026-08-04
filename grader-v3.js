(function(global){
'use strict';

const CRITICAL=new Set('yes no not without upward downward increase decrease open closed on off left right clockwise counterclockwise positive negative before after above below greater less more fewer high low hot cold rich lean forward reverse inboard outboard pressure vacuum series parallel ac dc input output inlet outlet primary secondary powered unpowered locked unlocked engaged disengaged connected disconnected'.split(' '));
const OPP={
 upward:'downward',downward:'upward',increase:'decrease',decrease:'increase',open:'closed',closed:'open',on:'off',off:'on',left:'right',right:'left',clockwise:'counterclockwise',counterclockwise:'clockwise',positive:'negative',negative:'positive',before:'after',after:'before',above:'below',below:'above',greater:'less',less:'greater',more:'fewer',fewer:'more',high:'low',low:'high',hot:'cold',cold:'hot',rich:'lean',lean:'rich',forward:'reverse',reverse:'forward',inboard:'outboard',outboard:'inboard',pressure:'vacuum',vacuum:'pressure',series:'parallel',parallel:'series',ac:'dc',dc:'ac',input:'output',output:'input',inlet:'outlet',outlet:'inlet',primary:'secondary',secondary:'primary',powered:'unpowered',unpowered:'powered',locked:'unlocked',unlocked:'locked',engaged:'disengaged',disengaged:'engaged',connected:'disconnected',disconnected:'connected',yes:'no',no:'yes'
};

function normalize(s){
 let x=(s||'').toLowerCase().replace(/[’]/g,"'");
 x=x
  .replace(/\bauto[\s-]*rotation\b/g,'autorotation')
  .replace(/\bdove[\s-]*tail\b/g,'dovetail')
  .replace(/\bfir[\s-]*tree\b|\bfur[\s-]*tree\b/g,'firtree')
  .replace(/\bp[\s-]*lead\b|\bpea lead\b/g,'plead')
  .replace(/\be[\s-]*gap\b/g,'egap')
  .replace(/\bangle of attack\b/g,'aoa')
  .replace(/\brevolutions? per minute\b|\br\.?\s*p\.?\s*m\.?\b/g,'rpm')
  .replace(/\bpounds? per square inch\b/g,'psi')
  .replace(/\balternating current\b/g,'ac')
  .replace(/\bdirect current\b/g,'dc')
  .replace(/\btype certificate data sheets?\b/g,'tcds')
  .replace(/\binstructions? for continued airworthiness\b/g,'ica')
  .replace(/\bairworthiness directives?\b/g,'ad')
  .replace(/\bfederal aviation regulations?\b/g,'far')
  .replace(/\bfederal aviation administration\b/g,'faa')
  .replace(/\bfull authority digital engine controls?\b/g,'fadec')
  .replace(/\bauxiliary power units?\b/g,'apu')
  .replace(/\bground power units?\b/g,'gpu')
  .replace(/\bemergency locator transmitters?\b/g,'elt')
  .replace(/\bexhaust gas temperature\b/g,'egt')
  .replace(/\bturbine inlet temperature\b/g,'tit')
  .replace(/\boutside air temperature\b/g,'oat')
  .replace(/\bthermo[\s-]*couples?\b|\bthermal couples?\b/g,'thermocouple')
  .replace(/\bcarburett?ors?\b|\bcarbs?\b/g,'carburetor')
  .replace(/\bmagnetos?\b|\bmagnitos?\b/g,'magneto')
  .replace(/\bpropellers?\b|\bprops?\b/g,'propeller')
  .replace(/\bventuris?\b|\bventures?\b/g,'venturi')
  .replace(/\bnot required\b|\bdoes not require\b|\bis not required\b/g,'no')
  .replace(/\b(?:goes?|moves?|flows?) up\b/g,'upward')
  .replace(/\b(?:goes?|moves?|flows?) down\b/g,'downward')
  .replace(/\bnormally\b/g,'normal')
  .replace(/\b(go|goes|going|went|flow|flows|flowing|flowed|travel\w*|pass\w*|move|moves|moving|moved)\b/g,'move')
  .replace(/\b(rotates?|rotating|turns?|turning|spins?|spinning)\b/g,'rotate')
  .replace(/\b(prevents?|prevented|preventing|delays?|delayed|delaying|stops?|stopped|stopping)\b/g,'prevent')
  .replace(/\bkeeps? (?:the )?[^,.]{0,35}?from separating\b/g,'prevent separate')
  .replace(/\bseparat(?:e|es|ing|ed|ion)\b|\bdetach(?:es|ing|ed|ment)?\b/g,'separate')
  .replace(/\bupwards?\b|\bgoes up\b|\bmoves up\b|\bflows up\b/g,'upward')
  .replace(/\bdownwards?\b|\bgoes down\b|\bmoves down\b|\bflows down\b/g,'downward')
  .replace(/\bwing root\b/g,'inboard')
  .replace(/\bwing tip\b/g,'outboard')
  .replace(/\bdisconnect(?:s|ed|ing)?\b|\bdisengag(?:e|es|ed|ing)\b|\bfreewheel(?:s|ed|ing)?\b|\bdecoupl(?:e|es|ed|ing)\b/g,'disconnected')
  .replace(/\bconnect(?:s|ed|ing)?\b|\bengag(?:e|es|ed|ing)\b|\bcoupl(?:e|es|ed|ing)\b/g,'connected')
  .replace(/\binspect(?:s|ed|ing)?\b|\bcheck(?:s|ed|ing)?\b|\bexamin(?:e|es|ed|ing)\b/g,'inspect')
  .replace(/\bsuppl(?:y|ies|ied|ying)\b|\bprovid(?:e|es|ed|ing)\b|\bdeliver(?:s|ed|ing)?\b/g,'supply')
  .replace(/\bindicat(?:e|es|ed|ing)\b|\bshow(?:s|ed|ing)?\b|\bdisplay(?:s|ed|ing)?\b/g,'indicate')
  .replace(/\bmaintain(?:s|ed|ing)?\b|\bregulat(?:e|es|ed|ing)\b/g,'maintain')
  .replace(/\bresists? corrosion\b|\bcorrosion resistant\b|\bresistant to corrosion\b/g,'corrosionresistant')
  .replace(/\blight[\s-]*weight\b/g,'lowweight')
  .replace(/[π𝛑]|\bpie\b/g,' pi ')
  .replace(/½|\bone[\s-]*half\b|\ba half\b|\b1\s*\/\s*2\b/g,' half ')
  .replace(/¼|\bone[\s-]*(?:fourth|quarter)\b|\ba quarter\b|\b1\s*\/\s*4\b/g,' quarter ')
  .replace(/²|\^\s*2\b|\bsquared\b|\b(?:to the )?(?:second|2nd) power\b/g,' square ')
  .replace(/³|\^\s*3\b|\bcubed\b|\b(?:to the )?(?:third|3rd) power\b/g,' cube ')
  .replace(/\bmultiplied by\b|\bmultiply by\b|\btimes\b|[×*]/g,' multiply ')
  .replace(/\bdivided by\b|\bdivide by\b|\bover\b|[÷/]/g,' divide ')
  .replace(/\bequals?\b|=/g,' equal ')
  .replace(/\bl\s*[x×*]\s*w\b|\blxw\b/g,' length multiply width ')
  .replace(/\bb\s*[x×*]\s*h\b|\bbxh\b/g,' base multiply height ')
  .replace(/\bpi\s*r\b/g,' pi radius ')
  .replace(/\br\b/g,'radius').replace(/\bl\b/g,'length').replace(/\bw\b/g,'width').replace(/\bb\b/g,'base').replace(/\bh\b/g,'height')
  .replace(/\bone\b/g,'1').replace(/\btwo\b/g,'2').replace(/\bthree\b/g,'3').replace(/\bfour\b/g,'4').replace(/\bfive\b/g,'5').replace(/\bsix\b/g,'6').replace(/\bseven\b/g,'7').replace(/\beight\b/g,'8').replace(/\bnine\b/g,'9').replace(/\bten\b/g,'10');
 x=x.replace(/(?<=\d)\.(?=\d)/g,'DECIMAL');
 x=x.replace(/-/g,' ').replace(/[^a-z0-9\s]/g,' ').replace(/DECIMAL/g,'.');
 return x.replace(/\s+/g,' ').trim();
}

function stem(w){
 if(w.length>5&&w.endsWith('ies'))return w.slice(0,-3)+'y';
 if(w.length>6&&w.endsWith('ing'))return w.slice(0,-3);
 if(w.length>5&&w.endsWith('ed'))return w.slice(0,-2);
 if(w.length>4&&w.endsWith('es'))return w.slice(0,-2);
 if(w.length>3&&w.endsWith('s')&&!w.endsWith('ss'))return w.slice(0,-1);
 return w;
}
function tokens(s){return normalize(s).split(' ').filter(Boolean).map(stem)}
function distance(a,b){if(a===b)return 0;if(Math.abs(a.length-b.length)>2)return 99;let p=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){let c=[i];for(let j=1;j<=b.length;j++)c[j]=Math.min(c[j-1]+1,p[j]+1,p[j-1]+(a[i-1]===b[j-1]?0:1));p=c}return p[b.length]}
function tokenEquals(a,b){if(a===b)return true;if(/^\d/.test(a)||/^\d/.test(b))return false;if(a.length>=5&&b.length>=5&&a[0]===b[0]&&distance(a,b)<=1)return true;if(Math.max(a.length,b.length)>=10&&a[0]===b[0]&&distance(a,b)<=2)return true;return false}
function hasToken(actual,t){return actual.some(a=>tokenEquals(a,t))}
function phraseIncluded(answer,phrase){const a=' '+normalize(answer)+' ',p=' '+normalize(phrase)+' ';return p.trim().length>1&&a.includes(p)}
function clauses(s){
 const x=(s||'').replace(/\band then\b|\bthen\b|\bbut\b|\bwhereas\b|\bhowever\b|\bwhile\b|[;,.!?]/gi,'|')
  .replace(/\band\s+(?=(?:in\s+)?(?:normal|normally|autorotation|before|after|when|during)\b)/gi,'|');
 const parts=x.split('|').map(normalize).filter(Boolean);return parts.length?parts:[normalize(s)];
}
function contradiction(expected,actual){
 for(const t of expected){const o=OPP[t];if(o&&!expected.includes(o)&&hasToken(actual,o)&&!hasToken(actual,t))return true}
 if(expected.includes('prevent')&&expected.includes('separate')&&hasToken(actual,'separate')&&!hasToken(actual,'prevent')&&(hasToken(actual,'cause')||hasToken(actual,'allow')||hasToken(actual,'increase')))return true;
 return false;
}
function matchGroup(answer,g){
 const anchors=(g.anchors||[]).map(stem).filter(Boolean);
 const accepted=(g.acceptedTerms||[]).filter(Boolean);
 const relational=(anchors.includes('autorotation')||anchors.includes('normal')||anchors.includes('before')||anchors.includes('after')) && anchors.some(t=>['upward','downward','increase','decrease','open','closed','before','after'].includes(t));
 const candidates=relational?clauses(answer):[normalize(answer)];
 let best={met:false,score:0,matchedTokens:[],matchedTerm:null};
 for(const candidate of candidates){
  const actual=tokens(candidate);
  if(contradiction(anchors,actual))continue;
  for(const phrase of accepted){if(phraseIncluded(candidate,phrase))return {met:true,score:1,matchedTokens:anchors.filter(t=>hasToken(actual,t)),matchedTerm:phrase}}
  const matched=anchors.filter(t=>hasToken(actual,t));
  const minMatches=Math.max(1,Math.min(anchors.length,g.minMatches||1));
  const score=anchors.length?matched.length/anchors.length:0;
  const minScore=typeof g.minScore==='number'?g.minScore:.3;
  const met=matched.length>=minMatches && score>=minScore;
  if(met)return {met:true,score,matchedTokens:matched,matchedTerm:null};
  if(score>best.score)best={met:false,score,matchedTokens:matched,matchedTerm:null};
 }
 return best;
}
function blueprint(q){
 const g=q.grading||{};
 const groups=(g.conceptGroups||[]).map(x=>({label:x.label||'Key idea',acceptedTerms:x.acceptedTerms||[],anchors:x.anchors||[],minMatches:x.minMatches||1,minScore:typeof x.minScore==='number'?x.minScore:.3}));
 return {groups,required:Math.max(1,Math.min(groups.length,g.requiredGroups||q.required||1))};
}
function grade(q,answer){
 const b=blueprint(q);
 const concepts=b.groups.map(g=>{const m=matchGroup(answer,g);return {label:g.label,met:m.met,score:m.score,matchedTokens:m.matchedTokens,matchedTerm:m.matchedTerm}});
 const count=concepts.filter(c=>c.met).length;
 const passed=count>=b.required;
 const partial=Math.max(0,...concepts.filter(c=>!c.met).map(c=>c.score));
 const level=passed?'pass':(count>=Math.max(1,b.required-1)||partial>=.45?'almost':'fail');
 return {
  source:'jeppesen-local-v4',level,passed,count,total:concepts.length,required:b.required,concepts,
  confidence:passed?.9:(level==='almost'?.6:.35),
  feedback:passed?'The required key ideas were recognized.':level==='almost'?'Your answer is close. Add the missing key idea or clarify the wording.':'Review the expected answer and try again using the key technical terms.'
 };
}

global.FAA_GRADER={version:'4.0-jeppesen-only',normalize,tokens,grade,blueprint,matchGroup};
})(window);
