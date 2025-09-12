import json
import re
from pathlib import Path
from datetime import datetime

class CorrectParser:
    def __init__(self, guide_file: str, ai_data_path: str):
        self.guide_file = guide_file
        self.ai_data_path = Path(ai_data_path)
        self.parsed_data = {
            "metadata": {
                "total_categories": 0,
                "total_badges": 0,
                "source_file": "Путеводитель.txt + ai-data",
                "parsed_at": ""
            },
            "categories": [],
            "badges": []
        }
        
    def parse_guide_structure(self):
        """Парсим структуру из Путеводителя (как в оригинальном парсере)"""
        with open(self.guide_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Ищем категории и значки
        category_pattern = r'(\d+)\.\s*Категория\s*«([^»]+)»\s*—\s*(\d+)\s*значков?\.'
        badge_pattern = r'(\d+\.\d+(?:\.\d+)?)\.\s*(?:Базовый уровень|Продвинутый уровень|Экспертный уровень|Одноуровневый|Высший|Категория \d+).*?–\s*([^«]+)\s*«([^»]+)»\s*([^\n]*)'
        
        categories = {}
        badges = []
        
        # Парсим категории
        for match in re.finditer(category_pattern, content):
            cat_id = match.group(1)
            cat_title = match.group(2)
            expected_badges = int(match.group(3))
            
            categories[cat_id] = {
                "id": cat_id,
                "title": cat_title,
                "description": None,
                "badge_count": 0,
                "expected_badges": expected_badges
            }
        
        # Парсим значки
        for match in re.finditer(badge_pattern, content):
            badge_id = match.group(1)
            level = match.group(2).strip()
            emoji = match.group(3).strip()
            title = match.group(4).strip()
            
            # Определяем категорию по ID
            category_id = badge_id.split('.')[0]
            
            badge = {
                "id": badge_id,
                "title": title,
                "emoji": emoji,
                "category_id": category_id,
                "level": level,
                "description": None,
                "criteria": None
            }
            
            badges.append(badge)
            
            # Увеличиваем счётчик значков в категории
            if category_id in categories:
                categories[category_id]["badge_count"] += 1
        
        return categories, badges
    
    def load_ai_data(self, badge_id: str):
        """Загружаем данные из ai-data файла"""
        # Определяем категорию по ID
        category_id = badge_id.split('.')[0]
        ai_file = self.ai_data_path / f"category-{category_id}" / f"{badge_id}.json"
        
        if ai_file.exists():
            try:
                with open(ai_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except:
                return None
        return None
    
    def parse(self):
        print("Парсинг структуры из Путеводителя...")
        categories, badges = self.parse_guide_structure()
        
        print("Загрузка данных из ai-data...")
        for badge in badges:
            ai_data = self.load_ai_data(badge["id"])
            if ai_data:
                # Заполняем description и criteria из ai-data
                badge["description"] = ai_data.get("description", "")
                badge["criteria"] = ai_data.get("criteria", "")
                
                # Если есть levels, добавляем их как subtasks
                if "levels" in ai_data and ai_data["levels"]:
                    badge["subtasks"] = []
                    for level in ai_data["levels"]:
                        subtask = {
                            "id": level.get("id", ""),
                            "title": level.get("title", ""),
                            "emoji": level.get("emoji", ""),
                            "category_id": badge["category_id"],
                            "level": level.get("level", ""),
                            "description": level.get("description", ""),
                            "criteria": level.get("criteria", ""),
                            "confirmation": level.get("confirmation", "")
                        }
                        badge["subtasks"].append(subtask)
            else:
                print(f"⚠️ Не найден ai-data файл для значка {badge['id']}")
        
        # Обновляем метаданные
        self.parsed_data["categories"] = list(categories.values())
        self.parsed_data["badges"] = badges
        self.parsed_data["metadata"]["total_categories"] = len(categories)
        self.parsed_data["metadata"]["total_badges"] = len(badges)
        self.parsed_data["metadata"]["parsed_at"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        return self.parsed_data

def main():
    parser = CorrectParser("Путеводитель.txt", "ai-data")
    result = parser.parse()
    
    output_file = "perfect_parsed_data.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    
    print(f"\n✅ Результат сохранен в {output_file}")
    print(f"📊 Обработано категорий: {result['metadata']['total_categories']}")
    print(f"📊 Обработано значков: {result['metadata']['total_badges']}")
    
    # Выводим статистику по категориям
    print("\n📈 Статистика по категориям:")
    for cat in result["categories"]:
        status = "✅" if cat["badge_count"] == cat["expected_badges"] else "❌"
        print(f"  {status} {cat['title']}: {cat['badge_count']}/{cat['expected_badges']} значков")

if __name__ == "__main__":
    main()