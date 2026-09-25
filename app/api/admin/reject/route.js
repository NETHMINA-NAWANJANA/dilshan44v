import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { requireAdmin } from "@/lib/server-auth";

export async function POST(request) {
  try {
    await requireAdmin(request);
    const { uid } = await request.json();

    await adminDb.collection("users").doc(uid).update({ status: "rejected" });
    await adminAuth.updateUser(uid, { disabled: true });

    return NextResponse.json({ok:true});
  } catch (e) {
    return NextResponse.json({error:e.message || "Failed."},{status:403});
  }
}
