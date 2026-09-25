import { NextResponse } from "next/server";

import { adminDb } from "@/lib/firebase-admin";
import { requireAdmin } from "@/lib/server-auth";

export async function GET(request) {
  try {
    await requireAdmin(request);

    const { searchParams } =
      new URL(request.url);

    const className =
      searchParams.get(
        "className"
      );

    if (!className) {
      return NextResponse.json(
        {
          error:
            "className is required.",
        },
        { status: 400 }
      );
    }

    const snapshot =
      await adminDb
        .collection("users")
        .where(
          "role",
          "==",
          "student"
        )
        .get();

    const students = [];

    snapshot.forEach((doc) => {
      const data = doc.data();

      if (
        data.status !== "active"
      ) {
        return;
      }

      if (
        data.className !==
        className
      ) {
        return;
      }

      students.push({
        id: doc.id,

        studentCode:
          data.studentCode ||
          null,

        fullName:
          data.fullName || "",

        phone:
          data.phone || "",

        className:
          data.className ||
          className,
      });
    });

    students.sort((a, b) =>
      String(
        a.studentCode || ""
      ).localeCompare(
        String(
          b.studentCode || ""
        )
      )
    );

    return NextResponse.json({
      success: true,
      students,
    });
  } catch (error) {
    console.error(
      "LOAD STUDENTS ERROR:",
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
          "Failed to load students.",
      },
      { status: 500 }
    );
  }
}
