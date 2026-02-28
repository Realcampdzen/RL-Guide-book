# REPORT_D_GIT_SIZE_REDUCTION

**Агент:** D (Infra/Release/Operations)  
**Дата:** 2026-02-28  
**Ветка:** `agent-d/git-size-reduction`  
**Base:** `main @ 9e9a2e2`  
**Статус:** ✅ DONE

---

## Задача

Убрать JPG и .orig.* файлы из git tracking в `public/Новые значки/`, чтобы GitHub Pages deploy artifact
не превышал лимит 1 GB.

---

## Диагноз (от оркестратора)

Репо весит 2.22 GiB в git pack. GitHub Actions: checkout → build → upload-pages-artifact → GitHub Pages
режет на 1 GB. Причина: в git лежат три набора файлов одновременно:

| Набор | Файлов | Размер на диске |
|-------|--------|-----------------|
| JPG badge images (`public/Новые значки/`) | 583 | ~1.4 GB |
| WEBP badge images (`public/Новые значки/`) | 534 | ~183 MB |
| `.orig.*` backups (`public/Новые значки/`) | 68 | ~193 MB |
| **Итого** | **1185** | **~1.78 GB** |

---

## Deliverable 1 — .gitignore

Добавлены три строки в `.gitignore` после `!public/Валюша.jpg`:

```
# Badge images — only WebP tracked; JPG/orig stay local only
public/Новые значки/**/*.jpg
public/Новые значки/**/*.jpeg
public/Новые значки/**/*.orig.*
```

---

## Deliverable 2 — git rm --cached

Убраны из git index (без удаления с диска) все JPG/orig в `public/Новые значки/`:

```
Files removed from index: 583
  - JPG badge images: 515
  - .orig.jpg backups: 68
Errors: 0
```

Проверка после удаления:
```
Новые значки в индексе: 538 файлов
  JPG: 0
  WEBP: 534
  .orig.*: 0
Всего tracked: 1038 (было 1621)
```

---

## Deliverable 3 — Frontend update

**`src/utils/badgeImages.ts`** — изменены 3 строки:

| Было | Стало |
|------|-------|
| `fileName = \`${levelNumber} ${levelFileName}.jpg\`` | `.webp` |
| `fileName = '1 шерлок.jpg'` | `.webp` |
| `fileName = \`1 ${baseLevelName}.jpg\`` | `.webp` |
| JSDoc comment (`.jpg`) | `.webp` |

**`src/utils/badgeImageMap.ts`** — 356 hardcoded путей:

- `.jpg` → `.webp` во всех 356 override entries

---

## Deliverable 4 — Build verification

`npm run build` — ✅ 0 errors, built in 1m 21s

> **Важно:** Локальный билд всё ещё включает JPG-файлы из disk (они есть локально, Vite копирует с диска,
> не из git index). На GitHub Actions после `git checkout` на диске будут только tracked файлы — т.е.
> только WEBP. Именно там deploy artifact уменьшится до ~200-250 MB.

---

## Ожидаемый результат на CI

| Метрика | До | После |
|---------|-----|-------|
| Git-tracked файлов | 1621 | 1038 |
| dist/ на GitHub Actions | ~2.2 GB | ~250 MB |
| GitHub Pages deploy | FAIL (>1 GB) | ✅ PASS |
| Основной формат badge image | JPG (с WebP source в `<picture>`) | WebP напрямую через `<img src>` |

---

## Что НЕ тронули

- `public/pictures/` PNG (~420 MB на диске, ~230 tracked) — не является первопричиной
- История git (BFG/filter-branch) — старые blobs остаются в pack, новые коммиты будут лёгкими
- `generate-webp.mjs` — оставлен без изменений

---

## Связанные файлы

| Файл | Изменение |
|------|-----------|
| `.gitignore` | +3 строки (exclude Новые значки JPG/orig) |
| `src/utils/badgeImages.ts` | 4 строки: `.jpg` → `.webp` |
| `src/utils/badgeImageMap.ts` | 356 строк: `.jpg` → `.webp` |
| `docs/PROD_ROADMAP_IMPL/CLAIM_BOARD.md` | +1 запись |
