/* NovaMed v83 - Cross-app UI features: search, bookmarks, daily question, admin dashboard, and Home widgets. */
function emptyFeatureStoreV79() {
  return { videoBookmarks:{}, questionBookmarks:{}, videoNotes:{}, videoViews:{}, lastVideo:null, dailyQuestion:{}, searchHistory:[] };
}

function normalizeFeatureStoreV79(raw = {}) {
  const base = emptyFeatureStoreV79();
  return {
    ...base,
    ...(raw && typeof raw === 'object' ? raw : {}),
    videoBookmarks: raw?.videoBookmarks && typeof raw.videoBookmarks === 'object' ? raw.videoBookmarks : {},
    questionBookmarks: raw?.questionBookmarks && typeof raw.questionBookmarks === 'object' ? raw.questionBookmarks : {},
    videoNotes: raw?.videoNotes && typeof raw.videoNotes === 'object' ? raw.videoNotes : {},
    videoViews: raw?.videoViews && typeof raw.videoViews === 'object' ? raw.videoViews : {},
    lastVideo: raw?.lastVideo || null,
    dailyQuestion: raw?.dailyQuestion && typeof raw.dailyQuestion === 'object' ? raw.dailyQuestion : {},
    searchHistory: Array.isArray(raw?.searchHistory) ? raw.searchHistory : []
  };
}

function readFeatureStoreV79() {
  if (typeof isStudent === 'function' && isStudent()) {
    window.__novamedFeatureStoreCache = normalizeFeatureStoreV79(window.__novamedFeatureStoreCache || {});
    return window.__novamedFeatureStoreCache;
  }
  try {
    const raw = JSON.parse(localStorage.getItem(NOVAMED_FEATURES_KEY_V79) || '{}');
    return normalizeFeatureStoreV79(raw);
  } catch {
    return emptyFeatureStoreV79();
  }
}

function writeFeatureStoreV79(store) {
  const safe = normalizeFeatureStoreV79(store || readFeatureStoreV79());
  if (typeof isStudent === 'function' && isStudent()) {
    window.__novamedFeatureStoreCache = safe;
    try { localStorage.removeItem(NOVAMED_FEATURES_KEY_V79); } catch {}
    return;
  }
  localStorage.setItem(NOVAMED_FEATURES_KEY_V79, JSON.stringify(safe));
}

function featureKeyV79(value) {
  return String(value || '').trim();
}

function videoByIdV79(id) {
  return (state.videos || []).find(v => String(v.id) === String(id)) || null;
}

function questionByIdV79(id) {
  const qid = String(id || '');
  return (state.questions || []).map(normalizeQuestion).find(q => String(q.id) === qid || questionProgressKey(q) === qid) || null;
}

function bookmarkVideoV79(video) {
  const store = readFeatureStoreV79();
  const id = featureKeyV79(video?.id);
  if (!id) return false;
  if (store.videoBookmarks[id]) delete store.videoBookmarks[id];
  else store.videoBookmarks[id] = {
    id,
    title: video.title,
    course: video.course,
    topic: video.topic,
    duration: video.duration,
    at: new Date().toISOString()
  };
  const active = Boolean(store.videoBookmarks[id]);
  writeFeatureStoreV79(store);
  if (typeof saveBookmarkToSupabase === 'function') {
    saveBookmarkToSupabase('video', id, store.videoBookmarks[id] || { id }, { active }).catch?.(() => {});
  }
  renderBookmarksPanel();
  renderHomeSmartWidgetsV79();
  window.queueNovaMedCloudUiRefreshV143?.('bookmark-local-change', { delay: 40 });
  return active;
}

function bookmarkQuestionV79(question) {
  const q = normalizeQuestion(question);
  const id = questionProgressKey(q);
  if (!id) return false;
  const store = readFeatureStoreV79();
  if (store.questionBookmarks[id]) delete store.questionBookmarks[id];
  else store.questionBookmarks[id] = {
    id,
    stem: q.stem,
    course: q.course,
    topic: q.topic,
    subtopic: q.subtopic,
    correct: q.correct,
    answer: q.options?.[q.correct] || '',
    takeaway: q.takeaway,
    at: new Date().toISOString()
  };
  const active = Boolean(store.questionBookmarks[id]);
  writeFeatureStoreV79(store);
  if (typeof saveBookmarkToSupabase === 'function') {
    saveBookmarkToSupabase('question', id, store.questionBookmarks[id] || { id }, { active }).catch?.(() => {});
  }
  renderBookmarksPanel();
  window.queueNovaMedCloudUiRefreshV143?.('question-bookmark-local-change', { delay: 40 });
  return active;
}

function isVideoBookmarkedV79(id) {
  return Boolean(readFeatureStoreV79().videoBookmarks[featureKeyV79(id)]);
}

function isQuestionBookmarkedV79(question) {
  return Boolean(readFeatureStoreV79().questionBookmarks[questionProgressKey(normalizeQuestion(question))]);
}

function recordVideoViewV79(video, player = null) {
  if (!video) return;
  const store = readFeatureStoreV79();
  const id = featureKeyV79(video.id);
  const currentTime = player ? Math.max(0, Math.floor(Number(player.currentTime || 0))) : Number(store.lastVideo?.time || 0);
  const duration = player ? Math.max(0, Math.floor(Number(player.duration || 0))) : Number(store.lastVideo?.durationSeconds || 0);
  const previous = store.videoViews[id] || {};
  store.videoViews[id] = {
    id,
    title: video.title,
    course: video.course,
    topic: video.topic,
    views: Number(previous.views || 0) + 1,
    seconds: Math.max(Number(previous.seconds || 0), currentTime || 0),
    lastAt: new Date().toISOString()
  };
  store.lastVideo = {
    id,
    title: video.title,
    course: video.course,
    topic: video.topic,
    time: currentTime,
    durationSeconds: duration,
    updatedAt: new Date().toISOString()
  };
  writeFeatureStoreV79(store);
  if (typeof saveVideoProgressToSupabase === 'function') {
    saveVideoProgressToSupabase(video, {
      currentTime,
      duration,
      percent: duration ? clampPercent((currentTime / duration) * 100) : Number(getVideoProgress?.(video)?.percent || 0),
      completed: Boolean(getVideoProgress?.(video)?.completed)
    }).catch?.(() => {});
  }
  renderHomeSmartWidgetsV79();
}

function updateLastVideoTimeV79(video, player = null) {
  if (!video || !player) return;
  const store = readFeatureStoreV79();
  store.lastVideo = {
    id: featureKeyV79(video.id),
    title: video.title,
    course: video.course,
    topic: video.topic,
    time: Math.max(0, Math.floor(Number(player.currentTime || 0))),
    durationSeconds: Math.max(0, Math.floor(Number(player.duration || 0))),
    updatedAt: new Date().toISOString()
  };
  const view = store.videoViews[featureKeyV79(video.id)] || { id: featureKeyV79(video.id), title: video.title, course: video.course, topic: video.topic, views: 0 };
  view.seconds = Math.max(Number(view.seconds || 0), store.lastVideo.time);
  view.lastAt = new Date().toISOString();
  store.videoViews[featureKeyV79(video.id)] = view;
  writeFeatureStoreV79(store);
  if (typeof saveVideoProgressToSupabase === 'function') {
    saveVideoProgressToSupabase(video, {
      currentTime: store.lastVideo.time,
      duration: store.lastVideo.durationSeconds,
      percent: store.lastVideo.durationSeconds ? clampPercent((store.lastVideo.time / store.lastVideo.durationSeconds) * 100) : Number(getVideoProgress?.(video)?.percent || 0),
      completed: Boolean(getVideoProgress?.(video)?.completed)
    }).catch?.(() => {});
  }
}

function formatVideoNoteTimeV79(seconds = 0) {
  return formatClock ? formatClock(seconds) : formatQuestionTime(seconds);
}

function noteListForVideoV79(videoId) {
  return readFeatureStoreV79().videoNotes[featureKeyV79(videoId)] || [];
}

function addVideoNoteV79(video, seconds, text) {
  const store = readFeatureStoreV79();
  const id = featureKeyV79(video?.id);
  if (!id || !String(text || '').trim()) return;
  const note = {
    id: `note-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`,
    videoId: id,
    videoTitle: video.title,
    course: video.course,
    topic: video.topic,
    time: Math.max(0, Math.floor(Number(seconds || 0))),
    text: String(text || '').trim(),
    at: new Date().toISOString()
  };
  store.videoNotes[id] = [note, ...(store.videoNotes[id] || [])].slice(0, 100);
  writeFeatureStoreV79(store);
  if (typeof saveVideoNoteToSupabase === 'function') {
    saveVideoNoteToSupabase(video, note).catch?.(() => {});
  }
  if (typeof saveVideoProgressToSupabase === 'function') {
    saveVideoProgressToSupabase(video, getVideoProgress?.(video) || {}).catch?.(() => {});
  }
  renderVideoNotesV79(video);
  renderHomeSmartWidgetsV79();
}

