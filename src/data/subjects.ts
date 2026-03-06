import type { Department } from "@/contexts/DepartmentContext";

export interface Subject {
  id: string;
  name: string;
  hasLab: boolean;
  icon: string;
}

const toSlug = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const s = (name: string, hasLab: boolean, icon: string): Subject => ({
  id: toSlug(name),
  name,
  hasLab,
  icon,
});

/* ──────────── SOFTWARE ENGINEERING ──────────── */
const seSubjects: Record<number, Subject[]> = {
  1: [
    s("Introduction to Computing", true, "💻"),
    s("Programming Fundamentals (C++)", true, "⌨️"),
    s("Calculus and Analytical Geometry", false, "📐"),
    s("English Composition & Comprehension", false, "📝"),
    s("Applied Physics / Basic Electronics", false, "⚡"),
    s("Islamic and Religious Studies", false, "📖"),
  ],
  2: [
    s("Object-Oriented Programming (OOP)", true, "🧱"),
    s("Discrete Structures", false, "🔢"),
    s("Software Engineering Concepts", false, "⚙️"),
    s("Technical and Business Writing", false, "✍️"),
    s("Pakistan Studies", false, "🏛️"),
    s("Computer Organization & Assembly Language", false, "🖥️"),
  ],
  3: [
    s("Data Structures and Algorithms", true, "🌳"),
    s("Software Requirements Engineering", false, "📋"),
    s("Linear Algebra", false, "📊"),
    s("Human Computer Interaction (HCI)", false, "🎨"),
    s("University Elective-I", false, "📚"),
  ],
  4: [
    s("Software Design and Architecture", true, "🏗️"),
    s("Database Systems", true, "🗄️"),
    s("Operating Systems", false, "💿"),
    s("Probability and Statistics", false, "📈"),
    s("Numerical Computing", false, "🔬"),
  ],
  5: [
    s("Software Construction & Development", true, "🛠️"),
    s("Computer Communication & Networks", true, "🌐"),
    s("Web Engineering", true, "🕸️"),
    s("Software Quality Engineering", false, "✅"),
    s("Advanced Software Requirement Engineering", false, "📑"),
  ],
  6: [
    s("Software Project Management", false, "📅"),
    s("Software Re-Engineering", false, "🔄"),
    s("Information Security", false, "🔒"),
    s("Mobile App Development", false, "📱"),
    s("AI Supporting Elective", false, "🤖"),
    s("Professional Practices", false, "💼"),
  ],
  7: [
    s("Final Year Project (Part I)", false, "🎓"),
    s("Cloud Computing", false, "☁️"),
    s("Data Science", false, "📊"),
    s("Entrepreneurship", false, "🚀"),
  ],
  8: [
    s("Final Year Project (Part II)", false, "🏆"),
    s("SE Elective-IV", false, "📘"),
    s("SE Elective-V", false, "📗"),
    s("Internship (Field Experience)", false, "🏢"),
  ],
};

/* ──────────── COMPUTER SCIENCE (placeholder — user will provide) ──────────── */
const csSubjects: Record<number, Subject[]> = {
  1: [
    s("Introduction to Computing", true, "💻"),
    s("Programming Fundamentals (C++)", true, "⌨️"),
    s("Calculus and Analytical Geometry", false, "📐"),
    s("English Composition & Comprehension", false, "📝"),
    s("Applied Physics", false, "⚡"),
    s("Islamic and Religious Studies", false, "📖"),
  ],
  2: [
    s("Object-Oriented Programming", true, "🧱"),
    s("Discrete Mathematics", false, "🔢"),
    s("Digital Logic Design", true, "🔌"),
    s("Technical Writing", false, "✍️"),
    s("Pakistan Studies", false, "🏛️"),
    s("Multivariable Calculus", false, "📐"),
  ],
  3: [
    s("Data Structures and Algorithms", true, "🌳"),
    s("Computer Architecture", false, "🖥️"),
    s("Linear Algebra", false, "📊"),
    s("Probability and Statistics", false, "📈"),
    s("University Elective-I", false, "📚"),
  ],
  4: [
    s("Design and Analysis of Algorithms", false, "⚡"),
    s("Database Systems", true, "🗄️"),
    s("Operating Systems", true, "💿"),
    s("Theory of Automata", false, "🔄"),
    s("Numerical Methods", false, "🔬"),
  ],
  5: [
    s("Computer Networks", true, "🌐"),
    s("Compiler Construction", true, "🏗️"),
    s("Artificial Intelligence", false, "🤖"),
    s("Software Engineering", false, "⚙️"),
    s("CS Elective-I", false, "📘"),
  ],
  6: [
    s("Information Security", false, "🔒"),
    s("Parallel & Distributed Computing", false, "🔀"),
    s("Machine Learning", true, "🧠"),
    s("CS Elective-II", false, "📗"),
    s("CS Elective-III", false, "📙"),
    s("Professional Practices", false, "💼"),
  ],
  7: [
    s("Final Year Project (Part I)", false, "🎓"),
    s("Cloud Computing", false, "☁️"),
    s("CS Elective-IV", false, "📕"),
    s("Entrepreneurship", false, "🚀"),
  ],
  8: [
    s("Final Year Project (Part II)", false, "🏆"),
    s("CS Elective-V", false, "📘"),
    s("CS Elective-VI", false, "📗"),
    s("Internship (Field Experience)", false, "🏢"),
  ],
};

