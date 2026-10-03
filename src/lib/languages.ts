export const MONACO_LANGUAGE: Record<string, string> = {
  python: "python",
  c: "c",
  cpp: "cpp",
  java: "java",
  sql: "sql",
  javascript: "javascript",
  typescript: "typescript",
  ruby: "ruby",
  php: "php",
  perl: "perl",
};

export const LANGUAGE_LABELS: Record<string, string> = {
  python: "Python 3", c: "C", cpp: "C++", java: "Java", sql: "SQL (SQLite)",
  javascript: "JavaScript (Node.js 24)",
  typescript: "TypeScript (Node.js 24)",
  ruby: "Ruby 3.4", php: "PHP 8.4", perl: "Perl 5.40",
};

export const STARTER_CODE: Record<string, string> = {
  python: "# 여기에 코드를 작성하세요.\n",
  c: "#include <stdio.h>\n\nint main(void) {\n    // 여기에 코드를 작성하세요.\n    return 0;\n}\n",
  cpp: "#include <iostream>\nusing namespace std;\n\nint main() {\n    // 여기에 코드를 작성하세요.\n    return 0;\n}\n",
  java: "public class Main {\n    public static void main(String[] args) {\n        // 여기에 코드를 작성하세요.\n    }\n}\n",
  sql: "-- 여기에 쿼리를 작성하세요.\nSELECT 1;\n",
  javascript: "const fs = require('node:fs');\nconst input = fs.readFileSync(0, 'utf8');\n\n// 여기에 코드를 작성하세요.\n",
  typescript: "import { readFileSync } from 'node:fs';\nconst input: string = readFileSync(0, 'utf8');\n\n// 여기에 코드를 작성하세요.\n",
  ruby: "input = STDIN.read\n\n# 여기에 코드를 작성하세요.\n",
  php: "<?php\n$input = stream_get_contents(STDIN);\n\n// 여기에 코드를 작성하세요.\n",
  perl: "use strict;\nuse warnings;\nmy $input = do { local $/; <STDIN> };\n\n# 여기에 코드를 작성하세요.\n",
};
