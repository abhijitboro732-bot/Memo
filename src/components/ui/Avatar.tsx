'use client';

import React from 'react';
import Image from 'next/image';

interface AvatarProps {
  src: string;
  alt: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  ring?: boolean;
  live?: boolean;
  className?: string;
  onClick?: () => void;
}

const sizeMap = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 56,
  xl: 80,
};

const sizeClass = {
  xs: 'w-6 h-6',
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-14 h-14',
  xl: 'w-20 h-20',
};

export default function Avatar({ src, alt, size = 'md', ring = false, live = false, className = '', onClick }: AvatarProps) {
  const wrapperClass = live ? 'avatar-ring-live' : ring ? 'avatar-ring' : '';

  return (
    <div
      className={`${wrapperClass} inline-flex items-center justify-center flex-shrink-0 ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
    >
      <div className={`${sizeClass[size]} rounded-full overflow-hidden bg-surface ${live || ring ? 'border-2 border-background' : ''}`}>
        <Image
          src={src}
          alt={alt}
          width={sizeMap[size]}
          height={sizeMap[size]}
          className="w-full h-full object-cover"
          unoptimized
        />
      </div>
    </div>
  );
}
