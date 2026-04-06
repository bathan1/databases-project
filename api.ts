export async function getCoordinates({
  capital_city,
  state_code
}: {
  capital_city: string;
  state_code: string;
}): Promise<{
  lat: number;
  lon: number;
  state: string;
  name: string;
}[]> {
  const searchParams = new URLSearchParams(Object.fromEntries([
    ["q", `${capital_city},${state_code},1`],
    ["appid", process.env.OPEN_WEATHER_MAP_API_KEY!]
  ]));
  const response = await fetch(`http://api.openweathermap.org/geo/1.0/direct?${searchParams}`);
  if (!response.ok) {
    throw new Error(`API error: ${await response.text()}`);
  }
  return response.json() as any;
}

export async function getCurrentWeather({ lat, lon }: {lat: number; lon: number;}): Promise<{
  coord: { lon: number; lat: number; };
  timezone: number;
}> {
  const searchParams = new URLSearchParams(Object.fromEntries([
    ["lat", lat],
    ["lon", lon],
    ["appid", process.env.OPEN_WEATHER_MAP_API_KEY]
  ]));
  const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?${searchParams}`);
  if (!response.ok) {
    throw new Error(`API error: ${await response.text()}`);
  }
  return response.json() as any;
}

