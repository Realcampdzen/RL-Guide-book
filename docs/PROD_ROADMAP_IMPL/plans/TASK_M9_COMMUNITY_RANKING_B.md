# TASK: M9-COMMUNITY-RANKING-B — Community: ранжирование и подборки

**Агент: B (Frontend/UX)**  
**Base:** `main @ 833ae10`  
**Branch:** `agent-b/m9-community-ranking`

## Контекст

Workshop/UGC уже показывает пользовательские значки с лайками. Но нет «Лучшее недели», подборок по категориям, ранжирования.

## Scope

### 1. Секция «Лучшее недели» в Workshop
- Топ-5 пользовательских значков за последние 7 дней по лайкам
- Карточка: preview + title + author + likes count
- Auto-sort по `likeCount` desc

### 2. Фильтр по категориям
- Dropdown/chips для фильтрации UGC по categoryId
- «Все» по умолчанию

### 3. Карточка созидателя (Creator Card)
- При клике на автора → попап с: nickname, кол-во созданных значков, суммарные лайки
- Кнопка «Поделиться» → генерирует social card `kind: creator_highlight`

### 4. Добавить `creator_highlight` в socialGenerator
- Новый kind для share: фото профиля + «Созидатель: [nickname]» + stats

## DoD
- [ ] «Лучшее недели» отображается
- [ ] Фильтр по категориям работает
- [ ] Creator Card попап
- [ ] `creator_highlight` kind в socialGenerator
- [ ] `npm run build` clean
