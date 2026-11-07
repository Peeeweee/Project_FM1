import json
import tempfile
import unittest
from pathlib import Path
import catalog

class ReviewedCatalogTests(unittest.TestCase):
    def test_all_reviewed_builds_override_cached_approval_metadata(self):
        with tempfile.TemporaryDirectory() as folder:
            data=Path(folder)
            entries=catalog.load_catalog(data)
            for entry in entries:
                entry['assets']=[dict(name='fake.fwsc',url='https://github.com/other/project/releases/download/x/fake.fwsc',sha256='0'*64,adapter='felucca-v1')]
            catalog.save_catalog(data,entries)
            by_id={e['id']:e for e in catalog.load_catalog(data)}
            for b in catalog.install_builds():
                asset=next(a for a in by_id[b['firmwareId']]['assets'] if a.get('buildId')==b['id'])
                self.assertEqual(asset['sha256'],b['sha256']);self.assertEqual(asset['size'],b['size']);self.assertEqual(asset['url'],b['url'])
    def test_install_approval_comes_from_bytes_not_product_or_user_metadata(self):
        raw=bytearray([125]*1100)
        for i,char in enumerate('FM-1_900'):raw[i*48+47]=ord(char)+i+1
        self.assertEqual(catalog.fwsc_info(raw),'FM-1_900')
        self.assertIsNone(catalog.reviewed_build(raw))
    def test_catalog_has_distinct_fm1_projects_and_all_preview_files(self):
        entries=catalog.load_catalog(Path(tempfile.gettempdir())/'fm1-dock-no-catalog-qa')
        self.assertEqual(len(entries),30);self.assertEqual(len({e['id'] for e in entries}),30)
        previews=json.loads((Path(catalog.__file__).parent/'previews.json').read_text())
        for entry in entries:
            image=Path(catalog.__file__).parent/'web'/previews[entry['id']]['image'].lstrip('/')
            self.assertTrue(image.is_file())
            self.assertEqual(catalog.hashlib.sha256(image.read_bytes()).hexdigest(),previews[entry['id']]['sha256'])

    def test_extended_fm1_version_can_be_stored_but_is_not_install_approved(self):
        raw=bytearray([125]*1100)
        for i,char in enumerate('FM-1_710010400'):raw[i*48+47]=ord(char)+i+1
        self.assertEqual(catalog.fwsc_info(raw),'FM-1_710010400')
        self.assertIsNone(catalog.reviewed_build(raw))
