# Источники чатов на диске C и экспорты

## Обнаруженные хранилища

| Источник | Путь | composerData |
|----------|------|--------------|
| **Global storage (текущий)** | `.../globalStorage/state.vscdb.backup` | 128 |
| **Corrupted backup** | `.../globalStorage/state.vscdb.corrupted.1770668685121` | **217** |
| **Workspace (Путеводитель)** | `.../workspaceStorage/8bbc87721bac.../state.vscdb` | 11 |

Corrupted backup содержит **на 89 чатов больше**, чем текущий global storage — это старый снимок БД.

## Экспорты

| Файл | Источник | Чатов |
|------|----------|-------|
| `ALL_CHATS_FROM_GLOBAL.md` | state.vscdb.backup | 115 |
| `ALL_CHATS_FROM_CORRUPTED_BACKUP.md` | state.vscdb.corrupted.* | 143 |
| `DELETED_CHATS_RECOVERED.md` | workspace backup (только этот проект) | 11 |

## Команды

```bash
# Экспорт из текущего global storage (128 чатов)
python scripts/export_all_chats_from_global.py

# Экспорт из corrupted backup (217 чатов, старые данные)
python scripts/export_all_chats_from_global.py --corrupted

# Экспорт workspace (чаты проекта Путеводитель)
python scripts/extract_deleted_chats_from_backup.py
```

## Поиск «бежевый таб»

Проведён поиск по всем экспортам (global, corrupted, workspace):
- **«бежев» / «beige»** — не найдено ни в одном чате
- В чатах есть: «фиолетовое свечение», «фуксия #FD3FC0» для активного таба, «наклонённые табы»

Если обсуждение бежевого таба было — оно либо в чате, не попавшем на диск, либо под другим формулировкой.
