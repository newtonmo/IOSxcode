/* NovaMed v83 - Exam mode, live exam autosave, calendar targets, analytics, smart review, and reports. */
function examTargetsStorageKey() {
  const user = state?.user?.studentKey || state?.user?.email || state?.user?.name || 'guest';
  return `${EXAM_TARGETS_KEY}:${studentAccountKey(user) || normalizeEmail(user) || 'guest'}`;
}

function readExamTargets() {
  if (typeof isStudent === 'function' && isStudent()) {
    return window.__novamedExamTargetsCache && typeof window.__novamedExamTargetsCache === 'object' ? window.__novamedExamTargetsCache : {};
  }
  return readJson(examTargetsStorageKey(), {});
}

function saveExamTargets(targets = {}) {
  if (typeof isStudent === 'function' && isStudent()) {
    window.__novamedExamTargetsCache = targets && typeof targets === 'object' ? { ...targets } : {};
    saveStudentProgress();
    return;
  }
  writeJson(examTargetsStorageKey(), targets);
}

function formatDateKey(date) {
  const d = date instanceof Date ? date : new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function prettyExamDate(date) {
  return new Date(date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}





function parseSystemValue(value = '') {
  const [course, ...rest] = String(value || '').split('||');
  return { course: course || 'medicine', topic: rest.join('||') || 'Cardiology' };
}

function systemValueFor(course, topic) {
  return `${course || 'medicine'}||${topic || 'Cardiology'}`;
}



function getCalendarEntry(dateKey) {
  const raw = readExamTargets()[dateKey];
  if (!raw) return {};
  // Backward compatibility: older versions stored the exam target directly.
  if (raw.course || raw.topic || raw.count || raw.minutes) return { target: raw, note: raw.note || '' };
  return raw || {};
}

function normalizeCalendarEntry(entry = {}) {
  const output = {};
  if (entry.target) output.target = entry.target;
  if (entry.note && String(entry.note).trim()) output.note = String(entry.note).trim();
  if (entry.done) output.done = true;
  if (Array.isArray(entry.todos)) {
    output.todos = entry.todos
      .map((item, index) => ({
        id: item.id || Date.now() + index,
        text: String(item.text || '').trim().slice(0, 100),
        done: Boolean(item.done),
        createdAt: item.createdAt || new Date().toISOString(),
        meta: String(item.meta || '').trim(),
        target: item.target && typeof item.target === 'object' ? item.target : null
      }))
      .filter(item => item.text);
  }
  return output;
}

function saveCalendarEntry(dateKey, entry = {}) {
  const targets = readExamTargets();
  const normalized = normalizeCalendarEntry(entry);
  if (!normalized.target && !normalized.note && !normalized.done && !(normalized.todos || []).length) delete targets[dateKey];
  else targets[dateKey] = normalized;
  saveExamTargets(targets);
}


function normalizeCalendarTodoText(text = '') {
  return String(text || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function findCalendarTodoDuplicate(text = '', currentDateKey = '') {
  const needle = normalizeCalendarTodoText(text);
  if (!needle) return null;
  const targets = readExamTargets();
  for (const [dateKey, entry] of Object.entries(targets || {})) {
    if (dateKey === currentDateKey) continue;
    const match = (entry.todos || []).find(item => normalizeCalendarTodoText(item.text) === needle);
    if (match) return { dateKey, item: match };
  }
  return null;
}

function calendarTodosFor(dateKey) {
  const entry = getCalendarEntry(dateKey);
  return Array.isArray(entry.todos) ? entry.todos : [];
}

function calendarTodoCount(dateKey) {
  return calendarTodosFor(dateKey).length;
}

function renderCalendarTodoRows(dateKey) {
  const list = $('#calendarTodoList');
  if (!list) return;
  const todos = calendarTodosFor(dateKey);
  if (!todos.length) {
    list.innerHTML = `
      <div class="calendar-todo-empty">
        <span>☑️</span>
        <b>No tasks for this day</b>
        <p>Add one specific task for this date only.</p>
      </div>
    `;
    return;
  }
  list.innerHTML = todos.map(item => `
    <article class="calendar-todo-row ${item.done ? 'done' : ''}">
      <label>
        <input type="checkbox" data-calendar-todo-toggle="${item.id}" ${item.done ? 'checked' : ''} />
        <span><b>${esc(item.text)}</b>${item.meta ? `<small>${esc(item.meta)}</small>` : ''}</span>
      </label>
      <div class="calendar-todo-actions">
        <button class="tiny-btn add-today-task" type="button" data-calendar-add-today="${item.id}">Add to today's To-do list</button>
        <button class="tiny-btn danger" type="button" data-calendar-todo-delete="${item.id}">×</button>
      </div>
    </article>
  `).join('');
}

function openCalendarTodoModal(dateKey) {
  const branches = getTodoBrowseBranches();
  showModal(`
    <h2 id="modalTitle">To-do list</h2>
    <p class="modal-muted">${esc(prettyExamDate(dateKey))}. Choose lecture/video/QBank tasks for this day. The same task cannot be added to another date.</p>
    <form id="calendarTodoForm" class="form-stack calendar-todo-form">
      <div class="calendar-browse-panel">
        <label class="field-label">
          <span>Branch</span>
          <select id="calendarTodoBranch" required>
            <option value="" selected disabled>Choose branch</option>
            ${branches.map(course => `<option value="${esc(course.id)}">${esc(course.title)}</option>`).join('')}
          </select>
        </label>
        <label class="field-label">
          <span>System / chapter</span>
          <select id="calendarTodoTopic" required disabled>
            <option value="" selected disabled>Choose system / chapter</option>
          </select>
        </label>
        <div class="browse-task-list empty" id="calendarBrowseTaskList">
          <div class="browse-empty-state">
            <span>📚</span>
            <b>Choose a branch first</b>
            <p>Then choose the system/chapter and select one or more tasks.</p>
          </div>
        </div>
        <button class="primary-btn" type="submit">Add selected tasks</button>
      </div>

      <div class="calendar-todo-existing">
        <div class="mini-section-head">
          <span class="eyebrow">This day tasks</span>
          <b>${esc(prettyExamDate(dateKey))}</b>
        </div>
        <div class="calendar-todo-list" id="calendarTodoList"></div>
      </div>

      <div class="modal-button-row">
        <button class="soft-btn" id="backToCalendarDay" type="button">Back to day</button>
      </div>
    </form>
  `);

  const branchSelect = $('#calendarTodoBranch');
  const topicSelect = $('#calendarTodoTopic');
  const taskList = $('#calendarBrowseTaskList');

  const renderEmpty = (title, text) => {
    taskList.classList.add('empty');
    taskList.innerHTML = `
      <div class="browse-empty-state">
        <span>📚</span>
        <b>${esc(title)}</b>
        <p>${esc(text)}</p>
      </div>
    `;
    taskList.dataset.tasks = '[]';
  };

  const renderTopics = () => {
    const branch = branchSelect?.value || '';
    topicSelect.innerHTML = '<option value="" selected disabled>Choose system / chapter</option>';
    topicSelect.disabled = !branch;
    if (!branch) {
      renderEmpty('Choose a branch first', 'Then choose the system/chapter and select one or more tasks.');
      return;
    }
    const topics = getTodoBrowseTopics(branch);
    topicSelect.innerHTML += topics.map(topic => `<option value="${esc(topic)}">${esc(topic)}</option>`).join('');
    renderEmpty('Choose a system / chapter', 'After choosing it, select videos or QBank sets for this day.');
  };

  const renderTasks = () => {
    const branch = branchSelect?.value || '';
    const topic = topicSelect?.value || '';
    if (!branch || !topic) {
      renderEmpty('Choose a system / chapter', 'After choosing it, select videos or QBank sets for this day.');
      return;
    }
    const branchTitle = branches.find(item => item.id === branch)?.title || branch;
    const tasks = getTodoBrowseLectureTasks(branch, topic);
    taskList.classList.remove('empty');
    taskList.innerHTML = tasks.map((task, index) => `
      <label class="browse-task-card compact">
        <input type="checkbox" name="taskIndex" value="${index}" />
        <span>
          <b>${esc('Lecture task')}</b>
          <strong>${esc(task.title)}</strong>
          <small>${esc(branchTitle)} • ${esc(topic)} • ${esc(task.meta)}</small>
        </span>
      </label>
    `).join('');
    taskList.dataset.tasks = JSON.stringify(tasks);
  };

  branchSelect?.addEventListener('change', renderTopics);
  topicSelect?.addEventListener('change', renderTasks);
  renderTopics();
  renderCalendarTodoRows(dateKey);

  $('#calendarTodoForm')?.addEventListener('submit', event => {
    event.preventDefault();
    const branch = branchSelect?.value || '';
    const topic = topicSelect?.value || '';
    if (!branch || !topic) {
      showToast('Choose branch and system first');
      return;
    }

    const selectedIndexes = $$('#calendarBrowseTaskList input[name="taskIndex"]:checked').map(input => Number(input.value));
    if (!selectedIndexes.length) {
      showToast('Choose at least one task');
      return;
    }

    const tasks = JSON.parse(taskList.dataset.tasks || '[]');
    const branchTitle = branches.find(item => item.id === branch)?.title || branch;
    const selectedTasks = selectedIndexes.map(index => tasks[index]).filter(Boolean);

    const current = getCalendarEntry(dateKey);
    const currentTodos = current.todos || [];
    const newItems = [];

    for (const task of selectedTasks) {
      const text = `${branchTitle} • ${topic}: ${task.title}`.slice(0, 100);
      const duplicate = findCalendarTodoDuplicate(text, dateKey);
      if (duplicate) {
        showToast(`"${task.title}" is already added on ${prettyExamDate(duplicate.dateKey)}`);
        continue;
      }
      const sameDay = currentTodos.some(item => normalizeCalendarTodoText(item.text) === normalizeCalendarTodoText(text));
      if (sameDay) continue;
      newItems.push({
        id: Date.now() + newItems.length,
        text,
        done: false,
        createdAt: new Date().toISOString(),
        meta: task.meta || '',
        target: task.target || null
      });
    }

    if (!newItems.length) {
      showToast('No new tasks were added');
      return;
    }

    saveCalendarEntry(dateKey, { ...current, todos: [...currentTodos, ...newItems] });
    renderCalendarTodoRows(dateKey);
    renderExamCalendar();
    renderDailyTodo();
    renderTasks();
    showToast(`${newItems.length} task${newItems.length > 1 ? 's' : ''} added to this day`);
  });

  $('#calendarTodoList')?.addEventListener('change', event => {
    const toggle = event.target.closest('[data-calendar-todo-toggle]');
    if (!toggle) return;
    const current = getCalendarEntry(dateKey);
    const todos = (current.todos || []).map(item => Number(item.id) === Number(toggle.dataset.calendarTodoToggle) ? { ...item, done: toggle.checked } : item);
    saveCalendarEntry(dateKey, { ...current, todos });
    renderCalendarTodoRows(dateKey);
    renderExamCalendar();
    renderDailyTodo();
  });

  $('#calendarTodoList')?.addEventListener('click', event => {
    const addToday = event.target.closest('[data-calendar-add-today]');
    if (addToday) {
      const current = getCalendarEntry(dateKey);
      const item = (current.todos || []).find(task => Number(task.id) === Number(addToday.dataset.calendarAddToday));
      if (!item) return;
      state.dailyTodo = normalizeDailyTodo(state.dailyTodo);
      const exists = state.dailyTodo.items.some(task => normalizeCalendarTodoText(task.text) === normalizeCalendarTodoText(item.text));
      if (exists) {
        showToast('This task is already in today\'s To-do list');
        return;
      }
      state.dailyTodo.items.unshift({
        id: Date.now(),
        text: item.text,
        done: false,
        createdAt: new Date().toISOString(),
        target: item.target || null
      });
      saveState();
      renderDailyTodo();
      showToast('Added to today\'s To-do list');
      return;
    }

    const del = event.target.closest('[data-calendar-todo-delete]');
    if (!del) return;
    const current = getCalendarEntry(dateKey);
    const todos = (current.todos || []).filter(item => Number(item.id) !== Number(del.dataset.calendarTodoDelete));
    saveCalendarEntry(dateKey, { ...current, todos });
    renderCalendarTodoRows(dateKey);
    renderExamCalendar();
    renderDailyTodo();
    showToast('Task removed');
  });

  $('#backToCalendarDay')?.addEventListener('click', () => openCalendarDayModal(dateKey));
}


function stabilizeExamCalendar() {
  requestAnimationFrame(() => renderExamCalendar());
  setTimeout(() => renderExamCalendar(), 80);
  setTimeout(() => renderExamCalendar(), 260);
}

function renderExamCalendar() {
  const calendar = $('#examCalendar');
  if (!calendar) return;
  const title = $('#examCalendarTitle');
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const todayKey = formatDateKey(now);
  if (title) title.textContent = now.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const targets = readExamTargets();
  const first = new Date(year, month, 1);
  const startOffset = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const weekdayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const cells = [];
  weekdayNames.forEach(name => cells.push(`<div class="exam-weekday">${name}</div>`));
  for (let i = 0; i < startOffset; i++) cells.push('<div class="exam-day empty"></div>');
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const key = formatDateKey(date);
    const entry = getCalendarEntry(key);
    const target = entry.target;
    const note = entry.note;
    const hasTarget = Boolean(target);
    const hasNote = Boolean(note);
    const isDone = Boolean(entry.done);
    const todoCount = calendarTodoCount(key);
    const hasTodos = todoCount > 0;
    const available = target ? availableNormalMcqCount(target.course, target.topic, target.lectureId) : 0;
    cells.push(`
      <button class="exam-day ${key === todayKey ? 'today' : ''} ${hasTarget ? 'has-target' : ''} ${hasNote ? 'has-note' : ''} ${hasTodos ? 'has-todos' : ''} ${isDone ? 'has-done' : ''}" data-exam-date="${key}" type="button" aria-label="${esc(prettyExamDate(date))}${hasTarget ? ' target' : ''}${hasNote ? ' note' : ''}">
        <span class="day-number">${day}</span>
        <small>${weekdayNames[date.getDay()]}</small>
        <div class="calendar-pill-stack">
          ${hasTarget ? `<b class="calendar-pill target-pill">Target</b>` : ''}
          ${hasTodos ? `<b class="calendar-pill todo-pill">${todoCount} task${todoCount > 1 ? 's' : ''}</b>` : ''}
          ${hasNote ? `<b class="calendar-pill note-pill">Note</b>` : ''}
          ${isDone ? `<b class="calendar-pill done-pill">Done</b>` : ''}
        </div>
        ${hasTarget ? `<em>${esc(target.topic || 'System')}</em><i>${Math.min(Number(target.count || 0), available || Number(target.count || 0))} MCQs</i>` : ''}
        ${isDone ? '<strong class="calendar-done-mark">×</strong>' : ''}
      </button>
    `);
  }
  calendar.innerHTML = cells.join('');
}

function renderHeatmap() {
  renderExamCalendar();
}

function openCalendarDayModal(dateInput) {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  const dateKey = formatDateKey(date);
  const entry = getCalendarEntry(dateKey);
  const target = entry.target;
  const note = entry.note;
  const isDone = Boolean(entry.done);
  const todoCount = calendarTodoCount(dateKey);
  const doneTodoCount = calendarTodosFor(dateKey).filter(item => item.done).length;
  showModal(`
    <h2 id="modalTitle">${esc(prettyExamDate(dateKey))}</h2>
    <div class="calendar-day-actions compact-calendar-actions">
      <article class="calendar-action-card calendar-todo-card">
        <span>☑️</span>
        <div><b>${todoCount ? 'Edit to-do list' : 'Add to-do list'}</b></div>
        <button class="soft-btn small calendar-action-btn" id="openCalendarTodo" type="button">${todoCount ? 'Open' : 'Add'}</button>
      </article>
      <article class="calendar-action-card note-card">
        <span>📝</span>
        <div><b>${note ? 'Edit note' : 'Add note'}</b></div>
        <button class="soft-btn small calendar-action-btn" id="openCalendarNote" type="button">${note ? 'Edit' : 'Add'}</button>
      </article>
      <article class="calendar-action-card target-card">
        <span>🎯</span>
        <div><b>${target ? 'Edit exam target' : 'Add exam target'}</b></div>
        <button class="soft-btn small calendar-action-btn" id="openCalendarTarget" type="button">${target ? 'Edit' : 'Add'}</button>
      </article>
      <article class="calendar-action-card done-card">
        <span>✅</span>
        <div><b>${isDone ? 'Done marked' : 'Mark as done'}</b></div>
        <button class="soft-btn small calendar-action-btn" id="toggleCalendarDone" type="button">${isDone ? 'Undo' : 'Done'}</button>
      </article>
    </div>
    <div class="modal-button-row">
      ${target ? '<button class="soft-btn" id="startCalendarTarget" type="button">Start target exam</button>' : ''}
      ${(note || target || todoCount || isDone) ? '<button class="tiny-btn danger" id="clearCalendarDay" type="button">Clear day</button>' : ''}
    </div>
  `);
  $('#openCalendarTodo')?.addEventListener('click', () => openCalendarTodoModal(dateKey));
  $('#openCalendarNote')?.addEventListener('click', () => openCalendarNoteModal(dateKey));
  $('#openCalendarTarget')?.addEventListener('click', () => showExamSetupModal({ ...(target || getDefaultExamTarget()), dateKey }, { calendarMode: true }));
  $('#toggleCalendarDone')?.addEventListener('click', () => {
    const current = getCalendarEntry(dateKey);
    saveCalendarEntry(dateKey, { ...current, done: !current.done });
    closeModal();
    renderExamCalendar();
    showToast(!current.done ? 'Day marked as done' : 'Done mark removed');
  });

  $('#startCalendarTarget')?.addEventListener('click', () => {
    if (!target) return;
    startQuickExamFromFilters({ course: target.course, topic: target.topic, lectureId: target.lectureId || '', count: target.count || 1, minutes: target.minutes || 30 });
  });
  $('#clearCalendarDay')?.addEventListener('click', () => {
    saveCalendarEntry(dateKey, {});
    closeModal();
    renderExamCalendar();
    showToast('Calendar day cleared');
  });
}

function openCalendarNoteModal(dateKey) {
  const entry = getCalendarEntry(dateKey);
  showModal(`
    <h2 id="modalTitle">Day note</h2>
    <p class="modal-muted">This appears as a yellow marker on the monthly calendar.</p>
    <form id="calendarNoteForm" class="form-stack">
      <textarea name="note" rows="5" placeholder="Example: Review Cardio murmurs before the evening session.">${esc(entry.note || '')}</textarea>
      <div class="modal-button-row">
        <button class="primary-btn" type="submit">Save note</button>
        ${entry.note ? '<button class="tiny-btn danger" id="deleteCalendarNote" type="button">Delete note</button>' : ''}
      </div>
    </form>
  `);
  $('#calendarNoteForm')?.addEventListener('submit', event => {
    event.preventDefault();
    const note = String(new FormData(event.currentTarget).get('note') || '').trim();
    const current = getCalendarEntry(dateKey);
    saveCalendarEntry(dateKey, { ...current, note });
    closeModal();
    renderExamCalendar();
    showToast('Note saved');
  });
  $('#deleteCalendarNote')?.addEventListener('click', () => {
    const current = getCalendarEntry(dateKey);
    delete current.note;
    saveCalendarEntry(dateKey, current);
    closeModal();
    renderExamCalendar();
    showToast('Note removed');
  });
}

function openExamTargetModal(dateInput) {
  openCalendarDayModal(dateInput);
}

function examCourseOptions() {
  const tree = activeQbankCourseTree();
  const detailed = Array.isArray(tree.detailed) ? tree.detailed : [];
  const byId = new Map();
  detailed.forEach(course => byId.set(course.id, { id: course.id, title: course.title || baseCourseTitle(course.id), topics: Array.isArray(course.topics) ? [...course.topics] : [] }));
  normalMcqPool().forEach(q => {
    if (!byId.has(q.course)) byId.set(q.course, { id: q.course, title: baseCourseTitle(q.course), topics: [] });
    const item = byId.get(q.course);
    if (q.topic && !item.topics.some(t => String(t).toLowerCase() === String(q.topic).toLowerCase())) item.topics.push(q.topic);
  });
  return Array.from(byId.values());
}

function topicsForExamCourse(courseId) {
  const found = examCourseOptions().find(c => c.id === courseId);
  const topics = found?.topics?.length ? [...found.topics] : topicsForCourseFromQuestions(courseId);
  return topics.sort((a,b) => String(a).localeCompare(String(b)));
}




function targetsHas(dateKey) {
  return Boolean(getCalendarEntry(dateKey).target);
}

function bindCelebration() {
  $$('.celebrate-btn').forEach(btn => btn.addEventListener('click', async () => {
    await window.awardStudentXpSecure?.('daily_streak_claim', window.rewardEventKeyV148?.(['daily-streak', new Date().toISOString().slice(0, 10)]) || `daily-streak:${new Date().toISOString().slice(0, 10)}`, { source: 'streak_claim' }, { toast: 'Streak extended +{xp} XP', duplicateToast: 'Today’s streak reward already counted' });
    saveState(); updateMiniStats();
    showModal(`
      <h2 id="modalTitle">Streak extended! 🔥</h2>
      <p>Nova is proud. You earned bonus XP and protected your habit chain.</p>
      <div style="font-size:86px;text-align:center;margin:12px 0;animation:pulse 1s infinite">🔥</div>
      <button class="primary-btn" id="celebrationClose">Amazing</button>
    `);
    setTimeout(() => $('#celebrationClose')?.addEventListener('click', closeModal), 0);
  }));
}

function bindLeagueAndPartner() {
  $$('[data-league-action]').forEach(btn => btn.addEventListener('click', () => {
    const action = btn.dataset.leagueAction;
    if (action === 'join') {
      showModal(`
        <h2 id="modalTitle">Weekly league joined 🏆</h2>
        <p>You are now in the Gold Cup. XP from videos, QBank, mistake review, and study sessions will count toward your weekly rank.</p>
        <div style="display:grid;gap:9px;margin:16px 0">
          <div class="leader-row second"><span class="rank-medal">🥈</span><div><b>Mohammed</b><small>Current rank</small></div><strong>4,560 XP</strong><em>25% discount zone</em></div>
        </div>
        <button class="primary-btn" id="leagueClose">Continue</button>
      `);
      setTimeout(() => $('#leagueClose')?.addEventListener('click', closeModal), 0);
      return;
    }
    showModal(`
      <h2 id="modalTitle">League rules</h2>
      <p>Weekly ranking is based on XP. XP can come from watching videos, solving QBank questions, reviewing mistakes, and completing focus sessions. Rank 1, 2, and 3 can receive rewards such as discounts, free sessions, course access, badges, or any prize set by the admin for that week.</p>
      <ul class="wrong-list"><li>Correct MCQ: +18 XP</li><li>Wrong MCQ with review: +6 XP</li><li>Completed lecture: +40 XP</li><li>Daily streak claim: +100 XP</li></ul>
      <button class="primary-btn" id="rulesClose">Got it</button>
    `);
    setTimeout(() => $('#rulesClose')?.addEventListener('click', closeModal), 0);
  }));

  $$('[data-partner-action]').forEach(btn => btn.addEventListener('click', () => {
    const action = btn.dataset.partnerAction;
    const content = {
      'start-room': ['Focus room preview', 'This will become a shared study room where students open the same topic, start the same timer, and compare XP after the session.'],
      timer: ['Shared timer preview', 'A synchronized 25-minute timer is useful because it creates commitment without distracting students during study.'],
      partner: ['Partner invite preview', 'This can later invite a friend, assign a shared goal, and show whether both students completed today’s task.']
    }[action] || ['Study Partner', 'This feature is ready as a placeholder for the next design step.'];
    showModal(`
      <h2 id="modalTitle">${esc(content[0])}</h2>
      <p>${esc(content[1])}</p>
      <div style="height:132px;border-radius:24px;background:linear-gradient(135deg,rgba(86,227,159,.95),rgba(62,232,255,.82),rgba(79,140,255,.72));display:grid;place-items:center;margin:16px 0;color:#061226;font-size:44px;font-weight:1000;">🤝</div>
      <button class="primary-btn" id="partnerClose">Nice</button>
    `);
    setTimeout(() => $('#partnerClose')?.addEventListener('click', closeModal), 0);
  }));
}



const STUDY_ROUTE_KEY = 'novamed-study-route-v1';
const EXAM_TARGETS_KEY = 'novamed-exam-targets-v1';
let quickExamTimer = null;
let quickExamState = null;

function studyRouteStorageKey() {
  const user = state?.user?.studentKey || state?.user?.email || state?.user?.name || 'guest';
  return `${STUDY_ROUTE_KEY}:${studentAccountKey(user) || normalizeEmail(user) || 'guest'}`;
}

function defaultStudyRoutePlan() {
  return buildStudyRoutePlan({
    title: 'Cardio-focused week',
    weeks: 8,
    dailyMinutes: 90,
    examDay: 'Friday',
    course: 'medicine',
    systemsText: 'Cardiology, GIT, Respiratory, Emergencies',
    questionTarget: 30
  });
}

function readStudyRoutePlan() {
  if (typeof isStudent === 'function' && isStudent()) {
    return window.__novamedStudyRoutePlanCache || defaultStudyRoutePlan();
  }
  return readJson(studyRouteStorageKey(), null) || defaultStudyRoutePlan();
}

function saveStudyRoutePlan(plan) {
  if (typeof isStudent === 'function' && isStudent()) {
    window.__novamedStudyRoutePlanCache = plan || defaultStudyRoutePlan();
    saveStudentProgress();
    return;
  }
  writeJson(studyRouteStorageKey(), plan);
}

function buildStudyRoutePlan(input = {}) {
  const days = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const systems = String(input.systemsText || 'Cardiology, GIT, Respiratory, Emergencies')
    .split(',')
    .map(x => x.trim())
    .filter(Boolean);
  const safeSystems = systems.length ? systems : ['Cardiology'];
  const examDay = input.examDay || 'Friday';
  const dailyMinutes = Math.max(20, Number(input.dailyMinutes || 90));
  const questionTarget = Math.max(5, Number(input.questionTarget || 30));
  const course = input.course || 'medicine';
  const title = input.title || `${safeSystems[0]} route`;
  const items = days.map((day, index) => {
    const system = safeSystems[index % safeSystems.length];
    const isExam = day === examDay || index === days.length - 1;
    const phase = isExam ? 'Weekly exam' : index % 3 === 0 ? 'Video + notes' : index % 3 === 1 ? 'MCQ training' : 'Mistake repair';
    return {
      day,
      system,
      course,
      phase,
      minutes: isExam ? Math.max(45, dailyMinutes) : dailyMinutes,
      questions: isExam ? questionTarget + 10 : Math.max(10, Math.round(questionTarget / 2)),
      exam: isExam,
      done: false
    };
  });
  return {
    title,
    weeks: Math.max(1, Number(input.weeks || 8)),
    dailyMinutes,
    questionTarget,
    course,
    examDay,
    systems: safeSystems,
    createdAt: new Date().toISOString(),
    items
  };
}

function renderStudyRoutePlanner() {
  const strip = $('#routeWeekStrip');
  const stats = $('#routeStatsGrid');
  const plan = readStudyRoutePlan();
  const completed = (plan.items || []).filter(item => item.done).length;
  const total = (plan.items || []).length || 7;
  const examItem = (plan.items || []).find(item => item.exam) || plan.items?.[total - 1];
  const heroTitle = $('#routeHeroTitle');
  const heroSubtitle = $('#routeHeroSubtitle');
  if (heroTitle) heroTitle.textContent = plan.title || 'Weekly study route';
  if (heroSubtitle) heroSubtitle.textContent = `${plan.weeks || 8}-week rota • ${plan.dailyMinutes || 90} min/day • exam every ${plan.examDay || 'Friday'}`;

  if (stats) stats.innerHTML = [
    ['Route length', `${plan.weeks || 8} weeks`, '📅'],
    ['Daily target', `${plan.dailyMinutes || 90} min`, '⏱️'],
    ['Weekly exam', plan.examDay || 'Friday', '🧪'],
    ['Progress', `${completed}/${total} days`, '🔥']
  ].map(([label, value, icon]) => `
    <article class="route-stat"><span>${icon}</span><small>${esc(label)}</small><b>${esc(value)}</b></article>
  `).join('');

  if (strip) strip.innerHTML = (plan.items || []).map((item, index) => `
    <article class="route-day-card ${item.exam ? 'exam-day' : ''} ${item.done ? 'done' : ''}">
      <div class="route-day-top"><span>${esc(item.day.slice(0,3))}</span><button class="tiny-check" data-route-day="${index}" type="button">${item.done ? '✓' : '+'}</button></div>
      <h3>${esc(item.system)}</h3>
      <p>${esc(item.phase)}</p>
      <div class="route-mini-meta"><b>${item.minutes} min</b><b>${item.questions} Qs</b></div>
      ${item.exam ? `<button class="soft-btn small full-route-btn" data-route-exam="${index}" type="button">Make exam</button>` : '<button class="tiny-btn full-route-btn" data-route-open-topic="1" type="button">Study</button>'}
    </article>
  `).join('');
  const routeSummary = $('#routeSummaryLine');
  if (routeSummary && examItem) routeSummary.textContent = `Next exam: ${examItem.day} • ${examItem.system} • ${examItem.questions} MCQs`;
  renderExamCalendar();
}


function openQbankQuickExamDirect(event = null) {
  if (event) {
    event.preventDefault();
    event.stopImmediatePropagation?.();
    event.stopPropagation?.();
  }
  const dropdown = $('.inline-quick-exam');
  if (dropdown) dropdown.open = false;
  openQuickExamBuilderModal(getDefaultExamTarget());
}

function bindLearningRapidExam() {
  $('#startRapidExamFromLearn')?.addEventListener('click', () => {
    openQuickExamBuilderModal(getDefaultExamTarget());
  });
  $('.inline-quick-exam > summary')?.addEventListener('click', openQbankQuickExamDirect);
  $('#startRapidExamFromQbank')?.addEventListener('click', openQbankQuickExamDirect);
}

function bindStudyRouteTools() {
  $('#openRouteBuilder')?.addEventListener('click', openRouteBuilderModal);
  $('#openQuickExamBuilder')?.addEventListener('click', () => openQuickExamBuilderModal(getDefaultExamTarget()));
  $('#makeQuickExamTop')?.addEventListener('click', () => openQuickExamBuilderModal(getDefaultExamTarget()));
  $('#openRouteTips')?.addEventListener('click', openRouteIdeasModal);
  $('#examCalendar')?.addEventListener('click', event => {
    const day = event.target.closest('[data-exam-date]');
    if (day) openExamTargetModal(day.dataset.examDate);
  });
  $('#routeWeekStrip')?.addEventListener('click', async event => {
    const dayBtn = event.target.closest('[data-route-day]');
    const examBtn = event.target.closest('[data-route-exam]');
    const topicBtn = event.target.closest('[data-route-open-topic]');
    if (dayBtn) {
      const plan = readStudyRoutePlan();
      const index = Number(dayBtn.dataset.routeDay);
      if (plan.items?.[index]) plan.items[index].done = !plan.items[index].done;
      saveStudyRoutePlan(plan);
      if (plan.items?.[index]?.done) {
        await window.awardStudentXpSecure?.('route_day_completed', window.rewardEventKeyV148?.(['route-day', plan.createdAt || 'route', index]) || `route-day:${index}`, { index, item: plan.items[index] || {} }, { toast: 'Route day completed +{xp} XP', duplicateToast: 'Route day reward already counted' });
      }
      saveState(); updateMiniStats(); renderStudyRoutePlanner();
      if (!plan.items?.[index]?.done) showToast('Route day reopened');
      return;
    }
    if (examBtn) {
      const plan = readStudyRoutePlan();
      const item = plan.items?.[Number(examBtn.dataset.routeExam)] || getDefaultExamTarget();
      openQuickExamBuilderModal({ course: item.course, topic: item.system, count: item.questions, minutes: item.minutes });
      return;
    }
    if (topicBtn) {
      showToast('Open Videos or QBank for this topic from the next step.');
    }
  });
}

function openRouteBuilderModal() {
  const plan = readStudyRoutePlan();
  const courses = (activeQbankCourseTree().focused || activeQbankCourseTree().detailed || []).map(c => ({ id: c.id, title: c.title }));
  showModal(`
    <h2 id="modalTitle">Customize study route</h2>
    <p class="modal-muted">Create a simple rota students can follow for 1–8 weeks. This works without AI/API: it uses your courses, systems, and QBank content.</p>
    <form id="routeBuilderForm" class="form-stack route-form">
      <input name="title" placeholder="Route title, e.g. Cardio + Obstetric sprint" value="${esc(plan.title || '')}" />
      <div class="form-row">
        <input name="weeks" type="number" min="1" max="16" placeholder="Weeks" value="${esc(plan.weeks || 8)}" />
        <input name="dailyMinutes" type="number" min="20" max="360" placeholder="Minutes/day" value="${esc(plan.dailyMinutes || 90)}" />
      </div>
      <div class="form-row">
        <select name="course">${courses.map(c => `<option value="${esc(c.id)}" ${c.id===plan.course?'selected':''}>${esc(c.title)}</option>`).join('')}</select>
        <select name="examDay">${['Saturday','Sunday','Monday','Tuesday','Wednesday','Thursday','Friday'].map(d => `<option ${d===plan.examDay?'selected':''}>${d}</option>`).join('')}</select>
      </div>
      <textarea name="systemsText" placeholder="Systems/topics separated by commas">${esc((plan.systems || []).join(', '))}</textarea>
      <input name="questionTarget" type="number" min="5" max="200" placeholder="Weekly exam question target" value="${esc(plan.questionTarget || 30)}" />
      <button class="primary-btn" type="submit">Save route</button>
    </form>
  `);
  $('#routeBuilderForm')?.addEventListener('submit', event => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const next = buildStudyRoutePlan({
      title: form.get('title'),
      weeks: form.get('weeks'),
      dailyMinutes: form.get('dailyMinutes'),
      examDay: form.get('examDay'),
      course: form.get('course'),
      systemsText: form.get('systemsText'),
      questionTarget: form.get('questionTarget')
    });
    saveStudyRoutePlan(next);
    closeModal();
    renderStudyRoutePlanner();
    showToast('Study route updated');
  });
}

function openRouteIdeasModal() {
  showModal(`
    <h2 id="modalTitle">Best features for this section</h2>
    <p class="modal-muted">These are the strongest ideas to make students return daily without making the app distracting.</p>
    <div class="route-ideas-list">
      <article><span>📅</span><b>Weekly rota</b><p>Students see exactly what to study today and what exam is coming at the end of the week.</p></article>
      <article><span>🧪</span><b>Quick exam generator</b><p>They choose system, optional lecture, exam time, and number of MCQs; Nova randomizes normal QBank MCQs.</p></article>
      <article><span>🤝</span><b>Accountability partner</b><p>Good later: pair two students so each sees whether the other finished today’s route.</p></article>
      <article><span>🎯</span><b>Weak-point repair</b><p>After the exam, wrong questions go automatically to My Mistakes for focused review.</p></article>
    </div>
    <button class="primary-btn" id="routeIdeasClose">Keep these</button>
  `);
  setTimeout(() => $('#routeIdeasClose')?.addEventListener('click', closeModal), 0);
}

function distinctQuestionCourses() {
  const tree = activeQbankCourseTree();
  const courses = [...(tree.focused || []), ...(tree.detailed || [])];
  const seen = new Set();
  return courses.filter(c => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });
}

function topicsForCourseFromQuestions(courseId) {
  const topics = new Set(state.questions.filter(q => !courseId || q.course === courseId).map(q => q.topic).filter(Boolean));
  return Array.from(topics).sort();
}




function shuffleArray(items = []) {
  return [...items].sort(() => Math.random() - 0.5);
}

function stopQuickExamTimer() {
  if (quickExamTimer) {
    clearInterval(quickExamTimer);
    quickExamTimer = null;
  }
}


function updateQuickExamTimer() {
  const pill = $('#quickExamTimer');
  if (!pill || !quickExamState) return;
  const remain = Math.max(0, quickExamState.remaining || 0);
  pill.textContent = `⏱ ${formatQuestionTime(remain)}`;
  pill.className = remain <= 60 ? 'timer-pill timer-warn' : 'timer-pill';
}




function bindForms() {
  // Question creation is contextual now: QBank → type → course → topic → Add MCQ.
}

let toastTimer;
function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 1800);
}



