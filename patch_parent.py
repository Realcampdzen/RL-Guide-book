import sys

with open('src/components/SquadCabinetPanel.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

target = """                  camp_director: 'Директор лагеря', developer: 'Разработчик',
                };"""

replacement = """                  camp_director: 'Директор лагеря', developer: 'Разработчик',
                  parent: 'Родитель',
                };"""

if target in text:
    text = text.replace(target, replacement)
    with open('src/components/SquadCabinetPanel.tsx', 'w', encoding='utf-8') as f:
        f.write(text)
    print("Replaced")
else:
    print("Not found")
