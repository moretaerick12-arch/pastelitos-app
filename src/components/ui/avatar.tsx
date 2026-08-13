import React, { forwardRef } from 'react';
import { cn, getInitials } from '@/lib/utils';

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  alt?: string;
  name?: string;
  size?: 'sm' | 'md' | 'lg';
  status?: 'online' | 'offline';
}

export const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, src, alt, name, size = 'md', status, ...props }, ref) => {
    const sizes = {
      sm: 'h-8 w-8 text-xs',
      md: 'h-10 w-10 text-sm',
      lg: 'h-14 w-14 text-base',
    };

    const statusSizes = {
      sm: 'h-2 w-2',
      md: 'h-2.5 w-2.5',
      lg: 'h-3.5 w-3.5',
    };

    return (
      <div className="relative inline-block" ref={ref} {...props}>
        <div
          className={cn(
            "relative flex shrink-0 overflow-hidden rounded-full bg-muted",
            sizes[size],
            className
          )}
        >
          {src ? (
            <img
              src={src}
              alt={alt || name || 'Avatar'}
              className="aspect-square h-full w-full object-cover"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center font-medium text-muted-foreground bg-primary/10">
              {getInitials(name || 'User')}
            </span>
          )}
        </div>
        
        {status && (
          <span
            className={cn(
              "absolute bottom-0 right-0 block rounded-full ring-2 ring-background",
              status === 'online' ? 'bg-success' : 'bg-muted-foreground',
              statusSizes[size]
            )}
          />
        )}
      </div>
    );
  }
);
Avatar.displayName = 'Avatar';
