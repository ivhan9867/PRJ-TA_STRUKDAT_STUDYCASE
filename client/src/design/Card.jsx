/**
 * Kartu dasar Simpul Sehat.
 * Varian "float" dipakai untuk kartu besar mengambang di atas peta (radius 24, bayangan float).
 * Varian "inner" dipakai untuk blok di dalam kartu (radius 16, latar --surface-2, tanpa bayangan).
 */
export function Card({
  children,
  variant = 'float',
  glass = false,
  className = '',
  padding = true,
  ...props
}) {
  const isInner = variant === 'inner';

  const baseStyle = isInner
    ? {
        backgroundColor: 'var(--surface-2)',
        borderRadius: 'var(--radius-inner)',
      }
    : {
        backgroundColor: glass ? 'var(--surface-glass)' : 'var(--surface)',
        borderRadius: 'var(--radius-card)',
        boxShadow: 'var(--shadow-float)',
      };

  return (
    <div
      style={baseStyle}
      className={`${glass && !isInner ? 'surface-glass' : ''} ${
        padding ? (isInner ? 'p-3.5' : 'p-5') : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
