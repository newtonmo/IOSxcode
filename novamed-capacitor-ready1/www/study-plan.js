/* NovaMed v85 - Smart Study Plan for Home. Local algorithm, no API required. */
const NOVAMED_SMART_STUDY_PLAN_KEY_V85 = 'novamed-smart-study-plan-v85';

function studyPlanEscV85(value) {
  return typeof esc === 'function'
    ? esc(value)
    : String(value ?? '').replace(/[&<>'"]/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[ch]));
}

function studyPlanDataV85(value) {
  try { return typeof dataValue === 'function' ? dataValue(value) : encodeURIComponent(String(value ?? '')); }
  catch { return encodeURIComponent(String(value ?? '')); }
}

function studyPlanReadDataV85(value) {
  try { return typeof readDataValue === 'function' ? readDataValue(value) : decodeURIComponent(String(value ?? '')); }
  catch { return String(value ?? ''); }
}

function studyPlanTodayKeyV85(date = new Date()) {
  if (typeof formatDateKey === 'function') return formatDateKey(date);
  const d = date instanceof Date ? date : new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function studyPlanAddDaysV85(date, days) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + Number(days || 0));
  return d;
}

function studyPlanDaysBetweenV85(start, end) {
  const a = new Date(start); a.setHours(0, 0, 0, 0);
  const b = new Date(end); b.setHours(0, 0, 0, 0);
  return Math.ceil((b - a) / 86400000);
}

function studyPlanUserKeyV85() {
  const user = state?.user || {};
  const raw = user.studentKey || user.email || user.name || 'guest';
  try {
    if (typeof studentAccountKey === 'function') return studentAccountKey(raw) || 'guest';
  } catch {}
  return String(raw || 'guest').toLowerCase().replace(/[^a-z0-9_-]+/g, '-');
}

function studyPlanStorageKeyV85() {
  return `${NOVAMED_SMART_STUDY_PLAN_KEY_V85}:${studyPlanUserKeyV85()}`;
}

function readSmartStudyPlanV85() {
  try {
    const raw = window.__novamedSmartStudyPlanCache || null;
    return raw && typeof raw === 'object' && Array.isArray(raw.days) ? raw : null;
  } catch {
    return null;
  }
}

function writeSmartStudyPlanV85(plan) {
  // Phase 2A: Smart Study Plan no longer writes to localStorage.
  // It is kept in memory and saved to Supabase study_plans for the signed-in student.
  if (!plan) {
    window.__novamedSmartStudyPlanCache = null;
    if (typeof clearSmartStudyPlanFromSupabase === 'function') {
      clearSmartStudyPlanFromSupabase().catch(err => console.warn('NovaMed study plan cloud clear failed:', err?.message || err));
    }
    return;
  }
  const safe = { ...plan, updatedAt: new Date().toISOString() };
  window.__novamedSmartStudyPlanCache = safe;
  if (typeof saveSmartStudyPlanToSupabase === 'function') {
    saveSmartStudyPlanToSupabase(safe).catch(err => console.warn('NovaMed study plan cloud save failed:', err?.message || err));
  }
}

function studyPlanTopicNormV85(value = '') {
  return String(value || '')
    .toLowerCase()
    .replace(/cardiology/g, 'cardio')
    .replace(/paediatrics/g, 'pediatrics')
    .replace(/respiratory medicine/g, 'respiratory')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(system|chapter|lecture|full|course)\b/g, '')
    .trim();
}

function studyPlanTopicMatchV85(a = '', b = '') {
  const x = studyPlanTopicNormV85(a);
  const y = studyPlanTopicNormV85(b);
  if (!x || !y) return false;
  return x === y || x.includes(y) || y.includes(x);
}

function studyPlanCourseTitleV85(course) {
  try { return typeof baseCourseTitle === 'function' ? baseCourseTitle(course) : String(course || 'General'); }
  catch { return String(course || 'General'); }
}

function studyPlanQuestionPoolV85() {
  try {
    const pool = typeof normalMcqPool === 'function' ? normalMcqPool() : (state.questions || []);
    return (pool || []).map(q => typeof normalizeQuestion === 'function' ? normalizeQuestion(q) : q);
  } catch {
    return (state.questions || []).map(q => typeof normalizeQuestion === 'function' ? normalizeQuestion(q) : q);
  }
}

function studyPlanVideoPoolV85() {
  return (state?.videos || []).filter(video => String(video.mode || '').toLowerCase() !== 'free-courses');
}

function studyPlanMistakePoolV85() {
  return (state?.mistakes || []).filter(item => item && item.status !== 'reviewed');
}

function studyPlanFlashcardPoolV85() {
  return Array.isArray(state?.flashcards) ? state.flashcards : [];
}

