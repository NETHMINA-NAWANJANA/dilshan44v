"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

import { auth, db } from "@/lib/firebase";

export default function MathsBrand() {
  const [href, setHref] = useState("/");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (user) => {
        if (!user) {
          setHref("/");
          return;
        }

        try {
          const snap = await getDoc(
            doc(db, "users", user.uid)
          );

          if (!snap.exists()) {
            setHref("/");
            return;
          }

          const profile = snap.data();

          if (profile.role === "admin") {
            setHref("/admin");
          } else if (profile.role === "student") {
            setHref("/student");
          } else {
            setHref("/");
          }
        } catch {
          setHref("/");
        }
      }
    );

    return () => unsubscribe();
  }, []);

  return (
    <Link
      href={href}
      className="home-logo"
    >
      Maths<span>.</span>
    </Link>
  );
}
