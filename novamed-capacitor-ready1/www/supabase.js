/* NovaMed v83 - Supabase, storage, default data, state bootstrap, and cloud/profile persistence helpers. */
const defaultVideos = [
  { id: 1, mode: 'focused', course: 'medicine', topic: 'Cardio', title: 'Heart sounds in 8 minutes', subject: 'Cardiology', duration: '8 min', difficulty: 'High-yield', progress: 72, description: 'A focused lesson on S1, S2, murmurs, and exam traps.' },
  { id: 2, mode: 'detailed', course: 'microbiology', topic: 'Bacteriology', title: 'Gram positive bacteria map', subject: 'Microbiology', duration: '14 min', difficulty: 'Medium', progress: 35, description: 'Visual explanation with memory hooks and quick recall table.' },
  { id: 3, mode: 'focused', course: 'obstetrics', topic: 'Emergencies', title: 'PPH emergency algorithm', subject: 'Obstetrics', duration: '11 min', difficulty: 'Hard', progress: 91, description: 'Step-by-step postpartum hemorrhage management approach.' },
  { id: 4, mode: 'detailed', course: 'community', topic: 'Study Designs', title: 'Case-control vs cohort studies', subject: 'Community', duration: '9 min', difficulty: 'Easy', progress: 54, description: 'Exam-friendly comparison with risk measures and bias notes.' },
  { id: 5, mode: 'detailed', course: 'medicine', topic: 'Cardiology', title: 'ECG basics: axis and rhythm', subject: 'Cardiology', duration: '17 min', difficulty: 'Medium', progress: 12, description: 'From zero to recognizing common rhythm patterns.' },
  { id: 6, mode: 'focused', course: 'medicine', topic: 'GIT', title: 'Acute abdomen high-yield map', subject: 'GIT', duration: '10 min', difficulty: 'High-yield', progress: 22, description: 'Fast comparison of appendicitis, cholecystitis, pancreatitis, and obstruction.' },
  { id: 7, mode: 'focused', course: 'medicine', topic: 'Respiratory', title: 'Asthma vs COPD in exams', subject: 'Respiratory', duration: '7 min', difficulty: 'High-yield', progress: 44, description: 'Focused differences, spirometry clues, and management traps.' },
  { id: 8, mode: 'detailed', course: 'pediatrics', topic: 'Neonatology', title: 'Neonatal jaundice full lecture', subject: 'Pediatrics', duration: '26 min', difficulty: 'Medium', progress: 18, description: 'Detailed lecture covering physiology, danger signs, and phototherapy indications.' },
  { id: 9, mode: 'focused', course: 'surgery', topic: 'Trauma', title: 'ATLS primary survey shortcut', subject: 'Surgery', duration: '12 min', difficulty: 'High-yield', progress: 64, description: 'A concise ABCDE approach with emergency priorities and common MCQ traps.' },
  { id: 10, mode: 'detailed', course: 'obstetrics', topic: 'Antenatal Care', title: 'Antenatal care complete framework', subject: 'Obstetrics', duration: '32 min', difficulty: 'Medium', progress: 8, description: 'Full structured lecture for visits, screening, counseling, and red flags.' }
];

const defaultQuestions = [
  {
    id: 1,
    mode: 'focused',
    course: 'medicine',
    topic: 'Cardio',
    difficulty: 'High-yield',
    stem: 'A 65-year-old patient has a harsh systolic murmur at the right upper sternal border radiating to the carotids. What is the most likely diagnosis?',
    options: ['Mitral regurgitation', 'Aortic stenosis', 'Tricuspid regurgitation', 'Patent ductus arteriosus'],
    correct: 1,
    explanation: 'Aortic stenosis classically causes a harsh crescendo-decrescendo systolic murmur best heard at the right upper sternal border with radiation to the carotids.',
    wrong: ['Mitral regurgitation is holosystolic and radiates to the axilla.', 'Tricuspid regurgitation increases with inspiration and is best heard at the lower left sternal border.', 'PDA causes a continuous machine-like murmur.'],
    takeaway: 'Carotid radiation + RUSB systolic murmur = aortic stenosis.'
  },
  {
    id: 2,
    mode: 'focused',
    course: 'community',
    topic: 'Study Designs',
    difficulty: 'High-yield',
    stem: 'In a case-control study, which measure is most commonly used to estimate association?',
    options: ['Relative risk', 'Odds ratio', 'Attributable risk', 'Incidence rate'],
    correct: 1,
    explanation: 'Case-control studies start with disease status and look backward for exposure, so incidence cannot be directly calculated. Odds ratio is the main association measure.',
    wrong: ['Relative risk is typically calculated in cohort studies.', 'Attributable risk needs incidence in exposed and unexposed groups.', 'Incidence rate requires following a population over time.'],
    takeaway: 'Case-control = odds ratio. Cohort = relative risk.'
  },
  {
    id: 3,
    mode: 'focused',
    course: 'medicine',
    topic: 'GIT',
    difficulty: 'Medium',
    stem: 'A patient has epigastric pain radiating to the back with raised serum lipase. What is the most likely diagnosis?',
    options: ['Acute pancreatitis', 'Acute appendicitis', 'Perforated peptic ulcer', 'Acute hepatitis'],
    correct: 0,
    explanation: 'Acute pancreatitis classically presents with severe epigastric pain radiating to the back, nausea/vomiting, and elevated lipase.',
    wrong: ['Appendicitis usually migrates to the right iliac fossa.', 'Perforated ulcer causes sudden severe pain with peritonitis and free air.', 'Acute hepatitis causes jaundice and marked transaminase elevation more than lipase rise.'],
    takeaway: 'Epigastric pain to back + high lipase = pancreatitis.'
  },
  {
    id: 4,
    mode: 'focused',
    course: 'medicine',
    topic: 'Respiratory',
    difficulty: 'High-yield',
    stem: 'A young patient has episodic wheeze, cough at night, and reversible airflow obstruction. What is the most likely diagnosis?',
    options: ['COPD', 'Asthma', 'Bronchiectasis', 'Pulmonary fibrosis'],
    correct: 1,
    explanation: 'Asthma is characterized by variable, reversible airway obstruction with episodic wheeze, cough, and triggers.',
    wrong: ['COPD is usually progressive and associated with smoking/older age.', 'Bronchiectasis has chronic productive cough and recurrent infections.', 'Pulmonary fibrosis causes restrictive symptoms and inspiratory crackles.'],
    takeaway: 'Variable symptoms + reversibility = asthma.'
  },
  {
    id: 5,
    mode: 'focused',
    course: 'obstetrics',
    topic: 'Emergencies',
    difficulty: 'Hard',
    stem: 'A woman develops heavy bleeding after delivery and the uterus feels boggy. What is the most likely cause of postpartum hemorrhage?',
    options: ['Uterine atony', 'Cervical tear', 'Retained placenta only', 'Uterine inversion'],
    correct: 0,
    explanation: 'The commonest cause of primary postpartum hemorrhage is uterine atony. A boggy uterus strongly supports atony.',
    wrong: ['Cervical tear usually has bleeding with a well-contracted uterus.', 'Retained placenta may contribute but boggy uterus points to atony.', 'Uterine inversion is rare and presents with shock and absent/inverted fundus.'],
    takeaway: 'PPH + boggy uterus = uterine atony.'
  },
  {
    id: 6,
    mode: 'focused',
    course: 'surgery',
    topic: 'Trauma',
    difficulty: 'High-yield',
    stem: 'In ATLS, what is assessed first during the primary survey?',
    options: ['Breathing', 'Circulation', 'Airway with cervical spine protection', 'Disability'],
    correct: 2,
    explanation: 'The ATLS primary survey starts with Airway while maintaining cervical spine protection, then Breathing, Circulation, Disability, and Exposure.',
    wrong: ['Breathing comes after airway.', 'Circulation comes after breathing.', 'Disability is assessed after circulation.'],
    takeaway: 'ATLS = A first: airway + C-spine protection.'
  },
  {
    id: 7,
    mode: 'detailed',
    course: 'pediatrics',
    topic: 'Neonatology',
    difficulty: 'Medium',
    stem: 'A neonate develops jaundice in the first 24 hours of life. What is the best interpretation?',
    options: ['Always physiological', 'Potentially pathological and needs evaluation', 'Needs no follow-up', 'Only due to breastfeeding'],
    correct: 1,
    explanation: 'Jaundice within the first 24 hours is pathological until proven otherwise and needs urgent evaluation for hemolysis, infection, and other causes.',
    wrong: ['Physiological jaundice usually appears after 24 hours.', 'No follow-up is unsafe.', 'Breastfeeding jaundice usually appears later.'],
    takeaway: 'Jaundice <24 hours = pathological red flag.'
  },
  {
    id: 8,
    mode: 'detailed',
    course: 'medicine',
    topic: 'Cardiology',
    difficulty: 'Medium',
    stem: 'Which ECG finding most strongly suggests atrial fibrillation?',
    options: ['Regular rhythm with P waves', 'Irregularly irregular rhythm without clear P waves', 'ST elevation only', 'Short PR interval with delta wave'],
    correct: 1,
    explanation: 'Atrial fibrillation produces an irregularly irregular rhythm with absent organized P waves.',
    wrong: ['Regular P waves argue against AF.', 'ST elevation suggests acute injury rather than AF.', 'Delta wave suggests WPW pattern.'],
    takeaway: 'AF = irregularly irregular + no clear P waves.'
  },
  {
    id: 9,
    mode: 'focused',
    course: 'microbiology',
    topic: 'Bacteria',
    difficulty: 'High-yield',
    stem: 'Which stain result best describes Staphylococcus aureus?',
    options: ['Gram-negative rods', 'Gram-positive cocci in clusters', 'Acid-fast bacilli', 'Gram-positive rods with spores'],
    correct: 1,
    explanation: 'Staphylococcus aureus is a Gram-positive coccus arranged in clusters and is classically catalase and coagulase positive.',
    wrong: ['Gram-negative rods include organisms like E. coli.', 'Acid-fast bacilli suggests Mycobacteria.', 'Spore-forming Gram-positive rods include Bacillus and Clostridium.'],
    takeaway: 'Staph aureus = Gram-positive cocci in clusters.'
  },
  {
    id: 10,
    mode: 'detailed',
    course: 'community',
    topic: 'Screening',
    difficulty: 'Easy',
    stem: 'A good screening test should primarily have high sensitivity. Why?',
    options: ['To confirm diagnosis', 'To reduce false negatives', 'To measure incidence', 'To prove causation'],
    correct: 1,
    explanation: 'Screening aims to detect possible disease early, so high sensitivity is important to minimize missed cases.',
    wrong: ['Confirmatory tests need high specificity.', 'Incidence requires follow-up population data.', 'Causation is assessed using epidemiological evidence, not screening alone.'],
    takeaway: 'Screening = high sensitivity = few false negatives.'
  }
];

