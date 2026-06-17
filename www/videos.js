/* NovaMed v83 - Video academy, free courses, external players, resources, and video progress. */
function getMode(id) {
  return lectureModes.find(mode => mode.id === id);
}
function getCourse(modeId, courseId) {
  return activeVideoCourseTree()[modeId]?.find(course => course.id === courseId);
}
function videosFor({ mode, course, topic } = {}) {
  return state.videos.filter(video => {
    if (mode && video.mode !== mode) return false;
    if (course && video.course !== course) return false;
    if (topic && video.topic !== topic) return false;
    return true;
  });
}
function countVideos(filter) {
  return videosFor(filter).length;
}

function videoProgressKey(video = {}) {
  return String(typeof video === 'object' ? (video.id || video.title || '') : video);
}

function getVideoProgress(video = {}) {
  const key = videoProgressKey(video);
  return normalizeVideoProgress(state.videoProgress || {})[key] || {};
}

function displayVideoProgress(video = {}) {
  const personal = isStudent() ? getVideoProgress(video) : {};
  const raw = personal.percent ?? video.progress ?? 0;
  return clampPercent(raw);
}

function saveVideoProgressEntry(video = {}, entry = {}) {
  if (!isStudent() || !video) return;
  const key = videoProgressKey(video);
  if (!key) return;
  state.videoProgress = normalizeVideoProgress(state.videoProgress || {});
  const previous = state.videoProgress[key] || {};
  const now = new Date().toISOString();
  state.videoProgress[key] = normalizeVideoProgress({
    [key]: {
      ...previous,
      id: key,
      title: video.title || previous.title || '',
      mode: video.mode || previous.mode || '',
      course: video.course || previous.course || '',
      topic: video.topic || previous.topic || '',
      ...entry,
      updatedAt: now,
      watchedAt: now
    }
  })[key];
  if (typeof saveVideoProgressToSupabase === 'function') {
    saveVideoProgressToSupabase(video, state.videoProgress[key]).catch?.(() => {});
  }
}

function restoreVideoPlaybackPosition(video, player) {
  if (!isStudent() || !video || !player) return;
  const progress = getVideoProgress(video);
  const duration = Number.isFinite(player.duration) ? player.duration : Number(progress.duration || 0);
  const currentTime = Math.max(0, Number(progress.currentTime || 0));
  if (!progress.completed && currentTime > 3 && duration && currentTime < duration - 4) {
    try { player.currentTime = currentTime; } catch {}
  }
}

function saveVideoWatchProgress(video, player = null, options = {}) {
  if (!isStudent() || !video) return;
  const previous = getVideoProgress(video);
  const duration = Number.isFinite(player?.duration) ? player.duration : Number(options.duration || previous.duration || 0);
  const currentTime = Number.isFinite(player?.currentTime) ? player.currentTime : Number(options.currentTime ?? previous.currentTime ?? 0);
  const watchedPercent = duration ? clampPercent((currentTime / duration) * 100) : Number(previous.percent || 0);
  const completed = Boolean(options.completed || previous.completed || watchedPercent >= 95);
  const percent = completed ? 100 : Math.max(Number(previous.percent || 0), watchedPercent);
  saveVideoProgressEntry(video, {
    percent,
    currentTime: completed && duration ? duration : Math.max(0, currentTime),
    duration: Math.max(0, duration || previous.duration || 0),
    completed,
    completedAt: completed ? (previous.completedAt || new Date().toISOString()) : previous.completedAt
  });
  saveStudentProgress();
}

function scheduleVideoWatchProgress(video, player) {
  if (!isStudent() || !video || !player) return;
  const now = Date.now();
  if (now - lastVideoProgressTickAt < 5000) return;
  lastVideoProgressTickAt = now;
  clearTimeout(videoProgressSaveTimer);
  videoProgressSaveTimer = setTimeout(() => saveVideoWatchProgress(video, player), 250);
}
function resetVideoPath(level = 'modes') {
  state.videoLevel = level;
  if (level === 'modes') {
    state.selectedMode = null;
    state.selectedCourse = null;
    state.selectedTopic = null;
  }
  if (level === 'courses') {
    state.selectedCourse = null;
    state.selectedTopic = null;
  }
  if (level === 'topics') {
    state.selectedTopic = null;
  }
  renderVideos();
}

function bindVideoEvents() {
  $('#videoSearch')?.addEventListener('input', renderVideos);
  $('#openFreeCoursesBtn')?.addEventListener('click', () => {
    openFreeCoursesModal();
  });
  $('#videoGrid')?.addEventListener('click', event => {
    const addCourseBtn = event.target.closest('[data-add-video-course]');
    const editCourseBtn = event.target.closest('[data-edit-video-course]');
    const deleteCourseBtn = event.target.closest('[data-delete-video-course]');
    const addTopicBtn = event.target.closest('[data-add-video-topic]');
    const editTopicBtn = event.target.closest('[data-edit-video-topic]');
    const deleteTopicBtn = event.target.closest('[data-delete-video-topic]');
    const addVideoBtn = event.target.closest('[data-add-video-context]');
    const editVideoBtn = event.target.closest('[data-edit-video-id]');
    const deleteVideoBtn = event.target.closest('[data-delete-video-id]');
    const modeBtn = event.target.closest('[data-video-mode]');
    const courseBtn = event.target.closest('[data-video-course]');
    const topicBtn = event.target.closest('[data-video-topic]');
    const backBtn = event.target.closest('[data-video-back]');
    const videoCard = event.target.closest('[data-video-id]');
    const freeBackBtn = event.target.closest('[data-free-back]');
    const publicContentRetryBtn = event.target.closest('[data-public-content-retry]');
    const publishPublicContentBtn = event.target.closest('[data-publish-public-content]');
    const addFreeCourseBtn = event.target.closest('[data-add-free-course]');
    const editFreeCourseBtn = event.target.closest('[data-edit-free-course]');
    const deleteFreeCourseBtn = event.target.closest('[data-delete-free-course]');
    const freeCourseCard = event.target.closest('[data-free-course]');
    const addFreeChapterBtn = event.target.closest('[data-add-free-chapter]');
    const editFreeChapterBtn = event.target.closest('[data-edit-free-chapter]');
    const deleteFreeChapterBtn = event.target.closest('[data-delete-free-chapter]');
    const freeChapterCard = event.target.closest('[data-free-chapter]');
    const addFreeLectureBtn = event.target.closest('[data-add-free-lecture]');
    const editFreeLectureBtn = event.target.closest('[data-edit-free-lecture]');
    const deleteFreeLectureBtn = event.target.closest('[data-delete-free-lecture]');
    const freeLectureCard = event.target.closest('[data-free-lecture]');

    if (publicContentRetryBtn) {
      publicContentLoadAttempted = false;
      publicContentLoadStatus = 'Retrying public Supabase content load…';
      ensurePublicContentForEveryone({ silent: false, force: true });
      return;
    }
    if (publishPublicContentBtn) {
      if (!requireAdmin('publish public snapshot')) return;
      publishPublicContentSnapshot(cloudContentPayload())
        .then(url => {
          publicContentLoadStatus = 'Public snapshot published.';
          showToast('Public snapshot published for all visitors');
          console.log('NovaMed public snapshot:', url);
        })
        .catch(err => {
          console.error(err);
          showToast(`Snapshot publish failed: ${err.message || 'check Storage policies'}`);
        });
      return;
    }
    if (freeBackBtn) {
      const target = freeBackBtn.dataset.freeBack;
      if (target === 'videos') {
        state.videoLevel = 'guided';
        state.freeCourseLevel = 'courses';
        state.selectedFreeCourseId = null;
        state.selectedFreeChapterId = null;
      } else if (target === 'free-courses') {
        state.freeCourseLevel = 'courses';
        state.selectedFreeCourseId = null;
        state.selectedFreeChapterId = null;
      } else if (target === 'free-chapters') {
        state.freeCourseLevel = 'chapters';
        state.selectedFreeChapterId = null;
      }
      saveState();
      renderVideos();
      return;
    }
    if (addFreeCourseBtn) { if (requireAdmin('add free courses')) openFreeCourseEditor(); return; }
    if (editFreeCourseBtn) { if (requireAdmin('edit free courses')) openFreeCourseEditor(editFreeCourseBtn.dataset.editFreeCourse); return; }
    if (deleteFreeCourseBtn) { if (requireAdmin('delete free courses')) deleteFreeCourse(deleteFreeCourseBtn.dataset.deleteFreeCourse); return; }
    if (freeCourseCard && !event.target.closest('.card-admin-actions')) {
      state.selectedFreeCourseId = freeCourseCard.dataset.freeCourse;
      state.selectedFreeChapterId = null;
      state.freeCourseLevel = 'chapters';
      state.videoLevel = 'free-courses';
      saveState();
      renderVideos();
      return;
    }
    if (addFreeChapterBtn) { if (requireAdmin('add free chapters')) openFreeChapterEditor(); return; }
    if (editFreeChapterBtn) { if (requireAdmin('edit free chapters')) openFreeChapterEditor(editFreeChapterBtn.dataset.editFreeChapter); return; }
    if (deleteFreeChapterBtn) { if (requireAdmin('delete free chapters')) deleteFreeChapter(deleteFreeChapterBtn.dataset.deleteFreeChapter); return; }
    if (freeChapterCard && !event.target.closest('.card-admin-actions')) {
      state.selectedFreeChapterId = freeChapterCard.dataset.freeChapter;
      state.freeCourseLevel = 'lectures';
      state.videoLevel = 'free-courses';
      saveState();
      renderVideos();
      return;
    }
    if (addFreeLectureBtn) { if (requireAdmin('add free lectures')) openFreeLectureEditor(); return; }
    if (editFreeLectureBtn) { if (requireAdmin('edit free lectures')) openFreeLectureEditor(editFreeLectureBtn.dataset.editFreeLecture); return; }
    if (deleteFreeLectureBtn) { if (requireAdmin('delete free lectures')) deleteFreeLecture(deleteFreeLectureBtn.dataset.deleteFreeLecture); return; }
    if (freeLectureCard && !event.target.closest('.card-admin-actions')) {
      openFreeLecture(freeLectureCard.dataset.freeLecture);
      return;
    }

    if (addCourseBtn) { if (requireAdmin('add courses')) openCourseEditor(); return; }
    if (editCourseBtn) { if (requireAdmin('edit courses')) openCourseEditor(editCourseBtn.dataset.editVideoCourse); return; }
    if (deleteCourseBtn) { if (requireAdmin('delete courses')) deleteVideoCourse(deleteCourseBtn.dataset.deleteVideoCourse); return; }
    if (addTopicBtn) { if (requireAdmin('add topics')) openTopicEditor(); return; }
    if (editTopicBtn) { if (requireAdmin('edit topics')) openTopicEditor(readDataValue(editTopicBtn.dataset.editVideoTopic)); return; }
    if (deleteTopicBtn) { if (requireAdmin('delete topics')) deleteVideoTopic(readDataValue(deleteTopicBtn.dataset.deleteVideoTopic)); return; }
    if (addVideoBtn) { if (requireAdmin('add videos')) openVideoEditor(); return; }
    if (editVideoBtn) { if (requireAdmin('edit videos')) openVideoEditor(Number(editVideoBtn.dataset.editVideoId)); return; }
    if (deleteVideoBtn) { if (requireAdmin('delete videos')) deleteVideo(Number(deleteVideoBtn.dataset.deleteVideoId)); return; }

    if (modeBtn) {
      state.selectedMode = modeBtn.dataset.videoMode;
      state.selectedCourse = null;
      state.selectedTopic = null;
      state.videoLevel = 'courses';
      saveState();
      renderVideos();
      return;
    }
    if (courseBtn) {
      state.selectedCourse = courseBtn.dataset.videoCourse;
      state.selectedTopic = null;
      state.videoLevel = 'topics';
      saveState();
      renderVideos();
      return;
    }
    if (topicBtn) {
      state.selectedTopic = readDataValue(topicBtn.dataset.videoTopic);
      state.videoLevel = 'list';
      saveState();
      renderVideos();
      return;
    }
    if (backBtn) {
      resetVideoPath(backBtn.dataset.videoBack);
      return;
    }
    if (videoCard) openVideo(Number(videoCard.dataset.videoId));
  });
}


function openCourseEditor(courseId = null) {
  const modeId = state.selectedMode;
  const mode = getMode(modeId);
  if (!modeId) { showToast('Choose Detailed or Focused first'); return; }
  const courses = activeVideoCourseTree()[modeId] || [];
  const editing = courses.find(course => course.id === courseId) || null;
  showModal(`
    <h2 id="modalTitle">${editing ? 'Edit course folder' : 'Add course folder'}</h2>
    <p class="modal-muted">This changes the course folders inside <b>${esc(mode?.title || 'this library')}</b>. Students only see the final organized library.</p>
    <form id="courseEditorForm" class="form-stack contextual-form">
      <input name="title" required placeholder="Course title, e.g. Dermatology" value="${esc(editing?.title || '')}" />
      <input name="subtitle" placeholder="Short subtitle/details" value="${esc(editing?.subtitle || '')}" />
      <input name="icon" maxlength="4" placeholder="Icon emoji, e.g. 🧠" value="${esc(editing?.icon || '📚')}" />
      <button class="primary-btn" type="submit">${editing ? 'Save course' : 'Create course'}</button>
    </form>
  `);
  $('#courseEditorForm')?.addEventListener('submit', event => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get('title') || '').trim();
    const subtitle = String(form.get('subtitle') || '').trim() || 'Custom course folder';
    const icon = String(form.get('icon') || '').trim() || '📚';
    if (!title) { showToast('Course title is required'); return; }
    updateVideoCourseTree(tree => {
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
    showToast(editing ? 'Course updated' : 'Course added');
  });
}

function deleteVideoCourse(courseId) {
  const modeId = state.selectedMode;
  const course = getCourse(modeId, courseId);
  if (!course) return;
  const lectureCount = countVideos({ mode: modeId, course: courseId });
  const ok = confirm(`Delete ${course.title}? This will also remove ${lectureCount} video(s) inside this course.`);
  if (!ok) return;
  updateVideoCourseTree(tree => {
    tree[modeId] = (tree[modeId] || []).filter(item => item.id !== courseId);
  });
  state.videos = state.videos.filter(video => !(video.mode === modeId && video.course === courseId));
  state.selectedCourse = null;
  state.selectedTopic = null;
  state.videoLevel = 'courses';
  saveState();
  renderVideos();
  showToast('Course deleted');
}

function openTopicEditor(oldTopic = null) {
  const modeId = state.selectedMode;
  const courseId = state.selectedCourse;
  const course = getCourse(modeId, courseId);
  if (!course) { showToast('Choose a course first'); return; }
  showModal(`
    <h2 id="modalTitle">${oldTopic ? 'Edit topic' : 'Add topic'}</h2>
    <p class="modal-muted">Course: <b>${esc(currentVideoPathLabel({ mode: modeId, course: courseId, topic: oldTopic || 'New topic' }))}</b></p>
    <form id="topicEditorForm" class="form-stack contextual-form">
      <input name="title" required placeholder="Topic title, e.g. Rheumatology" value="${esc(oldTopic || '')}" />
      <button class="primary-btn" type="submit">${oldTopic ? 'Save topic' : 'Create topic'}</button>
    </form>
  `);
  $('#topicEditorForm')?.addEventListener('submit', event => {
    event.preventDefault();
    const title = String(new FormData(event.currentTarget).get('title') || '').trim();
    if (!title) { showToast('Topic title is required'); return; }
    updateVideoCourseTree(tree => {
      const target = (tree[modeId] || []).find(item => item.id === courseId);
      if (!target) return;
      const topics = (target.topics || []).map(topicTitle);
      if (oldTopic) {
        target.topics = topics.map(topic => topic === oldTopic ? title : topic);
        state.videos.forEach(video => {
          if (video.mode === modeId && video.course === courseId && video.topic === oldTopic) video.topic = title;
        });
        if (state.selectedTopic === oldTopic) state.selectedTopic = title;
      } else if (!topics.some(topic => topic.toLowerCase() === title.toLowerCase())) {
        target.topics = [...topics, title];
      }
    });
    saveState();
    renderVideos();
    closeModal();
    showToast(oldTopic ? 'Topic updated' : 'Topic added');
  });
}

function deleteVideoTopic(topic) {
  const modeId = state.selectedMode;
  const courseId = state.selectedCourse;
  const lectureCount = countVideos({ mode: modeId, course: courseId, topic });
  const ok = confirm(`Delete ${topic}? This will also remove ${lectureCount} video(s) inside this topic.`);
  if (!ok) return;
  updateVideoCourseTree(tree => {
    const target = (tree[modeId] || []).find(item => item.id === courseId);
    if (target) target.topics = (target.topics || []).map(topicTitle).filter(item => item !== topic);
  });
  state.videos = state.videos.filter(video => !(video.mode === modeId && video.course === courseId && video.topic === topic));
  if (state.selectedTopic === topic) state.selectedTopic = null;
  state.videoLevel = 'topics';
  saveState();
  renderVideos();
  showToast('Topic deleted');
}

