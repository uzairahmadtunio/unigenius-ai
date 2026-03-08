import { supabase } from "@/integrations/supabase/client";
import confetti from "canvas-confetti";
import { toast } from "sonner";

export const fireCelebration = (points: number) => {
  confetti({
    particleCount: 120,
    spread: 80,
    origin: { y: 0.6 },
    colors: ["#fbbf24", "#f59e0b", "#d97706", "#6366f1", "#8b5cf6"],
  });

  toast.success(`🎉 Success! +${points} Points added to your Leaderboard rank!`, {
    duration: 4000,
  });
};

export const recordCareerActivity = async (
  userId: string,
  activityType: "dsa_solve" | "interview_complete" | "cv_score",
  points: number,
  metadata: Record<string, any> = {}
) => {
  const { error } = await supabase.from("career_activity" as any).insert({
    user_id: userId,
    activity_type: activityType,
    points,
    metadata,
  });

  if (error) {
    console.error("Failed to record career activity:", error);
    return false;
  }
  return true;
};

type BadgeDef = { id: string; name: string; icon: string };

const BADGES: Record<string, BadgeDef> = {
  dsa_warrior: { id: "dsa_warrior", name: "DSA Warrior", icon: "⚔️" },
  interview_ready: { id: "interview_ready", name: "Interview Ready", icon: "🎤" },
  cv_master: { id: "cv_master", name: "CV Master", icon: "📄" },
  cv_ready: { id: "cv_ready", name: "CV Ready", icon: "📝" },
  profile_pro: { id: "profile_pro", name: "Profile Pro", icon: "✨" },
  top_scorer: { id: "top_scorer", name: "Top Scorer", icon: "🏆" },
};

export const checkAndAwardBadges = async (userId: string) => {
  const { data: activities } = await supabase
    .from("career_activity" as any)
    .select("activity_type, metadata")
    .eq("user_id", userId);

  if (!activities) return;

  const dsaCount = activities.filter((a: any) => a.activity_type === "dsa_solve").length;
  const interviewCount = activities.filter((a: any) => a.activity_type === "interview_complete").length;
  const hasCvUpload = activities.some((a: any) => a.activity_type === "cv_score");
  const hasCvAbove80 = activities.some(
    (a: any) => a.activity_type === "cv_score" && (a.metadata as any)?.score >= 80
  );

  const badgesToAward: BadgeDef[] = [];

  // DSA Warrior: 5 problems solved
  if (dsaCount >= 5) badgesToAward.push(BADGES.dsa_warrior);
  // Interview Ready: 5 interviews
  if (interviewCount >= 5) badgesToAward.push(BADGES.interview_ready);
  // CV Ready: any CV upload/analysis
  if (hasCvUpload) badgesToAward.push(BADGES.cv_ready);
  // CV Master: CV score >= 80
  if (hasCvAbove80) badgesToAward.push(BADGES.cv_master);

  // Fetch existing badges to know which are new
  const { data: existingBadges } = await supabase
    .from("user_badges" as any)
    .select("badge_id")
    .eq("user_id", userId);

  const existingIds = new Set((existingBadges || []).map((b: any) => b.badge_id));

  for (const badge of badgesToAward) {
    if (!existingIds.has(badge.id)) {
      const { error } = await supabase.from("user_badges" as any).upsert(
        { user_id: userId, badge_id: badge.id, badge_name: badge.name, badge_icon: badge.icon },
        { onConflict: "user_id,badge_id" }
      );
      if (!error) {
        toast.success(`🏅 New Badge Unlocked: ${badge.icon} ${badge.name}!`, { duration: 5000 });
      }
    }
  }
};

// Check profile completeness and award Profile Pro badge
export const checkProfileBadge = async (userId: string) => {
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (!profile) return;

  const p = profile as any;
  const fields = [
    p.display_name, p.roll_number, p.avatar_url, p.headline,
    p.github_url || p.linkedin_url, p.section,
  ];
  const allFilled = fields.every(Boolean);

  if (allFilled) {
    const { data: existing } = await supabase
      .from("user_badges" as any)
      .select("id")
      .eq("user_id", userId)
      .eq("badge_id", "profile_pro")
      .maybeSingle();

    if (!existing) {
      const badge = BADGES.profile_pro;
      const { error } = await supabase.from("user_badges" as any).upsert(
        { user_id: userId, badge_id: badge.id, badge_name: badge.name, badge_icon: badge.icon },
        { onConflict: "user_id,badge_id" }
      );
      if (!error) {
        toast.success(`🏅 New Badge Unlocked: ${badge.icon} ${badge.name}!`, { duration: 5000 });
      }
    }
  }
};

