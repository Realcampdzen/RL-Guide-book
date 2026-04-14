# Squad Corner Readiness (M3-SC-S1)

Единый read-model статус заполненности:
- `empty` — нет валидных текстов и нет валидных фото.
- `partial` — есть хоть какие-то валидные поля, но не выполнен критерий ready.
- `ready` — заполнены минимум 2 текстовых поля + минимум 1 валидное фото.

## Нормализация
Перед расчётом readiness:
- trim строк,
- пустые/null/не-строки игнорируются,
- фото считаются только если value начинается с `data:` или `http`.

## Source of truth
- `src/utils/squadCornerReadiness.ts`

Mapper для UI-chip:
- `getSquadCornerReadinessLabel`
- `getSquadCornerReadinessTone`

Требование: все UI-точки отображают readiness только через этот util.
