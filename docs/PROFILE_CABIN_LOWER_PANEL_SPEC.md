# Нижняя приборная панель кабины корабля

Спецификация для восстановления, если сломается.  
Страница: `profile-desktop.html` (кабина космического корабля).  
Файлы: [src/styles/profile-view-spaceship.css](../src/styles/profile-view-spaceship.css), [src/styles/mobile-bottom-nav.css](../src/styles/mobile-bottom-nav.css), [src/views/ProfileView.tsx](../src/views/ProfileView.tsx).

---

## 1. Три элемента снизу (снизу вверх)

1. **Нижняя навигация** (`mobile-bottom-nav`) — самый низ экрана
2. **Пузыри** (6 штук) — 3 слева, 3 справа
3. **Консоль-терминал** («Экран: В пути» и т.п.) — выше пузырей

---

## 2. Нижняя навигация (mobile-bottom-nav)

- **Файл:** `src/styles/mobile-bottom-nav.css`
- **Класс:** `.mobile-bottom-nav`
- **Позиция:** `position: fixed; bottom: calc(20px + env(safe-area-inset-bottom));`
- **Высота:** `var(--mobile-nav-height)` (68px, задаётся в `style-variables.css`)
- **z-index:** 1100

В кабине переопределение в `profile-view-spaceship.css` (min-width 1024px):

```css
.profile-spaceship-root .mobile-bottom-nav {
  width: min(360px, calc(100% - 32px));
  max-width: 360px;
  min-width: 260px;
}
```

---

## 3. Консоль (profile-view-console) и терминал

- **Файл:** `src/styles/profile-view-spaceship.css`
- **Контейнер:** `.profile-view-console` — общий flex-контейнер
- **Позиция консоли:** выше нижней навигации

```css
.profile-spaceship-root .profile-view-console {
  display: flex;
  position: fixed;
  bottom: calc(20px + var(--mobile-nav-height, 68px) + 24px + env(safe-area-inset-bottom));
  left: 0;
  right: 0;
  height: var(--console-height);
  padding: 0 16px;
  align-items: center;
  justify-content: center;
  gap: 16px;
  background: transparent;
  z-index: 1000;
}
```

Переменные в `.profile-spaceship-root`:
- `--console-height: 80px`
- `--console-padding: 24px`

### 3.1 Терминал (Экран: В пути)

- **Класс:** `.console-terminal`
- **Роль:** по центру, показывает текущий экран («Экран: В пути», «Экран: Коллекция» и т.д.)

```css
.profile-spaceship-root .console-terminal {
  flex: 1;
  min-width: 120px;
  max-width: 320px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 16px;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(139, 0, 255, 0.4);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.9);
  font-size: 13px;
  font-family: monospace;
}
```

### 3.2 Пузыри (console-cluster)

- **Левый кластер:** `.console-cluster--left` — 3 кнопки: Отрядный уголок, Реальный Дневник, Движок
- **Правый кластер:** `.console-cluster--right` — 3 кнопки: Совет Лагеря, БРО, Мастерская
- **Сдвиг вниз:** пузыри ниже терминала за счёт `margin-top`

```css
.profile-spaceship-root .console-cluster--left {
  flex: 0 0 auto;
  margin-top: calc(164px + env(safe-area-inset-bottom));
}

.profile-spaceship-root .console-cluster--right {
  flex: 0 0 auto;
  margin-top: calc(164px + env(safe-area-inset-bottom));
}

.profile-spaceship-root .console-cluster {
  display: flex;
  align-items: center;
  gap: 8px;
}

.profile-spaceship-root .console-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  width: 130px;
  height: 130px;
  padding: 8px;
  background: rgba(139, 0, 255, 0.2);
  border: 1px solid rgba(139, 0, 255, 0.5);
  border-radius: 50%;
  color: white;
  font-size: 10px;
  font-weight: 700;
  /* и т.д. */
}
```

---

## 4. DOM-структура (ProfileView.tsx)

```html
<div className="profile-view-console" aria-label="Пульт навигации">
  <div className="console-cluster console-cluster--left">
    <button className="console-btn">🏕️ Отрядный уголок</button>
    <button className="console-btn">📖 Реальный Дневник</button>
    <button className="console-btn">🚀 Движок</button>
  </div>
  <div className="console-terminal" aria-live="polite">
    Экран: В пути | Экран: Коллекция | Экран: Журнал | Экран: Мастерская
  </div>
  <div className="console-cluster console-cluster--right">
    <button className="console-btn">🏛️ Совет Лагеря</button>
    <button className="console-btn">🎖️ БРО</button>
    <button className="console-btn">⚒️ Мастерская</button>
  </div>
</div>
```

Нижняя навигация (`mobile-bottom-nav`) рендерится отдельно, вне консоли.

---

## 5. Восстановление при поломке

1. Проверить `profile-view-spaceship.css`: секции `.profile-view-console`, `.console-cluster`, `.console-cluster--left`, `.console-cluster--right`, `.console-terminal`, `.console-btn`.
2. Консоль: `bottom: calc(20px + var(--mobile-nav-height, 68px) + 24px + env(safe-area-inset-bottom))`.
3. Пузыри: `margin-top: calc(164px + env(safe-area-inset-bottom))` у обоих кластеров.
4. **Не трогать** `.console-terminal` — он должен оставаться по центру между пузырями.
5. Нижняя навигация: не менять её позицию при правках консоли/пузырей.
