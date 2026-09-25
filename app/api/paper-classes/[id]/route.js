import { NextResponse } from "next/server";

import { adminDb } from "@/lib/firebase-admin";
import { requireStudent } from "@/lib/server-auth";

export async function GET(request, { params }) {
  try {
    const student = await requireStudent(request);

    const { id } = await params;

    const classSnap = await adminDb
      .collection("paperClasses")
      .doc(id)
      .get();

    if (
      !classSnap.exists ||
      classSnap.data().active !== true
    ) {
      return NextResponse.json(
        {
          error: "Paper class not found.",
        },
        { status: 404 }
      );
    }

    const requestSnap = await adminDb
      .collection("paperClassRequests")
      .doc(`${id}_${student.uid}`)
      .get();

    if (
      !requestSnap.exists ||
      requestSnap.data().status !== "accepted"
    ) {
      return NextResponse.json(
        {
          error:
            "You do not have access to this paper class.",
        },
        { status: 403 }
      );
    }

    const contentSnap = await adminDb
      .collection("paperClasses")
      .doc(id)
      .collection("content")
      .get();

    const content = contentSnap.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      .sort(
        (a, b) =>
          Number(a.order || 0) -
            Number(b.order || 0) ||
          String(a.title || "").localeCompare(
            String(b.title || "")
          )
      );

    return NextResponse.json({
      paperClass: {
        id: classSnap.id,
        ...classSnap.data(),
      },
      content,
    });
  } catch (error) {
    console.error(
      "GET PAPER CLASS ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error.message ||
          "Unable to load paper class.",
      },
      {
        status:
          error.message === "UNAUTHORIZED"
            ? 401
            : 403,
      }
    );
  }
}
