---
name: badge-images
description: Add or fix badge/category images — map category, normalize paths, generate WebP, run verification. Use when adding a new category's images or fixing missing/broken badge icons.
---

# Изображения значков (badge images)

Use this skill when adding images for a new category, fixing missing icons, or ensuring every JPG/PNG has a WebP sibling.

## When to Use

- Adding a new category's images under `public/Новые значки/`
- Fixing a badge or level image not showing in the UI
- Regenerating or verifying WebP siblings

## Workflow (new category)

1. **Map category** in [src/utils/badgeImages.ts](../../src/utils/badgeImages.ts):
   - Add `'<categoryId>': '<folder name>'` to `categoryFolderMap`.
   - Folder name must match the folder under `public/Новые значки/` (usually lowercase, e.g. `'5': 'за отрядные дела'`).

2. **Folder/file names:** Prefer normalizing assets to match `normalizeFolderName()` (lowercase, ё→е, no special chars). If Windows EPERM blocks rename, add a **code exception** in `getBadgeFolderName()` or `getBadgeImagePath()` (e.g. base file name for one badge) in the same file.

3. **WebP:**  
   - Add the category folder to `targetDirs` in [scripts/verify-webp-siblings.mjs](../../scripts/verify-webp-siblings.mjs).  
   - Run `npm run images:webp` to generate `.webp` for all `.jpg`/`.png` (except `*.orig.*`).  
   - Run `npm run verify:webp` — must pass (build depends on it).

4. **Check UI:** Restart dev server if needed, open category and badges (hard refresh Ctrl+F5 if cache hides new images).

## Path Convention

- Base: `public/Новые значки/<categoryFolder>/<badgeFolder>/`
- Files: `1 <level name>.jpg` (and optional `реализм/` subfolder for realism variant).
- `badgeImages.ts` builds paths from category id, badge title, level id/title; normalization and exceptions must match actual folder/file names on disk.

## Reference

Details and pitfalls: [AGENT_REPO_GUIDE.md](../../../AGENT_REPO_GUIDE.md). Scripts: [scripts/generate-webp.mjs](../../scripts/generate-webp.mjs), [scripts/verify-webp-siblings.mjs](../../scripts/verify-webp-siblings.mjs).
