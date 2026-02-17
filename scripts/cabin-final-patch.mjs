import fs from 'fs';

const cssPath = 'src/styles/profile-view-spaceship.css';
const docsPath = 'docs/cabin-colors-logic.md';

let css = fs.readFileSync(cssPath, 'utf8');
let docs = fs.readFileSync(docsPath, 'utf8');

const disabledBlock = `
/* Disabled (план 10): graphite, text-muted, border */
.profile-spaceship-root .profile-view .btn-secondary:disabled,
.profile-spaceship-root .profile-view .btn-primary-gold:disabled,
.profile-spaceship-root .profile-view-cabin-center .w-input:disabled {
  opacity: var(--cabin-disabled-opacity);
  background: var(--graphite) !important;
  color: var(--text-muted) !important;
  border-color: var(--border) !important;
}
`;

if (!css.includes('/* Disabled (план 10)')) {
  const anchor = '\r\n.profile-spaceship-root .profile-view-cabin-hub-actions {';
  const idx = css.indexOf(anchor);
  if (idx !== -1) {
    css = css.slice(0, idx) + disabledBlock + css.slice(idx);
    fs.writeFileSync(cssPath, css);
    console.log('Disabled block added');
  } else {
    console.log('Anchor not found for disabled block');
  }
} else {
  console.log('Disabled block already present');
}

if (!docs.includes('## 5. Disabled')) {
  const insert = `

## 5. Disabled

- \`--cabin-disabled-opacity: 0.55\`
- Disabled: \`background: var(--graphite)\`, \`color: var(--text-muted)\`, \`border: var(--border)\` с пониженной прозрачностью.
`;
  const lastSection = docs.lastIndexOf('\n---\n');
  if (lastSection !== -1) {
    docs = docs.slice(0, lastSection) + insert + docs.slice(lastSection);
    fs.writeFileSync(docsPath, docs);
    console.log('Docs: Disabled section added');
  }
} else {
  console.log('Docs: Disabled section already present');
}
