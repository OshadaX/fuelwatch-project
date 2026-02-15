# utils/weather_utils.py
"""
Weather utility module for fetching weather data from Open-Meteo API.
"""

import requests
from datetime import date, datetime
from typing import Union, Optional, Dict, Any

# Open-Meteo API endpoint (free, no API key required)
OPEN_METEO_BASE_URL = "https://api.open-meteo.com/v1/forecast"

# Default location: Colombo, Sri Lanka
DEFAULT_LATITUDE = 6.9271
DEFAULT_LONGITUDE = 79.8612

# Weather code mapping (WMO codes to categories)
# Reference: https://open-meteo.com/en/docs
WEATHER_CODE_MAP = {
    0: "Sunny",      # Clear sky
    1: "Sunny",      # Mainly clear
    2: "Cloudy",     # Partly cloudy
    3: "Cloudy",     # Overcast
    45: "Cloudy",    # Fog
    48: "Cloudy",    # Depositing rime fog
    51: "Rainy",     # Drizzle: Light
    53: "Rainy",     # Drizzle: Moderate
    55: "Rainy",     # Drizzle: Dense
    56: "Rainy",     # Freezing Drizzle: Light
    57: "Rainy",     # Freezing Drizzle: Dense
    61: "Rainy",     # Rain: Slight
    63: "Rainy",     # Rain: Moderate
    65: "Rainy",     # Rain: Heavy
    66: "Rainy",     # Freezing Rain: Light
    67: "Rainy",     # Freezing Rain: Heavy
    71: "Cloudy",    # Snow fall: Slight
    73: "Cloudy",    # Snow fall: Moderate
    75: "Cloudy",    # Snow fall: Heavy
    77: "Cloudy",    # Snow grains
    80: "Rainy",     # Rain showers: Slight
    81: "Rainy",     # Rain showers: Moderate
    82: "Stormy",    # Rain showers: Violent
    85: "Cloudy",    # Snow showers: Slight
    86: "Cloudy",    # Snow showers: Heavy
    95: "Stormy",    # Thunderstorm: Slight or moderate
    96: "Stormy",    # Thunderstorm with slight hail
    99: "Stormy",    # Thunderstorm with heavy hail
}


def get_weather_category(weather_code: int) -> str:
    """
    Convert WMO weather code to simple category.
    
    Args:
        weather_code: WMO weather code from Open-Meteo
    
    Returns:
        Category string: Sunny, Cloudy, Rainy, or Stormy
    """
    return WEATHER_CODE_MAP.get(weather_code, "Cloudy")


