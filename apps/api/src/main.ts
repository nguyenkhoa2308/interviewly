import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';

import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    const configService = app.get(ConfigService);
    const port = configService.get<number>('PORT') ?? 8000;
    const frontendUrl =
        configService.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';

    app.use(cookieParser());

    app.enableCors({
        origin: frontendUrl,
        credentials: true,
    });

    app.useGlobalPipes(
        new ValidationPipe({
            transform: true,
            whitelist: true,
            forbidNonWhitelisted: true,
        }),
    );

    app.useGlobalFilters(new HttpExceptionFilter());

    app.useGlobalInterceptors(new ResponseInterceptor());

    app.setGlobalPrefix('api/v1');

    const swaggerConfig = new DocumentBuilder()
        .setTitle('Interviewly API')
        .setDescription('Interviewly backend API documentation')
        .setVersion('1.0')
        .addBearerAuth()
        .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);

    SwaggerModule.setup('api/docs', app, document);

    const logger = new Logger('Bootstrap');

    await app.listen(port);
    logger.log(`API running on http://localhost:${port}`);
    logger.log(`Docs available at http://localhost:${port}/api/docs`);
}
bootstrap();
