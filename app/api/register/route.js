import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import {
  adminAuth,
  adminDb,
} from "@/lib/firebase-admin";

export async function POST(request) {
  let createdUid = null;

  try {
    const body = await request.json();

    const fullName = String(
      body.fullName || ""
    ).trim();

    const email = String(
      body.email || ""
    )
      .trim()
      .toLowerCase();

    const phone = String(
      body.phone || ""
    ).trim();

    const password = String(
      body.password || ""
    );

    const className = String(
      body.className || ""
    ).trim();

    const address = String(
      body.address || ""
    ).trim();

    if (
      !fullName ||
      !email ||
      !phone ||
      password.length < 6 ||
      !className ||
      !address
    ) {
      return NextResponse.json(
        {
          error:
            "Please complete all required fields correctly.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Email duplication එක Firebase Auth
     * automatically check කරනවා.
     */
    const user =
      await adminAuth.createUser({
        email,
        password,
        displayName: fullName,
        disabled: false,
      });

    createdUid = user.uid;

    await adminDb
      .collection("users")
      .doc(user.uid)
      .set({
        fullName,
        email,
        phone,
        className,
        address,

        role: "student",

        status: "pending",

        studentCode: null,
        qrToken: null,

        createdAt:
          FieldValue.serverTimestamp(),

        approvedAt: null,
      });

    return NextResponse.json({
      success: true,
      uid: user.uid,
    });
  } catch (error) {
    /*
     * Firestore document create fail උනොත්
     * Firebase Auth account එකත් rollback කරනවා.
     */
    if (createdUid) {
      try {
        await adminAuth.deleteUser(
          createdUid
        );
      } catch {}
    }

    let message =
      error.message ||
      "Registration failed.";

    if (
      error.code ===
      "auth/email-already-exists"
    ) {
      message =
        "This email address is already registered.";
    }

    if (
      error.code ===
      "auth/invalid-email"
    ) {
      message =
        "Please enter a valid email address.";
    }

    if (
      error.code ===
      "auth/invalid-password"
    ) {
      message =
        "Please choose a stronger password.";
    }

    return NextResponse.json(
      {
        error: message,
      },
      {
        status: 400,
      }
    );
  }
}
