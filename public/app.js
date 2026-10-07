// =========================================================
// Smart Medical Box - Frontend Logic & Web Audio Controller
// =========================================================

// Audio Context for synthesized sound alerts (no external audio files needed)
let audioCtx = null;
let soundEnabled = true;
let buzzerOscillator = null;

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
}

// Sound Synthesizers
function playAlarmBuzzerSound() {
  if (!soundEnabled) return;
  try {
    initAudio();
    stopAlarmBuzzerSound();

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(850, audioCtx.currentTime); // Buzzer pitch
    // Pulse volume
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    buzzerOscillator = osc;
  } catch (e) {
    console.warn("Audio error:", e);
  }
}

function stopAlarmBuzzerSound() {
  if (buzzerOscillator) {
    try {
      buzzerOscillator.stop();
      buzzerOscillator.disconnect();
    } catch(e) {}
    buzzerOscillator = null;
  }
}

function playSuccessChime() {
  if (!soundEnabled) return;
  try {
    initAudio();
    stopAlarmBuzzerSound();
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, now); // C5
    osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.15); // G5

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.5);
  } catch (e) {}
}

function playMissedTone() {
  if (!soundEnabled) return;
  try {
    initAudio();
    stopAlarmBuzzerSound();
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.4);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.45);
  } catch (e) {}
}

// ---------------------------------------------------------
// Global UI Elements
// ---------------------------------------------------------
const sseIndicator = document.getElementById('sse-indicator');
const sseText = document.getElementById('sse-text');
const liveClock = document.getElementById('live-clock');
const liveDate = document.getElementById('live-date');
const soundToggle = document.getElementById('sound-toggle');
const soundIcon = document.getElementById('sound-icon');

// Hardware Twin elements
const ledMorning = document.getElementById('led-morning');
const ledAfternoon = document.getElementById('led-afternoon');
const ledNight = document.getElementById('led-night');
const ledStatus1 = document.getElementById('led-status-1');
const ledStatus2 = document.getElementById('led-status-2');
const ledStatus3 = document.getElementById('led-status-3');

const cardLed1 = document.getElementById('card-led-1');
const cardLed2 = document.getElementById('card-led-2');
const cardLed3 = document.getElementById('card-led-3');

const oledLine1 = document.getElementById('oled-line1');
const oledLine2 = document.getElementById('oled-line2');
const oledLine3 = document.getElementById('oled-line3');
const oledClock = document.getElementById('oled-clock');

const buzzerBadge = document.getElementById('buzzer-badge');
const buzzerIcon = document.getElementById('buzzer-icon');
const buzzerStateText = document.getElementById('buzzer-state-text');

// Alarm Banner
const alarmBanner = document.getElementById('alarm-banner');
const alarmBannerIcon = document.getElementById('alarm-banner-icon');
const alarmBannerTitle = document.getElementById('alarm-banner-title');
const alarmBannerDesc = document.getElementById('alarm-banner-desc');
const alarmTimerBox = document.getElementById('alarm-timer-box');
const alarmCountdown = document.getElementById('alarm-countdown');
const btnPatientTake = document.getElementById('btn-patient-take');
const btnBannerOverride = document.getElementById('btn-banner-override');
const bannerOverrideText = document.getElementById('banner-override-text');
const hardwareBtnPress = document.getElementById('hardware-btn-press');
const telemetryStatusDot = document.getElementById('telemetry-status-dot');
const telemetryStatusText = document.getElementById('telemetry-status-text');

function setTelemetryStatus(state, text) {
  if (!telemetryStatusText || !telemetryStatusDot) return;
  if (state === 'alarm') {
    telemetryStatusDot.className = 'w-2 h-2 rounded-full bg-rose-500 animate-ping';
    telemetryStatusText.className = 'ml-auto text-[10px] px-2 py-0.5 rounded bg-rose-950/80 text-rose-300 font-bold border border-rose-500/40 animate-pulse';
    telemetryStatusText.textContent = text || 'ALARM ACTIVE';
  } else if (state === 'taken') {
    telemetryStatusDot.className = 'w-2 h-2 rounded-full bg-emerald-400';
    telemetryStatusText.className = 'ml-auto text-[10px] px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 font-bold border border-emerald-500/40';
    telemetryStatusText.textContent = text || 'DOSE TAKEN';
  } else if (state === 'missed') {
    telemetryStatusDot.className = 'w-2 h-2 rounded-full bg-amber-400';
    telemetryStatusText.className = 'ml-auto text-[10px] px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 font-bold border border-amber-500/40';
    telemetryStatusText.textContent = text || 'MISSED';
  } else {
    telemetryStatusDot.className = 'w-2 h-2 rounded-full bg-emerald-400 animate-pulse';
    telemetryStatusText.className = 'ml-auto text-[10px] px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 font-bold border border-emerald-500/30';
    telemetryStatusText.textContent = text || 'Monitoring';
  }
}

let lastAlertObject = null;

// Stats
const statTotal = document.getElementById('stat-total');
const statTaken = document.getElementById('stat-taken');
const statMissed = document.getElementById('stat-missed');
const statAdherence = document.getElementById('stat-adherence');
const cardAdherenceBtn = document.getElementById('card-adherence-btn');

// Circular Diagram elements
const adherence3dSection = document.getElementById('adherence-breakdown-card');
const donut3dLayers = document.getElementById('donut-3d-layers');
const chart3dTooltip = document.getElementById('chart-3d-tooltip');
const tipBadge = document.getElementById('tip-badge');
const tipTitle = document.getElementById('tip-title');
const tipCount = document.getElementById('tip-count');
const tipPercent = document.getElementById('tip-percent');
const tipDesc = document.getElementById('tip-desc');
const centerAdherencePct = document.getElementById('center-adherence-pct');
const centerAdherenceLabel = document.getElementById('center-adherence-label');
const stage3d = document.getElementById('stage-3d');

// Legend Breakdown elements
const countTaken = document.getElementById('count-taken');
const pctTaken = document.getElementById('pct-taken');
const barTaken = document.getElementById('bar-taken');

const countMissed = document.getElementById('count-missed');
const pctMissed = document.getElementById('pct-missed');
const barMissed = document.getElementById('bar-missed');

const countManual = document.getElementById('count-manual');
const pctManual = document.getElementById('pct-manual');
const barManual = document.getElementById('bar-manual');

const legendCardTaken = document.getElementById('legend-card-taken');
const legendCardMissed = document.getElementById('legend-card-missed');
const legendCardManual = document.getElementById('legend-card-manual');

// Table & Controls
const historyTableBody = document.getElementById('history-table-body');
const doseRecordCountBadge = document.getElementById('dose-record-count-badge');
const btnResetStats = document.getElementById('btn-reset-stats');

// Real-Time Doses Taken Bar Chart & Donut Elements
const countBarMorning = document.getElementById('count-bar-morning');
const countBarAfternoon = document.getElementById('count-bar-afternoon');
const countBarNight = document.getElementById('count-bar-night');
const chartBarMorning = document.getElementById('chart-bar-morning');
const chartBarAfternoon = document.getElementById('chart-bar-afternoon');
const chartBarNight = document.getElementById('chart-bar-night');
const chartTotalTakenBadge = document.getElementById('chart-total-taken-badge');
const chartYMax = document.getElementById('chart-y-max');
const chartYMid = document.getElementById('chart-y-mid');
const chartYLow = document.getElementById('chart-y-low');
const donutTakenCount = document.getElementById('donut-taken-count');
const donutMissedCount = document.getElementById('donut-missed-count');

let cachedAlertsHistory = [];
let lastBoxStats = null;

// Simulator Buttons
const simDose1 = document.getElementById('sim-dose-1');
const simDose2 = document.getElementById('sim-dose-2');
const simDose3 = document.getElementById('sim-dose-3');
const copyEndpointBtn = document.getElementById('copy-endpoint-btn');
const endpointUrl = document.getElementById('endpoint-url');

// State
let currentAlarmDose = null;
let countdownTimer = null;
let remainingMs = 10000;
let alarmStartTime = 0;

// Setup Endpoint display
endpointUrl.textContent = window.location.origin + '/api/alert';

// Sound Toggle
if (soundToggle) {
  soundToggle.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    if (soundIcon) {
      if (soundEnabled) {
        soundIcon.className = 'fa-solid fa-volume-high text-teal-600';
      } else {
        soundIcon.className = 'fa-solid fa-volume-xmark text-slate-400';
      }
    }
    if (!soundEnabled) {
      stopAlarmBuzzerSound();
    }
  });
}

// Live clock tick (12-hour AM/PM format)
setInterval(() => {
  const now = new Date();
  const time12 = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  if (liveClock) liveClock.textContent = time12;
  if (liveDate) liveDate.textContent = now.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  if (oledClock) oledClock.textContent = time12;

  // Keep OLED center updated with live digital clock when idle (No "SYSTEM READY")
  if (!currentAlarmDose && oledLine1 && oledLine1.textContent === 'SMART MEDIBOX') {
    if (oledLine2) oledLine2.textContent = time12;
    if (oledLine3) oledLine3.textContent = 'Status: Monitoring';
  }
}, 1000);

// ---------------------------------------------------------
// WEB SERIAL API (Direct USB Cable Link to ESP32)
// Works on Chrome, Edge, Brave, Opera (localhost, GitHub, Vercel)
// ---------------------------------------------------------
const btnUsbConnect = document.getElementById('btn-usb-connect');
const btnUsbConnectTwin = document.getElementById('btn-usb-connect-twin');
const btnUsbTwinText = document.getElementById('btn-usb-twin-text');
const usbStatusText = document.getElementById('usb-status-text');
const usbIndicator = document.getElementById('usb-indicator');
const hardwareLinkBadge = document.getElementById('hardware-link-badge');
const hardwareLinkDot = document.getElementById('hardware-link-dot');
const hardwareLinkText = document.getElementById('hardware-link-text');
const usbBanner = document.getElementById('usb-banner');
const usbBannerTitle = document.getElementById('usb-banner-title');
const usbBannerDesc = document.getElementById('usb-banner-desc');

let serialPort = null;
let serialWriter = null;
let serialReader = null;
let isUsbConnected = false;

async function sendSerialCommand(obj) {
  if (!serialWriter || !isUsbConnected) return false;
  try {
    const jsonStr = JSON.stringify(obj) + '\n';
    await serialWriter.write(jsonStr);
    appendLogLine({
      timestamp: new Date().toLocaleTimeString(),
      source: 'USB_TX',
      type: 'INFO',
      message: `Sent to ESP32: ${jsonStr.trim()}`
    });
    return true;
  } catch (err) {
    console.warn('[USB Serial] Failed to send command:', err);
    return false;
  }
}

function updateUsbUI(connected, portDetails = '') {
  isUsbConnected = connected;
  if (connected) {
    if (usbIndicator) usbIndicator.className = 'w-2 h-2 rounded-full bg-emerald-500 animate-pulse';
    if (usbStatusText) usbStatusText.textContent = 'USB Linked';
    if (btnUsbConnect) {
      btnUsbConnect.className = 'px-3.5 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-semibold flex items-center space-x-2 transition cursor-pointer';
      btnUsbConnect.title = 'Click to disconnect ESP32.';
    }
    if (hardwareLinkBadge) {
      hardwareLinkBadge.className = 'px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 font-mono font-bold text-[10px] flex items-center gap-1.5';
    }
    if (hardwareLinkDot) hardwareLinkDot.className = 'w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse';
    if (hardwareLinkText) hardwareLinkText.textContent = portDetails ? `USB: ${portDetails}` : 'USB: 115200 Baud';

    if (usbBanner) {
      usbBanner.className = 'p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between text-xs transition';
    }
    if (usbBannerTitle) usbBannerTitle.textContent = 'Hardware Linked via USB';
    if (usbBannerDesc) usbBannerDesc.textContent = 'Live serial communication active (115200 baud).';
    if (btnUsbTwinText) btnUsbTwinText.textContent = 'Unlink';
  } else {
    if (usbIndicator) usbIndicator.className = 'w-2 h-2 rounded-full bg-slate-400';
    if (usbStatusText) usbStatusText.textContent = 'Connect USB';
    if (btnUsbConnect) {
      btnUsbConnect.className = 'px-3.5 py-1.5 bg-slate-50 hover:bg-teal-50 hover:border-teal-300 text-slate-700 hover:text-teal-700 border border-slate-200 rounded-xl text-xs font-semibold flex items-center space-x-2 transition cursor-pointer';
      btnUsbConnect.title = 'Attach USB cable to ESP32 and click to connect.';
    }
    if (hardwareLinkBadge) {
      hardwareLinkBadge.className = 'px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-mono text-[10px] font-semibold flex items-center gap-1.5';
    }
    if (hardwareLinkDot) hardwareLinkDot.className = 'w-1.5 h-1.5 rounded-full bg-slate-400';
    if (hardwareLinkText) hardwareLinkText.textContent = 'USB: Ready';

    if (usbBanner) {
      usbBanner.className = 'p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between text-xs transition';
    }
    if (usbBannerTitle) usbBannerTitle.textContent = 'Hardware Link';
    if (usbBannerDesc) usbBannerDesc.textContent = 'Connect ESP32 via USB cable for physical control.';
    if (btnUsbTwinText) btnUsbTwinText.textContent = 'Link Cable';
  }
}

