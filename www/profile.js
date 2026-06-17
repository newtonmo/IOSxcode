/* NovaMed v83 - Profile, auth, daily todo, navigation, modal, and Home route helpers. */
function applyStudentProfileToState(profile = {}, account = null) {
  const cleanProfile = normalizeStudentProfile(profile);
  state.xp = Number(cleanProfile.xp || 0);
  state.streak = Number(cleanProfile.streak || 0);
  state.theme = cleanProfile.theme || state.theme || 'dark';
  state.mistakes = Array.isArray(cleanProfile.mistakes) ? cleanProfile.mistakes : [];
  state.videoProgress = normalizeVideoProgress(cleanProfile.videoProgress || {});
  state.qbankStats = normalizeQbankStats(cleanProfile.qbankStats || {});
  state.qbankAttempts = normalizeQbankAttempts(cleanProfile.qbankAttempts || []);
  state.dailyTodo = normalizeDailyTodo(cleanProfile.dailyTodo);
  state.learnRouteCourse = cleanProfile.learnRouteCourse || null;
  state.learnRouteChapter = cleanProfile.learnRouteChapter || null;
  state.learnRouteSelections = cleanProfile.learnRouteSelections || {};
  state.homeWidgetSettings = cleanProfile.homeWidgetSettings || state.homeWidgetSettings || null;
  if (state.homeWidgetSettings) window.__novamedHomeWidgetSettingsCache = state.homeWidgetSettings;
  state.videoLevel = cleanProfile.videoLevel || 'modes';
  state.selectedMode = cleanProfile.selectedMode || null;
  state.selectedCourse = cleanProfile.selectedCourse || null;
  state.selectedTopic = cleanProfile.selectedTopic || null;
  state.qbankLevel = cleanProfile.qbankLevel || 'modes';
  state.selectedQMode = cleanProfile.selectedQMode || null;
  state.selectedQCourse = cleanProfile.selectedQCourse || null;
  state.selectedQTopic = cleanProfile.selectedQTopic || null;
  state.selectedQSubtopic = cleanProfile.selectedQSubtopic || null;
  state.selectedQNoteLibrary = cleanProfile.selectedQNoteLibrary || null;
  state.selectedQAnswerMode = cleanProfile.selectedQAnswerMode || 'exam';
  if (account) {
    const clean = normalizeStudentAccount(account, account.studentKey || account.name);
    state.user = {
      name: clean.name,
      email: clean.email || '',
      studentKey: clean.studentKey,
      role: 'student',
      supabaseId: clean.supabaseUserId || stableStudentId(clean.studentKey),
      signedAt: state.user?.signedAt || new Date().toISOString()
    };
  }
  restoreAuxiliaryStudentProgress(cleanProfile);
  applyTheme();
}

function restoreAuxiliaryStudentProgress(profile = {}) {
  if (!isStudent()) return;
  // v139: these student-only helpers are restored into memory and saved back to student_state.
  if (profile.examTargets && typeof profile.examTargets === 'object') {
    window.__novamedExamTargetsCache = { ...profile.examTargets };
  }
  if (profile.studyRoutePlan && typeof profile.studyRoutePlan === 'object') {
    window.__novamedStudyRoutePlanCache = profile.studyRoutePlan;
  }
}
function saveState() {
  saveUiProgress();
  if (isAdmin()) {
    persistGlobalContent();
  }
  // v139: student progress/content snapshots are not written to localStorage.
  // Student state goes to Supabase student_state via saveStudentProgress().
  saveStudentProgress();
}

function refreshAfterAccountChange() {
  applyTheme();
  updateMiniStats();
  renderVideos();
  renderQbank();
  if (typeof loadExternalQbankJson === 'function') loadExternalQbankJson({ silent: true });
  renderHeatmap();
  stabilizeExamCalendar();
  renderProfileStats();
  renderDailyTodo();
  initNovaSpeech();
  if (window.__novamedDailyTodoIntervalV145) clearInterval(window.__novamedDailyTodoIntervalV145);
  window.__novamedDailyTodoIntervalV145 = setInterval(renderDailyTodo, 60000);
  renderMistakes();
  renderStudyRoutePlanner();
  if (typeof renderSmartStudyPlanV85 === 'function') renderSmartStudyPlanV85();
  stabilizeExamCalendar();
  updateAccessUI();
  updateCloudBadge();
}


const novaSpeechQuotes = [
  'I’m with you through this whole year.',
  'One clear task is enough to start.',
  'You do not need a perfect day. Just return.',
  'Small steps become strong memory.',
  'I’ll keep the path calm with you.',
  'Study what matters, then rest without guilt.',
  'Your future self will thank you for today.',
  'Confusion is normal. We turn it into structure.',
  'Start gently, continue honestly.',
  'You are not late. You are building.',
  'A focused hour beats a distracted day.',
  'I’ll be your study friend through the hard weeks.',
  'Finish one lecture, then breathe.',
  'Consistency is quieter than motivation.',
  'Every checked task is proof you moved.',
  'We study smart, not loud.',
  'Keep the day simple and the goal clear.',
  'Your pace still counts.',
  'A calm plan protects your energy.',
  'Let’s make today lighter.'
];

const NOVA_SPEECH_INTERVAL_MS_V141 = 120000; // v141: keep Home calmer; rotate every 2 minutes instead of every few seconds.

function initNovaSpeech() {
  const bubble = $('#novaSpeech');
  if (!bubble) return;

  // v141: avoid stacking multiple timers when Home/Profile UI is re-rendered.
  if (window.__novaSpeechTimerV141) {
    clearInterval(window.__novaSpeechTimerV141);
    window.__novaSpeechTimerV141 = null;
  }

  let index = Math.floor(Math.random() * novaSpeechQuotes.length);
  const setQuote = () => {
    if (document.hidden) return;
    bubble.textContent = novaSpeechQuotes[index % novaSpeechQuotes.length];
    index += 1;
  };

  setQuote();
  window.__novaSpeechTimerV141 = setInterval(setQuote, NOVA_SPEECH_INTERVAL_MS_V141);
}

function bindSmoothDropdowns() {
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  $$('.todo-dropdown, .your-course-dropdown, .guided-path-dropdown').forEach(details => {
    if (details.classList.contains('inline-quick-exam')) return;
    if (details.dataset.smoothBound === '1') return;
    const summary = details.querySelector('summary');
    if (!summary) return;
    details.dataset.smoothBound = '1';
    if (reduceMotion || typeof details.animate !== 'function') return;
    summary.addEventListener('click', event => {
      event.preventDefault();
      if (details.dataset.animating === '1') return;
      const opening = !details.open;
      const summaryHeight = summary.getBoundingClientRect().height;
      const startHeight = details.getBoundingClientRect().height || summaryHeight;
      details.dataset.animating = '1';
      details.style.overflow = 'hidden';
      details.style.willChange = 'height, opacity, transform';
      if (opening) {
        details.open = true;
        const targetHeight = details.scrollHeight;
        const animation = details.animate(
          [
            { height: `${Math.max(summaryHeight, startHeight)}px`, opacity: .92, transform: 'translateY(-2px)' },
            { height: `${targetHeight}px`, opacity: 1, transform: 'translateY(0)' }
          ],
          { duration: 285, easing: 'cubic-bezier(.18,.82,.24,1)' }
        );
        animation.onfinish = () => {
          details.style.height = '';
          details.style.overflow = '';
          details.style.willChange = '';
          details.dataset.animating = '0';
        };
        animation.oncancel = animation.onfinish;
        return;
      }
      const animation = details.animate(
        [
          { height: `${startHeight}px`, opacity: 1, transform: 'translateY(0)' },
          { height: `${summaryHeight}px`, opacity: .92, transform: 'translateY(-2px)' }
        ],
        { duration: 235, easing: 'cubic-bezier(.4,0,.2,1)' }
      );
      animation.onfinish = () => {
        details.open = false;
        details.style.height = '';
        details.style.overflow = '';
        details.style.willChange = '';
        details.dataset.animating = '0';
      };
      animation.oncancel = animation.onfinish;
    });
  });
}


function init() {
  if (typeof ensureSupplementalMcqsV73 === 'function') ensureSupplementalMcqsV73();
  setTimeout(() => { if (typeof renderLiveExamIndicators === 'function') renderLiveExamIndicators(); }, 0);
  applyTheme();
  updateMiniStats();
  bindNavigation();
  bindTheme();
  bindModals();
  bindAuthControls();
  bindAdminTabs();
  bindForms();
  bindHeroActions();
  bindVideoEvents();
  bindVideoGuideControls();
  bindQbankEvents();
  bindQbankGuideControls();
  bindQbankJsonTools();
  bindMistakeEvents();
  renderVideos();
  renderQbank();
  if (typeof loadExternalQbankJson === 'function') loadExternalQbankJson({ silent: true });
  renderHeatmap();
  renderProfileStats();
  bindDailyTodo();
  bindLearnRoutePlanner();
  renderDailyTodo();
  renderLearnRoutePlanner();
  renderMistakes();
  updateAccessUI();
  bindLessonNodes();
  bindCelebration();
  bindLeagueAndPartner();
  bindStudyRouteTools();
  bindLearningRapidExam();
  bindSmoothDropdowns();
  renderStudyRoutePlanner();
  updateCloudBadge();
  ensurePublicContentForEveryone({ silent: true, force: true }).then(ok => {
    if (!ok) {
      console.warn('Public Supabase content was not loaded:', publicContentLoadStatus);
      renderVideos();
    }
  });
  if (cloudConfigured()) {
    syncSimpleStudentProfileOnBoot();
  }
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js').catch(() => {});
  }
}

function updateMiniStats() {
  const streakMini = $('#streakMini');
  if (streakMini) streakMini.textContent = state.streak;
  const xpMini = $('#xpMini');
  if (xpMini) xpMini.textContent = state.xp;
  renderProfileStats();
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
        : `${roleLabel} • sign up with email to save XP, to-do, mistakes, and progress`;
  }
  const mini = $('#mistakeMiniGoal');
  if (mini) mini.textContent = String(activeMistakes);
  updateProfileSyncStatus();
}

