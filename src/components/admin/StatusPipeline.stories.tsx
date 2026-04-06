import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import StatusPipeline from './StatusPipeline'

const meta: Meta<typeof StatusPipeline> = {
  title: 'Admin/StatusPipeline',
  component: StatusPipeline,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Horizontálny stepper s 13 CRM krokmi zákazky. Zvýrazňuje aktuálny krok, dokončené kroky (✓) a preskočené kroky (napr. ea_odhlaska pre non-EA partnerov). Kliknutie na krok volá onStepClick callback.',
      },
    },
  },
  argTypes: {
    currentStep: { control: { type: 'range', min: 0, max: 12 } },
    onStepClick: { action: 'stepClicked' },
  },
}

export default meta
type Story = StoryObj<typeof StatusPipeline>

export const EarlyStage: Story = {
  name: 'Príjem (krok 0)',
  args: {
    currentStep: 0,
    onStepClick: (idx) => console.log('Step clicked:', idx),
  },
}

export const Dispatching: Story = {
  name: 'Dispatching (krok 1)',
  args: {
    currentStep: 1,
    onStepClick: (idx) => console.log('Step clicked:', idx),
  },
}

export const MidPipeline: Story = {
  name: 'Na mieste (krok 3)',
  args: {
    currentStep: 3,
    onStepClick: (idx) => console.log('Step clicked:', idx),
    subStatuses: [
      { label: 'Fáza technika', value: 'Diagnostika', color: '#8B5CF6' },
      { label: 'Platba', value: 'Čaká na schválenie', color: '#D97706' },
    ],
  },
}

export const Dokoncene: Story = {
  name: 'Dokončené (krok 6)',
  args: {
    currentStep: 6,
    onStepClick: (idx) => console.log('Step clicked:', idx),
    subStatuses: [
      { label: 'Protokol', value: 'Odoslaný', color: '#16A34A' },
      { label: 'Fakturácia', value: 'Čaká', color: '#D97706' },
    ],
  },
}

export const WithSkippedStep: Story = {
  name: 'Preskočené EA (krok 9)',
  args: {
    currentStep: 8,
    onStepClick: (idx) => console.log('Step clicked:', idx),
    skippedSteps: [9],
  },
}

export const NearComplete: Story = {
  name: 'Fakturácia (krok 10)',
  args: {
    currentStep: 10,
    onStepClick: (idx) => console.log('Step clicked:', idx),
  },
}

export const Completed: Story = {
  name: 'Uzavreté (krok 12)',
  args: {
    currentStep: 12,
    onStepClick: (idx) => console.log('Step clicked:', idx),
  },
}
