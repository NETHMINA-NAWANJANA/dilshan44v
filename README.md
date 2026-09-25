# QR Class Attendance — Next.js + Firebase + Vercel

A secure student registration and QR attendance system designed to work without Firebase Storage.

## Main features

- Student registration request
- Password show/hide eye controls + confirmation + strength feedback
- Admin approve / reject
- Student & Admin login with Firebase Authentication
- Username saved as profile information
- Student profile photo
- Unique Student ID after approval
- Unique QR token after approval
- QR reissue by admin
- QR scanning from the admin web app
- Student details shown before attendance is marked
- Manual **Mark Attendance** button
- Atomic 2-hour duplicate attendance cooldown (transaction lock)
- Date + time saved as one Firestore timestamp
- Student attendance history
- Admin student search + class filter
- Active / Suspended status
- Admin password reset
- Last attendance display
- Attendance correction by deleting a wrong record
- CSV export

---

# Why photos are not using Firebase Storage

As of February 3, 2026, Cloud Storage for Firebase requires the Blaze pay-as-you-go plan.

To keep this starter project usable on the Firebase Spark plan, a student's profile image is resized in the browser to about 220px and compressed to JPEG. The small Data URL is stored in a separate:

`studentPhotos/{uid}`

document.

This keeps the main `users` documents small. If the project grows a lot, move photos to proper object storage later.

---

# Firestore collections

## users/{uid}

Student example:

```js
{
  fullName: "Student Name",
  username: "student01",
  email: "student@example.com",
  className: "Grade 6",
  phone: "07...",
  parentPhone: "07...",
  role: "student",
  status: "pending", // pending | active | suspended | rejected
  studentCode: null, // generated when approved
  qrToken: null,     // generated when approved
  createdAt,
  approvedAt
}
```

Admin:

```js
{
  fullName: "Main Admin",
  username: "admin",
  email: "admin@example.com",
  role: "admin",
  status: "active"
}
```

## studentPhotos/{uid}

```js
{
  ownerId: "firebase-auth-uid",
  photoData: "data:image/jpeg;base64,...",
  updatedAt
}
```

## attendance/{autoId}

```js
{
  studentId: "firebase-auth-uid",
  markedAt: Timestamp,
  markedBy: "admin-uid",
  status: "Present"
}
```

Notice that student name/class/photo/date-string/time-string are NOT copied into attendance records.

---

# Step 1 — Create a Firebase project

1. Go to Firebase Console.
2. Create a new project.
3. **Authentication** -> Sign-in method -> enable **Email/Password**.
4. **Firestore Database** -> Create database.
5. Project Settings -> General -> add a **Web App**.
6. Copy the Firebase Web configuration values.
7. Project Settings -> Service accounts -> **Generate new private key**.

Never upload that service-account JSON to GitHub.

---

# Step 2 — Install project

```bash
npm install
```

Copy:

```text
.env.example
```

to:

```text
.env.local
```

Fill in the Firebase values.

For the Admin private key, use the private key from your Firebase service-account JSON and keep it in one quoted environment variable with `\n`.

---

# Step 3 — Deploy Firestore security rules + index

Install Firebase CLI:

```bash
npm install -g firebase-tools
```

Login:

```bash
firebase login
```

Connect the project:

```bash
firebase use --add
```

Deploy:

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

---

# Step 4 — Create your first Admin account

Fill these in `.env.local`:

```env
ADMIN_BOOTSTRAP_EMAIL=your-admin-email@example.com
ADMIN_BOOTSTRAP_PASSWORD=StrongPassword123
ADMIN_BOOTSTRAP_NAME=Main Admin
```

Then make those environment variables available to the command and run:

```bash
npm run create-admin
```

If your terminal does not automatically load `.env.local`, temporarily export/set the variables manually before running the command.

After the admin account is created, login from the home page.

---

# Step 5 — Run locally

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

---

# Student flow

1. Student opens **Register**.
2. Enters:
   - Full name
   - Username
   - Email
   - Password
   - Class
   - Student phone
   - Parent phone
   - Photo
3. Server checks if username already exists.
4. Firebase Auth account is created.
5. `users/{uid}` is created with `status: pending`.
6. Photo is resized/compressed and saved separately in `studentPhotos/{uid}`.
7. Student is signed out.
8. Student waits for Admin approval.
9. Admin accepts the request.
10. Server generates:
   - `studentCode`
   - `qrToken`
   - `approvedAt`
11. Status becomes `active`.
12. Student can login.
13. Student sees QR and attendance history.

---

# QR attendance flow

Admin opens:

```text
/admin/scanner
```

Then:

1. Click **Start Camera Scanner**.
2. Scan student's QR.
3. Server searches the active student by secure random `qrToken`.
4. Student photo + details appear.
5. Admin checks the correct student.
6. Admin clicks **Mark Attendance**.
7. Server finds the latest attendance for that student.
8. If less than 2 hours have passed, it refuses.
9. If 2 hours or more have passed, it saves a new attendance document.

Example:

```text
08:00 -> Present ✅
09:30 -> Blocked ❌
10:00+ -> Can mark again ✅
```

---

# Date + time

Only one value is stored:

```js
markedAt: Timestamp
```

The UI converts that into both date and time.

This avoids storing duplicate values such as:

```text
date
time
timestamp
```

---

# Passwords

Passwords are never stored in Firestore.

Firebase Authentication manages them.

Admin can click **Reset Password** for a student. The browser sends the admin's Firebase ID token to a protected Next.js API route. The server verifies that the caller is an active admin and then changes the student's Firebase Auth password using Firebase Admin SDK.

---


# Inspect / F12 deterrent

The project includes `components/BrowserGuard.jsx`. It:

- blocks common F12 / Ctrl+Shift+I / Ctrl+Shift+J / Ctrl+Shift+C / Ctrl+U shortcuts
- disables the normal right-click context menu
- shows a full-screen blocker when a large docked DevTools viewport difference is detected
- automatically returns to the site when that heuristic no longer detects DevTools

Important: this is only a deterrent. A website cannot reliably prevent a user who controls their own browser from inspecting client-side code. Real security comes from Firebase Authentication, Firestore Security Rules, and the protected server API routes.

The project also sends several browser security headers from `next.config.mjs`.

# Security

`firestore.rules` implements these main rules:

- Student can read only their own user profile.
- Student can read only their own attendance.
- Student can create/update only their own photo document.
- Admin can read students and attendance.
- Student cannot create attendance directly.
- Attendance is written by the protected server API.
- Student cannot approve themselves.
- Student cannot change their role to admin.

Do NOT replace the rules with:

```text
allow read, write: if true;
```

in production.

---

# Vercel deployment

1. Push the project to GitHub.
2. Vercel -> Add New Project.
3. Import the GitHub repo.
4. Settings -> Environment Variables.
5. Add the Firebase Web variables.
6. Add the Firebase Admin variables.
7. Deploy.

Vercel gives HTTPS automatically. Browser camera access for the QR scanner works on HTTPS (and localhost during development).

---

# Recommended later upgrades

Once the basic system works, optional improvements can include:

- Pagination for very large student lists
- Rate limiting on registration
- Firebase App Check
- Audit log
- Edit student details
- Better attendance report filters
- Real Excel `.xlsx` export
- Move images to object storage when you are ready for billing
