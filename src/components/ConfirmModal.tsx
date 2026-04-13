import type React from 'react';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import '../styles/confirm-modal.css';

interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  danger?: boolean;
}

const CONFIRM_MODAL_ID = 'confirm-modal-title';

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  open,
  onClose,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Отмена',
  onConfirm,
  danger = false,
}) => {
  useEffect(() => {
    if (!open) return;
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  }, [open, onClose]);

  if (!open) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const modal = (
    <div className="confirm-modal-overlay" onClick={onClose} role="presentation">
      <div
        className="confirm-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={CONFIRM_MODAL_ID}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id={CONFIRM_MODAL_ID} className="confirm-modal__title">
          {title}
        </h3>
        <p className="confirm-modal__text">{message}</p>
        <div className="confirm-modal__actions">
          <button type="button" className="confirm-modal__btn" onClick={onClose}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`confirm-modal__btn ${danger ? 'confirm-modal__btn--danger' : ''}`}
            onClick={handleConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
};
