# OAuth setup for Read and Voice

Use this checklist to connect the real Facebook, Google, LINE, and Apple login buttons.

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

## Google OAuth

Create an OAuth 2.0 Client ID in Google Cloud Console.

Authorized JavaScript origin:

```text
http://localhost:5173
```

Authorized redirect URI:

```text
http://localhost:3000/api/auth/oauth/google/callback
```

Add to `backend/.env`:

```env
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

The backend requests these scopes:

```text
openid email profile
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

## Apple Sign In

Apple needs an Apple Developer account.

Create:

- App ID with Sign in with Apple enabled
- Services ID for web login
- Private key for Sign in with Apple

Return URL:

```text
http://localhost:3000/api/auth/oauth/apple/callback
```

Add to `backend/.env`:

```env
APPLE_CLIENT_ID=your-services-id
APPLE_TEAM_ID=your-team-id
APPLE_KEY_ID=your-key-id
APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
```

You can also provide `APPLE_CLIENT_SECRET` directly instead of `APPLE_TEAM_ID`, `APPLE_KEY_ID`, and `APPLE_PRIVATE_KEY`.

## Test

Restart the backend after changing `.env`.

Open the login page and click each provider button:

```text
http://localhost:5173/login
```

Expected flow:

1. The browser leaves Read and Voice and opens the provider consent screen.
2. The provider returns to the matching backend callback URL.
3. The backend creates or finds the user account.
4. The backend redirects to `/oauth/callback`.
5. The frontend saves the token and redirects by role.

If a provider is not configured, Read and Voice redirects back to `/oauth/callback` with a setup error message.
