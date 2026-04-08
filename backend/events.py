# -*- coding: utf-8 -*-
"""
Формат событий для синхронизации и логов (Этап 7: группы и чаты).
Контракт: confirmation_requested, level_achieved.
"""

from __future__ import annotations

import json
import os
import threading
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from typing import Any, List, Optional

# Файл для заявок на подтверждение (append + лимит при чтении)
CONFIRMATION_EVENTS_FILE = os.path.join(os.path.dirname(__file__), "data", "confirmation_events.json")
MAX_EVENTS_READ = 500
_FILE_LOCK = threading.Lock()


@dataclass
class ConfirmationRequestedEvent:
    """Пользователь запросил подтверждение (прислал пруф в бота)."""
    levelId: Optional[str] = None
    badgeTitle: Optional[str] = None
    userId: Optional[str] = None
    username: Optional[str] = None
    text: str = ""
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())  # noqa: B008
    evidence: Optional[dict] = None  # ссылки/текст

    def to_dict(self) -> dict:
        d = asdict(self)
        return {k: v for k, v in d.items() if v is not None}


@dataclass
class LevelAchievedEvent:
    """Уровень отмечен как достигнутый (вожатый подтвердил или синхронизация)."""
    levelId: str
    userId: str
    achievedAt: str
    reflection: Optional[str] = None

    def to_dict(self) -> dict:
        return asdict(self)


def _ensure_events_dir():
    d = os.path.dirname(CONFIRMATION_EVENTS_FILE)
    if d and not os.path.isdir(d):
        os.makedirs(d, exist_ok=True)


def append_confirmation_event(event: ConfirmationRequestedEvent) -> None:
    """Добавить событие confirmation_requested в файл (append)."""
    try:
        _ensure_events_dir()
    except OSError as e:
        import logging
        logging.warning("Skipping event save due to readonly filesystem: %s", e)
        return

    record = {"type": "confirmation_requested", **event.to_dict()}
    with _FILE_LOCK:
        events: List[dict] = []
        if os.path.exists(CONFIRMATION_EVENTS_FILE):
            try:
                with open(CONFIRMATION_EVENTS_FILE, "r", encoding="utf-8") as f:
                    raw = f.read()
                    if raw.strip():
                        events = json.loads(raw)
            except (json.JSONDecodeError, OSError):
                events = []
        if not isinstance(events, list):
            events = []
        events.append(record)
        try:
            with open(CONFIRMATION_EVENTS_FILE, "w", encoding="utf-8") as f:
                json.dump(events, f, ensure_ascii=False, indent=2)
        except OSError as e:
            import logging
            logging.warning("Could not persist event %s: %s", record, e)


def append_level_achieved_event(event: LevelAchievedEvent) -> None:
    """Добавить событие level_achieved (вожатый подтвердил уровень). Один поток с confirmation_requested."""
    try:
        _ensure_events_dir()
    except OSError as e:
        import logging
        logging.warning("Skipping event save due to readonly filesystem: %s", e)
        return

    record = {"type": "level_achieved", **event.to_dict()}
    with _FILE_LOCK:
        events: List[dict] = []
        if os.path.exists(CONFIRMATION_EVENTS_FILE):
            try:
                with open(CONFIRMATION_EVENTS_FILE, "r", encoding="utf-8") as f:
                    raw = f.read()
                    if raw.strip():
                        events = json.loads(raw)
            except (json.JSONDecodeError, OSError):
                events = []
        if not isinstance(events, list):
            events = []
        events.append(record)
        try:
            with open(CONFIRMATION_EVENTS_FILE, "w", encoding="utf-8") as f:
                json.dump(events, f, ensure_ascii=False, indent=2)
        except OSError as e:
            import logging
            logging.warning("Could not persist event %s: %s", record, e)


def get_confirmation_events(limit: int = MAX_EVENTS_READ) -> List[dict]:
    """Вернуть последние события (для вожатого/админа)."""
    if not os.path.exists(CONFIRMATION_EVENTS_FILE):
        return []
    with _FILE_LOCK:
        try:
            with open(CONFIRMATION_EVENTS_FILE, "r", encoding="utf-8") as f:
                raw = f.read()
                if not raw.strip():
                    return []
                events = json.loads(raw)
        except (json.JSONDecodeError, OSError):
            return []
    if not isinstance(events, list):
        return []
    return events[-limit:]
