import base64
import importlib.util
import json
import tempfile
import threading
import unittest
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen

spec = importlib.util.spec_from_file_location('dock', Path(__file__).parents[1] / 'server.py')
dock = importlib.util.module_from_spec(spec)
spec.loader.exec_module(dock)


class VaultTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        dock.DATA = Path(self.temp.name)

    def tearDown(self):
        self.temp.cleanup()

    def capture(self):
        return dict(schema='fm1-dock/1', scope='saved-sounds', device=dict(model='FM-1', version=15), voices=[[0]*155 for _ in range(128)])

    def test_persistent_capture_and_tamper_detection(self):
        record = dock.store_asset('backups', self.capture())
        self.assertEqual(dock.list_assets('backups')[0]['integrity'], 'OK')
        (dock.DATA / 'backups' / (record['id'] + '.json')).write_bytes(b'broken')
        self.assertEqual(dock.list_assets('backups')[0]['integrity'], 'FAILED')

    def test_bad_capture_rejected(self):
        obj = self.capture()
        obj['voices'].pop()
        with self.assertRaises(ValueError):
            dock.store_asset('backups', obj)
        obj = self.capture()
        obj['device'] = 'not a device'
        with self.assertRaises(ValueError):
            dock.store_asset('backups', obj)
        obj = self.capture()
        obj['voices'][0][0] = True
        with self.assertRaises(ValueError):
            dock.store_asset('backups', obj)

    def test_firmware_hash_and_path_isolation(self):
        obj = dict(filename='../../test.fwsc', base64=base64.b64encode(b'x'*32).decode(), source='https://example.com/file')
        record = dock.store_asset('firmwares', obj)
        self.assertTrue((dock.DATA / 'firmwares' / (record['id'] + '.fwsc')).is_file())
        obj['expectedSha256'] = '0'*64
        with self.assertRaises(ValueError):
            dock.store_asset('firmwares', obj)

    def test_http_access_controls_and_traversal(self):
        server = dock.ThreadingHTTPServer(('127.0.0.1', 0), dock.Handler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        root = f'http://127.0.0.1:{server.server_port}'
        try:
            self.assertEqual(urlopen(root).status, 200)
            self.assertIn("media-src 'self' blob:",urlopen(root).headers['Content-Security-Policy'])
            req = Request(root+'/api/backups', data=json.dumps(self.capture()).encode(), headers={'Content-Type':'application/json'})
            with self.assertRaises(HTTPError) as err:
                urlopen(req)
            self.assertEqual(err.exception.code, 403)
            req.add_header('X-FM1-Token', dock.TOKEN)
            self.assertEqual(urlopen(req).status, 201)
            req.add_header('Origin', 'https://evil.example')
            with self.assertRaises(HTTPError):
                urlopen(req)
            with self.assertRaises(HTTPError):
                urlopen(root+'/../server.py')
        finally:
            server.shutdown()
            server.server_close()

    def test_blacksmith_api_source_zip_round_trip(self):
        import io
        import zipfile
        project = dict(schema='fm1-dock/blacksmith/1', base='fm1-base-template', name='API test',
            deviceName='API FORGE', layout='minimal', palette='night', modules=dict(drive=True,crusher=False),
            presets=[dict(name='PURE',wave='sine',attack=20,release=200,cutoff=4000,bits=16,drive=1)],assets=[])
        server = dock.ThreadingHTTPServer(('127.0.0.1', 0), dock.Handler)
        threading.Thread(target=server.serve_forever, daemon=True).start()
        root = f'http://127.0.0.1:{server.server_port}'
        def post(path, data, token=True):
            headers={'Content-Type':'application/json'}
            if token: headers['X-FM1-Token']=dock.TOKEN
            return urlopen(Request(root+path, data=json.dumps(data).encode(), headers=headers))
        try:
            self.assertFalse(json.load(urlopen(root+'/api/blacksmith/catalog'))['compiled'])
            with self.assertRaises(HTTPError) as err: post('/api/blacksmith/projects', project, False)
            self.assertEqual(err.exception.code,403)
            with self.assertRaises(HTTPError) as err: post('/api/blacksmith/validate', dict(project,base='sloop'))
            self.assertEqual(err.exception.code,400)
            response=post('/api/blacksmith/projects',project)
            self.assertEqual(response.status,201)
            meta=json.load(response);path=root+'/api/blacksmith/projects/'+meta['id']
            self.assertEqual(json.load(urlopen(path+'/recipe')),dock.blacksmith.validate_recipe(project))
            response=urlopen(path+'/source.zip')
            self.assertEqual(response.headers.get_content_type(),'application/zip')
            with zipfile.ZipFile(io.BytesIO(response.read())) as z:
                self.assertIn('API FORGE',z.read('app.h').decode())
                self.assertFalse(any(n.endswith('.fwsc') for n in z.namelist()))
            self.assertEqual(len(json.load(urlopen(root+'/api/blacksmith/projects'))),1)
        finally:
            server.shutdown();server.server_close()


if __name__ == '__main__':
    unittest.main()
