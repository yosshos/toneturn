// Drums compatibility (DRUMS_AUDIT §5): the hi-hat foot from CC4, placement steps 6 and 9, dense rudiments on the
// staff, the app's drum sounds, the e-kit notice on the course card.
import { describe, expect, it } from 'vitest';
import { CHICK_MS, MidiInput, type DrumHitEvent } from '../src/speech/midi';
import { KIT_NOTICE, VOICE_PERC, DRUM_VOICES, type KitProfile } from '../src/engine/drumKit';
import { DRUM_PROBES, drumFamilies, drumProbes, generateDrums, GROOVE_REACH, placeDrums } from '../src/engine/drills/drums';
import { barsPerLine } from '../src/engine/drumNotation';
import { courseOf } from '../src/engine/courses';
import { generate } from '../src/engine/drills/generate';

describe('hi-hat foot without a pedal note (CC4 only)', () => {
  const kit = (k: KitProfile = { preset: 'gm', map: {} }) => {
    const m = new MidiInput();
    m.setOptions({ drums: true, kit: k });
    const hits: DrumHitEvent[] = [];
    m.onHit((h) => hits.push(h));
    return { m, hits };
  };
  // GM preset: CC4 127 = closed, 0 = open.
  it('a fast close (open → closed within the chick time) is a pedal hit on note 44', () => {
    const { m, hits } = kit();
    m.message([0xb9, 4, 0], 0); // lifted
    m.message([0xb9, 4, 60], 1000);
    m.message([0xb9, 4, 127], 1040); // closed 40 ms after it was last open
    expect(hits.map((h) => [h.voice, h.note, h.at])).toEqual([['hhPedal', 44, 1040]]);
    expect(hits[0].vel).toBeGreaterThan(60);
  });
  it('a slow close is no chick (a hat closed for the groove)', () => {
    const { m, hits } = kit();
    m.message([0xb9, 4, 0], 0);
    m.message([0xb9, 4, 64], 100);
    m.message([0xb9, 4, 127], 100 + CHICK_MS + 200);
    expect(hits).toEqual([]);
  });
  it('the wiggle of a closed pedal is no chick; each new close is one', () => {
    const { m, hits } = kit();
    m.message([0xb9, 4, 127], 0);
    m.message([0xb9, 4, 115], 50);
    m.message([0xb9, 4, 127], 70);
    expect(hits).toEqual([]);
    for (const t of [500, 1000]) {
      m.message([0xb9, 4, 10], t);
      m.message([0xb9, 4, 127], t + 30);
    }
    expect(hits.length).toBe(2);
  });
  it('a kit that sends its own pedal note: the CC4 chick stops, and a note right after a chick is not counted twice', () => {
    const { m, hits } = kit();
    m.message([0xb9, 4, 0], 0);
    m.message([0xb9, 4, 127], 30); // chick from CC4
    m.message([0x99, 44, 80], 35); // the kit's own note 5 ms later: the same stroke
    expect(hits.filter((h) => h.voice === 'hhPedal').length).toBe(1);
    m.message([0xb9, 4, 0], 500);
    m.message([0xb9, 4, 127], 530); // the kit sends notes: no more chicks from CC4
    m.message([0x99, 44, 80], 600);
    expect(hits.filter((h) => h.voice === 'hhPedal').map((h) => h.at)).toEqual([30, 600]);
  });
  it('uses the learned pedal range (a Roland TD closing at CC4 90)', () => {
    const { m, hits } = kit({ preset: 'roland', map: {}, cc4: { closed: 90, open: 0 } });
    m.message([0xb9, 4, 0], 0);
    m.message([0xb9, 4, 88], 60);
    expect(hits.map((h) => h.voice)).toEqual(['hhPedal']);
  });
  it('outside drum mode CC4 is only a control change', () => {
    const m = new MidiInput();
    const hits: DrumHitEvent[] = [];
    m.onHit((h) => hits.push(h));
    m.message([0xb0, 4, 0], 0);
    m.message([0xb0, 4, 127], 30);
    expect(hits).toEqual([]);
  });
});