function deleteVideoNoteV79(video, noteId) {
  const store = readFeatureStoreV79();
  const id = featureKeyV79(video?.id);
  store.videoNotes[id] = (store.videoNotes[id] || []).filter(note => note.id !== noteId && note.cloudId !== noteId);
  writeFeatureStoreV79(store);
  if (typeof deleteVideoNoteFromSupabase === 'function') {
    deleteVideoNoteFromSupabase(video, noteId).catch?.(() => {});
  }
  if (typeof saveVideoProgressToSupabase === 'function') {
    saveVideoProgressToSupabase(video, getVideoProgress?.(video) || {}).catch?.(() => {});
  }
  renderVideoNotesV79(video);
}

function renderVideoNotesV79(video) {
  const box = $('#videoNotesListV79');
  if (!box || !video) return;
  const notes = noteListForVideoV79(video.id);
  box.innerHTML = notes.length ? notes.map(note => `
    <article class="video-time-note">
      <button class="note-time-pill" type="button" data-jump-video-note="${note.time}">${formatVideoNoteTimeV79(note.time)}</button>
      <p>${esc(note.text)}</p>
      <button class="tiny-btn danger" type="button" data-delete-video-note="${esc(note.id)}">Delete</button>
    </article>
  `).join('') : `<div class="resource-empty-note">No timestamp notes yet. Play the lecture and save a note at the current time.</div>`;

  $$('[data-jump-video-note]').forEach(btn => btn.addEventListener('click', () => {
    const player = $('#novaLessonPlayer');
    if (player) {
      player.currentTime = Number(btn.dataset.jumpVideoNote || 0);
      player.play?.().catch?.(() => {});
    } else {
      showToast('Timestamp jump works for uploaded/direct videos');
    }
  }));

  $$('[data-delete-video-note]').forEach(btn => btn.addEventListener('click', () => deleteVideoNoteV79(video, btn.dataset.deleteVideoNote)));
}

function generatedLectureSheetTextV79(video) {
  const mode = getMode(video.mode);
  const course = getCourse(video.mode, video.course);
  const notes = noteListForVideoV79(video.id);
  return [
    `NovaMed High-Yield Sheet`,
    `Lecture: ${video.title}`,
    `Path: ${mode?.title || video.mode} • ${course?.title || video.course} • ${video.topic}`,
    `Duration: ${video.duration || 'N/A'}`,
    ``,
    `Summary:`,
    video.description || 'Review this lecture and extract the core clinical pattern.',
    ``,
    `High-yield points:`,
    videoHighYieldText(video) || video.quickNotes || '1. Rewatch the difficult parts.\n2. Convert weak points into MCQs.\n3. Add timestamp notes while studying.',
    ``,
    `Your timestamp notes:`,
    notes.length ? notes.map(n => `- ${formatVideoNoteTimeV79(n.time)} — ${n.text}`).join('\n') : '- No notes yet.',
    ``,
    `Generated by NovaMed`
  ].join('\n');
}

function downloadHighYieldSheetV79(videoId) {
  const video = videoByIdV79(videoId);
  if (!video) return;
  const text = generatedLectureSheetTextV79(video);
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${String(video.title || 'lecture').replace(/[^\w\u0600-\u06FF-]+/g, '_')}_high_yield_sheet.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 500);
  showToast('High-yield sheet downloaded');
}

function dailyQuestionV79() {
  const pool = normalMcqPool?.() || (state.questions || []);
  if (!pool.length) return null;
  const today = new Date().toISOString().slice(0, 10);
  let hash = 0;
  for (let i = 0; i < today.length; i++) hash = (hash * 31 + today.charCodeAt(i)) >>> 0;
  return normalizeQuestion(pool[hash % pool.length]);
}

function renderHomeSmartWidgetsV79() {
  const learn = $('#screen-learn');
  const hero = learn?.querySelector('.hero-card');
  if (!learn || !hero) return;
  let wrap = $('#homeSmartWidgetsV79');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.id = 'homeSmartWidgetsV79';
    wrap.className = 'home-smart-widgets-v79';
    hero.insertAdjacentElement('afterend', wrap);
  }
  const store = readFeatureStoreV79();
  const last = store.lastVideo ? videoByIdV79(store.lastVideo.id) : null;
  const q = dailyQuestionV79();
  wrap.innerHTML = `
    <section class="continue-card-v79 premium-card clean-home-widget-v111">
      <div class="clean-home-card-head-v111">
        <div>
          <div class="home-title-help-v115">
            <span class="eyebrow">Study progress</span>
            <button class="home-help-btn-v111" type="button" data-home-help-v111="continue" aria-label="Continue help">?</button>
          </div>
          <h2>Continue where you left off</h2>
          ${last ? `<p class="home-widget-subline-v113">${esc(last.title)}</p>` : ''}
        </div>
      </div>
      <div class="continue-main-v79">
        <div></div>
        ${last ? `<button class="primary-btn small" type="button" data-continue-video-v79="${esc(last.id)}">Continue</button>` : `<button class="soft-btn small" type="button" data-nav-to-videos-v79>Open videos</button>`}
      </div>
    </section>

    <section class="daily-question-v79 premium-card clean-home-widget-v111">
      <div class="daily-question-head-v79 clean-home-card-head-v111">
        <div>
          <div class="home-title-help-v115">
            <span class="eyebrow">Quick MCQ</span>
            <button class="home-help-btn-v111" type="button" data-home-help-v111="dailyQuestion" aria-label="Daily MCQ help">?</button>
          </div>
          <h2>Daily MCQ</h2>
        </div>
        <div class="home-card-actions-v111">
          ${q ? `<button class="tiny-btn" type="button" data-bookmark-question-v79="${esc(questionProgressKey(q))}">${isQuestionBookmarkedV79(q) ? 'Saved' : 'Bookmark'}</button>` : ''}
        </div>
      </div>
      ${q ? `
        <p class="daily-stem-v79">${esc(q.stem)}</p>
        <div class="daily-answer-grid-v79">
          ${q.options.map((option, i) => `<button type="button" class="daily-answer-v79" data-daily-answer-v79="${i}"><b>${String.fromCharCode(65+i)}.</b> ${esc(option)}</button>`).join('')}
        </div>
        <div class="daily-explain-v79" id="dailyExplainV79" hidden>
          <b>Answer: ${optionLabel(q.correct)}. ${esc(q.options[q.correct])}</b>
          <p>${esc(q.takeaway || q.explanation)}</p>
        </div>
      ` : '<p class="home-widget-subline-v113">No MCQs available yet.</p>'}
    </section>
  `;

  $('[data-continue-video-v79]')?.addEventListener('click', event => openVideo(Number(event.currentTarget.dataset.continueVideoV79)));
  $('[data-nav-to-videos-v79]')?.addEventListener('click', () => {
    const nav = $('[data-nav="videos"]');
    nav?.click();
  });
  $$('[data-daily-answer-v79]').forEach(btn => btn.addEventListener('click', () => {
    const selected = Number(btn.dataset.dailyAnswerV79);
    const correct = selected === Number(q.correct);
    $$('.daily-answer-v79').forEach(b => {
      b.disabled = true;
      const idx = Number(b.dataset.dailyAnswerV79);
      if (idx === q.correct) b.classList.add('correct');
      if (idx === selected && !correct) b.classList.add('wrong');
    });
    $('#dailyExplainV79')?.removeAttribute('hidden');
    recordQbankAttempt(q, selected, { source: 'daily-question' });
    if (!correct) recordMistake(q, selected);
    saveState(); updateMiniStats(); renderAnalytics(); renderMistakes(); renderFlashcards();
    showToast(correct ? 'Daily question correct' : 'Saved to Smart Review');
  }));
  $('[data-bookmark-question-v79]')?.addEventListener('click', () => {
    bookmarkQuestionV79(q);
    renderHomeSmartWidgetsV79();
    showToast(isQuestionBookmarkedV79(q) ? 'Question bookmarked' : 'Bookmark removed');
  });
}

function globalSearchItemsV79(query = '') {
  const q = String(query || '').trim().toLowerCase();
  const store = readFeatureStoreV79();
  const items = [];
  (state.videos || []).forEach(video => {
    const hay = [video.title, video.description, video.course, video.topic].join(' ').toLowerCase();
    if (!q || hay.includes(q)) items.push({ type:'video', id: video.id, title: video.title, subtitle: `${video.course} • ${video.topic}`, body: video.description || '', action: 'Open lecture' });
  });
  (state.questions || []).map(normalizeQuestion).forEach(question => {
    const hay = [question.stem, question.course, question.topic, question.subtopic, question.takeaway, ...(question.options || [])].join(' ').toLowerCase();
    if (!q || hay.includes(q)) items.push({ type:'question', id: questionProgressKey(question), title: question.stem, subtitle: `${question.course} • ${question.topic}`, body: question.takeaway || question.explanation || '', action: 'View MCQ' });
  });
  Object.values(store.videoNotes || {}).flat().forEach(note => {
    const hay = [note.text, note.videoTitle, note.course, note.topic].join(' ').toLowerCase();
    if (!q || hay.includes(q)) items.push({ type:'note', id: note.videoId, title: note.text, subtitle: `${note.videoTitle} • ${formatVideoNoteTimeV79(note.time)}`, body: `${note.course || ''} • ${note.topic || ''}`, action: 'Open video note' });
  });
  return items.slice(0, 40);
}

