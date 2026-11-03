/* Patra AI engine
   1) Works fully offline with a built-in rules engine.
   2) If the user adds an Anthropic API key, text is written by Claude instead. */
const AI = (() => {
  const KEY_NAME = 'patra_api_key';
  const getKey = () => localStorage.getItem(KEY_NAME) || '';
  const setKey = k => localStorage.setItem(KEY_NAME, k);
  const clearKey = () => localStorage.removeItem(KEY_NAME);

  async function askClaude(prompt) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': getKey(),
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    if (!res.ok) throw new Error('API error ' + res.status);
    const data = await res.json();
    return data.content.map(c => c.text || '').join('').trim();
  }

  /* ---------- helpers ---------- */
  const STOP = new Set(('the and for with you your are our will have has that this from they their who all can not but out '
    + 'about into any per etc using use used work working years year experience ability strong good great team '
    + 'role job candidate looking required requirements responsibilities skills must plus also such other may well').split(' '));

  const skillList = d => (d.skills || '').split(',').map(s => s.trim()).filter(Boolean);

  function yearsOfExperience(d) {
    const ys = [];
    const now = new Date().getFullYear();
    (d.experience || []).forEach(e => {
      const s = (e.start || '').match(/\d{4}/);
      const en = /present|current|now/i.test(e.end || '') ? [String(now)] : (e.end || '').match(/\d{4}/);
      if (s) ys.push(+s[0]);
      if (en) ys.push(+en[0]);
    });
    return ys.length >= 2 ? Math.max(...ys) - Math.min(...ys) : 0;
  }

  function resumeText(d) {
    return [d.title, d.summary, d.skills,
      ...(d.experience || []).map(e => [e.role, e.company, e.desc].join(' ')),
      ...(d.projects || []).map(p => [p.name, p.desc].join(' ')),
      ...(d.education || []).map(e => [e.degree, e.school].join(' '))
    ].join(' ').toLowerCase();
  }

  /* ---------- summary ---------- */
  async function summary(d) {
    if (getKey()) {
      return askClaude(`Write a professional resume summary (max 55 words, first person implied, no "I") for this person. Reply with the summary only.\n${JSON.stringify(d)}`);
    }
    const sk = skillList(d).slice(0, 4);
    const yrs = yearsOfExperience(d);
    const title = d.title || 'Professional';
    const skillTxt = sk.length ? sk.slice(0, -1).join(', ') + (sk.length > 1 ? ' and ' : '') + sk.slice(-1) : 'problem solving and teamwork';
    const first = yrs > 0
      ? `${title} with ${yrs}+ years of experience in ${skillTxt}.`
      : `Motivated ${title} with hands-on skills in ${skillTxt}.`;
    const mids = [
      'Known for delivering clean, reliable work and learning new tools quickly.',
      'Combines strong fundamentals with a focus on measurable results.',
      'Works well in teams and takes ownership from idea to delivery.'
    ];
    const last = 'Looking to contribute to a growth-focused team and create real impact.';
    return `${first} ${mids[Math.floor(Math.random() * mids.length)]} ${last}`;
  }

  /* ---------- bullet improver ---------- */
  const WEAK = [
    [/^(i )?worked on\b/i, 'Developed'], [/^(i )?was responsible for\b/i, 'Managed'], [/^responsible for\b/i, 'Managed'],
    [/^(i )?helped( to)?\b/i, 'Supported'], [/^(i )?made\b/i, 'Built'], [/^(i )?did\b/i, 'Executed'],
    [/^(i )?handled\b/i, 'Managed'], [/^(i )?was part of\b/i, 'Collaborated on'], [/^(i )?used\b/i, 'Leveraged'],
    [/^(i )?tried to\b/i, 'Worked to'], [/^(i )?created\b/i, 'Designed'], [/^(i )?took care of\b/i, 'Oversaw'],
    [/^(i )?fixed\b/i, 'Resolved'], [/^(i )?wrote\b/i, 'Authored'], [/^(i )?taught\b/i, 'Trained'],
    [/^(i )?(am|was) working on\b/i, 'Developing']
  ];
  const STRONG = new Set(['built','developed','designed','led','managed','created','launched','improved','reduced','increased','implemented','automated','delivered','optimized','optimised','analyzed','analysed','trained','resolved','authored','supported','collaborated','oversaw','executed','leveraged','engineered','coordinated','established','streamlined','achieved','generated','mentored']);

  async function improve(text, ctx = {}) {
    if (getKey()) {
      const out = await askClaude(`Rewrite these resume bullet points to be stronger: start each with an action verb, be concise, keep facts accurate (do not invent numbers). Role: ${ctx.role || ''}. Reply with one bullet per line, no symbols.\n\n${text}`);
      return { text: out.replace(/^[-•*]\s*/gm, ''), tips: [] };
    }
    const tips = [];
    const lines = text.split('\n').map(l => l.replace(/^[\s\-•*]+/, '').trim()).filter(Boolean).map(l => {
      let line = l;
      for (const [re, rep] of WEAK) if (re.test(line)) { line = line.replace(re, rep); break; }
      line = line.charAt(0).toUpperCase() + line.slice(1).replace(/\.$/, '');
      const w = line.split(' ')[0].toLowerCase();
      if (!STRONG.has(w) && !/ed$/.test(w)) tips.push(`"${line.slice(0, 40)}…" – start with an action verb like Built, Led or Improved.`);
      if (!/\d/.test(line)) tips.push(`"${line.slice(0, 40)}…" – add a number (%, users, ₹, hours saved).`);
      return line;
    });
    return { text: lines.join('\n'), tips: tips.slice(0, 4) };
  }

  /* ---------- skills ---------- */
  const SKILLS = {
    'web|front|full ?stack|software|developer|engineer|programmer': ['JavaScript','HTML5','CSS3','React','Node.js','TypeScript','REST APIs','Git','SQL','MongoDB','Responsive Design','Testing'],
    'data|analyst|machine|ml|ai': ['Python','SQL','Pandas','Excel','Power BI','Tableau','Statistics','Machine Learning','Data Cleaning','Visualization'],
    'design|ui|ux|graphic': ['Figma','Wireframing','Prototyping','Typography','User Research','Adobe Photoshop','Illustrator','Design Systems'],
    'market|seo|content|social': ['SEO','Content Strategy','Google Analytics','Social Media','Copywriting','Email Marketing','Canva','Campaign Planning'],
    'account|finance|audit|tax': ['Tally','GST','Excel','Financial Reporting','Bookkeeping','Auditing','Budgeting','Reconciliation'],
    'sales|business dev|bde': ['Lead Generation','CRM','Negotiation','Cold Calling','Client Relations','Presentations','Target Achievement'],
    'teach|tutor|lecturer|faculty': ['Lesson Planning','Classroom Management','Curriculum Design','Communication','Assessment','Mentoring'],
    'hr|recruit|talent': ['Recruitment','Onboarding','Payroll','Employee Relations','Interviewing','HRMS']
  };
  const COMMON = ['Communication','Teamwork','Time Management','Problem Solving','Leadership'];
  async function skills(d) {
    const t = (d.title || '').toLowerCase();
    if (getKey() && t) {
      const out = await askClaude(`List 12 relevant resume skills for a "${d.title}". Reply with a comma-separated list only.`);
      return out.split(',').map(s => s.trim()).filter(Boolean);
    }
    let list = [];
    for (const k in SKILLS) if (new RegExp(k, 'i').test(t)) { list = SKILLS[k]; break; }
    return [...list, ...COMMON];
  }

  /* ---------- ATS check ---------- */
  function ats(d, jd = '') {
    const tips = [];
    let score = 0;
    const add = (pts, ok, goodMsg, badMsg, level = 'bad') => {
      if (ok) { score += pts; tips.push({ l: 'good', t: goodMsg }); } else tips.push({ l: level, t: badMsg });
    };
    add(10, d.name && d.email && d.phone, 'Contact details are complete.', 'Add your name, email and phone number.');
    add(5, d.title, 'Job title is present.', 'Add a clear job title under your name.');
    const sw = (d.summary || '').trim().split(/\s+/).filter(Boolean).length;
    add(15, sw >= 25 && sw <= 90, 'Summary length is good.', sw ? 'Keep the summary between 25 and 90 words.' : 'Add a short professional summary.', 'mid');
    add(20, (d.experience || []).length > 0, 'Work experience added.', 'Add at least one job, internship or project.');
    const bullets = (d.experience || []).flatMap(e => (e.desc || '').split('\n').filter(l => l.trim()));
    add(10, bullets.length >= 3, 'Enough bullet points describing your work.', 'Add at least 3 bullet points under your experience.', 'mid');
    add(10, bullets.some(b => /\d/.test(b)), 'You use numbers to show results.', 'Add numbers (%, ₹, users, time) to at least one bullet.', 'mid');
    add(10, skillList(d).length >= 6, 'Good number of skills listed.', 'List at least 6 relevant skills.', 'mid');
    add(10, (d.education || []).length > 0, 'Education added.', 'Add your education.');
    add(10, /\S+@\S+\.\S+/.test(d.email || ''), 'Email format looks valid.', 'Check that your email address is valid.');
    let missing = [];
    if (jd.trim()) {
      const words = jd.toLowerCase().match(/[a-z][a-z+#.]{2,}/g) || [];
      const freq = {};
      words.forEach(w => { if (!STOP.has(w)) freq[w] = (freq[w] || 0) + 1; });
      const keys = Object.keys(freq).sort((a, b) => freq[b] - freq[a]).slice(0, 25);
      const text = resumeText(d);
      const hit = keys.filter(k => text.includes(k));
      missing = keys.filter(k => !text.includes(k)).slice(0, 12);
      const pct = keys.length ? hit.length / keys.length : 1;
      score = Math.round(score * 0.6 + pct * 40);
      tips.unshift({ l: pct > 0.6 ? 'good' : pct > 0.35 ? 'mid' : 'bad', t: `Keyword match with the job description: ${Math.round(pct * 100)}%.` });
    }
    return { score: Math.min(100, score), tips, missing };
  }

  return { getKey, setKey, clearKey, summary, improve, skills, ats };
})();
