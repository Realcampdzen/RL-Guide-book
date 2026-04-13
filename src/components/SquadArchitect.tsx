import type React from 'react';
import { useEffect, useState } from 'react';
import { useUserProgress } from '../context/ProgressContext';

type TraditionScenario = {
  step2: string;
  step3: string;
  step4: string;
  skill: string;
  duration?: string;
  materials?: string;
  counselorTip?: string;
};

// Реальные сценарии для каждой традиции (что делать на этапе посвящения)
const TRADITION_SCENARIOS: Record<string, TraditionScenario> = {
  '🔥 Свечка (Огонек)': {
    step2:
      'Круг. Каждый говорит слово, которое ассоциирует с отрядом. Передача символа (свеча, камень, шишка) по кругу.',
    step3:
      'Огонёк «Почему я здесь». Вожатый задаёт вопрос: что ты принёс в отряд? Чего ждёшь от смены?',
    step4: 'Зажжение общей свечи отряда. Клятва верности традициям. Вручение символики.',
    skill: 'Коммуникация',
    duration: '25–40 мин',
    materials: 'Свеча (или безопасный свет), круг сидящих',
    counselorTip: 'Важно создать тишину и доверие. Не торопиться с вопросами.',
  },
  '💃 Отрядный танец': {
    step2: 'Разминка под общую музыку. Знакомство через движение — повторяй за соседом.',
    step3: 'Разучивание 3–4 движений. Каждый добавляет одно движение в общий танец.',
    step4: 'Первый общий танец отряда. Вручение браслета/ленты как символа единства.',
    skill: 'Коллаборация',
    duration: '30–45 мин',
    materials: 'Музыка, браслеты или ленты',
    counselorTip: 'Выбери простую музыку и движения — важно, чтобы все смогли.',
  },
  '🎤 Уникальная кричалка': {
    step2: 'Мозговой штурм: какие слова описывают наш отряд? Записываем на доску.',
    step3: 'Сочиняем кричалку из 2–4 строк. Рифма, ритм, имя отряда — обязательно.',
    step4: 'Первый совместный выкрик. Кричалка записывается в «Кодекс отряда».',
    skill: 'Креативность',
    duration: '20–35 мин',
    materials: 'Доска или лист бумаги, маркер',
    counselorTip: 'Поддерживай идеи детей, помоги с рифмой.',
  },
  '🤐 Ритуал тишины': {
    step2: 'Минута тишины. Все стоят в кругу, глаза закрыты. Слушаем звуки лагеря.',
    step3: 'Шёпотом по кругу передаём фразу: «Я с вами». Каждый добавляет своё.',
    step4: 'Рукопожатие по кругу — без слов. Вручение символа (камешек, перо).',
    skill: 'Коммуникация',
    duration: '15–25 мин',
    materials: 'Камешки, перо или другой символ',
    counselorTip: 'Тишина — главный инструмент. Дай время на осмысление.',
  },
  '🎁 Тайный друг': {
    step2: 'Жеребьёвка: каждый тянет имя. Не говорить никому!',
    step3: 'День 1: сделай что-то приятное тайному другу (записка, подарок, помощь).',
    step4: 'Раскрытие в конце смены. Благодарность и объятия.',
    skill: 'Коллаборация',
    duration: '10–15 мин (старт) + вся смена',
    materials: 'Бумажки с именами, конверт',
    counselorTip: 'Напомни на 2–3 день о тайных друзьях.',
  },
  '🏳️ Поднятие флага': {
    step2: 'Обсуждение: какой символ у нашего отряда? Цвета, эмблема, девиз.',
    step3: 'Создание флага: рисование, аппликация. Каждый оставляет след.',
    step4: 'Церемония поднятия. Клятва под флагом. Фото на память.',
    skill: 'Креативность',
    duration: '40–60 мин',
    materials: 'Ткань, краски, кисти, фломастеры',
    counselorTip: 'Заранее подготовь основу флага.',
  },
  '📜 Клятва отряда': {
    step2: 'Обсуждение: какие правила важны для нашего отряда? Записываем 3–5 пунктов.',
    step3: 'Сочиняем клятву из 2–3 предложений. Каждый читает вслух.',
    step4: 'Хором произносим клятву. Подпись на «свитке» (лист ватмана).',
    skill: 'Критическое мышление',
    duration: '25–40 мин',
    materials: 'Ватман, маркеры',
    counselorTip: 'Пусть дети сами формулируют правила.',
  },
  '🌅 Приветствие солнцу': {
    step2: 'Сбор на рассвете. Минута тишины. Наблюдение за восходом.',
    step3: 'Каждый говорит одно слово — пожелание на день. По кругу.',
    step4: 'Общий крик «Доброе утро, [название отряда]!». Хлопок в ладоши.',
    skill: 'Коммуникация',
    duration: '15–20 мин',
    materials: '—',
    counselorTip: 'Уточни время рассвета, разбуди заранее.',
  },
  '🪶 Передача пера': {
    step2: 'Круг. Вожатый передаёт перо (или символ) первому. Тот говорит о себе — 1 минута.',
    step3: 'Передача по кругу. Каждый добавляет: имя, что умею, чего жду.',
    step4: 'Перо возвращается вожатому. «Отныне мы — один отряд». Общее рукопожатие.',
    skill: 'Коммуникация',
    duration: '20–35 мин',
    materials: 'Перо, камешек или другой «говорящий» символ',
    counselorTip: 'Ограничь время выступления, чтобы все успели.',
  },
  '🎭 Маска отряда': {
    step2: 'Каждый получает заготовку маски. Рисуем: каким я хочу быть в отряде?',
    step3: 'Показ масок по кругу. Краткое объяснение: почему такие цвета, символы?',
    step4: 'Маски собираются в «галерею отряда». Фото на память.',
    skill: 'Креативность',
    duration: '35–50 мин',
    materials: 'Заготовки масок, краски, фломастеры',
    counselorTip: 'Можно использовать бумажные тарелки или шаблоны.',
  },
  '🔥 Ритуал огня / костёр': {
    step2:
      'Путь испытаний: каждый выполняет небольшое задание (ответить на вопрос, показать умение).',
    step3: 'Вместе с педагогом зажигаем свечи или костёр — символ силы команды.',
    step4: 'Круг вокруг огня. Клятва отряда. Передача символики.',
    skill: 'Коммуникация',
    duration: '30–45 мин',
    materials: 'Свечи, зажигалка, площадка для костра (с соблюдением техники безопасности)',
    counselorTip: 'Строго соблюдай правила пожарной безопасности.',
  },
  '🔦 Испытание тьмой': {
    step2: 'Новичков проводят через тёмный маршрут (вечер, сумерки). Держась за руки.',
    step3: 'Символический поиск «света» — фонарики, лампа в конце пути.',
    step4: 'Выход к свету — момент «рождения». Вручение символа света.',
    skill: 'Критическое мышление',
    duration: '20–30 мин',
    materials: 'Фонарики, лампа, безопасный маршрут',
    counselorTip: 'Проверь маршрут заранее, обеспечь безопасность.',
  },
  '🎭 Театрализованный обряд': {
    step2: 'Вожатый рассказывает легенду — путь героя. Новички — главные персонажи.',
    step3: 'Инсценировка ключевых моментов: испытание, помощь, победа.',
    step4: 'Финал: герои получают награду — знак принадлежности к отряду.',
    skill: 'Креативность',
    duration: '35–50 мин',
    materials: 'Реквизит по легенде, костюмы (опционально)',
    counselorTip: 'Легенда должна быть простой и понятной.',
  },
  '🌍 Миссия Движка': {
    step2: 'Новички получают «паспорт миссии» — карточки с первыми задачами.',
    step3: 'Выполнение заданий: собрать команду, помочь, организовать мини-акцию.',
    step4: 'Отчёт о миссии. Торжественное принятие в Движок. Вручение значка.',
    skill: 'Коллаборация',
    duration: '40–60 мин',
    materials: 'Карточки с заданиями, значок или символ Движка',
    counselorTip: 'Задания должны быть выполнимы за один цикл.',
  },
  '🍗 Инициация Рыцарей Котлет': {
    step2: 'Легенда об ордене: помогаем официантам убирать со столов после обеда.',
    step3: 'Совместная работа — уборка. Торжественное шествие к «трону».',
    step4: 'Новобранец первым кусает котлету и хлеб. Вручение символа ордена.',
    skill: 'Коллаборация',
    duration: '25–40 мин',
    materials: 'Тарелка котлет, хлеб, символика ордена',
    counselorTip: 'Согласуй с kitchen/staff заранее.',
  },
  '⚔ Торжественная присяга': {
    step2: 'Обсуждение: какие ценности важны для отряда? Записываем в «кодекс».',
    step3: 'Каждый получает символический знак: лента, значок, оберег.',
    step4: 'Произнесение присяги хором. Подпись под текстом. Фото.',
    skill: 'Критическое мышление',
    duration: '25–35 мин',
    materials: 'Ленты, значки, обереги, лист с текстом присяги',
    counselorTip: 'Текст присяги — результат обсуждения с отрядом.',
  },
};

