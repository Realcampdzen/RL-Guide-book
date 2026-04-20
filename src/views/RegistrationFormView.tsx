import type React from 'react';
import { useEffect } from 'react';
import '../styles/registration-form.css';

interface RegistrationFormData {
  childName: string;
  parentName: string;
  phone: string;
  email: string;
  childAge: string;
  specialRequests: string;
}

interface RegistrationFormViewProps {
  formData: RegistrationFormData;
  onBack: () => void;
  onChange: (field: keyof RegistrationFormData, value: string) => void;
  onSubmit: () => void;
}

const RegistrationFormView: React.FC<RegistrationFormViewProps> = ({
  formData,
  onBack,
  onChange,
  onSubmit,
}) => {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, []);

  const disabled =
    !formData.childName || !formData.parentName || !formData.phone || !formData.childAge;
  return (
    <div className="registration-form-view">
      <header 
        className="registration-form-topbar" 
        aria-label="Навигация"
        style={{ position: 'relative', inset: 'auto' }}
      >
        <div className="registration-form-topbar-inner">
          <button type="button" onClick={onBack} className="registration-form-back">
            <span aria-hidden="true">←</span>
            <span>Назад</span>
          </button>
          <h1 className="registration-form-title">🎪 Запись в лагерь</h1>
        </div>
      </header>

      <main 
        className="registration-form-content" 
        style={{ 
          paddingTop: '24px', 
          paddingBottom: '120px' 
        }}
      >
        <section className="registration-form-card">
          <h2>📝 Заполните анкету</h2>
          <p>Мы свяжемся с вами в ближайшее время.</p>

          <div className="rf-group">
            <label>Имя ребёнка</label>
            <input
              type="text"
              value={formData.childName}
              onChange={(e) => onChange('childName', e.target.value)}
              placeholder="Иван"
              required
            />
          </div>

          <div className="rf-group">
            <label>Имя и фамилия родителя</label>
            <input
              type="text"
              value={formData.parentName}
              onChange={(e) => onChange('parentName', e.target.value)}
              placeholder="Мария Иванова"
              required
            />
          </div>

          <div className="rf-group">
            <label>Телефон</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => onChange('phone', e.target.value)}
              placeholder="+7 (999) 123-45-67"
              required
            />
          </div>

          <div className="rf-group">
            <label>Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => onChange('email', e.target.value)}
              placeholder="you@example.com"
            />
          </div>

          <div className="rf-group">
            <label>Возраст ребёнка</label>
            <input
              type="number"
              value={formData.childAge}
              onChange={(e) => onChange('childAge', e.target.value)}
              min="6"
              max="17"
              required
            />
          </div>

          <div className="rf-group">
            <label>Пожелания</label>
            <textarea
              value={formData.specialRequests}
              onChange={(e) => onChange('specialRequests', e.target.value)}
              placeholder="Аллергии, особенности здоровья, пожелания..."
              rows={3}
            />
          </div>

          <button type="button" className="rf-submit" onClick={onSubmit} disabled={disabled}>
            🚀 Отправить в Telegram
          </button>
        </section>
        <div aria-hidden="true" style={{ height: '120px', width: '100%', flexShrink: 0 }} />
      </main>
    </div>
  );
};

export default RegistrationFormView;
