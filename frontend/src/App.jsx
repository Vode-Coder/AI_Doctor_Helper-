import React, { useEffect, useMemo, useState } from "react";
import "./styles.css";

const API_URL = "http://127.0.0.1:8000";

async function api(path, options = {}) {
  const isForm = options.body instanceof FormData;
  const token = localStorage.getItem("sih26047_access_token");
  const headers = { ...(isForm ? {} : { "Content-Type": "application/json" }), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) };
  const response = await fetch(`${API_URL}${path}`, {
    headers,
    ...options,
  });
  let data = {};
  try { data = await response.json(); } catch {}
  if (!response.ok) throw new Error(data.detail || "Something went wrong.");
  return data;
}

function App() {
  const [screen, setScreen] = useState("login");
  const [role, setRole] = useState("patient");
  const [user, setUser] = useState(null);
  const [apiStatus, setApiStatus] = useState("Checking backend...");
  const [error, setError] = useState("");

  useEffect(() => {
    api("/api/health")
      .then(() => setApiStatus("Backend connected ✓"))
      .catch(() => setApiStatus("Backend not connected"));
  }, []);

  async function login(email, password) {
    setError("");
    try {
      const data = await api("/api/auth/login", {
        method: "POST", body: JSON.stringify({ email, password })
      });
      if (data.user.role !== role) throw new Error(`This account is a ${data.user.role} account. Switch the role above.`);
      localStorage.setItem("sih26047_access_token", data.access_token);
      setUser(data.user);
      setScreen("dashboard");
    } catch (e) { setError(e.message); }
  }

  async function logout() {
    try { await api("/api/auth/logout", {method:"POST"}); } catch {}
    localStorage.removeItem("sih26047_access_token");
    setUser(null); setScreen("login"); setError("");
  }

  if (screen === "login") return (
    <LoginPage role={role} setRole={setRole} onLogin={login}
      onRegister={() => setScreen("register")} apiStatus={apiStatus} error={error}/>
  );

  if (screen === "register") return (
    <RegisterPage onBack={() => setScreen("login")}
      onSuccess={(u) => { setUser(u); setRole("patient"); setScreen("dashboard"); }}/>
  );

  if (screen === "profile") return (
    <PatientProfile user={user} apiStatus={apiStatus} onBack={() => setScreen("dashboard")}/>
  );

  if (screen === "interview") return (
    <Interview user={user} apiStatus={apiStatus} onBack={() => setScreen("dashboard")}/>
  );
  if (screen === "consent") return (
    <ConsentCenter user={user} apiStatus={apiStatus} onBack={() => setScreen("dashboard")} onStartInterview={() => setScreen("interview")}/>
  );
  if (screen === "ayush") return (
    <AyushInterview user={user} apiStatus={apiStatus} onBack={() => setScreen("dashboard")}/>
  );

  return user.role === "patient"
    ? <PatientDashboard user={user} apiStatus={apiStatus}
        onProfile={() => setScreen("profile")} onInterview={() => setScreen("interview")} onAyush={() => setScreen("ayush")} onConsent={() => setScreen("consent")} logout={logout}/>
    : <DoctorDashboard user={user} apiStatus={apiStatus} logout={logout}/>;
}

function Brand() {
  return <div className="brand">
    <div className="brand-icon">✚</div>
    <div><h1>Clinical AI</h1><p>SIH26047 • Final MVP • AI + AYUSH + Interoperability</p></div>
  </div>;
}

function LoginPage({ role, setRole, onLogin, onRegister, apiStatus, error }) {
  const [email, setEmail] = useState(role === "patient" ? "patient@sih26047.local" : "doctor@sih26047.local");
  const [password, setPassword] = useState(role === "patient" ? "patient123" : "doctor123");

  useEffect(() => {
    setEmail(role === "patient" ? "patient@sih26047.local" : "doctor@sih26047.local");
    setPassword(role === "patient" ? "patient123" : "doctor123");
  }, [role]);

  return <main className="page"><section className="login-card"><Brand/>
    <div className="role-switch">
      <button className={role === "patient" ? "active" : ""} onClick={() => setRole("patient")}>Patient</button>
      <button className={role === "doctor" ? "active" : ""} onClick={() => setRole("doctor")}>Doctor</button>
    </div>
    <form onSubmit={(e) => {e.preventDefault(); onLogin(email, password);}}>
      <label>Email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} required/>
      <label>Password</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} required/>
      {error && <div className="error">{error}</div>}
      <button className="primary" type="submit">Login as {role}</button>
    </form>
    <div className="demo-box"><strong>Demo account</strong><p>{email}</p><p>{password}</p></div>
    {role === "patient" && <button className="link-button" onClick={onRegister}>New patient? Create an account →</button>}
    <div className={`status ${apiStatus.includes("connected") ? "success" : "warning"}`}>● {apiStatus}</div>
  </section></main>;
}

function RegisterPage({ onBack, onSuccess }) {
  const [form, setForm] = useState({name:"",email:"",password:"",age:"",gender:"Prefer not to say",phone:""});
  const [error, setError] = useState("");
  const update = (k,v) => setForm({...form,[k]:v});

  async function submit(e) {
    e.preventDefault(); setError("");
    try {
      const data = await api("/api/auth/register", {
        method:"POST", body:JSON.stringify({...form, age:Number(form.age)})
      });
      localStorage.setItem("sih26047_access_token", data.access_token); onSuccess(data.user);
    } catch(e) { setError(e.message); }
  }

  return <main className="page"><section className="register-card">
    <button className="back-button" onClick={onBack}>← Back to login</button>
    <span className="eyebrow">PATIENT REGISTRATION</span><h1>Create your patient account</h1>
    <p className="muted">Basic details for the prototype.</p>
    <form onSubmit={submit}><div className="form-grid">
      <Field label="Full name" value={form.name} onChange={v=>update("name",v)} required/>
      <Field label="Email" type="email" value={form.email} onChange={v=>update("email",v)} required/>
      <Field label="Age" type="number" min="1" max="120" value={form.age} onChange={v=>update("age",v)} required/>
      <div><label>Gender</label><select value={form.gender} onChange={e=>update("gender",e.target.value)}>
        <option>Prefer not to say</option><option>Female</option><option>Male</option><option>Other</option>
      </select></div>
      <Field label="Phone" value={form.phone} onChange={v=>update("phone",v)}/>
      <Field label="Password" type="password" value={form.password} onChange={v=>update("password",v)} required/>
    </div>{error && <div className="error">{error}</div>}
    <button className="primary">Create patient account</button></form>
  </section></main>;
}

