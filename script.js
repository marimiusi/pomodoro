// ==================== TIMER (Pomodoro) ====================
const display = document.getElementById('display');
const modeLabel = document.getElementById('modeLabel');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');
const studyMinInput = document.getElementById('studyMinInput');
const breakMinInput = document.getElementById('breakMinInput');

let studyMinutes = parseInt(localStorage.getItem('studyMinutes')) || 25;
let breakMinutes = parseInt(localStorage.getItem('breakMinutes')) || 5;
studyMinInput.value = studyMinutes;
breakMinInput.value = breakMinutes;

let mode = 'study';
let secondsLeft = studyMinutes * 60;
let timerInterval = null;
let running = false;

let audioCtx = null;
function unlockAudio() {
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) audioCtx = new AC();
  }
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
}
function playChime() {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  const notes = [880, 1108.73, 1318.51];
  notes.forEach(function(freq, i) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const start = now + i * 0.16;
    const end = start + 0.5;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.22, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, end);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(start);
    osc.stop(end + 0.05);
  });
}

function currentModeMinutes() {
  return mode === 'study' ? studyMinutes : breakMinutes;
}

function updateDisplay() {
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const secondsPadded = seconds.toString().padStart(2, '0');
  display.textContent = minutes + ":" + secondsPadded;
}

function updateModeLabel() {
  if (mode === 'study') {
    modeLabel.textContent = 'Study Time';
    modeLabel.classList.remove('break-mode');
    display.classList.remove('break-mode');
  } else {
    modeLabel.textContent = 'Break Time';
    modeLabel.classList.add('break-mode');
    display.classList.add('break-mode');
  }
}

function setButtonsRunning(isRunning) {
  startBtn.disabled = isRunning;
  pauseBtn.disabled = !isRunning;
  studyMinInput.disabled = isRunning;
  breakMinInput.disabled = isRunning;
}

function switchMode() {
  playChime();
  if (mode === 'study') {
    logStudySession(studyMinutes);
    updateQuickStats();
  }
  mode = mode === 'study' ? 'break' : 'study';
  secondsLeft = currentModeMinutes() * 60;
  updateModeLabel();
  updateDisplay();
}

startBtn.addEventListener('click', function() {
  unlockAudio();
  running = true;
  setButtonsRunning(true);
  timerInterval = setInterval(function() {
    secondsLeft = secondsLeft - 1;
    updateDisplay();
    if (secondsLeft <= 0) {
      switchMode();
    }
  }, 1000);
});

pauseBtn.addEventListener('click', function() {
  running = false;
  clearInterval(timerInterval);
  setButtonsRunning(false);
});

resetBtn.addEventListener('click', function() {
  running = false;
  clearInterval(timerInterval);
  setButtonsRunning(false);
  mode = 'study';
  secondsLeft = studyMinutes * 60;
  updateModeLabel();
  updateDisplay();
});

studyMinInput.addEventListener('input', function() {
  const val = parseInt(studyMinInput.value);
  if (!val || val < 1) return;
  studyMinutes = val;
  localStorage.setItem('studyMinutes', studyMinutes);
  queueCloudSync();
  if (mode === 'study' && !running) {
    secondsLeft = studyMinutes * 60;
    updateDisplay();
  }
});

breakMinInput.addEventListener('input', function() {
  const val = parseInt(breakMinInput.value);
  if (!val || val < 1) return;
  breakMinutes = val;
  localStorage.setItem('breakMinutes', breakMinutes);
  queueCloudSync();
  if (mode === 'break' && !running) {
    secondsLeft = breakMinutes * 60;
    updateDisplay();
  }
});

updateDisplay();
updateModeLabel();

function formatMinutes(mins) {
  if (mins < 60) return mins + 'm';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h + 'h' + (m ? ' ' + m + 'm' : '');
}

// ==================== QUICK STATS & DAILY MOTIVATION ====================
const quickStatToday = document.getElementById('quickStatToday');
const quickStatSessions = document.getElementById('quickStatSessions');

const editQuoteBtn = document.getElementById('editQuoteBtn');
const saveQuoteBtn = document.getElementById('saveQuoteBtn');
const quoteEditInput = document.getElementById('quoteEditInput');
const quoteDisplayView = document.getElementById('quoteDisplayView');
const quoteEditView = document.getElementById('quoteEditView');
const quoteDisplay = document.getElementById('quoteDisplay');

const DEFAULT_QUOTE = "You've got this! 💪";

function getQuote() {
  return localStorage.getItem('dailyQuote') || DEFAULT_QUOTE;
}
function saveQuote(text) {
  localStorage.setItem('dailyQuote', text);
  queueCloudSync();
}
function renderQuote() {
  quoteDisplay.textContent = getQuote();
}

editQuoteBtn.addEventListener('click', function() {
  quoteEditInput.value = getQuote();
  quoteDisplayView.style.display = 'none';
  quoteEditView.style.display = 'block';
  quoteEditInput.focus();
});

saveQuoteBtn.addEventListener('click', function() {
  const text = quoteEditInput.value.trim();
  saveQuote(text === '' ? DEFAULT_QUOTE : text);
  renderQuote();
  quoteDisplayView.style.display = 'block';
  quoteEditView.style.display = 'none';
});

quoteEditInput.addEventListener('keydown', function(e) {
  if (e.key === 'Enter') saveQuoteBtn.click();
});

renderQuote();

function getStudySessions() {
  const stored = localStorage.getItem('studySessions');
  return stored ? JSON.parse(stored) : [];
}
function saveStudySessions(sessions) {
  localStorage.setItem('studySessions', JSON.stringify(sessions));
  queueCloudSync();
}
function logStudySession(minutes) {
  const now = new Date();
  const sessions = getStudySessions();
  sessions.push({
    date: dateKey(now.getFullYear(), now.getMonth(), now.getDate()),
    minutes: minutes,
    id: 's-' + Date.now() + Math.random().toString(36).slice(2)
  });
  saveStudySessions(sessions);
}

function updateQuickStats() {
  const sessions = getStudySessions();
  const now = new Date();
  const todayKey = dateKey(now.getFullYear(), now.getMonth(), now.getDate());

  let todayMinutes = 0;
  let todayCount = 0;
  sessions.forEach(function(s) {
    if (s.date === todayKey) {
      todayMinutes += s.minutes;
      todayCount += 1;
    }
  });

  quickStatToday.textContent = formatMinutes(todayMinutes);
  quickStatSessions.textContent = todayCount;
}

// Initialize
updateQuickStats();

const notesTab = document.getElementById('notesTab');
const notesPanel = document.getElementById('notesPanel');
const checklistTab = document.getElementById('checklistTab');
const checklistPanel = document.getElementById('checklistPanel');
const calendarTab = document.getElementById('calendarTab');
const calendarPanel = document.getElementById('calendarPanel');
const reportTab = document.getElementById('reportTab');
const reportPanel = document.getElementById('reportPanel');
const themeTab = document.getElementById('themeTab');
const themePanel = document.getElementById('themePanel');
const resetTab = document.getElementById('resetTab');
const resetPanel = document.getElementById('resetPanel');
const signInTab = document.getElementById('signInTab');
const signInPanel = document.getElementById('signInPanel');

