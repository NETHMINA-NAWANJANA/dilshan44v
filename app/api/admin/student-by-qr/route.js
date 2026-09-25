import { NextResponse } from "next/server";

import {
  adminDb,
} from "@/lib/firebase-admin";

import {
  requireAdmin,
} from "@/lib/server-auth";

import {
  DEFAULT_DAILY_FEE,
} from "@/lib/helpers";

export async function POST(request) {
  try {
    await requireAdmin(request);

    const {
      qrToken,
    } = await request.json();

    if (!qrToken) {
      return NextResponse.json(
        {
          error:
            "Invalid QR code.",
        },
        {
          status: 400,
        }
      );
    }

    const querySnapshot =
      await adminDb
        .collection("users")
        .where(
          "qrToken",
          "==",
          qrToken
        )
        .where(
          "status",
          "==",
          "active"
        )
        .limit(1)
        .get();

    if (querySnapshot.empty) {
      return NextResponse.json(
        {
          error:
            "Active student not found for this QR code.",
        },
        {
          status: 404,
        }
      );
    }

    const studentDoc =
      querySnapshot.docs[0];

    const student =
      studentDoc.data();

    let photoData = "";

    try {
      const photoSnapshot =
        await adminDb
          .collection(
            "studentPhotos"
          )
          .doc(studentDoc.id)
          .get();

      if (
        photoSnapshot.exists
      ) {
        photoData =
          photoSnapshot.data()
            .photoData || "";
      }
    } catch {}

    /*
     * Recent attendance records (now including payment info).
     */
    let recentAttendance = [];

    try {
      const attendanceSnapshot =
        await adminDb
          .collection(
            "attendance"
          )
          .where(
            "studentId",
            "==",
            studentDoc.id
          )
          .orderBy(
            "markedAt",
            "desc"
          )
          .limit(10)
          .get();

      recentAttendance =
        attendanceSnapshot.docs.map(
          (record) => {
            const data =
              record.data();

            return {
              id: record.id,

              status:
                data.status ||
                "Present",

              markedAt:
                data.markedAt
                  ?.toDate()
                  .toISOString() ||
                null,

              dailyFee:
                data.dailyFee ??
                null,

              paidAmount:
                data.paidAmount ??
                null,

              dueAfter:
                data.dueAfter ??
                null,

              paymentStatus:
                data.paymentStatus ||
                null,
            };
          }
        );
    } catch {}

    // Current daily fee (global setting), used to pre-fill the payment box.
    let dailyFee = DEFAULT_DAILY_FEE;

    try {
      const feeSnap = await adminDb
        .collection("settings")
        .doc("fees")
        .get();

      if (
        feeSnap.exists &&
        Number.isFinite(
          feeSnap.data().dailyFee
        )
      ) {
        dailyFee =
          feeSnap.data().dailyFee;
      }
    } catch {}

    const dueBalance =
      Number.isFinite(student.dueBalance)
        ? student.dueBalance
        : 0;

    return NextResponse.json({
      student: {
        id: studentDoc.id,

        fullName:
          student.fullName,

        email:
          student.email,

        phone:
          student.phone,

        className:
          student.className,

        address:
          student.address,

        studentCode:
          student.studentCode,

        photoData,

        dueBalance,

        dailyFee,

        totalPayable:
          dueBalance + dailyFee,

        recentAttendance,
      },
    });
  } catch (error) {
    const status =
      error.message ===
      "UNAUTHORIZED"
        ? 401
        : 403;

    return NextResponse.json(
      {
        error:
          error.message ||
          "Unable to read student.",
      },
      {
        status,
      }
    );
  }
}
