import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn } from '@storybook/test'
import { useRef } from 'react'
import JobsToolbar from './JobsToolbar'

const meta: Meta<typeof JobsToolbar> = {
  title: 'Admin/Jobs/JobsToolbar',
  component: JobsToolbar,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Horná lišta zoznamu zákaziek. Obsahuje vyhľadávanie (s klavesovou skratkou /), prepínač pohľadu Tabuľka/Kanban, tlačidlo Nová zákazka a Live badge s časom poslednej obnovy.',
      },
    },
  },
  argTypes: {
    viewMode: {
      control: { type: 'radio' },
      options: ['list', 'board'],
    },
    onSearchChange: { action: 'searchChanged' },
    onSetViewMode: { action: 'viewModeChanged' },
    onNewJob: { action: 'newJobClicked' },
  },
}

export default meta
type Story = StoryObj<typeof JobsToolbar>

const baseArgs = {
  searchQuery: '',
  searchInputRef: { current: null } as React.RefObject<HTMLInputElement>,
  viewMode: 'list' as const,
  lastRefreshed: new Date('2026-03-21T10:30:00'),
  pollIntervalMs: 30000,
  onSearchChange: fn(),
  onSetViewMode: fn(),
  onNewJob: fn(),
}

export const Default: Story = {
  name: 'Predvolené (zobrazenie tabuľky)',
  args: baseArgs,
}

export const BoardView: Story = {
  name: 'Kanban pohľad aktívny',
  args: {
    ...baseArgs,
    viewMode: 'board',
  },
}

export const WithSearchQuery: Story = {
  name: 'S aktívnym vyhľadávaním',
  args: {
    ...baseArgs,
    searchQuery: 'Nováková Praha',
  },
}
