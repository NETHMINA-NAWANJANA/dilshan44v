import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { requireAdmin } from "@/lib/server-auth";

export async function GET(request) {
  try {
    await requireAdmin(request);
    const snap = await adminDb.collection("paperLessons").orderBy("createdAt", "desc").get();
    return NextResponse.json({ lessons: snap.docs.map(d => ({ id: d.id, ...d.data() })) });
  } catch (e) { return NextResponse.json({ error: e.message || "Unauthorized" }, { status: 401 }); }
}
export async function POST(request) {
  try {
    await requireAdmin(request);
    const { className, date, paperUrl, videoUrl } = await request.json();
    if (!className || !date || !paperUrl) return NextResponse.json({ error: "Class, date and paper link are required." }, { status: 400 });
    const ref = await adminDb.collection("paperLessons").add({ className, date, paperUrl, videoUrl: videoUrl || "", createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
    return NextResponse.json({ success: true, id: ref.id });
  } catch (e) { return NextResponse.json({ error: e.message || "Unable to save" }, { status: 401 }); }
}
export async function PATCH(request) {
  try {
    await requireAdmin(request);
    const { id, className, date, paperUrl, videoUrl } = await request.json();
    if (!id || !className || !date || !paperUrl) return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    await adminDb.collection("paperLessons").doc(id).update({ className, date, paperUrl, videoUrl: videoUrl || "", updatedAt: FieldValue.serverTimestamp() });
    return NextResponse.json({ success: true });
  } catch (e) { return NextResponse.json({ error: e.message || "Unable to update" }, { status: 401 }); }
}
