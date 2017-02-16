from StringIO import StringIO
from function import _parse_freq_range

def test_range():
    assert _parse_freq_range('10Hz-4GHz') == (1e-5, 4e3, '')
    assert _parse_freq_range('0.3-2MHz') == (3e-1, 2, '')
    assert _parse_freq_range('? 1-4ghz') == (1e3, 4e3, '?')
    assert _parse_freq_range('try .6MHz-4MHz?') == (6e-1, 4, 'try ?')

