'use client';

import React from 'react';
import { Star, StarHalf } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  rating: number;
  maxStars?: number;
  className?: string;
  starClassName?: string;
  size?: number;
}

export default function StarRating({
  rating,
  maxStars = 5,
  className,
  starClassName,
  size = 4,
}: StarRatingProps) {
  const stars = [];
  const sizePx = size * 4; // Assuming tailwind-like sizing (h-4 = 16px)

  for (let i = 1; i <= maxStars; i++) {
    if (rating >= i) {
      // Full star
      stars.push(
        <Star
          key={i}
          size={sizePx}
          className={cn('fill-yellow-400 text-yellow-400', starClassName)}
        />
      );
    } else if (rating >= i - 0.5) {
      // Half star
      stars.push(
        <div key={i} className="relative">
          <StarHalf
            size={sizePx}
            className={cn('fill-yellow-400 text-yellow-400', starClassName)}
          />
          <Star
            size={sizePx}
            className="text-slate-200 absolute top-0 left-0"
            style={{ clipPath: 'inset(0 0 0 50%)' }}
          />
        </div>
      );
    } else {
      // Empty star
      stars.push(
        <Star
          key={i}
          size={sizePx}
          className="text-slate-200"
        />
      );
    }
  }

  return (
    <div className={cn('flex items-center gap-0.5', className)}>
      {stars}
    </div>
  );
}
