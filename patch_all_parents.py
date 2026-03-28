import sys

files = [
    ('src/components/AdminDashboard.tsx', "    participant: 'Участник',", "    participant: 'Участник',\n    parent: 'Родитель',"),
    ('src/components/AuthFloatingButton.tsx', "    participant: { label: 'Участник', icon: '👤', color: '#6b7280' },", "    participant: { label: 'Участник', icon: '👤', color: '#6b7280' },\n    parent: { label: 'Родитель', icon: '🧑‍🍼', color: '#f59e0b' },"),
    ('src/components/PersonalCabinet.tsx', "    participant: { label: 'Участник', color: '#6B7280' },", "    participant: { label: 'Участник', color: '#6B7280' },\n    parent: { label: 'Родитель', color: '#F59E0B' },"),
    ('src/components/StaffDashboardPanel.tsx', "        participant: { label: 'Участник', color: 'rgba(255,255,255,0.25)' },", "        participant: { label: 'Участник', color: 'rgba(255,255,255,0.25)' },\n        parent: { label: 'Родитель', color: 'rgba(245,158,11,0.7)' },"),
]

for fpath, target, repl in files:
    try:
        with open(fpath, 'r', encoding='utf-8') as f:
            text = f.read()
        if target in text and 'parent:' not in text:
            text = text.replace(target, repl)
            with open(fpath, 'w', encoding='utf-8') as f:
                f.write(text)
            print(f'Patched {fpath}')
        else:
            print(f'Skipped {fpath} (already patched or target not found)')
    except Exception as e:
        print(f'Failed {fpath}: {e}')
