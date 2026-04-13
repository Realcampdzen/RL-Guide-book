/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './profile-desktop.html', './src/**/*.{js,ts,jsx,tsx}'],
  // Не сбрасываем глобальные стили — существующий profile-view-spaceship.css остаётся главным
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      // Совпадают с брейкпоинтами кабины в profile-view-spaceship.css (планшет 768–1180px, десктоп 1181px+)
      screens: {
        tablet: '768px',
        desktop: '1181px',
      },
      transitionDuration: {
        btn: '200ms',
      },
    },
  },
  plugins: [],
};
