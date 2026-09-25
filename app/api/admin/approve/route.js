import {
  NextResponse,
} from "next/server";

import {
  randomUUID,
} from "crypto";

import {
  FieldValue,
} from "firebase-admin/firestore";

import {
  adminAuth,
  adminDb,
} from "@/lib/firebase-admin";

import {
  requireAdmin,
} from "@/lib/server-auth";


function generateStudentCode() {
  return `ST-${Math.random()
    .toString(36)
    .slice(2, 7)
    .toUpperCase()}`;
}


async function getUniqueStudentCode() {
  for (
    let attempt = 0;
    attempt < 100;
    attempt++
  ) {
    const code =
      generateStudentCode();


    const existingStudent =
      await adminDb
        .collection("users")
        .where(
          "studentCode",
          "==",
          code
        )
        .limit(1)
        .get();


    if (
      !existingStudent.empty
    ) {
      continue;
    }


    const reserved =
      await adminDb
        .collection(
          "usedStudentIds"
        )
        .doc(code)
        .get();


    if (reserved.exists) {
      continue;
    }


    return code;
  }


  throw new Error(
    "Unable to generate unique Student ID."
  );
}


export async function POST(
  request
) {
  try {
    await requireAdmin(
      request
    );


    const {
      uid,
    } =
      await request.json();


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


    const ref =
      adminDb
        .collection("users")
        .doc(uid);


    const snapshot =
      await ref.get();


    if (
      !snapshot.exists ||
      snapshot.data().role !==
        "student"
    ) {
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
      snapshot.data();


    if (
      student.status !==
      "pending"
    ) {
      return NextResponse.json(
        {
          error:
            "Only pending students can be approved.",
        },
        {
          status: 400,
        }
      );
    }


    const code =
      await getUniqueStudentCode();


    const qrToken =
      randomUUID();


    const codeRef =
      adminDb
        .collection(
          "usedStudentIds"
        )
        .doc(code);


    const batch =
      adminDb.batch();


    /*
     * Permanently reserve ID.
     */
    batch.set(
      codeRef,
      {
        reserved: true,

        createdAt:
          FieldValue.serverTimestamp(),
      }
    );


    /*
     * Activate student.
     */
    batch.update(
      ref,
      {
        status: "active",

        studentCode:
          code,

        qrToken,

        // New students need their QR printed once — this stays
        // false until the admin downloads it from the QR Print page.
        qrPrinted: false,

        approvedAt:
          FieldValue.serverTimestamp(),

        suspendedAt:
          null,
      }
    );


    await batch.commit();


    /*
     * Ensure Firebase Auth active.
     */
    await adminAuth.updateUser(
      uid,
      {
        disabled: false,
      }
    );


    return NextResponse.json({
      ok: true,
      studentCode: code,
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
