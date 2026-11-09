"""Build the app's concert-grand sample sets from Salamander Grand Piano V3 (Alexander Holm, CC BY 3.0).

    python -I scripts/build-grand.py <salamander Samples dir> <out dir = public/samples>

Source: https://github.com/sfzinstruments/SalamanderGrandPiano (FLAC, 48 kHz / 24-bit, stereo).
Mapping, velocity ranges and release levels follow the library's own SFZ ("Salamander Grand Piano V3.sfz").

Output (all MP3, 48 kHz stereo, high-quality VBR ≈ 120–190 kbps):
  grand-v01 … grand-v16   the 16 velocity layers, 30 notes each (A0 … C8, every minor third)
  grand-rel              the key-release (damper) noise of all 88 keys
  grand-resL / grand-resS release string resonance, after a loud / a soft note (23 notes)
  grand-pedal            sustain pedal down / up noises
Processing: the attack is kept intact (leading silence cut 2 ms before the onset); the tail is cut where it
falls 60 dB below the peak or at a length by register, with a smooth fade; one gain for the whole set
(the loudest peak at -1 dBFS) so the layers keep their recorded dynamics. Each layer's loudness is measured
and written to the manifest so the engine can interpolate level smoothly between layers.
"""
import json
import os
import re
import sys

import numpy as np
import soundfile as sf

SRC, OUT = sys.argv[1], sys.argv[2]
NOTE = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}
# SFZ velocity ranges of the 16 layers (lovel per layer)
LOVEL = [1, 27, 35, 37, 44, 47, 51, 57, 65, 73, 81, 89, 97, 105, 113, 121]


def midi_of(name):
    m = re.match(r'([A-G])(#?)(-?\d)', name)
    return 12 * (int(m.group(3)) + 1) + NOTE[m.group(1)] + (1 if m.group(2) else 0)


def max_len(midi):
    # seconds kept: a low string rings long, a high one is short
    if midi < 40:
        return 11.0
    if midi < 55:
        return 9.0
    if midi < 70:
        return 7.0
    if midi < 84:
        return 5.0
    return 3.5


def trim(x, rate, longest, fade=0.4, floor_db=-60.0):
    mono = np.abs(x).max(axis=1)
    peak = mono.max() or 1.0
    on = int(np.argmax(mono > peak * 10 ** (-50 / 20)))
    start = max(0, on - int(0.002 * rate))
    # end: the last block whose level is above the floor (relative to the peak)
    blk = int(0.05 * rate)
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


def rms_db(y, rate, win=0.25):
    seg = y[: int(win * rate)]
    return 20 * np.log10(np.sqrt(np.mean(seg ** 2)) + 1e-12)


def main():
    files = os.listdir(SRC)
    notes = sorted({f[: f.index('v')] for f in files if re.match(r'^[A-G]#?\d+v\d+\.flac$', f)}, key=midi_of)
    data = {}
    gpeak = 0.0
    rate = 48000
    for layer in range(1, 17):
        for nm in notes:
            x, rate = sf.read(os.path.join(SRC, f'{nm}v{layer}.flac'), dtype='float32', always_2d=True)
            y = trim(x, rate, max_len(midi_of(nm)))
            data[(layer, nm)] = y
            gpeak = max(gpeak, float(np.abs(y).max()))
    gain = 10 ** (-1 / 20) / gpeak
    manifest_sets = {}
    loud = {}
    for layer in range(1, 17):
        lid = f'grand-v{layer:02d}'
        os.makedirs(os.path.join(OUT, lid), exist_ok=True)
        dbs = []
        for nm in notes:
            y = data[(layer, nm)] * gain
            dbs.append(rms_db(y, rate))
            sf.write(os.path.join(OUT, lid, f'{midi_of(nm)}.mp3'), y, rate, format='MP3', subtype='MPEG_LAYER_III', compression_level=0.2)
        loud[lid] = round(float(np.mean(dbs)), 2)
        manifest_sets[lid] = {'ext': 'mp3', 'notes': [midi_of(n) for n in notes], 'lovel': LOVEL[layer - 1], 'db': loud[lid]}
        print(lid, loud[lid], flush=True)

    def simple(prefix, lid, key_of, longest, extra=None):
        os.makedirs(os.path.join(OUT, lid), exist_ok=True)
        keys = []
        for f in sorted(files):
            m = re.match(rf'^{prefix}(.+)\.flac$', f)
            if not m:
                continue
            k = key_of(m.group(1))
            if k is None:
                continue
            x, r = sf.read(os.path.join(SRC, f), dtype='float32', always_2d=True)
            y = trim(x, r, longest, fade=0.15, floor_db=-55) * gain
            sf.write(os.path.join(OUT, lid, f'{k}.mp3'), y, r, format='MP3', subtype='MPEG_LAYER_III', compression_level=0.3)
            keys.append(k)
        manifest_sets[lid] = {'ext': 'mp3', 'notes': sorted(keys), **(extra or {})}
        print(lid, len(keys), flush=True)

    # release noise: rel1 … rel88 = MIDI 21 … 108 (SFZ volume -37 dB)
    simple('rel', 'grand-rel', lambda s: 20 + int(s) if s.isdigit() else None, 1.5, {'db': -37})
    # release string resonance (SFZ: harmL after vel >= 45, harmS below; volume -4 / 0 dB; rt_decay ≈ 7 dB/s held)
    simple('harmL', 'grand-resL', lambda s: midi_of(s), 6.0, {'db': -4, 'rtDecay': 7})
    simple('harmS', 'grand-resS', lambda s: midi_of(s), 6.0, {'db': 0, 'rtDecay': 7})
    # pedal noises: down 1/2 → 1, 2; up 1/2 → 3, 4 (SFZ volume -20 / -19 dB)
    simple('pedal', 'grand-pedal', lambda s: {'D1': 1, 'D2': 2, 'U1': 3, 'U2': 4}.get(s), 3.0, {'db': -20})

    path = os.path.join(OUT, 'manifest.json')
    with open(path, encoding='utf-8') as fh:
        man = json.load(fh)
    for k in [k for k in man['sets'] if k in ('grand-pp', 'grand-mp', 'grand-mf', 'grand-f')]:
        del man['sets'][k]
    man['sets'].update(manifest_sets)
    man['credits']['grand'] = (
        'Salamander Grand Piano V3 — Alexander Holm (CC BY 3.0, https://creativecommons.org/licenses/by/3.0/). '
        'Source: https://github.com/sfzinstruments/SalamanderGrandPiano (SFZ reconstruction by kinwie). '
        'Sets grand-v01…v16 are its 16 velocity layers; grand-rel, grand-resL/S and grand-pedal its release, '
        'release-resonance and pedal samples — trimmed, faded, level-scaled as one set and encoded to MP3 (changes made).'
    )
    with open(path, 'w', encoding='utf-8') as fh:
        json.dump(man, fh, ensure_ascii=False, indent=1)
    print('gain', round(20 * np.log10(gain), 2), 'dB')


main()
