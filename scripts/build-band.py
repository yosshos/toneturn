"""Build the band's sample sets (0.55, owner 2026-11-09: "invest in the sound and dynamics of the other instruments").

    python -I scripts/build-band.py <raw dir> <out dir = public/samples>

<raw dir>/virtuosity_drums/Samples/mid/…   Virtuosity Drums (Versilian Studios & Karoryfer Samples, CC0) — the jazz kit,
                                            mid-room stereo pair: 4 dynamics × up to 4 alternating strikes per sound.
<raw dir>/dsmolken.double-bass/pizz/…      D. Smolken's 1958 Otto Rubner double bass, pizzicato (CC0): 2 dynamics × 4 strikes.
<raw dir>/GregSullivan.E-Pianos/Wurlitzer EP200/…   Greg Sullivan's Wurlitzer EP200 (CC BY 3.0): 4 dynamics.

Each sample: the attack kept intact, the tail cut 55–60 dB down or at a length by instrument, faded; one gain per
instrument so its dynamics stay as recorded; each layer's loudness measured into the manifest.
"""
import json
import os
import re
import sys
from collections import defaultdict

import numpy as np
import soundfile as sf

RAW, OUT = sys.argv[1], sys.argv[2]
NOTE = {'c': 0, 'd': 2, 'e': 4, 'f': 5, 'g': 7, 'a': 9, 'b': 11}


def trim(x, rate, longest, fade=0.08, floor_db=-58.0, pre=0.001):
    mono = np.abs(x).max(axis=1)
    peak = mono.max() or 1.0
    on = int(np.argmax(mono > peak * 10 ** (-48 / 20)))
    start = max(0, on - int(pre * rate))
    blk = int(0.02 * rate)
    n = len(mono) // blk
    env = mono[: n * blk].reshape(n, blk).max(axis=1)
    above = np.nonzero(env > peak * 10 ** (floor_db / 20))[0]
    end = (above[-1] + 1) * blk if len(above) else len(mono)
    end = min(end, start + int(longest * rate))
    y = x[start:end].copy()
    f = min(len(y), int(fade * rate))
    if f > 0:
        y[-f:] *= (np.cos(np.linspace(0, np.pi / 2, f)) ** 2)[:, None]
    return y


def rms_db(y, rate, win=0.12):
    seg = y[: max(1, int(win * rate))]
    return float(20 * np.log10(np.sqrt(np.mean(seg ** 2)) + 1e-12))


def write(path, y, rate, q=0.25):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    sf.write(path, y, rate, format='MP3', subtype='MPEG_LAYER_III', compression_level=q)


sets = {}

