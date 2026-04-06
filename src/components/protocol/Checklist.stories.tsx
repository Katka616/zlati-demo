import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import React, { useState } from 'react'
import Checklist from './Checklist'
import type { PhotoItem } from '@/types/protocol'

const meta: Meta = {
  title: 'Protocol/Checklist',
  parameters: {
    docs: {
      description: {
        component:
          'Kontrolný zoznam krokov protokolu. Prvé 4 položky (fotky) a posledná (podpis) sa označujú automaticky podľa stavu. Položka "Protokol kompletný" je manuálna — kliknutím ju technik označí.',
      },
    },
  },
}

export default meta
type Story = StoryObj

function ChecklistDemo({ photos, hasSignature }: { photos: PhotoItem[]; hasSignature: boolean }) {
  const [checklist, setChecklist] = useState([false, false, false, false, false, false])
  const handleToggle = (index: number) => {
    setChecklist(prev => {
      const next = [...prev]
      next[index] = !next[index]
      return next
    })
  }
  return (
    <div style={{ padding: 24, maxWidth: 400 }}>
      <Checklist
        language="sk"
        checklist={checklist}
        photos={photos}
        hasSignature={hasSignature}
        onToggle={handleToggle}
      />
    </div>
  )
}

const mockPhotos: PhotoItem[] = [
  { index: 0, data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', label: 'Pred opravou', category: 'client' },
  { index: 1, data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', label: 'Počas opravy', category: 'client' },
]

export const Empty: Story = {
  name: 'Prázdny — žiadne fotky, žiadny podpis',
  render: () => <ChecklistDemo photos={[]} hasSignature={false} />,
}

export const WithPhotos: Story = {
  name: 'S dvomi fotkami',
  render: () => <ChecklistDemo photos={mockPhotos} hasSignature={false} />,
}

export const WithSignature: Story = {
  name: 'S fotkami aj podpisom',
  render: () => <ChecklistDemo photos={mockPhotos} hasSignature={true} />,
}

export const Czech: Story = {
  name: 'Česky',
  render: () => {
    const [checklist, setChecklist] = useState([false, false, false, false, false, false])
    return (
      <div style={{ padding: 24, maxWidth: 400 }}>
        <Checklist
          language="cz"
          checklist={checklist}
          photos={mockPhotos}
          hasSignature={true}
          onToggle={(i) => setChecklist(prev => { const n = [...prev]; n[i] = !n[i]; return n })}
        />
      </div>
    )
  },
}
