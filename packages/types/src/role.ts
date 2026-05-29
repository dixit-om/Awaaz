/** Application user roles (RBAC) */
export type UserRole = 'citizen' | 'mla' | 'admin';

/** Prisma enum values */
export type PrismaUserRole = 'CITIZEN' | 'MLA' | 'ADMIN';

const PRISMA_TO_APP: Record<PrismaUserRole, UserRole> = {
  CITIZEN: 'citizen',
  MLA: 'mla',
  ADMIN: 'admin',
};

const APP_TO_PRISMA: Record<UserRole, PrismaUserRole> = {
  citizen: 'CITIZEN',
  mla: 'MLA',
  admin: 'ADMIN',
};

export function prismaRoleToAppRole(role: PrismaUserRole): UserRole {
  return PRISMA_TO_APP[role];
}

export function appRoleToPrismaRole(role: UserRole): PrismaUserRole {
  return APP_TO_PRISMA[role];
}
