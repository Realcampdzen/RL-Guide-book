import json
from pathlib import Path

def add_ai_data_to_parsed():
    """Добавляем description и criteria из ai-data к существующему perfect_parsed_data.json"""
    
    # Загружаем существующий файл
    with open('perfect_parsed_data.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    ai_data_path = Path("ai-data")
    updated_count = 0
    
    print("Добавляем данные из ai-data...")
    
    for badge in data["badges"]:
        badge_id = badge["id"]
        category_id = badge["category_id"]
        
        # Ищем ai-data файл
        ai_file = ai_data_path / f"category-{category_id}" / f"{badge_id}.json"
        
        # Если файл не найден, возможно это подуровень - ищем родительский файл
        if not ai_file.exists() and '.' in badge_id:
            parent_id = '.'.join(badge_id.split('.')[:-1])
            ai_file = ai_data_path / f"category-{category_id}" / f"{parent_id}.json"
        
        if ai_file.exists():
            try:
                with open(ai_file, 'r', encoding='utf-8') as f:
                    ai_data = json.load(f)
                
                # Обновляем description и criteria
                if "description" in ai_data:
                    badge["description"] = ai_data["description"]
                
                if "criteria" in ai_data:
                    badge["criteria"] = ai_data["criteria"]
                
                # Добавляем дополнительные поля для веб-приложения
                if "importance" in ai_data:
                    badge["importance"] = ai_data["importance"]
                
                if "skillTips" in ai_data:
                    badge["skillTips"] = ai_data["skillTips"]
                
                if "philosophy" in ai_data:
                    badge["philosophy"] = ai_data["philosophy"]
                
                if "howToBecome" in ai_data:
                    badge["howToBecome"] = ai_data["howToBecome"]
                
                if "examples" in ai_data:
                    badge["examples"] = ai_data["examples"]
                
                if "nameExplanation" in ai_data:
                    badge["nameExplanation"] = ai_data["nameExplanation"]
                
                # Если есть levels, ищем соответствующий level для этого значка
                if "levels" in ai_data and ai_data["levels"]:
                    for level in ai_data["levels"]:
                        if level.get("id") == badge_id:
                            if "description" in level:
                                badge["description"] = level["description"]
                            if "criteria" in level:
                                badge["criteria"] = level["criteria"]
                            if "importance" in level:
                                badge["importance"] = level["importance"]
                            if "skillTips" in level:
                                badge["skillTips"] = level["skillTips"]
                            if "philosophy" in level:
                                badge["philosophy"] = level["philosophy"]
                            if "howToBecome" in level:
                                badge["howToBecome"] = level["howToBecome"]
                            if "examples" in level:
                                badge["examples"] = level["examples"]
                            if "nameExplanation" in level:
                                badge["nameExplanation"] = level["nameExplanation"]
                            break
                
                # Если criteria все еще null, но есть levels, берем criteria из первого level
                if badge["criteria"] is None and "levels" in ai_data and ai_data["levels"]:
                    first_level = ai_data["levels"][0]
                    if "criteria" in first_level:
                        badge["criteria"] = first_level["criteria"]
                
                # Если дополнительные поля отсутствуют, но есть levels, берем их из первого level
                if "levels" in ai_data and ai_data["levels"]:
                    first_level = ai_data["levels"][0]
                    
                    if not badge.get("importance") and "importance" in first_level:
                        badge["importance"] = first_level["importance"]
                    
                    if not badge.get("skillTips") and "skillTips" in first_level:
                        badge["skillTips"] = first_level["skillTips"]
                    
                    if not badge.get("philosophy") and "philosophy" in first_level:
                        badge["philosophy"] = first_level["philosophy"]
                    
                    if not badge.get("howToBecome") and "howToBecome" in first_level:
                        badge["howToBecome"] = first_level["howToBecome"]
                    
                    if not badge.get("examples") and "examples" in first_level:
                        badge["examples"] = first_level["examples"]
                    
                    if not badge.get("nameExplanation") and "nameExplanation" in first_level:
                        badge["nameExplanation"] = first_level["nameExplanation"]
                
                updated_count += 1
                print(f"  ✅ {badge_id}: {badge['title']}")
                
            except Exception as e:
                print(f"  ❌ Ошибка при загрузке {ai_file}: {e}")
        else:
            print(f"  ⚠️ Не найден ai-data файл для {badge_id}")
    
    # Сохраняем обновленный файл
    with open('perfect_parsed_data.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"\n✅ Обновлено {updated_count} значков")
    print("✅ Результат сохранен в perfect_parsed_data.json")

if __name__ == "__main__":
    add_ai_data_to_parsed()
