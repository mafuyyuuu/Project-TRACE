"""Fit each fold only on earlier counts; return predictions, never fabricated metrics."""
from datetime import date
from analytics import forecast_history
from forecaster import predict_counts, SETTINGS, FIT_SEED


def evaluate_forecast(data, model_factory=None):
    if not isinstance(data, dict) or set(data) != {'history', 'today', 'timezone', 'cutoffs'}:
        raise ValueError('Expected aggregate history and cutoffs only.')
    history, _ = forecast_history({key: data[key] for key in ('history', 'today', 'timezone')})
    cutoffs = data['cutoffs']
    if not isinstance(cutoffs, list) or not 1 <= len(cutoffs) <= 5:
        raise ValueError('Expected one to five held-out folds.')
    previous = None
    for cutoff in cutoffs:
        if isinstance(cutoff, bool) or not isinstance(cutoff, int) or not 14 <= cutoff <= len(history) - 8 or previous is not None and cutoff - previous < 7:
            raise ValueError('Invalid chronological cutoff.')
        previous = cutoff
    rows = []
    for cutoff in cutoffs:
        training = history[:cutoff]
        # history[cutoff] simulates the incomplete current day; forecast tomorrow.
        targets = history[cutoff + 1:cutoff + 8]
        dates = [date.fromisoformat(row['date']) for row in targets]
        predictions = predict_counts(training, dates, model_factory)
        rows.extend(dict(training_through=training[-1]['date'], date=row['date'], predicted_volume=value)
                    for row, value in zip(targets, predictions))
    from importlib.metadata import version, PackageNotFoundError
    try:
        model_version = version('prophet')
    except PackageNotFoundError:
        model_version = 'unreported'
    return {'source': 'prophet_backtest', 'predictions': rows, 'model': dict(name='Prophet', version=model_version, settings=SETTINGS, seed=FIT_SEED)}
