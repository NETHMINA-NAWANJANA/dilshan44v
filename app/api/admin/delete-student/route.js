import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { FieldValue } from "firebase-admin/firestore";

import {
  adminAuth,
  adminDb,
} from "@/lib/firebase-admin";

import {
  requireAdmin,
} from "@/lib/server-auth";


function hashEmail(email) {
  return createHash("sha256")
    .update(
      String(email || "")
        .trim()
        .toLowerCase()
    )
    .digest("hex");
}


async function deleteQueryInBatches(query) {
  while (true) {
    const snapshot =
      await query.limit(400).get();

    if (snapshot.empty) {
      break;
    }

    const batch =
      adminDb.batch();

    snapshot.docs.forEach(
      (document) => {
        batch.delete(
          document.ref
        );
      }
    );

    await batch.commit();

    if (
      snapshot.size < 400
    ) {
      break;
    }
  }
}


export async function POST(request) {
  try {
    /*
     * Admin verify
     */
    await requireAdmin(request);


    /*
     * Request body
     */
    const body =
      await request.json();

    const uid =
      String(
        body.uid || ""
      ).trim();


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
     * Student account only
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
     * Safety:
     * Active student direct delete කරන්න බෑ.
     * මුලින් Suspend කරන්න ඕන.
     */
    if (
      student.status !==
      "suspended"
    ) {
      return NextResponse.json(
        {
          error:
            "Suspend the student before permanent deletion.",
        },
        {
          status: 400,
        }
      );
    }


    const email =
      String(
        student.email || ""
      )
        .trim()
        .toLowerCase();

    const studentCode =
      student.studentCode ||
      null;


    /*
     * =================================
     * 1. DELETED ACCOUNT MARKER
     * =================================
     *
     * Raw email save කරන්නේ නෑ.
     * Hash එකක් විතරක් save කරනවා.
     *
     * මේකෙන් deleted user login
     * try කළාම custom message එක
     * පෙන්වන්න පුළුවන්.
     */

    if (email) {
      const emailHash =
        hashEmail(email);

      await adminDb
        .collection(
          "deletedAccounts"
        )
        .doc(emailHash)
        .set(
          {
            deleted: true,

            deletedAt:
              FieldValue.serverTimestamp(),
          },
          {
            merge: true,
          }
        );
    }


    /*
     * =================================
     * 2. STUDENT ID PERMANENTLY RESERVE
     * =================================
     *
     * Student delete කළත්
     * Student ID එක reuse කරන්නේ නෑ.
     */

    if (studentCode) {
      await adminDb
        .collection(
          "usedStudentIds"
        )
        .doc(studentCode)
        .set(
          {
            reserved: true,

            retired: true,

            retiredAt:
              FieldValue.serverTimestamp(),
          },
          {
            merge: true,
          }
        );
    }


    /*
     * =================================
     * 3. DELETE ATTENDANCE RECORDS
     * =================================
     */

    await deleteQueryInBatches(
      adminDb
        .collection(
          "attendance"
        )
        .where(
          "studentId",
          "==",
          uid
        )
    );


    /*
     * =================================
     * 4. DELETE ATTENDANCE LOCKS
     * =================================
     */

    try {
      await deleteQueryInBatches(
        adminDb
          .collection(
            "attendanceLocks"
          )
          .where(
            "studentId",
            "==",
            uid
          )
      );
    } catch (error) {
      console.warn(
        "Attendance lock query cleanup skipped:",
        error.message
      );
    }


    /*
     * Some versions use UID
     * directly as lock document ID.
     */
    try {
      await adminDb
        .collection(
          "attendanceLocks"
        )
        .doc(uid)
        .delete();
    } catch {}


    /*
     * =================================
     * 5. DELETE PROFILE PHOTO
     * =================================
     */

    try {
      await adminDb
        .collection(
          "studentPhotos"
        )
        .doc(uid)
        .delete();
    } catch {}


    /*
     * =================================
     * 6. DELETE USER PROFILE
     * =================================
     */

    await studentRef.delete();


    /*
     * =================================
     * 7. DELETE FIREBASE AUTH ACCOUNT
     * =================================
     */

    try {
      await adminAuth.deleteUser(
        uid
      );
    } catch (error) {
      if (
        error.code !==
        "auth/user-not-found"
      ) {
        throw error;
      }
    }


    /*
     * SUCCESS
     */
    return NextResponse.json({
      ok: true,

      message:
        "Student permanently deleted.",

      studentCode:
        studentCode,
    });


  } catch (error) {
    console.error(
      "Delete student error:",
      error
    );


    const status =
      error?.status === 401
        ? 401
        : error?.status === 403
        ? 403
        : 500;


    return NextResponse.json(
      {
        error:
          error?.message ||
          "Unable to permanently delete student.",
      },
      {
        status,
      }
    );
  }
}
