"use client";

import Link from "next/link";
import MathsBrand from "@/components/MathsBrand";

export default function PublicNav({
  page,
}) {
  return (
    <nav className="home-navbar">

      <MathsBrand />

      <div className="home-nav-buttons">

        <Link
          href="/"
          className="home-btn home-login-btn"
        >
          Home
        </Link>

        {page === "login" && (
          <Link
            href="/register"
            className="home-btn home-register-btn"
          >
            Register
          </Link>
        )}

        {page === "register" && (
          <Link
            href="/login"
            className="home-btn home-register-btn"
          >
            Login
          </Link>
        )}

      </div>

    </nav>
  );
}
