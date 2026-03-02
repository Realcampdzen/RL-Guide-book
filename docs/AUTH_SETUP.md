# Auth Setup (M15)

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `AUTH_SECRET` | Yes | HMAC secret for verification codes |
| `AUTH_JWT_SECRET` | Yes | JWT signing secret |
| `AUTH_GENERATE_SECRET` | Yes | Secret for `/api/auth/generate-code` |
| `DEV_EMAILS` | No | Comma-separated emails that auto-get `developer` role |

Example `.env`:
```
AUTH_SECRET=your-hmac-secret-here
AUTH_JWT_SECRET=your-jwt-secret-here
AUTH_GENERATE_SECRET=your-generate-secret-here
DEV_EMAILS=stepa@gmail.com,test@example.com
```

## OAuth Providers (Supabase Dashboard)

### Google
1. Supabase Dashboard → Authentication → Providers → Google
2. Create OAuth credentials at [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
3. Redirect URI: `https://<project>.supabase.co/auth/v1/callback`

### Yandex
1. Create app at [Yandex OAuth](https://oauth.yandex.ru/)
2. Callback URL: `https://<project>.supabase.co/auth/v1/callback`

### VK ID
1. Create app at [VK Developers](https://dev.vk.com/)
2. Redirect URI: `https://<project>.supabase.co/auth/v1/callback`

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/auth/me` | JWT or X-Device-Id | Current user profile + permissions |
| PATCH | `/api/auth/me` | JWT or X-Device-Id | Update nickname / avatar_url |
| POST | `/api/auth/link-device` | JWT or X-Device-Id | Link legacy device_id |
| POST | `/api/dev/switch-role` | developer only | Switch role temporarily |
| GET | `/api/dev/users` | developer only | List all users |
| PATCH | `/api/dev/users/<id>/role` | developer only | Change user role |
