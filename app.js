/**
 * ====================================================================
 * 📱 Mobile Online Quiz System - Premium Client Engine (app.js)
 * ====================================================================
 */

// 🔌 ระบุ URL ของ Google Apps Script Web App API ที่ได้จากการ Deploy ของคุณ
const API_ENDPOINT = "https://script.google.com/macros/s/AKfycbyZV5g3KM-eM7QMPpCqoRFTrYaNMaay7LKIwblKfSU9VzB1ELb8GoqYje6Pox_o69on/exec";

let appState = {
  isExamStarted: false,
  examId: "",
  user: { firstName: "", lastName: "", department: "" },
  questions: [],      
  currentIndex: 0,     
  userAnswers: {},     
  timerInterval: null, 
  totalDurationSec: 0, 
  timeLimitSec: 30 * 60 
};

const DOM = {
  loginScreen: document.getElementById('loginScreen'),
  quizScreen: document.getElementById('quizScreen'),
  resultScreen: document.getElementById('resultScreen'),
  reviewScreen: document.getElementById('reviewScreen'),
  regForm: document.getElementById('regForm'),
  firstName: document.getElementById('firstName'),
  lastName: document.getElementById('lastName'),
  department: document.getElementById('department'),
  startBtn: document.getElementById('startBtn'),
  quizProgressStr: document.getElementById('quizProgressStr'),
  timerStr: document.getElementById('timerStr'),
  progressBar: document.getElementById('progressBar'),
  questionText: document.getElementById('questionText'),
  choicesContainer: document.getElementById('choicesContainer'),
  nextBtn: document.getElementById('nextBtn'),
  nextBtnText: document.getElementById('nextBtnText'),
  loadingOverlay: document.getElementById('loadingOverlay'),
  loadingText: document.getElementById('loadingText'),
  resDate: document.getElementById('resDate'),
  progressRing: document.getElementById('progressRing'),
  resPercent: document.getElementById('resPercent'),
  resStatusLabel: document.getElementById('resStatusLabel'),
  resName: document.getElementById('resName'),
  resDept: document.getElementById('resDept'),
  resScoreRaw: document.getElementById('resScoreRaw'),
  resDuration: document.getElementById('resDuration'),
  printBtn: document.getElementById('printBtn'),
  pdfBtn: document.getElementById('pdfBtn'),
  reviewBtn: document.getElementById('reviewBtn'),
  restartBtn: document.getElementById('restartBtn'),
  backToResultBtn: document.getElementById('backToResultBtn'),
  reviewListContainer: document.getElementById('reviewListContainer'),
  themeToggle: document.getElementById('themeToggle'),
  themeIcon: document.getElementById('themeIcon')
};

document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  setupValidationListeners();
  setupSecurityListeners();
  setupActionButtons();
  registerServiceWorker();
});

function initTheme() {
  if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
  updateThemeIcon();
}

DOM.themeToggle.addEventListener('click', () => {
  document.documentElement.classList.toggle('dark');
  localStorage.theme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  updateThemeIcon();
});

function updateThemeIcon() {
  const isDark = document.documentElement.classList.contains('dark');
  DOM.themeIcon.innerHTML = isDark 
    ? `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M14.142 14.142A5 5 0 1110.118 7.39a4.5 4.5 0 106.753 6.753z" />`
    : `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />`;
}

function setupValidationListeners() {
  const checkFormValidity = () => {
    const fName = DOM.firstName.value.trim();
    const lName = DOM.lastName.value.trim();
    DOM.startBtn.disabled = !(fName && lName);
  };
  DOM.firstName.addEventListener('input', checkFormValidity);
  DOM.lastName.addEventListener('input', checkFormValidity);
}

async function startExam() {
  showOverlay("CONNECTING TO CLOUD NETWORK...");
  try {
    const response = await fetch(API_ENDPOINT);
    const result = await response.json();
    
    if (!result.success || !result.data || result.data.length === 0) {
      throw new Error(result.message || "No data packets returned from sheet");
    }

    prepareQuizData(result.data);
    hideOverlay();
    
    appState.isExamStarted = true;
    appState.examId = `QUIZ-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`;
    appState.user.firstName = DOM.firstName.value.trim();
    appState.user.lastName = DOM.lastName.value.trim();
    appState.user.department = DOM.department.value.trim() || "-";
    appState.currentIndex = 0;
    appState.userAnswers = {};
    appState.totalDurationSec = 0;
    
    switchScreen(DOM.loginScreen, DOM.quizScreen);
    startTimer();
    renderQuestion();
    
    Swal.fire({
      title: 'ดาวน์โหลดข้อสอบสำเร็จ',
      text: 'ระบบเริ่มจับเวลา 30 นาที ห้ามย่อหรือสลับแอปพลิเคชัน',
      icon: 'success',
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3000
    });
  } catch (error) {
    hideOverlay();
    Swal.fire({
      title: 'ดาวน์โหลดล้มเหลว',
      text: `${error.message}`,
      icon: 'error',
      confirmButtonText: 'ตกลง'
    });
  }
}