describe('placement probe steps 6 (groove reach) and 9 (feet)', () => {
  const fams = drumFamilies().map((f) => ({ id: f.id, levels: f.levels.length }));
  it('the steps exist, play their family, and the groove reach steps need the basic groove first', () => {
    const slots = DRUM_PROBES.map((p) => p.slot);
    expect(slots).toEqual(expect.arrayContaining(['funk', 'shuffle', 'feet']));
    expect(slots.indexOf('funk')).toBeGreaterThan(slots.indexOf('groove'));
    expect(GROOVE_REACH).toEqual(['funk', 'shuffle']);
    const fam = (slot: string) => generate(DRUM_PROBES.find((p) => p.slot === slot)!.spec).spec.family;
    expect([fam('funk'), fam('shuffle'), fam('feet')]).toEqual(['d-funk', 'd-shuffle', 'd-feet']);
    const feet = generate(DRUM_PROBES.find((p) => p.slot === 'feet')!.spec);
    expect(feet.notes.some((n) => n.voice === 'hhPedal')).toBe(true);
    // A practice pad runs none of them.
    expect(drumProbes(true).some((p) => ['funk', 'shuffle', 'feet'].includes(p.slot))).toBe(false);
  });
  it('places funk, shuffle and feet above level 1 from what was measured', () => {
    const r = placeDrums({ groove: { verdict: 'clean' }, funk: { verdict: 'clean' }, shuffle: { verdict: 'almost' }, feet: { verdict: 'clean' } }, fams);
    expect(r['d-funk']).toBe(3);
    expect(r['d-shuffle']).toBe(2);
    expect(r['d-feet']).toBe(3);
    const feetOnly = placeDrums({ groove: { verdict: 'almost' }, feet: { verdict: 'clean' } }, fams);
    expect(feetOnly['d-feet']).toBe(2);
  });
  it('nothing measured (or a "not") starts them at level 1', () => {
    const none = placeDrums({}, fams);
    expect([none['d-funk'], none['d-shuffle'], none['d-feet']]).toEqual([1, 1, 1]);
    const not = placeDrums({ groove: { verdict: 'clean' }, funk: { verdict: 'not' }, shuffle: { verdict: 'not' }, feet: { verdict: 'not' } }, fams);
    expect([not['d-funk'], not['d-shuffle'], not['d-feet']]).toEqual([1, 1, 1]);
  });
  it('levels are capped to the family (a future jazz family is placed only when it exists)', () => {
    const r = placeDrums({ groove: { verdict: 'clean' }, shuffle: { verdict: 'clean' }, feet: { verdict: 'clean' } }, [...fams, { id: 'd-jazz' as never, levels: 3 }]);
    expect(r['d-jazz' as never]).toBe(2);
    expect(placeDrums({}, fams)['d-jazz' as never]).toBeUndefined();
  });
});

describe('dense rudiments on the staff', () => {
  const lv = (family: string, kind: string, option = 0) => generateDrums({ family, kind, option, key: 0, hands: 'RL', instrument: 'drums' } as Parameters<typeof generateDrums>[0]);
  it('16th triplets and sextuplets get one bar a line; 16ths, triplets and grooves keep two', () => {
    expect(barsPerLine(lv('d-rolls', '5:stroke4', 0).notes)).toBe(1);
    expect(barsPerLine(lv('d-rolls', '5:stroke4', 1).notes)).toBe(1);
    expect(barsPerLine(lv('d-rolls', '5:stroke4', 2).notes)).toBe(2);
    expect(barsPerLine(lv('d-rolls', '2:singles16').notes)).toBe(2);
    expect(barsPerLine(lv('d-diddles', '1:para', 1).notes)).toBe(2);
    expect(barsPerLine(lv('d-diddles', '4:double').notes)).toBe(2);
    expect(barsPerLine(lv('d-rock', '5:hat16x2').notes)).toBe(2);
  });
  it('more than 16 hand notes in a bar is dense even on the 16th grid; the kick never counts', () => {
    expect(barsPerLine(Array.from({ length: 20 }, (_, i) => ({ beat: i * 0.2, voice: 'snare' })))).toBe(1);
    expect(barsPerLine([...Array.from({ length: 16 }, (_, i) => ({ beat: i * 0.25, voice: 'hihat' })), ...Array.from({ length: 8 }, (_, i) => ({ beat: i * 0.5 + 0.1, voice: 'kick' }))])).toBe(2);
  });
  it('every dense level of the catalogue is found (each has notes faster than 16ths)', () => {
    for (const f of drumFamilies())
      for (const l of f.levels)
        for (const sp of l.specs) {
          const d = generateDrums({ ...sp, key: 0 } as Parameters<typeof generateDrums>[0]);
          const hands = [...new Set(d.notes.filter((n) => n.voice !== 'kick' && n.voice !== 'hhPedal').map((n) => n.beat))].sort((a, b) => a - b);
          const fast = hands.some((b, i) => i > 0 && b - hands[i - 1] < 0.249);
          if (fast) expect(barsPerLine(d.notes), `${l.id}`).toBe(1);
        }
  });
});

describe('the app plays drum sounds (pads without a module) and the course notice', () => {
  it('every kit voice has a recorded-kit sound', () => {
    for (const v of DRUM_VOICES) expect(VOICE_PERC[v]).toBeTruthy();
    expect(VOICE_PERC.hhPedal).toBe('hat-foot');
    expect(VOICE_PERC.tom3).toBe('tom-lo');
  });
  it('the drums course card says an e-kit by MIDI is recommended (he + en, no emoji)', () => {
    const c = courseOf('drums');
    expect(c.note?.en).toMatch(/MIDI/);
    expect(c.note?.he).toMatch(/MIDI/);
    for (const s of [c.note!.en, c.note!.he, KIT_NOTICE.en, KIT_NOTICE.he]) expect(s).not.toMatch(/\p{Extended_Pictographic}/u);
    expect(KIT_NOTICE.en).toMatch(/recommended/i);
  });
});