function updateAccessUI() {
  document.body.classList.toggle('is-admin', isAdmin());
  document.body.classList.toggle('is-student', isStudent());
  document.body.classList.toggle('is-guest', !state.user);
  const authBtn = $('#authBtn');
  if (authBtn) {
    authBtn.textContent = state.user ? (isAdmin() ? 'Admin' : currentUserName().split(' ')[0]) : 'Sign in';
    authBtn.setAttribute('aria-label', state.user ? 'Account menu' : 'Account access');
  }
  const title = $('#profileAuthTitle');
  const subtitle = $('#profileAuthSubtitle');
  if (title) title.textContent = state.user ? (isAdmin() ? 'Admin account' : 'My account') : 'Account access';
  if (subtitle) subtitle.textContent = state.user
    ? `${currentUserName()} • ${isAdmin() ? 'Admin tools unlocked' : 'XP, to-do, mistakes, badges, and progress saved'}`
    : 'Connect your account and restore progress.';

  $$('.admin-only').forEach(el => {
    el.hidden = !isAdmin();
  });

  renderProfileStats();
}



function calendarTodoVirtualId(dateKey, id) {
  return `calendar:${dateKey}:${id}`;
}

function parseCalendarTodoVirtualId(value = '') {
  const raw = String(value || '');
  if (!raw.startsWith('calendar:')) return null;
  const parts = raw.split(':');
  return { dateKey: parts[1], id: Number(parts.slice(2).join(':')) };
}

function todaysCalendarTodoItems() {
  const todayKey = formatDateKey(new Date());
  return calendarTodosFor(todayKey).map(item => ({
    ...item,
    id: calendarTodoVirtualId(todayKey, item.id),
    source: 'calendar',
    calendarDateKey: todayKey,
    target: item.target || null,
    createdAt: item.createdAt || new Date().toISOString()
  }));
}

function updateCalendarTodoFromVirtualId(value, updater) {
  const parsed = parseCalendarTodoVirtualId(value);
  if (!parsed) return false;
  const current = getCalendarEntry(parsed.dateKey);
  const todos = (current.todos || []).map(item => {
    if (Number(item.id) !== Number(parsed.id)) return item;
    return typeof updater === 'function' ? updater(item) : item;
  });
  saveCalendarEntry(parsed.dateKey, { ...current, todos });
  renderExamCalendar();
  return true;
}

function deleteCalendarTodoFromVirtualId(value) {
  const parsed = parseCalendarTodoVirtualId(value);
  if (!parsed) return false;
  const current = getCalendarEntry(parsed.dateKey);
  const todos = (current.todos || []).filter(item => Number(item.id) !== Number(parsed.id));
  saveCalendarEntry(parsed.dateKey, { ...current, todos });
  renderExamCalendar();
  return true;
}


function getTodoStats() {
  state.dailyTodo = normalizeDailyTodo(state.dailyTodo);
  const items = [...todaysCalendarTodoItems(), ...state.dailyTodo.items];
  const done = items.filter(item => item.done).length;
  const total = items.length;
  const progress = total ? Math.round((done / total) * 100) : 0;
  return { items, done, total, progress };
}


const TODO_LIMIT_MS = 24 * 60 * 60 * 1000;

function formatTodoTimer(ms) {
  const abs = Math.abs(ms);
  const hours = Math.floor(abs / (60 * 60 * 1000));
  const minutes = Math.floor((abs % (60 * 60 * 1000)) / (60 * 1000));
  if (hours >= 24) return `${Math.floor(hours / 24)}d ${hours % 24}h`;
  if (hours >= 1) return `${hours}h ${minutes}m`;
  return `${Math.max(1, minutes)}m`;
}

function getTodoTiming(item = {}) {
  const created = new Date(item.createdAt || Date.now()).getTime();
  const dueAt = created + TODO_LIMIT_MS;
  const remaining = dueAt - Date.now();
  if (item.done) return { overdue: false, label: 'done' };
  if (remaining <= 0) return { overdue: true, label: `overdue ${formatTodoTimer(remaining)}` };
  return { overdue: false, label: `${formatTodoTimer(remaining)} left` };
}


function renderDailyTodo() {
  const list = $('#dailyTodoList');
  if (!list) return;
  const { items, done, total, progress } = getTodoStats();
  const number = $('#todoProgressNumber');
  if (number) number.textContent = `${progress}%`;
  const summary = $('#dailyTodoSummary');
  if (summary) summary.textContent = total ? `${done}/${total} tasks completed today` : 'No tasks yet. Add one clear target for today.';

  if (!items.length) {
    list.innerHTML = `
      <div class="todo-empty">
        <span>📝</span>
        <b>No tasks yet</b>
        <p>Add 2–4 realistic tasks so the day stays organized.</p>
      </div>
    `;
    return;
  }

  list.innerHTML = items.map(item => {
    const timing = getTodoTiming(item);
    return `
      <article class="todo-item ${item.done ? 'done' : ''} ${item.target ? 'has-target' : ''} ${item.source === 'calendar' ? 'calendar-source' : ''} ${timing.overdue ? 'overdue' : ''}">
        <label class="todo-check-line">
          <input type="checkbox" data-todo-toggle="${item.id}" ${item.done ? 'checked' : ''} />
          <span>${item.source === 'calendar' ? '<small class="todo-source-badge">Calendar</small>' : ''}${esc(item.text)}</span>
        </label>
        <div class="todo-actions">
          <small class="todo-time ${timing.overdue ? 'overdue' : ''}">${esc(timing.label)}</small>
          ${item.target ? `<button class="todo-go ${item.done ? 'test-yourself' : ''}" type="button" data-todo-go="${item.id}">${esc(item.done ? (item.target.doneLabel || 'Go to QBank') : (item.target.label || 'Go to video'))}</button>` : ''}
          <button class="todo-delete" type="button" data-todo-delete="${item.id}" aria-label="Delete task">×</button>
        </div>
      </article>
    `;
  }).join('');
}


function getLearnRouteCourses() {
  const tree = activeVideoCourseTree();
  const detailed = Array.isArray(tree.detailed) ? tree.detailed : [];
  const preferred = ['medicine', 'surgery', 'obstetrics', 'pediatrics'];
  const filtered = preferred.map(id => detailed.find(course => course.id === id)).filter(Boolean);
  return filtered.length ? filtered : detailed.slice(0, 4);
}

function getLearnRouteCourse() {
  const courses = getLearnRouteCourses();
  if (!state.learnRouteCourse) return null;
  const selected = courses.find(course => course.id === state.learnRouteCourse) || null;
  if (!selected) state.learnRouteCourse = null;
  return selected;
}

function normalizeRouteTopicName(name = '') {
  return String(name || '').trim().toLowerCase().replace(/ology$/,'o').replace(/[^a-z0-9]+/g, ' ');
}

function getLearnRouteChapter() {
  const course = getLearnRouteCourse();
  const topics = course?.topics || [];
  if (!course || !state.learnRouteChapter) return '';
  const selected = topics.find(topic => String(topic).toLowerCase() === String(state.learnRouteChapter || '').toLowerCase()) || '';
  if (!selected) state.learnRouteChapter = null;
  return selected;
}

function getLecturesForRoute(courseId, chapterTitle) {
  const normalizedChapter = normalizeRouteTopicName(chapterTitle);
  const videos = (state.videos || []).filter(video => {
    const sameCourse = String(video.course || '').toLowerCase() === String(courseId || '').toLowerCase();
    const videoTopic = normalizeRouteTopicName(video.topic || video.subject || '');
    return sameCourse && (videoTopic === normalizedChapter || videoTopic.includes(normalizedChapter) || normalizedChapter.includes(videoTopic));
  });

  if (videos.length) {
    return videos.map((video, index) => ({
      id: `video-${video.id || index}`,
      title: video.title || `${chapterTitle} lecture ${index + 1}`,
      meta: `${video.duration || 'Lecture'} • ${video.mode === 'focused' ? 'Focused' : 'Detailed'}`,
      source: 'video',
      target: {
        type: 'video',
        videoId: video.id,
        mode: video.mode || 'detailed',
        course: video.course || courseId,
        topic: video.topic || chapterTitle,
        label: 'Go to video'
      }
    }));
  }

  const fallback = [
    `${chapterTitle} foundations`,
    `${chapterTitle} clinical approach`,
    `${chapterTitle} high-yield traps`,
    `${chapterTitle} MCQ review`
  ];
  return fallback.map((title, index) => ({
    id: `fallback-${courseId}-${chapterTitle}-${index}`,
    title,
    meta: index === 0 ? 'Start here' : index === 1 ? 'Core lecture' : index === 2 ? 'High-yield' : 'Practice',
    source: 'generated',
    target: null
  }));
}


function learnRouteSelectionKey(courseId = state.learnRouteCourse, chapter = state.learnRouteChapter) {
  return `${courseId || 'course'}|${chapter || 'chapter'}`;
}

function getSavedLearnRouteSelection(courseId = state.learnRouteCourse, chapter = state.learnRouteChapter) {
  state.learnRouteSelections = state.learnRouteSelections && typeof state.learnRouteSelections === 'object' ? state.learnRouteSelections : {};
  const raw = state.learnRouteSelections[learnRouteSelectionKey(courseId, chapter)];
  return new Set(Array.isArray(raw) ? raw.map(String) : []);
}

function saveLearnRouteSelection(courseId = state.learnRouteCourse, chapter = state.learnRouteChapter) {
  let ids = $$('#learnRouteLectureList [data-route-toggle].course-done').map(card => String(card.dataset.routeToggle));
  const checkboxIds = $$('#learnRouteLectureList [data-route-lecture]:checked').map(input => String(input.dataset.routeLecture));
  if (checkboxIds.length) ids = checkboxIds;
  state.learnRouteSelections = state.learnRouteSelections && typeof state.learnRouteSelections === 'object' ? state.learnRouteSelections : {};
  state.learnRouteSelections[learnRouteSelectionKey(courseId, chapter)] = [...new Set(ids)];
  saveState();
}