// Preset DSA problems list
export interface DSAProblem {
  id: number;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  category: string;
  description: string;
  examples: string;
  constraints: string;
  hints: string[];
  starterCode: string;
}

export const PRESET_DSA_PROBLEMS: DSAProblem[] = [
  {
    id: 1,
    title: "Reverse a String",
    difficulty: "easy",
    category: "String",
    description: "Write a function that reverses a given string without using any built-in reverse function.",
    examples: "**Input:** \"hello\"\n**Output:** \"olleh\"",
    constraints: "- 1 ≤ string length ≤ 10⁵\n- String contains ASCII characters only",
    hints: ["Use two pointers from start and end", "Swap characters moving inward"],
    starterCode: '#include <iostream>\n#include <string>\nusing namespace std;\n\nstring reverseString(string s) {\n    // Your code here\n}\n\nint main() {\n    string s;\n    cin >> s;\n    cout << reverseString(s) << endl;\n    return 0;\n}',
  },
  {
    id: 2,
    title: "Check Palindrome",
    difficulty: "easy",
    category: "String",
    description: "Write a function to check whether a given string is a palindrome (reads the same forward and backward).",
    examples: "**Input:** \"racecar\"\n**Output:** true\n\n**Input:** \"hello\"\n**Output:** false",
    constraints: "- 1 ≤ string length ≤ 10⁵\n- Ignore case sensitivity",
    hints: ["Compare characters from both ends", "Use two pointer technique"],
    starterCode: '#include <iostream>\n#include <string>\nusing namespace std;\n\nbool isPalindrome(string s) {\n    // Your code here\n}\n\nint main() {\n    string s;\n    cin >> s;\n    cout << (isPalindrome(s) ? "true" : "false") << endl;\n    return 0;\n}',
  },
  {
    id: 3,
    title: "Bubble Sort",
    difficulty: "easy",
    category: "Sorting",
    description: "Implement the Bubble Sort algorithm to sort an array of integers in ascending order.",
    examples: "**Input:** [64, 34, 25, 12, 22, 11, 90]\n**Output:** [11, 12, 22, 25, 34, 64, 90]",
    constraints: "- 1 ≤ array size ≤ 10⁴\n- -10⁹ ≤ element ≤ 10⁹",
    hints: ["Compare adjacent elements", "Repeat passes until no swaps needed"],
    starterCode: '#include <iostream>\nusing namespace std;\n\nvoid bubbleSort(int arr[], int n) {\n    // Your code here\n}\n\nint main() {\n    int arr[] = {64, 34, 25, 12, 22, 11, 90};\n    int n = 7;\n    bubbleSort(arr, n);\n    for (int i = 0; i < n; i++) cout << arr[i] << " ";\n    return 0;\n}',
  },
  {
    id: 4,
    title: "Find Maximum in Array",
    difficulty: "easy",
    category: "Array",
    description: "Write a function that finds and returns the maximum element in an array without using any built-in max function.",
    examples: "**Input:** [3, 7, 1, 9, 4, 6]\n**Output:** 9",
    constraints: "- 1 ≤ array size ≤ 10⁵\n- -10⁹ ≤ element ≤ 10⁹",
    hints: ["Initialize max with first element", "Iterate and compare each element"],
    starterCode: '#include <iostream>\nusing namespace std;\n\nint findMax(int arr[], int n) {\n    // Your code here\n}\n\nint main() {\n    int arr[] = {3, 7, 1, 9, 4, 6};\n    cout << findMax(arr, 6) << endl;\n    return 0;\n}',
  },
  {
    id: 5,
    title: "Two Sum",
    difficulty: "medium",
    category: "Array / HashMap",
    description: "Given an array of integers and a target sum, find two numbers such that they add up to the target. Return their indices.",
    examples: "**Input:** nums = [2, 7, 11, 15], target = 9\n**Output:** [0, 1]\n**Explanation:** nums[0] + nums[1] = 2 + 7 = 9",
    constraints: "- 2 ≤ array size ≤ 10⁴\n- Each input has exactly one solution\n- You may not use the same element twice",
    hints: ["Brute force: check all pairs O(n²)", "Optimal: use a hash map for O(n)"],
    starterCode: '#include <iostream>\n#include <vector>\n#include <unordered_map>\nusing namespace std;\n\nvector<int> twoSum(vector<int>& nums, int target) {\n    // Your code here\n}\n\nint main() {\n    vector<int> nums = {2, 7, 11, 15};\n    auto result = twoSum(nums, 9);\n    cout << result[0] << ", " << result[1] << endl;\n    return 0;\n}',
  },
  {
    id: 6,
    title: "Linked List Reversal",
    difficulty: "medium",
    category: "Linked List",
    description: "Reverse a singly linked list. Given the head of the list, return the new head after reversal.",
    examples: "**Input:** 1 → 2 → 3 → 4 → 5\n**Output:** 5 → 4 → 3 → 2 → 1",
    constraints: "- 0 ≤ number of nodes ≤ 5000\n- -5000 ≤ Node.val ≤ 5000",
    hints: ["Use three pointers: prev, current, next", "Iterate and reverse links one by one"],
    starterCode: '#include <iostream>\nusing namespace std;\n\nstruct Node {\n    int data;\n    Node* next;\n    Node(int val) : data(val), next(nullptr) {}\n};\n\nNode* reverseList(Node* head) {\n    // Your code here\n}\n\nint main() {\n    // Create: 1->2->3->4->5\n    Node* head = new Node(1);\n    head->next = new Node(2);\n    head->next->next = new Node(3);\n    head->next->next->next = new Node(4);\n    head->next->next->next->next = new Node(5);\n    \n    Node* reversed = reverseList(head);\n    while (reversed) {\n        cout << reversed->data << " ";\n        reversed = reversed->next;\n    }\n    return 0;\n}',
  },
  {
    id: 7,
    title: "Binary Search",
    difficulty: "easy",
    category: "Searching",
    description: "Implement binary search on a sorted array. Return the index of the target element, or -1 if not found.",
    examples: "**Input:** arr = [1, 3, 5, 7, 9, 11], target = 7\n**Output:** 3",
    constraints: "- Array is sorted in ascending order\n- 1 ≤ array size ≤ 10⁵",
    hints: ["Divide the search space in half each time", "Compare with middle element"],
    starterCode: '#include <iostream>\nusing namespace std;\n\nint binarySearch(int arr[], int n, int target) {\n    // Your code here\n}\n\nint main() {\n    int arr[] = {1, 3, 5, 7, 9, 11};\n    cout << binarySearch(arr, 6, 7) << endl;\n    return 0;\n}',
  },
  {
    id: 8,
    title: "Stack using Array",
    difficulty: "medium",
    category: "Stack",
    description: "Implement a Stack data structure using an array with push, pop, peek, and isEmpty operations.",
    examples: "**Operations:** push(10), push(20), push(30), pop() → 30, peek() → 20",
    constraints: "- Maximum stack size: 1000\n- Handle underflow gracefully",
    hints: ["Use a top pointer initialized to -1", "Increment on push, decrement on pop"],
    starterCode: '#include <iostream>\nusing namespace std;\n\nclass Stack {\n    int arr[1000];\n    int top;\npublic:\n    Stack() { top = -1; }\n    void push(int x) { /* Your code */ }\n    int pop() { /* Your code */ }\n    int peek() { /* Your code */ }\n    bool isEmpty() { /* Your code */ }\n};\n\nint main() {\n    Stack s;\n    s.push(10);\n    s.push(20);\n    s.push(30);\n    cout << s.pop() << endl;  // 30\n    cout << s.peek() << endl; // 20\n    return 0;\n}',
  },
  {
    id: 9,
    title: "Fibonacci Sequence",
    difficulty: "easy",
    category: "Recursion / DP",
    description: "Write a function to return the Nth Fibonacci number. Use both recursive and iterative approaches.",
    examples: "**Input:** N = 6\n**Output:** 8\n**Explanation:** 0, 1, 1, 2, 3, 5, 8",
    constraints: "- 0 ≤ N ≤ 45\n- Optimize for large N",
    hints: ["Recursive: fib(n) = fib(n-1) + fib(n-2)", "Iterative approach avoids stack overflow"],
    starterCode: '#include <iostream>\nusing namespace std;\n\nint fibonacci(int n) {\n    // Your code here\n}\n\nint main() {\n    int n;\n    cin >> n;\n    cout << fibonacci(n) << endl;\n    return 0;\n}',
  },
  {
    id: 10,
    title: "Merge Two Sorted Arrays",
    difficulty: "medium",
    category: "Array / Two Pointers",
    description: "Given two sorted arrays, merge them into a single sorted array without using any built-in sort function.",
    examples: "**Input:** arr1 = [1, 3, 5], arr2 = [2, 4, 6]\n**Output:** [1, 2, 3, 4, 5, 6]",
    constraints: "- Arrays are already sorted\n- 0 ≤ array size ≤ 10⁴",
    hints: ["Use two pointers, one for each array", "Compare and pick the smaller element"],
    starterCode: '#include <iostream>\n#include <vector>\nusing namespace std;\n\nvector<int> mergeSorted(vector<int>& a, vector<int>& b) {\n    // Your code here\n}\n\nint main() {\n    vector<int> a = {1, 3, 5};\n    vector<int> b = {2, 4, 6};\n    auto result = mergeSorted(a, b);\n    for (int x : result) cout << x << " ";\n    return 0;\n}',
  },
];