function renderGlobalSearchResultsV79(query = '') {
  const box = $('#globalSearchResultsV79');
  if (!box) return;
  const items = globalSearchItemsV79(query);
  box.innerHTML = items.length ? items.map(item => `
    <button class="global-search-result-v79" type="button" data-search-type-v79="${item.type}" data-search-id-v79="${esc(item.id)}">
      <span>${item.type === 'video' ? '▶' : item.type === 'question' ? '?' : '✎'}</span>
      <div>
        <b>${esc(item.title)}</b>
        <small>${esc(item.subtitle)}</small>
        <p>${esc(item.body)}</p>
      </div>
      <em>${esc(item.action)}</em>
    </button>
  `).join('') : '<div class="resource-empty-note">No results yet. Try a lecture title, system, MCQ clue, or note text.</div>';

  $$('[data-search-type-v79]').forEach(btn => btn.addEventListener('click', () => {
    const type = btn.dataset.searchTypeV79;
    const id = btn.dataset.searchIdV79;
    const query = $('#globalSearchInputV79')?.value || '';
    if (typeof recordSearchHistoryToSupabase === 'function' && String(query).trim().length >= 2) {
      recordSearchHistoryToSupabase('global', query).catch?.(() => {});
    }
    if (type === 'video' || type === 'note') openVideo(Number(id));
    if (type === 'question') openQuestionPreviewV79(id);
  }));
}

function openGlobalSearchModalV79() {
  showModal(`
    <h2 id="modalTitle">Search NovaMed</h2>
    <p class="modal-muted">Search videos, MCQs, bookmarks, and timestamp notes at the same time.</p>
    <div class="global-search-modal-v79">
      <input id="globalSearchInputV79" type="search" placeholder="Search videos, questions, notes..." autofocus />
      <div id="globalSearchResultsV79" class="global-search-results-v79"></div>
    </div>
  `);
  renderGlobalSearchResultsV79('');
  let globalSearchHistoryTimerV138 = null;
  $('#globalSearchInputV79')?.addEventListener('input', event => {
    const value = event.currentTarget.value;
    renderGlobalSearchResultsV79(value);
    clearTimeout(globalSearchHistoryTimerV138);
    if (String(value || '').trim().length >= 2 && typeof recordSearchHistoryToSupabase === 'function') {
      globalSearchHistoryTimerV138 = setTimeout(() => recordSearchHistoryToSupabase('global', value).catch?.(() => {}), 1200);
    }
  });
}

function openQuestionPreviewV79(questionId) {
  const q = questionByIdV79(questionId);
  if (!q) return;
  showModal(`
    <h2 id="modalTitle">Bookmarked MCQ</h2>
    <div class="question-preview-v79">
      <span class="eyebrow">${esc(q.course)} • ${esc(q.topic)}</span>
      <h3>${esc(q.stem)}</h3>
      <div class="answers">
        ${q.options.map((option, i) => `<div class="answer-btn ${i === q.correct ? 'correct' : ''}"><b>${optionLabel(i)}.</b> ${esc(option)}</div>`).join('')}
      </div>
      <div class="explanation show"><h3>Takeaway</h3><p>${esc(q.takeaway || q.explanation)}</p></div>
      <button class="primary-btn small" id="bookmarkPreviewQuestionV79" type="button">${isQuestionBookmarkedV79(q) ? 'Remove bookmark' : 'Bookmark question'}</button>
    </div>
  `);
  $('#bookmarkPreviewQuestionV79')?.addEventListener('click', () => {
    const active = bookmarkQuestionV79(q);
    showToast(active ? 'Question bookmarked' : 'Bookmark removed');
    openQuestionPreviewV79(questionId);
  });
}

function renderBookmarksPanel() {
  const panel = $('#bookmarksPanel');
  if (!panel) return;
  const store = readFeatureStoreV79();
  const videos = Object.values(store.videoBookmarks || {});
  const questions = Object.values(store.questionBookmarks || {});
  panel.innerHTML = `
    <div class="smart-panel-head-v79">
      <div><span class="eyebrow">Saved library</span><h2>Bookmarks</h2><p>Saved lectures and high-yield MCQs appear here.</p></div>
      <div class="smart-mini-stat"><b>${videos.length + questions.length}</b><span>saved</span></div>
    </div>
    <div class="bookmark-columns-v79">
      <section><h3>Lectures</h3>${videos.length ? videos.map(v => `<button class="bookmark-row-v79" type="button" data-bookmark-video-open-v79="${esc(v.id)}"><b>${esc(v.title)}</b><small>${esc(v.course)} • ${esc(v.topic)}</small></button>`).join('') : '<p class="muted-small">No lecture bookmarks yet.</p>'}</section>
      <section><h3>Questions</h3>${questions.length ? questions.map(q => `<button class="bookmark-row-v79" type="button" data-bookmark-question-open-v79="${esc(q.id)}"><b>${esc(q.stem)}</b><small>${esc(q.course)} • ${esc(q.topic)}</small></button>`).join('') : '<p class="muted-small">No question bookmarks yet.</p>'}</section>
    </div>
  `;
  if (panel.dataset.bookmarkDelegatedV143 !== '1') {
    panel.dataset.bookmarkDelegatedV143 = '1';
    panel.addEventListener('click', event => {
      const videoBtn = event.target.closest('[data-bookmark-video-open-v79]');
      if (videoBtn) { openVideo(Number(videoBtn.dataset.bookmarkVideoOpenV79)); return; }
      const questionBtn = event.target.closest('[data-bookmark-question-open-v79]');
      if (questionBtn) openQuestionPreviewV79(questionBtn.dataset.bookmarkQuestionOpenV79);
    });
  }
}

function studentCountV79() {
  // v139: do not read legacy local student accounts. Real students come from student_public.
  if (Array.isArray(window.__novamedRealLeaderboardRowsCache)) return window.__novamedRealLeaderboardRowsCache.length;
  return 0;
}

function renderAdminDashboardV79() {
  const panel = $('#adminDashboardPanel');
  if (!panel) return;
  const store = readFeatureStoreV79();
  const videoRows = Object.values(store.videoViews || {}).sort((a,b) => Number(b.views||0)-Number(a.views||0)).slice(0,5);
  const wrongRows = Object.values(state.qbankStats || {}).sort((a,b) => Number(b.wrong||0)-Number(a.wrong||0)).slice(0,5);
  const attempts = (state.qbankAttempts || []).length;
  panel.innerHTML = `
    <div class="smart-panel-head-v79">
      <div><span class="eyebrow">Admin dashboard</span><h2>Platform overview</h2><p>Local dashboard based on student accounts, lecture views, and QBank attempts.</p></div>
    </div>
    <div class="admin-metric-grid-v79">
      <article><b>${studentCountV79()}</b><span>Students</span></article>
      <article><b>${Object.keys(store.videoViews || {}).length}</b><span>Lectures watched</span></article>
      <article><b>${attempts}</b><span>MCQ attempts</span></article>
      <article><b>${Object.values(state.qbankStats || {}).reduce((sum,x)=>sum+Number(x.wrong||0),0)}</b><span>Wrong answers</span></article>
    </div>
    <div class="admin-dashboard-columns-v79">
      <section><h3>Most watched lectures</h3>${videoRows.length ? videoRows.map(v => `<div class="admin-row-v79"><b>${esc(v.title)}</b><small>${Number(v.views||0)} views • ${esc(v.course || '')} • ${esc(v.topic || '')}</small></div>`).join('') : '<p class="muted-small">No lecture views yet.</p>'}</section>
      <section><h3>Most wrong MCQs</h3>${wrongRows.length ? wrongRows.map(q => `<div class="admin-row-v79"><b>${esc(q.stem)}</b><small>${Number(q.wrong||0)} wrong • ${esc(q.course || '')} • ${esc(q.topic || '')}</small></div>`).join('') : '<p class="muted-small">No wrong answers yet.</p>'}</section>
    </div>
  `;
}

function profileWorkspaceTitleV109(id) {
  return ({
    mistakes: 'My Mistakes',
    analytics: 'Analytics',
    flashcards: 'Flashcards',
    bookmarks: 'Bookmarks',
    adminDashboard: 'Admin dashboard'
  })[id] || 'Profile workspace';
}

