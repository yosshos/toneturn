import { describe, expect, it } from 'vitest';
import {
  CELLS,
  describe as describeRhythm,
  distractors,
  events,
  gradeReading,
  onsetBeats,
  parseRhythmWords,
  readTimeline,
  readTolerance,
  rhythmAt,
  rhythmFromKey,
  rhythmKey,
  rhythmSound,
  sameRhythm,
  signature,
  totalBeats,
  type Rhythm,
} from '../src/engine/rhythm';
import { rhythmDictQuestion, rhythmLesson, renderStimulus, compareStimulus } from '../src/engine/lesson';
import { parseAnswer } from '../src/game/content';
import { LessonController } from '../src/game/controller';
import { FakeAudio, FakeKnock, FakeMic, FakeTTS, ScriptedPitch, ScriptedTranscriber } from '../src/game/fakes';
import { resultFromSession } from '../src/storage/progress';
import { Cancelled, type Clock } from '../src/game/adapters';

const R = (k: string, bars = 1): Rhythm => rhythmFromKey(k, bars);

describe('canonical rhythm model', () => {
  it('ticks: 12 per quarter; onsets and rests', () => {
    const r = R('q.ee.qr.q');
    expect(events(r).map((e) => [e.start, e.dur, e.rest])).toEqual([
      [0, 12, false],
      [12, 6, false],
      [18, 6, false],
      [24, 12, true],
      [36, 12, false],
    ]);
    expect(onsetBeats(r)).toEqual([0, 1, 1.5, 3]);
  });
  it('graded by what is heard: identical sounds share a signature', () => {
    expect(signature(R('q.q.h'))).not.toBe(signature(R('q.q.q.q')));
    expect(sameRhythm(R('h.h'), R('h.h'))).toBe(true);
    expect(sameRhythm(R('q.qr.h'), R('q.q.h'))).toBe(false);
  });
  it('generated bars are always full 4/4 and contain the level’s new material', () => {
    for (const level of [1, 2, 3] as const) {
      for (let seed = 0; seed < 60; seed++) {
        const r = rhythmAt(level, 2, seed);
        expect(totalBeats(r)).toBe(8);
        // no cell crosses a bar line
        let beats = 0;
        for (const c of r.cells) {
          const before = beats % 4;
          beats += CELLS[c].beats;
          expect(before + CELLS[c].beats).toBeLessThanOrEqual(4);
        }
        expect(onsetBeats(r)[0]).toBe(0);
        const fresh = { 1: ['h', 'qr'], 2: ['ee'], 3: ['dqe'] }[level];
        expect(fresh.some((c) => r.cells.includes(c as never))).toBe(true);
        expect(r.cells.every((c) => CELLS[c].level <= level)).toBe(true);
      }
    }
  });
  it('distractors are minimal pairs that never sound like the answer', () => {
    for (let seed = 0; seed < 40; seed++) {
      const r = rhythmAt(2, 1, seed);
      const ds = distractors(r, 2, 3, seed);
      expect(ds.length).toBeGreaterThanOrEqual(2);
      const sigs = new Set([signature(r), ...ds.map(signature)]);
      expect(sigs.size).toBe(ds.length + 1);
      for (const d of ds) expect(totalBeats(d)).toBe(4);
    }
  });
});

