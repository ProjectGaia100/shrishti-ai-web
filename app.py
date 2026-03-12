from flask import Flask, jsonify, request
from flask_cors import CORS
import ee
import traceback
from datetime import datetime, timedelta
import json

# Initialize app
app = Flask(__name__)
CORS(app)

# Initialize Earth Engine with service account
import os, json
_sa_key = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'geovision-final-09127aa1b1eb.json')
try:
    if os.path.exists(_sa_key):
        with open(_sa_key) as _f:
            _kd = json.load(_f)
        _creds = ee.ServiceAccountCredentials(_kd['client_email'], _sa_key)
        ee.Initialize(credentials=_creds, project='geovision-final')
        print(f"GEE initialized with service account: {_kd['client_email']}")
    else:
        ee.Initialize(project='geovision-final')
        print("GEE initialized with default credentials")
except Exception as e:
    print(f"Error initializing Google Earth Engine: {e}")

# Try to import AI dependencies (optional)
try:
    import google.generativeai as genai
    AI_AVAILABLE = True
    print("AI dependencies loaded successfully!")
except ImportError as e:
    print(f"AI dependencies not available: {e}")
    print("Chatbot functionality will be disabled.")
    AI_AVAILABLE = False
    genai = None

# --- GEMINI AI CONFIGURATION (only if available) ---
if AI_AVAILABLE:
    SYSTEM_PROMPT = """
    You are a Google Earth Engine (GEE) expert and geospatial AI assistant for GEO VISION platform. Your task is to receive a user's natural language query and convert it into a valid JSON object for map visualization.

    You MUST respond with ONLY a single, valid JSON object. Do not wrap it in markdown or any other text.

    The JSON object MUST contain the following keys:
    - 'gee_code': A string containing the Python code to generate the GEE Image object (e.g., "ee.Image(...)"). This is mandatory.
    - 'vis_params': A JSON object of visualization parameters for the GEE image. This is mandatory.
    - 'response_text': A user-friendly string explaining what you have done. This is mandatory.
    - 'legend': An optional JSON object describing the legend for the map. It should have a 'title' (string) and 'items' (an array of objects, each with 'color' and 'label' keys).

    **Primary Rules**:
    1. The entire output MUST be a single, valid JSON object.
    2. The `gee_code` string must be syntactically perfect Python code. Use Python's `None`, not `null`.
    3. If the user does not specify a date range, you MUST assume they mean the last 30 days from today's date (2025-08-30).
    4. If the user's request is unclear or cannot be mapped to a GEE dataset, set 'gee_code' to null and explain why in the 'response_text'.

    **Dataset-Specific Instructions**:
    * **NDVI/Vegetation**: Use 'COPERNICUS/S2_SR_HARMONIZED' or 'MODIS/061/MOD13A1' dataset.
    * **Country Filtering**: Use the 'FAO/GAUL/2015/level0' feature collection. For example: `.clip(ee.FeatureCollection('FAO/GAUL/2015/level0').filter(ee.Filter.eq('ADM0_NAME', 'India')))`.
    * **Water/Waterbodies**: Use the 'JRC/GSW1_4/GlobalSurfaceWater' dataset and select the 'occurrence' band.
    * **Fire/Wildfire**: Use the 'MODIS/061/MCD64A1' dataset and select the 'BurnDate' band.
    * **Sentinel-1 Radar**: Use 'COPERNICUS/S1_GRD', filter by `instrumentMode` (usually 'IW').
    * **Sentinel-2 Optical**: Use 'COPERNICUS/S2_SR_HARMONIZED'. For true-color, select bands 'B4', 'B3', 'B2'.
    * **Temperature**: Use 'MODIS/061/MOD11A1' and select 'LST_Day_1km' band.
    * **Precipitation**: Use 'UCSB-CHG/CHIRPS/DAILY' dataset.
    * **Elevation**: Use 'MERIT/DEM/v1_0_3' dataset.
    * **Nighttime Lights**: Use 'NOAA/VIIRS/DNB/MONTHLY_V1/VCMSLCFG' dataset.
    * **Land Cover**: Use 'ESA/WorldCover/v200/2021' dataset.

    Example response:
    {
      "gee_code": "ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED').filterDate('2025-07-30', '2025-08-30').filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE',20)).median().clip(ee.FeatureCollection('FAO/GAUL/2015/level0').filter(ee.Filter.eq('ADM0_NAME', 'India')))",
      "vis_params": {
        "min": 0.0,
        "max": 3000,
        "bands": ["B4", "B3", "B2"]
      },
      "response_text": "Here is a Sentinel-2 true-color image for India from the last 30 days.",
      "legend": null
    }
    """

    # Configure Gemini API
    try:
        api_key = os.environ.get('GEMINI_API_KEY', '')
        if not api_key:
            raise ValueError('GEMINI_API_KEY environment variable not set')
        genai.configure(api_key=api_key)
        
        # First, let's see what models are available
        try:
            available_models = genai.list_models()
            print("Available models:")
            for model in available_models:
                if hasattr(model, 'name'):
                    print(f"  - {model.name}")
        except Exception as list_error:
            print(f"Could not list models: {list_error}")
        
        # Try the current model names (using available models from the list)
        model_names = [
            'models/gemini-2.5-flash',
            'models/gemini-2.0-flash', 
            'models/gemini-flash-latest',
            'models/gemini-pro-latest',
            'models/gemini-2.5-pro',
            'models/gemini-2.0-pro-exp'
        ]
        
        model = None
        for model_name in model_names:
            try:
                print(f"Trying model: {model_name}")
                model = genai.GenerativeModel(model_name, system_instruction=SYSTEM_PROMPT)
                
                # Test the model with a simple query
                test_response = model.generate_content("Hello, respond with just 'OK'")
                print(f"✓ Gemini AI configured and tested successfully with {model_name}: {test_response.text}")
                break
                
            except Exception as model_error:
                print(f"✗ Model {model_name} failed: {model_error}")
                continue
        
        if model is None:
            print("All models failed. AI chat will be disabled.")
            AI_AVAILABLE = False
            
    except Exception as e:
        print(f"Error configuring Gemini API: {e}")
        model = None
        AI_AVAILABLE = False
