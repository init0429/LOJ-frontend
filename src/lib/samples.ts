// 첫 화면의 채점 예시에 쓰는 "두 수의 합" 풀이.
export const SUM_SAMPLES: { id: string; name: string; code: string }[] = [
  { id: "python", name: "Python", code: "a, b = map(int, input().split())\nprint(a + b)" },
  { id: "c", name: "C", code: "#include <stdio.h>\n\nint main(void) {\n    int a, b;\n    scanf(\"%d %d\", &a, &b);\n    printf(\"%d\\n\", a + b);\n    return 0;\n}" },
  { id: "cpp", name: "C++", code: "#include <iostream>\n\nint main() {\n    int a, b;\n    std::cin >> a >> b;\n    std::cout << a + b << '\\n';\n}" },
  { id: "java", name: "Java", code: "import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner in = new Scanner(System.in);\n        System.out.println(in.nextInt() + in.nextInt());\n    }\n}" },
  { id: "javascript", name: "JavaScript", code: "const fs = require(\"node:fs\");\nconst [a, b] = fs.readFileSync(0, \"utf8\").split(\" \").map(Number);\n\nconsole.log(a + b);" },
  { id: "typescript", name: "TypeScript", code: "import { readFileSync } from \"node:fs\";\n\nconst [a, b]: number[] = readFileSync(0, \"utf8\").split(\" \").map(Number);\nconsole.log(a + b);" },
  { id: "ruby", name: "Ruby", code: "a, b = gets.split.map(&:to_i)\nputs a + b" },
  { id: "php", name: "PHP", code: "<?php\n[$a, $b] = explode(\" \", trim(fgets(STDIN)));\n\necho $a + $b, PHP_EOL;" },
  { id: "perl", name: "Perl", code: "my ($a, $b) = split \" \", <STDIN>;\nprint $a + $b, \"\\n\";" },
  { id: "sql", name: "SQL", code: "SELECT a + b\nFROM numbers;" },
];
