import {
    Injectable,
    ConflictException,
    InternalServerErrorException,
    Logger,
    NotFoundException,
    ServiceUnavailableException,
    UnprocessableEntityException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { CVProcessingStatus, Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { getCvStorageKey } from './constants/cv.constant';
import { UploadCvDto } from './dto/upload-cv.dto';
import { ListCvsQueryDto } from './dto/list-cvs-query.dto';
import { RenameCvDto } from './dto/rename-cv.dto';
import { PdfParserService } from './pdf-parser/pdf-parser.service';
import { PdfParsingException } from './pdf-parser/pdf-parser.types';
import { CvStructureService } from './cv-structure/cv-structure.service';

export type UploadedCv = {
    id: string;
    name: string;
    originalFilename: string;
    mimeType: string;
    fileSize: number | null;
    processingStatus: CVProcessingStatus;
    isDefault: boolean;
    createdAt: Date;
};

const UPLOADED_CV_SELECT = {
    id: true,
    name: true,
    originalFilename: true,
    mimeType: true,
    fileSize: true,
    processingStatus: true,
    isDefault: true,
    createdAt: true,
} as const;

const CV_LIST_SELECT = {
    ...UPLOADED_CV_SELECT,
    updatedAt: true,
} as const;

const CV_DETAIL_SELECT = {
    ...CV_LIST_SELECT,
    extractedText: true,
    structuredContent: true,
} as const;

const CV_VERSION_PUBLIC_SELECT = {
    id: true,
    cvId: true,
    versionNumber: true,
    originalFilename: true,
    mimeType: true,
    fileSize: true,
    processingStatus: true,
    createdAt: true,
    updatedAt: true,
} as const;

@Injectable()
export class CvService {
    private readonly logger = new Logger(CvService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly storageService: StorageService,
        private readonly pdfParserService: PdfParserService,
        private readonly cvStructureService: CvStructureService,
    ) {}

    async listCvs(userId: string, query: ListCvsQueryDto) {
        const where = {
            userId,
            deletedAt: null,
            ...(query.status && { processingStatus: query.status }),
        };
        const skip = (query.page - 1) * query.limit;

        try {
            const [items, total] = await this.prisma.$transaction([
                this.prisma.cV.findMany({
                    where,
                    select: CV_LIST_SELECT,
                    orderBy: { createdAt: 'desc' },
                    skip,
                    take: query.limit,
                }),
                this.prisma.cV.count({ where }),
            ]);

            return {
                items,
                pagination: {
                    page: query.page,
                    limit: query.limit,
                    total,
                    totalPages: Math.ceil(total / query.limit),
                },
            };
        } catch (error) {
            this.logDatabaseError('Không thể tải danh sách CV.', error);
            throw new InternalServerErrorException({
                code: 'CV_LIST_FAILED',
                message: 'Không thể tải danh sách CV. Vui lòng thử lại.',
            });
        }
    }

    async getCv(userId: string, cvId: string) {
        return this.findActiveCvOrThrow(userId, cvId, CV_DETAIL_SELECT);
    }

    async listVersions(userId: string, cvId: string) {
        const cv = await this.findActiveCvOrThrow(userId, cvId, {
            id: true,
            currentVersionId: true,
        });
        const versions = await this.prisma.cVVersion.findMany({
            where: { cvId: cv.id },
            select: CV_VERSION_PUBLIC_SELECT,
            orderBy: { versionNumber: 'desc' },
        });
        return versions.map((version) => ({
            ...version,
            isCurrent: version.id === cv.currentVersionId,
        }));
    }

    async uploadVersion(
        userId: string,
        cvId: string,
        file: Express.Multer.File,
    ) {
        await this.findActiveCvOrThrow(userId, cvId, { id: true });
        const versionId = randomUUID();
        const storageKey = getCvStorageKey(userId, cvId, versionId);
        try {
            const latest = await this.prisma.cVVersion.findFirst({
                where: { cvId },
                select: { versionNumber: true },
                orderBy: { versionNumber: 'desc' },
            });
            await this.prisma.cVVersion.create({
                data: {
                    id: versionId,
                    cvId,
                    versionNumber: (latest?.versionNumber ?? 0) + 1,
                    originalFilename: file.originalname,
                    storageKey,
                    mimeType: file.mimetype,
                    fileSize: file.size,
                    processingStatus: CVProcessingStatus.UPLOADING,
                },
            });
        } catch (error) {
            if (this.isPrismaUniqueConstraintError(error)) {
                throw new ConflictException({
                    code: 'CV_VERSION_CONFLICT',
                    message:
                        'Một phiên bản mới vừa được tạo. Vui lòng thử lại.',
                });
            }
            throw new InternalServerErrorException({
                code: 'CV_VERSION_CREATE_FAILED',
                message: 'Không thể khởi tạo phiên bản CV.',
            });
        }
        try {
            await this.storageService.uploadPrivate(
                storageKey,
                file.buffer,
                file.mimetype,
            );
            await this.prisma.cVVersion.update({
                where: { id: versionId },
                data: { processingStatus: CVProcessingStatus.PROCESSING },
            });
            const { text: extractedText } = await this.pdfParserService.parse(
                file.buffer,
            );
            const structuredContent =
                await this.cvStructureService.normalize(extractedText);
            const readyData = {
                originalFilename: file.originalname,
                storageKey,
                mimeType: file.mimetype,
                fileSize: file.size,
                extractedText,
                structuredContent: structuredContent ?? Prisma.JsonNull,
                processingStatus: CVProcessingStatus.READY,
                processingErrorCode: null,
                processingError: null,
            };
            const [, cv] = await this.prisma.$transaction([
                this.prisma.cVVersion.update({
                    where: { id: versionId },
                    data: readyData,
                }),
                this.prisma.cV.update({
                    where: { id: cvId },
                    data: { currentVersionId: versionId, ...readyData },
                    select: CV_DETAIL_SELECT,
                }),
            ]);
            return cv;
        } catch (error) {
            await this.markVersionFailed(versionId, error);
            if (error instanceof PdfParsingException) {
                throw new UnprocessableEntityException({
                    code: error.code,
                    message: error.safeMessage,
                });
            }
            throw new InternalServerErrorException({
                code: 'CV_VERSION_PROCESSING_FAILED',
                message: 'Không thể xử lý phiên bản CV mới.',
            });
        }
    }

    async setCurrentVersion(userId: string, cvId: string, versionId: string) {
        await this.findActiveCvOrThrow(userId, cvId, { id: true });
        const version = await this.prisma.cVVersion.findFirst({
            where: { id: versionId, cvId },
        });
        if (!version)
            throw new NotFoundException({
                code: 'CV_VERSION_NOT_FOUND',
                message: 'Không tìm thấy phiên bản CV.',
            });
        if (version.processingStatus !== CVProcessingStatus.READY) {
            throw new ConflictException({
                code: 'CV_VERSION_NOT_READY',
                message: 'Chỉ có thể chọn phiên bản đã xử lý thành công.',
            });
        }
        return this.prisma.cV.update({
            where: { id: cvId },
            data: {
                currentVersionId: version.id,
                originalFilename: version.originalFilename,
                storageKey: version.storageKey,
                mimeType: version.mimeType,
                fileSize: version.fileSize,
                extractedText: version.extractedText,
                structuredContent: version.structuredContent ?? Prisma.JsonNull,
                processingStatus: version.processingStatus,
                processingErrorCode: null,
                processingError: null,
            },
            select: CV_DETAIL_SELECT,
        });
    }

    async renameCv(userId: string, cvId: string, dto: RenameCvDto) {
        await this.findActiveCvOrThrow(userId, cvId, { id: true });

        try {
            const result = await this.prisma.cV.updateMany({
                where: { id: cvId, userId, deletedAt: null },
                data: { name: dto.name },
            });
            if (result.count !== 1) this.throwCvNotFound();
            return this.findActiveCvOrThrow(userId, cvId, CV_LIST_SELECT);
        } catch (error) {
            if (error instanceof NotFoundException) throw error;
            this.logDatabaseError('Không thể đổi tên CV.', error);
            throw new InternalServerErrorException({
                code: 'CV_RENAME_FAILED',
                message: 'Không thể đổi tên CV. Vui lòng thử lại.',
            });
        }
    }

    async setDefaultCv(userId: string, cvId: string) {
        await this.findActiveCvOrThrow(userId, cvId, { id: true });

        try {
            await this.prisma.$transaction(async (transaction) => {
                await transaction.cV.updateMany({
                    where: { userId, deletedAt: null, isDefault: true },
                    data: { isDefault: false },
                });
                const target = await transaction.cV.updateMany({
                    where: { id: cvId, userId, deletedAt: null },
                    data: { isDefault: true },
                });
                if (target.count !== 1) this.throwCvNotFound();
            });
            return this.findActiveCvOrThrow(userId, cvId, CV_LIST_SELECT);
        } catch (error) {
            if (error instanceof NotFoundException) throw error;
            if (this.isPrismaUniqueConstraintError(error)) {
                throw new ConflictException({
                    code: 'CV_DEFAULT_CONFLICT',
                    message: 'CV mặc định vừa được thay đổi. Vui lòng thử lại.',
                });
            }
            this.logDatabaseError('Không thể đặt CV mặc định.', error);
            throw new InternalServerErrorException({
                code: 'CV_DEFAULT_UPDATE_FAILED',
                message: 'Không thể đặt CV mặc định. Vui lòng thử lại.',
            });
        }
    }

    async deleteCv(userId: string, cvId: string) {
        await this.findActiveCvOrThrow(userId, cvId, { id: true });

        try {
            const deletedAt = new Date();
            const result = await this.prisma.cV.updateMany({
                where: { id: cvId, userId, deletedAt: null },
                data: { deletedAt, isDefault: false },
            });
            if (result.count !== 1) this.throwCvNotFound();
            return { id: cvId, deletedAt };
        } catch (error) {
            if (error instanceof NotFoundException) throw error;
            this.logDatabaseError('Không thể xóa CV.', error);
            throw new InternalServerErrorException({
                code: 'CV_DELETE_FAILED',
                message: 'Không thể xóa CV. Vui lòng thử lại.',
            });
        }
    }

    async uploadCv(
        userId: string,
        file: Express.Multer.File,
        dto: UploadCvDto,
    ): Promise<UploadedCv> {
        const cvId = randomUUID();
        const cvVersionId = randomUUID();
        const storageKey = getCvStorageKey(userId, cvId, cvVersionId);

        try {
            await this.prisma.$transaction(async (transaction) => {
                const fileData = {
                    originalFilename: file.originalname,
                    storageKey,
                    mimeType: file.mimetype,
                    fileSize: file.size,
                    processingStatus: CVProcessingStatus.UPLOADING,
                };
                await transaction.cV.create({
                    data: {
                        id: cvId,
                        userId,
                        name: dto.name,
                        ...fileData,
                        isDefault: false,
                    },
                    select: { id: true },
                });
                await transaction.cVVersion.create({
                    data: {
                        id: cvVersionId,
                        cvId,
                        versionNumber: 1,
                        ...fileData,
                    },
                    select: { id: true },
                });
                await transaction.cV.update({
                    where: { id: cvId },
                    data: { currentVersionId: cvVersionId },
                    select: { id: true },
                });
            });
        } catch (error) {
            this.logger.error(
                'Không thể tạo bản ghi CV.',
                error instanceof Error ? error.stack : undefined,
            );
            throw new InternalServerErrorException({
                code: 'CV_CREATE_FAILED',
                message: 'Không thể khởi tạo CV. Vui lòng thử lại.',
            });
        }

        try {
            await this.storageService.uploadPrivate(
                storageKey,
                file.buffer,
                file.mimetype,
            );
        } catch {
            await this.markFailed(
                cvId,
                cvVersionId,
                'STORAGE_UPLOAD_FAILED',
                'Không thể lưu tệp CV vào storage.',
            );
            throw new ServiceUnavailableException({
                code: 'CV_UPLOAD_FAILED',
                message: 'Không thể tải CV lên. Vui lòng thử lại.',
            });
        }

        try {
            const processingData = {
                processingStatus: CVProcessingStatus.PROCESSING,
                processingErrorCode: null,
                processingError: null,
            };
            await this.prisma.$transaction([
                this.prisma.cV.update({
                    where: { id: cvId },
                    data: processingData,
                    select: { id: true },
                }),
                this.prisma.cVVersion.update({
                    where: { id: cvVersionId },
                    data: processingData,
                    select: { id: true },
                }),
            ]);
        } catch (error) {
            this.logger.error(
                'Đã tải tệp nhưng không thể cập nhật trạng thái CV.',
                error instanceof Error ? error.stack : undefined,
            );
            await this.cleanupUploadedFile(storageKey);
            await this.markFailed(
                cvId,
                cvVersionId,
                'CV_STATUS_UPDATE_FAILED',
                'Tệp đã được tải lên nhưng không thể cập nhật trạng thái CV.',
            );

            throw new InternalServerErrorException({
                code: 'CV_UPLOAD_FAILED',
                message: 'Không thể hoàn tất tải CV. Vui lòng thử lại.',
            });
        }

        let extractedText: string;

        try {
            ({ text: extractedText } = await this.pdfParserService.parse(
                file.buffer,
            ));
        } catch (error) {
            const parsingError =
                error instanceof PdfParsingException
                    ? error
                    : new PdfParsingException(
                          'CV_PDF_PARSE_FAILED',
                          'Không thể đọc nội dung tệp PDF.',
                      );

            await this.markFailed(
                cvId,
                cvVersionId,
                parsingError.code,
                parsingError.safeMessage,
            );

            throw new UnprocessableEntityException({
                code: parsingError.code,
                message: parsingError.safeMessage,
            });
        }

        try {
            const structuredContent =
                await this.cvStructureService.normalize(extractedText);

            const readyData = {
                extractedText,
                structuredContent: structuredContent ?? Prisma.JsonNull,
                processingStatus: CVProcessingStatus.READY,
                processingErrorCode: null,
                processingError: null,
            };
            const [, result] = await this.prisma.$transaction([
                this.prisma.cVVersion.update({
                    where: { id: cvVersionId },
                    data: readyData,
                    select: { id: true },
                }),
                this.prisma.cV.update({
                    where: { id: cvId },
                    data: readyData,
                    select: UPLOADED_CV_SELECT,
                }),
            ]);
            return result;
        } catch (error) {
            this.logger.error(
                'Không thể lưu nội dung đã trích xuất và hoàn tất xử lý CV.',
                error instanceof Error ? error.stack : undefined,
            );
            await this.markFailed(
                cvId,
                cvVersionId,
                'CV_PROCESSING_FAILED',
                'Không thể hoàn tất xử lý nội dung CV.',
            );

            throw new InternalServerErrorException({
                code: 'CV_PROCESSING_FAILED',
                message: 'Không thể hoàn tất xử lý CV. Vui lòng thử lại.',
            });
        }
    }

    private async findActiveCvOrThrow<TSelect extends Prisma.CVSelect>(
        userId: string,
        cvId: string,
        select: TSelect,
    ): Promise<Prisma.CVGetPayload<{ select: TSelect }>> {
        let cv: Prisma.CVGetPayload<{ select: TSelect }> | null;

        try {
            cv = await this.prisma.cV.findFirst({
                where: { id: cvId, userId, deletedAt: null },
                select,
            });
        } catch (error) {
            this.logDatabaseError('Không thể tải CV.', error);
            throw new InternalServerErrorException({
                code: 'CV_READ_FAILED',
                message: 'Không thể tải CV. Vui lòng thử lại.',
            });
        }

        if (!cv) this.throwCvNotFound();
        return cv;
    }

    private throwCvNotFound(): never {
        throw new NotFoundException({
            code: 'CV_NOT_FOUND',
            message: 'Không tìm thấy CV.',
        });
    }

    private isPrismaUniqueConstraintError(error: unknown): boolean {
        return (
            typeof error === 'object' &&
            error !== null &&
            'code' in error &&
            error.code === 'P2002'
        );
    }

    private logDatabaseError(message: string, error: unknown): void {
        this.logger.error(
            message,
            error instanceof Error ? error.stack : undefined,
        );
    }

    private async markFailed(
        cvId: string,
        cvVersionId: string,
        errorCode: string,
        errorMessage: string,
    ): Promise<void> {
        try {
            const failedData = {
                processingStatus: CVProcessingStatus.FAILED,
                processingErrorCode: errorCode,
                processingError: errorMessage,
            };
            await this.prisma.$transaction([
                this.prisma.cV.update({
                    where: { id: cvId },
                    data: failedData,
                }),
                this.prisma.cVVersion.update({
                    where: { id: cvVersionId },
                    data: failedData,
                }),
            ]);
        } catch (error) {
            this.logger.error(
                'Không thể đánh dấu CV tải lên thất bại.',
                error instanceof Error ? error.stack : undefined,
            );
        }
    }

    private async cleanupUploadedFile(storageKey: string): Promise<void> {
        try {
            await this.storageService.deletePrivate(storageKey);
        } catch (error) {
            this.logger.error(
                'Không thể dọn tệp CV sau khi cập nhật database thất bại.',
                error instanceof Error ? error.stack : undefined,
            );
        }
    }

    private async markVersionFailed(versionId: string, error: unknown) {
        const parsingError =
            error instanceof PdfParsingException ? error : null;
        try {
            await this.prisma.cVVersion.update({
                where: { id: versionId },
                data: {
                    processingStatus: CVProcessingStatus.FAILED,
                    processingErrorCode:
                        parsingError?.code ?? 'CV_VERSION_PROCESSING_FAILED',
                    processingError:
                        parsingError?.safeMessage ??
                        'Không thể xử lý phiên bản CV.',
                },
            });
        } catch (updateError) {
            this.logDatabaseError(
                'Không thể đánh dấu phiên bản CV thất bại.',
                updateError,
            );
        }
    }
}
