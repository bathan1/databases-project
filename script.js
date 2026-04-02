import "dotenv/config";
import fs from "node:fs";

async function getCurrentWeather({ lat, lon }) {
  const searchParams = new URLSearchParams([
    ["lat", lat],
    ["lon", lon],
    ["appid", process.env.OPEN_WEATHER_MAP_API_KEY]
  ]);
  console.log({ lat, lon })
  const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?${searchParams}`);
  if (!response.ok) {
    throw new Error(`API error: ${await response.text()}`);
  }
  return response.json();
}

async function getCoordinates({
  capital_city,
  state_code
}) {
  const searchParams = new URLSearchParams([
    ["q", capital_city],
    ["q", state_code],
    ["appid", process.env.OPEN_WEATHER_MAP_API_KEY]
  ]);
  const response = await fetch(`http://api.openweathermap.org/geo/1.0/direct?${searchParams}`);
  if (!response.ok) {
    throw new Error(`API error: ${await response.text()}`);
  }
  return response.json();
}

const cities = JSON.parse(fs.readFileSync("./capitals.json", "utf8"));

for (const city of cities) {
  await getCoordinates(city)
    .then((coords) => {
      return getCurrentWeather(coords.at(0));
    })
    .then((weather) => console.log(
      `${city.capital_city} current weather:\n${JSON.stringify(weather, null, 2)}`
    ))
}