/* v72: Smart Review, real analytics, exam mode, and mistake flashcards */
function ensureStudyFeatureState() {
  if (!Array.isArray(state.mistakes)) state.mistakes = [];
  if (!Array.isArray(state.flashcards)) state.flashcards = [];
  if (!Array.isArray(state.examReports)) state.examReports = [];
  state.mistakes = state.mistakes.map(item => normalizeSmartMistake(item)).filter(Boolean);
}
function normalizeSmartMistake(item = {}) {
  if (!item) return null;
  const q = normalizeQuestion(item.question || {});
  const key = item.key || mistakeKey(q);
  const now = new Date().toISOString();
  const attempts = Math.max(1, Number(item.attempts || item.wrongStreak || 1));
  const status = item.status === 'mastered' || item.status === 'recovered'
    ? 'mastered'
    : (item.status === 'reviewed' ? 'reviewed' : 'active');
  return {
    ...item,
    key,
    question: q,
    attempts,
    wrongStreak: Math.max(0, Number(item.wrongStreak || 0)),
    status,
    correctReviewCount: Number(item.correctReviewCount || (status === 'mastered' ? 2 : 0)),
    dueAt: item.dueAt || item.nextReviewAt || item.updatedAt || item.createdAt || now,
    createdAt: item.createdAt || now,
    updatedAt: item.updatedAt || item.createdAt || now
  };
}

