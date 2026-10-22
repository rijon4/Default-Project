/* CampusOne — front-end student portal
   Vanilla JS, hash routing, localStorage persistence. */
(function () {
  'use strict';

  const DB_KEY = 'campusone.db.v1';
  const SESSION_KEY = 'campusone.session.v1';
  const THEME_KEY = 'campusone.theme.v1';
  const CURRENT = window.CURRENT_SEMESTER || 'Fall 2026';
  const MAX_CREDITS = window.MAX_CREDITS || 120;
  const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (ch) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
  ));

  /* ---------- theme ---------- */
  (function initTheme() {
    let saved = null;
    try { saved = localStorage.getItem(THEME_KEY); } catch (e) { /* ignore */ }
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.dataset.theme = saved || (prefersDark ? 'dark' : 'light');
  })();

  /* ---------- state ---------- */
  let db;
  let session = null;
  const ui = { assignmentFilter: 'all', confirm: null };

  function clone(obj) { return JSON.parse(JSON.stringify(obj)); }

  function loadDB() {
    try {
      const raw = localStorage.getItem(DB_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.users)) return parsed;
      }
    } catch (e) { /* fall through to seed */ }
    const seed = clone(window.SEED_DB);
    try { localStorage.setItem(DB_KEY, JSON.stringify(seed)); } catch (e) { /* ignore */ }
    return seed;
  }

  function saveDB() {
    try { localStorage.setItem(DB_KEY, JSON.stringify(db)); }
    catch (e) { toast('Changes could not be saved in this browser.', 'error'); }
  }

  function currentUser() {
    if (!session) return null;
    return db.users.find((u) => u.id === session) || null;
  }

  /* ---------- lookups ---------- */
  const courseById = (id) => db.courses.find((c) => c.id === id);
  const userById = (id) => db.users.find((u) => u.id === id);
  const enrollmentsFor = (studentId, semester) => db.enrollments.filter(
    (e) => e.studentId === studentId && (!semester || e.semester === semester)
  );
  const courseEnrollmentCount = (courseId) => db.enrollments.filter((e) => e.courseId === courseId).length;
  const isEnrolled = (studentId, courseId) => db.enrollments.some(
    (e) => e.studentId === studentId && e.courseId === courseId
  );
  const seatsLeft = (course) => Math.max(0, course.capacity - courseEnrollmentCount(course.id));

  /* ---------- grades ---------- */
  function gpaFrom(list) {
    let points = 0;
    let credits = 0;
    list.forEach((e) => {
      const course = courseById(e.courseId);
      const gp = window.GRADE_POINTS[e.grade];
      if (!course || gp == null) return;
      points += gp * course.credits;
      credits += course.credits;
    });
    return credits ? points / credits : null;
  }

  function gradedEnrollments(studentId) {
    return db.enrollments.filter((e) => e.studentId === studentId && e.grade && window.GRADE_POINTS[e.grade] != null);
  }

  const calcGPA = (studentId) => gpaFrom(gradedEnrollments(studentId));

  function creditsEarned(studentId) {
    return db.enrollments.filter((e) => e.studentId === studentId && e.grade && window.GRADE_POINTS[e.grade] > 0)
      .reduce((sum, e) => {
        const c = courseById(e.courseId);
        return sum + (c ? c.credits : 0);
      }, 0);
  }

  function semScore(semester) {
    const parts = String(semester || '').split(' ');
    const year = Number(parts[1]) || 0;
    const season = parts[0] === 'Fall' ? 2 : parts[0] === 'Spring' ? 1 : 0;
    return year * 10 + season;
  }
  const semesterSortDesc = (a, b) => semScore(b) - semScore(a);

  /* ---------- dates & times ---------- */
  function parseDate(value) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  function dateShort(value) {
    const d = parseDate(value);
    return d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—';
  }
  function dateLong(value) {
    const d = parseDate(value);
    return d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
  }
  function timeOf(value) {
    const d = parseDate(value);
    return d ? d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '—';
  }
  const dateTime = (value) => dateShort(value) + ' · ' + timeOf(value);

  function timeLabel(value) {
    const parts = String(value || '00:00').split(':').map(Number);
    const h = parts[0] || 0;
    const m = parts[1] || 0;
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour = ((h + 11) % 12) + 1;
    return hour + ':' + String(m).padStart(2, '0') + ' ' + ampm;
  }
  const timeRange = (start, end) => timeLabel(start) + ' – ' + timeLabel(end);
  function toMinutes(value) {
    const parts = String(value || '00:00').split(':').map(Number);
    return (parts[0] || 0) * 60 + (parts[1] || 0);
  }
  function daysLabel(days) {
    const list = Array.isArray(days) ? days : [];
    if (!list.length) return 'Online';
    if (list.length === 1) return list[0];
    return list.slice(0, -1).join(', ') + ' & ' + list[list.length - 1];
  }
  function todayKey() {
    return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date().getDay()];
  }
  function greeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  }
  function dueText(assignment, studentId) {
    if (assignment.submissions.includes(studentId)) return 'Submitted';
    const diff = new Date(assignment.due).getTime() - Date.now();
    if (diff < 0) return 'Overdue';
    if (diff < 86400000) return 'Due today';
    if (diff < 172800000) return 'Due tomorrow';
    return 'Due in ' + Math.ceil(diff / 86400000) + ' days';
  }
  function statusOf(assignment, studentId) {
    if (assignment.submissions.includes(studentId)) return { key: 'submitted', label: 'Submitted', tone: 'success' };
    if (new Date(assignment.due).getTime() < Date.now()) return { key: 'overdue', label: 'Overdue', tone: 'danger' };
    return { key: 'pending', label: 'Pending', tone: 'warning' };
  }
  const semesterOf = (enrollment) => enrollment.semester || (courseById(enrollment.courseId) || {}).semester || '—';
  const gradeTone = (grade) => grade ? grade.charAt(0).toLowerCase() : 'none';

  /* ---------- assignments & announcements ---------- */
  function studentCourseIds(studentId) {
    return enrollmentsFor(studentId, CURRENT).map((e) => e.courseId);
  }
  function studentAssignments(studentId) {
    const ids = studentCourseIds(studentId);
    return db.assignments.filter((a) => ids.includes(a.courseId))
      .sort((a, b) => new Date(a.due) - new Date(b.due));
  }
  function pendingAssignments(studentId) {
    return studentAssignments(studentId).filter((a) => !a.submissions.includes(studentId));
  }
  function visibleAnnouncements(user) {
    return db.announcements.filter((a) => a.audience === 'all' || a.audience === user.role)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  /* ---------- misc ---------- */
  function initials(name) {
    return String(name || '?').trim().split(/\s+/).slice(0, 2).map((p) => p.charAt(0).toUpperCase()).join('');
  }
  const firstName = (name) => String(name || '').trim().split(/\s+/)[0] || '';
  function uid(prefix) { return prefix + Math.random().toString(36).slice(2, 9); }
  function paletteIndex(courseId) {
    const i = db.courses.findIndex((c) => c.id === courseId);
    return ((i < 0 ? 0 : i) % 9) + 1;
  }
  function hasConflict(studentId, course) {
    const days = course.days || [];
    return enrollmentsFor(studentId, CURRENT).some((e) => {
      const other = courseById(e.courseId);
      if (!other || other.id === course.id) return false;
      const overlapDay = (other.days || []).some((d) => days.includes(d));
      if (!overlapDay) return false;
      return toMinutes(course.start) < toMinutes(other.end) && toMinutes(course.end) > toMinutes(other.start);
    });
  }
  function avg(values) {
    const list = values.filter((v) => v != null);
    return list.length ? list.reduce((a, b) => a + b, 0) / list.length : null;
  }

  /* ---------- icons ---------- */
  const ICONS = {
    home: '<path d="M3 9.5 12 2l9 7.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
    book: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    clipboard: '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4M12 16h4M8 11h.01M8 16h.01"/>',
    chart: '<path d="M3 3v18h18"/><path d="M7 15l4-5 3 3 5-7"/>',
    bell: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
    user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    layers: '<path d="M12 2 2 7l10 5 10-5z"/><path d="m2 17 10 5 10-5M2 12l10 5 10-5"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41"/>',
    moon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
    menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    edit: '<path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/>',
    trash: '<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M10 11v6M14 11v6"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    pin: '<path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
    award: '<circle cx="12" cy="8" r="6"/><path d="M8.2 13.9 7 23l5-3 5 3-1.2-9.1"/>',
    mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 6-10 7L2 6"/>',
    phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
    cap: '<path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>',
    check: '<path d="m20 6-11 11-5-5"/>',
    checkCircle: '<path d="M22 11.1V12a10 10 0 1 1-5.9-9.1"/><path d="M22 4 12 14l-3-3"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    arrowRight: '<path d="M5 12h14M12 5l7 7-7 7"/>',
    printer: '<path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5M12 15V3"/>',
    alert: '<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>',
    spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8"/>'
  };

  function icon(name, cls) {
    const body = ICONS[name] || '';
    return '<svg class="icon ' + (cls || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + body + '</svg>';
  }

  /* ---------- routes ---------- */
  const ROUTES = {
    student: [
      { key: 'dashboard', label: 'Dashboard', icon: 'home' },
      { key: 'courses', label: 'My Courses', icon: 'book' },
      { key: 'schedule', label: 'Schedule', icon: 'calendar' },
      { key: 'assignments', label: 'Assignments', icon: 'clipboard' },
      { key: 'grades', label: 'Grades', icon: 'chart' },
      { key: 'announcements', label: 'Announcements', icon: 'bell' },
      { key: 'profile', label: 'Profile', icon: 'user' }
    ],
    admin: [
      { key: 'dashboard', label: 'Dashboard', icon: 'home' },
      { key: 'students', label: 'Students', icon: 'users' },
      { key: 'courses', label: 'Courses', icon: 'book' },
      { key: 'enrollments', label: 'Enrollments', icon: 'layers' },
      { key: 'announcements', label: 'Announcements', icon: 'bell' },
      { key: 'profile', label: 'Profile', icon: 'user' }
    ]
  };

  const PAGE_META = {
    student: {
      dashboard: { title: 'Dashboard', sub: 'Your academic snapshot for Fall 2026' },
      courses: { title: 'My Courses', sub: 'Enrolled classes and the course catalog' },
      schedule: { title: 'Schedule', sub: 'Your weekly timetable' },
      assignments: { title: 'Assignments', sub: 'Deadlines and submissions' },
      grades: { title: 'Grades', sub: 'Transcript and academic performance' },
      announcements: { title: 'Announcements', sub: 'News from across campus' },
      profile: { title: 'Profile', sub: 'Manage your account and details' }
    },
    admin: {
      dashboard: { title: 'Admin Dashboard', sub: 'Manage students, courses and enrollment' },
      students: { title: 'Students', sub: 'Student records and academic profiles' },
      courses: { title: 'Courses', sub: 'Catalog, schedules and assignments' },
      enrollments: { title: 'Enrollments', sub: 'Enroll students and record final grades' },
      announcements: { title: 'Announcements', sub: 'Publish updates to the campus' },
      profile: { title: 'Profile', sub: 'Manage your account settings' }
    }
  };

  /* ---------- ui primitives ---------- */
  function toast(message, type) {
    const root = $('#toast-root');
    if (!root) return;
    const tone = type || 'success';
    const el = document.createElement('div');
    el.className = 'toast toast-' + tone;
    el.innerHTML = icon(tone === 'error' ? 'alert' : tone === 'info' ? 'bell' : 'checkCircle') + '<span>' + esc(message) + '</span>';
    root.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 250);
    }, 3200);
  }

  function openModal(html, size) {
    const root = $('#modal-root');
    root.innerHTML = '<div class="modal-backdrop" data-modal-backdrop><div class="modal ' + (size || '') + '" role="dialog" aria-modal="true">' + html + '</div></div>';
    document.body.classList.add('modal-open');
    setTimeout(() => {
      const first = root.querySelector('input, select, textarea, button');
      if (first) first.focus();
    }, 60);
  }

  function closeModal() {
    const root = $('#modal-root');
    if (!root) return;
    root.innerHTML = '';
    document.body.classList.remove('modal-open');
    ui.confirm = null;
  }

  function modalHead(title, subtitle) {
    return '<div class="modal-head"><div><h3>' + esc(title) + '</h3><p>' + esc(subtitle || '') + '</p></div>' +
      '<button type="button" class="icon-btn" data-action="close-modal" aria-label="Close">' + icon('x') + '</button></div>';
  }

  function confirmDialog(opts) {
    ui.confirm = opts.onConfirm;
    openModal(
      '<div class="modal-head"><div class="modal-icon danger">' + icon('trash') + '</div>' +
      '<div><h3>' + esc(opts.title) + '</h3><p>' + esc(opts.message) + '</p></div></div>' +
      '<div class="modal-actions"><button type="button" class="btn" data-action="close-modal">Cancel</button>' +
      '<button type="button" class="btn btn-danger" data-action="confirm-ok">' + esc(opts.confirmLabel || 'Delete') + '</button></div>',
      'modal-sm'
    );
  }

  function emptyState(iconName, title, text) {
    return '<div class="empty"><div class="empty-icon">' + icon(iconName) + '</div><h3>' + esc(title) + '</h3><p>' + esc(text) + '</p></div>';
  }

  function statCard(iconName, tone, label, value, sub) {
    return '<div class="stat-card"><div class="stat-icon tone-' + tone + '">' + icon(iconName) + '</div>' +
      '<div class="stat-copy"><p class="stat-label">' + esc(label) + '</p><p class="stat-value">' + value + '</p>' +
      '<p class="stat-sub">' + sub + '</p></div></div>';
  }

  function avatar(user, cls) {
    return '<span class="avatar ' + (cls || '') + '" style="--av:' + esc(user.color || '#4f46e5') + '">' + esc(initials(user.name)) + '</span>';
  }

  function badge(text, tone) {
    return '<span class="badge badge-' + tone + '">' + esc(text) + '</span>';
  }

  /* ---------- shell ---------- */
  function notifItems(user) {
    const items = [];
    if (user.role === 'student') {
      pendingAssignments(user.id).slice(0, 3).forEach((a) => {
        const c = courseById(a.courseId);
        items.push({
          icon: 'clipboard', tone: 'amber', href: '#/assignments',
          title: a.title, text: (c ? c.code : 'Course') + ' · ' + dueText(a, user.id)
        });
      });
    }
    visibleAnnouncements(user).slice(0, 2).forEach((a) => {
      items.push({ icon: 'bell', tone: 'indigo', href: '#/announcements', title: a.title, text: dateLong(a.date) + ' · ' + a.author });
    });
    return items.slice(0, 5);
  }

  function notifTray(user) {
    const items = notifItems(user);
    const rows = items.length
      ? items.map((n) => '<a class="notif-item" href="' + n.href + '"><span class="notif-icon tone-' + n.tone + '">' + icon(n.icon) + '</span>' +
        '<span class="notif-copy"><strong>' + esc(n.title) + '</strong><span>' + esc(n.text) + '</span></span></a>').join('')
      : '<p class="notif-empty">You are all caught up.</p>';
    return '<div class="notif-wrap"><button type="button" class="icon-btn" data-action="toggle-notifications" aria-label="Notifications" aria-expanded="false">' +
      icon('bell') + (items.length ? '<span class="dot">' + items.length + '</span>' : '') + '</button>' +
      '<div class="notif-panel" id="notif-panel"><div class="notif-head"><strong>Notifications</strong><span>' + items.length + ' new</span></div>' +
      '<div class="notif-list">' + rows + '</div><a class="notif-foot" href="' + (user.role === 'student' ? '#/assignments' : '#/announcements') + '">Open inbox ' + icon('arrowRight') + '</a></div></div>';
  }

  function shell(user, routes, route, content) {
    const meta = (PAGE_META[user.role] && PAGE_META[user.role][route]) || { title: 'CampusOne', sub: '' };
    const pending = user.role === 'student' ? pendingAssignments(user.id).length : 0;
    const nav = routes.map((r) => {
      const count = r.key === 'assignments' ? pending : 0;
      return '<a class="nav-link ' + (route === r.key ? 'active' : '') + '" href="#/' + r.key + '">' + icon(r.icon) +
        '<span>' + r.label + '</span>' + (count ? '<span class="nav-badge">' + count + '</span>' : '') + '</a>';
    }).join('');

    return '<div class="app-shell">' +
      '<aside class="sidebar" id="sidebar">' +
        '<div class="brand"><span class="brand-mark">' + icon('cap') + '</span><span class="brand-name">Campus<span>One</span></span></div>' +
        '<nav class="nav" aria-label="Main navigation">' + nav + '</nav>' +
        '<div class="sidebar-foot">' +
          '<a class="nav-link nav-profile" href="#/profile">' + icon('user') + '<span>Profile</span></a>' +
          '<button type="button" class="nav-link nav-logout" data-action="logout">' + icon('logout') + '<span>Sign out</span></button>' +
          '<div class="sidebar-user">' + avatar(user) + '<div class="user-meta"><strong>' + esc(user.name) + '</strong><span>' +
            (user.role === 'student' ? esc(user.program) : esc(user.title || 'Administrator')) + '</span></div></div>' +
        '</div>' +
      '</aside>' +
      '<div class="sidebar-scrim" data-action="close-sidebar"></div>' +
      '<div class="main">' +
        '<header class="topbar">' +
          '<button type="button" class="icon-btn menu-btn" data-action="toggle-sidebar" aria-label="Open menu">' + icon('menu') + '</button>' +
          '<div class="page-heading"><h1>' + esc(meta.title) + '</h1><p>' + esc(meta.sub) + '</p></div>' +
          '<div class="topbar-actions">' +
            '<button type="button" class="icon-btn" data-action="toggle-theme" aria-label="Toggle color theme">' + icon('sun', 'icon-sun') + icon('moon', 'icon-moon') + '</button>' +
            notifTray(user) +
            '<a class="avatar-link" href="#/profile" title="' + esc(user.name) + '">' + avatar(user) + '</a>' +
          '</div>' +
        '</header>' +
        '<main class="content" id="content">' + content + '</main>' +
      '</div>' +
    '</div>';
  }

  /* ---------- login ---------- */
  function loginView() {
    return '<div class="login-page">' +
      '<section class="login-brand">' +
        '<div class="login-brand-top">' +
          '<div class="brand brand-light"><span class="brand-mark">' + icon('cap') + '</span><span class="brand-name">Campus<span>One</span></span></div>' +
          '<button type="button" class="icon-btn icon-btn-light" data-action="toggle-theme" aria-label="Toggle color theme">' + icon('sun', 'icon-sun') + icon('moon', 'icon-moon') + '</button>' +
        '</div>' +
        '<div class="login-copy"><span class="eyebrow-light">Student portal · Demo</span>' +
          '<h1>Your campus,<br>all in one place.</h1>' +
          '<p>Courses, grades, schedules and announcements in a single workspace for students and administrators.</p>' +
          '<ul class="login-features">' +
            '<li>' + icon('checkCircle') + 'Live GPA and transcript tracking</li>' +
            '<li>' + icon('checkCircle') + 'Weekly timetable and assignment deadlines</li>' +
            '<li>' + icon('checkCircle') + 'Admin tools for students, courses and enrollment</li>' +
          '</ul></div>' +
        '<div class="login-cards">' +
          '<div class="float-card fc-1"><span class="float-icon">' + icon('award') + '</span><div><strong>3.59 GPA</strong><span>Spring 2026 · Dean\'s List</span></div></div>' +
          '<div class="float-card fc-2"><span class="float-icon">' + icon('clock') + '</span><div><strong>CS301 · 9:00 AM</strong><span>Algorithms · Room A-201</span></div></div>' +
        '</div>' +
        '<p class="login-brand-foot">Demo application · All data stays in this browser</p>' +
      '</section>' +
      '<section class="login-panel">' +
        '<div class="login-card">' +
          '<div class="login-head"><span class="login-badge">' + icon('cap') + '</span><h2>Welcome back</h2><p>Sign in to continue to your portal.</p></div>' +
          '<form data-form="login" novalidate>' +
            '<label class="field"><span>Email address</span><div class="input-icon">' + icon('mail') +
              '<input type="email" name="email" value="alex@campus.edu" placeholder="you@campus.edu" autocomplete="username" required></div></label>' +
            '<label class="field"><span>Password</span><div class="input-icon">' + icon('lock') +
              '<input type="password" name="password" value="student123" placeholder="Your password" autocomplete="current-password" required></div></label>' +
            '<div class="login-row"><label class="checkbox"><input type="checkbox" checked> Remember me</label>' +
              '<button type="button" class="link-btn" data-action="forgot">Forgot password?</button></div>' +
            '<div class="form-error" id="login-error" hidden></div>' +
            '<button type="submit" class="btn btn-primary btn-block">Sign in ' + icon('arrowRight') + '</button>' +
          '</form>' +
          '<div class="demo-box"><span class="demo-title">Demo accounts</span>' +
            '<div class="demo-grid">' +
              '<button type="button" class="demo-btn" data-action="demo-login" data-email="alex@campus.edu" data-password="student123"><span class="demo-avatar" style="--av:#4f46e5">AM</span><span><strong>Student</strong><small>alex@campus.edu</small></span>' + icon('arrowRight') + '</button>' +
              '<button type="button" class="demo-btn" data-action="demo-login" data-email="admin@campus.edu" data-password="admin123"><span class="demo-avatar" style="--av:#0f766e">MC</span><span><strong>Administrator</strong><small>admin@campus.edu</small></span>' + icon('arrowRight') + '</button>' +
            '</div>' +
            '<p class="demo-hint">Password for both accounts: <code>student123</code> / <code>admin123</code></p>' +
          '</div>' +
          '<button type="button" class="link-btn reset-link" data-action="reset-data">Reset demo data</button>' +
        '</div>' +
        '<p class="login-foot">© 2026 CampusOne · A front-end demo project</p>' +
      '</section>' +
    '</div>';
  }

  /* ---------- shared page bits ---------- */
  function cardHead(title, sub, action) {
    return '<div class="card-head"><div><h2 class="card-title">' + esc(title) + '</h2>' +
      (sub ? '<p class="card-sub">' + esc(sub) + '</p>' : '') + '</div>' + (action || '') + '</div>';
  }

  function miniAssignment(a, u) {
    const c = courseById(a.courseId);
    const st = statusOf(a, u.id);
    return '<div class="mini-row"><span class="mini-icon palette-' + paletteIndex(a.courseId) + '">' + icon('clipboard') + '</span>' +
      '<div class="mini-main"><strong>' + esc(a.title) + '</strong><span>' + esc(c ? c.code : 'Course') + ' · ' +
      esc(dueText(a, u.id)) + ' · ' + esc(dateTime(a.due)) + '</span></div>' + badge(st.label, st.tone) + '</div>';
  }

  /* ---------- student: dashboard ---------- */
  function studentDashboard(u) {
    const gpa = calcGPA(u.id);
    const earned = creditsEarned(u.id);
    const current = enrollmentsFor(u.id, CURRENT).map((e) => courseById(e.courseId)).filter(Boolean);
    const currentCredits = current.reduce((sum, c) => sum + c.credits, 0);
    const pending = pendingAssignments(u.id);
    const weekAhead = pending.filter((a) => {
      const diff = new Date(a.due).getTime() - Date.now();
      return diff >= 0 && diff <= 7 * 86400000;
    });
    const todays = current.filter((c) => (c.days || []).includes(todayKey())).sort((a, b) => a.start.localeCompare(b.start));
    const graded = gradedEnrollments(u.id);
    const lastSem = [...new Set(graded.map((e) => e.semester))].sort(semesterSortDesc)[0];
    const lastRows = lastSem ? graded.filter((e) => e.semester === lastSem) : [];
    const anns = visibleAnnouncements(u).slice(0, 2);
    const pct = gpa ? (gpa / 4) * 100 : 0;

    const upcoming = pending.length
      ? pending.slice(0, 4).map((a) => miniAssignment(a, u)).join('')
      : emptyState('checkCircle', 'Nothing pending', 'All your assignments are submitted. Nice work!');

    const todayHtml = todays.length
      ? todays.map((c) => '<div class="class-row"><div class="class-time"><strong>' + timeLabel(c.start) + '</strong><span>' + timeLabel(c.end) + '</span></div>' +
        '<span class="class-bar palette-' + paletteIndex(c.id) + '"></span><div class="class-info"><strong>' + esc(c.code) + ' · ' + esc(c.title) + '</strong>' +
        '<span>' + icon('pin') + esc(c.room) + ' · ' + esc(c.instructor) + '</span></div></div>').join('')
      : emptyState('calendar', 'No classes today', 'Use the free time to get ahead on assignments.');

    const performance = lastRows.length
      ? '<div class="perf-list">' + lastRows.map((e) => {
        const c = courseById(e.courseId);
        const pts = window.GRADE_POINTS[e.grade] || 0;
        return '<div class="perf-row"><div class="perf-top"><span>' + esc(c ? c.code : '') + ' · ' + esc(c ? c.title : '') + '</span>' +
          '<span class="grade-pill grade-' + gradeTone(e.grade) + '">' + esc(e.grade) + '</span></div>' +
          '<div class="perf-track"><i style="width:' + (pts / 4 * 100) + '%"></i></div></div>';
      }).join('') + '</div>'
      : emptyState('chart', 'No results yet', 'Grades appear here once your courses are graded.');

    const annHtml = anns.length
      ? '<div class="ann-mini-list">' + anns.map((a) => '<a class="ann-mini" href="#/announcements"><span class="ann-mini-icon">' + icon('bell') + '</span>' +
        '<span class="ann-mini-copy"><strong>' + esc(a.title) + '</strong><span>' + esc(dateLong(a.date)) + ' · ' + esc(a.author) + '</span></span></a>').join('') + '</div>'
      : emptyState('bell', 'No announcements', 'Campus news will show up here.');

    return '<div class="page-stack">' +
      '<section class="hero-card"><div class="hero-copy"><span class="eyebrow-light">' + esc(CURRENT) + ' · Student portal</span>' +
        '<h2>' + greeting() + ', ' + esc(firstName(u.name)) + ' <span class="wave">👋</span></h2>' +
        '<p>' + (pending.length
          ? 'You have <strong>' + pending.length + '</strong> assignment' + (pending.length === 1 ? '' : 's') + ' pending' +
            (weekAhead.length ? ' · <strong>' + weekAhead.length + '</strong> due in the next 7 days' : '') + '.'
          : 'You are all caught up on assignments.') +
          (todays.length ? ' Next class: <strong>' + esc(todays[0].code) + '</strong> at ' + timeLabel(todays[0].start) + '.' : ' No classes today.') + '</p>' +
        '<div class="hero-actions"><a class="btn btn-light" href="#/schedule">' + icon('calendar') + 'Weekly schedule</a>' +
        '<a class="btn btn-glass" href="#/assignments">' + icon('clipboard') + 'View assignments</a></div></div>' +
        '<div class="hero-side"><div class="gpa-ring" style="--pct:' + pct + '%"><div class="gpa-ring-inner"><strong>' +
        (gpa ? gpa.toFixed(2) : '—') + '</strong><span>Cumulative GPA</span></div></div></div></section>' +

      '<div class="stat-grid">' +
        statCard('award', 'indigo', 'Cumulative GPA', gpa ? gpa.toFixed(2) : '—', graded.length + ' graded courses') +
        statCard('checkCircle', 'emerald', 'Credits earned', earned, 'of ' + MAX_CREDITS + ' required<div class="stat-bar"><i style="width:' + Math.min(100, earned / MAX_CREDITS * 100) + '%"></i></div>') +
        statCard('book', 'sky', 'Active courses', current.length, currentCredits + ' credit hours this term') +
        statCard('clipboard', 'amber', 'Pending work', pending.length, weekAhead.length + ' due in the next 7 days') +
      '</div>' +

      '<div class="grid-2">' +
        '<section class="card">' + cardHead('Upcoming assignments', 'Sorted by deadline', '<a class="link-more" href="#/assignments">View all ' + icon('arrowRight') + '</a>') + upcoming + '</section>' +
        '<section class="card">' + cardHead('Today\'s classes', new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }), '<a class="link-more" href="#/schedule">Timetable ' + icon('arrowRight') + '</a>') + todayHtml + '</section>' +
      '</div>' +

      '<div class="grid-2">' +
        '<section class="card">' + cardHead('Recent performance', lastSem ? lastSem + ' results' : 'Academic results', '<a class="link-more" href="#/grades">Transcript ' + icon('arrowRight') + '</a>') + performance + '</section>' +
        '<section class="card">' + cardHead('Campus announcements', 'Latest updates', '<a class="link-more" href="#/announcements">All news ' + icon('arrowRight') + '</a>') + annHtml + '</section>' +
      '</div>' +
    '</div>';
  }

  /* ---------- student: courses ---------- */
  function studentCourseCard(course, enrollment) {
    return '<article class="course-card"><div class="course-top palette-' + paletteIndex(course.id) + '">' +
      '<span class="course-code">' + esc(course.code) + '</span><span class="course-credits">' + course.credits + ' cr</span></div>' +
      '<div class="course-body"><h3>' + esc(course.title) + '</h3>' +
      '<p class="course-instructor">' + icon('user') + esc(course.instructor) + '</p>' +
      '<div class="course-meta"><span>' + icon('clock') + esc(daysLabel(course.days)) + ' · ' + esc(timeRange(course.start, course.end)) + '</span>' +
      '<span>' + icon('pin') + esc(course.room) + '</span></div>' +
      '<div class="course-foot">' + (enrollment && enrollment.grade
        ? '<span class="grade-pill grade-' + gradeTone(enrollment.grade) + '">' + esc(enrollment.grade) + '</span>'
        : '<span class="badge badge-info">In progress</span>') +
      (enrollment ? '<button type="button" class="btn btn-sm btn-ghost-danger" data-action="drop-enrollment" data-id="' + enrollment.id + '">Drop course</button>' : '') +
      '</div></div></article>';
  }

  function catalogCard(course, u) {
    const seats = seatsLeft(course);
    const full = seats <= 0;
    const conflict = hasConflict(u.id, course);
    let label = 'Enroll now';
    let disabled = '';
    if (full) { label = 'Course full'; disabled = ' disabled'; }
    else if (conflict) { label = 'Schedule conflict'; disabled = ' disabled'; }
    return '<article class="course-card"><div class="course-top palette-' + paletteIndex(course.id) + '">' +
      '<span class="course-code">' + esc(course.code) + '</span><span class="course-credits">' +
      (full ? 'Full' : seats + ' seats left') + '</span></div>' +
      '<div class="course-body"><h3>' + esc(course.title) + '</h3>' +
      '<p class="course-instructor">' + icon('user') + esc(course.instructor) + '</p>' +
      '<div class="course-meta"><span>' + icon('clock') + esc(daysLabel(course.days)) + ' · ' + esc(timeRange(course.start, course.end)) + '</span>' +
      '<span>' + icon('pin') + esc(course.room) + ' · ' + course.credits + ' credits</span></div>' +
      '<p class="course-desc">' + esc(course.description) + '</p>' +
      '<div class="course-foot"><span class="badge badge-neutral">' + seats + ' / ' + course.capacity + ' seats</span>' +
      '<button type="button" class="btn btn-sm btn-primary" data-action="enroll" data-id="' + course.id + '"' + disabled + '>' +
      icon('plus') + label + '</button></div>' +
      (conflict && !full ? '<p class="course-note">' + icon('alert') + 'Overlaps with your current timetable.</p>' : '') +
      '</div></article>';
  }

  function studentCourses(u) {
    const enrolled = enrollmentsFor(u.id, CURRENT).map((e) => ({ e: e, c: courseById(e.courseId) })).filter((x) => x.c);
    const credits = enrolled.reduce((sum, x) => sum + x.c.credits, 0);
    const open = db.courses.filter((c) => c.semester === CURRENT && !isEnrolled(u.id, c.id));

    return '<div class="page-stack">' +
      '<div class="section-head"><div><h2>Enrolled courses</h2><p>' + enrolled.length + ' course' + (enrolled.length === 1 ? '' : 's') + ' · ' + credits + ' credit hours this semester</p></div>' +
      '<button type="button" class="btn btn-soft" data-action="scroll-catalog">' + icon('book') + 'Browse catalog</button></div>' +
      (enrolled.length
        ? '<div class="course-grid">' + enrolled.map((x) => studentCourseCard(x.c, x.e)).join('') + '</div>'
        : emptyState('book', 'No courses yet', 'Browse the catalog below to enroll in your first course.')) +
      '<div class="section-head catalog-head" id="catalog"><div><h2>Course catalog</h2><p>Open sections for ' + esc(CURRENT) + '</p></div>' +
      '<span class="badge badge-primary">' + open.length + ' available</span></div>' +
      (open.length
        ? '<div class="course-grid">' + open.map((c) => catalogCard(c, u)).join('') + '</div>'
        : emptyState('checkCircle', 'You are enrolled in everything', 'There are no other open sections this semester.')) +
    '</div>';
  }

  /* ---------- student: schedule ---------- */
  function studentSchedule(u) {
    const entries = enrollmentsFor(u.id, CURRENT)
      .map((e) => ({ e: e, c: courseById(e.courseId) }))
      .filter((x) => x.c && (x.c.days || []).length);
    const startHour = 8;
    const endHour = 18;
    const hours = endHour - startHour;
    const now = new Date();
    const dow = (now.getDay() + 6) % 7;
    const monday = new Date(now);
    monday.setHours(0, 0, 0, 0);
    monday.setDate(monday.getDate() - dow);
    const dates = WEEK_DAYS.map((_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
    const todayIdx = WEEK_DAYS.indexOf(todayKey());

    const head = '<div class="sched-head"><div class="sched-corner"></div>' + WEEK_DAYS.map((d, i) =>
      '<div class="sched-day ' + (i === todayIdx ? 'is-today' : '') + '"><strong>' + d + '</strong><span>' +
      dates[i].getDate() + ' ' + dates[i].toLocaleDateString('en-US', { month: 'short' }) + '</span></div>').join('') + '</div>';

    const times = '<div class="sched-times">' + Array.from({ length: hours }, (_, i) =>
      '<div class="sched-time"><span>' + timeLabel((startHour + i) + ':00') + '</span></div>').join('') + '</div>';

    const cols = WEEK_DAYS.map((day, di) => {
      const dayItems = entries.filter((x) => x.c.days.includes(day)).sort((a, b) => a.c.start.localeCompare(b.c.start));
      const blocks = dayItems.map((x) => {
        const c = x.c;
        const top = ((toMinutes(c.start) - startHour * 60) / (hours * 60)) * 100;
        const height = ((toMinutes(c.end) - toMinutes(c.start)) / (hours * 60)) * 100;
        return '<div class="sched-block palette-' + paletteIndex(c.id) + '" style="top:' + top + '%;height:' + height + '%">' +
          '<strong>' + esc(c.code) + '</strong><span>' + esc(c.title) + '</span><small>' + icon('pin') + esc(c.room) + '</small></div>';
      }).join('');
      return '<div class="sched-col ' + (di === todayIdx ? 'is-today' : '') + '">' + blocks + '</div>';
    }).join('');

    const legend = entries.length
      ? '<div class="legend">' + entries.map((x) => '<div class="legend-item"><span class="legend-dot palette-' + paletteIndex(x.c.id) + '"></span>' +
        '<div><strong>' + esc(x.c.code) + '</strong><span>' + esc(daysLabel(x.c.days)) + ' · ' + esc(timeRange(x.c.start, x.c.end)) + ' · ' + esc(x.c.room) + '</span></div></div>').join('') + '</div>'
      : '';

    const totalCredits = entries.reduce((sum, x) => sum + x.c.credits, 0);

    return '<div class="page-stack">' +
      '<div class="section-head"><div><h2>Weekly timetable</h2><p>' + esc(CURRENT) + ' · ' + entries.length + ' classes · ' + totalCredits + ' credit hours</p></div>' +
      '<span class="badge badge-primary">' + icon('calendar') + 'Week view</span></div>' +
      (entries.length
        ? '<div class="card schedule-card"><div class="sched-scroll"><div class="sched">' + head +
          '<div class="sched-body">' + times + cols + '</div></div></div></div>' + legend
        : '<div class="card">' + emptyState('calendar', 'No scheduled classes', 'Enroll in a course to build your weekly timetable.') + '</div>') +
    '</div>';
  }

  /* ---------- student: assignments ---------- */
  function studentAssignmentsPage(u) {
    const all = studentAssignments(u.id);
    const pending = all.filter((a) => !a.submissions.includes(u.id));
    const submitted = all.filter((a) => a.submissions.includes(u.id));
    const overdue = pending.filter((a) => new Date(a.due).getTime() < Date.now());
    const tabs = [
      { key: 'all', label: 'All', count: all.length },
      { key: 'pending', label: 'Pending', count: pending.length },
      { key: 'overdue', label: 'Overdue', count: overdue.length },
      { key: 'submitted', label: 'Submitted', count: submitted.length }
    ];
    const filtered = ui.assignmentFilter === 'pending' ? pending
      : ui.assignmentFilter === 'overdue' ? overdue
        : ui.assignmentFilter === 'submitted' ? submitted : all;

    const tabHtml = '<div class="tabs" role="tablist">' + tabs.map((t) =>
      '<button type="button" class="tab ' + (ui.assignmentFilter === t.key ? 'active' : '') + '" data-action="assignment-filter" data-filter="' + t.key + '">' +
      t.label + '<span>' + t.count + '</span></button>').join('') + '</div>';

    const rows = filtered.length
      ? filtered.map((a) => {
        const c = courseById(a.courseId);
        const st = statusOf(a, u.id);
        const d = new Date(a.due);
        const month = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
        const isSubmitted = st.key === 'submitted';
        return '<div class="assign-row"><div class="assign-date ' + (st.key === 'overdue' ? 'is-late' : '') + '"><span>' + month + '</span><strong>' + d.getDate() + '</strong></div>' +
          '<div class="assign-main"><div class="assign-title">' + esc(a.title) + '<span class="points">' + a.points + ' pts</span></div>' +
          '<div class="assign-meta"><span class="course-tag palette-' + paletteIndex(a.courseId) + '">' + esc(c ? c.code : 'Course') + '</span>' +
          esc(c ? c.title : '') + ' · Due ' + esc(dateTime(a.due)) + '</div></div>' +
          '<div class="assign-status">' + badge(st.label, st.tone) + '<span class="due-hint">' + esc(dueText(a, u.id)) + '</span></div>' +
          '<button type="button" class="btn btn-sm ' + (isSubmitted ? 'btn-soft' : 'btn-primary') + '" data-action="toggle-submission" data-id="' + a.id + '">' +
          icon(isSubmitted ? 'check' : 'clipboard') + (isSubmitted ? 'Undo' : 'Submit') + '</button></div>';
      }).join('')
      : emptyState('checkCircle', 'Nothing here', 'No assignments match this filter.');

    return '<div class="page-stack">' +
      '<div class="section-head"><div><h2>Assignments</h2><p>' + pending.length + ' pending · ' + submitted.length + ' submitted across ' +
        studentCourseIds(u.id).length + ' courses</p></div>' + tabHtml + '</div>' +
      '<div class="assign-list">' + rows + '</div>' +
    '</div>';
  }

  /* ---------- student: grades ---------- */
  function studentGrades(u) {
    const all = enrollmentsFor(u.id);
    const graded = gradedEnrollments(u.id);
    const gpa = calcGPA(u.id);
    const earned = creditsEarned(u.id);
    const completed = all.filter((e) => e.grade && window.GRADE_POINTS[e.grade] != null).length;
    const semesters = [...new Set(all.map((e) => e.semester))].sort(semesterSortDesc);

    const blocks = semesters.map((sem) => {
      const rows = all.filter((e) => e.semester === sem).map((e) => ({ e: e, c: courseById(e.courseId) })).filter((x) => x.c)
        .sort((a, b) => a.c.code.localeCompare(b.c.code));
      const semGpa = gpaFrom(rows.map((x) => x.e));
      const credits = rows.reduce((sum, x) => sum + x.c.credits, 0);
      return '<div class="sem-block"><div class="sem-head"><div><h3>' + esc(sem) + '</h3><span>' + rows.length + ' courses · ' + credits + ' credits</span></div>' +
        '<div class="sem-gpa"><strong>' + (semGpa ? semGpa.toFixed(2) : '—') + '</strong><span>Term GPA</span></div></div>' +
        '<div class="table-wrap"><table class="table"><thead><tr><th>Course</th><th>Code</th><th>Credits</th><th>Grade</th><th>Quality points</th></tr></thead><tbody>' +
        rows.map((x) => {
          const gp = window.GRADE_POINTS[x.e.grade];
          return '<tr><td><strong>' + esc(x.c.title) + '</strong><span class="cell-sub">' + esc(x.c.instructor) + '</span></td>' +
            '<td>' + esc(x.c.code) + '</td><td>' + x.c.credits + '</td>' +
            '<td>' + (x.e.grade ? '<span class="grade-pill grade-' + gradeTone(x.e.grade) + '">' + esc(x.e.grade) + '</span>' : '<span class="badge badge-info">In progress</span>') + '</td>' +
            '<td>' + (gp != null ? (gp * x.c.credits).toFixed(1) : '—') + '</td></tr>';
        }).join('') + '</tbody></table></div></div>';
    }).join('');

    return '<div class="page-stack">' +
      '<div class="summary-grid">' +
        statCard('award', 'indigo', 'Cumulative GPA', gpa ? gpa.toFixed(2) : '—', 'on a 4.0 scale') +
        statCard('checkCircle', 'emerald', 'Credits earned', earned, 'of ' + MAX_CREDITS + ' required') +
        statCard('book', 'sky', 'Courses completed', completed, semesters.length + ' semester' + (semesters.length === 1 ? '' : 's') + ' on record') +
      '</div>' +
      '<section class="card transcript">' + cardHead('Academic transcript', 'Official-style record of completed and in-progress courses',
        '<button type="button" class="btn btn-soft btn-sm" data-action="print">' + icon('printer') + 'Print</button>') +
        (blocks || emptyState('chart', 'No transcript yet', 'Your courses and grades will appear here.')) +
        '<div class="transcript-foot"><div><span class="muted">Cumulative GPA</span><strong>' + (gpa ? gpa.toFixed(2) : '—') + '</strong></div>' +
        '<div><span class="muted">Total credits earned</span><strong>' + earned + ' / ' + MAX_CREDITS + '</strong></div>' +
        '<div><span class="muted">Graded courses</span><strong>' + graded.length + '</strong></div></div>' +
      '</section>' +
    '</div>';
  }

  /* ---------- shared: announcements ---------- */
  function announcementsPage(user) {
    const list = visibleAnnouncements(user);
    const isAdmin = user.role === 'admin';
    const cards = list.length
      ? '<div class="announcement-list">' + list.map((a) => {
        const d = new Date(a.date);
        return '<article class="announcement"><div class="ann-date"><span>' + d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase() + '</span><strong>' + d.getDate() + '</strong></div>' +
          '<div class="ann-body"><div class="ann-title-row"><h3>' + esc(a.title) + '</h3>' +
          (a.audience !== 'all' ? badge(a.audience === 'admin' ? 'Staff' : 'Students', 'neutral') : '') + '</div>' +
          '<p>' + esc(a.body) + '</p><div class="ann-meta">' + icon('user') + esc(a.author) + '<span class="sep">·</span>' + esc(dateLong(a.date)) + '</div></div>' +
          (isAdmin ? '<button type="button" class="icon-btn danger" data-action="delete-announcement" data-id="' + a.id + '" title="Delete announcement">' + icon('trash') + '</button>' : '') +
          '</article>';
      }).join('') + '</div>'
      : '<div class="card">' + emptyState('bell', 'No announcements', 'There is nothing new to show right now.') + '</div>';

    return '<div class="page-stack">' +
      '<div class="section-head"><div><h2>Campus announcements</h2><p>' + list.length + ' update' + (list.length === 1 ? '' : 's') + ' published</p></div>' +
      (isAdmin ? '<button type="button" class="btn btn-primary" data-action="open-announcement-modal">' + icon('plus') + 'Post announcement</button>' : '') + '</div>' +
      cards + '</div>';
  }

  /* ---------- shared: profile ---------- */
  function infoRow(label, value, iconName) {
    return '<div class="info-row"><span class="info-icon">' + icon(iconName || 'user') + '</span><div><span>' + esc(label) + '</span><strong>' + esc(value || '—') + '</strong></div></div>';
  }

  function profilePage(u) {
    const isStudent = u.role === 'student';
    return '<div class="grid-2 profile-grid">' +
      '<section class="card profile-card">' + avatar(u, 'avatar-xl') +
        '<h2>' + esc(u.name) + '</h2><p class="profile-role">' + esc(isStudent ? u.program : (u.title || 'Administrator')) + '</p>' +
        '<div class="profile-tags">' + badge(isStudent ? 'Student' : 'Administrator', isStudent ? 'primary' : 'success') +
        (isStudent ? badge('Year ' + u.year, 'neutral') : badge('Staff access', 'neutral')) + '</div>' +
        '<div class="info-list">' +
          (isStudent ? infoRow('Student ID', u.studentId, 'award') : infoRow('Role', 'University Registrar', 'award')) +
          infoRow('Email', u.email, 'mail') + infoRow('Phone', u.phone, 'phone') + infoRow('Address', u.address, 'pin') +
          (isStudent ? infoRow('Academic advisor', u.advisor, 'users') : '') +
        '</div>' +
      '</section>' +
      '<div class="page-stack">' +
        '<section class="card">' + cardHead('Personal information', 'These details are shown across the portal') +
          '<form data-form="profile"><div class="form-grid">' +
            '<label class="field"><span>Full name</span><input name="name" value="' + esc(u.name) + '" required></label>' +
            '<label class="field"><span>Email address</span><input name="email" type="email" value="' + esc(u.email) + '" required></label>' +
            '<label class="field"><span>Phone</span><input name="phone" value="' + esc(u.phone || '') + '" placeholder="(555) 000-0000"></label>' +
            '<label class="field"><span>Address</span><input name="address" value="' + esc(u.address || '') + '" placeholder="Street, city"></label>' +
          '</div><div class="form-actions"><button type="submit" class="btn btn-primary">' + icon('check') + 'Save changes</button></div></form>' +
        '</section>' +
        (isStudent ? '<section class="card">' + cardHead('Academic record', 'Contact the registrar to request changes') +
          '<div class="info-list info-grid">' + infoRow('Program', u.program, 'book') + infoRow('Year', 'Year ' + u.year, 'chart') +
          infoRow('Student ID', u.studentId, 'award') + infoRow('Advisor', u.advisor, 'users') + infoRow('Current semester', CURRENT, 'calendar') +
          infoRow('Credits earned', creditsEarned(u.id) + ' / ' + MAX_CREDITS, 'checkCircle') + '</div></section>' : '') +
        '<section class="card">' + cardHead('Password & security', 'Use at least 6 characters') +
          '<form data-form="password"><div class="form-grid">' +
            '<label class="field full"><span>Current password</span><input name="current" type="password" autocomplete="current-password" required></label>' +
            '<label class="field"><span>New password</span><input name="next" type="password" autocomplete="new-password" minlength="6" required></label>' +
            '<label class="field"><span>Confirm new password</span><input name="confirm" type="password" autocomplete="new-password" minlength="6" required></label>' +
          '</div><div class="form-actions"><button type="submit" class="btn btn-soft">' + icon('lock') + 'Update password</button></div></form>' +
        '</section>' +
        '<section class="card danger-zone">' + cardHead('Demo data', 'This demo stores everything in your browser') +
          '<p class="muted">Reset students, courses, enrollments, grades and announcements back to the original sample data.</p>' +
          '<div class="form-actions"><button type="button" class="btn btn-danger" data-action="reset-data">' + icon('trash') + 'Reset demo data</button></div>' +
        '</section>' +
      '</div>' +
    '</div>';
  }

  /* ---------- admin: dashboard ---------- */
  function adminDashboard(u) {
    const students = db.users.filter((x) => x.role === 'student');
    const currentCourses = db.courses.filter((c) => c.semester === CURRENT);
    const currentEnrollments = db.enrollments.filter((e) => e.semester === CURRENT);
    const avgGpa = avg(students.map((s) => calcGPA(s.id)));
    const graded = db.enrollments.filter((e) => e.grade && window.GRADE_POINTS[e.grade] != null);

    const groups = [
      { label: 'A range', color: '#10b981', count: 0 },
      { label: 'B range', color: '#3b82f6', count: 0 },
      { label: 'C range', color: '#f59e0b', count: 0 },
      { label: 'D / F', color: '#ef4444', count: 0 }
    ];
    graded.forEach((e) => {
      const first = e.grade.charAt(0);
      const g = first === 'A' ? groups[0] : first === 'B' ? groups[1] : first === 'C' ? groups[2] : groups[3];
      g.count += 1;
    });
    const totalGraded = groups.reduce((sum, g) => sum + g.count, 0);
    let acc = 0;
    const stops = groups.filter((g) => g.count).map((g) => {
      const from = acc;
      acc += (g.count / totalGraded) * 100;
      return g.color + ' ' + from + '% ' + acc + '%';
    }).join(', ');
    const donutStyle = totalGraded ? 'background:conic-gradient(' + stops + ')' : '';

    const byCourse = currentCourses.map((c) => ({ c: c, count: courseEnrollmentCount(c.id) }))
      .sort((a, b) => b.count - a.count).slice(0, 6);
    const maxCount = Math.max(1, ...byCourse.map((x) => x.count));

    const courseBars = byCourse.map((x) => '<div class="bar-row"><div class="bar-top"><span>' + esc(x.c.code) + ' · ' + esc(x.c.title) + '</span>' +
      '<strong>' + x.count + '/' + x.c.capacity + '</strong></div><div class="bar-track"><i class="palette-' + paletteIndex(x.c.id) + '" style="width:' +
      (x.count / maxCount * 100) + '%"></i></div></div>').join('');

    const legend = groups.map((g) => '<div class="donut-legend-item"><span class="donut-dot" style="background:' + g.color + '"></span>' +
      '<span>' + g.label + '</span><strong>' + g.count + '</strong></div>').join('');

    const recent = db.enrollments.slice(-6).reverse().map((e) => {
      const s = userById(e.studentId);
      const c = courseById(e.courseId);
      if (!s || !c) return '';
      return '<tr><td><div class="cell-user">' + avatar(s, 'avatar-xs') + '<div><strong>' + esc(s.name) + '</strong><span class="cell-sub">' + esc(s.studentId || '') + '</span></div></div></td>' +
        '<td><span class="course-tag palette-' + paletteIndex(c.id) + '">' + esc(c.code) + '</span></td>' +
        '<td>' + esc(e.semester) + '</td><td>' + (e.grade ? '<span class="grade-pill grade-' + gradeTone(e.grade) + '">' + esc(e.grade) + '</span>' : badge('Enrolled', 'info')) + '</td></tr>';
    }).join('');

    const anns = visibleAnnouncements(u).slice(0, 3).map((a) => '<a class="ann-mini" href="#/announcements"><span class="ann-mini-icon">' + icon('bell') + '</span>' +
      '<span class="ann-mini-copy"><strong>' + esc(a.title) + '</strong><span>' + esc(dateLong(a.date)) + ' · ' + esc(a.author) + '</span></span></a>').join('');

    return '<div class="page-stack">' +
      '<section class="hero-card admin-hero"><div class="hero-copy"><span class="eyebrow-light">' + esc(CURRENT) + ' · Administration</span>' +
        '<h2>' + greeting() + ', ' + esc(firstName(u.name)) + '</h2>' +
        '<p><strong>' + students.length + '</strong> students · <strong>' + currentCourses.length + '</strong> active courses · <strong>' +
        currentEnrollments.length + '</strong> enrollments this semester.</p>' +
        '<div class="hero-actions"><button type="button" class="btn btn-light" data-action="open-student-modal">' + icon('plus') + 'Add student</button>' +
        '<button type="button" class="btn btn-glass" data-action="open-course-modal">' + icon('plus') + 'Add course</button>' +
        '<button type="button" class="btn btn-glass" data-action="open-announcement-modal">' + icon('bell') + 'Announce</button></div></div>' +
        '<div class="hero-side admin-date"><span>' + new Date().toLocaleDateString('en-US', { weekday: 'long' }) + '</span>' +
        '<strong>' + new Date().getDate() + '</strong><span>' + new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) + '</span></div></section>' +

      '<div class="stat-grid">' +
        statCard('users', 'indigo', 'Total students', students.length, 'across ' + new Set(students.map((s) => s.program)).size + ' programs') +
        statCard('book', 'sky', 'Active courses', currentCourses.length, 'this semester') +
        statCard('layers', 'emerald', 'Enrollments', currentEnrollments.length, 'current semester') +
        statCard('award', 'amber', 'Average GPA', avgGpa ? avgGpa.toFixed(2) : '—', 'all students on record') +
      '</div>' +

      '<div class="grid-2">' +
        '<section class="card">' + cardHead('Enrollment by course', 'Top sections this semester', '<a class="link-more" href="#/enrollments">Manage ' + icon('arrowRight') + '</a>') +
          '<div class="bar-list">' + (courseBars || emptyState('layers', 'No enrollments', 'Enroll students to see section fill rates.')) + '</div></section>' +
        '<section class="card">' + cardHead('Grade distribution', 'Across all graded enrollments') +
          '<div class="donut-wrap"><div class="donut" style="' + donutStyle + '"><div class="donut-hole"><strong>' + totalGraded + '</strong><span>grades</span></div></div>' +
          '<div class="donut-legend">' + legend + '</div></div></section>' +
      '</div>' +

      '<div class="grid-2">' +
        '<section class="card">' + cardHead('Recent enrollments', 'Latest activity', '<a class="link-more" href="#/students">Students ' + icon('arrowRight') + '</a>') +
          '<div class="table-wrap"><table class="table compact"><thead><tr><th>Student</th><th>Course</th><th>Semester</th><th>Status</th></tr></thead><tbody>' +
          (recent || '<tr><td colspan="4" class="muted">No enrollments yet.</td></tr>') + '</tbody></table></div></section>' +
        '<section class="card">' + cardHead('Announcements', 'What the campus is reading', '<a class="link-more" href="#/announcements">All news ' + icon('arrowRight') + '</a>') +
          '<div class="ann-mini-list">' + (anns || emptyState('bell', 'No announcements', 'Post an update to get started.')) + '</div></section>' +
      '</div>' +
    '</div>';
  }

  /* ---------- admin: students ---------- */
  function adminStudentsPage() {
    const students = db.users.filter((u) => u.role === 'student');
    const programs = [...new Set(students.map((s) => s.program))].sort();
    const rows = students.map((s) => {
      const count = enrollmentsFor(s.id, CURRENT).length;
      const gpa = calcGPA(s.id);
      return '<tr data-row data-search="' + esc((s.name + ' ' + s.email + ' ' + (s.studentId || '')).toLowerCase()) + '" data-program="' + esc(s.program) + '">' +
        '<td><div class="cell-user">' + avatar(s, 'avatar-sm') + '<div><strong>' + esc(s.name) + '</strong><span class="cell-sub">' + esc(s.email) + '</span></div></div></td>' +
        '<td><span class="mono">' + esc(s.studentId || '—') + '</span></td>' +
        '<td>' + esc(s.program) + '</td><td>Year ' + s.year + '</td><td>' + count + '</td>' +
        '<td><strong>' + (gpa ? gpa.toFixed(2) : '—') + '</strong></td>' +
        '<td><div class="row-actions"><button type="button" class="icon-btn" data-action="open-student-modal" data-id="' + s.id + '" title="Edit student">' + icon('edit') + '</button>' +
        '<button type="button" class="icon-btn danger" data-action="delete-student" data-id="' + s.id + '" title="Delete student">' + icon('trash') + '</button></div></td></tr>';
    }).join('');

    return '<div class="page-stack">' +
      '<div class="section-head"><div><h2>Student directory</h2><p>' + students.length + ' student' + (students.length === 1 ? '' : 's') + ' enrolled at CampusOne</p></div>' +
      '<button type="button" class="btn btn-primary" data-action="open-student-modal">' + icon('plus') + 'Add student</button></div>' +
      '<div class="card table-card"><div class="toolbar">' +
        '<div class="search-box">' + icon('search') + '<input type="search" placeholder="Search name, email or ID…" data-filter-for="students-table" data-key="search" aria-label="Search students"></div>' +
        '<select class="select" data-filter-for="students-table" data-key="program" aria-label="Filter by program"><option value="">All programs</option>' +
        programs.map((p) => '<option value="' + esc(p) + '">' + esc(p) + '</option>').join('') + '</select>' +
        '<div class="toolbar-spacer"></div>' +
        '<button type="button" class="btn btn-soft btn-sm" data-action="export-students">' + icon('download') + 'Export CSV</button></div>' +
        '<div class="table-wrap"><table class="table" id="students-table"><thead><tr><th>Student</th><th>ID</th><th>Program</th><th>Year</th><th>Courses</th><th>GPA</th><th class="th-actions">Actions</th></tr></thead>' +
        '<tbody>' + (rows || '') + '<tr data-empty ' + (rows ? 'hidden' : '') + '><td colspan="7">' + emptyState('users', 'No students yet', 'Add your first student to get started.') + '</td></tr></tbody></table></div>' +
      '</div></div>';
  }

  /* ---------- admin: courses ---------- */
  function adminCoursesPage() {
    const semesters = [...new Set(db.courses.map((c) => c.semester))].sort(semesterSortDesc);
    const rows = db.courses.slice().sort((a, b) => a.code.localeCompare(b.code)).map((c) => {
      const count = courseEnrollmentCount(c.id);
      const pct = Math.min(100, count / c.capacity * 100);
      return '<tr data-row data-search="' + esc((c.code + ' ' + c.title + ' ' + c.instructor).toLowerCase()) + '" data-semester="' + esc(c.semester) + '">' +
        '<td><div class="cell-course"><span class="course-tag palette-' + paletteIndex(c.id) + '">' + esc(c.code) + '</span><div><strong>' + esc(c.title) + '</strong><span class="cell-sub">' + c.credits + ' credits</span></div></div></td>' +
        '<td>' + esc(c.instructor) + '</td>' +
        '<td><span class="cell-sub">' + esc(daysLabel(c.days)) + '</span><span class="mono">' + esc(timeRange(c.start, c.end)) + '</span><span class="cell-sub">' + esc(c.room) + '</span></td>' +
        '<td><div class="enroll-cell"><span><strong>' + count + '</strong> / ' + c.capacity + '</span><div class="mini-bar"><i style="width:' + pct + '%"></i></div></div></td>' +
        '<td>' + esc(c.semester) + '</td>' +
        '<td><div class="row-actions"><button type="button" class="icon-btn" data-action="open-assignments" data-id="' + c.id + '" title="Assignments">' + icon('clipboard') + '</button>' +
        '<button type="button" class="icon-btn" data-action="open-course-modal" data-id="' + c.id + '" title="Edit course">' + icon('edit') + '</button>' +
        '<button type="button" class="icon-btn danger" data-action="delete-course" data-id="' + c.id + '" title="Delete course">' + icon('trash') + '</button></div></td></tr>';
    }).join('');

    return '<div class="page-stack">' +
      '<div class="section-head"><div><h2>Course catalog</h2><p>' + db.courses.length + ' courses · ' + db.courses.filter((c) => c.semester === CURRENT).length + ' active this semester</p></div>' +
      '<button type="button" class="btn btn-primary" data-action="open-course-modal">' + icon('plus') + 'Add course</button></div>' +
      '<div class="card table-card"><div class="toolbar">' +
        '<div class="search-box">' + icon('search') + '<input type="search" placeholder="Search code, title or instructor…" data-filter-for="courses-table" data-key="search" aria-label="Search courses"></div>' +
        '<select class="select" data-filter-for="courses-table" data-key="semester" aria-label="Filter by semester"><option value="">All semesters</option>' +
        semesters.map((s) => '<option value="' + esc(s) + '">' + esc(s) + '</option>').join('') + '</select></div>' +
        '<div class="table-wrap"><table class="table" id="courses-table"><thead><tr><th>Course</th><th>Instructor</th><th>Schedule</th><th>Enrollment</th><th>Semester</th><th class="th-actions">Actions</th></tr></thead>' +
        '<tbody>' + (rows || '') + '<tr data-empty ' + (rows ? 'hidden' : '') + '><td colspan="6">' + emptyState('book', 'No courses yet', 'Add your first course to the catalog.') + '</td></tr></tbody></table></div>' +
      '</div></div>';
  }

  /* ---------- admin: enrollments ---------- */
  function adminEnrollmentsPage() {
    const students = db.users.filter((u) => u.role === 'student');
    const courses = db.courses.slice().sort((a, b) => a.code.localeCompare(b.code));
    const list = db.enrollments.slice().sort((a, b) => {
      const sem = semesterSortDesc(a.semester, b.semester);
      if (sem !== 0) return sem;
      const ua = userById(a.studentId);
      const ub = userById(b.studentId);
      return String(ua ? ua.name : '').localeCompare(String(ub ? ub.name : ''));
    });

    const rows = list.map((e) => {
      const s = userById(e.studentId);
      const c = courseById(e.courseId);
      if (!s || !c) return '';
      const options = '<option value="">—</option>' + window.GRADE_ORDER.map((g) =>
        '<option value="' + g + '"' + (e.grade === g ? ' selected' : '') + '>' + g + '</option>').join('');
      return '<tr data-row data-search="' + esc((s.name + ' ' + (s.studentId || '') + ' ' + c.code + ' ' + c.title).toLowerCase()) + '" data-student="' + esc(s.id) + '" data-course="' + esc(c.id) + '">' +
        '<td><div class="cell-user">' + avatar(s, 'avatar-sm') + '<div><strong>' + esc(s.name) + '</strong><span class="cell-sub">' + esc(s.studentId || '') + '</span></div></div></td>' +
        '<td><div class="cell-course"><span class="course-tag palette-' + paletteIndex(c.id) + '">' + esc(c.code) + '</span><div><strong>' + esc(c.title) + '</strong><span class="cell-sub">' + c.credits + ' cr</span></div></div></td>' +
        '<td>' + esc(e.semester) + '</td>' +
        '<td><select class="grade-select" data-grade-select data-id="' + e.id + '" aria-label="Grade for ' + esc(s.name) + '">' + options + '</select></td>' +
        '<td>' + (e.grade ? badge('Completed', 'success') : badge('Enrolled', 'info')) + '</td>' +
        '<td><button type="button" class="icon-btn danger" data-action="drop-enrollment" data-id="' + e.id + '" title="Remove enrollment">' + icon('trash') + '</button></td></tr>';
    }).join('');

    return '<div class="page-stack">' +
      '<div class="section-head"><div><h2>Enrollment records</h2><p>' + db.enrollments.length + ' total · ' +
        db.enrollments.filter((e) => e.semester === CURRENT).length + ' active this semester</p></div>' +
        '<button type="button" class="btn btn-primary" data-action="open-enrollment-modal">' + icon('plus') + 'Enroll student</button></div>' +
      '<div class="card table-card"><div class="toolbar">' +
        '<div class="search-box">' + icon('search') + '<input type="search" placeholder="Search student or course…" data-filter-for="enrollments-table" data-key="search" aria-label="Search enrollments"></div>' +
        '<select class="select" data-filter-for="enrollments-table" data-key="student" aria-label="Filter by student"><option value="">All students</option>' +
        students.slice().sort((a, b) => a.name.localeCompare(b.name)).map((s) => '<option value="' + s.id + '">' + esc(s.name) + '</option>').join('') + '</select>' +
        '<select class="select" data-filter-for="enrollments-table" data-key="course" aria-label="Filter by course"><option value="">All courses</option>' +
        courses.map((c) => '<option value="' + c.id + '">' + esc(c.code) + ' · ' + esc(c.title) + '</option>').join('') + '</select></div>' +
        '<div class="table-wrap"><table class="table" id="enrollments-table"><thead><tr><th>Student</th><th>Course</th><th>Semester</th><th>Grade</th><th>Status</th><th class="th-actions">Actions</th></tr></thead>' +
        '<tbody>' + rows + '<tr data-empty hidden><td colspan="6">' + emptyState('layers', 'No matches', 'Try clearing the filters.') + '</td></tr></tbody></table></div>' +
        '<p class="table-note">' + icon('alert') + 'Selecting a grade marks the enrollment as completed and updates the student transcript and GPA.</p>' +
      '</div></div>';
  }

  /* ---------- modals ---------- */
  function openStudentModal(id) {
    const s = id ? userById(id) : null;
    const programs = [...new Set(db.users.filter((x) => x.role === 'student').map((x) => x.program))].sort();
    const years = [1, 2, 3, 4];
    openModal(modalHead(s ? 'Edit student' : 'Add student', s ? 'Update the record for ' + s.name : 'Create a new student record') +
      '<form data-form="student" data-id="' + (s ? s.id : '') + '"><div class="modal-body"><div class="form-grid">' +
        '<label class="field"><span>Full name</span><input name="name" value="' + esc(s ? s.name : '') + '" placeholder="Jane Doe" required></label>' +
        '<label class="field"><span>Email address</span><input name="email" type="email" value="' + esc(s ? s.email : '') + '" placeholder="jane@campus.edu" required></label>' +
        '<label class="field"><span>Password ' + (s ? '(leave blank to keep)' : '') + '</span><input name="password" type="text" value="" placeholder="' +
          (s ? 'Unchanged' : 'student123') + '" ' + (s ? '' : 'required') + '></label>' +
        '<label class="field"><span>Student ID</span><input name="studentId" value="' + esc(s ? (s.studentId || '') : '') + '" placeholder="Auto-generated"></label>' +
        '<label class="field"><span>Program</span><input name="program" list="program-list" value="' + esc(s ? s.program : 'BSc Computer Science') + '" required>' +
          '<datalist id="program-list">' + programs.map((p) => '<option value="' + esc(p) + '">').join('') + '</datalist></label>' +
        '<label class="field"><span>Year</span><select name="year">' + years.map((y) => '<option value="' + y + '"' + (s && s.year === y ? ' selected' : (s ? '' : y === 1 ? ' selected' : '')) + '>Year ' + y + '</option>').join('') + '</select></label>' +
        '<label class="field"><span>Phone</span><input name="phone" value="' + esc(s ? (s.phone || '') : '') + '" placeholder="(555) 000-0000"></label>' +
        '<label class="field"><span>Advisor</span><input name="advisor" value="' + esc(s ? (s.advisor || '') : '') + '" placeholder="Prof. …"></label>' +
        '<label class="field full"><span>Address</span><input name="address" value="' + esc(s ? (s.address || '') : '') + '" placeholder="Street, city"></label>' +
      '</div></div><div class="modal-actions"><button type="button" class="btn" data-action="close-modal">Cancel</button>' +
      '<button type="submit" class="btn btn-primary">' + icon('check') + (s ? 'Save changes' : 'Create student') + '</button></div></form>', 'modal-lg');
  }

  function openCourseModal(id) {
    const c = id ? courseById(id) : null;
    const semesters = [...new Set([CURRENT, 'Spring 2026', 'Fall 2025', 'Spring 2025'].concat(db.courses.map((x) => x.semester)))].sort(semesterSortDesc);
    const days = WEEK_DAYS.map((d) => '<label class="day-check"><input type="checkbox" name="days" value="' + d + '"' +
      (c && (c.days || []).includes(d) ? ' checked' : '') + '><span>' + d + '</span></label>').join('');
    openModal(modalHead(c ? 'Edit course' : 'Add course', c ? 'Update ' + c.code + ' · ' + c.title : 'Create a new course section') +
      '<form data-form="course" data-id="' + (c ? c.id : '') + '"><div class="modal-body"><div class="form-grid">' +
        '<label class="field"><span>Course code</span><input name="code" value="' + esc(c ? c.code : '') + '" placeholder="CS101" required></label>' +
        '<label class="field"><span>Credits</span><input name="credits" type="number" min="1" max="6" value="' + (c ? c.credits : 3) + '" required></label>' +
        '<label class="field full"><span>Course title</span><input name="title" value="' + esc(c ? c.title : '') + '" placeholder="Introduction to Computing" required></label>' +
        '<label class="field"><span>Instructor</span><input name="instructor" value="' + esc(c ? c.instructor : '') + '" placeholder="Prof. …" required></label>' +
        '<label class="field"><span>Capacity</span><input name="capacity" type="number" min="1" max="500" value="' + (c ? c.capacity : 30) + '" required></label>' +
        '<label class="field"><span>Semester</span><select name="semester">' + semesters.map((s) => '<option value="' + esc(s) + '"' + (c && c.semester === s ? ' selected' : (!c && s === CURRENT ? ' selected' : '')) + '>' + esc(s) + '</option>').join('') + '</select></label>' +
        '<label class="field"><span>Room</span><input name="room" value="' + esc(c ? c.room : '') + '" placeholder="A-101" required></label>' +
        '<div class="field full"><span>Class days</span><div class="day-picker">' + days + '</div></div>' +
        '<label class="field"><span>Start time</span><input name="start" type="time" value="' + esc(c ? c.start : '09:00') + '" required></label>' +
        '<label class="field"><span>End time</span><input name="end" type="time" value="' + esc(c ? c.end : '10:30') + '" required></label>' +
        '<label class="field full"><span>Description</span><textarea name="description" rows="3" placeholder="What will students learn?">' + esc(c ? c.description : '') + '</textarea></label>' +
      '</div></div><div class="modal-actions"><button type="button" class="btn" data-action="close-modal">Cancel</button>' +
      '<button type="submit" class="btn btn-primary">' + icon('check') + (c ? 'Save course' : 'Create course') + '</button></div></form>', 'modal-lg');
  }

  function openAssignmentsModal(courseId) {
    const c = courseById(courseId);
    if (!c) return;
    const list = db.assignments.filter((a) => a.courseId === courseId).sort((a, b) => new Date(a.due) - new Date(b.due));
    const rows = list.length
      ? list.map((a) => '<div class="manage-row"><div><strong>' + esc(a.title) + '</strong><span>Due ' + esc(dateTime(a.due)) + ' · ' + a.points +
        ' points · ' + a.submissions.length + ' submitted</span></div><button type="button" class="icon-btn danger" data-action="delete-assignment" data-id="' + a.id + '" data-course="' + courseId + '" title="Delete assignment">' + icon('trash') + '</button></div>').join('')
      : '<p class="muted">No assignments yet for this course.</p>';

    openModal(modalHead('Assignments · ' + c.code, c.title + ' · ' + esc(CURRENT)) + '<div class="modal-body"><div class="manage-list">' + rows + '</div>' +
      '<form data-form="assignment" data-course="' + courseId + '" class="inline-form"><h4>Add an assignment</h4><div class="form-grid">' +
        '<label class="field full"><span>Title</span><input name="title" placeholder="Problem Set 6" required></label>' +
        '<label class="field"><span>Due date & time</span><input name="due" type="datetime-local" required></label>' +
        '<label class="field"><span>Points</span><input name="points" type="number" min="1" max="500" value="100" required></label>' +
      '</div><div class="form-actions"><button type="submit" class="btn btn-primary btn-sm">' + icon('plus') + 'Add assignment</button></div></form></div>' +
      '<div class="modal-actions"><button type="button" class="btn" data-action="close-modal">Done</button></div>', 'modal-lg');
  }

  function openEnrollmentModal() {
    const students = db.users.filter((u) => u.role === 'student').sort((a, b) => a.name.localeCompare(b.name));
    const courses = db.courses.filter((c) => c.semester === CURRENT).sort((a, b) => a.code.localeCompare(b.code));
    openModal(modalHead('Enroll a student', 'Choose a student and an open section for ' + CURRENT) +
      '<form data-form="enroll"><div class="modal-body"><div class="form-grid">' +
        '<label class="field full"><span>Student</span><select name="studentId" required><option value="">Select a student…</option>' +
        students.map((s) => '<option value="' + s.id + '">' + esc(s.name) + ' · ' + esc(s.studentId || '') + '</option>').join('') + '</select></label>' +
        '<label class="field full"><span>Course</span><select name="courseId" required><option value="">Select a course…</option>' +
        courses.map((c) => '<option value="' + c.id + '">' + esc(c.code) + ' · ' + esc(c.title) + ' (' + seatsLeft(c) + ' seats left)</option>').join('') + '</select></label>' +
      '</div><p class="form-hint">' + icon('alert') + 'Schedule conflicts and full sections are blocked automatically.</p></div>' +
      '<div class="modal-actions"><button type="button" class="btn" data-action="close-modal">Cancel</button>' +
      '<button type="submit" class="btn btn-primary">' + icon('check') + 'Enroll student</button></div></form>');
  }

  function openAnnouncementModal() {
    openModal(modalHead('Post an announcement', 'Publish a campus update') +
      '<form data-form="announcement"><div class="modal-body"><div class="form-grid">' +
        '<label class="field full"><span>Title</span><input name="title" placeholder="Midterm schedule published" required></label>' +
        '<label class="field full"><span>Message</span><textarea name="body" rows="5" placeholder="Write the details students and staff need…" required></textarea></label>' +
        '<label class="field"><span>Audience</span><select name="audience"><option value="all">Everyone</option><option value="student">Students only</option><option value="admin">Staff only</option></select></label>' +
      '</div></div><div class="modal-actions"><button type="button" class="btn" data-action="close-modal">Cancel</button>' +
      '<button type="submit" class="btn btn-primary">' + icon('bell') + 'Publish</button></div></form>');
  }

  /* ---------- table filtering ---------- */
  function applyTableFilters(tableId) {
    const table = document.getElementById(tableId);
    if (!table) return;
    const controls = $$('[data-filter-for="' + tableId + '"]');
    const rows = $$('tbody tr[data-row]', table);
    let visible = 0;
    rows.forEach((row) => {
      let show = true;
      controls.forEach((ctrl) => {
        const key = ctrl.dataset.key;
        const raw = String(ctrl.value || '').trim().toLowerCase();
        if (!raw) return;
        const value = String(row.dataset[key] || '').toLowerCase();
        if (key === 'search') {
          if (!value.includes(raw)) show = false;
        } else if (value !== raw) {
          show = false;
        }
      });
      row.hidden = !show;
      if (show) visible += 1;
    });
    const emptyRow = table.querySelector('tr[data-empty]');
    if (emptyRow) emptyRow.hidden = visible > 0;
  }

  /* ---------- exports ---------- */
  function exportStudents() {
    const students = db.users.filter((u) => u.role === 'student');
    const rows = [['Name', 'Email', 'Student ID', 'Program', 'Year', 'GPA', 'Credits earned']];
    students.forEach((s) => {
      const gpa = calcGPA(s.id);
      rows.push([s.name, s.email, s.studentId || '', s.program, s.year, gpa ? gpa.toFixed(2) : '', creditsEarned(s.id)]);
    });
    const csv = rows.map((r) => r.map((v) => '"' + String(v).replace(/"/g, '""') + '"').join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'campusone-students.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast('Student list exported');
  }

  const STUDENT_COLORS = ['#4f46e5', '#0284c7', '#059669', '#d97706', '#e11d48', '#7c3aed', '#0f766e'];

  /* ---------- enrollment actions ---------- */
  function enrollStudentInCourse(studentId, courseId) {
    const student = userById(studentId);
    const course = courseById(courseId);
    if (!student || student.role !== 'student') return toast('Choose a valid student.', 'error');
    if (!course) return toast('Choose a valid course.', 'error');
    if (course.semester !== CURRENT) return toast('That course is not open for enrollment.', 'error');
    if (isEnrolled(student.id, course.id)) return toast(student.name + ' is already enrolled in ' + course.code + '.', 'info');
    if (seatsLeft(course) <= 0) return toast('That section is full.', 'error');
    if (hasConflict(student.id, course)) return toast('That course conflicts with ' + firstName(student.name) + '\'s current schedule.', 'error');
    db.enrollments.push({ id: uid('e'), studentId: student.id, courseId: course.id, semester: course.semester, grade: null });
    saveDB();
    closeModal();
    render();
    toast('Enrolled ' + firstName(student.name) + ' in ' + course.code);
  }

  function requestDropEnrollment(id) {
    const e = db.enrollments.find((x) => x.id === id);
    if (!e) return;
    const student = userById(e.studentId);
    const course = courseById(e.courseId);
    if (!student || !course) return;
    const me = currentUser();
    const own = me && me.id === student.id;
    confirmDialog({
      title: 'Drop ' + course.code + '?',
      message: 'Remove ' + (own ? 'this course from your schedule' : course.code + ' from ' + student.name + 's record') +
        '. Related assignment submissions for this course will also be cleared.',
      confirmLabel: 'Drop course',
      onConfirm: () => {
        db.enrollments = db.enrollments.filter((x) => x.id !== id);
        db.assignments.forEach((a) => {
          if (a.courseId === course.id) a.submissions = a.submissions.filter((sid) => sid !== student.id);
        });
        saveDB();
        render();
        toast('Dropped ' + course.code);
      }
    });
  }

  /* ---------- form handlers ---------- */
  function handleLogin(form) {
    const fd = new FormData(form);
    const email = String(fd.get('email') || '').trim().toLowerCase();
    const password = String(fd.get('password') || '');
    const user = db.users.find((u) => u.email.toLowerCase() === email && u.password === password);
    const error = $('#login-error');
    if (!user) {
      if (error) {
        error.textContent = 'Incorrect email or password. Try one of the demo accounts below.';
        error.hidden = false;
      }
      form.classList.add('shake');
      setTimeout(() => form.classList.remove('shake'), 420);
      return;
    }
    loginUser(user);
  }

  function loginUser(user) {
    session = user.id;
    try { localStorage.setItem(SESSION_KEY, session); } catch (e) { /* ignore */ }
    if (location.hash !== '#/dashboard') history.replaceState(null, '', '#/dashboard');
    render();
    toast('Welcome back, ' + firstName(user.name) + '!');
  }

  function saveStudent(form) {
    const fd = new FormData(form);
    const data = Object.fromEntries(fd.entries());
    const id = form.dataset.id;
    const name = String(data.name || '').trim();
    const email = String(data.email || '').trim().toLowerCase();
    if (!name || !email) return toast('Name and email are required.', 'error');
    if (db.users.some((x) => x.id !== id && x.email.toLowerCase() === email)) {
      return toast('That email address is already in use.', 'error');
    }
    const year = Number(data.year) || 1;
    if (id) {
      const student = userById(id);
      if (!student) return;
      student.name = name;
      student.email = email;
      student.program = String(data.program || '').trim() || student.program;
      student.year = year;
      student.phone = String(data.phone || '').trim();
      student.address = String(data.address || '').trim();
      student.advisor = String(data.advisor || '').trim();
      student.studentId = String(data.studentId || '').trim() || student.studentId;
      if (data.password) student.password = String(data.password);
      toast('Student record updated');
    } else {
      const count = db.users.filter((x) => x.role === 'student').length;
      db.users.push({
        id: uid('u'), role: 'student', name: name, email: email,
        password: String(data.password || 'student123'),
        studentId: String(data.studentId || '').trim() || 'S-' + new Date().getFullYear() + '-' + String(count + 1).padStart(3, '0'),
        program: String(data.program || '').trim() || 'Undeclared',
        year: year, advisor: String(data.advisor || '').trim(),
        phone: String(data.phone || '').trim(), address: String(data.address || '').trim(),
        color: STUDENT_COLORS[count % STUDENT_COLORS.length]
      });
      toast('Student created');
    }
    saveDB();
    closeModal();
    render();
  }

  function saveCourse(form) {
    const fd = new FormData(form);
    const data = Object.fromEntries(fd.entries());
    const days = fd.getAll('days').filter((d) => WEEK_DAYS.includes(d));
    const id = form.dataset.id;
    const credits = Number(data.credits);
    const capacity = Number(data.capacity);
    const code = String(data.code || '').trim().toUpperCase();
    const title = String(data.title || '').trim();
    if (!code || !title) return toast('Course code and title are required.', 'error');
    if (!days.length) return toast('Select at least one class day.', 'error');
    if (toMinutes(data.end) <= toMinutes(data.start)) return toast('End time must be after the start time.', 'error');
    if (!credits || credits < 1 || !capacity || capacity < 1) return toast('Credits and capacity must be positive.', 'error');
    const payload = {
      code: code, title: title, instructor: String(data.instructor || '').trim(),
      credits: credits, capacity: capacity, semester: String(data.semester || CURRENT),
      days: days, start: String(data.start || '09:00'), end: String(data.end || '10:00'),
      room: String(data.room || '').trim() || 'TBA', description: String(data.description || '').trim()
    };
    if (id) {
      const course = courseById(id);
      if (!course) return;
      if (capacity < courseEnrollmentCount(id)) return toast('Capacity cannot be lower than the ' + courseEnrollmentCount(id) + ' students already enrolled.', 'error');
      Object.assign(course, payload);
      db.enrollments.forEach((e) => { if (e.courseId === id) e.semester = payload.semester; });
      toast('Course updated');
    } else {
      db.courses.push(Object.assign({ id: uid('c') }, payload));
      toast('Course created');
    }
    saveDB();
    closeModal();
    render();
  }

  function saveAssignment(form) {
    const fd = new FormData(form);
    const data = Object.fromEntries(fd.entries());
    const courseId = form.dataset.course;
    let due = String(data.due || '');
    if (!due) return toast('Choose a due date.', 'error');
    if (due.length === 16) due += ':00';
    db.assignments.push({
      id: uid('a'), courseId: courseId,
      title: String(data.title || '').trim() || 'Untitled assignment',
      due: due, points: Number(data.points) || 100, submissions: []
    });
    saveDB();
    render();
    openAssignmentsModal(courseId);
    toast('Assignment added');
  }

  function saveAnnouncement(form) {
    const fd = new FormData(form);
    const data = Object.fromEntries(fd.entries());
    const u = currentUser();
    if (!u) return;
    db.announcements.unshift({
      id: uid('an'), title: String(data.title || '').trim(),
      body: String(data.body || '').trim(),
      date: new Date().toISOString(), author: u.name,
      audience: String(data.audience || 'all')
    });
    saveDB();
    closeModal();
    render();
    toast('Announcement published');
  }

  function saveProfile(form) {
    const u = currentUser();
    if (!u) return;
    const fd = new FormData(form);
    const data = Object.fromEntries(fd.entries());
    const name = String(data.name || '').trim();
    const email = String(data.email || '').trim().toLowerCase();
    if (!name || !email) return toast('Name and email are required.', 'error');
    if (db.users.some((x) => x.id !== u.id && x.email.toLowerCase() === email)) {
      return toast('That email address is already in use.', 'error');
    }
    u.name = name;
    u.email = email;
    u.phone = String(data.phone || '').trim();
    u.address = String(data.address || '').trim();
    saveDB();
    render();
    toast('Profile updated');
  }

  function savePassword(form) {
    const u = currentUser();
    if (!u) return;
    const fd = new FormData(form);
    const data = Object.fromEntries(fd.entries());
    if (String(data.current || '') !== u.password) return toast('Your current password is incorrect.', 'error');
    if (String(data.next || '').length < 6) return toast('The new password must be at least 6 characters.', 'error');
    if (data.next !== data.confirm) return toast('The new passwords do not match.', 'error');
    u.password = String(data.next);
    saveDB();
    form.reset();
    toast('Password updated');
  }

  function toggleSubmission(assignmentId) {
    const u = currentUser();
    const a = db.assignments.find((x) => x.id === assignmentId);
    if (!u || !a) return;
    if (a.submissions.includes(u.id)) {
      a.submissions = a.submissions.filter((id) => id !== u.id);
      toast('Submission removed', 'info');
    } else {
      a.submissions.push(u.id);
      toast('Marked as submitted');
    }
    saveDB();
    render();
  }

  function setGrade(select) {
    const e = db.enrollments.find((x) => x.id === select.dataset.id);
    if (!e) return;
    e.grade = select.value || null;
    saveDB();
    const td = select.closest('td');
    const statusCell = td ? td.nextElementSibling : null;
    if (statusCell) statusCell.innerHTML = e.grade ? badge('Completed', 'success') : badge('Enrolled', 'info');
    if (e.grade) toast('Grade ' + e.grade + ' saved');
  }

  function saveEnrollment(form) {
    const fd = new FormData(form);
    enrollStudentInCourse(String(fd.get('studentId') || ''), String(fd.get('courseId') || ''));
  }

  /* ---------- events ---------- */
  function closeSidebar() {
    const sidebar = $('#sidebar');
    if (sidebar) sidebar.classList.remove('open');
    document.body.classList.remove('sidebar-open');
  }

  function onClick(e) {
    if (e.target.matches('[data-modal-backdrop]')) { closeModal(); return; }

    const panel = $('#notif-panel');
    if (panel && !e.target.closest('.notif-wrap')) panel.classList.remove('open');
    if (e.target.closest('a.nav-link, a.notif-item')) closeSidebar();

    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    const id = btn.dataset.id;

    switch (action) {
      case 'toggle-theme': {
        const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
        document.documentElement.dataset.theme = next;
        try { localStorage.setItem(THEME_KEY, next); } catch (err) { /* ignore */ }
        break;
      }
      case 'toggle-sidebar': {
        const sidebar = $('#sidebar');
        if (!sidebar) break;
        sidebar.classList.toggle('open');
        document.body.classList.toggle('sidebar-open', sidebar.classList.contains('open'));
        break;
      }
      case 'close-sidebar':
        closeSidebar();
        break;
      case 'toggle-notifications': {
        const target = $('#notif-panel');
        if (target) {
          const isOpen = target.classList.toggle('open');
          btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        }
        break;
      }
      case 'logout':
        session = null;
        try { localStorage.removeItem(SESSION_KEY); } catch (err) { /* ignore */ }
        closeSidebar();
        history.replaceState(null, '', '#/login');
        render();
        toast('Signed out', 'info');
        break;
      case 'demo-login': {
        const user = db.users.find((u) => u.email.toLowerCase() === String(btn.dataset.email || '').toLowerCase());
        if (user) loginUser(user);
        break;
      }
      case 'forgot':
        toast('This demo does not send email. Use one of the demo accounts below.', 'info');
        break;
      case 'reset-data':
        confirmDialog({
          title: 'Reset demo data?',
          message: 'All changes will be lost and the original sample students, courses, grades and announcements will be restored.',
          confirmLabel: 'Reset everything',
          onConfirm: () => {
            try {
              localStorage.removeItem(DB_KEY);
              localStorage.removeItem(SESSION_KEY);
            } catch (err) { /* ignore */ }
            location.reload();
          }
        });
        break;
      case 'assignment-filter':
        ui.assignmentFilter = btn.dataset.filter || 'all';
        render();
        break;
      case 'scroll-catalog': {
        const target = document.getElementById('catalog');
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        break;
      }
      case 'print':
        window.print();
        break;
      case 'export-students':
        exportStudents();
        break;
      case 'open-student-modal':
        openStudentModal(id || null);
        break;
      case 'delete-student': {
        const student = userById(id);
        if (!student) break;
        confirmDialog({
          title: 'Delete ' + student.name + '?',
          message: 'This removes the student record, all enrollments and all assignment submissions. This cannot be undone.',
          onConfirm: () => {
            db.users = db.users.filter((u) => u.id !== student.id);
            db.enrollments = db.enrollments.filter((en) => en.studentId !== student.id);
            db.assignments.forEach((a) => { a.submissions = a.submissions.filter((sid) => sid !== student.id); });
            saveDB();
            render();
            toast('Student deleted');
          }
        });
        break;
      }
      case 'open-course-modal':
        openCourseModal(id || null);
        break;
      case 'delete-course': {
        const course = courseById(id);
        if (!course) break;
        confirmDialog({
          title: 'Delete ' + course.code + '?',
          message: 'This removes the course, its ' + courseEnrollmentCount(course.id) + ' enrollments and all of its assignments.',
          onConfirm: () => {
            db.courses = db.courses.filter((c) => c.id !== course.id);
            db.enrollments = db.enrollments.filter((en) => en.courseId !== course.id);
            db.assignments = db.assignments.filter((a) => a.courseId !== course.id);
            saveDB();
            render();
            toast('Course deleted');
          }
        });
        break;
      }
      case 'open-assignments':
        openAssignmentsModal(id);
        break;
      case 'delete-assignment': {
        const assignment = db.assignments.find((a) => a.id === id);
        if (!assignment) break;
        const courseId = assignment.courseId;
        confirmDialog({
          title: 'Delete assignment?',
          message: 'Remove "' + assignment.title + '" and its submissions from the course.',
          onConfirm: () => {
            db.assignments = db.assignments.filter((a) => a.id !== assignment.id);
            saveDB();
            render();
            openAssignmentsModal(courseId);
            toast('Assignment deleted');
          }
        });
        break;
      }
      case 'open-enrollment-modal':
        openEnrollmentModal();
        break;
      case 'drop-enrollment':
        requestDropEnrollment(id);
        break;
      case 'enroll': {
        const u = currentUser();
        if (u) enrollStudentInCourse(u.id, id);
        break;
      }
      case 'toggle-submission':
        toggleSubmission(id);
        break;
      case 'open-announcement-modal':
        openAnnouncementModal();
        break;
      case 'delete-announcement': {
        const announcement = db.announcements.find((a) => a.id === id);
        if (!announcement) break;
        confirmDialog({
          title: 'Delete announcement?',
          message: 'Remove "' + announcement.title + '" from the campus feed.',
          onConfirm: () => {
            db.announcements = db.announcements.filter((a) => a.id !== announcement.id);
            saveDB();
            render();
            toast('Announcement deleted');
          }
        });
        break;
      }
      case 'close-modal':
        closeModal();
        break;
      case 'confirm-ok': {
        const fn = ui.confirm;
        closeModal();
        if (fn) fn();
        break;
      }
      default:
        break;
    }
  }

  function onSubmit(e) {
    const form = e.target.closest('form[data-form]');
    if (!form) return;
    e.preventDefault();
    switch (form.dataset.form) {
      case 'login': handleLogin(form); break;
      case 'student': saveStudent(form); break;
      case 'course': saveCourse(form); break;
      case 'assignment': saveAssignment(form); break;
      case 'announcement': saveAnnouncement(form); break;
      case 'enroll': saveEnrollment(form); break;
      case 'profile': saveProfile(form); break;
      case 'password': savePassword(form); break;
      default: break;
    }
  }

  function onChange(e) {
    if (e.target.matches('[data-grade-select]')) { setGrade(e.target); return; }
    if (e.target.matches('[data-filter-for]')) applyTableFilters(e.target.dataset.filterFor);
  }

  function onInput(e) {
    if (e.target.matches('[data-filter-for]')) applyTableFilters(e.target.dataset.filterFor);
  }

  function onKey(e) {
    if (e.key === 'Escape') {
      closeModal();
      closeSidebar();
      const panel = $('#notif-panel');
      if (panel) panel.classList.remove('open');
    }
  }

  /* ---------- pages & rendering ---------- */
  const PAGES = {
    student: {
      dashboard: studentDashboard,
      courses: studentCourses,
      schedule: studentSchedule,
      assignments: studentAssignmentsPage,
      grades: studentGrades,
      announcements: announcementsPage,
      profile: profilePage
    },
    admin: {
      dashboard: adminDashboard,
      students: adminStudentsPage,
      courses: adminCoursesPage,
      enrollments: adminEnrollmentsPage,
      announcements: announcementsPage,
      profile: profilePage
    }
  };

  function parseRoute() {
    return location.hash.replace(/^#\/?/, '').trim() || 'dashboard';
  }

  function render() {
    const root = $('#root');
    const user = currentUser();
    if (!user) {
      session = null;
      try { localStorage.removeItem(SESSION_KEY); } catch (e) { /* ignore */ }
      root.innerHTML = loginView();
      document.body.classList.remove('signed-in');
      document.title = 'Sign in · CampusOne';
      return;
    }
    const routes = ROUTES[user.role] || ROUTES.student;
    let route = parseRoute();
    if (!routes.some((r) => r.key === route)) {
      route = 'dashboard';
      history.replaceState(null, '', '#/dashboard');
    }
    const content = PAGES[user.role][route](user);
    root.innerHTML = shell(user, routes, route, content);
    document.body.classList.add('signed-in');
    document.title = PAGE_META[user.role][route].title + ' · CampusOne';
  }

  function init() {
    db = loadDB();
    try { session = localStorage.getItem(SESSION_KEY); } catch (e) { session = null; }
    if (session && !userById(session)) session = null;

    document.addEventListener('click', onClick);
    document.addEventListener('submit', onSubmit);
    document.addEventListener('change', onChange);
    document.addEventListener('input', onInput);
    document.addEventListener('keydown', onKey);
    window.addEventListener('hashchange', () => {
      render();
      window.scrollTo({ top: 0, behavior: 'auto' });
    });

    render();
  }

  init();
})();
