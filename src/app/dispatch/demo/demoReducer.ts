import type { DispatchJob, TechActionType } from '@/types/dispatch'
import { DEMO_JOBS } from './demoData'

// ── Types ────────────────────────────────────────────────────────────

export type DemoScreen = 'welcome' | 'dashboard' | 'job-detail'

export interface DemoState {
  screen: DemoScreen
  activeJobId: string | null
  jobs: Record<string, DispatchJob>
}

export type DemoAction =
  | { type: 'START_DEMO' }
  | { type: 'SELECT_JOB'; jobId: string }
  | { type: 'BACK_TO_DASHBOARD' }
  | { type: 'STEP_ACTION'; jobId: string; action: TechActionType }
  | { type: 'ACCEPT_JOB'; jobId: string }
  | { type: 'SUBMIT_ESTIMATE'; jobId: string }
  | { type: 'AUTO_APPROVE_ESTIMATE'; jobId: string }
  | { type: 'PHOTOS_DONE'; jobId: string }
  | { type: 'PROTOCOL_DONE'; jobId: string }
  | { type: 'SETTLEMENT_DONE'; jobId: string }

// ── Transition table ─────────────────────────────────────────────────
// Key: `${crmStep}:${techPhase}:${action}` → new state

interface PhaseTransition {
  crmStep: number
  techPhase: string
  status?: string
}

const TRANSITIONS: Record<string, PhaseTransition> = {
  // Step 1: dispatching — přijmout z marketplace
  '1:undefined:accept_job':           { crmStep: 2, techPhase: 'offer_accepted', status: 'naplanovane' },

  // Step 2: naplanovane — vyrazit na cestu
  '2:offer_accepted:en_route':      { crmStep: 2, techPhase: 'en_route', status: 'naplanovane' },
  '2:en_route:arrived':             { crmStep: 3, techPhase: 'arrived', status: 'na_mieste' },

  // Step 3: na_mieste — diagnostika
  '3:arrived:start_diagnostics':    { crmStep: 3, techPhase: 'diagnostics', status: 'na_mieste' },
  '3:arrived:open_photos':          { crmStep: 3, techPhase: 'diagnostics', status: 'na_mieste' },
  '3:diagnostics:submit_estimate':  { crmStep: 3, techPhase: 'estimate_submitted', status: 'na_mieste' },

  // Step 4: schvalovanie ceny — auto-approved in demo
  '4:estimate_submitted:auto':      { crmStep: 4, techPhase: 'estimate_approved', status: 'schvalovanie_ceny' },
  '4:estimate_approved:start_work': { crmStep: 6, techPhase: 'working', status: 'praca' },

  // Step 5: cenova ponuka klientovi (skipped in demo — no surcharge)
  '5:client_approval_pending:auto': { crmStep: 5, techPhase: 'client_approved', status: 'cenova_ponuka_klientovi' },
  '5:client_approved:start_work':   { crmStep: 6, techPhase: 'working', status: 'praca' },

  // Step 6: praca
  '6:working:work_done':            { crmStep: 6, techPhase: 'work_completed', status: 'praca' },
  '6:work_completed:open_photos':   { crmStep: 6, techPhase: 'work_completed', status: 'praca' },
  '6:work_completed:finalize_work': { crmStep: 8, techPhase: 'protocol_sent', status: 'dokoncene' },

  // Step 8: dokoncene — protokol + settlement
  '8:protocol_sent:auto':           { crmStep: 8, techPhase: 'final_protocol_signed', status: 'dokoncene' },
  '8:final_protocol_signed:view_invoice': { crmStep: 9, techPhase: 'settlement_review', status: 'zuctovanie' },

  // Step 9: zuctovanie
  '9:settlement_review:approve_settlement': { crmStep: 9, techPhase: 'departed', status: 'zuctovanie' },
  '9:invoice_ready:issue_invoice':          { crmStep: 13, techPhase: 'departed', status: 'uhradene' },
  '9:departed:completed':                   { crmStep: 13, techPhase: 'departed', status: 'uhradene' },
}

