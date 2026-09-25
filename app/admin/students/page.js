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

function StudentsPage() {
  const [students, setStudents] =
    useState([]);

  const [search, setSearch] =
    useState("");

  const [
    classFilter,
    setClassFilter,
  ] = useState("");

  const [
    resetStudent,
    setResetStudent,
  ] = useState(null);

  const [
    newPassword,
    setNewPassword,
  ] = useState("");

  useEffect(() => {
    const q = query(
  collection(db, "users"),

  where(
    "role",
    "==",
    "student"
  ),

  where(
    "status",
    "==",
    "active"
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

  const classes = useMemo(
    () =>
      [
        ...new Set(
          students
            .map(
              (student) =>
                student.className
            )
            .filter(Boolean)
        ),
      ].sort(),
    [students]
  );

  const filteredStudents =
    useMemo(() => {
      const keyword =
        search
          .trim()
          .toLowerCase();

      return students.filter(
        (student) => {
          const matchesSearch =
            !keyword ||
            [
              student.fullName,
              student.email,
              student.studentCode,
              student.phone,
              student.address,
            ].some((value) =>
              String(value || "")
                .toLowerCase()
                .includes(keyword)
            );

          const matchesClass =
            !classFilter ||
            student.className ===
              classFilter;

          return (
            matchesSearch &&
            matchesClass
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

  async function resetPassword() {
    try {
      if (!resetStudent) return;

      if (
        newPassword.length < 6
      ) {
        alert(
          "Password must contain at least 6 characters."
        );
        return;
      }

      const token =
        await getAdminToken();

      const response = await fetch(
        "/api/admin/reset-password",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${token}`,
          },

          body: JSON.stringify({
            uid: resetStudent.id,
            newPassword,
          }),
        }
      );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Password reset failed."
        );
      }

      alert(
        "Password reset successfully."
      );

      setResetStudent(null);
      setNewPassword("");
    } catch (error) {
      alert(error.message);
    }
  }

  async function changeStatus(
    uid,
    status
  ) {
    try {
      const token =
        await getAdminToken();

      const response = await fetch(
        "/api/admin/status",
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
            status,
          }),
        }
      );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Unable to change status."
        );
      }
    } catch (error) {
      alert(error.message);
    }
  }

  async function reissueQr(uid) {
    if (
      !confirm(
        "Generate a new QR code for this student? The old QR will stop working."
      )
    ) {
      return;
    }

    try {
      const token =
        await getAdminToken();

      const response = await fetch(
        "/api/admin/reissue-qr",
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
            "QR reissue failed."
        );
      }

      alert(
        "New QR generated successfully."
      );
    } catch (error) {
      alert(error.message);
    }
  }

  return (
    <>
      <NavBar admin />

      <main className="container">

        <div className="title-row">
          <div>
            <h1>Students</h1>

            <p className="muted">
              Manage approved and
              registered students.
            </p>
          </div>

          <span className="badge">
            {
              filteredStudents.length
            }{" "}
            Students
          </span>
        </div>


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
              value={classFilter}
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
                    key={className}
                    value={className}
                  >
                    {className}
                  </option>
                )
              )}
            </select>
          </label>

        </div>


        <div
          className="card table-wrap"
          style={{
            marginTop: 18,
          }}
        >
          <table>

            <thead>
              <tr>
                <th>Student</th>
                <th>Email</th>
                <th>Phone</th>
                <th>ID</th>

                <th>
                  Class / Grade
                </th>

                <th>Address</th>

                <th>
                  Registered
                </th>

                <th>Status</th>

                <th>
                  Last Attendance
                </th>

                <th>Action</th>
              </tr>
            </thead>


            <tbody>

              {filteredStudents.map(
                (student) => (
                  <StudentRow
                    key={student.id}
                    student={
                      student
                    }
                    onReset={() =>
                      setResetStudent(
                        student
                      )
                    }
                    onStatus={
                      changeStatus
                    }
                    onReissueQr={
                      reissueQr
                    }
                  />
                )
              )}


              {!filteredStudents.length && (
                <tr>
                  <td colSpan="10">
                    No students
                    found.
                  </td>
                </tr>
              )}

            </tbody>

          </table>
        </div>


        {resetStudent && (
          <div
            className="card"
            style={{
              marginTop: 18,
            }}
          >
            <h3>
              Reset Password
            </h3>

            <p className="muted">
              Student:{" "}

              <b>
                {
                  resetStudent.fullName
                }
              </b>
            </p>

            <p className="muted">
              Email:{" "}
              {
                resetStudent.email
              }
            </p>


            <div className="grid grid-2">

              <input
                type="password"
                placeholder="New temporary password"
                value={newPassword}
                onChange={(event) =>
                  setNewPassword(
                    event.target
                      .value
                  )
                }
              />


              <div className="actions">

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={
                    resetPassword
                  }
                >
                  Reset Password
                </button>


                <button
                  type="button"
                  className="btn btn-light"
                  onClick={() => {
                    setResetStudent(
                      null
                    );

                    setNewPassword(
                      ""
                    );
                  }}
                >
                  Cancel
                </button>

              </div>

            </div>
          </div>
        )}

      </main>
    </>
  );
}


function StudentRow({
  student,
  onReset,
  onStatus,
  onReissueQr,
}) {
  const [
    lastAttendance,
    setLastAttendance,
  ] = useState(null);

  const [
    photoData,
    setPhotoData,
  ] = useState("");


  useEffect(() => {
    let mounted = true;

    async function loadStudentExtraData() {

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


      try {
        if (!auth.currentUser) {
          return;
        }

        const token =
          await auth.currentUser.getIdToken();

        const response =
          await fetch(
            `/api/admin/last-attendance?uid=${student.id}`,
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          );

        const result =
          await response.json();

        if (
          mounted &&
          response.ok
        ) {
          setLastAttendance(
            result.markedAt
          );
        }
      } catch {}
    }

    loadStudentExtraData();

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
              src={photoData}
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
                display: "grid",
                placeItems:
                  "center",
                background:
                  "#edf1f7",
              }}
            >
              👤
            </div>
          )}

          <b>
            {student.fullName}
          </b>

        </div>
      </td>


      {/* EMAIL */}
      <td>
        {student.email}
      </td>


      {/* PHONE */}
      <td>
        {student.phone}
      </td>


      {/* STUDENT ID */}
      <td>
        {student.studentCode ||
          "-"}
      </td>


      {/* CLASS */}
      <td>
        {student.className}
      </td>


      {/* ADDRESS */}
      <td
        style={{
          whiteSpace: "normal",
          minWidth: 180,
        }}
      >
        {student.address || "-"}
      </td>


      {/* REGISTERED DATE + TIME */}
      <td
        style={{
          minWidth: 160,
        }}
      >
        {student.createdAt?.toDate
          ? student.createdAt
              .toDate()
              .toLocaleString(
                "en-LK",
                {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                }
              )
          : "-"}
      </td>


      {/* STATUS */}
      <td>
        <span
          className={`badge ${
            student.status ===
            "active"
              ? "badge-active"
              : "badge-pending"
          }`}
        >
          {student.status}
        </span>
      </td>


      {/* LAST ATTENDANCE */}
      <td>
        {lastAttendance
          ? new Date(
              lastAttendance
            ).toLocaleString(
              "en-LK"
            )
          : "-"}
      </td>


      {/* ACTIONS */}
      <td>
        <div className="actions">

          <button
            type="button"
            className="btn btn-small btn-light"
            onClick={onReset}
          >
            Reset Password
          </button>


          {student.status ===
            "active" && (
            <button
              type="button"
              className="btn btn-small btn-light"
              onClick={() =>
                onReissueQr(
                  student.id
                )
              }
            >
              Reissue QR
            </button>
          )}


          {student.status ===
          "active" ? (
            <button
              type="button"
              className="btn btn-small btn-danger"
              onClick={() =>
                onStatus(
                  student.id,
                  "suspended"
                )
              }
            >
              Suspend
            </button>
          ) : student.status ===
            "suspended" ? (
            <button
              type="button"
              className="btn btn-small btn-success"
              onClick={() =>
                onStatus(
                  student.id,
                  "active"
                )
              }
            >
              Activate
            </button>
          ) : null}

        </div>
      </td>

    </tr>
  );
}


export default function Page() {
  return (
    <AuthGate role="admin">
      {() => <StudentsPage />}
    </AuthGate>
  );
}
