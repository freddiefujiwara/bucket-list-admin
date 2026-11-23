# Repository Guidelines

## Project Structure
- `index.html`: Main HTML entry point.
- `src/main.js`: Mounts the root Vue app.
- `src/App.vue`: The root Vue component.
- `src/components/`: Reusable UI components.
- `src/composables/`: Reusable Vue composables.
- `src/services/`: API-related helpers.
- `src/utils/`: Data transformation utilities.
- `src/tests/`: Vitest unit tests.
- `src/style.css`: Global stylesheets.

## Build, Test, and Development Commands
- `npm run dev`: start the local Vite dev server.
- `npm run build`: build the production bundle into `dist/`.
- `npm run preview`: serve the production build locally.
- `npm test`: run the Vitest suite once.
- `npm run test:watch`: run tests in watch mode.
- `npm run test:coverage`: generate coverage with V8.

## Coding Style & Naming Conventions
- Indentation: 2 spaces in Vue templates, JS, and CSS.
- JavaScript uses single quotes and semicolons; follow existing patterns.
- Vue uses `<script setup>`; prefer composables and small components.
- File names are `PascalCase.vue` for components and `camelCase.js` for utilities.

## Testing Guidelines
- Frameworks: Vitest + `@vue/test-utils` with `jsdom`.
- Tests live in `src/tests/` and mirror feature names (e.g., `app.test.js`).
- The project enforces **100% test coverage**. This is checked automatically in CI.
  - The following files are excluded from this requirement: `src/main.js` and any `*.js` files in the root directory.
- Run `npm test` for quick checks and `npm run test:coverage` before PRs.

## Commit & Pull Request Guidelines
- Commit messages follow Conventional Commits: `feat:`, `docs:`, `refactor:`, `build:`.
- Keep commits focused; avoid mixing unrelated changes.
- PRs should include a clear description, testing notes, and screenshots/GIFs for UI changes.

## Configuration & Deployment Notes
- Set `VITE_DATA_URL` to point at the backend endpoint.
- Set `VITE_BASE="/your-repo-name/"` when deploying to GitHub Pages.