// ── Initial state ────────────────────────────────────────────────────

export function createInitialState(): DemoState {
  const jobs: Record<string, DispatchJob> = {}
  for (const job of DEMO_JOBS) {
    jobs[job.id] = { ...job }
  }
  return {
    screen: 'welcome',
    activeJobId: null,
    jobs,
  }
}

// ── Reducer ──────────────────────────────────────────────────────────

export function demoReducer(state: DemoState, action: DemoAction): DemoState {
  switch (action.type) {
    case 'START_DEMO':
      return { ...state, screen: 'dashboard' }

    case 'SELECT_JOB':
      return { ...state, screen: 'job-detail', activeJobId: action.jobId }

    case 'BACK_TO_DASHBOARD':
      return { ...state, screen: 'dashboard', activeJobId: null }

    case 'ACCEPT_JOB': {
      const job = state.jobs[action.jobId]
      if (!job) return state
      return {
        ...state,
        jobs: {
          ...state.jobs,
          [action.jobId]: {
            ...job,
            crmStep: 2,
            techPhase: 'offer_accepted' as any,
            status: 'naplanovane',
          },
        },
      }
    }

    case 'STEP_ACTION': {
      const job = state.jobs[action.jobId]
      if (!job) return state
      const key = `${job.crmStep}:${job.techPhase}:${action.action}`
      const transition = TRANSITIONS[key]
      if (!transition) {
        console.log(`[Demo] No transition for ${key}, ignoring`)
        return state
      }
      return {
        ...state,
        jobs: {
          ...state.jobs,
          [action.jobId]: {
            ...job,
            crmStep: transition.crmStep,
            techPhase: transition.techPhase as any,
            status: transition.status || job.status,
          },
        },
      }
    }

    case 'SUBMIT_ESTIMATE': {
      const job = state.jobs[action.jobId]
      if (!job) return state
      return {
        ...state,
        jobs: {
          ...state.jobs,
          [action.jobId]: {
            ...job,
            crmStep: 4,
            techPhase: 'estimate_submitted',
            status: 'schvalovanie_ceny',
            estimateData: {
              hours: 2,
              materials: [{ name: 'Těsnění', quantity: 1, unitPrice: 120, vatRate: 21 }],
              travelKm: 12,
              needsNextVisit: false,
            } as any,
          },
        },
      }
    }

    case 'AUTO_APPROVE_ESTIMATE': {
      const job = state.jobs[action.jobId]
      if (!job) return state
      return {
        ...state,
        jobs: {
          ...state.jobs,
          [action.jobId]: {
            ...job,
            crmStep: 4,
            techPhase: 'estimate_approved',
            status: 'schvalovanie_ceny',
          },
        },
      }
    }

    case 'PHOTOS_DONE': {
      const job = state.jobs[action.jobId]
      if (!job) return state
      const isWorkPhase = job.crmStep === 6 && job.techPhase === 'work_completed'
      return {
        ...state,
        jobs: {
          ...state.jobs,
          [action.jobId]: {
            ...job,
            finalPhotosUploaded: isWorkPhase ? true : job.finalPhotosUploaded,
            techPhase: job.crmStep === 3 ? 'diagnostics' : job.techPhase as any,
          },
        },
      }
    }

    case 'PROTOCOL_DONE': {
      const job = state.jobs[action.jobId]
      if (!job) return state
      return {
        ...state,
        jobs: {
          ...state.jobs,
          [action.jobId]: {
            ...job,
            crmStep: 8,
            techPhase: 'final_protocol_signed',
            status: 'dokoncene',
          },
        },
      }
    }

    case 'SETTLEMENT_DONE': {
      const job = state.jobs[action.jobId]
      if (!job) return state
      return {
        ...state,
        jobs: {
          ...state.jobs,
          [action.jobId]: {
            ...job,
            crmStep: 9,
            techPhase: 'departed',
            status: 'zuctovanie',
          },
        },
      }
    }

    default:
      return state
  }
}
