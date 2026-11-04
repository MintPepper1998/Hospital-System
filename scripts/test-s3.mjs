import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const S3_REGION = process.env.S3_REGION || process.env.AWS_REGION || "ap-south-1";
const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || "";
const S3_SECRET_KEY = process.env.S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || "";
const BUCKET_NAME = process.env.S3_BUCKET_NAME || process.env.AWS_BUCKET_NAME || "hospital-records-kamal";

const s3Client = new S3Client({
  region: S3_REGION,
  credentials: {
    accessKeyId: S3_ACCESS_KEY,
    secretAccessKey: S3_SECRET_KEY,
  },
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});

async function run() {
  try {
    console.log("Generating URL...");
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: "test/upload.txt",
      ContentType: "text/plain",
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn: 300 });
    console.log("URL generated:", url);

    console.log("Uploading file...");
    const res = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "text/plain", "Content-Length": "9" },
      body: "Hello S3!",
    });

    if (!res.ok) {
      console.log("Upload failed!", res.status);
      console.log(await res.text());
    } else {
      console.log("Upload success!");
    }
  } catch (err) {
    console.error("Error:", err);
  }
}

run();
