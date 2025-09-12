import json
from pathlib import Path

def remove_empty_skilltips():
    """Удаляет пустые skillTips из ai-data файлов"""
    
    ai_data_path = Path("ai-data")
    fixed_count = 0
    
    print("🔍 Удаляем пустые skillTips из ai-data файлов...")
    print("=" * 50)
    
    # Проходим по всем категориям
    for category_dir in sorted(ai_data_path.iterdir()):
        if category_dir.is_dir() and category_dir.name.startswith("category-"):
            category_id = category_dir.name.replace("category-", "")
            print(f"\n📁 Категория {category_id}:")
            
            for file_path in sorted(category_dir.iterdir()):
                if file_path.suffix == ".json" and not file_path.name.startswith("index"):
                    try:
                        with open(file_path, 'r', encoding='utf-8') as f:
                            ai_data = json.load(f)
                        
                        badge_id = ai_data.get("id")
                        if not badge_id:
                            continue
                        
                        skilltips = ai_data.get("skillTips", "")
                        
                        # Проверяем, пустой ли skillTips
                        if skilltips in ["💡 \n", "💡 \n", "💡", ""]:
                            print(f"  🗑️ Удаляем пустой skillTips у {badge_id}: {ai_data.get('title', '')}")
                            
                            # Удаляем поле skillTips
                            if "skillTips" in ai_data:
                                del ai_data["skillTips"]
                                
                                # Сохраняем обновленный файл
                                with open(file_path, 'w', encoding='utf-8') as f:
                                    json.dump(ai_data, f, ensure_ascii=False, indent=2)
                                
                                fixed_count += 1
                        else:
                            print(f"  ✅ {badge_id}: skillTips заполнен")
                            
                    except Exception as e:
                        print(f"  ❌ Ошибка при обработке {file_path}: {e}")
    
    print(f"\n📊 ИТОГИ:")
    print(f"  🗑️ Удалено пустых skillTips: {fixed_count}")
    print(f"  ✅ Теперь в веб-приложении не будет отображаться '💡' без текста")

if __name__ == "__main__":
    remove_empty_skilltips()
