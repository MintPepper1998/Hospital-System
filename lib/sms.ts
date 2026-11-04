// lib/sms.ts
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns"

// Initialize the SNS Client with the renamed environment variables
const getSNSClient = () => {
    const region = process.env.HOSPITAL_SNS_REGION
    const accessKeyId = process.env.HOSPITAL_SNS_ACCESS_KEY_ID
    const secretAccessKey = process.env.HOSPITAL_SNS_SECRET_ACCESS_KEY

    // Fallback securely in case variables aren't set
    if (!region || !accessKeyId || !secretAccessKey) {
        console.warn("Missing HOSPITAL_SNS_ environment variables. SMS Client will NOT be initialized.")
        return null
    }

    return new SNSClient({
        region,
        credentials: {
            accessKeyId,
            secretAccessKey,
        },
    })
}

const snsClient = getSNSClient()

/**
 * Sends an SMS to a specified phone number for OTP verification.
 * Uses AWS SNS configured with HOSPITAL_SNS_* keys.
 */
export async function sendSMS(phoneNumber: string, otp: string) {
    const message = `Your Shree Kamal Hospital login OTP is: ${otp}. It is valid for 5 minutes.`

    // Validate if client exists
    if (!snsClient) {
        console.log(`[DEV SMS SIMULATION] To: ${phoneNumber} | OTP: ${otp}`)
        return
    }

    try {
        const command = new PublishCommand({
            Message: message,
            PhoneNumber: phoneNumber,
            MessageAttributes: {
                'AWS.SNS.SMS.SenderID': {
                    DataType: 'String',
                    StringValue: 'SHRKML'
                },
                'AWS.SNS.SMS.SMSType': {
                    DataType: 'String',
                    StringValue: 'Transactional'
                }
            }
        })

        // Temporarily bypass real SMS due to AWS SNS sandbox limits
        // const response = await snsClient.send(command)
        // console.log(`✅ SMS successfully sent to ${phoneNumber}. MessageId: ${response.MessageId}`)

        console.log("========== MOCK SMS ==========");
        console.log("To:", phoneNumber);
        console.log("OTP Code:", otp);
        console.log("==============================");
        return true;
    } catch (error) {
        console.error("❌ Failed to send SMS via AWS SNS:", error)
        throw new Error("Failed to send OTP via SMS")
    }
}
