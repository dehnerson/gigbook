export const TEXT_MODEL = 'gemini-2.5-flash'
export const VISION_MODEL = 'gemini-2.5-flash'

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
Tab parts use measures of events. Each note is {string, fret} where string 1 is the highest string.
Set tabRelativeToCapo true only when the tab fret numbers are written relative to a capo.
Do not invent frets that are not in the source.
Do not move notes to a different string.
Unknown chord text stays as written.`
