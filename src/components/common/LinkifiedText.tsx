import React from 'react';
import { splitLinks } from '@/lib/linkify';

/**
 * Texto con las URLs http/https convertidas en enlaces (nueva pestaña, rel="noopener noreferrer").
 * Las URLs largas se parten en cualquier punto para no desbordar el contenedor.
 */
export const LinkifiedText: React.FC<{ text: string; className?: string; linkClassName?: string }> = ({
  text,
  className = '',
  linkClassName = 'text-indigo-600 hover:text-indigo-800 underline underline-offset-2 decoration-indigo-300'
}) => (
  <span className={`[overflow-wrap:anywhere] ${className}`}>
    {splitLinks(text).map((p, i) =>
      p.type === 'link' ? (
        <a
          key={i}
          href={p.href}
          target="_blank"
          rel="noopener noreferrer"
          className={`${linkClassName} break-all`}
          onClick={(e) => e.stopPropagation()}
          title="Abrir en una pestaña nueva"
        >
          {p.text}
        </a>
      ) : (
        <React.Fragment key={i}>{p.text}</React.Fragment>
      )
    )}
  </span>
);
