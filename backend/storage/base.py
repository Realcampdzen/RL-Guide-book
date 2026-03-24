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

    def delete_shift_by_id(self, shift_id: str) -> None:
        """Delete a shift row by ID. Override in providers that need direct deletes (e.g. Supabase)."""
        pass  # JSON provider relies on save(); Supabase overrides this.

    def delete_squad_by_id(self, squad_id: str) -> None:
        """Delete a squad row by ID. Override in providers that need direct deletes (e.g. Supabase)."""
        pass  # JSON provider relies on save(); Supabase overrides this.

    def delete_squads_by_shift_id(self, shift_id: str) -> None:
        """Delete all squads belonging to a shift. Override in providers that need direct deletes."""
        pass


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

    def delete_by_squad_id(self, squad_id: str) -> None:
        """Delete all invite codes for a squad. Override in Supabase provider."""
        doc = self.load()
        codes = doc.get('codes') or {}
        changed = False
        for code in list(codes.keys()):
            meta = codes.get(code)
            if isinstance(meta, dict) and (meta.get('squadId') or '').strip() == squad_id:
                del codes[code]
                changed = True
        if changed:
            doc['codes'] = codes
            self.save(doc)

    def insert_code(self, code: str, meta: dict) -> None:
        """Insert a single invite code. Override in Supabase provider for direct INSERT."""
        doc = self.load()
        codes = doc.get('codes') or {}
        codes[code] = meta
        doc['codes'] = codes
        self.save(doc)


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

    def insert_message(self, msg: dict) -> dict:
        """Direct single-message insert. Override in providers that support it.
        Default: delegates to load+save (JSON provider path).
        Returns the stored message (may have server-generated id)."""
        sid = (msg.get('squadId') or '').strip()
        doc = self.load()
        by_squad = doc.get('bySquadId') or {}
        rows = by_squad.get(sid) if isinstance(by_squad.get(sid), list) else []
        rows.append(msg)
        rows = rows[-1000:]
        by_squad[sid] = rows
        doc['bySquadId'] = by_squad
        self.save(doc)
        return msg


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


class BadgePlansStore(ABC):
    """
    Хранилище планов получения значков.
    Формат: {'plans': [...]}
    Статусы: draft | submitted | approved | rejected.
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


class CouncilMembersStore(ABC):
    """
    Хранилище участников Совета Лагеря.
    Формат: {'members': [...]}
    """
    @abstractmethod
    def load(self) -> dict: ...

    @abstractmethod
    def save(self, data: dict) -> None: ...


class CouncilProtocolsStore(ABC):
    """
    Хранилище протоколов Совета Лагеря.
    Формат: {'protocols': [...]}
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


class BadgeArtsStore(ABC):
    """
    Хранилище артов/скинов значков.
    Формат: {'arts': [...]}
    Статусы: pending | approved | rejected | canon.
    """
    @abstractmethod
    def load(self) -> dict: ...

    @abstractmethod
    def save(self, data: dict) -> None: ...


class EnginesStore(ABC):
    """
    Хранилище Движков (Engines).
    Формат: {'engines': [...]}
    Статусы: pending | approved | rejected | archived.
    """
    @abstractmethod
    def load(self) -> dict: ...

    @abstractmethod
    def save(self, data: dict) -> None: ...


class EngineMembersStore(ABC):
    """
    Хранилище участников Движков.
    Формат: {'members': [...]}
    """
    @abstractmethod
    def load(self) -> dict: ...

    @abstractmethod
    def save(self, data: dict) -> None: ...


class InspectorProgressStore(ABC):
    """
    Хранилище прогресса Инспектора Пользы.
    Формат: {'progress': [...]}
    Каждая запись: {id, deviceId, checklistId, taskId, status, completedAt, approvedBy, approvedAt}
    Статусы: completed | approved.
    """
    @abstractmethod
    def load(self) -> dict: ...

    @abstractmethod
    def save(self, data: dict) -> None: ...


class BroEventsStore(ABC):
    """
    Хранилище Бросвящений.
    Формат: {'events': [...]}
    Статусы: active | completed | cancelled.
    """
    @abstractmethod
    def load(self) -> dict: ...

    @abstractmethod
    def save(self, data: dict) -> None: ...


class BroPassportsStore(ABC):
    """
    Хранилище BroPassport-ов.
    Формат: {'passports': [...]}
    Каждый: {id, deviceId, broEventId, tasks, status, completedAt, createdAt}
    """
    @abstractmethod
    def load(self) -> dict: ...

    @abstractmethod
    def save(self, data: dict) -> None: ...


class BroSubmissionsStore(ABC):
    """
    Хранилище заявок на проверку заданий Бросвящения.
    Формат: {'submissions': [...]}
    Статусы: pending | approved | rejected.
    """
    @abstractmethod
    def load(self) -> dict: ...

    @abstractmethod
    def save(self, data: dict) -> None: ...


class BroInitiativesStore(ABC):
    """
    Хранилище Бродел (инициатив БРО-сообщества).
    Формат: {'initiatives': [...]}
    Статусы: voting | approved | sent_to_council.
    """
    @abstractmethod
    def load(self) -> dict: ...

    @abstractmethod
    def save(self, data: dict) -> None: ...


class ShiftScheduleStore(ABC):
    """
    Хранилище План-сетки смены.
    Формат: {'events': [...]}
    Каждый: {id, shiftId, dayIndex, timeStart, timeEnd, title, description, type, ...}
    """
    @abstractmethod
    def load(self) -> dict: ...

    @abstractmethod
    def save(self, data: dict) -> None: ...


class WorkshopsStore(ABC):
    """
    Хранилище Мастерских педагога.
    Формат: {'workshops': [...], 'participants': [...], 'badges': [...], 'confirmations': [...]}
    """
    @abstractmethod
    def load(self) -> dict: ...

    @abstractmethod
    def save(self, data: dict) -> None: ...


class ParentSuggestionsStore(ABC):
    """
    Хранилище предложений маршрутов от родителей.
    Формат: {'suggestions': [...]}
    Каждый: {id, parentId, childDeviceId, badges[], note, status, createdAt}
    """
    @abstractmethod
    def load(self) -> dict: ...

    @abstractmethod
    def save(self, data: dict) -> None: ...


class UsersStore(ABC):
    """
    Хранилище пользователей (Supabase Auth integration).
    Формат: {'users': [...]}
    Каждый: {id, supabase_auth_id, legacy_device_id, email, nickname, avatar_url, role, created_at, updated_at}
    """
    @abstractmethod
    def load(self) -> dict: ...

    @abstractmethod
    def save(self, data: dict) -> None: ...


class WorkshopProposalsStore(ABC):
    """
    Хранилище предложений Мастерской (значки, категории, версии, арты).
    Формат: {'proposals': [...]}
    Каждый: {id, type, title, description, status, createdBy, campId, squadId, createdAt, resolvedAt, resolvedBy}
    Типы: badge | category | version | art.
    Статусы: pending | approved | rejected.
    """
    @abstractmethod
    def load(self) -> dict: ...

    @abstractmethod
    def save(self, data: dict) -> None: ...


class RoleRequestsStore(ABC):
    """
    Хранилище заявок на роль.
    Формат: list of {id, deviceId, desiredRole, name, comment, status, createdAt, email?, accessToken?}
    """
    @abstractmethod
    def load(self) -> list: ...

    @abstractmethod
    def save(self, data: list) -> None: ...
