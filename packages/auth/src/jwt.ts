import type { AuthConfig } from '@awaaz/config';
import type { JwtAccessPayload, UserRole } from '@awaaz/types';
import { SignJWT, jwtVerify } from 'jose';

function getSecret(config: AuthConfig): Uint8Array {
  return new TextEncoder().encode(config.JWT_ACCESS_SECRET);
}

export async function signAccessToken(
  config: AuthConfig,
  payload: { userId: string; role: UserRole },
): Promise<string> {
  return new SignJWT({ role: payload.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.userId)
    .setIssuedAt()
    .setExpirationTime(`${config.ACCESS_TOKEN_TTL_SECONDS}s`)
    .sign(getSecret(config));
}

export async function verifyAccessToken(
  config: AuthConfig,
  token: string,
): Promise<JwtAccessPayload> {
  const { payload } = await jwtVerify(token, getSecret(config), {
    algorithms: ['HS256'],
  });

  const sub = payload.sub;
  const role = payload.role;

  if (!sub || typeof role !== 'string') {
    throw new Error('Invalid token payload');
  }

  if (role !== 'citizen' && role !== 'mla' && role !== 'admin') {
    throw new Error('Invalid token role');
  }

  return { sub, role };
}
