import unittest
from datetime import date, timedelta
import pandas as pd
from forecast_evaluation import evaluate_forecast

class EvaluationTest(unittest.TestCase):
    def data(self, days=90):
        start=date(2026,7,1)
        return dict(history=[dict(date=(start+timedelta(days=i)).isoformat(),volume=i) for i in range(days)],today=(start+timedelta(days=days)).isoformat(),timezone='Asia/Manila',cutoffs=[54,61,68,75,82])
    def test_each_fold_fits_only_earlier_dates_and_skips_simulated_today(self):
        fits=[];targets=[]
        class Model:
            def __init__(self,**settings):self.settings=settings
            def fit(self,frame,**settings):fits.append((frame.copy(),settings));return self
            def predict(self,frame):targets.append(frame.copy());return pd.DataFrame({'yhat':[0,1,2,3,4,5,6]})
        result=evaluate_forecast(self.data(),Model)
        self.assertEqual(len(result['predictions']),35)
        for (training,settings),future,cutoff in zip(fits,targets,[54,61,68,75,82]):
            self.assertEqual(len(training),cutoff);self.assertEqual(training['y'].tolist(),list(range(cutoff)))
            self.assertEqual((future['ds'].min()-training['ds'].max()).days,2)
            self.assertEqual(len(future),7);self.assertEqual(settings['seed'],42)
        self.assertEqual(len({row['date'] for row in result['predictions']}),35)
    def test_rejects_too_short_overlapping_duplicate_and_private_payloads(self):
        data=self.data()
        for bad in [{**data,'student':'private'},{**data,'cutoffs':[13]},{**data,'cutoffs':[54,55]},{**data,'cutoffs':[54,54]},{**data,'cutoffs':[83]},{**data,'cutoffs':[True]}]:
            with self.assertRaises(ValueError):evaluate_forecast(bad)
    def test_route_validates_payload_and_does_not_substitute_a_fallback(self):
        from test_analytics import AnalyticsRouteTest
        self.assertEqual(AnalyticsRouteTest().route('forecast_evaluation', {'student':'private'})[1],400)

    def test_image_copies_every_new_local_forecast_dependency(self):
        from pathlib import Path
        docker=Path('Dockerfile').read_text()
        for name in ['analytics.py','forecaster.py','forecast_evaluation.py']:
            self.assertIn(name,docker)

if __name__=='__main__':unittest.main()
