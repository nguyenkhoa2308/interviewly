import { Module } from '@nestjs/common';

import { UsersController } from './users.controller';
import { ProfileController } from './profile.controller';
import { UsersService } from './users.service';
import { AuthModule } from '../auth/auth.module';
import { StorageModule } from '../storage/storage.module';
import { AvatarImageService } from './services/avatar-image.service';

@Module({
    imports: [AuthModule, StorageModule],
    controllers: [UsersController, ProfileController],
    providers: [UsersService, AvatarImageService],
    exports: [UsersService],
})
export class UsersModule {}
