# REPORT: M6-IMG-FIX — Fix Hardcoded Image Paths in TSX Components

**Агент:** B (UX/Frontend consistency)
**Branch:** agent-b/m6-img-fix
**Commit:** 482973d
**Date:** 2026-02-27
**Status:** DONE

---

## Summary

Replaced all hardcoded `/RL-Guide-book/...` absolute image paths in TSX/TSX components with `${import.meta.env.BASE_URL}...` template literals. This ensures images resolve correctly in both:
- **Dev** (`base = /`): path becomes `/Валюша.jpg`, served by `rlGuideBookDevPlugin` from `public/`
- **Production** (`base = /RL-Guide-book/`): path becomes `/RL-Guide-book/Валюша.jpg`, served correctly on GitHub Pages

---

## Audit Table — All Hardcoded `/RL-Guide-book/` in TSX

| File | Image | Fixed |
|---|---|---|
| `src/components/CategoryIcon.tsx` | `category_1.png` … `category_14.png` (14 occurrences) | ✅ |
| `src/views/IntroScreen.tsx` | `домик_AI.jpg` | ✅ |
| `src/components/CategoriesGrid.tsx` | `Валюша.webp` + `Валюша.jpg` | ✅ |
| `src/views/BadgeLevelView.tsx` | `Валюша.webp` + `Валюша.jpg` | ✅ |
| `src/views/BadgeView.tsx` | `Валюша.webp` + `Валюша.jpg` | ✅ |
| `src/views/CategoryView.tsx` | `Валюша.jpg` | ✅ |
| `src/components/ChatButton.tsx` | `Валюша.jpg` | ✅ |
| `src/components/ChatBot.tsx` | `Валюша.jpg` (×2) | ✅ |
| `src/components/ChatAvatar.tsx` | `avatarJpg` const | ✅ |

**Total fixes: 26 image path occurrences across 9 files.**

---

## Out of Scope (Intentionally Not Changed)

| Category | Reason |
|---|---|
| CSS background-image URLs in `*.css` files | Files (`screen3_bg.png`, `pattern_stickers.jpg`, `фон кабина.png`, etc.) exist in `public/RL-Guide-book/` and are served correctly in prod. CSS `url()` does not support template literal syntax. |
| `useDataLoader.ts` / `useAppController.ts` `/RL-Guide-book/ai-data/...` | Runtime JSON data fetching paths, not `<img src>` attributes. Must remain absolute for API correctness. |
| `CategoriesGrid.tsx` `getCategoryImagePath` function | Already correctly uses `import.meta.env.BASE_URL` — no change needed. |

---

## Missing Image Files Note

The following files are referenced in code but do not exist in `public/`:
- `category_1.png` … `category_14.png` — category icons for `CategoryIcon.tsx`
- `домик_AI.jpg` — logo image for `IntroScreen.tsx`
- `Валюша.jpg` / `Валюша.webp` — mascot image for chat, badge, and category views

**These files must be added manually to `public/` by the user.** The code now correctly points to `<BASE_URL><filename>`, so once the files are in `public/`, they will serve correctly in both dev and prod without further code changes.

---

## M2 Guard

Not affected. All changes are presentational `<img src>` attribute fixes only. No role logic, no auth logic, no parent/child view conditionals were modified.

---

## Build Output

```
✓ 189 modules transformed.
✅ Копирование завершено: 1440 файлов скопировано
✓ built in 2m 16s
0 errors
```

---

## Files Changed

- `src/components/CategoryIcon.tsx`
- `src/views/IntroScreen.tsx`
- `src/components/CategoriesGrid.tsx`
- `src/views/BadgeLevelView.tsx`
- `src/views/BadgeView.tsx`
- `src/views/CategoryView.tsx`
- `src/components/ChatButton.tsx`
- `src/components/ChatBot.tsx`
- `src/components/ChatAvatar.tsx`

---

## Handoff

- Once `домик_AI.jpg`, `Валюша.jpg`/`.webp`, `category_1.png`…`category_14.png` are added to `public/`, the broken images will be resolved.
- No further code changes required for image path resolution.
- Branch `agent-b/m6-img-fix` ready for merge to `main`.
