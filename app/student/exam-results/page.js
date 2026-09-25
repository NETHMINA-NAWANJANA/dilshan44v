"use client";

import { useEffect, useState } from "react";

import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";

import AuthGate from "@/components/AuthGate";
import NavBar from "@/components/NavBar";

import { db } from "@/lib/firebase";
import { formatDateTime } from "@/lib/helpers";

function resultBadgeClass(marks) {
  const value = Number(marks);
  if (!Number.isFinite(value)) return "";
  if (value >= 65) return "badge-active"; // A, B
  if (value >= 35) return "badge-pending"; // S, C
  return "badge-danger"; // W
}

function resultLabel(marks) {
  const value = Number(marks);
  if (!Number.isFinite(value)) return "-";
  if (value >= 75) return "A";
  if (value >= 65) return "B";
  if (value >= 55) return "C";
  if (value >= 35) return "S";
  return "W";
}

function StudentExamResults({ profile }) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const resultsQuery = query(
      collection(db, "examResults"),
      where("studentId", "==", profile.id),
      orderBy("examDate", "desc")
    );

    const unsubscribe = onSnapshot(
      resultsQuery,
      (snapshot) => {
        setResults(
          snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
        );
        setError("");
        setLoading(false);
      },
      (err) => {
        // Most common cause: the Firestore composite index for
        // (studentId ASC, examDate DESC) on examResults hasn't been
        // created yet. Firebase's error message includes a direct
        // link to create it.
        setError(
          err.message ||
            "Unable to load exam results. The database index may still be building."
        );
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [profile.id]);

  return (
    <>
      <NavBar student />

      <main className="container">
        <div className="title-row">
          <div>
            <h1>Exam Results</h1>

            <p className="muted">
              Your exam marks, most recent first.
            </p>
          </div>

          <span className="badge">{results.length} Results</span>
        </div>

        {loading && (
          <section className="card" style={{ marginTop: 18 }}>
            <p className="muted">Loading your results...</p>
          </section>
        )}

        {!loading && error && (
          <section className="card" style={{ marginTop: 18 }}>
            <div className="error">{error}</div>
          </section>
        )}

        {!loading && !error && !results.length && (
          <section className="card" style={{ marginTop: 18 }}>
            <p className="muted">
              No exam results have been added for you yet.
            </p>
          </section>
        )}

        {!loading && !error && !!results.length && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
              gap: 18,
              marginTop: 18,
            }}
          >
            {results.map((result) => (
              <div className="card" key={result.id}>
                <div className="muted">
                  {formatDateTime(result.examDate)}
                </div>

                <div className="stat">{result.marks}</div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: 6,
                  }}
                >
                  <span className="muted small-text">
                    {result.className || ""}
                  </span>

                  <span
                    className={`badge ${resultBadgeClass(result.marks)}`}
                  >
                    {resultLabel(result.marks)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}

export default function Page() {
  return (
    <AuthGate role="student">
      {(profile) => <StudentExamResults profile={profile} />}
    </AuthGate>
  );
}
