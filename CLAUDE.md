# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **single-purpose Home Assistant custom card** repository for the Temperature Map Card. It displays temperature sensors as a physics-based heat map with realistic temperature flow and wall blocking. The project was cleaned up from a multi-card repository to focus specifically on temperature mapping functionality.

## Development Commands

- `pnpm dev` - Start development server and view the temperature map card at http://localhost:5173
- `pnpm build` - Build for production (outputs `lovelace-temperature-map.js` to dist/)
- `pnpm lint` - Run TypeScript compiler and ESLint checks
- `pnpm test` - Run tests in watch mode (Vitest with 97 comprehensive tests)
- `pnpm test:run` - Run tests once
- `pnpm test:ui` - Run tests with UI interface
- `pnpm preview` - Preview the built application
- `pnpm run knip` - Analyze unused code with knip
- Use `http://localhost:5173/src/ha-dev.ts` in Home Assistant to test the card during development

## Architecture Overview

### Core Components

**Temperature Map Card**: The main card component (`src/cards/temperature-map-card.tsx`) implements:
- Physics-based temperature interpolation using flood fill algorithms
- Wall blocking for realistic heat flow between rooms
- Interactive sensor display with click-to-view details
- Real-time temperature updates with debouncing
- Canvas-based rendering with optimized performance

**Utility Modules**: Extracted into separate modules for maintainability:
- `src/lib/temperature-map/geometry.ts` - Line intersections, wall collision detection
- `src/lib/temperature-map/temperature.ts` - Physics-based temperature interpolation and color mapping
- `src/lib/temperature-map/distance.ts` - Flood fill pathfinding and distance grid computation
- `src/lib/temperature-map/types.ts` - Shared type definitions (Wall, TemperatureSensor, DistanceGrid, etc.)

**Web Component Integration**: 
- `src/lib/create-react-card.tsx` - Wraps React components as Home Assistant web components
- Signal-based state management using @preact/signals-react
- Shadow DOM rendering with CSS isolation
- Home Assistant lifecycle methods (setConfig, getCardSize, etc.)

**Build System**: 
- `src/build.ts` - Production build entry point
- `src/ha-dev.ts` - Development build for HA testing  
- `src/preview.tsx` - Standalone preview with wall editor
- `src/wall-editor.tsx` - Visual wall layout editor with real-time preview

### Testing Architecture

Comprehensive test suite (97 tests) covering:
- `src/test/temperature-map-utilities.test.ts` - Utility function tests (44 tests)
- `src/test/temperature-map-logic.test.ts` - Component logic tests (28 tests)
- `src/lib/temperature-map/geometry.test.ts` - Geometric calculation tests (19 tests)
- `src/test/utils.test.ts` - General utility tests (3 tests)
- `src/lib/utils.test.ts` - Library utility tests (3 tests)

**Mock System**: `src/mocks/` contains Home Assistant entity and state mocks:
- `entities.tsx` - Generic entity creation utilities
- `sensors.tsx` - Temperature sensor specific mocks
- `hass.tsx` - Complete Home Assistant instance mock

## Key Features

**Physics-Based Temperature Interpolation**:
- Uses flood fill algorithms instead of simple distance calculations
- Accounts for wall blocking between rooms
- Circular blending for realistic temperature gradients
- Cached distance grids for performance optimization

**Wall Blocking System**:
- Line intersection algorithms for wall collision detection
- Boundary detection using sensor-guided flood fill
- Visual wall editor for easy layout design

**Interactive Features**:
- Click sensors to view temperatures and entity details
- Real-time updates with 2-second debouncing
- Responsive canvas sizing with configurable dimensions

## Development Workflow

1. **Main development**: Edit `src/cards/temperature-map-card.tsx` for card features
2. **Utility changes**: Modify files in `src/lib/temperature-map/` for algorithm improvements
3. **Testing**: Add tests when adding new functionality - maintain 100% coverage
4. **Preview**: Use `pnpm dev` to see changes at localhost:5173 with integrated wall editor
5. **HA Testing**: Use the ha-dev.ts endpoint for testing in actual Home Assistant

## File Structure

```
src/
├── cards/
│   └── temperature-map-card.tsx      # Main card component
├── lib/
│   ├── temperature-map/              # Extracted utility modules
│   │   ├── geometry.ts               # Geometric calculations  
│   │   ├── temperature.ts            # Temperature interpolation
│   │   ├── distance.ts               # Flood fill and distance grids
│   │   ├── types.ts                  # Shared types
│   │   └── geometry.test.ts          # Geometry tests
│   ├── create-react-card.tsx         # Web component wrapper
│   ├── types.ts                      # Home Assistant types
│   └── utils.ts                      # General utilities
├── mocks/                            # HA mocks for development
├── test/                             # Comprehensive test suite
├── components/ui/                    # UI components (minimal)
├── build.ts                          # Production entry point
├── ha-dev.ts                         # Development entry point  
├── preview.tsx                       # Preview with wall editor
└── wall-editor.tsx                   # Visual wall layout editor
```

## Release Process

Automated release system:
- `pnpm version patch|minor|major` - Updates version, creates tag, pushes to GitHub
- GitHub Actions automatically builds and releases `lovelace-temperature-map.js`
- HACS integration via `hacs.json` configuration

## Code Quality

- **TypeScript** with strict type checking
- **ESLint** for code quality and consistency  
- **Vitest** for comprehensive testing (97 tests)
- **knip** for unused code analysis and cleanup
- **Automated CI/CD** with GitHub Actions

The codebase has been thoroughly cleaned up to remove unused Home Assistant library files and focus specifically on temperature mapping functionality while maintaining excellent test coverage and code quality.