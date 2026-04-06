'use client'

import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import React, { useState } from 'react'
import PhotoUpload from './PhotoUpload'
import type { PhotoItem } from '@/types/protocol'

const meta: Meta = {
  title: 'Protocol/PhotoUpload',
  parameters: {
    docs: {
      description: {
        component:
          'Komponent pre nahrávanie fotiek v protokole. Dve sekcie: fotky klienta (pred/počas/po) a fotky technika. Max 10 fotiek spolu, max 5 na sekciu. Kliknutie na slot otvorí výber súboru alebo kameru.',
      },
    },
  },
}

export default meta
type Story = StoryObj

// 1×1 pixel transparent PNG for demo
const DEMO_PHOTO = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

function PhotoUploadDemo({ initialPhotos }: { initialPhotos?: PhotoItem[] }) {
  const [photos, setPhotos] = useState<PhotoItem[]>(initialPhotos || [])

  const handleAdd = (photo: PhotoItem) => {
    setPhotos(prev => [...prev.filter(p => p.index !== photo.index), photo])
  }
  const handleRemove = (index: number) => {
    setPhotos(prev => prev.filter(p => p.index !== index))
  }

  return (
    <div style={{ padding: 24, maxWidth: 480 }}>
      <PhotoUpload
        language="sk"
        photos={photos}
        onPhotoAdd={handleAdd}
        onPhotoRemove={handleRemove}
      />
    </div>
  )
}

export const Empty: Story = {
  name: 'Prázdny — žiadne fotky',
  render: () => <PhotoUploadDemo />,
}

export const WithClientPhotos: Story = {
  name: 'S klientskymi fotkami',
  render: () => (
    <PhotoUploadDemo
      initialPhotos={[
        { index: 0, data: DEMO_PHOTO, label: 'Pred opravou', category: 'client' },
        { index: 1, data: DEMO_PHOTO, label: 'Počas opravy', category: 'client' },
      ]}
    />
  ),
}

export const WithMixedPhotos: Story = {
  name: 'Klientske aj technické fotky',
  render: () => (
    <PhotoUploadDemo
      initialPhotos={[
        { index: 0, data: DEMO_PHOTO, label: 'Pred opravou', category: 'client' },
        { index: 2, data: DEMO_PHOTO, label: 'Po oprave', category: 'client' },
        { index: 100, data: DEMO_PHOTO, label: 'Foto technik 1', category: 'technician' },
      ]}
    />
  ),
}
