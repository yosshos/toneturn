// Exercise taxonomy (spec AD, docs/EXERCISE_TAXONOMY.md): domain → skill → sub-skill → exercise type → level.
// Every exercise type carries a tag vector — 1–3 (skill, sub-skill, weight) entries, Σw = 1, the primary
// first with w ≥ 0.5 and equal to the skill the item is rated in (questionSkill). Pure data + lookups.

import type { Question, SkillId } from './lesson';
import { questionSkill } from './lesson';

export interface Tag {
  skill: SkillId;
  sub: string;
  w: number;
}
type T = [SkillId, string, number];
export const tg = (...xs: T[]): Tag[] => xs.map(([skill, sub, w]) => ({ skill, sub: `${skill}/${sub}`, w }));

// ---------------------------------------------------------------- sub-skills

export interface SubSkill {
  id: string; // `${skill}/${name}`
  skill: SkillId;
  en: string;
  he: string;
}
const S = (skill: SkillId, name: string, en: string, he: string): SubSkill => ({ id: `${skill}/${name}`, skill, en, he });

export const SUB_SKILLS: SubSkill[] = [
  // pitch & harmony
  S('pitch', 'higher-lower', 'Higher or lower', 'גבוה או נמוך'),
  S('pitch', 'octave', 'Octaves', 'אוקטבות'),
  S('pitch', 'fine', 'Fine pitch (cents)', 'גובה עדין (סנטים)'),
  S('pitch', 'in-tune', 'In tune or not', 'מכוון או לא'),
  S('degrees', 'home', 'Home notes (1-3-5)', 'צלילי הבית (1-3-5)'),
  S('degrees', 'diatonic', 'All scale degrees', 'כל הדרגות'),
  S('degrees', 'chromatic', 'Minor and chromatic degrees', 'דרגות במינור וכרומטיות'),
  S('degrees', 'find-tonic', 'Finding home', 'למצוא את הבית'),
  S('intervals', 'melodic', 'Melodic intervals', 'מרווחים מלודיים'),
  S('intervals', 'harmonic', 'Harmonic intervals', 'מרווחים הרמוניים'),
  S('intervals', 'compound', 'Compound intervals', 'מרווחים מורכבים'),
  S('intervals', 'songs', 'Intervals from songs', 'מרווחים משירים'),
  S('chords', 'quality', 'Major / minor / dim / aug', 'מז׳ור / מינור / מוקטן / מוגדל'),
  S('chords', 'inversion', 'Inversions and bass', 'היפוכים ובס'),
  S('chords', 'seventh', 'Seventh chords', 'ספטאקורדים'),
  S('chords', 'extension', 'Extensions and alterations', 'הרחבות ואלטרציות'),
  S('chords', 'voicing', 'Voicings', 'וויסינגים'),
  S('chords', 'post-tonal', 'Post-tonal sets', 'סטים פוסט־טונליים'),
  S('chords', 'barry', 'Barry Harris harmony', 'הרמוניית בארי האריס'),
  S('cadences', 'cadence', 'Cadences', 'קדנצות'),
  S('cadences', 'progression', 'Progressions', 'מהלכי אקורדים'),
  S('cadences', 'modulation', 'Key changes', 'מעברי סולם'),
  S('cadences', 'harmonize', 'Harmonising a melody', 'הרמון מנגינה'),
  S('cadences', 'nct', 'Notes outside the chord', 'צלילים מחוץ לאקורד'),
  S('cadences', 'dictation', 'Harmonic dictation', 'הכתבה הרמונית'),
  S('modes', 'modes', 'Church modes', 'מודוסים'),
  S('modes', 'scales', 'Scale types', 'סוגי סולמות'),
  S('modes', 'maqam', 'Maqamat', 'מקאמים'),
  S('absolute', 'name', 'Naming without reference', 'שם בלי ייחוס'),
  // time
  S('timing', 'steady', 'Steady beat', 'פעמה יציבה'),
  S('timing', 'precision', 'Tap precision', 'דיוק הקשה'),
  S('tempo', 'compare', 'Faster or slower', 'מהר או לאט'),
  S('tempo', 'bpm', 'Tempo in BPM', 'טמפו ב־BPM'),
  S('meter', 'count', 'In 2, 3 or 4', 'בשתיים, שלוש או ארבע'),
  S('meter', 'compound', 'Simple or compound', 'פשוט או מורכב'),
  S('meter', 'odd', 'Odd meters', 'משקלים אי־זוגיים'),
  S('meter', 'downbeat', 'Finding beat 1', 'למצוא את פעמה 1'),
  S('meter', 'hemiola', 'Hemiola', 'המיולה'),
  S('rhythm-reading', 'read', 'Reading rhythms', 'קריאת מקצבים'),
  S('rhythm-reading', 'syncopation', 'Syncopation on paper', 'סינקופה בכתב'),
  S('rhythm-dictation', 'dictate', 'Rhythms by ear', 'מקצבים בשמיעה'),
  S('rhythm-dictation', 'syncopation', 'Syncopation by ear', 'סינקופה בשמיעה'),
  S('rhythm-dictation', 'feel', 'Swing and groove', 'סווינג וגרוב'),
  S('rhythm-dictation', 'poly', 'Polyrhythm', 'פולי־ריתם'),
  S('rhythm-dictation', 'world', 'World rhythms', 'מקצבי עולם'),
  // memory & structure
  S('sequences', 'same-diff', 'Same or different', 'זהה או שונה'),
  S('sequences', 'contour', 'Melodic shape', 'צורת המנגינה'),
  S('sequences', 'melody', 'Melodic memory', 'זיכרון מלודי'),
  S('sequences', 'chords', 'Chord memory', 'זיכרון הרמוני'),
  S('sequences', 'lines', 'Following lines', 'מעקב אחרי קווים'),
  S('rhythm', 'memory', 'Rhythm memory', 'זיכרון קצבי'),
  S('form', 'phrases', 'Phrase form', 'מבנה משפטים'),
  S('form', 'voices', 'Voices and texture', 'קולות ומרקם'),
  // voice
  S('singing', 'match', 'Matching a note', 'התאמת צליל'),
  S('singing', 'degrees', 'Singing degrees and names', 'שירת דרגות ושמות'),
  S('singing', 'sequence', 'Singing a melody', 'שירת מנגינה'),
  S('singing', 'harmony', 'Singing harmony', 'שירת הרמוניה'),
  S('technique', 'control', 'Breath, range and control', 'נשימה, טווח ושליטה'),
  S('technique', 'vibrato', 'Vibrato', 'ויברטו'),
  S('agility', 'runs', 'Runs and riffs', 'ראנים וריפים'),
  S('agility', 'ornaments', 'Ornaments', 'קישוטים'),
  // reading & theory
  S('notes', 'names', 'Note names and degrees', 'שמות תווים ודרגות'),
  S('notes', 'staff', 'Reading the staff', 'קריאה מהחמשה'),
  S('theory', 'keys', 'Keys and the circle', 'סולמות ומעגל הקווינטות'),
  S('theory', 'spelling', 'Spelling intervals and chords', 'איות מרווחים ואקורדים'),
  S('theory', 'harmony', 'Roman numerals and chord-scales', 'ספרות רומיות וסולמות אקורד'),
  S('theory', 'terms', 'Terms and time signatures', 'מונחים וסימני משקל'),
  S('theory', 'voice-leading', 'Voice leading', 'הובלת קולות'),
  S('theory', 'facts', 'General theory', 'תיאוריה כללית'),
  S('sight', 'read', 'Sight-reading', 'קריאה מהדף'),
  S('sight', 'sing', 'Sight-singing', 'שירה מהדף'),
  // creative & applied
  S('improv', 'answer', 'Call and response', 'שאלה ותשובה'),
  S('improv', 'play', 'Playing along', 'נגינה עם ליווי'),
  S('transpose', 'pitch', 'Transposing melodies', 'טרנספוזיציה של מנגינות'),
  S('transpose', 'written', 'Written transposition', 'טרנספוזיציה בכתב'),
  S('transpose', 'chords', 'Transposing progressions', 'טרנספוזיציה של מהלכים'),
  S('transpose', 'melodic', 'Melodic transformations', 'טרנספורמציות מלודיות'),
  S('transpose', 'displacement', 'Rhythmic displacement', 'הסטה ריתמית'),
  S('transpose', 'rhythmic', 'Rhythmic transformations', 'טרנספורמציות ריתמיות'),
  S('expression', 'dynamics', 'Loud and soft', 'חזק וחלש'),
  S('expression', 'articulation', 'Articulation', 'ארטיקולציה'),
  S('expression', 'mood', 'Mood', 'מצב רוח'),
  // 0.38 (spec AE)
  S('cadences', 'chromatic', 'Colour chords', 'אקורדי צבע'),
  S('theory', 'chromatic', 'Colour chords on paper', 'אקורדי צבע בכתב'),
  S('sequences', 'inner', 'Inner hearing', 'שמיעה פנימית'),
  S('form', 'song', 'Song form', 'מבנה שיר'),
  S('form', 'style', 'Style and period', 'סגנון ותקופה'),
  S('timing', 'subdivide', 'Subdividing the click', 'חלוקת הקליק'),
  S('timing', 'backbeat', 'When the click moves', 'כשהקליק זז'),
  S('timing', 'gap', 'Through the gaps', 'דרך השקט'),
  S('timing', 'poly', 'Two hands', 'שתי ידיים'),
  S('tempo', 'produce', 'Tempo from memory', 'טמפו מהזיכרון'),
  S('rhythm-reading', 'errors', 'Spotting rhythm slips', 'זיהוי טעויות קצב'),
  S('rhythm-reading', 'drums', 'Reading the drum kit', 'קריאת תופים'),
  S('singing', 'intervals', 'Singing intervals', 'שירת מרווחים'),
  S('dictation', 'melodic', 'Writing the melody', 'כתיבת מנגינה'),
  S('dictation', 'rhythm', 'Building the rhythm', 'בניית מקצב'),
  S('dictation', 'two-part', 'Two voices', 'שני קולות'),
  S('dictation', 'bass', 'Writing the bass', 'כתיבת הבס'),
  S('instrument', 'echo', 'Playing it back', 'לנגן בחזרה'),
  S('instrument', 'fretboard', 'Notes on the neck', 'תווים על הצוואר'),
  S('instrument', 'shapes', 'Shapes on the neck', 'צורות על הצוואר'),
  S('instrument', 'keyboard', 'Notes on the keys', 'תווים על הקלידים'),
  S('timbre', 'eq', 'Frequencies', 'תדרים'),
  S('timbre', 'space', 'Room and echo', 'חלל והד'),
  S('timbre', 'pan', 'Left, right, wide', 'שמאל, ימין, רוחב'),
  S('timbre', 'dynamics', 'Compression and drive', 'דחיסה ועיוות'),
];
export const SUB_BY_ID: Record<string, SubSkill> = Object.fromEntries(SUB_SKILLS.map((s) => [s.id, s]));
export const subsOf = (k: SkillId) => SUB_SKILLS.filter((s) => s.skill === k);

