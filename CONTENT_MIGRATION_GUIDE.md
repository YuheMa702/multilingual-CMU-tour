# Multilingual CMU Tour — Content Contributor Guide

**Who this is for:** CMU students, staff, and other contributors updating tour audio, subtitles, photos, stop names, or student stories. **You usually do not need to edit JavaScript or CSS.**

> **The short version:** Put media files in the correct folder, use the standard filename, edit a small metadata file when needed, and run `npm run check` before committing.

## 1. Where everything goes

All editable tour content is under `public/content/`:

```text
public/
└── content/
    ├── audio/                  # Stop narrations and student-story recordings
    │   ├── stop--gates--en.mp3
    │   └── story--julia-research-1--zh.mp3
    ├── transcripts/            # Timed subtitle files (WebVTT)
    │   ├── stop--gates--en.vtt
    │   └── story--julia-research-1--zh.vtt
    ├── images/                 # Stop slides and student-story photos
    │   ├── stop--gates--001.jpg
    │   ├── stop--gates--002.jpg
    │   └── story--julia-research-1--zh.jpg
    └── metadata/
        ├── stops.tsv           # Stop IDs, menu order, stop names
        ├── stories.tsv         # Story IDs, speakers, language, titles and row order
        ├── ui.json             # Language settings and interface translations
        ├── generated.json      # Generated automatically; DO NOT edit
        └── validation-report.txt  # Generated automatically; DO NOT edit
```

**Only three files are routinely edited by hand:** `stops.tsv`, `stories.tsv`, and `ui.json`. Audio, transcripts, and images are managed by adding, replacing, renaming, or deleting files in their respective folders.

## 2. Understand the filenames first

All managed media filenames follow a predictable pattern. Use **lowercase letters/numbers**, **hyphens within IDs**, and **two hyphens (`--`) between fields**.

| Content | Filename pattern | Example |
| --- | --- | --- |
| Stop audio | `stop--<stop-id>--<language>.mp3` | `stop--gates--en.mp3` |
| Stop transcript | `stop--<stop-id>--<language>.vtt` | `stop--gates--zh.vtt` |
| Stop photo | `stop--<stop-id>--<number>.jpg` | `stop--gates--001.jpg` |
| Story audio | `story--<story-id>--<language>.mp3` | `story--julia-research-1--en.mp3` |
| Story transcript | `story--<story-id>--<language>.vtt` | `story--julia-research-1--en.vtt` |
| Story photo (numbered) | `story--<story-id>--<language>--<number>.jpg` | `story--julia-research-1--zh--001.jpg` |

- `en` means **English**; `zh` means **Chinese**. Supported/visible language codes are defined in `ui.json` (not in a separate language TSV).
- Stop photos are **shared across languages**: name them `stop--gates--001.jpg`, **not** `stop--gates--en--001.jpg`.
- Number stop photos `001`, `002`, `003`, etc. Their filename numbers determine slideshow order. Prefer consecutive numbering starting from `001`.
- Story photos are **language-specific** and may contain **multiple numbered images per language**: `story--julia-research-1--zh--001.jpg`, `story--julia-research-1--zh--002.jpg`, etc. Their numeric order controls the slideshow, and the first image is the thumbnail in the story rail.
- **Backward compatibility:** existing unnumbered images such as `story--julia-research-1--zh.jpg` still work as picture `001`. Do not place both this legacy filename and a numbered `--001` image for the same story and language; the build will reject the duplicate.
- Accepted file types: audio `.mp3`, `.wav`, `.ogg`, `.m4a`; transcripts `.vtt`; images `.jpg`, `.jpeg`, `.png`, `.webp`. Use the **actual** extension of your file and keep it lowercase. **MP3 is recommended** for reasonable upload/deployment sizes.
- IDs are stable identifiers, not display titles. For example, the ID `julia-research-1` stays the same even if you change the displayed title from “Getting Involved in Research” to something else.

**Important:** Renaming a file to `.mp3` or `.jpg` does **not** convert its format. Export/convert the actual media when changing file types.

## 3. `stops.tsv` — tour stops and menu order

**File:** `public/content/metadata/stops.tsv`

It has one row per stop, with four columns:

```tsv
id	order	en	zh
welcome-center	3	Coulter Welcome Center	欢迎中心
gates	4	Gates and Hillman Centers	Gates 与 Hillman 中心
```

| Column | Meaning | What you may change |
| --- | --- | --- |
| `id` | Permanent internal stop identifier; also used in media filenames | **Avoid changing** after content exists |
| `order` | Numeric position in the menu and Previous/Next Stop navigation | Change to reorder stops |
| `en` | English display name | Change freely |
| `zh` | Chinese display name | Change freely |

