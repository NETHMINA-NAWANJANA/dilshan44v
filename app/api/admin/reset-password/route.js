import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { requireAdmin } from "@/lib/server-auth";

export async function POST(request) {
  try {
    await requireAdmin(request);
    const { uid, newPassword } = await request.json();

    if (!uid || typeof newPassword !== "string" || newPassword.length < 8) {
      return NextResponse.json({error:"Password must contain at least 8 characters."},{status:400});
    }

    const snap = await adminDb.collection("users").doc(uid).get();
    if (!snap.exists || snap.data().role !== "student") {
      return NextResponse.json({error:"Student not found."},{status:404});
    }

    await adminAuth.updateUser(uid, { password: newPassword });
    return NextResponse.json({ok:true});
  } catch(e) {
    return NextResponse.json({error:e.message || "Failed."},{status:403});
  }
}
