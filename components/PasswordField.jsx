"use client";

import { useState } from "react";

export default function PasswordField({ label = "Password", value, onChange, name, placeholder = "", minLength = 6, required = true, autoComplete = "current-password" }) {
  const [show, setShow] = useState(false);
  return (
    <label>
      {label}
      <div className="password-wrap">
        <input
          name={name}
          type={show ? "text" : "password"}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          minLength={minLength}
          required={required}
          autoComplete={autoComplete}
        />
        <button
          type="button"
          className="eye-btn"
          aria-label={show ? "Hide password" : "Show password"}
          title={show ? "Hide password" : "Show password"}
          onClick={() => setShow(v => !v)}
        >
          {show ? (
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.9 4.2A10.9 10.9 0 0112 4c5.5 0 9.5 4.6 10 6.5a10.2 10.2 0 01-3.1 4.8M6.2 6.2A10.6 10.6 0 002 10.5C2.5 12.4 6.5 17 12 17c1.2 0 2.3-.2 3.3-.6"/></svg>
          ) : (
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>
          )}
        </button>
      </div>
    </label>
  );
}
