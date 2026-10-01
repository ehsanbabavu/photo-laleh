import React from 'react';

export const TulipIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Tulip bloom shape */}
      <path
        d="M12 2.5C9.5 2.5 8 6 8 9.5C8 13.5 10 16 12 16.5C14 16 16 13.5 16 9.5C16 6 14.5 2.5 12 2.5Z"
        fill="currentColor"
        fillOpacity="0.25"
      />
      <path d="M12 2.5V16.5" />
      <path d="M7.5 5.5C5.5 7.5 4.5 10 4.5 12.5C4.5 15.5 7.5 17.5 12 17.5C16.5 17.5 19.5 15.5 19.5 12.5C19.5 10 18.5 7.5 16.5 5.5" />
      {/* Stem */}
      <path d="M12 17.5V22" />
      {/* Leaves */}
      <path d="M12 20C10 19 8 19.5 6.5 21" />
      <path d="M12 19C14 18 16 18.5 17.5 20" />
    </svg>
  );
};
