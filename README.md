# CampusOne — Student Portal

A frontend-only student portal for **Students** and **Admins**. No backend, no build step, no dependencies — plain HTML, CSS and JavaScript with hash routing and `localStorage` persistence.

## Run it

The app is a static site, so any static server works. It cannot be opened with `file://` (scripts and routing need HTTP).

Option 1 — Node (one-liner, no install):

```powershell
npx --yes serve . -l 4173
```

Option 2 — VS Code Live Server: right-click `index.html` → **Open with Live Server**.

Option 3 — Python:

```powershell
python -m http.server 4173
```

Then open <http://localhost:4173/>.

## Demo accounts

| Role    | Email             | Password   |
| ------- | ----------------- | ---------- |
| Student | `alex@campus.edu` | `student123` |
| Admin   | `admin@campus.edu` | `admin123`  |

Both roles are also reachable from the **demo account** buttons on the sign-in screen. All students in the seed data share the password `student123`.

## What students can do

- **Dashboard** — GPA ring, credit progress, today's classes, upcoming deadlines, recent results, campus news.
- **My Courses** — enrolled sections plus the open catalog, with seat counts, enroll/drop, and time-conflict detection.
- **Schedule** — weekly timetable grid (8 AM–6 PM) with today highlighted and a colour legend.
- **Assignments** — All / Pending / Overdue / Submitted filters, submit and undo submission.
- **Grades** — cumulative and term GPA, credits earned, print-ready transcript.
- **Announcements** — campus feed filtered by audience.
- **Profile** — personal details and password change.

## What admins can do

- **Dashboard** — student/course/enrollment counts, average GPA, enrollment-by-course bars.
- **Students** — create, edit, delete student records; filter by program; export directory to CSV.
- **Courses** — create, edit, delete sections across semesters; add and remove assignments per course.
- **Enrollments** — enroll a student in a course, record grades, drop enrollments; filter by student and course.
- **Announcements** — publish and delete announcements targeted at all / students / admins.
- **Profile** — personal details, password change, and a **Reset demo data** button.

## Project structure

```
index.html          entry page (loads the two scripts)
css/styles.css      design system, layout, responsive and print styles
js/data.js          seed data and grading constants
js/app.js           state, routing, rendering and all event handling
```

## How it works

- **Routing** — hash-based (`#/dashboard`, `#/courses`, …). Each role has its own route table; unknown routes fall back to the dashboard.
- **Storage** — all records live in `localStorage` under `campusone.db.v1`. The signed-in user is `campusone.session.v1`, the theme is `campusone.theme.v1`.
- **Seeding** — on first load the database is cloned from `window.SEED_DB`. Use **Profile → Reset demo data** to restore the original state.
- **Seed contents** — 1 admin, 6 students, 15 courses across Spring 2026 (graded) and Fall 2026 (current), 50 enrollments, 14 assignments and 5 announcements.

## Notes and limitations

- Passwords are stored in plain text in `localStorage`. This is a demo, not real authentication.
- Data is per browser profile and per origin; clearing site data resets everything.
- Modern evergreen browsers only (uses CSS custom properties, `dialog`-style modals and ES2015+ syntax).
