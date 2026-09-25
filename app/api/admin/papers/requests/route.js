import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { requireAdmin } from "@/lib/server-auth";
export async function GET(request){try{await requireAdmin(request);const s=await adminDb.collection("classAccessRequests").where("status","==","pending").get();return NextResponse.json({requests:s.docs.map(d=>({id:d.id,...d.data()}))});}catch(e){return NextResponse.json({error:e.message||"Unauthorized"},{status:401});}}
export async function PATCH(request){try{await requireAdmin(request);const {id,status}=await request.json();if(!id||!['approved','rejected'].includes(status))return NextResponse.json({error:"Invalid request"},{status:400});await adminDb.collection("classAccessRequests").doc(id).update({status,reviewedAt:FieldValue.serverTimestamp()});return NextResponse.json({success:true});}catch(e){return NextResponse.json({error:e.message||"Update failed"},{status:401});}}
