import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { requireAdmin } from "@/lib/server-auth";
import { DEFAULT_DAILY_FEE } from "@/lib/helpers";

const SETTINGS_REF = adminDb.collection("settings").doc("fees");

export async function GET(request) {
  try {
    await requireAdmin(request);

    const snap = await SETTINGS_REF.get();
    const dailyFee = snap.exists && Number.isFinite(snap.data().dailyFee)
      ? snap.data().dailyFee
      : DEFAULT_DAILY_FEE;

    return NextResponse.json({ dailyFee });
  } catch (error) {
    const status = error.message === "UNAUTHORIZED" ? 401 : error.message === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: error.message || "Unable to load fee settings." }, { status });
  }
}

export async function POST(request) {
  try {
    const admin = await requireAdmin(request);

    const { dailyFee } = await request.json();
    const fee = Number(dailyFee);

    if (!Number.isFinite(fee) || fee <= 0) {
      return NextResponse.json({ error: "Enter a valid daily fee amount." }, { status: 400 });
    }

    await SETTINGS_REF.set(
      {
        dailyFee: fee,
        updatedAt: Timestamp.now(),
        updatedBy: admin.uid,
      },
      { merge: true }
    );

    return NextResponse.json({ ok: true, dailyFee: fee });
  } catch (error) {
    const status = error.message === "UNAUTHORIZED" ? 401 : error.message === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: error.message || "Unable to update fee settings." }, { status });
  }
}