// ---------------------------------------------------------------- tags per topic (choice questions)

export type LevelTags = Tag[] | ((level: number) => Tag[]);
export const TOPIC_TAGS: Record<string, LevelTags> = {
  // basics
  'basics-highlow': tg(['pitch', 'higher-lower', 1]),
  'basics-samediff': tg(['sequences', 'same-diff', 1]),
  'basics-contour': tg(['sequences', 'contour', 1]),
  'basics-beat': tg(['timing', 'steady', 1]),
  octave: tg(['pitch', 'octave', 0.8], ['intervals', 'melodic', 0.2]),
  // pitch & harmony
  'find-tonic': tg(['degrees', 'find-tonic', 1]),
  'intervals-all': (l) => (l === 3 ? tg(['intervals', 'harmonic', 1]) : tg(['intervals', 'melodic', 1])),
  'compound-intervals': tg(['intervals', 'compound', 0.8], ['pitch', 'octave', 0.2]),
  'degrees-ext': tg(['degrees', 'chromatic', 1]),
  'fine-pitch': tg(['pitch', 'fine', 1]),
  'in-tune': tg(['pitch', 'in-tune', 1]),
  'set-classes': tg(['chords', 'post-tonal', 1]),
  extensions: tg(['chords', 'extension', 1]),
  voicings: (l) => (l === 2 ? tg(['chords', 'inversion', 1]) : tg(['chords', 'voicing', 1])),
  progressions: tg(['cadences', 'progression', 0.7], ['chords', 'quality', 0.3]),
  'cadence-types': tg(['cadences', 'cadence', 1]),
  modulation: tg(['cadences', 'modulation', 0.8], ['degrees', 'find-tonic', 0.2]),
  harmonize: tg(['cadences', 'harmonize', 0.6], ['chords', 'quality', 0.2], ['improv', 'answer', 0.2]),
  'nct-ear': tg(['cadences', 'nct', 0.8], ['sequences', 'lines', 0.2]),
  'harmonic-dictation': tg(['cadences', 'dictation', 0.6], ['sequences', 'chords', 0.2], ['theory', 'harmony', 0.2]),
  'scale-types': tg(['modes', 'scales', 1]),
  maqam: tg(['modes', 'maqam', 1]),
  'chromatic-added': tg(['modes', 'scales', 1]),
  'bh-scale': tg(['modes', 'scales', 1]),
  'bh-tone': tg(['chords', 'barry', 1]),
  'bh-convert': tg(['chords', 'barry', 1]),
  'bh-convert-2': tg(['chords', 'barry', 1]),
  'bh-brothers': tg(['chords', 'barry', 1]),
  'bh-keys': tg(['cadences', 'progression', 1]),
  'bh-six-over': (l) => (l === 3 ? tg(['chords', 'barry', 1]) : tg(['theory', 'harmony', 1])),
  'bh-lines': tg(['sequences', 'lines', 1]),
  'bh-pivot': tg(['sequences', 'lines', 1]),
  // time
  tempo: (l) => (l === 3 || l >= 5 ? tg(['tempo', 'bpm', 1]) : tg(['tempo', 'compare', 1])),
  'meter-feel': (l) => (l <= 2 ? tg(['meter', 'count', 1]) : l === 3 ? tg(['meter', 'compound', 1]) : tg(['meter', 'hemiola', 1])),
  downbeat: tg(['meter', 'downbeat', 1]),
  'odd-meter': tg(['meter', 'odd', 0.8], ['rhythm-dictation', 'dictate', 0.2]),
  syncopation: tg(['rhythm-dictation', 'syncopation', 1]),
  polyrhythm: tg(['rhythm-dictation', 'poly', 1]),
  'swing-ratio': tg(['rhythm-dictation', 'feel', 1]),
  'eastern-rhythm': tg(['rhythm-dictation', 'world', 1]),
  // memory & form
  'rhythm-memory': tg(['rhythm', 'memory', 1]),
  'chord-memory': tg(['sequences', 'chords', 0.8], ['chords', 'quality', 0.2]),
  'call-response': tg(['improv', 'answer', 0.7], ['sequences', 'melody', 0.3]),
  form: tg(['form', 'phrases', 0.8], ['sequences', 'melody', 0.2]),
  'two-voice': tg(['form', 'voices', 0.7], ['sequences', 'lines', 0.3]),
  'voice-count': tg(['form', 'voices', 1]),
  // reading & theory
  'note-reading': tg(['notes', 'staff', 1]),
  'key-signatures': tg(['theory', 'keys', 1]),
  'circle-fifths': tg(['theory', 'keys', 1]),
  'interval-spelling': tg(['theory', 'spelling', 1]),
  'chord-spelling': tg(['theory', 'spelling', 1]),
  'roman-numerals': tg(['theory', 'harmony', 1]),
  'chord-scale': tg(['theory', 'harmony', 1]),
  'musical-terms': tg(['theory', 'terms', 1]),
  'time-signatures': tg(['theory', 'terms', 0.7], ['meter', 'compound', 0.3]),
  'voice-leading': tg(['theory', 'voice-leading', 1]),
  'theory-facts': tg(['theory', 'facts', 1]),
  'sight-read': tg(['sight', 'read', 0.7], ['notes', 'staff', 0.3]),
  // creative & applied
  transpose: (l) => (l === 4 ? tg(['transpose', 'pitch', 0.6], ['sequences', 'melody', 0.4]) : tg(['transpose', 'pitch', 0.6], ['degrees', 'diatonic', 0.25], ['notes', 'names', 0.15])),
  transposition: tg(['transpose', 'written', 0.7], ['theory', 'spelling', 0.3]),
  nashville: tg(['transpose', 'chords', 0.7], ['theory', 'harmony', 0.3]),
  'melodic-transform': (l) => (l === 4 ? tg(['transpose', 'melodic', 0.6], ['modes', 'modes', 0.4]) : tg(['transpose', 'melodic', 0.6], ['sequences', 'melody', 0.4])),
  'transpose-adv': (l) => (l === 1 ? tg(['transpose', 'pitch', 0.6], ['notes', 'staff', 0.2], ['sight', 'read', 0.2]) : tg(['transpose', 'pitch', 0.7], ['theory', 'spelling', 0.3])),
  'displacement-3': tg(['transpose', 'displacement', 0.6], ['meter', 'compound', 0.4]),
  displacement: (l) => (l === 2 ? tg(['transpose', 'displacement', 0.5], ['rhythm-reading', 'syncopation', 0.5]) : tg(['transpose', 'displacement', 0.6], ['rhythm-dictation', 'syncopation', 0.4])),
  'rhythm-transform': (l) => (l === 4 ? tg(['transpose', 'rhythmic', 0.7], ['tempo', 'bpm', 0.3]) : tg(['transpose', 'rhythmic', 0.6], ['rhythm-dictation', 'dictate', 0.4])),
  dynamics: tg(['expression', 'dynamics', 1]),
  articulation: tg(['expression', 'articulation', 1]),
  mood: tg(['expression', 'mood', 0.8], ['chords', 'quality', 0.2]),
};