function addSingleRouteLectureToTodo(lectureId) {
  const course = getLearnRouteCourse();
  const chapter = getLearnRouteChapter();
  if (!course || !chapter) {
    showToast('Choose course and chapter first');
    return;
  }
  const lectures = getLecturesForRoute(course?.id, chapter);
  const lecture = lectures.find(item => String(item.id) === String(lectureId));
  if (!lecture) {
    showToast('Lecture was not found');
    return;
  }
  state.dailyTodo = normalizeDailyTodo(state.dailyTodo);
  const text = `${course?.title?.replace(/^Focused\s+/,'').replace(/^Detailed\s+/,'') || 'Course'} • ${chapter}: ${lecture.title}`.slice(0, 80);
  const exists = state.dailyTodo.items.some(item => String(item.text || '').toLowerCase() === text.toLowerCase());
  if (exists) {
    showToast('Already in your To-do list');
    return;
  }
  state.dailyTodo.items.unshift({
    id: Date.now(),
    text,
    done: false,
    createdAt: new Date().toISOString(),
    target: lecture.target || null
  });
  saveState();
  renderDailyTodo();
  renderLearnRoutePlanner();
  showToast('Added to To-do list');
}


function renderLearnRoutePlanner() {
  const courseSelect = $('#learnRouteCourse');
  const chapterSelect = $('#learnRouteChapter');
  const chips = $('#learnRouteCourseChips');
  const chapterCard = $('#learnRouteChapterCard');
  const lectureList = $('#learnRouteLectureList');
  if (!courseSelect || !chapterSelect || !chips || !chapterCard || !lectureList) return;

  const courses = getLearnRouteCourses();
  const course = getLearnRouteCourse();
  const chapters = course?.topics || [];
  const chapter = getLearnRouteChapter();
  const routeReady = Boolean(course && chapter);
  const lectures = routeReady ? getLecturesForRoute(course?.id, chapter) : [];
  const selectedLectureIds = routeReady ? getSavedLearnRouteSelection(course?.id, chapter) : new Set();
  const selectedCount = lectures.filter(lecture => selectedLectureIds.has(String(lecture.id))).length;

  courseSelect.innerHTML = optionHtml('', 'Select course', !course) + courses.map(item => optionHtml(item.id, item.title.replace(/^Focused\s+/,'').replace(/^Detailed\s+/,''), item.id === course?.id)).join('');
  chapterSelect.disabled = !course;
  chapterSelect.innerHTML = optionHtml('', course ? 'Select chapter' : 'Select course first', !chapter) + chapters.map(topic => optionHtml(topic, topic, topic === chapter)).join('');
  syncPickerButtonFromSelect($('#learnRouteCourseBtn'), courseSelect, { placeholder: 'Choose course', readyHint: 'Tap to switch course', disabledHint: 'No courses yet' });
  syncPickerButtonFromSelect($('#learnRouteChapterBtn'), chapterSelect, { placeholder: 'Choose chapter', readyHint: 'Tap to switch chapter', disabledHint: course ? 'No chapters in this course yet' : 'Choose a course first' });

  chips.innerHTML = courses.map(item => `
    <button type="button" class="route-chip ${item.id === course?.id ? 'active' : ''}" data-learn-route-course="${esc(item.id)}">
      <span>${esc(item.icon || '📘')}</span>
      <b>${esc(item.title.replace(/^Focused\s+/,'').replace(/^Detailed\s+/,''))}</b>
    </button>
  `).join('');

  if (!course) {
    chapterCard.innerHTML = `
      <div class="chapter-orb">📘</div>
      <div>
        <h3>Choose a course first</h3>

      </div>
    `;
    lectureList.innerHTML = '';
    return;
  }

  if (!chapter) {
    chapterCard.innerHTML = `
      <div class="chapter-orb">${esc(course?.icon || '📘')}</div>
      <div>
        <span class="eyebrow">Course selected</span>
        <h3>${esc(course.title.replace(/^Focused\s+/,'').replace(/^Detailed\s+/,''))}</h3>

      </div>
    `;
    lectureList.innerHTML = '';
    return;
  }

  chapterCard.innerHTML = `
    <div class="chapter-orb">${esc(course?.icon || '📘')}</div>
    <div>
      <span class="eyebrow">This chapter</span>
      <h3 class="chapter-name-accent">${esc(chapter)}</h3>

    </div>
  `;

  lectureList.innerHTML = lectures.map((lecture) => {
    const isDone = selectedLectureIds.has(String(lecture.id));
    const todoText = `${course?.title?.replace(/^Focused\\s+/,'').replace(/^Detailed\\s+/,'') || 'Course'} • ${chapter}: ${lecture.title}`.slice(0, 80).toLowerCase();
    const alreadyInTodo = (state.dailyTodo?.items || []).some(item => String(item.text || '').toLowerCase() === todoText);
    return `
      <article class="lecture-task-card course-task-card ${isDone ? 'course-done' : ''}" data-route-toggle="${esc(lecture.id)}">
        <div class="course-task-main">
          <span class="course-task-check" aria-hidden="true">${isDone ? '×' : ''}</span>
          <span>
            <b>${esc(lecture.title)}</b>
            <small>${esc(lecture.meta)}</small>
          </span>
        </div>
        ${!isDone ? `<button class="tiny-btn course-add-todo" type="button" data-route-add-todo="${esc(lecture.id)}">${alreadyInTodo ? 'In To-do list' : 'Add to To-do list'}</button>` : '<small class="course-finished-label">Finished</small>'}
      </article>
    `;
  }).join('');
}

function addRouteLecturesToTodo({ all = false } = {}) {
  const course = getLearnRouteCourse();
  const chapter = getLearnRouteChapter();
  if (!course || !chapter) {
    showToast('Choose course and chapter first');
    return;
  }
  const lectures = getLecturesForRoute(course?.id, chapter);
  if (!all) saveLearnRouteSelection(course?.id, chapter);
  const selectedIds = all
    ? new Set(lectures.map(item => String(item.id)))
    : getSavedLearnRouteSelection(course?.id, chapter);
  const selected = lectures.filter(item => selectedIds.has(String(item.id)));
  if (!selected.length) {
    showToast('Choose at least one lecture');
    return;
  }

  state.dailyTodo = normalizeDailyTodo(state.dailyTodo);
  const existing = new Set(state.dailyTodo.items.map(item => String(item.text).toLowerCase()));
  const newItems = selected
    .map(item => ({
      text: `${course?.title?.replace(/^Focused\s+/,'').replace(/^Detailed\s+/,'') || 'Route'} • ${chapter}: ${item.title}`,
      target: item.target || null
    }))
    .filter(item => !existing.has(item.text.toLowerCase()))
    .map((item, index) => ({
      id: Date.now() + index,
      text: item.text.slice(0, 80),
      done: false,
      createdAt: new Date().toISOString(),
      target: item.target
    }));

  if (!newItems.length) {
    showToast('These lectures are already in your to-do');
    return;
  }

  state.dailyTodo.items = [...newItems, ...state.dailyTodo.items].slice(0, 24);
  saveState();
  renderDailyTodo();
  renderLearnRoutePlanner();
  showToast(`${newItems.length} lecture${newItems.length > 1 ? 's' : ''} added to today`);
}

function bindLearnRoutePlanner() {
  bindNativePickerButton($('#learnRouteCourseBtn'), $('#learnRouteCourse'), { title: 'Course', subtitle: 'Choose the course you want to study first.', emptyText: 'No courses available yet.' });
  bindNativePickerButton($('#learnRouteChapterBtn'), $('#learnRouteChapter'), { title: 'Chapter', subtitle: 'Choose one chapter from the selected course.', emptyText: 'No chapters available in this course yet.' });
  $('#learnRouteCourse')?.addEventListener('change', event => {
    saveLearnRouteSelection();
    state.learnRouteCourse = event.target.value || null;
    state.learnRouteChapter = null;
    saveState();
    renderLearnRoutePlanner();
  });
  $('#learnRouteChapter')?.addEventListener('change', event => {
    saveLearnRouteSelection();
    state.learnRouteChapter = event.target.value || null;
    saveState();
    renderLearnRoutePlanner();
  });
  $('#learnRouteCourseChips')?.addEventListener('click', event => {
    const chip = event.target.closest('[data-learn-route-course]');
    if (!chip) return;
    saveLearnRouteSelection();
    state.learnRouteCourse = chip.dataset.learnRouteCourse || null;
    state.learnRouteChapter = null;
    saveState();
    renderLearnRoutePlanner();
  });
  $('#learnRouteLectureList')?.addEventListener('click', event => {
    const addBtn = event.target.closest('[data-route-add-todo]');
    if (addBtn) {
      event.preventDefault();
      event.stopPropagation();
      addSingleRouteLectureToTodo(addBtn.dataset.routeAddTodo);
      return;
    }
    const card = event.target.closest('[data-route-toggle]');
    if (!card) return;
    const course = getLearnRouteCourse();
    const chapter = getLearnRouteChapter();
    const id = String(card.dataset.routeToggle);
    state.learnRouteSelections = state.learnRouteSelections && typeof state.learnRouteSelections === 'object' ? state.learnRouteSelections : {};
    const key = learnRouteSelectionKey(course?.id, chapter);
    const selected = getSavedLearnRouteSelection(course?.id, chapter);
    if (selected.has(id)) selected.delete(id);
    else selected.add(id);
    state.learnRouteSelections[key] = [...selected];
    saveState();
    renderLearnRoutePlanner();
  });
  $('#openRouteTodoHelp')?.addEventListener('click', () => showModal(`
    <h2 id="modalTitle">Your Course</h2>
    <p class="modal-muted">Choose a course and chapter, then tap a lecture when you finish it. Your finished lectures stay saved even if you switch courses or close the app.</p>
    <div class="route-help-steps">
      <article><b>1</b><span>Choose Medicine, Surgery, Obstetrics, or Pediatrics.</span></article>
      <article><b>2</b><span>Pick this week’s chapter, like Cardio or Respiratory.</span></article>
      <article><b>3</b><span>Use Add to To-do list beside unfinished lectures when you want them pinned.</span></article>
    </div>
  `));
}

