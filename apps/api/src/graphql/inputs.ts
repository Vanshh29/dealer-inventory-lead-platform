import { Field, InputType, Int } from '@nestjs/graphql';
import { FuelType, Gearbox } from '@prisma/client';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { CATALOG_SORTS, CatalogSort } from '@dealer/shared';
import { CatalogSortEnum } from './models';

/**
 * Same fields and the same bounds as the REST `CatalogQuery`. They are declared again because
 * GraphQL needs its own decorators; the shared limits are what the integration tests compare.
 */
@InputType()
export class CatalogFilterInput {
  @Field(() => String, { nullable: true, description: 'Full-text search' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  make?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  model?: string | null;

  @Field(() => Int, { nullable: true, description: 'Integer cents' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100_000_000)
  priceMin?: number | null;

  @Field(() => Int, { nullable: true, description: 'Integer cents' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100_000_000)
  priceMax?: number | null;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1950)
  @Max(2100)
  yearMin?: number | null;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1950)
  @Max(2100)
  yearMax?: number | null;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2_000_000)
  mileageMax?: number | null;

  @Field(() => FuelType, { nullable: true })
  @IsOptional()
  @IsEnum(FuelType)
  fuel?: FuelType | null;

  @Field(() => Gearbox, { nullable: true })
  @IsOptional()
  @IsEnum(Gearbox)
  gearbox?: Gearbox | null;

  @Field(() => CatalogSortEnum, { nullable: true })
  @IsOptional()
  @IsIn(CATALOG_SORTS)
  sort?: CatalogSort | null;

  @Field(() => Int, { nullable: true, defaultValue: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number | null;

  @Field(() => Int, { nullable: true, defaultValue: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number | null;
}