function closeAllPanels() {
  notesPanel.classList.remove('open');
  checklistPanel.classList.remove('open');
  calendarPanel.classList.remove('open');
  reportPanel.classList.remove('open');
  themePanel.classList.remove('open');
  resetPanel.classList.remove('open');
  signInPanel.classList.remove('open');
}

function wireTab(tab, panel) {
  tab.addEventListener('click', function() {
    const wasOpen = panel.classList.contains('open');
    closeAllPanels();
    if (!wasOpen) panel.classList.add('open');
  });
}

wireTab(notesTab, notesPanel);
wireTab(checklistTab, checklistPanel);
wireTab(calendarTab, calendarPanel);
wireTab(themeTab, themePanel);
wireTab(resetTab, resetPanel);
wireTab(signInTab, signInPanel);

reportTab.addEventListener('click', function() {
  const wasOpen = reportPanel.classList.contains('open');
  closeAllPanels();
  if (!wasOpen) {
    reportPanel.classList.add('open');
    renderReport();
  }
});

document.querySelectorAll('.back-btn').forEach(function(btn) {
  btn.addEventListener('click', closeAllPanels);
});

const notesHeaderText = document.getElementById('notesHeaderText');
const notesFolderView = document.getElementById('notesFolderView');
const notesListView = document.getElementById('notesListView');
const noteEditorView = document.getElementById('noteEditorView');

const newFolderInput = document.getElementById('newFolderInput');
const addFolderBtn = document.getElementById('addFolderBtn');
const folderListUl = document.getElementById('folderListUl');
const folderEmptyHint = document.getElementById('folderEmptyHint');

const folderBackBtn = document.getElementById('folderBackBtn');
const newNoteInput = document.getElementById('newNoteInput');
const addNoteBtn = document.getElementById('addNoteBtn');
const noteListUl = document.getElementById('noteListUl');
const noteEmptyHint = document.getElementById('noteEmptyHint');

const noteBackBtn = document.getElementById('noteBackBtn');
const noteTitleInput = document.getElementById('noteTitleInput');
const noteContentTextarea = document.getElementById('noteContentTextarea');
const saveNoteBtn = document.getElementById('saveNoteBtn');
const noteSavedHint = document.getElementById('noteSavedHint');

function getNotesData() {
  const stored = localStorage.getItem('notesData');
  if (stored) return JSON.parse(stored);

  const oldNote = localStorage.getItem('notesText');
  const data = { folders: [] };
  if (oldNote && oldNote.trim() !== '') {
    data.folders.push({
      id: 'f-' + Date.now(),
      name: 'General',
      notes: [{ id: 'n-' + Date.now(), title: 'Old note', content: oldNote }]
    });
    localStorage.removeItem('notesText');
    saveNotesData(data);
  }
  return data;
}
function saveNotesData(data) {
  localStorage.setItem('notesData', JSON.stringify(data));
  queueCloudSync();
}

let currentFolderId = null;
let currentNoteId = null;

function showNotesView(viewName) {
  notesFolderView.style.display = viewName === 'folders' ? 'flex' : 'none';
  notesListView.style.display = viewName === 'notes' ? 'flex' : 'none';
  noteEditorView.style.display = viewName === 'editor' ? 'flex' : 'none';
}

function findFolder(data, folderId) {
  return data.folders.find(function(f) { return f.id === folderId; });
}

function renderFolderList() {
  const data = getNotesData();
  notesHeaderText.textContent = 'Notes';
  folderListUl.innerHTML = '';
  folderEmptyHint.style.display = data.folders.length === 0 ? 'block' : 'none';
  data.folders.forEach(function(folder) {
    const li = document.createElement('li');
    const labelDiv = document.createElement('div');
    labelDiv.className = 'item-label';
    labelDiv.innerHTML = '<span class="icon">📁</span><span class="item-name">' +
      escapeHtml(folder.name) + '</span><span class="item-sub">' + folder.notes.length + '</span>';
    labelDiv.addEventListener('click', function() {
      currentFolderId = folder.id;
      renderNoteList();
      showNotesView('notes');
    });
    const delBtn = document.createElement('button');
    delBtn.className = 'delete-btn';
    delBtn.textContent = '✕';
    delBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      if (!confirm('Delete "' + folder.name + '" and all its notes?')) return;
      const d = getNotesData();
      d.folders = d.folders.filter(function(f) { return f.id !== folder.id; });
      saveNotesData(d);
      renderFolderList();
    });
    li.appendChild(labelDiv);
    li.appendChild(delBtn);
    folderListUl.appendChild(li);
  });
}

