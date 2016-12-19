package uk.org.ofcom.ses.bams.solr;

import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileReader;
import java.io.IOException;
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
	public static final String INIT_ENUMERATION_NAME = "name";
	
	// FS file from which enumeration definitions are loaded
	private File file;
	
	private Map<String, Integer> values;
	
	/**
	 * Initialise the enumeration from the file indicated.
	 */
	public void init(NamedList args) {
		String directory = (String)args.get(INIT_DIRECTORY);
		String name = (String)args.get(INIT_ENUMERATION_NAME);
		file = new File(directory, name);
		
		JSONParser parser = new JSONParser();
		try (FileReader in = new FileReader(file)) {
			JSONArray values = (JSONArray)parser.parse(in);
			for (int i = 0; i < values.size(); ++i) {
				JSONObject value = (JSONObject)values.get(i);
				String v = (String)value.get("value");
				Integer order = (Integer)value.get("order");
				this.values.put(v, order);
			}
		} catch (IOException | ParseException e) {
			throw new RuntimeException(e);
		}
	}
	
	public ValueSource parse(FunctionQParser fqp) throws SyntaxError {
		// SOLR document field from which to look up values
		final String field = fqp.parseArg();
		
		return new ValueSource() {

			public String description() {
				return "Enumeration " + file + " evaluated on " + field;
			}

			public FunctionValues getValues(Map context, LeafReaderContext readerContext) throws IOException {
				final BinaryDocValues docValues = DocValues.getBinary(readerContext.reader(), field);

				return new DoubleDocValues(this) {

					public double doubleVal(int doc) {
						return order(doc);
					}
					
					public boolean exists(int doc) {
						return order(doc) != null;
					}
					
					private Integer order(int doc) {
						BytesRef docValue = docValues.get(doc);
						if (docValue == null) return null; //FIXME or a configurable default value?
						String key = docValue.toString();
						if (! values.containsKey(key)) return null; //FIXME or a configurable default value?
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
