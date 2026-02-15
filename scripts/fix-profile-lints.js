const fs = require('fs');
const path = 'src/views/ProfileView.tsx';
let s = fs.readFileSync(path, 'utf8');

// 1. Remove getBadgePlan from useUserProgress destructuring
s = s.replace(
  /saveBadgePlan, updateBadgePlanStatus, updateBadgePlanChecklist, getBadgePlan/,
  'saveBadgePlan, updateBadgePlanStatus, updateBadgePlanChecklist'
);

// 2. Change "type Badge, Category" to "type Badge"
s = s.replace(/import type \{ Badge, Category \}/, 'import type { Badge }');

// 3. Simplify socialGenerator imports - remove unused
s = s.replace(
  /import \{\s*copyTextToClipboard,\s*generateSocialCard,\s*shareOrDownloadSocialCard,\s*type SocialCardResult,\s*type SocialCardKind,\s*type SocialCardBadge,\s*type SocialCardInput\s*\}/,
  'import { generateSocialCard, shareOrDownloadSocialCard, type SocialCardResult }'
);

// 4. Simplify aiService import - remove AiSloganContext
s = s.replace(
  /import \{ fetchAiSlogan, fetchPedagogy4k, fetchVibeCheck, fetchBadgePlan, type AiSloganContext \}/,
  'import { fetchAiSlogan, fetchPedagogy4k, fetchVibeCheck, fetchBadgePlan }'
);

// 5. Add Badge type to resolveBadge's found parameter - line 171-172
s = s.replace(
  /const found = badges\.find\(\(b: Badge\) => b\.id === baseId/,
  'const found = badges.find((b: Badge) => b.id === baseId'
);

// 6. Prefix unused isFavorite with underscore or remove - use void to suppress
s = s.replace(
  /const isFavorite = \(id: string\) => favorites\.some\(fav => getBaseId\(fav\) === getBaseId\(id\)\);/,
  'const _isFavorite = (id: string) => favorites.some((fav: string) => getBaseId(fav) === getBaseId(id));'
);

fs.writeFileSync(path, s);
console.log('Fixed ProfileView lints');
