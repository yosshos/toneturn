# שאלות לאימות תאוריה / Theory questions to verify

כלל הבעלים (2026-11-15): מה שלא ודאי ב־100% לא מוצג. כל פריט כאן **מוסתר כרגע** מהמשתמשים, דרך רישום אחד:
`src/engine/verifiedContent.ts`. כשאתה מאשר פריט, מוסיפים את המזהה שלו (בסוגריים, למשל `bh-chromatic`) ל־`SWITCHED_ON`
באותו קובץ, והתוכן חוזר בכל מקום בבת אחת (מסלול, מפה, תרגילים, משחקים, אימון, מבחן רמה, שיעורים, דף העומק).
אם התשובה היא "לא", כותבים מה הנכון ונתקן את התוכן לפני שמדליקים אותו.

הסדר: קודם מתאר הסולמות, התאוריה וגישת ההרמוניה, אחר כך כלים לקו, אחר כך סיסקינד והתופים. הכול ב־C.

---

## עברית

### א. בארי האריס: מתאר סולמות, תאוריה, גישה

**1. מתאר הסולמות של הבלוז (`bh-outline-blues`).**
מה יש לנו: בלוז ב־C, סולם אחד בכל תיבה מהיסוד למעלה, בשמיניות: 1 C7, 2 F7, 3 C7, 4 C7 (חוזר למטה), 5 F7, 6 F♯°7 (הדימיניש הקשור: F♯ A C E♭ חוזר), 7 C7, 8 C7 (למטה), 9 Dm7 → מנגנים **סולם G7** (ii הוא V), 10 G7 (למטה), 11 C7 / A7 (חצי תיבה כל אחד), 12 Dm7 G7.
מקור: פוסט אחד של קבוצת לימוד בפורום; Workbook 1 פרק 2 ידוע רק בכותרת.
לבדוק: Workbook 1, פרק 2 ("scale outlines"), או סרטון Parks / Open Studio על מתאר הבלוז: האם התיבות 4, 8, 10 באמת יורדות; האם בתיבה 6 מנגנים את סולם הדימיניש (ולא F7); האם בתיבה 9 מנגנים את סולם ה־G7 על Dm7.

**2. אקורדי שלושה שירים למתאר (`tune-charts`).**
מה יש לנו (8–16 תיבות פתיחה, הוקלד מהזיכרון):
- Cherokee (B♭): `B♭maj7 | Fm7 B♭7 | E♭maj7 | A♭7 | B♭maj7 | C7 | Cm7 | F7` — כל אקורד תיבה אחת.
- How High the Moon (G): `Gmaj7 | Gmaj7 | Gm7 | C7 | Fmaj7 | Fmaj7 | Fm7 | B♭7 | E♭maj7 | Am7♭5 D7 | Gmaj7 | Am7 D7 | Bm7 | E7 | Am7 | D7`.
- A Night in Tunisia (D minor): `E♭7 | Dm6 | E♭7 | Dm6 | E♭7 | Dm6 | Em7♭5 A7 | Dm6`.
לבדוק: מול Real Book / iReal. במיוחד Cherokee: בשיר המקורי כל אקורד מחזיק **שתי** תיבות (B♭maj7 ×2, Fm7 B♭7, E♭maj7 ×2, A♭7 ×2…) — האם לפרוס כך? (אין כאן שאלה על בארי; זו שאלת עובדות של אקורדים.)