function PatientDashboard({ user, apiStatus, onProfile, onInterview, onAyush, onConsent, logout }) {
  const [profile,setProfile]=useState(null);
  const [consultations,setConsultations]=useState([]);
  const [documents,setDocuments]=useState([]);
  const [uploading,setUploading]=useState(false);
  const [uploadMsg,setUploadMsg]=useState("");
  const [docType,setDocType]=useState("Other");
  useEffect(()=>{Promise.all([api(`/api/patients/${user.id}`),api(`/api/patients/${user.id}/consultations`),api(`/api/patients/${user.id}/documents`)]).then(([p,c,d])=>{setProfile(p);setConsultations(c.consultations);setDocuments(d.documents);}).catch(()=>{});},[user.id]);
  async function upload(e){e.preventDefault();const file=e.target.elements.document.files[0];if(!file)return;setUploading(true);setUploadMsg("");const fd=new FormData();fd.append("patient_id",user.id);fd.append("document_type",docType);fd.append("file",file);try{const d=await api("/api/documents/upload",{method:"POST",body:fd});setDocuments(prev=>[d.document,...prev]);setUploadMsg(`Processed: ${d.document.filename}`);e.target.reset();}catch(err){setUploadMsg(err.message);}finally{setUploading(false);}}
  return <Shell user={user} apiStatus={apiStatus} logout={logout}><div className="welcome">
    <div><span className="eyebrow">PATIENT DASHBOARD</span><h1>Welcome, {user.name.split(" ")[0]} 👋</h1><p>Your AI-assisted clinical history and previous medical records are organized for practitioner review.</p></div>
    <button className="primary large" onClick={onInterview}>Start AI Interview →</button>
  </div>
  <div className="grid three"><InfoCard title="Profile" value={profile ? "Ready" : "Loading"} detail="Patient information" icon="👤"/><InfoCard title="Histories" value={consultations.length} detail="Saved consultation records" icon="📋"/><InfoCard title="Documents" value={documents.length} detail="Uploaded medical records" icon="📄"/></div>
  <section className="panel"><div className="panel-heading"><div><span className="eyebrow">PHASE 4E</span><h2>Medical documents</h2></div></div>
    <p className="muted">Upload a prescription, lab report, discharge summary, or imaging report. The prototype extracts readable text and common clinical measurements for practitioner review.</p>
    <form className="document-upload" onSubmit={upload}><div className="form-grid"><div><label>Document type</label><select value={docType} onChange={e=>setDocType(e.target.value)}><option>Other</option><option>Prescription</option><option>Lab Report</option><option>Discharge Summary</option><option>Imaging Report</option></select></div><div><label>File</label><input name="document" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.txt" required/></div></div><button className="primary" disabled={uploading}>{uploading?"Processing document…":"Upload & extract information"}</button></form>
    {uploadMsg&&<div className={uploadMsg.startsWith("Processed")?"success-message":"error"}>{uploadMsg}</div>}
    {documents.length===0?<div className="empty-state small">No medical documents uploaded yet.</div>:documents.map(d=><div className="document-row" key={d.id}><div className="document-icon">📄</div><div><strong>{d.filename}</strong><p>{d.document_type} • {d.status}</p>{d.findings?.length>0&&<div className="finding-chips">{d.findings.slice(0,5).map((f,i)=><span key={i}>{f.label}: {f.value}</span>)}</div>}</div></div>)}
  </section>
  <section className="panel"><div className="panel-heading"><div><span className="eyebrow">PHASE 5B • CONSENT + IDENTITY</span><h2>Patient control center</h2></div><button className="secondary" onClick={onProfile}>Profile</button></div><p className="muted">Review the plain-language consent, hear the explanation in your selected language, and control whether your information can be processed for AI-assisted case-taking and practitioner review.</p><button className="primary action" onClick={onConsent}>Open consent & identity center →</button></section>
  <section className="panel"><div className="panel-heading"><div><span className="eyebrow">QUICK ACTION</span><h2>Begin clinical history</h2></div></div><p className="muted">The assistant will ask adaptive questions and organize your answers alongside previous medical records.</p><button className="primary action" onClick={onInterview}>Start consultation interview</button><button className="secondary action" onClick={onAyush}>🪷 Start AYUSH / Ayurveda assessment</button></section>
  <section className="panel"><div className="panel-heading"><div><span className="eyebrow">HISTORY</span><h2>Previous consultations</h2></div></div>{consultations.length===0?<div className="empty-state">No consultations yet.</div>:consultations.map(c=><div className="consultation" key={c.id}><div className="date">{new Date(c.created_at).getDate()}<small>{new Date(c.created_at).toLocaleString("en",{month:"short"}).toUpperCase()}</small></div><div><strong>{c.title}</strong><p>{c.summary}</p></div><span className="tag">{c.status}</span></div>)}</section>
  </Shell>;
}

function ConsentCenter({user,apiStatus,onBack,onStartInterview}) {
  const [lang,setLang]=useState("en-IN"); const [consent,setConsent]=useState(null); const [loading,setLoading]=useState(true); const [saving,setSaving]=useState(false); const [message,setMessage]=useState(""); const [audio,setAudio]=useState(false); const [checked,setChecked]=useState(false);
  const copy = lang === "hi-IN" ? {
    title:"सहमति और पहचान केंद्र", intro:"आगे बढ़ने से पहले कृपया समझें कि आपकी जानकारी का उपयोग कैसे होगा।", body:"यह प्रोटोटाइप आपकी बताई गई स्वास्थ्य जानकारी को AI-सहायित केस-टेकिंग, पुराने दस्तावेज़ों के संगठन, आयुष आकलन और चिकित्सक समीक्षा के लिए संरचित करता है। यह स्वयं निदान या उपचार निर्धारित नहीं करता।", scope:"दायरा: AI केस-टेकिंग • दस्तावेज़ प्रोसेसिंग • आयुष इनटेक • चिकित्सक समीक्षा", consent:"मैंने जानकारी पढ़/सुनी है और इस उद्देश्य के लिए सहमति देता/देती हूँ।", audio:"ऑडियो में समझाया गया", save:"सहमति दर्ज करें", start:"सहमति के बाद इंटरव्यू शुरू करें", revoke:"सहमति वापस लें", active:"सक्रिय सहमति दर्ज है"
  } : {
    title:"Consent & Identity Center", intro:"Before you continue, review how your information will be used.", body:"This prototype structures the health information you provide for AI-assisted case-taking, organization of previous documents, AYUSH intake and physician review. It does not independently diagnose or prescribe treatment.", scope:"Scope: AI case-taking • document processing • AYUSH intake • physician review", consent:"I have read/heard the explanation and consent to this purpose.", audio:"Explanation played aloud", save:"Record consent", start:"Start interview after consent", revoke:"Revoke consent", active:"Active consent is recorded"
  };
  async function load(){try{const d=await api(`/api/patients/${user.id}/consent`);setConsent(d)}finally{setLoading(false)}}
  useEffect(()=>{load().catch(()=>setLoading(false))},[]);
  function speak(){if(!window.speechSynthesis)return;window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(copy.body+" "+copy.scope);u.lang=lang;u.rate=.9;u.onend=()=>setAudio(true);window.speechSynthesis.speak(u)}
  async function grant(){if(!checked){setMessage(lang==="hi-IN"?"कृपया पहले सहमति बॉक्स चुनें।":"Please confirm the consent checkbox first.");return;}setSaving(true);setMessage("");try{await api(`/api/patients/${user.id}/consent`,{method:"POST",body:JSON.stringify({patient_id:user.id,language:lang,audio_explained:audio,granted:true})});setMessage(lang==="hi-IN"?"सहमति सफलतापूर्वक दर्ज हुई।":"Consent recorded successfully.");await load()}catch(e){setMessage(e.message)}finally{setSaving(false)}}
  async function revoke(){await api(`/api/patients/${user.id}/consent/revoke`,{method:"POST"});setMessage(lang==="hi-IN"?"सहमति वापस ले ली गई।":"Consent revoked.");await load()}
  if(loading)return <main className="page"><div className="loading-card">Loading consent center…</div></main>;
  return <main className="dashboard-page"><header className="topbar"><Brand/><div className="topbar-right"><span className="api-pill">● {apiStatus}</span><button className="logout" onClick={onBack}>Exit</button></div></header><div className="content"><button className="back-button" onClick={onBack}>← Back to dashboard</button><section className="panel consent-panel"><span className="eyebrow">PHASE 5B</span><h1>{copy.title}</h1><p className="muted">{copy.intro}</p><div className="consent-language"><label>Language / भाषा</label><select value={lang} onChange={e=>setLang(e.target.value)}><option value="en-IN">English (India)</option><option value="hi-IN">हिन्दी (India)</option></select></div><div className="consent-card"><h3>What you are consenting to</h3><p>{copy.body}</p><strong>{copy.scope}</strong></div><div className="consent-actions"><button className="secondary" onClick={speak}>🔊 {copy.audio}</button>{audio&&<span className="success-message">✓ Audio explanation completed</span>}</div><label className="consent-check"><input type="checkbox" checked={checked} onChange={e=>setChecked(e.target.checked)}/> <span>{copy.consent}</span></label><button className="primary" disabled={saving} onClick={grant}>{saving?"Saving…":copy.save}</button>{consent?.active&&<div className="active-consent"><strong>✓ {copy.active}</strong><span>Version {consent.consent.version} • {consent.consent.language} • {new Date(consent.consent.created_at).toLocaleString()}</span><button className="secondary" onClick={onStartInterview}>{copy.start}</button><button className="link-button danger-link" onClick={revoke}>{copy.revoke}</button></div>}{message&&<div className="success-message">{message}</div>}<div className="identity-note"><strong>Prototype identity layer</strong><p>Patient account ID: <code>SIH26047-P-{String(user.id).padStart(4,"0")}</code>. Phase 5B keeps the identity and consent trail separate from clinical answers and prepares the record for standards-based exchange.</p></div></section></div></main>;
}

