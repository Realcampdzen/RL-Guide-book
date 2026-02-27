# REPORT_D_HOTFIX_BASE_PATH

**Агент:** D (Infra/Release/Operations)  
**Дата:** 2026-02-27  
**Ветка:** `agent-d/hotfix-base-path`  
**Base:** `main @ 358856a`  
**Статус:** ✅ DONE

---

## Проблема

На GitHub Pages производственном деплое категории бейджей были пустые.

**Root cause:** В `vite.config.ts`, плагин `copyRLGuideBookPlugin`, функция `writeBundle()`, строка 295:

```javascript
// Было:
copyDir('public', rlGuideBookDir)
```

Эта команда копировала всё содержимое `public/` в `dist/RL-Guide-book/`, включая папку `public/RL-Guide-book/` — которая копировалась как `dist/RL-Guide-book/RL-Guide-book/`. Двойной путь.

**Симптом:** Фронт запрашивал `/RL-Guide-book/ai-data/<category>/badges.json` → 404, потому что файлы лежали по адресу `/RL-Guide-book/RL-Guide-book/ai-data/...`.

Структура `public/`:
- `public/ai-data/` — данные бейджей (должны попасть в `dist/RL-Guide-book/ai-data/`)
- `public/RL-Guide-book/` — изображения (должны попасть прямо в `dist/RL-Guide-book/`, без дублирования)
- `public/pictures/`, `public/*.png` и т.д. — другие ассеты

---

## Фикс

**Файл:** `vite.config.ts` (~строка 295)

**Заменено на:**

```javascript
// Fix: public/RL-Guide-book/ must be merged INTO dist/RL-Guide-book/, not nested under it.
// Previously: copyDir('public', rlGuideBookDir) → dist/RL-Guide-book/RL-Guide-book/ (double path bug)
const rlSubDir = path.join('public', 'RL-Guide-book')
if (existsSync(rlSubDir)) {
  copyDir(rlSubDir, rlGuideBookDir)  // public/RL-Guide-book/* → dist/RL-Guide-book/
}
const publicEntries = fs.readdirSync('public', { withFileTypes: true })
for (const entry of publicEntries) {
  if (entry.name === 'RL-Guide-book') continue  // already handled above
  const src = path.join('public', entry.name)
  const dest = path.join(rlGuideBookDir, entry.name)
  if (entry.isDirectory()) {
    copyDir(src, dest)
  } else {
    copyFileWithRetry(src, dest)
  }
}
```

**Логика:**
1. Сначала — содержимое `public/RL-Guide-book/` копируется напрямую в `dist/RL-Guide-book/` (без создания подпапки `RL-Guide-book/`)
2. Затем — все остальные элементы `public/` (кроме `RL-Guide-book/`) копируются в `dist/RL-Guide-book/`

---

## Верификация билда

Запущен `npm run build` (чистый билд после удаления `dist/`):

```
✓ built in 1m 53s (0 errors)
```

**Проверки:**

| Путь | Ожидание | Результат |
|------|---------|-----------|
| `dist/RL-Guide-book/ai-data/` | EXISTS | ✅ **True** |
| `dist/RL-Guide-book/RL-Guide-book/` | NOT EXISTS | ✅ **False** |

Содержимое `dist/RL-Guide-book/ai-data/`: `category-1`, `category-2`, ... (все категории присутствуют)

---

## Изменённые файлы

| Файл | Изменение |
|------|-----------|
| `vite.config.ts` | строка 295: заменён `copyDir('public', rlGuideBookDir)` на split-логику |

---

## Риск

**Низкий.** Используется только уже определённые в scope хелперы (`copyDir`, `copyFileWithRetry`, `existsSync`, `fs`). Функциональность для остальных ассетов не изменена — они по-прежнему копируются в `dist/RL-Guide-book/`.
