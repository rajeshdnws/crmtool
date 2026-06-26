import { Request, Response } from 'express';
import { prisma } from '../../config/database';
import { sendSuccess, sendError } from '../../utils/response';
import { logger } from '../../config/logger';

export const getTemplates = async (req: Request, res: Response): Promise<void> => {
  try {
    const templates = await prisma.emailTemplate.findMany({
      orderBy: { createdAt: 'desc' },
    });
    sendSuccess(res, templates);
  } catch (err) {
    logger.error('getTemplates error', { err });
    sendError(res, 500, 'Failed to fetch templates');
  }
};

export const getTemplateById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const template = await prisma.emailTemplate.findUnique({ where: { id } });

    if (!template) {
      sendError(res, 404, 'Template not found');
      return;
    }

    sendSuccess(res, template);
  } catch (err) {
    logger.error('getTemplateById error', { err });
    sendError(res, 500, 'Failed to fetch template');
  }
};

export const createTemplate = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, subject, body } = req.body;

    if (!name || !subject || !body) {
      sendError(res, 400, 'Name, subject, and body are required');
      return;
    }

    const template = await prisma.emailTemplate.create({
      data: { name, subject, body },
    });

    logger.info(`Email template created: ${template.name}`);
    sendSuccess(res, template, 201);
  } catch (err) {
    logger.error('createTemplate error', { err });
    sendError(res, 500, 'Failed to create template');
  }
};

export const updateTemplate = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { name, subject, body } = req.body;

    const existing = await prisma.emailTemplate.findUnique({ where: { id } });
    if (!existing) {
      sendError(res, 404, 'Template not found');
      return;
    }

    const template = await prisma.emailTemplate.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(subject !== undefined && { subject }),
        ...(body !== undefined && { body }),
      },
    });

    sendSuccess(res, template);
  } catch (err) {
    logger.error('updateTemplate error', { err });
    sendError(res, 500, 'Failed to update template');
  }
};

export const deleteTemplate = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const existing = await prisma.emailTemplate.findUnique({ where: { id } });

    if (!existing) {
      sendError(res, 404, 'Template not found');
      return;
    }

    await prisma.emailTemplate.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    logger.error('deleteTemplate error', { err });
    sendError(res, 500, 'Failed to delete template');
  }
};
