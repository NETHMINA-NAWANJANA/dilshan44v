import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireAdmin } from "@/lib/server-auth";

export async function GET(request) {
  try {
    await requireAdmin(request);
    const { searchParams } = new URL(request.url);
    const paperClassId = searchParams.get("paperClassId");
    if (!paperClassId) return NextResponse.json({ error: "paperClassId required." }, { status: 400 });
    const snap = await adminDb.collection("paperClasses").doc(paperClassId).collection("content").get();
    const content = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      .sort((a,b) => (Number(a.order||0)-Number(b.order||0)) || String(a.title||"").localeCompare(String(b.title||"")));
    return NextResponse.json({ content }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Unable to load content." }, { status: error.message === "UNAUTHORIZED" ? 401 : 403 });
  }
}