function studyPlanStatsForV85(course, topic) {
  const videos = studyPlanVideoPoolV85().filter(video => {
    if (course && video.course !== course) return false;
    return studyPlanTopicMatchV85(video.topic || video.subject || '', topic);
  });
  const questions = studyPlanQuestionPoolV85().filter(q => {
    if (course && q.course !== course) return false;
    return studyPlanTopicMatchV85(q.topic || q.subtopic || '', topic);
  });
  const mistakes = studyPlanMistakePoolV85().filter(item => {
    const q = typeof normalizeQuestion === 'function' ? normalizeQuestion(item.question || item) : (item.question || item);
    if (course && q.course !== course) return false;
    return studyPlanTopicMatchV85(q.topic || q.subtopic || item.topic || '', topic);
  });
  const flashcards = studyPlanFlashcardPoolV85().filter(card => {
    if (course && card.course && card.course !== course) return false;
    return studyPlanTopicMatchV85(card.topic || card.subtopic || card.course || '', topic);
  });
  const completedVideos = videos.filter(video => {
    try { return typeof displayVideoProgress === 'function' ? displayVideoProgress(video) >= 95 : Number(video.progress || 0) >= 95; }
    catch { return Number(video.progress || 0) >= 95; }
  });
  const attempts = Array.isArray(state?.qbankAttempts) ? state.qbankAttempts.filter(attempt => {
    const q = typeof normalizeQuestion === 'function' ? normalizeQuestion(attempt.question || attempt) : (attempt.question || attempt);
    if (course && q.course !== course) return false;
    return studyPlanTopicMatchV85(q.topic || q.subtopic || attempt.topic || '', topic);
  }) : [];
  const wrongAttempts = attempts.filter(a => a.correct === false || Number(a.selected) !== Number((a.question || a).correct)).length;
  return {
    videos,
    questions,
    mistakes,
    flashcards,
    attempts,
    wrongAttempts,
    videoCount: videos.length,
    questionCount: questions.length,
    mistakeCount: mistakes.length,
    flashcardCount: flashcards.length,
    completedVideoCount: completedVideos.length,
    unfinishedVideoCount: Math.max(0, videos.length - completedVideos.length)
  };
}

function studyPlanSystemOptionsV85() {
  const map = new Map();
  const add = (course, topic, source = 'content') => {
    const c = String(course || 'general').trim() || 'general';
    const t = String(topic || 'General').trim() || 'General';
    const norm = `${c}||${studyPlanTopicNormV85(t) || t.toLowerCase()}`;
    const current = map.get(norm) || { key: norm, course: c, topic: t, label: `${studyPlanCourseTitleV85(c)} — ${t}`, aliases: [], sources: new Set() };
    if (!current.aliases.some(x => studyPlanTopicNormV85(x) === studyPlanTopicNormV85(t))) current.aliases.push(t);
    if (String(t).length < String(current.topic || '').length || source === 'tree') {
      current.topic = t;
      current.label = `${studyPlanCourseTitleV85(c)} — ${t}`;
    }
    current.sources.add(source);
    map.set(norm, current);
  };

  try {
    const tree = typeof activeVideoCourseTree === 'function' ? activeVideoCourseTree() : null;
    (tree?.detailed || []).forEach(course => (course.topics || []).forEach(topic => add(course.id, topic, 'tree')));
  } catch {}

  studyPlanVideoPoolV85().forEach(video => add(video.course, video.topic || video.subject, 'video'));
  studyPlanQuestionPoolV85().forEach(q => add(q.course, q.topic, 'qbank'));
  studyPlanMistakePoolV85().forEach(item => {
    const q = typeof normalizeQuestion === 'function' ? normalizeQuestion(item.question || item) : (item.question || item);
    add(q.course || item.course, q.topic || item.topic, 'mistake');
  });

  const preferred = ['medicine', 'pediatrics', 'obstetrics', 'surgery', 'community', 'microbiology'];
  return Array.from(map.values()).map(item => {
    const stats = studyPlanStatsForV85(item.course, item.topic);
    const priority = (stats.mistakeCount * 18) + (stats.wrongAttempts * 8) + (stats.unfinishedVideoCount * 5) + (stats.questionCount ? 2 : 0) + (item.sources.has('tree') ? 1 : 0);
    return { ...item, sources: Array.from(item.sources), stats, priority };
  }).filter(item => item.stats.videoCount || item.stats.questionCount || item.stats.mistakeCount || item.sources.includes('tree'))
    .sort((a, b) => {
      const pa = preferred.indexOf(a.course); const pb = preferred.indexOf(b.course);
      if (b.priority !== a.priority) return b.priority - a.priority;
      if (pa !== pb) return (pa === -1 ? 999 : pa) - (pb === -1 ? 999 : pb);
      return a.label.localeCompare(b.label);
    });
}

function studyPlanBestSystemsV85(limit = 4) {
  const options = studyPlanSystemOptionsV85();
  const weighted = options.filter(opt => opt.priority > 0);
  return (weighted.length ? weighted : options).slice(0, limit);
}

