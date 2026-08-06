(function(global){
'use strict';

const CONFIG = global.ORAL_LOG_CONFIG || {};
const SESSION_KEY = 'faaOralAnonymousSessionV1';
const LOGGER_VERSION = '2.2-form-post-corb-fix';
let current = null;

function id(prefix){
  const bytes = new Uint8Array(8);
  if (global.crypto && global.crypto.getRandomValues) {
    global.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return prefix + '-' + Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

function now(){ return new Date().toISOString(); }

function sessionId(){
  let value = '';
  try { value = localStorage.getItem(SESSION_KEY) || ''; } catch (_) {}
  if (!value) {
    value = id('session');
    try { localStorage.setItem(SESSION_KEY, value); } catch (_) {}
  }
  return value;
}

function endpoint(){ return String(CONFIG.endpoint || '').trim(); }
function enabled(){ return Boolean(CONFIG.enabled && endpoint()); }
function notice(){ return CONFIG.showNotice === false ? '' : String(CONFIG.notice || ''); }
function pendingCount(){ return 0; }

function diagnostics(){
  return {
    loggerVersion: LOGGER_VERSION,
    transport: 'hidden-form-post',
    enabled: enabled(),
    endpointConfigured: Boolean(endpoint()),
    endpointEndsInExec: /\/exec(?:\?|$)/.test(endpoint())
  };
}

function startQuiz(meta){
  current = {
    schemaVersion: 3,
    projectName: CONFIG.projectName || 'FAA Oral Examination Practice',
    appVersion: CONFIG.appVersion || '5.4',
    loggerVersion: LOGGER_VERSION,
    sessionId: sessionId(),
    quizId: id('quiz'),
    startedAt: now(),
    quiz: { ...(meta || {}) },
    attemptCount: 0
  };
  return current.quizId;
}

function makeAttempt(data){
  return {
    attemptId: id('attempt'),
    submittedAt: now(),
    questionNumber: data.questionNumber,
    attemptNumber: data.attemptNumber,
    section: data.section || '',
    bankKey: data.bankKey || '',
    bankTitle: data.bankTitle || '',
    questionId: data.questionId || '',
    question: data.question || '',
    studentResponse: data.studentResponse || '',
    expectedAnswer: data.expectedAnswer || '',
    localLevel: data.localLevel || '',
    localPassed: Boolean(data.localPassed),
    recognizedConcepts: data.recognizedConcepts || [],
    missingConcepts: data.missingConcepts || [],
    graderVersion: data.graderVersion || '',
    reviewRecommended: Boolean(data.reviewRecommended)
  };
}

/*
  Cross-origin form submission is intentionally used instead of fetch().
  Apps Script ContentService redirects responses to script.googleusercontent.com.
  Chrome may block JavaScript from reading that redirected response (CORB/ORB),
  even though a normal form navigation is allowed. The response is loaded into
  a hidden iframe and is never read by this page.
*/
function postWithHiddenForm(packet, timeoutMs = 15000){
  return new Promise((resolve, reject) => {
    if (!enabled()) {
      reject(new Error('Logger is disabled or the endpoint is blank.'));
      return;
    }

    const frameName = 'faaOralLogFrame_' + id('frame').replace(/-/g, '_');
    const iframe = document.createElement('iframe');
    const form = document.createElement('form');
    const input = document.createElement('input');
    let submitted = false;
    let settled = false;

    function cleanup(){
      setTimeout(() => {
        if (form.parentNode) form.remove();
        if (iframe.parentNode) iframe.remove();
      }, 1000);
    }

    function finish(error){
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      cleanup();
      if (error) reject(error);
      else resolve({ ok: true, transport: 'hidden-form-post' });
    }

    iframe.name = frameName;
    iframe.style.display = 'none';
    iframe.setAttribute('aria-hidden', 'true');
    iframe.onload = () => {
      if (submitted) finish();
    };

    form.method = 'POST';
    form.action = endpoint();
    form.target = frameName;
    form.style.display = 'none';
    form.acceptCharset = 'UTF-8';

    input.type = 'hidden';
    input.name = 'payload';
    input.value = JSON.stringify(packet);
    form.appendChild(input);

    document.body.appendChild(iframe);
    document.body.appendChild(form);

    const timer = setTimeout(() => {
      finish(new Error('Google did not finish loading the hidden form response.'));
    }, timeoutMs);

    requestAnimationFrame(() => {
      try {
        submitted = true;
        form.submit();
      } catch (error) {
        finish(error);
      }
    });
  });
}

async function recordAttempt(data){
  if (!current) {
    return { ok: false, reason: 'no-active-quiz', message: 'No active quiz was found.' };
  }

  const attempt = makeAttempt(data || {});
  current.attemptCount += 1;

  const packet = {
    schemaVersion: 3,
    deliveryId: id('delivery'),
    projectName: current.projectName,
    appVersion: current.appVersion,
    loggerVersion: LOGGER_VERSION,
    sessionId: current.sessionId,
    quizId: current.quizId,
    startedAt: current.startedAt,
    completedAt: now(),
    quiz: { ...current.quiz },
    summary: {},
    attempts: [attempt]
  };

  if (!enabled()) {
    return { ok: false, disabled: true, attemptNumber: attempt.attemptNumber };
  }

  await postWithHiddenForm(packet);
  return {
    ok: true,
    submitted: true,
    transport: 'hidden-form-post',
    deliveryId: packet.deliveryId,
    questionId: attempt.questionId,
    attemptNumber: attempt.attemptNumber
  };
}

async function finishQuiz(summary){
  if (!current) return { ok: false, reason: 'no-active-quiz' };
  const attempts = current.attemptCount;
  current = null;
  return {
    ok: true,
    perAnswer: true,
    attempts,
    submitted: true,
    summary: { ...(summary || {}) }
  };
}

async function flushPending(){
  return { sent: 0, pending: 0, disabled: !enabled() };
}

async function testConnection(){
  if (!CONFIG.enabled) {
    return { ok: false, status: 'disabled', message: 'Logging is disabled in logger-config.js.' };
  }
  if (!endpoint()) {
    return { ok: false, status: 'missing-endpoint', message: 'The Apps Script /exec URL is blank.' };
  }
  if (!/\/exec(?:\?|$)/.test(endpoint())) {
    return { ok: false, status: 'bad-endpoint', message: 'The endpoint must be the deployed /exec URL.' };
  }
  return {
    ok: true,
    status: 'configured',
    message: 'The endpoint is configured. Submit one answer and check the Oral Answer Log sheet.'
  };
}

function abandonQuiz(){ current = null; }

 global.ORAL_LOGGER = {
  enabled,
  notice,
  startQuiz,
  recordAttempt,
  finishQuiz,
  flushPending,
  abandonQuiz,
  pendingCount,
  sessionId,
  testConnection,
  diagnostics,
  version: LOGGER_VERSION
};
})(window);
