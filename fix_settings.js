const fs = require('fs');
let code = fs.readFileSync('src/app/settings/page.tsx', 'utf8');

// The original script `update_settings_page.js` didn't execute properly earlier or got lost.
// I need to add useTheme and the Theme switcher.

if (!code.includes("import { useTheme }")) {
  code = code.replace("import { motion } from 'framer-motion';", "import { motion } from 'framer-motion';\nimport { useTheme } from 'next-themes';\nimport { Sun, Moon, Monitor } from 'lucide-react';");
}

if (!code.includes("const { theme, setTheme } = useTheme();")) {
  code = code.replace("const { user, loading, signOut } = useAuth();", "const { user, loading, signOut } = useAuth();\n  const { theme, setTheme, systemTheme } = useTheme();\n  const [mounted, setMounted] = useState(false);\n\n  useEffect(() => {\n    setMounted(true);\n  }, []);");
}

const themeSection = `
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Theme</label>
                    <div className="grid grid-cols-3 gap-3">
                      <button
                        onClick={() => setTheme('light')}
                        className={\`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border \${mounted && theme === 'light' ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-700 dark:text-indigo-400' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 dark:bg-[#0f1117] dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800'}\`}
                      >
                        <Sun className="w-4 h-4" />
                        <span className="text-sm font-medium">Light</span>
                      </button>
                      <button
                        onClick={() => setTheme('dark')}
                        className={\`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border \${mounted && theme === 'dark' ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-700 dark:text-indigo-400' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 dark:bg-[#0f1117] dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800'}\`}
                      >
                        <Moon className="w-4 h-4" />
                        <span className="text-sm font-medium">Dark</span>
                      </button>
                      <button
                        onClick={() => setTheme('system')}
                        className={\`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border \${mounted && theme === 'system' ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-700 dark:text-indigo-400' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 dark:bg-[#0f1117] dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800'}\`}
                      >
                        <Monitor className="w-4 h-4" />
                        <span className="text-sm font-medium">System</span>
                      </button>
                    </div>
                  </div>
`;

if (!code.includes("Theme</label>")) {
  code = code.replace("<div className=\"space-y-6\">", `<div className="space-y-6">\n${themeSection}`);
}

fs.writeFileSync('src/app/settings/page.tsx', code, 'utf8');
