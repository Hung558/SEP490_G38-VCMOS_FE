"""Synthetic, API-contract-shaped dashboard responses for isolated browser QA."""
from copy import deepcopy
from datetime import datetime, timedelta

REPORTS = '/api/reports'
TODAY = datetime.now().date()

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
        {'category': 'Vaccination', 'totalCount': 0, 'doneCount': 0},
        {'category': 'Grooming', 'totalCount': 2, 'doneCount': 1},
        {'category': 'Paraclinical', 'totalCount': 0, 'doneCount': 0},
        {'category': 'Inpatient', 'totalCount': 0, 'doneCount': 0},
    ],
    'topServices': [
        {'rank': 1, 'serviceId': 'svc-qa-1', 'code': 'SVC-QA-01', 'name': 'Khám tổng quát', 'category': 'Examination', 'count': 2, 'doneCount': 2},
        {'rank': 2, 'serviceId': 'svc-qa-2', 'code': 'SVC-QA-02', 'name': 'Tắm và vệ sinh', 'category': 'Grooming', 'count': 1, 'doneCount': 1},
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
    'today': TODAY.isoformat(), 'period': 'custom', 'from': '2026-11-10', 'to': '2026-11-12',
    'todayCounters': {
        'expectedToday': 1, 'checkedInNow': 2, 'inProgressNow': 3, 'waitingForPickup': 4,
        'cages': {'available': 2, 'occupied': 2, 'total': 4, 'occupancyRate': 50},
    },
    'periodStats': {
        'totalAppointments': 4,
        'appointmentsByStatus': {'Booked': 1, 'CheckedIn': 1, 'InProgress': 0, 'WaitOwner': 0, 'Done': 1, 'Overdue': 0, 'Cancelled': 1},
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
    value['periodStats']['cageOccupancy'] = {
        'total': 0, 'occupied': 0, 'available': 0, 'occupancyRate': 0,
        'byZone': {
            'Holding': {'total': 0, 'occupied': 0, 'available': 0, 'occupancyRate': 0},
            'InpatientWard': {'total': 0, 'occupied': 0, 'available': 0, 'occupancyRate': 0},
        },
        'isolatedCages': {'total': 0, 'occupied': 0, 'available': 0},
    }
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


def echo_report_range(payload, query, *, revenue=False):
    """Echo requested dates and BE-derived preset ranges in fixture responses."""
    result = deepcopy(payload)
    period = query.get('period', ['day'])[0]
    if query.get('from') and query.get('to'):
        start, end = query['from'][0], query['to'][0]
    elif period == 'week':
        monday = TODAY - timedelta(days=TODAY.weekday())
        start, end = monday.isoformat(), (monday + timedelta(days=6)).isoformat()
    elif period == 'month':
        first = TODAY.replace(day=1)
        next_month = (first.replace(day=28) + timedelta(days=4)).replace(day=1)
        start, end = first.isoformat(), (next_month - timedelta(days=1)).isoformat()
    else:
        start = end = TODAY.isoformat()
    result.update({'period': period, 'from': start, 'to': end})
    if revenue:
        start_day = datetime.fromisoformat(start).date()
        end_day = datetime.fromisoformat(end).date()
        previous_end = start_day - timedelta(days=1)
        previous_start = previous_end.replace(day=1) if period == 'month' else start_day - timedelta(days=(end_day - start_day).days + 1)
        result['kpis']['previousPeriod'].update({'from': previous_start.isoformat(), 'to': previous_end.isoformat()})
        days = (datetime.fromisoformat(end) - datetime.fromisoformat(start)).days + 1
        group_by = query.get('groupBy', ['month' if days > 62 else 'day'])[0]
        result['groupBy'] = group_by
        buckets = []
        cursor = start_day
        while cursor <= end_day:
            key = cursor.strftime('%Y-%m') if group_by == 'month' else cursor.isoformat()
            if not buckets or buckets[-1]['period'] != key:
                buckets.append({'period': key, 'revenue': 0, 'invoiceCount': 0})
            cursor += timedelta(days=1)
        if start == '2026-11-10' and end == '2026-11-12' and group_by == 'day':
            buckets = deepcopy(payload['revenueSeries'])
        else:
            buckets[0].update({'revenue': payload['kpis']['totalRevenue'], 'invoiceCount': payload['kpis']['paidInvoiceCount']})
        result['revenueSeries'] = buckets
    return result
