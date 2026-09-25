import { NextResponse } from "next/server";

import {
  FieldValue,
} from "firebase-admin/firestore";

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

  const normalized =
    String(value)
      .trim()
      .toLowerCase()
      .replace(
        /[-_]+/g,
        " "
      )
      .replace(
        /\s+/g,
        " "
      )
      .trim();


  return (
    normalized === "11" ||
    normalized.startsWith("11 ") ||
    normalized === "grade 11" ||
    normalized.startsWith("grade 11 ")
  );

}


// ======================================================
// REQUEST PAPER CLASS
// ======================================================

export async function POST(request) {

  try {

    // --------------------------------------------------
    // Logged-in student
    // --------------------------------------------------

    const student =
      await requireStudent(request);


    // --------------------------------------------------
    // Request body
    // --------------------------------------------------

    const body =
      await request.json();


    const paperClassId =
      String(
        body?.paperClassId || ""
      ).trim();


    if (!paperClassId) {

      return NextResponse.json(
        {
          error:
            "Paper class is required.",
        },
        {
          status: 400,
        }
      );

    }


    // --------------------------------------------------
    // Grade 11 check
    // --------------------------------------------------

    if (
      !isGrade11(
        student.className
      )
    ) {

      return NextResponse.json(
        {
          error:
            "Paper Classes are available for Grade 11 students only.",
        },
        {
          status: 403,
        }
      );

    }


    // --------------------------------------------------
    // Check paper class
    // --------------------------------------------------

    const classRef =
      adminDb
        .collection(
          "paperClasses"
        )
        .doc(
          paperClassId
        );


    const classSnap =
      await classRef.get();


    if (!classSnap.exists) {

      return NextResponse.json(
        {
          error:
            "Paper class not found.",
        },
        {
          status: 404,
        }
      );

    }


    const paperClass =
      classSnap.data();


    if (
      paperClass.active !== true
    ) {

      return NextResponse.json(
        {
          error:
            "This paper class is not active.",
        },
        {
          status: 404,
        }
      );

    }


    // --------------------------------------------------
    // Unique request ID
    // --------------------------------------------------

    const requestId =
      `${paperClassId}_${student.uid}`;


    const ref =
      adminDb
        .collection(
          "paperClassRequests"
        )
        .doc(
          requestId
        );


    // --------------------------------------------------
    // Existing request
    // --------------------------------------------------

    const existing =
      await ref.get();


    if (existing.exists) {

      const current =
        existing.data();


      // ----------------------------------------------
      // If rejected → allow request again
      // ----------------------------------------------

      if (
        current.status ===
        "rejected"
      ) {

        await ref.update({

          status:
            "pending",

          updatedAt:
            FieldValue.serverTimestamp(),

          reviewedAt:
            null,

          reviewedBy:
            null,

        });


        const refreshed =
          await ref.get();


        return NextResponse.json({

          ok: true,

          request: {
            id:
              ref.id,

            ...refreshed.data(),
          },

        });

      }


      // ----------------------------------------------
      // Pending / accepted
      // ----------------------------------------------

      return NextResponse.json({

        ok: true,

        request: {
          id:
            ref.id,

          ...current,
        },

      });

    }


    // --------------------------------------------------
    // Create new request
    // --------------------------------------------------

    const data = {

      paperClassId,

      studentId:
        student.uid,

      studentName:
        student.fullName || "",

      studentCode:
        student.studentCode || "",

      grade:
        student.className || "",

      status:
        "pending",

      createdAt:
        FieldValue.serverTimestamp(),

      updatedAt:
        FieldValue.serverTimestamp(),

      reviewedAt:
        null,

      reviewedBy:
        null,

    };


    await ref.set(
      data
    );


    // --------------------------------------------------
    // Return saved request
    // --------------------------------------------------

    const saved =
      await ref.get();


    return NextResponse.json({

      ok: true,

      request: {
        id:
          ref.id,

        ...saved.data(),
      },

    });

  } catch (error) {

    console.error(
      "PAPER CLASS REQUEST ERROR:",
      error
    );


    const message =
      error?.message ||
      "Request failed.";


    if (
      message ===
      "UNAUTHORIZED"
    ) {

      return NextResponse.json(
        {
          error:
            "Please login again.",
        },
        {
          status: 401,
        }
      );

    }


    if (
      message ===
      "FORBIDDEN"
    ) {

      return NextResponse.json(
        {
          error:
            "You do not have permission to request this paper class.",
        },
        {
          status: 403,
        }
      );

    }


    return NextResponse.json(
      {
        error:
          message,
      },
      {
        status: 500,
      }
    );

  }

}
