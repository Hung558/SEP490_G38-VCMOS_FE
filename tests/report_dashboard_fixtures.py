"""Synthetic, API-contract-shaped dashboard responses for isolated browser QA."""
from copy import deepcopy

REPORTS = '/api/reports'

REVENUE = {
    'period': 'custom', 'from': '2026-11-10', 'to': '2026-11-12', 'groupBy': 'day',
    'kpis': {
        'totalRevenue': 800000, 'paidInvoiceCount': 2, 'averageInvoiceValue': 400000,
        'revenueChangePercent': 100,
        'previousPeriod': {'from': '2026-11-07', 'to': '2026-11-09', 'totalRevenue': 400000, 'paidInvoiceCount': 1},
    },
    'revenueSeries': [
        {'period': '2026-11-10', 'revenue': 300000, 'invoiceCount': 1},
        {'period': '2026-11-11', 'revenue': 0, 'invoiceCount': 0},
        {'period': '2026-11-12', 'revenue': 500000, 'invoiceCount': 1},
    ],
    'byPaymentMethod': [
        {'paymentMethod': 'Cash', 'revenue': 300000, 'invoiceCount': 1, 'percentage': 37.5},
        {'paymentMethod': 'VNPay', 'revenue': 0, 'invoiceCount': 0, 'percentage': 0},
        {'paymentMethod': 'PayOS', 'revenue': 500000, 'invoiceCount': 1, 'percentage': 62.5},
    ],
    'byServiceCategory': [
        {'category': 'Examination', 'revenue': 200000, 'itemCount': 2, 'percentage': 28.6},
        {'category': 'Vaccination', 'revenue': 0, 'itemCount': 0, 'percentage': 0},
        {'category': 'Grooming', 'revenue': 300000, 'itemCount': 1, 'percentage': 42.9},
        {'category': 'Paraclinical', 'revenue': 0, 'itemCount': 0, 'percentage': 0},
        {'category': 'Inpatient', 'revenue': 200000, 'itemCount': 2, 'percentage': 28.6},
    ],
    'byItemType': [
        {'type': 'Service', 'revenue': 500000, 'itemCount': 3, 'percentage': 62.5},
        {'type': 'Product', 'revenue': 100000, 'itemCount': 1, 'percentage': 12.5},
        {'type': 'InpatientDay', 'revenue': 200000, 'itemCount': 2, 'percentage': 25},
    ],
}

OPERATIONS = {
    'period': 'custom', 'from': '2026-11-10', 'to': '2026-11-12',
    'appointments': {
        'total': 4,
        'byStatus': {'Booked': 0, 'CheckedIn': 0, 'InProgress': 0, 'WaitOwner': 0, 'Done': 2, 'Overdue': 1, 'Cancelled': 1},
        'byChannel': {'online': 3, 'walkIn': 1, 'onlineRate': 75, 'walkInRate': 25},
        'completionRate': 50, 'overdueRate': 25, 'cancellationRate': 25,
    },
    'servicesByCategory': [
        {'category': 'Examination', 'totalCount': 2, 'doneCount': 2},
        {'category': 'Grooming', 'totalCount': 2, 'doneCount': 1},
    ],
    'topServices': [
        {'serviceId': 'svc-qa-1', 'serviceName': 'Khám QA <img src=x onerror=alert(1)>', 'category': 'Examination', 'count': 2},
        {'serviceId': 'svc-qa-2', 'serviceName': 'Tắm QA', 'category': 'Grooming', 'count': 1},
    ],
    'cageOccupancy': {
        'total': 4, 'occupied': 2, 'available': 2, 'occupancyRate': 50,
        'byZone': {
            'Holding': {'total': 2, 'occupied': 1, 'available': 1, 'occupancyRate': 50},
            'InpatientWard': {'total': 2, 'occupied': 1, 'available': 1, 'occupancyRate': 50},
        },
        'isolatedCages': {'total': 1, 'occupied': 0, 'available': 1},
    },
    'overview': {'activeCustomersCount': 1, 'activePetsCount': 1, 'activeProductsCount': 1, 'inactiveProductsCount': 1},
}

FRONT_DESK = {
    'today': '2026-11-20', 'period': 'custom', 'from': '2026-11-10', 'to': '2026-11-12',
    'todayCounters': {
        'expectedToday': 1, 'checkedInNow': 2, 'inProgressNow': 3, 'waitingForPickup': 4,
        'cages': {'available': 2, 'occupied': 2, 'total': 4, 'occupancyRate': 50},
    },
    'periodStats': {
        'totalAppointments': 4,
        'appointmentsByStatus': {'Booked': 1, 'CheckedIn': 1, 'InProgress': 1, 'WaitOwner': 1, 'Done': 2, 'Overdue': 1, 'Cancelled': 1},
        'onlineCount': 3, 'walkInCount': 1, 'averageWaitMinutes': 20, 'waitTimeSampleCount': 2,
        'invoices': {
            'issuedCount': 4, 'paidCount': 2, 'unpaidCount': 1, 'totalCollected': 800000,
            'byPaymentMethod': [
                {'paymentMethod': 'Cash', 'revenue': 300000, 'invoiceCount': 1},
                {'paymentMethod': 'VNPay', 'revenue': 0, 'invoiceCount': 0},
                {'paymentMethod': 'PayOS', 'revenue': 500000, 'invoiceCount': 1},
            ],
        },
        'cageOccupancy': deepcopy(OPERATIONS['cageOccupancy']),
    },
}


def empty_front_desk():
    value = deepcopy(FRONT_DESK)
    value['todayCounters'] = {
        'expectedToday': 0, 'checkedInNow': 0, 'inProgressNow': 0, 'waitingForPickup': 0,
        'cages': {'available': 0, 'occupied': 0, 'total': 0, 'occupancyRate': 0},
    }
    value['periodStats'].update({
        'totalAppointments': 0,
        'appointmentsByStatus': {key: 0 for key in ('Booked', 'CheckedIn', 'InProgress', 'WaitOwner', 'Done', 'Overdue', 'Cancelled')},
        'onlineCount': 0, 'walkInCount': 0, 'averageWaitMinutes': None, 'waitTimeSampleCount': 0,
    })
    value['periodStats']['invoices'] = {
        'issuedCount': 0, 'paidCount': 0, 'unpaidCount': 0, 'totalCollected': 0,
        'byPaymentMethod': [
            {'paymentMethod': method, 'revenue': 0, 'invoiceCount': 0}
            for method in ('Cash', 'VNPay', 'PayOS')
        ],
    }
    value['periodStats']['cageOccupancy'] = deepcopy(value['todayCounters']['cages'])
    return value


def empty_revenue():
    value = deepcopy(REVENUE)
    value['kpis'].update({'totalRevenue': 0, 'paidInvoiceCount': 0, 'averageInvoiceValue': 0, 'revenueChangePercent': 0,
                          'previousPeriod': {'from': '2026-11-07', 'to': '2026-11-09', 'totalRevenue': 0, 'paidInvoiceCount': 0}})
    value['revenueSeries'] = [{'period': day, 'revenue': 0, 'invoiceCount': 0} for day in ('2026-11-10', '2026-11-11', '2026-11-12')]
    for key in ('byPaymentMethod', 'byServiceCategory', 'byItemType'):
        for row in value[key]:
            for metric in ('revenue', 'invoiceCount', 'itemCount', 'percentage'):
                if metric in row:
                    row[metric] = 0
    return value
