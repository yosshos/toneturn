# "My songs": music sources, the law, and each site's terms

*Research done 2026-11-07 for The 7th Sense (PWA, Israeli owner, worldwide users, free now, maybe subscriptions later).*
*This is research, not legal advice. Items marked **[lawyer]** need confirmation by an Israeli/US IP lawyer before a commercial launch.*
*Quotes are short excerpts from each site's terms as fetched on 2026-11-07. Terms change, so re-check before relying on them.*

---

## 1. Executive conclusion

| Source | Can we use it? | For what exactly | Conditions | Confidence |
|---|---|---|---|---|
| **Our own chord charts** (we write the chord progression + section map by ear, no lyrics or melody) | **Yes with conditions** | Chord-only charts (Verse: Am F C G …), loop points, tempo plan, song title/artist as a reference | No lyrics, no transcribed melody or riff, no copying of a third-party chart's layout. Keep it to chords + structure we derived ourselves | Medium-high (US); medium (Israel/EU, no direct case law) |
| **Audio the user supplies** (own file, microphone, tab capture), analysed on device | **Yes with conditions** | Live chord/beat detection, looping, slow-down for that user's own practice | On-device processing; no upload/storage of the audio; the user is responsible for having the audio legally; don't redistribute the audio | Medium-high |
| **Sharing user-derived chord timelines between users** | **Yes with conditions** | Shared chord-only charts (crowd-sourced) | Chords + timings only, no lyrics/melody; DMCA-style notice-and-takedown process; terms that make users responsible | Medium. This is the model the 2006 tab takedowns targeted, but chord-only charts are much weaker targets **[lawyer]** |
| **Chordonomicon** (Hugging Face) | **No** for a commercial app; risky even while free | Research/offline analysis only | Dataset card says **CC BY-NC 4.0**; the data was scraped from Ultimate Guitar, whose terms are personal and non-commercial | High |
| **Hooktheory TheoryTab / Trends API** | **Only with a licence** | Chord-probability "trends" (not song charts) | Terms ban copying, scraping and redistribution "except as expressly authorized … (e.g., via a written data license)". Ask Hooktheory for a written licence | High |
| **Spotify** Web API / Web Playback SDK / Connect | **No** for a "play the song with our chord chart" product | At most: search/metadata + a link out to Spotify | Policy bans analysing Spotify content, games/trivia, syncing to visuals, mixing with other services' content, and commercial streaming apps. New apps can't get audio-features/analysis, and extended quota is for organisations with 250k MAU | High |
| **YouTube** IFrame player | **Yes with conditions** (embed only) | Show the official video next to our chord chart; the user scrubs/loops by player API | Unmodified player, no download, no separating/isolating audio, no caching. **We may not analyse YouTube audio**, and we should not build tab-capture flows aimed at YouTube | High (embed) / High (no analysis) |
| **Apple iTunes Search API** 30-s previews | **No** for practice/analysis; **Yes** only as a "buy on iTunes" promo | Store links, artwork, metadata | Previews must be "only to promote store content" and not "synchronized with video", and must come with a badge + attribution | High |
| **Deezer API** 30-s previews | **No** | (n/a) | Terms limit the API to "a non-commercial purpose". New app registration appears closed | Medium-high |
| **Jamendo** API + tracks | **Yes with conditions** (free phase); **Only with a licence** once commercial | Real full-length indie songs to practise on, with our own chord charts | Non-commercial is free; commercial needs a quote from licensing@jamendo.com. Respect each track's CC licence (credit + backlink; ND and NC limits). No offline caching | Medium-high |
| **Audius** | **Unclear: verify first** | Possibly indie tracks via its open API | Developer docs say "permissionless" but give no content licence. Artists keep their rights. Needs a written check | Low |
| **Free Music Archive / ccMixter / Internet Archive (LMA, netlabels)** | **Yes with conditions**, track by track | Practice tracks under CC BY / CC BY-SA / CC0 | Use only tracks with a commercial-OK licence (no NC) once paid. Credit + link. LMA (etree) is non-commercial trading only, so skip it for a paid app | Medium |
| **Musopen** | **Yes with conditions** | Public-domain classical recordings | Credit Musopen. Don't resell the recordings as such. Its site and text are not PD | Medium |
| **The Session** (Irish tunes, ABC) | **Yes with conditions** | Folk tunes (melodies) for melody/ear practice | ODbL + custom clause: attribution, share-alike for derived databases, and **no processing with LLMs**. Old trad tunes are PD, but individual transcriptions may not be | High (licence) |
| **Mutopia** | **Yes** | PD classical scores (LilyPond/MIDI) | Each piece is PD, CC BY or CC BY-SA: credit, and share-alike where marked | High |
| **IMSLP** | **Yes with conditions** | PD scores of composers dead more than 70 years | Use only items PD in **US + EU/Israel (life+70)**. IMSLP's PD status is Canada-centric and it gives no guarantee | Medium-high |
| **Public-domain songs** (US: published 1930 or earlier, as of 2026; Israel/EU: author died 1955 or earlier) | **Yes** | Full melody, lyrics, chords, everything | The work itself must be PD *and* the arrangement/recording we use must be PD or our own | High (rules) / per-song checks needed |
| **Lyrics** (any copyrighted song) | **Only with a licence** | Displaying or syncing lyrics | Musixmatch / LyricFind commercial licence, and ACUM for Israeli works. Free Musixmatch tier is non-commercial and only ~30% of the lyric | High |
| **Melody / riffs / tabs of copyrighted songs** | **Only with a licence** | Notation, tabs, riff transcriptions | Publisher licence (as Ultimate Guitar did via Harry Fox Agency + direct deals). Songsterr / Hal Leonard / Musicnotes have no public developer API; negotiate | High |
| **Ultimate Guitar, Chordify, Songsterr** (scraping or reuse) | **No** | (n/a) | Terms are personal and non-commercial, and ban automated collection and reuse | High |

