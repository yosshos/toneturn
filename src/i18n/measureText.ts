// MEASUREMENT-AUDIT (2026-11-17): the words of the touch measures — one short line per point, a "Why?" line for a
// miss. He + en, kept out of strings.ts like encoreText.ts. Few words, no emoji; numbers and dynamic marks stay Latin
// (the views isolate them).

export type L = { en: string; he: string };

const HAND_EN = { R: 'RH', L: 'LH' } as const;
const HAND_HE = { R: 'יד ימין', L: 'יד שמאל' } as const;
/** "LH: " before a line when both hands play, nothing otherwise. */
export const handTag = (h: 'R' | 'L' | null): L => (h ? { en: `${HAND_EN[h]}: `, he: `${HAND_HE[h]}: ` } : { en: '', he: '' });
const pre = (p: L, x: L): L => ({ en: p.en + x.en, he: p.he + x.he });
/** Bars a–b as a label (one bar: "Bar 5"). */
export const barsLabel = (a: number, b: number): L => (a === b ? { en: `Bar ${a}`, he: `תיבה ${a}` } : { en: `Bars ${a}–${b}`, he: `תיבות ${a}–${b}` });

export const MT = {
  // ---- crescendo / diminuendo halves (G2, E1–E3) ----
  crescOk: { en: 'Crescendo smooth', he: 'קרשנדו חלק' },
  crescNone: { en: 'No crescendo', he: 'אין קרשנדו' },
  crescJump: (n: number): L => ({ en: `Crescendo jumped at note ${n}`, he: `הקרשנדו קפץ בצליל ${n}` }),
  crescEarly: (n: number): L => ({ en: `Crescendo peaked ${n} notes early`, he: `שיא הקרשנדו הגיע ${n} צלילים מוקדם` }),
  crescFlat: { en: 'Crescendo flattened before the top', he: 'הקרשנדו נעצר לפני השיא' },
  crescSmall: { en: 'Crescendo too small', he: 'קרשנדו קטן מדי' },
  crescUneven: { en: 'Crescendo uneven', he: 'קרשנדו לא אחיד' },
  dimOk: { en: 'Diminuendo smooth', he: 'דימינואנדו חלק' },
  dimNone: { en: 'No diminuendo', he: 'אין דימינואנדו' },
  dimJump: (n: number): L => ({ en: `Diminuendo dropped at note ${n}`, he: `הדימינואנדו צנח בצליל ${n}` }),
  dimLate: { en: 'Diminuendo fell all at once at the end', he: 'הדימינואנדו נפל בבת אחת בסוף' },
  dimEarly: { en: 'Diminuendo fell too early', he: 'הדימינואנדו ירד מוקדם מדי' },
  dimSmall: { en: 'Diminuendo too small', he: 'דימינואנדו קטן מדי' },
  dimUneven: { en: 'Diminuendo uneven', he: 'דימינואנדו לא אחיד' },
  softEarly: (n: number): L => ({ en: `Softest point ${n} notes early`, he: `הנקודה השקטה הגיעה ${n} צלילים מוקדם` }),
  whyJump: { en: 'Spread it evenly: a little more every note.', he: 'לפזר את השינוי: קצת יותר בכל צליל.' },
  whyPeak: { en: 'Keep the loudest for the turning note.', he: 'לשמור את החזק ביותר לצליל שבו מסתובבים.' },
  whySoftPeak: { en: 'Keep the softest for the turning note.', he: 'לשמור את השקט ביותר לצליל שבו מסתובבים.' },
  whyFlat: { en: 'Keep growing until the top note.', he: 'להמשיך לגדול עד הצליל העליון.' },
  whySmall: { en: 'Start softer, end louder: use more of your range.', he: 'להתחיל שקט יותר ולסיים חזק יותר: יותר מהטווח שלכם.' },
  whyUneven: { en: 'Each note a step louder than the last, none back.', he: 'כל צליל צעד אחד מעל הקודם, אף אחד לא חוזר אחורה.' },
  whyDimLate: { en: 'Start getting softer right after the top.', he: 'להתחיל להחליש מיד אחרי השיא.' },
  whyDimEarly: { en: 'Come down gradually, all the way to the last note.', he: 'לרדת בהדרגה, עד הצליל האחרון.' },
  whyDimUneven: { en: 'Each note a step softer than the last.', he: 'כל צליל צעד אחד מתחת לקודם.' },
  // ---- hands together (E1 hands together, E2) ----
  handsDynOk: { en: 'Hands matched in loudness', he: 'הידיים שוות בעוצמה' },
  handsDynApart: { en: "Hands' dynamics went apart", he: 'העוצמה של הידיים לא הלכה יחד' },
  handsLouder: (h: 'R' | 'L', d: number): L => ({ en: `${HAND_EN[h]} louder (+${d})`, he: `${HAND_HE[h]} חזקה יותר (+${d})` }),
  whyHandsDyn: { en: 'Both hands grow and fade together, at one level.', he: 'שתי הידיים מתחזקות ונחלשות יחד, באותה רמה.' },
  // ---- written levels: terraced zones, piece dynamics (E3b, G1) ----
  zonesOk: (marks: string): L => ({ en: `Levels held: ${marks}`, he: `הרמות נשמרו: ${marks}` }),
  zoneMiss: (where: L | null, want: string, got: string): L => (where ? pre(where, { en: `: ${want} played ${got}`, he: `: ${want} נוגן ${got}` }) : { en: `${want} played ${got}`, he: `${want} נוגן ${got}` }),
  zoneFlat: { en: 'No step between the levels', he: 'אין מדרגה בין הרמות' },
  zoneDrift: { en: 'Level drifted inside a zone', he: 'הרמה זזה בתוך אזור' },
  whyZone: { en: 'One level per zone, a clear step at the change.', he: 'רמה אחת בכל אזור, ומדרגה ברורה במעבר.' },
  hairOk: { en: 'Hairpins followed', he: 'סימני הקרשנדו והדימינואנדו נשמרו' },
  hairMiss: (where: L, cresc: boolean): L => pre(where, cresc ? { en: ': crescendo did not grow', he: ': הקרשנדו לא גדל' } : { en: ': diminuendo did not fade', he: ': הדימינואנדו לא נחלש' }),
  whyHair: { en: 'Follow the hairpin from its first note to its last.', he: 'ללכת עם הסימן מהצליל הראשון שלו עד האחרון.' },
  // ---- one level (even-*) and speed (E4) ----
  levelOk: (lvl: string): L => ({ en: `Held ${lvl}`, he: `${lvl} נשמר` }),
  tooLoud: (lvl: string): L => ({ en: `Too loud for ${lvl}`, he: `חזק מדי ל־${lvl}` }),
  tooSoft: (lvl: string): L => ({ en: `Too soft for ${lvl}`, he: `חלש מדי ל־${lvl}` }),
  creep: (d: number): L => ({ en: `Got louder as you went (+${d})`, he: `התחזקתם לאורך הנגינה (+${d})` }),
  whyLevel: (lvl: string): L => ({ en: `Stay at ${lvl} from the first note to the last, at this tempo too.`, he: `להישאר ב־${lvl} מהצליל הראשון ועד האחרון, גם בטמפו הזה.` }),
  whyCreep: { en: 'Faster is not louder: keep the same touch as the tempo rises.', he: 'מהר יותר זה לא חזק יותר: אותה נגיעה גם כשהטמפו עולה.' },
  // ---- fingers (G3) ----
  fingerSoft: (h: 'R' | 'L' | null, f: number, pct: number): L => (h ? { en: `${HAND_EN[h]} finger ${f} soft (−${pct}%)`, he: `אצבע ${f} ב${HAND_HE[h]} חלשה (−${pct}%)` } : { en: `Finger ${f} soft (−${pct}%)`, he: `אצבע ${f} חלשה (−${pct}%)` }),
  fingerLoud: (h: 'R' | 'L' | null, f: number, pct: number): L => (h ? { en: `${HAND_EN[h]} finger ${f} bumps (+${pct}%)`, he: `אצבע ${f} ב${HAND_HE[h]} בולטת (+${pct}%)` } : { en: `Finger ${f} bumps (+${pct}%)`, he: `אצבע ${f} בולטת (+${pct}%)` }),
  fingerLate: (h: 'R' | 'L' | null, f: number, ms: number): L => (h ? { en: `${HAND_EN[h]} finger ${f} late (+${ms} ms)`, he: `אצבע ${f} ב${HAND_HE[h]} מאחרת (+${ms} מ״ש)` } : { en: `Finger ${f} late (+${ms} ms)`, he: `אצבע ${f} מאחרת (+${ms} מ״ש)` }),
  fingersEven: { en: 'Fingers even', he: 'האצבעות אחידות' },
  thumb: (n: number): L => ({ en: `Thumb accents after crossings (${n})`, he: `הדגשות אגודל אחרי מעבר (${n})` }),
  whyFinger: { en: 'Slowly, that finger a little deeper into the key.', he: 'לאט, האצבע הזו קצת יותר עמוק לתוך הקליד.' },
  whyFingerLoud: { en: 'Lighter on that finger: let the hand, not the finger, weigh.', he: 'קל יותר על האצבע הזו: היד נותנת את המשקל, לא האצבע.' },
  whyLate: { en: 'Prepare that note over its key before it plays.', he: 'להכין את הצליל מעל הקליד לפני שהוא מתנגן.' },
  whyThumb: { en: 'Prepare the crossing early, land softly and on time.', he: 'להכין את המעבר מוקדם, לנחות בעדינות ובזמן.' },
  // per take, what is observed (owner 2026-11-17: the fingering is a suggestion, so notes and places, not fingers)
  noteSoft: (h: 'R' | 'L' | null, nm: string, pct: number): L => (h ? { en: `${HAND_EN[h]}: ${nm} soft every time (−${pct}%)`, he: `${HAND_HE[h]}: ה־${nm} חלש בכל פעם (−${pct}%)` } : { en: `${nm} soft every time (−${pct}%)`, he: `ה־${nm} חלש בכל פעם (−${pct}%)` }),
  noteLoud: (h: 'R' | 'L' | null, nm: string, pct: number): L => (h ? { en: `${HAND_EN[h]}: ${nm} bumps every time (+${pct}%)`, he: `${HAND_HE[h]}: ה־${nm} בולט בכל פעם (+${pct}%)` } : { en: `${nm} bumps every time (+${pct}%)`, he: `ה־${nm} בולט בכל פעם (+${pct}%)` }),
  noteLate: (h: 'R' | 'L' | null, nm: string, ms: number): L => (h ? { en: `${HAND_EN[h]}: ${nm} late (+${ms} ms)`, he: `${HAND_HE[h]}: ה־${nm} מאחר (+${ms} מ״ש)` } : { en: `${nm} late (+${ms} ms)`, he: `ה־${nm} מאחר (+${ms} מ״ש)` }),
  notesEven: { en: 'Notes even', he: 'הצלילים אחידים' },
  crossBump: (n: number): L => ({ en: `Bump after the crossing (${n})`, he: `בליטה אחרי המעבר (${n})` }),
  crossLate: (n: number): L => ({ en: `Late after the crossing (${n})`, he: `איחור אחרי המעבר (${n})` }),
  whyNoteSoft: { en: 'Slowly, that note a little deeper into the key.', he: 'לאט, הצליל הזה קצת יותר עמוק לתוך הקליד.' },
  whyNoteLoud: { en: 'Lighter on that note, the hand level.', he: 'קל יותר על הצליל הזה, היד מאוזנת.' },
  // ---- lengths and releases (G4), staccato and slurs (G1) ----
  lengthsOk: { en: 'Long notes held', he: 'הצלילים הארוכים הוחזקו' },
  lengthsShort: (n: number): L => ({ en: `Long notes cut short (${n})`, he: `צלילים ארוכים קוצרו (${n})` }),
  releaseOk: { en: 'Clean releases at rests', he: 'שחרור נקי במנוחות' },
  releaseLong: (h: 'R' | 'L' | null, n: number): L => (h ? { en: `${HAND_EN[h]} rang into the rest (${n})`, he: `${HAND_HE[h]} המשיכה לצלצל במנוחה (${n})` } : { en: `Rang into the rest (${n})`, he: `המשיך לצלצל במנוחה (${n})` }),
  whyLengths: { en: 'Hold each long note to its full value.', he: 'להחזיק כל צליל ארוך עד סוף הערך שלו.' },
  whyRelease: { en: 'Lift the key right on the rest.', he: 'להרים את הקליד בדיוק במנוחה.' },
  stacOk: { en: 'Staccato short', he: 'הסטקטו קצר' },
  stacLong: (n: number): L => ({ en: `Staccato too long (${n})`, he: `סטקטו ארוך מדי (${n})` }),
  slurOk: { en: 'Slurs joined', he: 'הלגאטו מחובר' },
  slurGap: (n: number): L => ({ en: `Gaps under the slur (${n})`, he: `רווחים בתוך הלגאטו (${n})` }),
  whyStac: { en: 'Off the key at once, half the note or less.', he: 'לעזוב את הקליד מיד, חצי מהתו או פחות.' },
  whySlur: { en: 'Hold each key until the next one sounds.', he: 'להחזיק כל קליד עד שהבא נשמע.' },
  // ---- tempo and swing (G5, B2) ----
  driftOk: { en: 'Tempo steady', he: 'הטמפו יציב' },
  rushed: (a: number, b: number): L => ({ en: `Rushed: ♩${a} → ♩${b}`, he: `האצתם: ♩${a} → ♩${b}` }),
  dragged: (a: number, b: number): L => ({ en: `Dragged: ♩${a} → ♩${b}`, he: `האטתם: ♩${a} → ♩${b}` }),
  whyRush: { en: 'Listen for the click at the end as much as at the start.', he: 'להקשיב לקליק בסוף כמו בהתחלה.' },
  swingOk: (r: string): L => ({ en: `Swing steady (${r})`, he: `סווינג יציב (${r})` }),
  swingStraight: (r: string): L => ({ en: `Swing too straight (${r})`, he: `סווינג ישר מדי (${r})` }),
  swingHeavy: (r: string): L => ({ en: `Swing too heavy (${r})`, he: `סווינג כבד מדי (${r})` }),
  swingUneven: { en: 'Swing uneven', he: 'סווינג לא אחיד' },
  whySwing: (r: string): L => ({ en: `At this tempo the long note is about ${r} of the beat.`, he: `בטמפו הזה הצליל הארוך הוא בערך ${r} מהפעמה.` }),
  whySwingUneven: { en: 'The same long-short on every beat.', he: 'אותו ארוך־קצר בכל פעמה.' },
  // ---- pedal (G6, B5) ----
  pedalOk: (ok: number, n: number): L => ({ en: `Pedal clean (${ok}/${n})`, he: `פדל נקי (${ok}/${n})` }),
  pedalBlur: (n: number): L => ({ en: `Pedal blurred ${n} chord change${n === 1 ? '' : 's'}`, he: n === 1 ? 'הפדל ערבב החלפת אקורד אחת' : `הפדל ערבב ${n} החלפות אקורד` }),
  whyBlur: { en: 'Lift as the new chord sounds, press again just after.', he: 'להרים כשהאקורד החדש נשמע, וללחוץ שוב מיד אחריו.' },
  // ---- chords (B4, G7) ----
  chordsOk: { en: 'Chords together', he: 'האקורדים יחד' },
  rolled: (n: number, of: number): L => (n === 1 ? { en: 'One chord rolled', he: 'אקורד אחד מפוזר' } : { en: `Rolled chords (${n} of ${of})`, he: `אקורדים מפוזרים (${n} מתוך ${of})` }),
  whyRoll: { en: 'All the fingers down as one.', he: 'כל האצבעות יורדות כאחת.' },
  voiced: (n: number, of: number): L => ({ en: `Top note sang in ${n} of ${of} chords`, he: `הצליל העליון בלט ב־${n} מתוך ${of} אקורדים` }),
  whyVoiced: { en: 'Weight toward the 5th finger, the others lighter.', he: 'משקל לכיוון האצבע החמישית, השאר קלות יותר.' },
  // ---- calibration (B6, B7) ----
  habitEarly: (ms: number): L => ({ en: `Your habit: ${ms} ms ahead of the click`, he: `ההרגל שלכם: ${ms} מ״ש לפני הקליק` }),
  habitLate: (ms: number): L => ({ en: `Your habit: ${ms} ms behind the click`, he: `ההרגל שלכם: ${ms} מ״ש אחרי הקליק` }),
  habitNone: { en: 'You play right on the click', he: 'אתם מנגנים בדיוק על הקליק' },
  habitKept: { en: 'Kept in your marks, not removed.', he: 'נשאר בסימונים שלכם, לא מנוכה.' },
  deviceDelay: (ms: number): L => ({ en: `Device delay ${ms} ms`, he: `השהיית המכשיר ${ms} מ״ש` }),
  velSoftN: (k: number, n: number): L => ({ en: `Softest notes ${k}/${n}`, he: `הצלילים השקטים ${k}/${n}` }),
  velLoudN: (k: number, n: number): L => ({ en: `Loudest notes ${k}/${n}`, he: `הצלילים החזקים ${k}/${n}` }),
  velHow: { en: 'Play your softest note several times, then your loudest.', he: 'נגנו כמה פעמים את הצליל השקט ביותר שלכם, ואחר כך את החזק ביותר.' },
  velCheck: { en: 'Check: play p, then mf, then f', he: 'בדיקה: נגנו p, אחר כך mf, אחר כך f' },
  velCheckOk: { en: 'Your three levels are apart', he: 'שלוש הרמות שלכם נפרדות' },
  velCheckBad: { en: 'Two levels came out alike: calibrate again', he: 'שתי רמות יצאו דומות: כיילו שוב' },
  // ---- second round (2026-11-17): accents in place (G9) ----
  accentsOk: (n: number, of: number): L => ({ en: `Accents in place (${n}/${of})`, he: `ההטעמות במקום (${n}/${of})` }),
  accentsMissed: (n: number, of: number): L => ({ en: `Accents missing (${n} of ${of})`, he: `הטעמות חסרות (${n} מתוך ${of})` }),
  accentsExtra: (n: number): L => ({ en: `Accents where none is written (${n})`, he: `הטעמות במקום לא כתוב (${n})` }),
  whyAccents: { en: 'Only the marked notes louder, the rest even.', he: 'רק הצלילים המסומנים חזקים, השאר אחידים.' },
  // ---- trills and repeated notes (G10) ----
  trillSpeed: (nps: number): L => ({ en: `${nps} notes a second`, he: `${nps} צלילים בשנייה` }),
  trillSlowed: { en: 'Slowed in the last third', he: 'האטתם בשליש האחרון' },
  trillFaded: { en: 'Faded in the last third', he: 'נחלשתם בשליש האחרון' },
  trillPair: (weak: string, strong: string, pct: number): L => ({ en: `${weak} softer than ${strong} (−${pct}%)`, he: `ה־${weak} חלש מה־${strong} (−${pct}%)` }),
  whyTrill: { en: 'Short bursts at this speed, then longer ones.', he: 'פרצים קצרים במהירות הזו, ואז ארוכים יותר.' },
  whyTrillPair: { en: 'Both notes from the same height, with the same weight.', he: 'שני הצלילים מאותו גובה, באותו משקל.' },
  // ---- leaps and octaves (G11) ----
  leapsOk: { en: 'Leaps landed on time', he: 'הקפיצות נחתו בזמן' },
  leapsLate: (ms: number, n: number): L => ({ en: `Late after leaps (+${ms} ms, ${n})`, he: `איחור אחרי קפיצות (+${ms} מ״ש, ${n})` }),
  whyLeaps: { en: 'Look and move early; land on the beat.', he: 'להסתכל ולזוז מוקדם; לנחות על הפעמה.' },
  octavesApart: (n: number, of: number): L => ({ en: `Octaves not together (${n} of ${of})`, he: `אוקטבות לא יחד (${n} מתוך ${of})` }),
  whyOctaves: { en: 'Both notes of the octave down as one.', he: 'שני צלילי האוקטבה יורדים כאחד.' },
  // ---- sudden marks: sf, fp (G12) ----
  subitoOk: (n: number): L => ({ en: `sf / fp heard (${n})`, he: `sf / fp נשמעו (${n})` }),
  sfMiss: (where: L): L => pre(where, { en: ': sf not heard', he: ': ה־sf לא בלט' }),
  fpMiss: (where: L): L => pre(where, { en: ': fp without the drop', he: ': fp בלי ירידה מיד אחריו' }),
  whySf: { en: 'That note alone, much louder, then straight back.', he: 'רק הצליל הזה, הרבה יותר חזק, ומיד חזרה.' },
  whyFp: { en: 'A loud attack, then soft at once.', he: 'התקפה חזקה, ומיד שקט.' },
  // ---- the soft pedal (G13) ----
  ucOk: { en: 'Soft pedal where written', he: 'הפדל השמאלי במקום הכתוב' },
  ucMissing: (n: number, of: number): L => ({ en: `Soft pedal missing (${n} of ${of} notes)`, he: `חסר פדל שמאלי (${n} מתוך ${of} צלילים)` }),
  ucLeft: { en: 'Soft pedal left down after tre corde', he: 'הפדל השמאלי נשאר לחוץ אחרי tre corde' },
  whyUc: { en: 'Left pedal down at una corda, up at tre corde.', he: 'פדל שמאלי למטה ב־una corda, למעלה ב־tre corde.' },
  // ---- an Encore phrase against its model take (G14) ----
  modelOk: { en: 'Dynamics like the model', he: 'העוצמות כמו במקור' },
  modelApart: { en: 'Dynamics unlike the model', he: 'העוצמות לא כמו במקור' },
  modelAccent: (bar: number, beat: number): L => ({ en: `The model leans on bar ${bar}, beat ${beat}`, he: `במקור יש הדגשה בתיבה ${bar}, פעמה ${beat}` }),
  whyModel: { en: 'Hear the model again: where it grows, where it leans.', he: 'להקשיב שוב למקור: איפה הוא גדל, על מה הוא נשען.' },
  // ---- melody over the accompaniment (pieces) ----
  melodyAbove: (n: number, of: number): L => ({ en: `Melody above in ${n} of ${of} bars`, he: `המנגינה בלטה ב־${n} מתוך ${of} תיבות` }),
  whyMelody: { en: 'The melody hand heavier, the accompaniment lighter.', he: 'יד המנגינה כבדה יותר, הליווי קל יותר.' },
  // ---- the piano by microphone (micTouch.ts): loudness steps, shapes and the release, from the sound's energy ----
  micStepOk: (db: number): L => ({ en: `p and f apart (${db} dB)`, he: `p ו־f נפרדים (${db} dB)` }),
  micStepFlat: (db: number): L => ({ en: `p and f too close (${db} dB)`, he: `p ו־f קרובים מדי (${db} dB)` }),
  whyMicStep: { en: 'p clearly softer, f clearly louder.', he: 'p שקט בבירור, f חזק בבירור.' },
  micLegatoOk: { en: 'Legato joined', he: 'הלגאטו מחובר' },
  micLegatoGap: (n: number): L => ({ en: `Gaps in the legato (${n})`, he: `רווחים בלגאטו (${n})` }),
  whyMicLegato: { en: 'Hold each key until the next one sounds.', he: 'להחזיק כל קליד עד שהבא נשמע.' },
  whyMicStac: { en: 'Off the key at once, without the pedal.', he: 'לעזוב את הקליד מיד, בלי פדל.' },
  micQuiet: { en: 'Too quiet to measure the loudness', he: 'חלש מדי למדידת עוצמה' },
  micFast: { en: 'Too fast to hear the release', he: 'מהר מדי לשמוע את השחרור' },
  micFew: { en: 'Too few clear notes to measure the touch', he: 'מעט מדי צלילים ברורים למדידת המגע' },
  whyMicNoClaim: { en: 'Phone closer to the piano, a quiet room, no pedal.', he: 'הטלפון קרוב יותר לפסנתר, חדר שקט, בלי פדל.' },
  micBy: { en: 'by microphone', he: 'במיקרופון' },
  // ---- the level test: places the test inferred instead of measuring ----
  inferred: { en: 'inferred', he: 'משוער' },
  inferredNote: { en: 'Inferred: not measured in this test', he: 'משוער: לא נמדד במבחן הזה' },
  // ---- voice: brightness (G15), relative within one note only ----
  brightness: { en: 'Brightness change', he: 'שינוי בהירות' },
  // ---- the review ----
  touchHead: { en: 'Touch', he: 'מגע' },
  why: { en: 'Why?', he: 'למה?' },
} as const;