async function connectWebSerial() {
  if (!('serial' in navigator)) {
    alert(
      'Web Serial is supported in Google Chrome, Microsoft Edge, Opera, and Brave.\n\n' +
      'To connect directly to your ESP32 using the data transfer cable, please open this webpage in Chrome or Edge!'
    );
    return;
  }

  if (isUsbConnected) {
    await disconnectWebSerial();
    return;
  }

  try {
    serialPort = await navigator.serial.requestPort();
    await serialPort.open({ baudRate: 115200 });

    const encoder = new TextEncoderStream();
    encoder.readable.pipeTo(serialPort.writable);
    serialWriter = encoder.writable.getWriter();

    updateUsbUI(true, 'Connected @ 115200');

    appendLogLine({
      timestamp: new Date().toLocaleTimeString(),
      source: 'USB',
      type: 'INFO',
      message: 'ESP32 USB Serial Port opened successfully at 115200 baud.'
    });

    readSerialStream(serialPort);

    // Send initial PING to verify handshake
    setTimeout(() => {
      sendSerialCommand({ cmd: 'PING' });
    }, 600);

  } catch (err) {
    if (err.name !== 'NotFoundError') {
      console.error('[Web Serial] Port open error:', err);
      alert('Could not open serial port: ' + err.message);
    }
    updateUsbUI(false);
  }
}

async function disconnectWebSerial() {
  try {
    isUsbConnected = false;
    if (serialReader) {
      await serialReader.cancel();
      serialReader = null;
    }
    if (serialWriter) {
      await serialWriter.close();
      serialWriter = null;
    }
    if (serialPort) {
      await serialPort.close();
      serialPort = null;
    }
    appendLogLine({
      timestamp: new Date().toLocaleTimeString(),
      source: 'USB',
      type: 'INFO',
      message: 'ESP32 USB Serial Port disconnected.'
    });
  } catch (err) {
    console.warn('[Web Serial] Error closing port:', err);
  }
  updateUsbUI(false);
}

async function readSerialStream(port) {
  const textDecoder = new TextDecoderStream();
  port.readable.pipeTo(textDecoder.writable);
  serialReader = textDecoder.readable.getReader();

  let lineBuffer = '';

  try {
    while (true) {
      const { value, done } = await serialReader.read();
      if (done) break;
      if (value) {
        lineBuffer += value;
        const lines = lineBuffer.split('\n');
        lineBuffer = lines.pop();

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.length === 0) continue;
          handleIncomingSerialLine(trimmed);
        }
      }
    }
  } catch (err) {
    if (isUsbConnected) {
      console.warn('[Web Serial] Read loop error:', err);
    }
  } finally {
    if (serialReader) {
      serialReader.releaseLock();
      serialReader = null;
    }
    updateUsbUI(false);
  }
}

function handleIncomingSerialLine(line) {
  if (line.startsWith('{') && line.endsWith('}')) {
    try {
      const eventData = JSON.parse(line);
      processHardwareSerialEvent(eventData);
      return;
    } catch (e) {
      // fallback
    }
  }

  appendLogLine({
    timestamp: new Date().toLocaleTimeString(),
    source: 'ESP32_USB',
    type: 'INFO',
    message: line
  });
}

function processHardwareSerialEvent(data) {
  appendLogLine({
    timestamp: new Date().toLocaleTimeString(),
    source: 'ESP32_EVENT',
    type: 'INFO',
    message: `Received: ${data.event || 'STATUS'}`,
    rawData: data
  });

  if (data.event === 'BUTTON_PRESSED') {
    if (currentAlarmDose) {
      const doseName = currentAlarmDose === 1 ? 'Morning Dose' : currentAlarmDose === 2 ? 'Afternoon Dose' : 'Night Dose';
      reportDoseResult(currentAlarmDose, doseName, 'TAKEN', data.durationSec || 1.5);
    } else {
      playSuccessChime();
    }
  } else if (data.event === 'ALARM_TRIGGERED') {
    const doseNum = Number(data.dose) || 1;
    const doseName = data.doseName || (doseNum === 1 ? 'Morning Dose (Light 1)' : doseNum === 2 ? 'Afternoon Dose (Light 2)' : 'Night Dose (Light 3)');
    startAlarmUI(doseNum, doseName);
  } else if (data.event === 'ALARM_MISSED') {
    const doseNum = Number(data.dose) || (currentAlarmDose || 1);
    const doseName = data.doseName || (doseNum === 1 ? 'Morning Dose' : doseNum === 2 ? 'Afternoon Dose' : 'Night Dose');
    reportDoseResult(doseNum, doseName, 'MISSED', 10.0);
  } else if (data.event === 'TELEMETRY' || data.event === 'STATUS' || data.event === 'PONG') {
    if (data.buzzer) {
      buzzerBadge.className = 'flex items-center space-x-1.5 text-xs text-rose-600 buzzer-buzz font-bold';
      buzzerIcon.className = 'fa-solid fa-volume-high text-rose-600';
      buzzerStateText.textContent = 'BUZZING (Active)';
    } else if (!currentAlarmDose) {
      buzzerBadge.className = 'flex items-center space-x-1.5 text-xs text-slate-400 font-medium';
      buzzerIcon.className = 'fa-solid fa-volume-xmark';
      buzzerStateText.textContent = 'Silent';
    }
  }
}

if (btnUsbConnect) btnUsbConnect.addEventListener('click', connectWebSerial);
if (btnUsbConnectTwin) btnUsbConnectTwin.addEventListener('click', connectWebSerial);

if ('serial' in navigator) {
  navigator.serial.addEventListener('connect', () => {
    appendLogLine({
      timestamp: new Date().toLocaleTimeString(),
      source: 'USB',
      type: 'INFO',
      message: 'ESP32 USB cable physically connected to computer. Click Connect USB to activate.'
    });
  });
  navigator.serial.addEventListener('disconnect', () => {
    updateUsbUI(false);
    appendLogLine({
      timestamp: new Date().toLocaleTimeString(),
      source: 'USB',
      type: 'WARN',
      message: 'ESP32 USB cable disconnected.'
    });
  });
}

// ---------------------------------------------------------
// SERVER SENT EVENTS (SSE) STREAM
// ---------------------------------------------------------
function connectSSE() {
  const evtSource = new EventSource('/api/stream');

  evtSource.onopen = () => {
    sseIndicator.className = 'w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse';
    sseText.textContent = 'Live SSE Connected';
  };

  evtSource.onerror = () => {
    sseIndicator.className = 'w-2.5 h-2.5 rounded-full bg-rose-500';
    sseText.textContent = 'Reconnecting...';
  };

  evtSource.onmessage = (event) => {
    try {
      const parsed = JSON.parse(event.data);
      handleServerEvent(parsed);
    } catch (err) {
      console.error("SSE parse error:", err);
    }
  };
}

function handleServerEvent(event) {
  const { type, data } = event;

  switch (type) {
    case 'INITIAL_SNAPSHOT':
      if (data.alertsHistory) cachedAlertsHistory = data.alertsHistory.slice();
      updateStats(data.boxState.stats);
      renderHistoryTable(data.alertsHistory);
      if (data.boxState.schedule) {
        updateHardwareTwinSchedule(data.boxState.schedule);
      }
      if (data.logsStream) {
        data.logsStream.slice().reverse().forEach(log => appendLogLine(log));
      }
      break;

    case 'NEW_LOG':
      appendLogLine(data);
      break;

    case 'SCHEDULE_UPDATED':
      currentArmedSchedule = data;
      updateHardwareTwinSchedule(data);
      break;

    case 'ALERT_OVERRIDDEN':
      if (data.alertsHistory) cachedAlertsHistory = data.alertsHistory.slice();
      updateStats(data.boxState.stats);
      renderHistoryTable(data.alertsHistory);
      break;

    case 'ALARM_TRIGGERED':
      startAlarmUI(data.dose, data.doseName);
      break;

    case 'NEW_ALERT':
      if (data.alert) {
        cachedAlertsHistory.unshift(data.alert);
      }
      updateStats(data.boxState.stats);
      addAlertToHistory(data.alert);
      finishAlarmUI(data.alert.status === 'TAKEN', data.alert.doseName, data.alert);
      break;

    case 'RESET':
      cachedAlertsHistory = [];
      updateStats(data.boxState.stats);
      renderHistoryTable([]);
      resetHardwareTwin();
      break;
  }
}

// ---------------------------------------------------------
// ALARM LIFECYCLE (10-SECOND TIMEOUT LOGIC)
// ---------------------------------------------------------
function startAlarmUI(doseNum, doseName) {
  currentAlarmDose = doseNum;
  alarmStartTime = Date.now();
  remainingMs = 10000;

  // Buzzer ON
  playAlarmBuzzerSound();
  buzzerBadge.className = 'ml-auto text-[10px] px-2 py-0.5 rounded bg-rose-950 text-rose-300 font-bold border border-rose-500/40 buzzer-buzz';
  buzzerIcon.className = 'fa-solid fa-volume-high text-rose-400 text-xs';
  buzzerStateText.textContent = 'BUZZING';
  setTelemetryStatus('alarm', 'ALARM ACTIVE');

  // Reset lights, then turn on specific LED
  resetLeds();
  if (doseNum === 1) {
    if (ledMorning) ledMorning.className = 'fa-solid fa-sun text-emerald-400 text-xs led-glow-green';
    if (ledStatus1) {
      ledStatus1.textContent = 'BLINKING';
      ledStatus1.className = 'text-[10px] px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 font-bold border border-emerald-500/40 animate-pulse';
    }
    if (cardLed1) cardLed1.className = 'tile-dark rounded-xl p-3 flex items-center justify-between border-emerald-500/50 shadow-lg shadow-emerald-500/10 transition-all cursor-pointer';
  } else if (doseNum === 2) {
    if (ledAfternoon) ledAfternoon.className = 'fa-solid fa-sun text-amber-400 text-xs led-glow-amber';
    if (ledStatus2) {
      ledStatus2.textContent = 'BLINKING';
      ledStatus2.className = 'text-[10px] px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 font-bold border border-amber-500/40 animate-pulse';
    }
    if (cardLed2) cardLed2.className = 'tile-dark rounded-xl p-3 flex items-center justify-between border-amber-500/50 shadow-lg shadow-amber-500/10 transition-all cursor-pointer';
  } else if (doseNum === 3) {
    if (ledNight) ledNight.className = 'fa-solid fa-moon text-rose-400 text-xs led-glow-red';
    if (ledStatus3) {
      ledStatus3.textContent = 'BLINKING';
      ledStatus3.className = 'text-[10px] px-2 py-0.5 rounded bg-rose-950/80 text-rose-300 font-bold border border-rose-500/40 animate-pulse';
    }
    if (cardLed3) cardLed3.className = 'tile-dark rounded-xl p-3 flex items-center justify-between border-rose-500/50 shadow-lg shadow-rose-500/10 transition-all cursor-pointer';
  }

  // OLED Screen Update
  oledLine1.textContent = '!! ALARM ACTIVE !!';
  oledLine2.textContent = `TAKE ${doseName.toUpperCase()}`;
  oledLine3.textContent = 'Press button within 10s!';

  // Urgent Banner
  alarmBanner.className = 'rounded-2xl p-4 border border-rose-500/50 bg-rose-950/50 backdrop-blur transition-all duration-300 shadow-xl flex items-center justify-between text-slate-100';
  alarmBannerIcon.className = 'w-10 h-10 rounded-xl bg-rose-900/50 border border-rose-500/40 text-rose-400 flex items-center justify-center text-lg animate-bounce shrink-0';
  alarmBannerTitle.textContent = `🚨 ${doseName.toUpperCase()} - ALARM TRIGGERED!`;
  alarmBannerTitle.className = 'text-sm font-bold text-rose-200';
  alarmBannerDesc.textContent = 'Buzzer active. Patient confirmation required.';
  alarmBannerDesc.className = 'text-xs text-rose-300/80';
  alarmTimerBox.classList.remove('hidden');
  btnPatientTake.classList.remove('hidden');
  btnBannerOverride.classList.add('hidden');

  // Start 10-Second Countdown interval
  clearInterval(countdownTimer);
  countdownTimer = setInterval(() => {
    const elapsed = Date.now() - alarmStartTime;
    remainingMs = Math.max(0, 10000 - elapsed);
    const secs = (remainingMs / 1000).toFixed(1);
    alarmCountdown.textContent = secs + 's';

    if (remainingMs <= 0) {
      clearInterval(countdownTimer);
      // Auto-trigger Missed timeout alert if still active
      if (currentAlarmDose !== null) {
        reportDoseResult(currentAlarmDose, doseName, 'MISSED', 10.0);
      }
    }
  }, 100);
}

