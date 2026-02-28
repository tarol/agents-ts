import { tool } from "@langchain/core/tools";
import { z } from "zod";

/**
 * 城市名 -> 经纬度 (通过 Open-Meteo Geocoding API，免费无需 Key)
 */
async function geocodeCity(city: string): Promise<{ lat: number; lon: number; name: string; country: string } | null> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=zh`;
  const res = await fetch(url);
  const data = await res.json();

  if (!data.results || data.results.length === 0) {
    return null;
  }

  const r = data.results[0];
  return { lat: r.latitude, lon: r.longitude, name: r.name, country: r.country };
}

/**
 * WMO 天气代码 -> 中文描述
 */
function weatherCodeToText(code: number): string {
  const map: Record<number, string> = {
    0: "晴天",
    1: "大部晴朗", 2: "局部多云", 3: "阴天",
    45: "雾", 48: "沉积雾凇",
    51: "轻微毛毛雨", 53: "中度毛毛雨", 55: "密集毛毛雨",
    56: "冻毛毛雨（轻）", 57: "冻毛毛雨（密）",
    61: "小雨", 63: "中雨", 65: "大雨",
    66: "冻雨（轻）", 67: "冻雨（重）",
    71: "小雪", 73: "中雪", 75: "大雪",
    77: "雪粒",
    80: "小阵雨", 81: "中阵雨", 82: "大阵雨",
    85: "小阵雪", 86: "大阵雪",
    95: "雷暴", 96: "雷暴伴小冰雹", 99: "雷暴伴大冰雹",
  };
  return map[code] ?? `未知(${code})`;
}

/**
 * 天气查询工具 —— 调用 Open-Meteo API 获取真实天气数据（免费，无需 API Key）
 */
export const getWeather = tool(
  async ({ city }) => {
    // 1. 地理编码：城市名 -> 经纬度
    const geo = await geocodeCity(city);
    if (!geo) {
      return JSON.stringify({ error: true, message: `无法找到城市 "${city}"，请检查城市名称是否正确。` });
    }

    // 2. 获取当前天气
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${geo.lat}&longitude=${geo.lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=auto`;
    const res = await fetch(weatherUrl);
    const data = await res.json();
    const current = data.current;

    return JSON.stringify({
      city: geo.name,
      country: geo.country,
      temperature: `${current.temperature_2m}°C`,
      apparent_temperature: `${current.apparent_temperature}°C`,
      weather: weatherCodeToText(current.weather_code),
      humidity: `${current.relative_humidity_2m}%`,
      wind_speed: `${current.wind_speed_10m} km/h`,
      source: "Open-Meteo API（实时数据）",
    });
  },
  {
    name: "get_weather",
    description:
      "查询指定城市的当前真实天气信息，包括实时温度、体感温度、天气状况、湿度、风速等。支持全球城市，中英文城市名均可。",
    schema: z.object({
      city: z.string().describe("要查询天气的城市名称，例如：北京、上海、Tokyo、New York"),
    }),
  },
);
