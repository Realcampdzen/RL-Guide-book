import React from 'react';

export interface DataErrorStateProps {
  title?: string;
  details?: string;
  onRetry?: () => void;
}

export const DataErrorState: React.FC<DataErrorStateProps> = ({
  title = 'Не удалось загрузить данные',
  details,
  onRetry,
}) => {
  return (
    <div style={{ padding: '14px 0' }}>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>{title}</div>
      {details && <div style={{ opacity: 0.85, marginBottom: 10 }}>{details}</div>}
      {onRetry && (
        <button type="button" onClick={onRetry} style={{ padding: '10px 12px', borderRadius: 10 }}>
          Повторить
        </button>
      )}
    </div>
  );
};

export default React.memo(DataErrorState);
