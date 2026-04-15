import React, { useState } from 'react';
import type { UserRole } from '../../../types/authRole';
import type {
  BadgeRequestItem,
  SquadJoinRequestItem,
  SquadMineResponse,
} from '../../../utils/badgeApprovalApi';
import { approveBadgeRequest, rejectBadgeRequest } from '../../../utils/badgeApprovalApi';
import { useHintOverlay } from '../../../context/HintOverlayContext';

interface JoinRequestsContainerProps {
  accessToken: string | null | undefined;
  role: UserRole;
  canRequestApprovals: boolean;
  canModerateApprovals: boolean;
  canSeeOwnRequests: boolean;
  isParentChildReadonlyView: boolean;
  syncApprovedLevels: () => Promise<void>;
  approvalsSyncBusy: boolean;
  approvalsSyncStatus: string | null;
  showSandbox?: boolean;
  isSpaceshipMode?: boolean;
  setActiveTab: (tab: any) => void;
  setSquadCornerReturnToOrganizer: (val: boolean) => void;
  openCabinPanel: (panel: any, side: any) => void;
  
  // States from ProfileView
  badgeRequestsMine: BadgeRequestItem[];
  squadJoinRequestsMine: SquadJoinRequestItem[];
  badgeRequestsInbox: BadgeRequestItem[];
  badgeRequestsBusy: boolean;
  badgeRequestsError: string | null;
  squadJoinRequestsBusy: boolean;
  squadJoinRequestsError: string | null;
  mySquadBusy: boolean;
  mySquadError: string | null;
  mySquadInfo: SquadMineResponse | null;
  
  // Actions and Loaders from ProfileView
  loadBadgeApprovalsData: () => Promise<void>;
  loadMySquadJoinRequestsData: () => Promise<void>;
  loadMySquadInfo: () => Promise<void>;
  
  // Join squad props
  mySquadJoinCode: string;
  setMySquadJoinCode: (code: string) => void;
  mySquadJoinId: string;
  setMySquadJoinId: (id: string) => void;
  mySquadJoinBusy: boolean;
  mySquadJoinStatus: string | null;
  joinMySquadByCode: () => Promise<void>;
  joinMySquadById: () => Promise<void>;
  setMySquadJoinStatus: (status: string | null) => void;
  
  // Set inbox
  setBadgeRequestsInbox: (callback: (prev: BadgeRequestItem[]) => BadgeRequestItem[]) => void;
  setBadgeRequestsBusy: (busy: boolean) => void;
  setBadgeRequestsError: (error: string | null) => void;
}

