"""Experimental residual-wait classifier. No identities, DB writes or model pickles.

Target: a case is still in the same stage 24 hours after a landmark observation.
Synthetic episodes and completed recorded episodes have identical feature/label
construction. Whole documents, not their correlated landmarks, are held out.
"""
from collections import Counter
from datetime import datetime, timedelta, timezone
from functools import lru_cache
import hashlib
import json
import math
import random
from threading import RLock
from zoneinfo import ZoneInfo

from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix

from document_insights import STAGES

VERSION = 'stage_wait_rf_v1'
STAGE_KEYS = list(STAGES)
LANDMARKS = (0, 6, 12, 24, 48, 96, 168)
MAX_AGE = 168
MAX_DURATION = 720
HORIZON = 24
LOCK = RLock()


def features(stage, entered, age):
    at = datetime.fromtimestamp(entered, timezone.utc) + timedelta(hours=age)
    local = at.astimezone(ZoneInfo('Asia/Manila'))
    return [*([int(stage == key) for key in STAGE_KEYS]), local.weekday(), local.hour, age]


def simulated_episodes(seed, size):
    """Documented assumptions, not estimates of PLP staffing or actual delays."""
    rng = random.Random(seed)
    typical_hours = (8, 18, 36, 48, 12, 10, 8, 60)
    rows = []
    for i in range(size):
        index = rng.randrange(8)
        entered = datetime(2025, 1, 1, tzinfo=timezone.utc).timestamp() + rng.randrange(365 * 24) * 3600
        weekday = datetime.fromtimestamp(entered, ZoneInfo('Asia/Manila')).weekday()
        duration = min(MAX_DURATION, max(0.25, rng.lognormvariate(math.log(typical_hours[index]), 0.65)
                                       * (1.5 if weekday >= 4 else 1)))
        rows.append(dict(group=f'sim-{seed}-{i}', stage=STAGE_KEYS[index], entered=entered,
                         exited=entered + duration * 3600, origin='simulation'))
    return rows


def validate_intervals(rows, as_of):
    if not isinstance(rows, list) or len(rows) > 3000:
        raise ValueError('Too many recorded intervals.')
    result = []
    seen = set()
    for row in rows:
        if not isinstance(row, dict) or set(row) != {'group', 'stage', 'entered', 'exited', 'origin'}:
            raise ValueError('Only deidentified stage intervals are accepted.')
        if not isinstance(row['group'], int) or isinstance(row['group'], bool) or not 0 <= row['group'] <= 3000:
            raise ValueError('Invalid document group.')
        if row['stage'] not in STAGES or row['origin'] not in ('marked_synthetic', 'unmarked_unverified'):
            raise ValueError('Invalid interval origin or stage.')
        start, end = row['entered'], row['exited']
        if any(isinstance(v, bool) or not isinstance(v, (int, float)) or not math.isfinite(v) for v in (start, end)):
            raise ValueError('Invalid timestamps.')
        if not 0 < start < end <= as_of or end - start > MAX_DURATION * 3600:
            raise ValueError('Invalid or censored stage interval.')
        key = (row['group'], row['stage'], start, end)
        if key in seen:
            raise ValueError('Duplicate stage interval.')
        seen.add(key)
        result.append(row)
    return result


def observations(rows):
    x, y = [], []
    for row in rows:
        duration = (row['exited'] - row['entered']) / 3600
        for age in LANDMARKS:
            if age < duration:
                x.append(features(row['stage'], row['entered'], age))
                y.append(int(duration > age + HORIZON))
    return x, y


def split_recorded(rows):
    """A later whole-document test with an embargo for overlapping episodes."""
    groups = {}
    for row in rows:
        span = groups.setdefault(row['group'], [row['entered'], row['exited']])
        span[0], span[1] = min(span[0], row['entered']), max(span[1], row['exited'])
    if len(groups) < 10:
        return rows, [], 0
    ordered = sorted(groups, key=lambda key: groups[key][0])
    cutoff = groups[ordered[max(1, int(len(ordered) * 0.8))]][0]
    train = [r for r in rows if groups[r['group']][1] < cutoff]
    test = [r for r in rows if groups[r['group']][0] >= cutoff]
    omitted = len(rows) - len(train) - len(test)
    return train, test, omitted