function finishAlarmUI(isTaken, doseName, alertObj = null) {
  clearInterval(countdownTimer);
  stopAlarmBuzzerSound();

  if (alertObj) lastAlertObject = alertObj;

  // Reset Buzzer & LEDs
  buzzerBadge.className = 'ml-auto';
  buzzerIcon.className = 'fa-solid fa-volume-high text-slate-400 text-xs';
  buzzerStateText.textContent = 'Silent';
  resetLeds();

  alarmTimerBox.classList.add('hidden');
  btnPatientTake.classList.add('hidden');
  btnBannerOverride.classList.remove('hidden');
  btnBannerOverride.classList.add('flex');

  if (isTaken) {
    playSuccessChime();
    oledLine1.textContent = 'MEDICINE STATUS';
    oledLine2.textContent = doseName.toUpperCase();
    oledLine3.textContent = 'TAKEN ON TIME :)';

    alarmBanner.className = 'rounded-2xl p-4 border border-emerald-500/50 bg-emerald-950/40 backdrop-blur transition-all duration-300 shadow-xl flex items-center justify-between text-slate-100';
    alarmBannerIcon.className = 'w-10 h-10 rounded-xl bg-emerald-900/50 border border-emerald-500/40 text-emerald-400 flex items-center justify-center text-lg shadow-sm shrink-0';
    alarmBannerIcon.innerHTML = '<i class="fa-solid fa-check"></i>';
    alarmBannerTitle.textContent = `✅ ${doseName} TAKEN!`;
    alarmBannerTitle.className = 'text-sm font-bold text-emerald-200';
    alarmBannerDesc.textContent = 'Patient intake confirmed.';
    alarmBannerDesc.className = 'text-xs text-emerald-300/80';

    bannerOverrideText.textContent = 'Mark MISSED';
    btnBannerOverride.className = 'flex px-4 py-2 bg-rose-600 hover:bg-rose-500 font-semibold text-white text-xs rounded-xl shadow-md transition items-center space-x-2 cursor-pointer';
  } else {
    playMissedTone();
    oledLine1.textContent = 'MEDICINE STATUS';
    oledLine2.textContent = doseName.toUpperCase();
    oledLine3.textContent = 'MISSED! :( (Timeout)';

    alarmBanner.className = 'rounded-2xl p-4 border border-rose-500/50 bg-rose-950/40 backdrop-blur transition-all duration-300 shadow-xl flex items-center justify-between text-slate-100';
    alarmBannerIcon.className = 'w-10 h-10 rounded-xl bg-rose-900/50 border border-rose-500/40 text-rose-400 flex items-center justify-center text-lg shadow-sm shrink-0';
    alarmBannerIcon.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i>';
    alarmBannerTitle.textContent = `⚠️ ALERT: ${doseName} MISSED!`;
    alarmBannerTitle.className = 'text-sm font-bold text-rose-200';
    alarmBannerDesc.textContent = 'No response in 10 seconds.';
    alarmBannerDesc.className = 'text-xs text-rose-300/80';

    bannerOverrideText.textContent = 'Mark TAKEN';
    btnBannerOverride.className = 'flex px-4 py-2 bg-emerald-600 hover:bg-emerald-500 font-semibold text-white text-xs rounded-xl shadow-md transition items-center space-x-2 cursor-pointer';
  }

  currentAlarmDose = null;
  setTelemetryStatus(isTaken ? 'taken' : 'missed', isTaken ? 'DOSE TAKEN' : 'MISSED');

  // Auto-hide alert banner after 10 seconds and return status to Monitoring
  setTimeout(() => {
    if (!currentAlarmDose) {
      alarmBanner.classList.add('hidden');
      oledLine1.textContent = 'SMART MEDIBOX';
      oledLine2.textContent = liveClock ? liveClock.textContent : '--:--:--';
      oledLine3.textContent = 'Status: Monitoring';
      setTelemetryStatus('idle', 'Monitoring');
    }
  }, 10000);
}

btnBannerOverride.addEventListener('click', () => {
  if (lastAlertObject) {
    toggleAlertStatus(lastAlertObject.id);
  }
});

function resetLeds() {
  if (ledMorning) ledMorning.className = 'fa-regular fa-sun text-slate-400 text-xs';
  if (ledAfternoon) ledAfternoon.className = 'fa-solid fa-sun text-slate-400 text-xs';
  if (ledNight) ledNight.className = 'fa-regular fa-moon text-slate-400 text-xs';

  if (ledStatus1) {
    ledStatus1.textContent = 'OFF';
    ledStatus1.className = 'text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-bold border border-slate-700/60';
  }
  if (ledStatus2) {
    ledStatus2.textContent = 'OFF';
    ledStatus2.className = 'text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-bold border border-slate-700/60';
  }
  if (ledStatus3) {
    ledStatus3.textContent = 'OFF';
    ledStatus3.className = 'text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-bold border border-slate-700/60';
  }

  if (cardLed1) cardLed1.className = 'tile-dark rounded-xl p-3 flex items-center justify-between transition-all cursor-pointer';
  if (cardLed2) cardLed2.className = 'tile-dark rounded-xl p-3 flex items-center justify-between transition-all cursor-pointer';
  if (cardLed3) cardLed3.className = 'tile-dark rounded-xl p-3 flex items-center justify-between transition-all cursor-pointer';
}

function resetHardwareTwin() {
  stopAlarmBuzzerSound();
  resetLeds();
  currentAlarmDose = null;
  alarmBanner.classList.add('hidden');
  oledLine1.textContent = 'SMART MEDIBOX';
  oledLine2.textContent = liveClock ? liveClock.textContent : '--:--:--';
  oledLine3.textContent = 'Status: Monitoring';
  setTelemetryStatus('idle', 'Monitoring');
}

// ---------------------------------------------------------
// REPORT DOSE RESULT (POST TO BACKEND)
// ---------------------------------------------------------
async function reportDoseResult(doseNum, doseName, status, durationSec) {
  try {
    const res = await fetch('/api/alert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dose: doseNum,
        doseName: doseName,
        status: status,
        durationSec: durationSec
      })
    });
    return await res.json();
  } catch (err) {
    console.error("API error:", err);
  }
}

async function triggerAlarmOnServer(doseNum, doseName) {
  try {
    const res = await fetch('/api/alarm-start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dose: doseNum, doseName })
    });
    return await res.json();
  } catch (err) {
    console.error("API error:", err);
  }
}

// ---------------------------------------------------------
// BUTTON ACTIONS & INTERACTION (Physical USB + Digital Twin)
// ---------------------------------------------------------
function handlePatientButtonPressed() {
  // If USB data cable is attached, immediately tell ESP32 to silence buzzer & confirm intake
  sendSerialCommand({ cmd: 'TAKE_MEDICINE' });

  if (currentAlarmDose) {
    const elapsedSec = ((Date.now() - alarmStartTime) / 1000).toFixed(1);
    const doseName = currentAlarmDose === 1 ? 'Morning Dose' : currentAlarmDose === 2 ? 'Afternoon Dose' : 'Night Dose';
    reportDoseResult(currentAlarmDose, doseName, 'TAKEN', elapsedSec);
  } else {
    appendLogLine({
      timestamp: new Date().toLocaleTimeString(),
      source: 'BUTTON',
      type: 'INFO',
      message: 'Button pressed by user (Signal dispatched to hardware & cloud).'
    });
  }
}

btnPatientTake.addEventListener('click', handlePatientButtonPressed);
hardwareBtnPress.addEventListener('click', handlePatientButtonPressed);

// Simulator buttons - Dispatch to physical ESP32 via USB and to server
simDose1.addEventListener('click', () => {
  sendSerialCommand({ cmd: 'TEST_DOSE', dose: 1 });
  triggerAlarmOnServer(1, 'Morning Dose (Light 1)');
});
simDose2.addEventListener('click', () => {
  sendSerialCommand({ cmd: 'TEST_DOSE', dose: 2 });
  triggerAlarmOnServer(2, 'Afternoon Dose (Light 2)');
});
simDose3.addEventListener('click', () => {
  sendSerialCommand({ cmd: 'TEST_DOSE', dose: 3 });
  triggerAlarmOnServer(3, 'Night Dose (Light 3)');
});

// Copy Endpoint
copyEndpointBtn.addEventListener('click', () => {
  navigator.clipboard.writeText(endpointUrl.textContent);
  copyEndpointBtn.textContent = 'Copied!';
  setTimeout(() => copyEndpointBtn.textContent = 'Copy', 2000);
});

// Helper to safely handle log calls
function appendLogLine(log) {
  console.log(`[${log.source || 'SYS'}] ${log.message || ''}`);
}

function escapeHTML(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

if (cardAdherenceBtn) {
  cardAdherenceBtn.addEventListener('click', () => {
    openAdherenceModal();
  });
}

btnResetStats.addEventListener('click', async () => {
  if (confirm("Are you sure you want to reset all reminder history and stats?")) {
    sendSerialCommand({ cmd: 'RESET' });
    await fetch('/api/clear-history', { method: 'POST' });
  }
});

// ---------------------------------------------------------
// 3D CIRCULAR ADHERENCE DIAGRAM ENGINE (SVG 3D Isometric)
// ---------------------------------------------------------
function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = (angleDeg - 90) * Math.PI / 180.0;
  return {
    x: cx + (r * Math.cos(rad)),
    y: cy + (r * Math.sin(rad))
  };
}

function describeDonutSlice(cx, cy, rOuter, rInner, startAngle, endAngle) {
  let angleDiff = endAngle - startAngle;
  if (angleDiff >= 359.99) angleDiff = 359.99;
  const adjEnd = startAngle + angleDiff;

  const p1 = polarToCartesian(cx, cy, rOuter, adjEnd);
  const p2 = polarToCartesian(cx, cy, rOuter, startAngle);
  const p3 = polarToCartesian(cx, cy, rInner, startAngle);
  const p4 = polarToCartesian(cx, cy, rInner, adjEnd);
  const largeArcFlag = angleDiff <= 180 ? "0" : "1";

  return [
    "M", p1.x, p1.y,
    "A", rOuter, rOuter, 0, largeArcFlag, 0, p2.x, p2.y,
    "L", p3.x, p3.y,
    "A", rInner, rInner, 0, largeArcFlag, 1, p4.x, p4.y,
    "Z"
  ].join(" ");
}

function describeOuterSideWall(cx, cy, rOuter, startAngle, endAngle, depth) {
  let angleDiff = endAngle - startAngle;
  if (angleDiff >= 359.99) angleDiff = 359.99;
  const adjEnd = startAngle + angleDiff;

  const p1 = polarToCartesian(cx, cy, rOuter, startAngle);
  const p2 = polarToCartesian(cx, cy, rOuter, adjEnd);
  const largeArcFlag = angleDiff <= 180 ? "0" : "1";

  return [
    "M", p1.x, p1.y,
    "A", rOuter, rOuter, 0, largeArcFlag, 1, p2.x, p2.y,
    "L", p2.x, p2.y + depth,
    "A", rOuter, rOuter, 0, largeArcFlag, 0, p1.x, p1.y + depth,
    "Z"
  ].join(" ");
}

