# Classmates inside a class: student-to-student research (2026-11-26)

What this covers: how comparable products let classmates see and interact with each other, what the pedagogy evidence says, safety and privacy rules for minors, then a ranked feature menu, recommended defaults and anti-patterns.
How it was gathered: web search plus public help pages only. Some pages refused automated fetches (ICO standards list, BandLab Minor Safety, PMC). Where a claim comes only from a search summary or a secondary source, it is marked **[secondary]**.

---

## 1. How products handle classmates

| Product | What classmates see / do | Teacher controls | Source |
|---|---|---|---|
| **Google Classroom** | A class stream with posts and comments. The default lets students post and comment. | A three-way class setting (students post+comment / comment only / only teachers). Each student can be muted from the People page or from a comment, and the student is not told they are muted. A muted student can still send private comments to the teacher and still do assignments. The teacher can delete posts. | https://support.google.com/edu/classroom/answer/6099424 ; https://support.google.com/edu/classroom/answer/6020274 |
| **Seesaw** | A class feed of student work. Whether students can see each other's work is a separate toggle. | Comments on or off. Approval of student comments and posts is **on by default**: an item is "pending" until approved, but the author still sees it and the feedback in their own journal. Seesaw's own guidance: if you want peer feedback, turn on peer viewing together with approval; for teacher-and-student-only classes, turn peer viewing off. Blog comments always need approval. | https://help.seesaw.me/hc/en-us/articles/207719593-How-do-I-manage-comments-on-posts ; https://help.seesaw.me/hc/en-us/articles/28470398535437-Configuring-Class-Settings-to-meet-classroom-goals |
| **Flip (formerly Flipgrid)** | Video answers to a topic, plus video or text replies to classmates. | Moderation per topic: new videos stay hidden until approved, and replies can be moderated too. The teacher can give private feedback that only that student sees. Guest access needs a password. Schools advise moderation for PreK–2 and public grids. | https://info.flipgrid.com/en-us/blog/product-updates/text-comments.html ; https://support.blakeschool.org/hc/en-us/articles/360041191372 ; https://www.techlearning.com/how-to/what-is-flipgrid-and-how-does-it-work-for-teachers-and-students |
| **ClassDojo** | Class Story is seen only by the class's teachers, its students and those students' parents. School Story cannot be seen by students at all. | One "Enable comments" toggle covers everyone. The class owner can delete any comment. Private by default; signatory of the Student Privacy Pledge. | https://help.classdojo.com/hc/en-us/articles/360028921992 ; https://www.classdojo.com/privacy |
| **Duolingo for Schools** | A classroom leaderboard. | Privacy settings let the teacher decide whether students can send or accept friend requests, share progress, react to friends' league status, join leagues, and take part in discussions with people outside the class. **[secondary: from Duolingo PDFs found in search]** | https://schools-cdn.duolingo.com/documents/16447a9e3360ddc5fa2d8e2765b9ef7d.pdf ; https://blog.duolingo.com/using-duolingo-in-the-classroom |
| **Khan Academy** | **Gem Challenges**: each student's gems (which reward effort) add up to one class goal, with a reward the teacher picks and a shared celebration. No ranking of individuals. **Live Team Game**: automatic teams race to reach Proficient; the leaderboard is meant to be **projected, and students don't see it individually**; only assigned work counts. | Teacher starts and pauses the game and picks the reward. | https://blog.khanacademy.org/five-ways-khan-academy-is-making-student-practice-more-motivating/ ; https://support.khanacademy.org/hc/en-us/articles/45128558403341 |
| **Quizlet Live** | Random teams. The whole team has to answer correctly, and **accuracy is rewarded over speed**. A wrong answer sends the team back to the start, so they talk before answering. Random teams began as an engineering shortcut, and teachers then reported them as a key part of the appeal. | Teacher can reshuffle teams. | https://medium.com/tech-quizlet/engineering-controlled-chaos-how-to-build-a-real-time-game-for-classrooms-5b764c7fa039 ; https://help.quizlet.com/hc/articles/360030985431 |
| **Kahoot Team mode** | Shared-device teams with "Team talk", a 5–20 s discussion window before each answer. | The host can switch Team talk off. | https://kahoot.com/blog/2021/09/22/kahoots-new-team-mode/ ; https://support.kahoot.com/hc/en-us/articles/4408679135891 |
| **Tonara → Practice Space** (music studios) | Points for practice length and consistency; a studio leaderboard, plus a **global** leaderboard in Tonara; custom studio leaderboards. Tonara reportedly closed and teachers moved to Practice Space (weekly and all-time point boards). I found no documented teacher-side switch to hide the board. | Teacher-created challenges. | https://www.soundbrenner.com/blogs/articles/tips-to-keep-your-music-students-engaged ; https://leilaviss.com/blog/transition-from-tonara-to-practice-space ; https://apps.apple.com/us/app/-/id1477106977 |
| **Times Tables Rock Stars** (a good precedent) | Class leaderboards. | Privacy settings decide how names appear on leaderboards (real name or a "Rock Name"), and students can hide themselves. | https://intercom.help/times-tables-rock-stars/en/articles/10026641-privacy-settings-how-student-names-are-shown-on-leaderboards-and-charts |
| **Soundtrap for Education** | Collaboration in shared projects, each person on their own track. Each assignment copy includes the teacher. | A **walled garden**: only people added can collaborate. Join codes are time-limited (60 min or 30 days), and Soundtrap warns that a leaked code exposes students and should be turned off after import. | https://support.soundtrap.com/hc/en-us/articles/115003152169 ; https://edu.soundtrap.com/teacher-resource/user-management/ |
| **BandLab for Education** | Classroom projects. | Only a teacher can invite a student. EDU accounts are fully cut off from the public BandLab. **The chat feature was retired**, and teachers are pointed to class discussions instead. | https://help.edu.bandlab.com/hc/en-us/articles/900000422106 ; https://help.edu.bandlab.com/hc/en-us/articles/37204004840473 |
| **Yousician** | Follow friends and see their progress; weekly challenges ranked against friends and globally. Social features only work when the profile is not private. | (Consumer app, no classes.) | https://support.yousician.com/hc/en-us/articles/201682871-Social-tab |
| **Smule** | Duets with anyone. Minimum age 13 (US) or 16 (EEA). I found no duet limits specific to minors; parent guides warn against duet requests from strangers. | — | https://smule.zendesk.com/hc/en-us/articles/15693143576980 |
| **Strava clubs** | A weekly ranked club board (top 10 in the app, top 100 on the web), club posts and a club feed. | Admins can limit posting to admins and delete posts. Parent guides advise setting group-activity visibility to "No One" for children. **[secondary]** | https://support.strava.com/hc/en-us/articles/18288273144973-Club-Posts ; https://www.internetmatters.org/parental-controls/social-media/strava-parental-controls/ |
| **Peloton Teams** | Invite-only or public teams. Challenges are either **goal-based** (e.g. 3 workouts in 7 days) or competitive. High fives; team feed with @mentions. | — | https://www.onepeloton.com/blog/teams-and-challenges ; https://www.onepeloton.com/blog/peloton-motivation-high-fives |

