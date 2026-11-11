// Repertoire → drills (docs/SPEC-REPERTOIRE.md): the ways of a repertoire item that run on the Drills screen (a song
// drill, a standard's changes on the piano or walked on the bass, a technique level) as a queue. Pure.

import type { CourseId } from './courses';
import type { RepWay } from './repertoire';
import type { Drill, DrillSettings, ItemState } from './drills/types';
import { generate } from './drills/generate';
import { songDrill } from './drills/songDrills';
import { bassStandardSpec } from './drills/bass';
import { STD_LADDER } from './drills/bassNiche2';
import { decodeGuitarStd, guitarStdOption, guitarStdTempo } from './drills/guitarJazz';
import { techQueue } from './ladderFacts';
import { SONGBOOK } from '../content/songbook';

/** Does this way run on the Drills screen? */
export const isDrillWay = (w: RepWay): boolean => w.k === 'song' || w.k === 'chartDrill' || w.k === 'bassStd' || w.k === 'level' || w.k === 'guitarStd';

/** The drills of a way (empty when it can't build one, or it isn't a drill way). */
export function repDrills(w: RepWay, course: CourseId, items: Record<string, ItemState> = {}, keyOrder: DrillSettings['keyOrder'] = 'fifths-up'): Drill[] {
  switch (w.k) {
    case 'song': {
      const sg = SONGBOOK.find((x) => x.id === w.song);
      if (!sg) return [];
      const inst = course === 'guitar' ? 'guitar' : course === 'bass' ? 'bass' : 'piano';
      const part = inst === 'bass' ? 'melody' : inst === 'guitar' && w.part === 'both' ? 'chords' : w.part;
      return [songDrill(sg, part, inst)];
    }
    case 'chartDrill': {
      const kind = `chart~std:${w.std}~${w.voicing}~${w.rhythm === 'stride' || w.voicing.startsWith('stride') ? 'stride' : w.rhythm}~comp`;
      return [generate({ family: w.voicing.startsWith('stride') ? 'accomp' : 'voicings', kind, key: 0, hands: 'L', swing: true })];
    }
    case 'bassStd': {
      // The standards ladder (b-std) first: the old one-chorus levels are retired (owner 2026-11-11), the ladder carries them.
      const li = STD_LADDER.findIndex((x) => x.id === w.std);
      if (li >= 0) return [generate({ family: 'b-std', kind: 'tier', key: 0, hands: 'R', instrument: 'bass', option: li, perBeat: STD_LADDER[li].feel === 'walk' ? 1 : 0.5 })];
      const sp = bassStandardSpec(w.std);
      if (!sp) return [];
      return [generate({ family: 'b-walk', kind: 'standard', key: 0, hands: 'R', instrument: 'bass', option: sp.option, perBeat: sp.perBeat })];
    }
    case 'guitarStd': {
      // The standard's whole chart on the guitar (g-jazz 13): its own key, the tune's feel unless the way names one.
      const option = guitarStdOption(w.std, w.voicing, w.rhythm);
      if (option === null) return [];
      return [generate({ family: 'g-jazz', kind: 'comp-chart', key: 0, hands: 'R', instrument: 'guitar', option, ...(decodeGuitarStd(option).rhythm !== 'bossa' ? { swing: true } : {}), tempo: guitarStdTempo(w.std)[0] })];
    }
    case 'level':
      return techQueue(w.ref, items, keyOrder, 4);
    default:
      return [];
  }
}
