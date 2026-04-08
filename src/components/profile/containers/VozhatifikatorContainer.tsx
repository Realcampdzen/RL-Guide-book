import React, { useState, useEffect, useRef } from 'react';
import { parseMarkdownToc, markdownToHtmlWithHeadingIds } from '../../../utils/markdown';
import { VozhatifikatorChecklist } from '../../../components/VozhatifikatorChecklist';

const VOZHATIFIKATOR_DOCX_FILE = 'Вожатификатор.docx';
const VOZHATIFIKATOR_DOCX_URL = '/' + VOZHATIFIKATOR_DOCX_FILE;

interface VozhatifikatorContainerProps {
  userData: any;
  updateVozhatifikatorChecklist: (opts: any) => Promise<any>;
}

export const VozhatifikatorContainer: React.FC<VozhatifikatorContainerProps> = ({
  userData,
  updateVozhatifikatorChecklist,
}) => {
  const [vozhatifikatorToc, setVozhatifikatorToc] = useState<Array<{ id: string; title: string }>>([]);
  const [vozhatifikatorHtml, setVozhatifikatorHtml] = useState<string | null>(null);
  const [vozhatifikatorLoading, setVozhatifikatorLoading] = useState(false);
  const [vozhatifikatorError, setVozhatifikatorError] = useState<string | null>(null);
  const [vozhatifikatorSubView, setVozhatifikatorSubView] = useState<'book' | 'lights'>('book');
  const [vozhatifikatorEra, setVozhatifikatorEra] = useState<'2013-2019' | '2019-2021' | '2021-2023' | '2023-now'>('2013-2019');
  const vozhatifikatorBookRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (vozhatifikatorSubView !== 'book' || vozhatifikatorHtml !== null) return;
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
    return () => { cancelled = true; };
  }, [vozhatifikatorSubView, vozhatifikatorHtml]);

  return (
    <div className="vozhatifikator-view fade-in">
      <div className="vozhatifikator-tabs">
        <button
          type="button"
          role="tab"
          aria-selected={vozhatifikatorSubView === 'book'}
          aria-controls="vozhatifikator-tabpanel-book"
          className={`vozhatifikator-tab ${vozhatifikatorSubView === 'book' ? 'vozhatifikator-tab--active' : ''}`}
          onClick={() => setVozhatifikatorSubView('book')}
        >
          Книга Вожатого
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={vozhatifikatorSubView === 'lights'}
          aria-controls="vozhatifikator-tabpanel-lights"
          className={`vozhatifikator-tab ${vozhatifikatorSubView === 'lights' ? 'vozhatifikator-tab--active' : ''}`}
          onClick={() => setVozhatifikatorSubView('lights')}
        >
          Путеводные огни
        </button>
      </div>

      {vozhatifikatorSubView === 'book' && (
        <>
          <div className="vozhatifikator-downloads">
            <a
              href={VOZHATIFIKATOR_DOCX_URL}
              download={VOZHATIFIKATOR_DOCX_FILE}
              className="vozhatifikator-download vozhatifikator-download--docx"
              title="Редактируемая версия (Word)"
            >
              Скачать
            </a>
          </div>
          <nav className="vozhatifikator-toc-nav" aria-label="Оглавление книги">
            {vozhatifikatorToc.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="vozhatifikator-toc-item"
                onClick={(e) => {
                  e.preventDefault();
                  vozhatifikatorBookRef.current?.querySelector(`#${CSS.escape(item.id)}`)?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                {item.title}
              </a>
            ))}
          </nav>
          <div className="vozhatifikator-book" ref={vozhatifikatorBookRef} role="tabpanel" id="vozhatifikator-tabpanel-book">
            {vozhatifikatorLoading && <div className="vozhatifikator-book__loading">Загрузка книги...</div>}
            {vozhatifikatorError && <div className="vozhatifikator-book__error">{vozhatifikatorError}</div>}
            {!vozhatifikatorLoading && !vozhatifikatorError && vozhatifikatorHtml && (
              <div className="vozhatifikator-book__content" dangerouslySetInnerHTML={{ __html: vozhatifikatorHtml }} />
            )}
          </div>
        </>
      )}

      {vozhatifikatorSubView === 'lights' && (
        <div style={{ marginTop: '20px' }}>
          <header className="page-header" style={{ marginBottom: 24 }}>
            <h1 style={{ color: 'rgba(255,255,255,0.9)' }}>Путеводные огни</h1>
            <p style={{ opacity: 0.7, maxWidth: 600, fontSize: 13 }}>
              Здесь собраны ключевые принципы, ценности и правила Реального Лагеря. Отмечай то, что уже применяешь в работе.
            </p>
          </header>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
            {['2013-2019', '2019-2021', '2021-2023', '2023-now'].map(era => (
              <button
                key={era} type="button"
                className={`btn-secondary ${vozhatifikatorEra === era ? 'btn-primary-gold' : ''}`}
                style={{ padding: '6px 12px', fontSize: 11 }}
                onClick={() => setVozhatifikatorEra(era as any)}
              >
                {era === '2013-2019' && 'Эра 1: Семья'}
                {era === '2019-2021' && 'Эра 2: Продукт'}
                {era === '2021-2023' && 'Эра 3: Масштаб'}
                {era === '2023-now' && 'Эра 4: Экосистема'}
              </button>
            ))}
          </div>

          <VozhatifikatorChecklist
            era={vozhatifikatorEra}
            completedIds={userData.vozhatifikatorChecklist?.completedIds ?? []}
            onToggle={updateVozhatifikatorChecklist}
          />
        </div>
      )}
    </div>
  );
};