function renderNoteList() {
  const data = getNotesData();
  const folder = findFolder(data, currentFolderId);
  if (!folder) { showNotesView('folders'); renderFolderList(); return; }
  notesHeaderText.textContent = folder.name;
  noteListUl.innerHTML = '';
  noteEmptyHint.style.display = folder.notes.length === 0 ? 'block' : 'none';
  folder.notes.forEach(function(note) {
    const li = document.createElement('li');
    const labelDiv = document.createElement('div');
    labelDiv.className = 'item-label';
    labelDiv.innerHTML = '<span class="icon">📝</span><span class="item-name">' +
      escapeHtml(note.title || 'Untitled') + '</span>';
    labelDiv.addEventListener('click', function() {
      currentNoteId = note.id;
      noteTitleInput.value = note.title;
      noteContentTextarea.value = note.content;
      showNotesView('editor');
    });
    const delBtn = document.createElement('button');
    delBtn.className = 'delete-btn';
    delBtn.textContent = '✕';
    delBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      if (!confirm('Delete this note?')) return;
      const d = getNotesData();
      const f = findFolder(d, currentFolderId);
      f.notes = f.notes.filter(function(n) { return n.id !== note.id; });
      saveNotesData(d);
      renderNoteList();
    });
    li.appendChild(labelDiv);
    li.appendChild(delBtn);
    noteListUl.appendChild(li);
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

addFolderBtn.addEventListener('click', function() {
  const name = newFolderInput.value.trim();
  if (name === '') return;
  const data = getNotesData();
  data.folders.push({ id: 'f-' + Date.now() + Math.random().toString(36).slice(2), name: name, notes: [] });
  saveNotesData(data);
  newFolderInput.value = '';
  renderFolderList();
});
newFolderInput.addEventListener('keydown', function(e) {
  if (e.key === 'Enter') addFolderBtn.click();
});

folderBackBtn.addEventListener('click', function() {
  currentFolderId = null;
  showNotesView('folders');
  renderFolderList();
});

addNoteBtn.addEventListener('click', function() {
  const title = newNoteInput.value.trim();
  if (title === '') return;
  const data = getNotesData();
  const folder = findFolder(data, currentFolderId);
  if (!folder) return;
  folder.notes.push({ id: 'n-' + Date.now() + Math.random().toString(36).slice(2), title: title, content: '' });
  saveNotesData(data);
  newNoteInput.value = '';
  renderNoteList();
});
newNoteInput.addEventListener('keydown', function(e) {
  if (e.key === 'Enter') addNoteBtn.click();
});

noteBackBtn.addEventListener('click', function() {
  currentNoteId = null;
  showNotesView('notes');
  renderNoteList();
});

function saveCurrentNote() {
  if (!currentFolderId || !currentNoteId) return;
  const data = getNotesData();
  const folder = findFolder(data, currentFolderId);
  if (!folder) return;
  const note = folder.notes.find(function(n) { return n.id === currentNoteId; });
  if (!note) return;
  note.title = noteTitleInput.value.trim() || 'Untitled';
  note.content = noteContentTextarea.value;
  saveNotesData(data);
}

let noteSavedHintTimeout = null;
function flashSavedHint() {
  noteSavedHint.classList.add('show');
  clearTimeout(noteSavedHintTimeout);
  noteSavedHintTimeout = setTimeout(function() {
    noteSavedHint.classList.remove('show');
  }, 1400);
}

noteTitleInput.addEventListener('input', saveCurrentNote);
noteContentTextarea.addEventListener('input', saveCurrentNote);
saveNoteBtn.addEventListener('click', function() {
  saveCurrentNote();
  renderNoteList();
  flashSavedHint();
});

renderFolderList();
showNotesView('folders');

const checklistInput = document.getElementById('checklistInput');
const addItemBtn = document.getElementById('addItemBtn');
const checklistList = document.getElementById('checklistList');

function getSavedItems() {
  const stored = localStorage.getItem('checklistItems');
  return stored ? JSON.parse(stored) : [];
}
function saveItems(items) {
  localStorage.setItem('checklistItems', JSON.stringify(items));
  queueCloudSync();
}
function renderChecklist() {
  const items = getSavedItems();
  checklistList.innerHTML = '';
  items.forEach(function(item) {
    const li = document.createElement('li');
    if (item.checked) li.classList.add('done');

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = item.checked;
    checkbox.addEventListener('change', function() {
      const all = getSavedItems();
      const match = all.find(function(i) { return i.id === item.id; });
      if (match) match.checked = checkbox.checked;
      saveItems(all);
      renderChecklist();
    });

    const span = document.createElement('span');
    span.className = 'task-text';
    span.textContent = item.text;

    const delBtn = document.createElement('button');
    delBtn.className = 'delete-btn';
    delBtn.textContent = '✕';
    delBtn.addEventListener('click', function() {
      const all = getSavedItems().filter(function(i) { return i.id !== item.id; });
      saveItems(all);
      renderChecklist();
    });

    li.appendChild(checkbox);
    li.appendChild(span);
    li.appendChild(delBtn);
    checklistList.appendChild(li);
  });
}
(function migrateChecklist() {
  const items = getSavedItems();
  let changed = false;
  items.forEach(function(item) {
    if (!item.id) { item.id = 'c-' + Date.now() + Math.random().toString(36).slice(2); changed = true; }
  });
  if (changed) saveItems(items);
})();
renderChecklist();

addItemBtn.addEventListener('click', function() {
  const text = checklistInput.value.trim();
  if (text === '') return;
  const items = getSavedItems();
  items.push({ text: text, checked: false, id: 'c-' + Date.now() + Math.random().toString(36).slice(2) });
  saveItems(items);
  checklistInput.value = '';
  renderChecklist();
});
checklistInput.addEventListener('keydown', function(e) {
  if (e.key === 'Enter') addItemBtn.click();
});

const calMonthLabel = document.getElementById('calMonthLabel');
const calGrid = document.getElementById('calGrid');
const prevMonthBtn = document.getElementById('prevMonthBtn');
const nextMonthBtn = document.getElementById('nextMonthBtn');
const selectedDateLabel = document.getElementById('selectedDateLabel');
const eventInput = document.getElementById('eventInput');
const addEventBtn = document.getElementById('addEventBtn');
const eventList = document.getElementById('eventList');
const noEventsMsg = document.getElementById('noEventsMsg');

const today = new Date();
let viewYear = today.getFullYear();
let viewMonth = today.getMonth();

function dateKey(year, month, day) {
  const mm = (month + 1).toString().padStart(2, '0');
  const dd = day.toString().padStart(2, '0');
  return year + '-' + mm + '-' + dd;
}
let selectedKey = dateKey(viewYear, viewMonth, today.getDate());

const monthNames = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December'];
const dowNames = ['Su','Mo','Tu','We','Th','Fr','Sa'];
const weekdayFmt = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

function getAllEvents() {
  const stored = localStorage.getItem('calendarEvents');
  return stored ? JSON.parse(stored) : {};
}
function saveAllEvents(eventsObj) {
  localStorage.setItem('calendarEvents', JSON.stringify(eventsObj));
  queueCloudSync();
}
function getEventsForKey(key) {
  const all = getAllEvents();
  return all[key] || [];
}

function renderCalendar() {
  calMonthLabel.textContent = monthNames[viewMonth] + ' ' + viewYear;
  calGrid.innerHTML = '';
  const allEvents = getAllEvents();

  dowNames.forEach(function(d) {
    const el = document.createElement('div');
    el.className = 'cal-dow';
    el.textContent = d;
    calGrid.appendChild(el);
  });
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  for (let i = 0; i < firstDay; i++) {
    const empty = document.createElement('div');
    empty.className = 'cal-day empty';
    calGrid.appendChild(empty);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const el = document.createElement('div');
    el.className = 'cal-day';
    el.textContent = day;
    const key = dateKey(viewYear, viewMonth, day);
    const isToday = day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
    if (isToday) el.classList.add('today');
    if (key === selectedKey) el.classList.add('selected');
    if (allEvents[key] && allEvents[key].length > 0) {
      const dot = document.createElement('div');
      dot.className = 'event-dot';
      el.appendChild(dot);
    }
    el.addEventListener('click', function() {
      selectedKey = key;
      renderCalendar();
      renderDayEvents();
    });
    calGrid.appendChild(el);
  }
}

function keyToDate(key) {
  const parts = key.split('-').map(Number);
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function renderDayEvents() {
  selectedDateLabel.textContent = weekdayFmt.format(keyToDate(selectedKey));
  eventList.innerHTML = '';
  const items = getEventsForKey(selectedKey);
  noEventsMsg.style.display = items.length === 0 ? 'block' : 'none';
  items.forEach(function(item) {
    const li = document.createElement('li');
    const span = document.createElement('span');
    span.className = 'event-text';
    span.textContent = item.text;
    const delBtn = document.createElement('button');
    delBtn.className = 'delete-btn';
    delBtn.textContent = '✕';
    delBtn.addEventListener('click', function() {
      const all = getAllEvents();
      all[selectedKey] = (all[selectedKey] || []).filter(function(i) { return i.id !== item.id; });
      if (all[selectedKey].length === 0) delete all[selectedKey];
      saveAllEvents(all);
      renderDayEvents();
      renderCalendar();
    });
    li.appendChild(span);
    li.appendChild(delBtn);
    eventList.appendChild(li);
  });
}

function addEvent() {
  const text = eventInput.value.trim();
  if (text === '') return;
  const all = getAllEvents();
  if (!all[selectedKey]) all[selectedKey] = [];
  all[selectedKey].push({ text: text, id: Date.now().toString() + Math.random().toString(36).slice(2) });
  saveAllEvents(all);
  eventInput.value = '';
  renderDayEvents();
  renderCalendar();
}

addEventBtn.addEventListener('click', addEvent);
eventInput.addEventListener('keydown', function(e) {
  if (e.key === 'Enter') addEvent();
});

prevMonthBtn.addEventListener('click', function() {
  viewMonth -= 1;
  if (viewMonth < 0) { viewMonth = 11; viewYear -= 1; }
  renderCalendar();
});
nextMonthBtn.addEventListener('click', function() {
  viewMonth += 1;
  if (viewMonth > 11) { viewMonth = 0; viewYear += 1; }
  renderCalendar();
});
renderCalendar();
renderDayEvents();

const statToday = document.getElementById('statToday');
const statWeek = document.getElementById('statWeek');
const statAll = document.getElementById('statAll');
const barChart = document.getElementById('barChart');
const sessionListUl = document.getElementById('sessionListUl');
const sessionEmptyHint = document.getElementById('sessionEmptyHint');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');
const barDayFmt = new Intl.DateTimeFormat(undefined, { weekday: 'short' });
const sessionDateFmt = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });

