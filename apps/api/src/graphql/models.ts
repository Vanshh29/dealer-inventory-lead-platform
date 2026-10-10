import { Field, ID, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import { FuelType, Gearbox } from '@prisma/client';
import { CATALOG_SORTS } from '@dealer/shared';

// Enum values are identical to the Prisma/REST ones, so both APIs speak the same vocabulary.
registerEnumType(FuelType, { name: 'FuelType' });
registerEnumType(Gearbox, { name: 'Gearbox' });

/** Mirrors CATALOG_SORTS from @dealer/shared; a TS enum object is what registerEnumType needs. */
export const CatalogSortEnum = Object.fromEntries(CATALOG_SORTS.map((s) => [s, s])) as Record<
  (typeof CATALOG_SORTS)[number],
  (typeof CATALOG_SORTS)[number]
>;
registerEnumType(CatalogSortEnum, { name: 'CatalogSort' });

@ObjectType()
export class VehicleImage {
  @Field(() => ID) id!: string;
  @Field() url!: string;
  @Field(() => Int) position!: number;
}

/** Only published vehicles are reachable, so `status` is deliberately not exposed. */
@ObjectType()
export class Vehicle {
  @Field(() => ID) id!: string;
  @Field() vin!: string;
  @Field() make!: string;
  @Field() model!: string;
  @Field(() => String, { nullable: true }) variant!: string | null;
  @Field(() => Int) year!: number;
  @Field(() => Int) mileage!: number;
  /** Integer cents, as in the REST API. Never a float. */
  @Field(() => Int) priceCents!: number;
  @Field(() => FuelType) fuel!: FuelType;
  @Field(() => Gearbox) gearbox!: Gearbox;
  @Field(() => String, { nullable: true }) color!: string | null;
  @Field(() => String, { nullable: true }) description!: string | null;
  @Field(() => [VehicleImage]) images!: VehicleImage[];
  @Field() createdAt!: Date;
  @Field() updatedAt!: Date;
}

@ObjectType()
export class VehiclePage {
  @Field(() => [Vehicle]) items!: Vehicle[];
  @Field(() => Int) page!: number;
  @Field(() => Int) limit!: number;
  @Field(() => Int) total!: number;
}