else:
    model = None

@app.route("/")
def hello():
    return jsonify({
        "message": "GEO VISION Backend is running!",
        "timestamp": datetime.now().isoformat(),
        "status": "active",
        "user": "MEWTROS"
    })

@app.route("/api/health")
def health_check():
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "gee_status": "initialized",
        "ai_status": "available" if AI_AVAILABLE and model else "not_available",
        "user": "MEWTROS"
    })

# -----------------------------
# AI CHATBOT ENDPOINT
# -----------------------------

@app.route('/api/chat', methods=['POST'])
def chat():
    if not AI_AVAILABLE or not model:
        return jsonify({
            'error': 'AI chatbot is not available. Please install required dependencies: pip install google-generativeai',
            'success': False
        }), 503

    try:
        data = request.get_json()
        user_message = data.get('message')
        history = data.get('history', [])

        if not user_message:
            return jsonify({'error': 'No message provided.', 'success': False}), 400

        # Add today's date context
        today = datetime.utcnow().strftime('%Y-%m-%d')
        contextual_message = f"Today's date is {today}. User (MEWTROS) query: {user_message}"

        conversation = history + [{'role': 'user', 'parts': [{'text': contextual_message}]}]

        # Retry logic with maximum 3 attempts
        max_retries = 3
        for attempt in range(max_retries):
            try:
                print(f"AI Attempt {attempt + 1} for user query: {user_message}")
                
                # Generate content with Gemini
                response = model.generate_content(conversation)
                raw_response_text = response.text.strip()
                
                # Clean potential markdown wrappers
                if raw_response_text.startswith("```json"):
                    raw_response_text = raw_response_text[7:-3].strip()
                elif raw_response_text.startswith("```"):
                    raw_response_text = raw_response_text[3:-3].strip()
                
                # Parse JSON response
                result_dict = json.loads(raw_response_text)
                
                gee_code_str = result_dict.get('gee_code')
                vis_params = result_dict.get('vis_params')
                response_text = result_dict.get('response_text', "Here is the map you requested.")
                legend = result_dict.get('legend')

                # If no GEE code, just return the text response
                if not gee_code_str or str(gee_code_str).lower() == 'null' or gee_code_str is None:
                    return jsonify({
                        'response_text': response_text,
                        'legend': legend,
                        'tile_url': None,
                        'success': True,
                        'gee_code': None,
                        'metadata': {
                            'title': 'AI Response',
                            'description': response_text,
                            'source': 'GEO VISION AI Assistant',
                            'timestamp': datetime.now().isoformat()
                        }
                    })

                # Try to execute the GEE code
                try:
                    # Replace 'null' with 'None' for Python compatibility
                    safe_gee_code_str = str(gee_code_str).replace('null', 'None')
                    print(f"Executing GEE code: {safe_gee_code_str}")
                    
                    # Execute the code to get the GEE image
                    image = eval(safe_gee_code_str, {'ee': ee})
                    
                    # Generate map tiles
                    if image and vis_params:
                        map_id = image.getMapId(vis_params)
                        tile_url = map_id['tile_fetcher'].url_format
                        
                        # Create metadata
                        metadata = {
                            'title': f'AI Generated: {response_text[:50]}...' if len(response_text) > 50 else f'AI Generated: {response_text}',
                            'description': response_text,
                            'source': 'GEO VISION AI Assistant + Google Earth Engine',
                            'timestamp': datetime.now().isoformat(),
                            'gee_code': safe_gee_code_str,
                            'legend': legend.get('items', []) if legend else []
                        }
                        
                        return jsonify({
                            'tile_url': tile_url,
                            'response_text': response_text,
                            'legend': legend,
                            'success': True,
                            'gee_code': safe_gee_code_str,
                            'metadata': metadata
                        })
                    else:
                        raise Exception("Failed to generate map tiles - image or vis_params invalid")
                        
                except Exception as gee_error:
                    print(f"GEE execution error on attempt {attempt + 1}: {gee_error}")
                    
                    # If this is not the last attempt, ask Gemini to fix the code
                    if attempt < max_retries - 1:
                        error_message = f"The previous GEE code failed with error: {str(gee_error)}. Please provide corrected code that will work. Generate only valid JSON with working GEE code. Fix the syntax and dataset issues."
                        conversation.append({'role': 'user', 'parts': [{'text': error_message}]})
                        continue
                    else:
                        # Last attempt failed, return error
                        return jsonify({
                            'error': f'Failed to execute GEE code after {max_retries} attempts. Last error: {str(gee_error)}',
                            'response_text': response_text,
                            'success': False
                        }), 500

            except json.JSONDecodeError as json_error:
                print(f"JSON parsing error on attempt {attempt + 1}: {json_error}")
                print(f"Raw response: {raw_response_text}")
                if attempt < max_retries - 1:
                    error_message = "Your response was not valid JSON. Please respond with ONLY a valid JSON object containing gee_code, vis_params, and response_text. Do not include any markdown formatting."
                    conversation.append({'role': 'user', 'parts': [{'text': error_message}]})
                    continue
                else:
                    return jsonify({
                        'error': f'Failed to parse AI response after {max_retries} attempts. Response was not valid JSON.',
                        'success': False
                    }), 500
                    
            except Exception as general_error:
                print(f"General error on attempt {attempt + 1}: {general_error}")
                if attempt < max_retries - 1:
                    continue
                else:
                    return jsonify({
                        'error': f'An internal error occurred after {max_retries} attempts: {str(general_error)}',
                        'success': False
                    }), 500

        # This should never be reached, but just in case
        return jsonify({
            'error': 'Maximum retry attempts exceeded',
            'success': False
        }), 500

    except Exception as e:
        print(f"Chat endpoint error: {str(e)}")
        return jsonify({
            'error': f'Chat service error: {str(e)}',
            'success': False
        }), 500