function ensureProfileWorkspaceChromeV109() {
  const panel = $('#adminPanel');
  if (!panel || panel.dataset.workspaceChromeV109 === '1') return;
  panel.dataset.workspaceChromeV109 = '1';
  const chrome = document.createElement('div');
  chrome.className = 'profile-workspace-chrome-v109';
  chrome.innerHTML = `
    <div>
      <span class="eyebrow">Profile workspace</span>
      <h2 id="profileWorkspaceTitleV109">My Mistakes</h2>
    </div>
    <button class="close-btn profile-workspace-close-v109" type="button" aria-label="Close workspace">×</button>
  `;
  panel.prepend(chrome);
  chrome.querySelector('.profile-workspace-close-v109')?.addEventListener('click', closeProfileWorkspaceV109);
}

function openProfileWorkspaceV109(id) {
  const panel = $('#adminPanel');
  if (!panel) return;
  ensureProfileWorkspaceChromeV109();
  panel.classList.add('profile-workspace-open-v109');
  document.body.classList.add('profile-workspace-active-v109');
  const title = $('#profileWorkspaceTitleV109');
  if (title) title.textContent = profileWorkspaceTitleV109(id);
  panel.scrollTo?.({ top: 0, behavior: 'instant' });
}

function closeProfileWorkspaceV109() {
  $('#adminPanel')?.classList.remove('profile-workspace-open-v109');
  document.body.classList.remove('profile-workspace-active-v109');
}

function showAdminTab(id) {
  $$('.admin-tab').forEach(tab => tab.classList.toggle('active', tab.id === id));
  ensureStudyFeatureState?.();
  if (id === 'mistakes') renderMistakes?.();
  if (id === 'analytics') renderAnalytics?.();
  if (id === 'flashcards') renderFlashcards?.();
  if (id === 'bookmarks') renderBookmarksPanel?.();
  if (id === 'adminDashboard') renderAdminDashboardV79?.();
  openProfileWorkspaceV109(id);
}

function legacyUiOpenVideoV79(id) {
  const video = state.videos.find(v => String(v.id) === String(id));
  if (!video) return;
  const mode = getMode(video.mode);
  const course = getCourse(video.mode, video.course);
  recordVideoViewV79(video);
  showModal(`
    <div class="video-modal-head-v79">
      <div><h2 id="modalTitle">${esc(video.title)}</h2><p>${esc(video.description)}</p></div>
      <button class="soft-btn small" id="bookmarkVideoV79" type="button">${isVideoBookmarkedV79(video.id) ? 'Bookmarked' : 'Bookmark'}</button>
    </div>
    ${renderNovaVideoPlayer(video)}
    <div class="meta-row" style="margin-bottom:14px">
      <span class="tag">${esc(mode?.title || video.mode)}</span>
      <span class="tag">${esc(course?.title || video.course)}</span>
      <span class="tag">${esc(video.topic)}</span>
      <span class="tag">${esc(video.duration)}</span>
    </div>
    <div class="video-feature-actions-v79">
      ${renderVideoResourceButtons(video)}
      <button class="soft-btn small" type="button" data-download-hy-sheet-v79="${esc(video.id)}">Download High-yield sheet</button>
    </div>
    <section class="video-notes-card-v79 premium-card">
      <div class="video-notes-head-v79">
        <div><span class="eyebrow">Timestamp notes</span><h3>Notes inside the video</h3></div>
        <button class="primary-btn small" id="saveVideoNoteV79" type="button">Save current time note</button>
      </div>
      <textarea id="videoNoteTextV79" rows="3" placeholder="Write a note about the current moment in the lecture..."></textarea>
      <div class="video-notes-list-v79" id="videoNotesListV79"></div>
    </section>
    <button class="primary-btn" id="watchDone">Complete video +40 XP</button>
  `);
  setTimeout(() => {
    bindNovaVideoControls(video);
    const player = $('#novaLessonPlayer');
    if (player) {
      const saved = readFeatureStoreV79().lastVideo;
      if (String(saved?.id) === String(video.id) && Number(saved.time || 0) > 5) {
        player.addEventListener('loadedmetadata', () => {
          try { player.currentTime = Math.min(Number(saved.time || 0), Math.max(0, Number(player.duration || 0) - 2)); } catch {}
        }, { once:true });
      }
      let lastTick = 0;
      player.addEventListener('timeupdate', () => {
        const now = Date.now();
        if (now - lastTick > 2500) {
          lastTick = now;
          updateLastVideoTimeV79(video, player);
        }
      });
    }
    $('#bookmarkVideoV79')?.addEventListener('click', () => {
      const active = bookmarkVideoV79(video);
      $('#bookmarkVideoV79').textContent = active ? 'Bookmarked' : 'Bookmark';
      showToast(active ? 'Lecture bookmarked' : 'Bookmark removed');
    });
    $('#saveVideoNoteV79')?.addEventListener('click', () => {
      const text = $('#videoNoteTextV79')?.value || '';
      const seconds = $('#novaLessonPlayer') ? Math.floor(Number($('#novaLessonPlayer').currentTime || 0)) : 0;
      addVideoNoteV79(video, seconds, text);
      if ($('#videoNoteTextV79')) $('#videoNoteTextV79').value = '';
      showToast('Timestamp note saved');
    });
    $('[data-download-hy-sheet-v79]')?.addEventListener('click', () => downloadHighYieldSheetV79(video.id));
    $('#watchDone')?.addEventListener('click', async () => {
      const wasCompleted = getVideoProgress(video).completed || displayVideoProgress(video) >= 100;
      const player = $('#novaLessonPlayer');
      saveVideoWatchProgress(video, player, { completed: true });
      updateLastVideoTimeV79(video, player);
      if (!wasCompleted) {
        await window.awardStudentXpSecure?.('video_completed', window.rewardEventKeyV148?.(['video', video.id || video.title]) || `video:${video.id || video.title}`, {
          video_id: video.id || '',
          video_title: video.title || '',
          course: video.course || '',
          chapter: video.chapter || '',
          lecture: video.lecture || '',
          topic: video.topic || ''
        }, { toast: 'Video completed +{xp} XP', duplicateToast: 'Video already completed' });
      }
      saveState();
      updateMiniStats();
      renderVideos();
      renderHomeSmartWidgetsV79();
      closeModal();
      if (wasCompleted) showToast('Video already completed');
    });
    $$('[data-open-highyield]').forEach(btn => btn.addEventListener('click', event => openVideoResource(event.currentTarget.dataset.openHighyield, 'highyield')));
    $$('[data-open-pdf]').forEach(btn => btn.addEventListener('click', event => downloadLecturePdf(event.currentTarget.dataset.openPdf)));
    renderVideoNotesV79(video);
  }, 0);
}

function legacyUiRenderQuestionV79(index) {
  stopQbankTimer();
  const pool = activeQuestionPool.length ? activeQuestionPool : state.questions;
  const card = $('#questionCard');
  if (!card || !pool.length) return;
  currentQuestionIndex = ((index % pool.length) + pool.length) % pool.length;
  const q = normalizeQuestion(pool[currentQuestionIndex]);
  card.innerHTML = `
    ${isAdmin() ? `<div class="card-admin-actions question-actions"><button class="tiny-btn" type="button" data-edit-question-id="${q.id}">Edit</button><button class="tiny-btn danger" type="button" data-delete-question-id="${q.id}">Delete</button></div>` : ''}
    <div class="question-top">
      <div><span class="eyebrow">Question ${currentQuestionIndex + 1}/${pool.length} • ${esc(q.subtopic || q.topic || 'General')}</span></div>
      <div class="qbank-question-tools-v79">
        <button class="tiny-btn" id="bookmarkQuestionV79" type="button">${isQuestionBookmarkedV79(q) ? 'Bookmarked' : 'Bookmark'}</button>
        <div class="timer-pill" id="questionTimer" aria-live="polite">⏱ ${formatQuestionTime(QBANK_QUESTION_SECONDS)}</div>
      </div>
    </div>
    <div class="question-stem">${esc(q.stem)}</div>
    <div class="answers">
      ${q.options.map((option, i) => `<button class="answer-btn" data-answer="${i}"><b>${String.fromCharCode(65+i)}.</b> ${esc(option)}</button>`).join('')}
    </div>
    <div class="explanation" id="explanationBox">
      <h3>Explanation</h3>
      <p>${esc(q.explanation)}</p>
      <ul class="wrong-list">${(q.wrong || []).map(w => `<li>${esc(w)}</li>`).join('')}</ul>
      <p style="margin-top:10px"><b>High-yield:</b> ${esc(q.takeaway)}</p>
      <button class="primary-btn small" id="nextQuestion" style="margin-top:14px">Next question</button>
    </div>
  `;
  $$('.answer-btn').forEach(btn => btn.addEventListener('click', () => handleAnswer(btn, q)));
  $('#nextQuestion')?.addEventListener('click', () => renderQuestion(currentQuestionIndex + 1));
  $('#bookmarkQuestionV79')?.addEventListener('click', () => {
    const active = bookmarkQuestionV79(q);
    $('#bookmarkQuestionV79').textContent = active ? 'Bookmarked' : 'Bookmark';
    showToast(active ? 'Question bookmarked' : 'Bookmark removed');
  });
  startQbankTimer(q);
}