const defaultFocusNotes = [
  {
    id: 1,
    mode: 'focused',
    course: 'obstetrics',
    topic: 'Bleeding',
    title: '09. Postpartum Haemorrhage',
    subtitle: 'Primary and secondary PPH, 4 Ts, resuscitation and haemostasis ladder',
    pearl: 'PPH + boggy uterus → think uterine atony first.',
    sections: [
      {
        heading: 'Definition',
        points: [
          'Primary PPH → blood loss ≥500 mL within the first 24 hours after birth.',
          'Minor PPH → 500–1000 mL without clinical shock.',
          'Major PPH → ≥1000 mL or ongoing bleeding with shock.',
          'Moderate major PPH → 1000–2000 mL.',
          'Severe major PPH → >2000 mL.',
          'Secondary PPH → abnormal or excessive bleeding from 24 hours to 12 weeks postpartum.',
          'Visual estimation of blood loss commonly underestimates true blood loss.'
        ]
      },
      {
        heading: 'Primary PPH — the 4 Ts',
        points: [
          'Tone → uterine atony, the most common cause.',
          'Trauma → cervical/vaginal laceration, uterine rupture, or uterine inversion.',
          'Tissue → retained placenta or retained products of conception.',
          'Thrombin → coagulopathy.'
        ]
      },
      {
        heading: 'Initial response to major PPH',
        points: [
          'PPH + haemodynamic instability → activate PPH protocol immediately.',
          'Restore circulating volume before detailed investigation in shock.',
          'Immediate actions: ABC assessment, oxygen 10–15 L/min by mask, 2 large-bore IV lines, warmed fluids, blood products as needed, urine-output monitoring, and continuous vital-sign monitoring.',
          'Send blood: FBC, coagulation screen, fibrinogen, U&E, LFT, group and cross-match at least 4 units.',
          'Call early: senior obstetrician, anaesthetist, haematology team, blood bank, and theatre staff.',
          'Do not delay treatment while waiting for laboratory results.'
        ]
      },
      {
        heading: 'Uterine atony — classic patterns',
        points: [
          'Prolonged labour + uterus palpable above umbilicus + PPH → uterine atony.',
          'Boggy relaxed uterus after delivery → massage immediately.',
          'Macrosomic infant + atonic uterus → uterine overdistension.',
          'Most frequent cause of immediate PPH → uterine atony.'
        ]
      },
      {
        heading: 'Risk factors for atony',
        points: [
          'Overdistended uterus: macrosomia, polyhydramnios, or multiple pregnancy.',
          'Prolonged or augmented labour.',
          'Induction of labour.',
          'Previous PPH.',
          'Placenta previa or placenta accreta spectrum.',
          'Operative delivery.',
          'Maternal obesity.'
        ]
      }
    ],
    patterns: [
      { clue: 'Soft boggy enlarged uterus', think: 'Uterine atony' },
      { clue: 'Firm contracted uterus + continued bleeding', think: 'Genital-tract trauma — inspect cervix and upper vagina' },
      { clue: 'Placenta incomplete or fragments suspected', think: 'Retained placental tissue' },
      { clue: 'Blood fails to clot or oozes from multiple sites', think: 'Coagulopathy' },
      { clue: 'Post-delivery haemorrhage + lower abdominal mass / inverted fundus', think: 'Uterine inversion' },
      { clue: 'Large vaginal haematoma >3 cm', think: 'Drainage required' },
      { clue: 'Painless antepartum bleeding with soft non-tender uterus', think: 'Placenta previa' }
    ],
    ladder: [
      'Recognize bleeding and call for help',
      'ABC + oxygen + two large-bore IV lines',
      'Blood tests and cross-match',
      'Uterine massage if atony is suspected',
      'Uterotonics and haemostatic measures',
      'Escalate to theatre / balloon tamponade / surgery if bleeding continues'
    ],
    takeaway: 'In exam stems, uterus tone directs the diagnosis: boggy = atony; firm + bleeding = trauma until proven otherwise.'
  },
  {
    id: 2,
    mode: 'focused',
    course: 'medicine',
    topic: 'Cardio',
    title: 'Murmur recognition approach',
    subtitle: 'Fast bedside pattern recognition for high-yield cardiology stems',
    pearl: 'Radiation and timing usually solve the murmur stem.',
    sections: [
      { heading: 'Core approach', points: ['First identify systolic vs diastolic.', 'Then locate the loudest area.', 'Then look for radiation.', 'Finally use maneuvers or associated symptoms.'] },
      { heading: 'Classic clues', points: ['RUSB systolic murmur radiating to carotids → aortic stenosis.', 'Holosystolic murmur radiating to axilla → mitral regurgitation.', 'Diastolic rumble at apex → mitral stenosis.', 'Machine-like continuous murmur → PDA.'] }
    ],
    patterns: [
      { clue: 'Syncope + angina + dyspnea + carotid radiation', think: 'Aortic stenosis' },
      { clue: 'Holosystolic apex murmur + axillary radiation', think: 'Mitral regurgitation' },
      { clue: 'Opening snap + diastolic rumble', think: 'Mitral stenosis' }
    ],
    ladder: ['Timing', 'Location', 'Radiation', 'Maneuver', 'Most likely diagnosis'],
    takeaway: 'For murmurs, do not memorize randomly; classify by timing, location, and radiation.'
  },
  {
    id: 3,
    mode: 'focused',
    course: 'obstetrics',
    topic: 'Bleeding',
    title: 'Antepartum bleeding: rapid approach',
    subtitle: 'Differentiate placenta previa, abruption, rupture, and local causes quickly',
    pearl: 'Painless bleeding → previa until proven otherwise; painful tender uterus → abruption.',
    sections: [
      { heading: 'Do first', points: ['Assess maternal stability.', 'Assess fetal status.', 'Avoid digital vaginal examination until placenta previa is excluded.', 'Use ultrasound to localize the placenta.'] },
      { heading: 'Exam patterns', points: ['Painless bright red bleeding + soft non-tender uterus → placenta previa.', 'Painful bleeding + tender rigid uterus → placental abruption.', 'Shock with abdominal pain and fetal distress after scarred uterus → uterine rupture.'] }
    ],
    patterns: [
      { clue: 'Painless bright red bleeding', think: 'Placenta previa' },
      { clue: 'Painful bleeding + tender uterus', think: 'Placental abruption' },
      { clue: 'Fetal distress + maternal collapse + previous C-section', think: 'Uterine rupture' }
    ],
    ladder: ['Stabilize mother', 'Assess fetus', 'No digital exam if previa possible', 'Ultrasound placenta', 'Manage according to cause and stability'],
    takeaway: 'The pain pattern is the fastest clue in antepartum bleeding questions.'
  }
];

function getTodayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function defaultTodoItems() {
  return [];
}

function normalizeDailyTodo(todo = {}) {
  const today = getTodayKey();
  const automaticOldTasks = ['Watch one focused lecture', 'Solve 25 MCQs', 'Review saved mistakes'];
  if (!todo || !Array.isArray(todo.items)) {
    return { date: today, items: defaultTodoItems() };
  }
  const rawItems = todo.items || [];
  const looksLikeOldAutoList = rawItems.length === 3 && rawItems.every(item => automaticOldTasks.includes(String(item.text || '')) && !item.done);
  if (looksLikeOldAutoList) return { date: todo.date || today, items: [] };
  return {
    date: todo.date || today,
    items: rawItems.map((item, index) => ({
      id: item.id || Date.now() + index,
      text: String(item.text || '').slice(0, 80) || 'Untitled task',
      done: Boolean(item.done),
      createdAt: item.createdAt || item.addedAt || new Date(Date.now() - index * 1000).toISOString(),
      target: item.target && typeof item.target === 'object' ? item.target : null
    }))
  };
}

const defaultState = {
  xp: 1280,
  streak: 7,
  theme: 'dark',
  videoLevel: 'modes',
  selectedMode: null,
  selectedCourse: null,
  selectedTopic: null,
  qbankLevel: 'modes',
  selectedQMode: null,
  selectedQCourse: null,
  selectedQTopic: null,
  selectedQSubtopic: null,
  selectedQNoteLibrary: null,
  selectedQAnswerMode: 'exam',
  qbankSubtopics: {},
  questions: [], // v87: QBank is loaded from data/qbank/index.json, not hardcoded defaults
  focusNotes: defaultFocusNotes,
  videos: defaultVideos,
  freeCourses: [],
  freeCourseLevel: 'courses',
  selectedFreeCourseId: null,
  selectedFreeChapterId: null,
  videoCourseTree: null,
  qbankCourseTree: null,
  mistakes: [],
  videoProgress: {},
  qbankStats: {},
  qbankAttempts: [],
  flashcards: [],
  examReports: [],
  dailyTodo: null,
  learnRouteCourse: null,
  learnRouteChapter: null,
  learnRouteSelections: {},
  user: null
};

const ADMIN_CREDENTIALS = {
  name: 'NovaAdmin',
  code: '12344321'
};

const SUPABASE_CONFIG_KEY = 'novamed-supabase-config-v2';
const SUPABASE_CONTENT_TABLE = 'novamed_content';
const SUPABASE_CONTENT_ID = 'global';
const DEFAULT_SUPABASE_BUCKET = 'novamed';
const DEFAULT_VIDEO_FOLDER = 'focus video';
const DEFAULT_FILE_FOLDER = 'novamed-files';
const SUPABASE_PROFILES_TABLE = 'profiles';

// Public Supabase values are safe to expose in a frontend app when Row Level Security is enabled.
// For a public Netlify build, paste your Project URL and anon public key here,
// or define window.NOVAMED_SUPABASE_CONFIG before app.js is loaded.
const NOVAMED_PUBLIC_SUPABASE_URL = 'https://qtxhqsteibgvcylywpmp.supabase.co';
const NOVAMED_PUBLIC_SUPABASE_ANON_KEY = 'sb_publishable_T8G1YydoW0WF11rs4tgJjA_aDK_2ErO';
const PUBLIC_CONTENT_SNAPSHOT_PATH = 'public/novamed-content.json';
const PUBLIC_SNAPSHOT_PROJECT_URL = 'https://qtxhqsteibgvcylywpmp.supabase.co';
const PUBLIC_SNAPSHOT_BUCKET = 'novamed';

let supabaseClient = null;
let cloudSaveTimer = null;
let cloudSyncBusy = false;
let lastCloudSaveAt = null;
let profileSaveTimer = null;
let videoProgressSaveTimer = null;
let lastVideoProgressTickAt = 0;
let authFlowState = { name: '', code: '' };
let lastProfileSyncError = null;
let lastProfileSyncAt = null;

const LEGACY_STATE_KEY = 'novamed-state';
const CONTENT_KEY = 'novamed-global-content-v6-video-files-focus-notes';
const STUDENTS_KEY = 'novamed-student-accounts-v2';
const SESSION_KEY = 'novamed-session-v2';
const UI_PROGRESS_KEY = 'novamed-ui-progress-v1';

function isAdmin() {
  return state?.user?.role === 'admin';
}

function isStudent() {
  return state?.user?.role === 'student';
}

function currentUserName() {
  return state?.user?.name || 'Guest student';
}

function normalizeEmail(email = '') {
  return String(email).trim().toLowerCase();
}

function normalizeStudentName(name = '') {
  return String(name || '').trim().replace(/\s+/g, ' ');
}

function studentAccountKey(name = '') {
  return normalizeStudentName(name).toLowerCase();
}