function addDaysIso(days = 1) {
  const d = new Date();
  d.setDate(d.getDate() + Number(days || 0));
  return d.toISOString();
}

function isDueToday(item = {}) {
  if (item.status === 'recovered' || item.status === 'reviewed') return false;
  const due = Date.parse(item.dueAt || item.updatedAt || item.createdAt || new Date().toISOString());
  if (!Number.isFinite(due)) return true;
  const end = new Date();
  end.setHours(23,59,59,999);
  return due <= end.getTime();
}

function dueWeakQuestions() {
  ensureStudyFeatureState();
  return (state.mistakes || []).filter(isDueToday);
}

function dueTextFor(item = {}) {
  if (item.status === 'recovered') return 'Recovered';
  if (item.status === 'reviewed') return 'Reviewed';
  const due = Date.parse(item.dueAt || '');
  if (!Number.isFinite(due)) return 'Due today';
  const today = new Date(); today.setHours(0,0,0,0);
  const dueDate = new Date(due); dueDate.setHours(0,0,0,0);
  const diff = Math.round((dueDate - today) / 86400000);
  if (diff <= 0) return 'Due today';
  if (diff === 1) return 'Tomorrow';
  return `In ${diff} days`;
}

function makeFlashcardFromQuestion(question = {}) {
  const q = normalizeQuestion(question);
  const key = mistakeKey(q);
  if (!key || !q.stem) return;
  if (!Array.isArray(state.flashcards)) state.flashcards = [];
  const existing = state.flashcards.find(card => card.key === key);
  const correctAnswer = q.options?.[q.correct] || 'Correct answer';
  const front = q.takeaway ? `${q.takeaway}` : q.stem.slice(0, 160);
  const back = `${correctAnswer}. ${q.explanation || q.takeaway || 'Review the explanation again.'}`;
  const payload = {
    key,
    questionId: q.id,
    course: q.course,
    topic: q.topic,
    subtopic: q.subtopic || '',
    front,
    back,
    stem: q.stem,
    answer: correctAnswer,
    takeaway: q.takeaway || '',
    ease: existing?.ease || 'again',
    dueAt: existing?.dueAt || new Date().toISOString(),
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  if (existing) Object.assign(existing, payload);
  else state.flashcards.unshift(payload);
  const savedCard = (state.flashcards || []).find(card => card.key === key) || payload;
  if (typeof saveFlashcardProgressToSupabase === 'function') {
    saveFlashcardProgressToSupabase(savedCard, { immediate: false, skipCounters: true }).catch?.(() => {});
  }
}

function legacyExamRecordMistakeV73(question, selectedIndex) {
  ensureStudyFeatureState();
  const normalized = normalizeQuestion(question);
  const key = normalized.__mistakeKey || mistakeKey(normalized);
  const existing = (state.mistakes || []).find(item => item.key === key);
  const snapshot = {
    id: normalized.id,
    mode: normalized.mode,
    course: normalized.course,
    topic: normalized.topic,
    lecture: normalized.lecture,
    subtopic: normalized.subtopic || '',
    difficulty: normalized.difficulty,
    stem: normalized.stem,
    options: normalized.options,
    correct: normalized.correct,
    explanation: normalized.explanation,
    correctExplanation: normalized.correctExplanation,
    optionExplanations: normalized.optionExplanations || [],
    wrong: normalized.wrong || [],
    takeaway: normalized.takeaway
  };
  const chosenText = selectedIndex === null || selectedIndex === undefined ? 'No answer before time expired' : `${optionLabel(selectedIndex)}: ${normalized.options[selectedIndex] || ''}`;
  const autoNote = `Your answer: ${chosenText}. Correct answer: ${optionLabel(normalized.correct)}: ${normalized.options[normalized.correct] || ''}.`;
  const now = new Date().toISOString();
  const nextWrongStreak = Math.max(1, Number(existing?.wrongStreak || 0) + 1);
  const interval = nextWrongStreak >= 2 ? 3 : 1;
  const payload = {
    key,
    question: snapshot,
    selected: selectedIndex,
    attempts: Math.max(1, Number(existing?.attempts || 0) + 1),
    wrongStreak: nextWrongStreak,
    reviewIntervalDays: interval,
    dueAt: typeof addDaysIso === 'function' ? addDaysIso(interval) : now,
    status: 'active',
    correctReviewCount: 0,
    autoNote,
    personalNote: existing?.personalNote || '',
    createdAt: existing?.createdAt || now,
    updatedAt: now
  };
  if (existing) Object.assign(existing, payload);
  else state.mistakes = [payload, ...(state.mistakes || [])];
  if (typeof saveQuestionMistakeToSupabase === 'function') {
    const cloudItem = (state.mistakes || []).find(item => item.key === key);
    if (cloudItem) saveQuestionMistakeToSupabase(cloudItem, { immediate: true }).catch?.(() => {});
  }
  if (typeof makeFlashcardFromQuestion === 'function') makeFlashcardFromQuestion(normalized);
}
function markRecoveredIfKnown(question = {}) {
  ensureStudyFeatureState();
  const q = normalizeQuestion(question);
  const key = mistakeKey(q);
  const item = (state.mistakes || []).find(m => m.key === key);
  if (!item) return false;
  item.correctReviewCount = Number(item.correctReviewCount || 0) + 1;
  item.status = item.correctReviewCount >= 2 ? 'mastered' : 'reviewed';
  item.updatedAt = new Date().toISOString();
  item.wrongStreak = 0;
  item.dueAt = null;
  if (item.status === 'mastered') item.masteredAt = new Date().toISOString();
  else item.reviewedAt = new Date().toISOString();
  if (typeof saveQuestionMistakeToSupabase === 'function') saveQuestionMistakeToSupabase(item, { immediate: true }).catch?.(() => {});
  return item.status === 'mastered';
}


function legacyExamRenderMistakesV73() {
  const list = $('#mistakesList');
  const stats = $('#mistakeStatsGrid');
  if (!list || !stats) return;
  normalizeMistakeStateV102();
  ensureMistakeViewValid();
  const mistakes = state.mistakes || [];
  const active = mistakes.filter(item => mistakeStatus(item) === 'active');
  const reviewed = mistakes.filter(item => mistakeStatus(item) === 'reviewed');
  const mastered = mistakes.filter(item => mistakeStatus(item) === 'mastered');
  const systems = Object.keys(groupBy(active.length ? active : mistakes, mistakeSystemKey));
  stats.innerHTML = `
    <article class="mistake-stat"><b>${active.length}</b><span>Active mistakes</span></article>
    <article class="mistake-stat"><b>${reviewed.length}</b><span>Under review</span></article>
    <article class="mistake-stat"><b>${mastered.length}</b><span>Mastered</span></article>
    <article class="mistake-stat"><b>${systems.length}</b><span>Weak systems</span></article>
  `;
  if (!mistakes.length) {
    list.innerHTML = `
      <div class="mistake-empty">
        <div class="hub-icon">✅</div>
        <h3>No mistakes yet</h3>
        <p>When you choose a wrong answer in QBank or Exam Mode, it will appear here automatically for review.</p>
        <button class="primary-btn small" type="button" data-nav="qbank">Open QBank</button>
      </div>
    `;
    list.querySelector('[data-nav="qbank"]')?.addEventListener('click', () => { if (typeof closeModal === 'function') closeModal(); navigate('qbank'); });
    return;
  }
  const current = filteredMistakes();
  if (mistakeView.level === 'courses') list.innerHTML = renderMistakeCourses(mistakes);
  if (mistakeView.level === 'systems') list.innerHTML = renderMistakeSystems(current);
  if (mistakeView.level === 'topics') list.innerHTML = renderMistakeTopics(current);
  if (mistakeView.level === 'questions') list.innerHTML = renderMistakeQuestions(current);
}

function mistakeTemplate(item) {
  const q = normalizeQuestion(item.question || {});
  const selectedRaw = item.selected;
  const selected = selectedRaw === null || selectedRaw === undefined ? null : Number(selectedRaw);
  const correct = Number(q.correct);
  const status = mistakeStatus(item);
  const selectedText = selected === null || selected === undefined || Number.isNaN(selected)
    ? 'No answer'
    : `${optionLabel(selected)}. ${q.options[selected] || ''}`;
  const correctText = `${optionLabel(correct)}. ${q.options[correct] || ''}`;
  const explanationText = q.explanation || q.takeaway || item.autoNote || 'No explanation is saved for this question yet.';
  const highlightText = q.takeaway || q.explanation || 'Add your own clue below so this mistake becomes easier to remember.';
  return `
    <article class="mistake-card ${status}">
      <div class="mistake-card-head clean-mistake-head-v109">
        <div>
          <h3>${esc(q.stem)}</h3>
        </div>
        <span class="mistake-status ${status}">${esc(mistakeStatusLabel(status))}</span>
      </div>
      <div class="mistake-answer-summary">
        <div><b>Your wrong answer</b><span>${esc(selectedText)}</span></div>
        <div><b>Correct answer</b><span>${esc(correctText)}</span></div>
      </div>
      <details class="mistake-details clean-mistake-details-v109" open>
        <summary>Show explanation and highlight</summary>
        <div class="mistake-explanation-card-v109">
          <b>Explanation</b>
          <p>${esc(explanationText)}</p>
        </div>
        <div class="mistake-highlight-card-v109">
          <b>Highlight</b>
          <p>${esc(highlightText)}</p>
        </div>
      </details>
      <label class="personal-note-label">
        <span>My note</span>
        <textarea data-mistake-note="${esc(item.key)}" placeholder="Write why you missed it or the clue you need to remember...">${esc(item.personalNote || '')}</textarea>
      </label>
      <div class="mistake-review-count">Correct answers during review: <b>${Number(item.correctReviewCount || 0)}</b>/2</div>
      <div class="mistake-actions">
        <button class="primary-btn small" type="button" data-practice-mistake="${esc(item.key)}">Quiz this question</button>
        <button class="soft-btn small" type="button" data-remind-mistake="${esc(item.key)}">Remind me</button>
        <button class="soft-btn small" type="button" data-mark-reviewed="${esc(item.key)}">${status === 'reviewed' ? 'Move to active' : 'Mark as reviewed'}</button>
        <button class="soft-btn small" type="button" data-mark-mastered="${esc(item.key)}">Mark as mastered</button>
      </div>
    </article>
  `;
}


function analyticsSummary() {
  const stats = Object.values(normalizeQbankStats(state.qbankStats || {}));
  const attempts = normalizeQbankAttempts(state.qbankAttempts || []);
  const videos = Object.values(normalizeVideoProgress(state.videoProgress || {}));
  const byCourse = {};
  stats.forEach(s => {
    const key = s.course || 'general';
    if (!byCourse[key]) byCourse[key] = { correct:0, attempts:0 };
    byCourse[key].correct += Number(s.correct || 0);
    byCourse[key].attempts += Number(s.attempts || 0);
  });
  const courseRows = Object.entries(byCourse).map(([course, row]) => ({ course, accuracy: row.attempts ? Math.round(row.correct / row.attempts * 100) : 0, attempts: row.attempts })).sort((a,b)=>b.attempts-a.attempts);
  const weakTopics = stats.filter(s => s.attempts > 0).map(s => ({ topic: s.subtopic || s.topic || 'General', course: s.course, accuracy: Math.round((s.correct || 0) / Math.max(1, s.attempts) * 100), attempts:s.attempts })).sort((a,b)=>a.accuracy-b.accuracy || b.attempts-a.attempts).slice(0,5);
  const abandoned = videos.filter(v => Number(v.percent || 0) > 0 && Number(v.percent || 0) < 80).sort((a,b)=>Number(a.percent||0)-Number(b.percent||0)).slice(0,5);
  const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - 7);
  const solvedWeek = attempts.filter(a => Date.parse(a.at || a.lastAt || a.updatedAt || 0) >= weekStart.getTime()).length;
  const studySeconds = videos.reduce((sum, v) => sum + (Number(v.duration || 0) ? Math.min(Number(v.currentTime || 0), Number(v.duration || 0)) : 0), 0);
  const recommendation = weakTopics[0] ? `Review ${weakTopics[0].topic} because your accuracy is ${weakTopics[0].accuracy}%.` : 'Solve more MCQs to generate accurate weak-point recommendations.';
  return { courseRows, weakTopics, abandoned, solvedWeek, studySeconds, recommendation, stats, videos };
}

