// Repertoire → drills (docs/SPEC-REPERTOIRE.md): the ways of a repertoire item that run on the Drills screen (a song
// drill, a standard's changes on the piano or walked on the bass, a technique level) as a queue. Pure.

import type { CourseId } from './courses';
import type { RepWay } from './repertoire';
import type { Drill, DrillSettings, ItemState } from './drills/types';
import { generate } from './drills/generate';
import { songDrill } from './drills/songDrills';
import { bassStandardSpec } from './drills/bass';
import { techQueue } from './ladderFacts';
import { SONGBOOK } from '../content/songbook';

/** Does this way run on the Drills screen? */
export const isDrillWay = (w: RepWay): boolean => w.k === 'song' || w.k === 'chartDrill' || w.k === 'bassStd' || w.k === 'level';

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
      const sp = bassStandardSpec(w.std);
      if (!sp) return [];
      return [generate({ family: 'b-walk', kind: 'standard', key: 0, hands: 'R', instrument: 'bass', option: sp.option, perBeat: sp.perBeat })];
    }
    case 'level':
      return techQueue(w.ref, items, keyOrder, 4);
    default:
      return [];
  }
}
