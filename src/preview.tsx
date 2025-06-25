import React from 'react';
import { createRoot } from 'react-dom/client';
import { ElementType } from 'react';
import { createReactCard } from '@/lib/create-react-card';
import styles from './index.css?inline';
import './preview.css';
import { hass } from './mocks/hass';
import { TemperatureMapCard } from './cards/temperature-map-card';
import WallEditor from './wall-editor';

const styleSheet = new CSSStyleSheet();
styleSheet.replaceSync(styles);

const rootEl = document.getElementById('root')!;

const createAndDisplayCard = (
  cardName: string,
  ReactComponent: ElementType,
  config?: unknown,
  parentElement: HTMLElement = rootEl,
) => {
  createReactCard(cardName, ReactComponent, styleSheet);
  const element = document.createElement(cardName);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (element as any).setConfig(config);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (element as any).hass = hass;
  parentElement.appendChild(element);
};

createAndDisplayCard('temperature-map-card', TemperatureMapCard, {
  title: 'Apartment Temperature Map (Physics-Based)',
  width: 400,
  height: 300,
  min_temp: 18,
  max_temp: 28,
  too_cold_temp: 20,
  too_warm_temp: 26,
  ambient_temp: 20,
  show_sensor_names: true,
  show_sensor_temperatures: true,
  walls: [
    { x1: 0, y1: 0, x2: 400, y2: 0 },     // Top wall
    { x1: 400, y1: 0, x2: 400, y2: 300 }, // Right wall  
    { x1: 400, y1: 300, x2: 0, y2: 300 }, // Bottom wall
    { x1: 0, y1: 300, x2: 0, y2: 0 },     // Left wall
    { x1: 200, y1: 0, x2: 200, y2: 150 }, // Interior wall dividing left/right
    { x1: 0, y1: 175, x2: 200, y2: 175 }, // Interior wall dividing top/bottom left
  ],
  sensors: [
    { entity: 'sensor.fake_temperature_1', x: 100, y: 75, label: 'Living Room' },
    { entity: 'sensor.fake_temperature_2', x: 300, y: 75 }, // No label - will use entity's friendly_name
    { entity: 'sensor.fake_temperature_3', x: 100, y: 225, label: 'Bedroom' },
    { entity: 'sensor.fake_temperature_4', x: 300, y: 225 }, // No label - will use entity's friendly_name
  ],
});

// Add wall editor at the bottom
const wallEditorContainer = document.createElement('div');
wallEditorContainer.style.marginTop = '2rem';
wallEditorContainer.style.borderTop = '2px solid #eee';
wallEditorContainer.style.paddingTop = '2rem';
rootEl.appendChild(wallEditorContainer);

const wallEditorRoot = createRoot(wallEditorContainer);
wallEditorRoot.render(React.createElement(WallEditor));
