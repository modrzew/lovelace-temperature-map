# Lovelace Temperature Map Card

A Home Assistant custom card that displays temperature sensors as a physics-based heat map with wall blocking and realistic temperature flow. Visualize temperature distribution throughout your home with interactive sensor placement and visual wall layout editing.

## Features

- **Physics-based temperature interpolation** - Uses flood fill algorithms for realistic heat distribution
- **Wall blocking** - Walls properly block heat flow between rooms
- **Interactive sensor display** - Click sensors to see details and temperatures
- **Visual wall editor** - Design room layouts with real-time preview
- **Responsive design** - Automatically sizes to fit your dashboard
- **Comprehensive testing** - 97 tests covering all functionality

## Quick Start

1. **Download** the latest `lovelace-temperature-map.js` from [Releases](../../releases)
2. **Add to Home Assistant** in Configuration → Lovelace Dashboards → Resources
3. **Add to dashboard** with type: `custom:temperature-map-card`

## Development

To start development:

```bash
pnpm install
pnpm dev
```

- Visit http://localhost:5173 to see the card preview
- Use http://localhost:5173/src/ha-dev.ts in Home Assistant for testing
- The wall editor is included in the preview page for designing layouts

### Development Commands

- `pnpm dev` - Start development server with card preview
- `pnpm build` - Build production version
- `pnpm test` - Run tests in watch mode
- `pnpm test:run` - Run tests once
- `pnpm lint` - Run TypeScript and ESLint checks

## Card Configuration

```yaml
type: custom:temperature-map-card
title: "Living Room Temperature"
width: 400
height: 300

walls:
  - { x1: 50, y1: 50, x2: 350, y2: 50 }
  - { x1: 350, y1: 50, x2: 350, y2: 250 }
sensors:
  - { entity: "sensor.living_room_temp", x: 100, y: 100 }
  - { entity: "sensor.kitchen_temp", x: 250, y: 150, label: "Kitchen" }
```

## Wall Layout Editor

The integrated wall editor helps you design temperature map layouts:

- **Real-time preview** of wall configurations
- **Grid reference** for precise positioning  
- **JavaScript syntax highlighting** and error checking
- **Copy-to-clipboard** for easy configuration transfer
- **Interactive canvas** with wall indices for identification

Access the editor by running `pnpm dev` and visiting http://localhost:5173

## Architecture

Built with modern web technologies:

- **React 19** with TypeScript for component development
- **Vite** for fast development and optimized builds
- **Vitest** for comprehensive testing
- **Home Assistant integration** via web components
- **Physics-based algorithms** for realistic heat simulation

## Releases

This project uses semantic versioning with automated GitHub releases:

```bash
# Create new release
pnpm version patch|minor|major
# Automatically pushes code and tags, triggers build and release
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass with `pnpm test:run`
5. Submit a pull request

## License

MIT License - see LICENSE file for details.