// src/lib/reschedule.ts
import {
  RESCHEDULE_BLOCKED_TECH_PHASES,
  RESCHEDULE_PENDING_EXPIRY_HOURS,
  RESCHEDULE_COUNTER_EXPIRY_HOURS,
  RESCHEDULE_REASON_CODES,
  PAUSE_WORK_REASON_CODES,
} from './constants';
import {
  createRescheduleRequest,
  getRescheduleById,
  getActiveRescheduleForJob,
  updateRescheduleStatus,
  getExpiredReschedules,
  resolveActiveReschedulesForJob,
  updateJobScheduledDate,
  updateJob,
  updateJobWithStatusEngine,
  writeAuditLog,
  createJobMessage,
} from './db';
import type {
  RescheduleRequest,
  CreateRescheduleInput,
  RescheduleRespondInput,
  TechPickInput,
  OperatorResolveInput,
  CounterDateSlot,
} from '@/types/reschedule';

// ─── Validation ──────────────────────────────────────────────

export function validateCreateReschedule(
  job: any,
  input: CreateRescheduleInput,
  activeRequest: any,
  options?: { isPauseMode?: boolean }
): string | null {
  if (!job) return 'Zákazka neexistuje';

  // Auto-detect pause mode: technician is on-site and interrupting work
  const isPause = options?.isPauseMode || (
    job.crm_step >= 3 && job.crm_step <= 7
    && ['working', 'break', 'caka_material'].includes(String(job.tech_phase || ''))
  )

  if (!isPause) {
    // Reschedule mode: require existing scheduled_date
    if (!job.scheduled_date) return 'Zákazka nemá naplánovaný termín';
  }
  if (['completed', 'cancelled'].includes(job.status)) {
    return 'Zákazka je ukončená alebo zrušená';
  }
  // Block reschedule for active phases, but NOT for pause mode (tech IS in active phase)
  if (!isPause && job.tech_phase && RESCHEDULE_BLOCKED_TECH_PHASES.includes(job.tech_phase as any)) {
    return 'Zákazka je v priebehu — termín nie je možné meniť';
  }
  if (activeRequest) {
    return 'Pre túto zákazku už existuje aktívna žiadosť o zmenu termínu';
  }

  // Validate reason code — pause mode uses different reason codes
  const validCodes = isPause
    ? PAUSE_WORK_REASON_CODES.map(r => r.code)
    : RESCHEDULE_REASON_CODES.map(r => r.code);
  if (!validCodes.includes(input.reason_code as any)) {
    return 'Neplatný dôvod zmeny';
  }
  if (input.reason_code === 'other' && !input.reason_note?.trim()) {
    return 'Pri dôvode "Iné" je poznámka povinná';
  }

  // Validate proposed date is at least 2h in the future
  const proposed = new Date(`${input.proposed_date}T${input.proposed_time || '00:00'}`);
  const minDate = new Date(Date.now() + 2 * 60 * 60 * 1000);
  if (proposed < minDate) {
    return 'Navrhovaný termín musí byť minimálne 2 hodiny v budúcnosti';
  }

  return null; // valid
}

export function validateCounterDates(counterDates: CounterDateSlot[]): string | null {
  if (!counterDates || counterDates.length === 0) {
    return 'Musíte navrhnúť aspoň 1 termín';
  }
  if (counterDates.length > 3) {
    return 'Maximálne 3 termíny';
  }

  const minDate = new Date(Date.now() + 2 * 60 * 60 * 1000);
  const seen = new Set<string>();

  for (const slot of counterDates) {
    if (!slot.date || !slot.time) {
      return 'Každý termín musí mať dátum aj čas';
    }
    const dt = new Date(`${slot.date}T${slot.time}`);
    if (dt < minDate) {
      return 'Všetky termíny musia byť minimálne 2 hodiny v budúcnosti';
    }
    const key = `${slot.date}_${slot.time}`;
    if (seen.has(key)) {
      return 'Termíny nesmú byť duplicitné';
    }
    seen.add(key);
  }

  return null; // valid
}

// ─── Core Actions ────────────────────────────────────────────