function renderAnalytics() {
  const root = $('#analyticsDashboard');
  if (!root) return;
  const a = analyticsSummary();
  const totalAttempts = a.stats.reduce((s,x)=>s+Number(x.attempts||0),0);
  const totalCorrect = a.stats.reduce((s,x)=>s+Number(x.correct||0),0);
  const overall = totalAttempts ? Math.round(totalCorrect / totalAttempts * 100) : 0;
  const hours = Math.floor(a.studySeconds / 3600);
  const mins = Math.round((a.studySeconds % 3600) / 60);
  root.innerHTML = `
    <div class="analytics-head"><div><span class="eyebrow">Real Analytics</span><h2>Progress intelligence</h2><p>${esc(a.recommendation)}</p></div><div class="analytics-score-ring"><b>${overall}%</b><span>overall accuracy</span></div></div>
    <div class="analytics-kpi-grid">
      <article><b>${a.solvedWeek}</b><span>questions this week</span></article>
      <article><b>${hours}h ${mins}m</b><span>study time tracked</span></article>
      <article><b>${a.weakTopics.length}</b><span>weak topics found</span></article>
      <article><b>${a.abandoned.length}</b><span>lectures left midway</span></article>
    </div>
    <div class="analytics-two-col">
      <section><h3>Accuracy by subject</h3>${a.courseRows.map(row => `<div class="analytics-bar-row"><span>${esc(baseCourseTitle(row.course))}</span><b>${row.accuracy}%</b><i style="--w:${row.accuracy}%"></i></div>`).join('') || '<p class="empty-note">No solved MCQs yet.</p>'}</section>
      <section><h3>Weakest 5 topics</h3>${a.weakTopics.map(row => `<div class="analytics-list-row"><b>${esc(row.topic)}</b><span>${row.accuracy}% • ${row.attempts} attempt${row.attempts===1?'':'s'}</span></div>`).join('') || '<p class="empty-note">No weak topics yet.</p>'}</section>
      <section><h3>Abandoned lectures</h3>${a.abandoned.map(v => `<div class="analytics-list-row"><b>${esc(v.title || v.id)}</b><span>${Number(v.percent||0)}% watched</span></div>`).join('') || '<p class="empty-note">No abandoned lectures yet.</p>'}</section>
      <section><h3>Automatic recommendation</h3><div class="analytics-reco-card">${esc(a.recommendation)}</div></section>
    </div>`;
}

