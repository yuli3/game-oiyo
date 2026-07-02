import React, { useState } from 'react';

const culturalData = {
  ko: {
    countries: {
      korea: {
        name: "대한민국",
        flag: "🇰🇷",
        customs: "세배(새해 절), 축의금(결혼식 홀수 단위)",
        etiquette: "어른께 고개 숙여 인사하기, 식사 시 어른이 먼저 수저 들기",
        avoid: "4 숫자 선물 피하기, 신부보다 돋보이는 흰색 하객룩 피하기"
      },
      japan: {
        name: "일본",
        flag: "🇯🇵",
        customs: "오미소카(새해 제야의 종), 축의금(홀수 매수 권장)",
        etiquette: "오지기(고개 숙여 인사), 식사 전 '이타다키마스' 인사",
        avoid: "장례식 연상하는 젓가락으로 음식 주고받기 피하기"
      },
      usa: {
        name: "미국",
        flag: "🇺🇸",
        customs: "새해 자정 키스, 웨딩 레지스트리(선물 목록)",
        etiquette: "아이컨택하며 악수하기, 팁 문화(15-20%) 준수",
        avoid: "초대받지 않은 손님 동반하기 피하기"
      }
    },
    ui: {
      selectCountry: "국가 선택하기",
      customs: "문화적 관습",
      etiquette: "기본 에티켓",
      avoid: "주의할 점 (Avoid)"
    }
  },
  en: {
    countries: {
      korea: {
        name: "South Korea",
        flag: "🇰🇷",
        customs: "Sebae (New Year bowing), Wedding cash gifts in odd numbers",
        etiquette: "Bowing to elders, waiting for elders to start eating",
        avoid: "Giving gifts in sets of 4, wearing white as a wedding guest"
      },
      japan: {
        name: "Japan",
        flag: "🇯🇵",
        customs: "Omisoka (NYE bell), Wedding money in odd number of bills",
        etiquette: "Ojigi (bowing), Saying 'Itadakimasu' before meals",
        avoid: "Passing food chopstick-to-chopstick (funeral ritual)"
      },
      usa: {
        name: "USA",
        flag: "🇺🇸",
        customs: "Midnight kiss on NYE, Wedding registries",
        etiquette: "Firm handshake with eye contact, Tipping (15-20%)",
        avoid: "Bringing uninvited plus-ones to events"
      }
    },
    ui: {
      selectCountry: "Select Country",
      customs: "Cultural Customs",
      etiquette: "Basic Etiquette",
      avoid: "Things to Avoid"
    }
  }
};

const CulturalGreetingGuide: React.FC<{ locale?: 'ko' | 'en' }> = ({ locale = 'ko' }) => {
    const t = culturalData[locale] || culturalData.ko;
    const [selectedCountry, setSelectedCountry] = useState<string>('korea');
    
    // @ts-ignore
    const data = t.countries[selectedCountry] || t.countries.korea;

    return (
        <div className="not-prose my-12 p-8 bg-gradient-to-br from-amber-50 to-orange-50 border border-orange-100 rounded-3xl shadow-xl">
            <h3 className="text-2xl font-black text-center text-slate-900 mb-8">{t.ui.selectCountry}</h3>
            
            <div className="flex justify-center gap-4 mb-10">
                {Object.keys(t.countries).map(cid => (
                    <button
                        key={cid}
                        onClick={() => setSelectedCountry(cid)}
                        className={`group flex flex-col items-center gap-2 p-4 rounded-2xl transition-all ${
                            selectedCountry === cid
                                ? 'bg-white shadow-lg scale-110 ring-2 ring-orange-400'
                                : 'hover:bg-white/50'
                        }`}
                    >
                        <span className="text-4xl group-hover:scale-110 transition-transform">{t.countries[cid as keyof typeof t.countries].flag}</span>
                        <span className="text-xs font-bold text-slate-600">{t.countries[cid as keyof typeof t.countries].name}</span>
                    </button>
                ))}
            </div>

            <div className="space-y-4">
                <div className="p-6 bg-white/80 backdrop-blur-sm rounded-2xl border border-orange-100">
                    <div className="flex items-center gap-2 mb-3">
                        <span className="p-1.5 bg-orange-100 rounded-lg text-orange-600">🏮</span>
                        <h4 className="font-bold text-slate-900">{t.ui.customs}</h4>
                    </div>
                    <p className="text-slate-700 text-sm leading-relaxed">{data.customs}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-6 bg-white/80 backdrop-blur-sm rounded-2xl border border-orange-100">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="p-1.5 bg-emerald-100 rounded-lg text-emerald-600">✅</span>
                            <h4 className="font-bold text-slate-900">{t.ui.etiquette}</h4>
                        </div>
                        <p className="text-slate-700 text-sm leading-relaxed">{data.etiquette}</p>
                    </div>
                    <div className="p-6 bg-white/80 backdrop-blur-sm rounded-2xl border border-orange-100">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="p-1.5 bg-rose-100 rounded-lg text-rose-600">❌</span>
                            <h4 className="font-bold text-slate-900">{t.ui.avoid}</h4>
                        </div>
                        <p className="text-slate-700 text-sm leading-relaxed font-bold">{data.avoid}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CulturalGreetingGuide;
