# Firebase Authentication production checklist

Firebase Authentication provider configuration is managed in the Firebase
console for this project. The Firebase CLI used by this repository does not
recognize a top-level `auth` block in `firebase.json`.

Before deploying production authentication:

1. Enable Email/Password and Google in **Authentication > Sign-in method**.
2. Set the Google OAuth brand name and a monitored support email.
3. Add every production hostname, without a protocol or port, under
   **Authentication > Settings > Authorized domains**.
4. Enable email-enumeration protection and configure the required password
   policy.
5. Register the web app with Firebase App Check using reCAPTCHA Enterprise,
   set `VITE_FIREBASE_APP_CHECK_SITE_KEY` in the production build environment,
   and enable enforcement for Cloud Functions. Local development can use a
   registered `VITE_FIREBASE_APP_CHECK_DEBUG_TOKEN`.
6. Configure a Firestore TTL policy for `_authRateLimits.expiresAt` so expired
   phone-login rate-limit records are removed automatically.
7. Provision administrators with trusted permission claims by running:

   ```powershell
   cd functions
   npm run set-admin -- admin@example.com "Store Administrator"
   ```

   Built-in roles receive their predefined permissions. A custom role must
   include a comma-separated fourth argument containing its permission IDs.
8. Require multi-factor authentication for administrator accounts in the
   production Identity Platform configuration.

After changing claims, the administrator must sign out and sign in again so a
new ID token is issued.
