import { NextResponse } from "next/server";

import { adminDb } from "@/lib/firebase-admin";
import { requireAdmin } from "@/lib/server-auth";

function normalize(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

export async function GET(request) {
  try {
    await requireAdmin(request);

    const { searchParams } =
      new URL(request.url);

    const mode =
      searchParams.get("mode") ||
      "class";

    /* =====================================================
       STUDENT MODE
       Return ALL results for one student
    ===================================================== */

    if (mode === "student") {
      const studentUid =
        searchParams.get(
          "studentUid"
        );

      if (!studentUid) {
        return NextResponse.json(
          {
            error:
              "studentUid is required.",
          },
          { status: 400 }
        );
      }

      const snapshot =
        await adminDb
          .collection(
            "examResults"
          )
          .where(
            "studentId",
            "==",
            studentUid
          )
          .get();

      const results = [];

      snapshot.forEach((doc) => {
        const data = doc.data();

        results.push({
          id: doc.id,

          studentId:
            data.studentId ||
            "",

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

          examName:
            data.examName ||
            "Previous Result",

          marks:
            data.marks ?? null,

          examDate:
            data.examDate ||
            "",

          examYear:
            data.examYear ||
            null,

          examMonth:
            data.examMonth ||
            "",

          examDay:
            data.examDay ||
            null,
        });
      });

      /*
        Newest result first
      */

      results.sort((a, b) => {
        const aDate =
          String(
            a.examDate || ""
          );

        const bDate =
          String(
            b.examDate || ""
          );

        return bDate.localeCompare(
          aDate
        );
      });

      return NextResponse.json({
        success: true,
        count: results.length,
        results,
      });
    }

    /* =====================================================
       CLASS MODE
       Grade + Year + Month
       NO EXAM DATE FILTER
    ===================================================== */

    const className =
      searchParams.get(
        "className"
      );

    const examYear =
      searchParams.get(
        "examYear"
      );

    const examMonth =
      searchParams.get(
        "examMonth"
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

    if (!examYear) {
      return NextResponse.json(
        {
          error:
            "examYear is required.",
        },
        { status: 400 }
      );
    }

    if (!examMonth) {
      return NextResponse.json(
        {
          error:
            "examMonth is required.",
        },
        { status: 400 }
      );
    }

    const snapshot =
      await adminDb
        .collection(
          "examResults"
        )
        .get();

    const results = [];

    snapshot.forEach((doc) => {
      const data = doc.data();

      /*
        CLASS FILTER
      */

      if (
        normalize(
          data.className
        ) !==
        normalize(
          className
        )
      ) {
        return;
      }

      /*
        YEAR FILTER

        New records have examYear.

        Older records may not have
        examYear, so fallback to
        examDate.
      */

      let resultYear =
        data.examYear;

      if (!resultYear && data.examDate) {
        const yearFromDate =
          String(
            data.examDate
          ).substring(0, 4);

        resultYear =
          Number(
            yearFromDate
          );
      }

      if (
        String(resultYear) !==
        String(examYear)
      ) {
        return;
      }

      /*
        MONTH FILTER

        New records have examMonth.

        Older records:
        derive month from examDate.
      */

      let resultMonth =
        data.examMonth;

      if (
        !resultMonth &&
        data.examDate
      ) {
        const date =
          new Date(
            `${data.examDate}T00:00:00`
          );

        if (
          !Number.isNaN(
            date.getTime()
          )
        ) {
          const months = [
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

          resultMonth =
            months[
              date.getMonth()
            ];
        }
      }

      if (
        normalize(resultMonth) !==
        normalize(examMonth)
      ) {
        return;
      }

      results.push({
        id: doc.id,

        studentId:
          data.studentId ||
          "",

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
          className,

        examName:
          data.examName ||
          "Previous Result",

        marks:
          data.marks ?? null,

        examDate:
          data.examDate ||
          "",

        examYear:
          resultYear ||
          null,

        examMonth:
          resultMonth ||
          "",

        examDay:
          data.examDay ||
          null,
      });
    });

    /*
      Sort:
      Student ID
      then Exam Date
      then Exam Name
    */

    results.sort((a, b) => {
      const idCompare =
        String(
          a.studentCode || ""
        ).localeCompare(
          String(
            b.studentCode || ""
          )
        );

      if (idCompare !== 0) {
        return idCompare;
      }

      const dateCompare =
        String(
          a.examDate || ""
        ).localeCompare(
          String(
            b.examDate || ""
          )
        );

      if (dateCompare !== 0) {
        return dateCompare;
      }

      return String(
        a.examName || ""
      ).localeCompare(
        String(
          b.examName || ""
        )
      );
    });

    return NextResponse.json({
      success: true,

      filters: {
        className,
        examYear,
        examMonth,
      },

      count:
        results.length,

      results,
    });
  } catch (error) {
    console.error(
      "SEARCH EXAM RESULTS ERROR:",
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
          "Failed to search exam results.",
      },
      { status: 500 }
    );
  }
}
