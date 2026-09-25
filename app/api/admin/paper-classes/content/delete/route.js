import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireAdmin } from "@/lib/server-auth";

export async function POST(request) {
  try {
    await requireAdmin(request);
    const { paperClassId, contentId } = await request.json();
    if (!paperClassId || !contentId) return NextResponse.json({ error: "Missing content." }, { status: 400 });
    const classRef = adminDb.collection("paperClasses").doc(paperClassId);
    const ref = classRef.collection("content").doc(contentId);
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ error: "Content not found." }, { status: 404 });
    const data = snap.data();
    const batch = adminDb.batch();
    batch.delete(ref);
    if (data.type === "paper" && data.groupId) {
      const videoSnap = await classRef.collection("content").where("groupId", "==", data.groupId).where("type", "==", "video").get();
      videoSnap.forEach((d) => batch.delete(d.ref));
    }
    await batch.commit();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Unable to delete content." }, { status: error.message === "UNAUTHORIZED" ? 401 : 403 });
  }
}
