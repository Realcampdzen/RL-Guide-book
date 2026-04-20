import type React from 'react';
import { useEffect, useRef } from 'react';
import { aboutCampSession } from '../data/aboutCampSession';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { useTiltCard } from '../hooks/useTiltCard';
import '../styles/about-camp.css';

interface AboutCampViewProps {
  onBack: () => void;
  categories: any[];
  /** Год из MASTER_INDEX.lastUpdated (например "2026") для текстов "смен 2026", "2026" */
  contentYear?: string;
  onOpenCategory: (category: any) => void;
  onOpenCategories: () => void;
  onTelegramContact: () => void;
  onChatToggle: () => void;
  isChatOpen: boolean;
  onChatClose: () => void;
}

const AboutCampView: React.FC<AboutCampViewProps> = ({
  onBack,
  categories,
  contentYear = '2026',
  onOpenCategory,

  onTelegramContact,
  onChatToggle,
  isChatOpen,
  onChatClose: _onChatClose,
}) => {
  const { initReveal } = useScrollReveal();


  // Refs for tilt cards
  const card1Ref = useRef<HTMLDivElement | null>(null);
  const card2Ref = useRef<HTMLDivElement | null>(null);
  const card3Ref = useRef<HTMLDivElement | null>(null);

  // New intro card refs
  const introCard1Ref = useRef<HTMLDivElement | null>(null);
  const introCard2Ref = useRef<HTMLDivElement | null>(null);

  useTiltCard(card1Ref);
  useTiltCard(card2Ref);
  useTiltCard(card3Ref);
  useTiltCard(introCard1Ref);
  useTiltCard(introCard2Ref);

  useEffect(() => {
    const timer = setTimeout(() => {
      initReveal('.reveal-on-scroll');
    }, 100);
    return () => clearTimeout(timer);
  }, [initReveal]);

  const handleChatToggle = () => {
    onChatToggle();
  };

  const handleCategoryLink = (id: string) => {
    const category = categories.find((c: any) => c.id === id);
    if (category) {
      onOpenCategory(category);
    }
  };

  const skillLinks = [
    { label: 'Лидерство', categoryId: '9' },
    { label: 'Креативность', categoryId: '7' },
    { label: 'Коммуникация', categoryId: '13' },
    { label: 'Работа с ИИ', categoryId: '12' },
    { label: 'Команда', categoryId: '8' },
    { label: 'Коллаборация', categoryId: '5' },
    { label: 'Критическое мышление', categoryId: '11' },
  ];

  const baseUrl = import.meta.env.BASE_URL;

  // Full list of posts. imgPath: '' = public root, 'pictures/' = default
  const posts = [
    {
      id: '9100',
      title: '🔥 Вожатские кейсы и педагогика',
      subtitle: 'Разбор сложных ситуаций: от ночных посиделок до буллинга',
      img: 'Wr8s1lqBl95mo9__Pw4CSouLulbnCQRdCt31tWGcKWGlLmXRD60QviGdQG1ASrS3KkfW4t6wFumMhG4myCTZEaKT.jpg',
      imgPath: '' as const,
      tags: ['💡 Практические навыки', '🎭 Ролевые игры', '🚀 Значок "Реальный Фасилитатор"'],
    },
    {
      id: '9080',
      title: '🚀 Дети сами организуют отрядные дела!',
      subtitle: 'Игра "Бросвящение": от кинематографа до оригами',
      img: 'HvRgNN4EUqGaVKKmQYwOnSESzm3zhN8NLN7psGe2xTbuscFg5h0oIIxbtlYIkCIO1zj2TUQYoFAKy9pYquEpfGrR.jpg',
      imgPath: 'pictures/' as const,
      tags: ['🎬 Игра по станциям', '🎨 Мастер-классы', '🔥 Лидерство'],
    },
    {
      id: '9072',
      title: '🎨 Нейродизайн и агентные системы',
      subtitle: 'От идеи до реального значка: Genspark, FLUX, ChatGPT',
      img: 'wa1Ma_l5j4S2gV8sBeNLTw0cftt3WLplAEvXI9RW-qd5-uWJCslMqRRXGcFhKFEIr0Ck2teKZBiFzyRIeMfWLiLE.jpg',
      imgPath: '' as const,
      tags: ['🤖 Итерационный подход', '🎯 Реальные продукты', '🧠 Метапромтинг'],
    },
    {
      id: '9049',
      title: '🏴‍☠️ Пираты похитили Бурыча!',
      subtitle: 'Форт Боярд в лагере: эстафеты, головоломки, спасение',
      img: '2025-09-11_05-28-13.png',
      imgPath: 'pictures/' as const,
      tags: ['⚔️ Командные испытания', '🧩 Головоломки', '🎯 Форт Боярд'],
    },
    {
      id: '9009',
      title: '🎶 Музыкальный продюсер с Suno AI',
      subtitle: 'От текста до готового трека: творчество без границ',
      img: '4pCDWvEw_uyf3q8yQbhfsPpfDSVOMYkkexIZCudbxTsmqN8iA3jIT8TwpNtXbGliD_YCpD2nZhQZXajz4-0KFg-1.jpg',
      imgPath: 'pictures/' as const,
      tags: ['🎹 Создание треков', '🎤 Запись голоса', '🎵 Значок "AI-Композитор"'],
    },
    {
      id: '9006',
      title: '🥊 Мастер-класс по самообороне',
      subtitle: 'С Тимофеем: ценные уроки и невероятная атмосфера',
      img: 'w38A7umTNl1ECHO8HtrN9KRFmpwNLoCd19DGmO1qdPcLBENPbYsFQuzJOoDej_zxEcHDnRvDGUayZgs1mOMSkam3.jpg',
      imgPath: '' as const,
      tags: ['🥊 Самооборона', '🌟 Мастерство', '🙌 Ценные уроки'],
    },
    {
      id: '8995',
      title: '🕯️ Огонёк откровений',
      subtitle: 'Безопасное пространство для открытого общения',
      img: '2025-09-11_05-25-15.png',
      imgPath: 'pictures/' as const,
      tags: ['🫂 Принятие', '🎯 Доверие', '🏡 Семейные отношения'],
    },
    {
      id: '8994',
      title: '🚀 EggX: лётно-конструкторские испытания',
      subtitle: 'Инженерный челлендж: яйцелёты с высоты 3 метров',
      img: 'vKjyH96aNgNYbg14n545f0j1tZqG12tBI3L83kyz-8ofHa9DnmG-p41grb0hrbwUoNGteh0fdssSerJNH2GXffZN.jpg',
      imgPath: '' as const,
      tags: ['🧪 Конструкторские бюро', '🔬 Техническая смекалка', '👨‍🚀 Командная работа'],
    },
    {
      id: '8927',
      title: '😎 Сигма-Бро в Реальном Лагере',
      subtitle: 'Лето, Soft Skills, нейросети и добро круглый год',
      img: '2025-09-11_05-21-21.png',
      imgPath: 'pictures/' as const,
      tags: ['☀️ Родительский час', '💜 Атмосфера', '🌟 Воспоминания'],
    },
  ];

  return (
    <div className="about-camp-container">
      <div className="noise-overlay"></div>

      {/* GlobalCursor renders the custom cursor layer once at app root */}

      <header
        className={`mobile-glass-header${isChatOpen ? ' is-chat-open' : ''}`}
        aria-label="Навигация"
      >
        <button
          type="button"
          className={`mobile-header-logo${isChatOpen ? ' is-active' : ''}`}
          onClick={handleChatToggle}
          aria-label={isChatOpen ? 'Закрыть чат' : 'Открыть чат'}
          aria-pressed={isChatOpen}
        >
          NEUROVALUSHA
        </button>

        <div className="mobile-header-actions">
          <button
            type="button"
            className={`mobile-header-avatar${isChatOpen ? ' is-active' : ''}`}
            onClick={handleChatToggle}
            aria-label={isChatOpen ? 'Закрыть чат' : 'Открыть чат'}
            aria-pressed={isChatOpen}
          >
            <img src={`${baseUrl}valusha.jpg`} alt="НейроВалюша" />
          </button>
        </div>
      </header>


      {/* Sticky Header Nav */}
      <div
        className="sticky-nav"
        style={{ top: '1.5rem', left: '2rem', right: 'auto', alignItems: 'flex-start' }}
      >
        <button onClick={onBack} className="nav-link-back hover-target">
          <span>← Назад к главной</span>
        </button>
      </div>

      {/* Top Right Label */}
      <div className="sticky-nav">
        <span className="nav-link nav-active" style={{ pointerEvents: 'none' }}>
          О ЛАГЕРЕ
        </span>
      </div>

      <main style={{ padding: '120px 5vw 15vh', maxWidth: '1600px', margin: '0 auto' }}>
        {/* 1. Hero Section */}
        <section className="hero-wrapper reveal-on-scroll" style={{ marginBottom: '8rem' }}>
          <h1 className="hero-big-title hover-target">
            Реальный
            <br />
            <span className="outline">Лагерь</span>
            <span className="hero-tagline">— развиваем навыки будущего!</span>
          </h1>

          {/* NEW BENTO INTRO GRID */}
          <div className="intro-grid">
            {/* Left Card: Skills */}
            <div className="intro-card tilt-card hover-target" ref={introCard1Ref}>
              <h3
                className="intro-title"
                style={{ fontSize: '1.8rem', lineHeight: '1.3', marginBottom: '2rem' }}
              >
                За смену ребята получают опыт, который будет полезен далеко за пределами лагеря и
                школы:
              </h3>
              <div className="skills-cloud">
                {skillLinks.map((skill) => (
                  <button
                    key={skill.label}
                    type="button"
                    className="skill-chip"
                    onClick={() => handleCategoryLink(skill.categoryId)}
                  >
                    {skill.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Right Card: Intensity */}
            <div className="intro-card tilt-card hover-target" ref={introCard2Ref}>
              <div>
                <span className="big-stat-number">7</span>
                <h3
                  className="intro-title"
                  style={{ display: 'inline-block', marginBottom: '0.5rem' }}
                >
                  событий в день
                </h3>
              </div>
              <div style={{ clear: 'both' }}></div>
              <p className="intro-text-p" style={{ marginTop: '1rem' }}>
                От создания музыки с нейросетями до организации собственных мероприятий и душевных
                вечеров с песнями под гитару и скрипку.
              </p>
              <p
                className="intro-text-p"
                style={{ marginTop: '1rem', color: '#FFD700', fontWeight: 600 }}
              >
                Ваш ребёнок вернётся домой с новым взглядом на себя и мир.
              </p>
            </div>
          </div>
        </section>

        {/* 2. What We Develop (Benefits Grid) */}
        <section className="reveal-on-scroll" style={{ marginBottom: '10rem' }}>
          <h2 className="section-headline hover-target">
            🎯 Программы <span className="outline">смен {contentYear}</span>
          </h2>{' '}
          <div className="features-grid">
            {/* Card 1: 4K */}
            <div
              ref={card1Ref}
              className="glass-card tilt-card hover-target"
              onClick={() => handleCategoryLink('13')}
              style={{
                cursor: 'pointer',
                backgroundImage: `linear-gradient(to bottom, rgba(15, 10, 31, 0.4), rgba(15, 10, 31, 0.9)), url("${baseUrl}skills_4k.png")`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                minHeight: '450px',
                justifyContent: 'flex-end',
              }}
            >
              <h3 className="card-title">🧩 Навыки 4K</h3>
              <p className="card-text">
                🎨 Креативность
                <br />💬 Коммуникация
                <br />🤝 Коллаборация
                <br />🧠 Критическое мышление
              </p>
            </div>

            {/* Card 2: AI */}
            <div
              ref={card2Ref}
              className="glass-card tilt-card hover-target"
              onClick={() => handleCategoryLink('12')}
              style={{
                cursor: 'pointer',
                backgroundImage: `linear-gradient(to bottom, rgba(15, 10, 31, 0.4), rgba(15, 10, 31, 0.9)), url("${baseUrl}ai_camp.png")`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                minHeight: '450px',
                justifyContent: 'flex-end',
              }}
            >
              <h3 className="card-title">✨ Нейролагерь</h3>
              <p className="card-text">
                Изучаем нейросети как инструмент для обучения, творчества, проектной деятельности,
                создания стратегий.
              </p>
            </div>

            {/* Card 3: Leadership */}
            <div
              ref={card3Ref}
              className="glass-card tilt-card hover-target"
              onClick={() => handleCategoryLink('9')}
              style={{
                cursor: 'pointer',
                backgroundImage: `linear-gradient(to bottom, rgba(15, 10, 31, 0.4), rgba(15, 10, 31, 0.9)), url("${baseUrl}co_management.png")`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                minHeight: '450px',
                justifyContent: 'flex-end',
              }}
            >
              <h3 className="card-title">🔥 Соуправление</h3>
              <p className="card-text">
                Организация мероприятий, помощь другим, ответственность — качества настоящего
                лидера.
              </p>
            </div>
          </div>
        </section>

        {/* 3. Posts Gallery */}
        <section className="reveal-on-scroll" style={{ marginBottom: '10rem' }}>
          <h2 className="section-headline hover-target">
            📸 Как это выглядит на <span className="outline">практике</span>
          </h2>
          <div className="posts-layout">
            {posts.map((post, idx) => (
              <a
                key={post.id}
                href={`https://vk.com/wall-57701087_${post.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="post-item hover-target"
                style={{ transitionDelay: `${idx * 0.05}s` }}
              >
                <div className="post-img-box">
                  <img
                    src={`${baseUrl}${post.imgPath || 'pictures/'}${post.img}`}
                    alt={post.title}
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <div className="post-content-box">
                  <h4 className="post-header">{post.title}</h4>
                  <p className="card-text" style={{ fontSize: '0.95rem' }}>
                    {post.subtitle}
                  </p>
                  <div className="post-tags-row">
                    {post.tags.map((tag, i) => (
                      <span key={i} className="tag-pill">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </a>
            ))}
          </div>
        </section>

        {/* 4. Reviews */}
        <section className="reveal-on-scroll" style={{ marginBottom: '10rem' }}>
          <div
            className="glass-card hover-target"
            style={{
              padding: '5rem',
              background: 'linear-gradient(135deg, rgba(139, 0, 255, 0.05), rgba(15, 10, 31, 0.6))',
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '4rem',
            }}
          >
            <div style={{ flex: '1 1 400px' }}>
              <h2
                className="section-headline"
                style={{ marginBottom: '1.5rem', fontSize: '2.5rem' }}
              >
                💬 Отзывы <span className="outline">родителей</span>
              </h2>
              <p className="card-text" style={{ fontSize: '1.3rem' }}>
                Узнайте, что говорят мамы и папы о переменах, которые они замечают в детях после
                смены. Реальные истории и эмоции в нашей группе ВКонтакте — присоединяйтесь к
                обсуждению!
              </p>
            </div>
            <a
              href="https://vk.com/realcampspb?from=groups&ref=group_menu&w=app6326142_-57701087"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-agency hover-target"
              style={{ padding: '1.8rem 4rem', fontSize: '1.1rem' }}
            >
              <span>Читать отзывы</span>
            </a>
          </div>
        </section>

        {/* 5. Links */}
        <section className="reveal-on-scroll" style={{ marginBottom: '10rem' }}>
          <h2 className="section-headline hover-target">
            🔗 Полезные <span className="outline">ссылки</span>
          </h2>
          <div className="links-grid">
            {[
              { text: '🌐 Официальный сайт: realcampspb.ru', url: 'https://realcampspb.ru' },
              { text: '📱 ВКонтакте: блог лагеря', url: 'https://vk.com/realcampspb' },
              { text: '📝 Наш блог в Яндекс.Дзен', url: 'https://zen.yandex.ru/realcamp' },
              { text: '🏛️ Сертификаты: coo-molod.ru', url: 'https://www.coo-molod.ru/' },
            ].map((link) => (
              <a
                key={link.url}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="link-box hover-target"
              >
                {link.text}
              </a>
            ))}
          </div>
        </section>

        {/* 6. Session Info (Bottom) */}
        <section className="reveal-on-scroll" style={{ paddingBottom: '10vh' }}>
          <div className="session-card-glow hover-target" onClick={onTelegramContact}>
            <h2
              className="section-headline hover-target"
              style={{ textAlign: 'center', marginBottom: '1rem' }}
            >
              {aboutCampSession.sessionTitle.split(' ')[0]}{' '}
              <span className="outline">{aboutCampSession.sessionTitle.split(' ')[1] || ''}</span>
            </h2>
            <h2 className="session-headline" style={{ marginBottom: '2rem' }}>
              <span className="outline">{contentYear}</span>
            </h2>
            <div style={{ marginBottom: '3rem' }}>
              <span
                className="tag-pill"
                style={{
                  fontSize: '1.2rem',
                  padding: '0.8rem 2rem',
                  background: 'rgba(139, 0, 255, 0.2)',
                }}
              >
                {aboutCampSession.dates}
              </span>
            </div>

            {aboutCampSession.message && (
              <p
                className="card-text"
                style={{
                  fontSize: '1.2rem',
                  textAlign: 'center',
                  marginBottom: '2rem',
                  maxWidth: '600px',
                  margin: '0 auto 2rem auto',
                  color: 'rgba(255,255,255,0.85)',
                }}
              >
                {aboutCampSession.message}
              </p>
            )}

            {aboutCampSession.prices.length > 0 && (
              <div
                className="price-block"
                style={{
                  display: 'inline-block',
                  textAlign: 'left',
                  minWidth: '350px',
                  padding: '2.5rem',
                }}
              >
                {aboutCampSession.prices.map((price, idx) => (
                  <p
                    key={idx}
                    style={{
                      marginBottom: idx < aboutCampSession.prices.length - 1 ? '1rem' : 0,
                      fontSize: '1.3rem',
                      color: 'var(--c-stark)',
                    }}
                  >
                    ✅{' '}
                    <strong style={idx === 0 ? { color: '#FFD700' } : undefined}>
                      {price.amount}
                    </strong>{' '}
                    — {price.label}
                    {price.note && (
                      <>
                        <br />
                        <span style={{ fontSize: '1rem', color: 'rgba(244, 239, 228, 0.7)' }}>
                          {price.note}
                        </span>
                      </>
                    )}
                  </p>
                ))}
              </div>
            )}

            <div style={{ marginTop: '3.5rem' }}>
              <button
                className="btn-agency hover-target"
                onClick={onTelegramContact}
                style={{ transform: 'scale(1.2)' }}
              >
                <span>{aboutCampSession.buttonText || 'Записаться через Telegram'}</span>
              </button>
            </div>
          </div>
        </section>

        {/* Final Footer Links */}
        <div style={{ marginTop: '2rem', paddingBottom: '3rem' }}>
          <div
            className="footer-links"
            style={{ justifyContent: 'center', marginTop: 0, padding: '1rem' }}
          >
            <button className="hover-target" onClick={onBack}>
              Значки
            </button>
            <button
              className="hover-target"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              О лагере
            </button>
            <a
              href="https://vk.com/realcampspb"
              className="hover-target"
              target="_blank"
              rel="noopener noreferrer"
            >
              ВКонтакте
            </a>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AboutCampView;

