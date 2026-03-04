export interface Subject {
  name: string;
  hasLab: boolean;
  icon: string;
}

export const semesterSubjects: Record<number, Subject[]> = {
  1: [
    { name: "Introduction to Computing", hasLab: true, icon: "💻" },
    { name: "Programming Fundamentals (C++)", hasLab: true, icon: "⌨️" },
    { name: "Calculus and Analytical Geometry", hasLab: false, icon: "📐" },
    { name: "English Composition & Comprehension", hasLab: false, icon: "📝" },
    { name: "Applied Physics / Basic Electronics", hasLab: false, icon: "⚡" },
    { name: "Islamic and Religious Studies", hasLab: false, icon: "📖" },
  ],
  2: [
    { name: "Object-Oriented Programming (OOP)", hasLab: true, icon: "🧱" },
    { name: "Discrete Structures", hasLab: false, icon: "🔢" },
    { name: "Software Engineering Concepts", hasLab: false, icon: "⚙️" },
    { name: "Technical and Business Writing", hasLab: false, icon: "✍️" },
    { name: "Pakistan Studies", hasLab: false, icon: "🏛️" },
    { name: "Computer Organization & Assembly Language", hasLab: false, icon: "🖥️" },
  ],
  3: [
    { name: "Data Structures and Algorithms", hasLab: true, icon: "🌳" },
    { name: "Software Requirements Engineering", hasLab: false, icon: "📋" },
    { name: "Linear Algebra", hasLab: false, icon: "📊" },
    { name: "Human Computer Interaction (HCI)", hasLab: false, icon: "🎨" },
    { name: "University Elective-I", hasLab: false, icon: "📚" },
  ],
  4: [
    { name: "Software Design and Architecture", hasLab: true, icon: "🏗️" },
    { name: "Database Systems", hasLab: true, icon: "🗄️" },
    { name: "Operating Systems", hasLab: false, icon: "💿" },
    { name: "Probability and Statistics", hasLab: false, icon: "📈" },
    { name: "Numerical Computing", hasLab: false, icon: "🔬" },
  ],
  5: [
    { name: "Software Construction & Development", hasLab: true, icon: "🛠️" },
    { name: "Computer Communication & Networks", hasLab: true, icon: "🌐" },
    { name: "Web Engineering", hasLab: true, icon: "🕸️" },
    { name: "Software Quality Engineering", hasLab: false, icon: "✅" },
    { name: "Advanced Software Requirement Engineering", hasLab: false, icon: "📑" },
  ],
  6: [
    { name: "Software Project Management", hasLab: false, icon: "📅" },
    { name: "Software Re-Engineering", hasLab: false, icon: "🔄" },
    { name: "Information Security", hasLab: false, icon: "🔒" },
    { name: "Mobile App Development", hasLab: false, icon: "📱" },
    { name: "AI Supporting Elective", hasLab: false, icon: "🤖" },
    { name: "Professional Practices", hasLab: false, icon: "💼" },
  ],
  7: [
    { name: "Final Year Project (Part I)", hasLab: false, icon: "🎓" },
    { name: "Cloud Computing", hasLab: false, icon: "☁️" },
    { name: "Data Science", hasLab: false, icon: "📊" },
    { name: "Entrepreneurship", hasLab: false, icon: "🚀" },
  ],
  8: [
    { name: "Final Year Project (Part II)", hasLab: false, icon: "🏆" },
    { name: "SE Elective-IV", hasLab: false, icon: "📘" },
    { name: "SE Elective-V", hasLab: false, icon: "📗" },
    { name: "Internship (Field Experience)", hasLab: false, icon: "🏢" },
  ],
};
