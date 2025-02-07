import { HomeAssistant } from '@/lib/types';
import { createLight } from './entities';
import { createTemperatureSensor } from './sensors';

export const hass: Partial<HomeAssistant> = {
  states: {
    ...createLight('light.fake_light_1'),
    ...createTemperatureSensor('sensor.fake_temperature_1'),
  },
  formatEntityState: (stateObj, state) =>
    (state != null ? state : stateObj.state) ?? '',
  formatEntityAttributeName: (_stateObj, attribute) => attribute,
  formatEntityAttributeValue: (stateObj, attribute, value) =>
    value != null ? value : stateObj.attributes[attribute] ?? '',
};
