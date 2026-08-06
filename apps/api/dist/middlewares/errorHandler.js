"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = exports.notFound = exports.AppError = void 0;
class AppError extends Error {
    constructor(message, statusCode = 500) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
const notFound = (req, res, next) => {
    next(new AppError(`Route ${req.originalUrl} tidak ditemukan`, 404));
};
exports.notFound = notFound;
const errorHandler = (err, req, res, _next) => {
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            success: false,
            error: err.message,
        });
    }
    // Prisma errors
    if (err.constructor.name === 'PrismaClientKnownRequestError') {
        const prismaErr = err;
        if (prismaErr.code === 'P2002') {
            return res.status(409).json({
                success: false,
                error: 'Data sudah ada (duplikat).',
                field: prismaErr.meta?.target,
            });
        }
        if (prismaErr.code === 'P2025') {
            return res.status(404).json({ success: false, error: 'Data tidak ditemukan.' });
        }
    }
    console.error('Unhandled error:', err);
    return res.status(500).json({
        success: false,
        error: process.env.NODE_ENV === 'production' ? 'Terjadi kesalahan server.' : err.message,
    });
};
exports.errorHandler = errorHandler;
//# sourceMappingURL=errorHandler.js.map