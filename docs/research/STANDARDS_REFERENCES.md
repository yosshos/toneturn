# Reference recordings for the standards (0.69.2)

*Owner request 2026-11-11: every standard the app practises gets a "Listen to the original" row that links out to one or
two leading recordings on Spotify and YouTube, ideally in the app's default practice key. Data: `src/content/references.ts`.
UI: `src/ui/ListenOriginal.tsx`. Tests: `tests/references.test.ts`.*

## Legal position

Linking to a recording on Spotify or YouTube is a plain hyperlink to the rights holder's own platform. We do not copy,
embed, stream or play any of their audio, so this adds nothing to the chord-only position in `STANDARDS_LEGAL.md` and
`MUSIC_SOURCES_LEGAL.md`. Titles and artist names identify the work, and we imply no endorsement. The two icons are
generic line marks in the app's own style, not the Spotify or YouTube logos.

## Links

Every link is a **search deep-link**: `https://open.spotify.com/search/<"title artist">` and
`https://www.youtube.com/results?search_query=<"title artist">`. We could not open Spotify or YouTube to confirm exact
track or video IDs from here, and exact IDs break when a catalogue changes (region locks, reissues, takedowns). A search
for "title + artist" puts the canonical track at or near the top on both services, and it opens the native app on phones.
If the owner wants exact URLs later, replace the `spotify` / `youtube` field of a recording. The test accepts
`open.spotify.com/track|album/...` and `youtube.com/watch` / `youtu.be` too.

## Confidence scale for keys

- **verified**: the concert key comes from a transcription database entry for that exact recording (Weimar Jazz Database,
  allsolos.com), or from two independent sources.
- **likely**: the key comes from one source, or it is the tune's standard and original key and nothing points elsewhere.
- **uncertain**: no source names the key of this recording. The UI adds "(?)".

## Decisions on the practice key

Progress and item ids stay exactly as they were. **No default key changed.** Bass walking levels are measured in the
tune's key, and the piano levels play the chart as written (key offset 0). Where the reference differs, the row shows a
one-line note. On the Charts player, which can transpose, it also shows a "Practise in X" button that transposes the
chart (and an imported head) by the shortest step.

| Tune | App key | Reference key | Decision |
|---|---|---|---|
| There Will Never Be Another You | E♭ | F (Chet Baker, 1954) | Keep E♭ (lead-sheet key, bass level measured in E♭). Note + "Practise in F" on Charts |
| The Girl from Ipanema | F | D♭ (Getz/Gilberto, 1964) | Keep F (the US fake-book key). Note + "Practise in D♭" |
| Blues waltz in F | F | G (All Blues, 1959) | A practice form. All Blues is the closest famous blues waltz, so the note says it is a related form |

## Table