async function readVideoUrlDuration(url) {
  return new Promise(resolve => {
    const source = String(url || '').trim();
    if (!source) return resolve(null);
    const video = document.createElement('video');
    let finished = false;
    const done = value => {
      if (finished) return;
      finished = true;
      video.removeAttribute('src');
      video.load?.();
      resolve(value);
    };
    video.preload = 'metadata';
    video.crossOrigin = 'anonymous';
    video.onloadedmetadata = () => done(Number.isFinite(video.duration) ? video.duration : null);
    video.onerror = () => done(null);
    setTimeout(() => done(null), 5000);
    video.src = source;
  });
}

function updateUploadStage(stage = 'Ready', percent = 0, detail = '') {
  const label = $('#uploadStageLabel');
  const bar = $('#uploadStageBar');
  const pct = $('#uploadStagePct');
  const detailEl = $('#uploadStageDetail');
  const safePercent = Math.max(0, Math.min(100, Number(percent || 0)));
  if (label) label.textContent = stage;
  if (bar) bar.style.width = `${safePercent}%`;
  if (pct) pct.textContent = `${Math.round(safePercent)}%`;
  if (detailEl) detailEl.textContent = detail;
}

async function openVideoEditor(videoId = null) {
  const editing = state.videos.find(video => video.id === videoId) || null;
  if (!editing && !currentVideoPathReady()) {
    showToast('Open a specific topic first, then add the video there');
    return;
  }
  const path = editing ? currentVideoPathLabel(editing) : currentVideoPathLabel();
  const cloudReady = cloudConfigured();
  showModal(`
    <h2 id="modalTitle">${editing ? 'Edit video' : 'Add video here'}</h2>
    <p class="modal-muted">Path is automatic: <b>${esc(path)}</b>. Admin uploads stay inside this exact folder and students watch them inside NovaMed.</p>
    <div class="cloud-upload-card ${cloudReady ? 'ready' : 'needs-setup'}">
      <div class="cloud-upload-icon">☁️</div>
      <div>
        <b>${cloudReady ? 'Supabase direct upload is ready' : 'Connect Supabase before publishing videos'}</b>
        <small>${cloudReady ? 'Video, Full PDF, and High-Yield files will upload to NovaMed Storage automatically.' : 'This public-content workflow needs Supabase Storage so files are not stored inside the app.'}</small>
      </div>
      ${cloudReady ? '' : '<button class="tiny-btn" type="button" id="openCloudSetupFromVideo">Setup</button>'}
    </div>
    <form id="contextVideoForm" class="form-stack contextual-form clean-video-form direct-upload-form">
      <input name="title" required placeholder="Video title" value="${esc(editing?.title || '')}" />
      <textarea name="description" placeholder="Short explanation for students">${esc(editing?.description || '')}</textarea>

      <label class="file-field primary-file direct-video-picker">
        <span>${editing?.url ? 'Replace video file' : 'Choose video file'}</span>
        <input id="contextVideoFile" name="file" type="file" accept="video/*" ${editing?.url ? '' : 'required'} />
      </label>
      <small class="form-hint" id="videoFileHint">${editing?.fileName ? `Current video: ${esc(editing.fileName)}` : 'The video will upload to Supabase and play only inside NovaMed.'}</small>

      <div class="resource-picker-grid">
        <label class="file-field"><span>Full PDF</span><input id="lectureAttachmentFile" name="pdfFile" type="file" accept=".pdf,.ppt,.pptx,.doc,.docx,.jpg,.jpeg,.png,.txt" /></label>
        <label class="file-field"><span>High-Yield Note</span><input id="highYieldAttachmentFile" name="highYieldFile" type="file" accept=".pdf,.jpg,.jpeg,.png,.txt,.doc,.docx" /></label>
      </div>
      <small class="form-hint" id="pdfFileHint">${editing?.pdfFileName || editing?.lectureFileName ? `Current Full PDF: ${esc(editing.pdfFileName || editing.lectureFileName)}` : 'Optional resource shown under the video as a Full PDF button.'}</small>
      <small class="form-hint" id="highYieldFileHint">${editing?.highYieldFileName ? `Current High-Yield Note: ${esc(editing.highYieldFileName)}` : 'Optional resource shown under the video as a High-Yield Note button.'}</small>

      <div class="auto-duration-box"><span>⏱️</span><div><b id="autoDurationValue">${esc(editing?.duration || 'Auto')}</b><small>Duration is read automatically from the selected video file.</small></div></div>

      <div class="upload-progress-card" id="uploadProgressCard" hidden>
        <div class="upload-progress-head"><b id="uploadStageLabel">Preparing upload</b><span id="uploadStagePct">0%</span></div>
        <div class="upload-progress-track"><i id="uploadStageBar"></i></div>
        <small id="uploadStageDetail">Waiting for files…</small>
      </div>

      <button class="primary-btn" type="submit">${editing ? 'Save video' : 'Upload & publish video'}</button>
    </form>
  `);
  updateCloudBadge();
  $('#openCloudSetupFromVideo')?.addEventListener('click', () => showCloudSetupModal());

  const fileInput = $('#contextVideoFile');
  const pdfInput = $('#lectureAttachmentFile');
  const highYieldInput = $('#highYieldAttachmentFile');
  const durationValue = $('#autoDurationValue');
  const videoHint = $('#videoFileHint');
  const pdfHint = $('#pdfFileHint');
  const highYieldHint = $('#highYieldFileHint');
  let detectedDuration = editing?.duration || 'Auto';

  pdfInput?.addEventListener('change', () => {
    const file = pdfInput.files?.[0];
    if (file && pdfHint) pdfHint.textContent = `Selected Full PDF: ${file.name}`;
  });
  highYieldInput?.addEventListener('change', () => {
    const file = highYieldInput.files?.[0];
    if (file && highYieldHint) highYieldHint.textContent = `Selected High-Yield Note: ${file.name}`;
  });
  fileInput?.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    if (videoHint) videoHint.textContent = `Selected video: ${file.name}`;
    durationValue.textContent = 'Reading…';
    const seconds = await readVideoFileDuration(file);
    detectedDuration = seconds ? formatDuration(seconds) : 'Auto';
    durationValue.textContent = detectedDuration;
  });

  $('#contextVideoForm')?.addEventListener('submit', async event => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const file = form.get('file');
    const pdfFile = form.get('pdfFile');
    const highYieldFile = form.get('highYieldFile');

    if (!cloudConfigured()) {
      showToast('Connect Supabase first so NovaMed can upload and publish the video.');
      showCloudSetupModal();
      return;
    }
    if ((!file || !file.size) && !editing?.url) {
      showToast('Choose a video file first.');
      return;
    }

    const submitBtn = event.currentTarget.querySelector('button[type="submit"]');
    const progressCard = $('#uploadProgressCard');
    if (submitBtn) submitBtn.disabled = true;
    if (progressCard) progressCard.hidden = false;

    let pdfPayload = {
      name: editing?.pdfFileName || editing?.lectureFileName || '',
      data: editing?.pdfFileData || editing?.lectureFileData || '',
      storagePath: editing?.pdfFilePath || editing?.lectureFilePath || '',
      bucket: editing?.pdfFileBucket || editing?.lectureFileBucket || ''
    };
    let highYieldPayload = {
      name: editing?.highYieldFileName || '',
      data: editing?.highYieldFileData || '',
      storagePath: editing?.highYieldFilePath || '',
      bucket: editing?.highYieldFileBucket || ''
    };
    let uploadedVideo = null;

    try {
      updateUploadStage('Preparing files', 8, 'Reading video metadata and checking selected resources.');
      if (file && file.size && detectedDuration === 'Auto') {
        const seconds = await readVideoFileDuration(file);
        detectedDuration = seconds ? formatDuration(seconds) : 'Auto';
        if (durationValue) durationValue.textContent = detectedDuration;
      }

      if (file && file.size) {
        updateUploadStage('Uploading video', 25, 'Sending the lecture video to Supabase Storage. Keep this window open.');
        uploadedVideo = await uploadSupabaseAsset('video', file, 'videos');
        updateUploadStage('Video uploaded', 58, 'Video storage link created for NovaMed playback.');
      } else {
        updateUploadStage('Keeping existing video', 40, 'No replacement video selected.');
      }

      if (pdfFile && pdfFile.size) {
        updateUploadStage('Uploading Full PDF', 68, 'Attaching the full lecture file to this video.');
        const uploadedFile = await uploadSupabaseAsset('file', pdfFile, 'full-pdf');
        pdfPayload = { name: uploadedFile.fileName, data: uploadedFile.publicUrl, storagePath: uploadedFile.path, bucket: uploadedFile.bucket };
      }

      if (highYieldFile && highYieldFile.size) {
        updateUploadStage('Uploading High-Yield Note', 78, 'Attaching the high-yield resource to this video.');
        const uploadedHy = await uploadSupabaseAsset('file', highYieldFile, 'high-yield-notes');
        highYieldPayload = { name: uploadedHy.fileName, data: uploadedHy.publicUrl, storagePath: uploadedHy.path, bucket: uploadedHy.bucket };
      }

      updateUploadStage('Publishing lecture', 88, 'Saving title, description, duration, and file links to NovaMed content.');
      const contextMode = editing?.mode || state.selectedMode;
      const contextCourse = editing?.course || state.selectedCourse;
      const contextTopic = editing?.topic || state.selectedTopic;
      const course = getCourse(contextMode, contextCourse);
      const previousHyText = editing?.highYieldNoteText || editing?.quickNotes || (editing?.highYieldQuestions || []).join('\n');
      const item = normalizeVideo({
        ...(editing || {}),
        id: editing?.id || Date.now(),
        mode: contextMode,
        course: contextCourse,
        topic: contextTopic,
        subject: course?.title || contextCourse,
        title: form.get('title'),
        duration: detectedDuration || editing?.duration || 'Auto',
        difficulty: editing?.difficulty || (contextMode === 'focused' ? 'High-yield' : 'Lecture'),
        progress: editing?.progress || 0,
        url: uploadedVideo?.publicUrl || editing?.url || '',
        videoStoragePath: uploadedVideo?.path || editing?.videoStoragePath || '',
        videoBucket: uploadedVideo?.bucket || editing?.videoBucket || '',
        lectureLink: '',
        lectureFileName: pdfPayload.name || '',
        lectureFileData: pdfPayload.data || '',
        lectureFilePath: pdfPayload.storagePath || editing?.lectureFilePath || '',
        lectureFileBucket: pdfPayload.bucket || editing?.lectureFileBucket || '',
        pdfFileName: pdfPayload.name || '',
        pdfFileData: pdfPayload.data || '',
        pdfFilePath: pdfPayload.storagePath || editing?.pdfFilePath || '',
        pdfFileBucket: pdfPayload.bucket || editing?.pdfFileBucket || '',
        highYieldFileName: highYieldPayload.name || '',
        highYieldFileData: highYieldPayload.data || '',
        highYieldFilePath: highYieldPayload.storagePath || editing?.highYieldFilePath || '',
        highYieldFileBucket: highYieldPayload.bucket || editing?.highYieldFileBucket || '',
        highYieldNoteText: previousHyText || '',
        quickNotes: '',
        highYieldQuestions: [],
        fileName: uploadedVideo?.fileName || editing?.fileName || '',
        description: form.get('description') || (uploadedVideo?.fileName ? `Video uploaded: ${uploadedVideo.fileName}` : editing?.description || 'New lecture ready for students.')
      });
      if (!item.url) {
        throw new Error('No playable video URL was created. Check the video bucket policy.');
      }
      if (editing) {
        const idx = state.videos.findIndex(video => video.id === editing.id);
        if (idx >= 0) state.videos[idx] = item;
      } else {
        state.videos.unshift(item);
      }
      state.selectedMode = item.mode;
      state.selectedCourse = item.course;
      state.selectedTopic = item.topic;
      state.videoLevel = 'list';
      saveState();
      updateUploadStage('Done', 100, 'Lecture is published and available inside NovaMed.');
      setTimeout(() => {
        renderVideos();
        closeModal();
        showToast(editing ? 'Video updated in Supabase' : 'Video uploaded to Supabase');
      }, 450);
    } catch (err) {
      console.error(err);
      updateUploadStage('Upload failed', 100, err.message || 'Check Supabase setup and storage policies.');
      showToast(`Upload failed: ${err.message || 'check Supabase setup'}`);
      if (submitBtn) submitBtn.disabled = false;
    }
  });
}

function deleteVideo(id) {
  const video = state.videos.find(item => item.id === id);
  if (!video) return;
  if (!confirm(`Delete video: ${video.title}?`)) return;
  state.videos = state.videos.filter(item => item.id !== id);
  saveState();
  renderVideos();
  showToast('Video deleted');
}

function renderVideoBreadcrumb(searching = false) {
  const bar = $('#videoBreadcrumb');
  if (!bar) return;
  if (!searching) {
    bar.hidden = true;
    bar.innerHTML = '';
    return;
  }
  bar.hidden = false;
  bar.innerHTML = '<span class="crumb active">Search results</span>';
}


function optionHtml(value, label, selected = false, disabled = false) {
  return `<option value="${esc(value)}" ${selected ? 'selected' : ''} ${disabled ? 'disabled' : ''}>${esc(label)}</option>`;
}

function renderVideoGuideControls() {
  const modeSelect = $('#videoGuideMode');
  const courseSelect = $('#videoGuideCourse');
  const topicSelect = $('#videoGuideTopic');
  const lectureSelect = $('#videoGuideLecture');
  if (!modeSelect || !courseSelect || !topicSelect || !lectureSelect) return;

  // V112: student video guide is intentionally simple: Course + Chapter only.
  // The internal video library still uses the existing Detailed mode for compatibility.
  if (!state.selectedMode) state.selectedMode = 'detailed';
  modeSelect.innerHTML = lectureModes.map(mode => optionHtml(mode.id, mode.title, state.selectedMode === mode.id)).join('');

  const courses = state.selectedMode ? (activeVideoCourseTree()[state.selectedMode] || []) : [];
  courseSelect.disabled = !state.selectedMode;
  courseSelect.innerHTML = optionHtml('', 'Choose course', !state.selectedCourse) + courses.map(course => optionHtml(course.id, course.title.replace(/^Focused\s+/, '').replace(/^Detailed\s+/, ''), state.selectedCourse === course.id)).join('');

  const course = courses.find(item => item.id === state.selectedCourse);
  const topics = course ? (course.topics || []).map(topicTitle) : [];
  topicSelect.disabled = !state.selectedCourse;
  topicSelect.innerHTML = optionHtml('', 'Choose chapter', !state.selectedTopic) + topics.map(topic => optionHtml(topic, topic, state.selectedTopic === topic)).join('');

  const lectures = state.selectedMode && state.selectedCourse && state.selectedTopic
    ? (state.videos || []).filter(video => video.mode === state.selectedMode && video.course === state.selectedCourse && video.topic === state.selectedTopic)
    : [];
  const currentLectureId = lectureSelect.dataset.currentVideoId || '';
  lectureSelect.disabled = !state.selectedTopic;
  lectureSelect.innerHTML = optionHtml('', lectures.length ? 'Choose lecture' : 'No lectures yet', !currentLectureId) + lectures.map(video => optionHtml(String(video.id), video.title, String(video.id) === currentLectureId)).join('');
  syncPickerButtonFromSelect($('#videoGuideModeBtn'), modeSelect, { placeholder: 'Choose video type', readyHint: 'Tap to change type', disabledHint: 'No video types yet' });
  syncPickerButtonFromSelect($('#videoGuideCourseBtn'), courseSelect, { placeholder: 'Choose course', readyHint: 'Tap to change course', disabledHint: state.selectedMode ? 'No courses in this library yet' : 'Choose video type first' });
  syncPickerButtonFromSelect($('#videoGuideTopicBtn'), topicSelect, { placeholder: 'Choose chapter', readyHint: 'Tap to change chapter', disabledHint: state.selectedCourse ? 'No chapters in this course yet' : 'Choose course first' });
  syncPickerButtonFromSelect($('#videoGuideLectureBtn'), lectureSelect, { placeholder: 'Choose lecture', readyHint: 'Tap to change lecture', disabledHint: state.selectedTopic ? 'No lectures in this chapter yet' : 'Choose chapter first' });
}


