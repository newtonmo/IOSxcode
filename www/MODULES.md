# NovaMed modular structure (v84)

This version keeps the app split into domain files while preserving the original global loading order.

Load order in index.html:
1. supabase-config.js
2. Supabase CDN
3. supabase.js — defaults, storage, cloud helpers, load/save helpers
4. profile.js — profile, auth, Home, to-do, navigation/modals
5. videos.js — Video Bank, Free Courses, video player/resources
6. qbank.js — QBank, MCQ player, mistakes base flow
7. exam.js — Exam Mode, Live Exam, Analytics, Smart Review
8. ui.js — Search, Bookmarks, Daily Question, Admin Dashboard, Home widgets
9. flashcards.js — system-based flashcards and video cleanup overrides
10. app.js — final bootstrap only

Important v84 fix:
`state = loadState()` is intentionally initialized in `app.js`, after all module normalizers are loaded.


## V120 patch
- Restored Profile auth card as Sign in / Sign up.
- Made Sync card admin-only.
- Updated admin code to 12344321.
- Kept V119 bottom navigation polish.
- Did not change Home, Videos, or QBank.
