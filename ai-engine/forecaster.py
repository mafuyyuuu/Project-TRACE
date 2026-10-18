"""One model configuration for production forecasts and held-out backtests."""
from math import isfinite
SETTINGS = dict(daily_seasonality=False, weekly_seasonality=True, yearly_seasonality=False)
FIT_SEED = 42


def predict_counts(history, dates, model_factory=None):
    import pandas as pd
    if model_factory is None:
        from prophet import Prophet
        model_factory = Prophet
    model = model_factory(**SETTINGS)
    frame = pd.DataFrame([{'ds': row['date'], 'y': row['volume']} for row in history])
    frame['ds'] = pd.to_datetime(frame['ds'])
    model.fit(frame, seed=FIT_SEED)
    result = model.predict(pd.DataFrame({'ds': pd.to_datetime(dates)}))
    values = [float(value) for value in result['yhat']]
    if len(values) != len(dates) or not all(isfinite(value) and abs(value) <= 2147483647 for value in values):
        raise ValueError('Invalid model output.')
    return [max(0, round(value)) for value in values]
