import React from 'react';

export const Badge = ({ status, children }: { status: string, children?: React.ReactNode }) => {
  return (
    <span className={`badge badge-${status}`}>
      {children || status}
    </span>
  );
};
