const fs = require('fs');
const path = 'src/views/ProfileView.tsx';
let s = fs.readFileSync(path, 'utf8');

// 1. Add Составить план button before Подтвердить
const btnOld = /<button onClick=\{\(e\) => \{ e\.stopPropagation\(\); setProofForm\(\{ learned: '', impact: '', link: '' \}\); setProofPhotoCount\(0\); proofPhotoInputRef\.current && \(proofPhotoInputRef\.current\.value = ''\); setProofBadge\(\{ id, title: b\?\\.title \|\| id \}\); \}\} className="btn-confirm-main">Подтвердить <Icons\.Send \/><\/button>/;
const btnNew = '<button onClick={(e) => { e.stopPropagation(); setPlanFormBadge({ id: baseId, title: b?.title || id, criteria: b?.criteria }); setPlanForm({ currentDay: userData?.diaryProgress?.currentDay ?? 1, squadProgram3d: \'\', campProgram3d: \'\', priority: \'both\' }); setPlanResult(null); }} className="btn-secondary" style={{ fontSize: 12 }}>Составить план</button>\n                        <button onClick={(e) => { e.stopPropagation(); setProofForm({ learned: \'\', impact: \'\', link: \'\' }); setProofPhotoCount(0); proofPhotoInputRef.current && (proofPhotoInputRef.current.value = \'\'); setProofBadge({ id, title: b?.title || id }); }} className="btn-confirm-main">Подтвердить <Icons.Send /></button>';
s = s.replace(btnOld, btnNew);
console.log('1. Button:', btnOld.test(s) ? 'NOT replaced' : 'replaced');

// 2. Add BadgePlanCards after favorites, before activeLevels
const cardsBlock = `{Object.entries(userData?.badgePlans || {}).filter(([, p]) => p.status === 'approved' || p.status === 'in_progress').map(([badgeId, plan]) => (
                 <BadgePlanCard key={badgeId} plan={plan} badgeTitle={badgeLookupMap.get(badgeId)?.title || badgeId} onNavigateToBadge={onNavigateToBadge} onCheckItem={(bid, idx, done) => { updateBadgePlanChecklist(bid, idx, done); const p = getBadgePlan(bid); if (p && (p.checklistItems?.length || 0) > 0 && (p.completedItems?.length || 0) >= (p.checklistItems?.length || 0)) updateBadgePlanStatus(bid, 'completed'); }} />
               ))}
               `;
const cardsOld = /\}\)\}\s*\{activeLevels\.map\(\(\[id\]\) => \{/;
const cardsNew = '})}\n               ' + cardsBlock + '{activeLevels.map(([id]) => {';
s = s.replace(cardsOld, cardsNew);
console.log('2. BadgePlanCards:', cardsOld.test(s) ? 'not replaced' : 'replaced');

fs.writeFileSync(path, s);
console.log('Done');