function renderReport() {
  const sessions = getStudySessions();
  const now = new Date();
  const todayKey = dateKey(now.getFullYear(), now.getMonth(), now.getDate());

  const last7Keys = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    last7Keys.push(dateKey(d.getFullYear(), d.getMonth(), d.getDate()));
  }

  let todayMinutes = 0;
  let weekMinutes = 0;
  let allMinutes = 0;
  const byDay = {};
  last7Keys.forEach(function(k) { byDay[k] = 0; });

  sessions.forEach(function(s) {
    allMinutes += s.minutes;
    if (s.date === todayKey) todayMinutes += s.minutes;
    if (byDay.hasOwnProperty(s.date)) {
      weekMinutes += s.minutes;
      byDay[s.date] += s.minutes;
    }
  });

  statToday.textContent = formatMinutes(todayMinutes);
  statWeek.textContent = formatMinutes(weekMinutes);
  statAll.textContent = formatMinutes(allMinutes);

  const maxVal = Math.max.apply(null, last7Keys.map(function(k) { return byDay[k]; }).concat([1]));
  barChart.innerHTML = '';
  last7Keys.forEach(function(k) {
    const col = document.createElement('div');
    col.className = 'bar-col';
    const fill = document.createElement('div');
    fill.className = 'bar-fill';
    const pct = Math.max((byDay[k] / maxVal) * 100, byDay[k] > 0 ? 6 : 2);
    fill.style.height = pct + '%';
    fill.title = formatMinutes(byDay[k]);
    const label = document.createElement('div');
    label.className = 'bar-day-label';
    label.textContent = barDayFmt.format(keyToDate(k));
    col.appendChild(fill);
    col.appendChild(label);
    barChart.appendChild(col);
  });

  sessionListUl.innerHTML = '';
  const sorted = sessions.slice().reverse();
  sessionEmptyHint.style.display = sorted.length === 0 ? 'block' : 'none';
  sorted.forEach(function(s) {
    const li = document.createElement('li');
    const labelDiv = document.createElement('div');
    labelDiv.className = 'item-label';
    labelDiv.innerHTML = '<span class="icon">⏱️</span><span class="item-name">' +
      sessionDateFmt.format(keyToDate(s.date)) + '</span><span class="item-sub">' + formatMinutes(s.minutes) + '</span>';
    const delBtn = document.createElement('button');
    delBtn.className = 'delete-btn';
    delBtn.textContent = '✕';
    delBtn.addEventListener('click', function() {
      const all = getStudySessions().filter(function(i) { return i.id !== s.id; });
      saveStudySessions(all);
      renderReport();
    });
    li.appendChild(labelDiv);
    li.appendChild(delBtn);
    sessionListUl.appendChild(li);
  });
}

clearHistoryBtn.addEventListener('click', function() {
  if (!confirm('Clear all study history? This can\'t be undone.')) return;
  saveStudySessions([]);
  renderReport();
});

const swatchRow = document.getElementById('swatchRow');
const accentColorCustomInput = document.getElementById('accentColorCustomInput');
const darkVariantSwatchRow = document.getElementById('darkVariantSwatchRow');
const darkVariantRow = document.getElementById('darkVariantRow');
const bgFileInput = document.getElementById('bgFileInput');
const removeBgBtn = document.getElementById('removeBgBtn');

const cardColorSwatchRow = document.getElementById('cardColorSwatchRow');
const cardColorCustomInput = document.getElementById('cardColorCustomInput');
const resetCardColorBtn = document.getElementById('resetCardColorBtn');

const bgColorSwatchRow = document.getElementById('bgColorSwatchRow');
const bgColorCustomInput = document.getElementById('bgColorCustomInput');
const resetBgColorBtn = document.getElementById('resetBgColorBtn');

const presetColors = ['#D6336C', '#E8590C', '#2F9E44', '#1971C2', '#7048E8', '#495057'];
const DEFAULT_COLOR = '#D6336C';

const bgColorPresets = ['#FDF6E3', '#EAF7ED', '#E7F0FB', '#F5E9F7', '#232323'];
const cardColorPresets = ['#FFFFFF', '#FFF3F7', '#FDF6E3', '#EAF7ED', '#241A21'];

const darkVariants = {
  dark: { label: 'Dark', swatch: '#241A21', bgCard: '#241A21', bgPanel: '#1C1418', inputBg: '#2E2129', accentPale: '#2A1C22' },
  ash:  { label: 'Ash',  swatch: '#2B2B2E', bgCard: '#2B2B2E', bgPanel: '#232326', inputBg: '#333338', accentPale: '#302F33' },
  onyx: { label: 'Onyx', swatch: '#131315', bgCard: '#131315', bgPanel: '#0D0D0F', inputBg: '#1C1C1F', accentPale: '#19191C' }
};
const DEFAULT_DARK_VARIANT = 'dark';

function shadeColor(hex, percent) {
  const num = parseInt(hex.replace('#', ''), 16);
  let r = (num >> 16) + Math.round(2.55 * percent);
  let g = ((num >> 8) & 0x00FF) + Math.round(2.55 * percent);
  let b = (num & 0x0000FF) + Math.round(2.55 * percent);
  r = Math.max(Math.min(255, r), 0);
  g = Math.max(Math.min(255, g), 0);
  b = Math.max(Math.min(255, b), 0);
  return '#' + [r, g, b].map(function(v) { return v.toString(16).padStart(2, '0'); }).join('');
}

function getContrastTextColor(hex) {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = (num >> 16) & 0xFF;
  const g = (num >> 8) & 0xFF;
  const b = num & 0xFF;
  const luminance = (r * 299 + g * 587 + b * 114) / 1000;
  return luminance >= 150 ? '#2A1420' : '#FFFFFF';
}

function updateSwatchSelectionIn(container, colorOrDefault) {
  container.querySelectorAll('.swatch').forEach(function(sw) {
    sw.classList.toggle('selected', !!colorOrDefault && sw.dataset.color.toLowerCase() === colorOrDefault.toLowerCase());
  });
}

