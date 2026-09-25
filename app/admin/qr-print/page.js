"use client";

import { useEffect, useState } from "react";

import {
  collection,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";

import QRCode from "qrcode";
import JSZip from "jszip";

import AuthGate from "@/components/AuthGate";
import NavBar from "@/components/NavBar";

import { auth, db } from "@/lib/firebase";

function sanitizeFileName(value) {
  return String(value || "student")
    .trim()
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function drawQrWithName(qrDataUrl, name) {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => {
      const qrSize = 600;
      const labelHeight = 90;

      const canvas = document.createElement("canvas");
      canvas.width = qrSize;
      canvas.height = qrSize + labelHeight;

      const ctx = canvas.getContext("2d");

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.drawImage(image, 0, 0, qrSize, qrSize);

      ctx.fillStyle = "#000000";
      ctx.font = "bold 34px Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(
        name || "-",
        canvas.width / 2,
        qrSize + labelHeight / 2,
        canvas.width - 30
      );

      resolve(canvas.toDataURL("image/png"));
    };

    image.onerror = reject;
    image.src = qrDataUrl;
  });
}

function QrPrintPage() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const studentsQuery = query(
      collection(db, "users"),
      where("role", "==", "student"),
      where("status", "==", "active")
    );

    const unsubscribe = onSnapshot(studentsQuery, (snapshot) => {
      // Missing qrPrinted field (older students, created before this
      // feature) is treated the same as false, so nothing is missed.
      const pending = snapshot.docs
        .map((item) => ({ id: item.id, ...item.data() }))
        .filter((student) => student.qrToken && student.qrPrinted !== true);

      setStudents(pending);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  async function downloadAllQrCodes() {
    if (!students.length) return;

    setDownloading(true);
    setMessage("");

    try {
      const zip = new JSZip();
      const usedNames = new Set();

      for (const student of students) {
        const rawDataUrl = await QRCode.toDataURL(student.qrToken, {
          width: 600,
          margin: 2,
        });

        const dataUrl = await drawQrWithName(
          rawDataUrl,
          student.fullName
        );

        const base64 = dataUrl.split(",")[1];

        let fileName = `${sanitizeFileName(
          student.studentCode
        )}-${sanitizeFileName(student.fullName)}.png`;

        // Guard against duplicate file names inside the zip.
        let counter = 2;
        while (usedNames.has(fileName)) {
          fileName = `${sanitizeFileName(
            student.studentCode
          )}-${sanitizeFileName(student.fullName)}-${counter}.png`;
          counter += 1;
        }

        usedNames.add(fileName);

        zip.file(fileName, base64, { base64: true });
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);

      const dateLabel = new Date().toISOString().slice(0, 10);

      const link = document.createElement("a");
      link.href = url;
      link.download = `qr-codes-${dateLabel}.zip`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);

      // Mark these students as printed so they drop off this list.
      const token = await auth.currentUser.getIdToken();

      const response = await fetch("/api/admin/mark-qr-printed", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          studentIds: students.map((student) => student.id),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Downloaded, but failed to update QR print status."
        );
      }

      setMessage(
        `Downloaded ${students.length} QR code(s). They won't show here again.`
      );
    } catch (error) {
      setMessage(error.message || "Failed to download QR codes.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <>
      <NavBar admin />

      <main className="container">
        <div className="title-row">
          <div>
            <h1>QR Print</h1>

            <p className="muted">
              Newly approved students whose QR code hasn't been printed
              yet. Download them all as PNG files in one zip, print, then
              hand them out.
            </p>
          </div>

          <span className="badge">
            {students.length} Pending
          </span>
        </div>

        <section className="card" style={{ marginTop: 18 }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={downloadAllQrCodes}
            disabled={downloading || !students.length}
          >
            {downloading
              ? "Preparing zip..."
              : `Download All QR Codes (${students.length})`}
          </button>

          {message && (
            <div
              className={
                message.toLowerCase().includes("failed")
                  ? "error"
                  : "success"
              }
              style={{ marginTop: 12 }}
            >
              {message}
            </div>
          )}
        </section>

        <section className="card table-wrap" style={{ marginTop: 18 }}>
          <table>
            <thead>
              <tr>
                <th>Student ID</th>
                <th>Name</th>
                <th>Class</th>
              </tr>
            </thead>

            <tbody>
              {students.map((student) => (
                <tr key={student.id}>
                  <td>{student.studentCode || "-"}</td>
                  <td>{student.fullName || "-"}</td>
                  <td>{student.className || "-"}</td>
                </tr>
              ))}

              {!loading && !students.length && (
                <tr>
                  <td colSpan="3">
                    No students waiting for a QR print. Every active
                    student's QR has already been downloaded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      </main>
    </>
  );
}

export default function Page() {
  return (
    <AuthGate role="admin">
      {() => <QrPrintPage />}
    </AuthGate>
  );
}
