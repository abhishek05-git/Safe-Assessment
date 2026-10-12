const fs = require('fs');

let content = fs.readFileSync('src/data/config.js', 'utf8');

const match = content.match(/export const questions = (\[.*?\])\nconst P /s);
if (!match) {
  console.error('Could not find questions array in config.js');
  process.exit(1);
}

let questions = JSON.parse(match[1]);

questions = questions.map(q => {
  // If the question is already scale5, we still want to clean up its grammar!
  // Wait, the currently saved questions are already scale5, and their 'left' is gone.
  // We need to run parse_qs.js first to get the spectrum ones back, then run THIS script.
  
  if (q.type === 'spectrum') {
    let qText = q.question.trim();
    let lText = q.left.trim();
    
    // Clean up Left text
    if (lText.toLowerCase().startsWith('yes, ')) lText = lText.substring(5);
    if (lText.toLowerCase().startsWith('no, ')) lText = lText.substring(4);
    
    let statement = '';
    
    // Pattern matching
    if (qText.toLowerCase().startsWith('do you prefer')) {
      statement = qText.replace(/^Do you prefer/i, 'I prefer').replace('?', '');
      if (lText.toLowerCase().includes('i thrive') || lText.toLowerCase().includes('i enjoy')) {
         statement += ' because ' + lText.charAt(0).toLowerCase() + lText.slice(1);
      } else {
         statement += '. ' + lText.charAt(0).toUpperCase() + lText.slice(1);
      }
    } 
    else if (qText.toLowerCase().startsWith('are you more')) {
      statement = qText.replace(/^Are you more/i, 'I am more').replace('?', '') + ' ' + lText.charAt(0).toLowerCase() + lText.slice(1);
    }
    else if (qText.toLowerCase().includes('do you:')) {
      statement = qText.replace(/do you:/i, 'I').trim() + ' ' + lText.charAt(0).toLowerCase() + lText.slice(1);
    }
    else if (qText.toLowerCase().includes('do you feel')) {
      statement = qText.replace(/do you feel/i, 'I feel').replace('?', '') + ' ' + lText.charAt(0).toLowerCase() + lText.slice(1);
    }
    else if (qText.toLowerCase().startsWith('do you')) {
      statement = qText.replace(/^Do you/i, 'I').replace('?', '') + ' ' + lText.charAt(0).toLowerCase() + lText.slice(1);
    }
    else if (qText.toLowerCase().includes('do you')) {
      statement = qText.replace(/do you/i, 'I').replace('?', '') + ' ' + lText.charAt(0).toLowerCase() + lText.slice(1);
    }
    else {
      statement = qText.replace('?', '') + ' ' + lText;
    }
    
    // Final cleanups
    statement = statement.replace(/\s+/g, ' ').replace(/:/g, '').trim();
    if (!statement.endsWith('.')) statement += '.';
    statement = statement.charAt(0).toUpperCase() + statement.slice(1);
    
    return {
      id: q.id,
      question: statement,
      category: q.category,
      type: 'scale5',
      weight: q.weight,
      required: q.required,
      active: q.active,
      scoring: {
        1: q.rightPole,
        2: q.rightPole,
        3: 'neutral',
        4: q.leftPole,
        5: q.leftPole
      }
    };
  }
  return q;
});

const questionsCode = 'export const questions = ' + JSON.stringify(questions, null, 2) + '\n';
content = content.replace(/export const questions = \[\s*\{.*\}\s*\]\nconst P /s, questionsCode + 'const P ');

fs.writeFileSync('src/data/config.js', content);
console.log('Successfully applied smart formatting to questions!');
