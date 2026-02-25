"""
backend/storage/base.py — абстрактные Store классы для всех доменов данных.

Каждый Store имеет два метода: load() → dict, save(data: dict) → None.
Конкретные реализации: json_provider.py (local dev), supabase_provider.py (prod).
"""

from abc import ABC, abstractmethod


class ShiftsStore(ABC):
    """
    Хранилище смен и отрядов.
    Формат: {'shifts': [...], 'squads': [...]}
    """
    @abstractmethod
    def load(self) -> dict: ...

    @abstractmethod
    def save(self, data: dict) -> None: ...


class MembershipsStore(ABC):
    """
    Хранилище членства устройств.
    Формат: {'members': [...]}
    Правило: одно активное membership на device_id.
    """
    @abstractmethod
    def load(self) -> dict: ...

    @abstractmethod
    def save(self, data: dict) -> None: ...


class SquadCornersStore(ABC):
    """
    Хранилище контента отрядных уголков (server shared).
    Формат: {'corners': {squad_id: {...}}}
    """
    @abstractmethod
    def load(self) -> dict: ...

    @abstractmethod
    def save(self, data: dict) -> None: ...


class SquadInvitesStore(ABC):
    """
    Хранилище инвайт-кодов.
    Формат: {'codes': {code: {squadId, expiresAt, ...}}}
    Политика: один активный код на отряд.
    """
    @abstractmethod
    def load(self) -> dict: ...

    @abstractmethod
    def save(self, data: dict) -> None: ...


class SquadMessagesStore(ABC):
    """
    Хранилище сообщений чата отрядов.
    Формат: {'bySquadId': {squad_id: [...]}}
    Retention: последние 1000 сообщений на отряд.
    """
    @abstractmethod
    def load(self) -> dict: ...

    @abstractmethod
    def save(self, data: dict) -> None: ...


class BadgeRequestsStore(ABC):
    """
    Хранилище заявок на подтверждение уровней значков.
    Формат: {'requests': [...]}
    Статусы: pending | approved | rejected.
    """
    @abstractmethod
    def load(self) -> dict: ...

    @abstractmethod
    def save(self, data: dict) -> None: ...


class ParentSnapshotsStore(ABC):
    """
    Хранилище снапшотов прогресса для родителей (TTL 7 дней).
    Формат: {code: {payload, expiresAt, ...}}
    """
    @abstractmethod
    def load(self) -> dict: ...

    @abstractmethod
    def save(self, data: dict) -> None: ...


class ChatDailyUsageStore(ABC):
    """
    Хранилище дневных квот чата.
    Формат: {'YYYY-MM-DD': {device_id: count}}
    Первичный ключ: (device_id, day).
    """
    @abstractmethod
    def load(self) -> dict: ...

    @abstractmethod
    def save(self, data: dict) -> None: ...


class CouncilInitiativesStore(ABC):
    """
    Хранилище инициатив Совета Лагеря.
    Формат: {'initiatives': [...]}
    Поля инициативы: id, camp_id, title, status, created_at, created_by, created_by_nickname.
    Статусы: idea | discussion | decided | done.
    """
    @abstractmethod
    def load(self) -> dict: ...

    @abstractmethod
    def save(self, data: dict) -> None: ...


class TeamsStore(ABC):
    """
    Хранилище Движков (teams/engines).
    Формат: {team_id: team_doc}
    team_doc: id, name, leaderId, members, scope, shiftId, squadId, ...
    """
    @abstractmethod
    def load(self) -> dict: ...

    @abstractmethod
    def save(self, data: dict) -> None: ...
