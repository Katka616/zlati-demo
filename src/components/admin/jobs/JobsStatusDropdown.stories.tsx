import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { useState } from 'react'
import JobsStatusDropdown from './JobsStatusDropdown'

const meta: Meta<typeof JobsStatusDropdown> = {
  title: 'Admin/Jobs/JobsStatusDropdown',
  component: JobsStatusDropdown,
  parameters: {
    docs: {
      description: {
        component:
          'Kontextový dropdown pre zmenu stavu zákazky. Zobrazuje všetky dostupné stavy zo STATUS_FILTER_LIST s farebným kódovaním z JOB_STATUS_BADGE_CONFIG. Aktuálny stav je zvýraznený s checkmarkom. Používa React.forwardRef pre kliknutie mimo.',
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof JobsStatusDropdown>

export const Default: Story = {
  name: 'Dropdown — aktuálny stav: na_mieste',
  render: () => {
    const [selectedStatus, setSelectedStatus] = useState('na_mieste')
    return (
      <div style={{ position: 'relative', height: 400, paddingTop: 16, paddingLeft: 16, fontFamily: 'Montserrat, sans-serif' }}>
        <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 8 }}>
          Vybraný stav: <strong>{selectedStatus}</strong>
        </p>
        <JobsStatusDropdown
          jobId={101}
          x={16}
          y={60}
          currentStatus={selectedStatus}
          onSelectStatus={(jobId, status) => {
            console.log('Status change:', jobId, '->', status)
            setSelectedStatus(status)
          }}
        />
      </div>
    )
  },
}

export const EarlyStage: Story = {
  name: 'Dropdown — aktuálny stav: prijem',
  render: () => (
    <div style={{ position: 'relative', height: 400, paddingTop: 16, paddingLeft: 16, fontFamily: 'Montserrat, sans-serif' }}>
      <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 8 }}>
        Stav <strong>prijem</strong> — zákazka práve prijatá od poisťovne
      </p>
      <JobsStatusDropdown
        jobId={102}
        x={16}
        y={60}
        currentStatus="prijem"
        onSelectStatus={(jobId, status) => console.log('Status change:', jobId, '->', status)}
      />
    </div>
  ),
}

export const Completed: Story = {
  name: 'Dropdown — aktuálny stav: uzavrete',
  render: () => (
    <div style={{ position: 'relative', height: 400, paddingTop: 16, paddingLeft: 16, fontFamily: 'Montserrat, sans-serif' }}>
      <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 8 }}>
        Stav <strong>uzavrete</strong> — zákazka kompletne uzavretá
      </p>
      <JobsStatusDropdown
        jobId={103}
        x={16}
        y={60}
        currentStatus="uzavrete"
        onSelectStatus={(jobId, status) => console.log('Status change:', jobId, '->', status)}
      />
    </div>
  ),
}
