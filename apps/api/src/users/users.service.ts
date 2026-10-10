import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma, Role, User } from '@prisma/client';
import * as argon2 from 'argon2';
import { Page } from '../common/pagination';
import { PrismaService } from '../common/prisma.service';

export type PublicUser = Omit<User, 'passwordHash'>;

const publicSelect = { id: true, email: true, role: true, createdAt: true } as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  }

  async create(email: string, password: string, role: Role): Promise<PublicUser> {
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    try {
      return await this.prisma.user.create({
        data: { email: email.toLowerCase(), passwordHash, role },
        select: publicSelect,
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('A user with this email already exists');
      }
      throw e;
    }
  }

  async list(page: number, limit: number): Promise<Page<PublicUser>> {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        select: publicSelect,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.user.count(),
    ]);
    return { items, page, limit, total };
  }
}
