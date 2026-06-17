/* NovaMed v145 - structural stability patch
   Purpose: keep the latest QBank implementation authoritative after legacy global scripts load.
   This avoids accidental overwrites from older ui/exam helper functions while preserving existing features. */
(function () {
  'use strict';

  function assignIfFunction(name, fn) {
    if (typeof fn !== 'function') return false;
    try {
      window[name] = fn;
      return true;
    } catch (err) {
      console.warn('NovaMed v145 could not stabilize', name, err);
      return false;
    }
  }

  function stabilizeQbankGlobals() {
    const core = window.NovaMedQbankCore || null;
    if (!core) return;
    [
      'questionsFor',
      'recordQbankAttempt',
      'handleQuestionTimeout',
      'handleAnswer',
      'recordMistake',
      'renderMistakes',
      'renderQuestion',
      'loadExternalQbankJson',
      'applyUnifiedQbankQuestionsV87'
    ].forEach(name => assignIfFunction(name, core[name]));
  }

  function stabilizeVideoGlobals() {
    // The last-loaded flashcards layer intentionally supplies the clean video modal/openVideo override.
    // Preserve it under a namespaced handle so future patches can restore it deterministically.
    if (typeof window.openVideo === 'function' && !window.NovaMedVideoCore) {
      window.NovaMedVideoCore = { openVideo: window.openVideo };
    }
    if (window.NovaMedVideoCore?.openVideo) assignIfFunction('openVideo', window.NovaMedVideoCore.openVideo);
  }

  stabilizeQbankGlobals();
  stabilizeVideoGlobals();

  window.NovaMedStableGlobalsV145 = {
    stabilizeQbankGlobals,
    stabilizeVideoGlobals,
    version: 'v145-structural-hardening'
  };
})();
