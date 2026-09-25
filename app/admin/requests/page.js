"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";

import AuthGate from "@/components/AuthGate";
import NavBar from "@/components/NavBar";

import {
  auth,
  db,
} from "@/lib/firebase";

import {
  formatDateTime,
} from "@/lib/helpers";

function RequestsPage() {
  const [rows, setRows] =
    useState([]);

  const [photos, setPhotos] =
    useState({});

  const [busy, setBusy] =
    useState("");

  useEffect(() => {
    const q = query(
      collection(db, "users"),
      where("role", "==", "student"),
      where(
        "status",
        "==",
        "pending"
      )
    );

    return onSnapshot(
      q,
      async (snapshot) => {
        const students =
          snapshot.docs.map((item) => ({
            id: item.id,
            ...item.data(),
          }));

        setRows(students);

        const photoEntries =
          await Promise.all(
            students.map(
              async (student) => {
                try {
                  const photoSnap =
                    await getDoc(
                      doc(
                        db,
                        "studentPhotos",
                        student.id
                      )
                    );

                  return [
                    student.id,
                    photoSnap.exists()
                      ? photoSnap.data()
                          .photoData || ""
                      : "",
                  ];
                } catch {
                  return [
                    student.id,
                    "",
                  ];
                }
              }
            )
          );

        setPhotos(
          Object.fromEntries(
            photoEntries
          )
        );
      }
    );
  }, []);

  async function action(
    uid,
    actionName
  ) {
    setBusy(
      `${uid}-${actionName}`
    );

    try {
      const token =
        await auth.currentUser.getIdToken();

      const response = await fetch(
        `/api/admin/${actionName}`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${token}`,
          },

          body: JSON.stringify({
            uid,
          }),
        }
      );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Action failed."
        );
      }
    } catch (error) {
      alert(error.message);
    } finally {
      setBusy("");
    }
  }

  return (
    <>
      <NavBar admin />

      <main className="container">
        <div className="title-row">
          <div>
            <h1>
              Registration Requests
            </h1>

            <p className="muted">
              Check student details
              carefully before approving
              an account.
            </p>
          </div>

          <span className="badge">
            {rows.length} Pending
          </span>
        </div>

        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>Photo</th>
                <th>Full Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Class / Grade</th>
                <th>Address</th>
                <th>Requested</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {rows.map(
                (student) => (
                  <tr key={student.id}>
                    <td>
                      {photos[
                        student.id
                      ] ? (
                        <img
                          src={
                            photos[
                              student.id
                            ]
                          }
                          alt=""
                          className="avatar"
                          style={{
                            width: 48,
                            height: 48,
                          }}
                        />
                      ) : (
                        <div
                          className="avatar"
                          style={{
                            width: 48,
                            height: 48,
                            display:
                              "grid",
                            placeItems:
                              "center",
                            background:
                              "#edf1f7",
                            fontSize: 20,
                          }}
                        >
                          👤
                        </div>
                      )}
                    </td>

                    <td>
                      <b>
                        {
                          student.fullName
                        }
                      </b>
                    </td>

                    <td>
                      {student.email}
                    </td>

                    <td>
                      {student.phone}
                    </td>

                    <td>
                      {
                        student.className
                      }
                    </td>

                    <td
                      style={{
                        whiteSpace:
                          "normal",
                        minWidth: 180,
                      }}
                    >
                      {student.address}
                    </td>

                    <td>
                      {formatDateTime(
                        student.createdAt
                      )}
                    </td>

                    <td>
                      <div className="actions">
                        <button
                          className="btn btn-small btn-success"
                          disabled={
                            Boolean(busy)
                          }
                          onClick={() =>
                            action(
                              student.id,
                              "approve"
                            )
                          }
                        >
                          Accept
                        </button>

                        <button
                          className="btn btn-small btn-danger"
                          disabled={
                            Boolean(busy)
                          }
                          onClick={() =>
                            action(
                              student.id,
                              "reject"
                            )
                          }
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              )}

              {!rows.length && (
                <tr>
                  <td colSpan="8">
                    No pending
                    registration
                    requests.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}

export default function Page() {
  return (
    <AuthGate role="admin">
      {() => <RequestsPage />}
    </AuthGate>
  );
}
