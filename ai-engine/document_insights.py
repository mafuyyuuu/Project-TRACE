"""Aggregate document advice; queue volume is not evidence of efficiency."""
from datetime import datetime

STAGES = {
    'PENDING_W1_INTAKE': 'Window 1 Intake',
    'PENDING_SEC_EVALUATION': 'Secretary Evaluation',
    'SEC_PROCESSING': 'Secretary Processing',
    'PENDING_STUDENT_PAYMENT': 'Awaiting Student Payment',
    'PENDING_FINANCE_VERIFICATION': 'Finance Verification',
    'PAID_PENDING_SEC_RELEASE': 'Secretary Handoff',
    'SEC_OR_VERIFIED': 'OR Verification',
    'READY_FOR_RELEASE': 'Window 1 Release',
}
NEXT_ACTIONS = {
    "PENDING_W1_INTAKE": "Open Intake Check, verify identity and required papers, then accept or return with correction notes. Review unassigned cases with authorized Window 1 staff.",
    "PENDING_SEC_EVALUATION": "Ask the assigned college secretary to review eligibility and supporting papers, and request missing documents before preparation.",
    "SEC_PROCESSING": "Review preparation progress with the assigned secretary, record the actual pages and final price, then issue the payment instructions.",
    "PENDING_STUDENT_PAYMENT": "Review priced requests awaiting payment, confirm that payment instructions are available, and help students with unresolved payment questions through Support.",
    "PENDING_FINANCE_VERIFICATION": "Ask Finance to match payment proof, reference and amount, resolve discrepancies, and complete authorized payment verification and receipt handling.",
    "PAID_PENDING_SEC_RELEASE": "Coordinate with the college secretary to inspect the physical or uploaded Official Receipt before the final handoff.",
    "SEC_OR_VERIFIED": "Ask the secretary to complete the final handoff so Window 1 can prepare the document for pickup.",
    "READY_FOR_RELEASE": "Coordinate pickup notices and release schedules. Window 1 should verify the claimant and complete the authorized release when collected."
}

TERMINAL = {'COMPLETED', 'REJECTED', 'APPROVED'}


def count(value):
    if isinstance(value, bool) or not isinstance(value, int) or not 0 <= value <= 2147483647:
        raise ValueError('Invalid document queue count.')
    return value


def validate_snapshot(data):
    if not isinstance(data, dict) or set(data) != {'counts', 'unclassified', 'today_actions', 'as_of'}:
        raise ValueError('Only aggregate document counts are accepted.')
    if not isinstance(data['counts'], dict) or set(data['counts']) != set(STAGES):
        raise ValueError('Supply every active pipeline stage.')
    for value in data['counts'].values():
        count(value)
    count(data['unclassified'])
    count(data['today_actions'])
    date = data['as_of']
    if not isinstance(date, str) or len(date) > 40 or datetime.fromisoformat(date.replace('Z', '+00:00')).tzinfo is None:
        raise ValueError('Supply an explicit snapshot time zone.')
    return data


def snapshot_from_rows(rows, today_actions, as_of):
    counts = dict.fromkeys(STAGES, 0)
    unclassified = 0
    for row in rows:
        stage = str(row['current_status'] or '').upper()
        value = count(row['count'])
        if stage in counts:
            counts[stage] += value
        elif stage not in TERMINAL:
            unclassified += value
    return validate_snapshot(dict(counts=counts, unclassified=unclassified,
                                  today_actions=today_actions, as_of=as_of))


def build_document_insights(data, prediction=None):
    validate_snapshot(data)
    counts = data['counts']
    total = sum(counts.values())
    evidence = dict(counts=counts, outstanding=total, unclassified=data['unclassified'], today_actions=data['today_actions'])

    def add(title, message, tone='info', method='queue_snapshot'):
        return dict(type=tone, title=title, message=message, method=method, as_of=data['as_of'], evidence=evidence)

    breakdown = '; '.join(f'{label}: {counts[stage]}' for stage, label in STAGES.items() if counts[stage])
    insights = [add(f'Document workload: {total} outstanding' if total else 'Document workload: no active pipeline documents',
                    f"{breakdown or 'All active pipeline queues are empty.'} {data['today_actions']} workflow actions recorded today (Manila); actions are not distinct requests. Queue size alone does not establish efficiency, delays or staffing capacity. Review measured durations in Efficiency Analytics.")]
    occupied = sorted(((stage, value) for stage, value in counts.items() if value), key=lambda row: -row[1])
    if occupied:
        stage, value = occupied[0]
        insights[0]['message'] = f"Suggested next step for {value} at {STAGES[stage]}: {NEXT_ACTIONS[stage]} " + insights[0]['message']
        for stage, value in occupied[:3]:
            insights.append(add(f'Suggested next step: {STAGES[stage]}',
                                f'{value} recorded requests. {NEXT_ACTIONS[stage]} Review by workload volume does not establish urgency or delay; confirm individual case context.', method='queue_rules'))
    if data['unclassified']:
        insights.append(add('Document statuses need review',
                            f"{data['unclassified']} documents have an unrecognized status and are excluded from the active-pipeline total. Review their status mapping before interpreting workload.", 'warning'))
    if counts['PENDING_SEC_EVALUATION'] > 5:
        insights.append(add('Secretary Queue Alert',
                            f"{counts['PENDING_SEC_EVALUATION']} documents await evaluation, exceeding the current advisory count threshold of 5. Review assignments and recorded waits; this threshold does not prove a bottleneck.", 'warning'))
    if counts['READY_FOR_RELEASE'] > 3:
        insights.append(add('Release Desk Advisory',
                            f"{counts['READY_FOR_RELEASE']} documents await pickup, exceeding the current advisory count threshold of 3. Review pickup coordination; this count does not prove Window 1 is overloaded."))
    relevant = prediction == 3 or (prediction == 1 and counts['PENDING_SEC_EVALUATION']) or (prediction == 2 and counts['READY_FOR_RELEASE'])
    if prediction and total and relevant:
        area = {1: 'Secretary evaluation', 2: 'release coordination', 3: 'document workload'}[prediction]
        insights.append(add('Experimental model advisory',
                            f"The prototype suggests reviewing {area}. Random Forest uses evaluation count, release count and today's workflow actions, trained on four coded examples. It does not cover every stage and has no validated delay or staffing accuracy. Check the complete queue snapshot and measured waits before acting.", method='random_forest_prototype'))
    return insights
