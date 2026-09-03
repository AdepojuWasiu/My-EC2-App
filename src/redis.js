import redis from "redis";
import dotenv from "dotenv";

dotenv.config();

const redisUrl = `redis://${process.env.REDIS_HOST || "localhost"}:${
  process.env.REDIS_PORT || 6379
}`;

const client = redis.createClient({
  url: redisUrl,
});

client.on("error", (err) => console.log("Redis Client Error", err));
client.on("connect", () => console.log("Redis Connected"));

await client.connect();

export default client;