function buildSwatches(container, colors, onPick) {
  colors.forEach(function(color) {
    const sw = document.createElement('div');
    sw.className = 'swatch';
    sw.style.background = color;
    sw.dataset.color = color;
    sw.addEventListener('click', function() { onPick(color); });
    container.appendChild(sw);
  });
}

function buildSwatchesWithDefault(container, colors, onPick, onDefault, defaultCss) {
  const defaultSw = document.createElement('div');
  defaultSw.className = 'swatch';
  defaultSw.style.background = defaultCss;
  defaultSw.dataset.color = 'default';
  defaultSw.title = 'Default';
  defaultSw.addEventListener('click', onDefault);
  container.appendChild(defaultSw);
  buildSwatches(container, colors, onPick);
}

function applyTheme(color) {
  document.documentElement.style.setProperty('--accent', color);
  document.documentElement.style.setProperty('--accent-dark', shadeColor(color, -18));
  document.documentElement.style.setProperty('--accent-light', shadeColor(color, 72));
  document.documentElement.style.setProperty('--accent-pale', shadeColor(color, 90));
  document.documentElement.style.setProperty('--btn-text', getContrastTextColor(color));
  localStorage.setItem('themeColor', color);
  accentColorCustomInput.value = color;
  updateSwatchSelectionIn(swatchRow, color);
}

function resetAccentColor() {
  document.documentElement.style.removeProperty('--accent');
  document.documentElement.style.removeProperty('--accent-dark');
  document.documentElement.style.removeProperty('--accent-light');
  document.documentElement.style.removeProperty('--accent-pale');
  document.documentElement.style.removeProperty('--btn-text');
  localStorage.removeItem('themeColor');
  accentColorCustomInput.value = DEFAULT_COLOR;
  updateSwatchSelectionIn(swatchRow, 'default');
}

buildSwatchesWithDefault(
  swatchRow, presetColors, applyTheme, function() { applyTheme(DEFAULT_COLOR); },
  'linear-gradient(135deg, ' + DEFAULT_COLOR + ', #FBD3E2 55%, #FFE7EF)'
);
accentColorCustomInput.addEventListener('input', function() { applyTheme(accentColorCustomInput.value); });
const savedColor = localStorage.getItem('themeColor') || DEFAULT_COLOR;
applyTheme(savedColor);
if (!localStorage.getItem('themeColor')) updateSwatchSelectionIn(swatchRow, 'default');

function applyCardColor(color) {
  document.body.style.setProperty('--bg-card', color);
  localStorage.setItem('cardColor', color);
  cardColorCustomInput.value = color;
  updateSwatchSelectionIn(cardColorSwatchRow, color);
}

function resetCardColor() {
  document.body.style.removeProperty('--bg-card');
  localStorage.removeItem('cardColor');
  updateSwatchSelectionIn(cardColorSwatchRow, 'default');
  cardColorCustomInput.value = getComputedStyle(document.body).getPropertyValue('--bg-card').trim() || '#FFFFFF';
}

buildSwatchesWithDefault(
  cardColorSwatchRow, cardColorPresets, applyCardColor, resetCardColor,
  'linear-gradient(135deg, #FFFFFF, var(--accent-pale) 55%, var(--accent-light))'
);
cardColorCustomInput.addEventListener('input', function() { applyCardColor(cardColorCustomInput.value); });
resetCardColorBtn.addEventListener('click', resetCardColor);

const savedCardColor = localStorage.getItem('cardColor');
if (savedCardColor) { applyCardColor(savedCardColor); } else { updateSwatchSelectionIn(cardColorSwatchRow, 'default'); }

function applyBgColor(color) {
  document.body.style.backgroundImage = 'none';
  document.body.style.backgroundColor = color;
  localStorage.setItem('bgColor', color);
  localStorage.removeItem('bgImage');
  bgColorCustomInput.value = color;
  updateSwatchSelectionIn(bgColorSwatchRow, color);
}

function resetBgColor() {
  document.body.style.backgroundImage = '';
  document.body.style.backgroundColor = '';
  localStorage.removeItem('bgColor');
  updateSwatchSelectionIn(bgColorSwatchRow, 'default');
  const savedBgImg = localStorage.getItem('bgImage');
  if (savedBgImg) applyBackgroundImage(savedBgImg);
}

buildSwatchesWithDefault(
  bgColorSwatchRow, bgColorPresets, applyBgColor, resetBgColor,
  'linear-gradient(135deg, var(--accent-light), var(--accent-pale) 55%, var(--accent))'
);
bgColorCustomInput.addEventListener('input', function() { applyBgColor(bgColorCustomInput.value); });
resetBgColorBtn.addEventListener('click', resetBgColor);

const savedBgColor = localStorage.getItem('bgColor');
if (savedBgColor) { applyBgColor(savedBgColor); } else { updateSwatchSelectionIn(bgColorSwatchRow, 'default'); }

const darkModeToggle = document.getElementById('darkModeToggle');
function applyDarkMode(isDark) {
  document.body.classList.toggle('dark-mode', isDark);
  darkModeToggle.checked = isDark;
  localStorage.setItem('darkMode', isDark ? '1' : '0');
  darkVariantRow.style.display = isDark ? 'block' : 'none';
  if (isDark) {
    applyDarkVariant(localStorage.getItem('darkVariant') || DEFAULT_DARK_VARIANT);
  } else {
    document.body.style.removeProperty('--bg-panel');
    document.body.style.removeProperty('--input-bg');
    document.body.style.removeProperty('--accent-pale');
    if (!localStorage.getItem('cardColor')) document.body.style.removeProperty('--bg-card');
    darkVariantSwatchRow.querySelectorAll('.swatch').forEach(function(sw) { sw.classList.remove('selected'); });
  }
}
darkModeToggle.addEventListener('change', function() {
  applyDarkMode(darkModeToggle.checked);
});

function applyDarkVariant(key) {
  const v = darkVariants[key] || darkVariants[DEFAULT_DARK_VARIANT];
  document.body.style.setProperty('--bg-panel', v.bgPanel);
  document.body.style.setProperty('--input-bg', v.inputBg);
  document.body.style.setProperty('--accent-pale', v.accentPale);
  if (!localStorage.getItem('cardColor')) {
    document.body.style.setProperty('--bg-card', v.bgCard);
  }
  localStorage.setItem('darkVariant', key);
  darkVariantSwatchRow.querySelectorAll('.swatch').forEach(function(sw) {
    sw.classList.toggle('selected', sw.dataset.variant === key);
  });
}

Object.keys(darkVariants).forEach(function(key) {
  const v = darkVariants[key];
  const sw = document.createElement('div');
  sw.className = 'swatch';
  sw.style.background = v.swatch;
  sw.title = v.label;
  sw.dataset.variant = key;
  sw.addEventListener('click', function() { applyDarkVariant(key); });
  darkVariantSwatchRow.appendChild(sw);
});

applyDarkMode(localStorage.getItem('darkMode') === '1');

const MAX_IMAGE_CHARS = 1200000;

