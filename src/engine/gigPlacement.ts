// AUDIT-DEPTH-3 #11, #12, C8 (drills/gigDrills.ts, "On the bandstand"): where each level sits on its course path. Pure
// data, no imports (levelPlacement.ts merges it). Guitar levels are placed by their grade (gigDrills G_GIG_GRADE).
//   keys  1 intros 1320 · 2 ballad 10ths 1350 · 3 ♭VI–♭II endings 1370 · 4 ballad RH four-note 1400 · 5 tag ×3 and the
//         Dameron turnaround 1420 · 6 ballad both hands 1450 · 7 walk-down ending, rubato intro 1470 · 8 the whole
//         ballad 1500 · 9 Back Porch Blues by section 1640 · 10 … the whole tune 1700 · 11 Night Ferry by section
//         1780 · 12 … the whole tune 1840 (after k-tune's melody + comp and k-solo's chorus levels).
//   bass  1 ballad in two 1300 · 2 walking intros 1360 · 3 walking endings 1420 · 4 walk-down, ♭VImaj7 1480 · 5–8 the
//         whole tune 1620–1830 · 9 intros and endings by ear (play the roots back) 1840, the family's last step.

export const K_GIG_DIFF: number[] = [1320, 1350, 1370, 1400, 1420, 1450, 1470, 1500, 1640, 1700, 1780, 1840];
export const B_GIG_DIFF: number[] = [1300, 1360, 1420, 1480, 1620, 1700, 1760, 1830, 1840];

export const GIG_PLACEMENT: Record<string, number> = {
  ...Object.fromEntries(K_GIG_DIFF.map((d, i) => [`k-gig-${i + 1}`, d])),
  ...Object.fromEntries(B_GIG_DIFF.map((d, i) => [`b-gig-${i + 1}`, d])),
};
