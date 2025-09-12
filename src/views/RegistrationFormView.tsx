import React from 'react';

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

const RegistrationFormView: React.FC<RegistrationFormViewProps> = ({ formData, onBack, onChange, onSubmit }) => {
  const disabled = !formData.childName || !formData.parentName || !formData.phone || !formData.childAge;
  return (
    <div className="registration-form-screen">
      <div className="header">
        <button onClick={onBack} className="back-button">← Назад к введению</button>
        <h1 className="app-title">Запись в лагерь</h1>
      </div>
      <div className="registration-form-content">
        <div className="form-container">
          <h2>Заполните анкету</h2>
          <p>Мы свяжемся с вами в ближайшее время.</p>

          <div className="form-group">
            <label>Имя ребёнка *</label>
            <input
              type="text"
              value={formData.childName}
              onChange={(e) => onChange('childName', e.target.value)}
              placeholder="Иван"
              required
            />
          </div>

          <div className="form-group">
            <label>Имя и фамилия родителя *</label>
            <input
              type="text"
              value={formData.parentName}
              onChange={(e) => onChange('parentName', e.target.value)}
              placeholder="Мария Иванова"
              required
            />
          </div>

          <div className="form-group">
            <label>Телефон *</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => onChange('phone', e.target.value)}
              placeholder="+7 (999) 123-45-67"
              required
            />
          </div>

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => onChange('email', e.target.value)}
              placeholder="you@example.com"
            />
          </div>

          <div className="form-group">
            <label>Возраст ребёнка *</label>
            <input
              type="number"
              value={formData.childAge}
              onChange={(e) => onChange('childAge', e.target.value)}
              min="6"
              max="17"
              required
            />
          </div>

          <div className="form-group">
            <label>Пожелания</label>
            <textarea
              value={formData.specialRequests}
              onChange={(e) => onChange('specialRequests', e.target.value)}
              placeholder="Аллергии, особенности здоровья, пожелания..."
              rows={3}
            />
          </div>

          <button className="submit-button" onClick={onSubmit} disabled={disabled}>
            Отправить в Telegram
          </button>
        </div>
      </div>
    </div>
  );
};

export default RegistrationFormView;