function bindAuthControls() {
  $('#authBtn')?.addEventListener('click', () => showAuthModal('student'));
  $('#profileAuthBtn')?.addEventListener('click', () => {
    if (state.user) showAccountModal();
    else showAuthModal('student');
  });
  $('#cloudSetupProfileBtn')?.addEventListener('click', showCloudSetupModal);
  $('#profileSyncBtn')?.addEventListener('click', () => {
    if (isAdmin()) {
      runSupabaseSyncCheck({ showDetails: true });
    } else if (typeof showStudentSyncModalV102 === 'function') {
      showStudentSyncModalV102();
    } else {
      showToast('No cloud connection right now. Your progress will be saved locally.');
    }
  });
  $('#partnerComingSoonProfileBtn')?.addEventListener('click', showPartnerComingSoonModalV102);
}


function friendlyAuthError(error) {
  const raw = String(error?.message || error || '').trim();
  if (!raw) return 'Sign in failed. Try again.';
  const lower = raw.toLowerCase();
  if (lower.includes('incorrect') || lower.includes('wrong')) return 'The student name or code is incorrect.';
  if ((lower.includes('schema cache') || lower.includes('relation')) && lower.includes('student_profiles')) return 'Supabase can connect, but the student cloud tables are missing or stale. Run the profiles/student_state/student_public SQL, wait a few seconds, then reload/check again.';
  if ((lower.includes('schema cache') || lower.includes('relation')) && lower.includes('novamed_content')) return 'Supabase can connect, but the novamed_content table is missing. Run SUPABASE_SETUP.sql in Supabase SQL Editor.';
  if (lower.includes('relation') && lower.includes('does not exist')) return 'A required Supabase table is not ready yet. Run SUPABASE_SETUP.sql in Supabase SQL Editor.';
  if (lower.includes('permission denied') || lower.includes('row-level security') || lower.includes('rls')) return 'Supabase blocked the student cloud tables. Check RLS policies for authenticated users on profiles, student_state, and student_public.';
  if (lower.includes('failed to fetch') || lower.includes('network')) return 'Cannot reach Supabase. Check the Project URL, anon key, internet, and deployed domain.';
  if (lower.includes('url') && lower.includes('anon')) return raw;
  return raw;
}

function profileSyncErrorMessage(prefix = 'Profile sync failed') {
  return lastProfileSyncError ? `${prefix}: ${friendlyAuthError(lastProfileSyncError)}` : prefix;
}

function setFormBusy(form, busy, label = 'Please wait…') {
  if (!form) return;
  const button = form.querySelector('button[type="submit"]');
  if (!button) return;
  if (busy) {
    button.dataset.originalText = button.textContent;
    button.textContent = label;
    button.disabled = true;
  } else {
    button.textContent = button.dataset.originalText || button.textContent;
    button.disabled = false;
  }
}

function studentProfilePayload(account = {}, profileOverride = null) {
  const clean = normalizeStudentAccount(account, account.studentKey || account.student_key || account.name || 'student');
  const profile = profileOverride || clean.profile || publicProgressDefaults();
  return {
    student_key: clean.studentKey,
    full_name: clean.name,
    access_code_hash: clean.accessCodeHash || '',
    profile,
    updated_at: new Date().toISOString()
  };
}


function isMissingSupabaseColumnError(error, columns = []) {
  const raw = String(error?.message || error || '').toLowerCase();
  if (!raw) return false;
  const looksLikeColumn = raw.includes('column') || raw.includes('schema cache') || raw.includes('could not find');
  if (!looksLikeColumn) return false;
  return !columns.length || columns.some(column => raw.includes(String(column).toLowerCase()));
}

function unpackLegacyPackedProfile(raw = {}) {
  const sources = [
    raw.profile,
    raw.watched_videos,
    raw.watchedVideos,
    raw.video_progress,
    raw.videoProgress,
    raw.mistakes
  ];
  for (const source of sources) {
    if (!source || typeof source !== 'object' || Array.isArray(source)) continue;
    const packed = source.__novamedProfile || source.novamedProfile || source.fullProfile || source.profile;
    if (packed && typeof packed === 'object' && !Array.isArray(packed)) return packed;
  }
  return {};
}

function legacyWatchedVideosProgress(raw = {}) {
  const value = raw.watched_videos || raw.watchedVideos || raw.video_progress || raw.videoProgress || raw.videosWatched || {};
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const { __novamedProfile, novamedProfile, fullProfile, profile, ...progress } = value;
  return progress;
}

function studentProfileFromSupabaseRow(row = {}, fallbackKey = '') {
  const raw = row && typeof row === 'object' ? row : {};
  const fullName = normalizeStudentName(raw.full_name || raw.name || raw.student_name || fallbackKey || 'Student');
  const studentKey = raw.student_key || studentAccountKey(fullName || fallbackKey);
  const packedLegacyProfile = unpackLegacyPackedProfile(raw);
  const rawProfile = raw.profile && typeof raw.profile === 'object' && !Array.isArray(raw.profile) ? raw.profile : packedLegacyProfile;
  const legacyVideoProgress = rawProfile.videoProgress || rawProfile.videosWatched || legacyWatchedVideosProgress(raw);
  const legacyMistakes = Array.isArray(rawProfile.mistakes) ? rawProfile.mistakes : (Array.isArray(raw.mistakes) ? raw.mistakes : []);
  const legacyProfile = {
    xp: rawProfile.xp ?? raw.xp ?? 0,
    streak: rawProfile.streak ?? raw.streak ?? 0,
    theme: rawProfile.theme || raw.theme || 'dark',
    mistakes: legacyMistakes,
    videoProgress: legacyVideoProgress || {},
    qbankStats: rawProfile.qbankStats || raw.qbank_stats || raw.mcq_stats || {},
    qbankAttempts: rawProfile.qbankAttempts || raw.qbank_attempts || raw.mcq_attempts || [],
    dailyTodo: rawProfile.dailyTodo || raw.daily_todo || undefined,
    examTargets: rawProfile.examTargets || raw.exam_targets || {},
    studyRoutePlan: rawProfile.studyRoutePlan || raw.study_route_plan || null,
    learnRouteCourse: rawProfile.learnRouteCourse || null,
    learnRouteChapter: rawProfile.learnRouteChapter || null,
    learnRouteSelections: rawProfile.learnRouteSelections || {},
    videoLevel: rawProfile.videoLevel || 'modes',
    selectedMode: rawProfile.selectedMode || null,
    selectedCourse: rawProfile.selectedCourse || null,
    selectedTopic: rawProfile.selectedTopic || null,
    qbankLevel: rawProfile.qbankLevel || 'modes',
    selectedQMode: rawProfile.selectedQMode || null,
    selectedQCourse: rawProfile.selectedQCourse || null,
    selectedQTopic: rawProfile.selectedQTopic || null,
    selectedQSubtopic: rawProfile.selectedQSubtopic || null,
    selectedQNoteLibrary: rawProfile.selectedQNoteLibrary || null,
    selectedQAnswerMode: rawProfile.selectedQAnswerMode || 'exam',
    updatedAt: rawProfile.updatedAt || raw.updated_at || raw.last_sync || null
  };
  return normalizeStudentAccount({
    id: raw.id || raw.supabase_user_id || stableStudentId(studentKey),
    studentKey,
    name: fullName,
    accessCodeHash: raw.access_code_hash || raw.code_hash || raw.accessCodeHash || raw.codeHash || '',
    profile: normalizeStudentProfile({ ...legacyProfile, ...rawProfile }),
    createdAt: raw.created_at || raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updated_at || raw.updatedAt || raw.last_sync || legacyProfile.updatedAt || null
  }, studentKey);
}

async function findStudentProfileByFullScan(studentKey, studentName = '') {
  const client = getSupabaseClient();
  if (!client) return null;
  const targetKey = studentAccountKey(studentKey || studentName);
  const targetName = normalizeStudentName(studentName || studentKey).toLowerCase();
  const { data, error } = await client
    .from(SUPABASE_PROFILES_TABLE)
    .select('*')
    .limit(1000);
  if (error) throw error;
  const rows = Array.isArray(data) ? data : [];
  const match = rows.find(row => {
    const rowKey = studentAccountKey(row.student_key || row.full_name || row.name || row.student_name || '');
    const rowName = normalizeStudentName(row.full_name || row.name || row.student_name || '').toLowerCase();
    return rowKey === targetKey || (targetName && rowName === targetName);
  });
  return match ? studentProfileFromSupabaseRow(match, studentName || studentKey) : null;
}

async function fetchStudentProfileFromSupabase(studentKey, options = {}) {
  const { required = false, studentName = '' } = options || {};
  if (!studentKey) return null;
  try {
    if (required) requireSupabaseReady();
    if (!cloudConfigured()) return null;
    const client = getSupabaseClient();
    if (!client) {
      if (required) throw new Error('Supabase client could not be created. Check Project URL and anon key.');
      return null;
    }

    let data = null;
    try {
      const response = await client
        .from(SUPABASE_PROFILES_TABLE)
        .select('id, student_key, full_name, access_code_hash, profile, created_at, updated_at')
        .eq('student_key', studentKey)
        .maybeSingle();
      if (response.error) throw response.error;
      data = response.data;
    } catch (err) {
      // Some users created an older table manually with columns like name/code_hash/xp.
      // Full-scan fallback lets the app read that row and then the SQL fix can migrate it.
      if (!isMissingSupabaseColumnError(err, ['student_key', 'full_name', 'access_code_hash', 'profile'])) throw err;
      console.warn('NovaMed legacy student_profiles schema detected. Trying compatibility read:', err?.message || err);
      const legacyAccount = await findStudentProfileByFullScan(studentKey, studentName || studentKey);
      if (!legacyAccount) {
        lastProfileSyncError = err;
        return null;
      }
      lastProfileSyncError = null;
      lastProfileSyncAt = new Date();
      updateProfileSyncStatus();
      return legacyAccount;
    }

    lastProfileSyncError = null;
    if (data) {
      lastProfileSyncAt = new Date();
      updateProfileSyncStatus();
    }
    if (!data) return null;
    return studentProfileFromSupabaseRow(data, studentName || studentKey);
  } catch (err) {
    lastProfileSyncError = err;
    updateProfileSyncStatus('Profile sync error', 'warn');
    console.warn('NovaMed student profile fetch failed:', err?.message || err);
    if (required) throw err;
    return null;
  }
}

function isMissingUniqueConflictError(error) {
  const raw = String(error?.message || error || '').toLowerCase();
  return raw.includes('no unique') || raw.includes('exclusion constraint') || raw.includes('on conflict');
}

