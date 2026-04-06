import type { Meta, StoryObj } from '@storybook/react'
import AddressAutocomplete, { type AddressSuggestion } from './AddressAutocomplete'
import { useState } from 'react'

const meta = {
  title: 'UI/AddressAutocomplete',
  component: AddressAutocomplete,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Address autocomplete input with bilingual support (SK/CZ) and real-time API suggestions. ' +
          'Fetches from /api/address/suggest with country filtering. Supports keyboard navigation (arrow keys, enter, escape) ' +
          'and debounced search to minimize API calls.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof AddressAutocomplete>

export default meta
type Story = StoryObj<typeof meta>

// Wrapper component to manage state for interactive stories
function AddressAutocompleteWrapper(props: Omit<React.ComponentProps<typeof AddressAutocomplete>, 'onSelect'>) {
  const [selected, setSelected] = useState<AddressSuggestion | null>(null)

  return (
    <div style={{ width: 400 }}>
      <AddressAutocomplete
        {...props}
        onSelect={(suggestion) => {
          setSelected(suggestion)
          props.onSelect?.(suggestion)
        }}
      />
      {selected && (
        <div
          style={{
            marginTop: 16,
            padding: 12,
            background: 'var(--g1)',
            border: '1px solid var(--g3)',
            borderRadius: 8,
            fontSize: 13,
            color: 'var(--dark)',
          }}
        >
          <strong>Selected:</strong>
          <div style={{ marginTop: 8 }}>
            {selected.street && <div>Street: {selected.street}</div>}
            <div>City: {selected.city}</div>
            <div>PSC: {selected.psc}</div>
            <div>Country: {selected.country}</div>
            <div style={{ marginTop: 4, fontSize: 12, color: 'var(--g5)' }}>
              Coordinates: {selected.lat.toFixed(4)}, {selected.lng.toFixed(4)}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Basic usage with SK language and Slovakia as default country.
 * Type at least 3 characters to see suggestions (debounced 400ms).
 */
export const BasicSlovakia: Story = {
  render: (props) => (
    <AddressAutocompleteWrapper
      {...props}
      country="SK"
      lang="sk"
      placeholder="Hľadať adresu (SK + CZ)..."
      onSelect={() => {}}
    />
  ),
  parameters: {
    docs: {
      description: {
        story: 'Slovak language variant with Slovakia as the primary search region.',
      },
    },
  },
}

/**
 * Czech language variant with Czechia as default country.
 */
export const BasicCzechia: Story = {
  render: (props) => (
    <AddressAutocompleteWrapper
      {...props}
      country="CZ"
      lang="cz"
      placeholder="Hledat adresu (SK + CZ)..."
      onSelect={() => {}}
    />
  ),
  parameters: {
    docs: {
      description: {
        story: 'Czech language variant with Czechia as the primary search region.',
      },
    },
  },
}

/**
 * Pre-populated with initial value.
 * Useful when editing existing data or pre-filling from another source.
 */
export const WithInitialValue: Story = {
  render: (props) => (
    <AddressAutocompleteWrapper
      {...props}
      country="SK"
      lang="sk"
      initialValue="Bratislava, Bratislavský kraj"
      onSelect={() => {}}
    />
  ),
  parameters: {
    docs: {
      description: {
        story: 'Pre-populated with an initial address value. Useful in edit forms or when continuing a previously started job creation.',
      },
    },
  },
}

/**
 * Custom placeholder text.
 */
export const CustomPlaceholder: Story = {
  render: (props) => (
    <AddressAutocompleteWrapper
      {...props}
      country="SK"
      lang="sk"
      placeholder="Zadajte adresu poistnej udalosti..."
      onSelect={() => {}}
    />
  ),
  parameters: {
    docs: {
      description: {
        story: 'Custom placeholder for context-specific usage (e.g., insurance event address).',
      },
    },
  },
}

/**
 * States and interactions:
 * - Click in the input to focus
 * - Type at least 3 characters (e.g., "Brat", "Praha")
 * - Wait 400ms for debounced API call
 * - Arrow Up/Down to navigate suggestions
 * - Enter to select
 * - Escape to close dropdown
 * - Click × button to clear input
 * - Click outside to close dropdown
 *
 * **Note:** In this story environment, the /api/address/suggest endpoint
 * will return 404 unless mocked. In a real app, mock the fetch or use MSW
 * to provide test suggestions.
 */
export const InteractiveDemo: Story = {
  render: (props) => (
    <AddressAutocompleteWrapper
      {...props}
      country="SK"
      lang="sk"
      onSelect={() => {}}
    />
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Interactive demo with all features: debounced search, keyboard navigation, loading state, and selection. ' +
          'Try typing an address to see the component in action.',
      },
    },
  },
}

/**
 * Mobile layout at 375px width (iPhone SE) to ensure touch-friendly dimensions.
 */
export const MobileLayout: Story = {
  render: (props) => (
    <div style={{ width: 375 }}>
      <AddressAutocompleteWrapper
        {...props}
        country="SK"
        lang="sk"
        onSelect={() => {}}
      />
    </div>
  ),
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
    docs: {
      description: {
        story: 'Responsive layout at mobile width (375px). Dropdown and suggestions adapt to narrow viewport.',
      },
    },
  },
}

/**
 * Dark theme variant using [data-theme="dark"] attribute.
 * Component uses CSS custom properties (var(--g1), var(--dark), var(--gold)) which adapt to theme.
 */
export const DarkMode: Story = {
  render: (props) => (
    <div style={{ background: '#1a1a1a', padding: 20, borderRadius: 8 }}>
      <div style={{ width: 400 }} data-theme="dark">
        <AddressAutocompleteWrapper
          {...props}
          country="SK"
          lang="sk"
          onSelect={() => {}}
        />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Dark mode with CSS custom properties automatically adapting. Component maintains readability with appropriate contrast.',
      },
    },
  },
}

