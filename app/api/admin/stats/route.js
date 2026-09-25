import {
  NextResponse,
} from "next/server";

import {
  Timestamp,
} from "firebase-admin/firestore";

import {
  adminDb,
} from "@/lib/firebase-admin";

import {
  requireAdmin,
} from "@/lib/server-auth";

import {
  DEFAULT_DAILY_FEE,
} from "@/lib/helpers";

function colomboTodayUtcRange() {
  const now =
    new Date();

  const colomboMs =
    now.getTime() +
    330 * 60 * 1000;

  const c =
    new Date(colomboMs);

  const y =
    c.getUTCFullYear();

  const m =
    c.getUTCMonth();

  const d =
    c.getUTCDate();

  const startUtcMs =
    Date.UTC(
      y,
      m,
      d,
      0,
      0,
      0
    ) -
    330 *
      60 *
      1000;

  return [
    Timestamp.fromMillis(
      startUtcMs
    ),

    Timestamp.fromMillis(
      startUtcMs +
        24 *
          60 *
          60 *
          1000
    ),
  ];
}

export async function GET(
  request
) {
  try {
    await requireAdmin(
      request
    );

    const [
      start,
      end,
    ] =
      colomboTodayUtcRange();

    const [
      activeSnap,
      suspendedSnap,
      pendingSnap,
      todaySnap,
    ] =
      await Promise.all([
        adminDb
          .collection("users")
          .where(
            "role",
            "==",
            "student"
          )
          .where(
            "status",
            "==",
            "active"
          )
          .count()
          .get(),

        adminDb
          .collection("users")
          .where(
            "role",
            "==",
            "student"
          )
          .where(
            "status",
            "==",
            "suspended"
          )
          .count()
          .get(),

        adminDb
          .collection("users")
          .where(
            "role",
            "==",
            "student"
          )
          .where(
            "status",
            "==",
            "pending"
          )
          .count()
          .get(),

        adminDb
          .collection(
            "attendance"
          )
          .where(
            "markedAt",
            ">=",
            start
          )
          .where(
            "markedAt",
            "<",
            end
          )
          .get(),
      ]);

    const uniqueToday =
      new Set(
        todaySnap.docs.map(
          (document) =>
            document.data()
              .studentId
        )
      ).size;

    // Aggregate today's records per student — a student can be scanned
    // more than once a day (after the cooldown passes), and every
    // payment they made today should be added up for the admin, not
    // just the most recent scan.
    const byStudent = new Map();

    todaySnap.docs.forEach(
      (document) => {
        const data =
          document.data();

        const markedMs =
          data.markedAt
            ?.toMillis?.() || 0;

        const existing =
          byStudent.get(
            data.studentId
          ) || {
            scansToday: 0,
            totalPaidToday: 0,
            latestMs: -1,
            latest: null,
          };

        existing.scansToday += 1;

        existing.totalPaidToday +=
          data.paidAmount || 0;

        if (
          markedMs >
          existing.latestMs
        ) {
          existing.latestMs =
            markedMs;

          existing.latest = {
            paymentStatus:
              data.paymentStatus ||
              "UNPAID",
            dueAfter:
              data.dueAfter || 0,
            dailyFee:
              data.dailyFee || 0,
          };
        }

        byStudent.set(
          data.studentId,
          existing
        );
      }
    );

    let paidCount = 0;
    let partialCount = 0;
    let unpaidCount = 0;
    let revenueToday = 0;

    const studentIds = [
      ...byStudent.keys(),
    ];

    const studentDocs =
      studentIds.length
        ? await adminDb.getAll(
            ...studentIds.map(
              (id) =>
                adminDb
                  .collection("users")
                  .doc(id)
            )
          )
        : [];

    const studentInfoMap = new Map(
      studentDocs.map((doc) => [
        doc.id,
        doc.exists
          ? doc.data()
          : {},
      ])
    );

    const todayList = studentIds.map(
      (studentId) => {
        const entry =
          byStudent.get(
            studentId
          );

        // Status is based on the student's most recent scan today,
        // since that reflects their current, up-to-date balance
        // (each scan re-reads the running due balance).
        const latest =
          entry.latest;

        if (
          latest.paymentStatus ===
          "PAID"
        ) {
          paidCount += 1;
        } else if (
          latest.paymentStatus ===
          "PARTIALLY_PAID"
        ) {
          partialCount += 1;
        } else {
          unpaidCount += 1;
        }

        revenueToday +=
          entry.totalPaidToday;

        const info =
          studentInfoMap.get(
            studentId
          ) || {};

        return {
          studentId,
          fullName:
            info.fullName || "-",
          studentCode:
            info.studentCode || "-",
          scansToday:
            entry.scansToday,
          paymentStatus:
            latest.paymentStatus,
          // Total amount this student actually paid today,
          // across every scan.
          paidAmount:
            entry.totalPaidToday,
          dueAfter:
            latest.dueAfter,
          dailyFee:
            latest.dailyFee,
        };
      }
    );

    let currentDailyFee =
      DEFAULT_DAILY_FEE;

    try {
      const feeSnap =
        await adminDb
          .collection("settings")
          .doc("fees")
          .get();

      if (
        feeSnap.exists &&
        Number.isFinite(
          feeSnap.data().dailyFee
        )
      ) {
        currentDailyFee =
          feeSnap.data().dailyFee;
      }
    } catch {}

    return NextResponse.json({
      students:
        activeSnap.data().count,

      suspended:
        suspendedSnap.data().count,

      pending:
        pendingSnap.data().count,

      todayStudents:
        uniqueToday,

      todayRecords:
        todaySnap.size,

      paidToday: paidCount,
      partialToday: partialCount,
      unpaidToday: unpaidCount,
      revenueToday,
      currentDailyFee,
      todayList,
    });

  } catch (error) {
    return NextResponse.json(
      {
        error:
          error.message ||
          "Failed.",
      },
      {
        status:
          error.message ===
          "UNAUTHORIZED"
            ? 401
            : 403,
      }
    );
  }
}
