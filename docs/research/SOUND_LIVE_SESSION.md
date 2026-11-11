# Sound for a "live session": what is possible in a browser/PWA

*Research, 2026-11-10. No app code was changed. Licences were checked on the sources' own pages where possible; each one
must be re-checked against the LICENSE file in the download before it ships (see §2.0).*

**The question.** The owner wants the app to sound like a **live session**. That means two things:

- a MIDI keyboard or e-kit played *through* the app should feel like a real instrument: low latency and expressive;
- the generated band should sound like players: piano/Rhodes comping, upright and electric bass, jazz/rock drums with
  brushes, guitar, maybe horns.

The owner calls these "VSTs". This document covers:

- what the app has now (§1);
- which free libraries are legally usable in a closed, paid app (§2);
- what commercial licensing looks like (§3);
- the browser technology and its limits (§4);
- how to make the band feel live (§5);
- a phased plan (§6).

---

## 0. Findings in brief

1. **The biggest problem today is memory, not quality.** The grand's 16 layers decode to about **1.28 GB of PCM**
   (measured, §1.3). The jazz kit and pizzicato bass add about 190 MB, and they load at unlock on *every* device.
   - `lightDevice()` relies on `navigator.deviceMemory` and `connection.saveData`. Neither exists in Safari, so **an
     iPhone counts as "not light" and loads all 16 layers.**
   - WebKit kills tabs at a heap of roughly 200–450 MB (unofficial estimate) and reloads the page.
   - So the first job of any "pro sound" phase is a memory budget per device tier (§6, Phase 0). Without it, adding
     instruments makes things worse.
2. **Free libraries cover most of the band legally (CC0 / CC BY).** Each row below is a candidate, not yet verified:
   - piano: Salamander (have), Upright Piano KW (CC0);
   - upright bass: Meatbass and Sneakybass, both CC0, from the same Karoryfer double bass as the current pizz set;
   - electric bass: Growlybass, a Squier Jazz Bass (CC0), or FreePats YR (CC0);
   - archtop/hollowbody guitar: Shinyguitar, Black and Green Guitars (CC0);
   - jazz guitar: FreePats "Electric Guitar Clean #2 (Jazz)" (CC0);
   - nylon guitar: FreePats Spanish classical (CC0);
   - saxes: MTG Solo Sax (CC BY 4.0), Weresax alto and Bear Sax baritone (CC0);
   - brushes: Swirly Drums (CC0), recorded brush playing;
   - rock kits: Naked Drums (CC BY 4.0, 10 round robins), SM Drums (public domain).
3. **There is no free, commercially usable Rhodes.**
   - jRhodes3c/3d are NC licensed (already ruled out in memory).
   - The best options: keep improving the modelled tine EP, license a commercial Rhodes set (§3), or sample a Rhodes
     ourselves.
4. **Traps to avoid:**
   - **NC** licences (jRhodes, Rickenbacker 4001);
   - **CC BY-SA** (Salamander Drumkit, LivingRoom Upright, AVL kits, Sam's Sonor). See §2.0 for why to skip these in a
     closed app.
   - **"Free, no licence stated"** (Piano in 162, Estate Grand LE). Free to *use* is not the same as free to
     *redistribute inside an app*.
   - **Voxengo IRs.** The terms forbid profiting "directly or indirectly" from distributing them, which is risky inside
     a paid app.
5. **Pro libraries can't simply be bought and shipped.**
   - The EULAs of Spitfire, Native Instruments and others allow music production only. They forbid redistributing
     samples or building instruments from them.
   - Shipping their sounds inside an app needs a negotiated OEM/content licence.
   - Pianoteq (physical modelling) has no public web/WASM SDK. Modartt says it is "open to partnerships", so that would
     be a direct conversation.
6. **Latency and MIDI hardware are bounded by the browser, not by us.**
   - Desktop Chrome/Edge with wired output: roughly 10–20 ms is reachable.
   - Android: anywhere from about 10 ms to over 100 ms, depending on the device.
   - Bluetooth: always 150 ms or more, which is unplayable.
   - **Safari has no Web MIDI at all.** An iPhone or iPad can't play the app from a MIDI keyboard in a PWA.
   - A worklet-based sampler, a smaller `latencyHint`, and getting the live path off React's critical path are the
     remaining in-app gains (§4.6).
7. **The "live" feel comes more from the band than from the samples.** The literature gives concrete numbers:
   - swing ratio falls with tempo;
   - the drummer swings harder than the soloist;
   - soloists delay downbeats and sync offbeats;
   - the hi-hat sits about 2–26 ms ahead.

   Those, plus call-and-response comping and a shared room reverb, will do more per hour of work than another 100 MB
   of samples (§5).

---

## 1. What the app has now (inventory, 0.68)

### 1.1 Engine files (`src/audio/`)

| File | Lines | What it does |
|---|---|---|
| `piano.ts` | 1,865 | `PianoEngine`: one `AudioContext({latencyHint:'interactive'})`, sample loading, every instrument, live MIDI path, band playback, percussion, timelines, latency compensation via `getOutputTimestamp()` |
| `grand.ts` | 91 | Salamander mapping helpers: layer choice, dB interpolation between layers, damper times by register, release resonance/noise gains, load order, `lightDevice()` |
| `layers.ts` | 51 | Velocity-layer gain curves, `RoundRobin` (never the same strike twice), Wurlitzer layer map |
| `epiano.ts` | 86 | Modelled tine EP (Rhodes-like) + suitcase auto-pan tremolo |
| `organ.ts` | 159 | Modelled tonewheel organ (drawbar partials, key click) + `Leslie` |
| `pluck.ts` | 67 | Karplus–Strong guitar (one buffer per note, made on first use) |
| `fx.ts` | 421 | Offline-rendered synth FX chain (EQ, drive, compressor, M/S width, procedural reverb) |
| `mixer.ts` | 150 | Channel strips (per-instrument volume) |
| `src/speech/midi.ts` | 290 | Web MIDI input: note/CC listeners, device filter, octave shift, pedal invert, drum mode (CC4 hi-hat, chokes, cross-talk filter) |

Brushes are **modelled** (`piano.ts` `brush()`: a noise sweep plus a tap burst). Code comment: "no free recording is good
enough". Rock/club/body/brush kits in `public/samples/kits/*` are small single-hit WAVs.

### 1.2 Sample sets (`public/samples`, 69.5 MB on disk)

| Set | Source / licence | Format | Files | On disk |
|---|---|---|---|---|
| `grand-v01…v16` | Salamander Grand V3, CC BY 3.0 | MP3 48 kHz stereo, VBR | 16 × 30 (every minor third) | 46 MB |
| `grand-rel/resL/resS/pedal` | Salamander release noise, release resonance, pedal | MP3 stereo | 138 | 2.1 MB |
| `grand` (old) | Salamander subset | MP3 | 23 | 1.5 MB |
| `drums-jazz` | Virtuosity Drums (Versilian + Karoryfer, CC0), mid mics | MP3 stereo | 173 (11 pieces × dynamics × 4 RR) | 5.6 MB |
| `bass-pizz` | D. Smolken double bass (CC0), 3 dynamics × 4 RR | MP3 mono | 129 | 2.1 MB |
| `bass` | older upright subset | MP3 | 11 | 0.4 MB |
| `wurli-pp/mp/f/ff` | Greg Sullivan Wurlitzer EP200 (CC BY 3.0) | MP3 mono | 42 | 1.0 MB |
| vibes, marimba, upright, harp, harpsichord, organ | VCSL (CC0) | WAV 22 kHz / MP3 | ~150 | ~8 MB |
| `kits/*`, `perc` | small one-shots | WAV | 44 | 2.5 MB |

Credits are in `manifest.json` → `credits`. Licences and the "CC0 or CC BY only" rule are in
`docs/research/MUSIC_SOURCES_LEGAL.md` §6.

### 1.3 Loading, caching and memory

- **Fetch → decode.** Every note is one `fetch()` and then `decodeAudioData()` into the live context's rate (48 kHz
  since 0.54). There are no Range requests and no streaming.
