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
5. Deploy the Firestore rules before the web application. Authentication uses
   the React Firebase SDK directly and the rules permit a signed-in user to
   create only their own tightly validated customer profile.
6. Register the web app with Firebase App Check using reCAPTCHA Enterprise,
   set `VITE_FIREBASE_APP_CHECK_SITE_KEY` in the production build environment,
   and enable enforcement for the remaining Cloud Functions. Local development
   can use a registered `VITE_FIREBASE_APP_CHECK_DEBUG_TOKEN`.
7. Create the single administrator as an Email/Password user in the Firebase
   console with the login email `admin@prideelectronics.in`. Generate a unique
   password of at least 16 characters with a password manager; never store it
   in this repository, an environment file, or chat.
8. Assign the server-only custom claim with Application Default Credentials or
   a narrowly controlled service-account credential available to the Admin SDK:

   - Create a dedicated service account in Google Cloud IAM for project
     `ecommerce-78081` and grant only **Firebase Authentication Admin**.
   - Create a temporary JSON key and store it outside this repository.
   - Set the key path only in the current PowerShell session:

   ```powershell
   $env:GOOGLE_APPLICATION_CREDENTIALS = 'C:\secure\firebase-admin-key.json'
   ```

   ```powershell
   cd functions
   npm run set-admin
   ```

   After the command succeeds, clear the environment variable, delete the key
   in Google Cloud IAM so it cannot be reused, and securely remove the local
   JSON file:

   ```powershell
   Remove-Item Env:\GOOGLE_APPLICATION_CREDENTIALS
   ```

   The script removes legacy admin/role/permission claims from every other
   Firebase user, then assigns only `admin: true` to the selected account. To
   intentionally use a different address, pass it as the sole argument:

   ```powershell
   npm run set-admin -- another-admin@example.com
   ```

   Revoked refresh tokens prevent former administrators from obtaining new
   privileged ID tokens, but an ID token already issued by Firebase can remain
   valid for up to one hour. After replacing an existing administrator, wait
   that hour before treating the single-admin cutover as complete.
9. Require multi-factor authentication for the administrator account in the
   production Identity Platform configuration.

After changing claims, sign out and sign in again so Firebase issues a new ID
token. To reset the password, enter the administrator email on `/admin`, choose
**Forgot password?**, and complete the Firebase email flow. A Firebase console
password reset is also safe. Never send or record the password in plaintext.