**Patterns across these products**
1. School products **separate "can see each other" from "can talk to each other"**, and gate talking behind teacher approval or a class-wide off switch (Seesaw, Flip, Classroom, ClassDojo).
2. Leaders in the field **removed free chat** (BandLab retired its chat) and give the teacher a **silent mute** (Classroom).
3. The class-motivation designs that stand out are **cooperative**: Khan's Gem Challenge (one shared class goal, rewarding effort), Quizlet Live (random teams, accuracy over speed), Peloton's goal-based challenges. Individual ranking is either **projected for the whole room rather than shown on each device** (Khan) or made **anonymisable** (TTRS).
4. Music studio apps (Tonara, Practice Space) lean on minutes-practised leaderboards, and I found none that offers a teacher "hide" switch. Minutes measure effort, but they are easy to game and favour students with more free time.
5. Closed classes are protected by **teacher-only invites and time-limited join codes** (BandLab, Soundtrap).

---

## 2. Pedagogy evidence

**Gamification and leaderboards**
- Meta-analysis (35 interventions, about 2,500 students): a small positive effect on intrinsic motivation (g = 0.257). The main obstacles were **low perceived competence and low perceived autonomy** in gamified classes. https://link.springer.com/article/10.1007/s11423-023-10337-7
- Low performers are more likely to be demotivated by competitive elements such as leaderboards. Team competition **hurt collaborative learning for below-average students and helped above-average students**. **[secondary, via search summary]** https://par.nsf.gov/servlets/purl/10510520 ; https://pmc.ncbi.nlm.nih.gov/articles/PMC8037535
- Absolute vs relative boards: students **preferred a relative board** (two neighbours above and two below), reporting less peer pressure and more focus on their own goals. With an absolute board, only the top third were more intrinsically motivated, and that did not translate into more engagement. https://repository.eduhk.hk/en/publications/examining-effects-of-different-leaderboards-on-students-learning- ; https://hub.hku.hk/bitstream/10722/368255/1/content.pdf
- Murayama & Elliot's meta-analysis: **no overall link between competition and performance**, because competition raises both approach goals and avoidance goals, which cancel out. https://researchgate.net/publication/232609186
- Johnson & Johnson's line of meta-analyses: **cooperative goal structures beat competitive and individualistic ones** on achievement and on peer relationships. https://conservancy.umn.edu/server/api/core/bitstreams/d484edf9-acfb-418e-ae59-010722bfce7a/content
- SDT meta-reviews (Ryan et al. 2023; Howard, Slemp & Wang 2024, 637 samples): support for autonomy, competence and relatedness predicts better motivation and wellbeing; behaviour that thwarts those needs predicts worse. Group competition **can** meet the need for relatedness *within a team*. https://selfdeterminationtheory.org/wp-content/uploads/2023/01/2023_RyanDuineveldDiDomenicoEtAl_Meta.pdf ; https://selfdeterminationtheory.org/wp-content/uploads/2024/02/2024_HowardSlempWang_Meta.pdf
- Effort or progress boards rather than score boards: the argument that ranking pushes students toward a fixed mindset, and teacher reports that effort boards work, are **practitioner claims, not tested in trials**. https://www.gettingsmart.com/2016/04/leaderboards-learning-lessons-from-research-gamification/