function renderFlashcards() {
  const root = $('#flashcardsPanel');
  if (!root) return;
  ensureStudyFeatureState();
  const cards = state.flashcards || [];
  root.innerHTML = `
    <div class="flashcards-head"><div><span class="eyebrow">Mistake Flashcards</span><h2>Cards from wrong answers</h2><p>Front = clue/stem. Back = answer and takeaway. Rate each card: Easy / Hard / Again.</p></div><b>${cards.length} cards</b></div>
    <div class="flashcard-grid">
      ${cards.map(card => `<article class="flashcard-item"><div class="flashcard-front"><span class="eyebrow">${esc(baseCourseTitle(card.course))} • ${esc(card.topic)}</span><h3>${esc(card.front)}</h3></div><details><summary>Show back</summary><p>${esc(card.back)}</p><small>${esc(card.takeaway || '')}</small></details><div class="flashcard-actions"><button class="soft-btn small" data-flashcard-rate="easy" data-card-key="${esc(card.key)}">Easy</button><button class="soft-btn small" data-flashcard-rate="hard" data-card-key="${esc(card.key)}">Hard</button><button class="primary-btn small" data-flashcard-rate="again" data-card-key="${esc(card.key)}">Again</button></div></article>`).join('')}
    </div>`;
}

function bindAdminTabs() {
  $$('[data-admin-tab]').forEach(btn => btn.addEventListener('click', () => showAdminTab(btn.dataset.adminTab)));
  $('#mistakesList')?.addEventListener('click', event => {
    const dueBtn = event.target.closest('[data-practice-due-mistakes]');
    const recoveredBtn = event.target.closest('[data-mark-recovered]');
    if (dueBtn) {
      const pool = dueWeakQuestions().map(item => normalizeQuestion(item.question || {}));
      if (pool.length) openQbankSetPlayerModal(pool);
      else showToast('No due weak questions today');
    }
    if (recoveredBtn) {
      const item = (state.mistakes || []).find(m => m.key === recoveredBtn.dataset.markRecovered);
      if (item) { item.status = 'recovered'; item.recoveredAt = new Date().toISOString(); item.updatedAt = new Date().toISOString(); saveState(); if (typeof saveQuestionMistakeToSupabase === 'function') saveQuestionMistakeToSupabase(item, { immediate: true }).catch?.(() => {}); renderMistakes(); renderProfileStats(); showToast('Moved to Recovered'); }
    }
  });
  $('#flashcardsPanel')?.addEventListener('click', event => {
    const rate = event.target.closest('[data-flashcard-rate]');
    if (!rate) return;
    const card = (state.flashcards || []).find(c => c.key === rate.dataset.cardKey);
    if (!card) return;
    card.ease = rate.dataset.flashcardRate;
    card.lastRating = rate.dataset.flashcardRate;
    card.reviewCount = Number(card.reviewCount || 0) + 1;
    card.correctCount = Number(card.correctCount || 0) + (card.ease === 'easy' ? 1 : 0);
    card.wrongCount = Number(card.wrongCount || 0) + (card.ease === 'again' ? 1 : 0);
    card.reviewedAt = new Date().toISOString();
    card.updatedAt = card.reviewedAt;
    card.dueAt = addDaysIso(card.ease === 'easy' ? 7 : card.ease === 'hard' ? 3 : 1);
    if (typeof saveFlashcardProgressToSupabase === 'function') saveFlashcardProgressToSupabase(card, { immediate: true }).catch?.(() => {});
    saveState(); renderFlashcards(); showToast(`Marked ${card.ease}`);
  });
}

function renderProfileStats() {
  const line = $('#profileStatsLine');
  const profileName = $('#profileName');
  const profileMode = $('#profileMode');
  const activeMistakes = (state.mistakes || []).filter(item => typeof mistakeStatus === 'function' ? mistakeStatus(item) === 'active' : !['reviewed', 'mastered', 'recovered'].includes(item.status)).length;
  const roleLabel = isAdmin() ? 'Admin mode' : (isStudent() ? 'My account' : 'Guest preview');
  if (profileName) profileName.textContent = isAdmin() ? 'NovaMed Admin' : (isStudent() ? currentUserName() : 'Create your profile');
  if (profileMode) profileMode.textContent = isAdmin() ? 'Owner workspace' : (isStudent() ? 'Student profile' : 'Public preview');
  if (line) {
    line.textContent = isStudent()
      ? `${roleLabel} • ${state.xp.toLocaleString()} XP • ${activeMistakes} mistakes to review`
      : isAdmin()
        ? `${roleLabel} • content management unlocked`
        : `${roleLabel} • sign up to save XP, to-do, mistakes, and progress`;
  }
  const mini = $('#mistakeMiniGoal');
  if (mini) mini.textContent = String(activeMistakes);
  updateProfileSyncStatus();
}










/* v73-fix: universal QBank tracking + flashcards + supplemental MCQs */


function legacyExamQuestionsForV73({ mode, course, topic, subtopic } = {}) {
  ensureSupplementalMcqsV73();
  return state.questions.map(normalizeQuestion).filter(question => {
    if (mode && question.mode !== mode) return false;
    if (course && question.course !== course) return false;
    if (topic && question.topic !== topic) return false;
    if (subtopic && (question.subtopic || inferQuestionSubtopic(question)) !== subtopic) return false;
    return true;
  });
}


function legacyExamRecordQbankAttemptV73(question, selectedIndex, options = {}) {
  const normalized = normalizeQuestion(question);
  const key = questionProgressKey(normalized);
  if (!key) return;
  const now = new Date().toISOString();
  const timedOut = Boolean(options.timedOut);
  const isCorrect = !timedOut && Number(selectedIndex) === Number(normalized.correct);
  state.qbankStats = normalizeQbankStats(state.qbankStats || {});
  const previous = state.qbankStats[key] || {};
  state.qbankStats[key] = {
    ...previous,
    id: key,
    stem: normalized.stem,
    mode: normalized.mode,
    course: normalized.course,
    topic: normalized.topic,
    subtopic: normalized.subtopic || '',
    attempts: Number(previous.attempts || 0) + 1,
    correct: Number(previous.correct || 0) + (isCorrect ? 1 : 0),
    wrong: Number(previous.wrong || 0) + (!isCorrect && !timedOut ? 1 : 0),
    timeouts: Number(previous.timeouts || 0) + (timedOut ? 1 : 0),
    lastSelected: selectedIndex ?? null,
    correctIndex: normalized.correct,
    lastResult: timedOut ? 'timeout' : (isCorrect ? 'correct' : 'wrong'),
    lastAt: now,
    updatedAt: now
  };
  state.qbankAttempts = normalizeQbankAttempts([...(state.qbankAttempts || []), {
    id: `${key}-${now}-${Math.random().toString(16).slice(2,8)}`,
    questionId: key,
    stem: normalized.stem,
    mode: normalized.mode,
    course: normalized.course,
    topic: normalized.topic,
    subtopic: normalized.subtopic || '',
    selected: selectedIndex ?? null,
    correctIndex: normalized.correct,
    isCorrect,
    timedOut,
    source: options.source || 'qbank',
    at: now
  }]);
  if (typeof saveQbankAttemptToSupabase === 'function') {
    saveQbankAttemptToSupabase(normalized, selectedIndex, { ...options, timedOut, isCorrect, source: options.source || 'qbank' }).catch?.(() => {});
  }
}

async function legacyExamHandleQuestionTimeoutV73(q) {
  const explanation = $('#explanationBox');
  if (!explanation || explanation.classList.contains('show')) return;
  revealQuestionFeedback(q, null, { timedOut: true });
  recordQbankAttempt(q, null, { timedOut: true, source: 'qbank' });
  recordMistake(q, null);
  updateMistakeReviewOutcome(q, null, false);
  await window.awardStudentXpSecure?.('qbank_timeout', window.rewardQuestionKeyV148?.(q) || `timeout:${Date.now()}`, {
    source: 'qbank',
    course: q.course || '',
    chapter: q.chapter || '',
    lecture: q.lecture || '',
    topic: q.topic || ''
  }, { toast: 'Time is up — saved to My Mistakes +{xp} XP', duplicateToast: 'Time-out reward already counted' });
  saveState(); updateMiniStats(); renderMistakes(); renderAnalytics(); renderFlashcards();
  showToast('Time is up — saved to My Mistakes');
}