function openGuidedVideoChapterModalV112(lectures = []) {
  const safeLectures = Array.isArray(lectures) ? lectures.filter(Boolean) : [];
  const course = getCourse(state.selectedMode, state.selectedCourse);
  const chapterTitle = state.selectedTopic || 'Chapter lectures';
  if (!safeLectures.length) return showToast('No lectures in this chapter yet');
  if (typeof setModalVariant === 'function') setModalVariant('free-courses-modal-card');
  showModal(`
    <section class="guided-modal-shell-v112" aria-label="Chapter lectures">
      <div class="guided-modal-head-v112">
        <button class="circle-mini" type="button" data-close-guided-modal-v112>‹</button>
        <div>
          <span class="eyebrow">${esc(course?.title?.replace(/^Focused\s+/, '').replace(/^Detailed\s+/, '') || 'Course')}</span>
          <h2 id="modalTitle">${esc(chapterTitle)}</h2>
        </div>
        <span class="review-count-pill-v103">${safeLectures.length} lecture${safeLectures.length === 1 ? '' : 's'}</span>
      </div>
      <div class="guided-modal-grid-v112">
        ${safeLectures.map(video => `
          <article class="guided-modal-card-v112" data-open-guided-video-v112="${esc(video.id)}">
            <div class="guided-modal-icon-v112">▶</div>
            <div>
              <h3>${esc(video.title)}</h3>
              <small>${esc(video.duration || 'Lecture')}</small>
            </div>
            <button class="node-action" type="button">Open</button>
          </article>
        `).join('')}
      </div>
    </section>
  `);
  $('#modalContent')?.querySelectorAll('[data-open-guided-video-v112]').forEach(card => {
    card.addEventListener('click', () => { if (typeof setModalVariant === 'function') setModalVariant(''); openVideo(Number(card.dataset.openGuidedVideoV112)); });
  });
  $('#modalContent')?.querySelector('[data-close-guided-modal-v112]')?.addEventListener('click', () => closeModal());
}

function bindVideoGuideControls() {
  bindNativePickerButton($('#videoGuideModeBtn'), $('#videoGuideMode'), { title: 'Video type', subtitle: 'Choose Detailed or Focused first.', emptyText: 'No video types yet.' });
  bindNativePickerButton($('#videoGuideCourseBtn'), $('#videoGuideCourse'), { title: 'Course', subtitle: 'Choose the course inside this video path.', emptyText: 'No courses available here yet.' });
  bindNativePickerButton($('#videoGuideTopicBtn'), $('#videoGuideTopic'), { title: 'Chapter', subtitle: 'Choose the chapter you want to open.', emptyText: 'No chapters available here yet.' });
  bindNativePickerButton($('#videoGuideLectureBtn'), $('#videoGuideLecture'), { title: 'Lecture', subtitle: 'Choose a single lecture if you want a narrower path.', emptyText: 'No lectures have been added yet.' });
  $('#videoGuideMode')?.addEventListener('change', event => {
    state.selectedMode = event.target.value || null;
    state.selectedCourse = null;
    state.selectedTopic = null;
    state.videoLevel = 'guided';
    $('#videoGuideLecture').dataset.currentVideoId = '';
    saveState();
    renderVideos();
  });
  $('#videoGuideCourse')?.addEventListener('change', event => {
    state.selectedCourse = event.target.value || null;
    state.selectedTopic = null;
    state.videoLevel = 'guided';
    $('#videoGuideLecture').dataset.currentVideoId = '';
    saveState();
    renderVideos();
  });
  $('#videoGuideTopic')?.addEventListener('change', event => {
    state.selectedTopic = event.target.value || null;
    state.videoLevel = 'guided';
    $('#videoGuideLecture').dataset.currentVideoId = '';
    saveState();
    renderVideos();
  });
  $('#videoGuideLecture')?.addEventListener('change', event => {
    event.currentTarget.dataset.currentVideoId = event.target.value || '';
    syncPickerButtonFromSelect($('#videoGuideLectureBtn'), event.currentTarget, { placeholder: 'Choose lecture', readyHint: 'Tap to change lecture', disabledHint: state.selectedTopic ? 'No lectures in this chapter yet' : 'Choose chapter first' });
    if (!isAdmin() && event.target.value) {
      saveState();
      openVideo(Number(event.target.value));
    }
  });
  $('#openGuidedVideo')?.addEventListener('click', () => {
    if (!state.selectedMode) state.selectedMode = 'detailed';
    if (!state.selectedCourse) return showToast('Choose course first');
    if (!state.selectedTopic) return showToast('Choose chapter first');
    const lectures = videosFor({ mode: state.selectedMode, course: state.selectedCourse, topic: state.selectedTopic });
    saveState();
    openGuidedVideoChapterModalV112(lectures);
  });
  $('#videoGuideReset')?.addEventListener('click', () => {
    state.selectedMode = 'detailed';
    state.selectedCourse = null;
    state.selectedTopic = null;
    state.videoLevel = 'guided';
    $('#videoGuideLecture').dataset.currentVideoId = '';
    saveState();
    renderVideos();
  });
}


function guidedQbankAnswerMode() {
  // QBank guided path is Traditional by default.
  // Wizary/ministerial exams are started from the separate Wizary mode button.
  return 'free';
}

function startGuidedQbankExamStyle(pool = []) {
  const safePool = Array.isArray(pool) ? pool.filter(Boolean) : [];
  if (!safePool.length) return showToast('No MCQs in this set yet');
  const live = typeof readLiveExam === 'function' ? readLiveExam() : null;
  if (live) {
    if (typeof liveExamRemainingSeconds === 'function' && liveExamRemainingSeconds(live) <= 0 && typeof openLiveExamExpiredModal === 'function') {
      openLiveExamExpiredModal(live, { course: state.selectedQCourse, topic: state.selectedQTopic, lectureId: state.selectedQSubtopic, count: safePool.length });
      return;
    }
    if (typeof resumeLiveExam === 'function') {
      resumeLiveExam(live);
      showToast('You already have a live exam');
      return;
    }
  }
  if (typeof startQuickExamSession !== 'function') return showToast('Exam mode is not ready yet');
  const minutes = Math.max(5, Math.min(240, Math.ceil(safePool.length * 1.2)));
  startQuickExamSession(safePool, minutes, {
    course: state.selectedQCourse,
    topic: state.selectedQTopic,
    lectureId: state.selectedQSubtopic,
    source: 'qbank-guided-set'
  });
}

function renderQbankGuideControls() {
  const answerModeSelect = $('#qbankGuideAnswerMode');
  const modeSelect = $('#qbankGuideMode');
  const libWrap = $('#qbankGuideLibraryWrap');
  const libSelect = $('#qbankGuideLibrary');
  const courseSelect = $('#qbankGuideCourse');
  const topicSelect = $('#qbankGuideTopic');
  const subSelect = $('#qbankGuideSubtopic');
  if (!answerModeSelect || !modeSelect || !courseSelect || !topicSelect || !subSelect) return;

  state.selectedQAnswerMode = 'free';
  if (!state.selectedQMode || state.selectedQMode === 'focused') state.selectedQMode = 'detailed';
  answerModeSelect.innerHTML = optionHtml('free', 'Traditional', true);

  modeSelect.innerHTML = qbankModes.map(mode => optionHtml(mode.id, mode.title, state.selectedQMode === mode.id)).join('');

  const isFocused = false;
  if (libWrap) libWrap.hidden = !isFocused;
  if (libSelect) {
    libSelect.innerHTML = optionHtml('', 'Choose note type', !state.selectedQNoteLibrary) + highYieldNoteLibraries.map(lib => optionHtml(lib.id, lib.title, state.selectedQNoteLibrary === lib.id)).join('');
    libSelect.disabled = !isFocused;
  }

  const courseReady = Boolean(state.selectedQMode);
  const courses = courseReady ? (activeQbankCourseTree()[state.selectedQMode] || []) : [];
  courseSelect.disabled = !courseReady;
  courseSelect.innerHTML = optionHtml('', 'Choose course', !state.selectedQCourse) + courses.map(course => optionHtml(course.id, course.title.replace(/^Focused\s+/, '').replace(/^Detailed\s+/, ''), state.selectedQCourse === course.id)).join('');

  const course = courses.find(item => item.id === state.selectedQCourse);
  const topics = course ? (course.topics || []).map(topicTitle) : [];
  topicSelect.disabled = !state.selectedQCourse;
  topicSelect.innerHTML = optionHtml('', 'Choose chapter', !state.selectedQTopic) + topics.map(topic => optionHtml(topic, topic, state.selectedQTopic === topic)).join('');

  const subtopics = state.selectedQTopic
    ? (isFocused ? getFocusNoteSubtopics({ library: state.selectedQNoteLibrary || 'hy-notes', course: state.selectedQCourse, topic: state.selectedQTopic }) : getQbankSubtopics(state.selectedQMode, state.selectedQCourse, state.selectedQTopic))
    : [];
  subSelect.disabled = !state.selectedQTopic;
  subSelect.innerHTML = optionHtml('', subtopics.length ? 'Choose lecture' : 'No lectures yet', !state.selectedQSubtopic) + subtopics.map(sub => optionHtml(sub, sub, state.selectedQSubtopic === sub)).join('');
  syncPickerButtonFromSelect($('#qbankGuideAnswerModeBtn'), answerModeSelect, { placeholder: 'Choose MCQ mode', readyHint: 'Tap to change MCQ mode', disabledHint: 'Choose MCQ mode' });
  syncPickerButtonFromSelect($('#qbankGuideModeBtn'), modeSelect, { placeholder: 'Choose library', readyHint: 'Tap to change library', disabledHint: 'No libraries yet' });
  syncPickerButtonFromSelect($('#qbankGuideLibraryBtn'), libSelect, { placeholder: 'Choose note type', readyHint: 'Tap to change note type', disabledHint: isFocused ? 'Choose the note type here' : 'Only needed for focused notes' });
  syncPickerButtonFromSelect($('#qbankGuideCourseBtn'), courseSelect, { placeholder: 'Choose course', readyHint: 'Tap to change course', disabledHint: courseReady ? 'No courses yet' : 'Choose course first' });
  syncPickerButtonFromSelect($('#qbankGuideTopicBtn'), topicSelect, { placeholder: 'Choose chapter', readyHint: 'Tap to change chapter', disabledHint: state.selectedQCourse ? 'No chapters in this course yet' : 'Choose course first' });
  syncPickerButtonFromSelect($('#qbankGuideSubtopicBtn'), subSelect, { placeholder: 'Choose lecture', readyHint: 'Tap to change lecture', disabledHint: state.selectedQTopic ? 'No lecture folders here yet' : 'Choose chapter first' });
}


function openGuidedQbankChapterModalV112(subtopics = []) {
  const safeSubtopics = Array.isArray(subtopics) ? subtopics.filter(Boolean) : [];
  const course = getQCourse(state.selectedQMode, state.selectedQCourse);
  const chapterTitle = state.selectedQTopic || 'Question sets';
  if (!safeSubtopics.length) return showToast('No MCQ lectures in this chapter yet');
  if (typeof setModalVariant === 'function') setModalVariant('qbank-set-modal-card');
  showModal(`
    <section class="guided-modal-shell-v112" aria-label="QBank chapter sets">
      <div class="guided-modal-head-v112">
        <button class="circle-mini" type="button" data-close-guided-modal-v112>‹</button>
        <div>
          <span class="eyebrow">${esc(course?.title || 'QBank')}</span>
          <h2 id="modalTitle">${esc(chapterTitle)}</h2>
        </div>
        <span class="review-count-pill-v103">${safeSubtopics.length} set${safeSubtopics.length === 1 ? '' : 's'}</span>
      </div>
      <div class="guided-modal-grid-v112">
        ${safeSubtopics.map(sub => {
          const count = countQuestionsInSubtopic(sub);
          return `
            <article class="guided-modal-card-v112" data-open-guided-qbank-v112="${dataValue(sub)}">
              <div class="guided-modal-icon-v112">?</div>
              <div>
                <h3>${esc(sub)}</h3>
                <small>${count} MCQ${count === 1 ? '' : 's'}</small>
              </div>
              <button class="node-action" type="button">Open</button>
            </article>
          `;
        }).join('')}
      </div>
    </section>
  `);
  $('#modalContent')?.querySelectorAll('[data-open-guided-qbank-v112]').forEach(card => {
    card.addEventListener('click', () => {
      const subtopic = readDataValue(card.dataset.openGuidedQbankV112);
      state.selectedQSubtopic = subtopic;
      state.qbankLevel = 'set';
      saveState();
      const pool = questionsFor({ mode: state.selectedQMode, course: state.selectedQCourse, topic: state.selectedQTopic, subtopic });
      if (!pool.length) return showToast('No MCQs in this set yet');
      if (guidedQbankAnswerMode() === 'exam') {
        startGuidedQbankExamStyle(pool);
      } else {
        openQbankSetPlayerModal(pool);
        showToast('Traditional mode opened');
      }
    });
  });
  $('#modalContent')?.querySelector('[data-close-guided-modal-v112]')?.addEventListener('click', () => closeModal());
}


function highYieldGuideCoursesV122() {
  return (activeQbankCourseTree()?.focused || []).filter(Boolean);
}

function renderHighYieldGuideControlsV122() {
  const courseSelect = $('#highYieldGuideCourseV122');
  const topicSelect = $('#highYieldGuideTopicV122');
  if (!courseSelect || !topicSelect) return;
  const courses = highYieldGuideCoursesV122();
  if (!state.selectedHYCourseV122 && state.selectedQCourse) state.selectedHYCourseV122 = state.selectedQCourse;
  if (!state.selectedHYTopicV122 && state.selectedQTopic) state.selectedHYTopicV122 = state.selectedQTopic;
  courseSelect.innerHTML = optionHtml('', 'Choose course', !state.selectedHYCourseV122) + courses.map(course => optionHtml(course.id, String(course.title || course.id).replace(/^Focused\s+/, '').replace(/^Detailed\s+/, ''), state.selectedHYCourseV122 === course.id)).join('');
  const selectedCourse = courses.find(course => course.id === state.selectedHYCourseV122);
  const topics = selectedCourse ? (selectedCourse.topics || []).map(topicTitle) : [];
  topicSelect.disabled = !state.selectedHYCourseV122;
  topicSelect.innerHTML = optionHtml('', 'Choose chapter', !state.selectedHYTopicV122) + topics.map(topic => optionHtml(topic, topic, state.selectedHYTopicV122 === topic)).join('');
  syncPickerButtonFromSelect($('#highYieldGuideCourseBtnV122'), courseSelect, { placeholder: 'Choose course', readyHint: 'Tap to change course', disabledHint: courses.length ? 'Choose course' : 'No courses yet' });
  syncPickerButtonFromSelect($('#highYieldGuideTopicBtnV122'), topicSelect, { placeholder: 'Choose chapter', readyHint: 'Tap to change chapter', disabledHint: state.selectedHYCourseV122 ? 'No chapters in this course yet' : 'Choose course first' });
}

function highYieldNotesForV123(subtopic) {
  const courseId = state.selectedHYCourseV122;
  const topic = state.selectedHYTopicV122;
  if (!courseId || !topic || !subtopic) return [];
  return typeof focusNotesFor === 'function'
    ? focusNotesFor({ library: 'hy-notes', course: courseId, topic, subtopic })
    : [];
}

function highYieldNoteMinimalTemplateV123(note, subtopic = '') {
  if (!note) return '';
  const sections = (note.sections || []).map(section => `
    <section class="hy-note-section-v123">
      ${section.heading ? `<h4>${esc(section.heading)}</h4>` : ''}
      <ul>${(section.points || []).map(point => `<li>${esc(point)}</li>`).join('')}</ul>
    </section>`).join('');
  const patterns = (note.patterns || []).length ? `
    <section class="hy-note-section-v123">
      <h4>Patterns</h4>
      <div class="hy-pattern-board-v123">
        ${(note.patterns || []).map(item => `<div><span>${esc(item.clue)}</span><b>→</b><strong>${esc(item.think)}</strong></div>`).join('')}
      </div>
    </section>` : '';
  const ladder = (note.ladder || []).length ? `
    <section class="hy-note-section-v123">
      <h4>Approach</h4>
      <ol>${(note.ladder || []).map(step => `<li>${esc(step)}</li>`).join('')}</ol>
    </section>` : '';
  const pearl = note.pearl ? `<div class="hy-note-pearl-v123">${esc(note.pearl)}</div>` : '';
  const takeaway = note.takeaway ? `<section class="hy-note-section-v123"><h4>Takeaway</h4><p>${esc(note.takeaway)}</p></section>` : '';
  const showTitle = note.title && String(note.title).trim().toLowerCase() !== String(subtopic || '').trim().toLowerCase();
  return `
    <article class="hy-note-clean-card-v123 premium-card ${isAdmin?.() ? 'editable-card' : ''}">
      ${isAdmin?.() ? `<div class="card-admin-actions"><button class="tiny-btn" type="button" data-edit-focus-note-id="${note.id}">Edit</button><button class="tiny-btn danger" type="button" data-delete-focus-note-id="${note.id}">Delete</button></div>` : ''}
      ${showTitle ? `<h3>${esc(note.title)}</h3>` : ''}
      ${pearl}
      ${patterns}
      ${ladder}
      ${sections}
      ${takeaway}
    </article>
  `;
}

