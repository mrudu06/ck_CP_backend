const judge0Config = {
  apiKey: process.env.JUDGE0_API_KEY,
  host: process.env.JUDGE0_HOST || "judge0-ce.p.rapidapi.com",
  get baseUrl() {
    return process.env.JUDGE0_API_URL || `https://${this.host}`;
  },
  get headers() {
    return {
      "Content-Type": "application/json",
      "X-RapidAPI-Key": this.apiKey,
      "X-RapidAPI-Host": this.host,
    };
  },
};

if (!judge0Config.apiKey) {
  console.warn("WARNING: JUDGE0_API_KEY is not set. Code submissions will fail.");
}

export default judge0Config;