# -----------------------------
# GEE DATA ENDPOINTS
# -----------------------------

@app.route("/api/gee/ndvi")
def get_ndvi_tiles():
    try:
        # Use a more recent 10-day period (you can adjust these dates)
        collection = ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED") \
            .filterDate("2024-06-01", "2024-06-10") \
            .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 10)) \
            .select(['B8', 'B4'])  # NIR and Red

        image = collection.median()
        ndvi = image.normalizedDifference(['B8', 'B4']).rename('NDVI')

        vis_params = {
            'min': 0.0,
            'max': 1.0,
            'palette': ['brown', 'yellow', 'green']
        }

        map_id = ndvi.getMapId(vis_params)
        
        return jsonify({
            'success': True,
            'tile_url': map_id['tile_fetcher'].url_format,
            'metadata': {
                'title': 'NDVI (Vegetation Health)',
                'description': 'Normalized Difference Vegetation Index showing plant health',
                'source': 'Copernicus Sentinel-2 SR Harmonized',
                'date_range': '2024-05-01 to 2024-06-10',
                'resolution': '10m',
                'legend': [
                    {'color': 'brown', 'label': 'No vegetation', 'value': '0.0 - 0.3'},
                    {'color': 'yellow', 'label': 'Sparse vegetation', 'value': '0.3 - 0.6'},
                    {'color': 'green', 'label': 'Healthy vegetation', 'value': '0.6 - 1.0'}
                ]
            }
        })
        
    except Exception as e:
        print(f"Error in NDVI endpoint: {str(e)}")
        return jsonify({
            'success': False, 
            'error': f'Failed to process NDVI data: {str(e)}'
        }), 500