function stableStudentId(studentKey = '') {
  let hash = 2166136261;
  const raw = String(studentKey || 'student');
  for (let i = 0; i < raw.length; i += 1) {
    hash ^= raw.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `student_${(hash >>> 0).toString(16)}`;
}

function simpleHash(input = '') {
  let hash = 2166136261;
  const raw = String(input || '');
  for (let i = 0; i < raw.length; i += 1) {
    hash ^= raw.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv_${(hash >>> 0).toString(16)}`;
}

async function hashAccessCode(studentKey, code) {
  const raw = `${studentKey}::${String(code || '').trim()}`;
  if (window.crypto?.subtle && window.TextEncoder) {
    const bytes = new TextEncoder().encode(raw);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
  }
  return simpleHash(raw);
}

function studentIdentityFromUser(user = {}) {
  return user?.studentKey || studentAccountKey(user?.name || user?.email || '');
}

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}


function loadUiProgress() {
  return readJson(UI_PROGRESS_KEY, {});
}

function saveUiProgress() {
  const payload = {
    theme: state.theme || 'dark',
    dailyTodo: normalizeDailyTodo(state.dailyTodo),
    learnRouteCourse: state.learnRouteCourse || null,
    learnRouteChapter: state.learnRouteChapter || null,
    learnRouteSelections: state.learnRouteSelections || {},
    homeWidgetSettings: typeof readHomeWidgetSettingsV80 === 'function' ? readHomeWidgetSettingsV80() : (state.homeWidgetSettings || null),
    videoLevel: state.videoLevel || 'modes',
    selectedMode: state.selectedMode || null,
    selectedCourse: state.selectedCourse || null,
    selectedTopic: state.selectedTopic || null,
    qbankLevel: state.qbankLevel || 'modes',
    selectedQMode: state.selectedQMode || null,
    selectedQCourse: state.selectedQCourse || null,
    selectedQTopic: state.selectedQTopic || null,
    selectedQSubtopic: state.selectedQSubtopic || null,
    selectedQNoteLibrary: state.selectedQNoteLibrary || null,
    selectedQAnswerMode: state.selectedQAnswerMode || 'exam'
  };
  if (typeof isStudent === 'function' && isStudent()) {
    // v139: student UI progress is saved through student_state in Supabase, not localStorage.
    window.__novamedUiProgressCache = payload;
    try { localStorage.removeItem(UI_PROGRESS_KEY); } catch {}
    return;
  }
  writeJson(UI_PROGRESS_KEY, payload);
}



function splitBucketAndFolder(value = '', fallbackBucket = DEFAULT_SUPABASE_BUCKET, fallbackFolder = '') {
  const raw = String(value || '').trim().replace(/^\/+|\/+$/g, '');
  if (!raw) return { bucket: fallbackBucket, folder: fallbackFolder };
  const parts = raw.split('/').map(part => part.trim()).filter(Boolean);
  if (parts.length === 1) return { bucket: parts[0], folder: fallbackFolder };
  return { bucket: parts[0], folder: parts.slice(1).join('/') || fallbackFolder };
}

function looksLikeFolderName(value = '') {
  const raw = String(value || '').trim().toLowerCase();
  return ['focus video', 'focused video', 'novamed-files', 'novamed file', 'nova-med file', 'files', 'videos'].includes(raw);
}

function normalizeStorageSetup(rawCfg = {}) {
  const cfg = rawCfg || {};
  const bucketCandidate = String(cfg.bucket || cfg.storageBucket || '').trim();
  const videoCandidate = String(cfg.videoBucket || '').trim();
  const fileCandidate = String(cfg.fileBucket || '').trim();

  let rootBucket = bucketCandidate;
  if (!rootBucket || looksLikeFolderName(rootBucket)) {
    const parsedVideo = splitBucketAndFolder(videoCandidate, '', '');
    const parsedFile = splitBucketAndFolder(fileCandidate, '', '');
    if (parsedVideo.bucket && !looksLikeFolderName(parsedVideo.bucket)) rootBucket = parsedVideo.bucket;
    else if (parsedFile.bucket && !looksLikeFolderName(parsedFile.bucket)) rootBucket = parsedFile.bucket;
    else rootBucket = DEFAULT_SUPABASE_BUCKET;
  }

  let videoFolder = String(cfg.videoFolder || '').trim();
  if (!videoFolder && videoCandidate) {
    const parsedVideo = splitBucketAndFolder(videoCandidate, rootBucket, DEFAULT_VIDEO_FOLDER);
    videoFolder = looksLikeFolderName(videoCandidate) ? videoCandidate : parsedVideo.folder;
  }
  if (!videoFolder) videoFolder = DEFAULT_VIDEO_FOLDER;

  let fileFolder = String(cfg.fileFolder || '').trim();
  if (!fileFolder && fileCandidate) {
    const parsedFile = splitBucketAndFolder(fileCandidate, rootBucket, DEFAULT_FILE_FOLDER);
    fileFolder = looksLikeFolderName(fileCandidate) ? fileCandidate : parsedFile.folder;
  }
  if (!fileFolder) fileFolder = DEFAULT_FILE_FOLDER;

  return {
    url: String(cfg.url || '').trim(),
    anonKey: String(cfg.anonKey || '').trim(),
    bucket: rootBucket,
    videoBucket: rootBucket,
    fileBucket: rootBucket,
    videoFolder,
    fileFolder
  };
}

function getEmbeddedSupabaseConfig() {
  const runtimeCfg = window.NOVAMED_SUPABASE_CONFIG || window.NOVAMED_SUPABASE || {};
  return normalizeStorageSetup({
    url: runtimeCfg.url || runtimeCfg.supabaseUrl || NOVAMED_PUBLIC_SUPABASE_URL,
    anonKey: runtimeCfg.anonKey || runtimeCfg.supabaseAnonKey || NOVAMED_PUBLIC_SUPABASE_ANON_KEY,
    bucket: runtimeCfg.bucket || DEFAULT_SUPABASE_BUCKET,
    videoFolder: runtimeCfg.videoFolder || DEFAULT_VIDEO_FOLDER,
    fileFolder: runtimeCfg.fileFolder || DEFAULT_FILE_FOLDER
  });
}

function getSupabaseConfig() {
  const oldCfg = readJson('novamed-supabase-config-v1', {});
  const saved = normalizeStorageSetup(readJson(SUPABASE_CONFIG_KEY, oldCfg || {}));
  const embedded = getEmbeddedSupabaseConfig();
  // v134: Published builds must not keep using an old Project URL/key saved in this browser.
  // Keep optional bucket/folder overrides, but always prefer the embedded current URL + publishable key.
  const embeddedHasAuth = Boolean(embedded.url && embedded.anonKey);
  return normalizeStorageSetup({
    ...saved,
    ...embedded,
    url: embeddedHasAuth ? embedded.url : saved.url,
    anonKey: embeddedHasAuth ? embedded.anonKey : saved.anonKey,
    bucket: saved.bucket || embedded.bucket || DEFAULT_SUPABASE_BUCKET,
    videoFolder: saved.videoFolder || embedded.videoFolder || DEFAULT_VIDEO_FOLDER,
    fileFolder: saved.fileFolder || embedded.fileFolder || DEFAULT_FILE_FOLDER
  });
}

function saveSupabaseConfig(cfg = {}) {
  const clean = normalizeStorageSetup(cfg);
  writeJson(SUPABASE_CONFIG_KEY, clean);
  // Also overwrite the old key so older cached app builds cannot re-read a bad folder-as-bucket value.
  writeJson('novamed-supabase-config-v1', clean);
  supabaseClient = null;
  updateCloudBadge();
  return clean;
}

function supabaseSetupStatus() {
  const cfg = getSupabaseConfig();
  if (!window.supabase) return { ok: false, reason: 'Supabase SDK is not loaded. Check the CDN script or internet connection.' };
  if (!cfg.url || !cfg.anonKey) return { ok: false, reason: 'Supabase URL and anon key are not saved in this published app/browser.' };
  return { ok: true, reason: 'Supabase is ready.' };
}

function cloudConfigured() {
  return supabaseSetupStatus().ok;
}

function requireSupabaseReady() {
  const status = supabaseSetupStatus();
  if (!status.ok) throw new Error(status.reason);
  return true;
}

function getSupabaseClient() {
  if (!cloudConfigured()) return null;
  if (!supabaseClient) {
    const cfg = getSupabaseConfig();
    supabaseClient = window.supabase.createClient(cfg.url, cfg.anonKey);
  }
  return supabaseClient;
}

function cloudContentPayload() {
  return {
    videos: (state.videos || []).map(normalizeVideo),
    freeCourses: normalizeFreeCourses(state.freeCourses || []),
    questions: (state.questions || []).map(normalizeQuestion),
    focusNotes: (state.focusNotes || []).map(normalizeFocusNote),
    videoCourseTree: normalizeVideoCourseTree(state.videoCourseTree),
    qbankCourseTree: normalizeQbankCourseTree(state.qbankCourseTree),
    updatedAt: new Date().toISOString()
  };
}

function applyCloudContentPayload(cloud = {}) {
  state.videos = mergeVideoDefaults(Array.isArray(cloud.videos) ? cloud.videos : []);
  state.freeCourses = normalizeFreeCourses(Array.isArray(cloud.freeCourses) ? cloud.freeCourses : []);
  state.questions = mergeQuestionDefaults(Array.isArray(cloud.questions) ? cloud.questions : []);
  state.focusNotes = mergeFocusNoteDefaults(Array.isArray(cloud.focusNotes) ? cloud.focusNotes : []);
  state.videoCourseTree = normalizeVideoCourseTree(cloud.videoCourseTree);
  state.qbankCourseTree = normalizeQbankCourseTree(cloud.qbankCourseTree || cloud.videoCourseTree);
  persistGlobalContent({ skipCloud: true });
  renderVideos();
  renderQbank();
  loadExternalQbankJson({ silent: true });
  renderProfileStats();
}

function getPublicSnapshotUrl() {
  const cfg = getSupabaseConfig();
  const baseUrl = (cfg.url || PUBLIC_SNAPSHOT_PROJECT_URL || NOVAMED_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '');
  const bucket = cfg.bucket || PUBLIC_SNAPSHOT_BUCKET || DEFAULT_SUPABASE_BUCKET;
  if (!baseUrl || !bucket) return '';
  return `${baseUrl}/storage/v1/object/public/${encodeURIComponent(bucket)}/${PUBLIC_CONTENT_SNAPSHOT_PATH}`;
}

async function publishPublicContentSnapshot(payload = cloudContentPayload()) {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase is not connected. Add URL + anon key for admin publishing.');
  const cfg = getSupabaseConfig();
  const bucket = cfg.bucket || DEFAULT_SUPABASE_BUCKET;
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const { error } = await client.storage.from(bucket).upload(PUBLIC_CONTENT_SNAPSHOT_PATH, blob, {
    cacheControl: '60',
    upsert: true,
    contentType: 'application/json'
  });
  if (error) throw friendlyStorageError(error, bucket);
  const { data } = client.storage.from(bucket).getPublicUrl(PUBLIC_CONTENT_SNAPSHOT_PATH);
  return data?.publicUrl || getPublicSnapshotUrl();
}

async function loadPublicContentSnapshot({ silent = true } = {}) {
  const url = getPublicSnapshotUrl();
  if (!url) {
    publicContentLoadStatus = 'Public snapshot URL is missing.';
    return false;
  }
  try {
    publicContentLoadStatus = 'Loading public snapshot…';
    const response = await fetch(`${url}?v=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Snapshot not found (${response.status}). Admin must click Publish public snapshot once.`);
    const cloud = await response.json();
    applyCloudContentPayload(cloud || {});
    publicContentLoadStatus = 'Public snapshot loaded.';
    updateCloudBadge('Public content loaded');
    if (!silent) showToast('Public content loaded');
    return true;
  } catch (err) {
    console.warn('Public snapshot load failed', err);
    publicContentLoadStatus = err.message || 'Public snapshot load failed.';
    if (!silent) showToast(publicContentLoadStatus);
    return false;
  }
}

function safeFileName(name = 'file') {
  const cleaned = String(name || 'file').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').slice(0, 96);
  return cleaned || 'file';
}

function buildStoragePath(file, folder = 'uploads') {
  const folderParts = String(folder || 'uploads').split('/').map(part => part.trim()).filter(Boolean);
  const parts = [...folderParts, state.selectedMode || state.selectedQMode || 'general', state.selectedCourse || state.selectedQCourse || 'course', state.selectedTopic || state.selectedQTopic || 'topic']
    .map(part => makeSlug(part || 'general'));
  return `${parts.join('/')}/${Date.now()}-${safeFileName(file?.name || 'file')}`;
}

function friendlyStorageError(error, bucket) {
  const message = String(error?.message || error || 'Upload failed');
  if (/bucket not found/i.test(message)) {
    return new Error(`Bucket not found: ${bucket}. In Supabase, use only the bucket name, for example: novamed. Folders like "focus video" or "novamed-files" must be saved as folder prefixes, not bucket names.`);
  }
  return error instanceof Error ? error : new Error(message);
}

async function uploadSupabaseAsset(kind, file, folderHint = '') {
  if (!file || !file.size) return null;
  const client = getSupabaseClient();
  if (!client) return null;
  const cfg = getSupabaseConfig();
  const bucket = kind === 'video' ? cfg.videoBucket : cfg.fileBucket;
  const baseFolder = kind === 'video' ? cfg.videoFolder : cfg.fileFolder;
  const path = buildStoragePath(file, folderHint || baseFolder || kind);
  const { error } = await client.storage.from(bucket).upload(path, file, {
    cacheControl: kind === 'video' ? '86400' : '3600',
    upsert: true,
    contentType: file.type || undefined
  });
  if (error) throw friendlyStorageError(error, bucket);
  const { data } = client.storage.from(bucket).getPublicUrl(path);
  return {
    bucket,
    folder: baseFolder,
    path,
    publicUrl: data?.publicUrl || '',
    fileName: file.name,
    size: file.size,
    type: file.type || ''
  };
}

function normalizeStorageDirection(value = '', fallback = 'free-courses/videos') {
  const raw = String(value || fallback || 'uploads').trim().replace(/^\/+|\/+$/g, '');
  const parts = raw.split('/').map(part => makeSlug(part || '')).filter(Boolean);
  return (parts.join('/') || fallback).replace(/^\/+|\/+$/g, '');
}

function buildDirectedStoragePath(file, direction = 'free-courses/videos') {
  const folder = normalizeStorageDirection(direction, 'free-courses/videos');
  return `${folder}/${Date.now()}-${safeFileName(file?.name || 'video')}`;
}

async function verifyStorageObjectExists(bucket = '', path = '') {
  const client = getSupabaseClient();
  if (!client || !bucket || !path) return { ok: false, reason: 'Missing bucket/path for verification.' };
  const parts = String(path).split('/');
  const filename = parts.pop();
  const folder = parts.join('/');
  try {
    const { data, error } = await client.storage.from(bucket).list(folder, { limit: 20, search: filename });
    if (error) throw friendlyStorageError(error, bucket);
    const found = Array.isArray(data) && data.some(item => item.name === filename);
    return { ok: found, reason: found ? 'Storage object found.' : 'Upload finished, but object was not visible in storage list.' };
  } catch (err) {
    return { ok: false, reason: err.message || 'Could not verify storage object.' };
  }
}

async function uploadSupabaseAssetToDirection(kind, file, direction = '', onStep = null) {
  if (!file || !file.size) throw new Error('Choose a file first.');
  requireSupabaseReady();
  const client = getSupabaseClient();
  const cfg = getSupabaseConfig();
  const bucket = kind === 'video' ? cfg.videoBucket : cfg.fileBucket;
  const defaultFolder = kind === 'video' ? 'free-courses/videos' : 'free-courses/files';
  const cleanDirection = normalizeStorageDirection(direction, defaultFolder);
  const path = buildDirectedStoragePath(file, cleanDirection);
  onStep?.('checking', `Bucket: ${bucket} • Folder: ${cleanDirection}`);
  onStep?.('uploading', `Uploading to Supabase Storage: ${path}`);
  const { error } = await client.storage.from(bucket).upload(path, file, {
    cacheControl: kind === 'video' ? '86400' : '3600',
    upsert: true,
    contentType: file.type || undefined
  });
  if (error) throw friendlyStorageError(error, bucket);
  onStep?.('url', 'Upload completed. Creating public URL…');
  const { data } = client.storage.from(bucket).getPublicUrl(path);
  const publicUrl = data?.publicUrl || '';
  if (!publicUrl) throw new Error('Upload finished but Supabase did not return a public URL.');
  const verified = await verifyStorageObjectExists(bucket, path);
  onStep?.(verified.ok ? 'verified' : 'warning', verified.ok ? 'Verified: video exists in Supabase Storage.' : `Upload URL created, but storage list verification failed: ${verified.reason}`);
  return {
    bucket,
    folder: cleanDirection,
    direction: cleanDirection,
    path,
    publicUrl,
    fileName: file.name,
    size: file.size,
    type: file.type || '',
    verified: verified.ok,
    verifyMessage: verified.reason
  };
}

function findFreeLectureInPayload(payload = {}, lectureId = '') {
  const courses = Array.isArray(payload.freeCourses) ? payload.freeCourses : [];
  for (const course of courses) {
    for (const chapter of (course.chapters || [])) {
      for (const lecture of (chapter.lectures || [])) {
        if (String(lecture.id) === String(lectureId)) return lecture;
      }
    }
  }
  return null;
}

async function verifyFreeLectureCloudSaved(lectureId = '', expectedUrl = '') {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase is not connected.');
  const { data, error } = await client.from(SUPABASE_CONTENT_TABLE).select('data').eq('id', SUPABASE_CONTENT_ID).maybeSingle();
  if (error) throw error;
  const lecture = findFreeLectureInPayload(data?.data || {}, lectureId);
  if (!lecture) throw new Error('Published content was saved, but this lecture was not found in Supabase data.');
  const savedUrl = lecture.publicUrl || lecture.videoUrl || lecture.url || '';
  if (expectedUrl && savedUrl !== expectedUrl) throw new Error('Lecture was found in Supabase, but the saved video URL does not match the uploaded URL.');
  return lecture;
}

function scheduleCloudContentSave() {
  if (!cloudConfigured()) return;
  clearTimeout(cloudSaveTimer);
  cloudSaveTimer = setTimeout(() => saveContentToSupabase().catch(err => {
    console.warn('NovaMed cloud save failed', err);
    showToast('Cloud save failed. Local copy kept.');
  }), 700);
}

async function saveContentToSupabase(options = {}) {
  const client = getSupabaseClient();
  if (!client) return false;
  if (cloudSyncBusy && !options.force) return false;
  if (options.force && cloudSyncBusy) {
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  if (cloudSyncBusy && !options.force) return false;
  cloudSyncBusy = true;
  try {
    const payload = cloudContentPayload();
    const { error } = await client.from(SUPABASE_CONTENT_TABLE).upsert({
      id: SUPABASE_CONTENT_ID,
      data: payload,
      updated_at: new Date().toISOString()
    });
    if (error) throw error;
    try {
      await publishPublicContentSnapshot(payload);
    } catch (snapshotError) {
      console.warn('Public snapshot publish failed', snapshotError);
      showToast(`Cloud saved, but public snapshot failed: ${snapshotError.message || 'check Storage policies'}`);
    }
    lastCloudSaveAt = new Date();
    updateCloudBadge('Synced');
    return true;
  } finally {
    cloudSyncBusy = false;
  }
}

async function loadContentFromSupabase({ silent = true } = {}) {
  const client = getSupabaseClient();
  if (!client) {
    if (!silent) showToast('Add Supabase URL and anon key first');
    return false;
  }
  try {
    updateCloudBadge('Syncing…');
    const { data, error } = await client.from(SUPABASE_CONTENT_TABLE).select('data').eq('id', SUPABASE_CONTENT_ID).maybeSingle();
    if (error) throw error;
    if (!data?.data) {
      if (!silent) showToast('No cloud content yet. Save once from admin mode.');
      updateCloudBadge('Connected');
      return false;
    }
    const cloud = data.data || {};
    applyCloudContentPayload(cloud);
    updateCloudBadge('Synced');
    if (!silent) showToast('Cloud content loaded');
    return true;
  } catch (err) {
    console.warn('NovaMed cloud load failed', err);
    updateCloudBadge('Cloud error');
    if (!silent) showToast(`Cloud load failed: ${err.message || 'check setup'}`);
    return false;
  }
}

let publicContentLoadPromise = null;
let publicContentLoadAttempted = false;
let publicContentLoadStatus = '';

function waitForSupabaseSdk(timeoutMs = 3500) {
  if (window.supabase) return Promise.resolve(true);
  const started = Date.now();
  return new Promise(resolve => {
    const tick = () => {
      if (window.supabase) return resolve(true);
      if (Date.now() - started >= timeoutMs) return resolve(false);
      setTimeout(tick, 120);
    };
    tick();
  });
}

async function ensurePublicContentForEveryone({ silent = true, force = false } = {}) {
  if (publicContentLoadPromise && !force) return publicContentLoadPromise;
  if (publicContentLoadAttempted && !force) return false;
  publicContentLoadAttempted = true;
  publicContentLoadStatus = 'loading';
  publicContentLoadPromise = (async () => {
    const sdkReady = await waitForSupabaseSdk();
    if (sdkReady && cloudConfigured()) {
      const ok = await loadContentFromSupabase({ silent });
      publicContentLoadStatus = ok ? 'Public content loaded from Supabase table.' : 'No public content loaded from Supabase table.';
      if (ok) return true;
    }
    const snapshotOk = await loadPublicContentSnapshot({ silent });
    if (snapshotOk) return true;
    if (!sdkReady) {
      publicContentLoadStatus = publicContentLoadStatus || 'Supabase SDK is not loaded.';
      updateCloudBadge('Cloud SDK offline');
      return false;
    }
    if (!cloudConfigured()) {
      publicContentLoadStatus = publicContentLoadStatus || 'Public Supabase config is missing, and no public snapshot was found.';
      updateCloudBadge('Public cloud snapshot missing');
      if (!silent) showToast(publicContentLoadStatus);
      return false;
    }
    return false;
  })().finally(() => {
    publicContentLoadPromise = null;
  });
  return publicContentLoadPromise;
}

function updateCloudBadge(label = '') {
  const badge = $('#cloudStatusBadge');
  if (badge) {
    if (!window.supabase) {
      badge.textContent = 'Cloud SDK offline';
      badge.className = 'cloud-status-badge warn';
    } else {
      const configured = cloudConfigured();
      badge.textContent = label || (configured ? (lastCloudSaveAt ? 'Cloud synced' : 'Cloud ready') : 'Local mode');
      badge.className = `cloud-status-badge ${configured ? 'ready' : 'local'}`;
    }
  }
  updateProfileSyncStatus();
}

function formatSyncTime(date) {
  if (!date) return '';
  const then = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(then.getTime())) return '';
  const seconds = Math.max(0, Math.round((Date.now() - then.getTime()) / 1000));
  if (seconds < 8) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return then.toLocaleDateString();
}

function updateProfileSyncStatusLegacyV102(label = '', tone = '') {
  const status = $('#profileSyncStatus');
  const card = $('#profileSyncBtn');
  if (!status && !card) return;
  const setup = supabaseSetupStatus();
  let text = label;
  let classTone = tone;
  if (!text) {
    if (!setup.ok) {
      text = 'Not connected — tap to fix';
      classTone = 'warn';
    } else if (lastProfileSyncError) {
      text = 'Sync error — tap to diagnose';
      classTone = 'warn';
    } else if (isStudent()) {
      text = lastProfileSyncAt ? `Synced ${formatSyncTime(lastProfileSyncAt)}` : 'Connected — tap to verify profile';
      classTone = 'ready';
    } else {
      text = 'Connected — tap to test tables';
      classTone = 'ready';
    }
  }
  if (status) status.textContent = text;
  if (card) {
    ['sync-ready', 'sync-warn', 'sync-busy', 'sync-local'].forEach(cls => card.classList.remove(cls));
    card.classList.add(`sync-${classTone || (setup.ok ? 'ready' : 'warn')}`);
  }
}

function syncDiagnosticRow(title, ok, detail = '', tone = '') {
  return {
    title,
    ok: Boolean(ok),
    detail: String(detail || ''),
    tone: tone || (ok ? 'ok' : 'bad')
  };
}

function syncDiagnosticClass(row = {}) {
  if (row.tone === 'warn') return 'warn';
  return row.ok ? 'ok' : 'bad';
}

function renderSupabaseSyncModalTechnicalV102(rows = [], summary = '') {
  if (!isAdmin()) return;
  const currentCfg = getSupabaseConfig();
  const studentLine = isStudent() ? `Current student: ${esc(currentUserName())}` : 'No student session is open. Sign in to test profile restore.';
  showModal(`
    <h2 id="modalTitle">Supabase Sync</h2>
    <p class="modal-muted">${esc(summary || 'Use this panel to check whether Supabase tables, storage, and the current student profile are reachable.')}</p>
    <div class="sync-summary-box">
      <b>${studentLine}</b>
      <small>Project: ${esc(currentCfg.url || 'not configured')} • Bucket: ${esc(currentCfg.bucket || DEFAULT_SUPABASE_BUCKET)}</small>
    </div>
    <div class="sync-diagnostic-list">
      ${rows.map(row => `
        <div class="sync-row ${syncDiagnosticClass(row)}">
          <span>${row.ok ? '✅' : (row.tone === 'warn' ? '⚠️' : '❌')}</span>
          <div><b>${esc(row.title)}</b><small>${esc(row.detail)}</small></div>
        </div>
      `).join('')}
    </div>
    <div class="cloud-action-grid sync-action-grid">
      <button class="primary-btn" type="button" id="runProfileSyncCheckAgain">Check again</button>
      ${isStudent() ? '<button class="soft-btn" type="button" id="pullProfileFromSupabaseNow">Restore from Supabase</button><button class="soft-btn" type="button" id="pushProfileToSupabaseNow">Save profile now</button>' : ''}
      <button class="soft-btn" type="button" id="openSyncCloudSetup">Cloud setup</button>
    </div>
    <small class="security-note">If profiles/student_state/student_public show an RLS error, run the student cloud tables SQL again in Supabase SQL Editor.</small>
  `);
  $('#runProfileSyncCheckAgain')?.addEventListener('click', () => runSupabaseSyncCheck({ showDetails: true }));
  $('#pullProfileFromSupabaseNow')?.addEventListener('click', () => runSupabaseSyncCheck({ showDetails: true, pullProfile: true }));
  $('#pushProfileToSupabaseNow')?.addEventListener('click', async () => {
    updateProfileSyncStatus('Saving profile…', 'busy');
    const ok = await pushStudentProgressToSupabase();
    showToast(ok ? 'Student profile saved to Supabase' : profileSyncErrorMessage('Profile save failed'));
    runSupabaseSyncCheck({ showDetails: true });
  });
  $('#openSyncCloudSetup')?.addEventListener('click', () => showCloudSetupModal({ allowPublicSetup: true }));
}

async function checkSupabaseTable(tableName, columns = '*') {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase client could not be created.');
  const { error, count } = await client.from(tableName).select(columns, { count: 'exact', head: true });
  if (error) throw error;
  return Number.isFinite(count) ? count : null;
}

async function runSupabaseSyncCheck(options = {}) {
  const { showDetails = true, pullProfile = false } = options || {};
  const rows = [];
  const setup = supabaseSetupStatus();
  updateProfileSyncStatus('Checking Supabase…', 'busy');

  if (!setup.ok) {
    rows.push(syncDiagnosticRow('Supabase configuration', false, setup.reason));
    lastProfileSyncError = new Error(setup.reason);
    updateProfileSyncStatus('Not connected — tap to fix', 'warn');
    if (showDetails) renderSupabaseSyncModal(rows, 'Supabase is not ready in this browser.');
    return false;
  }

  rows.push(syncDiagnosticRow('Supabase configuration', true, 'Project URL, anon key, and SDK are available.'));

  try {
    const contentCount = await checkSupabaseTable(SUPABASE_CONTENT_TABLE, 'id');
    rows.push(syncDiagnosticRow('novamed_content table', true, `Reachable${contentCount === null ? '' : ` • ${contentCount} row(s)`}.`));
  } catch (err) {
    rows.push(syncDiagnosticRow('novamed_content table', false, friendlyAuthError(err)));
  }

  let profilesOk = false;
  try {
    const profileCount = await checkSupabaseTable('profiles', 'id,email,first_name,last_name,display_name,role');
    rows.push(syncDiagnosticRow('profiles table', true, `Reachable${profileCount === null ? '' : ` • ${profileCount} profile(s)`}.`));
    const publicCount = await checkSupabaseTable('student_public', 'user_id,display_name,xp,streak,leaderboard_visible');
    rows.push(syncDiagnosticRow('student_public table', true, `Reachable${publicCount === null ? '' : ` • ${publicCount} public row(s)`}.`));
    const stateCount = await checkSupabaseTable('student_state', 'user_id,total_xp,streak,theme,feature_state');
    rows.push(syncDiagnosticRow('student_state table', true, `Reachable${stateCount === null ? '' : ` • ${stateCount} progress row(s)`}.`));
    profilesOk = true;
  } catch (err) {
    lastProfileSyncError = err;
    rows.push(syncDiagnosticRow('student cloud tables', false, friendlyAuthError(err)));
  }

  try {
    const cfg = getSupabaseConfig();
    const client = getSupabaseClient();
    const { error } = await client.storage.from(cfg.bucket || DEFAULT_SUPABASE_BUCKET).list('', { limit: 1 });
    if (error) throw error;
    rows.push(syncDiagnosticRow('Storage bucket', true, `Bucket ${cfg.bucket || DEFAULT_SUPABASE_BUCKET} is reachable.`));
  } catch (err) {
    rows.push(syncDiagnosticRow('Storage bucket', false, friendlyStorageError(err, getSupabaseConfig().bucket || DEFAULT_SUPABASE_BUCKET).message || friendlyAuthError(err), 'warn'));
  }

  if (isStudent() && profilesOk) {
    try {
      const userId = state.user?.supabaseId || state.user?.studentKey;
      if (!userId) throw new Error('Current student has no Supabase user id. Sign in again with email/password.');
      const client = getSupabaseClient();
      const profileRes = await client.from('profiles').select('id,display_name,email').eq('id', userId).maybeSingle();
      if (profileRes.error) throw profileRes.error;
      const stateRes = await client.from('student_state').select('user_id,total_xp,streak').eq('user_id', userId).maybeSingle();
      if (stateRes.error) throw stateRes.error;
      if (profileRes.data || stateRes.data) {
        rows.push(syncDiagnosticRow('Current student cloud profile', true, `Found as ${profileRes.data?.display_name || state.user.name || 'Student'} • ${Number(stateRes.data?.total_xp || 0).toLocaleString()} XP.`));
        if (pullProfile && typeof syncSimpleStudentProfileOnBoot === 'function') {
          await syncSimpleStudentProfileOnBoot();
          rows.push(syncDiagnosticRow('Restore action', true, 'Supabase Auth profile was restored into this browser session.'));
        }
      } else {
        rows.push(syncDiagnosticRow('Current student cloud profile', false, 'No profile/progress row exists yet. Press Save profile now after signing in.', 'warn'));
      }
    } catch (err) {
      lastProfileSyncError = err;
      rows.push(syncDiagnosticRow('Current student cloud profile', false, friendlyAuthError(err)));
    }
  } else if (!isStudent()) {
    rows.push(syncDiagnosticRow('Current student cloud profile', false, 'Sign in as a student to test restore/push for that account.', 'warn'));
  }

  const hardErrors = rows.filter(row => !row.ok && row.tone !== 'warn');
  const ok = hardErrors.length === 0;
  if (ok) {
    lastProfileSyncError = null;
    lastProfileSyncAt = new Date();
    updateProfileSyncStatus(`Verified ${formatSyncTime(lastProfileSyncAt)}`, 'ready');
  } else {
    updateProfileSyncStatus('Sync problem — tap details', 'warn');
  }
  if (showDetails) renderSupabaseSyncModal(rows, ok ? 'Supabase sync is reachable.' : 'Supabase connected, but one required part still has a problem.');
  return ok;
}

function showCloudSetupModal(options = {}) {
  const opts = typeof options === 'object' && options ? options : {};
  const allowPublicSetup = Boolean(opts.allowPublicSetup);
  const returnToAuth = Boolean(opts.returnToAuth);
  if (!isAdmin() && !allowPublicSetup) { showAuthModal('admin'); return; }
  const cfg = getSupabaseConfig();
  const sdkReady = Boolean(window.supabase);
  const canManageContent = isAdmin();
  showModal(`
    <h2 id="modalTitle">NovaMed Supabase setup</h2>
    <p class="modal-muted">The published app now uses the embedded Supabase Project URL and publishable key. You can still adjust bucket/folder settings here for cloud content, videos, files, and QBank sync.</p>
    ${sdkReady ? '' : '<div class="auth-live-note warning"><b>Supabase SDK not loaded</b><span>Publish online or check your internet connection so the Supabase script can load before cloud sync.</span></div>'}
    <form id="cloudSetupForm" class="form-stack contextual-form">
      <label class="field-label"><span>Project URL</span><input name="url" required placeholder="https://YOUR_PROJECT_REF.supabase.co" value="${esc(cfg.url)}" /></label>
      <label class="field-label"><span>Publishable key</span><input name="anonKey" required placeholder="sb_publishable_..." value="${esc(cfg.anonKey)}" /></label>
      <label class="field-label"><span>Storage bucket</span><input name="bucket" required placeholder="novamed" value="${esc(cfg.bucket || cfg.videoBucket || DEFAULT_SUPABASE_BUCKET)}" /></label>
      <div class="form-row">
        <label class="field-label"><span>Video folder</span><input name="videoFolder" placeholder="focus video" value="${esc(cfg.videoFolder || DEFAULT_VIDEO_FOLDER)}" /></label>
        <label class="field-label"><span>File folder</span><input name="fileFolder" placeholder="novamed-files" value="${esc(cfg.fileFolder || DEFAULT_FILE_FOLDER)}" /></label>
      </div>
      <small class="security-note">Use only the public anon key here. Never paste the service_role key inside the app. The URL and anon key are safe for frontend use when your Supabase RLS policies are enabled.</small>
      <div class="cloud-action-grid ${canManageContent ? '' : 'auth-setup-actions'}">
        <button class="primary-btn" type="submit">Save Supabase setup</button>
        ${returnToAuth ? '<button class="soft-btn" type="button" id="returnToAuthSetup">Back to sign in</button>' : ''}
        ${canManageContent ? '<button class="soft-btn" type="button" id="pullCloudNow">Pull cloud content</button><button class="soft-btn" type="button" id="pushCloudNow">Push current content</button>' : ''}
      </div>
      ${canManageContent ? '<small class="security-note">For public launch, keep upload permissions restricted by Supabase policies. Students should read content; only the owner/admin should upload or edit.</small>' : '<small class="security-note">After saving, return to Sign in. Students use email OTP for signup and email/password for normal login.</small>'}
    </form>
  `);
  $('#cloudSetupForm')?.addEventListener('submit', event => {
    event.preventDefault();
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    saveSupabaseConfig({
      url: form.get('url'),
      anonKey: form.get('anonKey'),
      bucket: form.get('bucket'),
      videoFolder: form.get('videoFolder'),
      fileFolder: form.get('fileFolder')
    });
    showToast('Supabase setup saved');
    if (returnToAuth) {
      authFlowState = { name: authFlowState.name || '', code: '' };
      showAuthModal('student');
    }
  });
  $('#returnToAuthSetup')?.addEventListener('click', () => showAuthModal('student'));
  $('#pullCloudNow')?.addEventListener('click', () => loadContentFromSupabase({ silent: false }));
  $('#pushCloudNow')?.addEventListener('click', () => saveContentToSupabase().then(() => showToast('Current content pushed to Supabase')).catch(err => showToast(`Push failed: ${err.message || 'check setup'}`)));
}

function loadGlobalContent() {
  const legacy = readJson(LEGACY_STATE_KEY, {});
  const saved = readJson(CONTENT_KEY, {});
  const rawVideos = Array.isArray(saved.videos) ? saved.videos : (Array.isArray(legacy.videos) ? legacy.videos : []);
  const rawQuestions = Array.isArray(saved.questions) ? saved.questions : (Array.isArray(legacy.questions) ? legacy.questions : []);
  const rawFocusNotes = Array.isArray(saved.focusNotes) ? saved.focusNotes : [];
  const rawFreeCourses = Array.isArray(saved.freeCourses) ? saved.freeCourses : [];
  return {
    videos: mergeVideoDefaults(rawVideos),
    freeCourses: normalizeFreeCourses(rawFreeCourses),
    questions: mergeQuestionDefaults(rawQuestions),
    focusNotes: mergeFocusNoteDefaults(rawFocusNotes),
    videoCourseTree: normalizeVideoCourseTree(saved.videoCourseTree),
    qbankCourseTree: normalizeQbankCourseTree(saved.qbankCourseTree || saved.videoCourseTree)
  };
}

function persistGlobalContent(options = {}) {
  writeJson(CONTENT_KEY, cloudContentPayload());
  if (!options.skipCloud) scheduleCloudContentSave();
}

function normalizeStudentAccount(account = {}, fallbackKey = '') {
  const name = normalizeStudentName(account.name || account.full_name || fallbackKey || 'Student');
  const studentKey = account.studentKey || account.student_key || studentAccountKey(name || fallbackKey);
  return {
    ...account,
    name,
    studentKey,
    email: account.email || '',
    supabaseUserId: account.supabaseUserId || account.supabaseId || account.id || stableStudentId(studentKey),
    accessCodeHash: account.accessCodeHash || account.access_code_hash || account.codeHash || '',
    profile: normalizeStudentProfile(account.profile && typeof account.profile === 'object' ? account.profile : {}),
    createdAt: account.createdAt || account.created_at || new Date().toISOString(),
    updatedAt: account.updatedAt || account.updated_at || account.profile?.updatedAt || null
  };
}

function getStudents() {
  const raw = readJson(STUDENTS_KEY, {});
  const normalized = {};
  Object.entries(raw || {}).forEach(([key, account]) => {
    const clean = normalizeStudentAccount(account || {}, key);
    if (clean.studentKey) normalized[clean.studentKey] = clean;
  });
  return normalized;
}

function setStudents(students) {
  writeJson(STUDENTS_KEY, students || {});
}

function publicProgressDefaults() {
  return {
    xp: 0,
    streak: 0,
    theme: 'dark',
    mistakes: [],
    videoProgress: {},
    qbankStats: {},
    qbankAttempts: [],
    flashcards: [],
    examReports: [],
    examTargets: {},
    studyRoutePlan: null,
    dailyTodo: normalizeDailyTodo(),
    videoLevel: 'modes',
    selectedMode: null,
    selectedCourse: null,
    selectedTopic: null,
    freeCourseLevel: 'courses',
    selectedFreeCourseId: null,
    selectedFreeChapterId: null,
    qbankLevel: 'modes',
    selectedQMode: null,
    selectedQCourse: null,
    selectedQTopic: null,
    selectedQSubtopic: null,
    selectedQNoteLibrary: null,
    selectedQAnswerMode: 'exam',
    learnRouteCourse: null,
    learnRouteChapter: null,
    learnRouteSelections: {},
    homeWidgetSettings: null
  };
}


function clampPercent(value) {
  return Math.max(0, Math.min(100, Math.round(Number(value || 0))));
}

function safeTimestamp(value = '') {
  const time = Date.parse(value || '');
  return Number.isFinite(time) ? time : 0;
}

function latestTimestamp(...values) {
  return Math.max(...values.map(safeTimestamp), 0);
}

function normalizeVideoProgress(input = {}) {
  const output = {};
  Object.entries(input || {}).forEach(([rawKey, rawValue]) => {
    if (!rawKey) return;
    const value = typeof rawValue === 'number' ? { percent: rawValue } : (rawValue || {});
    const percent = clampPercent(value.percent ?? value.progress ?? 0);
    const now = value.watchedAt || value.updatedAt || value.completedAt || new Date().toISOString();
    output[String(rawKey)] = {
      id: String(value.id || rawKey),
      title: String(value.title || ''),
      mode: String(value.mode || ''),
      course: String(value.course || ''),
      topic: String(value.topic || ''),
      percent,
      currentTime: Math.max(0, Number(value.currentTime || 0)),
      duration: Math.max(0, Number(value.duration || 0)),
      completed: Boolean(value.completed || percent >= 100),
      watchedAt: now,
      updatedAt: value.updatedAt || now
    };
  });
  return output;
}

function questionProgressKey(question = {}) {
  const q = question || {};
  return String(q.id || q.stem || '').toLowerCase().slice(0, 180);
}

function normalizeQbankStats(input = {}) {
  const output = {};
  Object.entries(input || {}).forEach(([rawKey, rawValue]) => {
    if (!rawKey) return;
    const value = rawValue || {};
    output[String(rawKey)] = {
      id: String(value.id || rawKey),
      stem: String(value.stem || ''),
      mode: String(value.mode || ''),
      course: String(value.course || ''),
      topic: String(value.topic || ''),
      subtopic: String(value.subtopic || ''),
      attempts: Math.max(0, Number(value.attempts || 0)),
      correct: Math.max(0, Number(value.correct || 0)),
      wrong: Math.max(0, Number(value.wrong || 0)),
      timeouts: Math.max(0, Number(value.timeouts || 0)),
      lastSelected: value.lastSelected ?? null,
      correctIndex: value.correctIndex ?? null,
      lastResult: value.lastResult || '',
      lastAt: value.lastAt || value.updatedAt || null,
      updatedAt: value.updatedAt || value.lastAt || null
    };
  });
  return output;
}

function normalizeQbankAttempts(input = []) {
  const seen = new Set();
  return (Array.isArray(input) ? input : [])
    .filter(Boolean)
    .map(item => ({
      id: String(item.id || `${item.questionId || 'q'}-${item.at || Date.now()}`),
      questionId: String(item.questionId || ''),
      stem: String(item.stem || '').slice(0, 260),
      mode: String(item.mode || ''),
      course: String(item.course || ''),
      topic: String(item.topic || ''),
      subtopic: String(item.subtopic || ''),
      selected: item.selected ?? null,
      correctIndex: item.correctIndex ?? null,
      isCorrect: Boolean(item.isCorrect),
      timedOut: Boolean(item.timedOut),
      source: String(item.source || 'qbank'),
      at: item.at || new Date().toISOString()
    }))
    .sort((a, b) => safeTimestamp(a.at) - safeTimestamp(b.at))
    .filter(item => {
      const key = item.id || `${item.questionId}-${item.at}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(-500);
}

function mergeMapByTimestamp(local = {}, remote = {}, timestampFields = ['updatedAt']) {
  const output = { ...(local || {}) };
  Object.entries(remote || {}).forEach(([key, remoteValue]) => {
    const localValue = output[key];
    if (!localValue) {
      output[key] = remoteValue;
      return;
    }
    const localTime = latestTimestamp(...timestampFields.map(field => localValue?.[field]));
    const remoteTime = latestTimestamp(...timestampFields.map(field => remoteValue?.[field]));
    output[key] = remoteTime >= localTime ? { ...localValue, ...remoteValue } : { ...remoteValue, ...localValue };
  });
  return output;
}

function mergeMistakes(local = [], remote = []) {
  const byKey = {};
  [...(local || []), ...(remote || [])].forEach(item => {
    if (!item) return;
    const key = item.key || mistakeKey(item.question || {});
    if (!key) return;
    const previous = byKey[key];
    const prevTime = latestTimestamp(previous?.updatedAt, previous?.createdAt);
    const itemTime = latestTimestamp(item.updatedAt, item.createdAt);
    if (!previous || itemTime >= prevTime) byKey[key] = { ...item, key };
  });
  return Object.values(byKey).sort((a, b) => latestTimestamp(b.updatedAt, b.createdAt) - latestTimestamp(a.updatedAt, a.createdAt));
}

function normalizeStudentProfile(profile = {}) {
  const defaults = publicProgressDefaults();
  const source = profile && typeof profile === 'object' ? profile : {};
  return {
    ...defaults,
    ...source,
    xp: Number(source.xp ?? defaults.xp ?? 0),
    streak: Number(source.streak ?? defaults.streak ?? 0),
    theme: source.theme || defaults.theme,
    mistakes: Array.isArray(source.mistakes) ? source.mistakes : [],
    videoProgress: normalizeVideoProgress(source.videoProgress || source.videosWatched || {}),
    qbankStats: normalizeQbankStats(source.qbankStats || source.mcqStats || {}),
    qbankAttempts: normalizeQbankAttempts(source.qbankAttempts || source.mcqAttempts || []),
    flashcards: Array.isArray(source.flashcards) ? source.flashcards : [],
    examReports: Array.isArray(source.examReports) ? source.examReports : [],
    examTargets: source.examTargets && typeof source.examTargets === 'object' ? source.examTargets : {},
    studyRoutePlan: source.studyRoutePlan && typeof source.studyRoutePlan === 'object' ? source.studyRoutePlan : null,
    dailyTodo: normalizeDailyTodo(source.dailyTodo),
    learnRouteSelections: source.learnRouteSelections && typeof source.learnRouteSelections === 'object' ? source.learnRouteSelections : {},
    homeWidgetSettings: source.homeWidgetSettings && typeof source.homeWidgetSettings === 'object' ? source.homeWidgetSettings : (defaults.homeWidgetSettings || null),
    updatedAt: source.updatedAt || source.syncedAt || null
  };
}

function mergeStudentProfiles(localProfile = {}, remoteProfile = {}) {
  const local = normalizeStudentProfile(localProfile);
  const remote = normalizeStudentProfile(remoteProfile);
  const remoteNewer = latestTimestamp(remote.updatedAt) >= latestTimestamp(local.updatedAt);
  const base = remoteNewer ? { ...local, ...remote } : { ...remote, ...local };
  return normalizeStudentProfile({
    ...base,
    xp: Math.max(Number(local.xp || 0), Number(remote.xp || 0)),
    streak: remoteNewer ? remote.streak : local.streak,
    mistakes: mergeMistakes(local.mistakes, remote.mistakes),
    videoProgress: normalizeVideoProgress(mergeMapByTimestamp(local.videoProgress, remote.videoProgress, ['updatedAt', 'watchedAt', 'completedAt'])),
    qbankStats: normalizeQbankStats(mergeMapByTimestamp(local.qbankStats, remote.qbankStats, ['updatedAt', 'lastAt'])),
    qbankAttempts: normalizeQbankAttempts([...(local.qbankAttempts || []), ...(remote.qbankAttempts || [])]),
    examTargets: remoteNewer ? { ...(local.examTargets || {}), ...(remote.examTargets || {}) } : { ...(remote.examTargets || {}), ...(local.examTargets || {}) },
    studyRoutePlan: remoteNewer ? (remote.studyRoutePlan || local.studyRoutePlan || null) : (local.studyRoutePlan || remote.studyRoutePlan || null),
    updatedAt: new Date().toISOString()
  });
}

function mergeStudentAccounts(localAccount = null, remoteAccount = null) {
  if (!localAccount && !remoteAccount) return null;
  if (!localAccount) return normalizeStudentAccount(remoteAccount || {}, remoteAccount?.studentKey || remoteAccount?.student_key || remoteAccount?.name);
  if (!remoteAccount) return normalizeStudentAccount(localAccount || {}, localAccount?.studentKey || localAccount?.student_key || localAccount?.name);
  const local = normalizeStudentAccount(localAccount, localAccount.studentKey || localAccount.student_key || localAccount.name);
  const remote = normalizeStudentAccount(remoteAccount, remoteAccount.studentKey || remoteAccount.student_key || remoteAccount.name);
  const remoteNewer = latestTimestamp(remote.updatedAt, remote.profile?.updatedAt) >= latestTimestamp(local.updatedAt, local.profile?.updatedAt);
  const base = remoteNewer ? { ...local, ...remote } : { ...remote, ...local };
  return normalizeStudentAccount({
    ...base,
    name: remote.full_name || remote.name || local.name,
    studentKey: local.studentKey || remote.studentKey,
    accessCodeHash: remote.accessCodeHash || local.accessCodeHash,
    supabaseUserId: remote.supabaseUserId || local.supabaseUserId,
    profile: mergeStudentProfiles(local.profile, remote.profile),
    createdAt: local.createdAt || remote.createdAt,
    updatedAt: new Date().toISOString()
  }, local.studentKey || remote.studentKey);
}

function studentSnapshot() {
  return normalizeStudentProfile({
    xp: Number(state.xp || 0),
    streak: Number(state.streak || 0),
    theme: state.theme || 'dark',
    mistakes: Array.isArray(state.mistakes) ? state.mistakes : [],
    videoProgress: normalizeVideoProgress(state.videoProgress || {}),
    qbankStats: normalizeQbankStats(state.qbankStats || {}),
    qbankAttempts: normalizeQbankAttempts(state.qbankAttempts || []),
    flashcards: Array.isArray(state.flashcards) ? state.flashcards : [],
    examReports: Array.isArray(state.examReports) ? state.examReports : [],
    examTargets: typeof readExamTargets === 'function' ? readExamTargets() : {},
    studyRoutePlan: typeof readStudyRoutePlan === 'function' ? readStudyRoutePlan() : null,
    dailyTodo: normalizeDailyTodo(state.dailyTodo),
    learnRouteCourse: state.learnRouteCourse || null,
    learnRouteChapter: state.learnRouteChapter || null,
    learnRouteSelections: state.learnRouteSelections || {},
    homeWidgetSettings: typeof readHomeWidgetSettingsV80 === 'function' ? readHomeWidgetSettingsV80() : (state.homeWidgetSettings || null),
    videoLevel: state.videoLevel || 'modes',
    selectedMode: state.selectedMode || null,
    selectedCourse: state.selectedCourse || null,
    selectedTopic: state.selectedTopic || null,
    qbankLevel: state.qbankLevel || 'modes',
    selectedQMode: state.selectedQMode || null,
    selectedQCourse: state.selectedQCourse || null,
    selectedQTopic: state.selectedQTopic || null,
    selectedQSubtopic: state.selectedQSubtopic || null,
    selectedQNoteLibrary: state.selectedQNoteLibrary || null,
    selectedQAnswerMode: state.selectedQAnswerMode || 'exam',
    updatedAt: new Date().toISOString()
  });
}


function saveStudentProgress() {
  if (!isStudent()) return;
  const students = getStudents();
  const studentKey = studentIdentityFromUser(state.user);
  if (!studentKey || !students[studentKey]) return;
  students[studentKey].name = state.user.name || students[studentKey].name;
  students[studentKey].studentKey = studentKey;
  students[studentKey].supabaseUserId = state.user.supabaseId || students[studentKey].supabaseUserId || stableStudentId(studentKey);
  students[studentKey].profile = studentSnapshot();
  setStudents(students);
  scheduleStudentProfileSave();
}

function setSession(user) {
  if (!user) {
    localStorage.removeItem(SESSION_KEY);
    return;
  }
  const studentKey = user.studentKey || (user.role === 'student' ? studentAccountKey(user.name || user.email || '') : '');
  writeJson(SESSION_KEY, {
    role: user.role,
    name: user.name,
    email: user.email || '',
    studentKey,
    supabaseId: user.supabaseId || user.supabaseUserId || (studentKey ? stableStudentId(studentKey) : ''),
    signedAt: new Date().toISOString()
  });
}

const lectureModes = [
  {
    id: 'detailed',
    icon: '📚',
    title: 'Detailed Lectures',
    subtitle: 'Full course lectures',
    description: 'Complete explanatory lectures organized like a real medical curriculum.',
    cta: 'Enter detailed library'
  },
  {
    id: 'focused',
    icon: '⚡',
    title: 'Focused & High‑Yield',
    subtitle: 'Fast exam-focused videos',
    description: 'Short focused lectures for rapid revision, MCQ traps, and high-yield memory.',
    cta: 'Enter focused mode'
  }
];


const qbankModes = [
  {
    id: 'detailed',
    icon: '🧠',
    title: 'QBank',
    subtitle: 'MCQ practice',
    description: 'Standard MCQs organized by branch, system, and lecture for deep understanding.',
    cta: 'Enter QBank'
  }
];

const defaultCourseTree = {
  detailed: [
    { id: 'medicine', icon: '🩺', title: 'Medicine', subtitle: 'Systems-based complete lectures', topics: ['Cardiology', 'GIT', 'Respiratory', 'Neurology', 'Nephrology', 'Endocrine', 'Hematology'] },
    { id: 'pediatrics', icon: '👶', title: 'Pediatrics', subtitle: 'Growth, neonates, emergencies', topics: ['Neonatology', 'Growth', 'Respiratory', 'Infectious', 'Nutrition'] },
    { id: 'surgery', icon: '🛠️', title: 'Surgery', subtitle: 'General surgery and emergencies', topics: ['Trauma', 'Acute Abdomen', 'GI Surgery', 'Vascular', 'Urology'] },
    { id: 'obstetrics', icon: '🤰', title: 'Obstetrics', subtitle: 'Pregnancy, labor, emergencies', topics: ['Antenatal Care', 'Labor', 'Emergencies', 'Hypertension', 'Bleeding'] },
    { id: 'microbiology', icon: '🧫', title: 'Microbiology', subtitle: 'Bacteria, viruses, immunity', topics: ['Bacteriology', 'Virology', 'Mycology', 'Parasitology', 'Immunology'] },
    { id: 'community', icon: '🌍', title: 'Community Medicine', subtitle: 'Epidemiology and prevention', topics: ['Study Designs', 'Screening', 'Prevention', 'Biostatistics', 'Bias'] }
  ],
  focused: [
    { id: 'medicine', icon: '🫀', title: 'Focused Medicine', subtitle: 'High-yield internal medicine', topics: ['Cardio', 'GIT', 'Respiratory', 'Nephrology', 'Endocrine', 'Neurology', 'Hematology'] },
    { id: 'pediatrics', icon: '🧸', title: 'Focused Pediatric', subtitle: 'Exam points and red flags', topics: ['Neonatal', 'Vaccines', 'Growth', 'Respiratory', 'GIT'] },
    { id: 'surgery', icon: '🩹', title: 'Focused Surgery', subtitle: 'Emergency algorithms and traps', topics: ['Trauma', 'Acute Abdomen', 'Burns', 'Hernia', 'Shock'] },
    { id: 'obstetrics', icon: '🍼', title: 'Focused Obstetric', subtitle: 'Obstetric emergencies and algorithms', topics: ['Emergencies', 'Bleeding', 'Hypertension', 'Labor', 'Infections'] },
    { id: 'microbiology', icon: '🦠', title: 'Focused Microbiology', subtitle: 'Organisms, virulence, drugs', topics: ['Bacteria', 'Viruses', 'Antibiotics', 'Parasites', 'Fungi'] },
    { id: 'community', icon: '📊', title: 'Focused Community', subtitle: 'MCQ-ready epidemiology', topics: ['Study Designs', 'Screening', 'Risk Measures', 'Bias', 'Prevention'] }
  ]
};



function cloneVideoCourseTree(tree = defaultCourseTree) {
  return JSON.parse(JSON.stringify(tree || defaultCourseTree));
}

function normalizeCourse(course = {}, index = 0) {
  const title = String(course.title || `Course ${index + 1}`).trim();
  const id = String(course.id || makeSlug(title) || `course-${index + 1}`).trim();
  return {
    id,
    icon: course.icon || '📚',
    title,
    subtitle: String(course.subtitle || 'Custom course').trim(),
    topics: Array.isArray(course.topics) ? course.topics.map(topicTitle).filter(Boolean) : []
  };
}

function normalizeVideoCourseTree(tree) {
  if (!tree || typeof tree !== 'object') return cloneVideoCourseTree(defaultCourseTree);
  const output = { detailed: [], focused: [] };
  ['detailed', 'focused'].forEach(mode => {
    const list = Array.isArray(tree[mode]) ? tree[mode] : defaultCourseTree[mode];
    output[mode] = list.map(normalizeCourse);
  });
  return output;
}

function activeVideoCourseTree() {
  if (!state || !state.videoCourseTree) return cloneVideoCourseTree(defaultCourseTree);
  return normalizeVideoCourseTree(state.videoCourseTree);
}

function setVideoCourseTree(nextTree) {
  state.videoCourseTree = normalizeVideoCourseTree(nextTree);
  saveState();
  renderVideos();
}

function updateVideoCourseTree(mutator) {
  const next = cloneVideoCourseTree(activeVideoCourseTree());
  mutator(next);
  setVideoCourseTree(next);
}

function cloneQbankCourseTree(tree = defaultCourseTree) {
  return JSON.parse(JSON.stringify(tree || defaultCourseTree));
}

function normalizeQbankCourseTree(tree) {
  if (!tree || typeof tree !== 'object') return cloneQbankCourseTree(defaultCourseTree);
  const output = { detailed: [], focused: [] };
  ['detailed', 'focused'].forEach(mode => {
    const list = Array.isArray(tree[mode]) ? tree[mode] : defaultCourseTree[mode];
    output[mode] = list.map(normalizeCourse);
  });
  return output;
}

function activeQbankCourseTree() {
  if (!state || !state.qbankCourseTree) return cloneQbankCourseTree(defaultCourseTree);
  return normalizeQbankCourseTree(state.qbankCourseTree);
}

function setQbankCourseTree(nextTree) {
  state.qbankCourseTree = normalizeQbankCourseTree(nextTree);
  saveState();
  renderQbank();
}

function updateQbankCourseTree(mutator) {
  const next = cloneQbankCourseTree(activeQbankCourseTree());
  mutator(next);
  setQbankCourseTree(next);
}

function currentQbankPathReady() {
  return Boolean(state.selectedQMode && state.selectedQCourse && state.selectedQTopic && state.selectedQSubtopic && state.qbankLevel === 'set');
}

function currentQbankPathLabel(question = null) {
  const mode = getQMode(question?.mode || state.selectedQMode);
  const course = getQCourse(question?.mode || state.selectedQMode, question?.course || state.selectedQCourse);
  const topic = question?.topic || state.selectedQTopic;
  const sub = question?.subtopic || state.selectedQSubtopic;
  const lib = (question?.mode || state.selectedQMode) === 'focused' ? getNoteLibrary(question?.library || state.selectedQNoteLibrary)?.title : null;
  return `${mode?.title || 'QBank'}${lib ? ` › ${lib}` : ''} › ${course?.title || 'Course'} › ${topic || 'Topic'}${sub ? ` › ${sub}` : ''}`;
}

function topicTitle(topic) {
  return typeof topic === 'string' ? topic : String(topic?.title || topic?.name || 'General');
}

function makeSlug(text = '') {
  return String(text).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'course';
}

function uniqueCourseId(title, courses) {
  const base = makeSlug(title);
  let id = base;
  let i = 2;
  while ((courses || []).some(course => course.id === id)) {
    id = `${base}-${i++}`;
  }
  return id;
}

function currentVideoPathReady() {
  return Boolean(state.selectedMode && state.selectedCourse && state.selectedTopic && state.videoLevel === 'list');
}

function currentVideoCourse() {
  return getCourse(state.selectedMode, state.selectedCourse);
}

function currentVideoPathLabel(video = null) {
  const mode = getMode(video?.mode || state.selectedMode);
  const course = getCourse(video?.mode || state.selectedMode, video?.course || state.selectedCourse);
  const topic = video?.topic || state.selectedTopic;
  return `${mode?.title || 'Lecture library'} › ${course?.title || 'Course'} › ${topic || 'Topic'}`;
}

function formatDuration(seconds) {
  const total = Math.round(Number(seconds || 0));
  if (!total) return 'Auto';
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = total % 60;
  if (h) return `${h}h ${String(m).padStart(2, '0')}m`;
  if (m) return `${m} min${sec ? ` ${sec}s` : ''}`;
  return `${sec}s`;
}

function readVideoFileDuration(file) {
  return new Promise(resolve => {
    if (!file || !file.type?.startsWith('video/')) return resolve(null);
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);
    const cleanup = () => URL.revokeObjectURL(url);
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      const duration = Number.isFinite(video.duration) ? video.duration : null;
      cleanup();
      resolve(duration);
    };
    video.onerror = () => { cleanup(); resolve(null); };
    video.src = url;
  });
}

