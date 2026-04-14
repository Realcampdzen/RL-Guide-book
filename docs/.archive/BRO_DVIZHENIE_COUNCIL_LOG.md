# Бро-движение, Бро-отряд и Совет Лагеря — концепция и лог

## Концепция (сводка)

На примере Движков есть ещё одна важная сущность и объединение и линейка значков и прокачки. Это **Бро Движение** и формат **Бро Отряда**. Там отдельные значки, это те кто проходят курс изучения вожатского мастерства и проходят педагогическую практику и теорию в лагере, вступить в эту линейку можно только после прохождения отрядного **Бросвящения**, есть соответствующий значок и в этом механика Бро движения.

Также не забываем про **Совет Лагеря**, как высший координационный центр Реального Лагеря, как объединения игроков в рамках программы смены, пространства смены и лагеря и виртуальной смены, которую создает Путеводитель выстраивая взаимодействия между участниками, движками, вожатыми, организаторами смен и т.д.

---

## Лог (команды и правки)

- Ran rg -n "Бро|Броотряд|Бросвящ|Bro" -S public/ai-data
- Ran rg -n "Бро|Броотряд|Бросвящ|Bro" -S WORKFLOW_GAME_CONCEPT_PLAN.md
- Ran rg -n "Совет Реального Лагеря|Совет" -S public/ai-data/category-8
- Ran rg -n "Совет Реального Лагеря|Совет" -S WORKFLOW_GAME_CONCEPT_PLAN.md
- Ran Get-Content public/ai-data/category-9/index.json -TotalCount 260
- Ran Get-Content public/ai-data/category-9/introduction.md -TotalCount 160
- Ran rg -n "Бросвящ" -S public/ai-data/category-9
- Ran rg -n "Бросвящ" -S public/ai-data/category-10
- Ran Get-Content public/ai-data/category-9/9.1.json -TotalCount 260
- Ran Get-Content public/ai-data/category-9/9.2.json -TotalCount 260
- Ran Get-Content public/ai-data/category-10/10.3.json -TotalCount 260
- Ran Get-Content public/ai-data/category-10/index.json -TotalCount 120
- Ran Get-Content public/ai-data/category-9/9.3.json -TotalCount 260
- Ran Get-Content public/ai-data/category-9/9.4.json -TotalCount 260
- Ran Get-Content public/ai-data/category-9/9.10.json -TotalCount 260
- Ran Get-Content public/ai-data/category-8/8.6.json -TotalCount 220
- Ran rg -n "галст|Брогалстук|Бродел|Бропаспорт|посвящ" -S public/ai-data/category-9
- Ran Get-Content public/ai-data/category-9/9.9.json -TotalCount 260
- Ran Get-Content public/ai-data/category-9/9.8.json -TotalCount 260
- Ran Get-Content public/ai-data/category-9/9.6.json -TotalCount 260
- Ran Get-Content public/ai-data/category-9/9.7.json -TotalCount 260
- Ran $p='WORKFLOW_GAME_CONCEPT_PLAN.md'; $l=Get-Content $p; $start=240; $end=330; for($i=$start;$i -le $end;$i++){"{0,5}: {1}" -f ($i+1), $l[$i]}
- Ran $p='WORKFLOW_GAME_CONCEPT_PLAN.md'; $l=Get-Content $p; $start=296; $end=318; for($i=$start;$i -le $end;$i++){"{0,5}: {1}" -f ($i+1), $l[$i]}
- Edited file d:\Development\Путеводитель web_new\WORKFLOW_GAME_CONCEPT_PLAN.md (+9 -4): Бро-Движение (Bro Movement), Совет Реального Лагеря, Реальный Вожатый
- Ran $p='WORKFLOW_GAME_CONCEPT_PLAN.md'; $l=Get-Content $p; $start=580; $end=640; for($i=$start;$i -le $end;$i++){"{0,5}: {1}" -f ($i+1), $l[$i]}
- Ran $p='WORKFLOW_GAME_CONCEPT_PLAN.md'; $l=Get-Content $p; $start=780; $end=830; for($i=$start;$i -le $end;$i++){"{0,5}: {1}" -f ($i+1), $l[$i]}
- Edited file d:\Development\Путеводитель web_new\WORKFLOW_GAME_CONCEPT_PLAN.md (+3 -0): Движки/Движения, пост-MVP Движения/Совет, FEATURE_AUTH_ROLES_DVIZHKI_PLAN.md
- Ran rg -n "^## 2\) Словарь" -n docs/FEATURE_AUTH_ROLES_DVIZHKI_PLAN.md; rg -n "^## 6\) «Движки»" -n docs/FEATURE_AUTH_ROLES_DVIZHKI_PLAN.md; rg -n "^## 7\) Отряд" -n docs/FEATURE_AUTH_ROLES_DVIZHKI_PLAN.md
- Ran $p='docs/FEATURE_AUTH_ROLES_DVIZHKI_PLAN.md'; $l=Get-Content $p; $start=30; $end=80; for($i=$start;$i -le $end;$i++){"{0,5}: {1}" -f $i, $l[$i-1]}
- Ran $p='docs/FEATURE_AUTH_ROLES_DVIZHKI_PLAN.md'; $l=Get-Content $p; $start=132; $end=210; for($i=$start;$i -le $end;$i++){"{0,5}: {1}" -f $i, $l[$i-1]}
- Ran rg -n "^### 7\.3" -n docs/FEATURE_AUTH_ROLES_DVIZHKI_PLAN.md; $p='docs/FEATURE_AUTH_ROLES_DVIZHKI_PLAN.md'; $l=Get-Content $p; $start=210; $end=280; for($i=$start;$i -le $end;$i++){"{0,5}: {1}" -f $i, $l[$i-1]}
- Ran rg -n "^## 11\) Roadmap" -n docs/FEATURE_AUTH_ROLES_DVIZHKI_PLAN.md; $p='docs/FEATURE_AUTH_ROLES_DVIZHKI_PLAN.md'; $l=Get-Content $p; $start=300; $end=360; for($i=$start;$i -le $end;$i++){"{0,5}: {1}" -f $i, $l[$i-1]}
- Edited file FEATURE_AUTH_ROLES_DVIZHKI_PLAN.md (+58 -1): Движение (Movement), Бро-движение, Бросвящение, Бро-отряд, Совет Лагеря; секции 6.6–6.8, 7.4; roadmap
- Ran rg -n "6\.6\.|Бро‑движение|Council Pack|7\.4\." docs/FEATURE_AUTH_ROLES_DVIZHKI_PLAN.md
- Ran rg -n "Бро|Бросвящ|Движение \(Movement\)|Каноничный значок" WORKFLOW_GAME_CONCEPT_PLAN.md
- Ran $p='WORKFLOW_GAME_CONCEPT_PLAN.md'; $l=Get-Content $p; $start=1240; $end=1335; for($i=$start;$i -le $end;$i++){"{0,5}: {1}" -f ($i+1), $l[$i]}
- Edited file d:\Development\Путеводитель web_new\WORKFLOW_GAME_CONCEPT_PLAN.md (+23 -0): Context [Movements (Bro) & Council Packs], Backend Gate for Chat
- Ran rg -n "^### 9\.10\. Экосистема" WORKFLOW_GAME_CONCEPT_PLAN.md; rg -n "Бро‑отряд \(формат отряда\)" WORKFLOW_GAME_CONCEPT_PLAN.md; ...
- Обновил SSOT под Бро‑движение/Бро‑отряд/Совет; расширил сущности экосистемы; добавил в пост‑MVP; дополнил чек‑лист Этапа 8; добавил контекст для агента; FEATURE_AUTH_ROLES_DVIZHKI_PLAN.md термины и секции 6.6–6.8, 7.4
- Важное уточнение: в public/ai-data нет отдельного значка «Бросвящение» (есть правило доступа в introduction.md). Маркер входа в Бро‑трек: (A) unlock‑флаг «после Бросвящения» (код от вожатого) или (B) первый достигнутый брозначок (например 9.1)?
- 2 files changed +93 -5 (WORKFLOW_GAME_CONCEPT_PLAN.md, FEATURE_AUTH_ROLES_DVIZHKI_PLAN.md)
- Тема: картинки значков многих категорий; в папках «реализм» есть картинки; не подтягивать чтобы не сломать код, или учесть что там где значков ещё нет они будут добавлены как в категориях 1–6. Точка входа в Бро тему — со значка Бросвящение. Когда дети получат доступ — запросы на подтверждение Бросвящения; если значка нет в линейке брозначков и нет значка с Бросвящением в описании — добавить такой значок либо кнопку для подтверждения доступа к категории.
- Ran Get-ChildItem public -Force | Select-Object Name,Mode
- Ran Get-ChildItem public -Recurse -Directory -Force | Where-Object { $_.Name -match 'realism' } | Select-Object -First 40 FullName
- Ran rg -n "realism" -S src public docs
- Ran Get-Content src/utils/badgeImages.ts -TotalCount 240
- Ran Get-Content src/utils/badgeImageMap.ts -TotalCount 260
- Ran Get-Content src/components/BadgeIcon.tsx -TotalCount 260
- Ran Get-Content docs/badge-images-guide.md -TotalCount 240
- Ran rg -n "Бросвящение|посвящени" -S public/ai-data
- Ran Get-Content docs/badge-page-images-guide.md -TotalCount 220
- Ran rg -n "Бросвящ" -S "Путеводитель.txt" | Select-Object -First 40
- Ran rg -n "profile\.id" -S src | Select-Object -First 50
- Ran Get-Content src/views/CategoryView.tsx -TotalCount 220
- Ran rg -n "Введение|onIntroductionClick|Доп\. материалы|onAdditionalMaterialClick|Бро" src/views/CategoryView.tsx
- Ran $p='src/views/CategoryView.tsx'; $l=Get-Content $p; $start=220; $end=520; ...
- Ran rg -n "badges\.map|badge-grid|badge-list|badge-card" src/views/CategoryView.tsx
- Ran $p='src/views/CategoryView.tsx'; $l=Get-Content $p; $start=520; $end=700; ...
- Ran rg -n "bro|бро|unlock|entitl" src/context/ProgressContext.tsx src/views/ProfileView.tsx
- Ran Get-Content src/styles/category-view.css -TotalCount 220
- Ran rg -n "\.category-hero\b|\.category-actions\b|\.action-btn\b|\.badges-grid" src/styles/category-view.css | Select-Object -First 80
- Ran $p='src/styles/category-view.css'; $l=Get-Content $p; $start=330; $end=520; ...
- Ran Get-ChildItem "public/Новые значки" -Directory -Force | Select-Object Name,FullName
- Ran Get-ChildItem "public/Новые значки" -Recurse -Directory -Force | Where-Object { $_.Name -eq 'реализм' } | Select-Object -First 40 FullName
- Ran $p='src/context/ProgressContext.tsx'; $l=Get-Content $p; $start=260; $end=560; ...
- Ran $p='src/context/ProgressContext.tsx'; $l=Get-Content $p; $end=[Math]::Min(120,$l.Length); for($i=0;$i -lt $end;$i++){"{0,5}: {1}" -f ($i+1), $l[$i]}
