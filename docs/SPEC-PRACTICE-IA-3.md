# The Practice page, reorganised (draft for the owner, 2026-11-22)

**What the owner asked:** the Practice page and its menu have become crowded and confusing. Repertoire and Charts & lead sheets should be one place, with all the repertoire inside it and importing a lead sheet as one option. Games is clearly separate. Improvise could perhaps also be reached from outside, but basically everything belongs inside Practice. Everything else is to be specified from scratch.

**Inventory of what exists:** taken 2026-11-22 from the code (Arcade.tsx, courseRows.ts, App.tsx, each tile's screen). Summary in §1. Nothing listed there may be lost.

## 1. What is there today, and what overlaps

**Rows on the keys page, with the jazz pack open (11 entries):**
- Technique, Licks (library / mine / challenges), Charts & lead sheets, Improvise, Repertoire;
- folded under "More practice": My pieces, Transcribe, My song;
- Games;
- a strip of 9 tools.

**Overlaps found:**
1. **One list of 45 standards, three entry points.** Charts (by group), Repertoire (tiers 3–4, plus Ear's jazz standards) and Improvise → Rules. All three end in the same chart player.
2. **Play-along over the band appears six times:**
   - Charts;
   - Repertoire's "chart" way (which opens Charts);
   - Improvise Phrase / Trade (with its own band);
   - Licks "use it";
   - the transcription coach;
   - My song (over your own recording).
3. **Improv levels and rule challenges live in both Charts and Improvise.** Improvise → Rules only picks a chart and hands off to Charts.
4. **Piano comping on a standard:** Charts "practise at the piano" and Repertoire `chartDrill` run the same drills.
5. **Three imports, each with a different job:**
   - Charts: lead sheets (MusicXML, mxl, iReal, ChordPro, text);
   - Pieces: scores (MusicXML, MIDI) for the note-by-note coach;
   - My song: an audio file.
6. **Songbook, Repertoire and Pieces:** the songbook (47 songs) is reached from Repertoire and links to Pieces. The public-domain classics are in both Pieces and the technique family k-classic.
7. **Transcription appears three times:**
   - the coach (`#/transcribe-coach`);
   - My song in the Ear course;
   - the Transcription Race game (`#/transcribe`).

   The tile id `transcribe` opens the coach, while the workout's `transcribe` opens the race.
8. **Results are scattered:**
   - Repertoire writes lesson results;
   - Charts writes improv ratings plus best scores;
   - Pieces writes practice-log minutes;
   - My song writes a completion;
   - **Improvise Phrase / Vary / Trade record nothing.**

**Gaps found:**
- **Charts and Improvise have no tile when the jazz pack is closed.** A pop or classical player cannot import a lead sheet or play a chart with a band.
- **No workout block opens Repertoire, Charts, Improvise, My song or the transcription coach.**
- **Pieces' Back always goes to the songbook,** even when it was opened from Practice.

## 2. The new Practice page: four places, games, tools

| Place | Holds | Replaces |
|---|---|---|
| **Technique** | by key and by topic, today's key workout (the matrix), the approach licks, language in the key; the level test | Technique |
| **Licks** | Library · Mine (Encore) · Challenges · **Transcribe** (a way to add a lick: hear, play back, write, 12 keys) | Licks, the transcription coach |
| **Repertoire** | **everything played as a piece:** standards, songs (the songbook), classical pieces, my charts, my recordings; one page per piece; "Add a piece" | Repertoire, Charts & lead sheets, My pieces, My song, Ear's jazz standards |
| **Improvise** | the rule cards and rotating scales (SPEC-RBI-ROTATION), improv levels, phrasing, vary, trading fours, use a lick | Improvise, plus Charts' improv levels and challenges |
| Games | as today | |
| Tools | a strip of small icons, not tiles: tuner, metronome, drone, groove, slow down, mixer, chord finder / builder | the strip, minus the log (it moves to Progress, beside the practice diary) |

- **All four places show in every course** that plays, with its own content. Drums: Technique, Repertoire (grooves and songs), Games. Charts and Improvise are no longer jazz-only: the jazz pack changes the *content* (standards, jazz levels), not whether the place exists.
- **The Ear course:** Lessons, Repertoire (by ear), Puzzle, Games. In exam prep, Exams first.
- **The sidebar:** Practice gets children again, the four places plus Games. The tools stay in their own group.

## 3. Repertoire: one place for every piece

**The list:**
- Tabs by course: for keys, Foundations · Blues & progressions · Standards · Advanced, plus **Mine** (everything I added).
- Search, a filter by style, and the next-goal card (as today).
- Each piece: name, style, what it teaches, status (✓ / % / new).

**"Add a piece", one button with four sources:**

| Source | Formats | What it becomes |
|---|---|---|
| Lead sheet | MusicXML / mxl / iReal Pro / ChordPro / text / type the chords | a chart (chords plus melody, if it came with one) |
| Score | MusicXML / mxl / MIDI | a piece for the note-by-note coach |
| My recording | an audio file (up to 10 minutes) | a "My song" piece: beat, chords, melody and bass analysed |
| Type it | chord symbols separated by `\|` | a chart |

**The piece page** shows what can be done with this piece, depending on what it has:

| Action | When | Engine (exists) |
|---|---|---|
| **Play with the band** (style, tempo, key, loop A–B) | any chart | ChartPlayer |
| **Learn the melody** | it has a melody | the songbook drill / the melody head |
| **Comp it** (voicings, rhythm, stride; walking on bass; comping on guitar) | a chart | chartDrills, bassStd, guitarStd |
| **Improvise on it** (opens Improvise with this chart) | a chart | improv / rules |
| **Learn it from the score** (chunks, tempo ladder) | a score | the piece coach |
| **Play along with the recording / transcribe a phrase** | my recording | My song |
| **Memorise** (Siskind's steps) and the three lists | any | as today |
| **Listen to the original** (Spotify / YouTube) | standards | ListenOriginal |
| **Practise it in the technique hub** (that piece's keys and voicings into the key session) | a chart | §6 of SPEC-DAILY-WORKOUT |

**Legal line:** as today, one of public-domain melody / chords only / our own material. Uploads stay on the device only.

## 4. Improvise: its own place, and a button on every piece

- **Owner question 4:** a place of its own *and* "Improvise" on every piece page? My recommendation is both: it takes 25–30% of the daily workout, so it has to be easy to find.
- **Inside:**
  - levels (the 14 from a vamp to Coltrane);
  - rules (cards plus rotating scales);
  - phrasing, vary, trading fours, use a lick;
  - the chart source: improv levels, the standards, my charts, the key of the day.
- **Phrase / Vary / Trade will record results:** a rating event plus XP. Today they record nothing, which breaks "everything connects".

## 5. What must keep working (ids, data, links)

**Ids that keep their names:**
- `rep-<course>-<item>` and `rep:<course>:<item>` (path, quests, badges, the Today card);
- `myCharts`, `improvBest`, `challengeBest`;
- IndexedDB `toneturn-pieces` and `toneturn-mysongs`;
- the workout's `pieces` block, `licks` / `encore` review;
- quick-lesson gates `game:mysong`, `game:mysong-ear`, `game:licks`, `game:transcribe`;
- teacher assignments `chart` / `rules:`.

**Old routes redirect:**

| Old route | Goes to |
|---|---|
| `#/charts` | Repertoire › Mine, or the piece |
| `#/pieces` | Repertoire › Mine (scores) |
| `#/mysong` | Repertoire › Mine (recordings) |
| `#/songs` | Repertoire › Foundations |
| `#/transcribe-coach` | Licks › Transcribe |

The game `#/transcribe` stays the race.

**Fixes:** Pieces' Back returns to where it was opened from. The command palette is updated.

**Workout:** new blocks open Repertoire (a piece due for review, or the classical share) and Improvise (the improv share), per SPEC-DAILY-WORKOUT §4.

## 6. Order of work

1. Repertoire merged: the list with Mine, Add a piece, the piece page (reusing the engines), the redirects. Charts and Improvise no longer jazz-only.
2. Transcribe into Licks; the tools strip and the log to Progress; the sidebar with children.
3. Improvise as a place: Phrase / Vary / Trade record results; the rule-based improv with rotating scales comes into it (SPEC-RBI-ROTATION).
4. Workout blocks for Repertoire and Improvise.
5. Guard tests (every old route lands, every id is kept), the e2e for each place on one phone screen, Hebrew and English.

## 7. Questions for the owner

1. **Licks:** keep it as one of the four places (as decided with Encore), or a "Language" section inside Technique (one entry fewer)?
2. **Transcribe:** inside Licks, as a way to add a lick?
3. **My song and My pieces:** inside Repertoire, as a piece's page and as sources in "Add a piece"?
4. **Improvise:** a place of its own *and* a button on every piece, or only inside Repertoire?