function readFileAsDataUrl(file, maxBytes = 5 * 1024 * 1024) {
  return new Promise(resolve => {
    if (!file || !file.size) return resolve({ name: '', data: '' });
    if (file.size > maxBytes) {
      showToast('Lecture file is linked by name only because it is larger than 5 MB');
      return resolve({ name: file.name || '', data: '' });
    }
    const reader = new FileReader();
    reader.onload = () => resolve({ name: file.name || '', data: String(reader.result || '') });
    reader.onerror = () => resolve({ name: file.name || '', data: '' });
    reader.readAsDataURL(file);
  });
}

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const esc = value => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));


function getPickerCurrentOption(select) {
  if (!select) return null;
  const option = select.options?.[select.selectedIndex] || null;
  if (!option) return null;
  return {
    value: String(option.value ?? ''),
    label: String(option.textContent || '').trim(),
    disabled: Boolean(option.disabled)
  };
}

function syncPickerButtonFromSelect(button, select, config = {}) {
  if (!button) return;
  const current = getPickerCurrentOption(select);
  const placeholder = config.placeholder || button.dataset.placeholder || 'Choose an option';
  const readyHint = config.readyHint || button.dataset.readyHint || 'Tap to choose';
  const disabledHint = config.disabledHint || button.dataset.disabledHint || 'Select the previous step first';
  const active = Boolean(current && !current.disabled && current.label && (!/^choose\b/i.test(current.label) || current.value !== ''));
  button.disabled = Boolean(select?.disabled);
  button.classList.toggle('is-empty', !active);
  button.classList.toggle('is-disabled', Boolean(select?.disabled));
  const title = active ? current.label : placeholder;
  const subtitle = button.disabled ? disabledHint : (active ? readyHint : readyHint);
  button.innerHTML = `
    <span class="picker-button-copy">
      <strong>${esc(title)}</strong>
      <small>${esc(subtitle)}</small>
    </span>
    <span class="picker-button-arrow" aria-hidden="true">›</span>
  `;
}

