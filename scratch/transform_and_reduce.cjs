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

// Transform them to scale5, and randomly invert ~50% of them
let invertedCount = 0;
const finalQuestions = keptQuestions.map((q, i) => {
  if (q.type === 'spectrum') {
    let qText = q.question.trim();
    
    // Every odd question index (so ~50% of them), we use the RIGHT option instead of the LEFT.
    const invert = (i % 2 !== 0);
    if (invert) invertedCount++;
    
    let answerText = (invert ? q.right : q.left).trim();
    
    // Clean up text
    if (answerText.toLowerCase().startsWith('yes, ')) answerText = answerText.substring(5);
    if (answerText.toLowerCase().startsWith('no, ')) answerText = answerText.substring(4);
    
    let statement = '';
    
    // Pattern matching
    if (qText.toLowerCase().startsWith('do you prefer')) {
      statement = qText.replace(/^Do you prefer/i, 'I prefer').replace('?', '');
      if (answerText.toLowerCase().includes('i thrive') || answerText.toLowerCase().includes('i enjoy') || answerText.toLowerCase().includes('i prefer')) {
         statement += ' because ' + answerText.charAt(0).toLowerCase() + answerText.slice(1);
      } else {
         statement += '. ' + answerText.charAt(0).toUpperCase() + answerText.slice(1);
      }
    } 
    else if (qText.toLowerCase().startsWith('are you more')) {
      statement = qText.replace(/^Are you more/i, 'I am more').replace('?', '') + ' ' + answerText.charAt(0).toLowerCase() + answerText.slice(1);
    }
    else if (qText.toLowerCase().includes('do you:')) {
      statement = qText.replace(/do you:/i, 'I').trim() + ' ' + answerText.charAt(0).toLowerCase() + answerText.slice(1);
    }
    else if (qText.toLowerCase().includes('do you feel')) {
      statement = qText.replace(/do you feel/i, 'I feel').replace('?', '') + ' ' + answerText.charAt(0).toLowerCase() + answerText.slice(1);
    }
    else if (qText.toLowerCase().startsWith('do you')) {
      statement = qText.replace(/^Do you/i, 'I').replace('?', '') + ' ' + answerText.charAt(0).toLowerCase() + answerText.slice(1);
    }
    else if (qText.toLowerCase().includes('do you')) {
      statement = qText.replace(/do you/i, 'I').replace('?', '') + ' ' + answerText.charAt(0).toLowerCase() + answerText.slice(1);
    }
    else {
      statement = qText.replace('?', '') + ' ' + answerText;
    }
    
    // Final cleanups
    statement = statement.replace(/\s+/g, ' ').replace(/:/g, '').trim();
    if (!statement.endsWith('.')) statement += '.';
    statement = statement.charAt(0).toUpperCase() + statement.slice(1);
    
    // Determine scoring
    // If inverted, agreeing (5) means the rightPole.
    const agreePole = invert ? q.rightPole : q.leftPole;
    const disagreePole = invert ? q.leftPole : q.rightPole;
    
    return {
      id: q.id,
      question: statement,
      category: q.category,
      type: 'scale5',
      weight: q.weight,
      required: q.required,
      active: q.active,
      scoring: {
        1: disagreePole,
        2: disagreePole,
        3: 'neutral',
        4: agreePole,
        5: agreePole
      }
    };
  }
  return q;
});

const questionsCode = 'export const questions = ' + JSON.stringify(finalQuestions, null, 2) + '\n';
content = content.replace(/export const questions = \[\s*\{.*\}\s*\]\nconst P /s, questionsCode + 'const P ');

fs.writeFileSync('src/data/config.js', content);
console.log('Successfully formatted 36 questions, with ' + invertedCount + ' reverse-scored questions.');