**To change the tour route/order:** Change the `order` numbers. They must be **positive, unique integers**; the file's row order does **not** control the tour sequence. For example, swapping `3` and `4` for two stops swaps their menu positions.

**To rename a stop:** Change only the `en` or `zh` display name. Keep the `id` unchanged, so existing audio/photo filenames continue working.

**To add a new stop**, for example Hunt Library:

1. Add a row to `stops.tsv` using an unused ID and order number. For example, if your current last order is `15`:

   ```tsv
   hunt-library	16	Hunt Library	亨特图书馆
   ```

2. Put at least **one** matching narration recording into `audio/`, for example `stop--hunt-library--en.mp3`.
3. Optionally add `stop--hunt-library--zh.mp3`, matching `.vtt` transcripts, and `stop--hunt-library--001.jpg`, `002.jpg`, etc.
4. Run `npm run check` at the repository root and test the new stop.

A stop must have at least **one audio recording** or the build fails. Missing optional photos display a built-in placeholder. A Chinese visitor can still open a stop that has only English narration: the app falls back to the English recording and its matching transcript.

> **Starting stop vs. menu order:** The first page after onboarding is determined by `defaultStopId` in `ui.json` (currently `welcome-center`). Changing the smallest `order` number does **not** automatically change the starting stop.

## 4. `stories.tsv` — student stories, languages, and titles

**File:** `public/content/metadata/stories.tsv`

It has **exactly four columns**, in this order:

```tsv
id	speaker	language	title
```

There is **no `order` column**. Each row represents **one recording in one language**.

| Column | Meaning | Example |
| --- | --- | --- |
| `id` | Stable story ID; must match its audio/transcript/photo filenames | `julia-research-1` |
| `speaker` | Name shown below the story title | `Julia` |
| `language` | Language code from `ui.json` | `en` or `zh` |
| `title` | Display title **in that language** | `Getting Involved in Research` / `参与研究` |

### The two rules for organizing stories

1. **Keep each language in one continuous block:** all `en` rows together, followed by all `zh` rows. Do not alternate English/Chinese rows. (Other supported languages, when added, need their own continuous blocks.)
2. **The row order *within each language block* is the story order shown in the app.** Rearrange lines inside the English block to reorder English stories; rearrange lines inside the Chinese block to reorder Chinese stories. You do not need to renumber anything.

For example, this is a valid **short excerpt** (your real file contains many more entries):

```tsv
id	speaker	language	title
eric-campus-din-2	Eric	en	Campus Dining
julia-research-1	Julia	en	Getting Involved in Research
sally-study-abroad-2	Sally	en	Studying Abroad in Paris
julia-research-1	Julia	zh	参与研究
sally-study-abroad-2	Sally	zh	在巴黎留学
```

Notice that `julia-research-1` occurs twice: once in English and once in Chinese. This is intentional. Each variant has its own title and matching audio. **The speaker must be consistent for the same story ID across languages.**

**Every stop displays the same student-story collection**, filtered to the language selected by the visitor. English visitors see stories with English recordings; Chinese visitors see stories with Chinese recordings. A story without a Chinese recording does **not** appear in the Chinese story list. The stop's own introduction is **not** a student-story card; the “Back to Introduction” button returns to it.

### Add a new English story

Suppose a student named Maya records a story about the art club:

1. Choose a new unique ID, such as `maya-art-club-1`.
2. Upload the audio file as `public/content/audio/story--maya-art-club-1--en.mp3`.
3. Add the following row **inside the English (`en`) block** of `stories.tsv`, at the position where it should appear:

   ```tsv
   maya-art-club-1	Maya	en	Joining the Art Club
   ```

4. Optionally add `transcripts/story--maya-art-club-1--en.vtt` and `images/story--maya-art-club-1--en.jpg`.
5. Run `npm run check`. Maya's English story will appear at **every stop**.

### Add its Chinese version later

1. Upload `audio/story--maya-art-club-1--zh.mp3`.
2. Add this row **inside the Chinese (`zh`) block**:

   ```tsv
   maya-art-club-1	Maya	zh	参加艺术社团
   ```

3. Optionally add `transcripts/story--maya-art-club-1--zh.vtt` and `images/story--maya-art-club-1--zh.jpg`.
4. Run `npm run check`. The Chinese recording and Chinese title now appear for Chinese visitors.

You can change a title by editing the `title` cell only. To remove a recording from the story list, remove that language's row and also delete/archive its corresponding audio and optional caption/photo files **outside the managed folders**; otherwise the build will flag unregistered files. If you remove all variants of a story, it disappears in every language.

**Do not add a TSV story row before uploading its matching audio file:** the build requires `story--<id>--<language>.<audio-extension>` for every registered story-language row.

## 5. `ui.json` — language choices and fixed interface text

