import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { requireAdmin } from "@/lib/server-auth";

export async function GET(request) {
  try {
    await requireAdmin(request);
    const snap = await adminDb.collection("paperClasses").get();
    const classes = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
    return NextResponse.json({ classes }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Unable to load paper classes." },
      { status: error.message === "UNAUTHORIZED" ? 401 : 403 }
    );
  }
}

export async function POST(request) {
  try {
    const admin = await requireAdmin(request);
    const body = await request.json();
    const name = String(body?.name || "").trim();
    const description = String(body?.description || "").trim();

    if (!name) {
      return NextResponse.json({ error: "Class name is required." }, { status: 400 });
    }

    const ref = adminDb.collection("paperClasses").doc();
    await ref.set({
      name,
      description,
      active: true,
      createdBy: admin.uid,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ ok: true, id: ref.id });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Unable to create paper class." },
      { status: error.message === "UNAUTHORIZED" ? 401 : 403 }
    );
  }
}