@app.route("/api/gee/elevation")
def get_elevation_tiles():
    try:
        elevation = ee.Image("MERIT/DEM/v1_0_3").select('dem')

        vis_params = {
            'min': 0,
            'max': 6000,
            'palette': ['#000080', '#0000FF', '#00FFFF', '#FFFF00', '#FF8000', '#FF0000', '#800080']
        }

        map_id = elevation.getMapId(vis_params)
        
        return jsonify({
            'success': True,
            'tile_url': map_id['tile_fetcher'].url_format,
            'metadata': {
                'title': 'Digital Elevation Model',
                'description': 'Terrain elevation above sea level',
                'source': 'MERIT DEM',
                'resolution': '90m',
                'legend': [
                    {'color': '#000080', 'label': 'Sea level', 'value': '0m'},
                    {'color': '#0000FF', 'label': 'Low elevation', 'value': '0-500m'},
                    {'color': '#00FFFF', 'label': 'Hills', 'value': '500-1000m'},
                    {'color': '#FFFF00', 'label': 'Mountains', 'value': '1000-2000m'},
                    {'color': '#FF8000', 'label': 'High mountains', 'value': '2000-4000m'},
                    {'color': '#FF0000', 'label': 'Very high peaks', 'value': '4000-6000m'},
                    {'color': '#800080', 'label': 'Extreme peaks', 'value': '>6000m'}
                ]
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route("/api/gee/lights")
def get_nighttime_lights_tiles():
    try:
        image = ee.ImageCollection('NOAA/VIIRS/DNB/MONTHLY_V1/VCMSLCFG') \
            .filterDate('2023-01-01', '2023-12-31') \
            .select('avg_rad') \
            .median()
        
        # Apply gamma correction for better visual appeal
        gamma_corrected = image.pow(0.8).multiply(5)
        
        # Ultra-dramatic visualization
        vis_params = {
            'min': 0,
            'max': 15,
            'palette': [
                '#000000',  # Pure black
                '#1a0033',  # Deep purple
                '#330066',  # Purple
                '#4d0099',  # Bright purple
                '#6600cc',  # Violet
                '#7f00ff',  # Electric violet
                '#9933ff',  # Light violet
                '#cc66ff',  # Pink
                '#ff99ff',  # Light pink
                '#ffccff',  # Very light pink
                '#ffffff'   # Pure white
            ]
        }

        map_id = gamma_corrected.getMapId(vis_params)
        
        return jsonify({
            'success': True,
            'tile_url': map_id['tile_fetcher'].url_format,
            'metadata': {
                'title': 'Nighttime Lights (Dramatic)',
                'description': 'Dramatic visualization of global human activity at night',
                'source': 'NOAA VIIRS DNB (Gamma Enhanced)',
                'date_range': '2023 Annual Composite',
                'processing': 'Gamma correction and contrast enhancement',
                'legend': [
                    {'color': '#000000', 'label': 'No activity', 'value': 'Uninhabited'},
                    {'color': '#1a0033', 'label': 'Minimal', 'value': 'Rural'},
                    {'color': '#330066', 'label': 'Low', 'value': 'Small towns'},
                    {'color': '#6600cc', 'label': 'Medium', 'value': 'Cities'},
                    {'color': '#9933ff', 'label': 'High', 'value': 'Major cities'},
                    {'color': '#cc66ff', 'label': 'Very high', 'value': 'Mega cities'},
                    {'color': '#ffccff', 'label': 'Extreme', 'value': 'Urban centers'},
                    {'color': '#ffffff', 'label': 'Maximum', 'value': 'City cores'}
                ]
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route("/api/gee/landcover")
def get_landcover_tiles():
    try:
        image = ee.Image("ESA/WorldCover/v200/2021")

        vis_params = {
            'min': 10,
            'max': 100,
            'palette': [
                '#006400', '#ffbb22', '#ffff4c', '#f096ff', '#fa0000',
                '#b4b4b4', '#f0f0f0', '#0064c8', '#0096a0', '#00cf75'
            ]
        }

        map_id = image.getMapId(vis_params)
        
        return jsonify({
            'success': True,
            'tile_url': map_id['tile_fetcher'].url_format,
            'metadata': {
                'title': 'Land Cover Classification',
                'description': 'Global land cover types at 10m resolution',
                'source': 'ESA WorldCover 2021',
                'resolution': '10m',
                'legend': [
                    {'color': '#006400', 'label': 'Tree cover', 'value': '10'},
                    {'color': '#ffbb22', 'label': 'Shrubland', 'value': '20'},
                    {'color': '#ffff4c', 'label': 'Grassland', 'value': '30'},
                    {'color': '#f096ff', 'label': 'Cropland', 'value': '40'},
                    {'color': '#fa0000', 'label': 'Built-up', 'value': '50'},
                    {'color': '#b4b4b4', 'label': 'Bare/sparse vegetation', 'value': '60'},
                    {'color': '#f0f0f0', 'label': 'Snow and ice', 'value': '70'},
                    {'color': '#0064c8', 'label': 'Permanent water bodies', 'value': '80'},
                    {'color': '#0096a0', 'label': 'Herbaceous wetland', 'value': '90'},
                    {'color': '#00cf75', 'label': 'Mangroves', 'value': '95'}
                ]
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route("/api/gee/temperature")
def get_temperature_tiles():
    try:
        collection = ee.ImageCollection('MODIS/061/MOD11A1') \
            .filterDate('2023-06-01', '2023-08-31') \
            .select('LST_Day_1km')
        
        # Convert from Kelvin to Celsius
        temp_celsius = collection.median().multiply(0.02).subtract(273.15)

        vis_params = {
            'min': 15,
            'max': 45,
            'palette': ['#000080', '#0000FF', '#00FFFF', '#00FF00', '#FFFF00', '#FF8000', '#FF0000']
        }

        map_id = temp_celsius.getMapId(vis_params)
        
        return jsonify({
            'success': True,
            'tile_url': map_id['tile_fetcher'].url_format,
            'metadata': {
                'title': 'Land Surface Temperature',
                'description': 'Daytime land surface temperature',
                'source': 'MODIS Terra',
                'date_range': 'Summer 2023',
                'legend': [
                    {'color': '#000080', 'label': 'Very cold', 'value': '< 20°C'},
                    {'color': '#0000FF', 'label': 'Cold', 'value': '20-25°C'},
                    {'color': '#00FFFF', 'label': 'Cool', 'value': '25-30°C'},
                    {'color': '#00FF00', 'label': 'Moderate', 'value': '30-35°C'},
                    {'color': '#FFFF00', 'label': 'Warm', 'value': '35-40°C'},
                    {'color': '#FF8000', 'label': 'Hot', 'value': '40-45°C'},
                    {'color': '#FF0000', 'label': 'Very hot', 'value': '> 45°C'}
                ]
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# -----------------------------
# ML MODEL ENDPOINTS (Placeholder)
# -----------------------------

@app.route("/api/ml/flood-risk")
def get_flood_risk():
    return jsonify({
        'success': True,
        'message': 'Flood risk model endpoint - Implementation pending',
        'metadata': {
            'title': 'Flood Risk Prediction',
            'description': 'ML model for flood risk assessment',
            'status': 'coming_soon'
        }
    })

@app.route("/api/ml/weather-forecast")
def get_weather_forecast():
    return jsonify({
        'success': True,
        'message': 'Weather forecast model endpoint - Implementation pending',
        'metadata': {
            'title': 'Weather Forecast',
            'description': 'ML model for weather prediction',
            'status': 'coming_soon'
        }
    })

@app.route("/api/ml/disaster-prediction")
def get_disaster_prediction():
    return jsonify({
        'success': True,
        'message': 'Disaster prediction model endpoint - Implementation pending',
        'metadata': {
            'title': 'Disaster Risk Assessment',
            'description': 'ML model for disaster prediction',
            'status': 'coming_soon'
        }
    })

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == "__main__":
    print(f"GEO VISION Backend starting...")
    print(f"Google Earth Engine: {'✓ Initialized' if 'ee' in globals() else '✗ Failed'}")
    print(f"AI Chatbot: {'✓ Available' if AI_AVAILABLE else '✗ Not Available (install: pip install google-generativeai)'}")
    print(f"Current User: MEWTROS")
    print(f"Server starting on http://127.0.0.1:5000")
    app.run(debug=True, host='127.0.0.1', port=5000)