function applyBackgroundImage(dataUrl) {
  document.body.style.backgroundColor = '';
  document.body.style.backgroundImage = 'url(' + dataUrl + ')';
  localStorage.removeItem('bgColor');
  updateSwatchSelectionIn(bgColorSwatchRow, null);
}

function clearBackgroundImage() {
  document.body.style.backgroundImage = '';
  localStorage.removeItem('bgImage');
}

bgFileInput.addEventListener('change', function() {
  const file = bgFileInput.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function() {
    const dataUrl = reader.result;
    if (dataUrl.length > MAX_IMAGE_CHARS) {
      alert('That image is a bit too large to save — try a smaller photo (under ~1MB).');
      return;
    }
    try {
      localStorage.setItem('bgImage', dataUrl);
      applyBackgroundImage(dataUrl);
    } catch (e) {
      alert('Could not save that image — it may be too large for browser storage.');
    }
  };
  reader.readAsDataURL(file);
});

removeBgBtn.addEventListener('click', clearBackgroundImage);

const savedBg = localStorage.getItem('bgImage');
if (savedBg) applyBackgroundImage(savedBg);

// ==================== DOODLE BACKGROUND ====================
const doodleLayer = document.getElementById('doodleLayer');
const doodleGrid = document.getElementById('doodleGrid');
const doodleDensityInput = document.getElementById('doodleDensityInput');
const doodleDensityNumber = document.getElementById('doodleDensityNumber');
const doodleColorInput = document.getElementById('doodleColorInput');
const doodleOpacityInput = document.getElementById('doodleOpacityInput');
const doodleOpacityNumber = document.getElementById('doodleOpacityNumber');

// Each doodle is a small SVG "tile" drawn with currentColor-like %COLOR% token,
// which gets swapped for the chosen doodle color, then URL-encoded into a data URI.
const doodlePatterns = {
  none: { label: 'None', svg: null },
  hearts: {
    label: 'Hearts',
    svg: '<svg xmlns="http://www.w3.org/2000/svg" width="78" height="72" viewBox="0 0 78 72">' +
      '<g transform="translate(16,15)">' +
      '<path d="M23 40C10 31 2 22 2 13.5 2 6.6 7.4 1 14 1c4 0 7.6 2.1 9 5.4C24.4 3.1 28 1 32 1c6.6 0 12 5.6 12 12.5C44 22 36 31 23 40z" fill="%COLOR%"/>' +
      '</g>' +
      '</svg>'
  },
  stars: {
    label: 'Stars',
    svg: '<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 60 60">' +
      '<path d="M16 6l2.6 6.9L26 15l-7.4 2.1L16 24l-2.6-6.9L6 15l7.4-2.1z" fill="%COLOR%"/>' +
      '<path d="M45 30l2 5.2L52 37l-5 1.8L45 44l-2-5.2L38 37l5-1.8z" fill="%COLOR%" opacity="0.6"/>' +
      '<circle cx="42" cy="12" r="2" fill="%COLOR%" opacity="0.5"/>' +
      '<circle cx="12" cy="42" r="2.4" fill="%COLOR%" opacity="0.45"/>' +
      '</svg>'
  },
  clouds: {
    label: 'Clouds',
    svg: '<svg xmlns="http://www.w3.org/2000/svg" width="70" height="70" viewBox="0 0 70 70">' +
      '<path d="M12 34c-3 0-5 2.3-5 5s2 5 5 5h22c2.8 0 5-2.3 5-5 0-2.4-1.7-4.4-4-4.9 0.1-0.4 0.1-0.8 0.1-1.1 0-3.6-2.9-6.5-6.5-6.5-2.5 0-4.6 1.4-5.7 3.4-1-1.2-2.5-1.9-4.2-1.9-3.1 0-5.6 2.5-5.6 5.6 0 0.1 0 0.3 0 0.4z" fill="%COLOR%" opacity="0.55"/>' +
      '</svg>'
  },
  flowers: {
    label: 'Flowers',
    svg: '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">' +
      '<g fill="%COLOR%">' +
      '<circle cx="18" cy="10" r="3.6"/><circle cx="26" cy="15" r="3.6"/><circle cx="26" cy="24" r="3.6"/>' +
      '<circle cx="18" cy="29" r="3.6"/><circle cx="10" cy="24" r="3.6"/><circle cx="10" cy="15" r="3.6"/>' +
      '<circle cx="18" cy="19.5" r="2.6" opacity="0.8"/>' +
      '</g>' +
      '<g fill="%COLOR%" opacity="0.5">' +
      '<circle cx="47" cy="38" r="2.6"/><circle cx="53" cy="42" r="2.6"/><circle cx="53" cy="49" r="2.6"/>' +
      '<circle cx="47" cy="53" r="2.6"/><circle cx="41" cy="49" r="2.6"/><circle cx="41" cy="42" r="2.6"/>' +
      '<circle cx="47" cy="45.5" r="1.9"/>' +
      '</g>' +
      '</svg>'
  },
  diamonds: {
    label: 'Diamonds',
    svg: '<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 50 50">' +
      '<rect x="8" y="8" width="10" height="10" transform="rotate(45 13 13)" fill="%COLOR%"/>' +
      '<rect x="30" y="26" width="7" height="7" transform="rotate(45 33.5 29.5)" fill="%COLOR%" opacity="0.55"/>' +
      '</svg>'
  },
  dots: {
    label: 'Dots',
    svg: '<svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 34 34">' +
      '<circle cx="8" cy="8" r="3" fill="%COLOR%"/>' +
      '<circle cx="24" cy="22" r="2.2" fill="%COLOR%" opacity="0.55"/>' +
      '</svg>'
  },
  grid: {
    label: 'Grid',
    svg: '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">' +
      '<path d="M0 0.75H40M0 20.75H40M0.75 0V40M20.75 0V40" stroke="%COLOR%" stroke-width="1.5" opacity="0.65"/>' +
      '</svg>'
  }
};
const DEFAULT_DOODLE = 'grid';
const DEFAULT_DOODLE_COLOR = '#D6336C';
const DEFAULT_DOODLE_SIZE = 50;
const DEFAULT_DOODLE_OPACITY = 20;

function svgToDataUri(svgStr, color) {
  const withColor = svgStr.split('%COLOR%').join(color);
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(withColor);
}

function buildDoodlePreviewCss(key, color) {
  const p = doodlePatterns[key];
  if (!p || !p.svg) {
    return { backgroundImage: 'none' };
  }
  return { backgroundImage: 'url("' + svgToDataUri(p.svg, color) + '")' };
}

function currentDoodleColor() {
  return doodleColorInput.value || DEFAULT_DOODLE_COLOR;
}

