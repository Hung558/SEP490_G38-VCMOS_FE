export type ReportPeriod = 'day' | 'week' | 'month' | 'custom';
export type ReportGroupBy = 'day' | 'month';
export interface ReportFilters {
  period: ReportPeriod;
  from?: string;
  to?: string;
  groupBy?: ReportGroupBy;
}
export interface RevenueReport {
  period: ReportPeriod;
  from: string;
  to: string;
  groupBy: ReportGroupBy;
  kpis: {
    totalRevenue: number;
    paidInvoiceCount: number;
    averageInvoiceValue: number;
    revenueChangePercent: number | null;
    previousPeriod: {
      from: string;
      to: string;
      totalRevenue: number;
      paidInvoiceCount: number;
    };
  };
  revenueSeries: { period: string; revenue: number; invoiceCount: number }[];
  byPaymentMethod: {
    paymentMethod: 'Cash' | 'VNPay' | 'PayOS';
    revenue: number;
    invoiceCount: number;
    percentage: number;
  }[];
  byServiceCategory: {
    category: string;
    revenue: number;
    itemCount: number;
    percentage: number;
  }[];
  byItemType: {
    type: 'Service' | 'Product' | 'InpatientDay';
    revenue: number;
    itemCount: number;
    percentage: number;
  }[];
}
export type AppointmentStatus =
  | 'Booked'
  | 'CheckedIn'
  | 'InProgress'
  | 'WaitOwner'
  | 'Done'
  | 'Overdue'
  | 'Cancelled';
export interface CageZone {
  total: number;
  occupied: number;
  available: number;
  occupancyRate: number;
}
export interface CageOccupancy extends CageZone {
  byZone: { Holding: CageZone; InpatientWard: CageZone };
  isolatedCages: Omit<CageZone, 'occupancyRate'>;
}
export interface OperationsReport {
  period: ReportPeriod;
  from: string;
  to: string;
  appointments: {
    total: number;
    byStatus: Record<AppointmentStatus, number>;
    byChannel: {
      online: number;
      walkIn: number;
      onlineRate: number;
      walkInRate: number;
    };
    completionRate: number;
    overdueRate: number;
    cancellationRate: number;
  };
  servicesByCategory: {
    category: string;
    totalCount: number;
    doneCount: number;
  }[];
  topServices: {
    rank: number;
    serviceId: string;
    code: string | null;
    name: string;
    category: string | null;
    count: number;
    doneCount: number;
  }[];
  cageOccupancy: CageOccupancy;
  overview: {
    activeCustomersCount: number;
    activePetsCount: number;
    activeProductsCount: number;
    inactiveProductsCount: number;
  };
}
export interface FrontDeskReport {
  today: string;
  period: ReportPeriod;
  from: string;
  to: string;
  todayCounters: {
    expectedToday: number;
    checkedInNow: number;
    inProgressNow: number;
    waitingForPickup: number;
    cages: CageZone;
  };
  periodStats: {
    totalAppointments: number;
    appointmentsByStatus: Record<AppointmentStatus, number>;
    onlineCount: number;
    walkInCount: number;
    averageWaitMinutes: number | null;
    waitTimeSampleCount: number;
    invoices: {
      issuedCount: number;
      paidCount: number;
      unpaidCount: number;
      totalCollected: number;
      byPaymentMethod: {
        paymentMethod: string;
        revenue: number;
        invoiceCount: number;
      }[];
    };
    cageOccupancy: CageOccupancy;
  };
}
