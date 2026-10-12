const fs = require('fs');

let content = fs.readFileSync('src/data/config.js', 'utf8');

const match = content.match(/export const questions = (\[.*?\])\nconst P /s);
if (!match) {
  console.error('Could not find questions array in config.js');
  process.exit(1);
}

let questions = JSON.parse(match[1]);

// Keep only 9 questions for each category (36 total)
const keptQuestions = [];
const counts = { Energy: 0, Mind: 0, Nature: 0, Tactics: 0 };

for (const q of questions) {
  if (counts[q.category] < 9) {
    keptQuestions.push(q);
    counts[q.category]++;
  }
}

const questionsCode = 'export const questions = ' + JSON.stringify(keptQuestions, null, 2) + '\n';
content = content.replace(/export const questions = \[\s*\{.*\}\s*\]\nconst P /s, questionsCode + 'const P ');

fs.writeFileSync('src/data/config.js', content);
console.log('Successfully reduced questions to ' + keptQuestions.length);
