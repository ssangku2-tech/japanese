# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

하루、일본어 ("Haru, Japanese") — a single-page PWA for learning basic Japanese vocabulary via spaced repetition (Leitner system). No build step, no package manager, no test suite. It's four files deployed as static assets (via GitHub Pages, per `.nojekyll`).

## Rules

- 앱 로직은 단일 `index.html` 구조를 유지한다. 별도 JS 프레임워크나 번들러를 도입하거나 로직을 다른 파일로 쪼개지 말 것 (`words.js`/`firebase-config.js`처럼 데이터·설정 분리는 기존 구조상 예외).
- `index.html`, `words.js`, `manifest.json`, 아이콘 등 캐시 대상 파일을 수정하면 반드시 `sw.js`의 `CACHE` 버전 문자열을 올릴 것.
- 커밋 메시지는 한국어로 작성한다.
- 이 저장소에서 작업할 때 대화는 한국어로 한다.

## Development

There is no build/lint/test tooling. To work on this app:
- Open `index.html` directly in a browser, or serve the directory with any static file server (needed for the service worker to register correctly, since `sw.js` requires an http(s) origin, not `file://`).
- After changing any cached asset (`index.html`, `words.js`, `manifest.json`, icons), bump the `CACHE` version string in `sw.js` (e.g. `nihongo-v1` → `nihongo-v2`), otherwise returning users keep getting stale files from the service worker cache.
- Changes are verified manually in-browser — there is no automated test runner.

## Architecture

Everything except vocabulary data and Firebase config lives inline in `index.html` (styles in a `<style>` block, app logic in a `<script>` block at the bottom). Load order: `words.js` → `firebase-config.js` (optional, sync disabled if missing/fails to load) → inline script.

- **`words.js`** — the vocabulary bank: a flat `WORDS` array of `{w, r, m, c, k}` objects (`w`=written form, `r`=reading in kana if `w` is kanji, `m`=Korean meaning, `c`=category label, `k:1`=katakana loanword flag). Array order is learning order — new words are always pulled from the front of the unlearned portion. Adding vocabulary means appending entries here.
- **`index.html` inline script** — all app state and logic:
  - **Persistence**: plain `localStorage` via a small `store` wrapper, three keys: `jpv_progress` (per-word Leitner box `b` 0–5 and next-due date `n`), `jpv_taps` (per-kana-character tap counts, used for the "frequently checked characters" stat), `jpv_log` (per-day study counts, used for streaks). No IDs — words are referenced by their index into `WORDS`, so **never reorder or delete entries from the middle of `WORDS`**; only append, or existing users' saved progress will point at the wrong word.
  - **SRS scheduling**: `INTERVALS = [0,1,3,7,21]` days per box; box 5 = mastered (`n` set to a sentinel far-future date). Correct answer advances box + schedules next review; wrong answer resets to box 1 and requeues the card later in the same session (`wrongSet`/`queue.push`).
  - **Kana → romaji**: `segment()` breaks a kana string into tap-able units (handling small-kana digraphs, っ (sokuon/gemination), ー (long vowel)); `BASE`/`COMBO` tables + `romaJi()`/`wordRomaji()` render romanization. This is the logic to touch if adding new kana combinations or fixing romanization edge cases.
  - **Screens**: single-page, plain DOM show/hide via a `.screen`/`.on` class toggle driven by `show(name)` — no router, no framework. Screens: home, study (flashcard), done, quiz, list (word browser with filters), stats.
  - **Sync (optional)**: if `firebase-config.js` defines `window.firebaseConfig`, `fbInit()` lazy-loads the Firebase compat SDK from a CDN and does a one-time pull-merge (last-write-wins by `u`/timestamp per word) from Realtime Database at `nihongo/progress`; `fbPush()` debounces (1.2s) pushes of the full local state on every save. Without `firebase-config.js` present, the app runs local-only and this is silently skipped.
- **`sw.js`** — offline cache (cache-first for same-origin assets, network passthrough for Firebase/fonts/TTS). Must have its `CACHE` constant bumped on every deploy that changes a cached file (see Development above).
- **`firebase-config.js`** — contains a live Firebase project config (not a secret in the traditional sense — these are client-side Firebase web keys — but it does point at a real production database used for this app's sync).

## Conventions

- All UI text and vocabulary meanings are Korean; Japanese text uses the `.jp` class (Zen Maru Gothic font) for correct rendering of kanji/kana.
- Code style throughout is dense/minified-by-hand (no semicolon-per-line formatting, short var names like `p`, `w`, `id`, `qi`). Match this style rather than reformatting — it's a deliberate single-file, no-build tradeoff, not an accident.
