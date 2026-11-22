import { Inbox } from 'lucide-react';
import { Button } from './Button.jsx';

/**
 * Keadaan kosong: ikon abu 32 px, satu kalimat penjelasan, satu tombol aksi bila relevan.
 */
export function EmptyState({
  icon: Icon = Inbox,
  message,
  actionLabel,
  onAction,
  className = '',
}) {
  return (
    <div className={`flex flex-col items-center justify-center px-4 py-8 text-center ${className}`}>
      <Icon
        size={32}
        strokeWidth={1.75}
        style={{ color: 'var(--neutral)' }}
        className="mb-3"
        aria-hidden="true"
      />
      <p
        className="max-w-[32ch] text-[14px] leading-5"
        style={{ color: 'var(--text-muted)' }}
      >
        {message}
      </p>
      {actionLabel && onAction && (
        <Button variant="secondary" size="sm" onClick={onAction} className="mt-4">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