function render3DDonut(taken, missed) {
  if (!donut3dLayers) return;
  donut3dLayers.innerHTML = '';

  const total = taken + missed;

  if (donutTakenCount) donutTakenCount.textContent = taken;
  if (donutMissedCount) donutMissedCount.textContent = missed;

  // If no records yet, render clean neutral placeholder ring (0% state)
  if (total === 0) {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    const topPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    topPath.setAttribute("d", describeDonutSlice(200, 200, 135, 88, 0, 359.99));
    topPath.setAttribute("fill", "#1e293b");
    topPath.setAttribute("stroke", "#334155");
    topPath.setAttribute("stroke-width", "2");
    topPath.setAttribute("class", "opacity-40");
    g.appendChild(topPath);
    donut3dLayers.appendChild(g);
    return;
  }

  const isSample = false;
  const tCount = taken;
  const mCount = missed;
  const displayTotal = total;

  const categories = [
    {
      id: 'taken',
      title: 'Medicine Taken On Time',
      count: taken,
      rawCount: tCount,
      gradTop: 'url(#grad-taken-top)',
      stroke: '#10b981',
      badgeClass: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40',
      badgeText: 'MEDICINE TAKEN',
      countColor: 'text-cyan-400',
      desc: 'Patient confirmed dose on time via button press.'
    },
    {
      id: 'missed',
      title: 'Medicine Missed',
      count: missed,
      rawCount: mCount,
      gradTop: 'url(#grad-missed-top)',
      stroke: '#ef4444',
      badgeClass: 'bg-rose-950/80 text-rose-300 border-rose-500/40',
      badgeText: 'NOT TAKEN (MISSED)',
      countColor: 'text-rose-400',
      desc: '10-second timeout reached with no button response.'
    }
  ];

  const cx = 200, cy = 200, rOuter = 135, rInner = 88;
  let currentAngle = 0;

  categories.forEach(cat => {
    if (cat.rawCount <= 0) return;
    const sliceAngle = (cat.rawCount / displayTotal) * 360.0;
    const startAngle = currentAngle;
    const endAngle = currentAngle + sliceAngle;
    const pct = total === 0 ? (cat.id === 'taken' ? '100' : '0') : ((cat.count / total) * 100).toFixed(0);

    // Group for this slice
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("class", "cursor-pointer transition-transform duration-200 slice-group");
    g.setAttribute("id", `slice-3d-${cat.id}`);
    g.style.transformOrigin = `${cx}px ${cy}px`;

    // Modern flat donut slice
    const topPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    topPath.setAttribute("d", describeDonutSlice(cx, cy, rOuter, rInner, startAngle, endAngle));
    topPath.setAttribute("fill", cat.gradTop);
    topPath.setAttribute("stroke", "#0b1017");
    topPath.setAttribute("stroke-width", "3");
    g.appendChild(topPath);

    // Interactive Hover Events on the Slice
    const showTooltip = (e) => {
      g.style.transform = `scale(1.03)`;

      if (tipBadge) {
        tipBadge.className = `text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border inline-block mb-1 ${cat.badgeClass}`;
        tipBadge.textContent = cat.badgeText;
      }
      if (tipTitle) {
        tipTitle.textContent = cat.title;
      }
      if (tipCount) {
        tipCount.className = `text-lg font-bold font-mono my-0.5 ${cat.countColor}`;
        tipCount.textContent = `${cat.count} Doses`;
      }
      if (tipPercent) {
        tipPercent.textContent = `${pct}% of total doses`;
      }

      if (chart3dTooltip) {
        if (e && stage3d) {
          const rect = stage3d.getBoundingClientRect();
          const mouseX = e.clientX - rect.left;
          const mouseY = e.clientY - rect.top;
          chart3dTooltip.style.left = `${Math.min(Math.max(mouseX - 80, 10), rect.width - 190)}px`;
          chart3dTooltip.style.top = `${Math.max(mouseY - 80, -10)}px`;
        }
        chart3dTooltip.style.opacity = '1';
      }
    };

    const hideTooltip = () => {
      g.style.transform = '';
      if (chart3dTooltip) chart3dTooltip.style.opacity = '0';
    };

    g.addEventListener("mouseenter", showTooltip);
    g.addEventListener("mousemove", showTooltip);
    g.addEventListener("mouseleave", hideTooltip);

    donut3dLayers.appendChild(g);
    currentAngle += sliceAngle;
  });
}

// ---------------------------------------------------------
// HISTORY TABLE & STATS UPDATE
// ---------------------------------------------------------
function updateStats(stats) {
  if (!stats) return;
  lastBoxStats = stats;
  const taken = stats.takenCount || 0;
  const missed = stats.missedCount || 0;
  const total = taken + missed;

  const totalReminders = stats.totalReminders !== undefined ? stats.totalReminders : (total > 0 ? total : 0);
  if (statTotal) statTotal.textContent = totalReminders;
  if (statTaken) statTaken.textContent = taken;
  if (statMissed) statMissed.textContent = missed;

  // Update Total breakdown pills
  const statTotalTakenPill = document.getElementById('stat-total-taken-pill');
  const statTotalMissedPill = document.getElementById('stat-total-missed-pill');
  if (statTotalTakenPill) {
    statTotalTakenPill.textContent = `${taken} Taken`;
    statTotalTakenPill.className = taken > 0 ? 'text-emerald-400 font-semibold' : 'text-slate-400 font-semibold';
  }
  if (statTotalMissedPill) {
    statTotalMissedPill.textContent = `${missed} Missed`;
    statTotalMissedPill.className = missed > 0 ? 'text-rose-400 font-semibold' : 'text-slate-400 font-semibold';
  }

  // Dots visibility: appear only when counts are present (> 0)
  const dotTaken = document.getElementById('dot-taken');
  const dotMissed = document.getElementById('dot-missed');
  const dotTotal = document.getElementById('dot-total');
  if (dotTaken) {
    if (taken > 0) dotTaken.classList.remove('hidden');
    else dotTaken.classList.add('hidden');
  }
  if (dotMissed) {
    if (missed > 0) dotMissed.classList.remove('hidden');
    else dotMissed.classList.add('hidden');
  }
  if (dotTotal) {
    if (totalReminders > 0) dotTotal.classList.remove('hidden');
    else dotTotal.classList.add('hidden');
  }

  if (statTaken) {
    statTaken.className = taken > 0 
      ? 'text-2xl sm:text-3xl font-extrabold text-emerald-400 font-mono tracking-tight'
      : 'text-2xl sm:text-3xl font-extrabold text-slate-300 font-mono tracking-tight';
  }
  if (statMissed) {
    statMissed.className = missed > 0 
      ? 'text-2xl sm:text-3xl font-extrabold text-rose-400 font-mono tracking-tight'
      : 'text-2xl sm:text-3xl font-extrabold text-slate-300 font-mono tracking-tight';
  }

  // Adherence rate: 0% when no cycles recorded
  const rate = total === 0 ? 0 : Math.round((taken / total) * 100);
  if (statAdherence) statAdherence.textContent = rate + '%';
  if (centerAdherencePct) centerAdherencePct.textContent = rate + '%';

  const statAdhBadge = document.getElementById('stat-adherence-badge');
  if (total === 0) {
    if (statAdherence) statAdherence.className = 'text-2xl sm:text-3xl font-extrabold text-slate-400 font-mono tracking-tight';
    if (statAdhBadge) {
      statAdhBadge.textContent = 'No Data';
      statAdhBadge.className = 'text-[11px] font-bold text-slate-400 bg-slate-800/80 border border-slate-700/60 px-2 py-0.5 rounded-full';
    }
    if (centerAdherenceLabel) {
      centerAdherenceLabel.textContent = 'No Data';
      centerAdherenceLabel.className = 'text-[10px] text-slate-400 font-semibold mt-1';
    }
  } else if (rate >= 75) {
    if (statAdherence) statAdherence.className = 'text-2xl sm:text-3xl font-extrabold text-emerald-400 font-mono tracking-tight';
    if (statAdhBadge) {
      statAdhBadge.textContent = 'Optimal';
      statAdhBadge.className = 'text-[11px] font-bold text-emerald-300 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full';
    }
    if (centerAdherenceLabel) {
      centerAdherenceLabel.textContent = 'Optimal (Good)';
      centerAdherenceLabel.className = 'text-[10px] text-teal-400 font-semibold mt-1';
    }
  } else {
    if (statAdherence) statAdherence.className = 'text-2xl sm:text-3xl font-extrabold text-rose-400 font-mono tracking-tight';
    if (statAdhBadge) {
      statAdhBadge.textContent = 'Needs Attention';
      statAdhBadge.className = 'text-[11px] font-bold text-rose-300 bg-rose-950/60 border border-rose-500/30 px-2 py-0.5 rounded-full';
    }
    if (centerAdherenceLabel) {
      centerAdherenceLabel.textContent = rate >= 50 ? 'Moderate' : 'Low';
      centerAdherenceLabel.className = rate >= 50 ? 'text-[10px] text-amber-400 font-semibold mt-1' : 'text-[10px] text-rose-400 font-semibold mt-1';
    }
  }

  // Calculate real-time number of doses taken in Morning, Evening (Afternoon), Night
  let morningTaken = 0;
  let eveningTaken = 0;
  let nightTaken = 0;

  if (cachedAlertsHistory && cachedAlertsHistory.length > 0) {
    cachedAlertsHistory.forEach(a => {
      if (a.status === 'TAKEN') {
        const d = Number(a.dose);
        if (d === 1) morningTaken++;
        else if (d === 2) eveningTaken++;
        else if (d === 3) nightTaken++;
      }
    });
  } else if (taken > 0) {
    // Initial fallback if alerts history array has not arrived yet
    morningTaken = Math.ceil(taken / 3);
    eveningTaken = Math.floor(taken / 3);
    nightTaken = taken - morningTaken - eveningTaken;
  }

  const totalTakenByTime = morningTaken + eveningTaken + nightTaken;

  // Update bar chart numbers
  if (countBarMorning) countBarMorning.textContent = morningTaken;
  if (countBarAfternoon) countBarAfternoon.textContent = eveningTaken;
  if (countBarNight) countBarNight.textContent = nightTaken;
  if (chartTotalTakenBadge) chartTotalTakenBadge.textContent = `Total: ${totalTakenByTime} Taken`;

  // Scale bar heights dynamically (h-32 container)
  const maxDoses = Math.max(morningTaken, eveningTaken, nightTaken, 1);
  const maxBarHeight = 78; // px
  const minBarHeight = 4;  // px

  const hM = morningTaken === 0 ? minBarHeight : Math.max(minBarHeight, Math.round((morningTaken / maxDoses) * maxBarHeight));
  const hE = eveningTaken === 0 ? minBarHeight : Math.max(minBarHeight, Math.round((eveningTaken / maxDoses) * maxBarHeight));
  const hN = nightTaken === 0 ? minBarHeight : Math.max(minBarHeight, Math.round((nightTaken / maxDoses) * maxBarHeight));

  if (chartBarMorning) chartBarMorning.style.height = `${hM}px`;
  if (chartBarAfternoon) chartBarAfternoon.style.height = `${hE}px`;
  if (chartBarNight) chartBarNight.style.height = `${hN}px`;

  // Update Y-Axis Scale ticks
  const yMax = Math.max(maxDoses, 3);
  if (chartYMax) chartYMax.textContent = yMax;
  if (chartYMid) chartYMid.textContent = Math.max(1, Math.round(yMax * 0.66));
  if (chartYLow) chartYLow.textContent = Math.max(1, Math.round(yMax * 0.33));

  // Render the circular donut without manual changes (pure Taken vs Missed)
  render3DDonut(taken, missed);

  // Sync with Home View vitality pills
  const homeAdhPill = document.getElementById('home-adherence-pill');
  if (homeAdhPill) homeAdhPill.textContent = `${rate}% On-Time Intake`;
  const homeVitality = document.getElementById('home-vitality-score');
  if (homeVitality) homeVitality.textContent = `${Math.min(100, Math.max(20, Math.round(rate * 0.98)))}%`;
}

function updateDoseRecordCountBadge(count) {
  if (doseRecordCountBadge) {
    doseRecordCountBadge.textContent = `${count} ${count === 1 ? 'Record' : 'Records'}`;
  }
}

