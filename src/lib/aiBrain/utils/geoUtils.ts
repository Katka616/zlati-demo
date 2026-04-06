/**
 * Geo utility funkcie pre AI Brain
 * - Haversine vzdialenosť medzi 2 GPS bodmi
 * - Geofence kontrola (je technik v okruhu zákazníka?)
 */

/**
 * Vypočíta vzdialenosť v km medzi 2 GPS bodmi (Haversine formula)
 */
export function haversineDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
): number {
    const R = 6371 // Earth radius in km
    const dLat = toRad(lat2 - lat1)
    const dLng = toRad(lng2 - lng1)
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
}

function toRad(deg: number): number {
    return deg * (Math.PI / 180)
}

/**
 * Overí, či je bod (technikova GPS) v geofence okruhu okolo zákazníka
 * @param techLat - GPS lat technika
 * @param techLng - GPS lng technika
 * @param customerLat - GPS lat zákazníka
 * @param customerLng - GPS lng zákazníka
 * @param radiusMeters - Požadovaný okruh v metroch (default: 150m)
 */
export function isInGeofence(
    techLat: number,
    techLng: number,
    customerLat: number,
    customerLng: number,
    radiusMeters: number = 150
): boolean {
    const distKm = haversineDistance(techLat, techLng, customerLat, customerLng)
    return distKm * 1000 <= radiusMeters
}

/**
 * Vypočíta "priamu vzdialenosť" od technikovej domácej adresy k zákazníkovi
 * Multiply by 1.25 pre reálnejší odhad cestovnej vzdialenosti (cestné meandre)
 */
export function estimateRouteKm(
    techHomeLat: number,
    techHomeLng: number,
    customerLat: number,
    customerLng: number
): number {
    const directKm = haversineDistance(techHomeLat, techHomeLng, customerLat, customerLng)
    return directKm * 1.25 // Road factor
}

/**
 * Overí, či je rozdiel medzi nahlásenom a GPS km podozrivý
 * @returns true ak je rozdiel >30% oproti GPS odhadu
 */
export function isKmFraudulent(
    reportedKm: number,
    estimatedKm: number,
    thresholdPercent: number = 30
): boolean {
    if (estimatedKm <= 0) return false
    const overagePct = ((reportedKm - estimatedKm) / estimatedKm) * 100
    return overagePct > thresholdPercent
}