function initFeatureLayerV79() {
  $('#globalSearchBtn')?.addEventListener('click', openGlobalSearchModalV79);
  renderHomeSmartWidgetsV79();
  renderBookmarksPanel();
  renderAdminDashboardV79();
  renderLiveExamIndicators?.();
}


/* v80: Home widget visibility settings */
const HOME_WIDGET_SETTINGS_KEY_V80 = 'novamed-home-widget-settings-v117';
const HOME_WIDGET_ORDER_DEFAULT_V117 = ['monthlyCalendar', 'todoList', 'coursePlanner', 'continue', 'dailyQuestion', 'reviewMistakes', 'studyPlan'];
const HOME_WIDGET_KEYS_V117 = HOME_WIDGET_ORDER_DEFAULT_V117.slice();

function defaultHomeWidgetSettingsV80() {
  return {
    continue: false,
    dailyQuestion: false,
    reviewMistakes: false,
    studyPlan: false,
    monthlyCalendar: true,
    todoList: true,
    coursePlanner: true,
    order: HOME_WIDGET_ORDER_DEFAULT_V117.slice()
  };
}

function normalizeHomeWidgetSettingsV117(settings = {}) {
  const base = defaultHomeWidgetSettingsV80();
  const merged = { ...base, ...(settings || {}) };
  const incomingOrder = Array.isArray(settings?.order) ? settings.order : base.order;
  const cleanOrder = incomingOrder.filter(key => HOME_WIDGET_KEYS_V117.includes(key));
  merged.order = [...cleanOrder, ...HOME_WIDGET_KEYS_V117.filter(key => !cleanOrder.includes(key))];
  return merged;
}

function readHomeWidgetSettingsV80() {
  if (typeof isStudent === 'function' && isStudent()) {
    const source = window.__novamedHomeWidgetSettingsCache || state.homeWidgetSettings || {};
    const clean = normalizeHomeWidgetSettingsV117(source);
    window.__novamedHomeWidgetSettingsCache = clean;
    state.homeWidgetSettings = clean;
    return clean;
  }
  try {
    return normalizeHomeWidgetSettingsV117(JSON.parse(localStorage.getItem(HOME_WIDGET_SETTINGS_KEY_V80) || '{}') || {});
  } catch {
    return defaultHomeWidgetSettingsV80();
  }
}

function writeHomeWidgetSettingsV80(settings) {
  const clean = normalizeHomeWidgetSettingsV117(settings || {});
  if (typeof isStudent === 'function' && isStudent()) {
    window.__novamedHomeWidgetSettingsCache = clean;
    state.homeWidgetSettings = clean;
    try { localStorage.removeItem(HOME_WIDGET_SETTINGS_KEY_V80); } catch {}
    if (typeof saveStudentProgress === 'function') saveStudentProgress();
    return;
  }
  localStorage.setItem(HOME_WIDGET_SETTINGS_KEY_V80, JSON.stringify(clean));
}

function toggleDisplayV80(selector, visible) {
  $$(selector).forEach(el => {
    el.classList.toggle('home-widget-hidden-v80', !visible);
    if (!visible) {
      if ('open' in el) el.open = false;
    }
  });
}

function ensureHomeLayoutZoneV117() {
  const learn = $('#screen-learn');
  const hero = learn?.querySelector('.hero-card');
  if (!learn || !hero) return null;
  let zone = $('#homeLayoutZoneV117');
  if (!zone) {
    zone = document.createElement('div');
    zone.id = 'homeLayoutZoneV117';
    zone.className = 'home-layout-zone-v117';
    hero.insertAdjacentElement('afterend', zone);
  }
  return zone;
}

function homeWidgetElementV117(key) {
  const map = {
    monthlyCalendar: '#screen-learn .learn-calendar-card, #screen-learn .exam-calendar-card.clean-calendar-card',
    todoList: '#screen-learn .daily-todo-card.todo-dropdown',
    coursePlanner: '#screen-learn .your-course-dropdown',
    studyPlan: '#smartStudyPlanCardV85',
    continue: '[data-home-widget-v80="continue"]',
    dailyQuestion: '[data-home-widget-v80="dailyQuestion"]',
    reviewMistakes: '[data-home-widget-v80="reviewMistakes"]'
  };
  if (!map[key]) return null;
  const all = Array.from(document.querySelectorAll(map[key]));
  if (['continue', 'dailyQuestion', 'reviewMistakes'].includes(key)) {
    return all.find(el => el.closest('#homeSmartWidgetsV79')) || all[0] || null;
  }
  return all[0] || null;
}

function applyHomeWidgetOrderV117() {
  const zone = ensureHomeLayoutZoneV117();
  if (!zone) return;
  const settings = readHomeWidgetSettingsV80();
  settings.order.forEach(key => {
    const el = homeWidgetElementV117(key);
    if (!el || el === zone) return;
    if (['continue', 'dailyQuestion', 'reviewMistakes'].includes(key)) {
      document.querySelectorAll(`[data-home-widget-v80="${key}"]`).forEach(other => {
        if (other !== el) other.remove();
      });
    }
    el.dataset.homeWidgetV80 = key;
    zone.appendChild(el);
  });
  $$('#homeSmartWidgetsV79').forEach(el => {
    if (!el.children.length) el.classList.add('home-widget-source-empty-v117');
  });
  bindHomeHelpButtonsV111(zone);
}

function moveHomeWidgetInOrderV117(key, direction) {
  const settings = readHomeWidgetSettingsV80();
  const order = settings.order.slice();
  const index = order.indexOf(key);
  if (index < 0) return;
  const next = direction === 'up' ? index - 1 : index + 1;
  if (next < 0 || next >= order.length) return;
  [order[index], order[next]] = [order[next], order[index]];
  writeHomeWidgetSettingsV80({ ...settings, order });
  renderHomeWidgetSettingsListV117();
  applyHomeWidgetSettingsV80();
}

function setHomeWidgetDragOrderV117(fromKey, toKey, after = false) {
  if (!fromKey || !toKey || fromKey === toKey) return;
  const settings = readHomeWidgetSettingsV80();
  const order = settings.order.filter(key => key !== fromKey);
  const toIndex = order.indexOf(toKey);
  if (toIndex < 0) return;
  order.splice(toIndex + (after ? 1 : 0), 0, fromKey);
  writeHomeWidgetSettingsV80({ ...settings, order });
  renderHomeWidgetSettingsListV117();
  applyHomeWidgetSettingsV80();
}

function applyHomeWidgetSettingsV80() {
  const s = readHomeWidgetSettingsV80();
  toggleDisplayV80('#smartStudyPlanCardV85', s.studyPlan);
  toggleDisplayV80('#screen-learn .learn-calendar-card, #screen-learn .exam-calendar-card.clean-calendar-card', s.monthlyCalendar);
  toggleDisplayV80('#screen-learn .daily-todo-card.todo-dropdown', s.todoList);
  toggleDisplayV80('#screen-learn .your-course-dropdown', s.coursePlanner);
  toggleDisplayV80('[data-home-widget-v80="continue"]', s.continue);
  toggleDisplayV80('[data-home-widget-v80="dailyQuestion"]', s.dailyQuestion);
  toggleDisplayV80('[data-home-widget-v80="reviewMistakes"]', s.reviewMistakes);
  const wrap = $('#homeSmartWidgetsV79');
  if (wrap) {
    wrap.classList.toggle('single-widget-v80', [s.continue, s.dailyQuestion, s.reviewMistakes].filter(Boolean).length === 1);
    wrap.classList.toggle('home-widget-hidden-v80', !s.continue && !s.dailyQuestion && !s.reviewMistakes);
  }
  applyHomeWidgetOrderV117();
}

function homeSmartReviewCandidateV103() {
  try { ensureStudyFeatureState?.(); normalizeMistakeStateV102?.(); } catch (_) {}
  const statusOf = item => typeof mistakeStatus === 'function'
    ? mistakeStatus(item)
    : (item?.status || 'active');
  const now = Date.now();
  const activeItems = (state.mistakes || []).filter(item => statusOf(item) === 'active');
  const dueReminders = activeItems
    .filter(item => {
      const reminder = Date.parse(item.remindAt || item.reminderAt || '');
      return Number.isFinite(reminder) && reminder <= now;
    })
    .sort((a, b) => Date.parse(a.remindAt || a.reminderAt || 0) - Date.parse(b.remindAt || b.reminderAt || 0));
  if (dueReminders[0]) return dueReminders[0];
  const items = activeItems
    .filter(item => {
      const reminder = Date.parse(item.remindAt || item.reminderAt || '');
      return !Number.isFinite(reminder) || reminder <= now;
    })
    .sort((a, b) => Date.parse(b.updatedAt || b.createdAt || 0) - Date.parse(a.updatedAt || a.createdAt || 0));
  return items[0] || null;
}