function createDoseRowElement(alert) {
  const row = document.createElement('tr');
  row.id = 'row-' + alert.id;
  row.className = 'hover:bg-slate-800/40 transition border-b border-slate-800/60 text-slate-300';

  const isTaken = alert.status === 'TAKEN';
  const badgeClass = isTaken
    ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-500/30'
    : 'bg-rose-950/70 text-rose-300 border border-rose-500/30';
  const icon = isTaken ? '<i class="fa-solid fa-check mr-1 text-emerald-400"></i>' : '<i class="fa-solid fa-xmark mr-1 text-rose-400"></i>';

  row.innerHTML = `
    <td class="px-5 py-3 text-slate-400 font-mono text-[11px]">${alert.timestamp || (alert.date || '')}</td>
    <td class="px-5 py-3 font-semibold text-slate-200">
      <span class="px-2 py-0.5 rounded bg-slate-800 text-slate-300 mr-2 border border-slate-700 text-[10px] font-mono">Dose ${alert.dose}</span>
      ${escapeHTML(alert.doseName || '')}
    </td>
    <td class="px-5 py-3">
      <div class="flex items-center space-x-2">
        <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold ${badgeClass}">
          ${icon}${alert.status}
        </span>
        <button onclick="toggleAlertStatus('${alert.id}')" class="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[10px] font-semibold transition" title="Change status">
          <i class="fa-solid fa-arrows-rotate mr-1 text-slate-400"></i>${isTaken ? 'Missed' : 'Taken'}
        </button>
      </div>
    </td>
    <td class="px-5 py-3 text-slate-400 font-mono text-[11px]">${alert.responseTime || '-'}</td>
    <td class="px-5 py-3 text-slate-400 text-[11px]">
      ${escapeHTML(alert.actionDetails || (isTaken ? 'Confirmed on time' : '10s timeout'))}
      ${alert.manuallyOverridden ? '<span class="ml-1 px-1.5 py-0.2 rounded bg-sky-950/80 text-sky-300 border border-sky-500/30 text-[9px] font-mono font-bold">EDITED</span>' : ''}
    </td>
  `;
  return row;
}

function addAlertToHistory(alert) {
  if (alert) {
    const idx = cachedAlertsHistory.findIndex(a => a.id === alert.id);
    if (idx >= 0) cachedAlertsHistory[idx] = alert;
    else cachedAlertsHistory.unshift(alert);
  }

  if (!historyTableBody) return;

  // If empty placeholder is shown, remove it
  const emptyPlaceholder = historyTableBody.querySelector('td[colspan="5"]');
  if (emptyPlaceholder) {
    historyTableBody.innerHTML = '';
  }

  // If a row for this alert already exists (e.g. from override or replay), update it in place
  const existingRow = document.getElementById('row-' + alert.id);
  const newRow = createDoseRowElement(alert);
  if (existingRow) {
    existingRow.replaceWith(newRow);
  } else {
    // Prepend the new buzzer record so latest is at top while storing ALL buzzer records
    historyTableBody.prepend(newRow);
  }

  const count = historyTableBody.querySelectorAll('tr[id^="row-"]').length;
  updateDoseRecordCountBadge(count);
}

function renderHistoryTable(alerts) {
  if (alerts) cachedAlertsHistory = alerts.slice();

  if (!historyTableBody) return;

  if (!alerts || alerts.length === 0) {
    historyTableBody.innerHTML = `
      <tr>
        <td colspan="5" class="px-5 py-6 text-center text-slate-400 font-sans text-xs">
          No activity records yet.
        </td>
      </tr>
    `;
    updateDoseRecordCountBadge(0);
    return;
  }

  historyTableBody.innerHTML = '';
  // Store and render ALL records done by the buzzer
  alerts.forEach(alert => {
    historyTableBody.appendChild(createDoseRowElement(alert));
  });
  updateDoseRecordCountBadge(alerts.length);
}

// ---------------------------------------------------------
// MANUAL OVERRIDE HANDLER (Switch between MISSED and TAKEN)
// ---------------------------------------------------------
window.toggleAlertStatus = async function(alertId) {
  try {
    const res = await fetch('/api/override-alert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alertId })
    });
    const data = await res.json();
    if (data.success) {
      if (data.alertsHistory) {
        cachedAlertsHistory = data.alertsHistory.slice();
      } else {
        const idx = cachedAlertsHistory.findIndex(a => a.id === alertId);
        if (idx >= 0) cachedAlertsHistory[idx] = data.alert;
      }
      updateStats(data.boxState.stats);
      const resAlerts = await fetch('/api/alerts');
      const alerts = await resAlerts.json();
      renderHistoryTable(alerts);

      const isTaken = data.alert.status === 'TAKEN';
      oledLine1.textContent = 'MANUAL OVERRIDE';
      oledLine2.textContent = data.alert.doseName.toUpperCase();
      oledLine3.textContent = isTaken ? 'STATUS: TAKEN :)' : 'STATUS: MISSED :(';

      if (lastAlertObject && lastAlertObject.id === alertId) {
        lastAlertObject = data.alert;
        finishAlarmUI(isTaken, data.alert.doseName, data.alert);
      }
    }
  } catch (err) {
    console.error("Toggle error:", err);
  }
};

// ---------------------------------------------------------
// MEDICINE SCHEDULE CONTROLLER (12-HOUR AM / PM)
// ---------------------------------------------------------
const hDose1 = document.getElementById('h-dose-1');
const mDose1 = document.getElementById('m-dose-1');
const ampmDose1 = document.getElementById('ampm-dose-1');

const hDose2 = document.getElementById('h-dose-2');
const mDose2 = document.getElementById('m-dose-2');
const ampmDose2 = document.getElementById('ampm-dose-2');

const hDose3 = document.getElementById('h-dose-3');
const mDose3 = document.getElementById('m-dose-3');
const ampmDose3 = document.getElementById('ampm-dose-3');

const btnSaveSchedule = document.getElementById('btn-save-schedule');
const scheduleSaveStatus = document.getElementById('schedule-save-status');

// Sliding Drawer Elements
const scheduleDrawer = document.getElementById('schedule-drawer');
const scheduleDrawerBackdrop = document.getElementById('schedule-drawer-backdrop');
const btnOpenScheduleDrawer = document.getElementById('btn-open-schedule-drawer');
const btnOpenScheduleDrawerCard = document.getElementById('btn-open-schedule-drawer-card');
const btnCloseScheduleDrawer = document.getElementById('btn-close-schedule-drawer');
const btnCancelScheduleDrawer = document.getElementById('btn-cancel-schedule-drawer');

function openScheduleDrawer() {
  if (!scheduleDrawer || !scheduleDrawerBackdrop) return;
  scheduleDrawerBackdrop.classList.remove('hidden');
  requestAnimationFrame(() => {
    scheduleDrawerBackdrop.classList.remove('opacity-0');
    scheduleDrawer.classList.remove('translate-x-full');
  });
}

function closeScheduleDrawer() {
  if (!scheduleDrawer || !scheduleDrawerBackdrop) return;
  scheduleDrawer.classList.add('translate-x-full');
  scheduleDrawerBackdrop.classList.add('opacity-0');
  setTimeout(() => {
    scheduleDrawerBackdrop.classList.add('hidden');
  }, 300);
}

if (btnOpenScheduleDrawer) btnOpenScheduleDrawer.addEventListener('click', openScheduleDrawer);
if (btnOpenScheduleDrawerCard) btnOpenScheduleDrawerCard.addEventListener('click', openScheduleDrawer);
if (btnCloseScheduleDrawer) btnCloseScheduleDrawer.addEventListener('click', closeScheduleDrawer);
if (btnCancelScheduleDrawer) btnCancelScheduleDrawer.addEventListener('click', closeScheduleDrawer);
if (scheduleDrawerBackdrop) scheduleDrawerBackdrop.addEventListener('click', closeScheduleDrawer);

let currentArmedSchedule = null;
let lastAutoTriggerMinute = -1;

function updateHardwareTwinSchedule(schedule) {
  if (!schedule) return;
  if (schedule.dose1) {
    const t = schedule.dose1.timeStr || `${String(schedule.dose1.hour12).padStart(2, '0')}:${String(schedule.dose1.minute).padStart(2, '0')} ${schedule.dose1.ampm}`;
    const el = document.getElementById('led-time-1');
    if (el) el.textContent = `GPIO 19 • ${t}`;
    const sim = document.getElementById('sim-time-1');
    if (sim) sim.textContent = t;
    const sum = document.getElementById('summary-time-1');
    if (sum) sum.textContent = t;
  }
  if (schedule.dose2) {
    const t = schedule.dose2.timeStr || `${String(schedule.dose2.hour12).padStart(2, '0')}:${String(schedule.dose2.minute).padStart(2, '0')} ${schedule.dose2.ampm}`;
    const el = document.getElementById('led-time-2');
    if (el) el.textContent = `GPIO 18 • ${t}`;
    const sim = document.getElementById('sim-time-2');
    if (sim) sim.textContent = t;
    const sum = document.getElementById('summary-time-2');
    if (sum) sum.textContent = t;
  }
  if (schedule.dose3) {
    const t = schedule.dose3.timeStr || `${String(schedule.dose3.hour12).padStart(2, '0')}:${String(schedule.dose3.minute).padStart(2, '0')} ${schedule.dose3.ampm}`;
    const el = document.getElementById('led-time-3');
    if (el) el.textContent = `GPIO 5 • ${t}`;
    const sim = document.getElementById('sim-time-3');
    if (sim) sim.textContent = t;
    const sum = document.getElementById('summary-time-3');
    if (sum) sum.textContent = t;
  }

  // Sync to Home View schedule cards
  const h1 = document.getElementById('home-time-dose-1');
  if (h1 && schedule.dose1) h1.textContent = schedule.dose1.timeStr || `${String(schedule.dose1.hour12).padStart(2, '0')}:${String(schedule.dose1.minute).padStart(2, '0')} ${schedule.dose1.ampm}`;
  const h2 = document.getElementById('home-time-dose-2');
  if (h2 && schedule.dose2) h2.textContent = schedule.dose2.timeStr || `${String(schedule.dose2.hour12).padStart(2, '0')}:${String(schedule.dose2.minute).padStart(2, '0')} ${schedule.dose2.ampm}`;
  const h3 = document.getElementById('home-time-dose-3');
  if (h3 && schedule.dose3) h3.textContent = schedule.dose3.timeStr || `${String(schedule.dose3.hour12).padStart(2, '0')}:${String(schedule.dose3.minute).padStart(2, '0')} ${schedule.dose3.ampm}`;
}

async function loadSchedule() {
  try {
    const res = await fetch('/api/schedule');
    const schedule = await res.json();
    currentArmedSchedule = schedule;

    if (schedule.dose1) {
      if (schedule.dose1.hour12) hDose1.value = schedule.dose1.hour12;
      if (schedule.dose1.minute !== undefined) mDose1.value = schedule.dose1.minute;
      if (schedule.dose1.ampm) ampmDose1.value = schedule.dose1.ampm;
    }
    if (schedule.dose2) {
      if (schedule.dose2.hour12) hDose2.value = schedule.dose2.hour12;
      if (schedule.dose2.minute !== undefined) mDose2.value = schedule.dose2.minute;
      if (schedule.dose2.ampm) ampmDose2.value = schedule.dose2.ampm;
    }
    if (schedule.dose3) {
      if (schedule.dose3.hour12) hDose3.value = schedule.dose3.hour12;
      if (schedule.dose3.minute !== undefined) mDose3.value = schedule.dose3.minute;
      if (schedule.dose3.ampm) ampmDose3.value = schedule.dose3.ampm;
    }

    updateHardwareTwinSchedule(schedule);
  } catch (e) {
    console.warn("Could not load schedule:", e);
  }
}

btnSaveSchedule.addEventListener('click', async () => {
  scheduleSaveStatus.textContent = 'Arming...';
  scheduleSaveStatus.className = 'text-[10px] text-amber-700 bg-amber-50 border border-amber-200 font-mono font-bold px-2.5 py-0.5 rounded-full';

  const payload = {
    dose1: { hour: Number(hDose1.value), minute: Number(mDose1.value), ampm: ampmDose1.value },
    dose2: { hour: Number(hDose2.value), minute: Number(mDose2.value), ampm: ampmDose2.value },
    dose3: { hour: Number(hDose3.value), minute: Number(mDose3.value), ampm: ampmDose3.value }
  };

  // Send schedule directly to connected ESP32 hardware via USB cable
  sendSerialCommand({
    cmd: 'SET_SCHEDULE',
    d1h: Number(hDose1.value),
    d1m: Number(mDose1.value),
    d1pm: ampmDose1.value === 'PM',
    d2h: Number(hDose2.value),
    d2m: Number(mDose2.value),
    d2pm: ampmDose2.value === 'PM',
    d3h: Number(hDose3.value),
    d3m: Number(mDose3.value),
    d3pm: ampmDose3.value === 'PM'
  });

  try {
    const res = await fetch('/api/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (data.success) {
      currentArmedSchedule = data.schedule;
      updateHardwareTwinSchedule(data.schedule);

      scheduleSaveStatus.textContent = 'Armed!';
      scheduleSaveStatus.className = 'text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 font-mono font-bold px-2.5 py-0.5 rounded-full';
      
      // Smoothly hide the drawer after saving
      setTimeout(() => {
        closeScheduleDrawer();
      }, 500);
    }
  } catch (err) {
    scheduleSaveStatus.textContent = 'Error!';
    scheduleSaveStatus.className = 'text-[10px] text-rose-700 bg-rose-50 border border-rose-200 font-mono font-bold px-2.5 py-0.5 rounded-full';
  }
});