**3. הסולם הכרומטי של בארי (`bh-chromatic`).**
מה יש לנו, בשמיניות, דרגות הסולם על הפעמות:
- מז׳ור, עולה: `C C♯ D D♯ E G F F♯ G G♯ A A♯ B D C` (בחצי טון E–F: מדלגים ל־G וחוזרים ל־F; ב־B–C: מדלגים ל־D וחוזרים ל־C).
- מז׳ור, יורד (האפליקציה **שיקפה** את החוק, אין מקור): `C A B B♭ A A♭ G G♭ F D E E♭ D D♭ C`.
- דומיננט C7, עולה: `C C♯ D D♯ E G F F♯ G G♯ A C B♭ B C`; יורד: `C B B♭ G A A♭ G G♭ F D E E♭ D D♭ C`.
- מינור 6־דים, עולה: `C C♯ D F E♭ E F F♯ G A A♭ B A B♭ B D C`.
מקור: Larsen, Otto (בלוגים), כותרות Parks / Echols. אף מקור ראשוני לא מדפיס את הצלילים.
לבדוק: סרטון של בארי (או Parks, "Barry's chromatic scale", Open Studio) — (א) האם העולה במז׳ור הוא בדיוק כך; (ב) **האם יש לבארי גרסה יורדת**, ואם כן מה הצלילים בחצי הטון (לדלג למטה וחזרה, או משהו אחר); (ג) האם בדומיננט הדילוג הוא ב־A–B♭ (A C B♭); (ד) האם זה קיים בכלל על המינור 6־דים.

