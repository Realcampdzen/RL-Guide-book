/* Cross-links analysis for ai-data */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(process.cwd(), 'ai-data');
const MASTER = JSON.parse(fs.readFileSync(path.join(ROOT, 'MASTER_INDEX.json'), 'utf8'));

function loadSummary() {
  const summary = {};
  for (const cat of MASTER.categories) {
    const catdir = path.join(ROOT, cat.path);
    const idx = JSON.parse(fs.readFileSync(path.join(catdir, 'index.json'), 'utf8'));
    const badges = [];
    for (const b of (idx.badgesData || [])) {
      const bp = path.join(catdir, `${b.id}.json`);
      if (!fs.existsSync(bp)) continue;
      const bd = JSON.parse(fs.readFileSync(bp, 'utf8'));
      badges.push({
        id: bd.id,
        title: bd.title,
        description: bd.description || '',
        importance: bd.importance || '',
        skillTips: bd.skillTips || '',
        categoryTitle: cat.title,
        categoryId: cat.id,
      });
    }
    summary[cat.id] = { title: cat.title, badges };
  }
  return summary;
}

const TOPICS = {
  'ИИ/Медиа': [' ии', 'нейросет', 'chatgpt', 'чатgpt', 'midjourney', 'stable', 'изображен', 'видео', 'монтаж', 'аудио', 'подкаст', 'канал', 'пост', 'статья', 'контент', 'медиа'],
  'Творчество/Сцена': ['сцена', 'концерт', 'музык', 'танц', 'театр', 'песня', 'рису', 'жюри', 'выступ', 'шоу', 'творч'],
  'Организация/Лидерство': ['организ', 'лидер', 'ведущ', 'отряд', 'план', 'ответствен', 'инициатив', 'координац', 'расписан'],
  'Команда/Коммуникации': ['команд', 'общен', 'коммуник', 'конфликт', 'договор', 'дружб', 'уважен', 'вежлив', 'помощ', 'вовлеч', 'модерац', 'обратн'],
  'Порядок/Быт': ['уборк', 'поряд', 'чист', 'уют', 'зона', 'декор', 'гармони', 'распорядок'],
  'Осознанность/Психо': ['осознан', 'внимател', 'эмоци', 'настроен', 'стресс', 'спокойств', 'фокус', 'медита', 'рефлекс'],
};

function topicsFor(text) {
  const tset = new Set();
  const low = ` ${String(text || '').toLowerCase()} `;
  for (const [topic, keys] of Object.entries(TOPICS)) {
    if (keys.some((k) => low.includes(k))) tset.add(topic);
  }
  return [...tset];
}

function buildLinks(summary) {
  const badgeTopics = {};
  const byTopic = Object.fromEntries(Object.keys(TOPICS).map((t) => [t, []]));
  for (const [cid, cat] of Object.entries(summary)) {
    for (const b of cat.badges) {
      const t = topicsFor(`${b.description}\n${b.importance}\n${b.skillTips}`);
      badgeTopics[b.id] = t;
      for (const tp of t) byTopic[tp].push(b);
    }
  }

  const result = [];
  for (const [cid, cat] of Object.entries(summary)) {
    for (const b of cat.badges) {
      const t = badgeTopics[b.id] || [];
      const recs = [];
      for (const tp of t) {
        for (const ob of byTopic[tp]) {
          if (ob.id === b.id) continue;
          // Prefer different categories
          if (ob.id.split('.')[0] !== b.id.split('.')[0]) {
            recs.push({ topic: tp, badgeId: ob.id, badgeTitle: ob.title, category: ob.categoryTitle });
          }
        }
      }
      // Deduplicate by badgeId
      const uniq = [];
      const seen = new Set();
      for (const r of recs) {
        if (!seen.has(r.badgeId)) {
          seen.add(r.badgeId);
          uniq.push(r);
        }
      }
      if (uniq.length) {
        result.push({
          id: b.id,
          title: b.title,
          category: cat.title,
          topics: t,
          suggest: uniq.slice(0, 6),
        });
      }
    }
  }
  return { badgeTopics, byTopic, result };
}

function main() {
  const summary = loadSummary();
  const { byTopic, result } = buildLinks(summary);
  console.log('Topical coverage:');
  for (const t of Object.keys(TOPICS)) console.log('-', t, byTopic[t].length);
  // Print sample per category (first 2 badges with recs)
  const cats = Object.keys(summary).sort((a, b) => Number(a) - Number(b));
  for (const cid of cats) {
    console.log(`\nКатегория ${cid}: ${summary[cid].title}`);
    let count = 0;
    for (const r of result.filter((x) => x.id.split('.')[0] === cid)) {
      if (count >= 2) break;
      count++;
      console.log(`  ${r.id} ${r.title} → темы: ${r.topics.join(', ') || '—'}`);
      for (const s of r.suggest) {
        console.log(`    • [${s.badgeId}] ${s.badgeTitle} (из ${s.category}) — по теме: ${s.topic}`);
      }
    }
  }
}

if (require.main === module) main();

module.exports = { loadSummary, buildLinks, TOPICS };

