# SPEC — Pitching ToneTurn to Open Studio (draft, 2026-11-15)

Status: a proposal for the owner, nothing built yet. The owner has no personal contact with Open Studio: one live session with Adam Maness, and course viewing.

## 1. Goal

Get a meeting where Open Studio sees ToneTurn as the **measurement and practice layer they don't have**. Their strength is video courses taught by great players. ToneTurn measures practice (quality, time, per-key mastery, improvement) and drills exactly what their courses teach: Barry Harris (Thomas Echols), voicings, reharm, solo piano, guitar.

## 2. Principles

- **Show, don't tell.** The cold email links to something that works on a phone in 30 seconds, and to a 90-second video.
- **Their world, our product.** The demo is framed "built for Open Studio members" and mapped to their courses, using their name descriptively.
  - It does **not** use their logo or teachers' likenesses without permission. An unsolicited piece that looks like an official Open Studio product reads as impersonation and can backfire. "Inspired by your palette, ready for your brand" is the safe and more respectful version.
  - The demo link is private, not public or indexed.
- **Depth must be visible in under a minute.** They can't know what's inside, so a "depth page" shows the scope in numbers and maps it to their courses.
- **Piano + guitar.** Piano is their core, and many of their practicing members are guitarists. Bass, voice and drums are shown as "also built".
- **Own the independent product.** The 7th Sense stays our brand with its own users. That is our leverage, and our fallback if they say no.

## 3. Deliverables, in order

1. **Design level-up (in progress).**
   - The voice live UI is being rebuilt.
   - The same treatment follows for piano and guitar: staff and tab with a live now-cue, per-note early/late marks, a velocity display, a review with a loop-the-spot control.
   - The demo needs these to look professional.
2. **Partner theme layer** (code, not a long-lived git branch):
   - `PartnerConfig`: theme tokens (colours, fonts, radius, shadow), wordmark text, course subset (piano + guitar), copy overrides, mascot set (neutral "your teacher here" frames), course-mapping links;
   - enabled by a build env (`VITE_PARTNER=openstudio`) and deployed to a separate private site (e.g. a separate Netlify site), built from the same code, so every product fix reaches the demo.
3. **Depth page** (inside the demo, and also as a one-pager):
   - counts: levels, exercises, keys, instruments, lessons;
   - the maps: the Barry Harris method map with sources, including Echols and Parks; Siskind solo piano; reharm and colour; scale matrix;
   - "what we measure" (time, quality, per-key mastery, plateau and fade);
   - a "fits your courses" table: their course → our drills (from public course lists).
4. **90-second video:** a phone screen recording. Open a Harris lesson → play it in a weak key → the key map lights → the AI weekly plan names that key → the depth page.
5. **Cold email:** short, personal (mentions the live session with Adam), one sentence of value, one link plus the video, and a clear small ask (a 20-minute call). A draft goes in the appendix once approved.
6. **Meeting deck:** the problem (practice between lessons isn't measured), the demo live, the depth, the integration options (white-label module / SSO + progress sync / co-branded app), the business options (licence per seat, revenue share, flat licence), and the next step (a pilot with a cohort).

## 4. Open decisions (owner)

1. The business model to propose first: licence per active member, revenue share, a flat yearly licence, or open to partnership or acquisition.
2. The address: a general contact, Adam directly (from the live-session contact), or an intro via Thomas Echols if a relationship forms in his course.
3. Whether to ask in the email for permission to use their brand and teachers' likenesses in a follow-up demo.

## 5. Not doing

- Copying teachers' faces from the internet into avatars.
- Using their logo before permission.
- A public page that looks like an Open Studio product.
