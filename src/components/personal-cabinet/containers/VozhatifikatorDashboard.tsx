import type React from 'react';
import '../../../styles/Vozhatificator.css';
import { useEffect, useRef, useState } from 'react';
import { VozhatifikatorChecklist } from '../../../components/VozhatifikatorChecklist';
import { markdownToHtmlWithHeadingIds, parseMarkdownToc } from '../../../utils/markdown';

interface VozhatifikatorDashboardProps {
  vozhatifikatorTab: string;
  userData: any;
  updateVozhatifikatorChecklist: (...args: any[]) => void;
  role: string;
  deviceId: string;
  isMobile: boolean;
}

export const VozhatifikatorDashboard: React.FC<VozhatifikatorDashboardProps> = ({
  vozhatifikatorTab,
  userData,
  updateVozhatifikatorChecklist,
  role,
  deviceId,
  isMobile,
}) => {
  const [vozhatifikatorHtml, setVozhatifikatorHtml] = useState<string | null>(null);
  const [vozhatifikatorToc, setVozhatifikatorToc] = useState<Array<{ id: string; title: string }>>(
    []
  );
  const [vozhatifikatorLoading, setVozhatifikatorLoading] = useState(false);
  const [vozhatifikatorError, setVozhatifikatorError] = useState<string | null>(null);
  const vozhatifikatorBookRef = useRef<HTMLDivElement | null>(null);

  // Load Вожатификатор book (markdown → HTML + TOC)
  useEffect(() => {
    if (vozhatifikatorTab !== 'book' || vozhatifikatorHtml !== null) return;
    const base = (import.meta.env.BASE_URL || '').replace(/\/*$/, '');
    const url = `${base}${base ? '/' : ''}vozhatifikator.md`;
    let cancelled = false;
    setVozhatifikatorLoading(true);
    setVozhatifikatorError(null);
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then((md) => {
        if (cancelled) return;
        const toc = parseMarkdownToc(md);
        const html = markdownToHtmlWithHeadingIds(md, toc);
        setVozhatifikatorToc(toc);
        setVozhatifikatorHtml(html);
      })
      .catch((e) => {
        if (!cancelled) setVozhatifikatorError(e instanceof Error ? e.message : 'Ошибка загрузки');
      })
      .finally(() => {
        if (!cancelled) setVozhatifikatorLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [vozhatifikatorTab, vozhatifikatorHtml]);

  return (
    <div
      key="vozhatifikator"
      className="fade-in"
      style={{
        background: 'rgba(8, 20, 40, 0.45)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        borderRadius: 18,
        border: '1px solid rgba(93, 228, 255, 0.12)',
        padding: '24px 28px',
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        gap: 20,
      }}
    >
      {vozhatifikatorTab === 'book' ? (
        <>
          {/* TOC sidebar */}
          {isMobile ? (
            <details
              style={{
                background: 'rgba(93,228,255,0.05)',
                borderRadius: 12,
                padding: '12px 16px',
                border: '1px solid rgba(93,228,255,0.15)',
                flexShrink: 0,
              }}
            >
              <summary
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: '#5de4ff',
                  cursor: 'pointer',
                  outline: 'none',
                  userSelect: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                📖 Оглавление книги
              </summary>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  marginTop: 16,
                  maxHeight: '60vh',
                  overflowY: 'auto',
                }}
              >
                <a
                  href="/VZhTFKTR.docx"
                  download="VZhTFKTR.docx"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    padding: '10px 14px',
                    borderRadius: 10,
                    background: 'rgba(93,228,255,0.08)',
                    border: '1px solid rgba(93,228,255,0.2)',
                    color: '#5de4ff',
                    fontSize: 13,
                    fontWeight: 600,
                    textDecoration: 'none',
                    marginBottom: 8,
                  }}
                >
                  📥 Скачать DOCX
                </a>
                {vozhatifikatorToc.map((item) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      vozhatifikatorBookRef.current
                        ?.querySelector(`#${CSS.escape(item.id)}`)
                        ?.scrollIntoView({ behavior: 'smooth' });
                      const detailsEl = e.currentTarget.closest('details');
                      if (detailsEl) detailsEl.removeAttribute('open');
                    }}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 8,
                      fontSize: 13,
                      lineHeight: 1.4,
                      color: 'rgba(255,255,255,0.85)',
                      textDecoration: 'none',
                      background: 'rgba(255,255,255,0.05)',
                      fontWeight: 500,
                    }}
                  >
                    {item.title}
                  </a>
                ))}
              </div>
            </details>
          ) : (
            <aside
              style={{
                width: 220,
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                maxHeight: 'calc(100vh - 120px)',
                overflowY: 'auto',
              }}
            >
              <a
                href="/VZhTFKTR.docx"
                download="VZhTFKTR.docx"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 14px',
                  borderRadius: 10,
                  background: 'rgba(93,228,255,0.08)',
                  border: '1px solid rgba(93,228,255,0.2)',
                  color: '#5de4ff',
                  fontSize: 12,
                  fontWeight: 600,
                  textDecoration: 'none',
                  transition: 'background 0.15s',
                }}
              >
                📥 Скачать DOCX
              </a>
              <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {vozhatifikatorToc.map((item) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      vozhatifikatorBookRef.current
                        ?.querySelector(`#${CSS.escape(item.id)}`)
                        ?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    style={{
                      padding: '6px 10px',
                      borderRadius: 6,
                      fontSize: 12,
                      lineHeight: 1.4,
                      color: 'rgba(255,255,255,0.65)',
                      textDecoration: 'none',
                      transition: 'color 0.15s, background 0.15s',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = '#5de4ff';
                      e.currentTarget.style.background = 'rgba(93,228,255,0.06)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'rgba(255,255,255,0.65)';
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    {item.title}
                  </a>
                ))}
              </nav>
            </aside>
          )}
          {/* Book content */}
          <div
            ref={vozhatifikatorBookRef}
            className="vozhatifikator-book"
            style={{
              flex: 1,
              overflowY: 'auto',
              width: '100%',
              maxHeight: isMobile ? 'calc(100vh - 200px)' : 'calc(100vh - 120px)',
            }}
          >
            {vozhatifikatorLoading && (
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>Загрузка книги…</p>
            )}
            {vozhatifikatorError && (
              <p style={{ color: '#f59e0b', fontSize: 14 }}>{vozhatifikatorError}</p>
            )}
            {!vozhatifikatorLoading && !vozhatifikatorError && vozhatifikatorHtml && (
              <div
                className="vozhatifikator-book__content"
                dangerouslySetInnerHTML={{ __html: vozhatifikatorHtml }}
              />
            )}
          </div>
        </>
      ) : vozhatifikatorTab === 'lights' ? (
        <VozhatifikatorChecklist
          completedIds={userData?.vozhatifikatorChecklist?.completedIds ?? []}
          onToggle={updateVozhatifikatorChecklist}
          userNickname={userData?.profile?.nickname || ''}
          userRole={role || 'participant'}
          deviceId={deviceId || ''}
        />
      ) : vozhatifikatorTab === 'bad-advice' ? (
        /* Вредные советы директору — announcement placeholder */
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: '60px 20px',
            gap: 16,
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 20,
              background: 'linear-gradient(135deg, rgba(236,72,153,0.15), rgba(139,92,246,0.15))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 32,
            }}
          >
            😈
          </div>
          <h3
            style={{
              margin: 0,
              fontSize: 20,
              fontWeight: 800,
              color: '#fff',
              letterSpacing: '-0.02em',
            }}
          >
            Вредные советы директору
          </h3>
          <p
            style={{
              margin: 0,
              fontSize: 14,
              color: 'rgba(255,255,255,0.5)',
              lineHeight: 1.6,
              maxWidth: 400,
            }}
          >
            Новый раздел в разработке. Здесь появятся ироничные «антисоветы» — что <em>не</em> стоит
            делать, если хотите, чтобы ваш лагерь процветал.
          </p>
          <span
            style={{
              padding: '6px 16px',
              borderRadius: 20,
              background: 'rgba(236,72,153,0.12)',
              border: '1px solid rgba(236,72,153,0.25)',
              color: '#EC4899',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            Скоро
          </span>
        </div>
      ) : (
        /* Era placeholders (era-19-21, era-21-23, era-23-26) */
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: '60px 20px',
            gap: 16,
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 20,
              background: 'linear-gradient(135deg, rgba(93,228,255,0.12), rgba(139,92,246,0.12))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 32,
            }}
          >
            📖
          </div>
          <h3
            style={{
              margin: 0,
              fontSize: 20,
              fontWeight: 800,
              color: '#fff',
              letterSpacing: '-0.02em',
            }}
          >
            {vozhatifikatorTab === 'era-19-21'
              ? 'Вожатификатор 2019–2021'
              : vozhatifikatorTab === 'era-21-23'
                ? 'Вожатификатор 2021–2023'
                : 'Вожатификатор 2023–2026'}
          </h3>
          <p
            style={{
              margin: 0,
              fontSize: 14,
              color: 'rgba(255,255,255,0.5)',
              lineHeight: 1.6,
              maxWidth: 400,
            }}
          >
            Эта эпоха Вожатификатора ещё готовится к публикации. Следите за обновлениями — скоро
            здесь появятся новые главы, задания и истории.
          </p>
          <span
            style={{
              padding: '6px 16px',
              borderRadius: 20,
              background: 'rgba(93,228,255,0.08)',
              border: '1px solid rgba(93,228,255,0.2)',
              color: '#5de4ff',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            Скоро
          </span>
        </div>
      )}
    </div>
  );
};
