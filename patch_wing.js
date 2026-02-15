const fs = require('fs');
const p = 'src/components/WingDashboard.tsx';
let s = fs.readFileSync(p, 'utf8');
const insert = `      </div>

      <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px', marginBottom: '16px' }}>
        <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '12px', opacity: 0.6 }}>АВАТАР КРЫЛА</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', overflow: 'hidden', background: 'rgba(255,255,255,0.05)', border: '2px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {bro.wingAvatar && isImageUrl(bro.wingAvatar) ? (
              <img src={bro.wingAvatar} alt="Аватар Крыла" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontSize: '20px', opacity: 0.5 }}>🦅</span>
            )}
          </div>
          <button type="button" onClick={() => wingAvatarInputRef.current?.click()} className="btn-secondary" style={{ padding: '8px 14px', fontSize: '12px' }}>
            {bro.wingAvatar ? 'Изменить фото' : 'Добавить фото'}
          </button>
          <input type="file" ref={wingAvatarInputRef} accept="image/*" style={{ display: 'none' }} onChange={e => {
            const file = e.target.files?.[0];
            if (file) {
              const r = new FileReader();
              r.onload = () => setWingAvatar(r.result as string);
              r.readAsDataURL(file);
            }
            e.target.value = '';
          }} />
        </div>
      </div>

      {(isFullBro || onSuggestInitiative) && (`;
const needle = '      </div>\n\n      {(isFullBro || onSuggestInitiative) && (';
const idx = s.indexOf(needle);
if (idx !== -1) {
  s = s.slice(0, idx) + insert + s.slice(idx + needle.length);
  fs.writeFileSync(p, s);
  console.log('Patched WingDashboard');
} else {
  console.log('Needle not found');
}
