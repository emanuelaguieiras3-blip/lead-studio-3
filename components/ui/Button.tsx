import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  children: ReactNode;
};

const variantClass: Record<ButtonVariant, string> = {
  primary: 'btn btn-primary',
  secondary: 'btn btn-secondary',
  ghost: 'btn btn-ghost',
};

export function Button({ variant = 'primary', className = '', type = 'button', children, ...props }: ButtonProps) {
  return (
    <button type={type} className={`${variantClass[variant]} ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}
