'use client';

import { HTMLAttributes, forwardRef } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  selected?: boolean;
  hoverable?: boolean;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ selected, hoverable, className = '', children, ...props }, ref) => {
    const base = 'rounded-xl border transition-all duration-200';
    const selectedClass = selected
      ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50 dark:bg-blue-950/30'
      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800';
    const hoverClass = hoverable && !selected
      ? 'hover:border-blue-400 hover:shadow-md cursor-pointer'
      : '';

    return (
      <div
        ref={ref}
        className={`${base} ${selectedClass} ${hoverClass} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
export default Card;
