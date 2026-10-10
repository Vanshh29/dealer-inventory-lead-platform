import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Vehicle, VehicleImage } from '@prisma/client';
import { Page } from '../common/pagination';
import { PrismaService } from '../common/prisma.service';
import { STORAGE, StorageService } from '../common/storage/storage.interface';
import { CreateVehicleDto, UpdateVehicleDto } from './dto';

export const MAX_IMAGES_PER_VEHICLE = 10;

export type VehicleWithImages = Omit<Vehicle, 'searchVector'> & { images: VehicleImage[] };

// searchVector is an internal column; never send it to clients.
export const vehicleSelect = {
  id: true,
  vin: true,
  make: true,
  model: true,
  variant: true,
  year: true,
  mileage: true,
  priceCents: true,
  fuel: true,
  gearbox: true,
  color: true,
  description: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  images: { orderBy: { position: 'asc' } },
} satisfies Prisma.VehicleSelect;

@Injectable()
export class VehiclesService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE) private readonly storage: StorageService,
  ) {}

  async list(
    page: number,
    limit: number,
    status?: Vehicle['status'],
  ): Promise<Page<VehicleWithImages>> {
    const where: Prisma.VehicleWhereInput = status ? { status } : {};
    const [items, total] = await this.prisma.$transaction([
      this.prisma.vehicle.findMany({
        where,
        select: vehicleSelect,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.vehicle.count({ where }),
    ]);
    return { items, page, limit, total };
  }

  async get(id: string): Promise<VehicleWithImages> {
    const v = await this.prisma.vehicle.findUnique({ where: { id }, select: vehicleSelect });
    if (!v) throw new NotFoundException('Vehicle not found');
    return v;
  }

  async create(dto: CreateVehicleDto): Promise<VehicleWithImages> {
    try {
      return await this.prisma.vehicle.create({ data: dto, select: vehicleSelect });
    } catch (e) {
      throw this.mapUniqueViolation(e);
    }
  }

  async update(id: string, dto: UpdateVehicleDto): Promise<VehicleWithImages> {
    try {
      return await this.prisma.vehicle.update({ where: { id }, data: dto, select: vehicleSelect });
    } catch (e) {
      throw this.mapUniqueViolation(e);
    }
  }

  async remove(id: string): Promise<void> {
    const v = await this.get(id);
    await this.prisma.vehicle.delete({ where: { id } }); // images rows cascade
    await Promise.all(v.images.map((img) => this.storage.delete(img.key)));
  }

  async addImage(id: string, file: { buffer: Buffer; mimetype: string }): Promise<VehicleImage> {
    const vehicle = await this.get(id);
    if (vehicle.images.length >= MAX_IMAGES_PER_VEHICLE) {
      throw new BadRequestException(`A vehicle can have at most ${MAX_IMAGES_PER_VEHICLE} images`);
    }
    const stored = await this.storage.save(file);
    const position = vehicle.images.reduce((max, i) => Math.max(max, i.position), -1) + 1;
    try {
      return await this.prisma.vehicleImage.create({
        data: { vehicleId: id, key: stored.key, url: stored.url, position },
      });
    } catch (e) {
      await this.storage.delete(stored.key); // do not leave orphaned files behind
      throw e;
    }
  }

  async removeImage(vehicleId: string, imageId: string): Promise<void> {
    const image = await this.prisma.vehicleImage.findFirst({ where: { id: imageId, vehicleId } });
    if (!image) throw new NotFoundException('Image not found');
    await this.prisma.vehicleImage.delete({ where: { id: imageId } });
    await this.storage.delete(image.key);
  }

  private mapUniqueViolation(e: unknown): unknown {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === 'P2002')
        return new ConflictException('A vehicle with this VIN already exists');
      if (e.code === 'P2025') return new NotFoundException('Vehicle not found');
    }
    return e;
  }
}
