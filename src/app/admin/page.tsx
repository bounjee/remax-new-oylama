'use client';

import { useState, useEffect, useCallback } from 'react';

interface Consultant {
  id: number;
  name: string;
  gender: string;
  has_voted: boolean;
}

interface Vote {
  id: number;
  voter_name: string;
  male_vote_name: string;
  female_vote_name: string;
  created_at: string;
}

type Tab = 'dashboard' | 'consultants' | 'bulk' | 'votes' | 'results';

const card: React.CSSProperties = { background: '#fff', borderRadius: '16px', boxShadow: '0 10px 40px rgba(0,0,0,0.1)', overflow: 'hidden', borderTop: '4px solid #DC2626' };
const input: React.CSSProperties = { width: '100%', padding: '12px 16px', border: '2px solid #E5E7EB', borderRadius: '12px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' as const };
const btnBlue: React.CSSProperties = { width: '100%', padding: '14px', background: '#003DA5', color: '#fff', fontWeight: 700, fontSize: '14px', letterSpacing: '0.05em', borderRadius: '12px', border: 'none', cursor: 'pointer' };
const badge: React.CSSProperties = { display: 'inline-block', padding: '6px 16px', background: '#FEF9C3', color: '#003DA5', fontSize: '11px', fontWeight: 700, letterSpacing: '0.2em', borderRadius: '20px', border: '1px solid #FDE68A' };

