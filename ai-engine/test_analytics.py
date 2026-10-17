import unittest
from datetime import date, timedelta
from analytics import forecast_history, document_advice

class AnalyticsTest(unittest.TestCase):
    def data(self):
        return dict(history=[dict(date=(date(2026,10,1)+timedelta(days=i)).isoformat(),volume=0 if i else 14) for i in range(14)],today='2026-10-15',timezone='Asia/Manila')
    def test_preserves_real_zero_days(self):
        history,today=forecast_history(self.data())
        self.assertEqual(sum(row['volume'] for row in history),14)
        self.assertEqual(today,date(2026,10,15))
    def test_rejects_gaps_future_and_identity(self):
        for data in [{**self.data(),'student':'private'},{**self.data(),'today':'2026-10-14'},{**self.data(),'history':self.data()['history'][:-1]},{**self.data(),'history':[self.data()['history'][0]]*14}]:
            with self.assertRaises(ValueError): forecast_history(data)
    def test_advice_uses_measured_samples_without_performance_claims(self):
        data=dict(end_to_end=dict(completed_count=5,avg_minutes=20,min_minutes=2,max_minutes=40),stages=[dict(stage='SEC_PROCESSING',transitions=7,avg_minutes=12)],released=3,range=dict(days=30))
        result=document_advice(data)
        self.assertIn('5 completed documents average 20 minutes',result[0]['message'])
        self.assertIn('7 transitions',result[1]['message'])
        self.assertIn('not a performance ranking',result[-1]['message'])
        with self.assertRaises(ValueError): document_advice({**data,'students':[]})
    def test_no_completion_history_means_no_speed_conclusion(self):
        result=document_advice(dict(end_to_end=dict(completed_count=0,avg_minutes=0,min_minutes=0,max_minutes=0),stages=[],released=0,range=dict(days=30)))
        self.assertIn('insufficient',result[0]['title'])

class AnalyticsRouteTest(unittest.TestCase):
    """Execute actual route bodies without loading unrelated OCR/model binaries."""
    def route(self, name, data, model=None):
        import ast
        from pathlib import Path
        from types import SimpleNamespace
        import pandas as pd
        import document_insights
        module=ast.parse(Path('app.py').read_text())
        function=next(node for node in module.body if isinstance(node,ast.FunctionDef) and node.name==name)
        function.decorator_list=[]
        namespace=dict(request=SimpleNamespace(content_length=100,method='POST',get_json=lambda **kwargs:data),jsonify=lambda value:value,pd=pd,timedelta=timedelta,Prophet=model,logger=SimpleNamespace(error=lambda *args:None),validate_snapshot=document_insights.validate_snapshot,build_document_insights=document_insights.build_document_insights)
        exec(compile(ast.Module(body=[function],type_ignores=[]),'app.py','exec'),namespace)
        return namespace[name]()
    def test_forecast_fits_exact_counts_and_predicts_next_week(self):
        import pandas as pd
        fits=[]
        class Model:
            def __init__(self,**kwargs): pass
            def fit(self,frame): fits.append(frame.copy())
            def predict(self,frame):
                fits.append(frame['ds'].dt.strftime('%Y-%m-%d').tolist())
                return pd.DataFrame({'yhat':[-1,0,1,2,3,4,5]})
        result=self.route('forecast',AnalyticsTest().data(),Model)
        self.assertEqual(result['source'],'prophet')
        self.assertEqual(fits[0]['y'].tolist(),[14]+[0]*13)
        self.assertEqual(fits[1],[(date(2026,10,16)+timedelta(days=i)).isoformat() for i in range(7)])
        self.assertEqual([row['predicted_volume'] for row in result['forecast']],[0,0,1,2,3,4,5])
    def test_invalid_forecast_returns_400(self):
        self.assertEqual(self.route('forecast',{'student':'private'})[1],400)
    def test_queue_route_uses_real_aggregates_without_coded_training_examples(self):
        from document_insights import STAGES
        data=dict(counts={**dict.fromkeys(STAGES,0),'SEC_PROCESSING':60},today_actions=3,unclassified=0,as_of='2026-10-17T00:00:00Z')
        result=self.route('ai_recommend',data)
        self.assertEqual(result['source'],'aggregate_rules')
        self.assertIn('60 outstanding',result['insights'][0]['title'])
        self.assertNotIn('prototype',str(result))
