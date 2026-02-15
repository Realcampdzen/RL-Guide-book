# Резервная реализация каруселей «Избранное» и «В пути»

В этой папке сохранена полная копия реализации двух каруселей карточек на вкладке «В пути» профиля:

- **Избранное** — горизонтальная карусель-цилиндр (21 слот), значки с кнопкой удаления из избранного.
- **В пути** — горизонтальная карусель-цилиндр (21 слот), вертикальные карточки 9:16 со звездой, аватаром значка, кнопками «Составить план» и «Подтвердить», футером (корзина, переход к значку).

Компоненты содержат собственное состояние вращения карусели; при подключении не нужно добавлять в ProfileView `carouselRotationSteps` и `pathCarouselRotationSteps`.

## Как снова подключить карусели

### 1. Импорты в ProfileView.tsx

В начале файла (рядом с остальными импортами) добавьте:

```ts
import FavoritesCarouselBackup from '../profile-carousels-backup/FavoritesCarouselBackup';
import PathCarouselBackup from '../profile-carousels-backup/PathCarouselBackup';
import '../profile-carousels-backup/carousels-backup.css';
```

Либо подключите CSS в точке входа стилей (например, в `main.tsx`):

```ts
import './profile-carousels-backup/carousels-backup.css';
```

### 2. Замена контента в renderTabsPanel() при activeTab === 'active'

Найдите блок с `activeTab === 'active'` и внутри `active-tab-content` замените текущую разметку блока «В пути» на:

```tsx
{activeTab === 'active' && (
  <div className="active-tab-content fade-in">
    <div className="active-tab-content__favorites-wrap">
      <FavoritesCarouselBackup
        favorites={favorites}
        badgeLookupMap={badgeLookupMap}
        getBaseId={getBaseId}
        toggleFavorite={toggleFavorite}
        onNavigateToBadge={onNavigateToBadge}
        icons={Icons}
      />
    </div>
    <div className="active-tab-content__badges-list">
      <PathCarouselBackup
        activeLevels={activeLevels}
        badgeLookupMap={badgeLookupMap}
        badges={badges}
        getBaseId={getBaseId}
        isFavorite={isFavorite}
        toggleFavorite={toggleFavorite}
        onNavigateToBadge={onNavigateToBadge}
        onOpenPlan={({ id, title, level, criteria, nameExplanation, skillTips, confirmation }) => {
          setPlanFormBadge({
            id,
            title,
            level,
            criteria: criteria || undefined,
            nameExplanation,
            skillTips,
            confirmation,
          });
          setPlanForm({
            currentDay: Math.min(21, Math.max(1, userData?.diaryProgress?.currentDay ?? 1)),
            shiftLength: 21,
            squadProgramGrid: '',
            squadPlan3d: '',
            campProgram3d: '',
            priority: 'both',
            myPlanDraft: '',
          });
          setPlanResult(null);
          setPlanError(null);
          setPlanStep('context');
          setPlanChecklistItems([]);
        }}
        onOpenProof={({ id, title }) => {
          setProofForm({ learned: '', impact: '', link: '' });
          setProofPhotoCount(0);
          if (proofPhotoInputRef.current) proofPhotoInputRef.current.value = '';
          setProofBadge({ id, title });
        }}
        removeRoute={removeRoute}
        userData={userData}
        proofPhotoInputRef={proofPhotoInputRef}
        icons={Icons}
      />
    </div>
  </div>
)}
```

### 3. Что должно быть в ProfileView

Данные и обработчики, которые уже есть в ProfileView и передаются в бэкап:

- `favorites` — из `userData?.favorites ?? []`
- `activeLevels` — `Object.entries(progress).filter(([_, p]) => p.status === 'in_progress')`
- `badgeLookupMap`, `badges` — из контекста/данных
- `getBaseId` — функция обрезки id до baseId (например `1.2.3` → `1.2`)
- `isFavorite(baseId)` — проверка, что baseId в избранном
- `toggleFavorite(baseId)` — добавить/убрать из избранного
- `onNavigateToBadge(baseId)` — переход к странице значка
- `setPlanFormBadge`, `setPlanForm`, `setPlanResult`, `setPlanError`, `setPlanStep`, `setPlanChecklistItems` — для модалки «Составить план»
- `setProofBadge`, `setProofForm`, `setProofPhotoCount` — для модалки «Подтвердить»
- `proofPhotoInputRef` — ref на input для фото в форме подтверждения
- `removeRoute(baseId)` — удалить значок из пути
- `userData` — данные пользователя (для currentDay в плане)
- `Icons` — объект с компонентами иконок (Star, Trash, Send, ArrowLeft, ArrowRight, XCircle и т.д.), чтобы не дублировать константы

Если при смене UI из ProfileView были удалены состояния `carouselRotationSteps` и `pathCarouselRotationSteps`, возвращать их не нужно — бэкап-компоненты хранят шаг вращения у себя.

### 4. Где используется

Тот же `renderTabsPanel()` вызывается:

- в обычном режиме профиля (список табов «В пути / Коллекция / Журнал»);
- в кабине (spaceship) на стартовом экране hub при `panelActiveView === null`.

После подстановки бэкап-компонентов обе карусели появятся в обоих местах в том же виде.
