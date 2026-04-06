import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { DictationButton } from './DictationButton'

const meta: Meta<typeof DictationButton> = {
  title: 'UI/DictationButton',
  component: DictationButton,
  parameters: {
    docs: {
      description: {
        component:
          'Tlačidlo mikrofónu pre hlasové diktovanie. Zobrazí sa len ak prehliadač podporuje SpeechRecognition API. V stave nahrávania zobrazí ikonu Stop namiesto mikrofónu.',
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof DictationButton>

export const Idle: Story = {
  name: 'Pripravený (idle)',
  args: {
    language: 'sk',
    isRecording: false,
    isSupported: true,
    onToggle: () => {},
  },
}

export const Recording: Story = {
  name: 'Nahrávanie aktívne',
  args: {
    language: 'sk',
    isRecording: true,
    isSupported: true,
    onToggle: () => {},
  },
}

export const NotSupported: Story = {
  name: 'Nepodporovaný prehliadač',
  args: {
    language: 'sk',
    isRecording: false,
    isSupported: false,
    onToggle: () => {},
  },
  parameters: {
    docs: {
      description: {
        story: 'Keď SpeechRecognition nie je podporovaný, komponent nevykreslí nič (returns null).',
      },
    },
  },
}

export const CzechIdle: Story = {
  name: 'Česky — idle',
  args: {
    language: 'cz',
    isRecording: false,
    isSupported: true,
    onToggle: () => {},
  },
}