function closePickerSheet() {
  const sheet = document.querySelector('.picker-sheet-backdrop');
  if (!sheet) return;
  sheet.classList.remove('show');
  setTimeout(() => sheet.remove(), 180);
}

function openNativeSelectSheet({ select, title = 'Choose', subtitle = 'Pick one option.', emptyText = 'No options available yet.', includeEmptyValue = false }) {
  if (!select || select.disabled) return;
  closePickerSheet();
  const options = [...(select.options || [])]
    .filter(option => !option.disabled)
    .filter(option => {
      if (option.value !== '') return true;
      if (includeEmptyValue) return true;
      const label = String(option.textContent || '').trim();
      return label && !/^choose\b/i.test(label);
    })
    .map(option => ({ value: String(option.value ?? ''), label: String(option.textContent || '').trim(), selected: option.selected }));

  const backdrop = document.createElement('div');
  backdrop.className = 'picker-sheet-backdrop';
  backdrop.innerHTML = `
    <div class="picker-sheet-card" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <button class="close-btn picker-sheet-close" type="button" aria-label="Close">×</button>
      <div class="picker-sheet-head">
        <span class="eyebrow">Choose</span>
        <h2>${esc(title)}</h2>
        <p class="modal-muted">${esc(subtitle)}</p>
      </div>
      <div class="picker-sheet-list"></div>
    </div>
  `;
  document.body.appendChild(backdrop);
  requestAnimationFrame(() => backdrop.classList.add('show'));

  const list = backdrop.querySelector('.picker-sheet-list');
  if (!list) return;
  if (!options.length) {
    list.innerHTML = `<div class="picker-sheet-empty">${esc(emptyText)}</div>`;
  } else {
    options.forEach(option => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `picker-option-btn ${option.selected ? 'active' : ''}`;
      btn.innerHTML = `<span class="picker-option-copy"><strong>${esc(option.label)}</strong>${option.selected ? '<small>Selected</small>' : '<small>Tap to choose</small>'}</span><span class="picker-option-check">${option.selected ? '✓' : '+'}</span>`;
      btn.addEventListener('click', () => {
        select.value = option.value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
        closePickerSheet();
      });
      list.appendChild(btn);
    });
  }

  backdrop.addEventListener('click', event => {
    if (event.target === backdrop || event.target.closest('.picker-sheet-close')) closePickerSheet();
  });
}