**4. הדומיננט בשמונה דרכים, החימום של Parks (`parks-eight-ways`).**
מה יש לנו על C7: דרכים 1–7 = עולים בסולם הדומיננט מדרגה 1, 2, 3, 4, 5, 6, ♭7 עד האוקטבה, ואז יורדים לפי חוק חצי הטון של הדרגה (למשל מ־1: `C D E F G A B♭ C | B B♭ A G F E D C`); דרך 8 = יורדים מהאוקטבה עם שלושה חצאי טון: `C B B♭ A G F E E♭ D D♭ C`.
מקור: רק הכותרת של הפרק של Parks ("the dominant scale eight ways").
לבדוק: הפרק עצמו (Parks, Things I've Learned / Open Studio): מה הן שמונה הדרכים בדיוק?

**5. שבע למטה לטרצה (`bh-seven-down`).**
מה יש לנו, ב־C מינור, מעל Dø–G7: B♭7 עולה מ־B♭ עד A♭, ואז יורדים מה־A♭ ונוחתים על B, אחר כך C: `B♭ C D E♭ F G A♭ | A♭ G F E♭ D C B | C`.
מקור: בלוג (Cleary), פורום, הערה בהעתקה של Marijt. לא סרטון/חוברת של בארי.
לבדוק: האם זה מכשיר של בארי, ובאיזה שם; האם הצלילים כאלה (במיוחד: עולים עד ה־♭7 של B♭7 ואז יורדים "מהשביעית").

**6. 3 עד ♭9 על המשפחה (`bh-3-to-b9`).**
מה יש לנו: על G7 (וכל אחיו B♭7, D♭7, E7): `B D F A♭` = הדימיניש על הטרצה, ארפג׳ בעליות. האפליקציה מלמדת את זה כמכשיר קו של בארי.
מקור: Larsen בלבד (התאוריה עצמה — 7♭9 בלי יסוד = דימיניש — מאומתת).
לבדוק: האם בארי מלמד "3 to ♭9" כארפג׳ קו (כמו "3 to 9")?

**7. הפיבוט של המז׳ור על ♭7 (`bh-b7-major-pivot`).**
מה יש לנו: על C7 → F: B♭maj7 כפיבוט (B♭ למעלה, ואז D F A מתחת), ואז ארפג׳ C7 למטה, אל ה־A של F.
מקור: Larsen בלבד.
לבדוק: האם "המז׳ור על ה־♭7" הוא ארפג׳ שבארי מלמד על דומיננט?

**8. להרגיש 6 בתוך 4 (`bh-feel6`).**
מה יש לנו: קו ברבעים מנוקדים (או תאים של שלוש שמיניות) מעל ארבע פעמות.
מקור: כותרת פרק בסרטון הסדנה בלבד.
לבדוק: Workshop Video 2, הפרק "feel 6 in 4": מה בדיוק התרגיל?

**9. לחבר קו ולנגן אותו בכל שיר (`bh-compose`).**
מה יש לנו: מעל I → VI7, ii–V–I, ריתם צ׳יינג׳ס — צליל אקורד על כל פעמה, השאר מהסולם או כרומטי; "בארי וריס נתנו לתלמידים לכתוב קו פעם אחת ולנגן אותו בכל שיר עם אותו מהלך".
מקור: דיווח אחד בפורום.
לבדוק: האם זו פרקטיקה של בארי (Workbook / סדנה)?

**10. האלף־בית בטרצות וארפג׳ים מז׳וריים בירידה כרומטית (`bh-abcs-arps-down`).**
מה יש לנו: טרצות כשכל צליל מקבל חצי טון מתחת; ארפג׳ים מז׳וריים C, B, B♭… בירידה.
מקור: דיווח אחד בפורום.
לבדוק: האם אלה תרגילים של בארי, ובאיזה סדר.

**11. הסולם הכרומטי בשני קולות (`bh-chromatic-two-voices`).**
מה יש לנו: סולם 6־דים כרומטי בטרצות או בסקסטות "באותה קומה".
מקור: כותרת שיעור 8 של Echols (Labyrinth) בלבד.
לבדוק: השיעור של Echols — מה הקול השני בדיוק? (תלוי גם בשאלה 3.)

### ב. אקולס: מעלית ושונות

המעלית עצמה **אומתה** (בונים מהטוניקה בלבד; תוקן בקוד). נשארו מוסתרים:

**12. סולם הקולות של אקולס (`echols-voicing-ladder`).**
מה יש לנו: טרצות, משולשים, "שלדים" ו"אקורדי אוקטבה" על סולם 6־דים. מקור: כותרות של סרטונים קצרים; הצורות עצמן בתשלום.
לבדוק: מה זה "shell" ו"octave chord" אצל Echols (אילו צלילים, ב־C6 מ־C)?

**13. השאלה דרך המעלית (`echols-elevator-borrow`).**
מה יש לנו: בקומות 5–8 הסופרן מחזיק והשאר זזים צעד אל האקורד השני. מקור: הסקה (Echols E04 בתשלום).
לבדוק: מה עושים ב־E04.

**14. המעלית מתחת למנגינה (`echols-elevator-melody`).**
מה יש לנו: מנגינה עולה בסולם, קומה אחת למעלה בכל צליל, ואז לאורך קומת דרופ 2 — כלומר קומות שלא מתחילות מהטוניקה. מקור: הערה של סטודנט בפורום (Autumn Leaves).
לבדוק: האם תומס עושה דבר כזה, ואיך.

### ג. סיסקינד, פסנתר סולו (השאלות נשארות פתוחות)

**15. מקצבי ליווי (`siskind-comp-rhythms`).**
מה יש לנו: צ׳רלסטון מ־3 = על 3 ועל ה"וְ" של 4; קצב בייסי = אקורדים קלים על 2 ו־4; פוש־אוף = אקורד על 4 ועל ה"וְ" של 4; ליווי על ההדגשות = על ה"וְ" של 2 ועל 4. גם שאלות השמיעה "מקצבי ליווי בשמיעה".
מקור: השמות מתיאורי הסרטונים שלו; המיקומים שלנו.
לבדוק: בסרטוני Siskind (comping vocabulary / coursepack): היכן בדיוק נופלים האקורדים בכל אחד מהם?

**16. ליווי שלדים ביד שמאל ושאטל (`siskind-shell-comping`).**
מה יש לנו: הפוך = בס על 1, אקורד על 1+ ועל 3; רד גרלנד = אקורדים על החלשים עם הקדמה; פוש־אוף; כניסה על 4; השאטל = יד שמאל בין בס לקול אמצעי מתחת ליד ימין מוחזקת.
לבדוק: אותם סרטונים — הדמויות המדויקות.

**17. וריאציות סטרייד (`siskind-stride-variations`).**
מה יש לנו: Peace Piece = נמוך־גבוה־גבוה־נמוך; הפוך = אקורד על 1 ו־3, בס על 2 ו־4; דילוג = פעמה 4 בכל תיבה שנייה; 3+3+2 = בס על 1, אקורד על ה"וְ" של 2, בס על 4; הקדמת הבס על ה"וְ" של 4; הקדמת בס ואקורד; אקורד מוקדם על ה"וְ" של 1 ו־3; תא של שלוש פעמות על 4/4; הפסקות של שתי תיבות.
לבדוק: סרטון "stride variations" — אילו וריאציות ובאיזה מיקום.

**18. דצימות הולכות ושיר שלם בדצימות (`siskind-tenths`).**
מה יש לנו: כל פעמה דצימה, בצעדים אל האקורד הבא; טיפ: שיר שלם בדצימות על 1 ו־3. לבדוק: את הסרטון עם הפרק "walking 10ths".

**19. צורות יד שמאל (`siskind-lh-variants`).**
מה יש לנו: בס+צליל עם השביעית קודם (D3+C4 → G2+B2 → C3+B3); הנונה מתחת לאגודל ב־Type B; הסינקופה של Evans. לבדוק: Ex. B.3 בספר, והקלטת "Alone" של Evans.

**20. מרקמים (`siskind-textures`).**
מה יש לנו: צעדים צדדיים בדרופ 2 (כל הבלוק חצי טון מעל, שמינית לפני צליל ארוך); תנועת קול פנימי — בחרנו "חצי טון למטה וחזרה" מתוך החמש שלו. לבדוק: "Deep Dive on Locked Hands Comping" ואת חמש התנועות.

### ד. תופים: הקלטות שלנו

**21. מאמבו, סונגו, מוזמביק (`latin-kit-patterns`, רמות d-latin 8–10).**
מה יש לנו (`src/engine/drills/drumLatin2.ts`, x = מכה, בשמיניות לשתי תיבות או בשש־עשריות לתיבה):
- מאמבו: פעמון (קמפנה) על פעמון הרייד `x.x.xx.x | x.xx.xx.` (צד ה־2 ואז צד ה־3 של הקלאבה; 3–2 = התיבות מוחלפות), קלאבת סון כקרוס־סטיק (2–3: `..x.x... | x..x..x.`), קיק על הטומבאו ("וְ" של 2 ושל 4), היי־האט ברגל על 2 ו־4.
- סונגו (אחרי צ׳אנגיטו): פעמון בשמיניות, סנר `.g.g...X.g.g...X` (g = רפאים, X = הדגשה), קיק על ה"וְ" של 2 ועל 4, היי־האט ברגל על 2 ו־4.
- מוזמביק (אחרי סטיב גאד / פצ׳קו): פעמון `x.x.x.xx.xx.x.x.`, סנר ממלא את הרווחים `.g.g.g..g..X.g.g`, קיק על 1 ו־3, היי־האט ברגל על 2 ו־4.
לבדוק (מורה לכלי הקשה לטיניים): לכל אחד — כיוון הקלאבה (2–3 או 3–2), דפוס הפעמון, מיקום הקיק, הסנר/ריים וההיי־האט, ואם זו הגרסה המקובלת ללימוד על מערכת.

### מוסתר, לא מבוקש (לפי הבעלים: ליקים ספציפיים לא חשובים)
- `bh-5432`, `bh-5432-minor`, `bh-5432-lick` — משפטי 5-4-3-2 (דומיננט, מז׳ור, מינור) והליק המשולב, כולל משחק "קריאת 5-4-3-2" ורמת השירה v-barry 9.

---

## English

The owner's rule (2026-11-15): nothing that is not 100% certain is shown. Every item below is **hidden now**, through one
registry: `src/engine/verifiedContent.ts`. When you confirm an item, add its id (in brackets, e.g. `bh-chromatic`) to
`SWITCHED_ON` in that file; the content comes back everywhere at once (path, map, Drills, games, workout, level test,
lessons, depth page). If the answer is "no", write what is right and we fix the content before switching it on.

Order: scale outlining, theory and the approach to harmony first, then line devices, then Siskind and drums. All in C.

### A. Barry Harris: scale outlines, theory, approach

**1. The blues scale outline (`bh-outline-blues`).**
We have: a C blues, one scale a bar up from the root, in 8ths: 1 C7, 2 F7, 3 C7, 4 C7 (back down), 5 F7, 6 F♯°7 (the
related diminished: F♯ A C E♭ repeated), 7 C7, 8 C7 (down), 9 Dm7 → the **G7 scale** (ii is V), 10 G7 (down), 11 C7 / A7
(half a bar each), 12 Dm7 G7.
Source: one study-group forum post; Workbook 1 ch. 2 is known by its title only.
Check: Workbook 1, chapter 2 ("scale outlines"), or a Parks / Open Studio video of the blues outline: do bars 4, 8 and 10
come down; is bar 6 the diminished scale (not F7); is bar 9 the G7 scale over Dm7?

**2. Three tunes' charts for the outlines (`tune-charts`).**
We have (opening 8–16 bars, typed from memory):
- Cherokee (B♭): `B♭maj7 | Fm7 B♭7 | E♭maj7 | A♭7 | B♭maj7 | C7 | Cm7 | F7`, one bar per chord.
- How High the Moon (G): `Gmaj7 | Gmaj7 | Gm7 | C7 | Fmaj7 | Fmaj7 | Fm7 | B♭7 | E♭maj7 | Am7♭5 D7 | Gmaj7 | Am7 D7 | Bm7 | E7 | Am7 | D7`.
- A Night in Tunisia (D minor): `E♭7 | Dm6 | E♭7 | Dm6 | E♭7 | Dm6 | Em7♭5 A7 | Dm6`.
Check: against a Real Book / iReal. Cherokee especially: in the tune each chord lasts **two** bars (B♭maj7 ×2, Fm7 B♭7,
E♭maj7 ×2, A♭7 ×2…). Spread it that way? (A chord-fact question, not a Harris one.)

**3. Barry's chromatic scale (`bh-chromatic`).**
We have, in 8ths, scale degrees on the beats:
- Major, up: `C C♯ D D♯ E G F F♯ G G♯ A A♯ B D C` (at E–F skip to G and back to F; at B–C skip to D and back to C).
- Major, down (the app **mirrored** the rule; no source prints it): `C A B B♭ A A♭ G G♭ F D E E♭ D D♭ C`.
- Dominant C7, up: `C C♯ D D♯ E G F F♯ G G♯ A C B♭ B C`; down: `C B B♭ G A A♭ G G♭ F D E E♭ D D♭ C`.
- Minor 6th-diminished, up: `C C♯ D F E♭ E F F♯ G A A♭ B A B♭ B D C`.
Source: Larsen, Otto (blogs), Parks / Echols titles. No primary source prints the notes.
Check: a Barry video (or Parks, "Barry's chromatic scale", Open Studio): (a) is the major ascending form exactly this;
(b) **does Barry have a descending form**, and what happens at a half step (skip below and back, or something else);
(c) on the dominant, is the skip at A–B♭ (A C B♭); (d) does it exist on the minor 6th-diminished at all?

**4. The dominant eight ways, Parks's warm-up (`parks-eight-ways`).**
We have on C7: ways 1–7 = up the dominant scale from degree 1, 2, 3, 4, 5, 6, ♭7 to its octave, then down by that degree's
half-step rule (from 1: `C D E F G A B♭ C | B B♭ A G F E D C`); way 8 = down from the octave with three half steps:
`C B B♭ A G F E E♭ D D♭ C`.
Source: the episode title only ("the dominant scale eight ways").
Check: the episode itself (Parks, Things I've Learned / Open Studio): what exactly are the eight?

**5. Seven down to the 3rd (`bh-seven-down`).**
We have, in C minor over Dø–G7: B♭7 up from B♭ to A♭, then down from A♭ landing on B, then C:
`B♭ C D E♭ F G A♭ | A♭ G F E♭ D C B | C`.
Source: a blog (Cleary), a forum, a note in Marijt's transcription. No Harris video or workbook page.
Check: is it a Harris device, under what name; are these the notes (up to B♭7's 7th, then down "from the seventh")?

**6. 3 to ♭9 over the family (`bh-3-to-b9`).**
We have: over G7 (and its brothers B♭7, D♭7, E7): `B D F A♭`, the diminished on the 3rd, as climbing arpeggios, taught as
a Harris line device. Source: Larsen only (the theory itself, 7♭9 without root = a dim, is verified).
Check: does Barry teach "3 to ♭9" as a line arpeggio (like "3 to 9")?

**7. The ♭7-major pivot (`bh-b7-major-pivot`).**
We have: over C7 → F, B♭maj7 as a pivot (B♭ on top, then D F A below), then the C7 arpeggio down into F's A.
Source: Larsen only. Check: is "the major on the ♭7" an arpeggio Barry teaches over a dominant?

**8. Feel 6 in 4 (`bh-feel6`).**
We have: a line in dotted quarters (or cells of three 8ths) across four beats. Source: a workshop-video chapter title only.
Check: Workshop Video 2, "feel 6 in 4": what exactly is the exercise?

**9. Compose a line, play it in every tune (`bh-compose`).**
We have: over I → VI7, ii–V–I, rhythm changes — a chord tone on every beat, scale or chromatic notes between; "Harris
and Rees had students write a line once and play it in every tune with the same move". Source: one forum report.
Check: is this Harris practice (workbook / workshop)?

**10. The ABCs in 3rds and major arpeggios chromatically down (`bh-abcs-arps-down`).**
We have: 3rds, each note approached a half step below; major arpeggios C, B, B♭… downwards. Source: one forum report.
Check: are these Harris exercises, and in what order?

**11. The chromatic scale in two voices (`bh-chromatic-two-voices`).**
We have: the 6-dim chromatic scale in 3rds or 6ths "along one floor". Source: Echols's Labyrinth lesson 8 title only.
Check: that lesson — what exactly is the second voice? (Depends on question 3.)

### B. Echols: other items

The Elevator itself is now **verified** (built from the tonic only; fixed in code). Still hidden:

**12. Echols's voicing ladder (`echols-voicing-ladder`).** We have thirds, triads, "shells" and "octave chords" on the
6-dim scale. Source: short-video titles; the shapes are paywalled. Check: what are Echols's "shell" and "octave chord"
(which notes, in C6 from C)?

**13. Borrowing through the Elevator (`echols-elevator-borrow`).** We have: on floors 5–8 the soprano holds while the
other voices step into the other chord. Source: inference (Echols E04 is paywalled). Check: what E04 does.

**14. The elevator under a melody (`echols-elevator-melody`).** We have: a melody up the scale, one floor higher each
note, then along the drop-2 floor — floors that do not start on the tonic. Source: a student's forum remark (Autumn
Leaves). Check: does Thomas do this, and how?

### C. Siskind, solo piano (questions stay open)

**15. Comping rhythms (`siskind-comp-rhythms`).** We have: Beat-3 Charleston = 3 and the "and" of 4; the Basie rhythm =
light chords on 2 and 4; push-off = 4 and the "and" of 4; accent comping = the "and" of 2 and 4; also the "Comping
rhythms by ear" topic. Source: names from his video descriptions; placements ours. Check: his comping-vocabulary videos
/ coursepack: where exactly do the chords fall in each?

**16. Shell comping and the shuttle (`siskind-shell-comping`).** We have: reverse = bass on 1, chord on 1+ and 3; Red
Garland = offbeat chords with an anticipation; push-off; lead-in on 4; the shuttle = LH between a bass note and a
mid-register voicing under a held RH. Check: the same videos — the exact figures.

**17. Stride variations (`siskind-stride-variations`).** We have: Peace Piece = low-high-high-low; reverse = chord on 1
and 3, bass on 2 and 4; skip = beat 4 of every second bar; 3+3+2 = bass 1, chord on the "and" of 2, bass 4; bass
anticipated on the "and" of 4; bass and chord anticipated; chord early on the "and" of 1 and 3; a three-beat cell across
4/4; two-bar breaks. Check: his stride-variations video — which variations and where.

**18. Walking 10ths and a tune in 10ths (`siskind-tenths`).** We have: a 10th on every beat, stepping into the next chord;
a whole tune in 10ths on 1 and 3. Check: the video with the "walking 10ths" chapter.

**19. Left-hand forms (`siskind-lh-variants`).** We have: bass-plus with the 7th first (D3+C4 → G2+B2 → C3+B3); the 9th
under the thumb on Type B; the Evans syncopation. Check: Ex. B.3 in the book, and Evans's "Alone".

**20. Textures (`siskind-textures`).** We have: drop-2 sidesteps (the whole block a half step above, an 8th before a long target note); the
inner-voice movement — we chose "a half step down and back" from his five. Check: "Deep Dive on Locked Hands Comping"
and the five movements.

### D. Drums: our own transcriptions

**21. Mambo, songo, Mozambique (`latin-kit-patterns`, levels d-latin 8–10).** We have (`src/engine/drills/drumLatin2.ts`; x = a hit, 8ths over two bars or 16ths over one bar):
- Mambo: the campana on the ride bell `x.x.xx.x | x.xx.xx.` (the clave's 2-side bar, then its 3-side; 3–2 swaps the
  bars), son clave as a cross-stick (2–3: `..x.x... | x..x..x.`), kick on the tumbao (the "and" of 2 and of 4), hi-hat
  foot on 2 and 4.
- Songo (after Changuito): bell in 8ths, snare `.g.g...X.g.g...X` (g = ghost, X = accent), kick on the "and" of 2 and on
  4, hi-hat foot on 2 and 4.
- Mozambique (after Steve Gadd / Pacheco): bell `x.x.x.xx.xx.x.x.`, snare filling the gaps `.g.g.g..g..X.g.g`, kick on 1
  and 3, hi-hat foot on 2 and 4.
Check (a Latin percussion teacher): for each — clave direction (2–3 or 3–2), the bell pattern, kick, snare/rim and hi-hat
placement, and whether it is the version usually taught on the kit.

### Hidden, not pursued (owner: specific licks don't matter)
- `bh-5432`, `bh-5432-minor`, `bh-5432-lick` — the 5-4-3-2 phrases (dominant, major, minor) and the combined lick,
  including the "5-4-3-2 Call" game and voice level v-barry 9.

### Trivial / kept (one line each)
- The 7♭5-dim scale spelling (C D E F G♭ A♭ B♭ B): follows from the 6-dim construction; Harris names "four key scales". Kept.
- The colour words of the eight expressions (BARRY-HARRIS-THEORY §4): the app's analysis, no teacher named. Kept.
- MTNA phrasing thresholds (phraseOrg.ts): a grading choice, the rubric scale is the MTNA handout's. Kept.
- The COREA acronym and the memorise-a-tune step order (practiceMethod.ts): not shown to users. Kept.
- `lh-scomp` option 0 (the Charleston) and `cp-twobar` / `cp-free`: generic rhythms, no claim. Kept.
- Public-domain head melodies marked `verify: true` (src/content/heads.ts): already never served (`servedHeads`).