const traditionOptions = Object.keys(TRADITION_SCENARIOS);

export const SquadArchitect: React.FC<{
  diarySquadName?: string;
  onComplete?: (result: { name: string; traditions: string[] }) => void;
}> = ({ diarySquadName, onComplete }) => {
  const { saveSquadArchitectScenario } = useUserProgress();
  const [step, setStep] = useState(1);
  const [squadName, setSquadName] = useState('');
  const [traditions, setTraditions] = useState<string[]>([]);
  const [copyToast, setCopyToast] = useState(false);

  useEffect(() => {
    if (diarySquadName) setSquadName((prev) => prev || diarySquadName);
  }, [diarySquadName]);

  return (
    <div
      className="fade-in"
      style={{
        marginTop: '20px',
        padding: '20px',
        background: 'rgba(0,0,0,0.3)',
        borderRadius: '16px',
        border: '1px dashed rgba(255,255,255,0.1)',
      }}
    >
      <h4
        style={{
          margin: '0 0 16px 0',
          color: '#ffd700',
          textTransform: 'uppercase',
          fontSize: '14px',
        }}
      >
        🏗️ Архитектор Отряда
      </h4>

      {step === 1 && (
        <div>
          <label style={{ fontSize: '12px', opacity: 0.7, display: 'block', marginBottom: '8px' }}>
            Название Отряда (Стартапа)
          </label>
          <input
            value={squadName}
            onChange={(e) => setSquadName(e.target.value)}
            placeholder="Напр: 'Искра', 'Космодром', 'Новые Горизонты'"
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '10px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'white',
              marginBottom: '16px',
            }}
          />
          <button
            onClick={() => setStep(2)}
            style={{
              padding: '8px 16px',
              background: '#8b00ff',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            ДАЛЕЕ
          </button>
        </div>
      )}

      {step === 2 && (
        <div>
          <label style={{ fontSize: '12px', opacity: 0.7, display: 'block', marginBottom: '8px' }}>
            Код Традиций (Выберите 3 для сценария посвящения)
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
            {traditionOptions.map((t) => (
              <button
                key={t}
                onClick={() =>
                  setTraditions((prev) =>
                    prev.includes(t)
                      ? prev.filter((x) => x !== t)
                      : prev.length >= 3
                        ? prev
                        : [...prev, t]
                  )
                }
                style={{
                  padding: '6px 10px',
                  borderRadius: '8px',
                  border: `1px solid ${traditions.includes(t) ? '#38ef7d' : 'rgba(255,255,255,0.1)'}`,
                  background: traditions.includes(t) ? 'rgba(56, 239, 125, 0.1)' : 'transparent',
                  color: traditions.includes(t) ? '#38ef7d' : 'white',
                  fontSize: '11px',
                  cursor: 'pointer',
                }}
              >
                {t}
              </button>
            ))}
          </div>
          {traditions.length > 0 && (
            <p style={{ fontSize: '11px', opacity: 0.6, marginBottom: '12px' }}>
              4К:{' '}
              {[
                ...new Set(traditions.map((t) => TRADITION_SCENARIOS[t]?.skill).filter(Boolean)),
              ].join(', ')}
            </p>
          )}
          <button
            onClick={() => setStep(3)}
            disabled={traditions.length < 3}
            style={{
              padding: '8px 16px',
              background: traditions.length >= 3 ? '#8b00ff' : 'rgba(139,0,255,0.4)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: traditions.length >= 3 ? 'pointer' : 'not-allowed',
            }}
          >
            СГЕНЕРИРОВАТЬ ПОСВЯЩЕНИЕ
          </button>
        </div>
      )}

      {step === 3 &&
        (() => {
          const s1 = TRADITION_SCENARIOS[traditions[0]] as TraditionScenario | undefined;
          const s2 = TRADITION_SCENARIOS[traditions[1]] as TraditionScenario | undefined;
          const s3 = TRADITION_SCENARIOS[traditions[2]] as TraditionScenario | undefined;

          const buildCopyText = () => {
            const lines: string[] = [
              `📜 ${squadName || 'Отряд'}`,
              'Сценарий Посвящения',
              '',
              '1. Сбор. Атмосфера таинственности. Вожатый коротко говорит о важности посвящения.',
              '',
              `2. ${traditions[0]}`,
              s1?.step2 || 'Ритуал знакомства.',
              s1?.duration ? `   Время: ${s1.duration}` : '',
              s1?.materials ? `   Материалы: ${s1.materials}` : '',
              s1?.counselorTip ? `   Совет: ${s1.counselorTip}` : '',
              '',
              `3. ${traditions[1]}`,
              s2?.step3 || 'Испытание или обсуждение.',
              s2?.duration ? `   Время: ${s2.duration}` : '',
              s2?.materials ? `   Материалы: ${s2.materials}` : '',
              s2?.counselorTip ? `   Совет: ${s2.counselorTip}` : '',
              '',
              `4. Финал: ${traditions[2]}`,
              s3?.step4 || 'Вручение символики.',
              s3?.duration ? `   Время: ${s3.duration}` : '',
              s3?.materials ? `   Материалы: ${s3.materials}` : '',
              s3?.counselorTip ? `   Совет: ${s3.counselorTip}` : '',
              '',
              '4К: ' +
                (s1?.skill && s2?.skill && s3?.skill
                  ? [...new Set([s1.skill, s2.skill, s3.skill])].join(', ')
                  : 'Коммуникация, Коллаборация, Креативность'),
            ];
            return lines.filter(Boolean).join('\n');
          };

          const handleCopy = () => {
            navigator.clipboard.writeText(buildCopyText()).then(() => {
              setCopyToast(true);
              setTimeout(() => setCopyToast(false), 2000);
            });
          };

          const handleApprove = () => {
            saveSquadArchitectScenario(squadName || 'Отряд', traditions);
            onComplete?.({ name: squadName, traditions });
          };

          return (
            <div style={{ textAlign: 'center', position: 'relative' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>📜</div>
              <div style={{ fontSize: '16px', fontWeight: 800, marginBottom: '8px' }}>
                {squadName || 'Отряд'}
              </div>
              <div style={{ fontSize: '12px', opacity: 0.7, marginBottom: '16px' }}>
                Сценарий Посвящения готов
              </div>
              <div
                style={{
                  textAlign: 'left',
                  background: 'rgba(255,255,255,0.05)',
                  padding: '16px',
                  borderRadius: '12px',
                  fontSize: '13px',
                  lineHeight: 1.7,
                  marginBottom: '16px',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <div style={{ marginBottom: '12px' }}>
                  <strong>1. Сбор.</strong> Атмосфера таинственности. Вожатый коротко говорит о
                  важности посвящения.
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <strong>2. {traditions[0]}</strong>
                  {(s1?.duration || s1?.materials || s1?.counselorTip) && (
                    <div
                      style={{
                        fontSize: '11px',
                        opacity: 0.8,
                        marginTop: '4px',
                        marginLeft: '8px',
                      }}
                    >
                      {s1?.duration && <span>⏱ {s1.duration}</span>}
                      {s1?.materials && (
                        <span style={{ marginLeft: s1?.duration ? '12px' : 0 }}>
                          📦 {s1.materials}
                        </span>
                      )}
                      {s1?.counselorTip && (
                        <div style={{ marginTop: '4px', fontStyle: 'italic' }}>
                          💡 {s1.counselorTip}
                        </div>
                      )}
                    </div>
                  )}
                  <br />
                  <span style={{ opacity: 0.9 }}>{s1?.step2 || 'Ритуал знакомства.'}</span>
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <strong>3. {traditions[1]}</strong>
                  {(s2?.duration || s2?.materials || s2?.counselorTip) && (
                    <div
                      style={{
                        fontSize: '11px',
                        opacity: 0.8,
                        marginTop: '4px',
                        marginLeft: '8px',
                      }}
                    >
                      {s2?.duration && <span>⏱ {s2.duration}</span>}
                      {s2?.materials && (
                        <span style={{ marginLeft: s2?.duration ? '12px' : 0 }}>
                          📦 {s2.materials}
                        </span>
                      )}
                      {s2?.counselorTip && (
                        <div style={{ marginTop: '4px', fontStyle: 'italic' }}>
                          💡 {s2.counselorTip}
                        </div>
                      )}
                    </div>
                  )}
                  <br />
                  <span style={{ opacity: 0.9 }}>{s2?.step3 || 'Испытание или обсуждение.'}</span>
                </div>
                <div>
                  <strong>4. Финал: {traditions[2]}</strong>
                  {(s3?.duration || s3?.materials || s3?.counselorTip) && (
                    <div
                      style={{
                        fontSize: '11px',
                        opacity: 0.8,
                        marginTop: '4px',
                        marginLeft: '8px',
                      }}
                    >
                      {s3?.duration && <span>⏱ {s3.duration}</span>}
                      {s3?.materials && (
                        <span style={{ marginLeft: s3?.duration ? '12px' : 0 }}>
                          📦 {s3.materials}
                        </span>
                      )}
                      {s3?.counselorTip && (
                        <div style={{ marginTop: '4px', fontStyle: 'italic' }}>
                          💡 {s3.counselorTip}
                        </div>
                      )}
                    </div>
                  )}
                  <br />
                  <span style={{ opacity: 0.9 }}>{s3?.step4 || 'Вручение символики.'}</span>
                </div>
              </div>
              <p
                style={{ fontSize: '11px', opacity: 0.6, marginBottom: '12px', textAlign: 'left' }}
              >
                4К:{' '}
                {s1?.skill && s2?.skill && s3?.skill
                  ? [...new Set([s1.skill, s2.skill, s3.skill])].join(', ')
                  : 'Коммуникация, Коллаборация, Креативность'}
              </p>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <button
                  onClick={handleCopy}
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: 'rgba(255,255,255,0.1)',
                    color: 'white',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '10px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {copyToast ? '✓ Скопировано!' : '📋 Копировать сценарий'}
                </button>
                <button
                  onClick={handleApprove}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: '#ffd700',
                    color: '#1a1a2e',
                    border: 'none',
                    borderRadius: '10px',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  УТВЕРДИТЬ МЕТОДИКУ
                </button>
              </div>
              {copyToast && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: '-8px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: '#38ef7d',
                    color: '#1a1a2e',
                    padding: '4px 12px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                >
                  Скопировано!
                </div>
              )}
            </div>
          );
        })()}
    </div>
  );
};