- **Service worker cache.** `src/sw-template.js` keeps `toneturn-samples-v1` across versions:
  - audio files are cache-first;
  - `manifest.json` is network-first.

  Each sample is cached after its first use, so offline works once a set has been heard.
- **Load order.**
  - At `unlock()`: percussion, the current kit and the small bass load at once.
  - 1.5 s later: `drums-jazz` and `bass-pizz` load in the background.
  - When the grand is selected, layers load in a "preferred" order. A light device stops after 8.
- **Unloading.** Nothing is ever unloaded.

**Decoded PCM, measured.** Durations come from the actual files, ×48 kHz × channels × 4 bytes (Float32).

| What | Audio (s) | Decoded |
|---|---|---|
| One grand layer (30 notes, stereo) | ~208 | **~80 MB** |
| All 16 grand layers | ~3,330 | **~1.28 GB** |
| 8 layers ("light" device) | ~1,665 | ~640 MB |
| Grand release/resonance/pedal | 153 | 59 MB |
| `drums-jazz` (stereo) | 311 | 120 MB |
| `bass-pizz` (mono) | 355 | 68 MB |
| Everything in `public/samples` | — | ~1.87 GB |

**Why this matters.**

- An `AudioBuffer` is always Float32 at the context rate.
- A compressed 2.8 MB MP3 layer becomes about 80 MB in RAM, roughly 28×.
- WebKit/iOS kills tabs well below 1 GB. Bug reports show a reload after one 9 MB MP3 is decoded; the unofficial
  per-device heap estimate is 200–450 MB ([catchmetrics][ram], [Babylon forum][bab]).
- `lightDevice()` cannot detect iPhones: `deviceMemory` and `saveData` are Chromium-only. So **iOS loads all 16
  layers.**
- **Recommendation P0-1** (§6): fix this before any upgrade.

### 1.4 The live MIDI path

```
MIDI device → OS → browser → MIDIInput.onmidimessage (main thread, midi.ts)
  → App.tsx listener → piano.liveNote(m, on, vel) → sample(m, vel, ctx.currentTime + 0.003)
  → AudioBufferSourceNode → live bus → piano strip → master → output (baseLatency + outputLatency)
```

What it already does well:

- touch curves (light/normal/heavy/fixed);
- sustain, sostenuto and soft pedals;
- a string bloom while the pedal is held (a convolver send);
- pedal noise;
- a polyphony cap of 48 voices;
- all-notes-off when the app is hidden;
- choice of output device (`setSinkId`).

What costs latency:

- **The main thread.** Every note goes through the UI thread. `noteOn()` also notifies UI listeners (keyboard
  highlight), so any React render or GC pause delays the sound.
- **The event timestamp is ignored.** The note is scheduled at "now + 3 ms", not at the MIDI event's `timeStamp`. That
  is fine for latency but adds jitter when the main thread is busy.
- **The latency hint.** `latencyHint:'interactive'` is used; §4.6 covers a smaller value.

### 1.5 Earlier sound work

From the memory note *sound-upgrade-options*:

- Options 1 and 2 shipped in 0.54–0.55: the full Salamander, the band sets, and the modelled organ/EP.
- **Still open:**
  - option 3, a licensed commercial library or Pianoteq;
  - option 4, recording our own piano.
- jRhodes3 is banned (NC licence).

Demos are in `docs/sound-demo/`.

---

## 2. Free, commercially usable libraries

### 2.0 Licence rules for a closed, paid PWA

| Licence | Shipping the samples inside the app | Verdict |
|---|---|---|
| **CC0 / public domain** | Anything goes, no credit needed (credit anyway, as good practice) | **Preferred** |
| **CC BY 3.0/4.0** | OK. The credit must be visible (author, title, licence link, "changed"), e.g. an About/Credits screen. `manifest.json` credits alone are not visible to users. | **OK.** Check that Settings shows the credits. |
| **CC BY-SA** | Our trimmed, re-encoded files are *adaptations*, so they must be offered under BY-SA too. Anyone may then extract and reuse them. Whether the "ShareAlike" spreads to the app as a whole is arguable, and no lawyer has looked at it. | **Avoid.** At minimum, take legal advice. |
| **CC BY-NC / NC-SA** | Not allowed in a paid app | **Never** |
| **MIT / GPL code licences on samples** | MIT is fine with notice. GPL on *data* is murky and conflicts with closed code if linked. | MIT OK, GPL avoid |
| **"Free for commercial use", no licence** (Ivy Audio, many Kontakt freebies) | Usually means "use it in your music", **not** "redistribute the raw samples inside a product" | **Ask the author in writing** |
| **Custom** (Maestro Concert Grand, Unreal Instruments) | Read every clause. Most forbid redistributing as an instrument. | Case by case |

**Re-check every row.** Catalogue listings disagree at times. Examples: KVR lists Bear Sax as GPL-3 while sfzinstruments
says CC0, and jRhodes3d is listed as CC0 in one mirror and NC in another. **The LICENSE file in the download is the
authority.** Save a copy next to the build script, as the current scripts do.

### 2.1 Acoustic pianos

| Library | Licence | Size (source) | Detail | Fit |
|---|---|---|---|---|
| **Salamander Grand V3** (Yamaha C5), [FreePats][fp-piano] / [sfzinstruments][sfz-pianos] | CC BY 3.0 | 394 MB (44.1/16) – 1.18 GB (48/24) | 16 velocity layers, every minor third, release + resonance samples, 2× AKG C414 | **Have it.** Bright pop/rock grand; a little thin for jazz ballads. |
| Accurate-Salamander | CC BY | 1.6 GB | Salamander re-tuned with more even dynamics | Could replace our build input. Better tuning, same licence. |
| **Upright Piano KW** (Kawai upright), [FreePats][fp-piano] | **CC0** | 32 MB FLAC; small 3–6 MB | 2 layers, stereo, living room | A warm "practice-room upright". Tiny. A good **phone-tier** second piano. |
| Headroom Piano (Yamaha C3), [sfzinstruments][sfz-pianos] | CC BY 4.0 | 156 MB | catalogue only, details not verified | Worth auditioning as a darker grand |
| Splendid Grand (AKAI Steinway samples), [sfzinstruments][sfz-pianos] | Public domain (per catalogue) | 77 MB | 4 layers | Old (AKAI-era) and lo-fi. Only as a fallback. |
| Church Steinway, Estate Grand LE | **Not stated** | 104 MB / 650 MB | — | Don't use without a written licence |
| **Piano in 162** (Steinway B, Ivy Audio), [sfzinstruments][in162] | **Not stated**. Press says "free … for personal and commercial use". | 4.9 GB | 5 dynamics, 2 RR, pedal-down/up sets, 2 mics | The best-sounding free *jazz* grand: intimate, warm. **Email Ivy Audio** for written permission to redistribute a trimmed web subset. Without it, don't ship. |
| VCSL Keys | CC0 | 680 MB | uprights, harpsichords | Have parts. CC0, variable quality. |
| Iowa MIS piano ([UIowa][iowa]) | "No restrictions" per the studio director's announcements | — | anechoic, 3 dynamics | Too dry and too few layers. Research use only. |

### 2.2 Electric pianos, organ, mallets

