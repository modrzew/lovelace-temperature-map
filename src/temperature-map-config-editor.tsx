import React, { useState, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import * as yaml from "js-yaml";
import type { Wall, TemperatureSensor } from "@/lib/temperature-map/types";

// Form schema configuration following ha-form pattern
interface FormField {
  name: string;
  type: "string" | "number" | "boolean" | "select" | "textarea";
  label: string;
  default?: string | number | boolean;
  placeholder?: string;
  options?: { value: string | number; label: string }[];
  description?: string;
  required?: boolean;
  min?: number;
  max?: number;
  step?: number;
}

interface FormSection {
  title: string;
  fields: FormField[];
  collapsible?: boolean;
  expanded?: boolean;
}

const CONFIG_SCHEMA: FormSection[] = [
  {
    title: "General Settings",
    fields: [
      {
        name: "title",
        type: "string",
        label: "Title",
        placeholder: "Card title",
        description: "Display name for the temperature map card",
      },
      {
        name: "rotation",
        type: "select",
        label: "Rotation",
        default: 0,
        options: [
          { value: 0, label: "0°" },
          { value: 90, label: "90°" },
          { value: 180, label: "180°" },
          { value: 270, label: "270°" },
        ],
        description: "Rotate the entire temperature map",
      },
      {
        name: "width",
        type: "number",
        label: "Width",
        placeholder: "Auto",
        description: "Fixed width in pixels (leave empty for auto)",
      },
      {
        name: "height",
        type: "number",
        label: "Height",
        placeholder: "Auto",
        description: "Fixed height in pixels (leave empty for auto)",
      },
      {
        name: "padding",
        type: "number",
        label: "Padding",
        default: 0,
        min: 0,
        description: "Internal padding around the temperature map",
      },
    ],
  },
  {
    title: "Temperature Settings",
    fields: [
      {
        name: "comfort_min_temp",
        type: "number",
        label: "Minimum Comfort Temperature",
        default: 20,
        step: 0.1,
        description: "Temperature below which areas appear blue (cold)",
      },
      {
        name: "comfort_max_temp",
        type: "number",
        label: "Maximum Comfort Temperature",
        default: 26,
        step: 0.1,
        description: "Temperature above which areas appear red (hot)",
      },
      {
        name: "ambient_temp",
        type: "number",
        label: "Ambient Temperature",
        default: 22,
        step: 0.1,
        description: "Default ambient temperature for empty areas",
      },
    ],
  },
  {
    title: "Display Settings",
    fields: [
      {
        name: "show_sensor_names",
        type: "boolean",
        label: "Show sensor names",
        default: true,
        description: "Display sensor names on the map",
      },
      {
        name: "show_sensor_temperatures",
        type: "boolean",
        label: "Show sensor temperatures",
        default: true,
        description: "Display current temperature values",
      },
    ],
  },
  {
    title: "Advanced Configuration",
    collapsible: true,
    expanded: false,
    fields: [
      {
        name: "walls",
        type: "textarea",
        label: "Walls (YAML Array)",
        placeholder: "- x1: 0\\n  y1: 0\\n  x2: 200\\n  y2: 0",
        description: "Define walls that block temperature flow",
      },
      {
        name: "sensors",
        type: "textarea",
        label: "Sensors (YAML Array)",
        placeholder:
          "- entity: sensor.temp\\n  x: 100\\n  y: 100\\n  label: Living Room",
        description: "Configure sensor positions and entities",
      },
    ],
  },
];

// Home Assistant Config Editor Styles
const HA_STYLES = `
  /* Use existing HA theme variables, no overrides needed */

  .ha-config-editor {
    padding: 16px;
    font-family: var(--paper-font-body1_-_font-family, 'Roboto', 'Noto', sans-serif);
    color: var(--primary-text-color);
    background: transparent;
  }

  .ha-config-title {
    margin: 0 0 24px 0;
    font-size: var(--paper-font-headline_-_font-size, 24px);
    font-weight: var(--paper-font-headline_-_font-weight, 400);
    color: var(--primary-text-color);
  }

  .ha-config-section {
    margin-bottom: 32px;
  }

  .ha-config-section-title {
    margin: 0 0 16px 0;
    font-size: var(--paper-font-subhead_-_font-size, 16px);
    font-weight: var(--paper-font-subhead_-_font-weight, 400);
    color: var(--primary-color);
  }

  .ha-config-section-title.collapsible {
    cursor: pointer;
    user-select: none;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: color 0.2s ease;
    padding: 4px;
    border-radius: 4px;
    margin: -4px;
  }

  .ha-config-section-title.collapsible:focus {
    outline: 2px solid var(--primary-color);
    outline-offset: 2px;
  }

  .ha-config-section-title.collapsible:hover {
    color: var(--primary-color);
    opacity: 0.8;
  }

  .ha-config-expand-icon {
    font-size: 12px;
    transition: transform 0.2s ease;
  }

  .ha-config-expand-icon.expanded {
    transform: rotate(90deg);
  }

  .ha-config-section-content {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 16px;
  }

  .ha-config-field {
    display: flex;
    flex-direction: column;
  }

  .ha-config-field.boolean {
    margin: 8px 0;
    display: flex;
    align-items: flex-start;
    gap: 8px;
  }

  .ha-config-field[data-type="textarea"] {
    grid-column: 1 / -1;
  }

  .ha-config-label {
    margin-bottom: 8px;
    font-size: var(--paper-font-body2_-_font-size, 14px);
    font-weight: var(--paper-font-body2_-_font-weight, 500);
    color: var(--secondary-text-color);
  }

  .ha-config-input, .ha-config-select {
    width: 100%;
    padding: 12px 16px;
    border: 1px solid var(--divider-color);
    border-radius: 8px;
    font-size: var(--paper-font-body1_-_font-size, 14px);
    color: var(--primary-text-color);
    background: var(--ha-card-background, var(--card-background-color));
    transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
  }

  .ha-config-input:focus, .ha-config-select:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 2px rgba(3, 169, 244, 0.2);
  }

  .ha-config-input:focus-visible, .ha-config-select:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: 2px;
  }

  .ha-config-input::placeholder {
    color: var(--secondary-text-color);
    opacity: 0.7;
  }

  .ha-config-checkbox-group {
    display: flex;
    gap: 24px;
    flex-wrap: wrap;
  }

  .ha-config-checkbox-label {
    font-size: var(--paper-font-body1_-_font-size, 14px);
    color: var(--primary-text-color);
    cursor: pointer;
  }

  .ha-config-checkbox {
    margin: 0;
    width: 18px;
    height: 18px;
    accent-color: var(--primary-color);
    flex-shrink: 0;
    margin-top: 2px;
  }

  .ha-config-checkbox:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: 2px;
  }

  .ha-config-checkbox-text {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .ha-config-textarea {
    width: 100%;
    padding: 12px 16px;
    border: 1px solid var(--divider-color);
    border-radius: 8px;
    font-family: var(--code-font-family, 'Roboto Mono', monospace);
    font-size: 13px;
    color: var(--primary-text-color);
    background: var(--ha-card-background, var(--card-background-color));
    min-height: 128px;
    resize: vertical;
    transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
  }

  .ha-config-textarea:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 2px rgba(3, 169, 244, 0.2);
  }

  .ha-config-textarea:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: 2px;
  }

  .ha-config-textarea.error {
    border-color: #f44336;
  }

  .ha-config-error {
    color: #f44336;
    font-size: var(--paper-font-caption_-_font-size);
    margin-top: 8px;
  }

  .ha-config-description {
    font-size: var(--paper-font-caption_-_font-size, 12px);
    color: var(--secondary-text-color);
    font-style: italic;
    margin-top: 4px;
  }

  .ha-config-required {
    color: #f44336;
    margin-left: 4px;
  }

  @media (max-width: 768px) {
    .ha-config-section-content {
      grid-template-columns: 1fr;
    }

    .ha-config-checkbox-group {
      flex-direction: column;
      gap: 16px;
    }
  }
`;

interface Config {
  title?: string;
  width?: number;
  height?: number;
  walls: Wall[];
  sensors: TemperatureSensor[];

  comfort_min_temp?: number;
  comfort_max_temp?: number;
  ambient_temp?: number;
  show_sensor_names?: boolean;
  show_sensor_temperatures?: boolean;
  padding?: number;
  rotation?: 0 | 90 | 180 | 270;
}

interface ConfigEditorProps {
  config: Config;
  onConfigChange: (config: Config) => void;
}

const ConfigEditor: React.FC<ConfigEditorProps> = ({
  config,
  onConfigChange,
}) => {
  const [wallsYaml, setWallsYaml] = useState(yaml.dump(config.walls));
  const [sensorsYaml, setSensorsYaml] = useState(yaml.dump(config.sensors));
  const [wallsError, setWallsError] = useState<string | null>(null);
  const [sensorsError, setSensorsError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({});

  // Update config when form values change
  const updateConfig = (updates: Partial<Config>) => {
    const newConfig = { ...config, ...updates };
    onConfigChange(newConfig);
  };

  // Get field value from config
  const getFieldValue = (
    fieldName: string,
    defaultValue?: string | number | boolean,
  ) => {
    const value = (config as unknown as Record<string, unknown>)[fieldName];
    return value !== undefined ? value : defaultValue;
  };

  // Update field value in config
  const updateFieldValue = (
    fieldName: string,
    value: string | number | boolean | undefined,
  ) => {
    updateConfig({ [fieldName]: value });
  };

  // Toggle section expansion
  const toggleSection = (sectionTitle: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionTitle]: !prev[sectionTitle],
    }));
  };

  // Check if section is expanded
  const isSectionExpanded = (section: FormSection) => {
    if (!section.collapsible) return true;
    return expandedSections[section.title] ?? section.expanded ?? false;
  };

  const handleWallsChange = (value: string) => {
    setWallsYaml(value);
    try {
      const parsedWalls = yaml.load(value);
      if (Array.isArray(parsedWalls)) {
        updateConfig({ walls: parsedWalls });
        setWallsError(null);
      } else {
        setWallsError("Walls must be an array");
      }
    } catch (error) {
      setWallsError(
        `YAML Error: ${error instanceof Error ? error.message : "Invalid YAML"}`,
      );
    }
  };

  const handleSensorsChange = (value: string) => {
    setSensorsYaml(value);
    try {
      const parsedSensors = yaml.load(value);
      if (Array.isArray(parsedSensors)) {
        updateConfig({ sensors: parsedSensors });
        setSensorsError(null);
      } else {
        setSensorsError("Sensors must be an array");
      }
    } catch (error) {
      setSensorsError(
        `YAML Error: ${error instanceof Error ? error.message : "Invalid YAML"}`,
      );
    }
  };

  // Update YAML when config changes externally
  useEffect(() => {
    setWallsYaml(yaml.dump(config.walls));
    setSensorsYaml(yaml.dump(config.sensors));
  }, [config.walls, config.sensors]);

  // Render form field based on type
  const renderField = (field: FormField) => {
    const value = getFieldValue(field.name, field.default);

    switch (field.type) {
      case "string":
        return (
          <input
            type="text"
            id={`field-${field.name}`}
            value={String(value || "")}
            onChange={(e) => updateFieldValue(field.name, e.target.value)}
            className="ha-config-input"
            placeholder={field.placeholder}
            aria-describedby={
              field.description ? `${field.name}-description` : undefined
            }
            aria-required={field.required}
          />
        );

      case "number":
        return (
          <input
            type="number"
            id={`field-${field.name}`}
            value={String(value || "")}
            onChange={(e) =>
              updateFieldValue(
                field.name,
                e.target.value ? parseFloat(e.target.value) : undefined,
              )
            }
            className="ha-config-input"
            placeholder={field.placeholder}
            min={field.min}
            max={field.max}
            step={field.step}
            aria-describedby={
              field.description ? `${field.name}-description` : undefined
            }
            aria-required={field.required}
          />
        );

      case "boolean":
        return (
          <input
            type="checkbox"
            id={`field-${field.name}`}
            checked={value !== false}
            onChange={(e) => updateFieldValue(field.name, e.target.checked)}
            className="ha-config-checkbox"
            aria-describedby={
              field.description ? `${field.name}-description` : undefined
            }
          />
        );

      case "select":
        return (
          <select
            id={`field-${field.name}`}
            value={String(value || field.default || "")}
            onChange={(e) =>
              updateFieldValue(
                field.name,
                field.options?.find(
                  (opt) => opt.value.toString() === e.target.value,
                )?.value,
              )
            }
            className="ha-config-select"
            aria-describedby={
              field.description ? `${field.name}-description` : undefined
            }
            aria-required={field.required}
          >
            {field.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case "textarea":
        if (field.name === "walls") {
          return (
            <>
              <textarea
                id={`field-${field.name}`}
                value={wallsYaml}
                onChange={(e) => handleWallsChange(e.target.value)}
                className={`ha-config-textarea ${wallsError ? "error" : ""}`}
                placeholder={field.placeholder}
                aria-describedby={`${field.name}-description ${wallsError ? `${field.name}-error` : ""}`}
                aria-invalid={!!wallsError}
              />
              {wallsError && (
                <p
                  id={`${field.name}-error`}
                  className="ha-config-error"
                  role="alert"
                >
                  {wallsError}
                </p>
              )}
            </>
          );
        } else if (field.name === "sensors") {
          return (
            <>
              <textarea
                id={`field-${field.name}`}
                value={sensorsYaml}
                onChange={(e) => handleSensorsChange(e.target.value)}
                className={`ha-config-textarea ${sensorsError ? "error" : ""}`}
                placeholder={field.placeholder}
                aria-describedby={`${field.name}-description ${sensorsError ? `${field.name}-error` : ""}`}
                aria-invalid={!!sensorsError}
              />
              {sensorsError && (
                <p
                  id={`${field.name}-error`}
                  className="ha-config-error"
                  role="alert"
                >
                  {sensorsError}
                </p>
              )}
            </>
          );
        }
        return null;

      default:
        return null;
    }
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: HA_STYLES }} />
      <div className="ha-config-editor">
        <h3 className="ha-config-title">Temperature Map Card Configuration</h3>

        {CONFIG_SCHEMA.map((section, sectionIndex) => {
          const isExpanded = isSectionExpanded(section);

          return (
            <div key={sectionIndex} className="ha-config-section">
              <h4
                className={`ha-config-section-title ${section.collapsible ? "collapsible" : ""}`}
                onClick={() =>
                  section.collapsible && toggleSection(section.title)
                }
                onKeyDown={(e) => {
                  if (
                    section.collapsible &&
                    (e.key === "Enter" || e.key === " ")
                  ) {
                    e.preventDefault();
                    toggleSection(section.title);
                  }
                }}
                tabIndex={section.collapsible ? 0 : undefined}
                role={section.collapsible ? "button" : undefined}
                aria-expanded={section.collapsible ? isExpanded : undefined}
                aria-controls={
                  section.collapsible
                    ? `section-${sectionIndex}-content`
                    : undefined
                }
              >
                {section.collapsible && (
                  <span
                    className={`ha-config-expand-icon ${isExpanded ? "expanded" : ""}`}
                    aria-hidden="true"
                  >
                    ▶
                  </span>
                )}
                {section.title}
              </h4>

              {isExpanded && (
                <div
                  className="ha-config-section-content"
                  id={
                    section.collapsible
                      ? `section-${sectionIndex}-content`
                      : undefined
                  }
                >
                  {section.fields.map((field, fieldIndex) => {
                    const isBoolean = field.type === "boolean";

                    return (
                      <div
                        key={fieldIndex}
                        className={`ha-config-field ${isBoolean ? "boolean" : ""}`}
                        data-type={field.type}
                      >
                        {isBoolean ? (
                          <>
                            {renderField(field)}
                            <label
                              className="ha-config-checkbox-label"
                              htmlFor={`field-${field.name}`}
                            >
                              <span className="ha-config-checkbox-text">
                                {field.label}
                                {field.description && (
                                  <span
                                    id={`${field.name}-description`}
                                    className="ha-config-description"
                                  >
                                    {field.description}
                                  </span>
                                )}
                              </span>
                            </label>
                          </>
                        ) : (
                          <>
                            <label
                              className="ha-config-label"
                              htmlFor={`field-${field.name}`}
                            >
                              {field.label}
                              {field.required && (
                                <span
                                  className="ha-config-required"
                                  aria-label="required"
                                >
                                  *
                                </span>
                              )}
                            </label>
                            {renderField(field)}
                            {field.description && (
                              <span
                                id={`${field.name}-description`}
                                className="ha-config-description"
                              >
                                {field.description}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
};

class TemperatureMapConfigEditor extends HTMLElement {
  private config: Config = { walls: [], sensors: [] };
  private root: Root | null = null;

  connectedCallback() {
    this.root = createRoot(this);
    this.render();
  }

  disconnectedCallback() {
    if (this.root) {
      this.root.unmount();
    }
  }

  setConfig(config: Config) {
    this.config = { ...config };
    this.render();
  }

  private configChanged(newConfig: Config) {
    const event = new CustomEvent("config-changed", {
      detail: { config: newConfig },
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(event);
  }

  private render() {
    if (this.root) {
      this.root.render(
        <ConfigEditor
          config={this.config}
          onConfigChange={(newConfig) => this.configChanged(newConfig)}
        />,
      );
    }
  }
}

customElements.define(
  "temperature-map-card-editor",
  TemperatureMapConfigEditor,
);

export { TemperatureMapConfigEditor };
