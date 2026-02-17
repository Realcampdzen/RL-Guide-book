import fs from 'fs';

const p = 'src/styles/profile-view-spaceship.css';
let s = fs.readFileSync(p, 'utf8');

const focusAnchor = '}\r\n\r\n.profile-spaceship-root .profile-view-cabin-hub-actions {';

const focusBlock = `/* Фокус: унифицированный var(--focus-ring) */
.profile-spaceship-root .profile-view-cabin-profile-field input:focus-visible,
.profile-spaceship-root .profile-view-cabin-profile-field textarea:focus-visible,
.profile-spaceship-root .profile-view-cabin-nav-btn:focus-visible,
.profile-spaceship-root .profile-view-cabin-avatar-wrap:focus-visible,
.profile-spaceship-root .profile-view-screen:focus-visible,
.profile-spaceship-root .profile-view-cabin-panel-header__back:focus-visible,
.profile-spaceship-root .profile-view-cabin-side-screen__btn:focus-visible,
.profile-spaceship-root .profile-view-cabin-center-scroll .workshop-view__nav-btn:focus-visible,
.profile-spaceship-root .profile-view-panel-scroll .workshop-view__nav-btn:focus-visible {
  border-color: var(--focus-ring) !important;
  box-shadow: var(--cabin-focus-shadow) !important;
  outline: none !important;
}
`;

const focusInsert = '}\r\n\r\n' + focusBlock + '\r\n.profile-spaceship-root .profile-view-cabin-hub-actions {';

if (s.includes(focusAnchor) && !s.includes('/* Фокус: унифицированный var(--focus-ring) */')) {
  s = s.replace(focusAnchor, focusInsert);
  fs.writeFileSync(p, s);
  console.log('Focus block added');
} else {
  console.log('Focus anchor not found or already added');
}

const navOld = `.profile-spaceship-root .profile-view-cabin-left .profile-view-cabin-nav-item--wide .profile-view-cabin-nav-btn--wide {
  --panel-accent: var(--cabin-neon-purple);
  --panel-accent-rgb: var(--cabin-neon-purple-rgb);
}

.profile-spaceship-root .profile-view-cabin-right .profile-view-cabin-nav-item:nth-child(1) .profile-view-cabin-nav-btn--wide {
  --panel-accent: var(--cabin-neon-cyan);
  --panel-accent-rgb: var(--cabin-neon-cyan-rgb);
}

.profile-spaceship-root .profile-view-cabin-right .profile-view-cabin-nav-item:nth-child(2) .profile-view-cabin-nav-btn--wide {
  --panel-accent: var(--cabin-neon-magenta);
  --panel-accent-rgb: var(--cabin-neon-magenta-rgb);
}

.profile-spaceship-root .profile-view-cabin-right .profile-view-cabin-nav-item:nth-child(3) .profile-view-cabin-nav-btn--wide {
  --panel-accent: var(--cabin-neon-orange);
  --panel-accent-rgb: var(--cabin-neon-orange-rgb);
}

.profile-spaceship-root .profile-view-cabin-right .profile-view-cabin-nav-item:nth-child(4) .profile-view-cabin-nav-btn--wide {
  --panel-accent: var(--cabin-neon-purple);
  --panel-accent-rgb: var(--cabin-neon-purple-rgb);
}

.profile-spaceship-root .profile-view-cabin-right .profile-view-cabin-nav-item:nth-child(5) .profile-view-cabin-nav-btn--wide {
  --panel-accent: var(--cabin-neon-purple);
  --panel-accent-rgb: var(--cabin-neon-purple-rgb);
}`;

const navNew = `/* Навигация: унифицирована под violet (палитра кабины) */
.profile-spaceship-root .profile-view-cabin-left .profile-view-cabin-nav-item--wide .profile-view-cabin-nav-btn--wide,
.profile-spaceship-root .profile-view-cabin-right .profile-view-cabin-nav-item .profile-view-cabin-nav-btn--wide {
  --panel-accent: var(--violet-600);
  --panel-accent-rgb: var(--violet-600-rgb);
}`;

if (s.includes('--panel-accent: var(--cabin-neon-cyan)') && !s.includes('/* Навигация: унифицирована под violet')) {
  s = s.replace(navOld.replace(/\n/g, '\r\n'), navNew.replace(/\n/g, '\r\n'));
  fs.writeFileSync(p, s);
  console.log('Nav unified');
} else {
  console.log('Nav already unified or anchor not found');
}
