async function fetchLiveWeather(city, amapApiKey) {
  const liveUrl = `https://restapi.amap.com/v3/weather/weatherInfo?key=${amapApiKey}&city=${city}&extensions=base`;
  console.log(
    `🌐 请求高德地图实时天气API: ${liveUrl.replace(amapApiKey, "***")}`
  );
  const response = await fetch(liveUrl);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const data = await response.json();
  console.log("📥 高德地图实时天气API返回数据:", data);

  if (data.status !== "1") {
    throw new Error(
      `高德地图API请求失败，状态码: ${data.status}, 信息: ${data.info}`
    );
  }
  if (!data.lives || !Array.isArray(data.lives) || data.lives.length === 0) {
    throw new Error(
      `高德地图API返回的实时天气数据格式异常:lives数组为空或不存在 `
    );
  }
  const live = data.lives[0];
  if (!live.city || live.temperature === undefined) {
    throw new Error(`高德地图API返回的实时天气数据格式异常:缺少必要字段 `);
  }
  console.log(
    `✅ 成功获取${live.city}的实时天气数据: 温度${live.temperature}℃`
  );
  return live;
}

async function fetchForecastWeather(city, amapApiKey) {
  const forecastUrl = `https://restapi.amap.com/v3/weather/weatherInfo?key=${amapApiKey}&city=${city}&extensions=all`;
  console.log(
    `🌐 请求高德地图天气预报API: ${forecastUrl.replace(amapApiKey, "***")}`
  );
  const response = await fetch(forecastUrl);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const data = await response.json();
  console.log("📥 高德地图天气预报API返回数据:", data);
  if (data.status !== "1") {
    throw new Error(
      `高德地图API请求失败，状态码: ${data.status}, 信息: ${data.info}`
    );
  }
  if (
    !data.forecasts ||
    !Array.isArray(data.forecasts) ||
    data.forecasts.length === 0
  ) {
    throw new Error(
      `高德地图API返回的天气预报数据格式异常:forecasts数组为空或不存在 `
    );
  }
  return data.forecasts[0];
}

async function getWeatherData(city, amapApiKey) {
  if (!amapApiKey) {
    throw new Error("缺少高德地图API Key，请在配置中添加amapApiKey");
  }
  if (!city) {
    throw new Error("缺少城市信息，请在配置中添加city");
  }
  console.log(`🏙️ 获取${city}的天气信息`);

  try {
    const [liveData, forcastData] = await Promise.allSettled([
      fetchLiveWeather(city, amapApiKey),
      fetchForecastWeather(city, amapApiKey),
    ]);
    if (liveData.status === "rejected") {
      throw liveData.reason;
    }
    const weatherInfo = liveData.value;
    let forcast = null;
    if (forcastData.status === "fulfilled") {
      forcast = forcastData.value;
      console.log(
        `✅ 成功获取${city}的天气预报数据,总共${forcast?.casts?.length || 0}天`
      );
    } else {
      console.warn(
        `获取天气预报数据失败，将只返回实时天气数据: ${forcastData.reason.message}`
      );
    }
    return {
      provider: "amap",
      city: weatherInfo.city,
      province: weatherInfo.province,
      adcode: weatherInfo.adcode,
      temperature: weatherInfo.temperature,
      temperatureFloat: parseFloat(
        weatherInfo.temperature_float || weatherInfo.temperature
      ),
      humidity: parseInt(weatherInfo.humidity || 0),
      humidityFloat: parseFloat(
        weatherInfo.humidity_float || weatherInfo.humidity || 0
      ),
      weather: weatherInfo.weather,
      windDirection: weatherInfo.winddirection,
      windPower: weatherInfo.windpower,
      reportTime: weatherInfo.reporttime,
      forecast: forcast ? forcast.casts : null,
    };
  } catch (error) {
    console.error("获取天气信息失败:", error.message);
    throw error;
  }
}

module.exports = {
  getWeatherData,
};
