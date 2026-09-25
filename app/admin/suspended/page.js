"use client";

import {
  useEffect,
  useMemo,
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


function formatDate(value) {
  if (!value) return "-";

  try {
    if (value.toDate) {
      return value
        .toDate()
        .toLocaleString("en-LK");
    }

    return new Date(
      value
    ).toLocaleString("en-LK");
  } catch {
    return "-";
  }
}


function SuspendedStudentsPage() {
  const [
    students,
    setStudents,
  ] = useState([]);

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    classFilter,
    setClassFilter,
  ] = useState("");

  const [
    busyId,
    setBusyId,
  ] = useState("");

  const [
    deleteStudent,
    setDeleteStudent,
  ] = useState(null);

  const [
    confirmText,
    setConfirmText,
  ] = useState("");


  useEffect(() => {
    const q = query(
      collection(
        db,
        "users"
      ),

      where(
        "role",
        "==",
        "student"
      ),

      where(
        "status",
        "==",
        "suspended"
      )
    );

    return onSnapshot(
      q,
      (snapshot) => {
        setStudents(
          snapshot.docs.map(
            (item) => ({
              id: item.id,
              ...item.data(),
            })
          )
        );
      }
    );
  }, []);


  const classes =
    useMemo(() => {
      return [
        ...new Set(
          students
            .map(
              (student) =>
                student.className
            )
            .filter(Boolean)
        ),
      ].sort();
    }, [students]);


  const filteredStudents =
    useMemo(() => {
      const keyword =
        search
          .trim()
          .toLowerCase();

      return students.filter(
        (student) => {
          const matchSearch =
            !keyword ||
            [
              student.fullName,
              student.email,
              student.phone,
              student.studentCode,
              student.address,
              student.className,
            ].some((value) =>
              String(value || "")
                .toLowerCase()
                .includes(keyword)
            );

          const matchClass =
            !classFilter ||
            student.className ===
              classFilter;

          return (
            matchSearch &&
            matchClass
          );
        }
      );
    }, [
      students,
      search,
      classFilter,
    ]);


  async function getAdminToken() {
    if (!auth.currentUser) {
      throw new Error(
        "Admin session not found."
      );
    }

    return auth.currentUser.getIdToken();
  }


  async function activateStudent(
    student
  ) {
    const ok = confirm(
      `Activate ${student.fullName}?\n\nTheir existing Student ID, QR code and attendance history will remain unchanged.`
    );

    if (!ok) return;

    try {
      setBusyId(
        student.id
      );

      const token =
        await getAdminToken();

      const response =
        await fetch(
          "/api/admin/status",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${token}`,
            },

            body:
              JSON.stringify({
                uid:
                  student.id,

                status:
                  "active",
              }),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Unable to activate student."
        );
      }

      alert(
        "Student activated successfully."
      );

    } catch (error) {
      alert(
        error.message
      );

    } finally {
      setBusyId("");
    }
  }


  async function permanentDelete() {
    if (!deleteStudent) {
      return;
    }

    if (
      confirmText !==
      "DELETE"
    ) {
      alert(
        'Please type "DELETE" to confirm.'
      );

      return;
    }

    try {
      setBusyId(
        deleteStudent.id
      );

      const token =
        await getAdminToken();

      const response =
        await fetch(
          "/api/admin/delete-student",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${token}`,
            },

            body:
              JSON.stringify({
                uid:
                  deleteStudent.id,
              }),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Unable to delete student."
        );
      }

      setDeleteStudent(
        null
      );

      setConfirmText("");

      alert(
        "Student permanently deleted."
      );

    } catch (error) {
      alert(
        error.message
      );

    } finally {
      setBusyId("");
    }
  }


  return (
    <>
      <NavBar admin />

      <main className="container">

        <div className="title-row">

          <div>
            <h1>
              Suspended Students
            </h1>

            <p className="muted">
              Activate suspended
              students or permanently
              delete their account.
            </p>
          </div>

          <span className="badge">
            {
              filteredStudents.length
            }{" "}
            Suspended
          </span>

        </div>


        {/* SEARCH + FILTER */}

        <div className="card grid grid-2">

          <label>
            Search Student

            <input
              type="search"
              placeholder="Name, email, ID, phone or address..."
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
            />
          </label>


          <label>
            Class / Grade

            <select
              value={
                classFilter
              }
              onChange={(event) =>
                setClassFilter(
                  event.target.value
                )
              }
            >
              <option value="">
                All Classes
              </option>

              {classes.map(
                (className) => (
                  <option
                    key={
                      className
                    }
                    value={
                      className
                    }
                  >
                    {className}
                  </option>
                )
              )}
            </select>
          </label>

        </div>


        {/* TABLE */}

        <div
          className="card table-wrap"
          style={{
            marginTop: 18,
          }}
        >

          <table>

            <thead>
              <tr>
                <th>
                  Student
                </th>

                <th>
                  Email
                </th>

                <th>
                  Phone
                </th>

                <th>
                  Student ID
                </th>

                <th>
                  Class
                </th>

                <th>
                  Registered
                </th>

                <th>
                  Suspended
                </th>

                <th>
                  Action
                </th>
              </tr>
            </thead>


            <tbody>

              {filteredStudents.map(
                (student) => (
                  <SuspendedRow
                    key={
                      student.id
                    }

                    student={
                      student
                    }

                    busy={
                      busyId ===
                      student.id
                    }

                    onActivate={() =>
                      activateStudent(
                        student
                      )
                    }

                    onDelete={() => {
                      setDeleteStudent(
                        student
                      );

                      setConfirmText(
                        ""
                      );
                    }}
                  />
                )
              )}


              {!filteredStudents.length && (
                <tr>
                  <td
                    colSpan="8"
                    style={{
                      textAlign:
                        "center",

                      padding:
                        30,
                    }}
                  >
                    No suspended
                    students found.
                  </td>
                </tr>
              )}

            </tbody>

          </table>

        </div>


        {/* DELETE CONFIRM BOX */}

        {deleteStudent && (
          <div
            className="card"
            style={{
              marginTop: 20,

              border:
                "1px solid #fecdca",

              background:
                "#fffafa",
            }}
          >

            <h3
              style={{
                color:
                  "#b42318",
              }}
            >
              Permanent Delete
            </h3>


            <p
              style={{
                marginTop: 10,
              }}
            >
              You are about to permanently
              delete{" "}

              <b>
                {
                  deleteStudent.fullName
                }
              </b>
              .
            </p>


            <p
              className="muted"
              style={{
                marginTop: 8,
              }}
            >
              Their login account,
              profile, profile photo,
              attendance history and
              student data will be
              permanently removed.
            </p>


            <p
              className="muted"
              style={{
                marginTop: 6,
              }}
            >
              Student ID{" "}

              <b>
                {
                  deleteStudent.studentCode ||
                  "-"
                }
              </b>{" "}

              will remain permanently
              reserved and will never be
              assigned to another student.
            </p>


            <label
              style={{
                display:
                  "block",

                marginTop:
                  15,
              }}
            >
              Type DELETE to confirm

              <input
                type="text"
                value={
                  confirmText
                }
                onChange={(event) =>
                  setConfirmText(
                    event.target.value
                  )
                }
                placeholder="DELETE"
              />
            </label>


            <div
              className="actions"
              style={{
                marginTop:
                  15,
              }}
            >

              <button
                type="button"
                className="btn btn-danger"
                disabled={
                  confirmText !==
                    "DELETE" ||
                  busyId ===
                    deleteStudent.id
                }
                onClick={
                  permanentDelete
                }
              >
                {busyId ===
                deleteStudent.id
                  ? "Deleting..."
                  : "Delete Permanently"}
              </button>


              <button
                type="button"
                className="btn btn-light"
                disabled={
                  busyId ===
                  deleteStudent.id
                }
                onClick={() => {
                  setDeleteStudent(
                    null
                  );

                  setConfirmText(
                    ""
                  );
                }}
              >
                Cancel
              </button>

            </div>

          </div>
        )}

      </main>
    </>
  );
}


