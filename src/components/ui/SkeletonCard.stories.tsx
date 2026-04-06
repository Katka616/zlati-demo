'use client'

import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import React from 'react'
import { SkeletonCard, SkeletonList } from './SkeletonCard'

// ── Meta ───────────────────────────────────────────────────────────────────

const meta: Meta<typeof SkeletonCard> = {
  title: 'UI/SkeletonCard',
  component: SkeletonCard,
  parameters: {
    docs: {
      description: {
        component:
          'Shimmer skeleton pre loading stavy. Tri varianty: `job-card`, `notification`, `technician`. `SkeletonList` renderuje N kariet naraz.',
      },
    },
  },
}

export default meta

type Story = StoryObj<typeof SkeletonCard>

// ── Single variants ────────────────────────────────────────────────────────

export const JobCard: Story = {
  name: 'Variant: job-card',
  args: { variant: 'job-card' },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 420, padding: 16 }}>
        <Story />
      </div>
    ),
  ],
}

export const Notification: Story = {
  name: 'Variant: notification',
  args: { variant: 'notification' },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 420, padding: 16 }}>
        <Story />
      </div>
    ),
  ],
}

export const Technician: Story = {
  name: 'Variant: technician',
  args: { variant: 'technician' },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 420, padding: 16 }}>
        <Story />
      </div>
    ),
  ],
}

// ── All three side by side ─────────────────────────────────────────────────

export const VsetkyVarianty: StoryObj = {
  name: 'Všetky varianty vedľa seba',
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: 24, maxWidth: 480 }}>
      <div>
        <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary, #6B7280)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
          job-card
        </p>
        <SkeletonCard variant="job-card" />
      </div>
      <div>
        <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary, #6B7280)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
          notification
        </p>
        <SkeletonCard variant="notification" />
      </div>
      <div>
        <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary, #6B7280)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
          technician
        </p>
        <SkeletonCard variant="technician" />
      </div>
    </div>
  ),
}

// ── SkeletonList ──────────────────────────────────────────────────────────

export const ZoznamZakaziek: StoryObj = {
  name: 'SkeletonList — zákazky (5 kariet)',
  render: () => (
    <div style={{ maxWidth: 480, padding: 24 }}>
      <SkeletonList count={5} variant="job-card" gap={12} />
    </div>
  ),
}

export const ZoznamTechnikov: StoryObj = {
  name: 'SkeletonList — technici (4 karty)',
  render: () => (
    <div style={{ maxWidth: 480, padding: 24 }}>
      <SkeletonList count={4} variant="technician" gap={10} />
    </div>
  ),
}

export const ZoznamNotifikacii: StoryObj = {
  name: 'SkeletonList — notifikácie (3 karty)',
  render: () => (
    <div style={{ maxWidth: 480, padding: 24 }}>
      <SkeletonList count={3} variant="notification" gap={8} />
    </div>
  ),
}