**File:** `public/content/metadata/ui.json`

This JSON file holds:

| Setting | What it controls |
| --- | --- |
| `defaultLanguage` | Starting language (`en` in this project) |
| `defaultStopId` | Stop opened after onboarding (`welcome-center` currently) |
| `languages` | Language codes, native/display names, and whether each language appears in the app |
| `ui.en`, `ui.zh`, etc. | Text for buttons, menu labels, onboarding instructions, playback controls, and error messages |

The demo currently enables **English and Chinese**. Spanish remains defined but is hidden with `"enabled": false`.

### Hide or show a language

Find the language inside the `languages` section. For example:

```json
"languages": {
  "en": { "native": "English", "enabled": true, "labels": { "en": "English", "zh": "英语" } },
  "zh": { "native": "中文", "enabled": true, "labels": { "en": "Chinese", "zh": "中文" } },
  "es": { "native": "Español", "enabled": false, "labels": { "en": "Spanish", "zh": "西班牙语" } }
}
```

*This is a simplified excerpt, not a complete replacement for `ui.json`.* Change only the relevant `enabled` value; **do not delete other UI settings**. Keep English enabled because the content builder requires it as the default/fallback language.

### Change a menu/button label

To rename “Student Stories”, edit the English text under `ui.en`; edit the Chinese version under `ui.zh`:

```json
"relatedStoriesTitle": "Student Stories"
```

```json
"relatedStoriesTitle": "学生故事"
```

The **key** (`relatedStoriesTitle`) must stay the same. Change only the **value** on its right.

For onboarding text, edit the three strings in the `onboardingSlides` array for each language. Keep the same number of slides unless a developer also changes the onboarding UI.

**JSON editing rules:** Use straight double quotes (`"`), keep commas between entries, do **not** add comments or trailing commas, and preserve the existing braces. Unlike TSV, JSON is syntax-sensitive. A code editor such as VS Code makes mistakes easier to spot.

### Adding another language in the future

This is a larger content update, but it still should not require changing application JavaScript:

1. Add a new language code and its labels under `languages` in `ui.json` (initially set `"enabled": false`). Add `ui.<code>` translations for ordinary interface text.
2. Add a column for that language's **stop display names** to `stops.tsv` (for example, `ko` for Korean). This column is not added to `stories.tsv`, which uses one `language` cell per recording.
3. Add a **contiguous new language block** to `stories.tsv` with each available story recording, language code, and translated title.
4. Upload audio/transcripts/story photos with the new `--<code>` suffix. Stop photos stay language-independent.
5. Enable the language in `ui.json`, run validation, and test thoroughly.

Missing UI translations can fall back to English, but please complete translations before public release. **Stories do not fall back to other languages**: a story appears only when a matching recording and TSV row exist.

## 6. Photos and transcripts: common tasks

### Add or replace a stop slideshow photo

- To add another Gates photo, check the existing numbers first: if the last one is `005`, upload `images/stop--gates--006.jpg`. Each filename determines slideshow order.
- To replace an existing photo, replace the file with another valid image of the **same filename and actual file format**.
- If you remove a photo, consider renumbering the remaining photos to avoid gaps; the builder warns about missing sequence numbers.
- **No `images.json` file is needed.** The build automatically discovers images from their filenames.
- Stop images do **not** need `en` or `zh` suffixes.

### Add or replace a student-story photo

Upload one or more pictures for the desired story and language. For example:

```text
images/story--julia-research-1--en--001.jpg
images/story--julia-research-1--en--002.jpg
images/story--julia-research-1--en--003.jpg
images/story--julia-research-1--zh--001.jpg
```

- The lowest numbered image is used as the thumbnail in the student-story rail.
- Opening a story shows **all** its pictures using the existing slideshow, in numeric order.
- Number pictures consecutively from `001` to avoid numbering-gap warnings.
- A single picture works normally. If the story has no pictures, its existing placeholder displays.
- Image lists are separate for each language. If both English and Chinese need the same photograph, provide a correctly named file for each language.
- **Older single-image filenames are still accepted**, for example `story--julia-research-1--en.jpg`, and act like `--001`. You can add `--002` and later images without renaming the old file. Never include both an unnumbered image and a numbered `--001` for the same story/language.
- As with stop images, you do not edit `stories.tsv` or `generated.json` simply to add photos. Run `npm run check` and refresh the browser.

The existing story-card appearance, slideshow arrows, pagination dots, and responsive styling remain unchanged.

### Add a transcript (subtitles)

Put a `.vtt` file in `transcripts/` matching its recording's type, ID, and language. For example:

`audio/story--maya-art-club-1--en.mp3` → `transcripts/story--maya-art-club-1--en.vtt`

Use standard **WebVTT** timing, including a `WEBVTT` header and a blank line before the first cue:

