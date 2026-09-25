# QR Class Attendance - Setup Guide (Sinhala)

මේ project එක Next.js + React + Firebase Authentication + Cloud Firestore + Vercel වලින් හදලා තියෙන්නේ.

## System flow

Student Register -> Pending -> Admin Approve -> Active -> Student ID + QR -> Admin Scan -> Student Details -> Mark Attendance -> Date/Time Save -> History

## 1. ZIP එක extract කරන්න

Project folder එක VS Code එකෙන් open කරන්න.

Terminal එකේ:

```bash
npm install
```

## 2. Firebase Project එක හදන්න

1. Firebase Console open කරන්න.
2. Create a project කරන්න.
3. Project name එක දෙන්න.
4. Project create කරන්න.

## 3. Authentication on කරන්න

Firebase Console -> Build -> Authentication -> Get started -> Sign-in method -> Email/Password -> Enable -> Save.

Google login අවශ්‍ය නැහැ.

## 4. Firestore Database හදන්න

Firebase Console -> Build -> Firestore Database -> Create database.

Database location එක ඔබට ලඟ region එකක් තෝරන්න. Start mode තෝරන විට production/locked mode තෝරාගන්න පුළුවන්; අපේ rules පසුව deploy කරනවා.

## 5. Firebase Web App එක add කරන්න

Project Settings (gear icon) -> General -> Your apps -> Web (</>) -> Register app.

Firebase config එකේ values ටික ගන්න:

- apiKey
- authDomain
- projectId
- messagingSenderId
- appId

Project folder එකේ `.env.example` file එක copy කරලා `.env.local` කියලා හදන්න.

Example:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=YOUR_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=YOUR_PROJECT.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=YOUR_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID=YOUR_APP_ID
```

## 6. Firebase Admin Service Account එක ගන්න

Firebase -> Project Settings -> Service accounts -> Generate new private key.

JSON එකේ මේ values 3 ඕන:

- project_id
- client_email
- private_key

`.env.local` එකට:

```env
FIREBASE_ADMIN_PROJECT_ID=YOUR_PROJECT_ID
FIREBASE_ADMIN_CLIENT_EMAIL=YOUR_CLIENT_EMAIL
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n"
```

IMPORTANT: service account JSON file එක GitHub එකට upload කරන්න එපා.

## 7. First Admin details දාන්න

`.env.local` එකේ:

```env
ADMIN_BOOTSTRAP_EMAIL=your-admin-email@example.com
ADMIN_BOOTSTRAP_PASSWORD=YourStrongAdminPassword123!
ADMIN_BOOTSTRAP_NAME=Main Admin
```

ඊට පස්සේ:

```bash
npm run create-admin
```

Script එක `.env.local` automatically load කරනවා.

## 8. Firestore Rules + Index deploy කරන්න

Firebase CLI install කරන්න:

```bash
npm install -g firebase-tools
```

Login:

```bash
firebase login
```

Project connect කරන්න:

```bash
firebase use --add
```

ඔයාගේ Firebase project එක select කරන්න.

Rules සහ indexes deploy කරන්න:

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

මේ step එක skip කරන්න එපා.

## 9. Local test කරන්න

```bash
npm run dev
```

Browser:

```text
http://localhost:3000
```

Test order:

1. Admin login කරන්න.
2. වෙන browser/incognito එකක student register කරන්න.
3. Admin -> Requests -> Accept.
4. Student login කරන්න.
5. Student QR පෙන්වෙනවාද බලන්න.
6. Admin -> Scanner -> QR scan කරන්න.
7. Student details verify කරන්න.
8. Mark Attendance කරන්න.
9. Student dashboard attendance history බලන්න.
10. පැය 2කට කලින් නැවත mark කරලා block වෙනවාද බලන්න.

## 10. GitHub එකට push කරන්න

GitHub එකේ empty repository එකක් හදන්න.

Project terminal:

```bash
git init
git add .
git commit -m "Initial QR attendance system"
git branch -M main
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main
```

`.env.local` GitHub එකට යන්නේ නැහැ; `.gitignore` එකේ block කරලා තියෙනවා.

## 11. Vercel deploy කරන්න

1. Vercel login කරන්න.
2. Add New -> Project.
3. GitHub repo එක import කරන්න.
4. Framework Next.js automatically detect වෙනවා.
5. Deploy කරන්නට පෙර Environment Variables add කරන්න.

Vercel -> Project -> Settings -> Environment Variables:

```text
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
FIREBASE_ADMIN_PROJECT_ID
FIREBASE_ADMIN_CLIENT_EMAIL
FIREBASE_ADMIN_PRIVATE_KEY
```

`ADMIN_BOOTSTRAP_*` variables Vercel එකට අවශ්‍ය නැහැ, admin එක local එකෙන් create කරලා ඉවර නම්.

Environment variables save කරලා Redeploy කරන්න.

## 12. Firebase Authorized Domain

Vercel URL එක ලැබුණාම (example: `your-app.vercel.app`) Firebase Authentication settings වල Authorized domains section එක බලන්න. Domain error එකක් එනවා නම් Vercel domain එක add කරන්න.

## 13. Security

Real security layers:

- Firebase Authentication
- Firestore Security Rules
- Admin role/status check
- Firebase ID-token verification on server
- Firebase Admin SDK only on server
- Student cannot approve themselves
- Student cannot create/edit attendance directly
- Passwords never saved in Firestore
- Secure random QR token
- Atomic 2-hour attendance lock transaction
- Admin-only password reset
- Server-side validation
- Security response headers

F12/right-click blocking is only an extra deterrent. A browser owner can bypass client-side restrictions, so database/API protection is the real security boundary.

## 14. Firestore collections

### users/{uid}

Student profile/account metadata.

### studentPhotos/{uid}

Small compressed student profile image.

### attendance/{autoId}

Only:

```js
{
  studentId,
  markedAt,
  markedBy,
  status: "Present"
}
```

### attendanceLocks/{studentId}

Only the latest attendance timestamp used to enforce the 2-hour cooldown atomically.

## 15. Important usage note

Admin attendance page loads the latest 500 records to keep the UI quick for a normal class. CSV export exports the currently loaded/filtered records. If the system later grows to many thousands of attendance records, add pagination/server reports.
