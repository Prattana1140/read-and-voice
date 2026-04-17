# OAuth setup for Read and Voice

Read and Voice currently supports these real social login providers:

- LINE Login
- Facebook Login

## Local URLs

Frontend:

```text
http://localhost:5173
```

Backend:

```text
http://localhost:3000
```

Add these to `backend/.env`:

```env
FRONTEND_URL=http://localhost:5173
API_PUBLIC_URL=http://localhost:3000
```

## LINE Login

Create a LINE Login channel in LINE Developers.

Callback URL:

```text
http://localhost:3000/api/auth/oauth/line/callback
```

Add to `backend/.env`:

```env
LINE_CLIENT_ID=your-line-channel-id
LINE_CLIENT_SECRET=your-line-channel-secret
```

The backend requests these scopes:

```text
openid profile email
```

## Facebook Login

Create an app in Meta for Developers and enable Facebook Login.

Callback URL:

```text
http://localhost:3000/api/auth/oauth/facebook/callback
```

Add to `backend/.env`:

```env
FACEBOOK_CLIENT_ID=your-facebook-app-id
FACEBOOK_CLIENT_SECRET=your-facebook-app-secret
```

The backend requests these scopes:

```text
email,public_profile
```

## Test

Restart the backend after changing `.env`.

Open the login page:

```text
http://localhost:5173/login
```

Expected flow:

1. Click LINE Login or Facebook Login.
2. The browser opens the provider consent screen.
3. The provider returns to the matching backend callback URL.
4. The backend creates or finds the user account.
5. The backend redirects to `/oauth/callback`.
6. The frontend saves the token and redirects by role.

Check provider setup status:

```text
http://localhost:3000/api/auth/oauth/status
```
