/**
 * PersonaSelector Component Tests
 *
 * Tests for PersonaSelector UI, multi-select behavior, search/filter, and state integration.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { PersonaSelector } from '../PersonaSelector'
import { useAIStore } from '../../../store/aiStore'
import { VOICE_PERSONAS } from '@shared/constants/personas.constants'

// Mock the aiStore
vi.mock('../../../store/aiStore', () => ({
  useAIStore: vi.fn()
}))

describe('PersonaSelector', () => {
  // Default mock store state
  const mockStore = {
    selectedPersonas: [],
    addPersona: vi.fn(),
    removePersona: vi.fn(),
    clearPersonas: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // @ts-expect-error - Mock implementation
    useAIStore.mockImplementation((selector) => selector(mockStore))
  })

  describe('Rendering', () => {
    it('should render persona selector with label', () => {
      render(<PersonaSelector />)
      expect(screen.getByText('Voice Personas (optional)')).toBeInTheDocument()
    })

    it('should render dropdown trigger with placeholder text when no personas selected', () => {
      render(<PersonaSelector />)
      expect(screen.getByText('Select personas...')).toBeInTheDocument()
    })

    it('should show count when personas are selected', () => {
      const storeWithSelection = {
        ...mockStore,
        selectedPersonas: ['naval', 'garyvee']
      }
      // @ts-expect-error - Mock implementation
      useAIStore.mockImplementation((selector) => selector(storeWithSelection))

      render(<PersonaSelector />)
      expect(screen.getByText('2 personas selected')).toBeInTheDocument()
    })

    it('should render "Clear All" button when personas are selected', () => {
      const storeWithSelection = {
        ...mockStore,
        selectedPersonas: ['naval']
      }
      // @ts-expect-error - Mock implementation
      useAIStore.mockImplementation((selector) => selector(storeWithSelection))

      render(<PersonaSelector />)
      expect(screen.getByText('Clear All')).toBeInTheDocument()
    })

    it('should not render "Clear All" button when no personas selected', () => {
      render(<PersonaSelector />)
      expect(screen.queryByText('Clear All')).not.toBeInTheDocument()
    })
  })

  describe('Dropdown behavior', () => {
    it('should open dropdown when trigger is clicked', () => {
      render(<PersonaSelector />)
      const trigger = screen.getByText('Select personas...')
      fireEvent.click(trigger)

      // Dropdown should be visible
      expect(screen.getByPlaceholderText('Search personas...')).toBeInTheDocument()
    })

    it('should close dropdown when trigger is clicked again', () => {
      render(<PersonaSelector />)
      const trigger = screen.getByText('Select personas...')

      // Open
      fireEvent.click(trigger)
      expect(screen.getByPlaceholderText('Search personas...')).toBeInTheDocument()

      // Close
      fireEvent.click(trigger)
      expect(screen.queryByPlaceholderText('Search personas...')).not.toBeInTheDocument()
    })

    it('should render all personas in dropdown', () => {
      render(<PersonaSelector />)
      fireEvent.click(screen.getByText('Select personas...'))

      // Check all 12+ personas are rendered
      VOICE_PERSONAS.forEach((persona) => {
        expect(screen.getByText(persona.name)).toBeInTheDocument()
      })
    })

    it('should group personas by category', () => {
      render(<PersonaSelector />)
      fireEvent.click(screen.getByText('Select personas...'))

      // Check category headers
      expect(screen.getByText('BUSINESS/TECH')).toBeInTheDocument()
      expect(screen.getByText('CREATIVE/HUMOR')).toBeInTheDocument()
      expect(screen.getByText('PROFESSIONAL')).toBeInTheDocument()
    })
  })

  describe('Search/Filter functionality', () => {
    it('should filter personas by search query', () => {
      render(<PersonaSelector />)
      fireEvent.click(screen.getByText('Select personas...'))

      const searchInput = screen.getByPlaceholderText('Search personas...')
      fireEvent.change(searchInput, { target: { value: 'naval' } })

      // Naval should be visible
      expect(screen.getByText('Naval Ravikant')).toBeInTheDocument()

      // Others should not be visible
      expect(screen.queryByText('Elon Musk')).not.toBeInTheDocument()
      expect(screen.queryByText('Gary Vaynerchuk')).not.toBeInTheDocument()
    })

    it('should show "No personas found" when search has no results', () => {
      render(<PersonaSelector />)
      fireEvent.click(screen.getByText('Select personas...'))

      const searchInput = screen.getByPlaceholderText('Search personas...')
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } })

      expect(screen.getByText('No personas found')).toBeInTheDocument()
    })

    it('should filter case-insensitively', () => {
      render(<PersonaSelector />)
      fireEvent.click(screen.getByText('Select personas...'))

      const searchInput = screen.getByPlaceholderText('Search personas...')
      fireEvent.change(searchInput, { target: { value: 'NAVAL' } })

      expect(screen.getByText('Naval Ravikant')).toBeInTheDocument()
    })
  })

  describe('Persona selection', () => {
    it('should call addPersona when persona is clicked', () => {
      render(<PersonaSelector />)
      fireEvent.click(screen.getByText('Select personas...'))

      const navalButton = screen.getByText('Naval Ravikant')
      fireEvent.click(navalButton)

      expect(mockStore.addPersona).toHaveBeenCalledWith('naval')
    })

    it('should show checkmark for selected personas', () => {
      const storeWithSelection = {
        ...mockStore,
        selectedPersonas: ['naval']
      }
      // @ts-expect-error - Mock implementation
      useAIStore.mockImplementation((selector) => selector(storeWithSelection))

      render(<PersonaSelector />)
      fireEvent.click(screen.getByText('1 persona selected'))

      // Find Naval's row and check for checkmark
      const navalRow = screen.getByText('Naval Ravikant').closest('button')
      expect(within(navalRow!).getByRole('img', { hidden: true })).toBeInTheDocument()
    })

    it('should disable personas when max limit (5) is reached', () => {
      const storeWithMaxSelection = {
        ...mockStore,
        selectedPersonas: ['naval', 'elon', 'garyvee', 'tim', 'scott']
      }
      // @ts-expect-error - Mock implementation
      useAIStore.mockImplementation((selector) => selector(storeWithMaxSelection))

      render(<PersonaSelector />)
      fireEvent.click(screen.getByText('5 personas selected'))

      // Unselected personas should be disabled
      const sethButton = screen.getByText('Seth Godin').closest('button')
      expect(sethButton).toHaveAttribute('disabled')
    })

    it('should show max limit notice when 5 personas selected', () => {
      const storeWithMaxSelection = {
        ...mockStore,
        selectedPersonas: ['naval', 'elon', 'garyvee', 'tim', 'scott']
      }
      // @ts-expect-error - Mock implementation
      useAIStore.mockImplementation((selector) => selector(storeWithMaxSelection))

      render(<PersonaSelector />)
      fireEvent.click(screen.getByText('5 personas selected'))

      expect(screen.getByText('Maximum 5 personas reached')).toBeInTheDocument()
    })
  })

  describe('Selected personas chips', () => {
    it('should render chips for selected personas', () => {
      const storeWithSelection = {
        ...mockStore,
        selectedPersonas: ['naval', 'garyvee']
      }
      // @ts-expect-error - Mock implementation
      useAIStore.mockImplementation((selector) => selector(storeWithSelection))

      render(<PersonaSelector />)

      expect(screen.getByText('Naval Ravikant')).toBeInTheDocument()
      expect(screen.getByText('Gary Vaynerchuk')).toBeInTheDocument()
    })

    it('should call removePersona when chip X button is clicked', () => {
      const storeWithSelection = {
        ...mockStore,
        selectedPersonas: ['naval']
      }
      // @ts-expect-error - Mock implementation
      useAIStore.mockImplementation((selector) => selector(storeWithSelection))

      render(<PersonaSelector />)

      const removeButton = screen.getByLabelText('Remove Naval Ravikant')
      fireEvent.click(removeButton)

      expect(mockStore.removePersona).toHaveBeenCalledWith('naval')
    })
  })

  describe('Clear All functionality', () => {
    it('should call clearPersonas when Clear All is clicked', () => {
      const storeWithSelection = {
        ...mockStore,
        selectedPersonas: ['naval', 'garyvee']
      }
      // @ts-expect-error - Mock implementation
      useAIStore.mockImplementation((selector) => selector(storeWithSelection))

      render(<PersonaSelector />)

      const clearButton = screen.getByText('Clear All')
      fireEvent.click(clearButton)

      expect(mockStore.clearPersonas).toHaveBeenCalled()
    })
  })

  describe('Warning for >3 personas', () => {
    it('should show warning when more than 3 personas selected', () => {
      const storeWithManyPersonas = {
        ...mockStore,
        selectedPersonas: ['naval', 'elon', 'garyvee', 'tim']
      }
      // @ts-expect-error - Mock implementation
      useAIStore.mockImplementation((selector) => selector(storeWithManyPersonas))

      render(<PersonaSelector />)

      expect(
        screen.getByText(/Selecting more than 3 personas may dilute the style/)
      ).toBeInTheDocument()
    })

    it('should not show warning when 3 or fewer personas selected', () => {
      const storeWithFewPersonas = {
        ...mockStore,
        selectedPersonas: ['naval', 'elon', 'garyvee']
      }
      // @ts-expect-error - Mock implementation
      useAIStore.mockImplementation((selector) => selector(storeWithFewPersonas))

      render(<PersonaSelector />)

      expect(
        screen.queryByText(/Selecting more than 3 personas may dilute the style/)
      ).not.toBeInTheDocument()
    })
  })

  describe('State integration', () => {
    it('should read selectedPersonas from aiStore', () => {
      render(<PersonaSelector />)
      expect(useAIStore).toHaveBeenCalled()
    })

    it('should handle empty selectedPersonas array', () => {
      render(<PersonaSelector />)
      expect(screen.getByText('Select personas...')).toBeInTheDocument()
    })

    it('should handle multiple selected personas', () => {
      const storeWithSelection = {
        ...mockStore,
        selectedPersonas: ['naval', 'elon', 'garyvee']
      }
      // @ts-expect-error - Mock implementation
      useAIStore.mockImplementation((selector) => selector(storeWithSelection))

      render(<PersonaSelector />)
      expect(screen.getByText('3 personas selected')).toBeInTheDocument()
    })
  })
})