// Automatic schedule checker: Runs every second to check if it's medicine time!
function checkLiveScheduleAgainstClock(now) {
  if (!currentArmedSchedule || currentAlarmDose !== null) return;

  let h12 = now.getHours() % 12;
  if (h12 === 0) h12 = 12;
  const min = now.getMinutes();
  const sec = now.getSeconds();
  const ampm = now.getHours() >= 12 ? 'PM' : 'AM';

  if (sec > 2) return;
  if (lastAutoTriggerMinute === min) return;

  // Check Dose 1 (Morning)
  const d1 = currentArmedSchedule.dose1;
  if (d1 && d1.hour12 === h12 && d1.minute === min && d1.ampm === ampm) {
    lastAutoTriggerMinute = min;
    triggerAlarmOnServer(1, 'Morning Dose (Light 1)');
    return;
  }

  // Check Dose 2 (Evening / Afternoon)
  const d2 = currentArmedSchedule.dose2;
  if (d2 && d2.hour12 === h12 && d2.minute === min && d2.ampm === ampm) {
    lastAutoTriggerMinute = min;
    triggerAlarmOnServer(2, 'Evening / Afternoon Dose (Light 2)');
    return;
  }

  // Check Dose 3 (Night)
  const d3 = currentArmedSchedule.dose3;
  if (d3 && d3.hour12 === h12 && d3.minute === min && d3.ampm === ampm) {
    lastAutoTriggerMinute = min;
    triggerAlarmOnServer(3, 'Night Dose (Light 3)');
    return;
  }
}

// Hook checkLiveScheduleAgainstClock into clock tick
setInterval(() => {
  const now = new Date();
  checkLiveScheduleAgainstClock(now);
}, 1000);

// Initialize on page load
window.addEventListener('DOMContentLoaded', () => {
  if (window.location.hash) {
    try {
      history.replaceState(null, '', window.location.pathname + window.location.search);
    } catch (e) {}
  }
  window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
  initTheme();
  connectSSE();
  loadSchedule();
  updateUserProfileUI();
  switchView('home');
});

// ---------------------------------------------------------
// HELP & FAQ MODAL CONTROLLER
// ---------------------------------------------------------
const btnHelpModal = document.getElementById('btn-help-modal');
const helpModalBackdrop = document.getElementById('help-modal-backdrop');
const helpModal = document.getElementById('help-modal');
const btnCloseHelpModal = document.getElementById('btn-close-help-modal');
const btnDoneHelpModal = document.getElementById('btn-done-help-modal');

function openHelpModal() {
  if (!helpModalBackdrop || !helpModal) return;
  helpModalBackdrop.classList.remove('hidden');
  helpModalBackdrop.classList.add('flex');
  requestAnimationFrame(() => {
    helpModalBackdrop.classList.remove('opacity-0');
    helpModal.classList.remove('scale-95');
    helpModal.classList.add('scale-100');
  });
}

function closeHelpModal() {
  if (!helpModalBackdrop || !helpModal) return;
  helpModal.classList.remove('scale-100');
  helpModal.classList.add('scale-95');
  helpModalBackdrop.classList.add('opacity-0');
  setTimeout(() => {
    helpModalBackdrop.classList.remove('flex');
    helpModalBackdrop.classList.add('hidden');
  }, 250);
}

window.openHelpModal = openHelpModal;
window.closeHelpModal = closeHelpModal;

if (btnHelpModal) btnHelpModal.addEventListener('click', openHelpModal);
if (btnCloseHelpModal) btnCloseHelpModal.addEventListener('click', closeHelpModal);
if (btnDoneHelpModal) btnDoneHelpModal.addEventListener('click', closeHelpModal);
if (helpModalBackdrop) {
  helpModalBackdrop.addEventListener('click', (e) => {
    if (e.target === helpModalBackdrop) closeHelpModal();
  });
}

// ---------------------------------------------------------
// ADHERENCE & HEALTH ANALYTICS MODAL CONTROLLER
// ---------------------------------------------------------
const btnOpenAdherenceModal = document.getElementById('btn-open-adherence-modal');
const adherenceModalBackdrop = document.getElementById('adherence-modal-backdrop');
const adherenceModal = document.getElementById('adherence-modal');
const btnCloseAdherenceModal = document.getElementById('btn-close-adherence-modal');
const btnDoneAdherenceModal = document.getElementById('btn-done-adherence-modal');

// Modal Metric Elements
const modalStatAdherence = document.getElementById('modal-stat-adherence');
const modalBadgeCondition = document.getElementById('modal-badge-condition');
const modalStatTaken = document.getElementById('modal-stat-taken');
const modalStatTotal = document.getElementById('modal-stat-total');
const modalBarSuccess = document.getElementById('modal-bar-success');
const modalStatMissed = document.getElementById('modal-stat-missed');
const modalStatMissedDesc = document.getElementById('modal-stat-missed-desc');
const modalStatRisk = document.getElementById('modal-stat-risk');
const modalStatRiskSub = document.getElementById('modal-stat-risk-sub');

const modalDonutLayers = document.getElementById('modal-donut-layers');
const modalCenterPct = document.getElementById('modal-center-pct');
const modalCenterLabel = document.getElementById('modal-center-label');
const modalLegendTaken = document.getElementById('modal-legend-taken');
const modalLegendMissed = document.getElementById('modal-legend-missed');

const modalMorningCount = document.getElementById('modal-morning-count');
const modalMorningCompliance = document.getElementById('modal-morning-compliance');
const modalMorningBar = document.getElementById('modal-morning-bar');

const modalEveningCount = document.getElementById('modal-evening-count');
const modalEveningCompliance = document.getElementById('modal-evening-compliance');
const modalEveningBar = document.getElementById('modal-evening-bar');

const modalNightCount = document.getElementById('modal-night-count');
const modalNightCompliance = document.getElementById('modal-night-compliance');
const modalNightBar = document.getElementById('modal-night-bar');

const modalTimeAnalysisSummary = document.getElementById('modal-time-analysis-summary');
const healthConditionTag = document.getElementById('health-condition-tag');
const healthConditionText = document.getElementById('health-condition-text');
const therapeuticWindowStatus = document.getElementById('therapeutic-window-status');
const relapseRiskStatus = document.getElementById('relapse-risk-status');
const healthRecommendationsList = document.getElementById('health-recommendations-list');

function renderModalDonut(taken, missed) {
  if (!modalDonutLayers) return;
  modalDonutLayers.innerHTML = '';

  const total = taken + missed;
  if (total === 0) {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    const topPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    topPath.setAttribute("d", describeDonutSlice(200, 200, 135, 88, 0, 359.99));
    topPath.setAttribute("fill", "#1e293b");
    topPath.setAttribute("stroke", "#334155");
    topPath.setAttribute("stroke-width", "2");
    topPath.setAttribute("class", "opacity-40");
    g.appendChild(topPath);
    modalDonutLayers.appendChild(g);
    return;
  }

  const isSample = false;
  const tCount = taken;
  const mCount = missed;
  const displayTotal = total;

  const categories = [
    { id: 'taken', rawCount: tCount, count: taken, fill: 'url(#grad-taken-top)' },
    { id: 'missed', rawCount: mCount, count: missed, fill: 'url(#grad-missed-top)' }
  ];

  const cx = 200, cy = 200, rOuter = 135, rInner = 88;
  let currentAngle = 0;

  categories.forEach(cat => {
    if (cat.rawCount <= 0) return;
    const sliceAngle = (cat.rawCount / displayTotal) * 360.0;
    const startAngle = currentAngle;
    const endAngle = currentAngle + sliceAngle;

    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("class", "transition-transform duration-200");

    const topPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    topPath.setAttribute("d", describeDonutSlice(cx, cy, rOuter, rInner, startAngle, endAngle));
    topPath.setAttribute("fill", cat.fill);
    topPath.setAttribute("stroke", "#0e1622");
    topPath.setAttribute("stroke-width", "3");
    g.appendChild(topPath);

    modalDonutLayers.appendChild(g);
    currentAngle += sliceAngle;
  });
}

