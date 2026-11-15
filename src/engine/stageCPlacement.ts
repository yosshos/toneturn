// STAGE C (docs/research/AUDIT-6-*.md): where the advanced drum and vocal levels sit on their paths. Pure data, no
// imports (levelPlacement.ts merges these tables; drumTop.ts and voiceTop.ts read them). Ratings use the grade formula
// G(grade) = 700 + 90 · grade (levelPlacement.G): every level here is beyond grade 8 — G(8) = 1420 plus its step.

const G = (grade: number): number => Math.round(700 + 90 * grade);

/**
 * Drums (RSL Drums 2018): the grade-8 material (combined rolls, pataflafla, triple ratamacue, linear 32nds, 5/4 at tempo)
 * from G(8); diploma / professional work (stickings around the kit, four-way independence, chorus solos over a form)
 * up to G(8) + 460 = 1880.
 */
export const DRUM_TOP_PLACEMENT: Record<string, number> = {
  'd-pas-1': G(8) + 0, // Buzz roll (multiple bounce)
  'd-pas-2': G(8) + 30, // Triple-stroke roll
  'd-pas-3': G(8) + 50, // Triple paradiddle
  'd-pas-4': G(8) + 80, // 10- and 11-stroke rolls
  'd-pas-5': G(8) + 110, // 13- and 15-stroke rolls
  'd-pas-6': G(8) + 140, // 17-stroke roll and combined rolls
  'd-pas-7': G(8) + 170, // Pataflafla
  'd-pas-8': G(8) + 200, // Flamacue and inverted flam tap
  'd-pas-9': G(8) + 230, // Flam paradiddle-diddle, single flammed mill
  'd-pas-10': G(8) + 260, // Double ratamacue
  'd-pas-11': G(8) + 290, // Triple ratamacue
  'd-pas-12': G(8) + 320, // Lesson 25, single dragadiddle, double drag tap
  'd-stick-1': G(8) + 20, // Every 4-note sticking in 8ths
  'd-stick-2': G(8) + 80, // Every 4-note sticking in 16ths
  'd-stick-3': G(8) + 140, // 8-note stickings in 16ths
  'd-stick-4': G(8) + 200, // 6-note stickings in triplets
  'd-stick-5': G(8) + 270, // Stickings with a moving accent
  'd-stick-6': G(8) + 350, // Stickings around the kit
  'd-synco-1': G(8) + 30, // Syncopated line on the kick, rock
  'd-synco-2': G(8) + 80, // The line as band hits
  'd-synco-3': G(8) + 140, // The line on the kick, 16th funk
  'd-synco-4': G(8) + 190, // The line as jazz comping on the snare
  'd-synco-5': G(8) + 250, // Jazz: long notes kick, short notes snare
  'd-synco-6': G(8) + 310, // The line as accents in a ghost-note stream
  'd-chapin-1': G(8) + 40, // Ride and foot: the snare ladder
  'd-chapin-2': G(8) + 100, // Ride and foot: the kick ladder
  'd-chapin-3': G(8) + 160, // Snare and kick figures together
  'd-chapin-4': G(8) + 220, // Two lines read at once
  'd-chapin-5': G(8) + 280, // Kick line, snare fills the gaps
  'd-chapin-6': G(8) + 360, // Four-way: the foot on every beat
  'd-linear-1': G(8) + 50, // Linear groups of 3 and 4
  'd-linear-2': G(8) + 120, // Linear groove with ghost notes
  'd-linear-3': G(8) + 190, // Linear groove with open-hat barks
  'd-linear-4': G(8) + 270, // Linear 32nd-note fills, land on 1
  'd-linear-5': G(8) + 350, // Displaced linear grooves at tempo
  'd-brush-1': G(8) + 30, // Brushes ballad in 2
  'd-brush-2': G(8) + 110, // Brushes, medium swing
  'd-brush-3': G(8) + 190, // Brushes with comping accents
  'd-brush-4': G(8) + 290, // Up-tempo brushes
  'd-oddtempo-1': G(8) + 60, // 5/4 grooves and fills at tempo
  'd-oddtempo-2': G(8) + 130, // 7/8 at tempo
  'd-oddtempo-3': G(8) + 200, // 7/4 and 9/8
  'd-oddtempo-4': G(8) + 280, // 11/8 and 13/8 with fills
  'd-oddtempo-5': G(8) + 380, // A song in changing meters, at tempo
  'd-trade-1': G(8) + 80, // Trading 4s on the blues
  'd-trade-2': G(8) + 170, // Trading 8s on AABA
  'd-trade-3': G(8) + 260, // Trading 4s up-tempo
  'd-trade-4': G(8) + 360, // A solo chorus over the blues, the band playing
  'd-trade-5': G(8) + 460, // A solo chorus over AABA with set-up hits
};

/**
 * STAGE C path ratings of the new vocal levels (key `vocal:<ref>`, plugged into levelPlacement PLACEMENT_TABLES). All
 * are RSL Vocals grade 8 and beyond: G(8) = 1420; the G6–G8 items (dim / aug / dim7 arpeggios, the Quick Study, style
 * studies, one part from the score) at G(8) + 280 and up, the professional work (scat at 220, the top-floor goal) to
 * G(8) + 470 = 1890 — under PATH_CAP. The items' own ratings (1720–1890) say the same.
 */
export const VOICE_TOP_PLACEMENT: Record<string, number> = {
  'vocal:2201': G(8) + 300,
  'vocal:2202': G(8) + 360,
  'vocal:2203': G(8) + 420,
  'vocal:2211': G(8) + 310,
  'vocal:2212': G(8) + 370,
  'vocal:2213': G(8) + 430,
  'vocal:2221': G(8) + 320,
  'vocal:2222': G(8) + 380,
  'vocal:2223': G(8) + 440,
  'vocal:2231': G(8) + 300,
  'vocal:2232': G(8) + 380,
  'vocal:2233': G(8) + 460,
  'vocal:2241': G(8) + 300,
  'vocal:2242': G(8) + 370,
  'vocal:2243': G(8) + 440,
  'vocal:2251': G(8) + 280,
  'vocal:2252': G(8) + 340,
  'vocal:2253': G(8) + 400,
  'vocal:2261': G(8) + 340,
  'vocal:2262': G(8) + 410,
  'vocal:2263': G(8) + 470,
  'vocal:2271': G(8) + 310,
  'vocal:2272': G(8) + 380,
  'vocal:2273': G(8) + 460,
};
