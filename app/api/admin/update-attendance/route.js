import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { requireAdmin } from "@/lib/server-auth";

async function refreshLock(studentId) {
  const latest = await adminDb.collection("attendance")
    .where("studentId", "==", studentId)
    .orderBy("markedAt", "desc")
    .limit(1).get();
  const lockRef = adminDb.collection("attendanceLocks").doc(studentId);
  if (latest.empty) await lockRef.delete().catch(() => {});
  else await lockRef.set({ studentId, lastMarkedAt: latest.docs[0].data().markedAt }, { merge: true });
}

export async function POST(request) {
  try {
    await requireAdmin(request);
    const { id, markedAt } = await request.json();
    const date = new Date(markedAt);
    if (!id || Number.isNaN(date.getTime())) return NextResponse.json({ error: "Invalid date/time." }, { status: 400 });

    const ref = adminDb.collection("attendance").doc(id);
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ error: "Attendance record not found." }, { status: 404 });
    const studentId = snap.data().studentId;

    await ref.update({ markedAt: Timestamp.fromDate(date) });
    await refreshLock(studentId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message || "Failed." }, { status: 403 });
  }
}
