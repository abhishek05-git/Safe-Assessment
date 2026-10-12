const fs = require('fs');

let content = fs.readFileSync('src/data/config.js', 'utf8');

// Use regex to extract the questions array
const match = content.match(/export const questions = (\[.*?\])\nconst P /s);
if (!match) {
  console.error('Could not find questions array in config.js');
  process.exit(1);
}

let questions = JSON.parse(match[1]);

questions = questions.map(q => {
  if (q.type === 'spectrum') {
    // We want to create a scale5 question based on the left option.
    // If the question starts with "Do you", we might be able to just rephrase it.
    // Easiest is to combine the question and left option into an "I" statement.
    let statement = q.left;
    
    // Clean up statement
    if (statement.toLowerCase().startsWith('yes, ')) {
      statement = statement.substring(5);
    } else if (statement.toLowerCase().startsWith('no, ')) {
      statement = statement.substring(4);
    }
    
    // Ensure it starts with a capital letter
    statement = statement.charAt(0).toUpperCase() + statement.slice(1);
    
    // Format the question
    let newQ = q.question;
    
    if (newQ.includes('do you:')) {
      newQ = newQ.replace('do you:', '') + ' ' + statement;
    } else if (newQ.toLowerCase().startsWith('do you')) {
      // Just keep the original question, it works well enough for agree/disagree usually,
      // but let's replace "Do you" with "I" to make it a statement if possible.
      // E.g., "Do you rely more on:" -> "I rely more on: Practical, hands-on experiences"
      newQ = newQ.replace(/^Do you/i, 'I') + ' ' + statement;
    } else if (newQ.toLowerCase().startsWith('are you')) {
      newQ = newQ.replace(/^Are you/i, 'I am') + ' ' + statement;
    } else if (newQ.toLowerCase().startsWith('when')) {
      newQ = newQ + ' ' + statement;
    } else if (newQ.toLowerCase().startsWith('in')) {
      newQ = newQ + ' ' + statement;
    } else if (newQ.toLowerCase().startsWith('at')) {
      newQ = newQ + ' ' + statement;
    } else if (newQ.toLowerCase().startsWith('after')) {
      newQ = newQ + ' ' + statement;
    } else {
      newQ = newQ + ' ' + statement;
    }
    
    // Clean up any double colons or weird punctuation
    newQ = newQ.replace(/:/g, '').replace(/\s+/g, ' ').trim();
    if (!newQ.endsWith('.')) {
      newQ += '.';
    }
    
    // Now setup the scoring. 
    // Since the statement represents the 'left' option, agreeing with it (5) should give leftPole.
    // Disagreeing (1) should give rightPole.
    // sc(rightPole, leftPole) -> 1: rightPole, 5: leftPole
    
    return {
      id: q.id,
      question: newQ,
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
console.log('Successfully transformed questions to scale5 format.');
