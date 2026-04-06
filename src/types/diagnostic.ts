/**
 * DiagData — full diagnostic form data structure.
 * Shared between admin panel and technician marketplace.
 */
export interface DiagData {
  client_type?: string
  fault_type?: string
  property_type?: string
  urgency?: string
  problem_desc?: string
  floor?: string
  address_note?: string
  // Plumbing
  plumb_issue?: string[]
  plumb_location?: string[]
  plumb_water_shutoff?: string
  plumb_severity?: string
  plumb_pipe_material?: string
  plumb_electric_risk?: string
  plumb_faucet_type?: string
  plumb_faucet_location?: string
  plumb_faucet_brand?: string
  plumb_faucet_symptom?: string[]
  plumb_notes?: string
  // Electrical
  elec_issue?: string[]
  elec_scope?: string
  elec_breaker?: string
  elec_burn?: string
  elec_age?: string
  elec_notes?: string
  // Boiler
  boiler_brand?: string
  boiler_model?: string
  boiler_fuel?: string
  boiler_age?: string
  boiler_issue?: string[]
  boiler_error_code?: string
  boiler_pressure?: string
  boiler_gas_smell?: string
  boiler_last_service?: string
  boiler_location?: string
  boiler_notes?: string
  // Heating (radiators, underfloor)
  heat_system?: string
  heat_issue?: string[]
  heat_radiator_count?: string
  heat_floor_type?: string
  heat_age?: string
  heat_notes?: string
  // Appliance
  appliance_type?: string
  appliance_brand?: string
  appliance_age?: string
  appliance_install?: string
  appliance_issue?: string[]
  appliance_error?: string
  appliance_notes?: string
  // Pest
  pest_type?: string[]
  pest_duration?: string
  pest_scope?: string
  pest_safety?: string[]
  pest_previous?: string
  pest_notes?: string
  // Lock
  lock_situation?: string
  lock_person_inside?: string
  lock_door_type?: string
  lock_type?: string
  lock_count?: string
  lock_notes?: string
  // Gas
  gas_smell?: string
  gas_device?: string
  gas_issue?: string[]
  gas_ventilation?: string
  gas_notes?: string
  // Drain
  drain_location?: string[]
  drain_severity?: string
  drain_type?: string
  drain_scope?: string
  drain_floor?: string
  drain_previous?: string
  drain_previous_cleaning?: string[]
  drain_age?: string
  drain_notes?: string
  // WC (sub-panel of plumbing)
  wc_symptom?: string[]
  wc_tank_type?: string
  wc_age?: string
  // AC
  ac_brand?: string
  ac_age?: string
  ac_issue?: string[]
  ac_type?: string
  ac_notes?: string
  // Heat pump
  hp_brand?: string
  hp_age?: string
  hp_issue?: string[]
  hp_error_code?: string
  hp_notes?: string
  // Solar
  sp_count?: string
  sp_age?: string
  sp_issue?: string[]
  sp_inverter_brand?: string
  sp_notes?: string
  // Appointments
  appointments?: Array<{ date: string; time: string }>
  schedule_note?: string
  // EA coverage detection fields
  problem_cause?: 'nahle' | 'postupne' | 'po_zasahu' | 'vlastni_pokus' | 'nevim'
  repair_scope?: 'oprava_mista' | 'vymena_useku' | 'kompletni_vymena' | 'diagnostika'
  door_type?: 'hlavni_vchod' | 'vnitrni' | 'sklep_garaz' | 'jine'
  lock_cylinder_type?: 'bezny_fab' | 'bezpecnostni' | 'elektronicky' | 'nevim'
  mechanical_damage?: 'ano' | 'ne' | 'nevim'
  // Meta
  photo_count?: number
  saved_at?: string
  saved_by?: string
  crm_category?: string
}
