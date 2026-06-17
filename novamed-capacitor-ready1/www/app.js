/* NovaMed v84 - Safe modular bootstrap. State is initialized after all domain modules are loaded. */
let state = loadState();
let mistakeView = { level: 'courses', course: null, system: null, topic: null };

/* NovaMed v83 - App bootstrap only. Feature code is split into domain files. */
document.addEventListener('DOMContentLoaded', () => setTimeout(initHomeWidgetSettingsV80, 350));


document.addEventListener('DOMContentLoaded', () => setTimeout(initFeatureLayerV79, 250));


document.addEventListener('DOMContentLoaded', () => { ensureSupplementalMcqsV73(); init(); });



/* v91: Streak timer to Friday night reset + active cup entrance animation */
function getNextFridayNightResetV91(now = new Date()) {
  const reset = new Date(now);
  reset.setHours(24, 0, 0, 0); // next local midnight
  // End of Friday night = Saturday 00:00 local time.
  const daysUntilSaturday = (6 - reset.getDay() + 7) % 7;
  reset.setDate(reset.getDate() + daysUntilSaturday);
  if (reset <= now) reset.setDate(reset.getDate() + 7);
  return reset;
}

function formatStreakResetRemainingV91(ms) {
  const totalMinutes = Math.max(0, Math.floor(ms / 60000));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${Math.max(1, minutes)}m`;
}

function updateStreakResetTimerV91() {
  const label = document.querySelector('#screen-streak .streak-reset-badge b');
  const small = document.querySelector('#screen-streak .streak-reset-badge small');
  if (!label) return;
  const now = new Date();
  const reset = getNextFridayNightResetV91(now);
  label.textContent = formatStreakResetRemainingV91(reset - now);
  label.setAttribute('title', `Resets Friday night: ${reset.toLocaleString()}`);
  if (small) small.textContent = 'FRIDAY RESET';
}

function animateStreakScreenV91() {
  const screen = document.getElementById('screen-streak');
  if (!screen) return;
  screen.classList.remove('streak-enter');
  void screen.offsetWidth;
  screen.classList.add('streak-enter');
  const activeCup = screen.querySelector('.streak-cup-card.active, .streak-cup-card[aria-current="step"]');
  if (activeCup && window.matchMedia('(max-width: 760px)').matches) {
    // Prevent Safari from horizontally shifting the Streak arena.
  }
  window.setTimeout(() => screen.classList.remove('streak-enter'), 1200);
}

function initStreakV91() {
  updateStreakResetTimerV91();
  window.setInterval(updateStreakResetTimerV91, 60000);
  document.querySelectorAll('[data-nav="streak"]').forEach(btn => {
    btn.addEventListener('click', () => {
      setTimeout(() => {
        updateStreakResetTimerV91();
        animateStreakScreenV91();
      }, 80);
    });
  });
  if (document.getElementById('screen-streak')?.classList.contains('active')) {
    setTimeout(animateStreakScreenV91, 120);
  }
}

document.addEventListener('DOMContentLoaded', () => setTimeout(initStreakV91, 450));


/* v93: Streak current cup toggle */
function initStreakCupToggleV93() {
  const screen = document.getElementById('screen-streak');
  if (!screen) return;
  const road = screen.querySelector('.streak-cup-road');
  const activeCup = screen.querySelector('.streak-cup-card.active, .streak-cup-card[aria-current="step"]');
  if (!road || !activeCup) return;

  if (!screen.querySelector('.streak-cup-road-hint-v93')) {
    const hint = document.createElement('div');
    hint.className = 'streak-cup-road-hint-v93';
    hint.textContent = 'Tap the current cup to show previous and locked cups';
    road.insertAdjacentElement('afterend', hint);
  }

  screen.classList.remove('streak-cups-expanded');
  activeCup.setAttribute('role', 'button');
  activeCup.setAttribute('tabindex', '0');
  activeCup.setAttribute('aria-expanded', 'false');

  const toggle = () => {
    const expanded = screen.classList.toggle('streak-cups-expanded');
    activeCup.setAttribute('aria-expanded', String(expanded));
    const hint = screen.querySelector('.streak-cup-road-hint-v93');
    if (hint) hint.textContent = expanded ? 'Tap the current cup again to hide cups' : 'Tap the current cup to show previous and locked cups';
  };

  if (!activeCup.dataset.streakCupToggleBound) {
    activeCup.dataset.streakCupToggleBound = '1';
    activeCup.addEventListener('click', toggle);
    activeCup.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        toggle();
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', () => setTimeout(initStreakCupToggleV93, 650));


/* v94: Open previous/locked cups inside a separate rectangular panel */
function initStreakCupToggleV93() {
  const screen = document.getElementById('screen-streak');
  if (!screen) return;
  const road = screen.querySelector('.streak-cup-road');
  const activeCup = screen.querySelector('.streak-cup-card.active, .streak-cup-card[aria-current="step"]');
  if (!road || !activeCup) return;

  screen.querySelectorAll('.streak-cup-road-hint-v93').forEach(el => el.remove());

  let panel = screen.querySelector('.streak-cup-history-panel-v94');
  if (!panel) {
    panel = document.createElement('div');
    panel.className = 'streak-cup-history-panel-v94';
    panel.innerHTML = `
      <div class="streak-cup-history-title-v94">
        <b>Cup progress</b>
        <small>Previous cups and locked ranks</small>
      </div>
    `;
    const otherCups = Array.from(road.querySelectorAll('.streak-cup-card'))
      .filter(card => card !== activeCup)
      .map(card => {
        const clone = card.cloneNode(true);
        clone.removeAttribute('aria-current');
        clone.removeAttribute('role');
        clone.removeAttribute('tabindex');
        clone.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
        return clone;
      });
    otherCups.forEach(card => panel.appendChild(card));
    road.insertAdjacentElement('afterend', panel);
  }

  screen.classList.remove('streak-cups-expanded');
  activeCup.setAttribute('role', 'button');
  activeCup.setAttribute('tabindex', '0');
  activeCup.setAttribute('aria-expanded', 'false');

  const toggle = () => {
    const expanded = screen.classList.toggle('streak-cups-expanded');
    activeCup.setAttribute('aria-expanded', String(expanded));
  };

  if (!activeCup.dataset.streakCupPanelBoundV94) {
    activeCup.dataset.streakCupPanelBoundV94 = '1';
    activeCup.addEventListener('click', toggle);
    activeCup.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        toggle();
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', () => setTimeout(initStreakCupToggleV93, 700));


/* v95: Open cups in a modal/window with horizontal scroll */
function getRankTypeFromCard(card) {
  if (!card) return "bronze";
  if (card.classList.contains('diamond')) return "diamond";
  if (card.classList.contains('gold')) return "gold";
  if (card.classList.contains('silver')) return "silver";
  return "bronze";
}

function getRankIconSvg(type) {
  const icons = {
    bronze: `
      <svg viewBox="0 0 120 120" class="rank-icon-svg bronze" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="bronzeMetal" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#FFD1A3"/>
            <stop offset="40%" stop-color="#D08A45"/>
            <stop offset="75%" stop-color="#9C5A2E"/>
            <stop offset="100%" stop-color="#693619"/>
          </linearGradient>
          <radialGradient id="bronzeGlow" cx="35%" cy="28%" r="72%">
            <stop offset="0%" stop-color="#FFF2E1" stop-opacity=".95"/>
            <stop offset="42%" stop-color="#FFD2A8" stop-opacity=".58"/>
            <stop offset="100%" stop-color="#7A4220" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <path d="M30 20h18l12 24-16 12-14-36Zm60 0H72L60 44l16 12 14-36Z" fill="url(#bronzeMetal)" opacity=".95"/>
        <circle cx="60" cy="64" r="26" fill="url(#bronzeMetal)" stroke="#f6d0aa" stroke-width="3"/>
        <circle cx="60" cy="64" r="18" fill="none" stroke="rgba(255,245,230,.55)" stroke-width="3"/>
        <path d="M48 88h24l7 18H41l7-18Z" fill="url(#bronzeMetal)"/>
        <rect x="46" y="95" width="28" height="6" rx="3" fill="#5e3118" opacity=".4"/>
        <ellipse cx="60" cy="57" rx="18" ry="14" fill="url(#bronzeGlow)" opacity=".5"/>
      </svg>`,
    silver: `
      <svg viewBox="0 0 120 120" class="rank-icon-svg silver" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="silverMetal" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#F4F7FA"/>
            <stop offset="42%" stop-color="#C7D0D9"/>
            <stop offset="78%" stop-color="#AEB7C2"/>
            <stop offset="100%" stop-color="#7D8793"/>
          </linearGradient>
          <radialGradient id="silverGlow" cx="40%" cy="24%" r="70%">
            <stop offset="0%" stop-color="#FFFFFF" stop-opacity=".96"/>
            <stop offset="55%" stop-color="#E8EEF5" stop-opacity=".35"/>
            <stop offset="100%" stop-color="#AEB7C2" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <path d="M60 12 95 28v28c0 24-15 40-35 52C40 96 25 80 25 56V28l35-16Z" fill="url(#silverMetal)" stroke="#ffffff" stroke-opacity=".35" stroke-width="2.5"/>
        <path d="M60 24 83 34v20c0 17-9 29-23 39C46 83 37 71 37 54V34l23-10Z" fill="none" stroke="rgba(255,255,255,.34)" stroke-width="3"/>
        <path d="M60 38l6 12 13 2-9 9 2 13-12-6-12 6 2-13-9-9 13-2 6-12Z" fill="#ffffff" opacity=".88"/>
        <ellipse cx="56" cy="34" rx="18" ry="10" fill="url(#silverGlow)" opacity=".55"/>
      </svg>`,
    gold: `
      <svg viewBox="0 0 120 120" class="rank-icon-svg gold" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="goldMetal" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#FFF1A8"/>
            <stop offset="32%" stop-color="#FFD76A"/>
            <stop offset="68%" stop-color="#E8AA33"/>
            <stop offset="100%" stop-color="#C88719"/>
          </linearGradient>
          <radialGradient id="goldGlow" cx="38%" cy="20%" r="72%">
            <stop offset="0%" stop-color="#FFFBE3" stop-opacity="1"/>
            <stop offset="48%" stop-color="#FFE48A" stop-opacity=".55"/>
            <stop offset="100%" stop-color="#C88719" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <path d="M36 30h48l8 14v30c0 14-16 24-32 32-16-8-32-18-32-32V44l8-14Z" fill="url(#goldMetal)" stroke="#fff1b0" stroke-width="2.4"/>
        <path d="M45 48h30v16H45z" fill="rgba(255,247,196,.45)"/>
        <path d="M36 34c-8 0-14 4-14 10 0 10 10 18 22 18V50c-6 0-10-4-10-8 0-3 3-5 7-5h-5Zm48 0c8 0 14 4 14 10 0 10-10 18-22 18V50c6 0 10-4 10-8 0-3-3-5-7-5h5Z" fill="url(#goldMetal)"/>
        <rect x="44" y="84" width="32" height="10" rx="5" fill="#a66b13" opacity=".95"/>
        <rect x="38" y="94" width="44" height="10" rx="5" fill="url(#goldMetal)"/>
        <ellipse cx="60" cy="42" rx="22" ry="12" fill="url(#goldGlow)" opacity=".6"/>
      </svg>`,
    diamond: `
      <svg viewBox="0 0 120 120" class="rank-icon-svg diamond" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="diamondA" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#E7FBFF"/>
            <stop offset="25%" stop-color="#7EEBFF"/>
            <stop offset="68%" stop-color="#36D8FF"/>
            <stop offset="100%" stop-color="#1976D2"/>
          </linearGradient>
          <linearGradient id="diamondB" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#0E315F"/>
            <stop offset="100%" stop-color="#73E7FF"/>
          </linearGradient>
        </defs>
        <path d="M34 44 49 24h22l15 20-26 52-26-52Z" fill="url(#diamondA)" stroke="#d9fbff" stroke-opacity=".55" stroke-width="2"/>
        <path d="M34 44h52L60 96 34 44Z" fill="url(#diamondB)" opacity=".42"/>
        <path d="M49 24 60 44 71 24" fill="none" stroke="rgba(255,255,255,.62)" stroke-width="2"/>
        <path d="M34 44h52" stroke="rgba(255,255,255,.46)" stroke-width="2"/>
        <path d="M49 24 34 44M71 24 86 44M60 44 60 96" stroke="rgba(255,255,255,.3)" stroke-width="2"/>
        <circle cx="49" cy="38" r="4" fill="#ffffff" opacity=".75"/>
      </svg>`
  };
  return icons[type] || icons.bronze;
}

function createRankMetalBadge(type, isLocked) {
  return `
    <span class="rank-metal-badge rank-${type}${isLocked ? ' is-locked' : ''}" aria-hidden="true">
      <span class="rank-metal-backdrop"></span>
      <span class="rank-metal-core">${getRankIconSvg(type)}</span>
      ${isLocked ? '<span class="rank-metal-lock">🔒</span>' : ''}
      <span class="rank-metal-shimmer"></span>
    </span>`;
}

function createStreakCupModalIconV100(type) {
  const cupSvg = (palette) => `
    <svg viewBox="0 0 96 96" class="streak-rank-icon-svg ${type}" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="${type}-cup-main" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${palette[0]}"/>
          <stop offset="55%" stop-color="${palette[1]}"/>
          <stop offset="100%" stop-color="${palette[2]}"/>
        </linearGradient>
        <radialGradient id="${type}-cup-glow" cx="35%" cy="25%" r="70%">
          <stop offset="0%" stop-color="${palette[3]}" stop-opacity="0.95"/>
          <stop offset="55%" stop-color="${palette[0]}" stop-opacity="0.28"/>
          <stop offset="100%" stop-color="${palette[2]}" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <g fill="url(#${type}-cup-main)">
        <path d="M30 18h36v7c0 14-8 24-18 31-10-7-18-17-18-31v-7Z"/>
        <path d="M25 23c-9 0-13 4-13 10 0 10 10 17 22 17v-8c-7 0-13-4-13-9 0-2 1-4 4-5Zm46 0c9 0 13 4 13 10 0 10-10 17-22 17v-8c7 0 13-4 13-9 0-2-1-4-4-5Z"/>
        <rect x="41" y="49" width="14" height="10" rx="4"/>
        <rect x="35" y="59" width="26" height="7" rx="3.5"/>
        <rect x="29" y="66" width="38" height="10" rx="4"/>
      </g>
      <path d="M35 21h26c0 11-6 19-13 24-7-5-13-13-13-24Z" fill="url(#${type}-cup-glow)"/>
      <path d="M34 26c4-3 8-5 14-5 6 0 10 2 14 5" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="3" stroke-linecap="round"/>
      <ellipse cx="42" cy="28" rx="8" ry="4" fill="rgba(255,255,255,.26)"/>
    </svg>`;

  const diamondSvg = `
    <svg viewBox="0 0 96 96" class="streak-rank-icon-svg diamond" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="diamond-main-v100" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#E8FBFF"/>
          <stop offset="26%" stop-color="#7DEBFF"/>
          <stop offset="62%" stop-color="#3AD8FF"/>
          <stop offset="100%" stop-color="#1F78D4"/>
        </linearGradient>
        <linearGradient id="diamond-shadow-v100" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#092C4A"/>
          <stop offset="100%" stop-color="#5CE5FF"/>
        </linearGradient>
      </defs>
      <path d="M28 35 40 22h16l12 13-20 38-20-38Z" fill="url(#diamond-main-v100)" stroke="rgba(232,251,255,.52)" stroke-width="2.2"/>
      <path d="M28 35h40L48 73 28 35Z" fill="url(#diamond-shadow-v100)" opacity=".42"/>
      <path d="M40 22 48 35 56 22" fill="none" stroke="rgba(255,255,255,.62)" stroke-width="2"/>
      <path d="M28 35h40" stroke="rgba(255,255,255,.44)" stroke-width="2"/>
      <path d="M40 22 28 35M56 22 68 35M48 35v38" stroke="rgba(255,255,255,.24)" stroke-width="2"/>
    </svg>`;

  if (type === 'diamond') {
    return `<span class="streak-rank-icon-wrap diamond">${diamondSvg}<span class="streak-rank-lock-mini" aria-hidden="true">🔒</span></span>`;
  }

  const palettes = {
    bronze: ['#F6B46D', '#D48247', '#9A5737', '#FDE3C3'],
    silver: ['#F3F7FA', '#CCD5E0', '#8893A1', '#FFFFFF'],
    gold: ['#FFE27D', '#D9A031', '#B87516', '#FFF4BA']
  };

  return `<span class="streak-rank-icon-wrap ${type}">${cupSvg(palettes[type] || palettes.bronze)}</span>`;
}

function buildStreakCupModalCardsV95() {
  const road = document.querySelector('#screen-streak .streak-cup-road');
  if (!road) return '';
  return Array.from(road.querySelectorAll(':scope > .streak-cup-card')).map(card => {
    const rankType = getRankTypeFromCard(card);
    const isActive = card.classList.contains('active') || card.getAttribute('aria-current') === 'step';
    const isLocked = card.classList.contains('locked');
    const isPassed = card.classList.contains('passed');
    const title = card.querySelector('b')?.textContent?.trim() || rankType.charAt(0).toUpperCase() + rankType.slice(1);
    const status = card.querySelector('small')?.textContent?.trim() || (isLocked ? 'Locked' : isActive ? 'Current cup' : 'Passed');
    const badge = card.querySelector('em')?.textContent?.trim() || (isActive ? 'ACTIVE' : '');
    const classes = ['streak-cup-card','streak-modal-rank-card-v100', rankType];
    if (isActive) classes.push('active');
    if (isLocked) classes.push('locked');
    if (isPassed) classes.push('passed');
    return `
      <article class="${classes.join(' ')}" ${isActive ? 'aria-current="step"' : ''}>
        ${createStreakCupModalIconV100(rankType)}
        <b>${title}</b>
        <small>${status}</small>
        ${badge ? `<em>${badge}</em>` : ''}
      </article>`;
  }).join('');
}

function openStreakCupsModalV95() {
  if (typeof showModal !== 'function') return;
  const cards = buildStreakCupModalCardsV95();
  showModal(`
    <div class="streak-cups-modal-v95">
      <div class="streak-cups-modal-head-v95">
        <span class="eyebrow">Cup progression</span>
        <h2>Your weekly cups</h2>
        <p>Review your passed cups, your current cup, and locked ranks.</p>
      </div>
      <div class="streak-cups-scroll-v95" aria-label="Cup progression carousel">
        ${cards}
      </div>
      <div class="streak-cups-modal-note-v95">
        <span><b>Current:</b> Gold cup</span>
        <span>Passed • Current • Locked</span>
      </div>
    </div>
  `);
  document.querySelector('#modalBackdrop .modal-card')?.classList.add('streak-cups-modal-card-v95');
  setTimeout(() => {
    const current = document.querySelector('#modalBackdrop .streak-cups-scroll-v95 .streak-cup-card.active, #modalBackdrop .streak-cups-scroll-v95 .streak-cup-card[aria-current="step"]');
    current?.scrollIntoView({ behavior:'smooth', block:'nearest', inline:'center' });
  }, 60);
}

function initStreakCupModalV95() {
  const screen = document.getElementById('screen-streak');
  if (!screen) return;
  const activeCup = screen.querySelector('.streak-cup-card.active, .streak-cup-card[aria-current="step"]');
  if (!activeCup) return;

  screen.classList.remove('streak-cups-expanded');
  screen.querySelectorAll('.streak-cup-history-panel-v94,.streak-cup-road-hint-v93').forEach(el => el.remove());

  activeCup.setAttribute('role', 'button');
  activeCup.setAttribute('tabindex', '0');
  activeCup.setAttribute('aria-label', 'Open cup progression');

  if (!activeCup.dataset.streakCupModalBoundV95) {
    activeCup.dataset.streakCupModalBoundV95 = '1';

    activeCup.addEventListener('click', event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      openStreakCupsModalV95();
    }, true);

    activeCup.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        event.stopImmediatePropagation();
        openStreakCupsModalV95();
      }
    }, true);
  }
}

document.addEventListener('DOMContentLoaded', () => setTimeout(initStreakCupModalV95, 850));

/* v110: Profile review tools open in the same full modal style as MCQ player.
   This moves the existing adminPanel into the global modal instead of rendering it under Profile. */
(function(){
  const PROFILE_MODAL_CLASS_V110 = 'profile-workspace-modal-card-v110';
  const PANEL_EMBED_CLASS_V110 = 'profile-workspace-embedded-v110';
  const managedTabsV110 = new Set(['mistakes', 'flashcards', 'bookmarks', 'analytics', 'adminDashboard']);
  let profileWorkspaceMountV110 = null;
  let profileWorkspaceOriginalParentV110 = null;
  let profileWorkspaceOriginalNextV110 = null;

  function profileWorkspaceTitleV110(id){
    return ({
      mistakes:'My Mistakes',
      flashcards:'Flashcards',
      bookmarks:'Bookmarks',
      analytics:'Analytics',
      adminDashboard:'Admin dashboard'
    })[id] || 'Profile workspace';
  }

  function cleanModalVariantV110(){
    const card = document.querySelector('#modalBackdrop .modal-card');
    if (!card) return;
    card.classList.remove('free-courses-modal-card', 'free-course-watch-card', 'qbank-set-modal-card', 'real-exam-modal-card', PROFILE_MODAL_CLASS_V110);
  }

  function renderProfileWorkspaceTabV110(id){
    document.querySelectorAll('.admin-tab').forEach(tab => tab.classList.toggle('active', tab.id === id));
    if (typeof ensureStudyFeatureState === 'function') ensureStudyFeatureState();
    if (id === 'mistakes' && typeof renderMistakes === 'function') renderMistakes();
    if (id === 'analytics' && typeof renderAnalytics === 'function') renderAnalytics();
    if (id === 'flashcards' && typeof renderFlashcards === 'function') renderFlashcards();
    if (id === 'bookmarks' && typeof renderBookmarksPanel === 'function') renderBookmarksPanel();
    if (id === 'adminDashboard' && typeof renderAdminDashboardV79 === 'function') renderAdminDashboardV79();
  }

  function restoreProfileWorkspacePanelV110(){
    const panel = document.getElementById('adminPanel');
    if (!panel || !profileWorkspaceOriginalParentV110) return;
    panel.classList.remove('profile-workspace-open-v109', PANEL_EMBED_CLASS_V110);
    panel.style.display = '';
    const oldChrome = panel.querySelector('.profile-workspace-chrome-v109');
    if (oldChrome) oldChrome.remove();
    if (profileWorkspaceOriginalNextV110 && profileWorkspaceOriginalNextV110.parentNode === profileWorkspaceOriginalParentV110) {
      profileWorkspaceOriginalParentV110.insertBefore(panel, profileWorkspaceOriginalNextV110);
    } else {
      profileWorkspaceOriginalParentV110.appendChild(panel);
    }
    profileWorkspaceMountV110 = null;
    profileWorkspaceOriginalParentV110 = null;
    profileWorkspaceOriginalNextV110 = null;
    document.body.classList.remove('profile-workspace-active-v109', 'profile-workspace-active-v110');
  }

  function rebuildProfileWorkspacePanelV144(){
    let panel = document.getElementById('adminPanel');
    if (panel) return panel;
    const profileScreen = document.getElementById('screen-profile');
    if (!profileScreen) return null;
    panel = document.createElement('div');
    panel.className = 'admin-panel premium-card';
    panel.id = 'adminPanel';
    panel.innerHTML = `
      <div class="admin-tab active" id="mistakes"><div class="mistakes-head"><div><span class="eyebrow">Review Center</span><h2>My Mistakes</h2><p>Mistakes are grouped by course, system, and lecture.</p></div><button class="soft-btn small" id="clearReviewedMistakes" type="button">Refresh list</button></div><div class="mistake-stats-grid" id="mistakeStatsGrid"></div><div class="mistakes-list" id="mistakesList"></div></div>
      <div class="admin-tab" id="analytics"><div class="analytics-smart-dashboard" id="analyticsDashboard"></div></div>
      <div class="admin-tab" id="flashcards"><div class="flashcards-smart-panel" id="flashcardsPanel"></div></div>
      <div class="admin-tab" id="bookmarks"><div class="bookmarks-panel" id="bookmarksPanel"></div></div>
      <div class="admin-tab admin-only" id="adminDashboard"><div class="admin-dashboard-panel" id="adminDashboardPanel"></div></div>
    `;
    profileScreen.appendChild(panel);
    try { if (typeof bindAdminTabs === 'function') bindAdminTabs(); } catch {}
    return panel;
  }

  function openProfileWorkspaceModalV110(id){
    window.normalizeProfileWorkspaceShellV143?.();
    const panel = rebuildProfileWorkspacePanelV144();
    if (!panel) { if (typeof showToast === 'function') showToast('Profile tools are loading. Try again.'); return; }
    restoreProfileWorkspacePanelV110();
    profileWorkspaceOriginalParentV110 = panel.parentNode;
    profileWorkspaceOriginalNextV110 = panel.nextSibling;
    renderProfileWorkspaceTabV110(id);

    cleanModalVariantV110();
    if (typeof showModal === 'function') {
      showModal(`
        <section class="profile-modal-shell-v110" aria-label="${typeof esc === 'function' ? esc(profileWorkspaceTitleV110(id)) : profileWorkspaceTitleV110(id)}">
          <div class="profile-modal-head-v110">
            <div>
              <span class="eyebrow">Profile workspace</span>
              <h2 id="modalTitle">${typeof esc === 'function' ? esc(profileWorkspaceTitleV110(id)) : profileWorkspaceTitleV110(id)}</h2>
            </div>
          </div>
          <div id="profileWorkspaceMountV110" class="profile-modal-mount-v110"></div>
        </section>
      `);
    }
    let card = document.querySelector('#modalBackdrop .modal-card');
    if (card) {
      cleanModalVariantV110();
      card.classList.add(PROFILE_MODAL_CLASS_V110);
    }
    profileWorkspaceMountV110 = document.getElementById('profileWorkspaceMountV110');
    if (!profileWorkspaceMountV110) return;
    panel.classList.remove('profile-workspace-open-v109');
    panel.classList.add(PANEL_EMBED_CLASS_V110);
    panel.style.display = 'block';
    profileWorkspaceMountV110.appendChild(panel);
    document.body.classList.add('profile-workspace-active-v110');
    card?.scrollTo?.({ top: 0, behavior: 'instant' });
    document.getElementById('modalBackdrop')?.scrollTo?.({ top: 0, behavior: 'instant' });
  }

  // v144: If a nested modal is opened from inside My Mistakes / Flashcards /
  // Bookmarks / Analytics, restore the real #adminPanel before showModal()
  // replaces #modalContent. Without this guard, the moved adminPanel can be
  // destroyed by innerHTML, so future Profile cards appear clickable but do nothing.
  const oldShowModalV144 = window.showModal;
  window.showModal = function showModalProfileWorkspaceSafeV144(html){
    const raw = String(html || '');
    const isProfileWorkspaceShell = raw.includes('profileWorkspaceMountV110') || raw.includes('profile-modal-shell-v110');
    if (!isProfileWorkspaceShell) {
      const workspaceIsMounted = Boolean(
        document.body.classList.contains('profile-workspace-active-v110') ||
        document.querySelector('#profileWorkspaceMountV110 #adminPanel') ||
        document.querySelector('#modalBackdrop .profile-workspace-embedded-v110')
      );
      if (workspaceIsMounted) {
        try { restoreProfileWorkspacePanelV110(); } catch (err) { console.warn('NovaMed v144 profile workspace pre-modal restore failed:', err?.message || err); }
        document.body.classList.remove('profile-workspace-active-v109', 'profile-workspace-active-v110');
      }
    }
    if (typeof oldShowModalV144 === 'function') return oldShowModalV144.apply(this, arguments);
  };

  const oldCloseModalV110 = window.closeModal;
  window.closeModal = function closeModalV110(){
    try { restoreProfileWorkspacePanelV110(); } catch (err) { console.warn('NovaMed profile workspace restore failed:', err?.message || err); }
    document.body.classList.remove('profile-workspace-active-v109', 'profile-workspace-active-v110');
    if (typeof oldCloseModalV110 === 'function') return oldCloseModalV110.apply(this, arguments);
  };

  window.showAdminTab = function showAdminTabV110(id){
    if (managedTabsV110.has(id)) {
      openProfileWorkspaceModalV110(id);
      return;
    }
    renderProfileWorkspaceTabV110(id);
  };


  document.addEventListener('click', event => {
    const btn = event.target?.closest?.('[data-admin-tab]');
    if (!btn) return;
    const id = btn.dataset.adminTab;
    if (!managedTabsV110.has(id)) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
    openProfileWorkspaceModalV110(id);
  }, true);

  window.openProfileWorkspaceModalV110 = openProfileWorkspaceModalV110;
  window.restoreProfileWorkspacePanelV110 = restoreProfileWorkspacePanelV110;
})();


/* v113: profile workspace navigation safety. Close My Mistakes/Flashcards/Bookmarks modal before navigating. */
(function(){
  if (window.__profileWorkspaceNavFixV113) return;
  window.__profileWorkspaceNavFixV113 = true;
  document.addEventListener('click', function(event){
    const btn = event.target && event.target.closest ? event.target.closest('#modalBackdrop .profile-workspace-modal-card-v110 [data-nav="qbank"]') : null;
    if (!btn) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation && event.stopImmediatePropagation();
    if (typeof closeModal === 'function') closeModal();
    setTimeout(function(){ if (typeof navigate === 'function') navigate('qbank'); }, 40);
  }, true);
})();