function studyPlanDefaultExamDateV85(days = 30) {
  return studyPlanTodayKeyV85(studyPlanAddDaysV85(new Date(), days));
}

function studyPlanDefaultProfileV85() {
  const weak = studyPlanBestSystemsV85(3).map(item => item.key);
  return {
    stage: 'sixth',
    dailyMinutes: 120,
    examDate: studyPlanDefaultExamDateV85(30),
    planDays: 14,
    weakSystems: weak,
    intensity: 'balanced'
  };
}

function studyPlanFindSystemV85(key) {
  const decoded = String(key || '');
  return studyPlanSystemOptionsV85().find(opt => opt.key === decoded) || null;
}

function studyPlanQuestionCountForV85(course, topic) {
  return studyPlanStatsForV85(course, topic).questionCount;
}

function studyPlanPickVideosV85(course, topic, count = 1, offset = 0) {
  const stats = studyPlanStatsForV85(course, topic);
  const scored = stats.videos.map(video => {
    let progress = 0;
    try { progress = typeof displayVideoProgress === 'function' ? displayVideoProgress(video) : Number(video.progress || 0); } catch { progress = Number(video.progress || 0); }
    return { video, score: progress >= 95 ? 0 : progress > 5 ? 2 : 3 };
  }).sort((a, b) => b.score - a.score || String(a.video.title || '').localeCompare(String(b.video.title || '')));
  if (!scored.length) return [];
  const rotated = scored.slice(offset % scored.length).concat(scored.slice(0, offset % scored.length));
  return rotated.slice(0, count).map(x => x.video);
}

function studyPlanMinutesLabelV85(minutes) {
  const n = Math.max(0, Number(minutes || 0));
  if (n >= 60) {
    const h = Math.floor(n / 60);
    const m = n % 60;
    return `${h}h${m ? ` ${m}m` : ''}`;
  }
  return `${n}m`;
}

function studyPlanTaskIdV85(dayIndex, type, course, topic, extra = '') {
  return `d${dayIndex + 1}-${type}-${String(course || '').replace(/\W+/g, '-')}-${studyPlanTopicNormV85(topic).replace(/\s+/g, '-')}-${String(extra || '').replace(/\W+/g, '-')}`;
}