async function upsertStudentProfileWithoutConflict(account, profileOverride = null, options = {}) {
  const { required = false, verify = false } = options || {};
  try {
    const client = getSupabaseClient();
    if (!client || !account?.studentKey) return false;
    const payload = studentProfilePayload(account, profileOverride);
    const lookup = await client
      .from(SUPABASE_PROFILES_TABLE)
      .select('id')
      .eq('student_key', account.studentKey)
      .limit(1);
    if (lookup.error) throw lookup.error;
    const existingId = Array.isArray(lookup.data) && lookup.data[0]?.id !== undefined ? lookup.data[0].id : null;
    let response;
    if (existingId !== null && existingId !== undefined) {
      response = await client.from(SUPABASE_PROFILES_TABLE).update(payload).eq('id', existingId);
    } else {
      response = await client.from(SUPABASE_PROFILES_TABLE).insert(payload);
    }
    if (response.error) throw response.error;
    if (verify) {
      const check = await fetchStudentProfileFromSupabase(account.studentKey, { required: true, studentName: account.name || account.studentKey });
      if (!check) throw new Error('Student profile was saved without onConflict, but it was not readable. Check RLS policies.');
    }
    lastProfileSyncError = null;
    lastProfileSyncAt = new Date();
    updateProfileSyncStatus('Synced', 'ready');
    return true;
  } catch (err) {
    lastProfileSyncError = err;
    updateProfileSyncStatus('Profile sync error', 'warn');
    console.warn('NovaMed student profile sync without conflict failed:', err?.message || err);
    if (required) throw err;
    return false;
  }
}

function legacyStudentProfilePayload(account = {}, profileOverride = null) {
  const clean = normalizeStudentAccount(account, account.studentKey || account.name || 'Student');
  const profile = normalizeStudentProfile(profileOverride || clean.profile || publicProgressDefaults());
  const now = new Date().toISOString();
  // Older manual tables only have watched_videos/mistakes JSONB columns. To avoid losing
  // daily to-do, MCQ attempts, XP history, study plan, and route state, we pack the full
  // profile inside watched_videos.__novamedProfile, while still keeping the visible legacy
  // xp/mistakes fields readable in Supabase Table Editor.
  return {
    name: clean.name,
    code_hash: clean.accessCodeHash || '',
    xp: Math.max(0, Math.round(Number(profile.xp || 0))),
    watched_videos: {
      __novamedProfile: profile,
      ...(profile.videoProgress || {})
    },
    mistakes: Array.isArray(profile.mistakes) ? profile.mistakes : [],
    last_sync: now
  };
}

async function upsertStudentProfileToLegacySupabase(account, profileOverride = null, options = {}) {
  const { required = false, verify = false } = options || {};
  try {
    const client = getSupabaseClient();
    if (!client || !account?.studentKey) return false;
    const payload = legacyStudentProfilePayload(account, profileOverride);
    const existing = await findStudentProfileByFullScan(account.studentKey, account.name || account.studentKey);
    let error = null;
    if (existing?.id !== undefined && existing?.id !== null && String(existing.id) !== '') {
      const response = await client
        .from(SUPABASE_PROFILES_TABLE)
        .update(payload)
        .eq('id', existing.id);
      error = response.error;
    } else {
      const response = await client
        .from(SUPABASE_PROFILES_TABLE)
        .insert(payload);
      error = response.error;
    }
    if (error) throw error;
    if (verify) {
      const check = await fetchStudentProfileFromSupabase(account.studentKey, { required: true, studentName: account.name || account.studentKey });
      if (!check) throw new Error('Legacy student profile was saved, but it was not readable. Check student_profiles RLS policies.');
    }
    lastProfileSyncError = null;
    lastProfileSyncAt = new Date();
    updateProfileSyncStatus('Synced with legacy table', 'ready');
    return true;
  } catch (err) {
    lastProfileSyncError = err;
    updateProfileSyncStatus('Profile sync error', 'warn');
    console.warn('NovaMed legacy student profile sync failed:', err?.message || err);
    if (required) throw err;
    return false;
  }
}

async function upsertStudentProfileToSupabase(account, profileOverride = null, options = {}) {
  const { required = false, verify = false } = options || {};
  try {
    if (required) requireSupabaseReady();
    if (!cloudConfigured() || !account?.studentKey) return false;
    const client = getSupabaseClient();
    if (!client) {
      if (required) throw new Error('Supabase client could not be created. Check Project URL and anon key.');
      return false;
    }
    const payload = studentProfilePayload(account, profileOverride);
    const { error } = await client
      .from(SUPABASE_PROFILES_TABLE)
      .upsert(payload, { onConflict: 'student_key' });
    if (error) {
      if (isMissingSupabaseColumnError(error, ['student_key', 'full_name', 'access_code_hash', 'profile'])) {
        console.warn('NovaMed required student_profiles schema is missing. Falling back to legacy table sync:', error?.message || error);
        return await upsertStudentProfileToLegacySupabase(account, profileOverride, options);
      }
      if (isMissingUniqueConflictError(error)) {
        console.warn('NovaMed student_profiles has no unique student_key constraint. Falling back to manual update/insert:', error?.message || error);
        return await upsertStudentProfileWithoutConflict(account, profileOverride, options);
      }
      throw error;
    }
    if (verify) {
      const check = await fetchStudentProfileFromSupabase(account.studentKey, { required: true, studentName: account.name || account.studentKey });
      if (!check) throw new Error('Supabase saved request finished, but student profile was not readable. Check student_profiles RLS policies.');
    }
    lastProfileSyncError = null;
    lastProfileSyncAt = new Date();
    updateProfileSyncStatus();
    return true;
  } catch (err) {
    lastProfileSyncError = err;
    updateProfileSyncStatus('Profile sync error', 'warn');
    console.warn('NovaMed student profile sync failed:', err?.message || err);
    if (required) throw err;
    return false;
  }
}

async function createOrLoginSimpleStudent({ name, code }) {
  const cleanName = normalizeStudentName(name);
  const cleanCode = String(code || '').trim();
  if (cleanName.length < 2) throw new Error('Enter your student name.');
  if (cleanCode.length < 2) throw new Error('Enter a simple student code.');

  // Multi-device student accounts require Supabase. Do not silently create a local-only
  // account, because that is exactly what makes a second browser say "account created"
  // instead of importing the existing profile.
  requireSupabaseReady();

  const studentKey = studentAccountKey(cleanName);
  const accessCodeHash = await hashAccessCode(studentKey, cleanCode);
  const students = getStudents();
  const localAccount = students[studentKey] || null;
  const cloudAccount = await fetchStudentProfileFromSupabase(studentKey, { required: true, studentName: cleanName });
  const loadedFromCloud = Boolean(cloudAccount);

  let account = mergeStudentAccounts(localAccount, cloudAccount);

  if (account?.accessCodeHash && account.accessCodeHash !== accessCodeHash) {
    throw new Error('The student name or code is incorrect.');
  }

  const now = new Date().toISOString();
  const isNew = !cloudAccount && !localAccount;
  const merged = normalizeStudentAccount({
    ...(account || {}),
    name: cleanName,
    studentKey,
    accessCodeHash,
    supabaseUserId: account?.supabaseUserId || account?.id || stableStudentId(studentKey),
    profile: account?.profile || publicProgressDefaults(),
    createdAt: account?.createdAt || now,
    updatedAt: now
  }, studentKey);

  students[studentKey] = merged;
  setStudents(students);
  await upsertStudentProfileToSupabase(merged, merged.profile, { required: true, verify: true });
  return { account: merged, isNew, synced: true, loadedFromCloud };
}

function completeStudentSignIn(account, message = '') {
  const clean = normalizeStudentAccount(account, account.studentKey || account.name);
  setSession({ name: clean.name, studentKey: clean.studentKey, role: 'student', supabaseId: clean.supabaseUserId || stableStudentId(clean.studentKey) });
  state = loadState();
  applyStudentProfileToState(clean.profile, clean);
  closeModal();
  refreshAfterAccountChange();
  showToast(message || `Welcome back, ${clean.name}`);
}

function scheduleStudentProfileSave() {
  if (!isStudent() || !cloudConfigured()) return;
  clearTimeout(profileSaveTimer);
  profileSaveTimer = setTimeout(() => {
    pushStudentProgressToSupabase().catch(err => console.warn('NovaMed profile sync failed:', err?.message || err));
  }, 900);
}

async function pushStudentProgressToSupabase() {
  if (!isStudent()) return false;
  const studentKey = studentIdentityFromUser(state.user);
  if (!studentKey) return false;
  const students = getStudents();
  const account = normalizeStudentAccount(students[studentKey] || { name: state.user.name, studentKey }, studentKey);
  account.profile = studentSnapshot();
  account.updatedAt = new Date().toISOString();
  students[studentKey] = account;
  setStudents(students);
  const ok = await upsertStudentProfileToSupabase(account, account.profile);
  if (!ok && lastProfileSyncError) {
    updateCloudBadge('Profile sync error');
  }
  return ok;
}

async function syncSimpleStudentProfileOnBoot({ force = false } = {}) {
  if (state.user?.role === 'admin' || !isStudent()) return false;
  if (window.__novamedProfileBootSyncPromiseV145 && !force) return window.__novamedProfileBootSyncPromiseV145;
  if (!cloudConfigured()) {
    updateCloudBadge('Profile local only');
    return false;
  }
  window.__novamedProfileBootSyncPromiseV145 = (async () => {
  try {
    const studentKey = studentIdentityFromUser(state.user);
    if (!studentKey) return;
    const students = getStudents();
    const localAccount = normalizeStudentAccount(students[studentKey] || { name: state.user.name, studentKey }, studentKey);
    const cloudAccount = await fetchStudentProfileFromSupabase(studentKey, { required: true, studentName: state.user?.name || localAccount?.name || studentKey });
    if (!cloudAccount) {
      // Existing local session but no Supabase row yet: upload it once, then verify it is readable.
      await upsertStudentProfileToSupabase(localAccount, localAccount.profile || studentSnapshot(), { required: true, verify: true });
      updateCloudBadge('Profile uploaded');
      return;
    }
    const merged = mergeStudentAccounts(localAccount, cloudAccount);
    students[studentKey] = merged;
    setStudents(students);
    applyStudentProfileToState(merged.profile, merged);
    await upsertStudentProfileToSupabase(merged, merged.profile, { required: true });
    refreshAfterAccountChange();
    updateCloudBadge('Profile restored');
    return true;
  } catch (err) {
    console.warn('NovaMed simple profile restore failed:', err?.message || err);
    updateCloudBadge('Profile sync error');
    showToast(profileSyncErrorMessage('Could not restore Supabase profile'));
    return false;
  } finally {
    setTimeout(() => { window.__novamedProfileBootSyncPromiseV145 = null; }, 500);
  }
  })();
  return window.__novamedProfileBootSyncPromiseV145;
}

