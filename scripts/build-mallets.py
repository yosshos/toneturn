"""Vibraphone and marimba with their dynamics (0.58), from the Versilian Community Sample Library (CC0).

    python -I scripts/build-mallets.py <raw dir with the VCSL wavs> <out dir> <manifest.json to update>

Vibraphone: 4 layers — soft mallets v1, v2; hard mallets v2, v3 (11 notes). Marimba: soft, med, loud (10 notes).
Each sample: attack kept, the tail cut 60 dB down or at a length (vibes 5 s, marimba 2.6 s), faded; one gain per
instrument so its dynamics stay as recorded; each layer's loudness measured into the manifest.
"""
import json
import os
import re
import sys

import numpy as np
import soundfile as sf

RAW, OUT, MAN = sys.argv[1], sys.argv[2], sys.argv[3]
NOTE = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}


def midi_of(n):
    m = re.match(r'([A-G])(#?)(\d)', n)
    return 12 * (int(m.group(3)) + 1) + NOTE[m.group(1)] + (1 if m.group(2) else 0)


def trim(x, rate, longest, fade=0.3, floor_db=-60.0):
    mono = np.abs(x).max(axis=1)
    peak = mono.max() or 1.0
    on = int(np.argmax(mono > peak * 10 ** (-48 / 20)))
    start = max(0, on - int(0.001 * rate))
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


def rms_db(y, rate, win=0.15):
    seg = y[: int(win * rate)]
    return float(20 * np.log10(np.sqrt(np.mean(seg ** 2)) + 1e-12))


INSTR = {
    'vibes': (5.0, [(r'^Vibes_soft_([A-G]#?\d)_v1_rr1_Main\.wav$', 1), (r'^Vibes_soft_([A-G]#?\d)_v2_rr1_Main\.wav$', 2), (r'^Vibes_hard_([A-G]#?\d)_v2_rr1_Main\.wav$', 3), (r'^Vibes_hard_([A-G]#?\d)_v3_rr1_Main\.wav$', 4)]),
    'marimba': (2.6, [(r'^Marimba_hit_Outrigger_([A-G]#?\d)_soft_01\.wav$', 1), (r'^Marimba_hit_Outrigger_([A-G]#?\d)_med_01\.wav$', 2), (r'^Marimba_hit_Outrigger_([A-G]#?\d)_loud_01\.wav$', 3)]),
}
files = os.listdir(RAW)
with open(MAN, encoding='utf-8') as fh:
    man = json.load(fh)
for inst, (longest, pats) in INSTR.items():
    data = {}
    for pat, layer in pats:
        for f in files:
            m = re.match(pat, f)
            if m:
                x, r = sf.read(os.path.join(RAW, f), dtype='float32', always_2d=True)
                data[(layer, midi_of(m.group(1)))] = (trim(x, r, longest), r)
    gpeak = max(float(np.abs(y).max()) for y, _ in data.values())
    gain = 10 ** (-1 / 20) / gpeak
    for _, layer in pats:
        lid = f'{inst}-{layer}'
        notes = sorted(mi for (L, mi) in data if L == layer)
        os.makedirs(os.path.join(OUT, lid), exist_ok=True)
        dbs = []
        for mi in notes:
            y, r = data[(layer, mi)]
            y = y * gain
            dbs.append(rms_db(y, r))
            sf.write(os.path.join(OUT, lid, f'{mi}.mp3'), y, r, format='MP3', subtype='MPEG_LAYER_III', compression_level=0.25)
        man['sets'][lid] = {'ext': 'mp3', 'notes': notes, 'db': round(float(np.mean(dbs)), 2)}
        print(lid, notes, man['sets'][lid]['db'], flush=True)
with open(MAN, 'w', encoding='utf-8') as fh:
    json.dump(man, fh, ensure_ascii=False, indent=1)
print('done')