function homeSmartReviewLineV103(item) {
  const q = normalizeQuestion?.(item?.question || {}) || (item?.question || {});
  const correct = Number(q.correct || 0);
  const answer = Array.isArray(q.options) ? q.options[correct] : '';
  return {
    title: q.subtopic || q.lecture || q.topic || 'Mistake review',
    path: [baseCourseTitle?.(q.course) || q.course, q.topic, q.subtopic || q.lecture].filter(Boolean).join(' • '),
    stem: q.stem || 'Review the question you missed.',
    note: item.personalNote || q.takeaway || q.explanation || answer || 'Open this mistake and refresh the clue before your next session.',
    answer
  };
}

async function markHomeReviewMistakeV103(key) {
  const item = (state.mistakes || []).find(m => m.key === key);
  if (!item) return showToast('Mistake was not found');
  item.status = 'reviewed';
  item.reviewedAt = new Date().toISOString();
  item.updatedAt = new Date().toISOString();
  item.dueAt = null;
  item.remindAt = null;
  item.reminderAt = null;
  await window.awardStudentXpSecure?.('mistake_reviewed', window.rewardEventKeyV148?.(['home-mistake-reviewed', item.key]) || `home-mistake-reviewed:${item.key}`, { mistake_key: item.key || '', source: 'home_review' }, { toast: 'Marked as reviewed +{xp} XP', duplicateToast: 'Mistake review reward already counted' });
  saveState?.();
  saveStudentProgress?.();
  renderMistakes?.();
  renderProfileStats?.();
  renderHomeSmartWidgetsV79();
}

