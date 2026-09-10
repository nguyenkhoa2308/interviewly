import { ArgumentsHost, BadRequestException } from '@nestjs/common';
import { jest } from '@jest/globals';
import type { Response } from 'express';

import { HttpExceptionFilter } from './http-exception.filter';

describe('HttpExceptionFilter', () => {
    function createHost(response: Partial<Response>) {
        return {
            switchToHttp: () => ({ getResponse: () => response }),
        } as unknown as ArgumentsHost;
    }

    it('does not write a second response after headers were sent', () => {
        const response = {
            headersSent: true,
            status: jest.fn(),
            json: jest.fn(),
        } as unknown as Response;

        new HttpExceptionFilter().catch(
            new BadRequestException('invalid'),
            createHost(response),
        );

        expect(response.status).not.toHaveBeenCalled();
        expect(response.json).not.toHaveBeenCalled();
    });

    it('keeps the global error response contract for unsent responses', () => {
        const json = jest.fn();
        const status = jest.fn(() => ({ json }));
        const response = {
            headersSent: false,
            status,
        } as unknown as Response;

        new HttpExceptionFilter().catch(
            new BadRequestException({
                code: 'INVALID_INPUT',
                message: 'Dữ liệu không hợp lệ.',
            }),
            createHost(response),
        );

        expect(status).toHaveBeenCalledWith(400);
        expect(json).toHaveBeenCalledWith({
            success: false,
            error: {
                statusCode: 400,
                code: 'INVALID_INPUT',
                message: 'Dữ liệu không hợp lệ.',
            },
        });
    });
});