async function legacyExamHandleAnswerV73(btn, q) {
  stopQbankTimer();
  const normalized = normalizeQuestion(q);
  const selected = Number(btn.dataset.answer);
  const isCorrect = selected === Number(normalized.correct);
  revealQuestionFeedback(normalized, selected);
  recordQbankAttempt(normalized, selected, { timedOut: false, source: 'qbank' });

  const fromMistakeReview = Boolean(normalized.__fromMistakeReview || normalized.__mistakeKey);
  let recovered = false;
  if (fromMistakeReview) {
    updateMistakeReviewOutcome(normalized, selected, isCorrect);
  } else if (!isCorrect) {
    recordMistake(normalized, selected);
  } else if (typeof markRecoveredIfKnown === 'function') {
    recovered = markRecoveredIfKnown(normalized);
  }

  const rewardType = fromMistakeReview ? 'mistake_reviewed' : (isCorrect ? 'qbank_correct' : 'qbank_wrong');
  const rewardKey = fromMistakeReview
    ? (window.rewardEventKeyV148?.(['mistake-review', normalized.__mistakeKey || normalized.id || normalized.stem, selected]) || `mistake-review:${normalized.__mistakeKey || normalized.id || normalized.stem}:${selected}`)
    : (window.rewardQuestionKeyV148?.(normalized) || `question:${normalized.id || normalized.stem}`);
  await window.awardStudentXpSecure?.(rewardType, rewardKey, {
    source: 'qbank',
    selected,
    is_correct: isCorrect,
    course: normalized.course || '',
    chapter: normalized.chapter || '',
    lecture: normalized.lecture || '',
    topic: normalized.topic || ''
  }, { toast: isCorrect ? 'Correct +{xp} XP' : 'Saved to My Mistakes + Flashcards +{xp} XP', duplicateToast: 'Question reward already counted' });
  saveState(); updateMiniStats(); renderMistakes(); renderAnalytics(); renderFlashcards();
  if (fromMistakeReview) showToast(isCorrect ? 'Correct answer — mistake status updated' : 'The question remains in active mistakes');
  else if (!isCorrect) showToast('Saved to My Mistakes + Flashcards + Analytics');
  else if (recovered) showToast('Question recovered from weak review');
  else showToast('Correct +18 XP • Analytics updated');
}


function showAdminTab(id) {
  $$('.admin-tab').forEach(tab => tab.classList.toggle('active', tab.id === id));
  ensureStudyFeatureState();
  if (id === 'mistakes') renderMistakes();
  if (id === 'analytics') renderAnalytics();
  if (id === 'flashcards') renderFlashcards();
}



/* v74-fix: timed exam answers are editable until finishing the exam */




/* v75: timed exam question navigator + flag/unsure review warning */










/* v76: exam cleanup - remove flag UI, keep Unsure beside Next, default custom MCQs to max available */











/* v77: compact question navigator + remove 10/25/50/100 presets */





/* v78: Live Exam + Auto Save + Resume */
const LIVE_EXAM_KEY = 'novamed-live-timed-exam-v1';

function liveExamNow() {
  return Date.now();
}

function liveExamRemainingSeconds(exam) {
  const endAt = Number(exam?.endAt || 0);
  if (!endAt) return 0;
  return Math.max(0, Math.ceil((endAt - liveExamNow()) / 1000));
}

function normalizeLiveExamForRuntime(exam) {
  try {
    const saved = exam && typeof exam === 'object' ? { ...exam } : null;
    if (!saved || !Array.isArray(saved.pool) || !saved.pool.length) return null;
    saved.pool = saved.pool.map(normalizeQuestion);
    saved.selected = saved.selected && typeof saved.selected === 'object' ? saved.selected : {};
    saved.unsure = saved.unsure && typeof saved.unsure === 'object' ? saved.unsure : {};
    saved.index = Math.max(0, Math.min(Number(saved.index || 0), saved.pool.length - 1));
    saved.totalSeconds = Math.max(60, Number(saved.totalSeconds || 60));
    saved.endAt = Number(saved.endAt || 0);
    saved.startedAt = saved.startedAt || new Date(liveExamNow()).toISOString();
    saved.liveId = saved.liveId || `live-${Date.now()}`;
    return saved;
  } catch {
    return null;
  }
}

function readLiveExam() {
  // Phase 2A: do not read live exam from localStorage. The active exam is restored
  // from Supabase live_exams into this in-memory cache after auth restoration.
  return normalizeLiveExamForRuntime(window.__novamedLiveExamCache || null);
}

function writeLiveExam(exam) {
  if (!exam || !Array.isArray(exam.pool) || !exam.pool.length) return;
  const safe = {
    liveId: exam.liveId || quickExamState?.liveId || `live-${Date.now()}`,
    pool: exam.pool.map(normalizeQuestion),
    index: Math.max(0, Number(exam.index || 0)),
    totalSeconds: Math.max(60, Number(exam.totalSeconds || 60)),
    endAt: Number(exam.endAt || 0),
    startedAt: exam.startedAt || new Date(liveExamNow()).toISOString(),
    selected: exam.selected || {},
    unsure: exam.unsure || {},
    meta: exam.meta || {},
    navExpanded: Boolean(exam.navExpanded),
    updatedAt: new Date().toISOString()
  };
  // Phase 2A: cache in memory only, then persist to Supabase live_exams.
  window.__novamedLiveExamCache = safe;
  if (typeof saveLiveExamToSupabase === 'function') {
    saveLiveExamToSupabase(safe).catch(err => console.warn('NovaMed live exam cloud save failed:', err?.message || err));
  }
  renderLiveExamIndicators();
}

function clearLiveExam() {
  // Phase 2A: clear active exam from memory and mark Supabase live_exams as cancelled.
  const cached = readLiveExam();
  window.__novamedLiveExamCache = null;
  if (typeof clearLiveExamFromSupabase === 'function') {
    clearLiveExamFromSupabase(cached).catch(err => console.warn('NovaMed live exam cloud clear failed:', err?.message || err));
  }
  renderLiveExamIndicators();
}

function hasLiveExam() {
  return Boolean(readLiveExam());
}

function saveCurrentLiveExam() {
  if (!quickExamState || !quickExamState.liveId) return;
  quickExamState.remaining = liveExamRemainingSeconds(quickExamState);
  writeLiveExam(quickExamState);
}

function liveExamStatusText(exam = readLiveExam()) {
  if (!exam) return '';
  const remain = liveExamRemainingSeconds(exam);
  if (remain <= 0) return 'Time ended — review result';
  const answered = Object.keys(exam.selected || {}).filter(k => exam.selected[k] !== undefined && exam.selected[k] !== null).length;
  return `${answered}/${exam.pool.length} answered • ${formatQuestionTime(remain)} left`;
}

function discardLiveExamSilently(message = 'Live exam cancelled') {
  clearLiveExam();
  quickExamState = null;
  stopQuickExamTimer();
  renderLiveExamIndicators();
  if (message) showToast(message);
}

function renderLiveExamIndicators() {
  const exam = readLiveExam();
  const live = Boolean(exam);
  const trigger = $('#quickExamTrigger') || document.querySelector('#screen-qbank .quick-exam-trigger');
  if (trigger) {
    trigger.textContent = live ? '🟢 Live exam' : '⚡ Wizary mode';
    trigger.classList.toggle('live-exam-trigger', live);
  }

  const rapidCopy = $('.rapid-exam-copy');
  if (rapidCopy && live) {
    const h2 = rapidCopy.querySelector('h2');
    const p = rapidCopy.querySelector('p');
    if (h2) h2.textContent = liveExamRemainingSeconds(exam) <= 0 ? 'Exam time ended' : 'Continue live exam';
    if (p) p.textContent = liveExamStatusText(exam);
  } else if (rapidCopy && !live) {
    const h2 = rapidCopy.querySelector('h2');
    const p = rapidCopy.querySelector('p');
    if (h2) h2.textContent = 'Start real exam';
    if (p) p.textContent = 'Timed exam, mixed mode, unsure marking, hidden explanations, and a score report.';
  }

  const startBtn = $('#startRapidExamFromQbank');
  if (startBtn) startBtn.textContent = live ? (liveExamRemainingSeconds(exam) <= 0 ? 'Review result' : 'Resume exam') : 'Start exam';

  const liveExamBannerScreens = ['screen-home', 'screen-learn', 'screen-qbank'];
  document.querySelectorAll('[data-live-exam-banner]').forEach(banner => {
    const ownerScreen = banner.closest('.screen');
    if (!live || !ownerScreen || !liveExamBannerScreens.includes(ownerScreen.id)) {
      banner.remove();
    }
  });

  liveExamBannerScreens.forEach(id => {
    const screen = document.getElementById(id);
    if (!screen) return;
    let banner = screen.querySelector('[data-live-exam-banner]');
    if (!live) {
      banner?.remove();
      return;
    }
    if (!banner) {
      banner = document.createElement('div');
      banner.className = 'live-exam-banner premium-card live-exam-actions-banner';
      banner.setAttribute('data-live-exam-banner','1');
      const anchor = screen.querySelector('.page-title, .hero-card');
      if (anchor?.parentElement) anchor.insertAdjacentElement('afterend', banner);
      else screen.prepend(banner);
    }
    const expired = liveExamRemainingSeconds(exam) <= 0;
    banner.innerHTML = `
      <span class="live-dot"></span>
      <div class="live-exam-banner-copy">
        <b>${expired ? 'Exam time ended' : 'Live exam now'}</b>
        <small>${esc(liveExamStatusText(exam))}</small>
      </div>
      <div class="live-exam-banner-actions">
        <button class="primary-btn small" type="button" data-resume-live-exam>${expired ? 'Review result' : 'Resume exam'}</button>
        <button class="soft-btn small danger-soft" type="button" data-cancel-live-exam>Cancel exam</button>
      </div>
    `;
    banner.querySelector('[data-resume-live-exam]')?.addEventListener('click', () => openQuickExamBuilderModal(getDefaultExamTarget()));
    banner.querySelector('[data-cancel-live-exam]')?.addEventListener('click', () => discardLiveExamSilently('Live exam cancelled. No score was saved.'));
  });
}

function openLiveExamExpiredModal(exam = readLiveExam(), defaults = {}) {
  if (!exam) return showExamSetupModal(defaults || getDefaultExamTarget(), { calendarMode: false });
  const answered = Object.keys(exam.selected || {}).filter(k => exam.selected[k] !== undefined && exam.selected[k] !== null).length;
  showModal(`
    <h2 id="modalTitle">Live exam time ended</h2>
    <div class="live-expired-card">
      <div class="live-expired-icon">⏱</div>
      <h3>Your saved exam is finished</h3>
      <p>You answered ${answered}/${exam.pool.length} questions. You can show the saved score report, or cancel this live exam and start a new one.</p>
      <div class="modal-button-row">
        <button class="primary-btn" id="showExpiredLiveResult" type="button">Show saved result</button>
        <button class="soft-btn" id="discardLiveExam" type="button">Cancel live exam</button>
      </div>
    </div>
  `);
  $('#showExpiredLiveResult')?.addEventListener('click', () => {
    resumeLiveExam(exam);
    finishQuickExam(true);
  });
  $('#discardLiveExam')?.addEventListener('click', () => {
    discardLiveExamSilently('Live exam cancelled');
    showExamSetupModal(defaults || getDefaultExamTarget(), { calendarMode: false });
  });
}