| Library | Licence | Detail | Fit |
|---|---|---|---|
| Greg Sullivan E-Pianos (3 instruments, incl. the Wurlitzer we ship), [sfzinstruments][sfz-pianos] | CC BY 3.0 | 21.5 MB | **Have the Wurlitzer.** Check the other two instruments in the pack. |
| jRhodes3c/3d (Rhodes Mark I), [sfzinstruments][jr3d] | **CC BY-NC (-SA)** | 18–92 MB, up to 5 layers | **Banned** (NC) |
| Any free CC0/CC BY Rhodes | none found | — | **Gap.** Keep the modelled tine EP; consider a licence or our own recording (§3, §6). |
| Organ | — | — | The modelled tonewheel and Leslie are the right approach. Sampled B3s are huge and add little in a browser. |
| Vibraphone / marimba (VCSL) | CC0 | have (soft and hard mallets, dynamics) | Fine. Add motor-on vibes later if wanted. |

### 2.3 Basses

| Library | Licence | Size | Detail | Fit |
|---|---|---|---|---|
| D. Smolken Double Bass ([sfzinstruments][sfz-strings]) | CC0 | — | pizz, 3 dyn × 4 RR | **Have it** (`bass-pizz`) |
| **Meatbass** (1958 Otto Rubner, Karoryfer), [KVR][meat] | CC0 (per catalogue) | 189 MB, 434 samples | larger, more dynamics, incl. slides/ghosts (to verify) | Upgrade path for the walking bass. Same bass, deeper sampling. |
| **Sneakybass** ([sfzinstruments][sfz-strings]) | CC0 | 324 MB | pizz at very soft dynamics | **Ballads and brushes.** Fills our softest layer. |
| **Growlybass** (Squier Jazz Bass), [sfzinstruments][sfz-basses] | CC0 | 160 MB | finger | **Electric bass for funk/pop/fusion** |
| Fashionbass (J-bass sound) / Swagbass / Pastabass (Bass VI) / Black & Blue (5-string) | CC0 | 138–961 MB | — | Alternatives. Pick by ear. |
| **FreePats Bass Guitar YR** (Yamaha RBX), [FreePats][fp-bass] | CC0 | 2.7–3.1 MB (pick / finger) | small | **Phone tier** electric bass, or a fallback |
| Rickenbacker 4001 | **CC BY-NC-SA** | 508 MB | — | Banned |

### 2.4 Drums (jazz sticks, brushes, rock)

| Library | Licence | Size | Detail | Fit |
|---|---|---|---|---|
| **Virtuosity Drums** ([Versilian][virt]) | CC0 | ~5,000 samples, 60 articulations | jazz kit with **sticks**, Boston | **Have it** (mid mics only). Could add the close-mic ride/bell for more sizzle. |
| **Swirly Drums** (Karoryfer), [sfzinstruments][sfz-drums] | CC0 | 1.6 GB | **real brush playing** (punk/indie kit, so not a bop kit) | The only CC0 brush source found. Audition its sweeps and taps against our modelled brushes; it may beat them on the snare. |
| **Naked Drums** | CC BY 4.0 | 1.3 GB | up to 5 layers, **10 RR**, several mics | **Rock/pop kit** upgrade |
| SM Drums | Public domain | 2.2 GB+ | deep multisampling | Rock/pop alternative |
| Big Rusty Drums / Unruly / Frankensnare (Karoryfer) | CC0 | 0.9–2.3 GB | big/odd kits, snares | Colour. Frankensnare for snare variety. |
| DRS Kit / Muldjord Kit (DrumGizmo), [FreePats][fp-drums] | CC BY 4.0 | 350–750 MB | layers + random strikes | Rock alternatives |
| Gogodze Phu Vol II | CC0 | 133 MB | variable-fidelity kit | Lo-fi/hip-hop colour |
| Salamander Drumkit, Sam's Sonor, AVL kits (incl. **Blonde Bop** jazz kit) | **CC BY-SA** (AVL: "modified" BY-SA) | 370 MB+ | — | **Avoid** (§2.0). Blonde Bop is the one free *bop* kit, so it may be worth a written licence request to its authors (Glen MacArthur, Robin Gareus). |
| Commercial brushes (BFD Jazz Brushes, Loopmasters) | EULA | — | — | Music-production licences only (§3) |

### 2.5 Guitars

| Library | Licence | Size | Fit |
|---|---|---|---|
| **Shinyguitar** (black archtop, Karoryfer), [sfzinstruments][sfz-gtr] | CC0 | 352 MB | **Jazz comping guitar** (archtop) |
| **Black_And_Green_Guitars** (two hollowbodies) | CC0 | 500 MB | Jazz/blues hollowbody |
| **FreePats Electric Guitar Clean #2 (Jazz)**, [FreePats][fp-egtr] | CC0 | 63 MB FLAC; **small 2.4 MB** | Ready-made jazz tone, tiny phone version |
| FreePats Clean #1 / Direct | CC0 | 74–118 MB; small 3 MB | Pop/rock clean; the DI version can go through our own amp model |
| **FreePats Spanish classical (nylon)**, [FreePats][fp-agtr] | CC0 | 4.5 MB FLAC | **Bossa nylon**. The page itself says recording conditions were "far from ideal". Audition first. |
| Emilyguitar | CC0 | — | general-purpose |
| Blue Jeans and Moonbeams | MIT | — | electric + acoustic |
| Karoryfer Snowkiss/Surfkiss/Secret Agent | Commercial | 3.7–5.6 GB | Licence from Karoryfer if we want them later. Small company, likely approachable. |

### 2.6 Horns (optional)

| Library | Licence | Size | Fit |
|---|---|---|---|
| **MTG Solo Sax** (soprano, alto, tenor, baritone; UPF Barcelona), [sfzinstruments][sfz-ww] | CC BY 4.0 | 110 MB FLAC 48 kHz | **Best free jazz sax option.** Sustains, not phrases. |
| **Weresax** (alto), **Bear Sax** (1926 Conn baritone), Karoryfer | CC0 (catalogue; KVR says GPL-3 for Bear Sax, so check the files) | — | Section/background lines |
| VSCO-2 Community Edition (Versilian) | CC0 | 111 MB–1.9 GB | orchestral trumpet, trombone, horn, tuba. Classical tone, not jazz. |
| War Tuba | CC0 | 104 MB | New Orleans/brass-band colour |
| VG Trumpet (Northern Trumpets) | "Free" (no licence) | 887 MB | Ask first. Commercial VG range for the real thing. |

Single-note horn samples never sound like a jazz soloist (no scoops, falls or breath phrasing). In a backing band, use
horns only for **pads/backgrounds and shout-chorus hits**, never for solo lines.

### 2.7 Reverb impulse responses

| Source | Licence | Fit |
|---|---|---|
| **OpenAIR** (University of York), [York][openair] | Mostly CC BY (per IR, often CC BY 4.0). Check each IR. | **Use.** Real halls, studios and clubs. Credit each one. |
| Voxengo IM Reverbs, [Voxengo][voxengo] | Free incl. commercial use, but "**selling these files or profiting from distributing them, directly or indirectly, is not allowed**" | Risky inside a paid app. Ask Voxengo or skip. |
| EchoThief | Own licence (allows derivative works; commercial terms not confirmed) | Check before use |
| Our own procedural IRs (`fx.ts makeImpulse`, `smallRoom`) | ours | Keep as the fallback. They cost no download. |

A short IR (0.6–1.2 s "jazz club" or "studio live room") at 48 kHz stereo is 0.2–0.5 MB as Float32. Cost is CPU, not
memory; one shared convolver send for the whole band is the norm (§5.4).

---

## 3. Commercial libraries and licensing