describe('sound and timing', () => {
  it('count-in clicks, then the rhythm with audible lengths', () => {
    const { events: ev, length } = rhythmSound(R('h.q.q'), 60);
    // One bar of count-in, then the metronome keeps going softly under the bar (0.37).
    const clicks = ev.filter((e) => e.perc === 'click' || e.perc === 'accent');
    expect(clicks.map((e) => e.start)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(Math.max(...clicks.slice(4).map((e) => e.velocity))).toBeLessThan(Math.min(...clicks.slice(0, 4).map((e) => e.velocity)));
    // A snare hit on every note, on the note's start.
    expect(ev.filter((e) => e.perc === 'snare').map((e) => e.start)).toEqual([4, 6, 7]);
    const notes = ev.filter((e) => !e.perc);
    expect(notes.map((e) => e.start)).toEqual([4, 6, 7]);
    expect(notes[0].duration).toBeGreaterThan(notes[1].duration);
    expect(length).toBeGreaterThan(8);
  });
  it('performance timeline: one-bar count-in, a click on every beat', () => {
    const tl = readTimeline(R('q.q.q.q', 1), 60);
    expect(tl.clicks).toHaveLength(8);
    expect(tl.responseAt).toBe(4);
  });
  it('tolerance stays under half the distance to the nearest wrong eighth position', () => {
    for (const bpm of [70, 76, 80]) expect(readTolerance(2, bpm)).toBeLessThan((60000 / bpm) * 0.25);
  });
});

describe('grading a performance', () => {
  const r = R('q.ee.q.q');
  const ms = (b: number, bpm = 76) => (b * 60000) / bpm;
  it('on time passes with high precision', () => {
    const g = gradeReading(r, 76, onsetBeats(r).map((b) => ms(b) + 15), 2);
    expect(g.pass).toBe(true);
    expect(g.precision).toBeGreaterThan(0.8);
    expect(g.accuracy).toBeGreaterThan(0.9);
  });
  it('a missing note and an extra tap both fail; pattern credit is partial', () => {
    const missing = gradeReading(r, 76, onsetBeats(r).slice(1).map((b) => ms(b)), 2);
    expect(missing.pass).toBe(false);
    expect(missing.pattern).toBeCloseTo(4 / 5);
    const extra = gradeReading(r, 76, [...onsetBeats(r).map((b) => ms(b)), ms(3.5)], 2);
    expect(extra.pass).toBe(false);
  });
  it('quarter where eighths were written is wrong (onsets differ)', () => {
    expect(gradeReading(r, 76, [0, 1, 2, 3].map((b) => ms(b)), 2).pass).toBe(false);
  });
});

describe('words: names and syllables (spec G.4)', () => {
  it('describes in English and Hebrew', () => {
    const r = R('q.ee.qr.q');
    expect(describeRhythm(r, 'names', 'en')).toBe('quarter, two eighths, quarter rest, quarter');
    expect(describeRhythm(r, 'syllables', 'en')).toBe('ta ti-ti sh ta');
    expect(describeRhythm(r, 'names', 'he')).toBe('רבע, שתי שמיניות, הפסקת רבע, רבע');
  });
  it.each([
    ['ta ti-ti ta ta', 'q.ee.q.q'],
    ['ta ta-a ta', 'q.h.q'],
    ['quarter, two eighths, half', 'q.ee.h'],
    ['ta-i ti ta ta', 'dqe.q.q'],
    ['dotted quarter eighth half', 'dqe.h'],
    ['ta rest ta ta', 'q.qr.q.q'],
    ['טה טי-טי טה טה', 'q.ee.q.q'],
    ['רבע מנוקד שמינית חצי', 'dqe.h'],
    ['רבע הפסקה רבע רבע', 'q.qr.q.q'],
  ])('parse "%s" → %s', (t, k) => expect(parseRhythmWords(t)?.join('.')).toBe(k));
  it('spoken dictation answers count by sound, not spelling', () => {
    const q = rhythmDictQuestion('q', 2, 1, 5);
    const said = describeRhythm(q.rhythm, 'syllables', 'en');
    const r = parseAnswer(q, [said]);
    expect(r.kind === 'answer' && r.value).toBe(q.answer);
  });
  it('dictation reveal plays your rhythm then the right one', () => {
    const q = rhythmDictQuestion('q', 1, 1, 3);
    const wrong = q.choices.find((c) => c !== q.answer)!;
    const s = compareStimulus(q, wrong)!;
    expect(s[0]).toMatchObject({ kind: 'rhythm', rhythm: wrong });
    expect(renderStimulus(s).events.length).toBeGreaterThan(8);
  });
});

describe('rhythm lessons in the controller', () => {
  const macroClock: Clock = {
    now: () => 0,
    sleep: (_ms, signal) =>
      new Promise((res, rej) => {
        if (signal.aborted) return rej(new Cancelled());
        setTimeout(() => (signal.aborted ? rej(new Cancelled()) : res()), 0);
      }),
  };
  const tick = () => new Promise((r) => setTimeout(r, 0));
  async function until(pred: () => boolean, max = 2000) {
    for (let i = 0; i < max; i++) {
      if (pred()) return;
      await tick();
    }
    throw new Error('condition not reached');
  }

  it('Buttons mode: perform from notation/words by tapping, choose dictation answers; precision feeds timing', async () => {
    const lesson = rhythmLesson(2, 9);
    const audio = new FakeAudio();
    const c = new LessonController(
      lesson,
      { audio, tts: new FakeTTS(), stt: new ScriptedTranscriber([]), mic: new FakeMic(), pitch: new ScriptedPitch([]), clock: macroClock, simulated: true },
      { inputLang: 'en', outputLang: 'en', naming: 'letter' },
      'buttons',
    );
    audio.respond = (start) => {
      const q = c.getView().question;
      if (q.kind !== 'rhythm-read') return;
      for (const b of onsetBeats(q.rhythm)) c.tapBeat(start + (b * 60000) / q.bpm + 12);
    };
    await c.start();
    c.skipIntro();
    for (let i = 0; i < lesson.questions.length; i++) {
      const q = lesson.questions[i];
      if (q.kind === 'rhythm-dict') {
        await until(() => c.getView().index === i && c.getView().phase === 'listening');
        c.answer(q.answer);
      }
      await until(() => c.getView().session.records[i].outcome !== 'pending');
    }
    await until(() => c.getView().stage === 'complete');
    const recs = c.getView().session.records;
    expect(recs.every((r) => r.outcome === 'correct')).toBe(true);
    const res = resultFromSession(c.getView().session, 'S', new Date());
    expect(res.items!.filter((x) => x.skill === 'rhythm-reading')).toHaveLength(3);
    expect(res.items!.filter((x) => x.skill === 'rhythm-dictation')).toHaveLength(2);
    expect(res.items!.filter((x) => x.skill === 'timing')).toHaveLength(3);
  });

  it('Voice mode: "ta" onsets from the microphone; no input at all is unclear, not wrong', async () => {
    const lesson = rhythmLesson(1, 4);
    const audio = new FakeAudio();
    const knock = new FakeKnock();
    const say = (e: unknown) => describeRhythm(rhythmFromKey(String(e)), 'syllables', 'en');
    const c = new LessonController(
      lesson,
      { audio, tts: new FakeTTS(), stt: new ScriptedTranscriber([say, say]), mic: new FakeMic(), pitch: new ScriptedPitch([]), knock, clock: macroClock, simulated: true },
      { inputLang: 'en', outputLang: 'en', naming: 'letter', rhythmByVoice: true },
      'voice',
    );
    (c as unknown as { ad: { stt: ScriptedTranscriber } }).ad.stt.expected = () => c.getView().question.answer;
    let first = true;
    audio.respond = (start) => {
      const q = c.getView().question;
      if (q.kind !== 'rhythm-read') return;
      if (first) {
        first = false; // silent first try
        return;
      }
      for (const b of onsetBeats(q.rhythm)) knock.onKnock?.(start + (b * 60000) / q.bpm - 10);
    };
    await c.start();
    c.skipIntro();
    await until(() => c.getView().stage === 'complete');
    const recs = c.getView().session.records;
    expect(recs.every((r) => r.outcome === 'correct')).toBe(true);
    expect(recs[0].unclear).toBe(1);
    expect(recs[0].attempts[0].modality).toBe('knock');
    expect(rhythmKey(lesson.questions[1].kind === 'rhythm-dict' ? lesson.questions[1].rhythm : R('q'))).toBe(lesson.questions[1].answer);
  });
});
