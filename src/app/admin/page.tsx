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
    if (res.ok) {
      flash('Tüm oylar sıfırlandı');
      fetchAll();
    } else {
      flash('Oylar sıfırlanamadı', true);
    }
  };

  const addConsultant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const res = await fetch('/api/consultants', {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ name: newName, gender: newGender }),
    });
    const data = await res.json();
    if (res.ok) {
      flash(`${newName.toUpperCase()} eklendi`);
      setNewName('');
      fetchAll();
    } else {
      flash(data.error || 'Eklenemedi', true);
    }
  };

  const deleteConsultant = async (id: number, name: string) => {
    if (!confirm(`${name} silinecek. Emin misiniz?`)) return;
    const res = await fetch('/api/consultants', {
      method: 'DELETE',
      headers: headers(),
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      flash(`${name} silindi`);
      fetchAll();
    } else {
      flash('Silinemedi', true);
    }
  };

  const handleBulkAdd = async () => {
    if (!bulkData.trim()) return;
    const res = await fetch('/api/consultants/bulk', {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ data: bulkData }),
    });
    const data = await res.json();
    if (res.ok) {
      flash(`${data.added} danışman eklendi, ${data.skipped} atlandı`);
      if (data.added > 0) setBulkData('');
      fetchAll();
    } else {
      flash(data.error || 'Toplu ekleme hatası', true);
    }
  };

  // Results calculation
  const maleResults = consultants
    .filter(c => c.gender === 'ERKEK')
    .map(c => ({
      ...c,
      voteCount: votes.filter(v => v.male_vote_name === c.name).length,
    }))
    .sort((a, b) => b.voteCount - a.voteCount);

  const femaleResults = consultants
    .filter(c => c.gender === 'KADIN')
    .map(c => ({
      ...c,
      voteCount: votes.filter(v => v.female_vote_name === c.name).length,
    }))
    .sort((a, b) => b.voteCount - a.voteCount);

  // Login screen
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#e8edf3]">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden border-t-4 border-[#DC2626]">
            <div className="p-8">
              <div className="mb-6">
                <span className="inline-block px-4 py-1.5 bg-yellow-100 text-[#003DA5] text-xs font-bold tracking-[0.2em] rounded-full border border-yellow-300">
                  RE/MAX BEST
                </span>
              </div>
              <h1 className="text-2xl font-extrabold text-[#00205B] mb-6">Admin Girişi</h1>
              <form onSubmit={handleLogin} className="space-y-4">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Şifre"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#003DA5] focus:outline-none text-sm"
                />
                <button
                  type="submit"
                  className="w-full py-3 bg-[#003DA5] text-white font-bold text-sm rounded-xl hover:bg-[#00205B] transition-colors"
                >
                  GİRİŞ YAP
                </button>
              </form>
              {loginError && (
                <p className="mt-3 text-red-600 text-sm text-center">{loginError}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const totalConsultants = consultants.length;
  const votedCount = votes.length;
  const notVotedCount = totalConsultants - votedCount;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'consultants', label: 'Danışmanlar' },
    { key: 'bulk', label: 'Toplu Ekleme' },
    { key: 'votes', label: 'Oy Kayıtları' },
    { key: 'results', label: 'Sonuçlar' },
  ];

  return (
    <div className="min-h-screen p-4 bg-[#e8edf3]">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border-t-4 border-[#DC2626]">
          <div className="p-6 md:p-8">
            {/* Header */}
            <div className="mb-6">
              <span className="inline-block px-4 py-1.5 bg-yellow-100 text-[#003DA5] text-xs font-bold tracking-[0.2em] rounded-full border border-yellow-300">
                RE/MAX BEST
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 mb-6">
              <button
                onClick={toggleVoting}
                className="px-5 py-2.5 border-2 border-[#003DA5] text-[#003DA5] font-bold text-xs tracking-wider rounded-full hover:bg-[#003DA5] hover:text-white transition-colors"
              >
                OYLAMAYI {votingOpen ? 'KAPAT' : 'AÇ'}
              </button>
              <button
                onClick={handleLogout}
                className="px-5 py-2.5 border-2 border-gray-400 text-gray-600 font-bold text-xs tracking-wider rounded-full hover:bg-gray-100 transition-colors"
              >
                ÇIKIŞ YAP
              </button>
              <button
                onClick={resetVotes}
                className="px-5 py-2.5 text-[#DC2626] font-bold text-xs tracking-wider rounded-full bg-red-50 hover:bg-red-100 transition-colors"
              >
                TÜM OYLARI SIFIRLA
              </button>
            </div>

            {/* Flash Messages */}
            {msg && <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">{msg}</div>}
            {err && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{err}</div>}

            {/* Tabs */}
            <div className="flex flex-wrap gap-2 mb-8">
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-5 py-2.5 font-bold text-xs tracking-wider rounded-full transition-colors ${
                    activeTab === tab.key
                      ? 'bg-[#DC2626] text-white'
                      : 'bg-[#003DA5] text-white hover:bg-[#00205B]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Dashboard Tab */}
            {activeTab === 'dashboard' && (
              <div>
                <h2 className="text-2xl font-bold text-[#00205B] mb-6">Dashboard</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-5 border-2 border-gray-200 rounded-xl">
                    <p className="text-sm text-gray-500">Toplam Danışman</p>
                    <p className="text-3xl font-bold text-[#00205B] mt-1">{totalConsultants}</p>
                  </div>
                  <div className="p-5 border-2 border-gray-200 rounded-xl">
                    <p className="text-sm text-gray-500">Oy Kullanan</p>
                    <p className="text-3xl font-bold text-green-600 mt-1">{votedCount}</p>
                  </div>
                  <div className="p-5 border-2 border-gray-200 rounded-xl">
                    <p className="text-sm text-gray-500">Oy Kullanmayan</p>
                    <p className="text-3xl font-bold text-orange-500 mt-1">{notVotedCount < 0 ? 0 : notVotedCount}</p>
                  </div>
                  <div className="p-5 border-2 border-gray-200 rounded-xl">
                    <p className="text-sm text-gray-500">Oylama</p>
                    <p className={`text-2xl font-bold mt-1 ${votingOpen ? 'text-green-600' : 'text-[#DC2626]'}`}>
                      {votingOpen ? 'AÇIK' : 'KAPALI'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Consultants Tab */}
            {activeTab === 'consultants' && (
              <div>
                <h2 className="text-2xl font-bold text-[#00205B] mb-6">Danışman Yönetimi</h2>
                <form onSubmit={addConsultant} className="mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-bold text-[#00205B] mb-2">Ad Soyad</label>
                      <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="AD SOYAD"
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#003DA5] focus:outline-none text-sm uppercase"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-[#00205B] mb-2">Cinsiyet</label>
                      <select
                        value={newGender}
                        onChange={(e) => setNewGender(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#003DA5] focus:outline-none text-sm"
                      >
                        <option value="ERKEK">ERKEK</option>
                        <option value="KADIN">KADIN</option>
                      </select>
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full py-3 bg-[#003DA5] text-white font-bold text-sm tracking-wider rounded-xl hover:bg-[#00205B] transition-colors"
                  >
                    DANIŞMAN EKLE
                  </button>
                </form>

                {/* Consultant Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[#003DA5]">
                        <th className="pb-3 font-bold">Ad Soyad</th>
                        <th className="pb-3 font-bold">Cinsiyet</th>
                        <th className="pb-3 font-bold">Durum</th>
                        <th className="pb-3 font-bold">Oy</th>
                        <th className="pb-3 font-bold">İşlem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {consultants.map(c => (
                        <tr key={c.id} className="border-t border-gray-100">
                          <td className="py-3">{c.name}</td>
                          <td className="py-3">
                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                              c.gender === 'ERKEK' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'
                            }`}>
                              {c.gender}
                            </span>
                          </td>
                          <td className="py-3">
                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                              c.has_voted ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                            }`}>
                              {c.has_voted ? 'Oy Kullandı' : 'Bekliyor'}
                            </span>
                          </td>
                          <td className="py-3">
                            {votes.filter(v => v.male_vote_name === c.name || v.female_vote_name === c.name).length}
                          </td>
                          <td className="py-3">
                            <button
                              onClick={() => deleteConsultant(c.id, c.name)}
                              className="px-3 py-1 text-xs font-bold text-red-600 hover:bg-red-50 rounded transition-colors"
                            >
                              SİL
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {consultants.length === 0 && (
                    <p className="text-center text-gray-400 py-8">Henüz danışman eklenmemiş</p>
                  )}
                </div>
              </div>
            )}

            {/* Bulk Add Tab */}
            {activeTab === 'bulk' && (
              <div>
                <h2 className="text-2xl font-bold text-[#00205B] mb-2">Toplu Danışman Ekleme</h2>
                <p className="text-gray-500 text-sm mb-6">
                  Her satıra şu formatta yaz: AD SOYAD|ERKEK veya AD SOYAD|KADIN
                </p>
                <div>
                  <label className="block text-sm font-bold text-[#003DA5] mb-2">Toplu Liste</label>
                  <textarea
                    value={bulkData}
                    onChange={(e) => setBulkData(e.target.value)}
                    placeholder={`İBRAHİM HALİL ÖCAL|ERKEK\nAYŞE DEMİR|KADIN`}
                    rows={12}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#003DA5] focus:outline-none text-sm font-mono resize-y"
                  />
                </div>
                <button
                  onClick={handleBulkAdd}
                  className="w-full mt-4 py-3 bg-[#003DA5] text-white font-bold text-sm tracking-wider rounded-xl hover:bg-[#00205B] transition-colors"
                >
                  TOPLU EKLE
                </button>
              </div>
            )}

            {/* Vote Records Tab */}
            {activeTab === 'votes' && (
              <div>
                <h2 className="text-2xl font-bold text-[#00205B] mb-6">Oy Kayıtları</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[#003DA5]">
                        <th className="pb-3 font-bold">#</th>
                        <th className="pb-3 font-bold">Oy Veren</th>
                        <th className="pb-3 font-bold">Beyefendi</th>
                        <th className="pb-3 font-bold">Hanımefendi</th>
                        <th className="pb-3 font-bold">Tarih</th>
                      </tr>
                    </thead>
                    <tbody>
                      {votes.map((v, i) => (
                        <tr key={v.id} className="border-t border-gray-100">
                          <td className="py-3 text-gray-400">{i + 1}</td>
                          <td className="py-3 font-medium">{v.voter_name}</td>
                          <td className="py-3">{v.male_vote_name}</td>
                          <td className="py-3">{v.female_vote_name}</td>
                          <td className="py-3 text-gray-400">
                            {new Date(v.created_at).toLocaleString('tr-TR')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {votes.length === 0 && (
                    <p className="text-center text-gray-400 py-8">Henüz oy kullanılmamış</p>
                  )}
                </div>
              </div>
            )}

            {/* Results Tab */}
            {activeTab === 'results' && (
              <div>
                <h2 className="text-2xl font-bold text-[#00205B] mb-6">Sonuçlar</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Male Results */}
                  <div>
                    <h3 className="text-lg font-bold text-[#003DA5] mb-4">En Şık Beyefendi</h3>
                    <div className="space-y-3">
                      {maleResults.map((c, i) => (
                        <div key={c.id} className="flex items-center gap-3">
                          <span className={`w-8 h-8 flex items-center justify-center rounded-full text-xs font-bold ${
                            i === 0 ? 'bg-yellow-400 text-white' :
                            i === 1 ? 'bg-gray-300 text-white' :
                            i === 2 ? 'bg-orange-400 text-white' :
                            'bg-gray-100 text-gray-500'
                          }`}>
                            {i + 1}
                          </span>
                          <div className="flex-1">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-sm font-medium">{c.name}</span>
                              <span className="text-sm font-bold text-[#003DA5]">{c.voteCount} oy</span>
                            </div>
                            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-[#003DA5] rounded-full transition-all"
                                style={{ width: `${votes.length > 0 ? (c.voteCount / votes.length) * 100 : 0}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                      {maleResults.length === 0 && (
                        <p className="text-gray-400 text-sm">Henüz sonuç yok</p>
                      )}
                    </div>
                  </div>

                  {/* Female Results */}
                  <div>
                    <h3 className="text-lg font-bold text-[#DC2626] mb-4">En Şık Hanımefendi</h3>
                    <div className="space-y-3">
                      {femaleResults.map((c, i) => (
                        <div key={c.id} className="flex items-center gap-3">
                          <span className={`w-8 h-8 flex items-center justify-center rounded-full text-xs font-bold ${
                            i === 0 ? 'bg-yellow-400 text-white' :
                            i === 1 ? 'bg-gray-300 text-white' :
                            i === 2 ? 'bg-orange-400 text-white' :
                            'bg-gray-100 text-gray-500'
                          }`}>
                            {i + 1}
                          </span>
                          <div className="flex-1">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-sm font-medium">{c.name}</span>
                              <span className="text-sm font-bold text-[#DC2626]">{c.voteCount} oy</span>
                            </div>
                            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-[#DC2626] rounded-full transition-all"
                                style={{ width: `${votes.length > 0 ? (c.voteCount / votes.length) * 100 : 0}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                      {femaleResults.length === 0 && (
                        <p className="text-gray-400 text-sm">Henüz sonuç yok</p>
                      )}
                    </div>
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
