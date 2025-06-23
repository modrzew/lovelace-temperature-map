import { HomeAssistant } from '@/lib/types';
import { createLight } from './entities';
import { createTemperatureSensor } from './sensors';

export const hass: Partial<HomeAssistant> = {
  states: {
    ...createLight('light.fake_light_1'),
    ...createTemperatureSensor('sensor.fake_temperature_1', { 
      state: '20.6',
      attributes: { friendly_name: 'Living Room Temperature', device_class: 'temperature', state_class: 'measurement' }
    }),  // Too cold
    ...createTemperatureSensor('sensor.fake_temperature_2', { 
      state: '21.2',
      attributes: { friendly_name: 'Kitchen Temperature', device_class: 'temperature', state_class: 'measurement' }
    }),  // Too warm  
    ...createTemperatureSensor('sensor.fake_temperature_3', { 
      state: '22.3',
      attributes: { friendly_name: 'Bedroom Temperature', device_class: 'temperature', state_class: 'measurement' }
    }),  // Comfortable
    ...createTemperatureSensor('sensor.fake_temperature_4', { 
      state: '24.8',
      attributes: { friendly_name: 'Bathroom Temperature', device_class: 'temperature', state_class: 'measurement' }
    }),  // Comfortable
  },
  formatEntityState: (stateObj, state) =>
    (state != null ? state : stateObj.state) ?? '',
  formatEntityAttributeName: (_stateObj, attribute) => attribute,
  formatEntityAttributeValue: (stateObj, attribute, value) =>
    value != null ? value : stateObj.attributes[attribute] ?? '',
};
