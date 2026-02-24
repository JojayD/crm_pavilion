import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { SupabaseGuard } from '../auth/supabase.guard';
import { StatsService } from './stats.service';

@UseGuards(SupabaseGuard)
@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get()
  async getDashboardStats(@Req() req: Request) {
    const user = (req as any).user;
    const data = await this.statsService.getDashboardStats(user.id);
    return { success: true, message: 'Stats fetched successfully', data };
  }
}
