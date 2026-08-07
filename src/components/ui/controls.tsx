/**
 * Die kleine Menge an Bedienelementen, aus der die Werkzeug-Oberfläche besteht.
 *
 * Alles hier benutzt ausschließlich den `ui-*`-Namensraum aus
 * `theme.config.ts` — weiße Flächen, kühle Graustufen, kleine Radien, weiche
 * Schatten. Das ist Absicht: die Marke gehört auf die Folie, nicht in die
 * Werkzeugleiste. Taucht in dieser Datei ein `bg-paper`, `border-line` oder
 * `shadow-md` auf, ist etwas falsch abgebogen.
 *
 * Die einzige Marken-Farbe, die hierher darf, ist das Signalgrün als
 * `ui-accent` — für den einen Knopf pro Ansicht, der wirklich die Hauptsache
 * ist.
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
  'inline-flex items-center justify-center gap-2 rounded-sm px-3 h-8 text-ui-body font-medium ' +
  'transition-colors duration-fast ease-standard disabled:opacity-40 disabled:pointer-events-none ' +
  'whitespace-nowrap';

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-ui-accent text-ui-ink hover:bg-ui-accent-strong border border-ui-accent-border',
  secondary: 'bg-ui-surface text-ui-ink border border-ui hover:bg-ui-subtle hover:border-ui-strong',
  ghost: 'text-ui-muted hover:bg-ui-sunken hover:text-ui-ink',
  danger: 'bg-ui-surface text-ui-danger border border-ui hover:bg-ui-danger-bg',
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
        active && 'border-ui-accent-border bg-ui-accent-soft text-ui-ink',
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
        tone === 'danger'
          ? 'text-ui-muted hover:bg-ui-danger-bg hover:text-ui-danger'
          : 'text-ui-muted hover:bg-ui-sunken hover:text-ui-ink',
        active && 'bg-ui-accent-soft text-ui-ink hover:bg-ui-accent-soft hover:text-ui-ink',
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
      {hint ? <span className="mt-1 block text-[11px] text-ui-faint">{hint}</span> : null}
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
        'inline-flex items-center gap-0.5 rounded-sm border border-ui bg-ui-subtle p-0.5',
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
            'inline-flex h-6 items-center justify-center gap-1.5 rounded-sm px-2 text-[11px] font-medium',
            'transition-colors duration-fast ease-standard',
            compact && 'px-1.5',
            value === option.value
              ? 'bg-ui-surface text-ui-ink shadow-ui-sm'
              : 'text-ui-faint hover:text-ui-ink',
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
  return <div className={cx('h-5 w-px shrink-0 bg-ui', className)} />;
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="px-3 pb-1.5 pt-3 text-[11px] font-semibold uppercase tracking-wider text-ui-faint">
      {children}
    </h3>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded-sm border border-ui bg-ui-surface px-1 font-mono text-[10px] text-ui-faint">
      {children}
    </kbd>
  );
}
