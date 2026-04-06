import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import AssignmentHistoryPanel from './AssignmentHistoryPanel'
import type { AssignmentHistoryPanelProps } from './AssignmentHistoryPanel'

const meta: Meta<typeof AssignmentHistoryPanel> = {
  title: 'Admin/JobDetail/Sections/AssignmentHistoryPanel',
  component: AssignmentHistoryPanel,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Panel histórie technikov na zákazke. Zobrazuje sa LEN ak totalAssignments > 1. Tabuľka s kolumnami: Technik, Status, Hod/Km, Protokol, Faktúra, Náklady. Súhrnné riadky: celkové náklady, krytie poisťovne, marža. Červené varovanie ak marža pod minimom.',
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof AssignmentHistoryPanel>

const baseProps: AssignmentHistoryPanelProps = {
  jobId: 201,
  totalAssignments: 2,
  currentTechName: 'Novák Marek',
  currency: 'Kč',
  protocolHistory: [
    {
      technician_id: 5,
      clientSignature: 'data:image/png;base64,abc',
      protocolType: 'standard',
    },
  ],
  aggregateData: {
    aggregate_tech_costs: 11320,
    aggregate_prior_costs: 9500,
    aggregate_margin: 1820,
    aggregate_margin_met: true,
    aggregate_breakdown: [
      {
        assignmentId: 101,
        technicianName: 'Horváth Ján',
        technicianId: 5,
        status: 'reassigned',
        cost: 5360,
        work_data: { totalHours: 1.5, totalKm: 28, visits: [{}] },
        invoice_data: { invoice_status: 'generated' },
        invoice_uploaded_file_id: null,
      },
      {
        assignmentId: 102,
        technicianName: 'Novák Marek',
        technicianId: 10,
        status: 'active',
        cost: 5960,
        work_data: { totalHours: 2.0, totalKm: 32, visits: [{}] },
        invoice_data: null,
        invoice_uploaded_file_id: null,
      },
    ],
  },
}

export const Default: Story = {
  name: '2 technici — zákazka preradená (marža v poriadku)',
  args: baseProps,
}

export const ThreeTechnicians: Story = {
  name: '3 technici — komplexná zákazka',
  args: {
    ...baseProps,
    totalAssignments: 3,
    protocolHistory: [
      { technician_id: 5, clientSignature: 'data:image/png;base64,abc' },
      { technician_id: 11, clientSignature: undefined }, // waiting for signature
    ],
    aggregateData: {
      aggregate_tech_costs: 21480,
      aggregate_prior_costs: 18000,
      aggregate_margin: 3480,
      aggregate_margin_met: true,
      aggregate_breakdown: [
        {
          assignmentId: 101,
          technicianName: 'Horváth Ján',
          technicianId: 5,
          status: 'reassigned',
          cost: 5360,
          work_data: { totalHours: 1.5, totalKm: 28 },
          invoice_data: { invoice_status: 'paid' },
          invoice_uploaded_file_id: null,
        },
        {
          assignmentId: 102,
          technicianName: 'Blaho Rastislav',
          technicianId: 11,
          status: 'reassigned',
          cost: 7680,
          work_data: { totalHours: 2.5, totalKm: 45 },
          invoice_data: { invoice_status: 'validated' },
          invoice_uploaded_file_id: null,
        },
        {
          assignmentId: 103,
          technicianName: 'Novák Marek',
          technicianId: 10,
          status: 'active',
          cost: 8440,
          work_data: { totalHours: 3.0, totalKm: 38, visits: [{}, {}] },
          invoice_data: null,
          invoice_uploaded_file_id: null,
        },
      ],
    },
  },
}

export const MarginBelowTarget: Story = {
  name: 'Marža pod minimom (červené varovanie)',
  args: {
    ...baseProps,
    aggregateData: {
      ...baseProps.aggregateData,
      aggregate_margin: 320,
      aggregate_margin_met: false,
      aggregate_tech_costs: 18640,
      aggregate_prior_costs: 15000,
    },
  },
}

export const WithUploadedInvoice: Story = {
  name: 'Faktúra nahratá cez súbor',
  args: {
    ...baseProps,
    aggregateData: {
      ...baseProps.aggregateData,
      aggregate_breakdown: [
        {
          assignmentId: 101,
          technicianName: 'Horváth Ján',
          technicianId: 5,
          status: 'reassigned',
          cost: 5360,
          work_data: { totalHours: 1.5, totalKm: 28 },
          invoice_data: null,
          invoice_uploaded_file_id: 999,
        },
        {
          assignmentId: 102,
          technicianName: 'Novák Marek',
          technicianId: 10,
          status: 'active',
          cost: 5960,
          work_data: { totalHours: 2.0, totalKm: 32 },
          invoice_data: { invoice_status: 'in_batch' },
          invoice_uploaded_file_id: null,
        },
      ],
    },
  },
}

export const MissingProtocol: Story = {
  name: 'Protokol chýba (urgentná zmena)',
  args: {
    ...baseProps,
    protocolHistory: [],
    aggregateData: {
      ...baseProps.aggregateData,
      aggregate_breakdown: [
        {
          assignmentId: 101,
          technicianName: 'Horváth Ján',
          technicianId: 5,
          status: 'reassigned',
          cost: 5360,
          work_data: { totalHours: 1.5, totalKm: 28, protocol_pending: true },
          invoice_data: null,
          invoice_uploaded_file_id: null,
        },
        {
          assignmentId: 102,
          technicianName: 'Novák Marek',
          technicianId: 10,
          status: 'active',
          cost: 5960,
          work_data: { totalHours: 2.0, totalKm: 32 },
          invoice_data: null,
          invoice_uploaded_file_id: null,
        },
      ],
    },
  },
}
