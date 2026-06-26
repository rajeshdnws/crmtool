import { Response } from 'express';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  meta?: Record<string, unknown>;
}

export const sendSuccess = <T>(
  res: Response,
  data: T,
  statusCode = 200,
  meta?: Record<string, unknown>,
): void => {
  const response: ApiResponse<T> = { success: true, data };
  if (meta) response.meta = meta;
  res.status(statusCode).json(response);
};

export const sendError = (res: Response, statusCode: number, error: string): void => {
  const response: ApiResponse = { success: false, error };
  res.status(statusCode).json(response);
};

export const sendMessage = (res: Response, message: string, statusCode = 200): void => {
  const response: ApiResponse = { success: true, message };
  res.status(statusCode).json(response);
};
