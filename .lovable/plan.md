## Plan: Teacher Panel System

### Overview
Add a complete Teacher Panel to UniGenius AI without modifying any existing features. This includes role-based routing, admin user management, and a full teacher dashboard.

### 1. Database Changes (Migration)
- Add `teacher` to the existing `app_role` enum
- Create `question_bank` table (subject, topic, question, options A-D, correct_answer, explanation, created_by)
- Create `study_materials` table (subject, title, description, file_url, file_name, uploaded_by, semester)
- Add RLS policies:
  - Teachers can CRUD their own questions & materials
  - Students can read study materials
  - Admins have full access via existing `has_role` function

### 2. Admin Dashboard Update
- Add "Manage Users" tab in `AdminDashboard.tsx`
- Table showing Name, Email, Role with "Make Teacher" / "Remove Teacher" actions
- Create `admin_manage_role` database function (SECURITY DEFINER) for safe role changes

### 3. New Pages & Components
- **`/teacher-dashboard`** — Teacher landing page with 4 cards: Create Quiz, Upload Material, Question Bank, Student Results
- **Teacher Quiz Creator** — Form to add questions to `question_bank`
- **Teacher Material Upload** — File upload form saving to storage + `study_materials` table
- **Teacher Results Viewer** — Table of student quiz results
- **Route guard** — Redirect unauthorized users

### 4. Login Routing
- Update `Index.tsx` to check role after login:
  - `student` → normal dashboard
  - `teacher` → `/teacher-dashboard`
  - `admin` → `/admin`

### 5. Files to Create
- `src/pages/TeacherDashboard.tsx`
- `src/hooks/use-role.ts` (generic role hook)

### 6. Files to Modify
- `src/pages/AdminDashboard.tsx` (add Manage Users tab)
- `src/App.tsx` (add teacher route)
- `src/components/MobileBottomNav.tsx` (hide on teacher routes)

### Technical Notes
- Uses existing `app_role` enum, `has_role()` function, and `user_roles` table
- No existing features are modified or removed
- Storage bucket `study-materials` created for teacher uploads
