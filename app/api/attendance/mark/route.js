import { NextResponse } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { requireAdmin } from "@/lib/server-auth";
import { DEFAULT_DAILY_FEE } from "@/lib/helpers";

const COOLDOWN_MS = 2 * 60 * 60 * 1000;

export async function POST(request) {
  try {
    const admin = await requireAdmin(request);
    const body = await request.json();
    const { studentId } = body;

    if (!studentId) {
      return NextResponse.json({ error: "Student is required." }, { status: 400 });
    }

    // Payment entered by the admin for today. Defaults to 0 (unpaid) if not sent.
    const rawPaid = Number(body.paidAmount);
    const paidAmount = Number.isFinite(rawPaid) && rawPaid > 0 ? rawPaid : 0;

    const studentRef = adminDb.collection("users").doc(studentId);
    const studentSnap = await studentRef.get();

    if (!studentSnap.exists || studentSnap.data().role !== "student" || studentSnap.data().status !== "active") {
      return NextResponse.json({ error: "Active student not found." }, { status: 404 });
    }

    const nowMs = Date.now();
    const markedAt = Timestamp.fromMillis(nowMs);
    const lockRef = adminDb.collection("attendanceLocks").doc(studentId);
    const attendanceRef = adminDb.collection("attendance").doc();
    const feeSettingsRef = adminDb.collection("settings").doc("fees");

    const result = await adminDb.runTransaction(async (tx) => {
      const [lockSnap, feeSnap, freshStudentSnap] = await Promise.all([
        tx.get(lockRef),
        tx.get(feeSettingsRef),
        tx.get(studentRef),
      ]);

      const last = lockSnap.exists ? lockSnap.data().lastMarkedAt?.toMillis?.() : null;

      if (last && nowMs - last < COOLDOWN_MS) {
        const allowedAt = new Date(last + COOLDOWN_MS);
        const error = new Error(
          `Already marked recently. Try again after ${allowedAt.toLocaleString("en-LK", { timeZone: "Asia/Colombo" })}.`
        );
        error.code = "COOLDOWN";
        throw error;
      }

      const dailyFee =
        feeSnap.exists && Number.isFinite(feeSnap.data().dailyFee)
          ? feeSnap.data().dailyFee
          : DEFAULT_DAILY_FEE;

      const freshStudent = freshStudentSnap.data() || {};
      const pastDueBefore = Number.isFinite(freshStudent.dueBalance) ? freshStudent.dueBalance : 0;

      // Payment is applied to today's fee first, then to any past due balance.
      const totalPayable = pastDueBefore + dailyFee;
      const dueAfter = Math.max(totalPayable - paidAmount, 0);

      let paymentStatus = "UNPAID";
      if (paidAmount > 0 && dueAfter <= 0) {
        paymentStatus = "PAID";
      } else if (paidAmount > 0) {
        paymentStatus = "PARTIALLY_PAID";
      }

      tx.set(attendanceRef, {
        studentId,
        markedAt,
        markedBy: admin.uid,
        status: "Present",
        dailyFee,
        pastDueBefore,
        paidAmount,
        totalPayable,
        dueAfter,
        paymentStatus,
      });

      tx.set(lockRef, { studentId, lastMarkedAt: markedAt }, { merge: true });

      tx.update(studentRef, {
        dueBalance: dueAfter,
        totalPaid: FieldValue.increment(paidAmount),
      });

      return { dailyFee, pastDueBefore, totalPayable, paidAmount, dueAfter, paymentStatus };
    });

    return NextResponse.json({
      ok: true,
      markedAt: new Date(nowMs).toISOString(),
      ...result,
    });
  } catch (e) {
    if (e.code === "COOLDOWN") return NextResponse.json({ error: e.message }, { status: 409 });
    const status = e.message === "UNAUTHORIZED" ? 401 : e.message === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: e.message || "Failed to mark attendance." }, { status });
  }
}
