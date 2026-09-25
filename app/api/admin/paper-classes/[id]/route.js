import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { requireAdmin } from "@/lib/server-auth";
export async function PATCH(request,{params}){try{await requireAdmin(request);const {id}=await params;const body=await request.json();const update={updatedAt:FieldValue.serverTimestamp()};if(body.name!==undefined)update.name=String(body.name).trim();if(body.description!==undefined)update.description=String(body.description).trim();if(body.active!==undefined)update.active=Boolean(body.active);await adminDb.collection("paperClasses").doc(id).update(update);return NextResponse.json({ok:true});}catch(error){return NextResponse.json({error:error.message||"Unable to update."},{status:error.message==="UNAUTHORIZED"?401:403});}}
