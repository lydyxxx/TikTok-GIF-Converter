# VP9 Two-Pass Quality Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the current single-pass sticker encoder with a two-pass constrained-quality VP9 pipeline that improves visual quality for photo-like animated WebP stickers while staying within Telegram limits.

**Architecture:** Keep the existing animated WebP frame-extraction fallback, but change the actual WebM encoder path to use a deterministic two-pass libvpx-vp9 constrained-quality flow. Preserve aspect ratio, scale once with a high-quality filter, calculate bitrate cap from duration, and verify the resulting output through the same API flow used by the app.

**Tech Stack:** Node.js, TypeScript, Fastify, FFmpeg/libvpx-vp9, Vitest, sharp.

---

### Task 1: Add failing tests for the encoder contract

**Files:**
- Modify: `backend/src/tests/animated-webp.test.ts`
- Modify: `backend/src/tests/conversion.test.ts`

**Step 1: Write the failing test**

- Assert animated WebP conversion preserves aspect ratio.
- Assert output uses a deterministic downloadable file id.
- Assert encoded output remains under 256 KB.
- Assert output dimensions are `512x423` for the sample file.

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @ttgifconv/backend test src/tests/animated-webp.test.ts --run`

**Step 3: Add planning assertions**

- Assert bitrate/FPS planning helpers return sane values.

**Step 4: Run tests again**

Run: `pnpm --filter @ttgifconv/backend test src/tests/conversion.test.ts --run`

### Task 2: Implement two-pass CQ encoding

**Files:**
- Modify: `backend/src/utils/ffmpeg.ts`
- Modify: `backend/src/services/conversion.ts`

**Step 1: Extend encoder options**

- Add support for CRF-based CQ settings.
- Add support for pass 1 / pass 2 invocation.
- Keep scaling as a single `lanczos` pass.

**Step 2: Add two-pass helper**

- Implement a helper that runs FFmpeg twice using the same filter chain.
- Use duration-based bitrate cap plus CQ (`crf + b:v`).

**Step 3: Preserve output geometry**

- Keep the precomputed target width/height through compression.
- Avoid square re-scaling during follow-up passes.

**Step 4: Prefer the quality-first path**

- If first output already fits under the limit, keep it.
- Otherwise iteratively relax quality in a controlled way.

### Task 3: Verify runtime behavior

**Files:**
- Modify: `backend/src/routes/conversion.ts` only if needed

**Step 1: Run backend tests**

Run: `pnpm --filter @ttgifconv/backend test --run`

**Step 2: Run type-check**

Run: `pnpm --filter @ttgifconv/backend type-check`

**Step 3: Build backend**

Run: `pnpm --filter @ttgifconv/backend build`

**Step 4: Restart backend and verify API**

- Upload `котикl.webp`
- Convert it through `/api/convert/:fileId`
- Download through `/api/download/:fileId`
- Verify output metadata and size with `ffprobe`
