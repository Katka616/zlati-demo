import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn } from 'storybook/test'
import InlineEditField from './InlineEditField'

const meta = {
  title: 'Admin/JobDetail/InlineEditField',
  component: InlineEditField,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Inline click-to-edit field používaný v detaile zákazky. 4 vizuálne stavy: Normal (zobrazí text + skrytá ceruzka), Hover (zlaté zvýraznenie), Editing (input so zlatým okrajom + Save/Cancel), Saved (zelený flash). Klávesnica: Enter = uložiť, Escape = zrušiť.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    fieldType: {
      control: 'select',
      options: ['text', 'number', 'email', 'phone', 'date', 'select', 'textarea'],
    },
    readOnly: { control: 'boolean' },
  },
  args: {
    fieldName: 'description',
    fieldType: 'text',
    onSave: fn().mockResolvedValue({ success: true }),
    readOnly: false,
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 480, padding: 24, background: 'var(--w, #fff)' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof InlineEditField>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  name: 'Text — s hodnotou',
  args: {
    value: 'Oprava vodovodného kohútika v kuchyni',
    fieldName: 'description',
    fieldType: 'text',
    label: 'Popis zákazky',
  },
}

export const Empty: Story = {
  name: 'Text — prázdna hodnota',
  args: {
    value: null,
    fieldName: 'description',
    fieldType: 'text',
    placeholder: 'Zadajte popis...',
    label: 'Popis zákazky',
  },
}

export const TextArea: Story = {
  name: 'Textarea',
  args: {
    value: 'Zákazník hlási únik vody pod umývadlom. Predpokladaná príčina: uvoľnená armatúra.',
    fieldName: 'notes',
    fieldType: 'textarea',
    label: 'Interná poznámka',
  },
}

export const SelectField: Story = {
  name: 'Select — výber zo zoznamu',
  args: {
    value: 'normal',
    fieldName: 'urgency',
    fieldType: 'select',
    label: 'Urgentnosť',
    options: [
      { value: 'normal', label: 'Normálna' },
      { value: 'urgent', label: 'Urgentná' },
      { value: 'acute', label: 'Akútna' },
    ],
  },
}

export const EmailField: Story = {
  name: 'Email',
  args: {
    value: 'jan.novak@example.cz',
    fieldName: 'customer_email',
    fieldType: 'email',
    label: 'Email zákazníka',
  },
}

export const PhoneField: Story = {
  name: 'Telefón',
  args: {
    value: '+420 602 123 456',
    fieldName: 'customer_phone',
    fieldType: 'phone',
    label: 'Telefón zákazníka',
  },
}

export const DateField: Story = {
  name: 'Dátum',
  args: {
    value: '2026-03-20',
    fieldName: 'scheduled_date',
    fieldType: 'date',
    label: 'Plánovaný dátum',
  },
}

export const ReadOnly: Story = {
  name: 'ReadOnly — bez úpravy',
  args: {
    value: 'ZR-2026-CZ-001234',
    fieldName: 'reference_number',
    fieldType: 'text',
    label: 'Číslo zákazky',
    readOnly: true,
  },
}

export const WithValidation: Story = {
  name: 'S validáciou (min. 3 znaky)',
  args: {
    value: 'Praha',
    fieldName: 'customer_city',
    fieldType: 'text',
    label: 'Mesto',
    validate: (v) => (String(v).length < 3 ? 'Minimálne 3 znaky' : null),
  },
}
