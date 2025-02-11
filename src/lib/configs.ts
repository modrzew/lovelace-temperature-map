export const mergeConfigs = <T extends Record<string, unknown>>(
  config: Partial<T> = {},
  defaultConfig: T,
) => {
  return Object.keys(defaultConfig).reduce((acc, key) => {
    if (config[key]) {
      acc[key] = config[key];
    } else {
      acc[key] = defaultConfig[key];
    }
    return acc;
  }, {} as T);
};

