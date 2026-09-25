"use client";

import Link from "next/link";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";

import { auth } from "@/lib/firebase";
import MathsBrand from "@/components/MathsBrand";

export default function NavBar({
  admin = false,
  student = false,
  backAction = null,
  backLabel = "← Back",
}) {
  const router = useRouter();

  async function logout() {
    try {
      await signOut(auth);

      router.replace("/");
    } catch (error) {
      console.error(
        "Logout failed:",
        error
      );
    }
  }

  return (
    <nav className="home-navbar">

      {/* EXACT HOME PAGE BRAND */}
      <MathsBrand />

      <div className="nav-links">

        {admin && (
          <>
            <Link href="/admin/requests">
              Requests
            </Link>

            <Link href="/admin/students">
              Students
            </Link>

            <Link href="/admin/suspended">
              Suspended
            </Link>

            <Link href="/admin/scanner">
              Scanner
            </Link>

            <Link href="/admin/qr-print">
              QR Print
            </Link>

            <Link href="/admin/attendance">
              Attendance
            </Link>

            <Link href="/admin/exam-results">
              Exam Results
            </Link>

            <Link href="/admin/paper-classes">
              Paper Classes
            </Link>
          </>
        )}

        {student && (
          <>
            <Link href="/student/paper-classes">
              Paper Classes
            </Link>
            <Link href="/student/exam-results">
              Exam Results
            </Link>
          </>
        )}

        {backAction && (
          <button
            type="button"
            onClick={backAction}
            style={{
              border: "1px solid #d1d5db",
              background: "#edf1f7",
              color: "#182033",
              padding: "9px 14px",
              borderRadius: 8,
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            {backLabel}
          </button>
        )}

        <button
          type="button"
          className="home-btn home-register-btn"
          onClick={logout}
        >
          Logout
        </button>

      </div>

    </nav>
  );
}