**Peer feedback in music**
- The research base is small. Hanken (2016) found peer feedback in instrumental teaching has had little formal study, and Bergee & Cecconi-Roberts found self-assessment often disagrees with how peers and teachers rate the same playing. **[secondary, via Kaastra]** https://blogs.ubc.ca/lindatkaastra/?p=68
- Daniel (2004) developed structured peer-assessment forms for tertiary music performance. https://researchonline.jcu.edu.au/989/1/BJME_daniel2.pdf
- Nguyen (2019), high-school orchestra: structured peer-feedback loops helped students **define what good playing sounds like**. https://digitalcc.coloradocollege.edu/record/3275/files/Oreos_in_Orchestra_Feedback_Loops_and_Performance_Based_Assessment_PDF.pdf
- Krivenski (2013, Goldsmiths): building students' peer-feedback skills, with an example structured form. https://eprints-gro.gold.ac.uk/36645/1/
- **Two stars and a wish**: two strengths and one improvement point, **tied to success criteria**; suited to beginners at feedback and recommended for grades 3–5. https://letstalkscience.ca/educational-resources/teaching-stem/two-stars-and-a-wish ; https://www.ncme.org/about/peer-feedback
- **Liz Lerman's Critical Response Process**, built for performing arts: (1) statements of meaning, (2) the artist asks questions, (3) responders ask neutral questions, (4) opinions **only with the artist's permission**. It maps neatly to a "what was striking" chip → the student's own "listen for…" question → teacher-gated opinion. https://lizlerman.com/critical-response-process ; https://owl.purdue.edu/owl/subject_specific_writing/creative_writing/teachers/workshop_creative_writing_guide/liz_lerman_critical_response_process.html

