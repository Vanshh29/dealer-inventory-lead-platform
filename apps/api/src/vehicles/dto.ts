import { PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { FuelType, Gearbox, VehicleStatus } from '@prisma/client';

const MAX_YEAR = new Date().getFullYear() + 1;

export class CreateVehicleDto {
  /** 17 characters, no I, O or Q (ISO 3779). Stored upper-case. */
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @Matches(/^[A-HJ-NPR-Z0-9]{17}$/, { message: 'vin must be a valid 17-character VIN' })
  vin!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  make!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  model!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  variant?: string;

  @IsInt()
  @Min(1950)
  @Max(MAX_YEAR)
  year!: number;

  @IsInt()
  @Min(0)
  @Max(2_000_000)
  mileage!: number;

  /** Price in integer cents. Floats are rejected. */
  @IsInt()
  @Min(0)
  @Max(100_000_000)
  priceCents!: number;

  @IsEnum(FuelType)
  fuel!: FuelType;

  @IsEnum(Gearbox)
  gearbox!: Gearbox;

  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  color!: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsEnum(VehicleStatus)
  status?: VehicleStatus;
}

export class UpdateVehicleDto extends PartialType(CreateVehicleDto) {}
