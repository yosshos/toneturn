// Repertoire → drills (docs/SPEC-REPERTOIRE.md): the ways of a repertoire item that run on the Drills screen (a song
// drill, a standard's changes on the piano or walked on the bass, a technique level) as a queue. Pure.

import type { RepCourse } from './repertoire';
import type { RepWay } from './repertoire';
import type { Drill, DrillSettings, ItemState } from './drills/types';
import { generate, keysInOrder } from './drills/generate';
import { itemPass } from './drills/ladder';
import { itemTargetBpm } from './drills/plan';
import { offsetsInOrder, standardHome, type Home } from './stdKey';
import { isStraightStd } from './standards';
import { songDrill } from './drills/songDrills';
import { BASS_STD, bassStandardSpec } from './drills/bass';
import { STD_LADDER } from './drills/bassNiche2';
import { decodeGuitarStd, guitarStdOption, guitarStdTempo } from './drills/guitarJazz';
import { techQueue } from './ladderFacts';
import { SONGBOOK } from '../content/songbook';

/** Does this way run on the Drills screen? */
export const isDrillWay = (w: RepWay): boolean => w.k === 'song' || w.k === 'chartDrill' || w.k === 'bassStd' || w.k === 'level' || w.k === 'guitarStd';

/**
 * A tune through all 12 keys (AUDIT-GAPS-2 High #4): the lead-sheet key first (key offset 0, its saved item), then the
 * other 11 in the player's key order. Once the lead-sheet key has passed at its target, the queue opens on the keys not
 * yet passed, the passed ones (and the lead sheet) last.
 */
function throughKeys(home: Home, build: (offset: number) => Drill, items: Record<string, ItemState>, keyOrder: DrillSettings['keyOrder']): Drill[] {
  const ds = offsetsInOrder(home, keysInOrder(keyOrder, !!home.minor)).map(build);
  const passed = (d: Drill) => itemPass(items[d.itemId], d.startBpm, itemTargetBpm(d)).target;
  if (!passed(ds[0])) return ds;
  const rest = ds.slice(1);
  return [...rest.filter((d) => !passed(d)), ...rest.filter(passed), ds[0]];
}

/** The drills of a way (empty when it can't build one, or it isn't a drill way). */
export function repDrills(w: RepWay, course: RepCourse, items: Record<string, ItemState> = {}, keyOrder: DrillSettings['keyOrder'] = 'fifths-up'): Drill[] {
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
      const family = w.voicing.startsWith('stride') ? 'accomp' : 'voicings';
      // A bossa tune is straight (STYLE-BRAZIL §0.2), every other standard swung.
      return throughKeys(standardHome(w.std), (key) => generate({ family, kind, key, hands: 'L', swing: !isStraightStd(w.std) }), items, keyOrder);
    }
    case 'bassStd': {
      // The standards ladder (b-std) first: the old one-chorus levels are retired (owner 2026-11-11), the ladder carries them.
      const li = STD_LADDER.findIndex((x) => x.id === w.std);
      if (li >= 0) {
        const x = STD_LADDER[li];
        return throughKeys({ key: x.key, ...(x.minor ? { minor: true } : {}) }, (key) => generate({ family: 'b-std', kind: 'tier', key, hands: 'R', instrument: 'bass', option: li, perBeat: x.feel === 'walk' ? 1 : 0.5 }), items, keyOrder);
      }
      const sp = bassStandardSpec(w.std);
      if (!sp) return [];
      const b = BASS_STD[sp.option];
      return throughKeys({ key: b.key, ...(b.minor ? { minor: true } : {}) }, (key) => generate({ family: 'b-walk', kind: 'standard', key, hands: 'R', instrument: 'bass', option: sp.option, perBeat: sp.perBeat }), items, keyOrder);
    }
    case 'guitarStd': {
      // The standard's whole chart on the guitar (g-jazz 13): the tune's feel unless the way names one, through the keys.
      const option = guitarStdOption(w.std, w.voicing, w.rhythm);
      if (option === null) return [];
      return throughKeys(standardHome(w.std), (key) => generate({ family: 'g-jazz', kind: 'comp-chart', key, hands: 'R', instrument: 'guitar', option, ...(decodeGuitarStd(option).rhythm !== 'bossa' && !isStraightStd(w.std) ? { swing: true } : {}), tempo: guitarStdTempo(w.std)[0] }), items, keyOrder);
    }
    case 'level':
      return techQueue(w.ref, items, keyOrder, 4);
    default:
      return [];
  }
}
