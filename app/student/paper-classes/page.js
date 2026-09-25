"use client";

import { useEffect, useMemo, useState } from "react";
import AuthGate from "@/components/AuthGate";
import NavBar from "@/components/NavBar";
import { auth } from "@/lib/firebase";

function isGrade11(value = "") {
  const v = String(value).trim().toLowerCase().replace(/[-_]+/g," ").replace(/\s+/g," ").trim();
  return v === "11" || v.startsWith("11 ") || v === "grade 11" || v.startsWith("grade 11 ");
}
function displayDate(value) { return value ? String(value).replaceAll("-", "/") : "No date"; }

function PaperClasses({ profile }) {
  const [classes,setClasses]=useState([]), [content,setContent]=useState([]);
  const [loading,setLoading]=useState(true), [busy,setBusy]=useState(false), [error,setError]=useState("");
  const [showJoin,setShowJoin]=useState(false);

  async function token(){ const u=auth.currentUser; if(!u) throw new Error("Please login again."); return u.getIdToken(); }
  async function jsonFetch(path,opts={}){
    const t=await token(); const r=await fetch(path,{cache:"no-store",...opts,headers:{"Content-Type":"application/json",Authorization:`Bearer ${t}`,...(opts.headers||{})}});
    const txt=await r.text(); let d={}; try{d=txt?JSON.parse(txt):{}}catch{throw new Error(`Server returned an invalid response (${r.status}).`)}
    if(!r.ok) throw new Error(d.error||"Request failed."); return d;
  }
  async function load(){
    try{
      setError(""); const d=await jsonFetch("/api/paper-classes"); const list=d.classes||[]; setClasses(list);
      const cls=list[0];
      if(cls?.request?.status==="accepted") { const detail=await jsonFetch(`/api/paper-classes/${cls.id}`); setContent(detail.content||[]); setShowJoin(false); }
      else { setContent([]); setShowJoin(!!cls && cls?.request?.status!=="pending"); }
    }catch(e){setError(e.message)} finally{setLoading(false)}
  }
  useEffect(()=>{ load(); const timer=setInterval(()=>{ load(); },5000); return ()=>clearInterval(timer); },[]);
  async function requestAccess(id){
    try{setBusy(true);setError("");await jsonFetch("/api/paper-classes/requests",{method:"POST",body:JSON.stringify({paperClassId:id})});setShowJoin(false);await load();}
    catch(e){setError(e.message)}finally{setBusy(false)}
  }
  const cls=classes[0], status=cls?.request?.status;
  const papers=useMemo(()=>content.filter(x=>x.type==="paper").sort((a,b)=>String(b.paperDate||"").localeCompare(String(a.paperDate||""))),[content]);
  const videoFor=(paper)=>content.find(x=>x.type==="video"&&x.groupId&&x.groupId===paper.groupId);

  return <><NavBar student/><main className="container">
    <div style={{marginBottom:28}}><h1 style={{marginBottom:6}}>📚 Maths Paper Classes</h1><p className="muted" style={{margin:0}}>11 වසර Maths paper classes, papers සහ videos.</p></div>
    {error&&<div className="error" style={{marginBottom:18}}>{error}</div>}
    {loading?<div className="card">Loading Paper Class...</div>:!isGrade11(profile?.className)?<div className="card error">Paper Classes are available for Grade 11 students only.</div>:!cls?<div className="card">Paper Class is not available yet.</div>:status==="pending"?<div className="card" style={{textAlign:"center",padding:36}}><div style={{fontSize:30}}>⏳</div><h2>Waiting for approval</h2><p className="muted">Your request has been sent to the admin. This page will be available after your request is accepted.</p></div>:status==="accepted"?<>
      <div style={{display:"grid",gap:14}}>{papers.map(p=>{const v=videoFor(p);return <div className="card" key={p.id} style={{padding:"18px 20px"}}><div style={{display:"grid",gridTemplateColumns:"minmax(110px,1fr) auto auto",gap:18,alignItems:"center"}}><strong>{displayDate(p.paperDate)}</strong><a className="btn btn-light" href={p.url} target="_blank" rel="noreferrer">Paper</a>{v?.url?<a className="btn btn-primary" href={v.url} target="_blank" rel="noreferrer">Watch</a>:<span className="badge badge-pending" style={{padding:"10px 12px"}}>Video Pending</span>}</div></div>})}{!papers.length&&<div className="card"><div className="empty-state">No papers have been added yet.</div></div>}</div>
    </>:<div className="card" style={{textAlign:"center",padding:32}}><h2>Maths Paper Class</h2><p className="muted">Join this class to access papers and discussion videos.</p><button className="btn btn-primary" onClick={()=>setShowJoin(true)}>Request to Join</button></div>}
  </main>
  {showJoin&&cls&&<div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&setShowJoin(false)}><div className="modal card"><div className="title-row"><h2 style={{margin:0}}>Join Maths Paper Class</h2><button className="btn btn-light" onClick={()=>setShowJoin(false)}>✕</button></div><p style={{fontSize:17,lineHeight:1.6}}>To join this class, please send an access request to the admin.</p><p className="muted">You will be able to view papers and videos after the admin accepts your request.</p><div className="actions"><button className="btn btn-primary" disabled={busy} onClick={()=>requestAccess(cls.id)}>{busy?"Sending Request...":"Send Request"}</button><button className="btn btn-light" onClick={()=>setShowJoin(false)}>Cancel</button></div></div></div>}
  </>;
}
export default function Page(){return <AuthGate role="student">{p=><PaperClasses profile={p}/>}</AuthGate>}