def measure(model, rows, majority):
    x, y = observations(rows)
    if not y:
        return None
    predicted = model.predict(x)
    return dict(samples=len(y), documents=len({r['group'] for r in rows}),
                accuracy=float(accuracy_score(y, predicted)),
                precision=float(precision_score(y, predicted, zero_division=0)),
                recall=float(recall_score(y, predicted, zero_division=0)),
                f1=float(f1_score(y, predicted, zero_division=0)),
                baseline_accuracy=sum(v == majority for v in y) / len(y),
                positives=sum(y), negatives=len(y) - sum(y),
                confusion_matrix=confusion_matrix(y, predicted, labels=[0, 1]).tolist())


@lru_cache(maxsize=1)
def fitted(serialized):
    rows = json.loads(serialized)
    train, test, omitted = split_recorded(rows)
    synthetic = simulated_episodes(71021, 2000)
    synthetic_test = simulated_episodes(81031, 500)
    x, y = observations(synthetic + train)
    model = RandomForestClassifier(n_estimators=100, max_depth=12, min_samples_leaf=12,
                                   random_state=42, n_jobs=1)
    model.fit(x, y)
    majority = Counter(y).most_common(1)[0][0]
    identity = hashlib.sha256((VERSION + serialized).encode()).hexdigest()[:16]
    report = dict(status='ready', version=VERSION, model_id=identity, horizon_hours=HORIZON,
                  target='Remain in the same stage for another 24 hours',
                  training=dict(simulated_documents=2000, recorded_documents=len({r['group'] for r in train}),
                                marked_synthetic_documents=len({r['group'] for r in train if r['origin'] == 'marked_synthetic'}),
                                unmarked_unverified_documents=len({r['group'] for r in train if r['origin'] == 'unmarked_unverified'}),
                                samples=len(y), overlapping_intervals_excluded=omitted),
                  evaluation=dict(simulation=measure(model, synthetic_test, majority),
                                  recorded=measure(model, test, majority),
                                  marked_synthetic=measure(model, [r for r in test if r['origin'] == 'marked_synthetic'], majority),
                                  unmarked_unverified=measure(model, [r for r in test if r['origin'] == 'unmarked_unverified'], majority)),
                  real_world_validated=False,
                  feature_names=[*STAGE_KEYS, 'Manila weekday', 'Manila hour', 'hours already in stage'])
    return model, report


def evaluate_and_predict(intervals, cases, as_of):
    now = datetime.fromisoformat(as_of.replace('Z', '+00:00')).timestamp()
    rows = validate_intervals(intervals, now)
    if not isinstance(cases, list) or len(cases) > 8:
        raise ValueError('Only one oldest recorded case per stage is accepted.')
    prepared, seen = [], set()
    for case in cases:
        if not isinstance(case, dict) or set(case) != {'stage', 'entered'} or case['stage'] not in STAGES or case['stage'] in seen:
            raise ValueError('Invalid active case.')
        entered = case['entered']
        if isinstance(entered, bool) or not isinstance(entered, (int, float)) or not math.isfinite(entered) or not 0 < entered <= now:
            raise ValueError('Invalid active timestamp.')
        seen.add(case['stage'])
        prepared.append((case['stage'], entered, (now - entered) / 3600))
    with LOCK:
        model, report = fitted(json.dumps(rows, sort_keys=True, separators=(',', ':')))
    predictions = []
    for stage, entered, age in prepared:
        if age > MAX_AGE:
            continue
        probability = float(model.predict_proba([features(stage, entered, age)])[0][1])
        predictions.append(dict(stage=stage, age_hours=round(age, 2), probability=probability))
    predictions.sort(key=lambda row: -row['probability'])
    return {**report, 'predictions': predictions, 'out_of_range_cases': sum(age > MAX_AGE for _, _, age in prepared)}