function renderStudentAuthFlow() {
  const box = $('#studentAuthFlow');
  if (!box) return;
  const setupStatus = supabaseSetupStatus();
  const cloudReady = setupStatus.ok;
  box.innerHTML = `
    <div class="auth-flow-card">
      <span class="eyebrow">Simple access</span>
      <h3>Student name + code</h3>
      <p>Enter your name and private code to restore your synced progress.</p>
      ${cloudReady ? '<div class="auth-live-note"><b>Supabase connected</b><span>Storage, videos, files, QBank content, XP, video progress, MCQ attempts, and mistakes sync stay active.</span></div>' : `
        <div class="auth-live-note warning">
          <b>Supabase is required for multi-device sync</b>
          <span>${esc(setupStatus.reason)} Add it once in supabase-config.js before publishing, or save it in this browser for testing.</span>
          <button class="soft-btn compact-config-btn" id="openAuthSupabaseSetup" type="button">Open Supabase setup</button>
        </div>
      `}
      <form id="studentSimpleSigninForm" class="form-stack auth-step-form">
        <label class="field-label"><span>Student name</span><input name="name" required autocomplete="username" placeholder="Your name" value="${esc(authFlowState.name || '')}" /></label>
        <label class="field-label"><span>Simple code</span><input name="code" type="password" required autocomplete="current-password" placeholder="Your code" /></label>
        <button class="primary-btn" type="submit">${cloudReady ? 'Continue' : 'Connect Supabase first'}</button>
      </form>
      <small class="security-note">The code syncs to Supabase as a hash. XP, watched videos, MCQ attempts, mistakes, to-do, and study plans sync with this same profile. If your table is legacy, the full profile is packed inside watched_videos.__novamedProfile.</small>
    </div>
  `;
  $('#openAuthSupabaseSetup')?.addEventListener('click', () => {
    showCloudSetupModal({ allowPublicSetup: true, returnToAuth: true });
  });
  $('#studentSimpleSigninForm')?.addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const name = normalizeStudentName(data.get('name'));
    const code = String(data.get('code') || '').trim();
    authFlowState = { name, code: '' };
    try {
      setFormBusy(form, true, 'Opening account…');
      const { account, isNew, loadedFromCloud } = await createOrLoginSimpleStudent({ name, code });
      const baseMessage = isNew
        ? `Account created in Supabase. Welcome, ${account.name}.`
        : (loadedFromCloud ? `Welcome back from Supabase, ${account.name}. Your progress was restored.` : `Welcome back, ${account.name}. Supabase profile synced.`);
      completeStudentSignIn(account, baseMessage);
    } catch (err) {
      showToast(friendlyAuthError(err));
      setFormBusy(form, false);
    }
  });
}

function showAuthModal(defaultTab = 'student') {
  const activeTab = defaultTab === 'admin' ? 'admin' : 'student';
  authFlowState = { name: authFlowState.name || '', code: '' };
  showModal(`
    <h2 id="modalTitle">NovaMed account</h2>
    
    <div class="auth-tabs two" role="tablist" aria-label="Account access">
      <button class="auth-tab ${activeTab === 'student' ? 'active' : ''}" type="button" data-auth-tab="student">Student</button>
      <button class="auth-tab ${activeTab === 'admin' ? 'active' : ''}" type="button" data-auth-tab="admin">Admin</button>
    </div>

    <section id="studentAuthFlow" class="auth-pane ${activeTab === 'student' ? 'active' : ''}" data-auth-pane="student"></section>

    <form id="adminSigninForm" class="form-stack auth-form auth-pane ${activeTab === 'admin' ? 'active' : ''}" data-auth-pane="admin">
      <input name="name" required autocomplete="username" placeholder="Admin name" />
      <input name="code" required autocomplete="off" placeholder="Admin code" />
      <button class="primary-btn" type="submit">Unlock admin tools</button>
      <small class="security-note">Admin controls reveal contextual video management, Add Question, and content tools. Normal students never see these options.</small>
    </form>
  `);

  $$('[data-auth-tab]').forEach(tab => {
    tab.addEventListener('click', () => {
      const id = tab.dataset.authTab;
      $$('[data-auth-tab]').forEach(t => t.classList.toggle('active', t.dataset.authTab === id));
      $$('[data-auth-pane]').forEach(pane => pane.classList.toggle('active', pane.dataset.authPane === id));
    });
  });

  renderStudentAuthFlow();

  $('#adminSigninForm')?.addEventListener('submit', event => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get('name') || '').trim();
    const code = String(data.get('code') || '').trim();
    const adminMatch = name.toLowerCase() === ADMIN_CREDENTIALS.name.toLowerCase() && code === ADMIN_CREDENTIALS.code;
    if (!adminMatch) { showToast('Admin name or code is incorrect'); return; }
    setSession({ name: ADMIN_CREDENTIALS.name, role: 'admin' });
    state = loadState();
    closeModal();
    refreshAfterAccountChange();
    showToast('Admin tools unlocked');
  });
}

function showAccountModal() {
  showModal(`
    <h2 id="modalTitle">${esc(currentUserName())}</h2>
    <p class="modal-muted">Current access: <b>${isAdmin() ? 'Admin — upload and content tools enabled' : 'Student — personal progress is saved'}</b></p>
    <div class="account-summary-grid">
      <article><span>XP</span><b>${Number(state.xp || 0).toLocaleString()}</b></article>
      <article><span>Streak</span><b>${Number(state.streak || 0)} days</b></article>
      <article><span>Mistakes</span><b>${state.mistakes?.filter(item => item.status !== 'reviewed').length || 0}</b></article>
    </div>
    <div class="account-actions">
      ${isAdmin() ? '<button class="primary-btn" id="goAdminTools">Open QBank manager</button><button class="soft-btn" id="cloudSetupBtn">Cloud setup</button>' : '<button class="primary-btn" id="viewProfileNow">View my profile</button>'}
      ${!isAdmin() ? '<button class="soft-btn" id="upgradeAdmin">Admin sign in</button>' : ''}
      <button class="soft-btn danger-soft" id="logoutBtn">Log out</button>
    </div>
  `);
  $('#logoutBtn')?.addEventListener('click', () => {
    saveState();
    setSession(null);
    state = loadState();
    closeModal();
    refreshAfterAccountChange();
    navigate('learn');
    showToast('Logged out. Student data is saved to the simple account.');
  });
  $('#upgradeAdmin')?.addEventListener('click', () => showAuthModal('admin'));
  $('#cloudSetupBtn')?.addEventListener('click', showCloudSetupModal);
  $('#viewProfileNow')?.addEventListener('click', () => { closeModal(); navigate('profile'); });
  $('#goAdminTools')?.addEventListener('click', () => {
    closeModal();
    navigate('qbank');
    resetQbankPath('modes');
  });
}

function requireAdmin(action = 'manage content') {
  if (isAdmin()) return true;
  showToast(`Admin sign in required to ${action}`);
  showAuthModal('admin');
  return false;
}



