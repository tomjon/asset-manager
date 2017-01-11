package uk.org.ofcom.ses.bams.solr;

import java.io.File;
import java.io.FileReader;
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
import org.apache.lucene.util.IOUtils;
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
	public static final String INIT_RELOAD_PREFIX = "reload_prefix";
	
	// map from enum name (==field name) => map from value => order
	private Map<String, Map<String, Long>> enumValues = new HashMap<>();
	
	// URL from which to load enums
	private URL enumsUrl;
	
	// default order if the doc field value is missing
	private long defaultNoValue;
	
	// default order if the enumeration is missing the doc field value
	private long defaultNoOrder;
	
	// reload key, if this is encountered as argument, we reload (and nothing else)
	private String reloadPrefix;

	private void loadEnums() {
		JSONParser parser = new JSONParser();
		try (InputStreamReader in = new InputStreamReader(enumsUrl.openStream())) {
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
		} catch (IOException | ParseException e) {
			throw new RuntimeException(e);
		}
	}
	
	/**
	 * Initialise the enumeration from the file indicated.
	 */
	public void init(NamedList args) {
		try {
			enumsUrl = new URL((String)args.get(INIT_URL));
		} catch (MalformedURLException e) {
			throw new RuntimeException(e);
		}
		defaultNoValue = Long.valueOf((String)args.get(INIT_DEFAULT_NO_VALUE));
		defaultNoOrder = Long.valueOf((String)args.get(INIT_DEFAULT_NO_ORDER));
		reloadPrefix = (String)args.get(INIT_RELOAD_PREFIX);
		loadEnums();
	}
	
	private String checkForReload(String field) {		
		if (field.startsWith(reloadPrefix)) {
			loadEnums();
			field = field.substring(reloadPrefix.length());
		}
		return field;
	}
	
	public ValueSource parse(FunctionQParser fqp) throws SyntaxError {
		// SOLR document field (==enumeration name) from which to look up values
		final String field = checkForReload(fqp.parseArg());
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