function renderHighYieldFolderModalContentV123(folders = []) {
  const safeFolders = Array.isArray(folders) ? folders.filter(Boolean) : [];
  const course = getQCourse('focused', state.selectedHYCourseV122) || getQCourse('detailed', state.selectedHYCourseV122) || { title: state.selectedHYCourseV122 || 'High-yield notes' };
  return `
    <section class="guided-modal-shell-v112 high-yield-folder-modal-v122" aria-label="High-yield note folders">
      <div class="guided-modal-head-v112">
        <button class="circle-mini" type="button" data-close-guided-modal-v112>‹</button>
        <div>
          <span class="eyebrow">High-yield notes</span>
          <h2 id="modalTitle">${esc(state.selectedHYTopicV122 || (course.title || 'Notes'))}</h2>
        </div>
        <span class="review-count-pill-v103">${safeFolders.length} folder${safeFolders.length === 1 ? '' : 's'}</span>
      </div>
      <div class="guided-modal-grid-v112">
        ${safeFolders.map(folder => {
          const count = highYieldNotesForV123(folder).length;
          return `
            <article class="guided-modal-card-v112" data-open-high-yield-folder-v122="${dataValue(folder)}">
              <div class="guided-modal-icon-v112">HY</div>
              <div>
                <h3>${esc(folder)}</h3>
                <small>${count} note${count === 1 ? '' : 's'}</small>
              </div>
              <button class="node-action" type="button">Open</button>
            </article>
          `;
        }).join('')}
      </div>
    </section>
  `;
}

function bindHighYieldFolderModalV123(folders = []) {
  const modal = $('#modalContent');
  if (!modal) return;
  modal.querySelectorAll('[data-open-high-yield-folder-v122]').forEach(card => {
    card.addEventListener('click', () => openHighYieldNotesPageV122(readDataValue(card.dataset.openHighYieldFolderV122), folders));
  });
  modal.querySelector('[data-close-guided-modal-v112]')?.addEventListener('click', () => closeModal());
}

function renderHighYieldNoteModalContentV123(subtopic, folders = []) {
  const notes = highYieldNotesForV123(subtopic);
  return `
    <section class="guided-modal-shell-v112 high-yield-note-view-v123" aria-label="High-yield notes">
      <div class="guided-modal-head-v112">
        <button class="circle-mini" type="button" data-back-high-yield-folders-v123>‹</button>
        <div>
          <span class="eyebrow">High-yield</span>
          <h2 id="modalTitle">${esc(subtopic || 'Notes')}</h2>
        </div>
        ${isAdmin?.() ? '<button class="primary-btn small" type="button" data-add-focus-note>+ Note</button>' : ''}
      </div>
      <div class="hy-note-content-list-v123">
        ${notes.map(note => highYieldNoteMinimalTemplateV123(note, subtopic)).join('') || `
          <div class="video-empty premium-card">
            <div class="hub-icon">🧠</div>
            <h3>No notes yet</h3>
            <p>${isAdmin?.() ? 'Add the first note inside this folder.' : 'No public notes have been added here yet.'}</p>
            ${isAdmin?.() ? '<button class="primary-btn small" type="button" data-add-focus-note>Add note</button>' : ''}
          </div>`}
      </div>
    </section>
  `;
}

function openHighYieldNotesPageV122(subtopic, folders = []) {
  const courseId = state.selectedHYCourseV122;
  const topic = state.selectedHYTopicV122;
  if (!courseId || !topic || !subtopic) return showToast('Choose course and chapter first');
  state.selectedQMode = 'focused';
  state.selectedQNoteLibrary = 'hy-notes';
  state.selectedQCourse = courseId;
  state.selectedQTopic = topic;
  state.selectedQSubtopic = subtopic;
  state.qbankLevel = 'hy-notes';
  saveState?.();

  const modal = $('#modalContent');
  if (!modal) return;
  modal.innerHTML = renderHighYieldNoteModalContentV123(subtopic, folders);
  modal.querySelector('[data-back-high-yield-folders-v123]')?.addEventListener('click', () => {
    modal.innerHTML = renderHighYieldFolderModalContentV123(folders);
    bindHighYieldFolderModalV123(folders);
  });
}

function openHighYieldChapterModalV122(folders = []) {
  const safeFolders = Array.isArray(folders) ? folders.filter(Boolean) : [];
  if (!safeFolders.length) return showToast('No high-yield note folders in this chapter yet');
  if (typeof setModalVariant === 'function') setModalVariant('qbank-set-modal-card');
  showModal(renderHighYieldFolderModalContentV123(safeFolders));
  bindHighYieldFolderModalV123(safeFolders);
}

function bindHighYieldGuideControlsV122() {
  if (window.__highYieldGuideBoundV122) return;
  window.__highYieldGuideBoundV122 = true;
  bindNativePickerButton($('#highYieldGuideCourseBtnV122'), $('#highYieldGuideCourseV122'), { title: 'Course', subtitle: 'Choose the course for high-yield notes.', emptyText: 'No courses available here yet.' });
  bindNativePickerButton($('#highYieldGuideTopicBtnV122'), $('#highYieldGuideTopicV122'), { title: 'Chapter', subtitle: 'Choose the chapter for high-yield ideas and exam tricks.', emptyText: 'No chapters available here yet.' });
  $('#highYieldGuideCourseV122')?.addEventListener('change', event => {
    state.selectedHYCourseV122 = event.target.value || null;
    state.selectedHYTopicV122 = null;
    saveState?.();
    renderHighYieldGuideControlsV122();
  });
  $('#highYieldGuideTopicV122')?.addEventListener('change', event => {
    state.selectedHYTopicV122 = event.target.value || null;
    saveState?.();
    renderHighYieldGuideControlsV122();
  });
  $('#highYieldGuideResetV122')?.addEventListener('click', () => {
    state.selectedHYCourseV122 = null;
    state.selectedHYTopicV122 = null;
    saveState?.();
    renderHighYieldGuideControlsV122();
  });
  $('#openGuidedHighYieldV122')?.addEventListener('click', () => {
    if (!state.selectedHYCourseV122) return showToast('Choose course first');
    if (!state.selectedHYTopicV122) return showToast('Choose chapter first');
    const folders = getFocusNoteSubtopics({ library: 'hy-notes', course: state.selectedHYCourseV122, topic: state.selectedHYTopicV122 });
    openHighYieldChapterModalV122(folders);
  });
}

function bindQbankGuideControls() {
  bindHighYieldGuideControlsV122();
  bindNativePickerButton($('#qbankGuideAnswerModeBtn'), $('#qbankGuideAnswerMode'), { title: 'MCQ mode', subtitle: 'Traditional opens the MCQs with instant feedback and explanation.', emptyText: 'No MCQ modes available.' });
  bindNativePickerButton($('#qbankGuideModeBtn'), $('#qbankGuideMode'), { title: 'Library', subtitle: 'Choose the QBank library.', emptyText: 'No libraries available yet.' });
  bindNativePickerButton($('#qbankGuideLibraryBtn'), $('#qbankGuideLibrary'), { title: 'Note type', subtitle: 'Choose the note style you want to open.', emptyText: 'No note types available here yet.' });
  bindNativePickerButton($('#qbankGuideCourseBtn'), $('#qbankGuideCourse'), { title: 'Course', subtitle: 'Choose the course inside this path.', emptyText: 'No courses available here yet.' });
  bindNativePickerButton($('#qbankGuideTopicBtn'), $('#qbankGuideTopic'), { title: 'Chapter', subtitle: 'Choose the chapter you want to solve.', emptyText: 'No chapters available here yet.' });
  bindNativePickerButton($('#qbankGuideSubtopicBtn'), $('#qbankGuideSubtopic'), { title: 'Lecture', subtitle: 'Choose the lecture or note folder you want.', emptyText: 'No lecture folders here yet.' });
  $('#qbankGuideAnswerMode')?.addEventListener('change', event => {
    state.selectedQAnswerMode = 'free';
    saveState();
    renderQbank();
  });
  $('#qbankGuideMode')?.addEventListener('change', event => {
    state.selectedQMode = event.target.value || null;
    state.selectedQNoteLibrary = state.selectedQMode === 'focused' ? null : state.selectedQNoteLibrary;
    state.selectedQCourse = null;
    state.selectedQTopic = null;
    state.selectedQSubtopic = null;
    state.qbankLevel = 'guided';
    saveState();
    renderQbank();
  });
  $('#qbankGuideLibrary')?.addEventListener('change', event => {
    state.selectedQNoteLibrary = event.target.value || null;
    state.selectedQCourse = null;
    state.selectedQTopic = null;
    state.selectedQSubtopic = null;
    state.qbankLevel = 'guided';
    saveState();
    renderQbank();
  });
  $('#qbankGuideCourse')?.addEventListener('change', event => {
    state.selectedQCourse = event.target.value || null;
    state.selectedQTopic = null;
    state.selectedQSubtopic = null;
    state.qbankLevel = 'guided';
    saveState();
    renderQbank();
  });
  $('#qbankGuideTopic')?.addEventListener('change', event => {
    state.selectedQTopic = event.target.value || null;
    state.selectedQSubtopic = null;
    state.qbankLevel = 'guided';
    saveState();
    renderQbank();
  });
  $('#qbankGuideSubtopic')?.addEventListener('change', event => {
    state.selectedQSubtopic = event.target.value || null;
    state.qbankLevel = 'guided';
    saveState();
    renderQbank();
  });
  $('#openGuidedQbank')?.addEventListener('click', () => {
    if (!state.selectedQMode || state.selectedQMode === 'focused') state.selectedQMode = 'detailed';
    if (!state.selectedQCourse) return showToast('Choose course first');
    if (!state.selectedQTopic) return showToast('Choose chapter first');
    state.selectedQSubtopic = null;
    state.qbankLevel = 'set';
    saveState();
    const subtopics = getQbankSubtopics(state.selectedQMode, state.selectedQCourse, state.selectedQTopic);
    openGuidedQbankChapterModalV112(subtopics);
  });
  $('#qbankGuideReset')?.addEventListener('click', () => {
    state.selectedQAnswerMode = 'free';
    state.selectedQMode = 'detailed';
    state.selectedQNoteLibrary = null;
    state.selectedQCourse = null;
    state.selectedQTopic = null;
    state.selectedQSubtopic = null;
    state.qbankLevel = 'guided';
    saveState();
    renderQbank();
  });
}




function makeExternalCourseId(title = 'course') {
  return `free-${makeSlug(title || 'course')}-${Date.now().toString(36)}`;
}
function makeExternalItemId(prefix = 'item') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
function normalizeFreeFile(file = {}) {
  if (!file || typeof file !== 'object') return null;
  const name = String(file.name || file.fileName || '').trim();
  const source = String(file.source || file.url || file.data || file.publicUrl || '').trim();
  if (!name && !source) return null;
  return {
    id: String(file.id || makeExternalItemId('file')),
    name: name || 'Attached file',
    source,
    type: String(file.type || file.mimeType || '').trim(),
    createdAt: file.createdAt || new Date().toISOString()
  };
}
function normalizeFreeLecture(lecture = {}) {
  const title = String(lecture.title || 'Free lecture').trim();
  const files = Array.isArray(lecture.files) ? lecture.files.map(normalizeFreeFile).filter(Boolean) : [];
  const url = String(lecture.url || lecture.videoUrl || lecture.publicUrl || '').trim();
  const detectedType = isYoutubeUrl(url) ? 'youtube' : (isLikelyDirectVideo(url) ? 'direct' : 'link');
  const sourceType = String(lecture.sourceType || lecture.videoSourceType || detectedType).trim() || detectedType;
  const uploadedToCloud = Boolean(lecture.uploadedToCloud || lecture.videoStoragePath || (sourceType === 'upload' && url.includes('supabase')));
  return {
    id: String(lecture.id || makeExternalItemId('lecture')),
    title,
    url,
    videoUrl: url,
    publicUrl: String(lecture.publicUrl || url || '').trim(),
    sourceType,
    uploadedToCloud,
    videoFileName: String(lecture.videoFileName || '').trim(),
    videoStoragePath: String(lecture.videoStoragePath || '').trim(),
    videoBucket: String(lecture.videoBucket || '').trim(),
    storageDirection: String(lecture.storageDirection || '').trim(),
    storageVerified: Boolean(lecture.storageVerified),
    storageVerifyMessage: String(lecture.storageVerifyMessage || '').trim(),
    description: String(lecture.description || '').trim(),
    duration: String(lecture.duration || '').trim(),
    thumbnail: String(lecture.thumbnail || lecture.thumb || lecture.poster || '').trim(),
    files,
    createdAt: lecture.createdAt || new Date().toISOString(),
    updatedAt: lecture.updatedAt || lecture.createdAt || new Date().toISOString()
  };
}
function normalizeFreeChapter(chapter = {}) {
  const title = String(chapter.title || 'Chapter').trim();
  const lectures = Array.isArray(chapter.lectures) ? chapter.lectures.map(normalizeFreeLecture) : [];
  return {
    id: String(chapter.id || makeExternalItemId('chapter')),
    title,
    description: String(chapter.description || '').trim(),
    lectures,
    createdAt: chapter.createdAt || new Date().toISOString(),
    updatedAt: chapter.updatedAt || chapter.createdAt || new Date().toISOString()
  };
}
function normalizeFreeCourse(course = {}) {
  const title = String(course.title || 'Free course').trim();
  const chapters = Array.isArray(course.chapters) ? course.chapters.map(normalizeFreeChapter) : [];
  return {
    id: String(course.id || makeExternalCourseId(title)),
    title,
    provider: String(course.provider || course.creator || '').trim(),
    icon: String(course.icon || '🎁').trim() || '🎁',
    description: String(course.description || '').trim(),
    sourceLink: String(course.sourceLink || course.source || '').trim(),
    coverImage: String(course.coverImage || course.image || '').trim(),
    chapters,
    createdAt: course.createdAt || new Date().toISOString(),
    updatedAt: course.updatedAt || course.createdAt || new Date().toISOString()
  };
}
function normalizeFreeCourses(courses = []) {
  return (Array.isArray(courses) ? courses : []).map(normalizeFreeCourse);
}
function getFreeCourses() {
  state.freeCourses = normalizeFreeCourses(state.freeCourses || []);
  return state.freeCourses;
}
function getFreeCourse(courseId = state.selectedFreeCourseId) {
  return getFreeCourses().find(course => String(course.id) === String(courseId)) || null;
}
function getFreeChapter(courseId = state.selectedFreeCourseId, chapterId = state.selectedFreeChapterId) {
  const course = getFreeCourse(courseId);
  return (course?.chapters || []).find(ch => String(ch.id) === String(chapterId)) || null;
}

function getFreeLecture(lectureId = state.selectedFreeLectureId) {
  const chapter = getFreeChapter();
  return (chapter?.lectures || []).find(lecture => String(lecture.id) === String(lectureId)) || null;
}
function freeLectureCount(course = {}) {
  return (course.chapters || []).reduce((total, chapter) => total + (chapter.lectures || []).length, 0);
}
function saveFreeCoursesState(options = {}) {
  state.freeCourses = normalizeFreeCourses(state.freeCourses || []);
  saveState();
  if (options.render !== false) renderVideos();
}

async function publishFreeCoursesState() {
  state.freeCourses = normalizeFreeCourses(state.freeCourses || []);
  clearTimeout(cloudSaveTimer);
  persistGlobalContent({ skipCloud: true });
  if (!cloudConfigured()) {
    throw new Error('Supabase is not configured. Free courses are saved in this browser only until Supabase is connected.');
  }
  updateCloudBadge('Publishing…');
  const ok = await saveContentToSupabase({ force: true });
  if (!ok) throw new Error('Could not publish Free Courses to Supabase.');
  return true;
}

async function saveAndPublishFreeCourses({ render = true, toast = 'Free courses published to Supabase' } = {}) {
  saveFreeCoursesState({ render });
  await publishFreeCoursesState();
  if (toast) showToast(toast);
}
function setFreeCoursesLevel(level = 'courses') {
  state.videoLevel = 'free-courses';
  state.freeCourseLevel = level;
  saveState();
  renderVideos();
}


function freeCourseVisual(course = {}) {
  if (course.coverImage) {
    return `<div class="free-pro-course-cover"><img src="${esc(course.coverImage)}" alt="${esc(course.title)}" loading="lazy" /></div>`;
  }
  return `<div class="free-pro-course-cover gradient"><span>${esc(course.icon || '🎁')}</span></div>`;
}