function SuspendedRow({
  student,
  busy,
  onActivate,
  onDelete,
}) {
  const [
    photoData,
    setPhotoData,
  ] = useState("");


  useEffect(() => {
    let mounted = true;

    async function loadPhoto() {
      try {
        const photoSnap =
          await getDoc(
            doc(
              db,
              "studentPhotos",
              student.id
            )
          );

        if (
          mounted &&
          photoSnap.exists()
        ) {
          setPhotoData(
            photoSnap.data()
              .photoData || ""
          );
        }

      } catch {}
    }

    loadPhoto();

    return () => {
      mounted = false;
    };

  }, [student.id]);


  return (
    <tr>

      {/* STUDENT */}

      <td>
        <div className="profile-row">

          {photoData ? (
            <img
              src={
                photoData
              }
              alt=""
              className="avatar"
              style={{
                width: 44,
                height: 44,
              }}
            />
          ) : (
            <div
              className="avatar"
              style={{
                width: 44,
                height: 44,

                display:
                  "grid",

                placeItems:
                  "center",

                background:
                  "#edf1f7",
              }}
            >
              👤
            </div>
          )}


          <div>

            <b>
              {
                student.fullName
              }
            </b>

            <div
              className="muted small-text"
            >
              Suspended
            </div>

          </div>

        </div>
      </td>


      {/* EMAIL */}

      <td>
        {student.email || "-"}
      </td>


      {/* PHONE */}

      <td>
        {student.phone || "-"}
      </td>


      {/* STUDENT ID */}

      <td>
        <b>
          {
            student.studentCode ||
            "-"
          }
        </b>
      </td>


      {/* CLASS */}

      <td>
        {
          student.className ||
          "-"
        }
      </td>


      {/* REGISTERED DATE */}

      <td
        style={{
          minWidth: 150,
        }}
      >
        {formatDate(
          student.createdAt
        )}
      </td>


      {/* SUSPENDED DATE */}

      <td
        style={{
          minWidth: 150,
        }}
      >
        {formatDate(
          student.suspendedAt
        )}
      </td>


      {/* ACTION */}

      <td>

        <div className="actions">

          <button
            type="button"
            className="btn btn-small btn-success"
            disabled={busy}
            onClick={
              onActivate
            }
          >
            {busy
              ? "Please wait..."
              : "Activate"}
          </button>


          <button
            type="button"
            className="btn btn-small btn-danger"
            disabled={busy}
            onClick={
              onDelete
            }
          >
            Delete
          </button>

        </div>

      </td>

    </tr>
  );
}


export default function Page() {
  return (
    <AuthGate role="admin">
      {() => (
        <SuspendedStudentsPage />
      )}
    </AuthGate>
  );
}