function resumeLiveExam(exam = readLiveExam()) {
  if (!exam) return false;
  stopQuickExamTimer();
  quickExamState = {
    ...exam,
    pool: exam.pool.map(normalizeQuestion),
    index: Math.max(0, Math.min(Number(exam.index || 0), exam.pool.length - 1)),
    selected: exam.selected || {},
    unsure: exam.unsure || {},
    navExpanded: Boolean(exam.navExpanded),
    remaining: liveExamRemainingSeconds(exam),
    liveId: exam.liveId || `live-${Date.now()}`
  };

  if (quickExamState.remaining <= 0) {
    writeLiveExam(quickExamState);
    openLiveExamExpiredModal(quickExamState);
    return true;
  }

  setModalVariant('real-exam-modal-card');
  showModal(`<h2 id="modalTitle">Timed exam</h2><div class="quick-exam-shell real-exam-shell"><div class="quick-exam-status"><b id="quickExamCounter"></b><span id="quickExamTimer"></span></div><div id="quickExamBody"></div></div>`);
  renderQuickExamQuestion();
  quickExamTimer = setInterval(() => {
    if (!quickExamState) return;
    quickExamState.remaining = liveExamRemainingSeconds(quickExamState);
    updateQuickExamTimer();
    saveCurrentLiveExam();
    if (quickExamState.remaining <= 0) finishQuickExam(true);
  }, 1000);
  renderLiveExamIndicators();
  return true;
}

function openQuickExamBuilderModal(defaults = {}) {
  const live = readLiveExam();
  if (live) {
    if (liveExamRemainingSeconds(live) <= 0) return openLiveExamExpiredModal(live, defaults || getDefaultExamTarget());
    resumeLiveExam(live);
    showToast('Live exam resumed');
    return;
  }
  showExamSetupModal(defaults || getDefaultExamTarget(), { calendarMode: false });
}


function startQuickExamSession(pool, minutes, meta = {}) {
  const totalSeconds = Math.max(60, Math.round(Number(minutes || 12) * 60));
  const now = liveExamNow();
  quickExamState = {
    liveId: `live-${now}`,
    pool,
    index: 0,
    score: 0,
    answered: 0,
    totalSeconds,
    remaining: totalSeconds,
    startedAt: new Date(now).toISOString(),
    endAt: now + totalSeconds * 1000,
    selected: {},
    unsure: {},
    navExpanded: false,
    finishWarning: false,
    report: [],
    meta
  };
  writeLiveExam(quickExamState);
  setModalVariant('real-exam-modal-card');
  showModal(`<h2 id="modalTitle">Timed exam</h2><div class="quick-exam-shell real-exam-shell"><div class="quick-exam-status"><b id="quickExamCounter"></b><span id="quickExamTimer"></span></div><div id="quickExamBody"></div></div>`);
  renderQuickExamQuestion();
  stopQuickExamTimer();
  quickExamTimer = setInterval(() => {
    if (!quickExamState) return;
    quickExamState.remaining = liveExamRemainingSeconds(quickExamState);
    updateQuickExamTimer();
    saveCurrentLiveExam();
    if (quickExamState.remaining <= 0) finishQuickExam(true);
  }, 1000);
  renderLiveExamIndicators();
}

function examQuestionStatus(q, index) {
  const id = q.id;
  const selected = quickExamState?.selected?.[id];
  const answered = selected !== undefined && selected !== null;
  const unsure = Boolean(quickExamState?.unsure?.[id]);
  return { answered, unsure, current: index === quickExamState.index };
}

function examQuestionNavigatorHtml() {
  if (!quickExamState) return '';
  const total = quickExamState.pool.length;
  const limit = 10;
  const expanded = Boolean(quickExamState.navExpanded);
  const current = Number(quickExamState.index || 0);
  let start = 0;
  let end = total;

  if (!expanded && total > limit) {
    start = current < limit ? 0 : Math.max(0, Math.min(current - Math.floor(limit / 2), total - limit));
    end = Math.min(total, start + limit);
  }

  const visiblePool = quickExamState.pool.slice(start, end);

  return `
    <aside class="exam-question-navigator compact limited" aria-label="Exam question numbers">
      <div class="exam-nav-title">
        <b>Questions</b>
        <span>${total} total</span>
      </div>
      <div class="exam-number-grid ${expanded ? 'expanded' : ''}">
        ${visiblePool.map((item, localIndex) => {
          const i = start + localIndex;
          const s = examQuestionStatus(item, i);
          const classes = [s.current ? 'current' : '', s.answered ? 'answered' : '', s.unsure ? 'unsure' : ''].filter(Boolean).join(' ');
          return `<button type="button" class="exam-number ${classes}" data-exam-jump="${i}" aria-label="Question ${i + 1}${s.unsure ? ' unsure' : ''}">${i + 1}</button>`;
        }).join('')}
      </div>
      ${total > limit ? `<button class="exam-nav-toggle" type="button" data-toggle-exam-nav>${expanded ? 'Show less' : `View ${start + 1}-${end}`}</button>` : ''}
    </aside>
  `;
}

function examPendingSummary() {
  if (!quickExamState) return { unanswered: [], unsure: [], total: 0 };
  const unanswered = [];
  const unsure = [];
  quickExamState.pool.forEach((q, index) => {
    const selected = quickExamState.selected[q.id];
    if (selected === undefined || selected === null) unanswered.push(index);
    if (quickExamState.unsure?.[q.id]) unsure.push(index);
  });
  return { unanswered, unsure, total: unanswered.length + unsure.length };
}

function pendingExamWarningHtml() {
  const p = examPendingSummary();
  if (!quickExamState?.finishWarning || !p.total) return '';
  return `
    <div class="exam-finish-warning">
      <div>
        <b>Review before finishing</b>
        <p>${p.unanswered.length ? `${p.unanswered.length} unanswered` : ''}${p.unanswered.length && p.unsure.length ? ' • ' : ''}${p.unsure.length ? `${p.unsure.length} unsure` : ''}</p>
      </div>
      <button class="soft-btn small" type="button" id="reviewMarkedQuestions">Review marked</button>
      <button class="primary-btn small danger-finish" type="button" id="finishAnyway">Finish anyway</button>
    </div>
  `;
}

function firstPendingExamIndex() {
  const p = examPendingSummary();
  const list = [...p.unsure, ...p.unanswered];
  return list.length ? list[0] : -1;
}

function renderQuickExamQuestion() {
  if (!quickExamState) return;
  if (!quickExamState.unsure) quickExamState.unsure = {};
  if (quickExamState.navExpanded === undefined) quickExamState.navExpanded = false;
  quickExamState.remaining = liveExamRemainingSeconds(quickExamState);
  if (quickExamState.remaining <= 0) return finishQuickExam(true);

  const q = quickExamState.pool[quickExamState.index];
  const body = $('#quickExamBody');
  const counter = $('#quickExamCounter');
  if (!q || !body) return;
  if (counter) counter.textContent = `Question ${quickExamState.index + 1}/${quickExamState.pool.length}`;
  updateQuickExamTimer();

  const chosen = quickExamState.selected[q.id];
  const unsure = Boolean(quickExamState.unsure[q.id]);

  body.innerHTML = `
    <div class="exam-player-layout compact-nav-layout">
      ${examQuestionNavigatorHtml()}
      <div class="quick-question-card">
        <div class="exam-question-head clean">
          <span class="eyebrow">${esc(q.course)} • ${esc(q.topic)} • ${esc(q.difficulty)}</span>
        </div>
        <h3>${esc(q.stem)}</h3>
        <div class="answers quick-answers">
          ${q.options.map((option, i) => `
            <button class="answer-btn ${Number(chosen) === i ? 'selected' : ''}" data-quick-answer="${i}">
              <b>${String.fromCharCode(65+i)}.</b> ${esc(option)}
            </button>
          `).join('')}
        </div>
        <p class="exam-hide-note">Auto-saved live exam. You can leave and resume without losing answers.</p>
        ${pendingExamWarningHtml()}
        <div class="quick-exam-nav with-unsure">
          <button class="soft-btn small" id="quickPrev" type="button">Previous</button>
          <div class="exam-nav-right-actions">
            <button class="soft-btn small unsure-bottom-btn ${unsure ? 'unsure-active' : ''}" id="markUnsureQuestion" type="button">● Unsure</button>
            <button class="primary-btn small" id="quickNext" type="button">${quickExamState.index === quickExamState.pool.length - 1 ? 'Finish exam' : 'Next'}</button>
          </div>
        </div>
      </div>
    </div>
  `;

  $$('[data-quick-answer]').forEach(btn => btn.addEventListener('click', () => {
    quickExamState.selected[q.id] = Number(btn.dataset.quickAnswer);
    quickExamState.finishWarning = false;
    saveCurrentLiveExam();
    renderQuickExamQuestion();
  }));

  $$('[data-exam-jump]').forEach(btn => btn.addEventListener('click', () => {
    quickExamState.index = Number(btn.dataset.examJump);
    quickExamState.finishWarning = false;
    saveCurrentLiveExam();
    renderQuickExamQuestion();
  }));

  $('[data-toggle-exam-nav]')?.addEventListener('click', () => {
    quickExamState.navExpanded = !quickExamState.navExpanded;
    saveCurrentLiveExam();
    renderQuickExamQuestion();
  });

  $('#markUnsureQuestion')?.addEventListener('click', () => {
    quickExamState.unsure[q.id] = !quickExamState.unsure[q.id];
    quickExamState.finishWarning = false;
    saveCurrentLiveExam();
    renderQuickExamQuestion();
  });

  $('#reviewMarkedQuestions')?.addEventListener('click', () => {
    const target = firstPendingExamIndex();
    if (target >= 0) quickExamState.index = target;
    quickExamState.finishWarning = false;
    saveCurrentLiveExam();
    renderQuickExamQuestion();
  });

  $('#finishAnyway')?.addEventListener('click', () => finishQuickExam(true));

  $('#quickPrev')?.addEventListener('click', () => {
    quickExamState.index = Math.max(0, quickExamState.index - 1);
    quickExamState.finishWarning = false;
    saveCurrentLiveExam();
    renderQuickExamQuestion();
  });

  $('#quickNext')?.addEventListener('click', () => {
    if (quickExamState.index >= quickExamState.pool.length - 1) {
      const pending = examPendingSummary();
      if (pending.total && !quickExamState.finishWarning) {
        quickExamState.finishWarning = true;
        saveCurrentLiveExam();
        renderQuickExamQuestion();
        showToast('You still have unsure or unanswered questions');
        return;
      }
      finishQuickExam(true);
    } else {
      quickExamState.index += 1;
      quickExamState.finishWarning = false;
      saveCurrentLiveExam();
      renderQuickExamQuestion();
    }
  });

  saveCurrentLiveExam();
}

