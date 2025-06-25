# Home Assistant Custom Cards
This project uses React.

To start development, run these commands:
- `pnpm dev` to start the development server and view custom cards written in preview.tsx on http://localhost:5173

Use http://localhost:5173/src/ha-dev.ts in Home Assistant to view the custom cards.

## Wall Layout Editor

The project includes a visual wall editor to help design temperature map layouts. It's included in the preview page:

```bash
pnpm dev
```

Then visit http://localhost:5173 and scroll down to see the wall editor below the card previews.

Features:
- Real-time visual preview of wall configurations
- Grid reference for precise positioning
- JavaScript syntax highlighting and error checking
- Copy-to-clipboard for easy configuration transfer
- Interactive canvas with wall indices for easy identification

The editor helps you design the `walls` array for the temperature map card configuration.

## Releases and Versioning

This project uses GitHub Actions to automatically build and release the custom cards when a new version tag is pushed. To create a new release:

1. Make your changes to the codebase
2. Run one of the following commands to update the version in `package.json`, create a git tag, and push everything to GitHub:
   ```bash
   # For patch releases (bug fixes)
   pnpm version patch

   # For minor releases (new features)
   pnpm version minor

   # For major releases (breaking changes)
   pnpm version major
   ```

The `postversion` script will automatically push both the code changes and the new tag to GitHub.

The GitHub Actions workflow will then automatically:
- Build the project
- Create a GitHub release
- Attach the built files (`dist/lovelace-temperature-map.js` and `dist/lovelace-temperature-map.js.map`) to the release

Users can then download the latest release files directly from GitHub.

## References
- https://github.com/shannonhochkins/ha-component-kit/tree/master/packages/core/src/hooks


# Archived

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type aware lint rules:

- Configure the top-level `parserOptions` property like this:

```js
export default tseslint.config({
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

- Replace `tseslint.configs.recommended` to `tseslint.configs.recommendedTypeChecked` or `tseslint.configs.strictTypeChecked`
- Optionally add `...tseslint.configs.stylisticTypeChecked`
- Install [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) and update the config:

```js
// eslint.config.js
import react from 'eslint-plugin-react'

export default tseslint.config({
  // Set the react version
  settings: { react: { version: '18.3' } },
  plugins: {
    // Add the react plugin
    react,
  },
  rules: {
    // other rules...
    // Enable its recommended rules
    ...react.configs.recommended.rules,
    ...react.configs['jsx-runtime'].rules,
  },
})
```
