import {
  NextResponse,
} from "next/server";

import {
  createHash,
} from "crypto";

import {
  adminDb,
} from "@/lib/firebase-admin";

function hashEmail(email) {
  return createHash(
    "sha256"
  )
    .update(
      String(email || "")
        .trim()
        .toLowerCase()
    )
    .digest("hex");
}

export async function POST(
  request
) {
  try {
    const {
      email,
    } =
      await request.json();

    if (!email) {
      return NextResponse.json({
        deleted: false,
      });
    }

    const hash =
      hashEmail(email);

    const snapshot =
      await adminDb
        .collection(
          "deletedAccounts"
        )
        .doc(hash)
        .get();

    return NextResponse.json({
      deleted:
        snapshot.exists &&
        snapshot.data()
          ?.deleted === true,
    });

  } catch {
    return NextResponse.json({
      deleted: false,
    });
  }
}
