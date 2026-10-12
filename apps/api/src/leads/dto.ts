import { Transform } from 'class-transformer';
import {
  Equals,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { LeadStatus } from '@prisma/client';
import { PaginationQuery } from '../common/pagination';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class CreateLeadDto {
  @IsUUID()
  vehicleId!: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @Transform(trim)
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsOptional()
  @Transform(trim)
  @Matches(/^[+()\d\s-]{6,25}$/, { message: 'phone must be a valid phone number' })
  phone?: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  message!: string;

  /** Explicit agreement to the privacy notice; recorded as `consentAt`. */
  @Equals(true, { message: 'consent must be given' })
  consent!: true;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  utmSource?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  utmMedium?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  utmCampaign?: string;

  /**
   * Honeypot. Hidden from humans in the form; bots fill every field. If it has a value the
   * request is silently dropped (still answered 201 so bots get no signal).
   */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  website?: string;
}

export class UpdateLeadStatusDto {
  @IsEnum(LeadStatus)
  status!: LeadStatus;
}

export class AssignLeadDto {
  /** User id of a SALES/ADMIN user, or null to unassign. */
  @ValidateIf((_o, v) => v !== null)
  @IsUUID()
  assignedToId!: string | null;
}

export class CreateNoteDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  text!: string;
}

export class LeadListQuery extends PaginationQuery {
  @IsOptional()
  @IsEnum(LeadStatus)
  status?: LeadStatus;

  @IsOptional()
  @IsUUID()
  assignedToId?: string;

  @IsOptional()
  @IsUUID()
  vehicleId?: string;

  /** Case-insensitive match on name or email. */
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  q?: string;
}