function updateAdherenceAnalyticsModal() {
  const stats = lastBoxStats || { takenCount: 0, missedCount: 0, totalReminders: 0 };
  const taken = stats.takenCount || 0;
  const missed = stats.missedCount || 0;
  const total = taken + missed;
  const rate = total === 0 ? 0 : Math.round((taken / total) * 100);

  // Top KPIs
  if (modalStatAdherence) modalStatAdherence.textContent = `${rate}%`;
  if (modalStatTaken) modalStatTaken.textContent = taken;
  if (modalStatTotal) modalStatTotal.textContent = `${total} Doses`;
  if (modalBarSuccess) modalBarSuccess.style.width = `${rate}%`;
  if (modalStatMissed) modalStatMissed.textContent = missed;

  // Center Donut text
  if (modalCenterPct) modalCenterPct.textContent = `${rate}%`;
  if (modalLegendTaken) modalLegendTaken.textContent = taken;
  if (modalLegendMissed) modalLegendMissed.textContent = missed;
  if (modalBadgeCondition) {
    if (total === 0) {
      modalBadgeCondition.textContent = 'No Data';
      modalBadgeCondition.className = 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700';
    } else if (rate >= 75) {
      modalBadgeCondition.textContent = 'Stable';
      modalBadgeCondition.className = 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-500/30';
    } else {
      modalBadgeCondition.textContent = 'Attention';
      modalBadgeCondition.className = 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-950/80 text-rose-300 border border-rose-500/30';
    }
  }

  // Chronological time-of-day calculations
  let mTaken = 0, mMissed = 0;
  let eTaken = 0, eMissed = 0;
  let nTaken = 0, nMissed = 0;

  if (cachedAlertsHistory && cachedAlertsHistory.length > 0) {
    cachedAlertsHistory.forEach(a => {
      const d = Number(a.dose);
      const isTk = a.status === 'TAKEN';
      if (d === 1) { if (isTk) mTaken++; else mMissed++; }
      else if (d === 2) { if (isTk) eTaken++; else eMissed++; }
      else if (d === 3) { if (isTk) nTaken++; else nMissed++; }
    });
  } else if (taken > 0) {
    mTaken = Math.ceil(taken / 3);
    eTaken = Math.floor(taken / 3);
    nTaken = taken - mTaken - eTaken;
  }

  const mTotal = mTaken + mMissed;
  const eTotal = eTaken + eMissed;
  const nTotal = nTaken + nMissed;

  const mComp = mTotal === 0 ? 100 : Math.round((mTaken / mTotal) * 100);
  const eComp = eTotal === 0 ? 100 : Math.round((eTaken / eTotal) * 100);
  const nComp = nTotal === 0 ? 100 : Math.round((nTaken / nTotal) * 100);

  if (modalMorningCount) modalMorningCount.textContent = `${mTaken} Taken`;
  if (modalMorningCompliance) modalMorningCompliance.textContent = `${mComp}%`;
  if (modalMorningBar) modalMorningBar.style.width = `${mComp}%`;

  if (modalEveningCount) modalEveningCount.textContent = `${eTaken} Taken`;
  if (modalEveningCompliance) modalEveningCompliance.textContent = `${eComp}%`;
  if (modalEveningBar) modalEveningBar.style.width = `${eComp}%`;

  if (modalNightCount) modalNightCount.textContent = `${nTaken} Taken`;
  if (modalNightCompliance) modalNightCompliance.textContent = `${nComp}%`;
  if (modalNightBar) modalNightBar.style.width = `${nComp}%`;

  // Determine which time has lowest compliance
  let lowestSlot = 'Morning';
  let minComp = mComp;
  if (eComp < minComp) { lowestSlot = 'Afternoon'; minComp = eComp; }
  if (nComp < minComp) { lowestSlot = 'Night'; minComp = nComp; }

  if (modalTimeAnalysisSummary) {
    if (missed === 0) {
      modalTimeAnalysisSummary.innerHTML = `<strong>100% Timing Synchrony:</strong> Morning, Afternoon, and Night routines are perfectly adhered to with 0 missed cycles.`;
    } else {
      modalTimeAnalysisSummary.innerHTML = `<strong>Chronological Pattern:</strong> Your <strong>${lowestSlot}</strong> dose shows the lowest adherence rate (${minComp}%). Consider syncing your ${lowestSlot.toLowerCase()} dose reminder with daily routines like meals or setting extra phone alarms.`;
    }
  }

  // Clinical Health Condition Assessment
  if (rate >= 80) {
    if (modalBadgeCondition) {
      modalBadgeCondition.textContent = 'Stable';
      modalBadgeCondition.className = 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-500/30';
    }
    if (modalCenterLabel) {
      modalCenterLabel.textContent = 'Optimal';
      modalCenterLabel.className = 'text-[9px] text-teal-400 font-bold mt-1';
    }
    if (modalStatMissedDesc) {
      modalStatMissedDesc.textContent = 'No treatment gaps';
      modalStatMissedDesc.className = 'text-[11px] text-emerald-400 block';
    }
    if (modalStatRisk) {
      modalStatRisk.textContent = 'Minimal';
      modalStatRisk.className = 'text-base font-bold text-emerald-400';
    }
    if (modalStatRiskSub) modalStatRiskSub.textContent = 'Consistent plasma levels';

    if (healthConditionTag) {
      healthConditionTag.textContent = 'Stable Prognosis';
      healthConditionTag.className = 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/40';
    }
    if (therapeuticWindowStatus) {
      therapeuticWindowStatus.textContent = '95%+ Maintained';
      therapeuticWindowStatus.className = 'font-bold text-emerald-400';
    }
    if (relapseRiskStatus) {
      relapseRiskStatus.textContent = 'Very Low (< 5%)';
      relapseRiskStatus.className = 'font-bold text-emerald-400';
    }

    if (healthConditionText) {
      healthConditionText.innerHTML = `
        <p><strong class="text-emerald-300">Physiological Equilibrium:</strong> Your medication adherence is exemplary at <strong>${rate}%</strong>. Active chemical compounds are reliably maintained above minimum effective concentrations (MEC) throughout all 24 hours.</p>
        <p>This strict adherence pattern minimizes biochemical fluctuations, drastically lowers the probability of sudden relapses or disease flare-ups, and prevents pharmacodynamic tolerance.</p>
      `;
    }

    if (healthRecommendationsList) {
      healthRecommendationsList.innerHTML = `
        <li class="flex items-start space-x-2">
          <i class="fa-solid fa-check text-emerald-400 text-[10px] mt-1 shrink-0"></i>
          <span><strong>Continue Consistent Regimen:</strong> Maintain current intake schedule. The body's circadian metabolic pathways are well-adjusted.</span>
        </li>
        <li class="flex items-start space-x-2">
          <i class="fa-solid fa-check text-emerald-400 text-[10px] mt-1 shrink-0"></i>
          <span><strong>Hardware Care:</strong> Keep your ESP32 MediBox plugged into power so LED indicators and buzzer remain armed 24/7.</span>
        </li>
        <li class="flex items-start space-x-2">
          <i class="fa-solid fa-check text-emerald-400 text-[10px] mt-1 shrink-0"></i>
          <span><strong>Refill Anticipation:</strong> Schedule your next pill refill with pharmacy ahead of time to prevent supply interruptions.</span>
        </li>
      `;
    }

  } else if (rate >= 50) {
    if (modalBadgeCondition) {
      modalBadgeCondition.textContent = 'At-Risk';
      modalBadgeCondition.className = 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-950/80 text-amber-300 border border-amber-500/30';
    }
    if (modalCenterLabel) {
      modalCenterLabel.textContent = 'Moderate';
      modalCenterLabel.className = 'text-[9px] text-amber-400 font-bold mt-1';
    }
    if (modalStatMissedDesc) {
      modalStatMissedDesc.textContent = `${missed} missed cycles`;
      modalStatMissedDesc.className = 'text-[11px] text-amber-400 block';
    }
    if (modalStatRisk) {
      modalStatRisk.textContent = 'Moderate';
      modalStatRisk.className = 'text-base font-bold text-amber-400';
    }
    if (modalStatRiskSub) modalStatRiskSub.textContent = 'Intermittent plasma dips';

    if (healthConditionTag) {
      healthConditionTag.textContent = 'Fluctuating Prognosis';
      healthConditionTag.className = 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-500/40';
    }
    if (therapeuticWindowStatus) {
      therapeuticWindowStatus.textContent = '65% - 75% Variable';
      therapeuticWindowStatus.className = 'font-bold text-amber-400';
    }
    if (relapseRiskStatus) {
      relapseRiskStatus.textContent = 'Moderate (25% - 40%)';
      relapseRiskStatus.className = 'font-bold text-amber-400';
    }

    if (healthConditionText) {
      healthConditionText.innerHTML = `
        <p><strong class="text-amber-300">Intermittent Therapeutic Lapses:</strong> With an adherence score of <strong>${rate}%</strong> (${missed} missed doses), drug concentrations drop below the optimal therapeutic window during lapsed hours.</p>
        <p>This inconsistency can cause breakthrough symptoms, erratic blood pressure or glycemic swings, and weakens total treatment efficacy over time.</p>
      `;
    }

    if (healthRecommendationsList) {
      healthRecommendationsList.innerHTML = `
        <li class="flex items-start space-x-2">
          <i class="fa-solid fa-triangle-exclamation text-amber-400 text-[10px] mt-1 shrink-0"></i>
          <span><strong>Target Weak Slot:</strong> Pay closer attention to your <strong>${lowestSlot}</strong> dose, which has had the highest lapse frequency.</span>
        </li>
        <li class="flex items-start space-x-2">
          <i class="fa-solid fa-bell text-amber-400 text-[10px] mt-1 shrink-0"></i>
          <span><strong>Increase Volume / Promptness:</strong> Ensure the 10-second buzzer is answered immediately when lights flash.</span>
        </li>
        <li class="flex items-start space-x-2">
          <i class="fa-solid fa-arrows-rotate text-teal-400 text-[10px] mt-1 shrink-0"></i>
          <span><strong>Correct Offline Intakes:</strong> If you took the pill offline without pressing the button, use the Dashboard Activity Log switch to accurately update records.</span>
        </li>
      `;
    }

  } else {
    // Critical / Low Adherence (< 50%)
    if (modalBadgeCondition) {
      modalBadgeCondition.textContent = 'Critical';
      modalBadgeCondition.className = 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-950/80 text-rose-300 border border-rose-500/30';
    }
    if (modalCenterLabel) {
      modalCenterLabel.textContent = 'Low';
      modalCenterLabel.className = 'text-[9px] text-rose-400 font-bold mt-1';
    }
    if (modalStatMissedDesc) {
      modalStatMissedDesc.textContent = 'Frequent lapses';
      modalStatMissedDesc.className = 'text-[11px] text-rose-400 block';
    }
    if (modalStatRisk) {
      modalStatRisk.textContent = 'Elevated Risk';
      modalStatRisk.className = 'text-base font-bold text-rose-400';
    }
    if (modalStatRiskSub) modalStatRiskSub.textContent = 'Sub-therapeutic exposure';

    if (healthConditionTag) {
      healthConditionTag.textContent = 'High Clinical Risk';
      healthConditionTag.className = 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-500/40';
    }
    if (therapeuticWindowStatus) {
      therapeuticWindowStatus.textContent = 'Sub-Therapeutic (< 40%)';
      therapeuticWindowStatus.className = 'font-bold text-rose-400';
    }
    if (relapseRiskStatus) {
      relapseRiskStatus.textContent = 'High (> 60%)';
      relapseRiskStatus.className = 'font-bold text-rose-400';
    }

    if (healthConditionText) {
      healthConditionText.innerHTML = `
        <p><strong class="text-rose-300">Clinical Warning:</strong> Adherence has dropped to <strong>${rate}%</strong>. Medication is not remaining in circulation long enough to exert required therapeutic control.</p>
        <p>Danger of disease acceleration, antimicrobial drug resistance (for antibiotic protocols), acute hypertension spikes, or organ stress due to irregular pharmacological exposure.</p>
      `;
    }

    if (healthRecommendationsList) {
      healthRecommendationsList.innerHTML = `
        <li class="flex items-start space-x-2">
          <i class="fa-solid fa-circle-exclamation text-rose-400 text-[10px] mt-1 shrink-0"></i>
          <span><strong>Consult Healthcare Provider:</strong> Inform your doctor or family caregiver regarding recurring missed doses.</span>
        </li>
        <li class="flex items-start space-x-2">
          <i class="fa-solid fa-clock text-rose-400 text-[10px] mt-1 shrink-0"></i>
          <span><strong>Re-evaluate Schedule Times:</strong> Open the Schedule Drawer in the top menu and adjust dose times to match your daily awakening and sleeping habits.</span>
        </li>
        <li class="flex items-start space-x-2">
          <i class="fa-solid fa-user-doctor text-cyan-400 text-[10px] mt-1 shrink-0"></i>
          <span><strong>Caregiver Supervision:</strong> Enlist family member assistance to ensure MediBox push button is pressed on time.</span>
        </li>
      `;
    }
  }

  // Render modal SVG donut
  renderModalDonut(taken, missed);
}

function openAdherenceModal() {
  if (!adherenceModalBackdrop || !adherenceModal) return;
  updateAdherenceAnalyticsModal();
  adherenceModalBackdrop.classList.remove('hidden');
  adherenceModalBackdrop.classList.add('flex');
  requestAnimationFrame(() => {
    adherenceModalBackdrop.classList.remove('opacity-0');
    adherenceModal.classList.remove('scale-95');
    adherenceModal.classList.add('scale-100');
  });
}

function closeAdherenceModal() {
  if (!adherenceModalBackdrop || !adherenceModal) return;
  adherenceModal.classList.remove('scale-100');
  adherenceModal.classList.add('scale-95');
  adherenceModalBackdrop.classList.add('opacity-0');
  setTimeout(() => {
    adherenceModalBackdrop.classList.remove('flex');
    adherenceModalBackdrop.classList.add('hidden');
  }, 250);
}

window.openAdherenceModal = openAdherenceModal;
window.closeAdherenceModal = closeAdherenceModal;

if (btnOpenAdherenceModal) btnOpenAdherenceModal.addEventListener('click', openAdherenceModal);
if (btnCloseAdherenceModal) btnCloseAdherenceModal.addEventListener('click', closeAdherenceModal);
if (btnDoneAdherenceModal) btnDoneAdherenceModal.addEventListener('click', closeAdherenceModal);
if (adherenceModalBackdrop) {
  adherenceModalBackdrop.addEventListener('click', (e) => {
    if (e.target === adherenceModalBackdrop) closeAdherenceModal();
  });
}

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeHelpModal();
    closeAdherenceModal();
    closeLoginModal();
    closeEditProfileModal();
    if (typeof closeScheduleDrawer === 'function') closeScheduleDrawer();
  }
});

// =========================================================
// VIEW SWITCHER CONTROLLER (Home Portal vs IoT Hardware)
// =========================================================
const viewHome = document.getElementById('view-home');
const viewTelemetry = document.getElementById('view-telemetry');
const navBtnHome = document.getElementById('nav-btn-home');
const navBtnTelemetry = document.getElementById('nav-btn-telemetry');

