(function(global){
'use strict';

const CONFIG=global.ORAL_LOG_CONFIG||{};
const QUEUE_KEY='faaOralPendingLogsV1';
const SESSION_KEY='faaOralAnonymousSessionV1';
const MAX_QUEUED_PACKETS=8;
let current=null;

function id(prefix){
 const bytes=new Uint8Array(8);
 if(global.crypto&&global.crypto.getRandomValues)global.crypto.getRandomValues(bytes);
 else for(let i=0;i<bytes.length;i++)bytes[i]=Math.floor(Math.random()*256);
 return prefix+'-'+Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
}
function now(){return new Date().toISOString()}
function readJSON(key,fallback){try{return JSON.parse(localStorage.getItem(key)||'null')??fallback}catch(_){return fallback}}
function writeJSON(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true}catch(_){return false}}
function sessionId(){
 let value='';
 try{value=localStorage.getItem(SESSION_KEY)||''}catch(_){}
 if(!value){value=id('session');try{localStorage.setItem(SESSION_KEY,value)}catch(_){}}
 return value;
}
function enabled(){return !!(CONFIG.enabled&&String(CONFIG.endpoint||'').trim())}
function notice(){return CONFIG.showNotice===false?'':String(CONFIG.notice||'')}
function startQuiz(meta){
 current={
  schemaVersion:1,
  projectName:CONFIG.projectName||'FAA Oral Examination Practice',
  appVersion:CONFIG.appVersion||'5.0',
  sessionId:sessionId(),
  quizId:id('quiz'),
  startedAt:now(),
  completedAt:null,
  quiz:{...meta},
  attempts:[]
 };
 return current.quizId;
}
function recordAttempt(data){
 if(!current)return;
 current.attempts.push({
  attemptId:id('attempt'),
  submittedAt:now(),
  questionNumber:data.questionNumber,
  attemptNumber:data.attemptNumber,
  section:data.section||'',
  bankKey:data.bankKey||'',
  bankTitle:data.bankTitle||'',
  questionId:data.questionId||'',
  question:data.question||'',
  studentResponse:data.studentResponse||'',
  expectedAnswer:data.expectedAnswer||'',
  localLevel:data.localLevel||'',
  localPassed:!!data.localPassed,
  recognizedConcepts:data.recognizedConcepts||[],
  missingConcepts:data.missingConcepts||[],
  graderVersion:data.graderVersion||'',
  reviewRecommended:!!data.reviewRecommended
 });
}
function enqueue(packet){
 const queue=readJSON(QUEUE_KEY,[]);
 queue.push(packet);
 while(queue.length>MAX_QUEUED_PACKETS)queue.shift();
 writeJSON(QUEUE_KEY,queue);
}
async function sendPacket(packet){
 if(!enabled())return {ok:false,disabled:true};
 await fetch(String(CONFIG.endpoint).trim(),{
  method:'POST',
  mode:'no-cors',
  cache:'no-store',
  keepalive:true,
  headers:{'Content-Type':'text/plain;charset=UTF-8'},
  body:JSON.stringify(packet)
 });
 // Apps Script web apps do not expose a readable cross-origin response in this setup.
 // A resolved fetch means the browser handed off the request successfully.
 return {ok:true,opaque:true};
}
async function flushPending(){
 if(!enabled())return {sent:0,pending:readJSON(QUEUE_KEY,[]).length,disabled:true};
 const queue=readJSON(QUEUE_KEY,[]);
 let sent=0;
 while(queue.length){
  const packet=queue[0];
  try{
   await sendPacket(packet);
   queue.shift();sent++;
   writeJSON(QUEUE_KEY,queue);
  }catch(_){break}
 }
 return {sent,pending:queue.length,disabled:false};
}
async function finishQuiz(summary){
 if(!current)return {ok:false,reason:'no-active-quiz'};
 current.completedAt=now();
 current.summary={...summary};
 const packet=current;
 current=null;
 if(!enabled())return {ok:false,disabled:true,attempts:packet.attempts.length};
 enqueue(packet);
 const result=await flushPending();
 return {ok:result.pending===0,sent:result.sent,pending:result.pending,attempts:packet.attempts.length};
}
function abandonQuiz(){current=null}
function pendingCount(){return readJSON(QUEUE_KEY,[]).length}

// Retry any previously queued batch after a later page load.
setTimeout(()=>{flushPending().catch(()=>{})},1200);

global.ORAL_LOGGER={enabled,notice,startQuiz,recordAttempt,finishQuiz,flushPending,abandonQuiz,pendingCount,sessionId};
})(window);
