'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const tabs = [
  { name: 'Issues', href: '/ppe' },
  { name: 'Items', href: '/ppe/items' },
  { name: 'Stock', href: '/ppe/stock' },
  { name: 'Invoices', href: '/ppe/invoices' },
  { name: 'Suppliers', href: '/ppe/suppliers' },
  { name: 'Grower Charges', href: '/ppe/grower-charges' },
  { name: 'Report', href: '/ppe/report' },
];

export function PPENav() {
  const pathname = usePathname();

  return (
    <nav className="mb-4 sm:mb-6 flex gap-1 overflow-x-auto border-b">
      {tabs.map((tab) => {
        const isActive = tab.href === '/ppe' ? pathname === '/ppe' : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              '-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium',
              isActive
                ? 'border-green-600 text-green-700'
                : 'border-transparent text-muted-foreground hover:text-gray-900'
            )}
          >
            {tab.name}
          </Link>
        );
      })}
    </nav>
  );
}