**Bottom line:** build "My songs" on **(1) chord-only charts we author ourselves, (2) audio the user brings, analysed on the device, (3) the YouTube embed for listening, and (4) a PD + Creative Commons catalogue (Jamendo/CC/PD/folk) for full melody and riff content.** Lyrics, melody and tabs of commercial songs, plus any Spotify/Apple/Deezer audio, are out until there is a licence.

---

## 2. Legal principles

### 2.1 What is protected: chords vs lyrics vs melody vs tabs

- **Chord progressions alone: generally not protected (US).** In *Structured Asset Sales v. Sheeran* (2d Cir., 1 Nov 2024, No. 23-905), the court held that a common chord progression plus harmonic rhythm is basic "musical building blocks". It cited the Copyright Office *Compendium (Third)* §802.5(A), under which notes, rhythms and chords are generally not copyrightable ([Justia](https://law.justia.com/cases/federal/appellate-courts/ca2/23-905/23-905-2024-11-01.html)). *Skidmore v. Led Zeppelin*, 952 F.3d 1051 (9th Cir. 2020, en banc) treated a descending chromatic progression as a commonplace convention. **Caveat:** the *selection and arrangement* of unprotectable elements can still be protected. A chart that also copies a distinctive riff or melody is no longer "chords only".
- **Melody, lyrics and riffs are protected.** Lyrics are literary works and melody is the core of the musical work. A tab or score that transcribes the melody or a riff reproduces protected expression. A transcribed arrangement can also carry a new copyright of its own (the arranger's).
- **Tabs: industry history.** In 2005–2006 the NMPA and the Music Publishers' Association sent takedown letters to about 20 tab sites. OLGA removed about 34,000 songs. No court precedent resulted ([OLGA, Wikipedia](https://en.wikipedia.org/wiki/On-line_Guitar_Archive); [The Register, 2006](https://www.theregister.com/2006/08/29/guitar_sites_under_fire); [Cardozo AELJ note](https://www.cardozoaelj.com/wp-content/uploads/2012/07/Myers.pdf)). The industry answer was licensing. Ultimate Guitar signed a Harry Fox Agency deal (2010) plus direct publisher deals ([UG licensing blog](https://www.ultimate-guitar.com/article/blog/licensing); [UG help: why some songs are blocked](https://help.ultimate-guitar.com/en/articles/6735517-website-licensing-on-ultimate-guitar-why-are-some-songs-blocked)). Songsterr states that "all the content provided through our Service is licensed" and that it pays royalties ([Songsterr terms, last modified 10 Jun 2026](https://www.songsterr.com/a/wa/terms)).
- **Israel / EU.** Neither has a case squarely on chord progressions. Israel's Copyright Law 2007 requires originality (§4). The EU standard is the author's "own intellectual creation". Both give the same practical answer (common progressions are not protected, while melody and lyrics are), but this is untested. **[lawyer]**
- **Title + artist names** used to identify a song are factual and fine. Don't imply endorsement, and don't use album art unless it comes with a permitted API.

### 2.2 Chords synced to a recording; lyrics sync

- **Chords timed to the user's own playback** (the user plays their file or a YouTube embed, and we highlight chords) is display of unprotected facts alongside the work. No sync licence applies, because we don't fix the recording into an audiovisual work. The risk sits in the *source's* terms, not copyright: Spotify bans syncing sound recordings with visual media (see §3.3), and YouTube bans modifying the player.
- **Lyrics** (static or time-synced) need a licence from publishers or an aggregator such as LyricFind or Musixmatch. Both license line-by-line and word-by-word sync, and payment is per display. In Israel, ACUM's internet licence covers the display of "texts, notes and chords" of Israeli works ([ACUM FAQ](https://acum.org.il/en/faq/); [ACUM internet tariffs](https://acum.org.il/en/tariff-internet-commercial-services/)).

### 2.3 Analysing audio the user supplies

- **US.** Analysing a lawfully obtained copy to extract unprotected facts (chords, tempo, beats) is strongly supported as fair use: see intermediate copying in *Sega v. Accolade* (9th Cir. 1992) and non-expressive analysis in *Authors Guild v. Google* (2d Cir. 2015). The output (chords) is unprotected anyway. Mic input that is never stored raises essentially no reproduction issue.
- **Israel.** Copyright Law 2007 **§19** is an open fair-use clause modelled on the US one (purposes include "private study" and "research"). **§26** permits transient copies that are an integral part of a technological process enabling lawful use and have no independent economic value. A December 2022 Ministry of Justice opinion said ML analysis of works is generally fair use (non-binding) ([Herzog summary](https://herzoglaw.co.il/en/news-and-insights/ministry-of-justice-opinion-on-the-use-of-copyrighted-works-for-machine-learning-purposes/); [Pearl Cohen](https://www.pearlcohen.com/israeli-ministry-of-justice-opines-on-fair-use-of-copyrighted-content-for-ai-ml-training/)).
- **EU.** The DSM Directive 2019/790 Art. 4 allows text-and-data mining of lawfully accessed works unless the rightholder opts out. In-browser analysis of the user's own copy for their own practice is low-risk.
- **Tab capture.** Copyright is not the problem here. Platform terms are: YouTube bans separating or isolating audio, and Spotify bans analysing its content (§3.3, §3.4). A generic "analyse audio from a tab" feature is a user-side act, but the app must not be **designed or marketed** to capture Spotify or YouTube. If we offer tab capture at all, keep it generic, label it "audio you have the right to use", and process it on device. **[lawyer]**
- **Storing derived data.** A chord timeline (times + chord symbols) holds no audio and no protected expression. Storing it per user is fine. Sharing it between users is §2.1 territory: OK for chords only, with a takedown process.

### 2.4 Databases and scraping

- **EU sui generis right** (Directive 96/9/EC, Art. 7) protects a *substantial investment* in a database against extraction or re-use of substantial parts. *CV-Online Latvia v Melons* (C-762/19, 3 Jun 2021) ties infringement to harm to that investment. Under *Ryanair v PR Aviation* (C-30/14, 2015), a site can restrict use **by contract (its ToS)** even when the database has no IP protection ([SCL](https://www.scl.org/12290-cjeu-search-engine-copying-of-databases-infringes-sui-generis-right-where-it-adversely-affects-database-maker-investment/)). So Ultimate Guitar data (and Chordonomicon, derived from it) carries both database-right and contract risk in the EU, even if the individual progressions are free.
- **Israel** has **no sui generis database right**. A compilation is protected only if its selection or arrangement is original (Copyright Law §4). Scraping would be judged under contract (ToS), unjust enrichment, computer-misuse and privacy law. I found no leading Israeli scraping judgment. **[lawyer]**
- **US:** contract (ToS) and the CFAA (narrowed by *Van Buren*, 2021, and *hiQ v LinkedIn*). Chord data itself is not protected, but ToS breach and data-licence claims remain.

### 2.5 ACUM

ACUM licenses online services whose "central economic operations" are in Israel ([FAQ](https://acum.org.il/en/faq/)). Its internet tariff covers on-demand streaming and display of "texts, notes and chords" (Israeli works), and the licensee must state on the service that it operates under an ACUM licence. There is a low-income internet tier ([low-scope tariff](https://acum.org.il/en/tarrif-internet)). We only need ACUM if we **display lyrics or notation of protected works**, or stream them. Chord-only charts plus links/embeds probably need nothing. Ask ACUM in writing whether chord-only display is covered or required. **[lawyer/ACUM]** Contact: acum.org.il, tel. 03-6113530.

---

## 3. Sources

### 3.1 Chordonomicon (Hugging Face `ailsntua/Chordonomicon`)
- **What it is:** about 666k songs as chord progressions with section tags, genre and decade, and **Spotify IDs**. No lyrics.
- **Licence:** the HF dataset card front matter says **`license: cc-by-nc-4.0`** ([card](https://huggingface.co/datasets/ailsntua/Chordonomicon)), *not* MIT. The GitHub code repo shows Apache-2.0 ([repo](https://github.com/spyroskantarelis/chordonomicon)), which covers code, not data. The paper ([arXiv 2410.22046](https://arxiv.org/abs/2410.22046)) says the data was scraped from **Ultimate Guitar** and calls progressions non-copyrightable.
- **Risks:** (1) NC licence means no commercial use. (2) It comes from UG, whose ToS limits content to "personal, non-commercial use only" (§6.3). (3) EU database right in UG's catalogue. (4) The authors probably could not grant more rights than they had.
- **Verdict: No** for the product. Acceptable only for internal research (e.g. testing our recogniser), and even then non-commercial only.

### 3.2 Hooktheory (TheoryTab, Trends API)
- **Offers:** next-chord probabilities and "songs containing progression X". Rate limit 10 requests per 10 s. Melody trends: "No, and it is not on our immediate roadmap." No full dump ([API docs](https://www.hooktheory.com/api/trends/docs)).
- **Terms (last updated October 2026), §4 "Anti-Scraping Policy":** no third party may "copy, scrape, bulk-download, text-and-data mine, or redistribute" the site, including using it to "train, fine-tune, or evaluate models", except "as expressly authorized by Hooktheory (e.g., via a written data license or API terms)". §2 says the Services are for "your use, and not for the use or benefit of any third party" ([terms](https://www.hooktheory.com/terms)). The API page publishes no separate API licence, and auth uses the developer's personal account.
- **Verdict: Only with a licence.** Email Hooktheory (forum/contact) for a written data licence if we want "songs that use this progression" features.

### 3.3 Spotify (Web API, Web Playback SDK, Connect)
- **Developer Terms v10, effective 15 May 2025** ([terms](https://developer.spotify.com/terms)): no using Spotify content "to train a machine learning or AI model"; no local caching except as strictly necessary.
- **Developer Policy, effective 15 May 2025** ([policy](https://developer.spotify.com/policy)):
  - III.13 "Do not analyze the Spotify Content or the Spotify Service for any purpose"
  - III.6 "Do not synchronize any sound recordings with any visual media"
  - III.2 "Do not create a game, including trivia quizzes."
  - III.5 no product "integrated with streams or content from another service"
  - IV.1 streaming only for Premium subscribers
  - IV.2 "commercial uses are not permitted" for streaming apps (no selling access, no in-app payments initiated via the streaming app)
  - II.4 metadata and cover art only "in connection with the underlying content", with a link back, and never as a standalone product.
- **Platform changes:** on 27 Nov 2024 new apps lost Audio Features, Audio Analysis, Recommendations, 30-s preview URLs and more ([Spotify blog](https://developer.spotify.com/blog/2024-11-27-changes-to-the-web-api)). Since 15 May 2025, extended quota is open only to organisations (reported threshold 250k MAU). Development mode is limited to 5 users, and the owner needs Premium ([quota modes](https://developer.spotify.com/documentation/web-api/concepts/quota-modes)).
- **Track IDs + playback control + our chord charts?** Highlighting our chords while Spotify plays is arguably "synchronizing … with visual media". A practice exercise is arguably a "game". A future paid tier collides with IV.2. We also could not get past 5 users.
- **Verdict: No** as a playback/practice source. At most, an "Open in Spotify" deep link from a song page (plain link, no API) is fine.

### 3.4 YouTube (IFrame player, API Services)
- **Developer Policies:** may not "separate, isolate, or modify the audio or video components" (III.I.7). May not "download, import, backup, cache, or store copies" without written approval (III.E.1.a). May not "modify, build upon, or block any portion or functionality of a YouTube player" (III.I.6). May not use other technology to access content (III.I.14) ([policies](https://developers.google.com/youtube/terms/developer-policies)). The YouTube ToS (version fetched: effective 5 Jan 2022) bans access to or download of content except as the Service allows, and bans automated access ([ToS](https://www.youtube.com/static?template=terms)).
- **There is no allowance for analysing audio.** Embedding the official player and controlling it through the IFrame API (play, pause, seek, playback rate) is the intended use. So "loop bars 9–16 at 0.75×" with our own chord chart beside it is OK, provided the player is visible and unmodified. Chord detection from a YouTube tab capture is something we should not build or promote.
- **Verdict: Yes with conditions** (embed + our chart). **No** for analysis.

### 3.5 Apple iTunes Search API / Deezer API previews
- **Apple** ([Search API](https://performance-partners.apple.com/search-api)): promo content may be used "only to promote store content and not for entertainment purposes". It must be "streamed only, and not downloaded, saved, cached, or synchronized with video", near a "Download on iTunes" badge, with the "provided courtesy of iTunes" attribution. About 20 calls per minute. **Verdict: No** for practice or analysis. Yes for metadata plus store links.
- **Deezer** ([terms](https://developers.deezer.com/termsofuse), undated): use is "strictly limited for a non-commercial purpose and in a non-commercial environment". No DRM bypass. Developers report that new app creation is closed ([multi-scrobbler issue](https://github.com/FoxxMD/multi-scrobbler/issues/175)). **Verdict: No.**

### 3.6 Jamendo
- **API terms (last modified 17 Sep 2013)** ([devportal](https://devportal.jamendo.com/api_terms_of_use)): "The API may be used freely for non-commercial uses". For commercial use, "contact our sales team at licensing@jamendo.com". Each content item carries its own Creative Commons licence. Credit Jamendo members as creators and Jamendo as the provider, and give a direct backlink per track. Apps "must not be specifically designed to cache the content nor offering an offline access".
- **CC per track:** *NC* tracks are not usable once we charge (and arguably the API terms override this anyway). *ND* tracks: streaming them unmodified is fine, and a chord chart we write is not an adaptation of the recording (it's our own description), but don't publish stems or edits. *BY / BY-SA* tracks are the best fit.
- **Verdict: Yes with conditions** now (free app). **Only with a licence** once subscriptions start. Email licensing@jamendo.com early. Confidence is medium because the terms are 13 years old.

### 3.7 Audius, Free Music Archive, Internet Archive, Musopen, ccMixter
- **Audius:** the docs call the music "permissionless" but I found no content licence or API terms text. Artists keep their rights. **Unclear**: get written terms before using it.
- **FMA:** survived a 2018 shutdown and is owned by Tribe of Noise since 2019. Each track has its own CC licence. The FMA research dataset (mdeff/fma) uses per-track licences for audio. Usable track by track (avoid NC once commercial).
- **Internet Archive:** the Live Music Archive/etree covers only bands that allow **non-commercial** taping and trading, so skip it for a paid product. Netlabel items carry per-item CC licences, so check each one.
- **Musopen:** recordings released as PD. Credit Musopen and don't sell the original recordings. Site materials are not PD.
- **ccMixter:** per-track CC (much is BY-NC). Filter for BY / BY-SA / CC0.
- **Verdict: Yes with conditions**, using a per-track licence whitelist.

### 3.8 Public-domain and folk sources
- **US:** as of 1 Jan 2026, works published in **1930 or earlier** and sound recordings from **1925 or earlier** are PD ([Duke CSPD](https://web.law.duke.edu/cspd/publicdomainday/2026/)). **Israel/EU:** life + 70 (Israel Copyright Law 2007 §38), so an author who died in 1955 or earlier is PD in 2026. Israel's transitional provisions (§78) need a check for older works. **[lawyer]** A song must clear *both* rules for a worldwide app, and every co-author (composer and lyricist) counts. Modern arrangements and recordings of PD songs are separately protected.
- **The Session:** data at [adactio/TheSession-data](https://github.com/adactio/TheSession-data) is under **ODbL** plus a custom clause. Commercial sharing and adapting are allowed, with attribution and share-alike for public derivative *databases*, but you "may not use, adapt, modify, or process the material in any way with Large Language Models" (except for accessibility). Fine for melody exercises. Never feed it to an LLM.
- **Mutopia:** each piece is PD, CC BY or CC BY-SA ([legal](https://www.mutopiaproject.org/legal.html)). **Yes**, with credit and share-alike where marked.
- **IMSLP:** status is judged under Canadian law (life+50), and IMSLP gives "no guarantee" for your country ([IMSLP:Public Domain](https://imslp.org/wiki/IMSLP:Public_Domain)). Use only items that are PD in the US **and** under life+70. Some uploaded editions carry CC licences, so check the tag.

### 3.9 Licensed catalogues (later)
- **Songsterr:** licensed tabs, but the terms forbid any reuse "without express advance written permission" and any automated tool ([terms, 10 Jun 2026](https://www.songsterr.com/a/wa/terms)). No public API. Approach them for a partnership.
- **Hal Leonard / Musicnotes:** no public developer API. Hal Leonard Connect (Aug 2026) targets retailers. Contact Hal Leonard licensing. Its catalogue (and Ultimate Guitar) both sit inside Muse Group.
- **7digital:** owned by Songtradr. Licensed full-track B2B streaming APIs, priced by contract. A possible later route to real recordings.
- **Musixmatch:** the free tier is non-commercial and returns about 30% of each lyric. Commercial use is by quote (sales@musixmatch.com). **LyricFind** is the alternative, with deals with 3,000+ publishers including all majors.
- **ACUM** for Israeli works (§2.5).

### 3.10 Ultimate Guitar / Chordify
- **Ultimate Guitar ToS (last updated 24 Aug 2026)** ([tos](https://www.ultimate-guitar.com/about/tos.htm)): §6.3 "Content received through the Service may be accessed for your personal, non-commercial use only". §6.2 "you will not duplicate or otherwise reproduce the Content". Its rights come from publisher licences (§6.1, §7.7). No public API.
- **Chordify** ([terms](https://chordify.net/pages/terms-and-conditions/); the page blocked direct fetch, so these excerpts come via search): "for your own personal non-commercial use only". §2.4 bans collecting content "using automated means". No public API.
- **Verdict: No.** Not usable, directly or through derived datasets.

---

## 4. Open questions for a lawyer

1. Are chord-only charts of copyrighted songs (with title and artist) safe in **Israel and the EU**, including user-shared ones? Is there any Israeli precedent?
2. Does **ACUM** require a licence for chord-only display (no lyrics)? What would the fee be under the low-scope internet tariff?
3. Can a generic "analyse audio from a browser tab" feature create contributory liability or ToS-inducement exposure (YouTube/Spotify)? What disclaimers are needed?
4. Do Jamendo's 2013 API terms still govern? What does a commercial quote look like?
5. Do we need a DMCA agent (US) and a notice-and-takedown policy for shared charts, and an Israeli equivalent?
6. Is a YouTube IFrame embed with a looping/slow-down UI and our chord overlay *beside* (not on) the player within YouTube's policies for a **paid** app?

## 5. Recommended plan

1. **Ship v1 on safe ground:** "My songs" = the user's own audio file or microphone, analysed **on device** (chord/beat detection, loop, slow-down, rising-tempo plan). No upload, no storage of audio. Save only the chord timeline.
2. **Add the YouTube embed as the listening source:** visible, unmodified player. Our editable chord chart sits beside it, with loops through the IFrame API (seek, playback rate). No audio analysis of YouTube.
3. **Seed a starter catalogue we can fully show (melody, riffs, tabs):** PD songs (cleared for US + life+70), The Session tunes (ODbL credit, no LLM), Mutopia/IMSLP PD pieces, and CC BY / BY-SA tracks from Jamendo/FMA/ccMixter with credit and backlink. Store the licence and attribution per item.
4. **Chord-only charts for popular songs:** written by us or the user, with no lyrics, melody or riffs. Sharing between users only after adding takedown handling and terms that make users responsible.
5. **Don't use:** Chordonomicon, UG/Chordify/Songsterr content, Spotify/Apple/Deezer audio or previews, Hooktheory data (without a licence), or lyrics.
6. **Before charging money:** send emails to licensing@jamendo.com, ACUM, and Hooktheory, and get a one-hour lawyer review of §4. Later, for lyrics, riffs and tabs of hits, approach Musixmatch/LyricFind and Songsterr/Hal Leonard (Muse Group).
