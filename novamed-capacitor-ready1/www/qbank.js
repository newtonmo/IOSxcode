/* NovaMed v83 - QBank navigation, MCQ editor/player, mistakes, and question timers. */
function getQMode(id) {
  return qbankModes.find(mode => mode.id === id);
}
function getQCourse(modeId, courseId) {
  return activeQbankCourseTree()[modeId]?.find(course => course.id === courseId);
}
function resetQbankPath(level = 'modes') {
  state.qbankLevel = level;
  if (level === 'modes') {
    state.selectedQMode = null;
    state.selectedQCourse = null;
    state.selectedQTopic = null;
    state.selectedQSubtopic = null;
    state.selectedQNoteLibrary = null;
  }
  if (level === 'courses') {
    state.selectedQCourse = null;
    state.selectedQTopic = null;
    state.selectedQSubtopic = null;
    if (state.selectedQMode === 'focused') state.selectedQNoteLibrary = null;
  }
  if (level === 'topics') {
    state.selectedQTopic = null;
    state.selectedQSubtopic = null;
  }
  if (level === 'set') {
    state.selectedQSubtopic = null;
  }
  if (level === 'note-courses') {
    state.selectedQCourse = null;
    state.selectedQTopic = null;
    state.selectedQSubtopic = null;
    state.qbankLevel = 'courses';
  }
  renderQbank();
}

let activeQuestionPool = [];



const QBANK_FOLDER_INDEX_PATH = 'data/qbank/index.json';
const QBANK_FOLDER_ROOT = 'data/qbank/';
const EXTERNAL_QBANK_JSON_PATH = 'data/qbank-mcqs.json'; // legacy fallback

function qbankHumanTitle(value = '') {
  return String(value || '')
    .replace(/\.json$/i, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, c => c.toUpperCase()) || 'General';
}

function qbankLocalSlug(value = '') {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'question';
}

