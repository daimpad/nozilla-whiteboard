/**
 * The small set of CI-styled controls the application chrome is built from.
 * Every visual value comes from Tailwind classes generated from
 * `theme.config.ts`, so the chrome cannot drift from the brand either.
 */
import { forwardRef, type ButtonHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react';
import { Icon } from './Icon';
import type { IconName } from '@/assets/icons';

export function cx(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ');
}

/* -------------------------------------------------------------------------- */
/* Button                                                                      */
/* -------------------------------------------------------------------------- */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  icon?: IconName;
  trailingIcon?: IconName;
  active?: boolean;
}

const BUTTON_BASE =
  'inline-flex items-center justify-center gap-2 rounded-sm px-3 h-8 text-ui-body font-medium ' +
  'transition-colors duration-fast ease-standard disabled:opacity-40 disabled:pointer-events-none ' +
  'whitespace-nowrap';

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-ink-inverse hover:bg-primary-hover active:bg-primary-active',
  secondary:
    'bg-surface text-ink border border-border hover:bg-surface-subtle hover:border-border-strong',
  ghost: 'text-ink-muted hover:bg-surface-sunken hover:text-ink',
  danger: 'bg-surface text-danger border border-border hover:bg-danger-soft',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', icon, trailingIcon, active, className, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      className={cx(
        BUTTON_BASE,
        BUTTON_VARIANTS[variant],
        active && 'bg-primary-soft text-primary border-primary-border',
        className,
      )}
      {...rest}
    >
      {icon ? <Icon name={icon} size={15} /> : null}
      {children}
      {trailingIcon ? <Icon name={trailingIcon} size={15} /> : null}
    </button>
  );
});

/* -------------------------------------------------------------------------- */
/* Icon button                                                                 */
/* -------------------------------------------------------------------------- */

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: IconName;
  label: string;
  active?: boolean;
  size?: number;
  tone?: 'default' | 'danger';
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon, label, active, size = 16, tone = 'default', className, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={cx(
        'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-sm transition-colors',
        'duration-fast ease-standard disabled:opacity-40 disabled:pointer-events-none',
        tone === 'danger' ? 'text-ink-muted hover:bg-danger-soft hover:text-danger' : 'text-ink-muted hover:bg-surface-sunken hover:text-ink',
        active && 'bg-primary-soft text-primary hover:bg-primary-soft hover:text-primary',
        className,
      )}
      {...rest}
    >
      <Icon name={icon} size={size} />
    </button>
  );
});

/* -------------------------------------------------------------------------- */
/* Field wrappers                                                              */
/* -------------------------------------------------------------------------- */

export function Field({
  label,
  children,
  hint,
  className,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <label className={cx('block', className)}>
      <span className="nzl-label">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-[11px] text-ink-subtle">{hint}</span> : null}
    </label>
  );
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: Array<{ value: string; label: string }>;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { options, className, ...rest },
  ref,
) {
  return (
    <select ref={ref} className={cx('nzl-field cursor-pointer', className)} {...rest}>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
});

/* -------------------------------------------------------------------------- */
/* Segmented control                                                           */
/* -------------------------------------------------------------------------- */

export interface SegmentedProps<T extends string> {
  value: T;
  options: Array<{ value: T; label: string; icon?: IconName; title?: string }>;
  onChange: (value: T) => void;
  className?: string;
  compact?: boolean;
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  className,
  compact,
}: SegmentedProps<T>) {
  return (
    <div
      role="radiogroup"
      className={cx(
        'inline-flex items-center gap-0.5 rounded-sm border border-border bg-surface-subtle p-0.5',
        className,
      )}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          title={option.title ?? option.label}
          onClick={() => onChange(option.value)}
          className={cx(
            'inline-flex h-6 items-center justify-center gap-1.5 rounded-xs px-2 text-[11px] font-medium',
            'transition-colors duration-fast ease-standard',
            compact && 'px-1.5',
            value === option.value
              ? 'bg-surface text-ink shadow-xs'
              : 'text-ink-subtle hover:text-ink',
          )}
        >
          {option.icon ? <Icon name={option.icon} size={13} /> : null}
          {compact && option.icon ? null : option.label}
        </button>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Misc                                                                        */
/* -------------------------------------------------------------------------- */

export function Divider({ className }: { className?: string }) {
  return <div className={cx('h-5 w-px shrink-0 bg-border', className)} />;
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="px-3 pb-1.5 pt-3 text-[11px] font-bold uppercase tracking-wider text-ink-subtle">
      {children}
    </h3>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded-xs border border-border bg-surface px-1 font-mono text-[10px] text-ink-subtle">
      {children}
    </kbd>
  );
}
