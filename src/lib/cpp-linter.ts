export interface LintError {
  message: string;
  tip: string;
  line?: number;
}

export function lintCppCode(code: string): LintError[] {
  const errors: LintError[] = [];
  const lines = code.split("\n");

  // Check for missing #include <iostream>
  const usesIO = /\b(cout|cin|endl)\b/.test(code);
  const hasIncludeIostream = /#include\s*<iostream>/.test(code);
  if (usesIO && !hasIncludeIostream) {
    const misspelled = /#include\s*<\s*(?:iostrem|iosteam|iostram|istream|iostream\.h)\s*>/.test(code);
    errors.push({
      message: misspelled ? "`#include <iostream>` misspell hai" : "`#include <iostream>` missing hai",
      tip: `#include <iostream> add karo file ke top par`,
    });
  }

  // Check for missing int main()
  const hasMain = /\bint\s+main\s*\(/.test(code);
  const hasMisspelledMain = /\b(void\s+main|int\s+mian|int\s+mainn|int\s+Mai)\s*\(/.test(code);
  if (!hasMain && lines.length > 3) {
    errors.push({
      message: hasMisspelledMain ? "`int main()` misspell hai" : "`int main()` function missing hai",
      tip: `int main() { ... return 0; } likho`,
    });
  }

  // Check mismatched braces
  let braceCount = 0;
  let parenCount = 0;
  for (const line of lines) {
    // Skip string literals and comments for brace counting
    const stripped = line.replace(/\/\/.*$/, "").replace(/"[^"]*"/g, "").replace(/'[^']*'/g, "");
    for (const ch of stripped) {
      if (ch === "{") braceCount++;
      if (ch === "}") braceCount--;
      if (ch === "(") parenCount++;
      if (ch === ")") parenCount--;
    }
  }
  if (braceCount !== 0) {
    errors.push({
      message: braceCount > 0 ? `${braceCount} closing brace(s) \`}\` missing hain` : `${Math.abs(braceCount)} extra closing brace(s) \`}\` hain`,
      tip: "Apne curly braces {} check karo",
    });
  }
  if (parenCount !== 0) {
    errors.push({
      message: parenCount > 0 ? `${parenCount} closing parenthesis \`)\` missing hain` : `${Math.abs(parenCount)} extra closing parenthesis \`)\` hain`,
      tip: "Apne parentheses () check karo",
    });
  }

  // Check incorrect cout/cin direction operators
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].replace(/\/\/.*$/, "").replace(/"[^"]*"/g, '""');
    
    if (/\bcout\s*>>/.test(line)) {
      errors.push({
        message: `Line ${i + 1}: \`cout >>\` galat hai, \`cout <<\` hona chahiye`,
        tip: "cout ke saath << use karo, >> nahi",
        line: i + 1,
      });
    }
    if (/\bcin\s*<</.test(line)) {
      errors.push({
        message: `Line ${i + 1}: \`cin <<\` galat hai, \`cin >>\` hona chahiye`,
        tip: "cin ke saath >> use karo, << nahi",
        line: i + 1,
      });
    }
  }

  // Check missing semicolons (heuristic: lines that look like statements but don't end with ; { } or are preprocessor/comments)
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("#") || trimmed.startsWith("/*") || trimmed.startsWith("*")) continue;
    if (/^(using\s|return\s|cout\s|cin\s|int\s+\w+\s*=|float\s|double\s|string\s|char\s|bool\s)/.test(trimmed)) {
      const endsCorrectly = /[;{}]\s*$/.test(trimmed) || /\)\s*$/.test(trimmed) || /,\s*$/.test(trimmed);
      if (!endsCorrectly) {
        errors.push({
          message: `Line ${i + 1}: Semicolon \`;\` missing lag raha hai`,
          tip: "Line ke end mein ; lagao",
          line: i + 1,
        });
      }
    }
  }

  return errors;
}
