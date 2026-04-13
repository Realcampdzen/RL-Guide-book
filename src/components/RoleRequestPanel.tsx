import type React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { fetchMyRoleRequests, type RoleRequest, submitRoleRequest } from '../utils/roleRequestApi';

interface RoleRequestPanelProps {
  accessToken: string | null;
  deviceId: string;
  currentRole: string;
}

const AVAILABLE_ROLES = [
  { value: 'counselor', label: '🏕️ Вожатый' },
  { value: 'educator', label: '📚 Педагог' },
  { value: 'counselor_trainee', label: '🌱 Вожатый-стажёр' },
];

export const RoleRequestPanel: React.FC<RoleRequestPanelProps> = ({
  accessToken,
  deviceId,
  currentRole,
}) => {
  const [selectedRole, setSelectedRole] = useState('');
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [myRequests, setMyRequests] = useState<RoleRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  const loadRequests = useCallback(async () => {
    if (!deviceId) return;
    setLoadingRequests(true);
    try {
      const requests = await fetchMyRoleRequests(deviceId);
      setMyRequests(requests);
    } catch {
      // silent
    } finally {
      setLoadingRequests(false);
    }
  }, [deviceId]);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  const handleSubmit = async () => {
    if (!accessToken || !selectedRole) return;
    setBusy(true);
    setError(null);
    setSuccess(false);
    try {
      await submitRoleRequest(accessToken, selectedRole, comment || undefined);
      setSuccess(true);
      setSelectedRole('');
      setComment('');
      void loadRequests();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка отправки');
    } finally {
      setBusy(false);
    }
  };

  const pendingRequest = myRequests.find((r) => r.status === 'pending');
  const statusLabel: Record<string, { text: string; color: string }> = {
    pending: { text: '⏳ На рассмотрении', color: 'rgba(255, 196, 86, 0.9)' },
    approved: { text: '✅ Одобрено', color: 'rgba(90, 215, 140, 0.9)' },
    rejected: { text: '❌ Отклонено', color: 'rgba(255, 110, 110, 0.9)' },
  };

  return (
    <div style={{ padding: '16px 0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'rgba(255,255,255,0.95)' }}>
        Запросить роль
      </h3>
      <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.65)', lineHeight: 1.5 }}>
        Ваша текущая роль:{' '}
        <strong style={{ color: 'rgba(139, 0, 255, 0.9)' }}>{currentRole}</strong>. Подайте заявку
        на новую роль — администратор рассмотрит её.
      </p>

      {pendingRequest && (
        <div
          style={{
            padding: '12px 14px',
            background: 'rgba(255, 196, 86, 0.08)',
            border: '1px solid rgba(255, 196, 86, 0.25)',
            borderRadius: '12px',
            fontSize: '13px',
            color: 'rgba(255, 196, 86, 0.9)',
          }}
        >
          ⏳ У вас уже есть заявка на роль <strong>{pendingRequest.desiredRole}</strong> — ожидает
          решения.
        </div>
      )}

      {!pendingRequest && (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.75)' }}>
              Желаемая роль
            </label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {AVAILABLE_ROLES.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setSelectedRole(r.value)}
                  style={{
                    padding: '8px 14px',
                    fontSize: '13px',
                    fontWeight: 600,
                    border: `1px solid ${selectedRole === r.value ? 'rgba(139,0,255,0.5)' : 'rgba(255,255,255,0.15)'}`,
                    borderRadius: '10px',
                    background:
                      selectedRole === r.value ? 'rgba(139,0,255,0.2)' : 'rgba(255,255,255,0.04)',
                    color: selectedRole === r.value ? '#fff' : 'rgba(255,255,255,0.8)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.75)' }}>
              Комментарий (необязательно)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Расскажите, почему хотите эту роль..."
              maxLength={300}
              rows={3}
              style={{
                padding: '10px 12px',
                fontSize: '13px',
                color: '#fff',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '10px',
                resize: 'vertical',
                fontFamily: 'inherit',
              }}
            />
          </div>

          <button
            type="button"
            disabled={!selectedRole || busy}
            onClick={handleSubmit}
            style={{
              padding: '12px',
              fontSize: '14px',
              fontWeight: 700,
              color: '#fff',
              background: selectedRole
                ? 'linear-gradient(135deg, #8B00FF, #4D00B4)'
                : 'rgba(255,255,255,0.08)',
              border: 'none',
              borderRadius: '12px',
              cursor: selectedRole ? 'pointer' : 'not-allowed',
              opacity: busy ? 0.6 : 1,
              transition: 'opacity 0.2s',
            }}
          >
            {busy ? 'Отправка...' : 'Отправить заявку'}
          </button>
        </>
      )}

      {error && (
        <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255, 110, 110, 0.9)' }}>{error}</p>
      )}
      {success && (
        <p style={{ margin: 0, fontSize: '13px', color: 'rgba(90, 215, 140, 0.9)' }}>
          ✅ Заявка отправлена! Администратор рассмотрит её в ближайшее время.
        </p>
      )}

      {myRequests.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
          <h4
            style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}
          >
            Мои заявки
          </h4>
          {loadingRequests && (
            <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
              Загрузка...
            </p>
          )}
          {myRequests.map((req) => {
            const st = statusLabel[req.status] || {
              text: req.status,
              color: 'rgba(255,255,255,0.6)',
            };
            return (
              <div
                key={req.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 12px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '10px',
                  fontSize: '13px',
                }}
              >
                <span style={{ color: 'rgba(255,255,255,0.85)' }}>{req.desiredRole}</span>
                <span style={{ color: st.color, fontWeight: 600, fontSize: '12px' }}>
                  {st.text}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RoleRequestPanel;