function generateSmartStudyPlanV85(profile = studyPlanDefaultProfileV85()) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const examDate = profile.examDate && !Number.isNaN(new Date(profile.examDate).getTime())
    ? new Date(profile.examDate)
    : studyPlanAddDaysV85(today, 30);
  examDate.setHours(0, 0, 0, 0);
  const rawDaysLeft = Math.max(1, studyPlanDaysBetweenV85(today, examDate) + 1);
  const planDays = Math.max(3, Math.min(Number(profile.planDays || 14), Math.max(3, rawDaysLeft)));
  const dailyMinutes = Math.max(30, Math.min(480, Number(profile.dailyMinutes || 120)));

  const selectedSystems = (profile.weakSystems || [])
    .map(studyPlanFindSystemV85)
    .filter(Boolean);
  const systems = selectedSystems.length ? selectedSystems : studyPlanBestSystemsV85(4);
  const fallbackSystems = systems.length ? systems : [{ key: 'general||general', course: 'general', topic: 'General', label: 'General review', stats: studyPlanStatsForV85('', '') }];

  const phase = rawDaysLeft <= 7 ? 'exam-cram' : rawDaysLeft <= 21 ? 'balanced' : 'foundation';
  const days = [];
  for (let i = 0; i < planDays; i += 1) {
    const date = studyPlanAddDaysV85(today, i);
    const system = fallbackSystems[i % fallbackSystems.length];
    const stats = studyPlanStatsForV85(system.course, system.topic);
    const isFinalStretch = studyPlanDaysBetweenV85(date, examDate) <= 7;
    const tasks = [];
    const videoTarget = dailyMinutes >= 180 && !isFinalStretch ? 2 : dailyMinutes >= 75 && !(isFinalStretch && dailyMinutes < 120) ? 1 : 0;
    const videos = studyPlanPickVideosV85(system.course, system.topic, videoTarget, i);

    videos.forEach((video, vidIndex) => {
      tasks.push({
        id: studyPlanTaskIdV85(i, 'video', system.course, system.topic, video.id || vidIndex),
        type: 'video',
        icon: '▶',
        title: `Watch ${video.title}`,
        subtitle: `${studyPlanCourseTitleV85(video.course)} • ${video.topic || system.topic}`,
        course: video.course || system.course,
        topic: video.topic || system.topic,
        videoId: video.id,
        minutes: Math.min(55, dailyMinutes >= 180 ? 45 : 35),
        done: false
      });
    });

    const baseMcq = dailyMinutes < 75 ? 10 : dailyMinutes < 150 ? 20 : dailyMinutes < 240 ? 35 : 50;
    const mcqCount = Math.max(5, Math.min(stats.questionCount || baseMcq, baseMcq + (isFinalStretch ? 10 : 0)));
    tasks.push({
      id: studyPlanTaskIdV85(i, 'mcq', system.course, system.topic, mcqCount),
      type: 'mcq',
      icon: '?',
      title: stats.questionCount ? `Solve ${mcqCount} MCQs` : `Open QBank and review ${system.topic}`,
      subtitle: `${system.label} • exam-style block`,
      course: system.course,
      topic: system.topic,
      count: mcqCount,
      minutes: Math.max(15, Math.round(mcqCount * 1.6)),
      done: false
    });

    const mistakeCount = Math.min(stats.mistakeCount, dailyMinutes < 100 ? 3 : dailyMinutes < 180 ? 5 : 8);
    if (mistakeCount > 0) {
      tasks.push({
        id: studyPlanTaskIdV85(i, 'mistakes', system.course, system.topic, mistakeCount),
        type: 'mistakes',
        icon: '⚑',
        title: `Review ${mistakeCount} saved mistakes`,
        subtitle: `${system.topic} weak-answer repair`,
        course: system.course,
        topic: system.topic,
        count: mistakeCount,
        minutes: Math.max(10, mistakeCount * 3),
        done: false
      });
    }

    const cardCount = stats.flashcardCount ? Math.min(stats.flashcardCount, dailyMinutes < 100 ? 5 : 10) : (dailyMinutes >= 90 ? 5 : 0);
    if (cardCount > 0) {
      tasks.push({
        id: studyPlanTaskIdV85(i, 'flashcards', system.course, system.topic, cardCount),
        type: 'flashcards',
        icon: '◫',
        title: stats.flashcardCount ? `Review ${cardCount} flashcards` : `Create/refresh ${cardCount} flashcard recalls`,
        subtitle: `${system.topic} active recall`,
        course: system.course,
        topic: system.topic,
        count: cardCount,
        minutes: Math.max(8, cardCount * 2),
        done: false
      });
    }

    if (!videos.length && !stats.questionCount && !stats.mistakeCount) {
      tasks.push({
        id: studyPlanTaskIdV85(i, 'recap', system.course, system.topic, 'core'),
        type: 'recap',
        icon: '✎',
        title: `Make a high-yield recap for ${system.topic}`,
        subtitle: 'Write 5 lines: presentation, diagnosis, management, trap, takeaway.',
        course: system.course,
        topic: system.topic,
        minutes: 20,
        done: false
      });
    }

    const totalTaskMinutes = tasks.reduce((sum, task) => sum + Number(task.minutes || 0), 0);
    days.push({
      id: `day-${i + 1}`,
      day: i + 1,
      date: studyPlanTodayKeyV85(date),
      title: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : `Day ${i + 1}`,
      system: { key: system.key, course: system.course, topic: system.topic, label: system.label },
      minutes: Math.min(dailyMinutes, totalTaskMinutes || dailyMinutes),
      tasks
    });
  }

  return {
    id: `plan-${Date.now()}`,
    version: 85,
    generatedAt: new Date().toISOString(),
    startDate: studyPlanTodayKeyV85(today),
    examDate: studyPlanTodayKeyV85(examDate),
    daysLeft: rawDaysLeft,
    phase,
    profile: {
      ...studyPlanDefaultProfileV85(),
      ...profile,
      dailyMinutes,
      examDate: studyPlanTodayKeyV85(examDate),
      planDays,
      weakSystems: (profile.weakSystems || []).length ? profile.weakSystems : fallbackSystems.slice(0, 3).map(s => s.key)
    },
    systems: fallbackSystems.map(system => ({ key: system.key, course: system.course, topic: system.topic, label: system.label })),
    days
  };
}

function studyPlanProgressV85(plan = readSmartStudyPlanV85()) {
  const tasks = (plan?.days || []).flatMap(day => day.tasks || []);
  const done = tasks.filter(task => task.done).length;
  const total = tasks.length;
  return { done, total, percent: total ? Math.round((done / total) * 100) : 0 };
}

function studyPlanTodayIndexV85(plan) {
  if (!plan) return 0;
  const idx = (plan.days || []).findIndex(day => day.date >= studyPlanTodayKeyV85());
  return idx >= 0 ? idx : Math.max(0, (plan.days || []).length - 1);
}

function studyPlanStageLabelV85(stage) {
  const map = { third: 'Third stage', fourth: 'Fourth stage', fifth: 'Fifth stage', sixth: 'Sixth stage', board: 'Board / final review' };
  return map[stage] || 'Medical student';
}

