import React, { useEffect, useState } from 'react';

const getCampProgramUrl = () => {
  const base = (import.meta.env.BASE_URL || '').replace(/\/*$/, '');
  return `${base}${base ? '/' : ''}ai-data/camp-program-template.json`;
};

export interface CampProgramDay {
  day: number;
  theme: string;
  activities: string[];
}

export interface CampProgramData {
  title: string;
  description: string;
  days: CampProgramDay[];
}

export const CampProgramByDays: React.FC = () => {
  const [data, setData] = useState<CampProgramData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shiftLength, setShiftLength] = useState<9 | 21>(21);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(getCampProgramUrl())
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json: CampProgramData) => {
        if (!cancelled) {
          setData(json);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Ошибка загрузки');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const days = data?.days ? data.days.slice(0, shiftLength) : [];
  const title = data?.title || 'Программа смены Реального Лагеря';
  const description = data?.description || '';

  return (
    <div className="camp-program-by-days">
      <h3 className="camp-program-by-days__title">{title}</h3>
      {description && <p className="camp-program-by-days__description">{description}</p>}
      <div className="camp-program-by-days__toggle" role="tablist" aria-label="Длина смены">
        <button
          type="button"
          role="tab"
          aria-selected={shiftLength === 21}
          className="camp-program-by-days__toggle-option"
          onClick={() => setShiftLength(21)}
        >
          21 день
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={shiftLength === 9}
          className="camp-program-by-days__toggle-option"
          onClick={() => setShiftLength(9)}
        >
          9 дней
        </button>
      </div>
      {loading && <p style={{ opacity: 0.8, margin: 0 }}>Загрузка…</p>}
      {error && <p style={{ color: '#f59e0b', margin: 0 }}>{error}</p>}
      {!loading && !error && data && (
        <div className="camp-program-by-days__grid">
          {days.map((d) => (
            <div key={d.day} className="camp-program-day-card">
              <div className="camp-program-day-card__day">День {d.day}</div>
              <div className="camp-program-day-card__theme">{d.theme}</div>
              {d.activities && d.activities.length > 0 && (
                <ul className="camp-program-day-card__activities">
                  {d.activities.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
