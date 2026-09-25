import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { requireAdmin } from "@/lib/server-auth";

export async function POST(request) {
  try {
    await requireAdmin(request);

    const { studentIds } = await request.json();

    if (!Array.isArray(studentIds) || !studentIds.length) {
      return NextResponse.json(
        { error: "studentIds is required." },
        { status: 400 }
      );
    }

    const batch = adminDb.batch();

    studentIds.forEach((id) => {
      const ref = adminDb.collection("users").doc(id);
      batch.update(ref, {
        qrPrinted: true,
        qrPrintedAt: FieldValue.serverTimestamp(),
      });
    });

    await batch.commit();

    return NextResponse.json({ ok: true, updated: studentIds.length });
  } catch (error) {
    const status =
      error.message === "UNAUTHORIZED"
        ? 401
        : error.message === "FORBIDDEN"
        ? 403
        : 500;

    return NextResponse.json(
      { error: error.message || "Unable to update QR print status." },
      { status }
    );
  }
}
