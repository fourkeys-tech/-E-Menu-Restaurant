import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const notFound = (req: Request, res: Response, next: NextFunction) => {
  next(new AppError(`Route ${req.originalUrl} tidak ditemukan`, 404));
};

export const errorHandler = (
  err: AppError | Error,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
    });
  }

  // Prisma errors
  if (err.constructor.name === 'PrismaClientKnownRequestError') {
    const prismaErr = err as any;
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
