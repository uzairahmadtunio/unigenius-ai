import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getProfile from "./tools/get-profile";
import getAttendanceSummary from "./tools/get-attendance";
import listStudyMaterials from "./tools/list-study-materials";
import listUpcomingExams from "./tools/list-upcoming-exams";
import getStudyPlan from "./tools/get-study-plan";
import logStudySession from "./tools/log-study-session";
import listFlashcardSets from "./tools/list-flashcard-sets";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "unigenius-ai",
  title: "UniGenius AI",
  version: "0.1.0",
  instructions:
    "Tools for UniGenius AI, a study assistant for university software-engineering students. Read the signed-in student's academic profile, attendance, study plan, flashcard sets, teacher-uploaded study materials and upcoming exams, and log completed study sessions.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    getProfile,
    getAttendanceSummary,
    getStudyPlan,
    listFlashcardSets,
    listStudyMaterials,
    listUpcomingExams,
    logStudySession,
  ],
});
