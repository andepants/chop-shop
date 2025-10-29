/**
 * PersonaSelector Component
 *
 * Multi-select dropdown for selecting voice personas to influence content generation style.
 * Displays personas grouped by category with search/filter functionality.
 * Selected personas shown as removable badge chips.
 */

import { useState, useMemo } from 'react'
import { Check, X, Search, AlertCircle } from 'lucide-react'
import { useAIStore } from '../../store/aiStore'
import {
  VOICE_PERSONAS,
  CATEGORY_LABELS,
  type PersonaCategory,
  getPersonaById
} from '@shared/constants/personas.constants'
import { Badge } from '../ui/badge'

/**
 * PersonaSelector Component
 * Renders multi-select dropdown for voice persona selection
 */
export function PersonaSelector() {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const selectedPersonas = useAIStore((state) => state.selectedPersonas)
  const addPersona = useAIStore((state) => state.addPersona)
  const removePersona = useAIStore((state) => state.removePersona)
  const clearPersonas = useAIStore((state) => state.clearPersonas)

  // Filter personas by search query
  const filteredPersonas = useMemo(() => {
    if (!searchQuery.trim()) return VOICE_PERSONAS

    const query = searchQuery.toLowerCase()
    return VOICE_PERSONAS.filter((p) => p.name.toLowerCase().includes(query))
  }, [searchQuery])

  // Group personas by category
  const groupedPersonas = useMemo(() => {
    const grouped: Record<PersonaCategory, typeof VOICE_PERSONAS> = {
      business: [],
      creative: [],
      professional: []
    }

    filteredPersonas.forEach((persona) => {
      grouped[persona.category].push(persona)
    })

    return grouped
  }, [filteredPersonas])

  // Handle persona selection toggle
  const togglePersona = (id: string) => {
    if (selectedPersonas.includes(id)) {
      removePersona(id)
    } else {
      addPersona(id)
    }
  }

  // Show warning if > 3 personas selected
  const showWarning = selectedPersonas.length > 3

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-zinc-300">Voice Personas (optional)</label>
        {selectedPersonas.length > 0 && (
          <button
            onClick={clearPersonas}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Dropdown Trigger */}
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-sm text-zinc-300 hover:border-zinc-600 transition-colors text-left flex items-center justify-between"
        >
          <span className="text-zinc-500">
            {selectedPersonas.length === 0
              ? 'Select personas...'
              : `${selectedPersonas.length} persona${selectedPersonas.length > 1 ? 's' : ''} selected`}
          </span>
          <span className="text-zinc-500">{isOpen ? '▲' : '▼'}</span>
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute z-50 w-full mt-2 bg-zinc-900 border border-zinc-700 rounded-md shadow-lg max-h-96 overflow-hidden flex flex-col">
            {/* Search Input */}
            <div className="p-2 border-b border-zinc-800">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search personas..."
                  className="w-full pl-8 pr-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-sm text-zinc-300 placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
                />
              </div>
            </div>

            {/* Personas List */}
            <div className="overflow-y-auto">
              {filteredPersonas.length === 0 ? (
                <div className="p-4 text-center text-sm text-zinc-500">No personas found</div>
              ) : (
                Object.entries(groupedPersonas).map(([category, personas]) => {
                  if (personas.length === 0) return null

                  return (
                    <div key={category} className="py-2">
                      {/* Category Header */}
                      <div className="px-3 py-1 text-xs font-semibold text-zinc-500 uppercase">
                        {CATEGORY_LABELS[category as PersonaCategory]}
                      </div>

                      {/* Personas in Category */}
                      {personas.map((persona) => {
                        const isSelected = selectedPersonas.includes(persona.id)
                        const isDisabled = !isSelected && selectedPersonas.length >= 5

                        return (
                          <button
                            key={persona.id}
                            onClick={() => !isDisabled && togglePersona(persona.id)}
                            disabled={isDisabled}
                            title={persona.description}
                            className={`w-full px-3 py-2 flex items-center justify-between hover:bg-zinc-800 transition-colors ${
                              isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                            }`}
                          >
                            <span className="text-sm text-zinc-300">{persona.name}</span>
                            {isSelected && <Check className="w-4 h-4 text-green-500" />}
                          </button>
                        )
                      })}
                    </div>
                  )
                })
              )}
            </div>

            {/* Max Limit Notice */}
            {selectedPersonas.length >= 5 && (
              <div className="p-2 border-t border-zinc-800 bg-zinc-950">
                <div className="flex items-center gap-2 text-xs text-amber-500">
                  <AlertCircle className="w-3 h-3" />
                  <span>Maximum 5 personas reached</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Selected Personas Chips */}
      {selectedPersonas.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedPersonas.map((id) => {
            const persona = getPersonaById(id)
            if (!persona) return null

            return (
              <Badge key={id} variant="secondary" className="flex items-center gap-1 pl-2 pr-1">
                <span className="text-xs">{persona.name}</span>
                <button
                  onClick={() => removePersona(id)}
                  className="ml-1 hover:bg-zinc-700 rounded-full p-0.5 transition-colors"
                  aria-label={`Remove ${persona.name}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )
          })}
        </div>
      )}

      {/* Warning for > 3 personas */}
      {showWarning && (
        <div className="flex items-start gap-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded-md">
          <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-amber-500">
            Selecting more than 3 personas may dilute the style. Consider using fewer for clearer
            tone.
          </p>
        </div>
      )}
    </div>
  )
}
