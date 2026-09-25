import {
  adminAuth,
  adminDb,
} from "@/lib/firebase-admin";


// ======================================================
// ADMIN AUTHENTICATION
// ======================================================

export async function requireAdmin(request) {
  const header =
    request.headers.get("authorization") || "";

  if (!header.startsWith("Bearer ")) {
    throw new Error("UNAUTHORIZED");
  }

  const token =
    header.slice(7);

  const decoded =
    await adminAuth.verifyIdToken(token);

  const snap =
    await adminDb
      .collection("users")
      .doc(decoded.uid)
      .get();

  if (!snap.exists) {
    throw new Error("UNAUTHORIZED");
  }

  const data =
    snap.data();

  if (
    data.role !== "admin" ||
    data.status !== "active"
  ) {
    throw new Error("FORBIDDEN");
  }

  return {
    uid: decoded.uid,
    ...data,
  };
}


// ======================================================
// STUDENT AUTHENTICATION
// ======================================================

export async function requireStudent(request) {
  const header =
    request.headers.get("authorization") || "";

  if (!header.startsWith("Bearer ")) {
    throw new Error("UNAUTHORIZED");
  }

  const token =
    header.slice(7);

  const decoded =
    await adminAuth.verifyIdToken(token);

  const snap =
    await adminDb
      .collection("users")
      .doc(decoded.uid)
      .get();

  if (!snap.exists) {
    throw new Error("UNAUTHORIZED");
  }

  const data =
    snap.data();

  // ----------------------------------------------------
  // Must be a student
  // ----------------------------------------------------

  if (
    data.role !== "student"
  ) {
    throw new Error("FORBIDDEN");
  }

  // ----------------------------------------------------
  // Student must be active
  // ----------------------------------------------------

  if (
    data.status !== "active"
  ) {
    throw new Error("FORBIDDEN");
  }

  // ----------------------------------------------------
  // IMPORTANT:
  // Return the complete Firestore user document.
  //
  // This includes:
  //
  // className
  // fullName
  // studentCode
  // email
  // phone
  // address
  // status
  // role
  //
  // So Paper Class API can correctly read:
  //
  // student.className
  // ----------------------------------------------------

  return {
    uid: decoded.uid,
    ...data,
  };
}