function smartStudyPlanIntroHtmlV85() {
  const options = studyPlanSystemOptionsV85();
  const videos = studyPlanVideoPoolV85().length;
  const questions = studyPlanQuestionPoolV85().length;
  const mistakes = studyPlanMistakePoolV85().length;
  return `
    <section class="smart-study-plan-card-v85 premium-card" id="smartStudyPlanCardV85">
      <div class="smart-plan-orb-v85" aria-hidden="true"></div>
      <div class="smart-plan-head-v85 clean-home-card-head-v111 smart-plan-head-v115">
        <div class="home-title-help-v115">
          <h2>Smart Study Plan</h2>
          <button class="home-help-btn-v111" type="button" data-home-help-v111="studyPlan" aria-label="Smart study plan help">?</button>
        </div>
      </div>
      <div class="smart-plan-stat-grid-v85">
        <div><b>${videos}</b><span>Videos scanned</span></div>
        <div><b>${questions}</b><span>MCQs available</span></div>
        <div><b>${mistakes}</b><span>Mistakes to repair</span></div>
        <div><b>${options.length}</b><span>Systems detected</span></div>
      </div>
      <div class="smart-plan-empty-actions-v85">
        <button class="primary-btn" type="button" data-smart-plan-create-v85>Build my plan</button>
        <button class="soft-btn" type="button" data-smart-plan-autobuild-v85>Auto 7-day plan</button>
      </div>
    </section>
  `;
}

function smartStudyTaskHtmlV85(task) {
  const encoded = studyPlanDataV85(task.id);
  const actionLabel = task.type === 'video' ? 'Open' : task.type === 'mcq' ? 'Start exam' : task.type === 'flashcards' ? 'Review' : task.type === 'mistakes' ? 'Mistakes' : 'Open';
  return `
    <article class="smart-plan-task-v85 ${task.done ? 'done' : ''}">
      <label>
        <input type="checkbox" data-smart-plan-toggle-v85="${encoded}" ${task.done ? 'checked' : ''} />
        <span class="task-icon-v85">${studyPlanEscV85(task.icon || '•')}</span>
        <span>
          <b>${studyPlanEscV85(task.title)}</b>
          <small>${studyPlanEscV85(task.subtitle || '')} • ${studyPlanMinutesLabelV85(task.minutes || 0)}</small>
        </span>
      </label>
      <button class="tiny-btn" type="button" data-smart-plan-action-v85="${encoded}">${actionLabel}</button>
    </article>
  `;
}

function smartStudyPlanHtmlV85(plan) {
  const progress = studyPlanProgressV85(plan);
  const todayIndex = studyPlanTodayIndexV85(plan);
  const today = plan.days[todayIndex] || plan.days[0];
  const tomorrow = plan.days[todayIndex + 1];
  const weakLabels = (plan.systems || []).slice(0, 3).map(s => s.topic).join(' + ');
  const todayDone = (today?.tasks || []).filter(task => task.done).length;
  const todayTotal = (today?.tasks || []).length;
  return `
    <section class="smart-study-plan-card-v85 premium-card active-plan-v85" id="smartStudyPlanCardV85">
      <div class="smart-plan-orb-v85" aria-hidden="true"></div>
      <div class="smart-plan-head-v85 clean-home-card-head-v111 smart-plan-head-v115">
        <div class="home-title-help-v115">
          <h2>${today?.title || 'Today'}: ${studyPlanEscV85(today?.system?.topic || 'Focused study')}</h2>
          <button class="home-help-btn-v111" type="button" data-home-help-v111="studyPlan" aria-label="Smart study plan help">?</button>
        </div>
        <div class="home-card-actions-v111">
          <div class="smart-plan-score-v85"><b>${progress.percent}%</b><span>plan done</span></div>
        </div>
      </div>

      <div class="smart-plan-progress-track-v85" aria-label="Study plan completion">
        <i style="width:${Math.max(2, progress.percent)}%"></i>
      </div>

      <div class="smart-plan-meta-grid-v85">
        <div><b>${todayDone}/${todayTotal}</b><span>today tasks</span></div>
        <div><b>${plan.days.length}</b><span>planned days</span></div>
        <div><b>${studyPlanEscV85(plan.phase || 'balanced')}</b><span>strategy</span></div>
      </div>

      <div class="smart-plan-task-list-v85">
        ${(today?.tasks || []).map(smartStudyTaskHtmlV85).join('')}
      </div>

      ${tomorrow ? `<div class="smart-plan-tomorrow-v85"><b>Tomorrow:</b> ${studyPlanEscV85(tomorrow.system?.topic)} • ${(tomorrow.tasks || []).slice(0, 3).map(t => studyPlanEscV85(t.title)).join(' + ')}</div>` : ''}

      <div class="smart-plan-actions-v85">
        <button class="primary-btn small" type="button" data-smart-plan-add-today-v85>Add today to To-do</button>
        <button class="soft-btn small" type="button" data-smart-plan-full-v85>Full plan</button>
        <button class="soft-btn small" type="button" data-smart-plan-create-v85>Edit setup</button>
        <button class="tiny-btn danger" type="button" data-smart-plan-reset-v85>Reset</button>
      </div>
    </section>
  `;
}

