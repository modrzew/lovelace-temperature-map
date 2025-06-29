import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { signal } from '@preact/signals-react'
import '@testing-library/jest-dom'

// Import the TemperatureMapCard component
import { TemperatureMapCard } from '@/cards/temperature-map-card'

// Mock Home Assistant
const mockHass = signal({
  states: {
    'sensor.temp1': { state: '22.5', attributes: { friendly_name: 'Living Room' } },
    'sensor.temp2': { state: '24.0', attributes: { friendly_name: 'Kitchen' } }
  }
})

// Base configuration for testing
const baseConfig = {
  walls: [
    { x1: 0, y1: 0, x2: 200, y2: 0 },
    { x1: 200, y1: 0, x2: 200, y2: 150 }
  ],
  sensors: [
    { entity: 'sensor.temp1', x: 50, y: 50, label: 'Living Room' },
    { entity: 'sensor.temp2', x: 150, y: 100, label: 'Kitchen' }
  ],
  title: 'Temperature Map',
  min_temp: 15,
  max_temp: 30,
  too_cold_temp: 20,
  too_warm_temp: 26,
  ambient_temp: 22,
  show_sensor_names: true,
  show_sensor_temperatures: true,
  padding: 10,
  rotation: 0 as const
}

describe('Temperature Map Card - Edit Mode', () => {
  
  // =============================================================================
  // EDIT MODE PERFORMANCE OPTIMIZATION TESTS
  // =============================================================================
  
  describe('Edit Mode Performance Optimization', () => {
    it('should render canvas in normal mode', () => {
      const config = signal(baseConfig)
      const editMode = signal(false)
      
      render(
        <TemperatureMapCard 
          hass={mockHass} 
          config={config} 
          editMode={editMode}
          cardSize={signal(1)}
        />
      )
      
      const canvas = screen.queryByRole('img') // Canvas elements have img role by default
      expect(canvas).toBeTruthy()
      
      const visualEditor = screen.queryByText('General Settings')
      expect(visualEditor).toBeNull()
    })

    it('should render visual editor in edit mode', () => {
      const config = signal(baseConfig)
      const editMode = signal(true)
      
      render(
        <TemperatureMapCard 
          hass={mockHass} 
          config={config} 
          editMode={editMode}
          cardSize={signal(1)}
        />
      )
      
      expect(screen.getByText('General Settings')).toBeInTheDocument()
      expect(screen.getByText('Temperature Settings')).toBeInTheDocument()
      expect(screen.getByText('Display Settings')).toBeInTheDocument()
      expect(screen.getByText('Walls Configuration')).toBeInTheDocument()
      expect(screen.getByText('Sensors Configuration')).toBeInTheDocument()
      
      // Canvas should not be visible in edit mode
      const canvas = screen.queryByRole('img')
      expect(canvas).toBeNull()
    })

    it('should switch between edit mode and normal mode correctly', async () => {
      const config = signal(baseConfig)
      const editMode = signal(false)
      
      const { rerender } = render(
        <TemperatureMapCard 
          hass={mockHass} 
          config={config} 
          editMode={editMode}
          cardSize={signal(1)}
        />
      )
      
      // Should start in normal mode
      expect(screen.queryByText('General Settings')).toBeNull()
      
      // Switch to edit mode
      editMode.value = true
      rerender(
        <TemperatureMapCard 
          hass={mockHass} 
          config={config} 
          editMode={editMode}
          cardSize={signal(1)}
        />
      )
      
      await waitFor(() => {
        expect(screen.getByText('General Settings')).toBeInTheDocument()
      })
      
      // Switch back to normal mode
      editMode.value = false
      rerender(
        <TemperatureMapCard 
          hass={mockHass} 
          config={config} 
          editMode={editMode}
          cardSize={signal(1)}
        />
      )
      
      await waitFor(() => {
        expect(screen.queryByText('General Settings')).toBeNull()
      })
    })
  })

  // =============================================================================
  // VISUAL EDITOR FORM TESTS
  // =============================================================================
  
  describe('Visual Editor Form Controls', () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('should display current configuration values in form fields', () => {
      const config = signal(baseConfig)
      const editMode = signal(true)
      
      render(
        <TemperatureMapCard 
          hass={mockHass} 
          config={config} 
          editMode={editMode}
          cardSize={signal(1)}
        />
      )
      
      // Check general settings
      expect(screen.getByDisplayValue('Temperature Map')).toBeInTheDocument()
      expect(screen.getByDisplayValue('10')).toBeInTheDocument() // padding
      
      // Check temperature settings
      expect(screen.getByDisplayValue('15')).toBeInTheDocument() // min_temp
      expect(screen.getByDisplayValue('30')).toBeInTheDocument() // max_temp
      expect(screen.getByDisplayValue('20')).toBeInTheDocument() // too_cold_temp
      expect(screen.getByDisplayValue('26')).toBeInTheDocument() // too_warm_temp
      expect(screen.getByDisplayValue('22')).toBeInTheDocument() // ambient_temp
      
      // Check display settings checkboxes
      const showNamesCheckbox = screen.getByLabelText('Show sensor names')
      const showTempsCheckbox = screen.getByLabelText('Show sensor temperatures')
      expect(showNamesCheckbox).toBeChecked()
      expect(showTempsCheckbox).toBeChecked()
    })

    it('should update config when form fields change', async () => {
      const config = signal({ ...baseConfig })
      const editMode = signal(true)
      
      render(
        <TemperatureMapCard 
          hass={mockHass} 
          config={config} 
          editMode={editMode}
          cardSize={signal(1)}
        />
      )
      
      // Update title
      const titleInput = screen.getByDisplayValue('Temperature Map')
      fireEvent.change(titleInput, { target: { value: 'New Title' } })
      
      await waitFor(() => {
        expect(config.value.title).toBe('New Title')
      })
      
      // Update min temperature
      const minTempInput = screen.getByDisplayValue('15')
      fireEvent.change(minTempInput, { target: { value: '18' } })
      
      await waitFor(() => {
        expect(config.value.min_temp).toBe(18)
      })
      
      // Update padding
      const paddingInput = screen.getByDisplayValue('10')
      fireEvent.change(paddingInput, { target: { value: '20' } })
      
      await waitFor(() => {
        expect(config.value.padding).toBe(20)
      })
    })

    it('should handle rotation selection correctly', async () => {
      const config = signal({ ...baseConfig })
      const editMode = signal(true)
      
      render(
        <TemperatureMapCard 
          hass={mockHass} 
          config={config} 
          editMode={editMode}
          cardSize={signal(1)}
        />
      )
      
      const rotationSelect = screen.getByDisplayValue('0°')
      fireEvent.change(rotationSelect, { target: { value: '90' } })
      
      await waitFor(() => {
        expect(config.value.rotation).toBe(90)
      })
    })

    it('should handle checkbox changes correctly', async () => {
      const config = signal({ ...baseConfig })
      const editMode = signal(true)
      
      render(
        <TemperatureMapCard 
          hass={mockHass} 
          config={config} 
          editMode={editMode}
          cardSize={signal(1)}
        />
      )
      
      const showNamesCheckbox = screen.getByLabelText('Show sensor names')
      fireEvent.click(showNamesCheckbox)
      
      await waitFor(() => {
        expect(config.value.show_sensor_names).toBe(false)
      })
      
      // Click again to turn it back on
      fireEvent.click(showNamesCheckbox)
      
      await waitFor(() => {
        expect(config.value.show_sensor_names).toBe(true)
      })
    })
  })

  // =============================================================================
  // JSON CONFIGURATION TESTS
  // =============================================================================
  
  describe('JSON Configuration Editor', () => {
    it('should display walls configuration as formatted JSON', () => {
      const config = signal(baseConfig)
      const editMode = signal(true)
      
      render(
        <TemperatureMapCard 
          hass={mockHass} 
          config={config} 
          editMode={editMode}
          cardSize={signal(1)}
        />
      )
      
      const wallsTextarea = screen.getByPlaceholderText(/x1.*y1.*x2.*y2/)
      expect(wallsTextarea).toHaveValue(expect.stringContaining('"x1": 0'))
      expect(wallsTextarea).toHaveValue(expect.stringContaining('"y1": 0'))
      expect(wallsTextarea).toHaveValue(expect.stringContaining('"x2": 200'))
    })

    it('should display sensors configuration as formatted JSON', () => {
      const config = signal(baseConfig)
      const editMode = signal(true)
      
      render(
        <TemperatureMapCard 
          hass={mockHass} 
          config={config} 
          editMode={editMode}
          cardSize={signal(1)}
        />
      )
      
      const sensorsTextarea = screen.getByPlaceholderText(/entity.*x.*y.*label/)
      expect(sensorsTextarea).toHaveValue(expect.stringContaining('sensor.temp1'))
      expect(sensorsTextarea).toHaveValue(expect.stringContaining('Living Room'))
      expect(sensorsTextarea).toHaveValue(expect.stringContaining('"x": 50'))
    })

    it('should update config when valid walls JSON is entered', async () => {
      const config = signal({ ...baseConfig })
      const editMode = signal(true)
      
      render(
        <TemperatureMapCard 
          hass={mockHass} 
          config={config} 
          editMode={editMode}
          cardSize={signal(1)}
        />
      )
      
      const wallsTextarea = screen.getByPlaceholderText(/x1.*y1.*x2.*y2/)
      const newWalls = JSON.stringify([
        { x1: 10, y1: 10, x2: 100, y2: 10 },
        { x1: 100, y1: 10, x2: 100, y2: 80 }
      ], null, 2)
      
      fireEvent.change(wallsTextarea, { target: { value: newWalls } })
      
      await waitFor(() => {
        expect(config.value.walls).toHaveLength(2)
        expect(config.value.walls[0]).toEqual({ x1: 10, y1: 10, x2: 100, y2: 10 })
      })
    })

    it('should update config when valid sensors JSON is entered', async () => {
      const config = signal({ ...baseConfig })
      const editMode = signal(true)
      
      render(
        <TemperatureMapCard 
          hass={mockHass} 
          config={config} 
          editMode={editMode}
          cardSize={signal(1)}
        />
      )
      
      const sensorsTextarea = screen.getByPlaceholderText(/entity.*x.*y.*label/)
      const newSensors = JSON.stringify([
        { entity: 'sensor.new_temp', x: 75, y: 75, label: 'New Room' }
      ], null, 2)
      
      fireEvent.change(sensorsTextarea, { target: { value: newSensors } })
      
      await waitFor(() => {
        expect(config.value.sensors).toHaveLength(1)
        expect(config.value.sensors[0]).toEqual({ 
          entity: 'sensor.new_temp', 
          x: 75, 
          y: 75, 
          label: 'New Room' 
        })
      })
    })

    it('should show error for invalid walls JSON', async () => {
      const config = signal({ ...baseConfig })
      const editMode = signal(true)
      
      render(
        <TemperatureMapCard 
          hass={mockHass} 
          config={config} 
          editMode={editMode}
          cardSize={signal(1)}
        />
      )
      
      const wallsTextarea = screen.getByPlaceholderText(/x1.*y1.*x2.*y2/)
      fireEvent.change(wallsTextarea, { target: { value: 'invalid json {' } })
      
      await waitFor(() => {
        expect(screen.getByText(/JSON Error:/)).toBeInTheDocument()
      })
      
      // Original walls should remain unchanged
      expect(config.value.walls).toEqual(baseConfig.walls)
    })

    it('should show error for invalid sensors JSON', async () => {
      const config = signal({ ...baseConfig })
      const editMode = signal(true)
      
      render(
        <TemperatureMapCard 
          hass={mockHass} 
          config={config} 
          editMode={editMode}
          cardSize={signal(1)}
        />
      )
      
      const sensorsTextarea = screen.getByPlaceholderText(/entity.*x.*y.*label/)
      fireEvent.change(sensorsTextarea, { target: { value: 'not an array: {}' } })
      
      await waitFor(() => {
        expect(screen.getByText('Sensors must be an array')).toBeInTheDocument()
      })
      
      // Original sensors should remain unchanged
      expect(config.value.sensors).toEqual(baseConfig.sensors)
    })

    it('should show error for non-array walls JSON', async () => {
      const config = signal({ ...baseConfig })
      const editMode = signal(true)
      
      render(
        <TemperatureMapCard 
          hass={mockHass} 
          config={config} 
          editMode={editMode}
          cardSize={signal(1)}
        />
      )
      
      const wallsTextarea = screen.getByPlaceholderText(/x1.*y1.*x2.*y2/)
      fireEvent.change(wallsTextarea, { target: { value: '{"not": "array"}' } })
      
      await waitFor(() => {
        expect(screen.getByText('Walls must be an array')).toBeInTheDocument()
      })
      
      // Original walls should remain unchanged  
      expect(config.value.walls).toEqual(baseConfig.walls)
    })

    it('should clear errors when valid JSON is entered after invalid', async () => {
      const config = signal({ ...baseConfig })
      const editMode = signal(true)
      
      render(
        <TemperatureMapCard 
          hass={mockHass} 
          config={config} 
          editMode={editMode}
          cardSize={signal(1)}
        />
      )
      
      const wallsTextarea = screen.getByPlaceholderText(/x1.*y1.*x2.*y2/)
      
      // Enter invalid JSON first
      fireEvent.change(wallsTextarea, { target: { value: 'invalid' } })
      
      await waitFor(() => {
        expect(screen.getByText(/JSON Error:/)).toBeInTheDocument()
      })
      
      // Enter valid JSON
      const validWalls = JSON.stringify([{ x1: 0, y1: 0, x2: 100, y2: 0 }], null, 2)
      fireEvent.change(wallsTextarea, { target: { value: validWalls } })
      
      await waitFor(() => {
        expect(screen.queryByText(/JSON Error:/)).toBeNull()
      })
    })
  })

  // =============================================================================
  // EDGE CASES AND ERROR HANDLING
  // =============================================================================
  
  describe('Edge Cases and Error Handling', () => {
    it('should handle empty walls and sensors arrays', () => {
      const config = signal({
        ...baseConfig,
        walls: [],
        sensors: []
      })
      const editMode = signal(true)
      
      render(
        <TemperatureMapCard 
          hass={mockHass} 
          config={config} 
          editMode={editMode}
          cardSize={signal(1)}
        />
      )
      
      const wallsTextarea = screen.getByPlaceholderText(/x1.*y1.*x2.*y2/)
      const sensorsTextarea = screen.getByPlaceholderText(/entity.*x.*y.*label/)
      
      expect(wallsTextarea).toHaveValue('[]')
      expect(sensorsTextarea).toHaveValue('[]')
    })

    it('should handle config with missing optional properties', () => {
      const minimalConfig = {
        walls: [],
        sensors: []
      }
      const config = signal(minimalConfig)
      const editMode = signal(true)
      
      render(
        <TemperatureMapCard 
          hass={mockHass} 
          config={config} 
          editMode={editMode}
          cardSize={signal(1)}
        />
      )
      
      // Should display default values for missing properties
      expect(screen.getByDisplayValue('')).toBeInTheDocument() // title
      expect(screen.getByDisplayValue('15')).toBeInTheDocument() // min_temp default
      expect(screen.getByDisplayValue('30')).toBeInTheDocument() // max_temp default
    })

    it('should handle numeric input edge cases', async () => {
      const config = signal({ ...baseConfig })
      const editMode = signal(true)
      
      render(
        <TemperatureMapCard 
          hass={mockHass} 
          config={config} 
          editMode={editMode}
          cardSize={signal(1)}
        />
      )
      
      const paddingInput = screen.getByDisplayValue('10')
      
      // Test empty string
      fireEvent.change(paddingInput, { target: { value: '' } })
      await waitFor(() => {
        expect(config.value.padding).toBe(0)
      })
      
      // Test negative number
      fireEvent.change(paddingInput, { target: { value: '-5' } })
      await waitFor(() => {
        expect(config.value.padding).toBe(-5)
      })
      
      // Test decimal number (should be converted to integer)
      fireEvent.change(paddingInput, { target: { value: '10.7' } })
      await waitFor(() => {
        expect(config.value.padding).toBe(10)
      })
    })

    it('should handle width and height undefined values correctly', async () => {
      const config = signal({ ...baseConfig })
      const editMode = signal(true)
      
      render(
        <TemperatureMapCard 
          hass={mockHass} 
          config={config} 
          editMode={editMode}
          cardSize={signal(1)}
        />
      )
      
      const widthInput = screen.getByPlaceholderText('Auto')
      
      // Clear the input (should set to undefined)
      fireEvent.change(widthInput, { target: { value: '' } })
      
      await waitFor(() => {
        expect(config.value.width).toBeUndefined()
      })
      
      // Set a value
      fireEvent.change(widthInput, { target: { value: '500' } })
      
      await waitFor(() => {
        expect(config.value.width).toBe(500)
      })
    })
  })
})