function prepareQuizData(rawQuestions) {
  let shuffled = [...rawQuestions];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  appState.questions = shuffled.map(item => {
    let choicesWithIndex = item.c.map((choice, idx) => ({ text: choice, originalIdx: idx }));
    for (let i = choicesWithIndex.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [choicesWithIndex[i], choicesWithIndex[j]] = [choicesWithIndex[j], choicesWithIndex[i]];
    }
    return { q: item.q, choices: choicesWithIndex, originalCorrectIdx: item.a };
  });
}

function renderQuestion() {
  const currentQ = appState.questions[appState.currentIndex];
  const total = appState.questions.length;
  
  DOM.quizProgressStr.innerText = `TRACK: ${String(appState.currentIndex + 1).padStart(2, '0')}/${String(total).padStart(2, '0')}`;
  DOM.progressBar.style.width = `${((appState.currentIndex + 1) / total) * 100}%`;
  DOM.questionText.innerText = currentQ.q;
  DOM.choicesContainer.innerHTML = "";
  
  currentQ.choices.forEach((choice, index) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = "w-full min-h-[52px] text-left px-4 py-3 rounded-xl border border-slate-800 bg-slate-950/40 hover:bg-slate-900/40 transition-all text-sm font-medium flex items-center justify-between active:scale-[0.99] touch-manipulation text-slate-300";
    btn.innerHTML = `<span>${choice.text}</span><div class="w-4 h-4 rounded-full border border-slate-700 flex items-center justify-center flex-shrink-0 ml-2 transition-all"></div>`;
    
    if (appState.userAnswers[appState.currentIndex] === index) {
      btn.classList.add('choice-active-neon');
      btn.querySelector('div').classList.replace('border-slate-700', 'border-cyan-400');
      btn.querySelector('div').innerHTML = `<div class="w-1.5 h-1.5 rounded-full bg-cyan-400"></div>`;
    }
    
    btn.onclick = () => selectChoice(index);
    DOM.choicesContainer.appendChild(btn);
  });

  if (appState.currentIndex === total - 1) {
    DOM.nextBtnText.innerText = "ส่งข้อสอบเสร็จสิ้น";
    DOM.nextBtn.className = "w-full min-h-[50px] bg-gradient-to-r from-cyan-400 to-indigo-500 text-slate-950 rounded-xl font-black shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-2 text-base touch-manipulation";
  } else {
    DOM.nextBtnText.innerText = "ข้อถัดไป";
    DOM.nextBtn.className = "w-full min-h-[50px] bg-cyan-500 text-slate-950 rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2 text-base touch-manipulation";
  }
  
  DOM.nextBtn.disabled = (appState.userAnswers[appState.currentIndex] === undefined);
}

function selectChoice(index) {
  appState.userAnswers[appState.currentIndex] = index;
  const buttons = DOM.choicesContainer.querySelectorAll('button');
  buttons.forEach((btn, idx) => {
    const dot = btn.querySelector('div');
    if (idx === index) {
      btn.classList.add('choice-active-neon');
      dot.className = "w-4 h-4 rounded-full border border-cyan-400 flex items-center justify-center flex-shrink-0 ml-2 transition-all";
      dot.innerHTML = `<div class="w-1.5 h-1.5 rounded-full bg-cyan-400"></div>`;
    } else {
      btn.classList.remove('choice-active-neon');
      dot.className = "w-4 h-4 rounded-full border border-slate-700 flex items-center justify-center flex-shrink-0 ml-2 transition-all";
      dot.innerHTML = "";
    }
  });
  DOM.nextBtn.disabled = false;
}

function handleNextStep() {
  if (appState.currentIndex < appState.questions.length - 1) {
    appState.currentIndex++;
    renderQuestion();
  } else {
    evaluateAndSubmitExam();
  }
}

