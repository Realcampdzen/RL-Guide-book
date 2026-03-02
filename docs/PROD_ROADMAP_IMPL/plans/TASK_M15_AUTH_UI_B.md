# TASK: M15-AUTH-UI-B — Экран логина + OAuth кнопки

**Агент: B (Frontend/UX)**  
**Base:** `main` (после merge A)  
**Branch:** `agent-b/m15-auth-ui`  
**Depends:** M15-AUTH-BACKEND-A

## Scope

### 1. Supabase Client

Установить `@supabase/supabase-js` (если не установлен), создать `src/utils/supabaseClient.ts`:
```typescript
import { createClient } from '@supabase/supabase-js'
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
```

### 2. LoginScreen компонент

Полноэкранный экран входа (замена текущего code-based):
- Лого + название приложения
- 3 OAuth кнопки (каждая в стиле провайдера):
  - 🔵 «Войти через Google» (белая с лого Google)
  - 🔴 «Войти через Яндекс» (красная с лого Яндекс)
  - 🔷 «Войти через VK ID» (синяя с лого VK)
- Разделитель «или»
- «Войти по email» → поле email → Magic Link → «Ссылка отправлена»
- Внизу мелким: «У меня есть код доступа» → legacy code flow

Каждая кнопка вызывает `supabase.auth.signInWithOAuth({provider: '...'})`.

### 3. Auth State Management

- `useAuth()` hook:
  - `supabase.auth.onAuthStateChange()` → обновление состояния
  - После логина: `fetch('/api/auth/me')` → загрузить profile
  - Если есть localStorage device_id → `POST /api/auth/link-device`
  - JWT хранится в Supabase SDK (автоматически)
- Logout: `supabase.auth.signOut()` → redirect на LoginScreen
- Auth guard: если не залогинен → показать LoginScreen

### 4. Интеграция

- `App.tsx`: добавить auth guard (показывать LoginScreen если не auth)
- Header: аватар + ник из profile, кнопка logout
- Все API вызовы: добавить `Authorization: Bearer ${token}` header

### 5. Адаптивность
- Mobile-first дизайн экрана логина
- Кнопки: full-width на мобильных, 400px max на десктопе

## DoD
- [ ] LoginScreen с 3 OAuth + Magic Link + legacy code
- [ ] `useAuth()` hook + auto link-device
- [ ] Auth guard в App.tsx
- [ ] `tsc --noEmit` clean
