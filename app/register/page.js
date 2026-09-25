"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import {
  doc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { useRouter } from "next/navigation";

import { auth, db } from "@/lib/firebase";
import { compressProfileImage } from "@/lib/image";
import PublicNav from "@/components/PublicNav";

const initialForm = {
  fullName: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
  className: "",
  address: "",
};

export default function RegisterPage() {
  const router = useRouter();

  const [form, setForm] =
    useState(initialForm);

  const [photo, setPhoto] =
    useState(null);

  const [photoPreview, setPhotoPreview] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);

  const [error, setError] =
    useState("");

  const [busy, setBusy] =
    useState(false);

  const passwordStrength =
    useMemo(() => {
      const password =
        form.password;

      if (!password) return "";

      let score = 0;

      if (password.length >= 8) score++;
      if (/[A-Z]/.test(password)) score++;
      if (/[a-z]/.test(password)) score++;
      if (/[0-9]/.test(password)) score++;

      if (
        /[^A-Za-z0-9]/.test(
          password
        )
      ) {
        score++;
      }

      if (score <= 2) {
        return "Weak";
      }

      if (score <= 4) {
        return "Good";
      }

      return "Strong";
    }, [form.password]);

  function updateField(event) {
    const {
      name,
      value,
    } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handlePhoto(event) {
    const file =
      event.target.files?.[0] ||
      null;

    setPhoto(file);

    if (photoPreview) {
      URL.revokeObjectURL(
        photoPreview
      );
    }

    if (file) {
      setPhotoPreview(
        URL.createObjectURL(file)
      );
    } else {
      setPhotoPreview("");
    }
  }

  async function submit(event) {
    event.preventDefault();

    setError("");

    const fullName =
      form.fullName.trim();

    const email =
      form.email.trim();

    const phone =
      form.phone.trim();

    const className =
      form.className.trim();

    const address =
      form.address.trim();

    if (
      !fullName ||
      !email ||
      !phone ||
      !form.password ||
      !form.confirmPassword ||
      !className ||
      !address
    ) {
      setError(
        "Please fill all required fields."
      );

      return;
    }

    if (
      form.password.length < 6
    ) {
      setError(
        "Password must contain at least 6 characters."
      );

      return;
    }

    if (
      form.password !==
      form.confirmPassword
    ) {
      setError(
        "Passwords do not match."
      );

      return;
    }

    setBusy(true);

    try {
      const response =
        await fetch(
          "/api/register",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                fullName,
                email,
                phone,
                password:
                  form.password,
                className,
                address,
              }),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Registration failed."
        );
      }

      /*
       * Profile photo optional.
       * Photo selected නම්
       * temporary login කරලා
       * studentPhotos collection
       * එකට save කරනවා.
       */

      if (photo) {
        await signInWithEmailAndPassword(
          auth,
          email,
          form.password
        );

        const photoData =
          await compressProfileImage(
            photo
          );

        await setDoc(
          doc(
            db,
            "studentPhotos",
            result.uid
          ),
          {
            ownerId:
              result.uid,

            photoData,

            updatedAt:
              serverTimestamp(),
          }
        );

        await signOut(auth);
      }

      /*
       * Register success
       * -> Login page එකට
       * pending message එක්ක.
       */
      router.replace(
        "/login?message=pending"
      );

    } catch (err) {
      try {
        await signOut(auth);
      } catch {}

      setError(
        err.message ||
          "Registration failed."
      );

    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="register-page">

      {/* PUBLIC NAVBAR */}
      <PublicNav page="register" />

      {/* REGISTER AREA */}
      <div className="auth-wrap">

        <form
          className="card auth-card grid"
          onSubmit={submit}
        >

          <div>
            <h1>
              Student Registration
            </h1>

            <p className="muted">
              Your account will
              become active after
              admin approval.
            </p>
          </div>


          {error && (
            <div className="error">
              {error}
            </div>
          )}


          {/* FULL NAME */}

          <label>
            Full Name *

            <input
              type="text"
              name="fullName"
              required
              value={
                form.fullName
              }
              onChange={
                updateField
              }
              placeholder="Enter your full name"
            />
          </label>


          {/* EMAIL */}

          <label>
            Email *

            <input
              type="email"
              name="email"
              required
              value={
                form.email
              }
              onChange={
                updateField
              }
              placeholder="student@example.com"
            />
          </label>


          {/* PHONE */}

          <label>
            Student Phone *

            <input
              type="tel"
              name="phone"
              required
              value={
                form.phone
              }
              onChange={
                updateField
              }
              placeholder="07XXXXXXXX"
            />
          </label>


          {/* CLASS */}

          <label>
            Class / Grade *

            <select
              name="className"
              required
              value={
                form.className
              }
              onChange={
                updateField
              }
            >
              <option value="">
                Select Grade
              </option>

              <option value="Grade 6">
                Grade 6
              </option>

              <option value="Grade 7">
                Grade 7
              </option>

              <option value="Grade 8">
                Grade 8
              </option>

              <option value="Grade 9">
                Grade 9
              </option>

              <option value="Grade 10">
                Grade 10
              </option>

              <option value="Grade 11">
                Grade 11
              </option>
            </select>
          </label>


          {/* ADDRESS */}

          <label>
            Address *

            <textarea
              name="address"
              required
              value={
                form.address
              }
              onChange={
                updateField
              }
              placeholder="Enter student address"
              rows={3}
              style={{
                width: "100%",
                padding:
                  "12px 13px",
                borderRadius:
                  "10px",
                border:
                  "1px solid var(--line)",
                resize:
                  "vertical",
                font:
                  "inherit",
              }}
            />
          </label>


          {/* PASSWORD */}

          <label>
            Password *

            <div
              style={{
                position:
                  "relative",
              }}
            >
              <input
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                name="password"
                required
                minLength={6}
                value={
                  form.password
                }
                onChange={
                  updateField
                }
                placeholder="Create a password"
                style={{
                  paddingRight:
                    "48px",
                }}
              />

              <button
                type="button"
                aria-label="Show or hide password"
                onClick={() =>
                  setShowPassword(
                    (current) =>
                      !current
                  )
                }
                style={{
                  position:
                    "absolute",
                  right:
                    "8px",
                  top:
                    "50%",
                  transform:
                    "translateY(-50%)",
                  border: 0,
                  background:
                    "transparent",
                  cursor:
                    "pointer",
                  fontSize:
                    "19px",
                }}
              >
                {showPassword
                  ? "🙈"
                  : "👁"}
              </button>
            </div>

            {form.password && (
              <small className="muted">
                Password strength:{" "}
                <b>
                  {
                    passwordStrength
                  }
                </b>
              </small>
            )}
          </label>


          {/* CONFIRM PASSWORD */}

          <label>
            Confirm Password *

            <div
              style={{
                position:
                  "relative",
              }}
            >
              <input
                type={
                  showConfirmPassword
                    ? "text"
                    : "password"
                }
                name="confirmPassword"
                required
                value={
                  form.confirmPassword
                }
                onChange={
                  updateField
                }
                placeholder="Enter password again"
                style={{
                  paddingRight:
                    "48px",
                }}
              />

              <button
                type="button"
                aria-label="Show or hide confirm password"
                onClick={() =>
                  setShowConfirmPassword(
                    (current) =>
                      !current
                  )
                }
                style={{
                  position:
                    "absolute",
                  right:
                    "8px",
                  top:
                    "50%",
                  transform:
                    "translateY(-50%)",
                  border: 0,
                  background:
                    "transparent",
                  cursor:
                    "pointer",
                  fontSize:
                    "19px",
                }}
              >
                {showConfirmPassword
                  ? "🙈"
                  : "👁"}
              </button>
            </div>
          </label>


          {/* PROFILE PHOTO */}

          <label>
            Choose Profile Photo{" "}

            <span className="muted">
              Optional
            </span>

            <input
              type="file"
              accept="image/*"
              onChange={
                handlePhoto
              }
            />
          </label>


          {photoPreview && (
            <div
              style={{
                textAlign:
                  "center",
              }}
            >
              <img
                src={
                  photoPreview
                }
                alt="Profile preview"
                className="avatar"
                style={{
                  width: 100,
                  height: 100,
                }}
              />

              <p className="muted">
                Profile photo
                preview
              </p>
            </div>
          )}


          {/* SUBMIT */}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={
              busy
            }
          >
            {busy
              ? "Sending Request..."
              : "Send Registration Request"}
          </button>


          <p className="muted">
            Already registered?{" "}

            <Link href="/login">
              <b>Login</b>
            </Link>
          </p>

        </form>

      </div>

    </main>
  );
}
