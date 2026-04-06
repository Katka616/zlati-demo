import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn } from 'storybook/test'
import React from 'react'

/**
 * BottomTabBar has three external deps that need isolation in Storybook:
 *   1. next/navigation (usePathname) — handled by @storybook/nextjs-vite automatically
 *   2. @/components/ui/ThemeProvider (useTheme) — see moduleNameMapper in .storybook/main.ts
 *      or use the mock below via Storybook's module mock
 *   3. @/lib/i18n (getTranslation) — pure function, no mock needed
 *
 * Because ThemeProvider context is not available in isolation we render a lightweight
 * wrapper that provides the same shape the component expects.
 */

// Inline wrapper that provides a stable theme context for Storybook
import BottomTabBar from './BottomTabBar'

const meta = {
  title: 'Dispatch/BottomTabBar',
  component: BottomTabBar,
  parameters: {
    layout: 'fullscreen',
    nextjs: {
      navigation: { pathname: '/dispatch' },
    },
    docs: {
      description: {
        component: [
          'Six-tab bottom navigation bar for the technician mobile PWA.',
          '',
          '**Active tab** is derived from `usePathname()` — use the `nextjs.navigation.pathname`',
          'story parameter to simulate a different active tab.',
          '',
          'The **Chat tab** can open a popup (`onChatClick`) instead of navigating.',
          '',
          'Badge counts are shown as small numeric indicators on the icon.',
          'When `hasActiveJob` is true, the home icon switches to a ⚡ bolt and the label',
          'changes to "Aktívna zákazka".',
          '',
          '> Note: `useTheme` is provided by ThemeProvider in the real app.',
          '> In Storybook the theme is controlled via the toolbar toggle (☀️/🌑) in preview.ts.',
        ].join('\n'),
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    lang: {
      control: 'radio',
      options: ['sk', 'cz'],
      description: 'Language for tab labels',
    },
    activeJobCount: {
      control: { type: 'number', min: 0, max: 9 },
      description: 'Badge on Home tab. When > 0, icon switches to bolt.',
    },
    marketplaceCount: {
      control: { type: 'number', min: 0, max: 99 },
      description: 'Badge on Marketplace tab (new available jobs)',
    },
    unreadMessages: {
      control: { type: 'number', min: 0, max: 99 },
      description: 'Badge on Chat tab (unread messages)',
    },
    hasActiveJob: {
      control: 'boolean',
      description: 'Switches Home icon to bolt and label to "Aktívna zákazka"',
    },
    onChatClick: { action: 'chatClicked' },
  },
  args: {
    lang: 'sk',
    activeJobCount: 0,
    marketplaceCount: 0,
    unreadMessages: 0,
    hasActiveJob: false,
    onChatClick: fn(),
  },
  decorators: [
    (Story) => (
      <div
        style={{
          position: 'relative',
          height: 140,
          background: 'var(--bg-primary)',
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
          <Story />
        </div>
      </div>
    ),
  ],
} satisfies Meta<typeof BottomTabBar>

export default meta
type Story = StoryObj<typeof meta>

export const HomeTab: Story = {
  name: 'Domov (aktívny tab)',
  parameters: { nextjs: { navigation: { pathname: '/dispatch' } } },
  args: { lang: 'sk' },
}

export const MarketplaceTab: Story = {
  name: 'Marketplace (aktívny tab)',
  parameters: { nextjs: { navigation: { pathname: '/dispatch/marketplace' } } },
  args: { lang: 'sk', marketplaceCount: 3 },
}

export const WithBadges: Story = {
  name: 'S odznakmi — zákazky + správy',
  parameters: { nextjs: { navigation: { pathname: '/dispatch' } } },
  args: {
    lang: 'sk',
    activeJobCount: 1,
    marketplaceCount: 5,
    unreadMessages: 2,
    hasActiveJob: true,
  },
}

export const CzechLabels: Story = {
  name: 'Český jazyk (lang: cz)',
  parameters: { nextjs: { navigation: { pathname: '/dispatch' } } },
  args: { lang: 'cz' },
}

export const CalendarTab: Story = {
  name: 'Kalendár (aktívny tab)',
  parameters: { nextjs: { navigation: { pathname: '/dispatch/calendar' } } },
  args: { lang: 'sk' },
}

export const ChatTab: Story = {
  name: 'Chat tab — otvára popup, 4 neprečítané',
  parameters: { nextjs: { navigation: { pathname: '/dispatch/chat' } } },
  args: { lang: 'sk', unreadMessages: 4, onChatClick: fn() },
}

export const SettingsTab: Story = {
  name: 'Nastavenia (aktívny tab)',
  parameters: { nextjs: { navigation: { pathname: '/dispatch/settings' } } },
  args: { lang: 'sk' },
}