def fetch_weather_forecast(
    days: int = 7,
    latitude: float = DEFAULT_LATITUDE,
    longitude: float = DEFAULT_LONGITUDE
) -> Optional[Dict[str, Any]]:
    """
    Fetch weather forecast from Open-Meteo API.
    
    Args:
        days: Number of forecast days (1-16)
        latitude: Location latitude
        longitude: Location longitude
    
    Returns:
        Dictionary with daily weather data or None if request fails
    """
    try:
        params = {
            "latitude": latitude,
            "longitude": longitude,
            "daily": ["weather_code", "temperature_2m_max", "temperature_2m_min"],
            "timezone": "Asia/Colombo",
            "forecast_days": min(days, 16)
        }
        
        response = requests.get(OPEN_METEO_BASE_URL, params=params, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        daily = data.get("daily", {})
        
        # Parse into structured format
        result = {
            "dates": daily.get("time", []),
            "weather_codes": daily.get("weather_code", []),
            "temp_max": daily.get("temperature_2m_max", []),
            "temp_min": daily.get("temperature_2m_min", []),
        }
        
        # Add weather categories
        result["weather_categories"] = [
            get_weather_category(code) for code in result["weather_codes"]
        ]
        
        # Add average temperatures
        result["temp_avg"] = [
            (max_t + min_t) / 2 
            for max_t, min_t in zip(result["temp_max"], result["temp_min"])
        ]
        
        return result
        
    except requests.RequestException as e:
        print(f"Error fetching weather data: {e}")
        return None


def get_weather_for_date(
    target_date: Union[date, datetime, str],
    latitude: float = DEFAULT_LATITUDE,
    longitude: float = DEFAULT_LONGITUDE
) -> Dict[str, Any]:
    """
    Get weather data for a specific date.
    
    Args:
        target_date: Date to get weather for
        latitude: Location latitude
        longitude: Location longitude
    
    Returns:
        Dictionary with weather category and temperature
    """
    if isinstance(target_date, str):
        target_date = datetime.strptime(target_date, "%Y-%m-%d").date()
    elif isinstance(target_date, datetime):
        target_date = target_date.date()
    
    today = date.today()
    days_ahead = (target_date - today).days
    
    # Can only forecast up to 16 days ahead
    if days_ahead < 0 or days_ahead > 15:
        # Return default/fallback weather
        return {
            "weather": "Sunny",
            "temperature": 28.0,
            "source": "default"
        }
    
    forecast = fetch_weather_forecast(days=days_ahead + 1, latitude=latitude, longitude=longitude)
    
    if forecast and len(forecast["dates"]) > days_ahead:
        return {
            "weather": forecast["weather_categories"][days_ahead],
            "temperature": forecast["temp_avg"][days_ahead],
            "source": "api"
        }
    
    return {
        "weather": "Sunny",
        "temperature": 28.0,
        "source": "fallback"
    }


def simulate_weather_for_date(target_date: Union[date, datetime, str]) -> Dict[str, Any]:
    """
    Simulate realistic weather for a date based on Sri Lankan monsoon patterns.
    Used for synthetic dataset generation.
    
    Sri Lanka weather patterns:
    - Southwest monsoon (May-September): Wet in western/southern regions
    - Northeast monsoon (December-February): Wet in eastern/northern regions
    - Inter-monsoon periods: Variable weather
    
    Args:
        target_date: Date to simulate weather for
    
    Returns:
        Dictionary with weather category and temperature
    """
    import random
    
    if isinstance(target_date, str):
        target_date = datetime.strptime(target_date, "%Y-%m-%d").date()
    elif isinstance(target_date, datetime):
        target_date = target_date.date()
    
    month = target_date.month
    
    # Define weather probabilities by season
    if month in [5, 6, 7, 8, 9]:  # Southwest monsoon
        weather_types = ['Sunny', 'Cloudy', 'Rainy', 'Stormy']
        weights = [0.25, 0.30, 0.35, 0.10]
        temp_range = (26, 31)
    elif month in [12, 1, 2]:  # Northeast monsoon
        weather_types = ['Sunny', 'Cloudy', 'Rainy', 'Stormy']
        weights = [0.35, 0.30, 0.30, 0.05]
        temp_range = (24, 29)
    elif month in [3, 4]:  # Inter-monsoon (hot)
        weather_types = ['Sunny', 'Cloudy', 'Rainy', 'Stormy']
        weights = [0.50, 0.25, 0.20, 0.05]
        temp_range = (28, 34)
    else:  # Inter-monsoon (Oct, Nov)
        weather_types = ['Sunny', 'Cloudy', 'Rainy', 'Stormy']
        weights = [0.40, 0.30, 0.25, 0.05]
        temp_range = (26, 30)
    
    weather = random.choices(weather_types, weights=weights)[0]
    temperature = round(random.uniform(*temp_range), 1)
    
    return {
        "weather": weather,
        "temperature": temperature,
        "source": "simulated"
    }


if __name__ == "__main__":
    # Test the module
    print("Testing Weather Utils Module:")
    print("-" * 50)
    
    # Test simulation
    from datetime import timedelta
    today = date.today()
    
    print("\nSimulated weather for next 7 days:")
    for i in range(7):
        test_date = today + timedelta(days=i)
        weather = simulate_weather_for_date(test_date)
        print(f"  {test_date}: {weather['weather']}, {weather['temperature']}°C")
    
    # Test API (if available)
    print("\nFetching real forecast from Open-Meteo API...")
    forecast = fetch_weather_forecast(days=7)
    if forecast:
        print("Success! Weather forecast:")
        for i, d in enumerate(forecast["dates"]):
            print(f"  {d}: {forecast['weather_categories'][i]}, {forecast['temp_avg'][i]:.1f}°C")
    else:
        print("Could not fetch weather data (may be offline)")
