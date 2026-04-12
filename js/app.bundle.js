var I="grammemo_v1";var T=class{constructor(){this._load()}_load(){try{let e=localStorage.getItem(I),a=e?JSON.parse(e):this._defaultData();this.data=this._normalizeData(a),this._save()}catch{this.data=this._defaultData()}}_save(){localStorage.setItem(I,JSON.stringify(this.data))}_defaultData(){return{questionScores:{},sessions:[],streak:{current:0,longest:0,lastDate:null},totalXP:0,settings:{questionsPerSession:10,showHints:!0,soundEnabled:!1,darkMode:null},version:1}}_normalizeData(e){let a=this._defaultData(),s=e&&typeof e=="object"?e:{},n={};if(s.questionScores&&typeof s.questionScores=="object")for(let[i,c]of Object.entries(s.questionScores))!i||!c||typeof c!="object"||(n[i]={correct:Number.isFinite(c.correct)?Math.max(0,c.correct):0,incorrect:Number.isFinite(c.incorrect)?Math.max(0,c.incorrect):0,streak:Number.isFinite(c.streak)?Math.max(0,c.streak):0,lastSeen:Number.isFinite(c.lastSeen)?c.lastSeen:null,interval:Number.isFinite(c.interval)&&c.interval>0?c.interval:1,nextReview:Number.isFinite(c.nextReview)?c.nextReview:0});let r=Array.isArray(s.sessions)?s.sessions.filter(i=>Number.isFinite(i?.total)&&i.total>0).map(i=>({topicId:i.topicId,date:Number.isFinite(i.date)?i.date:Date.now(),correct:Number.isFinite(i.correct)?Math.max(0,Math.min(i.correct,i.total)):0,total:i.total,duration:Number.isFinite(i.duration)?Math.max(0,i.duration):0,xp:Number.isFinite(i.xp)?Math.max(0,i.xp):(Number.isFinite(i.correct)?Math.max(0,i.correct):0)*10+25})):[];return{...a,...s,questionScores:n,sessions:r,streak:{...a.streak,...s.streak||{},current:Number.isFinite(s.streak?.current)?Math.max(0,s.streak.current):a.streak.current,longest:Number.isFinite(s.streak?.longest)?Math.max(0,s.streak.longest):a.streak.longest,lastDate:typeof s.streak?.lastDate=="string"?s.streak.lastDate:a.streak.lastDate},totalXP:Number.isFinite(s.totalXP)?Math.max(0,s.totalXP):a.totalXP,settings:{...a.settings,...s.settings||{},questionsPerSession:Number.isFinite(s.settings?.questionsPerSession)?s.settings.questionsPerSession:a.settings.questionsPerSession,showHints:typeof s.settings?.showHints=="boolean"?s.settings.showHints:a.settings.showHints,soundEnabled:typeof s.settings?.soundEnabled=="boolean"?s.settings.soundEnabled:a.settings.soundEnabled,darkMode:s.settings?.darkMode===!0?!0:s.settings?.darkMode===!1?!1:null},version:a.version}}getQuestionScore(e){return this.data.questionScores[e]||{correct:0,incorrect:0,streak:0,lastSeen:null,interval:1,nextReview:0}}recordAnswer(e,a){let s={...this.getQuestionScore(e)},n=Date.now();a?(s.correct++,s.streak++,s.interval=Math.min(Math.round(s.interval*2.5),30)):(s.incorrect++,s.streak=0,s.interval=1),s.lastSeen=n,s.nextReview=n+s.interval*864e5,this.data.questionScores[e]=s;let r=a?10:0;return this.data.totalXP+=r,this._save(),{xpGained:r,newScore:s}}sortByPriority(e){let a=Date.now();return[...e].sort((s,n)=>{let r=this.data.questionScores[s.id],i=this.data.questionScores[n.id],c=!r||!r.lastSeen,o=!i||!i.lastSeen;if(c&&!o)return-1;if(!c&&o)return 1;if(c&&o)return 0;let l=r.nextReview<=a,d=i.nextReview<=a;return l&&!d?-1:!l&&d?1:r.nextReview-i.nextReview})}getTopicProgress(e){let a=e.length;if(a===0)return{seen:0,total:0,mastered:0,percentage:0,seenPercentage:0,masteredPercentage:0};let s=0,n=0;for(let c of e){let o=this.data.questionScores[c.id];o&&o.lastSeen&&(s++,o.correct>=2&&o.streak>=1&&n++)}let r=Math.round(s/a*100),i=Math.round(n/a*100);return{seen:s,total:a,mastered:n,percentage:r,seenPercentage:r,masteredPercentage:i}}saveSession({topicId:e,correct:a,total:s,duration:n}){return!Number.isFinite(s)||s<=0?!1:(this.data.sessions.push({topicId:e,date:Date.now(),correct:a,total:s,duration:n,xp:a*10+25}),this.data.totalXP+=25,this.data.sessions.length>200&&(this.data.sessions=this.data.sessions.slice(-200)),this._save(),!0)}getRecentSessions(e=10){return this.data.sessions.filter(a=>a.total>0).slice(-e).reverse()}getTopicSessions(e){return this.data.sessions.filter(a=>a.topicId===e)}touchStreak(){let e=new Date().toISOString().slice(0,10),a=new Date(Date.now()-864e5).toISOString().slice(0,10),{streak:s}=this.data;return s.lastDate===e||(s.lastDate===a?s.current++:s.current=1,s.longest=Math.max(s.longest,s.current),s.lastDate=e,this._save()),s}getSetting(e){return this.data.settings[e]}updateSettings(e){Object.assign(this.data.settings,e),this._save()}resetAll(){this.data=this._defaultData(),this._save()}resetTopic(e){for(let a of e)delete this.data.questionScores[a.id];this._save()}exportJSON(){return JSON.stringify(this.data,null,2)}importJSON(e){try{let a=JSON.parse(e);return a.version?(this.data=this._normalizeData(a),this._save(),!0):!1}catch{return!1}}getStats(){let e=Object.values(this.data.questionScores),a=e.reduce((r,i)=>r+i.correct+i.incorrect,0),s=e.reduce((r,i)=>r+i.correct,0),n=a>0?Math.round(s/a*100):0;return{totalXP:this.data.totalXP,streak:this.data.streak,totalAttempts:a,totalCorrect:s,accuracy:n,totalSessions:this.data.sessions.length,questionsAttempted:e.filter(r=>r.lastSeen).length}}},p=new T;function O(t,e,a){switch(e.innerHTML="",e.dataset.exerciseId=t.id,t.type){case"flashcard":return U(t,e,a);case"fill-blank":return Q(t,e,a);case"multiple-choice":return K(t,e,a);case"error-correction":return W(t,e,a);case"sentence-transform":return Y(t,e,a);default:return e.innerHTML=`<p class="text-red-500">Unknown exercise type: ${t.type}</p>`,Promise.resolve({correct:!1,userAnswer:""})}}function y(t){let e={flashcard:["\u{1F0CF}","Flashcard","bg-violet-100 text-violet-700"],"fill-blank":["\u270F\uFE0F","Fill in the blank","bg-blue-100 text-blue-700"],"multiple-choice":["\u{1F524}","Multiple choice","bg-amber-100 text-amber-700"],"error-correction":["\u{1F50D}","Error correction","bg-rose-100 text-rose-700"],"sentence-transform":["\u{1F504}","Sentence transform","bg-emerald-100 text-emerald-700"]},[a,s,n]=e[t]||["\u2753",t,"bg-gray-100 text-gray-700"];return`<span class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${n}">${a} ${s}</span>`}function $(t=1){return"\u2B50".repeat(t)+"\u2606".repeat(Math.max(0,3-t))}function A(t){return t.trim().toLowerCase().replace(/[’‘‛`´]/g,"'").replace(/([a-z])'([a-z])/g,"$1$2").replace(/\.+$/g,"").replace(/\s+/g," ")}function q(t,e){let a=A(t);return e.some(s=>A(s)===a)}function k(t,e,a){return t?`
      <div class="feedback-box feedback-correct">
        <div class="flex items-center gap-2 font-bold text-emerald-700 text-lg mb-1">
          <span>\u2713</span><span>Correct!</span>
        </div>
        ${a?`<p class="text-emerald-800 text-sm">${a}</p>`:""}
      </div>`:`
    <div class="feedback-box feedback-incorrect">
      <div class="flex items-center gap-2 font-bold text-rose-700 text-lg mb-1">
        <span>\u2717</span><span>Not quite</span>
      </div>
      <p class="text-rose-800 text-sm">Correct answer: <strong>${e}</strong></p>
      ${a?`<p class="text-rose-700 text-sm mt-1">${a}</p>`:""}
    </div>`}function V(t="Next \u2192"){return`<button class="btn-primary w-full mt-4" id="next-btn">${t}</button>`}function _(t,e,{allowShiftEnter:a=!1}={}){t.addEventListener("keydown",s=>{s.key==="Enter"&&(a&&s.shiftKey||(s.preventDefault(),e.click()))})}function U(t,e,a){e.innerHTML=`
    <div class="exercise-header">
      ${y(t.type)}
      <span class="text-xs text-gray-400 ml-2">${$(t.difficulty)}</span>
    </div>
    <div class="flashcard-wrap">
      <div class="flashcard" id="fc-card" role="button" aria-label="Flip card" tabindex="0">
        <div class="flashcard-inner">
          <div class="flashcard-front">
            <p class="text-2xl font-semibold text-center text-gray-800 leading-relaxed">${t.question}</p>
            <p class="tap-hint mt-8">\u{1F446} Tap to reveal answer</p>
          </div>
          <div class="flashcard-back">
            <p class="text-xl text-center text-gray-800 leading-relaxed whitespace-pre-line">${t.answer}</p>
          </div>
        </div>
      </div>
    </div>
    <div id="fc-actions" class="hidden flex gap-3 mt-6">
      <button id="fc-wrong" class="btn-secondary flex-1">\u{1F615} Didn't know</button>
      <button id="fc-right" class="btn-success flex-1">\u{1F389} Got it!</button>
    </div>
  `;let s=e.querySelector("#fc-card"),n=e.querySelector("#fc-actions"),r=e.querySelector("#fc-wrong"),i=!1,c=()=>{i||(s.classList.add("flipped"),n.classList.remove("hidden"),r.focus(),i=!0)};return s.addEventListener("click",c),s.addEventListener("keydown",o=>{(o.key==="Enter"||o.key===" ")&&c()}),new Promise(o=>{e.querySelector("#fc-wrong").addEventListener("click",()=>{let l={correct:!1,userAnswer:"didn't know"};a&&a(l),o(l)}),e.querySelector("#fc-right").addEventListener("click",()=>{let l={correct:!0,userAnswer:"knew it"};a&&a(l),o(l)})})}function Q(t,e,a){let s=t.sentence.replace("{_}",`<input type="text" id="fb-input" class="fill-input" placeholder="\u2026"
      autocomplete="off" spellcheck="false">`);e.innerHTML=`
    <div class="exercise-header">
      ${y(t.type)}
      <span class="text-xs text-gray-400 ml-2">${$(t.difficulty)}</span>
    </div>
    <p class="instruction-text">${t.instruction||"Complete the sentence."}</p>
    ${p.getSetting("showHints")&&t.hint?`<div class="hint-box">\u{1F4A1} Verb: <strong>${t.hint}</strong></div>`:""}
    <p class="sentence-text mt-6">${s}</p>
    <button id="submit-btn" class="btn-primary w-full mt-6">Check Answer</button>
    <div id="feedback-area"></div>
  `;let n=e.querySelector("#fb-input"),r=e.querySelector("#submit-btn"),i=e.querySelector("#feedback-area");return n.focus(),_(n,r),new Promise(c=>{let o=!1,l=null;r.addEventListener("click",()=>{if(o){c(l);return}if(!n.value.trim()){n.focus();return}o=!0;let d=q(n.value,t.answers);l={correct:d,userAnswer:n.value.trim()},a&&a(l),n.disabled=!0,n.classList.add(d?"input-correct":"input-incorrect"),i.innerHTML=k(d,t.answers[0],t.explanation),r.textContent="Next \u2192",r.focus(),i.scrollIntoView({behavior:"smooth",block:"nearest"})})})}function K(t,e,a){let s=["A","B","C","D"],n=t.options.map((o,l)=>`
    <button class="mc-option" data-index="${l}" data-letter="${s[l]}">
      <span class="mc-letter">${s[l]}</span>
      <span>${o}</span>
    </button>`).join("");e.innerHTML=`
    <div class="exercise-header">
      ${y(t.type)}
      <span class="text-xs text-gray-400 ml-2">${$(t.difficulty)}</span>
    </div>
    <p class="sentence-text mt-4">${t.sentence.replace("{_}",'<span class="blank-slot">___</span>')}</p>
    <div class="mc-grid mt-6">${n}</div>
    <div id="feedback-area"></div>
    <div id="next-area" class="hidden">${V()}</div>
  `;let r=e.querySelectorAll(".mc-option"),i=e.querySelector("#feedback-area"),c=e.querySelector("#next-area");return new Promise(o=>{let l=!1,d=null;r.forEach(m=>{m.addEventListener("click",()=>{if(l)return;l=!0;let E=parseInt(m.dataset.index),M=E===t.correct;d={correct:M,userAnswer:t.options[E]},a&&a(d),r.forEach((w,j)=>{w.disabled=!0,j===t.correct?w.classList.add("mc-correct"):j===E&&!M?w.classList.add("mc-incorrect"):w.classList.add("mc-dimmed")}),i.innerHTML=k(M,t.options[t.correct],t.explanation),c.classList.remove("hidden");let C=c.querySelector("#next-btn");C.focus(),i.scrollIntoView({behavior:"smooth",block:"nearest"}),C.addEventListener("click",()=>o(d))})})})}function W(t,e,a){e.innerHTML=`
    <div class="exercise-header">
      ${y(t.type)}
      <span class="text-xs text-gray-400 ml-2">${$(t.difficulty)}</span>
    </div>
    <p class="instruction-text">Find and correct the mistake(s) in this sentence:</p>
    <div class="error-sentence-box">
      <span class="error-badge">Error</span>
      <p class="text-xl font-medium text-gray-800 mt-2">${t.sentence}</p>
    </div>
    <textarea id="ec-input" class="correction-input mt-4" rows="2"
      placeholder="Type the corrected sentence\u2026" spellcheck="false"></textarea>
    <button id="submit-btn" class="btn-primary w-full mt-3">Check Answer</button>
    <div id="feedback-area"></div>
  `;let s=e.querySelector("#ec-input"),n=e.querySelector("#submit-btn"),r=e.querySelector("#feedback-area");return s.focus(),_(s,n,{allowShiftEnter:!0}),new Promise(i=>{let c=!1,o=null;n.addEventListener("click",()=>{if(c){i(o);return}if(!s.value.trim()){s.focus();return}c=!0;let l=q(s.value,t.answers);o={correct:l,userAnswer:s.value.trim()},a&&a(o),s.disabled=!0,s.classList.add(l?"input-correct":"input-incorrect"),r.innerHTML=k(l,t.answers[0],t.explanation),n.textContent="Next \u2192",n.focus(),r.scrollIntoView({behavior:"smooth",block:"nearest"})})})}function Y(t,e,a){e.innerHTML=`
    <div class="exercise-header">
      ${y(t.type)}
      <span class="text-xs text-gray-400 ml-2">${$(t.difficulty)}</span>
    </div>
    <p class="instruction-text">${t.instruction||"Rewrite the sentence."}</p>
    <div class="source-sentence-box">
      <p class="text-lg font-medium text-gray-700">${t.sentence}</p>
    </div>
    <textarea id="st-input" class="correction-input mt-4" rows="2"
      placeholder="Write the transformed sentence\u2026" spellcheck="false"></textarea>
    <button id="submit-btn" class="btn-primary w-full mt-3">Check Answer</button>
    <div id="feedback-area"></div>
  `;let s=e.querySelector("#st-input"),n=e.querySelector("#submit-btn"),r=e.querySelector("#feedback-area");return s.focus(),_(s,n,{allowShiftEnter:!0}),new Promise(i=>{let c=!1,o=null;n.addEventListener("click",()=>{if(c){i(o);return}if(!s.value.trim()){s.focus();return}c=!0;let l=q(s.value,t.answers);o={correct:l,userAnswer:s.value.trim()},a&&a(o),s.disabled=!0,s.classList.add(l?"input-correct":"input-incorrect"),r.innerHTML=k(l,t.answers[0],t.explanation),n.textContent="Next \u2192",n.focus(),r.scrollIntoView({behavior:"smooth",block:"nearest"})})})}var x={manifest:null,topicCache:{},session:null,sessionStart:0},u=document.getElementById("app"),H="GrammarDeck";async function Z(){S();let t=window.matchMedia("(prefers-color-scheme: dark)"),e=()=>{(p.getSetting("darkMode")===null||p.getSetting("darkMode")===void 0)&&S()};typeof t.addEventListener=="function"?t.addEventListener("change",e):typeof t.addListener=="function"&&t.addListener(e),x.manifest=await X("content/manifest.json"),window.addEventListener("hashchange",N),N()}function N(){let t=window.location.hash.replace("#","")||"/",[,e,...a]=t.split("/");if(!e||e==="")return R();if(e==="topic")return B(a[0]);if(e==="study")return tt(a[0],a[1]);if(e==="practice")return et(a[0]);if(e==="stats")return st();if(e==="settings")return z();R()}function g(t){let e=t.startsWith("#")?t:`#${t}`;if(window.location.hash===e){N();return}window.location.hash=e}async function X(t){let e=await fetch(t);if(!e.ok)throw new Error(`Failed to fetch ${t}`);return e.json()}async function b(t){if(x.topicCache[t])return x.topicCache[t];let e=x.manifest.topics.find(s=>s.id===t);if(!e)throw new Error(`Topic ${t} not found`);let a=await X(e.file);return x.topicCache[t]=a,a}function L(t){return x.manifest?.topics.find(e=>e.id===t)}function f(t){return{violet:{bg:"bg-violet-500",light:"bg-violet-50",text:"text-violet-700",border:"border-violet-200",badge:"bg-violet-100 text-violet-700"},emerald:{bg:"bg-emerald-500",light:"bg-emerald-50",text:"text-emerald-700",border:"border-emerald-200",badge:"bg-emerald-100 text-emerald-700"},rose:{bg:"bg-rose-500",light:"bg-rose-50",text:"text-rose-700",border:"border-rose-200",badge:"bg-rose-100 text-rose-700"},blue:{bg:"bg-blue-500",light:"bg-blue-50",text:"text-blue-700",border:"border-blue-200",badge:"bg-blue-100 text-blue-700"}}[t]||f("violet")}function v(t,e="bg-violet-500"){let a=Number.isFinite(t)?Math.max(0,Math.min(100,Math.round(t))):0;return`
    <div class="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
      <div class="${e} h-2 rounded-full transition-all duration-500" style="width:${a}%"></div>
    </div>`}function D(t){let e=`${t.seen}/${t.total} practiced`,a=`${t.mastered} mastered`;return{percentage:t.seenPercentage,practiced:e,mastered:a}}function F(t){let e=Math.floor(t/100)+1,a=t%100;return{level:e,xpInLevel:a,xpToNext:100}}function h(t=""){return`
    <nav class="app-nav fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex z-50">
      ${[{path:"/",icon:"\u{1F3E0}",label:"Home"},{path:"/stats",icon:"\u{1F4CA}",label:"Stats"},{path:"/settings",icon:"\u2699\uFE0F",label:"Settings"}].map(a=>{let s=t===a.path;return`<a href="#${a.path}" class="nav-link ${s?"nav-link-active":""}">
          <span class="text-xl">${a.icon}</span>
          <span class="text-xs mt-0.5">${a.label}</span>
        </a>`}).join("")}
    </nav>`}async function R(){u.innerHTML='<div class="loading-screen"><div class="spinner"></div></div>';let t=p.getStats(),{level:e,xpInLevel:a}=F(t.totalXP),s=t.streak.current>=7?"\u{1F525}":t.streak.current>=3?"\u26A1":"\u{1F4C5}",n=await Promise.all(x.manifest.topics.map(async r=>{let i={seen:0,total:0,mastered:0,percentage:0,seenPercentage:0,masteredPercentage:0};try{let m=await b(r.id);i=p.getTopicProgress(m.exercises||[])}catch{}let c=f(r.color),o=i.seen>0,l=i.mastered===i.total&&i.total>0,d=D(i);return`
      <article class="topic-card ${c.border} border-2 cursor-pointer hover:shadow-lg transition-all duration-200"
        onclick="navigate('/topic/${r.id}')">
        <div class="flex items-start justify-between mb-3">
          <div>
            <span class="text-3xl">${r.icon}</span>
            <div class="mt-2">
              <span class="text-xs font-medium ${c.badge} px-2 py-0.5 rounded-full">${r.topic}</span>
            </div>
          </div>
          ${l?'<span class="text-2xl">\u2705</span>':o?'<span class="text-2xl">\u25B6\uFE0F</span>':'<span class="text-2xl">\u{1F512}</span>'}
        </div>
        <h3 class="font-bold text-gray-800 text-base leading-tight">${r.title}</h3>
        <p class="text-gray-500 text-sm mt-1 leading-relaxed">${r.description}</p>
        <div class="mt-4">
          ${v(d.percentage,c.bg)}
          <div class="flex justify-between text-xs text-gray-400 mt-1">
            <span>${d.practiced}</span>
            <span>${d.percentage}%</span>
          </div>
          <p class="text-xs text-gray-400 mt-1">${d.mastered}</p>
        </div>
      </article>`}));u.innerHTML=`
    <div class="page-container pb-24">
      <!-- Hero header -->
      <div class="hero-header">
        <div class="max-w-xl mx-auto px-4 pt-8 pb-6">
          <h1 class="text-3xl font-extrabold text-white">${H}</h1>
          <p class="text-violet-200 text-sm mt-1">English Grammar \xB7 Present Simple</p>
          <!-- Stats strip -->
          <div class="flex gap-4 mt-5">
            <div class="stat-chip">
              ${s} <span>${t.streak.current} day streak</span>
            </div>
            <div class="stat-chip">
              \u26A1 <span>${t.totalXP} XP</span>
            </div>
            <div class="stat-chip">
              \u{1F393} <span>Level ${e}</span>
            </div>
          </div>
          <!-- XP bar -->
          <div class="mt-3">
            ${v(a,"bg-amber-400")}
            <p class="text-violet-200 text-xs mt-1">${a}/100 XP to Level ${e+1}</p>
          </div>
        </div>
      </div>

      <div class="max-w-xl mx-auto px-4 mt-6">
        <h2 class="text-lg font-bold text-gray-700 mb-4">\u{1F4DA} Topics</h2>
        <div class="grid gap-4">
          ${n.join("")}
        </div>

        <div class="mt-8 text-center">
          <p class="text-xs text-gray-400">
            ${t.questionsAttempted} questions attempted \xB7 ${t.accuracy}% accuracy
          </p>
        </div>
      </div>
    </div>
    ${h("/")}
  `}async function B(t){u.innerHTML='<div class="loading-screen"><div class="spinner"></div></div>';let e=L(t);if(!e){g("/");return}let a=await b(t),s=p.getTopicProgress(a.exercises||[]),n=f(e.color),r=p.getTopicSessions(t),i=r[r.length-1],c=D(s),o={};for(let d of a.exercises||[])o[d.type]=(o[d.type]||0)+1;let l=Object.entries(o).map(([d,m])=>`<span class="${n.badge} text-xs px-2 py-1 rounded-full">${m} ${d.replace("-"," ")}</span>`).join(" ");u.innerHTML=`
    <div class="page-container pb-24">
      <div class="back-bar">
        <a href="#/" class="back-btn">\u2190 Back</a>
      </div>

      <div class="topic-hero ${n.bg} text-white px-4 py-8">
        <div class="max-w-xl mx-auto">
          <span class="text-5xl">${e.icon}</span>
          <h1 class="text-2xl font-bold mt-2">${e.title}</h1>
          <p class="text-sm opacity-80 mt-1">${e.description}</p>
        </div>
      </div>

      <div class="max-w-xl mx-auto px-4 mt-6">
        <!-- Progress card -->
        <div class="card mb-4">
          <h2 class="font-bold text-gray-700 mb-3">Your Progress</h2>
          ${v(c.percentage,n.bg)}
          <div class="flex justify-between text-sm text-gray-500 mt-2">
            <span>${c.practiced}</span>
            <span>${c.percentage}%</span>
          </div>
          <p class="text-xs text-gray-400 mt-2">${c.mastered}</p>
          ${i?`<p class="text-xs text-gray-400 mt-2">Last session: ${new Date(i.date).toLocaleDateString()} \u2014 ${i.correct}/${i.total} correct</p>`:""}
        </div>

        <!-- Exercise types -->
        <div class="card mb-4">
          <h2 class="font-bold text-gray-700 mb-2">Exercise Types</h2>
          <div class="flex flex-wrap gap-2">${l}</div>
        </div>

        <!-- Action buttons -->
        <div class="flex flex-col gap-3">
          <button onclick="navigate('/study/${t}')" class="btn-primary py-4 text-base">
            \u{1F4D6} Study Theory
          </button>
          <button onclick="navigate('/practice/${t}')" class="btn-success py-4 text-base">
            \u{1F3AF} Practice Exercises
          </button>
          ${s.seen>0?`
          <button onclick="confirmResetTopic('${t}')" class="btn-secondary text-sm py-2">
            \u{1F504} Reset Topic Progress
          </button>`:""}
        </div>

        <!-- Lessons preview -->
        ${a.lessons?.length?`
        <div class="mt-6">
          <h2 class="font-bold text-gray-700 mb-3">Lessons</h2>
          ${a.lessons.map((d,m)=>`
            <button
              type="button"
              onclick="navigate('/study/${t}/${m}')"
              class="card lesson-preview-btn mb-2 w-full text-left"
              aria-label="Open lesson ${m+1}: ${d.title}">
              <span class="lesson-preview-meta">Lesson ${m+1}</span>
              <h3 class="font-semibold text-gray-800">${d.title}</h3>
            </button>`).join("")}
        </div>`:""}
      </div>
    </div>
    ${h()}
  `}async function tt(t,e=0){u.innerHTML='<div class="loading-screen"><div class="spinner"></div></div>';let a=L(t),s=await b(t);if(!s.lessons?.length){u.innerHTML=`<div class="page-container pb-24">
      <div class="back-bar"><a href="#/topic/${t}" class="back-btn">\u2190 Back</a></div>
      <div class="max-w-xl mx-auto px-4 mt-12 text-center">
        <p class="text-gray-500">No lessons available for this topic yet.</p>
        <a href="#/topic/${t}" class="btn-primary mt-4 inline-block">Back</a>
      </div>
    </div>`;return}let n=s.lessons.length,r=Math.min(Math.max(Number.parseInt(e,10)||0,0),n-1);function i(c){let o=s.lessons[c],l=at(o.content);u.innerHTML=`
      <div class="page-container pb-24">
        <div class="back-bar">
          <a href="#/topic/${t}" class="back-btn">\u2190 Back</a>
          <span class="text-sm text-gray-400">${c+1} / ${n}</span>
        </div>
        ${v((c+1)/n*100,f(a?.color||"violet").bg)}
        <div class="max-w-xl mx-auto px-4 mt-6">
          <div class="card lesson-card">
            <div class="${f(a?.color||"violet").badge} text-xs px-2 py-1 rounded-full inline-block mb-3">
              Lesson ${c+1} of ${n}
            </div>
            <h2 class="text-xl font-bold text-gray-800 mb-4">${o.title}</h2>
            <div class="lesson-content">${l}</div>
          </div>
          <div class="flex gap-3 mt-6">
            ${c>0?'<button id="prev-btn" class="btn-secondary flex-1">\u2190 Previous</button>':'<div class="flex-1"></div>'}
            ${c<n-1?'<button id="next-btn" class="btn-primary flex-1">Next \u2192</button>':'<button id="done-btn" class="btn-success flex-1">Start Practicing \u{1F3AF}</button>'}
          </div>
        </div>
      </div>
      ${h()}
    `,u.querySelector("#prev-btn")?.addEventListener("click",()=>i(c-1)),u.querySelector("#next-btn")?.addEventListener("click",()=>i(c+1)),u.querySelector("#done-btn")?.addEventListener("click",()=>g(`/practice/${t}`))}i(r)}async function et(t){u.innerHTML='<div class="loading-screen"><div class="spinner"></div></div>';let e=await b(t),a=p.getSetting("questionsPerSession")||10,n=p.sortByPriority(e.exercises||[]).slice(0,a);if(!n.length){u.innerHTML=`<div class="max-w-xl mx-auto px-4 mt-12 text-center">
      <p>No exercises available.</p>
      <a href="#/topic/${t}" class="btn-primary mt-4 inline-block">Back</a>
    </div>`;return}x.session={topicId:t,results:[],index:0,exercises:n},x.sessionStart=Date.now(),G()}function G(){let{session:t}=x;if(t.index>=t.exercises.length){J();return}let e=t.exercises[t.index],a=t.exercises.length,s=t.index+1,n=L(t.topicId),r=f(n?.color||"violet");u.innerHTML=`
    <div class="page-container pb-24">
      <div class="exercise-top-bar">
        <button onclick="confirmExitSession()" class="text-gray-400 hover:text-gray-600 text-xl leading-none">\u2715</button>
        <div class="flex-1 mx-4">
          ${v(t.index/a*100,r.bg)}
        </div>
        <span class="text-sm font-medium text-gray-500">${s}/${a}</span>
      </div>

      <div class="max-w-xl mx-auto px-4 mt-4 pb-8">
        <div id="exercise-container"></div>
      </div>
    </div>
  `;let i=u.querySelector("#exercise-container");O(e,i,c=>{p.touchStreak();let{xpGained:o}=p.recordAnswer(e.id,c.correct);if(c.xpGained=o,c.correct&&o>0){let l=document.createElement("div");l.className="xp-flash",l.textContent=`+${o} XP`,document.body.appendChild(l),setTimeout(()=>l.remove(),1200)}}).then(({correct:c,userAnswer:o,xpGained:l})=>{t.results.push({exerciseId:e.id,correct:c,userAnswer:o,xpGained:l}),t.index++,setTimeout(G,300)})}function J(){let{session:t}=x;if(!t){g("/");return}let e=t.results.filter(o=>o.correct).length,a=t.results.length;if(a===0){let o=t.topicId;x.session=null,P("Session discarded."),g(`/topic/${o}`);return}let s=Math.round((Date.now()-x.sessionStart)/1e3),n=t.results.reduce((o,l)=>o+l.xpGained,0)+25,r=Math.round(e/a*100),i=r===100?"\u{1F3C6}":r>=80?"\u{1F389}":r>=60?"\u{1F44D}":"\u{1F4AA}",c=t.topicId;p.saveSession({topicId:c,correct:e,total:a,duration:s}),x.session=null,u.innerHTML=`
    <div class="page-container pb-24">
      <div class="max-w-xl mx-auto px-4 py-10 text-center">
        <div class="text-6xl mb-4">${i}</div>
        <h1 class="text-3xl font-extrabold text-gray-800">Session Complete!</h1>
        <p class="text-gray-500 mt-2">${r===100?"Perfect score!":r>=80?"Great job!":r>=60?"Good effort!":"Keep practicing!"}</p>

        <!-- Score circle -->
        <div class="score-circle mx-auto mt-8">
          <span class="text-4xl font-extrabold text-violet-600">${e}</span>
          <span class="text-gray-400 text-lg">/${a}</span>
        </div>
        <p class="text-sm text-gray-400 mt-2">${r}% correct</p>

        <!-- Stats row -->
        <div class="flex justify-center gap-6 mt-6">
          <div class="result-stat">
            <span class="text-2xl font-bold text-amber-500">+${n}</span>
            <span class="text-xs text-gray-400 block">XP Earned</span>
          </div>
          <div class="result-stat">
            <span class="text-2xl font-bold text-violet-500">${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}</span>
            <span class="text-xs text-gray-400 block">Time</span>
          </div>
          <div class="result-stat">
            <span class="text-2xl font-bold text-emerald-500">${p.getStats().streak.current}</span>
            <span class="text-xs text-gray-400 block">Day Streak</span>
          </div>
        </div>

        <!-- Per-question breakdown -->
        <div class="mt-8 text-left">
          <h2 class="font-bold text-gray-700 mb-3">Review</h2>
          <div class="space-y-2">
            ${t.results.map((o,l)=>{let d=t.exercises[l],m=(d.answers?d.answers[0]:d.options?d.options[d.correct]:d.answer)||"";return`
                <div class="review-item ${o.correct?"review-correct":"review-incorrect"}">
                  <span class="text-lg">${o.correct?"\u2713":"\u2717"}</span>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-gray-700 truncate">${d.sentence||d.question||"Exercise"}</p>
                    ${o.correct?"":`<p class="text-xs text-rose-600">\u2192 ${m}</p>`}
                  </div>
                </div>`}).join("")}
          </div>
        </div>

        <div class="flex flex-col gap-3 mt-8">
          <button onclick="navigate('/practice/${c}')" class="btn-primary py-3">
            \u{1F501} Practice Again
          </button>
          <a href="#/topic/${c}" class="btn-secondary py-3 text-center">
            Back to Topic
          </a>
        </div>
      </div>
    </div>
    ${h()}
  `}async function st(){u.innerHTML='<div class="loading-screen"><div class="spinner"></div></div>';let t=p.getStats(),{level:e,xpInLevel:a}=F(t.totalXP),s=p.getRecentSessions(5),n=await Promise.all(x.manifest.topics.map(async r=>{let i={seen:0,total:0,mastered:0,percentage:0,seenPercentage:0,masteredPercentage:0};try{let l=await b(r.id);i=p.getTopicProgress(l.exercises||[])}catch{}let c=f(r.color),o=D(i);return`
      <div class="flex items-center gap-3">
        <span class="text-2xl">${r.icon}</span>
        <div class="flex-1">
          <p class="text-sm font-medium text-gray-700">${r.subtopic}</p>
          <p class="text-xs text-gray-400 mb-1">${o.practiced} \xB7 ${o.mastered}</p>
          ${v(o.percentage,c.bg)}
        </div>
        <span class="text-sm font-bold text-gray-600">${o.percentage}%</span>
      </div>`}));u.innerHTML=`
    <div class="page-container pb-24">
      <div class="back-bar">
        <span class="text-lg font-bold text-gray-800">\u{1F4CA} Statistics</span>
      </div>
      <div class="max-w-xl mx-auto px-4 mt-4">

        <!-- XP & Level -->
        <div class="card mb-4 text-center">
          <div class="text-5xl font-extrabold text-violet-600">Lv. ${e}</div>
          <p class="text-gray-500 text-sm mt-1">${t.totalXP} XP total</p>
          ${v(a,"bg-amber-400")}
          <p class="text-xs text-gray-400 mt-1">${a}/100 XP to Level ${e+1}</p>
        </div>

        <!-- Streak -->
        <div class="card mb-4">
          <div class="flex justify-around text-center">
            <div>
              <div class="text-3xl font-bold text-orange-500">${t.streak.current} \u{1F525}</div>
              <div class="text-xs text-gray-400 mt-1">Current streak</div>
            </div>
            <div>
              <div class="text-3xl font-bold text-amber-500">${t.streak.longest}</div>
              <div class="text-xs text-gray-400 mt-1">Best streak</div>
            </div>
            <div>
              <div class="text-3xl font-bold text-blue-500">${t.totalSessions}</div>
              <div class="text-xs text-gray-400 mt-1">Sessions</div>
            </div>
          </div>
        </div>

        <!-- Accuracy -->
        <div class="card mb-4">
          <h2 class="font-bold text-gray-700 mb-2">Overall Accuracy</h2>
          ${v(t.accuracy,"bg-emerald-500")}
          <div class="flex justify-between text-sm text-gray-500 mt-1">
            <span>${t.totalCorrect} correct</span>
            <span>${t.accuracy}%</span>
            <span>${t.totalAttempts} total</span>
          </div>
        </div>

        <!-- Per-topic progress -->
        <div class="card mb-4">
          <h2 class="font-bold text-gray-700 mb-3">Topic Progress</h2>
          <div class="space-y-3">${n.join("")}</div>
        </div>

        <!-- Recent sessions -->
        ${s.length>0?`
        <div class="card mb-4">
          <h2 class="font-bold text-gray-700 mb-3">Recent Sessions</h2>
          <div class="space-y-2">
            ${s.map(r=>{let i=r.total>0?Math.round(r.correct/r.total*100):null,c=L(r.topicId),o=i===null?"text-gray-400":i>=80?"text-emerald-600":i>=60?"text-amber-500":"text-rose-500";return`
                <div class="flex items-center justify-between text-sm">
                  <span>${c?.icon||"\u{1F4DA}"} ${c?.subtopic||r.topicId}</span>
                  <span class="text-gray-400">${new Date(r.date).toLocaleDateString()}</span>
                  <span class="${o} font-medium">${i===null?"\u2014":`${i}%`}</span>
                </div>`}).join("")}
          </div>
        </div>`:""}

      </div>
    </div>
    ${h("/stats")}
  `}function z(){let t=p.getSetting("questionsPerSession"),e=p.getSetting("showHints"),a=p.getSetting("darkMode"),s=a===!0?"dark":a===!1?"light":"auto";u.innerHTML=`
    <div class="page-container pb-24">
      <div class="back-bar">
        <span class="text-lg font-bold text-gray-800">\u2699\uFE0F Settings</span>
      </div>
      <div class="max-w-xl mx-auto px-4 mt-4">

        <!-- Preferences -->
        <div class="card mb-4">
          <h2 class="font-bold text-gray-700 mb-4">Preferences</h2>

          <div class="setting-row">
            <div>
              <p class="font-medium text-gray-700 dark:text-gray-200">Appearance</p>
              <p class="text-xs text-gray-400">Auto follows your system setting</p>
            </div>
            <select id="dark-select" class="select-input">
              <option value="auto"  ${s==="auto"?"selected":""}>\u{1F313} Auto</option>
              <option value="dark"  ${s==="dark"?"selected":""}>\u{1F319} Dark</option>
              <option value="light" ${s==="light"?"selected":""}>\u2600\uFE0F Light</option>
            </select>
          </div>

          <div class="setting-row mt-3">
            <div>
              <p class="font-medium text-gray-700 dark:text-gray-200">Questions per session</p>
              <p class="text-xs text-gray-400">How many exercises per practice session</p>
            </div>
            <select id="qps-select" class="select-input">
              ${[5,10,15,20].map(n=>`<option value="${n}" ${n===t?"selected":""}>${n}</option>`).join("")}
            </select>
          </div>

          <div class="setting-row mt-3">
            <div>
              <p class="font-medium text-gray-700 dark:text-gray-200">Show hints</p>
              <p class="text-xs text-gray-400">Show verb hints in fill-blank exercises</p>
            </div>
            <label class="toggle">
              <input type="checkbox" id="hints-toggle" ${e?"checked":""}>
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>

        <!-- Data management -->
        <div class="card mb-4">
          <h2 class="font-bold text-gray-700 mb-4">Data</h2>
          <div class="space-y-3">
            <button id="export-btn" class="btn-secondary w-full">\u{1F4E4} Export Progress</button>
            <label class="btn-secondary w-full text-center cursor-pointer block">
              \u{1F4E5} Import Progress
              <input type="file" id="import-file" accept=".json" class="hidden">
            </label>
            <button id="reset-btn" class="btn-danger w-full">\u{1F5D1}\uFE0F Reset All Progress</button>
          </div>
        </div>

        <div class="card text-center">
          <p class="text-sm text-gray-400">${H} \xB7 English Grammar Learning</p>
          <p class="text-xs text-gray-300 mt-1">Add content via <code>content/topics/</code> JSON files</p>
        </div>
      </div>
    </div>
    ${h("/settings")}
  `,u.querySelector("#dark-select").addEventListener("change",n=>{let r=n.target.value,i=r==="dark"?!0:r==="light"?!1:null;p.updateSettings({darkMode:i}),S()}),u.querySelector("#qps-select").addEventListener("change",n=>p.updateSettings({questionsPerSession:parseInt(n.target.value)})),u.querySelector("#hints-toggle").addEventListener("change",n=>p.updateSettings({showHints:n.target.checked})),u.querySelector("#export-btn").addEventListener("click",()=>{let n=new Blob([p.exportJSON()],{type:"application/json"}),r=document.createElement("a");r.href=URL.createObjectURL(n),r.download="grammardeck-backup.json",r.click(),setTimeout(()=>URL.revokeObjectURL(r.href),0)}),u.querySelector("#import-file").addEventListener("change",n=>{let r=n.target.files[0];if(!r)return;let i=new FileReader;i.onload=c=>{let o=p.importJSON(c.target.result);P(o?"\u2705 Progress imported!":"\u274C Invalid file"),o&&(S(),z())},i.readAsText(r)}),u.querySelector("#reset-btn").addEventListener("click",()=>{confirm("Reset ALL progress? This cannot be undone.")&&(p.resetAll(),P("Progress reset."),R())})}function S(){let t=p.getSetting("darkMode"),e=window.matchMedia("(prefers-color-scheme: dark)").matches,a=t==null?e:t===!0;document.documentElement.classList.toggle("dark",a)}window.navigate=g;window.confirmExitSession=()=>{confirm("Exit this session? Your progress so far will be saved.")&&(x.session?J():g("/"))};window.confirmResetTopic=async t=>{if(confirm("Reset progress for this topic?")){let e=await b(t);p.resetTopic(e.exercises||[]),P("Topic progress reset."),B(t)}};function P(t){let e=document.createElement("div");e.className="toast",e.textContent=t,document.body.appendChild(e),requestAnimationFrame(()=>e.classList.add("toast-show")),setTimeout(()=>{e.classList.remove("toast-show"),setTimeout(()=>e.remove(),300)},2500)}function at(t){return t?t.replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>").replace(/\*(.+?)\*/g,"<em>$1</em>").replace(/`(.+?)`/g,'<code class="inline-code">$1</code>').replace(/^(#{1,3}) (.+)$/gm,(a,s,n)=>`<h${s.length} class="lesson-h${s.length}">${n}</h${s.length}>`).replace(/^📌 (.+)$/gm,'<p class="use-case">\u{1F4CC} $1</p>').replace(/^⏰ (.+)$/gm,'<p class="use-case">\u23F0 $1</p>').replace(/^🔁 (.+)$/gm,'<p class="use-case">\u{1F501} $1</p>').replace(/^⚠️ (.+)$/gm,'<p class="warning-case">\u26A0\uFE0F $1</p>').replace(/^🔤 (.+)$/gm,'<p class="rule-case">\u{1F524} $1</p>').replace(/^• (.+)$/gm,'<li class="lesson-li">$1</li>').replace(/(<li.*<\/li>\n?)+/g,a=>`<ul class="lesson-ul">${a}</ul>`).replace(/\|(.+)\|/g,a=>{let s=a.split("|").filter(n=>n.trim()!=="");return s.length===0?a:"<tr>"+s.map(n=>`<td class="table-cell">${n.trim()}</td>`).join("")+"</tr>"}).replace(/(<tr>.*<\/tr>\n?)+/g,a=>`<table class="lesson-table">${a}</table>`).split(/\n\n+/).map(a=>{let s=a.trim();return s.startsWith("<")&&/^(<h|<p|<ul|<table|<div)/.test(s)?s:`<p class="lesson-p">${s.replace(/\n/g,"<br>")}</p>`}).join(""):""}Z().catch(t=>{u.innerHTML=`
    <div class="max-w-xl mx-auto px-4 py-12 text-center">
      <p class="text-5xl">\u{1F615}</p>
      <h1 class="text-xl font-bold text-gray-700 mt-4">Could not load ${H}</h1>
      <p class="text-gray-500 text-sm mt-2">${t.message}</p>
      <p class="text-xs text-gray-400 mt-2">Make sure you're running this from a web server, not file://</p>
    </div>`});
