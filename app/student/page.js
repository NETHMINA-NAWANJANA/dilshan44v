"use client";

import { useEffect, useState } from "react";

import {
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";

import { QRCodeSVG } from "qrcode.react";

import AuthGate from "@/components/AuthGate";
import NavBar from "@/components/NavBar";

import { db } from "@/lib/firebase";
import { formatDateTime, formatMoney } from "@/lib/helpers";

const YOUTUBE_CHANNEL =
  "https://www.youtube.com/@Getiyawalasir";

function StudentDashboard({ profile }) {
  const [attendance, setAttendance] = useState([]);
  const [photoData, setPhotoData] = useState("");
  const [downloading, setDownloading] = useState(false);

  const [dueBalance, setDueBalance] = useState(
    Number(profile.dueBalance || 0)
  );

  const [totalPaid, setTotalPaid] = useState(
    Number(profile.totalPaid || 0)
  );

  const [showSubscribePopup, setShowSubscribePopup] =
    useState(false);

  // --------------------------------------------------
  // FIRST LOGIN / FIRST VISIT YOUTUBE POPUP
  // --------------------------------------------------

  useEffect(() => {
    if (!profile?.id) return;

    const popupKey =
      `youtube-subscribe-popup-${profile.id}`;

    const alreadyShown =
      localStorage.getItem(popupKey);

    if (!alreadyShown) {
      setShowSubscribePopup(true);
    }
  }, [profile?.id]);

  function closeSubscribePopup() {
    if (!profile?.id) return;

    const popupKey =
      `youtube-subscribe-popup-${profile.id}`;

    localStorage.setItem(
      popupKey,
      "true"
    );

    setShowSubscribePopup(false);
  }

  function subscribeToYouTube() {
    if (!profile?.id) return;

    const popupKey =
      `youtube-subscribe-popup-${profile.id}`;

    // Mark as seen before opening YouTube
    // so it will not appear again.
    localStorage.setItem(
      popupKey,
      "true"
    );

    setShowSubscribePopup(false);

    window.open(
      YOUTUBE_CHANNEL,
      "_blank",
      "noopener,noreferrer"
    );
  }

  // --------------------------------------------------
  // LOAD DATA
  // --------------------------------------------------

  useEffect(() => {
    if (!profile?.id) {
      console.error(
        "Student profile ID is missing."
      );
      return;
    }

    const studentId = profile.id;

    console.log(
      "Student Dashboard UID:",
      studentId
    );

    // --------------------------------------------------
    // PROFILE PHOTO
    // --------------------------------------------------

    getDoc(
      doc(
        db,
        "studentPhotos",
        studentId
      )
    )
      .then((snapshot) => {
        if (snapshot.exists()) {
          const data =
            snapshot.data();

          setPhotoData(
            data.photoData || ""
          );
        }
      })
      .catch((error) => {
        console.error(
          "Student photo loading error:",
          error
        );
      });

    // --------------------------------------------------
    // ATTENDANCE
    //
    // No orderBy here.
    // This avoids Firestore composite index.
    // We sort markedAt in JavaScript.
    // --------------------------------------------------

    const attendanceQuery =
      query(
        collection(
          db,
          "attendance"
        ),
        where(
          "studentId",
          "==",
          studentId
        ),
        limit(100)
      );

    const unsubscribeAttendance =
      onSnapshot(
        attendanceQuery,
        (snapshot) => {
          console.log(
            "Attendance records found:",
            snapshot.size
          );

          const records =
            snapshot.docs
              .map((item) => ({
                id: item.id,
                ...item.data(),
              }))
              .sort((a, b) => {
                const aTime =
                  a.markedAt
                    ?.toMillis?.() || 0;

                const bTime =
                  b.markedAt
                    ?.toMillis?.() || 0;

                return bTime - aTime;
              });

          setAttendance(records);
        },
        (error) => {
          console.error(
            "Attendance history Firestore error:",
            error
          );

          setAttendance([]);
        }
      );

    // --------------------------------------------------
    // LIVE STUDENT PROFILE
    // --------------------------------------------------

    const unsubscribeProfile =
      onSnapshot(
        doc(
          db,
          "users",
          studentId
        ),
        (snapshot) => {
          if (!snapshot.exists()) {
            console.error(
              "Student users document not found:",
              studentId
            );

            return;
          }

          const data =
            snapshot.data();

          setDueBalance(
            Number.isFinite(
              data.dueBalance
            )
              ? data.dueBalance
              : 0
          );

          setTotalPaid(
            Number.isFinite(
              data.totalPaid
            )
              ? data.totalPaid
              : 0
          );
        },
        (error) => {
          console.error(
            "Student profile listener error:",
            error
          );
        }
      );

    return () => {
      unsubscribeAttendance();
      unsubscribeProfile();
    };
  }, [profile?.id]);

  // --------------------------------------------------
  // DOWNLOAD QR
  // --------------------------------------------------

  function downloadQr() {
    try {
      setDownloading(true);

      const svg =
        document.getElementById(
          "student-qr"
        );

      if (!svg) {
        alert(
          "QR code not found."
        );

        setDownloading(false);
        return;
      }

      const serializer =
        new XMLSerializer();

      const svgString =
        serializer.serializeToString(
          svg
        );

      const svgBlob =
        new Blob(
          [svgString],
          {
            type:
              "image/svg+xml;charset=utf-8",
          }
        );

      const url =
        URL.createObjectURL(
          svgBlob
        );

      const image =
        new Image();

      image.onload = () => {
        try {
          const canvas =
            document.createElement(
              "canvas"
            );

          const ctx =
            canvas.getContext(
              "2d"
            );

          const size = 700;

          canvas.width = size;
          canvas.height = size;

          ctx.fillStyle =
            "#ffffff";

          ctx.fillRect(
            0,
            0,
            size,
            size
          );

          const padding = 50;

          ctx.drawImage(
            image,
            padding,
            padding,
            size -
              padding * 2,
            size -
              padding * 2
          );

          URL.revokeObjectURL(
            url
          );

          const pngUrl =
            canvas.toDataURL(
              "image/png"
            );

          const link =
            document.createElement(
              "a"
            );

          link.href = pngUrl;

          link.download = `${
            profile.studentCode ||
            "student"
          }-qr.png`;

          document.body.appendChild(
            link
          );

          link.click();

          document.body.removeChild(
            link
          );

          setDownloading(false);
        } catch (error) {
          URL.revokeObjectURL(
            url
          );

          setDownloading(false);

          alert(
            error.message ||
              "QR download failed."
          );
        }
      };

      image.onerror = () => {
        URL.revokeObjectURL(
          url
        );

        setDownloading(false);

        alert(
          "QR download failed."
        );
      };

      image.src = url;
    } catch (error) {
      setDownloading(false);

      alert(
        error.message ||
          "QR download failed."
      );
    }
  }

  return (
    <>
      <NavBar student />

      <main className="container">

        {/* PAGE TITLE */}

        <div className="title-row">
          <div>

            <h1>
              Student Dashboard
            </h1>

            <p className="muted">
              View your profile, QR code and attendance history.
            </p>

          </div>
        </div>

        {/* GRADE 11 PAPER CLASSES */}
        {(String(profile.className || "").trim() === "11" || /^11(?:\b|[- ])/.test(String(profile.className || "").trim())) && (
          <section
            className="card"
            style={{
              marginTop: 18,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <div>
              <h2 style={{ margin: 0 }}>📚 Maths Paper Classes</h2>
              <p className="muted" style={{ marginBottom: 0 }}>
                11 වසර Paper Classes, papers සහ video lessons බලන්න.
              </p>
            </div>
            <a href="/student/paper-classes" className="btn btn-primary">
              Open Paper Classes →
            </a>
          </section>
        )}


        {/* PROFILE + QR */}

        <div className="grid grid-2">

          {/* PROFILE */}

          <section className="card">

            <div className="profile-row">

              {photoData ? (

                <img
                  src={photoData}
                  className="avatar"
                  alt="Student profile"
                />

              ) : (

                <div
                  className="avatar"
                  style={{
                    display: "grid",
                    placeItems:
                      "center",
                    background:
                      "#edf1f7",
                    fontSize: 28,
                  }}
                >
                  👤
                </div>

              )}

              <div>

                <h2>
                  {profile.fullName}
                </h2>

                <div className="muted">
                  {profile.email}
                </div>

                <div>
                  {profile.studentCode ||
                    "-"}
                </div>

              </div>

            </div>


            <hr />


            <p>
              <b>Full Name:</b>{" "}
              {profile.fullName ||
                "-"}
            </p>


            <p>
              <b>Email:</b>{" "}
              {profile.email ||
                "-"}
            </p>


            <p>
              <b>Student Phone:</b>{" "}
              {profile.phone ||
                "-"}
            </p>


            <p>
              <b>Class / Grade:</b>{" "}
              {profile.className ||
                "-"}
            </p>


            <p>
              <b>Address:</b>{" "}
              {profile.address ||
                "-"}
            </p>


            <p>
              <b>Student ID:</b>{" "}
              {profile.studentCode ||
                "-"}
            </p>


            <p>
              <b>Status:</b>{" "}

              <span className="badge badge-active">
                Active
              </span>

            </p>

          </section>


          {/* QR */}

          <section className="card">

            <h2>
              My QR Code
            </h2>

            <p className="muted">
              Show this QR code to the admin when marking attendance.
            </p>


            {profile.qrToken ? (

              <>

                <div className="qr-box">

                  <QRCodeSVG
                    id="student-qr"
                    value={
                      profile.qrToken
                    }
                    size={220}
                    level="H"
                    includeMargin
                  />

                </div>


                <div
                  style={{
                    marginTop: 14,
                  }}
                >

                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={
                      downloadQr
                    }
                    disabled={
                      downloading
                    }
                  >
                    {downloading
                      ? "Preparing QR..."
                      : "Download QR"}
                  </button>

                </div>


                <p
                  className="muted"
                  style={{
                    marginTop: 12,
                  }}
                >
                  Student ID:{" "}
                  <b>
                    {profile.studentCode ||
                      "-"}
                  </b>
                </p>

              </>

            ) : (

              <div className="error">
                QR code is not available.
              </div>

            )}

          </section>

        </div>


        {/* FEE STATUS */}

        <section
          className="card"
          style={{
            marginTop: 18,
          }}
        >

          <h2>
            My Fee Status
          </h2>


          <div
            className="due-box"
            style={{
              marginTop: 10,
            }}
          >

            <div className="due-row total">

              <span>
                Current Due Balance
              </span>

              <span
                className={
                  dueBalance > 0
                    ? "due-amount"
                    : ""
                }
              >
                {formatMoney(
                  dueBalance
                )}
              </span>

            </div>

          </div>


          {dueBalance > 0 ? (

            <p
              className="muted"
              style={{
                marginTop: 10,
              }}
            >
              You have a pending balance from previous classes. Please settle it at your next class.
            </p>

          ) : (

            <p
              className="muted"
              style={{
                marginTop: 10,
              }}
            >
              You have no pending balance. Thank you!
            </p>

          )}

        </section>


        {/* ATTENDANCE HISTORY */}

        <section
          className="card"
          style={{
            marginTop: 18,
          }}
        >

          <div className="title-row">

            <div>

              <h2>
                Attendance & Payment History
              </h2>

              <p className="muted">
                Your recorded attendance dates, fees and payments.
              </p>

            </div>


            <span className="badge">
              {attendance.length}{" "}
              Records
            </span>

          </div>


          <div className="table-wrap">

            <table>

              <thead>

                <tr>

                  <th>
                    #
                  </th>

                  <th>
                    Date & Time
                  </th>

                  <th>
                    Status
                  </th>

                  <th>
                    Daily Fee
                  </th>

                  <th>
                    Paid Amount
                  </th>

                  <th>
                    Due Balance
                  </th>

                </tr>

              </thead>


              <tbody>

                {attendance.map(
                  (
                    record,
                    index
                  ) => (

                    <tr
                      key={
                        record.id
                      }
                    >

                      <td>
                        {index + 1}
                      </td>


                      <td>
                        {formatDateTime(
                          record.markedAt
                        )}
                      </td>


                      <td>

                        <span className="badge badge-active">
                          {record.status ||
                            "Present"}
                        </span>

                      </td>


                      <td>
                        {record.dailyFee !=
                        null
                          ? formatMoney(
                              record.dailyFee
                            )
                          : "-"}
                      </td>


                      <td>
                        {record.paidAmount !=
                        null
                          ? formatMoney(
                              record.paidAmount
                            )
                          : "-"}
                      </td>


                      <td>
                        {record.dueAfter !=
                        null
                          ? formatMoney(
                              record.dueAfter
                            )
                          : "-"}
                      </td>

                    </tr>

                  )
                )}


                {!attendance.length && (

                  <tr>

                    <td colSpan="6">
                      No attendance records yet.
                    </td>

                  </tr>

                )}

              </tbody>

            </table>

          </div>

        </section>

      </main>


      {/* ==================================================
          YOUTUBE SUBSCRIBE POPUP
          ================================================== */}

      {showSubscribePopup && (

        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            background: "rgba(24, 32, 51, 0.55)",
            backdropFilter: "blur(6px)",
          }}
        >

          <div
            className="card"
            style={{
              position: "relative",
              width: "100%",
              maxWidth: "420px",
              padding: "32px 28px 26px",
              textAlign: "center",
              boxShadow: "0 25px 60px rgba(16,24,40,.18)",
            }}
          >

            {/* CLOSE BUTTON */}

            <button
              type="button"
              onClick={closeSubscribePopup}
              aria-label="Close"
              style={{
                position: "absolute",
                top: "12px",
                right: "12px",
                width: "34px",
                height: "34px",
                borderRadius: "50%",
                border: "1px solid var(--line)",
                background: "#fff",
                color: "var(--muted)",
                fontSize: "20px",
                lineHeight: 1,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ×
            </button>


            {/* BRAND MARK */}

            <div
              style={{
                width: "76px",
                height: "76px",
                margin: "0 auto 16px",
                borderRadius: "50%",
                overflow: "hidden",
                border: "3px solid var(--card)",
                boxShadow: "0 0 0 3px var(--primary)",
              }}
            >
              <img
                src="/sir.png"
                alt="Getiyawalasir"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  objectPosition: "center",
                }}
              />
            </div>


            {/* BADGE */}

            <h2
              style={{
                margin: "0 0 10px",
                fontSize: "22px",
                fontWeight: 800,
                color: "var(--text)",
              }}
            >
              Stay Connected
            </h2>


            <p
              style={{
                margin: "0 auto 20px",
                maxWidth: "320px",
                fontSize: "15px",
                lineHeight: 1.6,
                color: "var(--muted)",
              }}
            >
              Subscribe to our YouTube channel for Mathematics
              lessons, updates and useful learning content.
            </p>


            {/* SUBSCRIBE BUTTON */}

            <button
              type="button"
              className="btn"
              onClick={subscribeToYouTube}
              style={{
                width: "100%",
                background: "#dc2626",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                fontSize: "15px",
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8ZM9.6 15.5v-7l6.3 3.5-6.3 3.5Z" />
              </svg>
              Subscribe on YouTube
            </button>


          </div>

        </div>

      )}

    </>
  );
}


// ======================================================
// AUTH GATE
// ======================================================

export default function Page() {

  return (

    <AuthGate role="student">

      {(profile) => (
        <StudentDashboard
          profile={profile}
        />
      )}

    </AuthGate>

  );
}
