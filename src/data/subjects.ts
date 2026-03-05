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

export const semesterSubjects: Record<number, Subject[]> = {
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

/** Find a subject by its slug across all semesters */
export const findSubjectById = (id: string): { subject: Subject; semester: number } | null => {
  for (const [sem, subjects] of Object.entries(semesterSubjects)) {
    const found = subjects.find((s) => s.id === id);
    if (found) return { subject: found, semester: Number(sem) };
  }
  return null;
};
