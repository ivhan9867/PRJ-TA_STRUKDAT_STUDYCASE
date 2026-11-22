/**
 * Tombol standar Simpul Sehat.
 * Radius 12 px (--radius-btn), tinggi minimal 40 px untuk aksesibilitas sentuh.
 * Varian: primary (--accent solid), secondary (--surface-2 + border), danger, ghost.
 */
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  className = '',
  type = 'button',
  ...props
}) {
  const variantStyles = {
    primary: {
      backgroundColor: disabled ? 'var(--neutral)' : 'var(--accent)',
      color: '#FFFFFF',
      border: '1px solid transparent',
    },
    secondary: {
      backgroundColor: 'var(--surface-2)',
      color: disabled ? 'var(--text-faint)' : 'var(--text)',
      border: '1px solid var(--border)',
    },
    danger: {
      backgroundColor: 'var(--danger-soft)',
      color: 'var(--danger)',
      border: '1px solid rgba(220, 38, 38, 0.25)',
    },
    ghost: {
      backgroundColor: 'transparent',
      color: disabled ? 'var(--text-faint)' : 'var(--text-muted)',
      border: '1px solid transparent',
    },
  };

  const sizeClass =
    size === 'sm'
      ? 'min-h-[36px] px-3 text-[13px]'
      : 'min-h-[40px] px-4 text-[14px]';

  const style = {
    borderRadius: 'var(--radius-btn)',
    transition: 'opacity var(--t-fast) var(--ease), background-color var(--t-fast) var(--ease)',
    ...(variantStyles[variant] || variantStyles.primary),
  };

  return (
    <button
      type={type}
      disabled={disabled}
      style={style}
      className={`focus-ring inline-flex items-center justify-center gap-2 font-medium whitespace-nowrap ${sizeClass} ${
        disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:opacity-90 active:opacity-80'
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
