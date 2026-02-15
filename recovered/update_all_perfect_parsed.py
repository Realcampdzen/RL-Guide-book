import json
from pathlib import Path

def update_all_perfect_parsed():
    """Обновляем perfect_parsed_data.json с данными из ai-data"""
    
    # Загружаем существующий файл
    with open('perfect_parsed_data.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    ai_data_path = Path("ai-data")
    updated_count = 0
    
    print("🔄 Обновляем perfect_parsed_data.json...")
    print("=" * 50)
    
    for badge in data["badges"]:
        badge_id = badge["id"]
        category_id = badge["category_id"]
        
        # Ищем ai-data файл
        ai_file_path = f"{ai_data_path}/category-{category_id}/{badge_id}.json"
        
        try:
            with open(ai_file_path, 'r', encoding='utf-8') as f:
                ai_data = json.load(f)
            
            # Обновляем основные поля
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
            
            # Если есть levels, ищем соответствующий level
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
                
                # Если поля отсутствуют, берем из первого level
                if not badge.get("importance") and ai_data["levels"]:
                    first_level = ai_data["levels"][0]
                    if "importance" in first_level:
                        badge["importance"] = first_level["importance"]
                    if "skillTips" in first_level:
                        badge["skillTips"] = first_level["skillTips"]
                    if "philosophy" in first_level:
                        badge["philosophy"] = first_level["philosophy"]
                    if "howToBecome" in first_level:
                        badge["howToBecome"] = first_level["howToBecome"]
                    if "examples" in first_level:
                        badge["examples"] = first_level["examples"]
                    if "nameExplanation" in first_level:
                        badge["nameExplanation"] = first_level["nameExplanation"]
            
            updated_count += 1
            print(f"  ✅ {badge_id}: {badge['title']}")
            
        except FileNotFoundError:
            print(f"  ⚠️ Файл не найден: {ai_file_path}")
        except Exception as e:
            print(f"  ❌ Ошибка при обработке {badge_id}: {e}")
    
    # Сохраняем обновленный файл
    with open('perfect_parsed_data.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"\n✅ Обновлено {updated_count} значков")
    print("✅ Результат сохранен в perfect_parsed_data.json")

if __name__ == "__main__":
    update_all_perfect_parsed()