function renderSmartStudyPlanV85() {
  const learn = $('#screen-learn');
  const hero = learn?.querySelector('.hero-card');
  if (!learn || !hero) return;
  const old = $('#smartStudyPlanCardV85');
  const settings = typeof readHomeWidgetSettingsV80 === 'function' ? readHomeWidgetSettingsV80() : { studyPlan: true };
  const plan = readSmartStudyPlanV85();
  const html = plan ? smartStudyPlanHtmlV85(plan) : smartStudyPlanIntroHtmlV85();
  if (old) {
    old.outerHTML = html;
  } else {
    const widgets = $('#homeSmartWidgetsV79');
    if (widgets) widgets.insertAdjacentHTML('afterend', html);
    else hero.insertAdjacentHTML('afterend', html);
  }
  const card = $('#smartStudyPlanCardV85');
  if (card) card.classList.toggle('home-widget-hidden-v80', settings.studyPlan === false);
  bindSmartStudyPlanCardV85();
  if (typeof applyHomeWidgetSettingsV80 === 'function') applyHomeWidgetSettingsV80();
}

function bindSmartStudyPlanCardV85() {
  const card = $('#smartStudyPlanCardV85');
  if (!card) return;
  card.addEventListener('click', event => {
    const create = event.target.closest('[data-smart-plan-create-v85]');
    const autoBuild = event.target.closest('[data-smart-plan-autobuild-v85]');
    const reset = event.target.closest('[data-smart-plan-reset-v85]');
    const full = event.target.closest('[data-smart-plan-full-v85]');
    const addToday = event.target.closest('[data-smart-plan-add-today-v85]');
    const action = event.target.closest('[data-smart-plan-action-v85]');

    if (create) { openSmartStudyPlanModalV85(); return; }
    if (autoBuild) {
      const profile = { ...studyPlanDefaultProfileV85(), planDays: 7, weakSystems: studyPlanBestSystemsV85(3).map(x => x.key) };
      const plan = generateSmartStudyPlanV85(profile);
      writeSmartStudyPlanV85(plan);
      renderSmartStudyPlanV85();
      showToast('7-day smart plan created');
      return;
    }
    if (reset) {
      if (confirm('Reset the current Smart Study Plan?')) {
        writeSmartStudyPlanV85(null);
        renderSmartStudyPlanV85();
        showToast('Study plan reset');
      }
      return;
    }
    if (full) { openFullSmartStudyPlanV85(); return; }
    if (addToday) { addSmartStudyTodayToTodoV85(); return; }
    if (action) {
      const taskId = studyPlanReadDataV85(action.dataset.smartPlanActionV85);
      const task = findSmartStudyTaskV85(taskId);
      openSmartStudyTaskV85(task);
    }
  });

  card.addEventListener('change', event => {
    const toggle = event.target.closest('[data-smart-plan-toggle-v85]');
    if (!toggle) return;
    const taskId = studyPlanReadDataV85(toggle.dataset.smartPlanToggleV85);
    updateSmartStudyTaskV85(taskId, { done: toggle.checked });
    renderSmartStudyPlanV85();
    showToast(toggle.checked ? 'Task completed ✅' : 'Task reopened');
  });
}

function findSmartStudyTaskV85(taskId) {
  const plan = readSmartStudyPlanV85();
  return (plan?.days || []).flatMap(day => day.tasks || []).find(task => task.id === taskId) || null;
}

function updateSmartStudyTaskV85(taskId, patch = {}) {
  const plan = readSmartStudyPlanV85();
  if (!plan) return;
  (plan.days || []).forEach(day => {
    (day.tasks || []).forEach(task => {
      if (task.id === taskId) Object.assign(task, patch, { updatedAt: new Date().toISOString() });
    });
  });
  writeSmartStudyPlanV85(plan);
}

function openSmartStudyTaskV85(task) {
  if (!task) {
    showToast('Task not found');
    return;
  }
  if (task.type === 'video') {
    if (task.videoId && typeof openVideo === 'function') openVideo(task.videoId);
    else if (typeof navigate === 'function') navigate('videos');
    return;
  }
  if (task.type === 'mcq') {
    if (typeof startQuickExamFromFilters === 'function') {
      startQuickExamFromFilters({ course: task.course, topic: task.topic, count: task.count || 10, minutes: Math.max(10, Math.ceil((task.count || 10) * 1.5)) });
    } else if (typeof navigate === 'function') {
      state.selectedQMode = 'detailed';
      state.selectedQCourse = task.course;
      state.selectedQTopic = task.topic;
      state.qbankLevel = 'set';
      saveState?.(); renderQbank?.(); navigate('qbank');
    }
    return;
  }
  if (task.type === 'flashcards') {
    if (typeof navigate === 'function') navigate('profile');
    if (typeof showAdminTab === 'function') showAdminTab('flashcards');
    if (typeof renderFlashcards === 'function') renderFlashcards(task.topic);
    showToast('Opened Flashcards');
    return;
  }
  if (task.type === 'mistakes') {
    if (typeof navigate === 'function') navigate('profile');
    if (typeof showAdminTab === 'function') showAdminTab('mistakes');
    if (typeof renderMistakes === 'function') renderMistakes();
    showToast('Opened Smart Review');
    return;
  }
  if (typeof navigate === 'function') navigate('learn');
}

