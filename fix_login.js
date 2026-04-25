const fs = require('fs');
let code = fs.readFileSync('src/app/login/page.tsx', 'utf8');

code = code.replace("export default function LoginPage() {", `import { Suspense } from 'react';

function LoginContent() {`);

code += `
export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 dark:bg-[#06070b] flex items-center justify-center">Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}
`;
fs.writeFileSync('src/app/login/page.tsx', code, 'utf8');
