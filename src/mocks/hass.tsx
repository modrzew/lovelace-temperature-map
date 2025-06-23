import { HomeAssistant } from '@/lib/types';
import { createLight } from './entities';
import { createTemperatureSensor } from './sensors';

export const hass: Partial<HomeAssistant> = {
  states: {
    ...createLight('light.fake_light_1'),
    ...createTemperatureSensor('sensor.fake_temperature_1', { state: '19.2' }),  // Too cold
    ...createTemperatureSensor('sensor.fake_temperature_2', { state: '27.1' }),  // Too warm  
    ...createTemperatureSensor('sensor.fake_temperature_3', { state: '22.5' }),  // Comfortable
    ...createTemperatureSensor('sensor.fake_temperature_4', { state: '24.8' }),  // Comfortable
  },
  formatEntityState: (stateObj, state) =>
    (state != null ? state : stateObj.state) ?? '',
  formatEntityAttributeName: (_stateObj, attribute) => attribute,
  formatEntityAttributeValue: (stateObj, attribute, value) =>
    value != null ? value : stateObj.attributes[attribute] ?? '',
};