/**
 * Behavior documentation:
 *
 * **API Integration:**
 * - Calls `GET /api/address/suggest?q={query}&country={country}`
 * - Debounce: 400ms (configurable in component via debounceRef)
 * - Minimum query length: 3 characters
 * - Returns: `{ suggestions: AddressSuggestion[] }`
 *
 * **Keyboard Navigation:**
 * - ArrowDown/ArrowUp: Cycle through suggestions
 * - Enter: Select highlighted suggestion
 * - Escape: Close dropdown
 *
 * **State Management:**
 * - `query`: Current input value
 * - `suggestions`: Array of matching addresses
 * - `isOpen`: Whether dropdown is visible
 * - `isLoading`: Whether API call is in progress
 * - `selectedIndex`: Currently highlighted suggestion (-1 = none)
 *
 * **Accessibility:**
 * - Search icon provides visual hint
 * - Country flag emoji helps identify region
 * - Postal code (PSC) and coordinates for disambiguation
 * - Hint text guides users on syntax
 *
 * **Country Support:**
 * - SK: Slovakia (🇸🇰)
 * - CZ: Czechia (🇨🇿)
 * - Searches both countries regardless of default
 */
export const APIDocumentation: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Complete API and interaction documentation. See parameters panel for detailed behavior specifications.',
      },
    },
    previewTabs: {
      canvas: { hidden: true },
    },
  },
  render: () => (
    <div style={{ padding: 20, background: 'var(--g1)', borderRadius: 8 }}>
      <h3>AddressAutocomplete Component Guide</h3>
      <p style={{ color: 'var(--dark)', lineHeight: 1.6 }}>
        This component provides real-time address autocomplete for job creation and editing workflows.
        <br />
        <br />
        <strong>Props:</strong>
        <ul style={{ marginTop: 8 }}>
          <li>country: 'SK' | 'CZ' — Primary search region</li>
          <li>onSelect: (suggestion: AddressSuggestion) =&gt; void — Selection callback</li>
          <li>placeholder?: string — Custom input placeholder</li>
          <li>initialValue?: string — Pre-populated address</li>
          <li>lang?: 'sk' | 'cz' — UI language and hint text</li>
        </ul>
        <br />
        <strong>AddressSuggestion Interface:</strong>
        <ul style={{ marginTop: 8 }}>
          <li>street: string</li>
          <li>city: string</li>
          <li>psc: string — Postal code</li>
          <li>country: string — 'SK' or 'CZ'</li>
          <li>lat: number — Latitude</li>
          <li>lng: number — Longitude</li>
          <li>displayName: string — Formatted address string</li>
        </ul>
      </p>
    </div>
  ),
}
