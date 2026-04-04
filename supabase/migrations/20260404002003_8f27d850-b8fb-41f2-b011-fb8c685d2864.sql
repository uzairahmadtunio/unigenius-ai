
-- Performance indexes for frequently queried columns
-- Using IF NOT EXISTS to be safe

CREATE INDEX IF NOT EXISTS idx_attendance_user_id ON public.attendance (user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_user_semester ON public.attendance (user_id, semester);

CREATE INDEX IF NOT EXISTS idx_quiz_results_user_id ON public.quiz_results (user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_results_created_at ON public.quiz_results (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quiz_results_user_created ON public.quiz_results (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_career_activity_user_id ON public.career_activity (user_id);
CREATE INDEX IF NOT EXISTS idx_career_activity_user_created ON public.career_activity (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_logs_user_id ON public.chat_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_chat_logs_user_created ON public.chat_logs (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles (user_id);

CREATE INDEX IF NOT EXISTS idx_study_materials_subject ON public.study_materials (subject);
CREATE INDEX IF NOT EXISTS idx_study_materials_created_at ON public.study_materials (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_university_notices_created ON public.university_notices (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_university_notices_expires ON public.university_notices (expires_at);

CREATE INDEX IF NOT EXISTS idx_exam_schedule_semester_date ON public.exam_schedule (semester, exam_date ASC);

CREATE INDEX IF NOT EXISTS idx_user_notice_reads_user ON public.user_notice_reads (user_id);
CREATE INDEX IF NOT EXISTS idx_user_notice_reads_user_notice ON public.user_notice_reads (user_id, notice_id);

CREATE INDEX IF NOT EXISTS idx_daily_streaks_user ON public.daily_streaks (user_id);

CREATE INDEX IF NOT EXISTS idx_notes_semester_subject ON public.notes (semester, subject);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_user ON public.chat_sessions (user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_payment_requests_user ON public.payment_requests (user_id);

CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON public.bookmarks (user_id);

CREATE INDEX IF NOT EXISTS idx_flashcard_sets_user ON public.flashcard_sets (user_id);

CREATE INDEX IF NOT EXISTS idx_chat_messages_chat ON public.chat_messages (chat_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_group_members_user ON public.group_members (user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group ON public.group_members (group_id);

CREATE INDEX IF NOT EXISTS idx_group_messages_group ON public.group_messages (group_id, created_at DESC);
