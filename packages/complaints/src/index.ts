export {
  COMPLAINT_ERROR,
  PRIORITY_LABEL,
  isTerminalStatus,
  allowedRolesForTransition,
  canTransition,
  isCitizenTransition,
  transitionErrorMessage,
  validNextStatuses,
  type ComplaintErrorCode,
} from './complaint.constants.js';

export { ComplaintRepository } from './complaint.repository.js';
export { ComplaintService } from './complaint.service.js';

import type { PrismaClient } from '@awaaz/db';
import type { GeoService } from '@awaaz/geo';
import { ComplaintRepository } from './complaint.repository.js';
import { ComplaintService } from './complaint.service.js';

export function createComplaintService(
  db: PrismaClient,
  geoService?: GeoService,
): ComplaintService {
  return new ComplaintService(new ComplaintRepository(db), geoService);
}
