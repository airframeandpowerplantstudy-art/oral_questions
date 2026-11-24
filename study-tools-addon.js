/* Oral Study Tools add-on: flashcards + single-letter submission guard. */
(()=>{
'use strict';
if(window.__ORAL_STUDY_TOOLS_LOADED__)return;
window.__ORAL_STUDY_TOOLS_LOADED__=true;
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};

const style=document.createElement('style');
style.textContent=`
.flashcard-mode-card{border-color:#5eead4!important;background:linear-gradient(145deg,#f0fdfa,#fff)!important}
.flashcard-mode-card:hover,.flashcard-mode-card:focus{border-color:#0f766e!important;background:#ccfbf1!important}
.flashcard-wrap{max-width:820px;margin:0 auto}
.flashcard-shell{border:2px solid var(--line,#dbe3ec);border-radius:18px;background:#f8fafc;padding:22px;min-height:300px;display:flex;flex-direction:column;justify-content:center}
.flashcard-source{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:12px}
.flashcard-pill{display:inline-block;padding:5px 9px;border-radius:999px;background:#ccfbf1;color:#115e59;font-size:.78rem;font-weight:800}
.flashcard-question{font-size:clamp(1.35rem,3vw,2rem);line-height:1.3;color:var(--navy,#14213d);margin:5px 0 15px}
.flashcard-answer{margin-top:15px;padding:16px;border-radius:12px;background:#fff;border-left:5px solid #0f766e;font-size:1.08rem;line-height:1.5}
.flashcard-answer[hidden]{display:none}
.flashcard-hint{color:var(--muted,#64748b);font-size:.88rem;margin-top:12px}
.flashcard-progress{color:var(--muted,#64748b);font-weight:700}
.flashcard-controls{display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin:16px 0}
.flashcard-controls .btn{min-width:120px}
@media(max-width:600px){.flashcard-controls{display:grid}.flashcard-controls .btn{width:100%}}
`;
document.head.appendChild(style);

const main=document.querySelector('main');
if(!main)return;
main.insertAdjacentHTML('beforeend',`
<section id="flashcardsScreen" class="screen">
 <div class="flashcard-wrap">
  <div class="row"><button class="btn secondary" id="fcBack">← Back to Study Options</button></div>
  <div class="meta"><span id="fcProgress" class="flashcard-progress"></span><span id="fcSubject"></span></div>
  <div class="flashcard-shell" id="fcCard" tabindex="0" aria-live="polite">
   <div class="flashcard-source"><span class="flashcard-pill" id="fcSource"></span><span class="flashcard-pill" id="fcExtra" style="display:none"></span></div>
   <div class="label">Question</div>
   <div class="flashcard-question" id="fcQuestion"></div>
   <div class="flashcard-answer" id="fcAnswer" hidden><strong>Answer:</strong> <span id="fcAnswerText"></span></div>
   <div class="flashcard-hint">No grading and no answer logging in Flashcards mode.</div>
  </div>
  <div class="flashcard-controls">
   <button class="btn secondary" id="fcPrev">← Previous</button>
   <button class="btn success" id="fcReveal">Show Answer</button>
   <button class="btn primary" id="fcNext">Next →</button>
  </div>
  <div class="flashcard-controls">
   <button class="btn secondary" id="fcRead">🔊 Read Question</button>
   <button class="btn secondary" id="fcShuffle">🔀 Shuffle</button>
  </div>
 </div>
</section>`);

const sourceConfig={
 jepp:{label:'Jeppesen',titleId:'modeTitle',grid:()=>document.querySelector('#modes .grid'),screen:'modes',banks:()=>window.ORAL_BANKS||[],filter:q=>true,className:''},
 secondary:{label:'Secondary',titleId:'asaModeTitle',grid:()=>$('asaModeGrid'),screen:'asaModesScreen',banks:()=>window.ASA_ORAL_BANKS||[],filter:q=>q.category!=='Risk Management',className:'asa-card'},
 tenic:{label:'10IC',titleId:'bakerModeTitle',grid:()=>$('bakerModeGrid'),screen:'bakerModesScreen',banks:()=>window.BAKER_ORAL_BANKS||[],filter:q=>true,className:'baker-card'}
};
let state={kind:null,bank:null,questions:[],idx:0,returnScreen:null,revealed:false};

function showScreen(id){document.querySelectorAll('main .screen').forEach(s=>s.classList.remove('active'));$(id)?.classList.add('active');window.scrollTo({top:0,behavior:'smooth'})}
function findSelectedBank(kind){const cfg=sourceConfig[kind],title=$(cfg.titleId)?.textContent.trim();if(!title)return null;const banks=cfg.banks();return banks.find(b=>String(b.title).trim()===title)||banks.find(b=>String(b.title).trim().toLowerCase()===title.toLowerCase())||null}
function openFlashcards(kind){
 const cfg=sourceConfig[kind],bank=findSelectedBank(kind);if(!bank)return;
 let qs=(bank.questions||[]).filter(cfg.filter);
 if(!qs.length)return;
 state={kind,bank,questions:[...qs],idx:0,returnScreen:cfg.screen,revealed:false};
 showScreen('flashcardsScreen');renderCard();
}
function renderCard(){
 const q=state.questions[state.idx];if(!q)return;
 $('fcSource').textContent=sourceConfig[state.kind].label;
 $('fcSubject').textContent=state.bank.title;
 $('fcProgress').textContent=`Card ${state.idx+1} of ${state.questions.length}`;
 $('fcQuestion').textContent=q.question||'';
 $('fcAnswerText').textContent=q.idealAnswer||q.answer||'';
 $('fcAnswer').hidden=true;state.revealed=false;$('fcReveal').textContent='Show Answer';
 const extra=[];if(q.acsCode)extra.push(q.acsCode);if(q.category)extra.push(q.category);
 $('fcExtra').textContent=extra.join(' • ');$('fcExtra').style.display=extra.length?'inline-block':'none';
 $('fcPrev').disabled=state.idx===0;$('fcNext').disabled=state.idx>=state.questions.length-1;
 if($('headSub'))$('headSub').textContent=`${sourceConfig[state.kind].label} flashcards • ${state.bank.title}`;
 if($('headStat'))$('headStat').textContent=`${state.idx+1} / ${state.questions.length}`;
 if($('bar'))$('bar').style.width=`${state.questions.length?((state.idx+1)/state.questions.length*100):0}%`;
 $('fcCard').focus({preventScroll:true});
}
function toggleAnswer(){state.revealed=!state.revealed;$('fcAnswer').hidden=!state.revealed;$('fcReveal').textContent=state.revealed?'Hide Answer':'Show Answer'}
function nextCard(){if(state.idx<state.questions.length-1){state.idx++;renderCard()}}
function prevCard(){if(state.idx>0){state.idx--;renderCard()}}
function back(){speechSynthesis.cancel();showScreen(state.returnScreen||'sections');if($('headSub'))$('headSub').textContent='Choose a study mode';if($('bar'))$('bar').style.width='0%'}
function readQuestion(){const q=state.questions[state.idx];if(!q||!('speechSynthesis'in window))return;speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(q.question||'');u.rate=.9;speechSynthesis.speak(u)}
function shuffleDeck(){state.questions=shuffle(state.questions);state.idx=0;renderCard()}

$('fcReveal').onclick=toggleAnswer;$('fcNext').onclick=nextCard;$('fcPrev').onclick=prevCard;$('fcBack').onclick=back;$('fcRead').onclick=readQuestion;$('fcShuffle').onclick=shuffleDeck;
$('fcCard').onclick=e=>{if(e.target.closest('button'))return;toggleAnswer()};
document.addEventListener('keydown',e=>{if(!$('flashcardsScreen')?.classList.contains('active'))return;if(['TEXTAREA','INPUT'].includes(document.activeElement?.tagName))return;if(e.key===' '){e.preventDefault();toggleAnswer()}else if(e.key==='ArrowRight'){e.preventDefault();nextCard()}else if(e.key==='ArrowLeft'){e.preventDefault();prevCard()}});

function addModeButton(kind){const cfg=sourceConfig[kind],grid=cfg.grid(),title=$(cfg.titleId)?.textContent.trim();if(!grid||!title||grid.querySelector(`[data-flashcards-source="${kind}"]`))return;const btn=document.createElement('button');btn.className=`cardbtn flashcard-mode-card ${cfg.className}`.trim();btn.dataset.flashcardsSource=kind;btn.innerHTML=`<strong>Flashcards</strong><span>Flip through every oral question and expected answer • no grading</span>`;btn.onclick=()=>openFlashcards(kind);grid.appendChild(btn)}
function ensureButtons(){addModeButton('jepp');addModeButton('secondary');addModeButton('tenic')}
ensureButtons();
document.addEventListener('click',()=>setTimeout(ensureButtons,0));

// Keep one-letter guessing out of the answer log. Valid short answers such as AD, IA, No, 12, etc. still work.
const submitGuard={
 submit:{answer:'answer',status:'statusText'},
 asaSubmit:{answer:'asaAnswer',status:'asaStatusText'},
 bakerSubmit:{answer:'bakerAnswer',status:'bakerStatusText'}
};
document.addEventListener('click',e=>{
 const btn=e.target.closest('button');if(!btn||!submitGuard[btn.id])return;
 const cfg=submitGuard[btn.id],value=$(cfg.answer)?.value.trim()||'';
 if(!/^[A-Za-z]$/.test(value))return;
 e.preventDefault();e.stopImmediatePropagation();
 const s=$(cfg.status);if(s)s.textContent='Please give a complete oral answer. Single-letter responses are not submitted.';
 const box=$(cfg.answer);if(box){box.focus();box.select()}
},true);
})();
