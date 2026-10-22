/* CampusOne — demo data
   Everything is stored in localStorage; no backend required. */

window.CURRENT_SEMESTER = 'Fall 2026';
window.MAX_CREDITS = 120;
window.GRADE_POINTS = { 'A+': 4.0, 'A': 4.0, 'A-': 3.7, 'B+': 3.3, 'B': 3.0, 'B-': 2.7, 'C+': 2.3, 'C': 2.0, 'C-': 1.7, 'D': 1.0, 'F': 0 };
window.GRADE_ORDER = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D', 'F'];

window.SEED_DB = {
  users: [
    {
      id: 'u-admin', role: 'admin', name: 'Dr. Maya Chen', email: 'admin@campus.edu',
      password: 'admin123', title: 'University Registrar', color: '#0f766e',
      phone: '(555) 010-2000', address: 'Admin Building, Room 210'
    },
    {
      id: 'u1', role: 'student', name: 'Alex Morgan', email: 'alex@campus.edu',
      password: 'student123', studentId: 'S-2024-001', program: 'BSc Computer Science',
      year: 3, advisor: 'Prof. Daniel Reed', color: '#4f46e5',
      phone: '(555) 010-1188', address: '42 Maple Street, Brookfield'
    },
    {
      id: 'u2', role: 'student', name: 'Priya Sharma', email: 'priya@campus.edu',
      password: 'student123', studentId: 'S-2025-014', program: 'BSc Data Science',
      year: 2, advisor: 'Prof. Elena Rossi', color: '#0284c7',
      phone: '(555) 010-2231', address: '8 Lakeview Court, Brookfield'
    },
    {
      id: 'u3', role: 'student', name: 'Jordan Lee', email: 'jordan@campus.edu',
      password: 'student123', studentId: 'S-2023-006', program: 'BSc Computer Science',
      year: 4, advisor: 'Prof. Daniel Reed', color: '#059669',
      phone: '(555) 010-3345', address: '115 Birch Avenue, Riverton'
    },
    {
      id: 'u4', role: 'student', name: 'Sofia Alvarez', email: 'sofia@campus.edu',
      password: 'student123', studentId: 'S-2026-021', program: 'BSc Business Analytics',
      year: 1, advisor: 'Dr. Omar Haddad', color: '#d97706',
      phone: '(555) 010-4457', address: '21 Cedar Lane, Brookfield'
    },
    {
      id: 'u5', role: 'student', name: 'Noah Williams', email: 'noah@campus.edu',
      password: 'student123', studentId: 'S-2024-009', program: 'BSc Information Systems',
      year: 3, advisor: 'Prof. Marcus Bell', color: '#e11d48',
      phone: '(555) 010-5568', address: '77 Harbor Road, Riverton'
    },
    {
      id: 'u6', role: 'student', name: 'Emma Brown', email: 'emma@campus.edu',
      password: 'student123', studentId: 'S-2025-017', program: 'BSc Computer Science',
      year: 2, advisor: 'Prof. Elena Rossi', color: '#7c3aed',
      phone: '(555) 010-6679', address: '5 Willow Close, Brookfield'
    }
  ],

  courses: [
    /* ---- Spring 2026 (completed) ---- */
    { id: 'c101', code: 'CS201', title: 'Data Structures & Algorithms', instructor: 'Prof. Daniel Reed', credits: 4, capacity: 40, semester: 'Spring 2026', days: ['Mon', 'Wed'], start: '09:00', end: '10:30', room: 'A-201', description: 'Arrays, lists, trees, graphs and algorithm analysis with hands-on labs.' },
    { id: 'c102', code: 'MATH201', title: 'Linear Algebra', instructor: 'Dr. Aisha Khan', credits: 3, capacity: 45, semester: 'Spring 2026', days: ['Tue', 'Thu'], start: '11:00', end: '12:30', room: 'A-112', description: 'Vectors, matrices, eigenvalues and applications to computing.' },
    { id: 'c103', code: 'ENG102', title: 'Composition & Rhetoric II', instructor: 'Prof. Laura White', credits: 3, capacity: 30, semester: 'Spring 2026', days: ['Fri'], start: '09:00', end: '11:00', room: 'H-2', description: 'Research writing, argumentation and academic presentation.' },
    { id: 'c104', code: 'CS210', title: 'Computer Architecture', instructor: 'Prof. Elena Rossi', credits: 4, capacity: 35, semester: 'Spring 2026', days: ['Tue', 'Thu'], start: '14:00', end: '15:30', room: 'A-205', description: 'Instruction sets, pipelines, memory hierarchy and assembly programming.' },
    { id: 'c105', code: 'STAT200', title: 'Probability & Statistics', instructor: 'Dr. Omar Haddad', credits: 3, capacity: 50, semester: 'Spring 2026', days: ['Mon', 'Wed'], start: '13:00', end: '14:30', room: 'B-101', description: 'Probability models, distributions, estimation and hypothesis testing.' },

    /* ---- Fall 2026 (current) ---- */
    { id: 'c1', code: 'CS301', title: 'Algorithms & Data Structures', instructor: 'Prof. Daniel Reed', credits: 4, capacity: 40, semester: 'Fall 2026', days: ['Mon', 'Wed'], start: '09:00', end: '10:30', room: 'A-201', description: 'Advanced algorithm design: graphs, dynamic programming, greedy methods and complexity.' },
    { id: 'c2', code: 'CS315', title: 'Database Systems', instructor: 'Prof. Elena Rossi', credits: 3, capacity: 38, semester: 'Fall 2026', days: ['Tue', 'Thu'], start: '11:00', end: '12:30', room: 'B-104', description: 'Relational modelling, SQL, indexing, transactions and query optimisation.' },
    { id: 'c3', code: 'CS330', title: 'Web Application Development', instructor: 'Prof. Marcus Bell', credits: 3, capacity: 30, semester: 'Fall 2026', days: ['Mon', 'Wed'], start: '13:00', end: '14:30', room: 'Lab C-12', description: 'Full-stack development with modern JavaScript, REST APIs and accessible UI design.' },
    { id: 'c4', code: 'MATH210', title: 'Discrete Mathematics', instructor: 'Dr. Aisha Khan', credits: 3, capacity: 45, semester: 'Fall 2026', days: ['Tue', 'Thu'], start: '09:00', end: '10:30', room: 'A-110', description: 'Logic, sets, combinatorics, graph theory and formal proof techniques.' },
    { id: 'c5', code: 'ENG201', title: 'Technical Writing', instructor: 'Prof. Laura White', credits: 2, capacity: 28, semester: 'Fall 2026', days: ['Fri'], start: '10:00', end: '12:00', room: 'H-3', description: 'Documentation, reports and communication for technical audiences.' },
    { id: 'c6', code: 'CS340', title: 'Operating Systems', instructor: 'Prof. Daniel Reed', credits: 4, capacity: 35, semester: 'Fall 2026', days: ['Tue', 'Thu'], start: '14:00', end: '15:30', room: 'A-205', description: 'Processes, scheduling, concurrency, memory management and file systems.' },
    { id: 'c7', code: 'BUS220', title: 'Principles of Management', instructor: 'Dr. Omar Haddad', credits: 3, capacity: 50, semester: 'Fall 2026', days: ['Wed'], start: '16:00', end: '18:00', room: 'D-101', description: 'Organisational behaviour, team leadership and strategic decision making.' },
    { id: 'c8', code: 'DS250', title: 'Intro to Machine Learning', instructor: 'Prof. Elena Rossi', credits: 3, capacity: 32, semester: 'Fall 2026', days: ['Fri'], start: '13:00', end: '15:00', room: 'Lab B-7', description: 'Supervised learning, model evaluation and responsible ML practice.' },
    { id: 'c9', code: 'PHY101', title: 'Physics for Engineers', instructor: 'Dr. Ingrid Larsen', credits: 4, capacity: 40, semester: 'Fall 2026', days: ['Mon', 'Wed'], start: '11:00', end: '12:30', room: 'S-2', description: 'Mechanics, waves and thermodynamics with engineering applications.' },
    { id: 'c10', code: 'CS410', title: 'Capstone Project', instructor: 'Prof. Marcus Bell', credits: 4, capacity: 20, semester: 'Fall 2026', days: ['Fri'], start: '15:00', end: '17:00', room: 'C-20', description: 'Team-based software project from proposal to demo, with industry mentors.' }
  ],

  enrollments: [
    { id: 'e1', studentId: 'u1', courseId: 'c101', semester: 'Spring 2026', grade: 'A' },
    { id: 'e2', studentId: 'u1', courseId: 'c102', semester: 'Spring 2026', grade: 'A-' },
    { id: 'e3', studentId: 'u1', courseId: 'c103', semester: 'Spring 2026', grade: 'B+' },
    { id: 'e4', studentId: 'u1', courseId: 'c104', semester: 'Spring 2026', grade: 'B' },
    { id: 'e5', studentId: 'u1', courseId: 'c105', semester: 'Spring 2026', grade: 'A' },
    { id: 'e6', studentId: 'u2', courseId: 'c101', semester: 'Spring 2026', grade: 'A-' },
    { id: 'e7', studentId: 'u2', courseId: 'c102', semester: 'Spring 2026', grade: 'B+' },
    { id: 'e8', studentId: 'u2', courseId: 'c103', semester: 'Spring 2026', grade: 'A' },
    { id: 'e9', studentId: 'u2', courseId: 'c104', semester: 'Spring 2026', grade: 'B+' },
    { id: 'e10', studentId: 'u2', courseId: 'c105', semester: 'Spring 2026', grade: 'A' },
    { id: 'e11', studentId: 'u3', courseId: 'c101', semester: 'Spring 2026', grade: 'A' },
    { id: 'e12', studentId: 'u3', courseId: 'c102', semester: 'Spring 2026', grade: 'A-' },
    { id: 'e13', studentId: 'u3', courseId: 'c104', semester: 'Spring 2026', grade: 'A' },
    { id: 'e14', studentId: 'u3', courseId: 'c105', semester: 'Spring 2026', grade: 'A-' },
    { id: 'e15', studentId: 'u4', courseId: 'c103', semester: 'Spring 2026', grade: 'B' },
    { id: 'e16', studentId: 'u4', courseId: 'c105', semester: 'Spring 2026', grade: 'B+' },
    { id: 'e17', studentId: 'u5', courseId: 'c101', semester: 'Spring 2026', grade: 'B+' },
    { id: 'e18', studentId: 'u5', courseId: 'c102', semester: 'Spring 2026', grade: 'B' },
    { id: 'e19', studentId: 'u5', courseId: 'c103', semester: 'Spring 2026', grade: 'A-' },
    { id: 'e20', studentId: 'u5', courseId: 'c105', semester: 'Spring 2026', grade: 'B+' },
    { id: 'e21', studentId: 'u6', courseId: 'c101', semester: 'Spring 2026', grade: 'A-' },
    { id: 'e22', studentId: 'u6', courseId: 'c102', semester: 'Spring 2026', grade: 'B+' },
    { id: 'e23', studentId: 'u6', courseId: 'c103', semester: 'Spring 2026', grade: 'B' },
    { id: 'e24', studentId: 'u6', courseId: 'c104', semester: 'Spring 2026', grade: 'B+' },

    { id: 'e25', studentId: 'u1', courseId: 'c1', semester: 'Fall 2026', grade: null },
    { id: 'e26', studentId: 'u1', courseId: 'c2', semester: 'Fall 2026', grade: null },
    { id: 'e27', studentId: 'u1', courseId: 'c3', semester: 'Fall 2026', grade: null },
    { id: 'e28', studentId: 'u1', courseId: 'c4', semester: 'Fall 2026', grade: null },
    { id: 'e29', studentId: 'u1', courseId: 'c5', semester: 'Fall 2026', grade: null },
    { id: 'e30', studentId: 'u2', courseId: 'c2', semester: 'Fall 2026', grade: null },
    { id: 'e31', studentId: 'u2', courseId: 'c4', semester: 'Fall 2026', grade: null },
    { id: 'e32', studentId: 'u2', courseId: 'c6', semester: 'Fall 2026', grade: null },
    { id: 'e33', studentId: 'u2', courseId: 'c8', semester: 'Fall 2026', grade: null },
    { id: 'e34', studentId: 'u3', courseId: 'c1', semester: 'Fall 2026', grade: null },
    { id: 'e35', studentId: 'u3', courseId: 'c6', semester: 'Fall 2026', grade: null },
    { id: 'e36', studentId: 'u3', courseId: 'c7', semester: 'Fall 2026', grade: null },
    { id: 'e37', studentId: 'u3', courseId: 'c10', semester: 'Fall 2026', grade: null },
    { id: 'e38', studentId: 'u4', courseId: 'c5', semester: 'Fall 2026', grade: null },
    { id: 'e39', studentId: 'u4', courseId: 'c7', semester: 'Fall 2026', grade: null },
    { id: 'e40', studentId: 'u4', courseId: 'c8', semester: 'Fall 2026', grade: null },
    { id: 'e41', studentId: 'u4', courseId: 'c9', semester: 'Fall 2026', grade: null },
    { id: 'e42', studentId: 'u5', courseId: 'c2', semester: 'Fall 2026', grade: null },
    { id: 'e43', studentId: 'u5', courseId: 'c3', semester: 'Fall 2026', grade: null },
    { id: 'e44', studentId: 'u5', courseId: 'c6', semester: 'Fall 2026', grade: null },
    { id: 'e45', studentId: 'u5', courseId: 'c7', semester: 'Fall 2026', grade: null },
    { id: 'e46', studentId: 'u6', courseId: 'c1', semester: 'Fall 2026', grade: null },
    { id: 'e47', studentId: 'u6', courseId: 'c3', semester: 'Fall 2026', grade: null },
    { id: 'e48', studentId: 'u6', courseId: 'c5', semester: 'Fall 2026', grade: null },
    { id: 'e49', studentId: 'u6', courseId: 'c8', semester: 'Fall 2026', grade: null }
  ],

  assignments: [
    { id: 'a1', courseId: 'c1', title: 'Problem Set 5 — Graph Algorithms', due: '2026-10-24T23:59:00', points: 100, submissions: ['u3'] },
    { id: 'a2', courseId: 'c1', title: 'Lab 6 — Shortest Paths', due: '2026-10-29T23:59:00', points: 50, submissions: [] },
    { id: 'a3', courseId: 'c1', title: 'Midterm Project Proposal', due: '2026-11-05T23:59:00', points: 100, submissions: [] },
    { id: 'a4', courseId: 'c2', title: 'ER Diagram — Campus Library', due: '2026-10-23T17:00:00', points: 100, submissions: ['u1'] },
    { id: 'a5', courseId: 'c2', title: 'SQL Lab 3 — Joins & Views', due: '2026-10-28T23:59:00', points: 50, submissions: [] },
    { id: 'a6', courseId: 'c3', title: 'REST API Milestone 2', due: '2026-10-26T23:59:00', points: 100, submissions: ['u6'] },
    { id: 'a7', courseId: 'c3', title: 'Code Review Reflection', due: '2026-10-30T23:59:00', points: 50, submissions: [] },
    { id: 'a8', courseId: 'c4', title: 'Homework 7 — Proof Techniques', due: '2026-10-25T23:59:00', points: 40, submissions: [] },
    { id: 'a9', courseId: 'c5', title: 'Technical Report Draft', due: '2026-10-27T23:59:00', points: 100, submissions: ['u4'] },
    { id: 'a10', courseId: 'c6', title: 'Process Scheduler Lab', due: '2026-10-24T23:59:00', points: 75, submissions: [] },
    { id: 'a11', courseId: 'c7', title: 'Case Study — Team Dynamics', due: '2026-10-31T23:59:00', points: 100, submissions: [] },
    { id: 'a12', courseId: 'c8', title: 'Model Evaluation Notebook', due: '2026-10-29T23:59:00', points: 100, submissions: ['u2'] },
    { id: 'a13', courseId: 'c9', title: 'Lab Report — Kinematics', due: '2026-10-23T23:59:00', points: 50, submissions: [] },
    { id: 'a14', courseId: 'c10', title: 'Capstone Sprint 3 Demo', due: '2026-11-06T17:00:00', points: 150, submissions: [] }
  ],

  announcements: [
    { id: 'an1', title: 'Spring 2027 registration opens Monday', body: 'Course registration for the Spring 2027 semester opens Monday at 8:00 AM. Check your program requirements and book an advising appointment early — popular sections fill quickly.', date: '2026-10-20T09:00:00', author: 'Registrar Office', audience: 'all' },
    { id: 'an2', title: 'Library extends hours during midterms', body: 'The main library will stay open until midnight from October 26 to November 6. Group study rooms can be booked through the campus app.', date: '2026-10-18T10:30:00', author: 'Campus Library', audience: 'all' },
    { id: 'an3', title: 'CS330 lab moved to C-14 this week', body: 'The Wednesday lab session for Web Application Development will meet in Lab C-14 instead of C-12 this week due to equipment maintenance.', date: '2026-10-21T14:00:00', author: 'Prof. Marcus Bell', audience: 'student' },
    { id: 'an4', title: 'Midterm grade entry deadline: October 30', body: 'Instructors should submit midterm progress grades by Friday, October 30 at 5:00 PM. Contact the registrar if you need an extension.', date: '2026-10-19T08:00:00', author: 'Dr. Maya Chen', audience: 'admin' },
    { id: 'an5', title: 'Campus career fair — November 12', body: 'Over 60 employers will attend this year\'s career fair in the Student Union. Bring printed resumes and check the portal for the employer list.', date: '2026-10-15T12:00:00', author: 'Career Services', audience: 'student' }
  ]
};