function goToHomeReviewMistakesV103() {
  navigate?.('profile');
  setTimeout(() => {
    showAdminTab?.('mistakes');
    $('#adminPanel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 80);
}

function renderHomeSmartWidgetsV79() {
  const learn = $('#screen-learn');
  const hero = learn?.querySelector('.hero-card');
  if (!learn || !hero) return;
  const settings = readHomeWidgetSettingsV80();
  let wrap = $('#homeSmartWidgetsV79');

  if (!settings.continue && !settings.dailyQuestion && !settings.reviewMistakes) {
    wrap?.remove();
    applyHomeWidgetSettingsV80();
    return;
  }

  if (!wrap) {
    wrap = document.createElement('div');
    wrap.id = 'homeSmartWidgetsV79';
    wrap.className = 'home-smart-widgets-v79';
    hero.insertAdjacentElement('afterend', wrap);
  }

  const store = readFeatureStoreV79();
  const last = store.lastVideo ? videoByIdV79(store.lastVideo.id) : null;
  const q = dailyQuestionV79();
  const reviewItem = settings.reviewMistakes ? homeSmartReviewCandidateV103() : null;
  const reviewInfo = reviewItem ? homeSmartReviewLineV103(reviewItem) : null;

  const continueHtml = settings.continue ? `
    <section class="continue-card-v79 premium-card clean-home-widget-v111" data-home-widget-v80="continue">
      <div class="clean-home-card-head-v111">
        <div>
          <div class="home-title-help-v115">
            <span class="eyebrow">Study progress</span>
            <button class="home-help-btn-v111" type="button" data-home-help-v111="continue" aria-label="Continue help">?</button>
          </div>
          <h2>Continue where you left off</h2>
          ${last ? `<p class="home-widget-subline-v113">${esc(last.title)}</p>` : ''}
        </div>
      </div>
      <div class="continue-main-v79">
        <div></div>
        ${last ? `<button class="primary-btn small" type="button" data-continue-video-v79="${esc(last.id)}">Continue</button>` : `<button class="soft-btn small" type="button" data-nav-to-videos-v79>Open videos</button>`}
      </div>
    </section>
  ` : '';

  const dailyHtml = settings.dailyQuestion ? `
    <section class="daily-question-v79 premium-card clean-home-widget-v111" data-home-widget-v80="dailyQuestion">
      <div class="daily-question-head-v79 clean-home-card-head-v111">
        <div>
          <div class="home-title-help-v115">
            <span class="eyebrow">Quick MCQ</span>
            <button class="home-help-btn-v111" type="button" data-home-help-v111="dailyQuestion" aria-label="Daily MCQ help">?</button>
          </div>
          <h2>Daily MCQ</h2>
        </div>
        <div class="home-card-actions-v111">
          ${q ? `<button class="tiny-btn" type="button" data-bookmark-question-v79="${esc(questionProgressKey(q))}">${isQuestionBookmarkedV79(q) ? 'Saved' : 'Bookmark'}</button>` : ''}
        </div>
      </div>
      ${q ? `
        <p class="daily-stem-v79">${esc(q.stem)}</p>
        <div class="daily-answer-grid-v79">
          ${q.options.map((option, i) => `<button type="button" class="daily-answer-v79" data-daily-answer-v79="${i}"><b>${String.fromCharCode(65+i)}.</b> ${esc(option)}</button>`).join('')}
        </div>
        <div class="daily-explain-v79" id="dailyExplainV79" hidden>
          <b>Answer: ${optionLabel(q.correct)}. ${esc(q.options[q.correct])}</b>
          <p>${esc(q.takeaway || q.explanation)}</p>
        </div>
      ` : '<p class="home-widget-subline-v113">No MCQs available yet.</p>'}
    </section>
  ` : '';

  const reviewHtml = settings.reviewMistakes && reviewInfo ? `
    <section class="smart-review-card-v103 premium-card clean-home-widget-v111" data-home-widget-v80="reviewMistakes">
      <div class="smart-review-head-v103 clean-home-card-head-v111">
        <div>
          <div class="home-title-help-v115">
            <h2>Refresh</h2>
            <button class="home-help-btn-v111" type="button" data-home-help-v111="refresh" aria-label="Refresh help">?</button>
          </div>
          <strong class="refresh-topic-v111">${esc(reviewInfo.title)}</strong>
        </div>
        <div class="home-card-actions-v111">
          <span class="review-count-pill-v103">${(state.mistakes || []).filter(item => (typeof mistakeStatus === 'function' ? mistakeStatus(item) : item.status || 'active') === 'active').length} active</span>
        </div>
      </div>
      <div class="highlight-note-v103">
        <b>Highlight note</b>
        <p>${esc(reviewInfo.note)}</p>
        ${reviewInfo.answer ? `<small>Correct answer: ${esc(reviewInfo.answer)}</small>` : ''}
      </div>
      <p class="daily-stem-v79">${esc(reviewInfo.stem)}</p>
      <div class="smart-review-actions-v103">
        <button class="soft-btn small" type="button" data-home-mark-reviewed-v103="${esc(reviewItem.key)}">Mark as reviewed</button>
        <button class="primary-btn small" type="button" data-home-go-unresolved-v103>Go to unresolved</button>
      </div>
    </section>
  ` : '';

  if (!continueHtml && !dailyHtml && !reviewHtml) {
    wrap?.remove();
    applyHomeWidgetSettingsV80();
    return;
  }

  wrap.innerHTML = continueHtml + dailyHtml + reviewHtml;
  bindHomeHelpButtonsV111(wrap);
  wrap.classList.toggle('single-widget-v80', [continueHtml, dailyHtml, reviewHtml].filter(Boolean).length === 1);

  $('[data-continue-video-v79]')?.addEventListener('click', event => openVideo(Number(event.currentTarget.dataset.continueVideoV79)));
  $('[data-nav-to-videos-v79]')?.addEventListener('click', () => {
    const nav = $('[data-nav="videos"]');
    nav?.click();
  });

  $('[data-home-mark-reviewed-v103]')?.addEventListener('click', event => markHomeReviewMistakeV103(event.currentTarget.dataset.homeMarkReviewedV103));
  $('[data-home-go-unresolved-v103]')?.addEventListener('click', goToHomeReviewMistakesV103);

  if (q && settings.dailyQuestion) {
    $$('[data-daily-answer-v79]').forEach(btn => btn.addEventListener('click', () => {
      const selected = Number(btn.dataset.dailyAnswerV79);
      const correct = selected === Number(q.correct);
      $$('.daily-answer-v79').forEach(b => {
        b.disabled = true;
        const idx = Number(b.dataset.dailyAnswerV79);
        if (idx === q.correct) b.classList.add('correct');
        if (idx === selected && !correct) b.classList.add('wrong');
      });
      $('#dailyExplainV79')?.removeAttribute('hidden');
      recordQbankAttempt(q, selected, { source: 'daily-question' });
      if (!correct) recordMistake(q, selected);
      saveState(); updateMiniStats(); renderAnalytics(); renderMistakes(); renderFlashcards();
      showToast(correct ? 'Daily question correct' : 'Saved to Smart Review');
    }));
    $('[data-bookmark-question-v79]')?.addEventListener('click', () => {
      bookmarkQuestionV79(q);
      renderHomeSmartWidgetsV79();
      showToast(isQuestionBookmarkedV79(q) ? 'Question bookmarked' : 'Bookmark removed');
    });
  }

  applyHomeWidgetSettingsV80();
}

function homeWidgetToggleRowV80(key, icon, title, desc) {
  const settings = readHomeWidgetSettingsV80();
  const checked = settings[key] === true;
  return `
    <div class="home-widget-toggle-row-v80 home-widget-sort-row-v117" draggable="true" data-home-widget-row-v117="${esc(key)}">
      <button class="home-widget-drag-handle-v117" type="button" aria-label="Drag ${esc(title)}">☰</button>
      <span class="widget-toggle-icon-v80">${icon}</span>
      <span class="home-widget-toggle-text-v117">
        <b>${esc(title)}</b>
        <small>${esc(desc)}</small>
      </span>
      <div class="home-widget-row-actions-v117">
        <button class="home-widget-order-btn-v117" type="button" data-home-widget-move-v117="up" data-home-widget-key-v117="${esc(key)}" aria-label="Move ${esc(title)} up">↑</button>
        <button class="home-widget-order-btn-v117" type="button" data-home-widget-move-v117="down" data-home-widget-key-v117="${esc(key)}" aria-label="Move ${esc(title)} down">↓</button>
        <label class="home-widget-switch-v117" aria-label="Show ${esc(title)}">
          <input type="checkbox" data-home-widget-toggle-v80="${esc(key)}" ${checked ? 'checked' : ''} />
          <i aria-hidden="true"></i>
        </label>
      </div>
    </div>
  `;
}

function homeWidgetSettingsListHtmlV117() {
  const settings = readHomeWidgetSettingsV80();
  const meta = {
    continue: ['↻', 'Continue where you left off', 'Last lecture card on Home.'],
    dailyQuestion: ['?', 'Daily Question', 'One quick MCQ every day.'],
    reviewMistakes: ['!', 'Refresh', 'Highlight notes from missed MCQs with a quick review action.'],
    studyPlan: ['✦', 'Smart Study Plan', 'Personal plan from weak systems, MCQs, videos, and mistakes.'],
    monthlyCalendar: ['◷', 'Monthly Calendar', 'Monthly habit / exam calendar.'],
    todoList: ['✓', 'Today To-do list', 'Daily task list and completion percent.'],
    coursePlanner: ['☰', 'Course Planner', 'Choose lectures, mark studied items, and send tasks to To-do.']
  };
  return settings.order.map(key => {
    const item = meta[key];
    return item ? homeWidgetToggleRowV80(key, item[0], item[1], item[2]) : '';
  }).join('');
}

function renderHomeWidgetSettingsListV117() {
  const list = $('#homeWidgetSettingsListV117');
  if (!list) return;
  list.innerHTML = homeWidgetSettingsListHtmlV117();
  bindHomeWidgetSettingsListV117(list);
}

function bindHomeWidgetSettingsListV117(root = document) {
  root.querySelectorAll?.('[data-home-widget-toggle-v80]').forEach(input => input.addEventListener('change', () => {
    const settings = readHomeWidgetSettingsV80();
    settings[input.dataset.homeWidgetToggleV80] = input.checked;
    writeHomeWidgetSettingsV80(settings);
    renderHomeSmartWidgetsV79();
    applyHomeWidgetSettingsV80();
  }));

  root.querySelectorAll?.('[data-home-widget-move-v117]').forEach(btn => btn.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    moveHomeWidgetInOrderV117(btn.dataset.homeWidgetKeyV117, btn.dataset.homeWidgetMoveV117);
  }));

  root.querySelectorAll?.('[data-home-widget-row-v117]').forEach(row => {
    row.addEventListener('dragstart', event => {
      row.classList.add('dragging-v117');
      event.dataTransfer?.setData('text/plain', row.dataset.homeWidgetRowV117);
      if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
    });
    row.addEventListener('dragend', () => row.classList.remove('dragging-v117'));
    row.addEventListener('dragover', event => {
      event.preventDefault();
      row.classList.add('drag-over-v117');
    });
    row.addEventListener('dragleave', () => row.classList.remove('drag-over-v117'));
    row.addEventListener('drop', event => {
      event.preventDefault();
      row.classList.remove('drag-over-v117');
      const fromKey = event.dataTransfer?.getData('text/plain');
      const rect = row.getBoundingClientRect();
      const after = event.clientY > rect.top + rect.height / 2;
      setHomeWidgetDragOrderV117(fromKey, row.dataset.homeWidgetRowV117, after);
    });
  });
}


function openHomeWidgetSettingsModalV80() {
  showModal(`
    <h2 id="modalTitle">Home layout</h2>
    <p class="modal-muted">Turn cards on or off, then drag them or use ↑ ↓ to set their order on Home.</p>
    <div class="home-widget-settings-v80" id="homeWidgetSettingsListV117">
      ${homeWidgetSettingsListHtmlV117()}
    </div>
    <div class="modal-button-row">
      <button class="primary-btn" id="saveHomeWidgetsV80" type="button">Done</button>
      <button class="soft-btn" id="resetHomeWidgetsV80" type="button">Default layout</button>
    </div>
  `);

  bindHomeWidgetSettingsListV117($('#homeWidgetSettingsListV117') || document);

  $('#saveHomeWidgetsV80')?.addEventListener('click', () => {
    renderHomeSmartWidgetsV79();
    applyHomeWidgetSettingsV80();
    closeModal();
    showToast('Home layout saved');
  });

  $('#resetHomeWidgetsV80')?.addEventListener('click', () => {
    writeHomeWidgetSettingsV80(defaultHomeWidgetSettingsV80());
    renderHomeWidgetSettingsListV117();
    renderHomeSmartWidgetsV79();
    applyHomeWidgetSettingsV80();
    showToast('Default Home layout restored');
  });
}


function localDatetimeValueV108(date = new Date()) {
  const pad = value => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function findMistakeByKeyV108(key) {
  return (state.mistakes || []).find(item => item.key === key);
}

function setMistakeReminderV108(key, date) {
  const item = findMistakeByKeyV108(key);
  if (!item) {
    showToast?.('Mistake was not found');
    return false;
  }
  const reminderTime = date instanceof Date ? date.getTime() : NaN;
  if (!Number.isFinite(reminderTime) || reminderTime <= Date.now()) {
    showToast?.('Choose a future reminder time');
    return false;
  }
  item.remindAt = new Date(reminderTime).toISOString();
  item.status = 'active';
  item.updatedAt = new Date().toISOString();
  saveState?.();
  saveStudentProgress?.();
  renderMistakes?.();
  renderProfileStats?.();
  renderHomeSmartWidgetsV79?.();
  return true;
}

function openMistakeReminderModalV108(key) {
  const item = findMistakeByKeyV108(key);
  if (!item) return showToast?.('Mistake was not found');
  const q = normalizeQuestion?.(item.question || {}) || (item.question || {});
  const safeText = value => (typeof esc === 'function' ? esc(value) : String(value ?? ''));
  const defaultTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const minTime = new Date(Date.now() + 5 * 60 * 1000);
  showModal?.(`
    <h2 id="modalTitle">Remind me</h2>
    <p class="modal-muted">Choose when this mistake should return to the Home Refresh card.</p>
    <div class="mistake-reminder-preview-v108">
      <span class="eyebrow">${safeText(q.subtopic || q.lecture || q.topic || 'Mistake review')}</span>
      <p>${safeText(q.stem || 'Review this missed question.')}</p>
    </div>
    <label class="field-label">
      <span>Reminder time</span>
      <input id="mistakeReminderAtV108" type="datetime-local" min="${localDatetimeValueV108(minTime)}" value="${localDatetimeValueV108(defaultTime)}" />
    </label>
    <div class="reminder-quick-row-v108">
      <button class="soft-btn small" type="button" data-reminder-minutes-v108="30">30 min</button>
      <button class="soft-btn small" type="button" data-reminder-minutes-v108="120">2 hours</button>
      <button class="soft-btn small" type="button" data-reminder-minutes-v108="1440">Tomorrow</button>
    </div>
    <div class="modal-button-row">
      <button class="primary-btn" id="saveMistakeReminderV108" type="button">Save reminder</button>
      <button class="soft-btn" id="cancelMistakeReminderV108" type="button">Cancel</button>
    </div>
  `);
  $$('[data-reminder-minutes-v108]').forEach(btn => btn.addEventListener('click', () => {
    const minutes = Number(btn.dataset.reminderMinutesV108 || 0);
    const target = new Date(Date.now() + minutes * 60 * 1000);
    const input = $('#mistakeReminderAtV108');
    if (input) input.value = localDatetimeValueV108(target);
  }));
  $('#saveMistakeReminderV108')?.addEventListener('click', () => {
    const input = $('#mistakeReminderAtV108');
    const parsed = new Date(input?.value || '');
    if (setMistakeReminderV108(key, parsed)) {
      closeModal?.();
      showToast?.('Reminder saved');
    }
  });
  $('#cancelMistakeReminderV108')?.addEventListener('click', () => closeModal?.());
}

function bindMistakeReminderDelegationV108() {
  if (window.__mistakeReminderDelegationV108) return;
  window.__mistakeReminderDelegationV108 = true;
  document.addEventListener('click', event => {
    const target = event.target?.nodeType === 1 ? event.target : event.target?.parentElement;
    const btn = target?.closest?.('[data-remind-mistake]');
    if (!btn) return;
    event.preventDefault();
    event.stopPropagation();
    openMistakeReminderModalV108(btn.dataset.remindMistake);
  }, true);
}


function homeHelpContentV111(key) {
  const help = {
    continue: {
      title: 'شرح Continue',
      points: [
        'يعرض آخر محاضرة أو فيديو توقفت عنده حتى ترجع للدراسة بسرعة.',
        'زر Continue يفتح نفس المحاضرة مباشرة.',
        'إذا لا توجد محاضرة محفوظة، يظهر زر يوجهك إلى صفحة الفيديوهات.'
      ]
    },
    dailyQuestion: {
      title: 'شرح Daily MCQ',
      points: [
        'يعرض سؤال MCQ يومي للمراجعة السريعة بدون الحاجة إلى فتح QBank.',
        'إذا أخطأت بالسؤال، ينضاف تلقائياً إلى My Mistakes للمراجعة لاحقاً.',
        'تستطيع حفظ السؤال كـ Bookmark إذا تريد ترجع له بسرعة.'
      ]
    },
    refresh: {
      title: 'شرح Refresh',
      points: [
        'يعرض الأخطاء المهمة أو الأسئلة التي وصل وقت تذكيرها.',
        'يعرض Highlight note حتى تراجع الفكرة بسرعة بدون فتح كل القائمة.',
        'Mark as reviewed يعني تمت مراجعة هذا الخطأ حالياً.',
        'Go to unresolved يفتح قائمة الأخطاء غير المحلولة.'
      ]
    },
    studyPlan: {
      title: 'شرح Smart Study Plan',
      points: [
        'يبني خطة دراسة حسب وقتك وموعد الامتحان والمواد الضعيفة.',
        'يعتمد على محتوى التطبيق: فيديوهات، MCQs، Flashcards، وMistakes.',
        'Build my plan ينشئ خطة حسب اختياراتك.',
        'Auto 7-day plan ينشئ خطة سريعة لمدة أسبوع.',
        'كل مهمة داخل الخطة تفتح مكانها المناسب مثل فيديو، امتحان، فلاش كارد أو أخطاء.'
      ]
    },
    calendar: {
      title: 'شرح Monthly Calendar',
      points: [
        'يعرض أيام الشهر بشكل سريع ومنظم.',
        'تستطيع وضع يوم امتحان أو هدف مراجعة على يوم معين.',
        'تقدر تمتحن بنفس اليوم المحدد أو تراجع الهدف في يوم آخر حسب وقتك.',
        'يساعدك تشوف توزيع الدراسة والامتحانات على الشهر.'
      ]
    },
    todo: {
      title: 'شرح To-do list',
      points: [
        'هذه قائمة مهام اليوم فقط.',
        'تستطيع إضافة مهمة يدوية من خانة الكتابة ثم Add.',
        'زر Browse a lecture يفتح اختيار المحاضرات بسرعة حتى تضيفها كمهام.',
        'يمكنك استيراد محاضرات من Course Planner إلى To-do list.',
        'كل مهمة محاضرة يظهر معها Go to video للانتقال مباشرة إلى الفيديو.',
        'زر X يحذف المهمة، والمربع الأبيض يعلّم المهمة كمكتملة.',
        'النسبة 0% أو غيرها تمثل نسبة إنجاز مهام اليوم.'
      ]
    },
    coursePlanner: {
      title: 'شرح Course Planner',
      points: [
        'اختر Course ثم Chapter حتى تظهر المحاضرات التابعة له.',
        'حدد المحاضرات التي تريد دراستها من القائمة.',
        'يمكنك إرسال المحاضرات المحددة إلى To-do list حتى تتحول إلى مهام يومية.',
        'المحاضرات التي ترسلها للتودو يظهر معها زر Go to video.',
        'عند شطب محاضرة داخل Course Planner يتم حفظها كمحاضرة مقروءة حتى تميّز بين ما تم إنهاؤه وما لم يُقرأ بعد.',
        'يفيدك عندما تريد ترتيب محاضرات اليوم بدون البحث داخل الفيديوهات كل مرة.'
      ]
    },
    videos: {
      title: 'شرح Videos',
      points: [
        'اختر Course ثم Chapter من Guided path.',
        'بعد الضغط على Open تظهر لك كل محاضرات هذا الـ Chapter في نافذة مرتبة.',
        'اختيار أي محاضرة يفتحها مباشرة داخل التطبيق.',
        'تقدم المشاهدة يحفظ حتى تظهر المحاضرة لاحقاً في Continue.',
        'يمكنك إضافة المحاضرات إلى To-do list من Course Planner إذا تريد جدولتها.',
        'زر Free Courses يفتح كورسات مجانية منفصلة داخل التطبيق.'
      ]
    },
    qbank: {
      title: 'شرح QBank',
      points: [
        'اختر Course ثم Chapter، والنمط داخل الـ Guided path يكون Traditional للمراجعة السريعة.',
        'Traditional يعرض التصحيح والشرح مباشرة بعد كل سؤال.',
        'زر Wizary mode أعلى الصفحة مخصص للامتحان الوزاري بنظام النتيجة بعد النهاية.',
        'داخل السؤال تستطيع رؤية الشرح ولماذا الاختيارات الأخرى خطأ إذا كانت موجودة بالملف.',
        'Bookmark يحفظ السؤال للمراجعة لاحقاً من Profile.',
        'إذا أخطأت بسؤال، ينضاف تلقائياً إلى My Mistakes.',
        'الأخطاء تساعد التطبيق يصنع Flashcards ومراجعات لاحقة حتى تثبت الفكرة.'
      ]
    },
    highYieldNotes: {
      title: 'شرح High-yield notes',
      points: [
        'هذه الخانة مخصصة للأفكار الوزارية والأفكار المتكررة من مصادر الأسئلة.',
        'اختر Course ثم Chapter، وبعدها افتح فولدر المحاضرة أو الموضوع الذي تريد مراجعته.',
        'الهدف منها تجميع التريكات والاختصارات ونقاط الربط التي تتكرر في الأسئلة.',
        'يمكن اعتبارها مراجعة سريعة قبل الامتحان للأفكار التي غالباً تظهر بالوزاري.',
        'الفكرة أن أغلب الأسئلة المهمة، على الأقل حوالي 80% من نمط الوزاري، تكون ممثلة هنا كأفكار مختصرة.',
        'تستطيع لاحقاً إضافة الملاحظات التفصيلية لكل محاضرة من داخل صفحة الـ High-yield notes.'
      ]
    }
  };
  return help[key] || { title: 'شرح النافذة', points: ['هذه النافذة تساعدك بتنظيم الدراسة داخل الصفحة الرئيسية.'] };
}

function openHomeHelpV111(key) {
  const item = homeHelpContentV111(key);
  showModal(`
    <h2 id="modalTitle">${esc(item.title)}</h2>
    <div class="home-help-modal-v111" dir="rtl">
      <ul>
        ${item.points.map(point => `<li>${esc(point)}</li>`).join('')}
      </ul>
    </div>
  `);
}

function bindHomeHelpButtonsV111(root = document) {
  if (!document.body?.dataset.homeHelpDelegatedV111) {
    document.body.dataset.homeHelpDelegatedV111 = '1';
    document.addEventListener('click', event => {
      const btn = event.target?.closest?.('[data-home-help-v111]');
      if (!btn) return;
      event.preventDefault();
      event.stopPropagation();
      openHomeHelpV111(btn.dataset.homeHelpV111);
    }, true);
  }
  root.querySelectorAll?.('[data-home-help-v111]').forEach(btn => {
    btn.dataset.homeHelpBoundV111 = '1';
  });
}

function initHomeWidgetSettingsV80() {
  $('#homeWidgetSettingsBtn')?.addEventListener('click', openHomeWidgetSettingsModalV80);
  bindHomeHelpButtonsV111(document);
  bindMistakeReminderDelegationV108();
  renderHomeSmartWidgetsV79();
  if (!window.__homeRefreshReminderTimerV108) {
    window.__homeRefreshReminderTimerV108 = window.setInterval(() => renderHomeSmartWidgetsV79(), 120000);
  }
  if (typeof renderSmartStudyPlanV85 === 'function') renderSmartStudyPlanV85();
  applyHomeWidgetSettingsV80();
}


/* v82: system-first flashcards + auto video notes + clean free-course video watch */
