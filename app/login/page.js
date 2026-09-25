"use client";

import {
  useEffect,
  useState,
} from "react";

import Link from "next/link";

import {
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";

import {
  doc,
  getDoc,
} from "firebase/firestore";

import {
  useRouter,
} from "next/navigation";

import {
  auth,
  db,
} from "@/lib/firebase";

import PasswordField from "@/components/PasswordField";
import PublicNav from "@/components/PublicNav";

export default function LoginPage() {
  const router =
    useRouter();

  const [
    pageMessage,
    setPageMessage,
  ] = useState("");

  const [
    form,
    setForm,
  ] = useState({
    email: "",
    password: "",
  });

  const [error, setError] =
    useState("");

  const [busy, setBusy] =
    useState(false);


  useEffect(() => {
    const params =
      new URLSearchParams(
        window.location.search
      );

    setPageMessage(
      params.get("message") ||
        ""
    );
  }, []);


  async function checkDeleted(
    email
  ) {
    try {
      const response =
        await fetch(
          "/api/account-status",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                email,
              }),
          }
        );

      const result =
        await response.json();

      return (
        response.ok &&
        result.deleted === true
      );

    } catch {
      return false;
    }
  }


  async function submit(event) {
    event.preventDefault();

    setError("");
    setPageMessage("");
    setBusy(true);

    const email =
      form.email
        .trim()
        .toLowerCase();

    try {
      const credential =
        await signInWithEmailAndPassword(
          auth,
          email,
          form.password
        );

      const snapshot =
        await getDoc(
          doc(
            db,
            "users",
            credential.user.uid
          )
        );


      if (!snapshot.exists()) {
        await signOut(auth);

        const deleted =
          await checkDeleted(
            email
          );

        setError(
          deleted
            ? "Your account has been deleted. Please contact Gatiyawala Sir."
            : "Student profile not found. Please contact Gatiyawala Sir."
        );

        return;
      }


      const profile =
        snapshot.data();


      if (
        profile.status ===
        "suspended"
      ) {
        await signOut(auth);

        setError(
          "Your account has been suspended. Please contact Gatiyawala Sir."
        );

        return;
      }


      if (
        profile.status ===
        "pending"
      ) {
        await signOut(auth);

        setError(
          "Your registration is waiting for admin approval."
        );

        return;
      }


      if (
        profile.status !==
        "active"
      ) {
        await signOut(auth);

        setError(
          "This account is not active. Please contact Gatiyawala Sir."
        );

        return;
      }


      router.push(
        profile.role ===
          "admin"
          ? "/admin"
          : "/student"
      );

    } catch (err) {
      const code =
        err?.code || "";


      /*
       * Suspend route disables
       * Firebase Auth account.
       */
      if (
        code ===
        "auth/user-disabled"
      ) {
        setError(
          "Your account has been suspended. Please contact Gatiyawala Sir."
        );

      } else if (
        [
          "auth/invalid-credential",
          "auth/user-not-found",
          "auth/wrong-password",
        ].includes(code)
      ) {
        const deleted =
          await checkDeleted(
            email
          );

        setError(
          deleted
            ? "Your account has been deleted. Please contact Gatiyawala Sir."
            : "Invalid email or password."
        );

      } else if (
        code ===
        "auth/too-many-requests"
      ) {
        setError(
          "Too many attempts. Please try again later."
        );

      } else {
        setError(
          err.message ||
            "Login failed."
        );
      }

    } finally {
      setBusy(false);
    }
  }


  return (
    <main className="login-page">

      <PublicNav page="login" />


      <div className="auth-wrap auth-gradient">

        <form
          className="card auth-card login-card grid"
          onSubmit={submit}
        >

          <div className="auth-heading centered-heading">

            <div className="logo-mark">
              M
            </div>

            <div>
              <h1>
                Maths Class
              </h1>

              <p className="muted">
                Secure student attendance portal
              </p>
            </div>

          </div>


          {pageMessage ===
            "pending" && (
            <div className="success">
              Registration sent
              successfully. Wait for
              admin approval before
              logging in.
            </div>
          )}


          {pageMessage ===
            "suspended" && (
            <div className="error">
              Your account has been
              suspended. Please contact
              Gatiyawala Sir.
            </div>
          )}


          {pageMessage ===
            "deleted" && (
            <div className="error">
              Your account has been
              deleted. Please contact
              Gatiyawala Sir.
            </div>
          )}


          {error && (
            <div className="error">
              {error}
            </div>
          )}


          <label>
            Email

            <input
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={(event) =>
                setForm({
                  ...form,
                  email:
                    event.target.value,
                })
              }
            />
          </label>


          <PasswordField
            label="Password"
            value={form.password}
            onChange={(event) =>
              setForm({
                ...form,
                password:
                  event.target.value,
              })
            }
            autoComplete="current-password"
            placeholder="Enter your password"
          />


          <button
            className="btn btn-primary btn-large"
            disabled={busy}
          >
            {busy
              ? "Signing in..."
              : "Login"}
          </button>


          <p className="muted auth-footer">
            New student?{" "}

            <Link href="/register">
              <b>
                Send registration request
              </b>
            </Link>
          </p>

        </form>

      </div>

    </main>
  );
}
