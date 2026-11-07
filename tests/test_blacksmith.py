import base64
import copy
import io
import json
import math
import tempfile
import unittest
import zipfile
from pathlib import Path

import blacksmith


def recipe():
    return dict(schema='fm1-dock/blacksmith/1', base='fm1-base-template', name='My lofi forge',
        deviceName='LOFI FORGE', layout='minimal', palette='night', modules=dict(drive=True,crusher=True),
        presets=[dict(name='VELVET',wave='triangle',attack=45,release=300,cutoff=2400,bits=12,drive=1.3)],assets=[])


class BlacksmithTests(unittest.TestCase):
    def test_genuine_sources_and_license_not_firmware(self):
        files=blacksmith.generate_sources(recipe())
        self.assertIn('#define APP_NAME "LOFI FORGE"',files['app.h'])
        self.assertIn('BS_PRESETS[set.wave].filter',files['app.c'])
        self.assertIn(f'{1-math.exp(-2*math.pi*2400/44100):.10f}f',files['app.c'])
        self.assertIn('Mozilla Public License',files['LICENSE'])
        self.assertIn('Copyright (C) 2026 Charles Vestal',files['app.c'])
        self.assertFalse(any(name.endswith(('.fwsc','.bin','.fep')) for name in files))
        self.assertIn('NOT an installable firmware',files['README.md'])
        self.assertEqual(json.loads(files['SOURCE.json'])['commit'],blacksmith.source_manifest()['commit'])

    def test_each_layout_and_palette_change_real_c(self):
        a=blacksmith.generate_sources(recipe())['app.c']
        r=recipe();r.update(layout='performance',palette='paper');b=blacksmith.generate_sources(r)['app.c']
        self.assertNotEqual(a,b)
        self.assertIn('SOUND / FILTER / ENVELOPE',b)
        self.assertIn('#define BS_BG RGB(244, 243, 237)',b)
        self.assertNotIn('cv_begin(240, 240',b)  # preserve the template's bounded strip canvas

    def test_preset_bank_wrap_and_disabled_modules(self):
        r=recipe();r['presets']*=8;r['modules']={'drive':False,'crusher':False}
        app=blacksmith.generate_sources(r)['app.c']
        self.assertIn('#define BS_COUNT 8u',app)
        self.assertIn('set.wave >= BS_COUNT',app)
        self.assertIn('next % (int32_t)BS_COUNT',app)
        self.assertIn('{1, 16,',app)
        self.assertNotIn('1.300000f',app)
        r['presets'].append(copy.deepcopy(r['presets'][0]))
        with self.assertRaises(ValueError):blacksmith.generate_sources(r)

    def test_reject_code_injection_and_wrong_platform(self):
        for key,value in [('deviceName','X"; BAD'),('deviceName','x'),('base','sloop'),('layout','<script>'),('palette','fake')]:
            r=recipe();r[key]=value
            with self.assertRaises(ValueError):blacksmith.validate_recipe(r)
        r=recipe();r['presets'][0]['name']='X";BAD'
        with self.assertRaises(ValueError):blacksmith.validate_recipe(r)

    def test_reject_invalid_audio_parameters(self):
        for key,value in [('wave','vst'),('bits',7.5),('bits',True),('cutoff',float('nan')),('cutoff',10**400),('attack',0),('release',4000),('drive',999)]:
            r=recipe();r['presets'][0][key]=value
            with self.assertRaises(ValueError):blacksmith.validate_recipe(r)

    def test_assets_are_bundled_references_only(self):
        r=recipe();raw=b'RIFF'+b'\x00'*4+b'WAVE'+b'\x00'*12
        r['assets']=[{'name':'own-loop.wav','base64':base64.b64encode(raw).decode()}]
        files=blacksmith.generate_sources(r)
        self.assertEqual(files['assets/own-loop.wav'],raw)
        self.assertNotIn('own-loop.wav',files['app.c'])
        self.assertIn('NOT embedded',files['README.md'])
        for name in ['../own.wav','sub/own.wav','sub\\own.wav','fake.fwsc','image.svg']:
            r['assets'][0]['name']=name
            with self.assertRaises(ValueError):blacksmith.validate_recipe(r)

    def test_asset_size_headers_duplicates_and_encoding(self):
        for name,raw in [('bad.wav',b'bad'),('bad.png',b'bad'),('bad.syx',b'bad'),('big.fep',b'x'*(512*1024+1))]:
            r=recipe();r['assets']=[{'name':name,'base64':base64.b64encode(raw).decode()}]
            with self.assertRaises(ValueError):blacksmith.validate_recipe(r)
        r=recipe();r['assets']=[{'name':'x.fep','base64':'%%%'}]
        with self.assertRaises(ValueError):blacksmith.validate_recipe(r)

    def test_design_artwork_and_device_settings_reach_generated_c(self):
        r=recipe();r['layout']='poster';r['design']=dict(art='1'+'0'*254+'2',artEnabled=True,border=True,
            subtitle='MY OWN DESIGN',footer='PLAY IT',align='center',colors=['#112233','#eeeeee','#ffcc00','#aaaaaa','#888888','#444444'])
        r['settings']=dict(midiChannel=3,velocity=90,octave=-1,gain=0.5,showKeys=False,showNote=False,usbAudioIn=False,usbAudioOut=False)
        files=blacksmith.generate_sources(r);c=files['app.c']
        self.assertIn('cv_rect(148, 48, 5, 5, BS_ACCENT)',c)
        self.assertIn('cv_rect(223, 123, 5, 5, BS_FG)',c)
        self.assertIn('MY OWN DESIGN',c);self.assertIn('"PLAY IT"',c)
        self.assertIn('RGB(17, 34, 51)',c);self.assertIn('set.octave = -1',c)
        self.assertIn('(float)90 / 127.0f',c);self.assertIn('(st & 15u) != 2u',c)
        self.assertNotIn('i < 16u; i++) key_cell',c)
        self.assertIn('usb_audio_in = false',files['fm1.toml'])

    def test_multiple_art_layers_keep_their_placement_in_firmware(self):
        r=recipe()
        r['design']=dict(art='1'+'0'*255,artEnabled=True,artX=20,artY=50,artSize=3,
                         artLayers=[dict(art='0'*255+'2',x=160,y=100,size=4)])
        clean=blacksmith.validate_recipe(r)
        self.assertEqual(clean['design']['artLayers'][0]['size'],4)
        c=blacksmith.generate_sources(r)['app.c']
        self.assertIn('cv_rect(20, 14, 3, 3, BS_ACCENT)',c)
        self.assertIn('cv_rect(220, 124, 4, 4, BS_FG)',c)
        for bad in [dict(art='0'*256,x=225,y=36,size=1),
                    dict(art='0'*256,x=0,y=53,size=8),
                    dict(art='0'*256,x=0,y=36,size=True)]:
            r['design']['artLayers']=[bad]
            with self.assertRaises(ValueError): blacksmith.validate_recipe(r)

    def test_extended_sounds_and_invalid_designs(self):
        for wave in ['sawtooth','square','noise']:
            r=recipe();r['presets'][0].update(wave=wave,tune=12,level=0.5,pulse=0.3,lfoRate=3,lfoDepth=20)
            self.assertIn('bs_lfo +=',blacksmith.generate_sources(r)['app.c'])
        for value in [dict(art='<script>'),dict(colors=['bad']*6),dict(subtitle='"; BAD'),dict(align='html'),dict(border=1)]:
            r=recipe();r['design']=value
            with self.assertRaises(ValueError):blacksmith.validate_recipe(r)
        r=recipe();r['settings']=dict(usbAudioIn=False,usbAudioOut=True)
        with self.assertRaises(ValueError):blacksmith.validate_recipe(r)
        r['assets']=[{'name':'x.fep','base64':'eA=='},{'name':'X.FEP','base64':'eA=='}]
        with self.assertRaises(ValueError):blacksmith.validate_recipe(r)

    def test_saved_zip_round_trip_integrity_and_path_isolation(self):
        with tempfile.TemporaryDirectory() as d:
            meta=blacksmith.save_project(d,recipe());self.assertFalse(meta['compiled']);self.assertFalse(meta['installable'])
            self.assertEqual(blacksmith.load_project(d,meta['id']),blacksmith.validate_recipe(recipe()))
            self.assertEqual(len(blacksmith.projects(d)),1)
            with zipfile.ZipFile(io.BytesIO(blacksmith.project_bytes(d,meta['id']))) as z:
                self.assertIn('app.c',z.namelist());self.assertTrue(all(not n.startswith('/') and '..' not in n for n in z.namelist()))
            with self.assertRaises(ValueError):blacksmith.project_bytes(d,'../../server')
            (Path(d)/'blacksmith'/(meta['id']+'.zip')).write_bytes(b'corrupt')
            with self.assertRaises(ValueError):blacksmith.project_bytes(d,meta['id'])
            self.assertEqual(blacksmith.projects(d),[])


if __name__=='__main__':unittest.main()
