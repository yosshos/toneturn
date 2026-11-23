# Translation guide for The 7th Sense

This guide is for whoever translates `i18n/source.json` into a catalog in `public/i18n/<locale>.json`. The same rules
apply to Claude and to a native reviewer. The catalog maps each English text to its translation. The reasons behind
the setup are in `docs/SPEC-I18N.md`.

## Must

- **Fill-ins** such as `{0}`, `{1}`, `{name}` or `{n}` stay exactly as written. You may move them inside the sentence
  if the language needs a different word order. Never translate them or drop them.
- **Never translate these:**
  - chord symbols (Cmaj7, G7♭9, Dm7♭5, C/E);
  - Roman numerals (ii–V–I, ♭VII, V/V);
  - scale-degree numbers (♭3, 9, ♯11);
  - tempo marks (♩ = 120);
  - version numbers;
  - URLs;
  - keyboard keys.
- **Never translate names:**
  - the app's name *The 7th Sense*;
  - the coach *Toni*;
  - names of people (Barry Harris, Hanon…);
  - titles of songs, standards, books and records;
  - product names (MIDI, MusicXML, iReal Pro, MuseScore).
- **Keep it short.** Every exercise must fit one phone screen. Make a translation no more than about 30% longer than
  the English. Buttons and labels should be one to three words.
- **Match the English punctuation and form.** A label stays a label, a question stays a question. Keep leading and
  trailing symbols (·, :, …, →).
- **Return valid JSON only:** `{ "<English text exactly as given>": "<translation>" }`, every text in the batch, in
  the same order.

## Tone

- **Voice:** a calm, serious music teacher, not a children's game. No exclamation-mark hype and no emoji. Use the
  informal "you" the way music apps do:
  - es: tú;
  - pt-BR: você;
  - fr: tu;
  - de: du;
  - it: tu;
  - ja: plain です/ます;
  - ko: 해요체;
  - zh: 你.
- **Spanish:** neutral Latin-American (no vosotros).
- **Chinese:** Simplified, mainland usage.
- **Plural and gender:** when the English is built around a number ("{0} bars"), write the form that fits that kind
  of number. If the language needs separate forms, prefer wording that avoids the problem ("Bars: {0}").

## Note names in prose

Chord symbols always stay as letters. Note names written as words in a sentence follow the language:

| Locale | In prose | Example: "C major", "B♭" |
|---|---|---|
| es, it, pt, fr | fixed do: Do Re Mi Fa Sol La Si (fr: Do or Ut, use Do) | Do mayor, Si♭ |
| de | letters with German H: B natural = H, B♭ = B | C-Dur, B |
| ja, ko, zh | letters, as jazz musicians in those countries use them | C メジャー / C 장조 / C 大调 |

The app swaps note names on its own wherever it draws a note. This rule covers only notes spelled out inside a
sentence.

## Music vocabulary

Jazz players in every one of these countries use some English words as they are. **Keep these in English:**

- swing, groove, feel, voicing, comping, lick, riff, walking bass, turnaround, shout chorus, call and response,
  shuffle, backbeat, ghost note, fill, break, vamp, standard, lead sheet, chorus (as in a jazz chorus), montuno,
  guajeo, clave, tumbao, bossa nova, samba, cha-cha, bolero, mambo, second line;
- the Barry Harris terms: "6th diminished scale", "the family", "rule".

Where a term has a local form, add the English in brackets **the first time it appears in a lesson-length text
only**. Translate the rest with standard music-school terms:

| English | es | pt-BR | fr | de | it | ja | ko | zh |
|---|---|---|---|---|---|---|---|---|
| ear training | entrenamiento auditivo | percepção musical | formation de l'oreille | Gehörbildung | educazione dell'orecchio | 聴音 / イヤートレーニング | 청음 | 练耳 |
| interval | intervalo | intervalo | intervalle | Intervall | intervallo | 音程 | 음정 | 音程 |
| chord tone | nota del acorde | nota do acorde | note de l'accord | Akkordton | nota dell'accordo | コードトーン | 코드 톤 | 和弦音 |
| scale | escala | escala | gamme | Tonleiter | scala | スケール | 스케일 | 音阶 |
| key (tonality) | tonalidad | tom / tonalidade | tonalité | Tonart | tonalità | キー / 調 | 조 | 调 |
| bar / measure | compás | compasso | mesure | Takt | battuta | 小節 | 마디 | 小节 |
| beat | pulso / tiempo | tempo / pulso | temps | Schlag / Zählzeit | movimento | 拍 | 박 | 拍 |
| tempo | tempo | andamento | tempo | Tempo | tempo | テンポ | 템포 | 速度 |
| sight reading | lectura a primera vista | leitura à primeira vista | déchiffrage | Vom-Blatt-Spiel | lettura a prima vista | 初見 | 초견 | 视奏 |
| fretboard / neck | diapasón / mástil | braço | manche | Griffbrett | tastiera / manico | 指板 | 지판 | 指板 |
| fret | traste | traste | case / frette | Bund | tasto | フレット | 프렛 | 品 |
| level (rank) | nivel | nível | niveau | Stufe | livello | レベル | 레벨 | 等级 |
| unit (course) | unidad | unidade | unité | Einheit | unità | ユニット | 유닛 | 单元 |
| streak | racha | sequência | série | Serie | serie | 連続記録 | 연속 기록 | 连续天数 |
| league | liga | liga | ligue | Liga | lega | リーグ | 리그 | 联赛 |
| path | camino | trilha | parcours | Lernpfad | percorso | ラーニングパス | 학습 경로 | 学习路径 |
| take (recording) | toma | take | prise | Take | take | テイク | 테이크 | 录音 |
| colour note (Ear course) | nota de color | nota de cor | note de couleur | Farbton | nota di colore | カラートーン | 컬러 톤 | 色彩音 |
| avoid note | nota a evitar | nota a evitar | note à éviter | Avoid-Ton | nota da evitare | アヴォイドノート | 어보이드 노트 | 避免音 |
| tritone substitution | sustitución tritonal | substituição de trítono | substitution tritonique | Tritonussubstitution | sostituzione di tritono | 裏コード | 트라이톤 대리 | 三全音替代 |

**Solfège syllables** used as ear-training answers (movable do, "do re mi", "do–sol") stay in the target language's
usual solfège spelling, even in de, ja, ko and zh.

## Not in this guide

If a text is unclear without its screen, translate it literally and keep it short. The native reviewer fixes these.
Every catalog stays marked beta in the app until that review is done.
