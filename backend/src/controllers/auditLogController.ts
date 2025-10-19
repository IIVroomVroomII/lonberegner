import { Request, Response } from 'express';
import prisma from '../config/database';
import { logger } from '../config/logger';
import { AuthRequest } from '../middleware/auth';

export const getAuditLogs = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const teamId = authReq.user?.teamId;
    const { page = 1, limit = 50, action, entityType, userId, startDate, endDate } = req.query;

    if (!teamId) {
      return res.status(400).json({
        success: false,
        message: 'Bruger er ikke tilknyttet et team'
      });
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where: any = {
      user: {
        teamId
      }
    };

    if (action) {
      where.action = action;
    }

    if (entityType) {
      where.entityType = entityType;
    }

    if (userId) {
      where.userId = userId;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate as string);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate as string);
      }
    }

    // Get total count
    const total = await prisma.auditLog.count({ where });

    // Get audit logs
    const auditLogs = await prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: limitNum
    });

    return res.json({
      success: true,
      data: {
        auditLogs: auditLogs.map(log => ({
          id: log.id,
          action: log.action,
          entityType: log.entityType,
          entityId: log.entityId,
          userName: log.user.name,
          userEmail: log.user.email,
          userRole: log.user.role,
          oldValue: log.oldValue,
          newValue: log.newValue,
          comment: log.comment,
          ipAddress: log.ipAddress,
          createdAt: log.createdAt
        })),
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum)
        }
      }
    });

  } catch (error: any) {
    logger.error('Error fetching audit logs:', error);
    return res.status(500).json({
      success: false,
      message: 'Fejl ved hentning af audit logs'
    });
  }
};

export const getAuditLogStats = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const teamId = authReq.user?.teamId;

    if (!teamId) {
      return res.status(400).json({
        success: false,
        message: 'Bruger er ikke tilknyttet et team'
      });
    }

    // Get logs from last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const logs = await prisma.auditLog.findMany({
      where: {
        user: { teamId },
        createdAt: { gte: thirtyDaysAgo }
      },
      select: {
        action: true,
        entityType: true,
        createdAt: true
      }
    });

    // Count by action
    const actionCounts = logs.reduce((acc, log) => {
      acc[log.action] = (acc[log.action] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Count by entity type
    const entityTypeCounts = logs.reduce((acc, log) => {
      acc[log.entityType] = (acc[log.entityType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Activity by day (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentLogs = logs.filter(log => log.createdAt >= sevenDaysAgo);
    const dailyActivity = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const count = recentLogs.filter(log => {
        const logDate = new Date(log.createdAt);
        return logDate >= date && logDate < nextDate;
      }).length;

      return {
        date: date.toISOString().split('T')[0],
        count
      };
    });

    return res.json({
      success: true,
      data: {
        totalLogs: logs.length,
        actionCounts,
        entityTypeCounts,
        dailyActivity
      }
    });

  } catch (error: any) {
    logger.error('Error fetching audit log stats:', error);
    return res.status(500).json({
      success: false,
      message: 'Fejl ved hentning af audit log statistik'
    });
  }
};
