import type React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createEvent,
  deleteEvent,
  fetchSchedule,
  type ScheduleEvent,
  type ScheduleEventType,
  updateEvent,
} from '../utils/scheduleApi';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ShiftSchedulePanelProps {
  shiftId: string;
  shiftDays: number;
  accessToken?: string | null;
  canEdit?: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TIME_SLOTS = [
  '07:00',
  '08:00',
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
  '19:00',
  '20:00',
  '21:00',
  '22:00',
];

const EVENT_COLORS: Record<ScheduleEventType, { bg: string; border: string; label: string }> = {
  event: { bg: 'rgba(34,197,94,0.15)', border: 'rgba(34,197,94,0.3)', label: '🟢 Мероприятие' },
  training: { bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.3)', label: '🟡 Тренинг' },
  workshop: { bg: 'rgba(59,130,246,0.15)', border: 'rgba(59,130,246,0.3)', label: '🔵 Мастерская' },
  tradition: { bg: 'rgba(168,85,247,0.15)', border: 'rgba(168,85,247,0.3)', label: '🟣 Традиция' },
  free_time: {
    bg: 'rgba(107,114,128,0.15)',
    border: 'rgba(107,114,128,0.3)',
    label: '⚪ Свободное время',
  },
  meal: { bg: 'rgba(249,115,22,0.15)', border: 'rgba(249,115,22,0.3)', label: '🟠 Приём пищи' },
};

const EVENT_TYPES: ScheduleEventType[] = [
  'event',
  'training',
  'workshop',
  'tradition',
  'free_time',
  'meal',
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const ShiftSchedulePanel: React.FC<ShiftSchedulePanelProps> = ({
  shiftId,
  shiftDays,
  accessToken,
  canEdit,
}) => {
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState(1);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ScheduleEvent | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formType, setFormType] = useState<ScheduleEventType>('event');
  const [formTime, setFormTime] = useState('08:00');
  const [formEndTime, setFormEndTime] = useState('');
  const [formResponsible, setFormResponsible] = useState('');
  const [busy, setBusy] = useState(false);

  const dayKeys = useMemo(() => Array.from({ length: shiftDays }, (_, i) => i + 1), [shiftDays]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setEvents(await fetchSchedule(shiftId));
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [shiftId]);

  useEffect(() => {
    void load();
  }, [load]);

  const dayEvents = useMemo(
    () =>
      events
        .filter((e) => e.dayIndex === selectedDay)
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [events, selectedDay]
  );

  const eventsBySlot = useMemo(() => {
    const map = new Map<string, ScheduleEvent[]>();
    dayEvents.forEach((e) => {
      const slot = e.startTime.slice(0, 5);
      map.set(slot, [...(map.get(slot) ?? []), e]);
    });
    return map;
  }, [dayEvents]);

  // Open modal for new event
  const openCreate = useCallback((time: string) => {
    setEditingEvent(null);
    setFormTitle('');
    setFormType('event');
    setFormTime(time);
    setFormEndTime('');
    setFormResponsible('');
    setModalOpen(true);
  }, []);

  // Open modal for editing
  const openEdit = useCallback((ev: ScheduleEvent) => {
    setEditingEvent(ev);
    setFormTitle(ev.title);
    setFormType(ev.type);
    setFormTime(ev.startTime);
    setFormEndTime(ev.endTime ?? '');
    setFormResponsible(ev.responsible ?? '');
    setModalOpen(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!accessToken || !formTitle.trim()) return;
    setBusy(true);
    try {
      if (editingEvent) {
        await updateEvent(accessToken, editingEvent.id, {
          title: formTitle.trim(),
          type: formType,
          startTime: formTime,
          endTime: formEndTime || undefined,
          responsible: formResponsible.trim() || undefined,
        });
      } else {
        await createEvent(accessToken, shiftId, {
          dayIndex: selectedDay,
          startTime: formTime,
          endTime: formEndTime || undefined,
          title: formTitle.trim(),
          type: formType,
          responsible: formResponsible.trim() || undefined,
        });
      }
      setModalOpen(false);
      void load();
    } catch {
      /* silent */
    } finally {
      setBusy(false);
    }
  }, [
    accessToken,
    editingEvent,
    formTitle,
    formType,
    formTime,
    formEndTime,
    formResponsible,
    shiftId,
    selectedDay,
    load,
  ]);

  const handleDelete = useCallback(async () => {
    if (!accessToken || !editingEvent) return;
    setBusy(true);
    try {
      await deleteEvent(accessToken, editingEvent.id);
      setModalOpen(false);
      void load();
    } catch {
      /* silent */
    } finally {
      setBusy(false);
    }
  }, [accessToken, editingEvent, load]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 14, fontWeight: 800, color: '#f59e0b' }}>📅 План-сетка</span>
        <button
          type="button"
          className="btn-secondary"
          style={{ padding: '4px 10px', fontSize: 11 }}
          disabled={loading}
          onClick={() => void load()}
        >
          🔄
        </button>
      </div>

      {/* Day selector */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {dayKeys.map((d) => (
          <button
            key={d}
            type="button"
            className="btn-secondary"
            style={{
              padding: '4px 8px',
              fontSize: 10,
              minWidth: 36,
              background: selectedDay === d ? 'rgba(245,158,11,0.2)' : undefined,
              color: selectedDay === d ? '#f59e0b' : undefined,
              border: selectedDay === d ? '1px solid rgba(245,158,11,0.4)' : undefined,
            }}
            onClick={() => setSelectedDay(d)}
          >
            {d}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {TIME_SLOTS.map((slot) => {
          const slotEvents = eventsBySlot.get(slot) ?? [];
          return (
            <div key={slot} style={{ display: 'flex', gap: 4, minHeight: 32 }}>
              <div
                style={{
                  width: 48,
                  flexShrink: 0,
                  fontSize: 10,
                  opacity: 0.5,
                  paddingTop: 4,
                  textAlign: 'right',
                  paddingRight: 6,
                }}
              >
                {slot}
              </div>
              <div
                style={{
                  flex: 1,
                  borderRadius: 6,
                  minHeight: 28,
                  padding: '2px 4px',
                  background: slotEvents.length > 0 ? 'transparent' : 'rgba(0,0,0,0.06)',
                  border: '1px solid rgba(255,255,255,0.04)',
                  cursor: canEdit ? 'pointer' : 'default',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                }}
                onClick={() => {
                  if (canEdit && slotEvents.length === 0) openCreate(slot);
                }}
              >
                {slotEvents.map((ev) => {
                  const c = EVENT_COLORS[ev.type] ?? EVENT_COLORS.event;
                  return (
                    <div
                      key={ev.id}
                      style={{
                        padding: '3px 6px',
                        borderRadius: 4,
                        fontSize: 10,
                        background: c.bg,
                        border: `1px solid ${c.border}`,
                        cursor: canEdit ? 'pointer' : 'default',
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (canEdit) openEdit(ev);
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>{ev.title}</span>
                      {ev.responsible && (
                        <span style={{ opacity: 0.6, marginLeft: 4 }}>· {ev.responsible}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
        {EVENT_TYPES.map((t) => {
          const c = EVENT_COLORS[t];
          return (
            <span
              key={t}
              style={{
                fontSize: 9,
                padding: '1px 5px',
                borderRadius: 4,
                background: c.bg,
                border: `1px solid ${c.border}`,
              }}
            >
              {c.label}
            </span>
          );
        })}
      </div>

      {/* Create/Edit Modal */}
      {modalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setModalOpen(false)}
        >
          <div
            style={{
              background: 'var(--surface-2, #1a1a2e)',
              borderRadius: 16,
              padding: 20,
              maxWidth: 380,
              width: '90%',
              border: '1px solid rgba(245,158,11,0.25)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h4 style={{ margin: '0 0 12px', color: '#f59e0b' }}>
              {editingEvent ? '✏️ Редактировать' : '➕ Новое событие'}
            </h4>

            <input
              type="text"
              placeholder="Название"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              style={{
                width: '100%',
                padding: 10,
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(0,0,0,0.3)',
                color: '#fff',
                fontSize: 13,
                marginBottom: 8,
                boxSizing: 'border-box',
              }}
            />

            <select
              value={formType}
              onChange={(e) => setFormType(e.target.value as ScheduleEventType)}
              style={{
                width: '100%',
                padding: 10,
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(0,0,0,0.3)',
                color: '#fff',
                fontSize: 13,
                marginBottom: 8,
                boxSizing: 'border-box',
              }}
            >
              {EVENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {EVENT_COLORS[t].label}
                </option>
              ))}
            </select>

            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input
                type="time"
                value={formTime}
                onChange={(e) => setFormTime(e.target.value)}
                style={{
                  flex: 1,
                  padding: 10,
                  borderRadius: 8,
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'rgba(0,0,0,0.3)',
                  color: '#fff',
                  fontSize: 13,
                  boxSizing: 'border-box',
                }}
              />
              <input
                type="time"
                value={formEndTime}
                onChange={(e) => setFormEndTime(e.target.value)}
                placeholder="До"
                style={{
                  flex: 1,
                  padding: 10,
                  borderRadius: 8,
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'rgba(0,0,0,0.3)',
                  color: '#fff',
                  fontSize: 13,
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <input
              type="text"
              placeholder="Ответственный"
              value={formResponsible}
              onChange={(e) => setFormResponsible(e.target.value)}
              style={{
                width: '100%',
                padding: 10,
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(0,0,0,0.3)',
                color: '#fff',
                fontSize: 13,
                marginBottom: 8,
                boxSizing: 'border-box',
              }}
            />

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className="btn-primary-gold"
                disabled={busy || !formTitle.trim()}
                onClick={() => void handleSave()}
                style={{ flex: 1, padding: '10px 16px' }}
              >
                {busy ? 'Сохранение…' : editingEvent ? 'Сохранить' : 'Создать'}
              </button>
              {editingEvent && (
                <button
                  type="button"
                  style={{
                    padding: '10px 14px',
                    background: 'rgba(239,68,68,0.15)',
                    color: '#ef4444',
                    border: '1px solid rgba(239,68,68,0.3)',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontSize: 12,
                  }}
                  disabled={busy}
                  onClick={() => void handleDelete()}
                >
                  🗑
                </button>
              )}
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setModalOpen(false)}
                style={{ padding: '10px 16px' }}
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShiftSchedulePanel;
