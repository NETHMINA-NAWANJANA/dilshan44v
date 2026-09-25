import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireAdmin } from "@/lib/server-auth";

export async function POST(request) {
  try {
    await requireAdmin(request);
    const { id } = await request.json();
    const ref = adminDb.collection("attendance").doc(id);
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ error: "Attendance record not found." }, { status: 404 });
    const studentId = snap.data().studentId;

    await ref.delete();
    const latest = await adminDb.collection("attendance").where("studentId", "==", studentId).orderBy("markedAt", "desc").limit(1).get();
    const lockRef = adminDb.collection("attendanceLocks").doc(studentId);
    if (latest.empty) await lockRef.delete().catch(() => {});
    else await lockRef.set({ studentId, lastMarkedAt: latest.docs[0].data().markedAt }, { merge: true });

    return NextResponse.json({ ok: true });
  } catch(e) {
    return NextResponse.json({ error: e.message || "Failed." }, { status: 403 });
  }
}
