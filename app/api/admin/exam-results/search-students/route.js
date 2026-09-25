import { NextResponse } from "next/server";

import { adminDb } from "@/lib/firebase-admin";
import { requireAdmin } from "@/lib/server-auth";

export async function GET(request) {
  try {
    await requireAdmin(request);

    const { searchParams } =
      new URL(request.url);

    const studentId =
      (
        searchParams.get(
          "studentId"
        ) || ""
      )
        .trim()
        .toLowerCase();

    const studentName =
      (
        searchParams.get(
          "studentName"
        ) || ""
      )
        .trim()
        .toLowerCase();

    if (
      !studentId &&
      !studentName
    ) {
      return NextResponse.json({
        success: true,
        students: [],
      });
    }

    /*
      Get student users.

      We don't use Firestore composite
      index here.
    */

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

      /*
        Suspended/deleted students
        are not shown for normal
        result searching.
      */
      if (
        data.status &&
        data.status !== "active"
      ) {
        return;
      }

      const code =
        String(
          data.studentCode || ""
        ).toLowerCase();

      const name =
        String(
          data.fullName || ""
        ).toLowerCase();

      /*
        Student ID search
      */
      if (
        studentId &&
        !code.includes(studentId)
      ) {
        return;
      }

      /*
        Student Name search
      */
      if (
        studentName &&
        !name.includes(studentName)
      ) {
        return;
      }

      students.push({
        id: doc.id,

        studentCode:
          data.studentCode ||
          "",

        fullName:
          data.fullName ||
          "",

        phone:
          data.phone || "",

        className:
          data.className ||
          "",
      });
    });

    students.sort((a, b) => {
      const aName =
        String(
          a.fullName || ""
        );

      const bName =
        String(
          b.fullName || ""
        );

      return aName.localeCompare(
        bName
      );
    });

    /*
      Limit dropdown results.
      This prevents huge dropdowns.
    */

    return NextResponse.json({
      success: true,
      students:
        students.slice(0, 20),
    });
  } catch (error) {
    console.error(
      "SEARCH STUDENTS ERROR:",
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
          "Failed to search students.",
      },
      { status: 500 }
    );
  }
}
