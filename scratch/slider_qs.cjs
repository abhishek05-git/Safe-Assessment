const fs = require('fs');

let content = fs.readFileSync('src/data/config.js', 'utf8');

const match = content.match(/export const questions = (\[.*?\])\nconst P /s);
if (!match) {
  console.error('Could not find questions array in config.js');
  process.exit(1);
}

let questions = JSON.parse(match[1]);

questions = questions.map(q => {
  if (q.type === 'spectrum') {
    return {
      id: q.id,
      question: q.question,
      category: q.category,
      type: 'slider',
      min: 0,
      max: 100,
      left: q.left,
      right: q.right,
      weight: q.weight,
      required: q.required,
      active: q.active,
      pole: q.scoring['5'],   // Right side trait
      other: q.scoring['1']   // Left side trait
    };
  }
  return q;
});

const questionsCode = 'export const questions = ' + JSON.stringify(questions, null, 2) + '\n';
content = content.replace(/export const questions = \[\s*\{.*\}\s*\]\nconst P /s, questionsCode + 'const P ');

fs.writeFileSync('src/data/config.js', content);
console.log('Successfully converted spectrum questions to slider format.');
