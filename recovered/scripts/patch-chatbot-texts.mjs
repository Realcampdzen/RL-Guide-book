import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const file = resolve(process.cwd(), 'src/components/ChatBot.tsx');
let s = readFileSync(file, 'utf8');

// Generic safe replacements
s = s.replace(/data\.response\s*\|\|\s*'[^']*'/, "data.response || 'Извините, произошла ошибка'");
s = s.replace(/data\.message\s*\|\|\s*'[^']*'/, "data.message || 'Сервис временно недоступен'");

// Network error message inside catch
s = s.replace(/text:\s*'[^']*'\s*,\s*\n\s*isUser:\s*false\s*,\s*\n\s*timestamp:/, "text: 'Произошла ошибка сети. Проверьте, что бэкенд запущен.',\n          isUser: false,\n          timestamp:");

// Loading label
s = s.replace(/<span className=\"chatbot-loading-text\">[\s\S]*?<\/span>/, '<span className="chatbot-loading-text">Чат-бот думает...</span>');

// Input placeholder
s = s.replace(/placeholder=\"[^\"]*\"\s*\n\s*className=\"chatbot-input\"/, 'placeholder="Введите сообщение..."\n              className="chatbot-input"');

// Send button label
s = s.replace(/className=\"chatbot-send-btn\"[\s\S]*?<\/button>/, 'className="chatbot-send-btn">\n              Отправить\n            </button>');

// Welcome avatar, title and texts
s = s.replace(/src=\"\/[^\"]*\.jpg\"\s*\n\s*\s*alt=\"[^\"]*\"/, 'src="/badges_photo.jpg"\n                  alt="Чат-бот"');
s = s.replace(/<h3 className=\"chatbot-welcome-title\">[\s\S]*?<\/h3>/, '<h3 className="chatbot-welcome-title">\n                Привет! 👋\n              </h3>');
s = s.replace(/<p className=\"chatbot-welcome-text\">[\s\S]*?<\/p>/, '<p className="chatbot-welcome-text">\n                Я ваш помощник.\n              </p>');
s = s.replace(/<p className=\"chatbot-welcome-subtext\">[\s\S]*?<\/p>/, '<p className="chatbot-welcome-subtext">\n                Если что-то пойдёт не так — подскажу! 🙂\n              </p>');

// Context labels (best-effort plain replacements of garbled text)
s = s.replace('������� ��࠭�� - ������� ���窮�', 'Стартовый экран — значки');
s = s.replace('� �����', 'О лагере');
s = s.replace('���᮪ ��⥣�਩', 'Список категорий');
s = s.replace('���箪:', 'Значок:');
s = s.replace('��⥣���:', 'Категория:');

writeFileSync(file, s, 'utf8');
console.log('Patched ChatBot.tsx texts');