function startTimer() {
  clearInterval(appState.timerInterval);
  appState.timerInterval = setInterval(() => {
    appState.totalDurationSec++;
    const timeLeft = appState.timeLimitSec - appState.totalDurationSec;
    if (timeLeft <= 0) {
      clearInterval(appState.timerInterval);
      DOM.timerStr.innerText = "00:00";
      evaluateAndSubmitExam(true);
    } else {
      const mins = Math.floor(timeLeft / 60).toString().padStart(2, '0');
      const secs = (timeLeft % 60).toString().padStart(2, '0');
      DOM.timerStr.innerText = `${mins}:${secs}`;
    }
  }, 1000);
}

function getFormattedDuration() {
  const m = Math.floor(appState.totalDurationSec / 60);
  const s = appState.totalDurationSec % 60;
  return `${m} นาที ${s} วินาที`;
}

async function evaluateAndSubmitExam(isTimeout = false) {
  clearInterval(appState.timerInterval);
  appState.isExamStarted = false; 
  if (isTimeout) {
    await Swal.fire({ title: 'หมดเวลาสอบ!', text: 'ระบบกำลังดำเนินการส่งข้อสอบให้อัตโนมัติ', icon: 'warning' });
  }

  showOverlay("TRANSMITTING RESULTS...");
  let correctCount = 0;
  appState.questions.forEach((q, idx) => {
    const selectedChoiceObj = q.choices[appState.userAnswers[idx]];
    if (selectedChoiceObj && selectedChoiceObj.originalIdx === q.originalCorrectIdx) {
      correctCount++;
    }
  });

  const totalQuestions = appState.questions.length;
  const wrongCount = totalQuestions - correctCount;
  const percentage = Math.round((correctCount / totalQuestions) * 100);
  const passStatus = percentage >= 80 ? "ผ่าน" : "ไม่ผ่าน";
  const deviceInfo = parseUserAgent();

  const payload = {
    firstName: appState.user.firstName,
    lastName: appState.user.lastName,
    department: appState.user.department,
    score: correctCount,
    correct: correctCount,
    wrong: wrongCount,
    percentage: percentage,
    status: passStatus,
    duration: getFormattedDuration(),
    device: deviceInfo.device,
    browser: deviceInfo.browser,
    userAgent: navigator.userAgent,
    examId: appState.examId
  };

  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    hideOverlay();
    if (result.success) { showSummaryScreen(payload); } 
    else { throw new Error(result.message); }
  } catch (error) {
    hideOverlay();
    Swal.fire({
      title: 'คลาวด์ขัดข้อง',
      text: `บันทึกไม่สำเร็จ (${error.message}) แต่แสดงคะแนนบนเครื่องให้ผู้สอบ`,
      icon: 'error'
    });
    showSummaryScreen(payload);
  }
}

function showSummaryScreen(data) {
  switchScreen(DOM.quizScreen, DOM.resultScreen);
  DOM.resDate.innerText = `TIMESTAMP: ${new Date().toLocaleString('th-TH')}`;
  DOM.resName.innerText = `${data.firstName} ${data.lastName}`;
  DOM.resDept.innerText = `แผนก: ${data.department}`;
  DOM.resScoreRaw.innerText = `ถูก ${data.correct} / ผิด ${data.wrong} ข้อ`;
  DOM.resDuration.innerText = `เวลา: ${data.duration}`;
  DOM.resPercent.innerText = `${data.percentage}%`;
  DOM.resStatusLabel.innerText = data.status;
  
  if (data.status === "ผ่าน") {
    DOM.resStatusLabel.className = "text-[10px] font-bold font-digital uppercase mt-1.5 tracking-widest px-3 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/40";
    triggerConfetti();
  } else {
    DOM.resStatusLabel.className = "text-[10px] font-bold font-digital uppercase mt-1.5 tracking-widest px-3 py-0.5 rounded bg-rose-950 text-rose-400 border border-rose-800/40";
  }

  const radius = DOM.progressRing.r.baseVal.value;
  const circumference = 2 * Math.PI * radius;
  DOM.progressRing.style.strokeDasharray = `${circumference}`;
  const offset = circumference - (data.percentage / 100) * circumference;
  setTimeout(() => { DOM.progressRing.style.strokeDashoffset = offset; }, 150);
}

