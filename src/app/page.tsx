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
  const [maleSearch, setMaleSearch] = useState('');
  const [femaleSearch, setFemaleSearch] = useState('');

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

  const filteredMales = maleConsultants.filter(c =>
    c.name.toLowerCase().includes(maleSearch.toLowerCase())
  );
  const filteredFemales = femaleConsultants.filter(c =>
    c.name.toLowerCase().includes(femaleSearch.toLowerCase())
  );

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
        setMaleSearch('');
        setFemaleSearch('');
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
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#e8edf3]">
      <div className="w-full max-w-lg">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border-t-4 border-[#DC2626]">
          <div className="p-8">
            {/* Badge */}
            <div className="mb-6">
              <span className="inline-block px-4 py-1.5 bg-yellow-100 text-[#003DA5] text-xs font-bold tracking-[0.2em] rounded-full border border-yellow-300">
                RE/MAX BEST
              </span>
            </div>

            {/* Title */}
            <h1 className="text-3xl font-extrabold text-[#00205B] mb-2">
              Şıklık Oylaması
            </h1>
            <p className="text-gray-500 mb-8 text-sm">
              En Şık Hanımefendi ve Beyefendiyi Birlikte Seçiyoruz
            </p>

            {!votingOpen ? (
              <div className="text-center py-8">
                <p className="text-xl font-bold text-[#DC2626]">Oylama Şu Anda Kapalı</p>
                <p className="text-gray-500 mt-2">Oylama başladığında tekrar ziyaret edin.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Voter Name */}
                <div>
                  <label className="block text-sm font-bold text-[#00205B] mb-2">
                    Ad Soyad
                  </label>
                  <input
                    type="text"
                    value={voterName}
                    onChange={(e) => setVoterName(e.target.value)}
                    placeholder="AD SOYAD"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#003DA5] focus:outline-none transition-colors text-sm uppercase"
                  />
                </div>

                {/* Male Vote */}
                <div>
                  <label className="block text-sm font-bold text-[#00205B] mb-2">
                    En Şık Beyefendi
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={maleSearch}
                      onChange={(e) => {
                        setMaleSearch(e.target.value);
                        setMaleVoteId('');
                      }}
                      placeholder="Önce ad soyad giriniz"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#003DA5] focus:outline-none transition-colors text-sm"
                    />
                    {maleSearch && !maleVoteId && (
                      <div className="absolute z-10 w-full mt-1 bg-white border-2 border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                        {filteredMales.length > 0 ? filteredMales.map(c => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setMaleVoteId(String(c.id));
                              setMaleSearch(c.name);
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-blue-50 text-sm transition-colors"
                          >
                            {c.name}
                          </button>
                        )) : (
                          <div className="px-4 py-2 text-sm text-gray-400">Sonuç bulunamadı</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Female Vote */}
                <div>
                  <label className="block text-sm font-bold text-[#00205B] mb-2">
                    En Şık Hanımefendi
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={femaleSearch}
                      onChange={(e) => {
                        setFemaleSearch(e.target.value);
                        setFemaleVoteId('');
                      }}
                      placeholder="Önce ad soyad giriniz"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#003DA5] focus:outline-none transition-colors text-sm"
                    />
                    {femaleSearch && !femaleVoteId && (
                      <div className="absolute z-10 w-full mt-1 bg-white border-2 border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                        {filteredFemales.length > 0 ? filteredFemales.map(c => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setFemaleVoteId(String(c.id));
                              setFemaleSearch(c.name);
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-blue-50 text-sm transition-colors"
                          >
                            {c.name}
                          </button>
                        )) : (
                          <div className="px-4 py-2 text-sm text-gray-400">Sonuç bulunamadı</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-[#003DA5] text-white font-bold text-sm tracking-wider rounded-xl hover:bg-[#00205B] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'GÖNDERİLİYOR...' : 'OYUMU GÖNDER'}
                </button>
              </form>
            )}

            {/* Messages */}
            {message && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm text-center">
                {message}
              </div>
            )}
            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm text-center">
                {error}
              </div>
            )}

            {/* Footer note */}
            <p className="mt-6 text-xs text-gray-400 text-center">
              Ad soyadınızı yazarsınız, sistem kayıtlı danışman listesinden kontrol eder.
              Adaylar sadece kayıtlı listeden gelir.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