function freeLectureVisual(lecture = {}) {
  if (lecture.thumbnail) {
    return `<div class="free-pro-lecture-cover"><img src="${esc(lecture.thumbnail)}" alt="${esc(lecture.title)}" loading="lazy" /></div>`;
  }
  return `<div class="free-pro-lecture-cover gradient"><span>▶</span></div>`;
}

function renderFreeCoursesHub() {
  const grid = $('#videoGrid');
  if (!grid) return;
  const courses = getFreeCourses();
  grid.className = 'video-library-grid free-pro-grid';
  grid.innerHTML = `
    <div class="free-pro-head premium-card">
      <button class="circle-mini" data-free-back="videos">‹</button>
      <div class="free-pro-head-copy">
        <span class="eyebrow">Free Courses</span>
        <h2>Course Library</h2>
        <p>Browse external public courses in a clean course → chapter → lecture layout.</p>
      </div>
      ${isAdmin() ? '<div class="contextual-actions"><button class="soft-btn small" type="button" data-publish-public-content>Publish public snapshot</button><button class="primary-btn small" type="button" data-add-free-course>+ Course</button></div>' : ''}
    </div>
    ${!courses.length ? `
      <div class="public-content-status premium-card">
        <span>☁️</span>
        <div>
          <b>Loading public Free Courses from Supabase…</b>
          <p>${esc(publicContentLoadStatus || 'This content is public and should appear without student sync when Supabase config is available.')}</p>
          <button class="soft-btn small" type="button" data-public-content-retry>Retry public load</button>
        </div>
      </div>
    ` : ''}
    <div class="free-pro-card-grid">
      ${courses.map(course => `
        <article class="free-pro-course-card premium-card ${isAdmin() ? 'editable-card' : ''}" data-free-course="${esc(course.id)}">
          ${isAdmin() ? `<div class="card-admin-actions video-actions"><button class="tiny-btn" type="button" data-edit-free-course="${esc(course.id)}">Edit</button><button class="tiny-btn danger" type="button" data-delete-free-course="${esc(course.id)}">Delete</button></div>` : ''}
          ${freeCourseVisual(course)}
          <div class="free-pro-course-body">
            <span class="eyebrow">${esc(course.provider || 'External course')}</span>
            <h3>${esc(course.title)}</h3>
            <p>${esc(course.description || 'Open this course and browse its chapters and lectures.')}</p>
            <div class="free-pro-meta">
              <span>${(course.chapters || []).length} chapters</span>
              <span>${freeLectureCount(course)} lectures</span>
            </div>
          </div>
        </article>
      `).join('') || `
        <div class="video-empty premium-card">
          <div class="hub-icon">🎁</div>
          <h3>No free courses yet</h3>
          <p>${isAdmin() ? 'Add the first external course.' : 'Free courses will appear here after the admin adds them.'}</p>
          ${isAdmin() ? '<button class="primary-btn small" type="button" data-add-free-course>Add free course</button>' : ''}
        </div>
      `}
    </div>
  `;
}

function renderFreeCourseChapters() {
  const grid = $('#videoGrid');
  const course = getFreeCourse();
  if (!grid) return;
  if (!course) { state.freeCourseLevel = 'courses'; return renderFreeCoursesHub(); }
  grid.className = 'video-library-grid free-pro-grid';
  grid.innerHTML = `
    <div class="free-pro-head premium-card">
      <button class="circle-mini" data-free-back="free-courses">‹</button>
      <div class="free-pro-head-copy">
        <span class="eyebrow">${esc(course.provider || 'Free course')}</span>
        <h2>${esc(course.title)}</h2>
        <p>${esc(course.description || 'Choose a chapter/category to continue.')}</p>
      </div>
      ${isAdmin() ? `<div class="contextual-actions"><button class="primary-btn small" type="button" data-add-free-chapter>+ Chapter</button><button class="soft-btn small" type="button" data-edit-free-course="${esc(course.id)}">Edit course</button></div>` : ''}
    </div>
    ${course.coverImage ? `<div class="free-pro-hero premium-card"><img src="${esc(course.coverImage)}" alt="${esc(course.title)}" loading="lazy" /><div><span class="eyebrow">${esc(course.provider || 'Course')}</span><h3>${esc(course.title)}</h3><p>${esc(course.description || '')}</p></div></div>` : ''}
    <div class="free-pro-card-grid chapter-grid">
      ${(course.chapters || []).map(chapter => `
        <article class="free-pro-chapter-card premium-card ${isAdmin() ? 'editable-card' : ''}" data-free-chapter="${esc(chapter.id)}">
          ${isAdmin() ? `<div class="card-admin-actions video-actions"><button class="tiny-btn" type="button" data-edit-free-chapter="${esc(chapter.id)}">Edit</button><button class="tiny-btn danger" type="button" data-delete-free-chapter="${esc(chapter.id)}">Delete</button></div>` : ''}
          <div class="free-pro-chapter-icon">📚</div>
          <div>
            <span class="eyebrow">Chapter</span>
            <h3>${esc(chapter.title)}</h3>
            <p>${esc(chapter.description || 'Open this chapter to see its lectures.')}</p>
            <div class="free-pro-meta"><span>${(chapter.lectures || []).length} lectures</span></div>
          </div>
        </article>
      `).join('') || `
        <div class="video-empty premium-card">
          <div class="hub-icon">📚</div>
          <h3>No chapters yet</h3>
          <p>${isAdmin() ? 'Add chapters, then add lectures inside each chapter.' : 'This free course has no chapters yet.'}</p>
          ${isAdmin() ? '<button class="primary-btn small" type="button" data-add-free-chapter>Add chapter</button>' : ''}
        </div>
      `}
    </div>
  `;
}

function renderFreeCourseLectures() {
  const grid = $('#videoGrid');
  const course = getFreeCourse();
  const chapter = getFreeChapter();
  if (!grid) return;
  if (!course) { state.freeCourseLevel = 'courses'; return renderFreeCoursesHub(); }
  if (!chapter) { state.freeCourseLevel = 'chapters'; return renderFreeCourseChapters(); }
  grid.className = 'video-library-grid free-pro-grid';
  grid.innerHTML = `
    <div class="free-pro-head premium-card">
      <button class="circle-mini" data-free-back="free-chapters">‹</button>
      <div class="free-pro-head-copy">
        <span class="eyebrow">${esc(course.title)}</span>
        <h2>${esc(chapter.title)}</h2>
        <p>${esc(chapter.description || 'Choose a lecture. It opens inside the app.')}</p>
      </div>
      ${isAdmin() ? `<div class="contextual-actions"><button class="primary-btn small" type="button" data-add-free-lecture>+ Lecture</button><button class="soft-btn small" type="button" data-edit-free-chapter="${esc(chapter.id)}">Edit chapter</button></div>` : ''}
    </div>
    <div class="free-pro-card-grid lecture-grid">
      ${(chapter.lectures || []).map(lecture => `
        <article class="free-pro-lecture-card premium-card ${isAdmin() ? 'editable-card' : ''}" data-free-lecture="${esc(lecture.id)}">
          ${isAdmin() ? `<div class="card-admin-actions video-actions"><button class="tiny-btn" type="button" data-edit-free-lecture="${esc(lecture.id)}">Edit</button><button class="tiny-btn danger" type="button" data-delete-free-lecture="${esc(lecture.id)}">Delete</button></div>` : ''}
          ${freeLectureVisual(lecture)}
          <div class="free-pro-course-body">
            <span class="eyebrow">Lecture</span>
            <h3>${esc(lecture.title)}</h3>
            <p>${esc(lecture.description || 'Open this lecture inside NovaMed.')}</p>
            <div class="free-pro-meta">
              <span>${esc(lecture.duration || 'Video')}</span>
              <span>${(lecture.files || []).length} files</span>
            </div>
          </div>
        </article>
      `).join('') || `
        <div class="video-empty premium-card">
          <div class="hub-icon">🎬</div>
          <h3>No lectures yet</h3>
          <p>${isAdmin() ? 'Add the first external video link for this chapter.' : 'No public lectures have been added here yet.'}</p>
          ${isAdmin() ? '<button class="primary-btn small" type="button" data-add-free-lecture>Add lecture</button>' : ''}
        </div>
      `}
    </div>
  `;
}

function renderFreeCourses() {
  renderVideoBreadcrumb(false);
  if (state.freeCourseLevel === 'lectures') return renderFreeCourseLectures();
  if (state.freeCourseLevel === 'chapters') return renderFreeCourseChapters();
  return renderFreeCoursesHub();
}

function freeCoursesModalTitle() {
  const course = getFreeCourse();
  const chapter = getFreeChapter();
  const lecture = getFreeLecture();
  if (state.freeCourseLevel === 'watch') return { eyebrow: `${course?.title || 'Free Courses'} • ${chapter?.title || 'Lectures'}`, title: lecture?.title || 'Watch lecture', body: 'Watch inside NovaMed, then return to the lecture list.' };
  if (state.freeCourseLevel === 'lectures') return { eyebrow: course?.title || 'Free Courses', title: chapter?.title || 'Lectures', body: 'Choose a lecture card to watch inside NovaMed.' };
  if (state.freeCourseLevel === 'chapters') return { eyebrow: course?.provider || 'Free Courses', title: course?.title || 'Course', body: course?.description || 'Choose a chapter/category to continue.' };
  return { eyebrow: 'Free Courses', title: 'Course Library', body: 'Public external courses organized as course, chapter, and lecture cards.' };
}

function freeCoursesModalBackTarget() {
  if (state.freeCourseLevel === 'watch') return 'lectures';
  if (state.freeCourseLevel === 'lectures') return 'chapters';
  if (state.freeCourseLevel === 'chapters') return 'courses';
  return 'close';
}

function freeCoursesModalCoursesHtml() {
  const courses = getFreeCourses();
  if (!courses.length) {
    return `
      <div class="free-modal-empty premium-card">
        <div class="hub-icon">🎁</div>
        <h3>No free courses yet</h3>
        <p>${isAdmin() ? 'Add the first public course, then add chapters and lectures.' : 'Free courses will appear after the admin publishes them.'}</p>
        ${isAdmin() ? '<button class="primary-btn small" type="button" data-add-free-course>Add course</button>' : ''}
      </div>`;
  }
  return `
    <div class="free-modal-card-grid courses">
      ${courses.map(course => `
        <article class="free-modal-course-card premium-card ${isAdmin() ? 'editable-card' : ''}" data-free-modal-course="${esc(course.id)}">
          ${isAdmin() ? `<div class="card-admin-actions video-actions"><button class="tiny-btn" type="button" data-edit-free-course="${esc(course.id)}">Edit</button><button class="tiny-btn danger" type="button" data-delete-free-course="${esc(course.id)}">Delete</button></div>` : ''}
          ${freeCourseVisual(course)}
          <div class="free-modal-copy">
            <span class="eyebrow">${esc(course.provider || 'External course')}</span>
            <h3>${esc(course.title)}</h3>
            <p>${esc(course.description || 'Open this course to browse its chapters and lectures.')}</p>
            <div class="free-pro-meta"><span>${(course.chapters || []).length} chapters</span><span>${freeLectureCount(course)} lectures</span></div>
          </div>
        </article>`).join('')}
    </div>`;
}

function freeCoursesModalChaptersHtml() {
  const course = getFreeCourse();
  if (!course) return freeCoursesModalCoursesHtml();
  return `
    ${course.coverImage ? `<div class="free-modal-hero premium-card"><img src="${esc(course.coverImage)}" alt="${esc(course.title)}" loading="lazy" /><div><span class="eyebrow">${esc(course.provider || 'External course')}</span><h3>${esc(course.title)}</h3><p>${esc(course.description || '')}</p></div></div>` : ''}
    <div class="free-modal-card-grid chapters">
      ${(course.chapters || []).map(chapter => `
        <article class="free-modal-chapter-card premium-card ${isAdmin() ? 'editable-card' : ''}" data-free-modal-chapter="${esc(chapter.id)}">
          ${isAdmin() ? `<div class="card-admin-actions video-actions"><button class="tiny-btn" type="button" data-edit-free-chapter="${esc(chapter.id)}">Edit</button><button class="tiny-btn danger" type="button" data-delete-free-chapter="${esc(chapter.id)}">Delete</button></div>` : ''}
          <div class="free-modal-chapter-icon">📚</div>
          <div class="free-modal-copy">
            <span class="eyebrow">Chapter</span>
            <h3>${esc(chapter.title)}</h3>
            <p>${esc(chapter.description || 'Open this chapter to see its lectures.')}</p>
            <div class="free-pro-meta"><span>${(chapter.lectures || []).length} lectures</span></div>
          </div>
        </article>`).join('') || `
          <div class="free-modal-empty premium-card">
            <div class="hub-icon">📚</div>
            <h3>No chapters yet</h3>
            <p>${isAdmin() ? 'Add the first chapter/category for this course.' : 'This course has no public chapters yet.'}</p>
            ${isAdmin() ? '<button class="primary-btn small" type="button" data-add-free-chapter>Add chapter</button>' : ''}
          </div>`}
    </div>`;
}

function freeCoursesModalLecturesHtml() {
  const course = getFreeCourse();
  const chapter = getFreeChapter();
  if (!course) return freeCoursesModalCoursesHtml();
  if (!chapter) return freeCoursesModalChaptersHtml();
  return `
    <div class="free-modal-card-grid lectures">
      ${(chapter.lectures || []).map(lecture => `
        <article class="free-modal-lecture-card premium-card ${isAdmin() ? 'editable-card' : ''}" data-free-modal-lecture="${esc(lecture.id)}">
          ${isAdmin() ? `<div class="card-admin-actions video-actions"><button class="tiny-btn" type="button" data-edit-free-lecture="${esc(lecture.id)}">Edit</button><button class="tiny-btn danger" type="button" data-delete-free-lecture="${esc(lecture.id)}">Delete</button></div>` : ''}
          ${freeLectureVisual(lecture)}
          <div class="free-modal-copy">
            <span class="eyebrow">Lecture</span>
            <h3>${esc(lecture.title)}</h3>
            <p>${esc(lecture.description || 'Open this lecture inside NovaMed.')}</p>
            <div class="free-pro-meta"><span>${esc(lecture.duration || 'Video')}</span><span>${(lecture.files || []).length} files</span></div>
          </div>
        </article>`).join('') || `
          <div class="free-modal-empty premium-card">
            <div class="hub-icon">🎬</div>
            <h3>No lectures yet</h3>
            <p>${isAdmin() ? 'Add the first lecture for this chapter.' : 'No public lectures have been added here yet.'}</p>
            ${isAdmin() ? '<button class="primary-btn small" type="button" data-add-free-lecture>Add lecture</button>' : ''}
          </div>`}
    </div>`;
}


function freeCoursesModalWatchHtml() {
  const course = getFreeCourse();
  const chapter = getFreeChapter();
  const lecture = getFreeLecture();
  if (!lecture) return freeCoursesModalLecturesHtml();
  return `
    <div class="free-modal-watch-page">
      <div class="free-modal-watch-header premium-card">
        ${lecture.thumbnail ? `<img class="free-modal-watch-poster" src="${esc(lecture.thumbnail)}" alt="${esc(lecture.title)}" loading="lazy" />` : '<div class="free-modal-watch-poster fallback">▶</div>'}
        <div>
          <span class="eyebrow">${esc(course?.title || 'Free course')} • ${esc(chapter?.title || 'Chapter')}</span>
          <h3>${esc(lecture.title)}</h3>
          <p>${esc(lecture.description || 'External lecture inside NovaMed.')}</p>
          <div class="free-pro-meta">
            <span>${esc(lecture.duration || 'Video')}</span>
            <span>${(lecture.files || []).length} files</span>
          </div>
        </div>
      </div>
      <div class="free-modal-watch-player">
        ${renderExternalVideoPlayer(lecture.url, lecture.title)}
      </div>
      ${renderFreeLectureResources(lecture)}
    </div>
  `;
}

function freeCoursesModalBodyHtml() {
  if (state.freeCourseLevel === 'watch') return freeCoursesModalWatchHtml();
  if (state.freeCourseLevel === 'lectures') return freeCoursesModalLecturesHtml();
  if (state.freeCourseLevel === 'chapters') return freeCoursesModalChaptersHtml();
  return freeCoursesModalCoursesHtml();
}

