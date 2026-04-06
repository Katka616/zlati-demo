import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { DictationButton } from './DictationButton'

const meta: Meta<typeof DictationButton> = {
  title: 'Protocol/DictationButton',
  component: DictationButton,
  parameters: {
    docs: {
      description: {
        component:
          'Tlačidlo mikrofónu v protokolovom formulári. Identická funkcionalita ako UI/DictationButton — zobrazí sa len ak prehliadač podporuje SpeechRecognition API.',
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof DictationButton>

export const Idle: Story = {
  name: 'Pripravený',
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

export const Czech: Story = {
  name: 'Česky',
  args: {
    language: 'cz',
    isRecording: false,
    isSupported: true,
    onToggle: () => {},
  },
}
