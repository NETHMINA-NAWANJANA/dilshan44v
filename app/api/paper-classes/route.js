import { NextResponse } from "next/server";

import {
  adminDb,
} from "@/lib/firebase-admin";

import {
  requireStudent,
} from "@/lib/server-auth";


// ======================================================
// GRADE 11 CHECK
// ======================================================

function isGrade11(value = "") {
  const normalized = String(value)
    .trim()
    .toLowerCase()
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return (
    normalized === "11" ||
    normalized.startsWith("11 ") ||
    normalized === "grade 11" ||
    normalized.startsWith("grade 11 ")
  );
}


// ======================================================
// GET PAPER CLASSES
// ======================================================

export async function GET(request) {
  try {

    // --------------------------------------------------
    // Get logged-in student
    // --------------------------------------------------

    const student =
      await requireStudent(request);


    // --------------------------------------------------
    // Check Grade 11
    // --------------------------------------------------

    if (!isGrade11(student.className)) {

      return NextResponse.json(
        {
          classes: [],
        },
        {
          status: 200,
        }
      );

    }


    // --------------------------------------------------
    // Get active paper classes + student's requests
    // --------------------------------------------------

    const [
      classesSnap,
      requestsSnap,
    ] = await Promise.all([

      adminDb
        .collection("paperClasses")
        .where(
          "active",
          "==",
          true
        )
        .get(),

      adminDb
        .collection("paperClassRequests")
        .where(
          "studentId",
          "==",
          student.uid
        )
        .get(),

    ]);


    // --------------------------------------------------
    // Create request map
    // --------------------------------------------------

    const requests =
      new Map();


    requestsSnap.forEach(
      (doc) => {

        const data =
          doc.data();

        requests.set(
          data.paperClassId,
          {
            id: doc.id,
            ...data,
          }
        );

      }
    );


    // --------------------------------------------------
    // Build classes
    // --------------------------------------------------

    const classes =
      classesSnap.docs
        .map(
          (doc) => {

            const data =
              doc.data();

            return {
              id: doc.id,

              ...data,

              request:
                requests.get(
                  doc.id
                ) || null,
            };

          }
        )
        .sort(
          (a, b) =>
            String(a.name || "")
              .localeCompare(
                String(b.name || "")
              )
        );


    // --------------------------------------------------
    // Return classes
    // --------------------------------------------------

    return NextResponse.json(
      { classes },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );

  } catch (error) {

    console.error(
      "GET PAPER CLASSES ERROR:",
      error
    );


    return NextResponse.json(
      {
        error:
          error.message ||
          "Unable to load paper classes.",
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