function getTodoBrowseBranches() {
  const qTree = activeQbankCourseTree?.() || { detailed: [] };
  const vTree = activeVideoCourseTree?.() || { detailed: [] };
  const all = [...(qTree.detailed || []), ...(vTree.detailed || [])];
  const preferred = ['obstetrics', 'medicine', 'surgery', 'pediatrics', 'microbiology', 'community'];
  const map = new Map();
  all.forEach(course => {
    if (!course?.id) return;
    if (!map.has(course.id)) map.set(course.id, {
      id: course.id,
      title: String(course.title || course.id).replace(/^Detailed\s+/,'').replace(/^Focused\s+/,''),
      icon: course.icon || '📘',
      topics: Array.isArray(course.topics) ? course.topics.map(topicTitle) : []
    });
  });
  return [...map.values()].sort((a, b) => {
    const ai = preferred.indexOf(a.id);
    const bi = preferred.indexOf(b.id);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
}

function getTodoBrowseTopics(courseId) {
  const qCourse = (activeQbankCourseTree().detailed || []).find(course => course.id === courseId);
  const vCourse = (activeVideoCourseTree().detailed || []).find(course => course.id === courseId);
  const fromQuestions = (state.questions || []).filter(q => q.mode === 'detailed' && q.course === courseId).map(q => q.topic);
  const fromVideos = (state.videos || []).filter(v => v.course === courseId).map(v => v.topic || v.subject);
  return [...new Set([
    ...(qCourse?.topics || []).map(topicTitle),
    ...(vCourse?.topics || []).map(topicTitle),
    ...fromQuestions,
    ...fromVideos
  ].map(x => String(x || '').trim()).filter(Boolean))];
}


function findVideoForLessonTask(courseId, topic, subtopic = '') {
  const normTopic = normalizeRouteTopicName(topic);
  const normSub = normalizeRouteTopicName(subtopic);
  const candidates = (state.videos || []).filter(video => {
    const sameCourse = String(video.course || '').toLowerCase() === String(courseId || '').toLowerCase();
    const videoTopic = normalizeRouteTopicName(video.topic || video.subject || '');
    return sameCourse && (videoTopic === normTopic || videoTopic.includes(normTopic) || normTopic.includes(videoTopic));
  });

  if (!candidates.length) return null;
  if (normSub) {
    const exact = candidates.find(video => {
      const title = normalizeRouteTopicName(video.title || '');
      return title.includes(normSub) || normSub.includes(title);
    });
    if (exact) return exact;
  }
  return candidates[0];
}


function getTodoBrowseLectureTasks(courseId, topic) {
  const qbankSubtopics = typeof getQbankSubtopics === 'function'
    ? getQbankSubtopics('detailed', courseId, topic)
    : [];

  const subtopics = qbankSubtopics.length ? qbankSubtopics : [topic];

  return subtopics.map(subtopic => {
    const video = findVideoForLessonTask(courseId, topic, subtopic);
    const mcqCount = questionsFor({ mode: 'detailed', course: courseId, topic, subtopic: qbankSubtopics.length ? subtopic : undefined }).length;
    return {
      title: subtopic,
      meta: `${mcqCount} MCQs • QBank-based lecture${video ? ' • video available' : ' • no video yet'}`,
      label: 'Go to video',
      target: {
        type: 'lesson',
        mode: 'detailed',
        course: courseId,
        topic,
        subtopic: qbankSubtopics.length ? subtopic : null,
        videoId: video?.id || null,
        label: 'Go to video',
        doneLabel: 'Go to QBank'
      }
    };
  });
}

function openTodoLectureBrowser() {
  const branches = getTodoBrowseBranches();

  showModal(`
    <h2 id="modalTitle">Browse a lecture</h2>
    <p class="modal-muted">Choose a branch and system first, then select one or more lectures/QBank sets to add to your To-do list.</p>
    <form id="browseLectureForm" class="form-stack browse-lecture-form">
      <label class="field-label">
        <span>Branch</span>
        <select id="browseLectureBranch" name="branch" required>
          <option value="" selected disabled>Choose branch</option>
          ${branches.map(course => `<option value="${esc(course.id)}">${esc(course.title)}</option>`).join('')}
        </select>
      </label>
      <label class="field-label">
        <span>System / chapter</span>
        <select id="browseLectureTopic" name="topic" required disabled>
          <option value="" selected disabled>Choose system / chapter</option>
        </select>
      </label>
      <div class="browse-task-list empty" id="browseLectureList">
        <div class="browse-empty-state">
          <span>📚</span>
          <b>Choose a branch first</b>
          <p>Then choose the system/chapter to see available lectures and QBank sets.</p>
        </div>
      </div>
      <button class="primary-btn" type="submit">Add selected tasks</button>
    </form>
  `);

  const branchSelect = $('#browseLectureBranch');
  const topicSelect = $('#browseLectureTopic');
  const list = $('#browseLectureList');

  const renderEmpty = (title, text) => {
    list.classList.add('empty');
    list.innerHTML = `
      <div class="browse-empty-state">
        <span>📚</span>
        <b>${esc(title)}</b>
        <p>${esc(text)}</p>
      </div>
    `;
    list.dataset.tasks = '[]';
  };

  const renderTopics = () => {
    const branch = branchSelect?.value || '';
    topicSelect.innerHTML = '<option value="" selected disabled>Choose system / chapter</option>';
    topicSelect.disabled = !branch;
    if (!branch) {
      renderEmpty('Choose a branch first', 'Then choose the system/chapter to see available lectures and QBank sets.');
      return;
    }
    const topics = getTodoBrowseTopics(branch);
    topicSelect.innerHTML += topics.map(topic => `<option value="${esc(topic)}">${esc(topic)}</option>`).join('');
    renderEmpty('Choose a system / chapter', 'After choosing it, you can select multiple lectures or QBank sets.');
  };

  const renderTasks = () => {
    const branch = branchSelect?.value || '';
    const topic = topicSelect?.value || '';
    if (!branch || !topic) {
      renderEmpty('Choose a system / chapter', 'After choosing it, you can select multiple lectures or QBank sets.');
      return;
    }
    const branchTitle = branches.find(item => item.id === branch)?.title || branch;
    const tasks = getTodoBrowseLectureTasks(branch, topic);
    list.classList.remove('empty');
    list.innerHTML = tasks.map((task, index) => `
      <label class="browse-task-card">
        <input type="checkbox" name="taskIndex" value="${index}" />
        <span>
          <b>${esc(task.title)}</b>
          <small>${esc(branchTitle)} • ${esc(topic)} • ${esc(task.meta)}</small>
        </span>
      </label>
    `).join('');
    list.dataset.tasks = JSON.stringify(tasks);
  };

  branchSelect?.addEventListener('change', renderTopics);
  topicSelect?.addEventListener('change', renderTasks);
  renderTopics();

  $('#browseLectureForm')?.addEventListener('submit', event => {
    event.preventDefault();
    const branch = branchSelect?.value || '';
    const topic = topicSelect?.value || '';
    if (!branch || !topic) {
      showToast('Choose branch and system first');
      return;
    }

    const selectedIndexes = $$('#browseLectureList input[name="taskIndex"]:checked').map(input => Number(input.value));
    if (!selectedIndexes.length) {
      showToast('Choose at least one lecture or QBank set');
      return;
    }

    const branchTitle = branches.find(item => item.id === branch)?.title || branch;
    const tasks = JSON.parse(list.dataset.tasks || '[]');
    const selectedTasks = selectedIndexes.map(index => tasks[index]).filter(Boolean);

    state.dailyTodo = normalizeDailyTodo(state.dailyTodo);
    const existing = new Set(state.dailyTodo.items.map(item => String(item.text || '').toLowerCase()));
    const newItems = selectedTasks
      .map((task, index) => {
        const text = `${branchTitle} • ${topic}: ${task.title}`.slice(0, 80);
        if (existing.has(text.toLowerCase())) return null;
        return {
          id: Date.now() + index,
          text,
          done: false,
          createdAt: new Date().toISOString(),
          target: task.target || null
        };
      })
      .filter(Boolean);

    if (!newItems.length) {
      showToast('Selected tasks are already in your To-do list');
      return;
    }

    state.dailyTodo.items = [...newItems, ...state.dailyTodo.items].slice(0, 40);
    saveState();
    renderDailyTodo();
    closeModal();
    showToast(`${newItems.length} task${newItems.length > 1 ? 's' : ''} added`);
  });
}


function todoTargetTestPool(target = {}) {
  const mode = target.mode || 'detailed';
  const course = target.course || state.selectedQCourse || 'medicine';
  const topic = target.topic || state.selectedQTopic || 'General';
  const subtopic = target.subtopic || '';

  let pool = [];
  if (target.type === 'qbank' || target.type === 'lesson') {
    pool = questionsFor({ mode, course, topic, subtopic: subtopic || undefined });
  } else if (target.type === 'video') {
    const video = (state.videos || []).find(item => String(item.id) === String(target.videoId));
    const videoTitle = String(video?.title || '').trim().toLowerCase();

    const exactLecturePool = normalMcqPool().filter(q => {
      if (q.course !== course || q.topic !== topic) return false;
      const lecture = String(q.lecture || '').trim().toLowerCase();
      return videoTitle && lecture && (lecture === videoTitle || lecture.includes(videoTitle) || videoTitle.includes(lecture));
    });

    pool = exactLecturePool.length
      ? exactLecturePool
      : normalMcqPool().filter(q => q.course === course && q.topic === topic);
  } else {
    pool = normalMcqPool().filter(q => {
      if (course && q.course !== course) return false;
      if (topic && q.topic !== topic) return false;
      if (subtopic && q.subtopic !== subtopic) return false;
      return true;
    });
  }

  return pool.map(normalizeQuestion);
}

function startTodoSelfTest(target = {}) {
  const pool = todoTargetTestPool(target);
  if (!pool.length) {
    showToast('There is no MCQ for this task yet');
    return;
  }

  state.selectedQMode = target.mode || 'detailed';
  state.selectedQCourse = target.course || pool[0]?.course || state.selectedQCourse;
  state.selectedQTopic = target.topic || pool[0]?.topic || state.selectedQTopic;
  state.selectedQSubtopic = target.subtopic || pool[0]?.subtopic || null;
  state.qbankLevel = 'set';

  activeQuestionPool = pool;
  saveState();
  renderQbank();
  navigate('qbank');

  setTimeout(() => {
    renderQuestion(0);
    $('#questionCard')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 120);

  showToast(`Self-test started: ${pool.length} MCQ${pool.length > 1 ? 's' : ''}`);
}


function openTodoTarget(target) {
  if (!target || typeof target !== 'object') {
    showToast('No linked destination for this task');
    return;
  }

  if (target.type === 'lesson') {
    const video = target.videoId
      ? (state.videos || []).find(item => String(item.id) === String(target.videoId))
      : findVideoForLessonTask(target.course, target.topic, target.subtopic || '');

    if (!video) {
      showToast('There is no video for this task yet');
      return;
    }

    state.selectedMode = video.mode || target.mode || 'detailed';
    state.selectedCourse = video.course || target.course || state.selectedCourse;
    state.selectedTopic = video.topic || target.topic || state.selectedTopic;
    state.videoLevel = 'set';
    saveState();
    renderVideos();
    navigate('videos');

    setTimeout(() => {
      const card = document.querySelector(`[data-open-video="${CSS.escape(String(video.id))}"]`);
      if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        card.classList.add('spotlight-target');
        setTimeout(() => card.classList.remove('spotlight-target'), 1400);
      }
    }, 140);
    showToast('Opened the linked video');
    return;
  }

  if (target.type === 'video') {
    const video = (state.videos || []).find(item => String(item.id) === String(target.videoId));
    if (!video) {
      showToast('Linked video was not found');
      return;
    }

    state.selectedMode = target.mode || video.mode || 'detailed';
    state.selectedCourse = target.course || video.course || state.selectedCourse;
    state.selectedTopic = target.topic || video.topic || state.selectedTopic;
    state.videoLevel = 'set';
    saveState();
    renderVideos();
    navigate('videos');

    setTimeout(() => {
      const card = document.querySelector(`[data-open-video="${CSS.escape(String(video.id))}"]`);
      if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        card.classList.add('spotlight-target');
        setTimeout(() => card.classList.remove('spotlight-target'), 1400);
      }
    }, 140);
    showToast('Opened the linked lecture');
    return;
  }

  if (target.type === 'qbank') {
    state.selectedQMode = target.mode || 'detailed';
    state.selectedQCourse = target.course || state.selectedQCourse;
    state.selectedQTopic = target.topic || state.selectedQTopic;
    state.selectedQSubtopic = target.subtopic || null;
    state.qbankLevel = 'set';
    saveState();
    renderQbank();
    navigate('qbank');
    showToast('Opened the linked QBank set');
    return;
  }

  showToast('Destination type is not supported yet');
}


function bindDailyTodo() {
  const form = $('#dailyTodoForm');
  const input = $('#dailyTodoInput');
  const list = $('#dailyTodoList');
  const browseLecture = $('#browseTodoLecture');

  form?.addEventListener('submit', event => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text) {
      showToast('Write a task first');
      return;
    }
    state.dailyTodo = normalizeDailyTodo(state.dailyTodo);
    state.dailyTodo.items.unshift({ id: Date.now(), text, done: false, createdAt: new Date().toISOString(), target: null });
    input.value = '';
    saveState();
    renderDailyTodo();
    showToast('Task pinned for today');
  });

  list?.addEventListener('change', event => {
    const toggle = event.target.closest('[data-todo-toggle]');
    if (!toggle) return;
    const rawId = toggle.dataset.todoToggle;
    if (parseCalendarTodoVirtualId(rawId)) {
      updateCalendarTodoFromVirtualId(rawId, item => ({ ...item, done: toggle.checked }));
      renderDailyTodo();
      if (toggle.checked) showToast('Nice. Calendar task completed ✅');
      return;
    }
    const id = Number(rawId);
    state.dailyTodo = normalizeDailyTodo(state.dailyTodo);
    const item = state.dailyTodo.items.find(task => Number(task.id) === id);
    if (item) {
      item.done = toggle.checked;
      saveState();
      renderDailyTodo();
      if (item.done) showToast('Nice. Task completed ✅');
    }
  });

  list?.addEventListener('click', event => {
    const go = event.target.closest('[data-todo-go]');
    if (go) {
      event.preventDefault();
      event.stopPropagation();
      const rawId = go.dataset.todoGo;
      state.dailyTodo = normalizeDailyTodo(state.dailyTodo);
      let item = null;
      const parsed = parseCalendarTodoVirtualId(rawId);
      if (parsed) item = calendarTodosFor(parsed.dateKey).find(task => Number(task.id) === Number(parsed.id));
      else item = state.dailyTodo.items.find(task => Number(task.id) === Number(rawId));
      if (item?.done) startTodoSelfTest(item?.target);
      else openTodoTarget(item?.target);
      return;
    }

    const del = event.target.closest('[data-todo-delete]');
    if (!del) return;
    event.preventDefault();
    event.stopPropagation();
    const rawId = del.dataset.todoDelete;
    if (parseCalendarTodoVirtualId(rawId)) {
      deleteCalendarTodoFromVirtualId(rawId);
      renderDailyTodo();
      showToast('Calendar task removed');
      return;
    }
    const id = Number(rawId);
    state.dailyTodo = normalizeDailyTodo(state.dailyTodo);
    state.dailyTodo.items = state.dailyTodo.items.filter(task => Number(task.id) !== id);
    saveState();
    renderDailyTodo();
    showToast('Task removed');
  });

  browseLecture?.addEventListener('click', () => {
    openTodoLectureBrowser();
  });
}


