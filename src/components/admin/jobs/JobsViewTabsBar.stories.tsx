import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn } from '@storybook/test'
import JobsViewTabsBar from './JobsViewTabsBar'
import type { SavedView } from '@/hooks/useSavedViews'

const meta: Meta<typeof JobsViewTabsBar> = {
  title: 'Admin/Jobs/JobsViewTabsBar',
  component: JobsViewTabsBar,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Lišta uložených pohľadov (saved views) v zozname zákaziek. Umožňuje uloženie, premenovanie, mazanie a prepínanie medzi pohľadmi. Pravý klik na tab zobrazí kontextové menu.',
      },
    },
  },
  argTypes: {
    onResetView: { action: 'resetView' },
    onLoadView: { action: 'loadView' },
    onSaveView: { action: 'saveView' },
    onUpdateView: { action: 'updateView' },
    onDeleteView: { action: 'deleteView' },
    onSetIsCreatingView: { action: 'setIsCreatingView' },
    onSetNewViewName: { action: 'setNewViewName' },
    onSetViewContextMenu: { action: 'setViewContextMenu' },
    onSetRenamingViewId: { action: 'setRenamingViewId' },
    onSetRenameValue: { action: 'setRenameValue' },
    onRenameView: { action: 'renameView' },
  },
}

export default meta
type Story = StoryObj<typeof JobsViewTabsBar>

const mockSavedViews: SavedView[] = [
  {
    id: 'view-1',
    name: 'Moje zákazky',
    filters: { assigned_to: '7' },
    viewMode: 'list',
    visibleColumns: {},
    columnOrder: [],
  },
  {
    id: 'view-2',
    name: 'AXA - Dnes',
    filters: { partner_id: '1' },
    viewMode: 'list',
    visibleColumns: {},
    columnOrder: [],
  },
  {
    id: 'view-3',
    name: 'Nepridelené EA',
    filters: { partner_id: '2', status: 'dispatching' },
    viewMode: 'board',
    visibleColumns: {},
    columnOrder: [],
  },
]

const baseArgs = {
  savedViews: mockSavedViews,
  activeViewId: null,
  viewHasChanges: false,
  isCreatingView: false,
  newViewName: '',
  renamingViewId: null,
  renameValue: '',
  viewTabsRef: { current: null } as React.RefObject<HTMLDivElement>,
  viewContextMenu: null,
  viewContextMenuRef: { current: null } as React.RefObject<HTMLDivElement>,
  onResetView: fn(),
  onLoadView: fn(),
  onSaveView: fn(),
  onUpdateView: fn(),
  onDeleteView: fn(),
  onSetIsCreatingView: fn(),
  onSetNewViewName: fn(),
  onSetViewContextMenu: fn(),
  onSetRenamingViewId: fn(),
  onSetRenameValue: fn(),
  onRenameView: fn(),
}

export const Default: Story = {
  name: 'Predvolené (žiadny aktívny pohľad)',
  args: baseArgs,
}

export const ActiveView: Story = {
  name: 'Aktívny pohľad',
  args: {
    ...baseArgs,
    activeViewId: 'view-1',
    viewHasChanges: false,
  },
}

export const ActiveViewWithChanges: Story = {
  name: 'Aktívny pohľad so zmenami (zobraziť tlačidlo Uložiť zmeny)',
  args: {
    ...baseArgs,
    activeViewId: 'view-2',
    viewHasChanges: true,
  },
}

export const CreatingNewView: Story = {
  name: 'Vytváranie nového pohľadu (inline input)',
  args: {
    ...baseArgs,
    isCreatingView: true,
    newViewName: 'Môj nový pohľad',
  },
}

export const NoSavedViews: Story = {
  name: 'Žiadne uložené pohľady',
  args: {
    ...baseArgs,
    savedViews: [],
  },
}

export const WithContextMenu: Story = {
  name: 'S kontextovým menu (pravý klik na tab)',
  args: {
    ...baseArgs,
    activeViewId: 'view-1',
    viewContextMenu: { viewId: 'view-1', x: 200, y: 100 },
  },
}