function smartStudyTodoTargetV85(task) {
  if (task.type === 'video') return { type: 'video', videoId: task.videoId, mode: 'detailed', course: task.course, topic: task.topic, label: 'Open lecture', doneLabel: 'Self-test' };
  if (task.type === 'mcq') return { type: 'qbank', mode: 'detailed', course: task.course, topic: task.topic, label: 'Open QBank', doneLabel: 'Self-test' };
  return null;
}

function addSmartStudyTodayToTodoV85(dayIndex = null) {
  const plan = readSmartStudyPlanV85();
  if (!plan) return;
  const idx = dayIndex === null ? studyPlanTodayIndexV85(plan) : Number(dayIndex || 0);
  const day = plan.days[idx];
  if (!day) return;
  state.dailyTodo = typeof normalizeDailyTodo === 'function' ? normalizeDailyTodo(state.dailyTodo) : (state.dailyTodo || { items: [] });
  const existing = new Set((state.dailyTodo.items || []).map(item => String(item.text || '').toLowerCase()));
  const newItems = (day.tasks || []).map((task, index) => {
    const text = `Plan: ${task.title}`.slice(0, 80);
    if (existing.has(text.toLowerCase())) return null;
    return { id: Date.now() + index, text, done: false, createdAt: new Date().toISOString(), target: smartStudyTodoTargetV85(task) };
  }).filter(Boolean);
  if (!newItems.length) {
    showToast('Today plan is already in To-do');
    return;
  }
  state.dailyTodo.items = [...newItems, ...(state.dailyTodo.items || [])].slice(0, 40);
  if (typeof saveState === 'function') saveState();
  if (typeof renderDailyTodo === 'function') renderDailyTodo();
  showToast(`${newItems.length} plan tasks added to To-do`);
}

function smartStudySystemCheckboxesV85(selectedKeys = []) {
  const selected = new Set(selectedKeys || []);
  const options = studyPlanSystemOptionsV85().slice(0, 24);
  return options.map(opt => {
    const checked = selected.has(opt.key);
    const stats = opt.stats || studyPlanStatsForV85(opt.course, opt.topic);
    return `
      <label class="smart-plan-system-chip-v85 ${checked ? 'checked' : ''}">
        <input type="checkbox" name="weakSystems" value="${studyPlanEscV85(studyPlanDataV85(opt.key))}" ${checked ? 'checked' : ''} />
        <span>
          <b>${studyPlanEscV85(opt.topic)}</b>
          <small>${studyPlanEscV85(studyPlanCourseTitleV85(opt.course))} • ${stats.questionCount} MCQ • ${stats.videoCount} videos${stats.mistakeCount ? ` • ${stats.mistakeCount} mistakes` : ''}</small>
        </span>
      </label>
    `;
  }).join('') || '<div class="empty-note">No systems detected yet. Add videos or MCQs first.</div>';
}