const APP_LANGUAGES = [
  ["en-IN","English (India)"],["hi-IN","हिन्दी (India)"],["bn-IN","বাংলা (India)"],
  ["ta-IN","தமிழ் (India)"],["te-IN","తెలుగు (India)"],["mr-IN","मराठी (India)"],
  ["gu-IN","ગુજરાતી (India)"],["kn-IN","ಕನ್ನಡ (India)"]
];

function useVoice(language, onTranscript) {
  const recognitionRef=React.useRef(null);
  const transcriptRef=React.useRef(onTranscript);
  transcriptRef.current=onTranscript;
  const [listening,setListening]=useState(false);
  const [speaking,setSpeaking]=useState(false);
  const [supported,setSupported]=useState(false);
  const [message,setMessage]=useState("");

  useEffect(()=>{
    const Recognition=window.SpeechRecognition || window.webkitSpeechRecognition;
    setSupported(!!Recognition);
    if(!Recognition) return;
    const r=new Recognition();
    r.continuous=false; r.interimResults=true; r.maxAlternatives=1; r.lang=language;
    r.onstart=()=>{setListening(true);setMessage("Listening… speak naturally.");};
    r.onresult=(event)=>{
      let finalText="", interim="";
      for(let i=event.resultIndex;i<event.results.length;i++){
        const t=event.results[i][0]?.transcript||"";
        if(event.results[i].isFinal) finalText+=t; else interim+=t;
      }
      if(finalText) transcriptRef.current?.(finalText.trim());
      else if(interim) setMessage(`Hearing: ${interim}`);
    };
    r.onerror=(event)=>{
      setListening(false);
      const friendly={"not-allowed":"Microphone permission was denied. Please allow microphone access.","no-speech":"I did not hear anything. Please try again.","audio-capture":"No microphone was found.","network":"Voice recognition needs a network connection in this browser.","language-not-supported":"This browser does not provide speech recognition for this language. You can type instead."};
      setMessage(friendly[event.error]||`Voice input unavailable: ${event.error}.`);
    };
    r.onend=()=>setListening(false);
    recognitionRef.current=r;
    return ()=>{try{r.abort()}catch{}};
  },[language]);

  function listen(){
    if(!supported){setMessage("Voice input is not supported in this browser. You can type instead.");return;}
    if(listening){try{recognitionRef.current?.stop()}catch{};return;}
    try{recognitionRef.current.lang=language;recognitionRef.current.start();}
    catch{setMessage("Voice input is already starting. Please try again in a moment.");}
  }
  function speak(text){
    if(!text || !("speechSynthesis" in window)){setMessage("Question audio is not available in this browser.");return;}
    window.speechSynthesis.cancel();
    const voices=window.speechSynthesis.getVoices();
    const base=language.toLowerCase().split("-")[0];
    const voice=voices.find(v=>v.lang?.toLowerCase()===language.toLowerCase()) || voices.find(v=>v.lang?.toLowerCase().startsWith(base));
    const u=new SpeechSynthesisUtterance(text); u.lang=language; u.rate=0.82; u.pitch=1;
    if(voice) u.voice=voice;
    u.onstart=()=>{setSpeaking(true);setMessage("Reading the question aloud…");};
    u.onend=()=>{setSpeaking(false);setMessage("");};
    u.onerror=()=>{setSpeaking(false);setMessage("Question audio could not be played. You can read the text on screen.");};
    window.speechSynthesis.speak(u);
  }
  return {listening,speaking,supported,message,listen,speak};
}

