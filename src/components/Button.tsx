/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { forwardRef, ButtonHTMLAttributes } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'inverse' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'secondary',
      size = 'sm',
      icon,
      iconPosition = 'left',
      className = '',
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    // Height & padding constraints per spec: sm 32px, md 40px, lg 48px
    const sizeClasses = {
      sm: 'h-8 px-3 text-[13px] gap-1.5',
      md: 'h-10 px-4 text-[14px] gap-2',
      lg: 'h-12 px-6 text-[15px] gap-2.5',
    }[size];

    // Style variants adhering strictly to the black, green, white palette
    const variantClasses = {
      primary:
        'bg-[var(--green)] text-[var(--on-green)] border border-[var(--green)] hover:bg-[var(--green-hover)] font-semibold',
      secondary:
        'bg-transparent border border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface-2)] font-medium',
      ghost:
        'bg-transparent border border-transparent text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] font-medium',
      inverse:
        'bg-[var(--inverse-bg)] text-[var(--inverse-text)] border border-[var(--border)] hover:opacity-90 font-semibold shadow-xs',
      danger:
        'bg-transparent border border-[var(--red)] text-[var(--red)] hover:bg-[var(--red-soft)] font-medium',
    }[variant];

    return (
      <button
        ref={ref}
        disabled={disabled}
        className={`inline-flex items-center justify-center rounded-[10px] select-none cursor-pointer whitespace-nowrap transition-all duration-150 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--green)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 ${sizeClasses} ${variantClasses} ${className}`}
        {...props}
      >
        {icon && iconPosition === 'left' && <span className="shrink-0 flex items-center">{icon}</span>}
        {children && <span>{children}</span>}
        {icon && iconPosition === 'right' && <span className="shrink-0 flex items-center">{icon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
