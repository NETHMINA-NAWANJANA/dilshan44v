"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  onAuthStateChanged,
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


export default function AuthGate({
  role,
  children,
}) {

  const router = useRouter();

  const [state, setState] =
    useState({
      loading: true,
      profile: null,
    });


  useEffect(() => {

    const unsubscribe =
      onAuthStateChanged(
        auth,

        async (user) => {

          if (!user) {

            router.replace(
              "/login"
            );

            return;
          }


          const snapshot =
            await getDoc(
              doc(
                db,
                "users",
                user.uid
              )
            );


          if (!snapshot.exists()) {

            await signOut(auth);

            router.replace(
              "/login"
            );

            return;
          }


          const profile =
            snapshot.data();


          if (
            profile.status !==
            "active"
          ) {

            await signOut(auth);

            router.replace(
              "/login?message=pending"
            );

            return;
          }


          if (
            role &&
            profile.role !== role
          ) {

            router.replace(
              profile.role ===
                "admin"

                ? "/admin"

                : "/student"
            );

            return;
          }


          setState({
            loading: false,

            profile: {
              id: snapshot.id,
              ...profile,
            },
          });

        }
      );


    return () =>
      unsubscribe();

  }, [
    role,
    router,
  ]);


  if (state.loading) {

    return (
      <div className="center-screen">
        Loading...
      </div>
    );

  }


  return children(
    state.profile
  );
}
