import { BadRequestException } from '@nestjs/common';

/**
 * Request-body coercion helpers.
 *
 * Every write endpoint here takes `@Body() body: any`, which means the global
 * `ValidationPipe` never fires — Nest only runs it for parameters with a
 * decorated DTO metatype. Without these guards a malformed value (`"abc"` for a
 * score, an unparseable date) reaches Prisma as `NaN` or `Invalid Date`, which
 * throws deep in the client and surfaces to the user as an opaque 500 instead
 * of a 400 naming the bad field.
 */

/** A finite number, or `fallback` when the value is absent. Rejects garbage. */
export function num(value: unknown, field: string, fallback?: number): number {
  if (value === undefined || value === null || value === '') {
    if (fallback === undefined) throw new BadRequestException(`${field} is required`);
    return fallback;
  }
  const n = Number(value);
  if (!Number.isFinite(n)) throw new BadRequestException(`${field} must be a number`);
  return n;
}

/** A finite number clamped into [min, max]. */
export function clamp(value: unknown, field: string, min: number, max: number, fallback = 0): number {
  return Math.max(min, Math.min(max, num(value, field, fallback)));
}

/** An integer id from a route param — `/plan/abc` must 400, not explode in Prisma. */
export function intParam(value: string, field: string): number {
  const n = Number(value);
  if (!Number.isInteger(n)) throw new BadRequestException(`${field} must be an integer`);
  return n;
}

/** A real Date, or `fallback`. `new Date("nonsense")` is an Invalid Date, not an error. */
export function date(value: unknown, field: string, fallback?: Date): Date {
  if (value === undefined || value === null || value === '') {
    if (fallback === undefined) throw new BadRequestException(`${field} is required`);
    return fallback;
  }
  const d = new Date(value as any);
  if (Number.isNaN(d.getTime())) throw new BadRequestException(`${field} is not a valid date`);
  return d;
}

/** One of a fixed set of strings. */
export function oneOf<T extends string>(value: unknown, field: string, allowed: readonly T[], fallback?: T): T {
  if (value === undefined || value === null || value === '') {
    if (fallback === undefined) throw new BadRequestException(`${field} is required`);
    return fallback;
  }
  if (!allowed.includes(value as T)) {
    throw new BadRequestException(`${field} must be one of: ${allowed.join(', ')}`);
  }
  return value as T;
}
