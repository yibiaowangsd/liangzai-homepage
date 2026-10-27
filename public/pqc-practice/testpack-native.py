#!/usr/bin/env python3
"""Replay a Liangzai v1 testpack against a native library exporting lab_* ABI.

The suite is an explicit caller declaration, not algorithm detection.
Only dedicated test keys belong in these files. No input bytes enter reports.
"""
import argparse
import base64
import ctypes as c
import hashlib
import json
import time
from datetime import datetime, timezone
from pathlib import Path


def decode(value):
    if not isinstance(value, dict) or not isinstance(value.get('value'), str):
        raise ValueError('Missing encoded value')
    encoding, text = value.get('encoding'), value['value']
    if encoding == 'hex':
        return bytes.fromhex(text)
    if encoding == 'base64':
        return base64.b64decode(''.join(text.split()), validate=True)
    if encoding == 'utf8':
        return text.encode('utf-8')
    raise ValueError('Unknown encoding')


def digest(value):
    if not isinstance(value, bytes):
        value = json.dumps(value, ensure_ascii=False, separators=(',', ':')).encode('utf-8')
    return hashlib.sha256(value).hexdigest()


def replay(pack, library_path, declared_suite):
    if pack.get('format') != 'liangzai-pqc-testpack' or pack.get('schemaVersion') != 1:
        raise ValueError('需要 liangzai-pqc-testpack v1。')
    cases = pack.get('cases')
    if not isinstance(cases, list) or not 1 <= len(cases) <= 100:
        raise ValueError('测试包需要1至100个用例。')
    ids = [row.get('id') for row in cases]
    if any(not isinstance(value, str) or not value or len(value) > 120 for value in ids) or len(ids) != len(set(ids)):
        raise ValueError('用例ID缺失或重复。')
    library_path = Path(library_path).resolve()
    library = c.CDLL(str(library_path))
    pointer = c.POINTER(c.c_ubyte)
    for name in ['lab_public_bytes', 'lab_private_bytes', 'lab_output_bytes']:
        function = getattr(library, name)
        function.argtypes, function.restype = [], c.c_int
    sizes = {key: getattr(library, 'lab_' + name + '_bytes')() for key, name in [('pk', 'public'), ('sk', 'private'), ('out', 'output')]}
    if not all(0 < size <= 32 * 1024 * 1024 for size in sizes.values()):
        raise ValueError('原生库声明的材料长度无效。')
    results = []
    for row in cases:
        result = {'id': row['id'], 'suite': declared_suite, 'operation': row.get('operation'), 'caseFingerprint': digest(row), 'status': 'error', 'ms': None}
        blocks = []

        def put(value):
            data = (c.c_ubyte * max(1, len(value)))()
            data[:len(value)] = value
            blocks.append(data)
            return data

        try:
            if row.get('suite') != declared_suite:
                raise ValueError('Suite does not match the loaded native adapter')
            inputs, expected = row['inputs'], row['expected']
            if row['operation'] == 'verify':
                if type(expected.get('valid')) is not bool:
                    raise ValueError('Expected valid must be boolean')
                pk, message, signature = [decode(inputs[key]) for key in ['publicKey', 'message', 'signature']]
                if len(pk) != sizes['pk'] or len(message) > 65536 or not 1 <= len(signature) <= sizes['out'] or (declared_suite['library'] == 'nist' and len(signature) != sizes['out']):
                    raise ValueError('Invalid key, message or signature length')
                function = library.lab_verify
                function.argtypes, function.restype = [pointer, c.c_int, pointer, c.c_int, pointer], c.c_int
                signature_buffer, message_buffer, public_buffer = put(signature), put(message), put(pk)
                start = time.perf_counter()
                valid = function(signature_buffer, len(signature), message_buffer, len(message), public_buffer) == 0
                result.update(ms=(time.perf_counter() - start) * 1000, expected=expected['valid'], actual=valid)
            elif row['operation'] == 'decapsulate':
                sk, ciphertext, expected_secret = [decode(value) for value in [inputs['privateKey'], inputs['ciphertext'], expected['sharedSecret']]]
                if len(sk) != sizes['sk'] or len(ciphertext) != sizes['out'] or type(expected.get('matches', True)) is not bool:
                    raise ValueError('Invalid key, ciphertext or expectation')
                if declared_suite['library'] == 'nist':
                    shared_size = 32
                else:
                    library.lab_shared_bytes.argtypes, library.lab_shared_bytes.restype = [], c.c_int
                    shared_size = library.lab_shared_bytes()
                if not 1 <= shared_size <= 65536 or len(expected_secret) != shared_size:
                    raise ValueError('Invalid shared-secret length')
                function = library.lab_dec
                function.argtypes, function.restype = [pointer, pointer, pointer], c.c_int
                output, cipher_buffer, private_buffer = put(bytes(shared_size)), put(ciphertext), put(sk)
                start = time.perf_counter()
                status = function(output, cipher_buffer, private_buffer)
                elapsed = (time.perf_counter() - start) * 1000
                if status != 0:
                    raise ValueError('Native operation failed')
                actual = bytes(output)
                result.update(ms=elapsed, expected=expected.get('matches', True), actual=actual == expected_secret, resultFingerprint=digest(actual), expectedFingerprint=digest(expected_secret))
            else:
                raise ValueError('Unsupported operation')
            result['status'] = 'passed' if result['actual'] == result['expected'] else 'failed'
        except (ValueError, KeyError, TypeError, AttributeError):
            result['error'] = '输入、参数、原生ABI或算法执行失败；未将异常当作预期失败。'
        finally:
            for block in blocks:
                c.memset(c.addressof(block), 0, c.sizeof(block))
        results.append(result)
    return {'format': 'liangzai-pqc-result', 'schemaVersion': 1, 'createdAt': datetime.now(timezone.utc).isoformat(), 'implementation': '调用者提供的 lab_* 原生适配库', 'scope': '功能复验；suite由调用者声明，非算法识别或认证', 'provenance': {'nativeLibrarySha256': hashlib.sha256(library_path.read_bytes()).hexdigest(), 'runnerSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest()}, 'total': len(results), 'passed': sum(row['status'] == 'passed' for row in results), 'failed': sum(row['status'] == 'failed' for row in results), 'errors': sum(row['status'] == 'error' for row in results), 'results': results}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('testpack', type=Path)
    parser.add_argument('--library', type=Path, required=True, help='Shared library exporting the documented lab_* ABI')
    parser.add_argument('--suite', required=True, help='Exact library/family/variant/hash, e.g. ngcc/kem-01/0/shake')
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    values = args.suite.split('/')
    if len(values) != 4:
        parser.error('--suite requires library/family/variant/hash')
    declared = dict(zip(['library', 'family', 'variant', 'hash'], values))
    if declared['library'] not in ['nist', 'ngcc']:
        parser.error('library must be nist or ngcc')
    report = replay(json.loads(args.testpack.read_text(encoding='utf-8')), args.library, declared)
    args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f"{report['passed']} passed, {report['failed']} failed, {report['errors']} errors")
    return 0 if report['passed'] == report['total'] else 1


if __name__ == '__main__':
    raise SystemExit(main())