| id (standards.ts) | Searched tune | Recording (artist, album, year) | Key | Confidence | Sources |
|---|---|---|---|---|---|
| blues-f | Billie's Bounce *(form example)* | Charlie Parker, Savoy 78, 1945 | F | verified | [Weimar JDB solo 52](https://jazzomat.hfm-weimar.de/dbformat/synopsis/solo52.html) |
| blues-f | Now's the Time *(form example)* | Charlie Parker, Savoy 78, 1945 | F | likely | standard key of the tune |
| blues-bb | Tenor Madness *(form example)* | Sonny Rollins, *Tenor Madness*, 1956 | B♭ | verified | [Weimar JDB solo 387](https://jazzomat.hfm-weimar.de/dbformat/synopsis/solo387.html) |
| blues-bb | Blue Monk *(form example)* | Thelonious Monk, *Thelonious Monk Trio*, 1954 | B♭ | likely | standard key of the tune |
| minor-blues | Mr. P.C. *(form example)* | John Coltrane, *Giant Steps*, 1959 | C minor | verified | [Weimar JDB solo 226](https://jazzomat.hfm-weimar.de/dbformat/synopsis/solo226.html) |
| bird-blues | Blues for Alice | Charlie Parker, *Swedish Schnapps*, 1951 | F | verified | [Weimar JDB solo 53](https://jazzomat.hfm-weimar.de/dbformat/synopsis/solo53.html) |
| blues-waltz | All Blues *(related form)* | Miles Davis, *Kind of Blue*, 1959 | G | verified | common knowledge, every *Kind of Blue* reference (G mixolydian 6/8 blues) |
| rhythm-full / rhythm-a / rhythm-bridge | Oleo *(form example)* | Miles Davis Quintet, *Relaxin'*, 1956 | B♭ | verified | [Weimar JDB solo 320](https://jazzomat.hfm-weimar.de/dbformat/synopsis/solo320.html) |
| autumn | Autumn Leaves | Cannonball Adderley, *Somethin' Else*, 1958 | G minor | verified | [jazzguitarlessons.net](https://learn.jazzguitarlessons.net/blog/autumn-leaves), [allsolos](https://www.allsolos.com/recording/138/autumn-leaves), [JazzStandards.com](https://www.jazzstandards.com/compositions-0/autumnleaves.htm) (recommended recordings) |
| fly | Fly Me to the Moon | Frank Sinatra & Count Basie, *It Might as Well Be Swing*, 1964 | C (A minor opening) | likely | [learnjazzstandards](https://learnjazzstandards.com/blog/fly-me-to-the-moon-chords) (one source) |
| a-train | Take the A Train | Duke Ellington Orchestra, Victor 78, 1941 | C (later choruses E♭) | verified | [JazzStandards.com](https://www.jazzstandards.com/compositions-0/taketheatrain.htm), [Wikipedia](https://en.wikipedia.org/wiki/Take_the_%22A%22_Train) |
| satin | Satin Doll | Duke Ellington Orchestra, Capitol, 1953 | C | likely | [JazzStandards.com](https://www.jazzstandards.com/compositions-0/satindoll.htm) (original key) |
| attya | All the Things You Are | Modern Jazz Quartet (Milt Jackson), Prestige session, 1952 | A♭ | verified | [Weimar JDB solo 328](https://jazzomat.hfm-weimar.de/dbformat/synopsis/solo328.html) |
| tune-up | Tune Up | Miles Davis, *Cookin'*, 1956 | D | likely | Davis's 1953 recording is D in [Weimar JDB solo 325](https://jazzomat.hfm-weimar.de/dbformat/synopsis/solo325.html); the *Cookin'* medley key not checked |
| never-another | There Will Never Be Another You | Chet Baker, *Chet Baker Sings*, 1954 | **F** (app: E♭) | verified | [Weimar JDB solo 74](https://jazzomat.hfm-weimar.de/dbformat/synopsis/solo74.html) (15 Feb 1954 session) |
| miss-jones | Have You Met Miss Jones? | McCoy Tyner Trio, *Reaching Fourth*, 1962 | F | **uncertain** | F is the standard key ([jazzadvice](https://www.jazzadvice.com/jazz-standards/have-you-met-miss-jones/)); no source for this recording |
| stella | Stella by Starlight | Miles Davis, *'58 Sessions*, 1958 | B♭ | likely | [allsolos](https://allsolos.com/recording/151/stella-by-starlight) (Bill Evans solo, B♭) |
| misty | Misty | Erroll Garner, *Contrasts*, 1954 | E♭ | verified | [JazzStandards.com](https://www.jazzstandards.com/compositions-0/misty.htm), Musicnotes original key |
| valentine | My Funny Valentine | Miles Davis Quintet, *Cookin'*, 1956 | C minor | verified | [allsolos (Red Garland solo)](https://allsolos.com/solo/858/red-garland-piano-solo-on-my-funny-valentine), [allsolos tune](https://allsolos.com/tune/165/my-funny-valentine) |
| blue-bossa | Blue Bossa | Joe Henderson, *Page One*, 1963 | C minor | verified | [allsolos](https://www.allsolos.com/album/15/page-one), [jazzleadsheets](https://jazzleadsheets.com/blue-bossa.html) |
| ipanema | The Girl from Ipanema | Stan Getz & João Gilberto, *Getz/Gilberto*, 1964 | **D♭** (app: F) | verified | [Wikipedia](https://en.wikipedia.org/wiki/The_Girl_from_Ipanema), [jazzguitar.be](https://www.jazzguitar.be/blog/the-girl-from-ipanema-chords/) |
| song-father | Song for My Father | Horace Silver Quintet, *Song for My Father*, 1964 | F minor | likely | [Improvise for Real](https://improviseforreal.com/node/675) (jam key A♭ / F minor) |
| minor-bossa | Manhã de Carnaval *(related form)* | Luiz Bonfá, *Orfeu Negro* soundtrack, 1959 | A minor | likely | [learnjazzstandards](https://www.learnjazzstandards.com/?p=1831), [jazzadvice](https://www.jazzadvice.com/jazz-standards/black-orpheus/) (common key; film take not checked) |
| so-what | So What | Miles Davis, *Kind of Blue*, 1959 | D dorian | verified | [Weimar JDB solo 323](https://jazzomat.hfm-weimar.de/dbformat/synopsis/solo323.html) |
| so-what | Impressions | John Coltrane, *Impressions*, 1961 | D dorian | verified | [Weimar JDB](https://jazzomat.hfm-weimar.de/dbformat/dbcontent.html) (solo 224) |
| cantaloupe | Cantaloupe Island | Herbie Hancock, *Empyrean Isles*, 1964 | F minor | verified | [allsolos (Hubbard solo)](https://allsolos.com/solo/1433/freddie-hubbard-trumpet-solo-on-cantaloupe-island) |
| maiden | Maiden Voyage | Herbie Hancock, *Maiden Voyage*, 1965 | D sus (D7sus4) | verified | [Weimar JDB solo 168](https://jazzomat.hfm-weimar.de/dbformat/synopsis/solo168.html) (Dsus7, Fsus7, E♭sus7, D♭sus7) |
| chameleon | Chameleon | Herbie Hancock, *Head Hunters*, 1973 | B♭ dorian (B♭m7–E♭7) | likely | standard vamp key |
| solar | Solar | Miles Davis, *Walkin'*, 1954 | C minor | verified | [allsolos](https://www.allsolos.com/solo/852/miles-davis-trumpet-solo-on-solar) |
| ladybird | Lady Bird | Tadd Dameron & Fats Navarro, Blue Note, 1948 | C | likely | standard and original key |
| giant / giant-slow | Giant Steps | John Coltrane, *Giant Steps*, 1959 | B (cycles B, G, E♭) | verified | [Weimar JDB solo 222](https://jazzomat.hfm-weimar.de/dbformat/synopsis/solo222.html) (the database files it under E♭, where the cycle ends) |

### Practice forms without a reference (by design)

`blues-basic`, `ballad-ii-v`, `two-five-keys`, `minor-two-five-keys`, `turnarounds-f`, `backdoor-g`, `sec-dominants-c`,
`modal-a` and `dorian-vamp` are study forms, not tunes, so they have no "original". They are listed in `NO_REFERENCE`, and a
test checks that every chart in `standards.ts` is in exactly one of the two lists.

### Not covered

- The songbook (`src/content/songbook.ts`, `src/engine/songs.ts`) holds public-domain folk, children's and classical
  melodies, not jazz standards.
- Voice F14 "Standards & ballads" (0.70, `voiceFamilies.ts`) sings our own contrafacts (blue-window, corner-light…) and
  public-domain spirituals, not the copyrighted standards, so there is no original to link. Drums use no named standards.
- `src/engine/charts.ts` templates and improvisation levels are generic progressions.
- Ear questions on lead-sheet analysis (`topicsChartAnalysis.ts`) use the same standards. The row isn't shown inside a
  question, to keep one question per screen. The tunes are linked from Charts and the levels.

## Where the row appears

- **Charts → Standards' changes**: two small link icons on every standard row, and the full row (with the key note and
  "Practise in X") at the top of the chart player. The player's practice key follows its own ♭/♯ transposition.
- **Improvisation studio → Rules**: under the chart picker when a standard is chosen. Charts opened from there or from a
  teacher's rules assignment keep the link.
- **Drills**: piano voicings / stride levels (`chart~std:`), bass walking standards (b-walk L11/13/14/18), bass solo chorus on
  a standard (b-impro L13), bass Latin jazz (b-latin L9: Blue Bossa / Song for My Father), bass rhythm-changes lines
  (up-tempo and bebop odd options, rhythm-solo: linked to Oleo), guitar comping on standards (g-jazz L8) and chord-scale
  lines (g-impro L5). The resolver is `src/engine/drills/standardRef.ts`. Placement: on the expanded level page (one or two references shown,
  more folded under "Original recordings (n)"), and as a one-line compact row above the score on the run screen.
