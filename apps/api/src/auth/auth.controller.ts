import { Body, Controller, Get, HttpCode, Post, Req, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CookieOptions, Request, Response } from 'express';
import { AuthUser, CurrentUser, Public } from '../common/decorators';
import { ACCESS_COOKIE } from '../common/jwt-auth.guard';
import { LoginDto } from './dto';
import { AuthService, IssuedTokens, REFRESH_TTL_MS } from './auth.service';

export const REFRESH_COOKIE = 'refresh_token';
export const ACCESS_TTL_MS = 15 * 60 * 1000;

// Evaluated per request so tests (and ops) can tune the limit through the environment.
const authLimit = (): number => Number(process.env.AUTH_RATE_LIMIT ?? 5);
const authThrottle = { default: { limit: authLimit, ttl: 60_000 } };

const base = (): CookieOptions => ({
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
});

function setAuthCookies(res: Response, t: IssuedTokens): void {
  res.cookie(ACCESS_COOKIE, t.accessToken, { ...base(), path: '/', maxAge: ACCESS_TTL_MS });
  // Scoped to /auth so the long-lived token is not sent with every API request.
  res.cookie(REFRESH_COOKIE, t.refreshToken, { ...base(), path: '/auth', maxAge: REFRESH_TTL_MS });
}

function clearAuthCookies(res: Response): void {
  res.clearCookie(ACCESS_COOKIE, { ...base(), path: '/' });
  res.clearCookie(REFRESH_COOKIE, { ...base(), path: '/auth' });
}

const refreshCookie = (req: Request): string | undefined =>
  (req.cookies as Record<string, string> | undefined)?.[REFRESH_COOKIE];

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Throttle(authThrottle)
  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response): Promise<AuthUser> {
    const tokens = await this.auth.login(dto.email, dto.password);
    setAuthCookies(res, tokens);
    return tokens.user;
  }

  @Public()
  @Throttle(authThrottle)
  @Post('refresh')
  @HttpCode(200)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<AuthUser> {
    try {
      const tokens = await this.auth.refresh(refreshCookie(req));
      setAuthCookies(res, tokens);
      return tokens.user;
    } catch (e) {
      clearAuthCookies(res);
      throw e;
    }
  }

  @Public()
  @Post('logout')
  @HttpCode(204)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    await this.auth.logout(refreshCookie(req));
    clearAuthCookies(res);
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser): AuthUser {
    return user;
  }
}
