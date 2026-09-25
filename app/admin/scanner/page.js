"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Html5Qrcode,
} from "html5-qrcode";

import AuthGate from "@/components/AuthGate";
import NavBar from "@/components/NavBar";

import {
  auth,
} from "@/lib/firebase";

import {
  formatMoney,
} from "@/lib/helpers";

function ScannerPage() {
  const [
    student,
    setStudent,
  ] = useState(null);

  const [
    message,
    setMessage,
  ] = useState("");

  const [busy, setBusy] =
    useState(false);

  const [paidAmount, setPaidAmount] =
    useState("");

  const [paidToday, setPaidToday] =
    useState(false);

  const [lastResult, setLastResult] =
    useState(null);

  const scannerRef =
    useRef(null);

  const runningRef =
    useRef(false);

  useEffect(() => {
    return () => {
      if (
        scannerRef.current &&
        runningRef.current
      ) {
        scannerRef.current
          .stop()
          .catch(() => {});
      }
    };
  }, []);

  async function getToken() {
    if (!auth.currentUser) {
      throw new Error(
        "Admin session not found."
      );
    }

    return auth.currentUser.getIdToken();
  }

  async function startScanner() {
    setStudent(null);
    setMessage("");
    setLastResult(null);
    setPaidAmount("");
    setPaidToday(false);

    try {
      if (
        scannerRef.current &&
        runningRef.current
      ) {
        await scannerRef.current
          .stop()
          .catch(() => {});

        runningRef.current =
          false;
      }

      const scanner =
        new Html5Qrcode(
          "qr-reader"
        );

      scannerRef.current =
        scanner;

      const cameras =
        await Html5Qrcode.getCameras();

      if (!cameras.length) {
        throw new Error(
          "No camera found."
        );
      }

      runningRef.current =
        true;

      await scanner.start(
        {
          facingMode:
            "environment",
        },

        {
          fps: 10,

          qrbox: {
            width: 250,
            height: 250,
          },
        },

        async (
          decodedText
        ) => {
          if (
            !runningRef.current
          ) {
            return;
          }

          runningRef.current =
            false;

          await scanner
            .stop()
            .catch(() => {});

          await findStudent(
            decodedText
          );
        },

        () => {}
      );
    } catch (error) {
      runningRef.current =
        false;

      setMessage(
        error.message ||
          "Unable to start camera."
      );
    }
  }

  async function findStudent(
    qrToken
  ) {
    try {
      const token =
        await getToken();

      const response = await fetch(
        "/api/admin/student-by-qr",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${token}`,
          },

          body: JSON.stringify({
            qrToken,
          }),
        }
      );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Student not found."
        );
      }

      setStudent(
        result.student
      );

      setLastResult(null);

      setPaidToday(false);

      setPaidAmount(
        String(
          result.student
            .totalPayable ?? ""
        )
      );
    } catch (error) {
      setMessage(
        error.message
      );
    }
  }

  async function markAttendance() {
    if (!student) return;

    setBusy(true);
    setMessage("");

    try {
      const token =
        await getToken();

      const parsedPaid =
        paidToday
          ? Number(paidAmount)
          : 0;

      const response = await fetch(
        "/api/attendance/mark",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${token}`,
          },

          body: JSON.stringify({
            studentId:
              student.id,

            paidAmount:
              Number.isFinite(
                parsedPaid
              ) &&
              parsedPaid > 0
                ? parsedPaid
                : 0,
          }),
        }
      );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Attendance failed."
        );
      }

      const newAttendance = {
        id: `new-${Date.now()}`,

        status: "Present",

        markedAt:
          result.markedAt,

        dailyFee:
          result.dailyFee,

        paidAmount:
          result.paidAmount,

        dueAfter:
          result.dueAfter,

        paymentStatus:
          result.paymentStatus,
      };

      setStudent(
        (current) => ({
          ...current,

          dueBalance:
            result.dueAfter,

          recentAttendance: [
            newAttendance,
            ...(
              current.recentAttendance ||
              []
            ),
          ].slice(0, 10),
        })
      );

      setLastResult(result);

      setMessage(
        `Attendance marked successfully at ${new Date(
          result.markedAt
        ).toLocaleString(
          "en-LK"
        )}.`
      );
    } catch (error) {
      setMessage(
        error.message
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <NavBar admin />

      <main className="container">
        <div className="title-row">
          <div>
            <h1>QR Scanner</h1>

            <p className="muted">
              Scan the student's QR
              code, verify the
              details, then mark
              attendance manually.
            </p>
          </div>
        </div>

        <div className="card scanner">
          <div id="qr-reader" />

          <button
            type="button"
            className="btn btn-primary"
            style={{
              width: "100%",
              marginTop: 14,
            }}
            onClick={
              startScanner
            }
          >
            Start Camera Scanner
          </button>
        </div>

        {message && (
          <div
            className={
              message.includes(
                "successfully"
              )
                ? "success"
                : "error"
            }
            style={{
              marginTop: 18,
            }}
          >
            {message}
          </div>
        )}

        {student && (
          <section
            className="card"
            style={{
              marginTop: 18,
            }}
          >
            <div className="profile-row">
              {student.photoData ? (
                <img
                  src={
                    student.photoData
                  }
                  alt=""
                  className="avatar"
                />
              ) : (
                <div
                  className="avatar"
                  style={{
                    display:
                      "grid",
                    placeItems:
                      "center",
                    background:
                      "#edf1f7",
                    fontSize: 26,
                  }}
                >
                  👤
                </div>
              )}

              <div>
                <h2>
                  {
                    student.fullName
                  }
                </h2>

                <div className="muted">
                  {student.email}
                </div>

                <div>
                  {
                    student.studentCode
                  }
                </div>
              </div>
            </div>

            <hr />

            <div className="grid grid-2">
              <p>
                <b>Email:</b>
                <br />
                {student.email}
              </p>

              <p>
                <b>
                  Student Phone:
                </b>
                <br />
                {student.phone}
              </p>

              <p>
                <b>
                  Class / Grade:
                </b>
                <br />
                {
                  student.className
                }
              </p>

              <p>
                <b>Address:</b>
                <br />
                {
                  student.address
                }
              </p>
            </div>

            <hr />

            <h3>Fee & Payment</h3>

            <div className="due-box">
              <div className="due-row">
                <span>
                  Past Due Amount
                </span>

                <span>
                  {formatMoney(
                    student.dueBalance
                  )}
                </span>
              </div>

              <div className="due-row">
                <span>
                  Today's Fee
                </span>

                <span>
                  {formatMoney(
                    student.dailyFee
                  )}
                </span>
              </div>

              <div className="due-row total">
                <span>
                  Total Payable
                </span>

                <span className="due-amount">
                  {formatMoney(
                    student.dueBalance +
                      student.dailyFee
                  )}
                </span>
              </div>
            </div>

            <label
              style={{
                marginTop: 14,
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                fontWeight: 700,
              }}
            >
              <input
                type="checkbox"
                style={{
                  width: "auto",
                }}
                checked={paidToday}
                onChange={(event) => {
                  const checked =
                    event.target
                      .checked;

                  setPaidToday(
                    checked
                  );

                  if (
                    checked &&
                    !paidAmount
                  ) {
                    setPaidAmount(
                      String(
                        student.dueBalance +
                          student.dailyFee
                      )
                    );
                  }
                }}
              />
              Paid Today
            </label>

            {paidToday && (
              <label
                style={{
                  marginTop: 10,
                }}
              >
                Amount Paid Today
                (Rs.)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={
                    paidAmount
                  }
                  onChange={(event) =>
                    setPaidAmount(
                      event.target
                        .value
                    )
                  }
                  placeholder="0"
                />
              </label>
            )}

            <p
              className="muted"
              style={{
                marginTop: 4,
              }}
            >
              {paidToday
                ? "Payment first covers today's fee, then any past due balance. Anything left unpaid carries forward as the new due balance."
                : "If the student didn't pay today, leave this unchecked. The full amount above will carry forward as their due balance."}
            </p>

            <button
              type="button"
              className="btn btn-success"
              style={{
                width: "100%",
                marginTop: 10,
              }}
              onClick={
                markAttendance
              }
              disabled={busy}
            >
              {busy
                ? "Saving..."
                : "Mark Attendance & Save Payment"}
            </button>

            <p
              className="muted"
              style={{
                marginTop: 10,
              }}
            >
              Another attendance
              cannot be marked until
              2 minutes have passed
              from the previous
              attendance.
            </p>

            {lastResult && (
              <div
                className={
                  lastResult.paymentStatus ===
                  "PAID"
                    ? "success"
                    : "error"
                }
                style={{
                  marginTop: 12,
                }}
              >
                Payment status:{" "}
                <b>
                  {lastResult.paymentStatus?.replaceAll(
                    "_",
                    " "
                  )}
                </b>
                {" · "}
                Paid{" "}
                {formatMoney(
                  lastResult.paidAmount
                )}
                {" · "}
                Due after:{" "}
                {formatMoney(
                  lastResult.dueAfter
                )}
              </div>
            )}

            <hr />

            <h3>
              Recent Attendance
            </h3>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>
                      Date & Time
                    </th>

                    <th>Status</th>

                    <th>Paid</th>

                    <th>
                      Due After
                    </th>

                    <th>
                      Payment
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {(
                    student.recentAttendance ||
                    []
                  ).map(
                    (record) => (
                      <tr
                        key={
                          record.id
                        }
                      >
                        <td>
                          {record.markedAt
                            ? new Date(
                                record.markedAt
                              ).toLocaleString(
                                "en-LK"
                              )
                            : "-"}
                        </td>

                        <td>
                          <span className="badge badge-active">
                            {
                              record.status
                            }
                          </span>
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

                        <td>
                          {record.paymentStatus ? (
                            <span
                              className={`badge ${
                                record.paymentStatus ===
                                "PAID"
                                  ? "badge-active"
                                  : record.paymentStatus ===
                                    "PARTIALLY_PAID"
                                  ? "badge-pending"
                                  : "badge-danger"
                              }`}
                            >
                              {record.paymentStatus.replaceAll(
                                "_",
                                " "
                              )}
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>
                      </tr>
                    )
                  )}

                  {!student
                    .recentAttendance
                    ?.length && (
                    <tr>
                      <td colSpan="5">
                        No attendance
                        records yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </>
  );
}

export default function Page() {
  return (
    <AuthGate role="admin">
      {() => <ScannerPage />}
    </AuthGate>
  );
}