function applyDoodle(key, opts) {
  opts = opts || {};
  const color = opts.color || currentDoodleColor();
  const size = opts.size || parseInt(doodleDensityInput.value) || DEFAULT_DOODLE_SIZE;
  const opacity = (opts.opacity !== undefined ? opts.opacity : parseInt(doodleOpacityInput.value));

  const p = doodlePatterns[key] || doodlePatterns[DEFAULT_DOODLE];

  if (!p.svg) {
    doodleLayer.classList.add('doodle-none');
    doodleLayer.style.backgroundImage = 'none';
  } else {
    doodleLayer.classList.remove('doodle-none');
    doodleLayer.style.backgroundImage = 'url("' + svgToDataUri(p.svg, color) + '")';
    doodleLayer.style.backgroundSize = size + 'px ' + size + 'px';
    doodleLayer.style.opacity = (opacity / 100).toString();
  }

  localStorage.setItem('doodlePattern', key);
  localStorage.setItem('doodleColor', color);
  localStorage.setItem('doodleSize', size);
  localStorage.setItem('doodleOpacity', opacity);

  doodleGrid.querySelectorAll('.doodle-option').forEach(function(opt) {
    opt.classList.toggle('selected', opt.dataset.doodle === key);
  });
}

function resetDoodle() {
  doodleColorInput.value = DEFAULT_DOODLE_COLOR;
  doodleDensityInput.value = DEFAULT_DOODLE_SIZE;
  doodleDensityNumber.value = DEFAULT_DOODLE_SIZE;
  doodleOpacityInput.value = DEFAULT_DOODLE_OPACITY;
  doodleOpacityNumber.value = DEFAULT_DOODLE_OPACITY;
  applyDoodle(DEFAULT_DOODLE, { color: DEFAULT_DOODLE_COLOR, size: DEFAULT_DOODLE_SIZE, opacity: DEFAULT_DOODLE_OPACITY });
  localStorage.removeItem('doodlePattern');
  localStorage.removeItem('doodleColor');
  localStorage.removeItem('doodleSize');
  localStorage.removeItem('doodleOpacity');
}

function buildDoodleGrid() {
  doodleGrid.innerHTML = '';
  Object.keys(doodlePatterns).forEach(function(key) {
    const p = doodlePatterns[key];
    const opt = document.createElement('div');
    opt.className = 'doodle-option';
    opt.dataset.doodle = key;

    const preview = document.createElement('div');
    preview.className = 'doodle-swatch-preview';
    if (p.svg) {
      const css = buildDoodlePreviewCss(key, currentDoodleColor());
      preview.style.backgroundImage = css.backgroundImage;
      preview.style.backgroundSize = '20px 20px';
    } else {
      preview.style.backgroundImage = 'none';
      preview.textContent = '—';
      preview.style.display = 'flex';
      preview.style.alignItems = 'center';
      preview.style.justifyContent = 'center';
      preview.style.fontSize = '14px';
      preview.style.color = 'var(--text-muted)';
    }

    const label = document.createElement('div');
    label.className = 'doodle-option-label';
    label.textContent = p.label;

    opt.appendChild(preview);
    opt.appendChild(label);
    opt.addEventListener('click', function() { applyDoodle(key); });
    doodleGrid.appendChild(opt);
  });
}

function refreshDoodlePreviews() {
  const color = currentDoodleColor();
  doodleGrid.querySelectorAll('.doodle-option').forEach(function(opt) {
    const key = opt.dataset.doodle;
    const p = doodlePatterns[key];
    if (!p.svg) return;
    const preview = opt.querySelector('.doodle-swatch-preview');
    preview.style.backgroundImage = buildDoodlePreviewCss(key, color).backgroundImage;
  });
}

buildDoodleGrid();

doodleColorInput.addEventListener('input', function() {
  const activeKey = localStorage.getItem('doodlePattern') || DEFAULT_DOODLE;
  refreshDoodlePreviews();
  applyDoodle(activeKey, { color: doodleColorInput.value });
});

function clamp(val, min, max) {
  if (isNaN(val)) return min;
  return Math.min(max, Math.max(min, val));
}

doodleDensityInput.addEventListener('input', function() {
  const activeKey = localStorage.getItem('doodlePattern') || DEFAULT_DOODLE;
  doodleDensityNumber.value = doodleDensityInput.value;
  applyDoodle(activeKey, { size: parseInt(doodleDensityInput.value) });
});
doodleDensityNumber.addEventListener('input', function() {
  const activeKey = localStorage.getItem('doodlePattern') || DEFAULT_DOODLE;
  const val = clamp(parseInt(doodleDensityNumber.value), 18, 60);
  doodleDensityInput.value = val;
  applyDoodle(activeKey, { size: val });
});
doodleOpacityInput.addEventListener('input', function() {
  const activeKey = localStorage.getItem('doodlePattern') || DEFAULT_DOODLE;
  doodleOpacityNumber.value = doodleOpacityInput.value;
  applyDoodle(activeKey, { opacity: parseInt(doodleOpacityInput.value) });
});
doodleOpacityNumber.addEventListener('input', function() {
  const activeKey = localStorage.getItem('doodlePattern') || DEFAULT_DOODLE;
  const val = clamp(parseInt(doodleOpacityNumber.value), 4, 80);
  doodleOpacityInput.value = val;
  applyDoodle(activeKey, { opacity: val });
});

(function initDoodleFromStorage() {
  const savedKey = localStorage.getItem('doodlePattern') || DEFAULT_DOODLE;
  const savedColor = localStorage.getItem('doodleColor') || DEFAULT_DOODLE_COLOR;
  const savedSize = parseInt(localStorage.getItem('doodleSize')) || DEFAULT_DOODLE_SIZE;
  const savedOpacity = localStorage.getItem('doodleOpacity') !== null ? parseInt(localStorage.getItem('doodleOpacity')) : DEFAULT_DOODLE_OPACITY;
  doodleColorInput.value = savedColor;
  doodleDensityInput.value = savedSize;
  doodleDensityNumber.value = savedSize;
  doodleOpacityInput.value = savedOpacity;
  doodleOpacityNumber.value = savedOpacity;
  refreshDoodlePreviews();
  applyDoodle(savedKey, { color: savedColor, size: savedSize, opacity: savedOpacity });
})();

document.querySelectorAll('.theme-section-label.toggle').forEach(function(label) {
  const targetId = label.getAttribute('data-target');
  const content = document.getElementById(targetId);
  label.addEventListener('click', function() {
    const collapsed = content.classList.toggle('collapsed');
    label.classList.toggle('collapsed', collapsed);
  });
});

const resetAllOptionsBtn = document.getElementById('resetAllOptionsBtn');
resetAllOptionsBtn.addEventListener('click', function() {
  if (!confirm('Reset all colors, text, box style, doodles, and background image back to the default look? Your notes, checklist, calendar, and history stay untouched.')) return;
  resetAccentColor();
  resetBgColor();
  resetCardColor();
  clearBackgroundImage();
  resetDoodle();
  applyDarkMode(false);
  localStorage.removeItem('darkVariant');

  // Re-expand any collapsed theme sections so the panel looks fresh next time
  document.querySelectorAll('.theme-section-label.toggle.collapsed').forEach(function(label) {
    label.classList.remove('collapsed');
  });
  document.querySelectorAll('.collapsible-content.collapsed').forEach(function(content) {
    content.classList.remove('collapsed');
  });

  // Jump back to the plain timer screen so the reset is visible right away
  themePanel.scrollTop = 0;
  closeAllPanels();
});

