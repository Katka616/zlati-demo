/**
 * Communication domain — barrel re-export
 *
 * Import from here for a clean domain path:
 *   import { sendSms } from '@/lib/communication'
 *   import { sendPushToTechnician } from '@/lib/communication'
 *   import { notifyOperators } from '@/lib/communication'
 *
 * Original file paths continue to work for backward compatibility.
 */

export * from '../notify'
// notifications.ts is browser-only (sound/vibrate) — import directly if needed: '@/lib/notifications'
export * from '../notificationStore'
export * from '../operatorNotify'
export * from '../operatorMatching'
export * from '../push'
export * from '../sms'
export * from '../gmail'
export * from '../autoNotify'
