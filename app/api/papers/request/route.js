import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export async function POST(request) {
  try {
    const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    if (!token) return NextResponse.json({ error: "Login required." }, { status: 401 });
    const decoded = await adminAuth.verifyIdToken(token);
    const { className } = await request.json();
    if (!["Paper Class", "Theory"].includes(className)) return NextResponse.json({ error: "Invalid class." }, { status: 400 });
    const ref = adminDb.collection("classAccessRequests").doc(`${decoded.uid}_${className.replace(/\s/g,"_").toLowerCase()}`);
    const old = await ref.get();
    if (old.exists && ["pending", "approved"].includes(old.data().status)) return NextResponse.json({ success: true, status: old.data().status });
    const user = await adminDb.collection("users").doc(decoded.uid).get();
    if (!user.exists) return NextResponse.json({ error: "Student profile not found." }, { status: 404 });
    await ref.set({ uid: decoded.uid, fullName: user.data().fullName || "", email: user.data().email || decoded.email || "", className, status: "pending", requestedAt: FieldValue.serverTimestamp() });
    return NextResponse.json({ success: true, status: "pending" });
  } catch (e) { return NextResponse.json({ error: e.message || "Request failed" }, { status: 401 }); }
}
