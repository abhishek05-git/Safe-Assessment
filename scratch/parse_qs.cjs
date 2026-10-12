const fs = require('fs');

const raw = `Section 1: Extraversion (E) vs. Introversion (I)
Do you prefer working in a lively, active environment?
*
a) Yes, I thrive on energy and interaction
b) No, I prefer quiet, focused environments
When faced with a challenge, do you:
*
a) Discuss it openly with others to brainstorm solutions
b) Reflect on it privately before taking action
Do you find networking events:
*
a) Exciting and enjoyable
b) Draining and tiring
After a long day, do you:
*
a) Feel energized by spending time with people
b) Need time alone to recharge
When starting a new project, do you:*
a) Prefer working in a team
b) Prefer working independently
At meetings, do you:*
a) Speak up easily and share your ideas
b) Prefer to listen and contribute after thinking
Do you enjoy leading social activities at work?
*
a) Yes, I love taking the lead
b) No, I prefer to participate without leading
Are you more likely to:
*
a) Jump into conversations and activities
b) Observe and wait for the right time to speak
Do you typically:*
a) Make friends quickly
b) Take time to develop friendships
At social events, do you:
*
a) Mingle with as many people as possible
b) Spend time with a small group of close friends
In work discussions, do you:
*
a) Prefer lively debates and idea exchanges
b) Prefer focused, deeper conversations with fewer interruptions
Do you find it easier to:
*
a) Communicate verbally in group settings
b) Communicate in one-on-one conversations
When brainstorming, do you:
*
a) Prefer group brainstorming sessions
b) Prefer to think alone and present your ideas later
Do you enjoy spontaneous social events?
*
a) Yes, I thrive on the energy of impromptu gatherings
b) No, I prefer planning my social engagements
At work, do you:*
a) Prefer open-plan offices with frequent interaction
b) Prefer quiet offices with minimal distraction
During free time at work, do you:
*
a) Engage in small talk with colleagues
b) Focus on personal tasks or take quiet breaks
Do you find working in a team:
*
a) Motivating and enjoyable
b) Draining and difficult at times
When presenting to a group, do you feel:
*
a) Confident and energized
b) Nervous and prefer smaller audiences
When receiving praise, do you:*
a) Enjoy public recognition (E)
b) Prefer private, personal praise (I)
Do you prefer team activities such as group lunch outings?
*
a) Yes, I enjoy them
b) No, I prefer my own space
When it comes to decision-making, do you:
*
a) Prefer discussing with others before deciding
b) Prefer to analyze and decide independently
Do you feel most productive when:
*
a) Surrounded by people and ideas
b) Focused on your own tasks in a quiet space
Are you more comfortable:
*
a) Talking things through
b) Thinking things through on your own
In meetings, do you:
*
a) Contribute actively and frequently
b) Contribute selectively after reflection
Do you find group work:
*
a) Energizing
b) Draining

Section 2: Sensing (S) vs. Intuition (N)
Do you rely more on:
*
a) Practical, hands-on experiences
b) Theoretical ideas and concepts
When solving problems, do you:*
a) Focus on details and what is immediately in front of you
b) Look for patterns and possibilities beyond the obvious
Do you prefer to:
*
a) Follow established processes
b) Explore new, untested methods
In learning new skills, do you:*
a) Prefer step-by-step instructions
b) Prefer to learn through exploration and experimentation
When discussing plans, do you:
*
a) Prefer to focus on what is currently possible
b) Enjoy thinking about future possibilities and potential
Do you tend to:
*
a) Pay close attention to specific facts and figures
b) See the broader picture beyond the details
In your day-to-day work, do you prefer:
*
a) Routines and familiarity
b) New challenges and changing situations
When presented with a new project, do you:*
a) Focus on the resources and limitations available
b) Imagine how things could be if everything goes well
Are you more comfortable:
*
a) Working with tangible, real-world information
b) Exploring abstract concepts and ideas
Do you usually trust:
*
a) What you see and experience directly
b) Your instincts and hunches
When making decisions, do you:
*
a) Consider the facts and known outcomes
b) Think about potential future scenarios
At work, do you prefer tasks that are:*
a) Well-defined with clear instructions
b) Open-ended with room for interpretation
Do you typically:
*
a) Look at immediate, concrete outcomes
b) Think about how decisions will play out in the long-term
When setting goals, do you:
*
a) Focus on achievable, realistic objectives
b) Dream big and consider bold, visionary targets
When communicating with others, do you:
*
a) Prefer being clear and straightforward
b) Use metaphors or abstract language to convey ideas
Do you tend to:*
a) Use past experiences to guide your actions
b) Look for new possibilities and different approaches
Do you feel more comfortable:
*
a) Following a proven method
b) Innovating and trying something new
In meetings, do you prefer to:
*
a) Stick to the facts and current issues
b) Discuss future trends and potential opportunities
When troubleshooting, do you focus on:
*
a) The immediate problem and what can be fixed now
b) What could be improved in the long run
Do you find yourself more interested in:
*
a) Present realities and practical applications
b) Future possibilities and innovations
Do you prefer your work to:
*
a) Be clearly defined and structured
b) Allow for flexibility and creative freedom
Do you value:
*
a) Efficiency and getting things done in the present
b) Creativity and pushing boundaries
When reflecting on your past, do you focus on:
*
a) The specific details and events
b) The overall meaning and lessons learned
In conversations, do you:*
a) Share real-life examples and concrete evidence
b) Use hypothetical scenarios and imaginative ideas
In handling complex situations, do you:
*
a) Break it down into manageable steps
b) Focus on the bigger picture and how everything connects

Section 3: Thinking (T) vs. Feeling (F)
When making decisions, do you:
*
a) Prioritize logical, objective reasoning
b) Consider how the decision will affect others
Do you believe it’s more important to be:
*
a) Right and fair
b) Compassionate and understanding
When handling conflict, do you:
*
a) Address the issue directly and logically
b) Focus on maintaining harmony and relationships
In a team, do you prefer to:
*
a) Analyze and evaluate everyone’s contributions objectively
b) Ensure that everyone feels valued and included
When providing feedback, do you:
*
a) Focus on facts and areas for improvement
b) Emphasize strengths and be sensitive to how it is received
Do you tend to trust:*
a) Objective data and evidence
b) Personal values and emotions
When making a difficult decision, do you:
*
a) Focus on what is logically correct
b) Consider the emotional impact on others
Do you feel more comfortable:
*
a) Making decisions based on established rules or principles
b) Basing decisions on personal values and empathy
At work, do you prefer to:
*
a) Handle tasks with clarity and precision
b) Approach tasks with flexibility and concern for others
When faced with criticism, do you:
*
a) Accept it as constructive feedback
b) Feel personally affected by it
Do you find it easier to:
*
a) Address problems objectively and solve them quickly
b) Take into account everyone’s feelings before acting
When solving problems, do you:*
a) Look for logical solutions and eliminate emotions
b) Consider the human side of the problem
Are you more focused on:*
a) Achieving results and being efficient
b) Creating a positive, inclusive environment
In your interactions with colleagues, do you:
*
a) Prioritize truth and fairness
b) Ensure understanding and compassion
When a colleague is upset, do you:
*
a) Offer practical solutions
b) Offer emotional support and a listening ear
In stressful situations, do you:
*
a) Stay calm and think things through logically
b) Empathize with others’ stress and emotions
When making group decisions, do you:
*
a) Focus on what makes the most sense for the business
b) Ensure that everyone’s opinions and feelings are considered
Do you believe it’s more important to:*
a) Be respected for your logical insights
b) Be appreciated for your caring and kindness
When considering a new idea, do you:*
a) Analyze it thoroughly before deciding
b) Consider how it aligns with your values and feelings
In leadership, do you:
*
a) Focus on efficiency and clarity
b) Focus on team morale and well-being
When approaching tasks, do you:
*
a) Use a structured, methodical approach
b) Adapt to the needs and feelings of others
When dealing with setbacks, do you:*
a) Focus on finding logical solutions and moving forward
b) Reflect on how the situation has affected others emotionally
In conversations, do you:
*
a) Stay focused on the main point and facts
b) Allow for emotional expression and sharing
Do you prefer to work with people who:
*
a) Are clear and direct in their communication
b) Are sensitive and compassionate in their approach
Do you feel more rewarded by:
*
a) Achieving results and overcoming challenges
b) Building strong relationships and supporting others

Section 4: Judging (J) vs. Perceiving (P)
Do you prefer your day to be:
*
a) Planned and organized
b) Flexible and spontaneous
When completing tasks, do you:
*
a) Work steadily until completion
b) Procrastinate and then work in bursts of energy
Do you feel more comfortable when:
*
a) Everything is settled and decided
b) There are open possibilities and options
In your work routine, do you prefer:
*
a) Having a clear schedule and knowing what’s coming next
b) Allowing the day to unfold naturally
When making decisions, do you:
*
a) Make up your mind quickly
b) Prefer to keep your options open as long as possible
When planning a project, do you:
*
a) Break it down into structured steps and deadlines
b) Let things develop as the project progresses
Do you feel more stressed when:
*
a) Plans change unexpectedly
b) You have to commit to decisions too early
When preparing for a meeting or presentation, do you:*
a) Have everything organized and ready well in advance
b) Leave things until the last minute, often finding inspiration then
In your daily life, do you:
*
a) Prefer to follow routines and established patterns
b) Enjoy mixing things up and trying new approaches
Do you find it easier to:
*
a) Stick to a planned course of action
b) Adapt to changes and take advantage of new opportunities
When traveling, do you:
*
a) Plan your itinerary ahead of time
b) Prefer to be spontaneous and go with the flow
When making decisions with a team, do you:*
a) Push for a clear decision as soon as possible
b) Keep options open and consider new ideas for as long as possible
Do you prefer your workspace to be:
*
a) Organized and orderly
b) Creative and flexible, even if a bit messy
When starting a new project, do you:
*
a) Plan out the steps before beginning
b) Jump in and figure things out as you go
Are you more comfortable when:*
a) Deadlines and expectations are clear
b) There’s freedom to decide as the project progresses
In group work, do you:*
a) Prefer to establish rules and timelines early on
b) Prefer to stay flexible and adapt as the group works
Do you feel more productive when:
*
a) Following a structured plan
b) Taking advantage of unexpected opportunities
When organizing your workload, do you:
*
a) Stick to a task list or plan
b) Tackle things as they come up, adjusting priorities
When under pressure, do you:
*
a) Stick to your original plan to stay on track
b) Adapt and adjust based on the circumstances
Do you believe it’s more important to:
*
a) Be decisive and move forward
b) Stay open to possibilities and adjust as needed
When setting personal goals, do you:*
a) Create clear timelines and action steps
b) Set broad goals and adjust your approach along the way
At work, do you prefer:
*
a) Having structure and clear expectations
b) Having freedom to approach things your way
When approaching tasks, do you:
*
a) Prefer completing one task before moving on to the next
b) Like to multitask and switch between tasks frequently
Do you find yourself more comfortable when:*
a) Things are planned and predictable
b) There’s flexibility and room for spontaneity
In your personal life, do you:*
a) Stick to routines and established habits
b) Like to keep things flexible and go with the flow`;

