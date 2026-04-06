// src/types/reschedule.ts

export type RescheduleStatus =
  | 'pending'
  | 'accepted'
  | 'counter_proposed'
  | 'declined'
  | 'expired'
  | 'operator_resolved'
  | 'cancelled';

export type RescheduleReasonCode =
  | 'illness'
  | 'previous_job_delayed'
  | 'vehicle_problem'
  | 'missing_material'
  | 'bad_weather'
  | 'personal_reasons'
  | 'other';

export interface CounterDateSlot {
  date: string;   // YYYY-MM-DD
  time: string;   // HH:MM
  note?: string;
}

export interface RescheduleRequest {
  id: number;
  job_id: number;
  requested_by: 'technician' | 'operator';
  technician_id: number | null;
  reason_code: RescheduleReasonCode;
  reason_note: string | null;
  original_date: string;
  original_time: string | null;
  proposed_date: string;
  proposed_time: string | null;
  proposed_message: string | null;
  status: RescheduleStatus;
  expires_at: string;
  counter_dates: CounterDateSlot[] | null;
  counter_message: string | null;
  resolved_date: string | null;
  resolved_time: string | null;
  resolved_by: 'client' | 'technician' | 'operator' | null;
  resolved_at: string | null;
  operator_note: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateRescheduleInput {
  job_id: number;
  reason_code: RescheduleReasonCode;
  reason_note?: string;
  proposed_date: string;
  proposed_time?: string;
  proposed_message?: string;
  material_delivery_date?: string;
}

export interface RescheduleRespondInput {
  action: 'accept' | 'decline' | 'counter';
  counter_dates?: CounterDateSlot[];
  message?: string;
}

export interface TechPickInput {
  selected_date: string;
  selected_time: string;
}

export interface OperatorResolveInput {
  resolved_date: string;
  resolved_time?: string;
  operator_note?: string;
}
