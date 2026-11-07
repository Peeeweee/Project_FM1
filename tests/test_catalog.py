import base64
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
import catalog
import server

class CatalogTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.original=server.DATA
        server.DATA=Path(self.temp.name)
    def tearDown(self):
        server.DATA=self.original
        self.temp.cleanup()
    def package(self):
        raw=bytearray([125]*1000)
        for i,char in enumerate('FM-1_900'):
            raw[i*48+47]=ord(char)+i+1
        return bytes(raw)
    def test_cache_persists_offline_and_does_not_approve_unknown_build(self):
        with patch.object(catalog,'remote',return_value=self.package()):
            items=catalog.load_catalog(server.DATA)
            next(e for e in items if e['id']=='sloop')['assets']=[dict(name='custom.fwsc',url='https://github.com/isod89/sloop-fm1/releases/download/test/custom.fwsc',sha256='')]
            catalog.save_catalog(server.DATA,items)
            meta=catalog.cache_package(server.DATA,'sloop',next(e for e in items if e['id']=='sloop')['assets'][0]['url'],server.store_asset)
        self.assertIsNone(meta['adapter'])
        self.assertEqual(server.list_assets('firmwares')[0]['integrity'],'OK')
        self.assertTrue(catalog.load_catalog(server.DATA))
    def test_unlisted_url_rejected_without_network(self):
        with patch.object(catalog,'remote') as network:
            with self.assertRaises(ValueError):
                catalog.cache_package(server.DATA,'sloop','https://evil.example/test.fwsc',server.store_asset)
            network.assert_not_called()
    def test_download_and_redirect_hosts_are_restricted(self):
        for url in ['http://github.com/a/b','https://127.0.0.1/file','https://github.com.evil.example/x','https://user:pass@github.com/x','https://github.com:444/x']:
            with self.assertRaises(ValueError):catalog.check_url(url)
    def test_catalog_cache_cannot_replace_pinned_adapter(self):
        items=catalog.load_catalog(server.DATA);next(a for a in next(e for e in items if e['id']=='sloop')['assets'] if a['url']==catalog.PINNED_URL)['sha256']='0'*64
        catalog.save_catalog(server.DATA,items)
        self.assertEqual(next(a for a in next(e for e in catalog.load_catalog(server.DATA) if e['id']=='sloop')['assets'] if a['url']==catalog.PINNED_URL)['sha256'],catalog.SLOOP_SHA)
    def test_releases_only_offer_fwsc_from_matching_repo(self):
        response=dict(tag_name='test',assets=[dict(name='good.fwsc',browser_download_url='https://github.com/hugelton/Felucca/releases/download/t/good.fwsc'),dict(name='bad.exe',browser_download_url='https://github.com/hugelton/Felucca/releases/download/t/bad.exe'),dict(name='wrong.fwsc',browser_download_url='https://github.com/another/repo/releases/download/t/wrong.fwsc')])
        with patch.object(catalog,'remote',return_value=json.dumps(response).encode()):
            entry=catalog.refresh_entry(next(e for e in catalog.SEEDS if e['id']=='felucca'))
        self.assertEqual([a['name'] for a in entry['assets']],['good.fwsc'])
    def test_mismatched_maintainer_hash_never_stores_package(self):
        with patch.object(catalog,'remote',return_value=self.package()):
            with self.assertRaises(ValueError):
                catalog.cache_package(server.DATA,'sloop',catalog.PINNED_URL,server.store_asset)
        self.assertEqual(server.list_assets('firmwares'),[])

if __name__=='__main__':unittest.main()
