# Runner Game — study-guide trivia runner

A browser-based, study-guide trivia runner built for our own med school content (MEDS3002, MEDS2003, and whatever we add next). Hit a topic block, answer a multiple-choice question, push through the stages without running out of life — or skip the running entirely and use Study & Practice for untimed, filterable revision.

No build step, no server, no install. Every file here is a plain HTML/JS file — double-click and it runs.

## What's in this repo

| File | What it is |
|---|---|
| `medsci-runner.html` | **The game itself.** Landing screen, Runner mode, Study & Practice, Custom Run, Group Race. This is what you send someone who just wants to play. |
| `game-data.js` | **All the content.** Every course, topic, theme, item, and question lives in this one file as plain data. The game and the developer tool both read it — nothing else needs touching to change what's playable. |
| `developer-tool.html` | **The content editor.** Add, edit, or delete items and questions through a form instead of hand-writing JavaScript. Generates code ready to paste into `game-data.js`, or (for the maintainer) can merge everything queued into a complete, ready-to-replace copy of the file in one click. |
| `icons/`, `images/` | Image assets referenced by items in `game-data.js`. |

All three files (plus the two asset folders) need to sit in the **same folder** — the game and the dev tool both load `game-data.js` via a relative path, and won't find it otherwise.

## Running it

Just open `medsci-runner.html` in a browser. That's the whole setup. It works fully offline — Group Race needs an internet connection to sync between devices, but solo Runner, Study & Practice, and Custom Run don't need anything beyond the files themselves.

## How the content is structured

Four independent tags, not a strict tree:

- **Course** — a real university course (`MEDS3002`), broken into **Classes** (individual lectures, e.g. `L14`).
- **Topic** — a discipline (`genetics`, `immunology`, ...). Global and flat — the same topic can be reused across different themes without being "owned" by any one of them.
- **Theme** — the playable bundle a person picks on the landing screen (`Cancer`, `Biochemistry`). Each theme has its own topics and items.
- **Item** — one drug, mutation, checkpoint, or concept. Carries `theme`, `topic`, `course`, and `class` as independent tags, plus its own nested list of **questions**.

So a single item might be filed as: theme `cancer`, topic `genetics`, course `MEDS3002` class `L14` — four separate tags, not four levels of nesting. This is what makes Custom Run possible (mix-and-match any combination of theme/topic/course) without duplicating content.

Full storage shape:

```
THEMES
 └─ <theme>
     └─ topics
         └─ <topic>
             └─ items
                 └─ <item>
                     ├─ label, description, mechanism, funFacts, hashtags, images, refs
                     ├─ course, class            (optional — inherited by nested questions by default)
                     └─ questions[]              (each optionally overriding course/class)
```

## Adding content

Two ways in, both landing in the same place:

### 1. `developer-tool.html` — one at a time, with a live preview

Open it, pick **New item**, **New question**, or **New theme**. Every field mirrors the real game's styling in a live preview panel, so what you see is what it'll actually look like — not a guess. Existing content (theme/topic/course/hashtag) is picked from dropdowns wherever possible, so typos can't silently create a near-duplicate category.

**Editing or deleting** existing content also lives here — check "I'm editing an existing item" and pick it from the dropdown to prefill the form, or use the delete controls to remove a question or an entire item. Both are gated behind the maintainer PIN (see below) since they're the two genuinely destructive actions in the tool.

### 2. CSV import — for bulk-adding questions to one existing item

Inside the New Question tab, there's a "Bulk-add questions from CSV" section: pick the item once, paste CSV text (`prompt,optionA,optionB,optionC,optionD,correct,explanation,hashtags`), and every valid row becomes its own queue entry — no re-clicking through the same dropdowns forty times. A Google Sheets template matching this exact format is included in the project files for anyone who'd rather fill in a spreadsheet and export it than type into a web form.

### The shared queue

Everything added — new items, edits, deletions, questions, new themes — lands in a **team queue**, synced live via Firebase so everyone working on this sees the same list in real time (falls back to local-only if there's no connection; nothing breaks, it just stops being shared until reconnected). Review it, delete anything wrong, leave the rest.

## Merging into the real file (maintainer only)

At the bottom of `developer-tool.html` is a **maintainer section**, locked behind a 4-digit PIN (see `MAINTAINER_PIN` near the top of the `<script>` block — **change it from the default before handing this file to anyone**, it's plain text in the source and only meant to stop accidental clicks, not determined snooping).

Once unlocked: **Generate merged game-data.js** takes everything currently in the queue and folds it into a complete, ready-to-paste copy of the file — themes, topics, and items included. It's validated as real JavaScript before it's ever shown to you, so a broken merge fails loudly with an error instead of silently corrupting the file. Copy or download the result, replace `game-data.js`, and push.

The merge only touches `COURSES`, `TOPICS`, and `THEMES` — everything else in the file (`GAME_CONFIG`, `LIFE_CONFIG`, `STAGES`, header comments) is carried through from a template, untouched, every time. That template only needs manual refreshing if you've hand-edited one of those sections directly, bypassing the tool entirely — routine content merges never touch it.

## Distributing updates

Git is push-only for the maintainer here — contributors pull, they don't push directly. After merging a batch:

```
git add game-data.js
git commit -m "merge: <short description of what was added>"
git push
```

Everyone else runs `git pull` and their copy of `medsci-runner.html` picks up the new content automatically — it just reads whatever `game-data.js` is sitting next to it. `developer-tool.html` does the same, so contributors always see the current state of the game without anyone needing to send files around by hand.

## Known limitations, worth knowing before relying on them

- **Group Race caps out fast.** The Firebase project backing it is on the free tier — 100 simultaneous connections *total*, shared across everyone using the game at once, not per room. Fine for a few friends racing; not built for a lecture hall.
- **The maintainer PIN is a deterrent, not security.** It's readable in the page source by anyone who opens dev tools. It stops accidental destructive clicks, not a determined bypass.
- **`sessionStorage`/`localStorage` can be unavailable** in some browsers for local `file://` pages (Firefox and Safari are stricter about this than Chrome). The tool degrades gracefully if so — PIN unlock just won't persist across a reload — rather than breaking.
- **The merge tool only replays queue entries added after the merge feature shipped.** Anything older only has its display text, not structured data, and gets skipped (with a clear count shown) rather than guessed at.
