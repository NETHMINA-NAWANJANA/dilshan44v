"use client";

import { useEffect, useMemo, useState } from "react";
import AuthGate from "@/components/AuthGate";
import NavBar from "@/components/NavBar";
import { auth } from "@/lib/firebase";

function today() {
  return new Date().toISOString().slice(0, 10);
}

function displayDate(value) {
  if (!value) return "No date";
  return String(value).replaceAll("-", "/");
}

function AdminPaperClasses() {
  const [selected, setSelected] = useState("");
  const [content, setContent] = useState([]);
  const [requests, setRequests] = useState([]);
  const [acceptedCount, setAcceptedCount] = useState(0);
  const [acceptedStudents, setAcceptedStudents] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPaperModal, setShowPaperModal] = useState(false);
  const [showRequests, setShowRequests] = useState(false);
  const [showStudents, setShowStudents] = useState(false);
  const [paperForm, setPaperForm] = useState({
    contentId: "", paperDate: today(), title: "", url: "", videoUrl: "", description: "", order: "0",
  });

  async function api(path, opts = {}) {
    const user = auth.currentUser;
    if (!user) throw new Error("Please login again.");
    const token = await user.getIdToken();
    const response = await fetch(path, {
      cache: "no-store",
      ...opts,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(opts.headers || {}) },
    });
    const text = await response.text();
    let data;
    try { data = text ? JSON.parse(text) : {}; }
    catch { throw new Error(`Server returned an invalid response (${response.status}).`); }
    if (!response.ok) throw new Error(data.error || "Request failed.");
    return data;
  }

  async function loadContent(classId) {
    const data = await api(`/api/admin/paper-classes/content/list?paperClassId=${encodeURIComponent(classId)}`);
    setContent(data.content || []);
  }

  async function loadRequests() {
    const data = await api("/api/admin/paper-classes/requests");
    setRequests(data.requests || []);
    setAcceptedCount(Number(data.acceptedCount || 0));
    setAcceptedStudents(data.acceptedStudents || []);
    setPendingCount(Number(data.pendingCount ?? (data.requests || []).length));
  }

  async function boot() {
    try {
      setError("");
      let data = await api("/api/admin/paper-classes");
      let classes = data.classes || [];

      // This screen is one Maths Paper Class dashboard. If the database is empty,
      // create the default active class automatically so students can request access
      // even before the first paper is uploaded.
      if (!classes.length) {
        await api("/api/admin/paper-classes", {
          method: "POST",
          body: JSON.stringify({ name: "Grade 11 Maths Paper Class", description: "Maths papers and discussion videos" }),
        });
        data = await api("/api/admin/paper-classes");
        classes = data.classes || [];
      }

      const active = classes.find((x) => x.active) || classes[0];
      if (active) {
        setSelected(active.id);
        await loadContent(active.id);
      }
      await loadRequests();
    } catch (e) { setError(e.message); }
  }

  useEffect(() => { boot(); }, []);

  const papers = useMemo(() => {
    return content
      .filter((x) => x.type === "paper")
      .sort((a, b) => String(b.paperDate || "").localeCompare(String(a.paperDate || "")) || Number(b.order || 0) - Number(a.order || 0));
  }, [content]);

  function videoFor(paper) {
    return content.find((x) => x.type === "video" && x.groupId && x.groupId === paper.groupId);
  }

  function openNewPaper() {
    setPaperForm({ contentId: "", paperDate: today(), title: "", url: "", videoUrl: "", description: "", order: "0" });
    setShowPaperModal(true);
  }

  function openEditPaper(paper) {
    const video = videoFor(paper);
    setPaperForm({
      contentId: paper.id,
      paperDate: paper.paperDate || today(),
      title: paper.title || "",
      url: paper.url || "",
      videoUrl: video?.url || "",
      description: paper.description || "",
      order: String(paper.order || 0),
    });
    setShowPaperModal(true);
  }

  async function savePaper(e) {
    e.preventDefault();
    if (!selected) return;
    try {
      setBusy(true); setError("");
      await api("/api/admin/paper-classes/content", {
        method: paperForm.contentId ? "PATCH" : "POST",
        body: JSON.stringify({ paperClassId: selected, type: "paper", ...paperForm }),
      });
      setShowPaperModal(false);
      await loadContent(selected);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  async function requestAction(id, action) {
    try {
      setBusy(true); setError("");
      await api("/api/admin/paper-classes/requests", { method: "POST", body: JSON.stringify({ requestId: id, action }) });
      await loadRequests();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  async function removeStudent(id) {
    if (!window.confirm("Remove this student from the Paper Class?")) return;
    try {
      setBusy(true); setError("");
      await api("/api/admin/paper-classes/requests", { method: "DELETE", body: JSON.stringify({ requestId: id }) });
      await loadRequests();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  return (
    <>
      <NavBar admin />
      <main className="container">
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ marginBottom: 6 }}>📚 Maths Paper Classes</h1>
          <p className="muted" style={{ margin: 0 }}>Create classes, add papers/videos and approve student access.</p>
        </div>

        {error && <div className="error" style={{ marginBottom: 18 }}>{error}</div>}

        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 18 }}>
          <button className="btn btn-primary" onClick={openNewPaper} disabled={!selected}>＋ Add Paper</button>
        </div>

        <div style={{ display: "grid", gap: 14 }}>
          {papers.map((paper) => {
            const video = videoFor(paper);
            return (
              <div key={paper.id} className="card" style={{ padding: "18px 20px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "minmax(110px,1fr) auto auto auto", gap: 18, alignItems: "center" }}>
                  <button onClick={() => openEditPaper(paper)} title="Edit paper" style={{ border: 0, background: "transparent", padding: 0, textAlign: "left", cursor: "pointer", font: "inherit", fontWeight: 700 }}>
                    {displayDate(paper.paperDate)}
                  </button>
                  <button className="btn btn-light" onClick={() => openEditPaper(paper)}>Edit</button>
                  <a className="btn btn-light" href={paper.url} target="_blank" rel="noreferrer">Paper</a>
                  {video?.url ? (
                    <a className="btn btn-primary" href={video.url} target="_blank" rel="noreferrer">Watch</a>
                  ) : (
                    <button className="btn btn-light" onClick={() => openEditPaper(paper)}>Video Pending</button>
                  )}
                </div>
              </div>
            );
          })}
          {!papers.length && <div className="card"><div className="empty-state">No papers yet. Use ＋ Add Paper.</div></div>}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 18, marginTop: 28 }}>
          <button className="card" onClick={() => setShowStudents(true)} style={{ textAlign: "center", padding: 26, cursor: "pointer", border: "1px solid var(--border, #e5e7eb)", font: "inherit" }}>
            <div className="muted" style={{ fontWeight: 700 }}>Students</div>
            <div style={{ fontSize: 34, fontWeight: 800, marginTop: 8 }}>{acceptedCount}</div>
          </button>
          <button className="card" onClick={() => setShowRequests(true)} style={{ textAlign: "center", padding: 26, cursor: "pointer", border: "1px solid var(--border, #e5e7eb)", font: "inherit" }}>
            <div className="muted" style={{ fontWeight: 700 }}>Reading Student</div>
            <div style={{ fontSize: 34, fontWeight: 800, marginTop: 8 }}>{pendingCount}</div>
          </button>
        </div>
      </main>

      {showPaperModal && (
        <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setShowPaperModal(false)}>
          <div className="modal card">
            <div className="title-row">
              <h2 style={{ margin: 0 }}>{paperForm.contentId ? "Edit Paper" : "＋ Add Paper"}</h2>
              <button className="btn btn-light" onClick={() => setShowPaperModal(false)}>✕</button>
            </div>
            <form onSubmit={savePaper} className="grid">
              <label>Date<input type="date" value={paperForm.paperDate} onChange={(e) => setPaperForm({ ...paperForm, paperDate: e.target.value })} required /></label>
              <label>Paper Name<input value={paperForm.title} onChange={(e) => setPaperForm({ ...paperForm, title: e.target.value })} placeholder="Maths Paper" required /></label>
              <label>Paper / Drive Link<input value={paperForm.url} onChange={(e) => setPaperForm({ ...paperForm, url: e.target.value })} placeholder="https://drive.google.com/..." required /></label>
              <label>YouTube Video Link <span className="muted small-text">(optional)</span><input value={paperForm.videoUrl} onChange={(e) => setPaperForm({ ...paperForm, videoUrl: e.target.value })} placeholder="https://youtube.com/watch?v=..." /></label>
              <label>Description<input value={paperForm.description} onChange={(e) => setPaperForm({ ...paperForm, description: e.target.value })} placeholder="Optional" /></label>
              <div className="actions"><button className="btn btn-primary" disabled={busy}>{busy ? "Saving..." : "Save"}</button><button type="button" className="btn btn-light" onClick={() => setShowPaperModal(false)}>Cancel</button></div>
            </form>
          </div>
        </div>
      )}

      {showStudents && (
        <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setShowStudents(false)}>
          <div className="modal card">
            <div className="title-row"><h2 style={{ margin: 0 }}>Students</h2><button className="btn btn-light" onClick={() => setShowStudents(false)}>✕</button></div>
            {acceptedStudents.length ? acceptedStudents.map((student) => (
              <div className="info-item" key={student.id} style={{ marginTop: 12 }}>
                <strong>{student.fullName || student.studentName || "Student"}</strong>
                <div className="small-text muted" style={{ marginTop: 6 }}>Student ID: {student.studentCode || "-"}</div>
                <div className="small-text muted">Class: {student.className || student.grade || "Grade 11"}</div>
                {student.email && <div className="small-text muted">Email: {student.email}</div>}
                {student.phone && <div className="small-text muted">Phone: {student.phone}</div>}
                {student.address && <div className="small-text muted">Address: {student.address}</div>}
                <div className="actions" style={{ marginTop: 12 }}>
                  <button className="btn btn-small btn-danger" disabled={busy} onClick={() => removeStudent(student.id)}>Remove from Class</button>
                </div>
              </div>
            )) : <div className="empty-state">No students have joined this class yet.</div>}
          </div>
        </div>
      )}

      {showRequests && (
        <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setShowRequests(false)}>
          <div className="modal card">
            <div className="title-row"><h2 style={{ margin: 0 }}>Reading Student</h2><button className="btn btn-light" onClick={() => setShowRequests(false)}>✕</button></div>
            {requests.length ? requests.map((r) => (
              <div className="info-item" key={r.id} style={{ marginTop: 12 }}>
                <strong>{r.studentName || "Student"}</strong>
                <div className="small-text muted">{r.studentCode || r.grade || "Grade 11"}</div>
                <div className="actions" style={{ marginTop: 10 }}>
                  <button className="btn btn-small btn-success" disabled={busy} onClick={() => requestAction(r.id, "accepted")}>Accept</button>
                  <button className="btn btn-small btn-danger" disabled={busy} onClick={() => requestAction(r.id, "rejected")}>Reject</button>
                </div>
              </div>
            )) : <div className="empty-state">No waiting students.</div>}
          </div>
        </div>
      )}
    </>
  );
}

export default function Page() {
  return <AuthGate role="admin">{() => <AdminPaperClasses />}</AuthGate>;
}
