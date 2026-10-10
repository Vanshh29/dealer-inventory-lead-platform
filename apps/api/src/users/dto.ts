import { IsEmail, IsIn, IsString, MaxLength, MinLength } from 'class-validator';
import { Role } from '@prisma/client';
import { ROLES } from '@dealer/shared';

export class CreateUserDto {
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @MinLength(12)
  @MaxLength(128)
  password!: string;

  @IsIn(ROLES)
  role!: Role;
}
