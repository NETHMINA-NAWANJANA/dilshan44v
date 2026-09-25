import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireAdmin } from "@/lib/server-auth";

export async function POST(request) {
  try {
    await requireAdmin(request);
    const { uid } = await request.json();
    const ref = adminDb.collection("users").doc(uid);
    const snap = await ref.get();
    if (!snap.exists || snap.data().role !== "student") {
      return NextResponse.json({ error: "Student not found." }, { status: 404 });
    }
    await ref.update({ qrToken: crypto.randomUUID() });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message || "Failed." }, { status: 403 });
  }
}
