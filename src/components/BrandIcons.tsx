import React from 'react';

/** Official Telegram mark (paper plane) — brand glyph used for t.me links. */
export const TelegramIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
    <path d="M23.91 3.79 20.3 20.84c-.25 1.21-.98 1.5-2 .94l-5.5-4.07-2.66 2.57c-.3.3-.55.56-1.1.56-.72 0-.6-.27-.84-.95L6.3 13.7.85 12c-1.18-.35-1.19-1.16.26-1.75L22.37 2.05c.97-.43 1.9.24 1.54 1.74Z" />
  </svg>
);

/**
 * Eitaa mark. The official logo asset could not be downloaded inside this
 * environment, so this is a clean chat-bubble glyph tinted with Eitaa's brand
 * teal. Replace the paths with the official SVG once it is available.
 */
export const EitaaIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
    <path
      d="M12 2.6c-5.2 0-9.4 3.7-9.4 8.3 0 2.4 1.1 4.5 2.9 6v3.5c0 .5.6.8 1 .5l2.5-1.6c.9.3 1.9.4 3 .4 5.2 0 9.4-3.7 9.4-8.3S17.2 2.6 12 2.6Z"
      fill="currentColor"
      opacity="0.16"
    />
    <path
      d="M12 2.6c-5.2 0-9.4 3.7-9.4 8.3 0 2.4 1.1 4.5 2.9 6v3.5c0 .5.6.8 1 .5l2.5-1.6c.9.3 1.9.4 3 .4 5.2 0 9.4-3.7 9.4-8.3S17.2 2.6 12 2.6Z"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinejoin="round"
    />
    <path
      d="M14.8 8.4h-4.1a2.3 2.3 0 0 0 0 4.6h1.6a2.3 2.3 0 0 0 0-4.6"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
    />
    <circle cx="9.9" cy="12.4" r="1.05" fill="currentColor" />
  </svg>
);
