/**
 * The small set of CI-styled controls the application chrome is built from.
 * Every visual value comes from Tailwind classes generated from
 * `theme.config.ts`, so the chrome cannot drift from the brand either.
 */
import {
  forwardRef,
  type ButtonHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react';
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
  'inline-flex items-center justify-center gap-2  px-3 h-8 text-ui-body font-medium ' +
  'transition-colors duration-fast ease-standard disabled:opacity-40 disabled:pointer-events-none ' +
  'whitespace-nowrap';

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-signal text-ink hover:bg-signal-strong',
  secondary: 'bg-surface text-ink hover:bg-surface-alt',
  ghost:
    'border-transparent shadow-none text-ink-muted hover:border-ink hover:shadow-sm hover:text-ink',
  danger: 'bg-surface text-danger hover:bg-danger-bg',
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
        active && 'bg-signal text-ink border-ink',
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
        'inline-flex h-8 w-8 shrink-0 items-center justify-center  transition-colors',
        'duration-fast ease-standard disabled:opacity-40 disabled:pointer-events-none',
        tone === 'danger'
          ? 'text-ink-muted hover:bg-danger-bg hover:text-danger'
          : 'text-ink-muted hover:bg-surface-alt hover:text-ink',
        active && 'bg-signal text-ink shadow-sm hover:bg-signal-strong hover:text-ink',
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
      <span className="nz-label">{label}</span>
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
    <select ref={ref} className={cx('nz-field cursor-pointer', className)} {...rest}>
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
        'inline-flex items-center gap-0.5  border border-line bg-surface-alt p-0.5',
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
            'inline-flex h-6 items-center justify-center gap-1.5  px-2 text-[11px] font-medium',
            'transition-colors duration-fast ease-standard',
            compact && 'px-1.5',
            value === option.value ? 'bg-signal text-ink' : 'text-ink-muted hover:text-ink',
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
    <h3 className="px-3 pb-1.5 pt-3 text-[11px] font-bold uppercase tracking-label text-ink-subtle">
      {children}
    </h3>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className=" border border-line bg-surface px-1 font-mono text-[10px] text-ink-subtle">
      {children}
    </kbd>
  );
}
