import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AiModule } from './ai/ai.module';
import { BullModule } from '@nestjs/bullmq';
import Redis from 'ioredis';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }), // Cho phép đọc biến môi trường từ file .env
    // Kết nối BullMQ với redis
    BullModule.forRootAsync({
      imports:[ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const host = configService.get<string>('REDIS_HOST','127.0.0.1')
        const port = configService.get<number>('REDIS_PORT', 6379)

        // Khởi tạo ioredis client
        const redisInstance = new Redis({
          host,
          port,
          password: undefined,
          maxRetriesPerRequest: null,
          enableReadyCheck: false,
        });

        return {
          connection: redisInstance
        }
      },
      inject: [ConfigService],
    }),
    AiModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
