# Cleanup Plan for Temperature Map Card Project

## Overview
This document outlines the cleanup plan for removing unnecessary code and dependencies from the forked repository to focus solely on the temperature map card functionality.

## Core Functionality to Keep

### Essential Files
- `src/cards/temperature-map-card.tsx` - Main temperature map visualization
- `src/wall-editor.tsx` - Wall layout editor for apartment configuration  
- `src/preview.tsx` - Development preview with temperature map and wall editor
- `src/lib/create-react-card.tsx` - Core abstraction for HA web components
- `src/lib/hooks/hass-hooks.tsx` - Home Assistant state management hooks
- `src/lib/types.ts` - TypeScript type definitions
- `src/lib/utils.ts` - Utility functions
- `src/lib/ha/` - Complete Home Assistant integration utilities
- `src/mocks/` - Mock data for development (entities, hass, sensors)
- `src/build.ts` - Production build entry point  
- `src/ha-dev.ts` - Home Assistant development integration
- `src/global.css`, `src/global.ts`, `src/index.css` - Core styling
- Configuration files: `vite.config.ts`, `tsconfig.*`, `eslint.config.js`, `package.json`

### Build System
- Development server: `pnpm dev` 
- Production build: `pnpm build`
- Preview functionality with both temperature map and wall editor

## Files and Dependencies to Remove

### 1. Unnecessary Card Components
**Files to delete:**
- `src/cards/carousel-card.tsx` - Carousel/slider functionality
- `src/cards/door-open-card.tsx` - Door sensor notifications with portal rendering
- `src/cards/header-card.tsx` - Simple time/date display (can be kept as example if desired)
- `src/cards/room-card.tsx` - Smart room controls with background images
- `src/cards/transportnsw-card.tsx` - NSW transport information

**Rationale:** These cards are unrelated to temperature mapping and pull in complex dependencies for portal rendering, carousel UI, transport-specific logic, and smart home controls.

### 2. Unused UI Components
**Files to delete:**
- `src/components/ui/carousel.tsx` - Only used by carousel-card
- `src/components/ui/aspect-ratio.tsx` - Not used by temperature map functionality

**Files to keep:**
- `src/components/ui/button.tsx` - Used by wall editor
- `src/components/ui/card.tsx` - Used by temperature map card and wall editor

### 3. NPM Dependencies to Remove
**Can be removed:**
- `embla-carousel-react` - Only used by carousel component
- `@radix-ui/react-aspect-ratio` - Only used by aspect-ratio component  
- `date-fns` - Only used by transport card for date parsing

**Dependencies to keep:**
- All React, TypeScript, and Vite build dependencies
- `@preact/signals-react` - Used for reactive state management
- `@radix-ui/react-slot` - Used by card component (shadcn/ui base)
- `class-variance-authority`, `clsx`, `tailwind-merge` - Used by UI components
- `lucide-react` - Icons used throughout the app
- `home-assistant-js-websocket`, `memoize-one`, `superstruct` - HA integration
- All TailwindCSS and styling dependencies

### 4. Code References to Clean Up
**Files to update:**
- `src/build.ts` - Remove commented import/registration lines for other cards
- `src/preview.tsx` - Remove imports and preview instances for deleted cards
- Update any other files that import the deleted cards

### 5. Mock Data Cleanup
**Review and simplify:**
- `src/mocks/entities.tsx` - Remove entities only used by deleted cards
- `src/mocks/sensors.tsx` - Keep temperature sensor mocks
- `src/mocks/hass.tsx` - Simplify to only include entities needed for temperature mapping

## Implementation Steps

### Phase 1: Remove Card Files
1. Delete unnecessary card component files
2. Delete unused UI component files
3. Update imports in build files and preview

### Phase 2: Clean Dependencies  
1. Remove unused npm packages from package.json
2. Run `pnpm install` to update lockfile
3. Verify build still works: `pnpm build`

### Phase 3: Clean References
1. Update build.ts to remove commented lines
2. Update preview.tsx to remove deleted card previews  
3. Simplify mock data files
4. Remove any other references to deleted components

### Phase 4: Verify Functionality
1. Test development server: `pnpm dev`
2. Verify temperature map card works in preview
3. Verify wall editor functionality 
4. Test production build: `pnpm build`
5. Verify HA integration: `pnpm preview` or HA dev mode

## Expected Benefits

### Reduced Complexity
- Smaller codebase focused on single purpose
- Fewer dependencies to maintain and update
- Simpler development environment

### Performance Improvements  
- Smaller bundle size from removing unused code
- Fewer runtime dependencies 
- Faster build times

### Maintenance Benefits
- Clear project scope focused on temperature mapping
- Easier to understand and modify codebase
- Reduced surface area for bugs and conflicts

## Risk Assessment

### Low Risk
- Removing clearly unused cards and their specific dependencies
- Cleaning up commented code and unused imports

### Medium Risk  
- Removing shared UI components - verify they're only used by deleted cards
- Simplifying mock data - ensure temperature map functionality still works

### Verification Required
- Test all build commands after each phase
- Verify HA integration still works
- Ensure wall editor and temperature map preview both function correctly

## Files That Require Special Attention

### Keep As-Is
- All files in `src/lib/ha/` - Complete HA frontend utilities (may seem unused but provide HA compatibility)
- `src/lib/create-react-card.tsx` - Core architecture for HA integration
- All configuration files for Vite, TypeScript, ESLint
- `wall-editor.html` - Standalone wall editor entry point

### Review Carefully
- `src/components/ui/card.tsx` - Verify it's not over-engineered for just temperature display
- Mock files - Simplify but don't break temperature sensor simulation
- CSS files - Remove styles only used by deleted components