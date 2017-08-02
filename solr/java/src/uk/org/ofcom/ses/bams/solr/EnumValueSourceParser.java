package uk.org.ofcom.ses.bams.solr;

import java.io.IOException;
import java.io.InputStreamReader;
import java.net.MalformedURLException;
import java.net.URL;
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

	public static final String INIT_URL= "url";
	public static final String INIT_DEFAULT_NO_VALUE = "default_no_value";
	public static final String INIT_DEFAULT_NO_ORDER = "default_no_order";
	
	public static final int OP_ENUM = 0; // normal operation - evaulate enum
	public static final int OP_RELOAD = 1; // reload enums (and still evaluate enum)
	public static final int OP_RELOAD_ONLY = 2; // reload enum (give default value for all docs)
	
	private static String DUMMY_FIELD = new String();
	
	// map from enum name (==field name) => map from value => order
	private Map<String, Map<String, Long>> enumValues = new HashMap<>();
	
	// URL from which to load enums
	private URL enumsUrl;
	
	// default order if the doc field value is missing
	private long defaultNoValue;
	
	// default order if the enumeration is missing the doc field value
	private long defaultNoOrder;
	
	// reload count - this is a query cache buster
	private int count;

	private Map<String, Map<String, Long>> loadEnums() {
		try (InputStreamReader in = new InputStreamReader(enumsUrl.openStream())) {
			Map<String, Map<String, Long>> enumValues = new HashMap<>();
			JSONParser parser = new JSONParser();
			JSONObject enums = (JSONObject)parser.parse(in);
			for (Object field : enums.keySet()) {
				Map<String, Long> values = new HashMap<String, Long>();
				enumValues.put((String)field, values);
				JSONArray mappings = (JSONArray)enums.get(field);
				for (int i = 0; i < mappings.size(); ++i) {
					JSONObject mapping = (JSONObject)mappings.get(i);
					String value = mapping.get("value").toString();
					Long order = (Long)mapping.get("order");
					values.put(value, order);
				}
			}
			return enumValues;
		} catch (IOException | ParseException e) {
			throw new RuntimeException(e);
		} finally {
			++count;
		}
	}
	
	/**
	 * Initialise the enumeration from the file indicated.
	 */
	public void init(@SuppressWarnings("rawtypes") NamedList args) {
		try {
			enumsUrl = new URL((String)args.get(INIT_URL));
		} catch (MalformedURLException e) {
			throw new RuntimeException(e);
		}
		defaultNoValue = Long.valueOf((String)args.get(INIT_DEFAULT_NO_VALUE));
		defaultNoOrder = Long.valueOf((String)args.get(INIT_DEFAULT_NO_ORDER));
		enumValues = loadEnums();
	}
	
	private String checkForReload(FunctionQParser fqp) throws SyntaxError {
		String field = fqp.parseArg();
		int op = fqp.parseInt();
		if (op == OP_ENUM) {
			return field;
		} else if (op == OP_RELOAD) {
			enumValues = loadEnums();
			return field;
		} else if (op == OP_RELOAD_ONLY) {
			enumValues = loadEnums();
			return DUMMY_FIELD;
		}
		throw new RuntimeException("Bad operation: " + op);
	}
	
	public ValueSource parse(FunctionQParser fqp) throws SyntaxError {
		// SOLR document field (==enumeration name) from which to look up values
		final String field = checkForReload(fqp);
		final Map<String, Long> values = enumValues.get(field);
		
		if (values == null && field != DUMMY_FIELD) {
			throw new RuntimeException("No such enumeration: " + field);
		}
		
		return new ValueSource() {
			// this is used as part of the query cache key
			public String description() {
				return "Enumeration for " + field + " *" + count;
			}

			public FunctionValues getValues(@SuppressWarnings("rawtypes") Map context, LeafReaderContext readerContext) throws IOException {
				final BinaryDocValues docValues = field != DUMMY_FIELD ? DocValues.getBinary(readerContext.reader(), field) : null;

				return new DoubleDocValues(this) {
					public double doubleVal(int doc) {
						if (docValues != null) {
							BytesRef docValue = docValues.get(doc);
							if (docValue == null) return defaultNoValue;
							String key = docValue.utf8ToString();
							if (! values.containsKey(key)) return defaultNoOrder;
							return values.get(key);
						} else {
							return defaultNoValue;
						}
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
