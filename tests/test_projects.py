import unittest
import tempfile
from pathlib import Path
import server

class ProjectTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.original=server.DATA;server.DATA=Path(self.temp.name)
    def tearDown(self):
        server.DATA=self.original;self.temp.cleanup()
    def project(self):
        return dict(schema='fm1-dock/studio/1',name='Test take',notes=[dict(id='a',pitch=60,start=.137,duration=.421,velocity=93,channel=1)])
    def test_saved_project_is_notes_only_and_integrity_checked(self):
        p=self.project();p['audioIncluded']=True
        meta=server.store_asset('projects',p)
        self.assertEqual(server.list_assets('projects')[0]['integrity'],'OK')
        raw=(server.DATA/'projects'/(meta['id']+'.json')).read_text()
        self.assertIn('"audioIncluded":false',raw)
    def test_instrument_metadata_survives_save_and_rejects_unbounded_labels(self):
        import json
        p=self.project();p['notes'][0]['instrument']=dict(kind='drum',source='device',engine='Drums',preset='808',track=4,readAt='2026-11-04T13:00:00.000Z')
        meta=server.store_asset('projects',p)
        saved=json.loads((server.DATA/'projects'/(meta['id']+'.json')).read_text())
        self.assertEqual(saved['notes'][0]['instrument']['preset'],'808')
        self.assertEqual(saved['notes'][0]['channel'],1)
        p['notes'][0]['instrument']['preset']='x'*121
        with self.assertRaises(ValueError):server.store_asset('projects',p)
    def test_rejects_bad_timing_and_channels(self):
        for key,value in [('start',float('nan')),('duration',0),('channel',17),('pitch',True)]:
            p=self.project();p['notes'][0][key]=value
            with self.assertRaises(ValueError):server.store_asset('projects',p)
    def test_rejects_duplicate_ids(self):
        p=self.project();p['notes']*=2
        with self.assertRaises(ValueError):server.store_asset('projects',p)

if __name__=='__main__':unittest.main()