export default function AdminPanel() {
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [consultants, setConsultants] = useState<Consultant[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [votingOpen, setVotingOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newGender, setNewGender] = useState('ERKEK');
  const [bulkData, setBulkData] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const headers = useCallback(() => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  }), [token]);

  const fetchAll = useCallback(async () => {
    if (!token) return;
    try {
      const [cRes, vRes, sRes] = await Promise.all([
        fetch('/api/consultants', { headers: headers() }),
        fetch('/api/votes', { headers: headers() }),
        fetch('/api/settings'),
      ]);
      const cData = await cRes.json();
      const vData = await vRes.json();
      const sData = await sRes.json();

      if (Array.isArray(cData)) setConsultants(cData);
      if (Array.isArray(vData)) setVotes(vData);
      setVotingOpen(sData.voting_open === 'true');
    } catch {
      console.error('Veri yüklenemedi');
    }
  }, [token, headers]);

  useEffect(() => {
    const saved = localStorage.getItem('admin_token');
    if (saved) {
      fetch('/api/auth', { headers: { Authorization: `Bearer ${saved}` } })
        .then(r => { if (r.ok) setToken(saved); else localStorage.removeItem('admin_token'); })
        .catch(() => localStorage.removeItem('admin_token'));
    }
  }, []);

  useEffect(() => {
    if (token) fetchAll();
  }, [token, fetchAll]);

  const flash = (m: string, isErr = false) => {
    if (isErr) { setErr(m); setMsg(''); } else { setMsg(m); setErr(''); }
    setTimeout(() => { setMsg(''); setErr(''); }, 4000);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (res.ok) {
        setToken(data.token);
        localStorage.setItem('admin_token', data.token);
      } else {
        setLoginError(data.error || 'Giriş başarısız');
      }
    } catch {
      setLoginError('Bağlantı hatası');
    }
  };

  const handleLogout = () => {
    setToken('');
    localStorage.removeItem('admin_token');
  };

  const toggleVoting = async () => {
    const newVal = votingOpen ? 'false' : 'true';
    await fetch('/api/settings', {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ key: 'voting_open', value: newVal }),
    });
    setVotingOpen(!votingOpen);
    flash(`Oylama ${!votingOpen ? 'açıldı' : 'kapatıldı'}`);
  };

  const resetVotes = async () => {
    if (!confirm('Tüm oyları sıfırlamak istediğinize emin misiniz?')) return;
    const res = await fetch('/api/votes/reset', { method: 'POST', headers: headers() });
    if (res.ok) { flash('Tüm oylar sıfırlandı'); fetchAll(); }
    else flash('Oylar sıfırlanamadı', true);
  };

  const addConsultant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const res = await fetch('/api/consultants', {
      method: 'POST', headers: headers(),
      body: JSON.stringify({ name: newName, gender: newGender }),
    });
    const data = await res.json();
    if (res.ok) { flash(`${newName.toUpperCase()} eklendi`); setNewName(''); fetchAll(); }
    else flash(data.error || 'Eklenemedi', true);
  };

  const deleteConsultant = async (id: number, name: string) => {
    if (!confirm(`${name} silinecek. Emin misiniz?`)) return;
    const res = await fetch('/api/consultants', {
      method: 'DELETE', headers: headers(),
      body: JSON.stringify({ id }),
    });
    if (res.ok) { flash(`${name} silindi`); fetchAll(); }
    else flash('Silinemedi', true);
  };

  const handleBulkAdd = async () => {
    if (!bulkData.trim()) return;
    const res = await fetch('/api/consultants/bulk', {
      method: 'POST', headers: headers(),
      body: JSON.stringify({ data: bulkData }),
    });
    const data = await res.json();
    if (res.ok) { flash(`${data.added} danışman eklendi, ${data.skipped} atlandı`); if (data.added > 0) setBulkData(''); fetchAll(); }
    else flash(data.error || 'Toplu ekleme hatası', true);
  };

  const maleResults = consultants.filter(c => c.gender === 'ERKEK')
    .map(c => ({ ...c, voteCount: votes.filter(v => v.male_vote_name === c.name).length }))
    .sort((a, b) => b.voteCount - a.voteCount);

  const femaleResults = consultants.filter(c => c.gender === 'KADIN')
    .map(c => ({ ...c, voteCount: votes.filter(v => v.female_vote_name === c.name).length }))
    .sort((a, b) => b.voteCount - a.voteCount);

  // Login screen
  if (!token) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', background: '#e8edf3' }}>
        <div style={{ width: '100%', maxWidth: '400px' }}>
          <div style={card}>
            <div style={{ padding: '32px' }}>
              <div style={{ marginBottom: '24px' }}><span style={badge}>RE/MAX BEST</span></div>
              <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#00205B', marginBottom: '24px' }}>Admin Girişi</h1>
              <form onSubmit={handleLogin}>
                <input
                  type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="Şifre" style={{ ...input, marginBottom: '16px' }}
                />
                <button type="submit" style={btnBlue}>GİRİŞ YAP</button>
              </form>
              {loginError && <p style={{ marginTop: '12px', color: '#DC2626', fontSize: '14px', textAlign: 'center' }}>{loginError}</p>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const totalConsultants = consultants.length;
  const votedCount = votes.length;
  const notVotedCount = Math.max(0, totalConsultants - votedCount);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'consultants', label: 'Danışmanlar' },
    { key: 'bulk', label: 'Toplu Ekleme' },
    { key: 'votes', label: 'Oy Kayıtları' },
    { key: 'results', label: 'Sonuçlar' },
  ];

  const actionBtn = (text: string, onClick: () => void, variant: 'blue' | 'gray' | 'red'): React.ReactNode => {
    const colors = {
      blue: { border: '2px solid #003DA5', color: '#003DA5', background: '#fff' },
      gray: { border: '2px solid #9CA3AF', color: '#6B7280', background: '#fff' },
      red: { border: 'none', color: '#DC2626', background: '#FEF2F2' },
    };
    return (
      <button onClick={onClick} style={{ padding: '10px 20px', fontWeight: 700, fontSize: '12px', letterSpacing: '0.05em', borderRadius: '20px', cursor: 'pointer', ...colors[variant] }}>
        {text}
      </button>
    );
  };

  return (
    <div style={{ minHeight: '100vh', padding: '16px', background: '#e8edf3' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <div style={card}>
          <div style={{ padding: '32px' }}>
            {/* Header */}
            <div style={{ marginBottom: '24px' }}><span style={badge}>RE/MAX BEST</span></div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '24px' }}>
              {actionBtn(`OYLAMAYI ${votingOpen ? 'KAPAT' : 'AÇ'}`, toggleVoting, 'blue')}
              {actionBtn('ÇIKIŞ YAP', handleLogout, 'gray')}
              {actionBtn('TÜM OYLARI SIFIRLA', resetVotes, 'red')}
            </div>

            {/* Flash Messages */}
            {msg && <div style={{ marginBottom: '16px', padding: '12px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '12px', color: '#15803D', fontSize: '14px' }}>{msg}</div>}
            {err && <div style={{ marginBottom: '16px', padding: '12px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '12px', color: '#DC2626', fontSize: '14px' }}>{err}</div>}

            {/* Tabs */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '32px' }}>
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    padding: '10px 20px', fontWeight: 700, fontSize: '12px', letterSpacing: '0.05em',
                    borderRadius: '20px', border: 'none', cursor: 'pointer', color: '#fff',
                    background: activeTab === tab.key ? '#DC2626' : '#003DA5',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Dashboard */}
            {activeTab === 'dashboard' && (
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#00205B', marginBottom: '24px' }}>Dashboard</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                  {[
                    { label: 'Toplam Danışman', value: totalConsultants, color: '#00205B' },
                    { label: 'Oy Kullanan', value: votedCount, color: '#16A34A' },
                    { label: 'Oy Kullanmayan', value: notVotedCount, color: '#F97316' },
                  ].map(item => (
                    <div key={item.label} style={{ padding: '20px', border: '2px solid #E5E7EB', borderRadius: '12px' }}>
                      <p style={{ fontSize: '13px', color: '#6B7280' }}>{item.label}</p>
                      <p style={{ fontSize: '28px', fontWeight: 700, color: item.color, marginTop: '4px' }}>{item.value}</p>
                    </div>
                  ))}
                  <div style={{ padding: '20px', border: '2px solid #E5E7EB', borderRadius: '12px' }}>
                    <p style={{ fontSize: '13px', color: '#6B7280' }}>Oylama</p>
                    <p style={{ fontSize: '24px', fontWeight: 700, color: votingOpen ? '#16A34A' : '#DC2626', marginTop: '4px' }}>
                      {votingOpen ? 'AÇIK' : 'KAPALI'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Consultants */}
            {activeTab === 'consultants' && (
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#00205B', marginBottom: '24px' }}>Danışman Yönetimi</h2>
                <form onSubmit={addConsultant} style={{ marginBottom: '24px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#00205B', marginBottom: '8px' }}>Ad Soyad</label>
                      <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="AD SOYAD" style={{ ...input, textTransform: 'uppercase' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#00205B', marginBottom: '8px' }}>Cinsiyet</label>
                      <select value={newGender} onChange={(e) => setNewGender(e.target.value)} style={{ ...input, background: '#fff', cursor: 'pointer' }}>
                        <option value="ERKEK">ERKEK</option>
                        <option value="KADIN">KADIN</option>
                      </select>
                    </div>
                  </div>
                  <button type="submit" style={btnBlue}>DANIŞMAN EKLE</button>
                </form>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', fontSize: '14px', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ textAlign: 'left', color: '#003DA5' }}>
                        <th style={{ paddingBottom: '12px', fontWeight: 700 }}>Ad Soyad</th>
                        <th style={{ paddingBottom: '12px', fontWeight: 700 }}>Cinsiyet</th>
                        <th style={{ paddingBottom: '12px', fontWeight: 700 }}>Durum</th>
                        <th style={{ paddingBottom: '12px', fontWeight: 700 }}>Oy</th>
                        <th style={{ paddingBottom: '12px', fontWeight: 700 }}>İşlem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {consultants.map(c => (
                        <tr key={c.id} style={{ borderTop: '1px solid #F3F4F6' }}>
                          <td style={{ padding: '12px 0' }}>{c.name}</td>
                          <td style={{ padding: '12px 0' }}>
                            <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 700, background: c.gender === 'ERKEK' ? '#DBEAFE' : '#FCE7F3', color: c.gender === 'ERKEK' ? '#1D4ED8' : '#DB2777' }}>
                              {c.gender}
                            </span>
                          </td>
                          <td style={{ padding: '12px 0' }}>
                            <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 700, background: c.has_voted ? '#DCFCE7' : '#F3F4F6', color: c.has_voted ? '#15803D' : '#6B7280' }}>
                              {c.has_voted ? 'Oy Kullandı' : 'Bekliyor'}
                            </span>
                          </td>
                          <td style={{ padding: '12px 0' }}>
                            {votes.filter(v => v.male_vote_name === c.name || v.female_vote_name === c.name).length}
                          </td>
                          <td style={{ padding: '12px 0' }}>
                            <button onClick={() => deleteConsultant(c.id, c.name)} style={{ padding: '4px 12px', fontSize: '12px', fontWeight: 700, color: '#DC2626', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                              SİL
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {consultants.length === 0 && <p style={{ textAlign: 'center', color: '#9CA3AF', padding: '32px 0' }}>Henüz danışman eklenmemiş</p>}
                </div>
              </div>
            )}

            {/* Bulk Add */}
            {activeTab === 'bulk' && (
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#00205B', marginBottom: '8px' }}>Toplu Danışman Ekleme</h2>
                <p style={{ color: '#6B7280', fontSize: '14px', marginBottom: '24px' }}>
                  Her satıra şu formatta yaz: AD SOYAD|ERKEK veya AD SOYAD|KADIN
                </p>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#003DA5', marginBottom: '8px' }}>Toplu Liste</label>
                <textarea
                  value={bulkData}
                  onChange={(e) => setBulkData(e.target.value)}
                  placeholder={`İBRAHİM HALİL ÖCAL|ERKEK\nAYŞE DEMİR|KADIN`}
                  rows={12}
                  style={{ ...input, fontFamily: 'monospace', resize: 'vertical', minHeight: '200px' }}
                />
                <button onClick={handleBulkAdd} style={{ ...btnBlue, marginTop: '16px' }}>TOPLU EKLE</button>
              </div>
            )}

            {/* Vote Records */}
            {activeTab === 'votes' && (
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#00205B', marginBottom: '24px' }}>Oy Kayıtları</h2>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', fontSize: '14px', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ textAlign: 'left', color: '#003DA5' }}>
                        <th style={{ paddingBottom: '12px', fontWeight: 700 }}>#</th>
                        <th style={{ paddingBottom: '12px', fontWeight: 700 }}>Oy Veren</th>
                        <th style={{ paddingBottom: '12px', fontWeight: 700 }}>Beyefendi</th>
                        <th style={{ paddingBottom: '12px', fontWeight: 700 }}>Hanımefendi</th>
                        <th style={{ paddingBottom: '12px', fontWeight: 700 }}>Tarih</th>
                      </tr>
                    </thead>
                    <tbody>
                      {votes.map((v, i) => (
                        <tr key={v.id} style={{ borderTop: '1px solid #F3F4F6' }}>
                          <td style={{ padding: '12px 0', color: '#9CA3AF' }}>{i + 1}</td>
                          <td style={{ padding: '12px 0', fontWeight: 500 }}>{v.voter_name}</td>
                          <td style={{ padding: '12px 0' }}>{v.male_vote_name}</td>
                          <td style={{ padding: '12px 0' }}>{v.female_vote_name}</td>
                          <td style={{ padding: '12px 0', color: '#9CA3AF' }}>{new Date(v.created_at).toLocaleString('tr-TR')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {votes.length === 0 && <p style={{ textAlign: 'center', color: '#9CA3AF', padding: '32px 0' }}>Henüz oy kullanılmamış</p>}
                </div>
              </div>
            )}

            {/* Results */}
            {activeTab === 'results' && (
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#00205B', marginBottom: '24px' }}>Sonuçlar</h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
                  {/* Male */}
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#003DA5', marginBottom: '16px' }}>En Şık Beyefendi</h3>
                    {maleResults.map((c, i) => (
                      <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                        <span style={{
                          width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          borderRadius: '50%', fontSize: '12px', fontWeight: 700, color: '#fff', flexShrink: 0,
                          background: i === 0 ? '#EAB308' : i === 1 ? '#9CA3AF' : i === 2 ? '#F97316' : '#E5E7EB',
                          ...(i > 2 ? { color: '#6B7280' } : {}),
                        }}>{i + 1}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ fontSize: '14px', fontWeight: 500 }}>{c.name}</span>
                            <span style={{ fontSize: '14px', fontWeight: 700, color: '#003DA5' }}>{c.voteCount} oy</span>
                          </div>
                          <div style={{ width: '100%', height: '8px', background: '#F3F4F6', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', background: '#003DA5', borderRadius: '4px', width: `${votes.length > 0 ? (c.voteCount / votes.length) * 100 : 0}%`, transition: 'width 0.3s' }} />
                          </div>
                        </div>
                      </div>
                    ))}
                    {maleResults.length === 0 && <p style={{ color: '#9CA3AF', fontSize: '14px' }}>Henüz sonuç yok</p>}
                  </div>

                  {/* Female */}
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#DC2626', marginBottom: '16px' }}>En Şık Hanımefendi</h3>
                    {femaleResults.map((c, i) => (
                      <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                        <span style={{
                          width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          borderRadius: '50%', fontSize: '12px', fontWeight: 700, color: '#fff', flexShrink: 0,
                          background: i === 0 ? '#EAB308' : i === 1 ? '#9CA3AF' : i === 2 ? '#F97316' : '#E5E7EB',
                          ...(i > 2 ? { color: '#6B7280' } : {}),
                        }}>{i + 1}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ fontSize: '14px', fontWeight: 500 }}>{c.name}</span>
                            <span style={{ fontSize: '14px', fontWeight: 700, color: '#DC2626' }}>{c.voteCount} oy</span>
                          </div>
                          <div style={{ width: '100%', height: '8px', background: '#F3F4F6', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', background: '#DC2626', borderRadius: '4px', width: `${votes.length > 0 ? (c.voteCount / votes.length) * 100 : 0}%`, transition: 'width 0.3s' }} />
                          </div>
                        </div>
                      </div>
                    ))}
                    {femaleResults.length === 0 && <p style={{ color: '#9CA3AF', fontSize: '14px' }}>Henüz sonuç yok</p>}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
