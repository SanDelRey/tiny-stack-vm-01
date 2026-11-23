import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const I = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const O = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const SL = 1e6,
  OM = 65536,
  NB = new Uint8Array(11);
const D = new Int32Array(256),
C = new Int32Array(64),
M = new Int32Array(256),
out = new Uint8Array(OM);
function run(p, input) {
const n = p.length;
let sp = 0,
csp = 0,
olen = 0,
ip = 0,
pc = 0,
steps = 0;
M.fill(0);
const trap = (c) => ({ stdout: out.subarray(0, olen), exit: c });
for (;;) {
if (steps === SL) return trap(10);
if (pc < 0 || pc >= n) return trap(9);
const op = p[pc];
let imm = 0;
let pops = 0,
pushes = 0;
switch (op) {
case 0x01: imm = 1; pushes = 1; break;
case 0x02: imm = 4; pushes = 1; break;
case 0x03: pops = 1; break;
case 0x04: pops = 1; pushes = 2; break;
case 0x05: pops = 2; pushes = 2; break;
case 0x06: pops = 2; pushes = 3; break;
case 0x07: pops = 3; pushes = 3; break;
case 0x10: case 0x11: case 0x12: case 0x13: case 0x14: case 0x15:
case 0x16: case 0x18: case 0x19: case 0x1a: case 0x1c: case 0x1d:
case 0x1e: case 0x20: case 0x21: case 0x22:
pops = 2; pushes = 1; break;
case 0x17: case 0x1b: case 0x40: pops = 1; pushes = 1; break;
case 0x41: pops = 2; break;
case 0x30: case 0x33: imm = 2; break;
case 0x31: case 0x32: imm = 2; pops = 1; break;
case 0x34: break;
case 0x50: case 0x51: case 0x53: pops = 1; break;
case 0x52: pushes = 1; break;
case 0x00: break;
default: return trap(5);
}
if (pc + imm >= n) return trap(9);
steps++;
const next = pc + 1 + imm;
if (sp < pops) return trap(2);
if (sp - pops + pushes > 256) return trap(3);
pc = next;
switch (op) {
case 0x00:
return { stdout: out.subarray(0, olen), exit: 0 };
case 0x01:
D[sp++] = (p[next - 1] << 24) >> 24;
break;
case 0x02:
D[sp++] = p[next - 4] | (p[next - 3] << 8) | (p[next - 2] << 16) | (p[next - 1] << 24);
break;
case 0x03:
sp--;
break;
case 0x04:
D[sp] = D[sp - 1];
sp++;
break;
case 0x05: {
const t = D[sp - 1];
D[sp - 1] = D[sp - 2];
D[sp - 2] = t;
break;
}
case 0x06:
D[sp] = D[sp - 2];
sp++;
break;
case 0x07: {
const a = D[sp - 3];
D[sp - 3] = D[sp - 2];
D[sp - 2] = D[sp - 1];
D[sp - 1] = a;
break;
}
case 0x17:
D[sp - 1] = -D[sp - 1] | 0;
break;
case 0x1b:
D[sp - 1] = ~D[sp - 1];
break;
case 0x10: case 0x11: case 0x12: case 0x13: case 0x14: case 0x15:
case 0x16: case 0x18: case 0x19: case 0x1a: case 0x1c: case 0x1d:
case 0x1e: case 0x20: case 0x21: case 0x22: {
const b = D[sp - 1],
a = D[sp - 2];
let r;
if (op === 0x10) r = (a + b) | 0;
else if (op === 0x11) r = (a - b) | 0;
else if (op === 0x12) r = Math.imul(a, b);
else if (op === 0x13 || op === 0x14 || op === 0x15 || op === 0x16) {
if (b === 0) return trap(4);
if (op === 0x13) r = a === -2147483648 && b === -1 ? a : (a / b) | 0;
else if (op === 0x14) r = b === -1 ? 0 : (a % b) | 0;
else if (op === 0x15) r = Math.floor((a >>> 0) / (b >>> 0)) | 0;
else r = ((a >>> 0) % (b >>> 0)) | 0;
} else if (op === 0x18) r = a & b;
else if (op === 0x19) r = a | b;
else if (op === 0x1a) r = a ^ b;
else if (op === 0x1c) r = a << (b & 31);
else if (op === 0x1d) r = a >> (b & 31);
else if (op === 0x1e) r = (a >>> (b & 31)) | 0;
else if (op === 0x20) r = a === b ? 1 : 0;
else if (op === 0x21) r = a < b ? 1 : 0;
else r = a >>> 0 < b >>> 0 ? 1 : 0;
sp -= 2;
D[sp++] = r;
break;
}
case 0x30: case 0x31: case 0x32: {
const rel = ((p[next - 2] | (p[next - 1] << 8)) << 16) >> 16;
let take = true;
if (op !== 0x30) {
const v = D[--sp];
take = op === 0x31 ? v === 0 : v !== 0;
}
if (take) pc = next + rel;
break;
}
case 0x33:
if (csp === 64) return trap(7);
C[csp++] = next;
pc = p[next - 2] | (p[next - 1] << 8);
break;
case 0x34:
if (csp === 0) return trap(8);
pc = C[--csp];
break;
case 0x40: {
const a = D[sp - 1];
if (a < 0 || a > 255) return trap(6);
D[sp - 1] = M[a];
break;
}
case 0x41: {
const a = D[sp - 1],
v = D[sp - 2];
if (a < 0 || a > 255) return trap(6);
sp -= 2;
M[a] = v;
break;
}
case 0x50: {
  let v = D[sp - 1];
  const neg = v < 0;
  let u = neg ? -v : v;
  let k = 11;
  do {
    NB[--k] = 48 + (u % 10);
    u = Math.floor(u / 10);
  } while (u > 0);
  if (neg) NB[--k] = 45;
  const len = 11 - k;
  if (olen + len > OM) return trap(11);
  sp--;
  for (let j = k; j < 11; j++) out[olen++] = NB[j];
  break;
}
case 0x51:
if (olen + 1 > OM) return trap(11);
out[olen++] = D[--sp] & 255;
break;
case 0x52:
D[sp++] = ip < input.length ? input[ip++] : -1;
break;
case 0x53:
return { stdout: out.subarray(0, olen), exit: D[--sp] & 255 };
}
}
}
for (const id of readdirSync(I).sort()) {
const d = join(I, id);
const r = run(readFileSync(join(d, 'program.bin')), readFileSync(join(d, 'input.bin')));
mkdirSync(join(O, id), { recursive: true });
writeFileSync(join(O, id, 'stdout.bin'), r.stdout);
writeFileSync(join(O, id, 'exit.txt'), String(r.exit));
}
