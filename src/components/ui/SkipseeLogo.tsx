import React from 'react';

interface SkipseeLogoProps {
  size?: number;
  className?: string;
  withText?: boolean;
}

export default function SkipseeLogo({ size = 32, className = '', withText = false }: SkipseeLogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Grand+Hotel&display=swap');
          .skipsee-brand-text {
            font-family: 'Grand Hotel', cursive;
            letter-spacing: 0.02em;
            line-height: 1;
            transform: translateY(2px);
          }
        `}
      </style>
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0 }}
      >
        <defs>
          <linearGradient id="skipseeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
        </defs>

        {/* Crisp rounded square icon container */}
        <rect width="100" height="100" rx="24" fill="url(#skipseeGrad)" />
        
        {/* Double-skip forward icon */}
        <path
          d="M 32 72 L 68 50 L 32 28 Z"
          fill="#ffffff"
        />
        <path
          d="M 58 72 L 94 50 L 58 28 Z"
          fill="rgba(255, 255, 255, 0.7)"
        />
      </svg>
      {withText && (
        <span
          className="skipsee-brand-text"
          style={{
            fontSize: size * 1.15,
            background: 'linear-gradient(to right, #8b5cf6, #ec4899)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginLeft: '2px',
            fontWeight: 400
          }}
        >
          Skipsee
        </span>
      )}
    </div>
  );
}