function openSmartStudyPlanModalV85() {
  const current = readSmartStudyPlanV85();
  const profile = { ...studyPlanDefaultProfileV85(), ...(current?.profile || {}) };
  showModal(`
    <h2 id="modalTitle">Create Smart Study Plan</h2>
    <p class="modal-muted">The plan is built from videos, QBank, mistakes, and flashcards, then saved to your Supabase account.</p>
    <form id="smartStudyPlanFormV85" class="smart-plan-form-v85">
      <div class="smart-plan-form-grid-v85">
        <label class="field-label"><span>Stage</span>
          <select name="stage">
            <option value="third" ${profile.stage === 'third' ? 'selected' : ''}>Third stage</option>
            <option value="fourth" ${profile.stage === 'fourth' ? 'selected' : ''}>Fourth stage</option>
            <option value="fifth" ${profile.stage === 'fifth' ? 'selected' : ''}>Fifth stage</option>
            <option value="sixth" ${profile.stage === 'sixth' ? 'selected' : ''}>Sixth stage / final</option>
            <option value="board" ${profile.stage === 'board' ? 'selected' : ''}>Board / intensive review</option>
          </select>
        </label>
        <label class="field-label"><span>Daily time</span><input name="dailyMinutes" type="number" min="30" max="480" step="15" value="${studyPlanEscV85(profile.dailyMinutes || 120)}" /></label>
        <label class="field-label"><span>Exam date</span><input name="examDate" type="date" value="${studyPlanEscV85(profile.examDate || studyPlanDefaultExamDateV85(30))}" /></label>
        <label class="field-label"><span>Plan length</span>
          <select name="planDays">
            <option value="7" ${Number(profile.planDays) === 7 ? 'selected' : ''}>7 days</option>
            <option value="14" ${Number(profile.planDays) === 14 ? 'selected' : ''}>14 days</option>
            <option value="30" ${Number(profile.planDays) === 30 ? 'selected' : ''}>30 days</option>
          </select>
        </label>
      </div>
      <div class="smart-plan-systems-head-v85">
        <div><b>Weak systems</b><small>Choose weak systems manually, or leave it blank so the app can choose based on mistakes and progress.</small></div>
        <button class="tiny-btn" type="button" id="smartPlanAutoWeakV85">Auto-select weakness</button>
      </div>
      <div class="smart-plan-system-grid-v85" id="smartPlanSystemGridV85">
        ${smartStudySystemCheckboxesV85(profile.weakSystems || [])}
      </div>
      <div class="modal-button-row smart-plan-modal-actions-v85">
        <button class="primary-btn" type="submit">Generate plan</button>
        <button class="soft-btn" type="button" id="smartStudyCancelV85">Cancel</button>
      </div>
    </form>
  `);

  setTimeout(() => {
    $('#smartStudyCancelV85')?.addEventListener('click', closeModal);
    $('#smartPlanAutoWeakV85')?.addEventListener('click', () => {
      const auto = new Set(studyPlanBestSystemsV85(4).map(item => item.key));
      $$('#smartPlanSystemGridV85 input[name="weakSystems"]').forEach(input => {
        const key = studyPlanReadDataV85(input.value);
        input.checked = auto.has(key);
        input.closest('.smart-plan-system-chip-v85')?.classList.toggle('checked', input.checked);
      });
      showToast('Weak systems selected from your data');
    });
    $$('#smartPlanSystemGridV85 input[name="weakSystems"]').forEach(input => {
      input.addEventListener('change', () => input.closest('.smart-plan-system-chip-v85')?.classList.toggle('checked', input.checked));
    });
    $('#smartStudyPlanFormV85')?.addEventListener('submit', event => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const weakSystems = $$('#smartPlanSystemGridV85 input[name="weakSystems"]:checked').map(input => studyPlanReadDataV85(input.value));
      const nextProfile = {
        stage: String(form.get('stage') || 'sixth'),
        dailyMinutes: Number(form.get('dailyMinutes') || 120),
        examDate: String(form.get('examDate') || studyPlanDefaultExamDateV85(30)),
        planDays: Number(form.get('planDays') || 14),
        weakSystems
      };
      const plan = generateSmartStudyPlanV85(nextProfile);
      writeSmartStudyPlanV85(plan);
      closeModal();
      renderSmartStudyPlanV85();
      showToast('Smart Study Plan generated');
    });
  }, 0);
}

function openFullSmartStudyPlanV85() {
  const plan = readSmartStudyPlanV85();
  if (!plan) { openSmartStudyPlanModalV85(); return; }
  const progress = studyPlanProgressV85(plan);
  showModal(`
    <h2 id="modalTitle">Full Smart Plan</h2>
    <p class="modal-muted">${progress.done}/${progress.total} tasks completed • ${studyPlanEscV85(plan.phase)} strategy • exam ${studyPlanEscV85(plan.examDate)}</p>
    <div class="smart-plan-full-list-v85">
      ${(plan.days || []).map((day, dayIndex) => `
        <details class="smart-plan-day-v85" ${dayIndex === studyPlanTodayIndexV85(plan) ? 'open' : ''}>
          <summary>
            <span><b>${studyPlanEscV85(day.title)} — ${studyPlanEscV85(day.system?.topic)}</b><small>${studyPlanEscV85(day.date)} • ${studyPlanMinutesLabelV85(day.minutes)}</small></span>
            <button class="tiny-btn" type="button" data-smart-plan-add-day-v85="${dayIndex}">Add to To-do</button>
          </summary>
          <div>${(day.tasks || []).map(smartStudyTaskHtmlV85).join('')}</div>
        </details>
      `).join('')}
    </div>
  `);
  setTimeout(() => {
    $$('[data-smart-plan-add-day-v85]').forEach(btn => btn.addEventListener('click', event => {
      event.preventDefault(); event.stopPropagation();
      addSmartStudyTodayToTodoV85(Number(btn.dataset.smartPlanAddDayV85 || 0));
    }));
    $$('[data-smart-plan-toggle-v85]').forEach(input => input.addEventListener('change', () => {
      updateSmartStudyTaskV85(studyPlanReadDataV85(input.dataset.smartPlanToggleV85), { done: input.checked });
      renderSmartStudyPlanV85();
    }));
    $$('[data-smart-plan-action-v85]').forEach(btn => btn.addEventListener('click', () => openSmartStudyTaskV85(findSmartStudyTaskV85(studyPlanReadDataV85(btn.dataset.smartPlanActionV85)))));
  }, 0);
}

function initSmartStudyPlanV85() {
  renderSmartStudyPlanV85();
}

document.addEventListener('DOMContentLoaded', () => setTimeout(initSmartStudyPlanV85, 520));
