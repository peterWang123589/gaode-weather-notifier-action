const core = require("@actions/core");
const { getWeatherData } = require("./weather-notification");
async function run() {
  try {
    const inputs = {
      amapApiKey: core.getInput("amap_api_key"),
      city: core.getInput("city") || "Beijing",
      smtpHost: core.getInput("smtp_host") || "smtp.163.com",
      smtpPort: core.getInput("smtp_port") || "465",
      smtpUser: core.getInput("smtp_user"),
      smtpPass: core.getInput("smtp_pass"),
      recipientEmails: core.getInput("recipient_emails"),
      emailSubject: core.getInput("email_subject"),
      senderName: core.getInput("sender_name") || "天气通知助手",
    };
    if (!inputs.smtpUser || !inputs.smtpPass) {
      throw new Error("SMTP 用户名或密码未提供");
    }
    if (!inputs.recipientEmails) {
      throw new Error("收件人邮箱地址未提供");
    }
    if (!inputs.amapApiKey) {
      throw new Error("高德地图API密钥未提供");
    }
    console.log(`查询城市: ${inputs.city}`);
    const emailList = inputs.recipientEmails
      .split(",")
      .map((email) => email.trim())
      .filter((email) => email);
    console.log(`收件人数量: ${emailList.length}`);
    console.log(`正在获取天气数据...`);
    const weatherData = await getWeatherData(inputs.city, inputs.amapApiKey);
    console.log(`正在发送邮件...`);
    const smtpConfig = {
      host: inputs.smtpHost,
      port: parseInt(inputs.smtpPort),
      secure: true,
      auth: {
        user: inputs.smtpUser,
        pass: inputs.smtpPass,
      },
    };
    const cityName = `${weatherData.province}${weatherData.city}`;
    const defaultSubject =
      inputs.emailSubject ||
      `🌤️ ${cityName}天气预报 - ${new Date().toLocaleDateString(
        "zh-CN"
      )} (高德地图)`;
    const { generateWeatherEmailHTML } = require("./html");
    const nodemailer = require("nodemailer");
    const transporter = nodemailer.createTransport(smtpConfig);
    const mailOptions = {
      from: `${inputs.senderName} <${inputs.smtpUser}>`,
      to: emailList.join(","),
      subject: defaultSubject,
      html: generateWeatherEmailHTML(weatherData),
    };
    const info = await transporter.sendMail(mailOptions);

    console.log("✅ 邮件发送成功!");
    console.log(`📧 收件人: ${emailList.join(", ")}`);
    console.log(`🏙️ 天气城市: ${cityName}`);
    console.log(`🌡️ 当前温度: ${weatherData.temperature}°C`);
    console.log(`📊 数据提供商: 高德地图`);
    core.setOutput("status", "success");
    core.setOutput("weather_data", JSON.stringify(weatherData));
    core.setOutput("message", `天气信息已发送到${emailList.length}个邮箱`);
    core.setOutput("recipients_count", emailList.length);
    core.summary
      .addHeading("🌤️ 天气通知发送成功")
      .addTable([
        [
          { data: "项目", header: true },
          { data: "信息", header: true },
        ],
        ["🏙️ 城市", cityName],
        ["🌡️ 温度", `${weatherData.temperature}°C`],
        ["📊 数据源", "高德地图"],
        ["📧 收件人数量", emailList.length.toString()],
        ["⏰ 发送时间", new Date().toLocaleString("zh-CN")],
      ])
      .write();
  } catch (error) {
    console.error(`Action ❌ 发生错误: ${error.message}`);
    core.setOutput("status", "failure");
    core.setOutput("message", error.message);
    core.summary
      .addHeading("❌ 天气通知发送失败")
      .addCodeBlock(error.message, "text")
      .write();
    core.setFailed(error.message);
  }
}

if (require.main === module) {
  run();
}
module.exports = { run };
