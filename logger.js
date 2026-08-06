(function(global){
'use strict';

const CONFIG=global.ORAL_LOG_CONFIG||{};
const QUEUE_KEY='faaOralPendingAnswerLogsV3';
const SESSION_KEY='faaOralAnonymousSessionV1';
const MAX_QUEUED_PACKETS=100;
const LOGGER_VERSION='2.1-send-each-answer';
let current=null;
let flushPromise=null;

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
function endpoint(){return String(CONFIG.endpoint||'').trim()}
function enabled(){return !!(CONFIG.enabled&&endpoint())}
function notice(){return CONFIG.showNotice===false?'':String(CONFIG.notice||'')}
function pendingCount(){return readJSON(QUEUE_KEY,[]).length}
function diagnostics(){
  return {
    loggerVersion:LOGGER_VERSION,
    mode:'send-each-answer',
    enabled:enabled(),
    endpointConfigured:!!endpoint(),
    endpointEndsInExec:/\/exec(?:\?|$)/.test(endpoint()),
    pending:pendingCount()
  };
}

function startQuiz(meta){
  current={
    schemaVersion:3,
    projectName:CONFIG.projectName||'FAA Oral Examination Practice',
    appVersion:CONFIG.appVersion||'5.3',
    loggerVersion:LOGGER_VERSION,
    sessionId:sessionId(),
    quizId:id('quiz'),
    startedAt:now(),
    quiz:{...meta},
    attemptCount:0
  };
  return current.quizId;
}

function makeAttempt(data){
  return {
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
  };
}

function enqueue(packet){
  const queue=readJSON(QUEUE_KEY,[]);
  queue.push(packet);
  while(queue.length>MAX_QUEUED_PACKETS)queue.shift();
  writeJSON(QUEUE_KEY,queue);
}

function jsonp(params,timeoutMs=10000){
  return new Promise((resolve,reject)=>{
    if(!endpoint())return reject(new Error('Logger endpoint is blank.'));
    const callback='__faaOralLogger_'+id('cb').replace(/-/g,'_');
    const url=new URL(endpoint());
    Object.entries(params||{}).forEach(([key,value])=>url.searchParams.set(key,String(value)));
    url.searchParams.set('callback',callback);
    url.searchParams.set('_',Date.now().toString());
    const script=document.createElement('script');
    let settled=false;
    const cleanup=()=>{
      if(settled)return;
      settled=true;
      clearTimeout(timer);
      try{delete global[callback]}catch(_){global[callback]=undefined}
      if(script.parentNode)script.parentNode.removeChild(script);
    };
    const timer=setTimeout(()=>{cleanup();reject(new Error('Logger confirmation timed out.'))},timeoutMs);
    global[callback]=data=>{cleanup();resolve(data||{})};
    script.onerror=()=>{cleanup();reject(new Error('Could not reach the Apps Script web app.'))};
    script.src=url.toString();
    document.head.appendChild(script);
  });
}

async function postWithFetch(packet){
  await fetch(endpoint(),{
    method:'POST',
    mode:'no-cors',
    cache:'no-store',
    redirect:'follow',
    headers:{'Content-Type':'text/plain;charset=UTF-8'},
    body:JSON.stringify(packet)
  });
}
function postWithForm(packet){
  return new Promise((resolve,reject)=>{
    const frameName='faaOralLogFrame_'+id('frame').replace(/-/g,'_');
    const iframe=document.createElement('iframe');
    iframe.name=frameName;
    iframe.style.display='none';
    iframe.setAttribute('aria-hidden','true');
    const form=document.createElement('form');
    form.method='POST';
    form.action=endpoint();
    form.target=frameName;
    form.style.display='none';
    const input=document.createElement('input');
    input.type='hidden';
    input.name='payload';
    input.value=JSON.stringify(packet);
    form.appendChild(input);
    document.body.appendChild(iframe);
    document.body.appendChild(form);
    try{form.submit();resolve()}catch(error){reject(error)}
    setTimeout(()=>{if(form.parentNode)form.remove();if(iframe.parentNode)iframe.remove()},15000);
  });
}
async function confirmDelivery(deliveryId){
  const deadline=Date.now()+22000;
  let last={status:'pending'};
  while(Date.now()<deadline){
    last=await jsonp({action:'status',deliveryId},9000);
    if(last.status==='saved')return last;
    if(last.status==='error')throw new Error(last.error||'Apps Script rejected the answer.');
    await new Promise(resolve=>setTimeout(resolve,1400));
  }
  throw new Error('The answer was sent, but Google did not confirm that it was saved.');
}
async function sendPacket(packet){
  if(!enabled())return {ok:false,disabled:true};
  let transportError=null;
  try{await postWithFetch(packet)}catch(error){transportError=error}
  if(transportError)await postWithForm(packet);
  const receipt=await confirmDelivery(packet.deliveryId);
  return {ok:true,receipt};
}

async function doFlushPending(){
  if(!enabled())return {sent:0,pending:pendingCount(),disabled:true};
  const queue=readJSON(QUEUE_KEY,[]);
  let sent=0;
  let lastError='';
  while(queue.length){
    try{
      await sendPacket(queue[0]);
      queue.shift();
      sent++;
      writeJSON(QUEUE_KEY,queue);
    }catch(error){
      lastError=String(error&&error.message?error.message:error);
      break;
    }
  }
  return {sent,pending:queue.length,disabled:false,error:lastError};
}
function flushPending(){
  if(flushPromise)return flushPromise;
  flushPromise=doFlushPending().finally(()=>{flushPromise=null});
  return flushPromise;
}

async function recordAttempt(data){
  if(!current)return {ok:false,reason:'no-active-quiz',message:'No active quiz was found.'};
  const attempt=makeAttempt(data||{});
  current.attemptCount++;
  const packet={
    schemaVersion:3,
    deliveryId:id('delivery'),
    projectName:current.projectName,
    appVersion:current.appVersion,
    loggerVersion:LOGGER_VERSION,
    sessionId:current.sessionId,
    quizId:current.quizId,
    startedAt:current.startedAt,
    completedAt:now(),
    quiz:{...current.quiz},
    summary:{},
    attempts:[attempt]
  };
  if(!enabled())return {ok:false,disabled:true,attemptNumber:attempt.attemptNumber};
  enqueue(packet);
  const result=await flushPending();
  return {
    ok:result.pending===0,
    sent:result.sent,
    pending:result.pending,
    error:result.error||'',
    deliveryId:packet.deliveryId,
    questionId:attempt.questionId,
    attemptNumber:attempt.attemptNumber
  };
}

async function finishQuiz(summary){
  if(!current)return {ok:false,reason:'no-active-quiz'};
  const attempts=current.attemptCount;
  current=null;
  const result=await flushPending();
  return {
    ok:result.pending===0,
    perAnswer:true,
    attempts,
    sent:result.sent,
    pending:result.pending,
    error:result.error||'',
    summary:{...summary}
  };
}

async function testConnection(){
  if(!CONFIG.enabled)return {ok:false,status:'disabled',message:'Logging is disabled in logger-config.js.'};
  if(!endpoint())return {ok:false,status:'missing-endpoint',message:'The Apps Script /exec URL is blank.'};
  if(!/\/exec(?:\?|$)/.test(endpoint()))return {ok:false,status:'bad-endpoint',message:'The endpoint must be the deployed /exec URL.'};
  try{
    const result=await jsonp({action:'ping'},12000);
    if(result&&result.ok&&result.status==='ready')return result;
    return {ok:false,status:result.status||'error',message:result.error||'Apps Script responded, but the logger is not ready.'};
  }catch(error){return {ok:false,status:'unreachable',message:String(error&&error.message?error.message:error)}}
}
function abandonQuiz(){current=null}

setTimeout(()=>{flushPending().catch(()=>{})},1500);

global.ORAL_LOGGER={
  enabled,notice,startQuiz,recordAttempt,finishQuiz,flushPending,abandonQuiz,
  pendingCount,sessionId,testConnection,diagnostics,version:LOGGER_VERSION
};
})(window);
