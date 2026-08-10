/* Secondary oral bank add-on for the existing FAA Oral Examination Practice page. */
(()=>{
'use strict';
if(window.__ASA_ADDON_LOADED__) return;
window.__ASA_ADDON_LOADED__=true;
const asaBanks=window.ASA_ORAL_BANKS||[];
if(!asaBanks.length)return;
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const sectionLabel=s=>s[0].toUpperCase()+s.slice(1);
const totalAsa=asaBanks.reduce((n,b)=>n+b.questions.length,0);
const totalOriginal=(window.ORAL_BANKS||[]).reduce((n,b)=>n+(b.questions?.length||0),0);
const grader=window.FAA_GRADER||null;
const logger=window.ORAL_LOGGER||null;

function cleanStudentUi(){
  document.querySelectorAll('#testLogger,.logger-tools,.ai-badge').forEach(el=>el.style.setProperty('display','none','important'));
  document.querySelectorAll('button').forEach(el=>{if(el.textContent.trim()==='Test Answer Logger')el.style.setProperty('display','none','important')});
  document.querySelectorAll('span,small,p,div').forEach(el=>{
    if(el.children.length===0 && /Jeppesen-only local concept grader\s*v?[\d.]+/i.test(el.textContent||''))el.style.setProperty('display','none','important');
  });
}
function updateHomeCount(){
  const home=$('sections');
  if(!home?.classList.contains('active')) return;
  const bakerTotal=(window.BAKER_ORAL_BANKS||[]).reduce((n,b)=>n+(b.questions?.length||0),0);
  const label='Question Banks';
  const value=(totalOriginal+totalAsa+bakerTotal).toLocaleString()+' Questions';
  if($('headLabel') && $('headLabel').textContent!==label) $('headLabel').textContent=label;
  if($('headStat') && $('headStat').textContent!==value) $('headStat').textContent=value;
}
cleanStudentUi();
const style=document.createElement('style');
style.textContent=`
#testLogger,.logger-tools,.ai-badge{display:none!important}
.asa-source-block{margin-top:30px;padding-top:24px;border-top:3px solid var(--navy,#14213d)}
.asa-source-head{display:flex;justify-content:space-between;align-items:flex-end;gap:14px;flex-wrap:wrap;margin-bottom:14px}
.asa-source-kicker{font-weight:800;letter-spacing:.09em;text-transform:uppercase;color:var(--blue,#2563eb);font-size:.78rem}
.asa-code-box{background:#f8fafc;border:1px solid var(--line,#dbe3ec);border-radius:14px;padding:14px;margin:14px 0 18px}
.asa-code-row{display:flex;gap:9px;flex-wrap:wrap;align-items:center}
.asa-code-row input{flex:1;min-width:230px;border:1px solid #94a3b8;border-radius:10px;padding:11px 12px;font:inherit;text-transform:uppercase}
.asa-code-message{font-size:.88rem;color:var(--muted,#64748b);margin-top:8px;min-height:1.1em}
.asa-card{border-color:#93c5fd;background:linear-gradient(145deg,#eff6ff,#fff)}
.asa-card:hover,.asa-card:focus{border-color:#1d4ed8;background:#dbeafe}
.asa-badge{display:inline-block;padding:4px 9px;border-radius:999px;background:#dbeafe;color:#1e3a8a;font-size:.76rem;font-weight:800;margin-right:5px}
.asa-meta-line{display:flex;gap:7px;flex-wrap:wrap;margin:8px 0 0}
.asa-filter-summary{padding:10px 12px;border-left:4px solid #2563eb;background:#eff6ff;border-radius:8px;margin:12px 0}
.asa-question-code{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:9px}
.asa-question-code span{padding:4px 8px;border-radius:999px;background:#dbeafe;color:#1e3a8a;font-size:.78rem;font-weight:800}
.asa-feedback{display:none;padding:16px;border-radius:12px;margin-top:14px}.asa-feedback.show{display:block}.asa-feedback.pass{background:#dcfce7}.asa-feedback.almost{background:#fef3c7}.asa-feedback.fail{background:#fee2e2}
.asa-expected{background:#fff;border-left:4px solid var(--blue,#2563eb);padding:11px;margin-top:10px}
.asa-code-inline{font-family:Consolas,monospace;font-size:.92em}
@media(max-width:600px){.asa-code-row{display:grid}.asa-code-row input,.asa-code-row button{width:100%}}
`;
document.head.appendChild(style);

const homeGrid=$('sectionGrid');
if(!homeGrid)return;
const homeBlock=document.createElement('div');
homeBlock.className='asa-source-block';
homeBlock.innerHTML=`
<div class="asa-source-head"><div><div class="asa-source-kicker">Additional source bank</div><h2 class="title" style="margin-top:4px">Secondary Oral Guide</h2><p class="subtitle" style="margin-bottom:0">Knowledge and risk-management questions kept separate from the original question banks.</p></div><span class="asa-badge">${totalAsa.toLocaleString()} questions</span></div>
<div class="asa-code-box"><label for="asaHomeCode" style="margin-top:0">Study by ACS code</label><div class="asa-code-row"><input id="asaHomeCode" type="text" autocomplete="off" spellcheck="false" placeholder="Example: AM.I.A.K12"><button class="btn primary" id="asaHomeCodeGo">Study This Code</button></div><div id="asaHomeCodeMsg" class="asa-code-message">Parentheses, spaces, and lowercase letters are okay. Full or partial codes are accepted.</div></div>
<div id="asaSectionGrid" class="grid"></div>`;
homeGrid.insertAdjacentElement('afterend',homeBlock);

const main=document.querySelector('main');
main.insertAdjacentHTML('beforeend',`
<section id="asaBanksScreen" class="screen"><div class="row"><button class="btn secondary" id="asaBackHome">← Sections</button></div><div class="asa-source-kicker">Secondary</div><h2 id="asaBanksTitle" class="title"></h2><p class="subtitle">Choose a subject, a mixed examination, or enter an ACS code.</p><div class="asa-code-box"><div class="asa-code-row"><input id="asaBankCode" type="text" autocomplete="off" spellcheck="false" placeholder="ACS code, such as AM.II.K.K15"><button class="btn primary" id="asaBankCodeGo">Study Code</button></div><div id="asaBankCodeMsg" class="asa-code-message"></div></div><div id="asaBankGrid" class="grid"></div></section>
<section id="asaModesScreen" class="screen"><div class="row"><button class="btn secondary" id="asaBackBanks">← Secondary Subjects</button></div><div class="asa-source-kicker">Secondary</div><h2 id="asaModeTitle" class="title"></h2><p class="subtitle">Choose how much of this bank to study.</p><div id="asaModeGrid" class="grid"></div></section>
<section id="asaExamScreen" class="screen"><div class="meta"><span id="asaQNum"></span><span id="asaModeLabel"></span></div><div class="question"><div class="asa-question-code"><span id="asaSourceLabel">Secondary</span><span id="asaAcsCode"></span><span id="asaCategory"></span></div><div id="asaSubjectLabel" class="label"></div><h2 id="asaQText"></h2></div><div class="row"><button class="btn secondary" id="asaSpeak">🔊 Read Question</button><button class="btn primary" id="asaListen">🎤 Start Answer</button><button class="btn danger" id="asaStop" disabled>■ Stop</button></div><div class="status" id="asaStatus"><span class="dot"></span><span id="asaStatusText">Begin when ready.</span></div><label for="asaAnswer">Your answer transcript</label><textarea id="asaAnswer" placeholder="Your spoken answer appears here. You may correct or type it."></textarea><p class="small">Review the transcript before submitting; technical terms can be misheard.</p><div class="row"><button class="btn success" id="asaSubmit">Submit Answer</button><button class="btn secondary" id="asaClear">Clear</button></div><div id="asaFeedback" class="asa-feedback"><h3 id="asaFbTitle"></h3><p id="asaFbSummary"></p><div id="asaConcepts" class="concepts"></div><div id="asaExpected" class="asa-expected"></div></div><div class="row"><button class="btn primary" id="asaNext" disabled>Next Question</button><button class="btn secondary" id="asaExit">Exit</button></div></section>
<section id="asaResultsScreen" class="screen"><div id="asaBanner" class="banner"><h2 id="asaResultTitle"></h2><p id="asaResultSummary"></p></div><div id="asaSubjectResults"></div><h2 class="title" style="font-size:1.25rem">Missed Questions</h2><div id="asaReviews"></div><div class="row"><button class="btn primary" id="asaAgain">Practice Again</button><button class="btn secondary" id="asaResultsHome">Return Home</button></div></section>`);

let selectedSection=null,selectedBank=null,mode=null,questions=[],idx=0,answers=[],pending=null,last=null,recognition=null,listening=false,finalText='',attemptCounts={};
const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
function show(id){document.querySelectorAll('main .screen').forEach(s=>s.classList.remove('active'));$(id)?.classList.add('active');window.scrollTo({top:0,behavior:'smooth'})}
function home(){speechSynthesis.cancel();if(listening&&recognition)try{recognition.stop()}catch{};show('sections');if($('headSub'))$('headSub').textContent='Choose a section';updateHomeCount()}
function canon(v){return String(v||'').toUpperCase().replace(/[^A-Z0-9]/g,'')}
function codeMatches(code,query){const c=canon(code),q=canon(query);if(!q)return false;return c===q||c.startsWith(q)||c.endsWith(q)}
function allTaggedQuestions(){return asaBanks.flatMap(b=>b.questions.map(q=>({...q,bankTitle:b.title,bankKey:b.key,section:b.section})))}
function codeStudy(value,msgId){
  let raw=String(value||'').trim(),q=canon(raw);const msg=$(msgId);
  if(!q){if(msg)msg.textContent='Enter an ACS code first.';return}
  let hits=allTaggedQuestions().filter(x=>(x.acsCodes||[x.acsCode]).some(c=>codeMatches(c,q)));
  if(!hits.length && !q.startsWith('AM'))hits=allTaggedQuestions().filter(x=>(x.acsCodes||[x.acsCode]).some(c=>codeMatches(c,'AM'+q)));
  if(!hits.length){if(msg)msg.textContent=`No Secondary questions matched “${raw}”. Check the section and subject letters.`;return}
  if(msg)msg.textContent=`Found ${hits.length} question${hits.length===1?'':'s'}.`;
  selectedSection=hits[0].section;selectedBank=null;mode='code';questions=shuffle(hits);last={kind:'code',value:raw};start();
}
function renderHomeCards(){
 const g=$('asaSectionGrid');g.innerHTML='';
 ['general','airframe','powerplant'].forEach(s=>{const bs=asaBanks.filter(b=>b.section===s),count=bs.reduce((n,b)=>n+b.questions.length,0),k=bs.reduce((n,b)=>n+b.questions.filter(q=>q.category==='Knowledge').length,0),r=count-k;const btn=document.createElement('button');btn.className='cardbtn asa-card';btn.innerHTML=`<strong>${sectionLabel(s)}</strong><span>${bs.length} subjects • ${count.toLocaleString()} questions</span><div class="asa-meta-line"><span class="asa-badge">${k} knowledge</span><span class="asa-badge">${r} risk</span></div>`;btn.onclick=()=>renderBanks(s);g.appendChild(btn)})
}
function renderBanks(s){selectedSection=s;selectedBank=null;const bs=asaBanks.filter(b=>b.section===s),g=$('asaBankGrid');$('asaBanksTitle').textContent=`Secondary ${sectionLabel(s)}`;g.innerHTML='';bs.forEach(b=>{const k=b.questions.filter(q=>q.category==='Knowledge').length,r=b.questions.length-k,btn=document.createElement('button');btn.className='cardbtn asa-card';btn.innerHTML=`<strong>${esc(b.title)}</strong><span>${b.questions.length} questions</span><div class="asa-meta-line"><span class="asa-badge">${k} K</span><span class="asa-badge">${r} R</span></div>`;btn.onclick=()=>renderModes(b);g.appendChild(btn)});const mix=document.createElement('button');mix.className='cardbtn mixed';mix.innerHTML=`<strong>Mixed Secondary ${sectionLabel(s)} Exam</strong><span>4 questions from every subject; 3 of 4 required in each subject</span>`;mix.onclick=()=>startMixed();g.appendChild(mix);if($('headSub'))$('headSub').textContent=`Secondary ${sectionLabel(s)} oral practice`;show('asaBanksScreen')}
function renderModes(b){selectedBank=b;const k=b.questions.filter(q=>q.category==='Knowledge').length,r=b.questions.filter(q=>q.category==='Risk Management').length;$('asaModeTitle').textContent=b.title;const g=$('asaModeGrid');g.innerHTML='';[
 ['practice','Practice',`10 random oral questions with immediate feedback`],
 ['complete','Complete',`Every oral question in this subject (${k})`],
 ['risk','Risk Management',`${r} risk-management questions studied separately`]
 ].forEach(([m,title,sub])=>{const btn=document.createElement('button');btn.className='cardbtn asa-card';btn.disabled=(m==='risk'&&!r)||(m!=='risk'&&!k);btn.innerHTML=`<strong>${title}</strong><span>${sub}</span>`;btn.onclick=()=>startSingle(m);g.appendChild(btn)});show('asaModesScreen')}
function tagged(q,b){return {...q,bankTitle:b.title,bankKey:b.key,section:b.section}}
function startSingle(m){mode=m;let pool=selectedBank.questions.filter(q=>q.category==='Knowledge');if(m==='risk')pool=selectedBank.questions.filter(q=>q.category==='Risk Management');questions=shuffle(pool).slice(0,m==='practice'?10:pool.length).map(q=>tagged(q,selectedBank));last={kind:'single',section:selectedSection,bankKey:selectedBank.key,mode:m};start()}
function startMixed(){mode='mixed';const bs=asaBanks.filter(b=>b.section===selectedSection);questions=shuffle(bs.flatMap(b=>shuffle(b.questions.filter(q=>q.category==='Knowledge')).slice(0,4).map(q=>tagged(q,b))));last={kind:'mixed',section:selectedSection};start()}
function start(){idx=0;answers=[];pending=null;attemptCounts={};if(logger?.startQuiz)try{logger.startQuiz({section:selectedSection,mode:`asa-${mode}`,bankKey:selectedBank?.key||'asa-code-or-mixed',bankTitle:selectedBank?.title||'Secondary filtered/mixed',questionCount:questions.length,source:'Secondary'})}catch{};show('asaExamScreen');load()}
function setStatus(t,on=false){$('asaStatusText').textContent=t;$('asaStatus').classList.toggle('listening',on)}
function load(){const q=questions[idx];$('asaQNum').textContent=`Question ${idx+1} of ${questions.length}`;$('asaModeLabel').textContent=mode==='mixed'?`Mixed Secondary ${sectionLabel(selectedSection)}`:mode==='code'?'ACS Code Study':mode==='practice'?'Practice':mode==='risk'?'Risk Management':'Complete';$('asaAcsCode').textContent=q.acsCode;$('asaCategory').textContent=q.category;$('asaSubjectLabel').textContent=q.bankTitle;$('asaQText').textContent=q.question;$('asaAnswer').value='';finalText='';pending=null;$('asaFeedback').className='asa-feedback';$('asaSubmit').disabled=false;$('asaSubmit').textContent='Submit Answer';$('asaNext').disabled=true;if($('headStat'))$('headStat').textContent=`${idx+1} / ${questions.length}`;if($('bar'))$('bar').style.width=`${idx/questions.length*100}%`;setStatus('Begin when ready.')}
function speak(){speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(questions[idx].question);u.rate=.9;u.onstart=()=>setStatus('Reading the question aloud.');u.onend=()=>setStatus('Question complete. Begin your answer.');speechSynthesis.speak(u)}
if(SR){recognition=new SR();recognition.lang='en-US';recognition.continuous=true;recognition.interimResults=true;recognition.onstart=()=>{listening=true;$('asaListen').disabled=true;$('asaStop').disabled=false;setStatus('Listening…',true)};recognition.onresult=e=>{let interim='',fresh='';for(let i=e.resultIndex;i<e.results.length;i++){if(e.results[i].isFinal)fresh+=e.results[i][0].transcript+' ';else interim+=e.results[i][0].transcript}finalText+=fresh;$('asaAnswer').value=(finalText+interim).trim()};recognition.onerror=e=>setStatus('Microphone error: '+e.error+'. You may type your answer.');recognition.onend=()=>{listening=false;$('asaListen').disabled=false;$('asaStop').disabled=true;setStatus($('asaAnswer').value?'Answer captured. Review and submit.':'Listening stopped.')}}
function fallbackGrade(q,a){const norm=s=>String(s).toLowerCase().replace(/[^a-z0-9]+/g,' ').trim(),want=norm(q.idealAnswer).split(' ').filter(w=>w.length>3),got=new Set(norm(a).split(' ')),count=want.filter(w=>got.has(w)).length,passed=count>=Math.max(1,Math.ceil(want.length*.35));return {level:passed?'pass':count?'almost':'fail',passed,count,total:1,required:1,concepts:[{label:'Core answer idea',met:passed}]}}
function showFeedback(g,q){const cls=g.level==='pass'?'pass':g.level==='almost'?'almost':'fail';$('asaFeedback').className='asa-feedback show '+cls;$('asaFbTitle').textContent=g.level==='pass'?'PASS':g.level==='almost'?'ALMOST THERE':'TRY AGAIN';$('asaFbSummary').textContent=`Recognized ${g.count} of ${g.total} key ideas; ${g.required} required to pass.`;$('asaConcepts').innerHTML=(g.concepts||[]).map(c=>`<div class="concept ${c.met?'ok':'missing'}">${c.met?'✓ Recognized':'✗ Missing'}: ${esc(c.label)}</div>`).join('');$('asaExpected').innerHTML=`<strong>Expected answer:</strong> ${esc(q.idealAnswer)}`}
function logAttempt(q,a,g){if(!logger?.recordAttempt)return;attemptCounts[q.id]=(attemptCounts[q.id]||0)+1;Promise.resolve(logger.recordAttempt({questionNumber:idx+1,attemptNumber:attemptCounts[q.id],section:q.section,bankKey:q.bankKey,bankTitle:q.bankTitle,questionId:q.id,question:q.question,studentResponse:a,expectedAnswer:q.idealAnswer,localLevel:g.level,localPassed:g.passed,recognizedConcepts:(g.concepts||[]).filter(c=>c.met).map(c=>c.label),missingConcepts:(g.concepts||[]).filter(c=>!c.met).map(c=>c.label),graderVersion:grader?.version||'fallback',reviewRecommended:g.reviewRecommended,sourceBank:'Secondary',acsCode:q.acsCode})).catch(()=>{})}
function submit(){const a=$('asaAnswer').value.trim();if(!a)return setStatus('Give an answer before submitting.');if(listening&&recognition)recognition.stop();$('asaSubmit').disabled=true;const q=questions[idx],g=grader?.grade?grader.grade(q,a):fallbackGrade(q,a);pending={q,a,...g};$('asaNext').disabled=false;logAttempt(q,a,g);if(mode==='mixed'){setStatus('Answer recorded. Results will be shown at the end.');return}showFeedback(g,q);if(g.passed)setStatus('Answer passed. Continue when ready.');else{$('asaSubmit').disabled=false;$('asaSubmit').textContent='Resubmit Answer';setStatus(g.level==='almost'?'Add the missing idea and resubmit, or continue when ready.':'Edit or add to your answer and try again, or continue when ready.')}}
function next(){if(!pending)return;answers.push(pending);pending=null;if(idx<questions.length-1){idx++;load();speak()}else finish()}
function finish(){if($('bar'))$('bar').style.width='100%';const correct=answers.filter(a=>a.passed).length;let pass=false;if(mode==='mixed'){const grouped={};answers.forEach(a=>{grouped[a.q.bankKey]??={title:a.q.bankTitle,total:0,correct:0};grouped[a.q.bankKey].total++;if(a.passed)grouped[a.q.bankKey].correct++});const rows=Object.values(grouped);pass=rows.every(r=>r.correct>=3);$('asaSubjectResults').innerHTML=`<table><thead><tr><th>Subject</th><th>Score</th><th>Result</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(r.title)}</td><td>${r.correct} / ${r.total}</td><td><strong>${r.correct>=3?'PASS':'FAIL'}</strong></td></tr>`).join('')}</tbody></table>`;$('asaResultSummary').textContent=pass?'Every subject met the required 3 of 4.':'One or more subjects scored below 3 of 4.'}else{pass=correct===answers.length;$('asaSubjectResults').innerHTML='';$('asaResultSummary').textContent=`You answered ${correct} of ${answers.length} correctly.`}$('asaBanner').className='banner '+(pass?'pass':'fail');$('asaResultTitle').textContent=pass?'PASS':'REVIEW RECOMMENDED';const missed=answers.filter(a=>!a.passed);$('asaReviews').innerHTML=missed.length?missed.map(a=>`<div class="review"><strong>${esc(a.q.bankTitle)} • <span class="asa-code-inline">${esc(a.q.acsCode)}</span></strong><p><b>Question:</b> ${esc(a.q.question)}</p><p><b>Your answer:</b> ${esc(a.a)}</p><p><b>Expected:</b> ${esc(a.q.idealAnswer)}</p></div>`).join(''):'<p>No missed questions.</p>';if($('headStat'))$('headStat').textContent=`${correct} / ${answers.length}`;show('asaResultsScreen')}
function repeat(){if(!last)return home();if(last.kind==='code'){const input=$('asaHomeCode');if(input)input.value=last.value;codeStudy(last.value,'asaHomeCodeMsg')}else if(last.kind==='mixed'){renderBanks(last.section);startMixed()}else{selectedSection=last.section;selectedBank=asaBanks.find(b=>b.key===last.bankKey);startSingle(last.mode)}}

$('asaHomeCodeGo').onclick=()=>codeStudy($('asaHomeCode').value,'asaHomeCodeMsg');$('asaHomeCode').addEventListener('keydown',e=>{if(e.key==='Enter')codeStudy(e.currentTarget.value,'asaHomeCodeMsg')});
$('asaBankCodeGo').onclick=()=>codeStudy($('asaBankCode').value,'asaBankCodeMsg');$('asaBankCode').addEventListener('keydown',e=>{if(e.key==='Enter')codeStudy(e.currentTarget.value,'asaBankCodeMsg')});
$('asaBackHome').onclick=home;$('asaBackBanks').onclick=()=>renderBanks(selectedSection);$('asaSpeak').onclick=speak;$('asaListen').onclick=()=>{if(!recognition)return setStatus('Speech recognition is unavailable. Type your answer.');finalText=$('asaAnswer').value?$('asaAnswer').value+' ':'';recognition.start()};$('asaStop').onclick=()=>recognition&&recognition.stop();$('asaSubmit').onclick=submit;$('asaClear').onclick=()=>{$('asaAnswer').value='';finalText=''};$('asaNext').onclick=next;$('asaExit').onclick=home;$('asaResultsHome').onclick=home;$('asaAgain').onclick=repeat;
renderHomeCards();updateHomeCount();
})();