function bindNativePickerButton(button, select, config = {}) {
  if (!button || !select || button.dataset.pickerBound) return;
  button.dataset.pickerBound = '1';
  if (config.placeholder) button.dataset.placeholder = config.placeholder;
  if (config.readyHint) button.dataset.readyHint = config.readyHint;
  if (config.disabledHint) button.dataset.disabledHint = config.disabledHint;
  button.addEventListener('click', () => openNativeSelectSheet({
    select,
    title: config.title || 'Choose',
    subtitle: config.subtitle || 'Pick one option.',
    emptyText: config.emptyText || 'No options available yet.',
    includeEmptyValue: Boolean(config.includeEmptyValue)
  }));
}

function inferCourse(subject = '') {
  const s = subject.toLowerCase();
  if (s.includes('cardio') || s.includes('git') || s.includes('resp') || s.includes('medicine')) return 'medicine';
  if (s.includes('pedia')) return 'pediatrics';
  if (s.includes('surg')) return 'surgery';
  if (s.includes('ob') || s.includes('gyn') || s.includes('obst')) return 'obstetrics';
  if (s.includes('micro')) return 'microbiology';
  if (s.includes('community') || s.includes('epid')) return 'community';
  return 'medicine';
}

function inferTopic(video = {}) {
  const text = `${video.topic || ''} ${video.subject || ''} ${video.title || ''}`.toLowerCase();
  if (text.includes('heart') || text.includes('ecg') || text.includes('cardio')) return video.mode === 'focused' ? 'Cardio' : 'Cardiology';
  if (text.includes('git') || text.includes('abdomen')) return 'GIT';
  if (text.includes('resp') || text.includes('asthma') || text.includes('copd')) return 'Respiratory';
  if (text.includes('pph') || text.includes('emergency')) return 'Emergencies';
  if (text.includes('case-control') || text.includes('cohort')) return 'Study Designs';
  if (text.includes('gram') || text.includes('bacteria')) return 'Bacteriology';
  return video.topic || 'General';
}