# ---------------------------------------------------------------- drums
DRUMS = {
    # app piece: (folder, articulation, seconds kept)
    'kick': ('kick', 'kick_snoff', 1.4),
    'snare': ('snare', 'snare_center', 1.2),
    'rim': ('snare', 'snare_crossstick', 0.7),
    'hat': ('hh', 'hh_closed', 0.6),
    'hat-foot': ('hh', 'hh_pedal', 0.7),
    'hat-open': ('hh', 'hh_open', 2.2),
    'ride': ('ride', 'ride_ride', 4.0),
    'ride-bell': ('ride', 'ride_bell', 3.5),
    'crash': ('crash', 'crash_crash', 4.5),
    'tom-hi': ('htom', 'htom_center', 1.6),
    'tom-lo': ('ltom', 'ltom_center', 2.0),
}
ddir = os.path.join(RAW, 'virtuosity_drums', 'Samples', 'mid')
if os.path.isdir(ddir):
    raw = {}
    for piece, (folder, art, longest) in DRUMS.items():
        files = sorted(os.listdir(os.path.join(ddir, folder)))
        found = []
        for f in files:
            m = re.match(rf'^mid_{art}_vl(\d+)(?:_rr(\d+))?\.flac$', f)
            if m:
                found.append((int(m.group(1)), int(m.group(2)) if m.group(2) else None, f))
        # sounds recorded as many single dynamics (snare: up to 36) become 4 layers; the neighbouring dynamics in a
        # layer serve as its alternate strikes
        many = [x for x in found if x[1] is None]
        if many:
            n = max(v for v, _, _ in many)
            counts = defaultdict(int)
            regrouped = []
            for v, _, f in sorted(many):
                layer = min(4, 1 + (v - 1) * 4 // n)
                counts[layer] += 1
                regrouped.append((layer, counts[layer], f))
            found = [x for x in found if x[1] is not None] + regrouped
        for v, rr, f in found:
            x, r = sf.read(os.path.join(ddir, folder, f), dtype='float32', always_2d=True)
            raw[(piece, v, rr)] = (trim(x, r, longest, fade=0.15 if longest > 1.5 else 0.06), r)
    gpeak = max(float(np.abs(y).max()) for y, _ in raw.values())
    gain = 10 ** (-1 / 20) / gpeak
    pieces = {}
    stems = []
    for piece in DRUMS:
        layers = sorted({v for (p, v, _) in raw if p == piece})
        by = []
        dbs = []
        for v in layers:
            rrs = sorted(rr for (p, vv, rr) in raw if p == piece and vv == v)
            names = []
            lv = []
            for rr in rrs:
                y, r = raw[(piece, v, rr)]
                y = y * gain
                stem = f'{piece}-{v}-{rr}'
                write(os.path.join(OUT, 'drums-jazz', f'{stem}.mp3'), y, r, 0.25)
                names.append(stem)
                lv.append(rms_db(y, r))
            by.append(names)
            dbs.append(round(float(np.mean(lv)), 2))
            stems += names
        pieces[piece] = {'layers': by, 'db': dbs}
        print('drum', piece, [len(b) for b in by], dbs, flush=True)
    sets['drums-jazz'] = {'ext': 'mp3', 'notes': stems, 'pieces': pieces}

# ---------------------------------------------------------------- double bass, pizzicato
bdir = os.path.join(RAW, 'dsmolken.double-bass', 'pizz')
if os.path.isdir(bdir):
    raw = {}
    for f in sorted(os.listdir(bdir)):
        m = re.match(r'^pizz_([a-g])(#|s|b)?(\d)_([a-z])([a-z])\.wav$', f.lower())
        if not m:
            continue
        acc = {'#': 1, 's': 1, 'b': -1}.get(m.group(2) or '', 0)
        midi = 12 * (int(m.group(3)) + 1) + NOTE[m.group(1)] + acc
        x, r = sf.read(os.path.join(bdir, f), dtype='float32', always_2d=True)
        raw[(m.group(4), midi, m.group(5))] = (trim(x, r, 3.2, fade=0.25, floor_db=-55), r)
    gpeak = max(float(np.abs(y).max()) for y, _ in raw.values())
    gain = 10 ** (-1 / 20) / gpeak
    dyns = sorted({d for (d, _, _) in raw}, key=lambda d: 'pmf'.index(d) if d in 'pmf' else 9)
    layers = []
    for d in dyns:
        notes = sorted({mi for (dd, mi, _) in raw if dd == d})
        stems = []
        lv = []
        for mi in notes:
            rrs = sorted(rr for (dd, m2, rr) in raw if dd == d and m2 == mi)
            for k, rr in enumerate(rrs):
                y, r = raw[(d, mi, rr)]
                y = y * gain
                stem = f'{d}-{mi}-{k + 1}'
                write(os.path.join(OUT, 'bass-pizz', f'{stem}.mp3'), y, r, 0.3)
                stems.append(stem)
                lv.append(rms_db(y, r, 0.2))
        layers.append({'dyn': d, 'notes': notes, 'rr': max(len([1 for (dd, m2, _) in raw if dd == d and m2 == mi]) for mi in notes), 'db': round(float(np.mean(lv)), 2), 'stems': stems})
        print('bass', d, len(notes), 'notes', layers[-1]['rr'], 'rr', layers[-1]['db'], flush=True)
    sets['bass-pizz'] = {'ext': 'mp3', 'notes': [s for L in layers for s in L['stems']], 'layers': [{k: v for k, v in L.items() if k != 'stems'} for L in layers]}

# ---------------------------------------------------------------- Wurlitzer EP200
wdir = os.path.join(RAW, 'GregSullivan.E-Pianos', 'Wurlitzer EP200', 'Samples')
if os.path.isdir(wdir):
    raw = {}
    for f in sorted(os.listdir(wdir)):
        m = re.match(r'^([a-g])(b|#|s)?(\d)(pp|mp|f|ff)\.flac$', f.lower())
        if not m:
            continue
        acc = {'#': 1, 's': 1, 'b': -1}.get(m.group(2) or '', 0)
        midi = 12 * (int(m.group(3)) + 1) + NOTE[m.group(1)] + acc
        x, r = sf.read(os.path.join(wdir, f), dtype='float32', always_2d=True)
        raw[(m.group(4), midi)] = (trim(x, r, 6.0, fade=0.3, floor_db=-55), r)
    gpeak = max(float(np.abs(y).max()) for y, _ in raw.values())
    gain = 10 ** (-1 / 20) / gpeak
    layers = []
    for d in ['pp', 'mp', 'f', 'ff']:
        notes = sorted(mi for (dd, mi) in raw if dd == d)
        if not notes:
            continue
        lv = []
        for mi in notes:
            y, r = raw[(d, mi)]
            y = y * gain
            write(os.path.join(OUT, f'wurli-{d}', f'{mi}.mp3'), y, r, 0.25)
            lv.append(rms_db(y, r, 0.25))
        sets[f'wurli-{d}'] = {'ext': 'mp3', 'notes': notes, 'db': round(float(np.mean(lv)), 2)}
        print('wurli', d, notes, sets[f'wurli-{d}']['db'], flush=True)

path = os.path.join(OUT, 'manifest.json')
with open(path, encoding='utf-8') as fh:
    man = json.load(fh)
man['sets'].update(sets)
if 'drums-jazz' in sets:
    man['credits']['drums'] = 'Virtuosity Drums — Versilian Studios & Karoryfer Samples (CC0), mid-room microphones; trimmed and encoded to MP3.'
if 'bass-pizz' in sets:
    man['credits']['bass'] = 'Upright bass (pizzicato): 1958 Otto Rubner double bass played and sampled by D. Smolken, 2013 (CC0 1.0), all dynamics and alternate strikes; trimmed and encoded to MP3.'
if any(k.startswith('wurli-') for k in sets):
    man['credits']['wurli'] = 'Wurlitzer EP200 — Greg Sullivan (CC BY 3.0, https://creativecommons.org/licenses/by/3.0/), SFZ mapping by kinwie; trimmed, level-scaled and encoded to MP3 (changes made).'
with open(path, 'w', encoding='utf-8') as fh:
    json.dump(man, fh, ensure_ascii=False, indent=1)
print('done')
