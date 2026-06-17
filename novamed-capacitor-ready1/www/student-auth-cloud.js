/* NovaMed v134 - Supabase Auth student accounts + real leaderboard.
   Scope: replaces the old name+code student login with email/password + OTP signup,
   stores student progress in Supabase student_* tables, and removes fake Streak names. */
(function () {
  'use strict';

  const AUTH_VERSION = 'v148-secure-reward-engine';
  let studentAuthFlow = { mode: 'signin', signupStep: 'email', email: '', verified: false, busy: false };

  function safeEsc(value) {
    return typeof esc === 'function'
      ? esc(value)
      : String(value ?? '').replace(/[&<>'"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[ch]));
  }

  function toast(message) {
    if (typeof showToast === 'function') showToast(message);
    else console.log(message);
  }

  function requireAuthClient() {
    const client = typeof getSupabaseClient === 'function' ? getSupabaseClient() : null;
    if (!client) throw new Error('Supabase is not connected. Check Project URL and publishable key.');
    if (!client.auth) throw new Error('Supabase Auth SDK is not available.');
    return client;
  }

  function rewardEventKeyV148(parts = []) {
    return parts
      .map(part => String(part ?? '').trim().toLowerCase())
      .filter(Boolean)
      .join(':')
      .slice(0, 220) || `event:${Date.now()}`;
  }

  function rewardQuestionKeyV148(question = {}) {
    try {
      if (typeof questionProgressKey === 'function') return rewardEventKeyV148(['question', questionProgressKey(question)]);
      if (typeof qbankQuestionKey === 'function') return rewardEventKeyV148(['question', qbankQuestionKey(question)]);
    } catch {}
    return rewardEventKeyV148(['question', question.id || question.questionId || question.stem || JSON.stringify(question).slice(0, 120)]);
  }

  function applyRewardResultToLocalStateV148(row = {}, options = {}) {
    const total = Number(row.total_xp);
    const streakValue = Number(row.streak);
    if (Number.isFinite(total)) state.xp = total;
    if (Number.isFinite(streakValue)) state.streak = streakValue;
    if (Number.isFinite(total) || Number.isFinite(streakValue)) {
      try {
        const snapshot = typeof studentSnapshot === 'function' ? studentSnapshot() : publicProgressDefaults();
        snapshot.xp = Number(state.xp || 0);
        snapshot.streak = Number(state.streak || 0);
        rememberCloudBaselineV142(currentCloudStudentId(), snapshot);
      } catch {}
    }
    try { if (typeof updateMiniStats === 'function') updateMiniStats(); } catch {}
    try { if (typeof renderProfileStats === 'function') renderProfileStats(); } catch {}
    try { if (options.leaderboard !== false && typeof queueLiveUiRefreshV143 === 'function') queueLiveUiRefreshV143('secure-reward-v148', { leaderboard: true, delay: 30 }); } catch {}
    try { if (typeof renderRealStreakLeaderboard === 'function') renderRealStreakLeaderboard({ force: false }); } catch {}
  }

  window.rewardEventKeyV148 = rewardEventKeyV148;
  window.rewardQuestionKeyV148 = rewardQuestionKeyV148;

  window.awardStudentXpSecure = async function awardStudentXpSecureV148(eventType, eventKey, meta = {}, options = {}) {
    if (!eventType || !eventKey) return { awarded: false, xp_delta: 0, total_xp: Number(state?.xp || 0), streak: Number(state?.streak || 0) };
    if (!isStudent() || !cloudConfigured()) {
      return { awarded: false, xp_delta: 0, total_xp: Number(state?.xp || 0), streak: Number(state?.streak || 0), skipped: true };
    }
    try {
      const client = requireAuthClient();
      const { data, error } = await client.rpc('award_student_xp', {
        p_event_type: String(eventType),
        p_event_key: String(eventKey),
        p_meta: meta && typeof meta === 'object' ? meta : {}
      });
      if (error) throw error;
      const row = Array.isArray(data) ? (data[0] || {}) : (data || {});
      applyRewardResultToLocalStateV148(row, options);
      if (options.toast) {
        const delta = Number(row.xp_delta || 0);
        const msg = row.awarded ? options.toast.replace('{xp}', String(delta)) : (options.duplicateToast || 'Reward already counted before');
        toast(msg);
      }
      return row;
    } catch (err) {
      console.warn('NovaMed secure reward failed:', err?.message || err);
      if (options.errorToast !== false) toast('XP sync did not complete. Your progress is still saved, but reward was not added.');
      return { awarded: false, xp_delta: 0, total_xp: Number(state?.xp || 0), streak: Number(state?.streak || 0), error: err };
    }
  };

  function splitStudentName(firstName = '', lastName = '', fallback = '') {
    const first = normalizeStudentName(firstName || '').trim();
    const last = normalizeStudentName(lastName || '').trim();
    const display = normalizeStudentName(`${first} ${last}`) || normalizeStudentName(fallback || '') || 'Student';
    return { first, last, display };
  }

  function studentNameFromAuthUser(user = {}, profile = null) {
    const meta = user.user_metadata || {};
    return normalizeStudentName(
      profile?.display_name ||
      profile?.full_name ||
      meta.display_name ||
      meta.full_name ||
      `${meta.first_name || ''} ${meta.last_name || ''}` ||
      user.email?.split('@')?.[0] ||
      'Student'
    );
  }

  function authStudentAccount(user = {}, profile = null, progressProfile = null) {
    const name = studentNameFromAuthUser(user, profile);
    return normalizeStudentAccount({
      id: user.id,
      name,
      email: user.email || profile?.email || '',
      studentKey: user.id,
      supabaseUserId: user.id,
      profile: normalizeStudentProfile(progressProfile || publicProgressDefaults()),
      createdAt: user.created_at || profile?.created_at || new Date().toISOString(),
      updatedAt: profile?.updated_at || new Date().toISOString()
    }, user.id || name);
  }

  function profileFromStudentStateRow(row = {}) {
    const feature = row?.feature_state && typeof row.feature_state === 'object' ? row.feature_state : {};
    const raw = feature.__novamedProfile && typeof feature.__novamedProfile === 'object'
      ? feature.__novamedProfile
      : feature;
    const profile = normalizeStudentProfile(raw || {});
    profile.xp = Number(row?.total_xp ?? profile.xp ?? 0);
    profile.streak = Number(row?.streak ?? profile.streak ?? 0);
    profile.theme = row?.theme || profile.theme || 'dark';
    if (row?.daily_todo && typeof row.daily_todo === 'object') profile.dailyTodo = normalizeDailyTodo(row.daily_todo);
    if (row?.learn_route && typeof row.learn_route === 'object') {
      profile.learnRouteCourse = row.learn_route.course ?? profile.learnRouteCourse ?? null;
      profile.learnRouteChapter = row.learn_route.chapter ?? profile.learnRouteChapter ?? null;
      profile.learnRouteSelections = row.learn_route.selections || profile.learnRouteSelections || {};
    }
    if (row?.ui_state && typeof row.ui_state === 'object') {
      Object.assign(profile, row.ui_state);
    }
    return normalizeStudentProfile(profile);
  }

  async function fetchAuthStudentAccount(user) {
    if (!user?.id) return null;
    const client = requireAuthClient();
    let profileRow = null;
    let stateRow = null;
    let publicRow = null;

    const [profileRes, stateRes, publicRes] = await Promise.all([
      client
        .from('profiles')
        .select('id,email,first_name,last_name,display_name,avatar_url,role,created_at,updated_at')
        .eq('id', user.id)
        .maybeSingle(),
      client
        .from('student_state')
        .select('user_id,total_xp,streak,theme,last_route,ui_state,daily_todo,learn_route,feature_state,settings,updated_at')
        .eq('user_id', user.id)
        .maybeSingle(),
      client
        .from('student_public')
        .select('user_id,display_name,xp,streak,level,last_active_at')
        .eq('user_id', user.id)
        .maybeSingle()
    ]);

    if (profileRes.error && profileRes.error.code !== 'PGRST116') throw profileRes.error;
    if (stateRes.error && stateRes.error.code !== 'PGRST116') throw stateRes.error;
    if (publicRes.error && publicRes.error.code !== 'PGRST116') throw publicRes.error;

    profileRow = profileRes.data || null;
    stateRow = stateRes.data || null;
    publicRow = publicRes.data || null;

    let cloudProfile = profileFromStudentStateRow(stateRow || {});
    if (publicRow) {
      cloudProfile.xp = Math.max(Number(cloudProfile.xp || 0), Number(publicRow.xp || 0));
      cloudProfile.streak = Math.max(Number(cloudProfile.streak || 0), Number(publicRow.streak || 0));
      cloudProfile.updatedAt = stateRow?.updated_at || publicRow.last_active_at || new Date().toISOString();
    }
    cloudProfile = normalizeStudentProfile(cloudProfile);
    rememberCloudBaselineV142(user.id, cloudProfile);

    const account = authStudentAccount(user, profileRow, cloudProfile);
    // v140/v142: do not block sign-in/boot on heavy progress tables. Restore them in the background.
    schedulePhase2StudentCloudRestoreV140(user.id, { delay: 80 });
    cleanupPhase2EStudentLocalKeys();
    return account;
  }

  async function upsertAuthProfileRows(user, names = {}) {
    if (!user?.id) throw new Error('No authenticated user was returned from Supabase.');
    const client = requireAuthClient();
    const meta = user.user_metadata || {};
    const firstName = names.firstName ?? meta.first_name ?? '';
    const lastName = names.lastName ?? meta.last_name ?? '';
    const parsed = splitStudentName(firstName, lastName, meta.display_name || user.email?.split('@')?.[0]);
    const profilePayload = {
      id: user.id,
      email: normalizeEmail(user.email || ''),
      first_name: parsed.first || null,
      last_name: parsed.last || null,
      display_name: parsed.display,
      role: 'student'
    };

    const profileResult = await client.from('profiles').upsert(profilePayload, { onConflict: 'id' }).select().maybeSingle();
    if (profileResult.error) throw profileResult.error;

    // v142 safe restore: never let a new-device signup/profile completion overwrite old XP with zero.
    const [stateRes, publicRes] = await Promise.all([
      client
        .from('student_state')
        .select('user_id,total_xp,streak,theme,last_route,ui_state,daily_todo,learn_route,feature_state,settings,updated_at')
        .eq('user_id', user.id)
        .maybeSingle(),
      client
        .from('student_public')
        .select('user_id,display_name,xp,streak,level,last_active_at')
        .eq('user_id', user.id)
        .maybeSingle()
    ]);
    if (stateRes.error && stateRes.error.code !== 'PGRST116') throw stateRes.error;
    if (publicRes.error && publicRes.error.code !== 'PGRST116') throw publicRes.error;

    const remoteProfile = profileFromStudentStateRow(stateRes.data || {});
    if (publicRes.data) {
      remoteProfile.xp = Math.max(Number(remoteProfile.xp || 0), Number(publicRes.data.xp || 0));
      remoteProfile.streak = Math.max(Number(remoteProfile.streak || 0), Number(publicRes.data.streak || 0));
      remoteProfile.updatedAt = stateRes.data?.updated_at || publicRes.data.last_active_at || new Date().toISOString();
    }
    const localProfile = typeof studentSnapshot === 'function' ? studentSnapshot() : publicProgressDefaults();
    const mergedProfile = mergeStudentProfiles(localProfile, remoteProfile);
    mergedProfile.xp = Math.max(Number(localProfile.xp || 0), Number(remoteProfile.xp || 0));
    mergedProfile.streak = Math.max(Number(localProfile.streak || 0), Number(remoteProfile.streak || 0));
    rememberCloudBaselineV142(user.id, mergedProfile);

    const publicResult = await client.from('student_public').upsert({
      user_id: user.id,
      display_name: parsed.display,
      leaderboard_visible: true,
      last_active_at: new Date().toISOString()
    }, { onConflict: 'user_id' });
    if (publicResult.error) throw publicResult.error;

    const statePayload = {
      ...studentStateNonRewardPayloadFromSnapshotV148(mergedProfile),
      user_id: user.id,
      updated_at: new Date().toISOString()
    };
    const stateResult = await client.from('student_state').upsert(statePayload, { onConflict: 'user_id' });
    if (stateResult.error) throw stateResult.error;

    return profileResult.data || profilePayload;
  }

  function studentStatePayloadFromSnapshot(snapshot = {}) {
    const clean = normalizeStudentProfile(snapshot || publicProgressDefaults());
    return {
      user_id: state.user?.supabaseId || state.user?.studentKey || snapshot.user_id || null,
      total_xp: Number(clean.xp || 0),
      streak: Number(clean.streak || 0),
      theme: clean.theme || state.theme || 'dark',
      last_route: document.querySelector('.screen.active')?.dataset?.screen || null,
      ui_state: {
        videoLevel: clean.videoLevel || state.videoLevel || 'modes',
        selectedMode: clean.selectedMode || state.selectedMode || null,
        selectedCourse: clean.selectedCourse || state.selectedCourse || null,
        selectedTopic: clean.selectedTopic || state.selectedTopic || null,
        qbankLevel: clean.qbankLevel || state.qbankLevel || 'modes',
        selectedQMode: clean.selectedQMode || state.selectedQMode || null,
        selectedQCourse: clean.selectedQCourse || state.selectedQCourse || null,
        selectedQTopic: clean.selectedQTopic || state.selectedQTopic || null,
        selectedQSubtopic: clean.selectedQSubtopic || state.selectedQSubtopic || null,
        selectedQNoteLibrary: clean.selectedQNoteLibrary || state.selectedQNoteLibrary || null,
        selectedQAnswerMode: clean.selectedQAnswerMode || state.selectedQAnswerMode || 'exam',
        homeWidgetSettings: clean.homeWidgetSettings || state.homeWidgetSettings || window.__novamedHomeWidgetSettingsCache || null
      },
      daily_todo: clean.dailyTodo || normalizeDailyTodo(),
      learn_route: {
        course: clean.learnRouteCourse || null,
        chapter: clean.learnRouteChapter || null,
        selections: clean.learnRouteSelections || {}
      },
      feature_state: { __novamedProfile: clean },
      settings: { authVersion: AUTH_VERSION },
      updated_at: new Date().toISOString()
    };
  }


  function studentStateNonRewardPayloadFromSnapshotV148(snapshot = {}) {
    const payload = studentStatePayloadFromSnapshot(snapshot);
    delete payload.total_xp;
    delete payload.streak;
    return payload;
  }


  // ==============================
  // Phase 2A cloud-only helpers
  // live_exams + study_plans
  // ==============================

  let liveExamCloudSaveTimer = null;
  let studyPlanCloudSaveTimer = null;
  let pendingLiveExamCloudPayload = null;
  let pendingStudyPlanCloudPayload = null;
  const videoProgressCloudTimers = new Map();
  const mistakeNoteCloudTimers = new Map();
  const flashcardCloudTimers = new Map();
  let searchHistoryCloudTimer = null;
  let lastSearchHistoryPayload = null;

  // v140: smooth cloud sync.  The UI renders immediately; large Supabase restores
  // and frequent progress writes are coalesced in the background.
  let phase2RestorePromiseV140 = null;
  let phase2RestoreUserIdV140 = null;
  let phase2RestoreStartedAtV140 = 0;
  let cloudViewRefreshTimerV140 = null;
  let studentStateSaveTimerV140 = null;
  let studentStateSavePromiseV140 = null;
  let studentStateSavePendingV140 = false;
  let studentStateSnapshotV140 = null;
  let leaderboardRowsCacheV140 = { rows: null, at: 0, inFlight: null };
  let cloudStudentBaselineV142 = null;

  // v143: live UI refresh without forcing a full reload.
  // The cloud sync in v139-v142 is intentionally debounced, but the visible Profile/Street
  // counters should update immediately from the in-memory state.  This tiny scheduler keeps
  // Profile icons responsive even after many mistakes/bookmarks by refreshing only the open panel.
  let liveUiRefreshTimerV143 = null;
  let profileWorkspaceGuardBoundV143 = false;

  function activeScreenIdV143() {
    const screen = document.querySelector('.screen.active');
    return screen?.dataset?.screen || String(screen?.id || '').replace(/^screen-/, '') || '';
  }

  function activeProfileWorkspaceTabV143() {
    return document.querySelector('#adminPanel .admin-tab.active')?.id || '';
  }

  function isProfileWorkspaceOpenV143() {
    const backdrop = document.getElementById('modalBackdrop');
    return Boolean(
      document.body.classList.contains('profile-workspace-active-v110') ||
      (backdrop?.classList.contains('show') && backdrop.querySelector('.profile-workspace-modal-card-v110'))
    );
  }

  function normalizeProfileWorkspaceShellV143() {
    const backdrop = document.getElementById('modalBackdrop');
    const modalIsVisible = Boolean(backdrop?.classList.contains('show'));
    if (document.body.classList.contains('profile-workspace-active-v110') && !modalIsVisible) {
      try { window.restoreProfileWorkspacePanelV110?.(); } catch {}
      document.body.classList.remove('profile-workspace-active-v110');
    }
  }

  function refreshOpenProfileWorkspaceV143(reason = '') {
    const open = isProfileWorkspaceOpenV143();
    // v144: never re-render the heavy hidden Profile panels while the user is only
    // looking at the Profile cards. Re-rendering hidden Mistakes/Bookmarks after
    // many cloud writes was causing click stalls on the Profile icons.
    if (!open) return;
    const tab = activeProfileWorkspaceTabV143();
    const activeEl = document.activeElement;
    const editingMistakeNote = Boolean(activeEl?.matches?.('[data-mistake-note]'));
    try {
      if (tab === 'mistakes' && !editingMistakeNote && typeof renderMistakes === 'function') renderMistakes();
      if (tab === 'flashcards' && typeof renderFlashcards === 'function') renderFlashcards();
      if (tab === 'bookmarks' && typeof renderBookmarksPanel === 'function') renderBookmarksPanel();
      if (tab === 'analytics' && typeof renderAnalytics === 'function') renderAnalytics();
    } catch (err) {
      console.warn('NovaMed v143 profile workspace refresh failed:', err?.message || err);
    }
  }

  function patchCurrentStudentIntoLeaderboardCacheV143() {
    const userId = currentCloudStudentId();
    if (!userId || !isStudent()) return;
    const publicRow = {
      user_id: userId,
      display_name: currentUserName(),
      xp: Number(state.xp || 0),
      streak: Number(state.streak || 0),
      level: Math.max(1, Math.floor(Number(state.xp || 0) / 1000) + 1),
      leaderboard_visible: true,
      last_active_at: new Date().toISOString()
    };
    const rows = Array.isArray(leaderboardRowsCacheV140.rows)
      ? leaderboardRowsCacheV140.rows.filter(row => row.user_id !== userId)
      : [];
    rows.push(publicRow);
    rows.sort((a, b) => Number(b.xp || 0) - Number(a.xp || 0) || new Date(b.last_active_at || 0) - new Date(a.last_active_at || 0));
    leaderboardRowsCacheV140.rows = rows.slice(0, 10);
    leaderboardRowsCacheV140.at = Date.now();
    window.__novamedRealLeaderboardRowsCache = leaderboardRowsCacheV140.rows;
  }

  function queueLiveUiRefreshV143(reason = 'cloud-change', options = {}) {
    normalizeProfileWorkspaceShellV143();
    window.__novamedLastCloudUiChangeV143 = { reason, at: new Date().toISOString() };
    clearTimeout(liveUiRefreshTimerV143);
    const delay = Number(options.delay ?? 90);
    liveUiRefreshTimerV143 = setTimeout(() => {
      const run = () => {
        try { patchCurrentStudentIntoLeaderboardCacheV143(); } catch {}
        try { if (typeof updateMiniStats === 'function') updateMiniStats(); } catch {}
        try { if (typeof renderProfileStats === 'function') renderProfileStats(); } catch {}
        try { if (typeof updateCloudBadge === 'function') updateCloudBadge('Synced'); } catch {}
        try { refreshOpenProfileWorkspaceV143(reason); } catch {}
        try {
          if (activeScreenIdV143() === 'streak' || options.leaderboard) {
            window.renderRealStreakLeaderboard?.({ force: false });
          }
        } catch {}
        try {
          window.dispatchEvent(new CustomEvent('novamed:student-cloud-updated', {
            detail: { reason, at: new Date().toISOString() }
          }));
        } catch {}
      };
      if (typeof window.requestAnimationFrame === 'function') window.requestAnimationFrame(run);
      else run();
    }, delay);
  }

  window.queueNovaMedCloudUiRefreshV143 = queueLiveUiRefreshV143;
  window.normalizeProfileWorkspaceShellV143 = normalizeProfileWorkspaceShellV143;

  function bindProfileWorkspaceClickGuardV143() {
    if (profileWorkspaceGuardBoundV143) return;
    profileWorkspaceGuardBoundV143 = true;
    document.addEventListener('click', event => {
      const btn = event.target?.closest?.('#screen-profile .settings-card[data-admin-tab]');
      if (!btn) return;
      const id = btn.dataset.adminTab;
      if (!id || !window.openProfileWorkspaceModalV110) return;
      normalizeProfileWorkspaceShellV143();
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
      setTimeout(() => {
        normalizeProfileWorkspaceShellV143();
        try { window.openProfileWorkspaceModalV110(id); }
        catch (err) { console.warn('NovaMed v143 profile icon open failed:', err?.message || err); }
      }, 0);
    }, true);
  }

  bindProfileWorkspaceClickGuardV143();

  function rememberCloudBaselineV142(userId, profile = {}) {
    const cleanUserId = String(userId || '').trim();
    if (!cleanUserId) return null;
    const cleanProfile = normalizeStudentProfile(profile || publicProgressDefaults());
    cloudStudentBaselineV142 = {
      userId: cleanUserId,
      profile: cleanProfile,
      xp: Number(cleanProfile.xp || 0),
      streak: Number(cleanProfile.streak || 0),
      at: Date.now()
    };
    window.__novamedCloudStudentBaselineV142 = cloudStudentBaselineV142;
    return cloudStudentBaselineV142;
  }

  function mergeSnapshotWithCloudBaselineV142(snapshot = {}, userId = currentCloudStudentId()) {
    const cleanSnapshot = normalizeStudentProfile(snapshot || publicProgressDefaults());
    const cleanUserId = String(userId || '').trim();
    const baseline = cloudStudentBaselineV142 || window.__novamedCloudStudentBaselineV142 || null;
    if (!baseline || baseline.userId !== cleanUserId) return cleanSnapshot;

    const baselineProfile = normalizeStudentProfile(baseline.profile || publicProgressDefaults());
    const merged = mergeStudentProfiles(cleanSnapshot, baselineProfile);
    merged.xp = Math.max(Number(cleanSnapshot.xp || 0), Number(baselineProfile.xp || 0));
    merged.streak = Math.max(Number(cleanSnapshot.streak || 0), Number(baselineProfile.streak || 0));
    return normalizeStudentProfile(merged);
  }

  function applyCloudBaselineIfHigherV142(profile = {}, account = null) {
    const clean = normalizeStudentProfile(profile || publicProgressDefaults());
    if (!isStudent()) return clean;
    const needsApply = Number(clean.xp || 0) > Number(state?.xp || 0) || Number(clean.streak || 0) > Number(state?.streak || 0);
    if (needsApply && typeof applyStudentProfileToState === 'function') {
      try {
        applyStudentProfileToState(clean, account || null);
        if (typeof refreshAfterAccountChange === 'function') refreshAfterAccountChange();
      } catch (err) {
        console.warn('NovaMed cloud baseline apply failed:', err?.message || err);
      }
    }
    return clean;
  }

  function runWhenIdleV140(fn, timeout = 900) {
    if (typeof window.requestIdleCallback === 'function') {
      return window.requestIdleCallback(() => { try { fn(); } catch (err) { console.warn('NovaMed idle task failed:', err?.message || err); } }, { timeout });
    }
    return setTimeout(() => { try { fn(); } catch (err) { console.warn('NovaMed delayed task failed:', err?.message || err); } }, Math.min(180, timeout));
  }

  function refreshCloudViewsOnceV140() {
    clearTimeout(cloudViewRefreshTimerV140);
    cloudViewRefreshTimerV140 = setTimeout(() => {
      const run = () => {
        try { if (typeof renderLiveExamIndicators === 'function') renderLiveExamIndicators(); } catch {}
        try { if (typeof renderSmartStudyPlanV85 === 'function') renderSmartStudyPlanV85(); } catch {}
        try { if (typeof renderVideos === 'function') renderVideos(); } catch {}
        try { if (typeof renderQbank === 'function') renderQbank(); } catch {}
        try { if (typeof renderMistakes === 'function') renderMistakes(); } catch {}
        try { if (typeof renderFlashcards === 'function') renderFlashcards(); } catch {}
        try { if (typeof renderBookmarksPanel === 'function') renderBookmarksPanel(); } catch {}
        try { if (typeof renderProfileStats === 'function') renderProfileStats(); } catch {}
        try { if (typeof renderHomeSmartWidgetsV79 === 'function') renderHomeSmartWidgetsV79(); } catch {}
      };
      if (typeof window.requestAnimationFrame === 'function') window.requestAnimationFrame(run);
      else run();
    }, 60);
  }

  function schedulePhase2StudentCloudRestoreV140(userId = currentCloudStudentId(), options = {}) {
    const cleanUserId = String(userId || '').trim();
    if (!cleanUserId || !cloudConfigured()) return Promise.resolve(false);
    const delay = Number(options.delay ?? 120);
    runWhenIdleV140(() => {
      loadPhase2StudentCloudState(cleanUserId).catch(err => console.warn('NovaMed background restore failed:', err?.message || err));
    }, delay);
    return Promise.resolve(true);
  }

  function emptyFeatureStoreV136() {
    return {
      videoBookmarks: {},
      questionBookmarks: {},
      videoNotes: {},
      videoViews: {},
      lastVideo: null,
      dailyQuestion: {},
      searchHistory: []
    };
  }

  function ensureFeatureStoreCacheV136() {
    const current = window.__novamedFeatureStoreCache;
    const safe = current && typeof current === 'object' ? current : {};
    window.__novamedFeatureStoreCache = {
      ...emptyFeatureStoreV136(),
      ...safe,
      videoBookmarks: safe.videoBookmarks && typeof safe.videoBookmarks === 'object' ? safe.videoBookmarks : {},
      questionBookmarks: safe.questionBookmarks && typeof safe.questionBookmarks === 'object' ? safe.questionBookmarks : {},
      videoNotes: safe.videoNotes && typeof safe.videoNotes === 'object' ? safe.videoNotes : {},
      videoViews: safe.videoViews && typeof safe.videoViews === 'object' ? safe.videoViews : {},
      dailyQuestion: safe.dailyQuestion && typeof safe.dailyQuestion === 'object' ? safe.dailyQuestion : {},
      searchHistory: Array.isArray(safe.searchHistory) ? safe.searchHistory : []
    };
    return window.__novamedFeatureStoreCache;
  }

  function videoCloudKeyV136(video = {}) {
    return String(typeof video === 'object' ? (video.id || video.video_key || video.title || '') : video).trim();
  }

  function videoProgressRowToEntryV136(row = {}) {
    return {
      id: row.video_key,
      title: row.video_title || row.lecture || '',
      mode: '',
      course: row.course || '',
      topic: row.chapter || '',
      percent: Number(row.progress_percent || 0),
      currentTime: Number(row.current_time_seconds || 0),
      duration: Number(row.duration_seconds || 0),
      completed: Boolean(row.completed),
      updatedAt: row.updated_at || row.last_watched_at || new Date().toISOString(),
      watchedAt: row.last_watched_at || row.updated_at || new Date().toISOString(),
      completedAt: row.completed ? (row.updated_at || row.last_watched_at || new Date().toISOString()) : null
    };
  }

  function normalizeCloudVideoNoteV136(row = {}) {
    const sourceKey = String(row.source_key || '').trim();
    if (!sourceKey) return null;
    const tags = Array.isArray(row.tags) ? row.tags : [];
    const meta = tags.find(item => item && typeof item === 'object') || {};
    return {
      id: row.id || row.title || `note-${Date.now()}`,
      cloudId: row.id || null,
      videoId: sourceKey,
      videoTitle: meta.videoTitle || '',
      course: meta.course || '',
      topic: meta.topic || '',
      time: Math.max(0, Math.floor(Number(row.timestamp_seconds || 0))),
      text: String(row.body || '').trim(),
      at: row.created_at || row.updated_at || new Date().toISOString()
    };
  }

  function cleanupPhase2BLocalKeys() {
    // Keep Supabase Auth/session only. Academic video progress + notes are now cloud/in-memory.
    try {
      Object.keys(localStorage || {}).forEach(key => {
        if (
          key === 'novamed-live-timed-exam-v1' ||
          key.startsWith('novamed-smart-study-plan-v85') ||
          key === 'novamed-feature-layer-v79'
        ) {
          localStorage.removeItem(key);
        }
      });
    } catch {}
  }

  async function loadVideoProgressAndNotesFromSupabaseV136(userId = currentCloudStudentId()) {
    if (!userId || !cloudConfigured()) return false;
    const client = requireAuthClient();

    const progressRes = await client
      .from('video_progress')
      .select('id,video_key,course,chapter,lecture,video_title,current_time_seconds,duration_seconds,progress_percent,completed,notes,bookmarks,last_watched_at,created_at,updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1000);
    if (progressRes.error) throw progressRes.error;

    const notesRes = await client
      .from('student_notes')
      .select('id,source_type,source_key,title,body,timestamp_seconds,tags,created_at,updated_at')
      .eq('user_id', userId)
      .eq('source_type', 'video')
      .order('created_at', { ascending: false })
      .limit(2000);
    if (notesRes.error) throw notesRes.error;

    const progress = {};
    const featureStore = ensureFeatureStoreCacheV136();
    featureStore.videoNotes = {};
    featureStore.videoViews = {};
    featureStore.lastVideo = null;

    const rows = Array.isArray(progressRes.data) ? progressRes.data : [];
    rows.forEach(row => {
      const key = videoCloudKeyV136(row.video_key);
      if (!key) return;
      progress[key] = videoProgressRowToEntryV136(row);
      featureStore.videoViews[key] = {
        id: key,
        title: row.video_title || row.lecture || '',
        course: row.course || '',
        topic: row.chapter || '',
        views: 1,
        seconds: Number(row.current_time_seconds || 0),
        lastAt: row.last_watched_at || row.updated_at || new Date().toISOString()
      };
      if (!featureStore.lastVideo || new Date(featureStore.videoViews[key].lastAt) > new Date(featureStore.lastVideo.updatedAt || 0)) {
        featureStore.lastVideo = {
          id: key,
          title: row.video_title || row.lecture || '',
          course: row.course || '',
          topic: row.chapter || '',
          time: Number(row.current_time_seconds || 0),
          durationSeconds: Number(row.duration_seconds || 0),
          updatedAt: row.last_watched_at || row.updated_at || new Date().toISOString()
        };
      }
    });

    const noteRows = Array.isArray(notesRes.data) ? notesRes.data : [];
    noteRows.forEach(row => {
      const note = normalizeCloudVideoNoteV136(row);
      if (!note || !note.text) return;
      const key = videoCloudKeyV136(note.videoId);
      featureStore.videoNotes[key] = featureStore.videoNotes[key] || [];
      featureStore.videoNotes[key].push(note);
    });

    Object.keys(featureStore.videoNotes).forEach(key => {
      featureStore.videoNotes[key].sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0));
      featureStore.videoNotes[key] = featureStore.videoNotes[key].slice(0, 100);
    });

    state.videoProgress = typeof normalizeVideoProgress === 'function' ? normalizeVideoProgress(progress) : progress;
    cleanupPhase2BLocalKeys();
    if (!window.__novamedCloudRestoringV140) {
      if (typeof renderVideos === 'function') renderVideos();
      if (typeof renderHomeSmartWidgetsV79 === 'function') renderHomeSmartWidgetsV79();
    }
    return true;
  }

  window.loadVideoProgressAndNotesFromSupabase = loadVideoProgressAndNotesFromSupabaseV136;

  window.saveVideoProgressToSupabase = function saveVideoProgressToSupabaseCloud(video = {}, entry = {}) {
    const userId = currentCloudStudentId();
    const key = videoCloudKeyV136(video);
    if (!key || !isStudent() || !userId || !cloudConfigured()) return Promise.resolve(false);

    const featureStore = ensureFeatureStoreCacheV136();
    const notes = Array.isArray(featureStore.videoNotes?.[key]) ? featureStore.videoNotes[key] : [];
    const payload = {
      user_id: userId,
      video_key: key,
      course: video.course || entry.course || '',
      chapter: video.topic || entry.topic || '',
      lecture: video.lecture || video.title || entry.title || '',
      video_title: video.title || entry.title || '',
      current_time_seconds: Number(entry.currentTime || entry.current_time_seconds || 0),
      duration_seconds: Number(entry.duration || entry.duration_seconds || 0),
      progress_percent: Number(entry.percent ?? entry.progress_percent ?? 0),
      completed: Boolean(entry.completed),
      notes: notes,
      bookmarks: [],
      last_watched_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    clearTimeout(videoProgressCloudTimers.get(key));
    return new Promise(resolve => {
      const timer = setTimeout(async () => {
        try {
          const client = requireAuthClient();
          const { error } = await client.from('video_progress').upsert(payload, { onConflict: 'user_id,video_key' });
          if (error) throw error;
          resolve(true);
        } catch (err) {
          console.warn('NovaMed video_progress save failed:', err?.message || err);
          resolve(false);
        } finally {
          videoProgressCloudTimers.delete(key);
        }
      }, 500);
      videoProgressCloudTimers.set(key, timer);
    });
  };

  window.saveVideoNoteToSupabase = async function saveVideoNoteToSupabaseCloud(video = {}, note = {}) {
    const userId = currentCloudStudentId();
    const key = videoCloudKeyV136(video);
    if (!key || !note?.text || !isStudent() || !userId || !cloudConfigured()) return false;
    try {
      const client = requireAuthClient();
      const { data, error } = await client.from('student_notes').insert({
        user_id: userId,
        source_type: 'video',
        source_key: key,
        title: note.id || null,
        body: String(note.text || '').trim(),
        timestamp_seconds: Number(note.time || 0),
        tags: [{ course: video.course || note.course || '', topic: video.topic || note.topic || '', videoTitle: video.title || note.videoTitle || '' }]
      }).select('id').single();
      if (error) throw error;
      note.cloudId = data?.id || null;
      await window.saveVideoProgressToSupabase?.(video, state.videoProgress?.[key] || { currentTime: note.time || 0 });
      return true;
    } catch (err) {
      console.warn('NovaMed student_notes save failed:', err?.message || err);
      return false;
    }
  };

  window.deleteVideoNoteFromSupabase = async function deleteVideoNoteFromSupabaseCloud(video = {}, noteId = '') {
    const userId = currentCloudStudentId();
    const key = videoCloudKeyV136(video);
    const cleanId = String(noteId || '').trim();
    if (!key || !cleanId || !isStudent() || !userId || !cloudConfigured()) return false;
    try {
      const client = requireAuthClient();
      const uuidLike = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(cleanId);
      let query = client.from('student_notes').delete().eq('user_id', userId).eq('source_type', 'video').eq('source_key', key);
      query = uuidLike ? query.eq('id', cleanId) : query.eq('title', cleanId);
      const { error } = await query;
      if (error) throw error;
      await window.saveVideoProgressToSupabase?.(video, state.videoProgress?.[key] || {});
      return true;
    } catch (err) {
      console.warn('NovaMed student_notes delete failed:', err?.message || err);
      return false;
    }
  };


  // ==============================
  // Phase 2C cloud-only helpers
  // qbank_attempts + question_mistakes
  // ==============================

  function safeQuestionForCloudV137(question = {}) {
    const q = typeof normalizeQuestion === 'function' ? normalizeQuestion(question || {}) : (question || {});
    return {
      id: q.id ?? null,
      mode: q.mode || '',
      course: q.course || '',
      topic: q.topic || '',
      chapter: q.chapter || q.topic || '',
      lecture: q.lecture || q.subtopic || q.chapter || '',
      subtopic: q.subtopic || q.lecture || '',
      difficulty: q.difficulty || '',
      stem: q.stem || '',
      options: Array.isArray(q.options) ? q.options : [],
      correct: Number(q.correct ?? 0),
      explanation: q.explanation || '',
      correctExplanation: q.correctExplanation || '',
      optionExplanations: Array.isArray(q.optionExplanations) ? q.optionExplanations : [],
      wrong: Array.isArray(q.wrong) ? q.wrong : [],
      takeaway: q.takeaway || ''
    };
  }

  function questionCloudKeyV137(question = {}) {
    const q = safeQuestionForCloudV137(question);
    if (typeof questionProgressKey === 'function') return questionProgressKey(q);
    return String(q.id || q.stem || '').toLowerCase().slice(0, 180);
  }

  function answerTextV137(question = {}, index = null) {
    const q = safeQuestionForCloudV137(question);
    if (index === null || index === undefined || Number(index) < 0) return 'No answer';
    const i = Number(index);
    const label = typeof optionLabel === 'function' ? optionLabel(i) : String.fromCharCode(65 + i);
    return `${label}: ${q.options?.[i] || ''}`.trim();
  }

  function attemptRowToLocalAttemptV137(row = {}) {
    const answer = Array.isArray(row.answers) ? (row.answers[0] || {}) : {};
    const q = safeQuestionForCloudV137(answer.question || {});
    const key = String(answer.questionId || answer.question_key || questionCloudKeyV137(q) || row.id || '').toLowerCase();
    const selected = answer.selected ?? answer.selectedIndex ?? null;
    const timedOut = Boolean(answer.timedOut || answer.timed_out || (!row.correct_count && !row.wrong_count && answer.result === 'timeout'));
    const isCorrect = Boolean(answer.isCorrect ?? answer.is_correct ?? Number(row.correct_count || 0) > 0);
    return {
      id: String(row.id || `${key}-${row.created_at || Date.now()}`),
      cloudId: row.id || null,
      questionId: key,
      stem: q.stem || answer.stem || '',
      mode: row.mode || q.mode || answer.mode || '',
      course: row.course || q.course || answer.course || '',
      topic: row.chapter || q.topic || answer.topic || '',
      subtopic: row.lecture || q.subtopic || answer.subtopic || '',
      selected,
      correctIndex: answer.correctIndex ?? answer.correct_index ?? q.correct ?? null,
      isCorrect,
      timedOut,
      source: answer.source || row.mode || 'qbank',
      at: row.finished_at || row.created_at || answer.at || new Date().toISOString()
    };
  }

  function buildQbankStatsFromAttemptsV137(attempts = []) {
    const stats = {};
    (Array.isArray(attempts) ? attempts : []).forEach(item => {
      const key = item.questionId || item.id;
      if (!key) return;
      const previous = stats[key] || {
        id: key,
        stem: item.stem || '',
        mode: item.mode || '',
        course: item.course || '',
        topic: item.topic || '',
        subtopic: item.subtopic || '',
        attempts: 0,
        correct: 0,
        wrong: 0,
        timeouts: 0,
        lastSelected: null,
        correctIndex: item.correctIndex ?? null,
        lastResult: '',
        lastAt: null,
        updatedAt: null
      };
      previous.attempts += 1;
      previous.correct += item.isCorrect ? 1 : 0;
      previous.wrong += (!item.isCorrect && !item.timedOut) ? 1 : 0;
      previous.timeouts += item.timedOut ? 1 : 0;
      previous.lastSelected = item.selected ?? null;
      previous.correctIndex = item.correctIndex ?? previous.correctIndex ?? null;
      previous.lastResult = item.timedOut ? 'timeout' : (item.isCorrect ? 'correct' : 'wrong');
      previous.lastAt = item.at || previous.lastAt;
      previous.updatedAt = item.at || previous.updatedAt;
      stats[key] = previous;
    });
    return typeof normalizeQbankStats === 'function' ? normalizeQbankStats(stats) : stats;
  }

  function mistakeRowToLocalMistakeV137(row = {}) {
    const q = safeQuestionForCloudV137(row.question || {});
    const meta = row.question && typeof row.question === 'object' ? (row.question.__mistakeMeta || {}) : {};
    const key = String(row.question_key || questionCloudKeyV137(q) || row.id || '').toLowerCase();
    const selectedIndex = meta.selectedIndex ?? meta.selected ?? null;
    const status = row.status === 'recovered'
      ? 'recovered'
      : (row.status === 'mastered' ? 'mastered' : (row.status === 'reviewed' ? 'reviewed' : 'active'));
    return {
      key,
      cloudId: row.id || null,
      question: q,
      selected: selectedIndex,
      attempts: Math.max(1, Number(row.times_wrong || meta.attempts || 1)),
      wrongStreak: Math.max(0, Number(meta.wrongStreak || row.times_wrong || 0)),
      reviewIntervalDays: Number(meta.reviewIntervalDays || 1),
      dueAt: meta.dueAt || null,
      status,
      correctReviewCount: Number(meta.correctReviewCount || (status === 'mastered' ? 2 : 0)),
      autoNote: meta.autoNote || '',
      personalNote: meta.personalNote || '',
      createdAt: row.created_at || meta.createdAt || new Date().toISOString(),
      updatedAt: row.updated_at || row.last_wrong_at || meta.updatedAt || new Date().toISOString(),
      reviewedAt: meta.reviewedAt || null,
      masteredAt: status === 'mastered' ? (row.resolved_at || meta.masteredAt || null) : null,
      recoveredAt: row.status === 'recovered' ? (row.resolved_at || meta.recoveredAt || null) : null
    };
  }

  function cloudPayloadFromMistakeV137(item = {}) {
    const q = safeQuestionForCloudV137(item.question || {});
    const key = String(item.key || questionCloudKeyV137(q) || '').toLowerCase();
    if (!key) return null;
    const meta = {
      selectedIndex: item.selected ?? null,
      attempts: Math.max(1, Number(item.attempts || 1)),
      wrongStreak: Math.max(0, Number(item.wrongStreak || item.attempts || 0)),
      reviewIntervalDays: Number(item.reviewIntervalDays || 1),
      dueAt: item.dueAt || null,
      correctReviewCount: Number(item.correctReviewCount || 0),
      autoNote: item.autoNote || '',
      personalNote: item.personalNote || '',
      reviewedAt: item.reviewedAt || null,
      masteredAt: item.masteredAt || null,
      recoveredAt: item.recoveredAt || null,
      createdAt: item.createdAt || new Date().toISOString(),
      updatedAt: item.updatedAt || new Date().toISOString()
    };
    return {
      question_key: key,
      course: q.course || '',
      chapter: q.topic || q.chapter || '',
      lecture: q.subtopic || q.lecture || '',
      question: { ...q, __mistakeMeta: meta },
      selected_answer: answerTextV137(q, item.selected),
      correct_answer: answerTextV137(q, q.correct),
      explanation: q.explanation || q.correctExplanation || q.takeaway || '',
      status: item.status === 'mastered' || item.status === 'recovered' ? item.status : (item.status === 'reviewed' ? 'reviewed' : 'active'),
      times_wrong: Math.max(1, Number(item.attempts || item.wrongStreak || 1)),
      last_wrong_at: item.updatedAt || new Date().toISOString(),
      resolved_at: (item.status === 'mastered' || item.status === 'recovered') ? (item.masteredAt || item.recoveredAt || item.updatedAt || new Date().toISOString()) : null,
      updated_at: new Date().toISOString()
    };
  }

  async function loadQbankAttemptsAndMistakesFromSupabaseV137(userId = currentCloudStudentId()) {
    if (!userId || !cloudConfigured()) return false;
    const client = requireAuthClient();

    const attemptsRes = await client
      .from('qbank_attempts')
      .select('id,mode,course,chapter,lecture,question_count,correct_count,wrong_count,score_percent,duration_seconds,answers,started_at,finished_at,created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1000);
    if (attemptsRes.error) throw attemptsRes.error;

    const mistakesRes = await client
      .from('question_mistakes')
      .select('id,question_key,course,chapter,lecture,question,selected_answer,correct_answer,explanation,status,times_wrong,last_wrong_at,resolved_at,created_at,updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1000);
    if (mistakesRes.error) throw mistakesRes.error;

    const attempts = (attemptsRes.data || []).map(attemptRowToLocalAttemptV137).filter(item => item.questionId || item.stem);
    attempts.sort((a, b) => new Date(a.at || 0) - new Date(b.at || 0));
    state.qbankAttempts = typeof normalizeQbankAttempts === 'function' ? normalizeQbankAttempts(attempts) : attempts;
    state.qbankStats = buildQbankStatsFromAttemptsV137(state.qbankAttempts);
    state.mistakes = (mistakesRes.data || []).map(mistakeRowToLocalMistakeV137).filter(item => item.key && item.question?.stem);
    if (typeof normalizeMistakeStateV102 === 'function') normalizeMistakeStateV102();
    queueLiveUiRefreshV143('qbank-mistakes-loaded', { leaderboard: false });
    if (!window.__novamedCloudRestoringV140) {
      if (typeof renderMistakes === 'function') renderMistakes();
      if (typeof renderProfileStats === 'function') renderProfileStats();
      if (typeof renderQbank === 'function') renderQbank();
    }
    return true;
  }

  window.loadQbankAttemptsAndMistakesFromSupabase = loadQbankAttemptsAndMistakesFromSupabaseV137;

  window.saveQbankAttemptToSupabase = async function saveQbankAttemptToSupabaseCloud(question = {}, selectedIndex = null, options = {}) {
    const userId = currentCloudStudentId();
    if (!isStudent() || !userId || !cloudConfigured()) return false;
    const q = safeQuestionForCloudV137(question);
    const key = questionCloudKeyV137(q);
    if (!key) return false;
    const timedOut = Boolean(options.timedOut);
    const isCorrect = !timedOut && Number(selectedIndex) === Number(q.correct);
    const now = new Date().toISOString();
    const answer = {
      questionId: key,
      question_key: key,
      question: q,
      stem: q.stem || '',
      mode: q.mode || '',
      course: q.course || '',
      topic: q.topic || '',
      subtopic: q.subtopic || q.lecture || '',
      selected: selectedIndex ?? null,
      selectedIndex: selectedIndex ?? null,
      selectedAnswer: answerTextV137(q, selectedIndex),
      correctIndex: q.correct,
      correctAnswer: answerTextV137(q, q.correct),
      isCorrect,
      timedOut,
      source: options.source || 'qbank',
      at: now
    };
    try {
      const client = requireAuthClient();
      const { error } = await client.from('qbank_attempts').insert({
        user_id: userId,
        mode: options.source || q.mode || 'qbank',
        course: q.course || '',
        chapter: q.topic || q.chapter || '',
        lecture: q.subtopic || q.lecture || '',
        question_count: 1,
        correct_count: isCorrect ? 1 : 0,
        wrong_count: isCorrect || timedOut ? 0 : 1,
        score_percent: isCorrect ? 100 : 0,
        duration_seconds: Math.max(0, Number(options.durationSeconds || options.duration_seconds || 0)),
        answers: [answer],
        started_at: options.startedAt || now,
        finished_at: now
      });
      if (error) throw error;
      queueLiveUiRefreshV143('qbank-attempt-saved', { leaderboard: true });
      return true;
    } catch (err) {
      console.warn('NovaMed qbank_attempts save failed:', err?.message || err);
      return false;
    }
  };

  window.saveQuestionMistakeToSupabase = function saveQuestionMistakeToSupabaseCloud(item = {}, options = {}) {
    const userId = currentCloudStudentId();
    if (!isStudent() || !userId || !cloudConfigured() || !item) return Promise.resolve(false);
    const payload = cloudPayloadFromMistakeV137(item);
    if (!payload) return Promise.resolve(false);
    const key = payload.question_key;
    queueLiveUiRefreshV143('mistake-local-change', { leaderboard: true, delay: 40 });
    clearTimeout(mistakeNoteCloudTimers.get(key));
    return new Promise(resolve => {
      const delay = options.immediate ? 0 : 350;
      const timer = setTimeout(async () => {
        try {
          const client = requireAuthClient();
          const { error } = await client.from('question_mistakes').upsert({
            user_id: userId,
            ...payload
          }, { onConflict: 'user_id,question_key' });
          if (error) throw error;
          queueLiveUiRefreshV143('mistake-saved', { leaderboard: true });
          resolve(true);
        } catch (err) {
          console.warn('NovaMed question_mistakes save failed:', err?.message || err);
          resolve(false);
        } finally {
          mistakeNoteCloudTimers.delete(key);
        }
      }, delay);
      mistakeNoteCloudTimers.set(key, timer);
    });
  };


  // ==============================
  // Phase 2D cloud-only helpers
  // flashcard_progress + student_bookmarks + student_search_history
  // ==============================

  function flashcardKeyV138(card = {}) {
    return String(card.key || card.card_key || card.questionId || card.question_id || card.stem || '').trim().toLowerCase();
  }

  function normalizeLocalFlashcardV138(card = {}) {
    const key = flashcardKeyV138(card);
    if (!key) return null;
    const easeRaw = card.lastRating || card.ease || 'again';
    const ease = String(easeRaw || 'again').toLowerCase();
    return {
      key,
      questionId: card.questionId || card.question_id || null,
      course: card.course || '',
      topic: card.topic || card.chapter || '',
      subtopic: card.subtopic || card.lecture || '',
      front: card.front || card.stem || 'Review this card',
      back: card.back || card.answer || '',
      stem: card.stem || card.front || '',
      answer: card.answer || '',
      takeaway: card.takeaway || '',
      ease,
      lastRating: card.lastRating || ease,
      reviewCount: Number(card.reviewCount || card.review_count || 0),
      correctCount: Number(card.correctCount || card.correct_count || (ease === 'easy' ? 1 : 0)),
      wrongCount: Number(card.wrongCount || card.wrong_count || (ease === 'again' ? 1 : 0)),
      dueAt: card.dueAt || card.nextReviewAt || card.next_review_at || null,
      reviewedAt: card.reviewedAt || card.lastReviewedAt || card.last_reviewed_at || null,
      createdAt: card.createdAt || card.created_at || new Date().toISOString(),
      updatedAt: card.updatedAt || card.updated_at || new Date().toISOString()
    };
  }

  function flashcardRowToLocalV138(row = {}) {
    const meta = row.meta && typeof row.meta === 'object' ? row.meta : {};
    return normalizeLocalFlashcardV138({
      key: row.card_key,
      questionId: meta.questionId || meta.question_id || null,
      course: row.course || meta.course || '',
      topic: row.chapter || meta.topic || '',
      subtopic: row.lecture || meta.subtopic || '',
      front: meta.front || meta.stem || '',
      back: meta.back || meta.answer || '',
      stem: meta.stem || meta.front || '',
      answer: meta.answer || '',
      takeaway: meta.takeaway || '',
      ease: row.ease || meta.ease || 'again',
      lastRating: meta.lastRating || row.ease || 'again',
      reviewCount: row.review_count || meta.reviewCount || 0,
      correctCount: row.correct_count || meta.correctCount || 0,
      wrongCount: row.wrong_count || meta.wrongCount || 0,
      dueAt: row.next_review_at || meta.dueAt || null,
      reviewedAt: row.last_reviewed_at || meta.reviewedAt || null,
      createdAt: meta.createdAt || row.created_at || new Date().toISOString(),
      updatedAt: row.updated_at || meta.updatedAt || new Date().toISOString()
    });
  }

  function cloudPayloadFromFlashcardV138(card = {}) {
    const safe = normalizeLocalFlashcardV138(card);
    if (!safe) return null;
    const ease = String(safe.lastRating || safe.ease || 'again').toLowerCase();
    const reviewedNow = Boolean(card.reviewedAt || card.lastRating || card.reviewCount || card.review_count);
    const reviewCount = Math.max(0, Number(safe.reviewCount || 0));
    const correctCount = Math.max(0, Number(safe.correctCount || 0));
    const wrongCount = Math.max(0, Number(safe.wrongCount || 0));
    return {
      card_key: safe.key,
      course: safe.course || '',
      chapter: safe.topic || '',
      lecture: safe.subtopic || '',
      ease,
      review_count: reviewCount,
      correct_count: correctCount,
      wrong_count: wrongCount,
      next_review_at: safe.dueAt || null,
      last_reviewed_at: reviewedNow ? (safe.reviewedAt || new Date().toISOString()) : null,
      meta: {
        questionId: safe.questionId || null,
        front: safe.front || '',
        back: safe.back || '',
        stem: safe.stem || '',
        answer: safe.answer || '',
        takeaway: safe.takeaway || '',
        lastRating: safe.lastRating || ease,
        course: safe.course || '',
        topic: safe.topic || '',
        subtopic: safe.subtopic || '',
        createdAt: safe.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      updated_at: new Date().toISOString()
    };
  }

  function flashcardFromMistakeV138(item = {}) {
    if (!item?.question) return null;
    const q = typeof normalizeQuestion === 'function' ? normalizeQuestion(item.question) : item.question;
    const key = String(item.key || (typeof mistakeKey === 'function' ? mistakeKey(q) : q.id || q.stem || '')).toLowerCase();
    if (!key || !q?.stem) return null;
    const correctAnswer = q.options?.[q.correct] || 'Correct answer';
    return normalizeLocalFlashcardV138({
      key,
      questionId: q.id,
      course: q.course,
      topic: q.topic,
      subtopic: q.subtopic || q.lecture || '',
      front: q.takeaway || String(q.stem || '').slice(0, 180),
      back: `${correctAnswer}. ${q.explanation || q.takeaway || 'Review the explanation again.'}`,
      stem: q.stem,
      answer: correctAnswer,
      takeaway: q.takeaway || '',
      ease: 'again',
      dueAt: item.dueAt || new Date().toISOString(),
      createdAt: item.createdAt || new Date().toISOString(),
      updatedAt: item.updatedAt || new Date().toISOString()
    });
  }

  function bookmarkDataFromRowV138(row = {}) {
    const data = row.data && typeof row.data === 'object' ? row.data : {};
    const sourceKey = String(row.source_key || data.id || '').trim();
    if (!sourceKey) return null;
    return {
      ...data,
      id: sourceKey,
      title: data.title || row.title || sourceKey,
      at: data.at || row.created_at || row.updated_at || new Date().toISOString(),
      cloudId: row.id || null
    };
  }

  async function loadPhase2DCloudExtrasV138(userId = currentCloudStudentId()) {
    if (!userId || !cloudConfigured()) return false;
    const client = requireAuthClient();

    const flashRes = await client
      .from('flashcard_progress')
      .select('id,card_key,course,chapter,lecture,ease,review_count,correct_count,wrong_count,next_review_at,last_reviewed_at,meta,created_at,updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(2000);
    if (flashRes.error) throw flashRes.error;

    const bookmarkRes = await client
      .from('student_bookmarks')
      .select('id,source_type,source_key,title,data,created_at,updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(2000);
    if (bookmarkRes.error) throw bookmarkRes.error;

    const searchRes = await client
      .from('student_search_history')
      .select('id,area,query,created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (searchRes.error) throw searchRes.error;

    const flashcards = [];
    const seenCards = new Set();
    (flashRes.data || []).forEach(row => {
      const card = flashcardRowToLocalV138(row);
      if (!card || seenCards.has(card.key)) return;
      seenCards.add(card.key);
      flashcards.push(card);
    });
    (state.mistakes || []).forEach(item => {
      const card = flashcardFromMistakeV138(item);
      if (!card || seenCards.has(card.key)) return;
      seenCards.add(card.key);
      flashcards.push(card);
      window.saveFlashcardProgressToSupabase?.(card, { immediate: false, skipCounters: true }).catch?.(() => {});
    });
    state.flashcards = flashcards.sort((a, b) => new Date(b.updatedAt || b.reviewedAt || 0) - new Date(a.updatedAt || a.reviewedAt || 0));

    const store = ensureFeatureStoreCacheV136();
    store.videoBookmarks = {};
    store.questionBookmarks = {};
    (bookmarkRes.data || []).forEach(row => {
      const item = bookmarkDataFromRowV138(row);
      if (!item) return;
      if (row.source_type === 'video') store.videoBookmarks[item.id] = item;
      if (row.source_type === 'question') store.questionBookmarks[item.id] = item;
    });
    store.searchHistory = (searchRes.data || []).map(row => ({
      id: row.id,
      area: row.area || 'global',
      query: row.query || '',
      at: row.created_at || new Date().toISOString()
    })).filter(item => item.query);

    queueLiveUiRefreshV143('flashcards-bookmarks-loaded', { leaderboard: false });
    if (!window.__novamedCloudRestoringV140) {
      if (typeof renderFlashcards === 'function') renderFlashcards();
      if (typeof renderBookmarksPanel === 'function') renderBookmarksPanel();
      if (typeof renderHomeSmartWidgetsV79 === 'function') renderHomeSmartWidgetsV79();
    }
    return true;
  }

  window.loadPhase2DCloudExtrasFromSupabase = loadPhase2DCloudExtrasV138;

  window.saveFlashcardProgressToSupabase = function saveFlashcardProgressToSupabaseCloud(card = {}, options = {}) {
    const userId = currentCloudStudentId();
    if (!isStudent() || !userId || !cloudConfigured()) return Promise.resolve(false);
    const payload = cloudPayloadFromFlashcardV138(card);
    if (!payload) return Promise.resolve(false);
    const key = payload.card_key;
    clearTimeout(flashcardCloudTimers.get(key));
    return new Promise(resolve => {
      const delay = options.immediate ? 0 : 500;
      const timer = setTimeout(async () => {
        try {
          const client = requireAuthClient();
          const { error } = await client.from('flashcard_progress').upsert({
            user_id: userId,
            ...payload
          }, { onConflict: 'user_id,card_key' });
          if (error) throw error;
          queueLiveUiRefreshV143('flashcard-saved', { leaderboard: false });
          resolve(true);
        } catch (err) {
          console.warn('NovaMed flashcard_progress save failed:', err?.message || err);
          resolve(false);
        } finally {
          flashcardCloudTimers.delete(key);
        }
      }, delay);
      flashcardCloudTimers.set(key, timer);
    });
  };

  window.saveBookmarkToSupabase = async function saveBookmarkToSupabaseCloud(sourceType = '', sourceKey = '', data = {}, options = {}) {
    const userId = currentCloudStudentId();
    const type = String(sourceType || '').trim();
    const key = String(sourceKey || data?.id || '').trim();
    if (!type || !key || !isStudent() || !userId || !cloudConfigured()) return false;
    try {
      const client = requireAuthClient();
      if (options.active === false || options.remove === true) {
        const { error } = await client
          .from('student_bookmarks')
          .delete()
          .eq('user_id', userId)
          .eq('source_type', type)
          .eq('source_key', key);
        if (error) throw error;
        queueLiveUiRefreshV143('bookmark-removed', { leaderboard: false, delay: 40 });
        return true;
      }
      const clean = data && typeof data === 'object' ? data : { id: key };
      const { error } = await client.from('student_bookmarks').upsert({
        user_id: userId,
        source_type: type,
        source_key: key,
        title: String(clean.title || clean.stem || key).slice(0, 240),
        data: { ...clean, id: key, at: clean.at || new Date().toISOString() },
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,source_type,source_key' });
      if (error) throw error;
      queueLiveUiRefreshV143('bookmark-saved', { leaderboard: false, delay: 40 });
      return true;
    } catch (err) {
      console.warn('NovaMed student_bookmarks save failed:', err?.message || err);
      return false;
    }
  };

  window.recordSearchHistoryToSupabase = function recordSearchHistoryToSupabaseCloud(area = 'global', query = '') {
    const userId = currentCloudStudentId();
    const cleanQuery = String(query || '').trim();
    const cleanArea = String(area || 'global').trim() || 'global';
    if (!cleanQuery || cleanQuery.length < 2 || !isStudent() || !userId || !cloudConfigured()) return Promise.resolve(false);
    const store = ensureFeatureStoreCacheV136();
    const last = store.searchHistory?.[0];
    if (!last || last.query.toLowerCase() !== cleanQuery.toLowerCase() || last.area !== cleanArea) {
      store.searchHistory = [{ area: cleanArea, query: cleanQuery, at: new Date().toISOString() }, ...(store.searchHistory || [])]
        .filter((item, idx, arr) => idx === arr.findIndex(other => other.area === item.area && String(other.query).toLowerCase() === String(item.query).toLowerCase()))
        .slice(0, 50);
    }
    lastSearchHistoryPayload = { user_id: userId, area: cleanArea, query: cleanQuery };
    clearTimeout(searchHistoryCloudTimer);
    return new Promise(resolve => {
      searchHistoryCloudTimer = setTimeout(async () => {
        try {
          const client = requireAuthClient();
          const payload = lastSearchHistoryPayload;
          lastSearchHistoryPayload = null;
          const { error } = await client.from('student_search_history').insert(payload);
          if (error) throw error;
          resolve(true);
        } catch (err) {
          console.warn('NovaMed student_search_history save failed:', err?.message || err);
          resolve(false);
        }
      }, 850);
    });
  };

  function currentCloudStudentId() {
    return state?.user?.supabaseId || state?.user?.studentKey || '';
  }

  function cleanupPhase2ALocalKeys() {
    cleanupPhase2BLocalKeys();
    cleanupPhase2EStudentLocalKeys();
  }

  function cleanupPhase2EStudentLocalKeys() {
    // v139 final cleanup: remove old student-progress keys. Supabase Auth may still keep its own session token.
    try {
      const exact = new Set([
        'novamed-ui-progress-v1',
        'novamed-feature-layer-v79',
        'novamed-imported-qbank-v87',
        'novamed-home-widget-settings-v117',
        'novamed-live-timed-exam-v1',
        'novamed-smart-study-plan-v85'
      ]);
      Object.keys(localStorage || {}).forEach(key => {
        if (exact.has(key) ||
          key.startsWith('novamed-exam-targets-v1:') ||
          key.startsWith('novamed-study-route-v1:') ||
          key.startsWith('novamed-smart-study-plan-v85') ||
          key.startsWith('novamed-live-timed-exam-v1')
        ) {
          localStorage.removeItem(key);
        }
      });
    } catch {}
  }

  function normalizeCloudLiveExam(examState = null) {
    if (!examState || typeof examState !== 'object') return null;
    const pool = Array.isArray(examState.pool) ? examState.pool : [];
    if (!pool.length) return null;
    return {
      ...examState,
      pool: pool.map(q => typeof normalizeQuestion === 'function' ? normalizeQuestion(q) : q),
      selected: examState.selected && typeof examState.selected === 'object' ? examState.selected : {},
      unsure: examState.unsure && typeof examState.unsure === 'object' ? examState.unsure : {},
      index: Math.max(0, Math.min(Number(examState.index || 0), pool.length - 1)),
      totalSeconds: Math.max(60, Number(examState.totalSeconds || 60)),
      endAt: Number(examState.endAt || 0),
      startedAt: examState.startedAt || new Date().toISOString(),
      liveId: examState.liveId || `live-${Date.now()}`,
      updatedAt: examState.updatedAt || new Date().toISOString()
    };
  }

  function normalizeCloudStudyPlan(plan = null) {
    if (!plan || typeof plan !== 'object' || !Array.isArray(plan.days)) return null;
    return { ...plan, updatedAt: plan.updatedAt || new Date().toISOString() };
  }

  async function loadPhase2StudentCloudState(userId = currentCloudStudentId()) {
    const cleanUserId = String(userId || '').trim();
    if (!cleanUserId || !cloudConfigured()) return false;

    const nowMs = Date.now();
    if (phase2RestorePromiseV140 && phase2RestoreUserIdV140 === cleanUserId && nowMs - phase2RestoreStartedAtV140 < 20000) {
      return phase2RestorePromiseV140;
    }

    phase2RestoreUserIdV140 = cleanUserId;
    phase2RestoreStartedAtV140 = nowMs;
    window.__novamedCloudRestoringV140 = true;

    phase2RestorePromiseV140 = (async () => {
      const client = requireAuthClient();
      const [liveRes, planRes] = await Promise.all([
        client
          .from('live_exams')
          .select('id,exam_state,status,updated_at')
          .eq('user_id', cleanUserId)
          .eq('status', 'active')
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        client
          .from('study_plans')
          .select('id,title,plan_data,active,updated_at')
          .eq('user_id', cleanUserId)
          .eq('active', true)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle()
      ]);

      if (liveRes.error && liveRes.error.code !== 'PGRST116') throw liveRes.error;
      if (planRes.error && planRes.error.code !== 'PGRST116') throw planRes.error;

      window.__novamedLiveExamRowId = liveRes.data?.id || null;
      window.__novamedLiveExamCache = normalizeCloudLiveExam(liveRes.data?.exam_state || null);
      window.__novamedSmartStudyPlanRowId = planRes.data?.id || null;
      window.__novamedSmartStudyPlanCache = normalizeCloudStudyPlan(planRes.data?.plan_data || null);

      const results = await Promise.allSettled([
        loadVideoProgressAndNotesFromSupabaseV136(cleanUserId),
        loadQbankAttemptsAndMistakesFromSupabaseV137(cleanUserId),
        loadPhase2DCloudExtrasV138(cleanUserId)
      ]);
      results.forEach(result => {
        if (result.status === 'rejected') console.warn('NovaMed cloud restore part failed:', result.reason?.message || result.reason);
      });

      // v142: after restoring separated cloud tables, keep a high-water baseline so a fresh device
      // cannot save an empty/default profile over the real student progress.
      if (isStudent()) {
        const restoredSnapshot = typeof studentSnapshot === 'function' ? studentSnapshot() : publicProgressDefaults();
        const mergedBaseline = mergeSnapshotWithCloudBaselineV142(restoredSnapshot, cleanUserId);
        rememberCloudBaselineV142(cleanUserId, mergedBaseline);
        applyCloudBaselineIfHigherV142(mergedBaseline, null);
      }

      cleanupPhase2ALocalKeys();
      cleanupPhase2EStudentLocalKeys();
      return true;
    })();

    try {
      const ok = await phase2RestorePromiseV140;
      return ok;
    } finally {
      window.__novamedCloudRestoringV140 = false;
      refreshCloudViewsOnceV140();
      if (phase2RestoreUserIdV140 === cleanUserId) {
        phase2RestorePromiseV140 = null;
        phase2RestoreStartedAtV140 = 0;
      }
    }
  }

  window.loadPhase2StudentCloudState = loadPhase2StudentCloudState;

  window.saveLiveExamToSupabase = function saveLiveExamToSupabaseCloud(exam) {
    const userId = currentCloudStudentId();
    if (!userId || !isStudent() || !cloudConfigured()) return Promise.resolve(false);
    const safe = normalizeCloudLiveExam(exam);
    if (!safe) return Promise.resolve(false);
    window.__novamedLiveExamCache = safe;
    pendingLiveExamCloudPayload = safe;
    clearTimeout(liveExamCloudSaveTimer);
    return new Promise(resolve => {
      liveExamCloudSaveTimer = setTimeout(async () => {
        try {
          const client = requireAuthClient();
          const payload = pendingLiveExamCloudPayload;
          pendingLiveExamCloudPayload = null;
          const rowId = window.__novamedLiveExamRowId || null;
          if (rowId) {
            const { error } = await client.from('live_exams').update({
              exam_state: payload,
              status: 'active',
              updated_at: new Date().toISOString()
            }).eq('id', rowId).eq('user_id', userId);
            if (error) throw error;
          } else {
            const { data, error } = await client.from('live_exams').insert({
              user_id: userId,
              exam_state: payload,
              status: 'active'
            }).select('id').single();
            if (error) throw error;
            window.__novamedLiveExamRowId = data?.id || null;
          }
          resolve(true);
        } catch (err) {
          console.warn('NovaMed live_exams save failed:', err?.message || err);
          resolve(false);
        }
      }, 450);
    });
  };

  window.clearLiveExamFromSupabase = async function clearLiveExamFromSupabaseCloud(exam = null) {
    const userId = currentCloudStudentId();
    window.__novamedLiveExamCache = null;
    if (!userId || !isStudent() || !cloudConfigured()) return false;
    clearTimeout(liveExamCloudSaveTimer);
    pendingLiveExamCloudPayload = null;
    try {
      const client = requireAuthClient();
      const rowId = window.__novamedLiveExamRowId || null;
      if (rowId) {
        const { error } = await client.from('live_exams').update({
          status: 'completed',
          exam_state: exam || {},
          updated_at: new Date().toISOString()
        }).eq('id', rowId).eq('user_id', userId);
        if (error) throw error;
      } else {
        const { error } = await client.from('live_exams').update({
          status: 'completed',
          updated_at: new Date().toISOString()
        }).eq('user_id', userId).eq('status', 'active');
        if (error) throw error;
      }
      window.__novamedLiveExamRowId = null;
      return true;
    } catch (err) {
      console.warn('NovaMed live_exams clear failed:', err?.message || err);
      return false;
    }
  };

  window.saveSmartStudyPlanToSupabase = function saveSmartStudyPlanToSupabaseCloud(plan) {
    const userId = currentCloudStudentId();
    const safe = normalizeCloudStudyPlan(plan);
    if (!safe) return Promise.resolve(false);
    window.__novamedSmartStudyPlanCache = safe;
    if (!userId || !isStudent() || !cloudConfigured()) return Promise.resolve(false);
    pendingStudyPlanCloudPayload = safe;
    clearTimeout(studyPlanCloudSaveTimer);
    return new Promise(resolve => {
      studyPlanCloudSaveTimer = setTimeout(async () => {
        try {
          const client = requireAuthClient();
          const payload = pendingStudyPlanCloudPayload;
          pendingStudyPlanCloudPayload = null;
          const title = String(payload.title || 'Smart Study Plan').slice(0, 120);
          const rowId = window.__novamedSmartStudyPlanRowId || null;
          if (rowId) {
            const { error } = await client.from('study_plans').update({
              title,
              plan_data: payload,
              active: true,
              updated_at: new Date().toISOString()
            }).eq('id', rowId).eq('user_id', userId);
            if (error) throw error;
          } else {
            // Keep one active study plan per student.
            await client.from('study_plans').update({ active: false, updated_at: new Date().toISOString() }).eq('user_id', userId).eq('active', true);
            const { data, error } = await client.from('study_plans').insert({
              user_id: userId,
              title,
              plan_data: payload,
              active: true
            }).select('id').single();
            if (error) throw error;
            window.__novamedSmartStudyPlanRowId = data?.id || null;
          }
          resolve(true);
        } catch (err) {
          console.warn('NovaMed study_plans save failed:', err?.message || err);
          resolve(false);
        }
      }, 450);
    });
  };

  window.clearSmartStudyPlanFromSupabase = async function clearSmartStudyPlanFromSupabaseCloud() {
    const userId = currentCloudStudentId();
    window.__novamedSmartStudyPlanCache = null;
    if (!userId || !isStudent() || !cloudConfigured()) return false;
    clearTimeout(studyPlanCloudSaveTimer);
    pendingStudyPlanCloudPayload = null;
    try {
      const client = requireAuthClient();
      const rowId = window.__novamedSmartStudyPlanRowId || null;
      if (rowId) {
        const { error } = await client.from('study_plans').update({
          active: false,
          updated_at: new Date().toISOString()
        }).eq('id', rowId).eq('user_id', userId);
        if (error) throw error;
      } else {
        const { error } = await client.from('study_plans').update({
          active: false,
          updated_at: new Date().toISOString()
        }).eq('user_id', userId).eq('active', true);
        if (error) throw error;
      }
      window.__novamedSmartStudyPlanRowId = null;
      return true;
    } catch (err) {
      console.warn('NovaMed study_plans clear failed:', err?.message || err);
      return false;
    }
  };

  async function flushStudentStateSaveV140(snapshot = null) {
    if (!isStudent()) return false;
    const userId = state.user?.supabaseId || state.user?.studentKey;
    if (!userId || !cloudConfigured()) return false;
    if (snapshot) studentStateSnapshotV140 = snapshot;
    if (!studentStateSnapshotV140) {
      studentStateSnapshotV140 = typeof studentSnapshot === 'function' ? studentSnapshot() : publicProgressDefaults();
    }
    if (studentStateSavePromiseV140) {
      studentStateSavePendingV140 = true;
      return studentStateSavePromiseV140;
    }

    studentStateSavePromiseV140 = (async () => {
      let ok = true;
      do {
        studentStateSavePendingV140 = false;
        const snapshotToSave = studentStateSnapshotV140 || (typeof studentSnapshot === 'function' ? studentSnapshot() : publicProgressDefaults());
        const finalSnapshotToSave = mergeSnapshotWithCloudBaselineV142(snapshotToSave, userId);
        if (Number(finalSnapshotToSave.xp || 0) > Number(snapshotToSave.xp || 0) || Number(finalSnapshotToSave.streak || 0) > Number(snapshotToSave.streak || 0)) {
          applyCloudBaselineIfHigherV142(finalSnapshotToSave, null);
        }
        try {
          const client = requireAuthClient();
          const stateResult = await client.from('student_state').upsert(studentStateNonRewardPayloadFromSnapshotV148(finalSnapshotToSave), { onConflict: 'user_id' });
          if (stateResult.error) throw stateResult.error;
          const display = currentUserName();
          const publicRow = {
            user_id: userId,
            display_name: display,
            leaderboard_visible: true,
            last_active_at: new Date().toISOString()
          };
          const publicResult = await client.from('student_public').upsert(publicRow, { onConflict: 'user_id' });
          if (publicResult.error) throw publicResult.error;
          rememberCloudBaselineV142(userId, finalSnapshotToSave);

          // Keep the visible leaderboard cache fresh without forcing an immediate network round trip.
          if (Array.isArray(leaderboardRowsCacheV140.rows)) {
            const rows = leaderboardRowsCacheV140.rows.filter(row => row.user_id !== userId);
            rows.push({
              ...publicRow,
              xp: Number(state.xp || finalSnapshotToSave.xp || 0),
              streak: Number(state.streak || finalSnapshotToSave.streak || 0),
              level: Math.max(1, Math.floor(Number(state.xp || finalSnapshotToSave.xp || 0) / 100) + 1)
            });
            rows.sort((a, b) => Number(b.xp || 0) - Number(a.xp || 0) || new Date(b.last_active_at || 0) - new Date(a.last_active_at || 0));
            leaderboardRowsCacheV140.rows = rows.slice(0, 10);
          }

          lastProfileSyncError = null;
          lastProfileSyncAt = new Date();
          if (typeof updateProfileSyncStatus === 'function') updateProfileSyncStatus('Synced', 'ready');
          queueLiveUiRefreshV143('student-state-saved', { leaderboard: true });
        } catch (err) {
          ok = false;
          lastProfileSyncError = err;
          if (typeof updateProfileSyncStatus === 'function') updateProfileSyncStatus('Profile sync error', 'warn');
          console.warn('NovaMed Supabase student_state sync failed:', err?.message || err);
        }
      } while (studentStateSavePendingV140);
      return ok;
    })();

    try {
      return await studentStateSavePromiseV140;
    } finally {
      studentStateSavePromiseV140 = null;
    }
  }

  function scheduleStudentStateSaveV140(delay = 1100) {
    if (!isStudent()) return Promise.resolve(false);
    studentStateSnapshotV140 = typeof studentSnapshot === 'function' ? studentSnapshot() : publicProgressDefaults();
    clearTimeout(studentStateSaveTimerV140);
    return new Promise(resolve => {
      studentStateSaveTimerV140 = setTimeout(() => {
        flushStudentStateSaveV140(studentStateSnapshotV140).then(resolve).catch(() => resolve(false));
      }, delay);
    });
  }

  window.saveStudentProgress = function saveStudentProgressCloudOnly() {
    if (!isStudent()) return;
    if (!state.user?.supabaseId && !state.user?.studentKey) return;
    queueLiveUiRefreshV143('student-progress-local', { leaderboard: true, delay: 40 });
    scheduleStudentStateSaveV140(1200);
  };

  window.pushStudentProgressToSupabase = async function pushStudentProgressToSupabaseCloudTables() {
    if (!isStudent()) return false;
    clearTimeout(studentStateSaveTimerV140);
    const snapshot = typeof studentSnapshot === 'function' ? studentSnapshot() : publicProgressDefaults();
    return flushStudentStateSaveV140(snapshot);
  };

  function completeCloudStudentSignIn(account, message = '', options = {}) {
    const clean = normalizeStudentAccount(account, account.studentKey || account.name);
    setSession({
      name: clean.name,
      email: clean.email || '',
      studentKey: clean.studentKey,
      role: 'student',
      supabaseId: clean.supabaseUserId || clean.studentKey
    });
    state = loadState();
    applyStudentProfileToState(clean.profile, clean);
    if (!options.keepModal && typeof closeModal === 'function') closeModal();
    if (typeof refreshAfterAccountChange === 'function') refreshAfterAccountChange();
    if (message) toast(message);
    // v142: restore first, then later saves are guarded by the cloud high-water baseline.
    rememberCloudBaselineV142(clean.supabaseUserId || clean.studentKey, clean.profile || publicProgressDefaults());
    schedulePhase2StudentCloudRestoreV140(clean.supabaseUserId || clean.studentKey, { delay: 80 });
    setTimeout(() => { try { scheduleStudentStateSaveV140(1600); } catch {} }, 2600);
    queueLiveUiRefreshV143('student-signed-in', { leaderboard: true, delay: 40 });
    renderRealStreakLeaderboard({ force: true });
  }

  window.completeStudentSignIn = completeCloudStudentSignIn;

  window.syncSimpleStudentProfileOnBoot = async function syncSupabaseAuthSessionOnBoot() {
    if (!cloudConfigured()) return;
    try {
      const client = requireAuthClient();
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      const authUser = data?.session?.user;
      if (!authUser?.id) return;
      const account = await fetchAuthStudentAccount(authUser);
      if (account) completeCloudStudentSignIn(account, '', { keepModal: true });
      if (typeof updateCloudBadge === 'function') updateCloudBadge('Student restored');
    } catch (err) {
      console.warn('NovaMed Supabase Auth restore failed:', err?.message || err);
      if (typeof updateCloudBadge === 'function') updateCloudBadge('Auth restore error');
    }
  };

  async function sendSignupOtp(email) {
    const client = requireAuthClient();
    const cleanEmail = normalizeEmail(email);
    if (!cleanEmail) throw new Error('Enter your email first.');
    const { error } = await client.auth.signInWithOtp({
      email: cleanEmail,
      options: { shouldCreateUser: true }
    });
    if (error) throw error;
    studentAuthFlow = { mode: 'signup', signupStep: 'otp', email: cleanEmail, verified: false };
    renderStudentAuthFlow();
    toast('Verification code sent. Check your email.');
  }

  async function verifySignupOtp(email, token) {
    const client = requireAuthClient();
    const cleanEmail = normalizeEmail(email);
    const cleanToken = String(token || '').trim();
    if (!cleanToken) throw new Error('Enter the verification code.');
    const typesToTry = ['email', 'signup', 'magiclink'];
    let lastError = null;
    for (const type of typesToTry) {
      const { data, error } = await client.auth.verifyOtp({ email: cleanEmail, token: cleanToken, type });
      if (!error && data?.user) {
        studentAuthFlow = { mode: 'signup', signupStep: 'profile', email: cleanEmail, verified: true };
        renderStudentAuthFlow();
        toast('Email confirmed. Complete your name and password.');
        return data.user;
      }
      lastError = error;
    }
    throw lastError || new Error('Could not verify this code.');
  }

  async function finishSignupProfile(formData) {
    const client = requireAuthClient();
    const firstName = normalizeStudentName(formData.get('firstName'));
    const lastName = normalizeStudentName(formData.get('lastName'));
    const password = String(formData.get('password') || '');
    const confirmPassword = String(formData.get('confirmPassword') || '');
    if (!firstName) throw new Error('Enter the first name.');
    if (!lastName) throw new Error('Enter the second name.');
    if (password.length < 6) throw new Error('Password must be at least 6 characters.');
    if (password !== confirmPassword) throw new Error('Passwords do not match.');
    const { first, last, display } = splitStudentName(firstName, lastName, studentAuthFlow.email);
    const { data, error } = await client.auth.updateUser({
      password,
      data: { first_name: first, last_name: last, display_name: display, full_name: display }
    });
    if (error) throw error;
    const user = data?.user || (await client.auth.getUser()).data?.user;
    await upsertAuthProfileRows(user, { firstName: first, lastName: last });
    const account = await fetchAuthStudentAccount(user);
    completeCloudStudentSignIn(account, `Welcome, ${account.name}. Your account is connected to your email.`);
  }

  async function signInWithEmailPassword(formData) {
    const client = requireAuthClient();
    const email = normalizeEmail(formData.get('email'));
    const password = String(formData.get('password') || '');
    if (!email || !password) throw new Error('Enter email and password.');
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    const account = await fetchAuthStudentAccount(data.user);
    completeCloudStudentSignIn(account, `Welcome back, ${account.name}. Your progress was restored from Supabase.`);
  }

  function signinFormHtml() {
    return `
      <form id="studentEmailSigninForm" class="form-stack auth-step-form">
        <label class="field-label"><span>Email</span><input name="email" type="email" required autocomplete="email" placeholder="student@example.com" /></label>
        <label class="field-label"><span>Password</span><input name="password" type="password" required autocomplete="current-password" placeholder="Your password" /></label>
        <button class="primary-btn" type="submit">Sign in</button>
      </form>
    `;
  }

  function signupFormHtml() {
    if (studentAuthFlow.signupStep === 'profile') {
      return `
        <form id="studentSignupProfileForm" class="form-stack auth-step-form">
          <div class="form-row">
            <label class="field-label"><span>First name</span><input name="firstName" required autocomplete="given-name" placeholder="Ahmed" /></label>
            <label class="field-label"><span>Second name</span><input name="lastName" required autocomplete="family-name" placeholder="Adnan" /></label>
          </div>
          <label class="field-label"><span>Password</span><input name="password" type="password" required autocomplete="new-password" placeholder="At least 6 characters" /></label>
          <label class="field-label"><span>Confirm password</span><input name="confirmPassword" type="password" required autocomplete="new-password" placeholder="Repeat password" /></label>
          <button class="primary-btn" type="submit">Create</button>
        </form>
        
      `;
    }
    if (studentAuthFlow.signupStep === 'otp') {
      return `
        <form id="studentSignupOtpForm" class="form-stack auth-step-form">
          <label class="field-label auth-label-muted"><input name="email" type="email" required autocomplete="email" value="${safeEsc(studentAuthFlow.email)}" /></label>
          <label class="field-label auth-label-muted"><input name="token" required inputmode="numeric" autocomplete="one-time-code" placeholder="Code" /></label>
          <button class="primary-btn" type="submit">Confirm</button>
          <button class="soft-btn" id="resendSignupOtp" type="button">Resend</button>
        </form>
      `;
    }
    return `
      <form id="studentSignupEmailForm" class="form-stack auth-step-form">
        <label class="field-label auth-label-muted"><input name="email" type="email" required autocomplete="email" placeholder="student@example.com" value="${safeEsc(studentAuthFlow.email || '')}" /></label>
        <button class="primary-btn" type="submit">Send code</button>
      </form>
      
    `;
  }

  window.renderStudentAuthFlow = function renderStudentAuthFlowSupabaseAuth() {
    const box = $('#studentAuthFlow');
    if (!box) return;
    const setupStatus = supabaseSetupStatus();
    const active = studentAuthFlow.mode === 'signup' ? 'signup' : 'signin';
    box.innerHTML = `
      <div class="auth-flow-card">
        
        ${setupStatus.ok ? '' : `
          <div class="auth-live-note warning">
            <b>Supabase is required</b>
            <span>${safeEsc(setupStatus.reason)}</span>
            <button class="soft-btn compact-config-btn" id="openAuthSupabaseSetup" type="button">Open Supabase setup</button>
          </div>
        `}
        <div class="auth-tabs two mini-auth-tabs" role="tablist" aria-label="Student access">
          <button class="auth-tab ${active === 'signin' ? 'active' : ''}" type="button" data-student-auth-mode="signin">Sign in</button>
          <button class="auth-tab ${active === 'signup' ? 'active' : ''}" type="button" data-student-auth-mode="signup">Create</button>
        </div>
        <div class="auth-pane active">
          ${active === 'signin' ? signinFormHtml() : signupFormHtml()}
        </div>
      </div>
    `;

    $('#openAuthSupabaseSetup')?.addEventListener('click', () => showCloudSetupModal({ allowPublicSetup: true, returnToAuth: true }));

    $$('[data-student-auth-mode]').forEach(tab => {
      tab.addEventListener('click', () => {
        studentAuthFlow.mode = tab.dataset.studentAuthMode === 'signup' ? 'signup' : 'signin';
        if (studentAuthFlow.mode === 'signin') studentAuthFlow.signupStep = 'email';
        renderStudentAuthFlow();
      });
    });

    $('#studentEmailSigninForm')?.addEventListener('submit', async event => {
      event.preventDefault();
      const form = event.currentTarget;
      try {
        setFormBusy(form, true, 'Signing in…');
        await signInWithEmailPassword(new FormData(form));
      } catch (err) {
        toast(friendlyAuthError(err));
        setFormBusy(form, false);
      }
    });

    $('#studentSignupEmailForm')?.addEventListener('submit', async event => {
      event.preventDefault();
      const form = event.currentTarget;
      try {
        setFormBusy(form, true, 'Sending code…');
        await sendSignupOtp(new FormData(form).get('email'));
      } catch (err) {
        toast(friendlyAuthError(err));
        setFormBusy(form, false);
      }
    });

    $('#studentSignupOtpForm')?.addEventListener('submit', async event => {
      event.preventDefault();
      const form = event.currentTarget;
      try {
        setFormBusy(form, true, 'Checking code…');
        const data = new FormData(form);
        await verifySignupOtp(data.get('email'), data.get('token'));
      } catch (err) {
        toast(friendlyAuthError(err));
        setFormBusy(form, false);
      }
    });

    $('#resendSignupOtp')?.addEventListener('click', async () => {
      try { await sendSignupOtp(studentAuthFlow.email); }
      catch (err) { toast(friendlyAuthError(err)); }
    });

    $('#studentSignupProfileForm')?.addEventListener('submit', async event => {
      event.preventDefault();
      const form = event.currentTarget;
      try {
        setFormBusy(form, true, 'Creating account…');
        await finishSignupProfile(new FormData(form));
      } catch (err) {
        toast(friendlyAuthError(err));
        setFormBusy(form, false);
      }
    });
  };

  window.showAuthModal = function showAuthModalSupabaseAuth(defaultTab = 'student') {
    const activeTab = defaultTab === 'admin' ? 'admin' : 'student';
    if (activeTab === 'student' && !studentAuthFlow.mode) studentAuthFlow.mode = 'signin';
    showModal(`
      <h2 id="modalTitle">Account access</h2>
      <div class="auth-tabs two" role="tablist" aria-label="Account access">
        <button class="auth-tab ${activeTab === 'student' ? 'active' : ''}" type="button" data-auth-tab="student">Student</button>
        <button class="auth-tab ${activeTab === 'admin' ? 'active' : ''}" type="button" data-auth-tab="admin">Admin</button>
      </div>
      <section id="studentAuthFlow" class="auth-pane ${activeTab === 'student' ? 'active' : ''}" data-auth-pane="student"></section>
      <form id="adminSigninForm" class="form-stack auth-form auth-pane ${activeTab === 'admin' ? 'active' : ''}" data-auth-pane="admin">
        <input name="name" required autocomplete="username" placeholder="Admin name" />
        <input name="code" required autocomplete="off" placeholder="Admin code" />
        <button class="primary-btn" type="submit">Unlock admin tools</button>
        <small class="security-note">Admin controls remain local owner tools. Students never see upload/edit buttons.</small>
      </form>
    `);

    $$('[data-auth-tab]').forEach(tab => {
      tab.addEventListener('click', () => {
        const id = tab.dataset.authTab;
        $$('[data-auth-tab]').forEach(t => t.classList.toggle('active', t.dataset.authTab === id));
        $$('[data-auth-pane]').forEach(pane => pane.classList.toggle('active', pane.dataset.authPane === id));
        if (id === 'student') renderStudentAuthFlow();
      });
    });

    renderStudentAuthFlow();

    $('#adminSigninForm')?.addEventListener('submit', event => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      const name = String(data.get('name') || '').trim();
      const code = String(data.get('code') || '').trim();
      const adminMatch = name.toLowerCase() === ADMIN_CREDENTIALS.name.toLowerCase() && code === ADMIN_CREDENTIALS.code;
      if (!adminMatch) { toast('Admin name or code is incorrect'); return; }
      setSession({ name: ADMIN_CREDENTIALS.name, role: 'admin' });
      state = loadState();
      closeModal();
      refreshAfterAccountChange();
      toast('Admin tools unlocked');
    });
  };

  window.showAccountModal = function showAccountModalSupabaseAuth() {
    showModal(`
      <h2 id="modalTitle">${safeEsc(currentUserName())}</h2>
      <p class="modal-muted">Current access: <b>${isAdmin() ? 'Admin — upload and content tools enabled' : 'Student — account connected to email'}</b></p>
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
    $('#logoutBtn')?.addEventListener('click', async () => {
      await pushStudentProgressToSupabase().catch(() => false);
      try {
        const client = typeof getSupabaseClient === 'function' ? getSupabaseClient() : null;
        if (client?.auth) await client.auth.signOut();
      } catch {}
      setSession(null);
      window.__novamedLiveExamCache = null;
      window.__novamedLiveExamRowId = null;
      window.__novamedSmartStudyPlanCache = null;
      window.__novamedSmartStudyPlanRowId = null;
      state = loadState();
      closeModal();
      refreshAfterAccountChange();
      navigate('learn');
      toast('Logged out. Student progress remains saved in Supabase.');
    });
    $('#upgradeAdmin')?.addEventListener('click', () => showAuthModal('admin'));
    $('#cloudSetupBtn')?.addEventListener('click', showCloudSetupModal);
    $('#viewProfileNow')?.addEventListener('click', () => { closeModal(); navigate('profile'); });
    $('#goAdminTools')?.addEventListener('click', () => {
      closeModal();
      navigate('qbank');
      resetQbankPath('modes');
    });
  };

  const originalLoadState = window.loadState;
  window.loadState = function loadStateSupabaseAuthAware() {
    const content = loadGlobalContent();
    const session = readJson(SESSION_KEY, null);
    const uiProgress = loadUiProgress();
    const base = {
      ...defaultState,
      ...publicProgressDefaults(),
      ...uiProgress,
      videos: content.videos,
      freeCourses: content.freeCourses,
      questions: content.questions,
      focusNotes: content.focusNotes,
      videoCourseTree: content.videoCourseTree,
      qbankCourseTree: content.qbankCourseTree,
      user: null
    };

    if (session?.role === 'admin') {
      return { ...base, xp: 1280, streak: 7, user: { name: ADMIN_CREDENTIALS.name, role: 'admin', signedAt: session.signedAt || new Date().toISOString() } };
    }

    if (session?.role === 'student') {
      return {
        ...base,
        user: {
          name: session.name || 'Student',
          email: session.email || '',
          studentKey: session.studentKey || session.supabaseId || '',
          role: 'student',
          supabaseId: session.supabaseId || session.studentKey || '',
          signedAt: session.signedAt || new Date().toISOString()
        }
      };
    }

    return base;
  };

  function leaderboardPlaceholder(text) {
    return `
      <article class="streak-player-row empty real-students-only">
        <span class="streak-rank-badge plain"><span class="streak-avatar">N</span><i>•</i></span>
        <div><b>No fake names</b><small>${safeEsc(text)}</small></div>
        <strong>0 XP</strong>
        <em>Real students only</em>
      </article>
    `;
  }

  async function fetchLeaderboardRows(options = {}) {
    const client = getSupabaseClient();
    if (!client) return [];
    const now = Date.now();
    if (!options.force && Array.isArray(leaderboardRowsCacheV140.rows) && now - leaderboardRowsCacheV140.at < 120000) {
      return leaderboardRowsCacheV140.rows;
    }
    if (leaderboardRowsCacheV140.inFlight) return leaderboardRowsCacheV140.inFlight;
    leaderboardRowsCacheV140.inFlight = client
      .from('student_public')
      .select('user_id,display_name,xp,streak,level,last_active_at')
      .eq('leaderboard_visible', true)
      .order('xp', { ascending: false })
      .order('last_active_at', { ascending: false })
      .limit(10)
      .then(({ data, error }) => {
        if (error) throw error;
        const rows = Array.isArray(data) ? data : [];
        leaderboardRowsCacheV140 = { rows, at: Date.now(), inFlight: null };
        return rows;
      })
      .catch(err => {
        leaderboardRowsCacheV140.inFlight = null;
        throw err;
      });
    return leaderboardRowsCacheV140.inFlight;
  }

  function renderLeaderboardRowsV140(board, rows = []) {
    if (!rows.length) {
      board.innerHTML = leaderboardPlaceholder('Real students will appear here as soon as they earn XP.');
      return;
    }
    board.innerHTML = rows.map((row, index) => {
      const rank = index + 1;
      const cls = rank === 1 ? 'first' : rank === 2 ? 'second' : rank === 3 ? 'third' : '';
      const name = normalizeStudentName(row.display_name || 'Student');
      const initial = (name[0] || 'S').toUpperCase();
      const xp = Number(row.xp || 0);
      const reward = rank === 1 ? 'Top student' : rank <= 3 ? 'Reward zone' : 'Active';
      const small = `${Number(row.streak || 0)} day streak • Level ${Number(row.level || 1)}`;
      return `
        <article class="streak-player-row ${cls}" data-real-student="1">
          <span class="streak-rank-badge ${rank > 3 ? 'plain' : ''}"><span class="streak-avatar">${safeEsc(initial)}</span><i>${rank}</i></span>
          <div><b>${safeEsc(name)}</b><small>${safeEsc(small)}</small></div>
          <strong>${xp.toLocaleString()} XP</strong>
          <em>${safeEsc(reward)}</em>
        </article>
      `;
    }).join('');
  }

  window.renderRealStreakLeaderboard = async function renderRealStreakLeaderboard(options = {}) {
    const board = document.querySelector('#screen-streak .streak-leaderboard');
    if (!board) return;
    if (!cloudConfigured()) {
      board.innerHTML = leaderboardPlaceholder('Connect Supabase to show registered students.');
      return;
    }
    // v142: the leaderboard is public-read only for visible rows. Guests can see the competition,
    // but only signed-in students can earn XP and join.
    if (Array.isArray(leaderboardRowsCacheV140.rows)) {
      renderLeaderboardRowsV140(board, leaderboardRowsCacheV140.rows);
      if (!options.force && Date.now() - leaderboardRowsCacheV140.at < 120000) return;
    } else {
      board.innerHTML = leaderboardPlaceholder('Loading registered students…');
    }

    try {
      const rows = await fetchLeaderboardRows(options);
      window.__novamedRealLeaderboardRowsCache = rows;
      renderLeaderboardRowsV140(board, rows);
    } catch (err) {
      console.warn('NovaMed real leaderboard failed:', err?.message || err);
      if (!Array.isArray(leaderboardRowsCacheV140.rows)) board.innerHTML = leaderboardPlaceholder('Could not load registered students yet. Run the public leaderboard RLS SQL if this persists.');
    }
  };

  const originalRefresh = window.refreshAfterAccountChange;
  window.refreshAfterAccountChange = function refreshAfterAccountChangeWithLeaderboard() {
    if (typeof originalRefresh === 'function') originalRefresh();
    renderRealStreakLeaderboard();
  };

  window.bindLeagueAndPartner = function bindLeagueAndPartnerRealStudents() {
    $$('[data-league-action]').forEach(btn => {
      if (btn.dataset.realLeagueBound === '1') return;
      btn.dataset.realLeagueBound = '1';
      btn.addEventListener('click', () => {
        const action = btn.dataset.leagueAction;
        if (action === 'join') {
          const name = isStudent() ? currentUserName() : 'your account';
          showModal(`
            <h2 id="modalTitle">Weekly league 🏆</h2>
            <p>${isStudent()
              ? `${safeEsc(name)} is counted in the weekly league. XP from videos, QBank, mistake review, and study sessions will update your real rank.`
              : 'Sign in first so your real account can appear in the weekly league.'}</p>
            <div style="display:grid;gap:9px;margin:16px 0">
              <div class="leader-row second"><span class="rank-medal">🏆</span><div><b>${safeEsc(name)}</b><small>${isStudent() ? 'Current real account' : 'Not signed in yet'}</small></div><strong>${Number(state.xp || 0).toLocaleString()} XP</strong><em>Real students only</em></div>
            </div>
            <button class="primary-btn" id="leagueClose">Continue</button>
          `);
          setTimeout(() => $('#leagueClose')?.addEventListener('click', closeModal), 0);
          renderRealStreakLeaderboard();
          return;
        }
        showModal(`
          <h2 id="modalTitle">League rules</h2>
          <p>Weekly ranking is based on real registered student XP only. No fake names are shown. XP can come from watching videos, solving QBank questions, reviewing mistakes, and completing focus sessions.</p>
          <ul class="wrong-list"><li>Correct MCQ: +18 XP</li><li>Wrong MCQ with review: +6 XP</li><li>Completed lecture: +40 XP</li><li>Daily streak claim: +100 XP</li></ul>
          <button class="primary-btn" id="rulesClose">Got it</button>
        `);
        setTimeout(() => $('#rulesClose')?.addEventListener('click', closeModal), 0);
      });
    });

    $$('[data-partner-action]').forEach(btn => {
      if (btn.dataset.realPartnerBound === '1') return;
      btn.dataset.realPartnerBound = '1';
      btn.addEventListener('click', () => {
        const action = btn.dataset.partnerAction;
        const content = {
          'start-room': ['Focus room preview', 'This will become a shared study room where registered students open the same topic, start the same timer, and compare XP after the session.'],
          timer: ['Shared timer preview', 'A synchronized 25-minute timer is useful because it creates commitment without distracting students during study.'],
          partner: ['Partner invite preview', 'This can later invite a friend, assign a shared goal, and show whether both students completed today’s task.']
        }[action] || ['Study Partner', 'This feature is ready as a placeholder for the next design step.'];
        showModal(`
          <h2 id="modalTitle">${safeEsc(content[0])}</h2>
          <p>${safeEsc(content[1])}</p>
          <div style="height:132px;border-radius:24px;background:linear-gradient(135deg,rgba(86,227,159,.95),rgba(62,232,255,.82),rgba(79,140,255,.72));display:grid;place-items:center;margin:16px 0;color:#061226;font-size:44px;font-weight:1000;">🤝</div>
          <button class="primary-btn" id="partnerClose">Nice</button>
        `);
        setTimeout(() => $('#partnerClose')?.addEventListener('click', closeModal), 0);
      });
    });

    renderRealStreakLeaderboard();
  };

  const originalInit = window.init;
  window.init = function initSupabaseAuthStudents() {
    cleanupPhase2ALocalKeys();
    if (typeof originalInit === 'function') originalInit();
    bindProfileWorkspaceClickGuardV143();
    normalizeProfileWorkspaceShellV143();
    queueLiveUiRefreshV143('app-init', { leaderboard: true, delay: 120 });
    renderRealStreakLeaderboard();
    window.syncSimpleStudentProfileOnBoot?.();
  };
})();
