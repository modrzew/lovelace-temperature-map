import { HassEntity } from 'home-assistant-js-websocket';
import { createEntity } from './entities';

const now = new Date();




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
