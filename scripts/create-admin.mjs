try { process.loadEnvFile(".env.local"); } catch {}

import admin from "firebase-admin";

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
const email = process.env.ADMIN_BOOTSTRAP_EMAIL;
const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;
const name = process.env.ADMIN_BOOTSTRAP_NAME || "Main Admin";

if (!projectId || !clientEmail || !privateKey || !email || !password) {
  console.error("Missing Firebase Admin or ADMIN_BOOTSTRAP environment variables.");
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert({projectId, clientEmail, privateKey})
});

const auth = admin.auth();
const db = admin.firestore();

let user;
try {
  user = await auth.getUserByEmail(email);
  await auth.updateUser(user.uid, {password, disabled:false, displayName:name});
} catch {
  user = await auth.createUser({email,password,displayName:name});
}

await db.collection("users").doc(user.uid).set({
  fullName:name,
  username:"admin",
  email,
  role:"admin",
  status:"active",
  photoUrl:"",
  createdAt:admin.firestore.FieldValue.serverTimestamp()
}, {merge:true});

console.log("Admin ready:", email, user.uid);
process.exit(0);