const lines = raw.split('\n').map(l => l.trim()).filter(l => l && l !== '*');

let questions = [];
let currentCategory = '';
let currentLeftPole = '';
let currentRightPole = '';

let i = 0;
while (i < lines.length) {
  if (lines[i].startsWith('Section')) {
    const title = lines[i];
    if (title.includes('Extraversion')) {
      currentCategory = 'Energy'; currentLeftPole = 'E'; currentRightPole = 'I';
    } else if (title.includes('Sensing')) {
      currentCategory = 'Mind'; currentLeftPole = 'S'; currentRightPole = 'N';
    } else if (title.includes('Thinking')) {
      currentCategory = 'Nature'; currentLeftPole = 'T'; currentRightPole = 'F';
    } else if (title.includes('Judging')) {
      currentCategory = 'Tactics'; currentLeftPole = 'J'; currentRightPole = 'P';
    }
    i++;
    continue;
  }
  
  let qText = lines[i];
  if (qText.endsWith('*')) qText = qText.slice(0, -1);
  i++;
  let aText = lines[i];
  if (aText.startsWith('a)')) aText = aText.substring(2).trim();
  i++;
  let bText = lines[i];
  if (bText.startsWith('b)')) bText = bText.substring(2).trim();
  i++;
  
  const qObj = {
    id: 'Q' + String(questions.length + 1).padStart(3, '0'),
    question: qText,
    category: currentCategory,
    type: 'spectrum',
    weight: 1,
    required: true,
    active: true,
    left: aText,
    right: bText,
    leftPole: currentLeftPole,
    rightPole: currentRightPole
  };
  questions.push(qObj);
}

// Generate the JS code to overwrite questions array in config.js
let fileContent = fs.readFileSync('c:\\Users\\hp\\Desktop\\safe-assessment\\src\\data\\config.js', 'utf8');

const questionsCode = 'export const questions = ' + JSON.stringify(questions, null, 2) + '\n';
// replace everything between export const questions=[ and ]\nconst P
fileContent = fileContent.replace(/export const questions = \[\s*\{.*\}\s*\]\nconst P /s, questionsCode + 'const P ');

fs.writeFileSync('c:\\Users\\hp\\Desktop\\safe-assessment\\src\\data\\config.js', fileContent);
console.log('Successfully wrote ' + questions.length + ' questions');
