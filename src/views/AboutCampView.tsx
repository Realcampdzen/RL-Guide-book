import React, { Suspense, useEffect, useRef, useState } from 'react';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { useTiltCard } from '../hooks/useTiltCard';
import { useCustomCursor } from '../hooks/useCustomCursor';
import '../styles/about-camp.css';

const loadChatBot = () => import('../components/ChatBot');
const ChatBot = React.lazy(loadChatBot);

interface AboutCampViewProps {
  onBack: () => void;
  categories: any[];
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
  onOpenCategory,
  onOpenCategories,
  onTelegramContact,
  onChatToggle,
  isChatOpen,
  onChatClose
}) => {
  const { initReveal } = useScrollReveal();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // Custom Cursor
  const { cursorDotRef, cursorOutlineRef, cursorReactorRef } = useCustomCursor();

  // Refs for tilt cards
  const card1Ref = useRef<HTMLDivElement>(null);
  const card2Ref = useRef<HTMLDivElement>(null);
  const card3Ref = useRef<HTMLDivElement>(null);
  
  // New intro card refs
  const introCard1Ref = useRef<HTMLDivElement>(null);
  const introCard2Ref = useRef<HTMLDivElement>(null);

  useTiltCard(card1Ref);
  useTiltCard(card2Ref);
  useTiltCard(card3Ref);
  useTiltCard(introCard1Ref);
  useTiltCard(introCard2Ref);

  useEffect(() => {
    const timer = setTimeout(() => {
      initReveal('.reveal-on-scroll');
    }, 100);
    window.scrollTo(0, 0);
    return () => clearTimeout(timer);
  }, [initReveal]);

  useEffect(() => {
    if (!isMenuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isMenuOpen]);

  const handleMenuToggle = () => {
    setIsMenuOpen((prev) => !prev);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  const handleChatToggle = () => {
    setIsMenuOpen(false);
    onChatToggle();
  };

  const handleMenuAction = (action: () => void) => {
    setIsMenuOpen(false);
    action();
  };

  const handleCategoryLink = (id: string) => {
    const category = categories.find((c: any) => c.id === id);
    if (category) {
      onOpenCategory(category);
    }
  };

  const baseUrl = import.meta.env.BASE_URL;

  // Full list of posts
  const posts = [
    { 
      id: '9100', 
      title: '🔥 Вожатские кейсы и педагогика', 
      subtitle: 'Разбор сложных ситуаций: от ночных посиделок до буллинга', 
      img: 'Wr8s1lqBl95mo9__Pw4CSouLulbnCQRdCt31tWGcKWGlLmXRD60QviGdQG1ASrS3KkfW4t6wFumMhG4myCTZEaKT.jpg',
      tags: ['💡 Практические навыки', '🎭 Ролевые игры', '🚀 Значок "Реальный Фасилитатор"']
    },
    { 
      id: '9080', 
      title: '🚀 Дети сами организуют отрядные дела!', 
      subtitle: 'Игра "Бросвящение": от кинематографа до оригами', 
      img: 'HvRgNN4EUqGaVKKmQYwOnSESzm3zhN8NLN7psGe2xTbuscFg5h0oIIxbtlYIkCIO1zj2TUQYoFAKy9pYquEpfGrR.jpg',
      tags: ['🎬 Игра по станциям', '🎨 Мастер-классы', '🔥 Лидерство']
    },
    { 
      id: '9072', 
      title: '🎨 Нейродизайн и агентные системы', 
      subtitle: 'От идеи до реального значка: Genspark, FLUX, ChatGPT', 
      img: 'wa1Ma_l5j4S2gV8sBeNLTw0cftt3WLplAEvXI9RW-qd5-uWJCslMqRRXGcFhKFEIr0Ck2teKZBiFzyRIeMfWLiLE.jpg',
      tags: ['🤖 Итерационный подход', '🎯 Реальные продукты', '🧠 Метапромтинг']
    },
    { 
      id: '9049', 
      title: '🏴‍☠️ Пираты похитили Бурыча!', 
      subtitle: 'Форт Боярд в лагере: эстафеты, головоломки, спасение', 
      img: '2025-09-11_05-28-13.png',
      tags: ['⚔️ Командные испытания', '🧩 Головоломки', '🎯 Форт Боярд']
    },
    { 
      id: '9009', 
      title: '🎶 Музыкальный продюсер с Suno AI', 
      subtitle: 'От текста до готового трека: творчество без границ', 
      img: '4pCDWvEw_uyf3q8yQbhfsPpfDSVOMYkkexIZCudbxTsmqN8iA3jIT8TwpNtXbGliD_YCpD2nZhQZXajz4-0KFg-1.jpg',
      tags: ['🎹 Создание треков', '🎤 Запись голоса', '🎵 Значок "AI-Композитор"']
    },
    { 
      id: '9006', 
      title: '🥊 Мастер-класс по самообороне', 
      subtitle: 'С Тимофеем: ценные уроки и невероятная атмосфера', 
      img: 'w38A7umTNl1ECHO8HtrN9KRFmpwNLoCd19DGmO1qdPcLBENPbYsFQuzJOoDej_zxEcHDnRvDGUayZgs1mOMSkam3.jpg',
      tags: ['🥊 Самооборона', '🌟 Мастерство', '🙌 Ценные уроки']
    },
    { 
      id: '8995', 
      title: '🕯️ Огонёк откровений', 
      subtitle: 'Безопасное пространство для открытого общения', 
      img: '2025-09-11_05-25-15.png',
      tags: ['🫂 Принятие', '🎯 Доверие', '🏡 Семейные отношения']
    },
    { 
      id: '8994', 
      title: '🚀 EggX: лётно-конструкторские испытания', 
      subtitle: 'Инженерный челлендж: яйцелёты с высоты 3 метров', 
      img: 'vKjyH96aNgNYbg14n545f0j1tZqG12tBI3L83kyz-8ofHa9DnmG-p41grb0hrbwUoNGteh0fdssSerJNH2GXffZN.jpg',
      tags: ['🧪 Конструкторские бюро', '🔬 Техническая смекалка', '👨‍🚀 Командная работа']
    },
    { 
      id: '8927', 
      title: '😎 Сигма-Бро в Реальном Лагере', 
      subtitle: 'Лето, Soft Skills, нейросети и добро круглый год', 
      img: '2025-09-11_05-21-21.png',
      tags: ['☀️ Родительский час', '💜 Атмосфера', '🌟 Воспоминания']
    }
  ];

  return (
    <div className="about-camp-container">
       <style dangerouslySetInnerHTML={{ __html: `@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Syne:wght@400;500;600;700;800&display=swap');` }} />
       
       <div className="noise-overlay"></div>

       {/* Custom Cursor Elements */}
       <div className="cursor-reactor" ref={cursorReactorRef} data-cursor-reactor></div>
       <div className="cursor-dot" ref={cursorDotRef} data-cursor></div>
       <div className="cursor-outline" ref={cursorOutlineRef} data-cursor-outline></div>

       <header className={`mobile-glass-header${isChatOpen ? ' is-chat-open' : ''}`} aria-label="Навигация">
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
             className={`mobile-header-btn mobile-header-menu${isMenuOpen ? ' is-active' : ''}`}
             onClick={handleMenuToggle}
             aria-label="Меню"
             aria-expanded={isMenuOpen}
             aria-controls="about-camp-mobile-menu-panel"
           >
             <span className="menu-line"></span>
             <span className="menu-line"></span>
             <span className="menu-line"></span>
           </button>
           <button
             type="button"
             className={`mobile-header-avatar${isChatOpen ? ' is-active' : ''}`}
             onClick={handleChatToggle}
             aria-label={isChatOpen ? 'Закрыть чат' : 'Открыть чат'}
             aria-pressed={isChatOpen}
           >
             <img src="/RL-Guide-book/Валюша.jpg" alt="НейроВалюша" />
           </button>
         </div>
       </header>

       <div
         className={`mobile-menu-scrim${isMenuOpen ? ' is-open' : ''}`}
         onClick={closeMenu}
         aria-hidden="true"
       ></div>
       <div
         id="about-camp-mobile-menu-panel"
         className={`mobile-menu-panel${isMenuOpen ? ' is-open' : ''}`}
         role="dialog"
         aria-modal="true"
         aria-label="Меню"
         aria-hidden={!isMenuOpen}
       >
         <div className="mobile-menu-head">
           <span className="mobile-menu-title">Меню</span>
           <button type="button" className="mobile-menu-close" onClick={closeMenu} aria-label="Закрыть меню">
             X
           </button>
         </div>
         <div className="mobile-menu-list">
           <button type="button" className="mobile-menu-item" onClick={() => handleMenuAction(onBack)}>
             <span className="mobile-menu-item-label">Главная</span>
             <span className="mobile-menu-item-icon">&gt;</span>
           </button>
           <button type="button" className="mobile-menu-item" onClick={() => handleMenuAction(onOpenCategories)}>
             <span className="mobile-menu-item-label">Категории</span>
             <span className="mobile-menu-item-icon">&gt;</span>
           </button>
           <button
             type="button"
             className="mobile-menu-item is-active"
             aria-current="page"
             onClick={() => handleMenuAction(() => window.scrollTo({ top: 0, behavior: 'smooth' }))}
           >
             <span className="mobile-menu-item-label">О лагере</span>
             <span className="mobile-menu-item-icon">*</span>
           </button>
           <button type="button" className="mobile-menu-item mobile-menu-item-cta" onClick={() => handleMenuAction(onTelegramContact)}>
             <span className="mobile-menu-item-label">Записаться через Telegram</span>
             <span className="mobile-menu-item-icon">&gt;</span>
           </button>
         </div>
       </div>
       
       {/* Sticky Header Nav */}
       <div className="sticky-nav" style={{ top: '1.5rem', left: '2rem', right: 'auto', alignItems: 'flex-start' }}>
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
             Реальный<br/>
             <span className="outline">Лагерь</span>
             <span className="hero-tagline">
               — развиваем навыки будущего!
             </span>
           </h1>
           
           {/* NEW BENTO INTRO GRID */}
           <div className="intro-grid">
             
             {/* Left Card: Skills */}
             <div className="intro-card tilt-card hover-target" ref={introCard1Ref}>
               <h3 className="intro-title" style={{ fontSize: '1.8rem', lineHeight: '1.3', marginBottom: '2rem' }}>
                 За смену ребята получают опыт, который будет полезен далеко за пределами лагеря и школы:
               </h3>
               <div className="skills-cloud">
                 {['Лидерство', 'Креативность', 'Коммуникация', 'Работа с ИИ', 'Команда'].map(skill => (
                   <span key={skill} className="skill-chip">{skill}</span>
                 ))}
               </div>
             </div>

             {/* Right Card: Intensity */}
             <div className="intro-card tilt-card hover-target" ref={introCard2Ref}>
               <div>
                 <span className="big-stat-number">7</span>
                 <h3 className="intro-title" style={{ display: 'inline-block', marginBottom: '0.5rem' }}>событий в день</h3>
               </div>
               <div style={{ clear: 'both' }}></div>
               <p className="intro-text-p" style={{ marginTop: '1rem' }}>
                 От создания музыки с нейросетями до организации собственных мероприятий и душевных вечеров с песнями под гитару и скрипку.
               </p>
               <p className="intro-text-p" style={{ marginTop: '1rem', color: '#FFD700', fontWeight: 600 }}>
                 Ваш ребёнок вернётся домой с новым взглядом на себя и мир.
               </p>
             </div>

           </div>
         </section>

         {/* 2. What We Develop (Benefits Grid) */}
         <section className="reveal-on-scroll" style={{ marginBottom: '10rem' }}>
                       <h2 className="section-headline hover-target">
                         🎯 Программы <span className="outline">смен 2026</span>
                       </h2>            <div className="features-grid">
              
              {/* Card 1: 4K */}
              <div 
                ref={card1Ref}
                className="glass-card tilt-card hover-target" 
                onClick={() => handleCategoryLink("13")}
                style={{ 
                  cursor: 'pointer', 
                  backgroundImage: `linear-gradient(to bottom, rgba(15, 10, 31, 0.4), rgba(15, 10, 31, 0.9)), url("${baseUrl}skills_4k.png")`, 
                  backgroundSize: 'cover', 
                  backgroundPosition: 'center', 
                  minHeight: '450px',
                  justifyContent: 'flex-end'
                }}
              >
                 <h3 className="card-title">🧩 Навыки 4K</h3>
                 <p className="card-text">
                   🎨 Креативность<br/>
                   💬 Коммуникация<br/>
                   🤝 Коллаборация<br/>
                   🧠 Критическое мышление
                 </p>
              </div>

              {/* Card 2: AI */}
              <div 
                ref={card2Ref}
                className="glass-card tilt-card hover-target" 
                onClick={() => handleCategoryLink("12")}
                style={{ 
                  cursor: 'pointer', 
                  backgroundImage: `linear-gradient(to bottom, rgba(15, 10, 31, 0.4), rgba(15, 10, 31, 0.9)), url("${baseUrl}ai_camp.png")`, 
                  backgroundSize: 'cover', 
                  backgroundPosition: 'center', 
                  minHeight: '450px',
                  justifyContent: 'flex-end'
                }}
              >
                 <h3 className="card-title">✨ Нейролагерь</h3>
                 <p className="card-text">
                   Изучаем нейросети как инструмент для обучения, творчества, проектной деятельности, создания стратегий.
                 </p>
              </div>

              {/* Card 3: Leadership */}
              <div 
                ref={card3Ref}
                className="glass-card tilt-card hover-target" 
                onClick={() => handleCategoryLink("9")}
                style={{ 
                  cursor: 'pointer', 
                  backgroundImage: `linear-gradient(to bottom, rgba(15, 10, 31, 0.4), rgba(15, 10, 31, 0.9)), url("${baseUrl}co_management.png")`, 
                  backgroundSize: 'cover', 
                  backgroundPosition: 'center', 
                  minHeight: '450px',
                  justifyContent: 'flex-end'
                }}
              >
                 <h3 className="card-title">🔥 Соуправление</h3>
                 <p className="card-text">
                   Организация мероприятий, помощь другим, ответственность — качества настоящего лидера.
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
                        src={`${baseUrl}pictures/${post.img}`} 
                        alt={post.title} 
                      />
                    </div>
                    <div className="post-content-box">
                      <h4 className="post-header">{post.title}</h4>
                      <p className="card-text" style={{ fontSize: '0.95rem' }}>{post.subtitle}</p>
                      <div className="post-tags-row">
                        {post.tags.map((tag, i) => (
                          <span key={i} className="tag-pill">{tag}</span>
                        ))}
                      </div>
                    </div>
                 </a>
               ))}
            </div>
         </section>

         {/* 4. Reviews */}
         <section className="reveal-on-scroll" style={{ marginBottom: '10rem' }}>
            <div className="glass-card hover-target" style={{ 
              padding: '5rem', 
              background: 'linear-gradient(135deg, rgba(139, 0, 255, 0.05), rgba(15, 10, 31, 0.6))',
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '4rem'
            }}>
               <div style={{ flex: '1 1 400px' }}>
                 <h2 className="section-headline" style={{ marginBottom: '1.5rem', fontSize: '2.5rem' }}>
                   💬 Отзывы <span className="outline">родителей</span>
                 </h2>
                 <p className="card-text" style={{ fontSize: '1.3rem' }}>
                   Узнайте, что говорят мамы и папы о переменах, которые они замечают в детях после смены. Реальные истории и эмоции в нашей группе ВКонтакте.
                 </p>
               </div>
               <a href="https://vk.com/realcampspb?from=groups&ref=group_menu&w=app6326142_-57701087" target="_blank" rel="noopener noreferrer" className="btn-agency hover-target" style={{ padding: '1.8rem 4rem', fontSize: '1.1rem' }}>
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
               { text: '🏛️ Сертификаты: coo-molod.ru', url: 'https://www.coo-molod.ru/' }
             ].map(link => (
               <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer" className="link-box hover-target">
                 {link.text}
               </a>
             ))}
           </div>
         </section>

         {/* 6. Session Info (Bottom) */}
         <section className="reveal-on-scroll" style={{ paddingBottom: '10vh' }}>
           <div 
             className="session-card-glow hover-target" 
             onClick={onTelegramContact}
           >
              <h2 className="section-headline hover-target" style={{ textAlign: 'center', marginBottom: '1rem' }}>
                Весенняя <span className="outline">смена</span>
              </h2>
              <h2 className="session-headline" style={{ marginBottom: '2rem' }}>
                <span className="outline">2026</span>
              </h2>
              <div style={{ marginBottom: '3rem' }}>
                <span className="tag-pill" style={{ fontSize: '1.2rem', padding: '0.8rem 2rem', background: 'rgba(139, 0, 255, 0.2)' }}>
                  с 28 марта по 5 апреля
                </span>
              </div>

              <div className="price-block" style={{ display: 'inline-block', textAlign: 'left', minWidth: '350px', padding: '2.5rem' }}>
                <p style={{ marginBottom: '1rem', fontSize: '1.3rem', color: 'var(--c-stark)' }}>
                  ✅ <strong style={{ color: '#FFD700' }}>25 800</strong> — стоимость путевки с учетом сертификата от г. Санкт-Петербурга на 9 дней<br />
                  <span style={{ fontSize: '1rem', color: 'rgba(244, 239, 228, 0.7)' }}>+ сертификат</span>
                </p>
                <p style={{ fontSize: '1.3rem', color: 'var(--c-stark)' }}>
                  ✅ <strong>36 500,00 руб.</strong> — полная стоимость путевки на 9 дней без использования сертификата
                </p>
              </div>
              
              <div style={{ marginTop: '3.5rem' }}>
                <button className="btn-agency hover-target" onClick={onTelegramContact} style={{ transform: 'scale(1.2)' }}>
                  <span>Записаться через Telegram</span>
                </button>
              </div>
           </div>
         </section>

         {/* Final Footer Links */}
         <div style={{ marginTop: '2rem', paddingBottom: '3rem' }}>
          <div className="footer-links" style={{ justifyContent: 'center', marginTop: 0, padding: '1rem' }}>
            <button className="hover-target" onClick={onBack}>
              Значки
            </button>
            <button className="hover-target" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              О лагере
            </button>
            <a href="https://vk.com/realcampspb" className="hover-target" target="_blank" rel="noopener noreferrer">
              ВКонтакте
            </a>
          </div>
        </div>

       </main>

       <Suspense fallback={null}>
         <ChatBot isOpen={isChatOpen} onClose={onChatClose} currentView="about-camp" />
       </Suspense>
    </div>
  );
};

export default AboutCampView;