export const JoinRequestsContainer: React.FC<JoinRequestsContainerProps> = ({
  accessToken,
  role,
  canRequestApprovals,
  canModerateApprovals,
  canSeeOwnRequests,
  isParentChildReadonlyView,
  syncApprovedLevels,
  approvalsSyncBusy,
  approvalsSyncStatus,
  showSandbox = false,
  isSpaceshipMode = true,
  setActiveTab,
  setSquadCornerReturnToOrganizer,
  openCabinPanel,
  
  badgeRequestsMine,
  squadJoinRequestsMine,
  badgeRequestsInbox,
  badgeRequestsBusy,
  badgeRequestsError,
  squadJoinRequestsBusy,
  squadJoinRequestsError,
  mySquadBusy,
  mySquadError,
  mySquadInfo,
  
  loadBadgeApprovalsData,
  loadMySquadJoinRequestsData,
  loadMySquadInfo,
  
  mySquadJoinCode,
  setMySquadJoinCode,
  mySquadJoinId,
  setMySquadJoinId,
  mySquadJoinBusy,
  mySquadJoinStatus,
  joinMySquadByCode,
  joinMySquadById,
  setMySquadJoinStatus,
  
  setBadgeRequestsInbox,
  setBadgeRequestsBusy,
  setBadgeRequestsError,
}) => {
  const { showHint } = useHintOverlay();
  const [rejectExpandedId, setRejectExpandedId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [evidenceExpandedId, setEvidenceExpandedId] = useState<string | null>(null);

  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <button
          type="button"
          className="btn-secondary"
          style={{ padding: '8px 14px' }}
          disabled={badgeRequestsBusy || squadJoinRequestsBusy || mySquadBusy}
          onClick={async () => {
            await loadBadgeApprovalsData();
            await loadMySquadJoinRequestsData();
            await loadMySquadInfo();
          }}
        >
          {badgeRequestsBusy || squadJoinRequestsBusy || mySquadBusy
            ? 'Загрузка...'
            : 'Обновить'}
        </button>
        {canRequestApprovals && (
          <button
            type="button"
            className="btn-secondary"
            style={{ padding: '8px 14px' }}
            disabled={approvalsSyncBusy}
            onClick={() => void syncApprovedLevels()}
          >
            {approvalsSyncBusy ? 'Синхронизация...' : 'Синхронизировать одобрения'}
          </button>
        )}
      </div>
      {badgeRequestsError && (
        <div className="profile-error profile-error--not-found">
          {badgeRequestsError}
        </div>
      )}
      {approvalsSyncStatus && (
        <div style={{ fontSize: 12, opacity: 0.88 }}>{approvalsSyncStatus}</div>
      )}

      {/* Мой отряд */}
      <div
        style={{
          padding: 12,
          borderRadius: 12,
          background: 'rgba(0,0,0,0.32)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, opacity: 0.9 }}>
          Мой отряд
        </div>
        {!accessToken && (
          <div style={{ fontSize: 12, opacity: 0.8 }}>
            Войдите по коду, чтобы привязать устройство к отряду.
          </div>
        )}
        {accessToken && (
          <>
            {mySquadError && (
              <div
                className="profile-error profile-error--not-found"
                style={{ marginBottom: 8 }}
              >
                {mySquadError}
              </div>
            )}
            {mySquadInfo?.membership ? (
              <div style={{ fontSize: 12, lineHeight: 1.5 }}>
                <div>
                  Смена:{' '}
                  <strong>
                    {mySquadInfo.shift?.name || mySquadInfo.membership.campId || '—'}
                  </strong>
                </div>
                <div>
                  Отряд:{' '}
                  <strong>
                    {mySquadInfo.squad?.name || mySquadInfo.membership.squadId || '—'}
                  </strong>
                </div>
                <div style={{ marginTop: 8 }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ padding: '8px 12px' }}
                    onClick={() => {
                      if (!isSpaceshipMode) {
                        showHint({
                          title: 'Кабинет отряда',
                          content:
                            'Кабинет отряда открывается в режиме Кабины (profile-desktop).',
                        });
                        return;
                      }
                      setActiveTab('active');
                      setSquadCornerReturnToOrganizer(false);
                      window.dispatchEvent(
                        new CustomEvent('profile:openTab', {
                          detail: { panel: 'squad-corner', tab: 'squad' },
                        })
                      );
                      openCabinPanel('squad-corner', 'left');
                    }}
                  >
                    Открыть кабинет
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 8 }}>
                Вы пока не состоите в отряде.
              </div>
            )}
            {(role === 'participant' ||
              role === 'parent' ||
              role === 'counselor' ||
              role === 'shift_leader' ||
              role === 'developer') && (
              <div
                style={{
                  display: 'flex',
                  gap: 8,
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  marginTop: 8,
                }}
              >
                <input
                  type="text"
                  value={mySquadJoinCode}
                  onChange={(e) => {
                    setMySquadJoinCode(e.target.value.toUpperCase());
                    setMySquadJoinStatus(null);
                  }}
                  placeholder="Введите код приглашения"
                  style={{
                    flex: 1,
                    minWidth: 140,
                    padding: '8px 10px',
                    borderRadius: 8,
                    border: '1px solid rgba(255,255,255,0.2)',
                    background: 'rgba(0,0,0,0.2)',
                    color: '#fff',
                    fontSize: 13,
                  }}
                />
                <button
                  type="button"
                  className="btn-primary-gold"
                  style={{ padding: '8px 14px' }}
                  disabled={mySquadJoinBusy}
                  onClick={() => void joinMySquadByCode()}
                >
                  {mySquadJoinBusy ? 'Вступаем...' : 'Вступить'}
                </button>
              </div>
            )}
            {showSandbox && role === 'developer' && (
              <div
                style={{
                  display: 'flex',
                  gap: 8,
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  marginTop: 8,
                }}
              >
                <input
                  type="text"
                  value={mySquadJoinId}
                  onChange={(e) => {
                    setMySquadJoinId(e.target.value);
                    setMySquadJoinStatus(null);
                  }}
                  placeholder="Dev fallback: squadId"
                  style={{
                    flex: 1,
                    minWidth: 140,
                    padding: '8px 10px',
                    borderRadius: 8,
                    border: '1px solid rgba(255,255,255,0.2)',
                    background: 'rgba(0,0,0,0.2)',
                    color: '#fff',
                    fontSize: 13,
                  }}
                />
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ padding: '8px 14px' }}
                  disabled={mySquadJoinBusy}
                  onClick={() => void joinMySquadById()}
                >
                  Вступить по squadId
                </button>
              </div>
            )}
            {mySquadJoinStatus && (
              <div style={{ marginTop: 8, fontSize: 12, opacity: 0.86 }}>
                {mySquadJoinStatus}
              </div>
            )}
            {canModerateApprovals && (mySquadInfo?.participants?.length || 0) > 0 && (
              <div style={{ marginTop: 10 }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    opacity: 0.8,
                    marginBottom: 6,
                  }}
                >
                  Участники отряда
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                    maxHeight: 120,
                    overflowY: 'auto',
                  }}
                >
                  {(mySquadInfo?.participants || []).map((p) => (
                    <div key={p.deviceId} style={{ fontSize: 12, opacity: 0.92 }}>
                      {p.nickname || 'Без ника'} · {p.deviceId}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {canSeeOwnRequests && !isParentChildReadonlyView && (
        <div
          id="profile-badge-requests-mine"
          style={{
            padding: 12,
            borderRadius: 12,
            background: 'rgba(0,0,0,0.32)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, opacity: 0.9 }}>
            Мои заявки
          </div>
          {badgeRequestsBusy || squadJoinRequestsBusy ? (
            <div style={{ fontSize: 12, opacity: 0.7 }}>Загружаем заявки…</div>
          ) : (
            <>
              {squadJoinRequestsError && (
                <div style={{ fontSize: 12, marginBottom: 8 }}>
                  <span style={{ opacity: 0.8 }}>{squadJoinRequestsError}</span>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ marginLeft: 8, padding: '4px 10px', fontSize: 11 }}
                    onClick={loadMySquadJoinRequestsData}
                  >
                    Повторить
                  </button>
                </div>
              )}
              <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 6 }}>
                Заявки в отряды
              </div>
              {squadJoinRequestsMine.length === 0 ? (
                <div
                  style={{
                    fontSize: 12,
                    opacity: 0.8,
                    marginBottom: canRequestApprovals ? 12 : 0,
                  }}
                >
                  Заявок в отряды пока нет.
                </div>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    maxHeight: 220,
                    overflowY: 'auto',
                    marginBottom: canRequestApprovals ? 12 : 0,
                  }}
                >
                  {squadJoinRequestsMine.map((req) => {
                    const statusTone =
                      req.status === 'approved'
                        ? 'approved'
                        : req.status === 'rejected'
                          ? 'rejected'
                          : 'pending';
                    const statusLabel =
                      req.status === 'approved'
                        ? 'Одобрено'
                        : req.status === 'rejected'
                          ? 'Отклонено'
                          : 'На проверке';
                    return (
                      <div
                        key={req.id}
                        style={{
                          padding: 8,
                          borderRadius: 8,
                          background: 'rgba(0,0,0,0.2)',
                          border: '1px solid rgba(255,255,255,0.08)',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            gap: 8,
                            flexWrap: 'wrap',
                            marginBottom: 4,
                          }}
                        >
                          <div style={{ fontSize: 12, fontWeight: 700 }}>
                            Отряд: {req.squadName || req.squadId}
                          </div>
                          <span
                            className={`m3-status-chip badge-request-status-chip tone-${statusTone}`}
                          >
                            {statusLabel}
                          </span>
                        </div>
                        <div style={{ fontSize: 11, opacity: 0.6 }}>
                          {new Date(req.createdAt).toLocaleString('ru-RU')}
                        </div>
                        {req.message && (
                          <div style={{ fontSize: 11, opacity: 0.72, marginTop: 4 }}>
                            {req.message}
                          </div>
                        )}
                        {req.status === 'rejected' && req.resolutionNote && (
                          <div style={{ fontSize: 11, opacity: 0.55, marginTop: 4 }}>
                            Причина: {req.resolutionNote}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {canRequestApprovals && (
                <>
                  <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 6 }}>
                    Заявки на значки
                  </div>
                  {badgeRequestsError ? (
                    <div style={{ fontSize: 12 }}>
                      <span style={{ opacity: 0.8 }}>{badgeRequestsError}</span>
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ marginLeft: 8, padding: '4px 10px', fontSize: 11 }}
                        onClick={loadBadgeApprovalsData}
                      >
                        Повторить
                      </button>
                    </div>
                  ) : badgeRequestsMine.length === 0 ? (
                    <div style={{ fontSize: 12, opacity: 0.8 }}>
                      Заявок пока нет. Подтверди уровень значка, чтобы отправить первую.{' '}
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ padding: '4px 10px', fontSize: 11, marginTop: 6 }}
                        onClick={() => {
                          setActiveTab('active');
                          setTimeout(() => {
                            document
                              .getElementById('profile-tab-active')
                              ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }, 80);
                        }}
                      >
                        К значкам «В пути»
                      </button>
                    </div>
                  ) : (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                        maxHeight: 260,
                        overflowY: 'auto',
                      }}
                    >
                      {badgeRequestsMine.map((req) => {
                        const statusTone =
                          req.status === 'approved'
                            ? 'approved'
                            : req.status === 'rejected'
                              ? 'rejected'
                              : 'pending';
                        const statusLabel =
                          req.status === 'approved'
                            ? 'Одобрено'
                            : req.status === 'rejected'
                              ? 'Отклонено'
                              : 'На проверке';
                        return (
                          <div
                            key={req.id}
                            style={{
                              padding: 8,
                              borderRadius: 8,
                              background: 'rgba(0,0,0,0.2)',
                              border: '1px solid rgba(255,255,255,0.08)',
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'flex-start',
                                gap: 8,
                                flexWrap: 'wrap',
                                marginBottom: 4,
                              }}
                            >
                              <div style={{ fontSize: 12, fontWeight: 700 }}>
                                {req.badgeTitle || req.levelId}
                                {req.badgeTitle && (
                                  <span
                                    style={{
                                      fontSize: 11,
                                      opacity: 0.6,
                                      fontWeight: 400,
                                      marginLeft: 4,
                                    }}
                                  >
                                    {req.levelId}
                                  </span>
                                )}
                              </div>
                              <span
                                className={`m3-status-chip badge-request-status-chip tone-${statusTone}`}
                              >
                                {statusLabel}
                              </span>
                            </div>
                            <div style={{ fontSize: 11, opacity: 0.6 }}>
                              {new Date(req.createdAt).toLocaleString('ru-RU')}
                            </div>
                            {req.status === 'rejected' && req.resolutionNote && (
                              <div
                                style={{
                                  fontSize: 11,
                                  opacity: 0.55,
                                  marginTop: 4,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  maxWidth: '100%',
                                }}
                                title={req.resolutionNote}
                              >
                                Причина:{' '}
                                {req.resolutionNote.length > 100
                                  ? req.resolutionNote.slice(0, 100) + '…'
                                  : req.resolutionNote}
                              </div>
                            )}
                            {req.status === 'approved' && (
                              <button
                                type="button"
                                className="btn-secondary"
                                style={{
                                  marginTop: 8,
                                  padding: '5px 12px',
                                  fontSize: 11,
                                }}
                                disabled={approvalsSyncBusy}
                                onClick={syncApprovedLevels}
                              >
                                {approvalsSyncBusy
                                  ? 'Синхронизируем…'
                                  : 'Синхронизировать'}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      )}

      {canModerateApprovals && (
        <div
          style={{
            padding: 12,
            borderRadius: 12,
            background: 'rgba(0,0,0,0.32)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, opacity: 0.9 }}>
            Входящие заявки
            {badgeRequestsInbox.filter((r) => r.status === 'pending').length > 0
              ? ` (${badgeRequestsInbox.filter((r) => r.status === 'pending').length})`
              : ''}
          </div>
          {badgeRequestsInbox.length === 0 ? (
            <div style={{ fontSize: 12, opacity: 0.8 }}>Входящих заявок нет.</div>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                maxHeight: 360,
                overflowY: 'auto',
              }}
            >
              {badgeRequestsInbox.map((req) => (
                <div
                  key={req.id}
                  style={{
                    padding: 8,
                    borderRadius: 8,
                    background: 'rgba(0,0,0,0.2)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 700 }}>
                    {req.levelId} {req.badgeTitle ? `· ${req.badgeTitle}` : ''}
                  </div>
                  <div style={{ fontSize: 11, opacity: 0.8 }}>
                    {req.requestedBy?.nickname || req.requestedBy?.deviceId || '—'}
                    {req.squadId && (
                      <span style={{ opacity: 0.6 }}> · отряд {req.squadId}</span>
                    )}
                    <span style={{ opacity: 0.6 }}>
                      {' '}
                      · {new Date(req.createdAt).toLocaleString('ru-RU')}
                    </span>
                  </div>
                  {req.evidence &&
                    (req.evidence.reflection ||
                      req.evidence.impact ||
                      req.evidence.link) && (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            setEvidenceExpandedId(
                              evidenceExpandedId === req.id ? null : req.id
                            )
                          }
                          style={{
                            fontSize: 11,
                            opacity: 0.6,
                            background: 'none',
                            border: 'none',
                            color: 'inherit',
                            cursor: 'pointer',
                            padding: 0,
                            marginTop: 4,
                          }}
                        >
                          {evidenceExpandedId === req.id
                            ? 'Скрыть пруф ▲'
                            : 'Показать пруф ▼'}
                        </button>
                        {evidenceExpandedId === req.id && (
                          <div
                            style={{
                              fontSize: 11,
                              opacity: 0.7,
                              marginTop: 4,
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 2,
                            }}
                          >
                            {req.evidence.reflection && (
                              <span>Рефлексия: {req.evidence.reflection}</span>
                            )}
                            {req.evidence.impact && (
                              <span>Результат: {req.evidence.impact}</span>
                            )}
                            {req.evidence.link && (
                              <a
                                href={req.evidence.link}
                                target="_blank"
                                rel="noreferrer"
                                style={{ color: 'inherit' }}
                              >
                                Ссылка
                              </a>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  {req.status === 'pending' && (
                    <>
                      <div
                        style={{
                          marginTop: 8,
                          display: 'flex',
                          gap: 8,
                          flexWrap: 'wrap',
                        }}
                      >
                        <button
                          type="button"
                          className="btn-primary-gold"
                          style={{ padding: '6px 12px', fontSize: 12 }}
                          disabled={badgeRequestsBusy}
                          onClick={async () => {
                            setBadgeRequestsBusy(true);
                            setBadgeRequestsError(null);
                            try {
                              await approveBadgeRequest(accessToken || '', req.id);
                              setBadgeRequestsInbox((prev) =>
                                prev.filter((r) => r.id !== req.id)
                              );
                              showHint({
                                title: 'Заявка обработана',
                                content: 'Одобрение применено.',
                              });
                              void loadBadgeApprovalsData();
                            } catch (e) {
                              setBadgeRequestsError(
                                e instanceof Error
                                  ? e.message
                                  : 'Не удалось подтвердить заявку.'
                              );
                            } finally {
                              setBadgeRequestsBusy(false);
                            }
                          }}
                        >
                          Одобрить
                        </button>
                        <button
                          type="button"
                          className="btn-secondary"
                          style={{ padding: '6px 12px', fontSize: 12 }}
                          disabled={badgeRequestsBusy}
                          onClick={() => {
                            setRejectExpandedId(req.id);
                            setRejectNote('');
                          }}
                        >
                          Отклонить
                        </button>
                      </div>
                      {rejectExpandedId === req.id && (
                        <div
                          style={{
                            marginTop: 8,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 6,
                          }}
                        >
                          <textarea
                            placeholder="Причина отказа (необязательно)"
                            maxLength={200}
                            value={rejectNote}
                            onChange={(e) => setRejectNote(e.target.value)}
                            style={{
                              width: '100%',
                              minHeight: 56,
                              fontSize: 12,
                              borderRadius: 8,
                              padding: 6,
                              background: 'rgba(255,255,255,0.06)',
                              border: '1px solid rgba(255,255,255,0.15)',
                              color: 'inherit',
                              resize: 'vertical',
                              boxSizing: 'border-box',
                            }}
                          />
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button
                              type="button"
                              className="btn-secondary"
                              style={{ padding: '6px 12px', fontSize: 12 }}
                              disabled={badgeRequestsBusy}
                              onClick={async () => {
                                setBadgeRequestsBusy(true);
                                setBadgeRequestsError(null);
                                try {
                                  await rejectBadgeRequest(
                                    accessToken || '',
                                    req.id,
                                    rejectNote.trim() || undefined
                                  );
                                  setBadgeRequestsInbox((prev) =>
                                    prev.filter((r) => r.id !== req.id)
                                  );
                                  setRejectExpandedId(null);
                                  setRejectNote('');
                                  showHint({
                                    title: 'Заявка обработана',
                                    content: 'Отклонено.',
                                  });
                                  void loadBadgeApprovalsData();
                                } catch (e: any) {
                                  setBadgeRequestsError(
                                    e instanceof Error
                                      ? e.message
                                      : 'Не удалось отклонить заявку.'
                                  );
                                } finally {
                                  setBadgeRequestsBusy(false);
                                }
                              }}
                            >
                              Отклонить
                            </button>
                            <button
                              type="button"
                              className="btn-secondary"
                              style={{ padding: '6px 12px', fontSize: 12 }}
                              onClick={() => {
                                setRejectExpandedId(null);
                                setRejectNote('');
                              }}
                            >
                              Отмена
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
};