function normalizeVideo(video) {
  const mode = video.mode || (String(video.difficulty || '').toLowerCase().includes('high') ? 'focused' : 'detailed');
  const course = video.course || inferCourse(video.subject || video.title);
  return {
    ...video,
    mode,
    course,
    topic: video.topic || inferTopic({ ...video, mode }),
    subject: video.subject || course,
    duration: video.duration || 'New',
    difficulty: video.difficulty || (mode === 'focused' ? 'High-yield' : 'Medium'),
    progress: Number(video.progress || 0),
    lectureLink: String(video.lectureLink || '').trim(),
    lectureFileName: String(video.lectureFileName || video.pdfFileName || video.attachmentName || '').trim(),
    lectureFileData: String(video.lectureFileData || video.pdfFileData || '').trim(),
    lectureFilePath: String(video.lectureFilePath || video.pdfFilePath || '').trim(),
    lectureFileBucket: String(video.lectureFileBucket || video.pdfFileBucket || '').trim(),
    pdfFileName: String(video.pdfFileName || video.lectureFileName || video.attachmentName || '').trim(),
    pdfFileData: String(video.pdfFileData || video.lectureFileData || '').trim(),
    pdfFilePath: String(video.pdfFilePath || video.lectureFilePath || '').trim(),
    pdfFileBucket: String(video.pdfFileBucket || video.lectureFileBucket || '').trim(),
    highYieldFileName: String(video.highYieldFileName || '').trim(),
    highYieldFileData: String(video.highYieldFileData || '').trim(),
    highYieldFilePath: String(video.highYieldFilePath || '').trim(),
    highYieldFileBucket: String(video.highYieldFileBucket || '').trim(),
    highYieldNoteText: String(video.highYieldNoteText || '').trim(),
    videoStoragePath: String(video.videoStoragePath || '').trim(),
    videoBucket: String(video.videoBucket || '').trim(),
    quickNotes: String(video.quickNotes || '').trim(),
    highYieldQuestions: Array.isArray(video.highYieldQuestions) ? video.highYieldQuestions.map(x => String(x || '').trim()).filter(Boolean) : String(video.highYieldQuestions || '').split(/\n+/).map(x => x.trim()).filter(Boolean)
  };
}

