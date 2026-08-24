import { ADMIN_SHOPPING_NOTICE } from '@/lib/roles';

interface AdminShoppingNoticeProps {
  className?: string;
}

export default function AdminShoppingNotice({ className = '' }: AdminShoppingNoticeProps) {
  return (
    <p
      className={`rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 ${className}`}
      role="status"
    >
      {ADMIN_SHOPPING_NOTICE}
    </p>
  );
}