function setupSecurityListeners() {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && appState.isExamStarted) {
      terminateExamByViolation();
    }
  });
  window.addEventListener('beforeunload', (e) => {
    if (appState.isExamStarted) { e.preventDefault(); e.returnValue = 'คำเตือน ข้อมูลจะสูญหาย'; }
  });
}

function terminateExamByViolation() {
  clearInterval(appState.timerInterval);
  appState.isExamStarted = false;
  appState.userAnswers = {};
  appState.currentIndex = 0;
  DOM.regForm.reset();
  DOM.startBtn.disabled = true;

  DOM.quizScreen.classList.add('hidden');
  DOM.resultScreen.classList.add('hidden');
  DOM.reviewScreen.classList.add('hidden');
  DOM.loginScreen.classList.remove('hidden');

  Swal.fire({
    title: 'SECURITY BREACH!',
    text: 'ตรวจพบการออกจากหน้าจอ ระบบได้ยกเลิกการสอบและล้างข้อมูลทั้งหมดทันทีเพื่อป้องกันการทุจริต',
    icon: 'error',
    confirmButtonText: 'รับทราบ',
    allowOutsideClick: false
  });
}

function showReviewScreen() {
  switchScreen(DOM.resultScreen, DOM.reviewScreen);
  DOM.reviewListContainer.innerHTML = "";
  
  appState.questions.forEach((q, idx) => {
    const itemDiv = document.createElement('div');
    itemDiv.className = "p-4 rounded-2xl bg-slate-950/80 border border-slate-900 text-sm";
    const chosenIdx = appState.userAnswers[idx];
    const isCorrect = chosenIdx !== undefined && q.choices[chosenIdx].originalIdx === q.originalCorrectIdx;
    
    let html = `<p class="font-bold text-white mb-2">${idx + 1}. ${q.q}</p><div class="space-y-2">`;
    q.choices.forEach((choice) => {
      let badge = "";
      let txtStyle = "text-slate-400";
      
      if (choice.originalIdx === q.originalCorrectIdx) {
        badge = " 🟢 [คำตอบที่ถูกต้อง]";
        txtStyle = "text-cyan-400 font-semibold";
      }
      if (chosenIdx !== undefined && choice.originalIdx === q.choices[chosenIdx].originalIdx && !isCorrect) {
        badge = " 🔴 [คุณเลือกข้อนี้]";
        txtStyle = "text-rose-400 font-semibold";
      } else if (chosenIdx !== undefined && choice.originalIdx === q.choices[chosenIdx].originalIdx && isCorrect) {
        badge = " 🎯 [คุณตอบถูก]";
      }
      html += `<div class="${txtStyle} pl-2 text-xs leading-relaxed">— ${choice.text}${badge}</div>`;
    });
    html += `</div>`;
    itemDiv.innerHTML = html;
    DOM.reviewListContainer.appendChild(itemDiv);
  });
}

function setupActionButtons() {
  DOM.startBtn.onclick = startExam;
  DOM.nextBtn.onclick = handleNextStep;
  DOM.reviewBtn.onclick = showReviewScreen;
  DOM.backToResultBtn.onclick = () => switchScreen(DOM.reviewScreen, DOM.resultScreen);
  DOM.restartBtn.onclick = () => { DOM.regForm.reset(); DOM.startBtn.disabled = true; switchScreen(DOM.resultScreen, DOM.loginScreen); };
  DOM.printBtn.onclick = () => window.print();

  DOM.pdfBtn.onclick = () => {
    const element = document.getElementById('pdfExportArea');
    const opt = {
      margin: 10, filename: `Report-${appState.examId}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
  };
}

function switchScreen(from, to) { from.classList.add('hidden'); to.classList.remove('hidden'); }
function showOverlay(txt) { DOM.loadingText.innerText = txt; DOM.loadingOverlay.classList.remove('hidden'); }
function hideOverlay() { DOM.loadingOverlay.classList.add('hidden'); }
function triggerConfetti() { confetti({ particleCount: 140, spread: 80, origin: { y: 0.6 } }); }

function parseUserAgent() {
  const ua = navigator.userAgent;
  let device = "Desktop", browser = "Unknown";
  if (/Android/i.test(ua)) device = "Android";
  else if (/iPhone|iPad|iPod/i.test(ua)) device = "iOS Device";
  if (/Chrome/i.test(ua)) browser = "Chrome";
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = "Safari";
  return { device, browser };
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(err => console.log(err));
  }
}