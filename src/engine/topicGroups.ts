// How topics are grouped on the practice screen (spec T–V, AD).

export const TOPIC_GROUPS: { id: string; icon: string; title: { en: string; he: string }; topics: string[] }[] = [
  { id: 'basics', icon: '🌱', title: { en: 'Ear basics — no theory needed', he: 'יסודות השמיעה — בלי תיאוריה' }, topics: ['basics-highlow', 'basics-samediff', 'basics-contour', 'basics-beat', 'octave', 'meter-feel', 'mood'] },
  { id: 'expression', icon: '🎭', title: { en: 'Expression: loud, soft, short, smooth', he: 'הבעה: חזק, חלש, קצר, רציף' }, topics: ['dynamics', 'articulation', 'mood'] },
  { id: 'harmony', icon: '🎼', title: { en: 'Harmony: cadences, key changes, progressions', he: 'הרמוניה: קדנצות, מעברי סולם, מהלכים' }, topics: ['cadence-types', 'harmonize', 'modulation', 'progressions', 'harmonic-dictation', 'nct-ear', 'extensions', 'voicings'] },
  { id: 'ear', icon: '👂', title: { en: 'Fine ear: home, intervals, scales, tuning', he: 'אוזן עדינה: בית, מרווחים, סולמות, כיוון' }, topics: ['find-tonic', 'intervals-all', 'compound-intervals', 'degrees-ext', 'scale-types', 'fine-pitch', 'in-tune', 'set-classes'] },
  { id: 'form', icon: '🧩', title: { en: 'Form & texture', he: 'מבנה ומרקם' }, topics: ['voice-count', 'form', 'two-voice'] },
  { id: 'memory', icon: '🧠', title: { en: 'Memory & improvisation', he: 'זיכרון ואלתור' }, topics: ['rhythm-memory', 'chord-memory', 'call-response'] },
  { id: 'rhythm', icon: '🥁', title: { en: 'Meter & advanced rhythm', he: 'משקל וקצב מתקדם' }, topics: ['tempo', 'meter-feel', 'downbeat', 'syncopation', 'odd-meter', 'polyrhythm', 'swing-ratio'] },
  { id: 'transform', icon: '🔀', title: { en: 'Transposition & transformations', he: 'טרנספוזיציה וטרנספורמציות' }, topics: ['transpose', 'transpose-adv', 'transposition', 'nashville', 'melodic-transform', 'displacement', 'displacement-3', 'rhythm-transform'] },
  { id: 'theory', icon: '📖', title: { en: 'Written theory', he: 'תיאוריה כתובה' }, topics: ['note-reading', 'musical-terms', 'time-signatures', 'key-signatures', 'interval-spelling', 'chord-spelling', 'roman-numerals', 'circle-fifths', 'chord-scale', 'voice-leading', 'sight-read', 'theory-facts'] },
  { id: 'world', icon: '🌍', title: { en: 'Maqamat and Middle-Eastern rhythms', he: 'מקאמים ומקצבים מזרחיים' }, topics: ['maqam', 'eastern-rhythm'] },
  { id: 'barry', icon: '🎹', title: { en: 'Barry Harris', he: 'בארי האריס' }, topics: ['bh-scale', 'bh-tone', 'bh-convert', 'bh-convert-2', 'bh-keys', 'bh-six-over', 'bh-lines', 'bh-pivot', 'bh-brothers', 'chromatic-added'] },
];
