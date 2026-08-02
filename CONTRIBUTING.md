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
- Complete the mobile-release evidence block for every UI-affecting change
- Ensure no breaking changes (or document them clearly)

### UI release evidence gate

A UI-affecting release cannot be classified visually green without all of the following:

- rendered local screenshots at 360, 390, and 430 px plus a named desktop viewport;
- explicit inspection of the fold and full page, including RTL/mixed-language content;
- before and after evidence tied to the exact source revision;
- green web build and browser release checks;
- a rollback procedure; and
- live post-deployment screenshots when production is changed.

The `mobile-release-gate` check enforces the viewport, accessibility, touch-target,
overflow, clipping, card/table parity, and evidence requirements. Changes that do
not affect `apps/web` runtime UI are explicitly exempt from the PR evidence block,
but still run the automated gate. Test, policy, and CI-only changes do not require
an Expiry Alert production deployment.

## Questions?

Open an issue for questions or discussions!