/** Topics whose rated skill differs per level (the primary tag follows `q.skill`). */
const DEFAULT_SUB: Partial<Record<SkillId, string>> = {
  degrees: 'diatonic', notes: 'names', chords: 'quality', cadences: 'cadence', singing: 'match', sequences: 'melody', rhythm: 'memory', timing: 'precision',
  intervals: 'melodic', 'rhythm-reading': 'read', 'rhythm-dictation': 'dictate', agility: 'runs', technique: 'control', modes: 'modes', absolute: 'name',
  theory: 'facts', tempo: 'compare', pitch: 'fine', sight: 'read', improv: 'play', transpose: 'pitch', meter: 'count', form: 'phrases', expression: 'dynamics',
  instrument: 'echo', timbre: 'eq', dictation: 'melodic',
};
export const defaultTags = (k: SkillId): Tag[] => [{ skill: k, sub: `${k}/${DEFAULT_SUB[k]}`, w: 1 }];

/** The tag vector of a question. The first tag is always the skill it is rated in. */
export function questionTags(q: Question): Tag[] {
  const primary = questionSkill(q);
  let tags: Tag[] | null = null;
  // Topic-generated items of any kind (spec AE) carry their topic: its tags apply.
  const topicRef = q.kind === 'place' ? { id: q.topic, level: q.level } : (q.kind === 'rhythm-read' || q.kind === 'sing-seq' || q.kind === 'sing' || q.kind === 'rhythm-dict') && q.topic ? q.topic : null;
  if (topicRef && TOPIC_TAGS[topicRef.id]) {
    const t = TOPIC_TAGS[topicRef.id];
    tags = typeof t === 'function' ? t(topicRef.level) : t;
  } else switch (q.kind) {
    case 'choice': {
      const t = TOPIC_TAGS[q.topic];
      tags = t ? (typeof t === 'function' ? t(q.level) : t) : null;
      break;
    }
    case 'degree':
      tags = q.choices.length <= 3 ? tg(['degrees', 'home', 1]) : tg(['degrees', 'diatonic', 1]);
      break;
    case 'note-name':
      tags = primary === 'notes' ? tg(['notes', 'names', 0.7], ['degrees', 'diatonic', 0.3]) : tg(['degrees', 'diatonic', 0.6], ['notes', 'names', 0.4]);
      break;
    case 'name-seq':
      tags = q.skillAs === 'transpose' ? tg(['transpose', 'pitch', 0.6], ['degrees', 'diatonic', 0.25], ['notes', 'names', 0.15]) : primary === 'notes' ? tg(['notes', 'names', 0.6], ['sequences', 'melody', 0.4]) : tg(['degrees', 'diatonic', 0.6], ['sequences', 'melody', 0.4]);
      break;
    case 'degree-seq':
      tags = q.song ? tg(['sequences', 'melody', 0.6], ['intervals', 'songs', 0.4]) : tg(['sequences', 'melody', 0.6], ['degrees', 'diatonic', 0.4]);
      break;
    case 'sing':
      tags =
        q.promptBy === 'echo'
          ? tg(['singing', 'match', 1])
          : q.promptBy === 'chord'
            ? tg(['singing', 'harmony', 0.6], ['chords', 'quality', 0.4])
            : q.promptBy === 'finish'
              ? tg(['singing', 'degrees', 0.6], ['degrees', 'find-tonic', 0.4])
              : q.promptBy === 'name'
                ? tg(['singing', 'degrees', 0.7], ['notes', 'names', 0.3])
                : tg(['singing', 'degrees', 0.7], ['degrees', 'diatonic', 0.3]);
      break;
    case 'sing-seq':
      tags =
        q.skillAs === 'transpose'
          ? tg(['transpose', 'pitch', 0.5], ['singing', 'sequence', 0.3], ['degrees', 'diatonic', 0.2])
          : q.song || q.stimulus.some((x) => x.kind === 'notes' || x.kind === 'melody')
            ? tg(['singing', 'sequence', 0.7], ['sequences', 'melody', 0.3])
            : tg(['singing', 'degrees', 0.7], ['degrees', 'diatonic', 0.3]);
      break;
    case 'quality':
      tags = tg(['chords', 'quality', 1]);
      break;
    case 'inversion':
    case 'slash':
      tags = tg(['chords', 'inversion', 1]);
      break;
    case 'seventh':
      tags = tg(['chords', 'seventh', 1]);
      break;
    case 'cadence':
      tags = tg(['cadences', 'cadence', 1]);
      break;
    case 'progression':
      tags = tg(['cadences', 'progression', 0.7], ['chords', 'seventh', 0.3]);
      break;
    case 'interval':
      tags = tg(['intervals', 'melodic', 1]);
      break;
    case 'rhythm-read':
      tags =
        q.skillAs === 'timing' && q.silentAfterBars !== undefined
          ? tg(['timing', 'gap', 1])
          : q.skillAs === 'timing'
          ? tg(['timing', 'steady', 0.8], ['rhythm-reading', 'read', 0.2])
          : q.skillAs === 'transpose'
            ? tg(['transpose', 'displacement', 0.6], ['rhythm-reading', 'syncopation', 0.4])
            : tg(['rhythm-reading', 'read', 1]);
      break;
    case 'rhythm-dict':
      tags = tg(['rhythm-dictation', 'dictate', 1]);
      break;
    case 'mode-id':
      tags = tg(['modes', 'modes', 1]);
      break;
    case 'wrong-note':
      tags = tg(['modes', 'modes', 0.6], ['sequences', 'melody', 0.4]);
      break;
    case 'sing-run':
    case 'run-id':
      tags = tg(['agility', 'runs', 1]);
      break;
    case 'abs-note':
      tags = tg(['absolute', 'name', 1]);
      break;
    case 'tf':
      tags = tg(['intervals', 'melodic', 1]);
      break;
  }
  if (!tags || tags[0].skill !== primary) {
    // Fall back to the rated skill (keeps primary = rated skill; e.g. a topic level rated elsewhere).
    const rest = (tags ?? []).filter((x) => x.skill !== primary && x.w < 0.5);
    const restW = rest.reduce((a, x) => a + x.w, 0);
    return [{ skill: primary, sub: tags?.find((x) => x.skill === primary)?.sub ?? `${primary}/${DEFAULT_SUB[primary]}`, w: Math.round((1 - restW) * 100) / 100 }, ...rest];
  }
  return tags;
}

