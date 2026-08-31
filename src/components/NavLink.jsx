'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function NavLink({ 
  to, 
  href, 
  className, 
  children, 
  end = false, 
  replace = false, 
  onClick, 
  ...rest 
}) {
  const pathname = usePathname() || '/';
  const target = href || to || '/';

  const isActive = end || target === '/'
    ? pathname === target
    : pathname === target || pathname.startsWith(target + '/');

  const computedClassName = typeof className === 'function' 
    ? className({ isActive }) 
    : className;

  return (
    <Link 
      href={target} 
      replace={replace} 
      onClick={onClick} 
      className={computedClassName} 
      {...rest}
    >
      {typeof children === 'function' ? children({ isActive }) : children}
    </Link>
  );
}
