import type { HTMLAttributes, ReactNode } from 'react';

type CardProps = HTMLAttributes<HTMLElement> & {
  as?: 'article' | 'section' | 'div';
  children: ReactNode;
};

export function Card({ as: Tag = 'article', className = '', children, ...props }: CardProps) {
  return (
    <Tag className={`surface-card ${className}`.trim()} {...props}>
      {children}
    </Tag>
  );
}
