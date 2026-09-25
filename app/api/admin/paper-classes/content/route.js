import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { requireAdmin } from "@/lib/server-auth";

function cleanUrl(value) {
  return String(value || "").trim();
}

export async function POST(request) {
  try {
    const admin = await requireAdmin(request);
    const body = await request.json();
    const paperClassId = String(body?.paperClassId || "").trim();
    const type = String(body?.type || "").trim();
    const title = String(body?.title || "").trim();
    const url = cleanUrl(body?.url);
    const videoUrl = cleanUrl(body?.videoUrl);
    const description = String(body?.description || "").trim();
    const paperDate = String(body?.paperDate || "").trim();
    const order = Number(body?.order || 0) || 0;

    if (!paperClassId || !title || !["paper", "video", "resource"].includes(type)) {
      return NextResponse.json({ error: "Class, content type and title are required." }, { status: 400 });
    }
    if (type === "paper" && !url) {
      return NextResponse.json({ error: "Drive/Paper link is required." }, { status: 400 });
    }

    const classRef = adminDb.collection("paperClasses").doc(paperClassId);
    const classSnap = await classRef.get();
    if (!classSnap.exists) {
      return NextResponse.json({ error: "Paper class not found." }, { status: 404 });
    }

    const groupId = crypto.randomUUID();
    const batch = adminDb.batch();
    const paperRef = classRef.collection("content").doc();

    batch.set(paperRef, {
      type,
      title,
      url,
      description,
      paperDate,
      order,
      groupId,
      createdBy: admin.uid,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // When an admin creates a Paper, also create its linked Video row.
    // If no YouTube link is supplied, it stays pending until edited later.
    if (type === "paper") {
      const videoRef = classRef.collection("content").doc();
      batch.set(videoRef, {
        type: "video",
        title,
        url: videoUrl,
        description: "YouTube video",
        order,
        groupId,
        status: videoUrl ? "ready" : "pending",
        createdBy: admin.uid,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    await batch.commit();
    return NextResponse.json({ ok: true, id: paperRef.id, groupId });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Unable to add content." },
      { status: error.message === "UNAUTHORIZED" ? 401 : 403 }
    );
  }
}

export async function PATCH(request) {
  try {
    const admin = await requireAdmin(request);
    const body = await request.json();
    const paperClassId = String(body?.paperClassId || "").trim();
    const contentId = String(body?.contentId || "").trim();
    const title = String(body?.title || "").trim();
    const url = cleanUrl(body?.url);
    const videoUrl = cleanUrl(body?.videoUrl);
    const description = String(body?.description || "").trim();
    const paperDate = String(body?.paperDate || "").trim();
    const order = Number(body?.order || 0) || 0;

    if (!paperClassId || !contentId || !title) {
      return NextResponse.json({ error: "Class, content and title are required." }, { status: 400 });
    }

    const classRef = adminDb.collection("paperClasses").doc(paperClassId);
    const contentRef = classRef.collection("content").doc(contentId);
    const snap = await contentRef.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Content not found." }, { status: 404 });
    }

    const current = snap.data();
    if (current.type !== "paper") {
      return NextResponse.json({ error: "Only Paper items can be edited here." }, { status: 400 });
    }
    if (!url) {
      return NextResponse.json({ error: "Drive/Paper link is required." }, { status: 400 });
    }

    const batch = adminDb.batch();
    batch.update(contentRef, {
      title,
      url,
      description,
      paperDate,
      order,
      updatedAt: FieldValue.serverTimestamp(),
    });

    if (current.groupId) {
      const videoSnap = await classRef.collection("content")
        .where("groupId", "==", current.groupId)
        .where("type", "==", "video")
        .limit(1)
        .get();

      if (!videoSnap.empty) {
        batch.update(videoSnap.docs[0].ref, {
          title,
          url: videoUrl,
          status: videoUrl ? "ready" : "pending",
          order,
          updatedAt: FieldValue.serverTimestamp(),
        });
      } else {
        const videoRef = classRef.collection("content").doc();
        batch.set(videoRef, {
          type: "video",
          title,
          url: videoUrl,
          description: "YouTube video",
          order,
          groupId: current.groupId,
          status: videoUrl ? "ready" : "pending",
          createdBy: admin.uid,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    }

    await batch.commit();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Unable to update content." },
      { status: error.message === "UNAUTHORIZED" ? 401 : 403 }
    );
  }
}
