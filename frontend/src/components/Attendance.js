import React, { useState } from 'react';
import axios from 'axios';

const DEPARTMENTS = [
  { code: '114', name: 'MECH' },
  { code: '103', name: 'CIVIL' },
  { code: '105', name: 'EEE' },
  { code: '106', name: 'ECE' },
  { code: '243', name: 'AI&DS' },
  { code: '104', name: 'CSE' }
];

function Attendance() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [session, setSession] = useState('FN');
  const [deptCode, setDeptCode] = useState('103'); // timetable sample is for 103

  const [exams, setExams] = useState([]);
  const [studentsMap, setStudentsMap] = useState({}); // courseCode -> students
  const [selectedPresent, setSelectedPresent] = useState({}); // courseCode -> { regNo: true }

  const [error, setError] = useState('');

  const loadExams = async () => {
    setError('');
    setExams([]);
    try {
      const res = await axios.get('http://localhost:5000/api/exams', {
        params: { date, session, deptCode }
      });
      if (res.data.success) {
        setExams(res.data.exams);
        // Demo: pull a batch for the dept to list students (choose a batch that exists in DB)
        const studentRes = await axios.get(`http://localhost:5000/api/students/2023-2026/${deptCode}`);
        const list = studentRes.data.list || [];
        const map = {};
        const presentMap = {};
        res.data.exams.forEach(ex => {
          map[ex.courseCode] = list;
          presentMap[ex.courseCode] = {};
          list.forEach(s => { presentMap[ex.courseCode][s.regNo] = true; });
        });
        setStudentsMap(map);
        setSelectedPresent(presentMap);
      } else {
        setError(res.data.message || 'No exams found.');
      }
    } catch (e) {
      setError(e.message);
    }
  };

  const toggleAll = (courseCode, checked) => {
    setSelectedPresent(prev => {
      const updated = { ...prev };
      Object.keys(updated[courseCode]).forEach(regNo => {
        updated[courseCode][regNo] = checked;
      });
      return updated;
    });
  };

  const toggleOne = (courseCode, regNo) => {
    setSelectedPresent(prev => ({
      ...prev,
      [courseCode]: { ...prev[courseCode], [regNo]: !prev[courseCode][regNo] }
    }));
  };

  const submitAttendance = async (exam) => {
    const presentList = Object.entries(selectedPresent[exam.courseCode] || {})
      .filter(([_, v]) => v)
      .map(([regNo]) => regNo);

    try {
      const res = await axios.post('http://localhost:5000/api/attendance', {
        examDetails: {
          date,
          session,
          courseCode: exam.courseCode,
          semester: exam.semester,
          deptCode,
          regulation: exam.regulation
        },
        attendanceList: presentList
      });
      alert(res.data.success ? `Attendance submitted for ${exam.courseCode}` : `Failed: ${res.data.message}`);
    } catch (e) {
      alert(`Error submitting attendance: ${e.message}`);
    }
  };

  return (
    <div>
      <h3 className="section-title">Attendance Entry</h3>
      <div className="card">
        <div className="dropdown-group">
          <input type="date" value={date} onChange={e => setDate(e.target.value)} />
          <select value={session} onChange={e => setSession(e.target.value)}>
            <option value="FN">FN - Forenoon</option>
            <option value="AN">AN - Afternoon</option>
          </select>
          <select value={deptCode} onChange={e => setDeptCode(e.target.value)}>
            <option value="">Select Department</option>
            {DEPARTMENTS.map(d => <option key={d.code} value={d.code}>{d.code} - {d.name}</option>)}
          </select>
          <button className="btn" onClick={loadExams}>Load Exam & Students</button>
        </div>

        {error && <p className="error-message">{error}</p>}

        {exams.length > 0 && (
          <>
            <h4>Exams Scheduled: {exams.length}</h4>
            {exams.map(exam => (
              <div key={exam.courseCode} className="card" style={{ marginTop: 10 }}>
                <h5>{exam.courseCode} - {exam.courseName} (Sem {exam.semester}, Reg {exam.regulation})</h5>
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>S. No.</th>
                        <th>Reg No</th>
                        <th>Name</th>
                        <th>
                          <input
                            type="checkbox"
                            checked={Object.values(selectedPresent[exam.courseCode] || {}).every(Boolean)}
                            onChange={e => toggleAll(exam.courseCode, e.target.checked)}
                          /> Present
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {(studentsMap[exam.courseCode] || []).map((s, i) => (
                        <tr key={`${exam.courseCode}-${s.regNo}`}>
                          <td>{i + 1}</td>
                          <td>{s.regNo}</td>
                          <td>{s.name}</td>
                          <td>
                            <input
                              type="checkbox"
                              checked={!!(selectedPresent[exam.courseCode] || {})[s.regNo]}
                              onChange={() => toggleOne(exam.courseCode, s.regNo)}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button className="btn payment-gateway-btn" style={{ marginTop: 15 }} onClick={() => submitAttendance(exam)}>
                  Submit Attendance
                </button>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

export default Attendance;
