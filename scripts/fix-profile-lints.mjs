import fs from 'fs';
const path = 'src/views/ProfileView.tsx';
let s = fs.readFileSync(path, 'utf8');

// 1. Fix socialGenerator import - keep only used
s = s.replace(
  `import {
  copyTextToClipboard,
  generateSocialCard,
  shareOrDownloadSocialCard,
  type SocialCardResult,
  type SocialCardKind,
  type SocialCardBadge,
  type SocialCardInput
} from '../utils/socialGenerator';`,
  `import { generateSocialCard, shareOrDownloadSocialCard, type SocialCardResult } from '../utils/socialGenerator';`
);

// 2. Remove workshopImageRef
s = s.replace(/\s*const workshopImageRef = useRef<HTMLInputElement \| null>\(null\);[\r\n]*/, '\n');

// 3. Fix badges.forEach(b => - add Badge type
s = s.replace(/if \(badges\) badges\.forEach\(b => m\.set/, 'if (badges) badges.forEach((b: Badge) => m.set');

// 4. Remove unused isFavorite
s = s.replace(/\n\s*const _isFavorite = \(id: string\) => favorites\.some\(fav => getBaseId\(fav\) === getBaseId\(id\)\);[\r\n]*/, '\n');

fs.writeFileSync(path, s);
console.log('Fixed ProfileView lints');
