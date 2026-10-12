// Config-driven scoring: every answer yields {pole: points}; nothing is hard-coded per question.
export function contribution(q,a){
 if(a==null||a==='') return {}
 const w=q.weight??1,out={}
 const add=(p,v)=>{if(p&&p!=='neutral'&&v>0)out[p]=(out[p]||0)+v*w}
 const mid=q.type==='scale5'?3:4
 if(q.type==='scale5'||q.type==='scale7') add(q.scoring?.[a],Math.abs(a-mid))
 else if(q.type==='single'||q.type==='scenario') Object.entries(q.options[a]?.scores||{}).forEach(([p,v])=>add(p,v))
 else if(q.type==='multi') a.forEach(i=>Object.entries(q.options[i]?.scores||{}).forEach(([p,v])=>add(p,v)))
 else if(q.type==='slider'){const r=(a-q.min)/(q.max-q.min);add(q.pole,r*3);add(q.other,(1-r)*3)}
 else if(q.type==='spectrum'){const d=a-3;add(d<0?q.leftPole:q.rightPole,Math.abs(d))}
 return out}
export function score(questions,answers,dimensions){
 const t={}
 questions.filter(q=>q.active).forEach(q=>Object.entries(contribution(q,answers[q.id])).forEach(([p,v])=>t[p]=(t[p]||0)+v))
 const dims=dimensions.map(d=>{const[a,b]=d.poles,x=t[a]||0,y=t[b]||0,s=x+y,pb=s?Math.round(y/s*100):50
  return{...d,pct:{[a]:100-pb,[b]:pb},winner:pb>=50?b:a}})
 const code=dims.slice(0,4).map(d=>d.winner).join('')
 return{dims,code,id:dims[4].winner,type:`${code}-${dims[4].winner}`}}
