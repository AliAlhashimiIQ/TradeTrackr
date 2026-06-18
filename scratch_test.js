const fs = require('fs');
const path = require('path');

const fileContent = fs.readFileSync('src/app/trades/page.tsx', 'utf8');
const lines = fileContent.split('\n');

console.log('--- EXACT LINES 868 to 892 ---');
for (let i = 867; i <= 891; i++) {
  console.log(`${i + 1}: ${lines[i]}`);
}
