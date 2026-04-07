'use client';

import { useState, useEffect, useCallback } from 'react';

interface Consultant {
  id: number;
  name: string;
  gender: string;
}

export default function VotingPage() {
  const [consultants, setConsultants] = useState<Consultant[]>([]);
  const [voterName, setVoterName] = useState('');
  const [maleVoteId, setMaleVoteId] = useState('');
  const [femaleVoteId, setFemaleVoteId] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [votingOpen, setVotingOpen] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [consultantsRes, settingsRes] = await Promise.all([
        fetch('/api/consultants'),
        fetch('/api/settings'),
      ]);
      const consultantsData = await consultantsRes.json();
      const settingsData = await settingsRes.json();

      if (Array.isArray(consultantsData)) {
        setConsultants(consultantsData);
      }
      setVotingOpen(settingsData.voting_open === 'true');
    } catch {
      console.error('Veri yüklenemedi');
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const maleConsultants = consultants.filter(c => c.gender === 'ERKEK');
  const femaleConsultants = consultants.filter(c => c.gender === 'KADIN');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!voterName.trim() || !maleVoteId || !femaleVoteId) {
      setError('Lütfen tüm alanları doldurun');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voter_name: voterName,
          male_vote_id: parseInt(maleVoteId),
          female_vote_id: parseInt(femaleVoteId),
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage('Oyunuz başarıyla kaydedildi! Teşekkür ederiz.');
        setVoterName('');
        setMaleVoteId('');
        setFemaleVoteId('');
      } else {
        setError(data.error || 'Bir hata oluştu');
      }
    } catch {
      setError('Bağlantı hatası. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', background: '#e8edf3' }}>
      <div style={{ width: '100%', maxWidth: '480px' }}>
        <div style={{ background: '#fff', borderRadius: '16px', boxShadow: '0 10px 40px rgba(0,0,0,0.1)', overflow: 'hidden', borderTop: '4px solid #DC2626' }}>
          <div style={{ padding: '32px' }}>
            {/* Badge */}
            <div style={{ marginBottom: '24px' }}>
              <span style={{ display: 'inline-block', padding: '6px 16px', background: '#FEF9C3', color: '#003DA5', fontSize: '11px', fontWeight: 700, letterSpacing: '0.2em', borderRadius: '20px', border: '1px solid #FDE68A' }}>
                RE/MAX BEST
              </span>
            </div>

            {/* Title */}
            <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#00205B', marginBottom: '8px' }}>
              Şıklık Oylaması
            </h1>
            <p style={{ color: '#6B7280', marginBottom: '32px', fontSize: '14px' }}>
              En Şık Hanımefendi ve Beyefendiyi Birlikte Seçiyoruz
            </p>

            {!votingOpen ? (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <p style={{ fontSize: '20px', fontWeight: 700, color: '#DC2626' }}>Oylama Şu Anda Kapalı</p>
                <p style={{ color: '#6B7280', marginTop: '8px' }}>Oylama başladığında tekrar ziyaret edin.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                {/* Voter Name */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#00205B', marginBottom: '8px' }}>
                    Ad Soyad
                  </label>
                  <input
                    type="text"
                    value={voterName}
                    onChange={(e) => setVoterName(e.target.value)}
                    placeholder="AD SOYAD"
                    style={{ width: '100%', padding: '12px 16px', border: '2px solid #E5E7EB', borderRadius: '12px', fontSize: '14px', outline: 'none', textTransform: 'uppercase', boxSizing: 'border-box' }}
                    onFocus={(e) => e.target.style.borderColor = '#003DA5'}
                    onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
                  />
                </div>

                {/* Male Vote */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#00205B', marginBottom: '8px' }}>
                    En Şık Beyefendi
                  </label>
                  <select
                    value={maleVoteId}
                    onChange={(e) => setMaleVoteId(e.target.value)}
                    style={{ width: '100%', padding: '12px 16px', border: '2px solid #E5E7EB', borderRadius: '12px', fontSize: '14px', outline: 'none', background: '#fff', boxSizing: 'border-box', cursor: 'pointer' }}
                    onFocus={(e) => e.target.style.borderColor = '#003DA5'}
                    onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
                  >
                    <option value="">Önce ad soyad giriniz</option>
                    {maleConsultants.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Female Vote */}
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#00205B', marginBottom: '8px' }}>
                    En Şık Hanımefendi
                  </label>
                  <select
                    value={femaleVoteId}
                    onChange={(e) => setFemaleVoteId(e.target.value)}
                    style={{ width: '100%', padding: '12px 16px', border: '2px solid #E5E7EB', borderRadius: '12px', fontSize: '14px', outline: 'none', background: '#fff', boxSizing: 'border-box', cursor: 'pointer' }}
                    onFocus={(e) => e.target.style.borderColor = '#003DA5'}
                    onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
                  >
                    <option value="">Önce ad soyad giriniz</option>
                    {femaleConsultants.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  style={{ width: '100%', padding: '14px', background: '#003DA5', color: '#fff', fontWeight: 700, fontSize: '14px', letterSpacing: '0.05em', borderRadius: '12px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1 }}
                >
                  {loading ? 'GÖNDERİLİYOR...' : 'OYUMU GÖNDER'}
                </button>
              </form>
            )}

            {/* Messages */}
            {message && (
              <div style={{ marginTop: '16px', padding: '12px 16px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '12px', color: '#15803D', fontSize: '14px', textAlign: 'center' }}>
                {message}
              </div>
            )}
            {error && (
              <div style={{ marginTop: '16px', padding: '12px 16px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '12px', color: '#DC2626', fontSize: '14px', textAlign: 'center' }}>
                {error}
              </div>
            )}

            {/* Footer note */}
            <p style={{ marginTop: '24px', fontSize: '12px', color: '#9CA3AF', textAlign: 'center' }}>
              Ad soyadınızı yazarsınız, sistem kayıtlı danışman listesinden kontrol eder.
              Adaylar sadece kayıtlı listeden gelir.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
