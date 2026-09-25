import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebase-admin";
import { requireAdmin } from "@/lib/server-auth";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function getMonthNumber(month) {
  const index = MONTHS.indexOf(month);

  if (index === -1) {
    return null;
  }

  return index + 1;
}

function isValidDate(year, month, day) {
  const date = new Date(
    year,
    month - 1,
    day
  );

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

export async function POST(request) {
  try {
    await requireAdmin(request);

    const body = await request.json();

    const {
      className,
      examName,
      examDate,
      examYear,
      examMonth,
      examDay,
      entries,
    } = body;

    /* =========================
       BASIC VALIDATION
    ========================= */

    if (!className) {
      return NextResponse.json(
        {
          error:
            "Class / Grade is required.",
        },
        { status: 400 }
      );
    }

    if (
      !examName ||
      !String(examName).trim()
    ) {
      return NextResponse.json(
        {
          error:
            "Exam Name is required.",
        },
        { status: 400 }
      );
    }

    if (!examYear) {
      return NextResponse.json(
        {
          error:
            "Exam Year is required.",
        },
        { status: 400 }
      );
    }

    if (!examMonth) {
      return NextResponse.json(
        {
          error:
            "Exam Month is required.",
        },
        { status: 400 }
      );
    }

    if (!MONTHS.includes(examMonth)) {
      return NextResponse.json(
        {
          error:
            "Invalid Exam Month.",
        },
        { status: 400 }
      );
    }

    if (!examDay) {
      return NextResponse.json(
        {
          error:
            "Exam Day is required.",
        },
        { status: 400 }
      );
    }

    if (!examDate) {
      return NextResponse.json(
        {
          error:
            "Exam Date is required.",
        },
        { status: 400 }
      );
    }

    if (
      !Array.isArray(entries) ||
      entries.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "At least one student result is required.",
        },
        { status: 400 }
      );
    }

    /* =========================
       DATE VALIDATION
    ========================= */

    const yearNumber =
      Number(examYear);

    const dayNumber =
      Number(examDay);

    const monthNumber =
      getMonthNumber(examMonth);

    if (
      !Number.isInteger(yearNumber) ||
      yearNumber < 2000 ||
      yearNumber > 2100
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid Exam Year.",
        },
        { status: 400 }
      );
    }

    if (
      !Number.isInteger(dayNumber) ||
      dayNumber < 1 ||
      dayNumber > 31
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid Exam Day.",
        },
        { status: 400 }
      );
    }

    if (
      !isValidDate(
        yearNumber,
        monthNumber,
        dayNumber
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid Exam Date.",
        },
        { status: 400 }
      );
    }

    /* =========================
       CHECK DATE STRING
    ========================= */

    const expectedDate =
      `${yearNumber}-${String(
        monthNumber
      ).padStart(2, "0")}-${String(
        dayNumber
      ).padStart(2, "0")}`;

    if (examDate !== expectedDate) {
      return NextResponse.json(
        {
          error:
            "Exam Date does not match Year / Month / Day.",
        },
        { status: 400 }
      );
    }

    /* =========================
       STUDENTS
    ========================= */

    const studentIds = [
      ...new Set(
        entries
          .map(
            (entry) =>
              entry?.studentId
          )
          .filter(Boolean)
      ),
    ];

    if (!studentIds.length) {
      return NextResponse.json(
        {
          error:
            "No valid students found.",
        },
        { status: 400 }
      );
    }

    const studentDocs =
      await Promise.all(
        studentIds.map((studentId) =>
          adminDb
            .collection("users")
            .doc(studentId)
            .get()
        )
      );

    const studentMap = new Map();

    for (const snap of studentDocs) {
      if (!snap.exists) {
        continue;
      }

      const data = snap.data();

      /*
        Only active students are allowed
        to receive new exam results.
      */
      if (
        data.status &&
        data.status !== "active"
      ) {
        continue;
      }

      studentMap.set(snap.id, {
        id: snap.id,
        ...data,
      });
    }

    /* =========================
       FIRESTORE BATCH
    ========================= */

    const batch =
      adminDb.batch();

    let savedCount = 0;

    for (const entry of entries) {
      if (!entry?.studentId) {
        continue;
      }

      const student =
        studentMap.get(
          entry.studentId
        );

      if (!student) {
        continue;
      }

      const marks =
        Number(entry.marks);

      if (
        !Number.isFinite(marks) ||
        marks < 0 ||
        marks > 100
      ) {
        continue;
      }

      const resultRef =
        adminDb
          .collection("examResults")
          .doc();

      batch.set(resultRef, {
        studentId:
          entry.studentId,

        studentCode:
          student.studentCode ||
          null,

        fullName:
          student.fullName || "",

        phone:
          student.phone || "",

        className:
          student.className ||
          className,

        marks,

        examName:
          String(examName).trim(),

        /*
          FINAL DATE DATA
        */

        examDate,

        examYear:
          yearNumber,

        examMonth,

        examMonthNumber:
          monthNumber,

        examDay:
          dayNumber,

        createdAt:
          Timestamp.now(),
      });

      savedCount++;
    }

    if (savedCount === 0) {
      return NextResponse.json(
        {
          error:
            "No valid student results were available to save.",
        },
        { status: 400 }
      );
    }

    await batch.commit();

    return NextResponse.json({
      success: true,

      count: savedCount,

      className,

      examName:
        String(examName).trim(),

      examDate,

      examYear:
        yearNumber,

      examMonth,

      examMonthNumber:
        monthNumber,

      examDay:
        dayNumber,
    });
  } catch (error) {
    console.error(
      "ADD EXAM RESULTS ERROR:",
      error
    );

    if (
      error?.message ===
      "UNAUTHORIZED"
    ) {
      return NextResponse.json(
        {
          error:
            "Unauthorized.",
        },
        { status: 401 }
      );
    }

    if (
      error?.message ===
      "FORBIDDEN"
    ) {
      return NextResponse.json(
        {
          error:
            "Forbidden.",
        },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Failed to save exam results.",
      },
      { status: 500 }
    );
  }
}
