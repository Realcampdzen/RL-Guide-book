"""
backend/storage/__init__.py — фабрика get_store().

Переключение провайдера:
  USE_SUPABASE=false (по умолчанию) → JSON-файлы (local dev, backward compat)
  USE_SUPABASE=true                 → Supabase Postgres (staging / prod)

Использование в app.py:
    from storage import get_store
    data = get_store('shifts').load()
    get_store('shifts').save(data)

Ключи сторов:
    'shifts'              — ShiftsStore (смены + отряды)
    'memberships'         — MembershipsStore
    'squad_corners'       — SquadCornersStore
    'squad_invites'       — SquadInvitesStore
    'squad_messages'      — SquadMessagesStore
    'badge_requests'      — BadgeRequestsStore
    'badge_plans'         — BadgePlansStore
    'parent_snapshots'    — ParentSnapshotsStore
    'chat_daily_usage'    — ChatDailyUsageStore
    'council_initiatives' — CouncilInitiativesStore
    'teams'               — TeamsStore
    'badge_arts'          — BadgeArtsStore
    'engines'             — EnginesStore
    'engine_members'      — EngineMembersStore
    'inspector_progress'  — InspectorProgressStore
    'bro_events'          — BroEventsStore
    'bro_passports'       — BroPassportsStore
    'bro_submissions'     — BroSubmissionsStore
    'bro_initiatives'     — BroInitiativesStore
    'shift_schedule'      — ShiftScheduleStore
    'workshops'           — WorkshopsStore
    'parent_suggestions'  — ParentSuggestionsStore
    'family_links'        — FamilyLinksStore
"""

import os

USE_SUPABASE = os.environ.get("USE_SUPABASE", "false").lower() == "true"


def get_store(name: str):
    """
    Возвращает Store-экземпляр по имени.
    Провайдер выбирается один раз при инициализации модуля (USE_SUPABASE).
    """
    if USE_SUPABASE:
        from .supabase_provider import SUPABASE_STORES
        store = SUPABASE_STORES.get(name)
    else:
        from .json_provider import JSON_STORES
        store = JSON_STORES.get(name)

    if store is None:
        raise KeyError(
            f"Unknown store name: {name!r}. "
            f"Valid names: shifts, memberships, squad_corners, squad_invites, "
            f"squad_messages, badge_requests, badge_plans, parent_snapshots, chat_daily_usage, "
            f"council_initiatives, council_members, council_protocols, teams, badge_arts, engines, engine_members, inspector_progress, "
            f"bro_events, bro_passports, bro_submissions, bro_initiatives, shift_schedule, workshops, parent_suggestions, users, workshop_proposals, role_requests, family_links"
        )
    return store

