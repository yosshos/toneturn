# Round 14: independent content and pedagogy review

**Verdict: NOT CLEAN** (one major legal-rule gap. The pedagogy is otherwise complete and buildable.)

## What I checked
- HOLISTIC v12 §0, §1.2, §1.10, §2–§17, and the binding §19–§21.
- SP Part II §13–§17, §21 and §22.
- The AP top-15 and its §3–§4 cross-cutting aspects. Every one maps to a section.
- Legal facts I checked against STANDARDS_LEGAL and my own knowledge:
  - US cut-offs: compositions ≤ 1930, recordings ≤ 1925.
  - Death years of the authors of all 17 named 1A beginner and core heads. All died ≤ 1955, the latest being J. P. Johnson, Nov 1955.
  - Other death years: Razaf 1973, Brooks 1970, Handy 1958, Pixinguinha 1973, Nazareth 1934, Gonzaga 1935, Baby Dodds 1959, Armstrong 1971.
  - Long terms: Spain life+80 (before 1987), Mexico 100, Côte d'Ivoire 99, Colombia 80, and the life+75 group.
  - The five contrafact pairs. Scrapple: A sections from Honeysuckle Rose, bridge from Rhythm. Of the PD sides, only Indiana is 1A.
  - The EU's joint term for songs with words.
- Against project rules:
  - no movable do (the §16 syllable rule);
  - no Claude-composed music (the lick-bank soloist plays licks as they are, a functional match or silence; rubato and model curves come from human takes only);
  - no locks (steps are skipped, never locked; the tune gate is a suggestion);
  - hands-free (the exceptions are named);
  - one screen;
  - only verified Harris theory (no unverified Harris content in these sections).

  I found no conflicts.

## Substantive issues

### 1. §8.1 recording test (c), and §8.10 phrase source flags: the test misses non-improvised unpublished authorship (major, legal)
- **The problem:** test (c) checks only that "every improvising ensemble member died ≤ 1955". Test (b) checks only compositions "published or registered ≤ 1930".
  - Under §303(b), selling a pre-1978 record did not publish anything embodied in it. That covers a written band arrangement as well as an improvisation.
  - Unpublished material keeps life+70 (PD-JAZZ-SOURCES §1.3/§3 states the principle, but only for solos).
  - So a ≤ 1925 band side can pass (a)–(c) and still carry a protected work. Two ways:
    - an unpublished stock or house arrangement by an arranger who did not play on the date and died after 1955;
    - an original tune that was never published or registered, by a non-improvising author.
- **Why it matters:**
  - `servable(recording)` is "the only path to playback". A builder will code exactly (a)–(c).
  - §8.10 reuses the same test for user phrase flags.
  - Today's canon candidates (Morton and J. P. Johnson solo piano) are safe, because the player is also the author. The generic rule is not. It is the gate for every later listening-lab or 78-transfer addition.
- **Fix:** replace (b)+(c) with one rule: every author of every work embodied in the recording, whether a composition, an arrangement or an improvisation, either
  - (i) published or registered it ≤ 1930, or
  - (ii) if it is unpublished, died ≤ 1955.

  In long-term countries, `pdFrom` uses the latest of those death years. Add a guard-test case: a 1924 band side whose arranger died in 1964 is never servable.

## Minor notes (optional)
- **§8.4 step 8, "a new key at sight":** this step feeds line/harmony rank as a transfer form. The spec does not say whether the transposed score is shown.
  - If shown, the step is reading a melody the learner has already memorised.
  - If hidden, it is transposition by ear and memory.
  - Suggest one line stating which. The pedagogically stronger choice is chart and melody hidden, as in step 7, with only the new tonic given.
- **§8.2 Ain't Misbehavin':** the 1B note cites Brooks (1970). Under the §19 latest-author rule the governing year is Razaf (1973). The tier does not change. Only the cited year and the `pdFrom` value do.
- **Traditional items ("When the Saints", spirituals):**
  - §8.1 says "content served is the ≤ 1930 print's only", and H2 requires checking against period sheet music.
  - There may be no ≤ 1930 print of the familiar "Saints" melody (STYLE-NEW-ORLEANS: origin unclear, the earliest record is 1923).
  - Say what counts as the verification source for a traditional tune with no period print. For example, a hymnal or jubilee print, or a transcription from a recording that passes the §8.1 test. Otherwise the builder has no allowed source for a head listed as "beginner".
