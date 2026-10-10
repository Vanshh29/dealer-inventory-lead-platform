import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { PrismaService } from '../common/prisma.service';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

jest.mock('argon2', () => {
  const actual = jest.requireActual<typeof import('argon2')>('argon2');
  return { ...actual, verify: jest.fn(actual.verify) };
});

describe('AuthService', () => {
  const jwt = { signAsync: jest.fn().mockResolvedValue('access') } as unknown as JwtService;
  const refreshToken = {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  };
  const prisma = { refreshToken } as unknown as PrismaService;
  const users = { findByEmail: jest.fn() } as unknown as UsersService;
  const service = new AuthService(users, prisma, jwt);

  beforeEach(() => jest.clearAllMocks());

  it('still runs a password verification when the user does not exist', async () => {
    (users.findByEmail as jest.Mock).mockResolvedValue(null);
    const verify = argon2.verify as jest.Mock;
    verify.mockClear();
    await expect(service.login('ghost@x.dev', 'pw')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(verify).toHaveBeenCalledTimes(1);
  });

  it('issues tokens and stores only a hash of the refresh token', async () => {
    const passwordHash = await argon2.hash('correct-horse');
    (users.findByEmail as jest.Mock).mockResolvedValue({
      id: 'u1',
      email: 'a@x.dev',
      role: 'SALES',
      passwordHash,
    });
    const tokens = await service.login('a@x.dev', 'correct-horse');
    const stored = refreshToken.create.mock.calls[0][0].data.tokenHash as string;
    expect(stored).not.toBe(tokens.refreshToken);
    expect(stored).toMatch(/^[0-9a-f]{64}$/);
  });

  it('rejects an expired refresh token', async () => {
    refreshToken.findUnique.mockResolvedValue({
      id: 'r',
      userId: 'u',
      revokedAt: null,
      expiresAt: new Date(0),
    });
    await expect(service.refresh('tok')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('revokes all sessions of a user when a revoked token is replayed', async () => {
    refreshToken.findUnique.mockResolvedValue({
      id: 'r',
      userId: 'u1',
      revokedAt: new Date(),
      expiresAt: new Date(Date.now() + 1e6),
    });
    await expect(service.refresh('tok')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(refreshToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'u1', revokedAt: null } }),
    );
  });
});
