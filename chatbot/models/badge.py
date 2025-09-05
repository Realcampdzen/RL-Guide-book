"""
Модель данных для значка из Путеводителя
"""
from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel, Field, validator


class BadgeLevel(BaseModel):
    """Уровень значка"""
    id: str = Field(..., description="ID уровня (например, 1.1.1)")
    level: str = Field(..., description="Название уровня")
    title: str = Field(..., description="Название значка на этом уровне")
    emoji: str = Field(..., description="Эмодзи уровня")
    criteria: str = Field(..., description="Критерии получения")
    confirmation: str = Field(..., description="Способы подтверждения")


class Badge(BaseModel):
    """Значок из Путеводителя"""
    id: str = Field(..., description="Уникальный ID значка")
    title: str = Field(..., description="Название значка")
    emoji: str = Field(..., description="Эмодзи значка")
    categoryId: str = Field(..., description="ID категории")
    description: str = Field(..., description="Описание цели значка")
    nameExplanation: Optional[str] = Field(None, description="Объяснение названия")
    skillTips: Optional[str] = Field(None, description="Практические советы")
    examples: Optional[Union[str, List[str]]] = Field(None, description="Примеры выполнения")
    
    @validator('examples', pre=True)
    def normalize_examples(cls, v):
        if v is None:
            return None
        if isinstance(v, list):
            return v
        if isinstance(v, str):
            return v
        return str(v)
    philosophy: Optional[str] = Field(None, description="Философия значка")
    howToBecome: Optional[str] = Field(None, description="Пошаговое руководство")
    levels: List[BadgeLevel] = Field(default_factory=list, description="Уровни значка")


class Category(BaseModel):
    """Категория значков"""
    id: str = Field(..., description="ID категории")
    title: str = Field(..., description="Название категории")
    emoji: str = Field(..., description="Эмодзи категории")
    path: str = Field(..., description="Путь к папке категории")
    badges: List[Badge] = Field(default_factory=list, description="Значки в категории")
    introduction: Optional[str] = Field(None, description="Введение в категорию")
    philosophy: Optional[str] = Field(None, description="Философия категории")


class BadgeData(BaseModel):
    """Полная база данных значков"""
    project: str = Field(..., description="Название проекта")
    version: str = Field(..., description="Версия данных")
    totalCategories: int = Field(..., description="Общее количество категорий")
    totalBadges: int = Field(..., description="Общее количество значков")
    categories: List[Category] = Field(default_factory=list, description="Все категории")
