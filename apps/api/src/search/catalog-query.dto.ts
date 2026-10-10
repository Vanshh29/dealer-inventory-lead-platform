import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { FuelType, Gearbox } from '@prisma/client';
import { PaginationQuery } from '../common/pagination';

export const CATALOG_SORTS = [
  'relevance',
  'newest',
  'price_asc',
  'price_desc',
  'year_desc',
  'mileage_asc',
] as const;
export type CatalogSort = (typeof CATALOG_SORTS)[number];

export class CatalogQuery extends PaginationQuery {
  /** Free-text search over make, model, variant, colour and description. */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  make?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  model?: string;

  /** Price bounds in integer cents. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100_000_000)
  priceMin?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100_000_000)
  priceMax?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1950)
  @Max(2100)
  yearMin?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1950)
  @Max(2100)
  yearMax?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(2_000_000)
  mileageMax?: number;

  @IsOptional()
  @IsEnum(FuelType)
  fuel?: FuelType;

  @IsOptional()
  @IsEnum(Gearbox)
  gearbox?: Gearbox;

  /** `relevance` is the default when `q` is given, otherwise `newest`. */
  @IsOptional()
  @IsIn(CATALOG_SORTS)
  sort?: CatalogSort;
}