function renderFreeCoursesModal() {
  const title = freeCoursesModalTitle();
  const backTarget = freeCoursesModalBackTarget();
  setModalVariant('free-courses-modal-card');
  $('#modalContent').innerHTML = `
    <div class="free-courses-modal-shell">
      <div class="free-courses-modal-head">
        <button class="free-modal-back" type="button" data-free-modal-back="${esc(backTarget)}">${backTarget === 'close' ? '×' : '‹'}</button>
        <div>
          <span class="eyebrow">${esc(title.eyebrow)}</span>
          <h2 id="modalTitle">${esc(title.title)}</h2>
          <p>${esc(title.body)}</p>
        </div>
        ${isAdmin() ? `<div class="free-modal-actions">${state.freeCourseLevel === 'courses' ? '<button class="soft-btn small" type="button" data-publish-public-content>Publish public snapshot</button><button class="primary-btn small" type="button" data-add-free-course>+ Course</button>' : state.freeCourseLevel === 'chapters' ? '<button class="primary-btn small" type="button" data-add-free-chapter>+ Chapter</button>' : '<button class="primary-btn small" type="button" data-add-free-lecture>+ Lecture</button>'}</div>` : '<div></div>'}
      </div>
      <div class="free-courses-modal-body">${freeCoursesModalBodyHtml()}</div>
    </div>`;
  bindFreeCoursesModalEvents();
  if (state.freeCourseLevel === 'watch') {
    const lecture = getFreeLecture();
    if (lecture) {
      setTimeout(() => {
        bindNovaVideoControls({ id: `free-${lecture.id}`, url: lecture.url, title: lecture.title });
        $$('[data-download-free-file]').forEach(btn => btn.addEventListener('click', event => downloadFreeLectureFile(event.currentTarget.dataset.downloadFreeFile, event.currentTarget.dataset.freeFileId)));
      }, 0);
    }
  }
}

function openFreeCoursesModal() {
  state.freeCourseLevel = 'courses';
  state.selectedFreeCourseId = null;
  state.selectedFreeChapterId = null;
  state.selectedFreeLectureId = null;
  saveState();
  showModal('<div class="free-courses-modal-shell"></div>');
  renderFreeCoursesModal();
}

function bindFreeCoursesModalEvents() {
  const root = $('#modalContent');
  if (!root) return;
  root.onclick = event => {
    const backBtn = event.target.closest('[data-free-modal-back]');
    const publishBtn = event.target.closest('[data-publish-public-content]');
    const addCourseBtn = event.target.closest('[data-add-free-course]');
    const editCourseBtn = event.target.closest('[data-edit-free-course]');
    const deleteCourseBtn = event.target.closest('[data-delete-free-course]');
    const courseCard = event.target.closest('[data-free-modal-course]');
    const addChapterBtn = event.target.closest('[data-add-free-chapter]');
    const editChapterBtn = event.target.closest('[data-edit-free-chapter]');
    const deleteChapterBtn = event.target.closest('[data-delete-free-chapter]');
    const chapterCard = event.target.closest('[data-free-modal-chapter]');
    const addLectureBtn = event.target.closest('[data-add-free-lecture]');
    const editLectureBtn = event.target.closest('[data-edit-free-lecture]');
    const deleteLectureBtn = event.target.closest('[data-delete-free-lecture]');
    const lectureCard = event.target.closest('[data-free-modal-lecture]');

    if (backBtn) {
      const target = backBtn.dataset.freeModalBack;
      if (target === 'close') return closeModal();
      if (target === 'courses') { state.freeCourseLevel = 'courses'; state.selectedFreeCourseId = null; state.selectedFreeChapterId = null; state.selectedFreeLectureId = null; }
      if (target === 'chapters') { state.freeCourseLevel = 'chapters'; state.selectedFreeChapterId = null; state.selectedFreeLectureId = null; }
      if (target === 'lectures') { state.freeCourseLevel = 'lectures'; state.selectedFreeLectureId = null; }
      saveState();
      renderFreeCoursesModal();
      return;
    }
    if (publishBtn) {
      if (!requireAdmin('publish public snapshot')) return;
      publishPublicContentSnapshot(cloudContentPayload()).then(() => showToast('Public snapshot published')).catch(err => showToast(`Snapshot publish failed: ${err.message || 'check Storage policies'}`));
      return;
    }
    if (addCourseBtn) { if (requireAdmin('add free courses')) openFreeCourseEditor(); return; }
    if (editCourseBtn) { if (requireAdmin('edit free courses')) openFreeCourseEditor(editCourseBtn.dataset.editFreeCourse); return; }
    if (deleteCourseBtn) { if (requireAdmin('delete free courses')) deleteFreeCourse(deleteCourseBtn.dataset.deleteFreeCourse); return; }
    if (courseCard && !event.target.closest('.card-admin-actions')) { state.selectedFreeCourseId = courseCard.dataset.freeModalCourse; state.selectedFreeChapterId = null; state.selectedFreeLectureId = null; state.freeCourseLevel = 'chapters'; saveState(); renderFreeCoursesModal(); return; }
    if (addChapterBtn) { if (requireAdmin('add free chapters')) openFreeChapterEditor(); return; }
    if (editChapterBtn) { if (requireAdmin('edit free chapters')) openFreeChapterEditor(editChapterBtn.dataset.editFreeChapter); return; }
    if (deleteChapterBtn) { if (requireAdmin('delete free chapters')) deleteFreeChapter(deleteChapterBtn.dataset.deleteFreeChapter); return; }
    if (chapterCard && !event.target.closest('.card-admin-actions')) { state.selectedFreeChapterId = chapterCard.dataset.freeModalChapter; state.selectedFreeLectureId = null; state.freeCourseLevel = 'lectures'; saveState(); renderFreeCoursesModal(); return; }
    if (addLectureBtn) { if (requireAdmin('add free lectures')) openFreeLectureEditor(); return; }
    if (editLectureBtn) { if (requireAdmin('edit free lectures')) openFreeLectureEditor(editLectureBtn.dataset.editFreeLecture); return; }
    if (deleteLectureBtn) { if (requireAdmin('delete free lectures')) deleteFreeLecture(deleteLectureBtn.dataset.deleteFreeLecture); return; }
    if (lectureCard && !event.target.closest('.card-admin-actions')) { state.selectedFreeLectureId = lectureCard.dataset.freeModalLecture; state.freeCourseLevel = 'watch'; saveState(); renderFreeCoursesModal(); return; }
  };
}

