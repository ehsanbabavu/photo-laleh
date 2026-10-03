import React from 'react';

export const TulipIcon: React.FC<{ className?: string; alt?: string }> = ({
  className = "w-6 h-6",
  alt = "لوگوی آتلیه دیجیتال لاله"
}) => {
  return (
    <img
      src="/logo.png"
      alt={alt}
      className={`object-contain select-none ${className}`}
      loading="eager"
      decoding="async"
    />
  );
};

