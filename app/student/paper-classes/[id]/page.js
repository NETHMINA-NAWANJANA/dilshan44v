"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AuthGate from "@/components/AuthGate";
import NavBar from "@/components/NavBar";
import { auth } from "@/lib/firebase";

function PaperClassView({ id }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const user = auth.currentUser;
        if (!user) throw new Error("Please login again.");
        const token = await user.getIdToken();
        const response = await fetch(`/api/paper-classes/${id}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
        const text = await response.text();
        let result = {};
        try { result = text ? JSON.parse(text) : {}; } catch { throw new Error(`Server returned an invalid response (${response.status}).`); }
        if (!response.ok) throw new Error(result.error || "Unable to load paper class.");
        setData(result);
      } catch (e) { setError(e.message || "Unable to load paper class."); }
    }
    if (id) load();
  }, [id]);

  if (error) return <><NavBar student /><main className="container"><div className="card error">{error}</div><Link href="/student/paper-classes" className="btn btn-light">← Back to Paper Classes</Link></main></>;
  if (!data) return <><NavBar student /><main className="container"><div className="card">Loading Paper Class...</div></main></>;

  const content = Array.isArray(data.content) ? data.content : [];
  const papers = content.filter((x) => x.type === "paper").sort((a,b) => (Number(a.order||0)-Number(b.order||0)) || String(a.title||"").localeCompare(String(b.title||"")));
  const resources = content.filter((x) => x.type === "resource");

  return <>
    <NavBar student />
    <main className="container">
      <div className="title-row"><div><h1>📚 {data.paperClass.name}</h1><p className="muted">{data.paperClass.description}</p></div><Link href="/student/paper-classes" className="btn btn-light">← Paper Classes</Link></div>

      <section className="card" style={{ marginBottom: 18 }}>
        <h2 style={{ marginTop: 0 }}>📄 Papers</h2>
        {papers.length ? <div className="grid">{papers.map((paper) => {
          const video = content.find((x) => x.type === "video" && x.groupId && x.groupId === paper.groupId);
          return <div className="info-item" key={paper.id}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
              <div><strong>{paper.title}</strong>{paper.description && <div className="muted small-text" style={{ marginTop: 4 }}>{paper.description}</div>}</div>
              <div className="actions">
                <a className="btn btn-primary btn-small" href={paper.url} target="_blank" rel="noreferrer">📄 Download Paper</a>
                {video?.url ? <a className="btn btn-success btn-small" href={video.url} target="_blank" rel="noreferrer">🎥 Watch Video</a> : <span className="badge badge-pending" style={{ padding: "9px 12px" }}>🎥 Video Pending</span>}
              </div>
            </div>
          </div>;
        })}</div> : <div className="empty-state">No Papers added yet.</div>}
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>📚 Resources</h2>
        {resources.length ? <div className="grid">{resources.map((item) => <div className="info-item" key={item.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}><strong>{item.title}</strong><a className="btn btn-light btn-small" href={item.url} target="_blank" rel="noreferrer">Open</a></div>)}</div> : <div className="empty-state">No resources added yet.</div>}
      </section>
    </main>
  </>;
}

export default function Page({ params }) {
  const [id, setId] = useState(null);
  useEffect(() => { Promise.resolve(params).then((value) => setId(value?.id || null)); }, [params]);
  return <AuthGate role="student">{() => id ? <PaperClassView id={id} /> : <div className="center-screen">Loading...</div>}</AuthGate>;
}
