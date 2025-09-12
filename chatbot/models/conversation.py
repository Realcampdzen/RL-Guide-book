"""
Модели для управления диалогами
"""
from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field


class Message(BaseModel):
    """Сообщение в диалоге"""
    role: str = Field(..., description="Роль: user, assistant, system")
    content: str = Field(..., description="Содержимое сообщения")
    timestamp: datetime = Field(default_factory=datetime.now, description="Время сообщения")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Дополнительные данные")


class UserContext(BaseModel):
    """Контекст пользователя"""
    user_id: str = Field(..., description="ID пользователя")
    current_category: Optional[str] = Field(None, description="Текущая категория")
    current_badge: Optional[str] = Field(None, description="Текущий значок")
    interests: List[str] = Field(default_factory=list, description="Интересы пользователя")
    level: str = Field(default="beginner", description="Уровень пользователя")
    session_data: Dict[str, Any] = Field(default_factory=dict, description="Данные сессии")


class Conversation(BaseModel):
    """Диалог с пользователем"""
    conversation_id: str = Field(..., description="ID диалога")
    user_context: UserContext = Field(..., description="Контекст пользователя")
    messages: List[Message] = Field(default_factory=list, description="Сообщения диалога")
    created_at: datetime = Field(default_factory=datetime.now, description="Время создания")
    updated_at: datetime = Field(default_factory=datetime.now, description="Время обновления")
    is_active: bool = Field(default=True, description="Активен ли диалог")


class WebContext(BaseModel):
    """Контекст из веб-интерфейса"""
    current_view: Optional[str] = Field(None, description="Текущий экран")
    current_category: Optional[Dict[str, Any]] = Field(None, description="Текущая категория")
    current_badge: Optional[Dict[str, Any]] = Field(None, description="Текущий значок")
    current_level: Optional[str] = Field(None, description="Текущий уровень значка")
    current_level_badge_title: Optional[str] = Field(None, description="Название конкретного уровня значка")


class ChatRequest(BaseModel):
    """Запрос к чат-боту"""
    message: str = Field(..., description="Сообщение пользователя")
    user_id: str = Field(..., description="ID пользователя")
    context: Optional[WebContext] = Field(None, description="Контекст из веб-интерфейса")


class ChatResponse(BaseModel):
    """Ответ чат-бота"""
    response: str = Field(..., description="Ответ бота")
    suggestions: List[str] = Field(default_factory=list, description="Предложения")
    context_updates: Optional[UserContext] = Field(None, description="Обновления контекста")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Дополнительные данные")
