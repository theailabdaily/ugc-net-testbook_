'use client';
import { useState } from 'react';

export default function MTProtoSetup() {
  const [step, setStep]                 = useState('passphrase');
  const [passphrase, setPassphrase]     = useState('');
  const [phone, setPhone]               = useState('');
  const [code, setCode]                 = useState('');
  const [password, setPassword]         = useState('');
  const [token, setToken]               = useState('');
  const [sessionString, setSessionStr]  = useState('');
  const [error, setError]               = useState('');
  const [loading, setLoading]           = useState(false);
  const [copied, setCopied]             = useState(false);

  async function callApi(path, body) {
    const res  = await fetch(path, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'request failed');
    return data;
  }

  async function startAuth(e) {
    e.preventDefault(); setLoading(true); setError('');
    try {
      const data = await callApi('/api/mtproto/auth/start', { phone: phone.trim(), passphrase: passphrase.trim() });
      setToken(data.token);
      setStep('code');
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function submitCode(e) {
    e.preventDefault(); setLoading(true); setError('');
    try {
      const data = await callApi('/api/mtproto/auth/verify-code', { token, code: code.trim() });
      if (data.needs2FA) {
        setStep('2fa');
      } else {
        setSessionStr(data.sessionString);
        setStep('done');
      }
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function submit2FA(e) {
    e.preventDefault(); setLoading(true); setError('');
    try {
      const data = await callApi('/api/mtproto/auth/verify-2fa', { token, password });
      setSessionStr(data.sessionString);
      setStep('done');
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function copySession() {
    try {
      await navigator.clipboard.writeText(sessionString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) { setError('Copy failed — select the text manually'); }
  }

  const box = { background:'white', borderRadius:12, padding:'28px 32px', boxShadow:'0 4px 20px rgba(0,0,0,0.08)', maxWidth:520, width:'100%' };
  const input = { width:'100%', padding:'10px 12px', fontSize:14, border:'1px solid #cbd5e1', borderRadius:8, marginBottom:14, fontFamily:'monospace', boxSizing:'border-box' };
  const btn  = { width:'100%', padding:'11px 16px', fontSize:14, fontWeight:600, background:'#0f172a', color:'white', border:'none', borderRadius:8, cursor:'pointer' };
  const btnDisabled = { ...btn, background:'#94a3b8', cursor:'not-allowed' };
  const labelStyle = { fontSize:12, fontWeight:600, color:'#475569', display:'block', marginBottom:6 };
  const note  = { fontSize:12, color:'#64748b', lineHeight:1.6, marginBottom:14 };

  return (
    <div style={{ minHeight:'100vh', background:'#f1f5f9', display:'flex', alignItems:'center', justifyContent:'center', padding:24, fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif' }}>
      <div style={box}>
        <div style={{ fontSize:11, fontWeight:700, color:'#3b82f6', letterSpacing:'0.1em', marginBottom:4 }}>TESTBOOK · MTPROTO</div>
        <div style={{ fontSize:22, fontWeight:800, color:'#0f172a', marginBottom:6 }}>Telegram Worker Setup</div>
        <div style={{ fontSize:13, color:'#64748b', marginBottom:24 }}>One-time auth flow. Generates a session string for the Fly.io worker.</div>

        {step === 'passphrase' && (
          <form onSubmit={(e) => { e.preventDefault(); if (passphrase.trim()) setStep('phone'); }}>
            <label style={labelStyle}>Setup passphrase</label>
            <input style={input} type="password" value={passphrase} onChange={e=>setPassphrase(e.target.value)} placeholder="From MTPROTO_SETUP_PASSPHRASE env var" autoFocus />
            <p style={note}>The value you set in Vercel as <code>MTPROTO_SETUP_PASSPHRASE</code>. Keeps this page private.</p>
            <button type="submit" style={passphrase.trim()?btn:btnDisabled} disabled={!passphrase.trim()}>Continue</button>
          </form>
        )}

        {step === 'phone' && (
          <form onSubmit={startAuth}>
            <label style={labelStyle}>Telegram phone number (E.164, e.g. +91…)</label>
            <input style={input} type="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+91xxxxxxxxxx" autoFocus />
            <p style={note}>The phone number your Telegram account is registered with. Include country code, no spaces.</p>
            <button type="submit" style={(phone.trim() && !loading) ? btn : btnDisabled} disabled={!phone.trim() || loading}>
              {loading ? 'Sending code…' : 'Send code'}
            </button>
          </form>
        )}

        {step === 'code' && (
          <form onSubmit={submitCode}>
            <div style={{ background:'#dbeafe', border:'1px solid #93c5fd', color:'#1e40af', padding:'10px 14px', borderRadius:8, fontSize:12, marginBottom:14 }}>
              ✓ Code sent. Open Telegram on your phone — you'll see a message from <strong>Telegram</strong> with the login code.
            </div>
            <label style={labelStyle}>Login code from Telegram</label>
            <input style={input} type="text" inputMode="numeric" value={code} onChange={e=>setCode(e.target.value)} placeholder="5-6 digit code" autoFocus maxLength={10} />
            <p style={note}>Codes from Telegram (not SMS) arrive as a message inside your Telegram app from the "Telegram" service chat.</p>
            <button type="submit" style={(code.trim() && !loading) ? btn : btnDisabled} disabled={!code.trim() || loading}>
              {loading ? 'Verifying…' : 'Verify code'}
            </button>
          </form>
        )}

        {step === '2fa' && (
          <form onSubmit={submit2FA}>
            <div style={{ background:'#fef3c7', border:'1px solid #fbbf24', color:'#92400e', padding:'10px 14px', borderRadius:8, fontSize:12, marginBottom:14 }}>
              🔐 Account has 2FA enabled. Enter your Telegram cloud password.
            </div>
            <label style={labelStyle}>2FA password</label>
            <input style={input} type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Your Telegram 2FA password" autoFocus />
            <button type="submit" style={(password && !loading) ? btn : btnDisabled} disabled={!password || loading}>
              {loading ? 'Verifying…' : 'Verify password'}
            </button>
          </form>
        )}

        {step === 'done' && (
          <div>
            <div style={{ background:'#dcfce7', border:'1px solid #86efac', color:'#15803d', padding:'12px 14px', borderRadius:8, fontSize:13, marginBottom:16, fontWeight:600 }}>
              ✓ Authentication successful. Copy the session string below — you'll paste it into Fly.io secrets.
            </div>
            <label style={labelStyle}>Session string (TREAT AS A PASSWORD — never commit to git)</label>
            <textarea
              readOnly
              value={sessionString}
              style={{ ...input, fontFamily:'monospace', fontSize:11, minHeight:140, resize:'vertical', wordBreak:'break-all' }}
              onClick={(e)=>e.target.select()}
            />
            <button onClick={copySession} style={btn}>
              {copied ? '✓ Copied' : 'Copy to clipboard'}
            </button>
            <div style={{ background:'#fef2f2', border:'1px solid #fecaca', color:'#991b1b', padding:'12px 14px', borderRadius:8, fontSize:12, marginTop:18, lineHeight:1.6 }}>
              <strong>Next steps:</strong>
              <ol style={{ marginTop:8, marginLeft:18, padding:0 }}>
                <li>Paste this string into Fly.io as a secret named <code>TG_SESSION_STRING</code></li>
                <li>Close this tab. Don't share the string or paste it anywhere else.</li>
                <li>If compromised, return to my.telegram.org and revoke this session under "Active sessions".</li>
              </ol>
            </div>
          </div>
        )}

        {error && (
          <div style={{ background:'#fef2f2', border:'1px solid #fecaca', color:'#991b1b', padding:'10px 14px', borderRadius:8, fontSize:13, marginTop:14 }}>
            <strong>Error:</strong> {error}
          </div>
        )}
      </div>
    </div>
  );
}
