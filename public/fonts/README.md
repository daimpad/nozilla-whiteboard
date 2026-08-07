# Brand faces

Drop the licensed `Nozilla Sans` `.woff2` files here and flip
`webfont.enabled` to `true` in `theme.config.ts`:

```
NozillaSans-Regular.woff2    (400)
NozillaSans-Medium.woff2     (500)
NozillaSans-SemiBold.woff2   (600)
NozillaSans-Bold.woff2       (700)
NozillaSans-Italic.woff2     (400 italic)
```

The `@font-face` rules are generated from that config at runtime
(`src/theme/fonts.ts`), so nothing else needs to change. Without these files
the CI stack falls back to the system faces declared in `theme.config.ts`, and
the application looks and exports correctly either way.
