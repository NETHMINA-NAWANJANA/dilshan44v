"use client";

import { useEffect, useState } from "react";
import NavBar from "@/components/NavBar";
import AuthGate from "@/components/AuthGate";
import { auth } from "@/lib/firebase";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const GRADES = [
  "Grade 6",
  "Grade 7",
  "Grade 8",
  "Grade 9",
  "Grade 10",
  "Grade 11",
];

function getYears() {
  const currentYear = new Date().getFullYear();

  return Array.from(
    { length: 10 },
    (_, index) => currentYear - 5 + index
  );
}

/*
  Builds the YYYY-MM-DD exam date the backend requires, without
  asking the admin to pick a day. If the selected year/month is the
  current month, use today's date; otherwise default to the 1st.
*/
function buildExamDate(year, monthName) {
  const monthNumber = MONTHS.indexOf(monthName) + 1;
  const now = new Date();

  const day =
    now.getFullYear() === Number(year) &&
    now.getMonth() + 1 === monthNumber
      ? now.getDate()
      : 1;

  return {
    day,
    dateString: `${year}-${String(monthNumber).padStart(
      2,
      "0"
    )}-${String(day).padStart(2, "0")}`,
  };
}

export default function ExamResultsPage() {
  return (
    <AuthGate role="admin">
      {() => <ExamResultsContent />}
    </AuthGate>
  );
}

function ExamResultsContent() {
  const [section, setSection] = useState("");
  const [viewTab, setViewTab] = useState("student");

  return (
    <>
      <NavBar
        role="admin"
        backAction={section ? () => setSection("") : null}
      />

      <main style={styles.page}>
        <div style={styles.container}>
          <h1 style={styles.title}>Exam Results</h1>

          {!section && (
            <div style={styles.landingGrid}>
              <button
                type="button"
                onClick={() => setSection("add")}
                style={styles.landingCard}
              >
                <img
                  src="/add-result-icon.png"
                  alt="Add Result"
                  style={styles.landingIconImg}
                />
                <div style={styles.landingCardTitle}>
                  Add Result
                </div>
                <div style={styles.landingCardText}>
                  Enter marks for a whole grade's exam
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSection("view")}
                style={styles.landingCard}
              >
                <img
                  src="/view-results-icon.png"
                  alt="View Previous Results"
                  style={styles.landingIconImg}
                />
                <div style={styles.landingCardTitle}>
                  View Previous Results
                </div>
                <div style={styles.landingCardText}>
                  Search by student or by grade
                </div>
              </button>
            </div>
          )}

          {section && (
            <div style={{ marginBottom: 18 }} />
          )}

          {section === "add" && <AddResultPanel />}

          {section === "view" && (
            <>
              <div style={styles.tabs}>
                <button
                  type="button"
                  onClick={() => setViewTab("student")}
                  style={{
                    ...styles.tab,
                    ...(viewTab === "student"
                      ? styles.activeTab
                      : {}),
                  }}
                >
                  Search Student
                </button>

                <button
                  type="button"
                  onClick={() => setViewTab("class")}
                  style={{
                    ...styles.tab,
                    ...(viewTab === "class"
                      ? styles.activeTab
                      : {}),
                  }}
                >
                  Search Class
                </button>
              </div>

              {viewTab === "student" ? (
                <StudentResultsSearch />
              ) : (
                <ClassResultsSearch />
              )}
            </>
          )}
        </div>
      </main>
    </>
  );
}

/* =========================================================
   ADD RESULT
========================================================= */