function Interview({ user, apiStatus, onBack }) {
  const [currentQuestion,setCurrentQuestion]=useState(null),[messages,setMessages]=useState([]),[answer,setAnswer]=useState(""),[structured,setStructured]=useState({}),[loading,setLoading]=useState(true),[loadError,setLoadError]=useState(""),[sending,setSending]=useState(false),[done,setDone]=useState(false),[saved,setSaved]=useState(false),[pathway,setPathway]=useState(null),[progress,setProgress]=useState(0),[questionNumber,setQuestionNumber]=useState(1),[totalQuestions,setTotalQuestions]=useState(12),[riskLevel,setRiskLevel]=useState("none"),[redFlags,setRedFlags]=useState([]),[nlp,setNlp]=useState(null),[language,setLanguage]=useState("en-IN"),[largeText,setLargeText]=useState(false);
  const sessionId=useMemo(()=>crypto.randomUUID(),[]);
  const voice=useVoice(language, text=>setAnswer(prev=>`${prev?prev+" ":""}${text}`.trim()));

  async function loadInterview(lang){
    setLoading(true); setLoadError(""); setCurrentQuestion(null); setMessages([]); setAnswer(""); setDone(false); setProgress(0); setQuestionNumber(1); setStructured({}); setPathway(null); setRiskLevel("none"); setRedFlags([]); setNlp(null);
    try{
      const data=await api(`/api/interview/questions?language=${encodeURIComponent(lang)}`);
      if(!data?.question) throw new Error("The interview question could not be loaded.");
      setMessages([{role:"ai",text:data.intro||"Let's begin."}]); setCurrentQuestion(data.question); setTotalQuestions(data.total_questions||12);
    }catch(e){setLoadError(e.message||"Could not load the interview.");}
    finally{setLoading(false);}
  }
  useEffect(()=>{loadInterview(language)},[language]);
  useEffect(()=>{if(currentQuestion?.text) voice.speak(currentQuestion.text)},[currentQuestion]);

  async function submitAnswer(e){
    e.preventDefault(); if(!answer.trim()||sending||!currentQuestion)return;
    if(voice.listening) voice.listen();
    const submitted=answer.trim(); setSending(true); setMessages(m=>[...m,{role:"user",text:submitted}]);
    try{
      const data=await api("/api/interview/answer",{method:"POST",body:JSON.stringify({patient_id:user.id,session_id:sessionId,question_id:currentQuestion.id,answer:submitted,answers:structured,language})});
      setStructured(s=>({...s,...(data.extracted||{})})); setPathway(data.pathway_label); setProgress(data.progress??0); setTotalQuestions(data.total_questions??totalQuestions); setRiskLevel(data.risk_level??"none"); setRedFlags(data.red_flags??[]); setNlp(data.nlp??null);
      if(data.completed){setDone(true);setQuestionNumber(data.total_questions??questionNumber);setCurrentQuestion(null);setMessages(m=>[...m,{role:"ai",text:language==="hi-IN"?"धन्यवाद। आपकी क्लिनिकल जानकारी चिकित्सक की समीक्षा के लिए तैयार है।":"Thank you. Your clinical history is ready for practitioner review."}]);}
      else if(data.next_question){setQuestionNumber(data.question_number??questionNumber+1);setCurrentQuestion(data.next_question);setMessages(m=>[...m,{role:"ai",text:data.next_question.text}]);}
      else throw new Error("The next interview question was not returned.");
      setAnswer("");
    }catch(e){setMessages(m=>[...m,{role:"ai",text:`I could not continue: ${e.message}`}]);}
    finally{setSending(false);}
  }
  async function saveHistory(){try{await api("/api/interview/complete",{method:"POST",body:JSON.stringify({patient_id:user.id,session_id:sessionId,title:structured.chief_complaint||"AI Clinical History",answers:structured})});setSaved(true)}catch(e){alert(e.message)}}

  if(loading)return <main className="page"><div className="loading-card"><div className="loading-orb">✚</div><h2>Preparing your interview…</h2><p>Please wait a moment. Your language and voice settings are being prepared.</p></div></main>;
  if(loadError)return <main className="page"><div className="loading-card error-card"><div className="loading-orb">!</div><h2>We couldn't start the interview</h2><p>{loadError}</p><button className="primary large" onClick={()=>loadInterview(language)}>Try again</button><button className="secondary large" onClick={onBack}>Back to dashboard</button></div></main>;

  return <main className={`dashboard-page accessible-app ${largeText?"large-text":""}`}>
    <header className="topbar"><Brand/><div className="topbar-right"><span className="api-pill">● {apiStatus}</span><button className="logout" onClick={onBack}>Exit</button></div></header>
    <div className="interview-layout">
      <section className="chat-panel">
        <button className="back-button" onClick={onBack}>← Back to dashboard</button>
        <div className="interview-head hero-interview">
          <div><span className="eyebrow">AI CLINICAL INTERVIEW</span><h1>Tell me what you're feeling</h1><p className="muted">No typing is required. Choose your language, tap the microphone, and speak naturally. You can also type at any time.</p></div>
          <div className="comfort-badge">👵👴 <span>Designed for every age</span></div>
        </div>
        <div className="accessibility-bar"><span>Easy reading</span><button type="button" className="access-btn" onClick={()=>setLargeText(v=>!v)}>{largeText?"A− Normal text":"A+ Larger text"}</button><span className="voice-tip">🎙️ Speak • 🔊 Listen • ✍️ Type</span></div>
        <div className="voice-toolbar voice-toolbar-large">
          <div className="voice-language"><label htmlFor="voice-language">Choose your language</label><select id="voice-language" value={language} onChange={e=>setLanguage(e.target.value)}>{APP_LANGUAGES.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></div>
          <div className="voice-actions"><button type="button" className={`voice-button listen-big ${voice.speaking?"active":""}`} onClick={()=>currentQuestion&&voice.speak(currentQuestion.text)} disabled={!currentQuestion}>{voice.speaking?"🔊 Speaking…":"🔊 Hear question"}</button><button type="button" className={`voice-button mic listen-big ${voice.listening?"active":""}`} onClick={voice.listen}>{voice.listening?"⏹ Stop listening":"🎤 Speak your answer"}</button></div>
        </div>
        {voice.message&&<div className="voice-status" aria-live="polite">{voice.message}</div>}
        {!voice.supported&&<div className="voice-note">Your browser does not support speech recognition. You can still use the large text box below.</div>}
        {pathway&&<div className="pathway-badge">Focused pathway: <strong>{pathway}</strong></div>}
        {riskLevel!=="none"&&<SafetyAlert riskLevel={riskLevel} redFlags={redFlags}/>} {nlp&&<NLPInsight nlp={nlp}/>} 
        <div className="progress"><div className="progress-bar" style={{width:`${progress}%`}}></div></div><div className="progress-text">{done?"Interview complete":`Question ${questionNumber} of ${totalQuestions}`} • {progress}%</div>
        <div className="chat-window">{messages.map((m,i)=><div className={`bubble ${m.role}`} key={i}>{m.text}</div>)}</div>
        {!done?<form className="answer-box" onSubmit={submitAnswer}><GuidedAnswerInput question={currentQuestion} value={answer} onChange={setAnswer} listening={voice.listening} language={language}/><div className="answer-actions"><button type="button" className={`secondary voice-inline ${voice.listening?"listening":""}`} onClick={voice.listen}>{voice.listening?"⏹ Stop listening":"🎤 Voice input"}</button><button className="primary answer-submit" disabled={sending||!currentQuestion}>{sending?"Processing…":"Continue →"}</button></div></form>:<div className="complete-box"><h2>✓ Your history is ready</h2><p>The interview is complete. Your answers are organized for practitioner review.</p><button className="primary large" onClick={saveHistory} disabled={saved}>{saved?"Saved to patient record ✓":"Save clinical history"}</button></div>}
      </section>
      <aside className="structured-panel"><span className="eyebrow">LIVE CLINICAL RECORD</span><h2>Your information</h2><p className="muted">We organize what you tell us so the clinician can review it quickly.</p>{pathway&&<div className="pathway-card"><span>ACTIVE PATHWAY</span><strong>{pathway}</strong><small>Questions are selected dynamically.</small></div>}<div className={`risk-card ${riskLevel}`}><span>SAFETY CHECK</span><strong>{riskLevel==="none"?"No red flag identified":riskLevel==="urgent"?"Clinical review recommended":"Urgent clinical review recommended"}</strong><small>Rule-based screening only • not a diagnosis</small></div>{redFlags.length>0&&<div className="redflag-list">{redFlags.map(flag=><div className="redflag-item" key={flag.id}><strong>{flag.label}</strong><span>{flag.message}</span></div>)}</div>}{Object.entries(structured).filter(([k])=>k!=="raw").map(([k,v])=><div className="data-item" key={k}><span>{formatKey(k)}</span><strong>{String(v)}</strong></div>)}{Object.keys(structured).length===0&&<div className="empty-state small">Your answers will appear here.</div>}</aside>
    </div>
  </main>;
}

function AyushInterview({ user, apiStatus, onBack }) {
  const [questions,setQuestions]=useState([]),[current,setCurrent]=useState(null),[lang,setLang]=useState("en-IN"),[responses,setResponses]=useState({}),[answer,setAnswer]=useState(""),[loading,setLoading]=useState(true),[loadError,setLoadError]=useState(""),[sending,setSending]=useState(false),[done,setDone]=useState(false),[saved,setSaved]=useState(false),[progress,setProgress]=useState(0),[num,setNum]=useState(1),[largeText,setLargeText]=useState(false);
  const sessionId=useMemo(()=>crypto.randomUUID(),[]);
  const voice=useVoice(lang,text=>setAnswer(prev=>`${prev?prev+" ":""}${text}`.trim()));
  async function load(langCode){setLoading(true);setLoadError("");setCurrent(null);setQuestions([]);setResponses({});setAnswer("");setDone(false);setProgress(0);setNum(1);setSaved(false);try{const d=await api(`/api/ayush/questions?language=${encodeURIComponent(langCode)}`);if(!d?.questions?.length)throw new Error("No AYUSH questions were returned.");setQuestions(d.questions);setCurrent(d.questions[0]);}catch(e){setLoadError(e.message||"Could not load AYUSH assessment.")}finally{setLoading(false)}}
  useEffect(()=>{load(lang)},[lang]);
  useEffect(()=>{if(current?.question)voice.speak(current.question)},[current]);
  function choose(v,multi=false){if(multi){const a=Array.isArray(answer)?answer:[];setAnswer(a.includes(v)?a.filter(x=>x!==v):[...a,v])}else setAnswer(v)}
  async function submit(e){e.preventDefault();const value=Array.isArray(answer)?answer.join(", "):answer;if(!value.trim()||!current)return;setSending(true);try{const d=await api("/api/ayush/answer",{method:"POST",body:JSON.stringify({patient_id:user.id,session_id:sessionId,question_id:current.id,answer:value,answers:responses,language:lang})});setResponses(d.responses||{});setProgress(d.progress||0);if(d.completed){setDone(true);setCurrent(null)}else if(d.next_question){setNum(d.question_number||num+1);setCurrent(d.next_question);setAnswer("")}else throw new Error("The next AYUSH question was not returned.")}catch(e){alert(e.message)}finally{setSending(false)}}
  async function save(){try{await api("/api/ayush/complete",{method:"POST",body:JSON.stringify({patient_id:user.id,session_id:sessionId,responses,language:lang})});setSaved(true)}catch(e){alert(e.message)}}
  if(loading)return <main className="page"><div className="loading-card"><div className="loading-orb">🪷</div><h2>Preparing your AYUSH assessment…</h2><p>Loading the selected language and voice.</p></div></main>;
  if(loadError)return <main className="page"><div className="loading-card error-card"><div className="loading-orb">!</div><h2>We couldn't load this language</h2><p>{loadError}</p><button className="primary large" onClick={()=>load(lang)}>Try again</button><button className="secondary large" onClick={onBack}>Back to dashboard</button></div></main>;
  const opts=current?.options||[], isMulti=current?.type==="multi";
  return <main className={`dashboard-page accessible-app ${largeText?"large-text":""}`}><header className="topbar"><Brand/><div className="topbar-right"><span className="api-pill">● {apiStatus}</span><button className="logout" onClick={onBack}>Exit</button></div></header><div className="interview-layout"><section className="chat-panel"><button className="back-button" onClick={onBack}>← Back to dashboard</button><div className="interview-head hero-interview"><div><span className="eyebrow">AYUSH • DASHAVIDHA PARIKSHA</span><h1>A gentle guided assessment</h1><p className="muted">Take your time. You can listen to every question, speak your answer, or type it.</p></div><div className="comfort-badge">🪷 <span>Simple • calm • voice-first</span></div></div><div className="accessibility-bar"><span>Easy reading</span><button type="button" className="access-btn" onClick={()=>setLargeText(v=>!v)}>{largeText?"A− Normal text":"A+ Larger text"}</button><span className="voice-tip">🎙️ Speak • 🔊 Listen • ✍️ Type</span></div><div className="voice-toolbar voice-toolbar-large"><div className="voice-language"><label>Choose your language</label><select value={lang} onChange={e=>setLang(e.target.value)}>{APP_LANGUAGES.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></div><div className="voice-actions"><button type="button" className="voice-button listen-big" onClick={()=>current&&voice.speak(current.question)}>🔊 Hear question</button><button type="button" className={`voice-button mic listen-big ${voice.listening?"active":""}`} onClick={voice.listen}>{voice.listening?"⏹ Stop listening":"🎤 Speak answer"}</button></div></div>{voice.message&&<div className="voice-status" aria-live="polite">{voice.message}</div>}{!voice.supported&&<div className="voice-note">Voice recognition is not available in this browser. You can type your answer below.</div>}<div className="pathway-badge">🪷 <strong>Ayurveda • Dashavidha Pariksha</strong></div><div className="progress"><div className="progress-bar" style={{width:`${progress}%`}}></div></div><div className="progress-text">{done?"Assessment complete":`Assessment ${num} of ${questions.length}`} • {progress}%</div>{!done?<><div className="chat-window"><div className="bubble ai"><strong>{current?.title}</strong><br/>{current?.question}<br/><small>{current?.hint}</small></div></div><form className="answer-box" onSubmit={submit}>{opts.length>0?<div className="guided-options">{opts.map(o=><button type="button" key={o} className={`guided-choice ${(Array.isArray(answer)?answer:[]).includes(o)||answer===o?"selected":""}`} onClick={()=>choose(o,isMulti)}>{o}</button>)}</div>:<textarea className="elder-textarea" value={answer} onChange={e=>setAnswer(e.target.value)} rows="5" placeholder={lang==="hi-IN"?"अपना जवाब यहां लिखें…":"Type your response here…"}/>}<div className="answer-actions"><button type="button" className="secondary" onClick={()=>current&&voice.speak(current.question)}>🔊 Hear again</button><button type="button" className="secondary voice-inline" onClick={voice.listen}>{voice.listening?"⏹ Stop":"🎤 Speak"}</button><button className="primary" disabled={sending}>{sending?"Saving…":"Next →"}</button></div></form></>:<div className="complete-box"><h2>✓ Assessment collected</h2><p>The ten Dashavidha Pariksha fields are ready for practitioner review.</p><button className="primary large" onClick={save} disabled={saved}>{saved?"Saved to patient record ✓":"Save AYUSH assessment"}</button></div>}</section><aside className="structured-panel"><span className="eyebrow">AYUSH RECORD</span><h2>What we've collected</h2><p className="muted">Your answers stay separate from the general clinical history.</p>{questions.map(q=><div className="data-item" key={q.id}><span>{q.title}</span><strong>{responses[q.id]||"Not collected yet"}</strong></div>)}</aside></div></main>;
}

function DoctorDashboard({user,apiStatus,logout}) {
  const [patients,setPatients]=useState([]); const [histories,setHistories]=useState([]); const [selectedPatient,setSelectedPatient]=useState(null); const [workspace,setWorkspace]=useState(null); const [ayush,setAyush]=useState([]); const [selectedConsultation,setSelectedConsultation]=useState(null); const [notes,setNotes]=useState(""); const [review,setReview]=useState("Reviewed"); const [loading,setLoading]=useState(false); const [fhir,setFhir]=useState(null); const [fhirLoading,setFhirLoading]=useState(false); const [aiSummary,setAiSummary]=useState(null); const [summaryLoading,setSummaryLoading]=useState(false); const [explainability,setExplainability]=useState(null); const [explainLoading,setExplainLoading]=useState(false); const [validation,setValidation]=useState(null); const [validationLoading,setValidationLoading]=useState(false); const [abdm,setAbdm]=useState(null); const [abdmLoading,setAbdmLoading]=useState(false); const [fhirValidation,setFhirValidation]=useState(null); const [security,setSecurity]=useState(null); const [auditEvents,setAuditEvents]=useState([]);
  async function refresh(){const [p,h]=await Promise.all([api("/api/patients"),api("/api/doctor/consultations")]);setPatients(p.patients);setHistories(h.consultations);}
  useEffect(()=>{refresh().catch(()=>{});},[]);
  async function openPatient(id){setSelectedPatient(id);setLoading(true);try{const [w,a]=await Promise.all([api(`/api/doctor/patients/${id}/workspace`),api(`/api/patients/${id}/ayush`)]);setWorkspace(w);setAyush(a.assessments||[]);}finally{setLoading(false);}}
  async function saveReview(){if(!selectedConsultation)return;await api(`/api/doctor/consultations/${selectedConsultation.id}/review`,{method:"PUT",body:JSON.stringify({doctor_review:review,doctor_notes:notes})});setWorkspace(w=>({...w,consultations:w.consultations.map(c=>c.id===selectedConsultation.id?{...c,doctor_review:review,doctor_notes:notes}:c)}));setSelectedConsultation(null);}
  async function previewFHIR(){if(!selectedPatient)return;setFhirLoading(true);try{const d=await api(`/api/doctor/patients/${selectedPatient}/fhir-preview`);setFhir(d)}catch(e){alert(e.message)}finally{setFhirLoading(false)}}
  async function previewABDM(){if(!selectedPatient)return;setAbdmLoading(true);try{const d=await api(`/api/doctor/patients/${selectedPatient}/abdm-package`);setAbdm(d)}catch(e){alert(e.message)}finally{setAbdmLoading(false)}} async function exportABDM(){if(!selectedPatient)return;setAbdmLoading(true);try{const d=await api(`/api/doctor/patients/${selectedPatient}/abdm-package`,{method:"POST",body:JSON.stringify({patient_id:selectedPatient,exported_by:user.id})});setAbdm(d.package)}catch(e){alert(e.message)}finally{setAbdmLoading(false)}} async function validateFHIR(){if(!selectedPatient)return;try{const d=await api(`/api/doctor/patients/${selectedPatient}/fhir-validate`,{method:"POST"});setFhirValidation(d)}catch(e){alert(e.message)}} async function exportFHIR(){if(!selectedPatient)return;setFhirLoading(true);try{const d=await api(`/api/doctor/patients/${selectedPatient}/fhir-export`,{method:"POST",body:JSON.stringify({patient_id:selectedPatient,exported_by:user.id})});setFhir(d.bundle)}catch(e){alert(e.message)}finally{setFhirLoading(false)}}
  async function generateAISummary(c){setSummaryLoading(true);try{const d=await api(`/api/doctor/consultations/${c.id}/ai-summary`,{method:"POST"});setAiSummary(d.ai_summary);setWorkspace(w=>({...w,consultations:w.consultations.map(x=>x.id===c.id?{...x,ai_summary:d.ai_summary}:x)}));}catch(e){alert(e.message)}finally{setSummaryLoading(false)}}
  async function openExplainability(c){setExplainLoading(true);try{const d=await api(`/api/doctor/consultations/${c.id}/explainability`);setExplainability(d.explainability);}catch(e){alert(e.message)}finally{setExplainLoading(false)}} async function runValidation(){setValidationLoading(true);try{const d=await api("/api/validation/run",{method:"POST"});setValidation(d)}catch(e){alert(e.message)}finally{setValidationLoading(false)}} async function loadSecurity(){try{const [s,a]=await Promise.all([api("/api/security/status"),api("/api/audit/me")]);setSecurity(s);setAuditEvents(a.events||[])}catch(e){alert(e.message)}}
  return <Shell user={user} apiStatus={apiStatus} logout={logout}><div className="welcome"><div><span className="eyebrow">PHASE 4F • PHYSICIAN WORKSPACE</span><h1>Clinical review workspace</h1><p>Review structured AI history, uploaded documents, safety alerts and the patient timeline in one place.</p></div></div>
    <section className="panel"><div className="panel-heading"><div><span className="eyebrow">FINAL MVP • 5H SECURITY</span><h2>Security & audit controls</h2><p className="muted">Short-lived session, role-aware access, consent-gated exchange and a patient-level audit trail.</p></div><button className="secondary" onClick={loadSecurity}>Check security status</button></div>{security&&<div className="validation-strip"><div><span>Session</span><strong>{security.session_active?"ACTIVE":"EXPIRED"}</strong></div><div><span>Role</span><strong>{security.role}</strong></div><div><span>Audit events</span><strong>{security.audit_events}</strong></div><div><span>Sessions</span><strong>{security.active_sessions}</strong></div></div>}{auditEvents.length>0&&<div className="audit-list">{auditEvents.slice(0,5).map(e=><div className="consultation" key={e.id}><div className="date">✓<small>LOG</small></div><div><strong>{e.action}</strong><p>{e.resource||"system"} • {new Date(e.created_at).toLocaleString()}</p></div></div>)}</div>}</section>
    <section className="panel validation-panel"><div className="panel-heading"><div><span className="eyebrow">PHASE 5F • VALIDATION</span><h2>AI/NLP Validation Lab</h2><p className="muted">Run a transparent synthetic benchmark against the current NLP engine and inspect measurable performance.</p></div><button className="primary" onClick={runValidation} disabled={validationLoading}>{validationLoading?"Running…":"▶ Run validation"}</button></div>{validation&&<div className="validation-strip"><div><span>Cases</span><strong>{validation.dataset_size}</strong></div><div><span>Symptom F1</span><strong>{(validation.metrics.symptom_f1*100).toFixed(1)}%</strong></div><div><span>Intent accuracy</span><strong>{(validation.metrics.intent_accuracy*100).toFixed(1)}%</strong></div><div><span>Passed</span><strong>{validation.cases_passed}/{validation.dataset_size}</strong></div><button className="secondary" onClick={()=>setValidation(validation)}>View detailed report</button></div>}</section>
    <div className="grid three"><InfoCard title="Patients" value={patients.length} detail="Database records" icon="👥"/><InfoCard title="AI Histories" value={histories.length} detail="Completed interviews" icon="🧠"/><InfoCard title="Documents" value={histories.reduce((n,h)=>n+(h.document_count||0),0) || "—"} detail="Available in patient workspace" icon="📄"/></div>
    <section className="panel"><div className="panel-heading"><div><span className="eyebrow">PATIENTS</span><h2>Select a patient</h2></div></div>{patients.map(p=><div className={`patient-row ${selectedPatient===p.id?"selected-row":""}`} key={p.id} onClick={()=>openPatient(p.id)}><div className="avatar">{initials(p.name)}</div><div className="patient-main"><strong>{p.name}</strong><span>{p.age} years • {p.gender}</span></div><button className="secondary" onClick={(e)=>{e.stopPropagation();openPatient(p.id)}}>Open workspace →</button></div>)}</section>
    {!selectedPatient?<section className="panel"><div className="empty-state">Choose a patient to open the physician workspace.</div></section>:loading?<section className="panel"><div className="loading-card">Loading patient workspace…</div></section>:workspace&&<section className="workspace-grid">
      <div><section className="panel"><div className="panel-heading"><div><span className="eyebrow">PATIENT SNAPSHOT</span><h2>{workspace.patient.name}</h2></div><div className="panel-actions"><button className="secondary" onClick={previewFHIR}>{fhirLoading?"Preparing…":"FHIR preview"}</button><button className="secondary" onClick={validateFHIR}>Validate FHIR</button><button className="secondary" onClick={previewABDM}>{abdmLoading?"Preparing…":"ABDM readiness"}</button><button className="primary" onClick={exportFHIR}>Export FHIR bundle</button><button className="primary" onClick={exportABDM}>ABDM package</button></div></div><div className="snapshot-grid"><div><span>Age</span><strong>{workspace.patient.age}</strong></div><div><span>Gender</span><strong>{workspace.patient.gender}</strong></div><div><span>Blood group</span><strong>{workspace.patient.blood_group||"—"}</strong></div><div><span>Allergies</span><strong>{workspace.patient.allergies||"None recorded"}</strong></div><div><span>Conditions</span><strong>{workspace.patient.conditions||"None recorded"}</strong></div><div><span>Medications</span><strong>{workspace.patient.medications||"None recorded"}</strong></div></div></section>
      <section className="panel"><div className="panel-heading"><div><span className="eyebrow">AI HISTORY</span><h2>Consultations</h2></div></div>{workspace.consultations.length===0?<div className="empty-state small">No completed histories.</div>:workspace.consultations.map(c=><div className="workspace-consultation" key={c.id}><div><strong>{c.title}</strong><p>{c.summary}</p>{c.risk_level!=="none"&&<span className={`risk-tag ${c.risk_level}`}>⚠ {c.risk_level.toUpperCase()} REVIEW</span>}<span className="review-status">Doctor review: {c.doctor_review}</span>{c.doctor_notes&&<p><strong>Notes:</strong> {c.doctor_notes}</p>}{c.ai_summary&&<div className="ai-summary-mini"><strong>🧠 Physician AI summary ready</strong><span>{c.ai_summary.headline}</span></div>}</div><div className="consultation-actions"><button className="secondary" onClick={()=>{setSelectedConsultation(c);setNotes(c.doctor_notes||"");setReview(c.doctor_review||"Reviewed")}}>Review / edit</button><button className="primary" onClick={()=>generateAISummary(c)} disabled={summaryLoading}>{summaryLoading?"Generating…":(c.ai_summary?"Refresh AI summary":"Generate AI summary")}</button><button className="secondary" onClick={()=>openExplainability(c)} disabled={explainLoading}>{explainLoading?"Loading evidence…":"🔎 Explain AI"}</button></div></div>)}</section></div>
      <div><section className="panel"><div className="panel-heading"><div><span className="eyebrow">AYUSH • PHASE 5A</span><h2>Dashavidha Pariksha</h2></div></div>{ayush.length===0?<div className="empty-state small">No AYUSH assessment recorded.</div>:ayush.map(a=><div className="workspace-consultation" key={a.id}><strong>{a.assessment_type}</strong><p>{a.summary}</p><details><summary>View ten assessment fields</summary>{Object.entries(a.responses||{}).map(([k,v])=><div className="finding-line" key={k}><span>{formatKey(k)}</span><strong>{String(v)}</strong></div>)}</details></div>)}</section><div><section className="panel"><div className="panel-heading"><div><span className="eyebrow">DOCUMENT INTELLIGENCE</span><h2>Previous records</h2></div></div>{workspace.documents.length===0?<div className="empty-state small">No documents uploaded.</div>:workspace.documents.map(d=><div className="document-row" key={d.id}><div className="document-icon">📄</div><div><strong>{d.filename}</strong><p>{d.document_type} • {d.status}</p>{d.findings?.map((f,i)=><div className="finding-line" key={i}><span>{f.label}</span><strong>{f.value}</strong></div>)}{d.text_preview&&<details><summary>View extracted text</summary><p className="extracted-text">{d.text_preview}</p></details>}</div></div>)}</section>
      <section className="panel"><div className="panel-heading"><div><span className="eyebrow">PATIENT TIMELINE</span><h2>Clinical record timeline</h2></div></div>{workspace.timeline.map((t,i)=><div className="timeline-item" key={i}><div className="timeline-dot"></div><div><span className="timeline-date">{new Date(t.date).toLocaleString()}</span><strong>{t.type}: {t.title}</strong><p>{t.detail}</p></div></div>)}</section></div>
    </div></section>}
    {aiSummary&&<AISummaryModal summary={aiSummary} onClose={()=>setAiSummary(null)}/>}
    {explainability&&<ExplainabilityModal data={explainability} onClose={()=>setExplainability(null)}/>}
    {validation&&<ValidationModal data={validation} onClose={()=>setValidation(null)}/>}
    {selectedConsultation&&<div className="modal-backdrop"><section className="review-modal"><div className="panel-heading"><div><span className="eyebrow">PHYSICIAN REVIEW</span><h2>{selectedConsultation.title}</h2></div><button className="secondary" onClick={()=>setSelectedConsultation(null)}>Close</button></div>{selectedConsultation.risk_level!=="none"&&<SafetyAlert riskLevel={selectedConsultation.risk_level} redFlags={selectedConsultation.red_flags||[]}/>}<p>{selectedConsultation.summary}</p><label>Review status</label><select value={review} onChange={e=>setReview(e.target.value)}><option>Reviewed</option><option>Needs follow-up</option><option>Requires urgent review</option></select><label>Doctor notes</label><textarea rows="6" value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Add clinical review notes…"/><button className="primary" onClick={saveReview}>Save physician review</button></section></div>}
    {fhir&&<FHIRModal bundle={fhir} onClose={()=>setFhir(null)}/>} {abdm&&<ABDMModal data={abdm} onClose={()=>setAbdm(null)}/>} {fhirValidation&&<FHIRValidationModal data={fhirValidation} onClose={()=>setFhirValidation(null)}/>}
  </Shell>;
}

function AISummaryModal({summary,onClose}){
  return <div className="modal-backdrop"><div className="review-modal ai-summary-modal"><div className="panel-heading"><div><span className="eyebrow">PHASE 5D • PHYSICIAN AI SUMMARY</span><h2>{summary.headline}</h2></div><button className="secondary" onClick={onClose}>Close</button></div>
    <div className="summary-banner"><strong>AI-assisted clinical handoff</strong><span>Generated from the Phase 5C NLP layer and structured patient history.</span></div>
    <section className="summary-section"><h3>Clinical summary</h3><p>{summary.clinical_summary}</p></section>
    <div className="summary-two-col"><section className="summary-section"><h3>Key findings</h3>{summary.key_findings?.length?<ul>{summary.key_findings.map((x,i)=><li key={i}>{x}</li>)}</ul>:<p className="muted">No additional findings extracted.</p>}</section><section className="summary-section"><h3>Reported negatives</h3>{summary.reported_negatives?.length?<ul>{summary.reported_negatives.map((x,i)=><li key={i}>{x}</li>)}</ul>:<p className="muted">No explicit negatives detected.</p>}</section></div>
    <section className="summary-section"><h3>History & background</h3>{[...(summary.history_points||[]),...(summary.background||[])].length?<ul>{[...(summary.history_points||[]),...(summary.background||[])].map((x,i)=><li key={i}>{x}</li>)}</ul>:<p className="muted">No additional structured history available.</p>}</section>
    <section className={`summary-section safety-summary ${summary.safety?.level||"none"}`}><h3>Safety status: {(summary.safety?.level||"none").toUpperCase()}</h3>{summary.safety?.alerts?.length?<ul>{summary.safety.alerts.map((x,i)=><li key={i}><strong>{x.label}</strong> — {x.message}</li>)}</ul>:<p>No immediate red flag was identified by the prototype safety rules.</p>}</section>
    <section className="summary-section"><h3>Physician focus</h3><ul>{(summary.physician_focus||[]).map((x,i)=><li key={i}>{x}</li>)}</ul></section>
    {summary.data_gaps?.length>0&&<section className="summary-section"><h3>Data gaps to clarify</h3><ul>{summary.data_gaps.map((x,i)=><li key={i}>{x}</li>)}</ul></section>}
    <p className="summary-disclaimer">{summary.disclaimer}</p>
  </div></div>
}

function ValidationModal({data,onClose}){
  const m=data.metrics||{};
  return <div className="modal-backdrop"><div className="review-modal validation-modal"><div className="panel-heading"><div><span className="eyebrow">PHASE 5F</span><h2>Validation Report</h2><p className="muted">Synthetic engineering benchmark • Dataset {data.version}</p></div><button className="link-button" onClick={onClose}>Close ✕</button></div><div className="validation-metrics">{[["Symptom precision",m.symptom_precision],["Symptom recall",m.symptom_recall],["Symptom F1",m.symptom_f1],["Intent accuracy",m.intent_accuracy],["Negation recall",m.negation_recall],["Severity accuracy",m.severity_accuracy],["Duration detection",m.duration_detection_rate]].map(([label,v])=><div key={label}><span>{label}</span><strong>{v==null?"N/A":`${(v*100).toFixed(1)}%`}</strong></div>)}</div><div className="validation-summary"><strong>{data.cases_passed} passed</strong><span>{data.cases_failed} failed • {data.dataset_size} total</span></div><div className="validation-cases">{data.cases.map(c=><div className={`validation-case ${c.pass?"pass":"fail"}`} key={c.id}><div><strong>{c.id}</strong><span>{c.pass?"PASS":"REVIEW"}</span></div><p><b>Expected:</b> {c.expected_symptoms.join(", ")||"none"} • <b>Predicted:</b> {c.predicted_symptoms.join(", ")||"none"}</p><small>Intent: {c.predicted_intent} {c.intent_correct?"✓":"✕"} • Confidence: {(c.confidence*100).toFixed(1)}%</small></div>)}</div><div className="validation-limitations"><strong>Important</strong>{data.limitations.map(x=><p key={x}>• {x}</p>)}</div></div></div>;
}

function ExplainabilityModal({data,onClose}){
  return <div className="modal-backdrop"><div className="review-modal explain-modal"><div className="panel-heading"><div><span className="eyebrow">PHASE 5E • EXPLAINABILITY / SOURCES</span><h2>{data.headline}</h2></div><button className="secondary" onClick={onClose}>Close</button></div>
    <div className="summary-banner explain-banner"><strong>Evidence trace</strong><span>Every displayed finding is linked to patient-provided evidence, a transparent local rule/model step, or a reference source.</span></div>
    <section className="summary-section"><h3>Model decision</h3><div className="explain-kv"><div><span>Engine</span><strong>{data.model?.engine}</strong></div><div><span>Model intent</span><strong>{data.model?.model_intent}</strong></div><div><span>Resolved pathway</span><strong>{data.model?.resolved_intent}</strong></div><div><span>Confidence</span><strong>{data.model?.confidence ? `${Math.round(data.model.confidence*100)}%` : "Rule-resolved"}</strong></div></div></section>
    <section className="summary-section"><h3>Finding-level evidence</h3>{data.evidence?.length?data.evidence.map((e,i)=><div className="evidence-row" key={i}><div className="evidence-top"><strong>{e.finding}</strong><span className={`evidence-status ${e.status}`}>{e.status}</span></div><p>{e.evidence}</p><small>{e.method} • {e.confidence}</small></div>):<p className="muted">No traceable evidence was recorded.</p>}</section>
    {data.summary_trace?.length>0&&<section className="summary-section"><h3>Physician summary trace</h3>{data.summary_trace.map((x,i)=><div className="trace-row" key={i}><strong>{x.summary_item}</strong><span>{x.supported_by}</span><p>{x.evidence}</p></div>)}</section>}
    <section className="summary-section"><h3>Reference sources</h3><div className="source-grid">{data.sources?.map(src=><a className="source-card" href={src.url} target="_blank" rel="noreferrer" key={src.id}><strong>{src.title}</strong><span>{src.publisher}</span><p>{src.use}</p><b>Open official source ↗</b></a>)}</div></section>
    <section className="summary-section"><h3>Known limitations</h3><ul>{(data.model?.limitations||[]).map((x,i)=><li key={i}>{x}</li>)}</ul></section>
    <p className="summary-disclaimer">{data.disclaimer}</p>
  </div></div>
}

function FHIRModal({bundle,onClose}){return <div className="modal-backdrop"><div className="review-modal"><div className="panel-heading"><div><span className="eyebrow">PHASE 5B • INTEROPERABILITY</span><h2>FHIR-ready patient bundle</h2></div><button className="secondary" onClick={onClose}>Close</button></div><p className="muted">Prototype export containing Patient, DocumentReference and QuestionnaireResponse resources. This demo generates a standards-shaped bundle; it does not transmit data to a hospital server.</p><div className="fhir-meta"><span>Bundle ID</span><strong>{bundle.id}</strong><span>Resources</span><strong>{bundle.entry?.length||0}</strong></div><pre className="fhir-json">{JSON.stringify(bundle,null,2)}</pre></div></div>}

function GuidedAnswerInput({ question, value, onChange, listening, language }) {
  const id = question?.id || "";
  const isSeverity = id === "severity";
  const yesNoIds = ["chest_radiation", "chest_exertion", "chest_breathlessness"];
  const choiceLabels = {
    "hi-IN": {"Sharp":"तेज़","Dull":"भारी/मंद","Burning":"जलन","Throbbing":"धड़कन जैसी","Tight":"जकड़न","Heavy":"भारीपन","Pressure":"दबाव","Other":"अन्य","Yes":"हां","No":"नहीं","Not sure":"पक्का नहीं","Worse with activity":"मेहनत पर बढ़ता है","Better with rest":"आराम पर कम होता है","No change":"कोई बदलाव नहीं","Breathlessness":"सांस फूलना","Sweating":"पसीना","Dizziness":"चक्कर","Fainting":"बेहोशी","Racing heartbeat":"दिल तेज धड़कना","None of these":"इनमें से कोई नहीं"}
  };
  const label = (x) => choiceLabels[language]?.[x] || x;
  const choices = {
    character: ["Sharp", "Dull", "Burning", "Throbbing", "Tight", "Heavy", "Pressure", "Other"],
    chest_radiation: ["Yes", "No", "Not sure"],
    chest_exertion: ["Worse with activity", "Better with rest", "No change", "Not sure"],
    chest_breathlessness: ["Breathlessness", "Sweating", "Dizziness", "Fainting", "Racing heartbeat", "None of these"],
  };
  if (isSeverity) {
    const n = Number(value);
    const current = Number.isFinite(n) && n >= 0 && n <= 10 ? n : 5;
    return <div className="guided-answer">
      <div className="guided-label"><strong>{language === "hi-IN" ? "तकलीफ़ की गंभीरता चुनें" : "Tap to choose severity"}</strong><span>{current}/10</span></div>
      <input className="severity-slider" type="range" min="0" max="10" step="1" value={current} onChange={e=>onChange(e.target.value)} aria-label="Symptom severity from 0 to 10"/>
      <div className="slider-scale"><span>{language === "hi-IN" ? "0 · कोई नहीं" : "0 · None"}</span><span>{language === "hi-IN" ? "5 · मध्यम" : "5 · Moderate"}</span><span>{language === "hi-IN" ? "10 · सबसे ज्यादा" : "10 · Worst"}</span></div>
    </div>;
  }
  if (choices[id]) {
    const selected = value ? value.split(" | ").filter(Boolean) : [];
    const multi = id === "chest_breathlessness";
    function toggle(option) {
      if (!multi) { onChange(option); return; }
      let next = selected.includes(option) ? selected.filter(x=>x!==option) : [...selected, option];
      if (option === "None of these") next = [option];
      else next = next.filter(x=>x!=="None of these");
      onChange(next.join(" | "));
    }
    return <div className="guided-answer">
      <div className="guided-label"><strong>{language === "hi-IN" ? (multi ? "लागू सभी विकल्प चुनें" : "एक विकल्प चुनें") : (multi ? "Tap all that apply" : "Tap an option")}</strong><span>{selected.length ? `${selected.length} selected` : ""}</span></div>
      <div className="choice-grid">{choices[id].map(option => <button type="button" key={option} className={`choice-chip ${selected.includes(option) ? "selected" : ""}`} onClick={()=>toggle(option)}>{selected.includes(option) ? "✓ " : ""}{label(option)}</button>)}</div>
    </div>;
  }
  return <div className="guided-answer">
    <textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={listening ? "Listening… your words will appear here." : "Type your answer here, or use the guided options above when available…"} rows="3" autoFocus/>
  </div>;
}

function NLPInsight({nlp}){
  return <div className="nlp-insight">
    <div className="nlp-head"><div><span className="eyebrow">PHASE 5C • REAL AI/NLP</span><strong>Clinical language understanding</strong></div><span className="nlp-confidence">{Math.round((nlp.confidence||0)*100)}% model confidence</span></div>
    <div className="nlp-grid">
      <div><span>Detected intent</span><strong>{nlp.intent?.replaceAll("_"," ") || "general"}</strong></div>
      <div><span>Positive symptoms</span><strong>{nlp.positive_symptoms?.length ? nlp.positive_symptoms.join(", ") : "None detected"}</strong></div>
      <div><span>Negated symptoms</span><strong>{nlp.negated_symptoms?.length ? nlp.negated_symptoms.join(", ") : "None detected"}</strong></div>
      <div><span>Duration</span><strong>{nlp.duration_mentions?.length ? nlp.duration_mentions.join(", ") : "Not stated"}</strong></div>
      <div><span>Severity</span><strong>{nlp.severity || "Not stated"}</strong></div>
    </div>
    <small>Engine: {nlp.engine}. This organizes language for clinical review; it does not diagnose.</small>
  </div>
}

function SafetyAlert({riskLevel,redFlags}) {
  const emergency = riskLevel === "emergency";
  return <div className={`safety-alert ${riskLevel}`}>
    <div className="safety-icon">{emergency ? "⚠" : "!"}</div>
    <div><strong>{emergency ? "URGENT SAFETY ALERT" : "CLINICAL REVIEW FLAG"}</strong>
      <p>{emergency ? "The responses contain potentially serious symptoms. Please seek urgent clinical/triage review." : "The responses contain a symptom pattern that should be reviewed promptly by clinical staff."}</p>
      {redFlags.length>0 && <ul>{redFlags.slice(0,3).map(f=><li key={f.id}>{f.label}</li>)}</ul>}
    </div>
  </div>;
}

function PatientProfile({user,apiStatus,onBack}) {
  const [form,setForm]=useState(null); const [msg,setMsg]=useState("");
  useEffect(()=>api(`/api/patients/${user.id}`).then(d=>setForm(d)),[user.id]);
  if(!form)return <main className="page"><div className="loading-card">Loading profile...</div></main>;
  const update=(k,v)=>setForm({...form,[k]:v});
  async function save(e){e.preventDefault();await api(`/api/patients/${user.id}`,{method:"PUT",body:JSON.stringify({...form,age:Number(form.age)})});setMsg("Profile saved ✓");}
  return <main className="dashboard-page"><header className="topbar"><Brand/><div className="topbar-right"><span className="api-pill">● {apiStatus}</span></div></header><div className="content narrow"><button className="back-button" onClick={onBack}>← Back</button><section className="panel"><span className="eyebrow">PATIENT PROFILE</span><h1>Medical information</h1><form onSubmit={save}><div className="form-grid"><Field label="Full name" value={form.name} onChange={v=>update("name",v)} required/><Field label="Age" type="number" value={form.age} onChange={v=>update("age",v)} required/><Field label="Phone" value={form.phone||""} onChange={v=>update("phone",v)}/><Field label="Blood group" value={form.blood_group||""} onChange={v=>update("blood_group",v)}/></div><TextArea label="Allergies" value={form.allergies||""} onChange={v=>update("allergies",v)}/><TextArea label="Existing conditions" value={form.conditions||""} onChange={v=>update("conditions",v)}/><TextArea label="Medications" value={form.medications||""} onChange={v=>update("medications",v)}/>{msg&&<div className="success-message">{msg}</div>}<button className="primary">Save profile</button></form></section></div></main>;
}

function Shell({user,children,logout,apiStatus}) {
  return <main className="dashboard-page"><header className="topbar"><Brand/><div className="topbar-right"><span className="api-pill">● {apiStatus}</span><span className="user-pill">{user.name}</span><button className="logout" onClick={logout}>Logout</button></div></header><div className="content">{children}</div></main>;
}
function InfoCard({title,value,detail,icon}){return <div className="info-card"><div className="card-icon">{icon}</div><div><span>{title}</span><strong>{value}</strong><small>{detail}</small></div></div>}
function Field({label,type="text",value,onChange,required=false,min,max}){return <div><label>{label}</label><input type={type} value={value??""} min={min} max={max} onChange={e=>onChange(e.target.value)} required={required}/></div>}
function TextArea({label,value,onChange}){return <div><label>{label}</label><textarea value={value??""} onChange={e=>onChange(e.target.value)}/></div>}
function initials(n){return n.split(" ").map(x=>x[0]).join("").slice(0,2).toUpperCase()}
function formatKey(k){return k.replaceAll("_"," ").replace(/\b\w/g,c=>c.toUpperCase())}
export default App;
