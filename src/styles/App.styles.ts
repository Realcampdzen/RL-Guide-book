const appStyles = `
        .app {
          position: relative;
          width: 100vw;
          height: 100vh;
          overflow: hidden;
          font-family: 'Arial', sans-serif;
          color: white;
          background: linear-gradient(135deg, #0c0c0c 0%, #1a1a2e 50%, #16213e 100%);
        }

        /* Global scrollbar styling (WebKit) */
        *::-webkit-scrollbar {
          width: 10px;
          height: 10px;
        }
        *::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.06);
          border-radius: 8px;
        }
        *::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, rgba(78,205,196,0.9), rgba(46,134,222,0.9));
          border-radius: 8px;
          border: 2px solid rgba(0, 0, 0, 0.3);
        }
        *::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, rgba(78,205,196,1), rgba(46,134,222,1));
        }

        /* Firefox */
        * {
          scrollbar-width: thin;               /* auto | thin | none */
          scrollbar-color: rgba(78,205,196,0.9) rgba(255,255,255,0.06);
        }

        .loading-screen {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }

        .loading-content {
          text-align: center;
        }

        .loading-spinner {
          width: 50px;
          height: 50px;
          border: 3px solid rgba(255, 255, 255, 0.3);
          border-top: 3px solid #4ecdc4;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 20px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

                 .intro-screen {
           position: absolute;
           top: 0;
           left: 0;
           width: 100%;
           height: 100%;
           display: flex;
           justify-content: center;
           align-items: center;
           background: 
             linear-gradient(135deg, rgba(12, 12, 12, 0.3) 0%, rgba(26, 26, 46, 0.3) 50%, rgba(22, 33, 62, 0.3) 100%),
            url('/RL-Guide-book/\u044d\u043a\u0440\u0430\u043d 1 \u0444\u043e\u043d copy.png') center top / 100% 100% no-repeat;
           backdrop-filter: blur(10px);
         }

        .intro-logo {
          position: absolute;
          top: 20px;
          left: 20px;
          z-index: 10;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          transition: all 0.3s ease;
        }

        .intro-logo img {
          width: 180px;
          height: 180px;
          object-fit: cover;
          object-position: center;
          border-radius: 18px;
          box-shadow: 
            0 6px 20px rgba(0, 0, 0, 0.4),
            0 0 0 2px rgba(255, 215, 0, 1),
            0 0 20px rgba(255, 215, 0, 0.5),
            0 0 40px rgba(255, 215, 0, 0.3),
            inset 0 0 0 1px rgba(255, 255, 0, 0.8),
            inset 0 0 20px rgba(255, 215, 0, 0.4),
            inset 0 0 40px rgba(255, 215, 0, 0.2);
          background: rgba(255, 255, 255, 0.1);
          padding: 0px;
          transition: all 0.3s ease;
        }

        .intro-logo:hover {
          transform: scale(1.02);
        }

        .intro-logo:hover img {
          box-shadow: 
            0 12px 32px rgba(0, 0, 0, 0.5),
            0 0 0 3px rgba(255, 215, 0, 1),
            0 0 30px rgba(255, 215, 0, 0.8),
            0 0 60px rgba(255, 215, 0, 0.6),
            0 0 100px rgba(255, 215, 0, 0.4),
            inset 0 0 0 2px rgba(255, 255, 0, 1),
            inset 0 0 30px rgba(255, 215, 0, 0.6),
            inset 0 0 60px rgba(255, 215, 0, 0.3);
        }

        .logo-hover-text {
          position: absolute;
          bottom: -44px;
          left: 50%;
          transform: translateX(-50%);
          color: #fff7c2;
          font-size: 14px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.18rem;
          text-shadow:
            0 0 10px rgba(255, 215, 0, 0.8),
            0 0 22px rgba(255, 195, 110, 0.6),
            0 0 34px rgba(255, 255, 180, 0.45);
          opacity: 0;
          transition: all 0.35s ease;
          white-space: nowrap;
          filter: drop-shadow(0 0 18px rgba(255, 215, 0, 0.55));
          animation: logoTaglinePulse 3.6s ease-in-out infinite;
          z-index: 12;
        }

        @keyframes logoTaglinePulse {
          0%, 100% {
            text-shadow:
              0 0 12px rgba(255, 215, 0, 0.75),
              0 0 24px rgba(255, 190, 80, 0.55),
              0 0 40px rgba(255, 248, 170, 0.35);
            filter: drop-shadow(0 0 18px rgba(255, 215, 0, 0.45));
          }
          45% {
            text-shadow:
              0 0 18px rgba(255, 215, 0, 0.95),
              0 0 34px rgba(255, 196, 104, 0.75),
              0 0 52px rgba(255, 248, 190, 0.42);
            filter: drop-shadow(0 0 24px rgba(255, 215, 0, 0.6));
          }
        }

        .intro-logo:hover .logo-hover-text {
          opacity: 1;
          transform: translateX(-50%) translateY(-5px);
        }

        .about-camp-screen {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: 
            linear-gradient(135deg, rgba(12, 12, 12, 0.3) 0%, rgba(26, 26, 46, 0.3) 50%, rgba(22, 33, 62, 0.3) 100%),
            url('/RL-Guide-book/\u044d\u043a\u0440\u0430\u043d 1 \u0444\u043e\u043d copy.png') center top / 100% 100% no-repeat;
          backdrop-filter: blur(10px);
          overflow-y: auto;
        }

        .about-camp-content {
          max-width: 1000px;
          margin: 0 auto;
          padding: 2rem;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 20px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
          backdrop-filter: blur(4px);
        }

        .camp-description h2 {
          color: #FFD700;
          font-size: 1.8rem;
          margin-bottom: 1rem;
          text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
        }

        .camp-description h3 {
          color: #FFA500;
          font-size: 1.4rem;
          margin: 1.5rem 0 1rem 0;
          text-shadow: 1px 1px 2px rgba(0,0,0,0.6);
        }

        .camp-description p {
          color: #E6F7FF;
          line-height: 1.6;
          margin-bottom: 1rem;
          font-size: 1rem;
        }

        .camp-description ul {
          color: #E6F7FF;
          line-height: 1.6;
          margin-bottom: 1.5rem;
          padding-left: 1.5rem;
        }

        .camp-description li {
          margin-bottom: 0.5rem;
        }

        .links-section {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin: 1.5rem 0;
        }

        .camp-link {
          color: #4ECDC4;
          text-decoration: none;
          padding: 0.8rem 1.2rem;
          background: rgba(78, 205, 196, 0.1);
          border: 1px solid rgba(78, 205, 196, 0.3);
          border-radius: 10px;
          transition: all 0.3s ease;
          font-weight: 500;
        }

        .camp-link:hover {
          background: rgba(78, 205, 196, 0.2);
          border-color: rgba(78, 205, 196, 0.5);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(78, 205, 196, 0.3);
        }

        .session-info {
          background: rgba(255, 215, 0, 0.1);
          border: 1px solid rgba(255, 215, 0, 0.3);
          border-radius: 15px;
          padding: 1.5rem;
          margin-top: 1rem;
        }

        .session-info h4 {
          color: #FFD700;
          font-size: 1.2rem;
          margin-bottom: 1rem;
          text-shadow: 1px 1px 2px rgba(0,0,0,0.6);
        }

        .session-info p {
          margin-bottom: 0.8rem;
        }

        .session-info ul {
          margin: 0.5rem 0 1rem 1.5rem;
        }

        .session-info li {
          margin-bottom: 0.3rem;
        }

        .session-info--cta {
          position: relative;
          overflow: hidden;
          background:
            linear-gradient(160deg, rgba(4, 12, 28, 0.78) 0%, rgba(6, 18, 36, 0.82) 55%, rgba(2, 8, 20, 0.88) 100%),
            url('/RL-Guide-book/pictures/Stan_Pol__a_group_of_children_holding_hands_standing_on_the_sta_6e234370-bd8a-410d-946b-efceb8c251ce.png') center / cover no-repeat;
          border: 1px solid rgba(78, 205, 196, 0.35);
          box-shadow: 0 20px 45px rgba(0, 0, 0, 0.5);
          padding: 1.8rem;
        }

        .session-info--cta::before {
          content: '';
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 20% 20%, rgba(78, 205, 196, 0.22) 0%, transparent 45%),
            radial-gradient(circle at 80% 25%, rgba(142, 68, 255, 0.22) 0%, transparent 55%);
          opacity: 0.65;
          pointer-events: none;
          mix-blend-mode: screen;
          transition: opacity 0.3s ease;
        }

        .session-info--cta::after {
          content: '';
          position: absolute;
          inset: 12px;
          border-radius: 20px;
          background: linear-gradient(180deg, rgba(6, 16, 36, 0.72) 0%, rgba(6, 16, 32, 0.85) 60%, rgba(3, 10, 24, 0.9) 100%);
          pointer-events: none;
          z-index: 0;
          box-shadow: inset 0 0 0 1px rgba(78, 205, 196, 0.25);
        }

        .session-info--cta:hover::before {
          opacity: 0.7;
        }

        .session-info--cta > * {
          position: relative;
          z-index: 2;
        }

        .session-info--cta h4 {
          color: #f4fbff;
          text-shadow:
            0 0 14px rgba(78, 205, 196, 0.6),
            0 0 28px rgba(59, 173, 255, 0.45);
        }

        .session-info--cta p,
        .session-info--cta li {
          color: #f1f7ff;
          text-shadow: 0 0 10px rgba(0, 0, 0, 0.65);
        }

        .session-info--cta ul {
          background: rgba(0, 0, 0, 0.35);
          padding: 0.6rem 0.85rem;
          border-radius: 12px;
        }

        .posts-section {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1rem;
          margin: 1.5rem 0;
        }

        .post-link {
          color: #FFA500;
          text-decoration: none;
          padding: 1rem;
          background: rgba(255, 165, 0, 0.1);
          border: 1px solid rgba(255, 165, 0, 0.3);
          border-radius: 10px;
          transition: all 0.3s ease;
          font-weight: 500;
          text-align: center;
          display: block;
        }

        .post-link:hover {
          background: rgba(255, 165, 0, 0.2);
          border-color: rgba(255, 165, 0, 0.5);
          transform: translateY(-3px);
          box-shadow: 0 6px 16px rgba(255, 165, 0, 0.3);
        }

        .post-image {
          width: 100%;
          height: 150px;
          overflow: hidden;
          border-radius: 8px;
          margin-bottom: 0.8rem;
        }

        .post-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
          transition: transform 0.3s ease;
        }

        .post-link:hover .post-image img {
          transform: scale(1.05);
        }

        /* Benefits Grid */
        .benefits-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
          margin: 20px 0;
        }

        .benefit-item {
          background: linear-gradient(135deg, rgba(255, 215, 0, 0.1) 0%, rgba(255, 165, 0, 0.1) 100%);
          border: 2px solid rgba(255, 215, 0, 0.3);
          border-radius: 15px;
          padding: 20px;
          text-align: center;
          transition: all 0.3s ease;
        }

        .benefit-item:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 25px rgba(255, 215, 0, 0.2);
          border-color: rgba(255, 215, 0, 0.6);
        }

        .benefit-item.clickable {
          cursor: pointer;
          position: relative;
          overflow: hidden;
          background: 
            linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)),
            url('/RL-Guide-book/pictures/Stan_Pol__beutiful_camera__vector_logo_e16e2508-69e8-4bf6-9cdf-8b7012558c5e.png') center/cover no-repeat;
        }

        .benefit-item.clickable::after {
          content: '\u{1f446}';
          position: absolute;
          top: 10px;
          right: 10px;
          font-size: 16px;
          opacity: 0.7;
          transition: all 0.3s ease;
        }

        .benefit-item.clickable:hover::after {
          opacity: 1;
          transform: scale(1.2);
        }

        .benefit-item.clickable:hover {
          transform: translateY(-8px) scale(1.02);
          box-shadow: 0 15px 35px rgba(255, 215, 0, 0.3);
          border-color: rgba(255, 215, 0, 0.8);
        }

        .benefit-item h4 {
          color: #FFD700;
          margin-bottom: 10px;
          font-size: 18px;
        }

        .benefit-item.clickable h4 {
          color: #FFD700;
          text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
          font-weight: bold;
        }

        .benefit-item p {
          color: #333;
          font-size: 14px;
          line-height: 1.4;
        }

        .benefit-item.clickable p {
          color: #fff;
          font-weight: 600;
          text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
        }

        /* Daily Activities */
        .daily-activities {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 15px;
          margin: 20px 0;
        }

        .activity-item {
          display: flex;
          align-items: center;
          background: rgba(255, 255, 255, 0.9);
          border-radius: 12px;
          padding: 15px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
          transition: all 0.3s ease;
        }

        .activity-item:hover {
          transform: translateX(5px);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
        }

        .activity-icon {
          font-size: 32px;
          margin-right: 15px;
          min-width: 40px;
        }

        .activity-item div {
          flex: 1;
        }

        .activity-item strong {
          color: #2c3e50;
          font-size: 16px;
          display: block;
          margin-bottom: 5px;
        }

        .activity-item p {
          color: #666;
          font-size: 13px;
          margin: 0;
          line-height: 1.3;
        }

        /* CTA Section */
        .cta-section {
          background: linear-gradient(135deg, rgba(255, 215, 0, 0.15) 0%, rgba(255, 165, 0, 0.15) 100%);
          border: 3px solid rgba(255, 215, 0, 0.4);
          border-radius: 20px;
          padding: 25px;
          text-align: center;
          margin: 30px 0;
          box-shadow: 0 8px 25px rgba(255, 215, 0, 0.2);
        }

        .cta-section h3 {
          color: #FFD700;
          font-size: 24px;
          margin-bottom: 15px;
          text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
        }

        .cta-section p {
          font-size: 16px;
          line-height: 1.6;
          margin-bottom: 10px;
        }

        .cta-section p:last-child {
          margin-bottom: 0;
          font-size: 14px;
          color: #e74c3c;
          font-weight: bold;
        }

        .post-link:nth-child(1) .post-image img {
          object-position: center 10%;
        }

        .post-link:nth-child(2) .post-image img {
          object-position: center 30%;
        }

        .post-link:nth-child(3) .post-image img {
          object-position: center 20%;
          transform: scale(1.4);
        }

        .post-link:nth-child(4) .post-image img {
          object-position: center 25%;
        }

        .post-link:nth-child(6) .post-image img {
          object-position: center 30%;
        }

        .post-link:nth-child(8) .post-image img {
          object-position: center 30%;
        }

        .post-link:nth-child(9) .post-image img {
          object-position: center 30%;
        }

        /* Reviews Section Styles */
        .reviews-section {
          margin: 2rem 0;
        }

        .reviews-container {
          background: rgba(255, 165, 0, 0.1);
          border: 1px solid rgba(255, 165, 0, 0.3);
          border-radius: 15px;
          padding: 0;
          transition: all 0.3s ease;
          overflow: hidden;
        }

        .reviews-container:hover {
          background: rgba(255, 165, 0, 0.15);
          border-color: rgba(255, 165, 0, 0.5);
          transform: translateY(-3px);
          box-shadow: 0 6px 16px rgba(255, 165, 0, 0.3);
        }

        .reviews-image {
          position: relative;
          width: 100%;
          height: 200px;
          border-radius: 15px;
          background: 
            linear-gradient(rgba(0, 0, 0, 0.2), rgba(0, 0, 0, 0.2)),
            url('/RL-Guide-book/pictures/nCaCWzejfe1KQgvdwHWHGKONG2w1lF7h9SxMAlW-iojQZrvq7_gmxF4ZJyNBFuXZkuPE5WE489c9OXvgknit3wsR.jpg') center/50% no-repeat;
          transition: all 0.3s ease;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          padding-bottom: 1rem;
        }

        .reviews-container:hover .reviews-image {
          background: 
            linear-gradient(rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.1)),
            url('/RL-Guide-book/pictures/nCaCWzejfe1KQgvdwHWHGKONG2w1lF7h9SxMAlW-iojQZrvq7_gmxF4ZJyNBFuXZkuPE5WE489c9OXvgknit3wsR.jpg') center/50% no-repeat;
          transform: scale(1.02);
        }

        .reviews-content {
          position: relative;
          z-index: 2;
          text-align: center;
          padding: 1rem;
        }

        .reviews-content h4 {
          color: #FFD700;
          font-size: 1.3rem;
          margin-bottom: 0.8rem;
          font-weight: bold;
        }

        .reviews-content p {
          color: #ffffff;
          font-size: 1rem;
          line-height: 1.5;
          margin-bottom: 1.5rem;
        }

        .reviews-button {
          display: inline-block;
          background: rgba(255, 215, 0, 0.2);
          color: #FFD700;
          padding: 12px 24px;
          border-radius: 25px;
          text-decoration: none;
          font-weight: bold;
          font-size: 1rem;
          transition: all 0.3s ease;
          border: 2px solid rgba(255, 215, 0, 0.5);
        }

        .reviews-button:hover {
          background: rgba(255, 215, 0, 0.4);
          border-color: rgba(255, 215, 0, 0.8);
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(255, 215, 0, 0.3);
        }

        /* Mobile responsiveness for reviews */
        @media (max-width: 768px) {
          .reviews-image {
            height: 150px;
            background-size: 80%;
          }

          .reviews-content {
            padding: 0.8rem;
          }

          .reviews-content h4 {
            font-size: 1.1rem;
          }

          .reviews-content p {
            font-size: 0.9rem;
          }
        }

        .post-title {
          font-size: 0.9rem;
          line-height: 1.3;
        }

        .post-main-title {
          font-size: 1rem;
          font-weight: bold;
          color: #FFD700;
          margin-bottom: 0.3rem;
          text-shadow: 1px 1px 2px rgba(0,0,0,0.6);
        }

        .post-subtitle {
          font-size: 0.8rem;
          color: #E6F7FF;
          margin-bottom: 0.5rem;
          line-height: 1.2;
        }

        .post-highlights {
          display: flex;
          flex-wrap: wrap;
          gap: 0.3rem;
          justify-content: center;
        }

        .highlight {
          font-size: 0.7rem;
          background: rgba(78, 205, 196, 0.2);
          color: #4ECDC4;
          padding: 0.2rem 0.4rem;
          border-radius: 4px;
          border: 1px solid rgba(78, 205, 196, 0.3);
        }



                                                                       .intro-content {
             text-align: center;
             max-width: 1000px;
             padding: 1rem;
             background: rgba(0, 0, 0, 0.3);
             border-radius: 20px;
             border: 1px solid rgba(255, 255, 255, 0.1);
             box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
             margin: clamp(3.6rem, 7vw, 5.1rem) 1rem 1.2rem;
             backdrop-filter: blur(4px);
           }

                 .intro-content h1 {
           font-size: 2rem;
           margin-bottom: 18px;
           font-weight: 800;
           letter-spacing: -0.01em;
           background: linear-gradient(45deg, #4ecdc4, #44a08d);
           -webkit-background-clip: text;
           -webkit-text-fill-color: transparent;
           background-clip: text;
         }

                 .intro-content p {
           font-size: 0.9rem;
           line-height: 1.45;
           margin-bottom: 0.6rem;
           color: #E6F7FF;
           max-width: 70ch;
           margin-left: auto;
           margin-right: auto;
         }

                                                                       .philosophy-section {
             margin: 1rem 0;
             padding: 0.6rem;
             background: rgba(255, 255, 255, 0.03);
             border: 1px solid rgba(255, 255, 255, 0.05);
             border-radius: 15px;
             backdrop-filter: blur(2px);
             gap: 16px;
           }

                 .philosophy-main {
           font-size: 1rem !important;
           color: #CFEAF5 !important;
           text-align: center;
           margin-bottom: 0.6rem !important;
         }

                 .philosophy-points {
           margin: 0.6rem 0;
         }

                                                                       .point {
             display: grid;
             grid-template-columns: auto 1fr;
             gap: 12px;
             align-items: flex-start;
             margin-bottom: 0.6rem;
             padding: 0.5rem;
             background: rgba(255, 255, 255, 0.02);
             border-radius: 10px;
             border-left: 3px solid #62FFD0;
           }

                 .point-icon {
           font-size: 1.1rem;
           grid-column: 1;
           align-self: start;
         }

        .point div {
          grid-column: 2;
        }

                 .point strong {
           color: #62FFD0;
           display: block;
           margin-bottom: 0.2rem;
         }

                                                                       .philosophy-ending {
             text-align: center;
             font-size: 0.9rem !important;
             color: #62FFD0 !important;
             margin-top: 0.6rem !important;
             padding: 0.5rem;
             background: rgba(98, 255, 208, 0.05);
             border-radius: 10px;
           }

                 .start-instruction {
           text-align: center;
           font-size: 0.9rem;
           color: #ccc;
           margin: 0.6rem 0;
         }

                 .start-button {
            background: linear-gradient(45deg, #4ecdc4, #44a08d);
            border: none;
            padding: 0.55rem 1.05rem;
            font-size: 0.95rem;
            color: white;
            border-radius: 50px;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 10px 20px rgba(78, 205, 196, 0.3);
            margin: 0.6rem auto 0;
            width: 100%;
            max-width: 240px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            letter-spacing: 0.03em;
            min-width: 0;
          }

        .start-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 15px 30px rgba(78, 205, 196, 0.4);
        }

                                   .categories-screen {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            overflow: hidden;
            padding: 1rem;
            background: 
              linear-gradient(135deg, rgba(12, 12, 12, 0.3) 0%, rgba(26, 26, 46, 0.3) 50%, rgba(22, 33, 62, 0.3) 100%),
                             url('/RL-Guide-book/\u044d\u043a\u0440\u0430\u043d 2 \u0444\u043e\u043d.png') center center / cover no-repeat;
          }

                   .category-screen,
          .badge-screen {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            overflow-x: hidden;
            overflow-y: auto;
            padding: 1rem;
            background: 
              linear-gradient(135deg, rgba(12, 12, 12, 0.3) 0%, rgba(26, 26, 46, 0.3) 50%, rgba(22, 33, 62, 0.3) 100%),
                             url('/RL-Guide-book/screen3_bg.png') center top / 100% no-repeat;
          }

          .badge-level-screen {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            overflow-x: hidden;
            overflow-y: auto;
            padding: 1rem;
          }

          .header {
            position: relative;
            margin-bottom: 0.6rem;
            padding: 0.75rem 1rem;
            border-radius: 18px;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
            background:
              url('/RL-Guide-book/pattern_stickers.jpg') center / cover no-repeat;
            border: 1px solid rgba(32, 56, 94, 0.55);
            box-shadow: 0 18px 38px rgba(0, 0, 0, 0.45);
            backdrop-filter: blur(10px);
          }

          @keyframes neonPulse {
            0%, 100% {
              text-shadow:
                0 0 10px rgba(59, 173, 255, 0.45),
                0 0 24px rgba(142, 68, 255, 0.4),
                0 0 34px rgba(255, 99, 214, 0.28);
            }
            50% {
              text-shadow:
                0 0 18px rgba(59, 173, 255, 0.7),
                0 0 32px rgba(142, 68, 255, 0.55),
                0 0 46px rgba(255, 99, 214, 0.35);
            }
          }

          .heading-neon {
            position: relative;
            display: inline-flex;
            align-items: center;
            color: #e8f9ff !important;
            font-weight: 700 !important;
            letter-spacing: 0.05em;
            text-shadow:
              0 0 14px rgba(59, 173, 255, 0.6),
              0 0 26px rgba(142, 68, 255, 0.45),
              0 0 40px rgba(255, 99, 214, 0.35);
            animation: neonPulse 4s ease-in-out infinite;
            z-index: 2;
          }

          .heading-neon::after {
            content: '';
            position: absolute;
            inset: -6px -12px;
            border-radius: 12px;
            background: radial-gradient(circle, rgba(59, 173, 255, 0.22) 0%, rgba(255, 99, 214, 0.16) 55%, transparent 100%);
            filter: blur(6px);
            opacity: 0.6;
            pointer-events: none;
            z-index: -1;
          }

          /* \u0423\u0431\u0438\u0440\u0430\u0435\u043c \u043e\u0432\u0435\u0440\u043b\u0435\u0439 \u043d\u0430 \u0432\u0435\u0441\u044c category-screen header */

          /* \u0423\u0431\u0438\u0440\u0430\u0435\u043c \u043e\u0431\u0449\u0438\u0439 \u043e\u0432\u0435\u0440\u043b\u0435\u0439 \u0434\u043b\u044f category-screen header */

                 .back-button {
           background: rgba(255, 255, 255, 0.1);
           border: 1px solid rgba(255, 255, 255, 0.2);
           color: white;
           padding: 0.4rem 0.8rem;
           border-radius: 25px;
           cursor: pointer;
           transition: all 0.3s ease;
           margin-bottom: 0.8rem;
           font-size: 0.9rem;
         }

        .back-button:hover {
          background: rgba(255, 255, 255, 0.2);
        }

                                   .header h1 {
            color: #f1fbff;
            font-size: clamp(1.15rem, 2.6vw, 1.55rem);
            margin: 0;
            font-weight: 700;
            letter-spacing: 0.04em;
            white-space: normal;
            line-height: 1.3;
            text-shadow:
              0 0 12px rgba(46, 134, 222, 0.45),
              0 0 28px rgba(255, 99, 214, 0.3),
              0 0 36px rgba(78, 205, 196, 0.25);
          }

                  .header p {
            color: #d6e7ff;
            font-size: 0.8rem;
            font-weight: 600;
            margin: 0;
            padding: 0.35rem 0.75rem;
            background: rgba(8, 22, 42, 0.55);
            border-radius: 999px;
            text-shadow: 0 0 8px rgba(0, 0, 0, 0.65);
            display: inline-flex;
            align-items: center;
            gap: 0.25rem;
          }

                                                                                                                                                                               .categories-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 1.5rem;
                width: 100%;
                height: calc(100vh - 120px);
                padding: 1rem;
                overflow: hidden;
              }

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               .category-container {
                   display: flex;
                   align-items: center;
                   gap: 0.8rem; /* \u0423\u0432\u0435\u043b\u0438\u0447\u0438\u043b\u0438 \u043e\u0442\u0441\u0442\u0443\u043f \u043c\u0435\u0436\u0434\u0443 \u043f\u0443\u0437\u044b\u0440\u0435\u043c \u0438 \u0442\u0435\u043a\u0441\u0442\u043e\u043c */
                    cursor: pointer;
                    padding: 0;
                    background: transparent;
                    border: none;
                    border-radius: 0;
                    backdrop-filter: none;
                    transition: all 0.3s ease;
                 }

                                                                                                                                                                               .category-card {
                background: rgba(0, 0, 0, 0.8);
                border: none;
                border-radius: 50%;
                padding: 0.5rem;
                cursor: pointer;
                transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                backdrop-filter: blur(10px);
                text-align: center;
                box-shadow: 0 8px 25px rgba(0, 0, 0, 0.5);
                aspect-ratio: 1;
                display: flex;
                justify-content: center;
                align-items: center;
                position: relative;
                min-width: 60px;
                min-height: 60px;
                overflow: hidden;
                flex-shrink: 0;
              }

                                       
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    -
                   display: flex;
                   align-items: center;
                   gap: 0;
                   cursor: pointer;
                   padding: 0;
                   background: transparent;
                   border: none;
                   border-radius: 0;
                   backdrop-filter: none;
                   transition: all 0.3s ease;
                 }

                                                                                                                                                                               .category-card {
                background: rgba(0, 0, 0, 0.8);
                border: none;
                border-radius: 50%;
                padding: 0.5rem;
                cursor: pointer;
                transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                backdrop-filter: blur(10px);
                text-align: center;
                box-shadow: 0 8px 25px rgba(0, 0, 0, 0.5);
                aspect-ratio: 1;
                display: flex;
                justify-content: center;
                align-items: center;
                position: relative;
                min-width: 60px;
                min-height: 60px;
                overflow: hidden;
                flex-shrink: 0;
                animation: breath 3s ease-in-out infinite;
              }

                                       .category-container {
             z-index: 9999;
           }

                                       .category-container.floating {
             animation: float 6s ease-in-out infinite;
           }
 
           @keyframes float {
             0%, 100% {
               transform: translateY(0px);
             }
             50% {
               transform: translateY(-8px);
             }
           }

         .category-card::before {
           content: '';
           position: absolute;
           top: 50%;
           left: 50%;
           width: 80%;
           height: 80%;
           border: none;
           border-radius: 50%;
           transform: translate(-50%, -50%);
           pointer-events: none;
           animation: pulse 3s ease-in-out infinite;
           box-shadow: 0 0 15px rgba(78, 205, 196, 0.2);
         }
         
         .category-card::after {
           content: '';
           position: absolute;
           top: 50%;
           left: 50%;
           width: 60%;
           height: 60%;
           border: none;
           border-radius: 50%;
           transform: translate(-50%, -50%);
           pointer-events: none;
           animation: pulse 2s ease-in-out infinite reverse;
         }

         @keyframes pulse {
           0%, 100% { 
             transform: translate(-50%, -50%) scale(1);
             opacity: 0.3;
           }
           50% { 
             transform: translate(-50%, -50%) scale(1.1);
             opacity: 0.6;
           }
         }
         
         @keyframes emojiFloat {
           0%, 100% { 
             transform: scale(1.25) rotate(5deg) translateY(0px);
           }
           50% { 
             transform: scale(1.25) rotate(5deg) translateY(-3px);
           }
         }
         
         @keyframes activeGlow {
           0%, 100% { 
             box-shadow: 
               0 0 25px rgba(78, 205, 196, 0.6),
               0 0 40px rgba(78, 205, 196, 0.3),
               inset 0 0 15px rgba(78, 205, 196, 0.1);
           }
           50% { 
             box-shadow: 
               0 0 35px rgba(78, 205, 196, 0.8),
               0 0 60px rgba(78, 205, 196, 0.4),
               inset 0 0 20px rgba(78, 205, 196, 0.15);
           }
         }

          /* Pulsing glow for the currently selected badge bubble in header */
          @keyframes selectedGlow {
            0%, 100% {
              box-shadow:
                0 6px 18px rgba(0, 0, 0, 0.6),
                0 0 30px rgba(78, 205, 196, 0.68),
                0 0 55px rgba(78, 205, 196, 0.35),
                inset 0 0 16px rgba(78, 205, 196, 0.18);
            }
            50% {
              box-shadow:
                0 8px 22px rgba(0, 0, 0, 0.65),
                0 0 42px rgba(78, 205, 196, 0.9),
                0 0 75px rgba(78, 205, 196, 0.55),
                inset 0 0 22px rgba(78, 205, 196, 0.24);
            }
          }

                                    .category-container:hover .category-card {
            transform: translateY(-8px) scale(1.08);
            box-shadow: 
              0 0 30px rgba(78, 205, 196, 0.8),
              0 0 60px rgba(78, 205, 196, 0.4),
              inset 0 0 20px rgba(78, 205, 196, 0.1);
            border-color: #4ecdc4;
            filter: brightness(1.1);
          }

          .category-container:hover .category-card::before {
            border-color: rgba(78, 205, 196, 0.8);
            animation-duration: 1s;
            box-shadow: 0 0 25px rgba(78, 205, 196, 0.6);
          }
          
          .category-container:hover .category-card::after {
            border-color: rgba(78, 205, 196, 0.4);
            animation-duration: 0.8s;
            box-shadow: 0 0 15px rgba(78, 205, 196, 0.3);
          }

          .category-container:hover .category-text h3 {
            color: #4ecdc4;
          }
          
          .category-container:hover .category-icon {
            filter: drop-shadow(0 0 15px rgba(78, 205, 196, 0.6));
            transform: scale(1.1);
          }

          .category-container:hover .category-icon img {
            transform: scale(1.15);
          }

                                                                                                                                                                                                                       .category-icon {
              font-size: clamp(1rem, 2vw, 2rem);
              flex-shrink: 0;
              display: flex;
              justify-content: center;
              align-items: center;
              width: 100%;
              height: 100%;
              transition: all 0.3s ease;
            }
            
            .category-icon img {
              width: 118%;
              height: 118%;
              object-fit: cover;
              object-position: center;
              transform: none;
              transition: transform 0.35s ease, filter 0.35s ease;
            }

            /* \u0418\u043d\u0434\u0438\u0432\u0438\u0434\u0443\u0430\u043b\u044c\u043d\u044b\u0435 \u0440\u0430\u0437\u043c\u0435\u0440\u044b \u0434\u043b\u044f \u043a\u0430\u0436\u0434\u043e\u0439 \u043a\u0430\u0442\u0435\u0433\u043e\u0440\u0438\u0438 */
            .category-2-icon {
              width: 140% !important;
              height: 140% !important;
            }

            .category-5-icon {
              width: 138% !important;
              height: 138% !important;
            }

            .category-8-icon {
              width: 138% !important;
              height: 138% !important;
            }

            .category-9-icon {
              width: 145% !important;
              height: 145% !important;
            }

            .category-14-icon {
              width: 138% !important;
              height: 138% !important;
            }

            .category-13-icon {
              width: 138% !important;
              height: 138% !important;
            }

            .category-11-icon {
              width: 160% !important;
              height: 160% !important;
            }

            .category-3-icon {
              width: 200% !important;
              height: 200% !important;
            }

            .category-4-icon {
              width: 140% !important;
              height: 140% !important;
            }

            .category-7-icon {
              width: 140% !important;
              height: 140% !important;
            }

            .category-6-icon {
              width: 140% !important;
              height: 140% !important;
            }

            .category-10-icon {
              width: 160% !important;
              height: 160% !important;
            }


                     .category-text {
             display: flex;
             flex-direction: column;
             gap: 0.1rem; /* \u0423\u043c\u0435\u043d\u044c\u0448\u0438\u043b\u0438 \u043e\u0442\u0441\u0442\u0443\u043f \u043c\u0435\u0436\u0434\u0443 \u044d\u043b\u0435\u043c\u0435\u043d\u0442\u0430\u043c\u0438 */
             min-width: 0;
             flex: 1;
           }

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                ... [truncated]
                      margin: 0;
                      color: #4ecdc4;
                      font-size: clamp(0.6rem, 1.5vw, 0.9rem);
                      line-height: 1.2;
                      word-wrap: break-word;
                      text-align: left;
                      max-width: 500px;
                    }

                                                                                       .category-text p {
               margin: 0;
               color: #ccc;
               font-size: clamp(0.4rem, 1vw, 0.6rem);
               text-align: left;
               margin-top: 0.05rem;
             }

                                     .badges-grid {
             display: grid;
             grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
             gap: 18px;
             align-items: start;
             justify-content: center;
             justify-items: center;
             align-content: flex-start;
             overflow-x: hidden;
             box-sizing: border-box;
             padding: 16px;
             width: 100%;
             height: auto;
             min-height: calc(100vh - 120px);
             overflow-y: visible;
             max-width: 1400px;
             margin: 0 auto;
           }

                                     .badge-card {
             display: flex;
             flex-direction: column;
             align-items: center;
             justify-content: space-between;
             padding: 0;
             border-radius: 0;
             background: transparent;
             backdrop-filter: none;
             box-shadow: none;
             min-height: auto;
             height: auto;
             cursor: pointer;
             transition: all 0.3s ease;
             box-sizing: border-box;
             z-index: 9999;
           }

        .badge-card:hover {
          transform: translateY(-8px) scale(1.02);
          box-shadow: 
            0 0 25px rgba(78, 205, 196, 0.6),
            0 0 50px rgba(78, 205, 196, 0.3);
          filter: brightness(1.05);
        }

                                     .badge-card__icon {
             width: 80px;
             height: 80px;
             border-radius: 50%;
             display: grid;
             place-items: center;
             flex: 0 0 auto;
             background: rgba(0, 0, 0, 0.05); /* Еще больше уменьшена непрозрачность для почти незаметной границы */
             border: none;
             padding: 2px;
             transition: all 0.3s ease;
           }

                  .badge-card:hover .badge-card__icon {
            background: rgba(255, 255, 255, 0.15);
            border-color: #4ecdc4;
            box-shadow: 
              0 0 25px rgba(78, 205, 196, 0.5),
              0 0 40px rgba(78, 205, 196, 0.2),
              inset 0 0 15px rgba(78, 205, 196, 0.1);
            transform: scale(1.15);
          }

                                     .badge-card__title {
             margin-top: 16px;
             text-align: center;
             font-size: 15px;
             line-height: 1.2;
             max-width: 100%;
             white-space: pre-line !important;
             word-break: break-word;
             hyphens: auto;
             color: #4ecdc4;
             margin: 0;
           }

                                     .badge-card__level {
             margin-top: 12px;
             font-size: 13px;
             color: #ccc;
             opacity: 0.8;
             text-align: center;
           }

                                     .badge-emoji {
             font-size: 3.5rem;
             transition: all 0.3s ease;
           }

                  .badge-card:hover .badge-emoji {
            transform: scale(1.25) rotate(5deg);
            filter: 
              drop-shadow(0 0 15px rgba(78, 205, 196, 0.7))
              drop-shadow(0 0 25px rgba(78, 205, 196, 0.4))
              brightness(1.1);
            animation: emojiFloat 2s ease-in-out infinite;
          }

          /* Badge image styles */
          .badge-image {
            transition: all 0.3s ease;
            display: block !important;
            width: 100% !important;
            height: 100% !important;
            object-fit: contain !important;
          }

          .badge-card__icon .badge-image {
            position: relative !important;
            z-index: 1 !important;
          }

          /* Делаем контейнер BadgeIcon круглым внутри badge-card__icon */
          .badge-card__icon > div {
            border-radius: 50% !important;
            overflow: hidden !important;
          }

          .badge-card:hover .badge-image {
            transform: scale(1.25) rotate(5deg);
            filter: 
              drop-shadow(0 0 15px rgba(78, 205, 196, 0.7))
              drop-shadow(0 0 25px rgba(78, 205, 196, 0.4))
              brightness(1.1);
            animation: emojiFloat 2s ease-in-out infinite;
          }

          /* Special class to center the last badge in the grid */
          .badge-centered-row {
            grid-column: 1 / -1;
            justify-self: center;
            width: 100%;
            max-width: 220px; /* Match max width of other badges from media queries */
          }

                                     @media (min-width: 576px) {
             .badges-grid { 
               grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); 
               max-width: 1200px;
             }
           }
           @media (min-width: 768px) {
             .badges-grid { 
               grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
               max-width: 1300px;
             }
           }
           @media (min-width: 1200px) {
             .badges-grid { 
               grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); 
               max-width: 1400px;
             }
           }



                                   .badge-card h3 {
            margin: 0 0 0.2rem 0;
            color: #4ecdc4;
            font-size: clamp(0.6rem, 1.5vw, 0.9rem);
            line-height: 1.2;
            word-wrap: break-word;
          }

                                   .badge-level {
            margin: 0;
            color: #ccc;
            font-size: clamp(0.4rem, 1vw, 0.6rem);
            margin-top: 0.05rem;
          }

        .badge-header,
        .level-header {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        /* Badge screen: keep the emoji inside a glowing bubble */
        .badge-emoji-large {
          width: 92px;
          height: 92px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          background: radial-gradient(circle at 50% 45%, rgba(0, 0, 0, 0.85) 0%, rgba(0, 0, 0, 0.7) 65%, rgba(0, 0, 0, 0.55) 100%);
          border: 1.5px solid rgba(78, 205, 196, 0.5);
          box-shadow:
            0 6px 18px rgba(0, 0, 0, 0.6), /* \u043e\u0442\u0440\u044b\u0432 \u043e\u0442 \u0431\u0430\u043d\u043d\u0435\u0440\u0430 */
            0 0 30px rgba(78, 205, 196, 0.7),
            0 0 55px rgba(78, 205, 196, 0.35),
            inset 0 0 18px rgba(78, 205, 196, 0.18);
          font-size: 4rem; /* emoji size */
          line-height: 1;
          animation: selectedGlow 2.6s ease-in-out infinite;
        }

        /* Badge image in large container */
        .badge-emoji-large .badge-image {
          width: 80px;
          height: 80px;
          object-fit: contain;
          border-radius: 50%;
        }

        /* Category screen: remove rectangular glow on hover; keep only circular bubble glow */
        .category-screen .badge-card:hover { box-shadow: none; }
        .category-screen .badge-card { box-shadow: none; }

        .badge-category,
        .level-title {
          color: #4ecdc4;
          font-size: 1.1rem;
          margin: 0;
        }

        .badge-content,
        .level-content {
          margin-top: 1rem;
        }

        .badge-summary {
          display: grid;
          grid-template-columns: 1fr;
          gap: 0.8rem;
        }
        @media (min-width: 992px) {
          .badge-summary {
            grid-template-columns: 1.2fr 0.8fr;
            align-items: start;
          }
        }

        .badge-summary__block {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 0.8rem;
          height: auto;
          min-height: fit-content;
        }
        .badge-summary__block--tall {
          min-height: 460px;
        }
        .badge-summary__right { 
          display: grid; 
          gap: 0.8rem; 
          align-items: start;
          height: auto;
          min-height: 100%;
          overflow: visible;
        }

        .badge-summary__text {
          color: #ddd;
          margin: 0.2rem 0 0.6rem 0;
          line-height: 1.6;
          white-space: pre-line;
          max-height: none;
          overflow: visible;
        }

        .badge-summary__block h4 {
          font-size: 18px;
          font-weight: 600;
          color: #4ecdc4;
          margin: 24px 0 12px 0;
          padding: 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          padding-bottom: 8px;
        }

        .badge-evidence {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid rgba(255, 255, 255, 0.2);
          color: #9ec;
          font-style: italic;
        }

        .criterion-text {
          margin-bottom: 8px;
        }

        .criterion-examples {
          margin-top: 8px;
          padding-left: 16px;
        }

        .criterion-example {
          margin: 4px 0;
          font-size: 0.95em;
          opacity: 0.9;
        }
        .badge-summary__block--tall .badge-summary__text {
          max-height: var(--info-max-em, 28em);
        }
        .badge-summary__block--tall-override .badge-summary__text {
          max-height: 32em;
        }

        .badge-meta {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 0.6rem;
        }
        .badge-meta div {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 0.6rem 0.8rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .badge-meta div + div { margin-left: 10px; }
        .badge-meta div span { margin-right: 8px; }
        .badge-meta span { color: #9ec; }
        .badge-meta strong { color: #fff; font-weight: 600; }

        .badge-description,
        .level-description,
        .level-criteria {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
        }

        .badge-description h3,
        .level-description h3,
        .level-criteria h3 {
          color: #4ecdc4;
          margin: 0 0 1rem 0;
        }

        .badge-description p,
        .level-description p,
        .level-criteria p {
          color: #ccc;
          line-height: 1.6;
          margin: 0;
        }

        .badge-levels h3 {
          color: #4ecdc4;
          margin: 0 0 1rem 0;
        }

        .levels-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1rem;
        }

        /* \u041a\u043e\u043c\u043f\u0430\u043a\u0442\u043d\u0430\u044f \u0441\u0435\u0442\u043a\u0430 \u043a\u0430\u0440\u0442\u043e\u0447\u0435\u043a \u0443\u0440\u043e\u0432\u043d\u0435\u0439, \u0438\u0434\u0435\u043d\u0442\u0438\u0447\u043d\u0430\u044f \u0441\u0442\u0438\u043b\u044e \u0431\u0430\u0437\u043e\u0432\u044b\u0445 \u0437\u043d\u0430\u0447\u043a\u043e\u0432 */
        .levels-grid-compact {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 12px;
          align-items: start;
        }
        .level-compact {
          min-height: 120px;
        }
        .levels-grid-compact .badge-card__title {
          display: block;
          -webkit-line-clamp: initial;
          -webkit-box-orient: initial;
          white-space: normal;
          overflow: visible;
          font-size: 13px;
        }

        .level-card {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 10px;
          padding: 1rem;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .level-card__head { display: flex; align-items: center; gap: 0.6rem; }
        .level-card__emoji { font-size: 1.4rem; }
        .level-card__criteria { color: #ccc; margin: 0.4rem 0 0.2rem 0; white-space: pre-line; max-height: 10em; overflow: hidden; }
        .level-card__desc { color: #bbb; margin: 0; }
        .level-card__btn {
          margin-top: 0.8rem;
          background: rgba(78, 205, 196, 0.2);
          color: #4ecdc4;
          border: 1px solid rgba(78, 205, 196, 0.6);
          border-radius: 8px;
          padding: 0.4rem 0.8rem;
          cursor: pointer;
        }
        .level-card__btn:hover { background: rgba(78, 205, 196, 0.35); }

        .level-card:hover {
          background: rgba(255, 255, 255, 0.2);
          border-color: #4ecdc4;
        }

        .level-card h4 {
          color: #4ecdc4;
          margin: 0 0 0.5rem 0;
        }

        .level-card p {
          color: #ccc;
          margin: 0;
          font-size: 0.9rem;
        }

        /* Steps (right panel) */
        .badge-steps { background: rgba(255,255,255,0.06); border-radius: 16px; padding: 20px 24px; backdrop-filter: blur(6px); }
        .badge-steps__title { margin: 0 0 12px; font-size: 20px; font-weight: 700; }
        .badge-steps__list { margin: 0; padding-left: 0; list-style: none; }
        .badge-steps__list li { position: relative; padding-left: 28px; margin: 10px 0; white-space: pre-line; }
        .badge-steps__list li::before { content: '\u2705'; position: absolute; left: 0; top: 0; line-height: 1.1; }

        /* Bottom levels grid */
        .levels-grid-bottom { display:flex; justify-content:flex-end; gap:24px; margin-top:0; margin-right: 300px; flex-wrap:nowrap; align-items:center; position: relative; z-index: 9999; }
        /* Stick by top so it visually sits near the bottom of the viewport,
           but keep it aligned to the viewport's right edge regardless of inner container width */
        .levels-dock {
          position: relative; /* sits right under the block above */
          right: auto;
          bottom: auto;
          z-index: 9999;
          display: flex;
          justify-content: flex-end;
          margin-top: 0;
          margin-right: 300px;
        }
        @media (max-width: 900px) {
          .levels-dock { margin-top: 0; margin-right: 300px; }
        }
        .level-card-bottom { display: flex; flex-direction: column; align-items: center; padding: 0; border-radius: 0; background: transparent; backdrop-filter: none; min-height: auto; cursor: pointer; transition: all 0.3s ease; position: relative; z-index: 9999; }
        .level-card-bottom:hover { 
          transform: translateY(-6px) scale(1.05); 
          background: transparent;
          filter: brightness(1.1);
        }
        .level-card__icon { width: 160px; height: 160px; border-radius: 50%; display: grid; place-items: center; margin-bottom: 16px; background: rgba(0,0,0,0.45); border: 1px solid rgba(255,255,255,0.25); transition: all 0.3s ease; z-index: 9999; }
                 .level-card__title { text-align: center; font-size: 17px; line-height: 1.2; margin: 6px 0 4px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis; word-break: break-word; hyphens: auto; color: #4ecdc4; white-space: pre-line !important; }
        .level-card__subtitle { opacity: .85; font-size: 14px; text-align: center; color: #ccc; }
        
        .level-card-bottom:hover .level-card__icon {
          background: rgba(255, 255, 255, 0.15);
          border-color: #4ecdc4;
          box-shadow: 
            0 0 25px rgba(78, 205, 196, 0.5),
            0 0 40px rgba(78, 205, 196, 0.2),
            inset 0 0 15px rgba(78, 205, 196, 0.1);
          transform: scale(1.15);
        }
        .level-card-bottom.active .level-card__icon {
          background: rgba(78, 205, 196, 0.2);
          border-color: #4ecdc4;
          box-shadow: 
            0 0 25px rgba(78, 205, 196, 0.6),
            0 0 40px rgba(78, 205, 196, 0.3),
            inset 0 0 15px rgba(78, 205, 196, 0.1);
          animation: activeGlow 2s ease-in-out infinite;
        }
        
                 .level-bubble__emoji {
           font-size: 2.5rem;
           transition: all 0.3s ease;
         }
         
         .level-card-bottom:hover .level-bubble__emoji {
           transform: scale(1.25) rotate(3deg);
           filter: 
             drop-shadow(0 0 15px rgba(78, 205, 196, 0.7))
             drop-shadow(0 0 25px rgba(78, 205, 196, 0.4))
             brightness(1.1);
           animation: emojiFloat 2s ease-in-out infinite;
         }

         /* Level badge image styles */
         .level-bubble__emoji .badge-image {
           width: 48px;
           height: 48px;
           object-fit: contain;
         }

         .level-card-bottom:hover .level-bubble__emoji .badge-image {
           transform: scale(1.25) rotate(3deg);
           filter: 
             drop-shadow(0 0 15px rgba(78, 205, 196, 0.7))
             drop-shadow(0 0 25px rgba(78, 205, 196, 0.4))
             brightness(1.1);
           animation: emojiFloat 2s ease-in-out infinite;
         }

                 @media (max-width: 768px) {
           .intro-content {
             max-width: 95vw;
             max-height: 95vh;
             padding: 1rem;
             margin: 2.8rem 1rem 1.2rem;
           }

           .intro-content h1 {
             font-size: 1.8rem;
           }

           .intro-content p {
             font-size: 0.9rem;
           }

           .philosophy-main {
             font-size: 1rem !important;
           }

           .point {
             flex-direction: column;
             text-align: center;
             padding: 0.6rem;
           }

           .point-icon {
             align-self: center;
             font-size: 1.2rem;
           }

           .philosophy-ending {
             font-size: 0.9rem !important;
             padding: 0.6rem;
           }

           .start-instruction {
             font-size: 0.9rem;
           }

           .start-button {
             padding: 0.6rem 1.2rem;
             font-size: 1rem;
           }

           .categories-grid {
             grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
             gap: 1rem;
           }
           
           .badges-grid {
             grid-template-columns: 1fr;
           }

                       .header h1 {
              font-size: 1.8rem;
            }

           .badge-header,
           .level-header {
             flex-direction: column;
             text-align: center;
           }
         }
        /* \u0423\u043d\u0438\u0432\u0435\u0440\u0441\u0430\u043b\u044c\u043d\u044b\u0435 \u0441\u0442\u0438\u043b\u0438 \u0434\u043b\u044f \u0432\u0441\u0435\u0445 \u044d\u043a\u0440\u0430\u043d\u043e\u0432 \u0437\u043d\u0430\u0447\u043a\u043e\u0432 - \u0444\u0438\u043a\u0441\u0438\u0440\u043e\u0432\u0430\u043d\u043d\u0430\u044f \u043f\u043e\u0437\u0438\u0446\u0438\u044f \u043f\u0443\u0437\u044b\u0440\u0435\u0439 */
        .badge-screen .badge-summary__right {
          height: auto;
          min-height: 100%;
          overflow: visible;
          padding-bottom: 24px;
        }
        /* \u0415\u0414\u0418\u041d\u042b\u0415 \u0441\u0442\u0438\u043b\u0438 \u0434\u043b\u044f \u044d\u043a\u0440\u0430\u043d\u043e\u0432 \u0437\u043d\u0430\u0447\u043a\u0430 \u0438 \u0443\u0440\u043e\u0432\u043d\u044f \u2014 \u043f\u0443\u0437\u044b\u0440\u0438 \u0444\u0438\u043a\u0441\u0438\u0440\u0443\u044e\u0442\u0441\u044f \u0432 \u043e\u0434\u043d\u043e\u043c \u043c\u0435\u0441\u0442\u0435 */
        .badge-screen .levels-grid-bottom,
        .badge-level-screen .levels-grid-bottom { 
          display:flex !important; 
          justify-content:flex-start !important; 
          gap:24px !important; 
          margin-top:0 !important; 
          margin-right: 0 !important; 
          flex-wrap:nowrap !important; 
          align-items:center !important; 
          position: relative !important;
        }
        /* \u0421\u043d\u0438\u043c\u0430\u0435\u043c \u043e\u0442\u0441\u0442\u0443\u043f-\u00ab\u043f\u0440\u0438\u0448\u0432\u0430\u0440\u0442\u043e\u0432\u043a\u0443\u00bb \u0441\u043f\u0440\u0430\u0432\u0430 \u0434\u043b\u044f \u0434\u043e\u043a\u0430 \u043d\u0430 \u044d\u043a\u0440\u0430\u043d\u0435 \u0443\u0440\u043e\u0432\u043d\u044f \u0442\u043e\u0436\u0435 */
        .badge-level-screen .levels-dock { 
          margin-right: 0 !important; 
          justify-content: flex-start !important;
        }
        
        /* \u0422\u043e\u0447\u0435\u0447\u043d\u044b\u0435 \u043f\u0440\u0430\u0432\u043a\u0438 \u0434\u043b\u044f \u0433\u0440\u0443\u043f\u043f\u044b 1.4 */
        .badge--group-1-4 .badge-summary__right {
          height: auto;
          min-height: 100%;
          overflow: visible;
          padding-bottom: 24px;
        }
        .badge-evidence { margin-top: 0.6rem; border-top: 1px dashed rgba(255,255,255,0.2); padding-top: 0.6rem; }

        /* \u0421\u0442\u0438\u043b\u0438 \u0434\u043b\u044f \u043d\u043e\u0432\u044b\u0445 \u044d\u043a\u0440\u0430\u043d\u043e\u0432 */
        .header-content {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 0.5rem;
          position: relative;
          /* \u0423\u0431\u0438\u0440\u0430\u0435\u043c \u0441\u0435\u0440\u044b\u0439 \u043f\u043e\u043b\u0443\u043f\u0440\u043e\u0437\u0440\u0430\u0447\u043d\u044b\u0439 \u043e\u0432\u0435\u0440\u043b\u0435\u0439 */
          padding: 0.7rem 1rem;
          border-radius: 16px;
          overflow: hidden;
        }
        /* \u0423\u0431\u0438\u0440\u0430\u0435\u043c \u043e\u0432\u0435\u0440\u043b\u0435\u0439 \u0434\u043b\u044f header-content */
        .header-content > * {
          position: relative;
          z-index: 1;
        }
        /* Center header texts on screens 2 and 3 */
        .categories-screen .header-content,
        .category-screen .header-content {
          align-items: center;
          text-align: center;
          width: 100%;
        }

        .hint-button, .material-button {
          position: relative;
          background: rgba(8, 24, 48, 0.55);
          color: #e6f7ff;
          border: 1px solid rgba(78, 205, 196, 0.35);
          padding: 0.5rem 1rem;
          border-radius: 20px;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.3s ease, box-shadow 0.3s ease, background 0.3s ease;
          box-shadow: 0 0 18px rgba(78, 205, 196, 0.25);
          overflow: hidden;
        }

        .hint-button:hover, .material-button:hover {
          transform: translateY(-2px);
          border-color: rgba(78, 205, 196, 0.6);
          background: rgba(12, 36, 64, 0.65);
          box-shadow: 0 0 28px rgba(78, 205, 196, 0.45);
        }

        .additional-materials-buttons {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
          justify-content: center;
          margin-top: 0.5rem;
          max-width: 100%;
          padding: 0.6rem 0.75rem;
          background: rgba(4, 12, 28, 0.65);
          border-radius: 16px;
          box-shadow: 0 12px 28px rgba(0, 0, 0, 0.45);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(78, 205, 196, 0.25);
        }
        
        .material-button {
          font-size: 0.8rem;
          padding: 0.45rem 0.75rem;
          white-space: nowrap;
          min-width: fit-content;
          border: 1px solid rgba(78, 205, 196, 0.45);
          background: rgba(78, 205, 196, 0.12);
          color: #e8feff;
          box-shadow: 0 0 18px rgba(78, 205, 196, 0.3);
        }

        .material-button::after {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 18px;
          border: 1px solid rgba(255, 255, 255, 0.15);
          box-shadow: 0 0 16px rgba(78, 205, 196, 0.35);
          opacity: 0.65;
          pointer-events: none;
          transition: opacity 0.3s ease, box-shadow 0.3s ease;
        }
        
        .material-button:hover {
          background: rgba(78, 205, 196, 0.22);
          border-color: rgba(78, 205, 196, 0.65);
          box-shadow: 0 0 22px rgba(78, 205, 196, 0.45);
          transform: translateY(-2px) scale(1.05);
        }

        .material-button:hover::after {
          opacity: 0.9;
          box-shadow: 0 0 26px rgba(78, 205, 196, 0.55);
        }

        .introduction-screen, .additional-material-screen {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          overflow-x: hidden;
          overflow-y: auto;
          padding: 1rem;
          background: 
            linear-gradient(135deg, rgba(12, 12, 12, 0.3) 0%, rgba(26, 26, 46, 0.3) 50%, rgba(22, 33, 62, 0.3) 100%),
            url('/RL-Guide-book/screen3_bg.png') center center / 100% no-repeat;
        }

        .introduction-content, .additional-material-content {
          max-width: 700px;
          margin: 0 auto;
          background: rgba(0, 0, 0, 0.4);
          padding: 1.5rem;
          border-radius: 15px;
          backdrop-filter: blur(15px);
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(255, 215, 0, 0.3);
          position: relative;
          overflow: hidden;
        }

        .introduction-content::before, .additional-material-content::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, #FFD700, #FFA500, #FFD700);
          background-size: 200% 100%;
          animation: shimmer 3s ease-in-out infinite;
        }

        .introduction-text, .additional-material-text {
          color: #ffffff;
          line-height: 1.5;
          font-size: 0.95rem;
          position: relative;
          z-index: 1;
          white-space: pre-line;
        }

        /* \u041d\u043e\u0440\u043c\u0430\u043b\u0438\u0437\u0430\u0446\u0438\u044f \u0442\u0435\u043a\u0441\u0442\u0430 - \u0443\u0431\u0438\u0440\u0430\u0435\u043c \u043b\u0438\u0448\u043d\u0438\u0435 \u043f\u0440\u043e\u0431\u0435\u043b\u044b \u0438 \u0440\u0430\u0437\u0440\u044b\u0432\u044b */
        .introduction-text *, .additional-material-text * {
          white-space: normal;
          color: inherit;
        }

        .introduction-text p, .additional-material-text p {
          white-space: pre-line;
        }

        /* \u0423\u0431\u0438\u0440\u0430\u0435\u043c \u0434\u0432\u043e\u0439\u043d\u044b\u0435 \u043f\u0440\u043e\u0431\u0435\u043b\u044b \u0438 \u043d\u043e\u0440\u043c\u0430\u043b\u0438\u0437\u0443\u0435\u043c \u0442\u0435\u043a\u0441\u0442 */
        .introduction-text, .additional-material-text {
          text-rendering: optimizeLegibility;
          font-variant-ligatures: none;
        }

        /* \u041d\u043e\u0440\u043c\u0430\u043b\u0438\u0437\u0430\u0446\u0438\u044f \u043f\u0440\u043e\u0431\u0435\u043b\u043e\u0432 \u0432 \u0442\u0435\u043a\u0441\u0442\u0435 */
        .introduction-text p, .additional-material-text p {
          text-align: justify;
          word-spacing: normal;
          letter-spacing: normal;
        }

        /* \u0423\u0431\u0438\u0440\u0430\u0435\u043c \u043b\u0438\u0448\u043d\u0438\u0435 \u043e\u0442\u0441\u0442\u0443\u043f\u044b \u0432 \u043d\u0430\u0447\u0430\u043b\u0435 \u0438 \u043a\u043e\u043d\u0446\u0435 */
        .introduction-text p:first-child, .additional-material-text p:first-child {
          margin-top: 0;
        }

        .introduction-text p:last-child, .additional-material-text p:last-child {
          margin-bottom: 0;
        }

        /* \u041e\u0431\u0440\u0430\u0431\u043e\u0442\u043a\u0430 HTML \u043a\u043e\u043d\u0442\u0435\u043d\u0442\u0430 \u0441 \u043b\u0438\u0448\u043d\u0438\u043c\u0438 \u043f\u0440\u043e\u0431\u0435\u043b\u0430\u043c\u0438 */
        .introduction-text br + br, .additional-material-text br + br {
          display: none;
        }

        .introduction-text p:empty, .additional-material-text p:empty {
          display: none;
        }

        /* \u0423\u0431\u0438\u0440\u0430\u0435\u043c \u043b\u0438\u0448\u043d\u0438\u0435 \u0440\u0430\u0437\u0440\u044b\u0432\u044b \u043c\u0435\u0436\u0434\u0443 \u0430\u0431\u0437\u0430\u0446\u0430\u043c\u0438 */
        .introduction-text p + p, .additional-material-text p + p {
          margin-top: 0.1rem !important;
        }

        /* \u0423\u0431\u0438\u0440\u0430\u0435\u043c \u043b\u0438\u0448\u043d\u0438\u0435 \u0440\u0430\u0437\u0440\u044b\u0432\u044b \u043f\u043e\u0441\u043b\u0435 \u0437\u0430\u0433\u043e\u043b\u043e\u0432\u043a\u043e\u0432 */
        .introduction-text h1 + p, .additional-material-text h1 + p,
        .introduction-text h2 + p, .additional-material-text h2 + p,
        .introduction-text h3 + p, .additional-material-text h3 + p,
        .introduction-text h4 + p, .additional-material-text h4 + p {
          margin-top: 0.1rem !important;
        }

        /* \u0423\u0431\u0438\u0440\u0430\u0435\u043c \u043b\u0438\u0448\u043d\u0438\u0435 \u0440\u0430\u0437\u0440\u044b\u0432\u044b \u043f\u0435\u0440\u0435\u0434 \u0437\u0430\u0433\u043e\u043b\u043e\u0432\u043a\u0430\u043c\u0438 */
        .introduction-text p + h1, .additional-material-text p + h1,
        .introduction-text p + h2, .additional-material-text p + h2,
        .introduction-text p + h3, .additional-material-text p + h3,
        .introduction-text p + h4, .additional-material-text p + h4 {
          margin-top: 0.2rem !important;
        }

        /* \u041d\u043e\u0440\u043c\u0430\u043b\u0438\u0437\u0430\u0446\u0438\u044f \u043f\u0440\u043e\u0431\u0435\u043b\u043e\u0432 \u0432 HTML */
        .introduction-text, .additional-material-text {
          font-kerning: normal;
          text-transform: none;
        }

        /* \u0410\u0433\u0440\u0435\u0441\u0441\u0438\u0432\u043d\u043e\u0435 \u0443\u0431\u0438\u0440\u0430\u043d\u0438\u0435 \u0432\u0441\u0435\u0445 \u043b\u0438\u0448\u043d\u0438\u0445 \u043e\u0442\u0441\u0442\u0443\u043f\u043e\u0432 */
        .introduction-text *, .additional-material-text * {
          margin-top: 0 !important;
          margin-bottom: 0 !important;
        }

        /* \u0412\u043e\u0441\u0441\u0442\u0430\u043d\u0430\u0432\u043b\u0438\u0432\u0430\u0435\u043c \u043c\u0438\u043d\u0438\u043c\u0430\u043b\u044c\u043d\u044b\u0435 \u043e\u0442\u0441\u0442\u0443\u043f\u044b \u0442\u043e\u043b\u044c\u043a\u043e \u0442\u0430\u043c, \u0433\u0434\u0435 \u043d\u0443\u0436\u043d\u043e */
        .introduction-text p, .additional-material-text p {
          margin-top: 0.1rem !important;
          margin-bottom: 0.1rem !important;
        }

        .introduction-text h1, .additional-material-text h1 {
          margin-top: 0 !important;
          margin-bottom: 0.1rem !important;
        }

        .introduction-text h2, .additional-material-text h2 {
          margin-top: 0.2rem !important;
          margin-bottom: 0.1rem !important;
        }

        .introduction-text h3, .additional-material-text h3 {
          margin-top: 0.2rem !important;
          margin-bottom: 0.1rem !important;
        }

        .introduction-text h4, .additional-material-text h4 {
          margin-top: 0.1rem !important;
          margin-bottom: 0.05rem !important;
        }


        /* \u0423\u0431\u0438\u0440\u0430\u0435\u043c \u043b\u0438\u0448\u043d\u0438\u0435 \u043e\u0442\u0441\u0442\u0443\u043f\u044b \u043c\u0435\u0436\u0434\u0443 \u0437\u0430\u0433\u043e\u043b\u043e\u0432\u043a\u0430\u043c\u0438 \u0438 \u043f\u0430\u0440\u0430\u0433\u0440\u0430\u0444\u0430\u043c\u0438 */
        .introduction-text h1 + p, .additional-material-text h1 + p,
        .introduction-text h2 + p, .additional-material-text h2 + p,
        .introduction-text h3 + p, .additional-material-text h3 + p,
        .introduction-text h4 + p, .additional-material-text h4 + p {
          margin-top: 0.1rem;
        }

        .introduction-text p + h1, .additional-material-text p + h1,
        .introduction-text p + h2, .additional-material-text p + h2,
        .introduction-text p + h3, .additional-material-text p + h3,
        .introduction-text p + h4, .additional-material-text p + h4 {
          margin-top: 0.2rem;
        }

        .introduction-text h1 + h2, .additional-material-text h1 + h2,
        .introduction-text h2 + h3, .additional-material-text h2 + h3,
        .introduction-text h3 + h4, .additional-material-text h3 + h4 {
          margin-top: 0.1rem;
        }

        .introduction-text h1, .additional-material-text h1 {
          color: #FFD700;
          font-size: 1.8rem;
          margin-top: 0;
          margin-bottom: 0.1rem;
          text-align: center;
          text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
          font-weight: bold;
        }

        .introduction-text h2, .additional-material-text h2 {
          color: #FFA500;
          font-size: 1.4rem;
          margin-top: 0.2rem;
          margin-bottom: 0.1rem;
          text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
          font-weight: 600;
        }

        .introduction-text h3, .additional-material-text h3 {
          color: #FFD700;
          font-size: 1.1rem;
          margin-top: 0.2rem;
          margin-bottom: 0.1rem;
          font-weight: 600;
        }

        .introduction-text h4, .additional-material-text h4 {
          color: #FFA500;
          font-size: 1rem;
          margin-top: 0.1rem;
          margin-bottom: 0.05rem;
          font-weight: 600;
        }

        .introduction-text p, .additional-material-text p {
          margin-top: 0.1rem;
          margin-bottom: 0.1rem;
          color: #e8e8e8;
          opacity: 0.95;
        }

        .introduction-text ul, .additional-material-text ul,
        .introduction-text ol, .additional-material-text ol {
          margin-top: 0.1rem;
          margin-bottom: 0.1rem;
          padding-left: 1.2rem;
        }

        .introduction-text li, .additional-material-text li {
          margin-top: 0.02rem;
          margin-bottom: 0.02rem;
          color: #e8e8e8;
          opacity: 0.95;
        }

        .introduction-text strong, .additional-material-text strong {
          color: #FFD700;
          font-weight: bold;
          opacity: 1;
        }

        .introduction-text em, .additional-material-text em {
          color: #FFA500;
          font-style: italic;
          opacity: 1;
        }

        .introduction-text pre, .additional-material-text pre {
          background: rgba(0, 0, 0, 0.6);
          padding: 0.6rem;
          border-radius: 8px;
          overflow-x: auto;
          margin-top: 0.1rem;
          margin-bottom: 0.1rem;
          border: 1px solid rgba(255, 215, 0, 0.2);
        }

        .introduction-text code, .additional-material-text code {
          background: rgba(0, 0, 0, 0.6);
          padding: 0.2rem 0.4rem;
          border-radius: 4px;
          font-family: 'Courier New', monospace;
          color: #FFD700;
          border: 1px solid rgba(255, 215, 0, 0.2);
        }

        .introduction-text blockquote, .additional-material-text blockquote {
          border-left: 3px solid #FFD700;
          padding-left: 0.6rem;
          margin-top: 0.1rem;
          margin-bottom: 0.1rem;
          background: rgba(255, 215, 0, 0.1);
          padding: 0.6rem;
          border-radius: 0 8px 8px 0;
        }

        /* \u0410\u0434\u0430\u043f\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c \u0434\u043b\u044f \u043c\u043e\u0431\u0438\u043b\u044c\u043d\u044b\u0445 \u0443\u0441\u0442\u0440\u043e\u0439\u0441\u0442\u0432 */
        @media (max-width: 768px) {
          .additional-materials-buttons {
            flex-direction: column;
            align-items: center;
          }

          .material-button {
            width: 100%;
            max-width: 200px;
          }

          .introduction-content, .additional-material-content {
            padding: 1.2rem;
            margin: 0.5rem;
            max-width: 95%;
          }

          .introduction-text h1, .additional-material-text h1 {
            font-size: 1.6rem;
          }

          .introduction-text h2, .additional-material-text h2 {
            font-size: 1.3rem;
          }

          .introduction-text h3, .additional-material-text h3 {
            font-size: 1.1rem;
          }

          .introduction-text h4, .additional-material-text h4 {
            font-size: 1rem;
          }
        }

        /* Session Info Styles */
        .session-info {
          background: 
            linear-gradient(rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.3)),
            url('/RL-Guide-book/pictures/Stan_Pol__beutiful_camera__vector_logo_e16e2508-69e8-4bf6-9cdf-8b7012558c5e.png') center 10%/50% no-repeat;
          border: 2px solid rgba(255, 215, 0, 0.6);
          border-radius: 15px;
          padding: 15px;
          margin: 15px 0;
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(5px);
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .session-info::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, #FFD700, #FFA500, #FFD700);
          background-size: 200% 100%;
          animation: shimmer 3s ease-in-out infinite;
        }

        @keyframes shimmer {
          0%, 100% { background-position: 200% 0; }
          50% { background-position: -200% 0; }
        }

        .session-info.clickable:hover {
          transform: translateY(-5px);
          box-shadow: 0 15px 40px rgba(255, 215, 0, 0.3);
          border-color: rgba(255, 215, 0, 0.9);
          background: 
            linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)),
            url('/RL-Guide-book/pictures/Stan_Pol__beutiful_camera__vector_logo_e16e2508-69e8-4bf6-9cdf-8b7012558c5e.png') center 10%/50% no-repeat;
        }

        .session-info h4 {
          color: #FFD700;
          margin-bottom: 10px;
          font-size: 16px;
          font-weight: bold;
          text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
        }

        .session-info p {
          color: #ffffff;
          margin-bottom: 8px;
          font-size: 13px;
          line-height: 1.4;
        }

        .session-info ul {
          color: #ffffff;
          margin: 10px 0;
          padding-left: 20px;
        }

        .session-info li {
          margin-bottom: 5px;
          font-size: 13px;
          line-height: 1.3;
        }

        .session-info em {
          color: #FFD700;
          font-weight: bold;
          text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
        }

        .session-image {
          width: 100%;
          max-width: 300px;
          height: auto;
          border-radius: 10px;
          margin-bottom: 12px;
          box-shadow: 0 6px 15px rgba(0, 0, 0, 0.3);
          transition: all 0.3s ease;
        }

        .session-info:hover .session-image {
          transform: scale(1.02);
          box-shadow: 0 12px 25px rgba(255, 215, 0, 0.2);
        }

        /* Registration Form Styles */
        .registration-form-screen {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          overflow-x: hidden;
          overflow-y: auto;
          padding: 1rem;
          background: 
            linear-gradient(135deg, rgba(12, 12, 12, 0.3) 0%, rgba(26, 26, 46, 0.3) 50%, rgba(22, 33, 62, 0.3) 100%),
            url('/RL-Guide-book/screen3_bg.png') center center / 100% no-repeat;
        }

        .registration-form-content {
          max-width: 500px;
          margin: 0 auto;
          padding: 1.5rem 0;
        }

        .form-container {
          background: rgba(0, 0, 0, 0.4);
          padding: 1.5rem;
          border-radius: 15px;
          backdrop-filter: blur(15px);
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(255, 215, 0, 0.5);
          position: relative;
          overflow: hidden;
        }

        .form-container::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, #FFD700, #FFA500, #FFD700);
          background-size: 200% 100%;
          animation: shimmer 3s ease-in-out infinite;
        }

        .form-container h2 {
          color: #FFD700;
          font-size: 22px;
          margin-bottom: 8px;
          text-align: center;
          text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
          font-weight: bold;
        }

        .form-container p {
          color: #ffffff;
          text-align: center;
          margin-bottom: 25px;
          font-size: 14px;
          opacity: 0.8;
          line-height: 1.4;
        }

        .form-group {
          margin-bottom: 16px;
        }

        .form-group label {
          display: block;
          color: #FFD700;
          font-size: 14px;
          font-weight: bold;
          margin-bottom: 6px;
          text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
        }

        .form-group input,
        .form-group textarea {
          width: 100%;
          padding: 10px 14px;
          border: 1px solid rgba(255, 215, 0, 0.4);
          border-radius: 8px;
          background: rgba(0, 0, 0, 0.3);
          color: #ffffff;
          font-size: 14px;
          transition: all 0.3s ease;
          box-sizing: border-box;
        }

        .form-group input:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: rgba(255, 215, 0, 0.8);
          box-shadow: 0 0 10px rgba(255, 215, 0, 0.3);
          background: rgba(0, 0, 0, 0.5);
        }

        .form-group input::placeholder,
        .form-group textarea::placeholder {
          color: rgba(255, 255, 255, 0.4);
        }

        .form-group textarea {
          resize: vertical;
          min-height: 70px;
        }

        .submit-button {
          width: 100%;
          padding: 12px 20px;
          background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
          color: #2c3e50;
          border: none;
          border-radius: 10px;
          font-size: 16px;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 6px 20px rgba(255, 215, 0, 0.3);
          margin-top: 15px;
        }

        .submit-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(255, 215, 0, 0.4);
          background: linear-gradient(135deg, #FFE55C 0%, #FFB84D 100%);
        }

        .submit-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        /* \u0410\u0434\u0430\u043f\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c \u0434\u043b\u044f \u043c\u043e\u0431\u0438\u043b\u044c\u043d\u044b\u0445 \u0443\u0441\u0442\u0440\u043e\u0439\u0441\u0442\u0432 */
        @media (max-width: 768px) {
          .registration-form-content {
            padding: 1rem 0;
            max-width: 90%;
          }

          .form-container {
            padding: 1.2rem;
            margin: 0 0.5rem;
          }

          .form-container h2 {
            font-size: 18px;
          }

          .form-container p {
            font-size: 13px;
          }

          .form-group input,
          .form-group textarea {
            font-size: 16px; /* \u041f\u0440\u0435\u0434\u043e\u0442\u0432\u0440\u0430\u0449\u0430\u0435\u0442 \u0437\u0443\u043c \u043d\u0430 iOS */
            padding: 12px 14px;
          }

          .submit-button {
            padding: 14px 20px;
            font-size: 16px;
          }
        }
        /* Override: banners */
        /* \u0423\u0431\u0438\u0440\u0430\u0435\u043c \u043e\u0431\u0449\u0438\u0439 \u043e\u0432\u0435\u0440\u043b\u0435\u0439 header - \u043e\u0441\u0442\u0430\u0432\u043b\u044f\u0435\u043c \u0442\u043e\u043b\u044c\u043a\u043e \u0441\u043f\u0435\u0446\u0438\u0430\u043b\u044c\u043d\u044b\u0439 \u0434\u043b\u044f \u0437\u0430\u0433\u043e\u043b\u043e\u0432\u043a\u0430 */
        /* \u0423\u0431\u0438\u0440\u0430\u0435\u043c \u043e\u0432\u0435\u0440\u043b\u0435\u0439 \u0434\u043b\u044f category-screen header */
        .badge-screen .header { 
          background: 
            linear-gradient(135deg, rgba(0, 0, 0, 0.3) 0%, rgba(0, 0, 0, 0.2) 100%),
            url('/RL-Guide-book/pattern_stickers.jpg') center top / cover no-repeat !important;
        }
        /* Unify header heights between categories (screen 2) and category (screen 3) */
        .categories-screen .header,
        .category-screen .header {
          min-height: 140px;
          display: block;
          padding: 0.6rem 0.8rem;
        }
        /* Center content within header on screens 2 and 3 */
        .categories-screen .header,
        .category-screen .header {
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }
        .categories-screen .header .back-button,
        .category-screen .header .back-button {
          position: absolute;
          left: 8px;
          top: 8px;
          margin-bottom: 0;
          z-index: 5;
          pointer-events: auto;
        }
        /* Normalize About Camp banner and center content */
        .about-camp-screen .header {
          background:
            linear-gradient(135deg, rgba(0, 0, 0, 0.3) 0%, rgba(0, 0, 0, 0.2) 100%),
            url('/RL-Guide-book/pattern_stickers.jpg') center top / cover no-repeat !important;
          min-height: 140px;
          padding: 0.6rem 0.8rem;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }
        .about-camp-screen .header .back-button {
          position: absolute;
          left: 8px;
          top: 8px;
          margin-bottom: 0;
          z-index: 5;
          pointer-events: auto;
        }
        /* Center header content on other screens as well */
        .introduction-screen .header,
        .additional-material-screen .header,
        .registration-form-screen .header,
        .badge-screen .header,
        .badge-level-screen .header {
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          padding: 0.6rem 0.8rem;
          min-height: 140px; /* align with other screens */
        }
        .introduction-screen .header .back-button,
        .additional-material-screen .header .back-button,
        .registration-form-screen .header .back-button,
        .badge-screen .header .back-button,
        .badge-level-screen .header .back-button {
          position: absolute;
          left: 8px;
          top: 8px;
          margin-bottom: 0;
          z-index: 5;
          pointer-events: auto;
        }
      `

export default appStyles;
