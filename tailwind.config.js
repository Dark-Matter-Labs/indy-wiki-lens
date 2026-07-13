/**
 * Tailwind is used for LAYOUT ONLY. Every colour, type-size, spacing and motion
 * value resolves to a CSS custom property defined in src/theme/tokens.css.
 * A designer reskins the whole site by editing tokens.css — never this file and
 * never a component. If you find yourself adding a hard-coded hex or px here,
 * add a token instead.
 */
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    // Deliberately override, not extend: the only colours available to utilities
    // are the semantic tokens. This makes "components consume tokens only"
    // enforceable rather than aspirational.
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      bg: 'var(--color-bg)',
      surface: 'var(--color-surface)',
      'surface-raised': 'var(--color-surface-raised)',
      ink: 'var(--color-ink)',
      'ink-muted': 'var(--color-ink-muted)',
      'ink-faint': 'var(--color-ink-faint)',
      line: 'var(--color-line)',
      'line-strong': 'var(--color-line-strong)',
      accent: 'var(--color-accent)',
      'accent-muted': 'var(--color-accent-muted)',
      'accent-bright': 'var(--color-accent-bright)',
      'accent-contrast': 'var(--color-accent-contrast)',
      sun: 'var(--color-sun)',
      'sun-2': 'var(--color-sun-2)',
      // Evidence-status semantics (used honestly by the axioms overlay)
      evidenced: 'var(--color-evidenced)',
      assumptive: 'var(--color-assumptive)',
      contested: 'var(--color-contested)',
    },
    fontFamily: {
      sans: 'var(--font-sans)',
      serif: 'var(--font-serif)',
      mono: 'var(--font-mono)',
    },
    fontSize: {
      xs: ['var(--text-xs)', { lineHeight: 'var(--leading-snug)' }],
      sm: ['var(--text-sm)', { lineHeight: 'var(--leading-normal)' }],
      base: ['var(--text-base)', { lineHeight: 'var(--leading-normal)' }],
      lg: ['var(--text-lg)', { lineHeight: 'var(--leading-normal)' }],
      xl: ['var(--text-xl)', { lineHeight: 'var(--leading-snug)' }],
      '2xl': ['var(--text-2xl)', { lineHeight: 'var(--leading-tight)' }],
      '3xl': ['var(--text-3xl)', { lineHeight: 'var(--leading-tight)' }],
      '4xl': ['var(--text-4xl)', { lineHeight: 'var(--leading-tight)' }],
      '5xl': ['var(--text-5xl)', { lineHeight: 'var(--leading-none)' }],
    },
    borderRadius: {
      none: '0',
      sm: 'var(--radius-sm)',
      DEFAULT: 'var(--radius)',
      lg: 'var(--radius-lg)',
      full: '9999px',
    },
    extend: {
      spacing: {
        gutter: 'var(--space-gutter)',
        measure: 'var(--measure)',
      },
      maxWidth: {
        measure: 'var(--measure)',
        content: 'var(--content-width)',
      },
      transitionTimingFunction: {
        default: 'var(--ease)',
      },
      transitionDuration: {
        fast: 'var(--motion-fast)',
        DEFAULT: 'var(--motion)',
        slow: 'var(--motion-slow)',
      },
    },
  },
  plugins: [],
}
