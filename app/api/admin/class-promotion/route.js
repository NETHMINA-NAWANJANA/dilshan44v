import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { requireAdmin } from "@/lib/server-auth";

const UP_MAP = {
  "6-N": "6",
  "6": "7",
  "7": "8",
  "8": "9",
  "9": "10",
  "10": "11",
  "11": "11-L",
};

const DOWN_MAP = {
  "11-L": "11",
  "11": "10",
  "10": "9",
  "9": "8",
  "8": "7",
  "7": "6",
  "6": "6-N",
};

function normalizeClassName(value) {
  if (!value) return "";

  const text = String(value).trim();

  // "Grade 6" -> "6"
  // "Grade 11" -> "11"
  // "Grade 11-L" -> "11-L"
  // "6-N" stays "6-N"
  const match = text.match(/^Grade\s+(.+)$/i);

  if (match) {
    return match[1].trim();
  }

  return text;
}

function displayClassName(value) {
  if (!value) return value;

  // Keep special class as-is
  if (value === "6-N" || value === "11-L") {
    return value;
  }

  // Save normal grades in the same format used by the student profile
  return `Grade ${value}`;
}

export async function POST(request) {
  try {
    const admin = await requireAdmin(request);

    const body = await request.json();
    const action = String(body.action || "")
      .trim()
      .toUpperCase();

    if (action !== "UP" && action !== "DOWN") {
      return Response.json(
        {
          ok: false,
          message: "Invalid promotion action.",
        },
        { status: 400 }
      );
    }

    const map = action === "UP" ? UP_MAP : DOWN_MAP;

    const snapshot = await adminDb
      .collection("users")
      .where("role", "==", "student")
      .where("status", "==", "active")
      .get();

    if (snapshot.empty) {
      return Response.json({
        ok: true,
        updatedCount: 0,
        skippedCount: 0,
        message: "No active students found.",
      });
    }

    const updates = [];

    snapshot.forEach((doc) => {
      const data = doc.data();

      const originalClass = data.className || "";

      // Convert "Grade 6" -> "6"
      const normalizedClass = normalizeClassName(originalClass);

      const nextClass = map[normalizedClass];

      // Unknown class -> skip
      if (!nextClass) {
        return;
      }

      // Save normal grades as "Grade 7", "Grade 8", etc.
      // Special classes remain "6-N" / "11-L".
      const finalClassName = displayClassName(nextClass);

      updates.push({
        ref: doc.ref,
        oldClass: originalClass,
        newClass: finalClassName,
      });
    });

    if (!updates.length) {
      return Response.json({
        ok: true,
        updatedCount: 0,
        skippedCount: snapshot.size,
        message: `No students could be promoted ${action}.`,
      });
    }

    // Firestore batch limit is 500.
    // Keep it below the limit for safety.
    const chunkSize = 400;

    for (let i = 0; i < updates.length; i += chunkSize) {
      const chunk = updates.slice(i, i + chunkSize);

      const batch = adminDb.batch();

      for (const item of chunk) {
        batch.update(item.ref, {
          className: item.newClass,

          classPromotionAt:
            item.newClass === "11-L"
              ? FieldValue.serverTimestamp()
              : null,

          classPromotionUpdatedAt:
            FieldValue.serverTimestamp(),

          classPromotionUpdatedBy: admin.uid,
        });
      }

      await batch.commit();
    }

    return Response.json({
      ok: true,
      action,
      updatedCount: updates.length,
      skippedCount: snapshot.size - updates.length,
      message: `${updates.length} student(s) promoted ${action} successfully.`,
    });
  } catch (error) {
    console.error("CLASS PROMOTION ERROR:", error);

    if (error.message === "UNAUTHORIZED") {
      return Response.json(
        {
          ok: false,
          message: "Unauthorized.",
        },
        { status: 401 }
      );
    }

    if (error.message === "FORBIDDEN") {
      return Response.json(
        {
          ok: false,
          message: "Admin access required.",
        },
        { status: 403 }
      );
    }

    return Response.json(
      {
        ok: false,
        message: error.message || "Class promotion failed.",
      },
      { status: 500 }
    );
  }
}
