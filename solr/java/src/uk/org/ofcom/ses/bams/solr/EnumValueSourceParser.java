package uk.org.ofcom.ses.bams.solr;

import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileReader;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

import org.apache.lucene.index.BinaryDocValues;
import org.apache.lucene.index.DocValues;
import org.apache.lucene.index.LeafReaderContext;
import org.apache.lucene.queries.function.FunctionValues;
import org.apache.lucene.queries.function.ValueSource;
import org.apache.lucene.queries.function.docvalues.DoubleDocValues;
import org.apache.lucene.util.BytesRef;
import org.apache.solr.common.util.NamedList;
import org.apache.solr.search.FunctionQParser;
import org.apache.solr.search.SyntaxError;
import org.apache.solr.search.ValueSourceParser;
import org.json.simple.JSONArray;
import org.json.simple.JSONObject;
import org.json.simple.parser.JSONParser;
import org.json.simple.parser.ParseException;

public class EnumValueSourceParser extends ValueSourceParser {

	public static final String INIT_DIRECTORY = "directory";
	public static final String INIT_DEFAULT_NO_VALUE = "default_no_value";
	public static final String INIT_DEFAULT_NO_ORDER = "default_no_order";
	
	// map from enum name (==field name) => map from value => order
	private Map<String, Map<String, Long>> enumValues = new HashMap<>();
	
	// default order if the doc field value is missing
	private long defaultNoValue;
	
	// default order if the enumeration is missing the doc field value
	private long defaultNoOrder;
	
	/**
	 * Initialise the enumeration from the file indicated.
	 */
	public void init(NamedList args) {
		defaultNoValue = Long.valueOf((String)args.get(INIT_DEFAULT_NO_VALUE));
		defaultNoOrder = Long.valueOf((String)args.get(INIT_DEFAULT_NO_ORDER));
		
		File directory = new File((String)args.get(INIT_DIRECTORY));
		JSONParser parser = new JSONParser();
		for (File enumDefinition : directory.listFiles()) {
			Map<String, Long> values = new HashMap<String, Long>();
			enumValues.put(enumDefinition.getName(), values);
			try (FileReader in = new FileReader(enumDefinition)) {
				JSONArray mappings = (JSONArray)parser.parse(in);
				for (int i = 0; i < mappings.size(); ++i) {
					JSONObject mapping = (JSONObject)mappings.get(i);
					String value = mapping.get("value").toString();
					Long order = (Long)mapping.get("order");
					values.put(value, order);
				}
			} catch (IOException | ParseException e) {
				throw new RuntimeException(e);
			}
		}
	}
	
	public ValueSource parse(FunctionQParser fqp) throws SyntaxError {
		// SOLR document field (==enumeration name) from which to look up values
		final String field = fqp.parseArg();
		final Map<String, Long> values = enumValues.get(field);
		
		if (values == null) {
			throw new RuntimeException("No such enumeration: " + field);
		}
		
		return new ValueSource() {

			public String description() {
				return "Enumerations evaluated on " + field;
			}

			public FunctionValues getValues(Map context, LeafReaderContext readerContext) throws IOException {
				final BinaryDocValues docValues = DocValues.getBinary(readerContext.reader(), field);

				return new DoubleDocValues(this) {

					public double doubleVal(int doc) {
						BytesRef docValue = docValues.get(doc);
						if (docValue == null) return defaultNoValue;
						String key = docValue.utf8ToString();
						if (! values.containsKey(key)) return defaultNoOrder;
						return values.get(key);
					}
					
				};
			}

			public int hashCode() {
				return description().hashCode();
			}
			
			public boolean equals(Object that) {
				return that.hashCode() == hashCode();
			}
			
		};
	}

}
