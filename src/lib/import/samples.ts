export type ImportSample = { id: string; format: string; text: string }

export const IMPORT_SAMPLES: Array<ImportSample> = [
  {
    id: 'rising-sun',
    format: 'Ultimate Guitar copy-paste with header block and riff tab',
    text: `House Of The Rising Sun Chords by Traditional

Difficulty: intermediate
Tuning: E A D G B E
Capo: no capo
Key: Am

[Intro]
Am  C  D  F  Am  E  Am  E

[Verse 1]
    Am       C        D          F
There is a house in New Orleans
     Am        C       E
They call the Rising Sun
       Am        C        D          F
And it's been the ruin of many a poor boy
      Am       E        Am
And God, I know I'm one

[Riff]
e|-----0-----|-----0-----|
B|---1---1---|---1---1---|
G|-2-------2-|-2-------2-|
D|-----------|-----------|
A|0----------|-----------|
E|-----------|-----------|

[Verse 2]
     Am       C       D         F
My mother was a tailor
    Am        C      E
She sewed my new blue jeans
`,
  },
  {
    id: 'gedanken',
    format: 'German songbook: numbered verses, H notation, capo line',
    text: `Die Gedanken sind frei
Text und Musik: traditionell
Kapodaster: 2

   D                  A7      D
1. Die Gedanken sind frei, wer kann sie erraten?
            A7                    D
   Sie fliegen vorbei wie nächtliche Schatten.
      G            D        Hm
   Kein Mensch kann sie wissen, kein Jäger erschießen
     D            A7        D
   mit Pulver und Blei: Die Gedanken sind frei!

   D                  A7         D
2. Ich denke, was ich will und was mich beglücket,
         A7                 D
   doch alles in der Still, und wie es sich schicket.
`,
  },
  {
    id: 'amazing-grace',
    format: 'ChordPro file',
    text: `{title: Amazing Grace}
{artist: John Newton}
{key: G}
{time: 3/4}
{tempo: 80}

{start_of_verse: Verse 1}
A[G]mazing [G7]grace, how [C]sweet the [G]sound
That [G]saved a wretch like [D]me
I [G]once was [G7]lost, but [C]now am [G]found
Was [Em]blind, but [D]now I [G]see
{end_of_verse}

{c: Verse 2}
'Twas [G]grace that [G7]taught my [C]heart to [G]fear
And [G]grace my fears re[D]lieved
`,
  },
  {
    id: 'susanna',
    format: 'Plain chords over lyrics, no section headers',
    text: `Oh! Susanna - Stephen Foster

C                              G
I come from Alabama with my banjo on my knee
C                            G           C
I'm going to Louisiana, my true love for to see

F                 C              G
Oh! Susanna, oh don't you cry for me
C                                G          C
For I come from Alabama with my banjo on my knee

C                         G
It rained all night the day I left, the weather it was dry
C                              G            C
The sun so hot I froze to death, Susanna don't you cry

F                 C              G
Oh! Susanna, oh don't you cry for me
C                                G          C
For I come from Alabama with my banjo on my knee
`,
  },
  {
    id: 'scarborough',
    format: 'Colon headers, intro chords on the header line, metadata',
    text: `Scarborough Fair
Traditional

Key: Am
Time: 3/4
BPM: 100
Strumming: D DU DU

Intro: Am  G  Am

Verse 1:
Am               G       Am
Are you going to Scarborough Fair?
C        Am    D       Am
Parsley, sage, rosemary and thyme
Am        C         G
Remember me to one who lives there
Am         G         Am
She once was a true love of mine
`,
  },
  {
    id: 'greensleeves',
    format: 'Tab block with chord names above',
    text: `Greensleeves (Traditional)
Tuning: Standard
Time: 6/8

[Intro]
   Am                G
e|-------0-1-0-----|-----3-----------|
B|---1-----------1-|-0-----0---------|
G|-2---------------|-------------0---|
D|-----------------|-----------------|
A|-0---------------|-----------------|
E|-----------------|-3---------------|

[Verse]
Am              G
Alas, my love, you do me wrong
Am             E
To cast me off discourteously
`,
  },
  {
    id: 'swing-low',
    format: 'Bar grid, capo, repeat count on a header',
    text: `Swing Low, Sweet Chariot
Spiritual

Capo 3

[Chorus] x2
G               C      G
Swing low, sweet chariot
                         D
Coming for to carry me home

Interlude:
| G | C G | G | D |
| G | C G | G D | G |
`,
  },
  {
    id: 'danny-boy',
    format: 'Ultimate Guitar raw markup with [ch] and [tab] tags',
    text: `[Verse 1]
[tab][ch]C[/ch]          [ch]C7[/ch]       [ch]F[/ch]          [ch]C[/ch]
Oh Danny boy, the pipes, the pipes are calling[/tab]
[tab][ch]C[/ch]          [ch]Am[/ch]            [ch]D7[/ch]        [ch]G[/ch]
From glen to glen, and down the mountain side[/tab]
`,
  },
  {
    id: 'auld-lang-syne',
    format: 'Lyrics only',
    text: `Auld Lang Syne

Should auld acquaintance be forgot,
And never brought to mind?
Should auld acquaintance be forgot,
And auld lang syne?
`,
  },
  {
    id: 'saints',
    format: 'Chords inline in parentheses',
    text: `When The Saints Go Marching In

Oh when the (C)saints go marching in
Oh when the saints go marching (G)in
Oh Lord I (C)want to (C7)be in that (F)number
When the (C)saints go (G)marching (C)in
`,
  },
]