| Vendor / product | What the standard EULA allows | App/web route |
|---|---|---|
| **Spitfire Audio** | Royalty-free *recordings*. Not allowed: making "another sample library, or something that can be construed as such" ([Spitfire][spit]). An app that plays their samples counts as that. | No public OEM programme. Needs a bespoke deal. |
| **Native Instruments** (Kontakt libs, Una Corda, Noire…) | Content "only for your … music and audio production"; may not be "reassembled … as sound libraries, audio samples" ([NI ToS][ni]); anything else needs written permission | Bespoke. NI rarely licenses to third-party apps. |
| **Modartt Pianoteq** (physical modelling, ~50 MB, very expressive, CPU heavy) | Per-user licence, 3 device activations; iOS/iPadOS version since 2023 | **No web/WASM SDK.** Modartt lists itself as "open to partnerships for adapting Pianoteq to other devices or applications" ([KVR][modartt]). Contact `sales@modartt.com`. A WASM port would need Modartt's own engineers, and CPU on phones is doubtful. |
| **UVI** (Falcon/UVI Workstation engine) | Standard EULA = music production | UVI builds engines for hardware OEMs (not verified here). Worth an email for the content plus a web build. |
| **Toontrack** (EZdrummer/Superior), **BFD** (Jazz Brushes) | Music production only | Bespoke. Drum vendors sell MIDI grooves too; the groove licence differs from the sound licence. |
| **SONiVOX** (formerly **Sonic Implants**) | Sells OEM/embedded sound sets (it made Android's EAS GM bank) ([SONiVOX][sonivox]) | The most "app-friendly" commercial source historically, but GM-bank quality, not boutique |
| **Karoryfer Samples** (Snowkiss, Secret Agent, Ghana Drums…) | Commercial EULA | Small, open-source-friendly company that already releases CC0. **The most likely yes for an affordable redistribution licence**, e.g. their commercial guitars and basses. |
| **VGTrumpet** (VG Trumpet/Sax/Trombone SFZ) | Commercial | Small developer; a realistic ask for jazz horns |
| **Ivy Audio** (Piano in 162) | Free, no explicit licence | Ask for written permission (§2.1) |

**What the big learning apps use.** Yousician, Simply (JoyTunes), Melodics and Flowkey publish nothing on their
playback sound sources. Their docs only cover input (microphone or MIDI) ([Yousician support][ys]). Native apps can
embed commercial engines under OEM terms. Our constraint is the web: whatever we license must be served as files that a
user could, with effort, pull out of the cache. Licensors will ask about that, so we should offer:

- obfuscation or encryption at rest (per-file XOR or AES key fetched at runtime, decoded in a worklet);
- MP3/Opus quality only (never the source WAVs);
- trimmed subsets.

**Our own recordings** (option 4 in memory) are the cleanest legal route for the gaps: Rhodes, jazz brushes and a jazz
ride. Rough cost:

- one day of studio time with a Rhodes Mark I;
- 5 velocity layers × every minor third (30 notes) × release = about 300 samples;
- a drummer with brushes and a ride: about 1 day.

We own them outright, and they can become a selling point ("recorded for The 7th Sense").

---

## 4. Browser technology

### 4.1 Sampler best practice (what pro samplers do, and how it maps to Web Audio)

| Technique | Pro samplers | Web Audio today | Recommendation |
|---|---|---|---|
| Velocity layers | 4–16 (Salamander 16; Piano in 162 has 5). Gains flatten beyond ~6–8 layers when level is interpolated between layers. | We do dB interpolation between layers (`targetDb`). Good. | 6 layers on phones, 8–10 on desktop "full". Keep 16 only as an opt-in "studio" tier. |
| Velocity → timbre | Layers + a velocity-tracked low-pass filter | Layer gain only | Add a gentle velocity-tracked low-pass per voice. Then fewer layers sound like more. |
| Round robins | 2–10 per hit (drums 4–10) | 4 RR on drums/bass, never the same twice | Keep. For the piano, ±3–5 cents and ±0.5 dB random detune/gain stand in for RR. |
| Release samples | damper noise + string release | Have (`grand-rel`, `resL/S`) | — |
| Pedal resonance | sympathetic strings (Pianoteq models it; samplers use pedal-down samples) | Convolver "string bloom" send | Fine. Piano in 162 has real pedal-down samples, if licensed. |
| Sample length | full decay (up to 30 s low notes) | Trimmed by register (11 s → 3.5 s) | For phones, trim to 4–6 s and let a natural fade finish (§6). |
| Streaming (DFD) | Only attack heads in RAM; the rest streams from disk | Everything decoded in RAM | See 4.3 |

### 4.2 Formats and decode cost

| Format | Size vs WAV 16-bit | `decodeAudioData` support | Notes |
|---|---|---|---|
| WAV 16-bit | 1× | all | Biggest download; no decode cost beyond conversion |
| FLAC | ~0.5–0.6× | Chrome, Firefox, Safari (verify on older iOS) | Lossless. Good for the "studio" tier. |
| MP3 VBR 128–190 kbps | ~0.10–0.15× | all | **What we use.** Decoders remove the LAME encoder delay/padding (Firefox fixed this in 2019–20, [Mozilla 1566389][moz-mp3]), so attacks stay aligned. |
| AAC (m4a) | ~0.08–0.12× | all, incl. Safari | Old Chrome/Edge had start/end gaps ([Mozilla 1669166][moz-aac]) |
| **Opus** 96–128 kbps | ~0.07–0.09× | Chrome/Firefox: yes. Safari: WebM-Opus in `decodeAudioData` from about 17.4; Ogg-Opus from 18.4 ([WebKit 238546][wk-opus], [WebKit 327697][wk-opus2]) | Best quality per byte; 48 kHz native. Ship Opus plus an MP3 fallback, or Opus only when iOS 18.4+ is the minimum. |

**Decode cost.** `decodeAudioData` runs off the main thread in Chrome and Safari, but decoding ~400 files takes seconds
on a phone, and each result is full-size Float32 (§1.3). **Memory is set by the decoded length, channels and rate, not
by the file format.**

### 4.3 Keeping memory down (the levers)

| Lever | Saving | Cost / risk |
|---|---|---|
| **Fewer layers per tier** (16 → 6 phone, 10 desktop) | 60–80 % | Barely audible with dB interpolation and a velocity filter |
| **Shorter tails on phones** (cap 4–6 s, fade) | 30–50 % | Long low notes fade early. Mask with the room reverb and the pedal bloom. |
| **Decode at 32 kHz** (`OfflineAudioContext(…, 32000)` as decoder; the source node resamples on playback) | 33 % | Top end stops at 16 kHz. Inaudible on phone speakers; subtle on headphones. *The 22 kHz decode before 0.54 was too low; 32 kHz is the middle ground.* |
| **Mono for band instruments** (bass, kick, snare already mono or nearly) | 50 % for those | Stereo comes from panning + reverb (§5.4) |
| **Shared tails**: per-layer attack heads (first ~0.5 s), the tail of the nearest of 3–4 "tail layers", crossfaded | ~50 % on the grand | Build-script work; needs careful crossfade |
| **Int16 storage in an AudioWorklet sampler** (our own worklet holds PCM as Int16Array in a WASM/SharedArrayBuffer heap and mixes voices itself) | 50 % on everything | The big engine investment (4.4). SharedArrayBuffer needs COOP/COEP headers (Netlify `_headers` can set them; check YouTube embeds). |
| **Unload** sets not used by the current exercise/course (LRU) | unbounded | Re-decode from the SW cache costs seconds, so do it between exercises |
| **Stream tails** (Range requests or chunked Opus via WebCodecs `AudioDecoder`) | ~90 % | Most complex. WebCodecs is in Chromium; Safari support is newer (verify). Only for a future "studio" tier. |

### 4.4 Worklet and WASM engines

| Engine | Licence | Formats | State / fit |
|---|---|---|---|
| **sfizz-webaudio** ([GitHub][sfizz-web]) | MIT front end; sfizz is BSD-2 | SFZ | A prototype: "only generators and embedded sample files", everything in memory, Chrome-only demo. **Not production-ready.** Use SFZ as the *build input* (as we do), not at runtime. |
| sfz-web-player (sfzlab) | CC0 | SFZ (pure Web Audio) | Reference code for SFZ opcode handling |
| **SpessaSynth** (`spessasynth_core` / `_lib`), [GitHub][spessa] | **Apache-2.0** | SF2, SF3 (Ogg-compressed), DLS | Mature. Runs in an AudioWorklet (or a Worker plus a worklet), with reverb/chorus. **An SF3 build of our sets would load compressed and play in one engine.** Notes: Chromium SF3 glitch caveat; weak Android devices struggle. |
| FluidSynth (WASM ports, js-synthesizer) | LGPL-2.1 | SF2/SF3 | Works; LGPL needs dynamic linking or the object files offered. Prefer SpessaSynth. |
| WebAudioFont ([GitHub][waf]) | **GPL-3.0** code; sounds from GeneralUser/FluidR3 GM banks | own JS format | GPL plus GM quality. **Avoid.** |
| Tone.js `Sampler` | MIT | any decoded buffer | Simple: velocity scales gain, no layers or round robins. Below what we already have. |
| smplr (danigb) | (check; successor of MIT soundfont-player) | its own CDN samples | Convenient, but the samples come from a third-party CDN with mixed licences. Not for us. |
| Faust → WASM worklet; Elementary Audio; Csound WASM | GPL/LGPL/MIT mixes (check per lib) | physical models / DSP | **Physical modelling in the browser is practical for organ, EP tines, plucked strings, and brushes** (what we model already). A full Pianoteq-class piano model is CPU-heavy on phones. |

**The recommended engine path** is our own small AudioWorklet sampler, not a third-party player:

- It holds Int16 PCM.
- It mixes voices with per-voice gain, low-pass and pitch.
- The main thread only posts note events.

Why this is the best fit:

- It halves memory (4.3).
- It keeps live playing off the main thread's jank (4.6).
- It reuses all of `grand.ts` and `layers.ts`.
- Effort: about 1–2 weeks with tests.
- The procedural voices (organ, EP, pluck, brushes) can move into the same worklet later.

### 4.5 Storage and offline

- The Cache API holds the compressed files. The installed PWA is exempt from Safari's 7-day eviction of script-written
  storage; a browser tab is not.
- Call `navigator.storage.persist()` after install. Show cache size per instrument in Settings.
- Offer a "download all sounds for offline" button per tier (Wi-Fi only by default).
- Keep `toneturn-samples-v1` versioned per **set** (e.g. `grand@3`), so a rebuilt set replaces itself without dropping
  the others.

### 4.6 Latency

**What to expect (end-to-end, key press to sound):**

| Platform | Typical | Notes |
|---|---|---|
| macOS Chrome/Firefox, built-in output | **~14–19 ms** with low-latency settings, ~55–67 ms at defaults ([jefftk][jefftk]) | His advice: `latencyHint: 0` instead of `'interactive'`. Measure, don't trust `outputLatency`. |
| Chrome desktop 136+ | about −10 ms vs before (adaptive buffering removed on desktop, [Chromium][cr136]) | — |
| Windows Chrome/Edge | ~20–40 ms (WASAPI shared mode) | A class-compliant USB interface or the built-in output; ASIO is not reachable from the web |
| Android Chrome | **~10 ms (Pixel-class, AAudio) to 100–300 ms (old or cheap devices)** ([9to5google][pixel], [Construct forum][construct]) | Chrome keeps adaptive buffering on Android. Wide variance. |
| iOS/iPadOS Safari | Low (often reported ~10 ms), but **Safari ignores `latencyHint`** ([WebKit 214258][wk-lh]) and **has no Web MIDI** ([caniuse][caniuse-midi]) | iPhone/iPad = on-screen keys or microphone only. The macOS "Web MIDI for Safari" extension is userland. |
| **Any Bluetooth headphones/speaker** | **150–300 ms**, under-reported by the OS | Unplayable for live MIDI. Detect a high `outputLatency` and warn. |

**In-app steps, in order of value:**

1. **Live path off React.** Keep `midi.ts → liveNote` free of state updates. Throttle UI highlights to the next
   animation frame. Long term, post note-ons straight to the sampler worklet (the `MIDIInput` handler can post to the
   worklet port with no UI work).
2. **`latencyHint`.** Try `0` or `0.005` on desktop/Android when "live play" is on.
   - Chrome then picks its minimum buffer (128-frame quantum plus device buffer).
   - Fall back to `'interactive'` if glitches are detected (an underrun counter in the worklet).
   - A context can't change its latency, so the only way to switch is to recreate it when the MIDI setting changes.
3. **Use the event timestamp for drums and fast passages.**
   - Map `e.timeStamp` (performance clock) to context time using `getOutputTimestamp()`, which is already in the code.
   - Schedule at a fixed small offset (e.g. +5 ms) after that time.
   - This turns main-thread jitter into constant latency, which players adapt to.
4. **Latency check in Settings.** Play a click; the player taps along (or the mic hears it). Show the ms figure with
   advice ("use wired headphones"). The engine already compensates scoring with `heardAt()`.
5. **Polyphony and voice stealing.** Live mode caps at 48 voices; release the quietest, oldest voice first (it does
   oldest first now). With a worklet, 64–96 voices are fine on desktop.

---

## 5. Making the band feel live

### 5.1 What the research says

- **Swing ratio falls as tempo rises, and the drummer swings more than the soloist.**
  - Friberg & Sundström (2002) measured the ride cymbal of four top jazz drummers.
  - Ratios run from about 3:1 at slow tempos to near 1:1 at fast ones.
  - Soloists **delay downbeats and sync their offbeats with the drummer** ([Music Perception 19(3)][fs2002],
    [summary][fs-sum]).
- **Soloists' late downbeats and synced offbeats are a key part of swing.** Nelias et al. (2022) showed this by
  manipulating piano recordings ([Comm. Physics][nelias]).
- **A "tight" rhythm section is not a quantised one.**
  - The hi-hat and ride sit about **2–26 ms ahead** of the pulse.
  - Listeners rate as best the asynchronies below the threshold of perception that still keep natural variability
    (Hofmann, Wesolowski & Goebl 2017, [PMC][tight]).
- **Global microtiming deviations alone don't make swing.** Datseris et al. (2019) found that deliberately shifting
  instruments did *not* raise swing ratings ([Sci Rep][datseris]). The lesson: get the swing ratio and the per-role
  offsets right, keep random jitter small, and don't "humanise" everything by a lot.

### 5.2 Timing and dynamics (to build into `band.ts` / `charts.ts`)

| Rule | Value to start with |
|---|---|
| Swing ratio vs tempo (ride and comping) | ~2.6:1 at 100 BPM → 2:1 at 160 → 1.5:1 at 220 → ~1.2:1 at 300. Soloist/comping 10–20 % straighter than the ride. |
| Per-role offset ("feel") | Ride/hat −5…−10 ms (on top); bass 0…−5 ms; snare comping +5…+15 ms (laid back); piano comping +0…+20 ms on "lazy" ballads |
| Random jitter | Gaussian, σ ≈ 3–6 ms (drums), 5–10 ms (piano), with **correlation between successive notes** (slow drift, not white noise) |
| Velocity | Accent pattern per role (ride: quarters stronger, the skip note softer; hat on 2 and 4), random σ ≈ 4–8 % |
| Phrase dynamics | 4- and 8-bar swells; the drummer builds into the turnaround; drops after a soloist's chorus ends |
| Tempo | A tiny drift is allowed in "live" mode (±1–2 BPM over a chorus); off in measured exercises, where we score timing |

**Make it switchable.** "Live feel" (default for play-along) vs "Strict grid" (exercises that score timing), so scoring
stays fair. The existing `heardAt()` compensation stays valid because offsets are known.

### 5.3 Interaction: a band that listens

The app already knows what the player plays (MIDI notes, or microphone pitch and onsets). Cheap responses that read as
"listening":

| Signal from the player | Band response |
|---|---|
| Density (notes per beat over the last bar) | High → comping thins out (fewer stabs, shorter voicings), drums go to the ride only. Low or rest → comping fills (call-and-response) and the drummer adds a fill or kick "bomb". |
| Loudness (velocity mean) | The band follows the dynamic, with a 1–2 bar lag |
| Register | Piano comps *away* from the soloist's register (comping under a high line, above a low one) |
| Rests ≥ 1 beat | Comping answer: a short rhythmic figure in the gap, never on top of the soloist |
| End of chorus (form position) | Drummer fill into the top; the bass walks up to the root |
| Repeated rhythmic motif | The drummer echoes it on the snare once (classic trading) |
| "Trade 4s" mode | The band drops out every other 4 bars; the drummer "solos" with a fill pattern |

Academic systems (for example the NTU ICYS jazz accompaniment thesis, and comping-voicing work at ICMC/SMC 2014,
[proceedings][icmc14]) use phrase prediction or learned models. For our needs, rules on density, register and rests are
enough and fully deterministic, which suits tests.

### 5.4 Mix and room

| Element | Setting |
|---|---|
| Stereo stage (audience view, jazz trio) | Drums centre (overheads ±30 %, ride right, hat left); bass centre-left or centre; piano left-centre (low keys a little left, high a little right inside ±25 %); guitar right; horns right-centre |
| One shared room | All band instruments → one convolver send (club or studio IR, 0.8–1.2 s), per-instrument send level (drums low, piano medium, horns more); a short early-reflections IR on bass and kick only |
| The player's instrument | Same room, but a little drier and louder (they are "close"), so they hear themselves over the band |
| Bus | Gentle glue compressor on the band bus (2:1, slow attack); a high-pass on reverb returns (<150 Hz) so the bass stays clear |
| Ducking | The band bus dips 1–2 dB while the player plays (sidechain from the live bus): it sounds like the band "listening" and keeps the player audible on phone speakers |
| Phone speakers | A "small speaker" EQ profile when no headphones are detected or chosen: lift 150–300 Hz, harmonic exciter on the bass so the walking line is audible |

---

## 6. Recommendation: plan by phase

### Size budgets per tier

The tiers:

- **Lite**: Data Saver on, or under 4 GB RAM, or older iOS. Note: the iOS tier must default to **Standard or Lite**,
  since its RAM can't be detected.
- **Standard**: phones by default.
- **Studio**: desktop, opt-in on phones.

The figures below are estimates scaled from the measured sets in §1.3. Re-measure them after each build.

| Instrument | Lite (download / RAM) | Standard | Studio (desktop) |
|---|---|---|---|
| Grand piano | 4 layers, 32 kHz, 4 s tails: **~5 MB / ~60 MB** | 6 layers, 32 kHz, 6 s: **~12 MB / ~120 MB** (Int16 worklet: 60 MB) | 10–16 layers, 48 kHz, full tails: 30–46 MB / 0.5–1.3 GB (Int16: half) |
| Upright piano (KW, CC0) | 3 MB / 20 MB | 6 MB / 35 MB | — |
| EP (modelled tine; Wurlitzer) | 0 / 0 (model); Wurli 1 MB / 25 MB | same | + licensed/own Rhodes later: 10 MB / 100 MB |
| Organ | model, 0 | model | model |
| Upright bass | 3 dyn × 2 RR mono: 1 MB / 30 MB | 3 dyn × 4 RR: 2 MB / 68 MB | + Meatbass slides/ghosts: 5 MB / 120 MB |
| Electric bass | FreePats YR: 1 MB / 15 MB | Growlybass subset: 3 MB / 40 MB | fuller: 6 MB / 80 MB |
| Jazz kit (sticks) | mono, 2 RR, 3 dyn: 2 MB / 40 MB | current set: 5.6 MB / 120 MB (60 MB at 32 kHz) | + close-mic ride/bell: 9 MB / 180 MB |
| Brushes | modelled | modelled + Swirly snare sweeps/taps: +1 MB / +20 MB | same |
| Rock kit | current one-shots | Naked Drums subset (4 RR): 4 MB / 80 MB | 8 RR: 8 MB / 160 MB |
| Guitar | Karplus–Strong / FreePats Jazz small 2.4 MB | Shinyguitar subset: 4 MB / 60 MB | fuller |
| Horns (optional) | — | MTG Solo Sax tenor/alto subset: 3 MB / 50 MB | section |
| **Total decoded in one session** (only the instruments of the current chart) | **≤ 150 MB** | **≤ 300 MB** | ≤ 1 GB |

Rule: **load only what the current exercise or chart uses**, and unload the rest between screens. A bossa chart needs
nylon guitar, bass and brushes. It doesn't need the grand's 16 layers and the rock kit.

### Phase 0: memory safety (first; ~2–3 days; no new content)

1. **Tiers.**
   - Add Lite / Standard / Studio, with `auto` = Lite on Data Saver or `deviceMemory ≤ 4`, **Standard on all iOS**,
     Studio on desktop.
   - Rebuild the grand per tier in `build-grand.py`: a layer subset, a tail cap, 32 kHz output for Lite/Standard.
2. **Load per chart and unload between screens.** Don't preload the jazz kit and pizz bass at unlock on Lite.
3. **A decoded-memory meter in debug.** Sum `length × channels × 4` over the loaded buffers; refuse to load past the
   tier budget (use the nearest layer instead, which already exists as `nearestLoaded`).
4. **Re-check that in-app credits are visible** for CC BY sets (Salamander, Wurlitzer, and every later CC BY set).

### Phase 1: live-play latency and feel (~1 week)

1. Live MIDI path without React work. Experiment with `latencyHint: 0` behind a setting, with an underrun detector and
   fallback.
2. Use MIDI timestamps for drums (constant latency, not jitter).
3. Settings → **latency check** (tap test), plus a Bluetooth warning.
4. A velocity-tracked low-pass per piano voice, and micro-detune variation (round-robin substitute).

### Phase 2: the free band upgrade (~2 weeks of build scripts, auditions and tests)

Audition first, then build each with a `build-band.py` step (download → LICENSE copy → trim → layer/RR map → encode).

| Priority | Instrument | Library (licence) | Notes |
|---|---|---|---|
| 1 | Electric bass | **Growlybass** (CC0); FreePats YR (CC0) for Lite | funk/pop/fusion styles currently borrow the upright |
| 2 | Jazz guitar comping | **Shinyguitar** (CC0) or **FreePats Clean #2 Jazz** (CC0) | replaces Karplus–Strong in the band; keep K–S for Lite |
| 3 | Nylon guitar (bossa) | FreePats Spanish classical (CC0), *if it passes audition* | otherwise keep K–S with a nylon body filter |
| 4 | Soft upright bass | **Sneakybass** (CC0) as an extra pp layer; **Meatbass** (CC0) for slides/ghosts | ballads and brushes |
| 5 | Brushes | **Swirly Drums** (CC0) snare sweeps/taps, blended with the model | A/B against the current model |
| 6 | Rock/pop kit | **Naked Drums** (CC BY 4.0) subset, 4 RR | replaces the single one-shot kits |
| 7 | Second piano | **Upright Piano KW** (CC0) | warm, tiny; "practice room" sound and the Lite default |
| 8 | Room | 2–3 **OpenAIR** IRs (CC BY, check each) + the procedural fallback | one shared band reverb |
| 9 | Horns (optional) | **MTG Solo Sax** (CC BY 4.0) for pads and backgrounds only | not for solo lines |

### Phase 3: "live session" band behaviour (~1–2 weeks, mostly `band.ts` and `charts.ts`)

- Swing-ratio-by-tempo curve.
- Per-role offsets.
- Correlated jitter.
- Phrase dynamics.
- A "Live feel / Strict grid" switch.
- Interaction rules (density, register, rests, trading 4s) from §5.3.
- Stereo stage, band bus glue, ducking.

### Phase 4: engine investment (~2 weeks)

- An AudioWorklet sampler with Int16 PCM: half the memory, off the main thread, its own voice stealing.
- Optionally Opus assets with an MP3 fallback (about 30 % smaller downloads).
- Optionally SpessaSynth (Apache-2.0) as an SF3 container. Only if it clearly saves work; our own worklet is simpler to
  tune.

### Phase 5: licence or record what free can't cover (owner decision)

| Gap | Options, in suggested order |
|---|---|
| **Rhodes Mark I** | (a) **record our own** (1 studio day; we own it); (b) a licence from a small developer; (c) keep improving the modelled tine EP |
| **Jazz grand with character** (Steinway B/D) | (a) **ask Ivy Audio** for written permission for a trimmed Piano in 162 web subset; (b) contact **Modartt** about a partnership (no web SDK exists; expect a long, uncertain route); (c) record our own (option 4) |
| **Bop drum kit with brushes and a dark ride** | (a) record our own brushes and ride (1 day with a jazz drummer); (b) ask the **AVL Blonde Bop** authors for a non-SA licence; (c) a BFD/Toontrack OEM (expensive, slow) |
| **Commercial guitars and basses** | **Karoryfer** commercial titles. Most likely to agree, and they already work in SFZ, which our scripts read. |
| **Jazz horns** | **VGTrumpet** SFZ range (small developer) |

When asking a licensor, offer what the web can do:

- only trimmed, lossy subsets;
- files encrypted at rest and decrypted in the worklet;
- no stand-alone export;
- credits in the app.

That is what they will ask about.

---

## Sources

[sfz-pianos]: https://sfzinstruments.github.io/pianos
[in162]: https://sfzinstruments.github.io/pianos/in_162
[jr3d]: https://sfzinstruments.github.io/pianos/jrhodes3d
[sfz-drums]: https://sfzinstruments.github.io/drums
[sfz-strings]: https://sfzinstruments.github.io/strings
[sfz-basses]: https://sfzinstruments.github.io/basses
[sfz-gtr]: https://sfzinstruments.github.io/guitars
[sfz-ww]: https://sfzinstruments.github.io/woodwinds
[fp-piano]: https://freepats.zenvoid.org/Piano/acoustic-grand-piano.html
[fp-agtr]: https://freepats.zenvoid.org/Guitar/acoustic-guitar.html
[fp-egtr]: https://freepats.zenvoid.org/ElectricGuitar/clean-electric-guitar.html
[fp-bass]: https://freepats.zenvoid.org/ElectricGuitar/clean-electric-bass.html
[fp-drums]: https://freepats.zenvoid.org/Percussion/acoustic-drum-kit.html
[meat]: https://www.kvraudio.com/news/karoryfer-releases-free-meatbass---double-bass-sample-library-29343
[virt]: https://versilian-studios.com/virtuosity-drums/
[iowa]: https://theremin.music.uiowa.edu/MIS.html
[openair]: https://www.openair.hosted.york.ac.uk/?page_id=2
[voxengo]: https://www.voxengo.com/impulses/
[spit]: https://support.spitfireaudio.com/en/articles/11815239-are-spitfire-audio-sample-libraries-royalty-free-and-can-i-use-them-on-commercial-recordings
[ni]: https://www.native-instruments.com/zh/company/legal-information/terms-of-service/
[modartt]: https://kvraudio.com/marketplace/modartt
[sonivox]: https://sonivoxmi.com/about-us.html
[ys]: https://support.yousician.com/hc/en-us/articles/46277319890449-Piano-sound-recognition-issues
[sfizz-web]: https://github.com/sfztools/sfizz-webaudio
[spessa]: https://github.com/spessasus/spessasynth_core
[waf]: https://github.com/surikov/webaudiofont
[moz-mp3]: https://bugzilla.mozilla.org/show_bug.cgi?id=1566389
[moz-aac]: https://bugzilla.mozilla.org/show_bug.cgi?id=1669166
[wk-opus]: https://bugs.webkit.org/show_bug.cgi?id=238546
[wk-opus2]: https://bugs.webkit.org/show_bug.cgi?id=327697
[ram]: https://www.catchmetrics.io/blog/deep-dive-ram-internals-webkit
[bab]: https://forum.babylonjs.com/t/large-audio-arraybuffers-crashing-ios-safari/35576
[jefftk]: https://www.jefftk.com/p/browser-audio-latency
[cr136]: https://groups.google.com/a/chromium.org/g/fugu-dev/c/AavLqm3hk0Y
[pixel]: https://9to5google.com/2021/03/05/google-android-audio-latency/
[construct]: https://www.construct.net/en/forum/construct-3/general-discussion-7/big-sound-lag-android-148079/page-4
[wk-lh]: https://bugs.webkit.org/show_bug.cgi?id=214258
[caniuse-midi]: https://caniuse.com/midi
[fs2002]: https://jazztheory.ssac.carleton.ca/view.php?id=198
[fs-sum]: https://acoustics.org/pressroom/httpdocs/137th/friberg.html
[nelias]: https://www.nature.com/articles/s42005-022-00995-z
[tight]: https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5706983/
[datseris]: https://pmc.ncbi.nlm.nih.gov/articles/PMC6934603
[icmc14]: https://repositorio.ipcb.pt/bitstream/10400.11/4691/1/2014%20ICMC_SMC_2014_Proceedings.pdf

**Libraries and catalogues:**

- [sfzinstruments: pianos][sfz-pianos], [drums][sfz-drums], [strings][sfz-strings], [basses][sfz-basses],
  [guitars][sfz-gtr], [woodwinds][sfz-ww]
- [Piano in 162][in162]
- [jRhodes3d][jr3d]
- FreePats: [pianos][fp-piano], [nylon guitar][fp-agtr], [electric guitars][fp-egtr], [electric bass][fp-bass],
  [drums][fp-drums]
- [Meatbass (KVR)][meat]
- [Virtuosity Drums][virt]
- [Iowa MIS][iowa]
- [VCSL](https://github.com/sgossner/VCSL)
- [VSCO-2 CE](https://versilian-studios.com/vsco-community/)
- [Karoryfer 2023 open-sourcing (KVR)](https://www.kvraudio.com/news-print.php?id=57708)
- [AVL Blonde Bop](https://www.bandshed.net/2023/02/19/avl-drumkits-new-blonde-bop-kits-released/)

**Impulse responses:** [OpenAIR][openair], [Voxengo][voxengo].

**Commercial licensing:**

- [Spitfire FAQ][spit]
- [Native Instruments ToS][ni]
- [Modartt on KVR][modartt]
- [Modartt FAQ](https://www.modartt.com/faq)
- [SONiVOX][sonivox]
- [Yousician support][ys]

**Browser technology:**

- [sfizz-webaudio][sfizz-web]
- [SpessaSynth core][spessa]
- [spessasynth_lib](https://github.com/spessasus/spessasynth_lib)
- [WebAudioFont][waf]
- [Tone.js Sampler](https://tonejs.github.io/docs/14.5.3/Sampler)
- [Mozilla MP3 trim][moz-mp3]
- [Mozilla AAC trim][moz-aac]
- [WebKit Opus][wk-opus]
- [WebKit Opus/MP4 2026][wk-opus2]
- [WebKit RAM][ram]
- [Babylon iOS crash][bab]
- [jefftk latency][jefftk]
- [Chrome 136 latency][cr136]
- [Pixel latency][pixel]
- [Construct Android lag][construct]
- [WebKit latencyHint][wk-lh]
- [caniuse Web MIDI][caniuse-midi]
- [web.dev: audio output latency](https://web.dev/articles/audio-output-latency)
- [A tale of two clocks](https://web.dev/articles/audio-scheduling)

**Timing research:**

- [Friberg & Sundström 2002][fs2002] ([ASA summary][fs-sum])
- [Nelias et al. 2022][nelias]
- [Hofmann et al. 2017][tight]
- [Datseris et al. 2019][datseris]
- [Honing & de Haas 2008](https://mcg.uva.nl/mcg-2023/papers/honing-haas-2008.pdf)
- [ICMC/SMC 2014 comping][icmc14]

---

## 7. Built: Phase 0 (memory safety) and Phase 1 (live-play latency), 2026-11-11

### 7.1 Tiers (`src/audio/quality.ts`)

| | Lite | Standard | Studio |
|---|---|---|---|
| Automatic picks it for | Data Saver / 2g–3g, `deviceMemory` < 4, ≤ 2 cores, iOS ≤ 15 | **every iPhone and iPad** (UA, plus "Macintosh + touch" for iPad desktop mode), Android, 4 GB computers | computers (Mac Safari, which hides `deviceMemory`, too) |
| Grand layers | 4 (v03, v08, v11, v14), **mono** | 5 (v03, v07, v10, v12, v15), stereo | all 16, stereo |
| Grand tail | 4 s, equal-power fade | 6 s | full |
| Release resonance | off (release noise and pedal kept, mono) | on, mono | on, stereo |
| Band (jazz kit, pizz bass) | mono, 2.5 s cap; loaded per screen | mono kit, 3.5 s cap; loaded per screen | as before; preloaded 1.5 s after unlock |
| Decode rate | 32 kHz | 32 kHz | the context's rate (48 kHz), as before |
| Budget (decoded) | 150 MB | 300 MB | 1,600 MB (the 16-layer grand alone is 1.23 GB) |
| Idle sets let go after | 2 min | 4 min | 20 min |

- **Settings → Sound → Sound quality**: Automatic (shows which tier) / Lite / Standard / Studio, one line on what each
  keeps, a warning for Studio on an iPhone, and "in memory now: X of Y MB · piano layers ready". It replaces the 0.54
  "Grand piano detail" card; a stored `pianoDetail` maps onto it (full → Studio, light → Standard).
- **Loading per screen.** `piano.setScene({ band })` from App: charts, improv, grooves, metronome, mixer, slowdown,
  perform, highway, drills, workout run, and the drums and bass courses. Elsewhere the band isn't loaded (Lite/Standard)
  and idles out. Lessons with a drum item still load the kit lazily on its first hit (synth stand-ins for that hit).
- **Unloading.** A `MemoryLedger` counts `length × channels × 4` per set and when each was last played. Every 30 s, sets
  not played for the tier's idle time are let go, except the pinned ones: the chosen sound's sets, the drone, the
  tiny one-shots, and what the screen asked for. Past the budget, unpinned sets that haven't played in 15 s are let go
  first; a set that still doesn't fit is refused and the nearest loaded layer (or the synth) stands in. The chosen
  sound always loads.
- **The old 23-note grand** (115 MB at 48 kHz) is let go as soon as the first velocity layer is in. After that it can
  never play, so Studio sounds exactly as before.
- **Diagnostics → "Sound: memory and latency"**: the tier, decode rate, total / budget / peak, every set with its size and
  idle time, and a load log (loaded / released / refused, with the reason). Dev builds also log each event to the
  console and expose the engine as `window.__sound`.
- **Bug found while measuring:** `setBandDrums('jazz')` runs at start-up before there is an AudioContext. `loadStems`
  then cached a resolved `false`, so **the recorded jazz kit never loaded in a fresh session** (stand-ins played) unless
  the drums were re-chosen in Settings. Fixed: with no context, nothing is cached.
- Credits for the CC BY sets (Salamander, Wurlitzer) are visible in Settings → Sound (checked, P0-4).

### 7.2 Measured decoded memory (Chromium, the real engine)

Measured in a dev build at a 48 kHz context: grand chosen and all of the tier's layers loaded, then a band screen opened.

| | Grand + release sounds | + band (kit + pizz bass) | Before 0.69 |
|---|---|---|---|
| Lite | 66 MB | **134 MB** | — |
| Standard | 206 MB | **286 MB** | — |
| Studio | 1,276 MB | **1,462 MB** | **1,577 MB** (plus the old grand's 115 MB). Every iPhone got this. |

Load time for the tier's grand from the local server: Lite ~8 s, Standard ~9–26 s, Studio ~26 s (cold).

### 7.3 Live play (Phase 1)

- **The sound comes first.** `midi.onNote / onCC / onHit(cb, { first: true })`: the app's sound is called before any
  screen's listener. The on-screen key highlight for live notes moves to the next animation frame (`emitSoon`), so no
  React work sits between key and sound.
- **The MIDI timestamp.** Live keys start 4 ms after the event's `timeStamp`, and e-kit hits 6 ms after
  (`liveStart`). Main-thread jitter becomes a constant delay. A stale or foreign timestamp (> 40 ms, negative)
  plays at once, as before.
- **Settings → MIDI → Live play latency**: Normal (`'interactive'`) or Low (`latencyHint: 0`). It applies after a
  reload, with a Reload button. On iOS the hint says it has no effect there (Safari ignores it). There is no underrun
  detector yet; that needs the worklet sampler (Phase 4).
- **Bluetooth warning** in MIDI settings and Diagnostics. It shows when `baseLatency + outputLatency` ≥ 150 ms, or when
  the output device's name looks wireless (AirPods, Buds, WH-1000, "Bluetooth", …; names need the mic permission).
- **Diagnostics latency test**: 10 clicks at 60 bpm; tap or press a MIDI key on each. The taps are compared with when
  the click was *scheduled*, so the figure is the whole loop a live player feels, which catches the Bluetooth delay
  the OS hides. It also shows how much of that the browser reports for output.
- **iOS**: the MIDI panel says up front that iPhone/iPad have no browser with Web MIDI.

### 7.4 Not verified

- **A real iPhone/iPad**: the iOS detection (UA strings in tests only), 32 kHz `OfflineAudioContext` decode on Safari
  (falls back to the context rate if the constructor throws), and whether Standard's ~290 MB is safe on 3–4 GB
  iPhones. Lite is ~135 MB if not.
- `latencyHint: 0` on real Windows / Android hardware (glitches?), and the Bluetooth heuristics on real devices.
- Not done: the velocity-tracked low-pass and micro-detune (Phase 1 item 4, a sound change, left for Phase 2 auditions);
  `build-grand.py` per-tier files (the tiers are applied at decode time instead, with no new downloads).
