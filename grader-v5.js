(function(global){
'use strict';

const STOP=new Set(('a an and are as at be because been being by can could did do does for from had has have having how if in into is it its may might of on or should so than that the their them then there these they this those through to up use used using was were what when where which while who why will with would').split(' '));
const GLUE=new Set(('also any around called generally has have having including often possibly process range same such typically usually this').split(' '));
const CRITICAL=new Set(('yes no not without upward downward increase decrease open closed on off left right clockwise counterclockwise positive negative before after above below greater less more fewer high low hot cold rich lean forward reverse inboard outboard pressure vacuum series parallel ac dc input output inlet outlet primary secondary powered unpowered locked unlocked engaged disengaged connected disconnected').split(' '));
const OPP={
 upward:'downward',downward:'upward',increase:'decrease',decrease:'increase',open:'closed',closed:'open',on:'off',off:'on',left:'right',right:'left',clockwise:'counterclockwise',counterclockwise:'clockwise',positive:'negative',negative:'positive',before:'after',after:'before',above:'below',below:'above',greater:'less',less:'greater',more:'fewer',fewer:'more',high:'low',low:'high',hot:'cold',cold:'hot',rich:'lean',lean:'rich',forward:'reverse',reverse:'forward',inboard:'outboard',outboard:'inboard',pressure:'vacuum',vacuum:'pressure',series:'parallel',parallel:'series',ac:'dc',dc:'ac',input:'output',output:'input',inlet:'outlet',outlet:'inlet',primary:'secondary',secondary:'primary',powered:'unpowered',unpowered:'powered',locked:'unlocked',unlocked:'locked',engaged:'disengaged',disengaged:'engaged',connected:'disconnected',disconnected:'connected',yes:'no',no:'yes'
};

const NUMBER_WORDS={one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10};

function normalize(s){
 let x=(s||'').toLowerCase().replace(/[’‘]/g,"'");
 x=x
  .replace(/\bc\s*\.?\s*g\s*\.?\b/g,'cg')
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
  .replace(/\b(prevents?|prevented|preventing|delays?|delayed|delaying|stops?|stopped|stopping|keeps?)\b/g,'prevent')
  .replace(/\bseparat(?:e|es|ing|ed|ion)\b|\bdetach(?:es|ing|ed|ment)?\b/g,'separate')
  .replace(/\bwing root\b|\broot of (?:the )?wing\b/g,'inboard')
  .replace(/\bwing tip\b|\btip of (?:the )?wing\b/g,'outboard')
  .replace(/\bdisconnect(?:s|ed|ing)?\b|\bdisengag(?:e|es|ed|ing)\b|\bfreewheel(?:s|ed|ing)?\b|\bdecoupl(?:e|es|ed|ing)\b/g,'disconnected')
  .replace(/\bconnect(?:s|ed|ing)?\b|\bengag(?:e|es|ed|ing)\b|\bcoupl(?:e|es|ed|ing)\b/g,'connected')
  .replace(/\binspect(?:s|ed|ing)?\b|\bcheck(?:s|ed|ing)?\b|\bexamin(?:e|es|ed|ing)\b/g,'inspect')
  .replace(/\bsuppl(?:y|ies|ied|ying)\b|\bprovid(?:e|es|ed|ing)\b|\bdeliver(?:s|ed|ing)?\b/g,'supply')
  .replace(/\bindicat(?:e|es|ed|ing)\b|\bshow(?:s|ed|ing)?\b|\bdisplay(?:s|ed|ing)?\b/g,'indicate')
  .replace(/\bmaintain(?:s|ed|ing)?\b|\bregulat(?:e|es|ed|ing)\b/g,'maintain')
  .replace(/\bcalculat(?:e|es|ed|ing|ion)\b|\bcomput(?:e|es|ed|ing|ation)\b|\bmathematically\b|\bdo the math\b/g,'calculate')
  .replace(/\bweigh(?:ed|ing)? again\b|\bre[\s-]*weigh(?:ed|ing)?\b/g,'reweigh')
  .replace(/\bremains?\b|\bstays?\b|\bleft over\b|\bleft behind\b|\bstuck\b|\btrapped\b/g,'remain')
  .replace(/\bcannot be drained\b|\bcan not be drained\b|\bwon't drain\b|\bdoes not drain\b/g,'remain after drain')
  .replace(/\bsmall(?:er|est)?\b|\bnarrow(?:er|est)?\b|\blimited\b|\brestricted\b|\btight\b/g,'limited')
  .replace(/\bsmoking\b|\bsmoky\b|\bblack\b|\bdark\b/g,'smoky')
  .replace(/\bstream(?:ing|s|ed)?\b|\bstreak(?:ing|s|ed)?\b|\btrail(?:ing|s|ed)?\b/g,'streak')
  .replace(/\banodizing\b|\banodised\b|\banodized\b/g,'anodized')
  .replace(/\bstrip(?:s|ped|ping)? off\b|\btake(?:s|n|ing)? off\b|\bwear(?:s|ing|n)? away\b|\bremov(?:e|es|ed|ing)\b/g,'remove')
  .replace(/\bpaint (?:will )?stick\b|\bpaint adher(?:e|es|ed|ing)\b|\bpaint adhesion\b/g,'paintadhesion')
  .replace(/\bcorrosion resistant\b|\bresists? corrosion\b|\bcorrosion resistance\b|\bprotect(?:s|ed|ing)? (?:the )?(?:metal|aluminum) from corrosion\b|\bprevent(?:s|ed|ing)? corrosion\b/g,'corrosionprotection')
  .replace(/\belectrostatic (?:charge or )?fields?\b|\belectric fields?\b|\bstatic electric fields?\b/g,'electricfield')
  .replace(/\bstep(?:ped|ping)?(?: it| the voltage)? up\b|\brais(?:e|es|ed|ing)\b/g,'increase')
  .replace(/\bstep(?:ped|ping)?(?: it| the voltage)? down\b|\blower(?:s|ed|ing)?\b/g,'decrease')
  .replace(/\bautorotation up\b/g,'autorotation upward')
  .replace(/\bautorotation down\b/g,'autorotation downward')
  .replace(/\bnormal(?: flight)? up\b/g,'normal upward')
  .replace(/\bnormal(?: flight)? down\b/g,'normal downward')
  .replace(/\blight(?:er)? wires?\b|\bsmall(?:er)? wires?\b|\bless wire weight\b|\bless copper\b|\bweighs? less\b/g,'lightweightwire')
  .replace(/\bmore efficient(?:ly)?\b|\befficient transmission\b/g,'efficient')
  .replace(/\bpivot point\b/g,'fulcrum')
  .replace(/\benergy (?:of|from) movement\b|\benergy (?:of|from) moving\b/g,'energy motion')
  .replace(/\bcorrosion residue\b/g,'residue')
  .replace(/\bresists? corrosion\b|\bcorrosion resistant\b|\bresistant to corrosion\b/g,'corrosionprotection')
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
  .replace(/\br\b/g,'radius').replace(/\bl\b/g,'length').replace(/\bw\b/g,'width').replace(/\bb\b/g,'base').replace(/\bh\b/g,'height');
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
function unique(a){return [...new Set(a.filter(Boolean))]}
function contentTokens(s){return unique(tokens(s).filter(t=>!STOP.has(t)&&!GLUE.has(t)&&t.length>1))}
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

function group(label,acceptedTerms,anchors,minMatches=1,minScore=.34,supportTerms=[]){return {label,acceptedTerms,anchors,minMatches,minScore,supportTerms}}

const MANUAL={
 'PP-CH02-Q013':{required:4,groups:[
  group('Valves',['valves','intake valve','exhaust valve','leaking valve','valve leakage'],['valve'],1,.34),
  group('Piston rings',['piston rings','piston ring','rings','worn rings','leaking rings','ring leakage'],['ring'],1,.34),
  group('Cylinder wall',['cylinder wall','cylinder walls','cylinder bore','wall'],['wall'],1,.34),
  group('Cylinder head gasket',['cylinder head gasket','head gasket','gasket','leaking head gasket'],['gasket'],1,.34)
 ]},
 'GEN-CH08-Q004':{required:1,groups:[group('Bolt-head identification marking',['code markings on the bolt heads','code marking on the bolt head','markings on the bolt head','head markings','cross on the head','asterisk on the head','cross or asterisk on the head','raised cross on the head','raised asterisk on the head'],['marking','head'],1,.30)]},
 'GEN-CH01-Q011':{required:1,groups:[group('Multiply the number by itself',['multiply the number by itself','number times itself','4 times 4 is 16','7 times 7 is 49'],['multiply','number','itself'],2,.45,['example'])]},
 'GEN-CH01-Q012':{required:1,groups:[group('Scientific notation',['scientific notation','powers of 10','power of 10'],['scientific','notation'],1,.34)]},
 'GEN-CH02-Q003':{required:1,groups:[group('Energy of motion',['energy of motion','motion energy','energy from moving'],['energy','motion'],2,.5)]},
 'GEN-CH02-Q005':{required:2,groups:[group('Rigid bar',['rigid bar','bar','lever bar'],['bar'],1,.34),group('Fulcrum or pivot',['fulcrum','pivot','pivot point'],['fulcrum'],1,.34)]},
 'GEN-CH02-Q024':{required:1,groups:[group('Prevents or delays airflow separation',['prevents separation','delays separation','keeps the airflow from separating','prevents boundary layer separation','delays boundary layer separation'],['prevent','separate'],2,.5,['higher angle of attack','lower stall speed'])]},
 'GEN-CH02-Q026':{required:2,groups:[group('Normal flight: airflow downward',['normal flight air moves downward','normal airflow downward','air goes down through the rotor in normal flight'],['normal','downward'],2,.5),group('Autorotation: airflow upward',['autorotation air moves upward','airflow upward in autorotation','air goes up through the rotor in autorotation'],['autorotation','upward'],2,.5)]},
 'GEN-CH03-Q014':{required:1,groups:[group('AC voltage can be changed with a transformer',['step up and step down with transformers','stepped up or down with a transformer','increase or decrease voltage with a transformer','raise or lower voltage with transformers','voltage can be changed by a transformer','transmit power efficiently over long distances'],['transformer','increase','decrease','voltage'],2,.34,['smaller wires','lighter wires','weighs less','less copper','lightweightwire'])]},
 'GEN-CH03-Q018':{required:1,groups:[group('Energy stored in an electrostatic field',['electrostatic field','electrostatic fields','electric field','static electric field','electrostatic charge'],['electricfield'],1,.34,['between two conductors','between plates','separated by an insulator','dielectric'])]},
 'GEN-CH06-Q002':{required:1,groups:[group('Reweigh the aircraft',['reweigh the aircraft','weigh the aircraft','weigh the plane','aircraft would have to be weighed'],['reweigh'],1,.34,['prepare new weight and balance records','new records'])]},
 'GEN-CH06-Q004':{required:1,groups:[group('Calculate the new weight and C.G.',['calculate the new cg','determine the new cg by calculation','do it mathematically','calculate using weight and arm','use the weight and arm','compute the weight and balance change'],['calculate'],1,.34,['records are up to date','weight and balance records'])]},
 'GEN-CH06-Q016':{required:1,groups:[group('Oil remaining after the system is drained',['oil that remains after draining','oil left after draining','oil trapped in the lines','oil stuck in the lines','oil that cannot be drained','undrainable oil'],['oil','remain','drain'],2,.4)]},
 'GEN-CH06-Q024':{required:1,groups:[group('Smaller or limited C.G. range, or lateral C.G. consideration',['smaller cg range','limited cg range','narrow cg range','tight cg limits','extremely limited','very limited','lateral cg','must consider lateral center of gravity'],['limited','cg'],1,.34)]},
 'GEN-CH12-Q012':{required:1,groups:[group('Dark or smoky streaks from rivet heads',['smoking rivets','smoky rivets','dark residue around rivets','smoky residue around rivet heads','streaming back from rivet heads','dark streaks behind the rivets','black streaks from the rivets'],['smoky','rivet','streak'],2,.4)]},
 'GEN-CH12-Q013':{required:2,groups:[group('Dissimilar metals',['dissimilar metals','different metals','unlike metals','steel and aluminum','steel pin and aluminum hinge'],['dissimilar','metal'],1,.34),group('Trapped moisture or contaminants',['traps moisture','holds moisture','moisture gets trapped','traps water','traps contaminants','collects moisture'],['remain','moisture'],1,.34)]},
 'GEN-CH12-Q018':{required:1,groups:[group('Corrosion protection or improved paint adhesion',['protects the metal','protects the underlying metal','prevents corrosion','improves corrosion resistance','corrosion protection','helps paint adhere','gives paint something to adhere to','helps paint stick','improves paint adhesion','provides a surface for paint'],['corrosionprotection','paintadhesion'],1,.34)]},
 'GEN-CH12-Q019':{required:1,groups:[group('Metal polish removes the anodized protective surface',['remove the anodized surface','remove the anodized coating','take off the anodized surface','damage the anodized coating','remove the protective coating','wear away the anodizing','strip the anodized layer'],['remove','anodized'],2,.5)]},
 'PP-CH03-Q005':{required:2,groups:[group('Dovetail attachment',['dovetail','dove tail','dovetail root'],['dovetail'],1,.34),group('Bulb attachment',['bulb','bulb root','bulb type root'],['bulb'],1,.34),group('Fir-tree attachment',['fir tree','firtree','fir tree root'],['firtree'],1,.34)]}
};

const DYNAMIC_RULES=[
 {test:/order of operations/i,plan:{required:4,ordered:true,groups:[group('Grouping symbols or parentheses',['parentheses','grouping symbols','grouped expressions','brackets'],['parenthese'],1,.3),group('Exponents',['exponents','powers'],['exponent'],1,.3),group('Multiplication and division',['multiplication and division','multiply and divide'],['multiply','divide'],2,.45),group('Addition and subtraction',['addition and subtraction','add and subtract'],['addition','subtraction'],2,.45)]}},
 {test:/volume of (?:a )?(?:rectangular solid|box|rectangular prism)/i,plan:{required:1,groups:[group('Length × width × height',['length times width times height','length multiply width multiply height','l w h'],['length','width','height','multiply'],3,.5)]}},
 {test:/volume of (?:a )?cylinder/i,plan:{required:1,groups:[group('π × radius² × height',['pi times radius squared times height','pi radius squared height','pi over four times diameter squared times height'],['pi','radius','square','height'],3,.5)]}},
 {test:/acute angle/i,plan:{required:1,groups:[group('Greater than 0° and less than 90°',['less than 90 degrees','smaller than 90 degrees but not zero','between zero and 90 degrees'],['less','90'],1,.3)]}},
 {test:/scalene triangle/i,plan:{required:1,groups:[group('No equal sides',['all sides are different','no two sides are equal','unequal sides'],['side','different'],1,.3)]}},
 {test:/stall strips?/i,plan:{required:1,groups:[group('Makes the wing root stall first and preserves aileron control',['wing root stalls first','inboard stalls before the tip','preserves aileron control','maintains lateral control during a stall'],['inboard','before','outboard'],2,.4)]}},
 {test:/define autorotation|what is autorotation/i,plan:{required:2,groups:[group('Rotor turns without engine power',['rotor turns without engine power','engine disengaged from the rotor','main rotor freewheels'],['rotate','without','engine'],2,.4),group('Air flows upward through the rotor',['air flows upward through the rotor','air moves up through the main rotor'],['upward','rotor'],2,.4)]}},
 {test:/negative exponent/i,plan:{required:1,groups:[group('Reciprocal or one over the positive power',['reciprocal','one over the positive power','move it to the denominator'],['reciprocal'],1,.34,['becomes a fraction','fraction'])]}},
 {test:/self[ -]?aligning bearing/i,plan:{required:1,groups:[group('Allows angular movement or shaft misalignment',['allows angular movement','accommodates misalignment','allows the shaft to move out of alignment'],['angular','misalignment'],1,.3)]}}
];

function dynamicPlan(q){
 if(MANUAL[q.id])return MANUAL[q.id];
 const text=(q.question||'')+' '+(q.idealAnswer||'');
 const rule=DYNAMIC_RULES.find(r=>r.test.test(text));
 return rule?rule.plan:null;
}

function quantityFromQuestion(question,count){
 const q=normalize(question);
 let m=q.match(/\b(?:at least|name|list|give|what are|what were|identify|state|describe)\s+(\d+)\b/);
 if(m)return Math.min(count,Math.max(1,Number(m[1])));
 for(const [word,n] of Object.entries(NUMBER_WORDS)){
  const re=new RegExp('\\b(?:at least|name|list|give|what are|what were|identify|state|describe)?\\s*'+word+'\\b');
  if(re.test(q))return Math.min(count,n);
 }
 if(/\bat least an?\b|\bgive an? example\b|\bone example\b/.test(q))return 1;
 if(/\bsome\b|\bseveral\b|\ba few\b/.test(q))return Math.min(count,2);
 return null;
}
function isListQuestion(q,count){
 const text=normalize(q.question);
 return quantityFromQuestion(q.question,count)!==null || /\bwhat are\b|\bname\b|\blist\b|\bidentify\b|\bwhich (?:types|methods|parts|materials|factors|items|ways)\b/.test(text);
}
function cleanLabel(label){
 let s=String(label||'Key idea').replace(/^\s*\(?\d+\)?[.)-]?\s*/,'').trim();
 if(!s||/^\d+$/.test(s))return 'Key idea';
 return s.charAt(0).toUpperCase()+s.slice(1);
}
function sanitizeGroup(raw,q,preserveQuestion=false){
 const qTok=new Set(contentTokens(q.question));
 let anchors=unique((raw.anchors||[]).flatMap(a=>contentTokens(a)));
 if(!anchors.length)anchors=contentTokens(raw.label||'');
 anchors=anchors.filter(t=>preserveQuestion||CRITICAL.has(t)||!qTok.has(t));
 const accepted=unique([...(raw.acceptedTerms||[]),raw.label].filter(Boolean));
 if(!anchors.length){
  anchors=contentTokens(accepted.join(' ')).filter(t=>preserveQuestion||CRITICAL.has(t)||!qTok.has(t));
 }
 return {
  label:cleanLabel(raw.label),acceptedTerms:accepted,anchors:anchors.slice(0,10),
  minMatches:Math.max(1,Math.min(anchors.length,raw.minMatches||1)),
  minScore:typeof raw.minScore==='number'?Math.max(.25,raw.minScore):.34,
  supportTerms:raw.supportTerms||[]
 };
}
function deriveGroup(q,rawGroups){
 const qTok=new Set(contentTokens(q.question));
 let anchors=unique(rawGroups.flatMap(g=>g.anchors||[]).filter(t=>CRITICAL.has(t)||!qTok.has(t)));
 if(!anchors.length)anchors=contentTokens(q.idealAnswer).filter(t=>CRITICAL.has(t)||!qTok.has(t));
 anchors=anchors.filter(t=>!GLUE.has(t)).slice(0,10);
 const terms=unique([q.idealAnswer,...rawGroups.flatMap(g=>g.acceptedTerms||[])]).slice(0,30);
 let label=cleanLabel(q.idealAnswer||'Core technical concept');
 if(label.length>110)label=label.slice(0,107)+'…';
 const minMatches=anchors.length<=1?1:anchors.length<=4?1:2;
 return {label,acceptedTerms:terms,anchors,minMatches,minScore:anchors.length<=2?.34:.28,supportTerms:[]};
}
function blueprint(q){
 const custom=dynamicPlan(q);
 if(custom)return {groups:custom.groups.map(g=>sanitizeGroup(g,q,true)),required:Math.max(1,Math.min(custom.groups.length,custom.required||1)),ordered:!!custom.ordered,custom:true};
 const grading=q.grading||{};
 let groups=(grading.conceptGroups||[]).map(g=>sanitizeGroup(g,q)).filter(g=>g.anchors.length||g.acceptedTerms.length);
 if(!groups.length)groups=[deriveGroup(q,[])];
 const list=isListQuestion(q,groups.length);
 if(grading.autoGenerated&&!list&&groups.length>1)groups=[deriveGroup(q,groups)];
 groups=groups.filter((g,i)=>{
  const c=contentTokens(g.label);
  if(groups.length===1)return true;
  if(!c.length)return false;
  if(c.length===1&&GLUE.has(c[0]))return false;
  return true;
 });
 if(!groups.length)groups=[deriveGroup(q,[])];
 const inferred=quantityFromQuestion(q.question,groups.length);
 let required=inferred!=null?inferred:(grading.requiredGroups||q.required||1);
 if(grading.autoGenerated&&!list)required=1;
 required=Math.max(1,Math.min(groups.length,required));
 return {groups,required,ordered:false,custom:false};
}

function matchGroup(answer,g){
 const anchors=(g.anchors||[]).map(stem).filter(Boolean);
 const accepted=(g.acceptedTerms||[]).filter(Boolean);
 const support=(g.supportTerms||[]).filter(Boolean);
 const relational=anchors.some(t=>['normal','autorotation','before','after'].includes(t))&&anchors.some(t=>['upward','downward','increase','decrease','open','closed','before','after','inboard','outboard'].includes(t));
 const candidates=relational?clauses(answer):[normalize(answer)];
 let best={met:false,score:0,matchedTokens:[],matchedTerm:null,support:false};
 for(const candidate of candidates){
  const actual=tokens(candidate);
  if(contradiction(anchors,actual))continue;
  for(const phrase of accepted){if(phraseIncluded(candidate,phrase))return {met:true,score:1,matchedTokens:anchors.filter(t=>hasToken(actual,t)),matchedTerm:phrase,support:false}}
  for(const phrase of support){if(phraseIncluded(candidate,phrase)&&best.score<.55)best={met:false,score:.55,matchedTokens:[],matchedTerm:phrase,support:true}}
  const matched=anchors.filter(t=>hasToken(actual,t));
  const minMatches=Math.max(1,Math.min(anchors.length,g.minMatches||1));
  const score=anchors.length?matched.length/anchors.length:0;
  const minScore=typeof g.minScore==='number'?g.minScore:.34;
  const met=matched.length>=minMatches&&score>=minScore;
  if(met)return {met:true,score,matchedTokens:matched,matchedTerm:null,support:false};
  if(score>best.score)best={met:false,score,matchedTokens:matched,matchedTerm:null,support:false};
 }
 return best;
}
function orderPositions(answer,groups){
 const n=normalize(answer);let last=-1;
 for(const g of groups){
  let pos=Infinity;
  for(const term of [...(g.acceptedTerms||[]),...(g.anchors||[])]){
   const t=normalize(term);if(!t)continue;const i=n.indexOf(t);if(i>=0&&i<pos)pos=i;
  }
  if(pos===Infinity||pos<last)return false;last=pos;
 }
 return true;
}
function grade(q,answer){
 if(normalize(answer)&&normalize(answer)===normalize(q.question||'')){return {source:'jeppesen-local-v5',version:'5.1',level:'fail',passed:false,count:0,total:1,required:1,concepts:[{label:'Answer the question rather than repeat it',met:false,score:0,matchedTokens:[],matchedTerm:null,support:false}],orderOK:true,confidence:.2,reviewRecommended:true,feedback:'The response repeats the question without giving the answer.'};}
 const b=blueprint(q);
 const concepts=b.groups.map(g=>{const m=matchGroup(answer,g);return {label:g.label,met:m.met,score:m.score,matchedTokens:m.matchedTokens,matchedTerm:m.matchedTerm,support:m.support}});
 const count=concepts.filter(c=>c.met).length;
 const orderOK=!b.ordered||orderPositions(answer,b.groups);
 const passed=count>=b.required&&orderOK;
 const partial=Math.max(0,...concepts.filter(c=>!c.met).map(c=>c.score));
 let level=passed?'pass':(count>=Math.max(1,b.required-1)||partial>=.34?'almost':'fail');
 if(b.ordered&&count>=b.required&&!orderOK)level='almost';
 return {
  source:'jeppesen-local-v5',version:'5.1',level,passed,count,total:concepts.length,required:b.required,concepts,orderOK,
  confidence:passed?.88:(level==='almost'?.58:.32),
  reviewRecommended:level!=='pass'||concepts.some(c=>c.support),
  feedback:passed?'The required key ideas were recognized.':level==='almost'?'Your answer is close. Add the missing key idea or clarify the wording.':'Review the expected answer and try again using the key technical terms.'
 };
}

global.FAA_GRADER={version:'5.1-jeppesen-local',normalize,tokens,grade,blueprint,matchGroup,manualCount:Object.keys(MANUAL).length};
})(window);