const clearAllDataBtn = document.getElementById('clearAllDataBtn');
clearAllDataBtn.addEventListener('click', function() {
  if (!confirm('This will erase everything saved on this device: notes, checklist, calendar events, study history, theme settings, and doodle background. This can\'t be undone. Continue?')) return;
  const keysToClear = [
    'studyMinutes', 'breakMinutes', 'notesData', 'notesText',
    'checklistItems', 'calendarEvents', 'studySessions', 'dailyQuote', 'customQuotes',
    'themeColor', 'darkMode', 'darkVariant', 'bgImage', 'cardColor', 'bgColor',
    'doodlePattern', 'doodleColor', 'doodleSize', 'doodleOpacity'
  ];
  keysToClear.forEach(function(k) { localStorage.removeItem(k); });
  location.reload();
});

// ==================== SIGN IN (Firebase Authentication) ====================
// 1. Create a free project at https://console.firebase.google.com
// 2. Build > Authentication > Get started > Sign-in method > enable "Email/Password"
// 3. Project settings > General > "Your apps" > add a Web app > copy the config object
// 4. Paste your own values in place of the placeholders below.
const firebaseConfig = {
  apiKey: "AIzaSyAZ0OFwpiyviKsaEBRAQII6yUKpdi9g0Mw",
  authDomain: "a-free-study-site.firebaseapp.com",
  projectId: "a-free-study-site",
  storageBucket: "a-free-study-site.firebasestorage.app",
  messagingSenderId: "851675183646",
  appId: "1:851675183646:web:405fe5b69be33e37984c0f"
};

const authEmailInput = document.getElementById('authEmailInput');
const authPasswordInput = document.getElementById('authPasswordInput');
const authErrorMsg = document.getElementById('authErrorMsg');
const authSignedOutView = document.getElementById('authSignedOutView');
const authSignedInView = document.getElementById('authSignedInView');
const authCurrentEmail = document.getElementById('authCurrentEmail');
const signInBtn = document.getElementById('signInBtn');
const signUpBtn = document.getElementById('signUpBtn');
const signOutBtn = document.getElementById('signOutBtn');

let firebaseReady = false;
let db = null;

// Which localStorage keys get synced to the signed-in user's account.
// (Theme/doodle/background settings stay device-only on purpose.)
const SYNC_KEYS = ['notesData', 'checklistItems', 'calendarEvents', 'studySessions', 'dailyQuote', 'studyMinutes', 'breakMinutes'];

function collectSyncData() {
  const data = {};
  SYNC_KEYS.forEach(function(key) {
    const raw = localStorage.getItem(key);
    if (raw === null) return;
    try {
      data[key] = JSON.parse(raw);
    } catch (e) {
      data[key] = raw;
    }
  });
  data.updatedAt = Date.now();
  return data;
}

function applyCloudData(data) {
  SYNC_KEYS.forEach(function(key) {
    if (!(key in data)) return;
    const val = data[key];
    const toStore = (typeof val === 'object' && val !== null) ? JSON.stringify(val) : String(val);
    localStorage.setItem(key, toStore);
  });
}

let cloudSyncTimeout = null;
// Called after any local save. Pushes the latest data up to Firestore
// (debounced so rapid edits don't spam the network) when someone's signed in.
function queueCloudSync() {
  if (!firebaseReady || !db) return;
  const user = firebase.auth().currentUser;
  if (!user) return;
  clearTimeout(cloudSyncTimeout);
  cloudSyncTimeout = setTimeout(function() {
    db.collection('userData').doc(user.uid).set(collectSyncData(), { merge: true })
      .catch(function(err) { console.error('Cloud sync failed:', err); });
  }, 800);
}

// Called right after sign-in. Pulls the account's saved data down and
// applies it locally. Guarded with sessionStorage so it only reloads once
// per sign-in (not on every re-render / page refresh while still signed in).
function pullCloudData(uid) {
  db.collection('userData').doc(uid).get().then(function(docSnap) {
    if (docSnap.exists) {
      if (sessionStorage.getItem('cloudPulled') !== uid) {
        sessionStorage.setItem('cloudPulled', uid);
        applyCloudData(docSnap.data());
        location.reload();
      }
    } else {
      // First time this account has signed in — seed the cloud with
      // whatever is currently saved on this device.
      sessionStorage.setItem('cloudPulled', uid);
      db.collection('userData').doc(uid).set(collectSyncData())
        .catch(function(err) { console.error('Initial cloud push failed:', err); });
    }
  }).catch(function(err) {
    console.error('Cloud pull failed:', err);
  });
}

function showAuthError(message) {
  authErrorMsg.textContent = message;
  authErrorMsg.style.display = 'block';
}
function clearAuthError() {
  authErrorMsg.textContent = '';
  authErrorMsg.style.display = 'none';
}

// Turns Firebase's error codes into plain, friendly messages.
function friendlyAuthError(error) {
  const code = error && error.code ? error.code : '';
  if (code === 'auth/invalid-email') return 'That email address doesn\'t look right.';
  if (code === 'auth/missing-password') return 'Please enter a password.';
  if (code === 'auth/weak-password') return 'Password should be at least 6 characters.';
  if (code === 'auth/email-already-in-use') return 'An account with that email already exists — try signing in instead.';
  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
    return 'Incorrect email or password.';
  }
  if (code === 'auth/too-many-requests') return 'Too many attempts — please wait a bit and try again.';
  return (error && error.message) ? error.message : 'Something went wrong. Please try again.';
}

if (firebaseConfig.apiKey === 'YOUR_API_KEY') {
  // Config hasn't been filled in yet — keep the panel usable but explain what's missing,
  // instead of throwing confusing errors when someone taps Sign In.
  showAuthError('Sign-in isn\'t set up yet — add your Firebase config in script.js.');
  signInBtn.disabled = true;
  signUpBtn.disabled = true;
} else {
  firebase.initializeApp(firebaseConfig);
  firebaseReady = true;
  db = firebase.firestore();

  firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
      authSignedOutView.style.display = 'none';
      authSignedInView.style.display = 'block';
      authCurrentEmail.textContent = user.email;
      clearAuthError();
      pullCloudData(user.uid);
    } else {
      authSignedOutView.style.display = 'block';
      authSignedInView.style.display = 'none';
      sessionStorage.removeItem('cloudPulled');
    }
  });

  signInBtn.addEventListener('click', function() {
    clearAuthError();
    const email = authEmailInput.value.trim();
    const password = authPasswordInput.value;
    if (!email || !password) { showAuthError('Please enter both email and password.'); return; }
    firebase.auth().signInWithEmailAndPassword(email, password)
      .then(function() {
        authPasswordInput.value = '';
      })
      .catch(function(error) {
        showAuthError(friendlyAuthError(error));
      });
  });

  signUpBtn.addEventListener('click', function() {
    clearAuthError();
    const email = authEmailInput.value.trim();
    const password = authPasswordInput.value;
    if (!email || !password) { showAuthError('Please enter both email and password.'); return; }
    firebase.auth().createUserWithEmailAndPassword(email, password)
      .then(function() {
        authPasswordInput.value = '';
      })
      .catch(function(error) {
        showAuthError(friendlyAuthError(error));
      });
  });

  signOutBtn.addEventListener('click', function() {
    firebase.auth().signOut();
  });

  authPasswordInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') signInBtn.click();
  });
}
