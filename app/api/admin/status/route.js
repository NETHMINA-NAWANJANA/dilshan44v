import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import {
  adminAuth,
  adminDb,
} from "@/lib/firebase-admin";

import {
  requireAdmin,
} from "@/lib/server-auth";


export async function POST(request) {
  try {
    /*
     * Admin කෙනෙක්ද verify කරනවා
     */
    await requireAdmin(request);


    /*
     * Request data
     */
    const body =
      await request.json();

    const uid =
      String(
        body.uid || ""
      ).trim();

    const status =
      String(
        body.status || ""
      ).trim();


    /*
     * UID validation
     */
    if (!uid) {
      return NextResponse.json(
        {
          error:
            "Student UID is required.",
        },
        {
          status: 400,
        }
      );
    }


    /*
     * Status validation
     */
    if (
      ![
        "active",
        "suspended",
      ].includes(status)
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid status.",
        },
        {
          status: 400,
        }
      );
    }


    /*
     * Student document
     */
    const studentRef =
      adminDb
        .collection("users")
        .doc(uid);

    const studentSnap =
      await studentRef.get();


    if (!studentSnap.exists) {
      return NextResponse.json(
        {
          error:
            "Student not found.",
        },
        {
          status: 404,
        }
      );
    }


    const student =
      studentSnap.data();


    /*
     * Only student accounts
     */
    if (
      student.role !== "student"
    ) {
      return NextResponse.json(
        {
          error:
            "This account is not a student.",
        },
        {
          status: 400,
        }
      );
    }


    /*
     * =====================================
     * SUSPEND STUDENT
     * =====================================
     */
    if (
      status === "suspended"
    ) {
      if (
        student.status ===
        "suspended"
      ) {
        return NextResponse.json({
          ok: true,
          status: "suspended",
          message:
            "Student is already suspended.",
        });
      }


      /*
       * IMPORTANT:
       *
       * Student ID is NOT changed.
       * QR token is NOT changed.
       * Attendance is NOT deleted.
       * Profile data is NOT deleted.
       */


      /*
       * Disable Firebase Auth first
       */
      await adminAuth.updateUser(
        uid,
        {
          disabled: true,
        }
      );


      try {
        /*
         * Update Firestore
         */
        await studentRef.update({
          status: "suspended",

          suspendedAt:
            FieldValue.serverTimestamp(),

          activatedAt: null,
        });

      } catch (firestoreError) {
        /*
         * Firestore update fail වුණොත්
         * Auth account එක rollback කරනවා.
         */
        try {
          await adminAuth.updateUser(
            uid,
            {
              disabled: false,
            }
          );
        } catch {}

        throw firestoreError;
      }


      return NextResponse.json({
        ok: true,

        status: "suspended",

        message:
          "Student suspended successfully.",
      });
    }


    /*
     * =====================================
     * ACTIVATE STUDENT
     * =====================================
     */
    if (
      status === "active"
    ) {
      if (
        student.status ===
        "active"
      ) {
        /*
         * Auth disabled වෙලා තිබුණොත්
         * ensure enable කරනවා.
         */
        await adminAuth.updateUser(
          uid,
          {
            disabled: false,
          }
        );

        return NextResponse.json({
          ok: true,

          status: "active",

          message:
            "Student is already active.",
        });
      }


      /*
       * Enable Firebase Auth
       */
      await adminAuth.updateUser(
        uid,
        {
          disabled: false,
        }
      );


      try {
        /*
         * Restore student to Active.
         *
         * Existing studentCode,
         * qrToken,
         * attendance,
         * profile data untouched.
         */
        await studentRef.update({
          status: "active",

          suspendedAt: null,

          activatedAt:
            FieldValue.serverTimestamp(),
        });

      } catch (firestoreError) {
        /*
         * Firestore fail වුණොත්
         * suspended account එක
         * නැවත disabled කරනවා.
         */
        try {
          await adminAuth.updateUser(
            uid,
            {
              disabled: true,
            }
          );
        } catch {}

        throw firestoreError;
      }


      return NextResponse.json({
        ok: true,

        status: "active",

        message:
          "Student activated successfully.",

        /*
         * Same ID stays.
         */
        studentCode:
          student.studentCode ||
          null,
      });
    }


  } catch (error) {
    console.error(
      "Student status update error:",
      error
    );


    /*
     * requireAdmin එකෙන් status
     * property එවනවා නම් ඒක use කරනවා.
     */
    const httpStatus =
      error?.status === 401
        ? 401
        : error?.status === 403
        ? 403
        : 500;


    return NextResponse.json(
      {
        error:
          error?.message ||
          "Unable to update student status.",
      },
      {
        status: httpStatus,
      }
    );
  }
}
