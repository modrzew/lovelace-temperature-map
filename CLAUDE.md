# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `pnpm dev` - Start development server and view custom cards at http://localhost:5173
- `pnpm build` - Build the project for production (outputs to dist/)
- `pnpm lint` - Run TypeScript compiler and ESLint checks
- `pnpm test` - Run tests in watch mode (Vitest)
- `pnpm test:run` - Run tests once
- `pnpm test:ui` - Run tests with UI interface
- `pnpm preview` - Preview the built application
- Use `http://localhost:5173/src/ha-dev.ts` in Home Assistant to view custom cards during development

## Architecture Overview

This is a Home Assistant custom card project built with React, TypeScript, and Vite. The project creates custom dashboard cards for Home Assistant using a web component wrapper around React components.

### Key Architecture Components

**Card Creation System**: The `createReactCard` function in `src/lib/create-react-card.tsx` is the core abstraction that wraps React components in Home Assistant-compatible web components. It handles:
- Signal-based state management using @preact/signals-react
- Shadow DOM rendering with CSS isolation
- Home Assistant lifecycle methods (setConfig, getCardSize, etc.)

**Card Structure**: Individual cards are in `src/cards/` and follow the pattern:
- Export a React component that receives `ReactCardProps<T>`
- Use signals for reactive state (hass, config, cardSize, editMode)
- Register via `createReactCard` in build files

**Build System**: Two main entry points:
- `src/build.ts` - Production build for Home Assistant integration
- `src/ha-dev.ts` - Development build for HA testing
- `src/preview.tsx` - Standalone preview for development

**Mock System**: `src/mocks/` contains Home Assistant entity and state mocks for development without a running HA instance.

**Home Assistant Integration**: `src/lib/ha/` contains Home Assistant type definitions and utilities extracted from the HA frontend codebase.

## Development Workflow

1. Create new cards in `src/cards/` following existing patterns
2. Test cards using `pnpm dev` to view in browser at localhost:5173
3. Test with Home Assistant using the ha-dev.ts endpoint
4. Cards are automatically registered as web components via `createReactCard`

## Release Process

Use semantic versioning with pnpm:
- `pnpm version patch` - Bug fixes
- `pnpm version minor` - New features  
- `pnpm version major` - Breaking changes

The postversion script automatically pushes code and tags, triggering GitHub Actions to build and create releases.