function bindNavigation() {
  $$('[data-nav]').forEach(btn => {
    btn.addEventListener('click', () => navigate(btn.dataset.nav));
  });
}

function navigate(screen) {
  $$('.screen').forEach(s => s.classList.toggle('active', s.dataset.screen === screen));
  $$('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.nav === screen));
  try {
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  } catch (error) {
    window.scrollTo(0, 0);
  }
  if (screen === 'learn') stabilizeExamCalendar();
  if (screen === 'videos') renderVideoGuideControls();
  if (screen === 'qbank') renderQbankGuideControls();
}

function bindHeroActions() {
  $$('[data-jump="lesson-1"]').forEach(btn => btn.addEventListener('click', () => openLesson('Video: Heart sounds')));
}

function bindTheme() {
  $('#themeBtn').addEventListener('click', () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    saveState();
    applyTheme();
    showToast(state.theme === 'dark' ? 'Dark mode activated' : 'Light mode activated');
  });
}

function applyTheme() {
  document.body.classList.toggle('light', state.theme === 'light');
  $('#themeBtn').textContent = state.theme === 'light' ? '☀' : '☾';
}

function bindModals() {
  $('#closeModal').addEventListener('click', closeModal);
  $('#modalBackdrop').addEventListener('click', e => {
    if (e.target.id === 'modalBackdrop') closeModal();
  });
  $('#openAddQuestion')?.addEventListener('click', () => {
    if (!requireAdmin('add questions')) return;
    navigate('qbank');
    resetQbankPath('modes');
    showToast('Open a QBank topic, then add the MCQ there');
  });
}

function stopModalMedia() {
  const modal = $('#modalContent');
  if (!modal) return;
  modal.querySelectorAll('video, audio').forEach(media => {
    try {
      media.pause();
      media.removeAttribute('src');
      media.querySelectorAll('source').forEach(source => source.removeAttribute('src'));
      media.load();
    } catch (error) {
      // Ignore cleanup errors; the goal is simply to stop background playback.
    }
  });
  modal.querySelectorAll('iframe').forEach(frame => {
    try { frame.src = 'about:blank'; } catch (error) {}
  });
}

function setModalVariant(className = '') {
  const card = document.querySelector('#modalBackdrop .modal-card');
  if (!card) return;
  card.classList.remove('free-courses-modal-card', 'free-course-watch-card', 'qbank-set-modal-card', 'real-exam-modal-card', 'profile-workspace-modal-card-v110');
  if (className) card.classList.add(className);
}

function getModalScrollContainerV106(target, fallback) {
  let node = target instanceof Element ? target : null;
  while (node && node !== document.body && node !== document.documentElement) {
    if (node.id === 'modalBackdrop') break;
    const style = window.getComputedStyle(node);
    const canScroll = /(auto|scroll|overlay)/.test(style.overflowY || '') && node.scrollHeight > node.clientHeight + 2;
    if (canScroll) return node;
    if (node === fallback) break;
    node = node.parentElement;
  }
  return fallback && fallback.scrollHeight > fallback.clientHeight + 2 ? fallback : null;
}

function bindModalNaturalScrollV106() {
  const backdrop = $('#modalBackdrop');
  const card = document.querySelector('#modalBackdrop .modal-card');
  if (!backdrop || !card || card.dataset.naturalScrollV106 === '1') return;
  card.dataset.naturalScrollV106 = '1';
  card.addEventListener('wheel', event => {
    if (event.ctrlKey || Math.abs(event.deltaY || 0) < Math.abs(event.deltaX || 0)) return;
    const scroller = getModalScrollContainerV106(event.target, card);
    if (!scroller) return;
    const delta = event.deltaY || 0;
    const before = scroller.scrollTop;
    scroller.scrollTop += delta;
    if (scroller.scrollTop !== before) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, { passive: false });
}

function showModal(html) {
  stopModalMedia();
  const backdrop = $('#modalBackdrop');
  const content = $('#modalContent');
  if (!backdrop || !content) return;
  content.innerHTML = html;
  document.body.classList.add('modal-open-v106');
  backdrop.classList.add('show');
  backdrop.setAttribute('aria-hidden', 'false');
  window.requestAnimationFrame(() => {
    const card = document.querySelector('#modalBackdrop .modal-card');
    if (backdrop) backdrop.scrollTop = 0;
    if (card) {
      card.scrollTop = 0;
      bindModalNaturalScrollV106();
    }
  });
}
function closeModal() {
  stopQuickExamTimer();
  stopQbankTimer();
  stopModalMedia();
  $('#modalBackdrop').classList.remove('show');
  $('#modalBackdrop').setAttribute('aria-hidden', 'true');
  $('#modalContent').innerHTML = '';
  document.body.classList.remove('modal-open-v106');
  setModalVariant('');
}

function bindLessonNodes() {
  $$('.lesson-node').forEach(node => {
    node.addEventListener('click', () => openLesson(node.dataset.lesson));
    node.addEventListener('keydown', e => {
      if (e.key === 'Enter') openLesson(node.dataset.lesson);
    });
  });
}

function openLesson(title) {
  if (title.startsWith('Locked')) {
    showToast('Complete the previous lessons first');
    return;
  }
  showModal(`
    <h2 id="modalTitle">${esc(title)}</h2>
    <p>This is a polished lesson preview. In the full app, this opens the video player, attached notes, and related MCQs.</p>
    <div style="height:180px;border-radius:24px;background:linear-gradient(135deg,#56e39f,#3ee8ff,#4f8cff);display:grid;place-items:center;margin:16px 0;color:#061226;font-size:46px;font-weight:1000;">▶</div>
    <button class="primary-btn" id="completeLessonBtn">Mark as completed +25 XP</button>
  `);
  setTimeout(() => {
    const btn = $('#completeLessonBtn');
    if (btn) btn.addEventListener('click', async () => {
      await window.awardStudentXpSecure?.('lesson_completed', window.rewardEventKeyV148?.(['lesson', title]) || `lesson:${title}`, { title }, { toast: '+{xp} XP earned', duplicateToast: 'Lesson reward already counted' });
      saveState();
      updateMiniStats();
      closeModal();
    });
  }, 0);
}


/* v102: Partner features moved into Profile as Coming Soon */
function showPartnerComingSoonModalV102() {
  const features = [
    ['Study Room', 'Shared study room with a friend.'],
    ['MCQ Duel', 'Two-student MCQ duel.'],
    ['Shared Timer', 'Shared study timer.'],
    ['Watch Together', 'Watch a lecture with a friend.'],
    ['Progress Compare', 'Compare study progress with a friend.']
  ];
  showModal(`
    <h2 id="modalTitle">Study Partner features coming soon</h2>
    <p class="modal-muted">We are preparing tools that help you study with a friend inside the app in a structured and enjoyable way.</p>
    <div class="coming-soon-label">Coming Soon</div>
    <div class="partner-coming-cards">
      ${features.map(([title, body]) => `
        <article class="partner-feature-card">
          <b>${esc(title)}</b>
          <p>${esc(body)}</p>
        </article>
      `).join('')}
    </div>
  `);
}
