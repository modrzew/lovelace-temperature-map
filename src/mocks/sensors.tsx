import { HassEntity } from 'home-assistant-js-websocket';
import { createEntity } from './entities';

const now = new Date();

// formatted time based on now
const formatted = now.toLocaleTimeString('en-US', {
  hour12: false,
  hour: '2-digit',
  minute: '2-digit',
});

const defaults = {
  entity_id: 'sensor.time',
  state: formatted,
  attributes: {
    icon: 'mdi:clock',
    friendly_name: 'Time',
  },
  context: {
    id: '01H4JAXGF1RTA2MJGGPGAGM7VD',
    parent_id: null,
    user_id: null,
  },
  last_changed: now.toISOString(),
  last_updated: now.toISOString(),
} satisfies HassEntity;

export const createSensor = (
  entity_id: string,
  overrides: Partial<HassEntity> = {},
) => {
  return createEntity(entity_id, defaults, overrides);
};

const temperatureSensor = {
  entity_id: 'sensor.temperature_sensor',
  state: '24.5',
  attributes: {
    state_class: 'measurement',
    'environment.temperature': 24.5,
    device_class: 'temperature',
    friendly_name: 'Temperature Sensor',
  },
  context: {
    id: '01JH8B3CE05VRZBJP7TMZ34FTH',
    parent_id: null,
    user_id: null,
  },
  last_changed: now.toISOString(),
  last_updated: now.toISOString(),
} satisfies HassEntity;

export const createTemperatureSensor = (entity_id: string, overrides: Partial<HassEntity> = {}) => {
  return createEntity(entity_id, temperatureSensor, overrides);
};
