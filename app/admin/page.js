"use client";

import {
  useEffect,
  useState,
} from "react";

import Link from "next/link";

import AuthGate from "@/components/AuthGate";
import NavBar from "@/components/NavBar";

import {
  auth,
} from "@/lib/firebase";

import {
  formatMoney,
} from "@/lib/helpers";


function AdminDashboard() {
  const [
    stats,
    setStats,
  ] = useState({
    students: 0,
    suspended: 0,
    pending: 0,
    todayStudents: 0,
    todayRecords: 0,
    paidToday: 0,
    partialToday: 0,
    unpaidToday: 0,
    revenueToday: 0,
    currentDailyFee: 0,
    todayList: [],
  });


  const [error, setError] =
    useState("");


  const [feeInput, setFeeInput] =
    useState("");


  const [savingFee, setSavingFee] =
    useState(false);


  const [feeMessage, setFeeMessage] =
    useState("");


  /*
   * =====================================
   * CLASS PROMOTION
   * =====================================
   */

  const [
    promotionText,
    setPromotionText,
  ] = useState("");


  const [
    promotionAction,
    setPromotionAction,
  ] = useState("");


  const [
    promoting,
    setPromoting,
  ] = useState(false);


  const [
    promotionMessage,
    setPromotionMessage,
  ] = useState("");


  async function loadStats() {
    try {
      const token =
        await auth.currentUser.getIdToken();


      const response =
        await fetch(
          "/api/admin/stats",
          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );


      const data =
        await response.json();


      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to load dashboard."
        );
      }


      setStats(data);


      setFeeInput(
        String(
          data.currentDailyFee ??
            ""
        )
      );


      return data;

    } catch (error) {

      setError(
        error.message
      );

      return null;
    }
  }


  useEffect(() => {

    loadStats();

  }, []);


  /*
   * =====================================
   * SAVE DAILY FEE
   * =====================================
   */

  async function saveDailyFee(
    event
  ) {

    event.preventDefault();


    setSavingFee(true);
    setFeeMessage("");


    try {

      const token =
        await auth.currentUser.getIdToken();


      const response =
        await fetch(
          "/api/admin/fee-settings",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${token}`,
            },

            body: JSON.stringify({
              dailyFee:
                Number(feeInput),
            }),
          }
        );


      const result =
        await response.json();


      if (!response.ok) {

        throw new Error(
          result.error ||
            "Unable to update fee."
        );
      }


      setFeeMessage(
        `Daily fee updated to ${formatMoney(
          result.dailyFee
        )}. This applies from today onward; past records stay unchanged.`
      );


      await loadStats();


    } catch (error) {

      setFeeMessage(
        error.message
      );

    } finally {

      setSavingFee(false);
    }
  }


  /*
   * =====================================
   * CLASS PROMOTION
   * =====================================
   *
   * UP:
   *
   * 6   -> 7
   * 7   -> 8
   * 8   -> 9
   * 9   -> 10
   * 10  -> 11
   * 11  -> 11-L
   * 6-N -> 6
   *
   *
   * DOWN:
   *
   * 11-L -> 11
   * 11   -> 10
   * 10   -> 9
   * 9    -> 8
   * 8    -> 7
   * 7    -> 6
   * 6    -> 6-N
   */

  function openPromotion(
    action
  ) {

    setPromotionAction(
      action
    );

    setPromotionText(
      ""
    );

    setPromotionMessage(
      ""
    );
  }


  async function submitPromotion(
    event
  ) {

    event.preventDefault();


    if (
      promotionText
        .trim()
        .toUpperCase() !==
      promotionAction
    ) {

      setPromotionMessage(
        `Please type ${promotionAction} and press Enter.`
      );

      return;
    }


    setPromoting(true);
    setPromotionMessage("");


    try {

      const token =
        await auth.currentUser.getIdToken();


      const response =
        await fetch(
          "/api/admin/class-promotion",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${token}`,
            },

            body: JSON.stringify({
              action:
                promotionAction,
            }),
          }
        );


      const text =
        await response.text();


      let result = {};


      try {
        result =
          JSON.parse(text);
      } catch {
        throw new Error(
          `Server returned ${response.status} instead of JSON.`
        );
      }


      if (!response.ok) {

        throw new Error(
          result.error ||
            "Unable to promote students."
        );
      }


      setPromotionMessage(
        result.message ||
          "Class promotion completed."
      );


      setPromotionText(
        ""
      );


      setPromotionAction(
        ""
      );


      /*
       * Dashboard student count/class
       * data refresh
       */
      await loadStats();


    } catch (error) {

      setPromotionMessage(
        error.message
      );

    } finally {

      setPromoting(false);
    }
  }


  return (
    <>
      <NavBar admin />


      <main className="container">

        <div className="title-row">

          <div>

            <h1>
              Admin Dashboard
            </h1>

            <p className="muted">
              Students and attendance
              at a glance.
            </p>

          </div>

        </div>


        {error && (
          <div className="error">
            {error}
          </div>
        )}


        {/* ================================= */}
        {/* 4 MAIN CARDS */}
        {/* ================================= */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 18,
            marginTop: 20,
          }}
        >

          <Link
            href="/admin/students"
            className="card stat-card-link"
          >

            <div className="muted">
              Active Students
            </div>

            <div className="stat">
              {stats.students}
            </div>

            <div className="muted small-text">
              View active students
            </div>

          </Link>


          <Link
            href="/admin/suspended"
            className="card stat-card-link"
          >

            <div className="muted">
              Suspended
            </div>

            <div className="stat">
              {stats.suspended}
            </div>

            <div className="muted small-text">
              Manage suspended students
            </div>

          </Link>


          <Link
            href="/admin/requests"
            className="card stat-card-link"
          >

            <div className="muted">
              Pending Requests
            </div>

            <div className="stat">
              {stats.pending}
            </div>

            <div className="muted small-text">
              Review registration requests
            </div>

          </Link>


          <Link
            href="/admin/attendance"
            className="card stat-card-link"
          >

            <div className="muted">
              Present Today
            </div>

            <div className="stat">
              {stats.todayStudents}
            </div>

            <div className="muted small-text">
              {stats.todayRecords} attendance records today
            </div>

          </Link>

        </div>


        {/* ================================= */}
        {/* EXAM RESULTS */}
        {/* ================================= */}

        <Link
          href="/admin/exam-results"
          className="card stat-card-link"
          style={{
            marginTop: 18,
            display: "block",
          }}
        >

          <div className="muted">
            Exam Results
          </div>

          <img
            src="/exam-icon.png"
            alt="Exam Results"
            style={{
              width: 40,
              height: 40,
              objectFit: "contain",
            }}
          />

          <div className="muted small-text">
            Add exam marks or view previous results
          </div>

        </Link>


        {/* ================================= */}
        {/* DAILY FEE */}
        {/* ================================= */}

        <section
          className="card"
          style={{
            marginTop: 18,
          }}
        >

          <h2>
            Daily Fee
          </h2>

          <p className="muted">
            The daily class fee charged
            per attendance. Changing it
            only affects attendance marked
            from today onward &mdash; past
            records keep the fee that
            applied on that day.
          </p>


          <form
            onSubmit={saveDailyFee}
            style={{
              display: "flex",
              gap: 12,
              alignItems: "flex-end",
              flexWrap: "wrap",
              marginTop: 10,
            }}
          >

            <label
              style={{
                minWidth: 200,
              }}
            >

              Daily Fee (Rs.)

              <input
                type="number"
                min="0"
                step="0.01"
                value={feeInput}
                onChange={(event) =>
                  setFeeInput(
                    event.target.value
                  )
                }
              />

            </label>


            <button
              type="submit"
              className="btn btn-primary"
              disabled={savingFee}
            >

              {savingFee
                ? "Saving..."
                : "Save Fee"}

            </button>

          </form>


          {feeMessage && (
            <div
              className={
                feeMessage
                  .toLowerCase()
                  .includes("updated")
                  ? "success"
                  : "error"
              }
              style={{
                marginTop: 12,
              }}
            >
              {feeMessage}
            </div>
          )}


          {/* ================================= */}
          {/* CLASS PROMOTION */}
          {/* ================================= */}

          <div
            style={{
              marginTop: 28,
              paddingTop: 22,
              borderTop:
                "1px solid var(--border, #ddd)",
            }}
          >

            <h3>
              Class Promotion
            </h3>


            <p className="muted">
              Promote all active students
              together according to their
              current class.
            </p>


            <div
              style={{
                display: "flex",
                gap: 12,
                flexWrap: "wrap",
                marginTop: 14,
              }}
            >

              <button
                type="button"
                className="btn btn-primary"
                onClick={() =>
                  openPromotion("UP")
                }
                disabled={promoting}
              >
                ↑ UP
              </button>


              <button
                type="button"
                className="btn"
                onClick={() =>
                  openPromotion("DOWN")
                }
                disabled={promoting}
              >
                ↓ DOWN
              </button>

            </div>


            {/* Confirmation box */}

            {promotionAction && (
              <form
                onSubmit={
                  submitPromotion
                }
                style={{
                  marginTop: 16,
                  maxWidth: 430,
                }}
              >

                <label>
                  Type{" "}
                  <strong>
                    {promotionAction}
                  </strong>{" "}
                  and press Enter to confirm.

                  <input
                    autoFocus
                    type="text"
                    value={
                      promotionText
                    }
                    onChange={(event) =>
                      setPromotionText(
                        event.target.value
                      )
                    }
                    placeholder={
                      promotionAction
                    }
                    disabled={promoting}
                  />
                </label>


                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={promoting}
                  style={{
                    marginTop: 10,
                  }}
                >

                  {promoting
                    ? "Updating students..."
                    : `Confirm ${promotionAction}`}

                </button>

              </form>
            )}


            {promotionMessage && (
              <div
                className={
                  promotionMessage
                    .toLowerCase()
                    .includes(
                      "success"
                    ) ||
                  promotionMessage
                    .toLowerCase()
                    .includes(
                      "completed"
                    )
                    ? "success"
                    : "error"
                }
                style={{
                  marginTop: 14,
                }}
              >
                {promotionMessage}
              </div>
            )}


            {/* Promotion map */}

            
          </div>

        </section>


        {/* ================================= */}
        {/* TODAY STATS */}
        {/* ================================= */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 18,
            marginTop: 18,
          }}
        >

          <div className="card">

            <div className="muted">
              Paid Today
            </div>

            <div className="stat">
              {stats.paidToday}
            </div>

            <div className="muted small-text">
              Students fully paid up today
            </div>

          </div>


          <div className="card">

            <div className="muted">
              Partially Paid Today
            </div>

            <div className="stat">
              {stats.partialToday}
            </div>

            <div className="muted small-text">
              Paid something, but still owe a balance
            </div>

          </div>


          <div className="card">

            <div className="muted">
              Unpaid Today
            </div>

            <div className="stat">
              {stats.unpaidToday}
            </div>

            <div className="muted small-text">
              Attended but paid nothing today
            </div>

          </div>


          <div className="card">

            <div className="muted">
              Revenue Today
            </div>

            <div className="stat">
              {formatMoney(
                stats.revenueToday
              )}
            </div>

            <div className="muted small-text">
              Total collected today
            </div>

          </div>

        </div>


        {/* ================================= */}
        {/* TODAY ATTENDANCE */}
        {/* ================================= */}

        <section
          className="card table-wrap"
          style={{
            marginTop: 18,
          }}
        >

          <h2>
            Today's Attendance & Payments
          </h2>


          <table>

            <thead>

              <tr>
                <th>Student ID</th>
                <th>Name</th>
                <th>Status</th>
                <th>Paid Amount</th>
                <th>Due Amount</th>
              </tr>

            </thead>


            <tbody>

              {stats.todayList?.map(
                (row) => (
                  <tr
                    key={
                      row.studentId
                    }
                  >

                    <td>
                      {
                        row.studentCode
                      }
                    </td>

                    <td>
                      {row.fullName}
                    </td>

                    <td>

                      <span
                        className={`badge ${
                          row.paymentStatus ===
                          "PAID"
                            ? "badge-active"
                            : row.paymentStatus ===
                              "PARTIALLY_PAID"
                            ? "badge-pending"
                            : "badge-danger"
                        }`}
                      >

                        {row.paymentStatus?.replaceAll(
                          "_",
                          " "
                        )}

                      </span>

                    </td>

                    <td>
                      {formatMoney(
                        row.paidAmount
                      )}
                    </td>

                    <td>
                      {formatMoney(
                        row.dueAfter
                      )}
                    </td>

                  </tr>
                )
              )}


              {!stats.todayList
                ?.length && (
                <tr>
                  <td colSpan="5">
                    No students scanned today yet.
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

      {() => (
        <AdminDashboard />
      )}

    </AuthGate>
  );
}