function mergeVideoDefaults(savedVideos = []) {
  const merged = [...savedVideos.map(normalizeVideo), ...defaultVideos.map(normalizeVideo)];
  const seen = new Set();
  return merged.filter(video => {
    const key = `${video.title}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}


function inferQuestionCourse(question = {}) {
  return question.course || inferCourse(`${question.subject || ''} ${question.topic || ''} ${question.stem || ''}`);
}

function inferQuestionTopic(question = {}) {
  const text = `${question.topic || ''} ${question.subject || ''} ${question.stem || ''} ${question.explanation || ''}`.toLowerCase();
  const focused = question.mode === 'focused';
  if (text.includes('aortic') || text.includes('murmur') || text.includes('ecg') || text.includes('atrial') || text.includes('cardio')) return focused ? 'Cardio' : 'Cardiology';
  if (text.includes('pancreatitis') || text.includes('abdomen') || text.includes('git')) return 'GIT';
  if (text.includes('asthma') || text.includes('copd') || text.includes('wheeze') || text.includes('resp')) return 'Respiratory';
  if (text.includes('pph') || text.includes('postpartum') || text.includes('emergency')) return 'Emergencies';
  if (text.includes('atls') || text.includes('trauma')) return 'Trauma';
  if (text.includes('neonate') || text.includes('jaundice')) return focused ? 'Neonatal' : 'Neonatology';
  if (text.includes('case-control') || text.includes('cohort') || text.includes('odds ratio')) return 'Study Designs';
  if (text.includes('screening') || text.includes('sensitivity')) return 'Screening';
  if (text.includes('staph') || text.includes('bacteria') || text.includes('gram')) return focused ? 'Bacteria' : 'Bacteriology';
  return question.topic || 'General';
}


function qbankSubtopicKey({ mode, course, topic } = {}) {
  return [mode || state.selectedQMode || 'detailed', course || state.selectedQCourse || 'course', topic || state.selectedQTopic || 'topic'].join('|');
}

const defaultQbankSubtopics = {
  'medicine|Cardio': ['Valve Disease', 'Heart Failure', 'Infective Endocarditis', 'Arrhythmias & ECG', 'Hypertension'],
  'medicine|Cardiology': ['Valve Disease', 'Heart Failure', 'Infective Endocarditis', 'Arrhythmias & ECG', 'Hypertension'],
  'medicine|Respiratory': ['Asthma & COPD', 'Pneumonia', 'Pulmonary Embolism', 'Pleural Disease'],
  'medicine|GIT': ['Acute Abdomen', 'Liver Disease', 'GI Bleeding', 'Pancreatitis'],
  'obstetrics|Bleeding': ['Postpartum Haemorrhage', 'Antepartum Haemorrhage', 'Placenta Previa', 'Placental Abruption'],
  'surgery|Trauma': ['Primary Survey', 'Shock', 'Head Injury', 'Chest Trauma'],
  'community|Study Designs': ['Case-Control', 'Cohort', 'Cross-Sectional', 'Clinical Trials']
};

function defaultSubtopicsFor(course, topic) {
  const key = `${course || ''}|${topic || ''}`;
  const compact = String(topic || '').toLowerCase();
  if (defaultQbankSubtopics[key]) return defaultQbankSubtopics[key];
  if (compact.includes('cardio')) return defaultQbankSubtopics['medicine|Cardio'];
  if (compact.includes('resp')) return defaultQbankSubtopics['medicine|Respiratory'];
  if (compact.includes('bleed')) return defaultQbankSubtopics['obstetrics|Bleeding'];
  return ['Core Concepts', 'Management', 'High-Yield Traps'];
}

function inferQuestionSubtopic(question = {}) {
  const text = [question.subtopic, question.chapter, question.lecture, question.topic, question.stem, question.explanation, question.takeaway].join(' ').toLowerCase();
  if (text.includes('endocard')) return 'Infective Endocarditis';
  if (text.includes('murmur') || text.includes('stenosis') || text.includes('regurg') || text.includes('valve')) return 'Valve Disease';
  if (text.includes('heart failure') || text.includes('hf ') || text.includes('ejection fraction')) return 'Heart Failure';
  if (text.includes('ecg') || text.includes('arrhythm') || text.includes('atrial') || text.includes('rhythm')) return 'Arrhythmias & ECG';
  if (text.includes('hypertension')) return 'Hypertension';
  if (text.includes('pph') || text.includes('postpartum haemorrhage') || text.includes('postpartum hemorrhage') || text.includes('atony')) return 'Postpartum Haemorrhage';
  if (text.includes('placenta previa')) return 'Placenta Previa';
  if (text.includes('abruption')) return 'Placental Abruption';
  if (text.includes('asthma') || text.includes('copd')) return 'Asthma & COPD';
  if (text.includes('pneumonia')) return 'Pneumonia';
  if (text.includes('pulmonary embol')) return 'Pulmonary Embolism';
  if (text.includes('cohort')) return 'Cohort';
  if (text.includes('case-control') || text.includes('case control')) return 'Case-Control';
  return 'Core Concepts';
}

function getStoredQbankSubtopics(mode, course, topic) {
  const key = qbankSubtopicKey({ mode, course, topic });
  const raw = state.qbankSubtopics && Array.isArray(state.qbankSubtopics[key]) ? state.qbankSubtopics[key] : [];
  return raw.map(x => String(x || '').trim()).filter(Boolean);
}

function getQbankSubtopics(mode = state.selectedQMode, course = state.selectedQCourse, topic = state.selectedQTopic) {
  const fromQuestions = (state.questions || [])
    .filter(q => q.mode === mode && q.course === course && q.topic === topic)
    .map(q => q.subtopic || q.lecture || inferQuestionSubtopic(q))
    .filter(Boolean);
  const stored = getStoredQbankSubtopics(mode, course, topic);
  const base = [...stored, ...fromQuestions];
  const list = base.length ? base : defaultSubtopicsFor(course, topic);
  return [...new Set(list.map(x => String(x || '').trim()).filter(Boolean))];
}

function countQuestionsInSubtopic(subtopic) {
  return questionsFor({ mode: state.selectedQMode, course: state.selectedQCourse, topic: state.selectedQTopic, subtopic }).length;
}

function addQbankSubtopic() {
  const title = prompt('New lecture name, e.g. Arrhythmia');
  if (!title || !title.trim()) return;
  const key = qbankSubtopicKey();
  state.qbankSubtopics = state.qbankSubtopics || {};
  const list = Array.isArray(state.qbankSubtopics[key]) ? state.qbankSubtopics[key] : [];
  if (!list.some(item => item.toLowerCase() === title.trim().toLowerCase())) list.push(title.trim());
  state.qbankSubtopics[key] = list;
  saveState();
  renderQbank();
  showToast('Lecture added');
}

function deleteQbankSubtopic(name) {
  if (!name) return;
  const count = countQuestionsInSubtopic(name);
  if (count) {
    showToast('Move or delete MCQs inside this lecture first');
    return;
  }
  if (!confirm(`Delete lecture "${name}"?`)) return;
  const key = qbankSubtopicKey();
  state.qbankSubtopics = state.qbankSubtopics || {};
  state.qbankSubtopics[key] = (state.qbankSubtopics[key] || []).filter(item => item !== name);
  saveState();
  renderQbank();
  showToast('Lecture deleted');
}


function normalizeQuestion(question) {
  const mode = question.mode || 'focused';
  const course = question.course || inferQuestionCourse({ ...question, mode });
  const topic = question.topic || inferQuestionTopic({ ...question, mode, course });
  const cleanedOptions = Array.isArray(question.options)
    ? question.options.map(x => String(x ?? '').trim()).filter(Boolean).slice(0, 6)
    : ['', '', '', ''];
  const options = cleanedOptions.length >= 3 ? cleanedOptions : ['', '', '', ''];
  const correctRaw = Number(question.correct || 0);
  const normalized = {
    ...question,
    mode,
    course,
    topic,
    subtopic: String(question.subtopic || question.lecture || question.chapter || inferQuestionSubtopic({ ...question, mode, course, topic })).trim(),
    difficulty: question.difficulty || 'Medium',
    options,
    correct: Math.max(0, Math.min(options.length - 1, Number.isFinite(correctRaw) ? correctRaw : 0)),
    wrong: question.wrong || ['Review why the other options do not match the stem.', 'Compare the stem clues with the correct answer.', 'Repeat this topic again in review mode.'],
    takeaway: question.takeaway || 'Focus on the key clue in the question stem.'
  };
  return normalized;
}

function mergeQuestionDefaults(savedQuestions = []) {
  const merged = [...(Array.isArray(savedQuestions) ? savedQuestions : []).map(normalizeQuestion)];
  const seen = new Set();
  return merged.filter(question => {
    const key = `${question.stem}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}


function normalizeFocusNote(note = {}) {
  const mode = 'focused';
  const course = note.course || inferCourse(`${note.title || ''} ${note.topic || ''}`);
  return {
    id: Number(note.id || Date.now()),
    mode,
    library: note.library || 'hy-notes',
    course,
    topic: note.topic || 'General',
    subtopic: String(note.subtopic || note.chapter || note.lecture || note.title || 'Core Notes').trim(),
    title: String(note.title || 'High-yield note').trim(),
    subtitle: String(note.subtitle || 'Focused revision approach').trim(),
    pearl: String(note.pearl || note.takeaway || 'Look for the key clue in the stem.').trim(),
    sections: Array.isArray(note.sections) ? note.sections.map(section => ({
      heading: String(section.heading || 'Key points').trim(),
      points: Array.isArray(section.points) ? section.points.map(p => String(p || '').trim()).filter(Boolean) : String(section.points || '').split(/\n+/).map(p => p.trim()).filter(Boolean)
    })).filter(section => section.points.length) : [],
    patterns: Array.isArray(note.patterns) ? note.patterns.map(item => ({ clue: String(item.clue || '').trim(), think: String(item.think || '').trim() })).filter(item => item.clue || item.think) : [],
    ladder: Array.isArray(note.ladder) ? note.ladder.map(x => String(x || '').trim()).filter(Boolean) : String(note.ladder || '').split(/\n+/).map(x => x.trim()).filter(Boolean),
    takeaway: String(note.takeaway || note.pearl || 'High-yield takeaway.').trim()
  };
}

function mergeFocusNoteDefaults(savedNotes = []) {
  const merged = [...savedNotes.map(normalizeFocusNote), ...defaultFocusNotes.map(normalizeFocusNote)];
  const seen = new Set();
  return merged.filter(note => {
    const key = `${note.course}|${note.topic}|${note.title}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function focusNotesFor({ library, course, topic, subtopic } = {}) {
  return (state.focusNotes || []).filter(note => {
    const noteLibrary = note.library || 'hy-notes';
    if (library && noteLibrary !== library) return false;
    if (course && note.course !== course) return false;
    if (topic && note.topic !== topic) return false;
    if (subtopic && focusSubtopicName(note) !== subtopic) return false;
    return true;
  });
}

function countFocusNotes(filter = {}) {
  return focusNotesFor(filter).length;
}

function saveFocusNote(note) {
  const item = normalizeFocusNote(note);
  const idx = state.focusNotes.findIndex(existing => existing.id === item.id);
  if (idx >= 0) state.focusNotes[idx] = item;
  else state.focusNotes.unshift(item);
  saveState();
}

function deleteFocusNote(id) {
  const note = state.focusNotes.find(item => item.id === id);
  if (!note) return;
  if (!confirm(`Delete focused note: ${note.title}?`)) return;
  state.focusNotes = state.focusNotes.filter(item => item.id !== id);
  saveState();
  renderQbank();
  showToast('Focused note deleted');
}

function parseLines(text) {
  return String(text || '').split(/\n+/).map(x => x.trim()).filter(Boolean);
}

function parsePatterns(text) {
  return parseLines(text).map(line => {
    const parts = line.split(/\s*(?:→|=>|=|:|-{2,})\s*/);
    return { clue: (parts[0] || line).trim(), think: (parts.slice(1).join(' → ') || '').trim() };
  }).filter(item => item.clue || item.think);
}

function sectionsToText(sections = []) {
  return (sections || []).map(section => `${section.heading}\n${(section.points || []).map(p => `- ${p}`).join('\n')}`).join('\n\n');
}

function parseSections(text) {
  const blocks = String(text || '').split(/\n\s*\n/).map(block => block.trim()).filter(Boolean);
  return blocks.map(block => {
    const lines = block.split(/\n+/).map(line => line.trim()).filter(Boolean);
    const heading = lines[0] || 'Key points';
    const points = lines.slice(1).map(line => line.replace(/^[-•]\s*/, '')).filter(Boolean);
    return { heading, points: points.length ? points : [heading] };
  });
}

function loadState() {
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
    return {
      ...base,
      xp: 1280,
      streak: 7,
      user: { name: ADMIN_CREDENTIALS.name, role: 'admin', signedAt: session.signedAt || new Date().toISOString() }
    };
  }

  if (session?.role === 'student') {
    const students = getStudents();
    const studentKey = session.studentKey || studentAccountKey(session.name || session.email || '');
    const account = students[studentKey];
    if (account) {
      const profile = normalizeStudentProfile(account.profile || {});
      return {
        ...base,
        xp: Number(profile.xp || 0),
        streak: Number(profile.streak || 0),
        theme: profile.theme || 'dark',
        mistakes: Array.isArray(profile.mistakes) ? profile.mistakes : [],
        videoProgress: normalizeVideoProgress(profile.videoProgress || {}),
        qbankStats: normalizeQbankStats(profile.qbankStats || {}),
        qbankAttempts: normalizeQbankAttempts(profile.qbankAttempts || []),
        flashcards: Array.isArray(profile.flashcards) ? profile.flashcards : [],
        examReports: Array.isArray(profile.examReports) ? profile.examReports : [],
        dailyTodo: normalizeDailyTodo(profile.dailyTodo),
        learnRouteCourse: profile.learnRouteCourse || null,
        learnRouteChapter: profile.learnRouteChapter || null,
        learnRouteSelections: profile.learnRouteSelections || {},
        videoLevel: profile.videoLevel || 'modes',
        selectedMode: profile.selectedMode || null,
        selectedCourse: profile.selectedCourse || null,
        selectedTopic: profile.selectedTopic || null,
        qbankLevel: profile.qbankLevel || 'modes',
        selectedQMode: profile.selectedQMode || null,
        selectedQCourse: profile.selectedQCourse || null,
        selectedQTopic: profile.selectedQTopic || null,
        selectedQSubtopic: profile.selectedQSubtopic || null,
        selectedQNoteLibrary: profile.selectedQNoteLibrary || null,
        selectedQAnswerMode: profile.selectedQAnswerMode || 'exam',
        user: {
          name: account.name,
          email: account.email || '',
          studentKey,
          role: 'student',
          supabaseId: session.supabaseId || account.supabaseUserId || stableStudentId(studentKey),
          signedAt: session.signedAt || new Date().toISOString()
        }
      };
    }
    localStorage.removeItem(SESSION_KEY);
  }

  return base;
}

// v84: state bootstrap moved to app.js so all module normalizers are loaded before loadState() runs.


/* v102: Simple student-facing Supabase sync status */
function syncStatusTextV102() {
  const setup = supabaseSetupStatus();
  if (!setup.ok || lastProfileSyncError) return 'Not synced';
  if (lastProfileSyncAt) return `Synced • last saved ${formatSyncTime(lastProfileSyncAt)}`;
  if (lastCloudSaveAt) return `Saved • last saved ${formatSyncTime(lastCloudSaveAt)}`;
  return isStudent() ? 'Ready to save' : 'Connected';
}

function updateProfileSyncStatus(label = '', tone = '') {
  const status = $('#profileSyncStatus');
  const card = $('#profileSyncBtn');
  if (!status && !card) return;
  const setup = supabaseSetupStatus();
  let text = label;
  let classTone = tone;
  if (!text) {
    if (!setup.ok || lastProfileSyncError) {
      text = 'Not synced';
      classTone = 'warn';
    } else if (lastProfileSyncAt || lastCloudSaveAt) {
      text = syncStatusTextV102();
      classTone = 'ready';
    } else {
      text = isStudent() ? 'Ready to save' : 'Connected';
      classTone = setup.ok ? 'ready' : 'local';
    }
  }
  if (status) status.textContent = text;
  if (card) {
    ['sync-ready', 'sync-warn', 'sync-busy', 'sync-local'].forEach(cls => card.classList.remove(cls));
    card.classList.add(`sync-${classTone || (setup.ok ? 'ready' : 'warn')}`);
  }
}

function renderSupabaseSyncModal(rows = [], summary = '') {
  if (isAdmin() && typeof renderSupabaseSyncModalTechnicalV102 === 'function') {
    return renderSupabaseSyncModalTechnicalV102(rows, summary);
  }
  return showStudentSyncModalV102(summary);
}

function showStudentSyncModalV102(summary = '') {
  const setup = supabaseSetupStatus();
  const connected = setup.ok && !lastProfileSyncError;
  const lastSaved = lastProfileSyncAt || lastCloudSaveAt;
  showModal(`
    <h2 id="modalTitle">Sync status</h2>
    <p class="modal-muted">${connected ? 'You can save your progress to the cloud. Local storage will always stay as a backup.' : 'No cloud connection right now. Your progress will be saved locally.'}</p>
    <div class="student-sync-grid">
      <article><span>${connected ? '✅' : '⚠️'}</span><b>${connected ? 'Synced' : 'Not synced'}</b><small>${connected ? 'Connection available' : 'Progress will be saved locally'}</small></article>
      <article><span>🕒</span><b>Last saved</b><small>${lastSaved ? formatSyncTime(lastSaved) : 'Not saved yet'}</small></article>
    </div>
    <div class="cloud-action-grid sync-action-grid">
      <button class="primary-btn" type="button" id="studentSyncSaveNow">Save now</button>
      <button class="soft-btn" type="button" id="studentSyncCheckAgain">Check again</button>
    </div>
  `);
  $('#studentSyncSaveNow')?.addEventListener('click', async () => {
    if (!isStudent()) {
      showToast('Sign in from Profile to save your progress.');
      return;
    }
    updateProfileSyncStatus('Saving…', 'busy');
    try {
      const ok = typeof pushStudentProgressToSupabase === 'function' ? await pushStudentProgressToSupabase() : false;
      if (ok) {
        lastProfileSyncAt = new Date();
        updateProfileSyncStatus();
        showToast('Progress saved');
      } else {
        updateProfileSyncStatus('Not synced', 'warn');
        showToast('No cloud connection right now. Your progress will be saved locally.');
      }
    } catch (err) {
      lastProfileSyncError = err;
      updateProfileSyncStatus('Not synced', 'warn');
      showToast('No cloud connection right now. Your progress will be saved locally.');
    }
    showStudentSyncModalV102();
  });
  $('#studentSyncCheckAgain')?.addEventListener('click', async () => {
    try {
      await runSupabaseSyncCheck({ showDetails: false });
      showToast(supabaseSetupStatus().ok && !lastProfileSyncError ? 'Sync checked' : 'No cloud connection right now. Your progress will be saved locally.');
    } catch (err) {
      lastProfileSyncError = err;
      updateProfileSyncStatus('Not synced', 'warn');
      showToast('No cloud connection right now. Your progress will be saved locally.');
    }
    showStudentSyncModalV102();
  });
}
