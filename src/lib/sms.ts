export async function sendSmSOtp(phone: string, otp: string): Promise<void> {
  const apiKey = process.env.FAST2SMS_API_KEY;
  if (!apiKey) throw new Error("FAST2SMS_API_KEY not set in .env");

  const message = `Your Melto password reset OTP is: ${otp}. Valid for 10 minutes. Do not share with anyone.`;

  const response = await fetch("https://www.fast2sms.com/dev/bulkV2", {
    method: "POST",
    headers: {
      authorization: apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      route: "q",
      message,
      language: "english",
      flash: 0,
      numbers: phone,
    }),
  });

  const data = await response.json();
  if (!data.return) {
    throw new Error(data.message?.[0] || "Failed to send SMS");
  }
}