function switchView(viewName) {
  if (window.location.hash) {
    try {
      history.replaceState(null, '', window.location.pathname + window.location.search);
    } catch (e) {}
  }

  const hwIcons = [
    document.getElementById('nav-btn-telemetry'),
    document.getElementById('nav-btn-logs'),
    document.getElementById('btn-open-schedule-drawer'),
    document.getElementById('btn-open-adherence-modal')
  ];

  if (viewName === 'home') {
    if (viewHome) viewHome.classList.remove('hidden');
    if (viewTelemetry) viewTelemetry.classList.add('hidden');
    if (navBtnHome) {
      navBtnHome.className = 'w-9 h-9 rounded-xl flex items-center justify-center text-teal-400 bg-slate-800/60 transition cursor-pointer';
    }
    // On Home dashboard: ONLY Home, Help, and Logout icons are visible in sidebar
    hwIcons.forEach(el => {
      if (el) el.classList.add('hidden');
    });
  } else {
    // telemetry
    if (viewHome) viewHome.classList.add('hidden');
    if (viewTelemetry) viewTelemetry.classList.remove('hidden');
    if (navBtnHome) {
      navBtnHome.className = 'w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-teal-400 hover:bg-slate-800/40 transition cursor-pointer';
    }
    if (navBtnTelemetry) {
      navBtnTelemetry.className = 'w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-500/40 text-teal-400 flex items-center justify-center text-sm shadow-lg shadow-teal-500/20 hover:scale-105 transition cursor-pointer';
    }
    // Restore all navigation icons in telemetry view
    hwIcons.forEach(el => {
      if (el) el.classList.remove('hidden');
    });
  }

  // Ensure top scroll position without clipping cards under the header
  window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

window.switchView = switchView;

// =========================================================
// DAY / NIGHT THEME CONTROLLER
// =========================================================
function initTheme() {
  const savedTheme = localStorage.getItem('medibox_theme') || 'dark';
  applyTheme(savedTheme);
}

function applyTheme(theme) {
  const themeIcon = document.getElementById('theme-icon');
  if (theme === 'light') {
    document.body.classList.add('light-theme');
    if (themeIcon) {
      themeIcon.className = 'fa-solid fa-sun text-xs text-amber-500';
    }
  } else {
    document.body.classList.remove('light-theme');
    if (themeIcon) {
      themeIcon.className = 'fa-solid fa-moon text-xs text-amber-400';
    }
  }
}

function toggleTheme() {
  const isLight = document.body.classList.contains('light-theme');
  const nextTheme = isLight ? 'dark' : 'light';
  localStorage.setItem('medibox_theme', nextTheme);
  applyTheme(nextTheme);
}

window.toggleTheme = toggleTheme;
window.applyTheme = applyTheme;
window.initTheme = initTheme;

// =========================================================
// USER PROFILE & AUTHENTICATION SYSTEM
// =========================================================
const DEFAULT_USER = {
  userId: 'patient123',
  name: 'Alex Morgan',
  role: 'Patient',
  age: 42,
  bloodGroup: 'O+',
  gender: 'Male',
  patientId: 'MBX-88219',
  physician: 'Dr. Sarah Jenkins, MD',
  emergencyName: 'Martha Morgan (Spouse)',
  emergencyPhone: '+1 (555) 928-3411',
  allergies: 'Penicillin (Severe Urticaria), Shellfish'
};

const DOCTOR_USER = {
  userId: 'dr_jenkins',
  name: 'Dr. Sarah Jenkins',
  role: 'Attending Physician',
  age: 48,
  bloodGroup: 'A+',
  gender: 'Female',
  patientId: 'DOC-1029',
  physician: 'Chief of Cardiology',
  emergencyName: 'St. Jude Hospital Line',
  emergencyPhone: '+1 (555) 019-8392',
  allergies: 'None Documented'
};

function getActiveUser() {
  try {
    const raw = localStorage.getItem('medibox_user');
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return DEFAULT_USER;
}

function saveActiveUser(user) {
  localStorage.setItem('medibox_user', JSON.stringify(user));
  updateUserProfileUI();
}

function updateUserProfileUI() {
  const user = getActiveUser();
  if (!user) return;

  const initials = user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'PT';

  // Header User Pill
  const headerUserAvatar = document.getElementById('header-user-avatar');
  const headerUserName = document.getElementById('header-user-name');
  if (headerUserAvatar) headerUserAvatar.textContent = initials;
  if (headerUserName) headerUserName.textContent = user.name;

  // Home Page Elements
  const homeGreetingName = document.getElementById('home-greeting-name');
  if (homeGreetingName) homeGreetingName.textContent = user.name;

  const profFullName = document.getElementById('prof-full-name');
  if (profFullName) profFullName.textContent = user.name;

  const profPatientId = document.getElementById('prof-patient-id');
  if (profPatientId) profPatientId.textContent = user.patientId || 'MBX-88219';

  const profAvatarInitials = document.getElementById('profile-avatar-initials');
  if (profAvatarInitials) profAvatarInitials.textContent = initials;

  const profAge = document.getElementById('prof-age');
  if (profAge) profAge.textContent = `${user.age} Years`;

  const profBloodGroup = document.getElementById('prof-blood-group');
  if (profBloodGroup) profBloodGroup.textContent = `${user.bloodGroup} Positive`;

  const profGender = document.getElementById('prof-gender');
  if (profGender) profGender.textContent = user.gender;

  const profPhysician = document.getElementById('prof-physician');
  if (profPhysician) profPhysician.textContent = user.physician;

  const profEmergency = document.getElementById('prof-emergency');
  if (profEmergency) profEmergency.textContent = user.emergencyName;

  const profEmergencyPhone = document.getElementById('prof-emergency-phone');
  if (profEmergencyPhone) profEmergencyPhone.textContent = user.emergencyPhone;

  const profAllergies = document.getElementById('prof-allergies');
  if (profAllergies) profAllergies.textContent = user.allergies;
}

// ---------------------------------------------------------
// AUTH MODAL LOGIC
// ---------------------------------------------------------
const authModalBackdrop = document.getElementById('auth-modal-backdrop');
const authModal = document.getElementById('auth-modal');
const loginUserIdInput = document.getElementById('login-userid');
const loginPasswordInput = document.getElementById('login-password');
const authErrorBanner = document.getElementById('auth-error-banner');
const authErrorMsg = document.getElementById('auth-error-msg');

function openLoginModal() {
  if (!authModalBackdrop || !authModal) return;
  if (authErrorBanner) authErrorBanner.classList.add('hidden');
  authModalBackdrop.classList.remove('hidden');
  authModalBackdrop.classList.add('flex');
  requestAnimationFrame(() => {
    authModalBackdrop.classList.remove('opacity-0');
    authModal.classList.remove('scale-95');
    authModal.classList.add('scale-100');
  });
}

function closeLoginModal() {
  if (!authModalBackdrop || !authModal) return;
  authModal.classList.remove('scale-100');
  authModal.classList.add('scale-95');
  authModalBackdrop.classList.add('opacity-0');
  setTimeout(() => {
    authModalBackdrop.classList.remove('flex');
    authModalBackdrop.classList.add('hidden');
  }, 250);
}

function togglePasswordVisibility() {
  if (!loginPasswordInput) return;
  const isPwd = loginPasswordInput.type === 'password';
  loginPasswordInput.type = isPwd ? 'text' : 'password';
  const toggleText = document.getElementById('pwd-toggle-text');
  if (toggleText) toggleText.textContent = isPwd ? 'Hide' : 'Show';
}

function autofillLogin(uid, pwd) {
  if (loginUserIdInput) loginUserIdInput.value = uid;
  if (loginPasswordInput) loginPasswordInput.value = pwd;
  if (authErrorBanner) authErrorBanner.classList.add('hidden');
}

function handleLoginSubmit() {
  const uid = (loginUserIdInput ? loginUserIdInput.value : '').trim();
  const pwd = (loginPasswordInput ? loginPasswordInput.value : '').trim();

  if (!uid || !pwd) {
    if (authErrorBanner) {
      authErrorMsg.textContent = 'Please enter both User ID and Password.';
      authErrorBanner.classList.remove('hidden');
    }
    return;
  }

  // Accept user
  let userObj = DEFAULT_USER;
  if (uid.toLowerCase() === 'dr_jenkins') {
    userObj = DOCTOR_USER;
  } else {
    userObj = { ...DEFAULT_USER, userId: uid };
  }

  saveActiveUser(userObj);
  closeLoginModal();
  switchView('home');
}

function handleLogout() {
  localStorage.removeItem('medibox_user');
  openLoginModal();
}

window.openLoginModal = openLoginModal;
window.closeLoginModal = closeLoginModal;
window.togglePasswordVisibility = togglePasswordVisibility;
window.autofillLogin = autofillLogin;
window.handleLoginSubmit = handleLoginSubmit;
window.handleLogout = handleLogout;

// ---------------------------------------------------------
// EDIT PROFILE MODAL LOGIC
// ---------------------------------------------------------
const editProfileModalBackdrop = document.getElementById('edit-profile-modal-backdrop');
const editProfileModal = document.getElementById('edit-profile-modal');
const editName = document.getElementById('edit-name');
const editAge = document.getElementById('edit-age');
const editBloodGroup = document.getElementById('edit-blood-group');
const editGender = document.getElementById('edit-gender');
const editPhysician = document.getElementById('edit-physician');
const editEmergencyName = document.getElementById('edit-emergency-name');
const editEmergencyPhone = document.getElementById('edit-emergency-phone');
const editAllergies = document.getElementById('edit-allergies');

function openEditProfileModal() {
  if (!editProfileModalBackdrop || !editProfileModal) return;
  const u = getActiveUser();
  if (editName) editName.value = u.name || '';
  if (editAge) editAge.value = u.age || 42;
  if (editBloodGroup) editBloodGroup.value = u.bloodGroup || 'O+';
  if (editGender) editGender.value = u.gender || 'Male';
  if (editPhysician) editPhysician.value = u.physician || '';
  if (editEmergencyName) editEmergencyName.value = u.emergencyName || '';
  if (editEmergencyPhone) editEmergencyPhone.value = u.emergencyPhone || '';
  if (editAllergies) editAllergies.value = u.allergies || '';

  editProfileModalBackdrop.classList.remove('hidden');
  editProfileModalBackdrop.classList.add('flex');
  requestAnimationFrame(() => {
    editProfileModalBackdrop.classList.remove('opacity-0');
    editProfileModal.classList.remove('scale-95');
    editProfileModal.classList.add('scale-100');
  });
}

function closeEditProfileModal() {
  if (!editProfileModalBackdrop || !editProfileModal) return;
  editProfileModal.classList.remove('scale-100');
  editProfileModal.classList.add('scale-95');
  editProfileModalBackdrop.classList.add('opacity-0');
  setTimeout(() => {
    editProfileModalBackdrop.classList.remove('flex');
    editProfileModalBackdrop.classList.add('hidden');
  }, 250);
}

function handleSaveProfileSubmit() {
  const current = getActiveUser();
  const updated = {
    ...current,
    name: editName ? editName.value : current.name,
    age: editAge ? Number(editAge.value) : current.age,
    bloodGroup: editBloodGroup ? editBloodGroup.value : current.bloodGroup,
    gender: editGender ? editGender.value : current.gender,
    physician: editPhysician ? editPhysician.value : current.physician,
    emergencyName: editEmergencyName ? editEmergencyName.value : current.emergencyName,
    emergencyPhone: editEmergencyPhone ? editEmergencyPhone.value : current.emergencyPhone,
    allergies: editAllergies ? editAllergies.value : current.allergies
  };
  saveActiveUser(updated);
  closeEditProfileModal();
}

window.openEditProfileModal = openEditProfileModal;
window.closeEditProfileModal = closeEditProfileModal;
window.handleSaveProfileSubmit = handleSaveProfileSubmit;

// ============================================================================
// HOME HORIZONTAL IMAGE CAROUSEL / SLIDER
// ============================================================================
let currentHomeSlide = 0;
const totalHomeSlides = 4;
let homeSlideInterval = null;

function updateHomeCarousel() {
  const track = document.getElementById('home-carousel-track');
  const dots = document.querySelectorAll('.home-slider-dot');
  if (track) {
    track.style.transform = `translateX(-${currentHomeSlide * 100}%)`;
  }
  dots.forEach((dot, index) => {
    if (index === currentHomeSlide) {
      dot.className = 'home-slider-dot w-2 h-2 rounded-full bg-white shadow-sm shadow-white/80 transition-all cursor-pointer';
    } else {
      dot.className = 'home-slider-dot w-1.5 h-1.5 rounded-full bg-white/40 hover:bg-white/80 transition-all cursor-pointer';
    }
  });
}

function nextHomeSlide() {
  currentHomeSlide = (currentHomeSlide + 1) % totalHomeSlides;
  updateHomeCarousel();
  resetHomeSlideInterval();
}

function prevHomeSlide() {
  currentHomeSlide = (currentHomeSlide - 1 + totalHomeSlides) % totalHomeSlides;
  updateHomeCarousel();
  resetHomeSlideInterval();
}

function goToHomeSlide(index) {
  if (typeof index !== 'number' || index < 0 || index >= totalHomeSlides) return;
  currentHomeSlide = index;
  updateHomeCarousel();
  resetHomeSlideInterval();
}

function resetHomeSlideInterval() {
  if (homeSlideInterval) clearInterval(homeSlideInterval);
  homeSlideInterval = setInterval(() => {
    currentHomeSlide = (currentHomeSlide + 1) % totalHomeSlides;
    updateHomeCarousel();
  }, 4500);
}

// Expose carousel handlers on window for HTML onclick attributes
window.nextHomeSlide = nextHomeSlide;
window.prevHomeSlide = prevHomeSlide;
window.goToHomeSlide = goToHomeSlide;

// Initialize automatic sliding
resetHomeSlideInterval();
