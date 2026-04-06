import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { useState } from 'react'
import JobsExportModal from './JobsExportModal'

const meta: Meta<typeof JobsExportModal> = {
  title: 'Admin/Jobs/JobsExportModal',
  component: JobsExportModal,
  parameters: {
    docs: {
      description: {
        component:
          'Modálne okno pre export zákaziek do CSV. Tri typy exportu: viditeľné stĺpce, všetky polia alebo cashflow export pre účtovníctvo. Backdrop + centrovaný modal, natívne radio buttons.',
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof JobsExportModal>

export const Default: Story = {
  name: 'Výber typu exportu — viditeľné stĺpce',
  render: () => {
    const [exportType, setExportType] = useState<'visible' | 'all' | 'cashflow'>('visible')
    return (
      <div style={{ position: 'relative', height: 400 }}>
        <JobsExportModal
          exportType={exportType}
          onExportTypeChange={setExportType}
          onClose={() => console.log('Close modal')}
          onExport={() => console.log('Export type:', exportType)}
        />
      </div>
    )
  },
}

export const CashflowSelected: Story = {
  name: 'Vybraný cashflow export',
  render: () => {
    const [exportType, setExportType] = useState<'visible' | 'all' | 'cashflow'>('cashflow')
    return (
      <div style={{ position: 'relative', height: 400 }}>
        <JobsExportModal
          exportType={exportType}
          onExportTypeChange={setExportType}
          onClose={() => console.log('Close modal')}
          onExport={() => console.log('Export type:', exportType)}
        />
      </div>
    )
  },
}
