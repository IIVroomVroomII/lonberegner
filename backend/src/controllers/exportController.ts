import { Request, Response } from 'express';
import economicExportService from '../services/economicExportService';
import danlonExportService from '../services/danlonExportService';
import { logger } from '../config/logger';

export const exportToEconomic = async (req: Request, res: Response) => {
  try {
    const { payrollId } = req.params;

    await economicExportService.exportPayroll(payrollId);

    return res.json({
      success: true,
      message: 'Lønberegning eksporteret til e-conomic succesfuldt',
    });
  } catch (error: any) {
    logger.error('Error exporting to e-conomic:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Der opstod en fejl ved eksport til e-conomic',
    });
  }
};

export const testEconomicConnection = async (req: Request, res: Response) => {
  try {
    const isConnected = await economicExportService.testConnection();

    return res.json({
      success: true,
      data: {
        connected: isConnected,
      },
      message: isConnected
        ? 'Forbindelse til e-conomic fungerer'
        : 'Kan ikke forbinde til e-conomic',
    });
  } catch (error: any) {
    logger.error('Error testing e-conomic connection:', error);
    return res.status(500).json({
      success: false,
      message: 'Der opstod en fejl ved test af e-conomic forbindelse',
    });
  }
};

export const exportToDanlon = async (req: Request, res: Response) => {
  try {
    const { payrollId } = req.params;

    const csv = await danlonExportService.exportPayroll(payrollId);

    // Set headers for CSV download
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=danlon_export_${payrollId}.csv`);

    return res.send(csv);
  } catch (error: any) {
    logger.error('Error exporting to Danløn:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Der opstod en fejl ved eksport til Danløn',
    });
  }
};

export const exportMultipleToDanlon = async (req: Request, res: Response) => {
  try {
    const { payrollIds } = req.body;

    if (!Array.isArray(payrollIds) || payrollIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Mindst én lønberegning skal vælges',
      });
    }

    const csv = await danlonExportService.exportMultiplePayrolls(payrollIds);

    // Set headers for CSV download
    const timestamp = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=danlon_export_${timestamp}.csv`);

    return res.send(csv);
  } catch (error: any) {
    logger.error('Error exporting multiple payrolls to Danløn:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Der opstod en fejl ved eksport til Danløn',
    });
  }
};
