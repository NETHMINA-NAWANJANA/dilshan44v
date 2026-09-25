"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  collection,
  onSnapshot,
  orderBy,
  query,
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

function AttendancePage() {
  const [
    attendance,
    setAttendance,
  ] = useState([]);

  const [users, setUsers] =
    useState({});

  const [search, setSearch] =
    useState("");

  useEffect(() => {
    const attendanceQuery =
      query(
        collection(
          db,
          "attendance"
        ),
        orderBy(
          "markedAt",
          "desc"
        )
      );

    const unsubscribeAttendance =
      onSnapshot(
        attendanceQuery,
        (snapshot) => {
          setAttendance(
            snapshot.docs.map(
              (item) => ({
                id: item.id,
                ...item.data(),
              })
            )
          );
        }
      );

    const unsubscribeUsers =
      onSnapshot(
        collection(db, "users"),
        (snapshot) => {
          const userMap = {};

          snapshot.docs.forEach(
            (item) => {
              userMap[item.id] =
                item.data();
            }
          );

          setUsers(userMap);
        }
      );

    return () => {
      unsubscribeAttendance();
      unsubscribeUsers();
    };
  }, []);

  const filtered =
    useMemo(() => {
      const keyword =
        search
          .trim()
          .toLowerCase();

      return attendance.filter(
        (record) => {
          const student =
            users[
              record.studentId
            ] || {};

          if (!keyword) {
            return true;
          }

          return [
            student.fullName,
            student.email,
            student.studentCode,
            student.className,
            student.phone,
            student.address,
          ].some((value) =>
            String(value || "")
              .toLowerCase()
              .includes(keyword)
          );
        }
      );
    }, [
      attendance,
      users,
      search,
    ]);

  async function deleteAttendance(
    id
  ) {
    const confirmed =
      confirm(
        "Delete this attendance record?"
      );

    if (!confirmed) return;

    try {
      const token =
        await auth.currentUser.getIdToken();

      const response = await fetch(
        "/api/admin/delete-attendance",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${token}`,
          },

          body: JSON.stringify({
            id,
          }),
        }
      );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Delete failed."
        );
      }
    } catch (error) {
      alert(error.message);
    }
  }

  function exportCsv() {
    const csvRows = [
      [
        "Student ID",
        "Full Name",
        "Email",
        "Phone",
        "Class / Grade",
        "Address",
        "Date & Time",
        "Status",
      ],
    ];

    filtered.forEach(
      (record) => {
        const student =
          users[
            record.studentId
          ] || {};

        csvRows.push([
          student.studentCode ||
            "",

          student.fullName || "",

          student.email || "",

          student.phone || "",

          student.className ||
            "",

          student.address || "",

          formatDateTime(
            record.markedAt
          ),

          record.status || "",
        ]);
      }
    );

    const csv = csvRows
      .map((row) =>
        row
          .map(
            (value) =>
              `"${String(
                value
              ).replaceAll(
                '"',
                '""'
              )}"`
          )
          .join(",")
      )
      .join("\n");

    const blob = new Blob(
      [csv],
      {
        type: "text/csv;charset=utf-8;",
      }
    );

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement(
        "a"
      );

    link.href = url;

    link.download =
      `attendance-${new Date()
        .toISOString()
        .slice(0, 10)}.csv`;

    link.click();

    URL.revokeObjectURL(url);
  }

  return (
    <>
      <NavBar admin />

      <main className="container">
        <div className="title-row">
          <div>
            <h1>Attendance</h1>

            <p className="muted">
              View and export
              student attendance.
            </p>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            onClick={exportCsv}
          >
            Export CSV
          </button>
        </div>

        <div className="card">
          <input
            type="search"
            placeholder="Search name, email, ID, class, phone or address..."
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
          />
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
                <th>
                  Full Name
                </th>

                <th>Email</th>

                <th>
                  Student ID
                </th>

                <th>
                  Class / Grade
                </th>

                <th>
                  Date & Time
                </th>

                <th>Status</th>

                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map(
                (record) => {
                  const student =
                    users[
                      record.studentId
                    ] || {};

                  return (
                    <tr
                      key={
                        record.id
                      }
                    >
                      <td>
                        {
                          student.fullName
                        }
                      </td>

                      <td>
                        {
                          student.email
                        }
                      </td>

                      <td>
                        {
                          student.studentCode
                        }
                      </td>

                      <td>
                        {
                          student.className
                        }
                      </td>

                      <td>
                        {formatDateTime(
                          record.markedAt
                        )}
                      </td>

                      <td>
                        <span className="badge badge-active">
                          {
                            record.status
                          }
                        </span>
                      </td>

                      <td>
                        <button
                          type="button"
                          className="btn btn-small btn-danger"
                          onClick={() =>
                            deleteAttendance(
                              record.id
                            )
                          }
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                }
              )}

              {!filtered.length && (
                <tr>
                  <td colSpan="7">
                    No attendance
                    records found.
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
      {() => (
        <AttendancePage />
      )}
    </AuthGate>
  );
}