function extractUrlFromEmbedCode(value = '') {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (!raw.includes('<') && !/src\s*=\s*['"]/i.test(raw)) return raw;
  const srcMatch = raw.match(/src\s*=\s*["']([^"']+)["']/i);
  if (srcMatch?.[1]) return srcMatch[1].trim();
  const hrefMatch = raw.match(/href\s*=\s*["']([^"']+)["']/i);
  if (hrefMatch?.[1]) return hrefMatch[1].trim();
  const urlMatch = raw.match(/https?:\/\/[^\s"'<>]+/i);
  return urlMatch ? urlMatch[0].trim() : raw;
}

function normalizeUrlWithProtocol(url = '') {
  const raw = extractUrlFromEmbedCode(url);
  if (!raw) return '';
  if (/^(https?:|data:|blob:)/i.test(raw)) return raw;
  if (/^(www\.|youtu\.be\/|youtube\.com\/|youtube-nocookie\.com\/)/i.test(raw)) return `https://${raw}`;
  return raw;
}

function youtubeVideoId(url = '') {
  const raw = normalizeUrlWithProtocol(url);
  if (!raw) return '';
  try {
    const u = new URL(raw);
    const host = u.hostname.replace(/^www\./, '').toLowerCase();
    let id = '';
    if (host === 'youtu.be') {
      id = u.pathname.split('/').filter(Boolean)[0] || '';
    } else if (host.endsWith('youtube.com') || host.endsWith('youtube-nocookie.com')) {
      if (u.pathname.startsWith('/watch')) id = u.searchParams.get('v') || '';
      else if (u.pathname.startsWith('/shorts/')) id = u.pathname.split('/').filter(Boolean)[1] || '';
      else if (u.pathname.startsWith('/embed/')) id = u.pathname.split('/').filter(Boolean)[1] || '';
      else if (u.pathname.startsWith('/live/')) id = u.pathname.split('/').filter(Boolean)[1] || '';
      else if (u.pathname.startsWith('/v/')) id = u.pathname.split('/').filter(Boolean)[1] || '';
      else if (u.pathname.startsWith('/attribution_link')) {
        const nested = u.searchParams.get('u') || '';
        if (nested) return youtubeVideoId(new URL(nested, 'https://www.youtube.com').toString());
      }
    }
    return String(id || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32);
  } catch (_) {
    const match = raw.match(/(?:youtu\.be\/|v=|embed\/|shorts\/|live\/)([a-zA-Z0-9_-]{6,})/);
    return match ? match[1].replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32) : '';
  }
}

function youtubeEmbedUrl(url = '') {
  const id = youtubeVideoId(url);
  if (!id) return '';
  const params = new URLSearchParams({
    rel: '0',
    modestbranding: '1',
    playsinline: '1',
    enablejsapi: '1'
  });
  try {
    if (location?.origin && location.origin !== 'null') params.set('origin', location.origin);
  } catch (_) {}
  return `https://www.youtube.com/embed/${encodeURIComponent(id)}?${params.toString()}`;
}

function isYoutubeUrl(url = '') {
  return Boolean(youtubeVideoId(url));
}

function isLikelyDirectVideo(url = '') {
  return /\.(mp4|m4v|webm|mov|ogg)(\?|#|$)/i.test(String(url || '')) || /supabase\.co|supabase\.in|storage\.googleapis\.com|cloudfront\.net/i.test(String(url || ''));
}

function renderExternalVideoPlayer(url = '', title = 'External lecture') {
  const source = normalizeUrlWithProtocol(url);
  if (!source) return '<div class="player-placeholder"><span>▶</span><b>No video link yet</b><small>Admin can paste a YouTube or direct video URL.</small></div>';
  const embed = youtubeEmbedUrl(source);
  if (embed) {
    return `
      <div class="nova-player-shell external-player-shell youtube-player-shell clean-free-player">
        <div class="video-stage external-video-stage">
          <iframe class="external-video-frame youtube-video-frame" src="${esc(embed)}" title="${esc(title)}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>
        </div>
      </div>
    `;
  }
  if (!isLikelyDirectVideo(source)) {
    return `
      <div class="external-link-card premium-card minimal">
        <span>🔗</span>
        <b>This link is not a playable video source</b>
        <p>Use a direct MP4/WebM link or upload the video to Supabase for in-app playback.</p>
      </div>
    `;
  }
  return renderNovaVideoPlayer({ url: source });
}
function renderFreeLectureResources(lecture = {}) {
  const files = Array.isArray(lecture.files) ? lecture.files : [];
  return `
    <div class="video-resource-buttons free-resource-buttons" aria-label="Free lecture resources">
      ${files.map(file => `
        <button class="resource-action-btn pdf" type="button" data-download-free-file="${esc(lecture.id)}" data-free-file-id="${esc(file.id)}">
          <span>📎</span><b>${esc(file.name || 'Attached file')}</b><small>Download</small>
        </button>
      `).join('') || '<div class="resource-empty-note">No downloadable files attached yet.</div>'}
    </div>
  `;
}
function downloadFreeLectureFile(lectureId, fileId) {
  const chapter = getFreeChapter();
  const lecture = (chapter?.lectures || []).find(item => String(item.id) === String(lectureId));
  const file = (lecture?.files || []).find(item => String(item.id) === String(fileId));
  if (!file?.source) return showToast('No file source attached.');
  try {
    const link = document.createElement('a');
    link.href = file.source;
    link.download = file.name || 'free-course-file';
    link.target = '_blank';
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
    showToast('File opened/download started');
  } catch (_) {
    window.open(file.source, '_blank', 'noopener');
  }
}
function openFreeLecture(lectureId) {
  const course = getFreeCourse();
  const chapter = getFreeChapter();
  const lecture = (chapter?.lectures || []).find(item => String(item.id) === String(lectureId));
  if (!lecture) return;
  showModal(`
    <div class="free-pro-watch">
      <div class="free-pro-watch-head">
        ${lecture.thumbnail ? `<img src="${esc(lecture.thumbnail)}" alt="${esc(lecture.title)}" loading="lazy" />` : '<div class="free-pro-watch-thumb">▶</div>'}
        <div>
          <span class="eyebrow">${esc(course?.title || 'Free course')} • ${esc(chapter?.title || 'Chapter')}</span>
          <h2 id="modalTitle">${esc(lecture.title)}</h2>
          <p>${esc(lecture.description || 'External lecture inside NovaMed.')}</p>
          <div class="meta-row">
            <span class="tag">${esc(lecture.duration || 'Video')}</span>
            <span class="tag">${(lecture.files || []).length} file${(lecture.files || []).length === 1 ? '' : 's'}</span>
          </div>
        </div>
      </div>
      ${renderExternalVideoPlayer(lecture.url, lecture.title)}
      ${renderFreeLectureResources(lecture)}
    </div>
  `);
  setTimeout(() => {
    bindNovaVideoControls({ id: `free-${lecture.id}`, url: lecture.url, title: lecture.title });
    $$('[data-download-free-file]').forEach(btn => btn.addEventListener('click', event => downloadFreeLectureFile(event.currentTarget.dataset.downloadFreeFile, event.currentTarget.dataset.freeFileId)));
  }, 0);
}
function openFreeCourseEditor(courseId = null) {
  const courses = getFreeCourses();
  const editing = courses.find(course => String(course.id) === String(courseId)) || null;
  showModal(`
    <h2 id="modalTitle">${editing ? 'Edit free course' : 'Add free course'}</h2>
    <p class="modal-muted">Create an external course folder. Add chapters and lectures after opening it.</p>
    <form id="freeCourseForm" class="form-stack contextual-form">
      <input name="title" required placeholder="Course name, e.g. Medicine by Mimicry" value="${esc(editing?.title || '')}" />
      <input name="provider" placeholder="Creator / provider, e.g. Mimicry" value="${esc(editing?.provider || '')}" />
      <input name="icon" maxlength="4" placeholder="Icon emoji, e.g. 🧬" value="${esc(editing?.icon || '🎁')}" />
      <input name="sourceLink" placeholder="Optional source link: YouTube channel, Telegram, website..." value="${esc(editing?.sourceLink || '')}" />
      <input name="coverImage" placeholder="Optional course cover image URL" value="${esc(editing?.coverImage || '')}" />
      <textarea name="description" placeholder="Short description">${esc(editing?.description || '')}</textarea>
      <button class="primary-btn" type="submit">${editing ? 'Save course' : 'Create course'}</button>
    </form>
  `);
  $('#freeCourseForm')?.addEventListener('submit', async event => {
    event.preventDefault();
    const submit = event.currentTarget.querySelector('button[type="submit"]');
    if (submit) { submit.disabled = true; submit.textContent = 'Publishing…'; }
    try {
      const form = new FormData(event.currentTarget);
      const title = String(form.get('title') || '').trim();
      if (!title) throw new Error('Course name is required');
      const payload = {
        title,
        provider: String(form.get('provider') || '').trim(),
        icon: String(form.get('icon') || '').trim() || '🎁',
        sourceLink: normalizeUrlWithProtocol(form.get('sourceLink') || ''),
        coverImage: String(form.get('coverImage') || '').trim(),
        description: String(form.get('description') || '').trim(),
        updatedAt: new Date().toISOString()
      };
      if (editing) Object.assign(editing, payload);
      else courses.unshift({ id: makeExternalCourseId(title), ...payload, chapters: [], createdAt: new Date().toISOString() });
      await saveAndPublishFreeCourses({ render: true, toast: editing ? 'Free course published' : 'Free course added and published' });
      closeModal();
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Could not publish free course');
      if (submit) { submit.disabled = false; submit.textContent = editing ? 'Save course' : 'Create course'; }
    }
  });
}
function deleteFreeCourse(courseId) {
  const course = getFreeCourse(courseId);
  if (!course) return;
  if (!confirm(`Delete free course: ${course.title}?`)) return;
  state.freeCourses = getFreeCourses().filter(item => String(item.id) !== String(courseId));
  state.freeCourseLevel = 'courses';
  state.selectedFreeCourseId = null;
  state.selectedFreeChapterId = null;
  saveAndPublishFreeCourses({ toast: 'Free course deleted and published' }).catch(err => {
    console.error(err);
    saveFreeCoursesState();
    showToast(err.message || 'Deleted locally, but cloud publish failed');
  });
}
function openFreeChapterEditor(chapterId = null) {
  const course = getFreeCourse();
  if (!course) return showToast('Open a free course first');
  const editing = (course.chapters || []).find(chapter => String(chapter.id) === String(chapterId)) || null;
  showModal(`
    <h2 id="modalTitle">${editing ? 'Edit chapter' : 'Add chapter'}</h2>
    <p class="modal-muted">Course: <b>${esc(course.title)}</b></p>
    <form id="freeChapterForm" class="form-stack contextual-form">
      <input name="title" required placeholder="Chapter title, e.g. Cardiology" value="${esc(editing?.title || '')}" />
      <textarea name="description" placeholder="Optional description">${esc(editing?.description || '')}</textarea>
      <button class="primary-btn" type="submit">${editing ? 'Save chapter' : 'Create chapter'}</button>
    </form>
  `);
  $('#freeChapterForm')?.addEventListener('submit', async event => {
    event.preventDefault();
    const submit = event.currentTarget.querySelector('button[type="submit"]');
    if (submit) { submit.disabled = true; submit.textContent = 'Publishing…'; }
    try {
      const form = new FormData(event.currentTarget);
      const title = String(form.get('title') || '').trim();
      if (!title) throw new Error('Chapter title is required');
      const payload = { title, description: String(form.get('description') || '').trim(), updatedAt: new Date().toISOString() };
      if (editing) Object.assign(editing, payload);
      else course.chapters.unshift({ id: makeExternalItemId('chapter'), ...payload, lectures: [], createdAt: new Date().toISOString() });
      await saveAndPublishFreeCourses({ render: true, toast: editing ? 'Chapter published' : 'Chapter added and published' });
      closeModal();
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Could not publish chapter');
      if (submit) { submit.disabled = false; submit.textContent = editing ? 'Save chapter' : 'Create chapter'; }
    }
  });
}
function deleteFreeChapter(chapterId) {
  const course = getFreeCourse();
  const chapter = getFreeChapter(state.selectedFreeCourseId, chapterId);
  if (!course || !chapter) return;
  if (!confirm(`Delete chapter: ${chapter.title}?`)) return;
  course.chapters = (course.chapters || []).filter(item => String(item.id) !== String(chapterId));
  state.freeCourseLevel = 'chapters';
  state.selectedFreeChapterId = null;
  saveAndPublishFreeCourses({ toast: 'Chapter deleted and published' }).catch(err => {
    console.error(err);
    saveFreeCoursesState();
    showToast(err.message || 'Deleted locally, but cloud publish failed');
  });
}
async function buildFreeLectureFiles(form, editing = null, onStep = null) {
  const files = Array.isArray(editing?.files) ? [...editing.files] : [];
  const linkName = String(form.get('fileName') || '').trim();
  const linkUrl = normalizeUrlWithProtocol(form.get('fileUrl') || '');
  if (linkUrl) {
    files.push({ id: makeExternalItemId('file'), name: linkName || 'External file', source: linkUrl, createdAt: new Date().toISOString() });
  }
  const input = $('#freeLectureFile');
  const file = input?.files?.[0] || null;
  if (file) {
    const fileDirection = String(form.get('fileStorageDirection') || 'free-courses/files').trim();
    const uploaded = await uploadSupabaseAssetToDirection('file', file, fileDirection, onStep);
    if (!uploaded?.publicUrl) throw new Error('File upload did not return a public URL.');
    files.push({
      id: makeExternalItemId('file'),
      name: uploaded.fileName || file.name || 'Attached file',
      source: uploaded.publicUrl,
      type: file.type || '',
      storagePath: uploaded.path || '',
      storageDirection: uploaded.direction || '',
      bucket: uploaded.bucket || '',
      verified: Boolean(uploaded.verified),
      createdAt: new Date().toISOString()
    });
  }
  return files;
}
async function buildFreeLectureVideoSource(form, editing = null, onStep = null) {
  const sourceType = String(form.get('sourceType') || 'youtube').trim();
  const typedUrl = normalizeUrlWithProtocol(form.get('url') || '');
  const input = $('#freeLectureVideoFile');
  const file = input?.files?.[0] || null;

  if (sourceType === 'upload') {
    if (!file && editing?.url) {
      onStep?.('existing', 'No new video selected. Keeping the existing Supabase video URL.');
      return {
        url: editing.url,
        videoUrl: editing.videoUrl || editing.url,
        publicUrl: editing.publicUrl || editing.url,
        sourceType: 'upload',
        uploadedToCloud: Boolean(editing.uploadedToCloud || editing.videoStoragePath),
        videoFileName: editing.videoFileName || '',
        videoStoragePath: editing.videoStoragePath || '',
        videoBucket: editing.videoBucket || '',
        storageDirection: editing.storageDirection || ''
      };
    }
    if (!file) throw new Error('Choose a video file to upload.');
    const direction = String(form.get('storageDirection') || 'free-courses/videos').trim();
    const uploaded = await uploadSupabaseAssetToDirection('video', file, direction, onStep);
    if (!uploaded?.publicUrl) throw new Error('Video upload did not return a playable URL.');
    return {
      url: uploaded.publicUrl,
      videoUrl: uploaded.publicUrl,
      publicUrl: uploaded.publicUrl,
      sourceType: 'upload',
      uploadedToCloud: true,
      videoFileName: uploaded.fileName || file.name || '',
      videoStoragePath: uploaded.path || '',
      videoBucket: uploaded.bucket || '',
      storageDirection: uploaded.direction || '',
      storageVerified: Boolean(uploaded.verified),
      storageVerifyMessage: uploaded.verifyMessage || ''
    };
  }

  if (!typedUrl) {
    throw new Error(sourceType === 'youtube' ? 'Paste a YouTube link.' : 'Paste a direct video link.');
  }
  if (sourceType === 'youtube' && !isYoutubeUrl(typedUrl)) {
    throw new Error('This does not look like a YouTube link or iframe embed code. Use Direct video link for MP4/Supabase links.');
  }
  if (sourceType === 'direct' && !isLikelyDirectVideo(typedUrl)) {
    showToast('Tip: direct links usually end with .mp4/.webm or come from Supabase Storage.');
  }
  const finalUrl = normalizeUrlWithProtocol(typedUrl);
  return {
    url: finalUrl,
    videoUrl: finalUrl,
    publicUrl: finalUrl,
    sourceType,
    uploadedToCloud: false,
    videoFileName: editing?.videoFileName || '',
    videoStoragePath: editing?.videoStoragePath || '',
    videoBucket: editing?.videoBucket || '',
    storageDirection: editing?.storageDirection || ''
  };
}

function openFreeLectureEditor(lectureId = null) {
  const course = getFreeCourse();
  const chapter = getFreeChapter();
  if (!course || !chapter) return showToast('Open a chapter first');
  const editing = (chapter.lectures || []).find(lecture => String(lecture.id) === String(lectureId)) || null;
  const currentType = editing?.sourceType || (isYoutubeUrl(editing?.url) ? 'youtube' : (isLikelyDirectVideo(editing?.url) ? 'direct' : 'youtube'));
  const storageCfg = getSupabaseConfig();
  const defaultVideoDirection = editing?.storageDirection || 'free-courses/videos';
  const defaultFileDirection = 'free-courses/files';
  showModal(`
    <h2 id="modalTitle">${editing ? 'Edit external lecture' : 'Add external lecture'}</h2>
    <p class="modal-muted">${esc(course.title)} • ${esc(chapter.title)}</p>
    <form id="freeLectureForm" class="form-stack contextual-form free-lecture-editor">
      <input name="title" required placeholder="Lecture title" value="${esc(editing?.title || '')}" />

      <div class="free-source-box">
        <b>Video source type</b>
        <div class="free-source-options" role="radiogroup" aria-label="Video source type">
          <label class="${currentType === 'youtube' ? 'active' : ''}"><input type="radio" name="sourceType" value="youtube" ${currentType === 'youtube' ? 'checked' : ''} /> <span>▶ YouTube link</span><small>Paste link or iframe. Works inside app only if YouTube allows embed.</small></label>
          <label class="${currentType === 'direct' ? 'active' : ''}"><input type="radio" name="sourceType" value="direct" ${currentType === 'direct' ? 'checked' : ''} /> <span>🎬 Direct video link</span><small>MP4/WebM/Supabase link. Full NovaMed player.</small></label>
          <label class="${currentType === 'upload' ? 'active' : ''}"><input type="radio" name="sourceType" value="upload" ${currentType === 'upload' ? 'checked' : ''} /> <span>☁️ Upload video file</span><small>Upload to Supabase. Best option for full control.</small></label>
        </div>
        <textarea name="url" id="freeLectureUrl" rows="3" placeholder="Paste YouTube link, iframe embed code, or direct MP4/Supabase video URL">${esc(editing?.url || '')}</textarea>
        <input id="freeLectureVideoFile" type="file" accept="video/*" />
        <label class="free-storage-direction" id="freeVideoDirectionWrap">
          <span>Storage direction</span>
          <input name="storageDirection" id="freeLectureStorageDirection" value="${esc(defaultVideoDirection)}" placeholder="free-courses/videos" />
          <small>Bucket: <b>${esc(storageCfg.videoBucket || storageCfg.bucket || 'not set')}</b> • Full path will be shown before upload.</small>
        </label>
        <small id="freeLectureSourceHint">YouTube may block some videos from playing inside apps. Direct/uploaded videos use the NovaMed player.</small>
        ${editing?.videoFileName ? `<small>Current uploaded video: ${esc(editing.videoFileName)}</small>` : ''}
      </div>

      <input name="duration" placeholder="Duration, e.g. 18 min" value="${esc(editing?.duration || '')}" />
      <input name="thumbnail" placeholder="Optional lecture thumbnail image URL" value="${esc(editing?.thumbnail || '')}" />
      <textarea name="description" placeholder="Short description">${esc(editing?.description || '')}</textarea>

      <div class="free-file-box">
        <b>Downloadable file</b>
        <input name="fileName" placeholder="Optional file title, e.g. Handout PDF" />
        <input name="fileUrl" placeholder="Optional file URL" />
        <label class="free-storage-direction">
          <span>File storage direction</span>
          <input name="fileStorageDirection" value="${esc(defaultFileDirection)}" placeholder="free-courses/files" />
        </label>
        <input id="freeLectureFile" type="file" />
        ${editing?.files?.length ? `<small>${editing.files.length} existing file(s) will stay attached. Add a new one here if needed.</small>` : '<small>Attach a PDF/image/doc or paste a file link.</small>'}
      </div>
      <div class="free-upload-check-panel" id="freeUploadCheckPanel" hidden>
        <b>Upload checks</b>
        <div id="freeUploadCheckList"></div>
      </div>
      <button class="primary-btn" type="submit">${editing ? 'Save lecture' : 'Create lecture'}</button>
    </form>
  `);

  function refreshFreeLectureSourceUi() {
    const type = $('input[name="sourceType"]:checked')?.value || 'youtube';
    $$('.free-source-options label').forEach(label => label.classList.toggle('active', label.querySelector('input')?.value === type));
    const urlInput = $('#freeLectureUrl');
    const videoInput = $('#freeLectureVideoFile');
    const hint = $('#freeLectureSourceHint');
    const directionWrap = $('#freeVideoDirectionWrap');
    if (urlInput) {
      urlInput.hidden = type === 'upload';
      urlInput.required = type !== 'upload';
      urlInput.placeholder = type === 'youtube' ? 'Paste YouTube link or iframe embed code' : 'Paste direct MP4/WebM/Supabase video URL';
    }
    if (videoInput) {
      videoInput.hidden = type !== 'upload';
      videoInput.required = type === 'upload' && !editing?.url;
    }
    if (directionWrap) directionWrap.hidden = type !== 'upload';
    if (hint) {
      hint.textContent = type === 'youtube'
        ? 'YouTube links and iframe embed codes are accepted. Some videos still open only if the owner allows embedding.'
        : type === 'direct'
          ? 'Direct MP4/WebM/Supabase links play with NovaMed controls: speed, seek, and fullscreen.'
          : 'Uploaded videos go to Supabase Storage and play with NovaMed controls.';
    }
  }
  $$('input[name="sourceType"]').forEach(input => input.addEventListener('change', refreshFreeLectureSourceUi));
  refreshFreeLectureSourceUi();

  function addFreeUploadCheck(status, message) {
    const panel = $('#freeUploadCheckPanel');
    const list = $('#freeUploadCheckList');
    if (!panel || !list) return;
    panel.hidden = false;
    const row = document.createElement('div');
    row.className = `free-upload-check-row ${status || 'info'}`;
    row.innerHTML = `<span>${status === 'verified' ? '✅' : status === 'warning' ? '⚠️' : status === 'error' ? '❌' : '•'}</span><small>${esc(message || '')}</small>`;
    list.appendChild(row);
  }

  function resetFreeUploadChecks() {
    const panel = $('#freeUploadCheckPanel');
    const list = $('#freeUploadCheckList');
    if (panel) panel.hidden = false;
    if (list) list.innerHTML = '';
  }

  $('#freeLectureForm')?.addEventListener('submit', async event => {
    event.preventDefault();
    const formEl = event.currentTarget;
    const submit = formEl.querySelector('button[type="submit"]');
    if (submit) {
      submit.disabled = true;
      submit.textContent = 'Saving…';
    }
    try {
      resetFreeUploadChecks();
      addFreeUploadCheck('checking', 'Checking Supabase configuration…');
      const form = new FormData(formEl);
      const title = String(form.get('title') || '').trim();
      if (!title) throw new Error('Lecture title is required');
      const sourceType = String(form.get('sourceType') || 'youtube');
      if (sourceType === 'upload') {
        const direction = normalizeStorageDirection(form.get('storageDirection') || 'free-courses/videos', 'free-courses/videos');
        const cfg = getSupabaseConfig();
        addFreeUploadCheck('checking', `Destination: bucket ${cfg.videoBucket || cfg.bucket} / ${direction}`);
      }
      const videoSource = await buildFreeLectureVideoSource(form, editing, addFreeUploadCheck);
      addFreeUploadCheck('checking', 'Uploading/attaching downloadable files if provided…');
      const files = await buildFreeLectureFiles(form, editing, addFreeUploadCheck);
      const lectureId = editing?.id || makeExternalItemId('lecture');
      const payload = {
        id: lectureId,
        title,
        ...videoSource,
        duration: String(form.get('duration') || '').trim(),
        thumbnail: String(form.get('thumbnail') || '').trim(),
        description: String(form.get('description') || '').trim(),
        files,
        updatedAt: new Date().toISOString()
      };
      if (editing) Object.assign(editing, payload);
      else chapter.lectures.unshift({ ...payload, createdAt: new Date().toISOString() });
      addFreeUploadCheck('uploading', 'Publishing lecture data to Supabase table…');
      await saveAndPublishFreeCourses({ render: true, toast: '' });
      addFreeUploadCheck('checking', 'Reading Supabase table again to confirm saved URL…');
      const savedLecture = await verifyFreeLectureCloudSaved(lectureId, payload.publicUrl || payload.videoUrl || payload.url);
      addFreeUploadCheck('verified', `Confirmed in Supabase data: ${savedLecture.publicUrl || savedLecture.videoUrl || savedLecture.url}`);
      showToast(editing ? 'Lecture verified and published' : 'Lecture uploaded, verified, and published');
      setTimeout(() => closeModal(), 1200);
    } catch (err) {
      console.error(err);
      addFreeUploadCheck('error', err.message || 'Could not save lecture');
      showToast(err.message || 'Could not save lecture');
      if (submit) {
        submit.disabled = false;
        submit.textContent = editing ? 'Save lecture' : 'Create lecture';
      }
    }
  });
}
function deleteFreeLecture(lectureId) {
  const chapter = getFreeChapter();
  const lecture = (chapter?.lectures || []).find(item => String(item.id) === String(lectureId));
  if (!chapter || !lecture) return;
  if (!confirm(`Delete lecture: ${lecture.title}?`)) return;
  chapter.lectures = (chapter.lectures || []).filter(item => String(item.id) !== String(lectureId));
  saveAndPublishFreeCourses({ toast: 'Lecture deleted and published' }).catch(err => {
    console.error(err);
    saveFreeCoursesState();
    showToast(err.message || 'Deleted locally, but cloud publish failed');
  });
}

function renderVideos() {
  const grid = $('#videoGrid');
  if (!grid) return;
  renderVideoGuideControls();
  if (state.videoLevel === 'free-courses') {
    state.videoLevel = 'guided';
    saveState();
  }
  const search = ($('#videoSearch')?.value || '').trim().toLowerCase();
  if (search) {
    const filtered = state.videos.filter(v => [v.title, v.subject, v.description, v.topic, v.course, v.mode].join(' ').toLowerCase().includes(search));
    renderVideoBreadcrumb(true);
    renderVideoList(filtered, `Search results`, `Found ${filtered.length} matching lectures across all video libraries.`);
    return;
  }

  renderVideoBreadcrumb(false);
  if (state.videoLevel === 'list' && state.selectedMode && state.selectedCourse && state.selectedTopic) {
    const course = getCourse(state.selectedMode, state.selectedCourse);
    const videos = videosFor({ mode: state.selectedMode, course: state.selectedCourse, topic: state.selectedTopic });
    return renderVideoList(videos, `${state.selectedTopic} videos`, `${course?.title?.replace(/^Focused\s+/, '').replace(/^Detailed\s+/, '') || 'Course'} • ${videos.length} lecture${videos.length === 1 ? '' : 's'} available`);
  }
  return renderVideoGuidedOnly();
}

function renderVideoGuidedOnly() {
  const grid = $('#videoGrid');
  if (!grid) return;
  grid.className = 'video-library-grid guided-only-grid';
  grid.innerHTML = '';
}

function renderVideoModes() {
  const grid = $('#videoGrid');
  grid.className = 'video-library-grid mode-grid';
  grid.innerHTML = lectureModes.map(mode => `
    <article class="hub-card mode-card premium-card" data-video-mode="${mode.id}">
      <div class="hub-icon">${mode.icon}</div>
      <div class="hub-content">
        <span class="eyebrow">${esc(mode.subtitle)}</span>
        <h2>${esc(mode.title)}</h2>
        <p>${esc(mode.description)}</p>
        <div class="hub-footer">
          <span class="tag">${countVideos({ mode: mode.id })} videos</span>
          <button class="node-action">${esc(mode.cta)}</button>
        </div>
      </div>
    </article>
  `).join('');
}

function renderVideoCourses() {
  const mode = getMode(state.selectedMode);
  const courses = activeVideoCourseTree()[state.selectedMode] || [];
  const grid = $('#videoGrid');
  grid.className = 'video-library-grid course-grid';
  grid.innerHTML = `
    <div class="library-head premium-card">
      <button class="circle-mini" data-video-back="modes">‹</button>
      <div><span class="eyebrow">${esc(mode?.subtitle || 'Courses')}</span><h2>${esc(mode?.title || 'Courses')}</h2><p>Select the course you want to study. Admins can add, edit, or remove course folders here.</p></div>
      ${isAdmin() ? '<button class="primary-btn small" type="button" data-add-video-course>+ Course</button>' : ''}
    </div>
    ${courses.map(course => `
      <article class="hub-card course-card premium-card ${isAdmin() ? 'editable-card' : ''}" data-video-course="${course.id}">
        ${isAdmin() ? `<div class="card-admin-actions"><button class="tiny-btn" type="button" data-edit-video-course="${course.id}">Edit</button><button class="tiny-btn danger" type="button" data-delete-video-course="${course.id}">Delete</button></div>` : ''}
        <div class="hub-icon small">${course.icon}</div>
        <div class="hub-content">
          <h3>${esc(state.selectedQMode === 'focused' ? course.title.replace(/^Focused\s+/, '') : course.title)}</h3>
          <p>${esc(course.subtitle)}</p>
          <div class="topic-preview">${course.topics.slice(0, 4).map(topic => `<span>${esc(topicTitle(topic))}</span>`).join('')}</div>
          <div class="hub-footer"><span class="tag">${countVideos({ mode: state.selectedMode, course: course.id })} videos</span><button class="node-action">Open</button></div>
        </div>
      </article>
    `).join('')}
  `;
}

function renderVideoTopics() {
  const mode = getMode(state.selectedMode);
  const course = getCourse(state.selectedMode, state.selectedCourse);
  const topics = (course?.topics || []).map(topicTitle);
  const grid = $('#videoGrid');
  grid.className = 'video-library-grid topic-grid';
  grid.innerHTML = `
    <div class="library-head premium-card">
      <button class="circle-mini" data-video-back="courses">‹</button>
      <div><span class="eyebrow">${esc(mode?.title || 'Video library')}</span><h2>${esc(course?.title || 'Topics')}</h2><p>Pick the exact topic. Admins can add, rename, or remove topics inside this course.</p></div>
      ${isAdmin() ? '<button class="primary-btn small" type="button" data-add-video-topic>+ Topic</button>' : ''}
    </div>
    ${topics.map(topic => `
      <article class="topic-card premium-card ${isAdmin() ? 'editable-card' : ''}" data-video-topic="${dataValue(topic)}">
        ${isAdmin() ? `<div class="card-admin-actions"><button class="tiny-btn" type="button" data-edit-video-topic="${dataValue(topic)}">Edit</button><button class="tiny-btn danger" type="button" data-delete-video-topic="${dataValue(topic)}">Delete</button></div>` : ''}
        <div>
          <span class="eyebrow">${countVideos({ mode: state.selectedMode, course: state.selectedCourse, topic })} videos</span>
          <h3>${esc(topic)}</h3>
          <p>${state.selectedMode === 'focused' ? 'Focused high-yield videos for fast revision.' : 'Detailed lectures with deeper explanation and structure.'}</p>
        </div>
        <button class="node-action">View</button>
      </article>
    `).join('') || `
      <div class="video-empty premium-card">
        <div class="hub-icon">🗂️</div>
        <h3>No topics yet</h3>
        <p>${isAdmin() ? 'Add the first topic inside this course.' : 'No topics have been added yet.'}</p>
        ${isAdmin() ? '<button class="primary-btn small" type="button" data-add-video-topic>Add topic</button>' : ''}
      </div>`}
  `;
}

function renderVideoList(videos, title = 'Videos', subtitle = 'Choose a lecture and start studying.') {
  const grid = $('#videoGrid');
  grid.className = 'video-library-grid video-list-grid';
  const backTarget = state.selectedTopic ? 'topics' : state.selectedCourse ? 'courses' : state.selectedMode ? 'modes' : 'modes';
  const canManageHere = isAdmin() && currentVideoPathReady();
  grid.innerHTML = `
    <div class="library-head premium-card contextual-video-head">
      <button class="circle-mini" data-video-back="${backTarget}">‹</button>
      <div><span class="eyebrow">Lecture list</span><h2>${esc(title || 'Videos')}</h2><p>${esc(subtitle)}</p></div>
      ${canManageHere ? `<div class="contextual-actions"><button class="primary-btn small" type="button" data-add-video-context>+ Video</button><button class="soft-btn small" type="button" data-edit-video-topic="${dataValue(state.selectedTopic)}">Edit topic</button></div>` : ''}
    </div>
    ${videos.map(v => videoCardTemplate(v)).join('') || `
      <div class="video-empty premium-card">
        <div class="hub-icon">🎬</div>
        <h3>No lectures here yet</h3>
        <p>${isAdmin() ? 'Add the first video directly inside this selected course/topic.' : 'No public lectures have been added to this path yet.'}</p>
        ${canManageHere ? '<button class="primary-btn small" type="button" data-add-video-context>Add video here</button>' : ''}
      </div>
    `}
  `;
}

function videoCardTemplate(v) {
  const mode = getMode(v.mode);
  const course = getCourse(v.mode, v.course);
  const progress = displayVideoProgress(v);
  return `
    <article class="video-card premium-card ${isAdmin() ? 'editable-card' : ''}" data-video-id="${v.id}">
      ${isAdmin() ? `<div class="card-admin-actions video-actions"><button class="tiny-btn" type="button" data-edit-video-id="${v.id}">Edit</button><button class="tiny-btn danger" type="button" data-delete-video-id="${v.id}">Delete</button></div>` : ''}
      <div class="video-thumb"><span>▶</span></div>
      <div class="video-info">
        <div class="video-title-row"><h3>${esc(v.title)}</h3><span class="mini-progress">${esc(progress)}%</span></div>
        <p>${esc(v.description)}</p>
        <div class="meta-row">
          <span class="tag">${esc(mode?.title || v.mode)}</span>
          <span class="tag">${esc(course?.title || v.course)}</span>
          <span class="tag">${esc(v.topic)}</span>
          <span class="tag">${esc(v.duration)}</span>
        </div>
      </div>
    </article>
  `;
}

function videoPdfSource(video) {
  return video.pdfFileData || video.lectureFileData || '';
}
function videoPdfName(video) {
  return video.pdfFileName || video.lectureFileName || 'Full PDF';
}
function videoHighYieldSource(video) {
  return video.highYieldFileData || '';
}
function videoHighYieldText(video) {
  const parts = [];
  if (video.highYieldNoteText) parts.push(video.highYieldNoteText);
  if (video.quickNotes) parts.push(video.quickNotes);
  if ((video.highYieldQuestions || []).length) parts.push((video.highYieldQuestions || []).map((x, i) => `${i + 1}. ${x}`).join('\n'));
  return parts.join('\n\n').trim();
}

function renderVideoResourceButtons(video) {
  const hasPdf = Boolean(videoPdfSource(video));
  const hasHighYield = Boolean(videoHighYieldSource(video) || videoHighYieldText(video));
  return `
    <div class="video-resource-buttons" aria-label="Lecture resources">
      <button class="resource-action-btn hy" type="button" data-open-highyield="${video.id}" ${hasHighYield ? '' : 'disabled'}>
        <span>⚡</span><b>High-Yield Note</b><small>${hasHighYield ? 'Open inside NovaMed' : 'Not attached yet'}</small>
      </button>
      <button class="resource-action-btn pdf" type="button" data-open-pdf="${video.id}" ${hasPdf ? '' : 'disabled'}>
        <span>📄</span><b>Full PDF</b><small>${hasPdf ? esc(videoPdfName(video)) : 'Not attached yet'}</small>
      </button>
    </div>
  `;
}

function renderNovaVideoPlayer(video) {
  const source = String(video.url || '').trim();
  if (!source) {
    return '<div class="player-placeholder"><span>▶</span><b>No video source yet</b><small>Admin can upload a video file or paste a playable video URL.</small></div>';
  }
  const embed = youtubeEmbedUrl(source);
  if (embed) {
    return `
      <div class="nova-player-shell external-player-shell">
        <div class="video-stage external-video-stage">
          <iframe class="external-video-frame" src="${esc(embed)}" title="${esc(video.title || 'Lecture video')}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>
        </div>
      </div>
    `;
  }
  return `
    <div class="nova-player-shell faststream-player-shell youtube-like-player" data-video-source="${esc(source)}">
      <div class="video-stage faststream-stage">
        <video id="novaLessonPlayer" class="lesson-player faststream-video" src="${esc(source)}" playsinline webkit-playsinline preload="metadata" controls controlslist="nodownload" aria-label="Lecture video player"></video>
        <div class="player-loading-badge faststream-loading" id="playerLoadingBadge" hidden><span class="mini-spinner"></span>Buffering…</div>
        <button class="video-skip-overlay skip-back" type="button" data-player-skip="-5" aria-label="Back 5 seconds"><span>↺</span><b>5s</b></button>
        <button class="video-skip-overlay skip-forward" type="button" data-player-skip="10" aria-label="Forward 10 seconds"><span>↻</span><b>10s</b></button>
      </div>
    </div>
  `;
}

function formatClock(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds || 0)));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function bindNovaVideoControls(video = null) {
  const player = $('#novaLessonPlayer');
  if (!player) return;
  const shell = player.closest('.nova-player-shell');
  const loadingBadge = $('#playerLoadingBadge');
  const setLoading = (isLoading) => {
    if (loadingBadge) loadingBadge.hidden = !isLoading;
    shell?.classList.toggle('is-buffering', Boolean(isLoading));
  };

  // Let the browser's native media pipeline handle buffering, range requests,
  // seeking, and decoding. The app only adds medical-learning shortcuts.
  player.addEventListener('loadstart', () => setLoading(false));
  player.addEventListener('waiting', () => setLoading(true));
  player.addEventListener('stalled', () => setLoading(true));
  player.addEventListener('canplay', () => setLoading(false));
  player.addEventListener('playing', () => setLoading(false));
  player.addEventListener('loadedmetadata', () => restoreVideoPlaybackPosition(video, player));
  player.addEventListener('timeupdate', () => scheduleVideoWatchProgress(video, player));
  player.addEventListener('pause', () => saveVideoWatchProgress(video, player));
  player.addEventListener('ended', () => saveVideoWatchProgress(video, player, { completed: true }));
  player.addEventListener('error', () => {
    setLoading(false);
    showToast('Video could not load. Check the source URL or storage permissions.');
  });

  $$('[data-player-skip]').forEach(btn => btn.addEventListener('click', () => {
    const delta = Number(btn.dataset.playerSkip || 0);
    const max = Number.isFinite(player.duration) ? player.duration : Infinity;
    player.currentTime = Math.max(0, Math.min(max, player.currentTime + delta));
  }));
}

async function downloadLecturePdf(videoId) {
  const video = state.videos.find(v => v.id === Number(videoId));
  if (!video) return;
  const source = videoPdfSource(video);
  const filename = videoPdfName(video) || 'lecture-file.pdf';
  if (!source) return showToast('No PDF attached yet.');
  try {
    const link = document.createElement('a');
    link.style.display = 'none';
    link.download = filename;
    if (source.startsWith('data:') || source.startsWith('blob:')) {
      link.href = source;
    } else {
      const response = await fetch(source, { mode: 'cors' });
      if (!response.ok) throw new Error('download failed');
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      link.href = objectUrl;
      setTimeout(() => URL.revokeObjectURL(objectUrl), 30000);
    }
    document.body.appendChild(link);
    link.click();
    link.remove();
    showToast('Full PDF download started');
  } catch (error) {
    const fallback = document.createElement('a');
    fallback.href = source;
    fallback.target = '_blank';
    fallback.rel = 'noopener';
    fallback.download = filename;
    document.body.appendChild(fallback);
    fallback.click();
    fallback.remove();
    showToast('Opening PDF. Use your browser download button if needed.');
  }
}

function renderEmbeddedResource({ title, name, source, text, icon }) {
  const lower = String(name || source || '').toLowerCase();
  const isImage = /\.(png|jpg|jpeg|gif|webp|svg)(\?|#|$)/.test(lower) || String(source || '').startsWith('data:image/');
  const isTextData = String(source || '').startsWith('data:text/');
  const isPdf = /\.pdf(\?|#|$)/.test(lower) || String(source || '').startsWith('data:application/pdf');
  const content = text ? `
    <div class="resource-note-viewer">${esc(text).replace(/\n/g, '<br>')}</div>
  ` : source ? (isImage ? `
    <div class="resource-image-frame"><img src="${esc(source)}" alt="${esc(title)}" /></div>
  ` : (isPdf || !isTextData) ? `
    <iframe class="resource-frame" src="${esc(source)}" title="${esc(title)}"></iframe>
  ` : `
    <iframe class="resource-frame" src="${esc(source)}" title="${esc(title)}"></iframe>
  `) : `
    <div class="empty-extra-box">This resource has not been attached yet.</div>
  `;
  showModal(`
    <div class="resource-modal-head">
      <div class="resource-modal-icon">${icon}</div>
      <div><span class="eyebrow">Lecture resource</span><h2 id="modalTitle">${esc(title)}</h2><p>${esc(name || 'Opened inside NovaMed')}</p></div>
    </div>
    ${content}
  `);
}

function openVideoResource(videoId, type) {
  const video = state.videos.find(v => v.id === Number(videoId));
  if (!video) return;
  if (type === 'pdf') {
    return renderEmbeddedResource({
      title: 'Full PDF',
      name: videoPdfName(video),
      source: videoPdfSource(video),
      icon: '📄'
    });
  }
  const hyText = videoHighYieldText(video);
  return renderEmbeddedResource({
    title: 'High-Yield Note',
    name: video.highYieldFileName || 'Focused note',
    source: videoHighYieldSource(video),
    text: hyText && !videoHighYieldSource(video) ? hyText : '',
    icon: '⚡'
  });
}

function baseVideoOpenVideoV83(id) {
  const video = state.videos.find(v => v.id === id);
  if (!video) return;
  const mode = getMode(video.mode);
  const course = getCourse(video.mode, video.course);
  showModal(`
    <h2 id="modalTitle">${esc(video.title)}</h2>
    <p>${esc(video.description)}</p>
    ${renderNovaVideoPlayer(video)}
    <div class="meta-row" style="margin-bottom:14px">
      <span class="tag">${esc(mode?.title || video.mode)}</span>
      <span class="tag">${esc(course?.title || video.course)}</span>
      <span class="tag">${esc(video.topic)}</span>
      <span class="tag">${esc(video.duration)}</span>
    </div>
    ${renderVideoResourceButtons(video)}
    <button class="primary-btn" id="watchDone">Complete video +40 XP</button>
  `);
  setTimeout(() => {
    bindNovaVideoControls(video);
    $('#watchDone')?.addEventListener('click', async () => {
      const wasCompleted = getVideoProgress(video).completed || displayVideoProgress(video) >= 100;
      const player = $('#novaLessonPlayer');
      saveVideoWatchProgress(video, player, { completed: true });
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
      closeModal();
      if (wasCompleted) showToast('Video already completed');
    });
    $$('[data-open-highyield]').forEach(btn => btn.addEventListener('click', event => openVideoResource(event.currentTarget.dataset.openHighyield, 'highyield')));
    $$('[data-open-pdf]').forEach(btn => btn.addEventListener('click', event => downloadLecturePdf(event.currentTarget.dataset.openPdf)));
  }, 0);
}
