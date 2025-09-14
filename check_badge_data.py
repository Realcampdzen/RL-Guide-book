#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Проверка данных значков
"""
import json

def check_badge_data():
    """Проверяет данные значков"""
    with open('perfect_parsed_data.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    print(f"📊 Всего категорий: {len(data['categories'])}")
    print(f"📊 Всего значков: {len(data['badges'])}")
    
    # Ищем значок Валюша
    found = False
    for badge in data['badges']:
        if 'валюша' in badge['title'].lower():
            print(f"\n✅ Найден значок: {badge['title']}")
            print(f"ID: {badge['id']}")
            print(f"Описание: {badge['description']}")
            print(f"Категория: {badge['category_id']}")
            found = True
            break
    
    if not found:
        print("\n❌ Значок Валюша не найден")
        print("Первые 10 значков:")
        for i, badge in enumerate(data['badges'][:10]):
            print(f"{i+1}. {badge['title']} (ID: {badge['id']})")
    
    # Проверяем категорию 1 (За личные достижения)
    print(f"\n📁 Категория 1:")
    for badge in data['badges']:
        if badge['category_id'] == '1':
            print(f"- {badge['title']} (ID: {badge['id']})")

if __name__ == "__main__":
    check_badge_data()