```vtt
WEBVTT

00:00:00.000 --> 00:00:03.000
Hello! I'm Maya.

00:00:03.000 --> 00:00:06.500
I want to tell you about the art club.
```

The app highlights lines in sync with playback. Make sure the timings match the recording. If subtitles are unavailable, the player shows a localized “No transcript available” message. Missing `.vtt` files are reported as **warnings**, not fatal errors.

## 7. How to check changes locally (Ubuntu)

Use **Node.js 22 or newer**. From the repository root, run:

```bash
cd ~/multilingual-CMU-tour
node --version
npm run check
```

`npm run check` regenerates the content catalog and runs automated tests. If all is well, it reports **zero failed tests**. The generated output and diagnostics are:

- `public/content/metadata/generated.json` — used by the app; **never hand-edit**.
- `public/content/metadata/validation-report.txt` — lists nonfatal warnings such as missing photos or transcripts; **never hand-edit**.

To read the warning report:

```bash
cat public/content/metadata/validation-report.txt
```

Then start the Express server:

```bash
cd server
npm install   # first time only
npm start
```

Open **http://localhost:3000** in a browser. The server's `prestart` script regenerates the content manifest automatically; you can also run `npm run build` at the repository root whenever you edit content while the server is already running. **Refresh the browser** afterward to load the new catalog.

**Manual checks before committing:**

- The new/edited stop appears with the correct English and Chinese names and menu order.
- Next/Previous Stop follows `stops.tsv` order.
- English shows only English student stories and titles; Chinese shows only Chinese stories and titles.
- Audio plays; transcript highlighting follows the narration; photos appear, or placeholders appear if photos are missing.
- Long story titles and stop names still fit on your phone; playing transcripts should not force the webpage to scroll.

## 8. Saving and publishing changes

If you use a spreadsheet editor, **export/save TSV as UTF-8 tab-separated text**, not `.xlsx` or CSV. **Do not** insert tabs/newlines inside titles or add extra spreadsheet columns. Preserve the first header row exactly. In `stories.tsv`, keep all rows for each language together.

Before opening a pull request or pushing:

```bash
cd ~/multilingual-CMU-tour
npm run check
git status
```

Commit the edited metadata and media files. You should not commit `generated.json` or `validation-report.txt` (they are intentionally ignored by Git).

On a push/merge to `main`, GitHub Actions uses Node.js 22 to **build the manifest, run tests, and deploy `public/` to GitHub Pages**. A validation error stops deployment; fix it locally and push again. Avoid committing large original WAV files: GitHub normally rejects individual files over 100 MB. Use compressed MP3 where possible.

## 9. Troubleshooting cheat sheet

| What you see | What to check |
| --- | --- |
| `stories.tsv ... expected 4 columns` | Make sure header is exactly `id`, `speaker`, `language`, `title`, separated by **tabs**; no `order` column. |
| `stories must be grouped together` | Move all `en` rows into one block and all `zh` rows into another; do not interleave them. |
| `registered but its audio file is missing` | A `stories.tsv` row has no matching `story--<id>--<language>.mp3` (or supported audio format). |
| `not in metadata TSV` or `not registered in stories.tsv` | A media filename contains a missing/incorrect ID or story-language combination. Fix the filename or metadata row. |
| `duplicate story/language variant` | Keep only one row for each story ID and language. |
| `duplicate stop order` | Every stop's `order` number must be unique. |
| Stop/story image is missing | Check `images/` filenames. Missing images are normally okay: a placeholder should appear. |
| Photo numbering gap warning | Rename numbered stop pictures consecutively, starting at `001`. |
| English audio plays on a Chinese **stop introduction** | That stop has no Chinese narration; the stop player intentionally falls back to an available language. |
| A student story is missing in Chinese | Check that its `zh` row **and** `story--<id>--zh` audio exist. Stories are never language-fallback recordings. |
| Subtitles do not show | Confirm `.vtt` exists, is valid WebVTT, and matches the audio's ID/language. |
| Old menu/title still appears | Run `npm run build` (or restart Express) and refresh the browser; make sure you edited the correct metadata file. |
| App says it cannot load its content | Run `npm run check`, check for build errors, and serve through Express/HTTP rather than opening `index.html` as a local file. |

If the validator prints **ERROR**, fix the issue before publishing. If it prints **WARNING**, review it: missing optional photos/subtitles may be intentional, but missing or inaccurate content should still be tracked for a future update. The validator checks **filenames and metadata**, not the editorial accuracy or actual playback quality of every media file; always do a brief browser/phone test.

---

**Simple rule to remember:** **ID in metadata = ID in filename. Language in `stories.tsv` = language in the story's audio filename. Stop order = numeric `order`; story order = row order within its language block.**
