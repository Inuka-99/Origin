import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UserRoleCache } from './user-role.cache';

@Module({
  controllers: [UsersController],
  providers: [UsersService, UserRoleCache],
  exports: [UsersService, UserRoleCache],
})
export class UsersModule {}
