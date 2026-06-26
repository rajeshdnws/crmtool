import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/database';
import { config } from '../../config/env';
import { sendSuccess, sendError } from '../../utils/response';
import { logger } from '../../config/logger';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: !config.isDev,
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
};

function generateToken(payload: { userId: string; email: string; role: string }): string {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  } as jwt.SignOptions);
}

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body as { email: string; password: string };

    if (!email || !password) {
      sendError(res, 400, 'Email and password are required');
      return;
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

    if (!user || !user.isActive) {
      sendError(res, 401, 'Invalid credentials');
      return;
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      sendError(res, 401, 'Invalid credentials');
      return;
    }

    const token = generateToken({ userId: user.id, email: user.email, role: user.role });

    res.cookie('token', token, COOKIE_OPTIONS);

    logger.info(`User logged in: ${user.email}`);

    sendSuccess(res, {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (err) {
    logger.error('Login error', { err });
    sendError(res, 500, 'Login failed');
  }
};

export const logout = (_req: Request, res: Response): void => {
  res.clearCookie('token', { httpOnly: true, sameSite: 'lax' });
  res.status(200).json({ success: true, message: 'Logged out successfully' });
};

export const getMe = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });

    if (!user) {
      sendError(res, 404, 'User not found');
      return;
    }

    sendSuccess(res, { user });
  } catch (err) {
    logger.error('GetMe error', { err });
    sendError(res, 500, 'Failed to fetch user');
  }
};

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, name, password, role } = req.body as {
      email: string;
      name: string;
      password: string;
      role?: string;
    };

    if (!email || !name || !password) {
      sendError(res, 400, 'Email, name, and password are required');
      return;
    }

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      sendError(res, 409, 'Email already registered');
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        name,
        passwordHash,
        role: (role as 'ADMIN' | 'SALES' | 'SUPPORT') || 'SALES',
      },
      select: { id: true, email: true, name: true, role: true },
    });

    logger.info(`New user registered: ${user.email}`);
    sendSuccess(res, { user }, 201);
  } catch (err) {
    logger.error('Register error', { err });
    sendError(res, 500, 'Registration failed');
  }
};

export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { name, password } = req.body;

    const dataToUpdate: any = {};
    if (name) dataToUpdate.name = name;
    if (password) dataToUpdate.passwordHash = await bcrypt.hash(password, 10);

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: dataToUpdate,
      select: { id: true, email: true, name: true, role: true, updatedAt: true },
    });

    res.json({ success: true, data: updatedUser });
  } catch (err) {
    logger.error('Update profile error', { err });
    sendError(res, 500, 'Failed to update profile');
  }
};
