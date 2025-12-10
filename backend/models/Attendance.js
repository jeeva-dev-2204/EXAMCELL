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

const SEMS = ['I','II','III','IV','V','VI','VII','VIII'];
const REGULATIONS = ['2017','2021','2025'];

// Helper function to convert Roman numerals to integers
const romanToInteger = (roman) => {
  const map = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8 };
  return map[roman.toUpperCase()] || 0;
};

// Helper function to find Department Name
const getDeptName = (code) => {
  return DEPARTMENTS.find(d => d.code === code)?.name || code;
}

function Attendance() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [session, setSession] = useState('FN');
  const [deptCode, setDeptCode] = useState('103');
  const [semester, setSemester] = useState('III'); 
  const [regulation, setRegulation] = useState('2025');
  
  const [exams, setExams] = useState([]); 
  const [selectedPresent, setSelectedPresent] = useState({}); 
  const [studentsMap, setStudentsMap] = useState({}); 

  const [error, setError] = useState('');

  const loadExams = async () => {
    setError('');
    setExams([]);
    setStudentsMap({});
    setSelectedPresent({});

    if (!deptCode || !semester || !regulation || !date || !session) {
      return setError('Please select a Date, Session, Department, Semester, and Regulation.');
    }

    try {
      // 1. Fetch Exams (Timetable)
      const res = await axios.get('http://localhost:5000/api/exams', {
        params: { date, session, deptCode, semester, regulation }
      });
      
      if (res.data.success) {
        const fetchedExams = res.data.exams;
        setExams(fetchedExams);

        if (fetchedExams.length === 0) {
           return setError('No exams found for the selected criteria.');
        }

        // ✅ FINAL FIX: Batch Calculation
        const effectiveSem = romanToInteger(semester);
        if (effectiveSem === 0) {
            return setError('Invalid Semester selected. Cannot calculate student batch.');
        }

        const yearsPassed = Math.ceil(effectiveSem / 2) - 1; 
        const examYear = new Date(date).getFullYear();
        
        // Calculate the intake year (Start Year)
        const startYear = examYear - yearsPassed;
        
        // 🟢 CRITICAL FIX: Assuming a 4-year degree batch is labeled as START_YEAR - (START_YEAR + 3)
        // E.g., 2023-2026 for a batch that graduates in 2027.
        const batchString = `${startYear}-${startYear + 3}`; 
        
        console.log(`Calculated Batch: ${batchString} for Semester ${semester} in ${examYear}.`);
        
        // 2. Load students for this dept & calculated batch
        const studentRes = await axios.get(`http://localhost:5000/api/students/${batchString}/${deptCode}`);
        const list = studentRes.data.list || [];

        if (list.length === 0) {
             return setError(`No students found for calculated Batch ${batchString} in Department ${getDeptName(deptCode)}. Double-check your database batch format.`);
        }
        
        const newStudentsMap = {};
        const newPresentMap = {};
        
        fetchedExams.forEach(ex => {
          newStudentsMap[ex.courseCode] = list; 
          
          // Initialize all students as PRESENT
          newPresentMap[ex.courseCode] = {};
          list.forEach(s => { 
            newPresentMap[ex.courseCode][s.regNo] = true; 
          });
        });
        
        setStudentsMap(newStudentsMap);
        setSelectedPresent(newPresentMap);

      } else {
        setError(res.data.message || 'No exams found.');
      }
    } catch (e) {
      setError(`Error fetching student details. Check your batch calculation (${batchString} was used) and ensure the backend API is running.`);
    }
  };

  const toggleOne = (courseCode, regNo) => {
    setSelectedPresent(prev => ({
      ...prev,
      [courseCode]: {
        ...prev[courseCode],
        [regNo]: !prev[courseCode][regNo]
      }
    }));
  };
  
  const toggleAll = (courseCode, isPresent) => {
    const allStudents = studentsMap[courseCode] || [];
    const newAttendance = {};
    allStudents.forEach(s => {
      newAttendance[s.regNo] = isPresent;
    });
    setSelectedPresent(prev => ({
      ...prev,
      [courseCode]: newAttendance
    }));
  };

  const submitAttendance = async (exam) => {
    setError('');
    const courseCode = exam.courseCode;
    const allStudents = studentsMap[courseCode] || [];
    const presentStatus = selectedPresent[courseCode] || {};
    
    const attendanceList = allStudents
      .filter(s => presentStatus[s.regNo])
      .map(s => s.regNo);
      
    const examDetails = {
      date: date,
      session: session,
      deptCode: deptCode,
      courseCode: exam.courseCode,
      courseName: exam.courseName,
      semester: exam.semester,
      regulation: exam.regulation
    };
    
    try {
      const res = await axios.post('http://localhost:5000/api/attendance', { 
        examDetails, 
        attendanceList 
      });
      
      if (res.data.success) {
        alert(`Attendance for ${exam.courseCode} submitted successfully! Record ID: ${res.data.id}`);
        setExams(prev => prev.filter(e => e.courseCode !== courseCode));
      } else {
        setError(`Submission failed for ${exam.courseCode}: ${res.data.message}`);
      }
    } catch (e) {
      setError(`Error during submission for ${exam.courseCode}: ${e.message}`);
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
          <select value={semester} onChange={e => setSemester(e.target.value)}>
            <option value="">Select Semester</option>
            {SEMS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={regulation} onChange={e => setRegulation(e.target.value)}>
            <option value="">Select Regulation</option>
            {REGULATIONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <button className="btn" onClick={loadExams}>Load Exam & Students</button>
        </div>

        {error && <p className="error-message" style={{color: 'red', fontWeight: 'bold'}}>{error}</p>}

        {/* --- Exam and Student List Rendering --- */}
        {exams.length > 0 && (
          <div className="exam-list">
            {exams.map((exam) => (
              <div key={exam.courseCode} className="card exam-card" style={{border: '1px solid #ccc', padding: '15px', margin: '10px 0'}}>
                <div className="exam-header" style={{marginBottom: '10px'}}>
                  {/* Display all fetched exam details */}
                  <p>📅 **Date/Session:** {date} / **{session}**</p>
                  <p>🏛️ **Program Code:** {deptCode} ({getDeptName(deptCode)}) | **Semester:** {exam.semester} | **Regulation:** {exam.regulation}</p>
                  <h4 style={{color: '#007bff'}}>📚 **Course:** {exam.courseCode} - {exam.courseName}</h4>
                  
                  <div className="attendance-controls" style={{marginTop: '15px'}}>
                    <button 
                      className="btn present" 
                      onClick={() => toggleAll(exam.courseCode, true)} 
                      style={{marginRight: '10px', backgroundColor: '#28a745', color: 'white', border: 'none', padding: '8px 15px', cursor: 'pointer'}}>
                      Mark All Present
                    </button>
                    <button 
                      className="btn absent" 
                      onClick={() => toggleAll(exam.courseCode, false)}
                      style={{backgroundColor: '#dc3545', color: 'white', border: 'none', padding: '8px 15px', cursor: 'pointer'}}>
                      Mark All Absent
                    </button>
                  </div>
                </div>

                <h5 style={{marginTop: '20px'}}>Student List ({studentsMap[exam.courseCode] ? studentsMap[exam.courseCode].length : 0} students):</h5>
                <ul className="student-list" style={{listStyle: 'none', padding: '0'}}>
                  {studentsMap[exam.courseCode] && studentsMap[exam.courseCode].map(student => {
                    const isPresent = selectedPresent[exam.courseCode] && selectedPresent[exam.courseCode][student.regNo];
                    return (
                      <li key={student.regNo} className={`student-item ${isPresent ? 'present' : 'absent'}`} style={{padding: '5px 0', borderBottom: '1px dotted #eee'}}>
                        <label style={{display: 'flex', alignItems: 'center'}}>
                          <input
                            type="checkbox"
                            className="checkbox"
                            checked={isPresent || false}
                            onChange={() => toggleOne(exam.courseCode, student.regNo)}
                            style={{marginRight: '10px', transform: 'scale(1.2)'}}
                          />
                          <span style={{fontWeight: isPresent ? 'bold' : 'normal', color: isPresent ? '#28a745' : '#6c757d'}}>
                            {student.regNo} - {student.name}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
                <button 
                  className="btn submit-btn" 
                  onClick={() => submitAttendance(exam)}
                  style={{marginTop: '20px', width: '100%', backgroundColor: '#007bff', color: 'white', border: 'none', padding: '10px', cursor: 'pointer'}}>
                  SUBMIT Attendance for {exam.courseCode}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Attendance;