function normalizeQbankJsonPath(filePath = '', basePath = '') {
  let path = String(filePath || '').trim().replace(/\\/g, '/');
  if (!path) return '';
  if (/^https?:\/\//i.test(path) || path.startsWith('data/')) return path;
  if (path.startsWith('./data/')) return path.slice(2);
  if (path.startsWith('/data/')) return path.slice(1);
  const base = String(basePath || '').trim().replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
  if (base) return `${base}/${path}`.replace(/\/+/g, '/');
  return `${QBANK_FOLDER_ROOT}${path}`.replace(/\/+/g, '/');
}


function qbankStableImportedId({ mode, course, topic, lecture, stem }, index = 0) {
  const base = [mode || 'detailed', course || 'medicine', topic || 'general', lecture || 'lecture', stem || `q-${index + 1}`]
    .map(qbankLocalSlug)
    .join('-');
  return `json-${base}`.slice(0, 180);
}

function parseQbankIndexFiles(indexData) {
  if (Array.isArray(indexData)) {
    return indexData.map(path => normalizeQbankJsonPath(path)).filter(Boolean);
  }

  if (!indexData || typeof indexData !== 'object') return [];

  if (Array.isArray(indexData.files)) {
    return indexData.files.map(path => normalizeQbankJsonPath(path)).filter(Boolean);
  }

  if (Array.isArray(indexData.qbank)) {
    return indexData.qbank.flatMap(entry => {
      if (typeof entry === 'string') return [normalizeQbankJsonPath(entry)];
      if (!entry || typeof entry !== 'object') return [];
      const course = entry.course || entry.folder || '';
      const topic = entry.topic || entry.system || '';
      const base = [QBANK_FOLDER_ROOT.replace(/\/+$/, ''), course, topic].filter(Boolean).join('/');
      const files = Array.isArray(entry.files) ? entry.files : (entry.file ? [entry.file] : []);
      return files.map(file => normalizeQbankJsonPath(file, base));
    }).filter(Boolean);
  }

  // Optional nested format:
  // { "medicine": { "Cardio": ["arrhythmia.json", "heart-failure.json"] } }
  const files = [];
  Object.entries(indexData).forEach(([course, topics]) => {
    if (['version', 'updatedAt', 'updated_at', 'description'].includes(course)) return;
    if (!topics || typeof topics !== 'object' || Array.isArray(topics)) return;
    Object.entries(topics).forEach(([topic, topicFiles]) => {
      const list = Array.isArray(topicFiles) ? topicFiles : (typeof topicFiles === 'string' ? [topicFiles] : []);
      list.forEach(file => files.push(normalizeQbankJsonPath(file, `${QBANK_FOLDER_ROOT}${course}/${topic}`)));
    });
  });
  return files.filter(Boolean);
}



function qbankQuestionKey(question = {}) {
  if (question.id) return `id:${String(question.id)}`;
  return `stem:${String(question.stem || '').trim().toLowerCase()}`;
}

function qbankQuestionsSame(a = {}, b = {}) {
  const idA = a.id ? String(a.id) : '';
  const idB = b.id ? String(b.id) : '';
  if (idA && idB && idA === idB) return true;
  return String(a.stem || '').trim().toLowerCase() === String(b.stem || '').trim().toLowerCase();
}



async function fetchQbankJsonFile(path) {
  const response = await fetch(path, { cache: 'no-store' });
  if (!response.ok) throw new Error(`${path} HTTP ${response.status}`);
  return response.json();
}

async function loadLegacyQbankJson({ silent = false } = {}) {
  try {
    const data = await fetchQbankJsonFile(EXTERNAL_QBANK_JSON_PATH);
    const rows = Array.isArray(data) ? data : (Array.isArray(data.questions) ? data.questions : []);
    const count = mergeImportedQuestions(rows, { replace: false });
    if (!silent) showToast(count ? `Loaded ${count} MCQs from legacy JSON` : 'QBank already up to date');
    return count;
  } catch (error) {
    if (!silent) showToast('Could not load QBank JSON files');
    console.warn('NovaMed legacy QBank load failed:', error);
    return 0;
  }
}


function exportQbankJson() {
  const payload = (state.questions || []).map(q => ({
    mode: q.mode || 'detailed',
    course: q.course || '',
    topic: q.topic || '',
    lecture: q.lecture || '',
    stem: q.stem || '',
    options: q.options || [],
    correct: Number(q.correct || 0),
    explanation: q.explanation || '',
    wrong: q.wrong || [],
    takeaway: q.takeaway || ''
  }));
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `novamed-qbank-export-${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}



function bindQbankEvents() {
  $('#qbankSearch')?.addEventListener('input', renderQbank);
  $('#qbankGrid')?.addEventListener('click', event => {
    const addCourseBtn = event.target.closest('[data-add-qbank-course]');
    const editCourseBtn = event.target.closest('[data-edit-qbank-course]');
    const deleteCourseBtn = event.target.closest('[data-delete-qbank-course]');
    const addTopicBtn = event.target.closest('[data-add-qbank-topic]');
    const editTopicBtn = event.target.closest('[data-edit-qbank-topic]');
    const deleteTopicBtn = event.target.closest('[data-delete-qbank-topic]');
    const addQuestionBtn = event.target.closest('[data-add-question-context]');
    const editQuestionBtn = event.target.closest('[data-edit-question-id]');
    const deleteQuestionBtn = event.target.closest('[data-delete-question-id]');
    const addFocusNoteBtn = event.target.closest('[data-add-focus-note]');
    const editFocusNoteBtn = event.target.closest('[data-edit-focus-note-id]');
    const deleteFocusNoteBtn = event.target.closest('[data-delete-focus-note-id]');
    const modeBtn = event.target.closest('[data-qbank-mode]');
    const courseBtn = event.target.closest('[data-qbank-course]');
    const topicBtn = event.target.closest('[data-qbank-topic]');
    const backBtn = event.target.closest('[data-qbank-back]');
    const startBtn = event.target.closest('[data-start-qbank]');
    const subtopicBtn = event.target.closest('[data-qbank-subtopic]');
    const noteLibraryBtn = event.target.closest('[data-note-library]');
    const addSubtopicBtn = event.target.closest('[data-add-qbank-subtopic]');
    const deleteSubtopicBtn = event.target.closest('[data-delete-qbank-subtopic]');
    const resultCard = event.target.closest('[data-qbank-question-id]');

    if (addCourseBtn) { if (requireAdmin('add QBank courses')) openQbankCourseEditor(); return; }
    if (editCourseBtn) { if (requireAdmin('edit QBank courses')) openQbankCourseEditor(editCourseBtn.dataset.editQbankCourse); return; }
    if (deleteCourseBtn) { if (requireAdmin('delete QBank courses')) deleteQbankCourse(deleteCourseBtn.dataset.deleteQbankCourse); return; }
    if (addTopicBtn) { if (requireAdmin('add QBank topics')) openQbankTopicEditor(); return; }
    if (editTopicBtn) { if (requireAdmin('edit QBank topics')) openQbankTopicEditor(readDataValue(editTopicBtn.dataset.editQbankTopic)); return; }
    if (deleteTopicBtn) { if (requireAdmin('delete QBank topics')) deleteQbankTopic(readDataValue(deleteTopicBtn.dataset.deleteQbankTopic)); return; }
    if (addQuestionBtn) { if (requireAdmin('add MCQs')) openQuestionEditor(); return; }
    if (editQuestionBtn) { if (requireAdmin('edit MCQs')) openQuestionEditor(editQuestionBtn.dataset.editQuestionId); return; }
    if (deleteQuestionBtn) { if (requireAdmin('delete MCQs')) deleteQuestion(deleteQuestionBtn.dataset.deleteQuestionId); return; }
    if (addFocusNoteBtn) { if (requireAdmin('add focused notes')) openFocusNoteEditor(); return; }
    if (editFocusNoteBtn) { if (requireAdmin('edit focused notes')) openFocusNoteEditor(Number(editFocusNoteBtn.dataset.editFocusNoteId)); return; }
    if (deleteFocusNoteBtn) { if (requireAdmin('delete focused notes')) deleteFocusNote(Number(deleteFocusNoteBtn.dataset.deleteFocusNoteId)); return; }
    if (noteLibraryBtn) { state.selectedQNoteLibrary = noteLibraryBtn.dataset.noteLibrary; state.selectedQCourse = null; state.selectedQTopic = null; state.selectedQSubtopic = null; state.qbankLevel = 'courses'; renderQbank(); return; }
    if (addSubtopicBtn) { if (requireAdmin('add QBank lectures')) addQbankSubtopic(); return; }
    if (deleteSubtopicBtn) { if (requireAdmin('delete QBank lectures')) deleteQbankSubtopic(readDataValue(deleteSubtopicBtn.dataset.deleteQbankSubtopic)); return; }

    if (modeBtn) {
      state.selectedQMode = modeBtn.dataset.qbankMode;
      state.selectedQCourse = null;
      state.selectedQTopic = null;
      state.selectedQSubtopic = null;
      state.selectedQNoteLibrary = state.selectedQMode === 'focused' ? null : state.selectedQNoteLibrary;
      state.qbankLevel = 'courses';
      saveState();
      renderQbank();
      return;
    }
    if (courseBtn) {
      state.selectedQCourse = courseBtn.dataset.qbankCourse;
      state.selectedQTopic = null;
      state.selectedQSubtopic = null;
      state.qbankLevel = 'topics';
      saveState();
      renderQbank();
      return;
    }
    if (topicBtn) {
      state.selectedQTopic = readDataValue(topicBtn.dataset.qbankTopic);
      state.selectedQSubtopic = null;
      state.qbankLevel = 'set';
      saveState();
      renderQbank();
      return;
    }
    if (subtopicBtn) {
      state.selectedQSubtopic = readDataValue(subtopicBtn.dataset.qbankSubtopic);
      state.qbankLevel = 'set';
      saveState();
      // Do not auto-open MCQs when a lecture is selected. The student must press Open set.
      renderQbank();
      return;
    }
    if (backBtn) {
      if ($('#qbankSearch')) $('#qbankSearch').value = '';
      resetQbankPath(backBtn.dataset.qbankBack);
      return;
    }
    if (startBtn) {
      const pool = questionsFor({ mode: state.selectedQMode, course: state.selectedQCourse, topic: state.selectedQTopic, subtopic: state.selectedQSubtopic });
      if (!pool.length) { showToast('No MCQs in this set yet'); return; }
      if (state.selectedQMode !== 'focused' && (state.selectedQAnswerMode || 'exam') === 'exam' && typeof startGuidedQbankExamStyle === 'function') {
        startGuidedQbankExamStyle(pool);
      } else {
        openQbankSetPlayerModal(pool);
        showToast('Traditional mode opened');
      }
      return;
    }
    if (resultCard) {
      const q = qbankFindQuestionById(resultCard.dataset.qbankQuestionId);
      if (q) {
        activeQuestionPool = [q];
        renderQbankSearchQuestion(q);
      }
    }
  });
}

function openQbankCourseEditor(courseId = null) {
  const modeId = state.selectedQMode;
  const mode = getQMode(modeId);
  if (!modeId) { showToast('Choose Detailed or High Yield Notes first'); return; }
  const courses = activeQbankCourseTree()[modeId] || [];
  const editing = courses.find(course => course.id === courseId) || null;
  showModal(`
    <h2 id="modalTitle">${editing ? 'Edit QBank course' : 'Add QBank course'}</h2>
    <p class="modal-muted">This changes the course folders inside <b>${esc(mode?.title || 'this QBank')}</b>.</p>
    <form id="qbankCourseEditorForm" class="form-stack contextual-form">
      <input name="title" required placeholder="Course title, e.g. Dermatology" value="${esc(editing?.title || '')}" />
      <input name="subtitle" placeholder="Short subtitle/details" value="${esc(editing?.subtitle || '')}" />
      <input name="icon" maxlength="4" placeholder="Icon emoji, e.g. 🧠" value="${esc(editing?.icon || '❓')}" />
      <button class="primary-btn" type="submit">${editing ? 'Save course' : 'Create course'}</button>
    </form>
  `);
  $('#qbankCourseEditorForm')?.addEventListener('submit', event => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get('title') || '').trim();
    const subtitle = String(form.get('subtitle') || '').trim() || 'Custom QBank folder';
    const icon = String(form.get('icon') || '').trim() || '❓';
    if (!title) { showToast('Course title is required'); return; }
    updateQbankCourseTree(tree => {
      const list = tree[modeId] || [];
      if (editing) {
        const target = list.find(course => course.id === editing.id);
        if (target) { target.title = title; target.subtitle = subtitle; target.icon = icon; }
      } else {
        list.push({ id: uniqueCourseId(title, list), icon, title, subtitle, topics: [] });
      }
      tree[modeId] = list;
    });
    closeModal();
    showToast(editing ? 'QBank course updated' : 'QBank course added');
  });
}

function deleteQbankCourse(courseId) {
  const modeId = state.selectedQMode;
  const course = getQCourse(modeId, courseId);
  if (!course) return;
  const questionCount = modeId === 'focused' ? countFocusNotes({ course: courseId }) : countQuestions({ mode: modeId, course: courseId });
  const itemLabel = modeId === 'focused' ? 'focused note(s)' : 'MCQ(s)';
  const ok = confirm(`Delete ${course.title}? This will also remove ${questionCount} ${itemLabel} inside this course.`);
  if (!ok) return;
  updateQbankCourseTree(tree => {
    tree[modeId] = (tree[modeId] || []).filter(item => item.id !== courseId);
  });
  state.questions = state.questions.filter(q => !(q.mode === modeId && q.course === courseId));
  if (modeId === 'focused') state.focusNotes = state.focusNotes.filter(note => note.course !== courseId);
  state.selectedQCourse = null;
  state.selectedQTopic = null;
  state.qbankLevel = 'courses';
  saveState();
  renderQbank();
  showToast('QBank course deleted');
}

function openQbankTopicEditor(oldTopic = null) {
  const modeId = state.selectedQMode;
  const courseId = state.selectedQCourse;
  const course = getQCourse(modeId, courseId);
  if (!course) { showToast('Choose a QBank course first'); return; }
  showModal(`
    <h2 id="modalTitle">${oldTopic ? 'Edit QBank topic' : 'Add QBank topic'}</h2>
    <p class="modal-muted">Path: <b>${esc(currentQbankPathLabel({ mode: modeId, course: courseId, topic: oldTopic || 'New topic' }))}</b></p>
    <form id="qbankTopicEditorForm" class="form-stack contextual-form">
      <input name="title" required placeholder="Topic title, e.g. Rheumatology" value="${esc(oldTopic || '')}" />
      <button class="primary-btn" type="submit">${oldTopic ? 'Save topic' : 'Create topic'}</button>
    </form>
  `);
  $('#qbankTopicEditorForm')?.addEventListener('submit', event => {
    event.preventDefault();
    const title = String(new FormData(event.currentTarget).get('title') || '').trim();
    if (!title) { showToast('Topic title is required'); return; }
    updateQbankCourseTree(tree => {
      const target = (tree[modeId] || []).find(item => item.id === courseId);
      if (!target) return;
      const topics = (target.topics || []).map(topicTitle);
      if (oldTopic) {
        target.topics = topics.map(topic => topic === oldTopic ? title : topic);
        state.questions.forEach(q => {
          if (q.mode === modeId && q.course === courseId && q.topic === oldTopic) q.topic = title;
        });
        if (modeId === 'focused') state.focusNotes.forEach(note => {
          if (note.course === courseId && note.topic === oldTopic) note.topic = title;
        });
        if (state.selectedQTopic === oldTopic) state.selectedQTopic = title;
      } else if (!topics.some(topic => topic.toLowerCase() === title.toLowerCase())) {
        target.topics = [...topics, title];
      }
    });
    saveState();
    renderQbank();
    closeModal();
    showToast(oldTopic ? 'QBank topic updated' : 'QBank topic added');
  });
}

function deleteQbankTopic(topic) {
  const modeId = state.selectedQMode;
  const courseId = state.selectedQCourse;
  const questionCount = modeId === 'focused' ? countFocusNotes({ course: courseId, topic }) : countQuestions({ mode: modeId, course: courseId, topic });
  const itemLabel = modeId === 'focused' ? 'focused note(s)' : 'MCQ(s)';
  const ok = confirm(`Delete ${topic}? This will also remove ${questionCount} ${itemLabel} inside this topic.`);
  if (!ok) return;
  updateQbankCourseTree(tree => {
    const target = (tree[modeId] || []).find(item => item.id === courseId);
    if (target) target.topics = (target.topics || []).map(topicTitle).filter(item => item !== topic);
  });
  state.questions = state.questions.filter(q => !(q.mode === modeId && q.course === courseId && q.topic === topic));
  if (modeId === 'focused') state.focusNotes = state.focusNotes.filter(note => !(note.course === courseId && note.topic === topic));
  if (state.selectedQTopic === topic) state.selectedQTopic = null;
  state.qbankLevel = 'topics';
  saveState();
  renderQbank();
  showToast('QBank topic deleted');
}

function openQuestionEditor(questionId = null) {
  if (!questionId && state.selectedQMode === 'focused') {
    showToast('High Yield Notes uses notes, not MCQs');
    return;
  }
  const editing = state.questions.find(q => q.id === questionId) || null;
  if (!editing && !currentQbankPathReady()) {
    showToast('Open a specific QBank topic first, then add the MCQ there');
    return;
  }
  const path = editing ? currentQbankPathLabel(editing) : currentQbankPathLabel();
  const existingOptions = Array.isArray(editing?.options) && editing.options.length
    ? editing.options.map(x => String(x ?? ''))
    : ['', '', '', ''];
  const optionCount = Math.max(3, Math.min(6, existingOptions.length || 4));
  const options = Array.from({ length: 6 }, (_, index) => existingOptions[index] || '');
  const correctIndex = Math.max(0, Math.min(optionCount - 1, Number(editing?.correct ?? 0)));

  showModal(`
    <h2 id="modalTitle">${editing ? 'Edit MCQ' : 'Add MCQ here'}</h2>
    <p class="modal-muted">Path is automatic: <b>${esc(path)}</b>. Choose how many answer choices this MCQ needs.</p>
    <form id="contextQuestionForm" class="form-stack contextual-form question-editor-form">
      <select name="difficulty" aria-label="Difficulty">
        ${['Easy','Medium','Hard','High-yield'].map(level => `<option ${level === (editing?.difficulty || 'Medium') ? 'selected' : ''}>${level}</option>`).join('')}
      </select>

      <textarea name="stem" required placeholder="Question stem">${esc(editing?.stem || '')}</textarea>

      <div class="option-count-row">
        <label class="field-label">
          <span>Number of answer choices</span>
          <select name="optionCount" id="questionOptionCount" aria-label="Number of answer choices">
            ${[3,4,5,6].map(count => `<option value="${count}" ${count === optionCount ? 'selected' : ''}>${count} choices</option>`).join('')}
          </select>
        </label>
        <label class="field-label">
          <span>Correct answer</span>
          <select name="correct" id="questionCorrectSelect" aria-label="Correct answer"></select>
        </label>
      </div>

      <div class="question-options-area" id="questionOptionsArea">
        ${[0,1,2,3,4,5].map(i => `
          <label class="field-label option-field" data-option-field="${i}">
            <span>Option ${String.fromCharCode(65+i)}</span>
            <input name="option${i}" placeholder="Option ${String.fromCharCode(65+i)}" value="${esc(options[i] || '')}" />
          </label>
        `).join('')}
      </div>

      <textarea name="explanation" required placeholder="Detailed explanation">${esc(editing?.explanation || '')}</textarea>
      <textarea name="wrong" placeholder="Wrong-option analysis. Write one point per line.">${esc((editing?.wrong || []).join('\n'))}</textarea>
      <input name="takeaway" placeholder="High-yield takeaway" value="${esc(editing?.takeaway || '')}" />
      <button class="primary-btn" type="submit">${editing ? 'Save MCQ' : 'Add MCQ'}</button>
    </form>
  `);

  const countSelect = $('#questionOptionCount');
  const correctSelect = $('#questionCorrectSelect');
  const syncOptionFields = () => {
    const count = Math.max(3, Math.min(6, Number(countSelect?.value || 4)));
    $$('#questionOptionsArea [data-option-field]').forEach((wrap, index) => {
      const input = wrap.querySelector('input');
      const visible = index < count;
      wrap.hidden = !visible;
      if (input) input.required = visible;
    });
    const previous = Math.min(count - 1, Number(correctSelect?.value ?? correctIndex));
    if (correctSelect) {
      correctSelect.innerHTML = Array.from({ length: count }, (_, i) =>
        `<option value="${i}" ${i === previous ? 'selected' : ''}>${String.fromCharCode(65+i)} is correct</option>`
      ).join('');
    }
  };
  countSelect?.addEventListener('change', syncOptionFields);
  syncOptionFields();

  $('#contextQuestionForm')?.addEventListener('submit', event => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const contextMode = editing?.mode || state.selectedQMode;
    const contextCourse = editing?.course || state.selectedQCourse;
    const contextTopic = editing?.topic || state.selectedQTopic;
    const contextSubtopic = editing?.subtopic || state.selectedQSubtopic;
    const count = Math.max(3, Math.min(6, Number(form.get('optionCount') || 4)));
    const answerOptions = Array.from({ length: count }, (_, i) => String(form.get(`option${i}`) || '').trim());
    if (answerOptions.some(option => !option)) {
      showToast('Fill all visible answer choices');
      return;
    }
    const correct = Math.max(0, Math.min(count - 1, Number(form.get('correct') || 0)));
    const item = normalizeQuestion({
      ...(editing || {}),
      id: editing?.id || Date.now(),
      mode: contextMode,
      course: contextCourse,
      topic: contextTopic,
      subtopic: contextSubtopic,
      difficulty: form.get('difficulty') || 'Medium',
      stem: form.get('stem'),
      options: answerOptions,
      correct,
      explanation: form.get('explanation'),
      wrong: String(form.get('wrong') || '').split('\n').map(x => x.trim()).filter(Boolean),
      takeaway: form.get('takeaway') || 'Repeat the core concept until recognition becomes automatic.'
    });
    if (editing) {
      const idx = qbankFindQuestionIndexById(editing.id);
      if (idx >= 0) state.questions[idx] = item;
    } else {
      state.questions.unshift(item);
    }
    state.selectedQMode = item.mode;
    state.selectedQCourse = item.course;
    state.selectedQTopic = item.topic;
    state.qbankLevel = 'set';
    activeQuestionPool = questionsFor({ mode: item.mode, course: item.course, topic: item.topic });
    saveState();
    renderQbank();
    closeModal();
    showToast(editing ? 'MCQ updated' : 'MCQ added here');
  });
}
function deleteQuestion(id) {
  const q = qbankFindQuestionById(id);
  if (!q) return;
  if (!confirm('Delete this MCQ?')) return;
  state.questions = state.questions.filter(item => !qbankSameId(item.id, id));
  state.mistakes = (state.mistakes || []).filter(item => !qbankSameId(item.question?.id, id));
  activeQuestionPool = activeQuestionPool.filter(item => !qbankSameId(item.id, id));
  saveState();
  renderQbank();
  renderMistakes();
  showToast('MCQ deleted');
}

function renderQbankBreadcrumb(searching = false) {
  const bar = $('#qbankBreadcrumb');
  if (!bar) return;
  if (!searching) {
    bar.hidden = true;
    bar.innerHTML = '';
    return;
  }
  bar.hidden = false;
  bar.innerHTML = '<span class="crumb active">Search results</span>';
}

function renderQbank() {
  const grid = $('#qbankGrid');
  if (!grid) return;
  if (state.selectedQMode === 'focused') {
    state.selectedQMode = 'detailed';
    state.selectedQNoteLibrary = '';
    state.selectedQSubtopic = null;
    state.qbankLevel = 'courses';
    saveState();
  }
  renderQbankGuideControls();
  if (typeof renderHighYieldGuideControlsV122 === 'function') renderHighYieldGuideControlsV122();
  const search = ($('#qbankSearch')?.value || '').trim().toLowerCase();
  if (search) {
    const filtered = state.questions.filter(q => [q.stem, q.explanation, q.takeaway, q.topic, q.course, q.mode, q.difficulty].join(' ').toLowerCase().includes(search));
    renderQbankBreadcrumb(true);
    return renderQbankSearchList(filtered);
  }
  renderQbankBreadcrumb(false);
  // v149: The QBank page should stay as a clean launcher only.
  // Previously the last opened MCQ set remained rendered under the High-yield notes card,
  // which made items like "Congenital Heart Diseases" look nested under High-yield notes.
  // The guided dropdown still opens sets via modal; the landing grid remains empty.
  if (state.qbankLevel === 'set') {
    state.qbankLevel = 'guided';
    saveState();
  }
  return renderQbankGuidedOnly();
}

function renderQbankGuidedOnly() {
  const grid = $('#qbankGrid');
  if (!grid) return;
  activeQuestionPool = [];
  grid.className = 'qbank-library-grid guided-only-grid';
  grid.innerHTML = '';
}

function renderQbankModes() {
  const grid = $('#qbankGrid');
  grid.className = 'qbank-library-grid mode-grid';
  grid.innerHTML = qbankModes.map(mode => `
    <article class="hub-card mode-card premium-card" data-qbank-mode="${mode.id}">
      <div class="hub-icon">${mode.icon}</div>
      <div class="hub-content">
        <span class="eyebrow">${esc(mode.subtitle)}</span>
        <h2>${esc(mode.title)}</h2>
        <p>${esc(mode.description)}</p>
        <div class="hub-footer">
          <span class="tag">${mode.id === 'focused' ? `${countFocusNotes()} approach notes` : `${countQuestions({ mode: mode.id })} MCQs`}</span>
          <button class="node-action">${esc(mode.cta)}</button>
        </div>
      </div>
    </article>
  `).join('');
}


const highYieldNoteLibraries = [
  {
    id: 'hy-notes',
    icon: '🧠',
    title: 'High Yield Notes',
    subtitle: 'Approaches, diagnosis clues, and management ladders',
    description: 'Structured notes for each branch, system, and lecture.'
  },
  {
    id: 'black-keys',
    icon: '🗝️',
    title: 'Blab Keys',
    subtitle: 'Ultra-short exam keys and clue → answer triggers',
    description: 'Fast recall cards for the exact clue that unlocks the answer.'
  }
];

function getNoteLibrary(id = state.selectedQNoteLibrary) {
  return highYieldNoteLibraries.find(item => item.id === id) || null;
}

function renderHighYieldNoteLibraries() {
  const grid = $('#qbankGrid');
  if (!grid) return;
  grid.className = 'qbank-library-grid hy-library-grid';
  grid.innerHTML = `
    <div class="library-head premium-card">
      <button class="circle-mini" data-qbank-back="modes">‹</button>
      <div>
        <span class="eyebrow">High Yield Notes</span>
        <h2>Choose note style.</h2>
        <p>Before choosing Medicine or Pediatrics, pick the type of note library you want to review.</p>
      </div>
    </div>
    ${highYieldNoteLibraries.map(item => `
      <article class="hy-library-card premium-card" data-note-library="${esc(item.id)}">
        <div class="hy-library-icon">${esc(item.icon)}</div>
        <div>
          <span class="eyebrow">${esc(item.subtitle)}</span>
          <h3>${esc(item.title)}</h3>
          <p>${esc(item.description)}</p>
          <div class="meta-row">
            <span class="tag">${countFocusNotes({ library: item.id })} notes</span>
            <span class="tag">Branch → System → Lecture</span>
          </div>
        </div>
        <button class="node-action">Open</button>
      </article>
    `).join('')}
  `;
}

function focusSubtopicName(note = {}) {
  return String(note.subtopic || note.chapter || note.lecture || note.title || 'Core Notes').trim();
}

function getFocusNoteSubtopics({ library = state.selectedQNoteLibrary || 'hy-notes', course = state.selectedQCourse, topic = state.selectedQTopic } = {}) {
  const fromNotes = (state.focusNotes || [])
    .filter(note => {
      if (library && (note.library || 'hy-notes') !== library) return false;
      if (course && note.course !== course) return false;
      if (topic && note.topic !== topic) return false;
      return true;
    })
    .map(focusSubtopicName);
  const fromDefaults = defaultSubtopicsFor(course, topic);
  return [...new Set([...fromDefaults, ...fromNotes].map(x => String(x || '').trim()).filter(Boolean))];
}

function countFocusNotesInSubtopic(subtopic) {
  return focusNotesFor({
    library: state.selectedQNoteLibrary || 'hy-notes',
    course: state.selectedQCourse,
    topic: state.selectedQTopic,
    subtopic
  }).length;
}


function renderQbankCourses() {
  if (state.selectedQMode === 'focused' && !state.selectedQNoteLibrary) return renderHighYieldNoteLibraries();
  const mode = getQMode(state.selectedQMode);
  const noteLibrary = getNoteLibrary();
  const courses = activeQbankCourseTree()[state.selectedQMode] || [];
  const grid = $('#qbankGrid');
  grid.className = 'qbank-library-grid course-grid';
  grid.innerHTML = `
    <div class="library-head premium-card">
      <button class="circle-mini" data-qbank-back="modes">‹</button>
      <div><span class="eyebrow">${esc(state.selectedQMode === 'focused' ? (noteLibrary?.title || 'High Yield Notes') : (mode?.subtitle || 'QBank courses'))}</span><h2>${esc(state.selectedQMode === 'focused' ? 'Choose branch' : (mode?.title || 'QBank'))}</h2><p>${esc(state.selectedQMode === 'focused' ? 'Choose the branch first, then the system, then the lecture/note folder.' : 'Select the course. Admins can add, rename, or remove QBank folders here.')}</p></div>
      ${isAdmin() ? '<button class="primary-btn small" type="button" data-add-qbank-course>+ Course</button>' : ''}
    </div>
    ${courses.map(course => `
      <article class="hub-card course-card premium-card ${isAdmin() ? 'editable-card' : ''}" data-qbank-course="${course.id}">
        ${isAdmin() ? `<div class="card-admin-actions"><button class="tiny-btn" type="button" data-edit-qbank-course="${course.id}">Edit</button><button class="tiny-btn danger" type="button" data-delete-qbank-course="${course.id}">Delete</button></div>` : ''}
        <div class="hub-icon small">${course.icon}</div>
        <div class="hub-content">
          <h3>${esc(course.title)}</h3>
          <p>${esc(course.subtitle)}</p>
          <div class="topic-preview">${course.topics.slice(0, 4).map(topic => `<span>${esc(topicTitle(topic))}</span>`).join('')}</div>
          <div class="hub-footer"><span class="tag">${state.selectedQMode === 'focused' ? `${countFocusNotes({ library: state.selectedQNoteLibrary || 'hy-notes', course: course.id })} notes` : `${countQuestions({ mode: state.selectedQMode, course: course.id })} MCQs`}</span><button class="node-action">Open</button></div>
        </div>
      </article>
    `).join('') || `
      <div class="video-empty premium-card">
        <div class="hub-icon">❓</div>
        <h3>No courses yet</h3>
        <p>${isAdmin() ? 'Add the first QBank course folder.' : 'No public QBank courses have been added yet.'}</p>
        ${isAdmin() ? '<button class="primary-btn small" type="button" data-add-qbank-course>Add course</button>' : ''}
      </div>`}
  `;
}

function renderQbankTopics() {
  const mode = getQMode(state.selectedQMode);
  const course = getQCourse(state.selectedQMode, state.selectedQCourse);
  const topics = (course?.topics || []).map(topicTitle);
  const grid = $('#qbankGrid');
  grid.className = 'qbank-library-grid topic-grid';
  grid.innerHTML = `
    <div class="library-head premium-card">
      <button class="circle-mini" data-qbank-back="courses">‹</button>
      <div><span class="eyebrow">${esc(state.selectedQMode === 'focused' ? (getNoteLibrary()?.title || 'High Yield Notes') : (mode?.title || 'QBank'))}</span><h2>${esc(state.selectedQMode === 'focused' ? (course?.title || 'Topics').replace(/^Focused\s+/, '') : (course?.title || 'Topics'))}</h2>${isAdmin() ? `<p>${esc(state.selectedQMode === 'focused' ? 'Choose the system, then open its lecture/note folders.' : 'Choose the topic you want to solve. Admins can add, rename, or remove QBank topics here.')}</p>` : ''}</div>
      ${isAdmin() ? '<button class="primary-btn small" type="button" data-add-qbank-topic>+ Topic</button>' : ''}
    </div>
    ${topics.map(topic => `
      <article class="topic-card premium-card ${isAdmin() ? 'editable-card' : 'student-simple-topic'}" data-qbank-topic="${dataValue(topic)}">
        ${isAdmin() ? `<div class="card-admin-actions"><button class="tiny-btn" type="button" data-edit-qbank-topic="${dataValue(topic)}">Edit</button><button class="tiny-btn danger" type="button" data-delete-qbank-topic="${dataValue(topic)}">Delete</button></div>` : ''}
        <div>
          ${isAdmin() ? `<span class="eyebrow">${state.selectedQMode === 'focused' ? `${countFocusNotes({ library: state.selectedQNoteLibrary || 'hy-notes', course: state.selectedQCourse, topic })} approach notes` : `${countQuestions({ mode: state.selectedQMode, course: state.selectedQCourse, topic })} MCQs`}</span>` : ''}
          <h3>${esc(topic)}</h3>
          ${isAdmin() ? `<p>${state.selectedQMode === 'focused' ? 'Focused approaches, red-flag patterns, and rapid clue → diagnosis cards.' : 'Detailed concept-testing questions with deeper explanation.'}</p>` : ''}
        </div>
        <button class="node-action">${state.selectedQMode === 'focused' ? 'Review' : 'Solve'}</button>
      </article>
    `).join('') || `
      <div class="video-empty premium-card">
        <div class="hub-icon">🧩</div>
        <h3>No topics yet</h3>
        <p>${isAdmin() ? 'Add the first QBank topic inside this course.' : 'No topics have been added yet.'}</p>
        ${isAdmin() ? '<button class="primary-btn small" type="button" data-add-qbank-topic>Add topic</button>' : ''}
      </div>`}
  `;
}

function renderQbankSet() {
  if (state.selectedQMode === 'focused') return renderFocusedKnowledgeSet();
  const mode = getQMode(state.selectedQMode);
  const course = getQCourse(state.selectedQMode, state.selectedQCourse);
  const allTopicQuestions = questionsFor({ mode: state.selectedQMode, course: state.selectedQCourse, topic: state.selectedQTopic });
  const subtopics = getQbankSubtopics(state.selectedQMode, state.selectedQCourse, state.selectedQTopic);
  const grid = $('#qbankGrid');
  grid.className = 'qbank-library-grid qbank-set-grid';

  if (!state.selectedQSubtopic) {
    activeQuestionPool = [];
    grid.innerHTML = `
      <div class="library-head premium-card contextual-qbank-head">
        <button class="circle-mini" data-qbank-back="topics">‹</button>
        <div>
          <span class="eyebrow">${esc(mode?.title || 'QBank')} • ${esc(course?.title || '')}</span>
          <h2>${esc(state.selectedQTopic || 'Question set')}</h2>
          ${isAdmin() ? `<p>${allTopicQuestions.length} MCQs organized by lecture. Choose a lecture to start or manage MCQs.</p>` : ''}
        </div>
        ${isAdmin() ? `<div class="contextual-actions"><button class="primary-btn small" type="button" data-add-qbank-subtopic>+ Lecture</button><button class="soft-btn small" type="button" data-edit-qbank-topic="${dataValue(state.selectedQTopic)}">Edit topic</button></div>` : ''}
      </div>
      <div class="qbank-subtopic-grid">
        ${subtopics.map(sub => {
          const count = countQuestionsInSubtopic(sub);
          return `
            <article class="subtopic-card premium-card ${isAdmin() ? '' : 'student-simple-topic'}" data-qbank-subtopic="${dataValue(sub)}">
              ${isAdmin() ? '<div class="subtopic-icon">📁</div>' : ''}
              <div>
                ${isAdmin() ? '<span class="eyebrow">MCQ lecture</span>' : ''}
                <h3>${esc(sub)}</h3>
                ${isAdmin() ? `<p>${count} MCQs ready</p><div class="meta-row"><span class="tag">${count ? 'Start set' : 'Empty'}</span><span class="tag">Tutor mode</span></div>` : ''}
              </div>
              ${isAdmin() && !count ? `<button class="tiny-btn danger subtopic-delete" type="button" data-delete-qbank-subtopic="${dataValue(sub)}">Delete</button>` : ''}
            </article>
          `;
        }).join('')}
      </div>
    `;
    return;
  }

  const pool = questionsFor({ mode: state.selectedQMode, course: state.selectedQCourse, topic: state.selectedQTopic, subtopic: state.selectedQSubtopic });
  activeQuestionPool = [];
  const answerMode = 'Traditional';
  grid.innerHTML = `
    <div class="qset-action-card premium-card minimal-qbank-set-card selected-qbank-set-card-v105">
      <div class="qset-icon">🧠</div>
      <div>
        <span class="eyebrow">${esc(answerMode)}</span>
        <h3>${esc(state.selectedQSubtopic)}</h3>
        ${isAdmin() ? `<p>${pool.length} MCQs inside ${esc(state.selectedQTopic || 'this chapter')}. Admins can manage questions here.</p>` : ''}
        <div class="meta-row"><span class="tag">${pool.length} MCQs</span><span class="tag">${esc(answerMode)}</span></div>
      </div>
      <div class="contextual-actions"><button class="primary-btn small" data-start-qbank>Open set</button>${isAdmin() ? '<button class="soft-btn small" type="button" data-add-question-context>Add MCQ</button>' : ''}</div>
    </div>
    ${pool.length ? '' : `
      <div class="video-empty premium-card">
        <div class="hub-icon">❓</div>
        <h3>No questions here yet</h3>
        <p>${isAdmin() ? 'Add the first MCQ directly inside this selected set.' : 'No public questions have been added here yet.'}</p>
        ${isAdmin() ? '<button class="primary-btn small" id="emptyQuestionBtn" data-add-question-context>Add question here</button>' : ''}
      </div>
    `}
  `;
  $('#emptyQuestionBtn')?.addEventListener('click', () => {
    if (!requireAdmin('add questions')) return;
    openQuestionEditor();
  });
}

function openFocusNoteEditor(noteId = null) {
  if (state.selectedQMode !== 'focused' || !state.selectedQNoteLibrary || !state.selectedQCourse || !state.selectedQTopic || !state.selectedQSubtopic) {
    showToast('Open a High Yield Notes lecture folder first');
    return;
  }
  const editing = state.focusNotes.find(note => note.id === noteId) || null;
  showModal(`
    <h2 id="modalTitle">${editing ? 'Edit focused note' : 'Add focused note'}</h2>
    <p class="modal-muted">Path is automatic: <b>${esc(currentQbankPathLabel())}</b>. This is an approach/high-yield note, not an MCQ.</p>
    <form id="focusNoteForm" class="form-stack contextual-form focus-note-form">
      <input name="title" required placeholder="Title, e.g. Postpartum Haemorrhage" value="${esc(editing?.title || '')}" />
      <input name="subtitle" placeholder="Short subtitle" value="${esc(editing?.subtitle || '')}" />
      <textarea name="pearl" placeholder="Main rapid clue / exam pearl">${esc(editing?.pearl || '')}</textarea>
      <textarea name="patterns" placeholder="Rapid patterns, one per line. Example: Painless uterine bleeding → placenta previa">${esc((editing?.patterns || []).map(x => `${x.clue} → ${x.think}`).join('\n'))}</textarea>
      <textarea name="sections" placeholder="Sections format:\nDefinition\n- point one\n- point two\n\nApproach\n- point one">${esc(sectionsToText(editing?.sections || []))}</textarea>
      <textarea name="ladder" placeholder="Approach ladder / steps — one per line">${esc((editing?.ladder || []).join('\n'))}</textarea>
      <input name="takeaway" placeholder="Final high-yield takeaway" value="${esc(editing?.takeaway || '')}" />
      <button class="primary-btn" type="submit">${editing ? 'Save focused note' : 'Add focused note'}</button>
    </form>
  `);
  $('#focusNoteForm')?.addEventListener('submit', event => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    saveFocusNote({
      ...(editing || {}),
      id: editing?.id || Date.now(),
      mode: 'focused',
      library: editing?.library || state.selectedQNoteLibrary || 'hy-notes',
      course: state.selectedQCourse,
      topic: state.selectedQTopic,
      subtopic: editing?.subtopic || state.selectedQSubtopic,
      title: form.get('title'),
      subtitle: form.get('subtitle'),
      pearl: form.get('pearl'),
      patterns: parsePatterns(form.get('patterns')),
      sections: parseSections(form.get('sections')),
      ladder: parseLines(form.get('ladder')),
      takeaway: form.get('takeaway')
    });
    closeModal();
    renderQbank();
    showToast(editing ? 'Focused note updated' : 'Focused note added');
  });
}

function renderFocusedKnowledgeSet() {
  const mode = getQMode(state.selectedQMode);
  const course = getQCourse(state.selectedQMode, state.selectedQCourse);
  const library = getNoteLibrary();
  const grid = $('#qbankGrid');
  grid.className = 'qbank-library-grid focus-notes-grid';

  if (!state.selectedQSubtopic) {
    const subtopics = getFocusNoteSubtopics();
    grid.innerHTML = `
      <div class="library-head premium-card contextual-qbank-head focus-head">
        <button class="circle-mini" data-qbank-back="topics">‹</button>
        <div>
          <span class="eyebrow">${esc(library?.title || 'High Yield Notes')} • ${esc((course?.title || '').replace(/^Focused\s+/, ''))}</span>
          <h2>${esc(state.selectedQTopic || 'Focused notes')}</h2>
          <p>Choose a lecture/note folder. Each folder contains its own focused notes or Blab Keys.</p>
        </div>
      </div>
      <div class="focus-folder-grid">
        ${subtopics.map(sub => {
          const count = countFocusNotesInSubtopic(sub);
          return `
            <article class="focus-folder-card premium-card" data-qbank-subtopic="${dataValue(sub)}">
              <div class="focus-folder-icon">${library?.id === 'black-keys' ? '🗝️' : '📘'}</div>
              <div>
                <span class="eyebrow">${esc(library?.title || 'High Yield Notes')}</span>
                <h3>${esc(sub)}</h3>
                <p>${count} note${count === 1 ? '' : 's'} inside this lecture folder</p>
                <div class="meta-row"><span class="tag">Clue → answer</span><span class="tag">Approach</span></div>
              </div>
              <button class="node-action">Open</button>
            </article>
          `;
        }).join('')}
      </div>
    `;
    return;
  }

  const notes = focusNotesFor({ library: state.selectedQNoteLibrary || 'hy-notes', course: state.selectedQCourse, topic: state.selectedQTopic, subtopic: state.selectedQSubtopic });
  grid.innerHTML = `
    <div class="focus-approach-hero premium-card minimal-qbank-set-card">
      <div class="focus-orb">${library?.id === 'black-keys' ? '🗝️' : '🎯'}</div>
      <div>
        <span class="eyebrow">${esc(library?.title || 'High Yield Notes')}</span>
        <h3>${esc(state.selectedQSubtopic || 'Focused notes')}</h3>
        <p>${notes.length} note${notes.length === 1 ? '' : 's'} ready. Review clue → diagnosis patterns without extra pathway text.</p>
        <div class="meta-row"><span class="tag">${esc(state.selectedQTopic || 'Selected chapter')}</span><span class="tag">Rapid review</span></div>
      </div>
      ${isAdmin() ? '<div class="contextual-actions"><button class="primary-btn small" type="button" data-add-focus-note>+ Note</button></div>' : ''}
    </div>
    ${notes.map(focusNoteTemplate).join('') || `
      <div class="video-empty premium-card">
        <div class="hub-icon">🧠</div>
        <h3>No notes here yet</h3>
        <p>${isAdmin() ? 'Add the first note directly inside this selected lecture folder.' : 'No public high-yield notes have been added here yet.'}</p>
        ${isAdmin() ? '<button class="primary-btn small" type="button" data-add-focus-note>Add note</button>' : ''}
      </div>`}
  `;
}
function focusNoteTemplate(note) {
  const sections = (note.sections || []).map(section => `
    <section class="focus-section">
      <h4>${esc(section.heading)}</h4>
      <ul>${(section.points || []).map(point => `<li>${esc(point)}</li>`).join('')}</ul>
    </section>`).join('');
  const patterns = (note.patterns || []).length ? `
    <div class="pattern-board">
      ${(note.patterns || []).map(item => `<div class="pattern-row"><span>${esc(item.clue)}</span><b>→</b><strong>${esc(item.think)}</strong></div>`).join('')}
    </div>` : '';
  const ladder = (note.ladder || []).length ? `
    <div class="approach-ladder">
      ${(note.ladder || []).map((step, index) => `<div class="ladder-step"><span>${index + 1}</span><p>${esc(step)}</p></div>`).join('')}
    </div>` : '';
  return `
    <article class="focused-note-card premium-card ${isAdmin() ? 'editable-card' : ''}">
      ${isAdmin() ? `<div class="card-admin-actions"><button class="tiny-btn" type="button" data-edit-focus-note-id="${note.id}">Edit</button><button class="tiny-btn danger" type="button" data-delete-focus-note-id="${note.id}">Delete</button></div>` : ''}
      <div class="focus-title-row">
        <div><span class="eyebrow">${esc(note.topic)} • high-yield approach</span><h3>${esc(note.title)}</h3><p>${esc(note.subtitle)}</p></div>
        <div class="focus-badge">HY</div>
      </div>
      <div class="pearl-box"><span>⚡</span><p>${esc(note.pearl)}</p></div>
      ${patterns}
      ${ladder}
      <div class="focus-sections">${sections}</div>
      <div class="takeaway-box"><b>Last-minute takeaway</b><p>${esc(note.takeaway)}</p></div>
    </article>
  `;
}

function renderQbankSearchList(questions) {
  const grid = $('#qbankGrid');
  grid.className = 'qbank-library-grid qbank-search-grid';
  grid.innerHTML = `
    <div class="library-head premium-card">
      <button class="circle-mini" data-qbank-back="modes">‹</button>
      <div><span class="eyebrow">Search results</span><h2>${questions.length} matching questions</h2><p>Tap any question to open it in tutor mode.</p></div>
    </div>
    ${questions.map(q => qbankResultTemplate(q)).join('') || `
      <div class="video-empty premium-card">
        <div class="hub-icon">🔎</div>
        <h3>No matching questions</h3>
        <p>Try searching by topic, course, stem clue, or diagnosis.</p>
      </div>
    `}
  `;
}

function qbankResultTemplate(q) {
  const mode = getQMode(q.mode);
  const course = getQCourse(q.mode, q.course);
  return `
    <article class="qresult-card premium-card ${isAdmin() ? 'editable-card' : ''}" data-qbank-question-id="${qbankDataAttr(q.id)}">
      ${isAdmin() ? `<div class="card-admin-actions"><button class="tiny-btn" type="button" data-edit-question-id="${qbankDataAttr(q.id)}">Edit</button><button class="tiny-btn danger" type="button" data-delete-question-id="${qbankDataAttr(q.id)}">Delete</button></div>` : ''}
      <span class="eyebrow">${esc(mode?.title || q.mode)} • ${esc(course?.title || q.course)} • ${esc(q.topic)}</span>
      <h3>${esc(q.stem)}</h3>
      <div class="meta-row"><span class="tag">${esc(q.difficulty)}</span><span class="tag">${esc(q.options.length)} options</span><span class="tag">Tap to solve</span></div>
    </article>
  `;
}

function renderQbankSearchQuestion(question) {
  const grid = $('#qbankGrid');
  grid.className = 'qbank-library-grid qbank-set-grid';
  grid.innerHTML = `
    <div class="library-head premium-card">
      <button class="circle-mini" data-qbank-back="modes">‹</button>
      <div><span class="eyebrow">Search tutor mode</span><h2>${esc(question.topic)}</h2><p>Single-question review from search results.</p></div>
    </div>
    <div class="question-card premium-card" id="questionCard"></div>
  `;
  renderQuestion(0);
}


function openQbankSetPlayerModal(pool = []) {
  const safePool = Array.isArray(pool) ? pool : [];
  activeQuestionPool = safePool.length ? safePool : [];
  if (!activeQuestionPool.length) {
    showToast('No MCQs in this set yet');
    return;
  }

  $$('#qbankGrid #questionCard').forEach(node => node.remove());
  setModalVariant('qbank-set-modal-card');
  const pathParts = [state.selectedQCourse, state.selectedQTopic, state.selectedQSubtopic].filter(Boolean);
  const setTitle = state.selectedQSubtopic || state.selectedQTopic || 'QBank set';
  showModal(`
    <div class="qbank-set-player-shell">
      <header class="qbank-set-player-head">
        <button class="circle-mini" type="button" data-close-qbank-set aria-label="Back to QBank set">‹</button>
        <div class="qbank-set-title">
          <span class="eyebrow">QBank tutor mode</span>
          <h2 id="modalTitle">${esc(setTitle)}</h2>
          <p>${esc(pathParts.join(' • ') || 'Selected MCQ set')}</p>
        </div>
        <div class="qbank-set-count">
          <b>${activeQuestionPool.length}</b>
          <span>MCQs</span>
        </div>
      </header>
      <section class="qbank-set-stage" aria-label="QBank question player">
        <div class="question-card premium-card qbank-modal-question-card" id="questionCard"></div>
      </section>
    </div>
  `);
  $('#modalContent [data-close-qbank-set]')?.addEventListener('click', () => closeModal());
  renderQuestion(0);
}

let currentQuestionIndex = 0;
let qbankTimerInterval = null;
let qbankTimerRemaining = 80;
let QBANK_QUESTION_SECONDS = 80;

function formatQuestionTime(seconds) {
  const safe = Math.max(0, Number(seconds || 0));
  const minutes = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function stopQbankTimer() {
  if (qbankTimerInterval) {
    clearInterval(qbankTimerInterval);
    qbankTimerInterval = null;
  }
}

function setTimerDisplay(text, extraClass = '') {
  const pill = $('#questionTimer');
  if (!pill) return;
  pill.textContent = text;
  pill.classList.remove('timer-warn', 'timer-expired', 'timer-answered');
  if (extraClass) pill.classList.add(extraClass);
}

function startQbankTimer(q) {
  stopQbankTimer();
  qbankTimerRemaining = QBANK_QUESTION_SECONDS;
  setTimerDisplay(`⏱ ${formatQuestionTime(qbankTimerRemaining)}`);
  qbankTimerInterval = setInterval(() => {
    qbankTimerRemaining -= 1;
    const klass = qbankTimerRemaining <= 0 ? 'timer-expired' : qbankTimerRemaining <= 15 ? 'timer-warn' : '';
    setTimerDisplay(`⏱ ${formatQuestionTime(qbankTimerRemaining)}`, klass);
    if (qbankTimerRemaining <= 0) {
      stopQbankTimer();
      handleQuestionTimeout(q);
    }
  }, 1000);
}



function recordQbankAttempt(question, selectedIndex, options = {}) {
  const normalized = normalizeQuestion(question);
  const key = questionProgressKey(normalized);
  if (!key) return;
  const now = new Date().toISOString();
  const timedOut = Boolean(options.timedOut);
  const isCorrect = !timedOut && Number(selectedIndex) === Number(normalized.correct);
  state.qbankStats = normalizeQbankStats(state.qbankStats || {});
  const previous = state.qbankStats[key] || {};
  state.qbankStats[key] = normalizeQbankStats({
    [key]: {
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
    }
  })[key];
  state.qbankAttempts = normalizeQbankAttempts([
    ...(state.qbankAttempts || []),
    {
      id: `${key}-${now}`,
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
    }
  ]);
  if (typeof saveQbankAttemptToSupabase === 'function') {
    saveQbankAttemptToSupabase(normalized, selectedIndex, { ...options, timedOut, isCorrect, source: options.source || 'qbank' }).catch?.(() => {});
  }
}


async function handleQuestionTimeout(q) {
  const explanation = $('#explanationBox');
  if (!explanation || explanation.classList.contains('show')) return;
  revealQuestionFeedback(q, null, { timedOut: true });
  recordQbankAttempt(q, null, { timedOut: true });
  recordMistake(q, null);
  updateMistakeReviewOutcome(q, null, false);
  await window.awardStudentXpSecure?.('qbank_timeout', window.rewardQuestionKeyV148?.(q) || `timeout:${Date.now()}`, {
    source: 'qbank',
    course: q.course || '',
    chapter: q.chapter || '',
    lecture: q.lecture || '',
    topic: q.topic || ''
  }, { toast: 'Time is up — saved to My Mistakes +{xp} XP', duplicateToast: 'Time-out reward already counted' });
  saveState(); updateMiniStats(); renderMistakes();
  if (typeof renderAnalytics === 'function') renderAnalytics();
  if (typeof renderFlashcards === 'function') renderFlashcards();
  showToast('Time is up — saved to My Mistakes +2 XP');
}


async function handleAnswer(btn, q) {
  stopQbankTimer();
  const normalized = normalizeQuestion(q);
  const selected = Number(btn.dataset.answer);
  const isCorrect = selected === Number(normalized.correct);
  revealQuestionFeedback(normalized, selected);
  recordQbankAttempt(normalized, selected, { timedOut: false });

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
  saveState(); updateMiniStats(); renderMistakes();
  if (typeof renderAnalytics === 'function') renderAnalytics();
  if (typeof renderFlashcards === 'function') renderFlashcards();
  if (fromMistakeReview) {
    showToast(isCorrect ? 'Correct answer — mistake status updated' : 'The question remains in active mistakes');
  } else if (!isCorrect) {
    showToast('Saved to My Mistakes + Flashcards +6 XP');
  } else if (recovered) {
    showToast('Question recovered from weak review');
  } else {
    showToast('Correct +18 XP');
  }
}



function optionLabel(index) {
  return String.fromCharCode(65 + Number(index || 0));
}

function mistakeKey(question) {
  return String(question.id || question.stem).toLowerCase();
}

function recordMistake(question, selectedIndex) {
  if (typeof ensureStudyFeatureState === 'function') ensureStudyFeatureState();
  const normalized = normalizeQuestion(question);
  const key = question.__mistakeKey || mistakeKey(normalized);
  const existing = (state.mistakes || []).find(item => item.key === key);
  const snapshot = {
    id: normalized.id,
    mode: normalized.mode,
    course: normalized.course,
    topic: normalized.topic,
    lecture: normalized.lecture,
    subtopic: normalized.subtopic,
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
  const chosenText = selectedIndex === null || selectedIndex === undefined
    ? 'No answer before time expired'
    : `${optionLabel(selectedIndex)}: ${normalized.options[selectedIndex] || ''}`;
  const autoNote = `Your answer: ${chosenText}. Correct answer: ${optionLabel(normalized.correct)}: ${normalized.options[normalized.correct] || ''}.`;

  if (existing) {
    existing.question = snapshot;
    existing.selected = selectedIndex;
    existing.attempts = (existing.attempts || 1) + 1;
    existing.status = 'active';
    existing.correctReviewCount = 0;
    existing.updatedAt = new Date().toISOString();
    existing.autoNote = autoNote;
    if (!existing.personalNote) existing.personalNote = '';
  } else {
    state.mistakes = [
      {
        key,
        question: snapshot,
        selected: selectedIndex,
        attempts: 1,
        status: 'active',
        correctReviewCount: 0,
        autoNote,
        personalNote: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      ...(state.mistakes || [])
    ];
  }
  if (typeof saveQuestionMistakeToSupabase === 'function') {
    const cloudItem = (state.mistakes || []).find(item => item.key === key);
    if (cloudItem) saveQuestionMistakeToSupabase(cloudItem, { immediate: true }).catch?.(() => {});
  }
  if (typeof makeFlashcardFromQuestion === 'function') makeFlashcardFromQuestion(normalized);
}



function dataValue(value) {
  return encodeURIComponent(String(value ?? ''));
}
function readDataValue(value) {
  return decodeURIComponent(String(value ?? ''));
}

/* v145 structural hardening: QBank ids can be numbers or strings from JSON/Supabase. */
function qbankIdValue(id) {
  return String(id ?? '').trim();
}
function qbankSameId(a, b) {
  return qbankIdValue(a) === qbankIdValue(b);
}
function qbankDataAttr(value) {
  return typeof esc === 'function' ? esc(qbankIdValue(value)) : qbankIdValue(value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}
function qbankFindQuestionById(id) {
  return (state.questions || []).find(item => qbankSameId(item.id, id));
}
function qbankFindQuestionIndexById(id) {
  return (state.questions || []).findIndex(item => qbankSameId(item.id, id));
}

function baseCourseTitle(courseId) {
  const map = {
    medicine: 'Medicine',
    pediatrics: 'Pediatrics',
    surgery: 'Surgery',
    obstetrics: 'Obstetrics',
    microbiology: 'Microbiology',
    community: 'Community Medicine'
  };
  return map[courseId] || String(courseId || 'General');
}
function modeLabel(modeId) {
  return modeId === 'detailed' ? 'Detailed' : modeId === 'focused' ? 'Focused' : 'Review';
}
function mistakeCourseKey(item) {
  return normalizeQuestion(item.question || {}).course || 'general';
}
function mistakeSystemKey(item) {
  const q = normalizeQuestion(item.question || {});
  return q.topic || q.subject || 'General system';
}
function mistakeTopicKey(item) {
  const q = normalizeQuestion(item.question || {});
  const text = `${q.stem || ''} ${q.takeaway || ''} ${q.explanation || ''}`.toLowerCase();
  if (text.includes('aortic') || text.includes('murmur')) return 'Valvular murmurs';
  if (text.includes('atrial fibrillation') || text.includes('ecg')) return 'Arrhythmias & ECG';
  if (text.includes('pancreatitis')) return 'Acute pancreatitis';
  if (text.includes('asthma') || text.includes('copd') || text.includes('wheeze')) return 'Obstructive airway disease';
  if (text.includes('postpartum') || text.includes('pph') || text.includes('atony')) return 'Postpartum hemorrhage';
  if (text.includes('atls') || text.includes('airway')) return 'ATLS primary survey';
  if (text.includes('jaundice') || text.includes('neonate')) return 'Neonatal jaundice red flags';
  if (text.includes('case-control') || text.includes('cohort')) return 'Case-control vs cohort';
  if (text.includes('screening') || text.includes('sensitivity')) return 'Screening test principles';
  if (text.includes('staphylococcus') || text.includes('staph') || text.includes('gram')) return 'Gram-positive cocci';
  return q.takeaway ? q.takeaway.slice(0, 54) : (q.stem || 'Saved MCQ').slice(0, 54);
}
function groupBy(items, getter) {
  return items.reduce((acc, item) => {
    const key = getter(item) || 'General';
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});
}
function activeCount(items) {
  return items.filter(item => mistakeStatus(item) === 'active').length;
}

function latestDate(items) {
  const sorted = [...items].sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));
  const date = sorted[0]?.updatedAt || sorted[0]?.createdAt;
  return date ? new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Today';
}
function resetMistakeView(level = 'courses') {
  mistakeView.level = level;
  if (level === 'courses') {
    mistakeView.course = null;
    mistakeView.system = null;
    mistakeView.topic = null;
  }
  if (level === 'systems') {
    mistakeView.system = null;
    mistakeView.topic = null;
  }
  if (level === 'topics') {
    mistakeView.topic = null;
  }
  renderMistakes();
}
function filteredMistakes() {
  let items = state.mistakes || [];
  if (mistakeView.course) items = items.filter(item => mistakeCourseKey(item) === mistakeView.course);
  if (mistakeView.system) items = items.filter(item => mistakeSystemKey(item) === mistakeView.system);
  if (mistakeView.topic) items = items.filter(item => mistakeTopicKey(item) === mistakeView.topic);
  return items;
}
function ensureMistakeViewValid() {
  const mistakes = state.mistakes || [];
  if (!mistakes.length) {
    mistakeView = { level: 'courses', course: null, system: null, topic: null };
    return;
  }
  if (mistakeView.course && !mistakes.some(item => mistakeCourseKey(item) === mistakeView.course)) resetMistakeView('courses');
  if (mistakeView.system && !mistakes.some(item => mistakeCourseKey(item) === mistakeView.course && mistakeSystemKey(item) === mistakeView.system)) resetMistakeView('systems');
  if (mistakeView.topic && !mistakes.some(item => mistakeCourseKey(item) === mistakeView.course && mistakeSystemKey(item) === mistakeView.system && mistakeTopicKey(item) === mistakeView.topic)) resetMistakeView('topics');
}
function bindMistakeEvents() {
  const list = $('#mistakesList');
  if (!list || list.dataset.mistakeEventsV102 === '1') return;
  list.dataset.mistakeEventsV102 = '1';
  list.addEventListener('click', async event => {
    const backBtn = event.target.closest('[data-mistake-back]');
    const courseBtn = event.target.closest('[data-mistake-course]');
    const systemBtn = event.target.closest('[data-mistake-system]');
    const topicBtn = event.target.closest('[data-mistake-topic]');
    const startReviewBtn = event.target.closest('[data-start-mistake-review]');
    const practiceGroupBtn = event.target.closest('[data-practice-mistake-group]');
    const practiceBtn = event.target.closest('[data-practice-mistake]');
    const explanationBtn = event.target.closest('[data-review-explanation]');
    const masteredBtn = event.target.closest('[data-mark-mastered]');
    const reviewedBtn = event.target.closest('[data-mark-reviewed]');

    if (backBtn) {
      resetMistakeView(backBtn.dataset.mistakeBack);
      return;
    }
    if (courseBtn) {
      mistakeView.course = readDataValue(courseBtn.dataset.mistakeCourse);
      mistakeView.system = null;
      mistakeView.topic = null;
      mistakeView.level = 'systems';
      renderMistakes();
      return;
    }
    if (systemBtn) {
      mistakeView.system = readDataValue(systemBtn.dataset.mistakeSystem);
      mistakeView.topic = null;
      mistakeView.level = 'topics';
      renderMistakes();
      return;
    }
    if (topicBtn) {
      mistakeView.topic = readDataValue(topicBtn.dataset.mistakeTopic);
      mistakeView.level = 'questions';
      renderMistakes();
      return;
    }
    if (startReviewBtn || practiceGroupBtn) {
      const group = filteredMistakes();
      const activeGroup = group.filter(item => mistakeStatus(item) === 'active');
      const reviewableGroup = group.filter(item => mistakeStatus(item) !== 'mastered');
      startMistakeReviewSession(activeGroup.length ? activeGroup : reviewableGroup);
      return;
    }
    if (practiceBtn) {
      const item = (state.mistakes || []).find(m => m.key === practiceBtn.dataset.practiceMistake);
      if (item?.question) startMistakeReviewSession([item]);
      return;
    }
    if (explanationBtn) {
      const item = (state.mistakes || []).find(m => m.key === explanationBtn.dataset.reviewExplanation);
      if (item?.question) showMistakeExplanationModal(item);
      return;
    }
    if (masteredBtn) {
      const item = (state.mistakes || []).find(m => m.key === masteredBtn.dataset.markMastered);
      if (item) {
        item.status = 'mastered';
        item.correctReviewCount = Math.max(2, Number(item.correctReviewCount || 0));
        item.masteredAt = new Date().toISOString();
        item.updatedAt = new Date().toISOString();
        saveState();
        if (typeof saveQuestionMistakeToSupabase === 'function') saveQuestionMistakeToSupabase(item, { immediate: true }).catch?.(() => {});
        renderProfileStats();
        window.queueNovaMedCloudUiRefreshV143?.('mistake-mastered-local', { leaderboard: true, delay: 40 });
        renderMistakes();
        showToast('Moved to mastered mistakes');
      }
      return;
    }
    if (reviewedBtn) {
      const item = (state.mistakes || []).find(m => m.key === reviewedBtn.dataset.markReviewed);
      if (item) {
        item.status = mistakeStatus(item) === 'reviewed' ? 'active' : 'reviewed';
        item.updatedAt = new Date().toISOString();
        if (item.status === 'reviewed') {
          await window.awardStudentXpSecure?.('mistake_reviewed', window.rewardEventKeyV148?.(['mistake-mark-reviewed', item.key]) || `mistake-mark-reviewed:${item.key}`, { mistake_key: item.key || '', source: 'my_mistakes' }, { toast: 'Mistake reviewed +{xp} XP', duplicateToast: 'Mistake review reward already counted' });
        }
        saveState();
        if (typeof saveQuestionMistakeToSupabase === 'function') saveQuestionMistakeToSupabase(item, { immediate: true }).catch?.(() => {});
        renderProfileStats();
        window.queueNovaMedCloudUiRefreshV143?.('mistake-reviewed-local', { leaderboard: true, delay: 40 });
        renderMistakes();
        if (item.status !== 'reviewed') showToast('Moved back to active mistakes');
      }
      return;
    }
  });

  list.addEventListener('input', event => {
    const note = event.target.closest('[data-mistake-note]');
    if (!note) return;
    const item = (state.mistakes || []).find(m => m.key === note.dataset.mistakeNote);
    if (item) {
      item.personalNote = note.value;
      item.updatedAt = new Date().toISOString();
      saveState();
      window.queueNovaMedCloudUiRefreshV143?.('mistake-note-local', { delay: 180 });
      if (typeof saveQuestionMistakeToSupabase === 'function') saveQuestionMistakeToSupabase(item).catch?.(() => {});
    }
  });

  $('#clearReviewedMistakes')?.addEventListener('click', () => {
    normalizeMistakeStateV102();
    saveState();
    renderProfileStats();
    renderMistakes();
    showToast('Mistake list refreshed');
  });
}


function renderMistakes() {
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


function mistakeBreadcrumb(current) {
  const pieces = [`<button class="crumb ${mistakeView.level === 'courses' ? 'active' : ''}" data-mistake-back="courses">My Mistakes</button>`];
  if (mistakeView.course) pieces.push(`<button class="crumb ${mistakeView.level === 'systems' ? 'active' : ''}" data-mistake-back="systems">${esc(baseCourseTitle(mistakeView.course))}</button>`);
  if (mistakeView.system) pieces.push(`<button class="crumb ${mistakeView.level === 'topics' ? 'active' : ''}" data-mistake-back="topics">${esc(mistakeView.system)}</button>`);
  if (mistakeView.topic) pieces.push(`<span class="crumb active">${esc(mistakeView.topic)}</span>`);
  return `
    <div class="mistake-review-nav">
      <div class="video-breadcrumb compact">${pieces.join('')}</div>
      <div class="review-scope-pill">${current.length} saved MCQ${current.length === 1 ? '' : 's'}</div>
    </div>
  `;
}

function renderMistakeCourses(items) {
  const grouped = groupBy(items, mistakeCourseKey);
  return `<div class="mistake-hierarchy-grid">${Object.entries(grouped).map(([course, group]) => {
    const groupedSystems = Object.keys(groupBy(group, mistakeSystemKey));
    return `
      <article class="mistake-folder course-folder" data-mistake-course="${dataValue(course)}">
        <div class="folder-icon">${courseIcon(course)}</div>
        <div class="folder-main">
          <h3>${esc(baseCourseTitle(course))}</h3>
          <div class="folder-meta"><span>${activeCount(group)} active</span><span>${group.length} total</span><span>${groupedSystems.length} systems</span></div>
        </div>
        <div class="folder-arrow">›</div>
      </article>
    `;
  }).join('')}</div>`;
}

function renderMistakeSystems(items) {
  const grouped = groupBy(items, mistakeSystemKey);
  return `
    <div class="library-head premium-card compact-head profile-review-head-v109">
      <button class="circle-mini" data-mistake-back="courses">‹</button>
      <div><h2>Choose system</h2></div>
    </div>
    <div class="mistake-hierarchy-grid">${Object.entries(grouped).map(([system, group]) => `
      <article class="mistake-folder system-folder" data-mistake-system="${dataValue(system)}">
        <div class="folder-icon">${systemIcon(system)}</div>
        <div class="folder-main">
          <h3>${esc(system)}</h3>
          <p>${activeCount(group)} active mistake${activeCount(group) === 1 ? '' : 's'}</p>
          <div class="folder-meta"><span>${group.length} MCQs</span><span>${Object.keys(groupBy(group, mistakeTopicKey)).length} lectures</span></div>
        </div>
        <div class="folder-arrow">›</div>
      </article>
    `).join('')}</div>
  `;
}

function renderMistakeTopics(items) {
  const grouped = groupBy(items, mistakeTopicKey);
  return `
    <div class="library-head premium-card compact-head profile-review-head-v109">
      <button class="circle-mini" data-mistake-back="systems">‹</button>
      <div><h2>Choose lecture</h2></div>
    </div>
    <div class="mistake-hierarchy-grid">${Object.entries(grouped).map(([topic, group]) => `
      <article class="mistake-folder topic-folder" data-mistake-topic="${dataValue(topic)}">
        <div class="folder-icon">🎯</div>
        <div class="folder-main">
          <h3>${esc(topic)}</h3>
          <p>${group.length} saved MCQ${group.length === 1 ? '' : 's'}</p>
          <div class="folder-meta"><span>${activeCount(group)} active</span></div>
        </div>
        <div class="folder-arrow">›</div>
      </article>
    `).join('')}</div>
  `;
}

function renderMistakeQuestions(items) {
  const activeItems = items.filter(item => mistakeStatus(item) === 'active');
  const masteredItems = items.filter(item => mistakeStatus(item) === 'mastered');
  const reviewItems = items.filter(item => mistakeStatus(item) !== 'mastered');
  return `
    <div class="library-head premium-card compact-head profile-review-head-v109">
      <button class="circle-mini" data-mistake-back="topics">‹</button>
      <div><h2>${esc(mistakeView.topic)}</h2></div>
      <button class="primary-btn small" type="button" data-practice-mistake-group>${activeItems.length ? 'Start review' : 'Quiz this group'}</button>
    </div>
    <div class="mistake-section-title"><b>mistakes to review</b><span>${reviewItems.length}</span></div>
    <div class="mistake-question-list">${reviewItems.map(mistakeTemplate).join('') || '<div class="mistake-empty small">No active mistakes in this lecture.</div>'}</div>
    ${masteredItems.length ? `<div class="mistake-section-title mastered-title"><b>Mastered mistakes</b><span>${masteredItems.length}</span></div><div class="mistake-question-list mastered-list">${masteredItems.map(mistakeTemplate).join('')}</div>` : ''}
  `;
}


function courseIcon(course) {
  return ({ medicine:'🩺', pediatrics:'👶', surgery:'🛠️', obstetrics:'🤰', microbiology:'🧫', community:'🌍' })[course] || '📚';
}
function systemIcon(system) {
  const text = String(system || '').toLowerCase();
  if (text.includes('cardio')) return '🫀';
  if (text.includes('git') || text.includes('abdomen')) return '🧬';
  if (text.includes('resp')) return '🫁';
  if (text.includes('neonat')) return '👶';
  if (text.includes('trauma')) return '🩹';
  if (text.includes('emerg')) return '🚨';
  if (text.includes('study') || text.includes('screen')) return '📊';
  if (text.includes('bacter') || text.includes('micro')) return '🦠';
  return '📌';
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



/* v87: unified external JSON QBank loader, validation, import, and per-option explanations */
const QBANK_IMPORTED_LOCAL_KEY_V87 = 'novamed-imported-qbank-v87';

function qbankCleanIdV87(value = '') {
  return String(value || '').trim();
}

function qbankSameTextV87(a = '', b = '') {
  return String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
}

function qbankTitleFromFilenameV87(path = '') {
  const file = String(path || '').split('?')[0].split('/').pop() || '';
  return qbankHumanTitle(file.replace(/\.json$/i, ''));
}

function qbankContextFromPath(filePath = '') {
  let path = String(filePath || '').split('?')[0].replace(/\\/g, '/');
  const parts = path.split('/').filter(Boolean);
  const qbankIndex = parts.findIndex(part => part.toLowerCase() === 'qbank');
  const scoped = qbankIndex >= 0 ? parts.slice(qbankIndex + 1) : parts;
  const file = scoped[scoped.length - 1] || '';
  return {
    course: scoped[0] || '',
    topic: scoped[1] || '',
    lecture: qbankTitleFromFilenameV87(file)
  };
}

function normalizeQuestion(question = {}) {
  const mode = question.mode || 'detailed';
  const course = qbankCleanIdV87(question.course || inferQuestionCourse({ ...question, mode }) || 'medicine');
  const topic = qbankCleanIdV87(question.topic || question.system || inferQuestionTopic({ ...question, mode, course }) || 'General');
  const lecture = qbankCleanIdV87(question.lecture || question.subtopic || question.chapter || question.unit || 'General');
  const cleanedOptions = Array.isArray(question.options)
    ? question.options.map(x => String(x ?? '').trim()).filter(Boolean).slice(0, 6)
    : ['', '', '', ''];
  const options = cleanedOptions.length >= 3 ? cleanedOptions : ['', '', '', ''];
  const correctRaw = Number(question.correct ?? 0);
  const correct = Math.max(0, Math.min(options.length - 1, Number.isFinite(correctRaw) ? correctRaw : 0));
  const optionExplanations = Array.isArray(question.optionExplanations)
    ? question.optionExplanations.map(x => String(x ?? '').trim())
    : [];
  const wrong = Array.isArray(question.wrong)
    ? question.wrong.map(x => String(x ?? '').trim()).filter(Boolean)
    : ['Review why the other options do not match the stem.'];
  return {
    ...question,
    mode,
    course,
    topic,
    lecture,
    subtopic: lecture,
    difficulty: question.difficulty || 'Medium',
    options,
    correct,
    optionExplanations,
    correctExplanation: String(question.correctExplanation || question.whyCorrect || optionExplanations[correct] || question.explanation || '').trim(),
    wrong,
    takeaway: question.takeaway || 'Focus on the key clue in the question stem.'
  };
}

function mergeQuestionDefaults(savedQuestions = []) {
  return (Array.isArray(savedQuestions) ? savedQuestions : [])
    .map(normalizeQuestion)
    .filter(q => q.stem && Array.isArray(q.options) && q.options.length >= 3);
}

function qbankBuildOptionExplanationsV87(raw = {}, correct = 0, options = []) {
  if (Array.isArray(raw.optionExplanations)) {
    const clean = raw.optionExplanations.map(x => String(x ?? '').trim());
    while (clean.length < options.length) clean.push('');
    return clean.slice(0, options.length);
  }
  const wrong = Array.isArray(raw.wrong)
    ? raw.wrong.map(x => String(x ?? '').trim())
    : String(raw.wrong || raw.wrong_explanations || '').split('|').map(x => x.trim()).filter(Boolean);
  const output = [];
  let wrongIndex = 0;
  options.forEach((_, index) => {
    if (index === correct) output[index] = String(raw.correctExplanation || raw.whyCorrect || raw.why_correct || 'This option matches the key clues in the stem.').trim();
    else output[index] = wrong[wrongIndex++] || 'This option does not match the key clues in the stem.';
  });
  return output;
}

function qbankValidationErrorsV87(data, context = {}) {
  const errors = [];
  const wrapper = (!Array.isArray(data) && data && typeof data === 'object') ? data : {};
  const course = qbankCleanIdV87(wrapper.course || context.course);
  const topic = qbankCleanIdV87(wrapper.topic || wrapper.system || context.topic);
  const lecture = qbankCleanIdV87(wrapper.lecture || context.lecture);
  const rows = Array.isArray(data) ? data : (Array.isArray(wrapper.questions) ? wrapper.questions : null);

  if (!course) errors.push('Missing course');
  if (!topic) errors.push('Missing topic');
  if (!lecture) errors.push('Missing lecture');
  if (!Array.isArray(rows)) errors.push('Missing questions array');

  if (Array.isArray(rows)) {
    rows.forEach((question, index) => {
      const label = `Question ${index + 1}`;
      if (!question || typeof question !== 'object') {
        errors.push(`${label}: invalid question object`);
        return;
      }
      if (!String(question.stem || question.question || '').trim()) errors.push(`${label}: Question missing stem`);
      const options = Array.isArray(question.options)
        ? question.options.map(x => String(x ?? '').trim()).filter(Boolean)
        : [question.option_a, question.option_b, question.option_c, question.option_d, question.option_e, question.option_f].map(x => String(x ?? '').trim()).filter(Boolean);
      if (!Array.isArray(options) || options.length < 3) errors.push(`${label}: Question missing options`);
      const correct = Number(question.correct ?? question.correctIndex ?? question.correct_index ?? question.answer ?? question.correct_answer);
      if (!Number.isInteger(correct) || correct < 0 || correct >= options.length) errors.push(`${label}: Invalid correct index`);
    });
  }

  return { errors, rows: rows || [], course, topic, lecture, wrapper };
}

function extractQbankRows(data, filePath = '', overrideContext = {}) {
  const pathContext = qbankContextFromPath(filePath);
  const wrapper = (!Array.isArray(data) && data && typeof data === 'object') ? data : {};
  const context = {
    sourcePath: filePath,
    mode: wrapper.mode || overrideContext.mode || 'detailed',
    course: wrapper.course || overrideContext.course || pathContext.course || 'medicine',
    topic: wrapper.topic || wrapper.system || overrideContext.topic || pathContext.topic || 'General',
    lecture: wrapper.lecture || overrideContext.lecture || pathContext.lecture || 'General'
  };
  const validation = qbankValidationErrorsV87(data, context);
  if (validation.errors.length) {
    const error = new Error(validation.errors.join('\n'));
    error.validationErrors = validation.errors;
    throw error;
  }
  return validation.rows.map(raw => ({ ...raw, __qbankContext: context }));
}

function prepareImportedQuestion(raw, index = 0, context = {}) {
  const options = Array.isArray(raw.options)
    ? raw.options.map(x => String(x ?? '').trim()).filter(Boolean).slice(0, 6)
    : [raw.option_a, raw.option_b, raw.option_c, raw.option_d, raw.option_e, raw.option_f].map(x => String(x ?? '').trim()).filter(Boolean).slice(0, 6);
  const mode = raw.mode || context.mode || 'detailed';
  const course = qbankCleanIdV87(raw.course || context.course || 'medicine');
  const topic = qbankCleanIdV87(raw.topic || raw.system || context.topic || 'General');
  const lecture = qbankCleanIdV87(raw.lecture || context.lecture || 'General');
  const stem = String(raw.stem || raw.question || '').trim();
  const correct = Number(raw.correct ?? raw.correctIndex ?? raw.correct_index ?? raw.answer ?? raw.correct_answer);
  const optionExplanations = qbankBuildOptionExplanationsV87(raw, correct, options);
  const wrong = optionExplanations.filter((_, i) => i !== correct).filter(Boolean);
  return normalizeQuestion({
    id: raw.id || qbankStableImportedId({ mode, course, topic, lecture, stem }, index),
    mode,
    course,
    topic,
    lecture,
    subtopic: lecture,
    difficulty: raw.difficulty || 'Medium',
    stem,
    options,
    correct,
    explanation: raw.explanation || raw.explain || '',
    optionExplanations,
    correctExplanation: optionExplanations[correct] || raw.correctExplanation || raw.explanation || '',
    wrong,
    takeaway: raw.takeaway || raw.high_yield || raw.highYield || 'Review this concept again.',
    sourcePath: context.sourcePath || raw.sourcePath || '',
    qbankSource: context.sourcePath ? 'file' : (raw.qbankSource || 'import')
  });
}

function qbankLectureName(question = {}) {
  return qbankCleanIdV87(question.lecture || question.subtopic || 'General');
}

function questionsFor({ mode, course, topic, subtopic, lecture } = {}) {
  if (typeof ensureSupplementalMcqsV73 === 'function') ensureSupplementalMcqsV73();
  const wantedLecture = lecture || subtopic || '';
  return (state.questions || []).map(normalizeQuestion).filter(question => {
    if (mode && question.mode !== mode) return false;
    if (course && question.course !== course) return false;
    if (topic && !qbankSameTextV87(question.topic, topic)) return false;
    if (wantedLecture) {
      const lectureNames = [question.lecture, question.subtopic, qbankLectureName(question)].filter(Boolean);
      if (!lectureNames.some(name => qbankSameTextV87(name, wantedLecture))) return false;
    }
    return true;
  });
}

function countQuestions(filter) {
  return questionsFor(filter).length;
}

function getQbankSubtopics(mode = state.selectedQMode, course = state.selectedQCourse, topic = state.selectedQTopic) {
  return [...new Set(questionsFor({ mode, course, topic }).map(qbankLectureName).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));
}

function countQuestionsInSubtopic(subtopic) {
  return questionsFor({ mode: state.selectedQMode, course: state.selectedQCourse, topic: state.selectedQTopic, lecture: subtopic }).length;
}

function ensureQbankTreeFromQuestions(questions = []) {
  const icons = { medicine: '🩺', pediatrics: '👶', surgery: '🛠️', obstetrics: '🤰', microbiology: '🧫', community: '🌍' };
  const detailed = [];
  (questions || []).map(normalizeQuestion).filter(q => q.mode !== 'focused').forEach(question => {
    if (!question.course || !question.topic) return;
    let course = detailed.find(item => item.id === question.course);
    if (!course) {
      course = { id: question.course, icon: icons[question.course] || '📚', title: qbankHumanTitle(question.course), subtitle: 'External JSON QBank', topics: [] };
      detailed.push(course);
    }
    if (!course.topics.some(topic => qbankSameTextV87(topic, question.topic))) course.topics.push(question.topic);
  });
  detailed.forEach(course => course.topics.sort((a, b) => a.localeCompare(b)));
  state.qbankCourseTree = normalizeQbankCourseTree({ detailed, focused: (activeQbankCourseTree?.().focused || []) });
}

function readImportedQbankV87() {
  // v139: imported QBank packages are kept in memory during the import flow.
  // The resulting questions are persisted to Supabase content by saveState()/persistGlobalContent for admins.
  return Array.isArray(window.__novamedImportedQbankCacheV87) ? window.__novamedImportedQbankCacheV87 : [];
}

function writeImportedQbankV87(list = []) {
  window.__novamedImportedQbankCacheV87 = Array.isArray(list) ? list : [];
  try { localStorage.removeItem(QBANK_IMPORTED_LOCAL_KEY_V87); } catch {}
}

function qbankPackageToRowsV87(pkg = {}) {
  const data = pkg.data || pkg;
  const context = { course: pkg.course, topic: pkg.topic, lecture: pkg.lecture, sourcePath: pkg.sourcePath || '' };
  return extractQbankRows(data, context.sourcePath || '', context);
}

function applyUnifiedQbankQuestionsV87(rows = [], { silent = false, allowEmptyReplace = false } = {}) {
  const sourceRows = Array.isArray(rows) ? rows : [];
  if (!sourceRows.length && !allowEmptyReplace) {
    const existingCount = Array.isArray(state.questions) ? state.questions.length : 0;
    if (!silent) showToast(existingCount ? `QBank kept: ${existingCount} existing MCQs` : 'No QBank JSON rows found');
    if (existingCount) ensureQbankTreeFromQuestions(state.questions);
    return existingCount;
  }
  const clean = sourceRows
    .map((raw, index) => prepareImportedQuestion(raw, index, raw.__qbankContext || {}))
    .filter(q => q.stem && q.options.length >= 3);
  if (!clean.length && !allowEmptyReplace) {
    const existingCount = Array.isArray(state.questions) ? state.questions.length : 0;
    if (!silent) showToast(existingCount ? `QBank kept: ${existingCount} existing MCQs` : 'No valid QBank questions found');
    if (existingCount) ensureQbankTreeFromQuestions(state.questions);
    return existingCount;
  }
  const seen = new Set();
  const unique = [];
  clean.forEach(q => {
    const key = String(q.id || `${q.course}|${q.topic}|${q.lecture}|${q.stem}`).toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    unique.push(q);
  });
  state.questions = unique;
  ensureQbankTreeFromQuestions(unique);
  saveState();
  renderQbank?.();
  updateMiniStats?.();
  if (!silent) showToast(`QBank ready: ${unique.length} MCQs`);
  return unique.length;
}

async function loadExternalQbankJson({ silent = false, force = false } = {}) {
  if (window.__novamedQbankJsonLoadPromiseV145 && !force) return window.__novamedQbankJsonLoadPromiseV145;
  window.__novamedQbankJsonLoadPromiseV145 = (async () => {
  try {
    const indexData = await fetchQbankJsonFile(QBANK_FOLDER_INDEX_PATH);
    const files = [...new Set(parseQbankIndexFiles(indexData))];
    const rows = [];
    const failed = [];
    for (const file of files) {
      try {
        const data = await fetchQbankJsonFile(file);
        rows.push(...extractQbankRows(data, file));
      } catch (error) {
        failed.push(`${file}: ${error.validationErrors ? error.validationErrors.join(', ') : error.message}`);
        console.warn('NovaMed QBank file load failed:', file, error);
      }
    }
    for (const pkg of readImportedQbankV87()) {
      try { rows.push(...qbankPackageToRowsV87(pkg)); }
      catch (error) { failed.push(`Imported ${pkg.lecture || 'file'}: ${error.message}`); }
    }
    const count = applyUnifiedQbankQuestionsV87(rows, { silent: true });
    if (!silent) {
      if (failed.length) showToast(`Loaded ${count} MCQs; ${failed.length} file issue(s)`);
      else showToast(`Loaded ${count} MCQs from QBank JSON`);
    }
    return count;
  } catch (error) {
    console.warn('NovaMed QBank index load failed:', error);
    const rows = [];
    for (const pkg of readImportedQbankV87()) {
      try { rows.push(...qbankPackageToRowsV87(pkg)); } catch {}
    }
    const count = rows.length
      ? applyUnifiedQbankQuestionsV87(rows, { silent: true })
      : (Array.isArray(state.questions) ? state.questions.length : 0);
    if (rows.length && !silent) showToast(`Loaded ${count} imported MCQs`);
    if (!rows.length && !silent) showToast(count ? `QBank JSON unavailable; kept ${count} existing MCQs` : 'Could not load data/qbank/index.json');
    if (!rows.length && count) ensureQbankTreeFromQuestions(state.questions);
    return count;
  } finally {
    setTimeout(() => { if (window.__novamedQbankJsonLoadPromiseV145) window.__novamedQbankJsonLoadPromiseV145 = null; }, 250);
  }
  })();
  return window.__novamedQbankJsonLoadPromiseV145;
}

function mergeImportedQuestions(imported = [], { replace = false } = {}) {
  const rows = imported.map((raw, index) => ({ ...raw, __qbankContext: raw.__qbankContext || {} }));
  const existingRows = replace ? [] : (state.questions || []).map(q => ({ ...q, __qbankContext: { course: q.course, topic: q.topic, lecture: q.lecture || q.subtopic, mode: q.mode } }));
  return applyUnifiedQbankQuestionsV87([...rows, ...existingRows], { silent: false });
}

function qbankOptionExplanation(question, index) {
  const q = normalizeQuestion(question);
  if (Array.isArray(q.optionExplanations) && q.optionExplanations[index]) return q.optionExplanations[index];
  if (index === q.correct) return q.correctExplanation || q.explanation || 'This option is correct because it matches the key clues in the stem.';
  const wrongOptions = q.options.map((_, i) => i).filter(i => i !== q.correct);
  const wrongIndex = wrongOptions.indexOf(index);
  return (q.wrong || [])[wrongIndex] || 'This option is wrong because it does not match the key clues in the stem.';
}

function qbankExplanationHtmlV87(q) {
  const normalized = normalizeQuestion(q);
  const mainExplanation = normalized.explanation || 'Review the key clues in the stem and compare each option carefully.';
  const takeaway = normalized.takeaway || 'No high-yield note was provided for this question.';
  const choiceRows = normalized.options.map((option, index) => {
    const isCorrect = index === normalized.correct;
    const label = optionLabel(index);
    const detail = qbankOptionExplanation(normalized, index);
    return `
      <article class="qbank-choice-analysis-row-v88 ${isCorrect ? 'correct' : 'wrong'}">
        <div class="qbank-choice-analysis-label-v88">
          <b>${label}. ${esc(option)}</b>
          <span>${isCorrect ? 'Correct choice' : 'Incorrect choice'}</span>
        </div>
        <p>${esc(detail)}</p>
      </article>
    `;
  }).join('');
  return `
    <div class="qbank-explanation-shell-v88" data-qbank-explanation-shell>
      <div class="qbank-exp-tabs-v88" role="tablist" aria-label="Question explanation sections">
        <button type="button" class="active" data-qbank-exp-tab="main">Explanation</button>
        <button type="button" data-qbank-exp-tab="choices">Why other choices are incorrect</button>
        <button type="button" data-qbank-exp-tab="yield">High-yield note</button>
      </div>
      <section class="qbank-exp-panel-v88 active" data-qbank-exp-panel="main">
        <h3>Explanation</h3>
        <p>${esc(mainExplanation)}</p>
      </section>
      <section class="qbank-exp-panel-v88" data-qbank-exp-panel="choices">
        <h3>Choice analysis</h3>
        <div class="qbank-choice-analysis-list-v88">${choiceRows}</div>
      </section>
      <section class="qbank-exp-panel-v88" data-qbank-exp-panel="yield">
        <h3>High-yield note</h3>
        <p>${esc(takeaway)}</p>
      </section>
      <button class="primary-btn small" id="nextQuestion" type="button" data-next-question-v108>Next question</button>
    </div>
  `;
}

function bindQbankExplanationTabsV88(root = document) {
  const shell = root.querySelector?.('[data-qbank-explanation-shell]');
  if (!shell) return;
  const tabs = Array.from(shell.querySelectorAll('[data-qbank-exp-tab]'));
  const panels = Array.from(shell.querySelectorAll('[data-qbank-exp-panel]'));
  tabs.forEach(tab => tab.addEventListener('click', () => {
    const key = tab.dataset.qbankExpTab;
    tabs.forEach(item => item.classList.toggle('active', item === tab));
    panels.forEach(panel => panel.classList.toggle('active', panel.dataset.qbankExpPanel === key));
  }));
  bindNextQuestionButtonV149(shell);
}

function bindNextQuestionButtonV149(root = document) {
  const btn = root.querySelector?.('#nextQuestion') || document.querySelector('#nextQuestion');
  if (!btn || btn.dataset.nextBoundV149 === '1') return;
  btn.dataset.nextBoundV149 = '1';
  const goNext = (event) => {
    event.preventDefault();
    event.stopPropagation();
    try { renderQuestion(currentQuestionIndex + 1); } catch (error) { console.warn('Next question failed', error); }
  };
  btn.addEventListener('click', goNext);
  btn.addEventListener('pointerup', (event) => {
    if (event.pointerType === 'mouse') return;
    goNext(event);
  });
}

function renderQuestion(index) {
  stopQbankTimer();
  const pool = activeQuestionPool.length ? activeQuestionPool : state.questions;
  const card = $('#questionCard');
  if (!card || !pool.length) return;
  currentQuestionIndex = ((index % pool.length) + pool.length) % pool.length;
  const q = normalizeQuestion(pool[currentQuestionIndex]);
  card.innerHTML = `
    ${isAdmin() ? `<div class="card-admin-actions question-actions"><button class="tiny-btn" type="button" data-edit-question-id="${qbankDataAttr(q.id)}">Edit</button><button class="tiny-btn danger" type="button" data-delete-question-id="${qbankDataAttr(q.id)}">Delete</button></div>` : ''}
    <div class="question-top">
      <div><span class="eyebrow">Question ${currentQuestionIndex + 1}/${pool.length} • ${esc(q.lecture || q.subtopic || q.topic || 'General')}</span></div>
      <div class="qbank-question-tools-v79">
        ${typeof isQuestionBookmarkedV79 === 'function' ? `<button class="tiny-btn" id="bookmarkQuestionV79" type="button">${isQuestionBookmarkedV79(q) ? 'Bookmarked' : 'Bookmark'}</button>` : ''}
        <div class="timer-pill" id="questionTimer" aria-live="polite">⏱ ${formatQuestionTime(QBANK_QUESTION_SECONDS)}</div>
      </div>
    </div>
    <div class="question-stem">${esc(q.stem)}</div>
    <div class="answers">
      ${q.options.map((option, i) => `<button class="answer-btn" data-answer="${i}"><b>${optionLabel(i)}.</b> ${esc(option)}</button>`).join('')}
    </div>
    <div class="explanation" id="explanationBox">${qbankExplanationHtmlV87(q)}</div>
  `;
  $$('.answer-btn').forEach(btn => btn.addEventListener('click', () => handleAnswer(btn, q)));
  // Next Question is handled by delegated binding below to avoid duplicate/unstable mobile taps.
  bindQbankExplanationTabsV88(document);
  bindNextQuestionButtonV149(document);
  $('#bookmarkQuestionV79')?.addEventListener('click', () => {
    if (typeof bookmarkQuestionV79 !== 'function') return;
    const active = bookmarkQuestionV79(q);
    $('#bookmarkQuestionV79').textContent = active ? 'Bookmarked' : 'Bookmark';
    showToast(active ? 'Question bookmarked' : 'Bookmark removed');
  });
  startQbankTimer(q);
}

function revealQuestionFeedback(q, selected, options = {}) {
  const normalized = normalizeQuestion(q);
  const { timedOut = false } = options;
  $$('.answer-btn').forEach(b => b.disabled = true);
  $$('.answer-btn').forEach(b => {
    const idx = Number(b.dataset.answer);
    if (idx === normalized.correct) b.classList.add('correct');
  });
  if (selected !== null && selected !== undefined && selected !== normalized.correct) {
    $(`.answer-btn[data-answer="${selected}"]`)?.classList.add('wrong');
  }
  const box = $('#explanationBox');
  if (box) {
    box.innerHTML = qbankExplanationHtmlV87(normalized);
    // Next Question is handled by delegated binding below to avoid duplicate/unstable mobile taps.
    bindQbankExplanationTabsV88(box);
    bindNextQuestionButtonV149(box);
    box.classList.add('show');
  }
  if (timedOut) setTimerDisplay('⏱ Time up', 'timer-expired');
  else setTimerDisplay(`⏱ ${formatQuestionTime(QBANK_QUESTION_SECONDS - qbankTimerRemaining)}`, 'timer-answered');
}

function qbankImportErrorsHtmlV87(errors = []) {
  return `<div class="qbank-import-errors-v87"><b>JSON validation failed</b><ul>${errors.map(error => `<li>${esc(error)}</li>`).join('')}</ul></div>`;
}

function registerQbankCoreV145() {
  window.NovaMedQbankCore = {
    questionsFor,
    recordQbankAttempt,
    handleQuestionTimeout,
    handleAnswer,
    recordMistake,
    renderMistakes,
    renderQuestion,
    openQuestionEditor,
    deleteQuestion,
    loadExternalQbankJson,
    applyUnifiedQbankQuestionsV87,
    qbankFindQuestionById,
    qbankSameId
  };
}
registerQbankCoreV145();

function openQbankImportModalV87() {
  if (!requireAdmin('import QBank JSON')) return;
  showModal(`
    <h2 id="modalTitle">Import QBank JSON</h2>
    <p class="modal-muted">For static hosting this saves an imported QBank in this browser only. Permanent import: add the file under <b>data/qbank/course/topic/*.json</b>, run <b>node generate-qbank-index.js</b>, then redeploy.</p>
    <form id="qbankImportFormV87" class="form-stack contextual-form">
      <label class="field-label"><span>Course</span><input name="course" required placeholder="medicine" value="medicine" /></label>
      <label class="field-label"><span>System / Topic</span><input name="topic" required placeholder="Cardio" value="Cardio" /></label>
      <label class="field-label"><span>Lecture name</span><input name="lecture" required placeholder="Arrhythmia" /></label>
      <label class="field-label"><span>JSON file</span><input name="file" type="file" accept="application/json,.json" required /></label>
      <div id="qbankImportErrorsV87"></div>
      <button class="primary-btn" type="submit">Import QBank JSON</button>
    </form>
  `);
  $('#qbankImportFormV87')?.addEventListener('submit', async event => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const file = form.get('file');
    if (!file || !file.text) return;
    try {
      const data = JSON.parse(await file.text());
      const context = { course: String(form.get('course') || '').trim(), topic: String(form.get('topic') || '').trim(), lecture: String(form.get('lecture') || '').trim(), sourcePath: `import://${file.name}` };
      const validation = qbankValidationErrorsV87(data, context);
      if (validation.errors.length) {
        $('#qbankImportErrorsV87').innerHTML = qbankImportErrorsHtmlV87(validation.errors);
        return;
      }
      const packageData = { ...context, importedAt: new Date().toISOString(), data };
      const existing = readImportedQbankV87().filter(pkg => !(qbankSameTextV87(pkg.course, context.course) && qbankSameTextV87(pkg.topic, context.topic) && qbankSameTextV87(pkg.lecture, context.lecture)));
      existing.push(packageData);
      writeImportedQbankV87(existing);
      await loadExternalQbankJson({ silent: true });
      closeModal();
      showToast(`Imported ${validation.rows.length} MCQs into ${context.lecture}`);
    } catch (error) {
      $('#qbankImportErrorsV87').innerHTML = qbankImportErrorsHtmlV87([error.message || 'Invalid JSON file']);
    }
  });
}

function bindQbankJsonTools() {
  $('#importQbankJsonBtn')?.addEventListener('click', openQbankImportModalV87);
  $('#qbankJsonFileInput')?.addEventListener('change', event => { event.target.value = ''; });
  $('#exportQbankJsonBtn')?.addEventListener('click', () => {
    if (!requireAdmin('export QBank JSON')) return;
    exportQbankJson();
  });
  $('#reloadQbankJsonBtn')?.addEventListener('click', () => {
    if (!requireAdmin('reload QBank JSON')) return;
    loadExternalQbankJson({ silent: false });
  });
}


/* v90: delegated QBank controls for more reliable mobile tapping */
(function bindQbankMobileDelegationV90(){
  if (window.__qbankMobileDelegationV90) return;
  window.__qbankMobileDelegationV90 = true;
  document.addEventListener('click', (event) => {
    const eventTarget = event.target?.nodeType === 1 ? event.target : event.target?.parentElement;
    const next = eventTarget?.closest?.('#nextQuestion');
    if (next) {
      event.preventDefault();
      event.stopPropagation();
      try { renderQuestion(currentQuestionIndex + 1); } catch {}
      return;
    }
    const tab = eventTarget?.closest?.('[data-qbank-exp-tab]');
    if (tab) {
      event.preventDefault();
      event.stopPropagation();
      const shell = tab.closest('[data-qbank-explanation-shell]');
      if (!shell) return;
      const key = tab.dataset.qbankExpTab;
      shell.querySelectorAll('[data-qbank-exp-tab]').forEach(item => item.classList.toggle('active', item === tab));
      shell.querySelectorAll('[data-qbank-exp-panel]').forEach(panel => panel.classList.toggle('active', panel.dataset.qbankExpPanel === key));
    }
  }, true);
})();


/* v102: Arabic My Mistakes review workflow */
function mistakeStatus(item = {}) {
  if (item.status === 'mastered' || item.status === 'recovered') return 'mastered';
  if (item.status === 'reviewed') return 'reviewed';
  return 'active';
}

function mistakeStatusLabel(status = 'active') {
  return ({
    active: 'Active',
    reviewed: 'Under review',
    mastered: 'Mastered'
  })[status] || 'Active';
}

function normalizeMistakeStateV102() {
  state.mistakes = (state.mistakes || []).map(item => {
    const normalized = { ...item };
    normalized.status = mistakeStatus(item);
    normalized.correctReviewCount = Number(normalized.correctReviewCount || 0);
    if (!normalized.key && normalized.question) normalized.key = mistakeKey(normalizeQuestion(normalized.question));
    return normalized;
  });
}

function mistakeQuestionForReview(item = {}) {
  return {
    ...normalizeQuestion(item.question || {}),
    __fromMistakeReview: true,
    __mistakeKey: item.key
  };
}

function renderMistakeReviewOverview(items = []) {
  const active = items.filter(item => mistakeStatus(item) === 'active');
  const mastered = items.filter(item => mistakeStatus(item) === 'mastered');
  return `
    <section class="mistake-review-overview premium-card">
      <div>
        <span class="eyebrow">My Mistakes</span>
        <h3>You have ${active.length} mistakes to review</h3>
        <p>Each question moves to mastered after you answer it correctly twice.</p>
      </div>
      <div class="mistake-review-actions">
        <button class="primary-btn small" type="button" data-start-mistake-review ${active.length ? '' : 'disabled'}>Start mistake review</button>
        <span>${mastered.length} mastered</span>
      </div>
    </section>
  `;
}

function startMistakeReviewSession(items = []) {
  normalizeMistakeStateV102();
  const reviewItems = (items && items.length ? items : (state.mistakes || []).filter(item => mistakeStatus(item) === 'active'))
    .filter(item => item?.question);
  if (!reviewItems.length) {
    showToast('No active mistakes to review right now');
    return;
  }
  activeQuestionPool = reviewItems.map(mistakeQuestionForReview);
  currentQuestionIndex = 0;
  navigate('qbank');
  renderQbankSearchQuestion(activeQuestionPool[0]);
  setTimeout(() => $('#questionCard')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80);
  showToast('Mistake review started');
}

function updateMistakeReviewOutcome(question, selectedIndex, isCorrect) {
  const normalized = normalizeQuestion(question || {});
  const key = normalized.__mistakeKey || mistakeKey(normalized);
  const item = (state.mistakes || []).find(m => m.key === key);
  if (!item) return;
  item.selected = selectedIndex;
  item.updatedAt = new Date().toISOString();
  if (isCorrect) {
    item.correctReviewCount = Number(item.correctReviewCount || 0) + 1;
    item.status = item.correctReviewCount >= 2 ? 'mastered' : 'reviewed';
    if (item.status === 'mastered') item.masteredAt = new Date().toISOString();
    else item.reviewedAt = new Date().toISOString();
  } else {
    item.status = 'active';
    item.correctReviewCount = 0;
    item.reviewedAt = null;
  }
  if (typeof saveQuestionMistakeToSupabase === 'function') saveQuestionMistakeToSupabase(item, { immediate: true }).catch?.(() => {});
}

function showMistakeExplanationModal(item = {}) {
  const q = normalizeQuestion(item.question || {});
  showModal(`
    <h2 id="modalTitle">Review explanation</h2>
    <div class="mistake-modal-explanation">
      <span class="eyebrow">${esc(baseCourseTitle(q.course))} • ${esc(q.topic)}</span>
      <h3>${esc(q.stem)}</h3>
      <p>${esc(q.explanation || 'No explanation has been added for this question.')}</p>
      <div class="mistake-note-box"><b>Correct answer</b><p>${esc(optionLabel(q.correct))}. ${esc(q.options[q.correct] || '')}</p></div>
      <p><b>High-yield:</b> ${esc(q.takeaway || '')}</p>
    </div>
  `);
}
