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
    s("Programming Fundamentals", true, "⌨️"),
    s("ICT", true, "💻"),
    s("Calculus", false, "📐"),
    s("Applied Physics", false, "⚡"),
    s("English Composition", false, "📝"),
    s("Discrete Structures", false, "🔢"),
    s("Islamic Studies", false, "📖"),
  ],
  2: [
    s("Object-Oriented Programming (OOP)", true, "🧱"),
    s("Digital Logic Design (DLD)", true, "🔌"),
    s("Multivariable Calculus", false, "📐"),
    s("Communication Skills", false, "🗣️"),
    s("Pakistan Studies", false, "🏛️"),
  ],
  3: [
    s("Data Structures & Algorithms (DSA)", true, "🌳"),
    s("Software Requirement Engineering", false, "📋"),
    s("Linear Algebra", false, "📊"),
    s("Computer Organization & Assembly", true, "🖥️"),
    s("Human Computer Interaction (HCI)", false, "🎨"),
  ],
  4: [
    s("Database Systems", true, "🗄️"),
    s("Software Design & Architecture", true, "🏗️"),
    s("Operating Systems", true, "💿"),
    s("Probability & Statistics", false, "📈"),
    s("Technical Writing", false, "✍️"),
  ],
  5: [
    s("Software Construction & Development", true, "🛠️"),
    s("Computer Networks", true, "🌐"),
    s("Analysis of Algorithms", false, "⚡"),
    s("Artificial Intelligence", false, "🤖"),
    s("Software Quality Engineering", false, "✅"),
  ],
  6: [
    s("Web Engineering", true, "🕸️"),
    s("Software Project Management (SPM)", false, "📅"),
    s("Information Security", false, "🔒"),
    s("Professional Practices", false, "💼"),
    s("Technical Elective-I", false, "📘"),
  ],
  7: [
    s("Final Year Project (FYP-I)", false, "🎓"),
    s("Software Re-Engineering", false, "🔄"),
    s("Cloud Computing", false, "☁️"),
    s("SE Elective-II", false, "📗"),
  ],
  8: [
    s("Final Year Project (FYP-II)", false, "🏆"),
    s("Entrepreneurship", false, "🚀"),
    s("SE Elective-III", false, "📙"),
    s("Internship", false, "🏢"),
  ],
};

/* ──────────── COMPUTER SCIENCE ──────────── */
const csSubjects: Record<number, Subject[]> = {
  1: [
    s("Programming Fundamentals", true, "⌨️"),
    s("ICT", true, "💻"),
    s("Calculus", false, "📐"),
    s("Applied Physics", false, "⚡"),
    s("English Composition", false, "📝"),
    s("Discrete Structures", false, "🔢"),
    s("Islamic Studies", false, "📖"),
  ],
  2: [
    s("Object-Oriented Programming (OOP)", true, "🧱"),
    s("Digital Logic Design (DLD)", true, "🔌"),
    s("Multivariable Calculus", false, "📐"),
    s("Communication Skills", false, "🗣️"),
    s("Pakistan Studies", false, "🏛️"),
  ],
  3: [
    s("Data Structures & Algorithms (DSA)", true, "🌳"),
    s("Digital Logic Design", true, "🔌"),
    s("Linear Algebra", false, "📊"),
    s("Multivariable Calculus", false, "📐"),
    s("Statistics & Probability", false, "📈"),
  ],
  4: [
    s("Database Systems", true, "🗄️"),
    s("Operating Systems", true, "💿"),
    s("Theory of Automata", false, "🔄"),
    s("Computer Organization & Assembly", true, "🖥️"),
  ],
  5: [
    s("Design & Analysis of Algorithms", false, "⚡"),
    s("Computer Networks", true, "🌐"),
    s("Compiler Construction", true, "🏗️"),
    s("Artificial Intelligence", false, "🤖"),
  ],
  6: [
    s("Information Security", false, "🔒"),
    s("Parallel & Distributed Computing", false, "🔀"),
    s("Web Engineering", true, "🕸️"),
    s("CS Elective", false, "📘"),
  ],
  7: [
    s("Final Year Project (FYP-I)", false, "🎓"),
    s("Data Science", true, "📊"),
    s("Machine Learning", true, "🧠"),
    s("Professional Practices", false, "💼"),
  ],
  8: [
    s("Final Year Project (FYP-II)", false, "🏆"),
    s("Data Science", true, "📊"),
    s("Machine Learning", true, "🧠"),
    s("Professional Practices", false, "💼"),
  ],
};

/* ──────────── ARTIFICIAL INTELLIGENCE ──────────── */
const aiSubjects: Record<number, Subject[]> = {
  1: [
    s("Programming Fundamentals", true, "⌨️"),
    s("ICT", true, "💻"),
    s("Calculus", false, "📐"),
    s("Applied Physics", false, "⚡"),
    s("English Composition", false, "📝"),
    s("Discrete Structures", false, "🔢"),
    s("Islamic Studies", false, "📖"),
  ],
  2: [
    s("Object-Oriented Programming (OOP)", true, "🧱"),
    s("Digital Logic Design (DLD)", true, "🔌"),
    s("Multivariable Calculus", false, "📐"),
    s("Communication Skills", false, "🗣️"),
    s("Pakistan Studies", false, "🏛️"),
  ],
  3: [
    s("Data Structures & Algorithms (DSA)", true, "🌳"),
    s("Introduction to AI", false, "🤖"),
    s("Linear Algebra", false, "📊"),
    s("Statistics & Probability", false, "📈"),
    s("Calculus III", false, "📐"),
  ],
  4: [
    s("Programming for AI (Python)", true, "🐍"),
    s("Database Systems", true, "🗄️"),
    s("Operating Systems", true, "💿"),
    s("Artificial Neural Networks", true, "🧠"),
  ],
  5: [
    s("Machine Learning", true, "🧠"),
    s("Data Science", true, "📊"),
    s("Computer Networks", true, "🌐"),
    s("Natural Language Processing (NLP)", true, "💬"),
  ],
  6: [
    s("Deep Learning", true, "🔮"),
    s("Computer Vision", true, "👁️"),
    s("Knowledge Representation & Reasoning", false, "🧩"),
  ],
  7: [
    s("Final Year Project (FYP-I)", false, "🎓"),
    s("Robotics", true, "🤖"),
    s("AI Ethics", false, "⚖️"),
    s("Reinforcement Learning", false, "🎯"),
  ],
  8: [
    s("Final Year Project (FYP-II)", false, "🏆"),
    s("Fuzzy Systems", false, "🌀"),
    s("Robotics", true, "🤖"),
    s("AI Ethics", false, "⚖️"),
  ],
};

/* ──────────── Lookup ──────────── */

const allDepartmentSubjects: Record<Department, Record<number, Subject[]>> = {
  se: seSubjects,
  cs: csSubjects,
  ai: aiSubjects,
};

export const getSubjects = (department: Department, semester: number): Subject[] => {
  return allDepartmentSubjects[department]?.[semester] || [];
};

export const semesterSubjects = seSubjects;

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