export async function createReschedule(
  job: any,
  technicianId: number,
  input: CreateRescheduleInput
): Promise<RescheduleRequest> {
  const expiresAt = new Date(
    Date.now() + RESCHEDULE_PENDING_EXPIRY_HOURS * 60 * 60 * 1000
  ).toISOString();

  // For pause_work without scheduled_date, use today as original_date
  const originalDate = job.scheduled_date || new Date().toISOString().slice(0, 10)
  const originalTime = job.scheduled_time || null

  const request = await createRescheduleRequest({
    job_id: input.job_id,
    requested_by: 'technician',
    technician_id: technicianId,
    reason_code: input.reason_code,
    reason_note: input.reason_note,
    original_date: originalDate,
    original_time: originalTime,
    proposed_date: input.proposed_date,
    proposed_time: input.proposed_time,
    proposed_message: input.proposed_message,
    expires_at: expiresAt,
  });

  const isMidRepair =
    job.crm_step === 6 &&
    ['working', 'break', 'caka_material'].includes(String(job.tech_phase || ''));

  if (isMidRepair) {
    const pausePhase = input.reason_code === 'missing_material' ? 'caka_material' : 'break';
    const isMissingMaterial = input.reason_code === 'missing_material';
    await updateJobWithStatusEngine(job.id, {
      status: job.status,
      crm_step: job.crm_step,
      tech_phase: pausePhase,
      custom_fields_merge: {
        break_start_at: new Date().toISOString(),
        pause_reason_code: input.reason_code,
        pause_reason_note: input.reason_note || null,
        estimate_needs_next_visit: true,
        estimate_next_visit_reason: input.reason_code,
        estimate_next_visit_date: input.proposed_date,
        pause_requested_at: new Date().toISOString(),
        ...(isMissingMaterial && input.material_delivery_date
          ? { estimate_material_delivery_date: input.material_delivery_date }
          : {}),
      },
    });
    if (isMissingMaterial) {
      await updateJob(job.id, { parts_status: 'ordered' });
    }
  }

  await writeAuditLog({
    entity_type: 'job',
    entity_id: job.id,
    action: 'reschedule_requested',
    changed_by_role: 'technician',
    changes: [
      { field: 'scheduled_date', old: `${job.scheduled_date} ${job.scheduled_time || ''}`.trim(), new: `${input.proposed_date} ${input.proposed_time || ''}`.trim() },
    ],
  });

  // System messages in both channels
  const systemMsg = isMidRepair
    ? `Technik prerušil prácu a navrhol ďalšiu návštevu na ${formatDateSk(input.proposed_date, input.proposed_time)}.`
    : `Technik požiadal o zmenu termínu z ${formatDateSk(job.scheduled_date, job.scheduled_time)} na ${formatDateSk(input.proposed_date, input.proposed_time)}.`;
  await addSystemMessage(job.id, systemMsg);

  return request;
}

export async function respondAccept(
  reschedule: RescheduleRequest,
  job: any
): Promise<RescheduleRequest> {
  const updated = await updateRescheduleStatus(reschedule.id, {
    status: 'accepted',
    resolved_date: reschedule.proposed_date,
    resolved_time: reschedule.proposed_time,
    resolved_by: 'client',
    resolved_at: new Date().toISOString(),
  });

  // Update job scheduled date
  await updateJobScheduledDate(job.id, reschedule.proposed_date, reschedule.proposed_time);

  await writeAuditLog({
    entity_type: 'job',
    entity_id: job.id,
    action: 'reschedule_accepted',
    changed_by_role: 'client',
    changes: [
      { field: 'scheduled_date', old: `${reschedule.original_date} ${reschedule.original_time || ''}`.trim(), new: `${reschedule.proposed_date} ${reschedule.proposed_time || ''}`.trim() },
    ],
  });

  const msg = `Klient súhlasil so zmenou termínu na ${formatDateSk(reschedule.proposed_date, reschedule.proposed_time)}.`;
  await addSystemMessage(job.id, msg);

  return updated;
}

export async function respondDecline(
  reschedule: RescheduleRequest,
  job: any
): Promise<RescheduleRequest> {
  const updated = await updateRescheduleStatus(reschedule.id, {
    status: 'declined',
    resolved_by: 'client',
    resolved_at: new Date().toISOString(),
  });

  await writeAuditLog({
    entity_type: 'job',
    entity_id: job.id,
    action: 'reschedule_declined',
    changed_by_role: 'client',
  });

  const msg = `Klient odmietol zmenu termínu. Pôvodný termín ${formatDateSk(reschedule.original_date, reschedule.original_time)} zostáva.`;
  await addSystemMessage(job.id, msg);

  return updated;
}

export async function respondCounter(
  reschedule: RescheduleRequest,
  job: any,
  counterDates: CounterDateSlot[],
  message?: string
): Promise<RescheduleRequest> {
  const newExpiry = new Date(
    Date.now() + RESCHEDULE_COUNTER_EXPIRY_HOURS * 60 * 60 * 1000
  ).toISOString();

  const updated = await updateRescheduleStatus(reschedule.id, {
    status: 'counter_proposed',
    counter_dates: JSON.stringify(counterDates),
    counter_message: message || null,
    expires_at: newExpiry, // RESET expiry to 4h from now
  });

  await writeAuditLog({
    entity_type: 'job',
    entity_id: job.id,
    action: 'reschedule_counter_proposed',
    changed_by_role: 'client',
    changes: [
      { field: 'counter_dates', old: null, new: counterDates.map(d => `${d.date} ${d.time}`).join(', ') },
    ],
  });

  const datesStr = counterDates.map(d => formatDateSk(d.date, d.time)).join(', ');
  const msg = `Klient navrhol alternatívne termíny: ${datesStr}.`;
  await addSystemMessage(job.id, msg);

  return updated;
}

