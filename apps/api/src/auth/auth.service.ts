import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'node:crypto';
import * as argon2 from 'argon2';
import { AuthUser } from '../common/decorators';
import { PrismaService } from '../common/prisma.service';
import { UsersService } from '../users/users.service';

export const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

const sha256 = (value: string): string => createHash('sha256').update(value).digest('hex');

@Injectable()
export class AuthService {
  // Verified against when the email is unknown, so response time does not reveal which emails exist.
  private dummyHash?: Promise<string>;

  constructor(
    private readonly users: UsersService,
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(email: string, password: string): Promise<IssuedTokens> {
    const user = await this.users.findByEmail(email);
    this.dummyHash ??= argon2.hash('dummy-password-for-timing');
    const valid = await argon2.verify(user?.passwordHash ?? (await this.dummyHash), password);
    if (!user || !valid) throw new UnauthorizedException('Invalid credentials');
    return this.issue({ id: user.id, email: user.email, role: user.role });
  }

  /** Rotation: each refresh token is single-use. Presenting a used one revokes the whole family. */
  async refresh(rawToken: string | undefined): Promise<IssuedTokens> {
    if (!rawToken) throw new UnauthorizedException('Invalid refresh token');
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: sha256(rawToken) },
      include: { user: true },
    });
    if (!stored) throw new UnauthorizedException('Invalid refresh token');

    if (stored.revokedAt) {
      await this.prisma.refreshToken.updateMany({
        where: { userId: stored.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (stored.expiresAt < new Date()) throw new UnauthorizedException('Invalid refresh token');

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });
    const { id, email, role } = stored.user;
    return this.issue({ id, email, role });
  }

  /** Idempotent: unknown or already revoked tokens are ignored. */
  async logout(rawToken: string | undefined): Promise<void> {
    if (!rawToken) return;
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: sha256(rawToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async issue(user: AuthUser): Promise<IssuedTokens> {
    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
    const refreshToken = randomBytes(48).toString('base64url');
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: sha256(refreshToken),
        expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
      },
    });
    return { accessToken, refreshToken, user };
  }
}