**Social support and practice motivation**
- Földi et al. 2024 (264 instrument students aged 9–19): **parents matter most in early adolescence; teachers and friends in mid-adolescence; friends are decisive in late adolescence.** https://doaj.org/article/5151abfba1a54544b96f65d8fc1bade4
- Orejudo et al. 2021 (444 students): for 16–18-year-olds, peers strengthen learning self-efficacy. https://www.frontiersin.org/articles/10.3389/fpsyg.2021.722082/full
- Nielsen et al. 2018: peer learning during practice is common among conservatoire students. https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5862820/
- Design implication: peer features matter more as students get older. For young children, the parent and teacher loop matters more than classmates.

---

## 3. Safety and privacy for minors

- **COPPA (US), amended rule** in force from 23 June 2025, full compliance by 22 April 2026. It requires **separate parental consent before disclosing a child's data to third parties**. Under school authorization, a school may consent in place of parents only for a service used solely for education; any commercial use needs direct parental consent. In the Edmodo case, the FTC objected to a vendor pushing COPPA responsibility onto schools. Note: other users are not "third parties" in the advertising sense, but under COPPA, letting a child post information publicly counts as disclosing it, so **peer-visible free text or photos from under-13s raise the bar**. https://www.federalregister.gov/documents/2025/04/22/2025-05904/childrens-online-privacy-protection-rule ; https://www.lw.com/en/insights/2025/05/ftc-publishes-updates-to-coppa-rule ; https://www.ftc.gov/news-events/news/press-releases/2023/05/ftc-says-ed-tech-provider-edmodo-unlawfully-used-childrens-personal-information-advertising
- **UK Children's Code** (all under-18s, 15 standards): **high privacy by default**. A child's data is visible to other users only if the child changes the setting. Don't nudge children to lower their settings. Keep settings high through updates and give a way back to them. Profiling and geolocation off by default. Children's information must be presented in a way they can understand. https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/age-appropriate-design-a-code-of-practice-for-online-services/7-default-settings/ ; https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/faqs-on-the-15-standards-of-the-children-s-code/ ; https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/designing-products-that-protect-privacy/childrens-code-design-guidance/protect-children-s-privacy-by-default/
  - How this applies to a class: inside a closed class the teacher runs, showing first names on a roster is arguably a "compelling reason" default. Anything beyond that (scores, recordings, activity) should be **off until the teacher enables it and the student can still opt out**.
- **Israel**: Amendment 13 to the Protection of Privacy Law has been in force since 14 August 2025 and brings the law close to GDPR. **There is no standalone children's privacy statute**. Under the Legal Capacity and Guardianship Law, minors' consent generally needs a parent or guardian. The PPA has published a **student-privacy guide for schools and online**, and in June 2026 a **draft age-assurance guidance** (Hebrew) went out for comment. A precedent: the Keshet case, where a site was required to get parental consent and delete improperly collected minors' data. https://iapp.org/news/a/israel-marks-a-new-era-in-privacy-law-amendment-13-ushers-in-sweeping-reform ; https://chambers.com/practice-guides/guides/data-protection-privacy-2026/israel/law-and-practice ; https://www.gov.il/BlobFolder/legalinfo/age-assurance-1/he/age-assurance.pdf ; https://www.winston.com/en/blogs-and-podcasts/privacy-law-corner/israeli-site-needs-parental-consent-under-local-law-to-collect-information
- **Industry norms seen above**: teacher-only invites and time-limited join codes (Soundtrap, BandLab); no chat (BandLab retired it); comment approval on by default (Seesaw); silent mute (Classroom); class-wide comment switch (ClassDojo); students choose real name or nickname on boards (TTRS); a walled garden cut off from public users (BandLab EDU).

---

## 4. Synthesis

### (a) Peer features ranked by value against risk

