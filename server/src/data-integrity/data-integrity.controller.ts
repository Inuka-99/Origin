import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  CurrentUser,
  JwtAuthGuard,
  Roles,
  RolesGuard,
  UserSyncInterceptor,
  type AuthenticatedUser,
} from '../auth';
import { DataIntegrityService } from './data-integrity.service';

@Controller('data-integrity')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(UserSyncInterceptor)
@Roles('admin')
export class DataIntegrityController {
  constructor(private readonly dataIntegrityService: DataIntegrityService) {}

  @Get('report')
  async getReport() {
    return this.dataIntegrityService.getReport();
  }

  @Get('snapshots')
  async listSnapshots(@Query('limit') limit?: string) {
    return this.dataIntegrityService.listSnapshots(
      limit ? parseInt(limit, 10) : undefined,
    );
  }

  @Post('snapshots')
  async createSnapshot(
    @CurrentUser() user: AuthenticatedUser,
    @Body('notes') notes?: string,
  ) {
    return this.dataIntegrityService.createSnapshot(user.userId, notes);
  }
}
