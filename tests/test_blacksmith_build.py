import hashlib
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
import blacksmith_build as b


def synthetic_package():
    raw=bytearray(24000)
    for i in range(20):raw[i*48+47]=125
    for i,c in enumerate(b'FM-1_1100'):raw[i*48+47]=(c+i+1)&255
    raw[2000:2016]=b'FELUCCA-LOADER-1'
    return bytes(raw)


class LocalBuildTests(unittest.TestCase):
    def test_package_identity_size_and_loader(self):
        raw=synthetic_package();self.assertEqual(b.verify_package(raw)['product'],'FM-1_1100')
        for invalid in [b'x',raw[:1000],raw.replace(b'FELUCCA-LOADER-1',b'NO-LOADER-HERE!!')]:
            with self.assertRaises(ValueError):b.verify_package(invalid)

    def test_download_requires_completed_build_and_valid_bytes(self):
        with tempfile.TemporaryDirectory() as d:
            ident='build-'+'a'*24;p=b.folder(d,ident);p.mkdir(parents=True)
            raw=synthetic_package();(p/'firmware.fwsc').write_bytes(raw)
            meta=dict(id=ident,state='ready',compiled=True,installable=True,baseCommit=b.BASE,bspCommit=b.BSP,**b.verify_package(raw))
            (p/'build.json').write_text(json.dumps(meta))
            self.assertEqual(b.artifact(d,ident)[1],raw)
            (p/'firmware.fwsc').write_bytes(raw[:-1]+b'x')
            with self.assertRaises(ValueError):b.artifact(d,ident)
            meta['state']='failed';(p/'build.json').write_text(json.dumps(meta))
            with self.assertRaises(ValueError):b.artifact(d,ident)
            with self.assertRaises(ValueError):b.folder(d,'../outside')

    def test_restart_does_not_claim_an_interrupted_build_completed(self):
        with tempfile.TemporaryDirectory() as d:
            ident='build-'+'b'*24;p=b.folder(d,ident);p.mkdir(parents=True)
            (p/'build.json').write_text(json.dumps(dict(id=ident,state='building',created='2026-11-05')))
            self.assertEqual(b.status(d,ident)['state'],'interrupted')

    def test_recipe_cannot_supply_commands(self):
        with self.assertRaises(ValueError):b.start('.',{'schema':'shell','command':'anything'})
