const CACHE_NAME = 'novamed-v152-profile-no-rectangles-auth-clean';
const ASSETS = [
  './',
  './index.html',
  './supabase-config.js?v=novamed-v152-profile-no-rectangles-auth-clean',
  './supabase-sdk-fallback-v145.js?v=novamed-v152-profile-no-rectangles-auth-clean',
  './styles.css?v=novamed-v152-profile-no-rectangles-auth-clean',
  './supabase.js?v=novamed-v152-profile-no-rectangles-auth-clean',
  './profile.js?v=novamed-v152-profile-no-rectangles-auth-clean',
  './videos.js?v=novamed-v152-profile-no-rectangles-auth-clean',
  './qbank.js?v=novamed-v152-profile-no-rectangles-auth-clean',
  './exam.js?v=novamed-v152-profile-no-rectangles-auth-clean',
  './ui.js?v=novamed-v152-profile-no-rectangles-auth-clean',
  './flashcards.js?v=novamed-v152-profile-no-rectangles-auth-clean',
  './student-auth-cloud.js?v=novamed-v152-profile-no-rectangles-auth-clean',
  './app.js?v=novamed-v152-profile-no-rectangles-auth-clean',
  './stability-patch-v145.js?v=novamed-v152-profile-no-rectangles-auth-clean',
  './study-plan.js?v=novamed-v152-profile-no-rectangles-auth-clean',
  './data/qbank/index.json',
  './data/qbank/medicine/Cardio/arrhythmia.json',
  './data/qbank/medicine/Cardio/congenital-heart-diseases.json',
  './data/qbank/medicine/Cardio/modern-explanation-demo.json',
  './data/qbank/medicine/Respiratory/asthma.json',
  './manifest.webmanifest',
  './assets/icon.png',
  './assets/apple-touch-icon.png',
  './assets/logo-mark.png',
  './assets/mascot.svg'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

function isMediaRequest(request) {
  const url = new URL(request.url);
  const accept = request.headers.get('accept') || '';
  const path = url.pathname.toLowerCase();
  return request.headers.has('range') ||
    request.destination === 'video' ||
    request.destination === 'audio' ||
    accept.includes('video/') ||
    accept.includes('audio/') ||
    /\.(mp4|m4v|mov|webm|m3u8|ts|mpd)(\?|$)/i.test(path) ||
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('supabase.in');
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // Critical for video: never let the PWA cache layer touch Range/media requests.
  // The browser must talk directly to Supabase/CDN so seeking and buffering stay fast.
  if (isMediaRequest(request)) {
    event.respondWith(fetch(request));
    return;
  }

  // Always fetch config/app fresh first. This prevents a published site from keeping
  // an old empty supabase-config.js and falling back to local-only student accounts.
  if (/\/(supabase-config|supabase|supabase-sdk-fallback-v145|profile|qbank|exam|ui|flashcards|student-auth-cloud|stability-patch-v145|app)\.js$/i.test(url.pathname)) {
    event.respondWith(fetch(request).catch(() => caches.match(request)));
    return;
  }

  event.respondWith(caches.match(request).then(cached => cached || fetch(request)));
});

// v112-free-courses: external free courses library with admin-managed chapters, lectures, and downloadable files

// v122: QBank high-yield guided notes without touching other screens

// v128: high-yield folder card alignment polish; light mode visual polish retained.

// v129: balanced light shadows, gold CTAs, compact Free Courses tab, and clean logo branding.
