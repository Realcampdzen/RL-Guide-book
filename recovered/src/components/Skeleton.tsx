import type React from 'react';

type SkeletonProps = {
  className?: string;
  style?: React.CSSProperties;
  'aria-label'?: string;
};

export const Skeleton: React.FC<SkeletonProps> = ({ className = '', style, ...aria }) => {
  return (
    <div
      className={`skeleton ${className}`.trim()}
      style={style}
      aria-hidden={aria['aria-label'] ? undefined : true}
      {...aria}
    />
  );
};