export async function techPickCounterDate(
  reschedule: RescheduleRequest,
  job: any,
  input: TechPickInput
): Promise<RescheduleRequest> {
  // Validate picked date is in counter_dates
  const counterDates = reschedule.counter_dates || [];
  const isValid = counterDates.some(
    (d: CounterDateSlot) => d.date === input.selected_date && d.time === input.selected_time
  );
  if (!isValid) {
    throw new Error('Vybraný termín nie je medzi navrhovanými');
  }

  const updated = await updateRescheduleStatus(reschedule.id, {
    status: 'accepted',
    resolved_date: input.selected_date,
    resolved_time: input.selected_time,
    resolved_by: 'technician',
    resolved_at: new Date().toISOString(),
  });

  // Update job scheduled date
  await updateJobScheduledDate(job.id, input.selected_date, input.selected_time);

  await writeAuditLog({
    entity_type: 'job',
    entity_id: job.id,
    action: 'reschedule_counter_picked',
    changed_by_role: 'technician',
    changes: [
      { field: 'scheduled_date', old: `${reschedule.original_date} ${reschedule.original_time || ''}`.trim(), new: `${input.selected_date} ${input.selected_time}` },
    ],
  });

  const msg = `Technik vybral termín ${formatDateSk(input.selected_date, input.selected_time)} z klientových návrhov.`;
  await addSystemMessage(job.id, msg);

  return updated;
}

export async function operatorResolve(
  reschedule: RescheduleRequest,
  job: any,
  input: OperatorResolveInput
): Promise<RescheduleRequest> {
  const updated = await updateRescheduleStatus(reschedule.id, {
    status: 'operator_resolved',
    resolved_date: input.resolved_date,
    resolved_time: input.resolved_time || null,
    resolved_by: 'operator',
    resolved_at: new Date().toISOString(),
    operator_note: input.operator_note || null,
  });

  // Update job scheduled date (only if different from original)
  const isRejection =
    input.resolved_date === reschedule.original_date &&
    (input.resolved_time || null) === (reschedule.original_time || null);

  if (!isRejection) {
    await updateJobScheduledDate(job.id, input.resolved_date, input.resolved_time || null);
  }

  await writeAuditLog({
    entity_type: 'job',
    entity_id: job.id,
    action: 'reschedule_operator_resolved',
    changed_by_role: 'operator',
    changes: [
      { field: 'scheduled_date', old: `${reschedule.original_date} ${reschedule.original_time || ''}`.trim(), new: `${input.resolved_date} ${input.resolved_time || ''}`.trim() },
    ],
  });

  const action = isRejection ? 'zamietol žiadosť o zmenu termínu' : `nastavil nový termín ${formatDateSk(input.resolved_date, input.resolved_time)}`;
  const msg = `Operátor ${action}.`;
  await addSystemMessage(job.id, msg);

  return updated;
}

export async function cancelReschedule(
  reschedule: RescheduleRequest,
  job: any,
  cancelledBy: 'technician' | 'operator',
  reason?: string
): Promise<RescheduleRequest> {
  const updated = await updateRescheduleStatus(reschedule.id, {
    status: 'cancelled',
    resolved_by: cancelledBy,
    resolved_at: new Date().toISOString(),
    operator_note: reason || null,
  });

  await writeAuditLog({
    entity_type: 'job',
    entity_id: job.id,
    action: 'reschedule_cancelled',
    changed_by_role: cancelledBy,
  });

  const msg = `Žiadosť o zmenu termínu bola zrušená.`;
  await addSystemMessage(job.id, msg);

  return updated;
}

export async function processExpiredReschedules(): Promise<number> {
  const expired = await getExpiredReschedules();
  let count = 0;

  for (const r of expired) {
    await updateRescheduleStatus(r.id, {
      status: 'expired',
    });

    await writeAuditLog({
      entity_type: 'job',
      entity_id: r.job_id,
      action: 'reschedule_expired',
    });

    const msg = `Žiadosť o zmenu termínu vypršala bez odpovede. Eskalované na operátora.`;
    await addSystemMessage(r.job_id, msg);

    count++;
  }

  return count;
}

// ─── Helpers ─────────────────────────────────────────────────

function formatDateSk(date: string, time?: string | null): string {
  if (!date) return 'neurčený';
  const d = new Date(date);
  const day = d.getDate();
  const month = d.getMonth() + 1;
  const year = d.getFullYear();
  const dateStr = `${day}.${month}.${year}`;
  return time ? `${dateStr} o ${time}` : dateStr;
}

async function addSystemMessage(jobId: number, message: string): Promise<void> {
  // Insert into both channels (two separate rows per spec)
  for (const channel of ['client', 'dispatch'] as const) {
    await createJobMessage(jobId, 'system', message, 'System', channel);
  }
}

// Re-export DB helpers for use in API routes
export {
  getRescheduleById,
  getActiveRescheduleForJob,
  resolveActiveReschedulesForJob,
};
