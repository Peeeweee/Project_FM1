// Protocol facts: czietz/fm1-read-voice (MIT), AL-255/FM-1-RE, Yamaha DX7 MIDI.
// No OTA/update command is implemented in this module.
export function pack(bytes) {
  const result = []; let acc = 0, bits = 0;
  for (const byte of bytes) {
    acc |= byte << bits; bits += 8;
    while (bits >= 7) { result.push(acc & 127); acc >>>= 7; bits -= 7; }
  }
  if (bits) result.push(acc & 127);
  return result;
}
export function unpack(bytes) {
  const result = []; let acc = 0, bits = 0;
  for (const byte of bytes) {
    if (byte > 127) throw Error('Invalid packed MIDI byte');
    acc |= byte << bits; bits += 7;
    while (bits >= 8) { result.push(acc & 255); acc >>>= 8; bits -= 8; }
  }
  return result;
}
export function frame(type, body = []) {
  const n = body.length;
  return [240, ...pack([0, 89, type, n & 255, (n >> 8) & 255, (n >> 16) & 255, ...body,
    (~body.reduce((a, b) => a + b, 0)) & 255]), 247];
}
export function decode(message) {
  if (message[0] !== 240 || message.at(-1) !== 247) return null;
  let bytes;
  try { bytes = unpack(Array.from(message).slice(1, -1)); } catch { return null; }
  if (bytes[0] !== 0 || bytes[1] !== 89 || bytes.length < 7) return null;
  const size = bytes[3] + bytes[4] * 256 + bytes[5] * 65536;
  if (bytes.length !== size + 7) return null;
  const body = bytes.slice(6, 6 + size);
  if (((~body.reduce((a, b) => a + b, 0)) & 255) !== bytes.at(-1)) return null;
  return {type: bytes[2], body};
}
export function identity(message) {
  const f = decode(message);
  if (!f || f.type !== 17 || f.body.length !== 27) return null;
  const name = String.fromCharCode(...f.body).replace(/\0+$/, '');
  const match = /^(FM-1|ota-FM-1)_(\d+)$/.exec(name);
  return match ? {model: match[1], version: Number(match[2]), reported: name} : null;
}
export const readCommand = () => frame(35, [5, 0, 0, 0, 0, 155, 0, 0]);
export function readReply(message) {
  const f = decode(message);
  if (!f || f.type !== 35 || f.body.length !== 163 || f.body[0] !== 5 ||
      f.body.slice(1, 5).some(Boolean) || f.body[5] !== 155 || f.body[6] || f.body[7]) return null;
  const voice = f.body.slice(8);
  return voice.every(b => b < 128) ? voice : null;
}
export const voiceName = voice => String.fromCharCode(...voice.slice(145, 155)).replace(/[^\x20-\x7e]/g, ' ').trim();
export function singleSysex(voice) {
  if (voice.length !== 155 || voice.some(b => !Number.isInteger(b) || b < 0 || b > 127)) throw Error('Invalid voice');
  return [240, 67, 0, 0, 1, 27, ...voice, (-voice.reduce((a,b) => a+b, 0)) & 127, 247];
}
export function validateCapture(obj) {
  if (obj.schema !== 'fm1-dock/1' || !Array.isArray(obj.voices) || ![1,128].includes(obj.voices.length)) throw Error('Invalid FM1 backup');
  if (obj.scope !== (obj.voices.length === 1 ? 'current-sound' : 'saved-sounds')) throw Error('Capture scope mismatch');
  if (obj.device?.model !== 'FM-1' || ![14,15].includes(obj.device.version)) throw Error('Unsupported capture device');
  obj.voices.forEach(singleSysex);
  return obj;
}
// Yamaha's 32-voice bank format packs each operator's bit fields into 17 bytes.
export function packedVoice(v) {
  singleSysex(v);
  const out = [];
  for (let op = 0; op < 6; op++) {
    const a = v.slice(op * 21, op * 21 + 21);
    out.push(...a.slice(0,11), (a[11]&3)|((a[12]&3)<<2),
      (a[13]&7)|((a[20]&15)<<3), (a[14]&3)|((a[15]&7)<<2), a[16],
      (a[17]&1)|((a[18]&31)<<1), a[19]);
  }
  out.push(...v.slice(126,134), v[134]&31, (v[135]&7)|((v[136]&1)<<3),
    ...v.slice(137,141), (v[141]&1)|((v[142]&7)<<1)|((v[143]&7)<<4), ...v.slice(144));
  return out;
}
export function bankSysex(voices) {
  if (voices.length !== 32) throw Error('A bank must contain 32 voices');
  const data = voices.flatMap(packedVoice);
  return [240,67,0,9,32,0,...data,(-data.reduce((a,b)=>a+b,0))&127,247];
}