/** The swing ratio as long/short percentages ("58/42"). */
export const ratioText = (r: number): string => `${Math.round(r * 100)}/${100 - Math.round(r * 100)}`;

// ---- the long-term profile (G8): a touch measure missed in most recent takes, named by its usual reason ----
type CtlText = { text: L; note: L };
const c = (en: string, he: string, nen: string, nhe: string): CtlText => ({ text: { en, he }, note: { en: nen, he: nhe } });
const SLOW = ['Slowly, one octave first, then two.', 'לאט, קודם אוקטבה אחת ואז שתיים.'] as const;
export const CTL_TEXT: Record<string, CtlText> = {
  'cresc-none': c('Your crescendos hardly grow', 'הקרשנדו שלכם כמעט לא גדל', 'Start softer than feels right.', 'להתחיל שקט יותר ממה שנראה נכון.'),
  'cresc-jump': c('Your crescendos climb in jumps', 'הקרשנדו שלכם עולה בקפיצות', 'A little louder every note, none skipped.', 'קצת יותר חזק בכל צליל, בלי לדלג.'),
  'cresc-early': c('Your crescendos peak early', 'הקרשנדו שלכם מגיע לשיא מוקדם', 'Keep the loudest for the top note.', 'לשמור את החזק ביותר לצליל העליון.'),
  'cresc-flat': c('Your crescendos flatten before the top', 'הקרשנדו שלכם נעצר לפני השיא', 'Keep growing until the top note.', 'להמשיך לגדול עד הצליל העליון.'),
  'cresc-small': c('Your crescendos are small', 'הקרשנדו שלכם קטן', ...SLOW),
  'cresc-uneven': c('Your crescendos are uneven', 'הקרשנדו שלכם לא אחיד', ...SLOW),
  'shape-L': c('Your crescendos are weaker in the left hand', 'הקרשנדו ביד שמאל חלש יותר', 'The left hand alone first, then together.', 'קודם יד שמאל לבד, ואז יחד.'),
  'shape-R': c('Your crescendos are weaker in the right hand', 'הקרשנדו ביד ימין חלש יותר', 'The right hand alone first, then together.', 'קודם יד ימין לבד, ואז יחד.'),
  'dim-none': c('Your diminuendos hardly fade', 'הדימינואנדו שלכם כמעט לא נחלש', 'Each note a step softer than the last.', 'כל צליל צעד אחד מתחת לקודם.'),
  'dim-jump': c('Your diminuendos drop in jumps', 'הדימינואנדו שלכם יורד בקפיצות', 'A little softer every note, none skipped.', 'קצת יותר שקט בכל צליל, בלי לדלג.'),
  'dim-early': c('Your diminuendos fall too early', 'הדימינואנדו שלכם יורד מוקדם מדי', 'Come down gradually, all the way to the last note.', 'לרדת בהדרגה, עד הצליל האחרון.'),
  'dim-late': c('Your diminuendos fall at the very end', 'הדימינואנדו שלכם נופל רק בסוף', 'Start getting softer right after the top.', 'להתחיל להחליש מיד אחרי השיא.'),
  'dim-small': c('Your diminuendos are small', 'הדימינואנדו שלכם קטן', ...SLOW),
  'dim-uneven': c('Your diminuendos are uneven', 'הדימינואנדו שלכם לא אחיד', ...SLOW),
  'hands-dyn': c("Your hands' dynamics drift apart", 'העוצמה של הידיים שלכם לא הולכת יחד', 'Hands together at one level, then shape them together.', 'ידיים יחד ברמה אחת, ואז לעצב אותן יחד.'),
  zones: c('Your written levels blur together', 'הרמות הכתובות אצלכם מתערבבות', 'One clear level per passage.', 'רמה אחת ברורה לכל קטע.'),
  hair: c('Your hairpins stay flat', 'סימני הקרשנדו והדימינואנדו אצלכם נשארים שטוחים', 'Follow each hairpin to its end.', 'ללכת עם כל סימן עד סופו.'),
  creep: c('You get louder as you go faster', 'אתם מתחזקים כשאתם מאיצים', 'The soft-at-speed level, slowly up the ladder.', 'השלב של שקט במהירות, לאט במעלה סולם הטמפו.'),
  'level-loud': c('You play louder than the level asks', 'אתם מנגנים חזק יותר מהרמה המבוקשת', 'Calibrate, then aim for the middle of the level.', 'לכייל, ואז לכוון לאמצע הרמה.'),
  'level-soft': c('You play softer than the level asks', 'אתם מנגנים חלש יותר מהרמה המבוקשת', 'Calibrate, then aim for the middle of the level.', 'לכייל, ואז לכוון לאמצע הרמה.'),
  'soft-finger': c('One finger is often soft', 'אצבע אחת חלשה לעיתים קרובות', 'Five-finger patterns, slowly, with even tone.', 'תבניות חמש אצבעות, לאט, בצליל אחיד.'),
  'loud-finger': c('One finger often bumps', 'אצבע אחת בולטת לעיתים קרובות', 'Five-finger patterns, slowly, with even tone.', 'תבניות חמש אצבעות, לאט, בצליל אחיד.'),
  'soft-note': c('One note often comes out soft', 'צליל אחד יוצא חלש לעיתים קרובות', 'Slowly, with even tone; then an accent on that note.', 'לאט ובצליל אחיד; אחר כך מבטא על הצליל הזה.'),
  'loud-note': c('One note often bumps', 'צליל אחד בולט לעיתים קרובות', 'Slowly, with even tone.', 'לאט ובצליל אחיד.'),
  'late-note': c('One note often comes late', 'צליל אחד מאחר לעיתים קרובות', 'Prepare it over its key.', 'להכין אותו מעל הקליד.'),
  'cross-late': c('You arrive late after crossings', 'אתם מאחרים אחרי מעבר', 'Prepare the crossing early.', 'להכין את המעבר מוקדם.'),
  thumb: c('You bump after crossings', 'האגודל שלכם בולט אחרי מעבר', 'Thumb under, slowly: pass early, land softly.', 'העברת אגודל לאט: להעביר מוקדם, לנחות בעדינות.'),
  lengths: c('You clip long notes', 'אתם מקצרים צלילים ארוכים', 'Count the full value with the key down.', 'לספור את כל הערך כשהקליד למטה.'),
  release: c('Your notes ring into rests', 'הצלילים שלכם ממשיכים לצלצל במנוחות', 'Lift right on the rest.', 'להרים בדיוק במנוחה.'),
  stac: c('Your staccato is long', 'הסטקטו שלכם ארוך', 'Off the key at once.', 'לעזוב את הקליד מיד.'),
  slur: c('Your slurs break', 'הלגאטו שלכם נשבר', 'Hold each key until the next sounds.', 'להחזיק כל קליד עד שהבא נשמע.'),
  rush: c('You speed up through a take', 'אתם מאיצים לאורך הנגינה', 'Listen to the click at the end as at the start.', 'להקשיב לקליק בסוף כמו בהתחלה.'),
  drag: c('You slow down through a take', 'אתם מאטים לאורך הנגינה', 'Listen to the click at the end as at the start.', 'להקשיב לקליק בסוף כמו בהתחלה.'),
  'swing-straight': c('Your swing is straight', 'הסווינג שלכם ישר', 'Lean on the long note of each pair.', 'להישען על הצליל הארוך בכל זוג.'),
  'swing-heavy': c('Your swing is too heavy', 'הסווינג שלכם כבד מדי', 'Lighter: closer to even at fast tempi.', 'קל יותר: קרוב לשווה בטמפו מהיר.'),
  'swing-uneven': c('Your swing changes beat to beat', 'הסווינג שלכם משתנה מפעמה לפעמה', 'The same long-short on every beat.', 'אותו ארוך־קצר בכל פעמה.'),
  pedal: c('Your pedal changes miss', 'החלפות הפדל שלכם מפספסות', 'Up with the new chord, down just after.', 'למעלה עם האקורד החדש, למטה מיד אחריו.'),
  blur: c('Your pedal blurs chord changes', 'הפדל שלכם מערבב החלפות אקורד', 'Change the pedal at every new chord.', 'להחליף פדל בכל אקורד חדש.'),
  roll: c('Your chords roll', 'האקורדים שלכם מפוזרים', 'All the fingers down as one.', 'כל האצבעות יורדות כאחת.'),
  voicing: c("Your chords' top note doesn't sing", 'הצליל העליון באקורדים שלכם לא בולט', 'Weight toward the 5th finger.', 'משקל לכיוון האצבע החמישית.'),
  // second round (G9–G14, melody balance, the microphone)
  'accent-miss': c('Your accents go missing', 'ההטעמות שלכם נעלמות', 'Slowly, the accented note from higher.', 'לאט, הצליל המוטעם מגובה רב יותר.'),
  'accent-extra': c('You accent notes that are not marked', 'אתם מטעימים צלילים שלא מסומנים', 'The unmarked notes light and even.', 'הצלילים הלא מסומנים קלים ואחידים.'),
  'trill-slow': c('Your trills slow down at the end', 'הטרילים שלכם מאטים בסוף', 'Short bursts, then longer ones.', 'פרצים קצרים, ואז ארוכים יותר.'),
  'trill-fade': c('Your trills fade at the end', 'הטרילים שלכם נחלשים בסוף', 'Short bursts, the same weight to the end.', 'פרצים קצרים, אותו משקל עד הסוף.'),
  'trill-pair': c('One note of your trills is softer', 'צליל אחד בטרילים שלכם חלש יותר', 'Slowly, both notes with the same weight.', 'לאט, שני הצלילים באותו משקל.'),
  'leap-late': c('You land late after leaps', 'אתם נוחתים מאוחר אחרי קפיצות', 'Look and move early; land on the beat.', 'להסתכל ולזוז מוקדם; לנחות על הפעמה.'),
  octaves: c('Your octaves split', 'האוקטבות שלכם מתפצלות', 'Both notes of the octave down as one.', 'שני צלילי האוקטבה יורדים כאחד.'),
  subito: c('Your sf and fp are not heard', 'ה־sf וה־fp שלכם לא נשמעים', 'That note alone, much louder, then back.', 'רק הצליל הזה, הרבה יותר חזק, ומיד חזרה.'),
  'una-corda': c('Your soft pedal misses the marks', 'הפדל השמאלי שלכם לא במקום', 'Down at una corda, up at tre corde.', 'למטה ב־una corda, למעלה ב־tre corde.'),
  'model-dyn': c('Your dynamics drift from the model', 'העוצמות שלכם רחוקות מהמקור', 'Hear the model again, then shape with it.', 'להקשיב שוב למקור, ואז לעצב איתו.'),
  'model-acc': c("You miss the model's accents", 'אתם מפספסים את ההדגשות של המקור', 'Find the leaning notes of the model first.', 'קודם למצוא את הצלילים שהמקור נשען עליהם.'),
  melody: c("Your melody doesn't sit above the accompaniment", 'המנגינה שלכם לא בולטת מעל הליווי', 'Accompaniment alone, softly; then the melody over it.', 'קודם הליווי לבד, בשקט; ואז המנגינה מעליו.'),
  'mic-legato': c('Your legato has gaps', 'בלגאטו שלכם יש רווחים', 'Hold each key until the next one sounds.', 'להחזיק כל קליד עד שהבא נשמע.'),
  'mic-step': c('Your p and f sound alike', 'ה־p וה־f שלכם נשמעים דומה', 'p clearly softer, f clearly louder.', 'p שקט בבירור, f חזק בבירור.'),
};
/** The touch measure (TouchLine id) a miss tag belongs to. */
export function ctlKindOf(tag: string): string {
  const t = tag.split(':')[0];
  if (t.startsWith('cresc-') || t.startsWith('shape-')) return 'cresc';
  if (t.startsWith('dim-')) return 'dim';
  if (t.startsWith('level-')) return 'level';
  if (t === 'soft-finger' || t === 'loud-finger' || t === 'soft-note' || t === 'loud-note') return 'finger';
  if (t === 'late-note' || t === 'cross-late') return 'late-finger';
  if (t === 'rush' || t === 'drag') return 'drift';
  if (t.startsWith('swing-')) return 'swing';
  if (t === 'accent-miss' || t === 'accent-extra') return 'accents';
  if (t.startsWith('trill-')) return 'trill';
  if (t === 'leap-late') return 'leaps';
  if (t === 'octaves') return 'roll';
  if (t === 'model-dyn' || t === 'model-acc') return 'model';
  if (t === 'mic-legato') return 'legato';
  if (t === 'mic-step') return 'zones';
  return t;
}