/* ──────────── ARTIFICIAL INTELLIGENCE (placeholder — user will provide) ──────────── */
const aiSubjects: Record<number, Subject[]> = {
  1: [
    s("Introduction to Computing", true, "💻"),
    s("Programming Fundamentals (Python)", true, "🐍"),
    s("Calculus and Analytical Geometry", false, "📐"),
    s("English Composition & Comprehension", false, "📝"),
    s("Applied Physics", false, "⚡"),
    s("Islamic and Religious Studies", false, "📖"),
  ],
  2: [
    s("Object-Oriented Programming", true, "🧱"),
    s("Discrete Mathematics", false, "🔢"),
    s("Linear Algebra", false, "📊"),
    s("Technical Writing", false, "✍️"),
    s("Pakistan Studies", false, "🏛️"),
    s("Introduction to AI", false, "🤖"),
  ],
  3: [
    s("Data Structures and Algorithms", true, "🌳"),
    s("Probability and Statistics", false, "📈"),
    s("Database Systems", true, "🗄️"),
    s("Digital Logic Design", true, "🔌"),
    s("University Elective-I", false, "📚"),
  ],
  4: [
    s("Machine Learning", true, "🧠"),
    s("Computer Vision", true, "👁️"),
    s("Operating Systems", false, "💿"),
    s("Multivariate Calculus", false, "📐"),
    s("AI Elective-I", false, "📘"),
  ],
  5: [
    s("Deep Learning", true, "🔮"),
    s("Natural Language Processing", true, "💬"),
    s("Computer Networks", false, "🌐"),
    s("Data Mining", false, "⛏️"),
    s("AI Elective-II", false, "📗"),
  ],
  6: [
    s("Reinforcement Learning", false, "🎯"),
    s("Big Data Analytics", true, "📊"),
    s("Robotics and Autonomous Systems", true, "🤖"),
    s("AI Ethics & Governance", false, "⚖️"),
    s("AI Elective-III", false, "📙"),
    s("Professional Practices", false, "💼"),
  ],
  7: [
    s("Final Year Project (Part I)", false, "🎓"),
    s("Generative AI", false, "✨"),
    s("AI Elective-IV", false, "📕"),
    s("Entrepreneurship", false, "🚀"),
  ],
  8: [
    s("Final Year Project (Part II)", false, "🏆"),
    s("AI Elective-V", false, "📘"),
    s("AI Elective-VI", false, "📗"),
    s("Internship (Field Experience)", false, "🏢"),
  ],
};

/* ──────────── Lookup ──────────── */

const allDepartmentSubjects: Record<Department, Record<number, Subject[]>> = {
  se: seSubjects,
  cs: csSubjects,
  ai: aiSubjects,
};

/** Get subjects for a department and semester */
export const getSubjects = (department: Department, semester: number): Subject[] => {
  return allDepartmentSubjects[department]?.[semester] || [];
};

/** Legacy export for backwards compat — defaults to SE */
export const semesterSubjects = seSubjects;

/** Find a subject by its slug across all departments */
export const findSubjectById = (
  id: string,
  department?: Department | null
): { subject: Subject; semester: number; department: Department } | null => {
  const depts: Department[] = department ? [department] : ["se", "cs", "ai"];
  for (const dept of depts) {
    const subjects = allDepartmentSubjects[dept];
    for (const [sem, list] of Object.entries(subjects)) {
      const found = list.find((s) => s.id === id);
      if (found) return { subject: found, semester: Number(sem), department: dept };
    }
  }
  return null;
};
