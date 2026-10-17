"""Analysis of gateway-supplied aggregates; no identities or fabricated samples."""
from datetime import date, timedelta
from math import isfinite


def forecast_history(data):
    if not isinstance(data, dict) or set(data) != {'history', 'today', 'timezone'} or data['timezone'] != 'Asia/Manila':
        raise ValueError('Expected calendar aggregates only.')
    today = date.fromisoformat(data['today'])
    history = data['history']
    if not isinstance(history, list) or not 14 <= len(history) <= 90:
        raise ValueError('At least 14 complete days are required.')
    previous = None
    for row in history:
        if set(row) != {'date', 'volume'} or isinstance(row['volume'], bool) or not isinstance(row['volume'], int) or not 0 <= row['volume'] <= 2147483647:
            raise ValueError('Invalid daily volume.')
        day = date.fromisoformat(row['date'])
        if day >= today or previous and day != previous + timedelta(days=1):
            raise ValueError('History must contain consecutive complete days.')
        previous = day
    if previous != today - timedelta(days=1):
        raise ValueError('History must end yesterday.')
    return history, today


def document_advice(data):
    if not isinstance(data, dict) or set(data) != {'end_to_end', 'stages', 'released', 'range'}:
        raise ValueError('Expected document measurements only.')
    if not isinstance(data['range'], dict) or set(data['range']) - {'dateFrom', 'dateTo', 'days'}:
        raise ValueError('Invalid reporting range.')
    for key in ('dateFrom', 'dateTo'):
        if data['range'].get(key) is not None:
            date.fromisoformat(data['range'][key])
    end = data['end_to_end']
    if set(end) != {'completed_count', 'avg_minutes', 'min_minutes', 'max_minutes'}:
        raise ValueError('Invalid completion measurements.')
    stages = data['stages']
    if not isinstance(stages, list) or len(stages) > 50:
        raise ValueError('Invalid stage measurements.')
    rows = []
    for row in stages:
        if set(row) != {'stage', 'transitions', 'avg_minutes'} or not isinstance(row['stage'], str) or len(row['stage']) > 100:
            raise ValueError('Invalid stage aggregate.')
        rows.extend([row['transitions'], row['avg_minutes']])
    rows.extend(end.values())
    rows.append(data['released'])
    if any(isinstance(v, bool) or not isinstance(v, (int, float)) or not isfinite(v) or v < 0 for v in rows):
        raise ValueError('Invalid measurement.')
    result = []
    def add(title, message, samples):
        result.append(dict(type='info', title=title, message=message, method='aggregate_rules', sample_size=samples))
    if not end['completed_count']:
        add('Completion history is insufficient', 'No completed documents with measured audit history are available in this report. No processing-speed conclusion is inferred.', 0)
    else:
        add('Observed completion time', f"{end['completed_count']} completed documents average {end['avg_minutes']} minutes from the first to last recorded workflow action. This is observed history, not a forecast.", end['completed_count'])
    sampled = [row for row in stages if row['transitions'] >= 5]
    if sampled:
        slowest = max(sampled, key=lambda row: row['avg_minutes'])
        add('Review the longest measured stage', f"{slowest['stage'].replace('_', ' ').title()} has the longest average recorded wait among stages with at least five transitions: {slowest['avg_minutes']} minutes over {slowest['transitions']} transitions. Review these records before changing staffing; this comparison does not establish a cause.", slowest['transitions'])
    elif stages:
        add('Stage samples are limited', 'No stage has five measured transitions yet. Collect more workflow history before comparing desk waits.', sum(row['transitions'] for row in stages))
    add('Recorded releases', f"{data['released']} documents were released in the chart period. Staff workload counts describe volume and are not a performance ranking.", data['released'])
    return result
