import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebase-admin";
import { requireAdmin } from "@/lib/server-auth";

export async function POST(request) {
  try {
    await requireAdmin(request);

    const { resultId, marks } = await request.json();

    if (!resultId) {
      return NextResponse.json(
        { error: "resultId is required." },
        { status: 400 }
      );
    }

    const marksNumber = Number(marks);

    if (
      !Number.isFinite(marksNumber) ||
      marksNumber < 0 ||
      marksNumber > 100
    ) {
      return NextResponse.json(
        { error: "Marks must be a number between 0 and 100." },
        { status: 400 }
      );
    }

    const ref = adminDb.collection("examResults").doc(resultId);
    const snap = await ref.get();

    if (!snap.exists) {
      return NextResponse.json(
        { error: "Exam result not found." },
        { status: 404 }
      );
    }

    await ref.update({
      marks: marksNumber,
      updatedAt: Timestamp.now(),
    });

    return NextResponse.json({ success: true, marks: marksNumber });
  } catch (error) {
    console.error("UPDATE EXAM RESULT ERROR:", error);

    if (error?.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (error?.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    return NextResponse.json(
      { error: error?.message || "Failed to update exam result." },
      { status: 500 }
    );
  }
}
