import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireAdmin } from "@/lib/server-auth";

export async function GET(request) {
  try {
    await requireAdmin(request);
    const uid = new URL(request.url).searchParams.get("uid");
    const q = await adminDb.collection("attendance")
      .where("studentId","==",uid)
      .orderBy("markedAt","desc")
      .limit(1).get();

    if (q.empty) return NextResponse.json({markedAt:null});
    return NextResponse.json({markedAt:q.docs[0].data().markedAt.toDate().toISOString()});
  } catch(e) {
    return NextResponse.json({error:e.message || "Failed."},{status:403});
  }
}
