"""Offline preview coverage and byte integrity, including newly captured screens."""
import hashlib
import json
import unittest
from pathlib import Path
from catalog import SEEDS

ROOT = Path(__file__).resolve().parents[1]

class PreviewTests(unittest.TestCase):
    def test_every_curated_instrument_has_a_genuine_local_preview(self):
        previews = json.loads((ROOT / 'previews.json').read_text(encoding='utf-8'))
        self.assertEqual({e['id'] for e in SEEDS}, set(previews))
        for key, preview in previews.items():
            with self.subTest(instrument=key):
                self.assertRegex(preview['image'], r'^/previews/[a-z0-9-]+\.(png|jpe?g)$')
                raw = (ROOT / 'web' / preview['image'].lstrip('/')).read_bytes()
                self.assertEqual(hashlib.sha256(raw).hexdigest(), preview['sha256'])
                self.assertTrue(raw.startswith(b'\x89PNG\r\n\x1a\n') or raw.startswith(b'\xff\xd8\xff'))
                self.assertTrue(preview['source'] and preview['caption'] and preview['license'])

if __name__ == '__main__':
    unittest.main()
