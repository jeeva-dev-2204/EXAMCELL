import React, { useState } from 'react';
import axios from 'axios';

const DEFAULT_BATCHES = ['2025-2028', '2024-2027', '2023-2026', '2022-2025'];
const DEPARTMENTS = [
  { code: '114', name: 'MECH' },
  { code: '103', name: 'CIVIL' },
  { code: '105', name: 'EEE' },
  { code: '106', name: 'ECE' },
  { code: '243', name: 'AI&DS' },
  { code: '104', name: 'CSE' }
];

function StudentDetails() {
  const [batch, setBatch] = useState('');
  const [deptCode, setDeptCode] = useState('');
  const [students, setStudents] = useState([]);
  const [error, setError] = useState('');

  const fetchStudents = async () => {
    setError('');
    setStudents([]);
    if (!batch || !deptCode) {
      setError('Please select both Batch and Department.');
      return;
    }
    try {
      const res = await axios.get(`http://localhost:5000/api/students/${batch}/${deptCode}`);
      if (res.data.success && res.data.list?.length) {
        setStudents(res.data.list);
      } else {
        setError(res.data.message || 'No students found.');
      }
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div>
      <h3 className="section-title">Student Details</h3>
      <div className="card">
        <div className="dropdown-group">
          <select value={batch} onChange={e => setBatch(e.target.value)}>
            <option value="">Select Batch (Year)</option>
            {DEFAULT_BATCHES.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          <select value={deptCode} onChange={e => setDeptCode(e.target.value)}>
            <option value="">Select Department</option>
            {DEPARTMENTS.map(d => <option key={d.code} value={d.code}>{d.code} - {d.name}</option>)}
          </select>
          <button className="btn" onClick={fetchStudents}>Load Students</button>
        </div>

        {error && <p className="error-message">{error}</p>}

        {students.length > 0 && (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr><th>S. No.</th><th>Reg No</th><th>Student Name</th></tr>
              </thead>
              <tbody>
                {students.map((s, i) => (
                  <tr key={s.regNo}>
                    <td>{i + 1}</td>
                    <td>{s.regNo}</td>
                    <td>{s.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default StudentDetails;