/** Tags of a vocal-studio take (rated skill decided by the studio: technique, singing or sight). */
export function vocalTags(skill: SkillId, kind: string, ornament: boolean): Tag[] {
  if (skill === 'sight') return tg(['sight', 'sing', 0.6], ['singing', 'sequence', 0.4]);
  if (skill === 'singing') return tg(['singing', 'harmony', 1]);
  if (ornament) return tg(['technique', 'control', 0.5], ['agility', 'ornaments', 0.5]);
  return tg(['technique', kind.startsWith('vibrato') ? 'vibrato' : 'control', 1]);
}

/** Tags of any rating event: its own, or the skill's default sub-skill. */
export const eventTags = (e: { skill: SkillId; tags?: { skill: SkillId; sub?: string; w: number }[] }): Tag[] =>
  e.tags?.length ? e.tags.map((t) => ({ skill: t.skill, sub: t.sub ?? `${t.skill}/${DEFAULT_SUB[t.skill]}`, w: t.w })) : defaultTags(e.skill);

// ---------------------------------------------------------------- sub-skill stats (spec AD §3.2 step 4)

export interface SubStat {
  /** Accuracy, exponentially weighted (α = 0.2), 0..1. */
  ewma: number;
  n: number;
  last: string;
}
export const SUB_ALPHA = 0.2;

/** Fold events into per-sub-skill accuracy (deduplicated by id, time order). Placement sets count as one success. */
export function foldSubs(events: { id: string; skill: SkillId; tags?: { skill: SkillId; sub?: string; w: number }[]; correct: boolean; score?: number; set?: number; at: string }[]): Record<string, SubStat> {
  const out: Record<string, SubStat> = {};
  const seen = new Set<string>();
  for (const e of [...events].sort((a, b) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id))) {
    if (seen.has(e.id)) continue;
    seen.add(e.id);
    const s = e.set !== undefined ? 1 : e.score !== undefined ? Math.max(0, Math.min(1, e.score)) : e.correct ? 1 : 0;
    for (const t of eventTags(e)) {
      const cur = out[t.sub];
      out[t.sub] = cur ? { ewma: cur.ewma + SUB_ALPHA * (s - cur.ewma), n: cur.n + 1, last: e.at } : { ewma: s, n: 1, last: e.at };
    }
  }
  return out;
}