async function finishQuickExam(force = false) {
  if (!quickExamState) return;
  const pending = examPendingSummary();
  if (!force && pending.total) {
    quickExamState.finishWarning = true;
    saveCurrentLiveExam();
    renderQuickExamQuestion();
    return;
  }

  stopQuickExamTimer();

  const snapshot = {
    ...quickExamState,
    unsure: { ...(quickExamState.unsure || {}) },
    selected: { ...(quickExamState.selected || {}) },
    finishedAt: new Date().toISOString()
  };

  const total = snapshot.pool.length || 1;
  let score = 0;
  let answered = 0;

  snapshot.pool.forEach(q => {
    const selected = snapshot.selected[q.id];
    const hasAnswer = selected !== undefined && selected !== null;
    if (hasAnswer) answered += 1;
    const correct = hasAnswer && Number(selected) === Number(q.correct);
    if (correct) {
      score += 1;
      markRecoveredIfKnown(q);
      recordQbankAttempt(q, selected, { source: 'timed-exam' });
    } else {
      if (hasAnswer) {
        recordQbankAttempt(q, selected, { source: 'timed-exam' });
        recordMistake(q, selected);
      } else {
        recordQbankAttempt(q, null, { source: 'timed-exam', timedOut: true });
        recordMistake(q, null);
      }
    }
  });

  const percent = Math.round(score / total * 100);
  const unsureCount = Object.values(snapshot.unsure || {}).filter(Boolean).length;

  const examRewardKey = window.rewardEventKeyV148?.(['timed-exam', snapshot.startedAt || snapshot.finishedAt || Date.now(), total, score]) || `timed-exam:${snapshot.startedAt || snapshot.finishedAt || Date.now()}`;
  await window.awardStudentXpSecure?.('exam_completed', examRewardKey, {
    source: 'timed-exam',
    total,
    score,
    percent: Math.round(score / total * 100),
    answered
  }, { toast: 'Exam completed +{xp} XP', duplicateToast: 'Exam reward already counted' });
  state.examReports = [{
    id: `exam-${Date.now()}`,
    total,
    score,
    percent,
    answered,
    unsure: unsureCount,
    finishedAt: snapshot.finishedAt
  }, ...(state.examReports || [])].slice(0, 10);

  clearLiveExam();
  saveState();
  updateMiniStats();
  renderMistakes();
  renderAnalytics();
  renderFlashcards();

  const reviewRows = snapshot.pool.map((q, i) => {
    const selected = snapshot.selected[q.id];
    const hasAnswer = selected !== undefined && selected !== null;
    const correct = hasAnswer && Number(selected) === Number(q.correct);
    return `
      <article class="exam-review-row ${correct ? 'correct' : 'wrong'} ${snapshot.unsure[q.id] ? 'unsure' : ''}">
        <b>Q${i+1}</b>
        <div>
          <p>${esc(q.stem)}</p>
          <small>${snapshot.unsure[q.id] ? 'Unsure • ' : ''}Your answer: ${hasAnswer ? `${optionLabel(selected)}. ${esc(q.options[selected])}` : 'Not answered'} • Correct: ${optionLabel(q.correct)}. ${esc(q.options[q.correct])}</small>
          <details>
            <summary>Explanation</summary>
            <p>${esc(q.explanation)}</p>
            <p><b>Takeaway:</b> ${esc(q.takeaway)}</p>
          </details>
        </div>
      </article>
    `;
  }).join('');

  showModal(`
    <h2 id="modalTitle">Score report</h2>
    <div class="exam-result-card score-report">
      <div class="exam-score-ring"><b>${percent}%</b><span>${score}/${total}</span></div>
      <p>${percent >= 80 ? 'Excellent route progress.' : percent >= 60 ? 'Good, review unsure and wrong questions.' : 'Weak areas saved to Smart Review.'}</p>
      <div class="exam-report-metrics">
        <span>${answered}/${total} answered</span>
        <span>${unsureCount} unsure</span>
        <span>${formatQuestionTime(Math.max(0, snapshot.totalSeconds - Math.max(0, snapshot.remaining || 0)))} used</span>
      </div>
      <h3>Review after exam</h3>
      <div class="exam-review-list">${reviewRows}</div>
      <div class="modal-button-row">
        <button class="primary-btn" id="examDoneClose">Done</button>
        <button class="soft-btn" id="examStartNew">Start new exam</button>
      </div>
    </div>
  `);

  quickExamState = null;
  setTimeout(() => {
    $('#examDoneClose')?.addEventListener('click', closeModal);
    $('#examStartNew')?.addEventListener('click', () => showExamSetupModal(getDefaultExamTarget(), { calendarMode:false }));
  }, 0);
}

window.addEventListener('beforeunload', () => {
  try { saveCurrentLiveExam(); } catch {}
});



/* v79: Bookmarks, video timestamp notes, lecture sheets, daily question, continue card, global search, admin dashboard */
const NOVAMED_FEATURES_KEY_V79 = 'novamed-feature-layer-v79';

/* v87: Exam/Quick Exam use the same unified external JSON QBank source */
function ensureSupplementalMcqsV73() {
  // v87: disabled. QBank questions come from data/qbank/index.json and local admin imports only.
  return 0;
}

function supplementalMcqsV73() {
  return [];
}

function normalMcqPool() {
  return (state.questions || []).map(normalizeQuestion).filter(q => q.mode !== 'focused');
}

function availableNormalMcqCount(course, topic, lectureId = '') {
  let pool = normalMcqPool();
  if (course && course !== 'mixed') pool = pool.filter(q => q.course === course);
  if (topic && topic !== 'all') pool = pool.filter(q => qbankSameTextV87(q.topic, topic));
  if (lectureId) pool = pool.filter(q => qbankSameTextV87(q.lecture || q.subtopic, lectureId));
  return pool.length;
}

function qbankCoursesForExamV87() {
  const map = new Map();
  normalMcqPool().forEach(q => {
    if (!q.course) return;
    if (!map.has(q.course)) map.set(q.course, { id: q.course, title: baseCourseTitle(q.course), count: 0 });
    map.get(q.course).count += 1;
  });
  return Array.from(map.values()).sort((a, b) => a.title.localeCompare(b.title));
}

function qbankTopicsForExamV87(course = 'mixed') {
  const map = new Map();
  normalMcqPool().forEach(q => {
    if (course && course !== 'mixed' && q.course !== course) return;
    if (!q.topic) return;
    const key = q.topic;
    if (!map.has(key)) map.set(key, { topic: key, count: 0 });
    map.get(key).count += 1;
  });
  return Array.from(map.values()).sort((a, b) => a.topic.localeCompare(b.topic));
}

function renderExamCourseOptions(selected = 'mixed') {
  const courses = qbankCoursesForExamV87();
  return `<option value="mixed" ${selected === 'mixed' ? 'selected' : ''}>Mixed</option>` +
    courses.map(course => `<option value="${esc(course.id)}" ${course.id === selected ? 'selected' : ''}>${esc(course.title)} (${course.count})</option>`).join('');
}

function renderExamTopicOptions(course = 'mixed', selected = 'all') {
  const topics = qbankTopicsForExamV87(course);
  return `<option value="all" ${selected === 'all' ? 'selected' : ''}>Any system</option>` +
    topics.map(item => `<option value="${esc(item.topic)}" ${qbankSameTextV87(item.topic, selected) ? 'selected' : ''}>${esc(item.topic)} (${item.count})</option>`).join('');
}

function lecturesForSystem(course, topic) {
  const map = new Map();
  normalMcqPool().forEach(q => {
    if (course && course !== 'mixed' && q.course !== course) return;
    if (topic && topic !== 'all' && !qbankSameTextV87(q.topic, topic)) return;
    const lecture = q.lecture || q.subtopic || '';
    if (!lecture) return;
    if (!map.has(lecture)) map.set(lecture, { id: lecture, title: lecture, count: 0 });
    map.get(lecture).count += 1;
  });
  return Array.from(map.values()).sort((a, b) => a.title.localeCompare(b.title));
}

function renderLectureOptions(course, topic, selected = '') {
  const lectures = lecturesForSystem(course, topic);
  if (!lectures.length) return '<option value="">Any lecture in this system</option>';
  return '<option value="">Any lecture in this system</option>' +
    lectures.map(lecture => `<option value="${esc(lecture.id)}" ${qbankSameTextV87(lecture.id, selected) ? 'selected' : ''}>${esc(lecture.title)} (${lecture.count})</option>`).join('');
}

function detailedSystemOptions() {
  const options = [];
  qbankCoursesForExamV87().forEach(course => {
    qbankTopicsForExamV87(course.id).forEach(topic => {
      options.push({
        value: `${course.id}||${topic.topic}`,
        course: course.id,
        topic: topic.topic,
        label: `${course.title} — ${topic.topic}`,
        count: topic.count
      });
    });
  });
  return options;
}

function getDefaultExamTarget() {
  const first = normalMcqPool()[0] || {};
  const course = first.course || 'mixed';
  const topic = first.topic || 'all';
  const available = Math.max(1, availableNormalMcqCount(course, topic));
  return { course, topic, lectureId: '', minutes: 30, count: available };
}

function showExamSetupModal(defaults = {}, opts = {}) {
  const fallback = getDefaultExamTarget();
  const course = defaults.course || fallback.course || 'mixed';
  const topic = defaults.topic || fallback.topic || 'all';
  const lectureId = defaults.lectureId || defaults.lecture || '';
  const available = Math.max(1, availableNormalMcqCount(course, topic, lectureId));
  const countValue = Math.max(1, Math.min(Number(defaults.count || available), available));
  const minutesValue = Math.max(1, Number(defaults.minutes || 30));
  const heading = opts.calendarMode ? `Exam target — ${prettyExamDate(defaults.dateKey)}` : 'Exam Mode';

  showModal(`
    <h2 id="modalTitle">${esc(heading)}</h2>
    <p class="modal-muted">Uses the same external JSON QBank as QBank and Quick Exam. Choose a course, system, and optional lecture.</p>
    <form id="quickExamForm" class="form-stack quick-exam-form clean-exam-form exam-mode-form">
      ${opts.calendarMode ? `<input type="hidden" name="dateKey" value="${esc(defaults.dateKey)}" />` : ''}
      <label class="field-label"><span>Course</span><select name="course" id="quickExamCourse">${renderExamCourseOptions(course)}</select></label>
      <label class="field-label"><span>System</span><select name="topic" id="quickExamTopic">${renderExamTopicOptions(course, topic)}</select></label>
      <label class="field-label"><span>Lecture <em>optional</em></span><select name="lectureId" id="quickExamLecture">${renderLectureOptions(course, topic, lectureId)}</select></label>
      <div class="form-row labeled-row">
        <label class="field-label"><span>Timed exam minutes</span><input name="minutes" type="number" min="1" max="240" value="${esc(minutesValue)}" /></label>
        <label class="field-label"><span>Custom MCQs</span><input name="count" id="quickExamCount" type="number" min="1" max="${available}" value="${esc(countValue)}" /></label>
      </div>
      <small class="available-mcq-note" id="availableMcqNote">Available now: ${available} MCQ${available === 1 ? '' : 's'}.</small>
      <div class="modal-button-row">${opts.calendarMode ? '<button class="soft-btn" id="saveExamTarget" type="button">Save target</button>' : ''}<button class="primary-btn" type="submit">Start timed exam</button>${opts.calendarMode && targetsHas(defaults.dateKey) ? '<button class="tiny-btn danger" id="deleteExamTarget" type="button">Remove target</button>' : ''}</div>
    </form>`);

  const refresh = () => {
    const c = $('#quickExamCourse')?.value || 'mixed';
    const topicSelect = $('#quickExamTopic');
    const currentTopic = topicSelect?.value || 'all';
    if (topicSelect) topicSelect.innerHTML = renderExamTopicOptions(c, currentTopic);
    const t = topicSelect?.value || 'all';
    const lecture = $('#quickExamLecture');
    const currentLecture = lecture?.value || '';
    if (lecture) lecture.innerHTML = renderLectureOptions(c, t, currentLecture);
    const l = lecture?.value || '';
    const availableNow = Math.max(1, availableNormalMcqCount(c, t, l));
    const countInput = $('#quickExamCount');
    if (countInput) {
      countInput.max = String(availableNow);
      countInput.value = String(Math.min(Number(countInput.value || availableNow), availableNow) || availableNow);
    }
    const note = $('#availableMcqNote');
    if (note) note.textContent = `Available now: ${availableNow} MCQ${availableNow === 1 ? '' : 's'}.`;
  };

  $('#quickExamCourse')?.addEventListener('change', () => {
    const topicSelect = $('#quickExamTopic');
    if (topicSelect) topicSelect.value = 'all';
    refresh();
  });
  $('#quickExamTopic')?.addEventListener('change', refresh);
  $('#quickExamLecture')?.addEventListener('change', refresh);

  $('#quickExamForm')?.addEventListener('submit', event => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    startQuickExamFromFilters({ course: form.get('course'), topic: form.get('topic'), lectureId: form.get('lectureId'), count: form.get('count'), minutes: form.get('minutes') });
  });
}

function startQuickExamFromFilters({ course, topic, lectureId = '', count = 10, minutes = 30 } = {}) {
  const live = typeof readLiveExam === 'function' ? readLiveExam() : null;
  if (live) {
    if (typeof liveExamRemainingSeconds === 'function' && liveExamRemainingSeconds(live) <= 0) return openLiveExamExpiredModal(live, { course, topic, lectureId, count, minutes });
    resumeLiveExam(live);
    showToast('You already have a live exam');
    return;
  }
  let pool = normalMcqPool().filter(q => {
    if (course && course !== 'mixed' && q.course !== course) return false;
    if (topic && topic !== 'all' && !qbankSameTextV87(q.topic, topic)) return false;
    if (lectureId && !qbankSameTextV87(q.lecture || q.subtopic, lectureId)) return false;
    return true;
  });
  if (!pool.length) {
    showToast('No JSON MCQs found for this scope');
    return;
  }
  const selected = shuffleArray(pool).slice(0, Math.min(Math.max(1, Number(count || 1)), pool.length));
  closeModal();
  startQuickExamSession(selected, Math.max(1, Number(minutes || 30)), { course, topic, lectureId });
}
