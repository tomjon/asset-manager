from StringIO import StringIO
from parser import parse_xml

def test_parser():
    xml = """<root>
  <object>
    <field1>foo</field1>
    <field1>bar</field1>
    <field2>baz</field2>
    <field3>
        goat
        <nested1>rabbit</nested1>
        <nested2>llama</nested2>
        herd
    </field3>
  </object>
  <thing>
    <field>basic</field>
  </thing>
</root>"""
    
    nodes = []

    def emit(node, arg1, arg2):
        nodes.append(node)
        assert arg1 == 'arg1'
        assert arg2 == 'arg2'

    assert parse_xml(StringIO(xml), emit, 'arg1', 'arg2') == 2

    assert len(nodes) == 2

    assert nodes[0].name == 'object'
    assert len(nodes[0].fields) == 4
    assert nodes[0].fields[0].name == 'field1'
    assert nodes[0].fields[0].value() == 'foo'
    assert nodes[0].fields[1].name == 'field1'
    assert nodes[0].fields[1].value() == 'bar'
    assert nodes[0].fields[2].name == 'field2'
    assert nodes[0].fields[2].value() == 'baz'
    assert nodes[0].fields[3].name == 'field3'
    assert nodes[0].fields[3].value() == 'goatherd'
    assert len(nodes[0].fields[3].fields) == 2
    assert nodes[0].fields[3].fields[0].name == 'nested1'
    assert nodes[0].fields[3].fields[0].value() == 'rabbit'
    assert nodes[0].fields[3].fields[1].name == 'nested2'
    assert nodes[0].fields[3].fields[1].value() == 'llama'

    assert nodes[1].name == 'thing'
    assert len(nodes[1].fields) == 1
    assert nodes[1].fields[0].name == 'field'
    assert nodes[1].fields[0].value() == 'basic'


