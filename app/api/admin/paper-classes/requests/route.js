import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { requireAdmin } from "@/lib/server-auth";

export async function GET(request) {
  try {
    await requireAdmin(request);

    const snap = await adminDb.collection("paperClassRequests").get();
    const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const pending = all.filter((x) => x.status === "pending");
    const accepted = all.filter((x) => x.status === "accepted");

    const rows = await Promise.all(
      pending.map(async (data) => {
        const cls = await adminDb.collection("paperClasses").doc(data.paperClassId).get();
        return {
          ...data,
          paperClassName: cls.exists ? cls.data().name : "Deleted class",
        };
      })
    );

    rows.sort((a, b) =>
      (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)
    );

    const acceptedStudents = await Promise.all(
      accepted.map(async (data) => {
        const userSnap = await adminDb.collection("users").doc(data.studentId).get();
        const user = userSnap.exists ? userSnap.data() : {};
        return {
          ...data,
          fullName: user.fullName || data.studentName || "Student",
          email: user.email || "",
          phone: user.phone || user.studentPhone || "",
          address: user.address || "",
          className: user.className || data.grade || "Grade 11",
          studentCode: user.studentCode || data.studentCode || "",
        };
      })
    );

    return NextResponse.json({
      requests: rows,
      acceptedStudents,
      acceptedCount: accepted.length,
      pendingCount: pending.length,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Unable to load requests." },
      { status: error.message === "UNAUTHORIZED" ? 401 : 403 }
    );
  }
}

export async function POST(request) {
  try {
    const admin = await requireAdmin(request);

    const body = await request.json();

    const requestId =
      String(body?.requestId || "").trim();

    const action =
      String(body?.action || "").trim();

    if (
      !requestId ||
      !["accepted", "rejected"].includes(action)
    ) {
      return NextResponse.json(
        {
          error: "Invalid request.",
        },
        {
          status: 400,
        }
      );
    }

    const ref = adminDb
      .collection("paperClassRequests")
      .doc(requestId);

    const snap = await ref.get();

    if (!snap.exists) {
      return NextResponse.json(
        {
          error: "Request not found.",
        },
        {
          status: 404,
        }
      );
    }

    const current = snap.data();

    if (
      !["pending", "rejected", "accepted"].includes(
        current.status
      )
    ) {
      return NextResponse.json(
        {
          error: "Invalid request status.",
        },
        {
          status: 400,
        }
      );
    }

    const update = {
      status: action,
      updatedAt:
        FieldValue.serverTimestamp(),
      reviewedAt:
        FieldValue.serverTimestamp(),
      reviewedBy:
        admin.uid,
    };

    await ref.update(update);

    return NextResponse.json({
      ok: true,
      request: {
        id: ref.id,
        ...current,
        ...update,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error.message ||
          "Unable to update request.",
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


export async function DELETE(request) {
  try {
    await requireAdmin(request);
    const body = await request.json();
    const requestId = String(body?.requestId || "").trim();
    if (!requestId) return NextResponse.json({ error: "Request is required." }, { status: 400 });
    const ref = adminDb.collection("paperClassRequests").doc(requestId);
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ error: "Student access not found." }, { status: 404 });
    await ref.delete();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Unable to remove student." }, { status: error.message === "UNAUTHORIZED" ? 401 : 403 });
  }
}
