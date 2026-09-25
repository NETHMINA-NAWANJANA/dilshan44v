"use client";

import { useEffect, useMemo, useState } from "react";
import AuthGate from "@/components/AuthGate";
import NavBar from "@/components/NavBar";
import { auth } from "@/lib/firebase";

function localToday() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function displayDate(value) {
  return value ? String(value).replaceAll("-", "/") : "—";
}

function AdminPaperClasses() {
  const [selected, setSelected] = useState("");
  const [content, setContent] = useState([]);
  const [requests, setRequests] = useState([]);
  const [acceptedStudents, setAcceptedStudents] = useState([]);

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [view, setView] = useState("dashboard");

  const [showPaperModal, setShowPaperModal] = useState(false);

  const [paperForm, setPaperForm] = useState({
    contentId: "",
    paperDate: "",
    title: "",
    url: "",
    videoUrl: "",
    description: "",
    order: "0",
  });

  // =====================================================
  // API
  // =====================================================

  async function api(path, opts = {}) {
    const user = auth.currentUser;

    if (!user) {
      throw new Error("Please login again.");
    }

    const token = await user.getIdToken();

    const response = await fetch(path, {
      cache: "no-store",
      ...opts,

      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(opts.headers || {}),
      },
    });

    const text = await response.text();

    let data;

    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      throw new Error(
        `Server returned an invalid response (${response.status}).`
      );
    }

    if (!response.ok) {
      throw new Error(data.error || "Request failed.");
    }

    return data;
  }

  // =====================================================
  // LOAD PAPERS
  // =====================================================

  async function loadContent(classId) {
    const data = await api(
      `/api/admin/paper-classes/content/list?paperClassId=${encodeURIComponent(
        classId
      )}`
    );

    setContent(data.content || []);
  }

  // =====================================================
  // LOAD STUDENTS
  // =====================================================

  async function loadRequests() {
    const data = await api(
      "/api/admin/paper-classes/requests"
    );

    setRequests(data.requests || []);

    setAcceptedStudents(
      data.acceptedStudents || []
    );
  }

  // =====================================================
  // START PAGE
  // =====================================================

  async function boot() {
    try {
      setError("");

      let data = await api(
        "/api/admin/paper-classes"
      );

      let classes = data.classes || [];

      // Create default class if no class exists
      if (!classes.length) {
        await api(
          "/api/admin/paper-classes",
          {
            method: "POST",

            body: JSON.stringify({
              name: "Grade 11 Maths Paper Class",
              description:
                "Maths papers and discussion videos",
            }),
          }
        );

        data = await api(
          "/api/admin/paper-classes"
        );

        classes = data.classes || [];
      }

      const active =
        classes.find((x) => x.active) ||
        classes[0];

      if (active) {
        setSelected(active.id);

        await loadContent(active.id);
      }

      await loadRequests();
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => {
    boot();
  }, []);

  // =====================================================
  // SORT PAPERS
  // NEWEST FIRST
  // =====================================================

  const papers = useMemo(() => {
    return content
      .filter((x) => x.type === "paper")

      .sort(
        (a, b) =>
          String(
            b.paperDate || ""
          ).localeCompare(
            String(a.paperDate || "")
          ) ||
          Number(b.order || 0) -
            Number(a.order || 0)
      );
  }, [content]);

  // =====================================================
  // FIND VIDEO FOR PAPER
  // =====================================================

  function videoFor(paper) {
    return content.find(
      (x) =>
        x.type === "video" &&
        x.groupId &&
        x.groupId === paper.groupId
    );
  }

  // =====================================================
  // ADD PAPER
  // DATE AUTOMATIC
  // =====================================================

  function openNewPaper() {
    setPaperForm({
      contentId: "",

      // AUTO DATE
      paperDate: localToday(),

      title: "",
      url: "",
      videoUrl: "",
      description: "",
      order: "0",
    });

    setShowPaperModal(true);
  }

  // =====================================================
  // EDIT PAPER
  // =====================================================

  function openEditPaper(paper) {
    const video = videoFor(paper);

    setPaperForm({
      contentId: paper.id,

      paperDate:
        paper.paperDate || localToday(),

      title: paper.title || "",

      url: paper.url || "",

      videoUrl: video?.url || "",

      description:
        paper.description || "",

      order: String(
        paper.order || 0
      ),
    });

    setShowPaperModal(true);
  }

  // =====================================================
  // SAVE PAPER
  // =====================================================

  async function savePaper(e) {
    e.preventDefault();

    if (!selected) return;

    try {
      setBusy(true);
      setError("");

      await api(
        "/api/admin/paper-classes/content",
        {
          method: paperForm.contentId
            ? "PATCH"
            : "POST",

          body: JSON.stringify({
            paperClassId: selected,

            type: "paper",

            ...paperForm,

            // automatic date
            paperDate:
              paperForm.paperDate ||
              localToday(),
          }),
        }
      );

      setShowPaperModal(false);

      await loadContent(selected);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  // =====================================================
  // DELETE PAPER + VIDEO
  // =====================================================

  async function deletePaper(paper) {
    const ok = window.confirm(
      `Delete "${
        paper.title || "this paper"
      }" and its video?`
    );

    if (!ok) return;

    try {
      setBusy(true);
      setError("");

      await api(
        "/api/admin/paper-classes/content/delete",
        {
          method: "POST",

          body: JSON.stringify({
            paperClassId: selected,
            contentId: paper.id,
          }),
        }
      );

      await loadContent(selected);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  // =====================================================
  // ACCEPT / REJECT STUDENT
  // =====================================================

  async function requestAction(
    id,
    action
  ) {
    try {
      setBusy(true);
      setError("");

      await api(
        "/api/admin/paper-classes/requests",
        {
          method: "POST",

          body: JSON.stringify({
            requestId: id,
            action,
          }),
        }
      );

      await loadRequests();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  // =====================================================
  // REMOVE STUDENT
  // =====================================================

  async function removeStudent(id) {
    const ok = window.confirm(
      "Remove this student from the Paper Class?"
    );

    if (!ok) return;

    try {
      setBusy(true);
      setError("");

      await api(
        "/api/admin/paper-classes/requests",
        {
          method: "DELETE",

          body: JSON.stringify({
            requestId: id,
          }),
        }
      );

      await loadRequests();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  // =====================================================
  // STUDENT TABLE
  // =====================================================

  const studentTable = (
    rows,
    pending = false
  ) => (
    <div
      className="card table-wrap"
      style={{
        marginTop: 18,
        overflowX: "auto",
      }}
    >
      <table
        style={{
          width: "100%",
          minWidth: 900,
        }}
      >
        <thead>
          <tr>
            <th>Student</th>
            <th>Email</th>
            <th>Phone</th>
            <th>ID</th>
            <th>Class / Grade</th>
            <th>Address</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((s) => (
            <tr key={s.id}>
              <td>
                <strong>
                  {s.fullName ||
                    s.studentName ||
                    "Student"}
                </strong>
              </td>

              <td>
                {s.email || "—"}
              </td>

              <td>
                {s.phone || "—"}
              </td>

              <td>
                {s.studentCode || "—"}
              </td>

              <td>
                {s.className ||
                  s.grade ||
                  "Grade 11"}
              </td>

              <td>
                {s.address || "—"}
              </td>

              <td>
                <span
                  className={`badge ${
                    pending
                      ? "badge-pending"
                      : "badge-success"
                  }`}
                >
                  {pending
                    ? "Waiting"
                    : "Accepted"}
                </span>
              </td>

              <td>
                {pending ? (
                  <div className="actions">
                    <button
                      className="btn btn-small btn-success"
                      disabled={busy}
                      onClick={() =>
                        requestAction(
                          s.id,
                          "accepted"
                        )
                      }
                    >
                      Accept
                    </button>

                    <button
                      className="btn btn-small btn-danger"
                      disabled={busy}
                      onClick={() =>
                        requestAction(
                          s.id,
                          "rejected"
                        )
                      }
                    >
                      Reject
                    </button>
                  </div>
                ) : (
                  <button
                    className="btn btn-small btn-danger"
                    disabled={busy}
                    onClick={() =>
                      removeStudent(s.id)
                    }
                  >
                    Remove
                  </button>
                )}
              </td>
            </tr>
          ))}

          {!rows.length && (
            <tr>
              <td colSpan="8">
                {pending
                  ? "No students are waiting for approval."
                  : "No students have joined this class yet."}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  // =====================================================
  // UI
  // =====================================================

  return (
    <>
      <NavBar admin />

      <main className="container">
        {/* HEADER */}

        <div
          className="title-row"
          style={{
            marginBottom: 24,
          }}
        >
          <div>
            <h1
              style={{
                marginBottom: 6,
              }}
            >
              📚 Maths Paper Classes
            </h1>

            <p
              className="muted"
              style={{ margin: 0 }}
            >
              Create classes, add
              papers/videos and approve
              student access.
            </p>
          </div>

          {view !== "dashboard" && (
            <button
              className="btn btn-light"
              onClick={() =>
                setView("dashboard")
              }
            >
              ← Paper Dashboard
            </button>
          )}
        </div>

        {/* ERROR */}

        {error && (
          <div
            className="error"
            style={{
              marginBottom: 18,
            }}
          >
            {error}
          </div>
        )}

        {/* =================================================
            MAIN DASHBOARD
        ================================================= */}

        {view === "dashboard" && (
          <>
            {/* ADD PAPER */}

            <div
              style={{
                display: "flex",
                justifyContent:
                  "flex-end",
                marginBottom: 18,
              }}
            >
              <button
                className="btn btn-primary"
                onClick={openNewPaper}
                disabled={!selected}
              >
                ＋ Add Paper
              </button>
            </div>

            {/* PAPERS */}

            <div
              style={{
                display: "grid",
                gap: 14,
              }}
            >
              {papers.map((paper) => {
                const video =
                  videoFor(paper);

                return (
                  <div
                    key={paper.id}
                    className="card"
                    style={{
                      padding:
                        "20px 22px",
                    }}
                  >
                    <div
                      style={{
                        display: "grid",

                        gridTemplateColumns:
                          "minmax(160px,1fr) auto auto auto auto",

                        gap: 12,

                        alignItems:
                          "center",
                      }}
                    >
                      {/* DATE + TITLE */}

                      <div>
                        <div
                          style={{
                            fontSize: 18,
                            fontWeight: 800,
                          }}
                        >
                          {displayDate(
                            paper.paperDate
                          )}
                        </div>

                        {paper.title && (
                          <div
                            className="small-text muted"
                            style={{
                              marginTop: 4,
                            }}
                          >
                            {paper.title}
                          </div>
                        )}
                      </div>

                      {/* PAPER */}

                      <a
                        className="btn btn-light"
                        href={paper.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        📄 Paper
                      </a>

                      {/* VIDEO */}

                      {video?.url ? (
                        <a
                          className="btn btn-primary"
                          href={video.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          ▶ Watch
                        </a>
                      ) : (
                        <button
                          className="btn btn-light"
                          onClick={() =>
                            openEditPaper(
                              paper
                            )
                          }
                        >
                          ⏳ Video Pending
                        </button>
                      )}

                      {/* EDIT */}

                      <button
                        className="btn btn-light"
                        onClick={() =>
                          openEditPaper(
                            paper
                          )
                        }
                      >
                        ✏️ Edit
                      </button>

                      {/* DELETE */}

                      <button
                        className="btn btn-danger"
                        disabled={busy}
                        onClick={() =>
                          deletePaper(paper)
                        }
                      >
                        🗑 Delete
                      </button>
                    </div>
                  </div>
                );
              })}

              {!papers.length && (
                <div className="card">
                  <div className="empty-state">
                    No papers yet. Use ＋
                    Add Paper.
                  </div>
                </div>
              )}
            </div>

            {/* =================================================
                STUDENT CARDS
            ================================================= */}

            <div
              className="grid grid-2"
              style={{
                marginTop: 28,
              }}
            >
              {/* JOINED STUDENTS */}

              <button
                className="card"
                onClick={() =>
                  setView("students")
                }
                style={{
                  textAlign: "left",
                  padding: 28,
                  cursor: "pointer",
                  font: "inherit",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div
                      className="muted"
                      style={{
                        fontWeight: 700,
                      }}
                    >
                      Students
                    </div>

                    <div
                      style={{
                        fontSize: 36,
                        fontWeight: 800,
                        marginTop: 6,
                      }}
                    >
                      {
                        acceptedStudents.length
                      }
                    </div>

                    <div className="small-text muted">
                      View joined student
                      details
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: 28,
                    }}
                  >
                    →
                  </span>
                </div>
              </button>

              {/* WAITING STUDENTS */}

              <button
                className="card"
                onClick={() =>
                  setView("requests")
                }
                style={{
                  textAlign: "left",
                  padding: 28,
                  cursor: "pointer",
                  font: "inherit",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div
                      className="muted"
                      style={{
                        fontWeight: 700,
                      }}
                    >
                      Reading Student
                    </div>

                    <div
                      style={{
                        fontSize: 36,
                        fontWeight: 800,
                        marginTop: 6,
                      }}
                    >
                      {requests.length}
                    </div>

                    <div className="small-text muted">
                      Students waiting for
                      approval
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: 28,
                    }}
                  >
                    →
                  </span>
                </div>
              </button>
            </div>
          </>
        )}

        {/* =================================================
            JOINED STUDENTS FULL VIEW
        ================================================= */}

        {view === "students" && (
          <section>
            <div className="title-row">
              <div>
                <h2
                  style={{ margin: 0 }}
                >
                  Students
                </h2>

                <p className="muted">
                  Students who have access
                  to this Maths Paper Class.
                </p>
              </div>

              <span className="badge">
                {acceptedStudents.length}{" "}
                Students
              </span>
            </div>

            {studentTable(
              acceptedStudents,
              false
            )}
          </section>
        )}

        {/* =================================================
            WAITING STUDENTS FULL VIEW
        ================================================= */}

        {view === "requests" && (
          <section>
            <div className="title-row">
              <div>
                <h2
                  style={{ margin: 0 }}
                >
                  Reading Student
                </h2>

                <p className="muted">
                  Review students waiting
                  to join this Maths Paper
                  Class.
                </p>
              </div>

              <span className="badge badge-pending">
                {requests.length} Waiting
              </span>
            </div>

            {studentTable(
              requests,
              true
            )}
          </section>
        )}
      </main>

      {/* =================================================
          ADD / EDIT PAPER MODAL
      ================================================= */}

      {showPaperModal && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) =>
            e.target ===
              e.currentTarget &&
            setShowPaperModal(false)
          }
        >
          <div className="modal card">
            <div className="title-row">
              <div>
                <h2
                  style={{ margin: 0 }}
                >
                  {paperForm.contentId
                    ? "Edit Paper"
                    : "＋ Add Paper"}
                </h2>

                <p
                  className="muted small-text"
                  style={{
                    marginBottom: 0,
                  }}
                >
                  {paperForm.contentId
                    ? `Paper date: ${displayDate(
                        paperForm.paperDate
                      )}`
                    : `Date will be added automatically: ${displayDate(
                        localToday()
                      )}`}
                </p>
              </div>

              <button
                className="btn btn-light"
                onClick={() =>
                  setShowPaperModal(
                    false
                  )
                }
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={savePaper}
              className="grid"
            >
              <label>
                Paper Name

                <input
                  value={
                    paperForm.title
                  }
                  onChange={(e) =>
                    setPaperForm({
                      ...paperForm,
                      title:
                        e.target.value,
                    })
                  }
                  placeholder="Maths Paper"
                  required
                />
              </label>

              <label>
                Paper / Drive Link

                <input
                  value={paperForm.url}
                  onChange={(e) =>
                    setPaperForm({
                      ...paperForm,
                      url: e.target.value,
                    })
                  }
                  placeholder="https://drive.google.com/..."
                  required
                />
              </label>

              <label>
                YouTube Video Link{" "}
                <span className="muted small-text">
                  (optional)
                </span>

                <input
                  value={
                    paperForm.videoUrl
                  }
                  onChange={(e) =>
                    setPaperForm({
                      ...paperForm,
                      videoUrl:
                        e.target.value,
                    })
                  }
                  placeholder="https://youtube.com/watch?v=..."
                />
              </label>

              <label>
                Description

                <input
                  value={
                    paperForm.description
                  }
                  onChange={(e) =>
                    setPaperForm({
                      ...paperForm,
                      description:
                        e.target.value,
                    })
                  }
                  placeholder="Optional"
                />
              </label>

              <div className="actions">
                <button
                  className="btn btn-primary"
                  disabled={busy}
                >
                  {busy
                    ? "Saving..."
                    : "Save Paper"}
                </button>

                <button
                  type="button"
                  className="btn btn-light"
                  onClick={() =>
                    setShowPaperModal(
                      false
                    )
                  }
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default function Page() {
  return (
    <AuthGate role="admin">
      {() => (
        <AdminPaperClasses />
      )}
    </AuthGate>
  );
}