| # | Feature | Pedagogical value | Risk | Verdict |
|---|---|---|---|---|
| 1 | **Class goal**: shared weekly minutes or clean takes toward one target, with a teacher-chosen reward and a shared celebration (Khan Gem Challenge) | High: cooperative goal structure, relatedness, no ranking | Very low | **Default ON** |
| 2 | **Class roster**: first name or nickname plus profile icon, "who's in my class" | Medium (belonging) | Low | ON (names only) |
| 3 | **Fixed reactions** on a classmate's shared milestone ("Nice tone", "Clean!", "Keep going"), from a set list with no free text | Medium (encouragement, low cost) | Low | ON |
| 4 | **Practice buddy / duet streak inside the class**, paired by the teacher or by mutual opt-in | High for teens (peers drive motivation) | Low–medium | Opt-in, teacher can disable |
| 5 | **Random-team class challenges** (Quizlet Live style), scored on accuracy or improvement, not speed alone | High (cooperation, mixed ability) | Low | Teacher-launched |
| 6 | **Structured peer listening**: hear a classmate's submitted take and leave two stars and a wish **from chips tied to the assignment's criteria**, or a Lerman-style "what struck me" plus a neutral question | High (learning to hear quality, Nguyen) | Medium (exposing a recording, unkind feedback) | Off by default; teacher enables per assignment; author opts in to share; **teacher approves before the author sees it** |
| 7 | **Studio recital**: the teacher picks takes to showcase to the class | High (performance goal, pride) | Medium | Teacher-curated only, author consent |
| 8 | **Nudge a classmate** using the existing preset nudges | Low–medium | Medium (nagging, pressure) | Only between mutual friends or buddies; rate-limited |
| 9 | **Class leaderboard** | Mixed: helps the top, hurts the low performers | Medium–high | Off by default. If on: **effort or improvement metric**, **relative view** (neighbours only) or top-N without the bottom shown, nickname option, student can hide self |
| 10 | **Free-text comments** | Medium | High (bullying, under-13 disclosure) | Teens only, teacher approval queue; never for under-13 |
| 11 | **DMs / chat between classmates** | Low (other channels exist) | High | **Never** (BandLab retired its chat) |

### (b) Recommended defaults

**On by default:** class roster (first name or nickname + icon); class goal; fixed reactions on milestones; the teacher sees everything.
**Off by default, teacher can enable:** peer listening on submissions (per assignment, the author opts in, teacher approves feedback); recital showcase; buddy pairs and duet streaks; team challenges; leaderboard (effort metric, relative view); free text for students 13+ through an approval queue.
**Student controls (always):** hide me from the board; nickname instead of real name; don't share my takes; leave a buddy pair; report.
**Teacher controls:** a master "classmates can see…" panel (roster / goal / reactions / recordings / board), each part separate; silent mute per student; delete any reaction or comment; reshuffle teams; rotate the join code with an expiry date.
**Hard rules:** no DMs; no free text for under-13s; nothing from the class leaks into the public weekly league or the friends graph unless the student adds the friend themselves (a friend request inside the class could need teacher permission for minors, as in Duolingo for Schools); class data stays out of public profiles; reports go to the teacher and to the platform.

### (c) Anti-patterns

1. A whole-class **absolute score leaderboard**, especially one showing the bottom ranks (it demotivates low performers, and competition overall shows no net performance gain).
2. Ranking on **minutes alone**. It is easy to game and rewards free time, and it clashes with the app's rule that only measured, clean practice counts. Rank on clean takes, improvement or effort-quality instead.
3. **Speed-only** class races. Quizlet deliberately chose accuracy over speed.
4. Peer feedback as an open comment box. Without a structure tied to criteria it turns into "nice!" or something unkind.
5. Showing a classmate's raw takes or mistakes **by default**.
6. Chat or DMs between minors; join codes that never expire; a class quietly connecting to the public social graph.
7. Nudges that pressure ("X is ahead of you", "your class is waiting on you") or that push students to lower their privacy settings. The Children's Code forbids the latter.
8. Shaming that is visible to the class, such as a broken class streak blamed on named students. Class goals should only ever add up; never name the person who didn't contribute.
9. Treating every age the same. Peer features matter more for teenagers; for under-13s keep only the cooperative and reaction features.