function AddResultPanel() {
  const [grade, setGrade] = useState("");
  const [searched, setSearched] = useState(false);

  const [year, setYear] = useState("");
  const [month, setMonth] = useState("");
  const [examName, setExamName] = useState("");

  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [marksByStudent, setMarksByStudent] = useState({});

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function runSearch() {
    setError("");
    setMessage("");

    if (!grade) {
      setError("Please select Grade / Class.");
      return;
    }

    setSearched(true);
    setStudents([]);
    setMarksByStudent({});
  }

  useEffect(() => {
    if (!searched || !grade || !year || !month) return;

    loadRoster();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searched, grade, year, month]);

  async function loadRoster() {
    setLoadingStudents(true);
    setError("");

    try {
      const token = await auth.currentUser?.getIdToken();

      if (!token) {
        throw new Error("Admin session expired. Please login again.");
      }

      const params = new URLSearchParams();
      params.set("className", grade);

      const response = await fetch(
        `/api/admin/exam-results/students?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load students.");
      }

      setStudents(data.students || []);

      if (!examName) {
        setExamName(`${month} ${year} Test`);
      }
    } catch (err) {
      setError(err.message || "Failed to load students.");
    } finally {
      setLoadingStudents(false);
    }
  }

  function updateMark(studentId, value) {
    setMarksByStudent((current) => ({
      ...current,
      [studentId]: value,
    }));
  }

  async function save() {
    setSaving(true);
    setError("");
    setMessage("");

    try {
      if (!year || !month) {
        throw new Error("Select Exam Year and Exam Month.");
      }

      if (!examName.trim()) {
        throw new Error("Enter an exam name.");
      }

      const entries = students
        .map((student) => ({
          studentId: student.id,
          marks: marksByStudent[student.id] ?? "",
        }))
        .filter((entry) => entry.marks !== "");

      if (!entries.length) {
        throw new Error("Enter marks for at least one student.");
      }

      const { day, dateString } = buildExamDate(year, month);

      const token = await auth.currentUser?.getIdToken();

      const response = await fetch("/api/admin/exam-results/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          className: grade,
          examName: examName.trim(),
          examYear: Number(year),
          examMonth: month,
          examDay: day,
          examDate: dateString,
          entries,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to save results.");
      }

      setMessage(`Saved marks for ${result.count} student(s).`);
      setMarksByStudent({});
    } catch (err) {
      setError(err.message || "Failed to save results.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section style={styles.card}>
      <h2 style={styles.sectionTitle}>Add Exam Result</h2>

      {error && <div style={styles.error}>{error}</div>}
      {message && <div style={styles.success}>{message}</div>}

      {/* STEP 1: CLASS + SEARCH */}
      <div style={styles.searchGrid}>
        <label style={styles.label}>
          Grade / Class

          <select
            value={grade}
            onChange={(e) => {
              setGrade(e.target.value);
              setSearched(false);
              setStudents([]);
              setYear("");
              setMonth("");
              setExamName("");
            }}
            style={styles.input}
          >
            <option value="">Select Grade</option>
            {GRADES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={runSearch}
          style={styles.primaryButton}
        >
          Search
        </button>
      </div>

      {/* STEP 2: YEAR + MONTH (appears after Search) */}
      {searched && (
        <div style={{ ...styles.searchGrid, marginTop: 18 }}>
          <label style={styles.label}>
            Exam Year

            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              style={styles.input}
            >
              <option value="">Select Year</option>
              {getYears().map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label style={styles.label}>
            Exam Month

            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              style={styles.input}
            >
              <option value="">Select Month</option>
              {MONTHS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label style={styles.label}>
            Exam Name

            <input
              type="text"
              value={examName}
              onChange={(e) => setExamName(e.target.value)}
              placeholder="e.g. Monthly Test"
              style={styles.input}
            />
          </label>
        </div>
      )}

      {/* STEP 3: STUDENT TABLE (appears once year + month set) */}
      {searched && year && month && (
        <div style={{ marginTop: 22 }}>
          {loadingStudents && (
            <div style={styles.loading}>Loading students...</div>
          )}

          {!loadingStudents && students.length > 0 && (
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Student Name</th>
                    <th style={styles.th}>Student ID</th>
                    <th style={styles.th}>Marks</th>
                  </tr>
                </thead>

                <tbody>
                  {students.map((student) => (
                    <tr key={student.id}>
                      <td style={styles.td}>
                        {student.fullName || "-"}
                      </td>
                      <td style={styles.td}>
                        {student.studentCode || "-"}
                      </td>
                      <td style={styles.td}>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={marksByStudent[student.id] ?? ""}
                          onChange={(e) =>
                            updateMark(student.id, e.target.value)
                          }
                          placeholder="-"
                          style={{ ...styles.input, maxWidth: 100 }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loadingStudents && !students.length && (
            <div style={styles.empty}>
              No active students found in this grade.
            </div>
          )}

          {/* STEP 4: SAVE */}
          {!loadingStudents && students.length > 0 && (
            <button
              type="button"
              onClick={save}
              disabled={saving}
              style={{ ...styles.primaryButton, marginTop: 18 }}
            >
              {saving ? "Saving..." : "Save"}
            </button>
          )}
        </div>
      )}
    </section>
  );
}

/* =========================================================
   STUDENT SEARCH
========================================================= */

function StudentResultsSearch() {
  const [studentId, setStudentId] = useState("");
  const [studentName, setStudentName] = useState("");

  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);

  const [allResults, setAllResults] = useState([]);
  const [year, setYear] = useState("");

  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingResults, setLoadingResults] = useState(false);

  const [error, setError] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      searchStudents();
    }, 350);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId, studentName]);

  async function searchStudents() {
    const idValue = studentId.trim();
    const nameValue = studentName.trim();

    if (!idValue && !nameValue) {
      setStudents([]);
      return;
    }

    if (
      selectedStudent &&
      idValue === selectedStudent.studentCode &&
      nameValue === selectedStudent.fullName
    ) {
      return;
    }

    setLoadingStudents(true);
    setError("");

    try {
      const token = await auth.currentUser?.getIdToken();

      if (!token) {
        throw new Error("Admin session expired. Please login again.");
      }

      const params = new URLSearchParams();
      if (idValue) params.set("studentId", idValue);
      if (nameValue) params.set("studentName", nameValue);

      const response = await fetch(
        `/api/admin/exam-results/search-students?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to search students.");
      }

      setStudents(data.students || []);
    } catch (err) {
      setError(err.message || "Failed to search students.");
    } finally {
      setLoadingStudents(false);
    }
  }

  async function selectStudent(student) {
    setSelectedStudent(student);
    setStudentId(student.studentCode || "");
    setStudentName(student.fullName || "");
    setStudents([]);
    setYear("");
    setAllResults([]);

    await loadStudentResults(student.id);
  }

  async function loadStudentResults(studentUid) {
    setLoadingResults(true);
    setError("");

    try {
      const token = await auth.currentUser?.getIdToken();

      if (!token) {
        throw new Error("Admin session expired.");
      }

      const params = new URLSearchParams();
      params.set("studentUid", studentUid);
      params.set("mode", "student");

      const response = await fetch(
        `/api/admin/exam-results/search?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load results.");
      }

      setAllResults(data.results || []);
    } catch (err) {
      setError(err.message || "Failed to load student results.");
      setAllResults([]);
    } finally {
      setLoadingResults(false);
    }
  }

  function clearStudentSearch() {
    setStudentId("");
    setStudentName("");
    setStudents([]);
    setSelectedStudent(null);
    setAllResults([]);
    setYear("");
    setError("");
  }

  function handleResultUpdated(resultId, newMarks) {
    setAllResults((current) =>
      current.map((row) =>
        row.id === resultId ? { ...row, marks: newMarks } : row
      )
    );
  }

  // Years that this student actually has results in, for the dropdown.
  const availableYears = [
    ...new Set(
      allResults.map((row) => row.examYear).filter(Boolean)
    ),
  ].sort((a, b) => b - a);

  const yearResults = year
    ? allResults.filter((row) => String(row.examYear) === String(year))
    : [];

  return (
    <section style={styles.card}>
      <h2 style={styles.sectionTitle}>Search Student Results</h2>

      <p style={styles.description}>
        Student ID or student name use karala student kenek select
        karanna. Ita passe Exam Year eka select karanna, e year eke
        okkoma results pennanawa.
      </p>

      {error && <div style={styles.error}>{error}</div>}

      <div style={styles.searchGrid}>
        <label style={styles.label}>
          Student ID
          <input
            type="text"
            value={studentId}
            onChange={(e) => {
              setStudentId(e.target.value);
              setSelectedStudent(null);
              setAllResults([]);
              setYear("");
            }}
            placeholder="Example: ST-5C0VR"
            style={styles.input}
          />
        </label>

        <label style={styles.label}>
          Student Name
          <input
            type="text"
            value={studentName}
            onChange={(e) => {
              setStudentName(e.target.value);
              setSelectedStudent(null);
              setAllResults([]);
              setYear("");
            }}
            placeholder="Type student name"
            style={styles.input}
          />
        </label>

        <button
          type="button"
          onClick={clearStudentSearch}
          style={styles.clearButton}
        >
          Clear
        </button>
      </div>

      {loadingStudents && (
        <div style={styles.loading}>Searching students...</div>
      )}

      {students.length > 0 && (
        <div style={styles.studentDropdown}>
          {students.map((student) => (
            <button
              key={student.id}
              type="button"
              onClick={() => selectStudent(student)}
              style={styles.studentOption}
            >
              <div>
                <strong>{student.fullName || "-"}</strong>
                <div style={styles.optionSub}>
                  ID: {student.studentCode || "-"} •{" "}
                  {student.className || "-"}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {selectedStudent && (
        <div style={styles.selectedStudent}>
          <span style={styles.selectedLabel}>Selected Student</span>
          <h3 style={styles.studentTitle}>
            {selectedStudent.fullName}
          </h3>
          <div style={styles.studentInfo}>
            <span>
              Student ID: <strong>{selectedStudent.studentCode}</strong>
            </span>
            <span>
              Class: <strong>{selectedStudent.className}</strong>
            </span>
            <span>
              Phone: <strong>{selectedStudent.phone || "-"}</strong>
            </span>
          </div>
        </div>
      )}

      {loadingResults && (
        <div style={styles.loading}>Loading exam results...</div>
      )}

      {/* YEAR SELECTOR appears once a student is selected */}
      {selectedStudent && !loadingResults && (
        <div style={{ ...styles.searchGrid, marginTop: 18 }}>
          <label style={styles.label}>
            Exam Year

            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              style={styles.input}
            >
              <option value="">Select Year</option>
              {availableYears.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {selectedStudent && year && !loadingResults && (
        <>
          <div style={styles.resultHeader}>
            <div>
              <h3 style={{ margin: 0 }}>
                {selectedStudent.fullName} — {year}
              </h3>
              <span style={styles.subText}>
                {yearResults.length} result
                {yearResults.length !== 1 ? "s" : ""}
              </span>
            </div>

            {yearResults.length > 0 && (
              <button
                type="button"
                onClick={() =>
                  downloadStudentPdf(selectedStudent, yearResults)
                }
                style={styles.pdfButton}
              >
                Download PDF
              </button>
            )}
          </div>

          {yearResults.length > 0 ? (
            <ResultsTable
              results={yearResults}
              showClassColumns={false}
              onUpdated={handleResultUpdated}
            />
          ) : (
            <div style={styles.empty}>
              No exam results found for this student in {year}.
            </div>
          )}
        </>
      )}
    </section>
  );
}

/* =========================================================
   CLASS SEARCH
========================================================= */

function ClassResultsSearch() {
  const [grade, setGrade] = useState("");
  const [year, setYear] = useState("");
  const [month, setMonth] = useState("");

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function searchClassResults() {
    setError("");
    setResults([]);

    if (!grade) {
      setError("Please select Grade / Class.");
      return;
    }
    if (!year) {
      setError("Please select Exam Year.");
      return;
    }
    if (!month) {
      setError("Please select Exam Month.");
      return;
    }

    setLoading(true);

    try {
      const token = await auth.currentUser?.getIdToken();

      if (!token) {
        throw new Error("Admin session expired.");
      }

      const params = new URLSearchParams();
      params.set("mode", "class");
      params.set("className", grade);
      params.set("examYear", year);
      params.set("examMonth", month);

      const response = await fetch(
        `/api/admin/exam-results/search?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to search class results.");
      }

      setResults(data.results || []);
    } catch (err) {
      setError(err.message || "Failed to search class results.");
    } finally {
      setLoading(false);
    }
  }

  function handleResultUpdated(resultId, newMarks) {
    setResults((current) =>
      current.map((row) =>
        row.id === resultId ? { ...row, marks: newMarks } : row
      )
    );
  }

  return (
    <section style={styles.card}>
      <h2 style={styles.sectionTitle}>Search Class Results</h2>

      <p style={styles.description}>
        Grade → Year → Month select karala e period ekata adala
        class eke exam results okkoma balanna.
      </p>

      {error && <div style={styles.error}>{error}</div>}

      <div style={styles.classSearchGrid}>
        <label style={styles.label}>
          Grade / Class

          <select
            value={grade}
            onChange={(e) => {
              setGrade(e.target.value);
              setResults([]);
            }}
            style={styles.input}
          >
            <option value="">Select Grade</option>
            {GRADES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label style={styles.label}>
          Exam Year

          <select
            value={year}
            onChange={(e) => {
              setYear(e.target.value);
              setResults([]);
            }}
            style={styles.input}
          >
            <option value="">Select Year</option>
            {getYears().map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label style={styles.label}>
          Exam Month

          <select
            value={month}
            onChange={(e) => {
              setMonth(e.target.value);
              setResults([]);
            }}
            style={styles.input}
          >
            <option value="">Select Month</option>
            {MONTHS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={searchClassResults}
          disabled={loading}
          style={styles.primaryButton}
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </div>

      {results.length > 0 && (
        <>
          <div style={styles.resultHeader}>
            <div>
              <h3 style={{ margin: 0 }}>
                {grade} - {month} {year}
              </h3>
              <span style={styles.subText}>
                {results.length} result
                {results.length !== 1 ? "s" : ""}
              </span>
            </div>

            <button
              type="button"
              onClick={() =>
                downloadClassPdf(grade, year, month, results)
              }
              style={styles.pdfButton}
            >
              Download PDF
            </button>
          </div>

          <ResultsTable
            results={results}
            showClassColumns
            onUpdated={handleResultUpdated}
          />
        </>
      )}

      {!loading && grade && year && month && results.length === 0 && (
        <div style={styles.empty}>
          No exam results found for {grade} - {month} {year}.
        </div>
      )}
    </section>
  );
}

/* =========================================================
   RESULTS TABLE (with inline edit)
========================================================= */

function ResultsTable({ results, showClassColumns = true, onUpdated }) {
  const [editingId, setEditingId] = useState("");
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [rowError, setRowError] = useState("");

  function startEdit(row) {
    setEditingId(row.id);
    setEditValue(String(row.marks ?? ""));
    setRowError("");
  }

  function cancelEdit() {
    setEditingId("");
    setEditValue("");
    setRowError("");
  }

  async function saveEdit(resultId) {
    setSaving(true);
    setRowError("");

    try {
      const token = await auth.currentUser?.getIdToken();

      const response = await fetch("/api/admin/exam-results/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ resultId, marks: editValue }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update marks.");
      }

      onUpdated?.(resultId, data.marks);
      setEditingId("");
      setEditValue("");
    } catch (err) {
      setRowError(err.message || "Failed to update marks.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={styles.tableWrapper}>
      <table style={styles.table}>
        <thead>
          <tr>
            {showClassColumns && (
              <>
                <th style={styles.th}>Student ID</th>
                <th style={styles.th}>Name</th>
                <th style={styles.th}>Phone</th>
                <th style={styles.th}>Class</th>
              </>
            )}
            <th style={styles.th}>Exam</th>
            <th style={styles.th}>Marks</th>
            <th style={styles.th}>Exam Date</th>
            <th style={styles.th}></th>
          </tr>
        </thead>

        <tbody>
          {results.map((item) => (
            <tr key={item.id}>
              {showClassColumns && (
                <>
                  <td style={styles.td}>{item.studentCode || "-"}</td>
                  <td style={styles.td}>{item.fullName || "-"}</td>
                  <td style={styles.td}>{item.phone || "-"}</td>
                  <td style={styles.td}>{item.className || "-"}</td>
                </>
              )}

              <td style={styles.td}>{item.examName || "-"}</td>

              <td style={{ ...styles.td, fontWeight: 800 }}>
                {editingId === item.id ? (
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    style={{ ...styles.input, maxWidth: 90 }}
                    autoFocus
                  />
                ) : (
                  item.marks ?? "-"
                )}
              </td>

              <td style={styles.td}>{item.examDate || "-"}</td>

              <td style={styles.td}>
                {editingId === item.id ? (
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      type="button"
                      onClick={() => saveEdit(item.id)}
                      disabled={saving}
                      style={styles.iconButtonGood}
                      title="Save"
                    >
                      ✓
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      disabled={saving}
                      style={styles.iconButtonBad}
                      title="Cancel"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => startEdit(item)}
                    style={styles.iconButton}
                    title="Edit marks"
                  >
                    ✏️
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {rowError && <div style={styles.error}>{rowError}</div>}
    </div>
  );
}

/* =========================================================
   PDF
========================================================= */

async function downloadStudentPdf(student, results) {
  try {
    const { jsPDF } = await import("jspdf");
    const autoTableModule = await import("jspdf-autotable");
    const autoTable = autoTableModule.default || autoTableModule.autoTable;

    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Student Exam Results", 14, 18);
    doc.setFontSize(10);
    doc.text(`Student: ${student.fullName}`, 14, 26);
    doc.text(`Student ID: ${student.studentCode}`, 14, 32);
    doc.text(`Class: ${student.className}`, 14, 38);

    autoTable(doc, {
      startY: 45,
      head: [["Exam", "Year", "Month", "Marks", "Exam Date"]],
      body: results.map((item) => [
        item.examName || "-",
        item.examYear || "-",
        item.examMonth || "-",
        String(item.marks ?? "-"),
        item.examDate || "-",
      ]),
    });

    doc.save(`${student.studentCode}-exam-results.pdf`);
  } catch (error) {
    console.error("PDF ERROR:", error);
  }
}

async function downloadClassPdf(grade, year, month, results) {
  try {
    const { jsPDF } = await import("jspdf");
    const autoTableModule = await import("jspdf-autotable");
    const autoTable = autoTableModule.default || autoTableModule.autoTable;

    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`${grade} Exam Results`, 14, 18);
    doc.setFontSize(10);
    doc.text(`${month} ${year}`, 14, 26);

    autoTable(doc, {
      startY: 32,
      head: [["Student ID", "Name", "Phone", "Exam", "Marks", "Exam Date"]],
      body: results.map((item) => [
        item.studentCode || "-",
        item.fullName || "-",
        item.phone || "-",
        item.examName || "-",
        String(item.marks ?? "-"),
        item.examDate || "-",
      ]),
    });

    doc.save(
      `${grade}-${month}-${year}-results.pdf`.replace(/\s+/g, "-")
    );
  } catch (error) {
    console.error("PDF ERROR:", error);
  }
}

/* =========================================================
   STYLES
========================================================= */

const styles = {
  page: {
    minHeight: "100vh",
    padding: "30px 20px 60px",
    background: "#f5f7fb",
  },
  container: { maxWidth: 1250, margin: "0 auto" },
  title: { fontSize: 30, fontWeight: 800, marginBottom: 20 },

  landingGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 18,
  },
  landingCard: {
    background: "#fff",
    borderRadius: 14,
    padding: 24,
    boxShadow: "0 4px 18px rgba(0,0,0,0.06)",
    border: "1px solid #e5e7eb",
    cursor: "pointer",
    textAlign: "left",
  },
  landingIcon: { fontSize: 30, marginBottom: 8 },
  landingIconImg: {
    width: 44,
    height: 44,
    objectFit: "contain",
    marginBottom: 10,
  },
  landingCardTitle: { fontSize: 18, fontWeight: 800, marginBottom: 4 },
  landingCardText: { color: "#6b7280", fontSize: 13 },

  backButton: {
    border: "1px solid #d1d5db",
    background: "#fff",
    color: "#111827",
    padding: "9px 16px",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: 700,
    marginBottom: 18,
  },

  tabs: { display: "flex", gap: 10, marginBottom: 20 },
  tab: {
    padding: "12px 20px",
    borderRadius: 8,
    border: "1px solid #d1d5db",
    background: "#fff",
    cursor: "pointer",
    fontWeight: 700,
  },
  activeTab: {
    background: "#111827",
    color: "#fff",
    borderColor: "#111827",
  },

  card: {
    background: "#fff",
    borderRadius: 14,
    padding: 24,
    boxShadow: "0 4px 18px rgba(0,0,0,0.06)",
  },
  sectionTitle: { marginTop: 0, marginBottom: 8, fontSize: 22 },
  description: {
    color: "#6b7280",
    marginTop: 0,
    marginBottom: 22,
    lineHeight: 1.6,
  },

  searchGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 16,
    alignItems: "end",
  },
  classSearchGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: 16,
    alignItems: "end",
  },

  label: {
    display: "flex",
    flexDirection: "column",
    gap: 7,
    fontWeight: 700,
    fontSize: 14,
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "11px 12px",
    borderRadius: 8,
    border: "1px solid #d1d5db",
    background: "#fff",
    fontSize: 14,
  },
  primaryButton: {
    border: "none",
    background: "#111827",
    color: "#fff",
    padding: "11px 18px",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: 700,
  },
  clearButton: {
    border: "1px solid #d1d5db",
    background: "#fff",
    color: "#111827",
    padding: "11px 18px",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: 700,
  },

  studentDropdown: {
    marginTop: 8,
    border: "1px solid #d1d5db",
    borderRadius: 10,
    overflow: "hidden",
    maxWidth: 650,
  },
  studentOption: {
    width: "100%",
    border: "none",
    borderBottom: "1px solid #e5e7eb",
    background: "#fff",
    padding: "14px 16px",
    textAlign: "left",
    cursor: "pointer",
  },
  optionSub: { color: "#6b7280", fontSize: 13, marginTop: 4 },

  selectedStudent: {
    marginTop: 22,
    padding: 18,
    borderRadius: 10,
    background: "#eff6ff",
    border: "1px solid #bfdbfe",
  },
  selectedLabel: { color: "#1d4ed8", fontSize: 12, fontWeight: 700 },
  studentTitle: { margin: "4px 0 10px", fontSize: 20 },
  studentInfo: {
    display: "flex",
    flexWrap: "wrap",
    gap: 18,
    color: "#374151",
    fontSize: 14,
  },

  resultHeader: {
    marginTop: 28,
    marginBottom: 10,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 15,
  },
  subText: {
    display: "block",
    marginTop: 4,
    color: "#6b7280",
    fontSize: 13,
  },

  tableWrapper: { width: "100%", overflowX: "auto", marginTop: 12 },
  table: { width: "100%", borderCollapse: "collapse", minWidth: 900 },
  th: {
    textAlign: "left",
    padding: 12,
    background: "#f9fafb",
    borderBottom: "2px solid #e5e7eb",
    fontSize: 13,
  },
  td: { padding: 12, borderBottom: "1px solid #e5e7eb", fontSize: 14 },

  iconButton: {
    border: "1px solid #d1d5db",
    background: "#fff",
    borderRadius: 6,
    padding: "4px 8px",
    cursor: "pointer",
  },
  iconButtonGood: {
    border: "none",
    background: "#14804a",
    color: "#fff",
    borderRadius: 6,
    padding: "4px 10px",
    cursor: "pointer",
    fontWeight: 800,
  },
  iconButtonBad: {
    border: "none",
    background: "#d63b3b",
    color: "#fff",
    borderRadius: 6,
    padding: "4px 10px",
    cursor: "pointer",
    fontWeight: 800,
  },

  pdfButton: {
    border: "none",
    background: "#dc2626",
    color: "#fff",
    padding: "10px 16px",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: 700,
  },

  loading: {
    marginTop: 18,
    padding: 14,
    background: "#f3f4f6",
    borderRadius: 8,
    color: "#374151",
  },
  error: {
    marginBottom: 18,
    padding: 12,
    borderRadius: 8,
    background: "#fee2e2",
    color: "#991b1b",
  },
  success: {
    marginBottom: 18,
    padding: 12,
    borderRadius: 8,
    background: "#d1fae5",
    color: "#065f46",
  },
  empty: {
    marginTop: 20,
    padding: 25,
    textAlign: "center",
    borderRadius: 10,
    background: "#f9fafb",
    color: "#6b7280",
  },
};
