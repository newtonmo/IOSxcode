/* NovaMed v83 - Flashcards by system and final video/free-course cleanup overrides. */
function flashcardSystemsV82(cards = state.flashcards || []) {
  const map = new Map();
  cards.forEach(card => {
    const key = String(card.topic || card.subtopic || card.course || 'General').trim() || 'General';
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(card);
  });
  return Array.from(map.entries()).sort((a,b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
}

function renderFlashcards(selectedSystem = '') {
  const root = $('#flashcardsPanel');
  if (!root) return;
  ensureStudyFeatureState();
  const cards = state.flashcards || [];
  const systems = flashcardSystemsV82(cards);
  const activeSystem = selectedSystem || root.dataset.flashcardSystem || '';
  const filtered = activeSystem ? cards.filter(card => String(card.topic || card.subtopic || card.course || 'General') === activeSystem) : [];
  root.dataset.flashcardSystem = activeSystem;

  if (!cards.length) {
    root.innerHTML = `
      <div class="flashcards-head">
        <div><span class="eyebrow">Mistake Flashcards</span><h2>Cards from wrong answers</h2><p>Wrong answers will create cards automatically.</p></div>
        <b>0 cards</b>
      </div>
    `;
    return;
  }

  if (!activeSystem) {
    root.innerHTML = `
      <div class="flashcards-head">
        <div><span class="eyebrow">Mistake Flashcards</span><h2>Choose a system first</h2><p>Flashcards are grouped by system so you do not see every card at once.</p></div>
        <b>${cards.length} cards</b>
      </div>
      <div class="flashcard-system-grid-v82">
        ${systems.map(([system, list]) => {
          const accuracy = list.length ? Math.max(0, 100 - Math.min(80, list.length * 8)) : 100;
          return `
            <button class="flashcard-system-card-v82 premium-card" type="button" data-flashcard-system-v82="${esc(system)}">
              <span class="eyebrow">${esc(baseCourseTitle(list[0]?.course || ''))}</span>
              <h3>${esc(system)}</h3>
              <p>${list.length} flashcard${list.length === 1 ? '' : 's'} from weak answers</p>
              <div class="free-pro-meta"><span>${accuracy}% confidence target</span><span>Review</span></div>
            </button>
          `;
        }).join('')}
      </div>
    `;
    $$('[data-flashcard-system-v82]').forEach(btn => btn.addEventListener('click', () => renderFlashcards(btn.dataset.flashcardSystemV82)));
    return;
  }

  root.innerHTML = `
    <div class="flashcards-head">
      <div>
        <span class="eyebrow">Mistake Flashcards</span>
        <h2>${esc(activeSystem)}</h2>
        <p>Front = clue/stem. Back = answer and takeaway. Rate each card: Easy / Hard / Again.</p>
      </div>
      <div class="flashcard-head-actions-v82">
        <b>${filtered.length} cards</b>
        <button class="soft-btn small" type="button" id="backToFlashcardSystemsV82">Systems</button>
      </div>
    </div>
    <div class="flashcard-grid">
      ${filtered.map(card => `<article class="flashcard-item"><div class="flashcard-front"><span class="eyebrow">${esc(baseCourseTitle(card.course))} • ${esc(card.topic)}</span><h3>${esc(card.front)}</h3></div><details><summary>Show back</summary><p>${esc(card.back)}</p><small>${esc(card.takeaway || '')}</small></details><div class="flashcard-actions"><button class="soft-btn small" data-flashcard-rate="easy" data-card-key="${esc(card.key)}">Easy</button><button class="soft-btn small" data-flashcard-rate="hard" data-card-key="${esc(card.key)}">Hard</button><button class="primary-btn small" data-flashcard-rate="again" data-card-key="${esc(card.key)}">Again</button></div></article>`).join('')}
    </div>`;
  $('#backToFlashcardSystemsV82')?.addEventListener('click', () => { root.dataset.flashcardSystem = ''; renderFlashcards(''); });
  $$('[data-flashcard-rate]').forEach(btn => btn.addEventListener('click', async () => {
    const card = state.flashcards.find(item => item.key === btn.dataset.cardKey);
    if (!card) return;
    card.lastRating = btn.dataset.flashcardRate;
    card.reviewedAt = new Date().toISOString();
    if (card.lastRating === 'easy') card.ease = Math.min(5, Number(card.ease || 2) + 1);
    if (card.lastRating === 'hard') card.ease = Math.max(1, Number(card.ease || 2) - .25);
    if (card.lastRating === 'again') card.ease = 1;
    card.reviewCount = Number(card.reviewCount || 0) + 1;
    card.correctCount = Number(card.correctCount || 0) + (card.lastRating === 'easy' ? 1 : 0);
    card.wrongCount = Number(card.wrongCount || 0) + (card.lastRating === 'again' ? 1 : 0);
    card.reviewedAt = new Date().toISOString();
    card.updatedAt = card.reviewedAt;
    if (typeof addDaysIso === 'function') card.dueAt = addDaysIso(card.lastRating === 'easy' ? 7 : card.lastRating === 'hard' ? 3 : 1);
    if (typeof saveFlashcardProgressToSupabase === 'function') saveFlashcardProgressToSupabase(card, { immediate: true }).catch?.(() => {});
    await window.awardStudentXpSecure?.('flashcard_reviewed', window.rewardEventKeyV148?.(['flashcard', card.key, card.reviewCount]) || `flashcard:${card.key}:${card.reviewCount}`, { card_key: card.key || '', rating: card.lastRating || '' }, { toast: 'Flashcard reviewed +{xp} XP', duplicateToast: 'Flashcard review already counted' });
    saveState();
  }));
}

function videoLikeFromFreeLectureV82(lecture = {}, course = {}, chapter = {}) {
  return {
    id: `free-${lecture.id}`,
    title: lecture.title || 'External lecture',
    description: lecture.description || 'External lecture inside NovaMed.',
    url: lecture.url,
    mode: 'free-courses',
    course: course?.title || course?.id || 'Free course',
    topic: chapter?.title || 'External',
    duration: lecture.duration || 'Video',
    thumbnail: lecture.thumbnail || course?.coverImage || '',
    external: true,
    files: lecture.files || []
  };
}

function attachAutoVideoNoteV82(video) {
  const textarea = $('#videoNoteTextV79');
  const status = $('#videoNoteStatusV82');
  if (!textarea || !video) return;
  const draftKey = `draft-${featureKeyV79(video.id)}`;
  const store = readFeatureStoreV79();
  textarea.value = store.videoNoteDrafts?.[draftKey] || '';
  let timer = null;
  const autoSave = (force = false) => {
    const text = String(textarea.value || '').trim();
    if (!text) {
      if (status) status.textContent = 'Write a note and it will save automatically.';
      return;
    }
    clearTimeout(timer);
    const run = () => {
      const player = $('#novaLessonPlayer');
      const seconds = player ? Math.floor(Number(player.currentTime || 0)) : 0;
      addVideoNoteV79(video, seconds, text);
      textarea.value = '';
      const next = readFeatureStoreV79();
      if (!next.videoNoteDrafts) next.videoNoteDrafts = {};
      delete next.videoNoteDrafts[draftKey];
      writeFeatureStoreV79(next);
      if (status) status.textContent = `Auto-saved at ${formatVideoNoteTimeV79(seconds)}`;
    };
    if (force) run();
    else timer = setTimeout(run, 850);
  };
  textarea.addEventListener('input', () => {
    const next = readFeatureStoreV79();
    if (!next.videoNoteDrafts) next.videoNoteDrafts = {};
    next.videoNoteDrafts[draftKey] = textarea.value;
    writeFeatureStoreV79(next);
    if (status) status.textContent = 'Typing… auto-save is ready';
    clearTimeout(timer);
    if (String(textarea.value || '').trim()) timer = setTimeout(() => autoSave(true), 1400);
  });
  textarea.addEventListener('blur', () => autoSave(true));
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
  `).join('') : '';
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

function renderCleanVideoModalBodyV82(video, { showResources = true } = {}) {
  return `
    <div class="video-modal-head-v79 clean-video-head-v82">
      <div>
        <h2 id="modalTitle">${esc(video.title)}</h2>
        <p>${esc(video.description || '')}</p>
      </div>
      <button class="soft-btn small" id="bookmarkVideoV79" type="button">${isVideoBookmarkedV79(video.id) ? 'Bookmarked' : 'Bookmark'}</button>
    </div>
    ${renderNovaVideoPlayer(video)}
    <div class="meta-row compact-video-meta-v82" style="margin-bottom:14px">
      <span class="tag">${esc(video.course || 'Video')}</span>
      <span class="tag">${esc(video.topic || 'Lecture')}</span>
      <span class="tag">${esc(video.duration || 'Video')}</span>
    </div>
    ${showResources ? `<div class="video-feature-actions-v79">${renderVideoResourceButtons(video)}</div>` : ''}
    <section class="video-notes-card-v79 premium-card clean-notes-v82">
      <div class="video-notes-head-v79">
        <div><span class="eyebrow">Timestamp notes</span><h3>Auto-save notes</h3></div>
        <small id="videoNoteStatusV82">Write a note and it will save automatically.</small>
      </div>
      <textarea id="videoNoteTextV79" rows="3" placeholder="Type a note. It saves automatically and links to the current video time..."></textarea>
      <div class="video-notes-list-v79" id="videoNotesListV79"></div>
    </section>
    <button class="primary-btn" id="watchDone">Complete video +40 XP</button>
  `;
}

function bindCleanVideoModalV82(video) {
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
    attachAutoVideoNoteV82(video);
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
      if (typeof renderVideos === 'function') renderVideos();
      renderHomeSmartWidgetsV79();
      closeModal();
      if (wasCompleted) showToast('Video already completed');
    });
    $$('[data-open-highyield]').forEach(btn => btn.addEventListener('click', event => openVideoResource(event.currentTarget.dataset.openHighyield, 'highyield')));
    $$('[data-open-pdf]').forEach(btn => btn.addEventListener('click', event => downloadLecturePdf(event.currentTarget.dataset.openPdf)));
    renderVideoNotesV79(video);
  }, 0);
}

function openVideo(id) {
  const video = state.videos.find(v => String(v.id) === String(id));
  if (!video) return;
  recordVideoViewV79(video);
  showModal(renderCleanVideoModalBodyV82(video, { showResources: true }));
  bindCleanVideoModalV82(video);
}

function freeCoursesModalWatchHtml() {
  const course = getFreeCourse();
  const chapter = getFreeChapter();
  const lecture = getFreeLecture();
  if (!lecture) return freeCoursesModalLecturesHtml();
  const video = videoLikeFromFreeLectureV82(lecture, course, chapter);
  return `
    <div class="free-modal-watch-page clean-free-watch-v82">
      <div class="free-modal-watch-player only-video-v82">
        ${renderExternalVideoPlayer(lecture.url, lecture.title)}
      </div>
      <div class="free-watch-mini-actions-v82">
        <button class="soft-btn small" id="bookmarkVideoV79" type="button">${isVideoBookmarkedV79(video.id) ? 'Bookmarked' : 'Bookmark'}</button>
        ${(lecture.files || []).length ? renderFreeLectureResources(lecture) : ''}
      </div>
      <section class="video-notes-card-v79 premium-card clean-notes-v82">
        <div class="video-notes-head-v79">
          <div><span class="eyebrow">Timestamp notes</span><h3>Auto-save notes</h3></div>
          <small id="videoNoteStatusV82">Write a note and it will save automatically.</small>
        </div>
        <textarea id="videoNoteTextV79" rows="3" placeholder="Type a note. It saves automatically for this video..."></textarea>
        <div class="video-notes-list-v79" id="videoNotesListV79"></div>
      </section>
    </div>
  `;
}

function renderFreeCoursesModal() {
  const title = freeCoursesModalTitle();
  const backTarget = freeCoursesModalBackTarget();
  setModalVariant(state.freeCourseLevel === 'watch' ? 'free-course-watch-card' : 'free-courses-modal-card');
  $('#modalContent').innerHTML = `
    <div class="free-courses-modal-shell ${state.freeCourseLevel === 'watch' ? 'watch-only-shell-v82' : ''}">
      <div class="free-courses-modal-head ${state.freeCourseLevel === 'watch' ? 'watch-head-v82' : ''}">
        <button class="free-modal-back" type="button" data-free-modal-back="${esc(backTarget)}">${backTarget === 'close' ? '×' : '‹'}</button>
        ${state.freeCourseLevel === 'watch' ? '<div></div>' : `<div><span class="eyebrow">${esc(title.eyebrow)}</span><h2 id="modalTitle">${esc(title.title)}</h2><p>${esc(title.body)}</p></div>`}
        ${state.freeCourseLevel !== 'watch' && isAdmin() ? `<div class="free-modal-actions">${state.freeCourseLevel === 'courses' ? '<button class="soft-btn small" type="button" data-publish-public-content>Publish public snapshot</button><button class="primary-btn small" type="button" data-add-free-course>+ Course</button>' : state.freeCourseLevel === 'chapters' ? '<button class="primary-btn small" type="button" data-add-free-chapter>+ Chapter</button>' : '<button class="primary-btn small" type="button" data-add-free-lecture>+ Lecture</button>'}</div>` : '<div></div>'}
      </div>
      <div class="free-courses-modal-body">${freeCoursesModalBodyHtml()}</div>
    </div>`;
  bindFreeCoursesModalEvents();
  if (state.freeCourseLevel === 'watch') {
    const lecture = getFreeLecture();
    const video = videoLikeFromFreeLectureV82(lecture || {}, getFreeCourse(), getFreeChapter());
    if (lecture) {
      recordVideoViewV79(video);
      setTimeout(() => {
        bindNovaVideoControls({ id: video.id, url: lecture.url, title: lecture.title });
        $('#bookmarkVideoV79')?.addEventListener('click', () => {
          const active = bookmarkVideoV79(video);
          $('#bookmarkVideoV79').textContent = active ? 'Bookmarked' : 'Bookmark';
          showToast(active ? 'Lecture bookmarked' : 'Bookmark removed');
        });
        attachAutoVideoNoteV82(video);
        renderVideoNotesV79(video);
        $$('[data-download-free-file]').forEach(btn => btn.addEventListener('click', event => downloadFreeLectureFile(event.currentTarget.dataset.downloadFreeFile, event.currentTarget.dataset.freeFileId)));
      }, 0);
    }
  }
}

function renderBookmarksPanel() {
  const panel = $('#bookmarksPanel');
  if (!panel) return;
  const store = readFeatureStoreV79();
  const videos = Object.values(store.videoBookmarks || {});
  const questions = Object.values(store.questionBookmarks || {});
  const groups = new Map();
  videos.forEach(v => {
    const key = String(v.topic || v.course || 'General');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(v);
  });
  panel.innerHTML = `
    <div class="smart-panel-head-v79">
      <div><span class="eyebrow">Saved library</span><h2>Bookmarks</h2><p>Saved lectures are grouped by system; MCQs stay available below.</p></div>
      <div class="smart-mini-stat"><b>${videos.length + questions.length}</b><span>saved</span></div>
    </div>
    <div class="bookmark-columns-v79">
      <section>
        <h3>Lectures by system</h3>
        ${videos.length ? Array.from(groups.entries()).map(([system, list]) => `
          <details class="bookmark-system-v82">
            <summary><b>${esc(system)}</b><small>${list.length} lecture${list.length === 1 ? '' : 's'}</small></summary>
            ${list.map(v => `<button class="bookmark-row-v79" type="button" data-bookmark-video-open-v79="${esc(v.id).replace(/^free-/, '')}"><b>${esc(v.title)}</b><small>${esc(v.course)} • ${esc(v.topic)}</small></button>`).join('')}
          </details>
        `).join('') : '<p class="muted-small">No lecture bookmarks yet.</p>'}
      </section>
      <section><h3>Questions</h3>${questions.length ? questions.map(q => `<button class="bookmark-row-v79" type="button" data-bookmark-question-open-v79="${esc(q.id)}"><b>${esc(q.stem)}</b><small>${esc(q.course)} • ${esc(q.topic)}</small></button>`).join('') : '<p class="muted-small">No question bookmarks yet.</p>'}</section>
    </div>
  `;
  if (panel.dataset.bookmarkDelegatedV143 !== '1') {
    panel.dataset.bookmarkDelegatedV143 = '1';
    panel.addEventListener('click', event => {
      const videoBtn = event.target.closest('[data-bookmark-video-open-v79]');
      if (videoBtn) {
        const id = videoBtn.dataset.bookmarkVideoOpenV79;
        const asNumber = Number(id);
        if (Number.isFinite(asNumber) && state.videos.some(v => String(v.id) === String(asNumber))) openVideo(asNumber);
        else showToast('Open this from Free Courses library');
        return;
      }
      const questionBtn = event.target.closest('[data-bookmark-question-open-v79]');
      if (questionBtn) openQuestionPreviewV79(questionBtn.dataset.bookmarkQuestionOpenV79);
    });
  }
}
