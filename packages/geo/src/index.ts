export { GeoRepository } from './geo.repository.js';
export { GeoService } from './geo.service.js';

import type { PrismaClient } from '@awaaz/db';
import { GeoRepository } from './geo.repository.js';
import { GeoService } from './geo.service.js';

export function createGeoService(db: PrismaClient): GeoService {
  return new GeoService(new GeoRepository(db));
}

export {
  GEO_ERROR,
  ASSIGNMENT_SOURCE_LABEL,
  CONSTITUENCY_TYPE_LABEL,
  ASSIGNMENT_SLA_HOURS,
  isAssigned,
  isUnmatched,
  unmatchedReasonLabel,
  assignmentSlaHours,
  type GeoErrorCode,
} from './geo.constants.js';

export {
  isValidIndiaCoordinate,
  makePointWkt,
  isValidGeoJson,
  isPolygonGeoJson,
  extractPolygonGeometry,
  formatBbox,
  isPointInBbox,
  haversineDistance,
  formatCoordinates,
} from './geo.utils.js';
