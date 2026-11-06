export const IMPORT_PROMPT = `Convert the source into one guitar version.
Return JSON with title, artist, concertKey, timeSignature, bpm, tuning, suggestedCapo, tabRelativeToCapo, and sections.
Each section has name, optional notes, and parts.
A part is kind "chart" or "tab".
Chart parts use ChordPro: chords in brackets, for example [Am]hello [G]world.
Transcribe the complete lyrics of every section, line by line, exactly as written. Do not summarize, shorten, translate, or skip repeated verses.
Place each chord in brackets directly before the syllable where the chord changes, for example [D]Eines weiß ich ge[G]nau.
When the source prints chords on their own line above the lyrics, attach each chord to the syllable below its position.
Keep lyric lines that have no chords as plain text lines.
Lines with only chords, such as intros and interludes, become a line of bracketed chords, for example [D] [G] [D] [Asus4].
Put strumming patterns in the part's strumming field using D, U, x, and - (for example D-DU-UDU), never in the chart text.
Bar grids use lines like | Em | G D |.
Chord symbols are English (B, Bb), never German H.
concertKey is the sounding key. suggestedCapo is only a display hint.
If the source says Capo N and prints the easy shapes, keep those shapes and set suggestedCapo to N. Do not transpose them.
When existing section ids are provided, also return mapping: an array aligned with sections, each value an existing section id or null for a new section.
Tab parts use measures of beats. A beat is {d, notes} where d is the note length (1 whole, 2 half, 4 quarter, 8 eighth, 16 sixteenth, 32), dot: true makes it dotted, rest: true with empty notes is a rest, and chord is a chord name that starts on that beat.
Each note is {s, f} where s is the string (1 is the highest string) and f the fret. t is an optional technique: h hammer-on, p pull-off, b bend (bend is the number of semitones), / slide up, \\ slide down, ~ vibrato.
Each measure's beats should add up to the time signature. When the source shows no rhythm, use eighth notes and set rhythmGuessed true on the part.
Set tabRelativeToCapo true only when the tab fret numbers are written relative to a capo.
Do not invent frets that are not in the source.
Do not move notes to a different string.
Unknown chord text stays as written.`
