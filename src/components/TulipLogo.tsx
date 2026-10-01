import React from 'react';

interface TulipLogoProps {
  className?: string;
  size?: number;
}

export const TulipLogo: React.FC<TulipLogoProps> = ({ className = 'w-6 h-6', size = 24 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Central Tulip Petal */}
      <path
        d="M12 2C10.5 4.5 10 7.5 12 12C14 7.5 13.5 4.5 12 2Z"
        fill="currentColor"
      />
      {/* Left Tulip Petal */}
      <path
        d="M6.5 6C5 9 5.5 12.5 11 13.8C8.5 10.5 8 8 6.5 6Z"
        fill="currentColor"
        fillOpacity="0.85"
      />
      {/* Right Tulip Petal */}
      <path
        d="M17.5 6C19 9 18.5 12.5 13 13.8C15.5 10.5 16 8 17.5 6Z"
        fill="currentColor"
        fillOpacity="0.85"
      />
      {/* Tulip Calyx / Base Cup */}
      <path
        d="M8.5 13.5C9.5 15.5 10.5 16.5 12 16.5C13.5 16.5 14.5 15.5 15.5 13.5C14.5 15 13.5 15.5 12 15.5C10.5 15.5 9.5 15 8.5 13.5Z"
        fill="currentColor"
      />
      {/* Stem */}
      <path
        d="M12 16V22"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      {/* Left Leaf */}
      <path
        d="M12 19.5C9.5 19.5 7.5 17.5 7 15"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* Right Leaf */}
      <path
        d="M12 18.5C14.5 18.5 16.5 16.5 17 14"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
};
