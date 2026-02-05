# Contributing to Reagent Expiry Tracker

Thank you for considering contributing to this project!

## Development Setup

1. Fork the repository
2. Clone your fork
3. Install dependencies: `npm install` or `pnpm install`
4. Create a new branch: `git checkout -b feature/your-feature-name`
5. Make your changes
6. Test thoroughly
7. Commit with clear messages
8. Push and create a Pull Request

## Code Style

- Use TypeScript for all frontend code
- Follow existing code structure and naming conventions
- Add comments for complex logic
- Ensure RTL (Right-to-Left) compatibility for Hebrew
- Test in both English and Hebrew languages

## Adding Features

### Frontend (React)
- Components go in `src/components/`
- Pages go in `src/pages/`
- Add types to `src/types/index.ts`
- Update translations in both `src/i18n/locales/he.json` and `en.json`

### Backend (Rust)
- Database logic goes in `src-tauri/src/db.rs`
- API commands go in `src-tauri/src/main.rs`
- Update both Rust and TypeScript types

## Testing

Before submitting:
- [ ] App runs in dev mode: `npm run tauri:dev`
- [ ] App builds successfully: `npm run tauri:build`
- [ ] Tested in both Hebrew and English
- [ ] Tested RTL layout (Hebrew)
- [ ] No TypeScript errors: `npx tsc --noEmit`
- [ ] All features work as expected

## Pull Request Guidelines

- Describe your changes clearly
- Reference any related issues
- Include screenshots for UI changes
- Ensure no breaking changes (or document them clearly)

## Questions?

Open an issue for questions or discussions!
